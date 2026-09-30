const assert = require("node:assert/strict");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const test = require("node:test");
const fs = require("node:fs");
const { loadRendererSourceModule } = require("./renderer-source-loader.cjs");

const { WorkIntakeWorkspace } = loadRendererSourceModule("src/renderer/app/WorkIntakeWorkspace.tsx");
const { StructuredWorkRoutingWorkspace, structuredRoutingViewState, routeStructuredWIRTarget, shouldPollStructuredWorkRouting,
  startStructuredRoutingPolling, structuredRoutingPollIntervalMs } = loadRendererSourceModule("src/renderer/app/StructuredWorkRoutingWorkspace.tsx");

function withState(values, render) {
  const original = React.useState;
  const originalEffect = React.useEffect;
  const originalRef = React.useRef;
  let index = 0;
  React.useState = (initial) => {
    const slot = index++;
    return [slot < values.length ? values[slot] : initial, value => { values[slot] = value; }];
  };
  React.useEffect = () => undefined;
  React.useRef = initial => ({ current: initial });
  try { return render(); } finally { React.useState = original; React.useEffect = originalEffect; React.useRef = originalRef; }
}

function findButton(element, label) {
  if (!element || typeof element !== "object") return null;
  if (element.type === "button" && React.Children.toArray(element.props.children).some(child => child === label)) return element;
  for (const child of [...React.Children.toArray(element.props?.children), element.props?.documentColumn, element.props?.browserActions]) {
    const found = findButton(child, label);
    if (found) return found;
  }
  return null;
}

function routingProps(model, onRouted = () => undefined) {
  return { intakeId: model.intakeId, routingWorkflowId: model.routingWorkflowId,
    browserPanel: null, onReloadBrowser() {}, onReturn() {}, onRouted };
}

