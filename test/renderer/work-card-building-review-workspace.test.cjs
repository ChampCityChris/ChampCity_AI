const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const compiledContractsPath = path.join(__dirname, "..", "..", "dist", "shared", "workspaceContracts.js");

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


test("shared controls load Sol High, preserve arbitrary catalog effort order, and send the click snapshot", async () => {
  const React = require("react");
  const { loadRendererSourceModule } = require("./renderer-source-loader.cjs");
  const { CodexExecutionActions } = loadRendererSourceModule("src/renderer/app/WorkCardBuildingReviewWorkspace.tsx");
  const { runtimeFixture, selection, catalog } = require("../support/codex-runtime.cjs");
  const f = runtimeFixture({probe: async () => [...catalog, {...catalog[0],id:"future-picker",model:"future-id",displayName:"Future model",supportedReasoningEfforts:["omega","alpha"]}]});
  await f.ready;
  let starts = [];
  let poll;
  const oldWindow = global.window;
  global.window = {champcity: {getCodexManagedRuntimeStatus: async () => f.manager.getStatus(), setCodexModelSelection: (value) => f.manager.setSelection(value)},
    setInterval: (fn) => {poll=fn;return 1;}, clearInterval:()=>{}};
  const values = []; let cursor=0; let first=true; const effects=[];
  function render(extra={}) {
    const originalState=React.useState, originalEffect=React.useEffect;
    cursor=0;
    React.useState=(initial)=> {const i=cursor++; if (!(i in values)) values[i]=initial;return [values[i],value=>{values[i]=value;}];};
    React.useEffect=(fn)=>{if(first)effects.push(fn);};
    try {return CodexExecutionActions({execution:{state:"ready",canRunAgain:true},isActionRunning:false,onCancel:()=>{},onRun:value=>starts.push(value),...extra});}
    finally {React.useState=originalState;React.useEffect=originalEffect;first=false;}
  }
  function find(node, predicate) {
    if (!node || typeof node!=="object") return null;
    if (predicate(node)) return node;
    for (const child of React.Children.toArray(node.props?.children)) {const found=find(child,predicate);if(found)return found;}
    return null;
  }
  const field = (tree,label)=>find(tree,node=>node.type==="select" && node.props["aria-label"]===label);
  const run = tree=>find(tree,node=>node.type==="button" && node.props.className==="apply-button codex-command");
  try {
    assert.equal(run(render()).props.disabled,true);
    effects.forEach(fn=>fn()); await Promise.resolve();
    let tree=render();
    assert.equal(field(tree,"Model").props.value,selection.model);
    assert.equal(field(tree,"Reasoning").props.value,"high");
    assert.equal(run(tree).props.disabled,false);
    assert.deepEqual(starts,[]);
    field(tree,"Reasoning").props.onChange({target:{value:""}});
    tree=render();assert.equal(run(tree).props.disabled,true);
    field(tree,"Model").props.onChange({target:{value:"future-id"}});
    tree=render();assert.equal(run(tree).props.disabled,true);
    const efforts=React.Children.toArray(field(tree,"Reasoning").props.children).map(node=>node.props.value);
    assert.deepEqual(efforts,["","omega","alpha"]);
    field(tree,"Reasoning").props.onChange({target:{value:"alpha"}});
    await new Promise(resolve=>setImmediate(resolve));
    tree=render();run(tree).props.onClick();
    assert.deepEqual(starts,[{model:"future-id",reasoningEffort:"alpha"}]);
    assert.deepEqual(f.manager.getStatus().selection,starts[0]);
    const lease=f.manager.acquire(starts[0]); poll();await Promise.resolve();
    tree=render();assert.equal(field(tree,"Model").props.disabled,true);assert.equal(field(tree,"Reasoning").props.disabled,true);assert.equal(run(tree).props.disabled,true);
    lease.release();
  } finally {global.window=oldWindow;}
});

test("Build workspace renders implementation context and Codex controls without document-review actions", () => {
  const React = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  const { WorkCardBuildingReviewWorkspace } = require("./renderer-source-loader.cjs").loadRendererSourceModule("src/renderer/app/WorkCardBuildingReviewWorkspace.tsx");
  const input = {
    codexExecution: null, documentError: "", feedback: "", isCodexActionRunning: false,
    model: { workCardBuildingReview: { workCardId: "WC01", workCardTitle: "Implement fixture", formalWorkCardPath: "planning/WC01.md", formalWorkCardRevision: 2, implementerReportPath: "planning/IMPLEMENTER_REPORT_WC01.md", reportMissing: true } },
    onCancelCodex() {}, onCreateReport() {}, onRespondToCodexApproval() {}, onRespondToCodexMcpElicitation() {}, onRespondToCodexUserInput() {}, onResolveEnvironment() {}, onRunCodex() {},
  };
  const markup = renderToStaticMarkup(React.createElement(WorkCardBuildingReviewWorkspace, input));
  for (const label of ["Implementer Report Target", "planning/IMPLEMENTER_REPORT_WC01.md", "Create Implementer Report", "Codex execution console"]) assert.ok(markup.includes(label), label);
  assert.doesNotMatch(markup, /Run Codex Implementer|Cancel Codex Run|Apply Review|Review Notes|Select a document|Allow network for this Codex run/);
  input.model.workCardBuildingReview.reportMissing = false;
  input.model.workCardBuildingReview.report = { disposition: "Pending", artifactRevision: 1 };
  const pending = renderToStaticMarkup(React.createElement(WorkCardBuildingReviewWorkspace, input));
  assert.match(pending, /Run Codex Implementer/);
  assert.doesNotMatch(pending, /Create Implementer Report/);
});

test("environment status renders typed permission and restart requirements", () => {
  const React = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  const { DevelopmentEnvironmentStatus } = require("./renderer-source-loader.cjs").loadRendererSourceModule("src/renderer/app/WorkCardBuildingReviewWorkspace.tsx");
  for (const [kinds, expected] of [
    [["windows-permission"], "Windows permission required."],
    [["restart-required"], "Windows restart required."],
    [["windows-permission", "restart-required"], "Windows permission and restart required."],
  ]) {
    const markup = renderToStaticMarkup(React.createElement(DevelopmentEnvironmentStatus, { execution: {
      developmentEnvironmentPreflight: { state: "waiting-for-operator", summary: "Fixture preparation", requirements: kinds.map((humanInteractionKind, index) => ({ capabilityId: `fixture-${index}`, beforeState: "missing", afterState: "missing", humanInteractionKind, commandSummaries: [] })) },
    } }));
    assert.ok(markup.includes(expected), expected);
    assert.match(markup, /Work Card implementation has not started/);
  }
});
