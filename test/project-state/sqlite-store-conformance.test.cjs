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

test("existing SQLite schema stores WorkflowIntake with no schema or authority migration", async context => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-intake-schema-test-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const file = path.join(root, "project-state.sqlite");
  const principal = { principalId: "operator", principalType: "human", role: "Operator" };
  const project = createProjectStateEntity({ entityType: "Project", body: { name: "Existing", description: "Existing schema fixture" }, principal });
  const original = createSQLiteProjectStateStore(file);
  await original.transaction(project.id, unit => unit.saveEntity(project, null));
  original.close();
  const inspect = () => {
    const db = new DatabaseSync(file);
    try { return { schema: db.prepare("SELECT name, sql FROM sqlite_master ORDER BY name").all(), migrations: db.prepare("SELECT * FROM schema_migrations ORDER BY version").all(), authority: db.prepare("SELECT * FROM project_state_authority").all() }; }
    finally { db.close(); }
  };
  const before = inspect();
  const reopened = createSQLiteProjectStateStore(file);
  const intake = createProjectStateEntity({ entityType: "WorkflowIntake", projectId: project.id, principal, body: { workflowId: randomUUID(), workflowType: "project-creation", values: { request: "Build" } } });
  try {
    await reopened.transaction(project.id, unit => unit.saveEntity(intake, null));
    assert.deepEqual(await reopened.getEntity(project.id, intake.id), intake);
  } finally { reopened.close(); }
  assert.deepEqual(inspect(), before);
  const final = createSQLiteProjectStateStore(file);
  try { assert.deepEqual(await final.getEntity(project.id, intake.id), intake); }
  finally { final.close(); }
});


