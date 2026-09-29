const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createSQLiteProjectStateStore } = require("../../dist/main/projectState/sqliteProjectStateStore.js");
const { registerCurrentProject } = require("../../dist/main/projectState/currentProjectRegistrationService.js");
const { createProjectStateService } = require("../../dist/shared/projectState/projectStateService.js");
const { createWorkflowSourceMaterializationService } = require("../../dist/main/sourceControl/workflowSourceMaterializationService.js");
const { selectStructuredWorkRoute, recordStructuredImplementation, recordStructuredWorkDisposition, retryStructuredImplementationCheckpoint } = require("../../dist/main/sourceControl/structuredWorkflowCheckpointService.js");

const operator = { principalId: "operator", principalType: "human", role: "Operator" };
const repositoryId = "workflow-wrapper-repository";
function git(root, ...args) { return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim(); }
test("WIR route decisions do not checkpoint; implementation and disposition use Workflow-owned checkout", async context => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-structured-workflow-lineage-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const dev = path.join(root, "Dev"); fs.mkdirSync(dev); git(dev, "init", "-b", "dev");
  git(dev, "config", "user.name", "Test Operator"); git(dev, "config", "user.email", "operator@example.invalid");
  fs.writeFileSync(path.join(dev, "feature.txt"), "baseline\n"); git(dev, "add", "feature.txt"); git(dev, "commit", "-m", "baseline");
  const baseRevision = git(dev, "rev-parse", "HEAD"); fs.mkdirSync(path.join(root, ".champcity"));
  const registration = await registerCurrentProject(root, "existing", { projectName: "Structured workflow", sourceRepositoryId: repositoryId });
  const store = createSQLiteProjectStateStore(path.join(root, ".champcity", "project-state.sqlite"));
  const state = createProjectStateService(store, operator);
  const project = registration.project;
  const { intake, workflow: routing } = await state.createWorkIntake(project.id, { request: "Implement", desiredOutcome: "Working", constraints: [], evidenceContext: [], requestedIntegrationTarget: "dev" });
  const assessment = await state.recordRouteAssessment(project.id, intake.id, { recommendation: "feature-change", traits: [], rationale: "Feature", evidenceIds: [] });
  const route = await selectStructuredWorkRoute(root, project.id, intake.id, { route: "feature-change", assessmentId: assessment.id, rationale: "Choose feature" });
  assert.equal(route.checkpoint.state, "not-required"); assert.equal(route.checkpoint.checkpointId, null); assert.equal(route.checkpoint.revision, null);
  assert.equal(route.checkpoint.message, "Routing decision does not own source.");
  assert.equal(git(dev, "branch", "--show-current"), "dev");

  const target = await state.createWorkflow(project.id, { workflowType: "feature-capability", title: "Feature", currentWorkspace: "development" });
  await state.linkWorkflowRouteTarget(project.id, routing.id, target.id);
  const work = await state.createRecord(project.id, "WorkItem", { workItemKind: "feature", title: "Owned", objective: "Implement", workState: "implemented" });
  await state.createRelationship(project.id, work.id, "part_of", target.id);
  const other = await state.createSubstantiveWorkflow(project.id, { workflowType: "issue-resolution", title: "Other", entryWorkspace: "issue-intake" });
  const wrong = await state.createRecord(project.id, "WorkItem", { workItemKind: "feature", title: "Wrong", objective: "Reject", workState: "implemented" });
  await state.createRelationship(project.id, wrong.id, "part_of", other.workflow.id);
  const baseline = await state.createWorkflowSourceBaseline(project.id, target.id, { repositoryId, integrationTargetSourceLineId: "dev", baseRevisionId: baseRevision });
  const successor = (await state.supersedeRecord(project.id, target.id, { ...target.body, title: "Feature successor" }, 1)).successor;
  const materializer = createWorkflowSourceMaterializationService({ projectContainerRoot: root, projectId: project.id, mcpWorkspaceId: "project",
    checkoutRegistration: { registerRepositoryCheckout: async (_id, checkout) => ({ ...checkout, availability: "available", validationError: null }) } });
  const materialized = await materializer.materialize(successor.id); store.close();
  assert.equal(materialized.binding.body.sourceBaselineId, baseline.id);
  const checkout = path.join(root, materialized.checkout.projectRelativePath);
  const sourceLineId = materialized.binding.body.workSourceLineId;
  const currentStore = createSQLiteProjectStateStore(path.join(root, ".champcity", "project-state.sqlite"));
  const currentState = createProjectStateService(currentStore, operator);
  currentStore.close();

  const implementationInput = { summary: "Feature implemented", deviations: [], blockers: [], residualRisks: [], outcome: "implemented", executionRef: "execution-target" };
  await assert.rejects(recordStructuredImplementation(root, project.id, target.id, work.id, { ...implementationInput, executionRef: "historical-owner" }, "historical-implementation", ["feature.txt"]), /unique current Workflow owner/);
  await assert.rejects(recordStructuredImplementation(root, project.id, successor.id, wrong.id, { ...implementationInput, executionRef: "wrong" }, "wrong-owner", ["feature.txt"]), /not owned by the selected target Workflow lineage/);
  fs.writeFileSync(path.join(checkout, "feature.txt"), "implemented\n");
  const implementation = await recordStructuredImplementation(root, project.id, successor.id, work.id, implementationInput, implementationInput.executionRef, ["feature.txt"]);
  assert.equal(implementation.record.body.workItemId, work.id); assert.equal(implementation.checkpoint.state, "committed");
  assert.equal(git(dev, "branch", "--show-current"), "dev");
  const badDecision = { decisionType: "review", outcome: "accepted", rationale: "Wrong owner", decisionScope: "wrong-owner" };
  await assert.rejects(recordStructuredWorkDisposition(root, project.id, target.id, work.id, { ...badDecision, decisionScope: "historical-owner" }, "historical-disposition"), /unique current Workflow owner/);
  await assert.rejects(recordStructuredWorkDisposition(root, project.id, successor.id, wrong.id, badDecision, "wrong-disposition"), /not owned by the selected target Workflow lineage/);
  const verify = createSQLiteProjectStateStore(path.join(root, ".champcity", "project-state.sqlite"));
  let verifyOpen = true;
  try {
    const currentWork = await verify.getEntity(project.id, work.id);
    await createProjectStateService(verify, operator).reviseRecord(project.id, work.id, { ...currentWork.body, workState: "validation_pending" }, currentWork.recordVersion);
    const savedCheckpoints = await verify.listEntities(project.id, "SourceCheckpoint");
    const implementationCheckpoint = savedCheckpoints.find(row => row.body.boundaryId === implementationInput.executionRef);
    assert.ok(implementationCheckpoint);
    fs.mkdirSync(path.join(root, ".champcity", "runtime", "work-item-attempts"), { recursive: true });
    fs.writeFileSync(path.join(root, ".champcity", "runtime", "work-item-attempts", `${implementationInput.executionRef}.json`), JSON.stringify({
      schemaVersion: 1, projectId: project.id, workflowId: successor.id, workItemId: work.id, executionRef: implementationInput.executionRef,
      contractDigest: "a".repeat(64), sourceCheckpointAttempt: { repositoryCheckoutId: materialized.binding.body.repositoryCheckoutId,
        sourceLineId, expectedRevisionId: implementationCheckpoint.body.expectedRevisionId, attributablePaths: ["feature.txt"] },
    }));
    const historyBeforeRetry = git(checkout, "rev-list", "--count", "HEAD");
    const bindingBeforeRetry = (await verify.listEntities(project.id, "SourceBinding")).find(row => row.body.workflowId === successor.id);
    assert.equal(git(checkout, "rev-parse", "HEAD"), implementationCheckpoint.body.resultingRevisionId);
    assert.equal(bindingBeforeRetry.body.currentRevisionId, implementationCheckpoint.body.resultingRevisionId);
    verify.close(); verifyOpen = false;
    const recovered = await retryStructuredImplementationCheckpoint(root, project.id, successor.id, work.id, implementation.record.id);
    assert.equal(recovered.checkpoint.state, "committed", recovered.checkpoint.message);
    assert.equal(recovered.checkpoint.checkpointId, implementation.checkpoint.checkpointId);
    assert.equal(git(checkout, "rev-list", "--count", "HEAD"), historyBeforeRetry, "retry reuses the durable checkpoint without a duplicate commit");
    const recoveredStore = createSQLiteProjectStateStore(path.join(root, ".champcity", "project-state.sqlite"));
    const checkpoints = await recoveredStore.listEntities(project.id, "SourceCheckpoint");
    assert.equal(checkpoints.filter(row => row.body.boundaryId === implementationInput.executionRef).length, 1);
    recoveredStore.close();
  } finally {
    if (verifyOpen) verify.close();
  }
  const finalStore = createSQLiteProjectStateStore(path.join(root, ".champcity", "project-state.sqlite"));
  try {
    const checkpoints = await finalStore.listEntities(project.id, "SourceCheckpoint"); assert.equal(checkpoints.length, 1);
    assert.ok(checkpoints.every(row => row.body.workflowId === successor.id && !Object.hasOwn(row.body, "workIntakeId")));
    assert.equal(git(checkout, "branch", "--show-current"), sourceLineId);
  } finally { finalStore.close(); }
  const disposition = await recordStructuredWorkDisposition(root, project.id, successor.id, work.id,
    { decisionType: "review", outcome: "accepted", rationale: "Accepted", decisionScope: "target-owner" }, "disposition-boundary");
  assert.equal(disposition.checkpoint.state, "committed");
  const afterDisposition = createSQLiteProjectStateStore(path.join(root, ".champcity", "project-state.sqlite"));
  try { assert.equal((await afterDisposition.listEntities(project.id, "SourceCheckpoint")).length, 2); } finally { afterDisposition.close(); }
});
