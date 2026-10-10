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
    modelSelection: {controls:React.createElement("div", {"aria-label":"Model and Reasoning"}),selection:null,canRun:false},
    onCancelCodex() {}, onRespondToCodexApproval() {}, onRespondToCodexMcpElicitation() {}, onRespondToCodexUserInput() {}, onResolveEnvironment() {}, onRunCodex() {},
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
    context: { workCardId: "WC01", workCardTitle: "Implement fixture", formalWorkCardPath: "planning/WC01.md", formalWorkCardRevision: 2, implementerReportPath: "planning/IMPLEMENTER_REPORT_WC01.md", reportMissing: true, canExecute: true },
    modelSelection: {controls:React.createElement("div", {"aria-label":"Model and Reasoning"}),selection:null,canRun:false},
    onCancelCodex() {}, onRespondToCodexApproval() {}, onRespondToCodexMcpElicitation() {}, onRespondToCodexUserInput() {}, onResolveEnvironment() {}, onRunCodex() {},
  };
  const markup = renderToStaticMarkup(React.createElement(WorkCardImplementShell, input));
  for (const label of ["Context", "Status", "Interaction", "Diagnostics", "Model and Reasoning", "Implement", "Codex execution console"]) assert.ok(markup.includes(label), label);
  assert.doesNotMatch(markup, /Create Implementer Report|Cancel Codex Run|Apply Review|Review Notes|Select a document|Allow network for this Codex run/);
  input.context.reportMissing = false;
  input.context.canExecute = true;
  input.context.report = { disposition: "Pending", artifactRevision: 1 };
  const pending = renderToStaticMarkup(React.createElement(WorkCardImplementShell, input));
  assert.match(pending, />Implement<\/button>/);
  assert.doesNotMatch(pending, /aria-label="Implementer Report"|work-card-implement-report/);
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

