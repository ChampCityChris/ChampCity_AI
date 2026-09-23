import type { DispositionState, EntityBodyMap, EntityId, EntityType, LifecycleState, PrincipalRef, ProjectId, ProjectStateEntity, ProjectStateRecord, TestLifecycleAssessmentStatus, ValidationMode, WorkflowState, WorkIntakeState, WorkRoute } from "./domainContracts";
import { assertSupersession } from "./domainInvariants";
import { createProjectStateEntity, ENTITY_TYPE_REGISTRY, ProjectStateDomainError, validateProjectStateEntity } from "./entityTypeRegistry";
import { createRelationship as createDomainRelationship, type ProjectStateRelationship, type RelationshipType } from "./relationshipRegistry";
import type { ProjectStateStore, ProjectStateUnitOfWork, StateChange } from "./projectStateStore";

export interface RecordQuery { entityType?: EntityType; lifecycleState?: LifecycleState; limit?: number }
export interface ProjectStateSummary { projectId: ProjectId; totalRecords: number; activeRecords: number; countsByType: Partial<Record<EntityType, number>> }
export interface RecordHistory { lineageId: string; records: ProjectStateEntity[] }
export interface RecordLineage { records: ProjectStateEntity[]; relationships: ProjectStateRelationship[] }
export interface MutationContext { reason?: string; causationId?: string; correlationId?: string }
export interface DecisionInput { decisionType: string; outcome: string; decisionScope: string; rationale?: string; effectiveAt?: string }
export interface EffectiveDisposition { state: DispositionState; decisionId: EntityId | null; effectiveAt: string | null }
export interface RequiredOperatorDecision { criterionId: EntityId; targetId: EntityId; currentDisposition: DispositionState }
export type ValidationStaleReason = "target-version-changed" | "target-superseded" | "source-baseline-changed";
export interface ValidationFreshness { validationId: EntityId; targetEntityId: EntityId; targetRecordVersion: number; current: boolean; staleReason: ValidationStaleReason | null }
export interface CriterionValidationStatus { criterionId: EntityId; policy: EntityBodyMap["Criterion"]["validationPolicy"]; satisfied: boolean; validationId: EntityId | null; reason: "current-pass" | "no-current-validation" | "latest-validation-not-pass" | "deferred-to-phase" | "operator-decision-required" }
export interface CompletionEligibility { entityId: EntityId; eligible: boolean; blockers: string[] }
export interface ExecutionPlanView { phases: { phaseId: EntityId; sequence: number; workItemIds: EntityId[]; criterionIds: EntityId[] }[]; directWorkItemIds: EntityId[]; dependencyIds: { from: EntityId; to: EntityId }[]; repairIds: { from: EntityId; to: EntityId }[] }
export interface CurrentWorkRoute { route: WorkRoute; decisionId: EntityId; assessmentId: EntityId | null; effectiveAt: string }
export interface WorkIntakeSummary { intakeId: EntityId; request: string; desiredOutcome: string; constraints: string[]; evidenceContext: string[]; intakeState: WorkIntakeState; requestedIntegrationTarget: string; workflowId: EntityId; currentRoute: CurrentWorkRoute | null; assessmentIds: EntityId[]; routeDecisionIds: EntityId[] }
export interface WorkRouteHistory { assessments: ProjectStateRecord<"RouteAssessment">[]; decisions: ProjectStateRecord<"Decision">[]; relationships: ProjectStateRelationship[] }
export interface SourceSemanticView { repositoryId: string; bindings: ProjectStateRecord<"SourceBinding">[]; checkpoints: ProjectStateRecord<"SourceCheckpoint">[]; integrations: ProjectStateRecord<"IntegrationRecord">[]; relationships: ProjectStateRelationship[] }
export interface RegressionObligationView { obligation: ProjectStateRecord<"RegressionObligation">; assessments: ProjectStateRecord<"Validation">[]; permanentReferences: ProjectStateRecord<"ProjectResource">[]; implementationProof: ProjectStateRecord<"Evidence">[]; relationships: ProjectStateRelationship[] }
export const PROJECT_STATE_EVENT_TYPES = Object.freeze({
  create: "project-state.record-created",
  revise: "project-state.record-revised",
  supersede: "project-state.record-superseded",
  relationshipCreate: "project-state.relationship-created",
  relationshipEnd: "project-state.relationship-ended",
});

const restrictedGenericTypes = new Set<EntityType>(["Decision", "Validation", "Evidence"]);
function fail(message: string): never { throw new ProjectStateDomainError(message); }
const dispositionOutcomes = new Set<DispositionState>(["advisory", "proposed", "approved", "revision_requested", "accepted", "rejected", "revoked"]);
const workRoutes = new Set<WorkRoute>(["greenfield", "feature-change", "refactor-migration", "integration-composition", "infrastructure-platform", "research-prototype", "issue-resolution"]);
const lifecycleAssessmentStatuses = new Set<TestLifecycleAssessmentStatus>(["PRESERVE", "REWRITE_CANDIDATE", "SPLIT_CANDIDATE", "CONSOLIDATE_CANDIDATE", "MIGRATE_CANDIDATE", "RETIRE_CANDIDATE", "QUARANTINE_CANDIDATE", "NEEDS_TESTER_REVIEW"]);
function validateTestPath(path: string) {
  if (typeof path !== "string" || path.length > 512 || !/^test\/(?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]+\.test\.cjs$/.test(path) || path.split("/").includes("..")) fail("Permanent test locator must be a repository-relative test path.");
}
function canonicalInstant(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}
function decisionBody(input: DecisionInput, principal: PrincipalRef, decidedAt: string, defaultEffectiveAt = decidedAt): EntityBodyMap["Decision"] {
  const content = exactInput(input, ["decisionType", "outcome", "rationale", "decisionScope", "effectiveAt"]);
  if (content.rationale !== undefined && typeof content.rationale !== "string") fail("Decision rationale must be text.");
  if (content.effectiveAt !== undefined && (typeof content.effectiveAt !== "string" || !canonicalInstant(content.effectiveAt))) fail("Decision effective time must be canonical UTC.");
  return { decisionType: input.decisionType, outcome: input.outcome, decisionScope: input.decisionScope,
    rationale: input.rationale ?? "", decisionRole: principal.role, decidedBy: principal,
    decidedAt, effectiveAt: input.effectiveAt ?? defaultEffectiveAt };
}
function assertSourceBindingBody(body: EntityBodyMap["SourceBinding"]) {
  if (body.currentRevisionId && !body.workSourceLineId) fail("Current revision requires a work SourceLine.");
  if (body.preparationState === "ready" && (!body.baseRevisionId || !body.workSourceLineId || !body.currentRevisionId || body.failureCode)) fail("Ready SourceBinding requires base, work line and current revision without failure.");
  if (body.preparationState === "blocked" && !body.failureCode) fail("Blocked SourceBinding requires a failure code.");
}
function assertSourceCheckpointBody(body: EntityBodyMap["SourceCheckpoint"]) {
  if (body.checkpointState === "committed" && !body.resultingRevisionId) fail("Committed checkpoint requires a resulting revision.");
  if (body.checkpointState !== "committed" && body.resultingRevisionId) fail("Only committed checkpoint can carry a resulting revision.");
}
function assertIntegrationBody(body: EntityBodyMap["IntegrationRecord"]) {
  if (body.outcome === "integrated" && (!body.resultRevisionId || body.integrationState !== "integrated" || body.targetAfterRevisionId !== body.resultRevisionId)) fail("Integrated record requires matching target and result revisions.");
  if (body.integrationState === "integrated" && body.outcome !== "integrated") fail("Integrated state requires integrated outcome.");
  if (body.outcome === "pending" && ["integrated", "blocked", "failed"].includes(body.integrationState)) fail("Terminal integration state requires a terminal outcome.");
}
function exactInput(value: unknown, allowed: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) fail("A bounded semantic input is required.");
  const input = value as Record<string, unknown>;
  for (const field of Object.keys(input)) if (!allowed.includes(field)) fail(`Unsupported semantic input field: ${field}.`);
  return input;
}
function checkedContext(context: MutationContext | undefined, defaultReason: string): Required<Pick<MutationContext, "reason">> & MutationContext {
  if (context === undefined) return { reason: defaultReason };
  const input = exactInput(context, ["reason", "causationId", "correlationId"]);
  for (const field of ["reason", "causationId", "correlationId"] as const) {
    const value = input[field];
    if (value !== undefined && (typeof value !== "string" || value.length < 1 || value.length > 4096 || /[\u0000-\u001f]/.test(value))) fail(`Invalid mutation ${field}.`);
  }
  return { ...context, reason: context.reason ?? defaultReason };
}
async function requiredRecord(unit: Pick<ProjectStateUnitOfWork, "getEntity">, projectId: ProjectId, entityId: EntityId): Promise<ProjectStateEntity> {
  const record = await unit.getEntity(projectId, entityId);
  if (!record) fail("Project State record does not exist in this Project.");
  return record;
}

