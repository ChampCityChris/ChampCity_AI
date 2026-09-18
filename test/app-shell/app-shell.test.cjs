const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "../..");

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

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

test("main workspace IPC wiring uses only session-active selection", () => {
  const mainSource = readText(path.join(repoRoot, "src/main/main.ts"));

  assert.equal(mainSource.includes("readSelectedWorkspace"), false);
  assert.match(mainSource, /return sessionActiveWorkspace\.requireWorkspaceRoot\(\);/);
  assert.match(mainSource, /return sessionActiveWorkspace\.currentSelection\(\);/);
  assert.match(mainSource, /return sessionActiveWorkspace\.retainCurrentSelection\(\);/);
  assert.match(
    mainSource,
    /sessionActiveWorkspace\.activateFromValidation\([\s\S]*?\(\) => detachArchitectBrowserSurface\(\)/,
  );
  assert.match(
    mainSource,
    /sessionActiveWorkspace\.deactivate\(deactivateSelectedWorkspaceRuntime\);/,
  );
  assert.match(mainSource, /selectedWorkspaceEvidenceNotifier\.selectWorkspace\(selection\.workspaceRoot\)/);
  assert.match(mainSource, /selectedWorkspaceEvidenceNotifier\.clear\(\)/);
});

test("preload exposes only approved methods", () => {
  const preloadSource = readText(path.join(repoRoot, "dist/preload/index.js"));
  const approvedMethods = [
    "getSelectedWorkspace",
    "chooseWorkspaceFolder",
    "clearSelectedWorkspace",
    "getAppInfo",
  ];

  for (const method of approvedMethods) {
    assert.match(preloadSource, new RegExp(`${method}:`));
  }

  assert.equal(preloadSource.includes("exposeInMainWorld(\"champcity\""), true);
  assert.equal(preloadSource.includes("shell"), false);
  assert.equal(preloadSource.includes("process:"), false);
});

test("workspace registry contains current visible labels", () => {
  const rendererSource = readText(path.join(repoRoot, "src/shared/workspaceContracts.ts"));
  const labels = [
    "Project Plan and Roadmap Review",
    "Phase Map",
    "Project Validation",
    "Project Close",
    "Phase Interview",
    "Phase Planning",
    "Work Card Map",
    "Work Card Intake",
    "Work Card Planning",
    "Implement",
    "Review & Validation",
    "Work Card Repair",
    "Work Card Validation",
    "Work Card Close",
    "Phase Validation",
    "Phase Close",
  ];

  for (const label of labels) {
    assert.equal(rendererSource.includes(label), true, label);
  }

  assert.equal(rendererSource.includes("createWorkspaceRegistry"), true);
});

test("renderer contains the exact neutral message", () => {
  const appSource = readText(path.join(repoRoot, "src/renderer/app/App.tsx"));
  assert.equal(appSource.includes("Document workflow not yet implemented"), true);
});
