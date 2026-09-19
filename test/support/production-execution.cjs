const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const root = path.resolve(__dirname, "../..");

function parse(relativePath) {
  return ts.createSourceFile(relativePath, fs.readFileSync(path.join(root, relativePath), "utf8"),
    ts.ScriptTarget.Latest, true, relativePath.endsWith("tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
}

function execute(source, scope) {
  return vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText, { Error, ...scope });
}

// AST selection is only a loader: callers assert results of unmodified production bodies.
function loadProductionFunctions(relativePath, names, scope = {}) {
  const ast = parse(relativePath);
  const functions = new Map();
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && names.includes(node.name?.text)) {
      assert.equal(functions.has(node.name.text), false, `Ambiguous callable: ${node.name.text}`);
      functions.set(node.name.text, node.getText(ast));
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  for (const name of names) assert.ok(functions.has(name), `Missing callable: ${name}`);
  return execute(`${[...functions.values()].join("\n")}\n({${names.join(",")}});`, scope);
}

function mainPreloadHarness(channels, scope) {
  const ast = parse("src/main/main.ts");
  const registrations = ast.statements.filter((node) => ts.isExpressionStatement(node) &&
    ts.isCallExpression(node.expression) && ts.isPropertyAccessExpression(node.expression.expression) &&
    ts.isIdentifier(node.expression.expression.expression) &&
    node.expression.expression.expression.text === "ipcMain" && node.expression.expression.name.text === "handle" &&
    channels.includes(node.expression.arguments[0]?.text));
  const handlers = new Map();
  execute(registrations.map((node) => node.getText(ast)).join("\n"), {
    ...scope,
    ipcMain: { handle(channel, handler) {
      assert.equal(handlers.has(channel), false);
      handlers.set(channel, handler);
    } },
  });
  for (const channel of channels) assert.ok(handlers.has(channel), `Missing IPC registration: ${channel}`);
  let api;
  const invocations = [];
  vm.runInNewContext(fs.readFileSync(path.join(root, "dist/preload/index.js"), "utf8"), {
    exports: {},
    require(id) {
      assert.equal(id, "electron");
      return {
        contextBridge: { exposeInMainWorld(key, value) { assert.equal(key, "champcity"); api = value; } },
        ipcRenderer: { async invoke(channel, ...args) {
          invocations.push({ channel, args });
          assert.ok(handlers.has(channel), `Unbound IPC channel: ${channel}`);
          return handlers.get(channel)({}, ...args);
        } },
      };
    },
  });
  assert.ok(api);
  return { api, invocations };
}

module.exports = { loadProductionFunctions, mainPreloadHarness };
