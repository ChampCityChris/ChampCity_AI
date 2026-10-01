const assert = require("node:assert/strict");
const { execFileSync, spawn } = require("node:child_process");
const { EventEmitter } = require("node:events");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { mainPreloadHarness, loadProductionFunctions } = require("../support/production-execution.cjs");
const { MANAGED_PROJECT_SOURCE_PATHS } = require("../../dist/shared/sourceLifecycleContracts.js");
const { AgentHarnessService } = require("../../dist/main/agentHarness/runtime/agentHarnessService.js");
const { CURRENT_PROJECT_REPOSITORY_ID, currentProjectRepositoryId, registerCurrentProject, selectedCurrentProjectId } = require("../../dist/main/projectState/currentProjectRegistrationService.js");
const { selectedSourceGraphRepositoryId } = require("../../dist/main/sourceControl/sourceGraphService.js");
const { resolveManagedDevRepositoryCheckout } = require("../../dist/main/sourceControl/managedProjectSourceService.js");
const { createSourceControlService } = require("../../dist/main/sourceControl/sourceControlService.js");
const { establishManagedProjectSource } = require("../../dist/main/sourceControl/managedProjectSourceService.js");
const {
  applyExistingProjectGitAdoption,
  inspectExistingProjectGitAdoption,
  EXISTING_PROJECT_GIT_ADOPTION_JOURNAL,
  EXISTING_PROJECT_GIT_ADOPTION_RECEIPT,
} = require("../../dist/main/sourceControl/existingProjectGitAdoptionService.js");
const { reconcileProjectModelAccess } = require("../../dist/main/modelAccess/projectModelAccessCoordinator.js");
const { hydrateRepositoryEnvironment } = require("../../dist/main/developmentEnvironment/repositoryEnvironmentHydrationService.js");
const {
  createProjectSourceOperationCoordinator,
  projectSourceOperationLeaseDirectory,
} = require("../../dist/main/core/projectSourceOperationCoordinator.js");
const { createSQLiteProjectStateStore } = require("../../dist/main/projectState/sqliteProjectStateStore.js");
const { createProjectStateService } = require("../../dist/shared/projectState/projectStateService.js");
const { createWorkflowApplicationService } = require("../../dist/main/workflow/workflowApplicationService.js");
const { SelectedWorkspaceEvidenceNotifier } = require("../../dist/main/workspaceEvidence/selectedWorkspaceEvidenceNotifier.js");
const { getStructuredWorkIntakeProjection } = require("../../dist/main/workIntake/structuredWorkIntakeService.js");
const { getWorkIntakeProjection } = require("../../dist/main/workIntake/workIntakeService.js");
const rendererLoader = require("../renderer/renderer-source-loader.cjs");
const { acceptExistingProjectAdoption, admitExistingProject, openInspectedExistingProject } = rendererLoader
  .loadRendererSourceModule("src/renderer/app/existingProjectEntryController.ts");
const rendererSource = fs.readFileSync(path.resolve(__dirname, "../../src/renderer/app/App.tsx"), "utf8");
const entryControllerSource = fs.readFileSync(path.resolve(__dirname, "../../src/renderer/app/existingProjectEntryController.ts"), "utf8");
const sourceProjectionContext = {
  reconcileProjectModelAccess,
  hydrateRepositoryEnvironment,
  path,
  projectSourceOperationCoordinator: {
    acquireExclusive: async () => ({ release: async () => undefined }),
  },
  selectedWorkspaceEvidenceNotifier: { pause() {}, resume() {} },
};

async function waitFor(predicate, message, timeoutMs = 2_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.fail(message);
}

function root(context) {
  const selected = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-entry-"));
  context.after(() => fs.rmSync(selected, { recursive: true, force: true }));
  return selected;
}
function git(rootPath, ...args) { return execFileSync("git", args, { cwd: rootPath, encoding: "utf8" }).trim(); }
function initializeConventionalGit(rootPath) {
  git(rootPath, "init", "-b", "main");
  git(rootPath, "config", "user.name", "Synthetic Test");
  git(rootPath, "config", "user.email", "test@example.invalid");
  fs.writeFileSync(path.join(rootPath, "README.md"), "baseline\n");
  git(rootPath, "add", "README.md");
  git(rootPath, "commit", "-m", "baseline");
  git(rootPath, "branch", "dev");
}

test("Existing Project adoption IPC derives selected root and accepts only an exact plan digest", async () => {
  const selected = "selected-root-owned-by-main";
  const expectedPlan = { planId: "a".repeat(64), state: "managed-ready" };
  let inspected;
  let applied;
  const harness = {
    registerWorkspace: async () => ({ workspace: { workspaceId: "selected_workspace" } }),
    registerRepositoryCheckout: async (_workspaceId, checkout) => ({ ...checkout, availability: "available", validationError: null }),
    unregisterRepositoryCheckout: async () => [],
  };
  const { api, invocations } = mainPreloadHarness(["project:inspectExistingGitAdoption", "project:applyExistingGitAdoption"], {
    getRequiredWorkspaceRoot: () => selected,
    CURRENT_PROJECT_REPOSITORY_ID,
    getAgentHarnessServiceHostClient: () => harness,
    inspectExistingProjectGitAdoption: async (...args) => { inspected = args; return expectedPlan; },
    applyExistingProjectGitAdoption: async input => { applied = input; return { plan: expectedPlan }; },
    ...sourceProjectionContext,
  });
  assert.equal(await api.inspectExistingProjectGitAdoption(), expectedPlan);
  assert.deepEqual(inspected, [selected, CURRENT_PROJECT_REPOSITORY_ID]);
  await assert.rejects(api.applyExistingProjectGitAdoption("not-a-plan"), /exact Existing Project adoption plan/);
  const outcome = await api.applyExistingProjectGitAdoption(expectedPlan.planId);
  assert.equal(outcome.sourcePlan, expectedPlan);
  assert.equal(outcome.sourceApplied, undefined);
  assert.equal(outcome.modelAccess.state, "ready");
  assert.equal(outcome.modelAccess.error, null);
  assert.equal(applied.projectRoot, selected);
  assert.equal(applied.planId, expectedPlan.planId);
  assert.equal(applied.consent, true);
  assert.deepEqual(invocations.map(call => [call.channel, call.args.length]), [
    ["project:inspectExistingGitAdoption", 0],
    ["project:applyExistingGitAdoption", 1],
    ["project:applyExistingGitAdoption", 1],
  ]);
});

test("post-migration hydration runs after the source lease and degradation preserves adoption", async () => {
  const selected = "synthetic-selected-project";
  const planId = "b".repeat(64);
  const order = [];
  let applied = true;
  const source = { mainCheckout: { projectRelativePath: "Main" }, devCheckout: { projectRelativePath: "Dev" } };
  const { api } = mainPreloadHarness(["project:applyExistingGitAdoption"], {
    getRequiredWorkspaceRoot: () => selected,
    CURRENT_PROJECT_REPOSITORY_ID,
    projectSourceOperationCoordinator: { acquireExclusive: async () => {
      order.push("acquire");
      return { release: async () => { order.push("release"); } };
    } },
    selectedWorkspaceEvidenceNotifier: { pause() {}, resume() {} },
    applyExistingProjectGitAdoption: async () => { order.push("conversion"); return { plan: { planId }, source, applied }; },
    hydrateRepositoryEnvironment: async root => {
      assert.equal(root, path.join(selected, "Dev"));
      order.push("hydrate");
      return { state: "degraded", providers: [{ ecosystem: "npm", state: "degraded" }], error: "Dependency restore needs attention: npm." };
    },
    reconcileProjectModelAccess: async () => { order.push("model-access"); return { state: "ready", error: null }; },
    getAgentHarnessServiceHostClient: () => ({}),
    path,
  });
  const converted = await api.applyExistingProjectGitAdoption(planId);
  assert.equal(converted.sourceApplied, true);
  assert.equal(converted.environmentHydration.state, "degraded");
  assert.deepEqual(order, ["acquire", "conversion", "release", "hydrate", "model-access"]);
  applied = false;
  order.length = 0;
  const reopened = await api.applyExistingProjectGitAdoption(planId);
  assert.equal(reopened.sourceApplied, false);
  assert.equal(reopened.environmentHydration.state, "not-applicable");
  assert.deepEqual(order, ["acquire", "conversion", "release", "model-access"]);
});

