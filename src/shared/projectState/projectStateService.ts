import type { DispositionState, EntityBodyMap, EntityId, EntityType, LifecycleState, PrincipalRef, ProjectId, ProjectStateEntity, ProjectStateRecord, TestLifecycleAssessmentStatus, ValidationMode, WorkflowState, WorkIntakeState, WorkRoute } from "./domainContracts";
import { getWorkflowTypeDefinition, workflowTypeForWorkRoute, type ExistingProjectWorkRoute, type WorkflowType } from "./workflowTypeRegistry";
import { assertSupersession } from "./domainInvariants";
import { isTesterOwnedPath } from "./testerOwnedPathPolicy";
import { createProjectStateEntity, ENTITY_TYPE_REGISTRY, ProjectStateDomainError, validateProjectStateEntity } from "./entityTypeRegistry";
import { createRelationship as createDomainRelationship, RELATIONSHIP_REGISTRY, type ProjectStateRelationship, type RelationshipType } from "./relationshipRegistry";
import type { ProjectStateOutboxEvent, ProjectStateStore, ProjectStateUnitOfWork, StateChange } from "./projectStateStore";

export interface RecordQuery { entityType?: EntityType; lifecycleState?: LifecycleState; workflowId?: EntityId; workItemId?: EntityId; decisionId?: EntityId; decisionOutcome?: string; dispositionState?: DispositionState; updatedFrom?: string; updatedThrough?: string; relatedTo?: EntityId; relationshipType?: RelationshipType; relationshipDirection?: "from" | "to" | "either"; current?: boolean; offset?: number; limit?: number }
export interface RecordQueryPage { records: ProjectStateEntity[]; offset: number; limit: number; totalMatches: number; truncated: boolean; nextOffset: number | null }
export interface CurrentProjectStateView {
  project: ProjectStateRecord<"Project">;
  sections: Record<string, { offset: number; limit: number; total: number; truncated: boolean; nextOffset: number | null }>;
  workIntakes: { id: EntityId; state: WorkIntakeState; routingWorkflowId: EntityId | null; targetWorkflowId: EntityId | null; route: CurrentWorkRoute | null }[];
  workflows: { id: EntityId; type: WorkflowType; title: string; state: WorkflowState; currentWorkspace: string }[];
  phases: { id: EntityId; state: EntityBodyMap["Phase"]["phaseState"]; sequence: number; workItemIds: EntityId[] }[];
  workItems: { id: EntityId; state: EntityBodyMap["WorkItem"]["workState"]; kind: EntityBodyMap["WorkItem"]["workItemKind"]; repairTargetIds: EntityId[]; latestImplementationId: EntityId | null; latestValidationId: EntityId | null }[];
  decisions: { id: EntityId; outcome: string; targetIds: EntityId[]; effectiveAt: string }[];
  validations: { id: EntityId; targetId: EntityId; targetVersion: number; outcome: EntityBodyMap["Validation"]["outcome"]; sourceBaselineRef: string | null }[];
  sourceBindings: { id: EntityId; workflowId: EntityId; sourceBaselineId: EntityId; preparationState: EntityBodyMap["SourceBinding"]["preparationState"]; workSourceLineId: string | null; currentRevisionId: string | null; repositoryCheckoutId: string | null }[];
  sourceCheckpoints: { id: EntityId; workflowId: EntityId; state: EntityBodyMap["SourceCheckpoint"]["checkpointState"]; expectedRevisionId: string; resultingRevisionId: string | null }[];
  integrations: { id: EntityId; workflowId: EntityId; state: EntityBodyMap["IntegrationRecord"]["integrationState"]; outcome: EntityBodyMap["IntegrationRecord"]["outcome"]; incomingRevisionId: string; resultRevisionId: string | null }[];
}
export type ProjectionType = "work-intake" | "work-item" | "repair" | "fix" | "validation" | "implementation-report" | "route-history" | "decision-history" | "project-state-summary";
export interface ProjectionMetadata { projectionType: ProjectionType; projectionVersion: 1; projectId: ProjectId; sourceEntityIds: EntityId[]; generatedAt: string; authoritative: false }
export interface RenderedProjectStateView { metadata: ProjectionMetadata; markdown: string }
export interface StructuredProjectStateExport { exportVersion: 1; projectId: ProjectId; generatedAt: string; authoritative: true; records: ProjectStateEntity[]; history: { entityId: EntityId; versions: ProjectStateEntity[] }[]; relationships: ProjectStateRelationship[]; stateChanges: StateChange[] }
export type AuthoritativeContextScope = "project" | "workflow" | "work-item" | "work-intake";
export interface AuthoritativeContext { projectId: ProjectId; scope: AuthoritativeContextScope; rootEntityId: EntityId; authoritative: true; records: ProjectStateEntity[]; relationships: ProjectStateRelationship[]; decisions: EntityId[]; validations: EntityId[]; sourceReferences: { entityId: EntityId; field: string; reference: string }[]; offset: number; limit: number; totalMatches: number; truncated: boolean; nextOffset: number | null }
export interface DerivedEventCursor { projectId: ProjectId; sequence: number; eventId: string | null }
export interface CommittedEventFeed { projectId: ProjectId; events: ProjectStateOutboxEvent[]; nextCursor: DerivedEventCursor; hasMore: boolean }
export interface ProjectStateSummary { projectId: ProjectId; totalRecords: number; activeRecords: number; countsByType: Partial<Record<EntityType, number>> }
export interface RecordHistory { lineageId: string; records: ProjectStateEntity[] }
export interface RecordLineage { records: ProjectStateEntity[]; relationships: ProjectStateRelationship[] }
export interface MutationContext { reason?: string; causationId?: string; correlationId?: string }
export interface SubstantiveWorkflowCreationInput {
  workflowType: WorkflowType;
  title: string;
  entryWorkspace: string;
  sourceSeed?: { repositoryId: string; integrationTargetSourceLineId: string; baseRevisionId: string };
}
export interface DecisionInput { decisionType: string; outcome: string; decisionScope: string; rationale?: string; effectiveAt?: string }
export interface IssueRootCauseCandidateInput { title: string; statement: string; rationale: string; confidence?: number; findingIds: EntityId[]; evidenceIds: EntityId[] }
export interface IssueRcaAcceptanceInput { workflowId: EntityId; rationale: string; rootCauses: IssueRootCauseCandidateInput[] }
export interface FeatureAssessmentCandidate {
  currentProductBaseline: string;
  requestedCapabilityDelta: string;
  behaviorContractsToPreserve: string;
  affectedArchitectureIntegrationPoints: string;
  compatibilityRollout: string;
  regressionBoundary: string;
  excludedFutureWork: string;
}
export interface FeatureAssessmentAcceptanceInput { workflowId: EntityId; rationale: string; assessment: FeatureAssessmentCandidate }
export interface EffectiveDisposition { state: DispositionState; decisionId: EntityId | null; effectiveAt: string | null }
export interface RequiredOperatorDecision { criterionId: EntityId; targetId: EntityId; currentDisposition: DispositionState }
export type ValidationStaleReason = "target-version-changed" | "target-superseded" | "source-baseline-changed";
export interface ValidationFreshness { validationId: EntityId; targetEntityId: EntityId; targetRecordVersion: number; current: boolean; staleReason: ValidationStaleReason | null }
export interface CriterionValidationStatus { criterionId: EntityId; policy: EntityBodyMap["Criterion"]["validationPolicy"]; satisfied: boolean; validationId: EntityId | null; reason: "current-pass" | "no-current-validation" | "latest-validation-not-pass" | "deferred-to-phase" | "operator-decision-required" }
export interface CompletionEligibility { entityId: EntityId; eligible: boolean; blockers: string[] }
export interface ExecutionPlanView { phases: { phaseId: EntityId; sequence: number; workItemIds: EntityId[]; criterionIds: EntityId[] }[]; directWorkItemIds: EntityId[]; dependencyIds: { from: EntityId; to: EntityId }[]; repairIds: { from: EntityId; to: EntityId }[] }
export interface WorkflowPlanningGraph {
  workflowId: EntityId; topology: "direct" | "phased";
  solutionAddresses?: EntityId[];
  solution: { title: string; objective: string; scopeIn: string[]; scopeOut: string[]; constraints: string[]; assumptions: string[]; risks: string[] };
  solutionCriteria: Array<{ statement: string; criticality: "required" | "optional" | "informational"; verificationIntent: string; validationPolicy: EntityBodyMap["Criterion"]["validationPolicy"] }>;
  phases?: Array<{ key: string; title: string; objective: string; sequence: number; criteria?: Array<{ statement: string; criticality: "required" | "optional" | "informational"; verificationIntent: string; validationPolicy: EntityBodyMap["Criterion"]["validationPolicy"] }> }>;
  workItems: Array<{ key: string; kind: EntityBodyMap["WorkItem"]["workItemKind"]; title: string; objective: string; phaseKey?: string; dependencyKeys: string[]; criteria: Array<{ statement: string; criticality: "required" | "optional" | "informational"; verificationIntent: string; validationPolicy: EntityBodyMap["Criterion"]["validationPolicy"] }> }>;
}
export interface WorkflowExecutionPlanView extends ExecutionPlanView {
  workflow: ProjectStateRecord<"Workflow">; solutions: ProjectStateRecord<"BoundedSolution">[];
  phases: Array<ExecutionPlanView["phases"][number] & { record: ProjectStateRecord<"Phase"> }>;
  directWorkItems: ProjectStateRecord<"WorkItem">[]; workItemsByPhase: Record<string, ProjectStateRecord<"WorkItem">[]>;
  criteria: { ownerId: EntityId; record: ProjectStateRecord<"Criterion"> }[];
  decisions: ProjectStateRecord<"Decision">[];
}
export interface WorkItemDecompositionCandidate {
  key: string; kind: EntityBodyMap["WorkItem"]["workItemKind"]; title: string; objective: string;
  solutionId?: EntityId; dependencyWorkItemIds: EntityId[]; dependencyReplacementKeys: string[];
}
export type WorkItemCriterionDisposition =
  | { criterionId: EntityId; disposition: "transfer"; replacementKey: string }
  | { criterionId: EntityId; disposition: "elevate"; owner: "phase" | "solution" }
  | { criterionId: EntityId; disposition: "split"; replacements: Array<{ owner: { kind: "replacement"; key: string } | { kind: "phase" } | { kind: "solution" }; criterion: Omit<EntityBodyMap["Criterion"], "criterionState"> & { criterionState?: string } }> };
export interface WorkItemDecompositionInput {
  workflowId: EntityId; workItemId: EntityId; expectedWorkItemVersion: number;
  replacements: WorkItemDecompositionCandidate[];
  criterionDispositions: WorkItemCriterionDisposition[];
  incomingDependentMappings: Array<{ dependentWorkItemId: EntityId; replacementKeys: string[] }>;
}
export interface CurrentWorkRoute { route: WorkRoute; decisionId: EntityId; assessmentId: EntityId | null; effectiveAt: string }
export interface WorkIntakeSummary { intakeId: EntityId; request: string; desiredOutcome: string; constraints: string[]; evidenceContext: string[]; intakeState: WorkIntakeState; requestedIntegrationTarget: string; routingWorkflowId: EntityId; targetWorkflowId: EntityId | null; currentRoute: CurrentWorkRoute | null; assessmentIds: EntityId[]; routeDecisionIds: EntityId[] }
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

