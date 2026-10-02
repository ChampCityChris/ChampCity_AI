import { ARCHITECT_STAGE_BY_WORKFLOW } from "./architectReviewContracts";
import { ARCHITECT_STAGE_KINDS, PROJECT_STATE_SCHEMA_VERSION, type EntityBodyMap, type EntityType, type PrincipalRef, type ProjectId, type ProjectStateEntity, type ProjectStateRecord, type Provenance, type RecordEnvelope } from "./domainContracts";
import { WORKFLOW_TYPE_IDS } from "./workflowTypeRegistry";

type FieldKind = "text" | "source-ref" | "id" | "instant" | "number" | "boolean" | "version" | "text-list" | "id-list" | "principal" | "digest" | "scalar-map" | "plan-layout" | "review-layout";
type FieldRule = FieldKind | readonly string[];
interface EntityDefinition { schemaVersion: typeof PROJECT_STATE_SCHEMA_VERSION; required: Readonly<Record<string, FieldRule>>; optional?: Readonly<Record<string, FieldRule>>; immutableAfterCreation: boolean }

const text = "text" as const;
const id = "id" as const;
const instant = "instant" as const;
const textList = "text-list" as const;
const idList = "id-list" as const;

/** One reviewed type registry owns field vocabulary and immutable-record policy. */
export const ENTITY_TYPE_REGISTRY: Readonly<Record<EntityType, EntityDefinition>> = Object.freeze({
  ResearchOutcome: {schemaVersion: 1, required: {workflowId: id, outcome: ["no-implementation-plan-required", "research-plan-required"], prototypeDisposition: ["disposable", "candidate-for-later-work"], productionFollowUp: ["none", "new-work-intake-required"], evidence: textList, decisionEnabled: text, successFailureResult: text, closureCondition: text}, immutableAfterCreation: false},
  PhaseReviewCycle: {schemaVersion: 1, required: {workflowId: id, phaseId: id, stageKind: ["interview", "planning"], semanticDigest: "digest", layout: "review-layout"}, immutableAfterCreation: false},
  PhaseMapReviewCycle: {schemaVersion: 1, required: {workflowId: id, semanticDigest: "digest", layout: "review-layout"}, immutableAfterCreation: false},
  ProjectPlanningReviewCycle: {schemaVersion: 1, required: {workflowId: id, semanticDigest: "digest", layout: "review-layout"}, immutableAfterCreation: false},
  PlanReviewCycle: { schemaVersion: 1, required: { workflowId: id, workflowType: WORKFLOW_TYPE_IDS, semanticDigest: "digest", layout: "plan-layout" }, immutableAfterCreation: false },
  Project: { schemaVersion: 1, required: { name: text, description: text }, immutableAfterCreation: false },
  ArchitectReviewCycle: { schemaVersion: 1, required: { workflowId: id, workflowType: WORKFLOW_TYPE_IDS, stageKind: ARCHITECT_STAGE_KINDS, semanticDigest: "digest" }, immutableAfterCreation: false },
  WorkflowIntake: { schemaVersion: 1, required: { workflowId: id, workflowType: WORKFLOW_TYPE_IDS, values: "scalar-map" }, immutableAfterCreation: false },
  ProjectResource: { schemaVersion: 1, required: { resourceType: text, provider: text, logicalName: text, locator: text, role: text }, optional: { sourceRevisionId: "source-ref" }, immutableAfterCreation: false },
  WorkIntake: { schemaVersion: 1, required: { request: text, desiredOutcome: text, constraints: textList, evidenceContext: textList, intakeState: ["captured", "assessing", "routed", "active", "closed", "cancelled"], requestedIntegrationTarget: text }, optional: { hasExistingSourceOrPlanning: "boolean" }, immutableAfterCreation: false },
  RouteAssessment: { schemaVersion: 1, required: { workIntakeId: id, recommendation: ["greenfield", "feature-change", "refactor-migration", "integration-composition", "infrastructure-platform", "research-prototype", "issue-resolution"], traits: textList, rationale: text, evidenceIds: idList }, optional: { alternate: ["greenfield", "feature-change", "refactor-migration", "integration-composition", "infrastructure-platform", "research-prototype", "issue-resolution"] }, immutableAfterCreation: true },
  Workflow: { schemaVersion: 1, required: { workflowType: WORKFLOW_TYPE_IDS, title: text, currentWorkspace: text, workflowState: ["planned", "active", "blocked", "closed", "cancelled"] }, immutableAfterCreation: false },
  SourceBaseline: { schemaVersion: 1, required: { workflowId: id, repositoryId: "source-ref", integrationTargetSourceLineId: "source-ref", baseRevisionId: "source-ref" }, immutableAfterCreation: true },
  Phase: { schemaVersion: 1, required: { title: text, objective: text, phaseState: ["planned", "active", "blocked", "closed", "cancelled"], sequence: "version" }, optional: {phaseKey: text, sourceReferences: textList}, immutableAfterCreation: false },
  Finding: { schemaVersion: 1, required: { title: text, statement: text, category: text, impact: text, observedAt: instant, findingState: text }, optional: { confidence: "number" }, immutableAfterCreation: false },
  RootCause: { schemaVersion: 1, required: { title: text, statement: text, rationale: text, rootCauseState: text }, optional: { confidence: "number" }, immutableAfterCreation: false },
  BoundedSolution: { schemaVersion: 1, required: { title: text, objective: text, scopeIn: textList, scopeOut: textList, constraints: textList, assumptions: textList, risks: textList, solutionState: text }, immutableAfterCreation: false },
  Criterion: { schemaVersion: 1, required: { statement: text, criticality: ["required", "optional", "informational"], verificationIntent: text, validationPolicy: ["deterministic", "semantic_ai", "visual_human", "deferred_visual_phase", "operator_decision"], criterionState: text }, immutableAfterCreation: false },
  WorkItem: { schemaVersion: 1, required: { workItemKind: ["feature", "fix", "repair", "migration", "maintenance"], title: text, objective: text, workState: ["planned", "ready", "in_progress", "implemented", "blocked", "validation_pending", "closed", "cancelled"] }, optional: { implementationBoundaries: textList, affectedPaths: textList, proofIntent: textList, candidateKey: text, planningOrder: "version", planningResolution: ["planned", "deferred", "superseded", "alreadySatisfied", "carriedForward"], resolutionReason: text, planningEvidence: textList, carriedForwardToPhaseId: text, planningPreparedAt: instant, contractRevision: "version", contractReviewRequired: "boolean", contractCriterionIds: idList, startedAt: instant, implementedAt: instant }, immutableAfterCreation: false },
  ImplementationRecord: { schemaVersion: 1, required: { workItemId: id, summary: text, deviations: textList, blockers: textList, residualRisks: textList, outcome: ["implemented", "partial", "blocked", "failed", "abandoned"] }, optional: { executionRef: text }, immutableAfterCreation: true },
  TesterResult: { schemaVersion: 1, required: { workflowId: id, workItemId: id, implementationRecordId: id, sourceMode: ["source-backed", "source-neutral"], recommendation: ["reuse-existing-proof", "permanent-proof-change-warranted", "lifecycle-review-candidate", "no-permanent-test-required", "production-defect-suspected"], affectedCapabilityIds: textList, permanentTestPaths: textList, determinationEvidence: textList, unknowns: textList, rationale: text, checkpointState: ["not-required", "pending", "committed", "blocked"] }, optional: { implementerRevisionId: "source-ref", candidateRevisionId: "source-ref", sourceCheckpointId: id }, immutableAfterCreation: false },
  Validation: { schemaVersion: 1, required: { validationType: text, method: text, validationMode: ["deterministic", "semantic_ai", "visual_human"], outcome: ["pass", "fail", "blocked", "inconclusive"], targetEntityId: id, targetRecordVersion: "version", performedBy: "principal", performedAt: instant, summary: text }, optional: { sourceBaselineRef: text, implementationRecordId: id, assessmentStatus: ["PRESERVE", "REWRITE_CANDIDATE", "SPLIT_CANDIDATE", "CONSOLIDATE_CANDIDATE", "MIGRATE_CANDIDATE", "RETIRE_CANDIDATE", "QUARANTINE_CANDIDATE", "NEEDS_TESTER_REVIEW"] }, immutableAfterCreation: true },
  Evidence: { schemaVersion: 1, required: { evidenceType: text, description: text, capturedAt: instant, capturedBy: "principal", mediaType: text, payloadRef: text, digest: "digest" }, optional: { size: "number", sourceBaselineRef: "source-ref" }, immutableAfterCreation: true },
  Decision: { schemaVersion: 1, required: { decisionType: text, outcome: text, rationale: text, decisionRole: text, decisionScope: text, decidedBy: "principal", decidedAt: instant, effectiveAt: instant }, immutableAfterCreation: true },
  RegressionObligation: { schemaVersion: 1, required: { title: text, statement: text, capabilityId: text, riskCategory: text, obligationState: ["active", "quarantined", "retired"] }, optional: { sourceWorkItemId: id }, immutableAfterCreation: false },
  SourceBinding: { schemaVersion: 1, required: { workflowId: id, sourceBaselineId: id, preparationState: ["unprepared", "preparing", "ready", "blocked"] }, optional: { workSourceLineId: "source-ref", currentRevisionId: "source-ref", repositoryCheckoutId: "source-ref", failureCode: text }, immutableAfterCreation: false },
  SourceCheckpoint: { schemaVersion: 1, required: { boundaryId: "source-ref", workflowId: id, sourceLineId: "source-ref", expectedRevisionId: "source-ref", checkpointKind: ["implementation", "disposition", "tester"], checkpointState: ["not-required", "pending", "committed", "blocked", "inspection-required"] }, optional: { resultingRevisionId: "source-ref", receiptDigest: "digest" }, immutableAfterCreation: false },
  IntegrationRecord: { schemaVersion: 1, required: { workflowId: id, incomingRevisionId: "source-ref", targetSourceLineId: "source-ref", targetBeforeRevisionId: "source-ref", integrationState: ["prepared", "validating", "repairing", "ready", "integrated", "blocked", "failed"], outcome: ["pending", "integrated", "blocked", "failed"], validationIds: idList, repairWorkItemIds: idList }, optional: { candidateRevisionId: "source-ref", targetAfterRevisionId: "source-ref", resultRevisionId: "source-ref" }, immutableAfterCreation: false },
});

