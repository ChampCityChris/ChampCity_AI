const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createInMemoryProjectStateStore } = require("../../dist/shared/projectState/inMemoryProjectStateStore.js");
const { createSQLiteProjectStateStore } = require("../../dist/main/projectState/sqliteProjectStateStore.js");
const { createProjectStateService } = require("../../dist/shared/projectState/projectStateService.js");

const operator = { principalId: "operator", principalType: "human", role: "Operator" };
const digest = "a".repeat(64);

function sqliteFixture(context) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-projection-test-"));
  const store = createSQLiteProjectStateStore(path.join(root, "project-state.sqlite"));
  context.after(() => { store.close(); fs.rmSync(root, { recursive: true, force: true }); });
  return store;
}

async function fixture(store) {
  const service = createProjectStateService(store, operator);
  const project = await service.createRecord(null, "Project", { name: "Synthetic", description: "Project" });
  const { intake } = await service.createWorkIntake(project.id, { request: "Add route", desiredOutcome: "Working route", constraints: [], evidenceContext: [], requestedIntegrationTarget: "dev" });
  const assessment = await service.recordRouteAssessment(project.id, intake.id, { recommendation: "feature-change", traits: [], rationale: "Existing system", evidenceIds: [] });
  const route = await service.recordRouteDecision(project.id, intake.id, { route: "feature-change", assessmentId: assessment.id });
  const work = await service.createRecord(project.id, "WorkItem", { workItemKind: "feature", title: "Feature", objective: "Implement route", workState: "implemented" });
  const repair = await service.createRecord(project.id, "WorkItem", { workItemKind: "repair", title: "Repair", objective: "Fix route", workState: "ready" });
  const fix = await service.createRecord(project.id, "WorkItem", { workItemKind: "fix", title: "Fix", objective: "Fix issue", workState: "ready" });
  const workflow = await service.createWorkflow(project.id, { workflowType: "feature-capability", title: "Projection owner", currentWorkspace: "work-item-map" });
  for (const item of [work, repair, fix]) await service.createRelationship(project.id, item.id, "part_of", workflow.id);
  await service.createRelationship(project.id, repair.id, "repairs", work.id);
  const implementation = await service.recordImplementation(project.id, work.id, { summary: "Implemented route", deviations: [], blockers: [], residualRisks: [], outcome: "implemented" });
  const validation = await service.recordValidation(project.id, work.id, { validationType: "test", method: "automated", outcome: "pass", summary: "Route passed" });
  const evidence = await service.recordEvidence(project.id, implementation.id, { evidenceType: "test-output", description: "Receipt", mediaType: "application/json", payloadRef: "evidence:receipt", digest });
  return { service, store, project, intake, assessment, route, work, repair, fix, implementation, validation, evidence };
}

function register(name, factory) {
  test(`${name}: every workflow Markdown projection is regenerable and non-authoritative`, async context => {
    const f = await fixture(factory(context));
    const requests = [
      ["work-intake", f.intake.id], ["work-item", f.work.id], ["repair", f.repair.id], ["fix", f.fix.id],
      ["validation", f.validation.id], ["implementation-report", f.implementation.id],
      ["route-history", f.intake.id], ["decision-history", f.work.id], ["project-state-summary", f.project.id],
    ];
    const priorChanges = (await f.store.listStateChanges(f.project.id)).length;
    for (const [projectionType, sourceEntityId] of requests) {
      const view = await f.service.renderView(f.project.id, { projectionType, sourceEntityId });
      assert.deepEqual(Object.keys(view.metadata), ["projectionType", "projectionVersion", "projectId", "sourceEntityIds", "generatedAt", "authoritative"]);
      assert.equal(view.metadata.projectionType, projectionType);
      assert.equal(view.metadata.projectId, f.project.id);
      assert.equal(view.metadata.authoritative, false);
      assert.equal(view.metadata.sourceEntityIds.includes(sourceEntityId), true);
      assert.match(view.markdown, /^# [A-Z]/);
      assert.match(view.markdown, /Generated from canonical Project State\. This Markdown is non-authoritative/);
      assert.match(view.markdown, /\| projectionVersion \| 1 \|/);
      assert.equal(view.markdown.includes(sourceEntityId), true);
      const editedCopy = `${view.markdown}\n<!-- Formatting-only copy -->`;
      assert.notEqual(editedCopy, view.markdown);
      const regenerated = await f.service.renderView(f.project.id, { projectionType, sourceEntityId });
      assert.equal(regenerated.markdown.includes("Formatting-only copy"), false);
    }
    assert.equal((await f.store.listStateChanges(f.project.id)).length, priorChanges);
    assert.equal((await f.service.getRecord(f.project.id, f.work.id)).recordVersion, 1);
    await assert.rejects(f.service.renderView(f.project.id, { projectionType: "repair", sourceEntityId: f.work.id }), /Repair Work Item/);
  });

  test(`${name}: structured export preserves canonical versions, relationships and provenance`, async context => {
    const f = await fixture(factory(context));
    const revised = await f.service.reviseRecord(f.project.id, f.work.id, { objective: "Implement durable route" }, 1);
    const exported = await f.service.exportStructuredProjectState(f.project.id);
    assert.equal(exported.exportVersion, 1);
    assert.equal(exported.authoritative, true);
    assert.equal(exported.projectId, f.project.id);
    assert.equal(exported.records.find(record => record.id === f.work.id).recordVersion, revised.recordVersion);
    const workHistory = exported.history.find(item => item.entityId === f.work.id).versions;
    assert.deepEqual(workHistory.map(record => record.recordVersion), [1, 2]);
    assert.equal(workHistory[0].body.objective, "Implement route");
    assert.equal(workHistory[1].body.objective, "Implement durable route");
    assert.equal(workHistory.every(record => record.provenance.origin === "native"), true);
    assert.equal(exported.relationships.some(edge => edge.relationshipType === "repairs" && edge.fromEntityId === f.repair.id && edge.toEntityId === f.work.id), true);
    assert.equal(exported.stateChanges.length, (await f.store.listStateChanges(f.project.id)).length);
    const projection = await f.service.renderView(f.project.id, { projectionType: "work-item", sourceEntityId: f.work.id });
    assert.equal(projection.markdown.includes("Implement durable route"), true);
    assert.equal(projection.metadata.sourceEntityIds.every(id => exported.records.some(record => record.id === id)), true);
    assert.equal((await f.service.getRecord(f.project.id, f.work.id)).recordVersion, 2);
  });
}

register("in-memory Project State", () => createInMemoryProjectStateStore());
register("SQLite Project State", sqliteFixture);
