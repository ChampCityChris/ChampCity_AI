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

test("workspace migration remains dormant outside the normal lifecycle renderer", () => {
  const mainSource = read("src/main/main.ts");
  const preloadSource = read("src/preload/index.ts");
  const rendererSource = read("src/renderer/app/App.tsx");

  assert.match(mainSource, /ipcMain\.handle\("workspaceMigration:preview"/);
  assert.match(mainSource, /ipcMain\.handle\("workspaceMigration:apply"/);
  assert.match(preloadSource, /previewWorkspaceMigration:/);
  assert.match(preloadSource, /applyWorkspaceMigration:/);
  assert.doesNotMatch(rendererSource, /Workspace Migration Required/);
  assert.doesNotMatch(rendererSource, /Preview Migration/);
  assert.doesNotMatch(rendererSource, /Migrate Workspace/);
  assert.doesNotMatch(rendererSource, /await refreshMigrationPreview\(\{ quiet: true \}\)/);
});

test("Project Planning exposes dedicated handoff, copy, model, and bundle review actions", () => {
  const mainSource = read("src/main/main.ts");
  const preloadSource = read("src/preload/index.ts");
  const rendererSource = read("src/renderer/app/App.tsx");

  for (const channel of [
    "projectPlanning:getModel",
    "projectPlanning:prepareHandoff",
    "projectPlanning:copyHandoff",
    "projectPlanning:reviewBundle",
  ]) {
    assert.match(mainSource, new RegExp(`ipcMain\\.handle\\(\\s*"${channel}"`), channel);
  }
  for (const method of [
    "getProjectPlanningWorkspaceModel",
    "prepareProjectPlanningHandoff",
    "copyProjectPlanningHandoff",
    "reviewProjectPlanningBundle",
  ]) {
    assert.match(preloadSource, new RegExp(`${method}:`), method);
    assert.match(rendererSource, new RegExp(`window\\.champcity\\.${method}\\(`), method);
  }
  assert.match(rendererSource, /Prepare Project Planning Handoff/);
  assert.match(rendererSource, /Copy Project Planning Handoff/);
  assert.match(rendererSource, /Refresh Planning Outputs/);
  assert.doesNotMatch(rendererSource, /Project Profile Markdown/);
  assert.doesNotMatch(rendererSource, /Project Roadmap Markdown/);
  assert.doesNotMatch(mainSource, /projectPlanning:saveOutputs/);
  assert.doesNotMatch(preloadSource, /saveProjectPlanningOutputs/);
  assert.doesNotMatch(rendererSource, /saveProjectPlanningOutputs/);
});

test("Phase Map exposes MCP handoff submission without manual import wiring", () => {
  const mainSource = read("src/main/main.ts");
  const preloadSource = read("src/preload/index.ts");
  const rendererSource = read("src/renderer/app/App.tsx");
  const phaseMapSource = read("src/main/phaseMap/phaseMapService.ts");

  assert.match(mainSource, /ipcMain\.handle\("phaseMap:copyHandoff"/);
  assert.match(preloadSource, /copyPhaseMapHandoff:/);
  assert.match(rendererSource, /window\.champcity\.copyPhaseMapHandoff\(\)/);
  assert.match(rendererSource, /Prepare Phase Map Handoff/);
  assert.match(rendererSource, /Copy Phase Map Handoff/);
  assert.match(phaseMapSource, /submit_handoff_outputs/);
  assert.match(phaseMapSource, /Current Approved Project Profile/);
  assert.match(phaseMapSource, /Current Approved Project Roadmap/);
  assert.match(phaseMapSource, /Generated Phase Map handoff/);
  assert.match(phaseMapSource, /Exact Phase Map output target/);
  assert.doesNotMatch(mainSource, /phaseMap:saveHandoff/);
  assert.doesNotMatch(mainSource, /phaseMap:saveOutput/);
  assert.doesNotMatch(preloadSource, /savePhaseMapHandoff/);
  assert.doesNotMatch(preloadSource, /savePhaseMapOutput/);
  assert.doesNotMatch(rendererSource, /savePhaseMapOutput/);
  assert.doesNotMatch(rendererSource, /Phase Map Markdown/);
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
  assert.doesNotMatch(rendererSource, /specialized action authority instead of generic single-document disposition/);
});

test("Architect Interview renderer has no manual output import fallback", () => {
  const rendererSource = read("src/renderer/app/App.tsx");

  assert.doesNotMatch(rendererSource, /function ArchitectOutputImport/);
  assert.doesNotMatch(rendererSource, /<ArchitectOutputImport/);
  assert.doesNotMatch(rendererSource, /architectOutputMarkdown/);
  assert.doesNotMatch(rendererSource, /Paste substantive Architect Markdown/);
  assert.doesNotMatch(rendererSource, /Paste the substantive Markdown produced in the embedded Architect chat/);
});

test("active production prompts use unified submit_handoff_outputs instead of retired MCP save actions", () => {
  const promptedSources = [
    read("src/main/projectIntake/projectIntakeService.ts"),
    read("src/main/architectInterview/architectInterviewService.ts"),
    read("src/main/projectPlanning/projectPlanningService.ts"),
    read("src/main/phaseMap/phaseMapService.ts"),
  ].join("\n");

  assert.match(promptedSources, /submit_handoff_outputs/);
  assert.doesNotMatch(promptedSources, /save_architect_interview_output/);
  assert.doesNotMatch(promptedSources, /save_project_planning_outputs/);
  assert.doesNotMatch(promptedSources, /write_markdown_artifact/);
});

test("Project Intake submission service can bind writes to an active repository root", () => {
  const fs = require("node:fs");
  const os = require("node:os");
  const {
    submitProjectIntakeForRepository,
  } = require("../../dist/main/projectIntake/projectIntakeService.js");
  const activeRoot = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-active-root-"));
  const submittedRoot = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-submitted-root-"));

  const result = submitProjectIntakeForRepository(activeRoot, {
    projectName: "Bounded Active Root",
    projectPurpose: "Verify the main-owned root controls writes.",
    desiredOutcome: "Submitted renderer paths cannot redirect Project Intake output.",
    projectType: "Desktop application",
    projectRepository: submittedRoot,
    hasExistingSourceOrPlanning: false,
    knownConstraints: "",
    repositoryReviewContext: "",
  });

  assert.equal(result.projectRoot, path.resolve(activeRoot));
  assert.equal(fs.existsSync(path.join(activeRoot, result.projectIntakeMarkdownPath)), true);
  assert.equal(fs.existsSync(path.join(activeRoot, result.projectIntakeMarkdownPath.replace(/\.md$/, ".json"))), false);
  assert.equal(fs.existsSync(path.join(submittedRoot, "planning")), false);
});
