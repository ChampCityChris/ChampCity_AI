const assert = require("node:assert/strict");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const test = require("node:test");
const { loadRendererSourceModule } = require("./renderer-source-loader.cjs");

const { WorkIntakeWorkspace } = loadRendererSourceModule("src/renderer/app/WorkIntakeWorkspace.tsx");
const { WorkIntakeRoutingRail } = loadRendererSourceModule("src/renderer/app/WorkIntakeRoutingRail.tsx");
const { shouldAttachArchitectSurface } = loadRendererSourceModule("src/renderer/app/architectSurfaceEligibility.ts");

function withState(values, render) {
  const original = React.useState;
  let index = 0;
  React.useState = (initial) => [index < values.length ? values[index++] : initial, () => undefined];
  try { return render(); } finally { React.useState = original; }
}

test("saved Intake is a capture confirmation without a child routing lifecycle", () => {
  const saved = { intakeId: "intake-1", workRequest: "Improve navigation", branchBinding: { workBranch: "work/1", baseBranch: "dev" } };
  const projection = { project: null, suggestedBase: null, suggestedProjectName: "Project", branches: [], currentIntake: saved };
  const markup = renderToStaticMarkup(withState([{}, saved, "", false], () =>
    WorkIntakeWorkspace({ projection, onReturn() {}, async onSaved() {} })));
  assert.match(markup, /Work Intake saved/);
  assert.doesNotMatch(markup, /Advisory routing assessment|Operator route decision|Route planning/);
});

test("routed rail has exact stage order and explains blocked stages", () => {
  const ids = ["intake", "routing", "assessment", "plan", "execution", "integration"];
  const labels = ["Intake", "Routing", "Architect Assessment", "Plan", "Execution", "Integration"];
  const projection = { intakeId: "intake-1", requiredStageId: "routing", selectedRouteId: null,
    stages: ids.map((stageId, index) => ({ stageId, label: labels[index], available: index < 2,
      reason: index < 2 ? "Available" : `Blocked ${labels[index]}`, requiresArchitect: index > 0 && index < 4 })) };
  const markup = renderToStaticMarkup(React.createElement(WorkIntakeRoutingRail, { projection, activeStageId: "routing", onStageChange() {} }));
  assert.deepEqual([...markup.matchAll(/<strong>\d\d ([^<]+)<\/strong>/g)].map((match) => match[1]), labels);
  assert.match(markup, /Blocked Architect Assessment/);
  assert.match(markup, /disabled=""/);
});

test("Architect attachment follows available routed stages and preserves Development and Issue cases", () => {
  const base = { paneVisible: true, developmentForeground: false, developmentBrowserAvailable: false,
    workCardRepair: false, issueForeground: false, issueStageId: "intake", issueFixCardStepId: "fix-card-map",
    workIntakeForeground: true, workIntakeStageId: "routing", workIntakeNavigation: { stages: [
      { stageId: "routing", available: true, requiresArchitect: true },
      { stageId: "execution", available: true, requiresArchitect: false },
    ] } };
  assert.equal(shouldAttachArchitectSurface(base), true);
  assert.equal(shouldAttachArchitectSurface({ ...base, workIntakeStageId: "execution" }), false);
  assert.equal(shouldAttachArchitectSurface({ ...base, workIntakeStageId: "intake" }), false);
  assert.equal(shouldAttachArchitectSurface({ ...base, paneVisible: false }), false);
  assert.equal(shouldAttachArchitectSurface({ ...base, workIntakeForeground: false, developmentForeground: true,
    developmentBrowserAvailable: true }), true);
  assert.equal(shouldAttachArchitectSurface({ ...base, workIntakeForeground: false, issueForeground: true,
    issueStageId: "architect-planning" }), true);
});

test("navigation service unlocks only stages backed by current owner evidence", async (t) => {
  const { seedPreparedRoutedWorkIntake } = require("../support/work-intake-fixtures.cjs");
  const fixture = seedPreparedRoutedWorkIntake(t, "feature-change");
  const { getWorkIntakeNavigation } = require("../../dist/main/workIntake/workIntakeNavigationService.js");
  const navigation = await getWorkIntakeNavigation(fixture.root, fixture.intake.intakeId);
  assert.equal(navigation.requiredStageId, "assessment");
  assert.equal(navigation.selectedRouteId, "feature-change");
  assert.deepEqual(navigation.stages.filter((stage) => stage.available).map((stage) => stage.stageId),
    ["intake", "routing", "assessment"]);
  assert.equal(navigation.execution, null);
});
