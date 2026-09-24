const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createSQLiteProjectStateStore } = require("../../dist/main/projectState/sqliteProjectStateStore.js");
const { createProjectStateService } = require("../../dist/shared/projectState/projectStateService.js");
const { createWorkflowSourceMaterializationService } = require("../../dist/main/sourceControl/workflowSourceMaterializationService.js");
const { createImplementationCheckpoint } = require("../../dist/main/sourceControl/semanticCheckpointService.js");
const { createStructuredIntegrationService } = require("../../dist/main/sourceControl/structuredIntegrationService.js");

const operator = { principalId: "operator", principalType: "human", role: "Operator" };
const repositoryId = "structured-integration-repository";
function git(root, ...args) { return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim(); }

test("structured integration stores Workflow ownership and uses Workflow source plus Dev target checkouts", async context => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-structured-integration-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const dev = path.join(root, "Dev"); fs.mkdirSync(dev); git(dev, "init", "-b", "dev");
  git(dev, "config", "user.name", "Integration Test"); git(dev, "config", "user.email", "test@example.invalid");
  fs.mkdirSync(path.join(dev, ".champcity"));
  fs.writeFileSync(path.join(dev, ".champcity", "integration-policy.json"), JSON.stringify({ schemaVersion: 1,
    checks: [{ checkId: "accepted-source", lane: "integration", runner: { kind: "npm-script", script: "verify", timeoutMs: 15000 } }],
    requiredIntegrationChecks: ["accepted-source"], repair: null }));
  fs.writeFileSync(path.join(dev, "package.json"), JSON.stringify({ scripts: { verify: "node -e \"process.exit(0)\"" } }));
  fs.writeFileSync(path.join(dev, "feature.txt"), "base\n"); git(dev, "add", "."); git(dev, "commit", "-m", "base");
  const base = git(dev, "rev-parse", "HEAD"); fs.mkdirSync(path.join(root, ".champcity"));
  let store = createSQLiteProjectStateStore(path.join(root, ".champcity", "project-state.sqlite"));
  let state = createProjectStateService(store, operator);
  const project = await state.createRecord(null, "Project", { name: "Structured Integration", description: "Fixture" });
  await store.transaction(project.id, unit => unit.advanceProviderGeneration({ projectId: project.id, generation: 1, authority: "structured", updatedAt: new Date().toISOString() }, null));
  const { intake, workflow: routing } = await state.createWorkIntake(project.id, { request: "Integrate capability", desiredOutcome: "Accepted on dev", constraints: [], evidenceContext: [], requestedIntegrationTarget: "dev" });
  const assessment = await state.recordRouteAssessment(project.id, intake.id, { recommendation: "feature-change", traits: [], rationale: "Feature", evidenceIds: [] });
  const route = await state.recordRouteDecision(project.id, intake.id, { route: "feature-change", assessmentId: assessment.id, rationale: "Feature" });
  const workflow = await state.createWorkflow(project.id, { workflowType: "feature-capability", title: "Feature", currentWorkspace: "development" });
  await state.linkWorkflowRouteTarget(project.id, routing.id, workflow.id);
  const baseline = await state.createWorkflowSourceBaseline(project.id, workflow.id, { repositoryId, integrationTargetSourceLineId: "dev", baseRevisionId: base });
  store.close();
  const materializer = createWorkflowSourceMaterializationService({ projectContainerRoot: root, projectId: project.id, mcpWorkspaceId: "project",
    checkoutRegistration: { registerRepositoryCheckout: async (_id, checkout) => ({ ...checkout, availability: "available", validationError: null }) } });
  const materialized = await materializer.materialize(workflow.id);
  store = createSQLiteProjectStateStore(path.join(root, ".champcity", "project-state.sqlite")); state = createProjectStateService(store, operator);
  const sourceRoot = path.join(root, materialized.checkout.projectRelativePath);
  const work = await state.createRecord(project.id, "WorkItem", { workItemKind: "feature", title: "Implement", objective: "Add behavior", workState: "implemented" });
  await state.createRelationship(project.id, work.id, "part_of", workflow.id);
  const implementation = await state.recordImplementation(project.id, work.id, { summary: "Implemented", deviations: [], blockers: [], residualRisks: [], outcome: "implemented" });
  fs.writeFileSync(path.join(sourceRoot, "feature.txt"), "incoming accepted\n");
  const checkpoint = await createImplementationCheckpoint(root, project.id, { boundaryId: "incoming-checkpoint", workflowId: workflow.id,
    targetEntityId: implementation.id, sourceLineId: materialized.binding.body.workSourceLineId, expectedRevisionId: base,
    repositoryCheckoutId: materialized.binding.body.repositoryCheckoutId, attributablePaths: ["feature.txt"] });
  assert.equal(checkpoint.state, "committed", JSON.stringify(checkpoint));
  let savedIntake = await store.getEntity(project.id, intake.id);
  savedIntake = await state.advanceWorkIntake(project.id, intake.id, "active", savedIntake.recordVersion);
  await state.advanceWorkIntake(project.id, intake.id, "closed", savedIntake.recordVersion);
  const successor = (await state.supersedeRecord(project.id, workflow.id, { ...workflow.body, title: "Feature successor" }, workflow.recordVersion)).successor;
  store.close();

  const devBefore = git(dev, "rev-parse", "dev");
  const service = createStructuredIntegrationService(root, project.id, intake.id,
    { checks: [{ checkId: "accepted-source", run: async candidateRoot => ({ exitCode: fs.readFileSync(path.join(candidateRoot, "feature.txt"), "utf8").includes("incoming accepted") ? 0 : 1, summary: "Incoming source checked" }) }] });
  const integrated = await service.integrate();
  assert.equal(integrated.candidate.status, "integrated", integrated.candidate.message);
  assert.equal(integrated.candidate.targetBranch, "dev");
  assert.equal(integrated.integration.body.workflowId, successor.id);
  assert.equal(Object.hasOwn(integrated.integration.body, "workIntakeId"), false);
  assert.equal(integrated.integration.body.integrationState, "integrated");
  assert.equal(git(dev, "rev-parse", "dev"), integrated.candidate.candidateCommit);
  assert.notEqual(devBefore, integrated.candidate.candidateCommit);
  assert.equal(git(sourceRoot, "rev-parse", "HEAD"), checkpoint.revision.revisionId);
  assert.equal(git(dev, "branch", "--show-current"), "dev");
  assert.throws(() => git(root, "rev-parse", "--show-toplevel"));
  assert.equal(baseline.body.baseRevisionId, base);
  const verify = createSQLiteProjectStateStore(path.join(root, ".champcity", "project-state.sqlite"));
  try {
    const savedBaseline = (await verify.listEntities(project.id, "SourceBaseline"))[0];
    const savedBinding = (await verify.listEntities(project.id, "SourceBinding"))[0];
    const savedWorkflow = await verify.getEntity(project.id, successor.id);
    const routes = await verify.listRelationships(project.id, "routes_to");
    assert.equal(savedBaseline.body.workflowId, workflow.id);
    assert.equal(savedBinding.body.workflowId, workflow.id);
    assert.equal(savedBinding.body.workSourceLineId, materialized.binding.body.workSourceLineId);
    assert.equal(savedWorkflow.lineageId, workflow.lineageId);
    assert.ok(routes.some(edge => edge.toEntityId === workflow.id));
  } finally { verify.close(); }
  const retry = await service.integrate(); assert.equal(retry.integration.id, integrated.integration.id); assert.equal(route.entityType, "Decision");
});
