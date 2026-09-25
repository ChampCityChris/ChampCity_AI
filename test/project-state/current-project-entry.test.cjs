const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { mainPreloadHarness, loadProductionFunctions } = require("../support/production-execution.cjs");
const { MANAGED_PROJECT_SOURCE_PATHS } = require("../../dist/shared/sourceLifecycleContracts.js");
const rendererSource = fs.readFileSync(path.resolve(__dirname, "../../src/renderer/app/App.tsx"), "utf8");

function root(context) {
  const selected = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-entry-"));
  context.after(() => fs.rmSync(selected, { recursive: true, force: true }));
  return selected;
}

test("Greenfield entry validates an empty container, establishes SPS and registers Main/Dev without Work Intake", async context => {
  const selected = root(context);
  const events = [];
  const { assertGreenfieldProjectEntry } = loadProductionFunctions("src/main/main.ts", ["assertGreenfieldProjectEntry"],
    { fs, path, MANAGED_PROJECT_SOURCE_PATHS });
  const { api, invocations } = mainPreloadHarness(["project:registerCurrent"], {
    getRequiredWorkspaceRoot: () => selected,
    assertGreenfieldProjectEntry,
    registerCurrentProject: async (rootPath, mode) => { events.push(["project", rootPath, mode]); return {
      project: { id: "project-1", body: { name: "New Project" } }, projectResource: { body: { logicalName: "repo-1" } }, created: true };
    },
    getAgentHarnessServiceHostClient: () => ({ registerWorkspace: async rootPath => ({ workspace: { workspaceId: "workspace-1" }, rootPath }),
      registerRepositoryCheckout: async (workspaceId, checkout) => { events.push(["checkout", workspaceId, checkout.role]); return checkout; } }),
    createSourceControlService: options => ({ bootstrapProjectSource: async () => {
      events.push(["bootstrap", options.repositoryId]);
      await Promise.all(["main", "dev"].map(role => options.checkoutRegistration.registerRepositoryCheckout(
        options.checkoutRegistration.workspaceId, { role })));
      return { ok: true };
    } }),
    fs, path, MANAGED_PROJECT_SOURCE_PATHS,
  });
  const current = await api.registerCurrentProject("greenfield", "New Project");
  assert.equal(current.projectId, "project-1");
  assert.deepEqual(events, [["project", selected, "greenfield"], ["bootstrap", "repo-1"],
    ["checkout", "workspace-1", "main"], ["checkout", "workspace-1", "dev"]]);
  assert.deepEqual(invocations.map(call => call.channel), ["project:registerCurrent"]);
  assert.throws(() => assertGreenfieldProjectEntry(path.dirname(selected)), /empty Project container/);
});

test("Existing historical Project entry registers SPS identity without Work Intake reconstruction", async context => {
  const selected = root(context);
  fs.writeFileSync(path.join(selected, "WORKFLOW.md"), "Historical record stays a file.\n");
  const events = [];
  const { api } = mainPreloadHarness(["project:registerCurrent"], {
    getRequiredWorkspaceRoot: () => selected,
    registerCurrentProject: async (_root, mode) => { events.push(["project", mode]); return {
      project: { id: "existing-project", body: { name: "Existing Project" } }, projectResource: { body: { logicalName: "repo-existing" } }, created: false };
    },
    getAgentHarnessServiceHostClient: () => ({ registerWorkspace: async () => ({ workspace: { workspaceId: "workspace-existing" } }) }),
    fs, path, MANAGED_PROJECT_SOURCE_PATHS,
  });
  const current = await api.registerCurrentProject("existing");
  assert.equal(current.projectId, "existing-project");
  assert.deepEqual(events, [["project", "existing"]]);
  assert.equal(fs.readFileSync(path.join(selected, "WORKFLOW.md"), "utf8"), "Historical record stays a file.\n");
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
