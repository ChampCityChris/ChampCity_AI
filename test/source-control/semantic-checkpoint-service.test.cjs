const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createSQLiteProjectStateStore } = require("../../dist/main/projectState/sqliteProjectStateStore.js");
const { createProjectStateService } = require("../../dist/shared/projectState/projectStateService.js");
const { createWorkflowSourceMaterializationService } = require("../../dist/main/sourceControl/workflowSourceMaterializationService.js");
const { createImplementationCheckpoint, createDispositionCheckpoint } = require("../../dist/main/sourceControl/semanticCheckpointService.js");

const operator = { principalId: "operator", principalType: "human", role: "Operator" };
const repositoryId = "checkpoint-repository";
function git(root, ...args) { return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim(); }
async function fixture(context) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-checkpoint-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const dev = path.join(root, "Dev"); fs.mkdirSync(dev); git(dev, "init", "-b", "dev");
  git(dev, "config", "user.email", "test@example.invalid"); git(dev, "config", "user.name", "Checkpoint Test");
  fs.writeFileSync(path.join(dev, "base.txt"), "base\n"); git(dev, "add", "base.txt"); git(dev, "commit", "-m", "base");
  const head = git(dev, "rev-parse", "HEAD"); fs.mkdirSync(path.join(root, ".champcity"));
  const store = createSQLiteProjectStateStore(path.join(root, ".champcity", "project-state.sqlite"));
  const state = createProjectStateService(store, operator);
  const project = await state.createRecord(null, "Project", { name: "Checkpoint project", description: "Fixture" });
  await state.createRecord(project.id, "ProjectResource", { resourceType: "source-repository", provider: "git", logicalName: repositoryId, locator: "selected-project", role: "project-source" });
  const workflow = await state.createWorkflow(project.id, { workflowType: "feature-capability", title: "Feature", currentWorkspace: "development" });
  const baseline = await state.createWorkflowSourceBaseline(project.id, workflow.id, { repositoryId, integrationTargetSourceLineId: "dev", baseRevisionId: head });
  const phase = await state.createRecord(project.id, "Phase", { title: "Phase", objective: "Deliver", phaseState: "active", sequence: 1 });
  await state.createRelationship(project.id, phase.id, "part_of", workflow.id);
  const work = await state.createRecord(project.id, "WorkItem", { workItemKind: "feature", title: "Feature", objective: "Implement", workState: "implemented" });
  await state.createRelationship(project.id, work.id, "part_of", phase.id);
  const implementation = await state.recordImplementation(project.id, work.id, { summary: "Implemented", deviations: [], blockers: [], residualRisks: [], outcome: "implemented" });
  const decision = await state.recordDecision(project.id, work.id, { decisionType: "accept", outcome: "accepted", rationale: "Reviewed", decisionScope: "work-item" });
  store.close();
  const materializer = createWorkflowSourceMaterializationService({ projectContainerRoot: root, projectId: project.id, mcpWorkspaceId: "project",
    checkoutRegistration: { registerRepositoryCheckout: async (_id, checkout) => ({ ...checkout, availability: "available", validationError: null }) } });
  const materialized = await materializer.materialize(workflow.id);
  const checkout = path.join(root, materialized.checkout.projectRelativePath);
  return { root, dev, checkout, projectId: project.id, workflowId: workflow.id, checkoutId: materialized.checkout.repositoryCheckoutId,
    line: materialized.binding.body.workSourceLineId, head, workId: work.id, implementationId: implementation.id, decisionId: decision.id };
}
function implementation(f) { return { boundaryId: "implementation-1", workflowId: f.workflowId, targetEntityId: f.implementationId,
  sourceLineId: f.line, expectedRevisionId: f.head, repositoryCheckoutId: f.checkoutId, attributablePaths: ["feature.txt"] }; }

test("implementation checkpoint writes only to Workflow checkout and retries by exact identity", async context => {
  const f = await fixture(context); fs.writeFileSync(path.join(f.checkout, "feature.txt"), "feature content\n");
  const first = await createImplementationCheckpoint(f.root, f.projectId, implementation(f));
  assert.equal(first.state, "committed", JSON.stringify(first));
  assert.equal(first.revision.revisionId, git(f.checkout, "rev-parse", "HEAD"));
  assert.equal(git(f.checkout, "show", "--format=", "--name-only", "HEAD"), "feature.txt");
  assert.throws(() => git(f.root, "rev-parse", "--show-toplevel"));
  assert.equal(git(f.dev, "branch", "--show-current"), "dev");
  const store = createSQLiteProjectStateStore(path.join(f.root, ".champcity", "project-state.sqlite"));
  try { const binding = (await store.listEntities(f.projectId, "SourceBinding"))[0]; assert.equal(binding.body.currentRevisionId, first.revision.revisionId);
    const saved = await store.getEntity(f.projectId, first.checkpointId); assert.equal(saved.body.workflowId, f.workflowId); assert.equal(Object.hasOwn(saved.body, "workIntakeId"), false); }
  finally { store.close(); }
  const second = await createImplementationCheckpoint(f.root, f.projectId, implementation(f));
  assert.equal(second.checkpointId, first.checkpointId); assert.equal(git(f.checkout, "rev-list", "--count", f.line), "2");
});

test("checkout and source line mismatches block without touching project or Dev roots", async context => {
  const f = await fixture(context); fs.writeFileSync(path.join(f.checkout, "feature.txt"), "feature content\n");
  assert.equal((await createImplementationCheckpoint(f.root, f.projectId, { ...implementation(f), sourceLineId: "wrong" })).state, "blocked");
  assert.equal((await createImplementationCheckpoint(f.root, f.projectId, { ...implementation(f), repositoryCheckoutId: "wrong-checkout" })).state, "blocked");
  assert.equal(git(f.dev, "branch", "--show-current"), "dev"); assert.equal(git(f.checkout, "rev-parse", "HEAD"), f.head);
});

