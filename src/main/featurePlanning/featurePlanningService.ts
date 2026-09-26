import fs from "node:fs";
import path from "node:path";
import type { FeatureIntakeInput } from "../../shared/featurePlanningContracts";
import type { WorkflowPlanningGraph } from "../../shared/projectState/projectStateService";
import { createProjectStateService } from "../../shared/projectState/projectStateService";
import type { ProjectStateStore } from "../../shared/projectState/projectStateStore";
import { createSQLiteProjectStateStore } from "../projectState/sqliteProjectStateStore";
import { selectedCurrentProjectId } from "../projectState/currentProjectRegistrationService";
import { createWorkflowApplicationService } from "../workflow/workflowApplicationService";

const operator = { principalId: "local-operator", principalType: "human" as const, role: "Operator" };
const fields: Array<[keyof FeatureIntakeInput, string]> = [
  ["requestedCapability", "Requested Capability Delta"], ["baseline", "Current Product Baseline"], ["scopeIn", "Scope In"], ["scopeOut", "Scope Out"],
  ["constraints", "Constraints"], ["preservation", "Behavior and Contracts to Preserve"], ["affectedSurfaces", "Affected Architecture and Integration Points"],
  ["evidence", "Evidence and Regression Boundary"], ["compatibilityRollout", "Compatibility and Rollout"],
];
type Draft = { stage: "assessment" | "plan"; instruction: string; content: string };

