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
const { createSourceControlService } = require("../../dist/main/sourceControl/sourceControlService.js");
const { establishManagedProjectSource } = require("../../dist/main/sourceControl/managedProjectSourceService.js");
const { createSQLiteProjectStateStore } = require("../../dist/main/projectState/sqliteProjectStateStore.js");
const rendererSource = fs.readFileSync(path.resolve(__dirname, "../../src/renderer/app/App.tsx"), "utf8");

function root(context) {
  const selected = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-entry-"));
  context.after(() => fs.rmSync(selected, { recursive: true, force: true }));
  return selected;
}
function git(rootPath, ...args) { return execFileSync("git", args, { cwd: rootPath, encoding: "utf8" }).trim(); }

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
  const { api, invocations } = mainPreloadHarness(["project:registerCurrent"], {
    getRequiredWorkspaceRoot: () => selected,
    assertGreenfieldProjectEntry,
    registerCurrentProject,
    selectedCurrentProjectId,
    CURRENT_PROJECT_REPOSITORY_ID,
    getAgentHarnessServiceHostClient: () => harness,
    createSourceControlService,
    establishManagedProjectSource,
    fs, path, MANAGED_PROJECT_SOURCE_PATHS,
  });
  const current = await api.registerCurrentProject("greenfield", "New Project");
  assert.equal(current.projectId, selectedCurrentProjectId(selected));
  assert.equal(current.projectName, "New Project");
  assert.equal(current.created, true);
  assert.deepEqual(checkouts.map(checkout => [checkout.role, checkout.projectRelativePath]).sort(), [["dev", "Dev"], ["main", "Main"]]);
  assert.equal(fs.existsSync(path.join(selected, ".git")), false);
  assert.equal(fs.existsSync(path.join(selected, ".champcity", "repository.git")), true);
  const state = createSQLiteProjectStateStore(path.join(selected, ".champcity", "project-state.sqlite"));
  try {
    assert.equal((await state.listEntities(current.projectId, "WorkIntake")).length, 0);
    assert.equal((await state.listEntities(current.projectId, "Workflow")).length, 0);
  } finally { state.close(); await harness.stop().catch(() => undefined); }
  assert.deepEqual(invocations.map(call => call.channel), ["project:registerCurrent"]);
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
    getAgentHarnessServiceHostClient: () => harness,
    createSourceControlService,
    establishManagedProjectSource,
    fs, path, MANAGED_PROJECT_SOURCE_PATHS,
  });
  const current = await api.registerCurrentProject("existing");
  assert.equal(current.projectId, selectedCurrentProjectId(selected));
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