export class ProjectStateDomainError extends Error {
  readonly code: string = "INVALID_PROJECT_STATE";
  constructor(message: string) { super(message); this.name = "ProjectStateDomainError"; }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_TEXT = 4096;
const MAX_LIST = 128;
const MAX_RECORD_BYTES = 65_536;
const encoder = new TextEncoder();
const envelopeKeys = new Set(["id", "projectId", "entityType", "lineageId", "recordVersion", "schemaVersion", "lifecycleState", "dispositionState", "createdAt", "createdBy", "updatedAt", "updatedBy", "closedAt", "supersededAt", "provenance", "body"]);
const requiredEnvelopeKeys = ["id", "projectId", "entityType", "lineageId", "recordVersion", "schemaVersion", "lifecycleState", "createdAt", "createdBy", "updatedAt", "updatedBy", "provenance", "body"];

function fail(message: string): never { throw new ProjectStateDomainError(message); }
function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) fail(`${label} must be an ordinary object.`);
  return value as Record<string, unknown>;
}
function exactFields(value: Record<string, unknown>, required: readonly string[], allowed: ReadonlySet<string>, label: string) {
  for (const field of required) if (!Object.hasOwn(value, field)) fail(`${label}.${field} is required.`);
  for (const field of Object.keys(value)) if (!allowed.has(field)) fail(`${label}.${field} is unsupported.`);
}
function boundedText(value: unknown, label: string) {
  if (typeof value !== "string" || value.length === 0 || encoder.encode(value).length > MAX_TEXT || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) fail(`${label} must be bounded text.`);
}
function canonicalId(value: unknown, label: string) { if (typeof value !== "string" || !UUID.test(value)) fail(`${label} must be an opaque canonical ID.`); }
function canonicalInstant(value: unknown, label: string) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) fail(`${label} must be a canonical UTC instant.`);
}
function principal(value: unknown, label: string) {
  const ref = object(value, label);
  exactFields(ref, ["principalId", "principalType", "role"], new Set(["principalId", "principalType", "role"]), label);
  boundedText(ref.principalId, `${label}.principalId`);
  boundedText(ref.role, `${label}.role`);
  if (!["human", "agent", "system", "tool"].includes(ref.principalType as string)) fail(`${label}.principalType is unsupported.`);
}
function checkField(value: unknown, rule: FieldRule, label: string) {
  if (Array.isArray(rule)) { if (!rule.includes(value as string)) fail(`${label} is unsupported.`); return; }
  switch (rule) {
    case "review-layout": {
      const layout = object(value, label);
      exactFields(layout, ["memberIds", "sources"], new Set(["memberIds", "sources"]), label);
      checkField(layout.memberIds, "id-list", label);
      if (!Array.isArray(layout.sources) || layout.sources.length > 128) fail("Review sources exceed bounds.");
      for (const source of layout.sources) {const item = object(source, label); exactFields(item, ["entityId", "recordVersion"], new Set(["entityId", "recordVersion"]), label); canonicalId(item.entityId, label); checkField(item.recordVersion, "version", label);}
      return;
    }
    case "plan-layout": {
      const layout = object(value, label);
      exactFields(layout, ["solutionId", "solutionAddresses", "solutionCriterionIds", "phases", "workItems", "boundaries", "sources"], new Set(["solutionId", "solutionAddresses", "solutionCriterionIds", "phases", "workItems", "boundaries", "sources"]), label);
      canonicalId(layout.solutionId, label);
      checkField(layout.solutionAddresses, "id-list", label);
      checkField(layout.solutionCriterionIds, "id-list", label);
      for (const [field, bound] of [["phases", 32], ["workItems", 128], ["boundaries", 31], ["sources", 128]] as const) {
        const items = layout[field];
        if (!Array.isArray(items) || items.length > bound) fail(`${label}.${field} exceeds bounds.`);
        for (const entry of items) {
          const item = object(entry, label);
          if (field === "sources") { exactFields(item, ["entityId", "recordVersion"], new Set(["entityId", "recordVersion"]), label); canonicalId(item.entityId, label); checkField(item.recordVersion, "version", label); }
          else if (field === "boundaries") { exactFields(item, ["phaseKey", "reason", "rationale", "evidenceRefs"], new Set(["phaseKey", "reason", "rationale", "evidenceRefs"]), label); for (const name of ["phaseKey", "reason", "rationale"]) boundedText(item[name], label); checkField(item.evidenceRefs, "text-list", label); }
          else { exactFields(item, ["key", "entityId", "criterionIds", "dependencyKeys"], new Set(["key", "entityId", "criterionIds", "dependencyKeys", ...(field === "workItems" ? ["phaseKey"] : [])]), label); canonicalId(item.entityId, label); boundedText(item.key, label); if (item.phaseKey !== undefined) boundedText(item.phaseKey, label); checkField(item.criterionIds, "id-list", label); checkField(item.dependencyKeys, "text-list", label); }
        }
      }
      return;
    }
    case "scalar-map": {
      const map = object(value, label);
      if (Reflect.ownKeys(map).length > 32 || Object.getOwnPropertySymbols(map).length) fail(`${label} exceeds its map bound.`);
      for (const [key, item] of Object.entries(map)) {
        if (key.length < 1 || key.length > 128 || /[\u0000-\u001f\u007f-\u009f]/.test(key)) fail(`${label} has an invalid map key.`);
        if (typeof item !== "boolean") boundedText(item, `${label}.${key}`);
      }
      return;
    }
    case "text": boundedText(value, label); return;
    case "id": canonicalId(value, label); return;
    case "instant": canonicalInstant(value, label); return;
    case "number": if (typeof value !== "number" || !Number.isFinite(value) || value < 0) fail(`${label} must be a nonnegative finite number.`); return;
    case "boolean": if (typeof value !== "boolean") fail(`${label} must be a boolean.`); return;
    case "source-ref": if (typeof value !== "string" || value.length < 1 || value.length > 512 || /\s|[\u0000-\u001f]/.test(value)) fail(`${label} must be an opaque RepositoryService reference.`); return;
    case "version": if (!Number.isSafeInteger(value) || (value as number) < 1) fail(`${label} must be a positive record version.`); return;
    case "digest": if (typeof value !== "string" || !/^[a-f0-9]{64}$/i.test(value)) fail(`${label} must be a SHA-256 digest.`); return;
    case "principal": principal(value, label); return;
    case "text-list": case "id-list":
      if (!Array.isArray(value) || value.length > MAX_LIST) fail(`${label} exceeds its list bound.`);
      value.forEach((item, index) => rule === "text-list" ? boundedText(item, `${label}[${index}]`) : canonicalId(item, `${label}[${index}]`));
      return;
  }
}

