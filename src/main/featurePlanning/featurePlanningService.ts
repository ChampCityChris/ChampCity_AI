import { architectCandidateHandoffContract } from "../../shared/architectWorkspaceContracts";
import { createExactWorkflowPlanningService } from "../workPlanning/exactWorkflowPlanningService";
import { createStructuredArchitectWorkspaceService } from "../architectOutputs/structuredArchitectWorkspaceService";
import { createWorkflowIntakeService } from "../workflow/workflowIntakeService";
import { WORKFLOW_INTAKE_DEFINITIONS, validateWorkflowIntakePayload } from "../../shared/workflowIntakeContracts";
import fs from "node:fs";
import path from "node:path";
import type { FeatureIntakeInput } from "../../shared/featurePlanningContracts";
import type { FeatureAssessmentCandidate, WorkflowPlanningGraph } from "../../shared/projectState/projectStateService";
import { createProjectStateService } from "../../shared/projectState/projectStateService";
import { selectProjectArchitectureContext } from "../../shared/projectState/projectArchitectureContext";
import type { ProjectStateStore } from "../../shared/projectState/projectStateStore";
import { createSQLiteProjectStateStore } from "../projectState/sqliteProjectStateStore";
import { selectedCurrentProjectId } from "../projectState/currentProjectRegistrationService";
import { createWorkflowApplicationService } from "../workflow/workflowApplicationService";