const restrictedGenericTypes = new Set<EntityType>(["Decision", "Validation", "Evidence", "TesterResult"]);
function fail(message: string): never { throw new ProjectStateDomainError(message); }
const dispositionOutcomes = new Set<DispositionState>(["advisory", "proposed", "approved", "revision_requested", "accepted", "rejected", "revoked"]);
const workRoutes = new Set<WorkRoute>(["greenfield", "feature-change", "refactor-migration", "integration-composition", "infrastructure-platform", "research-prototype", "issue-resolution"]);
function intakeRecordVersionSource(record: ProjectStateEntity): number | null {
  if (record.entityType !== "RouteAssessment") return null;
  const match = /^work-intake-record-version:(\d+)(?:;dev-head:[a-f0-9]{40}(?:[a-f0-9]{24})?)?$/i.exec(record.provenance.sourceRef ?? "");
  return match ? Number(match[1]) : null;
}
const lifecycleAssessmentStatuses = new Set<TestLifecycleAssessmentStatus>(["PRESERVE", "REWRITE_CANDIDATE", "SPLIT_CANDIDATE", "CONSOLIDATE_CANDIDATE", "MIGRATE_CANDIDATE", "RETIRE_CANDIDATE", "QUARANTINE_CANDIDATE", "NEEDS_TESTER_REVIEW"]);
/** Consumers persist this cursor in their own derived store; Project State never owns that checkpoint. */
export function advanceDerivedEventCursor(cursor: DerivedEventCursor, event: ProjectStateOutboxEvent): DerivedEventCursor {
  if (!cursor || typeof cursor.projectId !== "string" || !Number.isSafeInteger(cursor.sequence) || cursor.sequence < 0 || (cursor.sequence === 0 ? cursor.eventId !== null : typeof cursor.eventId !== "string" || !cursor.eventId)) fail("Invalid derived event cursor.");
  if (event.projectId !== cursor.projectId) fail("Derived event cursor Project mismatch.");
  if (event.sequence < cursor.sequence) return cursor;
  if (event.sequence === cursor.sequence) {
    if (event.id !== cursor.eventId) fail("Derived event cursor conflicts with a committed event.");
    return cursor;
  }
  if (event.sequence !== cursor.sequence + 1) fail("Derived event cursor has a sequence gap.");
  return { projectId: cursor.projectId, sequence: event.sequence, eventId: event.id };
}
function validateTestPath(path: string) {
  if (typeof path !== "string" || path.length > 512 || !/^test\/(?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]+\.test\.cjs$/.test(path) || path.split("/").includes("..")) fail("Permanent test locator must be a repository-relative test path.");
}
function validateTesterOwnedPath(path: string) {
  if (!isTesterOwnedPath(path)) {
    fail("Tester result paths must stay within test-owned repository surfaces.");
  }
}
function canonicalInstant(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}
function markdownValue(value: unknown): string {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.replace(/\r?\n/g, " ").replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function markdownRecord(record: ProjectStateEntity): string {
  const rows = [
    ["id", record.id], ["type", record.entityType], ["version", record.recordVersion],
    ["lifecycle", record.lifecycleState], ["lineage", record.lineageId], ["provenance", record.provenance],
    ...Object.entries(record.body),
  ];
  return [`## ${record.entityType} ${record.id}`, "", "| Field | Value |", "| --- | --- |",
    ...rows.map(([field, value]) => `| ${markdownValue(field)} | ${markdownValue(value)} |`), ""].join("\n");
}
function decisionBody(input: DecisionInput, principal: PrincipalRef, decidedAt: string, defaultEffectiveAt = decidedAt): EntityBodyMap["Decision"] {
  const content = exactInput(input, ["decisionType", "outcome", "rationale", "decisionScope", "effectiveAt"]);
  if (content.rationale !== undefined && typeof content.rationale !== "string") fail("Decision rationale must be text.");
  if (content.effectiveAt !== undefined && (typeof content.effectiveAt !== "string" || !canonicalInstant(content.effectiveAt))) fail("Decision effective time must be canonical UTC.");
  return { decisionType: input.decisionType, outcome: input.outcome, decisionScope: input.decisionScope,
    rationale: input.rationale ?? "", decisionRole: principal.role, decidedBy: principal,
    decidedAt, effectiveAt: input.effectiveAt ?? defaultEffectiveAt };
}
function assertSourceBindingBody(body: EntityBodyMap["SourceBinding"], baseline?: EntityBodyMap["SourceBaseline"]) {
  if (body.currentRevisionId && !body.workSourceLineId) fail("Current revision requires a work SourceLine.");
  if (body.preparationState === "ready" && (!baseline?.baseRevisionId || !body.workSourceLineId || !body.currentRevisionId || !body.repositoryCheckoutId || body.failureCode)) fail("Ready SourceBinding requires baseline, work line, current revision and checkout without failure.");
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

async function requireCurrentSourceWorkflow(unit: ProjectStateUnitOfWork, projectId: ProjectId, workflow: ProjectStateEntity) {
  if (workflow.entityType !== "Workflow" || workflow.lifecycleState !== "active" ||
    workflow.body.workflowType === "work-intake-routing" || ["closed", "cancelled"].includes(workflow.body.workflowState))
    fail("Source lifecycle records require the current active nonterminal substantive Workflow.");
  const current = (await unit.listEntities(projectId, "Workflow")).filter(record => record.entityType === "Workflow" &&
    record.lineageId === workflow.lineageId && record.lifecycleState !== "superseded" && record.lifecycleState !== "voided" &&
    record.lifecycleState === "active" && record.body.workflowType !== "work-intake-routing" &&
    !["closed", "cancelled"].includes(record.body.workflowState));
  if (current.length !== 1) fail("Workflow lineage has no unique current source lifecycle owner.");
  if (current[0].id !== workflow.id) fail("Source lifecycle records require the current Workflow owner ID.");
  return current[0];
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
    relationshipType: RelationshipType, context?: MutationContext, additionalLookupRecords: readonly ProjectStateEntity[] = []) {
    const additional = new Map(additionalLookupRecords.map(record => [record.id, record]));
    const edge = createDomainRelationship({ projectId, fromEntityId: from.id, relationshipType,
      toEntityId: to.id, createdBy: trustedPrincipal }, id => id === from.id ? from : id === to.id ? to : additional.get(id));
    await unit.saveRelationship(edge);
    await recordMutation(unit, { projectId, entityId: from.id, fromVersion: from.recordVersion, toVersion: from.recordVersion,
      operation: "relationship-create", eventType: PROJECT_STATE_EVENT_TYPES.relationshipCreate, occurredAt: edge.createdAt,
      changedFields: [`relationship:${relationshipType}`], defaultReason: `Link ${relationshipType}`, context, relationshipId: edge.id });
    return edge;
  }

  async function createRecord<T extends EntityType>(projectId: ProjectId | null, entityType: T, content: EntityBodyMap[T], context?: MutationContext) {
    if (restrictedGenericTypes.has(entityType)) fail("Decision, Validation, Evidence and TesterResult require typed commands.");
    if (entityType === "ImplementationRecord" || entityType === "Workflow") fail("ImplementationRecord and Workflow require typed commands.");
    if (entityType === "WorkIntake" || entityType === "RouteAssessment") fail("Work Intake and Route Assessment require typed commands.");
    if (["SourceBaseline", "SourceBinding", "SourceCheckpoint", "IntegrationRecord"].includes(entityType)) fail("Source semantic records require typed commands.");
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

  async function createWorkflowRecord(unit: ProjectStateUnitOfWork, projectId: ProjectId,
    input: { workflowType: WorkflowType; title: string; currentWorkspace: string; workflowState?: WorkflowState }, context?: MutationContext) {
    const definition = getWorkflowTypeDefinition(input.workflowType);
    if (!definition) fail("Unsupported Workflow type.");
    if (!definition.repeatable && (await unit.listEntities(projectId, "Workflow")).some(record => record.entityType === "Workflow" && record.body.workflowType === input.workflowType))
      fail(`Project already has its non-repeatable ${input.workflowType} Workflow.`);
    const record = createProjectStateEntity({ entityType: "Workflow", projectId,
      body: { workflowType: input.workflowType, title: input.title, currentWorkspace: input.currentWorkspace,
        workflowState: input.workflowState ?? "active" }, principal: trustedPrincipal,
      provenance: { origin: "native", ...(context?.correlationId ? { correlationId: context.correlationId } : {}) } });
    await unit.saveEntity(record, null);
    await recordMutation(unit, { projectId, entityId: record.id, fromVersion: null, toVersion: 1,
      operation: "create", eventType: PROJECT_STATE_EVENT_TYPES.create, occurredAt: record.createdAt,
      changedFields: Object.keys(record.body), defaultReason: "Create Workflow", context });
    return record;
  }

  async function createWorkflow(projectId: ProjectId, input: { workflowType: WorkflowType; title: string; currentWorkspace: string; workflowState?: WorkflowState }, context?: MutationContext) {
    exactInput(input, ["workflowType", "title", "currentWorkspace", "workflowState"]);
    return store.transaction(projectId, async unit => {
      if (!await unit.getProject(projectId)) fail("Owning Project does not exist.");
      return createWorkflowRecord(unit, projectId, input, context);
    });
  }

  /** Atomic primitive exposed for compound commands such as WIR target handoff. */
  async function createSubstantiveWorkflowInUnitOfWork(unit: ProjectStateUnitOfWork, projectId: ProjectId,
    input: SubstantiveWorkflowCreationInput, context?: MutationContext) {
    exactInput(input, ["workflowType", "title", "entryWorkspace", "sourceSeed"]);
    const definition = getWorkflowTypeDefinition(input.workflowType);
    if (!definition || !definition.directStart) fail("Only repeatable substantive Workflow types can be created by this command.");
    if (typeof input.title !== "string" || !input.title.trim() || input.title.trim().length > 200)
      fail("Workflow title must contain 1 to 200 characters.");
    if (input.entryWorkspace !== definition.entryWorkspace) fail("Workflow entry workspace must match the canonical type registry.");
    if (!await unit.getProject(projectId)) fail("Owning Project does not exist.");
    const workflow = await createWorkflowRecord(unit, projectId, { workflowType: input.workflowType,
      title: input.title.trim(), currentWorkspace: definition.entryWorkspace, workflowState: "active" }, context);
    let sourceBaseline: ProjectStateRecord<"SourceBaseline"> | null = null;
    let sourceBinding: ProjectStateRecord<"SourceBinding"> | null = null;
    if (input.sourceSeed !== undefined) {
      exactInput(input.sourceSeed, ["repositoryId", "integrationTargetSourceLineId", "baseRevisionId"]);
      const body: EntityBodyMap["SourceBaseline"] = { workflowId: workflow.id, ...input.sourceSeed };
      sourceBaseline = createProjectStateEntity({ entityType: "SourceBaseline", projectId, body, principal: trustedPrincipal });
      await unit.saveEntity(sourceBaseline, null);
      await recordMutation(unit, { projectId, entityId: sourceBaseline.id, fromVersion: null, toVersion: 1,
        operation: "create", eventType: PROJECT_STATE_EVENT_TYPES.create, occurredAt: sourceBaseline.createdAt,
        changedFields: Object.keys(sourceBaseline.body), defaultReason: "Capture Workflow SourceBaseline", context });
      await linkSemantic(unit, projectId, sourceBaseline, workflow, "baselines_source", context);
      const bindingBody: EntityBodyMap["SourceBinding"] = { workflowId: workflow.id, sourceBaselineId: sourceBaseline.id, preparationState: "unprepared" };
      assertSourceBindingBody(bindingBody, sourceBaseline.body);
      sourceBinding = createProjectStateEntity({ entityType: "SourceBinding", projectId, body: bindingBody, principal: trustedPrincipal });
      await unit.saveEntity(sourceBinding, null);
      await recordMutation(unit, { projectId, entityId: sourceBinding.id, fromVersion: null, toVersion: 1,
        operation: "create", eventType: PROJECT_STATE_EVENT_TYPES.create, occurredAt: sourceBinding.createdAt,
        changedFields: Object.keys(sourceBinding.body), defaultReason: "Create SourceBinding", context });
      await linkSemantic(unit, projectId, sourceBinding, workflow, "binds_source", context, [sourceBaseline]);
    }
    return { workflow, sourceBaseline, sourceBinding };
  }

  async function createSubstantiveWorkflow(projectId: ProjectId, input: SubstantiveWorkflowCreationInput, context?: MutationContext) {
    return store.transaction(projectId, unit => createSubstantiveWorkflowInUnitOfWork(unit, projectId, input, context));
  }

  async function createProjectCreationWorkflow(projectId: ProjectId, input: { title: string; sourceSeed?: SubstantiveWorkflowCreationInput["sourceSeed"] }, context?: MutationContext) {
    exactInput(input, ["title", "sourceSeed"]);
    if (typeof input.title !== "string" || !input.title.trim() || input.title.trim().length > 200)
      fail("Workflow title must contain 1 to 200 characters.");
    const definition = getWorkflowTypeDefinition("project-creation");
    if (!definition) fail("Project Creation Workflow type is unavailable.");
    return store.transaction(projectId, async unit => {
      if (!await unit.getProject(projectId)) fail("Owning Project does not exist.");
      const workflow = await createWorkflowRecord(unit, projectId, { workflowType: "project-creation", title: input.title.trim(),
        currentWorkspace: definition.entryWorkspace, workflowState: "active" }, context);
      let sourceBaseline: ProjectStateRecord<"SourceBaseline"> | null = null;
      let sourceBinding: ProjectStateRecord<"SourceBinding"> | null = null;
      if (input.sourceSeed !== undefined) {
        exactInput(input.sourceSeed, ["repositoryId", "integrationTargetSourceLineId", "baseRevisionId"]);
        const body: EntityBodyMap["SourceBaseline"] = { workflowId: workflow.id, ...input.sourceSeed };
        sourceBaseline = createProjectStateEntity({ entityType: "SourceBaseline", projectId, body, principal: trustedPrincipal });
        await unit.saveEntity(sourceBaseline, null);
        await recordMutation(unit, { projectId, entityId: sourceBaseline.id, fromVersion: null, toVersion: 1,
          operation: "create", eventType: PROJECT_STATE_EVENT_TYPES.create, occurredAt: sourceBaseline.createdAt,
          changedFields: Object.keys(sourceBaseline.body), defaultReason: "Capture Workflow SourceBaseline", context });
        await linkSemantic(unit, projectId, sourceBaseline, workflow, "baselines_source", context);
        const bindingBody: EntityBodyMap["SourceBinding"] = { workflowId: workflow.id, sourceBaselineId: sourceBaseline.id, preparationState: "unprepared" };
        assertSourceBindingBody(bindingBody, sourceBaseline.body);
        sourceBinding = createProjectStateEntity({ entityType: "SourceBinding", projectId, body: bindingBody, principal: trustedPrincipal });
        await unit.saveEntity(sourceBinding, null);
        await recordMutation(unit, { projectId, entityId: sourceBinding.id, fromVersion: null, toVersion: 1,
          operation: "create", eventType: PROJECT_STATE_EVENT_TYPES.create, occurredAt: sourceBinding.createdAt,
          changedFields: Object.keys(sourceBinding.body), defaultReason: "Create SourceBinding", context });
        await linkSemantic(unit, projectId, sourceBinding, workflow, "binds_source", context, [sourceBaseline]);
      }
      return { workflow, sourceBaseline, sourceBinding };
    });
  }

  async function createWorkIntake(projectId: ProjectId, input: Omit<EntityBodyMap["WorkIntake"], "intakeState">, context?: MutationContext) {
    exactInput(input, ["request", "desiredOutcome", "constraints", "evidenceContext", "requestedIntegrationTarget", "hasExistingSourceOrPlanning"]);
    return store.transaction(projectId, async unit => {
      if (!await unit.getProject(projectId)) fail("Owning Project does not exist.");
      const intake = createProjectStateEntity({ entityType: "WorkIntake", projectId,
        body: { ...input, intakeState: "captured" }, principal: trustedPrincipal });
      await unit.saveEntity(intake, null);
      await recordMutation(unit, { projectId, entityId: intake.id, fromVersion: null, toVersion: 1,
        operation: "create", eventType: PROJECT_STATE_EVENT_TYPES.create, occurredAt: intake.createdAt,
        changedFields: Object.keys(intake.body), defaultReason: "Capture Work Intake", context });
      const workflow = createProjectStateEntity({ entityType: "Workflow", projectId,
        body: { workflowType: "work-intake-routing", title: input.request.trim().slice(0, 200), currentWorkspace: "work-intake",
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
      if (["SourceBaseline", "SourceBinding", "SourceCheckpoint", "IntegrationRecord"].includes(current.entityType)) fail("Source semantic revision requires a typed command.");
      if (current.entityType === "Workflow" && patch.workflowType !== undefined && patch.workflowType !== current.body.workflowType) fail("Workflow type is immutable.");
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
      if (restrictedGenericTypes.has(previous.entityType)) fail("Issued Decision, Validation, Evidence and TesterResult require a typed correction policy.");
      if (previous.entityType === "ImplementationRecord") fail("Implementation attempts are immutable; record a new attempt.");
      if (previous.entityType === "WorkIntake" || previous.entityType === "RouteAssessment") fail("Work Intake retains identity and Route Assessments remain historical records.");
      if (["SourceBaseline", "SourceBinding", "SourceCheckpoint", "IntegrationRecord"].includes(previous.entityType)) fail("Source semantic records retain their identity and revision history.");
      if (previous.entityType === "RegressionObligation") {
        if (content.obligationState !== "active") fail("A successor obligation must start active.");
        const sourceId = content.sourceWorkItemId;
        if (sourceId !== undefined && (await requiredRecord(unit, projectId, sourceId as EntityId)).entityType !== "WorkItem") fail("Obligation source must be a Work Item.");
      }
      if (previous.entityType === "ProjectResource" && previous.body.resourceType === "permanent-test-reference") fail("Permanent test references retain immutable catalog identity.");
      if (previous.entityType === "Workflow" && content.workflowType !== previous.body.workflowType) fail("Workflow supersession must retain its Workflow type.");
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
    if (relationshipType === "routes_to") fail("Workflow route provenance requires the typed linkWorkflowRouteTarget command.");
    if (relationshipType === "governs") fail("Decision governance requires a typed Decision command.");
    if (relationshipType === "implements_work_item") fail("Implementation attempts require a typed command.");
    if (relationshipType === "initiates" || relationshipType === "assesses_route") fail("Work Intake ownership and route assessment require typed commands.");
    if (["binds_source", "checkpoints", "integrates"].includes(relationshipType)) fail("Source semantic relationships require typed commands.");
    if (relationshipType === "baselines_source") fail("Workflow SourceBaseline linkage requires the typed baseline command.");
    if (relationshipType === "proves") fail("Permanent proof links require a typed command.");
    if (relationshipType === "decomposed_into") fail("WorkItem decomposition provenance requires the typed decomposition command.");
    return store.transaction(projectId, async unit => {
      const from = await requiredRecord(unit, projectId, fromEntityId);
      const to = await requiredRecord(unit, projectId, toEntityId);
      const active = (await unit.listRelationships(projectId, relationshipType)).filter(edge => !edge.endedAt);
      if (active.some(edge => edge.fromEntityId === fromEntityId && edge.toEntityId === toEntityId)) fail("Relationship already exists.");
      if (relationshipType === "repairs") {
        if (from.entityType !== "WorkItem" || to.entityType !== "WorkItem" || !["repair", "fix"].includes(from.body.workItemKind)) fail("Only a Repair or Fix Work Item can repair another Work Item.");
        const membership = (await unit.listRelationships(projectId, "part_of")).filter(edge => !edge.endedAt);
        const ownerOf = async (id: EntityId): Promise<ProjectStateRecord<"Workflow"> | null> => {
          let cursor: EntityId | undefined = id; const seen = new Set<EntityId>();
          while (cursor && !seen.has(cursor)) {
            seen.add(cursor);
            const parents = membership.filter(edge => edge.fromEntityId === cursor);
            if (parents.length !== 1) return null;
            const parent = await unit.getEntity(projectId, parents[0].toEntityId);
            if (parent?.entityType === "Workflow") {
              const lineage = (await unit.listEntities(projectId, "Workflow")).filter((record): record is ProjectStateRecord<"Workflow"> => record.entityType === "Workflow" && record.lineageId === parent.lineageId);
              const current = lineage.filter(record => record.lifecycleState === "active" && !["closed", "cancelled"].includes(record.body.workflowState));
              return current.length === 1 ? current[0] as ProjectStateRecord<"Workflow"> : null;
            }
            if (parent?.entityType !== "Phase") return null;
            cursor = parent.id;
          }
          return null;
        };
        const [repairOwner, targetOwner] = await Promise.all([ownerOf(fromEntityId), ownerOf(toEntityId)]);
        const current = (owner: ProjectStateRecord<"Workflow"> | null) => owner?.lifecycleState === "active" && !["closed", "cancelled"].includes(owner.body.workflowState);
        if (!current(repairOwner) || !current(targetOwner) || repairOwner!.id !== targetOwner!.id) fail("Repair and target must belong to the same unique current exact Workflow.");
        const lineage = (await unit.listEntities(projectId, "Workflow")).filter((record): record is ProjectStateRecord<"Workflow"> => record.entityType === "Workflow" && record.lineageId === repairOwner!.lineageId);
        const currentOwners = lineage.filter(record => record.lifecycleState === "active" && !["closed", "cancelled"].includes(record.body.workflowState));
        if (currentOwners.length !== 1 || currentOwners[0].id !== repairOwner!.id) fail("Repair owner is not the unique current Workflow in its lineage.");
      }
      if (relationshipType === "workflow_member") {
        if (active.some(edge => edge.fromEntityId === fromEntityId)) fail("Planning record already belongs to a Workflow.");
        if ((await unit.listRelationships(projectId, "workflow_member")).some(edge => edge.fromEntityId === fromEntityId)) fail("Planning record Workflow ownership history cannot be reassigned.");
        if (from.entityType === "BoundedSolution") {
          for (const edge of active.filter(edge => edge.toEntityId === toEntityId)) {
            if ((await unit.getEntity(projectId, edge.fromEntityId))?.entityType === "BoundedSolution") fail("Workflow already has an accepted planning graph.");
          }
        }
      }
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
      if (relationshipType === "depends_on") {
        const allMembership = (await unit.listRelationships(projectId, "part_of")).filter(edge => !edge.endedAt);
        const workflowOwner = async (id: EntityId): Promise<EntityId | null> => {
          let cursor: EntityId | undefined = id; const seen = new Set<EntityId>();
          while (cursor && !seen.has(cursor)) { seen.add(cursor); const edge = allMembership.find(item => item.fromEntityId === cursor); if (!edge) return null; const target = edge.toEntityId; const record = target === fromEntityId ? from : target === toEntityId ? to : await unit.getEntity(projectId, target); if (record?.entityType === "Workflow") return target; cursor = target; }
          return null;
        };
        const ownerA = await workflowOwner(fromEntityId); const ownerB = await workflowOwner(toEntityId);
        if ((ownerA || ownerB) && ownerA !== ownerB) fail("Dependencies cannot cross Workflow ownership.");
      }
      if (["part_of", "depends_on", "defines_criterion", "implements"].includes(relationshipType)) {
        const all = (await unit.listRelationships(projectId)).filter(edge => !edge.endedAt);
        const findWorkflowOwner = async (entityId: EntityId, seen = new Set<EntityId>()): Promise<EntityId | null> => {
          if (seen.has(entityId)) return null;
          seen.add(entityId);
          const canonical = all.find(edge => edge.relationshipType === "workflow_member" && edge.fromEntityId === entityId);
          if (canonical) return canonical.toEntityId;
          const parent = all.find(edge => edge.relationshipType === "part_of" && edge.fromEntityId === entityId);
          if (parent) {
            const record = await unit.getEntity(projectId, parent.toEntityId);
            if (record?.entityType === "Workflow") return record.id;
            return findWorkflowOwner(parent.toEntityId, seen);
          }
          const criterionOwner = all.find(edge => edge.relationshipType === "defines_criterion" && edge.toEntityId === entityId);
          if (criterionOwner) return findWorkflowOwner(criterionOwner.fromEntityId, seen);
          return null;
        };
        const ownerId = relationshipType === "part_of" ? await findWorkflowOwner(toEntityId) ?? (to.entityType === "Workflow" ? to.id : null) : await findWorkflowOwner(fromEntityId);
        if (ownerId && all.some(edge => edge.relationshipType === "workflow_member" && edge.toEntityId === ownerId && !edge.endedAt))
          fail("An accepted Workflow planning graph cannot be changed through generic relationships.");
      }
      const edge = createDomainRelationship({ projectId, fromEntityId, relationshipType, toEntityId, createdBy: trustedPrincipal }, id => id === fromEntityId ? from : id === toEntityId ? to : undefined);
      await unit.saveRelationship(edge);
      await recordMutation(unit, { projectId, entityId: from.id, fromVersion: from.recordVersion, toVersion: from.recordVersion,
        operation: "relationship-create", eventType: PROJECT_STATE_EVENT_TYPES.relationshipCreate, occurredAt: edge.createdAt,
        changedFields: [`relationship:${relationshipType}`], defaultReason: `Create ${relationshipType} relationship`, context, relationshipId: edge.id });
      return edge;
    });
  }

  async function linkWorkflowRouteTarget(projectId: ProjectId, routingWorkflowId: EntityId, targetWorkflowId: EntityId, context?: MutationContext): Promise<ProjectStateRelationship> {
    return store.transaction(projectId, async unit => {
      const routing = await requiredRecord(unit, projectId, routingWorkflowId);
      const target = await requiredRecord(unit, projectId, targetWorkflowId);
      if (routing.entityType !== "Workflow" || target.entityType !== "Workflow") fail("Workflow route provenance requires two Workflow records.");
      if (routing.body.workflowType !== "work-intake-routing" || target.body.workflowType === "work-intake-routing") fail("Workflow route provenance requires a routing Workflow source and non-routing Workflow target.");
      const current = (record: ProjectStateEntity) => record.entityType === "Workflow" && record.lifecycleState === "active" && record.body.workflowState !== "closed" && record.body.workflowState !== "cancelled";
      if (!current(routing) || !current(target)) fail("Workflow route provenance requires current nonterminal Workflows.");
      const active = (await unit.listRelationships(projectId, "routes_to")).filter(edge => !edge.endedAt);
      if (active.some(edge => edge.fromEntityId === routingWorkflowId)) fail("Routing Workflow already has a target Workflow.");
      if (active.some(edge => edge.toEntityId === targetWorkflowId)) fail("Target Workflow already has a routing provenance source.");
      const edge = createDomainRelationship({ projectId, fromEntityId: routingWorkflowId, relationshipType: "routes_to", toEntityId: targetWorkflowId, createdBy: trustedPrincipal }, id => id === routingWorkflowId ? routing : id === targetWorkflowId ? target : undefined);
      await unit.saveRelationship(edge);
      await recordMutation(unit, { projectId, entityId: routingWorkflowId, fromVersion: routing.recordVersion, toVersion: routing.recordVersion,
        operation: "relationship-create", eventType: PROJECT_STATE_EVENT_TYPES.relationshipCreate, occurredAt: edge.createdAt,
        changedFields: ["relationship:routes_to"], defaultReason: "Link routed Workflow provenance", context, relationshipId: edge.id });
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

  async function acceptFeatureAssessment(projectId: ProjectId, input: FeatureAssessmentAcceptanceInput, context?: MutationContext) {
    exactInput(input, ["workflowId", "rationale", "assessment"]);
    if (trustedPrincipal.principalType !== "human" || trustedPrincipal.role !== "Operator") fail("Feature assessment acceptance requires the Operator principal.");
    if (typeof input.rationale !== "string" || !input.rationale.trim() || new TextEncoder().encode(input.rationale).length > 4096 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(input.rationale)) fail("Feature assessment review rationale must be bounded text.");
    exactInput(input.assessment, ["currentProductBaseline", "requestedCapabilityDelta", "behaviorContractsToPreserve", "affectedArchitectureIntegrationPoints", "compatibilityRollout", "regressionBoundary", "excludedFutureWork"]);
    const dimensions: Array<[keyof FeatureAssessmentCandidate, string]> = [
      ["currentProductBaseline", "Current Product Baseline"],
      ["requestedCapabilityDelta", "Requested Capability Delta"],
      ["behaviorContractsToPreserve", "Behavior and Contracts to Preserve"],
      ["affectedArchitectureIntegrationPoints", "Affected Architecture and Integration Points"],
      ["compatibilityRollout", "Compatibility and Rollout"],
      ["regressionBoundary", "Regression Boundary"],
      ["excludedFutureWork", "Excluded Future Work"],
    ];
    for (const [key] of dimensions) {
      const value = input.assessment[key];
      if (typeof value !== "string" || !value.trim() || value.length > 4096 || new TextEncoder().encode(value).length > 4096 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) fail(`Feature assessment ${key} must be complete bounded text.`);
    }
    return store.transaction(projectId, async unit => {
      if (!await unit.getProject(projectId)) fail("Owning Project does not exist.");
      const workflow = await requiredRecord(unit, projectId, input.workflowId);
      if (workflow.entityType !== "Workflow" || workflow.body.workflowType !== "feature-capability" || workflow.lifecycleState !== "active" || workflow.body.workflowState !== "active" || workflow.body.currentWorkspace !== "feature-assessment") fail("Feature assessment acceptance requires the exact active Feature Workflow in its assessment workspace.");
      const membership = (await unit.listRelationships(projectId, "workflow_member")).filter(edge => edge.toEntityId === workflow.id && !edge.endedAt);
      const ownedIntake = (await unit.listEntities(projectId, "Finding")).filter((record): record is ProjectStateRecord<"Finding"> => record.entityType === "Finding" && record.lifecycleState === "active" && record.body.findingState === "current" && record.body.category === "feature-intake" && membership.some(edge => edge.fromEntityId === record.id));
      const requiredIntakeTitles = ["Requested Capability Delta", "Current Product Baseline", "Scope In", "Scope Out", "Constraints", "Behavior and Contracts to Preserve", "Affected Architecture and Integration Points", "Evidence and Regression Boundary", "Compatibility and Rollout"];
      if (requiredIntakeTitles.some(title => !ownedIntake.some(record => record.body.title === title))) fail("Feature assessment requires the complete current Intake owned by this exact Workflow.");
      const now = new Date().toISOString();
      const findings: ProjectStateRecord<"Finding">[] = [];
      for (const [key, title] of dimensions) {
        const record = createProjectStateEntity({ entityType: "Finding", projectId, body: { title, statement: input.assessment[key].trim(), category: "feature-assessment", impact: "Accepted Feature assessment context", observedAt: now, findingState: "current" }, principal: trustedPrincipal });
        await unit.saveEntity(record, null);
        await recordMutation(unit, { projectId, entityId: record.id, fromVersion: null, toVersion: 1, operation: "create", eventType: PROJECT_STATE_EVENT_TYPES.create, occurredAt: record.createdAt, changedFields: Object.keys(record.body), defaultReason: "Accept Feature assessment Finding", context });
        await linkSemantic(unit, projectId, record, workflow, "workflow_member", context);
        findings.push(record);
      }
      const decision = createProjectStateEntity({ entityType: "Decision", projectId, body: decisionBody({ decisionType: "feature-assessment-review", outcome: "accepted", decisionScope: workflow.id, rationale: input.rationale.trim() }, trustedPrincipal, now), principal: trustedPrincipal });
      await unit.saveEntity(decision, null);
      await recordMutation(unit, { projectId, entityId: decision.id, fromVersion: null, toVersion: 1, operation: "create", eventType: PROJECT_STATE_EVENT_TYPES.create, occurredAt: decision.createdAt, changedFields: Object.keys(decision.body), defaultReason: "Accept Feature assessment review", context });
      await linkSemantic(unit, projectId, decision, workflow, "governs", context);
      for (const finding of findings) await linkSemantic(unit, projectId, decision, finding, "governs", context);
      const nextWorkflow = validateProjectStateEntity({ ...workflow, recordVersion: workflow.recordVersion + 1, updatedAt: now, updatedBy: trustedPrincipal, body: { ...workflow.body, currentWorkspace: "feature-planning" } }) as ProjectStateRecord<"Workflow">;
      await unit.saveEntity(nextWorkflow, workflow.recordVersion);
      await recordMutation(unit, { projectId, entityId: workflow.id, fromVersion: workflow.recordVersion, toVersion: nextWorkflow.recordVersion, operation: "revise", eventType: PROJECT_STATE_EVENT_TYPES.revise, occurredAt: now, changedFields: ["currentWorkspace"], defaultReason: "Advance accepted Feature assessment", context });
      return { decision, findings, workflow: nextWorkflow };
    });
  }

  async function acceptIssueRca(projectId: ProjectId, input: IssueRcaAcceptanceInput, context?: MutationContext) {
    exactInput(input, ["workflowId", "rationale", "rootCauses"]);
    if (trustedPrincipal.principalType !== "human" || trustedPrincipal.role !== "Operator") fail("Issue RCA acceptance requires the Operator principal.");
    if (typeof input.rationale !== "string" || !input.rationale.trim() || new TextEncoder().encode(input.rationale).length > 4096 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(input.rationale)) fail("Issue RCA review rationale must be bounded text.");
    if (!Array.isArray(input.rootCauses) || input.rootCauses.length < 1 || input.rootCauses.length > 12) fail("Issue RCA requires between one and twelve RootCause candidates.");
    return store.transaction(projectId, async unit => {
      if (!await unit.getProject(projectId)) fail("Owning Project does not exist.");
      const workflow = await requiredRecord(unit, projectId, input.workflowId);
      if (workflow.entityType !== "Workflow" || workflow.body.workflowType !== "issue-resolution" || workflow.lifecycleState !== "active" || workflow.body.workflowState !== "active" || workflow.body.currentWorkspace !== "issue-rca")
        fail("Issue RCA acceptance requires the exact active Issue Workflow in its RCA workspace.");
      const memberships = (await unit.listRelationships(projectId, "workflow_member")).filter(edge => !edge.endedAt);
      const ownedFindings = new Map((await unit.listEntities(projectId, "Finding")).filter((record): record is ProjectStateRecord<"Finding"> => record.entityType === "Finding" && record.lifecycleState === "active" && record.body.findingState === "current" && record.body.category.startsWith("issue-") && memberships.some(edge => edge.fromEntityId === record.id && edge.toEntityId === workflow.id)).map(record => [record.id, record]));
      const evidenceRecords = new Map((await unit.listEntities(projectId, "Evidence")).filter((record): record is ProjectStateRecord<"Evidence"> => record.entityType === "Evidence" && record.lifecycleState === "active").map(record => [record.id, record]));
      const supportEdges = (await unit.listRelationships(projectId, "supports")).filter(edge => !edge.endedAt);
      const candidates = input.rootCauses.map(candidate => {
        exactInput(candidate, ["title", "statement", "rationale", "confidence", "findingIds", "evidenceIds"]);
        for (const [key, maximum] of [["title", 200], ["statement", 4096], ["rationale", 4096]] as const) if (typeof candidate[key] !== "string" || !candidate[key].trim() || candidate[key].length > maximum || new TextEncoder().encode(candidate[key] as string).length > 4096 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(candidate[key] as string)) fail(`RootCause ${key} must be bounded text.`);
        if (candidate.confidence !== undefined && (typeof candidate.confidence !== "number" || !Number.isFinite(candidate.confidence) || candidate.confidence < 0 || candidate.confidence > 1)) fail("RootCause confidence must be between zero and one.");
        if (!Array.isArray(candidate.findingIds) || candidate.findingIds.length < 1 || candidate.findingIds.length > 32 || new Set(candidate.findingIds).size !== candidate.findingIds.length || candidate.findingIds.some(id => !ownedFindings.has(id))) fail("RootCause must cite current Findings owned by this exact Issue Workflow.");
        if (!Array.isArray(candidate.evidenceIds) || candidate.evidenceIds.length > 32 || new Set(candidate.evidenceIds).size !== candidate.evidenceIds.length) fail("RootCause Evidence references are invalid or exceed their bounds.");
        const unsupportedEvidence = candidate.evidenceIds.find(id => !evidenceRecords.has(id) || !supportEdges.some(edge => edge.fromEntityId === id && (edge.toEntityId === workflow.id || ownedFindings.has(edge.toEntityId))));
        if (unsupportedEvidence) fail("RootCause Evidence must be supported by the exact Issue Workflow context.");
        return candidate;
      });
      const now = new Date().toISOString();
      const createRoot = async (candidate: IssueRootCauseCandidateInput) => {
        const root = createProjectStateEntity({ entityType: "RootCause", projectId, body: { title: candidate.title.trim(), statement: candidate.statement.trim(), rationale: candidate.rationale.trim(), ...(candidate.confidence === undefined ? {} : { confidence: candidate.confidence }), rootCauseState: "accepted" }, principal: trustedPrincipal });
        await unit.saveEntity(root, null);
        await recordMutation(unit, { projectId, entityId: root.id, fromVersion: null, toVersion: 1, operation: "create", eventType: PROJECT_STATE_EVENT_TYPES.create, occurredAt: root.createdAt, changedFields: Object.keys(root.body), defaultReason: "Accept Issue RootCause", context });
        await linkSemantic(unit, projectId, root, workflow, "workflow_member", context);
        for (const id of candidate.findingIds) await linkSemantic(unit, projectId, root, ownedFindings.get(id)!, "explains", context);
        for (const id of candidate.evidenceIds) await linkSemantic(unit, projectId, evidenceRecords.get(id)!, root, "supports", context);
        return root;
      };
      const roots = [] as ProjectStateRecord<"RootCause">[];
      for (const candidate of candidates) roots.push(await createRoot(candidate));
      const decision = createProjectStateEntity({ entityType: "Decision", projectId, body: decisionBody({ decisionType: "issue-rca-review", outcome: "accepted", decisionScope: workflow.id, rationale: input.rationale.trim() }, trustedPrincipal, now), principal: trustedPrincipal });
      await unit.saveEntity(decision, null);
      await recordMutation(unit, { projectId, entityId: decision.id, fromVersion: null, toVersion: 1, operation: "create", eventType: PROJECT_STATE_EVENT_TYPES.create, occurredAt: decision.createdAt, changedFields: Object.keys(decision.body), defaultReason: "Accept Issue RCA review", context });
      await linkSemantic(unit, projectId, decision, workflow, "governs", context);
      for (const root of roots) await linkSemantic(unit, projectId, decision, root, "governs", context);
      const nextWorkflow = validateProjectStateEntity({ ...workflow, recordVersion: workflow.recordVersion + 1, updatedAt: now, updatedBy: trustedPrincipal, body: { ...workflow.body, currentWorkspace: "issue-planning" } }) as ProjectStateRecord<"Workflow">;
      await unit.saveEntity(nextWorkflow, workflow.recordVersion);
      await recordMutation(unit, { projectId, entityId: workflow.id, fromVersion: workflow.recordVersion, toVersion: nextWorkflow.recordVersion, operation: "revise", eventType: PROJECT_STATE_EVENT_TYPES.revise, occurredAt: now, changedFields: ["currentWorkspace"], defaultReason: "Advance accepted Issue RCA", context });
      return { decision, rootCauses: roots, workflow: nextWorkflow };
    });
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

  async function createTesterResult(projectId: ProjectId, workflowId: EntityId, workItemId: EntityId,
    implementationRecordId: EntityId, input: Pick<EntityBodyMap["TesterResult"], "sourceMode" | "recommendation" | "affectedCapabilityIds" | "permanentTestPaths" | "determinationEvidence" | "unknowns" | "rationale"> & { implementerRevisionId?: string },
    context?: MutationContext) {
    exactInput(input, ["sourceMode", "implementerRevisionId", "recommendation", "affectedCapabilityIds", "permanentTestPaths", "determinationEvidence", "unknowns", "rationale"]);
    if (trustedPrincipal.role !== "Tester") fail("TesterResult creation requires the Tester role.");
    if (input.sourceMode !== "source-backed" && input.sourceMode !== "source-neutral") fail("TesterResult source mode is invalid.");
    if (input.sourceMode === "source-backed" && !input.implementerRevisionId || input.sourceMode === "source-neutral" && input.implementerRevisionId !== undefined) fail("TesterResult source revision does not match its source mode.");
    if (!Array.isArray(input.affectedCapabilityIds) || input.affectedCapabilityIds.length > 128 ||
      input.affectedCapabilityIds.some(id => typeof id !== "string" || !/^[a-z0-9][a-z0-9-]{0,127}$/.test(id)) ||
      new Set(input.affectedCapabilityIds).size !== input.affectedCapabilityIds.length) fail("TesterResult capability IDs must be unique bounded catalog identities.");
    if (!Array.isArray(input.permanentTestPaths) || input.permanentTestPaths.length > 128 ||
      new Set(input.permanentTestPaths).size !== input.permanentTestPaths.length) fail("TesterResult permanent test paths must be unique and bounded.");
    input.permanentTestPaths.forEach(validateTesterOwnedPath);
    if (!Array.isArray(input.determinationEvidence) || input.determinationEvidence.length === 0 || input.determinationEvidence.length > 128 ||
      !Array.isArray(input.unknowns) || input.unknowns.length > 128) fail("TesterResult evidence and unknowns must be bounded lists.");
    if (typeof input.rationale !== "string" || !input.rationale.trim()) fail("TesterResult rationale is required.");
    return store.transaction(projectId, async unit => {
      const workflow = await requiredRecord(unit, projectId, workflowId);
      await requireCurrentSourceWorkflow(unit, projectId, workflow);
      const workItem = await requiredRecord(unit, projectId, workItemId);
      if (workItem.entityType !== "WorkItem" || workItem.lifecycleState !== "active" || workItem.body.workState !== "validation_pending")
        fail("TesterResult requires the exact active validation-pending WorkItem.");
      const memberships = (await unit.listRelationships(projectId, "part_of")).filter(edge => !edge.endedAt);
      let cursor: EntityId | undefined = workItemId;
      const visited = new Set<EntityId>();
      while (cursor !== workflowId && cursor && !visited.has(cursor)) {
        visited.add(cursor);
        const parents = memberships.filter(edge => edge.fromEntityId === cursor);
        if (parents.length !== 1) { cursor = undefined; break; }
        cursor = parents[0].toEntityId;
      }
      if (cursor !== workflowId) fail("TesterResult WorkItem is not owned by the exact current Workflow.");
      const implementation = await requiredRecord(unit, projectId, implementationRecordId);
      if (implementation.entityType !== "ImplementationRecord" || implementation.body.workItemId !== workItemId || implementation.body.outcome !== "implemented")
        fail("TesterResult requires a successful ImplementationRecord for its WorkItem.");
      if (implementation.createdBy.principalId === trustedPrincipal.principalId) fail("Tester principal must be distinct from the implementation attempt principal.");
      const attemptEdges = (await unit.listRelationships(projectId, "implements_work_item"))
        .filter(edge => edge.toEntityId === workItemId && !edge.endedAt);
      const creationSequence = new Map((await unit.listOutbox(projectId))
        .filter(event => event.entityId && event.payload.operation === "create")
        .map(event => [event.entityId as string, event.sequence]));
      const attempts = (await unit.listEntities(projectId, "ImplementationRecord"))
        .filter((record): record is ProjectStateRecord<"ImplementationRecord"> => record.entityType === "ImplementationRecord" &&
          record.body.workItemId === workItemId && attemptEdges.some(edge => edge.fromEntityId === record.id))
        .sort((a, b) => (creationSequence.get(a.id) ?? 0) - (creationSequence.get(b.id) ?? 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
      if (attempts.at(-1)?.id !== implementationRecordId) fail("TesterResult must target the current successful implementation attempt.");
      const sourceBindings = (await unit.listEntities(projectId, "SourceBinding")).filter((record): record is ProjectStateRecord<"SourceBinding"> =>
        record.entityType === "SourceBinding" && record.lifecycleState === "active" && record.body.workflowId === workflowId);
      if (input.sourceMode === "source-backed") {
        const checkpointLinks = (await unit.listRelationships(projectId, "checkpoints")).filter(edge => edge.toEntityId === implementationRecordId && !edge.endedAt);
        const checkpoints = (await Promise.all(checkpointLinks.map(edge => unit.getEntity(projectId, edge.fromEntityId))))
          .filter((record): record is ProjectStateRecord<"SourceCheckpoint"> => record?.entityType === "SourceCheckpoint" && record.body.checkpointKind === "implementation" && record.body.checkpointState === "committed");
        if (sourceBindings.length !== 1 || sourceBindings[0].body.preparationState !== "ready" || sourceBindings[0].body.currentRevisionId !== input.implementerRevisionId || checkpoints.length !== 1 || checkpoints[0].body.resultingRevisionId !== input.implementerRevisionId)
          fail("Source-backed TesterResult requires its current committed implementation checkpoint and ready SourceBinding.");
      } else if (sourceBindings.length !== 0 || input.permanentTestPaths.length !== 0) {
        fail("Source-neutral TesterResult cannot claim repository proof paths or a SourceBinding.");
      }
      if ((await unit.listEntities(projectId, "TesterResult")).some(record => record.entityType === "TesterResult" &&
        record.body.implementationRecordId === implementationRecordId)) fail("TesterResult already exists for this implementation attempt.");
      if (input.sourceMode === "source-neutral" && (input.recommendation === "permanent-proof-change-warranted" || input.permanentTestPaths.length > 0))
        fail("Source-neutral Tester cannot claim permanent repository proof changes.");
      const checkpointState = input.permanentTestPaths.length === 0 ? "not-required" : "pending";
      const body: EntityBodyMap["TesterResult"] = {
        workflowId, workItemId, implementationRecordId, sourceMode: input.sourceMode,
        ...(input.implementerRevisionId ? { implementerRevisionId: input.implementerRevisionId } : {}),
        recommendation: input.recommendation, affectedCapabilityIds: [...input.affectedCapabilityIds].sort(),
        permanentTestPaths: [...input.permanentTestPaths].sort(), determinationEvidence: input.determinationEvidence,
        unknowns: input.unknowns, rationale: input.rationale.trim(), checkpointState,
        ...(checkpointState === "not-required" && input.implementerRevisionId ? { candidateRevisionId: input.implementerRevisionId } : {}),
      };
      const result = createProjectStateEntity({ entityType: "TesterResult", projectId, body, principal: trustedPrincipal });
      await unit.saveEntity(result, null);
      await recordMutation(unit, { projectId, entityId: result.id, fromVersion: null, toVersion: 1,
        operation: "create", eventType: PROJECT_STATE_EVENT_TYPES.create, occurredAt: result.createdAt,
        changedFields: Object.keys(result.body), defaultReason: "Record Tester result", context });
      await linkSemantic(unit, projectId, result, workItem, "assesses_work_item", context, [workflow, implementation]);
      await linkSemantic(unit, projectId, result, implementation, "records_attempt", context, [workflow, workItem]);
      return result;
    });
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

  /** Begin a canonical Work Item attempt under one exact current Workflow owner. */
  async function beginWorkItemAttempt(projectId: ProjectId, workflowId: EntityId, workItemId: EntityId,
    expectedWorkItemVersion: number, executionRef: string, context?: MutationContext) {
    exactInput({ workflowId, workItemId, expectedWorkItemVersion, executionRef }, ["workflowId", "workItemId", "expectedWorkItemVersion", "executionRef"]);
    if (!executionRef || executionRef.length > 128 || !Number.isSafeInteger(expectedWorkItemVersion) || expectedWorkItemVersion < 1) fail("Exact Work Item attempt identity is required.");
    return store.transaction(projectId, async unit => {
      const workflow = await requiredRecord(unit, projectId, workflowId);
      if (workflow.entityType !== "Workflow" || workflow.lifecycleState !== "active" || ["closed", "cancelled"].includes(workflow.body.workflowState) || !["feature-capability", "issue-resolution"].includes(workflow.body.workflowType)) fail("A current Feature or Issue Workflow is required.");
      const currentOwners = (await unit.listEntities(projectId, "Workflow")).filter(record => record.entityType === "Workflow" && record.lineageId === workflow.lineageId && record.lifecycleState === "active" && !["closed", "cancelled"].includes(record.body.workflowState));
      if (currentOwners.length !== 1 || currentOwners[0].id !== workflowId) fail("Exact Workflow is not the unique current owner.");
      const item = await requiredRecord(unit, projectId, workItemId);
      if (item.entityType !== "WorkItem" || item.recordVersion !== expectedWorkItemVersion || !["planned", "ready"].includes(item.body.workState)) fail("Work Item is unavailable, stale, or already active.");
      const edges = (await unit.listRelationships(projectId)).filter(edge => !edge.endedAt);
      const plan = await getWorkflowExecutionPlan(projectId, workflowId);
      const projectedWork = [...plan.directWorkItems, ...Object.values(plan.workItemsByPhase).flat()].find(candidate => candidate.id === workItemId);
      if (!projectedWork) fail("Work Item does not belong to the exact Workflow execution plan.");
      const membership = edges.filter(edge => edge.relationshipType === "part_of");
      let parent = membership.find(edge => edge.fromEntityId === workItemId)?.toEntityId;
      const seen = new Set<string>();
      while (parent && !seen.has(parent)) {
        if (parent === workflowId) break;
        seen.add(parent);
        parent = membership.find(edge => edge.fromEntityId === parent)?.toEntityId;
      }
      if (parent !== workflowId) fail("Work Item is not owned by the exact Workflow.");
      const phase = plan.phases.find(candidate => candidate.workItemIds.includes(workItemId));
      if (phase) {
        if (["blocked", "cancelled", "closed"].includes(phase.record.body.phaseState)) fail("Work Item Phase is not executable.");
        for (const prior of plan.phases.filter(candidate => candidate.sequence < phase.sequence)) {
          if (prior.record.body.phaseState !== "closed" || prior.workItemIds.some(id => {
            const predecessor = [...plan.directWorkItems, ...Object.values(plan.workItemsByPhase).flat()].find(candidate => candidate.id === id);
            return predecessor?.body.workState !== "closed";
          })) fail("An earlier Workflow Phase is incomplete.");
        }
      }
      const disposition = await getEffectiveDisposition(projectId, workItemId);
      if (["proposed", "revision_requested", "rejected", "revoked"].includes(disposition.state)) fail("Work Item has a blocking Decision.");
      if (edges.some(edge => edge.relationshipType === "blocks" && edge.toEntityId === workItemId && edge.fromEntityId !== workItemId)) {
        for (const edge of edges.filter(edge => edge.relationshipType === "blocks" && edge.toEntityId === workItemId)) {
          const blocker = await unit.getEntity(projectId, edge.fromEntityId);
          if (blocker?.lifecycleState === "active") fail("Work Item has an active blocking record.");
        }
      }
      for (const edge of edges.filter(edge => edge.relationshipType === "depends_on" && edge.fromEntityId === workItemId)) {
        const dependency = await requiredRecord(unit, projectId, edge.toEntityId);
        if (dependency.entityType !== "WorkItem" || dependency.body.workState !== "closed") fail("Work Item dependencies are not complete.");
      }
      const prior = (await unit.listEntities(projectId, "ImplementationRecord")).filter(record => record.entityType === "ImplementationRecord" && record.body.executionRef === executionRef);
      if (prior.length) fail("Execution identity has already been used.");
      const now = new Date().toISOString();
      const next = validateProjectStateEntity({ ...item, recordVersion: item.recordVersion + 1, updatedAt: now, updatedBy: trustedPrincipal,
        body: { ...item.body, workState: "in_progress", startedAt: now } });
      await unit.saveEntity(next, item.recordVersion);
      await recordMutation(unit, { projectId, entityId: item.id, fromVersion: item.recordVersion, toVersion: next.recordVersion,
        operation: "revise", eventType: PROJECT_STATE_EVENT_TYPES.revise, occurredAt: now, changedFields: ["startedAt", "workState"],
        defaultReason: "Begin exact Work Item implementation attempt", context });
      return { workflowId, workItemId, workItemVersion: next.recordVersion, executionRef };
    });
  }

  /** Finish one exact attempt immutably; downstream validation owns completion. */
  async function finishWorkItemAttempt(projectId: ProjectId, workflowId: EntityId, workItemId: EntityId,
    executionRef: string, input: Omit<EntityBodyMap["ImplementationRecord"], "workItemId" | "executionRef">, context?: MutationContext) {
    exactInput(input, ["summary", "deviations", "blockers", "residualRisks", "outcome"]);
    if (!executionRef || executionRef.length > 128) fail("Exact execution reference is required.");
    return store.transaction(projectId, async unit => {
      const workflow = await requiredRecord(unit, projectId, workflowId);
      const item = await requiredRecord(unit, projectId, workItemId);
      if (workflow.entityType !== "Workflow" || item.entityType !== "WorkItem" || item.body.workState !== "in_progress" || !["feature-capability", "issue-resolution"].includes(workflow.body.workflowType)) fail("Exact active Workflow attempt is unavailable.");
      const currentOwners = (await unit.listEntities(projectId, "Workflow")).filter(record => record.entityType === "Workflow" && record.lineageId === workflow.lineageId && record.lifecycleState === "active" && !["closed", "cancelled"].includes(record.body.workflowState));
      if (currentOwners.length !== 1 || currentOwners[0].id !== workflowId) fail("Exact Workflow is not the unique current owner.");
      const memberships = (await unit.listRelationships(projectId, "part_of")).filter(edge => !edge.endedAt);
      let parent = memberships.find(edge => edge.fromEntityId === workItemId)?.toEntityId;
      const seen = new Set<string>();
      while (parent && parent !== workflowId && !seen.has(parent)) { seen.add(parent); parent = memberships.find(edge => edge.fromEntityId === parent)?.toEntityId; }
      if (parent !== workflowId) fail("Work Item is not owned by the exact Workflow.");
      const existing = (await unit.listEntities(projectId, "ImplementationRecord")).filter((record): record is ProjectStateRecord<"ImplementationRecord"> => record.entityType === "ImplementationRecord" && record.body.executionRef === executionRef);
      if (existing.length) {
        if (existing.length === 1 && existing[0].body.workItemId === workItemId && JSON.stringify({ ...existing[0].body, executionRef: undefined }) === JSON.stringify({ ...input, workItemId, executionRef: undefined })) return existing[0];
        fail("Execution identity conflicts with immutable implementation evidence.");
      }
      const record = createProjectStateEntity({ entityType: "ImplementationRecord", projectId,
        body: { ...input, workItemId, executionRef }, principal: trustedPrincipal });
      await unit.saveEntity(record, null);
      await recordMutation(unit, { projectId, entityId: record.id, fromVersion: null, toVersion: 1, operation: "create", eventType: PROJECT_STATE_EVENT_TYPES.create,
        occurredAt: record.createdAt, changedFields: Object.keys(record.body), defaultReason: "Record exact Work Item implementation attempt", context });
      await linkSemantic(unit, projectId, record, item, "implements_work_item", context);
      const state = input.outcome === "implemented" ? "validation_pending" : input.outcome === "blocked" ? "blocked" : "ready";
      const now = new Date().toISOString();
      const next = validateProjectStateEntity({ ...item, recordVersion: item.recordVersion + 1, updatedAt: now, updatedBy: trustedPrincipal,
        body: { ...item.body, workState: state, ...(input.outcome === "implemented" ? { implementedAt: now } : {}) } });
      await unit.saveEntity(next, item.recordVersion);
      await recordMutation(unit, { projectId, entityId: item.id, fromVersion: item.recordVersion, toVersion: next.recordVersion, operation: "revise",
        eventType: PROJECT_STATE_EVENT_TYPES.revise, occurredAt: now, changedFields: ["workState", ...(input.outcome === "implemented" ? ["implementedAt"] : [])],
        defaultReason: "Finish exact Work Item implementation attempt", context });
      return record;
    });
  }

  async function decomposeWorkItem(projectId: ProjectId, input: WorkItemDecompositionInput, context?: MutationContext) {
    exactInput(input, ["workflowId", "workItemId", "expectedWorkItemVersion", "replacements", "criterionDispositions", "incomingDependentMappings"]);
    if (!Number.isSafeInteger(input.expectedWorkItemVersion) || input.expectedWorkItemVersion < 1 || !Array.isArray(input.replacements) || input.replacements.length < 2 || input.replacements.length > 16 ||
      !Array.isArray(input.criterionDispositions) || input.criterionDispositions.length > 64 || !Array.isArray(input.incomingDependentMappings) || input.incomingDependentMappings.length > 128)
      fail("A bounded typed WorkItem decomposition proposal is required.");
    const validKey = (value: unknown) => typeof value === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(value);
    const replacementByKey = new Map<string, WorkItemDecompositionCandidate>();
    for (const candidate of input.replacements) {
      exactInput(candidate, ["key", "kind", "title", "objective", "solutionId", "dependencyWorkItemIds", "dependencyReplacementKeys"]);
      if (!validKey(candidate.key) || replacementByKey.has(candidate.key) || !candidate.title?.trim() || !candidate.objective?.trim() ||
        candidate.title.length > 512 || candidate.objective.length > 4096 || !Array.isArray(candidate.dependencyWorkItemIds) || candidate.dependencyWorkItemIds.length > 128 ||
        !Array.isArray(candidate.dependencyReplacementKeys) || candidate.dependencyReplacementKeys.length > 16 ||
        new Set(candidate.dependencyWorkItemIds).size !== candidate.dependencyWorkItemIds.length || new Set(candidate.dependencyReplacementKeys).size !== candidate.dependencyReplacementKeys.length)
        fail("Invalid or duplicate decomposition WorkItem candidate.");
      replacementByKey.set(candidate.key, candidate);
    }
    const validateDag = (nodes: Set<EntityId>, edges: Array<{ from: EntityId; to: EntityId }>) => {
      const children = new Map<EntityId, EntityId[]>();
      for (const edge of edges) {
        if (!nodes.has(edge.from) || !nodes.has(edge.to) || edge.from === edge.to) fail("Decomposition dependency mapping contains an invalid edge.");
        children.set(edge.from, [...(children.get(edge.from) ?? []), edge.to]);
      }
      const marks = new Map<EntityId, number>();
      const visit = (id: EntityId) => { if (marks.get(id) === 1) fail("Resulting Workflow dependency graph contains a cycle."); if (marks.get(id) === 2) return; marks.set(id, 1); for (const next of children.get(id) ?? []) visit(next); marks.set(id, 2); };
      for (const id of nodes) visit(id);
    };

    return store.transaction(projectId, async unit => {
      const workflow = await requiredRecord(unit, projectId, input.workflowId);
      if (workflow.entityType !== "Workflow" || workflow.lifecycleState !== "active" || workflow.body.workflowState !== "active" ||
        !["feature-capability", "issue-resolution"].includes(workflow.body.workflowType)) fail("Decomposition requires the exact current Feature or Issue Workflow.");
      const currentOwners = (await unit.listEntities(projectId, "Workflow")).filter(record => record.entityType === "Workflow" && record.lineageId === workflow.lineageId && record.lifecycleState === "active" && record.body.workflowState === "active");
      if (currentOwners.length !== 1 || currentOwners[0].id !== workflow.id) fail("Workflow is not the unique current owner.");
      const source = await requiredRecord(unit, projectId, input.workItemId);
      if (source.entityType !== "WorkItem" || source.projectId !== projectId || source.recordVersion !== input.expectedWorkItemVersion || source.lifecycleState !== "active" || !["planned", "ready"].includes(source.body.workState))
        fail("Decomposition source is stale, terminal, or has left the pre-execution state.");
      const plan = await getWorkflowExecutionPlan(projectId, workflow.id);
      const workItems = [...plan.directWorkItems, ...Object.values(plan.workItemsByPhase).flat()];
      const currentWorkIds = new Set(workItems.map(item => item.id));
      if (!currentWorkIds.has(source.id)) fail("Decomposition source is not in the exact current Workflow plan.");
      const allEdges = (await unit.listRelationships(projectId)).filter(edge => !edge.endedAt);
      const memberships = allEdges.filter(edge => edge.relationshipType === "part_of");
      const sourceParent = memberships.find(edge => edge.fromEntityId === source.id);
      if (!sourceParent) fail("Decomposition source has no exact Workflow/Phase owner.");
      const sourceOwner = await requiredRecord(unit, projectId, sourceParent.toEntityId);
      if (!(sourceOwner.entityType === "Workflow" && sourceOwner.id === workflow.id || sourceOwner.entityType === "Phase" && plan.phases.some(phase => phase.phaseId === sourceOwner.id))) fail("Decomposition source belongs to a different Workflow.");
      const familyKinds: Record<string, readonly string[]> = { "feature-capability": ["feature", "fix", "maintenance"], "issue-resolution": ["fix", "repair"] };
      if (input.replacements.some(candidate => !familyKinds[workflow.body.workflowType].includes(candidate.kind))) fail("Replacement WorkItem kind is invalid for this Workflow family.");
      const sourceDependencies = allEdges.filter(edge => edge.relationshipType === "depends_on" && edge.fromEntityId === source.id);
      const incoming = allEdges.filter(edge => edge.relationshipType === "depends_on" && edge.toEntityId === source.id && edge.fromEntityId !== source.id);
      if (sourceDependencies.some(edge => !currentWorkIds.has(edge.toEntityId)) || incoming.some(edge => !currentWorkIds.has(edge.fromEntityId))) fail("Source has a cross-Workflow dependency.");
      const implementations = allEdges.filter(edge => edge.relationshipType === "implements_work_item" && edge.toEntityId === source.id);
      const validators = allEdges.filter(edge => edge.relationshipType === "evaluates" && (edge.toEntityId === source.id ||
        plan.criteria.some(item => item.ownerId === source.id && item.record.id === edge.toEntityId)));
      const sourceCheckpoints = allEdges.filter(edge => edge.relationshipType === "checkpoints" && edge.toEntityId === source.id);
      const repairs = allEdges.filter(edge => edge.relationshipType === "repairs" && (edge.toEntityId === source.id || edge.fromEntityId === source.id));
      const blockers = allEdges.filter(edge => edge.relationshipType === "blocks" && (edge.toEntityId === source.id || edge.fromEntityId === source.id));
      const priorDecompositions = allEdges.filter(edge => edge.relationshipType === "decomposed_into" && edge.fromEntityId === source.id);
      if (implementations.length || validators.length || sourceCheckpoints.length || repairs.length || blockers.length || priorDecompositions.length)
        fail("WorkItem with implementation, validation, checkpoint, repair, or decomposition history cannot be decomposed.");

      const solutionEdges = allEdges.filter(edge => edge.relationshipType === "implements" && edge.fromEntityId === source.id);
      const acceptedSolutions = plan.solutions.filter(solution => plan.decisions.some(decision => allEdges.some(edge => edge.relationshipType === "governs" && edge.fromEntityId === decision.id && edge.toEntityId === solution.id)));
      if (solutionEdges.length !== 1 || !acceptedSolutions.some(solution => solution.id === solutionEdges[0].toEntityId)) fail("Decomposition source lacks one accepted BoundedSolution.");
      const solutionByKey = new Map<string, EntityId>();
      for (const candidate of input.replacements) {
        const solutionId = candidate.solutionId ?? solutionEdges[0].toEntityId;
        if (!acceptedSolutions.some(solution => solution.id === solutionId)) fail("Replacement solution must be accepted in the exact Workflow.");
        solutionByKey.set(candidate.key, solutionId);
      }

      const sourceCriteriaEdges = allEdges.filter(edge => edge.relationshipType === "defines_criterion" && edge.fromEntityId === source.id);
      const sourceCriterionIds = sourceCriteriaEdges.map(edge => edge.toEntityId).sort();
      for (const criterionId of sourceCriterionIds) {
        const criterion = await requiredRecord(unit, projectId, criterionId);
        if (criterion.entityType !== "Criterion" || criterion.lifecycleState !== "active") fail("Source Criterion is not current.");
      }
      const dispositionById = new Map<EntityId, WorkItemCriterionDisposition>();
      for (const disposition of input.criterionDispositions) {
        if (!disposition || !["transfer", "elevate", "split"].includes(disposition.disposition)) fail("Unsupported Criterion decomposition disposition.");
        exactInput(disposition, disposition.disposition === "transfer" ? ["criterionId", "disposition", "replacementKey"] : disposition.disposition === "elevate" ? ["criterionId", "disposition", "owner"] : ["criterionId", "disposition", "replacements"]);
        if (dispositionById.has(disposition.criterionId)) fail("Criterion disposition is duplicated.");
        dispositionById.set(disposition.criterionId, disposition);
      }
      if (sourceCriterionIds.length !== dispositionById.size || sourceCriterionIds.some(id => !dispositionById.has(id))) fail("Every source Criterion requires one explicit disposition.");
      for (const disposition of dispositionById.values()) {
        if (disposition.disposition === "transfer" && !replacementByKey.has(disposition.replacementKey)) fail("Criterion transfer names an unknown replacement.");
        if (disposition.disposition === "elevate" && (!(["phase", "solution"] as string[]).includes(disposition.owner) || disposition.owner === "phase" && sourceOwner.entityType !== "Phase")) fail("Criterion elevation must target the owning Phase or accepted BoundedSolution.");
        if (disposition.disposition === "split") {
          if (!Array.isArray(disposition.replacements) || disposition.replacements.length < 2 || disposition.replacements.length > 16) fail("Criterion split requires two or more explicit replacements.");
          const uniqueBodies = new Set<string>();
          for (const split of disposition.replacements) {
            exactInput(split, ["owner", "criterion"]);
            if (!split.owner || !["replacement", "phase", "solution"].includes(split.owner.kind)) fail("Split Criterion owner is invalid.");
            exactInput(split.owner, split.owner.kind === "replacement" ? ["kind", "key"] : ["kind"]);
            if (split.owner.kind === "replacement" && !replacementByKey.has(split.owner.key)) fail("Split Criterion names an unknown replacement.");
            if (split.owner.kind === "phase" && sourceOwner.entityType !== "Phase") fail("A direct WorkItem has no owning Phase to receive a split Criterion.");
            exactInput(split.criterion, ["statement", "criticality", "verificationIntent", "validationPolicy", "criterionState"]);
            if (!split.criterion.statement?.trim() || !split.criterion.verificationIntent?.trim() || !["required", "optional", "informational"].includes(split.criterion.criticality) || !["deterministic", "semantic_ai", "visual_human", "deferred_visual_phase", "operator_decision"].includes(split.criterion.validationPolicy)) fail("Split Criterion must preserve explicit acceptance and validation semantics.");
            const body = JSON.stringify(split.criterion); if (uniqueBodies.has(body)) fail("Split Criteria must be distinct."); uniqueBodies.add(body);
          }
        }
      }
      const replacementRecords = new Map<string, ProjectStateRecord<"WorkItem">>();
      const resolveOwner = async (owner: { kind: "replacement"; key: string } | { kind: "phase" } | { kind: "solution" }, solutionId: EntityId) => {
        exactInput(owner, owner.kind === "replacement" ? ["kind", "key"] : ["kind"]);
        if (owner.kind === "replacement") { const record = replacementRecords.get(owner.key); if (!record) fail("Criterion mapping names an unknown replacement."); return record; }
        if (owner.kind === "phase") { if (sourceOwner.entityType !== "Phase") fail("A direct WorkItem has no owning Phase to elevate its Criterion to."); return sourceOwner; }
        const record = await requiredRecord(unit, projectId, solutionId); if (record.entityType !== "BoundedSolution") fail("Accepted BoundedSolution is unavailable."); return record;
      };
      const incomingMappings = new Map<EntityId, string[]>();
      for (const mapping of input.incomingDependentMappings) {
        exactInput(mapping, ["dependentWorkItemId", "replacementKeys"]);
        if (incomingMappings.has(mapping.dependentWorkItemId) || !Array.isArray(mapping.replacementKeys) || mapping.replacementKeys.length < 1 || new Set(mapping.replacementKeys).size !== mapping.replacementKeys.length || mapping.replacementKeys.some(key => !replacementByKey.has(key))) fail("Incoming dependency mapping is invalid or ambiguous.");
        incomingMappings.set(mapping.dependentWorkItemId, mapping.replacementKeys);
      }
      if (incoming.length !== incomingMappings.size || incoming.some(edge => !incomingMappings.has(edge.fromEntityId))) fail("Every incoming dependent requires an explicit replacement mapping.");
      const oldDependencyIds = new Set(sourceDependencies.map(edge => edge.toEntityId));
      for (const id of oldDependencyIds) if (!input.replacements.some(candidate => candidate.dependencyWorkItemIds.includes(id))) fail("Every outgoing source dependency must be explicitly mapped to replacement WorkItems.");
      for (const candidate of input.replacements) {
        if (candidate.dependencyWorkItemIds.some(id => !currentWorkIds.has(id) || id === source.id) || candidate.dependencyReplacementKeys.some(key => !replacementByKey.has(key) || key === candidate.key)) fail("Replacement dependency mapping contains an unknown, foreign, or self dependency.");
      }

      const createWorkItem = (candidate: WorkItemDecompositionCandidate) => {
        const record = createProjectStateEntity({ entityType: "WorkItem", projectId, body: { workItemKind: candidate.kind, title: candidate.title, objective: candidate.objective, workState: "planned" }, principal: trustedPrincipal });
        return record as ProjectStateRecord<"WorkItem">;
      };
      // Allocate IDs before validating the complete resulting dependency graph.
      for (const candidate of input.replacements) replacementRecords.set(candidate.key, createWorkItem(candidate));
      const futureIds = new Set([...currentWorkIds].filter(id => id !== source.id));
      for (const record of replacementRecords.values()) futureIds.add(record.id);
      const futureEdges = allEdges.filter(edge => edge.relationshipType === "depends_on" && edge.fromEntityId !== source.id && edge.toEntityId !== source.id)
        .map(edge => ({ from: edge.fromEntityId, to: edge.toEntityId }));
      for (const candidate of input.replacements) {
        const child = replacementRecords.get(candidate.key)!;
        for (const id of candidate.dependencyWorkItemIds) futureEdges.push({ from: child.id, to: id });
        for (const key of candidate.dependencyReplacementKeys) futureEdges.push({ from: child.id, to: replacementRecords.get(key)!.id });
      }
      for (const [dependentId, keys] of incomingMappings) for (const key of keys) futureEdges.push({ from: dependentId, to: replacementRecords.get(key)!.id });
      validateDag(futureIds, futureEdges);

      for (const replacement of replacementRecords.values()) {
        await unit.saveEntity(replacement, null);
        await recordMutation(unit, { projectId, entityId: replacement.id, fromVersion: null, toVersion: 1, operation: "create", eventType: PROJECT_STATE_EVENT_TYPES.create,
          occurredAt: replacement.createdAt, changedFields: Object.keys(replacement.body), defaultReason: "Create decomposed WorkItem", context });
      }

      const endEdge = async (edge: ProjectStateRelationship, reason: string) => {
        const endedAt = new Date().toISOString();
        await unit.endRelationship(edge.id, endedAt);
        await recordMutation(unit, { projectId, entityId: edge.fromEntityId, fromVersion: (await requiredRecord(unit, projectId, edge.fromEntityId)).recordVersion,
          toVersion: (await requiredRecord(unit, projectId, edge.fromEntityId)).recordVersion, operation: "relationship-end", eventType: PROJECT_STATE_EVENT_TYPES.relationshipEnd,
          occurredAt: endedAt, changedFields: [`relationship:${edge.relationshipType}`], defaultReason: reason, context, relationshipId: edge.id });
      };
      const sourceCriterionIdSet = new Set(sourceCriterionIds);
      const criterionEdgesToEnd = allEdges.filter(edge => edge.relationshipType === "defines_criterion" && sourceCriterionIdSet.has(edge.toEntityId));
      for (const edge of [...sourceDependencies, ...incoming, ...criterionEdgesToEnd]) await endEdge(edge, "Re-map decomposed WorkItem graph");

      for (const candidate of input.replacements) {
        const replacement = replacementRecords.get(candidate.key)!;
        await linkSemantic(unit, projectId, replacement, sourceOwner, "part_of", context);
        const solution = await requiredRecord(unit, projectId, solutionByKey.get(candidate.key)!);
        await linkSemantic(unit, projectId, replacement, solution, "implements", context);
      }
      for (const candidate of input.replacements) {
        const replacement = replacementRecords.get(candidate.key)!;
        for (const id of candidate.dependencyWorkItemIds) await linkSemantic(unit, projectId, replacement, await requiredRecord(unit, projectId, id), "depends_on", context);
        for (const key of candidate.dependencyReplacementKeys) await linkSemantic(unit, projectId, replacement, replacementRecords.get(key)!, "depends_on", context);
      }
      for (const [dependentId, keys] of incomingMappings) for (const key of keys) await linkSemantic(unit, projectId,
        await requiredRecord(unit, projectId, dependentId), replacementRecords.get(key)!, "depends_on", context);

      for (const criterionId of sourceCriterionIds) {
        const disposition = dispositionById.get(criterionId)!;
        const criterion = await requiredRecord(unit, projectId, criterionId);
        if (criterion.entityType !== "Criterion" || criterion.lifecycleState !== "active") fail("Source Criterion is not current.");
        if (disposition.disposition === "transfer") {
          const owner = replacementRecords.get(disposition.replacementKey); if (!owner) fail("Criterion transfer names an unknown replacement.");
          await linkSemantic(unit, projectId, owner, criterion, "defines_criterion", context);
        } else if (disposition.disposition === "elevate") {
          const solutionId = solutionByKey.get(input.replacements[0].key)!;
          const owner = disposition.owner === "phase" ? sourceOwner : await requiredRecord(unit, projectId, solutionId);
          if (disposition.owner === "solution" && owner.entityType !== "BoundedSolution") fail("Criterion elevation solution is invalid.");
          await linkSemantic(unit, projectId, owner, criterion, "defines_criterion", context);
        } else {
          if (!Array.isArray(disposition.replacements) || disposition.replacements.length < 2 || disposition.replacements.length > 16) fail("Criterion split requires two or more explicit replacements.");
          const terminalCriterion = validateProjectStateEntity({ ...criterion, recordVersion: criterion.recordVersion + 1, lifecycleState: "voided", updatedAt: new Date().toISOString(), updatedBy: trustedPrincipal,
            body: { ...criterion.body, criterionState: "decomposed" } });
          await unit.saveEntity(terminalCriterion, criterion.recordVersion);
          await recordMutation(unit, { projectId, entityId: criterion.id, fromVersion: criterion.recordVersion, toVersion: terminalCriterion.recordVersion, operation: "revise",
            eventType: PROJECT_STATE_EVENT_TYPES.revise, occurredAt: terminalCriterion.updatedAt, changedFields: ["criterionState", "lifecycleState"], defaultReason: "Retire split Criterion through accepted WorkItem decomposition", context });
          const seenBodies = new Set<string>();
          for (const split of disposition.replacements) {
            exactInput(split, ["owner", "criterion"]); exactInput(split.criterion, ["statement", "criticality", "verificationIntent", "validationPolicy", "criterionState"]);
            if (!split.criterion.statement?.trim() || !split.criterion.verificationIntent?.trim() || !["required", "optional", "informational"].includes(split.criterion.criticality) || !["deterministic", "semantic_ai", "visual_human", "deferred_visual_phase", "operator_decision"].includes(split.criterion.validationPolicy)) fail("Split Criterion must preserve explicit acceptance and validation semantics.");
            const serialized = JSON.stringify(split.criterion); if (seenBodies.has(serialized)) fail("Split Criteria must be distinct."); seenBodies.add(serialized);
            const owner = await resolveOwner(split.owner, solutionByKey.get(input.replacements[0].key)!);
            const created = createProjectStateEntity({ entityType: "Criterion", projectId, body: { ...split.criterion, criterionState: split.criterion.criterionState ?? "active" }, principal: trustedPrincipal });
            await unit.saveEntity(created, null);
            await recordMutation(unit, { projectId, entityId: created.id, fromVersion: null, toVersion: 1, operation: "create", eventType: PROJECT_STATE_EVENT_TYPES.create,
              occurredAt: created.createdAt, changedFields: Object.keys(created.body), defaultReason: "Create replacement Criterion for WorkItem decomposition", context });
            await linkSemantic(unit, projectId, owner, created, "defines_criterion", context);
            await linkSemantic(unit, projectId, created, terminalCriterion, "derived_from", context);
          }
        }
      }
      const now = new Date().toISOString();
      const terminalSource = validateProjectStateEntity({ ...source, recordVersion: source.recordVersion + 1, lifecycleState: "voided", updatedAt: now, updatedBy: trustedPrincipal,
        body: { ...source.body, workState: "cancelled" } });
      await unit.saveEntity(terminalSource, source.recordVersion, { evidenceReliedUpon: true });
      await recordMutation(unit, { projectId, entityId: source.id, fromVersion: source.recordVersion, toVersion: terminalSource.recordVersion, operation: "revise",
        eventType: PROJECT_STATE_EVENT_TYPES.revise, occurredAt: now, changedFields: ["lifecycleState", "workState"], defaultReason: "Accept typed WorkItem decomposition", context });
      for (const replacement of replacementRecords.values()) {
        const edge = createDomainRelationship({ projectId, fromEntityId: source.id, relationshipType: "decomposed_into", toEntityId: replacement.id, createdBy: trustedPrincipal }, id =>
          id === source.id ? terminalSource : id === replacement.id ? replacement : undefined);
        await unit.saveRelationship(edge);
        await recordMutation(unit, { projectId, entityId: source.id, fromVersion: terminalSource.recordVersion, toVersion: terminalSource.recordVersion, operation: "relationship-create",
          eventType: PROJECT_STATE_EVENT_TYPES.relationshipCreate, occurredAt: edge.createdAt, changedFields: ["relationship:decomposed_into"], defaultReason: "Record WorkItem decomposition provenance", context, relationshipId: edge.id });
      }
      return { source: terminalSource, replacements: [...replacementRecords.values()] };
    });
  }

  async function recordRouteAssessment(projectId: ProjectId, intakeId: EntityId, input: Omit<EntityBodyMap["RouteAssessment"], "workIntakeId" | "recommendation" | "alternate"> & { recommendation: ExistingProjectWorkRoute; alternate?: ExistingProjectWorkRoute }, context?: MutationContext) {
    exactInput(input, ["recommendation", "traits", "rationale", "alternate", "evidenceIds"]);
    if (!Array.isArray(input.evidenceIds)) fail("Route assessment evidence identities are required.");
    return store.transaction(projectId, async unit => {
      const intake = await requiredRecord(unit, projectId, intakeId);
      if (intake.entityType !== "WorkIntake" || intake.lifecycleState !== "active") fail("Active Work Intake is required for route assessment.");
      if (!workflowTypeForWorkRoute(input.recommendation) || (input.alternate !== undefined && !workflowTypeForWorkRoute(input.alternate))) fail("Unsupported Existing-Project Work Intake route.");
      if (context?.correlationId) {
        const existing = (await unit.listEntities(projectId, "RouteAssessment"))
          .find(item => item.entityType === "RouteAssessment" && item.provenance.correlationId === context.correlationId);
        if (existing) {
          if (existing.entityType !== "RouteAssessment") fail("Route assessment correlation record has an invalid type.");
          const expected = { ...input, workIntakeId: intakeId };
          if (existing.body.workIntakeId !== intakeId || intakeRecordVersionSource(existing) !== intake.recordVersion ||
            existing.body.recommendation !== expected.recommendation || existing.body.rationale !== expected.rationale ||
            existing.body.alternate !== expected.alternate || JSON.stringify(existing.body.traits) !== JSON.stringify(expected.traits) ||
            JSON.stringify(existing.body.evidenceIds) !== JSON.stringify(expected.evidenceIds))
            fail("Route assessment correlation ID already belongs to different assessment content.");
          return existing;
        }
      }
      for (const evidenceId of input.evidenceIds) {
        const evidence = await requiredRecord(unit, projectId, evidenceId);
        if (evidence.entityType !== "Evidence") fail("Route assessment evidence reference must identify Evidence.");
      }
      const assessment = createProjectStateEntity({ entityType: "RouteAssessment", projectId,
        body: { ...input, workIntakeId: intakeId }, principal: trustedPrincipal,
        provenance: { origin: "native", ...(context?.correlationId ? { correlationId: context.correlationId } : {}),
          sourceRef: context?.causationId ?? `work-intake-record-version:${intake.recordVersion}` } });
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
      return assessment;
    });
  }

  async function recordRouteDecision(projectId: ProjectId, intakeId: EntityId, input: { route: ExistingProjectWorkRoute; assessmentId: EntityId; rationale?: string }, context?: MutationContext) {
    exactInput(input, ["route", "assessmentId", "rationale"]);
    if (trustedPrincipal.principalType !== "human" || trustedPrincipal.role !== "Operator") fail("Only the human Operator can select a Work Intake route.");
    if (!workflowTypeForWorkRoute(input.route)) fail("Unsupported Existing-Project Work Intake route.");
    return store.transaction(projectId, async unit => {
      const intake = await requiredRecord(unit, projectId, intakeId);
      const assessment = await requiredRecord(unit, projectId, input.assessmentId);
      if (intake.entityType !== "WorkIntake" || intake.lifecycleState !== "active" || assessment.entityType !== "RouteAssessment" || assessment.body.workIntakeId !== intakeId) fail("Route decision requires an active Work Intake and its assessment.");
      if (intakeRecordVersionSource(assessment) !== intake.recordVersion) fail("Route assessment is stale because the Work Intake changed.");
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

  async function recordWorkIntakeRouteRevisionRequest(projectId: ProjectId, intakeId: EntityId,
    input: { assessmentId: EntityId; rationale: string }, context?: MutationContext) {
    exactInput(input, ["assessmentId", "rationale"]);
    if (trustedPrincipal.principalType !== "human" || trustedPrincipal.role !== "Operator") fail("Only the human Operator can request a routing revision.");
    if (typeof input.rationale !== "string" || !input.rationale.trim() || input.rationale.trim().length > 4000) fail("Bounded revision instructions are required.");
    return store.transaction(projectId, async unit => {
      const intake = await requiredRecord(unit, projectId, intakeId);
      const assessment = await requiredRecord(unit, projectId, input.assessmentId);
      if (intake.entityType !== "WorkIntake" || intake.lifecycleState !== "active" || assessment.entityType !== "RouteAssessment" || assessment.body.workIntakeId !== intakeId)
        fail("Route revision requires an active Work Intake and its RouteAssessment.");
      if (intakeRecordVersionSource(assessment) !== intake.recordVersion) fail("Route assessment is stale because the Work Intake changed.");
      if (context?.correlationId) {
        const existing = (await unit.listStateChanges(projectId)).find(change => change.correlationId === context.correlationId && change.operation === "create");
        if (existing) {
          const record = await unit.getEntity(projectId, existing.entityId);
          if (record?.entityType === "Decision" && record.body.decisionType === "work-intake-route" && record.body.outcome === "revision_requested" && record.body.rationale === input.rationale.trim()) return record;
          fail("Route revision correlation ID already belongs to a different operation.");
        }
      }
      const now = new Date().toISOString();
      const decision = createProjectStateEntity({ entityType: "Decision", projectId,
        body: decisionBody({ decisionType: "work-intake-route", outcome: "revision_requested", decisionScope: `work-intake:${intakeId}`, rationale: input.rationale.trim() }, trustedPrincipal, now), principal: trustedPrincipal });
      await unit.saveEntity(decision, null);
      await recordMutation(unit, { projectId, entityId: decision.id, fromVersion: null, toVersion: 1, operation: "create",
        eventType: PROJECT_STATE_EVENT_TYPES.create, occurredAt: decision.createdAt, changedFields: Object.keys(decision.body),
        defaultReason: "Request Work Intake route revision", context });
      for (const [relationshipType, target] of [["governs", intake], ["derived_from", assessment]] as const) {
        const edge = createDomainRelationship({ projectId, fromEntityId: decision.id, relationshipType, toEntityId: target.id, createdBy: trustedPrincipal },
          id => id === decision.id ? decision : id === target.id ? target : undefined);
        await unit.saveRelationship(edge);
        await recordMutation(unit, { projectId, entityId: decision.id, fromVersion: 1, toVersion: 1, operation: "relationship-create",
          eventType: PROJECT_STATE_EVENT_TYPES.relationshipCreate, occurredAt: edge.createdAt, changedFields: [`relationship:${relationshipType}`],
          defaultReason: `Link Work Intake route revision ${relationshipType}`, context, relationshipId: edge.id });
      }
      return decision;
    });
  }

  async function completeWorkIntakeRouteHandoff(projectId: ProjectId, input: {
    intakeId: EntityId; routingWorkflowId: EntityId; assessmentId: EntityId; disposition: "accept" | "override";
    route: ExistingProjectWorkRoute; rationale: string; targetTitle: string;
    sourceSeed?: { repositoryId: string; integrationTargetSourceLineId: string; baseRevisionId: string };
  }, context?: MutationContext) {
    exactInput(input, ["intakeId", "routingWorkflowId", "assessmentId", "disposition", "route", "rationale", "targetTitle", "sourceSeed"]);
    if (trustedPrincipal.principalType !== "human" || trustedPrincipal.role !== "Operator") fail("Only the human Operator can hand off routed work.");
    if (!workflowTypeForWorkRoute(input.route) || !["accept", "override"].includes(input.disposition)) fail("A supported Existing-Project route and disposition are required.");
    if (typeof input.rationale !== "string" || !input.rationale.trim() || input.rationale.trim().length > 4000) fail("Bounded Operator rationale is required.");
    const targetType = workflowTypeForWorkRoute(input.route)!;
    const targetDefinition = getWorkflowTypeDefinition(targetType)!;
    if (typeof input.targetTitle !== "string" || !input.targetTitle.trim() || input.targetTitle.trim().length > 200) fail("Target Workflow title must contain 1 to 200 characters.");
    return store.transaction(projectId, async unit => {
      if (context?.correlationId) {
        const changes = await unit.listStateChanges(projectId);
        const createdWorkflows = await Promise.all(changes.filter(change => change.correlationId === context.correlationId && change.operation === "create")
          .map(change => unit.getEntity(projectId, change.entityId)));
        const priorTarget = createdWorkflows.find(record => record?.entityType === "Workflow" && record.body.workflowType !== "work-intake-routing");
        if (priorTarget?.entityType === "Workflow") {
          const edges = (await unit.listRelationships(projectId, "routes_to")).filter(edge => edge.fromEntityId === input.routingWorkflowId && edge.toEntityId === priorTarget.id && !edge.endedAt);
          const target = edges.length === 1 ? priorTarget : null;
          if (target?.provenance.correlationId === context.correlationId) return { workflow: target, route: input.route, alreadyCompleted: true };
          fail("Route handoff correlation ID already belongs to a different operation.");
        }
      }
      const intake = await requiredRecord(unit, projectId, input.intakeId);
      const routing = await requiredRecord(unit, projectId, input.routingWorkflowId);
      const assessment = await requiredRecord(unit, projectId, input.assessmentId);
      if (intake.entityType !== "WorkIntake" || intake.lifecycleState !== "active" || !["captured", "assessing"].includes(intake.body.intakeState)) fail("An active unrouted Work Intake is required.");
      if (routing.entityType !== "Workflow" || routing.body.workflowType !== "work-intake-routing" || routing.lifecycleState !== "active" || routing.body.workflowState === "closed" || routing.body.workflowState === "cancelled") fail("Exact active WIR Workflow is required.");
      if (assessment.entityType !== "RouteAssessment" || assessment.body.workIntakeId !== intake.id || intakeRecordVersionSource(assessment) !== intake.recordVersion) fail("Current RouteAssessment for this Work Intake is required.");
      const starts = (await unit.listRelationships(projectId, "initiates")).filter(edge => edge.fromEntityId === intake.id && !edge.endedAt);
      if (starts.length !== 1 || starts[0].toEntityId !== routing.id) fail("Work Intake must initiate this exact WIR Workflow.");
      const assesses = (await unit.listRelationships(projectId, "assesses_route")).some(edge => edge.fromEntityId === assessment.id && edge.toEntityId === intake.id && !edge.endedAt);
      if (!assesses) fail("RouteAssessment is not linked to this Work Intake.");
      const latestAssessment = (await unit.listEntities(projectId, "RouteAssessment"))
        .filter(item => item.entityType === "RouteAssessment" && item.body.workIntakeId === intake.id && item.lifecycleState === "active")
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))[0];
      if (!latestAssessment || latestAssessment.id !== assessment.id) fail("RouteAssessment is no longer current.");
      if (input.disposition === "accept" && input.route !== assessment.body.recommendation) fail("Accept must use the current RouteAssessment recommendation.");
      if (input.disposition === "override" && input.route === assessment.body.recommendation) fail("Override must select a different supported WIR route.");
      const allIntakes = (await unit.listRelationships(projectId, "routes_to")).filter(edge => edge.fromEntityId === routing.id && !edge.endedAt);
      if (allIntakes.length) fail("WIR already has a routed target Workflow.");
      const now = new Date().toISOString();
      const decision = createProjectStateEntity({ entityType: "Decision", projectId,
        body: decisionBody({ decisionType: "work-intake-route", outcome: input.route, decisionScope: `work-intake:${intake.id}`, rationale: input.rationale.trim() }, trustedPrincipal, now), principal: trustedPrincipal });
      await unit.saveEntity(decision, null);
      await recordMutation(unit, { projectId, entityId: decision.id, fromVersion: null, toVersion: 1, operation: "create",
        eventType: PROJECT_STATE_EVENT_TYPES.create, occurredAt: decision.createdAt, changedFields: Object.keys(decision.body), defaultReason: "Decide Work Intake route", context });
      for (const [relationshipType, target] of [["governs", intake], ["derived_from", assessment]] as const) {
        const edge = createDomainRelationship({ projectId, fromEntityId: decision.id, relationshipType, toEntityId: target.id, createdBy: trustedPrincipal },
          id => id === decision.id ? decision : id === target.id ? target : undefined);
        await unit.saveRelationship(edge);
        await recordMutation(unit, { projectId, entityId: decision.id, fromVersion: 1, toVersion: 1, operation: "relationship-create",
          eventType: PROJECT_STATE_EVENT_TYPES.relationshipCreate, occurredAt: edge.createdAt, changedFields: [`relationship:${relationshipType}`], defaultReason: `Link route ${relationshipType}`, context, relationshipId: edge.id });
      }
      const created = await createSubstantiveWorkflowInUnitOfWork(unit, projectId, {
        workflowType: targetType, title: input.targetTitle.trim(), entryWorkspace: targetDefinition.entryWorkspace,
        ...(input.sourceSeed ? { sourceSeed: input.sourceSeed } : {}),
      }, context);
      const routeEdge = createDomainRelationship({ projectId, fromEntityId: routing.id, relationshipType: "routes_to", toEntityId: created.workflow.id, createdBy: trustedPrincipal },
        id => id === routing.id ? routing : id === created.workflow.id ? created.workflow : undefined);
      await unit.saveRelationship(routeEdge);
      await recordMutation(unit, { projectId, entityId: routing.id, fromVersion: routing.recordVersion, toVersion: routing.recordVersion,
        operation: "relationship-create", eventType: PROJECT_STATE_EVENT_TYPES.relationshipCreate, occurredAt: routeEdge.createdAt,
        changedFields: ["relationship:routes_to"], defaultReason: "Link WIR target Workflow", context, relationshipId: routeEdge.id });
      const closedIntake = validateProjectStateEntity({ ...intake, recordVersion: intake.recordVersion + 1, lifecycleState: "closed", closedAt: now,
        updatedAt: now, updatedBy: trustedPrincipal, body: { ...intake.body, intakeState: "closed" } });
      await unit.saveEntity(closedIntake, intake.recordVersion);
      await recordMutation(unit, { projectId, entityId: intake.id, fromVersion: intake.recordVersion, toVersion: closedIntake.recordVersion,
        operation: "revise", eventType: PROJECT_STATE_EVENT_TYPES.revise, occurredAt: now, changedFields: ["intakeState", "lifecycleState", "closedAt"], defaultReason: "Close routed Work Intake", context });
      const closedRouting = validateProjectStateEntity({ ...routing, recordVersion: routing.recordVersion + 1, lifecycleState: "closed", closedAt: now,
        updatedAt: now, updatedBy: trustedPrincipal, body: { ...routing.body, workflowState: "closed" } });
      await unit.saveEntity(closedRouting, routing.recordVersion);
      await recordMutation(unit, { projectId, entityId: routing.id, fromVersion: routing.recordVersion, toVersion: closedRouting.recordVersion,
        operation: "revise", eventType: PROJECT_STATE_EVENT_TYPES.revise, occurredAt: now, changedFields: ["workflowState", "lifecycleState", "closedAt"], defaultReason: "Close routed WIR Workflow", context });
      return { workflow: created.workflow, route: input.route, alreadyCompleted: false };
    });
  }

  async function createWorkflowSourceBaseline(projectId: ProjectId, workflowId: EntityId,
    input: { repositoryId: string; integrationTargetSourceLineId: string; baseRevisionId: string }, context?: MutationContext) {
    exactInput(input, ["repositoryId", "integrationTargetSourceLineId", "baseRevisionId"]);
    return store.transaction(projectId, async unit => {
      if (!await unit.getProject(projectId)) fail("Owning Project does not exist.");
      const workflow = await requiredRecord(unit, projectId, workflowId);
      if (workflow.entityType !== "Workflow") fail("SourceBaseline requires a Workflow.");
      if (workflow.body.workflowType === "work-intake-routing") fail("WIR cannot own an implementation SourceBaseline.");
      if (workflow.lifecycleState !== "active" || ["closed", "cancelled"].includes(workflow.body.workflowState)) fail("SourceBaseline requires a current nonterminal Workflow.");
      const workflowLineageIds = new Set((await unit.listEntities(projectId, "Workflow"))
        .filter(record => record.entityType === "Workflow" && record.lineageId === workflow.lineageId)
        .map(record => record.id));
      if ((await unit.listEntities(projectId, "SourceBaseline")).some(record =>
        record.entityType === "SourceBaseline" && workflowLineageIds.has(record.body.workflowId))) {
        fail("Workflow already has a SourceBaseline.");
      }
      const body: EntityBodyMap["SourceBaseline"] = { workflowId, ...input };
      const baseline = createProjectStateEntity({ entityType: "SourceBaseline", projectId, body, principal: trustedPrincipal });
      await unit.saveEntity(baseline, null);
      await recordMutation(unit, { projectId, entityId: baseline.id, fromVersion: null, toVersion: 1,
        operation: "create", eventType: PROJECT_STATE_EVENT_TYPES.create, occurredAt: baseline.createdAt,
        changedFields: Object.keys(baseline.body), defaultReason: "Capture Workflow SourceBaseline", context });
      await linkSemantic(unit, projectId, baseline, workflow, "baselines_source", context);
      return baseline;
    });
  }

  async function createWorkflowSourceBinding(projectId: ProjectId, workflowId: EntityId, sourceBaselineId: EntityId, context?: MutationContext) {
    return store.transaction(projectId, async unit => {
      const workflow = await requiredRecord(unit, projectId, workflowId);
      const baseline = await requiredRecord(unit, projectId, sourceBaselineId);
      if (workflow.entityType !== "Workflow" || workflow.lifecycleState !== "active" || workflow.body.workflowType === "work-intake-routing" || ["closed", "cancelled"].includes(workflow.body.workflowState)) fail("SourceBinding requires a current substantive Workflow.");
      if (baseline.entityType !== "SourceBaseline") fail("SourceBinding requires a SourceBaseline.");
      const lineage = (await unit.listEntities(projectId, "Workflow")).filter(r => r.entityType === "Workflow" && r.lineageId === workflow.lineageId);
      const lineageIds = new Set(lineage.map(r => r.id));
      if (!lineageIds.has(baseline.body.workflowId)) fail("SourceBaseline must belong to the same Workflow lineage.");
      const prior = (await unit.listEntities(projectId, "SourceBinding"))
        .filter(record => record.entityType === "SourceBinding" && lineageIds.has(record.body.workflowId));
      if (prior.length) fail("Workflow lineage already has a SourceBinding.");
      const body: EntityBodyMap["SourceBinding"] = { workflowId, sourceBaselineId, preparationState: "unprepared" };
      assertSourceBindingBody(body, baseline.body);
      const binding = createProjectStateEntity({ entityType: "SourceBinding", projectId, body, principal: trustedPrincipal });
      await unit.saveEntity(binding, null);
      await recordMutation(unit, { projectId, entityId: binding.id, fromVersion: null, toVersion: 1,
        operation: "create", eventType: PROJECT_STATE_EVENT_TYPES.create, occurredAt: binding.createdAt,
        changedFields: Object.keys(binding.body), defaultReason: "Create SourceBinding", context });
      const baselineWorkflow = await requiredRecord(unit, projectId, baseline.body.workflowId);
      await linkSemantic(unit, projectId, binding, workflow, "binds_source", context, [baseline, baselineWorkflow]);
      return binding;
    });
  }

  async function updateSourceBinding(projectId: ProjectId, bindingId: EntityId, changes: Partial<Pick<EntityBodyMap["SourceBinding"], "preparationState" | "workSourceLineId" | "currentRevisionId" | "repositoryCheckoutId" | "failureCode">>, expectedRevision: number, context?: MutationContext) {
    const patch = exactInput(changes, ["preparationState", "workSourceLineId", "currentRevisionId", "repositoryCheckoutId", "failureCode"]);
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
      const baseline = await requiredRecord(unit, projectId, body.sourceBaselineId);
      const workflow = await requiredRecord(unit, projectId, body.workflowId);
      if (baseline.entityType !== "SourceBaseline" || workflow.entityType !== "Workflow" || baseline.body.workflowId !== body.workflowId && !(await unit.listEntities(projectId, "Workflow")).some(r => r.entityType === "Workflow" && r.id === baseline.body.workflowId && r.lineageId === workflow.lineageId)) fail("SourceBinding baseline and Workflow lineage mismatch.");
      assertSourceBindingBody(body, baseline.body);
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

  async function createSourceCheckpoint(projectId: ProjectId, bindingId: EntityId, workflowId: EntityId, targetId: EntityId,
    input: Pick<EntityBodyMap["SourceCheckpoint"], "boundaryId" | "expectedRevisionId" | "checkpointKind" | "checkpointState"> & { resultingRevisionId?: string; receiptDigest?: string }, context?: MutationContext) {
    exactInput(input, ["boundaryId", "expectedRevisionId", "checkpointKind", "checkpointState", "resultingRevisionId", "receiptDigest"]);
    return store.transaction(projectId, async unit => {
      const binding = await requiredRecord(unit, projectId, bindingId);
      const target = await requiredRecord(unit, projectId, targetId);
      if (binding.entityType !== "SourceBinding" || binding.body.preparationState !== "ready" || !binding.body.workSourceLineId || !binding.body.repositoryCheckoutId) fail("Checkpoint requires a ready SourceBinding with RepositoryCheckout.");
      const baseline = await requiredRecord(unit, projectId, binding.body.sourceBaselineId);
      const workflow = await requiredRecord(unit, projectId, workflowId);
      await requireCurrentSourceWorkflow(unit, projectId, workflow);
      const bindingWorkflow = await requiredRecord(unit, projectId, binding.body.workflowId);
      const baselineWorkflow = baseline.entityType === "SourceBaseline" ? await requiredRecord(unit, projectId, baseline.body.workflowId) : null;
      if (baseline.entityType !== "SourceBaseline" || workflow.entityType !== "Workflow" || bindingWorkflow.entityType !== "Workflow" || baselineWorkflow?.entityType !== "Workflow" || workflow.body.workflowType === "work-intake-routing" || workflow.lineageId !== bindingWorkflow.lineageId || baselineWorkflow.lineageId !== workflow.lineageId) fail("SourceCheckpoint Workflow and SourceBinding lineage mismatch.");
      if (!["WorkItem", "Workflow", "ImplementationRecord", "TesterResult"].includes(target.entityType)) fail("Unsupported checkpoint target.");
      if ((await unit.listEntities(projectId, "SourceCheckpoint")).some(record => record.entityType === "SourceCheckpoint" && record.body.boundaryId === input.boundaryId)) fail("Checkpoint boundary already exists.");
      const lineageIds = new Set((await unit.listEntities(projectId, "Workflow")).filter(r => r.entityType === "Workflow" && r.lineageId === workflow.lineageId).map(r => r.id));
      const body: EntityBodyMap["SourceCheckpoint"] = { ...input, workflowId,
        sourceLineId: binding.body.workSourceLineId };
      const edges = await unit.listRelationships(projectId);
      const belongs = (id: EntityId) => {
        const seen = new Set<EntityId>(); let current = id;
        while (!seen.has(current)) { if (lineageIds.has(current)) return true; seen.add(current);
          const parents = edges.filter(edge => edge.relationshipType === "part_of" && edge.fromEntityId === current && !edge.endedAt);
          if (parents.length !== 1) break; current = parents[0].toEntityId; }
        return false;
      };
      if (input.checkpointKind === "implementation" && (target.entityType !== "ImplementationRecord" || !belongs(target.body.workItemId))) fail("Implementation checkpoint target is outside the owning Workflow lineage.");
      if (input.checkpointKind === "disposition" && !(target.entityType === "Workflow" ? lineageIds.has(target.id) : target.entityType === "WorkItem" && belongs(target.id))) fail("Disposition checkpoint target is outside the owning Workflow lineage.");
      if (input.checkpointKind === "tester" && (target.entityType !== "TesterResult" || target.body.sourceMode !== "source-backed" || target.body.workflowId !== workflowId ||
        target.body.checkpointState !== "pending" || target.body.candidateRevisionId || target.body.sourceCheckpointId ||
        target.body.permanentTestPaths.length === 0 || target.body.implementerRevisionId !== input.expectedRevisionId || !belongs(target.body.workItemId)))
        fail("Tester checkpoint requires the exact pending TesterResult and its Implementer revision.");
      if (binding.body.currentRevisionId !== body.expectedRevisionId) fail("Checkpoint expected revision differs from SourceBinding current revision.");
      assertSourceCheckpointBody(body);
      const checkpoint = createProjectStateEntity({ entityType: "SourceCheckpoint", projectId, body, principal: trustedPrincipal });
      await unit.saveEntity(checkpoint, null);
      await recordMutation(unit, { projectId, entityId: checkpoint.id, fromVersion: null, toVersion: 1,
        operation: "create", eventType: PROJECT_STATE_EVENT_TYPES.create, occurredAt: checkpoint.createdAt,
        changedFields: Object.keys(checkpoint.body), defaultReason: "Create SourceCheckpoint", context });
      for (const related of new Map([binding, workflow, target].map(record => [record.id, record])).values()) {
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

  async function completeTesterResultCheckpoint(projectId: ProjectId, testerResultId: EntityId, checkpointId: EntityId, expectedRevision: number, context?: MutationContext) {
    return store.transaction(projectId, async unit => {
      const result = await requiredRecord(unit, projectId, testerResultId);
      const checkpoint = await requiredRecord(unit, projectId, checkpointId);
      if (result.entityType !== "TesterResult" || result.body.sourceMode !== "source-backed" || result.recordVersion !== expectedRevision || result.body.checkpointState !== "pending" ||
        result.body.candidateRevisionId || result.body.sourceCheckpointId || checkpoint.entityType !== "SourceCheckpoint" ||
        checkpoint.body.checkpointKind !== "tester" || checkpoint.body.checkpointState !== "committed" ||
        checkpoint.body.workflowId !== result.body.workflowId || checkpoint.body.expectedRevisionId !== result.body.implementerRevisionId ||
        !checkpoint.body.resultingRevisionId || checkpoint.body.boundaryId.length === 0)
        fail("Committed Tester checkpoint does not match the current pending TesterResult.");
      const edges = await unit.listRelationships(projectId);
      if (!edges.some(edge => edge.relationshipType === "checkpoints" && edge.fromEntityId === checkpointId && edge.toEntityId === testerResultId && !edge.endedAt))
        fail("Tester checkpoint is not semantically linked to its exact TesterResult.");
      const bindingLinks = edges.filter(edge => edge.relationshipType === "checkpoints" && edge.fromEntityId === checkpointId && !edge.endedAt)
        .map(edge => edge.toEntityId);
      const linkedRecords = await Promise.all(bindingLinks.map(id => requiredRecord(unit, projectId, id)));
      const sourceBindings = linkedRecords.filter(record => record.entityType === "SourceBinding");
      if (bindingLinks.length !== 3 || sourceBindings.length !== 1) fail("Tester checkpoint does not have one exact SourceBinding and its Workflow/result links.");
      const binding = sourceBindings[0];
      if (binding.entityType !== "SourceBinding" || binding.body.preparationState !== "ready" ||
        binding.body.currentRevisionId !== checkpoint.body.resultingRevisionId || binding.body.workSourceLineId !== checkpoint.body.sourceLineId)
        fail("Tester checkpoint SourceBinding has not advanced to its exact candidate revision.");
      const body: EntityBodyMap["TesterResult"] = { ...result.body, checkpointState: "committed",
        candidateRevisionId: checkpoint.body.resultingRevisionId, sourceCheckpointId: checkpoint.id };
      const now = new Date().toISOString();
      const next = validateProjectStateEntity({ ...result, recordVersion: expectedRevision + 1, updatedAt: now, updatedBy: trustedPrincipal, body });
      await unit.saveEntity(next, expectedRevision);
      await recordMutation(unit, { projectId, entityId: result.id, fromVersion: expectedRevision, toVersion: next.recordVersion,
        operation: "revise", eventType: PROJECT_STATE_EVENT_TYPES.revise, occurredAt: now,
        changedFields: ["checkpointState", "candidateRevisionId", "sourceCheckpointId"],
        defaultReason: "Complete Tester test-only checkpoint", context });
      return next;
    });
  }

  async function createIntegrationRecord(projectId: ProjectId, bindingId: EntityId, workflowId: EntityId,
    input: { targetBeforeRevisionId: string; candidateRevisionId?: string; targetEntityId?: EntityId }, context?: MutationContext) {
    exactInput(input, ["targetBeforeRevisionId", "candidateRevisionId", "targetEntityId"]);
    return store.transaction(projectId, async unit => {
      const binding = await requiredRecord(unit, projectId, bindingId);
      if (binding.entityType !== "SourceBinding" || binding.body.preparationState !== "ready" || !binding.body.currentRevisionId || !binding.body.workSourceLineId || !binding.body.repositoryCheckoutId) fail("Integration requires a ready SourceBinding with current revision and RepositoryCheckout.");
      const baseline = await requiredRecord(unit, projectId, binding.body.sourceBaselineId);
      const workflow = await requiredRecord(unit, projectId, workflowId);
      await requireCurrentSourceWorkflow(unit, projectId, workflow);
      const bindingWorkflow = await requiredRecord(unit, projectId, binding.body.workflowId);
      if (baseline.entityType !== "SourceBaseline" || workflow.entityType !== "Workflow" || bindingWorkflow.entityType !== "Workflow" || workflow.body.workflowType === "work-intake-routing" || workflow.lineageId !== bindingWorkflow.lineageId) fail("Integration SourceBinding Workflow is invalid.");
      const lineageIds = new Set((await unit.listEntities(projectId, "Workflow")).filter(r => r.entityType === "Workflow" && r.lineageId === workflow.lineageId).map(r => r.id));
      if (!lineageIds.has(baseline.body.workflowId)) fail("SourceBinding baseline and Workflow lineage mismatch.");
      const target = input.targetEntityId ? await requiredRecord(unit, projectId, input.targetEntityId) : null;
      if (target && !["WorkItem", "ImplementationRecord"].includes(target.entityType)) fail("Integration target must be a Work Item or ImplementationRecord.");
      const edges = await unit.listRelationships(projectId);
      const belongs = (id: EntityId) => { const seen = new Set<EntityId>(); let current = id; while (!seen.has(current)) { if (lineageIds.has(current)) return true; seen.add(current); const parents = edges.filter(edge => edge.relationshipType === "part_of" && edge.fromEntityId === current && !edge.endedAt); if (parents.length !== 1) break; current = parents[0].toEntityId; } return false; };
      if (target && !(target.entityType === "WorkItem" ? belongs(target.id) : target.entityType === "ImplementationRecord" && belongs(target.body.workItemId))) fail("Integration target is outside the owning Workflow lineage.");
      const body: EntityBodyMap["IntegrationRecord"] = { workflowId,
        incomingRevisionId: binding.body.currentRevisionId, targetSourceLineId: baseline.body.integrationTargetSourceLineId,
        targetBeforeRevisionId: input.targetBeforeRevisionId,
        ...(input.candidateRevisionId ? { candidateRevisionId: input.candidateRevisionId } : {}),
        integrationState: "prepared", outcome: "pending", validationIds: [], repairWorkItemIds: [] };
      assertIntegrationBody(body);
      const record = createProjectStateEntity({ entityType: "IntegrationRecord", projectId, body, principal: trustedPrincipal });
      await unit.saveEntity(record, null);
      await recordMutation(unit, { projectId, entityId: record.id, fromVersion: null, toVersion: 1,
        operation: "create", eventType: PROJECT_STATE_EVENT_TYPES.create, occurredAt: record.createdAt,
        changedFields: Object.keys(record.body), defaultReason: "Create IntegrationRecord", context });
      for (const related of [binding, workflow, ...(target ? [target] : [])]) await linkSemantic(unit, projectId, record, related, "integrates", context);
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
      const owner = await requiredRecord(unit, projectId, current.body.workflowId);
      const lineageIds = new Set((await unit.listEntities(projectId, "Workflow")).filter(row => row.entityType === "Workflow" && owner.entityType === "Workflow" && row.lineageId === owner.lineageId).map(row => row.id));
      const edges = await unit.listRelationships(projectId);
      const belongs = (id: EntityId) => { const seen = new Set<EntityId>(); let currentId = id; while (!seen.has(currentId)) { if (lineageIds.has(currentId)) return true; seen.add(currentId); const parents = edges.filter(edge => edge.relationshipType === "part_of" && edge.fromEntityId === currentId && !edge.endedAt); if (parents.length !== 1) break; currentId = parents[0].toEntityId; } return false; };
      for (const id of body.repairWorkItemIds) {
        const repair = await requiredRecord(unit, projectId, id);
        if (repair.entityType !== "WorkItem" || !["repair", "fix"].includes(repair.body.workItemKind)) fail("Integration repair must be a Repair or Fix Work Item.");
        if (!belongs(repair.id)) fail("Integration repair Work Item is outside the owning Workflow lineage.");
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
    const allBindings = (await store.listEntities(projectId, "SourceBinding"))
      .filter((record): record is ProjectStateRecord<"SourceBinding"> => record.entityType === "SourceBinding");
    const bindings: ProjectStateRecord<"SourceBinding">[] = [];
    for (const record of allBindings) {
      const baseline = await store.getEntity(projectId, record.body.sourceBaselineId);
      const workflow = await store.getEntity(projectId, record.body.workflowId);
      const baselineWorkflow = baseline?.entityType === "SourceBaseline" ? await store.getEntity(projectId, baseline.body.workflowId) : null;
      if (baseline?.entityType !== "SourceBaseline" || workflow?.entityType !== "Workflow" || baselineWorkflow?.entityType !== "Workflow" || baselineWorkflow.lineageId !== workflow.lineageId) fail("SourceBinding baseline and Workflow lineage mismatch.");
      if (baseline.body.repositoryId === repositoryId) bindings.push(record);
    }
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
  async function queryRecordsPage(projectId: ProjectId, query: RecordQuery = {}): Promise<RecordQueryPage> {
    exactInput(query, ["entityType", "lifecycleState", "workflowId", "workItemId", "decisionId", "decisionOutcome", "dispositionState", "updatedFrom", "updatedThrough", "relatedTo", "relationshipType", "relationshipDirection", "current", "offset", "limit"]);
    if (query.entityType !== undefined && !Object.hasOwn(ENTITY_TYPE_REGISTRY, query.entityType)) fail("Unregistered Project State entity type.");
    if (query.lifecycleState !== undefined && !["active", "closed", "archived", "superseded", "voided"].includes(query.lifecycleState)) fail("Unsupported lifecycle state.");
    if (query.relationshipType !== undefined && !Object.hasOwn(RELATIONSHIP_REGISTRY, query.relationshipType)) fail("Unregistered relationship type.");
    if (query.relationshipDirection !== undefined && !["from", "to", "either"].includes(query.relationshipDirection)) fail("Unsupported relationship direction.");
    if (query.current !== undefined && typeof query.current !== "boolean") fail("Current filter must be boolean.");
    if (query.current === true && query.lifecycleState === "superseded") fail("Current and superseded filters conflict.");
    if (query.decisionOutcome !== undefined && (typeof query.decisionOutcome !== "string" || !query.decisionOutcome)) fail("Decision outcome filter must be text.");
    if (query.dispositionState !== undefined && !dispositionOutcomes.has(query.dispositionState) && query.dispositionState !== "none") fail("Unsupported disposition state.");
    for (const time of [query.updatedFrom, query.updatedThrough]) if (time !== undefined && !canonicalInstant(time)) fail("Query time must be canonical UTC.");
    if (query.updatedFrom && query.updatedThrough && query.updatedFrom > query.updatedThrough) fail("Query time range is reversed.");
    const limit = query.limit ?? 100;
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) fail("Query limit must be between 1 and 100.");
    const offset = query.offset ?? 0;
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 10_000) fail("Query offset must be between 0 and 10000.");
    const idFilters = [query.workflowId, query.workItemId, query.decisionId, query.relatedTo].filter((id): id is EntityId => id !== undefined);
    for (const id of idFilters) if (typeof id !== "string" || !await store.getEntity(projectId, id)) fail("Query filter identity does not exist in this Project.");
    for (const [id, type] of [[query.workflowId, "Workflow"], [query.workItemId, "WorkItem"], [query.decisionId, "Decision"]] as const) {
      if (id && (await store.getEntity(projectId, id))?.entityType !== type) fail(`Query ${type} filter has the wrong entity type.`);
    }
    const edges = idFilters.length || query.relationshipType ? (await store.listRelationships(projectId)).filter(edge => !edge.endedAt) : [];
    const connected = (id: EntityId, target: EntityId) => id === target || edges.some(edge => (edge.fromEntityId === id && edge.toEntityId === target) || (edge.toEntityId === id && edge.fromEntityId === target));
    const workflowMembers = new Set<EntityId>([query.workflowId].filter((id): id is EntityId => !!id));
    if (query.workflowId) for (const edge of edges) if (edge.relationshipType === "initiates" && edge.toEntityId === query.workflowId) workflowMembers.add(edge.fromEntityId);
    if (query.workflowId) for (let pass = 0; pass < edges.length + 1; pass++) {
      const size = workflowMembers.size;
      for (const edge of edges) if (edge.relationshipType === "part_of" && workflowMembers.has(edge.toEntityId)) workflowMembers.add(edge.fromEntityId);
      if (workflowMembers.size === size) break;
    }
    const decisionMembers = new Set<EntityId>([query.decisionId].filter((id): id is EntityId => !!id));
    if (query.decisionId) for (const edge of edges) if (edge.relationshipType === "governs" && edge.fromEntityId === query.decisionId) decisionMembers.add(edge.toEntityId);
    const relationshipMatches = (recordId: EntityId) => !query.relatedTo && !query.relationshipType ? true : edges.some(edge => {
      if (query.relationshipType && edge.relationshipType !== query.relationshipType) return false;
      const outbound = edge.fromEntityId === recordId && (!query.relatedTo || edge.toEntityId === query.relatedTo);
      const inbound = edge.toEntityId === recordId && (!query.relatedTo || edge.fromEntityId === query.relatedTo);
      return query.relationshipDirection === "from" ? outbound : query.relationshipDirection === "to" ? inbound : outbound || inbound;
    });
    let matches = (await store.listEntities(projectId, query.entityType)).filter(record =>
      (!query.lifecycleState || record.lifecycleState === query.lifecycleState)
      && (query.current === undefined || (query.current ? record.lifecycleState !== "superseded" && record.lifecycleState !== "voided" : record.lifecycleState === "superseded"))
      && (!query.updatedFrom || record.updatedAt >= query.updatedFrom)
      && (!query.updatedThrough || record.updatedAt <= query.updatedThrough)
      && (!query.workflowId || workflowMembers.has(record.id) || edges.some(edge => edge.relationshipType !== "routes_to" && (workflowMembers.has(edge.fromEntityId) && edge.toEntityId === record.id || workflowMembers.has(edge.toEntityId) && edge.fromEntityId === record.id)))
      && (!query.workItemId || connected(record.id, query.workItemId) || record.entityType === "ImplementationRecord" && record.body.workItemId === query.workItemId || record.entityType === "RegressionObligation" && record.body.sourceWorkItemId === query.workItemId)
      && (!query.decisionId || decisionMembers.has(record.id))
      && (!query.decisionOutcome || record.entityType === "Decision" && record.body.outcome === query.decisionOutcome)
      && relationshipMatches(record.id));
    if (query.dispositionState) {
      const filtered: ProjectStateEntity[] = [];
      for (const record of matches) if ((await getEffectiveDisposition(projectId, record.id)).state === query.dispositionState) filtered.push(record);
      matches = filtered;
    }
    matches.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt) || a.id.localeCompare(b.id));
    const totalMatches = matches.length;
    const records = matches.slice(offset, offset + limit);
    const nextOffset = offset + records.length < totalMatches ? offset + records.length : null;
    return { records, offset, limit, totalMatches, truncated: nextOffset !== null, nextOffset };
  }
  async function queryRecords(projectId: ProjectId, query: RecordQuery = {}) { return (await queryRecordsPage(projectId, query)).records; }

  async function getCurrentProjectStateView(projectId: ProjectId, options: { limitPerSection?: number; offset?: number } = {}): Promise<CurrentProjectStateView> {
    exactInput(options, ["limitPerSection", "offset"]);
    const limit = options.limitPerSection ?? 50;
    const offset = options.offset ?? 0;
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) fail("View section limit must be between 1 and 100.");
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 10_000) fail("View offset must be between 0 and 10000.");
    const project = await store.getProject(projectId);
    if (!project) fail("Project does not exist.");
    const all = (await store.listEntities(projectId)).filter(record => record.lifecycleState !== "superseded" && record.lifecycleState !== "voided")
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
    const edges = (await store.listRelationships(projectId)).filter(edge => !edge.endedAt);
    const sections: CurrentProjectStateView["sections"] = {};
    const section = <T extends EntityType>(type: T): ProjectStateRecord<T>[] => {
      const matching = all.filter(record => record.entityType === type);
      const items = matching.slice(offset, offset + limit) as ProjectStateRecord<T>[];
      const nextOffset = offset + items.length < matching.length ? offset + items.length : null;
      sections[type] = { offset, limit, total: matching.length, truncated: nextOffset !== null, nextOffset };
      return items;
    };
    const intakes = section("WorkIntake");
    const workflows = section("Workflow");
    const phases = section("Phase");
    const workItems = section("WorkItem");
    const decisions = section("Decision");
    const validations = section("Validation");
    const bindings = section("SourceBinding");
    const checkpoints = section("SourceCheckpoint");
    const integrations = section("IntegrationRecord");
    const implementations = all.filter((record): record is ProjectStateRecord<"ImplementationRecord"> => record.entityType === "ImplementationRecord");
    const allValidations = all.filter((record): record is ProjectStateRecord<"Validation"> => record.entityType === "Validation");
    const latest = <T extends { id: string; createdAt: string }>(records: T[]) => records.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)).at(-1)?.id ?? null;
    const intakeViews = [] as CurrentProjectStateView["workIntakes"];
    for (const intake of intakes) {
      const routingWorkflowId = edges.find(edge => edge.relationshipType === "initiates" && edge.fromEntityId === intake.id)?.toEntityId ?? null;
      const targets = routingWorkflowId ? edges.filter(edge => edge.relationshipType === "routes_to" && edge.fromEntityId === routingWorkflowId) : [];
      if (targets.length > 1) fail("Work Intake routing Workflow has ambiguous routed Workflow provenance.");
      intakeViews.push({ id: intake.id, state: intake.body.intakeState,
        routingWorkflowId, targetWorkflowId: targets[0]?.toEntityId ?? null,
        route: await getCurrentWorkRoute(projectId, intake.id) });
    }
    return {
      project, sections, workIntakes: intakeViews,
      workflows: workflows.map(record => ({ id: record.id, type: record.body.workflowType, title: record.body.title,
        state: record.body.workflowState, currentWorkspace: record.body.currentWorkspace })),
      phases: phases.map(record => ({ id: record.id, state: record.body.phaseState, sequence: record.body.sequence,
        workItemIds: edges.filter(edge => edge.relationshipType === "part_of" && edge.toEntityId === record.id).map(edge => edge.fromEntityId).sort() })),
      workItems: workItems.map(record => ({ id: record.id, state: record.body.workState, kind: record.body.workItemKind,
        repairTargetIds: edges.filter(edge => edge.relationshipType === "repairs" && edge.fromEntityId === record.id).map(edge => edge.toEntityId).sort(),
        latestImplementationId: latest(implementations.filter(item => item.body.workItemId === record.id)),
        latestValidationId: latest(allValidations.filter(item => item.body.targetEntityId === record.id)) })),
      decisions: decisions.map(record => ({ id: record.id, outcome: record.body.outcome, effectiveAt: record.body.effectiveAt,
        targetIds: edges.filter(edge => edge.relationshipType === "governs" && edge.fromEntityId === record.id).map(edge => edge.toEntityId).sort() })),
      validations: validations.map(record => ({ id: record.id, targetId: record.body.targetEntityId,
        targetVersion: record.body.targetRecordVersion, outcome: record.body.outcome, sourceBaselineRef: record.body.sourceBaselineRef ?? null })),
      sourceBindings: bindings.map(record => ({ id: record.id, workflowId: record.body.workflowId, sourceBaselineId: record.body.sourceBaselineId,
        preparationState: record.body.preparationState,
        workSourceLineId: record.body.workSourceLineId ?? null,
        currentRevisionId: record.body.currentRevisionId ?? null,
        repositoryCheckoutId: record.body.repositoryCheckoutId ?? null })),
      sourceCheckpoints: checkpoints.map(record => ({ id: record.id, workflowId: record.body.workflowId,
        state: record.body.checkpointState, expectedRevisionId: record.body.expectedRevisionId,
        resultingRevisionId: record.body.resultingRevisionId ?? null })),
      integrations: integrations.map(record => ({ id: record.id, workflowId: record.body.workflowId,
        state: record.body.integrationState, outcome: record.body.outcome,
        incomingRevisionId: record.body.incomingRevisionId, resultRevisionId: record.body.resultRevisionId ?? null })),
    };
  }

  async function renderView(projectId: ProjectId, request: { projectionType: ProjectionType; sourceEntityId?: EntityId }): Promise<RenderedProjectStateView> {
    exactInput(request, ["projectionType", "sourceEntityId"]);
    const types: readonly ProjectionType[] = ["work-intake", "work-item", "repair", "fix", "validation", "implementation-report", "route-history", "decision-history", "project-state-summary"];
    if (!types.includes(request.projectionType)) fail("Unsupported Project State projection type.");
    const project = await store.getProject(projectId);
    if (!project) fail("Projection Project does not exist.");
    if (request.projectionType === "project-state-summary" && request.sourceEntityId && request.sourceEntityId !== projectId) fail("Project summary must target the Project.");
    if (request.projectionType !== "project-state-summary" && !request.sourceEntityId) fail("Projection source entity is required.");
    const target = request.projectionType === "project-state-summary" ? project : await requiredRecord(store, projectId, request.sourceEntityId as EntityId);
    const expected: Partial<Record<ProjectionType, EntityType>> = {
      "work-intake": "WorkIntake", "route-history": "WorkIntake", "work-item": "WorkItem", repair: "WorkItem", fix: "WorkItem",
      validation: "Validation", "implementation-report": "ImplementationRecord",
    };
    if (expected[request.projectionType] && target.entityType !== expected[request.projectionType]) fail("Projection source has the wrong entity type.");
    if (request.projectionType === "repair" && (target.entityType !== "WorkItem" || target.body.workItemKind !== "repair")) fail("Repair projection requires a Repair Work Item.");
    if (request.projectionType === "fix" && (target.entityType !== "WorkItem" || target.body.workItemKind !== "fix")) fail("Fix projection requires a Fix Work Item.");
    const records = new Map<EntityId, ProjectStateEntity>([[target.id, target]]);
    const allEdges = await store.listRelationships(projectId);
    const linked = allEdges.filter(edge => !edge.endedAt && (edge.fromEntityId === target.id || edge.toEntityId === target.id));
    const add = async (id: EntityId) => { const record = await store.getEntity(projectId, id); if (record) records.set(id, record); };
    if (request.projectionType === "work-intake" || request.projectionType === "route-history") {
      const history = await getWorkRouteHistory(projectId, target.id);
      for (const item of [...history.assessments, ...history.decisions]) records.set(item.id, item);
      if (request.projectionType === "work-intake") {
        for (const edge of linked.filter(edge => ["initiates", "binds_source"].includes(edge.relationshipType))) await add(edge.fromEntityId === target.id ? edge.toEntityId : edge.fromEntityId);
      }
    } else if (request.projectionType === "decision-history") {
      for (const edge of allEdges.filter(edge => edge.relationshipType === "governs" && edge.toEntityId === target.id)) await add(edge.fromEntityId);
    } else if (request.projectionType !== "project-state-summary") {
      for (const edge of linked) await add(edge.fromEntityId === target.id ? edge.toEntityId : edge.fromEntityId);
      if (request.projectionType === "work-item" || request.projectionType === "repair" || request.projectionType === "fix") {
        for (const edge of allEdges.filter(edge => edge.relationshipType === "evaluates" && edge.toEntityId === target.id)) await add(edge.fromEntityId);
      }
    }
    if (records.size > 1000) fail("Projection exceeds its record bound.");
    const sourceEntityIds = [...records.keys()].sort();
    const metadata: ProjectionMetadata = { projectionType: request.projectionType, projectionVersion: 1,
      projectId, sourceEntityIds, generatedAt: new Date().toISOString(), authoritative: false };
    const title = request.projectionType.replace(/-/g, " ").replace(/\b\w/g, letter => letter.toUpperCase());
    const header = [`# ${title}`, "", "> Generated from canonical Project State. This Markdown is non-authoritative; edits do not change Project State.", "",
      "| Projection metadata | Value |", "| --- | --- |",
      ...Object.entries(metadata).map(([key, value]) => `| ${key} | ${markdownValue(value)} |`), ""];
    if (request.projectionType === "project-state-summary") {
      const summary = await getProjectStateSummary(projectId);
      header.push("## Current record counts", "", "| Entity type | Count |", "| --- | ---: |",
        ...Object.entries(summary.countsByType).sort(([a], [b]) => a.localeCompare(b)).map(([type, count]) => `| ${type} | ${count} |`), "",
        `Active records: ${summary.activeRecords} of ${summary.totalRecords}.`, "");
    }
    const recordSections = [...records.values()].sort((a, b) => a.id.localeCompare(b.id)).map(markdownRecord);
    const edgeRows = allEdges.filter(edge => records.has(edge.fromEntityId) || records.has(edge.toEntityId))
      .sort((a, b) => a.id.localeCompare(b.id));
    if (edgeRows.length > 1000) fail("Projection exceeds its relationship bound.");
    const relationSection = ["## Related relationships", "", "| Predicate | From | To | Ended |", "| --- | --- | --- | --- |",
      ...edgeRows.map(edge => `| ${edge.relationshipType} | ${edge.fromEntityId} | ${edge.toEntityId} | ${edge.endedAt ?? ""} |`), ""];
    return { metadata, markdown: [...header, ...recordSections, ...relationSection].join("\n") };
  }

  async function exportStructuredProjectState(projectId: ProjectId): Promise<StructuredProjectStateExport> {
    if (!await store.getProject(projectId)) fail("Export Project does not exist.");
    const records = (await store.listEntities(projectId)).sort((a, b) => a.id.localeCompare(b.id));
    const relationships = (await store.listRelationships(projectId)).sort((a, b) => a.id.localeCompare(b.id));
    const stateChanges = (await store.listStateChanges(projectId)).sort((a, b) => a.occurredAt.localeCompare(b.occurredAt) || a.id.localeCompare(b.id));
    if (records.length > 10_000 || relationships.length > 100_000 || stateChanges.length > 100_000) fail("Structured export exceeds its bound.");
    const history: StructuredProjectStateExport["history"] = [];
    let versionCount = 0;
    for (const record of records) {
      versionCount += record.recordVersion;
      if (versionCount > 100_000) fail("Structured export history exceeds its bound.");
      const versions: ProjectStateEntity[] = [];
      for (let version = 1; version <= record.recordVersion; version++) {
        const snapshot = await store.getEntityVersion(projectId, record.id, version);
        if (!snapshot) fail("Structured export has a missing record version.");
        versions.push(snapshot);
      }
      history.push({ entityId: record.id, versions });
    }
    return { exportVersion: 1, projectId, generatedAt: new Date().toISOString(), authoritative: true,
      records, history, relationships, stateChanges };
  }

  async function getAuthoritativeContext(projectId: ProjectId,
    request: { scope: AuthoritativeContextScope; entityId?: EntityId; offset?: number; limit?: number }): Promise<AuthoritativeContext> {
    exactInput(request, ["scope", "entityId", "offset", "limit"]);
    if (!["project", "workflow", "work-item", "work-intake"].includes(request.scope)) fail("Unsupported authoritative context scope.");
    const limit = request.limit ?? 50;
    const offset = request.offset ?? 0;
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) fail("Context limit must be between 1 and 100.");
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 10_000) fail("Context offset must be between 0 and 10000.");
    const rootId = request.scope === "project" ? projectId : request.entityId;
    if (!rootId || request.scope === "project" && request.entityId && request.entityId !== projectId) fail("Context root does not match its scope.");
    const root = await requiredRecord(store, projectId, rootId);
    const expected: Record<AuthoritativeContextScope, EntityType> = { project: "Project", workflow: "Workflow", "work-item": "WorkItem", "work-intake": "WorkIntake" };
    if (root.entityType !== expected[request.scope]) fail("Context root has the wrong entity type.");
    const all = (await store.listEntities(projectId)).filter(record => record.lifecycleState !== "superseded" && record.lifecycleState !== "voided");
    const byId = new Map(all.map(record => [record.id, record]));
    const edges = (await store.listRelationships(projectId)).filter(edge => !edge.endedAt);
    const distance = new Map<EntityId, number>([[rootId, 0]]);
    if (request.scope === "project") {
      for (const record of all) distance.set(record.id, 0);
    } else {
      for (let depth = 0; depth < 3; depth++) {
        for (const edge of edges) {
          if (edge.relationshipType === "routes_to") continue;
          if (distance.get(edge.fromEntityId) === depth && byId.has(edge.toEntityId) && !distance.has(edge.toEntityId)) distance.set(edge.toEntityId, depth + 1);
          if (distance.get(edge.toEntityId) === depth && byId.has(edge.fromEntityId) && !distance.has(edge.fromEntityId)) distance.set(edge.fromEntityId, depth + 1);
        }
      }
    }
    const matching = [...distance.keys()].map(id => byId.get(id)).filter((record): record is ProjectStateEntity => !!record)
      .sort((a, b) => (distance.get(a.id) ?? 0) - (distance.get(b.id) ?? 0) || a.id.localeCompare(b.id));
    const records = matching.slice(offset, offset + limit);
    const ids = new Set(records.map(record => record.id));
    const relationships = edges.filter(edge => ids.has(edge.fromEntityId) || ids.has(edge.toEntityId))
      .sort((a, b) => a.id.localeCompare(b.id));
    if (relationships.length > 1000) fail("Context relationships exceed their bound.");
    const sourceReferences: AuthoritativeContext["sourceReferences"] = [];
    for (const record of records) {
      if (!["SourceBaseline", "SourceBinding", "SourceCheckpoint", "IntegrationRecord", "Validation", "Evidence", "ProjectResource"].includes(record.entityType)) continue;
      for (const [field, reference] of Object.entries(record.body)) {
        if (typeof reference === "string" && /(?:repositoryId|SourceLineId|RevisionId|CheckoutId|sourceBaselineRef)$/.test(field)) sourceReferences.push({ entityId: record.id, field, reference });
      }
    }
    sourceReferences.sort((a, b) => a.entityId.localeCompare(b.entityId) || a.field.localeCompare(b.field));
    const nextOffset = offset + records.length < matching.length ? offset + records.length : null;
    return { projectId, scope: request.scope, rootEntityId: rootId, authoritative: true, records, relationships,
      decisions: records.filter(record => record.entityType === "Decision").map(record => record.id),
      validations: records.filter(record => record.entityType === "Validation").map(record => record.id),
      sourceReferences, offset, limit, totalMatches: matching.length, truncated: nextOffset !== null, nextOffset };
  }

  async function getCommittedEventFeed(projectId: ProjectId,
    request: { cursor?: DerivedEventCursor; limit?: number } = {}): Promise<CommittedEventFeed> {
    exactInput(request, ["cursor", "limit"]);
    if (!await store.getProject(projectId)) fail("Event feed Project does not exist.");
    const limit = request.limit ?? 100;
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) fail("Event feed limit must be between 1 and 100.");
    const cursor = request.cursor ?? { projectId, sequence: 0, eventId: null };
    if (cursor.projectId !== projectId || !Number.isSafeInteger(cursor.sequence) || cursor.sequence < 0 || (cursor.sequence === 0 ? cursor.eventId !== null : typeof cursor.eventId !== "string" || !cursor.eventId)) fail("Invalid event feed cursor.");
    const fromCheckpoint = await store.listOutbox(projectId, Math.max(0, cursor.sequence - 1));
    if (cursor.sequence > 0 && (fromCheckpoint[0]?.sequence !== cursor.sequence || fromCheckpoint[0].id !== cursor.eventId)) fail("Event feed cursor does not identify a committed event.");
    const pending = cursor.sequence > 0 ? fromCheckpoint.slice(1) : fromCheckpoint;
    const events = pending.slice(0, limit);
    let nextCursor = cursor;
    for (const event of events) nextCursor = advanceDerivedEventCursor(nextCursor, event);
    return { projectId, events, nextCursor, hasMore: pending.length > limit };
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

  /** Transitional Project-wide query retained for legacy completion callers; Current Project planning uses getWorkflowExecutionPlan. */
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

  async function acceptWorkflowPlanningGraph(projectId: ProjectId, graph: WorkflowPlanningGraph, context?: MutationContext): Promise<WorkflowExecutionPlanView> {
    exactInput(graph, ["workflowId", "topology", "solutionAddresses", "solution", "solutionCriteria", "phases", "workItems"]);
    await store.transaction(projectId, async unit => {
      if (trustedPrincipal.principalType !== "human" || trustedPrincipal.role !== "Operator") fail("Workflow planning acceptance requires the Operator principal.");
      if (!await unit.getProject(projectId)) fail("Owning Project does not exist.");
      const workflow = await requiredRecord(unit, projectId, graph.workflowId);
      if (workflow.entityType !== "Workflow" || workflow.lifecycleState !== "active" || workflow.body.workflowState !== "active" ||
          ["work-intake-routing", "project-creation"].includes(workflow.body.workflowType)) fail("Planning requires a current active implementation Workflow.");
      if (graph.solutionAddresses !== undefined) {
        if (!Array.isArray(graph.solutionAddresses) || graph.solutionAddresses.length > 128 || new Set(graph.solutionAddresses).size !== graph.solutionAddresses.length) fail("Solution address references are invalid or exceed their bounds.");
        for (const id of graph.solutionAddresses) { const target = await requiredRecord(unit, projectId, id); const memberships = await unit.listRelationships(projectId, "workflow_member");
          if (!(target.entityType === "Finding" || target.entityType === "RootCause") || target.lifecycleState !== "active" || !memberships.some(edge => edge.fromEntityId === id && edge.toEntityId === workflow.id && !edge.endedAt)) fail("Solution address references must be current Finding or RootCause records owned by this exact Workflow."); }
      }
      const memberships = (await unit.listRelationships(projectId, "workflow_member")).filter(edge => edge.toEntityId === workflow.id && !edge.endedAt);
      const solutionIds = new Set(memberships.map(edge => edge.fromEntityId));
      const decisions = (await unit.listEntities(projectId, "Decision")).filter((record): record is ProjectStateRecord<"Decision"> => record.entityType === "Decision" && record.lifecycleState === "active" && record.body.decisionType === "planning-acceptance" && record.body.outcome === "accepted");
      const governance = (await unit.listRelationships(projectId, "governs")).filter(edge => !edge.endedAt);
      const memberRecords = await Promise.all([...solutionIds].map(id => unit.getEntity(projectId, id)));
      const hasCanonicalGraph = memberRecords.some(record => record?.entityType === "BoundedSolution" && record.lifecycleState === "active" &&
          decisions.some(decision => governance.some(link => link.fromEntityId === decision.id && link.toEntityId === workflow.id) && governance.some(link => link.fromEntityId === decision.id && link.toEntityId === record.id)));
      if (hasCanonicalGraph) fail("A canonical planning graph has already been accepted for this Workflow.");
      if (!Array.isArray(graph.solutionCriteria) || graph.solutionCriteria.length > 64 || !Array.isArray(graph.workItems) || graph.workItems.length < 1 || graph.workItems.length > 128) fail("Planning graph exceeds its bounds.");
      const phases = graph.phases ?? [];
      if (!Array.isArray(phases) || phases.length > 32) fail("Planning phases exceed their bounds.");
      if (graph.topology === "direct" && phases.length) fail("Direct topology cannot contain Phases.");
      if (graph.topology === "phased" && phases.length < 1) fail("Phased topology requires Phases.");
      if (!["direct", "phased"].includes(graph.topology)) fail("Unsupported planning topology.");
      const validKey = (key: unknown) => typeof key === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(key);
      const phaseKeys = new Set<string>();
      const sequences = new Set<number>();
      for (const phase of phases) { exactInput(phase, ["key", "title", "objective", "sequence", "criteria"]); if (!validKey(phase.key) || phaseKeys.has(phase.key) || !Number.isSafeInteger(phase.sequence) || phase.sequence < 1 || phase.sequence > 32 || sequences.has(phase.sequence)) fail("Invalid or duplicate Phase candidate/sequence."); phaseKeys.add(phase.key); sequences.add(phase.sequence); if (!Array.isArray(phase.criteria ?? []) || (phase.criteria?.length ?? 0) > 64) fail("Phase criteria exceed their bounds."); }
      const workKeys = new Set<string>();
      const byKey = new Map<string, typeof graph.workItems[number]>();
      for (const work of graph.workItems) { exactInput(work, ["key", "kind", "title", "objective", "phaseKey", "dependencyKeys", "criteria"]); if (!validKey(work.key) || workKeys.has(work.key) || !Array.isArray(work.dependencyKeys) || work.dependencyKeys.length > 128 || !Array.isArray(work.criteria) || work.criteria.length > 64 || (work.phaseKey !== undefined && !phaseKeys.has(work.phaseKey))) fail("Invalid Work Item candidate."); workKeys.add(work.key); byKey.set(work.key, work); if (graph.topology === "phased" && !work.phaseKey) fail("Every phased Work Item must belong to one declared Phase."); if (graph.topology === "direct" && work.phaseKey) fail("Direct Work Items cannot have Phase membership."); }
      for (const work of graph.workItems) for (const key of work.dependencyKeys) if (!byKey.has(key) || key === work.key) fail("Work Item dependency key is invalid.");
      const marks = new Map<string, number>(); const visit = (key: string) => { if (marks.get(key) === 1) fail("Dependency graph contains a cycle."); if (marks.get(key) === 2) return; marks.set(key, 1); for (const dependency of byKey.get(key)!.dependencyKeys) visit(dependency); marks.set(key, 2); }; for (const key of workKeys) visit(key);
      const criteria = [...graph.solutionCriteria, ...phases.flatMap(phase => phase.criteria ?? []), ...graph.workItems.flatMap(work => work.criteria)];
      if (criteria.length > 512) fail("Planning graph exceeds its total Criterion bound.");
      const policies = new Set(["deterministic", "semantic_ai", "visual_human", "deferred_visual_phase", "operator_decision"]);
      for (const criterion of criteria) { exactInput(criterion, ["statement", "criticality", "verificationIntent", "validationPolicy"]); if (!policies.has(criterion.validationPolicy)) fail("Criterion validation policy is required and must be supported."); }
      const kindsByWorkflow: Record<WorkflowType, readonly string[]> = { "feature-capability": ["feature", "fix", "maintenance"], "issue-resolution": ["fix", "repair"], "refactor-migration": ["migration", "maintenance"], "integration-composition": ["feature", "fix", "maintenance"], "infrastructure-platform": ["feature", "fix", "maintenance"], "research-prototype": ["feature", "maintenance"], "project-creation": [], "work-intake-routing": [] };
      if (graph.workItems.some(item => !kindsByWorkflow[workflow.body.workflowType].includes(item.kind))) fail("Unsupported Work Item kind for this Workflow family.");
      const now = new Date().toISOString();
      const create = async <T extends EntityType>(entityType: T, body: EntityBodyMap[T]) => { const record = createProjectStateEntity({ entityType, projectId, body, principal: trustedPrincipal }); await unit.saveEntity(record as ProjectStateEntity, null); await recordMutation(unit, { projectId, entityId: record.id, fromVersion: null, toVersion: 1, operation: "create", eventType: PROJECT_STATE_EVENT_TYPES.create, occurredAt: record.createdAt, changedFields: Object.keys(record.body), defaultReason: `Accept Workflow planning ${entityType}`, context }); return record as ProjectStateRecord<T>; };
      const link = async (from: ProjectStateEntity, type: RelationshipType, to: ProjectStateEntity) => linkSemantic(unit, projectId, from, to, type, context);
      const solution = await create("BoundedSolution", { ...graph.solution, solutionState: "active" });
      await link(solution, "workflow_member", workflow);
      for (const id of graph.solutionAddresses ?? []) await link(solution, "addresses", await requiredRecord(unit, projectId, id));
      const addCriteria = async (owner: ProjectStateEntity, list: WorkflowPlanningGraph["solutionCriteria"]) => { for (const item of list) { const record = await create("Criterion", { ...item, criterionState: "active" }); await link(owner, "defines_criterion", record); } };
      await addCriteria(solution, graph.solutionCriteria);
      const phaseRecords = new Map<string, ProjectStateRecord<"Phase">>();
      for (const phase of [...phases].sort((a, b) => a.sequence - b.sequence)) { const record = await create("Phase", { title: phase.title, objective: phase.objective, phaseState: "planned", sequence: phase.sequence }); phaseRecords.set(phase.key, record); await link(record, "part_of", workflow); await addCriteria(record, phase.criteria ?? []); }
      const workRecords = new Map<string, ProjectStateRecord<"WorkItem">>();
      for (const work of graph.workItems) { const record = await create("WorkItem", { workItemKind: work.kind, title: work.title, objective: work.objective, workState: "planned" }); workRecords.set(work.key, record); await link(record, "part_of", work.phaseKey ? phaseRecords.get(work.phaseKey)! : workflow); await link(record, "implements", solution); await addCriteria(record, work.criteria); }
      for (const work of graph.workItems) for (const dependency of work.dependencyKeys) await link(workRecords.get(work.key)!, "depends_on", workRecords.get(dependency)!);
      const decision = await create("Decision", decisionBody({ decisionType: "planning-acceptance", outcome: "accepted", decisionScope: `Workflow:${workflow.id}`, rationale: "Operator accepted the reviewed canonical planning graph." }, trustedPrincipal, now));
      await link(decision, "governs", workflow); await link(decision, "governs", solution);
      const nextWorkflow = validateProjectStateEntity({ ...workflow, recordVersion: workflow.recordVersion + 1, updatedAt: now, updatedBy: trustedPrincipal, body: { ...workflow.body, currentWorkspace: "work-item-map" } }) as ProjectStateRecord<"Workflow">;
      await unit.saveEntity(nextWorkflow, workflow.recordVersion); await recordMutation(unit, { projectId, entityId: workflow.id, fromVersion: workflow.recordVersion, toVersion: nextWorkflow.recordVersion, operation: "revise", eventType: PROJECT_STATE_EVENT_TYPES.revise, occurredAt: now, changedFields: ["currentWorkspace"], defaultReason: "Advance accepted Workflow plan", context });
      return workflow.id;
    });
    return getWorkflowExecutionPlan(projectId, graph.workflowId);
  }

  async function getWorkflowExecutionPlan(projectId: ProjectId, workflowId: EntityId): Promise<WorkflowExecutionPlanView> {
    const workflow = await requiredRecord(store, projectId, workflowId);
    if (workflow.entityType !== "Workflow" || workflow.body.workflowType === "work-intake-routing" || workflow.lifecycleState !== "active" || ["closed", "cancelled"].includes(workflow.body.workflowState)) fail("Workflow planning query requires a current nonterminal substantive Workflow.");
    const lineageWorkflows = (await store.listEntities(projectId, "Workflow"))
      .filter((record): record is ProjectStateRecord<"Workflow"> => record.entityType === "Workflow" && record.lineageId === workflow.lineageId);
    const currentLineage = lineageWorkflows.filter(record => record.lifecycleState === "active" && !["closed", "cancelled"].includes(record.body.workflowState));
    if (currentLineage.length !== 1 || currentLineage[0].id !== workflowId) fail("Workflow planning query requires the unique current Workflow identity.");
    const edges = (await store.listRelationships(projectId)).filter(edge => !edge.endedAt);
    const workflowIds = new Set(lineageWorkflows.map(record => record.id));
    const members = new Set(edges.filter(edge => edge.relationshipType === "part_of" && workflowIds.has(edge.toEntityId)).map(edge => edge.fromEntityId));
    const solutionIds = new Set(edges.filter(edge => edge.relationshipType === "workflow_member" && workflowIds.has(edge.toEntityId)).map(edge => edge.fromEntityId));
    const parent = new Map(edges.filter(edge => edge.relationshipType === "part_of").map(edge => [edge.fromEntityId, edge.toEntityId]));
    const phases = (await store.listEntities(projectId, "Phase")).filter((r): r is ProjectStateRecord<"Phase"> => r.entityType === "Phase" && members.has(r.id) && !["superseded", "voided"].includes(r.lifecycleState));
    const phaseIds = new Set(phases.map(phase => phase.id));
    const workItems = (await store.listEntities(projectId, "WorkItem")).filter((r): r is ProjectStateRecord<"WorkItem"> => r.entityType === "WorkItem" && (members.has(r.id) || phaseIds.has(parent.get(r.id) ?? "")) && !["superseded", "voided"].includes(r.lifecycleState));
    const solutions = (await store.listEntities(projectId, "BoundedSolution")).filter((r): r is ProjectStateRecord<"BoundedSolution"> => r.entityType === "BoundedSolution" && solutionIds.has(r.id) && !["superseded", "voided"].includes(r.lifecycleState));
    const ownedWork = new Set(workItems.map(r => r.id)); const ownedPhases = new Set(phases.map(r => r.id));
    for (const work of workItems) { const p = parent.get(work.id); const owner = p && ownedPhases.has(p) ? parent.get(p) : p; if (!owner || !workflowIds.has(owner)) fail("Invalid cross-Workflow planning membership."); }
    const dependencies = edges.filter(edge => edge.relationshipType === "depends_on" && (ownedWork.has(edge.fromEntityId) || ownedWork.has(edge.toEntityId)));
    if (dependencies.some(edge => !ownedWork.has(edge.fromEntityId) || !ownedWork.has(edge.toEntityId))) fail("Invalid cross-Workflow dependency in Project State.");
    const criterionOwners = new Set<EntityId>([...ownedWork, ...ownedPhases, ...solutionIds]);
    const criteria = (await store.listRelationships(projectId, "defines_criterion")).filter(edge => !edge.endedAt && criterionOwners.has(edge.fromEntityId)).map(edge => ({ ownerId: edge.fromEntityId, criterionId: edge.toEntityId }));
    const criterionRecords = await store.listEntities(projectId, "Criterion"); const criterionById = new Map(criterionRecords.filter((r): r is ProjectStateRecord<"Criterion"> => r.entityType === "Criterion").map(r => [r.id, r]));
    const projectedCriteria = criteria.map(item => ({ ownerId: item.ownerId, record: criterionById.get(item.criterionId)! })).filter(item => item.record);
    const phaseViews = phases.sort((a, b) => a.body.sequence - b.body.sequence || a.id.localeCompare(b.id)).map(record => ({ record, phaseId: record.id, sequence: record.body.sequence, workItemIds: workItems.filter(w => parent.get(w.id) === record.id).map(w => w.id).sort(), criterionIds: edges.filter(e => e.relationshipType === "defines_criterion" && e.fromEntityId === record.id).map(e => e.toEntityId).sort() }));
    const decisionIds = new Set(edges.filter(e => e.relationshipType === "governs" && [workflowId, ...solutionIds].includes(e.toEntityId)).map(e => e.fromEntityId));
    const decisions = (await store.listEntities(projectId, "Decision")).filter((r): r is ProjectStateRecord<"Decision"> => r.entityType === "Decision" && decisionIds.has(r.id) && r.body.decisionType === "planning-acceptance" && r.body.outcome === "accepted");
    const direct = workItems.filter(w => workflowIds.has(parent.get(w.id) ?? ""));
    const repairEdges = edges.filter(e => e.relationshipType === "repairs" && (ownedWork.has(e.fromEntityId) || ownedWork.has(e.toEntityId)));
    if (repairEdges.some(edge => !ownedWork.has(edge.fromEntityId) || !ownedWork.has(edge.toEntityId))) fail("Invalid cross-Workflow Repair membership in Project State.");
    return { workflow, solutions, phases: phaseViews, directWorkItems: direct, workItemsByPhase: Object.fromEntries(phaseViews.map(p => [p.phaseId, workItems.filter(w => parent.get(w.id) === p.phaseId)])), criteria: projectedCriteria, decisions,
      directWorkItemIds: direct.map(w => w.id).sort(), dependencyIds: dependencies.map(e => ({ from: e.fromEntityId, to: e.toEntityId })), repairIds: repairEdges.map(e => ({ from: e.fromEntityId, to: e.toEntityId })) };
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
    const routes = (await store.listRelationships(projectId, "routes_to")).filter(edge => edge.fromEntityId === workflows[0].toEntityId && !edge.endedAt);
    if (routes.length > 1) fail("Work Intake routing Workflow has ambiguous routed Workflow provenance.");
    return { intakeId, request: intake.body.request, desiredOutcome: intake.body.desiredOutcome,
      constraints: [...intake.body.constraints], evidenceContext: [...intake.body.evidenceContext],
      intakeState: intake.body.intakeState, requestedIntegrationTarget: intake.body.requestedIntegrationTarget,
      routingWorkflowId: workflows[0].toEntityId, targetWorkflowId: routes[0]?.toEntityId ?? null, currentRoute: await getCurrentWorkRoute(projectId, intakeId),
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

  return { createRecord, createWorkflow, createSubstantiveWorkflow, createSubstantiveWorkflowInUnitOfWork, createProjectCreationWorkflow, createWorkIntake, reviseWorkIntake, advanceWorkIntake, recordRouteAssessment, recordRouteDecision, recordWorkIntakeRouteRevisionRequest, completeWorkIntakeRouteHandoff,
    createWorkflowSourceBaseline, createWorkflowSourceBinding, updateSourceBinding, createSourceCheckpoint, advanceSourceCheckpoint, completeTesterResultCheckpoint, createIntegrationRecord, advanceIntegrationRecord,
    createRegressionObligation, setRegressionObligationState, recordTestLifecycleAssessment, createTesterResult, recordImplementationProof, recordPermanentTestReference, linkPermanentTestReference,
    reviseRecord, supersedeRecord, createRelationship, linkWorkflowRouteTarget, endRelationship, recordDecision, supersedeDecision, recordValidation, recordEvidence, recordImplementation, beginWorkItemAttempt, finishWorkItemAttempt, decomposeWorkItem, completeWorkItem, completePhase,
    getRecord, queryRecords, queryRecordsPage, getCurrentProjectStateView, renderView, exportStructuredProjectState, getAuthoritativeContext, getCommittedEventFeed, getCurrentRecord, getRecordHistory, getRelationships, getLineage, getProjectStateSummary, getEvidence,
    getEffectiveDisposition, getRequiredOperatorDecisions, getValidationFreshness, getCriterionValidationStatus,
    getImplementationAttempts, getExecutionPlan, getWorkflowExecutionPlan, acceptWorkflowPlanningGraph, acceptFeatureAssessment, acceptIssueRca, getWorkItemCompletionEligibility, getPhaseCompletionEligibility,
    getWorkRouteHistory, getCurrentWorkRoute, getWorkIntakeSummary, getSourceSemanticView, getRegressionObligationView };
}
