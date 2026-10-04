const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  attachArchitectBrowserSurface,
  architectBrowserSecuritySummary,
  configureArchitectBrowserServiceForTest,
  getArchitectBrowserFoundationStatus,
  getArchitectSurfaceUrl,
  resetArchitectBrowserServiceForTest,
  setArchitectBrowserBounds,
  subscribeArchitectBrowserFoundationStatus,
} = require("../../dist/main/browser/architectBrowserService.js");
const {
  __setPlanningRepositorySnapshotTestHooks,
} = require("../../dist/main/documents/planningRepositorySnapshot.js");
const {
  tempWorkspace,
} = require("../support/canonical-markdown-fixtures.cjs");

test.afterEach(() => {
  resetArchitectBrowserServiceForTest();
  __setPlanningRepositorySnapshotTestHooks();
});

test("Architect browser foundation status is secure, repository-free, and side-effect-free", () => {
  const root = tempWorkspace("champcity-browser-handoff-");
  const before = fs.readdirSync(root);
  const counters = { planning: 0 };
  __setPlanningRepositorySnapshotTestHooks({
    onSnapshotAcquisition: () => { counters.planning += 1; },
    onInventoryScan: () => { counters.planning += 1; },
    onContentRead: () => { counters.planning += 1; },
  });

  let status;
  for (let index = 0; index < 25; index += 1) {
    status = getArchitectBrowserFoundationStatus();
  }

  assert.equal(getArchitectSurfaceUrl(), "https://chatgpt.com/");
  assert.deepEqual(architectBrowserSecuritySummary(), {
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
    preload: null,
  });
  assert.equal("handoff" in status, false);
  assert.deepEqual(counters, { planning: 0 });
  assert.deepEqual(fs.readdirSync(root), before);
});

test("121 accepted and stale bounds updates preserve narrow ACK fencing with zero repository work", () => {
  const counters = { planning: 0 };
  __setPlanningRepositorySnapshotTestHooks({
    onSnapshotAcquisition: () => { counters.planning += 1; },
    onInventoryScan: () => { counters.planning += 1; },
    onContentRead: () => { counters.planning += 1; },
  });
  const { view, window } = fakeBrowserBoundary();
  configureArchitectBrowserServiceForTest({ createView: () => view });
  attachArchitectBrowserSurface(window, 4);

  for (let sequence = 1; sequence <= 120; sequence += 1) {
    setArchitectBrowserBounds({
      x: sequence,
      y: sequence,
      width: 600,
      height: 360,
      sequence,
      attachmentGeneration: 4,
    });
  }
  const accepted = setArchitectBrowserBounds({
    x: 121,
    y: 121,
    width: 640,
    height: 400,
    sequence: 121,
    attachmentGeneration: 4,
  });
  const stale = setArchitectBrowserBounds({
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    sequence: 3,
    attachmentGeneration: 3,
  });

  assert.equal(accepted.attachmentState, "attached-visible");
  assert.equal(accepted.disposition, "accepted");
  assert.equal(accepted.attachmentGeneration, 4);
  assert.equal(accepted.boundsSequence, 121);
  assert.equal(stale.disposition, "stale-generation");
  assert.equal(stale.boundsSequence, 121);
  assert.equal(view.bounds.at(-1).sequence, 121);
  assert.ok(Buffer.byteLength(JSON.stringify(accepted), "utf8") <= 512);
  assert.deepEqual(counters, { planning: 0 });
});

test("browser runtime changes are pushed without repository projection work", () => {
  const counters = { planning: 0 };
  __setPlanningRepositorySnapshotTestHooks({
    onSnapshotAcquisition: () => { counters.planning += 1; },
    onInventoryScan: () => { counters.planning += 1; },
    onContentRead: () => { counters.planning += 1; },
  });
  const { view, window } = fakeBrowserBoundary();
  configureArchitectBrowserServiceForTest({ createView: () => view });
  const states = [];
  const unsubscribe = subscribeArchitectBrowserFoundationStatus((status) => {
    states.push(status.browserState);
  });

  attachArchitectBrowserSurface(window, 1);
  view.webContents.emit("did-start-loading");
  view.webContents.emit("did-stop-loading");
  unsubscribe();
  view.webContents.emit("did-start-loading");

  assert.ok(states.includes("loading"));
  assert.ok(states.includes("loaded-auth-state-unknown"));
  assert.equal(states.at(-1), "loaded-auth-state-unknown");
  assert.deepEqual(counters, { planning: 0 });
});

