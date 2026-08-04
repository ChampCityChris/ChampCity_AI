const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const componentSourcePath = path.join(__dirname, "..", "..", "src", "renderer", "app", "WorkCardBuildingReviewWorkspace.tsx");
const appSourcePath = path.join(__dirname, "..", "..", "src", "renderer", "app", "App.tsx");
const stylesSourcePath = path.join(__dirname, "..", "..", "src", "renderer", "styles.css");

test("Build workspace presents report target, run controls, and terminal retry summary without report review controls", () => {
  const source = fs.readFileSync(componentSourcePath, "utf8");

  assert.match(source, /Implementer Report Target/);
  assert.match(source, /Create Implementer Report/);
  assert.match(source, /Run Codex Implementer/);
  assert.match(source, /Cancel Codex Run/);
  assert.match(source, /LastRunSummary/);
  assert.match(source, /canRunAgain/);
  assert.match(source, /retryBlocker/);
  assert.match(source, /Codex execution console/);
  assert.match(source, /Review the existing Implementer Report in Review & Validation/);
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
  assert.match(appSource, /window\.champcity\.cancelCodexImplementerExecution\(\)/);
});
