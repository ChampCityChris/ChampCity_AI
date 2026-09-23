import fs from "node:fs";
import path from "node:path";
import type { EntityBodyMap, ProjectStateRecord, WorkRoute } from "../../shared/projectState/domainContracts";
import { createProjectStateService, type DecisionInput } from "../../shared/projectState/projectStateService";
import type { CheckpointResult } from "../../shared/sourceLifecycleContracts";
import { createSQLiteProjectStateStore } from "../projectState/sqliteProjectStateStore";
import { selectedStructuredProjectId } from "../workIntake/structuredWorkIntakeService";
import { createDispositionCheckpoint, createImplementationCheckpoint } from "./semanticCheckpointService";

const operator = { principalId: "local-operator", principalType: "human" as const, role: "Operator" };
type Store = ReturnType<typeof createSQLiteProjectStateStore>;
type Binding = ProjectStateRecord<"SourceBinding">;
type Checkpoint = ProjectStateRecord<"SourceCheckpoint">;
export type WorkflowCheckpointResult<T> = { record: T; checkpoint: CheckpointResult };

function open(root: string, projectId: string): { selected: string; store: Store } {
  const selected = fs.realpathSync(root);
  if (selectedStructuredProjectId(selected) !== projectId) throw Error("Selected structured Project authority is unavailable.");
  return { selected, store: createSQLiteProjectStateStore(path.join(selected, ".champcity", "project-state.sqlite")) };
}
async function bindingFor(store: Store, projectId: string, intakeId: string): Promise<Binding> {
  const bindings = (await store.listEntities(projectId, "SourceBinding"))
    .filter((record): record is Binding => record.entityType === "SourceBinding" && record.body.workIntakeId === intakeId && record.lifecycleState === "active");
  if (bindings.length !== 1 || bindings[0].body.preparationState !== "ready" ||
    !bindings[0].body.currentRevisionId || !bindings[0].body.workSourceLineId) throw Error("Work Intake source must be ready.");
  return bindings[0];
}
async function priorRevision(store: Store, projectId: string, boundaryId: string, binding: Binding): Promise<string> {
  const existing = (await store.listEntities(projectId, "SourceCheckpoint"))
    .filter((record): record is Checkpoint => record.entityType === "SourceCheckpoint" && record.body.boundaryId === boundaryId);
  if (existing.length > 1) throw Error("Checkpoint boundary is ambiguous.");
  return existing[0]?.body.expectedRevisionId ?? binding.body.currentRevisionId!;
}
async function assertWorkOwner(store: Store, projectId: string, intakeId: string, workItemId: string) {
  const initiated = (await store.listRelationships(projectId, "initiates"))
    .filter(edge => edge.fromEntityId === intakeId && !edge.endedAt).map(edge => edge.toEntityId);
  if (initiated.length !== 1) throw Error("Work Intake workflow ownership is ambiguous.");
  const parents = (await store.listRelationships(projectId, "part_of")).filter(edge => !edge.endedAt);
  let current = workItemId;
  const seen = new Set<string>();
  while (!seen.has(current)) {
    if (current === initiated[0]) return;
    seen.add(current);
    const next = parents.filter(edge => edge.fromEntityId === current);
    if (next.length !== 1) break;
    current = next[0].toEntityId;
  }
  throw Error("Work Item is not owned by the selected Work Intake workflow.");
}

