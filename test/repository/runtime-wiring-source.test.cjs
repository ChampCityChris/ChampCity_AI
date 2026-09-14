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

test("current Work Card close return carries the selected candidate through main and preload", () => {
  const mainSource = read("src/main/main.ts");
  const preloadSource = read("src/preload/index.ts");
  const contractSource = read("src/shared/workspaceContracts.ts");

  assert.match(
    mainSource,
    /currentWorkflow:generateCloseReturnNextIntakeHandoff[\s\S]*?candidateId: string[\s\S]*?generateCloseReturnNextIntakeHandoff\(getRequiredWorkspaceRoot\(\), candidateId\)/,
  );
  assert.match(
    preloadSource,
    /generateCloseReturnNextIntakeHandoff: \(candidateId\)[\s\S]*?currentWorkflow:generateCloseReturnNextIntakeHandoff[\s\S]*?candidateId/,
  );
  assert.match(
    contractSource,
    /generateCloseReturnNextIntakeHandoff: \(candidateId: string\) => Promise<RuntimeActionResult>/,
  );
});

test("Codex Implementer start IPC exposes no renderer permission options", () => {
  const mainSource = read("src/main/main.ts");
  const preloadSource = read("src/preload/index.ts");
  const contractSource = read("src/shared/workspaceContracts.ts");

  assert.doesNotMatch(contractSource, /interface CodexImplementerExecutionStartOptions/);
  assert.doesNotMatch(contractSource, /networkAccessEnabled\?: boolean/);
  assert.doesNotMatch(mainSource, /validateCodexImplementerStartOptions/);
  assert.match(mainSource, /codexImplementerExecutionService\.start\(getRequiredWorkspaceRoot\(\), undefined, selection\)/);
  assert.match(preloadSource, /startCodexImplementerExecution: \(selection\) =>/);
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
    /projectPlanning:(prepareHandoff|copyHandoff|review|save|submit)/,
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

test("FC06 Issue validation and Repair actions use the constrained main-preload-renderer path", () => {
  const mainSource = read("src/main/main.ts");
  const preloadSource = read("src/preload/index.ts");
  const rendererSource = read("src/renderer/app/App.tsx");
  const serviceSource = read("src/main/issueResolution/issueResolutionService.ts");

  for (const [channel, method] of [
    ["issueResolution:copyIssueFixCardAdvisoryReviewPrompt", "copyIssueFixCardAdvisoryReviewPrompt"],
    ["issueResolution:applyIssueFixCardValidationDecision", "applyIssueFixCardValidationDecision"],
    ["issueResolution:prepareIssueFixCardRepairHandoff", "prepareIssueFixCardRepairHandoff"],
    ["issueResolution:copyIssueFixCardRepairHandoff", "copyIssueFixCardRepairHandoff"],
  ]) {
    assert.match(mainSource, new RegExp(`ipcMain\\.handle\\(\\s*"${channel}"`), channel);
    assert.match(preloadSource, new RegExp(`${method}:`), method);
    assert.match(rendererSource, new RegExp(`window\\.champcity\\.${method}`), method);
  }
  assert.match(serviceSource, /artifactType: "validation-record"/);
  assert.match(serviceSource, /artifactType: "repair-work-card"/);
  assert.match(serviceSource, /implementationContractType: context\.implementationKind === "repair" \? "repair-work-card" : "fix-card"/);
  assert.match(serviceSource, /buildOperatorValidationAdvisoryPrompt/);
  for (const retired of [
    "prepareIssueFixCardArchitectReviewHandoff",
    "copyIssueFixCardArchitectReviewHandoff",
    "promoteIssueFixCardArchitectReviewDraft",
  ]) {
    assert.doesNotMatch(mainSource, new RegExp(retired));
    assert.doesNotMatch(preloadSource, new RegExp(retired));
    assert.doesNotMatch(rendererSource, new RegExp(retired));
  }
  assert.doesNotMatch(serviceSource, /writeFileSync\([^\n]*FIX_CARD_PLAN\.md/);
});

test("FC07 Issue Fix Card Close uses the constrained main-preload-renderer path", () => {
  const mainSource = read("src/main/main.ts");
  const preloadSource = read("src/preload/index.ts");
  const rendererSource = read("src/renderer/app/App.tsx");
  const serviceSource = read("src/main/issueResolution/issueResolutionService.ts");
  assert.match(mainSource, /ipcMain\.handle\(\s*"issueResolution:closeIssueFixCard"/);
  assert.match(preloadSource, /closeIssueFixCard:[\s\S]*?issueResolution:closeIssueFixCard/);
  assert.match(rendererSource, /window\.champcity\.closeIssueFixCard\(currentIssue\.issueId, "close-next"\)/);
  assert.match(rendererSource, /<IssueFixCardCloseWorkspace/);
  assert.match(serviceSource, /artifactType: "fix-card-close-record"/);
  assert.doesNotMatch(serviceSource, /ISSUE_001.*bootstrap|bootstrap.*ISSUE_001/i);
});

test("FC08 aggregate Issue Validation and FC09 Issue Close use distinct constrained main-preload-renderer paths", () => {
  const mainSource = read("src/main/main.ts");
  const preloadSource = read("src/preload/index.ts");
  const rendererSource = read("src/renderer/app/App.tsx");
  const workspaceSource = read("src/renderer/app/IssueValidationWorkspace.tsx");
  const closeWorkspaceSource = read("src/renderer/app/IssueCloseWorkspace.tsx");
  const serviceSource = read("src/main/issueResolution/issueResolutionService.ts");
  const contractsSource = read("src/shared/issueResolutionContracts.ts");

  for (const [channel, method] of [
    ["issueResolution:getIssueValidation", "getIssueValidationProjection"],
    ["issueResolution:applyIssueValidationDecision", "applyIssueValidationDecision"],
    ["issueResolution:getIssueClose", "getIssueCloseProjection"],
    ["issueResolution:closeIssue", "closeIssue"],
  ]) {
    assert.match(mainSource, new RegExp(`ipcMain\\.handle\\(\\s*"${channel}"`), channel);
    assert.match(preloadSource, new RegExp(`${method}:`), method);
    assert.match(rendererSource, new RegExp(`window\\.champcity\\.${method}`), method);
  }
  assert.match(rendererSource, /<IssueValidationWorkspace/);
  assert.match(rendererSource, /<IssueCloseWorkspace/);
  assert.match(workspaceSource, /Validate Issue Resolved/);
  assert.match(workspaceSource, /Request Further Corrective Work/);
  assert.match(serviceSource, /artifactType: "issue-validation-record"/);
  assert.match(serviceSource, /artifactType: "issue-close-record"/);
  assert.match(serviceSource, /ISSUE_VALIDATION_RECORD_\$\{issueId\}_ATTEMPT/);
  assert.match(contractsSource, /IssueValidationDecision = "ValidateResolved" \| "RequestCorrectiveWork"/);
  assert.match(contractsSource, /IssueCloseStatus/);
  assert.match(closeWorkspaceSource, /Close Issue/);
  assert.match(closeWorkspaceSource, /existing repository resolver/);
  assert.doesNotMatch(closeWorkspaceSource, /node:fs|require\(["']fs["']\)|localStorage/);
  assert.match(rendererSource, /window\.champcity\.closeIssue\(currentIssue\.issueId, input\)[\s\S]*?returnToWorkflowHub\(\)/);
  assert.doesNotMatch(contractsSource, /IssueFixCardLoopStepId[\s\S]{0,180}"issue-validation"/);
});
