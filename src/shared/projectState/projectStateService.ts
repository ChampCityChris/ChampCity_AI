import type { DispositionState, EntityBodyMap, EntityId, EntityType, LifecycleState, PrincipalRef, ProjectId, ProjectStateEntity, ProjectStateRecord, ValidationMode } from "./domainContracts";
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

  async function createRecord<T extends EntityType>(projectId: ProjectId | null, entityType: T, content: EntityBodyMap[T], context?: MutationContext) {
    if (restrictedGenericTypes.has(entityType)) fail("Decision, Validation and Evidence require typed commands.");
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

  async function reviseRecord(projectId: ProjectId, entityId: EntityId, changes: Record<string, unknown>, expectedRevision: number, context?: MutationContext) {
    const patch = exactInput(changes, Object.keys(changes));
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) fail("An exact expected revision is required.");
    return store.transaction(projectId, async unit => {
      const current = await requiredRecord(unit, projectId, entityId);
      if (restrictedGenericTypes.has(current.entityType)) fail("Immutable semantic records require typed correction or supersession.");
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
      return { predecessor: terminal, successor, relationship: edge };
    });
  }

  async function createRelationship(projectId: ProjectId, fromEntityId: EntityId, relationshipType: RelationshipType, toEntityId: EntityId, context?: MutationContext) {
    if (relationshipType === "governs") fail("Decision governance requires a typed Decision command.");
    return store.transaction(projectId, async unit => {
      const from = await requiredRecord(unit, projectId, fromEntityId);
      const to = await requiredRecord(unit, projectId, toEntityId);
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

  async function recordLinked(projectId: ProjectId, targetId: EntityId, entityType: "Decision" | "Validation" | "Evidence", body: Record<string, unknown> | ((target: ProjectStateEntity) => Record<string, unknown>), relationshipType: "governs" | "evaluates" | "supports", context?: MutationContext) {
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
      return { predecessor: terminal, successor, supersedes, governs: governed };
    });
  }

  async function recordValidation(projectId: ProjectId, targetId: EntityId, input: { validationType: string; method: string; validationMode?: ValidationMode; outcome: "pass" | "fail" | "blocked" | "inconclusive"; summary: string; targetRecordVersion?: number; sourceBaselineRef?: string }, context?: MutationContext) {
    exactInput(input, ["validationType", "method", "validationMode", "outcome", "summary", "targetRecordVersion", "sourceBaselineRef"]);
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
    if (typeof input.payloadRef !== "string" || !/^[a-z][a-z0-9+.-]*:[^\s]+$/i.test(input.payloadRef) || /^data:/i.test(input.payloadRef)) fail("Evidence payload must use an external reference, not inline bytes.");
    if (input.size !== undefined && (!Number.isSafeInteger(input.size) || input.size < 0)) fail("Evidence size must be a nonnegative integer.");
    return recordLinked(projectId, targetId, "Evidence", { ...content, capturedBy: trustedPrincipal, capturedAt: new Date().toISOString() }, "supports", context);
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

  return { createRecord, reviseRecord, supersedeRecord, createRelationship, endRelationship, recordDecision, supersedeDecision, recordValidation, recordEvidence,
    getRecord, queryRecords, getCurrentRecord, getRecordHistory, getRelationships, getLineage, getProjectStateSummary, getEvidence,
    getEffectiveDisposition, getRequiredOperatorDecisions, getValidationFreshness, getCriterionValidationStatus };
}
