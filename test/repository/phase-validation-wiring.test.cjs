const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

test("Phase Validation projection read crosses shared, preload, and main boundaries", () => {
  const contracts = read("src/shared/workspaceContracts.ts");
  const preload = read("src/preload/index.ts");
  const main = read("src/main/main.ts");

  assert.match(contracts, /export interface PhaseValidationActionProjection/);
  assert.match(
    contracts,
    /getPhaseValidationActionProjection: \(\) => Promise<PhaseValidationActionProjection>/,
  );
  assert.match(
    preload,
    /getPhaseValidationActionProjection: \(\) =>[\s\S]*?"currentWorkflow:getPhaseValidationActionProjection"/,
  );
  assert.match(
    main,
    /ipcMain\.handle\("currentWorkflow:getPhaseValidationActionProjection"[\s\S]*?getPhaseValidationActionProjection\(getRequiredWorkspaceRoot\(\)\)/,
  );
});

test("validated Phase Validation disposition target propagates renderer to FC01 main state", () => {
  const renderer = read("src/renderer/app/App.tsx");
  const preload = read("src/preload/index.ts");
  const main = read("src/main/main.ts");
  const service = read("src/main/currentWorkflow/currentWorkflowService.ts");

  const rendererDisposition = renderer.slice(
    renderer.indexOf("async function applyCurrentPhaseCloseoutDisposition"),
    renderer.indexOf("async function refreshWorkCardCloseProjection"),
  );
  assert.match(rendererDisposition, /phaseValidationAction\.workspaceId/);
  assert.match(
    rendererDisposition,
    /window\.champcity\.applyCurrentDisposition\([\s\S]*?phaseValidationAction\.workspaceId/,
  );
  assert.match(
    preload,
    /applyCurrentDisposition: \(status, operatorReviewNotes, targetWorkspaceId\) =>[\s\S]*?"currentWorkflow:applyDisposition"[\s\S]*?targetWorkspaceId/,
  );
  assert.match(
    main,
    /"currentWorkflow:applyDisposition"[\s\S]*?targetWorkspaceId\?: WorkspaceId[\s\S]*?applyCurrentDisposition\(getRequiredWorkspaceRoot\(\), status, operatorReviewNotes, targetWorkspaceId\)/,
  );
  assert.match(service, /const dispositionWorkspaceId = targetWorkspaceId \?\? model\.activeWorkspaceId/);
  assert.match(service, /case "phase-validation"[\s\S]*?getPhaseValidationActionProjection\(workspaceRoot\)/);
  assert.match(service, /case "phase-close":[\s\S]*?cannot bypass the Phase Validation disposition/);
});

test("Phase Validation mutations return refreshed FC01 action evidence", () => {
  const service = read("src/main/currentWorkflow/currentWorkflowService.ts");
  const createSource = service.slice(
    service.indexOf("export function createPhaseCloseoutForCurrentPhase"),
    service.indexOf("export function getPhaseValidationActionProjection"),
  );
  const dispositionSource = service.slice(
    service.indexOf("export function applyCurrentDisposition"),
    service.indexOf("export function createRepairForCurrentFailure"),
  );

  assert.match(createSource, /getPhaseValidationActionProjection\(workspaceRoot, refreshedContext\)/);
  assert.match(createSource, /phaseAction: refreshedAction/);
  assert.match(dispositionSource, /phaseValidationActionFromCloseProjection/);
  assert.match(dispositionSource, /phaseAction:/);
});