test("admission carries migration hydration status into the Project and skips it on reopen", async () => {
  const plan = { planId: "c".repeat(64), state: "conversion-required" };
  const hydration = { state: "degraded", providers: [{ ecosystem: "npm", state: "degraded" }], error: "Dependency restore needs attention: npm." };
  let applied = true;
  const api = {
    applyExistingProjectGitAdoption: async () => ({ sourceApplied: applied, environmentHydration: hydration }),
    registerCurrentProject: async () => ({ projectId: "current", modelAccess: { state: "ready", error: null } }),
  };
  const converted = await acceptExistingProjectAdoption(api, plan);
  assert.deepEqual(converted.environmentHydration, hydration);
  applied = false;
  const reopened = await openInspectedExistingProject(api, { ...plan, state: "managed-ready" });
  assert.equal(reopened.kind, "ready");
  assert.equal(reopened.project.environmentHydration, undefined);
  assert.match(rendererSource, /Project migrated successfully; development environment needs attention/);
  assert.match(rendererSource, /Project migrated successfully; environment ready/);
});

test("Existing Project conversion pauses and resumes active evidence watchers without losing selection", {
  skip: process.platform !== "win32",
}, async context => {
  const selected = root(context);
  initializeConventionalGit(selected);
  fs.mkdirSync(path.join(selected, "planning"));
  fs.mkdirSync(path.join(selected, "issues"));
  const watches = [];
  const notifier = new SelectedWorkspaceEvidenceNotifier(() => undefined, {
    watch(watchRoot, options, listener) {
      const watcher = new EventEmitter();
      Object.assign(watcher, { root: watchRoot, options, listener, closed: false });
      watcher.close = () => { watcher.closed = true; };
      watches.push(watcher);
      return watcher;
    },
  });
  assert.equal(notifier.selectWorkspace(selected), 1);
  const originalWatches = [...watches];
  assert.equal(originalWatches.length, 3);
  let selectedRoot = selected;
  let sourceRanWhilePaused = false;
  let leaseReleased = false;
  const { api } = mainPreloadHarness(["project:inspectExistingGitAdoption", "project:applyExistingGitAdoption"], {
    getRequiredWorkspaceRoot: () => selectedRoot,
    CURRENT_PROJECT_REPOSITORY_ID,
    inspectExistingProjectGitAdoption,
    applyExistingProjectGitAdoption: async input => {
      assert.equal(originalWatches.every(watcher => watcher.closed), true);
      assert.equal(notifier.currentGeneration(), 1);
      sourceRanWhilePaused = true;
      return applyExistingProjectGitAdoption(input);
    },
    selectedWorkspaceEvidenceNotifier: notifier,
    projectSourceOperationCoordinator: {
      acquireExclusive: async () => ({ release: async () => { leaseReleased = true; } }),
    },
    reconcileProjectModelAccess: async () => ({ state: "ready", error: null }),
    getAgentHarnessServiceHostClient: () => { throw new Error("model access should not be consulted"); },
    hydrateRepositoryEnvironment, path,
  });

  const plan = await api.inspectExistingProjectGitAdoption();
  const converted = await api.applyExistingProjectGitAdoption(plan.planId);

  assert.equal(converted.sourcePlan.state, "managed-ready");
  assert.equal(sourceRanWhilePaused, true);
  assert.equal(leaseReleased, true);
  assert.equal(selectedRoot, selected);
  assert.equal(notifier.currentGeneration(), 1);
  assert.equal(originalWatches.every(watcher => watcher.closed), true);
  const resumedWatches = watches.slice(originalWatches.length);
  assert.equal(resumedWatches.length, 1);
  assert.equal(path.resolve(resumedWatches[0].root), path.resolve(selected));
  assert.equal(resumedWatches[0].closed, false);
  assert.equal(fs.existsSync(path.join(selected, ".git")), false);
  assert.equal(fs.existsSync(path.join(selected, ".champcity", "repository.git")), true);
  const current = await registerCurrentProject(selected, "existing", {
    projectName: "Watcher Conversion Project",
    sourceRepositoryId: CURRENT_PROJECT_REPOSITORY_ID,
  });
  assert.equal(selectedCurrentProjectId(selected), current.project.id);
  notifier.clear();
});

test("Current Project managed Dev resolver fails closed for missing and non-Git checkout paths", async context => {
  const missing = root(context);
  await assert.rejects(resolveManagedDevRepositoryCheckout(missing), /Managed Dev RepositoryCheckout is unavailable/);
  const nonGit = root(context);
  const nonGitMetadata = path.join(nonGit, ".champcity", "repository.git");
  fs.mkdirSync(path.dirname(nonGitMetadata));
  execFileSync("git", ["init", "--bare", nonGitMetadata], { cwd: nonGit, stdio: "ignore" });
  fs.mkdirSync(path.join(nonGit, "Dev"));
  await assert.rejects(resolveManagedDevRepositoryCheckout(nonGit));
  const redirected = root(context);
  const redirectedMetadata = path.join(redirected, ".champcity", "repository.git");
  fs.mkdirSync(path.dirname(redirectedMetadata));
  execFileSync("git", ["init", "--bare", redirectedMetadata], { cwd: redirected, stdio: "ignore" });
  const outside = path.join(redirected, "outside");
  fs.mkdirSync(outside);
  fs.symlinkSync(outside, path.join(redirected, "Dev"), "junction");
  await assert.rejects(resolveManagedDevRepositoryCheckout(redirected), /redirect/);
});

test("non-source Current Project Source Graph fails with bounded source-unavailable behavior", async context => {
  const selected = root(context);
  const current = await registerCurrentProject(selected, "existing");
  assert.equal(current.repositoryResource, null);
  await assert.rejects(selectedSourceGraphRepositoryId(selected), /no source Repository/);
});

