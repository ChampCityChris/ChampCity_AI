import fs from "node:fs";
import path from "node:path";
import type { EntityBodyMap, ProjectStateRecord, WorkRoute } from "../../shared/projectState/domainContracts";
import { workflowTypeForWorkRoute } from "../../shared/projectState/workflowTypeRegistry";
import { createProjectStateService, type DecisionInput } from "../../shared/projectState/projectStateService";
import type { CheckpointResult } from "../../shared/sourceLifecycleContracts";
import { createSQLiteProjectStateStore } from "../projectState/sqliteProjectStateStore";
import { selectedCurrentProjectId } from "../projectState/currentProjectRegistrationService";
import { createDispositionCheckpoint, createImplementationCheckpoint } from "./semanticCheckpointService";

const operator = { principalId: "local-operator", principalType: "human" as const, role: "Operator" };
type Store = ReturnType<typeof createSQLiteProjectStateStore>;
type Binding = ProjectStateRecord<"SourceBinding">;
type Checkpoint = ProjectStateRecord<"SourceCheckpoint">;
export type WorkflowCheckpointResult<T> = { record: T; checkpoint: CheckpointResult };

function open(root: string, projectId: string): { selected: string; store: Store } {
  const selected = fs.realpathSync(root);
  if (selectedCurrentProjectId(selected) !== projectId) throw Error("Selected Current Project registration is unavailable.");
  return { selected, store: createSQLiteProjectStateStore(path.join(selected, ".champcity", "project-state.sqlite")) };
}
async function bindingForWorkflow(store: Store, projectId: string, workflowId: string): Promise<Binding> {
  const targetWorkflow = await store.getEntity(projectId, workflowId);
  if (targetWorkflow?.entityType !== "Workflow") throw Error("A substantive Workflow is required.");
  const workflows = (await store.listEntities(projectId, "Workflow")).filter((row): row is ProjectStateRecord<"Workflow"> => row.entityType === "Workflow" && row.lineageId === targetWorkflow.lineageId);
  const current = workflows.filter(row => row.lifecycleState === "active" && row.body.workflowType !== "work-intake-routing" &&
    !["closed", "cancelled"].includes(row.body.workflowState));
  if (current.length !== 1 || current[0].id !== workflowId) throw Error("Source lifecycle evidence requires the unique current Workflow owner.");
  const lineageIds = new Set(workflows.map(row => row.id));
  const bindings = (await store.listEntities(projectId, "SourceBinding"))
    .filter((record): record is Binding => record.entityType === "SourceBinding" && lineageIds.has(record.body.workflowId) && record.lifecycleState === "active");
  if (bindings.length === 1) {
    const baseline = await store.getEntity(projectId, bindings[0].body.sourceBaselineId);
    const workflow = await store.getEntity(projectId, bindings[0].body.workflowId);
    const baselineWorkflow = baseline?.entityType === "SourceBaseline" ? await store.getEntity(projectId, baseline.body.workflowId) : null;
    if (baseline?.entityType !== "SourceBaseline" || workflow?.entityType !== "Workflow" || baselineWorkflow?.entityType !== "Workflow" || workflow.lineageId !== baselineWorkflow.lineageId) throw Error("SourceBinding baseline and Workflow lineage mismatch.");
  }
  if (bindings.length !== 1 || bindings[0].body.preparationState !== "ready" ||
    !bindings[0].body.currentRevisionId || !bindings[0].body.workSourceLineId || !bindings[0].body.repositoryCheckoutId) throw Error("Workflow source must be ready.");
  return bindings[0];
}
async function priorRevision(store: Store, projectId: string, boundaryId: string, binding: Binding): Promise<string> {
  const existing = (await store.listEntities(projectId, "SourceCheckpoint"))
    .filter((record): record is Checkpoint => record.entityType === "SourceCheckpoint" && record.body.boundaryId === boundaryId);
  if (existing.length > 1) throw Error("Checkpoint boundary is ambiguous.");
  return existing[0]?.body.expectedRevisionId ?? binding.body.currentRevisionId!;
}
async function assertWorkOwner(store: Store, projectId: string, workflowId: string, workItemId: string) {
  const owner = await store.getEntity(projectId, workflowId);
  if (owner?.entityType !== "Workflow") throw Error("Work Intake target Workflow is unavailable.");
  const workflows = (await store.listEntities(projectId, "Workflow")).filter((row): row is ProjectStateRecord<"Workflow"> => row.entityType === "Workflow" && row.lineageId === owner.lineageId);
  const currentOwners = workflows.filter(row => row.lifecycleState === "active" && row.body.workflowType !== "work-intake-routing" &&
    !["closed", "cancelled"].includes(row.body.workflowState));
  if (currentOwners.length !== 1 || currentOwners[0].id !== workflowId) throw Error("Source lifecycle evidence requires the unique current Workflow owner.");
  const workflowLineages = new Set(workflows.map(row => row.id));
  const parents = (await store.listRelationships(projectId, "part_of")).filter(edge => !edge.endedAt);
  let current = workItemId;
  const seen = new Set<string>();
  while (!seen.has(current)) {
    if (workflowLineages.has(current)) return;
    seen.add(current);
    const next = parents.filter(edge => edge.fromEntityId === current);
    if (next.length !== 1) break;
    current = next[0].toEntityId;
  }
  throw Error("Work Item is not owned by the selected target Workflow lineage.");
}

