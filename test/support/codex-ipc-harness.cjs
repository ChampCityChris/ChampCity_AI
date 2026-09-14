const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

// Execute the actual selected main registrations and the full compiled preload API.
function codexIpcHarness(service, manager, root) {
  const handlers = new Map();
  const channels = new Set(["codexImplementer:start", "issueResolution:startIssueCodex", "codexRuntime:getStatus", "codexRuntime:setSelection"]);
  const mainPath = path.join(__dirname, "../../src/main/main.ts");
  const source = fs.readFileSync(mainPath, "utf8");
  const ast = ts.createSourceFile(mainPath, source, ts.ScriptTarget.Latest, true);
  const registrations = ast.statements.filter((node) => ts.isExpressionStatement(node) && ts.isCallExpression(node.expression) &&
    node.expression.expression.getText(ast) === "ipcMain.handle" && channels.has(node.expression.arguments[0]?.text));
  if (registrations.length !== channels.size) throw Error("Required production IPC registration missing");
  const code = ts.transpileModule(registrations.map((node) => node.getText(ast)).join("\n"), {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(code, {
    ipcMain: { handle: (name, callback) => handlers.set(name, callback) },
    codexImplementerExecutionService: service, codexRuntimeManager: manager, getRequiredWorkspaceRoot: () => root,
  });
  let api;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../../dist/preload/index.js"), "utf8"), {
    exports: {}, require: (name) => {
      if (name !== "electron") throw Error(`Unexpected preload dependency: ${name}`);
      return {contextBridge: {exposeInMainWorld: (_key, value) => { api = value; }}, ipcRenderer: {
        invoke: (channel, ...args) => Promise.resolve(handlers.get(channel)({}, ...args)),
      }};
    },
  });
  return api;
}
module.exports = { codexIpcHarness };