const operator = { principalId: "local-operator", principalType: "human" as const, role: "Operator" };
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
    const structuredIntake = await createWorkflowIntakeService({openStore}).ensureWorkflowIntake(root, workflowId);
    return withState(root, workflowId, async (store, projectId, workflow) => {
      const state = createProjectStateService(store, operator); const relationships = await store.listRelationships(projectId);
      const owned = new Set(relationships.filter(edge => edge.relationshipType === "workflow_member" && edge.toEntityId === workflowId && !edge.endedAt).map(edge => edge.fromEntityId));
      const findings = (await store.listEntities(projectId, "Finding")).filter((item): item is import("../../shared/projectState/domainContracts").ProjectStateRecord<"Finding"> => item.entityType === "Finding" && item.body.category === "feature-intake" && owned.has(item.id));
      const acceptedArchitecture = selectProjectArchitectureContext(projectId, await store.listEntities(projectId), relationships);
      const project = await store.getProject(projectId);
      const architect = await createStructuredArchitectWorkspaceService().get(root, workflowId);
      const memberIds = new Set(architect.review?.sources.map(source => source.entityId) ?? []);
      const approved = architect.review?.disposition.state === "approved";
      const acceptedAssessment = approved ? (await store.listEntities(projectId, "Finding")).filter((item): item is import("../../shared/projectState/domainContracts").ProjectStateRecord<"Finding"> => item.entityType === "Finding" && memberIds.has(item.id) && item.body.category === "feature-assessment") : [];
      const assessmentState = approved ? "accepted" : architect.review?.disposition.state === "revision_requested" ? "revision-requested" : architect.review?.disposition.state === "rejected" ? "rejected" : "not-reviewed";
      const intake = structuredIntake.values as FeatureIntakeInput | null;
      const plan = workflow.body.currentWorkspace === "work-item-map" ? await state.getWorkflowExecutionPlan(projectId, workflowId) : null;
      const context = await workflowApp.getWorkflowPlanningContext(root, workflowId);
      const draft = drafts.get(draftKey(root, workflowId)) ?? null;
      const workspaceStage = workflow.body.currentWorkspace === "work-item-map" ? "work-item-map" : workflow.body.currentWorkspace === "feature-intake" ? "intake" :
        workflow.body.currentWorkspace === "feature-assessment" ? "assessment" : workflow.body.currentWorkspace === "feature-planning" ? assessmentState === "accepted" ? "plan" : "assessment" : "intake";
      const stage = plan ? "work-item-map" : workspaceStage;
      return { project: { projectId, name: project?.body.name ?? "Current Project" }, workflow: { workflowId, lineageId: workflow.lineageId, workflowType: workflow.body.workflowType, title: workflow.body.title, workflowState: workflow.body.workflowState, lifecycleState: workflow.lifecycleState, currentWorkspace: workflow.body.currentWorkspace, createdAt: workflow.createdAt, updatedAt: workflow.updatedAt },
        source: context.source ? { baselineId: context.source.baseline.id, revisionId: context.source.baseline.body.baseRevisionId, bindingPrepared: context.source.binding?.body.preparationState === "ready" } : null,
        provenance: context.provenance, intakeAuthority: structuredIntake, intake, findings, acceptedAssessment, acceptedArchitecture, assessmentState, acceptedPlan: plan, stage, draft };
    });
  }
  async function saveIntake(root: string, workflowId: string, intake: FeatureIntakeInput) {
    await createWorkflowIntakeService({openStore}).saveWorkflowIntake(root, workflowId, {workflowType: "feature-capability", values: intake});
    drafts.delete(draftKey(root, workflowId)); return get(root, workflowId);
  }
  async function prepare(root: string, workflowId: string, stage: "assessment" | "plan") {
    let projection = await get(root, workflowId);
    if (projection.workflow.currentWorkspace === "work-item-map") throw Error("Accepted Feature Work Item Map is read-only.");
    if (!projection.intake) throw Error("Save Feature Intake before preparing Architect work.");
    if (projection.intakeAuthority.disposition?.state !== "approved") throw Error("Approve the current Feature Intake revision before preparing Architect work.");
    if (stage === "plan" && (projection.assessmentState !== "accepted" || !projection.acceptedAssessment.length)) throw Error("Accept the current Feature assessment before preparing the plan.");
    const workspace = stage === "assessment" ? "feature-assessment" : "feature-planning";
    await withState(root, workflowId, async (store, projectId, workflow) => { if (workflow.body.currentWorkspace !== workspace) await createProjectStateService(store, operator).reviseRecord(projectId, workflowId, { currentWorkspace: workspace }, workflow.recordVersion); });
    projection = await get(root, workflowId);
    if (stage === "plan") {
      const plan = await createExactWorkflowPlanningService({openStore}).prepare(root, workflowId);
      const draft = {stage, instruction: plan.handoff ?? "Approved Research outcome requires no Plan.", content: ""} satisfies Draft;
      drafts.set(draftKey(root, workflowId), draft); return {...projection, draft};
    }

    const instruction = [`Exact Project: ${projection.project.name} (${projection.project.projectId}); Workflow ${workflowId} (feature-capability)`, `Approved WorkflowIntake ${projection.intakeAuthority.intakeId}@${projection.intakeAuthority.recordVersion}`, `Intake: ${JSON.stringify(projection.intake)}`, `SourceBaseline: ${JSON.stringify(projection.source)}`, `Accepted Project architecture: ${JSON.stringify(projection.acceptedArchitecture)}`, ...architectCandidateHandoffContract("feature-capability")].join("\n\n");
    const draft = { stage, instruction, content: "" } satisfies Draft;
    const key = draftKey(root, workflowId);
    drafts.set(key, draft);
    return { ...projection, draft };
  }
  async function act(root: string, workflowId: string, action: { type: string; content?: string; stage?: "assessment" | "plan"; outcome?: "accept" | "revision" | "reject"; rationale?: string; assessment?: FeatureAssessmentCandidate; graph?: WorkflowPlanningGraph }) {
    const key = draftKey(root, workflowId); const model = await get(root, workflowId);
    if (action.type === "decide" && action.stage === "assessment" || action.type === "save-draft" && drafts.get(key)?.stage === "assessment") throw Error("Use the structured Architect candidate and exact-cycle review commands for Feature Assessment.");
    if (action.type === "decide" && action.stage === "plan") throw Error("Use the persisted exact Plan candidate and SQL revision review commands.");
    if (action.type === "prepare") return prepare(root, workflowId, action.stage as "assessment" | "plan");
    if (action.type === "save-draft") { const draft = drafts.get(key); if (!draft) throw Error("Prepare the current Architect cycle first.");
      const expectedWorkspace = draft.stage === "assessment" ? "feature-assessment" : "feature-planning";
      if (model.workflow.currentWorkspace !== expectedWorkspace || (draft.stage === "plan" && model.assessmentState !== "accepted")) throw Error("The Feature Architect draft is stale for the current Workflow workspace and assessment state.");
      draft.content = String(action.content ?? "").slice(0, 200000); drafts.set(key, draft); return get(root, workflowId); }
    if (action.type === "decide") throw Error("Use structured Architect or Plan exact-revision review commands.");

    throw Error("Unsupported Feature planning action.");
  }
  return { get, saveIntake, prepare, act };
}

function draftKey(root: string, workflowId: string): string { return `${fs.realpathSync(root)}:${workflowId}`; }
