import type { EntityBodyMap, EntityId, EntityType, LifecycleState, PrincipalRef, ProjectId, ProjectStateEntity } from "./domainContracts";
import { assertSupersession } from "./domainInvariants";
import { createProjectStateEntity, ENTITY_TYPE_REGISTRY, ProjectStateDomainError, validateProjectStateEntity } from "./entityTypeRegistry";
import { createRelationship as createDomainRelationship, type ProjectStateRelationship, type RelationshipType } from "./relationshipRegistry";
import type { ProjectStateStore, ProjectStateUnitOfWork, StateChange } from "./projectStateStore";

export interface RecordQuery { entityType?: EntityType; lifecycleState?: LifecycleState; limit?: number }
export interface ProjectStateSummary { projectId: ProjectId; totalRecords: number; activeRecords: number; countsByType: Partial<Record<EntityType, number>> }
export interface RecordHistory { lineageId: string; records: ProjectStateEntity[] }
export interface RecordLineage { records: ProjectStateEntity[]; relationships: ProjectStateRelationship[] }
export interface MutationContext { reason?: string; causationId?: string; correlationId?: string }
export const PROJECT_STATE_EVENT_TYPES = Object.freeze({
  create: "project-state.record-created",
  revise: "project-state.record-revised",
  supersede: "project-state.record-superseded",
  relationshipCreate: "project-state.relationship-created",
  relationshipEnd: "project-state.relationship-ended",
});

const restrictedGenericTypes = new Set<EntityType>(["Decision", "Validation", "Evidence"]);
function fail(message: string): never { throw new ProjectStateDomainError(message); }
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
async function requiredRecord(unit: ProjectStateUnitOfWork, projectId: ProjectId, entityId: EntityId): Promise<ProjectStateEntity> {
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

  async function recordLinked(projectId: ProjectId, targetId: EntityId, entityType: "Decision" | "Validation" | "Evidence", body: Record<string, unknown>, relationshipType: "governs" | "evaluates" | "supports", context?: MutationContext) {
    return store.transaction(projectId, async unit => {
      const target = await requiredRecord(unit, projectId, targetId);
      const record = createProjectStateEntity({ entityType, projectId, body: body as EntityBodyMap[typeof entityType], principal: trustedPrincipal });
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

  async function recordDecision(projectId: ProjectId, targetId: EntityId, input: { decisionType: string; outcome: string; rationale: string; decisionScope: string }, context?: MutationContext) {
    const content = exactInput(input, ["decisionType", "outcome", "rationale", "decisionScope"]);
    const now = new Date().toISOString();
    return recordLinked(projectId, targetId, "Decision", { ...content, decisionRole: trustedPrincipal.role, decidedBy: trustedPrincipal, decidedAt: now, effectiveAt: now }, "governs", context);
  }

  async function recordValidation(projectId: ProjectId, targetId: EntityId, input: { validationType: string; method: string; outcome: "pass" | "fail" | "blocked" | "inconclusive"; summary: string }, context?: MutationContext) {
    const content = exactInput(input, ["validationType", "method", "outcome", "summary"]);
    return recordLinked(projectId, targetId, "Validation", { ...content, performedBy: trustedPrincipal, performedAt: new Date().toISOString() }, "evaluates", context);
  }

  async function recordEvidence(projectId: ProjectId, targetId: EntityId, input: { evidenceType: string; description: string; mediaType: string; payloadRef: string; digest: string; size?: number }, context?: MutationContext) {
    const content = exactInput(input, ["evidenceType", "description", "mediaType", "payloadRef", "digest", "size"]);
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

  return { createRecord, reviseRecord, supersedeRecord, createRelationship, endRelationship, recordDecision, recordValidation, recordEvidence,
    getRecord, queryRecords, getCurrentRecord, getRecordHistory, getRelationships, getLineage, getProjectStateSummary, getEvidence };
}
