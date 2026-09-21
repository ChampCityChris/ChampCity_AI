const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),test=require("node:test");
const repositoryRoot=path.resolve(__dirname,"../..");
function read(relativePath){return fs.readFileSync(path.join(repositoryRoot,relativePath),"utf8");}


test("Desktop and Service Host controllers do not import worker-owned runtime implementations", () => {
  const ts = require("typescript");
  const runtimeRoot = "src/main/agentHarness/runtime/";
  const workerModules = ["agentHarnessService", "httpRuntime", "mcpServer"];
  const rules = [
    ["src/main/main.ts", [...workerModules, "agentHarnessController"]],
    [`${runtimeRoot}agentHarnessServiceHost.ts`, workerModules],
    [`${runtimeRoot}agentHarnessController.ts`, workerModules],
  ];
  for (const [file, forbidden] of rules) {
    const absolute = path.join(repositoryRoot, file);
    const tree = ts.createSourceFile(absolute, read(file), ts.ScriptTarget.Latest, true);
    const forbiddenPaths = forbidden.map((name) => path.join(repositoryRoot, runtimeRoot, name));
    forbiddenPaths.push(
      path.join(repositoryRoot, "src/main/agentHarness/tools/toolRegistry"),
      path.join(repositoryRoot, "src/main/agentHarness/repository/repositoryOperations"),
    );
    function visit(node) {
      let specifier;
      if ((ts.isImportDeclaration(node) && !node.importClause?.isTypeOnly) || ts.isExportDeclaration(node)) {
        specifier = node.moduleSpecifier;
      } else if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === "require"))) {
        specifier = node.arguments[0];
      }
      if (specifier && ts.isStringLiteralLike(specifier) && specifier.text.startsWith(".")) {
        const target = path.resolve(path.dirname(absolute), specifier.text);
        assert.equal(forbiddenPaths.some((entry) => [entry, `${entry}.ts`, `${entry}.js`].includes(target)), false,
          `${file} imports worker-owned module ${specifier.text}`);
      }
      ts.forEachChild(node, visit);
    }
    visit(tree);
  }
});

test("compiled bootstrap routes maintenance, Service Host, and Desktop modes with appropriate switches", async () => {
  const vm = require("node:vm");
  const { createRequire } = require("node:module");
  const entry = path.join(repositoryRoot, "dist/main/bootstrap.js");
  const nativeRequire = createRequire(entry);
  assert.equal(JSON.parse(read("package.json")).main, "dist/main/bootstrap.js");
  for (const [args, expectedRoute, expectedSwitches] of [
    [[], "desktop", []],
    [["--agent-harness-service-host"], "host", ["disable-gpu"]],
    [["--champcity-install-configure-background-agent=enabled", "--agent-harness-service-host"], "configure", ["headless", "disable-gpu"]],
    [["--champcity-uninstall-cleanup"], "cleanup", ["headless", "disable-gpu"]],
  ]) {
    const routes = [];
    const switches = [];
    const exits = [];
    let identityApplied = false;
    const application = {
      getPath: () => "fixture-app-data", setPath() {}, setName: () => { identityApplied = true; }, setAppUserModelId() {},
      commandLine: { appendSwitch: (value) => switches.push(value) },
      whenReady: async () => {}, exit: (code) => exits.push(code),
    };
    const record = (route) => { assert.equal(identityApplied, true); routes.push(route); };
    vm.runInNewContext(read("dist/main/bootstrap.js"), {
      exports: {}, console, process: { argv: ["fixture", ...args], env: {} },
      require: (id) => {
        if (id === "electron") return { app: application };
        if (id === "./main") { record("desktop"); return {}; }
        if (id === "./agentHarness/runtime/agentHarnessServiceHost") return { runAgentHarnessServiceHost: async () => record("host") };
        if (id === "./agentHarness/runtime/agentHarnessInstallLifecycle") return {
          ...nativeRequire(id),
          configureInstalledBackgroundAgent: async (_app, enabled) => { assert.equal(enabled, true); record("configure"); },
          cleanupBackgroundAgentForUninstall: async () => record("cleanup"),
        };
        return nativeRequire(id);
      },
    });
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(routes, [expectedRoute]);
    assert.deepEqual(switches, expectedSwitches);
    assert.deepEqual(exits, ["configure", "cleanup"].includes(expectedRoute) ? [0] : []);
  }
});

test("worker and host protocol validators accept registered-workspace controls and reject obsolete selected-project controls", () => {
  const worker = require("../../dist/main/agentHarness/runtime/agentHarnessProcessProtocol.js");
  const host = require("../../dist/main/agentHarness/runtime/agentHarnessServiceHostProtocol.js");
  for (const [validate, protocolVersion] of [
    [worker.isAgentHarnessControlRequest, worker.agentHarnessProcessProtocolVersion],
    [host.isAgentHarnessServiceHostRequest, host.agentHarnessServiceHostControlProtocolVersion],
  ]) {
    const request = { protocolVersion, kind: "request", requestId: "fixture-request", expectedInstanceId: "fixture-instance", payload: null };
    for (const operation of ["list-registered-workspaces", "register-workspace", "unregister-workspace"]) {
      const valid = { ...request, operation };
      assert.equal(validate(valid), true);
      assert.equal(validate({ ...valid, requestId: "" }), false);
      assert.equal(validate({ ...valid, protocolVersion: -1 }), false);
    }
    for (const operation of ["activate-workspace", "deactivate-workspace", "query-workspace-access", "confirm-workspace-access"]) {
      assert.equal(validate({ ...request, operation }), false);
    }
  }
});

test("worker unhandled rejection exits with failure for controller recovery", () => {
  const vm = require("node:vm");
  const { EventEmitter } = require("node:events");
  const workerProcess = new EventEmitter();
  workerProcess.parentPort = new EventEmitter();
  const exits = [];
  workerProcess.exit = (code) => exits.push(code);
  vm.runInNewContext(read("dist/main/agentHarness/runtime/agentHarnessWorker.js"), {
    exports: {},
    require: () => ({}),
    process: workerProcess,
  });
  assert.deepEqual(exits, []);
  workerProcess.emit("unhandledRejection", new Error("unexpected asynchronous worker failure"));
  assert.deepEqual(exits, [1]);
});
