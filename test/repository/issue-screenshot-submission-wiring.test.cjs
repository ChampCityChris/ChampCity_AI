const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const test = require("node:test");
const { createLightweightIssueRecord } = require("../../dist/main/issueResolution/issueResolutionService.js");
const { loadRendererSourceModule } = require("../renderer/renderer-source-loader.cjs");
const screenshotIntake = loadRendererSourceModule("src/renderer/app/issueScreenshotIntake.ts");
const repoRoot = path.resolve(__dirname, "../..");

function runFunction(file, name, scope) {
  const text = fs.readFileSync(path.join(repoRoot, file), "utf8");
  const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let found;
  function visit(node) { if (ts.isFunctionDeclaration(node) && node.name?.text === name) found = node; ts.forEachChild(node, visit); }
  visit(ast);
  assert.ok(found, `Callable renderer boundary ${name}`);
  return vm.runInNewContext(ts.transpileModule(`(${found.getText(ast)})`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, { Error, ...scope });
}

test("screenshot submission executes intake, App, preload, main, and the single Issue writer", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-screenshot-wiring-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64");
  const pending = [{ id: "image-1", mimeType: "image/png", base64: png.toString("base64"), sourceByteCount: png.length, width: 1, height: 1, previewUrl: "blob:fixture" }];
  const calls = [];
  const handlers = new Map();
  const main = fs.readFileSync(path.join(repoRoot, "src/main/main.ts"), "utf8");
  const ast = ts.createSourceFile("main.ts", main, ts.ScriptTarget.Latest, true);
  const registration = ast.statements.find((node) => ts.isExpressionStatement(node) && ts.isCallExpression(node.expression) && node.expression.arguments[0]?.text === "issueResolution:createIssue");
  assert.ok(registration);
  vm.runInNewContext(ts.transpileModule(registration.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
    ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) }, getRequiredWorkspaceRoot: () => root,
    createLightweightIssueRecord: (selectedRoot, input) => { calls.push({ selectedRoot, input }); return createLightweightIssueRecord(selectedRoot, input); },
  });
  let api;
  const channels = [];
  vm.runInNewContext(fs.readFileSync(path.join(repoRoot, "dist/preload/index.js"), "utf8"), {
    exports: {}, require: (id) => {
      assert.equal(id, "electron");
      return { contextBridge: { exposeInMainWorld: (_key, value) => { api = value; } }, ipcRenderer: {
        invoke: async (channel, ...args) => { channels.push(channel); assert.ok(handlers.has(channel)); return handlers.get(channel)({}, ...args); },
      } };
    },
  });
  const state = {};
  const appCreate = runFunction("src/renderer/app/App.tsx", "createIssue", {
    window: { champcity: api }, setIsIssueCreating: (value) => { state.creating = value; }, setIssueInventoryError: (value) => { state.error = value; },
    setIssueInventory: (value) => { state.inventory = value; }, setSelectedIssueId: (value) => { state.issueId = value; }, setActiveIssueStageId: (value) => { state.stage = value; },
  });
  let resets = 0;
  const input = { title: "Screenshot issue", issue: "Evidence captured", currentConsequence: "Review needed" };
  const submit = runFunction("src/renderer/app/IssueResolutionWorkspace.tsx", "submitNewIssue", {
    ...screenshotIntake, input, pendingScreenshotsRef: { current: pending }, activePasteCountRef: { current: 0 }, submissionInFlightRef: { current: false }, isCreating: false,
    setFormError() {}, setScreenshotError() {}, onCreateIssue: appCreate, resetCompletedIntake: () => { resets += 1; },
  });
  await submit({ preventDefault() {} });
  assert.deepEqual(channels, ["issueResolution:createIssue"]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].selectedRoot, root);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0].input)), { ...input, screenshots: [{ mimeType: "image/png", base64: png.toString("base64") }] });
  assert.equal(state.issueId, "ISSUE_001");
  assert.equal(state.stage, "intake");
  assert.equal(state.creating, false);
  assert.equal(state.error, "");
  assert.equal(state.inventory.issues.length, 1);
  assert.equal(resets, 1);
  assert.deepEqual(fs.readFileSync(path.join(root, "issues/ISSUE_001/evidence/screenshot-001.png")), png);
  const record = fs.readFileSync(path.join(root, state.inventory.issues[0].recordPath), "utf8");
  assert.match(record, /issues\/ISSUE_001\/evidence\/screenshot-001\.png/);

  pending[0].base64 = "invalid-image";
  await submit({ preventDefault() {} });
  assert.equal(calls.length, 2);
  assert.equal(channels.length, 2);
  assert.equal(resets, 1, "failed creation must retain intake for retry");
  assert.ok(state.error);
  assert.equal(state.creating, false);
  assert.equal(fs.existsSync(path.join(root, "issues/ISSUE_002")), false);
});
