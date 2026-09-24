const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createSQLiteProjectStateStore } = require("../../dist/main/projectState/sqliteProjectStateStore.js");
const { createProjectStateService } = require("../../dist/shared/projectState/projectStateService.js");
const { selectStructuredWorkRoute, recordStructuredImplementation, recordStructuredWorkDisposition } =
  require("../../dist/main/sourceControl/structuredWorkflowCheckpointService.js");

const operator = { principalId: "operator", principalType: "human", role: "Operator" };
function git(root, ...args) { return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim(); }

test("intake-keyed checkpoints accept target Workflow lineage and reject WIR ancestry", async context => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-structured-workflow-lineage-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));

  // Prepare a bounded Git source line directly; Work Intake capture is deliberately not a source materializer.
  git(root, "init", "-b", "main");
  git(root, "config", "user.name", "Test Operator");
  git(root, "config", "user.email", "operator@example.invalid");
  fs.writeFileSync(path.join(root, "feature.txt"), "baseline\n");
  git(root, "add", "feature.txt");
  git(root, "commit", "-m", "baseline");
  const baseRevision = git(root, "rev-parse", "HEAD");
  git(root, "switch", "-c", "work-line");

  fs.mkdirSync(path.join(root, ".champcity"));
  const store = createSQLiteProjectStateStore(path.join(root, ".champcity", "project-state.sqlite"));
  const state = createProjectStateService(store, operator);
  const project = await state.createRecord(null, "Project", { name: "Structured workflow", description: "Lineage ownership fixture" });
  await store.transaction(project.id, unit => unit.advanceProviderGeneration({
    projectId: project.id, generation: 1, authority: "structured", updatedAt: new Date().toISOString(),
  }, null));
  const resource = await state.createRecord(project.id, "ProjectResource", { resourceType: "source-repository", provider: "git",
    logicalName: "repo-lineage", locator: "test-selected-repository", role: "project-source" });
  const { intake, workflow: routingWorkflow } = await state.createWorkIntake(project.id, {
    request: "Implement feature", desiredOutcome: "Working feature", constraints: [], evidenceContext: [],
    requestedIntegrationTarget: "dev", hasExistingSourceOrPlanning: true,
  });
  const target = await state.createWorkflow(project.id, { workflowType: "feature-capability", title: "Feature implementation", currentWorkspace: "development" });
  await state.linkWorkflowRouteTarget(project.id, routingWorkflow.id, target.id);
  const baseline = await state.createWorkflowSourceBaseline(project.id, target.id, {
    repositoryId: resource.body.logicalName, integrationTargetSourceLineId: "main", baseRevisionId: baseRevision,
  });
  const successor = (await state.supersedeRecord(project.id, target.id, { ...target.body, title: "Feature implementation successor" }, 1)).successor;
  assert.equal((await state.getWorkIntakeSummary(project.id, intake.id)).targetWorkflowId, target.id);
  const binding = await state.createWorkflowSourceBinding(project.id, successor.id, baseline.id);
  await state.updateSourceBinding(project.id, binding.id, { preparationState: "preparing" }, 1);
  const readyBinding = await state.updateSourceBinding(project.id, binding.id,
    { preparationState: "ready", workSourceLineId: "work-line", currentRevisionId: baseRevision }, 2);
  assert.equal(readyBinding.body.workflowId, successor.id);
  assert.equal(readyBinding.body.sourceBaselineId, baseline.id);

  const work = await state.createRecord(project.id, "WorkItem", {
    workItemKind: "feature", title: "Feature", objective: "Implement feature", workState: "implemented",
  });
  await state.createRelationship(project.id, work.id, "part_of", successor.id);
  const wrongOwnerWork = await state.createRecord(project.id, "WorkItem", {
    workItemKind: "feature", title: "Wrong owner", objective: "Reject WIR ancestry", workState: "implemented",
  });
  await state.createRelationship(project.id, wrongOwnerWork.id, "part_of", routingWorkflow.id);
  store.close();

  const routeStore = createSQLiteProjectStateStore(path.join(root, ".champcity", "project-state.sqlite"));
  const routeState = createProjectStateService(routeStore, operator);
  const assessment = await routeState.recordRouteAssessment(project.id, intake.id,
    { recommendation: "feature-change", traits: [], rationale: "Feature", evidenceIds: [] });
  routeStore.close();
  const routeInput = { route: "feature-change", assessmentId: assessment.id, rationale: "Operator selects feature route" };
  const route = await selectStructuredWorkRoute(root, project.id, intake.id, routeInput);
  assert.equal(route.checkpoint.state, "committed", JSON.stringify(route.checkpoint));
  const routeHead = git(root, "rev-parse", "HEAD");
  const routeRetry = await selectStructuredWorkRoute(root, project.id, intake.id, routeInput);
  assert.equal(routeRetry.record.id, route.record.id);
  assert.equal(routeRetry.checkpoint.revision.revisionId, routeHead);
  assert.equal(git(root, "rev-parse", "HEAD"), routeHead);

  fs.writeFileSync(path.join(root, "feature.txt"), "implemented\n");
  const implementationInput = { summary: "Feature implemented", deviations: [], blockers: [], residualRisks: [],
    outcome: "implemented", executionRef: "execution-target-lineage" };
  await assert.rejects(recordStructuredImplementation(root, project.id, intake.id, wrongOwnerWork.id,
    { ...implementationInput, executionRef: "execution-wir-lineage" }, "wrong-owner-implementation", ["feature.txt"]),
  /not owned by the selected target Workflow lineage/);

  const implementation = await recordStructuredImplementation(root, project.id, intake.id, work.id,
    implementationInput, "implementation-target-lineage", ["feature.txt"]);
  assert.equal(implementation.record.body.workItemId, work.id);
  assert.equal(implementation.checkpoint.state, "committed", JSON.stringify(implementation.checkpoint));
  const implementationHead = git(root, "rev-parse", "HEAD");
  assert.equal(implementation.checkpoint.revision.revisionId, implementationHead);

  await assert.rejects(recordStructuredWorkDisposition(root, project.id, intake.id, wrongOwnerWork.id,
    { decisionType: "review", outcome: "accepted", rationale: "Reject wrong owner", decisionScope: "wrong-owner" },
    "wrong-owner-disposition"), /not owned by the selected target Workflow lineage/);
  const disposition = await recordStructuredWorkDisposition(root, project.id, intake.id, work.id,
    { decisionType: "review", outcome: "accepted", rationale: "Target lineage accepted", decisionScope: "target-owner" },
    "disposition-target-lineage");
  assert.equal(disposition.record.body.decisionScope, "target-owner");
  assert.equal(disposition.checkpoint.state, "committed", JSON.stringify(disposition.checkpoint));
  assert.equal(git(root, "branch", "--show-current"), "work-line");
});