test("Architect review cycles bind exact semantic versions without changing SQLite schema", async context => {
  const {createProjectStateService} = require("../../dist/shared/projectState/projectStateService.js");
  const {ARCHITECT_STAGE_BY_WORKFLOW, renderArchitectReviewProjection} = require("../../dist/shared/projectState/architectReviewContracts.js");
  const store = fixture(context);
  const operator = {principalId: "operator", principalType: "human", role: "Operator"};
  const service = createProjectStateService(store, operator);
  const project = await service.createRecord(null, "Project", {name: "Review fixture", description: "Synthetic"});
  const finding = await service.createRecord(project.id, "Finding", {title: "Fact", statement: "Observed", category: "architect", impact: "Bounded", observedAt: new Date().toISOString(), findingState: "proposed"});
  let first;
  for (const [workflowType, stageKind] of Object.entries(ARCHITECT_STAGE_BY_WORKFLOW)) {
    const workflow = workflowType === "project-creation"
      ? (await service.createProjectCreationWorkflow(project.id, {title: "Greenfield"})).workflow
      : (await service.createSubstantiveWorkflow(project.id, {workflowType, title: workflowType, entryWorkspace: require("../../dist/shared/projectState/workflowTypeRegistry.js").getWorkflowTypeDefinition(workflowType).entryWorkspace})).workflow;
    const member = workflowType === "project-creation" ? finding : await service.createRecord(project.id, "Finding", {...finding.body, title: workflowType});
    const cycle = await service.saveArchitectReviewCycle(project.id, {workflowId: workflow.id, stageKind, memberIds: [member.id]});
    assert.equal(cycle.recordVersion, 1);
    assert.equal((await service.saveArchitectReviewCycle(project.id, {workflowId: workflow.id, stageKind, memberIds: [member.id]})).id, cycle.id);
    assert.equal((await service.getCurrentArchitectReviewCycle(project.id, workflow.id, stageKind)).id, cycle.id);
    if (!first) first = {workflow, cycle, member};
    else {
      await assert.rejects(service.saveArchitectReviewCycle(project.id, {workflowId: workflow.id, stageKind, memberIds: [finding.id]}), /cross|conflicting|different Workflow/);
      await assert.rejects(service.createRelationship(project.id, finding.id, "workflow_member", workflow.id), /cross/);
    }
  }
  const {cycle, workflow} = first;
  const foreignWorkflow = (await store.listEntities(project.id, "Workflow")).find(record => record.body.workflowType === "feature-capability");
  const solution = await service.createRecord(project.id, "BoundedSolution", {title: "Foreign solution", objective: "Bounded", scopeIn: [], scopeOut: [], constraints: [], assumptions: [], risks: [], solutionState: "proposed"});
  const criterion = await service.createRecord(project.id, "Criterion", {statement: "Foreign obligation", criticality: "required", verificationIntent: "Review", validationPolicy: "operator_decision", criterionState: "proposed"});
  await service.createRelationship(project.id, solution.id, "defines_criterion", criterion.id);
  await service.createRelationship(project.id, solution.id, "workflow_member", foreignWorkflow.id);
  await assert.rejects(service.saveArchitectReviewCycle(project.id, {workflowId: workflow.id, stageKind: "project-interview", memberIds: [criterion.id]}), /different Workflow/);
  const evidence = await service.recordEvidence(project.id, foreignWorkflow.id, {evidenceType: "supplied", description: "Foreign evidence", mediaType: "text/plain", payloadRef: "evidence:fixture", digest: "a".repeat(64)});
  await assert.rejects(service.saveArchitectReviewCycle(project.id, {workflowId: workflow.id, stageKind: "project-interview", memberIds: [evidence.id]}), /different Workflow/);

  await assert.rejects(service.recordArchitectReview(project.id, cycle.id, {expectedRecordVersion: 1, outcome: "revision_requested"}), /requires notes/);
  const decision = await service.recordArchitectReview(project.id, cycle.id, {expectedRecordVersion: 1, outcome: "approved"});
  assert.equal(decision.body.decisionScope, `architect-review:${cycle.id}@1`);
  assert.equal((await service.getArchitectReviewDisposition(project.id, cycle.id)).state, "approved");
  const before = await service.getArchitectReviewProjection(project.id, cycle.id);
  assert.equal(before.sources[0].recordVersion, 1); assert.match(before.markdown, /Observed/);
  await service.reviseRecord(project.id, finding.id, {statement: "Changed"}, 1);
  const revised = await service.getCurrentArchitectReviewCycle(project.id, workflow.id, "project-interview");
  assert.equal(revised.recordVersion, 2); assert.notEqual(revised.body.semanticDigest, cycle.body.semanticDigest);
  assert.equal((await service.getArchitectReviewDisposition(project.id, cycle.id)).state, "none");
  await assert.rejects(service.recordArchitectReview(project.id, cycle.id, {expectedRecordVersion: 1, outcome: "approved"}), /stale/);
  assert.deepEqual((await store.getEntity(project.id, decision.id)).body, decision.body);
  const membership = (await store.listRelationships(project.id, "review_member")).find(edge => edge.fromEntityId === finding.id && edge.toEntityId === cycle.id);
  await assert.rejects(service.endRelationship(project.id, membership.id), /typed cycle/);
  const replacement = await service.createRecord(project.id, "Finding", {...finding.body, statement: "Replacement"});
  const regrouped = await service.saveArchitectReviewCycle(project.id, {workflowId: workflow.id, stageKind: "project-interview", memberIds: [replacement.id], expectedRecordVersion: 2});
  assert.equal(regrouped.recordVersion, 3);
  assert.equal((await service.getArchitectReviewProjection(project.id, cycle.id)).sources[0].entityId, replacement.id);

  const agent = createProjectStateService(store, {principalId: "architect", principalType: "agent", role: "Architect"});
  await assert.rejects(agent.recordArchitectReview(project.id, cycle.id, {expectedRecordVersion: 3, outcome: "approved"}), /human Operator/);
  const another = await service.createRecord(null, "Project", {name: "Other", description: "Synthetic"});
  const foreign = await service.createRecord(another.id, "Finding", finding.body);
  await assert.rejects(service.saveArchitectReviewCycle(project.id, {workflowId: workflow.id, stageKind: "project-interview", memberIds: [foreign.id]}));
  await assert.rejects(service.createRecord(project.id, "ArchitectReviewCycle", cycle.body), /typed/);
  const routing = (await service.createWorkIntake(project.id, {request: "Route", desiredOutcome: "Route", constraints: [], evidenceContext: [], requestedIntegrationTarget: "none"})).workflow;
  await assert.rejects(service.saveArchitectReviewCycle(project.id, {workflowId: routing.id, stageKind: "project-interview", memberIds: [finding.id]}), /substantive/);
  assert.throws(() => createProjectStateEntity({entityType: "ArchitectReviewCycle", projectId: project.id, body: {...cycle.body, workflowType: "work-intake-routing"}, principal: operator}), /substantive/);
  assert.equal((await store.listEntities(project.id, "ArchitectReviewCycle")).length, 7);
});
