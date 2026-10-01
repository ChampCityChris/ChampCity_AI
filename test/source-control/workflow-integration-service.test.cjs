const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createSQLiteProjectStateStore } = require("../../dist/main/projectState/sqliteProjectStateStore.js");
const { createProjectStateService } = require("../../dist/shared/projectState/projectStateService.js");
const { registerCurrentProject, CURRENT_PROJECT_REPOSITORY_ID } = require("../../dist/main/projectState/currentProjectRegistrationService.js");
const { createWorkflowExecutionApplicationService } = require("../../dist/main/workflow/workflowExecutionApplicationService.js");
const { createWorkflowSourceMaterializationService } = require("../../dist/main/sourceControl/workflowSourceMaterializationService.js");
const { createImplementationCheckpoint } = require("../../dist/main/sourceControl/semanticCheckpointService.js");
const { createWorkflowIntegrationService } = require("../../dist/main/sourceControl/workflowIntegrationService.js");
const { createIssuePlanningService } = require("../../dist/main/issuePlanning/issuePlanningService.js");

const operator = { principalId: "operator", principalType: "human", role: "Operator" };
function git(root, ...args) { return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim(); }

async function qualifyExactWorkflowIntegration(context, workflowType) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-exact-workflow-integration-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const seed = path.join(root, "seed"); fs.mkdirSync(seed, { recursive: true });
  git(seed, "init", "-b", "dev"); git(seed, "config", "user.name", "Workflow Integration Test"); git(seed, "config", "user.email", "workflow@example.invalid");
  fs.mkdirSync(path.join(seed, ".champcity"));
  fs.writeFileSync(path.join(seed, ".champcity", "integration-policy.json"), JSON.stringify({ schemaVersion: 1,
    checks: [{ checkId: "accepted-source", lane: "integration", runner: { kind: "npm-script", script: "verify", timeoutMs: 15000 } }],
    requiredIntegrationChecks: ["accepted-source"] }));
  fs.writeFileSync(path.join(seed, "package.json"), JSON.stringify({ scripts: { verify: "node -e \"process.exit(0)\"" } }));
  fs.writeFileSync(path.join(seed, "feature.txt"), "baseline\n"); git(seed, "add", "."); git(seed, "commit", "-m", "baseline");
  const metadata = path.join(root, ".champcity"); fs.mkdirSync(metadata);
  const bare = path.join(metadata, "repository.git"); git(root, "clone", "--bare", seed, bare);
  const dev = path.join(root, "Dev"); git(bare, "worktree", "add", dev, "dev");
  const registration = await registerCurrentProject(root, "existing", { projectName: "Exact Workflow Integration", sourceRepositoryId: CURRENT_PROJECT_REPOSITORY_ID });
  let store = createSQLiteProjectStateStore(path.join(metadata, "project-state.sqlite"));
  let state = createProjectStateService(store, operator);
  const projectId = registration.project.id;
  const created = await state.createSubstantiveWorkflow(projectId, { workflowType, title: `Exact ${workflowType} integration`, entryWorkspace: workflowType === "feature-capability" ? "feature-intake" : "issue-intake" });
  let rootCause;
  if (workflowType === "issue-resolution") {
    store.close();
    const issuePlanning = createIssuePlanningService();
    await issuePlanning.saveIntake(root, created.workflow.id, { title: "Incomplete response", observed: "A response omits the accepted item.",
      expected: "The accepted item is present.", reproduction: "Request the item and inspect the response.", environment: "Synthetic test", impact: "The requested result is incomplete.", constraints: "Preserve the current response contract." });
    const intakeService = require("../../dist/main/workflow/workflowIntakeService.js").createWorkflowIntakeService();
    const intakeForReview = await intakeService.ensureWorkflowIntake(root, created.workflow.id);
    await intakeService.reviewWorkflowIntake(root, created.workflow.id, {expectedIntakeRecordVersion: intakeForReview.recordVersion, outcome: "approved"});
    await issuePlanning.prepare(root, created.workflow.id, "rca");
    store = createSQLiteProjectStateStore(path.join(metadata, "project-state.sqlite")); state = createProjectStateService(store, operator);
    const finding = (await store.listEntities(projectId, "WorkflowIntake")).find(record => record.entityType === "WorkflowIntake" && record.body.workflowId === created.workflow.id);
    assert.ok(finding);
    const evidence = await state.recordEvidence(projectId, created.workflow.id, { evidenceType: "issue-supplied", description: "Synthetic reproduction",
      mediaType: "text/plain", payloadRef: "test:issue-reproduction", digest: "a".repeat(64) });
    await state.createRelationship(projectId, evidence.id, "supports", finding.id);
    const acceptedRca = await state.acceptIssueRca(projectId, { workflowId: created.workflow.id, rationale: "Evidence confirms the correction target.",
      rootCauses: [{ title: "Missing accepted content", statement: "The response omits the required item.", rationale: "Matches reproduction evidence.", findingIds: [], evidenceIds: [evidence.id] }] });
    rootCause = acceptedRca.rootCauses[0];
  }
  const accepted = await state.acceptWorkflowPlanningGraph(projectId, { workflowId: created.workflow.id, topology: "direct",
    ...(rootCause ? { solutionAddresses: [rootCause.id] } : {}),
    solution: { title: "Accepted", objective: "Deliver the behavior", scopeIn: ["feature.txt"], scopeOut: [], constraints: [], assumptions: [], risks: [] },
    solutionCriteria: [], phases: [], workItems: [{ key: "feature", kind: workflowType === "feature-capability" ? "feature" : "fix", title: "Correction", objective: "Change feature.txt", dependencyKeys: [],
      criteria: workflowType === "feature-capability" ? [{ statement: "The updated interface is legible", criticality: "required", verificationIntent: "Inspect the exact current visual candidate", validationPolicy: "visual_human" }] : [] }] });
  const workItem = accepted.directWorkItems[0];
  assert.equal((await state.getWorkflowExecutionPlan(projectId, created.workflow.id)).solutions[0].id, accepted.solutions[0].id);
  const baseline = await state.createWorkflowSourceBaseline(projectId, created.workflow.id,
    { repositoryId: CURRENT_PROJECT_REPOSITORY_ID, integrationTargetSourceLineId: "dev", baseRevisionId: git(dev, "rev-parse", "dev") });
  store.close();
  const materializer = createWorkflowSourceMaterializationService({ projectContainerRoot: root, projectId });
  const materialized = await materializer.materialize(created.workflow.id);
  const checkout = path.join(root, materialized.checkout.projectRelativePath);
  const kernel = createWorkflowExecutionApplicationService();
  const attempt = await kernel.beginWorkItemAttempt(root, created.workflow.id, workItem.id, workItem.recordVersion, `integration-implementation-${workflowType}`);
  const implementation = await kernel.finishWorkItemAttempt(root, created.workflow.id, workItem.id, attempt.executionRef,
    { summary: "Updated feature source", deviations: [], blockers: [], residualRisks: [], outcome: "implemented" });
  fs.writeFileSync(path.join(checkout, "feature.txt"), "accepted workflow change\n");
  const checkpoint = await createImplementationCheckpoint(root, projectId, { boundaryId: `workflow-integration-checkpoint-${workflowType}`, workflowId: created.workflow.id,
    targetEntityId: implementation.id, sourceLineId: materialized.binding.body.workSourceLineId, expectedRevisionId: materialized.binding.body.currentRevisionId,
    repositoryCheckoutId: materialized.binding.body.repositoryCheckoutId, attributablePaths: ["feature.txt"] });
  assert.equal(checkpoint.state, "committed", JSON.stringify(checkpoint));
  store = createSQLiteProjectStateStore(path.join(metadata, "project-state.sqlite")); state = createProjectStateService(store, operator);
  const tester = createProjectStateService(store, { principalId: "workflow-tester", principalType: "agent", role: "Tester" });
  const testerResult = await tester.createTesterResult(projectId, created.workflow.id, workItem.id, implementation.id,
    { sourceMode: "source-backed", implementerRevisionId: checkpoint.revision.revisionId, recommendation: "no-permanent-test-required",
      affectedCapabilityIds: [], permanentTestPaths: [], determinationEvidence: ["Focused implementation evidence inspected"], unknowns: [],
      rationale: "The behavior change does not require a permanent test artifact." });
  assert.equal(testerResult.body.sourceMode, "source-backed");
  if (workflowType === "feature-capability") {
    const visualCriterion = accepted.criteria.find(entry => entry.ownerId === workItem.id).record;
    const visual = await kernel.recordWorkItemVisualCriterion(root, { workflowId: created.workflow.id, workItemId: workItem.id, criterionId: visualCriterion.id,
      expectedCriterionVersion: visualCriterion.recordVersion, outcome: "pass", summary: "Reviewed the exact source-backed candidate after Tester checkpoint; the interface is legible." });
    assert.equal(visual.validation.body.validationMode, "visual_human");
    assert.deepEqual(visual.validation.body.performedBy, { principalId: "local-operator", principalType: "human", role: "Operator" });
  }
  const currentWorkItem = await state.getRecord(projectId, workItem.id);
  await kernel.completeWorkItem(root, created.workflow.id, workItem.id, currentWorkItem.recordVersion);
  const completion = await kernel.getWorkflowExecutionCompletionProjection(root, created.workflow.id);
  assert.equal(completion.eligible, true, completion.blockers.join(", "));
  await kernel.completeWorkflowExecution(root, created.workflow.id, completion.workflowVersion);
  store.close();
  const integrationReadyStore = createSQLiteProjectStateStore(path.join(metadata, "project-state.sqlite"));
  try {
    const recovered = await integrationReadyStore.getEntity(projectId, created.workflow.id);
    assert.equal(recovered.body.currentWorkspace, "integration-ready");
    assert.equal((await integrationReadyStore.listEntities(projectId, "IntegrationRecord")).length, 0);
  } finally { integrationReadyStore.close(); }

  const service = createWorkflowIntegrationService(root, created.workflow.id);
  const integrated = await service.integrate();
  assert.equal(integrated.candidate.status, "integrated");
  assert.equal(integrated.integration.body.workflowId, created.workflow.id);
  assert.equal(integrated.integration.body.integrationState, "integrated");
  assert.deepEqual(integrated.integration.createdBy, { principalId: "workflow-integration-application", principalType: "system", role: "WorkflowIntegration" });
  assert.deepEqual(integrated.integration.updatedBy, { principalId: "workflow-integration-application", principalType: "system", role: "WorkflowIntegration" });
  const verify = createSQLiteProjectStateStore(path.join(metadata, "project-state.sqlite"));
  try {
    const validations = (await verify.listEntities(projectId, "Validation")).filter(record => record.entityType === "Validation" && record.body.targetEntityId === integrated.integration.id);
    assert.equal(validations.length, 1);
    assert.deepEqual(validations[0].body.performedBy, { principalId: "workflow-integration-application", principalType: "system", role: "WorkflowIntegration" });
    assert.deepEqual(integrated.integration.body.validationIds, [validations[0].id]);
    const savedWorkflow = await verify.getEntity(projectId, created.workflow.id);
    assert.equal(savedWorkflow.lifecycleState, "closed");
    assert.equal(git(dev, "rev-parse", "dev"), integrated.candidate.targetAfterRevisionId);
    assert.equal(baseline.body.workflowId, created.workflow.id);
    if (rootCause) assert.ok((await verify.listEntities(projectId, "RootCause")).some(record => record.id === rootCause.id));
  } finally { verify.close(); }
}

test("Feature source-backed vertical uses exact Workflow integration with attributed idempotent validation", context => qualifyExactWorkflowIntegration(context, "feature-capability"));
test("Issue accepted correction vertical uses the same exact Workflow services and pre-plan RCA context", context => qualifyExactWorkflowIntegration(context, "issue-resolution"));
