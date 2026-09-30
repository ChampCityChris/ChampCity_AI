const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createProjectStateEntity, validateProjectStateEntity } = require("../../dist/shared/projectState/entityTypeRegistry.js");
const { createRelationship } = require("../../dist/shared/projectState/relationshipRegistry.js");
const { createProjectStateService } = require("../../dist/shared/projectState/projectStateService.js");
const { createSQLiteProjectStateStore } = require("../../dist/main/projectState/sqliteProjectStateStore.js");

const principal = { principalId: "operator", principalType: "human", role: "Operator" };
const workBody = { workItemKind: "feature", title: "Work", objective: "Original", workState: "ready" };

function fixture(context) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-history-test-"));
  const file = path.join(root, "project-state.sqlite");
  const store = createSQLiteProjectStateStore(file);
  let closed = false;
  const close = () => { if (!closed) { store.close(); closed = true; } };
  context.after(() => { close(); fs.rmSync(root, { recursive: true, force: true }); });
  return { file, store, close, service: createProjectStateService(store, principal) };
}

test("SQLite history follows multiple supersessions and survives reopen without rewriting versions", async context => {
  const { file, close, service } = fixture(context);
  const project = await service.createRecord(null, "Project", { name: "Project", description: "Synthetic" });
  const first = await service.createRecord(project.id, "WorkItem", workBody);
  await service.reviseRecord(project.id, first.id, { objective: "Revised" }, 1);
  assert.equal((await service.getLineage(project.id, first.id)).relationships.length, 0);
  const firstReplacement = await service.supersedeRecord(project.id, first.id, { ...workBody, objective: "Replacement one" }, 2);
  await assert.rejects(service.supersedeRecord(project.id, first.id, { ...workBody, objective: "Branch" }, 3), /Only a current/);
  await service.reviseRecord(project.id, firstReplacement.successor.id, { objective: "Replacement one revised" }, 1);
  const secondReplacement = await service.supersedeRecord(project.id, firstReplacement.successor.id, { ...workBody, objective: "Replacement two" }, 2);
  const expected = [
    [first.id, 1, "Original"], [first.id, 2, "Revised"], [first.id, 3, "Revised"],
    [firstReplacement.successor.id, 1, "Replacement one"], [firstReplacement.successor.id, 2, "Replacement one revised"],
    [firstReplacement.successor.id, 3, "Replacement one revised"], [secondReplacement.successor.id, 1, "Replacement two"],
  ];
  const history = await service.getRecordHistory(project.id, first.id);
  assert.deepEqual(history.records.map(record => [record.id, record.recordVersion, record.body.objective]), expected);
  assert.equal((await service.getCurrentRecord(project.id, first.id)).id, secondReplacement.successor.id);
  assert.equal((await service.getCurrentRecord(project.id, firstReplacement.successor.id)).id, secondReplacement.successor.id);
  assert.equal((await service.getLineage(project.id, first.id)).relationships.length, 2);
  close();
  const reopened = createSQLiteProjectStateStore(file);
  try {
    const rebuilt = createProjectStateService(reopened, principal);
    assert.deepEqual((await rebuilt.getRecordHistory(project.id, secondReplacement.successor.id)).records.map(record => [record.id, record.recordVersion, record.body.objective]), expected);
    assert.equal((await rebuilt.getCurrentRecord(project.id, first.id)).id, secondReplacement.successor.id);
  } finally { reopened.close(); }
});

test("history orders a same-timestamp successor by the explicit edge rather than lexical identity", async context => {
  const { store, service } = fixture(context);
  const project = await service.createRecord(null, "Project", { name: "Project", description: "Synthetic" });
  const at = new Date().toISOString();
  const original = validateProjectStateEntity({ ...createProjectStateEntity({ entityType: "WorkItem", projectId: project.id, body: workBody, principal }),
    id: "ffffffff-ffff-4fff-8fff-ffffffffffff", createdAt: at, updatedAt: at });
  const terminal = validateProjectStateEntity({ ...original, recordVersion: 2, lifecycleState: "superseded", supersededAt: at });
  const successor = validateProjectStateEntity({ ...createProjectStateEntity({ entityType: "WorkItem", projectId: project.id, body: { ...workBody, objective: "Corrected" }, principal }),
    id: "00000000-0000-4000-8000-000000000001", lineageId: original.lineageId, createdAt: at, updatedAt: at });
  const edge = createRelationship({ projectId: project.id, fromEntityId: successor.id, relationshipType: "supersedes", toEntityId: terminal.id, createdBy: principal }, id => id === successor.id ? successor : terminal);
  await store.transaction(project.id, async unit => {
    await unit.saveEntity(original, null);
    await unit.saveEntity(terminal, 1, { terminalSupersession: true });
    await unit.saveEntity(successor, null);
    await unit.saveRelationship(edge);
  });
  assert.deepEqual((await service.getRecordHistory(project.id, original.id)).records.map(record => record.id), [original.id, original.id, successor.id]);
  assert.equal((await service.getCurrentRecord(project.id, original.id)).id, successor.id);
});

test("issued Decision, Validation and Evidence require typed correction policy", async context => {
  const { store, service } = fixture(context);
  const project = await service.createRecord(null, "Project", { name: "Project", description: "Synthetic" });
  const work = await service.createRecord(project.id, "WorkItem", workBody);
  const decision = await service.recordDecision(project.id, work.id, { decisionType: "proceed", outcome: "approved", rationale: "Reviewed", decisionScope: "work" });
  const validation = await service.recordValidation(project.id, work.id, { validationType: "test", method: "inspection", outcome: "pass", summary: "Observed" });
  const evidence = await service.recordEvidence(project.id, work.id, { evidenceType: "output", description: "Proof", mediaType: "text/plain", payloadRef: "digest:proof", digest: "a".repeat(64) });
  await assert.rejects(service.reviseRecord(project.id, decision.id, { rationale: "Rewrite" }, 1), /Immutable/);
  await assert.rejects(service.supersedeRecord(project.id, decision.id, { ...decision.body, rationale: "Rewrite" }, 1), /typed correction policy/);
  await assert.rejects(service.supersedeRecord(project.id, validation.id, { ...validation.body, summary: "Rewrite" }, 1), /typed correction policy/);
  await assert.rejects(service.supersedeRecord(project.id, evidence.id, { ...evidence.body, description: "Rewrite" }, 1), /typed correction policy/);
  const later = await service.recordDecision(project.id, work.id, { decisionType: "proceed", outcome: "approved", rationale: "Later decision", decisionScope: "work" });
  assert.notEqual(later.lineageId, decision.lineageId);
  assert.equal((await service.getRecordHistory(project.id, decision.id)).records.length, 1);
  assert.equal((await service.getCurrentRecord(project.id, decision.id)).id, decision.id);
});