/** Route selection is saved exactly once for an assessment, then checkpointed on the same SourceLine. */
export async function selectStructuredWorkRoute(root: string, projectId: string, intakeId: string,
  input: { route: WorkRoute; assessmentId: string; rationale: string }): Promise<WorkflowCheckpointResult<ProjectStateRecord<"Decision">>> {
  const { selected, store } = open(root, projectId);
  try {
    const state = createProjectStateService(store, operator);
    const binding = await bindingFor(store, projectId, intakeId);
    const history = await state.getWorkRouteHistory(projectId, intakeId);
    const derived = new Set(history.relationships.filter(edge => edge.relationshipType === "derived_from" && edge.toEntityId === input.assessmentId && !edge.endedAt)
      .map(edge => edge.fromEntityId));
    const prior = history.decisions.filter(record => derived.has(record.id) && record.lifecycleState === "active");
    if (prior.length > 1 || prior.length === 1 &&
      (prior[0].body.outcome !== input.route || prior[0].body.rationale !== input.rationale))
      throw Error("Route assessment already has a conflicting Operator decision.");
    const saved = prior[0] ?? await state.recordRouteDecision(projectId, intakeId, input);
    if (saved.entityType !== "Decision") throw Error("Route decision type changed.");
    const boundaryId = `route:${intakeId}:${input.assessmentId}`;
    const checkpoint = await createDispositionCheckpoint(selected, projectId, {
      boundaryId, workIntakeId: intakeId, targetEntityId: intakeId,
      sourceLineId: binding.body.workSourceLineId!, expectedRevisionId: await priorRevision(store, projectId, boundaryId, binding),
      dispositionId: saved.id, attributablePaths: [],
    });
    return { record: saved, checkpoint };
  } finally { store.close(); }
}

/** Completed ImplementationRecords obtain a source revision before their review surface can use them. */
export async function recordStructuredImplementation(root: string, projectId: string, intakeId: string, workItemId: string,
  input: Omit<EntityBodyMap["ImplementationRecord"], "workItemId"> & { executionRef: string },
  boundaryId: string, attributablePaths: string[]): Promise<WorkflowCheckpointResult<ProjectStateRecord<"ImplementationRecord">>> {
  const { selected, store } = open(root, projectId);
  try {
    if (input.outcome !== "implemented" || !input.executionRef) throw Error("Implementation checkpoint requires a completed unique execution.");
    const state = createProjectStateService(store, operator);
    await assertWorkOwner(store, projectId, intakeId, workItemId);
    const binding = await bindingFor(store, projectId, intakeId);
    const attempts = (await state.getImplementationAttempts(projectId, workItemId))
      .filter(record => record.body.executionRef === input.executionRef);
    if (attempts.length > 1 || attempts.length === 1 &&
      (attempts[0].body.workItemId !== workItemId || Object.entries(input).some(([key, value]) =>
        JSON.stringify((attempts[0].body as unknown as Record<string, unknown>)[key]) !== JSON.stringify(value))))
      throw Error("Implementation execution identity conflicts with saved evidence.");
    const saved = attempts[0] ?? await state.recordImplementation(projectId, workItemId, input);
    if (saved.entityType !== "ImplementationRecord") throw Error("Implementation record type changed.");
    const checkpoint = await createImplementationCheckpoint(selected, projectId, {
      boundaryId, workIntakeId: intakeId, targetEntityId: saved.id,
      sourceLineId: binding.body.workSourceLineId!, expectedRevisionId: await priorRevision(store, projectId, boundaryId, binding),
      attributablePaths,
    });
    return { record: saved, checkpoint };
  } finally { store.close(); }
}

/** Existing human review Decisions produce chronology; routine Validator results use their own state. */
export async function recordStructuredWorkDisposition(root: string, projectId: string, intakeId: string, workItemId: string,
  input: DecisionInput, boundaryId: string): Promise<WorkflowCheckpointResult<ProjectStateRecord<"Decision">>> {
  const { selected, store } = open(root, projectId);
  try {
    const state = createProjectStateService(store, operator);
    await assertWorkOwner(store, projectId, intakeId, workItemId);
    const binding = await bindingFor(store, projectId, intakeId);
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
      boundaryId, workIntakeId: intakeId, targetEntityId: workItemId,
      sourceLineId: binding.body.workSourceLineId!, expectedRevisionId: await priorRevision(store, projectId, boundaryId, binding),
      dispositionId: saved.id, attributablePaths: [],
    });
    return { record: saved, checkpoint };
  } finally { store.close(); }
}
