const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createInMemoryProjectStateStore } = require("../../dist/shared/projectState/inMemoryProjectStateStore.js");
const { createSQLiteProjectStateStore } = require("../../dist/main/projectState/sqliteProjectStateStore.js");
const { createProjectStateService } = require("../../dist/shared/projectState/projectStateService.js");

const operator = { principalId: "operator", principalType: "human", role: "Operator" };
const architect = { principalId: "architect", principalType: "agent", role: "Architect" };
const intakeInput = { request: "Add a bounded capability", desiredOutcome: "Working feature", constraints: ["Preserve data"], evidenceContext: ["Existing behavior"], requestedIntegrationTarget: "dev" };
const assessment = (recommendation, evidenceIds = []) => ({ recommendation, traits: ["bounded"], rationale: "Current Project evidence", evidenceIds });

function sqliteFixture(context) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-intake-test-"));
  const store = createSQLiteProjectStateStore(path.join(root, "project-state.sqlite"));
  context.after(() => { store.close(); fs.rmSync(root, { recursive: true, force: true }); });
  return store;
}

function register(name, factory) {
  test(`${name}: Work Intake capture, revision and lifecycle retain a single initiated Workflow`, async context => {
    const store = factory(context);
    const service = createProjectStateService(store, operator);
    const project = await service.createRecord(null, "Project", { name: "Synthetic", description: "Project" });
    await assert.rejects(service.createRecord(project.id, "WorkIntake", { ...intakeInput, intakeState: "captured" }), /typed commands/);
    const { intake, workflow, initiates } = await service.createWorkIntake(project.id, intakeInput);
    assert.equal(intake.body.intakeState, "captured");
    assert.deepEqual(workflow.body, { workflowType: "work-intake-routing", title: intakeInput.request, currentWorkspace: "work-intake", workflowState: "active" });
    assert.equal(initiates.relationshipType, "initiates");
    const initialSummary = await service.getWorkIntakeSummary(project.id, intake.id);
    assert.equal(initialSummary.routingWorkflowId, workflow.id);
    assert.equal(initialSummary.targetWorkflowId, null);
    assert.equal(Object.hasOwn(initialSummary, "workflowId"), false);
    assert.deepEqual((await service.getCurrentProjectStateView(project.id)).workIntakes[0], { id: intake.id, state: "captured", routingWorkflowId: workflow.id, targetWorkflowId: null, route: null });
    await assert.rejects(service.createRelationship(project.id, intake.id, "initiates", workflow.id), /typed commands/);
    const target = await service.createWorkflow(project.id, { workflowType: "feature-capability", title: "Target", currentWorkspace: "development" });
    await assert.rejects(service.createRelationship(project.id, workflow.id, "routes_to", target.id), /typed linkWorkflowRouteTarget/);
    const provenance = await service.linkWorkflowRouteTarget(project.id, workflow.id, target.id);
    assert.equal(provenance.relationshipType, "routes_to");
    assert.equal((await service.getWorkIntakeSummary(project.id, intake.id)).targetWorkflowId, target.id);
    assert.equal((await service.getCurrentProjectStateView(project.id)).workIntakes.find(item => item.id === intake.id).targetWorkflowId, target.id);
    const secondTarget = await service.createWorkflow(project.id, { workflowType: "issue-resolution", title: "Another", currentWorkspace: "issue" });
    await assert.rejects(service.linkWorkflowRouteTarget(project.id, workflow.id, secondTarget.id), /already has a target/);
    const secondIntake = await service.createWorkIntake(project.id, { ...intakeInput, request: "Second intake" });
    assert.notEqual(secondIntake.workflow.id, workflow.id);
    assert.equal((await service.queryRecords(project.id, { entityType: "Workflow" })).filter(record => record.body.workflowType === "work-intake-routing").length, 2);
    assert.equal((await service.getCurrentProjectStateView(project.id)).workflows.filter(record => record.type === "work-intake-routing").length, 2);
    await assert.rejects(service.linkWorkflowRouteTarget(project.id, secondIntake.workflow.id, target.id), /already has a routing provenance source/);
    await assert.rejects(service.reviseRecord(project.id, intake.id, { request: "Bypass" }, 1), /typed command/);
    const revised = await service.reviseWorkIntake(project.id, intake.id, { desiredOutcome: "Revised feature" }, 1);
    assert.equal(revised.recordVersion, 2);
    await assert.rejects(service.reviseWorkIntake(project.id, intake.id, { desiredOutcome: "Stale" }, 1), /unavailable or stale/);
    const assessing = await service.advanceWorkIntake(project.id, intake.id, "assessing", 2);
    assert.equal(assessing.body.intakeState, "assessing");
    await assert.rejects(service.advanceWorkIntake(project.id, intake.id, "closed", 3), /Invalid Work Intake lifecycle transition/);
    await assert.rejects(service.advanceWorkIntake(project.id, intake.id, "routed", 3), /Invalid Work Intake lifecycle transition/);
    const cancelled = await service.advanceWorkIntake(project.id, intake.id, "cancelled", 3);
    assert.equal(cancelled.lifecycleState, "voided");
    assert.equal(cancelled.body.intakeState, "cancelled");
    assert.equal((await service.getRecord(project.id, workflow.id)).body.workflowState, "cancelled");
    assert.equal((await service.getWorkIntakeSummary(project.id, intake.id)).currentRoute, null);
    assert.equal((await store.listStateChanges(project.id)).length, (await store.listOutbox(project.id)).length);
  });

  test(`${name}: advisory assessments and Operator reroutes preserve full history and current route`, async context => {
    const store = factory(context);
    const service = createProjectStateService(store, operator);
    const advisor = createProjectStateService(store, architect);
    const project = await service.createRecord(null, "Project", { name: "Synthetic", description: "Project" });
    const { intake } = await service.createWorkIntake(project.id, intakeInput);
    const firstAssessment = await advisor.recordRouteAssessment(project.id, intake.id, assessment("feature-change"));
    assert.equal((await service.getCurrentWorkRoute(project.id, intake.id)), null);
    assert.equal((await service.getRecord(project.id, intake.id)).body.intakeState, "captured");
    await assert.rejects(advisor.recordRouteDecision(project.id, intake.id, { route: "feature-change", assessmentId: firstAssessment.id }), /human Operator/);
    const firstDecision = await service.recordRouteDecision(project.id, intake.id, { route: "feature-change", assessmentId: firstAssessment.id });
    assert.equal(firstDecision.body.rationale, "");
    assert.equal((await service.getCurrentWorkRoute(project.id, intake.id)).route, "feature-change");
    assert.equal((await service.getRecord(project.id, intake.id)).body.intakeState, "routed");
    const secondAssessment = await advisor.recordRouteAssessment(project.id, intake.id, { ...assessment("issue-resolution"), alternate: "refactor-migration" });
    assert.equal((await service.getCurrentWorkRoute(project.id, intake.id)).decisionId, firstDecision.id);
    const secondDecision = await service.recordRouteDecision(project.id, intake.id, { route: "issue-resolution", assessmentId: secondAssessment.id, rationale: "Reroute after review" });
    assert.equal((await service.getCurrentWorkRoute(project.id, intake.id)).decisionId, secondDecision.id);
    const corrected = await service.supersedeDecision(project.id, secondDecision.id, { decisionType: "work-intake-route", outcome: "refactor-migration", decisionScope: `work-intake:${intake.id}`, rationale: "Corrected selection" }, 1);
    const current = await service.getCurrentWorkRoute(project.id, intake.id);
    assert.equal(current.route, "refactor-migration");
    assert.equal(current.assessmentId, secondAssessment.id);
    assert.equal(current.decisionId, corrected.successor.id);
    const history = await service.getWorkRouteHistory(project.id, intake.id);
    assert.deepEqual(history.assessments.map(record => record.id), [firstAssessment.id, secondAssessment.id]);
    assert.equal(history.decisions.length, 3);
    assert.equal(history.decisions.find(record => record.id === secondDecision.id).lifecycleState, "superseded");
    const summary = await service.getWorkIntakeSummary(project.id, intake.id);
    assert.equal(summary.currentRoute.route, "refactor-migration");
    assert.equal(summary.targetWorkflowId, null);
    assert.equal(summary.routeDecisionIds.length, 3);
    assert.equal(summary.desiredOutcome, intakeInput.desiredOutcome);
    assert.equal((await service.getRecord(project.id, intake.id)).lifecycleState, "active");
    assert.equal((await service.getRecord(project.id, (await service.getWorkIntakeSummary(project.id, intake.id)).routingWorkflowId)).body.workflowState, "active");
  });

  test(`${name}: route assessment validates evidence ownership and unsupported routes atomically`, async context => {
    const store = factory(context);
    const service = createProjectStateService(store, operator);
    const advisor = createProjectStateService(store, architect);
    const project = await service.createRecord(null, "Project", { name: "Synthetic", description: "Project" });
    const other = await service.createRecord(null, "Project", { name: "Other", description: "Project" });
    const { intake } = await service.createWorkIntake(project.id, intakeInput);
    const otherWork = await service.createRecord(other.id, "WorkItem", { workItemKind: "feature", title: "Other", objective: "Other", workState: "ready" });
    const otherEvidence = await service.recordEvidence(other.id, otherWork.id, { evidenceType: "note", description: "Other", mediaType: "text/plain", payloadRef: "digest:other", digest: "a".repeat(64) });
    const before = (await store.listStateChanges(project.id)).length;
    await assert.rejects(advisor.recordRouteAssessment(project.id, intake.id, assessment("unknown")), /Unsupported Existing-Project Work Intake route/);
    await assert.rejects(advisor.recordRouteAssessment(project.id, intake.id, assessment("feature-change", [otherEvidence.id])), /does not exist/);
    assert.equal((await store.listStateChanges(project.id)).length, before);
    assert.equal((await service.getWorkRouteHistory(project.id, intake.id)).assessments.length, 0);
    await assert.rejects(service.recordRouteDecision(project.id, intake.id, { route: "feature-change", assessmentId: otherEvidence.id }), /does not exist/);
  });

  test(`${name}: structured WIR revisions and handoffs are typed, atomic, and create independent targets`, async context => {
    const store = factory(context);
    const service = createProjectStateService(store, operator);
    const advisor = createProjectStateService(store, architect);
    const project = await service.createRecord(null, "Project", { name: "Synthetic", description: "Project" });
    const first = await service.createWorkIntake(project.id, intakeInput);
    const firstAssessment = await advisor.recordRouteAssessment(project.id, first.intake.id, assessment("feature-change"),
      { correlationId: "architect-submission-1", causationId: `work-intake-record-version:${first.intake.recordVersion}` });
    assert.equal((await advisor.recordRouteAssessment(project.id, first.intake.id, assessment("feature-change"),
      { correlationId: "architect-submission-1", causationId: `work-intake-record-version:${first.intake.recordVersion}` })).id, firstAssessment.id);
    await assert.rejects(advisor.recordRouteAssessment(project.id, first.intake.id, assessment("greenfield")), /Unsupported Existing-Project/);
    await assert.rejects(service.recordRouteDecision(project.id, first.intake.id, { route: "greenfield", assessmentId: firstAssessment.id }), /Unsupported Existing-Project/);
    const revision = await service.recordWorkIntakeRouteRevisionRequest(project.id, first.intake.id,
      { assessmentId: firstAssessment.id, rationale: "Clarify whether the integration boundary is in scope." }, { correlationId: "operator-revision-1" });
    assert.equal(revision.body.outcome, "revision_requested");
    assert.equal((await service.getRecord(project.id, first.intake.id)).body.intakeState, "captured");
    assert.equal((await store.listRelationships(project.id, "routes_to")).filter(edge => edge.fromEntityId === first.workflow.id).length, 0);
    await assert.rejects(service.completeWorkIntakeRouteHandoff(project.id, { intakeId: first.intake.id, routingWorkflowId: first.workflow.id,
      assessmentId: firstAssessment.id, disposition: "override", route: "feature-change", rationale: "Same route is not an override.", targetTitle: "Invalid" }), /different supported WIR route/);
    const routed = await service.completeWorkIntakeRouteHandoff(project.id, { intakeId: first.intake.id, routingWorkflowId: first.workflow.id,
      assessmentId: firstAssessment.id, disposition: "accept", route: "feature-change", rationale: "Accept the assessment.", targetTitle: "Capability" },
      { correlationId: "operator-handoff-1" });
    assert.equal(routed.workflow.body.workflowType, "feature-capability");
    assert.equal((await service.completeWorkIntakeRouteHandoff(project.id, { intakeId: first.intake.id, routingWorkflowId: first.workflow.id,
      assessmentId: firstAssessment.id, disposition: "accept", route: "feature-change", rationale: "Accept the assessment.", targetTitle: "Capability" },
      { correlationId: "operator-handoff-1" })).workflow.id, routed.workflow.id);
    assert.equal((await service.getRecord(project.id, first.intake.id)).lifecycleState, "closed");
    assert.equal((await service.getRecord(project.id, first.workflow.id)).lifecycleState, "closed");
    assert.equal((await service.getWorkRouteHistory(project.id, first.intake.id)).decisions.at(-1).body.outcome, "feature-change");
    const second = await service.createWorkIntake(project.id, { ...intakeInput, request: "Second request" });
    const secondAssessment = await advisor.recordRouteAssessment(project.id, second.intake.id, assessment("feature-change"),
      { correlationId: "architect-submission-2", causationId: `work-intake-record-version:${second.intake.recordVersion}` });
    const overridden = await service.completeWorkIntakeRouteHandoff(project.id, { intakeId: second.intake.id, routingWorkflowId: second.workflow.id,
      assessmentId: secondAssessment.id, disposition: "override", route: "issue-resolution", rationale: "Observed defect needs investigation.", targetTitle: "Defect" });
    assert.equal(overridden.workflow.body.workflowType, "issue-resolution");
    assert.notEqual(overridden.workflow.id, routed.workflow.id);
    assert.equal((await store.listRelationships(project.id, "routes_to")).filter(edge => edge.toEntityId === routed.workflow.id || edge.toEntityId === overridden.workflow.id).length, 2);
    assert.equal((await store.listEntities(project.id, "SourceBaseline")).length, 0);
    assert.equal((await store.listEntities(project.id, "SourceBinding")).length, 0);
  });
}

register("in-memory Project State", () => createInMemoryProjectStateStore());
register("SQLite Project State", sqliteFixture);
