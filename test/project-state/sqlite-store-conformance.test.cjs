const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const test = require("node:test");
const { createProjectStateEntity } = require("../../dist/shared/projectState/entityTypeRegistry.js");
const { createSQLiteProjectStateStore } = require("../../dist/main/projectState/sqliteProjectStateStore.js");
const { registerProjectStateStoreConformance } = require("../support/project-state-store-conformance.cjs");

function fixture(context) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-sqlite-store-test-"));
  const file = path.join(root, "project-state.sqlite");
  const store = createSQLiteProjectStateStore(file);
  context.after(() => { store.close(); fs.rmSync(root, { recursive: true, force: true }); });
  return store;
}

registerProjectStateStoreConformance("SQLite ProjectStateStore", fixture);

test("SQLite transaction rolls back versions, audit and outbox after a stale mutation", async context => {
  const store = fixture(context);
  const principal = { principalId: "system", principalType: "system", role: "test" };
  const project = createProjectStateEntity({ entityType: "Project", body: { name: "Project", description: "Synthetic" }, principal });
  const item = createProjectStateEntity({ entityType: "WorkItem", projectId: project.id, body: { workItemKind: "feature", title: "Work", objective: "Original", workState: "ready" }, principal });
  await store.transaction(project.id, async unit => { await unit.saveEntity(project, null); await unit.saveEntity(item, null); });
  const revised = { ...item, recordVersion: 2, body: { ...item.body, objective: "Pending" } };
  const at = new Date().toISOString();
  await assert.rejects(store.transaction(project.id, async unit => {
    await unit.saveEntity(revised, 1);
    await unit.appendStateChange({ id: randomUUID(), projectId: project.id, entityId: item.id, fromRecordVersion: 1, toRecordVersion: 2, operation: "revise", principal, occurredAt: at, changedFields: ["objective"], reason: "test" });
    await unit.appendOutbox({ id: randomUUID(), projectId: project.id, entityId: item.id, eventType: "revised", occurredAt: at, payload: { version: 2 } });
    await unit.saveEntity({ ...revised, recordVersion: 3 }, 1);
  }), error => error.code === "STALE_STATE");
  assert.equal((await store.getEntity(project.id, item.id)).recordVersion, 1);
  assert.equal(await store.getEntityVersion(project.id, item.id, 2), null);
  assert.deepEqual(await store.listStateChanges(project.id), []);
  assert.deepEqual(await store.listOutbox(project.id), []);
});

test("SQLite committed records persist across store reconstruction and closed units reject access", async context => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-sqlite-reopen-test-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const file = path.join(root, "project-state.sqlite");
  const principal = { principalId: "system", principalType: "system", role: "test" };
  const project = createProjectStateEntity({ entityType: "Project", body: { name: "Persisted", description: "Synthetic" }, principal });
  const first = createSQLiteProjectStateStore(file);
  let escapedUnit;
  await first.transaction(project.id, async unit => { escapedUnit = unit; await unit.saveEntity(project, null); });
  await assert.rejects(escapedUnit.getProject(project.id), error => error.code === "INVALID_STATE");
  first.close();
  const reopened = createSQLiteProjectStateStore(file);
  try { assert.equal((await reopened.getProject(project.id)).body.name, "Persisted"); }
  finally { reopened.close(); }
});

test("SQLite lock contention maps to a typed store error without a retry loop", async context => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-sqlite-busy-test-"));
  const file = path.join(root, "project-state.sqlite");
  const store = createSQLiteProjectStateStore(file);
  const blocker = new DatabaseSync(file);
  context.after(() => { blocker.close(); store.close(); fs.rmSync(root, { recursive: true, force: true }); });
  blocker.exec("BEGIN IMMEDIATE");
  try {
    await assert.rejects(store.transaction(randomUUID(), async () => {}), error => error.code === "STORE_BUSY");
  } finally { blocker.exec("ROLLBACK"); }
});

test("SQLite store rejects an untracked schema through a typed boundary", context => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-sqlite-untracked-test-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const file = path.join(root, "project-state.sqlite");
  const database = new DatabaseSync(file);
  database.exec("CREATE TABLE unrelated (id INTEGER PRIMARY KEY)");
  database.close();
  assert.throws(() => createSQLiteProjectStateStore(file), error => error.code === "INVALID_STATE");
});
