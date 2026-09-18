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
  __setIssueProjectionReadTestHooks,
} = require("../../dist/main/issueResolution/issueResolutionService.js");
const {
  tempWorkspace,
} = require("../support/canonical-markdown-fixtures.cjs");

test.afterEach(() => {
  resetArchitectBrowserServiceForTest();
  __setPlanningRepositorySnapshotTestHooks();
  __setIssueProjectionReadTestHooks();
});

test("Architect browser foundation status is secure, repository-free, and side-effect-free", () => {
  const root = tempWorkspace("champcity-browser-handoff-");
  const before = fs.readdirSync(root);
  const counters = { planning: 0, issues: 0 };
  __setPlanningRepositorySnapshotTestHooks({
    onSnapshotAcquisition: () => { counters.planning += 1; },
    onInventoryScan: () => { counters.planning += 1; },
    onContentRead: () => { counters.planning += 1; },
  });
  __setIssueProjectionReadTestHooks({
    onMarkdownRead: () => { counters.issues += 1; },
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
  assert.deepEqual(counters, { planning: 0, issues: 0 });
  assert.deepEqual(fs.readdirSync(root), before);
});

test("121 accepted and stale bounds updates preserve narrow ACK fencing with zero repository work", () => {
  const counters = { planning: 0, issues: 0 };
  __setPlanningRepositorySnapshotTestHooks({
    onSnapshotAcquisition: () => { counters.planning += 1; },
    onInventoryScan: () => { counters.planning += 1; },
    onContentRead: () => { counters.planning += 1; },
  });
  __setIssueProjectionReadTestHooks({
    onMarkdownRead: () => { counters.issues += 1; },
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
  assert.deepEqual(counters, { planning: 0, issues: 0 });
});

test("browser runtime changes are pushed without repository projection work", () => {
  const counters = { planning: 0, issues: 0 };
  __setPlanningRepositorySnapshotTestHooks({
    onSnapshotAcquisition: () => { counters.planning += 1; },
    onInventoryScan: () => { counters.planning += 1; },
    onContentRead: () => { counters.planning += 1; },
  });
  __setIssueProjectionReadTestHooks({
    onMarkdownRead: () => { counters.issues += 1; },
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
  assert.deepEqual(counters, { planning: 0, issues: 0 });
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
  __setIssueProjectionReadTestHooks({ onMarkdownRead: () => { repositoryReads += 1; } });
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