test("Implement adapter starts once without renderer preparation, recovers prepared attempts, and fails closed", async () => {
 const React=require('react'), {loadRendererSourceModule:load}=require('./renderer-source-loader.cjs');
 const {WorkCardImplementWorkspace}=load('src/renderer/app/WorkCardImplementWorkspace.tsx');
 const original={useState:React.useState,useEffect:React.useEffect,useRef:React.useRef},oldWindow=global.window;
 let values,index,refs,refIndex,calls=[];
 React.useState=initial=>{const slot=index++;return [slot in values?values[slot]:initial,value=>values[slot]=value];};
 React.useEffect=()=>{};React.useRef=initial=>refs[refIndex++]??(refs[refIndex-1]={current:initial});
 try {for(const workItemId of ['work-a','repair-b']) for(const prepared of [false,true]) {
  const planning={workflowId:'wf',workflowType:'project-creation',workItem:{id:workItemId,recordVersion:4,body:{workState:'planned',workItemKind:workItemId==='repair-b'?'repair':'feature',title:'Exact work',contractRevision:4}},review:{disposition:{state:'approved'}}};
  const report=prepared?{attempt:{id:'existing-attempt',recordVersion:1,body:{workflowId:'wf',workItemId,attemptState:'prepared'}},markdown:'# Pending SQL report'}:null;
  const execution={state:'ready',canRunAgain:true};
  const runtime={version:'fixture',busy:false,updateState:'up-to-date',catalog:[{id:'fixture',model:'fixture-model',displayName:'Fixture',supportedReasoningEfforts:['high']}],selection:{model:'fixture-model',reasoningEffort:'high'}};
  values=[planning,report,execution,false,'',runtime,null,false,''];refs=[];calls=[];let release,statusReads=0,nextReport=report;
  global.window={champcity:{getStructuredWorkItemPlanning:async()=>planning,getImplementationAttempt:async()=>nextReport,getWorkflowWorkItemCodexExecutionStatus:async()=>{statusReads++;return execution;},getWorkflowExecutionProjection:async()=>({plan:{workflow:{id:'wf'},repairIds:[]},items:[]}),getGreenfieldNavigation:async()=>({workflowId:'wf',currentWorkspace:'work-card-building-review',currentWorkItemId:workItemId}),prepareImplementationAttempt:async()=>{throw Error('Renderer must never prepare');},startWorkflowWorkItemCodexExecution:(...args)=>{calls.push(['run',...args]);return new Promise(resolve=>release=resolve);},cancelCodexImplementerExecution:async selector=>calls.push(['cancel',selector]),respondToCodexApproval:async value=>calls.push(['approval',value]),respondToCodexUserInput:async value=>calls.push(['input',value]),respondToCodexMcpElicitation:async value=>calls.push(['mcp',value])}};
  const draw=(extra={})=>{index=refIndex=0;return WorkCardImplementWorkspace({workflowId:'wf',workItemId,onNext(){},...extra}).props;};
  let p=draw();const footer=React.Children.toArray(p.navigation.props.children)[0].props.children;assert.equal(footer[0].props.className,'apply-button codex-command secondary');assert.equal(footer[1].props.className,'apply-button codex-command');assert.equal(footer[1].props.type,'button');assert.equal(footer[1].props.disabled,true);assert.equal(p.context.canExecute,true);assert.equal(p.context.reportMissing,!prepared);assert.equal(p.modelSelection.canRun,true);
  assert.equal(p.documentPanel,undefined);assert.equal(p.onCreateReport,undefined);assert.equal(p.canCreateReport,undefined);
  if(prepared)assert.equal(p.context.implementerReportPath,'project-state:existing-attempt');
  p.onRunCodex(runtime.selection);p.onRunCodex(runtime.selection);
  assert.deepEqual(calls,[['run','wf',workItemId,runtime.selection]]);
  assert.equal(draw().isCodexActionRunning,true);
  const returned={state:'unavailable',canRunAgain:false,failureReason:'Source preparation failed: stranded dirty checkout',retryBlocker:'Inspect exact source identity'};
  nextReport={attempt:{id:'reserved-at-start',recordVersion:1,body:{workflowId:'wf',workItemId,workItemVersion:4,attemptState:'prepared'}}};
  planning.revisionEligibility={eligible:true,reason:''};
  release(returned);await new Promise(setImmediate);
  p=draw();assert.equal(p.codexExecution,returned);assert.equal(p.context.reportReadinessReason,returned.failureReason);assert.equal(statusReads,1,'Start reconciles SQL while retaining the exact returned failure');
  assert.equal(p.context.implementerReportPath,'project-state:reserved-at-start');
  const nodes=n=>!n||typeof n!=='object'?[]:[n,...React.Children.toArray(n.props?.children).flatMap(nodes)];
  const revision=()=>nodes(draw().navigation).find(n=>n.type==='button'&&n.props.children==='Request Work Card Revision');
  assert.equal(revision().props.disabled,true,'A nonblank Operator reason is required');
  planning.revisionEligibility.eligible=false;assert.equal(revision(),undefined);planning.revisionEligibility.eligible=true;
  assert.equal(p.codexExecution.retryBlocker,returned.retryBlocker);
  React.Children.toArray(p.navigation.props.children)[0].props.children[0].props.onClick();await new Promise(setImmediate);
  assert.equal(statusReads,2);assert.equal(draw().codexExecution,execution,'Explicit Refresh may reread Ready');
  p=draw({readOnly:true});assert.equal(p.context.canExecute,false);p.onRunCodex(runtime.selection);assert.equal(calls.length,1);
  p=draw({workItemId:'peer'});assert.equal(p.context,null);p.onRunCodex(runtime.selection);assert.equal(calls.length,1);
  planning.review.disposition.state='none';p=draw();assert.equal(p.context.canExecute,false);p.onRunCodex(runtime.selection);assert.equal(calls.length,1);planning.review.disposition.state='approved';
  values[4]='Stale context';p=draw();assert.equal(p.context.canExecute,false);p.onRunCodex(runtime.selection);assert.equal(calls.length,1);values[4]='';
  for(const state of ['running','unavailable']) {execution.state=state;p=draw();assert.equal(p.context.canExecute,false);assert.equal(p.modelSelection.canRun,state!=='running');p.onRunCodex(runtime.selection);assert.equal(calls.length,1);}
  execution.state='running';p=draw();assert.equal(p.modelSelection.controls.props.children[0].props.children[1].props.disabled,true);
  await p.onCancelCodex();await new Promise(setImmediate);assert.equal(calls.at(-1)[0],'cancel');
  for(const [handler,args,kind] of [['onRespondToCodexApproval',['approval-1','approve'],'approval'],['onRespondToCodexUserInput',['input-1',{answer:['yes']}],'input'],['onRespondToCodexMcpElicitation',['mcp-1','accept',{}],'mcp']]) {p=draw();p[handler](...args);await new Promise(setImmediate);assert.equal(calls.at(-1)[0],kind);assert.equal(calls.at(-1)[1].workItemId,workItemId);}
  for(const failure of ['rejected-read','stale-report','begun','completed','typed-ineligible']){
   execution.state='ready';values[2]=execution;values[4]='';
   nextReport.attempt.body.attemptState='prepared';nextReport.attempt.body.workItemId=workItemId;
   planning.revisionEligibility.eligible=true;
   global.window.champcity.getStructuredWorkItemPlanning=async()=>{if(failure==='rejected-read')throw Error('SQL refresh rejected');return planning;};
   global.window.champcity.startWorkflowWorkItemCodexExecution=async()=>{
    if(failure==='stale-report')nextReport.attempt.body.workItemId='peer';
    if(['begun','completed'].includes(failure))nextReport.attempt.body.attemptState=failure==='begun'?'running':'completed';
    if(failure==='typed-ineligible')planning.revisionEligibility.eligible=false;
    return returned;
   };
   draw().onRunCodex(runtime.selection);await new Promise(setImmediate);p=draw();
   assert.equal(p.codexExecution,returned);assert.equal(p.codexExecution.retryBlocker,returned.retryBlocker);
   assert.equal(revision(),undefined,failure+' must fail closed');
   assert.equal(React.Children.toArray(p.navigation.props.children)[0].props.children[1].props.disabled,true);
   if(['rejected-read','stale-report'].includes(failure))assert.match(p.documentError,/Start result refresh failed:/);
   else assert.equal(p.documentError,'');
  }
 }}finally{Object.assign(React,original);global.window=oldWindow;}
});