test("Greenfield entry validates an empty container, establishes SPS and registers Main/Dev without Work Intake", async context => {
  const selected = root(context);
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-harness-"));
  context.after(() => fs.rmSync(userData, { recursive: true, force: true }));
  const harness = new AgentHarnessService({ userDataRoot: userData });
  harness.registerWorkspace = rootPath => harness.registerWorkspaceRoot(rootPath);
  context.after(() => harness.stop().catch(() => undefined));
  const checkouts = [];
  const registerCheckout = harness.registerRepositoryCheckout.bind(harness);
  harness.registerRepositoryCheckout = async (workspaceId, checkout) => {
    const registered = await registerCheckout(workspaceId, checkout);
    checkouts.push(registered);
    return registered;
  };
  const { assertGreenfieldProjectEntry } = loadProductionFunctions("src/main/main.ts", ["assertGreenfieldProjectEntry"],
    { fs, path, MANAGED_PROJECT_SOURCE_PATHS });
  const { api, invocations } = mainPreloadHarness(["project:registerCurrent", "sourceGraph:get", "sourceGraph:revisionDetail", "workIntake:projection"], {
    getRequiredWorkspaceRoot: () => selected,
    assertGreenfieldProjectEntry,
    registerCurrentProject,
    currentProjectRepositoryId,
    selectedCurrentProjectId,
    CURRENT_PROJECT_REPOSITORY_ID,
    resolveManagedDevRepositoryCheckout,
    selectedSourceGraphRepositoryId,
    getStructuredWorkIntakeProjection,
    getWorkIntakeProjection,
    getAgentHarnessServiceHostClient: () => harness,
    createSourceControlService,
    createWorkflowApplicationService,
    establishManagedProjectSource, inspectExistingProjectGitAdoption,
    fs, path, MANAGED_PROJECT_SOURCE_PATHS, ...sourceProjectionContext,
  });
  const current = await api.registerCurrentProject("greenfield", "New Project");
  assert.equal(current.projectId, selectedCurrentProjectId(selected));
  assert.equal(current.projectName, "New Project");
  assert.equal(current.repositoryId, CURRENT_PROJECT_REPOSITORY_ID);
  assert.equal(current.created, true);
  assert.ok(current.projectCreationWorkflowId);
  assert.deepEqual(checkouts.map(checkout => [checkout.role, checkout.projectRelativePath]).sort(), [["dev", "Dev"], ["main", "Main"]]);
  assert.equal(fs.existsSync(path.join(selected, ".git")), false);
  assert.equal(fs.existsSync(path.join(selected, ".champcity", "repository.git")), true);
  const state = createSQLiteProjectStateStore(path.join(selected, ".champcity", "project-state.sqlite"));
  try {
    const resources = (await state.listEntities(current.projectId, "ProjectResource")).filter(row => row.entityType === "ProjectResource");
    assert.equal(resources.filter(row => row.body.resourceType === "current-project-registration").length, 1);
    assert.equal(resources.filter(row => row.body.resourceType === "source-repository").length, 1);
    assert.equal((await state.listEntities(current.projectId, "WorkIntake")).length, 0);
    const workflows = (await state.listEntities(current.projectId, "Workflow")).filter(row => row.entityType === "Workflow");
    assert.equal(workflows.length, 1);
    assert.equal(workflows[0].id, current.projectCreationWorkflowId);
    assert.equal(workflows[0].body.workflowType, "project-creation");
    assert.equal(workflows[0].body.title, "New Project");
    assert.equal(workflows[0].body.currentWorkspace, "project-intake");
    const baselines = (await state.listEntities(current.projectId, "SourceBaseline")).filter(row => row.entityType === "SourceBaseline");
    const bindings = (await state.listEntities(current.projectId, "SourceBinding")).filter(row => row.entityType === "SourceBinding");
    assert.equal(baselines.length, 1);
    assert.equal(baselines[0].body.workflowId, current.projectCreationWorkflowId);
    assert.equal(baselines[0].body.repositoryId, CURRENT_PROJECT_REPOSITORY_ID);
    assert.equal(baselines[0].body.integrationTargetSourceLineId, "dev");
    assert.equal(bindings.length, 1);
    assert.equal(bindings[0].body.preparationState, "unprepared");
  } finally { state.close(); }
  const devRoot = path.join(selected, "Dev");
  const baseRevision = git(devRoot, "rev-parse", "HEAD");
  git(devRoot, "config", "user.name", "Synthetic Test");
  git(devRoot, "config", "user.email", "test@example.invalid");
  fs.writeFileSync(path.join(devRoot, "graph-proof.txt"), "known graph revision\n");
  git(devRoot, "add", "graph-proof.txt");
  git(devRoot, "commit", "-m", "graph proof");
  const featureRevision = git(devRoot, "rev-parse", "HEAD");
  git(devRoot, "branch", "feature/graph-proof", featureRevision);
  const graphState = createSQLiteProjectStateStore(path.join(selected, ".champcity", "project-state.sqlite"));
  try {
    const service = createProjectStateService(graphState, { principalId: "test", principalType: "human", role: "Operator" });
    const workflow = await service.createWorkflow(current.projectId, { workflowType: "feature-capability", title: "Graph metadata", currentWorkspace: "development" });
    const baseline = await service.createWorkflowSourceBaseline(current.projectId, workflow.id,
      { repositoryId: CURRENT_PROJECT_REPOSITORY_ID, integrationTargetSourceLineId: "dev", baseRevisionId: baseRevision });
    const binding = await service.createWorkflowSourceBinding(current.projectId, workflow.id, baseline.id);
    await service.updateSourceBinding(current.projectId, binding.id, { preparationState: "preparing" }, 1);
    await service.updateSourceBinding(current.projectId, binding.id, { preparationState: "ready", workSourceLineId: "feature/graph-proof",
      currentRevisionId: featureRevision, repositoryCheckoutId: "workflow-graph-proof" }, 2);
  } finally { graphState.close(); }
  const graphResponse = await api.getSourceGraph({ maxRevisions: 20 });
  assert.equal(graphResponse.ok, true, JSON.stringify(graphResponse));
  assert.deepEqual(graphResponse.result.sourceLines.map(line => line.providerBranchName), ["dev", "feature/graph-proof", "main"]);
  assert.equal(graphResponse.result.providerDiagnostics.metadata, "available");
  assert.ok(graphResponse.result.workflowBindings.some(binding => binding.currentRevisionId === featureRevision));
  assert.equal(fs.existsSync(path.join(selected, ".git")), false);
  assert.equal(path.resolve(await resolveManagedDevRepositoryCheckout(selected)), path.resolve(devRoot));
  const detail = await api.getSourceGraphRevisionDetail(featureRevision);
  assert.equal(detail.ok, true, JSON.stringify(detail));
  assert.deepEqual(detail.result.changedFiles, [{ path: "graph-proof.txt", status: "A" }]);
  const projection = await api.getWorkIntakeProjection();
  assert.equal(projection.currentBranch, undefined);
  assert.equal(projection.branches, undefined);
  assert.deepEqual(invocations.map(call => call.channel), ["project:registerCurrent", "sourceGraph:get", "sourceGraph:revisionDetail", "workIntake:projection"]);
  assert.throws(() => assertGreenfieldProjectEntry(path.dirname(selected)), /empty Project container/);
  await assert.rejects(api.registerCurrentProject("greenfield", "Duplicate"), /already established; use Existing Project/);
  const reopenedState = createSQLiteProjectStateStore(path.join(selected, ".champcity", "project-state.sqlite"));
  try {
    const workflows = (await reopenedState.listEntities(current.projectId, "Workflow")).filter(row => row.entityType === "Workflow");
    assert.equal(workflows.filter(row => row.body.workflowType === "project-creation").length, 1);
    assert.equal(workflows.find(row => row.body.workflowType === "project-creation").id, current.projectCreationWorkflowId);
    assert.equal((await reopenedState.listEntities(current.projectId, "ProjectResource")).filter(row => row.entityType === "ProjectResource").length, 2);
  }
  finally { reopenedState.close(); }
  const inventory = await createWorkflowApplicationService().listCurrentProjectWorkflows(selected);
  assert.ok(inventory.groups.flatMap(group => group.workflows).some(workflow => workflow.workflowId === current.projectCreationWorkflowId));
  const existing = await api.registerCurrentProject("existing");
  assert.equal(existing.projectId, current.projectId);
  assert.equal((await createWorkflowApplicationService().getCurrentProjectWorkflow(selected, current.projectCreationWorkflowId)).workflow.workflowId,
    current.projectCreationWorkflowId);
  await harness.stop().catch(() => undefined);
});

