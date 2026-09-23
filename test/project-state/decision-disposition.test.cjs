const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createInMemoryProjectStateStore } = require("../../dist/shared/projectState/inMemoryProjectStateStore.js");
const { createSQLiteProjectStateStore } = require("../../dist/main/projectState/sqliteProjectStateStore.js");
const { createProjectStateService } = require("../../dist/shared/projectState/projectStateService.js");

const operator = { principalId: "operator", principalType: "human", role: "Operator" };
const model = { principalId: "model", principalType: "agent", role: "Architect" };
const workBody = { workItemKind: "feature", title: "Work", objective: "Build", workState: "ready" };
const criterionBody = { statement: "Human choice", criticality: "required", verificationIntent: "Obtain the reserved choice", validationPolicy: "operator_decision", criterionState: "open" };

function sqliteFixture(context) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-decision-test-"));
  const store = createSQLiteProjectStateStore(path.join(root, "project-state.sqlite"));
  context.after(() => { store.close(); fs.rmSync(root, { recursive: true, force: true }); });
  return store;
}

function register(name, factory) {
  test(`${name}: later Decisions and corrections have distinct chronology and immutable history`, async context => {
    const store = factory(context);
    const service = createProjectStateService(store, operator);
    const project = await service.createRecord(null, "Project", { name: "Synthetic", description: "Project" });
    const work = await service.createRecord(project.id, "WorkItem", workBody);
    const first = await service.recordDecision(project.id, work.id, { decisionType: "review", outcome: "revision_requested", decisionScope: "work" });
    assert.equal(first.body.rationale, "");
    assert.equal((await service.getEffectiveDisposition(project.id, work.id)).state, "revision_requested");
    const second = await service.recordDecision(project.id, work.id, { decisionType: "review", outcome: "accepted", decisionScope: "work" });
    assert.notEqual(first.lineageId, second.lineageId);
    assert.equal((await service.getEffectiveDisposition(project.id, work.id)).decisionId, second.id);
    const correctedFirst = await service.supersedeDecision(project.id, first.id, { decisionType: "review", outcome: "rejected", decisionScope: "work", rationale: "Correct transcription" }, 1);
    assert.equal(correctedFirst.successor.lineageId, first.lineageId);
    assert.equal(correctedFirst.successor.body.effectiveAt, first.body.effectiveAt);
    assert.equal(correctedFirst.predecessor.lifecycleState, "superseded");
    assert.equal((await service.getEffectiveDisposition(project.id, work.id)).decisionId, second.id);
    assert.equal((await service.getRecord(project.id, first.id)).body.outcome, "revision_requested");
    assert.equal((await service.getRecordHistory(project.id, first.id)).records.length, 3);
    assert.equal((await service.getCurrentRecord(project.id, first.id)).id, correctedFirst.successor.id);
    await assert.rejects(service.reviseRecord(project.id, second.id, { outcome: "rejected" }, 1), /Immutable/);
    await assert.rejects(service.supersedeDecision(project.id, first.id, { decisionType: "review", outcome: "approved", decisionScope: "work" }, 1), /unavailable or stale/);
    const correctedSecond = await service.supersedeDecision(project.id, second.id, { decisionType: "review", outcome: "approved", decisionScope: "work" }, 1);
    assert.equal((await service.getEffectiveDisposition(project.id, work.id)).decisionId, correctedSecond.successor.id);
    assert.equal((await service.getEffectiveDisposition(project.id, work.id)).state, "approved");
    const edges = await service.getRelationships(project.id, correctedSecond.successor.id);
    assert.deepEqual(new Set(edges.map(edge => edge.relationshipType)), new Set(["supersedes", "governs"]));
    assert.equal((await store.listStateChanges(project.id)).length, (await store.listOutbox(project.id)).length);
  });

  test(`${name}: only an effective human Operator Decision produces disposition`, async context => {
    const store = factory(context);
    const service = createProjectStateService(store, operator);
    const agentService = createProjectStateService(store, model);
    const project = await service.createRecord(null, "Project", { name: "Synthetic", description: "Project" });
    const work = await service.createRecord(project.id, "WorkItem", workBody);
    await agentService.recordValidation(project.id, work.id, { validationType: "test", method: "machine", outcome: "pass", summary: "Passed" });
    await agentService.recordDecision(project.id, work.id, { decisionType: "recommendation", outcome: "approved", decisionScope: "work" });
    assert.deepEqual(await service.getEffectiveDisposition(project.id, work.id), { state: "none", decisionId: null, effectiveAt: null });
    const future = "2099-01-01T00:00:00.000Z";
    const decision = await service.recordDecision(project.id, work.id, { decisionType: "review", outcome: "accepted", decisionScope: "work", effectiveAt: future });
    assert.equal((await service.getEffectiveDisposition(project.id, work.id)).state, "none");
    assert.equal((await service.getEffectiveDisposition(project.id, work.id, future)).decisionId, decision.id);
    await assert.rejects(service.createRelationship(project.id, decision.id, "governs", project.id), /typed Decision command/);
  });

  test(`${name}: only explicitly marked active criteria require an Operator Decision`, async context => {
    const store = factory(context);
    const service = createProjectStateService(store, operator);
    const project = await service.createRecord(null, "Project", { name: "Synthetic", description: "Project" });
    const work = await service.createRecord(project.id, "WorkItem", workBody);
    const ordinary = await service.createRecord(project.id, "Criterion", { ...criterionBody, statement: "Automated", validationPolicy: "deterministic" });
    await service.createRelationship(project.id, work.id, "defines_criterion", ordinary.id);
    assert.deepEqual(await service.getRequiredOperatorDecisions(project.id), []);
    const required = await service.createRecord(project.id, "Criterion", criterionBody);
    await service.createRelationship(project.id, work.id, "defines_criterion", required.id);
    assert.deepEqual(await service.getRequiredOperatorDecisions(project.id), [{ criterionId: required.id, targetId: work.id, currentDisposition: "none" }]);
    await service.recordDecision(project.id, work.id, { decisionType: "review", outcome: "accepted", decisionScope: "work" });
    assert.deepEqual(await service.getRequiredOperatorDecisions(project.id), []);
  });
}

register("in-memory Project State", () => createInMemoryProjectStateStore());
register("SQLite Project State", sqliteFixture);
