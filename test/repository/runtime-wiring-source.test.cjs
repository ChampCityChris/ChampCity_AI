const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "../..");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("main, preload, and renderer expose evidence-derived current workflow actions", () => {
  const mainSource = read("src/main/main.ts");
  const preloadSource = read("src/preload/index.ts");
  const rendererSource = read("src/renderer/app/App.tsx");

  const contracts = [
    ["currentWorkflow:getModel", "getCurrentWorkspaceModel"],
    ["currentWorkflow:generateHandoff", "generateCurrentHandoff"],
    ["currentWorkflow:applyDisposition", "applyCurrentDisposition"],
    ["currentWorkflow:createRepair", "createRepairForCurrentFailure"],
    ["currentWorkflow:createValidationAttempt", "createValidationAttemptForCurrentWorkCard"],
    ["currentWorkflow:createPhaseCloseout", "createPhaseCloseoutForCurrentPhase"],
    ["currentWorkflow:createProjectCloseout", "createProjectCloseoutForCurrentProject"],
  ];

  for (const [channel, method] of contracts) {
    assert.match(mainSource, new RegExp(`ipcMain\\.handle\\("${channel}"`), channel);
    assert.match(preloadSource, new RegExp(`${method}:`), method);
    assert.match(rendererSource, new RegExp(`window\\.champcity\\.${method}\\(`), method);
  }
  assert.doesNotMatch(preloadSource, /setFormalWorkCardDisposition: \(phaseId, workCardId/);
  assert.doesNotMatch(rendererSource, /Create Implementer Report Shell/);
  assert.doesNotMatch(rendererSource, /Evidence Path/);
});

test("renderer disables generic disposition for specialized authority workspaces", () => {
  const rendererSource = read("src/renderer/app/App.tsx");

  for (const workspaceId of [
    "project-planning-review",
    "phase-planning-bundle",
    "work-card-validation",
    "phase-validation",
    "project-validation",
    "project-close",
  ]) {
    assert.match(rendererSource, new RegExp(`"${workspaceId}"`), workspaceId);
  }
  assert.match(rendererSource, /specializedDispositionWorkspaceIds\.has\(activeWorkspaceId\)/);
  assert.match(rendererSource, /specialized action authority instead of generic single-document disposition/);
});

test("Project Intake submission is bound to the main-owned repository selection", () => {
  const mainSource = read("src/main/main.ts");
  const contractSource = read("src/shared/workspaceContracts.ts");

  assert.match(contractSource, /selectionReference: "selected-project-repository"/);
  assert.match(mainSource, /let selectedProjectRepositoryRoot: string \| null = null/);
  assert.match(mainSource, /Project repository must be selected through the main-process folder chooser/);
  assert.match(mainSource, /projectRepository: selectedProjectRepositoryRoot/);
});