test("Implement tabs keep local identity, bounded bodies, interaction cues and all diagnostic tails", () => {
 const React=require('react'), {loadRendererSourceModule:load}=require('./renderer-source-loader.cjs');
 const {WorkCardImplementShell, CodexExecutionConsole}=load('src/renderer/app/WorkCardImplementShell.tsx');
 const original=React.useState,oldWindow=global.window;let stored,services=0;
 React.useState=initial=>{stored??=initial;return [stored,value=>stored=value];};
 global.window={champcity:new Proxy({}, {get(){services++;throw Error('Tab must not access a service');}})};
 const children=n=>React.Children.toArray(n?.props?.children);
 const find=(n,p)=>{if(!n||typeof n!=='object')return null;if(typeof n.type==='function'&&n.type.name==='PresentationTabs')return find(n.type(n.props),p);if(p(n))return n;for(const c of children(n)){const f=find(c,p);if(f)return f;}return null;};
 const panel=tree=>find(tree,n=>n.props?.role==='tabpanel');
 const click=(tree,label)=>find(tree,n=>n.props?.role==='tab'&&children(n)[0]===label).props.onClick();
 const base={execution:null,isActionRunning:true,modelSelection:{controls:'Model controls'},onRespondToCodexApproval(){throw Error('mutation')},onRespondToCodexUserInput(){throw Error('mutation')},onRespondToCodexMcpElicitation(){throw Error('mutation')}};
 try {
  let tree=CodexExecutionConsole(base);assert.equal(panel(tree).props['aria-label'],'Status');
  click(tree,'Diagnostics');tree=CodexExecutionConsole({...base,execution:{state:'failed',eventTail:['event'],stderrTail:['error'],finalResponseTail:['final'],approvalTail:[{type:'command',decision:'deny',completed:true,requestId:'request'}],runtimeDenialTail:['denial']}});
  assert.equal(panel(tree).props['aria-label'],'Diagnostics');
  const tails=[];function collect(n){if(!n||typeof n!=='object')return;if(n.props?.values)tails.push(n.props);children(n).forEach(collect);}collect(tree);
  assert.deepEqual(tails.map(t=>t.label),['Approval Tail','Runtime Denial Tail','Event Tail','Error Tail','Final Response Tail']);
  tree=CodexExecutionConsole({...base,presentationIdentity:'new-attempt',execution:{state:'failed',failureReason:'Checkpoint failed',checkpoint:{status:'blocked',message:'No commit'}}});
  assert.equal(panel(tree).props['aria-label'],'Status');
  for(const kind of ['pendingApproval','pendingUserInput','pendingMcpElicitation']) {
   stored=undefined;tree=CodexExecutionConsole({...base,execution:{[kind]:{requestId:'pending'}}});
   assert.equal(panel(tree).props['aria-label'],'Interaction');
   click(tree,'Status');tree=CodexExecutionConsole({...base,execution:{[kind]:{requestId:'pending'}}});
   const tab=find(tree,n=>n.props?.role==='tab'&&children(n)[0]==='Interaction');assert.equal(children(tab)[1].props.children,'Action required');
  }
  stored=undefined;const shell={codexExecution:null,documentError:'',feedback:'',isCodexActionRunning:true,context:{workCardId:'work',formalWorkCardPath:'work',implementerReportPath:'attempt',reportReadiness:'ready'},modelSelection:{controls:'Model controls'},onRunCodex(){throw Error('mutation')}};
  tree=WorkCardImplementShell(shell);assert.equal(panel(tree).props['aria-label'],'Implement');click(tree,'Context');tree=WorkCardImplementShell(shell);assert.equal(panel(tree).props['aria-label'],'Context');
  assert.ok(find(tree,n=>n.type==='dt'&&n.props.children==='Implementer Report Target'));
  tree=WorkCardImplementShell({...shell,context:{...shell.context,implementerReportPath:'next-attempt'}});assert.equal(panel(tree).props['aria-label'],'Implement');
  tree=WorkCardImplementShell({...shell,feedback:'SQL context refreshed',documentError:'Refresh failed: rejected read'});click(tree,'Context');tree=WorkCardImplementShell({...shell,feedback:'SQL context refreshed',documentError:'Refresh failed: rejected read'});assert.ok(find(panel(tree),n=>n.props?.className==='document-error'));assert.ok(find(panel(tree),n=>n.props?.className==='document-feedback'));
  assert.equal(services,0);
 }finally{React.useState=original;global.window=oldWindow;}
});

