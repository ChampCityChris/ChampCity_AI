const assert = require("node:assert/strict");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const test = require("node:test");
const fs = require("node:fs");
const { loadRendererSourceModule } = require("./renderer-source-loader.cjs");

const { WorkIntakeWorkspace } = loadRendererSourceModule("src/renderer/app/WorkIntakeWorkspace.tsx");
const { StructuredWorkRoutingWorkspace, routeStructuredWIRTarget } = loadRendererSourceModule("src/renderer/app/StructuredWorkRoutingWorkspace.tsx");

function withState(values, render) {
  const original = React.useState;
  const originalEffect = React.useEffect;
  let index = 0;
  React.useState = (initial) => [index < values.length ? values[index++] : initial, () => undefined];
  React.useEffect = () => undefined;
  try { return render(); } finally { React.useState = original; React.useEffect = originalEffect; }
}

test("structured Work Intake has no branch ownership or legacy source controls", () => {
  const value = { projectId: "project-1", projectName: "Product", workRequest: "Improve search", desiredOutcome: "Relevant results",
    knownConstraints: "Keep existing data", hasExistingSourceOrPlanning: true, repositoryReviewContext: "", baseBranch: "", baseCommit: "" };
  const projection = { authority: "structured", project: { projectId: "project-1" }, suggestedProjectName: "Product", blockedReason: null, capturedIntakes: [], currentCapturedIntake: null };
  const element = withState([value, null, "", false], () => WorkIntakeWorkspace({ projection, onReturn() {}, async onSaved() {} }));
  const markup = renderToStaticMarkup(element);
  assert.doesNotMatch(markup, /Integrate into branch|creates the work branch|Retry source preparation|Work branch:/);
  assert.match(markup, /Project State keeps the saved request for routing/);
  const submit = React.Children.toArray(element.props.children)[0];
  const form = React.Children.toArray(submit.props.children).find(child => child?.type === "form");
  const saveButton = React.Children.toArray(form.props.children).flatMap(child => React.Children.toArray(child?.props?.children))
    .find(child => child?.props?.type === "submit");
  assert.ok(saveButton);
  assert.equal(saveButton.props.disabled, false);
});

test("structured WIR exposes the six Project routes and Architect handoff actions", () => {
  const model = { projectId: "project-1", intakeId: "intake-1", routingWorkflowId: "workflow-1", request: "Improve search",
    desiredOutcome: "Relevant results", constraints: [], evidenceContext: [], intakeRecordVersion: 1, intakeState: "captured", workflowState: "active",
    assessment: { assessmentId: "assessment-1", recommendation: "feature-change", traits: [], rationale: "A bounded change.", evidenceNotes: "", sourceRecordVersion: 1, stale: false },
    reviewState: "none", selectedRoute: null, targetWorkflowId: null, closed: false };
  const element = withState([model, "feature-change", "", false, "", ""], () => StructuredWorkRoutingWorkspace({ intakeId: "intake-1",
    routingWorkflowId: "workflow-1", browserPanel: React.createElement("div", { "aria-label": "Embedded ChatGPT browser" }),
    onReloadBrowser() {}, onReturn() {}, onRouted() {} }));
  const markup = renderToStaticMarkup(element);
  assert.match(markup, /Embedded ChatGPT browser/);
  assert.match(markup, /Prepare Handoff|Copy Handoff|Refresh|Reload ChatGPT/);
  for (const route of ["Feature / Capability", "Refactor / Migration", "Integration / Composition", "Infrastructure / Platform", "Research / Prototype", "Issue Resolution"])
    assert.ok(markup.includes(route), `missing ${route}`);
  assert.doesNotMatch(markup, /Greenfield|Work branch|Integrate into branch|source preparation/);
});

test("closed structured WIR offers the exact target without reopening route controls", () => {
  const model = { projectId: "project-1", intakeId: "intake-closed", routingWorkflowId: "wir-closed", request: "Improve search",
    desiredOutcome: "Relevant results", constraints: [], evidenceContext: [], intakeRecordVersion: 2, intakeState: "closed", workflowState: "closed",
    assessment: null, reviewState: "accepted", selectedRoute: "feature-change", targetWorkflowId: "target-exact", closed: true };
  const element = withState([model, "feature-change", "", false, "", ""], () => StructuredWorkRoutingWorkspace({ intakeId: model.intakeId,
    routingWorkflowId: model.routingWorkflowId, browserPanel: null, onReloadBrowser() {}, onReturn() {},
    onRouted(id) { assert.equal(id, "target-exact"); } }));
  const markup = renderToStaticMarkup(element);
  assert.match(markup, /This Work Intake is closed\./);
  assert.match(markup, /Open routed Workflow/);
  assert.doesNotMatch(markup, /Routing browser actions|Decision rationale|Override Route/);
});

test("WIR navigation stays on load and refresh, opens explicitly, and hands off after a live decision", () => {
  const calls = [];
  const onRouted = id => calls.push(id);
  routeStructuredWIRTarget("target-exact", "load", onRouted);
  routeStructuredWIRTarget("target-exact", "refresh", onRouted);
  assert.deepEqual(calls, []);
  routeStructuredWIRTarget("target-exact", "explicit-open", onRouted);
  assert.deepEqual(calls, ["target-exact"]);
  routeStructuredWIRTarget("new-target", "live-decision", onRouted);
  assert.deepEqual(calls, ["target-exact", "new-target"]);
});

test("legacy Work Intake route and continuation IPC is not exposed", () => {
  const main = fs.readFileSync("src/main/main.ts", "utf8");
  const preload = fs.readFileSync("src/preload/index.ts", "utf8");
  for (const channel of ["workIntake:navigation", "workIntake:read", "workIntake:retry-source", "workRoute:", "workRouting:", "workPlanning:", "workIssue:", "workDecomposition:", "routedWorkflow:action"])
    assert.doesNotMatch(main, new RegExp(`ipcMain\\.handle\\(["']${channel.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}`));
  assert.match(main, /Select or open a Project to use Work Intake/);
  assert.doesNotMatch(preload, /getWorkIntakeNavigation|runRoutedWorkflow|getWorkPlanning|retryWorkIntakeSourcePreparation/);
});