/** WIR routing persists its decision without creating source lifecycle evidence. */
export async function selectStructuredWorkRoute(root: string, projectId: string, intakeId: string,
  input: { route: WorkRoute; assessmentId: string; rationale: string }): Promise<WorkflowCheckpointResult<ProjectStateRecord<"Decision">>> {
  if (!workflowTypeForWorkRoute(input.route)) throw Error("Greenfield is unavailable in Existing-Project Work Intake routing.");
  const { selected, store } = open(root, projectId);
  try {
    const state = createProjectStateService(store, operator);
    const history = await state.getWorkRouteHistory(projectId, intakeId);
    const derived = new Set(history.relationships.filter(edge => edge.relationshipType === "derived_from" && edge.toEntityId === input.assessmentId && !edge.endedAt)
      .map(edge => edge.fromEntityId));
    const prior = history.decisions.filter(record => derived.has(record.id) && record.lifecycleState === "active");
    if (prior.length > 1 || prior.length === 1 &&
      (prior[0].body.outcome !== input.route || prior[0].body.rationale !== input.rationale))
      throw Error("Route assessment already has a conflicting Operator decision.");
    const saved = prior[0] ?? await state.recordRouteDecision(projectId, intakeId, { ...input, route: input.route as Exclude<WorkRoute, "greenfield"> });
    if (saved.entityType !== "Decision") throw Error("Route decision type changed.");
    const checkpoint: CheckpointResult = { state: "not-required", checkpointId: null, revision: null, message: "Routing decision does not own source." };
    return { record: saved, checkpoint };
  } finally { store.close(); }
}

/** Completed ImplementationRecords obtain a source revision before their review surface can use them. */
export async function recordStructuredImplementation(root: string, projectId: string, workflowId: string, workItemId: string,
  input: Omit<EntityBodyMap["ImplementationRecord"], "workItemId"> & { executionRef: string },
  boundaryId: string, attributablePaths: string[]): Promise<WorkflowCheckpointResult<ProjectStateRecord<"ImplementationRecord">>> {
  const { selected, store } = open(root, projectId);
  try {
    if (input.outcome !== "implemented" || !input.executionRef) throw Error("Implementation checkpoint requires a completed unique execution.");
    const state = createProjectStateService(store, operator);
    await assertWorkOwner(store, projectId, workflowId, workItemId);
    const binding = await bindingForWorkflow(store, projectId, workflowId);
    const attempts = (await state.getImplementationAttempts(projectId, workItemId))
      .filter(record => record.body.executionRef === input.executionRef);
    if (attempts.length > 1 || attempts.length === 1 &&
      (attempts[0].body.workItemId !== workItemId || Object.entries(input).some(([key, value]) =>
        JSON.stringify((attempts[0].body as unknown as Record<string, unknown>)[key]) !== JSON.stringify(value))))
      throw Error("Implementation execution identity conflicts with saved evidence.");
    const saved = attempts[0] ?? await state.recordImplementation(projectId, workItemId, input);
    if (saved.entityType !== "ImplementationRecord") throw Error("Implementation record type changed.");
    const checkpoint = await createImplementationCheckpoint(selected, projectId, {
      boundaryId, workflowId, targetEntityId: saved.id,
      sourceLineId: binding.body.workSourceLineId!, expectedRevisionId: await priorRevision(store, projectId, boundaryId, binding),
      repositoryCheckoutId: binding.body.repositoryCheckoutId!, attributablePaths,
    });
    return { record: saved, checkpoint };
  } finally { store.close(); }
}

/** Existing human review Decisions produce chronology; routine Validator results use their own state. */
export async function recordStructuredWorkDisposition(root: string, projectId: string, workflowId: string, workItemId: string,
  input: DecisionInput, boundaryId: string): Promise<WorkflowCheckpointResult<ProjectStateRecord<"Decision">>> {
  const { selected, store } = open(root, projectId);
  try {
    const state = createProjectStateService(store, operator);
    await assertWorkOwner(store, projectId, workflowId, workItemId);
    const binding = await bindingForWorkflow(store, projectId, workflowId);
    const decisions = (await store.listEntities(projectId, "Decision"))
      .filter((record): record is ProjectStateRecord<"Decision"> => record.entityType === "Decision" && record.body.decisionScope === input.decisionScope &&
        record.body.decisionType === input.decisionType);
    const governs = await store.listRelationships(projectId, "governs");
    const prior = decisions.filter(record => governs.some(edge => edge.fromEntityId === record.id && edge.toEntityId === workItemId && !edge.endedAt));
    if (prior.length > 1 || prior.length === 1 && (prior[0].body.outcome !== input.outcome || prior[0].body.rationale !== (input.rationale ?? "")))
      throw Error("Work Item disposition identity conflicts with saved evidence.");
    const saved = prior[0] ?? await state.recordDecision(projectId, workItemId, input);
    if (saved.entityType !== "Decision") throw Error("Work Item decision type changed.");
    const checkpoint = await createDispositionCheckpoint(selected, projectId, {
      boundaryId, workflowId, targetEntityId: workItemId,
      sourceLineId: binding.body.workSourceLineId!, expectedRevisionId: await priorRevision(store, projectId, boundaryId, binding),
      repositoryCheckoutId: binding.body.repositoryCheckoutId!, dispositionId: saved.id, attributablePaths: [],
    });
    return { record: saved, checkpoint };
  } finally { store.close(); }
}