test("Greenfield entry finishes registration for a compatible managed baseline without Current Project SPS", async context => {
  const selected = root(context);
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-harness-"));
  context.after(() => fs.rmSync(userData, { recursive: true, force: true }));
  const harness = new AgentHarnessService({ userDataRoot: userData });
  harness.registerWorkspace = rootPath => harness.registerWorkspaceRoot(rootPath);
  context.after(() => harness.stop().catch(() => undefined));
  const workspace = await harness.registerWorkspace(selected);
  const checkoutRegistration = { workspaceId: workspace.workspace.workspaceId,
    registerRepositoryCheckout: (workspaceId, checkout) => harness.registerRepositoryCheckout(workspaceId, checkout) };
  const bootstrapped = await createSourceControlService({ repositoryId: "selected-project-source", repositoryRoot: selected, checkoutRegistration }).bootstrapProjectSource();
  assert.equal(bootstrapped.ok, true);
  assert.equal(selectedCurrentProjectId(selected), null);
  const { assertGreenfieldProjectEntry } = loadProductionFunctions("src/main/main.ts", ["assertGreenfieldProjectEntry"],
    { fs, path, MANAGED_PROJECT_SOURCE_PATHS });
  const { api } = mainPreloadHarness(["project:registerCurrent"], {
    getRequiredWorkspaceRoot: () => selected, assertGreenfieldProjectEntry, registerCurrentProject, selectedCurrentProjectId, CURRENT_PROJECT_REPOSITORY_ID,
    getAgentHarnessServiceHostClient: () => harness, createSourceControlService, establishManagedProjectSource, inspectExistingProjectGitAdoption,
    createWorkflowApplicationService,
    fs, path, MANAGED_PROJECT_SOURCE_PATHS, ...sourceProjectionContext,
  });
  const current = await api.registerCurrentProject("greenfield", "Recovered Greenfield");
  assert.equal(current.created, true);
  assert.equal(current.projectId, selectedCurrentProjectId(selected));
  assert.equal(current.projectName, "Recovered Greenfield");
});

test("incomplete Greenfield Current Project retries Project Creation once with its managed source", async context => {
  const selected = root(context);
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-harness-"));
  context.after(() => fs.rmSync(userData, { recursive: true, force: true }));
  const harness = new AgentHarnessService({ userDataRoot: userData });
  harness.registerWorkspace = rootPath => harness.registerWorkspaceRoot(rootPath);
  context.after(() => harness.stop().catch(() => undefined));
  const workspace = await harness.registerWorkspace(selected);
  const checkoutRegistration = { workspaceId: workspace.workspace.workspaceId,
    registerRepositoryCheckout: (workspaceId, checkout) => harness.registerRepositoryCheckout(workspaceId, checkout) };
  const source = await createSourceControlService({ repositoryId: CURRENT_PROJECT_REPOSITORY_ID, repositoryRoot: selected, checkoutRegistration }).bootstrapProjectSource();
  assert.equal(source.ok, true);
  const registration = await registerCurrentProject(selected, "greenfield", { projectName: "Retry Greenfield", sourceRepositoryId: CURRENT_PROJECT_REPOSITORY_ID });
  const { api } = mainPreloadHarness(["project:registerCurrent"], {
    getRequiredWorkspaceRoot: () => selected, assertGreenfieldProjectEntry: () => undefined, registerCurrentProject, selectedCurrentProjectId,
    CURRENT_PROJECT_REPOSITORY_ID, getAgentHarnessServiceHostClient: () => harness, createSourceControlService, establishManagedProjectSource,
    createWorkflowApplicationService, fs, path, MANAGED_PROJECT_SOURCE_PATHS, ...sourceProjectionContext,
  });
  const retried = await api.registerCurrentProject("greenfield", "Ignored replacement name");
  assert.equal(retried.projectId, registration.project.id);
  assert.ok(retried.projectCreationWorkflowId);
  await assert.rejects(api.registerCurrentProject("greenfield"), /already established; use Existing Project/);
  const store = createSQLiteProjectStateStore(path.join(selected, ".champcity", "project-state.sqlite"));
  try {
    assert.equal((await store.listEntities(registration.project.id, "Workflow")).filter(row => row.entityType === "Workflow").length, 1);
    assert.equal((await store.listEntities(registration.project.id, "ProjectResource")).filter(row => row.entityType === "ProjectResource").length, 2);
  } finally { store.close(); }
});

test("non-Git Existing Project entry registers SPS without a placeholder Repository", async context => {
  const selected = root(context);
  fs.writeFileSync(path.join(selected, "NOTES.md"), "Historical project notes stay as files.\n");
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-harness-"));
  context.after(() => fs.rmSync(userData, { recursive: true, force: true }));
  const harness = new AgentHarnessService({ userDataRoot: userData });
  harness.registerWorkspace = rootPath => harness.registerWorkspaceRoot(rootPath);
  context.after(() => harness.stop().catch(() => undefined));
  const { api } = mainPreloadHarness(["project:registerCurrent", "sourceGraph:get"], {
    getRequiredWorkspaceRoot: () => selected, registerCurrentProject, selectedCurrentProjectId, CURRENT_PROJECT_REPOSITORY_ID,
    getAgentHarnessServiceHostClient: () => harness, createSourceControlService, establishManagedProjectSource, inspectExistingProjectGitAdoption,
    selectedSourceGraphRepositoryId, resolveManagedDevRepositoryCheckout: async () => { throw new Error("managed Dev should not be resolved without Source Control capability"); },
    fs, path, MANAGED_PROJECT_SOURCE_PATHS, ...sourceProjectionContext,
  });
  const current = await api.registerCurrentProject("existing");
  assert.equal(current.repositoryId, null);
  assert.equal(current.projectId, selectedCurrentProjectId(selected));
  await assert.rejects(api.getSourceGraph(), /no source Repository/);
  assert.equal(fs.readFileSync(path.join(selected, "NOTES.md"), "utf8"), "Historical project notes stay as files.\n");
  const store = createSQLiteProjectStateStore(path.join(selected, ".champcity", "project-state.sqlite"));
  try {
    const resources = (await store.listEntities(current.projectId, "ProjectResource")).filter(row => row.entityType === "ProjectResource");
    assert.equal(resources.filter(row => row.body.resourceType === "current-project-registration").length, 1);
    assert.equal(resources.filter(row => row.body.resourceType === "source-repository").length, 0);
    assert.equal((await store.listEntities(current.projectId, "WorkIntake")).length, 0);
    assert.equal((await store.listEntities(current.projectId, "Workflow")).length, 0);
  } finally { store.close(); await harness.stop().catch(() => undefined); }
});

test("Work Intake projection IPC delegates without pre-resolving managed Dev", async context => {
  const selected = root(context);
  const current = await registerCurrentProject(selected, "existing", { projectName: "Synthetic", sourceRepositoryId: CURRENT_PROJECT_REPOSITORY_ID });
  let resolutionAttempts = 0;
  let projectionArgs;
  const expected = { authority: "structured", project: { projectId: current.project.id, repositoryId: CURRENT_PROJECT_REPOSITORY_ID, name: "Synthetic" },
    suggestedProjectName: "Synthetic", blockedReason: null, capturedIntakes: [], currentCapturedIntake: null };
  const { api } = mainPreloadHarness(["workIntake:projection"], {
    getRequiredWorkspaceRoot: () => selected,
    selectedCurrentProjectId,
    resolveManagedDevRepositoryCheckout: async () => { resolutionAttempts += 1; throw new Error("managed Dev unavailable"); },
    getStructuredWorkIntakeProjection: async (...args) => { projectionArgs = args; return expected; },
  });
  assert.deepEqual(await api.getWorkIntakeProjection(), expected);
  assert.deepEqual(projectionArgs, [selected, current.project.id]);
  assert.equal(resolutionAttempts, 0);
});

test("Work Intake projection and submission require a selected Current Project", async context => {
  const selected = root(context);
  const { api } = mainPreloadHarness(["workIntake:projection", "workIntake:submit"], {
    getRequiredWorkspaceRoot: () => selected,
    selectedCurrentProjectId: () => null,
    getStructuredWorkIntakeProjection: async () => { throw new Error("must not project without a Project"); },
    captureStructuredWorkIntake: async () => { throw new Error("must not capture without a Project"); },
  });
  await assert.rejects(api.getWorkIntakeProjection(), /Select or open a Project to use Work Intake/);
  await assert.rejects(api.submitWorkIntake({ projectName: "Product" }), /Select or open a Project to use Work Intake/);
});

