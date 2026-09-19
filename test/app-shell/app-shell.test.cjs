const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "../..");

const { loadProductionFunctions, mainPreloadHarness } = require("../support/production-execution.cjs");

test("old implementation and rejected manifest paths are absent", () => {
  const absentPaths = [
    "src/shared/workflow",
    "src/main/workflow",
    "src/main/artifacts",
    "src/main/contextPackets",
    "scripts/migration/historical-corpus-v1",
    "planning/phases/phase-07/Migration_Manifests/HISTORICAL_CORPUS_INVENTORY_V1.json",
    "planning/phases/phase-07/Migration_Manifests/HISTORICAL_CORPUS_INVENTORY_V1.md",
  ];

  for (const relativePath of absentPaths) {
    assert.equal(fs.existsSync(path.join(repoRoot, relativePath)), false, relativePath);
  }
});

test("workspace settings accept a readable and writable empty repository", () => {
  const {
    validateWorkspaceRoot,
  } = require("../../dist/main/workspaceSettings.js");
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-shell-"));
  const validWorkspace = path.join(tempRoot, "empty-repository");
  fs.mkdirSync(validWorkspace, { recursive: true });

  assert.deepEqual(validateWorkspaceRoot(validWorkspace), {
    ok: true,
    workspaceRoot: path.resolve(validWorkspace),
  });
  assert.equal(fs.existsSync(path.join(validWorkspace, "planning")), false);
});

test("invalid workspace selection is rejected", () => {
  const {
    validateWorkspaceRoot,
  } = require("../../dist/main/workspaceSettings.js");
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-shell-"));
  const invalidWorkspace = path.join(tempRoot, "not-a-directory");
  fs.writeFileSync(invalidWorkspace, "not a directory", "utf8");

  const result = validateWorkspaceRoot(invalidWorkspace);
  assert.equal(result.ok, false);
  assert.equal(result.workspaceRoot, null);
});

test("workspace settings persist and reload from user data", () => {
  const {
    readSelectedWorkspace,
    saveSelectedWorkspace,
  } = require("../../dist/main/workspaceSettings.js");
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-shell-"));
  const userDataRoot = path.join(tempRoot, "user-data");
  const workspaceRoot = path.join(tempRoot, "workspace");
  fs.mkdirSync(workspaceRoot, { recursive: true });

  assert.equal(saveSelectedWorkspace(userDataRoot, workspaceRoot).ok, true);
  assert.deepEqual(readSelectedWorkspace(userDataRoot), {
    ok: true,
    workspaceRoot: path.resolve(workspaceRoot),
  });
  assert.equal(fs.existsSync(path.join(workspaceRoot, "planning")), false);
});

test("remembered workspace settings do not activate a fresh session selection", () => {
  const {
    readSelectedWorkspace,
    saveSelectedWorkspace,
  } = require("../../dist/main/workspaceSettings.js");
  const {
    SessionActiveWorkspaceSelection,
  } = require("../../dist/main/sessionActiveWorkspaceSelection.js");
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-shell-"));
  const userDataRoot = path.join(tempRoot, "user-data");
  const rememberedWorkspaceRoot = path.join(tempRoot, "remembered-workspace");
  fs.mkdirSync(rememberedWorkspaceRoot, { recursive: true });

  assert.equal(saveSelectedWorkspace(userDataRoot, rememberedWorkspaceRoot).ok, true);
  assert.deepEqual(readSelectedWorkspace(userDataRoot), {
    ok: true,
    workspaceRoot: path.resolve(rememberedWorkspaceRoot),
  });

  const sessionSelection = new SessionActiveWorkspaceSelection();
  assert.deepEqual(sessionSelection.currentSelection(), {
    ok: false,
    workspaceRoot: null,
    reason: "No workspace selected.",
  });
  assert.throws(
    () => sessionSelection.requireWorkspaceRoot(),
    /No workspace selected\./,
  );
});

