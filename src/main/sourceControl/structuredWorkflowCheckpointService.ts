import fs from "node:fs";
import path from "node:path";
import type { EntityBodyMap, ProjectStateRecord, WorkRoute } from "../../shared/projectState/domainContracts";
import { workflowTypeForWorkRoute } from "../../shared/projectState/workflowTypeRegistry";
import { createProjectStateService, type DecisionInput } from "../../shared/projectState/projectStateService";
import type { CheckpointResult } from "../../shared/sourceLifecycleContracts";
import { createSQLiteProjectStateStore } from "../projectState/sqliteProjectStateStore";
import { selectedCurrentProjectId } from "../projectState/currentProjectRegistrationService";
import { createDispositionCheckpoint, createImplementationCheckpoint, createTesterCheckpoint, recoverLegacyImplementationCheckpoint } from "./semanticCheckpointService";
import { boundedSourcePaths, reconcileWorkflowSource, sourcePathsInScope } from "./workflowSourceReconciliation";
import { resolveManagedWorkflowCheckoutPath } from "./projectSourceTopology";
import { runBoundedGit } from "../core/gitExecution";
import { createSourceControlService } from "./sourceControlService";

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
async function bindingForWorkflow(store: Store, projectId: string, workflowId: string, legacyInspection = false): Promise<Binding> {
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
  const recoveryBlocked = legacyInspection && bindings.length === 1 && bindings[0].body.preparationState === "blocked" &&
    bindings[0].body.failureCode === "REPOSITORY_CHECKOUT_MATERIALIZATION_FAILED";
  if (bindings.length !== 1 || bindings[0].body.preparationState !== "ready" && !recoveryBlocked ||
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

/** A pending TesterResult is checkpointed only from its exact Implementer revision and stored test path set. */
export async function checkpointStructuredTesterResult(root: string, projectId: string, testerResultId: string): Promise<WorkflowCheckpointResult<ProjectStateRecord<"TesterResult">>> {
  const { selected, store } = open(root, projectId);
  try {
    const result = await store.getEntity(projectId, testerResultId);
    if (result?.entityType !== "TesterResult" || result.body.sourceMode !== "source-backed" || result.body.checkpointState !== "pending" || result.body.candidateRevisionId || result.body.sourceCheckpointId || !result.body.implementerRevisionId || !result.body.permanentTestPaths.length)
      throw Error("A pending TesterResult with changed permanent test paths is required.");
    await assertWorkOwner(store, projectId, result.body.workflowId, result.body.workItemId);
    const binding = await bindingForWorkflow(store, projectId, result.body.workflowId);
    if (binding.body.currentRevisionId !== result.body.implementerRevisionId) throw Error("TesterResult Implementer revision is no longer current.");
    const checkpoint = await createTesterCheckpoint(selected, projectId, {
      boundaryId: `tester-result:${testerResultId}`, workflowId: result.body.workflowId, targetEntityId: result.id,
      sourceLineId: binding.body.workSourceLineId!, expectedRevisionId: result.body.implementerRevisionId,
      repositoryCheckoutId: binding.body.repositoryCheckoutId!, attributablePaths: result.body.permanentTestPaths,
    });
    if (checkpoint.state !== "committed") throw Error(checkpoint.message);
    const current = await store.getEntity(projectId, testerResultId);
    if (current?.entityType !== "TesterResult" || current.body.checkpointState !== "committed" || current.body.sourceCheckpointId !== checkpoint.checkpointId)
      throw Error("TesterResult checkpoint completion could not be verified.");
    return { record: current, checkpoint };
  } finally { store.close(); }
}

/** Prove materialization from saved versions and their transactional audit/outbox order. */
async function assertLegacyBindingHistory(store: Store, projectId: string, binding: Binding,
  attempt: ProjectStateRecord<"ImplementationAttempt">) {
  const reservations = attempt.body.layout.sources.filter(source => source.entityId === binding.id);
  const previous = reservations.length === 1 ? await store.getEntityVersion(projectId, binding.id, reservations[0].recordVersion) : null;
  if (previous?.entityType !== "SourceBinding" || previous.lifecycleState !== "active" ||
    previous.body.workflowId !== binding.body.workflowId || previous.body.sourceBaselineId !== binding.body.sourceBaselineId ||
    !["unprepared", "ready"].includes(previous.body.preparationState))
    throw Error("Inspection required: exact reserved SourceBinding identity is unavailable.");
  const baselineReservation = attempt.body.layout.sources.find(source => source.entityId === previous.body.sourceBaselineId);
  const baseline = baselineReservation ? await store.getEntityVersion(projectId, previous.body.sourceBaselineId, baselineReservation.recordVersion) : null;
  if (baseline?.entityType !== "SourceBaseline" || baseline.lifecycleState !== "active" ||
    previous.body.preparationState === "unprepared" && (baseline.body.baseRevisionId !== attempt.body.sourceRevisionId ||
      previous.body.currentRevisionId || previous.body.repositoryCheckoutId || previous.body.workSourceLineId))
    throw Error("Inspection required: reserved SourceBaseline/revision or unprepared binding identity changed.");

  const changes = (await store.listStateChanges(projectId)).filter(change => [binding.id, attempt.id].includes(change.entityId) &&
    ["create", "revise"].includes(change.operation));
  const events = new Map((await store.listOutbox(projectId)).map(event => [event.id, event]));
  const sequenceFor = (change: typeof changes[number]) => {
    const event = events.get(change.id);
    if (!event || event.entityId !== change.entityId || event.payload.changeId !== change.id ||
      event.payload.operation !== change.operation || event.payload.fromRecordVersion !== change.fromRecordVersion ||
      event.payload.toRecordVersion !== change.toRecordVersion)
      throw Error("Inspection required: binding/attempt state-change chronology is unavailable.");
    return event.sequence;
  };
  let runningSequence: number | undefined;
  for (const change of changes.filter(change => change.entityId === attempt.id)) {
    const version = await store.getEntityVersion(projectId, attempt.id, change.toRecordVersion);
    if (version?.entityType !== "ImplementationAttempt") throw Error("Inspection required: saved attempt history is unavailable.");
    if (version.body.attemptState !== "running") continue;
    const before = change.fromRecordVersion === null ? null : await store.getEntityVersion(projectId, attempt.id, change.fromRecordVersion);
    if (runningSequence !== undefined || before?.entityType !== "ImplementationAttempt" || before.body.attemptState !== "prepared")
      throw Error("Inspection required: successful attempt running transition is ambiguous.");
    runningSequence = sequenceFor(change);
  }
  if (runningSequence === undefined) throw Error("Inspection required: successful attempt running transition is missing.");
  let readyBeforeRun = false;
  const historicalRevisions = new Set<string>();
  for (let version = previous.recordVersion; version <= binding.recordVersion; version++) {
    const saved = await store.getEntityVersion(projectId, binding.id, version);
    const audit = changes.filter(change => change.entityId === binding.id && change.toRecordVersion === version);
    if (saved?.entityType !== "SourceBinding" || saved.lifecycleState !== "active" || audit.length !== 1)
      throw Error("Inspection required: saved SourceBinding version history is unavailable.");
    const beforeRun = sequenceFor(audit[0]) < runningSequence;
    if (saved.body.currentRevisionId) historicalRevisions.add(saved.body.currentRevisionId);
    if (saved.body.sourceBaselineId !== previous.body.sourceBaselineId || saved.body.workflowId !== previous.body.workflowId ||
      saved.body.repositoryCheckoutId && saved.body.repositoryCheckoutId !== binding.body.repositoryCheckoutId ||
      saved.body.workSourceLineId && saved.body.workSourceLineId !== binding.body.workSourceLineId ||
      beforeRun && saved.body.currentRevisionId && saved.body.currentRevisionId !== attempt.body.sourceRevisionId)
      throw Error("Inspection required: historical SourceBinding baseline/checkout/source revision changed.");
    if (beforeRun && saved.body.preparationState === "ready" && saved.body.currentRevisionId === attempt.body.sourceRevisionId &&
      saved.body.repositoryCheckoutId === binding.body.repositoryCheckoutId && saved.body.workSourceLineId === binding.body.workSourceLineId)
      readyBeforeRun = true;
  }
  if (!readyBeforeRun) throw Error("Inspection required: exact SourceBinding never became ready before the successful attempt ran.");
  return [...historicalRevisions];
}

/** Read-only legacy proof. No packet or immutable implementation is rewritten. */
export async function inspectLegacyImplementationCheckpoint(root: string, projectId: string, workflowId: string,
  workItemId: string, implementationRecordId: string) {
  const { selected, store } = open(root, projectId);
  try {
    await assertWorkOwner(store, projectId, workflowId, workItemId);
    const state = createProjectStateService(store, operator);
    const item = await store.getEntity(projectId, workItemId);
    const implementation = await store.getEntity(projectId, implementationRecordId);
    if (item?.entityType !== "WorkItem" || item.lifecycleState !== "active" || item.body.workState !== "validation_pending" ||
      implementation?.entityType !== "ImplementationRecord" || implementation.body.workItemId !== workItemId ||
      implementation.body.outcome !== "implemented" || implementation.body.blockers.length || !implementation.body.executionRef ||
      !item.body.affectedPaths?.length || (await state.getWorkItemPlanningReview(projectId, workItemId)).disposition.state !== "approved")
      throw Error("Inspection required: exact approved successful mutation-required implementation is unavailable.");
    const approved = boundedSourcePaths(item.body.affectedPaths);
    const attempt = await state.getImplementationAttempt(projectId, workflowId, workItemId);
    if (attempt?.id !== implementation.body.executionRef || attempt.lifecycleState !== "active" || attempt.body.attemptState !== "completed" ||
      attempt.body.implementationRecordId !== implementation.id || attempt.body.sourceMode !== "source-backed" || !attempt.body.sourceRevisionId ||
      (await state.getImplementationAttempts(projectId, workItemId)).at(-1)?.id !== implementation.id)
      throw Error("Inspection required: completed implementation/attempt ownership is ambiguous or stale.");
    const reserved = await store.getEntityVersion(projectId, workItemId, attempt.body.workItemVersion);
    if (reserved?.entityType !== "WorkItem" || ["objective", "implementationBoundaries", "affectedPaths", "proofIntent", "contractRevision"].some(key =>
      JSON.stringify((reserved.body as unknown as Record<string, unknown>)[key]) !== JSON.stringify((item.body as unknown as Record<string, unknown>)[key])))
      throw Error("Inspection required: approved implementation contract changed.");
    for (const source of attempt.body.layout.sources) {
      const previous = await store.getEntityVersion(projectId, source.entityId, source.recordVersion);
      const current = await store.getEntity(projectId, source.entityId);
      if (!previous || !current || previous.entityType !== current.entityType ||
        !["Workflow", "Phase", "WorkItem", "SourceBinding"].includes(current.entityType) && previous.recordVersion !== current.recordVersion ||
        previous.entityType === "SourceBinding" && current.entityType === "SourceBinding" &&
        (previous.body.sourceBaselineId !== current.body.sourceBaselineId || previous.body.repositoryCheckoutId && previous.body.repositoryCheckoutId !== current.body.repositoryCheckoutId || previous.body.workSourceLineId && previous.body.workSourceLineId !== current.body.workSourceLineId))
        throw Error("Inspection required: reserved planning/source evidence changed.");
    }
    const binding = await bindingForWorkflow(store, projectId, workflowId, true);
    const historicalRevisions = await assertLegacyBindingHistory(store, projectId, binding, attempt);
    const checkpoints = await store.listEntities(projectId, "SourceCheckpoint");
    const checkpointLinks = (await store.listRelationships(projectId, "checkpoints")).filter(edge => !edge.endedAt);
    const owned = checkpoints.filter((record): record is Checkpoint => record.entityType === "SourceCheckpoint" &&
      (record.body.boundaryId === attempt.id || checkpointLinks.some(edge => edge.fromEntityId === record.id && edge.toEntityId === implementation.id)));
    if (owned.length > 1 || owned.some(record => record.lifecycleState !== "active" ||
      record.body.boundaryId !== attempt.id || record.body.workflowId !== workflowId || record.body.checkpointKind !== "implementation" ||
      record.body.sourceLineId !== binding.body.workSourceLineId || record.body.expectedRevisionId !== attempt.body.sourceRevisionId ||
      checkpointLinks.filter(edge => edge.fromEntityId === record.id).length !== 3 ||
      checkpointLinks.some(edge => edge.fromEntityId === record.id && ![binding.id, workflowId, implementation.id].includes(edge.toEntityId)) ||
      !checkpointLinks.some(edge => edge.fromEntityId === record.id && edge.toEntityId === implementation.id)) ||
      checkpoints.some(record => record.entityType === "SourceCheckpoint" && record.body.sourceLineId === binding.body.workSourceLineId &&
        record.body.checkpointState !== "committed" && !owned.some(current => current.id === record.id)))
      throw Error("Inspection required: another checkpoint already owns this source boundary.");
    const packetPath = path.join(selected, ".champcity", "runtime", "work-item-attempts", `${attempt.id}.json`);
    const stat = fs.lstatSync(packetPath);
    if (!stat.isFile() || stat.isSymbolicLink() || fs.realpathSync(packetPath) !== packetPath || stat.size > 48 * 1024) throw Error("Inspection required: legacy packet is unavailable, redirected or oversized.");
    const packet = JSON.parse(fs.readFileSync(packetPath, "utf8"));
    if (packet.schemaVersion !== 1 || packet.projectId !== projectId || packet.workflowId !== workflowId || packet.workItemId !== workItemId || packet.executionRef !== attempt.id ||
      typeof packet.contractDigest !== "string" || !/^[a-f0-9]{64}$/i.test(packet.contractDigest) ||
      ["summary", "deviations", "blockers", "residualRisks", "outcome"].some(key => JSON.stringify(packet.result?.[key]) !== JSON.stringify((implementation.body as unknown as Record<string, unknown>)[key])) ||
      packet.sourceCheckpointAttempt?.attributablePaths?.length)
      throw Error("Inspection required: legacy packet does not match the exact successful attempt.");
    // Runtime work-item-contract and SQL work-item-reservation use different serializers.
    // The historical execution context is not captured completely by the reservation layout
    // (for example dependency state and materialized Phase versions). Do not reconstruct it
    // from today's projections. This digest is shape-checked, non-authorizing metadata;
    // immutable SQL results, approval, historical source identity and Git ownership prove recovery.
    const baseline = await store.getEntity(projectId, binding.body.sourceBaselineId);
    if (baseline?.entityType !== "SourceBaseline") throw Error("Inspection required: immutable source anchor is missing.");
    const identity = { repositoryCheckoutId: binding.body.repositoryCheckoutId!, sourceLineId: binding.body.workSourceLineId!, expectedRevisionId: attempt.body.sourceRevisionId };
    const checkoutRoot = resolveManagedWorkflowCheckoutPath(selected, baseline.body.workflowId).checkoutRoot;
    const head = (await runBoundedGit({ cwd: checkoutRoot, args: ["rev-parse", "HEAD"] })).stdout.trim();
    // Any revision after Run must be the reservation or this exact HEAD, whose saved
    // checkpoint receipt/commit is independently verified below before admitting an advance.
    if (historicalRevisions.some(revision => revision !== identity.expectedRevisionId && revision !== head))
      throw Error("Inspection required: historical SourceBinding source revision changed outside this checkpoint boundary.");
    let paths: string[];
    if (head === identity.expectedRevisionId) {
      if (binding.body.currentRevisionId !== head || owned[0]?.body.checkpointState === "committed")
        throw Error("Inspection required: reserved source revision is stale.");
      paths = await reconcileWorkflowSource(selected, baseline.body.workflowId, identity);
    } else {
      // Clean interrupted finalization needs exact SQL boundary and Git receipt evidence.
      const saved = owned[0];
      if (!saved?.body.receiptDigest || ![identity.expectedRevisionId, head].includes(binding.body.currentRevisionId!) ||
        saved.body.checkpointState === "committed" && saved.body.resultingRevisionId !== head)
        throw Error("Inspection required: reserved source revision is stale.");
      const dirty = await reconcileWorkflowSource(selected, baseline.body.workflowId, { ...identity, expectedRevisionId: head });
      const commit = await createSourceControlService({ repositoryId: baseline.body.repositoryId, repositoryRoot: checkoutRoot }).inspectCommit({ ref: head });
      if (dirty.length || !commit.ok || commit.result.parents.length !== 1 || commit.result.parents[0] !== identity.expectedRevisionId ||
        commit.result.message.trim() !== `ChampCity implementation checkpoint ${saved.body.receiptDigest}\n\nCheckpoint-Receipt: ${saved.body.receiptDigest}\nCheckpoint-Kind: implementation`)
        throw Error("Inspection required: interrupted checkpoint Git evidence does not match the saved boundary.");
      paths = boundedSourcePaths(commit.result.changedFiles.map(file => file.path));
    }
    if (!paths.length || !sourcePathsInScope(paths, approved)) throw Error("Inspection required: dirty source paths are empty or outside the approved scope.");
    const sequence = new Map((await store.listOutbox(projectId)).filter(event => event.entityId && event.payload.operation === "create")
      .map(event => [event.entityId!, event.sequence]));
    for (const other of await store.listEntities(projectId, "ImplementationAttempt")) {
      if (other.entityType !== "ImplementationAttempt" || other.id === attempt.id || other.lifecycleState !== "active" ||
        other.body.sourceMode !== "source-backed" || other.body.sourceRevisionId !== attempt.body.sourceRevisionId ||
        !other.body.layout.sources.some(source => source.entityId === binding.id) || !["running", "completed"].includes(other.body.attemptState)) continue;
      const record = other.body.implementationRecordId ? await store.getEntity(projectId, other.body.implementationRecordId) : null;
      if (other.body.attemptState === "running") throw Error("Inspection required: another reserved implementation owns this source.");
      if (record?.entityType !== "ImplementationRecord" || record.body.outcome !== "implemented" ||
        (sequence.get(record.id) ?? Infinity) <= (sequence.get(implementation.id) ?? -1)) continue;
      const contract = await store.getEntityVersion(projectId, other.body.workItemId, other.body.workItemVersion);
      if (contract?.entityType !== "WorkItem" || !Array.isArray(contract.body.affectedPaths) ||
        paths.some(file => sourcePathsInScope([file], boundedSourcePaths(contract.body.affectedPaths!))))
        throw Error("Inspection required: newer implementation ownership overlaps this source boundary.");
    }
    return { ...identity, attributablePaths: paths, checkoutRoot, bindingId: binding.id, bindingVersion: binding.recordVersion };
  } finally { store.close(); }
}

/** Retry the one durable source-backed implementation attempt; never accepts renderer paths. */
export async function retryStructuredImplementationCheckpoint(root: string, projectId: string, workflowId: string,
  workItemId: string, implementationRecordId: string): Promise<WorkflowCheckpointResult<ProjectStateRecord<"ImplementationRecord">>> {
  const { selected, store } = open(root, projectId);
  try {
    await assertWorkOwner(store, projectId, workflowId, workItemId);
    const implementation = await store.getEntity(projectId, implementationRecordId);
    const workItem = await store.getEntity(projectId, workItemId);
    if (implementation?.entityType !== "ImplementationRecord" || implementation.body.workItemId !== workItemId ||
      implementation.body.outcome !== "implemented" || !implementation.body.executionRef || workItem?.entityType !== "WorkItem" ||
      workItem.body.workState !== "validation_pending") throw Error("Exact successful implementation checkpoint recovery is unavailable.");
    const attempts = (await createProjectStateService(store, operator).getImplementationAttempts(projectId, workItemId));
    if (attempts.at(-1)?.id !== implementation.id) throw Error("Only the latest successful implementation attempt may be recovered.");
    const packetPath = path.join(selected, ".champcity", "runtime", "work-item-attempts", `${implementation.body.executionRef}.json`);
    const stat = fs.statSync(packetPath);
    if (!stat.isFile() || stat.size > 1_000_000) throw Error("Durable implementation checkpoint attribution packet is missing or oversized.");
    const packet = JSON.parse(fs.readFileSync(packetPath, "utf8")) as Record<string, unknown>;
    let attribution = packet.sourceCheckpointAttempt as Record<string, unknown> | undefined;
    if (!attribution || attribution.attributablePaths === undefined || Array.isArray(attribution.attributablePaths) && attribution.attributablePaths.length === 0) {
      const checkpoint = await recoverLegacyImplementationCheckpoint(selected, projectId, workflowId, workItemId, implementationRecordId);
      return { record: implementation, checkpoint };
    }
    if (!attribution || packet.projectId !== projectId || packet.workflowId !== workflowId || packet.workItemId !== workItemId ||
      packet.executionRef !== implementation.body.executionRef || !Array.isArray(attribution.attributablePaths) ||
      attribution.attributablePaths.length < 1 || attribution.attributablePaths.length > 256 ||
      !attribution.attributablePaths.every(item => typeof item === "string" && item.length <= 512 && !path.isAbsolute(item) &&
        !item.split(/[\\/]/).includes("..") && /^[A-Za-z0-9_.@+-]+(?:[\\/][A-Za-z0-9_.@+-]+)*$/.test(item)) ||
      new Set(attribution?.attributablePaths as string[]).size !== attribution?.attributablePaths?.length ||
      typeof attribution.repositoryCheckoutId !== "string" || typeof attribution.sourceLineId !== "string" ||
      typeof attribution.expectedRevisionId !== "string" || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(attribution.expectedRevisionId as string))
      throw Error("Durable implementation checkpoint attribution is invalid or does not match the exact attempt.");
    const binding = await bindingForWorkflow(store, projectId, workflowId);
    if (binding.body.repositoryCheckoutId !== attribution.repositoryCheckoutId || binding.body.workSourceLineId !== attribution.sourceLineId)
      throw Error("Exact SourceBinding no longer matches the saved implementation checkpoint boundary.");
    const checkpoint = await createImplementationCheckpoint(selected, projectId, {
      boundaryId: implementation.body.executionRef, workflowId, targetEntityId: implementation.id,
      sourceLineId: attribution.sourceLineId as string, expectedRevisionId: attribution.expectedRevisionId as string,
      repositoryCheckoutId: attribution.repositoryCheckoutId as string, attributablePaths: [...attribution.attributablePaths as string[]].sort(),
    });
    return { record: implementation, checkpoint };
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
