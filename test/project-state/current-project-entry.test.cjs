const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { mainPreloadHarness, loadProductionFunctions } = require("../support/production-execution.cjs");
const { MANAGED_PROJECT_SOURCE_PATHS } = require("../../dist/shared/sourceLifecycleContracts.js");
const { AgentHarnessService } = require("../../dist/main/agentHarness/runtime/agentHarnessService.js");
const { CURRENT_PROJECT_REPOSITORY_ID, registerCurrentProject, selectedCurrentProjectId } = require("../../dist/main/projectState/currentProjectRegistrationService.js");
const { selectedSourceGraphRepositoryId } = require("../../dist/main/sourceControl/sourceGraphService.js");
const { resolveManagedDevRepositoryCheckout } = require("../../dist/main/sourceControl/managedProjectSourceService.js");
const { createSourceControlService } = require("../../dist/main/sourceControl/sourceControlService.js");
const { establishManagedProjectSource } = require("../../dist/main/sourceControl/managedProjectSourceService.js");
const { createSQLiteProjectStateStore } = require("../../dist/main/projectState/sqliteProjectStateStore.js");
const { createProjectStateService } = require("../../dist/shared/projectState/projectStateService.js");
const { getGreenfieldWorkIntakeProjection, getStructuredWorkIntakeProjection, isGreenfieldProjectRoot } = require("../../dist/main/workIntake/structuredWorkIntakeService.js");
const { getWorkIntakeProjection } = require("../../dist/main/workIntake/workIntakeService.js");
const rendererSource = fs.readFileSync(path.resolve(__dirname, "../../src/renderer/app/App.tsx"), "utf8");

function root(context) {
  const selected = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-entry-"));
  context.after(() => fs.rmSync(selected, { recursive: true, force: true }));
  return selected;
}
function git(rootPath, ...args) { return execFileSync("git", args, { cwd: rootPath, encoding: "utf8" }).trim(); }

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
    selectedCurrentProjectId,
    CURRENT_PROJECT_REPOSITORY_ID,
    resolveManagedDevRepositoryCheckout,
    selectedSourceGraphRepositoryId,
    getStructuredWorkIntakeProjection,
    isGreenfieldProjectRoot,
    getGreenfieldWorkIntakeProjection,
    getWorkIntakeProjection,
    getAgentHarnessServiceHostClient: () => harness,
    createSourceControlService,
    establishManagedProjectSource,
    fs, path, MANAGED_PROJECT_SOURCE_PATHS,
  });
  const current = await api.registerCurrentProject("greenfield", "New Project");
  assert.equal(current.projectId, selectedCurrentProjectId(selected));
  assert.equal(current.projectName, "New Project");
  assert.equal(current.repositoryId, CURRENT_PROJECT_REPOSITORY_ID);
  assert.equal(current.created, true);
  assert.deepEqual(checkouts.map(checkout => [checkout.role, checkout.projectRelativePath]).sort(), [["dev", "Dev"], ["main", "Main"]]);
  assert.equal(fs.existsSync(path.join(selected, ".git")), false);
  assert.equal(fs.existsSync(path.join(selected, ".champcity", "repository.git")), true);
  const state = createSQLiteProjectStateStore(path.join(selected, ".champcity", "project-state.sqlite"));
  try {
    assert.equal((await state.listEntities(current.projectId, "WorkIntake")).length, 0);
    assert.equal((await state.listEntities(current.projectId, "Workflow")).length, 0);
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
  assert.equal(graphResponse.result.workflowBindings[0].currentRevisionId, featureRevision);
  assert.equal(fs.existsSync(path.join(selected, ".git")), false);
  assert.equal(path.resolve(await resolveManagedDevRepositoryCheckout(selected)), path.resolve(devRoot));
  const detail = await api.getSourceGraphRevisionDetail(featureRevision);
  assert.equal(detail.ok, true, JSON.stringify(detail));
  assert.deepEqual(detail.result.changedFiles, [{ path: "graph-proof.txt", status: "A" }]);
  const projection = await api.getWorkIntakeProjection();
  assert.equal(projection.currentBranch, "dev");
  assert.equal(projection.branches[0].name, "dev");
  assert.deepEqual(invocations.map(call => call.channel), ["project:registerCurrent", "sourceGraph:get", "sourceGraph:revisionDetail", "workIntake:projection"]);
  await harness.stop().catch(() => undefined);
  assert.throws(() => assertGreenfieldProjectEntry(path.dirname(selected)), /empty Project container/);
  await assert.rejects(api.registerCurrentProject("greenfield", "Duplicate"), /cannot reopen a Current Project/);
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
    getAgentHarnessServiceHostClient: () => harness, createSourceControlService, establishManagedProjectSource,
    fs, path, MANAGED_PROJECT_SOURCE_PATHS,
  });
  const current = await api.registerCurrentProject("greenfield", "Recovered Greenfield");
  assert.equal(current.created, true);
  assert.equal(current.projectId, selectedCurrentProjectId(selected));
  assert.equal(current.projectName, "Recovered Greenfield");
});