test("historical Workflow checkpoint IDs block before Git mutation while the successor uses the immutable baseline checkout", async context => {
  const f = await fixture(context);
  const store = createSQLiteProjectStateStore(path.join(f.root, ".champcity", "project-state.sqlite"));
  const state = createProjectStateService(store, operator);
  const prior = await store.getEntity(f.projectId, f.workflowId);
  const successor = (await state.supersedeRecord(f.projectId, f.workflowId, { ...prior.body, title: "Successor" }, prior.recordVersion)).successor;
  store.close();
  fs.writeFileSync(path.join(f.checkout, "feature.txt"), "feature content\n");
  const historical = await createImplementationCheckpoint(f.root, f.projectId, implementation(f));
  assert.equal(historical.state, "blocked");
  assert.match(historical.message, /unique current active nonterminal substantive Workflow owner/);
  assert.equal(git(f.checkout, "rev-parse", "HEAD"), f.head);
  const current = await createImplementationCheckpoint(f.root, f.projectId, { ...implementation(f), workflowId: successor.id });
  assert.equal(current.state, "committed", JSON.stringify(current));
  assert.equal(git(f.checkout, "rev-parse", "HEAD"), current.revision.revisionId);
  assert.equal(git(f.checkout, "branch", "--show-current"), f.line);
  assert.equal(git(f.dev, "branch", "--show-current"), "dev");
  const verify = createSQLiteProjectStateStore(path.join(f.root, ".champcity", "project-state.sqlite"));
  try {
    const baseline = (await verify.listEntities(f.projectId, "SourceBaseline"))[0];
    const binding = (await verify.listEntities(f.projectId, "SourceBinding"))[0];
    const saved = await verify.getEntity(f.projectId, current.checkpointId);
    assert.equal(baseline.body.workflowId, f.workflowId);
    assert.equal(binding.body.workSourceLineId, f.line);
    assert.equal(saved.body.workflowId, successor.id);
    assert.equal((await verify.listEntities(f.projectId, "Workflow")).length, 2);
  } finally { verify.close(); }
});

test("disposition creates an evidenced empty revision on the owning Workflow checkout", async context => {
  const f = await fixture(context); const request = { boundaryId: "disposition-1", workflowId: f.workflowId, targetEntityId: f.workId,
    sourceLineId: f.line, expectedRevisionId: f.head, repositoryCheckoutId: f.checkoutId, dispositionId: f.decisionId, attributablePaths: [] };
  const first = await createDispositionCheckpoint(f.root, f.projectId, request);
  assert.equal(first.state, "committed", JSON.stringify(first)); assert.equal(git(f.checkout, "show", "--format=", "--name-only", "HEAD"), "");
  assert.equal((await createDispositionCheckpoint(f.root, f.projectId, request)).revision.revisionId, first.revision.revisionId);
});

test("independent Workflow checkouts use independent checkpoint exclusion keys", async context => {
  const f = await fixture(context); const store = createSQLiteProjectStateStore(path.join(f.root, ".champcity", "project-state.sqlite"));
  const state = createProjectStateService(store, operator);
  const workflow = await state.createWorkflow(f.projectId, { workflowType: "feature-capability", title: "Second", currentWorkspace: "development" });
  await state.createWorkflowSourceBaseline(f.projectId, workflow.id, { repositoryId, integrationTargetSourceLineId: "dev", baseRevisionId: f.head });
  const phase = await state.createRecord(f.projectId, "Phase", { title: "Second phase", objective: "Deliver", phaseState: "active", sequence: 2 });
  await state.createRelationship(f.projectId, phase.id, "part_of", workflow.id);
  const work = await state.createRecord(f.projectId, "WorkItem", { workItemKind: "feature", title: "Second work", objective: "Implement", workState: "implemented" });
  await state.createRelationship(f.projectId, work.id, "part_of", phase.id);
  const implementationRecord = await state.recordImplementation(f.projectId, work.id, { summary: "Implemented", deviations: [], blockers: [], residualRisks: [], outcome: "implemented" });
  store.close();
  const materializer = createWorkflowSourceMaterializationService({ projectContainerRoot: f.root, projectId: f.projectId, mcpWorkspaceId: "project",
    checkoutRegistration: { registerRepositoryCheckout: async (_id, checkout) => ({ ...checkout, availability: "available", validationError: null }) } });
  const second = await materializer.materialize(workflow.id); assert.notEqual(second.binding.body.workflowId, f.workflowId);
  assert.notEqual(second.checkout.repositoryCheckoutId, f.checkoutId);
  const secondRoot = path.join(f.root, second.checkout.projectRelativePath);
  fs.writeFileSync(path.join(f.checkout, "first.txt"), "one\n"); fs.writeFileSync(path.join(secondRoot, "second.txt"), "two\n");
  const [a, b] = await Promise.all([
    createImplementationCheckpoint(f.root, f.projectId, { ...implementation(f), boundaryId: "parallel-one", attributablePaths: ["first.txt"] }),
    createImplementationCheckpoint(f.root, f.projectId, { boundaryId: "parallel-two", workflowId: workflow.id, targetEntityId: implementationRecord.id,
      sourceLineId: second.binding.body.workSourceLineId, expectedRevisionId: f.head, repositoryCheckoutId: second.checkout.repositoryCheckoutId, attributablePaths: ["second.txt"] }),
  ]);
  assert.equal(a.state, "committed", JSON.stringify(a)); assert.equal(b.state, "committed", JSON.stringify(b));
  assert.equal(git(f.dev, "branch", "--show-current"), "dev");
});
