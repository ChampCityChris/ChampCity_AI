import { validateWorkflowIntakePayload } from "../../shared/workflowIntakeContracts";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { IssueEvidenceInput, IssueIntakeInput } from "../../shared/issuePlanningContracts";
import type { WorkflowPlanningGraph } from "../../shared/projectState/projectStateService";
import { createProjectStateService } from "../../shared/projectState/projectStateService";
import { selectProjectArchitectureContext } from "../../shared/projectState/projectArchitectureContext";
import type { ProjectStateRecord } from "../../shared/projectState/domainContracts";
import type { ProjectStateStore } from "../../shared/projectState/projectStateStore";
import { createSQLiteProjectStateStore } from "../projectState/sqliteProjectStateStore";
import { selectedCurrentProjectId } from "../projectState/currentProjectRegistrationService";
import { createWorkflowApplicationService } from "../workflow/workflowApplicationService";

const operator = { principalId: "local-operator", principalType: "human" as const, role: "Operator" };
const intakeFields: Array<[keyof IssueIntakeInput, string]> = [["title", "Issue title"], ["observed", "Observed behavior"], ["expected", "Expected behavior"], ["reproduction", "Reproduction steps"], ["environment", "Environment"], ["impact", "Known impact"], ["constraints", "Constraints"]];
type Draft = { stage: "rca" | "plan"; instruction: string; content: string };
type RootCauseCandidate = { title: string; statement: string; rationale: string; confidence?: number; findingIds: string[]; evidenceIds: string[] };