test("browser preload and IPC execute without workspace resolution and unsubscribe notifications", async () => {
  const ts = require("typescript");
  const vm = require("node:vm");
  const service = require("../../dist/main/browser/architectBrowserService.js");
  const source = fs.readFileSync(path.join(__dirname, "../../src/main/main.ts"), "utf8");
  const ast = ts.createSourceFile("main.ts", source, ts.ScriptTarget.Latest, true);
  const registrations = ast.statements.filter((node) => ts.isExpressionStatement(node) && ts.isCallExpression(node.expression) &&
    node.expression.arguments[0]?.text?.startsWith("architectBrowser:"));
  const handlers = new Map();
  const { view, window } = fakeBrowserBoundary();
  configureArchitectBrowserServiceForTest({ createView: () => view });
  let repositoryReads = 0;
  __setPlanningRepositorySnapshotTestHooks({ onSnapshotAcquisition: () => { repositoryReads += 1; } });
  vm.runInNewContext(ts.transpileModule(registrations.map((node) => node.getText(ast)).join("\n"), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
    ...service, mainWindow: window,
    getRequiredWorkspaceRoot: () => assert.fail("Browser IPC resolved a workspace"),
    ipcMain: { handle: (channel, callback) => handlers.set(channel, callback) },
  });
  const events = new EventEmitter();
  let api;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../../dist/preload/index.js"), "utf8"), {
    exports: {}, require: (id) => {
      assert.equal(id, "electron");
      return {
        contextBridge: { exposeInMainWorld: (key, value) => { assert.equal(key, "champcity"); api = value; } },
        ipcRenderer: Object.assign(events, { invoke: async (channel, ...args) => handlers.get(channel)({}, ...args) }),
      };
    },
  });
  const notifications = [];
  const unsubscribe = api.onArchitectBrowserFoundationStatus((status) => notifications.push(status));
  const status = await api.getArchitectBrowserFoundationStatus();
  assert.equal("handoff" in status, false);
  await api.showArchitectBrowser(1);
  const bounds = await api.setArchitectBrowserBounds({ x: 0, y: 0, width: 640, height: 480, sequence: 1, attachmentGeneration: 1 });
  assert.equal(bounds.disposition, "accepted");
  await api.confirmArchitectSignedIn();
  await api.reloadArchitectBrowser();
  await api.hideArchitectBrowser(1);
  events.emit("architectBrowser:statusChanged", {}, status);
  assert.deepEqual(notifications, [status]);
  unsubscribe();
  events.emit("architectBrowser:statusChanged", {}, status);
  assert.equal(notifications.length, 1);
  assert.equal(events.listenerCount("architectBrowser:statusChanged"), 0);
  assert.equal(repositoryReads, 0);
  for (const forbidden of ["fs", "require", "ipcRenderer", "shell", "process"]) assert.equal(Object.hasOwn(api, forbidden), false);
});

