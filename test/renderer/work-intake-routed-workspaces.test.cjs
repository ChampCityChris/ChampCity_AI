const assert = require("node:assert/strict");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const test = require("node:test");
const fs = require("node:fs");
const { loadRendererSourceModule } = require("./renderer-source-loader.cjs");

const { WorkIntakeWorkspace } = loadRendererSourceModule("src/renderer/app/WorkIntakeWorkspace.tsx");
const { StructuredWorkRoutingWorkspace, routeStructuredWIRTarget, shouldPollStructuredWorkRouting,
  startStructuredRoutingPolling, structuredRoutingPollIntervalMs } = loadRendererSourceModule("src/renderer/app/StructuredWorkRoutingWorkspace.tsx");

function withState(values, render) {
  const original = React.useState;
  const originalEffect = React.useEffect;
  const originalRef = React.useRef;
  let index = 0;
  React.useState = (initial) => [index < values.length ? values[index++] : initial, () => undefined];
  React.useEffect = () => undefined;
  React.useRef = initial => ({ current: initial });
  try { return render(); } finally { React.useState = original; React.useEffect = originalEffect; React.useRef = originalRef; }
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

test("structured WIR decision affordances and empty-text gates are explicit", () => {
  const model = { projectId: "project-1", intakeId: "intake-1", routingWorkflowId: "workflow-1", request: "Improve search",
    desiredOutcome: "Relevant results", constraints: [], evidenceContext: [], intakeRecordVersion: 1, intakeState: "captured", workflowState: "active",
    assessment: { assessmentId: "assessment-1", recommendation: "feature-change", traits: [], rationale: "A bounded change.", evidenceNotes: "", sourceRecordVersion: 1, stale: false },
    reviewState: "none", selectedRoute: null, targetWorkflowId: null, closed: false };
  const markup = renderToStaticMarkup(withState([model, "refactor-migration", "", false, "", ""], () =>
    StructuredWorkRoutingWorkspace({ intakeId: model.intakeId, routingWorkflowId: model.routingWorkflowId,
      browserPanel: null, onReloadBrowser() {}, onReturn() {}, onRouted() {} })));
  assert.match(markup, /work-routing-button work-routing-button-primary[^>]*>Accept Recommendation/);
  assert.doesNotMatch(markup, /work-routing-button work-routing-button-primary[^>]*disabled=""[^>]*>Accept Recommendation/);
  assert.match(markup, /work-routing-button work-routing-button-secondary[^>]*disabled=""[^>]*>Use Override Route/);
  assert.match(markup, /work-routing-button work-routing-button-warning[^>]*disabled=""[^>]*>Request Revised Assessment/);
  assert.match(markup, /work-routing-button work-routing-button-tertiary[^>]*>Back to Workflows/);
  assert.match(markup, /Optional when accepting the recommendation/);
  const css = fs.readFileSync("src/renderer/styles.css", "utf8");
  for (const selector of [".work-routing-button {", ".work-routing-button:hover:not(:disabled)", ".work-routing-button:focus-visible", ".work-routing-button:disabled"])
    assert.ok(css.includes(selector), selector);
  assert.match(css, /\.work-routing-button \{[^}]*cursor: pointer/s);
  assert.match(css, /\.work-routing-button:disabled \{[^}]*cursor: not-allowed/s);
});

test("structured WIR polling promotes in place without overlap and stops at all terminal boundaries", async () => {
  const pending = { preparedSubmission: { state: "waiting-for-drafts" }, closed: false, targetWorkflowId: null };
  const revised = { ...pending, preparedSubmission: { state: "partial-draft-set" }, assessment: { assessmentId: "old" }, reviewState: "revision-requested" };
  const promoted = { ...pending, preparedSubmission: { state: "promoted" }, assessment: { assessmentId: "new", recommendation: "refactor-migration" }, reviewState: "none" };
  for (const model of [null, { ...pending, preparedSubmission: undefined }, { ...pending, closed: true },
    { ...pending, targetWorkflowId: "target" }, { ...pending, preparedSubmission: { state: "superseded" } },
    { ...pending, preparedSubmission: { state: "promotion-failed" } }, promoted])
    assert.equal(shouldPollStructuredWorkRouting(model), false);
  assert.equal(shouldPollStructuredWorkRouting(pending), true);
  assert.equal(shouldPollStructuredWorkRouting(revised), true);
  let tick, cancelled = 0, reads = 0, rendered = "Work Intake", resolveRead;
  const schedule = (callback, interval) => { assert.equal(interval, structuredRoutingPollIntervalMs); tick = callback; return 1; };
  const cancel = () => { cancelled++; };
  const stop = startStructuredRoutingPolling(pending, () => { reads++; return new Promise(resolve => { resolveRead = resolve; }); },
    next => { rendered = next.assessment ? "Routing Assessment + Route Decision" : "Work Intake"; }, () => assert.fail("unexpected poll error"), schedule, cancel);
  tick(); tick();
  assert.equal(reads, 1);
  resolveRead(promoted);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(rendered, "Routing Assessment + Route Decision");
  assert.equal(cancelled, 1);
  tick(); assert.equal(reads, 1);
  stop();
  let revisedModel;
  const stopRevision = startStructuredRoutingPolling(revised, async () => promoted, next => { revisedModel = next; },
    () => assert.fail("unexpected poll error"), schedule, cancel);
  tick(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(revisedModel.assessment.assessmentId, "new");
  assert.equal(revisedModel.reviewState, "none");
  stopRevision();
  let unmountedUpdate = false;
  const stopUnmounted = startStructuredRoutingPolling(pending, () => new Promise(resolve => { resolveRead = resolve; }),
    () => { unmountedUpdate = true; }, () => assert.fail("unexpected poll error"), schedule, cancel);
  tick(); stopUnmounted(); resolveRead(promoted);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(unmountedUpdate, false);
});

test("mounted routing workspace renders a promoted assessment from automatic refresh", async () => {
  const pending = { projectId: "project-1", intakeId: "intake-1", routingWorkflowId: "workflow-1", request: "Improve search",
    desiredOutcome: "Relevant results", constraints: [], evidenceContext: [], intakeRecordVersion: 1, intakeState: "captured", workflowState: "active",
    assessment: null, reviewState: "none", selectedRoute: null, targetWorkflowId: null, closed: false,
    preparedSubmission: { state: "waiting-for-drafts" } };
  const promoted = { ...pending, assessment: { assessmentId: "assessment-1", recommendation: "feature-change", traits: [],
    rationale: "A bounded change.", evidenceNotes: "", sourceRecordVersion: 1, stale: false },
    preparedSubmission: { state: "promoted" } };
  const original = { state: React.useState, effect: React.useEffect, ref: React.useRef,
    interval: global.setInterval, clear: global.clearInterval, window: global.window };
  const states = [], refs = [], effects = [];
  let hook = 0, effectIndex = 0, tick, cancellations = 0, reads = 0;
  React.useState = initial => {
    const index = hook++;
    if (!(index in states)) states[index] = initial;
    return [states[index], value => { states[index] = value; }];
  };
  React.useRef = initial => {
    const index = hook++;
    if (!(index in refs)) refs[index] = { current: initial };
    return refs[index];
  };
  React.useEffect = (callback, deps) => {
    const index = effectIndex++;
    const previous = effects[index];
    if (!previous || deps.some((value, position) => value !== previous.deps[position])) {
      previous?.cleanup?.();
      effects[index] = { deps, cleanup: callback() };
    }
  };
  global.setInterval = callback => { tick = callback; return 1; };
  global.clearInterval = () => { cancellations++; };
  global.window = { champcity: { getStructuredWorkRouting: async () => { reads++; return reads === 1 ? pending : promoted; } } };
  const props = { intakeId: pending.intakeId, routingWorkflowId: pending.routingWorkflowId, browserPanel: null,
    onReloadBrowser() {}, onReturn() {}, onRouted() {} };
  function render() {
    hook = 0; effectIndex = 0;
    return StructuredWorkRoutingWorkspace(props);
  }
  try {
    render();
    await new Promise(resolve => setImmediate(resolve));
    const before = renderToStaticMarkup(render());
    assert.match(before, /Prepare an Architect handoff to get a route recommendation/);
    assert.doesNotMatch(before, /Accept Recommendation/);
    assert.equal(reads, 1);
    tick();
    await new Promise(resolve => setImmediate(resolve));
    const after = renderToStaticMarkup(render());
    assert.match(after, /Routing Assessment/);
    assert.match(after, /Recommendation ready for your route decision/);
    assert.match(after, /Accept Recommendation/);
    assert.equal(reads, 2);
    assert.ok(cancellations >= 1);
    tick(); assert.equal(reads, 2);
  } finally {
    for (const effect of effects) effect?.cleanup?.();
    React.useState = original.state; React.useEffect = original.effect; React.useRef = original.ref;
    global.setInterval = original.interval; global.clearInterval = original.clear; global.window = original.window;
  }
});

test("legacy Work Intake route and continuation IPC is not exposed", () => {
  const main = fs.readFileSync("src/main/main.ts", "utf8");
  const preload = fs.readFileSync("src/preload/index.ts", "utf8");
  for (const channel of ["workIntake:navigation", "workIntake:read", "workIntake:retry-source", "workRoute:", "workRouting:", "workPlanning:", "workIssue:", "workDecomposition:", "routedWorkflow:action"])
    assert.doesNotMatch(main, new RegExp(`ipcMain\\.handle\\(["']${channel.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}`));
  assert.match(main, /Select or open a Project to use Work Intake/);
  assert.doesNotMatch(preload, /getWorkIntakeNavigation|runRoutedWorkflow|getWorkPlanning|retryWorkIntakeSourcePreparation/);
});