test("invalid or redirected Existing Project source candidates fail before Current Project registration", async context => {
  for (const kind of ["malformed conventional Git", "redirected conventional Git pointer", "invalid managed topology"]) {
    const selected = root(context);
    if (kind === "malformed conventional Git") fs.mkdirSync(path.join(selected, ".git"));
    else if (kind === "redirected conventional Git pointer") {
      const outside = root(context);
      git(outside, "init", "-b", "main");
      fs.writeFileSync(path.join(selected, ".git"), `gitdir: ${path.join(outside, ".git")}\n`);
    }
    else {
      fs.mkdirSync(path.join(selected, ".champcity", "repository.git"), { recursive: true });
      fs.mkdirSync(path.join(selected, "Main"));
      fs.mkdirSync(path.join(selected, "Dev"));
    }
    const userData = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-harness-invalid-"));
    context.after(() => fs.rmSync(userData, { recursive: true, force: true }));
    const harness = new AgentHarnessService({ userDataRoot: userData });
    harness.registerWorkspace = rootPath => harness.registerWorkspaceRoot(rootPath);
    context.after(() => harness.stop().catch(() => undefined));
    const { api } = mainPreloadHarness(["project:registerCurrent"], {
      getRequiredWorkspaceRoot: () => selected, registerCurrentProject, selectedCurrentProjectId, CURRENT_PROJECT_REPOSITORY_ID,
      getAgentHarnessServiceHostClient: () => harness, createSourceControlService, establishManagedProjectSource, inspectExistingProjectGitAdoption,
      fs, path, MANAGED_PROJECT_SOURCE_PATHS, ...sourceProjectionContext,
    });
    await assert.rejects(api.registerCurrentProject("existing"), undefined, kind);
    assert.equal(selectedCurrentProjectId(selected), null, kind);
    const statePath = path.join(selected, ".champcity", "project-state.sqlite");
    if (fs.existsSync(statePath)) {
      const store = createSQLiteProjectStateStore(statePath);
      try {
        const projects = await store.listEntities(null, "Project");
        assert.equal(projects.length, 0, kind);
      } finally { store.close(); }
    }
    await harness.stop().catch(() => undefined);
  }
});

test("real controller path warns, converts, registers, enters the Hub contract, and reopens managed without another warning", async context => {
  const selected = root(context);
  git(selected, "init", "-b", "main");
  git(selected, "config", "user.name", "Synthetic Test");
  git(selected, "config", "user.email", "test@example.invalid");
  fs.writeFileSync(path.join(selected, "README.md"), "baseline\n");
  git(selected, "add", "README.md");
  git(selected, "commit", "-m", "baseline");
  git(selected, "branch", "dev");
  git(selected, "remote", "add", "origin", "https://example.invalid/synthetic/project.git");
  git(selected, "update-ref", "refs/remotes/origin/dev", git(selected, "rev-parse", "refs/heads/dev"));
  git(selected, "branch", "--set-upstream-to=origin/dev", "dev");
  const refs = git(selected, "for-each-ref", "--format=%(refname)%00%(objectname)", "refs/heads", "refs/remotes", "refs/tags");
  const remotes = git(selected, "remote", "-v");
  fs.writeFileSync(path.join(selected, "README.md"), "dirty tracked content\n");
  fs.writeFileSync(path.join(selected, "WORKFLOW.md"), "Historical record stays a file.\n");
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-harness-"));
  context.after(() => fs.rmSync(userData, { recursive: true, force: true }));
  const harness = new AgentHarnessService({ userDataRoot: userData });
  harness.registerWorkspace = rootPath => harness.registerWorkspaceRoot(rootPath);
  context.after(() => harness.stop().catch(() => undefined));
  const preConversionRegistration = await harness.registerWorkspace(selected);
  const preConversionWorkspaceId = preConversionRegistration.workspace.workspaceId;
  const conventionalCheckouts = await harness.listRepositoryCheckouts(preConversionWorkspaceId);
  assert.deepEqual(conventionalCheckouts.map(checkout => checkout.role), ["conventional"]);
  const entryOrder = [];
  const registerWorkspace = harness.registerWorkspace.bind(harness);
  harness.registerWorkspace = async rootPath => { entryOrder.push("workspace"); return registerWorkspace(rootPath); };
  const checkouts = [];
  const registerCheckout = harness.registerRepositoryCheckout.bind(harness);
  harness.registerRepositoryCheckout = async (workspaceId, checkout) => {
    const registered = await registerCheckout(workspaceId, checkout);
    checkouts.push(registered);
    return registered;
  };
  const { api } = mainPreloadHarness(["project:inspectExistingGitAdoption", "project:applyExistingGitAdoption", "project:registerCurrent"], {
    getRequiredWorkspaceRoot: () => selected,
    registerCurrentProject: (...args) => { entryOrder.push("sps"); return registerCurrentProject(...args); },
    getAgentHarnessServiceHostClient: () => harness, CURRENT_PROJECT_REPOSITORY_ID,
    createSourceControlService,
    establishManagedProjectSource: (...args) => { entryOrder.push("source-proof"); return establishManagedProjectSource(...args); },
    inspectExistingProjectGitAdoption,
    applyExistingProjectGitAdoption: (...args) => { entryOrder.push("source-proof"); return applyExistingProjectGitAdoption(...args); },
    fs, path, MANAGED_PROJECT_SOURCE_PATHS, ...sourceProjectionContext,
  });
  const admitted = await admitExistingProject({ ...api, chooseWorkspaceFolder: async () => ({ ok: true, workspaceRoot: selected }) });
  assert.equal(admitted.kind, "consent-required");
  const adoption = admitted.plan;
  assert.equal(adoption.state, "conversion-required");
  assert.equal(admitted.selection.workspaceRoot, selected);
  const current = await acceptExistingProjectAdoption(api, adoption);
  assert.ok(entryOrder.indexOf("source-proof") < entryOrder.indexOf("workspace"));
  assert.ok(entryOrder.indexOf("source-proof") < entryOrder.indexOf("sps"));
  assert.equal(current.projectId, selectedCurrentProjectId(selected));
  assert.equal(current.repositoryId, CURRENT_PROJECT_REPOSITORY_ID);
  assert.equal(current.mode, "existing");
  assert.equal(current.created, true);
  assert.equal(fs.existsSync(path.join(selected, ".git")), false);
  assert.equal(fs.readFileSync(path.join(selected, "Dev", "README.md"), "utf8").replace(/\r\n/g, "\n"), "dirty tracked content\n");
  assert.equal(fs.readFileSync(path.join(selected, "Dev", "WORKFLOW.md"), "utf8").replace(/\r\n/g, "\n"), "Historical record stays a file.\n");
  assert.equal(git(path.join(selected, "Main"), "branch", "--show-current"), "main");
  assert.equal(git(path.join(selected, "Dev"), "branch", "--show-current"), "dev");
  const afterRefs = git(path.join(selected, "Main"), "for-each-ref", "--format=%(refname)%00%(objectname)", "refs/heads", "refs/remotes", "refs/tags");
  const originalMain = refs.split(/\r?\n/).find(ref => ref.startsWith("refs/heads/main\0"));
  assert.ok(originalMain);
  const originalMainRevision = originalMain.split("\0")[1];
  assert.equal(git(path.join(selected, "Main"), "merge-base", "--is-ancestor", originalMainRevision, "main"), "");
  assert.match(afterRefs, /refs\/heads\/dev\0/);
  assert.equal(git(path.join(selected, "Main"), "remote", "-v"), remotes);
  assert.deepEqual(checkouts.slice(0, 2).map(checkout => [checkout.role, checkout.projectRelativePath]).sort(), [["dev", "Dev"], ["main", "Main"]]);
  const reopenPlan = await api.inspectExistingProjectGitAdoption();
  assert.equal(reopenPlan.state, "managed-ready");
  const reopenedEntry = await openInspectedExistingProject(api, reopenPlan);
  assert.equal(reopenedEntry.kind, "ready");
  const reopened = reopenedEntry.project;
  assert.equal(reopened.projectId, current.projectId);
  assert.equal(reopened.created, false);
  assert.deepEqual(checkouts.slice(0, 2).map(checkout => checkout.repositoryCheckoutId).sort(), checkouts.slice(-2).map(checkout => checkout.repositoryCheckoutId).sort());
  const workspaceId = (await harness.listRegisteredWorkspaces()).workspaces[0].workspaceId;
  const managedCheckouts = await harness.listRepositoryCheckouts(workspaceId);
  assert.deepEqual(managedCheckouts.map(checkout => checkout.role).sort(), ["dev", "main"]);
  assert.equal(managedCheckouts.some(checkout => checkout.role === "conventional"), false);
  const discovery = await harness.registry.callTool({ name: "git_toolbox", arguments: {
    workspaceId, action: "list_repository_checkouts" }, scope: "files.read" });
  assert.equal(discovery.ok, true);
  assert.deepEqual(discovery.payload.map(checkout => checkout.role).sort(), ["dev", "main"]);
  assert.deepEqual(discovery.payload.map(checkout => checkout.repositoryCheckoutId).sort(),
    managedCheckouts.map(checkout => checkout.repositoryCheckoutId).sort());
  const mcpRead = await harness.registry.callTool({ name: "repo_toolbox", arguments: { workspaceId, action: "read_file",
    params: { relativePath: "Dev/WORKFLOW.md" } }, scope: "files.read" });
  assert.equal(mcpRead.ok, true);
  assert.match(mcpRead.payload.content, /Historical record stays a file/);
  const state = createSQLiteProjectStateStore(path.join(selected, ".champcity", "project-state.sqlite"));
  try {
    const resources = (await state.listEntities(current.projectId, "ProjectResource")).filter(row => row.entityType === "ProjectResource");
    assert.equal(resources.filter(row => row.body.resourceType === "current-project-registration").length, 1);
    assert.equal(resources.filter(row => row.body.resourceType === "source-repository").length, 1);
    assert.equal((await state.listEntities(current.projectId, "WorkIntake")).length, 0);
    assert.equal((await state.listEntities(current.projectId, "Workflow")).length, 0);
  } finally { state.close(); await harness.stop().catch(() => undefined); }
});

