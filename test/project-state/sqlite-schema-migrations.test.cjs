const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const test = require("node:test");
const { createProjectStateEntity } = require("../../dist/shared/projectState/entityTypeRegistry.js");
const { canonicalProjectStateBodyJson, openProjectStateDatabase, PROJECT_STATE_BUSY_TIMEOUT_MS, PROJECT_STATE_DATABASE_SCHEMA_VERSION } = require("../../dist/main/projectState/sqliteSchema.js");

function tempDatabase(work) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-schema-test-"));
  const file = path.join(root, "project-state.sqlite");
  try { return work(file); }
  finally { fs.rmSync(root, { recursive: true, force: true }); }
}

function configuration(database) {
  return {
    foreignKeys: database.prepare("PRAGMA foreign_keys").get().foreign_keys,
    journalMode: database.prepare("PRAGMA journal_mode").get().journal_mode,
    synchronous: database.prepare("PRAGMA synchronous").get().synchronous,
    busyTimeout: database.prepare("PRAGMA busy_timeout").get().timeout,
    userVersion: database.prepare("PRAGMA user_version").get().user_version,
  };
}

test("fresh SQLite schema migrates once and verifies configuration on reopen", () => tempDatabase(file => {
  let database = openProjectStateDatabase(file);
  try {
    assert.deepEqual(configuration(database), {
      foreignKeys: 1, journalMode: "wal", synchronous: 2,
      busyTimeout: PROJECT_STATE_BUSY_TIMEOUT_MS, userVersion: PROJECT_STATE_DATABASE_SCHEMA_VERSION,
    });
    assert.deepEqual(database.prepare("SELECT version, migration_id FROM schema_migrations ORDER BY version").all().map(row => ({ ...row })), [
      { version: 1, migration_id: "001_initial_project_state" },
      { version: 2, migration_id: "002_outbox_acknowledgments" },
      { version: 3, migration_id: "003_current_state_query_indexes" },
    ]);
    const tables = database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(row => row.name);
    assert.deepEqual(tables, ["outbox_acknowledgments", "outbox_events", "project_state_authority", "project_versions", "projects", "relationships", "schema_migrations", "state_changes", "state_entities", "state_entity_versions"]);
    assert.throws(() => database.enableLoadExtension(true), /extension|disabled/i);
  } finally { database.close(); }
  database = openProjectStateDatabase(file);
  try {
    assert.equal(database.prepare("SELECT COUNT(*) AS count FROM schema_migrations").get().count, 3);
    assert.deepEqual(configuration(database), {
      foreignKeys: 1, journalMode: "wal", synchronous: 2,
      busyTimeout: PROJECT_STATE_BUSY_TIMEOUT_MS, userVersion: PROJECT_STATE_DATABASE_SCHEMA_VERSION,
    });
  } finally { database.close(); }
}));

