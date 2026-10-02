const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const test = require("node:test");
const repoRoot = path.resolve(__dirname, "../..");

function wiring(scope) {
  const source = fs.readFileSync(path.join(repoRoot, "src/main/main.ts"), "utf8");
  const ast = ts.createSourceFile("main.ts", source, ts.ScriptTarget.Latest, true);
  const registrations = ast.statements.filter((node) => ts.isExpressionStatement(node) && ts.isCallExpression(node.expression) &&
    ts.isPropertyAccessExpression(node.expression.expression) && node.expression.expression.expression.getText(ast) === "ipcMain" && node.expression.expression.name.text === "handle");
  const handlers = new Map();
  vm.runInNewContext(ts.transpileModule(registrations.map((node) => node.getText(ast)).join("\n"), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
    ...scope, ipcMain: { handle: (channel, handler) => { assert.equal(handlers.has(channel), false); handlers.set(channel, handler); } },
  });
  let api;
  const invocations = [];
  vm.runInNewContext(fs.readFileSync(path.join(repoRoot, "dist/preload/index.js"), "utf8"), {
    exports: {}, require: (id) => {
      assert.equal(id, "electron");
      return { contextBridge: { exposeInMainWorld: (key, value) => { assert.equal(key, "champcity"); api = value; } },
        ipcRenderer: { invoke: async (channel, ...args) => { invocations.push(channel); assert.ok(handlers.has(channel), channel); return handlers.get(channel)({}, ...args); } } };
    },
  });
  return { api, handlers, invocations };
}


test("retired migrated-workflow API methods and IPC handlers are absent", () => {
  const { api, handlers } = wiring({});
  for (const method of ["getCurrentWorkspaceModel", "getIssueValidationProjection", "applyIssueValidationDecision", "getIssueCloseProjection", "closeIssue", "getArchitectOutputWorkspaceModel", "getCurrentWorkCardMapProjection", "startCodexImplementerExecution"]) assert.equal(Object.hasOwn(api, method), false, method);
  for (const channel of ["issueResolution:getValidationProjection", "issueResolution:applyValidationDecision", "currentWorkflow:getModel", "codexImplementer:start"]) assert.equal(handlers.has(channel), false, channel);
});

test("production catalog resolves six active definitions with eight output slots", () => {
  const catalog = require("../../dist/main/architectOutputs/productionArchitectOutputCatalog.js");
  const expected = [
    ["project-planning", "project-planning-review"],
    ["phase-map", "project-phase-map"], ["phase-interview", "phase-interview"],
    ["phase-planning-bundle", "phase-planning-bundle"], ["formal-work-card", "work-card-planning"], ["repair-work-card", "work-card-repair"],
  ];
  const definitions = catalog.activeProductionArchitectOutputDefinitions();
  assert.deepEqual(definitions.map((entry) => [entry.outputKind, entry.owningWorkspaceId]), expected);
  assert.equal(definitions.reduce((count, entry) => count + entry.slots.length, 0), 8);
  for (const entry of definitions) assert.equal(catalog.resolveProductionArchitectOutputDefinition(entry.outputKind, entry.owningWorkspaceId), entry);
  assert.throws(() => catalog.resolveProductionArchitectOutputDefinition("unknown", "work-card-planning"), /Unknown/);
});