test("managed source establishment remains retryable when SPS registration fails after adoption", async context => {
  const selected = root(context);
  git(selected, "init", "-b", "main");
  git(selected, "config", "user.name", "Synthetic Test");
  git(selected, "config", "user.email", "test@example.invalid");
  fs.writeFileSync(path.join(selected, "README.md"), "baseline\n");
  git(selected, "add", "README.md");
  git(selected, "commit", "-m", "baseline");
  git(selected, "branch", "dev");
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-harness-retry-"));
  context.after(() => fs.rmSync(userData, { recursive: true, force: true }));
  const harness = new AgentHarnessService({ userDataRoot: userData });
  harness.registerWorkspace = rootPath => harness.registerWorkspaceRoot(rootPath);
  context.after(() => harness.stop().catch(() => undefined));
  let failRegistration = true;
  const { api } = mainPreloadHarness(["project:inspectExistingGitAdoption", "project:applyExistingGitAdoption", "project:registerCurrent"], {
    getRequiredWorkspaceRoot: () => selected,
    registerCurrentProject: (...args) => {
      if (failRegistration) { failRegistration = false; throw new Error("synthetic SPS registration failure"); }
      return registerCurrentProject(...args);
    },
    selectedCurrentProjectId, CURRENT_PROJECT_REPOSITORY_ID,
    getAgentHarnessServiceHostClient: () => harness, createSourceControlService, establishManagedProjectSource,
    inspectExistingProjectGitAdoption, applyExistingProjectGitAdoption,
    fs, path, MANAGED_PROJECT_SOURCE_PATHS, ...sourceProjectionContext,
  });
  const adoption = await api.inspectExistingProjectGitAdoption();
  assert.equal(adoption.state, "conversion-required");
  await api.applyExistingProjectGitAdoption(adoption.planId);
  await assert.rejects(api.registerCurrentProject("existing"), /synthetic SPS registration failure/);
  assert.equal(selectedCurrentProjectId(selected), null);
  assert.equal(fs.existsSync(path.join(selected, ".git")), false);
  assert.equal(fs.existsSync(path.join(selected, ".champcity", "repository.git")), true);
  const retried = await api.registerCurrentProject("existing");
  assert.equal(retried.repositoryId, CURRENT_PROJECT_REPOSITORY_ID);
  assert.equal(selectedCurrentProjectId(selected), retried.projectId);
  const store = createSQLiteProjectStateStore(path.join(selected, ".champcity", "project-state.sqlite"));
  try {
    const resources = (await store.listEntities(retried.projectId, "ProjectResource"));
    assert.equal(resources.filter(row => row.entityType === "ProjectResource" && row.body.resourceType === "source-repository").length, 1);
  } finally { store.close(); await harness.stop().catch(() => undefined); }
});

test("Existing Project conversion and managed reopen preserve source and Current Project state while Agent Harness is unavailable", async context => {
  const selected = root(context);
  initializeConventionalGit(selected);
  const unavailable = { registerWorkspace: async () => { throw new Error("synthetic Agent Harness unavailable"); } };
  const { api } = mainPreloadHarness([
    "project:inspectExistingGitAdoption", "project:applyExistingGitAdoption", "project:registerCurrent",
  ], {
    getRequiredWorkspaceRoot: () => selected,
    getAgentHarnessServiceHostClient: () => unavailable,
    registerCurrentProject, selectedCurrentProjectId, CURRENT_PROJECT_REPOSITORY_ID,
    createSourceControlService, createWorkflowApplicationService, establishManagedProjectSource,
    inspectExistingProjectGitAdoption, applyExistingProjectGitAdoption,
    fs, path, MANAGED_PROJECT_SOURCE_PATHS, ...sourceProjectionContext,
  });
  const plan = await api.inspectExistingProjectGitAdoption();
  const converted = await api.applyExistingProjectGitAdoption(plan.planId);
  assert.equal(converted.sourceApplied, true);
  assert.equal(converted.sourcePlan.state, "managed-ready");
  assert.equal(converted.modelAccess.state, "degraded");
  const current = await api.registerCurrentProject("existing", "Unavailable Harness Project");
  assert.equal(current.repositoryId, CURRENT_PROJECT_REPOSITORY_ID);
  assert.equal(current.modelAccess.state, "degraded");
  assert.equal(selectedCurrentProjectId(selected), current.projectId);
  assert.equal(fs.existsSync(path.join(selected, ".git")), false);
  assert.equal(fs.existsSync(path.join(selected, ".champcity", "repository.git")), true);
  const reopened = await api.registerCurrentProject("existing");
  assert.equal(reopened.projectId, current.projectId);
  assert.equal(reopened.created, false);
  assert.equal(reopened.modelAccess.state, "degraded");
});