function routingModel(overrides = {}) {
  return { projectId: "project-1", intakeId: "intake-1", routingWorkflowId: "workflow-1", request: "Improve search",
    desiredOutcome: "Relevant results", constraints: [], evidenceContext: [], intakeRecordVersion: 2, intakeState: "captured", workflowState: "active",
    assessment: null, reviewState: "none", selectedRoute: null, targetWorkflowId: null, closed: false, ...overrides };
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

test("structured WIR view states keep stale and revision recovery separate from decisions", () => {
  const assessment = { assessmentId: "old", recommendation: "refactor-migration", stale: false, traits: [], rationale: "Earlier advice", evidenceNotes: "", sourceRecordVersion: 1 };
  const base = routingModel();
  for (const [model, expected] of [
    [base, "empty"],
    [routingModel({ preparedSubmission: { state: "waiting-for-drafts" } }), "pending"],
    [routingModel({ assessment }), "current"],
    [routingModel({ assessment: { ...assessment, stale: true } }), "stale"],
    [routingModel({ assessment, reviewState: "revision-requested" }), "revision-requested"],
    [routingModel({ assessment, targetWorkflowId: "target" }), "routed"],
    [routingModel({ assessment, closed: true }), "closed"],
  ]) assert.equal(structuredRoutingViewState(model), expected);
  assert.equal(structuredRoutingViewState(routingModel({ assessment: { ...assessment, stale: true },
    preparedSubmission: { state: "partial-draft-set" } })), "pending");
});

test("stale assessment remains visible with an enabled primary recovery action and no route decisions", () => {
  const model = routingModel({ assessment: { assessmentId: "old", recommendation: "refactor-migration", stale: true,
    traits: ["migration"], rationale: "Earlier advice", evidenceNotes: "Prior evidence", sourceRecordVersion: 1 } });
  const element = withState([model, "refactor-migration", "", false, "", ""], () => StructuredWorkRoutingWorkspace(routingProps(model)));
  const markup = renderToStaticMarkup(element);
  assert.match(markup, /Routing Assessment/);
  assert.match(markup, /Earlier advice/);
  assert.match(markup, /Assessment needs refresh/);
  assert.match(markup, /The Work Intake changed after this recommendation was prepared/);
  assert.doesNotMatch(markup, /source evidence changed/);
  assert.match(markup, /Previous recommendation: <strong>Refactor \/ Migration<\/strong>.*stale/);
  assert.doesNotMatch(markup, /Accept Recommendation|Use Override Route|Request Revised Assessment/);
  assert.match(markup, /work-routing-recovery/);
  const prepare = findButton(element, "Prepare Current Assessment");
  assert.ok(prepare);
  assert.equal(prepare.props.disabled, false);
  assert.match(prepare.props.className, /work-routing-button-primary/);
  assert.ok(findButton(element, "Back to Workflows"));
  const css = fs.readFileSync("src/renderer/styles.css", "utf8");
  assert.match(css, /\.work-routing-recovery \{[^}]*border: 1px solid var\(--primary\)/s);
  assert.match(css, /\.work-routing-browser-actions .*button:not\(:disabled\) \{[^}]*opacity: 1;[^}]*cursor: pointer/s);
  assert.match(css, /\.work-routing-browser-actions .*button:disabled \{[^}]*cursor: not-allowed;[^}]*opacity: 0\.48/s);
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

test("live accept and override hand off exact targets while revision stays in Routing", async () => {
  const model = routingModel({ assessment: { assessmentId: "current", recommendation: "feature-change", stale: false,
    traits: [], rationale: "Current advice", evidenceNotes: "", sourceRecordVersion: 2 } });
  const originalWindow = global.window;
  try {
    for (const [disposition, label, route, rationale, target] of [
      ["accept", "Accept Recommendation", "feature-change", "", "accepted-target"],
      ["override", "Use Override Route", "refactor-migration", "Different route", "override-target"],
      ["request-revision", "Request Revised Assessment", "feature-change", "More evidence", null],
    ]) {
      const routed = [], decisions = [];
      global.window = { champcity: { decideStructuredWorkRouting: async (_intake, _workflow, input) => {
        decisions.push(input);
        return { ...model, targetWorkflowId: target, reviewState: target ? "decided" : "revision-requested" };
      } } };
      const values = [model, route, rationale, false, "", ""];
      const render = () => withState(values, () => StructuredWorkRoutingWorkspace(routingProps(model, id => routed.push(id))));
      let element = render();
      if (disposition === "accept") {
        function control(node, type) {
          if (!node || typeof node !== "object") return null;
          if (node.type === type) return node;
          for (const child of [...React.Children.toArray(node.props?.children), node.props?.documentColumn, node.props?.browserActions]) {
            const found = control(child, type);
            if (found) return found;
          }
          return null;
        }
        control(element, "textarea").props.onChange({ target: { value: "Proceed after review" } });
        element = render();
        control(element, "select").props.onChange({ target: { value: "refactor-migration" } });
        element = render();
        assert.equal(findButton(element, label).props.disabled, false);
        control(element, "select").props.onChange({ target: { value: "feature-change" } });
        element = render();
        assert.equal(values[0], model);
        assert.equal(decisions.length, 0);
      }
      const button = findButton(element, label);
      assert.ok(button);
      assert.equal(button.props.disabled, false);
      button.props.onClick();
      await new Promise(resolve => setImmediate(resolve));
      assert.equal(decisions.length, 1);
      assert.equal(decisions[0].disposition, disposition);
      assert.equal(decisions[0].assessmentId, "current");
      if (disposition === "accept") {
        assert.equal(decisions[0].rationale, "Proceed after review");
        assert.equal(Object.hasOwn(decisions[0], "route"), false);
      }
      if (disposition === "override") assert.equal(decisions[0].route, "refactor-migration");
      assert.deepEqual(routed, target ? [target] : []);
    }
  } finally { global.window = originalWindow; }
});

test("App routed handoff opens the exact target Workflow instance", async () => {
  const ts = require("typescript");
  const source = fs.readFileSync("src/renderer/app/App.tsx", "utf8");
  const ast = ts.createSourceFile("App.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let declaration;
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === "openRoutedTargetWorkflow") declaration = node;
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.ok(declaration);
  assert.match(source, /onRouted=\{workflowId => void openRoutedTargetWorkflow\(workflowId\)\}/);
  const js = ts.transpileModule(declaration.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const state = {};
  const target = "exact-routed-workflow";
  const open = new Function("refreshWorkflowInventory", "window", "setSelectedWorkflowType", "setSelectedWorkflowId",
    "setWorkflowInstance", "setActiveWorkflowId", "setShellView", "setWorkflowHubError", `${js}; return openRoutedTargetWorkflow;`)(
    async id => { assert.equal(id, target); return { groups: [{ workflows: [{ workflowId: target }] }] }; },
    { champcity: { getWorkflow: async id => { assert.equal(id, target); return { workflow: { workflowId: target, workflowType: "refactor-migration" } }; } } },
    value => { state.type = value; }, value => { state.id = value; }, value => { state.instance = value; },
    value => { state.active = value; }, value => { state.view = value; }, value => { state.error = value; });
  await open(target);
  assert.deepEqual(state, { type: "refactor-migration", id: target,
    instance: { workflowId: target, workflowType: "refactor-migration" }, active: null, view: "workflow-instance" });
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

test("mounted stale routing workspace prepares through the existing API and restores decisions by polling", async () => {
  const stale = routingModel({ assessment: { assessmentId: "old", recommendation: "refactor-migration", traits: [],
    rationale: "Previous advice.", evidenceNotes: "", sourceRecordVersion: 1, stale: true } });
  const pending = { ...stale, preparedSubmission: { state: "waiting-for-drafts" }, preparedInstruction: "Architect handoff" };
  const promoted = { ...pending, assessment: { assessmentId: "assessment-1", recommendation: "feature-change", traits: [],
    rationale: "A bounded change.", evidenceNotes: "", sourceRecordVersion: 2, stale: false },
    preparedSubmission: { state: "promoted" } };
  const original = { state: React.useState, effect: React.useEffect, ref: React.useRef,
    interval: global.setInterval, clear: global.clearInterval, window: global.window };
  const states = [], refs = [], effects = [];
  let hook = 0, effectIndex = 0, tick, cancellations = 0, reads = 0, preparations = 0, routed = 0;
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
  global.window = { champcity: {
    getStructuredWorkRouting: async () => { reads++; return reads === 1 ? stale : promoted; },
    prepareStructuredWorkRouting: async (intakeId, workflowId) => {
      assert.equal(intakeId, stale.intakeId); assert.equal(workflowId, stale.routingWorkflowId);
      preparations++; return pending;
    },
  } };
  const props = routingProps(stale, () => { routed++; });
  function render() {
    hook = 0; effectIndex = 0;
    return StructuredWorkRoutingWorkspace(props);
  }
  try {
    render();
    await new Promise(resolve => setImmediate(resolve));
    const beforeElement = render();
    const before = renderToStaticMarkup(beforeElement);
    assert.match(before, /Prepare Current Assessment/);
    assert.doesNotMatch(before, /Accept Recommendation/);
    assert.equal(reads, 1);
    await findButton(beforeElement, "Prepare Current Assessment").props.onClick();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(preparations, 1);
    const waiting = renderToStaticMarkup(render());
    assert.match(waiting, /Waiting for the current Architect assessment/);
    assert.match(waiting, /Copy Handoff/);
    assert.doesNotMatch(waiting, /Prepare Current Assessment|Accept Recommendation/);
    assert.equal(typeof tick, "function");
    tick();
    await new Promise(resolve => setImmediate(resolve));
    const after = renderToStaticMarkup(render());
    assert.match(after, /Routing Assessment/);
    assert.match(after, /Recommendation ready for your route decision/);
    assert.match(after, /Accept Recommendation/);
    assert.match(after, /Use Override Route|Request Revised Assessment/);
    assert.doesNotMatch(after, /Prepare Current Assessment/);
    assert.equal(reads, 2);
    assert.equal(routed, 0);
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
