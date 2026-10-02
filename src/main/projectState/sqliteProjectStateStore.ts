import { backup, DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import type { EntityType, ProjectId, ProjectStateEntity, ProjectStateRecord } from "../../shared/projectState/domainContracts";
import { assertRevision } from "../../shared/projectState/domainInvariants";
import { validateProjectStateEntity } from "../../shared/projectState/entityTypeRegistry";
import type { ProjectStateRelationship, RelationshipType } from "../../shared/projectState/relationshipRegistry";
import { assertRelationshipEnd, validateRelationship } from "../../shared/projectState/relationshipRegistry";
import type { ProjectStateOutboxEvent, ProjectStateReadPort, ProjectStateStore, ProjectStateUnitOfWork, StateChange, StateProviderGeneration } from "../../shared/projectState/projectStateStore";
import { ProjectStateStoreError } from "../../shared/projectState/projectStateStore";
import { canonicalProjectStateBodyJson, openProjectStateDatabase, PROJECT_STATE_BUSY_TIMEOUT_MS } from "./sqliteSchema";

type Row = Record<string, string | number | null>;
const copy = <T>(value: T): T => structuredClone(value);
function mismatch(): never { throw new ProjectStateStoreError("PROJECT_MISMATCH", "Record belongs to a different Project."); }
function stale(): never { throw new ProjectStateStoreError("STALE_STATE", "Expected Project State version or generation is stale."); }

/** Use SQLite's numeric result codes; never infer retry policy from engine messages. */
function persistenceError(error: unknown): Error {
  if (error instanceof ProjectStateStoreError) return error;
  const engine = error as { code?: string; errcode?: number };
  if (engine?.code === "ERR_SQLITE_ERROR") {
    const primary = typeof engine.errcode === "number" ? engine.errcode & 0xff : 0;
    if (primary === 5 || primary === 6) return new ProjectStateStoreError("STORE_BUSY", "Project State database is busy.");
    if (primary === 11 || primary === 26) return new ProjectStateStoreError("STORE_CORRUPT", "Project State database is corrupt or unreadable.");
    return new ProjectStateStoreError("PERSISTENCE_FAILURE", "Project State database operation failed.");
  }
  return error instanceof Error ? error : new ProjectStateStoreError("PERSISTENCE_FAILURE", "Project State database operation failed.");
}

function execute<T>(work: () => T): T {
  try { return work(); } catch (error) { throw persistenceError(error); }
}

function one(database: DatabaseSync, sql: string, ...args: Array<string | number>): Row | null {
  return (database.prepare(sql).get(...args) as Row | undefined) ?? null;
}
function all(database: DatabaseSync, sql: string, ...args: Array<string | number>): Row[] {
  return database.prepare(sql).all(...args) as Row[];
}
function parsed<T>(value: string | number | null): T {
  try { return JSON.parse(String(value)) as T; }
  catch { throw new ProjectStateStoreError("STORE_CORRUPT", "Stored Project State JSON is invalid."); }
}

function hydrateVersion(row: Row, project = false): ProjectStateEntity {
  const record = {
    id: String(project ? row.project_id : row.entity_id),
    projectId: String(row.project_id),
    entityType: project ? "Project" : String(row.entity_type),
    lineageId: String(row.lineage_id),
    recordVersion: Number(row.record_version),
    schemaVersion: Number(row.schema_version),
    lifecycleState: String(row.lifecycle_state),
    ...(row.disposition_state === null ? {} : { dispositionState: String(row.disposition_state) }),
    createdAt: String(row.created_at),
    createdBy: parsed(row.created_by_json),
    updatedAt: String(row.updated_at),
    updatedBy: parsed(row.updated_by_json),
    ...(row.closed_at === null ? {} : { closedAt: String(row.closed_at) }),
    ...(row.superseded_at === null ? {} : { supersededAt: String(row.superseded_at) }),
    provenance: parsed(row.provenance_json),
    body: parsed(row.body_json),
  };
  try { return validateProjectStateEntity(record); }
  catch { throw new ProjectStateStoreError("STORE_CORRUPT", "Stored Project State record failed domain validation."); }
}

function hydrateRelationship(row: Row): ProjectStateRelationship {
  return {
    id: String(row.relationship_id), projectId: String(row.project_id), fromEntityId: String(row.from_entity_id),
    relationshipType: String(row.relationship_type) as RelationshipType, toEntityId: String(row.to_entity_id),
    createdAt: String(row.created_at), createdBy: parsed(row.created_by_json),
    ...(row.ended_at === null ? {} : { endedAt: String(row.ended_at) }),
  };
}

function hydrateOutbox(row: Row): ProjectStateOutboxEvent {
  return {
    id: String(row.event_id), projectId: String(row.project_id), sequence: Number(row.sequence),
    eventType: String(row.event_type), ...(row.entity_id === null ? {} : { entityId: String(row.entity_id) }),
    occurredAt: String(row.occurred_at), payload: parsed(row.payload_json),
  };
}

function readPort(database: DatabaseSync, assertOpen: () => void, useSnapshot = false): ProjectStateReadPort {
  const read = <T>(work: () => T): T => execute(() => {
    if (!useSnapshot) return work();
    database.exec("BEGIN");
    try {
      const result = work();
      database.exec("COMMIT");
      return result;
    } catch (error) {
      if (database.isTransaction) database.exec("ROLLBACK");
      throw error;
    }
  });
  const getProject = (projectId: ProjectId) => {
    const row = one(database, `SELECT v.* FROM projects p JOIN project_versions v
      ON v.project_id = p.project_id AND v.record_version = p.current_record_version WHERE p.project_id = ?`, projectId);
    return row ? hydrateVersion(row, true) as ProjectStateRecord<"Project"> : null;
  };
  const getEntity = (projectId: ProjectId, entityId: string) => {
    if (entityId === projectId) return getProject(projectId);
    const row = one(database, `SELECT v.* FROM state_entities e JOIN state_entity_versions v
      ON v.project_id = e.project_id AND v.entity_id = e.entity_id AND v.record_version = e.current_record_version
      WHERE e.project_id = ? AND e.entity_id = ?`, projectId, entityId);
    return row ? hydrateVersion(row) : null;
  };
  return {
    async getProject(projectId) { assertOpen(); return read(() => getProject(projectId)); },
    async getEntity(projectId, entityId) { assertOpen(); return read(() => getEntity(projectId, entityId)); },
    async getEntityVersion(projectId, entityId, version) {
      assertOpen();
      return read(() => {
        const row = entityId === projectId
          ? one(database, "SELECT * FROM project_versions WHERE project_id = ? AND record_version = ?", projectId, version)
          : one(database, "SELECT * FROM state_entity_versions WHERE project_id = ? AND entity_id = ? AND record_version = ?", projectId, entityId, version);
        return row ? hydrateVersion(row, entityId === projectId) : null;
      });
    },
    async listEntities(projectId, type?: EntityType) {
      assertOpen();
      return read(() => {
        const records: ProjectStateEntity[] = [];
        if (!type || type === "Project") {
          const project = getProject(projectId);
          if (project) records.push(project);
        }
        if (type !== "Project") {
          const rows = type
            ? all(database, `SELECT v.* FROM state_entities e JOIN state_entity_versions v
                ON v.project_id = e.project_id AND v.entity_id = e.entity_id AND v.record_version = e.current_record_version
                WHERE e.project_id = ? AND e.entity_type = ? ORDER BY e.entity_id`, projectId, type)
            : all(database, `SELECT v.* FROM state_entities e JOIN state_entity_versions v
                ON v.project_id = e.project_id AND v.entity_id = e.entity_id AND v.record_version = e.current_record_version
                WHERE e.project_id = ? ORDER BY e.entity_id`, projectId);
          records.push(...rows.map(row => hydrateVersion(row)));
        }
        return records.sort((left, right) => left.id.localeCompare(right.id));
      });
    },
    async listRelationships(projectId, type?: RelationshipType) {
      assertOpen();
      return read(() => (type
        ? all(database, "SELECT * FROM relationships WHERE project_id = ? AND relationship_type = ? ORDER BY relationship_id", projectId, type)
        : all(database, "SELECT * FROM relationships WHERE project_id = ? ORDER BY relationship_id", projectId)
      ).map(hydrateRelationship));
    },
    async listStateChanges(projectId) {
      assertOpen();
      return read(() => all(database, "SELECT * FROM state_changes WHERE project_id = ? ORDER BY occurred_at, change_id", projectId).map(row => ({
        id: String(row.change_id), projectId: String(row.project_id), entityId: String(row.entity_id),
        fromRecordVersion: row.from_record_version === null ? null : Number(row.from_record_version),
        toRecordVersion: Number(row.to_record_version), operation: String(row.operation) as StateChange["operation"],
        principal: parsed(row.principal_json), occurredAt: String(row.occurred_at),
        changedFields: parsed(row.changed_fields_json), reason: String(row.reason),
        ...(row.causation_id === null ? {} : { causationId: String(row.causation_id) }),
        ...(row.correlation_id === null ? {} : { correlationId: String(row.correlation_id) }),
      })));
    },
    async listOutbox(projectId, afterSequence = 0) {
      assertOpen();
      return read(() => all(database, "SELECT * FROM outbox_events WHERE project_id = ? AND sequence > ? ORDER BY sequence", projectId, afterSequence).map(hydrateOutbox));
    },
    async getProviderGeneration(projectId) {
      assertOpen();
      return read(() => {
        const row = one(database, "SELECT * FROM project_state_authority WHERE project_id = ?", projectId);
        return row ? { projectId: String(row.project_id), generation: Number(row.generation), authority: String(row.authority) as StateProviderGeneration["authority"], updatedAt: String(row.updated_at) } : null;
      });
    },
  };
}

/** Read-only projection access: opening this port never initializes or migrates a store. */
export function createSQLiteProjectStateReader(databasePath: string): ProjectStateReadPort & { close(): void } {
  if (!path.isAbsolute(databasePath) || databasePath.startsWith("\\\\") || databasePath.startsWith("//")) {
    throw new ProjectStateStoreError("INVALID_STATE", "Project State requires an absolute local database path.");
  }
  const database = new DatabaseSync(databasePath, { readOnly: true, timeout: PROJECT_STATE_BUSY_TIMEOUT_MS, defensive: true, allowExtension: false });
  if (typeof database.enableDefensive === "function") database.enableDefensive(true);
  let closed = false;
  return { ...readPort(database, () => { if (closed) throw new ProjectStateStoreError("INVALID_STATE", "Project State reader is closed."); }, true),
    close() { if (!closed) { closed = true; database.close(); } } };
}

function insertVersion(database: DatabaseSync, entity: ProjectStateEntity): void {
  const common = [entity.projectId, entity.recordVersion, entity.schemaVersion, entity.lineageId, entity.lifecycleState,
    entity.dispositionState ?? null, entity.createdAt, JSON.stringify(entity.createdBy), entity.updatedAt,
    JSON.stringify(entity.updatedBy), entity.closedAt ?? null, entity.supersededAt ?? null,
    JSON.stringify(entity.provenance), canonicalProjectStateBodyJson(entity)] as const;
  if (entity.entityType === "Project") {
    database.prepare(`INSERT INTO project_versions(project_id,record_version,schema_version,lineage_id,lifecycle_state,disposition_state,
      created_at,created_by_json,updated_at,updated_by_json,closed_at,superseded_at,provenance_json,body_json)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(...common);
  } else {
    database.prepare(`INSERT INTO state_entity_versions(project_id,record_version,schema_version,lineage_id,lifecycle_state,disposition_state,
      created_at,created_by_json,updated_at,updated_by_json,closed_at,superseded_at,provenance_json,body_json,entity_id,entity_type)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(...common, entity.id, entity.entityType);
  }
}

/** Owns one local SQLite database and serializes every mutation on its writer connection. */
export function createSQLiteProjectStateStore(databasePath: string): ProjectStateStore & { close(): void; createOnlineBackup(destinationPath: string): Promise<number> } {
  if (!path.isAbsolute(databasePath) || databasePath.startsWith("\\\\") || databasePath.startsWith("//")) {
    throw new ProjectStateStoreError("INVALID_STATE", "Project State requires an absolute local database path.");
  }
  let writer: DatabaseSync;
  try { writer = openProjectStateDatabase(databasePath); }
  catch (error) {
    const mapped = persistenceError(error);
    throw mapped instanceof ProjectStateStoreError ? mapped : new ProjectStateStoreError("INVALID_STATE", "Project State database could not pass schema verification.");
  }
  let reader: DatabaseSync;
  try {
    reader = new DatabaseSync(databasePath, { readOnly: true, timeout: PROJECT_STATE_BUSY_TIMEOUT_MS, defensive: true, allowExtension: false });
    if (typeof reader.enableDefensive === "function") reader.enableDefensive(true);
  } catch (error) { writer.close(); throw persistenceError(error); }
  let closed = false;
  let writing = false;
  let writerTail: Promise<void> = Promise.resolve();
  const assertOpen = () => { if (closed) throw new ProjectStateStoreError("INVALID_STATE", "Project State store is closed."); };
  return {
    ...readPort(reader, assertOpen, true),
    async createOnlineBackup(destinationPath) {
      assertOpen();
      const relative = path.relative(path.dirname(databasePath), destinationPath);
      if (!path.isAbsolute(destinationPath) || !relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative) || path.resolve(destinationPath) === path.resolve(databasePath)) {
        throw new ProjectStateStoreError("INVALID_STATE", "Backup destination must remain inside the Project State storage boundary.");
      }
      if (fs.existsSync(destinationPath)) throw new ProjectStateStoreError("INVALID_STATE", "Backup destination already exists.");
      let release!: () => void;
      const prior = writerTail;
      writerTail = new Promise<void>(resolve => { release = resolve; });
      await prior;
      try {
        assertOpen();
        writing = true;
        return await backup(writer, destinationPath);
      } catch (error) {
        if (fs.existsSync(destinationPath)) fs.rmSync(destinationPath, { force: true });
        throw persistenceError(error);
      } finally { writing = false; release(); }
    },
    async listPendingOutbox(projectId, limit) {
      assertOpen();
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new ProjectStateStoreError("INVALID_STATE", "Outbox batch limit must be between 1 and 100.");
      return execute(() => {
        reader.exec("BEGIN");
        try {
          const events = all(reader, `SELECT e.* FROM outbox_events e LEFT JOIN outbox_acknowledgments a ON a.event_id = e.event_id
            WHERE e.project_id = ? AND a.event_id IS NULL ORDER BY e.sequence LIMIT ?`, projectId, limit).map(hydrateOutbox);
          reader.exec("COMMIT");
          return events;
        } catch (error) {
          if (reader.isTransaction) reader.exec("ROLLBACK");
          throw error;
        }
      });
    },
    async acknowledgeOutbox(projectId, eventId) {
      assertOpen();
      let release!: () => void;
      const prior = writerTail;
      writerTail = new Promise<void>(resolve => { release = resolve; });
      await prior;
      try {
        assertOpen();
        writing = true;
        return execute(() => {
          writer.exec("BEGIN IMMEDIATE");
          try {
            if (!one(writer, "SELECT event_id FROM outbox_events WHERE project_id = ? AND event_id = ?", projectId, eventId)) {
              writer.exec("ROLLBACK");
              return false;
            }
            writer.prepare("INSERT INTO outbox_acknowledgments(event_id,project_id,acknowledged_at) VALUES (?,?,?) ON CONFLICT(event_id) DO NOTHING")
              .run(eventId, projectId, new Date().toISOString());
            writer.exec("COMMIT");
            return true;
          } catch (error) {
            if (writer.isTransaction) writer.exec("ROLLBACK");
            throw error;
          }
        });
      } finally { writing = false; release(); }
    },
    async transaction<T>(projectId: ProjectId, work: (unit: ProjectStateUnitOfWork) => Promise<T>): Promise<T> {
      assertOpen();
      let release!: () => void;
      const prior = writerTail;
      writerTail = new Promise<void>(resolve => { release = resolve; });
      await prior;
      let active = true;
      const assertUnitOpen = () => { assertOpen(); if (!active) throw new ProjectStateStoreError("INVALID_STATE", "Unit of work is closed."); };
      try {
        assertOpen();
        writing = true;
        execute(() => writer.exec("BEGIN IMMEDIATE"));
        const reads = readPort(writer, assertUnitOpen);
        const unit: ProjectStateUnitOfWork = {
          ...reads,
          async saveEntity(entity, expectedVersion, policy = {}) {
            assertUnitOpen();
            execute(() => {
              validateProjectStateEntity(entity);
              if (entity.projectId !== projectId) mismatch();
              const existing = one(writer, "SELECT project_id FROM projects WHERE project_id = ? UNION ALL SELECT project_id FROM state_entities WHERE entity_id = ?", entity.id, entity.id);
              if (expectedVersion === null) {
                if (existing || entity.recordVersion !== 1) stale();
                if (entity.entityType === "Project") {
                  writer.prepare("INSERT INTO projects(project_id,current_record_version,lineage_id,lifecycle_state,created_at,updated_at,closed_at,superseded_at) VALUES (?,?,?,?,?,?,?,?)")
                    .run(entity.id, 1, entity.lineageId, entity.lifecycleState, entity.createdAt, entity.updatedAt, entity.closedAt ?? null, entity.supersededAt ?? null);
                } else {
                  if (!one(writer, "SELECT project_id FROM projects WHERE project_id = ?", projectId)) throw new ProjectStateStoreError("ENTITY_NOT_FOUND", "Owning Project does not exist.");
                  writer.prepare("INSERT INTO state_entities(project_id,entity_id,entity_type,lineage_id,current_record_version,lifecycle_state,created_at,updated_at,closed_at,superseded_at) VALUES (?,?,?,?,?,?,?,?,?,?)")
                    .run(projectId, entity.id, entity.entityType, entity.lineageId, 1, entity.lifecycleState, entity.createdAt, entity.updatedAt, entity.closedAt ?? null, entity.supersededAt ?? null);
                }
                insertVersion(writer, entity);
                return;
              }
              if (!existing || existing.project_id !== projectId) stale();
              const previous = entity.entityType === "Project"
                ? one(writer, `SELECT v.* FROM projects p JOIN project_versions v ON v.project_id = p.project_id AND v.record_version = p.current_record_version WHERE p.project_id = ?`, entity.id)
                : one(writer, `SELECT v.* FROM state_entities e JOIN state_entity_versions v ON v.project_id = e.project_id AND v.entity_id = e.entity_id AND v.record_version = e.current_record_version WHERE e.project_id = ? AND e.entity_id = ?`, projectId, entity.id);
              if (!previous || Number(previous.record_version) !== expectedVersion) stale();
              assertRevision(hydrateVersion(previous, entity.entityType === "Project"), entity, policy);
              insertVersion(writer, entity);
              const update = entity.entityType === "Project"
                ? writer.prepare("UPDATE projects SET current_record_version = ?, lifecycle_state = ?, updated_at = ?, closed_at = ?, superseded_at = ? WHERE project_id = ? AND current_record_version = ?")
                  .run(entity.recordVersion, entity.lifecycleState, entity.updatedAt, entity.closedAt ?? null, entity.supersededAt ?? null, projectId, expectedVersion)
                : writer.prepare("UPDATE state_entities SET current_record_version = ?, lifecycle_state = ?, updated_at = ?, closed_at = ?, superseded_at = ? WHERE project_id = ? AND entity_id = ? AND current_record_version = ?")
                  .run(entity.recordVersion, entity.lifecycleState, entity.updatedAt, entity.closedAt ?? null, entity.supersededAt ?? null, projectId, entity.id, expectedVersion);
              if (update.changes !== 1) stale();
            });
          },
          async saveRelationship(relationship) {
            assertUnitOpen();
            execute(() => {
              if (relationship.projectId !== projectId) mismatch();
              if (one(writer, "SELECT relationship_id FROM relationships WHERE relationship_id = ?", relationship.id)) throw new ProjectStateStoreError("DUPLICATE_ID", "Relationship identity already exists.");
              const lookup = (id: string) => {
                const record = id === projectId
                  ? one(writer, `SELECT v.* FROM projects p JOIN project_versions v ON v.project_id = p.project_id AND v.record_version = p.current_record_version WHERE p.project_id = ?`, projectId)
                  : one(writer, `SELECT v.* FROM state_entities e JOIN state_entity_versions v ON v.project_id = e.project_id AND v.entity_id = e.entity_id AND v.record_version = e.current_record_version WHERE e.entity_id = ?`, id);
                return record ? hydrateVersion(record, id === projectId) : undefined;
              };
              validateRelationship(relationship, lookup);
              writer.prepare("INSERT INTO relationships(relationship_id,project_id,from_entity_id,relationship_type,to_entity_id,created_at,created_by_json,ended_at) VALUES (?,?,?,?,?,?,?,?)")
                .run(relationship.id, projectId, relationship.fromEntityId, relationship.relationshipType, relationship.toEntityId, relationship.createdAt, JSON.stringify(relationship.createdBy), relationship.endedAt ?? null);
            });
          },
          async endRelationship(relationshipId, endedAt) {
            assertUnitOpen();
            execute(() => {
              const row = one(writer, "SELECT * FROM relationships WHERE relationship_id = ? AND project_id = ?", relationshipId, projectId);
              if (!row) throw new ProjectStateStoreError("ENTITY_NOT_FOUND", "Relationship does not exist in this Project.");
              const relationship = hydrateRelationship(row);
              assertRelationshipEnd(relationship, endedAt);
              if (relationship.endedAt) stale();
              const result = writer.prepare("UPDATE relationships SET ended_at = ? WHERE relationship_id = ? AND project_id = ? AND ended_at IS NULL").run(endedAt, relationshipId, projectId);
              if (result.changes !== 1) stale();
            });
          },
          async appendStateChange(change) {
            assertUnitOpen();
            execute(() => {
              if (change.projectId !== projectId) mismatch();
              if (one(writer, "SELECT change_id FROM state_changes WHERE change_id = ?", change.id)) throw new ProjectStateStoreError("DUPLICATE_ID", "State Change identity already exists.");
              writer.prepare(`INSERT INTO state_changes(change_id,project_id,entity_id,from_record_version,to_record_version,operation,principal_json,occurred_at,changed_fields_json,reason,causation_id,correlation_id)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(change.id, projectId, change.entityId, change.fromRecordVersion, change.toRecordVersion, change.operation,
                JSON.stringify(change.principal), change.occurredAt, JSON.stringify(change.changedFields), change.reason, change.causationId ?? null, change.correlationId ?? null);
            });
          },
          async appendOutbox(event) {
            assertUnitOpen();
            return execute(() => {
              if (event.projectId !== projectId) mismatch();
              if (one(writer, "SELECT event_id FROM outbox_events WHERE event_id = ?", event.id)) throw new ProjectStateStoreError("DUPLICATE_ID", "Outbox event identity already exists.");
              const sequence = Number(one(writer, "SELECT COALESCE(MAX(sequence), 0) + 1 AS next_sequence FROM outbox_events WHERE project_id = ?", projectId)?.next_sequence);
              writer.prepare("INSERT INTO outbox_events(event_id,project_id,sequence,event_type,entity_id,occurred_at,payload_json) VALUES (?,?,?,?,?,?,?)")
                .run(event.id, projectId, sequence, event.eventType, event.entityId ?? null, event.occurredAt, JSON.stringify(event.payload));
              return copy({ ...event, sequence });
            });
          },
          async advanceProviderGeneration(next, expectedGeneration) {
            assertUnitOpen();
            execute(() => {
              if (next.projectId !== projectId) mismatch();
              const current = one(writer, "SELECT generation FROM project_state_authority WHERE project_id = ?", projectId);
              if ((current?.generation ?? null) !== expectedGeneration || next.generation !== (expectedGeneration ?? 0) + 1) stale();
              if (current) writer.prepare("UPDATE project_state_authority SET generation = ?, authority = ?, updated_at = ? WHERE project_id = ? AND generation = ?")
                .run(next.generation, next.authority, next.updatedAt, projectId, expectedGeneration);
              else writer.prepare("INSERT INTO project_state_authority(project_id,generation,authority,updated_at) VALUES (?,?,?,?)")
                .run(projectId, next.generation, next.authority, next.updatedAt);
            });
          },
        };
        const result = await work(unit);
        execute(() => writer.exec("COMMIT"));
        return result;
      } catch (error) {
        if (writer.isTransaction) writer.exec("ROLLBACK");
        throw persistenceError(error);
      } finally {
        active = false;
        writing = false;
        release();
      }
    },
    close() {
      assertOpen();
      if (writing) throw new ProjectStateStoreError("INVALID_STATE", "Cannot close Project State during a mutation.");
      closed = true;
      reader.close();
      writer.close();
    },
  };
}

/** Read-only transaction for synchronous legacy workspace adapters consuming SQL Intake authority. */
export function readIntakeAdapterSnapshot(databasePath: string, projectId: ProjectId) {
  const database = new DatabaseSync(databasePath, {readOnly: true, timeout: PROJECT_STATE_BUSY_TIMEOUT_MS, defensive: true, allowExtension: false});
  try {
    database.exec("BEGIN");
    const records = all(database, `SELECT v.* FROM state_entities e JOIN state_entity_versions v
      ON v.project_id=e.project_id AND v.entity_id=e.entity_id AND v.record_version=e.current_record_version
      WHERE e.project_id=? AND e.entity_type IN ('Workflow', 'WorkflowIntake', 'Decision', 'ArchitectReviewCycle', 'ProjectPlanningReviewCycle', 'BoundedSolution', 'Finding', 'RootCause', 'Criterion', 'Evidence', 'WorkItem', 'WorkPhase')`, projectId).map(row => hydrateVersion(row));
    const relationships = all(database, "SELECT * FROM relationships WHERE project_id=?", projectId).map(hydrateRelationship);
    const outbox = all(database, "SELECT * FROM outbox_events WHERE project_id=? ORDER BY sequence", projectId).map(hydrateOutbox);
    const originalIntakes = all(database, "SELECT * FROM state_entity_versions WHERE project_id=? AND entity_type='WorkflowIntake' AND record_version=1", projectId).map(row => hydrateVersion(row) as ProjectStateRecord<"WorkflowIntake">);
    database.exec("COMMIT");
    return {records, relationships, outbox, originalIntakes};
  } finally { database.close(); }
}
