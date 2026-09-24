const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createSQLiteProjectStateStore } = require("../../dist/main/projectState/sqliteProjectStateStore.js");
const { createProjectStateService } = require("../../dist/shared/projectState/projectStateService.js");
const { createWorkflowSourceMaterializationService } = require("../../dist/main/sourceControl/workflowSourceMaterializationService.js");

const operator = { principalId: "operator", principalType: "human", role: "Operator" };
const repositoryId = "repository-materialization";
function git(root, ...args) { return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim(); }
function setup(context) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-materialize-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const dev = path.join(root, "Dev");
  fs.mkdirSync(dev);
  git(dev, "init", "-b", "dev");
  git(dev, "config", "user.email", "test@example.invalid");
  git(dev, "config", "user.name", "Materialization Test");
  fs.writeFileSync(path.join(dev, "base.txt"), "R1\n");
  git(dev, "add", "base.txt"); git(dev, "commit", "-m", "R1");
  const r1 = git(dev, "rev-parse", "HEAD");
  fs.mkdirSync(path.join(root, ".champcity"));
  const store = createSQLiteProjectStateStore(path.join(root, ".champcity", "project-state.sqlite"));
  return { root, dev, r1, store, state: createProjectStateService(store, operator) };
}
async function structuredProject(env) {
  const project = await env.state.createRecord(null, "Project", { name: "Synthetic", description: "Materialization fixture" });
  await env.store.transaction(project.id, unit => unit.advanceProviderGeneration({ projectId: project.id, generation: 1,
    authority: "structured", updatedAt: new Date().toISOString() }, null));
  return project.id;
}
async function workflowWithBaseline(env, projectId, title, revision = env.r1) {
  const workflow = await env.state.createWorkflow(projectId, { workflowType: "feature-capability", title, currentWorkspace: "development" });
  const baseline = await env.state.createWorkflowSourceBaseline(projectId, workflow.id,
    { repositoryId, integrationTargetSourceLineId: "dev", baseRevisionId: revision });
  return { workflow, baseline };
}
function materializer(env, projectId, register = async (_workspaceId, checkout) => ({ ...checkout, availability: "available", validationError: null })) {
  return createWorkflowSourceMaterializationService({ projectContainerRoot: env.root, projectId,
    mcpWorkspaceId: "project-workspace", checkoutRegistration: { registerRepositoryCheckout: register } });
}

test("Workflow materialization preserves exact baseline across Dev advance, supersession, concurrent checkouts, and ready retries", async context => {
  const env = setup(context);
  const projectId = await structuredProject(env);
  const { workflow: first, baseline } = await workflowWithBaseline(env, projectId, "First");
  git(env.dev, "switch", "-c", "temporary-dev-advance");
  fs.writeFileSync(path.join(env.dev, "base.txt"), "R2\n"); git(env.dev, "commit", "-am", "R2");
  git(env.dev, "switch", "dev");
  const r2 = git(env.dev, "rev-parse", "dev");
  const successor = (await env.state.supersedeRecord(projectId, first.id, { ...first.body, title: "First successor" }, first.recordVersion)).successor;
  const createdSecond = await workflowWithBaseline(env, projectId, "Second", env.r1);
  env.store.close();

  const registrations = new Map();
  const register = async (workspaceId, checkout) => {
    assert.equal(workspaceId, "project-workspace");
    const prior = registrations.get(checkout.repositoryCheckoutId);
    if (prior) assert.deepEqual(prior, checkout);
    registrations.set(checkout.repositoryCheckoutId, checkout);
    return { ...checkout, availability: "available", validationError: null };
  };
  const service = materializer(env, projectId, register);
  const [one, two] = await Promise.all([service.materialize(successor.id), service.materialize(createdSecond.workflow.id)]);
  assert.equal(one.binding.body.workflowId, successor.id);
  assert.equal(one.binding.body.sourceBaselineId, baseline.id);
  assert.equal(one.checkout.sourceLineId, `workflow/${first.id}`);
  assert.equal(one.checkout.workflowId, first.id);
  assert.equal(one.checkout.repositoryCheckoutId, `workflow-${first.id}`);
  assert.equal(one.checkout.projectRelativePath, `.champcity/checkouts/${first.id}`);
  assert.equal(two.checkout.sourceLineId, `workflow/${createdSecond.workflow.id}`);
  assert.notEqual(one.binding.id, two.binding.id);
  assert.notEqual(one.checkout.projectRelativePath, two.checkout.projectRelativePath);
  assert.equal(git(env.dev, "rev-parse", "dev"), r2);
  assert.equal(git(env.dev, "rev-parse", `workflow/${first.id}`), env.r1);
  assert.equal(git(env.dev, "branch", "--list", `workflow/${successor.id}`), "");
  assert.equal(git(path.join(env.root, one.checkout.projectRelativePath), "rev-parse", "HEAD"), env.r1);
  assert.equal(fs.existsSync(path.join(env.root, ".champcity", "checkouts", successor.id)), false);
  assert.equal(git(env.dev, "branch", "--show-current"), "dev");
  assert.equal(fs.existsSync(path.join(env.root, one.checkout.projectRelativePath)), true);
  assert.equal(fs.existsSync(path.join(env.root, two.checkout.projectRelativePath)), true);
  const readyRevision = one.binding.recordVersion;
  const retried = await service.materialize(successor.id);
  assert.equal(retried.binding.recordVersion, readyRevision);
  assert.equal(registrations.size, 2);
});

