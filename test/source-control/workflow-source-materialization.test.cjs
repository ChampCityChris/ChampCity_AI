const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createSQLiteProjectStateStore } = require("../../dist/main/projectState/sqliteProjectStateStore.js");
const { createProjectStateService } = require("../../dist/shared/projectState/projectStateService.js");
const { createWorkflowSourceMaterializationService } = require("../../dist/main/sourceControl/workflowSourceMaterializationService.js");
const { registerCurrentProject, selectedCurrentProjectId } = require("../../dist/main/projectState/currentProjectRegistrationService.js");
const { bootstrapProjectSource } = require("../../dist/main/sourceControl/projectSourceBootstrap.js");

const operator = { principalId: "operator", principalType: "human", role: "Operator" };
const repositoryId = "repository-materialization";
function git(root, ...args) { return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim(); }
async function setup(context) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-materialize-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const current = await registerCurrentProject(root, "existing", { projectName: "Materialization fixture", sourceRepositoryId: repositoryId });
  const source = await bootstrapProjectSource(root, repositoryId);
  const projectId = current.project.id;
  assert.equal(selectedCurrentProjectId(root), projectId);
  assert.equal(source.repositoryId, repositoryId);
  assert.equal(fs.existsSync(path.join(root, ".git")), false);
  const dev = path.join(root, "Dev");
  git(dev, "config", "user.email", "test@example.invalid");
  git(dev, "config", "user.name", "Materialization Test");
  fs.writeFileSync(path.join(dev, "base.txt"), "R1\n");
  git(dev, "add", "base.txt"); git(dev, "commit", "-m", "R1");
  const r1 = git(dev, "rev-parse", "HEAD");
  const store = createSQLiteProjectStateStore(path.join(root, ".champcity", "project-state.sqlite"));
  return { root, dev, r1, store, projectId, state: createProjectStateService(store, operator) };
}
async function structuredProject(env) {
  assert.equal(selectedCurrentProjectId(env.root), env.projectId);
  const resources = (await env.store.listEntities(env.projectId, "ProjectResource"))
    .filter(row => row.entityType === "ProjectResource" && row.lifecycleState === "active");
  assert.ok(resources.some(row => row.body.resourceType === "current-project-registration"));
  assert.ok(resources.some(row => row.body.resourceType === "source-repository" && row.body.logicalName === repositoryId));
  return env.projectId;
}
async function workflowWithBaseline(env, projectId, title, revision = env.r1) {
  const created = await env.state.createSubstantiveWorkflow(projectId, { workflowType: "feature-capability", title, entryWorkspace: "feature-intake",
    sourceSeed: { repositoryId, integrationTargetSourceLineId: "dev", baseRevisionId: revision } });
  return { workflow: created.workflow, baseline: created.sourceBaseline, binding: created.sourceBinding };
}
function materializer(env, projectId, register = async (_workspaceId, checkout) => ({ ...checkout, availability: "available", validationError: null })) {
  return createWorkflowSourceMaterializationService({ projectContainerRoot: env.root, projectId,
    mcpWorkspaceId: "project-workspace", checkoutRegistration: { registerRepositoryCheckout: register } });
}

test("Workflow materialization preserves exact baseline across Dev advance, supersession, concurrent checkouts, and ready retries", async context => {
  const env = await setup(context);
  const projectId = await structuredProject(env);
  const { workflow: first, baseline } = await workflowWithBaseline(env, projectId, "First");
  fs.writeFileSync(path.join(env.dev, "base.txt"), "R2\n"); git(env.dev, "commit", "-am", "R2");
  const r2 = git(env.dev, "rev-parse", "dev");
  assert.notEqual(r2, env.r1);
  assert.equal(git(env.dev, "rev-parse", "dev"), r2);
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
  assert.equal(createdSecond.baseline.body.workflowId, createdSecond.workflow.id);
  assert.equal(createdSecond.binding.body.workflowId, createdSecond.workflow.id);
  assert.equal(createdSecond.binding.body.preparationState, "unprepared");
  const [one, two] = await Promise.all([service.materialize(successor.id), service.materialize(createdSecond.workflow.id)]);
  assert.equal(one.binding.body.workflowId, first.id);
  assert.equal(one.binding.body.sourceBaselineId, baseline.id);
  assert.equal(one.checkout.sourceLineId, `workflow/${first.id}`);
  assert.equal(one.checkout.workflowId, first.id);
  assert.equal(one.checkout.repositoryCheckoutId, `workflow-${first.id}`);
  assert.equal(one.checkout.projectRelativePath, `.champcity/checkouts/${first.id}`);
  assert.equal(two.checkout.sourceLineId, `workflow/${createdSecond.workflow.id}`);
  assert.equal(two.binding.body.workflowId, createdSecond.workflow.id);
  assert.equal(two.binding.body.sourceBaselineId, createdSecond.baseline.id);
  assert.equal(two.binding.body.preparationState, "ready");
  assert.equal(two.binding.body.workSourceLineId, `workflow/${createdSecond.workflow.id}`);
  assert.equal(registrations.get(two.checkout.repositoryCheckoutId).workflowId, createdSecond.workflow.id);
  assert.deepEqual(registrations.get(two.checkout.repositoryCheckoutId), two.checkout);
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
  assert.equal(git(env.dev, "rev-parse", "dev"), r2);
  assert.equal(registrations.size, 2);
});

