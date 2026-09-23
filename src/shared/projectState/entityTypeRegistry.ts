import { PROJECT_STATE_SCHEMA_VERSION, type EntityBodyMap, type EntityType, type PrincipalRef, type ProjectId, type ProjectStateEntity, type ProjectStateRecord, type Provenance, type RecordEnvelope } from "./domainContracts";

type FieldKind = "text" | "id" | "instant" | "number" | "text-list" | "id-list" | "principal" | "digest";
type FieldRule = FieldKind | readonly string[];
interface EntityDefinition { schemaVersion: typeof PROJECT_STATE_SCHEMA_VERSION; required: Readonly<Record<string, FieldRule>>; optional?: Readonly<Record<string, FieldRule>>; immutableAfterCreation: boolean }

const text = "text" as const;
const id = "id" as const;
const instant = "instant" as const;
const textList = "text-list" as const;
const idList = "id-list" as const;

/** One reviewed type registry owns field vocabulary and immutable-record policy. */
export const ENTITY_TYPE_REGISTRY: Readonly<Record<EntityType, EntityDefinition>> = Object.freeze({
  Project: { schemaVersion: 1, required: { name: text, description: text }, immutableAfterCreation: false },
  ProjectResource: { schemaVersion: 1, required: { resourceType: text, provider: text, logicalName: text, locator: text, role: text }, immutableAfterCreation: false },
  WorkIntake: { schemaVersion: 1, required: { request: text, desiredOutcome: text, constraints: textList, evidenceContext: textList, intakeState: text, requestedIntegrationTarget: text }, immutableAfterCreation: false },
  RouteAssessment: { schemaVersion: 1, required: { workIntakeId: id, recommendation: text, traits: textList, rationale: text, evidenceIds: idList }, optional: { alternate: text }, immutableAfterCreation: true },
  Workflow: { schemaVersion: 1, required: { workflowType: text, workspace: text, governingEntityId: id, workflowState: text }, immutableAfterCreation: false },
  Phase: { schemaVersion: 1, required: { title: text, objective: text, phaseState: text, sequence: "number" }, immutableAfterCreation: false },
  Finding: { schemaVersion: 1, required: { title: text, statement: text, category: text, impact: text, observedAt: instant, findingState: text }, optional: { confidence: "number" }, immutableAfterCreation: false },
  RootCause: { schemaVersion: 1, required: { title: text, statement: text, rationale: text, rootCauseState: text }, optional: { confidence: "number" }, immutableAfterCreation: false },
  BoundedSolution: { schemaVersion: 1, required: { title: text, objective: text, scopeIn: textList, scopeOut: textList, constraints: textList, assumptions: textList, risks: textList, solutionState: text }, immutableAfterCreation: false },
  Criterion: { schemaVersion: 1, required: { statement: text, criticality: ["required", "optional", "informational"], verificationIntent: text, criterionState: text }, immutableAfterCreation: false },
  WorkItem: { schemaVersion: 1, required: { workItemKind: text, title: text, objective: text, workState: text }, optional: { startedAt: instant, implementedAt: instant }, immutableAfterCreation: false },
  ImplementationRecord: { schemaVersion: 1, required: { workItemId: id, summary: text, deviations: textList, blockers: textList, residualRisks: textList, outcome: text }, optional: { executionRef: text }, immutableAfterCreation: true },
  Validation: { schemaVersion: 1, required: { validationType: text, method: text, outcome: ["pass", "fail", "blocked", "inconclusive"], performedBy: "principal", performedAt: instant, summary: text }, immutableAfterCreation: true },
  Evidence: { schemaVersion: 1, required: { evidenceType: text, description: text, capturedAt: instant, capturedBy: "principal", mediaType: text, payloadRef: text, digest: "digest" }, optional: { size: "number" }, immutableAfterCreation: false },
  Decision: { schemaVersion: 1, required: { decisionType: text, outcome: text, rationale: text, decisionRole: text, decisionScope: text, decidedBy: "principal", decidedAt: instant, effectiveAt: instant }, immutableAfterCreation: true },
  RegressionObligation: { schemaVersion: 1, required: { title: text, statement: text, obligationState: text }, optional: { testReferenceId: id, sourceWorkItemId: id }, immutableAfterCreation: false },
  SourceBinding: { schemaVersion: 1, required: { workIntakeId: id, repositoryId: text, integrationTargetSourceLineId: text, preparationState: ["unprepared", "preparing", "ready", "blocked"] }, optional: { baseRevisionId: text, workSourceLineId: text, currentRevisionId: text, repositoryCheckoutId: text, failureCode: text }, immutableAfterCreation: false },
  SourceCheckpoint: { schemaVersion: 1, required: { boundaryId: text, workIntakeId: id, sourceLineId: text, expectedRevisionId: text, checkpointKind: ["implementation", "disposition"], checkpointState: ["not-required", "pending", "committed", "blocked", "inspection-required"] }, optional: { resultingRevisionId: text }, immutableAfterCreation: false },
  IntegrationRecord: { schemaVersion: 1, required: { workIntakeId: id, incomingRevisionId: text, targetSourceLineId: text, targetBeforeRevisionId: text, integrationState: text }, optional: { candidateRevisionId: text, targetAfterRevisionId: text }, immutableAfterCreation: false },
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
    case "text": boundedText(value, label); return;
    case "id": canonicalId(value, label); return;
    case "instant": canonicalInstant(value, label); return;
    case "number": if (typeof value !== "number" || !Number.isFinite(value) || value < 0) fail(`${label} must be a nonnegative finite number.`); return;
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
  for (const [key, rule] of Object.entries({ ...definition.required, ...definition.optional })) if (body[key] !== undefined) checkField(body[key], rule, `record.body.${key}`);
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
