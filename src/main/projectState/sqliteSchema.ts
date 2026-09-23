import { DatabaseSync } from "node:sqlite";
import { validateProjectStateEntity } from "../../shared/projectState/entityTypeRegistry";

/** Database schema versions are independent of the semantic record schema version. */
export const PROJECT_STATE_DATABASE_SCHEMA_VERSION = 1;
export const PROJECT_STATE_BUSY_TIMEOUT_MS = 1_000;

function sortedJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortedJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0).map(([key, item]) => [key, sortedJson(item)]));
  }
  return value;
}

/** The adapter must pass validated records through this serializer before inserting version payloads. */
export function canonicalProjectStateBodyJson(record: unknown): string {
  return JSON.stringify(sortedJson(validateProjectStateEntity(record).body));
}

interface Migration { version: number; id: string; sql: string }

const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    id: "001_initial_project_state",
    sql: `
      CREATE TABLE schema_migrations (
        version INTEGER PRIMARY KEY CHECK (version > 0),
        migration_id TEXT NOT NULL UNIQUE,
        applied_at TEXT NOT NULL
      ) STRICT;

      CREATE TABLE projects (
        project_id TEXT PRIMARY KEY,
        current_record_version INTEGER NOT NULL CHECK (current_record_version > 0),
        lineage_id TEXT NOT NULL,
        lifecycle_state TEXT NOT NULL CHECK (lifecycle_state IN ('active','closed','archived','superseded','voided')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        closed_at TEXT,
        superseded_at TEXT,
        UNIQUE (project_id, lineage_id),
        FOREIGN KEY (project_id, current_record_version)
          REFERENCES project_versions (project_id, record_version) DEFERRABLE INITIALLY DEFERRED
      ) STRICT;

      CREATE TABLE project_versions (
        project_id TEXT NOT NULL,
        record_version INTEGER NOT NULL CHECK (record_version > 0),
        schema_version INTEGER NOT NULL CHECK (schema_version > 0),
        lineage_id TEXT NOT NULL,
        lifecycle_state TEXT NOT NULL CHECK (lifecycle_state IN ('active','closed','archived','superseded','voided')),
        disposition_state TEXT CHECK (disposition_state IN ('none','advisory','proposed','approved','revision_requested','accepted','rejected','revoked')),
        created_at TEXT NOT NULL,
        created_by_json TEXT NOT NULL CHECK (CASE WHEN json_valid(created_by_json) THEN json_type(created_by_json) = 'object' ELSE 0 END),
        updated_at TEXT NOT NULL,
        updated_by_json TEXT NOT NULL CHECK (CASE WHEN json_valid(updated_by_json) THEN json_type(updated_by_json) = 'object' ELSE 0 END),
        closed_at TEXT,
        superseded_at TEXT,
        provenance_json TEXT NOT NULL CHECK (CASE WHEN json_valid(provenance_json) THEN json_type(provenance_json) = 'object' ELSE 0 END),
        body_json TEXT NOT NULL CHECK (CASE WHEN json_valid(body_json) THEN json_type(body_json) = 'object' ELSE 0 END),
        PRIMARY KEY (project_id, record_version),
        FOREIGN KEY (project_id, lineage_id) REFERENCES projects (project_id, lineage_id) ON DELETE RESTRICT
      ) STRICT;

      CREATE TABLE state_entities (
        project_id TEXT NOT NULL,
        entity_id TEXT NOT NULL UNIQUE,
        entity_type TEXT NOT NULL CHECK (entity_type <> 'Project'),
        lineage_id TEXT NOT NULL,
        current_record_version INTEGER NOT NULL CHECK (current_record_version > 0),
        lifecycle_state TEXT NOT NULL CHECK (lifecycle_state IN ('active','closed','archived','superseded','voided')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        closed_at TEXT,
        superseded_at TEXT,
        PRIMARY KEY (project_id, entity_id),
        UNIQUE (project_id, entity_id, entity_type, lineage_id),
        FOREIGN KEY (project_id) REFERENCES projects (project_id) ON DELETE RESTRICT,
        FOREIGN KEY (project_id, entity_id, current_record_version)
          REFERENCES state_entity_versions (project_id, entity_id, record_version) DEFERRABLE INITIALLY DEFERRED
      ) STRICT;

      CREATE TABLE state_entity_versions (
        project_id TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        record_version INTEGER NOT NULL CHECK (record_version > 0),
        entity_type TEXT NOT NULL CHECK (entity_type <> 'Project'),
        schema_version INTEGER NOT NULL CHECK (schema_version > 0),
        lineage_id TEXT NOT NULL,
        lifecycle_state TEXT NOT NULL CHECK (lifecycle_state IN ('active','closed','archived','superseded','voided')),
        disposition_state TEXT CHECK (disposition_state IN ('none','advisory','proposed','approved','revision_requested','accepted','rejected','revoked')),
        created_at TEXT NOT NULL,
        created_by_json TEXT NOT NULL CHECK (CASE WHEN json_valid(created_by_json) THEN json_type(created_by_json) = 'object' ELSE 0 END),
        updated_at TEXT NOT NULL,
        updated_by_json TEXT NOT NULL CHECK (CASE WHEN json_valid(updated_by_json) THEN json_type(updated_by_json) = 'object' ELSE 0 END),
        closed_at TEXT,
        superseded_at TEXT,
        provenance_json TEXT NOT NULL CHECK (CASE WHEN json_valid(provenance_json) THEN json_type(provenance_json) = 'object' ELSE 0 END),
        body_json TEXT NOT NULL CHECK (CASE WHEN json_valid(body_json) THEN json_type(body_json) = 'object' ELSE 0 END),
        PRIMARY KEY (project_id, entity_id, record_version),
        FOREIGN KEY (project_id, entity_id, entity_type, lineage_id)
          REFERENCES state_entities (project_id, entity_id, entity_type, lineage_id) ON DELETE RESTRICT
      ) STRICT;

      CREATE TABLE relationships (
        relationship_id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        from_entity_id TEXT NOT NULL,
        relationship_type TEXT NOT NULL,
        to_entity_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        created_by_json TEXT NOT NULL CHECK (CASE WHEN json_valid(created_by_json) THEN json_type(created_by_json) = 'object' ELSE 0 END),
        ended_at TEXT,
        CHECK (from_entity_id <> to_entity_id),
        CHECK (ended_at IS NULL OR ended_at >= created_at),
        FOREIGN KEY (project_id) REFERENCES projects (project_id) ON DELETE RESTRICT
      ) STRICT;

      CREATE TABLE state_changes (
        change_id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        from_record_version INTEGER CHECK (from_record_version IS NULL OR from_record_version > 0),
        to_record_version INTEGER NOT NULL CHECK (to_record_version > 0),
        operation TEXT NOT NULL CHECK (operation IN ('create','revise','supersede','relationship-create','relationship-end')),
        principal_json TEXT NOT NULL CHECK (CASE WHEN json_valid(principal_json) THEN json_type(principal_json) = 'object' ELSE 0 END),
        occurred_at TEXT NOT NULL,
        changed_fields_json TEXT NOT NULL CHECK (CASE WHEN json_valid(changed_fields_json) THEN json_type(changed_fields_json) = 'array' ELSE 0 END),
        reason TEXT NOT NULL,
        causation_id TEXT,
        correlation_id TEXT,
        FOREIGN KEY (project_id) REFERENCES projects (project_id) ON DELETE RESTRICT
      ) STRICT;

      CREATE TABLE outbox_events (
        event_id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        sequence INTEGER NOT NULL CHECK (sequence > 0),
        event_type TEXT NOT NULL,
        entity_id TEXT,
        occurred_at TEXT NOT NULL,
        payload_json TEXT NOT NULL CHECK (CASE WHEN json_valid(payload_json) THEN json_type(payload_json) = 'object' ELSE 0 END),
        UNIQUE (project_id, sequence),
        FOREIGN KEY (project_id) REFERENCES projects (project_id) ON DELETE RESTRICT
      ) STRICT;

      CREATE TABLE project_state_authority (
        project_id TEXT PRIMARY KEY,
        generation INTEGER NOT NULL CHECK (generation > 0),
        authority TEXT NOT NULL CHECK (authority IN ('legacy','structured')),
        updated_at TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects (project_id) ON DELETE RESTRICT
      ) STRICT;

      CREATE INDEX idx_state_entities_project_type ON state_entities (project_id, entity_type, lifecycle_state);
      CREATE INDEX idx_state_entities_project_lineage ON state_entities (project_id, lineage_id);
      CREATE INDEX idx_state_entity_versions_project_time ON state_entity_versions (project_id, updated_at);
      CREATE INDEX idx_relationships_project_from ON relationships (project_id, from_entity_id, relationship_type);
      CREATE INDEX idx_relationships_project_to ON relationships (project_id, to_entity_id, relationship_type);
      CREATE INDEX idx_state_changes_project_time ON state_changes (project_id, occurred_at);
      CREATE INDEX idx_outbox_events_project_sequence ON outbox_events (project_id, sequence);

      CREATE TRIGGER relationships_insert_endpoints BEFORE INSERT ON relationships BEGIN
        SELECT CASE WHEN NOT (
          NEW.from_entity_id = NEW.project_id OR EXISTS (
            SELECT 1 FROM state_entities WHERE project_id = NEW.project_id AND entity_id = NEW.from_entity_id
          )
        ) THEN RAISE(ABORT, 'missing from endpoint') END;
        SELECT CASE WHEN NOT (
          NEW.to_entity_id = NEW.project_id OR EXISTS (
            SELECT 1 FROM state_entities WHERE project_id = NEW.project_id AND entity_id = NEW.to_entity_id
          )
        ) THEN RAISE(ABORT, 'missing to endpoint') END;
      END;
      CREATE TRIGGER relationships_fixed_endpoints BEFORE UPDATE OF project_id, from_entity_id, relationship_type, to_entity_id ON relationships
        BEGIN SELECT RAISE(ABORT, 'relationship endpoints are immutable'); END;
      CREATE TRIGGER project_versions_immutable_update BEFORE UPDATE ON project_versions
        BEGIN SELECT RAISE(ABORT, 'project versions are immutable'); END;
      CREATE TRIGGER project_versions_immutable_delete BEFORE DELETE ON project_versions
        BEGIN SELECT RAISE(ABORT, 'project versions are immutable'); END;
      CREATE TRIGGER state_entity_versions_immutable_update BEFORE UPDATE ON state_entity_versions
        BEGIN SELECT RAISE(ABORT, 'entity versions are immutable'); END;
      CREATE TRIGGER state_entity_versions_immutable_delete BEFORE DELETE ON state_entity_versions
        BEGIN SELECT RAISE(ABORT, 'entity versions are immutable'); END;
    `,
  },
];

