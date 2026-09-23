const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const test = require("node:test");
const { createProjectStateEntity } = require("../../dist/shared/projectState/entityTypeRegistry.js");
const { createRelationship } = require("../../dist/shared/projectState/relationshipRegistry.js");

const principal = { principalId: "system", principalType: "system", role: "conformance" };
const projectBody = { name: "Conformance", description: "Synthetic Project" };
const workBody = { workItemKind: "feature", title: "Work", objective: "Objective", workState: "ready" };

/** Run this unchanged against each ProjectStateStore implementation. */
function registerProjectStateStoreConformance(name, factory) {
  test(`${name}: atomic Project/entity versions and optimistic writes`, async context => {
    const store = await factory(context);
    const project = createProjectStateEntity({ entityType: "Project", body: projectBody, principal });
    const item = createProjectStateEntity({ entityType: "WorkItem", projectId: project.id, body: workBody, principal });
    await assert.rejects(store.transaction(project.id, async unit => {
      await unit.saveEntity(project, null);
      await unit.saveEntity(item, null);
      throw Error("abort transaction");
    }), /abort transaction/);
    assert.equal(await store.getProject(project.id), null);
    await store.transaction(project.id, async unit => {
      await unit.saveEntity(project, null);
      await unit.saveEntity(item, null);
    });
    assert.equal((await store.getProject(project.id)).id, project.id);
    const revised = { ...item, recordVersion: 2, body: { ...item.body, objective: "Revised" } };
    await store.transaction(project.id, unit => unit.saveEntity(revised, 1));
    assert.equal((await store.getEntity(project.id, item.id)).body.objective, "Revised");
    assert.equal((await store.getEntityVersion(project.id, item.id, 1)).body.objective, "Objective");
    await assert.rejects(store.transaction(project.id, unit => unit.saveEntity({ ...revised, recordVersion: 3 }, 1)), error => error.code === "STALE_STATE");
    assert.equal((await store.getEntity(project.id, item.id)).recordVersion, 2);
    const read = await store.getEntity(project.id, item.id);
    read.body.objective = "caller mutation";
    assert.equal((await store.getEntity(project.id, item.id)).body.objective, "Revised");
  });

  test(`${name}: relationship rules and Project isolation`, async context => {
    const store = await factory(context);
    const project = createProjectStateEntity({ entityType: "Project", body: projectBody, principal });
    const otherProject = createProjectStateEntity({ entityType: "Project", body: projectBody, principal });
    const item = createProjectStateEntity({ entityType: "WorkItem", projectId: project.id, body: workBody, principal });
    const dependency = createProjectStateEntity({ entityType: "WorkItem", projectId: project.id, body: workBody, principal });
    await store.transaction(project.id, async unit => {
      await unit.saveEntity(project, null);
      await unit.saveEntity(item, null);
      await unit.saveEntity(dependency, null);
      const edge = createRelationship({ projectId: project.id, fromEntityId: item.id, relationshipType: "depends_on", toEntityId: dependency.id, createdBy: principal }, id => id === item.id ? item : dependency);
      await unit.saveRelationship(edge);
      assert.equal((await unit.listRelationships(project.id)).length, 1);
    });
    await store.transaction(otherProject.id, unit => unit.saveEntity(otherProject, null));
    assert.equal((await store.listEntities(otherProject.id)).length, 1);
    assert.equal((await store.getEntity(otherProject.id, item.id)), null);
    assert.equal((await store.listRelationships(otherProject.id)).length, 0);
    await assert.rejects(store.transaction(otherProject.id, unit => unit.saveEntity(item, null)), error => error.code === "PROJECT_MISMATCH");
    const edge = (await store.listRelationships(project.id))[0];
    await store.transaction(project.id, unit => unit.endRelationship(edge.id, new Date().toISOString()));
    assert.ok((await store.listRelationships(project.id))[0].endedAt);
  });

  test(`${name}: audit, outbox and provider generation commit or roll back together`, async context => {
    const store = await factory(context);
    const project = createProjectStateEntity({ entityType: "Project", body: projectBody, principal });
    const occurredAt = new Date().toISOString();
    const change = { id: randomUUID(), projectId: project.id, entityId: project.id, fromRecordVersion: null, toRecordVersion: 1, operation: "create", principal, occurredAt, changedFields: ["name"], reason: "conformance" };
    const event = { id: randomUUID(), projectId: project.id, eventType: "project-created", entityId: project.id, occurredAt, payload: { version: 1 } };
    await assert.rejects(store.transaction(project.id, async unit => {
      await unit.saveEntity(project, null);
      await unit.appendStateChange(change);
      await unit.appendOutbox(event);
      await unit.advanceProviderGeneration({ projectId: project.id, generation: 1, authority: "legacy", updatedAt: occurredAt }, null);
      throw Error("abort transaction");
    }), /abort transaction/);
    assert.equal((await store.listOutbox(project.id)).length, 0);
    assert.equal(await store.getProviderGeneration(project.id), null);
    await store.transaction(project.id, async unit => {
      await unit.saveEntity(project, null);
      await unit.appendStateChange(change);
      assert.equal((await unit.appendOutbox(event)).sequence, 1);
      await unit.advanceProviderGeneration({ projectId: project.id, generation: 1, authority: "legacy", updatedAt: occurredAt }, null);
    });
    assert.equal((await store.listStateChanges(project.id)).length, 1);
    assert.equal((await store.listOutbox(project.id, 0)).length, 1);
    assert.equal((await store.listOutbox(project.id, 1)).length, 0);
    assert.equal((await store.getProviderGeneration(project.id)).generation, 1);
    await assert.rejects(store.transaction(project.id, unit => unit.advanceProviderGeneration({ projectId: project.id, generation: 2, authority: "structured", updatedAt: occurredAt }, null)), error => error.code === "STALE_STATE");
  });

  test(`${name}: concurrent writers serialize while readers see committed state`, async context => {
    const store = await factory(context);
    const project = createProjectStateEntity({ entityType: "Project", body: projectBody, principal });
    const item = createProjectStateEntity({ entityType: "WorkItem", projectId: project.id, body: workBody, principal });
    await store.transaction(project.id, async unit => { await unit.saveEntity(project, null); await unit.saveEntity(item, null); });
    let release;
    let entered;
    const enteredGate = new Promise(resolve => { entered = resolve; });
    const exitGate = new Promise(resolve => { release = resolve; });
    const first = store.transaction(project.id, async unit => {
      await unit.saveEntity({ ...item, recordVersion: 2, body: { ...item.body, objective: "first" } }, 1);
      entered();
      await exitGate;
    });
    await enteredGate;
    assert.equal((await store.getEntity(project.id, item.id)).recordVersion, 1);
    const second = store.transaction(project.id, unit => unit.saveEntity({ ...item, recordVersion: 2, body: { ...item.body, objective: "second" } }, 1));
    const secondFailure = assert.rejects(second, error => error.code === "STALE_STATE");
    release();
    await first;
    await secondFailure;
    assert.equal((await store.getEntity(project.id, item.id)).body.objective, "first");
  });
}

module.exports = { registerProjectStateStoreConformance };