test("schema enforces Project ownership, JSON shape, version history and relation endpoints", () => tempDatabase(file => {
  const database = openProjectStateDatabase(file);
  const projectId = randomUUID();
  const entityId = randomUUID();
  const now = new Date().toISOString();
  const principalJson = JSON.stringify({ principalId: "system", principalType: "system", role: "state-service" });
  const provenanceJson = JSON.stringify({ origin: "native" });
  try {
    database.exec("BEGIN IMMEDIATE");
    database.prepare("INSERT INTO projects(project_id,current_record_version,lineage_id,lifecycle_state,created_at,updated_at) VALUES (?,?,?,?,?,?)")
      .run(projectId, 1, projectId, "active", now, now);
    database.prepare(`INSERT INTO project_versions(project_id,record_version,schema_version,lineage_id,lifecycle_state,created_at,created_by_json,updated_at,updated_by_json,provenance_json,body_json)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(projectId, 1, 1, projectId, "active", now, principalJson, now, principalJson, provenanceJson, '{"description":"Description","name":"Project"}');
    database.exec("COMMIT");
    assert.throws(() => database.prepare("UPDATE project_versions SET body_json = ? WHERE project_id = ?").run('{"name":"Changed"}', projectId), /immutable/);
    assert.throws(() => database.prepare("INSERT INTO state_entities(project_id,entity_id,entity_type,lineage_id,current_record_version,lifecycle_state,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)")
      .run(randomUUID(), randomUUID(), "WorkItem", randomUUID(), 1, "active", now, now), /FOREIGN KEY/);
    database.exec("BEGIN IMMEDIATE");
    database.prepare("INSERT INTO state_entities(project_id,entity_id,entity_type,lineage_id,current_record_version,lifecycle_state,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)")
      .run(projectId, entityId, "WorkItem", entityId, 1, "active", now, now);
    database.prepare(`INSERT INTO state_entity_versions(project_id,entity_id,record_version,entity_type,schema_version,lineage_id,lifecycle_state,created_at,created_by_json,updated_at,updated_by_json,provenance_json,body_json)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(projectId, entityId, 1, "WorkItem", 1, entityId, "active", now, principalJson, now, principalJson, provenanceJson, '{"objective":"Do work","title":"Work","workItemKind":"feature","workState":"ready"}');
    database.exec("COMMIT");
    assert.throws(() => database.prepare("UPDATE state_entity_versions SET body_json = ? WHERE entity_id = ?").run("{}", entityId), /immutable/);
    assert.throws(() => database.prepare("INSERT INTO state_entity_versions(project_id,entity_id,record_version,entity_type,schema_version,lineage_id,lifecycle_state,created_at,created_by_json,updated_at,updated_by_json,provenance_json,body_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .run(projectId, entityId, 2, "WorkItem", 1, entityId, "active", now, principalJson, now, principalJson, provenanceJson, "not-json"), /CHECK/);
    assert.throws(() => database.prepare("INSERT INTO state_entity_versions(project_id,entity_id,record_version,entity_type,schema_version,lineage_id,lifecycle_state,created_at,created_by_json,updated_at,updated_by_json,provenance_json,body_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .run(projectId, entityId, 2, "Finding", 1, entityId, "active", now, principalJson, now, principalJson, provenanceJson, "{}"), /FOREIGN KEY/);
    const insertRelation = database.prepare("INSERT INTO relationships(relationship_id,project_id,from_entity_id,relationship_type,to_entity_id,created_at,created_by_json) VALUES (?,?,?,?,?,?,?)");
    insertRelation.run(randomUUID(), projectId, projectId, "relates_to", entityId, now, principalJson);
    assert.throws(() => insertRelation.run(randomUUID(), projectId, entityId, "relates_to", randomUUID(), now, principalJson), /missing to endpoint/);
    assert.equal(database.prepare("PRAGMA foreign_key_check").all().length, 0);
  } finally { database.close(); }
}));

test("future, unknown and untracked migration states fail closed without rewriting the ledger", () => {
  tempDatabase(file => {
    const database = openProjectStateDatabase(file);
    database.exec("PRAGMA user_version = 99");
    database.close();
    assert.throws(() => openProjectStateDatabase(file), /future/);
    const inspection = new DatabaseSync(file, { readOnly: true });
    try { assert.equal(inspection.prepare("PRAGMA user_version").get().user_version, 99); }
    finally { inspection.close(); }
  });
  tempDatabase(file => {
    const database = openProjectStateDatabase(file);
    database.prepare("UPDATE schema_migrations SET migration_id = ? WHERE version = 1").run("001_unknown");
    database.close();
    assert.throws(() => openProjectStateDatabase(file), /Unknown or out-of-order/);
  });
  tempDatabase(file => {
    const database = new DatabaseSync(file);
    database.exec("CREATE TABLE unrelated (id INTEGER PRIMARY KEY)");
    database.close();
    assert.throws(() => openProjectStateDatabase(file), /Untracked/);
  });
  tempDatabase(file => {
    const database = openProjectStateDatabase(file);
    database.exec("DROP INDEX idx_state_entities_project_type");
    database.close();
    assert.throws(() => openProjectStateDatabase(file), /schema object is missing/);
  });
});

test("known version-one schema advances through outbox and query-index migrations once", () => tempDatabase(file => {
  let database = openProjectStateDatabase(file);
  database.exec(`DROP TABLE outbox_acknowledgments;
    DROP INDEX idx_outbox_events_event_project;
    DROP INDEX idx_state_entities_project_lifecycle_time;
    DROP INDEX idx_state_entities_project_lineage_version;
    DROP INDEX idx_state_entity_versions_project_type_time;
    DROP INDEX idx_relationships_project_type_from_to;
    DROP INDEX idx_relationships_project_type_to_from;
    DROP TRIGGER state_changes_immutable_update;
    DROP TRIGGER state_changes_immutable_delete;
    DROP TRIGGER outbox_events_immutable_update;
    DROP TRIGGER outbox_events_immutable_delete;
    DELETE FROM schema_migrations WHERE version >= 2;
    PRAGMA user_version = 1;`);
  database.close();
  database = openProjectStateDatabase(file);
  try {
    assert.equal(database.prepare("PRAGMA user_version").get().user_version, 3);
    assert.equal(database.prepare("SELECT COUNT(*) AS count FROM schema_migrations").get().count, 3);
    assert.equal(database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'outbox_acknowledgments'").get().name, "outbox_acknowledgments");
    assert.equal(database.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_relationships_project_type_to_from'").get().name, "idx_relationships_project_type_to_from");
  } finally { database.close(); }
}));

test("known version-two schema receives current-state query indexes without rewriting records", () => tempDatabase(file => {
  let database = openProjectStateDatabase(file);
  database.exec(`DROP INDEX idx_state_entities_project_lifecycle_time;
    DROP INDEX idx_state_entities_project_lineage_version;
    DROP INDEX idx_state_entity_versions_project_type_time;
    DROP INDEX idx_relationships_project_type_from_to;
    DROP INDEX idx_relationships_project_type_to_from;
    DELETE FROM schema_migrations WHERE version = 3;
    PRAGMA user_version = 2;`);
  database.close();
  database = openProjectStateDatabase(file);
  try {
    assert.equal(database.prepare("PRAGMA user_version").get().user_version, 3);
    assert.equal(database.prepare("SELECT COUNT(*) AS count FROM schema_migrations").get().count, 3);
    assert.equal(database.prepare("SELECT COUNT(*) AS count FROM state_entities").get().count, 0);
    assert.equal(database.prepare("SELECT COUNT(*) AS count FROM relationships").get().count, 0);
  } finally { database.close(); }
}));

test("version body serialization validates domain shape and sorts JSON keys", () => {
  const principal = { principalId: "system", principalType: "system", role: "state-service" };
  const record = createProjectStateEntity({ entityType: "Project", principal, body: { name: "Project", description: "Description" } });
  assert.equal(canonicalProjectStateBodyJson(record), '{"description":"Description","name":"Project"}');
  assert.throws(() => canonicalProjectStateBodyJson({ ...record, body: { name: "Project", description: "Description", extra: "unsupported" } }), /unsupported/);
});