test("ready binding with a missing checkout blocks without recreating it", async context => {
  const env = await setup(context);
  const projectId = await structuredProject(env);
  const { workflow } = await workflowWithBaseline(env, projectId, "Missing ready checkout");
  env.store.close();
  const service = materializer(env, projectId);
  const ready = await service.materialize(workflow.id);
  const checkoutPath = path.join(env.root, ready.checkout.projectRelativePath);
  const readyVersion = ready.binding.recordVersion;
  assert.equal(ready.binding.body.preparationState, "ready");
  git(env.dev, "worktree", "remove", "--force", checkoutPath);
  assert.equal(fs.existsSync(checkoutPath), false);
  await assert.rejects(service.materialize(workflow.id), /Ready Workflow checkout is missing/);
  assert.equal(fs.existsSync(checkoutPath), false);
  const verify = createSQLiteProjectStateStore(path.join(env.root, ".champcity", "project-state.sqlite"));
  try {
    const binding = await verify.getEntity(projectId, ready.binding.id);
    assert.ok(binding.recordVersion > readyVersion);
    assert.equal(binding.body.preparationState, "blocked");
    assert.equal(binding.body.failureCode, "REPOSITORY_CHECKOUT_MATERIALIZATION_FAILED");
  } finally { verify.close(); }
});

test("ready semantic identity drift blocks before provider registration or source creation", async context => {
  const env = await setup(context);
  const projectId = await structuredProject(env);
  const { workflow } = await workflowWithBaseline(env, projectId, "Semantic ready drift");
  env.store.close();
  let registrationCount = 0;
  const service = materializer(env, projectId, async (_id, checkout) => {
    registrationCount++;
    return { ...checkout, availability: "available", validationError: null };
  });
  const ready = await service.materialize(workflow.id);
  const verify = createSQLiteProjectStateStore(path.join(env.root, ".champcity", "project-state.sqlite"));
  try {
    const state = createProjectStateService(verify, operator);
    const changed = await state.updateSourceBinding(projectId, ready.binding.id,
      { repositoryCheckoutId: `workflow-${workflow.id}-drift` }, ready.binding.recordVersion);
    const registrationsBeforeRetry = registrationCount;
    await assert.rejects(service.materialize(workflow.id), /Ready SourceBinding identity conflicts/);
    assert.equal(registrationCount, registrationsBeforeRetry);
    assert.equal(git(env.dev, "branch", "--format=%(refname:short)", "--list", "workflow/*"), `workflow/${workflow.id}`);
    assert.deepEqual(fs.readdirSync(path.join(env.root, ".champcity", "checkouts")), [workflow.id]);
    const binding = await verify.getEntity(projectId, ready.binding.id);
    assert.ok(binding.recordVersion > changed.recordVersion);
    assert.equal(binding.body.preparationState, "blocked");
    assert.equal(binding.body.failureCode, "SOURCE_MATERIALIZATION_STATE_MISMATCH");
  } finally { verify.close(); }
});

test("blocked registration retry recovers exact branch and worktree; conflicting checkout path is preserved", async context => {
  const env = await setup(context);
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

  const conflict = await setup(context);
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
  const env = await setup(context);
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
