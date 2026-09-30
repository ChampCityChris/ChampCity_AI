const assert = require("node:assert/strict");
const test = require("node:test");
const { createInMemoryProjectStateStore } = require("../../dist/shared/projectState/inMemoryProjectStateStore.js");
const { createProjectStateService } = require("../../dist/shared/projectState/projectStateService.js");

const principal = { principalId: "operator-1", principalType: "human", role: "Operator" };
const projectBody = { name: "Synthetic", description: "Project" };
const workBody = { workItemKind: "feature", title: "Work", objective: "Objective", workState: "ready" };

function service() { return createProjectStateService(createInMemoryProjectStateStore(), principal); }

test("ProjectStateService creates, revises and supersedes with mechanical identity and history", async () => {
  const state = service();
  const project = await state.createRecord(null, "Project", projectBody);
  await assert.rejects(state.createRecord(project.id, "Project", projectBody), /cannot borrow/);
  const work = await state.createRecord(project.id, "WorkItem", workBody);
  assert.equal(work.projectId, project.id);
  assert.equal(work.createdBy.principalId, principal.principalId);
  assert.equal(work.recordVersion, 1);
  assert.equal((await state.getProjectStateSummary(project.id)).totalRecords, 2);
  const revised = await state.reviseRecord(project.id, work.id, { objective: "Revised" }, 1);
  assert.equal(revised.recordVersion, 2);
  assert.equal((await state.getRecord(project.id, work.id)).body.objective, "Revised");
  await assert.rejects(state.reviseRecord(project.id, work.id, { objective: "Stale" }, 1), /stale/);
  await assert.rejects(state.reviseRecord(project.id, work.id, { dispositionState: "approved" }, 2), /unsupported/);
  const { predecessor, successor } = await state.supersedeRecord(project.id, work.id, { ...workBody, objective: "Replacement" }, 2);
  assert.equal(predecessor.lifecycleState, "superseded");
  assert.notEqual(successor.id, work.id);
  assert.equal(successor.lineageId, work.lineageId);
  assert.equal((await state.getCurrentRecord(project.id, work.id)).id, successor.id);
  assert.equal((await state.getRecordHistory(project.id, work.id)).records.length, 4);
  assert.equal((await state.getLineage(project.id, work.id)).records.length, 2);
  assert.equal((await state.queryRecords(project.id, { entityType: "WorkItem", lifecycleState: "active" })).length, 1);
});

test("typed Decision, Validation and Evidence commands derive trusted attribution and enforce relationships", async () => {
  const state = service();
  const project = await state.createRecord(null, "Project", projectBody);
  const work = await state.createRecord(project.id, "WorkItem", workBody);
  const decision = await state.recordDecision(project.id, work.id, { decisionType: "proceed", outcome: "approved", rationale: "Scope reviewed", decisionScope: "work" });
  assert.equal(decision.body.decidedBy.principalId, principal.principalId);
  assert.equal(decision.body.decisionRole, "Operator");
  const validation = await state.recordValidation(project.id, work.id, { validationType: "manual", method: "inspection", outcome: "pass", summary: "Observed" });
  assert.equal(validation.body.performedBy.principalId, principal.principalId);
  const evidence = await state.recordEvidence(project.id, work.id, { evidenceType: "output", description: "Observed output", mediaType: "text/plain", payloadRef: "digest:reference", digest: "a".repeat(64) });
  assert.equal((await state.getEvidence(project.id, work.id))[0].id, evidence.id);
  assert.equal((await state.getRelationships(project.id, work.id)).length, 3);
  await assert.rejects(state.recordDecision(project.id, work.id, { decisionType: "proceed", outcome: "approved", rationale: "x", decisionScope: "work", decisionRole: "System" }), /Unsupported semantic input field/);
  await assert.rejects(state.createRecord(project.id, "Decision", decision.body), /typed commands/);
  await assert.rejects(state.reviseRecord(project.id, decision.id, { rationale: "rewrite" }, 1), /Immutable/);
  await assert.rejects(state.recordValidation(project.id, "missing", { validationType: "manual", method: "inspection", outcome: "pass", summary: "Wrong target" }), /does not exist/);
});

test("service rejects unregistered fields and keeps query results bounded", async () => {
  const state = service();
  const project = await state.createRecord(null, "Project", projectBody);
  await assert.rejects(state.createRecord(project.id, "WorkItem", { ...workBody, arbitraryApproval: true }), /unsupported/);
  await assert.rejects(state.queryRecords(project.id, { limit: 101 }), /between 1 and 100/);
  await assert.rejects(state.queryRecords(project.id, { entityType: "Invented" }), /Unregistered/);
  assert.equal((await state.queryRecords(project.id)).length, 1);
});