test("Greenfield bootstrap and Current Project registration complete before unavailable model-access projection", async context => {
  const selected = root(context);
  let harnessAvailable = false;
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-harness-greenfield-reconcile-"));
  context.after(() => fs.rmSync(userData, { recursive: true, force: true }));
  const harness = new AgentHarnessService({ userDataRoot: userData });
  harness.registerWorkspace = async rootPath => {
    if (!harnessAvailable) throw new Error("synthetic Agent Harness unavailable");
    return harness.registerWorkspaceRoot(rootPath);
  };
  context.after(() => harness.stop().catch(() => undefined));
  const { assertGreenfieldProjectEntry } = loadProductionFunctions("src/main/main.ts", ["assertGreenfieldProjectEntry"],
    { fs, path, MANAGED_PROJECT_SOURCE_PATHS });
  const { api } = mainPreloadHarness(["project:registerCurrent", "project:reconcileModelAccess"], {
    getRequiredWorkspaceRoot: () => selected,
    assertGreenfieldProjectEntry,
    getAgentHarnessServiceHostClient: () => harness,
    registerCurrentProject, selectedCurrentProjectId, CURRENT_PROJECT_REPOSITORY_ID,
    createSourceControlService, createWorkflowApplicationService, establishManagedProjectSource,
    inspectExistingProjectGitAdoption,
    fs, path, MANAGED_PROJECT_SOURCE_PATHS, ...sourceProjectionContext,
  });
  const current = await api.registerCurrentProject("greenfield", "Degraded Greenfield");
  assert.equal(current.repositoryId, CURRENT_PROJECT_REPOSITORY_ID);
  assert.equal(current.modelAccess.state, "degraded");
  assert.equal(selectedCurrentProjectId(selected), current.projectId);
  assert.equal(git(path.join(selected, "Main"), "branch", "--show-current"), "main");
  assert.equal(git(path.join(selected, "Dev"), "branch", "--show-current"), "dev");
  harnessAvailable = true;
  assert.deepEqual(await api.reconcileCurrentProjectModelAccess(), { state: "ready", error: null });
  const workspaceId = (await harness.listRegisteredWorkspaces()).workspaces[0].workspaceId;
  assert.deepEqual((await harness.listRepositoryCheckouts(workspaceId)).map(item => item.role).sort(), ["dev", "main"]);
});

test("machine-owned shared source lease blocks conversion before mutation and new work waits behind exclusive intent", async context => {
  const selected = root(context);
  initializeConventionalGit(selected);
  const unrelated = root(context);
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-source-fence-conversion-"));
  context.after(() => fs.rmSync(userData, { recursive: true, force: true }));
  const coordinator = createProjectSourceOperationCoordinator({ userDataRoot: userData, acquisitionTimeoutMs: 10_000, staleLeaseMs: 2_000 });
  const activeModelOperation = await coordinator.acquireShared(selected, "model-operation-a");
  const unavailable = { registerWorkspace: async () => { throw new Error("synthetic Agent Harness unavailable"); } };
  const { api } = mainPreloadHarness(["project:inspectExistingGitAdoption", "project:applyExistingGitAdoption"], {
    getRequiredWorkspaceRoot: () => selected,
    getAgentHarnessServiceHostClient: () => unavailable,
    CURRENT_PROJECT_REPOSITORY_ID, inspectExistingProjectGitAdoption, applyExistingProjectGitAdoption,
    fs, path, reconcileProjectModelAccess, hydrateRepositoryEnvironment,
    selectedWorkspaceEvidenceNotifier: sourceProjectionContext.selectedWorkspaceEvidenceNotifier,
    projectSourceOperationCoordinator: coordinator,
  });
  const plan = await api.inspectExistingProjectGitAdoption();
  let conversionCompleted = false;
  const conversion = api.applyExistingProjectGitAdoption(plan.planId).then(result => { conversionCompleted = true; return result; });
  const leaseRoot = projectSourceOperationLeaseDirectory(userData, selected);
  await waitFor(() => fs.existsSync(path.join(leaseRoot, "exclusive-intent")), "exclusive intent was not established");
  let modelOperationBStarted = false;
  const modelOperationB = coordinator.acquireShared(selected, "model-operation-b").then(async lease => {
    modelOperationBStarted = true;
    await lease.release();
  });
  const unrelatedLease = await coordinator.acquireShared(unrelated, "unrelated-project-c");
  await new Promise(resolve => setTimeout(resolve, 40));
  assert.equal(modelOperationBStarted, false);
  assert.equal(conversionCompleted, false);
  assert.equal(fs.existsSync(path.join(selected, ".git")), true);
  assert.equal(fs.existsSync(path.join(selected, ...EXISTING_PROJECT_GIT_ADOPTION_JOURNAL.split("/"))), false);
  await unrelatedLease.release();
  await activeModelOperation.release();
  const converted = await conversion;
  await modelOperationB;
  assert.equal(converted.sourceApplied, true);
  assert.equal(converted.sourcePlan.state, "managed-ready");
  assert.equal(converted.modelAccess.state, "degraded");
  assert.equal(fs.existsSync(path.join(selected, ".git")), false);
});

test("source-operation fence coordinates across processes without persisting raw Project paths", async context => {
  const selected = root(context);
  const unrelated = root(context);
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-source-fence-process-"));
  context.after(() => fs.rmSync(userData, { recursive: true, force: true }));
  const modulePath = path.resolve(__dirname, "../../dist/main/core/projectSourceOperationCoordinator.js");
  const childScript = `
    const { createProjectSourceOperationCoordinator } = require(${JSON.stringify(modulePath)});
    const coordinator = createProjectSourceOperationCoordinator({ userDataRoot: process.argv[1], acquisitionTimeoutMs: 10000, staleLeaseMs: 2000 });
    coordinator.acquireShared(process.argv[2], "detached-service-host-operation").then(lease => {
      process.stdout.write("acquired\\n");
      process.stdin.once("data", async () => { await lease.release(); process.stdout.write("released\\n"); process.exit(0); });
    }).catch(error => { process.stderr.write(String(error)); process.exit(1); });
  `;
  const child = spawn(process.execPath, ["-e", childScript, userData, selected], { stdio: ["pipe", "pipe", "pipe"] });
  context.after(() => { if (child.exitCode === null) child.kill(); });
  let stdout = "";
  child.stdout.on("data", chunk => { stdout += chunk.toString(); });
  let stderr = "";
  child.stderr.on("data", chunk => { stderr += chunk.toString(); });
  await waitFor(() => stdout.includes("acquired"), `child shared lease failed: ${stderr}`);

  const coordinator = createProjectSourceOperationCoordinator({ userDataRoot: userData, acquisitionTimeoutMs: 10_000, staleLeaseMs: 2_000 });
  let exclusiveAcquired = false;
  const exclusivePromise = coordinator.acquireExclusive(selected, "desktop-source-transition").then(lease => {
    exclusiveAcquired = true;
    return lease;
  });
  const leaseRoot = projectSourceOperationLeaseDirectory(userData, selected);
  await waitFor(() => fs.existsSync(path.join(leaseRoot, "exclusive-intent")), "cross-process exclusive intent was not visible");
  let laterSharedAcquired = false;
  const laterSharedPromise = coordinator.acquireShared(selected, "later-model-operation").then(async lease => {
    laterSharedAcquired = true;
    await lease.release();
  });
  const unrelatedLease = await coordinator.acquireShared(unrelated, "unrelated-project-operation");
  await new Promise(resolve => setTimeout(resolve, 40));
  assert.equal(exclusiveAcquired, false);
  assert.equal(laterSharedAcquired, false);
  await unrelatedLease.release();
  child.stdin.write("release\n");
  const exclusiveLease = await exclusivePromise;
  assert.equal(laterSharedAcquired, false);
  await exclusiveLease.release();
  await laterSharedPromise;
  await waitFor(() => child.exitCode !== null, `child did not exit: ${stderr}`);
  assert.equal(child.exitCode, 0, stderr);
  assert.equal(fs.readdirSync(leaseRoot, { recursive: true }).join("\n").includes(selected), false);
});

test("source-operation fence deterministically recovers synthetic stale ownership", async context => {
  const selected = root(context);
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-source-fence-stale-"));
  context.after(() => fs.rmSync(userData, { recursive: true, force: true }));
  const leaseRoot = projectSourceOperationLeaseDirectory(userData, selected);
  const staleIntent = path.join(leaseRoot, "exclusive-intent");
  fs.mkdirSync(staleIntent, { recursive: true });
  fs.writeFileSync(path.join(staleIntent, "owner.json"), JSON.stringify({
    pid: 2147483647, token: "stale-owner", owner: "terminated-owner", heartbeatAt: Date.now(),
  }));
  const coordinator = createProjectSourceOperationCoordinator({ userDataRoot: userData, acquisitionTimeoutMs: 500, staleLeaseMs: 100 });
  const lease = await coordinator.acquireShared(selected, "recovery-operation");
  assert.equal(fs.existsSync(staleIntent), false);
  assert.equal(JSON.stringify(fs.readdirSync(path.dirname(leaseRoot))).includes(selected), false);
  await lease.release();
});