function fakeBrowserBoundary() {
  class FakeWebContents extends EventEmitter {
    constructor() {
      super();
      this.id = 7;
      this.url = "https://chatgpt.com/";
    }
    setWindowOpenHandler() {}
    getURL() { return this.url; }
    isDestroyed() { return false; }
    loadURL(url) { this.url = url; return Promise.resolve(); }
    reload() {}
    focus() {}
    close() {}
  }
  const webContents = new FakeWebContents();
  const view = {
    webContents,
    bounds: [],
    setBounds(bounds) { this.bounds.push({ ...bounds }); },
  };
  const window = new EventEmitter();
  window.contentView = {
    addChildView: () => undefined,
    removeChildView: () => undefined,
  };
  window.isDestroyed = () => false;
  window.focus = () => undefined;
  return { view, window };
}
const service = require('../../dist/main/browser/architectBrowserService.js');
for (const url of ['', 'about:blank', 'https://example.com/private?secret=hidden', 'https://chatgpt.com/']) test(`browser recovery selects navigation for ${url.split('?')[0] || 'empty'}`, () => {
  const {view,window}=fakeBrowserBoundary();configureArchitectBrowserServiceForTest({createView:()=>view});attachArchitectBrowserSurface(window,1);
  let loads=[],reloads=0;view.webContents.url=url;view.webContents.loadURL=async value=>{loads.push(value);};view.webContents.reload=()=>{reloads++;};
  service.reloadArchitectBrowserSurface();assert.equal(reloads,url==='https://chatgpt.com/'?1:0);assert.deepEqual(loads,url==='https://chatgpt.com/'?[]:[getArchitectSurfaceUrl()]);
});
test('failed allowed browser surface explicitly returns to configured ChatGPT URL',()=>{
  const {view,window}=fakeBrowserBoundary();configureArchitectBrowserServiceForTest({createView:()=>view});attachArchitectBrowserSurface(window,1);
  view.webContents.emit('did-fail-load',{},-105,'NAME_NOT_RESOLVED','https://chatgpt.com/',true);let target;view.webContents.loadURL=async url=>{target=url;};view.webContents.reload=()=>assert.fail('failed surface must navigate');
  assert.equal(service.reloadArchitectBrowserSurface().browserState,'loading');assert.equal(target,getArchitectSurfaceUrl());
});


test("renderer remount accepts sequence one in a new generation and reuses the native session", async () => {
  const {createArchitectAttachmentCoordinator, resetArchitectAttachmentGenerationForTest} = require('../../dist/shared/architectInterview/architectBrowserAttachmentCoordinator.js');
  resetArchitectAttachmentGenerationForTest();
  const {view,window} = fakeBrowserBoundary();
  let creations = 0, resolveOldBounds;
  configureArchitectBrowserServiceForTest({createView: () => {creations++; return view;}});
  const coordinator = (delayDetach = false) => {
    let sequence = 0;
    return createArchitectAttachmentCoordinator({
      measureHost: () => ({x:5,y:10,width:640,height:400}), nextSequence: () => ++sequence,
      onError: () => {}, onStatus: () => {}, waitForNextFrame: async () => {},
      showBrowser: async generation => attachArchitectBrowserSurface(window,generation),
      hideBrowser: async generation => service.detachArchitectBrowserSurface(generation),
      setBounds: async bounds => {
        const ack = setArchitectBrowserBounds(bounds);
        if(delayDetach && bounds.width === 0) return new Promise(resolve => {resolveOldBounds = () => resolve(ack);});
        return ack;
      },
    });
  };
  const first = coordinator(true);
  assert.equal((await first.attach()).status,'attached-visible');
  setArchitectBrowserBounds({x:5,y:10,width:640,height:400,sequence:20,attachmentGeneration:first.getGeneration()});
  const oldDetach = first.detach();
  await Promise.resolve();
  const second = coordinator();
  assert.equal((await second.attach()).status,'attached-visible');
  assert.equal(getArchitectBrowserFoundationStatus().boundsSequence,1);
  resolveOldBounds(); await oldDetach;
  const status = getArchitectBrowserFoundationStatus();
  assert.equal(status.attachment.state,'attached-visible');
  assert.equal(status.boundsSequence,1);
  assert.equal(status.attachmentGeneration,second.getGeneration());
  assert.equal(creations,1);
  assert.equal(view.webContents.getURL(),'https://chatgpt.com/');
  let current = second;
  for (let cycle = 0; cycle < 3; cycle++) {
    setArchitectBrowserBounds({x:5,y:10,width:640,height:400,sequence:20,attachmentGeneration:current.getGeneration()});
    const detached = await current.detach();
    assert.equal(detached.attachment.state,'detached');
    current = coordinator();
    assert.equal((await current.attach()).status,'attached-visible');
    assert.equal(getArchitectBrowserFoundationStatus().boundsSequence,1);
    assert.equal(creations,1);
    assert.equal(view.webContents.getURL(),'https://chatgpt.com/');
  }

  assert.equal(setArchitectBrowserBounds({x:0,y:0,width:0,height:0,sequence:99,attachmentGeneration:1}).disposition,'stale-generation');
  assert.equal(setArchitectBrowserBounds({x:0,y:0,width:0,height:0,sequence:0,attachmentGeneration:current.getGeneration()}).disposition,'stale-sequence');
});
