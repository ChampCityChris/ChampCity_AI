const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createInMemoryProjectStateStore } = require("../../dist/shared/projectState/inMemoryProjectStateStore.js");
const { createSQLiteProjectStateStore } = require("../../dist/main/projectState/sqliteProjectStateStore.js");
const { createProjectStateService, advanceDerivedEventCursor } = require("../../dist/shared/projectState/projectStateService.js");

const operator = { principalId: "operator", principalType: "human", role: "Operator" };

function sqliteFixture(context) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-context-feed-test-"));
  const store = createSQLiteProjectStateStore(path.join(root, "project-state.sqlite"));
  context.after(() => { store.close(); fs.rmSync(root, { recursive: true, force: true }); });
  return store;
}

function register(name, factory) {
  test(`${name}: bounded authoritative context retains exact identities, decisions, validations and source references`, async context => {
    const store = factory(context);
    const service = createProjectStateService(store, operator);
    const project = await service.createRecord(null, "Project", { name: "Synthetic", description: "Project" });
    const { intake, workflow } = await service.createWorkIntake(project.id, { request: "Change", desiredOutcome: "Working", constraints: [], evidenceContext: [], requestedIntegrationTarget: "dev" });
    const targetWorkflow = await service.createWorkflow(project.id, { workflowType: "feature-capability", title: "Target", currentWorkspace: "development" });
    const baseline = await service.createWorkflowSourceBaseline(project.id, targetWorkflow.id, { repositoryId: "repo-baseline", integrationTargetSourceLineId: "dev-baseline", baseRevisionId: "revision-baseline" });
    const targetPhase = await service.createRecord(project.id, "Phase", { title: "Target phase", objective: "Independent", phaseState: "active", sequence: 1 });
    const targetWork = await service.createRecord(project.id, "WorkItem", { workItemKind: "feature", title: "Target work", objective: "Build", workState: "ready" });
    await service.createRelationship(project.id, targetPhase.id, "part_of", targetWorkflow.id);
    await service.createRelationship(project.id, targetWork.id, "part_of", targetPhase.id);
    await service.linkWorkflowRouteTarget(project.id, workflow.id, targetWorkflow.id);
    const assessment = await service.recordRouteAssessment(project.id, intake.id, { recommendation: "feature-change", traits: [], rationale: "Existing", evidenceIds: [] });
    const route = await service.recordRouteDecision(project.id, intake.id, { route: "feature-change", assessmentId: assessment.id });
    const phase = await service.createRecord(project.id, "Phase", { title: "Phase", objective: "Deliver", phaseState: "active", sequence: 1 });
    const work = await service.createRecord(project.id, "WorkItem", { workItemKind: "feature", title: "Work", objective: "Build", workState: "implemented" });
    await service.createRelationship(project.id, phase.id, "part_of", workflow.id);
    await service.createRelationship(project.id, work.id, "part_of", phase.id);
    const validation = await service.recordValidation(project.id, work.id, { validationType: "test", method: "automated", outcome: "pass", summary: "Pass", sourceBaselineRef: "revision-a" });
    const decision = await service.recordDecision(project.id, work.id, { decisionType: "proceed", outcome: "approved", decisionScope: "work-item" });
    const target = await service.createWorkflow(project.id, { workflowType: "feature-capability", title: "Target", currentWorkspace: "development" });
    await service.linkWorkflowRouteTarget(project.id, workflow.id, target.id);
    const baseline = await service.createWorkflowSourceBaseline(project.id, target.id, { repositoryId: "repo", integrationTargetSourceLineId: "dev-line", baseRevisionId: "base" });
    const binding = await service.createWorkflowSourceBinding(project.id, target.id, baseline.id);
    await service.updateSourceBinding(project.id, binding.id, { preparationState: "preparing" }, 1);
    await service.updateSourceBinding(project.id, binding.id, { preparationState: "ready", workSourceLineId: "work-line", currentRevisionId: "revision-a" }, 2);
    const checkpoint = await service.createSourceCheckpoint(project.id, binding.id, work.id, { boundaryId: "boundary", expectedRevisionId: "revision-a", checkpointKind: "implementation", checkpointState: "pending" });
    const integration = await service.createIntegrationRecord(project.id, binding.id, { targetBeforeRevisionId: "target-before", targetEntityId: work.id });
    const before = (await store.listStateChanges(project.id)).length;
    const workContext = await service.getAuthoritativeContext(project.id, { scope: "work-item", entityId: work.id, limit: 100 });
    assert.equal(workContext.authoritative, true);
    assert.equal(workContext.records.find(record => record.id === work.id).recordVersion, 1);
    assert.equal(workContext.records.some(record => record.id === validation.id), true);
    assert.equal(workContext.records.some(record => record.id === decision.id), true);
    assert.equal(workContext.records.some(record => record.id === checkpoint.id), true);
    assert.equal(workContext.records.some(record => record.id === integration.id), true);
    assert.equal(workContext.records.some(record => record.id === binding.id), true);
    assert.equal(workContext.sourceReferences.some(ref => ref.entityId === binding.id && ref.field === "currentRevisionId" && ref.reference === "revision-a"), true);
    assert.equal(workContext.validations.includes(validation.id), true);
    assert.equal(workContext.decisions.includes(decision.id), true);
    const intakeContext = await service.getAuthoritativeContext(project.id, { scope: "work-intake", entityId: intake.id, limit: 100 });
    assert.equal(intakeContext.records.some(record => record.id === route.id), true);
    assert.equal(intakeContext.records.some(record => record.id === targetWorkflow.id || record.id === targetPhase.id || record.id === targetWork.id), false);
    const workflowContext = await service.getAuthoritativeContext(project.id, { scope: "workflow", entityId: workflow.id, limit: 100 });
    assert.equal(workflowContext.records.some(record => record.id === phase.id), true);
    assert.equal(workflowContext.records.some(record => record.id === work.id), true);
    assert.equal(workflowContext.records.some(record => record.id === targetWorkflow.id || record.id === targetWork.id), false);
    assert.equal(workflowContext.relationships.some(edge => edge.relationshipType === "routes_to" && edge.toEntityId === targetWorkflow.id), true);
    const targetContext = await service.getAuthoritativeContext(project.id, { scope: "workflow", entityId: targetWorkflow.id, limit: 100 });
    assert.equal(targetContext.records.some(record => record.id === workflow.id || record.id === intake.id), false);
    assert.equal(targetContext.records.some(record => record.id === baseline.id), true);
    for (const [field, reference] of Object.entries({ repositoryId: "repo-baseline", integrationTargetSourceLineId: "dev-baseline", baseRevisionId: "revision-baseline" })) {
      assert.equal(targetContext.sourceReferences.some(ref => ref.entityId === baseline.id && ref.field === field && ref.reference === reference), true);
    }
    const projectContext = await service.getAuthoritativeContext(project.id, { scope: "project", limit: 100 });
    assert.equal(projectContext.records.some(record => record.id === workflow.id), true);
    assert.equal(projectContext.records.some(record => record.id === targetWorkflow.id), true);
    const first = await service.getAuthoritativeContext(project.id, { scope: "project", limit: 2 });
    assert.equal(first.records.length, 2);
    assert.equal(first.truncated, true);
    assert.equal(first.nextOffset, 2);
    const second = await service.getAuthoritativeContext(project.id, { scope: "project", limit: 2, offset: 2 });
    assert.equal(new Set([...first.records, ...second.records].map(record => record.id)).size, 4);
    assert.equal((await store.listStateChanges(project.id)).length, before);
    await assert.rejects(service.getAuthoritativeContext(project.id, { scope: "workflow", entityId: work.id }), /wrong entity type/);
    await assert.rejects(service.getAuthoritativeContext(project.id, { scope: "project", limit: 101 }), /between 1 and 100/);
  });

  test(`${name}: committed feed replays by sequence and derived cursor is idempotent`, async context => {
    const store = factory(context);
    const service = createProjectStateService(store, operator);
    const project = await service.createRecord(null, "Project", { name: "Synthetic", description: "Project" });
    const work = await service.createRecord(project.id, "WorkItem", { workItemKind: "feature", title: "Work", objective: "Build", workState: "ready" });
    await service.reviseRecord(project.id, work.id, { objective: "Build safely" }, 1);
    const before = (await store.listOutbox(project.id)).length;
    await assert.rejects(service.reviseRecord(project.id, work.id, { objective: "Stale" }, 1), /stale/);
    assert.equal((await store.listOutbox(project.id)).length, before);
    let cursor = { projectId: project.id, sequence: 0, eventId: null };
    const seen = new Set();
    while (true) {
      const feed = await service.getCommittedEventFeed(project.id, { cursor, limit: 2 });
      assert.equal(feed.events.length <= 2, true);
      for (const event of feed.events) {
        assert.equal(seen.has(event.id), false);
        seen.add(event.id);
        cursor = advanceDerivedEventCursor(cursor, event);
        assert.deepEqual(advanceDerivedEventCursor(cursor, event), cursor);
      }
      assert.deepEqual(feed.nextCursor, cursor);
      if (!feed.hasMore) break;
    }
    assert.equal(seen.size, before);
    assert.deepEqual((await service.getCommittedEventFeed(project.id, { cursor })).events, []);
    const all = await store.listOutbox(project.id);
    await store.acknowledgeOutbox(project.id, all[0].id);
    assert.equal((await service.getCommittedEventFeed(project.id, { limit: 1 })).events[0].id, all[0].id);
    assert.deepEqual(advanceDerivedEventCursor(cursor, all[0]), cursor);
    assert.throws(() => advanceDerivedEventCursor({ projectId: project.id, sequence: 0, eventId: null }, all[1]), /sequence gap/);
    assert.throws(() => advanceDerivedEventCursor({ projectId: "other", sequence: 0, eventId: null }, all[0]), /Project mismatch/);
    await assert.rejects(service.getCommittedEventFeed(project.id, { cursor: { projectId: "other", sequence: 0, eventId: null } }), /Invalid event feed cursor/);
    await assert.rejects(service.getCommittedEventFeed(project.id, { cursor: { projectId: project.id, sequence: 1, eventId: "wrong" } }), /does not identify a committed event/);
  });
}

register("in-memory Project State", () => createInMemoryProjectStateStore());
register("SQLite Project State", sqliteFixture);