test("post-conversion projection outage stays degraded and later reconciliation does not rerun conversion", async context => {
  const selected = root(context);
  initializeConventionalGit(selected);
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-harness-projection-retry-"));
  context.after(() => fs.rmSync(userData, { recursive: true, force: true }));
  const harness = new AgentHarnessService({ userDataRoot: userData });
  harness.registerWorkspace = rootPath => harness.registerWorkspaceRoot(rootPath);
  const preConversion = await harness.registerWorkspace(selected);
  assert.deepEqual((await harness.listRepositoryCheckouts(preConversion.workspace.workspaceId))
    .map(checkout => checkout.role), ["conventional"]);
  const realRegisterCheckout = harness.registerRepositoryCheckout.bind(harness);
  const realUnregisterCheckout = harness.workspaceRegistry.unregisterRepositoryCheckout.bind(harness.workspaceRegistry);
  let projectionAvailable = false;
  harness.registerRepositoryCheckout = async (workspaceId, checkout) => {
    if (checkout.role !== "conventional" && !projectionAvailable) throw new Error("synthetic managed projection outage");
    return realRegisterCheckout(workspaceId, checkout);
  };
  harness.workspaceRegistry.unregisterRepositoryCheckout = async (...args) => {
    if (!projectionAvailable) throw new Error("synthetic conventional projection retirement outage");
    return realUnregisterCheckout(...args);
  };
  context.after(() => harness.stop().catch(() => undefined));
  let conversionCalls = 0;
  const { api } = mainPreloadHarness([
    "project:inspectExistingGitAdoption", "project:applyExistingGitAdoption", "project:registerCurrent", "project:reconcileModelAccess",
  ], {
    getRequiredWorkspaceRoot: () => selected,
    getAgentHarnessServiceHostClient: () => harness,
    registerCurrentProject, selectedCurrentProjectId, CURRENT_PROJECT_REPOSITORY_ID,
    createSourceControlService, createWorkflowApplicationService, establishManagedProjectSource, inspectExistingProjectGitAdoption,
    applyExistingProjectGitAdoption: input => { conversionCalls += 1; return applyExistingProjectGitAdoption(input); },
    fs, path, MANAGED_PROJECT_SOURCE_PATHS, ...sourceProjectionContext,
  });
  const plan = await api.inspectExistingProjectGitAdoption();
  const converted = await api.applyExistingProjectGitAdoption(plan.planId);
  assert.equal(converted.sourceApplied, true);
  assert.equal(converted.modelAccess.state, "degraded");
  assert.equal(JSON.parse(fs.readFileSync(path.join(selected, ...EXISTING_PROJECT_GIT_ADOPTION_JOURNAL.split("/")), "utf8")).stage, "completed");
  assert.equal(JSON.parse(fs.readFileSync(path.join(selected, ...EXISTING_PROJECT_GIT_ADOPTION_RECEIPT.split("/")), "utf8")).stage, "completed");
  const current = await api.registerCurrentProject("existing");
  assert.equal(current.modelAccess.state, "degraded");
  assert.equal(selectedCurrentProjectId(selected), current.projectId);
  assert.equal(fs.existsSync(path.join(selected, ".git")), false);
  projectionAvailable = true;
  assert.deepEqual(await api.reconcileCurrentProjectModelAccess(), { state: "ready", error: null });
  assert.equal(conversionCalls, 1);
  assert.deepEqual((await harness.listRepositoryCheckouts(preConversion.workspace.workspaceId))
    .map(checkout => checkout.role).sort(), ["dev", "main"]);
});

test("all Project entry actions use canonical admission while Clear and Intake cannot bypass Current Project identity", () => {
  const start = rendererSource.slice(rendererSource.indexOf("async function startNewProjectFromLanding"),
    rendererSource.indexOf("async function activateWorkspaceSelection"));
  const open = rendererSource.slice(rendererSource.indexOf("async function openExistingProject()"),
    rendererSource.indexOf("async function startNewProjectFromLanding"));
  const sidebarOpen = rendererSource.slice(rendererSource.indexOf("async function chooseWorkspace()"),
    rendererSource.indexOf("async function clearWorkspace()"));
  const clear = rendererSource.slice(rendererSource.indexOf("async function clearWorkspace()"),
    rendererSource.indexOf("async function chooseProjectRepository()"));
  const intakeRepository = rendererSource.slice(rendererSource.indexOf("async function chooseProjectRepository()"),
    rendererSource.indexOf("function currentEvidenceRefreshTarget()"));
  assert.match(start, /registerCurrentProject\("greenfield"\)/);
  assert.match(start, /activateWorkspaceSelection\(selection, "project-intake-capture", project\)/);
  assert.doesNotMatch(start, /openWorkIntake/);
  assert.match(sidebarOpen, /await openExistingProject\(\)/);
  assert.match(rendererSource, /onChooseProject=\{chooseWorkspace\}/);
  assert.match(open, /admitExistingProject\(window\.champcity\)/);
  assert.match(open, /setShellView\("landing"\)/);
  assert.doesNotMatch(open, /chooseWorkspaceFolder\(\)/);
  assert.match(entryControllerSource, /chooseWorkspaceFolder\(\)/);
  assert.match(entryControllerSource, /inspectExistingProjectGitAdoption\(\)/);
  assert.ok(entryControllerSource.indexOf("chooseWorkspaceFolder()") < entryControllerSource.indexOf("inspectExistingProjectGitAdoption()"));
  assert.match(clear, /setCurrentProject\(null\)/);
  assert.match(clear, /setPendingExistingProjectPlan\(null\)/);
  assert.match(clear, /setShellView\("landing"\)/);
  assert.doesNotMatch(clear, /setShellView\("workflow-hub"\)/);
  assert.doesNotMatch(intakeRepository, /chooseWorkspaceFolder|activateWorkspaceSelection/);
  assert.match(intakeRepository, /projectRepository: workspace\.workspaceRoot/);
  const activate = rendererSource.slice(rendererSource.indexOf("async function activateWorkspaceSelection"), rendererSource.indexOf("function clearRepositoryDerivedState"));
  assert.match(activate, /if \(!project\) throw Error\("A Current Project is required before opening a Project workspace\."\)/);
  assert.match(activate, /getWorkflow\(project\.projectCreationWorkflowId\)/);
  assert.match(activate, /setSelectedWorkflowId\(opened\.workflow\.workflowId\)/);
  assert.match(activate, /workflowType !== "project-creation"/);
  assert.match(rendererSource, /selectedWorkflowId === workflowInstance\.workflowId/);
  assert.match(entryControllerSource, /applyExistingProjectGitAdoption\(plan\.planId\)/);
  assert.match(entryControllerSource, /registerCurrentProject\("existing"\)/);
  assert.match(open, /activateWorkspaceSelection\(result\.selection, "workflow-hub", result\.project\)/);
  const cancel = rendererSource.slice(rendererSource.indexOf("async function cancelExistingProjectMigration"),
    rendererSource.indexOf("async function startNewProjectFromLanding"));
  assert.match(cancel, /clearSelectedWorkspace\(\)/);
  assert.match(cancel, /setCurrentProject\(null\)/);
  assert.match(cancel, /setShellView\("landing"\)/);
  assert.doesNotMatch(cancel, /applyExistingProjectGitAdoption|registerCurrentProject/);
  assert.match(open, /Project source changed\. Review the conversion warning before accepting again\./);
});