export function createFeaturePlanningService(dependencies: { openStore?: (databasePath: string) => ProjectStateStore & { close(): void } } = {}) {
  const openStore = dependencies.openStore ?? createSQLiteProjectStateStore;
  const drafts = new Map<string, Draft>();
  const workflowApp = createWorkflowApplicationService({ openStore });
  async function withState<T>(root: string, workflowId: string, work: (store: ProjectStateStore, projectId: string, workflow: any) => Promise<T>): Promise<T> {
    if (!workflowId || workflowId.length > 128) throw Error("Exact Feature Workflow ID is required.");
    const canonical = fs.realpathSync(root); const projectId = selectedCurrentProjectId(canonical);
    if (!projectId) throw Error("Selected Project is not registered.");
    const store = openStore(path.join(canonical, ".champcity", "project-state.sqlite"));
    try {
      const workflow = await store.getEntity(projectId, workflowId);
      if (!workflow || workflow.entityType !== "Workflow" || workflow.body.workflowType !== "feature-capability" || workflow.lifecycleState !== "active") throw Error("Exact active Feature Workflow is unavailable.");
      return await work(store, projectId, workflow);
    } finally { store.close(); }
  }
  async function get(root: string, workflowId: string) {
    return withState(root, workflowId, async (store, projectId, workflow) => {
      const state = createProjectStateService(store, operator); const relationships = await store.listRelationships(projectId);
      const owned = new Set(relationships.filter(edge => edge.relationshipType === "relates_to" && edge.toEntityId === workflowId && !edge.endedAt).map(edge => edge.fromEntityId));
      const findings = (await store.listEntities(projectId, "Finding")).filter((item): item is import("../../shared/projectState/domainContracts").ProjectStateRecord<"Finding"> => item.entityType === "Finding" && item.body.category === "feature-intake" && owned.has(item.id));
      const acceptedArchitecture = (await Promise.all([store.listEntities(projectId, "Decision"), store.listEntities(projectId, "BoundedSolution")])).flat()
        .filter((item): item is import("../../shared/projectState/domainContracts").ProjectStateRecord<"Decision"> | import("../../shared/projectState/domainContracts").ProjectStateRecord<"BoundedSolution"> => item.lifecycleState === "active" &&
          (item.entityType === "BoundedSolution" || (item.entityType === "Decision" && ["accepted", "approved"].includes(item.body.outcome) && !/route|work-intake/i.test(item.body.decisionType))));
      const project = await store.getProject(projectId);
      const featureDecisions = (await store.listEntities(projectId, "Decision"))
        .filter((item): item is import("../../shared/projectState/domainContracts").ProjectStateRecord<"Decision"> => item.entityType === "Decision" && item.body.decisionType === "feature-assessment-review" &&
          relationships.some(edge => edge.relationshipType === "governs" && edge.fromEntityId === item.id && edge.toEntityId === workflowId && !edge.endedAt))
        .sort((a, b) => a.body.decidedAt.localeCompare(b.body.decidedAt));
      const latestAssessment = featureDecisions.at(-1);
      const latestIntakeUpdate = findings.reduce((latest, finding) => finding.updatedAt > latest ? finding.updatedAt : latest, "");
      const assessmentState = !latestAssessment || latestAssessment.body.decidedAt < latestIntakeUpdate ? "not-reviewed" :
        latestAssessment.body.outcome === "accepted" ? "accepted" : latestAssessment.body.outcome === "revision_requested" ? "revision-requested" : "rejected";
      const intake: FeatureIntakeInput | null = findings.length ? Object.fromEntries(fields.map(([key, title]) => [key, findings.find(f => f.body.title === title)?.body.statement ?? ""])) as unknown as FeatureIntakeInput : null;
      const plan = workflow.body.currentWorkspace === "work-item-map" ? await state.getWorkflowExecutionPlan(projectId, workflowId) : null;
      const context = await workflowApp.getWorkflowPlanningContext(root, workflowId);
      const draft = drafts.get(draftKey(root, workflowId)) ?? null;
      const stage = plan ? "work-item-map" : draft?.stage ?? (intake ? assessmentState === "accepted" ? "plan" : "assessment" : "intake");
      return { project: { projectId, name: project?.body.name ?? "Current Project" }, workflow: { workflowId, lineageId: workflow.lineageId, workflowType: workflow.body.workflowType, title: workflow.body.title, workflowState: workflow.body.workflowState, lifecycleState: workflow.lifecycleState, currentWorkspace: workflow.body.currentWorkspace, createdAt: workflow.createdAt, updatedAt: workflow.updatedAt },
        source: context.source ? { baselineId: context.source.baseline.id, revisionId: context.source.baseline.body.baseRevisionId, bindingPrepared: context.source.binding?.body.preparationState === "ready" } : null,
        provenance: context.provenance, intake, findings, acceptedArchitecture, assessmentState, acceptedPlan: plan, stage, draft };
    });
  }
  async function saveIntake(root: string, workflowId: string, intake: FeatureIntakeInput) {
    if (!intake || fields.some(([key]) => typeof intake[key] !== "string" || !(intake[key] as string).trim() || (intake[key] as string).length > 8000)) throw Error("Complete each bounded Feature Intake field (maximum 8,000 characters each).");
    return withState(root, workflowId, async (store, projectId) => {
      const state = createProjectStateService(store, operator); const rels = await store.listRelationships(projectId);
      const prior = (await store.listEntities(projectId, "Finding")).filter((item): item is import("../../shared/projectState/domainContracts").ProjectStateRecord<"Finding"> => item.entityType === "Finding" && item.body.category === "feature-intake" && rels.some(edge => edge.relationshipType === "relates_to" && edge.fromEntityId === item.id && edge.toEntityId === workflowId && !edge.endedAt));
      for (const [key, title] of fields) {
        const statement = intake[key].trim(); const existing = prior.find(item => item.body.title === title);
        if (existing) await state.reviseRecord(projectId, existing.id, { statement, observedAt: new Date().toISOString() }, existing.recordVersion);
        else { const record = await state.createRecord(projectId, "Finding", { title, statement, category: "feature-intake", impact: "Feature planning context", observedAt: new Date().toISOString(), findingState: "current" }); await state.createRelationship(projectId, record.id, "relates_to", workflowId); }
      }
      drafts.delete(draftKey(root, workflowId)); return get(root, workflowId);
    });
  }
  async function prepare(root: string, workflowId: string, stage: "assessment" | "plan") {
    const projection = await get(root, workflowId);
    if (!projection.intake) throw Error("Save Feature Intake before preparing Architect work.");
    if (stage === "plan" && projection.assessmentState !== "accepted") throw Error("Accept the current Feature assessment before preparing the plan.");
    const sections = stage === "assessment" ? fields.map(([, title]) => title).concat(["Excluded Future Work"]) : ["Baseline and Capability Delta", "Preservation and Regression Proof", "Affected Services State UI and Contracts", "Rollout and Compatibility", "Hard Dependencies and Excluded Work", "Feature Candidate Traceability"];
    const instruction = [`# Feature ${stage} — exact Workflow ${workflowId}`, `Exact Project: ${projection.project.name} (${projection.project.projectId})`, `Exact Workflow: ${projection.workflow.title} (${workflowId})`, `Workflow type: feature-capability`, `SourceBaseline: ${projection.source ? `${projection.source.baselineId} at ${projection.source.revisionId}` : "non-source-backed"}`, `Routed provenance (context only): ${projection.provenance === "routed" ? "routed handoff" : "direct start"}`, `Authoritative SPS Feature Intake: ${JSON.stringify(projection.intake)}`, `Current accepted Project architecture and Decisions from SPS: ${JSON.stringify(projection.acceptedArchitecture)}`, `Cover these sections: ${sections.join("; ")}.`, stage === "plan" ? `Return one JSON WorkflowPlanningGraph for WRB03-01, workflowId exactly ${workflowId}. WorkItems kind feature by default; choose direct vs phased with rationale in solution.assumptions/risks. No execution, session, Git, validation-run, or Work Card mechanics.` : "Assess current baseline, capability delta, preservation, integration, compatibility, regression boundary, and excluded future work. Do not choose a route."].join("\n\n");
    const draft = { stage, instruction, content: "" } satisfies Draft;
    const key = draftKey(root, workflowId);
    drafts.set(key, draft);
    return { ...projection, draft };
  }
  async function act(root: string, workflowId: string, action: { type: string; content?: string; stage?: "assessment" | "plan"; outcome?: "accept" | "revision" | "reject"; rationale?: string; graph?: WorkflowPlanningGraph }) {
    const key = draftKey(root, workflowId);
    if (action.type === "prepare") return prepare(root, workflowId, action.stage as "assessment" | "plan");
    if (action.type === "save-draft") { const draft = drafts.get(key); if (!draft) throw Error("Prepare the current Architect cycle first."); draft.content = String(action.content ?? "").slice(0, 200000); drafts.set(key, draft); return get(root, workflowId); }
    if (action.type === "decide") {
      const stage = action.stage!; const draft = drafts.get(key); if (!draft?.content.trim()) throw Error("Refresh and review a non-empty Architect draft before disposition.");
      if (draft.stage !== stage) throw Error("Disposition must match the current Architect planning stage.");
      if (action.outcome === "accept" && stage === "plan") { if (!action.graph || action.graph.workflowId !== workflowId) throw Error("Accepted graph must name the exact Feature Workflow."); await workflowApp.acceptReviewedWorkflowPlanningGraph(root, action.graph); }
      else await withState(root, workflowId, async (store, projectId) => { await createProjectStateService(store, operator).recordDecision(projectId, workflowId, { decisionType: `feature-${stage}-review`, outcome: action.outcome === "accept" ? "accepted" : action.outcome === "revision" ? "revision_requested" : "rejected", decisionScope: workflowId, rationale: (action.rationale ?? "").slice(0, 8000) }); });
      drafts.delete(key);
      if (action.outcome === "revision") return prepare(root, workflowId, stage);
      if (action.outcome === "accept" && stage === "assessment") return prepare(root, workflowId, "plan");
      return get(root, workflowId);
    }
    throw Error("Unsupported Feature planning action.");
  }
  return { get, saveIntake, prepare, act };
}

function draftKey(root: string, workflowId: string): string { return `${fs.realpathSync(root)}:${workflowId}`; }
