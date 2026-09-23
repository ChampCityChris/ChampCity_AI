const assert = require("node:assert/strict");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const test = require("node:test");
const { loadRendererSourceModule } = require("./renderer-source-loader.cjs");

const { RoutedExecutionPanel } = loadRendererSourceModule("src/renderer/app/RoutedExecutionPanel.tsx");
const { seedResearchIntegrationCompletion } = require("../support/research-integration-scenarios.cjs");

function withHooks(values, render) {
  const originalState = React.useState;
  const originalEffect = React.useEffect;
  let index = 0;
  React.useState = (initial) => [index < values.length ? values[index++] : initial, () => undefined];
  React.useEffect = () => undefined;
  try { return render(); }
  finally { React.useState = originalState; React.useEffect = originalEffect; }
}

test("approved Research assessment navigates directly to Integration without Plan or Execution", async (t) => {
  const fixture = seedResearchIntegrationCompletion(t);
  const { getWorkIntakeNavigation } = require("../../dist/main/workIntake/workIntakeNavigationService.js");
  const navigation = await getWorkIntakeNavigation(fixture.root, fixture.intake.intakeId);
  assert.equal(navigation.requiredStageId, "integration");
  assert.deepEqual(navigation.stages.filter((stage) => stage.available).map((stage) => stage.stageId),
    ["intake", "routing", "assessment", "integration"]);
  assert.equal(navigation.stages.find((stage) => stage.stageId === "plan").available, false);
  assert.equal(navigation.stages.find((stage) => stage.stageId === "execution").available, false);
});

test("Routed execution presents Research integration wording and preserves Plan wording", () => {
  const research = { intakeId: "intake-fixture", route: "research-prototype", workBranch: "work-intake/research", targetBranch: "main", actions: ["integrate"], reasons: [],
    integration: { status: "ready", reasons: ["Accepted Research will be checkpointed before candidate construction."], completionKind: "research", completionFingerprint: "a".repeat(64), checkpointCommits: [] } };
  const researchMarkup = renderToStaticMarkup(withHooks([research, false, "", "", ""], () => RoutedExecutionPanel({ intakeId: research.intakeId })));
  assert.match(researchMarkup, /Research completion/);
  assert.match(researchMarkup, /Integrate completed research/);
  assert.doesNotMatch(researchMarkup, /Plan execution|Begin approved Plan|Current Work Item|Plan acceptance/);

  const plan = { ...research, route: "feature-change", actions: ["integrate"], planPath: "planning/plan.md",
    execution: { planId: "PLAN01", planRevision: 1, topology: "direct", fingerprint: "b".repeat(64), status: "complete", complete: true,
      workItemsComplete: true, phasesComplete: true, criteriaSatisfied: true, blockers: [], workItems: [], phases: [], acceptance: [] },
    integration: { status: "ready", reasons: [], completionKind: "plan", completionFingerprint: "b".repeat(64), checkpointCommits: [] } };
  const planMarkup = renderToStaticMarkup(withHooks([plan, false, "", "", ""], () => RoutedExecutionPanel({ intakeId: plan.intakeId })));
  assert.match(planMarkup, /Plan execution/);
  assert.match(planMarkup, /Integrate completed Plan/);
});