// Navigation is SQL authority; completed transport alone cannot authorize Review or revision.
test('failed Implement refresh and typed revision preserve exact identity and gate successful Review', async () => {
 const React=require('react'),{loadRendererSourceModule:load}=require('./renderer-source-loader.cjs');
 const {WorkCardImplementWorkspace}=load('src/renderer/app/WorkCardImplementWorkspace.tsx');
 const {CodexExecutionConsole}=load('src/renderer/app/WorkCardImplementShell.tsx');
 const {renderToStaticMarkup}=require('react-dom/server');
 const original={useState:React.useState,useEffect:React.useEffect,useRef:React.useRef},old=global.window;
 const planning={workflowId:'wf',workflowType:'project-creation',workItem:{id:'repair',recordVersion:8,body:{workState:'ready',workItemKind:'repair',contractRevision:3,title:'Preserve correct file',affectedPaths:['correct.txt']}},review:{disposition:{state:'approved'}},revisionEligibility:{eligible:true,reason:''}};
 const report={attempt:{id:'attempt',body:{workflowId:'wf',workItemId:'repair',attemptState:'completed',implementationRecordId:'result'}}};
 const result={id:'result',body:{workflowId:'wf',workItemId:'repair',executionRef:'attempt',outcome:'partial'}};
 const execution={state:'completed',canRunAgain:true,checkpoint:{status:'blocked',message:'No qualifying source change'}};
 const nav={workflowId:'wf',currentWorkItemId:'repair',currentWorkspace:'work-card-building-review'};
 const values=[],refs=[];let index=0,refIndex=0,reads=0,reconciles=0,writeResolve,readFailure=false,nextFailure=false;const writes=[];
 const tick=()=>new Promise(setImmediate);
 const nodes=n=>!n||typeof n!=='object'?[]:[n,...React.Children.toArray(n.props?.children).flatMap(nodes)];
 const button=(p,label)=>nodes(p.navigation).find(n=>n.type==='button'&&n.props.children===label);
 const draw=extra=>{index=refIndex=0;return WorkCardImplementWorkspace({workflowId:'wf',workItemId:'repair',onNext:async()=>{reconciles++;if(nextFailure)throw Error('Canonical navigation unavailable');},onRefreshNavigation:async()=>{reconciles++;if(nextFailure)throw Error('Canonical navigation unavailable');},...extra}).props;};
 React.useState=initial=>{const slot=index++;if(!(slot in values))values[slot]=initial;return [values[slot],value=>values[slot]=typeof value==='function'?value(values[slot]):value];};React.useEffect=()=>{};React.useRef=initial=>refs[refIndex++]??(refs[refIndex-1]={current:initial});
 global.window={champcity:{getStructuredWorkItemPlanning:async()=>{reads++;if(readFailure)throw Error('SQL read rejected');return planning;},getImplementationAttempt:async()=>report,getWorkflowWorkItemCodexExecutionStatus:async()=>execution,getWorkflowExecutionProjection:async()=>({plan:{workflow:{id:'wf'},repairIds:[]},items:[{record:planning.workItem,implementationAttempts:report.attempt.body.implementationRecordId?[result]:[]}]}),getGreenfieldNavigation:async()=>nav,reviewStructuredWorkItemPlanning:(...args)=>{writes.push(args);return new Promise(resolve=>writeResolve=resolve);},startWorkflowWorkItemCodexExecution:async()=>{throw Error('Start failed before Codex began');}}};
 try {
  let p=draw();button(p,'Refresh').props.onClick();await tick();p=draw();
  assert.match(p.feedback,/refreshed/);assert.equal(reconciles,1);assert.equal(button(p,'Continue to Review & Validation').props.disabled,true);
  assert.match(renderToStaticMarkup(p.navigation),/latest Implement result is partial.*Tester are not yet eligible/);
  for(const status of ['blocked','committed','not-required']) {
   Object.assign(React,original);
   const markup=renderToStaticMarkup(React.createElement(CodexExecutionConsole,{execution:{...execution,checkpoint:{status,message:'Exact checkpoint'}},isActionRunning:false}));
   assert.match(markup,new RegExp('codex-execution-message '+({blocked:'error',committed:'success','not-required':'neutral'})[status]+'[^>]*>Source checkpoint:'));
   React.useState=initial=>{const slot=index++;return [values[slot],value=>values[slot]=value];};React.useEffect=()=>{};React.useRef=initial=>refs[refIndex++]??(refs[refIndex-1]={current:initial});
  }
  p=draw();assert.equal(button(p,'Request Work Card Revision').props.disabled,true);
  nodes(p.navigation).find(n=>n.type==='textarea').props.onChange({target:{value:'Preserve conforming source; revise exact mutation contract'}});
  p=draw();const request=button(p,'Request Work Card Revision').props.onClick;request();request();
  assert.deepEqual(writes,[['wf','repair',{expectedRecordVersion:8,outcome:'revision_requested',notes:'Preserve conforming source; revise exact mutation contract'}]]);
  assert.equal(draw().isCodexActionRunning,true);assert.equal(reconciles,1,'disposition must persist before navigation');
  planning.review.disposition.state='revision_requested';nav.currentWorkspace='work-card-repair';writeResolve(planning);await tick();assert.equal(reconciles,2);
  assert.equal(result.body.outcome,'partial');assert.equal(report.attempt.body.attemptState,'completed');
  assert.equal(button(draw(),'Request Work Card Revision'),undefined);
  nav.currentWorkspace='work-card-building-review';planning.review.disposition.state='approved';
  for(const extra of [{readOnly:true},{workItemId:'peer'}])assert.equal(button(draw(extra),'Request Work Card Revision'),undefined);
  for(const state of ['running','prepared']){report.attempt.body.attemptState=state;assert.equal(button(draw(),'Request Work Card Revision'),undefined);}report.attempt.body.attemptState='completed';
  execution.state='running';assert.equal(button(draw(),'Request Work Card Revision'),undefined);execution.state='completed';
  planning.revisionEligibility={eligible:false,reason:'Source-backed checkout is not restored clean'};assert.equal(button(draw(),'Request Work Card Revision'),undefined);planning.revisionEligibility={eligible:true,reason:''};
  for(const outcome of ['partial','failed','abandoned']){result.body.outcome=outcome;assert.ok(button(draw(),'Request Work Card Revision'));}result.body.outcome='implemented';
  planning.workItem.body.workState='validation_pending';nav.currentWorkspace='work-card-report-review';
  for(const status of ['committed','not-required']){execution.checkpoint.status=status;planning.workItem.body.affectedPaths=status==='not-required'?[]:['correct.txt'];assert.equal(button(draw(),'Continue to Review & Validation').props.disabled,false);}
  for(const status of ['blocked','pending']){execution.checkpoint.status=status;assert.equal(button(draw(),'Continue to Review & Validation').props.disabled,true);}execution.checkpoint.status='committed';
  nav.currentWorkItemId='peer';assert.equal(button(draw(),'Continue to Review & Validation').props.disabled,true);nav.currentWorkItemId='repair';
  nav.currentWorkspace='work-card-building-review';assert.equal(button(draw(),'Continue to Review & Validation').props.disabled,true);nav.currentWorkspace='work-card-report-review';
  const before=reconciles;button(draw(),'Continue to Review & Validation').props.onClick();await tick();assert.equal(reconciles,before+1);
  readFailure=true;button(draw(),'Refresh').props.onClick();await tick();assert.match(draw().documentError,/Refresh failed.*SQL read rejected/);
  readFailure=false;nextFailure=true;button(draw(),'Refresh').props.onClick();await tick();assert.match(draw().documentError,/Refresh failed.*Canonical navigation unavailable/);
  nextFailure=false;button(draw(),'Refresh').props.onClick();await tick();assert.equal(draw().documentError,'');assert.match(draw().feedback,/refreshed/);assert.equal(writes.length,1);assert.ok(reads>1);
  report.attempt.body.attemptState='prepared';report.attempt.body.workItemVersion=8;delete report.attempt.body.implementationRecordId;
  planning.workItem.body.workState='ready';nav.currentWorkspace='work-card-building-review';execution.state='ready';
  button(draw(),'Refresh').props.onClick();await tick();
  p=draw();assert.match(renderToStaticMarkup(p.navigation),/reservation is prepared and has not started/);assert.equal(button(p,'Continue to Review & Validation').props.disabled,true);
  for(const extra of [{readOnly:true},{workItemId:'peer'}])assert.equal(button(draw(extra),'Request Work Card Revision'),undefined);
  report.attempt.body.workItemVersion=7;assert.equal(button(draw(),'Request Work Card Revision'),undefined);report.attempt.body.workItemVersion=8;
  planning.revisionEligibility={eligible:false,reason:'Prepared checkout is redirected'};assert.match(renderToStaticMarkup(draw().navigation),/Prepared checkout is redirected/);assert.equal(button(draw(),'Request Work Card Revision'),undefined);planning.revisionEligibility={eligible:true,reason:''};
  values[5]={version:'fixture',busy:false,updateState:'up-to-date',catalog:[{id:'fixture',model:'fixture-model',displayName:'Fixture',supportedReasoningEfforts:['high']}],selection:{model:'fixture-model',reasoningEffort:'high'}};
  p=draw();assert.equal(p.modelSelection.canRun,true);p.onRunCodex(values[5].selection);await tick();p=draw();assert.match(p.documentError,/Start failed before Codex began/);assert.equal(button(p,'Continue to Review & Validation').props.disabled,true);assert.ok(button(p,'Request Work Card Revision'));
  nodes(p.navigation).find(n=>n.type==='textarea').props.onChange({target:{value:'   '}});assert.equal(button(draw(),'Request Work Card Revision').props.disabled,true);
  nodes(draw().navigation).find(n=>n.type==='textarea').props.onChange({target:{value:'Revise the exact prepared reservation'}});button(draw(),'Request Work Card Revision').props.onClick();await tick();assert.equal(writes.length,2);assert.equal(writes[1][2].expectedRecordVersion,8);
  planning.review.disposition.state='revision_requested';nav.currentWorkspace='work-card-repair';writeResolve(planning);await tick();assert.equal(button(draw(),'Request Work Card Revision'),undefined);assert.equal(report.attempt.body.attemptState,'prepared');
 }finally{Object.assign(React,original);global.window=old;}
});
