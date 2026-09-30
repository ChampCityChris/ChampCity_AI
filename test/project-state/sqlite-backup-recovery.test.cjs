const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createSQLiteProjectStateStore } = require("../../dist/main/projectState/sqliteProjectStateStore.js");
const { createSQLiteProjectStateRecovery } = require("../../dist/main/projectState/sqliteProjectStateRecovery.js");
const { createProjectStateService } = require("../../dist/shared/projectState/projectStateService.js");

const operator = { principalId: "operator", principalType: "human", role: "Operator" };

function fixture(context, policy) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-backup-test-"));
  const databasePath = path.join(root, "project-state.sqlite");
  const store = createSQLiteProjectStateStore(databasePath);
  const recovery = createSQLiteProjectStateRecovery(databasePath, store, policy);
  context.after(() => { store.close(); fs.rmSync(root, { recursive: true, force: true }); });
  return { root, databasePath, store, recovery, service: createProjectStateService(store, operator) };
}

test("online backup and isolated selected candidate preserve records, history, relationships and audit", async context => {
  const f = fixture(context);
  const project = await f.service.createRecord(null, "Project", { name: "Synthetic", description: "Project" });
  const work = await f.service.createRecord(project.id, "WorkItem", { workItemKind: "feature", title: "Work", objective: "Build", workState: "ready" });
  const repair = await f.service.createRecord(project.id, "WorkItem", { workItemKind: "repair", title: "Repair", objective: "Fix", workState: "ready" });
  await f.service.createRelationship(project.id, repair.id, "repairs", work.id);
  await f.service.reviseRecord(project.id, work.id, { objective: "Build safely" }, 1);
  const before = await f.service.exportStructuredProjectState(project.id);
  const backup = await f.recovery.createBackup();
  assert.equal(backup.projectIds[0], project.id);
  assert.equal(backup.pages > 0, true);
  assert.equal(backup.bytes > 0, true);
  assert.match(backup.sha256, /^[a-f0-9]{64}$/);
  const backupFile = path.join(f.root, "project-state-backups", backup.fileName);
  assert.equal(fs.existsSync(backupFile), true);
  const candidate = await f.recovery.prepareRestoreCandidate(backup.id, [project.id]);
  assert.equal(candidate.status, "prepared");
  const candidatePath = path.join(f.root, "project-state-backups", "candidates", candidate.fileName);
  assert.equal(fs.existsSync(candidatePath), true);
  assert.notEqual(candidatePath, f.databasePath);
  const selected = f.recovery.selectVerifiedCandidate(candidate.id, [project.id]);
  try {
    assert.equal(selected.evidence.status, "selected");
    const restored = createProjectStateService(selected.store, operator);
    const after = await restored.exportStructuredProjectState(project.id);
    assert.deepEqual(after.records, before.records);
    assert.deepEqual(after.history, before.history);
    assert.deepEqual(after.relationships, before.relationships);
    assert.deepEqual(after.stateChanges, before.stateChanges);
  } finally { selected.store.close(); }
  assert.equal((await f.service.getRecord(project.id, work.id)).body.objective, "Build safely");
  assert.equal(f.recovery.listEvidence().recoveries[0].status, "selected");
});

test("corrupt backup, tampered candidate and wrong Project identity fail before selection", async context => {
  const f = fixture(context);
  const project = await f.service.createRecord(null, "Project", { name: "Synthetic", description: "Project" });
  const first = await f.recovery.createBackup();
  await assert.rejects(f.recovery.prepareRestoreCandidate(first.id, ["00000000-0000-4000-8000-000000000001"]), /identities do not match/);
  const candidate = await f.recovery.prepareRestoreCandidate(first.id, [project.id]);
  const candidatePath = path.join(f.root, "project-state-backups", "candidates", candidate.fileName);
  fs.appendFileSync(candidatePath, "tamper");
  assert.throws(() => f.recovery.selectVerifiedCandidate(candidate.id, [project.id]), /differs from verified evidence/);
  const backupPath = path.join(f.root, "project-state-backups", first.fileName);
  fs.writeFileSync(backupPath, "corrupt");
  await assert.rejects(f.recovery.prepareRestoreCandidate(first.id, [project.id]), /evidence or Project identities do not match/);
  assert.equal((await f.service.getRecord(project.id, project.id)).id, project.id);
});

test("bounded retention removes only managed old snapshots and rejects live-file backup destination", async context => {
  const policy = { maxBackups: 2, maxAgeDays: 30, maxCandidates: 2 };
  const f = fixture(context, policy);
  const project = await f.service.createRecord(null, "Project", { name: "Synthetic", description: "Project" });
  const first = await f.recovery.createBackup();
  const second = await f.recovery.createBackup();
  const candidate = await f.recovery.prepareRestoreCandidate(second.id, [project.id]);
  const selected = f.recovery.selectVerifiedCandidate(candidate.id, [project.id]);
  selected.store.close();
  await f.recovery.createBackup();
  const listing = f.recovery.listEvidence();
  assert.deepEqual(listing.policy, policy);
  assert.equal(listing.backups.length, 2);
  assert.equal(listing.backups.some(item => item.id === first.id), false);
  assert.equal(fs.existsSync(path.join(f.root, "project-state-backups", first.fileName)), false);
  assert.equal(fs.existsSync(selected.candidatePath), true);
  assert.equal(fs.existsSync(f.databasePath), true);
  await assert.rejects(f.store.createOnlineBackup(f.databasePath), /storage boundary/);
  await assert.rejects(f.store.createOnlineBackup(path.join(path.dirname(f.root), "outside.sqlite")), /storage boundary/);
  assert.equal((await f.service.getRecord(project.id, project.id)).id, project.id);
});