export function validateProjectStateEntity(value: unknown): ProjectStateEntity {
  const record = object(value, "record");
  exactFields(record, requiredEnvelopeKeys, envelopeKeys, "record");
  const type = record.entityType;
  if (typeof type !== "string" || !Object.hasOwn(ENTITY_TYPE_REGISTRY, type)) fail("Unregistered Project State entity type.");
  const definition = ENTITY_TYPE_REGISTRY[type as EntityType];
  if (record.schemaVersion !== definition.schemaVersion) fail("Unsupported Project State schema version.");
  for (const key of ["id", "projectId", "lineageId"]) canonicalId(record[key], `record.${key}`);
  if (record.entityType === "Project" && record.projectId !== record.id) fail("Project identity must own itself.");
  if (!Number.isSafeInteger(record.recordVersion) || (record.recordVersion as number) < 1) fail("Record version must be a positive integer.");
  if (!["active", "closed", "archived", "superseded", "voided"].includes(record.lifecycleState as string)) fail("Unsupported lifecycle state.");
  if (record.dispositionState !== undefined && !["none", "advisory", "proposed", "approved", "revision_requested", "accepted", "rejected", "revoked"].includes(record.dispositionState as string)) fail("Unsupported disposition state.");
  for (const key of ["createdAt", "updatedAt"]) canonicalInstant(record[key], `record.${key}`);
  for (const key of ["closedAt", "supersededAt"]) if (record[key] !== undefined) canonicalInstant(record[key], `record.${key}`);
  if (record.lifecycleState === "superseded" && !record.supersededAt) fail("Superseded state requires its timestamp.");
  if (record.lifecycleState !== "superseded" && record.supersededAt) fail("Supersession timestamp requires superseded state.");
  principal(record.createdBy, "record.createdBy");
  principal(record.updatedBy, "record.updatedBy");
  const provenance = object(record.provenance, "record.provenance");
  exactFields(provenance, ["origin"], new Set(["origin", "sourceRef", "correlationId"]), "record.provenance");
  if (!["native", "legacy-import", "external"].includes(provenance.origin as string)) fail("Unsupported provenance origin.");
  for (const key of ["sourceRef", "correlationId"]) if (provenance[key] !== undefined) boundedText(provenance[key], `record.provenance.${key}`);
  const body = object(record.body, "record.body");
  const allowed = new Set([...Object.keys(definition.required), ...Object.keys(definition.optional ?? {})]);
  exactFields(body, Object.keys(definition.required), allowed, "record.body");
  for (const [key, rule] of Object.entries({ ...definition.required, ...definition.optional })) {
    // An Operator may record a simple acceptance without entering free-text reasoning.
    if (type === "Decision" && key === "rationale" && body[key] === "") continue;
    if (body[key] !== undefined) checkField(body[key], rule, `record.body.${key}`);
  }
  if (type === "ArchitectReviewCycle") {
    const cycle = body as unknown as EntityBodyMap["ArchitectReviewCycle"];
    if (ARCHITECT_STAGE_BY_WORKFLOW[cycle.workflowType] !== cycle.stageKind) fail("Architect cycle requires the matching substantive Workflow stage.");
  }
  if (type === "ResearchOutcome" && (!(body.evidence as string[]).length || body.prototypeDisposition === "candidate-for-later-work" && body.productionFollowUp !== "new-work-intake-required")) fail("Research outcome requires evidence and explicit later-work disposition.");
  if (type === "TesterResult") {
    const tester = body as unknown as EntityBodyMap["TesterResult"];
    if (tester.sourceMode === "source-backed" && !tester.implementerRevisionId) fail("Source-backed Tester result requires its Implementer revision.");
    if (tester.sourceMode === "source-neutral" && (tester.implementerRevisionId !== undefined || tester.candidateRevisionId !== undefined || tester.sourceCheckpointId !== undefined || tester.permanentTestPaths.length !== 0 || tester.checkpointState !== "not-required")) fail("Source-neutral Tester result cannot claim source identity, changed proof, or a checkpoint.");
    if (tester.sourceMode === "source-backed" && tester.checkpointState === "not-required" &&
      (tester.candidateRevisionId !== tester.implementerRevisionId || tester.sourceCheckpointId !== undefined)) fail("Unchanged Tester result must use its Implementer revision and have no source checkpoint.");
    if ((tester.checkpointState === "pending" || tester.checkpointState === "blocked") &&
      (tester.sourceMode !== "source-backed" || tester.permanentTestPaths.length === 0 || tester.candidateRevisionId !== undefined)) fail("Pending or blocked Tester result requires source-backed changed paths and no candidate revision.");
    if (tester.sourceMode === "source-backed" && tester.checkpointState === "committed" &&
      (tester.permanentTestPaths.length === 0 || !tester.candidateRevisionId || !tester.sourceCheckpointId)) fail("Checkpointed Tester result requires changed paths, candidate revision, and checkpoint identity.");
  }
  let bytes: number;
  try { bytes = encoder.encode(JSON.stringify(record)).length; } catch { return fail("Record cannot be serialized."); }
  if (bytes > MAX_RECORD_BYTES) fail("Record exceeds its byte bound.");
  return record as unknown as ProjectStateEntity;
}

/** The application, never a model payload, issues identity, version and timestamps. */
export function createProjectStateEntity<T extends EntityType>(input: { entityType: T; projectId?: ProjectId; body: EntityBodyMap[T]; principal: PrincipalRef; provenance?: Provenance }): ProjectStateRecord<T> {
  const id = globalThis.crypto.randomUUID();
  const now = new Date().toISOString();
  const record: ProjectStateRecord<T> = {
    id, projectId: input.entityType === "Project" ? id : input.projectId ?? fail("Project identity is required."),
    entityType: input.entityType, lineageId: globalThis.crypto.randomUUID(), recordVersion: 1,
    schemaVersion: PROJECT_STATE_SCHEMA_VERSION, lifecycleState: "active", createdAt: now, updatedAt: now,
    createdBy: input.principal, updatedBy: input.principal, provenance: input.provenance ?? { origin: "native" }, body: input.body,
  };
  return validateProjectStateEntity(record) as ProjectStateRecord<T>;
}
