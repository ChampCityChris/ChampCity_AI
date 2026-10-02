import { architectCandidateHandoffContract } from "../../shared/architectWorkspaceContracts";
import { createExactWorkflowPlanningService } from "../workPlanning/exactWorkflowPlanningService";
import { createStructuredArchitectWorkspaceService } from "../architectOutputs/structuredArchitectWorkspaceService";
import { createWorkflowIntakeService } from "../workflow/workflowIntakeService";
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
    const structuredIntake = await createWorkflowIntakeService({openStore}).ensureWorkflowIntake(root, workflowId);
    return withIssue(root, workflowId, async (store, projectId, workflow) => {
      const relations = await store.listRelationships(projectId); const related = (id: string) => relations.some(edge => edge.relationshipType === "workflow_member" && edge.fromEntityId === id && edge.toEntityId === workflowId && !edge.endedAt);
      const findings = (await store.listEntities(projectId, "Finding")).filter((r): r is ProjectStateRecord<"Finding"> => r.entityType === "Finding" && r.body.category.startsWith("issue-") && related(r.id));
      const allRoots = (await store.listEntities(projectId, "RootCause")).filter((r): r is ProjectStateRecord<"RootCause"> => r.entityType === "RootCause" && r.lifecycleState === "active" && related(r.id));
      const evidenceIds = new Set(relations.filter(edge => edge.relationshipType === "supports" && [workflowId, structuredIntake.intakeId ?? "", ...findings.map(f => f.id), ...allRoots.map(r => r.id)].includes(edge.toEntityId) && !edge.endedAt).map(edge => edge.fromEntityId));
      const evidence = (await store.listEntities(projectId, "Evidence")).filter((r): r is ProjectStateRecord<"Evidence"> => r.entityType === "Evidence" && evidenceIds.has(r.id));
      const acceptedArchitecture = selectProjectArchitectureContext(projectId, await store.listEntities(projectId), relations);
      const architect = await createStructuredArchitectWorkspaceService().get(root, workflowId);
      const memberIds = new Set(architect.review?.sources.map(source => source.entityId) ?? []);
      const approved = architect.review?.disposition.state === "approved";
      const roots = approved ? allRoots.filter(root => memberIds.has(root.id)) : [];
      const rcaState = approved ? "accepted" : architect.review?.disposition.state === "revision_requested" ? "revision-requested" : architect.review?.disposition.state === "rejected" ? "rejected" : "not-reviewed";
      const intake = structuredIntake.values as IssueIntakeInput | null;
      const plan = workflow.body.currentWorkspace === "work-item-map" ? await createProjectStateService(store, operator).getWorkflowExecutionPlan(projectId, workflowId) : null;
      const context = await workflowApp.getWorkflowPlanningContext(root, workflowId); const draft = drafts.get(keyFor(root, workflowId)) ?? null;
      const workspaceStage = workflow.body.currentWorkspace === "work-item-map" ? "work-item-map" : workflow.body.currentWorkspace === "issue-intake" ? "intake" :
        workflow.body.currentWorkspace === "issue-rca" ? "rca" : workflow.body.currentWorkspace === "issue-planning" ? rcaState === "accepted" ? "plan" : "rca" : "intake";
      const stage = plan ? "work-item-map" : workspaceStage; const project = await store.getProject(projectId);
      return { project: { projectId, name: project?.body.name ?? "Current Project" }, workflow: { workflowId, lineageId: workflow.lineageId, workflowType: "issue-resolution" as const, title: workflow.body.title, workflowState: workflow.body.workflowState, lifecycleState: workflow.lifecycleState, currentWorkspace: workflow.body.currentWorkspace, createdAt: workflow.createdAt, updatedAt: workflow.updatedAt }, provenance: context.provenance,
        source: context.source ? { baselineId: context.source.baseline.id, revisionId: context.source.baseline.body.baseRevisionId, bindingPrepared: context.source.binding?.body.preparationState === "ready" } : null,
        intakeAuthority: structuredIntake, intake, findings, evidence, acceptedArchitecture, rootCauses: roots, rcaState, stage, draft, acceptedPlan: plan };
    });
  }
  async function saveIntake(root: string, workflowId: string, input: IssueIntakeInput) {
    await createWorkflowIntakeService({openStore}).saveWorkflowIntake(root, workflowId, {workflowType: "issue-resolution", values: input});
    drafts.delete(keyFor(root, workflowId)); return get(root, workflowId);
  }
  async function addEvidence(root: string, workflowId: string, input: IssueEvidenceInput[]) {
    if (!Array.isArray(input) || input.length > 12) throw Error("Provide at most 12 evidence files.");
    const intake = await createWorkflowIntakeService({openStore}).ensureWorkflowIntake(root, workflowId);
    if (!intake.intakeId) throw Error("Save Issue Intake before attaching evidence.");
    return withIssue(root, workflowId, async (store, projectId, workflow) => {
      if (workflow.body.currentWorkspace === "work-item-map") throw Error("Accepted Issue Work Item Map is read-only.");
      const state = createProjectStateService(store, operator);
      const directory = path.join(fs.realpathSync(root), ".champcity", "evidence"); fs.mkdirSync(directory, { recursive: true }); const resolved = fs.realpathSync(directory); const rootPath = fs.realpathSync(root); if (!resolved.startsWith(`${rootPath}${path.sep}`)) throw Error("Evidence directory escapes the selected Project.");
      for (const file of input) {
        if (!file || typeof file.name !== "string" || file.name.length > 240 || typeof file.base64 !== "string" || file.base64.length > 14_000_000 || typeof file.description !== "string" || file.description.length > 2000 || typeof file.mediaType !== "string" || file.mediaType.length > 120) throw Error("Issue evidence file metadata exceeds its bounds.");
        const bytes = Buffer.from(file.base64, "base64"); if (!bytes.length || bytes.length > 10_000_000 || bytes.toString("base64") !== file.base64) throw Error("Issue evidence file is empty, malformed, or larger than 10 MB.");
        const extension = path.extname(file.name).toLowerCase().replace(/[^.a-z0-9]/g, "").slice(0, 12); const name = `${crypto.randomUUID()}${extension}`; const absolute = path.join(resolved, name); fs.writeFileSync(absolute, bytes, { flag: "wx" });
        let persisted = false;
        try {
          const evidence = await state.recordEvidence(projectId, workflowId, { evidenceType: "issue-supplied", description: file.description.trim() || path.basename(file.name), mediaType: file.mediaType, payloadRef: `project-evidence:${path.posix.join(".champcity", "evidence", name)}`, digest: crypto.createHash("sha256").update(bytes).digest("hex"), size: bytes.length });
          persisted = true;
          await state.createRelationship(projectId, evidence.id, "supports", intake.intakeId!);
          const cycle = await state.getCurrentArchitectReviewCycle(projectId, workflowId, "issue-rca");
          if (cycle) {
            const memberIds = (await store.listRelationships(projectId, "review_member")).filter(edge => !edge.endedAt && edge.toEntityId === cycle.id).map(edge => edge.fromEntityId);
            await state.saveArchitectReviewCycle(projectId, {workflowId, stageKind: "issue-rca", memberIds: [...memberIds, evidence.id], expectedRecordVersion: cycle.recordVersion});
          }
        }
        catch (error) { if (!persisted) fs.rmSync(absolute, { force: true }); throw error; }
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
    let model = await get(root, workflowId); if (model.workflow.currentWorkspace === "work-item-map") throw Error("Accepted Issue Work Item Map is read-only."); if (!model.intake) throw Error("Save Issue Intake before preparing Architect work."); if (model.intakeAuthority.disposition?.state !== "approved") throw Error("Approve the current Issue Intake revision before preparing Architect work."); if (stage === "plan" && model.rcaState !== "accepted") throw Error("Accept the current Issue RCA before preparing correction planning.");
    const workspace = stage === "rca" ? "issue-rca" : "issue-planning";
    await withIssue(root, workflowId, async (store, projectId, workflow) => { if (workflow.body.currentWorkspace !== workspace) await createProjectStateService(store, operator).reviseRecord(projectId, workflowId, { currentWorkspace: workspace }, workflow.recordVersion); });
    model = await get(root, workflowId);
    if (stage === "plan") {
      const plan = await createExactWorkflowPlanningService({openStore}).prepare(root, workflowId);
      const draft = {stage, instruction: plan.handoff ?? "", content: ""};
      drafts.set(keyFor(root, workflowId), draft); return {...model, draft};
    }
    const prompt = [`Exact Project: ${model.project.name} (${model.project.projectId}); Workflow ${workflowId} (issue-resolution)`, `Approved WorkflowIntake ${model.intakeAuthority.intakeId}@${model.intakeAuthority.recordVersion}`, `Intake: ${JSON.stringify(model.intake)}`, `SourceBaseline: ${JSON.stringify(model.source)}`, `Accepted Project architecture: ${JSON.stringify(model.acceptedArchitecture)}`, ...architectCandidateHandoffContract("issue-resolution")].join("\n\n");
    const draft = { stage, instruction: prompt, content: "" } satisfies Draft; drafts.set(keyFor(root, workflowId), draft); return { ...model, stage, draft };
  }
  async function act(root: string, workflowId: string, action: { type: string; content?: string; outcome?: "accept" | "revision" | "reject"; rationale?: string; rootCauses?: RootCauseCandidate[]; graph?: WorkflowPlanningGraph }) {
    const key = keyFor(root, workflowId); const model = await get(root, workflowId);
    if (action.type === "decide-rca" || action.type === "save-draft" && drafts.get(key)?.stage === "rca") throw Error("Use the structured Architect candidate and exact-cycle review commands for Issue RCA.");
    if (action.type === "save-draft") { const draft = drafts.get(key); if (!draft) throw Error("Prepare the current Architect cycle first.");
      const expectedWorkspace = draft.stage === "rca" ? "issue-rca" : "issue-planning";
      if (model.workflow.currentWorkspace !== expectedWorkspace || (draft.stage === "plan" && model.rcaState !== "accepted")) throw Error("The Issue Architect draft is stale for the current Workflow workspace and RCA state.");
      draft.content = String(action.content ?? "").slice(0, 200000); drafts.set(key, draft); return get(root, workflowId); }
    if (action.type === "decide-plan") throw Error("Use the persisted exact Plan candidate and SQL revision review commands.");
    throw Error("Unsupported Issue planning action.");
  }
  return { get, saveIntake, addEvidence, prepare, act };
}