const REQUIRED_SCHEMA_OBJECTS: Readonly<Record<string, readonly string[]>> = {
  table: ["schema_migrations", "projects", "project_versions", "state_entities", "state_entity_versions", "relationships", "state_changes", "outbox_events", "project_state_authority"],
  index: ["idx_state_entities_project_type", "idx_state_entities_project_lineage", "idx_state_entity_versions_project_time", "idx_relationships_project_from", "idx_relationships_project_to", "idx_state_changes_project_time", "idx_outbox_events_project_sequence"],
  trigger: ["relationships_insert_endpoints", "relationships_fixed_endpoints", "project_versions_immutable_update", "project_versions_immutable_delete", "state_entity_versions_immutable_update", "state_entity_versions_immutable_delete"],
};

function requireSafeWalVersion(version: string): void {
  const parts = /^([0-9]+)\.([0-9]+)\.([0-9]+)$/.exec(version)?.slice(1).map(Number);
  if (!parts || parts[0] < 3 || (parts[0] === 3 && (parts[1] < 51 || (parts[1] === 51 && parts[2] < 3)))) {
    throw new Error("Project State requires SQLite 3.51.3 or newer for WAL safety.");
  }
}

function scalar<T>(database: DatabaseSync, sql: string): T {
  const row = database.prepare(sql).get();
  if (!row) throw new Error(`Missing SQLite pragma result: ${sql}`);
  return Object.values(row)[0] as T;
}

