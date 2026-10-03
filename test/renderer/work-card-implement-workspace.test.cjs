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
  const { CodexExecutionActions } = loadRendererSourceModule("src/renderer/app/WorkCardImplementShell.tsx");
  const {useCodexModelSelection}=loadRendererSourceModule("src/renderer/app/WorkCardImplementWorkspace.tsx");
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
    try {return CodexExecutionActions({modelSelection:useCodexModelSelection(false),execution:{state:"ready",canRunAgain:true},isActionRunning:false,onCancel:()=>{},onRun:value=>starts.push(value),...extra});}
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
    lease.release(); poll(); await Promise.resolve();
    tree = render({ execution: { state: "completed", executionKind: "environment-resolution", canRunAgain: true, canResolveEnvironment: false, developmentEnvironmentPreflight: { state: "ready" } }, onResolveEnvironment() {} });
    assert.equal(run(tree).props.disabled, false);
    assert.equal(find(tree, node => node.type === "button" && React.Children.toArray(node.props.children).includes("Resolve Environment")), null);
    tree = render({ execution: { state: "completed", executionKind: "environment-resolution", canRunAgain: false, canResolveEnvironment: true, developmentEnvironmentPreflight: { state: "resolution-required" } }, onResolveEnvironment() {} });
    assert.equal(run(tree).props.disabled, true);
    assert.equal(find(tree, node => node.type === "button" && React.Children.toArray(node.props.children).includes("Resolve Environment")).props.disabled, false);
  } finally {global.window=oldWindow;}
});

test("Environment Resolution terminal feedback and Last Run summary match deterministic readiness", () => {
  const React = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  const { loadRendererSourceModule } = require("./renderer-source-loader.cjs");
  const { codexTerminalFeedback } = loadRendererSourceModule("src/renderer/app/WorkCardImplementShell.tsx");
  const { CodexExecutionConsole, LastRunSummary, WorkCardImplementShell } = loadRendererSourceModule("src/renderer/app/WorkCardImplementShell.tsx");
  const base = { state: "completed", lastRunState: "completed", executionKind: "environment-resolution", reportUpdated: false, eventTail: [], stderrTail: [], finalResponseTail: [], approvalTail: [], runtimeDenialTail: [] };
  const renderConsole = (execution) => renderToStaticMarkup(React.createElement(CodexExecutionConsole, {
    execution, isActionRunning: false, onRespondToCodexMcpElicitation() {}, onRespondToCodexApproval() {}, onRespondToCodexUserInput() {}, postRunFeedback: codexTerminalFeedback(execution),
  }));

  const ready = { ...base, canRunAgain: true, developmentEnvironmentPreflight: { state: "ready", summary: "Ready", requirements: [] } };
  const readyMarkup = renderConsole(ready);
  assert.match(readyMarkup, /codex-execution-message success[^>]*>Environment Resolution completed\. Development environment is ready/);
  assert.doesNotMatch(readyMarkup, /Report was not updated|Report Update/);
  assert.match(renderToStaticMarkup(React.createElement(LastRunSummary, { execution: ready })), /Last Run<\/span><strong>completed<\/strong><small>Ready to run Work Card implementation/);

  const unresolved = { ...base, canRunAgain: false, canResolveEnvironment: true, developmentEnvironmentPreflight: { state: "resolution-required", summary: "Exact package identity required", requirements: [] } };
  const unresolvedMarkup = renderConsole(unresolved);
  assert.match(unresolvedMarkup, /codex-execution-message warning[^>]*>Environment Resolution completed, but development environment preparation is still incomplete: Exact package identity required/);
  assert.doesNotMatch(unresolvedMarkup, /Report was not updated|codex-execution-message success/);
  assert.match(renderToStaticMarkup(React.createElement(LastRunSummary, { execution: unresolved })), /Exact package identity required/);
  const workspaceMarkup = renderToStaticMarkup(React.createElement(WorkCardImplementShell, {
    codexExecution: unresolved, documentError: "", feedback: codexTerminalFeedback(unresolved).message,
    isCodexActionRunning: false,
    context: { workCardId: "WC01", formalWorkCardPath: "planning/WC01.md", formalWorkCardRevision: 1, implementerReportPath: "planning/IMPLEMENTER_REPORT_WC01.md", reportMissing: false, report: { disposition: "Pending", artifactRevision: 1 }, canExecute: true },
    modelSelection: {controls:null,selection:null,canRun:false},
    onCancelCodex() {}, onCreateReport() {}, onRespondToCodexApproval() {}, onRespondToCodexMcpElicitation() {}, onRespondToCodexUserInput() {}, onResolveEnvironment() {}, onRunCodex() {},
  }));
  assert.match(workspaceMarkup, /document-feedback warning/);

  const failed = { ...unresolved, state: "failed", lastRunState: "failed", failureReason: "Provider repair failed" };
  assert.match(renderConsole(failed), /codex-execution-message error[^>]*>Provider repair failed/);
  assert.doesNotMatch(renderConsole(failed), /Report was not updated|codex-execution-message warning/);

  const implementation = { ...base, executionKind: "work-card-implementation", developmentEnvironmentPreflight: ready.developmentEnvironmentPreflight, failureReason: "Codex completed, but the Implementer Report was not updated." };
  assert.match(renderConsole(implementation), /codex-execution-message warning[^>]*>Codex completed, but the Implementer Report was not updated/);
});

