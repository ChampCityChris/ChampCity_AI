const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const test = require("node:test");
const { createInMemoryProjectStateStore } = require("../../dist/shared/projectState/inMemoryProjectStateStore.js");
const { createProjectStateService, PROJECT_STATE_EVENT_TYPES } = require("../../dist/shared/projectState/projectStateService.js");
const { createProjectStateEventDispatcher } = require("../../dist/shared/projectState/projectStateEventDispatcher.js");
const { createSQLiteProjectStateStore } = require("../../dist/main/projectState/sqliteProjectStateStore.js");

const principal = { principalId: "operator", principalType: "human", role: "Operator" };
const workBody = { workItemKind: "feature", title: "Work", objective: "Original", workState: "ready" };

function sqliteFixture(context) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-outbox-test-"));
  const store = createSQLiteProjectStateStore(path.join(root, "project-state.sqlite"));
  context.after(() => { store.close(); fs.rmSync(root, { recursive: true, force: true }); });
  return store;
}

function register(name, factory) {
  test(`${name}: canonical mutations append exact StateChange and event pairs`, async context => {
    const store = factory(context);
    const service = createProjectStateService(store, principal);
    const project = await service.createRecord(null, "Project", { name: "Project", description: "Synthetic" });
    const first = await service.createRecord(project.id, "WorkItem", workBody);
    await service.reviseRecord(project.id, first.id, { objective: "Revised" }, 1, { reason: "Operator revision", causationId: "cause-1", correlationId: "corr-1" });
    const second = await service.createRecord(project.id, "WorkItem", { ...workBody, title: "Second" });
    const relation = await service.createRelationship(project.id, first.id, "depends_on", second.id);
    await service.endRelationship(project.id, relation.id);
    await service.supersedeRecord(project.id, first.id, { ...workBody, objective: "Replacement" }, 2);
    const changes = await store.listStateChanges(project.id);
    const events = await store.listOutbox(project.id);
    assert.equal(changes.length, 9);
    assert.equal(events.length, 9);
    assert.deepEqual(events.map(event => event.sequence), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
    assert.deepEqual(new Set(changes.map(change => change.id)), new Set(events.map(event => event.id)));
    assert.deepEqual(events.map(event => event.eventType), [
      PROJECT_STATE_EVENT_TYPES.create, PROJECT_STATE_EVENT_TYPES.create, PROJECT_STATE_EVENT_TYPES.revise,
      PROJECT_STATE_EVENT_TYPES.create, PROJECT_STATE_EVENT_TYPES.relationshipCreate, PROJECT_STATE_EVENT_TYPES.relationshipEnd,
      PROJECT_STATE_EVENT_TYPES.supersede, PROJECT_STATE_EVENT_TYPES.create, PROJECT_STATE_EVENT_TYPES.relationshipCreate,
    ]);
    const revision = changes.find(change => change.reason === "Operator revision");
    assert.equal(revision.entityId, first.id);
    assert.equal(revision.fromRecordVersion, 1);
    assert.equal(revision.toRecordVersion, 2);
    assert.deepEqual(revision.changedFields, ["objective"]);
    assert.equal(revision.principal.principalId, principal.principalId);
    assert.equal(revision.causationId, "cause-1");
    assert.equal(revision.correlationId, "corr-1");
    const event = events.find(candidate => candidate.id === revision.id);
    assert.deepEqual(event.payload, { changeId: revision.id, operation: "revise", fromRecordVersion: 1, toRecordVersion: 2 });
    event.payload.operation = "caller edit";
    assert.equal((await store.listOutbox(project.id)).find(candidate => candidate.id === revision.id).payload.operation, "revise");
  });

  test(`${name}: event append failure rolls back canonical state and audit`, async context => {
    const store = factory(context);
    let attemptedId;
    const failing = {
      ...store,
      transaction(projectId, work) {
        return store.transaction(projectId, unit => work({ ...unit,
          saveEntity: async (...args) => { attemptedId = args[0].id; return unit.saveEntity(...args); },
          appendOutbox: async () => { throw Error("synthetic delivery write failure"); },
        }));
      },
    };
    const service = createProjectStateService(failing, principal);
    await assert.rejects(service.createRecord(null, "Project", { name: "Project", description: "Synthetic" }), /synthetic delivery write failure/);
    assert.ok(attemptedId);
    assert.equal(await store.getProject(attemptedId), null);
    assert.deepEqual(await store.listStateChanges(attemptedId), []);
    assert.deepEqual(await store.listOutbox(attemptedId), []);
  });

  test(`${name}: ordered dispatch acknowledges committed IDs and replay is idempotent`, async context => {
    const store = factory(context);
    const service = createProjectStateService(store, principal);
    const project = await service.createRecord(null, "Project", { name: "Project", description: "Synthetic" });
    await service.createRecord(project.id, "WorkItem", workBody);
    const delivered = new Set();
    const attempts = [];
    let failFirst = true;
    const dispatcher = createProjectStateEventDispatcher(store, { async deliver(event) {
      attempts.push(event.id);
      delivered.add(event.id);
      if (failFirst) { failFirst = false; throw Error("consumer failed after side effect"); }
    } });
    await assert.rejects(dispatcher.dispatch(project.id, 2), /consumer failed/);
    assert.equal((await store.listPendingOutbox(project.id, 2)).length, 2);
    const acknowledged = await dispatcher.dispatch(project.id, 2);
    assert.deepEqual(acknowledged, (await store.listOutbox(project.id)).map(event => event.id));
    assert.equal(attempts[0], attempts[1]);
    assert.equal(delivered.size, 2);
    assert.deepEqual(await dispatcher.dispatch(project.id, 2), []);
    assert.deepEqual(await store.listPendingOutbox(project.id, 2), []);
    assert.equal((await store.listOutbox(project.id)).length, 2);
    assert.equal(await store.acknowledgeOutbox(project.id, acknowledged[0]), true);
    assert.equal(await store.acknowledgeOutbox(randomUUID(), acknowledged[0]), false);
  });
}

register("in-memory Project State", () => createInMemoryProjectStateStore());
register("SQLite Project State", sqliteFixture);

test("SQLite audit and event rows reject edits while acknowledgments remain separate", async context => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-immutable-outbox-test-"));
  const file = path.join(root, "project-state.sqlite");
  const store = createSQLiteProjectStateStore(file);
  const inspection = new DatabaseSync(file);
  context.after(() => { inspection.close(); store.close(); fs.rmSync(root, { recursive: true, force: true }); });
  const service = createProjectStateService(store, principal);
  const project = await service.createRecord(null, "Project", { name: "Project", description: "Synthetic" });
  const event = (await store.listOutbox(project.id))[0];
  assert.throws(() => inspection.prepare("UPDATE state_changes SET reason = ? WHERE change_id = ?").run("tampered", event.id), /immutable/);
  assert.throws(() => inspection.prepare("DELETE FROM state_changes WHERE change_id = ?").run(event.id), /immutable/);
  assert.throws(() => inspection.prepare("UPDATE outbox_events SET event_type = ? WHERE event_id = ?").run("tampered", event.id), /immutable/);
  assert.throws(() => inspection.prepare("DELETE FROM outbox_events WHERE event_id = ?").run(event.id), /immutable/);
  assert.equal(await store.acknowledgeOutbox(project.id, event.id), true);
  assert.equal(inspection.prepare("SELECT COUNT(*) AS count FROM outbox_acknowledgments").get().count, 1);
  assert.equal((await store.listStateChanges(project.id)).length, 1);
  assert.equal((await store.listOutbox(project.id)).length, 1);
});
