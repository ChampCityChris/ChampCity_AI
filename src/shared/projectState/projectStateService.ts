import { resolvePlanTopology, type PlanCandidate, type PlanReviewLayout } from "./planReviewContracts";
import { ARCHITECT_WORKSPACE_BY_WORKFLOW, ARCHITECT_STAGE_BY_WORKFLOW, architectSemanticDigest, architectMemberOwnershipIsValid, renderArchitectReviewProjection, type ArchitectReviewSaveInput, type ArchitectReviewDecisionInput } from "./architectReviewContracts";
import { GREENFIELD_ARCHITECT_SECTIONS, FEATURE_ARCHITECT_SECTIONS, ASSESSMENT_SECTIONS, ASSESSMENT_DESIGNS, type AssessmentWorkflowType, validateArchitectCandidateOutput, type ArchitectCandidateSaveInput, type GreenfieldArchitectOutput } from "../architectWorkspaceContracts";
import { workflowIntakeDisposition, exactVersionReviewDisposition } from "./workflowIntakeDisposition";
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
export interface WorkflowIntakeSaveInput { workflowId: EntityId; workflowType: WorkflowType; values: EntityBodyMap["WorkflowIntake"]["values"]; expectedIntakeRecordVersion?: number; legacySourceRef?: string }
export interface WorkflowIntakeDecisionInput { expectedIntakeRecordVersion: number; outcome: "approved" | "revision_requested" | "rejected"; rationale?: string; notes?: string; legacyReviewedAt?: string }
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
export type ValidationStaleReason = "target-version-changed" | "target-superseded" | "source-baseline-changed" | "phase-evidence-changed";
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
export interface WorkflowRepairInput {
  workflowId: EntityId;
  workItemId: EntityId;
  failureEvidenceId: EntityId;
}
export interface CriterionOperatorDecisionEvidenceContext { workflowId: EntityId; workItemId?: EntityId; phaseId?: EntityId }
export interface CriterionOperatorDecisionInput { expectedCriterionVersion: number; outcome: "approved" | "rejected"; rationale: string; correctsDecisionId?: EntityId }
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
    if ((entityType === "WorkflowIntake" || entityType === "ArchitectReviewCycle" || entityType === "PlanReviewCycle")) fail("WorkflowIntake requires the typed save command.");
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
      if (["WorkflowIntake", "ArchitectReviewCycle", "PlanReviewCycle"].includes(current.entityType)) fail("WorkflowIntake requires the typed save command.");
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
      await advanceArchitectCyclesForMember(unit, projectId, entityId, context);
      return next;
    });
  }

  async function supersedeRecord(projectId: ProjectId, entityId: EntityId, replacement: Record<string, unknown>, expectedRevision: number, context?: MutationContext) {
    const content = exactInput(replacement, Object.keys(replacement));
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) fail("An exact expected revision is required.");
    return store.transaction(projectId, async unit => {
      const previous = await requiredRecord(unit, projectId, entityId);
      if (["WorkflowIntake", "ArchitectReviewCycle", "PlanReviewCycle"].includes(previous.entityType)) fail("WorkflowIntake retains its identity through the typed save command.");
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
      await advanceArchitectCyclesForMember(unit, projectId, previous.id, context);
      return { predecessor: terminal, successor, relationship: edge };
    });
  }

  async function createRelationship(projectId: ProjectId, fromEntityId: EntityId, relationshipType: RelationshipType, toEntityId: EntityId, context?: MutationContext) {
    if (["intake_for", "architect_review_for", "review_member"].includes(relationshipType)) fail("Intake ownership requires the typed save command.");
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
        for (const reviewEdge of (await unit.listRelationships(projectId, "review_member")).filter(edge => edge.fromEntityId === fromEntityId)) {
          const cycle = await requiredRecord(unit, projectId, reviewEdge.toEntityId);
          if (cycle.entityType !== "ArchitectReviewCycle" || cycle.body.workflowId !== toEntityId) fail("Architect semantic membership cannot cross Workflows.");
        }

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
      if (["architect_review_for", "review_member"].includes(edge.relationshipType)) fail("Architect membership requires the typed cycle command.");
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

  async function requireCurrentWorkflowIntake(unit: ProjectStateUnitOfWork, projectId: ProjectId, intakeId: EntityId) {
    const intake = await requiredRecord(unit, projectId, intakeId);
    if (intake.entityType !== "WorkflowIntake" || intake.lifecycleState !== "active") fail("Current active WorkflowIntake is required.");
    const current = (await unit.listEntities(projectId, "WorkflowIntake")).filter(record => record.lineageId === intake.lineageId && record.lifecycleState === "active");
    if (current.length !== 1 || current[0].id !== intake.id) fail("WorkflowIntake lineage has no unique current owner.");
    const workflow = await requiredRecord(unit, projectId, intake.body.workflowId);
    await requireCurrentSourceWorkflow(unit, projectId, workflow);
    if (workflow.entityType !== "Workflow" || workflow.body.workflowState !== "active" || workflow.body.workflowType !== intake.body.workflowType) fail("WorkflowIntake owner is unavailable or mismatched.");
    const edges = (await unit.listRelationships(projectId, "intake_for")).filter(edge => edge.fromEntityId === intake.id && !edge.endedAt);
    if (edges.length !== 1 || edges[0].toEntityId !== workflow.id) fail("WorkflowIntake must have exactly one exact Workflow owner.");
    return intake;
  }

  async function advanceArchitectCyclesForMember(unit: ProjectStateUnitOfWork, projectId: ProjectId, memberId: EntityId, context?: MutationContext) {
    const edges = (await unit.listRelationships(projectId, "review_member")).filter(edge => !edge.endedAt);
    for (const cycleId of new Set(edges.filter(edge => edge.fromEntityId === memberId).map(edge => edge.toEntityId))) {
      const cycle = await requiredRecord(unit, projectId, cycleId);
      if (cycle.entityType !== "ArchitectReviewCycle" || cycle.lifecycleState !== "active") continue;
      const members = await Promise.all(edges.filter(edge => edge.toEntityId === cycleId).map(edge => requiredRecord(unit, projectId, edge.fromEntityId)));
      const semanticDigest = await architectSemanticDigest(members);
      if (semanticDigest === cycle.body.semanticDigest) continue;
      const next = validateProjectStateEntity({...cycle, recordVersion: cycle.recordVersion + 1, body: {...cycle.body, semanticDigest}, updatedAt: new Date().toISOString(), updatedBy: trustedPrincipal}) as ProjectStateRecord<"ArchitectReviewCycle">;
      await unit.saveEntity(next, cycle.recordVersion);
      await recordMutation(unit, {projectId, entityId: cycle.id, fromVersion: cycle.recordVersion, toVersion: next.recordVersion, operation: "revise", eventType: PROJECT_STATE_EVENT_TYPES.revise, occurredAt: next.updatedAt, changedFields: ["semanticDigest"], defaultReason: "Invalidate changed Architect semantic review", context});
    }
  }

  async function architectMembers(unit: ProjectStateUnitOfWork, projectId: ProjectId, workflowId: EntityId, ids: EntityId[]) {
    if (!Array.isArray(ids) || !ids.length || ids.length > 256 || new Set(ids).size !== ids.length) fail("Architect members require an exact bounded nonempty set.");
    const edges = await unit.listRelationships(projectId);
    const members = [] as ProjectStateEntity[];
    for (const id of ids) {
      const member = await requiredRecord(unit, projectId, id);
      if (member.lifecycleState !== "active" || !["Finding", "RootCause", "BoundedSolution", "Criterion", "Evidence"].includes(member.entityType)) fail("Architect member must be an active semantic record.");
      members.push(member);
    }
    if (!architectMemberOwnershipIsValid(workflowId, members, await unit.listEntities(projectId), edges)) fail("Architect member belongs to a different Workflow or unavailable semantic owner.");
    return members;
  }

  async function currentArchitectCycle(unit: ProjectStateUnitOfWork, projectId: ProjectId, workflowId: EntityId, stageKind: import("./domainContracts").ArchitectStageKind) {
    const workflow = await requiredRecord(unit, projectId, workflowId);
    if (workflow.entityType !== "Workflow" || workflow.lifecycleState !== "active" || workflow.body.workflowState !== "active" || ARCHITECT_STAGE_BY_WORKFLOW[workflow.body.workflowType] !== stageKind) fail("Architect review requires the exact substantive Workflow and stage.");
    const cycles = (await unit.listEntities(projectId, "ArchitectReviewCycle")).filter((record): record is ProjectStateRecord<"ArchitectReviewCycle"> => record.entityType === "ArchitectReviewCycle" && record.lifecycleState === "active" && record.body.workflowId === workflowId && record.body.stageKind === stageKind);
    if (cycles.length > 1) fail("Ambiguous active Architect review cycles.");
    const cycle = cycles[0];
    if (cycle) {
      const owners = (await unit.listRelationships(projectId, "architect_review_for")).filter(edge => edge.fromEntityId === cycle.id && !edge.endedAt);
      if (owners.length !== 1 || owners[0].toEntityId !== workflowId || cycle.body.workflowType !== workflow.body.workflowType) fail("Architect review ownership mismatch.");
    }
    return {workflow, cycle: cycle ?? null};
  }

  async function saveArchitectReviewCycle(projectId: ProjectId, input: ArchitectReviewSaveInput, context?: MutationContext) {
    exactInput(input, ["workflowId", "stageKind", "memberIds", "expectedRecordVersion"]);
    return store.transaction(projectId, unit => saveArchitectReviewCycleInUnit(unit, projectId, input, context));
  }

  async function saveArchitectReviewCycleInUnit(unit: ProjectStateUnitOfWork, projectId: ProjectId, input: ArchitectReviewSaveInput, context?: MutationContext) {
      const {workflow, cycle} = await currentArchitectCycle(unit, projectId, input.workflowId, input.stageKind);
      if (input.expectedRecordVersion !== undefined && cycle?.recordVersion !== input.expectedRecordVersion) fail("Expected Architect cycle revision is stale.");
      const members = await architectMembers(unit, projectId, workflow.id, input.memberIds);
      const semanticDigest = await architectSemanticDigest(members);
      if (cycle?.body.semanticDigest === semanticDigest) return cycle;
      const body: EntityBodyMap["ArchitectReviewCycle"] = {workflowId: workflow.id, workflowType: workflow.body.workflowType, stageKind: input.stageKind, semanticDigest};
      const next = cycle ? validateProjectStateEntity({...cycle, body, recordVersion: cycle.recordVersion + 1, updatedAt: new Date().toISOString(), updatedBy: trustedPrincipal}) as ProjectStateRecord<"ArchitectReviewCycle">
        : createProjectStateEntity({entityType: "ArchitectReviewCycle", projectId, body, principal: trustedPrincipal});
      await unit.saveEntity(next, cycle?.recordVersion ?? null);
      await recordMutation(unit, {projectId, entityId: next.id, fromVersion: cycle?.recordVersion ?? null, toVersion: next.recordVersion, operation: cycle ? "revise" : "create",
        eventType: cycle ? PROJECT_STATE_EVENT_TYPES.revise : PROJECT_STATE_EVENT_TYPES.create, occurredAt: next.updatedAt, changedFields: ["semanticDigest"], defaultReason: "Bind exact Architect semantic review", context});
      if (!cycle) await linkSemantic(unit, projectId, next, workflow, "architect_review_for", context);
      const oldEdges = (await unit.listRelationships(projectId, "review_member")).filter(edge => edge.toEntityId === next.id && !edge.endedAt);
      for (const edge of oldEdges) if (!input.memberIds.includes(edge.fromEntityId)) {
        await unit.endRelationship(edge.id, next.updatedAt);
        await recordMutation(unit, {projectId, entityId: edge.fromEntityId, fromVersion: null, toVersion: (await requiredRecord(unit, projectId, edge.fromEntityId)).recordVersion, operation: "relationship-end", eventType: PROJECT_STATE_EVENT_TYPES.relationshipEnd, occurredAt: next.updatedAt, changedFields: ["relationship:review_member"], defaultReason: "Revise Architect membership", context, relationshipId: edge.id});
      }
      for (const member of members) if (!oldEdges.some(edge => edge.fromEntityId === member.id)) await linkSemantic(unit, projectId, member, next, "review_member", context);
      return next;
  }

  async function getCurrentArchitectReviewCycle(projectId: ProjectId, workflowId: EntityId, stageKind: import("./domainContracts").ArchitectStageKind) {
    return store.transaction(projectId, async unit => (await currentArchitectCycle(unit, projectId, workflowId, stageKind)).cycle);
  }

  async function prepareArchitectWorkspace(projectId: ProjectId, input: {workflowId: EntityId; intakeId: EntityId; intakeVersion: number}) {
    exactInput(input, ["workflowId", "intakeId", "intakeVersion"]);
    return store.transaction(projectId, async unit => {
      const workflow = await requiredRecord(unit, projectId, input.workflowId);
      if (workflow.entityType !== "Workflow" || workflow.lifecycleState !== "active" || workflow.body.workflowState !== "active" || workflow.body.currentWorkspace === "work-item-map") fail("Exact active front-half Workflow is required.");
      const workspace = ARCHITECT_WORKSPACE_BY_WORKFLOW[workflow.body.workflowType];
      if (!workspace) fail("Architect workspace is unavailable.");
      const intake = await requireCurrentWorkflowIntake(unit, projectId, input.intakeId);
      if (intake.body.workflowId !== workflow.id || intake.recordVersion !== input.intakeVersion || workflowIntakeDisposition(intake, await unit.listEntities(projectId), await unit.listRelationships(projectId), await unit.listOutbox(projectId)).state !== "approved") fail("Exact approved current Intake is required before transition.");
      if (workflow.body.currentWorkspace === workspace) return workflow;
      const next = validateProjectStateEntity({...workflow, recordVersion: workflow.recordVersion + 1, updatedAt: new Date().toISOString(), updatedBy: trustedPrincipal, body: {...workflow.body, currentWorkspace: workspace}}) as ProjectStateRecord<"Workflow">;
      await unit.saveEntity(next, workflow.recordVersion);
      await recordMutation(unit, {projectId, entityId: workflow.id, fromVersion: workflow.recordVersion, toVersion: next.recordVersion, operation: "revise", eventType: PROJECT_STATE_EVENT_TYPES.revise, occurredAt: next.updatedAt, changedFields: ["currentWorkspace"], defaultReason: "Prepare Architect from exact approved SQL Intake"});
      return next;
    });
  }

  /** Candidate records, source provenance and cycle membership commit atomically. */
  async function saveArchitectCandidate(projectId: ProjectId, input: ArchitectCandidateSaveInput & {workflowId: EntityId; workflowType: WorkflowType}) {
    exactInput(input, ["workflowId", "workflowType", "intakeId", "intakeVersion", "expectedCycleVersion", "output"]);
    validateArchitectCandidateOutput(input.workflowType, input.output);
    return store.transaction(projectId, async unit => {
      const stageKind = ARCHITECT_STAGE_BY_WORKFLOW[input.workflowType];
      if (!stageKind) fail("Unsupported Architect stage.");
      const {workflow, cycle} = await currentArchitectCycle(unit, projectId, input.workflowId, stageKind);
      if (workflow.body.workflowType !== input.workflowType) fail("Exact Architect Workflow type required.");
      if (cycle?.recordVersion !== input.expectedCycleVersion) fail("Expected Architect cycle revision is stale.");
      if (!cycle && ["feature-capability", "issue-resolution"].includes(workflow.body.workflowType)) {
        const legacyCategory = workflow.body.workflowType === "feature-capability" ? "Finding" : "RootCause";
        const owned = (await unit.listRelationships(projectId, "workflow_member")).filter(edge => !edge.endedAt && edge.toEntityId === workflow.id);
        if ((await unit.listEntities(projectId, legacyCategory)).some(record => record.lifecycleState === "active" && owned.some(edge => edge.fromEntityId === record.id) && (record.entityType !== "Finding" || record.body.category === "feature-assessment"))) fail("Reopen for legacy Architect SQL adoption or conflict reconciliation before saving a fresh candidate.");
      }
      const intake = await requiredRecord(unit, projectId, input.intakeId);
      if (intake.entityType !== "WorkflowIntake" || intake.lifecycleState !== "active" || intake.body.workflowId !== workflow.id ||
        intake.recordVersion !== input.intakeVersion || workflowIntakeDisposition(intake, await unit.listEntities(projectId), await unit.listRelationships(projectId), await unit.listOutbox(projectId)).state !== "approved") fail("Exact approved Intake is required.");
      const members: ProjectStateEntity[] = [];
      async function add<T extends EntityType>(entityType: T, body: EntityBodyMap[T]) {
        const record = createProjectStateEntity({entityType, projectId, body, principal: trustedPrincipal});
        await unit.saveEntity(record as ProjectStateEntity, null);
        await recordMutation(unit, {projectId, entityId: record.id, fromVersion: null, toVersion: 1, operation: "create", eventType: PROJECT_STATE_EVENT_TYPES.create,
          occurredAt: record.createdAt, changedFields: Object.keys(body), defaultReason: "Persist proposed Architect semantic output"});
        members.push(record as ProjectStateEntity);
        return record;
      }
      if (input.workflowType === "project-creation") {
      const out = input.output as GreenfieldArchitectOutput;
      const solution = await add("BoundedSolution", {title: "Project architecture and planning direction", objective: out.projectPlanningDirection.join("\n"),
        scopeIn: out.scope, scopeOut: out.nonScope, constraints: out.constraints, assumptions: out.assumptions, risks: out.risksAndDependencies, solutionState: "proposed"});
      for (const [key, title] of Object.entries(GREENFIELD_ARCHITECT_SECTIONS)) {
        if (["scope", "nonScope", "constraints", "assumptions", "risksAndDependencies", "projectPlanningDirection", "acceptanceDirection"].includes(key)) continue;
        for (const statement of out[key as keyof GreenfieldArchitectOutput]) {
          const finding = await add("Finding", {title, statement, category: `architect:project-interview:${key}`, impact: "Proposed Architect direction", observedAt: new Date().toISOString(), findingState: "proposed"});
        }
      }
      for (const statement of out.acceptanceDirection) {
        const criterion = await add("Criterion", {statement, criticality: "required", verificationIntent: "Project acceptance direction; refine during Planning", validationPolicy: "semantic_ai", criterionState: "proposed"});
        await linkSemantic(unit, projectId, solution, criterion, "defines_criterion");
      }
      } else if (input.workflowType === "feature-capability") {
        const output = input.output as FeatureAssessmentCandidate;
        for (const [key, title] of Object.entries(FEATURE_ARCHITECT_SECTIONS)) {
          const record = await add("Finding", {title, statement: output[key as keyof FeatureAssessmentCandidate], category: "feature-assessment", impact: "Proposed Feature assessment", observedAt: new Date().toISOString(), findingState: "proposed"});
          await linkSemantic(unit, projectId, record, workflow, "workflow_member");
        }
      } else if (input.workflowType === "issue-resolution") {
        const output = input.output as {rootCauses: IssueRootCauseCandidateInput[]};
        const edges = await unit.listRelationships(projectId);
        const all = await unit.listEntities(projectId);
        const findings = new Map(all.filter((record): record is ProjectStateRecord<"Finding"> => record.entityType === "Finding" && record.lifecycleState === "active" && record.body.findingState === "current" && edges.some(edge => !edge.endedAt && edge.relationshipType === "workflow_member" && edge.fromEntityId === record.id && edge.toEntityId === workflow.id)).map(record => [record.id, record]));
        const evidence = new Map(all.filter((record): record is ProjectStateRecord<"Evidence"> => record.entityType === "Evidence" && record.lifecycleState === "active" && record.body.evidenceType !== "architect-intake-source" && edges.some(edge => !edge.endedAt && edge.relationshipType === "supports" && edge.fromEntityId === record.id && (edge.toEntityId === workflow.id || edge.toEntityId === intake.id || findings.has(edge.toEntityId)))).map(record => [record.id, record]));
        for (const candidate of output.rootCauses) {
          if (candidate.findingIds.some(id => !findings.has(id)) || candidate.evidenceIds.some(id => !evidence.has(id)) || !candidate.findingIds.length && !candidate.evidenceIds.length) fail("RCA must cite exact Issue Findings or Intake-supported Evidence.");
          const root = await add("RootCause", {title: candidate.title, statement: candidate.statement, rationale: candidate.rationale, ...(candidate.confidence === undefined ? {} : {confidence: candidate.confidence}), rootCauseState: "proposed"});
          await linkSemantic(unit, projectId, root, workflow, "workflow_member");
          for (const id of candidate.findingIds) {await linkSemantic(unit, projectId, root, findings.get(id)!, "explains"); if (!members.some(member => member.id === id)) members.push(findings.get(id)!);}
          if (!candidate.findingIds.length) await linkSemantic(unit, projectId, root, intake, "derived_from");
          for (const id of candidate.evidenceIds) {await linkSemantic(unit, projectId, evidence.get(id)!, root, "supports"); if (!members.some(member => member.id === id)) members.push(evidence.get(id)!);}
        }
      } else if (Object.hasOwn(ASSESSMENT_SECTIONS, input.workflowType)) {
        const type = input.workflowType as AssessmentWorkflowType, out = input.output as Record<string, string>, design = ASSESSMENT_DESIGNS[type];
        const solution = await add("BoundedSolution", {title: ASSESSMENT_SECTIONS[type][design.solution as keyof typeof ASSESSMENT_SECTIONS[typeof type]] ?? "Architect recommendation", objective: out[design.solution], scopeIn: [out[design.scope]], scopeOut: type === "refactor-migration" ? [out.scopeOut] : [], constraints: [out[design.constraints]], assumptions: [out.assumptions], risks: [out.risks], solutionState: "proposed"});
        await linkSemantic(unit, projectId, solution, workflow, "workflow_member");
        const supportEdges = await unit.listRelationships(projectId, "supports");
        const supplied = (await unit.listEntities(projectId, "Evidence")).filter((record): record is ProjectStateRecord<"Evidence"> => record.entityType === "Evidence" && record.lifecycleState === "active" && record.body.evidenceType !== "architect-intake-source" && supportEdges.some(edge => !edge.endedAt && edge.fromEntityId === record.id && (edge.toEntityId === workflow.id || edge.toEntityId === intake.id)));
        if (supplied.length > 32) fail("Assessment supports at most 32 exact supplied Evidence records.");
        for (const evidence of supplied) {await linkSemantic(unit, projectId, evidence, solution, "supports"); members.push(evidence);}
        for (const [key, title] of Object.entries(ASSESSMENT_SECTIONS[type])) {
          const finding = await add("Finding", {title, statement: out[key], category: `architect:${stageKind}:${key}`, impact: "Proposed assessment direction", observedAt: new Date().toISOString(), findingState: "proposed"});
          await linkSemantic(unit, projectId, finding, workflow, "workflow_member");
          if ((design.criteria as readonly string[]).includes(key)) {
            const criterion = await add("Criterion", {statement: out[key], criticality: "required", verificationIntent: `Architect assessment obligation: ${title}`, validationPolicy: "semantic_ai", criterionState: "proposed"});
            await linkSemantic(unit, projectId, solution, criterion, "defines_criterion");
          }
        }
      }
      const source = await add("Evidence", {evidenceType: "architect-intake-source", description: "Exact approved Intake used for Architect output", capturedAt: new Date().toISOString(), capturedBy: trustedPrincipal,
        mediaType: "application/vnd.champcity.project-state", payloadRef: `project-state:${intake.id}@${intake.recordVersion}`, digest: await architectSemanticDigest([intake])});
      await linkSemantic(unit, projectId, source, intake, "supports");
      return saveArchitectReviewCycleInUnit(unit, projectId, {workflowId: workflow.id, stageKind, memberIds: members.map(member => member.id), expectedRecordVersion: cycle?.recordVersion});
    });
  }

  const saveGreenfieldArchitectOutput = (projectId: ProjectId, input: ArchitectCandidateSaveInput & {workflowId: EntityId; output: GreenfieldArchitectOutput}) => saveArchitectCandidate(projectId, {...input, workflowType: "project-creation"});

  /** Adopt exactly one issued legacy SQL set; ambiguous history is never guessed. */
  async function adoptLegacyArchitectReview(projectId: ProjectId, workflowId: EntityId, stageKind: import("./domainContracts").ArchitectStageKind) {
    if (trustedPrincipal.principalType !== "human" || trustedPrincipal.role !== "Operator") fail("Legacy Architect approval adoption requires the Operator principal.");
    return store.transaction(projectId, async unit => {
      const {workflow, cycle} = await currentArchitectCycle(unit, projectId, workflowId, stageKind);
      if (cycle || !["feature-capability", "issue-resolution"].includes(workflow.body.workflowType)) return cycle;
      const edges = await unit.listRelationships(projectId), all = await unit.listEntities(projectId);
      const legacyType = workflow.body.workflowType === "feature-capability" ? "feature-assessment-review" : "issue-rca-review";
      const reviews = all.filter((record): record is ProjectStateRecord<"Decision"> => record.entityType === "Decision" && record.lifecycleState === "active" && record.body.decisionType === legacyType && edges.some(edge => !edge.endedAt && edge.relationshipType === "governs" && edge.fromEntityId === record.id && edge.toEntityId === workflowId));
      if (!reviews.length) {
        const legacyType = workflow.body.workflowType === "feature-capability" ? "Finding" : "RootCause";
        if (all.some(record => record.entityType === legacyType && record.lifecycleState === "active" && (record.entityType !== "Finding" || record.body.category === "feature-assessment") && edges.some(edge => !edge.endedAt && edge.relationshipType === "workflow_member" && edge.fromEntityId === record.id && edge.toEntityId === workflowId))) fail("Legacy Architect SQL candidates lack an unambiguous issued approval.");
        return null;
      }
      if (reviews.length !== 1 || reviews[0].body.outcome !== "accepted" || reviews[0].body.decidedBy.principalType !== "human" || reviews[0].body.decisionRole !== "Operator") fail("Legacy Architect SQL review is ambiguous or conflicting; Operator reconciliation is required.");
      const legacy = reviews[0];
      const intakes = all.filter((record): record is ProjectStateRecord<"WorkflowIntake"> => record.entityType === "WorkflowIntake" && record.lifecycleState === "active" && record.body.workflowId === workflowId);
      if (intakes.length !== 1 || workflowIntakeDisposition(intakes[0], all, edges, await unit.listOutbox(projectId)).state !== "approved") return null;
      const intake = intakes[0];
      if (intake.recordVersion > 1 && legacy.body.effectiveAt < intake.updatedAt) fail("Legacy Architect SQL review is stale against revised Intake.");
      const category = workflow.body.workflowType === "feature-capability" ? "Finding" : "RootCause";
      const candidates = all.filter(record => record.entityType === category && record.lifecycleState === "active" &&
        (record.entityType !== "Finding" || record.body.category === "feature-assessment") && edges.some(edge => !edge.endedAt && edge.relationshipType === "workflow_member" && edge.fromEntityId === record.id && edge.toEntityId === workflowId));
      if (!candidates.length || candidates.some(record => !edges.some(edge => !edge.endedAt && edge.relationshipType === "governs" && edge.fromEntityId === legacy.id && edge.toEntityId === record.id)) ||
        workflow.body.workflowType === "feature-capability" && (candidates.length !== 7 || new Set(candidates.map(record => record.entityType === "Finding" ? record.body.title : "")).size !== 7 || candidates.some(record => record.entityType === "Finding" && !Object.values(FEATURE_ARCHITECT_SECTIONS).includes(record.body.title as typeof FEATURE_ARCHITECT_SECTIONS[keyof typeof FEATURE_ARCHITECT_SECTIONS])))) fail("Legacy Architect semantic sets are ambiguous or incomplete.");
      const ids = new Set(candidates.map(record => record.id));
      if (workflow.body.workflowType === "issue-resolution") for (const edge of edges.filter(edge => !edge.endedAt)) {
        if (edge.relationshipType === "explains" && ids.has(edge.fromEntityId)) ids.add(edge.toEntityId);
        if (edge.relationshipType === "supports" && ids.has(edge.toEntityId)) ids.add(edge.fromEntityId);
      }
      const source = createProjectStateEntity({entityType: "Evidence", projectId, principal: trustedPrincipal, body: {evidenceType: "architect-intake-source", description: "Exact Intake provenance for adopted SQL Architect review", capturedAt: new Date().toISOString(), capturedBy: trustedPrincipal, mediaType: "application/vnd.champcity.project-state", payloadRef: `project-state:${intake.id}@${intake.recordVersion}`, digest: await architectSemanticDigest([intake])}});
      await unit.saveEntity(source, null);
      await recordMutation(unit, {projectId, entityId: source.id, fromVersion: null, toVersion: 1, operation: "create", eventType: PROJECT_STATE_EVENT_TYPES.create, occurredAt: source.createdAt, changedFields: Object.keys(source.body), defaultReason: "Adopt Architect Intake provenance"});
      await linkSemantic(unit, projectId, source, intake, "supports"); ids.add(source.id);
      const adopted = await saveArchitectReviewCycleInUnit(unit, projectId, {workflowId, stageKind, memberIds: [...ids]});
      const now = new Date().toISOString();
      const decision = createProjectStateEntity({entityType: "Decision", projectId, principal: trustedPrincipal, provenance: {origin: "legacy-import", sourceRef: `project-state:${legacy.id}`}, body: decisionBody({decisionType: "architect-review", outcome: "approved", decisionScope: `architect-review:${adopted.id}@${adopted.recordVersion}`, rationale: legacy.body.rationale}, trustedPrincipal, now)});
      await unit.saveEntity(decision, null);
      await recordMutation(unit, {projectId, entityId: decision.id, fromVersion: null, toVersion: 1, operation: "create", eventType: PROJECT_STATE_EVENT_TYPES.create, occurredAt: now, changedFields: Object.keys(decision.body), defaultReason: "Adopt unambiguous issued Architect SQL approval"});
      await linkSemantic(unit, projectId, decision, adopted, "governs");
      await linkSemantic(unit, projectId, decision, legacy, "derived_from");
      return adopted;
    });
  }

  async function architectCycleSnapshot(unit: ProjectStateUnitOfWork, projectId: ProjectId, cycleId: EntityId) {
    const record = await requiredRecord(unit, projectId, cycleId);
    if (record.entityType !== "ArchitectReviewCycle") fail("Architect cycle identity required.");
    const {cycle} = await currentArchitectCycle(unit, projectId, record.body.workflowId, record.body.stageKind);
    if (cycle?.id !== record.id) fail("Architect cycle is not current.");
    const ids = (await unit.listRelationships(projectId, "review_member")).filter(edge => edge.toEntityId === cycle.id && !edge.endedAt).map(edge => edge.fromEntityId);
    const members = await architectMembers(unit, projectId, cycle.body.workflowId, ids);
    let current = await architectSemanticDigest(members) === cycle.body.semanticDigest;
    const sources = members.filter((member): member is ProjectStateRecord<"Evidence"> => member.entityType === "Evidence" && member.body.evidenceType === "architect-intake-source");
    for (const source of sources) {
      const links = (await unit.listRelationships(projectId, "supports")).filter(edge => !edge.endedAt && edge.fromEntityId === source.id);
      const intake = links.length === 1 ? await unit.getEntity(projectId, links[0].toEntityId) : null;
      current &&= !!intake && intake.entityType === "WorkflowIntake" && intake.lifecycleState === "active" &&
        intake.body.workflowId === cycle.body.workflowId && source.body.payloadRef === `project-state:${intake.id}@${intake.recordVersion}` &&
        workflowIntakeDisposition(intake, await unit.listEntities(projectId), await unit.listRelationships(projectId), await unit.listOutbox(projectId)).state === "approved";
    }
    return {cycle, members, current};
  }

  async function getArchitectReviewDisposition(projectId: ProjectId, cycleId: EntityId): Promise<EffectiveDisposition> {
    return store.transaction(projectId, async unit => {
      const {cycle, current} = await architectCycleSnapshot(unit, projectId, cycleId);
      if (!current) return {state: "none", decisionId: null, effectiveAt: null};
      return exactVersionReviewDisposition(cycle, await unit.listEntities(projectId, "Decision"),
        await unit.listRelationships(projectId, "governs"), await unit.listOutbox(projectId), "architect-review", "architect-review");
    });
  }

  async function getArchitectReviewProjection(projectId: ProjectId, cycleId: EntityId) {
    return store.transaction(projectId, async unit => {
      const {cycle, members, current} = await architectCycleSnapshot(unit, projectId, cycleId);
      if (!current) fail("Architect semantic set changed; revise the current cycle before projection.");
      const disposition = exactVersionReviewDisposition(cycle, await unit.listEntities(projectId, "Decision"), await unit.listRelationships(projectId, "governs"), await unit.listOutbox(projectId), "architect-review", "architect-review");
      return renderArchitectReviewProjection(cycle, members, disposition);
    });
  }

  async function recordArchitectReview(projectId: ProjectId, cycleId: EntityId, input: ArchitectReviewDecisionInput, context?: MutationContext) {
    exactInput(input, ["expectedRecordVersion", "outcome", "notes"]);
    if (trustedPrincipal.principalType !== "human" || trustedPrincipal.role !== "Operator") fail("Architect review requires human Operator.");
    if (!Number.isSafeInteger(input.expectedRecordVersion) || input.expectedRecordVersion < 1 || !["approved", "revision_requested", "rejected"].includes(input.outcome)) fail("Exact Architect revision and outcome required.");
    if (input.notes !== undefined && (typeof input.notes !== "string" || new TextEncoder().encode(input.notes).length > 4096)) fail("Architect review notes must be bounded.");
    if (input.outcome === "revision_requested" && !input.notes?.trim()) fail("Revision Requested requires notes.");
    return store.transaction(projectId, async unit => {
      const {cycle, current} = await architectCycleSnapshot(unit, projectId, cycleId);
      if (!current || cycle.recordVersion !== input.expectedRecordVersion) fail("Architect cycle revision is stale.");
      const now = new Date().toISOString();
      const decision = createProjectStateEntity({entityType: "Decision", projectId, principal: trustedPrincipal, body: decisionBody({decisionType: "architect-review", outcome: input.outcome, decisionScope: `architect-review:${cycle.id}@${cycle.recordVersion}`, rationale: input.notes?.trim() ?? ""}, trustedPrincipal, now)});
      await unit.saveEntity(decision, null);
      await recordMutation(unit, {projectId, entityId: decision.id, fromVersion: null, toVersion: 1, operation: "create", eventType: PROJECT_STATE_EVENT_TYPES.create, occurredAt: now, changedFields: Object.keys(decision.body), defaultReason: "Review exact Architect cycle", context});
      await linkSemantic(unit, projectId, decision, cycle, "governs", context);
      return decision;
    });
  }

  async function saveWorkflowIntake(projectId: ProjectId, input: WorkflowIntakeSaveInput, context?: MutationContext): Promise<ProjectStateRecord<"WorkflowIntake">> {
    exactInput(input, ["workflowId", "workflowType", "values", "expectedIntakeRecordVersion", "legacySourceRef"]);
    if (input.legacySourceRef !== undefined && (typeof input.legacySourceRef !== "string" || !input.legacySourceRef.trim() || input.legacySourceRef.length > 4096)) fail("Legacy Intake source must be bounded text.");
    if (input.expectedIntakeRecordVersion !== undefined && (!Number.isSafeInteger(input.expectedIntakeRecordVersion) || input.expectedIntakeRecordVersion < 1)) fail("An exact Intake record version is required.");
    return store.transaction(projectId, async unit => {
      const workflow = await requiredRecord(unit, projectId, input.workflowId);
      await requireCurrentSourceWorkflow(unit, projectId, workflow);
      if (workflow.entityType !== "Workflow" || workflow.body.workflowState !== "active" || workflow.body.workflowType !== input.workflowType) fail("Workflow Intake type mismatch or inactive Workflow.");
      const edges = (await unit.listRelationships(projectId, "intake_for")).filter(edge => edge.toEntityId === workflow.id && !edge.endedAt);
      const active: ProjectStateRecord<"WorkflowIntake">[] = [];
      for (const edge of edges) {
        const record = await requiredRecord(unit, projectId, edge.fromEntityId);
        if (record.lifecycleState === "active") active.push(await requireCurrentWorkflowIntake(unit, projectId, record.id));
      }
      if (active.length > 1) fail("Workflow has ambiguous active Intake records.");
      const previous = active[0];
      if (input.expectedIntakeRecordVersion !== undefined && previous?.recordVersion !== input.expectedIntakeRecordVersion) fail("Expected Intake record version is stale.");
      const body = { workflowId: workflow.id, workflowType: input.workflowType, values: structuredClone(input.values) };
      const next = previous ? validateProjectStateEntity({ ...previous, body, recordVersion: previous.recordVersion + 1,
        updatedAt: new Date().toISOString(), updatedBy: trustedPrincipal }) as ProjectStateRecord<"WorkflowIntake">
        : createProjectStateEntity({ entityType: "WorkflowIntake", projectId, body, principal: trustedPrincipal, ...(input.legacySourceRef ? { provenance: { origin: "legacy-import" as const, sourceRef: input.legacySourceRef } } : {}) });
      await unit.saveEntity(next, previous?.recordVersion ?? null);
      await recordMutation(unit, { projectId, entityId: next.id, fromVersion: previous?.recordVersion ?? null, toVersion: next.recordVersion,
        operation: previous ? "revise" : "create", eventType: previous ? PROJECT_STATE_EVENT_TYPES.revise : PROJECT_STATE_EVENT_TYPES.create,
        occurredAt: next.updatedAt, changedFields: previous ? ["values"] : Object.keys(body), defaultReason: "Save Workflow Intake", context });
      if (!previous) await linkSemantic(unit, projectId, next, workflow, "intake_for", context);
      return next;
    });
  }

  async function recordWorkflowIntakeDecision(projectId: ProjectId, intakeId: EntityId, input: WorkflowIntakeDecisionInput, context?: MutationContext) {
    exactInput(input, ["expectedIntakeRecordVersion", "outcome", "rationale", "notes", "legacyReviewedAt"]);
    if (trustedPrincipal.principalType !== "human" || trustedPrincipal.role !== "Operator") fail("Workflow Intake review requires the human Operator principal.");
    if (!Number.isSafeInteger(input.expectedIntakeRecordVersion) || input.expectedIntakeRecordVersion < 1 || !["approved", "revision_requested", "rejected"].includes(input.outcome)) fail("An exact Intake review is required.");
    for (const value of [input.rationale, input.notes]) if (value !== undefined && (typeof value !== "string" || new TextEncoder().encode(value).length > 4096)) fail("Intake review notes must be bounded text.");
    if (input.outcome === "revision_requested" && !input.notes?.trim()) fail("Revision Requested requires non-empty notes.");
    return store.transaction(projectId, async unit => {
      const intake = await requireCurrentWorkflowIntake(unit, projectId, intakeId);
      if (intake.recordVersion !== input.expectedIntakeRecordVersion) fail("Expected Intake record version is stale.");
      if (input.legacyReviewedAt !== undefined && !Number.isFinite(Date.parse(input.legacyReviewedAt))) fail("Legacy review timestamp is invalid.");
      const now = input.legacyReviewedAt ? new Date(input.legacyReviewedAt).toISOString() : new Date().toISOString();
      const record = createProjectStateEntity({ entityType: "Decision", projectId, principal: trustedPrincipal,
        body: decisionBody({ decisionType: "workflow-intake-review", outcome: input.outcome,
          decisionScope: `workflow-intake:${intake.id}@${intake.recordVersion}`, rationale: [input.rationale, input.notes].filter(Boolean).join("\n\n") }, trustedPrincipal, now) });
      await unit.saveEntity(record, null);
      await recordMutation(unit, { projectId, entityId: record.id, fromVersion: null, toVersion: 1, operation: "create",
        eventType: PROJECT_STATE_EVENT_TYPES.create, occurredAt: now, changedFields: Object.keys(record.body), defaultReason: "Review Workflow Intake", context });
      await linkSemantic(unit, projectId, record, intake, "governs", context);
      return record;
    });
  }

  async function getWorkflowIntakeDisposition(projectId: ProjectId, intakeId: EntityId): Promise<EffectiveDisposition> {
    return store.transaction(projectId, async unit => {
      const intake = await requireCurrentWorkflowIntake(unit, projectId, intakeId);
      return workflowIntakeDisposition(intake, await unit.listEntities(projectId, "Decision"),
        await unit.listRelationships(projectId, "governs"), await unit.listOutbox(projectId));
    });
  }

  async function recordDecision(projectId: ProjectId, targetId: EntityId, input: DecisionInput, context?: MutationContext) {
    if (["workflow-intake-review", "architect-review", "plan-review"].includes(input.decisionType) || ["WorkflowIntake", "ArchitectReviewCycle", "PlanReviewCycle"].includes((await requiredRecord(store, projectId, targetId)).entityType)) fail("Workflow review requires the typed decision command.");
    const now = new Date().toISOString();
    return recordLinked(projectId, targetId, "Decision", decisionBody(input, trustedPrincipal, now), "governs", context);
  }

  async function recordCriterionOperatorDecision(projectId: ProjectId, criterionId: EntityId, input: CriterionOperatorDecisionInput,
    evidenceContext: CriterionOperatorDecisionEvidenceContext, context?: MutationContext) {
    exactInput(input, ["expectedCriterionVersion", "outcome", "rationale", "correctsDecisionId"]);
    exactInput(evidenceContext, ["workflowId", "workItemId", "phaseId"]);
    if (trustedPrincipal.principalType !== "human" || trustedPrincipal.role !== "Operator") fail("Criterion Operator Decisions require the human Operator principal.");
    if (!Number.isSafeInteger(input.expectedCriterionVersion) || !["approved", "rejected"].includes(input.outcome) ||
      typeof input.rationale !== "string" || !input.rationale.trim() || input.rationale.length > 2000 || new TextEncoder().encode(input.rationale).length > 2000)
      fail("A bounded exact Criterion Operator Decision is required.");
    if (Boolean(evidenceContext.workItemId) === Boolean(evidenceContext.phaseId)) fail("Decision evidence context must identify exactly one WorkItem or Phase.");
    return store.transaction(projectId, async unit => {
      const criterion = await requiredRecord(unit, projectId, criterionId);
      if (criterion.entityType !== "Criterion" || criterion.lifecycleState !== "active" || criterion.recordVersion !== input.expectedCriterionVersion ||
        criterion.body.criticality !== "required" || criterion.body.validationPolicy !== "operator_decision")
        fail("Decision requires the exact current active required operator_decision Criterion.");
      const plan = await getWorkflowExecutionPlan(projectId, evidenceContext.workflowId);
      const entry = plan.criteria.find(candidate => candidate.record.id === criterionId);
      if (!entry) fail("Criterion is not part of the exact current Workflow.");
      let evidenceWorkItems: EntityId[];
      if (evidenceContext.workItemId) {
        const workItemId = evidenceContext.workItemId;
        const workItem = [...plan.directWorkItems, ...Object.values(plan.workItemsByPhase).flat()].find(candidate => candidate.id === workItemId);
        if (!workItem || !(entry.ownerId === workItemId || plan.solutions.some(solution => solution.id === entry.ownerId))) fail("Criterion does not govern the exact Workflow WorkItem or accepted solution.");
        evidenceWorkItems = plan.solutions.some(solution => solution.id === entry.ownerId)
          ? [...plan.directWorkItems, ...Object.values(plan.workItemsByPhase).flat()].map(item => item.id).sort() : [workItemId];
      } else {
        const phase = plan.phases.find(candidate => candidate.phaseId === evidenceContext.phaseId);
        if (!phase || entry.ownerId !== phase.phaseId || !phase.workItemIds.every(id => plan.workItemsByPhase[phase.phaseId]?.some(item => item.id === id && item.body.workState === "closed")))
          fail("Phase Criterion Decision requires the exact Phase after all member WorkItems close.");
        evidenceWorkItems = [...phase.workItemIds].sort();
      }
      const currentTesters: ProjectStateRecord<"TesterResult">[] = [];
      const bindings = (await unit.listEntities(projectId, "SourceBinding")).filter((record): record is ProjectStateRecord<"SourceBinding"> => record.entityType === "SourceBinding" && record.lifecycleState === "active" && record.body.workflowId === evidenceContext.workflowId);
      const solutionOwned = Boolean(evidenceContext.workItemId && plan.solutions.some(solution => solution.id === entry.ownerId));
      const revisionChain = bindings.length ? await workflowSourceRevisionChain(projectId, evidenceContext.workflowId, unit) : null;
      for (const workItemId of evidenceWorkItems) {
        const workItem = [...plan.directWorkItems, ...Object.values(plan.workItemsByPhase).flat()].find(candidate => candidate.id === workItemId)!;
        if (evidenceContext.phaseId && workItem.body.workState !== "closed") fail("Every Phase member must be closed before the Phase Operator Decision.");
        const attempts = await getImplementationAttempts(projectId, workItemId);
        const implementation = attempts.at(-1);
        if (!implementation || implementation.body.outcome !== "implemented" || implementation.body.blockers.length) {
          if (solutionOwned && workItemId !== evidenceContext.workItemId) continue;
          fail("Operator Decision requires the selected WorkItem's exact current successful implementation.");
        }
        const matches = (await unit.listEntities(projectId, "TesterResult")).filter((record): record is ProjectStateRecord<"TesterResult"> => record.entityType === "TesterResult" &&
          record.body.workflowId === evidenceContext.workflowId && record.body.workItemId === workItemId && record.body.implementationRecordId === implementation.id);
        if (matches.length !== 1 || !["not-required", "committed"].includes(matches[0].body.checkpointState)) {
          if (solutionOwned && workItemId !== evidenceContext.workItemId) continue;
          fail("Operator Decision requires one exact completed TesterResult for the selected WorkItem evidence.");
        }
        const tester = matches[0];
        if (bindings.length) {
          if (bindings.length !== 1 || bindings[0].body.preparationState !== "ready" || tester.body.sourceMode !== "source-backed" || !tester.body.candidateRevisionId || !revisionChain?.includes(tester.body.candidateRevisionId))
            fail("Operator Decision requires a source-backed TesterResult on the exact Workflow checkpoint chain.");
          if (tester.body.checkpointState === "committed") {
            const checkpoint = tester.body.sourceCheckpointId ? await unit.getEntity(projectId, tester.body.sourceCheckpointId) : null;
            const linked = (await unit.listRelationships(projectId, "checkpoints")).some(edge => edge.fromEntityId === checkpoint?.id && edge.toEntityId === tester.id && !edge.endedAt);
            if (checkpoint?.entityType !== "SourceCheckpoint" || checkpoint.body.workflowId !== evidenceContext.workflowId || checkpoint.body.resultingRevisionId !== tester.body.candidateRevisionId || !linked)
              fail("Committed TesterResult checkpoint must resolve to and link its candidate revision.");
          } else if (tester.body.candidateRevisionId !== tester.body.implementerRevisionId) fail("Uncheckpointed TesterResult candidate must equal its implementation revision.");
        } else if (tester.body.sourceMode !== "source-neutral" || tester.body.candidateRevisionId !== undefined) fail("Source-neutral Operator Decision cannot carry repository identity.");
        currentTesters.push(tester);
      }
      if (solutionOwned && !currentTesters.some(tester => tester.body.workItemId === evidenceContext.workItemId)) fail("Solution Operator Decision requires current Tester evidence for the selected WorkItem boundary.");
      const now = new Date().toISOString();
      let predecessor: ProjectStateRecord<"Decision"> | null = null;
      let terminalPredecessor: ProjectStateRecord<"Decision"> | null = null;
      const governingEdges = (await unit.listRelationships(projectId, "governs")).filter(edge => edge.toEntityId === criterion.id && !edge.endedAt);
      const correctionCandidates = (await unit.listEntities(projectId, "Decision")).filter((record): record is ProjectStateRecord<"Decision"> => record.entityType === "Decision" && record.lifecycleState === "active" && record.body.decisionType === "criterion-operator-decision" && governingEdges.some(edge => edge.fromEntityId === record.id)).sort((a,b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
      const correctionId = input.correctsDecisionId ?? correctionCandidates.at(-1)?.id;
      if (correctionId) {
        predecessor = await requiredRecord(unit, projectId, correctionId) as ProjectStateRecord<"Decision">;
        const governed = (await unit.listRelationships(projectId, "governs")).some(edge => edge.fromEntityId === predecessor!.id && edge.toEntityId === criterion.id && !edge.endedAt);
        if (predecessor.entityType !== "Decision" || predecessor.body.decisionType !== "criterion-operator-decision" || predecessor.lifecycleState !== "active" || !governed)
          fail("Correction requires the exact current Criterion Decision governing this Criterion.");
        const family = (await unit.listEntities(projectId, "Decision")).filter(candidate => candidate.lineageId === predecessor!.lineageId && candidate.lifecycleState !== "superseded");
        if (family.length !== 1 || family[0].id !== predecessor.id) fail("Criterion Decision correction target is stale.");
        const terminal = validateProjectStateEntity({ ...predecessor, recordVersion: predecessor.recordVersion + 1, lifecycleState: "superseded", supersededAt: now, updatedAt: now, updatedBy: trustedPrincipal }) as ProjectStateRecord<"Decision">;
        terminalPredecessor = terminal;
        await unit.saveEntity(terminal, predecessor.recordVersion, { terminalSupersession: true });
        await recordMutation(unit, { projectId, entityId: predecessor.id, fromVersion: predecessor.recordVersion, toVersion: terminal.recordVersion, operation: "supersede", eventType: PROJECT_STATE_EVENT_TYPES.supersede, occurredAt: now, changedFields: ["lifecycleState", "supersededAt"], defaultReason: "Correct Criterion Operator Decision", context });
      }
      const created = createProjectStateEntity({ entityType: "Decision", projectId, body: decisionBody({ decisionType: "criterion-operator-decision",
        outcome: input.outcome, decisionScope: criterion.id, rationale: input.rationale.trim() }, trustedPrincipal, now), principal: trustedPrincipal });
      const decision = predecessor ? validateProjectStateEntity({ ...created, lineageId: predecessor.lineageId }) as ProjectStateRecord<"Decision"> : created;
      await unit.saveEntity(decision, null);
      await recordMutation(unit, { projectId, entityId: decision.id, fromVersion: null, toVersion: 1, operation: "create", eventType: PROJECT_STATE_EVENT_TYPES.create,
        occurredAt: decision.createdAt, changedFields: Object.keys(decision.body), defaultReason: "Record Criterion Operator Decision", context });
      if (predecessor && terminalPredecessor) await linkSemantic(unit, projectId, decision, terminalPredecessor, "supersedes", context);
      await linkSemantic(unit, projectId, decision, criterion, "governs", context);
      for (const tester of currentTesters) await linkSemantic(unit, projectId, decision, tester, "derived_from", context);
      return { decision, evidenceTesterResultIds: currentTesters.map(tester => tester.id) };
    });
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
      const intakeIds = (await unit.listRelationships(projectId, "intake_for")).filter(edge => edge.toEntityId === workflow.id && !edge.endedAt).map(edge => edge.fromEntityId);
      const intakes = (await unit.listEntities(projectId, "WorkflowIntake")).filter((record): record is ProjectStateRecord<"WorkflowIntake"> => record.entityType === "WorkflowIntake" && record.lifecycleState === "active" && record.body.workflowId === workflow.id && intakeIds.includes(record.id));
      if (intakes.length !== 1) fail("Feature assessment requires the complete current Intake owned by this exact Workflow.");
      await requireCurrentWorkflowIntake(unit, projectId, intakes[0].id);
      const requiredIntakeKeys = ["requestedCapability", "baseline", "scopeIn", "scopeOut", "constraints", "preservation", "affectedSurfaces", "evidence", "compatibilityRollout"];
      if (requiredIntakeKeys.some(key => typeof intakes[0].body.values[key] !== "string" || !(intakes[0].body.values[key] as string).trim())) fail("Feature assessment requires the complete current Intake owned by this exact Workflow.");
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
      const currentIntakes = (await unit.listEntities(projectId, "WorkflowIntake")).filter(r => r.entityType === "WorkflowIntake" && r.lifecycleState === "active" && r.body.workflowId === workflow.id);
      if (currentIntakes.length > 1) fail("Issue Workflow has ambiguous current Intake records.");
      const structuredIntake = currentIntakes[0];
      if (structuredIntake) await requireCurrentWorkflowIntake(unit, projectId, structuredIntake.id);
      const evidenceRecords = new Map((await unit.listEntities(projectId, "Evidence")).filter((record): record is ProjectStateRecord<"Evidence"> => record.entityType === "Evidence" && record.lifecycleState === "active").map(record => [record.id, record]));
      const supportEdges = (await unit.listRelationships(projectId, "supports")).filter(edge => !edge.endedAt);
      const candidates = input.rootCauses.map(candidate => {
        exactInput(candidate, ["title", "statement", "rationale", "confidence", "findingIds", "evidenceIds"]);
        for (const [key, maximum] of [["title", 200], ["statement", 4096], ["rationale", 4096]] as const) if (typeof candidate[key] !== "string" || !candidate[key].trim() || candidate[key].length > maximum || new TextEncoder().encode(candidate[key] as string).length > 4096 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(candidate[key] as string)) fail(`RootCause ${key} must be bounded text.`);
        if (candidate.confidence !== undefined && (typeof candidate.confidence !== "number" || !Number.isFinite(candidate.confidence) || candidate.confidence < 0 || candidate.confidence > 1)) fail("RootCause confidence must be between zero and one.");
        if (!Array.isArray(candidate.findingIds) || candidate.findingIds.length > 32 || new Set(candidate.findingIds).size !== candidate.findingIds.length || candidate.findingIds.some(id => !ownedFindings.has(id))) fail("RootCause must cite current Findings owned by this exact Issue Workflow.");
        if (!Array.isArray(candidate.evidenceIds) || candidate.evidenceIds.length > 32 || new Set(candidate.evidenceIds).size !== candidate.evidenceIds.length) fail("RootCause Evidence references are invalid or exceed their bounds.");
        if (!candidate.findingIds.length && (!structuredIntake || !candidate.evidenceIds.length)) fail("RootCause requires exact Issue Intake and supporting Evidence when no Findings are cited.");
        const unsupportedEvidence = candidate.evidenceIds.find(id => !evidenceRecords.has(id) || !supportEdges.some(edge => edge.fromEntityId === id && (edge.toEntityId === workflow.id || edge.toEntityId === structuredIntake?.id || ownedFindings.has(edge.toEntityId))));
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
      if (prior.entityType === "Decision" && (prior.body.decisionType === "workflow-intake-review" || input.decisionType === "workflow-intake-review")) fail("WorkflowIntake review requires the typed decision command; issued reviews remain immutable.");
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

  async function recordValidation(projectId: ProjectId, targetId: EntityId, input: { validationType: string; method: string; validationMode?: ValidationMode; outcome: "pass" | "fail" | "blocked" | "inconclusive"; summary: string; targetRecordVersion?: number; sourceBaselineRef?: string; implementationRecordId?: EntityId }, context?: MutationContext) {
    exactInput(input, ["validationType", "method", "validationMode", "outcome", "summary", "targetRecordVersion", "sourceBaselineRef", "implementationRecordId"]);
    if (input.validationType === "test-lifecycle-assessment") fail("Test lifecycle assessment requires a typed command.");
    const implementation = input.implementationRecordId ? await store.getEntity(projectId, input.implementationRecordId) : null;
    if (input.implementationRecordId !== undefined && (implementation?.entityType !== "ImplementationRecord" || implementation.body.outcome !== "implemented"))
      fail("Validation implementation attempt is unavailable or unsuccessful.");
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
        ...(input.implementationRecordId === undefined ? {} : { implementationRecordId: input.implementationRecordId }),
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
    if (trustedPrincipal.principalType !== "agent" || trustedPrincipal.role !== "Implementer") fail("Exact implementation attempts require the trusted Implementer agent principal.");
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
    executionRef: string, input: Omit<EntityBodyMap["ImplementationRecord"], "workItemId" | "executionRef">,
    context?: MutationContext) {
    exactInput(input, ["summary", "deviations", "blockers", "residualRisks", "outcome"]);
    if (trustedPrincipal.principalType !== "agent" || trustedPrincipal.role !== "Implementer") fail("Exact implementation evidence requires the trusted Implementer agent principal.");
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

  /** Create a canonical same-Workflow Repair in one Project State transaction from exact failure evidence. */
  async function createWorkflowRepair(projectId: ProjectId, input: WorkflowRepairInput, context?: MutationContext) {
    exactInput(input, ["workflowId", "workItemId", "failureEvidenceId"]);
    return store.transaction(projectId, async unit => {
      const workflow = await requiredRecord(unit, projectId, input.workflowId);
      const parent = await requiredRecord(unit, projectId, input.workItemId);
      if (workflow.entityType !== "Workflow" || workflow.lifecycleState !== "active" || workflow.body.workflowState !== "active" ||
        !["feature-capability", "issue-resolution"].includes(workflow.body.workflowType) || parent.entityType !== "WorkItem" ||
        parent.lifecycleState !== "active" || parent.body.workState === "closed") fail("Repair requires an exact active Workflow and open WorkItem.");
      const plan = await getWorkflowExecutionPlan(projectId, workflow.id);
      const members = [...plan.directWorkItems, ...Object.values(plan.workItemsByPhase).flat()];
      if (!members.some(item => item.id === parent.id)) fail("Repair parent is not in the exact current Workflow.");
      const currentWorkflowIds = (await unit.listEntities(projectId, "Workflow"))
        .filter(record => record.entityType === "Workflow" && record.lineageId === workflow.lineageId && record.lifecycleState === "active" && record.body.workflowState === "active").map(record => record.id);
      if (currentWorkflowIds.length !== 1 || currentWorkflowIds[0] !== workflow.id) fail("Repair requires the unique current Workflow.");

      const evidence = await requiredRecord(unit, projectId, input.failureEvidenceId);
      let identity: string;
      let failureSummary: string;
      let criterion: ProjectStateRecord<"Criterion"> | null = null;
      if (evidence.entityType === "Validation" && evidence.body.outcome === "fail") {
        const criterionRecord = await unit.getEntity(projectId, evidence.body.targetEntityId);
        const link = (await unit.listRelationships(projectId, "evaluates")).some(edge => edge.fromEntityId === evidence.id && edge.toEntityId === evidence.body.targetEntityId && !edge.endedAt);
        if (!link || criterionRecord?.entityType !== "Criterion" || criterionRecord.lifecycleState !== "active" || criterionRecord.recordVersion !== evidence.body.targetRecordVersion)
          fail("Repair Validation must be the current failing Validation for an active Criterion.");
        const criterionEdges = (await unit.listRelationships(projectId, "defines_criterion")).filter(edge => edge.toEntityId === criterionRecord.id && !edge.endedAt);
        const workItemOwned = criterionEdges.some(edge => edge.fromEntityId === parent.id);
        const governingEdges = (await unit.listRelationships(projectId, "governs")).filter(edge => !edge.endedAt);
        const acceptedSolutions = plan.solutions.filter(solution => plan.decisions.some(decision =>
          governingEdges.some(edge => edge.fromEntityId === decision.id && edge.toEntityId === solution.id)));
        const acceptedSolutionOwned = acceptedSolutions.length === 1 && criterionEdges.some(edge => edge.fromEntityId === acceptedSolutions[0].id);
        if ((!workItemOwned && !acceptedSolutionOwned) || criterionRecord.body.criticality !== "required" || criterionRecord.body.validationPolicy === "deferred_visual_phase" || criterionRecord.body.validationPolicy === "operator_decision")
          fail("Repair Validation must identify a required completion-relevant Criterion owned by the parent WorkItem or its accepted BoundedSolution.");
        criterion = criterionRecord;
        identity = `validation:${evidence.id}:criterion:${criterionRecord.id}:version:${criterionRecord.recordVersion}`;
        failureSummary = evidence.body.summary;
      } else if (evidence.entityType === "Decision" && evidence.body.decisionType === "criterion-operator-decision" && evidence.body.outcome === "rejected") {
        const decisionGoverns = (await unit.listRelationships(projectId, "governs")).filter(edge => edge.fromEntityId === evidence.id && !edge.endedAt);
        const governed = evidence.lifecycleState === "active" && decisionGoverns.length === 1;
        const criterionId = decisionGoverns[0]?.toEntityId;
        const criterionRecord = criterionId ? await unit.getEntity(projectId, criterionId) : null;
        const criterionEdges = criterionRecord ? (await unit.listRelationships(projectId, "defines_criterion")).filter(edge => edge.toEntityId === criterionRecord.id && !edge.endedAt) : [];
        const workItemOwned = criterionEdges.some(edge => edge.fromEntityId === parent.id);
        const allGoverns = (await unit.listRelationships(projectId, "governs")).filter(edge => !edge.endedAt);
        const acceptedSolutionIds = new Set(plan.solutions.filter(solution => plan.decisions.some(decision =>
          allGoverns.some(edge => edge.fromEntityId === decision.id && edge.toEntityId === solution.id))).map(solution => solution.id));
        const solutionOwned = criterionEdges.some(edge => acceptedSolutionIds.has(edge.fromEntityId));
        const evidenceIds = (await unit.listRelationships(projectId, "derived_from")).filter(edge => edge.fromEntityId === evidence.id && !edge.endedAt).map(edge => edge.toEntityId);
        const expectedCurrent = [] as EntityId[];
        for (const workItemId of (workItemOwned ? [parent.id] : solutionOwned ? members.map(item => item.id) : [])) {
          const attempts = (await unit.listEntities(projectId, "ImplementationRecord")).filter((record): record is ProjectStateRecord<"ImplementationRecord"> => record.entityType === "ImplementationRecord" && record.body.workItemId === workItemId).sort((a,b) => a.createdAt.localeCompare(b.createdAt));
          const latest = attempts.at(-1); if (!latest || latest.body.outcome !== "implemented") continue;
          const testers = (await unit.listEntities(projectId, "TesterResult")).filter((record): record is ProjectStateRecord<"TesterResult"> => record.entityType === "TesterResult" && record.body.workflowId === workflow.id && record.body.workItemId === workItemId && record.body.implementationRecordId === latest.id && ["not-required", "committed"].includes(record.body.checkpointState));
          if (testers.length === 1) expectedCurrent.push(testers[0].id);
        }
        if (!governed || criterionRecord?.entityType !== "Criterion" || criterionRecord.body.criticality !== "required" || criterionRecord.body.validationPolicy !== "operator_decision" ||
          (!workItemOwned && !solutionOwned) || expectedCurrent.length !== evidenceIds.length || expectedCurrent.some(id => !evidenceIds.includes(id)))
          fail("Repair Decision must be a current rejected Criterion-specific Operator Decision for the exact parent WorkItem or accepted solution.");
        criterion = criterionRecord as ProjectStateRecord<"Criterion">;
        identity = `decision:${evidence.id}:criterion:${criterion.id}:version:${criterion.recordVersion}`;
        failureSummary = evidence.body.rationale;
      } else if (evidence.entityType === "TesterResult" && evidence.body.recommendation === "production-defect-suspected" &&
        evidence.body.workflowId === workflow.id && evidence.body.workItemId === parent.id) {
        identity = `tester:${evidence.id}:implementation:${evidence.body.implementationRecordId}`;
        failureSummary = evidence.body.rationale;
      } else fail("Repair requires a failing current Validation or exact production-defect TesterResult.");

      const activeRepairs = (await unit.listRelationships(projectId, "repairs"))
        .filter(edge => edge.toEntityId === parent.id && !edge.endedAt);
      for (const edge of activeRepairs) {
        const existing = await unit.getEntity(projectId, edge.fromEntityId);
        if (existing?.entityType === "WorkItem" && existing.lifecycleState === "active" && !["closed", "cancelled"].includes(existing.body.workState) &&
          existing.body.objective.includes(`[${identity}]`)) fail("An active Repair already exists for this exact unresolved failure.");
      }
      const memberships = (await unit.listRelationships(projectId, "part_of")).filter(edge => !edge.endedAt);
      const membership = memberships.find(edge => edge.fromEntityId === parent.id);
      if (!membership) fail("Repair parent has no exact Workflow/Phase owner.");
      const owner = await requiredRecord(unit, projectId, membership.toEntityId);
      if (!(owner.entityType === "Workflow" && owner.id === workflow.id || owner.entityType === "Phase" && plan.phases.some(phase => phase.phaseId === owner.id)))
        fail("Repair parent belongs to a different Workflow.");
      const governingEdges = (await unit.listRelationships(projectId, "governs")).filter(edge => !edge.endedAt);
      const acceptedSolution = plan.solutions.filter(solution => plan.decisions.some(decision =>
        governingEdges.some(edge => edge.fromEntityId === decision.id && edge.toEntityId === solution.id)));
      if (acceptedSolution.length !== 1) fail("Repair requires one accepted BoundedSolution in the exact Workflow.");
      const sourceBindings = (await unit.listEntities(projectId, "SourceBinding")).filter((record): record is ProjectStateRecord<"SourceBinding"> => record.entityType === "SourceBinding" && record.lifecycleState === "active" && record.body.workflowId === workflow.id);
      if (sourceBindings.length > 1) fail("Repair source mode is ambiguous for the exact Workflow.");
      const repairValidationPolicy = sourceBindings.length ? "deterministic" as const : "semantic_ai" as const;

      const repair = createProjectStateEntity({ entityType: "WorkItem", projectId,
        body: { workItemKind: workflow.body.workflowType === "issue-resolution" ? "repair" : "fix",
          title: `Repair: ${parent.body.title}`.slice(0, 512), objective: `${failureSummary.trim().slice(0, 4096 - identity.length - 3)} [${identity}]`, workState: "planned" }, principal: trustedPrincipal });
      const repairCriterion = createProjectStateEntity({ entityType: "Criterion", projectId,
        body: { statement: criterion ? `Resolve failed Criterion: ${criterion.body.statement}`.slice(0, 4096) : `Resolve production defect: ${failureSummary.trim()}`.slice(0, 4096),
          criticality: "required", verificationIntent: criterion?.body.verificationIntent ?? "Verify the reported production defect is corrected with exact current proof.",
          validationPolicy: repairValidationPolicy,
          criterionState: "active" }, principal: trustedPrincipal });
      for (const record of [repair, repairCriterion]) {
        await unit.saveEntity(record, null);
        await recordMutation(unit, { projectId, entityId: record.id, fromVersion: null, toVersion: 1, operation: "create", eventType: PROJECT_STATE_EVENT_TYPES.create,
          occurredAt: record.createdAt, changedFields: Object.keys(record.body), defaultReason: record.entityType === "WorkItem" ? "Create exact Workflow Repair" : "Define Repair Criterion", context });
      }
      await linkSemantic(unit, projectId, repair, owner, "part_of", context);
      await linkSemantic(unit, projectId, repair, acceptedSolution[0], "implements", context);
      await linkSemantic(unit, projectId, repair, parent, "repairs", context);
      await linkSemantic(unit, projectId, repair, repairCriterion, "defines_criterion", context);
      await linkSemantic(unit, projectId, repairCriterion, evidence, "derived_from", context);
      return { repair, criterion: repairCriterion, failureIdentity: identity };
    });
  }

  async function createPhaseRepair(projectId: ProjectId, input: { workflowId: EntityId; phaseId: EntityId; failureEvidenceId: EntityId }, context?: MutationContext) {
    exactInput(input, ["workflowId", "phaseId", "failureEvidenceId"]);
    return store.transaction(projectId, async unit => {
      const workflow = await requiredRecord(unit, projectId, input.workflowId), phaseRecord = await requiredRecord(unit, projectId, input.phaseId);
      if (workflow.entityType !== "Workflow" || workflow.lifecycleState !== "active" || workflow.body.workflowState !== "active" || !["feature-capability", "issue-resolution"].includes(workflow.body.workflowType) ||
        phaseRecord.entityType !== "Phase" || phaseRecord.lifecycleState !== "active" || ["closed", "cancelled"].includes(phaseRecord.body.phaseState)) fail("Phase Repair requires the exact current open Workflow Phase.");
      const currentWorkflows = (await unit.listEntities(projectId, "Workflow")).filter(record => record.entityType === "Workflow" && record.lineageId === workflow.lineageId && record.lifecycleState === "active" && !["closed", "cancelled"].includes(record.body.workflowState));
      if (currentWorkflows.length !== 1 || currentWorkflows[0].id !== workflow.id) fail("Phase Repair requires the unique current Workflow in its lineage.");
      const plan = await getWorkflowExecutionPlan(projectId, workflow.id), phase = plan.phases.find(candidate => candidate.phaseId === phaseRecord.id);
      const phaseIndex = plan.phases.findIndex(candidate => candidate.phaseId === phaseRecord.id);
      if (!phase) fail("Phase Repair target is outside the exact current Workflow.");
      const evidence = await requiredRecord(unit, projectId, input.failureEvidenceId);
      const criterionId = evidence.entityType === "Validation" ? evidence.body.targetEntityId : evidence.entityType === "Decision"
        ? (await unit.listRelationships(projectId, "governs")).find(edge => edge.fromEntityId === evidence.id && !edge.endedAt)?.toEntityId : undefined;
      const criterion = criterionId ? await unit.getEntity(projectId, criterionId) : null;
      const entry = criterion?.entityType === "Criterion" ? plan.criteria.find(candidate => candidate.record.id === criterion.id) : null;
      const consumed = entry && (entry.ownerId === phaseRecord.id || entry.record.body.validationPolicy === "deferred_visual_phase" &&
        (phase.workItemIds.includes(entry.ownerId) || phaseIndex === plan.phases.length - 1 && plan.solutions.some(solution => solution.id === entry.ownerId)));
      if (!consumed || criterion?.entityType !== "Criterion" || criterion.lifecycleState !== "active" || criterion.body.criticality !== "required") fail("Phase Repair failure must belong to an exact active required Criterion consumed at this Phase boundary.");
      const failureIdentity = `phase-failure:${evidence.id}:criterion:${criterion.id}:phase:${phaseRecord.id}`;
      for (const edge of (await unit.listRelationships(projectId, "part_of")).filter(edge => edge.toEntityId === phaseRecord.id && !edge.endedAt)) {
        const existing = await unit.getEntity(projectId, edge.fromEntityId);
        if (existing?.entityType === "WorkItem" && existing.lifecycleState === "active" && !["closed", "cancelled"].includes(existing.body.workState) && existing.body.objective.includes(`[${failureIdentity}]`)) fail("An active Phase Repair already exists for this exact failure.");
      }
      const sourceBinding = (await unit.listEntities(projectId, "SourceBinding")).find((record): record is ProjectStateRecord<"SourceBinding"> => record.entityType === "SourceBinding" && record.lifecycleState === "active" && record.body.workflowId === workflow.id);
      const currentSource = sourceBinding?.body.currentRevisionId;
      let failureSummary: string;
      if (evidence.entityType === "Validation" && evidence.body.outcome === "fail" && evidence.body.validationType === "phase-criterion" && evidence.body.targetEntityId === criterion.id) {
        const freshness = await getValidationFreshness(projectId, evidence.id, currentSource);
        const status = await getCriterionValidationStatus(projectId, criterion.id, currentSource);
        if (!freshness.current || status.validationId !== evidence.id || status.satisfied) fail("Phase Repair requires the latest current failing Phase Criterion Validation.");
        failureSummary = evidence.body.summary;
      } else if (evidence.entityType === "Decision" && evidence.body.decisionType === "criterion-operator-decision" && evidence.body.outcome === "rejected" && evidence.lifecycleState === "active") {
        const phaseEvidenceIds = await currentPhaseEvidenceTesterIds(projectId, workflow.id, phaseRecord.id, currentSource);
        const status = await getCriterionOperatorDecisionStatus(projectId, criterion.id, phaseEvidenceIds);
        if (!status.current || status.decisionId !== evidence.id || status.state !== "rejected") fail("Phase Repair requires the current rejected Criterion Operator Decision.");
        failureSummary = evidence.body.rationale;
      } else fail("Phase Repair requires current failing Phase Validation or rejected Criterion Operator Decision evidence.");
      const governingEdges = (await unit.listRelationships(projectId, "governs")).filter(edge => !edge.endedAt);
      const acceptedSolutions = plan.solutions.filter(solution => plan.decisions.some(decision => governingEdges.some(edge => edge.fromEntityId === decision.id && edge.toEntityId === solution.id)));
      if (acceptedSolutions.length !== 1) fail("Phase Repair requires one accepted BoundedSolution in the exact Workflow.");
      const sourceBindings = (await unit.listEntities(projectId, "SourceBinding")).filter((record): record is ProjectStateRecord<"SourceBinding"> => record.entityType === "SourceBinding" && record.lifecycleState === "active" && record.body.workflowId === workflow.id);
      if (sourceBindings.length > 1) fail("Phase Repair source mode is ambiguous for the exact Workflow.");
      const repairValidationPolicy = sourceBindings.length ? "deterministic" as const : "semantic_ai" as const;
      const ownerEdges = (await unit.listRelationships(projectId, "part_of")).filter(edge => edge.fromEntityId === phaseRecord.id && !edge.endedAt);
      if (ownerEdges.length !== 1 || ownerEdges[0].toEntityId !== workflow.id) fail("Phase is not owned by the exact Workflow.");
      const repair = createProjectStateEntity({ entityType: "WorkItem", projectId, body: { workItemKind: workflow.body.workflowType === "issue-resolution" ? "repair" : "fix",
        title: `Repair: ${criterion.body.statement}`.slice(0, 512), objective: `${failureSummary.trim().slice(0, 3500)} [${failureIdentity}]`, workState: "planned" }, principal: trustedPrincipal });
      const repairCriterion = createProjectStateEntity({ entityType: "Criterion", projectId, body: { statement: `Resolve failed Phase Criterion: ${criterion.body.statement}`.slice(0, 4096),
        criticality: "required", verificationIntent: criterion.body.verificationIntent, validationPolicy: repairValidationPolicy, criterionState: "active" }, principal: trustedPrincipal });
      for (const record of [repair, repairCriterion]) {
        await unit.saveEntity(record, null);
        await recordMutation(unit, { projectId, entityId: record.id, fromVersion: null, toVersion: 1, operation: "create", eventType: PROJECT_STATE_EVENT_TYPES.create, occurredAt: record.createdAt,
          changedFields: Object.keys(record.body), defaultReason: record.entityType === "WorkItem" ? "Create exact Phase Repair" : "Define Phase Repair Criterion", context });
      }
      await linkSemantic(unit, projectId, repair, phaseRecord, "part_of", context);
      await linkSemantic(unit, projectId, repair, acceptedSolutions[0], "implements", context);
      await linkSemantic(unit, projectId, repair, repairCriterion, "defines_criterion", context);
      await linkSemantic(unit, projectId, repair, evidence, "derived_from", context);
      await linkSemantic(unit, projectId, repairCriterion, evidence, "derived_from", context);
      return { repair, criterion: repairCriterion, failureIdentity };
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
      const sourceBaselines = (await unit.listRelationships(projectId, "baselines_source")).filter(edge => edge.toEntityId === workflow.id && !edge.endedAt);
      if (sourceBaselines.length === 0 && input.criterionDispositions.some(disposition => disposition.disposition === "split" && disposition.replacements.some(split =>
        split.criterion.criticality === "required" && split.criterion.validationPolicy === "deterministic")))
        fail("Required deterministic ValidationCatalog proof is unavailable for this source-neutral Workflow; choose a supported policy.");
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
            if (split.criterion.validationPolicy === "deferred_visual_phase" && sourceOwner.entityType !== "Phase") fail("deferred_visual_phase Criteria require an owning Phase boundary.");
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

  /** Exact execution-stage close/state advance; integration remains a separate typed stage. */
  async function completeWorkflowExecution(projectId: ProjectId, workflowId: EntityId, expectedRevision: number,
    sourceMode: "source-backed" | "source-neutral", expectedSourceRevision: string | null, context?: MutationContext) {
    if (principal.role !== "WorkflowExecution") fail("Workflow execution completion requires its application principal.");
    const plan = await getWorkflowExecutionPlan(projectId, workflowId);
    return store.transaction(projectId, async unit => {
      const workflow = await requiredRecord(unit, projectId, workflowId);
      if (workflow.entityType !== "Workflow" || workflow.recordVersion !== expectedRevision || workflow.lifecycleState !== "active" ||
        !["feature-capability", "issue-resolution"].includes(workflow.body.workflowType) || ["closed", "cancelled"].includes(workflow.body.workflowState)) fail("Exact current substantive Workflow is unavailable or stale.");
      if (plan.solutions.length !== 1 || plan.decisions.length !== 1) fail("Workflow execution completion requires one accepted canonical plan.");
      const accepted = await requiredRecord(unit, projectId, plan.decisions[0].id);
      const solution = await requiredRecord(unit, projectId, plan.solutions[0].id);
      if (accepted.entityType !== "Decision" || accepted.lifecycleState !== "active" || accepted.body.outcome !== "accepted" || solution.entityType !== "BoundedSolution" || solution.lifecycleState !== "active") fail("Workflow accepted plan changed before completion.");
      const workItems = [...plan.directWorkItems, ...Object.values(plan.workItemsByPhase).flat()];
      for (const item of workItems) {
        const current = await requiredRecord(unit, projectId, item.id);
        if (current.entityType !== "WorkItem" || current.recordVersion !== item.recordVersion || current.body.workState !== "closed") fail("Workflow execution completion requires all current WorkItems closed.");
      }
      for (const phase of plan.phases) {
        const current = await requiredRecord(unit, projectId, phase.phaseId);
        if (current.entityType !== "Phase" || current.recordVersion !== phase.record.recordVersion || current.body.phaseState !== "closed") fail("Workflow execution completion requires all current Phases closed.");
      }
      const repairs = new Set(plan.repairIds.map(edge => edge.from));
      for (const id of repairs) { const repair = await requiredRecord(unit, projectId, id); if (repair.entityType !== "WorkItem" || repair.body.workState !== "closed") fail("Workflow execution completion requires all Repairs closed."); }
      const workflowIds = new Set((await unit.listEntities(projectId, "Workflow")).filter(record => record.entityType === "Workflow" && record.lineageId === workflow.lineageId).map(record => record.id));
      const bindings = (await unit.listEntities(projectId, "SourceBinding")).filter((record): record is ProjectStateRecord<"SourceBinding"> => record.entityType === "SourceBinding" && record.lifecycleState === "active" && workflowIds.has(record.body.workflowId));
      const integrations = (await unit.listEntities(projectId, "IntegrationRecord")).filter((record): record is ProjectStateRecord<"IntegrationRecord"> => record.entityType === "IntegrationRecord" && record.body.workflowId === workflowId);
      if (sourceMode === "source-neutral" && (expectedSourceRevision !== null || bindings.length || integrations.length)) fail("Source-neutral Workflow cannot carry repository integration identity.");
      if (sourceMode === "source-backed" && (bindings.length !== 1 || bindings[0].body.preparationState !== "ready" || !bindings[0].body.currentRevisionId || bindings[0].body.currentRevisionId !== expectedSourceRevision)) fail("Source-backed execution completion requires one ready exact SourceBinding at the projected revision.");
      if (sourceMode === "source-backed" && integrations.some(record => record.body.integrationState === "integrated")) fail("Integrated Workflow cannot repeat execution completion.");
      const now = new Date().toISOString();
      const closed = sourceMode === "source-neutral";
      const next = validateProjectStateEntity({ ...workflow, recordVersion: expectedRevision + 1,
        ...(closed ? { lifecycleState: "closed" as const, closedAt: now } : {}), updatedAt: now, updatedBy: trustedPrincipal,
        body: { ...workflow.body, workflowState: closed ? "closed" as const : "active" as const, currentWorkspace: closed ? "execution-complete" : "integration-ready" } });
      await unit.saveEntity(next, expectedRevision);
      await recordMutation(unit, { projectId, entityId: workflowId, fromVersion: expectedRevision, toVersion: next.recordVersion,
        operation: "revise", eventType: PROJECT_STATE_EVENT_TYPES.revise, occurredAt: now,
        changedFields: ["workflowState", "currentWorkspace", ...(closed ? ["lifecycleState", "closedAt"] : [])],
        defaultReason: closed ? "Complete source-neutral Workflow execution" : "Advance source-backed Workflow to integration readiness", context });
      return next;
    });
  }

  async function closeIntegratedWorkflow(projectId: ProjectId, workflowId: EntityId, integrationId: EntityId, expectedRevision: number, resultRevisionId: string, context?: MutationContext) {
    if (principal.role !== "WorkflowIntegration") fail("Workflow closure requires its integration application principal.");
    return store.transaction(projectId, async unit => {
      const workflow = await requiredRecord(unit, projectId, workflowId);
      const integration = await requiredRecord(unit, projectId, integrationId);
      if (workflow.entityType !== "Workflow" || workflow.recordVersion !== expectedRevision || workflow.lifecycleState !== "active" || workflow.body.currentWorkspace !== "integration-ready" ||
        integration.entityType !== "IntegrationRecord" || integration.body.workflowId !== workflowId || integration.body.integrationState !== "integrated" ||
        integration.body.outcome !== "integrated" || integration.body.resultRevisionId !== resultRevisionId || integration.body.targetAfterRevisionId !== resultRevisionId)
        fail("Workflow closure requires the exact integrated result revision.");
      const now = new Date().toISOString();
      const next = validateProjectStateEntity({ ...workflow, recordVersion: expectedRevision + 1, lifecycleState: "closed", closedAt: now,
        updatedAt: now, updatedBy: trustedPrincipal, body: { ...workflow.body, workflowState: "closed", currentWorkspace: "integrated" } });
      await unit.saveEntity(next, expectedRevision);
      await recordMutation(unit, { projectId, entityId: workflowId, fromVersion: expectedRevision, toVersion: next.recordVersion, operation: "revise",
        eventType: PROJECT_STATE_EVENT_TYPES.revise, occurredAt: now, changedFields: ["workflowState", "lifecycleState", "closedAt", "currentWorkspace"],
        defaultReason: "Close Workflow after exact Dev integration", context });
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

  async function workflowSourceRevisionChain(projectId: ProjectId, workflowId: EntityId, reader: ProjectStateStore | ProjectStateUnitOfWork = store): Promise<string[] | null> {
    const workflow = await reader.getEntity(projectId, workflowId);
    if (workflow?.entityType !== "Workflow") fail("Source revision lineage requires the exact Workflow.");
    const lineageWorkflowIds = new Set((await reader.listEntities(projectId, "Workflow"))
      .filter(record => record.entityType === "Workflow" && record.lineageId === workflow.lineageId).map(record => record.id));
    const baselines = (await reader.listEntities(projectId, "SourceBaseline"))
      .filter((record): record is ProjectStateRecord<"SourceBaseline"> => record.entityType === "SourceBaseline" && lineageWorkflowIds.has(record.body.workflowId));
    const bindings = (await reader.listEntities(projectId, "SourceBinding"))
      .filter((record): record is ProjectStateRecord<"SourceBinding"> => record.entityType === "SourceBinding" && record.lifecycleState === "active" && record.body.workflowId === workflowId);
    if (!baselines.length && !bindings.length) return null;
    if (baselines.length !== 1 || bindings.length !== 1 || bindings[0].body.sourceBaselineId !== baselines[0]?.id || bindings[0].body.preparationState !== "ready" || !bindings[0].body.currentRevisionId || !bindings[0].body.workSourceLineId)
      fail("Exact Workflow source revision lineage is missing or ambiguous.");
    const checkpoints = (await reader.listEntities(projectId, "SourceCheckpoint"))
      .filter((record): record is ProjectStateRecord<"SourceCheckpoint"> => record.entityType === "SourceCheckpoint" && lineageWorkflowIds.has(record.body.workflowId));
    const byExpected = new Map<string, ProjectStateRecord<"SourceCheckpoint">>();
    const results = new Set<string>();
    for (const checkpoint of checkpoints) {
      if (checkpoint.body.checkpointState !== "committed" || checkpoint.body.sourceLineId !== bindings[0].body.workSourceLineId || !checkpoint.body.resultingRevisionId || byExpected.has(checkpoint.body.expectedRevisionId) || results.has(checkpoint.body.resultingRevisionId))
        fail("Workflow source checkpoint lineage contains an unresolved checkpoint, fork, or duplicate revision.");
      byExpected.set(checkpoint.body.expectedRevisionId, checkpoint);
      results.add(checkpoint.body.resultingRevisionId);
    }
    const revisions = [baselines[0].body.baseRevisionId];
    for (let index = 0; index < checkpoints.length; index++) {
      const next = byExpected.get(revisions.at(-1)!);
      if (!next || next.body.resultingRevisionId === revisions.at(-1)) fail("Workflow source checkpoint lineage contains a gap or cycle.");
      revisions.push(next.body.resultingRevisionId!);
    }
    if (revisions.at(-1) !== bindings[0].body.currentRevisionId) fail("Workflow source checkpoint lineage does not terminate at the current SourceBinding revision.");
    return revisions;
  }

  async function currentPhaseEvidenceTesterIds(projectId: ProjectId, workflowId: EntityId, phaseId: EntityId, currentSourceBaselineRef?: string, requireClosed = true) {
    const plan = await getWorkflowExecutionPlan(projectId, workflowId);
    const phase = plan.phases.find(candidate => candidate.phaseId === phaseId);
    if (!phase || requireClosed && !phase.workItemIds.every(id => [...plan.directWorkItems, ...Object.values(plan.workItemsByPhase).flat()].some(item => item.id === id && item.body.workState === "closed")))
      fail("Phase aggregate evidence requires the exact Phase after all members close.");
    const binding = (await store.listEntities(projectId, "SourceBinding")).filter((record): record is ProjectStateRecord<"SourceBinding"> => record.entityType === "SourceBinding" && record.lifecycleState === "active" && record.body.workflowId === workflowId);
    if (binding.length > 1 || binding.length === 1 && (binding[0].body.preparationState !== "ready" || binding[0].body.currentRevisionId !== currentSourceBaselineRef) || binding.length === 0 && currentSourceBaselineRef !== undefined)
      fail("Phase aggregate evidence source candidate is not current.");
    const revisionChain = binding.length ? await workflowSourceRevisionChain(projectId, workflowId) : null;
    const ids: EntityId[] = [];
    const items = [...plan.directWorkItems, ...Object.values(plan.workItemsByPhase).flat()];
    for (const workItemId of phase.workItemIds) {
      const attempts = await getImplementationAttempts(projectId, workItemId), implementation = attempts.at(-1);
      if (!implementation || implementation.body.outcome !== "implemented" || implementation.body.blockers.length) {
        if (requireClosed) fail("Phase aggregate evidence requires each latest successful member implementation.");
        continue;
      }
      const results = (await store.listEntities(projectId, "TesterResult")).filter((record): record is ProjectStateRecord<"TesterResult"> => record.entityType === "TesterResult" && record.body.workflowId === workflowId && record.body.workItemId === workItemId && record.body.implementationRecordId === implementation.id && ["not-required", "committed"].includes(record.body.checkpointState));
      if (results.length !== 1 || (binding.length ? results[0].body.sourceMode !== "source-backed" || !results[0].body.candidateRevisionId || !revisionChain?.includes(results[0].body.candidateRevisionId) : results[0].body.sourceMode !== "source-neutral" || results[0].body.candidateRevisionId !== undefined)) {
        if (requireClosed) fail("Phase aggregate evidence requires one exact current TesterResult per member on the canonical Workflow revision chain.");
        continue;
      }
      if (binding.length) {
        const tester = results[0];
        const checkpoints = await store.listEntities(projectId, "SourceCheckpoint"), links = await store.listRelationships(projectId, "checkpoints");
        if (tester.body.checkpointState === "committed") {
          const checkpoint = tester.body.sourceCheckpointId ? await store.getEntity(projectId, tester.body.sourceCheckpointId) : null;
          if (checkpoint?.entityType !== "SourceCheckpoint" || checkpoint.body.workflowId !== workflowId || checkpoint.body.resultingRevisionId !== tester.body.candidateRevisionId || !links.some(edge => edge.fromEntityId === checkpoint.id && edge.toEntityId === tester.id && !edge.endedAt)) fail("Committed Phase TesterResult must link its exact candidate checkpoint.");
        } else if (tester.body.candidateRevisionId !== tester.body.implementerRevisionId || !checkpoints.some(record => record.entityType === "SourceCheckpoint" && record.body.workflowId === workflowId && record.body.checkpointKind === "implementation" && record.body.resultingRevisionId === tester.body.candidateRevisionId && links.some(edge => edge.fromEntityId === record.id && edge.toEntityId === implementation.id && !edge.endedAt))) fail("Uncheckpointed Phase TesterResult must match its implementation checkpoint candidate.");
      }
      ids.push(results[0].id);
    }
    return ids.sort();
  }

  async function linkPhaseValidationEvidence(projectId: ProjectId, validationId: EntityId, workflowId: EntityId, phaseId: EntityId, testerResultIds: EntityId[], currentSourceBaselineRef?: string, context?: MutationContext) {
    exactInput({ validationId, workflowId, phaseId, testerResultIds, currentSourceBaselineRef }, ["validationId", "workflowId", "phaseId", "testerResultIds", "currentSourceBaselineRef"]);
    if (!Array.isArray(testerResultIds) || testerResultIds.some(id => typeof id !== "string") || new Set(testerResultIds).size !== testerResultIds.length) fail("Exact Phase TesterResult identities are required.");
    return store.transaction(projectId, async unit => {
      const validation = await requiredRecord(unit, projectId, validationId), target = await requiredRecord(unit, projectId, validation.entityType === "Validation" ? validation.body.targetEntityId : "");
      if (validation.entityType !== "Validation" || validation.body.validationType !== "phase-criterion" || target.entityType !== "Criterion" || validation.body.targetRecordVersion !== target.recordVersion)
        fail("Phase evidence provenance requires the exact current Phase Criterion Validation.");
      const plan = await getWorkflowExecutionPlan(projectId, workflowId);
      const phase = plan.phases.find(candidate => candidate.phaseId === phaseId);
      const index = plan.phases.findIndex(candidate => candidate.phaseId === phaseId);
      const criterion = plan.criteria.find(entry => entry.record.id === target.id);
      const consumed = criterion && (criterion.ownerId === phaseId || criterion.record.body.validationPolicy === "deferred_visual_phase" && (phase?.workItemIds.includes(criterion.ownerId) || index === plan.phases.length - 1 && plan.solutions.some(solution => solution.id === criterion.ownerId)));
      if (!phase || !consumed || !["deterministic", "semantic_ai", "visual_human"].includes(validation.body.validationMode ?? "") || criterion!.record.body.criticality !== "required") fail("Validation is not for a required Criterion consumed at this exact Phase boundary.");
      const expected = await currentPhaseEvidenceTesterIds(projectId, workflowId, phaseId, currentSourceBaselineRef);
      if (!expected.length || expected.length !== testerResultIds.length || expected.some((id, i) => id !== [...testerResultIds].sort()[i])) fail("Phase Validation evidence must bind the complete current member TesterResult set.");
      if ((validation.body.sourceBaselineRef ?? undefined) !== currentSourceBaselineRef) fail("Phase Validation source candidate does not match current evidence.");
      const existing = (await unit.listRelationships(projectId, "derived_from")).filter(edge => edge.fromEntityId === validation.id && !edge.endedAt);
      if (existing.length) fail("Phase Validation provenance is immutable once recorded.");
      for (const id of expected) await linkSemantic(unit, projectId, validation, await requiredRecord(unit, projectId, id), "derived_from", context);
      return validation;
    });
  }

  async function getValidationFreshness(projectId: ProjectId, validationId: EntityId, currentSourceBaselineRef?: string): Promise<ValidationFreshness> {
    const record = await requiredRecord(store, projectId, validationId);
    if (record.entityType !== "Validation") fail("Validation identity is required.");
    if (currentSourceBaselineRef !== undefined && (typeof currentSourceBaselineRef !== "string" || currentSourceBaselineRef.length === 0)) fail("Current source baseline reference is invalid.");
    const target = await store.getEntity(projectId, record.body.targetEntityId);
    const edges = (await store.listRelationships(projectId, "evaluates"))
      .filter(edge => edge.fromEntityId === validationId && edge.toEntityId === record.body.targetEntityId && !edge.endedAt);
    if (!target || edges.length !== 1) fail("Validation target binding is missing or inconsistent.");
    let staleReason: ValidationStaleReason | null = target.lifecycleState === "superseded" || target.lifecycleState === "voided"
      ? "target-superseded" : target.recordVersion !== record.body.targetRecordVersion
        ? "target-version-changed" : record.body.sourceBaselineRef !== currentSourceBaselineRef
          ? "source-baseline-changed" : null;
    if (!staleReason && record.body.validationType === "phase-criterion" && target.entityType === "Criterion") {
      try {
        const matches: Array<{ workflowId: EntityId; phaseId: EntityId }> = [];
        for (const workflow of (await store.listEntities(projectId, "Workflow")).filter((item): item is ProjectStateRecord<"Workflow"> => item.entityType === "Workflow" && item.lifecycleState === "active" && item.body.workflowState !== "closed" && item.body.workflowState !== "cancelled")) {
          const plan = await getWorkflowExecutionPlan(projectId, workflow.id), criterion = plan.criteria.find(entry => entry.record.id === target.id);
          if (!criterion) continue;
          for (let phaseIndex = 0; phaseIndex < plan.phases.length; phaseIndex++) {
            const phase = plan.phases[phaseIndex];
            if (criterion.ownerId === phase.phaseId || criterion.record.body.validationPolicy === "deferred_visual_phase" &&
              (phase.workItemIds.includes(criterion.ownerId) || phaseIndex === plan.phases.length - 1 && plan.solutions.some(solution => solution.id === criterion.ownerId))) matches.push({ workflowId: workflow.id, phaseId: phase.phaseId });
          }
        }
        if (matches.length !== 1) throw Error("Phase boundary is missing or ambiguous.");
        const current = await currentPhaseEvidenceTesterIds(projectId, matches[0].workflowId, matches[0].phaseId, currentSourceBaselineRef);
        const actual = (await store.listRelationships(projectId, "derived_from")).filter(edge => edge.fromEntityId === validationId && !edge.endedAt).map(edge => edge.toEntityId).sort();
        if (actual.length !== current.length || actual.some((id, i) => id !== current[i])) staleReason = "phase-evidence-changed";
      } catch { staleReason = "phase-evidence-changed"; }
    }
    return { validationId, targetEntityId: target.id, targetRecordVersion: record.body.targetRecordVersion,
      current: staleReason === null, staleReason };
  }

  async function getCriterionValidationStatus(projectId: ProjectId, criterionId: EntityId, currentSourceBaselineRef?: string, currentImplementationRecordId?: EntityId): Promise<CriterionValidationStatus> {
    const criterion = await requiredRecord(store, projectId, criterionId);
    if (criterion.entityType !== "Criterion") fail("Criterion identity is required.");
    const policy = criterion.body.validationPolicy;
    if (policy === "operator_decision") return { criterionId, policy, satisfied: false, validationId: null, reason: "operator-decision-required" };
    if (policy === "deferred_visual_phase") {
      const owners = (await store.listRelationships(projectId, "defines_criterion"))
        .filter(edge => edge.toEntityId === criterionId && !edge.endedAt);
      const entities = await Promise.all(owners.map(edge => store.getEntity(projectId, edge.fromEntityId)));
      let hasPhaseOwner = entities.some(entity => entity?.entityType === "Phase");
      if (!hasPhaseOwner) {
        for (const workflow of (await store.listEntities(projectId, "Workflow")).filter((record): record is ProjectStateRecord<"Workflow"> => record.entityType === "Workflow" && record.lifecycleState === "active")) {
          const plan = await getWorkflowExecutionPlan(projectId, workflow.id), entry = plan.criteria.find(candidate => candidate.record.id === criterionId);
          if (entry && plan.phases.some(phase => phase.workItemIds.includes(entry.ownerId))) { hasPhaseOwner = true; break; }
        }
      }
      let hasWorkflowPhaseBoundary = false;
      const solution = entities.find(entity => entity?.entityType === "BoundedSolution");
      if (solution?.entityType === "BoundedSolution") {
        for (const edge of (await store.listRelationships(projectId, "workflow_member")).filter(edge => edge.fromEntityId === solution.id && !edge.endedAt)) {
          const workflow = await store.getEntity(projectId, edge.toEntityId);
          if (workflow?.entityType === "Workflow" && (await getWorkflowExecutionPlan(projectId, workflow.id)).phases.length) { hasWorkflowPhaseBoundary = true; break; }
        }
      }
      if (!hasPhaseOwner && !hasWorkflowPhaseBoundary) return { criterionId, policy, satisfied: false, validationId: null, reason: "deferred-to-phase" };
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
      if ((await getValidationFreshness(projectId, validation.id, currentSourceBaselineRef)).current &&
        (currentImplementationRecordId === undefined || validation.body.implementationRecordId === currentImplementationRecordId)) fresh.push(validation);
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

  async function savePlanCandidate(projectId: ProjectId, input: PlanCandidate & { expectedRecordVersion?: number }, context?: MutationContext) {
    exactInput(input, ["workflowId", "workflowType", "solution", "solutionAddresses", "solutionCriteria", "phases", "workItems", "phaseDependencies", "boundaries", "sources", "expectedRecordVersion"]);
    const graph = resolvePlanTopology(input);
    return store.transaction(projectId, async unit => {
      const workflow = await requiredRecord(unit, projectId, input.workflowId);
      if (workflow.entityType !== "Workflow" || workflow.lifecycleState !== "active" || workflow.body.workflowState !== "active" || workflow.body.workflowType !== input.workflowType || input.workflowType === "work-intake-routing") fail("Plan candidate requires an exact active substantive Workflow.");
      const cycles = (await unit.listEntities(projectId, "PlanReviewCycle")).filter((record): record is ProjectStateRecord<"PlanReviewCycle"> => record.entityType === "PlanReviewCycle" && record.body.workflowId === workflow.id && record.lifecycleState === "active");
      if (cycles.length > 1) fail("Plan review identity is ambiguous.");
      const previous = cycles[0];
      if (previous ? input.expectedRecordVersion !== previous.recordVersion : input.expectedRecordVersion !== undefined) fail("Plan review revision is stale.");
      if (previous && exactVersionReviewDisposition(previous, await unit.listEntities(projectId, "Decision"), await unit.listRelationships(projectId), await unit.listOutbox(projectId), "plan-review", "plan-review").state === "approved") fail("An approved Plan cannot be revised behind acceptance.");
      if (!Array.isArray(input.sources) || input.sources.length > 128 || new Set(input.sources.map(source => source.entityId)).size !== input.sources.length) fail("Plan source references are invalid.");
      for (const source of input.sources) {
        const record = await requiredRecord(unit, projectId, source.entityId);
        if (record.lifecycleState !== "active" || record.recordVersion !== source.recordVersion) fail("Plan source revision is stale.");
        const relationships = await unit.listRelationships(projectId);
        if (record.id !== workflow.id && record.id !== projectId && !architectMemberOwnershipIsValid(workflow.id, [record], await unit.listEntities(projectId), relationships)) fail("Plan source belongs to another Workflow.");
        if (["SourceBaseline", "SourceBinding", "WorkflowIntake", "ArchitectReviewCycle", "PlanReviewCycle"].includes(record.entityType) && "workflowId" in record.body && record.body.workflowId !== workflow.id) fail("Plan source belongs to another Workflow.");
      }
      const sources = input.sources.some(source => source.entityId === workflow.id) ? input.sources : [...input.sources, { entityId: workflow.id, recordVersion: workflow.recordVersion }];
      const members: ProjectStateEntity[] = [];
      const create = async <T extends EntityType>(entityType: T, body: EntityBodyMap[T]) => {
        const record = createProjectStateEntity({ entityType, projectId, body, principal: trustedPrincipal });
        await unit.saveEntity(record as ProjectStateEntity, null); members.push(record as ProjectStateEntity);
        await recordMutation(unit, {projectId, entityId: record.id, fromVersion: null, toVersion: 1, operation: "create", eventType: PROJECT_STATE_EVENT_TYPES.create, occurredAt: record.createdAt, changedFields: Object.keys(body), defaultReason: "Save Plan candidate semantic member", context});
        return record;
      };
      const criteria = async (items: WorkflowPlanningGraph["solutionCriteria"]) => {
        if (!Array.isArray(items) || items.length > 64) fail("Plan Criterion bound exceeded.");
        return Promise.all(items.map(async item => (await create("Criterion", {...item, criterionState: "candidate"})).id));
      };
      const solution = await create("BoundedSolution", {...graph.solution, solutionState: "candidate"});
      const layout: PlanReviewLayout = { solutionId: solution.id, solutionAddresses: graph.solutionAddresses ?? [], solutionCriterionIds: await criteria(graph.solutionCriteria), phases: [], workItems: [], boundaries: structuredClone(input.boundaries ?? []), sources: structuredClone(sources) };
      for (const phase of [...(graph.phases ?? [])].sort((a, b) => a.sequence - b.sequence)) {
        const record = await create("Phase", {title: phase.title, objective: phase.objective, sequence: phase.sequence, phaseState: "planned"});
        layout.phases.push({key: phase.key, entityId: record.id, criterionIds: await criteria(phase.criteria ?? []), dependencyKeys: input.phaseDependencies?.find(item => item.phaseKey === phase.key)?.dependencyKeys ?? []});
      }
      for (const work of graph.workItems) {
        const record = await create("WorkItem", {title: work.title, objective: work.objective, workItemKind: work.kind, workState: "planned"});
        layout.workItems.push({key: work.key, entityId: record.id, ...(work.phaseKey ? {phaseKey: work.phaseKey} : {}), dependencyKeys: [...work.dependencyKeys], criterionIds: await criteria(work.criteria)});
      }
      const semanticDigest = await architectSemanticDigest(members);
      const now = new Date().toISOString();
      const body = {workflowId: workflow.id, workflowType: input.workflowType, layout, semanticDigest};
      const cycle = previous ? validateProjectStateEntity({...previous, body, recordVersion: previous.recordVersion + 1, updatedAt: now, updatedBy: trustedPrincipal}) as ProjectStateRecord<"PlanReviewCycle"> : createProjectStateEntity({entityType: "PlanReviewCycle", projectId, body, principal: trustedPrincipal});
      await unit.saveEntity(cycle, previous?.recordVersion ?? null);
      await recordMutation(unit, {projectId, entityId: cycle.id, fromVersion: previous?.recordVersion ?? null, toVersion: cycle.recordVersion, operation: previous ? "revise" : "create", eventType: previous ? PROJECT_STATE_EVENT_TYPES.revise : PROJECT_STATE_EVENT_TYPES.create, occurredAt: now, changedFields: Object.keys(body), defaultReason: "Save exact Plan review revision", context});
      if (!previous) await linkSemantic(unit, projectId, cycle, workflow, "plan_review_for", context);
      return cycle;
    });
  }

  async function planSnapshot(unit: ProjectStateUnitOfWork, projectId: ProjectId, cycleId: EntityId) {
    const cycle = await requiredRecord(unit, projectId, cycleId);
    if (cycle.entityType !== "PlanReviewCycle" || cycle.lifecycleState !== "active") fail("Current Plan review identity required.");
    const workflow = await requiredRecord(unit, projectId, cycle.body.workflowId);
    if (workflow.entityType !== "Workflow" || workflow.lifecycleState !== "active" || workflow.body.workflowType !== cycle.body.workflowType) fail("Plan Workflow identity changed.");
    const accepted = exactVersionReviewDisposition(cycle, await unit.listEntities(projectId, "Decision"), await unit.listRelationships(projectId), await unit.listOutbox(projectId), "plan-review", "plan-review").state === "approved";
    for (const source of cycle.body.layout.sources) { const record = await requiredRecord(unit, projectId, source.entityId); if (!accepted && (record.recordVersion !== source.recordVersion || record.lifecycleState !== "active")) fail("Plan source revision is stale."); }
    const members: ProjectStateEntity[] = [];
    const get = async <T extends EntityType>(id: EntityId, type: T) => { const record = accepted ? await unit.getEntityVersion(projectId, id, 1) : await requiredRecord(unit, projectId, id); if (!record || record.entityType !== type || record.lifecycleState !== "active") fail("Plan semantic member identity changed."); members.push(record); return record as ProjectStateRecord<T>; };
    const criteria = async (ids: EntityId[]) => Promise.all(ids.map(async id => { const {criterionState: _, ...body} = (await get(id, "Criterion")).body; return body; }));
    const layout = cycle.body.layout;
    const {solutionState: _, ...solution} = (await get(layout.solutionId, "BoundedSolution")).body;
    const solutionCriteria = await criteria(layout.solutionCriterionIds);
    const phases = [];
    for (const phase of layout.phases) { const record = await get(phase.entityId, "Phase"); phases.push({key: phase.key, title: record.body.title, objective: record.body.objective, sequence: record.body.sequence, criteria: await criteria(phase.criterionIds)}); }
    const workItems = [];
    for (const work of layout.workItems) { const record = await get(work.entityId, "WorkItem"); workItems.push({key: work.key, title: record.body.title, objective: record.body.objective, kind: record.body.workItemKind, ...(work.phaseKey ? {phaseKey: work.phaseKey} : {}), dependencyKeys: work.dependencyKeys, criteria: await criteria(work.criterionIds)}); }
    if (await architectSemanticDigest(members) !== cycle.body.semanticDigest) fail("Plan semantic revision is stale.");
    const graph = resolvePlanTopology({workflowId: cycle.body.workflowId, solution, solutionAddresses: layout.solutionAddresses, solutionCriteria, phases, workItems, boundaries: layout.boundaries, phaseDependencies: layout.phases.map(phase => ({phaseKey: phase.key, dependencyKeys: phase.dependencyKeys}))});
    return {cycle, graph, members};
  }

  async function getPlanReview(projectId: ProjectId, cycleId: EntityId) {
    return store.transaction(projectId, async unit => {
      const {cycle, graph} = await planSnapshot(unit, projectId, cycleId);
      const disposition = exactVersionReviewDisposition(cycle, await unit.listEntities(projectId, "Decision"), await unit.listRelationships(projectId), await unit.listOutbox(projectId), "plan-review", "plan-review");
      return {cycleId: cycle.id, recordVersion: cycle.recordVersion, workflowId: cycle.body.workflowId, workflowType: cycle.body.workflowType, graph, disposition, markdown: `<!-- Generated SQL Plan review ${cycle.id}@${cycle.recordVersion} -->\n# ${graph.solution.title}\n\nTopology: ${graph.topology}\n\n${JSON.stringify(graph, null, 2)}\n\nBoundary evidence:\n${JSON.stringify(cycle.body.layout.boundaries, null, 2)}`};
    });
  }

  async function recordPlanReview(projectId: ProjectId, cycleId: EntityId, input: ArchitectReviewDecisionInput, context?: MutationContext) {
    exactInput(input, ["expectedRecordVersion", "outcome", "notes"]);
    if (trustedPrincipal.principalType !== "human" || trustedPrincipal.role !== "Operator") fail("Plan review requires human Operator.");
    if (!Number.isSafeInteger(input.expectedRecordVersion) || !["approved", "revision_requested", "rejected"].includes(input.outcome) || input.notes !== undefined && (typeof input.notes !== "string" || input.notes.length > 4096) || input.outcome === "revision_requested" && !input.notes?.trim()) fail("Exact Plan revision, supported outcome and bounded revision notes required.");
    return store.transaction(projectId, async unit => {
      const {cycle, graph, members} = await planSnapshot(unit, projectId, cycleId);
      if (cycle.recordVersion !== input.expectedRecordVersion) fail("Plan review revision is stale.");
      if (exactVersionReviewDisposition(cycle, await unit.listEntities(projectId, "Decision"), await unit.listRelationships(projectId), await unit.listOutbox(projectId), "plan-review", "plan-review").state === "approved") fail("An accepted Plan cannot be redisposed.");
      if (input.outcome === "approved") await acceptPlanningGraphInUnit(unit, projectId, graph, context, [...members]);
      const now = new Date().toISOString();
      const decision = createProjectStateEntity({entityType: "Decision", projectId, principal: trustedPrincipal, body: decisionBody({decisionType: "plan-review", outcome: input.outcome, decisionScope: `plan-review:${cycle.id}@${cycle.recordVersion}`, rationale: input.notes ?? ""}, trustedPrincipal, now)});
      await unit.saveEntity(decision, null);
      await recordMutation(unit, {projectId, entityId: decision.id, fromVersion: null, toVersion: 1, operation: "create", eventType: PROJECT_STATE_EVENT_TYPES.create, occurredAt: now, changedFields: Object.keys(decision.body), defaultReason: "Operator disposition of exact Plan", context});
      await linkSemantic(unit, projectId, decision, cycle, "governs", context);
      return decision;
    });
  }

  async function acceptWorkflowPlanningGraph(projectId: ProjectId, graph: WorkflowPlanningGraph, context?: MutationContext): Promise<WorkflowExecutionPlanView> {
    exactInput(graph, ["workflowId", "topology", "solutionAddresses", "solution", "solutionCriteria", "phases", "workItems"]);
    await store.transaction(projectId, unit => acceptPlanningGraphInUnit(unit, projectId, graph, context));
    return getWorkflowExecutionPlan(projectId, graph.workflowId);
  }

  async function acceptPlanningGraphInUnit(unit: ProjectStateUnitOfWork, projectId: ProjectId, graph: WorkflowPlanningGraph, context?: MutationContext, candidateRecords?: ProjectStateEntity[]) {
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
      const sourceEdges = (await unit.listRelationships(projectId, "baselines_source")).filter(edge => edge.toEntityId === workflow.id && !edge.endedAt);
      if (sourceEdges.length > 1) fail("Current Workflow SourceBaseline identity is ambiguous.");
      const sourceBaseline = sourceEdges.length === 1 ? await unit.getEntity(projectId, sourceEdges[0].fromEntityId) : null;
      if (sourceEdges.length === 1 && (sourceBaseline?.entityType !== "SourceBaseline" || sourceBaseline.body.workflowId !== workflow.id)) fail("Current Workflow SourceBaseline identity is invalid.");
      if (!sourceBaseline && criteria.some(criterion => criterion.criticality === "required" && criterion.validationPolicy === "deterministic"))
        fail("Required deterministic ValidationCatalog proof is unavailable for this source-neutral Workflow; select semantic AI, human visual, or Operator decision as appropriate.");
      if (graph.topology === "direct" && criteria.some(criterion => criterion.validationPolicy === "deferred_visual_phase"))
        fail("deferred_visual_phase Criteria require a real Phase boundary and cannot be accepted in a direct Workflow.");
      const kindsByWorkflow: Record<WorkflowType, readonly string[]> = { "feature-capability": ["feature", "fix", "maintenance"], "issue-resolution": ["fix", "repair"], "refactor-migration": ["migration", "maintenance"], "integration-composition": ["feature", "fix", "maintenance"], "infrastructure-platform": ["feature", "fix", "maintenance"], "research-prototype": ["feature", "maintenance"], "project-creation": [], "work-intake-routing": [] };
      if (graph.workItems.some(item => !kindsByWorkflow[workflow.body.workflowType].includes(item.kind))) fail("Unsupported Work Item kind for this Workflow family.");
      const now = new Date().toISOString();
      const create = async <T extends EntityType>(entityType: T, body: EntityBodyMap[T]) => { const existing = entityType === "Decision" ? undefined : candidateRecords?.shift(); if (existing && existing.entityType !== entityType) fail("Plan candidate materialization order is invalid."); const record = existing ? validateProjectStateEntity({ ...existing, body, recordVersion: existing.recordVersion + 1, updatedAt: now, updatedBy: trustedPrincipal }) : createProjectStateEntity({ entityType, projectId, body, principal: trustedPrincipal }); await unit.saveEntity(record as ProjectStateEntity, existing?.recordVersion ?? null); await recordMutation(unit, { projectId, entityId: record.id, fromVersion: existing?.recordVersion ?? null, toVersion: record.recordVersion, operation: existing ? "revise" : "create", eventType: existing ? PROJECT_STATE_EVENT_TYPES.revise : PROJECT_STATE_EVENT_TYPES.create, occurredAt: now, changedFields: Object.keys(record.body), defaultReason: `Accept Workflow planning ${entityType}`, context }); return record as ProjectStateRecord<T>; };
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
    const exactWorkflow = await getExactWorkflowOwnerForWorkItem(projectId, workItemId);
    let currentTesterResultId: EntityId | null = null;
    if (exactWorkflow && latestAttempt?.body.outcome === "implemented") {
      const testerResults = (await store.listEntities(projectId, "TesterResult"))
        .filter((record): record is ProjectStateRecord<"TesterResult"> => record.entityType === "TesterResult" &&
          record.body.workflowId === exactWorkflow.id && record.body.workItemId === workItemId && record.body.implementationRecordId === latestAttempt.id);
      if (testerResults.length !== 1 || !["not-required", "committed"].includes(testerResults[0].body.checkpointState)) blockers.push("tester-result-missing-or-stale");
      else {
        currentTesterResultId = testerResults[0].id;
        if (testerResults[0].body.sourceMode === "source-backed" && testerResults[0].body.candidateRevisionId !== currentSourceBaselineRef) blockers.push("tester-candidate-not-current");
        else if (testerResults[0].body.sourceMode === "source-neutral" && currentSourceBaselineRef !== undefined) blockers.push("tester-source-mode-mismatch");
        if (testerResults[0].body.recommendation === "production-defect-suspected") blockers.push("tester-production-defect-requires-repair");
      }
    }
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
        const solutionOwned = solutionIds.some(solutionId => edges.some(edge => edge.relationshipType === "defines_criterion" && edge.fromEntityId === solutionId && edge.toEntityId === id));
        let evidenceIds = currentTesterResultId ? [currentTesterResultId] : [];
        if (solutionOwned && exactWorkflow) {
          const plan = await getWorkflowExecutionPlan(projectId, exactWorkflow.id);
          evidenceIds = [];
          const revisionChain = currentSourceBaselineRef === undefined ? null : await workflowSourceRevisionChain(projectId, exactWorkflow.id);
          for (const member of [...plan.directWorkItems, ...Object.values(plan.workItemsByPhase).flat()]) {
            const attempts = await getImplementationAttempts(projectId, member.id), current = attempts.at(-1);
            if (!current || current.body.outcome !== "implemented") continue;
            const results = (await store.listEntities(projectId, "TesterResult")).filter((record): record is ProjectStateRecord<"TesterResult"> => record.entityType === "TesterResult" && record.body.workflowId === exactWorkflow.id && record.body.workItemId === member.id && record.body.implementationRecordId === current.id && ["not-required", "committed"].includes(record.body.checkpointState) && (currentSourceBaselineRef === undefined ? record.body.sourceMode === "source-neutral" && record.body.candidateRevisionId === undefined : record.body.sourceMode === "source-backed" && Boolean(record.body.candidateRevisionId && revisionChain?.includes(record.body.candidateRevisionId))));
            if (results.length === 1) evidenceIds.push(results[0].id);
          }
        }
        const status = await getCriterionOperatorDecisionStatus(projectId, id, evidenceIds);
        if (!status.current || !["approved", "accepted"].includes(status.state)) blockers.push(`operator-decision:${id}`);
      } else {
        const proof = await getCriterionValidationStatus(projectId, id, currentSourceBaselineRef, exactWorkflow ? latestAttempt?.id : undefined);
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

  async function getExactWorkflowOwnerForWorkItem(projectId: ProjectId, workItemId: EntityId): Promise<ProjectStateRecord<"Workflow"> | null> {
    const workflows = (await store.listEntities(projectId, "Workflow"))
      .filter((record): record is ProjectStateRecord<"Workflow"> => record.entityType === "Workflow" && record.lifecycleState === "active" &&
        record.body.workflowState !== "closed" && record.body.workflowState !== "cancelled" && ["feature-capability", "issue-resolution"].includes(record.body.workflowType));
    const memberships = (await store.listRelationships(projectId, "part_of")).filter(edge => !edge.endedAt);
    const owners: ProjectStateRecord<"Workflow">[] = [];
    for (const workflow of workflows) {
      const plan = await getWorkflowExecutionPlan(projectId, workflow.id);
      if (plan.solutions.length !== 1) continue;
      if (![...plan.directWorkItems, ...Object.values(plan.workItemsByPhase).flat()].some(item => item.id === workItemId)) continue;
      let cursor: EntityId | undefined = workItemId;
      const visited = new Set<EntityId>();
      while (cursor && cursor !== workflow.id && !visited.has(cursor)) {
        visited.add(cursor);
        const parents = memberships.filter(edge => edge.fromEntityId === cursor);
        cursor = parents.length === 1 ? parents[0].toEntityId : undefined;
      }
      if (cursor === workflow.id) owners.push(workflow);
    }
    if (owners.length > 1) fail("WorkItem has ambiguous exact Workflow ownership.");
    return owners[0] ?? null;
  }

  async function getPhaseCompletionEligibility(projectId: ProjectId, phaseId: EntityId, currentSourceBaselineRef?: string): Promise<CompletionEligibility> {
    const phase = await requiredRecord(store, projectId, phaseId);
    if (phase.entityType !== "Phase") fail("Phase identity is required.");
    const blockers: string[] = [];
    if (["superseded", "voided"].includes(phase.lifecycleState) || phase.body.phaseState === "cancelled") blockers.push("phase-terminal");
    const memberships = (await store.listRelationships(projectId, "part_of")).filter(edge => !edge.endedAt);
    const phaseParents = memberships.filter(edge => edge.fromEntityId === phaseId);
    let membership: { phaseId: EntityId; workItemIds: EntityId[]; criterionIds: EntityId[] } | undefined;
    let workflowPlan: WorkflowExecutionPlanView | null = null;
    if (phaseParents.length === 1) {
      const workflow = await requiredRecord(store, projectId, phaseParents[0].toEntityId);
      if (workflow.entityType === "Workflow" && ["feature-capability", "issue-resolution"].includes(workflow.body.workflowType)) {
        workflowPlan = await getWorkflowExecutionPlan(projectId, workflow.id);
        membership = workflowPlan.phases.find(item => item.phaseId === phaseId);
        if (!membership) fail("Phase is not part of the exact owning Workflow plan.");
      }
    }
    // Retain the generic legacy Project State query for non-Workflow records. Current
    // Feature/Issue application calls always bind the phase to an exact Workflow above.
    if (!membership) membership = (await getExecutionPlan(projectId)).phases.find(item => item.phaseId === phaseId);
    const phaseIndex = workflowPlan?.phases.findIndex(item => item.phaseId === phaseId) ?? -1;
    const deferredCriterionIds = workflowPlan?.criteria.filter(entry => entry.record.lifecycleState === "active" &&
      entry.record.body.criticality === "required" && entry.record.body.validationPolicy === "deferred_visual_phase" &&
      ((membership?.workItemIds ?? []).includes(entry.ownerId) || phaseIndex === workflowPlan!.phases.length - 1 && workflowPlan!.solutions.some(solution => solution.id === entry.ownerId)))
      .map(entry => entry.record.id) ?? [];
    for (const id of membership?.workItemIds ?? []) {
      const workItem = await requiredRecord(store, projectId, id);
      if (workItem.entityType !== "WorkItem" || workItem.body.workState !== "closed") blockers.push(`open-work-item:${id}`);
    }
    const currentPhaseTesterIds = workflowPlan && membership
      ? await currentPhaseEvidenceTesterIds(projectId, workflowPlan.workflow.id, phaseId, currentSourceBaselineRef, false) : [];
    for (const id of new Set([...(membership?.criterionIds ?? []), ...deferredCriterionIds])) {
      const criterion = await requiredRecord(store, projectId, id);
      if (criterion.entityType !== "Criterion" || criterion.lifecycleState !== "active" || criterion.body.criticality !== "required") continue;
      if (criterion.body.validationPolicy === "operator_decision") {
        const status = await getCriterionOperatorDecisionStatus(projectId, id, currentPhaseTesterIds);
        if (!status.current || !["approved", "accepted"].includes(status.state)) blockers.push(`operator-decision:${id}`);
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
      if (["repair", "fix"].includes(current.body.workItemKind)) {
        const relationships = (await unit.listRelationships(projectId, "repairs")).filter(edge => !edge.endedAt);
        for (const edge of relationships.filter(candidate => candidate.fromEntityId === workItemId)) {
          const parent = await requiredRecord(unit, projectId, edge.toEntityId);
          if (parent.entityType !== "WorkItem" || parent.lifecycleState !== "active" || parent.body.workState !== "validation_pending") continue;
          const openRepairs = relationships.filter(candidate => candidate.toEntityId === parent.id && candidate.fromEntityId !== workItemId);
          let anotherOpenRepair = false;
          for (const repairEdge of openRepairs) {
            const repair = await requiredRecord(unit, projectId, repairEdge.fromEntityId);
            if (repair.entityType === "WorkItem" && repair.lifecycleState === "active" && repair.body.workState !== "closed") { anotherOpenRepair = true; break; }
          }
          if (anotherOpenRepair) continue;
          const resumed = validateProjectStateEntity({ ...parent, recordVersion: parent.recordVersion + 1, updatedAt: now, updatedBy: trustedPrincipal,
            body: { ...parent.body, workState: "ready" } });
          await unit.saveEntity(resumed, parent.recordVersion);
          await recordMutation(unit, { projectId, entityId: parent.id, fromVersion: parent.recordVersion, toVersion: resumed.recordVersion,
            operation: "revise", eventType: PROJECT_STATE_EVENT_TYPES.revise, occurredAt: now, changedFields: ["workState"],
            defaultReason: "Resume parent WorkItem after its final Repair closed", context });
        }
      }
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

  async function getCriterionOperatorDecisionStatus(projectId: ProjectId, criterionId: EntityId, currentTesterResultIds: EntityId[]) {
    const criterion = await requiredRecord(store, projectId, criterionId);
    if (criterion.entityType !== "Criterion" || criterion.body.validationPolicy !== "operator_decision")
      return { state: "none" as DispositionState, decisionId: null, current: false, reason: "criterion-policy-mismatch" };
    const disposition = await getEffectiveDisposition(projectId, criterionId);
    if (!disposition.decisionId) return { state: disposition.state, decisionId: null, current: false, reason: "criterion-decision-required" };
    const decision = await requiredRecord(store, projectId, disposition.decisionId);
    const governedByCriterion = (await store.listRelationships(projectId, "governs")).some(edge => edge.fromEntityId === disposition.decisionId && edge.toEntityId === criterionId && !edge.endedAt);
    const actual = (await store.listRelationships(projectId, "derived_from"))
      .filter(edge => edge.fromEntityId === decision.id && !edge.endedAt).map(edge => edge.toEntityId).sort();
    const expected = [...currentTesterResultIds].sort();
    const current = governedByCriterion && decision.entityType === "Decision" && decision.body.decisionType === "criterion-operator-decision" && expected.length > 0 &&
      actual.length === expected.length && actual.every((id, index) => id === expected[index]);
    return { state: current ? disposition.state : "none" as DispositionState, decisionId: current ? decision.id : null, current,
      reason: current ? null : "criterion-decision-evidence-stale" };
  }

  async function getRequiredOperatorDecisions(projectId: ProjectId): Promise<RequiredOperatorDecision[]> {
    const criteria = (await store.listEntities(projectId, "Criterion"))
      .filter((record): record is ProjectStateRecord<"Criterion"> => record.entityType === "Criterion")
      .filter(record => record.lifecycleState === "active" && record.body.validationPolicy === "operator_decision");
    const pending: RequiredOperatorDecision[] = [];
    for (const criterion of criteria) {
      const disposition = await getEffectiveDisposition(projectId, criterion.id);
      const decision = disposition.decisionId ? await requiredRecord(store, projectId, disposition.decisionId) : null;
      if (!decision || decision.entityType !== "Decision" || decision.body.decisionType !== "criterion-operator-decision" ||
        ["none", "advisory", "proposed", "revoked"].includes(disposition.state)) {
        pending.push({ criterionId: criterion.id, targetId: criterion.id, currentDisposition: disposition.state });
      }
    }
    return pending.sort((a, b) => a.targetId.localeCompare(b.targetId) || a.criterionId.localeCompare(b.criterionId));
  }

  return { savePlanCandidate, getPlanReview, recordPlanReview, prepareArchitectWorkspace, adoptLegacyArchitectReview, saveArchitectCandidate, saveGreenfieldArchitectOutput, getArchitectReviewProjection, saveArchitectReviewCycle, getCurrentArchitectReviewCycle, getArchitectReviewDisposition, recordArchitectReview, saveWorkflowIntake, recordWorkflowIntakeDecision, getWorkflowIntakeDisposition, createRecord, createWorkflow, createSubstantiveWorkflow, createSubstantiveWorkflowInUnitOfWork, createProjectCreationWorkflow, createWorkIntake, reviseWorkIntake, advanceWorkIntake, recordRouteAssessment, recordRouteDecision, recordWorkIntakeRouteRevisionRequest, completeWorkIntakeRouteHandoff,
    createWorkflowSourceBaseline, createWorkflowSourceBinding, updateSourceBinding, createSourceCheckpoint, advanceSourceCheckpoint, completeTesterResultCheckpoint, createIntegrationRecord, advanceIntegrationRecord, completeWorkflowExecution, closeIntegratedWorkflow,
    createRegressionObligation, setRegressionObligationState, recordTestLifecycleAssessment, createTesterResult, createWorkflowRepair, createPhaseRepair, recordImplementationProof, recordPermanentTestReference, linkPermanentTestReference,
    reviseRecord, supersedeRecord, createRelationship, linkWorkflowRouteTarget, endRelationship, recordDecision, recordCriterionOperatorDecision, supersedeDecision, recordValidation, recordEvidence, recordImplementation, beginWorkItemAttempt, finishWorkItemAttempt, decomposeWorkItem, completeWorkItem, completePhase,
    getRecord, queryRecords, queryRecordsPage, getCurrentProjectStateView, renderView, exportStructuredProjectState, getAuthoritativeContext, getCommittedEventFeed, getCurrentRecord, getRecordHistory, getRelationships, getLineage, getProjectStateSummary, getEvidence,
    getEffectiveDisposition, getCriterionOperatorDecisionStatus, getRequiredOperatorDecisions, getValidationFreshness, getCriterionValidationStatus, linkPhaseValidationEvidence,
    getImplementationAttempts, getExecutionPlan, getWorkflowExecutionPlan, getWorkflowSourceRevisionChain: (projectId: ProjectId, workflowId: EntityId) => workflowSourceRevisionChain(projectId, workflowId), acceptWorkflowPlanningGraph, acceptFeatureAssessment, acceptIssueRca, getWorkItemCompletionEligibility, getPhaseCompletionEligibility,
    getWorkRouteHistory, getCurrentWorkRoute, getWorkIntakeSummary, getSourceSemanticView, getRegressionObligationView };
}
