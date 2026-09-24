const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createInMemoryProjectStateStore } = require("../../dist/shared/projectState/inMemoryProjectStateStore.js");
const { createSQLiteProjectStateStore } = require("../../dist/main/projectState/sqliteProjectStateStore.js");
const { createProjectStateService } = require("../../dist/shared/projectState/projectStateService.js");

const operator = { principalId: "operator", principalType: "human", role: "Operator" };
const workBody = title => ({ workItemKind: "feature", title, objective: "Implement", workState: "ready" });

function sqliteFixture(context) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-current-query-test-"));
  const store = createSQLiteProjectStateStore(path.join(root, "project-state.sqlite"));
  context.after(() => { store.close(); fs.rmSync(root, { recursive: true, force: true }); });
  return store;
}

function register(name, factory) {
  test(`${name}: record filters and pagination expose deterministic current and historical results`, async context => {
    const service = createProjectStateService(factory(context), operator);
    const project = await service.createRecord(null, "Project", { name: "Synthetic", description: "Project" });
    const { intake, workflow } = await service.createWorkIntake(project.id, { request: "Change", desiredOutcome: "Working", constraints: [], evidenceContext: [], requestedIntegrationTarget: "dev" });
    const first = await service.createRecord(project.id, "WorkItem", workBody("First"));
    const second = await service.createRecord(project.id, "WorkItem", workBody("Second"));
    const repair = await service.createRecord(project.id, "WorkItem", { ...workBody("Repair"), workItemKind: "repair" });
    const phase = await service.createRecord(project.id, "Phase", { title: "Phase", objective: "Deliver", phaseState: "active", sequence: 1 });
    await service.createRelationship(project.id, phase.id, "part_of", workflow.id);
    await service.createRelationship(project.id, first.id, "part_of", phase.id);
    await service.createRelationship(project.id, repair.id, "repairs", first.id);
    const decision = await service.recordDecision(project.id, first.id, { decisionType: "proceed", outcome: "approved", decisionScope: "work-item", rationale: "Ready" });
    const validation = await service.recordValidation(project.id, first.id, { validationType: "test", method: "automated", outcome: "pass", summary: "Pass" });
    const page = await service.queryRecordsPage(project.id, { entityType: "WorkItem", limit: 2 });
    assert.equal(page.totalMatches, 3);
    assert.equal(page.records.length, 2);
    assert.equal(page.truncated, true);
    assert.equal(page.nextOffset, 2);
    const tail = await service.queryRecordsPage(project.id, { entityType: "WorkItem", limit: 2, offset: 2 });
    assert.equal(tail.records.length, 1);
    assert.equal(tail.truncated, false);
    assert.equal((await service.queryRecords(project.id, { workflowId: workflow.id, entityType: "WorkIntake" }))[0].id, intake.id);
    assert.equal((await service.queryRecords(project.id, { workflowId: workflow.id, entityType: "WorkItem" })).some(record => record.id === first.id), true);
    assert.deepEqual(new Set((await service.queryRecords(project.id, { workItemId: first.id })).map(item => item.id)), new Set([first.id, phase.id, repair.id, decision.id, validation.id]));
    assert.deepEqual(new Set((await service.queryRecords(project.id, { decisionId: decision.id })).map(item => item.id)), new Set([first.id, decision.id]));
    assert.equal((await service.queryRecords(project.id, { entityType: "Decision", decisionOutcome: "approved" }))[0].id, decision.id);
    assert.equal((await service.queryRecords(project.id, { entityType: "WorkItem", dispositionState: "approved" }))[0].id, first.id);
    assert.equal((await service.queryRecords(project.id, { relatedTo: first.id, relationshipType: "repairs", relationshipDirection: "from" }))[0].id, repair.id);
    assert.deepEqual((await service.queryRecords(project.id, { relationshipType: "repairs", relationshipDirection: "from" })).map(item => item.id), [repair.id]);
    assert.deepEqual((await service.queryRecords(project.id, { relationshipType: "repairs", relationshipDirection: "to" })).map(item => item.id), [first.id]);
    assert.equal((await service.queryRecords(project.id, { updatedFrom: "2099-01-01T00:00:00.000Z" })).length, 0);
    const replacement = await service.supersedeRecord(project.id, second.id, { ...workBody("Replacement") }, 1);
    assert.equal((await service.queryRecords(project.id, { current: false, entityType: "WorkItem" }))[0].id, second.id);
    assert.equal((await service.queryRecords(project.id, { current: true, entityType: "WorkItem" })).length, 3);
    assert.equal((await service.queryRecords(project.id, { entityType: "WorkItem", lifecycleState: "superseded" }))[0].id, second.id);
    assert.equal(replacement.successor.lineageId, second.lineageId);
    await assert.rejects(service.queryRecordsPage(project.id, { limit: 101 }), /between 1 and 100/);
    await assert.rejects(service.queryRecordsPage(project.id, { offset: 10001 }), /between 0 and 10000/);
    await assert.rejects(service.queryRecordsPage(project.id, { current: true, lifecycleState: "superseded" }), /conflict/);
    await assert.rejects(service.queryRecordsPage(project.id, { workflowId: first.id }), /wrong entity type/);
  });

  test(`${name}: current view derives route, work, repair, validation and source summaries with section bounds`, async context => {
    const service = createProjectStateService(factory(context), operator);
    const project = await service.createRecord(null, "Project", { name: "Synthetic", description: "Project" });
    const { intake, workflow } = await service.createWorkIntake(project.id, { request: "Change", desiredOutcome: "Working", constraints: [], evidenceContext: [], requestedIntegrationTarget: "dev" });
    const assessment = await service.recordRouteAssessment(project.id, intake.id, { recommendation: "feature-change", traits: [], rationale: "Existing system", evidenceIds: [] });
    await service.recordRouteDecision(project.id, intake.id, { route: "feature-change", assessmentId: assessment.id });
    const phase = await service.createRecord(project.id, "Phase", { title: "Phase", objective: "Deliver", phaseState: "active", sequence: 1 });
    await service.createRelationship(project.id, phase.id, "part_of", workflow.id);
    const work = await service.createRecord(project.id, "WorkItem", workBody("Feature"));
    const repair = await service.createRecord(project.id, "WorkItem", { ...workBody("Repair"), workItemKind: "repair" });
    await service.createRelationship(project.id, work.id, "part_of", phase.id);
    await service.createRelationship(project.id, repair.id, "repairs", work.id);
    const implementation = await service.recordImplementation(project.id, work.id, { summary: "Done", deviations: [], blockers: [], residualRisks: [], outcome: "implemented" });
    const validation = await service.recordValidation(project.id, work.id, { validationType: "test", method: "automated", outcome: "pass", summary: "Pass", sourceBaselineRef: "revision-a" });
    const binding = await service.createSourceBinding(project.id, intake.id, { repositoryId: "repo", integrationTargetSourceLineId: "dev-line" });
    await service.updateSourceBinding(project.id, binding.id, { preparationState: "preparing", baseRevisionId: "base" }, 1);
    await service.updateSourceBinding(project.id, binding.id, { preparationState: "ready", workSourceLineId: "work-line", currentRevisionId: "revision-a" }, 2);
    const checkpoint = await service.createSourceCheckpoint(project.id, binding.id, implementation.id, { boundaryId: "boundary", expectedRevisionId: "revision-a", checkpointKind: "implementation", checkpointState: "pending" });
    const integration = await service.createIntegrationRecord(project.id, binding.id, { targetBeforeRevisionId: "target-before", targetEntityId: work.id });
    const view = await service.getCurrentProjectStateView(project.id, { limitPerSection: 1 });
    assert.equal(view.project.id, project.id);
    assert.equal(view.workIntakes[0].workflowId, workflow.id);
    assert.equal(view.workIntakes[0].route.route, "feature-change");
    assert.equal(view.workflows[0].id, workflow.id);
    assert.deepEqual(view.workflows[0], { id: workflow.id, type: "work-intake-routing", title: "Change", state: "active", currentWorkspace: "work-intake" });
    assert.deepEqual(view.phases[0].workItemIds, [work.id]);
    assert.equal(view.sections.WorkItem.total, 2);
    assert.equal(view.sections.WorkItem.truncated, true);
    assert.equal(view.sections.WorkItem.nextOffset, 1);
    const secondPage = await service.getCurrentProjectStateView(project.id, { limitPerSection: 1, offset: 1 });
    assert.equal(new Set([view.workItems[0].id, secondPage.workItems[0].id]).size, 2);
    const workViews = [...view.workItems, ...secondPage.workItems];
    assert.equal(workViews.find(item => item.id === work.id).latestImplementationId, implementation.id);
    assert.equal(workViews.find(item => item.id === work.id).latestValidationId, validation.id);
    assert.equal(workViews.find(item => item.id === repair.id).repairTargetIds[0], work.id);
    assert.equal(view.sourceBindings[0].currentRevisionId, "revision-a");
    assert.equal(view.sourceCheckpoints[0].id, checkpoint.id);
    assert.equal(view.integrations[0].id, integration.id);
  });
}

register("in-memory Project State", () => createInMemoryProjectStateStore());
register("SQLite Project State", sqliteFixture);