test("session workspace selection activates only validated selection results", () => {
  const {
    validateWorkspaceRoot,
  } = require("../../dist/main/workspaceSettings.js");
  const {
    SessionActiveWorkspaceSelection,
  } = require("../../dist/main/sessionActiveWorkspaceSelection.js");
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-shell-"));
  const firstWorkspaceRoot = path.join(tempRoot, "first-workspace");
  const invalidWorkspaceRoot = path.join(tempRoot, "invalid-workspace");
  fs.mkdirSync(firstWorkspaceRoot, { recursive: true });
  fs.writeFileSync(invalidWorkspaceRoot, "not a directory", "utf8");

  const sessionSelection = new SessionActiveWorkspaceSelection();
  const detachedWorkspaceRoots = [];
  const detach = (workspaceRoot) => detachedWorkspaceRoots.push(workspaceRoot);

  assert.equal(sessionSelection.retainCurrentSelection().ok, false);
  assert.equal(
    sessionSelection.activateFromValidation(
      validateWorkspaceRoot(invalidWorkspaceRoot),
      detach,
    ).ok,
    false,
  );
  assert.equal(sessionSelection.currentSelection().ok, false);
  assert.deepEqual(detachedWorkspaceRoots, []);

  const firstSelection = validateWorkspaceRoot(firstWorkspaceRoot);
  assert.deepEqual(
    sessionSelection.activateFromValidation(firstSelection, detach),
    firstSelection,
  );
  assert.equal(
    sessionSelection.requireWorkspaceRoot(),
    path.resolve(firstWorkspaceRoot),
  );
  assert.deepEqual(detachedWorkspaceRoots, []);

  assert.deepEqual(sessionSelection.retainCurrentSelection(), firstSelection);
  assert.equal(
    sessionSelection.requireWorkspaceRoot(),
    path.resolve(firstWorkspaceRoot),
  );

  assert.equal(
    sessionSelection.activateFromValidation(
      validateWorkspaceRoot(invalidWorkspaceRoot),
      detach,
    ).ok,
    false,
  );
  assert.deepEqual(sessionSelection.currentSelection(), firstSelection);
  assert.deepEqual(detachedWorkspaceRoots, []);
});

test("session workspace switching detaches the prior active workspace and clear deactivates", () => {
  const {
    clearSelectedWorkspace,
    readSelectedWorkspace,
    saveSelectedWorkspace,
  } = require("../../dist/main/workspaceSettings.js");
  const {
    SessionActiveWorkspaceSelection,
  } = require("../../dist/main/sessionActiveWorkspaceSelection.js");
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-shell-"));
  const userDataRoot = path.join(tempRoot, "user-data");
  const firstWorkspaceRoot = path.join(tempRoot, "first-workspace");
  const secondWorkspaceRoot = path.join(tempRoot, "second-workspace");
  fs.mkdirSync(firstWorkspaceRoot, { recursive: true });
  fs.mkdirSync(secondWorkspaceRoot, { recursive: true });

  const sessionSelection = new SessionActiveWorkspaceSelection();
  const detachedWorkspaceRoots = [];
  const detach = (workspaceRoot) => detachedWorkspaceRoots.push(workspaceRoot);
  const firstSelection = saveSelectedWorkspace(userDataRoot, firstWorkspaceRoot);
  assert.equal(firstSelection.ok, true);
  sessionSelection.activateFromValidation(firstSelection, detach);

  const secondSelection = saveSelectedWorkspace(userDataRoot, secondWorkspaceRoot);
  assert.equal(secondSelection.ok, true);
  assert.deepEqual(
    sessionSelection.activateFromValidation(secondSelection, detach),
    secondSelection,
  );
  assert.deepEqual(detachedWorkspaceRoots, [path.resolve(firstWorkspaceRoot)]);
  assert.equal(
    sessionSelection.requireWorkspaceRoot(),
    path.resolve(secondWorkspaceRoot),
  );
  assert.deepEqual(readSelectedWorkspace(userDataRoot), secondSelection);

  assert.deepEqual(sessionSelection.deactivate(detach), {
    ok: false,
    workspaceRoot: null,
    reason: "No workspace selected.",
  });
  assert.deepEqual(detachedWorkspaceRoots, [
    path.resolve(firstWorkspaceRoot),
    path.resolve(secondWorkspaceRoot),
  ]);
  assert.throws(
    () => sessionSelection.requireWorkspaceRoot(),
    /No workspace selected\./,
  );

  assert.deepEqual(clearSelectedWorkspace(userDataRoot), {
    ok: false,
    workspaceRoot: null,
    reason: "No workspace selected.",
  });
  assert.equal(readSelectedWorkspace(userDataRoot).ok, false);
});