export function createIssuePlanningService(dependencies: { openStore?: (databasePath: string) => ProjectStateStore & { close(): void } } = {}) {
  const openStore = dependencies.openStore ?? createSQLiteProjectStateStore; const drafts = new Map<string, Draft>(); const workflowApp = createWorkflowApplicationService({ openStore });
  async function withIssue<T>(root: string, workflowId: string, action: (store: ProjectStateStore, projectId: string, workflow: ProjectStateRecord<"Workflow">) => Promise<T>): Promise<T> {
    if (!workflowId || workflowId.length > 128) throw Error("Exact Issue Workflow ID is required.");
    const canonical = fs.realpathSync(root); const projectId = selectedCurrentProjectId(canonical); if (!projectId) throw Error("Selected Project is not registered.");
    const store = openStore(path.join(canonical, ".champcity", "project-state.sqlite"));
    try { const workflow = await store.getEntity(projectId, workflowId); if (!workflow || workflow.entityType !== "Workflow" || workflow.body.workflowType !== "issue-resolution" || workflow.lifecycleState !== "active") throw Error("Exact active Issue Workflow is unavailable."); return await action(store, projectId, workflow); }
    finally { store.close(); }
  }
  const keyFor = (root: string, workflowId: string) => `${fs.realpathSync(root)}:${workflowId}`;
  async function get(root: string, workflowId: string) {
    return withIssue(root, workflowId, async (store, projectId, workflow) => {
      const relations = await store.listRelationships(projectId); const related = (id: string) => relations.some(edge => edge.relationshipType === "workflow_member" && edge.fromEntityId === id && edge.toEntityId === workflowId && !edge.endedAt);
      const findings = (await store.listEntities(projectId, "Finding")).filter((r): r is ProjectStateRecord<"Finding"> => r.entityType === "Finding" && r.body.category.startsWith("issue-") && related(r.id));
      const allRoots = (await store.listEntities(projectId, "RootCause")).filter((r): r is ProjectStateRecord<"RootCause"> => r.entityType === "RootCause" && r.lifecycleState === "active" && related(r.id));
      const evidenceIds = new Set(relations.filter(edge => edge.relationshipType === "supports" && [workflowId, ...findings.map(f => f.id), ...allRoots.map(r => r.id)].includes(edge.toEntityId) && !edge.endedAt).map(edge => edge.fromEntityId));
      const evidence = (await store.listEntities(projectId, "Evidence")).filter((r): r is ProjectStateRecord<"Evidence"> => r.entityType === "Evidence" && evidenceIds.has(r.id));
      const acceptedArchitecture = selectProjectArchitectureContext(projectId, await store.listEntities(projectId), relations);
      const decisionSequences = new Map((await store.listOutbox(projectId)).filter(event => event.payload.operation === "create" && event.entityId).map(event => [event.entityId!, event.sequence]));
      const decisions = (await store.listEntities(projectId, "Decision")).filter((r): r is ProjectStateRecord<"Decision"> => r.entityType === "Decision" && r.lifecycleState === "active" && r.body.decisionType === "issue-rca-review" && relations.some(edge => edge.relationshipType === "governs" && edge.fromEntityId === r.id && edge.toEntityId === workflowId && !edge.endedAt)).sort((a,b)=>a.body.decidedAt.localeCompare(b.body.decidedAt) || (decisionSequences.get(a.id) ?? 0) - (decisionSequences.get(b.id) ?? 0));
      const acceptedRca = decisions.filter(r => r.body.outcome === "accepted").at(-1);
      const acceptedRootIds = new Set(relations.filter(edge => edge.relationshipType === "governs" && edge.fromEntityId === acceptedRca?.id && !edge.endedAt).map(edge => edge.toEntityId));
      const roots = allRoots.filter(root => acceptedRootIds.has(root.id));
      const lastDecision = decisions.at(-1); const latestContextUpdate = [...findings.filter(f => f.body.category === "issue-intake").map(f => f.updatedAt), ...evidence.map(item => item.body.capturedAt)].reduce((latest, stamp) => stamp > latest ? stamp : latest, "");
      const rcaState = !lastDecision || lastDecision.body.decidedAt < latestContextUpdate ? "not-reviewed" : lastDecision.body.outcome === "accepted" ? "accepted" : lastDecision.body.outcome === "revision_requested" ? "revision-requested" : "rejected";
      const entry = Object.fromEntries(intakeFields.map(([key, title]) => [key, findings.find(f => f.body.title === title)?.body.statement ?? ""])) as unknown as IssueIntakeInput;
      const intake = findings.some(f => f.body.category === "issue-intake") ? entry : null;
      const plan = workflow.body.currentWorkspace === "work-item-map" ? await createProjectStateService(store, operator).getWorkflowExecutionPlan(projectId, workflowId) : null;
      const context = await workflowApp.getWorkflowPlanningContext(root, workflowId); const draft = drafts.get(keyFor(root, workflowId)) ?? null;
      const workspaceStage = workflow.body.currentWorkspace === "work-item-map" ? "work-item-map" : workflow.body.currentWorkspace === "issue-intake" ? "intake" :
        workflow.body.currentWorkspace === "issue-rca" ? "rca" : workflow.body.currentWorkspace === "issue-planning" ? rcaState === "accepted" ? "plan" : "rca" : "intake";
      const stage = plan ? "work-item-map" : workspaceStage; const project = await store.getProject(projectId);
      return { project: { projectId, name: project?.body.name ?? "Current Project" }, workflow: { workflowId, lineageId: workflow.lineageId, workflowType: "issue-resolution" as const, title: workflow.body.title, workflowState: workflow.body.workflowState, lifecycleState: workflow.lifecycleState, currentWorkspace: workflow.body.currentWorkspace, createdAt: workflow.createdAt, updatedAt: workflow.updatedAt }, provenance: context.provenance,
        source: context.source ? { baselineId: context.source.baseline.id, revisionId: context.source.baseline.body.baseRevisionId, bindingPrepared: context.source.binding?.body.preparationState === "ready" } : null,
        intake, findings, evidence, acceptedArchitecture, rootCauses: roots, rcaState, stage, draft, acceptedPlan: plan };
    });
  }
  async function saveIntake(root: string, workflowId: string, input: IssueIntakeInput) {
    validateWorkflowIntakePayload({ workflowType: "issue-resolution", values: input });
    return withIssue(root, workflowId, async (store, projectId, workflow) => {
      const state = createProjectStateService(store, operator); const links = await store.listRelationships(projectId); const records = (await store.listEntities(projectId, "Finding")).filter((r): r is ProjectStateRecord<"Finding"> => r.entityType === "Finding" && r.body.category.startsWith("issue-") && links.some(edge => edge.relationshipType === "workflow_member" && edge.fromEntityId === r.id && edge.toEntityId === workflowId && !edge.endedAt));
      if (workflow.body.currentWorkspace !== "issue-intake") throw Error("Issue Intake is locked after Architect RCA preparation begins.");
      if (records.some(record => record.body.category === "issue-rca")) throw Error("Issue Intake cannot change after RCA review begins.");
      for (const [key, title] of intakeFields) { const value = input[key].trim(); const existing = records.find(r => r.body.title === title); if (existing) await state.reviseRecord(projectId, existing.id, { statement: value, observedAt: new Date().toISOString() }, existing.recordVersion); else { const finding = await state.createRecord(projectId, "Finding", { title, statement: value, category: "issue-intake", impact: "Issue planning context", observedAt: new Date().toISOString(), findingState: "current" }); await state.createRelationship(projectId, finding.id, "workflow_member", workflow.id); } }
      if (workflow.body.currentWorkspace !== "issue-intake") await state.reviseRecord(projectId, workflowId, { currentWorkspace: "issue-intake" }, workflow.recordVersion);
      drafts.delete(keyFor(root, workflowId)); return get(root, workflowId);
    });
  }
  async function addEvidence(root: string, workflowId: string, input: IssueEvidenceInput[]) {
    if (!Array.isArray(input) || input.length > 12) throw Error("Provide at most 12 evidence files.");
    return withIssue(root, workflowId, async (store, projectId, workflow) => {
      if (workflow.body.currentWorkspace === "work-item-map") throw Error("Accepted Issue Work Item Map is read-only.");
      const state = createProjectStateService(store, operator); const relations = await store.listRelationships(projectId, "workflow_member"); const findings = (await store.listEntities(projectId, "Finding")).filter((r): r is ProjectStateRecord<"Finding"> => r.entityType === "Finding" && r.body.category === "issue-intake" && relations.some(edge => edge.fromEntityId === r.id && edge.toEntityId === workflowId && !edge.endedAt));
      const observed = findings.find(r => r.body.title === "Observed behavior"); if (!observed) throw Error("Save Issue Intake before attaching evidence.");
      const directory = path.join(fs.realpathSync(root), ".champcity", "evidence"); fs.mkdirSync(directory, { recursive: true }); const resolved = fs.realpathSync(directory); const rootPath = fs.realpathSync(root); if (!resolved.startsWith(`${rootPath}${path.sep}`)) throw Error("Evidence directory escapes the selected Project.");
      for (const file of input) {
        if (!file || typeof file.name !== "string" || file.name.length > 240 || typeof file.base64 !== "string" || file.base64.length > 14_000_000 || typeof file.description !== "string" || file.description.length > 2000 || typeof file.mediaType !== "string" || file.mediaType.length > 120) throw Error("Issue evidence file metadata exceeds its bounds.");
        const bytes = Buffer.from(file.base64, "base64"); if (!bytes.length || bytes.length > 10_000_000 || bytes.toString("base64") !== file.base64) throw Error("Issue evidence file is empty, malformed, or larger than 10 MB.");
        const extension = path.extname(file.name).toLowerCase().replace(/[^.a-z0-9]/g, "").slice(0, 12); const name = `${crypto.randomUUID()}${extension}`; const absolute = path.join(resolved, name); fs.writeFileSync(absolute, bytes, { flag: "wx" });
        try { const evidence = await state.recordEvidence(projectId, workflowId, { evidenceType: "issue-supplied", description: file.description.trim() || path.basename(file.name), mediaType: file.mediaType, payloadRef: `project-evidence:${path.posix.join(".champcity", "evidence", name)}`, digest: crypto.createHash("sha256").update(bytes).digest("hex"), size: bytes.length }); await state.createRelationship(projectId, evidence.id, "supports", observed.id); }
        catch (error) { fs.rmSync(absolute, { force: true }); throw error; }
      }
      const latestWorkflow = await store.getEntity(projectId, workflowId);
      if (latestWorkflow?.entityType === "Workflow" && latestWorkflow.body.currentWorkspace === "issue-planning") {
        await state.reviseRecord(projectId, workflowId, { currentWorkspace: "issue-rca" }, latestWorkflow.recordVersion);
      }
      drafts.delete(keyFor(root, workflowId));
      return get(root, workflowId);
    });
  }
  async function prepare(root: string, workflowId: string, stage: "rca" | "plan") {
    let model = await get(root, workflowId); if (model.workflow.currentWorkspace === "work-item-map") throw Error("Accepted Issue Work Item Map is read-only."); if (!model.intake) throw Error("Save Issue Intake before preparing Architect work."); if (stage === "plan" && model.rcaState !== "accepted") throw Error("Accept the current Issue RCA before preparing correction planning.");
    const workspace = stage === "rca" ? "issue-rca" : "issue-planning";
    await withIssue(root, workflowId, async (store, projectId, workflow) => { if (workflow.body.currentWorkspace !== workspace) await createProjectStateService(store, operator).reviseRecord(projectId, workflowId, { currentWorkspace: workspace }, workflow.recordVersion); });
    model = await get(root, workflowId);
    const prompt = [`# Issue ${stage.toUpperCase()} — ${model.project.name} (${model.project.projectId})`, `Exact Issue Workflow: ${model.workflow.title} (${workflowId})`, `SourceBaseline: ${model.source ? `${model.source.baselineId} at ${model.source.revisionId}` : "non-source-backed"}`, stage === "plan" && !model.source ? "Source-neutral validation policy: required deterministic ValidationCatalog proof is unavailable. Select a supported policy such as semantic_ai, visual_human, or operator_decision for every required Criterion; canonical Project State acceptance enforces this." : "", `Routed provenance is historical context only: ${model.provenance}`, `Saved SPS Issue Intake: ${JSON.stringify(model.intake)}`, `Canonical Findings: ${JSON.stringify(model.findings)}`, `Canonical Evidence metadata: ${JSON.stringify(model.evidence)}`, `Accepted Project architecture and Decisions from SPS: ${JSON.stringify(model.acceptedArchitecture)}`, `Accepted RootCause state: ${JSON.stringify(model.rootCauses)}`, stage === "rca" ? "Return JSON {rootCauses:[{title,statement,rationale,confidence,findingIds,evidenceIds}]}. Each findingId/evidenceId must come from the provided canonical IDs. Explain the evidenced observed defect; do not recommend routes." : `Return JSON WorkflowPlanningGraph with exact workflowId ${workflowId}, solution scope, assumptions, risks, criteria, dependencies and direct/phased topology. WorkItem kind fix by default. BoundedSolution should address the accepted RootCause/Finding. No execution, session, Git, Fix Card, validation, or repair mechanics.`].filter(Boolean).join("\n\n");
    const draft = { stage, instruction: prompt, content: "" } satisfies Draft; drafts.set(keyFor(root, workflowId), draft); return { ...model, stage, draft };
  }
  async function act(root: string, workflowId: string, action: { type: string; content?: string; outcome?: "accept" | "revision" | "reject"; rationale?: string; rootCauses?: RootCauseCandidate[]; graph?: WorkflowPlanningGraph }) {
    const key = keyFor(root, workflowId); const model = await get(root, workflowId);
    if (action.type === "save-draft") { const draft = drafts.get(key); if (!draft) throw Error("Prepare the current Architect cycle first.");
      const expectedWorkspace = draft.stage === "rca" ? "issue-rca" : "issue-planning";
      if (model.workflow.currentWorkspace !== expectedWorkspace || (draft.stage === "plan" && model.rcaState !== "accepted")) throw Error("The Issue Architect draft is stale for the current Workflow workspace and RCA state.");
      draft.content = String(action.content ?? "").slice(0, 200000); drafts.set(key, draft); return get(root, workflowId); }
    if (action.type === "decide-rca") {
      if (model.workflow.currentWorkspace !== "issue-rca") throw Error("Issue RCA disposition requires the current RCA workspace.");
      const draft = drafts.get(key); if (draft?.stage !== "rca" || !draft.content.trim()) throw Error("Refresh a non-empty current RCA draft before disposition.");
      if (action.outcome === "accept") {
        const candidates = action.rootCauses; if (!Array.isArray(candidates) || !candidates.length || candidates.length > 12) throw Error("Accepted RCA requires bounded RootCause candidates.");
        await withIssue(root, workflowId, async (store, projectId) => createProjectStateService(store, operator).acceptIssueRca(projectId, { workflowId, rationale: (action.rationale ?? "").slice(0, 4096), rootCauses: candidates }));
        drafts.delete(key); return prepare(root, workflowId, "plan");
      }
      await withIssue(root, workflowId, async (store, projectId) => createProjectStateService(store, operator).recordDecision(projectId, workflowId, { decisionType: "issue-rca-review", outcome: action.outcome === "revision" ? "revision_requested" : "rejected", decisionScope: workflowId, rationale: (action.rationale ?? "").slice(0, 8000) }));
      drafts.delete(key); if (action.outcome === "revision") return prepare(root, workflowId, "rca"); return get(root, workflowId);
    }
    if (action.type === "decide-plan") {
      if (model.workflow.currentWorkspace !== "issue-planning" || model.rcaState !== "accepted") throw Error("Correction planning requires the current plan workspace and an accepted current RCA.");
      const draft = drafts.get(key); if (draft?.stage !== "plan" || !draft.content.trim()) throw Error("Refresh a non-empty current correction plan before disposition.");
      if (action.outcome === "accept") { if (!action.graph || action.graph.workflowId !== workflowId) throw Error("Correction graph must name the exact Issue Workflow."); if (action.graph.workItems.some(item => item.kind !== "fix")) throw Error("Issue correction Work Items must use kind fix."); const graph = { ...action.graph, solutionAddresses: [...new Set([...model.rootCauses.map(item => item.id), ...model.findings.map(item => item.id)])] }; const plan = await workflowApp.acceptReviewedWorkflowPlanningGraph(root, graph); const stateResult = await get(root, workflowId); drafts.delete(key); return { ...stateResult, acceptedPlan: plan, stage: "work-item-map" as const }; }
      await withIssue(root, workflowId, async (store, projectId) => createProjectStateService(store, operator).recordDecision(projectId, workflowId, { decisionType: "issue-planning-review", outcome: action.outcome === "revision" ? "revision_requested" : "rejected", decisionScope: workflowId, rationale: (action.rationale ?? "").slice(0, 8000) }));
      drafts.delete(key); if (action.outcome === "revision") return prepare(root, workflowId, "plan"); return get(root, workflowId);
    }
    throw Error("Unsupported Issue planning action.");
  }
  return { get, saveIntake, addEvidence, prepare, act };
}
