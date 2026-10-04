const assert = require("node:assert/strict");
const test = require("node:test");
const React = require("react");
const {renderToStaticMarkup} = require("react-dom/server");

const {
  createArchitectAttachmentCoordinator,
  resetArchitectAttachmentGenerationForTest,
  shouldShowArchitectBrowserRetry,
} = require("../../dist/shared/architectInterview/architectBrowserAttachmentCoordinator.js");
const {
  loadRendererSourceModule,
} = require("./renderer-source-loader.cjs");
const {
  reconcileArchitectBrowserBoundsAck,
} = loadRendererSourceModule("src/renderer/app/architectBrowserBoundsOrchestration.ts");
const {FigmaBrowserPanel} = loadRendererSourceModule("src/renderer/app/figma/FigmaBrowserPanel.tsx");

test("application browser host owns one native attachment and sequences measured resize and detach", () => {
  const source = require("node:fs").readFileSync(require("node:path").resolve(__dirname, "../../src/renderer/app/ApplicationBrowserHost.tsx"), "utf8");
  assert.match(source, /createArchitectAttachmentCoordinator/);
  assert.match(source, /void attachment\.attach\(\)/);
  assert.match(source, /const observer = new ResizeObserver\(sync\)/);
  assert.match(source, /setArchitectBrowserBounds\(\{\.\.\.bounds, sequence: \+\+sequence\.current/);
  assert.match(source, /void attachment\.detach\(\)/);
  assert.match(source, /observer\.disconnect\(\)/);
  assert.doesNotMatch(source, /figma-browser-column/);
  assert.match(source, /FigmaBrowserPanel hostRef/);
});

test("shared browser panel keeps native host and real recovery controls without decorative browser chrome", () => {
  const markup = renderToStaticMarkup(React.createElement(FigmaBrowserPanel, {hostRef: {current: null}, onReload() {}, onRetry() {}, retryVisible: true, statusLabel: "ChatGPT ready"}));
  assert.match(markup, /architect-browser-host/); assert.match(markup, /Reload ChatGPT/); assert.match(markup, /Retry browser attachment/); assert.match(markup, /ChatGPT ready/);
  assert.doesNotMatch(markup, /chatgpt\.com|figma-browser-tabbar|figma-browser-tab/);
});

test.beforeEach(() => {
  resetArchitectAttachmentGenerationForTest();
});

function visibleStatus(sequence = 1) {
  return {
    surfaceUrl: "https://chatgpt.com/",
    sessionPartition: "persist:champcity-architect",
    browserState: "loaded-auth-state-unknown",
    boundsSequence: sequence,
    attachmentGeneration: 1,
    attachment: {
      state: "attached-visible",
      isViewCreated: true,
      isAttachedToWindow: true,
      isVisible: true,
      bounds: {
        x: 10,
        y: 20,
        width: 600,
        height: 360,
        sequence,
      },
    },
    handoff: {
      state: "handoff-ready",
    },
    security: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: null,
    },
  };
}

function zeroStatus(sequence = 1) {
  return {
    ...visibleStatus(sequence),
    attachment: {
      state: "attached-zero-bounds",
      isViewCreated: true,
      isAttachedToWindow: true,
      isVisible: false,
      bounds: {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        sequence,
      },
    },
  };
}

function boundsAck(sequence = 1, attachmentState = "attached-visible", disposition = "accepted", generation = 1) {
  return {
    attachmentGeneration: generation,
    boundsSequence: sequence,
    attachmentState,
    disposition,
  };
}

test("renderer applies only the current Architect bounds ACK and preserves explicit failure state", () => {
  const expectation = { attachmentGeneration: 7, latestRequestedSequence: 12 };

  assert.deepEqual(reconcileArchitectBrowserBoundsAck(
    boundsAck(11, "attached-visible", "stale-sequence", 7),
    expectation,
  ), { applied: false });
  assert.deepEqual(reconcileArchitectBrowserBoundsAck(
    boundsAck(12, "attached-visible", "stale-generation", 6),
    expectation,
  ), { applied: false });
  assert.deepEqual(reconcileArchitectBrowserBoundsAck({
    ...boundsAck(12, "attach-failed", "failed", 7),
    lastError: "deterministic bounds failure",
  }, expectation), { applied: true, error: "deterministic bounds failure" });
  assert.deepEqual(reconcileArchitectBrowserBoundsAck(
    boundsAck(12, "attached-visible", "accepted", 7),
    expectation,
  ), { applied: true, error: "" });
});

test("zero-size Architect host does not invoke visible-success attachment", async () => {
  const calls = [];
  const errors = [];
  const coordinator = createArchitectAttachmentCoordinator({
    measureHost: () => ({ x: 0, y: 0, width: 0, height: 0 }),
    nextSequence: () => 1,
    onError: (message) => errors.push(message),
    onStatus: (status) => calls.push(status.attachment.state),
    setBounds: async () => boundsAck(),
    hideBrowser: async () => zeroStatus(),
    showBrowser: async () => {
      calls.push("show");
      return zeroStatus();
    },
    waitForNextFrame: async () => undefined,
    maxLayoutFrames: 1,
  });

  const result = await coordinator.attach();

  assert.equal(result.status, "failed");
  assert.deepEqual(calls, []);
  assert.match(errors.at(-1), /zero layout/i);
});

test("positive Architect host measurement calls show before sequenced bounds", async () => {
  const order = [];
  const coordinator = createArchitectAttachmentCoordinator({
    measureHost: () => ({ x: 11, y: 22, width: 640, height: 400 }),
    nextSequence: () => 7,
    onError: () => undefined,
    onStatus: (status) => order.push(`status:${status.attachment.state}`),
    setBounds: async (bounds) => {
      order.push(`bounds:${bounds.sequence}:${bounds.width}x${bounds.height}`);
      assert.equal(bounds.attachmentGeneration, 1);
      return boundsAck(bounds.sequence);
    },
    hideBrowser: async () => zeroStatus(),
    showBrowser: async (generation) => {
      order.push(`show:${generation}`);
      return zeroStatus(6);
    },
    waitForNextFrame: async () => undefined,
  });

  const result = await coordinator.attach();

  assert.equal(result.status, "attached-visible");
  assert.deepEqual(order, [
    "show:1",
    "status:attached-zero-bounds",
    "bounds:7:640x400",
  ]);
});

test("stale Architect attachment completion is ignored", async () => {
  let resolveShow;
  const statuses = [];
  const coordinator = createArchitectAttachmentCoordinator({
    measureHost: () => ({ x: 1, y: 2, width: 500, height: 300 }),
    nextSequence: () => 1,
    onError: () => undefined,
    onStatus: (status) => statuses.push(status.attachment.state),
    setBounds: async () => boundsAck(),
    hideBrowser: async () => zeroStatus(),
    showBrowser: () => new Promise((resolve) => {
      resolveShow = resolve;
    }),
    waitForNextFrame: async () => undefined,
  });

  const pending = coordinator.attach();
  await Promise.resolve();
  coordinator.invalidate();
  resolveShow(zeroStatus());

  assert.equal((await pending).status, "stale");
  assert.deepEqual(statuses, []);
});

test("Strict Mode replay cannot let the first completion override the second attempt", async () => {
  let resolveFirstShow;
  let showCall = 0;
  const statuses = [];
  const coordinator = createArchitectAttachmentCoordinator({
    measureHost: () => ({ x: 4, y: 5, width: 700, height: 420 }),
    nextSequence: () => showCall,
    onError: () => undefined,
    onStatus: (status) => statuses.push(status.attachment.bounds.sequence),
    setBounds: async (bounds) => boundsAck(bounds.sequence, "attached-visible", "accepted", bounds.attachmentGeneration),
    hideBrowser: async () => zeroStatus(),
    showBrowser: () => {
      showCall += 1;
      if (showCall === 1) {
        return new Promise((resolve) => {
          resolveFirstShow = resolve;
        });
      }
      return Promise.resolve(zeroStatus(showCall));
    },
    waitForNextFrame: async () => undefined,
  });

  const first = coordinator.attach();
  await Promise.resolve();
  const second = coordinator.attach();
  await Promise.resolve();
  resolveFirstShow(zeroStatus(1));

  assert.equal((await first).status, "stale");
  assert.equal((await second).status, "attached-visible");
  assert.deepEqual(statuses, [2]);
});

test("Retry uses a new generation and current Architect host measurement", async () => {
  let width = 0;
  let sequence = 0;
  const bounds = [];
  const errors = [];
  const coordinator = createArchitectAttachmentCoordinator({
    measureHost: () => ({ x: 1, y: 1, width, height: width / 2 }),
    nextSequence: () => {
      sequence += 1;
      return sequence;
    },
    onError: (message) => errors.push(message),
    onStatus: () => undefined,
    setBounds: async (nextBounds) => {
      bounds.push(nextBounds);
      return boundsAck(nextBounds.sequence, "attached-visible", "accepted", 2);
    },
    hideBrowser: async () => zeroStatus(),
    showBrowser: async () => zeroStatus(sequence),
    waitForNextFrame: async () => undefined,
    maxLayoutFrames: 0,
  });

  assert.equal((await coordinator.attach()).status, "failed");
  width = 800;
  assert.equal((await coordinator.retry()).status, "attached-visible");

  assert.equal(coordinator.getGeneration(), 2);
  assert.equal(bounds.at(-1).width, 800);
  assert.equal(errors.at(-1), "");
});

test("Retry failure preserves a visible error until later success clears it", async () => {
  let measurement = { x: 0, y: 0, width: 0, height: 0 };
  let visibleError = "prior attachment error";
  const coordinator = createArchitectAttachmentCoordinator({
    measureHost: () => measurement,
    nextSequence: () => 3,
    onError: (message) => {
      visibleError = message;
    },
    onStatus: () => undefined,
    setBounds: async (bounds) => boundsAck(bounds.sequence, "attached-visible", "accepted", 2),
    hideBrowser: async () => zeroStatus(),
    showBrowser: async () => zeroStatus(),
    waitForNextFrame: async () => undefined,
    maxLayoutFrames: 0,
  });

  assert.equal((await coordinator.retry()).status, "failed");
  assert.match(visibleError, /zero layout/i);

  measurement = { x: 3, y: 4, width: 600, height: 340 };
  assert.equal((await coordinator.retry()).status, "attached-visible");
  assert.equal(visibleError, "");
});

test("leaving Architect Interview invalidates pending attachment work", async () => {
  let resolveShow;
  const statuses = [];
  const coordinator = createArchitectAttachmentCoordinator({
    measureHost: () => ({ x: 1, y: 2, width: 500, height: 300 }),
    nextSequence: () => 1,
    onError: () => undefined,
    onStatus: (status) => statuses.push(status.attachment.state),
    setBounds: async () => boundsAck(),
    hideBrowser: async () => zeroStatus(),
    showBrowser: () => new Promise((resolve) => {
      resolveShow = resolve;
    }),
    waitForNextFrame: async () => undefined,
  });

  const pending = coordinator.attach();
  await Promise.resolve();
  coordinator.invalidate();
  resolveShow(zeroStatus());

  assert.equal((await pending).status, "stale");
  assert.deepEqual(statuses, []);
});

test("detach carries the current generation through zero bounds and hide", async () => {
  const calls = [];
  let sequence = 0;
  const coordinator = createArchitectAttachmentCoordinator({
    measureHost: () => ({ x: 1, y: 2, width: 500, height: 300 }),
    nextSequence: () => {
      sequence += 1;
      return sequence;
    },
    onError: () => undefined,
    onStatus: (status) => calls.push(`status:${status.attachment.state}`),
    setBounds: async (bounds) => {
      calls.push(`bounds:${bounds.attachmentGeneration}:${bounds.width}x${bounds.height}`);
      return boundsAck(
        bounds.sequence,
        bounds.width === 0 ? "attached-zero-bounds" : "attached-visible",
        "accepted",
        bounds.attachmentGeneration,
      );
    },
    hideBrowser: async (generation) => {
      calls.push(`hide:${generation}`);
      return zeroStatus(sequence);
    },
    showBrowser: async (generation) => {
      calls.push(`show:${generation}`);
      return zeroStatus(sequence);
    },
    waitForNextFrame: async () => undefined,
  });

  assert.equal((await coordinator.attach()).status, "attached-visible");
  await coordinator.detach();

  assert.deepEqual(calls, [
    "show:1",
    "status:attached-zero-bounds",
    "bounds:1:500x300",
    "bounds:2:0x0",
    "hide:2",
    "status:attached-zero-bounds",
  ]);
});

test("stale detach and hide completions cannot override a newer browser attachment", async () => {
  let resolveHide;
  const firstCalls = [];
  const secondCalls = [];
  const first = createArchitectAttachmentCoordinator({
    measureHost: () => ({ x: 1, y: 2, width: 500, height: 300 }),
    nextSequence: () => 1,
    onError: () => undefined,
    onStatus: (status) => firstCalls.push(status.attachment.state),
    setBounds: async (bounds) => boundsAck(
      bounds.sequence,
      bounds.width === 0 ? "attached-zero-bounds" : "attached-visible",
      "accepted",
      bounds.attachmentGeneration,
    ),
    hideBrowser: () => new Promise((resolve) => {
      resolveHide = resolve;
    }),
    showBrowser: async () => zeroStatus(),
    waitForNextFrame: async () => undefined,
  });
  const second = createArchitectAttachmentCoordinator({
    measureHost: () => ({ x: 3, y: 4, width: 700, height: 420 }),
    nextSequence: () => 2,
    onError: () => undefined,
    onStatus: (status) => secondCalls.push(status.attachment.state),
    setBounds: async (bounds) => boundsAck(bounds.sequence, "attached-visible", "accepted", bounds.attachmentGeneration),
    hideBrowser: async () => zeroStatus(),
    showBrowser: async () => zeroStatus(),
    waitForNextFrame: async () => undefined,
  });

  assert.equal((await first.attach()).status, "attached-visible");
  const staleDetach = first.detach();
  await Promise.resolve();
  assert.equal((await second.attach()).status, "attached-visible");
  resolveHide(zeroStatus());
  await staleDetach;

  assert.deepEqual(firstCalls, [
    "attached-zero-bounds",
  ]);
  assert.deepEqual(secondCalls, [
    "attached-zero-bounds",
  ]);
});

test("Architect browser retry visibility is derived from attachment failure state", () => {
  assert.equal(shouldShowArchitectBrowserRetry(null), false);
  assert.equal(shouldShowArchitectBrowserRetry(zeroStatus()), false);
  assert.equal(shouldShowArchitectBrowserRetry({
    ...visibleStatus(),
    attachment: {
      ...visibleStatus().attachment,
      state: "attach-failed",
      isVisible: false,
      lastError: "failed",
    },
  }), true);
  assert.equal(shouldShowArchitectBrowserRetry(visibleStatus(), "zero layout"), true);
  assert.equal(shouldShowArchitectBrowserRetry(visibleStatus()), false);
});

const recoveredArchitect = loadRendererSourceModule("src/renderer/app/ArchitectInterviewShell.tsx");
const {GreenfieldArchitectWorkspace} = loadRendererSourceModule("src/renderer/app/GreenfieldArchitectWorkspace.tsx");
test("recovered Architect Interview keeps faithful independent panes and browser visibility", () => {
  for(const browserVisible of [true,false]) {
    const markup=renderToStaticMarkup(React.createElement(recoveredArchitect.ArchitectInterviewShell,{label:"Architect Interview",browserVisible,document:{selectedDocument:null,documentError:"",feedback:"",onCopy(){}},reviewControls:React.createElement('button',null,'Apply Review'),browserCompanion:React.createElement('div',{className:'figma-browser-column'},'Browser')}));
    assert.match(markup,/figma-doc-chat-workspace/);assert.match(markup,/figma-doc-review-column/);assert.match(markup,/figma-browser-column/);assert.match(markup,/tabindex="-1"/);
    assert.equal(markup.includes('chat-hidden'),!browserVisible);
    assert.ok(markup.indexOf('Apply Review')<markup.indexOf('figma-browser-column'));
  }
});
test("recovered Architect Browser Actions retain historical order, revision labels and supplied readiness", () => {
  const props={canPrepareHandoff:false,canCopyHandoff:false,onReloadBrowser(){},onPrepareHandoff(){},onCopyHandoff(){},onRefresh(){},onRetryBrowser(){},showRetryButton:true};
  const markup=renderToStaticMarkup(React.createElement(recoveredArchitect.ArchitectInterviewBrowserActions,props));
  let last=-1;for(const label of ['Reload ChatGPT','Prepare Handoff','Copy Handoff','Refresh','Retry Browser']) {const pos=markup.indexOf(label);assert.ok(pos>last,label);last=pos;}
  assert.match(markup,/disabled=""/);
  assert.equal((markup.match(/>Prepare Handoff</g)||[]).length,1);
  assert.equal((markup.match(/>Copy Handoff</g)||[]).length,1);
  assert.doesNotMatch(markup,/Regenerate|Final Draft/);
  const fs=require('node:fs');
  for(const [file,name] of [['ArchitectInterviewShell','ArchitectInterview'],['ProjectPlanningReviewShell','ProjectPlanning'],['ProjectPhaseMapShell','ProjectPhaseMap'],['PhaseInterviewShell','PhaseInterview'],['PhasePlanningShell','PhasePlanning'],['WorkCardPlanningShell','WorkCardPlanning']]) {
    assert.equal(renderToStaticMarkup(React.createElement(loadRendererSourceModule('src/renderer/app/'+file+'.tsx')[name+'BrowserActions'],props)),markup);
    assert.match(fs.readFileSync('src/renderer/app/'+file+'.tsx','utf8'),new RegExp('export \\{WorkflowCandidateBrowserActions as '+name+'BrowserActions\\}'));
    assert.doesNotMatch(fs.readFileSync('src/renderer/app/'+file+'.tsx','utf8'),/Regenerate Interview Prompt|Final Draft Handoff|figma-browser-actions-row/);
  }
  assert.doesNotMatch(fs.readFileSync('src/renderer/app/WorkflowCandidateBrowserActions.tsx','utf8'),/window\.champcity|from ["'][^"']*(?:main\/|projectStateService|sqlite)/);
  const revision=renderToStaticMarkup(React.createElement(recoveredArchitect.ArchitectInterviewBrowserActions,{...props,isRevisionRequest:true}));assert.match(revision,/Prepare Revision Request/);assert.match(revision,/Copy Revision Request/);
});
test("recovered Greenfield Architect binds SQL handoff callbacks and current review version", async () => {
  const originals={useState:React.useState,useEffect:React.useEffect,useMemo:React.useMemo,useRef:React.useRef};const oldWindow=global.window;let index=0;const calls=[];
  const model={workflowId:'exact-workflow',workflowType:'project-creation',ready:true,railStatus:'Awaiting Approval',handoff:'SQL handoff',review:{cycleId:'sql-cycle',recordVersion:4,disposition:{state:'proposed'}},reviewDocument:{logicalDocumentId:'sql-doc',displayFilename:'ARCHITECT.md',effectiveDisposition:'Pending'},nextStageReady:false};
  const values=[model,'notes','Approved','','',false,'architect-review'];
  React.useState=initial=>[index<values.length?values[index++]:initial,()=>{}];React.useEffect=()=>{};React.useRef=initial=>({current:initial});React.useMemo=f=>f();
  global.window={champcity:{reviewStructuredArchitectOutput:async(...args)=>{calls.push(args);return model;},prepareStructuredArchitectWorkspace:async(...args)=>{calls.push(args);return model;}}};
  try {
    const element=GreenfieldArchitectWorkspace({workflowId:'exact-workflow',browserVisible:true,browserCompanion:null});
    assert.equal(element.type.name,'ArchitectInterviewShell');
    const review=React.Children.toArray(element.props.reviewControls.props.children).find(node=>node.type?.name==='FigmaDocumentDispositionPanel');
    assert.ok(review);review.props.onApply();await new Promise(resolve=>setImmediate(resolve));
    assert.deepEqual(calls[0],['exact-workflow','sql-cycle',{expectedRecordVersion:4,outcome:'approved',notes:'notes'}]);
    const actions=element.props.browserCompanion.props.children[1];assert.equal(actions.props.canCopyHandoff,true);actions.props.onPrepareHandoff();await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(calls[1],['exact-workflow']);
  } finally {Object.assign(React,originals);global.window=oldWindow;}
});
test('attached load failure presents unavailable, bounded redacted diagnostics and Retry',()=>{
  const {ApplicationBrowserHost}=loadRendererSourceModule('src/renderer/app/ApplicationBrowserHost.tsx');
  const original={useState:React.useState,useEffect:React.useEffect,useRef:React.useRef};let i=0;
  const status={...visibleStatus(),browserState:'load-failed',navigationDiagnostics:[{frame:'main-frame',eventType:'did-fail-load',destinationHost:'chatgpt.com',loadResult:{success:false,code:-105}}]};
  React.useState=initial=>[i++===0?status:'',()=>{}];React.useEffect=()=>{};React.useRef=initial=>({current:initial});
  try {const html=renderToStaticMarkup(React.createElement(ApplicationBrowserHost));assert.match(html,/Browser unavailable/);assert.doesNotMatch(html,/ChatGPT ready/);assert.match(html,/chatgpt.com.*did-fail-load.*-105/);assert.match(html,/Retry browser attachment/);assert.equal(shouldShowArchitectBrowserRetry(status),true);} finally {Object.assign(React,original);}
});
test('Greenfield Architect refresh reveals and selects current review slots without JSON entry',async()=>{
 const originals={useState:React.useState,useEffect:React.useEffect,useMemo:React.useMemo,useRef:React.useRef},old=global.window;let index=0;
 const intake={logicalDocumentId:'intake'},review={logicalDocumentId:'review'},model={intakeDocument:intake,ready:true};
 const values=[model,'','','','',false,'intake'];React.useState=initial=>{const i=index++;return[values[i]??initial,v=>{values[i]=typeof v==='function'?v(values[i]):v;}];};React.useEffect=()=>{};React.useRef=initial=>({current:initial});React.useMemo=f=>f();
 global.window={champcity:{getStructuredArchitectWorkspace:async()=>({...model,reviewDocument:review,review:{cycleId:'current',recordVersion:2,disposition:{state:'none'}}})}};
 try {let element=GreenfieldArchitectWorkspace({workflowId:'wf',browserVisible:true,browserCompanion:null});assert.deepEqual(element.props.document.slots.map(x=>x.displayLabel),['Project Intake']);element.props.browserCompanion.props.children[1].props.onRefresh();await new Promise(setImmediate);index=0;element=GreenfieldArchitectWorkspace({workflowId:'wf',browserVisible:true,browserCompanion:null});assert.deepEqual(element.props.document.slots.map(x=>x.displayLabel),['Project Intake','Architect Review']);assert.equal(element.props.document.selectedSlotId,'architect-review');assert.equal(element.props.document.selectedDocument,review);
 const source=require('node:fs').readFileSync('src/renderer/app/GreenfieldArchitectWorkspace.tsx','utf8');assert.doesNotMatch(source,/<textarea|saveStructuredArchitectOutput|Save Architect output/);assert.doesNotMatch(source,/finalDraftHandoff|onRegeneratePrompt|FinalDraftHandoff/);
 }finally{Object.assign(React,originals);global.window=old;}
});


test('Reload recovers detached and zero bounds before page reload; healthy Reload preserves attachment', async () => {
  const {registerArchitectBrowserRecovery,reloadArchitectBrowserWithRecovery} = loadRendererSourceModule('src/renderer/app/architectBrowserRecovery.ts');
  const oldWindow = global.window;
  const calls = [];
  let state = 'detached', result = {status:'attached-visible',generation:3};
  const unregister = registerArchitectBrowserRecovery({retry:async()=>{calls.push('retry');return result;},getGeneration:()=>3});
  global.window = {champcity:{getArchitectBrowserFoundationStatus:async()=>({attachment:{state}}),reloadArchitectBrowser:async()=>{calls.push('reload');return visibleStatus();}}};
  try {
    for(state of ['detached','attached-zero-bounds']) {calls.length=0;await reloadArchitectBrowserWithRecovery();assert.deepEqual(calls,['retry','reload']);}
    state='attached-visible';calls.length=0;await reloadArchitectBrowserWithRecovery();assert.deepEqual(calls,['reload']);
    state='detached';result={status:'failed',generation:3,message:'zero layout'};calls.length=0;
    await assert.rejects(reloadArchitectBrowserWithRecovery(),/zero layout/);assert.deepEqual(calls,['retry']);
  } finally {unregister();global.window=oldWindow;}
});