function verifyConfiguration(database: DatabaseSync): void {
  if (scalar<number>(database, "PRAGMA foreign_keys") !== 1) throw new Error("Project State foreign keys are disabled.");
  if (String(scalar<string>(database, "PRAGMA journal_mode")).toLowerCase() !== "wal") throw new Error("Project State WAL mode is unavailable.");
  if (scalar<number>(database, "PRAGMA synchronous") !== 2) throw new Error("Project State synchronous FULL is unavailable.");
  if (scalar<number>(database, "PRAGMA busy_timeout") !== PROJECT_STATE_BUSY_TIMEOUT_MS) throw new Error("Project State busy timeout is not bounded as configured.");
}

function migrate(database: DatabaseSync): void {
  const userVersion = scalar<number>(database, "PRAGMA user_version");
  if (userVersion > PROJECT_STATE_DATABASE_SCHEMA_VERSION) throw new Error("Unsupported future Project State database schema version.");
  const tables = database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all() as Array<{ name: string }>;
  const hasLedger = tables.some(row => row.name === "schema_migrations");
  if (!hasLedger && (tables.length > 0 || userVersion !== 0)) throw new Error("Untracked Project State database schema is not supported.");
  const rows = hasLedger
    ? database.prepare("SELECT version, migration_id FROM schema_migrations ORDER BY version").all() as Array<{ version: number; migration_id: string }>
    : [];
  if (rows.length > MIGRATIONS.length) throw new Error("Unsupported future Project State migration ledger.");
  rows.forEach((row, index) => {
    const expected = MIGRATIONS[index];
    if (row.version !== expected.version || row.migration_id !== expected.id) throw new Error("Unknown or out-of-order Project State migration.");
  });
  if (userVersion !== rows.length) throw new Error("Project State migration ledger and schema version disagree.");
  for (const migration of MIGRATIONS.slice(rows.length)) {
    database.exec("BEGIN IMMEDIATE");
    try {
      database.exec(migration.sql);
      database.prepare("INSERT INTO schema_migrations(version, migration_id, applied_at) VALUES (?, ?, ?)")
        .run(migration.version, migration.id, new Date().toISOString());
      database.exec(`PRAGMA user_version = ${migration.version}`);
      database.exec("COMMIT");
    } catch (error) {
      if (database.isTransaction) database.exec("ROLLBACK");
      throw error;
    }
  }
  if (scalar<number>(database, "PRAGMA user_version") !== PROJECT_STATE_DATABASE_SCHEMA_VERSION) throw new Error("Project State database schema version did not advance.");
  const applied = database.prepare("SELECT version, migration_id FROM schema_migrations ORDER BY version").all() as Array<{ version: number; migration_id: string }>;
  if (applied.length !== MIGRATIONS.length || applied.some((row, index) => row.version !== MIGRATIONS[index].version || row.migration_id !== MIGRATIONS[index].id)) {
    throw new Error("Project State migration ledger failed verification.");
  }
  const objects = database.prepare("SELECT type, name FROM sqlite_master WHERE name NOT LIKE 'sqlite_%'").all() as Array<{ type: string; name: string }>;
  const actual = new Set(objects.map(row => `${row.type}:${row.name}`));
  for (const [type, names] of Object.entries(REQUIRED_SCHEMA_OBJECTS)) {
    for (const name of names) if (!actual.has(`${type}:${name}`)) throw new Error(`Required Project State schema object is missing: ${name}.`);
  }
  if (database.prepare("PRAGMA foreign_key_check").all().length !== 0 || scalar<string>(database, "PRAGMA integrity_check") !== "ok") {
    throw new Error("Project State database integrity verification failed.");
  }
}

/** Open only a caller-selected local file path; Service Host path ownership is outside this schema layer. */
export function openProjectStateDatabase(databasePath: string): DatabaseSync {
  if (!databasePath || databasePath === ":memory:" || databasePath.startsWith("file:")) throw new Error("Project State requires a file path.");
  const database = new DatabaseSync(databasePath, { timeout: PROJECT_STATE_BUSY_TIMEOUT_MS, defensive: true, allowExtension: false });
  try {
    const version = database.prepare("SELECT sqlite_version() AS version").get() as { version: string };
    requireSafeWalVersion(version.version);
    if (typeof database.enableDefensive === "function") database.enableDefensive(true);
    database.exec(`PRAGMA foreign_keys = ON; PRAGMA synchronous = FULL; PRAGMA busy_timeout = ${PROJECT_STATE_BUSY_TIMEOUT_MS};`);
    if (String(scalar<string>(database, "PRAGMA journal_mode = WAL")).toLowerCase() !== "wal") throw new Error("Project State WAL mode is unavailable.");
    verifyConfiguration(database);
    migrate(database);
    verifyConfiguration(database);
    return database;
  } catch (error) {
    database.close();
    throw error;
  }
}
