const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const componentSourcePath = path.join(__dirname, "..", "..", "src", "renderer", "app", "WorkCardBuildingReviewWorkspace.tsx");
const appSourcePath = path.join(__dirname, "..", "..", "src", "renderer", "app", "App.tsx");
const stylesSourcePath = path.join(__dirname, "..", "..", "src", "renderer", "styles.css");
const compiledContractsPath = path.join(__dirname, "..", "..", "dist", "shared", "workspaceContracts.js");

test("Build workspace presents report target, run controls, and terminal retry summary without report review controls", () => {
  const source = fs.readFileSync(componentSourcePath, "utf8");

  assert.match(source, /Implementer Report Target/);
  assert.match(source, /Create Implementer Report/);
  assert.match(source, /Run Codex Implementer/);
  assert.match(source, /Cancel Codex Run/);
  assert.doesNotMatch(source, /Allow network for this Codex run/);
  assert.doesNotMatch(source, /package or dependency downloads/);
  assert.match(source, /LastRunSummary/);
  assert.match(source, /DevelopmentEnvironmentStatus/);
  assert.match(source, /Development environment preflight status/);
  assert.match(source, /Work Card implementation has not started/);
  assert.match(source, /Resolve Environment/);
  assert.match(source, /Command evidence/);
  assert.match(source, /stageForRequirement/);
  assert.match(source, /canRunAgain/);
  assert.match(source, /canResolveEnvironment/);
  assert.match(source, /retryBlocker/);
  assert.match(source, /Codex execution console/);
  assert.match(source, /CodexUserInputPanel/);
  assert.match(source, /CodexMcpElicitationPanel/);
  assert.match(source, /MCP Input/);
  assert.match(source, /RuntimeDiagnostics/);
  assert.match(source, /capability\.details\.join/);
  assert.match(source, /Approval Tail/);
  assert.match(source, /Runtime Denial Tail/);
  assert.match(source, /Review the existing Implementer Report in Review & Validation/);
  assert.match(source, /Environment Resolution completed\. Work Card implementation has not run yet\./);
  assert.match(source, /Work Card implementation is now eligible to start\./);
  assert.match(source, /Environment preparation remains incomplete:/);
  assert.match(source, /execution\?\.executionKind === "environment-resolution"/);
  assert.doesNotMatch(source, /Apply Review/);
  assert.doesNotMatch(source, /Review Notes/);
  assert.doesNotMatch(source, /Select a document/);
  assert.doesNotMatch(source, /Document workflow not yet implemented/);
});

test("Build workspace uses dedicated two-pane proportions and keeps Codex console visible", () => {
  const styles = fs.readFileSync(stylesSourcePath, "utf8");
  const buildRule = styles.match(/\.work-card-building-workspace\s*\{(?<body>[^}]*)\}/);
  const consoleRules = [...styles.matchAll(/\.codex-execution-panel\s*\{(?<body>[^}]*)\}/g)];

  assert.ok(buildRule);
  assert.match(buildRule.groups.body, /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(buildRule.groups.body, /height:\s*auto/);
  assert.ok(consoleRules.length > 0);
  assert.equal(consoleRules.some((rule) => /overflow:\s*auto/.test(rule.groups.body)), true);
});

test("Build workspace maps typed development-environment interactions to distinct labels", () => {
  const source = fs.readFileSync(componentSourcePath, "utf8");

  assert.match(source, /humanInteractionKind/);
  assert.match(source, /windows-permission/);
  assert.match(source, /restart-required/);
  assert.match(source, /Windows permission required\./);
  assert.match(source, /Windows restart required\./);
  assert.match(source, /Windows permission and restart required\./);
  assert.doesNotMatch(source, /humanInteractionReason[\s\S]{0,120}restart-required/);
  assert.doesNotMatch(source, /Windows permission required\.\.\./);
});

test("Build workspace availability distinguishes unavailable preflight retry from Codex readiness", () => {
  const { codexImplementerAvailabilityLabel } = require(compiledContractsPath);

  assert.equal(codexImplementerAvailabilityLabel({
    state: "unavailable",
    canRunAgain: true,
  }), "Unavailable");
  assert.equal(codexImplementerAvailabilityLabel({
    state: "ready",
    canRunAgain: true,
  }), "Ready");
  assert.equal(codexImplementerAvailabilityLabel({
    state: "running",
    canRunAgain: false,
  }), "Ready");
  assert.equal(codexImplementerAvailabilityLabel(null), "Unavailable");
});

test("App routes Implementer Build through dedicated Codex workspace without generic action and document surfaces", () => {
  const appSource = fs.readFileSync(appSourcePath, "utf8");

  assert.match(appSource, /<WorkCardBuildingReviewWorkspace/);
  assert.match(appSource, /activeWorkspaceId === "work-card-building-review"/);
  assert.match(appSource, /!isWorkCardBuildingReview &&\s*!isWorkCardReportReview &&\s*!isVisibleArchitectOutputWorkspace/);
  assert.match(appSource, /const isFigmaActionWorkspace =/);
  assert.match(appSource, /<FigmaActionWorkspace/);
  assert.match(appSource, /!isWorkCardPlanningPreparation &&\s*!isWorkCardBuildingReview &&\s*!isWorkCardReportReview &&\s*!isFigmaActionWorkspace/);
  assert.match(appSource, /window\.champcity\.generateCurrentHandoff\(\)/);
  assert.match(appSource, /window\.champcity\.startCodexImplementerExecution\(\)/);
  assert.match(appSource, /window\.champcity\.startCodexEnvironmentResolution\(\)/);
  assert.match(appSource, /window\.champcity\.cancelCodexImplementerExecution\(\)/);
  assert.match(appSource, /window\.champcity\.respondToCodexUserInput\(/);
  assert.match(appSource, /window\.champcity\.respondToCodexMcpElicitation\(/);
});

test("App does not pass renderer permission options into Codex execution", () => {
  const appSource = fs.readFileSync(appSourcePath, "utf8");

  assert.doesNotMatch(appSource, /allowNetworkForCodexRun/);
  assert.doesNotMatch(appSource, /networkAccessEnabled:/);
  assert.match(appSource, /window\.champcity\.startCodexImplementerExecution\(\)/);
  assert.match(appSource, /window\.champcity\.startCodexEnvironmentResolution\(\)/);
  assert.doesNotMatch(appSource, /workspace-settings\.json/);
  assert.doesNotMatch(appSource, /sandboxMode:/);
  assert.doesNotMatch(appSource, /approvalPolicy:/);
});

test("App Implement workspace navigation effect polls status without auto-starting Codex", () => {
  const appSource = fs.readFileSync(appSourcePath, "utf8");
  const statusEffect = appSource.match(
    /useEffect\(\(\) => \{[\s\S]*?window\.champcity\.getCodexImplementerExecutionStatus\(\)[\s\S]*?\}, \[activeWorkspaceId, workspace\.ok, codexExecution\?\.state\]\);/,
  );

  assert.ok(statusEffect);
  assert.match(statusEffect[0], /activeWorkspaceId !== "work-card-building-review"/);
  assert.match(statusEffect[0], /void refreshStatus\(\)/);
  assert.match(statusEffect[0], /window\.setInterval/);
  assert.doesNotMatch(statusEffect[0], /startCodexImplementerExecution/);
  assert.doesNotMatch(statusEffect[0], /startCodexEnvironmentResolution/);
});
