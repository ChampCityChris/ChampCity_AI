import type { EntityBodyMap, EntityId, EntityType, LifecycleState, PrincipalRef, ProjectId, ProjectStateEntity } from "./domainContracts";
import { assertSupersession } from "./domainInvariants";
import { createProjectStateEntity, ENTITY_TYPE_REGISTRY, ProjectStateDomainError, validateProjectStateEntity } from "./entityTypeRegistry";
import { createRelationship as createDomainRelationship, type ProjectStateRelationship, type RelationshipType } from "./relationshipRegistry";
import type { ProjectStateStore, ProjectStateUnitOfWork } from "./projectStateStore";

export interface RecordQuery { entityType?: EntityType; lifecycleState?: LifecycleState; limit?: number }
export interface ProjectStateSummary { projectId: ProjectId; totalRecords: number; activeRecords: number; countsByType: Partial<Record<EntityType, number>> }
export interface RecordHistory { lineageId: string; records: ProjectStateEntity[] }
export interface RecordLineage { records: ProjectStateEntity[]; relationships: ProjectStateRelationship[] }

const restrictedGenericTypes = new Set<EntityType>(["Decision", "Validation", "Evidence"]);
function fail(message: string): never { throw new ProjectStateDomainError(message); }
function exactInput(value: unknown, allowed: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) fail("A bounded semantic input is required.");
  const input = value as Record<string, unknown>;
  for (const field of Object.keys(input)) if (!allowed.includes(field)) fail(`Unsupported semantic input field: ${field}.`);
  return input;
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

  async function createRecord<T extends EntityType>(projectId: ProjectId | null, entityType: T, content: EntityBodyMap[T]) {
    if (restrictedGenericTypes.has(entityType)) fail("Decision, Validation and Evidence require typed commands.");
    if (entityType === "Project" && projectId !== null) fail("A new Project cannot borrow another Project identity.");
    if (entityType !== "Project" && !projectId) fail("Project identity is required.");
    const record = createProjectStateEntity({ entityType, ...(projectId ? { projectId } : {}), body: content, principal: trustedPrincipal });
    await store.transaction(record.projectId, async unit => {
      if (entityType !== "Project" && !await unit.getProject(record.projectId)) fail("Owning Project does not exist.");
      await unit.saveEntity(record as unknown as ProjectStateEntity, null);
    });
    return record;
  }

  async function reviseRecord(projectId: ProjectId, entityId: EntityId, changes: Record<string, unknown>, expectedRevision: number) {
    const patch = exactInput(changes, Object.keys(changes));
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) fail("An exact expected revision is required.");
    return store.transaction(projectId, async unit => {
      const current = await requiredRecord(unit, projectId, entityId);
      if (restrictedGenericTypes.has(current.entityType)) fail("Immutable semantic records require typed correction or supersession.");
      if (current.recordVersion !== expectedRevision) fail("Expected Project State revision is stale.");
      const next = validateProjectStateEntity({ ...current, recordVersion: current.recordVersion + 1, updatedAt: new Date().toISOString(), updatedBy: trustedPrincipal, body: { ...current.body, ...patch } });
      await unit.saveEntity(next, expectedRevision);
      return next;
    });
  }

  async function supersedeRecord(projectId: ProjectId, entityId: EntityId, replacement: Record<string, unknown>, expectedRevision: number) {
    const content = exactInput(replacement, Object.keys(replacement));
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) fail("An exact expected revision is required.");
    return store.transaction(projectId, async unit => {
      const previous = await requiredRecord(unit, projectId, entityId);
      if (previous.entityType === "Project" || previous.recordVersion !== expectedRevision) fail("Supersession target is unavailable or stale.");
      const now = new Date().toISOString();
      const terminal = validateProjectStateEntity({ ...previous, recordVersion: previous.recordVersion + 1, lifecycleState: "superseded", supersededAt: now, updatedAt: now, updatedBy: trustedPrincipal });
      const successor = validateProjectStateEntity({ ...createProjectStateEntity({ entityType: previous.entityType as EntityType, projectId, body: content as EntityBodyMap[EntityType], principal: trustedPrincipal }), lineageId: previous.lineageId });
      assertSupersession(previous, terminal, successor);
      await unit.saveEntity(terminal, expectedRevision, { terminalSupersession: true, evidenceReliedUpon: true });
      await unit.saveEntity(successor, null);
      const edge = createDomainRelationship({ projectId, fromEntityId: successor.id, relationshipType: "supersedes", toEntityId: previous.id, createdBy: trustedPrincipal }, id => id === successor.id ? successor : id === previous.id ? terminal : undefined);
      await unit.saveRelationship(edge);
      return { predecessor: terminal, successor, relationship: edge };
    });
  }

  async function createRelationship(projectId: ProjectId, fromEntityId: EntityId, relationshipType: RelationshipType, toEntityId: EntityId) {
    return store.transaction(projectId, async unit => {
      const from = await requiredRecord(unit, projectId, fromEntityId);
      const to = await requiredRecord(unit, projectId, toEntityId);
      const edge = createDomainRelationship({ projectId, fromEntityId, relationshipType, toEntityId, createdBy: trustedPrincipal }, id => id === fromEntityId ? from : id === toEntityId ? to : undefined);
      await unit.saveRelationship(edge);
      return edge;
    });
  }

  async function endRelationship(projectId: ProjectId, relationshipId: string) {
    await store.transaction(projectId, unit => unit.endRelationship(relationshipId, new Date().toISOString()));
  }

  async function recordLinked(projectId: ProjectId, targetId: EntityId, entityType: "Decision" | "Validation" | "Evidence", body: Record<string, unknown>, relationshipType: "governs" | "evaluates" | "supports") {
    return store.transaction(projectId, async unit => {
      const target = await requiredRecord(unit, projectId, targetId);
      const record = createProjectStateEntity({ entityType, projectId, body: body as EntityBodyMap[typeof entityType], principal: trustedPrincipal });
      await unit.saveEntity(record as unknown as ProjectStateEntity, null);
      const fromEntityId = record.id;
      const edge = createDomainRelationship({ projectId, fromEntityId, relationshipType, toEntityId: target.id, createdBy: trustedPrincipal }, id => id === record.id ? record as unknown as ProjectStateEntity : id === target.id ? target : undefined);
      await unit.saveRelationship(edge);
      return record;
    });
  }

  async function recordDecision(projectId: ProjectId, targetId: EntityId, input: { decisionType: string; outcome: string; rationale: string; decisionScope: string }) {
    const content = exactInput(input, ["decisionType", "outcome", "rationale", "decisionScope"]);
    const now = new Date().toISOString();
    return recordLinked(projectId, targetId, "Decision", { ...content, decisionRole: trustedPrincipal.role, decidedBy: trustedPrincipal, decidedAt: now, effectiveAt: now }, "governs");
  }

  async function recordValidation(projectId: ProjectId, targetId: EntityId, input: { validationType: string; method: string; outcome: "pass" | "fail" | "blocked" | "inconclusive"; summary: string }) {
    const content = exactInput(input, ["validationType", "method", "outcome", "summary"]);
    return recordLinked(projectId, targetId, "Validation", { ...content, performedBy: trustedPrincipal, performedAt: new Date().toISOString() }, "evaluates");
  }

  async function recordEvidence(projectId: ProjectId, targetId: EntityId, input: { evidenceType: string; description: string; mediaType: string; payloadRef: string; digest: string; size?: number }) {
    const content = exactInput(input, ["evidenceType", "description", "mediaType", "payloadRef", "digest", "size"]);
    return recordLinked(projectId, targetId, "Evidence", { ...content, capturedBy: trustedPrincipal, capturedAt: new Date().toISOString() }, "supports");
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
  async function getCurrentRecord(projectId: ProjectId, identity: EntityId) {
    const record = await store.getEntity(projectId, identity);
    if (!record) return null;
    const family = (await store.listEntities(projectId, record.entityType)).filter(candidate => candidate.lineageId === record.lineageId && candidate.lifecycleState !== "superseded");
    if (family.length > 1) fail("Multiple current records share one lineage.");
    return family[0] ?? null;
  }
  async function getRecordHistory(projectId: ProjectId, entityId: EntityId): Promise<RecordHistory | null> {
    const record = await store.getEntity(projectId, entityId);
    if (!record) return null;
    const family = (await store.listEntities(projectId, record.entityType)).filter(candidate => candidate.lineageId === record.lineageId);
    const versions = (await Promise.all(family.flatMap(candidate => Array.from({ length: candidate.recordVersion }, (_, index) => store.getEntityVersion(projectId, candidate.id, index + 1))))).filter((candidate): candidate is ProjectStateEntity => candidate !== null);
    return { lineageId: record.lineageId, records: versions.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id) || a.recordVersion - b.recordVersion) };
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
