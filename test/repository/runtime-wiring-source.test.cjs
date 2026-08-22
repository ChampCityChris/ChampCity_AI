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
    ["currentWorkflow:getWorkCardMapProjection", "getWorkCardMapProjection"],
    ["currentWorkflow:beginWorkCardPlanning", "beginWorkCardPlanning"],
    ["currentWorkflow:getCloseProjection", "getCurrentCloseProjection"],
    ["currentWorkflow:getRepairWorkspaceProjection", "getCurrentRepairWorkspaceProjection"],
    ["codexImplementer:getStatus", "getCodexImplementerExecutionStatus"],
    ["codexImplementer:start", "startCodexImplementerExecution"],
    ["codexImplementer:cancel", "cancelCodexImplementerExecution"],
    ["codexImplementer:respondToUserInput", "respondToCodexUserInput"],
    ["codexImplementer:respondToMcpElicitation", "respondToCodexMcpElicitation"],
    ["currentWorkflow:applyDisposition", "applyCurrentDisposition"],
    ["currentWorkflow:copyAdvisoryReviewPrompt", "copyCurrentWorkCardAdvisoryReviewPrompt"],
    ["currentWorkflow:applyOperatorValidationDecision", "applyOperatorValidationDecisionForCurrentWorkCard"],
    ["currentWorkflow:createRepair", "createRepairForCurrentFailure"],
    ["currentWorkflow:createValidationAttempt", "createValidationAttemptForCurrentWorkCard"],
    ["currentWorkflow:createPhaseCloseout", "createPhaseCloseoutForCurrentPhase"],
    ["currentWorkflow:createProjectCloseout", "createProjectCloseoutForCurrentProject"],
  ];

  for (const [channel, method] of contracts) {
    assert.match(mainSource, new RegExp(`ipcMain\\.handle\\(\\s*"${channel}"`), channel);
    assert.match(preloadSource, new RegExp(`${method}:`), method);
    assert.match(rendererSource, new RegExp(`window\\.champcity\\.${method}\\(`), method);
  }
});

test("Codex Implementer start IPC exposes no renderer permission options", () => {
  const mainSource = read("src/main/main.ts");
  const preloadSource = read("src/preload/index.ts");
  const contractSource = read("src/shared/workspaceContracts.ts");

  assert.doesNotMatch(contractSource, /interface CodexImplementerExecutionStartOptions/);
  assert.doesNotMatch(contractSource, /networkAccessEnabled\?: boolean/);
  assert.doesNotMatch(mainSource, /validateCodexImplementerStartOptions/);
  assert.match(mainSource, /codexImplementerExecutionService\.start\(getRequiredWorkspaceRoot\(\)\)/);
  assert.match(preloadSource, /startCodexImplementerExecution: \(\) =>/);
  assert.doesNotMatch(preloadSource, /"codexImplementer:start",\s*options,/);
});

test("one generic Architect-output IPC and preload contract serves all catalog workspaces", () => {
  const mainSource = read("src/main/main.ts");
  const preloadSource = read("src/preload/index.ts");
  const rendererSource = read("src/renderer/app/App.tsx");

  for (const channel of [
    "architectOutput:getWorkspaceModel",
    "architectOutput:prepareHandoff",
    "architectOutput:copyHandoff",
    "architectOutput:review",
  ]) {
    assert.match(mainSource, new RegExp(`ipcMain\\.handle\\(\\s*"${channel}"`), channel);
  }
  for (const method of [
    "getArchitectOutputWorkspaceModel",
    "prepareArchitectOutputHandoff",
    "copyArchitectOutputHandoff",
    "prepareArchitectInterviewFinalDraftHandoff",
    "copyArchitectInterviewFinalDraftHandoff",
    "preparePhaseInterviewFinalDraftHandoff",
    "copyPhaseInterviewFinalDraftHandoff",
    "reviewArchitectOutput",
  ]) {
    assert.match(preloadSource, new RegExp(`${method}:`), method);
    assert.match(rendererSource, new RegExp(`window\\.champcity\\.${method}`), method);
  }
  for (const channel of [
    "architectInterview:prepareFinalDraftHandoff",
    "architectInterview:copyFinalDraftHandoff",
    "phaseInterview:prepareFinalDraftHandoff",
    "phaseInterview:copyFinalDraftHandoff",
  ]) {
    assert.match(mainSource, new RegExp(`ipcMain\\.handle\\(\\s*"${channel}"`), channel);
  }

  for (const retired of [
    /architectInterview:save/,
    /architectInterview:submit/,
    /projectPlanning:/,
    /phaseInterview:(save|submit|saveOutput)/,
    /phasePlanning:/,
    /phaseMap:copyHandoff/,
    /workCardPlanning:saveOutput/,
    /workCardRepair:saveOutput/,
  ]) {
    assert.doesNotMatch(mainSource, retired);
    assert.doesNotMatch(preloadSource, retired);
  }
});

test("production Architect-output catalog activates seven definitions and nine slots", () => {
  const catalogSource = read("src/main/architectOutputs/productionArchitectOutputCatalog.ts");
  const runtimeSource = read("src/main/architectOutputs/architectOutputRuntimeService.ts");
  const workspaceSource = read("src/main/architectOutputs/architectOutputWorkspaceService.ts");

  for (const outputKind of [
    "project-architect-interview",
    "project-planning",
    "phase-map",
    "phase-interview",
    "phase-planning-bundle",
    "formal-work-card",
    "repair-work-card",
  ]) {
    assert.match(catalogSource, new RegExp(`outputKind: "${outputKind}"`), outputKind);
  }
  for (const workspaceId of [
    "architect-interview",
    "project-planning-review",
    "project-phase-map",
    "phase-interview",
    "phase-planning-bundle",
    "work-card-planning",
    "work-card-repair",
  ]) {
    assert.match(catalogSource, new RegExp(`owningWorkspaceId: "${workspaceId}"`), workspaceId);
  }
  assert.match(catalogSource, /formalWorkCardArchitectOutputDefinition/);
  assert.match(catalogSource, /repairWorkCardArchitectOutputDefinition/);
  assert.match(catalogSource, /productionArchitectOutputRegistry = createArchitectOutputRegistry\(activeDefinitions\)/);
  assert.match(runtimeSource, /const activeSubmissionByRuntimeKey = new Map/);
  assert.match(runtimeSource, /const requestOrdinalByRuntimeKey = new Map/);
  assert.match(workspaceSource, /reviewArchitectOutput/);
  assert.match(workspaceSource, /writeCanonicalMarkdownDocuments/);
});

test("retired direct-save and manual-import product surfaces are absent", () => {
  const mainSource = read("src/main/main.ts");
  const preloadSource = read("src/preload/index.ts");
  const rendererSource = read("src/renderer/app/App.tsx");

  for (const retired of [
    /saveFormalWorkCardOutput/,
    /saveRepairWorkCardOutput/,
    /LifecycleArchitectOutputImport/,
    /Save Architect Output/,
    /formalWorkCardMarkdown/,
    /repairWorkCardMarkdown/,
  ]) {
    assert.doesNotMatch(mainSource, retired);
    assert.doesNotMatch(preloadSource, retired);
    assert.doesNotMatch(rendererSource, retired);
  }
});