test("Build workspace renders implementation context and Codex controls without document-review actions", () => {
  const React = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  const { WorkCardImplementShell } = require("./renderer-source-loader.cjs").loadRendererSourceModule("src/renderer/app/WorkCardImplementShell.tsx");
  const input = {
    codexExecution: null, documentError: "", feedback: "", isCodexActionRunning: false,
    context: { workCardId: "WC01", workCardTitle: "Implement fixture", formalWorkCardPath: "planning/WC01.md", formalWorkCardRevision: 2, implementerReportPath: "planning/IMPLEMENTER_REPORT_WC01.md", reportMissing: true, canExecute: false },
    modelSelection: {controls:null,selection:null,canRun:false},
    onCancelCodex() {}, onCreateReport() {}, onRespondToCodexApproval() {}, onRespondToCodexMcpElicitation() {}, onRespondToCodexUserInput() {}, onResolveEnvironment() {}, onRunCodex() {},
  };
  const markup = renderToStaticMarkup(React.createElement(WorkCardImplementShell, input));
  for (const label of ["Implementer Report Target", "planning/IMPLEMENTER_REPORT_WC01.md", "Create Implementer Report", "Codex execution console"]) assert.ok(markup.includes(label), label);
  assert.doesNotMatch(markup, /Run Codex Implementer|Cancel Codex Run|Apply Review|Review Notes|Select a document|Allow network for this Codex run/);
  input.context.reportMissing = false;
  input.context.canExecute = true;
  input.context.report = { disposition: "Pending", artifactRevision: 1 };
  const pending = renderToStaticMarkup(React.createElement(WorkCardImplementShell, input));
  assert.match(pending, /Run Codex Implementer/);
  assert.doesNotMatch(pending, /Create Implementer Report/);
});

test("environment status renders typed permission and restart requirements", () => {
  const React = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  const { DevelopmentEnvironmentStatus } = require("./renderer-source-loader.cjs").loadRendererSourceModule("src/renderer/app/WorkCardImplementShell.tsx");
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

// WSF15 adds the SQL adapter boundary to the restored historical shell owner.
test("Implement adapter creates durable report separately from Run and preserves exact execution identities", async () => {
 const React=require('react'), {loadRendererSourceModule:load}=require('./renderer-source-loader.cjs');
 const {WorkCardImplementWorkspace}=load('src/renderer/app/WorkCardImplementWorkspace.tsx');
 const original={useState:React.useState,useEffect:React.useEffect,useRef:React.useRef},oldWindow=global.window;
 let values,index,calls=[];
 React.useState=initial=>{const slot=index++;return [values[slot]??initial,value=>values[slot]=value];};React.useEffect=()=>{};React.useRef=()=>({current:0});
 try {for(const workItemId of ['work-a','repair-b']){
  const planning={workflowId:'wf',workflowType:'project-creation',workItem:{id:workItemId,recordVersion:4,body:{workState:'planned',workItemKind:workItemId==='repair-b'?'fix':'feature',title:'Exact work',contractRevision:4}},review:{disposition:{state:'approved'}}};
  let report=null;const execution={state:'ready',canRunAgain:true};
  const runtime={version:'fixture',busy:false,updateState:'up-to-date',catalog:[{id:'fixture',model:'fixture-model',displayName:'Fixture',supportedReasoningEfforts:['high']}],selection:{model:'fixture-model',reasoningEffort:'high'}};
  values=[planning,null,execution,false,'',runtime,null,false,''];calls=[];
  global.window={champcity:{getStructuredWorkItemPlanning:async(...args)=>{calls.push(['planning',...args]);return planning;},getImplementationAttempt:async(...args)=>{calls.push(['report',...args]);return report;},getWorkflowWorkItemCodexExecutionStatus:async()=>execution,getWorkflowExecutionProjection:async()=>({plan:{workflow:{id:"wf"},repairIds:[{from:"repair-b",to:"work-a"}]}}),prepareImplementationAttempt:async(...args)=>{calls.push(['prepare',...args]);report={attempt:{id:'attempt-'+workItemId,recordVersion:1,body:{workflowId:'wf',workItemId,attemptState:'prepared'}},filename:'IMPLEMENTER_REPORT_fixture.md',markdown:'# Pending SQL report'};return report.attempt;},startWorkflowWorkItemCodexExecution:async(...args)=>{calls.push(['run',...args]);return execution;}}};
  const draw=(id=workItemId)=>{index=0;return WorkCardImplementWorkspace({workflowId:'wf',workItemId:id,onNext(){}}).props;};
  let p=draw();assert.equal(p.context.reportMissing,true);assert.equal(p.canCreateReport,true);await p.onCreateReport();
  assert.deepEqual(calls[0],['prepare','wf',workItemId]);assert.equal(calls.some(call=>call[0]==='run'),false);
  p=draw();assert.equal(p.context.reportMissing,false);assert.equal(p.context.canExecute,true);assert.match(p.documentPanel.props.children.props.report.markdown,/Pending SQL/);
  const {ImplementReportDocument}=load('src/renderer/app/WorkCardImplementWorkspace.tsx');
  const completed={...report,attempt:{...report.attempt,body:{...report.attempt.body,attemptState:'completed'}},markdown:'# Completed SQL report'};
  const completedMarkup=require('react-dom/server').renderToStaticMarkup(React.createElement(ImplementReportDocument,{report:completed,onCopy(){},onExport(){}}));
  assert.match(completedMarkup,/>completed<|Completed SQL report/);assert.doesNotMatch(completedMarkup,/>Pending</);
  p.onRunCodex(runtime.selection);await new Promise(setImmediate);assert.deepEqual(calls.find(call=>call[0]==='run'),['run','wf',workItemId,runtime.selection]);
  const before=calls.length;p=draw('peer');assert.equal(p.context,null);await p.onCreateReport();assert.equal(calls.length,before);
 }}finally{Object.assign(React,original);global.window=oldWindow;}
});
