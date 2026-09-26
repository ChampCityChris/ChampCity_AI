import fs from "node:fs";
import path from "node:path";
import type { EntityId, ProjectId, ProjectStateRecord } from "../../shared/projectState/domainContracts";
import { createProjectStateService, type WorkflowExecutionPlanView } from "../../shared/projectState/projectStateService";
import type { ProjectStateStore } from "../../shared/projectState/projectStateStore";
import type { WorkflowExecutionPreparationResult, WorkflowExecutionProjection } from "../../shared/workflowApplicationContracts";
import { createSQLiteProjectStateStore } from "../projectState/sqliteProjectStateStore";
import { selectedCurrentProjectId } from "../projectState/currentProjectRegistrationService";

const operator = { principalId: "local-operator", principalType: "human" as const, role: "Operator" };
type WorkflowRecord = ProjectStateRecord<"Workflow">;
const implementationWorkflowTypes = new Set(["feature-capability", "issue-resolution"]);

function isCurrentWorkflow(record: WorkflowRecord): boolean {
  return record.lifecycleState === "active" && record.body.workflowState !== "closed" && record.body.workflowState !== "cancelled";
}

/** Shared exact-Workflow post-plan execution projection and lazy source preparation boundary. */
export function createWorkflowExecutionApplicationService(dependencies: {
  openStore?: (databasePath: string) => ProjectStateStore & { close(): void };
  selectedProjectId?: typeof selectedCurrentProjectId;
  materializeWorkflowSource?: (projectRoot: string, projectId: ProjectId, workflowId: EntityId) => Promise<{ binding: ProjectStateRecord<"SourceBinding"> }>;
} = {}) {
  const openStore = dependencies.openStore ?? createSQLiteProjectStateStore;
  const getSelectedProjectId = dependencies.selectedProjectId ?? selectedCurrentProjectId;

  async function withCurrentProject<T>(projectRoot: string, action: (store: ProjectStateStore, projectId: ProjectId) => Promise<T>): Promise<T> {
    if (typeof projectRoot !== "string" || !projectRoot.trim()) throw Error("Current Project root is required.");
    const canonicalRoot = fs.realpathSync(projectRoot);
    const projectId = getSelectedProjectId(canonicalRoot);
    if (!projectId) throw Error("Selected Project is not a registered Current Project.");
    const store = openStore(path.join(canonicalRoot, ".champcity", "project-state.sqlite"));
    try {
      const project = await store.getProject(projectId);
      if (!project || project.id !== projectId || project.lifecycleState !== "active") throw Error("Selected Current Project State is unavailable.");
      return await action(store, projectId);
    } finally { store.close(); }
  }

  async function exactPlan(store: ProjectStateStore, projectId: ProjectId, workflowId: EntityId): Promise<WorkflowExecutionPlanView> {
    const workflow = await store.getEntity(projectId, workflowId);
    if (workflow?.entityType !== "Workflow" || workflow.projectId !== projectId || !isCurrentWorkflow(workflow) || !implementationWorkflowTypes.has(workflow.body.workflowType))
      throw Error("Execution requires a current Feature or Issue Workflow in this Project.");
    const lineage = (await store.listEntities(projectId, "Workflow"))
      .filter((record): record is WorkflowRecord => record.entityType === "Workflow" && record.lineageId === workflow.lineageId);
    const current = lineage.filter(isCurrentWorkflow);
    if (current.length !== 1 || current[0].id !== workflowId) throw Error("Execution Workflow ID is not the unique current Workflow in its lineage.");
    return createProjectStateService(store, operator).getWorkflowExecutionPlan(projectId, workflowId);
  }

  async function getExecutionProjection(projectRoot: string, workflowId: EntityId): Promise<WorkflowExecutionProjection> {
    if (typeof workflowId !== "string" || !workflowId.trim() || workflowId.length > 128) throw Error("Exact Workflow ID is required.");
    return withCurrentProject(projectRoot, async (store, projectId) => {
      const plan = await exactPlan(store, projectId, workflowId);
      return project(store, projectId, plan);
    });
  }

  async function project(store: ProjectStateStore, projectId: ProjectId, plan: WorkflowExecutionPlanView): Promise<WorkflowExecutionProjection> {
    const edges = (await store.listRelationships(projectId)).filter(edge => !edge.endedAt);
    const workflow = plan.workflow;
    const lineageIds = new Set((await store.listEntities(projectId, "Workflow"))
      .filter((record): record is WorkflowRecord => record.entityType === "Workflow" && record.lineageId === workflow.lineageId).map(record => record.id));
    const baselines = (await store.listEntities(projectId, "SourceBaseline"))
      .filter((record): record is ProjectStateRecord<"SourceBaseline"> => record.entityType === "SourceBaseline" && lineageIds.has(record.body.workflowId));
    const bindings = (await store.listEntities(projectId, "SourceBinding"))
      .filter((record): record is ProjectStateRecord<"SourceBinding"> => record.entityType === "SourceBinding" && record.lifecycleState === "active" && lineageIds.has(record.body.workflowId));
    if (baselines.length > 1 || bindings.length > 1 || bindings.length === 1 && (baselines.length !== 1 || bindings[0].body.sourceBaselineId !== baselines[0].id))
      throw Error("Workflow source state is ambiguous or inconsistent.");
    const binding = bindings[0];
    const source: WorkflowExecutionProjection["source"] = baselines.length === 0
      ? { state: "non-source", currentRevisionId: null }
      : binding?.body.preparationState === "ready"
        ? { state: "ready", currentRevisionId: binding.body.currentRevisionId ?? null }
        : binding?.body.preparationState === "blocked"
          ? { state: "blocked", currentRevisionId: null, failureCode: binding.body.failureCode }
          : { state: "unprepared", currentRevisionId: null };
    const itemRecords = [...plan.directWorkItems, ...Object.values(plan.workItemsByPhase).flat()]
      .filter((record, index, all) => all.findIndex(candidate => candidate.id === record.id) === index)
      .sort((a, b) => a.id.localeCompare(b.id));
    const itemIds = new Set(itemRecords.map(record => record.id));
    const phaseByItem = new Map<EntityId, EntityId>();
    for (const phase of plan.phases) for (const itemId of phase.workItemIds) phaseByItem.set(itemId, phase.phaseId);
    const dependencies = new Map<EntityId, EntityId[]>();
    for (const edge of edges.filter(edge => edge.relationshipType === "depends_on" && (itemIds.has(edge.fromEntityId) || itemIds.has(edge.toEntityId)))) {
      if (!itemIds.has(edge.fromEntityId) || !itemIds.has(edge.toEntityId)) throw Error("Invalid cross-Workflow dependency in Project State.");
      dependencies.set(edge.fromEntityId, [...(dependencies.get(edge.fromEntityId) ?? []), edge.toEntityId]);
    }
    const itemList: WorkflowExecutionProjection["items"] = [];
    const state = createProjectStateService(store, operator);
    for (const record of itemRecords) {
      const blockers = new Set<string>();
      if (["superseded", "voided", "archived"].includes(record.lifecycleState) || ["closed", "cancelled"].includes(record.body.workState)) blockers.add("terminal");
      const dependencyIds = (dependencies.get(record.id) ?? []).sort();
      for (const dependencyId of dependencyIds) {
        const dependency = itemRecords.find(candidate => candidate.id === dependencyId);
        if (!dependency || dependency.body.workState !== "closed") blockers.add(`dependency:${dependencyId}`);
      }
      const phaseId = phaseByItem.get(record.id) ?? null;
      if (phaseId) {
        const owner = plan.phases.find(phase => phase.phaseId === phaseId);
        if (!owner || ["closed", "cancelled", "blocked"].includes(owner.record.body.phaseState)) blockers.add(`phase:${phaseId}`);
        else for (const prior of plan.phases.filter(phase => phase.sequence < owner.sequence)) {
          if (prior.record.body.phaseState !== "closed" || prior.workItemIds.some(id => itemRecords.find(item => item.id === id)?.body.workState !== "closed")) blockers.add(`prior-phase:${prior.phaseId}`);
        }
      }
      const disposition = await state.getEffectiveDisposition(projectId, record.id);
      if (["proposed", "revision_requested", "rejected", "revoked"].includes(disposition.state)) blockers.add("blocking-decision");
      for (const edge of edges.filter(edge => edge.relationshipType === "blocks" && edge.toEntityId === record.id)) {
        const blocker = await store.getEntity(projectId, edge.fromEntityId);
        if (blocker?.lifecycleState === "active") blockers.add(`blocking-record:${blocker.id}`);
      }
      const relatedRepairIds = plan.repairIds.filter(edge => edge.to === record.id).map(edge => edge.from).sort();
      const implementationAttempts = await state.getImplementationAttempts(projectId, record.id);
      const criterionIds = new Set(plan.criteria.filter(item => item.ownerId === record.id).map(item => item.record.id));
      const validationIds = new Set(edges.filter(edge => edge.relationshipType === "evaluates" &&
        (edge.toEntityId === record.id || criterionIds.has(edge.toEntityId))).map(edge => edge.fromEntityId));
      const validations = (await store.listEntities(projectId, "Validation"))
        .filter((candidate): candidate is ProjectStateRecord<"Validation"> => candidate.entityType === "Validation" && validationIds.has(candidate.id))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
      itemList.push({ record, phaseId, dependencyIds, eligibility: { workItemId: record.id, eligible: blockers.size === 0, blockers: [...blockers].sort() },
        implementationAttempts, validations, repairIds: relatedRepairIds });
    }
    const readyIds = itemList.filter(item => item.eligibility.eligible && ["planned", "ready"].includes(item.record.body.workState))
      .map(item => item.record.id).sort();
    const activeIds = itemList.filter(item => item.record.body.workState === "in_progress" || item.record.body.workState === "validation_pending")
      .map(item => item.record.id).sort();
    return { projectId, workflowId: workflow.id, plan, items: itemList, nextEligibleWorkItemIds: readyIds, activeWorkItemIds: activeIds,
      source, laterStages: { tester: null, validator: null, integration: null } };
  }

  async function prepareExecution(projectRoot: string, workflowId: EntityId, request: { sourceMutating: boolean }): Promise<WorkflowExecutionPreparationResult> {
    if (!request || typeof request !== "object" || Object.keys(request).length !== 1 || typeof request.sourceMutating !== "boolean")
      throw Error("A bounded execution preparation request is required.");
    const view = await getExecutionProjection(projectRoot, workflowId);
    if (view.source.state === "non-source") return request.sourceMutating
      ? { state: "blocked", currentRevisionId: null, failureCode: "SOURCE_CAPABILITY_UNAVAILABLE" }
      : { state: "non-source", currentRevisionId: null };
    if (!request.sourceMutating) return { state: view.source.state, currentRevisionId: view.source.currentRevisionId, ...(view.source.failureCode ? { failureCode: view.source.failureCode } : {}) };
    if (view.source.state === "ready") return { state: "ready", currentRevisionId: view.source.currentRevisionId };
    if (!dependencies.materializeWorkflowSource) return { state: "blocked", currentRevisionId: null, failureCode: "SOURCE_CHECKOUT_PREPARATION_UNAVAILABLE" };
    try {
      const result = await dependencies.materializeWorkflowSource(fs.realpathSync(projectRoot), view.projectId, workflowId);
      const refreshed = await getExecutionProjection(projectRoot, workflowId);
      if (refreshed.source.state !== "ready")
        return { state: "blocked", currentRevisionId: null, failureCode: "SOURCE_MATERIALIZATION_IDENTITY_MISMATCH" };
      return { state: "ready", currentRevisionId: refreshed.source.currentRevisionId, repositoryCheckoutId: result.binding.body.repositoryCheckoutId };
    } catch (error) {
      const failureCode = (error as Error & { materializationCode?: string }).materializationCode ?? "REPOSITORY_CHECKOUT_MATERIALIZATION_FAILED";
      return { state: "blocked", currentRevisionId: null, failureCode };
    }
  }

  return { getExecutionProjection, prepareExecution };
}