test("blocked registration retry recovers exact branch and worktree; conflicting checkout path is preserved", async context => {
  const env = setup(context);
  const projectId = await structuredProject(env);
  const { workflow } = await workflowWithBaseline(env, projectId, "Recover");
  env.store.close();
  let registrationFails = true;
  const service = materializer(env, projectId, async (_id, checkout) => {
    if (registrationFails) throw Error("registration temporarily unavailable");
    return { ...checkout, availability: "available", validationError: null };
  });
  await assert.rejects(service.materialize(workflow.id));
  assert.equal(fs.existsSync(path.join(env.root, ".champcity", "checkouts", workflow.id)), true);
  registrationFails = false;
  assert.equal((await service.materialize(workflow.id)).binding.body.preparationState, "ready");

  const conflict = setup(context);
  const conflictProjectId = await structuredProject(conflict);
  const conflicting = await workflowWithBaseline(conflict, conflictProjectId, "Conflict");
  const target = path.join(conflict.root, ".champcity", "checkouts", conflicting.workflow.id);
  fs.mkdirSync(path.dirname(target)); fs.mkdirSync(target); fs.writeFileSync(path.join(target, "keep.txt"), "keep");
  conflict.store.close();
  await assert.rejects(materializer(conflict, conflictProjectId).materialize(conflicting.workflow.id));
  assert.equal(fs.readFileSync(path.join(target, "keep.txt"), "utf8"), "keep");
  const blockedStore = createSQLiteProjectStateStore(path.join(conflict.root, ".champcity", "project-state.sqlite"));
  try {
    const bindings = await blockedStore.listEntities(conflictProjectId, "SourceBinding");
    assert.equal(bindings[0].body.preparationState, "blocked");
    assert.equal(bindings[0].body.failureCode, "REPOSITORY_CHECKOUT_MATERIALIZATION_FAILED");
  } finally { blockedStore.close(); }
});

test("WIR, terminal Workflow, and missing baseline fail before branch or binding mutation", async context => {
  const env = setup(context);
  const projectId = await structuredProject(env);
  const { workflow: wir } = await env.state.createWorkIntake(projectId, { request: "Route", desiredOutcome: "Route", constraints: [], evidenceContext: [], requestedIntegrationTarget: "dev" });
  const noBaseline = await env.state.createWorkflow(projectId, { workflowType: "feature-capability", title: "No baseline", currentWorkspace: "development" });
  const terminal = await env.state.createWorkflow(projectId, { workflowType: "feature-capability", title: "Terminal", currentWorkspace: "development", workflowState: "closed" });
  env.store.close();
  const service = materializer(env, projectId);
  for (const id of [wir.id, noBaseline.id, terminal.id]) await assert.rejects(service.materialize(id));
  const verify = createSQLiteProjectStateStore(path.join(env.root, ".champcity", "project-state.sqlite"));
  try {
    assert.equal((await verify.listEntities(projectId, "SourceBinding")).length, 0);
    assert.equal(git(env.dev, "branch", "--list", "workflow/*"), "");
    assert.equal(fs.existsSync(path.join(env.root, ".champcity", "checkouts")), false);
  } finally { verify.close(); }
});