test("Existing conventional Project entry preserves source and historical Markdown without Workflow reconstruction", async context => {
  const selected = root(context);
  git(selected, "init", "-b", "main");
  git(selected, "config", "user.name", "Synthetic Test");
  git(selected, "config", "user.email", "test@example.invalid");
  fs.writeFileSync(path.join(selected, "README.md"), "baseline\n");
  git(selected, "add", "README.md");
  git(selected, "commit", "-m", "baseline");
  git(selected, "branch", "dev");
  git(selected, "remote", "add", "origin", "https://example.invalid/synthetic/project.git");
  const refs = git(selected, "for-each-ref", "--format=%(refname)%00%(objectname)", "refs/heads", "refs/remotes", "refs/tags");
  const remotes = git(selected, "remote", "-v");
  fs.writeFileSync(path.join(selected, "README.md"), "dirty tracked content\n");
  fs.writeFileSync(path.join(selected, "WORKFLOW.md"), "Historical record stays a file.\n");
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
  const { api } = mainPreloadHarness(["project:registerCurrent"], {
    getRequiredWorkspaceRoot: () => selected,
    registerCurrentProject,
    getAgentHarnessServiceHostClient: () => harness, CURRENT_PROJECT_REPOSITORY_ID,
    createSourceControlService,
    establishManagedProjectSource,
    fs, path, MANAGED_PROJECT_SOURCE_PATHS,
  });
  const current = await api.registerCurrentProject("existing");
  assert.equal(current.projectId, selectedCurrentProjectId(selected));
  assert.equal(current.repositoryId, CURRENT_PROJECT_REPOSITORY_ID);
  assert.equal(current.mode, "existing");
  assert.equal(current.created, true);
  assert.equal(fs.existsSync(path.join(selected, ".git")), false);
  assert.equal(fs.readFileSync(path.join(selected, "Main", "README.md"), "utf8"), "dirty tracked content\n");
  assert.equal(fs.readFileSync(path.join(selected, "Main", "WORKFLOW.md"), "utf8"), "Historical record stays a file.\n");
  assert.equal(git(path.join(selected, "Main"), "branch", "--show-current"), "main");
  assert.equal(git(path.join(selected, "Dev"), "branch", "--show-current"), "dev");
  assert.equal(git(path.join(selected, "Main"), "for-each-ref", "--format=%(refname)%00%(objectname)", "refs/heads", "refs/remotes", "refs/tags"), refs);
  assert.equal(git(path.join(selected, "Main"), "remote", "-v"), remotes);
  assert.deepEqual(checkouts.slice(0, 2).map(checkout => [checkout.role, checkout.projectRelativePath]).sort(), [["dev", "Dev"], ["main", "Main"]]);
  const reopened = await api.registerCurrentProject("existing");
  assert.equal(reopened.projectId, current.projectId);
  assert.equal(reopened.created, false);
  assert.deepEqual(checkouts.slice(0, 2).map(checkout => checkout.repositoryCheckoutId), checkouts.slice(2).map(checkout => checkout.repositoryCheckoutId));
  const workspaceId = (await harness.listRegisteredWorkspaces()).workspaces[0].workspaceId;
  const mcpRead = await harness.registry.callTool({ name: "repo_toolbox", arguments: { workspaceId, action: "read_file",
    params: { relativePath: "Main/WORKFLOW.md" } }, scope: "files.read" });
  assert.equal(mcpRead.ok, true);
  assert.match(mcpRead.payload.content, /Historical record stays a file/);
  const state = createSQLiteProjectStateStore(path.join(selected, ".champcity", "project-state.sqlite"));
  try {
    assert.equal((await state.listEntities(current.projectId, "WorkIntake")).length, 0);
    assert.equal((await state.listEntities(current.projectId, "Workflow")).length, 0);
  } finally { state.close(); await harness.stop().catch(() => undefined); }
});

test("landing actions route New Project to Project Intake and Existing Project to the Hub", () => {
  const start = rendererSource.slice(rendererSource.indexOf("async function startNewProjectFromLanding"),
    rendererSource.indexOf("async function activateWorkspaceSelection"));
  const open = rendererSource.slice(rendererSource.indexOf("async function openExistingProjectFromLanding"),
    rendererSource.indexOf("async function startNewProjectFromLanding"));
  assert.match(start, /registerCurrentProject\("greenfield"\)/);
  assert.match(start, /activateWorkspaceSelection\(selection, "project-intake-capture", project\)/);
  assert.doesNotMatch(start, /openWorkIntake/);
  assert.match(open, /registerCurrentProject\("existing"\)/);
  assert.match(open, /activateWorkspaceSelection\(selection, "workflow-hub", project\)/);
});
