const assert = require("node:assert/strict");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const test = require("node:test");
const { loadRendererSourceModule } = require("./renderer-source-loader.cjs");

const { WorkPlanningPanel } = loadRendererSourceModule("src/renderer/app/WorkPlanningPanel.tsx");
const { RoutedExecutionPanel } = loadRendererSourceModule("src/renderer/app/RoutedExecutionPanel.tsx");

function withHooks(values, render) {
  const originalState = React.useState;
  const originalEffect = React.useEffect;
  let index = 0;
  React.useState = (initial) => [index < values.length ? values[index++] : initial, () => undefined];
  React.useEffect = () => undefined;
  try { return render(); }
  finally { React.useState = originalState; React.useEffect = originalEffect; }
}

function nodes(element) {
  if (!element || typeof element !== "object") return [];
  return [element, ...React.Children.toArray(element.props?.children).flatMap(nodes)];
}

test("Research-closed planning renders shared routed integration without Plan execution controls", () => {
  const model = { intakeId: "intake-fixture", routeId: "research-prototype", stage: "assessment", canPrepare: false, researchClosed: true,
    artifact: { identity: { intakeId: "intake-fixture", routeDecisionId: "decision-fixture", routeId: "research-prototype", assessmentId: "ASSESSMENT01" },
      relativePath: "planning/assessment.md", artifactRevision: 1, sourceRevisions: [], disposition: "Approved", reviewNotes: "", stale: false, bodyMarkdown: "# Research",
      researchOutcome: { outcome: "no-implementation-plan-required", prototypeDisposition: "disposable", productionFollowUp: "none", evidence: ["complete"], decisionEnabled: "stop", successFailureResult: "met", closureCondition: "closed" } } };
  const element = withHooks(["assessment", model, "", "", false, false], () => WorkPlanningPanel({ intakeId: "intake-fixture" }));
  const routed = nodes(element).find((node) => typeof node.type === "function" && node.type.name === "RoutedExecutionPanel");
  assert.ok(routed, "Research closure exposes the shared routed integration panel");
  assert.equal(routed.props.intakeId, "intake-fixture");
  assert.equal(nodes(element).some((node) => node.type?.name === "WorkItemDecompositionPanel"), false);
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