test("workspace IPC activates only session selections and clears attached runtime evidence", async (t) => {
  const settings = require("../../dist/main/workspaceSettings.js");
  const { SessionActiveWorkspaceSelection } = require("../../dist/main/sessionActiveWorkspaceSelection.js");
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-shell-ipc-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const userDataRoot = path.join(root, "user-data");
  const first = path.join(root, "first");
  const second = path.join(root, "second");
  fs.mkdirSync(first);
  fs.mkdirSync(second);
  settings.saveSelectedWorkspace(userDataRoot, first);
  const sessionActiveWorkspace = new SessionActiveWorkspaceSelection();
  const events = [];
  let choice = { canceled: true, filePaths: [] };
  const scope = {
    ...settings, sessionActiveWorkspace, process: { platform: "win32" },
    getUserDataRoot: () => userDataRoot,
    dialog: { showOpenDialog: async () => choice },
    selectedWorkspaceEvidenceNotifier: {
      selectWorkspace: (root) => { events.push(["select", root]); return events.length; },
      clear: () => events.push(["clear"]),
    },
    detachArchitectBrowserSurface: () => events.push(["detach"]),
    getAgentHarnessServiceHostClient: () => ({ registerWorkspace: async (root) => events.push(["register", root]) }),
    getCurrentWorkspaceModel: (root) => ({ root }),
  };
  Object.assign(scope, loadProductionFunctions("src/main/main.ts", [
    "getRequiredWorkspaceRoot", "deactivateSelectedWorkspaceRuntime",
  ], scope));
  const { api } = mainPreloadHarness([
    "workspace:get", "workspace:choose", "workspace:clear", "currentWorkflow:getModel",
  ], scope);
  assert.equal((await api.getSelectedWorkspace()).ok, false);
  assert.equal((await api.chooseWorkspaceFolder()).ok, false);
  await assert.rejects(api.getCurrentWorkspaceModel(), /No workspace selected/);
  assert.deepEqual(events, []);
  choice = { canceled: false, filePaths: [first] };
  assert.equal((await api.chooseWorkspaceFolder()).workspaceRoot, first);
  assert.deepEqual(await api.getCurrentWorkspaceModel(), { root: first });
  choice = { canceled: true, filePaths: [] };
  assert.equal((await api.chooseWorkspaceFolder()).workspaceRoot, first);
  choice = { canceled: false, filePaths: [path.join(root, "missing")] };
  await assert.rejects(api.chooseWorkspaceFolder());
  assert.equal((await api.getSelectedWorkspace()).workspaceRoot, first);
  assert.deepEqual(events, [["select", first], ["register", first]]);
  choice = { canceled: false, filePaths: [second] };
  const selected = await api.chooseWorkspaceFolder();
  assert.equal(selected.workspaceRoot, second);
  assert.equal(selected.evidenceGeneration, 3);
  assert.equal((await api.getSelectedWorkspace()).workspaceRoot, second);
  assert.equal((await api.clearSelectedWorkspace()).ok, false);
  assert.equal((await api.getSelectedWorkspace()).ok, false);
  assert.equal(settings.readSelectedWorkspace(userDataRoot).ok, false);
  await assert.rejects(api.getCurrentWorkspaceModel(), /No workspace selected/);
  assert.deepEqual(events, [
    ["select", first], ["register", first], ["select", second], ["detach"],
    ["register", second], ["clear"], ["detach"],
  ]);
});

test("compiled preload exposes workspace methods without unrestricted native access", () => {
  const { api } = mainPreloadHarness([], {});
  for (const method of ["getSelectedWorkspace", "chooseWorkspaceFolder", "clearSelectedWorkspace", "getAppInfo"]) {
    assert.equal(typeof api[method], "function", method);
  }
  for (const method of ["shell", "process", "fs", "require", "ipcRenderer"]) {
    assert.equal(Object.hasOwn(api, method), false, method);
  }
});

test("loaded workspace registry contains current visible labels", () => {
  const { visibleWorkspaceDefinitions } = require("../../dist/shared/workspaceContracts.js");
  const labels = visibleWorkspaceDefinitions.map((definition) => definition.label);
  assert.deepEqual(labels, [
    "Project Intake Capture", "Architect Interview", "Project Plan and Roadmap Review",
    "Phase Map", "Project Validation", "Project Close", "Phase Interview", "Phase Planning",
    "Work Card Map", "Work Card Intake", "Work Card Planning", "Implement", "Review & Validation",
    "Work Card Repair", "Work Card Validation", "Work Card Close", "Phase Validation", "Phase Close",
  ]);
  assert.equal(new Set(visibleWorkspaceDefinitions.map((definition) => definition.id)).size,
    visibleWorkspaceDefinitions.length);
});

test("empty workflow UI renders the exact neutral message", () => {
  const React = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  const { FigmaActionWorkspace } = require("../renderer/renderer-source-loader.cjs")
    .loadRendererSourceModule("src/renderer/app/App.tsx");
  const markup = renderToStaticMarkup(React.createElement(FigmaActionWorkspace, {
    activeWorkspaceId: "project-intake-capture", documentError: "", feedback: "",
    inputs: { defect: "", closureDecision: "Close", rationale: "", status: "Approved" },
    model: null, phaseAction: null, selectedDocument: null, selectedDocumentId: null,
    selectedSummary: null, workspaceGroups: [], workspaceOk: false,
    onChange() {}, onRun() {}, onSelectDocument() {}, onApplyPhaseDisposition() {}, onCreatePhaseCloseout() {},
  }));
  assert.match(markup, /Document workflow not yet implemented/);
});