/** Construct only in the trusted Product Core; callers cannot supply attribution per command. */
export function createProjectStateService(store: ProjectStateStore, principal: PrincipalRef) {
  const trustedPrincipal = structuredClone(principal);
  exactInput(trustedPrincipal, ["principalId", "principalType", "role"]);
  if (!trustedPrincipal.principalId || !trustedPrincipal.role || !["human", "agent", "system", "tool"].includes(trustedPrincipal.principalType)) fail("A trusted PrincipalRef is required.");

  async function recordMutation(unit: ProjectStateUnitOfWork, input: {
    projectId: ProjectId; entityId: EntityId; fromVersion: number | null; toVersion: number;
    operation: StateChange["operation"]; eventType: string; occurredAt: string; changedFields: string[];
    defaultReason: string; context?: MutationContext; relationshipId?: string;
  }) {
    const context = checkedContext(input.context, input.defaultReason);
    const id = globalThis.crypto.randomUUID();
    await unit.appendStateChange({
      id, projectId: input.projectId, entityId: input.entityId, fromRecordVersion: input.fromVersion,
      toRecordVersion: input.toVersion, operation: input.operation, principal: trustedPrincipal,
      occurredAt: input.occurredAt, changedFields: [...input.changedFields].sort(), reason: context.reason,
      ...(context.causationId ? { causationId: context.causationId } : {}),
      ...(context.correlationId ? { correlationId: context.correlationId } : {}),
    });
    await unit.appendOutbox({
      id, projectId: input.projectId, entityId: input.entityId, eventType: input.eventType,
      occurredAt: input.occurredAt,
      payload: { changeId: id, operation: input.operation, fromRecordVersion: input.fromVersion,
        toRecordVersion: input.toVersion, ...(input.relationshipId ? { relationshipId: input.relationshipId } : {}) },
    });
  }

  async function linkSemantic(unit: ProjectStateUnitOfWork, projectId: ProjectId, from: ProjectStateEntity, to: ProjectStateEntity,
    relationshipType: RelationshipType, context?: MutationContext) {
    const edge = createDomainRelationship({ projectId, fromEntityId: from.id, relationshipType,
      toEntityId: to.id, createdBy: trustedPrincipal }, id => id === from.id ? from : id === to.id ? to : undefined);
    await unit.saveRelationship(edge);
    await recordMutation(unit, { projectId, entityId: from.id, fromVersion: from.recordVersion, toVersion: from.recordVersion,
      operation: "relationship-create", eventType: PROJECT_STATE_EVENT_TYPES.relationshipCreate, occurredAt: edge.createdAt,
      changedFields: [`relationship:${relationshipType}`], defaultReason: `Link ${relationshipType}`, context, relationshipId: edge.id });
    return edge;
  }

  async function createRecord<T extends EntityType>(projectId: ProjectId | null, entityType: T, content: EntityBodyMap[T], context?: MutationContext) {
    if (restrictedGenericTypes.has(entityType)) fail("Decision, Validation and Evidence require typed commands.");
    if (entityType === "ImplementationRecord" || entityType === "Workflow") fail("ImplementationRecord and Workflow require typed commands.");
    if (entityType === "WorkIntake" || entityType === "RouteAssessment") fail("Work Intake and Route Assessment require typed commands.");
    if (["SourceBinding", "SourceCheckpoint", "IntegrationRecord"].includes(entityType)) fail("Source semantic records require typed commands.");
    if (entityType === "RegressionObligation" || (entityType === "ProjectResource" && (content as EntityBodyMap["ProjectResource"]).resourceType === "permanent-test-reference")) fail("Tester semantic records require typed commands.");
    if (entityType === "Project" && projectId !== null) fail("A new Project cannot borrow another Project identity.");
    if (entityType !== "Project" && !projectId) fail("Project identity is required.");
    const record = createProjectStateEntity({ entityType, ...(projectId ? { projectId } : {}), body: content, principal: trustedPrincipal });
    await store.transaction(record.projectId, async unit => {
      if (entityType !== "Project" && !await unit.getProject(record.projectId)) fail("Owning Project does not exist.");
      await unit.saveEntity(record as unknown as ProjectStateEntity, null);
      await recordMutation(unit, { projectId: record.projectId, entityId: record.id, fromVersion: null, toVersion: 1,
        operation: "create", eventType: PROJECT_STATE_EVENT_TYPES.create, occurredAt: record.createdAt,
        changedFields: Object.keys(record.body), defaultReason: `Create ${entityType}`, context });
    });
    return record;
  }

  async function createWorkflow(projectId: ProjectId, input: { workflowType: string; workspace: string; governingEntityId: EntityId; workflowState?: WorkflowState }, context?: MutationContext) {
    exactInput(input, ["workflowType", "workspace", "governingEntityId", "workflowState"]);
    return store.transaction(projectId, async unit => {
      if (!await unit.getProject(projectId)) fail("Owning Project does not exist.");
      const governing = await requiredRecord(unit, projectId, input.governingEntityId);
      if (governing.entityType === "WorkIntake") fail("Work Intake creates its own linked Workflow.");
      const record = createProjectStateEntity({ entityType: "Workflow", projectId,
        body: { workflowType: input.workflowType, workspace: input.workspace, governingEntityId: input.governingEntityId,
          workflowState: input.workflowState ?? "active" }, principal: trustedPrincipal });
      await unit.saveEntity(record, null);
      await recordMutation(unit, { projectId, entityId: record.id, fromVersion: null, toVersion: 1,
        operation: "create", eventType: PROJECT_STATE_EVENT_TYPES.create, occurredAt: record.createdAt,
        changedFields: Object.keys(record.body), defaultReason: "Create Workflow", context });
      return record;
    });
  }

  async function createWorkIntake(projectId: ProjectId, input: Omit<EntityBodyMap["WorkIntake"], "intakeState">, context?: MutationContext) {
    exactInput(input, ["request", "desiredOutcome", "constraints", "evidenceContext", "requestedIntegrationTarget"]);
    return store.transaction(projectId, async unit => {
      if (!await unit.getProject(projectId)) fail("Owning Project does not exist.");
      const intake = createProjectStateEntity({ entityType: "WorkIntake", projectId,
        body: { ...input, intakeState: "captured" }, principal: trustedPrincipal });
      await unit.saveEntity(intake, null);
      await recordMutation(unit, { projectId, entityId: intake.id, fromVersion: null, toVersion: 1,
        operation: "create", eventType: PROJECT_STATE_EVENT_TYPES.create, occurredAt: intake.createdAt,
        changedFields: Object.keys(intake.body), defaultReason: "Capture Work Intake", context });
      const workflow = createProjectStateEntity({ entityType: "Workflow", projectId,
        body: { workflowType: "work-intake", workspace: "work-intake", governingEntityId: intake.id,
          workflowState: "active" }, principal: trustedPrincipal });
      await unit.saveEntity(workflow, null);
      await recordMutation(unit, { projectId, entityId: workflow.id, fromVersion: null, toVersion: 1,
        operation: "create", eventType: PROJECT_STATE_EVENT_TYPES.create, occurredAt: workflow.createdAt,
        changedFields: Object.keys(workflow.body), defaultReason: "Start Work Intake Workflow", context });
      const initiates = createDomainRelationship({ projectId, fromEntityId: intake.id, relationshipType: "initiates",
        toEntityId: workflow.id, createdBy: trustedPrincipal }, id => id === intake.id ? intake : id === workflow.id ? workflow : undefined);
      await unit.saveRelationship(initiates);
      await recordMutation(unit, { projectId, entityId: intake.id, fromVersion: 1, toVersion: 1,
        operation: "relationship-create", eventType: PROJECT_STATE_EVENT_TYPES.relationshipCreate, occurredAt: initiates.createdAt,
        changedFields: ["relationship:initiates"], defaultReason: "Link Work Intake Workflow", context, relationshipId: initiates.id });
      return { intake, workflow, initiates };
    });
  }

  async function reviseWorkIntake(projectId: ProjectId, intakeId: EntityId, changes: Partial<Pick<EntityBodyMap["WorkIntake"], "request" | "desiredOutcome" | "constraints" | "evidenceContext" | "requestedIntegrationTarget">>, expectedRevision: number, context?: MutationContext) {
    const patch = exactInput(changes, ["request", "desiredOutcome", "constraints", "evidenceContext", "requestedIntegrationTarget"]);
    if (Object.keys(patch).length === 0) fail("Work Intake revision must change semantic content.");
    return store.transaction(projectId, async unit => {
      const current = await requiredRecord(unit, projectId, intakeId);
      if (current.entityType !== "WorkIntake" || current.recordVersion !== expectedRevision || current.lifecycleState !== "active") fail("Work Intake revision target is unavailable or stale.");
      const now = new Date().toISOString();
      const next = validateProjectStateEntity({ ...current, recordVersion: expectedRevision + 1,
        updatedAt: now, updatedBy: trustedPrincipal, body: { ...current.body, ...patch } });
      await unit.saveEntity(next, expectedRevision);
      await recordMutation(unit, { projectId, entityId: intakeId, fromVersion: expectedRevision, toVersion: next.recordVersion,
        operation: "revise", eventType: PROJECT_STATE_EVENT_TYPES.revise, occurredAt: now,
        changedFields: Object.keys(patch), defaultReason: "Revise Work Intake", context });
      return next;
    });
  }

  async function advanceWorkIntake(projectId: ProjectId, intakeId: EntityId, state: WorkIntakeState, expectedRevision: number, context?: MutationContext) {
    const allowed: Record<WorkIntakeState, readonly WorkIntakeState[]> = {
      captured: ["assessing", "cancelled"], assessing: ["cancelled"],
      routed: ["assessing", "active", "cancelled"], active: ["assessing", "closed", "cancelled"],
      closed: [], cancelled: [],
    };
    return store.transaction(projectId, async unit => {
      const current = await requiredRecord(unit, projectId, intakeId);
      if (current.entityType !== "WorkIntake" || current.recordVersion !== expectedRevision || current.lifecycleState !== "active") fail("Work Intake lifecycle target is unavailable or stale.");
      if (!allowed[current.body.intakeState].includes(state)) fail("Invalid Work Intake lifecycle transition.");
      const now = new Date().toISOString();
      const terminal = state === "closed" || state === "cancelled";
      const next = validateProjectStateEntity({ ...current, recordVersion: expectedRevision + 1,
        lifecycleState: state === "closed" ? "closed" : state === "cancelled" ? "voided" : "active",
        ...(state === "closed" ? { closedAt: now } : {}), updatedAt: now, updatedBy: trustedPrincipal,
        body: { ...current.body, intakeState: state } });
      await unit.saveEntity(next, expectedRevision);
      await recordMutation(unit, { projectId, entityId: intakeId, fromVersion: expectedRevision, toVersion: next.recordVersion,
        operation: "revise", eventType: PROJECT_STATE_EVENT_TYPES.revise, occurredAt: now,
        changedFields: terminal ? ["intakeState", "lifecycleState", ...(state === "closed" ? ["closedAt"] : [])] : ["intakeState"],
        defaultReason: `Advance Work Intake to ${state}`, context });
      if (terminal) {
        const links = (await unit.listRelationships(projectId, "initiates")).filter(edge => edge.fromEntityId === intakeId && !edge.endedAt);
        if (links.length !== 1) fail("Work Intake must initiate exactly one Workflow.");
        const workflow = await requiredRecord(unit, projectId, links[0].toEntityId);
        if (workflow.entityType !== "Workflow" || workflow.lifecycleState !== "active") fail("Active Work Intake Workflow is required.");
        const finished = validateProjectStateEntity({ ...workflow, recordVersion: workflow.recordVersion + 1,
          lifecycleState: state === "closed" ? "closed" : "voided",
          ...(state === "closed" ? { closedAt: now } : {}), updatedAt: now, updatedBy: trustedPrincipal,
          body: { ...workflow.body, workflowState: state } });
        await unit.saveEntity(finished, workflow.recordVersion);
        await recordMutation(unit, { projectId, entityId: workflow.id, fromVersion: workflow.recordVersion,
          toVersion: finished.recordVersion, operation: "revise", eventType: PROJECT_STATE_EVENT_TYPES.revise,
          occurredAt: now, changedFields: ["workflowState", "lifecycleState", ...(state === "closed" ? ["closedAt"] : [])],
          defaultReason: `Finish Work Intake Workflow as ${state}`, context });
      }
      return next;
    });
  }

  async function reviseRecord(projectId: ProjectId, entityId: EntityId, changes: Record<string, unknown>, expectedRevision: number, context?: MutationContext) {
    const patch = exactInput(changes, Object.keys(changes));
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) fail("An exact expected revision is required.");
    return store.transaction(projectId, async unit => {
      const current = await requiredRecord(unit, projectId, entityId);
      if (restrictedGenericTypes.has(current.entityType)) fail("Immutable semantic records require typed correction or supersession.");
      if (current.entityType === "WorkIntake") fail("Work Intake revision requires a typed command.");
      if (current.entityType === "RegressionObligation" || (current.entityType === "ProjectResource" && current.body.resourceType === "permanent-test-reference")) fail("Tester semantic revision requires a typed command.");
      if (["SourceBinding", "SourceCheckpoint", "IntegrationRecord"].includes(current.entityType)) fail("Source semantic revision requires a typed command.");
      if ((current.entityType === "WorkItem" && patch.workState === "closed") || (current.entityType === "Phase" && patch.phaseState === "closed")) fail("Completion requires a typed eligibility command.");
      if (current.recordVersion !== expectedRevision) fail("Expected Project State revision is stale.");
      const next = validateProjectStateEntity({ ...current, recordVersion: current.recordVersion + 1, updatedAt: new Date().toISOString(), updatedBy: trustedPrincipal, body: { ...current.body, ...patch } });
      await unit.saveEntity(next, expectedRevision);
      await recordMutation(unit, { projectId, entityId, fromVersion: expectedRevision, toVersion: next.recordVersion,
        operation: "revise", eventType: PROJECT_STATE_EVENT_TYPES.revise, occurredAt: next.updatedAt,
        changedFields: Object.keys(patch), defaultReason: `Revise ${current.entityType}`, context });
      return next;
    });
  }

  async function supersedeRecord(projectId: ProjectId, entityId: EntityId, replacement: Record<string, unknown>, expectedRevision: number, context?: MutationContext) {
    const content = exactInput(replacement, Object.keys(replacement));
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) fail("An exact expected revision is required.");
    return store.transaction(projectId, async unit => {
      const previous = await requiredRecord(unit, projectId, entityId);
      if (previous.entityType === "Project" || previous.recordVersion !== expectedRevision) fail("Supersession target is unavailable or stale.");
      if (previous.lifecycleState !== "active" && previous.lifecycleState !== "closed") fail("Only a current active or closed record can be superseded.");
      if (restrictedGenericTypes.has(previous.entityType)) fail("Issued Decision, Validation and Evidence require a typed correction policy.");
      if (previous.entityType === "ImplementationRecord") fail("Implementation attempts are immutable; record a new attempt.");
      if (previous.entityType === "WorkIntake" || previous.entityType === "RouteAssessment") fail("Work Intake retains identity and Route Assessments remain historical records.");
      if (["SourceBinding", "SourceCheckpoint", "IntegrationRecord"].includes(previous.entityType)) fail("Source semantic records retain their identity and revision history.");
      if (previous.entityType === "RegressionObligation") {
        if (content.obligationState !== "active") fail("A successor obligation must start active.");
        const sourceId = content.sourceWorkItemId;
        if (sourceId !== undefined && (await requiredRecord(unit, projectId, sourceId as EntityId)).entityType !== "WorkItem") fail("Obligation source must be a Work Item.");
      }
      if (previous.entityType === "ProjectResource" && previous.body.resourceType === "permanent-test-reference") fail("Permanent test references retain immutable catalog identity.");
      const currentFamily = (await unit.listEntities(projectId, previous.entityType)).filter(candidate => candidate.lineageId === previous.lineageId && candidate.lifecycleState !== "superseded");
      if (currentFamily.length !== 1 || currentFamily[0].id !== previous.id) fail("Supersession target is not the unique current record in its lineage.");
      const now = new Date().toISOString();
      const terminal = validateProjectStateEntity({ ...previous, recordVersion: previous.recordVersion + 1, lifecycleState: "superseded", supersededAt: now, updatedAt: now, updatedBy: trustedPrincipal });
      const successor = validateProjectStateEntity({ ...createProjectStateEntity({ entityType: previous.entityType as EntityType, projectId, body: content as EntityBodyMap[EntityType], principal: trustedPrincipal }), lineageId: previous.lineageId });
      assertSupersession(previous, terminal, successor);
      await unit.saveEntity(terminal, expectedRevision, { terminalSupersession: true, evidenceReliedUpon: true });
      await recordMutation(unit, { projectId, entityId, fromVersion: expectedRevision, toVersion: terminal.recordVersion,
        operation: "supersede", eventType: PROJECT_STATE_EVENT_TYPES.supersede, occurredAt: now,
        changedFields: ["lifecycleState", "supersededAt"], defaultReason: `Supersede ${previous.entityType}`, context });
      await unit.saveEntity(successor, null);
      await recordMutation(unit, { projectId, entityId: successor.id, fromVersion: null, toVersion: 1,
        operation: "create", eventType: PROJECT_STATE_EVENT_TYPES.create, occurredAt: successor.createdAt,
        changedFields: Object.keys(successor.body), defaultReason: `Create successor ${successor.entityType}`, context });
      const edge = createDomainRelationship({ projectId, fromEntityId: successor.id, relationshipType: "supersedes", toEntityId: previous.id, createdBy: trustedPrincipal }, id => id === successor.id ? successor : id === previous.id ? terminal : undefined);
      await unit.saveRelationship(edge);
      await recordMutation(unit, { projectId, entityId: successor.id, fromVersion: 1, toVersion: 1,
        operation: "relationship-create", eventType: PROJECT_STATE_EVENT_TYPES.relationshipCreate, occurredAt: edge.createdAt,
        changedFields: ["relationship:supersedes"], defaultReason: "Link supersession", context, relationshipId: edge.id });
      if (successor.entityType === "RegressionObligation" && successor.body.sourceWorkItemId) {
        const source = await requiredRecord(unit, projectId, successor.body.sourceWorkItemId);
        await linkSemantic(unit, projectId, successor, source, "derived_from", context);
      }
      return { predecessor: terminal, successor, relationship: edge };
    });
  }

  async function createRelationship(projectId: ProjectId, fromEntityId: EntityId, relationshipType: RelationshipType, toEntityId: EntityId, context?: MutationContext) {
    if (relationshipType === "governs") fail("Decision governance requires a typed Decision command.");
    if (relationshipType === "implements_work_item") fail("Implementation attempts require a typed command.");
    if (relationshipType === "initiates" || relationshipType === "assesses_route") fail("Work Intake ownership and route assessment require typed commands.");
    if (["binds_source", "checkpoints", "integrates"].includes(relationshipType)) fail("Source semantic relationships require typed commands.");
    if (relationshipType === "proves") fail("Permanent proof links require a typed command.");
    return store.transaction(projectId, async unit => {
      const from = await requiredRecord(unit, projectId, fromEntityId);
      const to = await requiredRecord(unit, projectId, toEntityId);
      const active = (await unit.listRelationships(projectId, relationshipType)).filter(edge => !edge.endedAt);
      if (active.some(edge => edge.fromEntityId === fromEntityId && edge.toEntityId === toEntityId)) fail("Relationship already exists.");
      if (relationshipType === "repairs" && (from.entityType !== "WorkItem" || !["repair", "fix"].includes(from.body.workItemKind))) fail("Only a Repair or Fix Work Item can repair another Work Item.");
      if (relationshipType === "part_of" && active.some(edge => edge.fromEntityId === fromEntityId)) fail("A Work Item already has an active parent.");
      if (["depends_on", "part_of", "repairs"].includes(relationshipType)) {
        const visited = new Set<EntityId>([toEntityId]);
        for (let pass = 0; pass < active.length + 1; pass++) {
          const size = visited.size;
          for (const edge of active) if (visited.has(edge.fromEntityId)) visited.add(edge.toEntityId);
          if (visited.size === size) break;
        }
        if (visited.has(fromEntityId)) fail("Execution relationship would form a cycle.");
      }
      const edge = createDomainRelationship({ projectId, fromEntityId, relationshipType, toEntityId, createdBy: trustedPrincipal }, id => id === fromEntityId ? from : id === toEntityId ? to : undefined);
      await unit.saveRelationship(edge);
      await recordMutation(unit, { projectId, entityId: from.id, fromVersion: from.recordVersion, toVersion: from.recordVersion,
        operation: "relationship-create", eventType: PROJECT_STATE_EVENT_TYPES.relationshipCreate, occurredAt: edge.createdAt,
        changedFields: [`relationship:${relationshipType}`], defaultReason: `Create ${relationshipType} relationship`, context, relationshipId: edge.id });
      return edge;
    });
  }

  async function endRelationship(projectId: ProjectId, relationshipId: string, context?: MutationContext) {
    await store.transaction(projectId, async unit => {
      const edge = (await unit.listRelationships(projectId)).find(candidate => candidate.id === relationshipId);
      if (!edge) fail("Relationship does not exist in this Project.");
      const from = await requiredRecord(unit, projectId, edge.fromEntityId);
      const endedAt = new Date().toISOString();
      await unit.endRelationship(relationshipId, endedAt);
      await recordMutation(unit, { projectId, entityId: from.id, fromVersion: from.recordVersion, toVersion: from.recordVersion,
        operation: "relationship-end", eventType: PROJECT_STATE_EVENT_TYPES.relationshipEnd, occurredAt: endedAt,
        changedFields: [`relationship:${edge.relationshipType}`], defaultReason: `End ${edge.relationshipType} relationship`, context, relationshipId });
    });
  }

  async function recordLinked(projectId: ProjectId, targetId: EntityId, entityType: "Decision" | "Validation" | "Evidence" | "ImplementationRecord", body: Record<string, unknown> | ((target: ProjectStateEntity) => Record<string, unknown>), relationshipType: "governs" | "evaluates" | "supports" | "implements_work_item", context?: MutationContext) {
    return store.transaction(projectId, async unit => {
      const target = await requiredRecord(unit, projectId, targetId);
      const resolvedBody = typeof body === "function" ? body(target) : body;
      const record = createProjectStateEntity({ entityType, projectId, body: resolvedBody as EntityBodyMap[typeof entityType], principal: trustedPrincipal });
      await unit.saveEntity(record as unknown as ProjectStateEntity, null);
      await recordMutation(unit, { projectId, entityId: record.id, fromVersion: null, toVersion: 1,
        operation: "create", eventType: PROJECT_STATE_EVENT_TYPES.create, occurredAt: record.createdAt,
        changedFields: Object.keys(record.body), defaultReason: `Record ${entityType}`, context });
      const fromEntityId = record.id;
      const edge = createDomainRelationship({ projectId, fromEntityId, relationshipType, toEntityId: target.id, createdBy: trustedPrincipal }, id => id === record.id ? record as unknown as ProjectStateEntity : id === target.id ? target : undefined);
      await unit.saveRelationship(edge);
      await recordMutation(unit, { projectId, entityId: record.id, fromVersion: 1, toVersion: 1,
        operation: "relationship-create", eventType: PROJECT_STATE_EVENT_TYPES.relationshipCreate, occurredAt: edge.createdAt,
        changedFields: [`relationship:${relationshipType}`], defaultReason: `Link ${entityType}`, context, relationshipId: edge.id });
      return record;
    });
  }

  async function recordDecision(projectId: ProjectId, targetId: EntityId, input: DecisionInput, context?: MutationContext) {
    const now = new Date().toISOString();
    return recordLinked(projectId, targetId, "Decision", decisionBody(input, trustedPrincipal, now), "governs", context);
  }

  async function supersedeDecision(projectId: ProjectId, decisionId: EntityId, input: DecisionInput, expectedRevision: number, context?: MutationContext) {
    if (expectedRevision !== 1) fail("An exact issued Decision revision is required.");
    return store.transaction(projectId, async unit => {
      const prior = await requiredRecord(unit, projectId, decisionId);
      if (prior.entityType !== "Decision" || prior.recordVersion !== expectedRevision || prior.lifecycleState !== "active") fail("Decision correction target is unavailable or stale.");
      const family = (await unit.listEntities(projectId, "Decision")).filter(candidate => candidate.lineageId === prior.lineageId && candidate.lifecycleState !== "superseded");
      if (family.length !== 1 || family[0].id !== prior.id) fail("Decision is not the current member of its correction lineage.");
      const governs = (await unit.listRelationships(projectId, "governs")).filter(edge => edge.fromEntityId === prior.id && !edge.endedAt);
      if (governs.length === 0) fail("Decision correction requires a governed target.");
      const now = new Date().toISOString();
      const terminal = validateProjectStateEntity({ ...prior, recordVersion: prior.recordVersion + 1,
        lifecycleState: "superseded", supersededAt: now, updatedAt: now, updatedBy: trustedPrincipal }) as ProjectStateRecord<"Decision">;
      const successor = validateProjectStateEntity({ ...createProjectStateEntity({ entityType: "Decision", projectId,
        body: decisionBody(input, trustedPrincipal, now, prior.body.effectiveAt), principal: trustedPrincipal }),
        lineageId: prior.lineageId }) as ProjectStateRecord<"Decision">;
      assertSupersession(prior, terminal, successor);
      await unit.saveEntity(terminal, expectedRevision, { terminalSupersession: true });
      await recordMutation(unit, { projectId, entityId: prior.id, fromVersion: expectedRevision, toVersion: terminal.recordVersion,
        operation: "supersede", eventType: PROJECT_STATE_EVENT_TYPES.supersede, occurredAt: now,
        changedFields: ["lifecycleState", "supersededAt"], defaultReason: "Correct Decision", context });
      await unit.saveEntity(successor, null);
      await recordMutation(unit, { projectId, entityId: successor.id, fromVersion: null, toVersion: 1,
        operation: "create", eventType: PROJECT_STATE_EVENT_TYPES.create, occurredAt: successor.createdAt,
        changedFields: Object.keys(successor.body), defaultReason: "Record corrected Decision", context });
      const supersedes = createDomainRelationship({ projectId, fromEntityId: successor.id, relationshipType: "supersedes",
        toEntityId: prior.id, createdBy: trustedPrincipal }, id => id === successor.id ? successor : id === prior.id ? terminal : undefined);
      await unit.saveRelationship(supersedes);
      await recordMutation(unit, { projectId, entityId: successor.id, fromVersion: 1, toVersion: 1,
        operation: "relationship-create", eventType: PROJECT_STATE_EVENT_TYPES.relationshipCreate, occurredAt: supersedes.createdAt,
        changedFields: ["relationship:supersedes"], defaultReason: "Link Decision correction", context, relationshipId: supersedes.id });
      const governed = [];
      for (const priorEdge of governs) {
        const target = await requiredRecord(unit, projectId, priorEdge.toEntityId);
        const edge = createDomainRelationship({ projectId, fromEntityId: successor.id, relationshipType: "governs",
          toEntityId: target.id, createdBy: trustedPrincipal }, id => id === successor.id ? successor : id === target.id ? target : undefined);
        await unit.saveRelationship(edge);
        await recordMutation(unit, { projectId, entityId: successor.id, fromVersion: 1, toVersion: 1,
          operation: "relationship-create", eventType: PROJECT_STATE_EVENT_TYPES.relationshipCreate, occurredAt: edge.createdAt,
          changedFields: ["relationship:governs"], defaultReason: "Link corrected Decision", context, relationshipId: edge.id });
        governed.push(edge);
      }
      const derivedFrom = [];
      for (const priorEdge of (await unit.listRelationships(projectId, "derived_from")).filter(edge => edge.fromEntityId === prior.id && !edge.endedAt)) {
        const source = await requiredRecord(unit, projectId, priorEdge.toEntityId);
        const edge = createDomainRelationship({ projectId, fromEntityId: successor.id, relationshipType: "derived_from",
          toEntityId: source.id, createdBy: trustedPrincipal }, id => id === successor.id ? successor : id === source.id ? source : undefined);
        await unit.saveRelationship(edge);
        await recordMutation(unit, { projectId, entityId: successor.id, fromVersion: 1, toVersion: 1,
          operation: "relationship-create", eventType: PROJECT_STATE_EVENT_TYPES.relationshipCreate, occurredAt: edge.createdAt,
          changedFields: ["relationship:derived_from"], defaultReason: "Preserve corrected Decision source", context, relationshipId: edge.id });
        derivedFrom.push(edge);
      }
      return { predecessor: terminal, successor, supersedes, governs: governed, derivedFrom };
    });
  }

  async function recordValidation(projectId: ProjectId, targetId: EntityId, input: { validationType: string; method: string; validationMode?: ValidationMode; outcome: "pass" | "fail" | "blocked" | "inconclusive"; summary: string; targetRecordVersion?: number; sourceBaselineRef?: string }, context?: MutationContext) {
    exactInput(input, ["validationType", "method", "validationMode", "outcome", "summary", "targetRecordVersion", "sourceBaselineRef"]);
    if (input.validationType === "test-lifecycle-assessment") fail("Test lifecycle assessment requires a typed command.");
    return recordLinked(projectId, targetId, "Validation", target => {
      if (input.targetRecordVersion !== undefined && input.targetRecordVersion !== target.recordVersion) fail("Validation target version is stale.");
      const mode = input.validationMode ?? "deterministic";
      if (!(["deterministic", "semantic_ai", "visual_human"] as const).includes(mode)) fail("Unsupported validation mode.");
      if (mode === "visual_human" && trustedPrincipal.principalType !== "human") fail("Visual validation requires a human performer.");
      if (target.entityType === "Criterion") {
        const policy = target.body.validationPolicy;
        if (policy === "operator_decision") fail("An Operator Decision cannot be replaced by Validation.");
        const requiredMode = policy === "deferred_visual_phase" ? "visual_human" : policy;
        if (mode !== requiredMode) fail("Validation mode does not satisfy Criterion policy.");
      }
      return { validationType: input.validationType, method: input.method, validationMode: mode, outcome: input.outcome,
        summary: input.summary, targetEntityId: target.id, targetRecordVersion: target.recordVersion,
        ...(input.sourceBaselineRef === undefined ? {} : { sourceBaselineRef: input.sourceBaselineRef }),
        performedBy: trustedPrincipal, performedAt: new Date().toISOString() };
    }, "evaluates", context);
  }

  async function recordEvidence(projectId: ProjectId, targetId: EntityId, input: { evidenceType: string; description: string; mediaType: string; payloadRef: string; digest: string; size?: number }, context?: MutationContext) {
    const content = exactInput(input, ["evidenceType", "description", "mediaType", "payloadRef", "digest", "size"]);
    if (input.evidenceType === "implementation-proof") fail("Implementation proof requires a typed command.");
    if (typeof input.payloadRef !== "string" || !/^[a-z][a-z0-9+.-]*:[^\s]+$/i.test(input.payloadRef) || /^data:/i.test(input.payloadRef)) fail("Evidence payload must use an external reference, not inline bytes.");
    if (input.size !== undefined && (!Number.isSafeInteger(input.size) || input.size < 0)) fail("Evidence size must be a nonnegative integer.");
    return recordLinked(projectId, targetId, "Evidence", { ...content, capturedBy: trustedPrincipal, capturedAt: new Date().toISOString() }, "supports", context);
  }

  async function createRegressionObligation(projectId: ProjectId, input: Omit<EntityBodyMap["RegressionObligation"], "obligationState">, context?: MutationContext) {
    exactInput(input, ["title", "statement", "capabilityId", "riskCategory", "sourceWorkItemId"]);
    return store.transaction(projectId, async unit => {
      const source = input.sourceWorkItemId ? await requiredRecord(unit, projectId, input.sourceWorkItemId) : null;
      if (source && source.entityType !== "WorkItem") fail("Obligation source must be a Work Item.");
      const obligation = createProjectStateEntity({ entityType: "RegressionObligation", projectId,
        body: { ...input, obligationState: "active" }, principal: trustedPrincipal });
      await unit.saveEntity(obligation, null);
      await recordMutation(unit, { projectId, entityId: obligation.id, fromVersion: null, toVersion: 1,
        operation: "create", eventType: PROJECT_STATE_EVENT_TYPES.create, occurredAt: obligation.createdAt,
        changedFields: Object.keys(obligation.body), defaultReason: "Create RegressionObligation", context });
      if (source) await linkSemantic(unit, projectId, obligation, source, "derived_from", context);
      return obligation;
    });
  }

  async function setRegressionObligationState(projectId: ProjectId, obligationId: EntityId,
    state: "active" | "quarantined" | "retired", expectedRevision: number, context?: MutationContext) {
    return store.transaction(projectId, async unit => {
      const current = await requiredRecord(unit, projectId, obligationId);
      if (current.entityType !== "RegressionObligation" || current.recordVersion !== expectedRevision || current.lifecycleState !== "active") fail("Obligation target is unavailable or stale.");
      if (current.body.obligationState === "retired" || state === current.body.obligationState) fail("Invalid obligation transition.");
      const now = new Date().toISOString();
      const next = validateProjectStateEntity({ ...current, recordVersion: expectedRevision + 1,
        lifecycleState: state === "retired" ? "closed" : "active", ...(state === "retired" ? { closedAt: now } : {}),
        updatedAt: now, updatedBy: trustedPrincipal, body: { ...current.body, obligationState: state } });
      await unit.saveEntity(next, expectedRevision);
      await recordMutation(unit, { projectId, entityId: obligationId, fromVersion: expectedRevision, toVersion: next.recordVersion,
        operation: "revise", eventType: PROJECT_STATE_EVENT_TYPES.revise, occurredAt: now,
        changedFields: ["obligationState", ...(state === "retired" ? ["lifecycleState", "closedAt"] : [])],
        defaultReason: `Set RegressionObligation ${state}`, context });
      return next;
    });
  }

  async function recordTestLifecycleAssessment(projectId: ProjectId, targetId: EntityId,
    input: { status: TestLifecycleAssessmentStatus; summary: string; method: string }, context?: MutationContext) {
    exactInput(input, ["status", "summary", "method"]);
    if (!lifecycleAssessmentStatuses.has(input.status)) fail("Unsupported test lifecycle assessment status.");
    return recordLinked(projectId, targetId, "Validation", target => {
      if (target.entityType !== "RegressionObligation" && !(target.entityType === "ProjectResource" && target.body.resourceType === "permanent-test-reference")) fail("Assessment target must be an obligation or permanent test reference.");
      return { validationType: "test-lifecycle-assessment", method: input.method, validationMode: "deterministic",
        outcome: "inconclusive", assessmentStatus: input.status, summary: input.summary,
        targetEntityId: target.id, targetRecordVersion: target.recordVersion,
        performedBy: trustedPrincipal, performedAt: new Date().toISOString() };
    }, "evaluates", context);
  }

  async function recordImplementationProof(projectId: ProjectId, targetId: EntityId,
    input: { description: string; mediaType: string; payloadRef: string; digest: string; size?: number; sourceBaselineRef: string }, context?: MutationContext) {
    exactInput(input, ["description", "mediaType", "payloadRef", "digest", "size", "sourceBaselineRef"]);
    if (typeof input.payloadRef !== "string" || !/^[a-z][a-z0-9+.-]*:[^\s]+$/i.test(input.payloadRef) || /^data:/i.test(input.payloadRef)) fail("Evidence payload must use an external reference, not inline bytes.");
    if (input.size !== undefined && (!Number.isSafeInteger(input.size) || input.size < 0)) fail("Evidence size must be a nonnegative integer.");
    return store.transaction(projectId, async unit => {
      const target = await requiredRecord(unit, projectId, targetId);
      if (target.entityType !== "WorkItem" && target.entityType !== "ImplementationRecord") fail("Implementation proof target must be a Work Item or ImplementationRecord.");
      const evidence = createProjectStateEntity({ entityType: "Evidence", projectId,
        body: { ...input, evidenceType: "implementation-proof", capturedBy: trustedPrincipal, capturedAt: new Date().toISOString() }, principal: trustedPrincipal });
      await unit.saveEntity(evidence, null);
      await recordMutation(unit, { projectId, entityId: evidence.id, fromVersion: null, toVersion: 1,
        operation: "create", eventType: PROJECT_STATE_EVENT_TYPES.create, occurredAt: evidence.createdAt,
        changedFields: Object.keys(evidence.body), defaultReason: "Record implementation proof", context });
      await linkSemantic(unit, projectId, evidence, target, "supports", context);
      if (target.entityType === "ImplementationRecord") {
        const workItem = await requiredRecord(unit, projectId, target.body.workItemId);
        if (workItem.entityType !== "WorkItem") fail("Implementation proof Work Item is missing.");
        await linkSemantic(unit, projectId, evidence, workItem, "supports", context);
      }
      return evidence;
    });
  }

  async function recordPermanentTestReference(projectId: ProjectId,
    input: { catalogTestId: string; testPath: string; sourceRevisionId?: string }, obligationIds: EntityId[], context?: MutationContext) {
    exactInput(input, ["catalogTestId", "testPath", "sourceRevisionId"]);
    validateTestPath(input.testPath);
    if (!Array.isArray(obligationIds) || obligationIds.length === 0 || new Set(obligationIds).size !== obligationIds.length) fail("Distinct proof obligations are required.");
    return store.transaction(projectId, async unit => {
      const obligations = await Promise.all(obligationIds.map(id => requiredRecord(unit, projectId, id)));
      if (obligations.some(record => record.entityType !== "RegressionObligation" || record.body.obligationState === "retired")) fail("Permanent proof requires current obligations.");
      if ((await unit.listEntities(projectId, "ProjectResource")).some(record => record.entityType === "ProjectResource" && record.body.resourceType === "permanent-test-reference" && record.body.logicalName === input.catalogTestId && record.lifecycleState === "active")) fail("Permanent test catalog identity already exists.");
      const resource = createProjectStateEntity({ entityType: "ProjectResource", projectId,
        body: { resourceType: "permanent-test-reference", provider: "ValidationCatalog", logicalName: input.catalogTestId,
          locator: input.testPath, role: "regression-proof", ...(input.sourceRevisionId ? { sourceRevisionId: input.sourceRevisionId } : {}) }, principal: trustedPrincipal });
      await unit.saveEntity(resource, null);
      await recordMutation(unit, { projectId, entityId: resource.id, fromVersion: null, toVersion: 1,
        operation: "create", eventType: PROJECT_STATE_EVENT_TYPES.create, occurredAt: resource.createdAt,
        changedFields: Object.keys(resource.body), defaultReason: "Record permanent test reference", context });
      for (const obligation of obligations) await linkSemantic(unit, projectId, resource, obligation, "proves", context);
      return resource;
    });
  }

  async function linkPermanentTestReference(projectId: ProjectId, referenceId: EntityId, obligationId: EntityId, context?: MutationContext) {
    return store.transaction(projectId, async unit => {
      const reference = await requiredRecord(unit, projectId, referenceId);
      const obligation = await requiredRecord(unit, projectId, obligationId);
      if (reference.entityType !== "ProjectResource" || reference.body.resourceType !== "permanent-test-reference" || obligation.entityType !== "RegressionObligation" || obligation.body.obligationState === "retired") fail("Permanent proof link requires a reference and current obligation.");
      if ((await unit.listRelationships(projectId, "proves")).some(edge => edge.fromEntityId === referenceId && edge.toEntityId === obligationId)) fail("Permanent proof link already exists.");
      return linkSemantic(unit, projectId, reference, obligation, "proves", context);
    });
  }

  async function recordImplementation(projectId: ProjectId, workItemId: EntityId, input: Omit<EntityBodyMap["ImplementationRecord"], "workItemId">, context?: MutationContext) {
    exactInput(input, ["summary", "deviations", "blockers", "residualRisks", "outcome", "executionRef"]);
    return recordLinked(projectId, workItemId, "ImplementationRecord", target => {
      if (target.entityType !== "WorkItem") fail("Implementation target must be a Work Item.");
      return { ...input, workItemId: target.id };
    }, "implements_work_item", context);
  }

  async function recordRouteAssessment(projectId: ProjectId, intakeId: EntityId, input: Omit<EntityBodyMap["RouteAssessment"], "workIntakeId">, context?: MutationContext) {
    exactInput(input, ["recommendation", "traits", "rationale", "alternate", "evidenceIds"]);
    if (!Array.isArray(input.evidenceIds)) fail("Route assessment evidence identities are required.");
    return store.transaction(projectId, async unit => {
      const intake = await requiredRecord(unit, projectId, intakeId);
      if (intake.entityType !== "WorkIntake" || intake.lifecycleState !== "active") fail("Active Work Intake is required for route assessment.");
      if (!workRoutes.has(input.recommendation) || (input.alternate !== undefined && !workRoutes.has(input.alternate))) fail("Unsupported Work Intake route.");
      for (const evidenceId of input.evidenceIds) {
        const evidence = await requiredRecord(unit, projectId, evidenceId);
        if (evidence.entityType !== "Evidence") fail("Route assessment evidence reference must identify Evidence.");
      }
      const assessment = createProjectStateEntity({ entityType: "RouteAssessment", projectId,
        body: { ...input, workIntakeId: intakeId }, principal: trustedPrincipal });
      await unit.saveEntity(assessment, null);
      await recordMutation(unit, { projectId, entityId: assessment.id, fromVersion: null, toVersion: 1,
        operation: "create", eventType: PROJECT_STATE_EVENT_TYPES.create, occurredAt: assessment.createdAt,
        changedFields: Object.keys(assessment.body), defaultReason: "Record route assessment", context });
      const edge = createDomainRelationship({ projectId, fromEntityId: assessment.id, relationshipType: "assesses_route",
        toEntityId: intakeId, createdBy: trustedPrincipal }, id => id === assessment.id ? assessment : id === intakeId ? intake : undefined);
      await unit.saveRelationship(edge);
      await recordMutation(unit, { projectId, entityId: assessment.id, fromVersion: 1, toVersion: 1,
        operation: "relationship-create", eventType: PROJECT_STATE_EVENT_TYPES.relationshipCreate, occurredAt: edge.createdAt,
        changedFields: ["relationship:assesses_route"], defaultReason: "Link route assessment", context, relationshipId: edge.id });
      if (intake.body.intakeState !== "assessing") {
        const now = new Date().toISOString();
        const next = validateProjectStateEntity({ ...intake, recordVersion: intake.recordVersion + 1,
          updatedAt: now, updatedBy: trustedPrincipal, body: { ...intake.body, intakeState: "assessing" } });
        await unit.saveEntity(next, intake.recordVersion);
        await recordMutation(unit, { projectId, entityId: intake.id, fromVersion: intake.recordVersion, toVersion: next.recordVersion,
          operation: "revise", eventType: PROJECT_STATE_EVENT_TYPES.revise, occurredAt: now,
          changedFields: ["intakeState"], defaultReason: "Assess Work Intake route", context });
      }
      return assessment;
    });
  }

  async function recordRouteDecision(projectId: ProjectId, intakeId: EntityId, input: { route: WorkRoute; assessmentId: EntityId; rationale?: string }, context?: MutationContext) {
    exactInput(input, ["route", "assessmentId", "rationale"]);
    if (trustedPrincipal.principalType !== "human" || trustedPrincipal.role !== "Operator") fail("Only the human Operator can select a Work Intake route.");
    if (!workRoutes.has(input.route)) fail("Unsupported Work Intake route.");
    return store.transaction(projectId, async unit => {
      const intake = await requiredRecord(unit, projectId, intakeId);
      const assessment = await requiredRecord(unit, projectId, input.assessmentId);
      if (intake.entityType !== "WorkIntake" || intake.lifecycleState !== "active" || assessment.entityType !== "RouteAssessment" || assessment.body.workIntakeId !== intakeId) fail("Route decision requires an active Work Intake and its assessment.");
      const assessed = (await unit.listRelationships(projectId, "assesses_route"))
        .some(edge => edge.fromEntityId === assessment.id && edge.toEntityId === intakeId && !edge.endedAt);
      if (!assessed) fail("Route assessment is not linked to this Work Intake.");
      const now = new Date().toISOString();
      const decision = createProjectStateEntity({ entityType: "Decision", projectId,
        body: decisionBody({ decisionType: "work-intake-route", outcome: input.route,
          decisionScope: `work-intake:${intakeId}`, rationale: input.rationale }, trustedPrincipal, now), principal: trustedPrincipal });
      await unit.saveEntity(decision, null);
      await recordMutation(unit, { projectId, entityId: decision.id, fromVersion: null, toVersion: 1,
        operation: "create", eventType: PROJECT_STATE_EVENT_TYPES.create, occurredAt: decision.createdAt,
        changedFields: Object.keys(decision.body), defaultReason: "Select Work Intake route", context });
      for (const [relationshipType, target] of [["governs", intake], ["derived_from", assessment]] as const) {
        const edge = createDomainRelationship({ projectId, fromEntityId: decision.id, relationshipType,
          toEntityId: target.id, createdBy: trustedPrincipal }, id => id === decision.id ? decision : id === target.id ? target : undefined);
        await unit.saveRelationship(edge);
        await recordMutation(unit, { projectId, entityId: decision.id, fromVersion: 1, toVersion: 1,
          operation: "relationship-create", eventType: PROJECT_STATE_EVENT_TYPES.relationshipCreate, occurredAt: edge.createdAt,
          changedFields: [`relationship:${relationshipType}`], defaultReason: `Link Work Intake route ${relationshipType}`, context, relationshipId: edge.id });
      }
      if (intake.body.intakeState !== "routed") {
        const next = validateProjectStateEntity({ ...intake, recordVersion: intake.recordVersion + 1,
          updatedAt: now, updatedBy: trustedPrincipal, body: { ...intake.body, intakeState: "routed" } });
        await unit.saveEntity(next, intake.recordVersion);
        await recordMutation(unit, { projectId, entityId: intake.id, fromVersion: intake.recordVersion, toVersion: next.recordVersion,
          operation: "revise", eventType: PROJECT_STATE_EVENT_TYPES.revise, occurredAt: now,
          changedFields: ["intakeState"], defaultReason: "Route Work Intake", context });
      }
      return decision;
    });
  }

  async function createSourceBinding(projectId: ProjectId, intakeId: EntityId, input: { repositoryId: string; integrationTargetSourceLineId: string }, context?: MutationContext) {
    exactInput(input, ["repositoryId", "integrationTargetSourceLineId"]);
    return store.transaction(projectId, async unit => {
      const intake = await requiredRecord(unit, projectId, intakeId);
      if (intake.entityType !== "WorkIntake") fail("SourceBinding requires Work Intake.");
      const prior = (await unit.listEntities(projectId, "SourceBinding"))
        .filter(record => record.entityType === "SourceBinding" && record.body.workIntakeId === intakeId && record.lifecycleState === "active");
      if (prior.length) fail("Work Intake already has an active SourceBinding.");
      const body: EntityBodyMap["SourceBinding"] = { workIntakeId: intakeId, ...input, preparationState: "unprepared" };
      assertSourceBindingBody(body);
      const binding = createProjectStateEntity({ entityType: "SourceBinding", projectId, body, principal: trustedPrincipal });
      await unit.saveEntity(binding, null);
      await recordMutation(unit, { projectId, entityId: binding.id, fromVersion: null, toVersion: 1,
        operation: "create", eventType: PROJECT_STATE_EVENT_TYPES.create, occurredAt: binding.createdAt,
        changedFields: Object.keys(binding.body), defaultReason: "Create SourceBinding", context });
      await linkSemantic(unit, projectId, binding, intake, "binds_source", context);
      return binding;
    });
  }

  async function updateSourceBinding(projectId: ProjectId, bindingId: EntityId, changes: Partial<Pick<EntityBodyMap["SourceBinding"], "preparationState" | "baseRevisionId" | "workSourceLineId" | "currentRevisionId" | "repositoryCheckoutId" | "failureCode">>, expectedRevision: number, context?: MutationContext) {
    const patch = exactInput(changes, ["preparationState", "baseRevisionId", "workSourceLineId", "currentRevisionId", "repositoryCheckoutId", "failureCode"]);
    if (Object.keys(patch).length === 0) fail("SourceBinding update requires a change.");
    const transitions: Record<EntityBodyMap["SourceBinding"]["preparationState"], readonly EntityBodyMap["SourceBinding"]["preparationState"][]> = {
      unprepared: ["unprepared", "preparing", "blocked"], preparing: ["preparing", "ready", "blocked"],
      ready: ["ready", "blocked"], blocked: ["blocked", "preparing"],
    };
    return store.transaction(projectId, async unit => {
      const current = await requiredRecord(unit, projectId, bindingId);
      if (current.entityType !== "SourceBinding" || current.recordVersion !== expectedRevision || current.lifecycleState !== "active") fail("SourceBinding update target is unavailable or stale.");
      const body = { ...current.body, ...patch } as EntityBodyMap["SourceBinding"];
      for (const key of Object.keys(patch) as (keyof typeof body)[]) if (patch[key] === undefined) delete body[key];
      if (!transitions[current.body.preparationState].includes(body.preparationState)) fail("Invalid source preparation transition.");
      assertSourceBindingBody(body);
      const now = new Date().toISOString();
      const next = validateProjectStateEntity({ ...current, recordVersion: expectedRevision + 1,
        updatedAt: now, updatedBy: trustedPrincipal, body });
      await unit.saveEntity(next, expectedRevision);
      await recordMutation(unit, { projectId, entityId: bindingId, fromVersion: expectedRevision, toVersion: next.recordVersion,
        operation: "revise", eventType: PROJECT_STATE_EVENT_TYPES.revise, occurredAt: now,
        changedFields: Object.keys(patch), defaultReason: "Update SourceBinding", context });
      return next;
    });
  }

  async function createSourceCheckpoint(projectId: ProjectId, bindingId: EntityId, targetId: EntityId,
    input: Pick<EntityBodyMap["SourceCheckpoint"], "boundaryId" | "expectedRevisionId" | "checkpointKind" | "checkpointState"> & { resultingRevisionId?: string }, context?: MutationContext) {
    exactInput(input, ["boundaryId", "expectedRevisionId", "checkpointKind", "checkpointState", "resultingRevisionId"]);
    return store.transaction(projectId, async unit => {
      const binding = await requiredRecord(unit, projectId, bindingId);
      const target = await requiredRecord(unit, projectId, targetId);
      if (binding.entityType !== "SourceBinding" || binding.body.preparationState !== "ready" || !binding.body.workSourceLineId) fail("Checkpoint requires a ready SourceBinding.");
      if (!["WorkIntake", "WorkItem", "ImplementationRecord"].includes(target.entityType)) fail("Unsupported checkpoint target.");
      if ((await unit.listEntities(projectId, "SourceCheckpoint")).some(record => record.entityType === "SourceCheckpoint" && record.body.boundaryId === input.boundaryId)) fail("Checkpoint boundary already exists.");
      const body: EntityBodyMap["SourceCheckpoint"] = { ...input, workIntakeId: binding.body.workIntakeId,
        sourceLineId: binding.body.workSourceLineId };
      if (target.entityType === "WorkIntake" && target.id !== body.workIntakeId) fail("Checkpoint Work Intake does not match SourceBinding.");
      if (binding.body.currentRevisionId !== body.expectedRevisionId) fail("Checkpoint expected revision differs from SourceBinding current revision.");
      assertSourceCheckpointBody(body);
      const checkpoint = createProjectStateEntity({ entityType: "SourceCheckpoint", projectId, body, principal: trustedPrincipal });
      await unit.saveEntity(checkpoint, null);
      await recordMutation(unit, { projectId, entityId: checkpoint.id, fromVersion: null, toVersion: 1,
        operation: "create", eventType: PROJECT_STATE_EVENT_TYPES.create, occurredAt: checkpoint.createdAt,
        changedFields: Object.keys(checkpoint.body), defaultReason: "Create SourceCheckpoint", context });
      const intake = await requiredRecord(unit, projectId, body.workIntakeId);
      for (const related of new Map([binding, intake, target].map(record => [record.id, record])).values()) {
        await linkSemantic(unit, projectId, checkpoint, related, "checkpoints", context);
      }
      return checkpoint;
    });
  }

  async function advanceSourceCheckpoint(projectId: ProjectId, checkpointId: EntityId, input: { checkpointState: EntityBodyMap["SourceCheckpoint"]["checkpointState"]; resultingRevisionId?: string }, expectedRevision: number, context?: MutationContext) {
    exactInput(input, ["checkpointState", "resultingRevisionId"]);
    const transitions: Record<EntityBodyMap["SourceCheckpoint"]["checkpointState"], readonly EntityBodyMap["SourceCheckpoint"]["checkpointState"][]> = {
      "not-required": [], pending: ["committed", "blocked", "inspection-required"],
      blocked: ["pending", "inspection-required"], "inspection-required": ["pending", "committed"], committed: [],
    };
    return store.transaction(projectId, async unit => {
      const current = await requiredRecord(unit, projectId, checkpointId);
      if (current.entityType !== "SourceCheckpoint" || current.recordVersion !== expectedRevision) fail("SourceCheckpoint update target is unavailable or stale.");
      if (!transitions[current.body.checkpointState].includes(input.checkpointState)) fail("Invalid checkpoint transition.");
      const body: EntityBodyMap["SourceCheckpoint"] = { ...current.body, checkpointState: input.checkpointState,
        ...(input.resultingRevisionId ? { resultingRevisionId: input.resultingRevisionId } : {}) };
      assertSourceCheckpointBody(body);
      const now = new Date().toISOString();
      const next = validateProjectStateEntity({ ...current, recordVersion: expectedRevision + 1,
        updatedAt: now, updatedBy: trustedPrincipal, body });
      await unit.saveEntity(next, expectedRevision);
      await recordMutation(unit, { projectId, entityId: checkpointId, fromVersion: expectedRevision, toVersion: next.recordVersion,
        operation: "revise", eventType: PROJECT_STATE_EVENT_TYPES.revise, occurredAt: now,
        changedFields: ["checkpointState", ...(input.resultingRevisionId ? ["resultingRevisionId"] : [])],
        defaultReason: "Advance SourceCheckpoint", context });
      return next;
    });
  }

  async function createIntegrationRecord(projectId: ProjectId, bindingId: EntityId,
    input: { targetBeforeRevisionId: string; candidateRevisionId?: string; targetEntityId?: EntityId }, context?: MutationContext) {
    exactInput(input, ["targetBeforeRevisionId", "candidateRevisionId", "targetEntityId"]);
    return store.transaction(projectId, async unit => {
      const binding = await requiredRecord(unit, projectId, bindingId);
      if (binding.entityType !== "SourceBinding" || binding.body.preparationState !== "ready" || !binding.body.currentRevisionId) fail("Integration requires a ready SourceBinding with current revision.");
      const intake = await requiredRecord(unit, projectId, binding.body.workIntakeId);
      if (intake.entityType !== "WorkIntake") fail("Integration SourceBinding has no Work Intake.");
      const target = input.targetEntityId ? await requiredRecord(unit, projectId, input.targetEntityId) : null;
      if (target && !["WorkItem", "ImplementationRecord"].includes(target.entityType)) fail("Integration target must be a Work Item or ImplementationRecord.");
      const body: EntityBodyMap["IntegrationRecord"] = { workIntakeId: intake.id,
        incomingRevisionId: binding.body.currentRevisionId, targetSourceLineId: binding.body.integrationTargetSourceLineId,
        targetBeforeRevisionId: input.targetBeforeRevisionId,
        ...(input.candidateRevisionId ? { candidateRevisionId: input.candidateRevisionId } : {}),
        integrationState: "prepared", outcome: "pending", validationIds: [], repairWorkItemIds: [] };
      assertIntegrationBody(body);
      const record = createProjectStateEntity({ entityType: "IntegrationRecord", projectId, body, principal: trustedPrincipal });
      await unit.saveEntity(record, null);
      await recordMutation(unit, { projectId, entityId: record.id, fromVersion: null, toVersion: 1,
        operation: "create", eventType: PROJECT_STATE_EVENT_TYPES.create, occurredAt: record.createdAt,
        changedFields: Object.keys(record.body), defaultReason: "Create IntegrationRecord", context });
      for (const related of [binding, intake, ...(target ? [target] : [])]) await linkSemantic(unit, projectId, record, related, "integrates", context);
      return record;
    });
  }

  async function advanceIntegrationRecord(projectId: ProjectId, integrationId: EntityId,
    input: Partial<Pick<EntityBodyMap["IntegrationRecord"], "candidateRevisionId" | "targetAfterRevisionId" | "resultRevisionId" | "integrationState" | "outcome" | "validationIds" | "repairWorkItemIds">>, expectedRevision: number, context?: MutationContext) {
    const patch = exactInput(input, ["candidateRevisionId", "targetAfterRevisionId", "resultRevisionId", "integrationState", "outcome", "validationIds", "repairWorkItemIds"]);
    if (Object.keys(patch).length === 0) fail("Integration update requires a change.");
    const transitions: Record<EntityBodyMap["IntegrationRecord"]["integrationState"], readonly EntityBodyMap["IntegrationRecord"]["integrationState"][]> = {
      prepared: ["prepared", "validating", "blocked"], validating: ["validating", "repairing", "ready", "blocked"],
      repairing: ["repairing", "validating", "ready", "blocked"], ready: ["ready", "integrated", "blocked"],
      blocked: ["blocked", "validating", "repairing", "failed"], failed: [], integrated: [],
    };
    return store.transaction(projectId, async unit => {
      const current = await requiredRecord(unit, projectId, integrationId);
      if (current.entityType !== "IntegrationRecord" || current.recordVersion !== expectedRevision) fail("Integration update target is unavailable or stale.");
      const body = { ...current.body, ...patch } as EntityBodyMap["IntegrationRecord"];
      if (!transitions[current.body.integrationState].includes(body.integrationState)) fail("Invalid IntegrationRecord transition.");
      assertIntegrationBody(body);
      for (const id of body.validationIds) {
        const validation = await requiredRecord(unit, projectId, id);
        if (validation.entityType !== "Validation" || validation.body.targetEntityId !== integrationId) fail("Integration validation must evaluate this IntegrationRecord.");
        if (!(await unit.listRelationships(projectId, "evaluates")).some(edge => edge.fromEntityId === id && edge.toEntityId === integrationId && !edge.endedAt)) fail("Integration Validation relationship is missing.");
      }
      const existingLinks = (await unit.listRelationships(projectId, "integrates")).filter(edge => edge.fromEntityId === integrationId && !edge.endedAt);
      for (const id of body.repairWorkItemIds) {
        const repair = await requiredRecord(unit, projectId, id);
        if (repair.entityType !== "WorkItem" || !["repair", "fix"].includes(repair.body.workItemKind)) fail("Integration repair must be a Repair or Fix Work Item.");
        if (!existingLinks.some(edge => edge.toEntityId === id)) await linkSemantic(unit, projectId, current, repair, "integrates", context);
      }
      const now = new Date().toISOString();
      const next = validateProjectStateEntity({ ...current, recordVersion: expectedRevision + 1,
        updatedAt: now, updatedBy: trustedPrincipal, body });
      await unit.saveEntity(next, expectedRevision);
      await recordMutation(unit, { projectId, entityId: integrationId, fromVersion: expectedRevision, toVersion: next.recordVersion,
        operation: "revise", eventType: PROJECT_STATE_EVENT_TYPES.revise, occurredAt: now,
        changedFields: Object.keys(patch), defaultReason: "Advance IntegrationRecord", context });
      return next;
    });
  }

  async function getSourceSemanticView(projectId: ProjectId, repositoryId: string): Promise<SourceSemanticView> {
    if (typeof repositoryId !== "string" || repositoryId.length < 1 || repositoryId.length > 512 || /\s/.test(repositoryId)) fail("Opaque RepositoryService identity is required.");
    const bindings = (await store.listEntities(projectId, "SourceBinding"))
      .filter((record): record is ProjectStateRecord<"SourceBinding"> => record.entityType === "SourceBinding")
      .filter(record => record.body.repositoryId === repositoryId);
    const bindingIds = new Set(bindings.map(record => record.id));
    const edges = await store.listRelationships(projectId);
    const checkpointIds = new Set(edges.filter(edge => edge.relationshipType === "checkpoints" && bindingIds.has(edge.toEntityId)).map(edge => edge.fromEntityId));
    const integrationIds = new Set(edges.filter(edge => edge.relationshipType === "integrates" && bindingIds.has(edge.toEntityId)).map(edge => edge.fromEntityId));
    const checkpoints = (await store.listEntities(projectId, "SourceCheckpoint"))
      .filter((record): record is ProjectStateRecord<"SourceCheckpoint"> => record.entityType === "SourceCheckpoint")
      .filter(record => checkpointIds.has(record.id));
    const integrations = (await store.listEntities(projectId, "IntegrationRecord"))
      .filter((record): record is ProjectStateRecord<"IntegrationRecord"> => record.entityType === "IntegrationRecord")
      .filter(record => integrationIds.has(record.id));
    const ids = new Set([...bindingIds, ...checkpointIds, ...integrationIds]);
    return { repositoryId, bindings, checkpoints, integrations,
      relationships: edges.filter(edge => ids.has(edge.fromEntityId) || ids.has(edge.toEntityId)) };
  }

  async function getRegressionObligationView(projectId: ProjectId, obligationId: EntityId): Promise<RegressionObligationView> {
    const obligation = await store.getEntity(projectId, obligationId);
    if (!obligation || obligation.entityType !== "RegressionObligation") fail("RegressionObligation does not exist in this Project.");
    const edges = await store.listRelationships(projectId);
    const assessmentIds = new Set(edges.filter(edge => edge.relationshipType === "evaluates" && edge.toEntityId === obligationId).map(edge => edge.fromEntityId));
    const referenceIds = new Set(edges.filter(edge => edge.relationshipType === "proves" && edge.toEntityId === obligationId).map(edge => edge.fromEntityId));
    const assessments = (await store.listEntities(projectId, "Validation"))
      .filter((record): record is ProjectStateRecord<"Validation"> => record.entityType === "Validation")
      .filter(record => assessmentIds.has(record.id) && record.body.validationType === "test-lifecycle-assessment");
    const permanentReferences = (await store.listEntities(projectId, "ProjectResource"))
      .filter((record): record is ProjectStateRecord<"ProjectResource"> => record.entityType === "ProjectResource")
      .filter(record => referenceIds.has(record.id) && record.body.resourceType === "permanent-test-reference");
    const workIds = new Set([obligation.body.sourceWorkItemId].filter((id): id is EntityId => !!id));
    const implementationIds = new Set(edges.filter(edge => edge.relationshipType === "implements_work_item" && workIds.has(edge.toEntityId)).map(edge => edge.fromEntityId));
    const implementationProof = (await store.listEntities(projectId, "Evidence"))
      .filter((record): record is ProjectStateRecord<"Evidence"> => record.entityType === "Evidence")
      .filter(record => record.body.evidenceType === "implementation-proof" && edges.some(edge => edge.relationshipType === "supports" && edge.fromEntityId === record.id && (workIds.has(edge.toEntityId) || implementationIds.has(edge.toEntityId))));
    const ids = new Set([obligationId, ...assessmentIds, ...referenceIds, ...implementationProof.map(record => record.id)]);
    return { obligation, assessments, permanentReferences, implementationProof,
      relationships: edges.filter(edge => ids.has(edge.fromEntityId) || ids.has(edge.toEntityId)) };
  }

  async function getRecord(projectId: ProjectId, entityId: EntityId) { return store.getEntity(projectId, entityId); }
  async function queryRecords(projectId: ProjectId, query: RecordQuery = {}) {
    exactInput(query, ["entityType", "lifecycleState", "limit"]);
    if (query.entityType !== undefined && !Object.hasOwn(ENTITY_TYPE_REGISTRY, query.entityType)) fail("Unregistered Project State entity type.");
    if (query.lifecycleState !== undefined && !["active", "closed", "archived", "superseded", "voided"].includes(query.lifecycleState)) fail("Unsupported lifecycle state.");
    const limit = query.limit ?? 100;
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) fail("Query limit must be between 1 and 100.");
    return (await store.listEntities(projectId, query.entityType)).filter(record => !query.lifecycleState || record.lifecycleState === query.lifecycleState).slice(0, limit);
  }
  async function supersessionChain(projectId: ProjectId, identity: EntityId): Promise<ProjectStateEntity[] | null> {
    const record = await store.getEntity(projectId, identity);
    if (!record) return null;
    const allFamily = (await store.listEntities(projectId, record.entityType)).filter(candidate => candidate.lineageId === record.lineageId);
    const family = allFamily.filter(candidate => candidate.lifecycleState !== "superseded");
    const identities = new Set(allFamily.map(candidate => candidate.id));
    const edges = (await store.listRelationships(projectId, "supersedes")).filter(edge => identities.has(edge.fromEntityId) || identities.has(edge.toEntityId));
    if (edges.some(edge => !identities.has(edge.fromEntityId) || !identities.has(edge.toEntityId))) fail("Supersession relationship escapes its lineage.");
    const successorByPredecessor = new Map<EntityId, EntityId>();
    const successorIds = new Set<EntityId>();
    for (const edge of edges) {
      if (edge.endedAt || successorByPredecessor.has(edge.toEntityId) || successorIds.has(edge.fromEntityId)) fail("Supersession lineage branches or contains an ended edge.");
      successorByPredecessor.set(edge.toEntityId, edge.fromEntityId);
      successorIds.add(edge.fromEntityId);
    }
    const roots = allFamily.filter(candidate => !successorIds.has(candidate.id));
    if (roots.length !== 1 || edges.length !== allFamily.length - 1) fail("Supersession lineage is incomplete or cyclic.");
    const byId = new Map(allFamily.map(candidate => [candidate.id, candidate]));
    const chain: ProjectStateEntity[] = [];
    let nextId: EntityId | undefined = roots[0].id;
    while (nextId) {
      const next = byId.get(nextId);
      if (!next || chain.some(candidate => candidate.id === nextId)) fail("Supersession lineage is cyclic.");
      chain.push(next);
      nextId = successorByPredecessor.get(next.id);
    }
    if (chain.length !== allFamily.length || family.length !== 1 || chain.at(-1)?.id !== family[0].id || chain.slice(0, -1).some(candidate => candidate.lifecycleState !== "superseded")) {
      fail("Supersession lineage has no unique current successor.");
    }
    return chain;
  }
  async function getCurrentRecord(projectId: ProjectId, identity: EntityId) {
    const chain = await supersessionChain(projectId, identity);
    return chain?.at(-1) ?? null;
  }
  async function getRecordHistory(projectId: ProjectId, entityId: EntityId): Promise<RecordHistory | null> {
    const chain = await supersessionChain(projectId, entityId);
    if (!chain) return null;
    const versions: ProjectStateEntity[] = [];
    for (const identity of chain) {
      for (let version = 1; version <= identity.recordVersion; version++) {
        const record = await store.getEntityVersion(projectId, identity.id, version);
        if (!record || record.lineageId !== identity.lineageId) fail("Record history has a missing or inconsistent version.");
        versions.push(record);
      }
    }
    return { lineageId: chain[0].lineageId, records: versions };
  }
  async function getRelationships(projectId: ProjectId, entityId: EntityId) {
    if (!await store.getEntity(projectId, entityId)) return [];
    return (await store.listRelationships(projectId)).filter(edge => edge.fromEntityId === entityId || edge.toEntityId === entityId);
  }
  async function getLineage(projectId: ProjectId, entityId: EntityId): Promise<RecordLineage | null> {
    const record = await store.getEntity(projectId, entityId);
    if (!record) return null;
    const all = await store.listEntities(projectId);
    const edges = (await store.listRelationships(projectId)).filter(edge => edge.relationshipType === "derived_from" || edge.relationshipType === "supersedes");
    const ids = new Set([entityId]);
    for (let index = 0; index < 128; index++) {
      const prior = ids.size;
      for (const edge of edges) if (ids.has(edge.fromEntityId) || ids.has(edge.toEntityId)) { ids.add(edge.fromEntityId); ids.add(edge.toEntityId); }
      if (ids.size === prior) break;
      if (ids.size > 128) fail("Lineage exceeds its bound.");
    }
    return { records: all.filter(candidate => ids.has(candidate.id)), relationships: edges.filter(edge => ids.has(edge.fromEntityId) && ids.has(edge.toEntityId)) };
  }
  async function getProjectStateSummary(projectId: ProjectId): Promise<ProjectStateSummary> {
    const records = await store.listEntities(projectId);
    const countsByType: Partial<Record<EntityType, number>> = {};
    for (const record of records) countsByType[record.entityType] = (countsByType[record.entityType] ?? 0) + 1;
    return { projectId, totalRecords: records.length, activeRecords: records.filter(record => record.lifecycleState === "active").length, countsByType };
  }
  async function getEvidence(projectId: ProjectId, targetId: EntityId) {
    if (!await store.getEntity(projectId, targetId)) return [];
    const edges = (await store.listRelationships(projectId, "supports")).filter(edge => edge.toEntityId === targetId && !edge.endedAt);
    const evidence = await Promise.all(edges.map(edge => store.getEntity(projectId, edge.fromEntityId)));
    return evidence.filter((record): record is ProjectStateEntity => record?.entityType === "Evidence");
  }

  async function getValidationFreshness(projectId: ProjectId, validationId: EntityId, currentSourceBaselineRef?: string): Promise<ValidationFreshness> {
    const record = await requiredRecord(store, projectId, validationId);
    if (record.entityType !== "Validation") fail("Validation identity is required.");
    if (currentSourceBaselineRef !== undefined && (typeof currentSourceBaselineRef !== "string" || currentSourceBaselineRef.length === 0)) fail("Current source baseline reference is invalid.");
    const target = await store.getEntity(projectId, record.body.targetEntityId);
    const edges = (await store.listRelationships(projectId, "evaluates"))
      .filter(edge => edge.fromEntityId === validationId && edge.toEntityId === record.body.targetEntityId && !edge.endedAt);
    if (!target || edges.length !== 1) fail("Validation target binding is missing or inconsistent.");
    const staleReason: ValidationStaleReason | null = target.lifecycleState === "superseded" || target.lifecycleState === "voided"
      ? "target-superseded" : target.recordVersion !== record.body.targetRecordVersion
        ? "target-version-changed" : record.body.sourceBaselineRef !== currentSourceBaselineRef
          ? "source-baseline-changed" : null;
    return { validationId, targetEntityId: target.id, targetRecordVersion: record.body.targetRecordVersion,
      current: staleReason === null, staleReason };
  }

  async function getCriterionValidationStatus(projectId: ProjectId, criterionId: EntityId, currentSourceBaselineRef?: string): Promise<CriterionValidationStatus> {
    const criterion = await requiredRecord(store, projectId, criterionId);
    if (criterion.entityType !== "Criterion") fail("Criterion identity is required.");
    const policy = criterion.body.validationPolicy;
    if (policy === "operator_decision") return { criterionId, policy, satisfied: false, validationId: null, reason: "operator-decision-required" };
    if (policy === "deferred_visual_phase") {
      const owners = (await store.listRelationships(projectId, "defines_criterion"))
        .filter(edge => edge.toEntityId === criterionId && !edge.endedAt);
      const entities = await Promise.all(owners.map(edge => store.getEntity(projectId, edge.fromEntityId)));
      if (!entities.some(entity => entity?.entityType === "Phase")) return { criterionId, policy, satisfied: false, validationId: null, reason: "deferred-to-phase" };
    }
    const requiredMode: ValidationMode = policy === "deferred_visual_phase" ? "visual_human" : policy;
    const validationIds = new Set((await store.listRelationships(projectId, "evaluates"))
      .filter(edge => edge.toEntityId === criterionId && !edge.endedAt).map(edge => edge.fromEntityId));
    const validations = (await store.listEntities(projectId, "Validation"))
      .filter((record): record is ProjectStateRecord<"Validation"> => record.entityType === "Validation")
      .filter(record => validationIds.has(record.id) && record.body.validationMode === requiredMode);
    const sequenceById = new Map((await store.listOutbox(projectId))
      .filter(event => event.entityId && event.payload.operation === "create").map(event => [event.entityId as string, event.sequence]));
    const fresh = [];
    for (const validation of validations) {
      if ((await getValidationFreshness(projectId, validation.id, currentSourceBaselineRef)).current) fresh.push(validation);
    }
    fresh.sort((a, b) => (sequenceById.get(a.id) ?? 0) - (sequenceById.get(b.id) ?? 0) || a.id.localeCompare(b.id));
    const latest = fresh.at(-1);
    if (!latest) return { criterionId, policy, satisfied: false, validationId: null, reason: "no-current-validation" };
    return { criterionId, policy, satisfied: latest.body.outcome === "pass", validationId: latest.id,
      reason: latest.body.outcome === "pass" ? "current-pass" : "latest-validation-not-pass" };
  }

  async function getImplementationAttempts(projectId: ProjectId, workItemId: EntityId) {
    const workItem = await requiredRecord(store, projectId, workItemId);
    if (workItem.entityType !== "WorkItem") fail("Work Item identity is required.");
    const linked = new Set((await store.listRelationships(projectId, "implements_work_item"))
      .filter(edge => edge.toEntityId === workItemId && !edge.endedAt).map(edge => edge.fromEntityId));
    const sequence = new Map((await store.listOutbox(projectId))
      .filter(event => event.entityId && event.payload.operation === "create").map(event => [event.entityId as string, event.sequence]));
    return (await store.listEntities(projectId, "ImplementationRecord"))
      .filter((record): record is ProjectStateRecord<"ImplementationRecord"> => record.entityType === "ImplementationRecord")
      .filter(record => linked.has(record.id) && record.body.workItemId === workItemId)
      .sort((a, b) => (sequence.get(a.id) ?? 0) - (sequence.get(b.id) ?? 0) || a.id.localeCompare(b.id));
  }

  async function getExecutionPlan(projectId: ProjectId): Promise<ExecutionPlanView> {
    const phases = (await store.listEntities(projectId, "Phase"))
      .filter((record): record is ProjectStateRecord<"Phase"> => record.entityType === "Phase" && record.lifecycleState !== "superseded" && record.lifecycleState !== "voided")
      .sort((a, b) => a.body.sequence - b.body.sequence || a.id.localeCompare(b.id));
    const workItems = (await store.listEntities(projectId, "WorkItem"))
      .filter((record): record is ProjectStateRecord<"WorkItem"> => record.entityType === "WorkItem" && record.lifecycleState !== "superseded" && record.lifecycleState !== "voided");
    const active = (await store.listRelationships(projectId)).filter(edge => !edge.endedAt);
    const parentByWork = new Map(active.filter(edge => edge.relationshipType === "part_of").map(edge => [edge.fromEntityId, edge.toEntityId]));
    const phaseIds = new Set(phases.map(phase => phase.id));
    const phaseFor = (workId: EntityId) => {
      let id: EntityId | undefined = parentByWork.get(workId);
      const visited = new Set<EntityId>([workId]);
      while (id && !visited.has(id)) {
        if (phaseIds.has(id)) return id;
        visited.add(id);
        id = parentByWork.get(id);
      }
      if (id) fail("Work Item membership cycle exists.");
      return null;
    };
    const assigned = new Map(workItems.map(item => [item.id, phaseFor(item.id)]));
    return {
      phases: phases.map(phase => ({ phaseId: phase.id, sequence: phase.body.sequence,
        workItemIds: workItems.filter(item => assigned.get(item.id) === phase.id).map(item => item.id).sort(),
        criterionIds: active.filter(edge => edge.relationshipType === "defines_criterion" && edge.fromEntityId === phase.id).map(edge => edge.toEntityId).sort() })),
      directWorkItemIds: workItems.filter(item => assigned.get(item.id) === null).map(item => item.id).sort(),
      dependencyIds: active.filter(edge => edge.relationshipType === "depends_on").map(edge => ({ from: edge.fromEntityId, to: edge.toEntityId }))
        .sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to)),
      repairIds: active.filter(edge => edge.relationshipType === "repairs").map(edge => ({ from: edge.fromEntityId, to: edge.toEntityId }))
        .sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to)),
    };
  }

  async function getWorkItemCompletionEligibility(projectId: ProjectId, workItemId: EntityId, currentSourceBaselineRef?: string): Promise<CompletionEligibility> {
    const workItem = await requiredRecord(store, projectId, workItemId);
    if (workItem.entityType !== "WorkItem") fail("Work Item identity is required.");
    const blockers: string[] = [];
    if (["superseded", "voided"].includes(workItem.lifecycleState) || workItem.body.workState === "cancelled") blockers.push("work-item-terminal");
    const latestAttempt = (await getImplementationAttempts(projectId, workItemId)).at(-1);
    if (!latestAttempt || latestAttempt.body.outcome !== "implemented" || latestAttempt.body.blockers.length > 0) blockers.push("implementation-incomplete");
    const edges = (await store.listRelationships(projectId)).filter(edge => !edge.endedAt);
    const dependencyIds = edges.filter(edge => edge.relationshipType === "depends_on" && edge.fromEntityId === workItemId).map(edge => edge.toEntityId);
    for (const id of dependencyIds) {
      const dependency = await requiredRecord(store, projectId, id);
      if (dependency.entityType !== "WorkItem" || dependency.body.workState !== "closed") blockers.push(`dependency:${id}`);
    }
    for (const edge of edges.filter(edge => edge.relationshipType === "part_of" && edge.toEntityId === workItemId)) {
      const child = await requiredRecord(store, projectId, edge.fromEntityId);
      if (child.entityType !== "WorkItem" || child.body.workState !== "closed") blockers.push(`open-child:${child.id}`);
    }
    const repairIds = new Set<EntityId>([workItemId]);
    for (let pass = 0; pass < edges.length + 1; pass++) {
      const size = repairIds.size;
      for (const edge of edges) if (edge.relationshipType === "repairs" && repairIds.has(edge.toEntityId)) repairIds.add(edge.fromEntityId);
      if (repairIds.size === size) break;
    }
    repairIds.delete(workItemId);
    for (const id of repairIds) {
      const repair = await requiredRecord(store, projectId, id);
      if (repair.entityType !== "WorkItem" || repair.body.workState !== "closed") blockers.push(`open-repair:${id}`);
    }
    const solutionIds = edges.filter(edge => edge.relationshipType === "implements" && edge.fromEntityId === workItemId).map(edge => edge.toEntityId);
    const criterionIds = new Set(edges.filter(edge => edge.relationshipType === "defines_criterion" && [workItemId, ...solutionIds].includes(edge.fromEntityId)).map(edge => edge.toEntityId));
    for (const id of criterionIds) {
      const criterion = await requiredRecord(store, projectId, id);
      if (criterion.entityType !== "Criterion" || criterion.lifecycleState !== "active" || criterion.body.criticality !== "required" || criterion.body.validationPolicy === "deferred_visual_phase") continue;
      if (criterion.body.validationPolicy === "operator_decision") {
        const disposition = await getEffectiveDisposition(projectId, workItemId);
        if (!["approved", "accepted"].includes(disposition.state)) blockers.push(`operator-decision:${id}`);
      } else {
        const proof = await getCriterionValidationStatus(projectId, id, currentSourceBaselineRef);
        if (!proof.satisfied) blockers.push(`criterion:${id}`);
        else if (criterion.body.validationPolicy === "semantic_ai" && proof.validationId && latestAttempt) {
          const review = await requiredRecord(store, projectId, proof.validationId);
          if (review.entityType !== "Validation" || review.body.performedBy.principalId === latestAttempt.createdBy.principalId) blockers.push(`independent-review:${id}`);
        }
      }
    }
    const disposition = await getEffectiveDisposition(projectId, workItemId);
    if (["proposed", "revision_requested", "rejected", "revoked"].includes(disposition.state)) blockers.push("blocking-disposition");
    for (const edge of edges.filter(edge => edge.relationshipType === "blocks" && edge.toEntityId === workItemId)) {
      const source = await requiredRecord(store, projectId, edge.fromEntityId);
      if (source.lifecycleState === "active") blockers.push(`blocking-record:${source.id}`);
    }
    return { entityId: workItemId, eligible: blockers.length === 0, blockers: [...new Set(blockers)].sort() };
  }

  async function getPhaseCompletionEligibility(projectId: ProjectId, phaseId: EntityId, currentSourceBaselineRef?: string): Promise<CompletionEligibility> {
    const phase = await requiredRecord(store, projectId, phaseId);
    if (phase.entityType !== "Phase") fail("Phase identity is required.");
    const blockers: string[] = [];
    if (["superseded", "voided"].includes(phase.lifecycleState) || phase.body.phaseState === "cancelled") blockers.push("phase-terminal");
    const plan = await getExecutionPlan(projectId);
    const membership = plan.phases.find(item => item.phaseId === phaseId);
    for (const id of membership?.workItemIds ?? []) {
      const workItem = await requiredRecord(store, projectId, id);
      if (workItem.entityType !== "WorkItem" || workItem.body.workState !== "closed") blockers.push(`open-work-item:${id}`);
    }
    for (const id of membership?.criterionIds ?? []) {
      const criterion = await requiredRecord(store, projectId, id);
      if (criterion.entityType !== "Criterion" || criterion.lifecycleState !== "active" || criterion.body.criticality !== "required") continue;
      if (criterion.body.validationPolicy === "operator_decision") {
        const disposition = await getEffectiveDisposition(projectId, phaseId);
        if (!["approved", "accepted"].includes(disposition.state)) blockers.push(`operator-decision:${id}`);
      } else if (!(await getCriterionValidationStatus(projectId, id, currentSourceBaselineRef)).satisfied) blockers.push(`criterion:${id}`);
    }
    const disposition = await getEffectiveDisposition(projectId, phaseId);
    if (["proposed", "revision_requested", "rejected", "revoked"].includes(disposition.state)) blockers.push("blocking-disposition");
    const edges = (await store.listRelationships(projectId, "blocks")).filter(edge => edge.toEntityId === phaseId && !edge.endedAt);
    for (const edge of edges) {
      const source = await requiredRecord(store, projectId, edge.fromEntityId);
      if (source.lifecycleState === "active") blockers.push(`blocking-record:${source.id}`);
    }
    return { entityId: phaseId, eligible: blockers.length === 0, blockers: [...new Set(blockers)].sort() };
  }

  async function getWorkRouteHistory(projectId: ProjectId, intakeId: EntityId): Promise<WorkRouteHistory> {
    const intake = await requiredRecord(store, projectId, intakeId);
    if (intake.entityType !== "WorkIntake") fail("Work Intake identity is required.");
    const edges = await store.listRelationships(projectId);
    const assessmentIds = new Set(edges.filter(edge => edge.relationshipType === "assesses_route" && edge.toEntityId === intakeId && !edge.endedAt).map(edge => edge.fromEntityId));
    const decisionIds = new Set(edges.filter(edge => edge.relationshipType === "governs" && edge.toEntityId === intakeId && !edge.endedAt).map(edge => edge.fromEntityId));
    const sequence = new Map((await store.listOutbox(projectId))
      .filter(event => event.entityId && event.payload.operation === "create").map(event => [event.entityId as string, event.sequence]));
    const assessments = (await store.listEntities(projectId, "RouteAssessment"))
      .filter((record): record is ProjectStateRecord<"RouteAssessment"> => record.entityType === "RouteAssessment")
      .filter(record => assessmentIds.has(record.id) && record.body.workIntakeId === intakeId)
      .sort((a, b) => (sequence.get(a.id) ?? 0) - (sequence.get(b.id) ?? 0) || a.id.localeCompare(b.id));
    const decisions = (await store.listEntities(projectId, "Decision"))
      .filter((record): record is ProjectStateRecord<"Decision"> => record.entityType === "Decision")
      .filter(record => decisionIds.has(record.id) && record.body.decisionType === "work-intake-route")
      .sort((a, b) => (sequence.get(a.id) ?? 0) - (sequence.get(b.id) ?? 0) || a.id.localeCompare(b.id));
    const ids = new Set([...assessmentIds, ...decisionIds, intakeId]);
    return { assessments, decisions, relationships: edges.filter(edge => ids.has(edge.fromEntityId) && ids.has(edge.toEntityId)
      && ["assesses_route", "governs", "derived_from", "supersedes"].includes(edge.relationshipType)) };
  }

  async function getCurrentWorkRoute(projectId: ProjectId, intakeId: EntityId): Promise<CurrentWorkRoute | null> {
    const history = await getWorkRouteHistory(projectId, intakeId);
    const assessments = new Set(history.assessments.map(record => record.id));
    const assessedByDecision = new Map(history.relationships.filter(edge => edge.relationshipType === "derived_from" && assessments.has(edge.toEntityId) && !edge.endedAt)
      .map(edge => [edge.fromEntityId, edge.toEntityId]));
    const now = new Date().toISOString();
    const sequence = new Map((await store.listOutbox(projectId))
      .filter(event => event.entityId && event.payload.operation === "create").map(event => [event.entityId as string, event.sequence]));
    const lineageFirst = new Map<string, number>();
    for (const decision of history.decisions) {
      const candidate = sequence.get(decision.id) ?? 0;
      const prior = lineageFirst.get(decision.lineageId);
      if (prior === undefined || candidate < prior) lineageFirst.set(decision.lineageId, candidate);
    }
    const applicable = history.decisions.filter(decision => decision.lifecycleState === "active"
      && decision.body.decidedBy.principalType === "human" && decision.body.decisionRole === "Operator"
      && decision.body.effectiveAt <= now && workRoutes.has(decision.body.outcome as WorkRoute)
      && assessedByDecision.has(decision.id))
      .sort((a, b) => a.body.effectiveAt.localeCompare(b.body.effectiveAt)
        || (lineageFirst.get(a.lineageId) ?? 0) - (lineageFirst.get(b.lineageId) ?? 0) || a.id.localeCompare(b.id));
    const current = applicable.at(-1);
    return current ? { route: current.body.outcome as WorkRoute, decisionId: current.id,
      assessmentId: assessedByDecision.get(current.id) ?? null, effectiveAt: current.body.effectiveAt } : null;
  }

  async function getWorkIntakeSummary(projectId: ProjectId, intakeId: EntityId): Promise<WorkIntakeSummary> {
    const intake = await requiredRecord(store, projectId, intakeId);
    if (intake.entityType !== "WorkIntake") fail("Work Intake identity is required.");
    const workflows = (await store.listRelationships(projectId, "initiates"))
      .filter(edge => edge.fromEntityId === intakeId && !edge.endedAt);
    if (workflows.length !== 1) fail("Work Intake must initiate exactly one Workflow.");
    const history = await getWorkRouteHistory(projectId, intakeId);
    return { intakeId, request: intake.body.request, desiredOutcome: intake.body.desiredOutcome,
      constraints: [...intake.body.constraints], evidenceContext: [...intake.body.evidenceContext],
      intakeState: intake.body.intakeState, requestedIntegrationTarget: intake.body.requestedIntegrationTarget,
      workflowId: workflows[0].toEntityId, currentRoute: await getCurrentWorkRoute(projectId, intakeId),
      assessmentIds: history.assessments.map(record => record.id), routeDecisionIds: history.decisions.map(record => record.id) };
  }

  async function completeWorkItem(projectId: ProjectId, workItemId: EntityId, expectedRevision: number, currentSourceBaselineRef?: string, context?: MutationContext) {
    return store.transaction(projectId, async unit => {
      const current = await requiredRecord(unit, projectId, workItemId);
      if (current.entityType !== "WorkItem" || current.recordVersion !== expectedRevision || current.body.workState === "closed") fail("Work Item completion target is unavailable or stale.");
      const eligibility = await getWorkItemCompletionEligibility(projectId, workItemId, currentSourceBaselineRef);
      if (!eligibility.eligible) fail(`Work Item completion is blocked: ${eligibility.blockers.join(", ")}.`);
      const now = new Date().toISOString();
      const next = validateProjectStateEntity({ ...current, recordVersion: expectedRevision + 1,
        lifecycleState: "closed", closedAt: now, updatedAt: now, updatedBy: trustedPrincipal,
        body: { ...current.body, workState: "closed" } });
      await unit.saveEntity(next, expectedRevision);
      await recordMutation(unit, { projectId, entityId: workItemId, fromVersion: expectedRevision, toVersion: next.recordVersion,
        operation: "revise", eventType: PROJECT_STATE_EVENT_TYPES.revise, occurredAt: now,
        changedFields: ["closedAt", "lifecycleState", "workState"], defaultReason: "Complete Work Item", context });
      return next;
    });
  }

  async function completePhase(projectId: ProjectId, phaseId: EntityId, expectedRevision: number, currentSourceBaselineRef?: string, context?: MutationContext) {
    return store.transaction(projectId, async unit => {
      const current = await requiredRecord(unit, projectId, phaseId);
      if (current.entityType !== "Phase" || current.recordVersion !== expectedRevision || current.body.phaseState === "closed") fail("Phase completion target is unavailable or stale.");
      const eligibility = await getPhaseCompletionEligibility(projectId, phaseId, currentSourceBaselineRef);
      if (!eligibility.eligible) fail(`Phase completion is blocked: ${eligibility.blockers.join(", ")}.`);
      const now = new Date().toISOString();
      const next = validateProjectStateEntity({ ...current, recordVersion: expectedRevision + 1,
        lifecycleState: "closed", closedAt: now, updatedAt: now, updatedBy: trustedPrincipal,
        body: { ...current.body, phaseState: "closed" } });
      await unit.saveEntity(next, expectedRevision);
      await recordMutation(unit, { projectId, entityId: phaseId, fromVersion: expectedRevision, toVersion: next.recordVersion,
        operation: "revise", eventType: PROJECT_STATE_EVENT_TYPES.revise, occurredAt: now,
        changedFields: ["closedAt", "lifecycleState", "phaseState"], defaultReason: "Complete Phase", context });
      return next;
    });
  }

  async function getEffectiveDisposition(projectId: ProjectId, targetId: EntityId, asOf = new Date().toISOString()): Promise<EffectiveDisposition> {
    if (!canonicalInstant(asOf)) fail("Disposition query time must be canonical UTC.");
    if (!await store.getEntity(projectId, targetId)) fail("Disposition target does not exist in this Project.");
    const governingIds = new Set((await store.listRelationships(projectId, "governs"))
      .filter(edge => edge.toEntityId === targetId && !edge.endedAt).map(edge => edge.fromEntityId));
    const decisions = (await store.listEntities(projectId, "Decision"))
      .filter((record): record is ProjectStateRecord<"Decision"> => record.entityType === "Decision");
    const lineageById = new Map(decisions.map(record => [record.id, record.lineageId]));
    const firstSequenceByLineage = new Map<string, number>();
    for (const event of await store.listOutbox(projectId)) {
      const lineageId = event.entityId ? lineageById.get(event.entityId) : undefined;
      if (lineageId && event.payload.operation === "create" && !firstSequenceByLineage.has(lineageId)) {
        firstSequenceByLineage.set(lineageId, event.sequence);
      }
    }
    const applicable = decisions
      .filter(record => governingIds.has(record.id) && record.lifecycleState === "active"
        && record.body.decidedBy.principalType === "human" && record.body.decisionRole === "Operator"
        && dispositionOutcomes.has(record.body.outcome as DispositionState) && record.body.effectiveAt <= asOf)
      .sort((a, b) => a.body.effectiveAt.localeCompare(b.body.effectiveAt)
        || (firstSequenceByLineage.get(a.lineageId) ?? 0) - (firstSequenceByLineage.get(b.lineageId) ?? 0)
        || a.id.localeCompare(b.id));
    const current = applicable.at(-1);
    return current ? { state: current.body.outcome as DispositionState, decisionId: current.id,
      effectiveAt: current.body.effectiveAt } : { state: "none", decisionId: null, effectiveAt: null };
  }

  async function getRequiredOperatorDecisions(projectId: ProjectId): Promise<RequiredOperatorDecision[]> {
    const criteria = (await store.listEntities(projectId, "Criterion"))
      .filter((record): record is ProjectStateRecord<"Criterion"> => record.entityType === "Criterion")
      .filter(record => record.lifecycleState === "active" && record.body.validationPolicy === "operator_decision");
    const definitions = (await store.listRelationships(projectId, "defines_criterion")).filter(edge => !edge.endedAt);
    const pending: RequiredOperatorDecision[] = [];
    for (const criterion of criteria) {
      const targets = definitions.filter(edge => edge.toEntityId === criterion.id).map(edge => edge.fromEntityId);
      for (const targetId of targets.length ? targets : [criterion.id]) {
        const disposition = await getEffectiveDisposition(projectId, targetId);
        if (["none", "advisory", "proposed", "revoked"].includes(disposition.state)) {
          pending.push({ criterionId: criterion.id, targetId, currentDisposition: disposition.state });
        }
      }
    }
    return pending.sort((a, b) => a.targetId.localeCompare(b.targetId) || a.criterionId.localeCompare(b.criterionId));
  }

  return { createRecord, createWorkflow, createWorkIntake, reviseWorkIntake, advanceWorkIntake, recordRouteAssessment, recordRouteDecision,
    createSourceBinding, updateSourceBinding, createSourceCheckpoint, advanceSourceCheckpoint, createIntegrationRecord, advanceIntegrationRecord,
    createRegressionObligation, setRegressionObligationState, recordTestLifecycleAssessment, recordImplementationProof, recordPermanentTestReference, linkPermanentTestReference,
    reviseRecord, supersedeRecord, createRelationship, endRelationship, recordDecision, supersedeDecision, recordValidation, recordEvidence, recordImplementation, completeWorkItem, completePhase,
    getRecord, queryRecords, getCurrentRecord, getRecordHistory, getRelationships, getLineage, getProjectStateSummary, getEvidence,
    getEffectiveDisposition, getRequiredOperatorDecisions, getValidationFreshness, getCriterionValidationStatus,
    getImplementationAttempts, getExecutionPlan, getWorkItemCompletionEligibility, getPhaseCompletionEligibility,
    getWorkRouteHistory, getCurrentWorkRoute, getWorkIntakeSummary, getSourceSemanticView, getRegressionObligationView };
}
