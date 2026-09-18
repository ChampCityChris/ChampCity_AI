const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repositoryRoot = path.resolve(__dirname, "../..");
const siblingLaunch = require(path.join(
  repositoryRoot,
  "dist/main/agentHarness/runtime/champCitySiblingProcessLaunch.js",
));

test("production Desktop and Service Host callers generate bounded sibling launch requests", async () => {
  const vm = require("node:vm");
  const targetModule = require("../../dist/main/agentHarness/runtime/agentHarnessServiceHostStartupRegistration.js");
  for (const isPackaged of [false, true]) {
    const invocations = [];
    const applicationPath = isPackaged ? path.join(repositoryRoot, "fixture/resources/app.asar") : repositoryRoot;
    const userDataRoot = path.join(repositoryRoot, "fixture-user-data");
    const application = Object.assign(new EventEmitter(), {
      isPackaged, getAppPath: () => applicationPath, getPath: () => userDataRoot,
      getVersion: () => "fixture", setPath() {}, requestSingleInstanceLock: () => true,
    });
    const launcher = {
      launchDetachedChampCitySiblingProcess: (options) => siblingLaunch.launchDetachedChampCitySiblingProcess(options, (command, args, spawnOptions) => {
        invocations.push({ command, args: Array.from(args), options: spawnOptions });
        const child = new MockChildProcess(777);
        queueMicrotask(() => child.emit("spawn"));
        return child;
      }),
    };
    const handlers = new Map();
    const mocks = {
      electron: { app: application, ipcMain: { handle: (channel, callback) => handlers.set(channel, callback) } },
      "../shared/productIdentity": { productIdentity: { productName: "fixture" } },
      "./sessionActiveWorkspaceSelection": { SessionActiveWorkspaceSelection: class {} },
      "./externalProviders/githubRuntime": { createGithubRuntimeOperations: () => ({}) },
      "./externalProviders/githubProviderService": { GithubProviderService: class {} },
      "./externalProviders/githubProviderIpc": { registerGithubProviderIpc() {} },
      "./workspaceEvidence/selectedWorkspaceEvidenceNotifier": { SelectedWorkspaceEvidenceNotifier: class {} },
      "./browser/architectBrowserService": { subscribeArchitectBrowserFoundationStatus() {} },
      "./agentHarness/runtime/desktopLifecycleLease": { acquireDesktopLifecycleLease: () => new Promise(() => {}) },
      "./agentHarness/runtime/agentHarnessBuildIdentity": { computeAgentHarnessRuntimeBuildIdentity: () => "fixture-build" },
      "./agentHarness/runtime/agentHarnessServiceHostClient": { AgentHarnessServiceHostClient: class {
        constructor(options) { this.options = options; }
        async status() { await this.options.launchServiceHost(); return { state: "fixture-launched" }; }
      } },
      "./agentHarness/runtime/agentHarnessServiceHostStartupRegistration": targetModule,
      "./agentHarness/runtime/champCitySiblingProcessLaunch": launcher,
      "./agentHarnessServiceHostStartupRegistration": targetModule,
      "./champCitySiblingProcessLaunch": launcher,
    };
    function execute(relativePath) {
      const entry = path.join(repositoryRoot, relativePath);
      const exports = {};
      vm.runInNewContext(fs.readFileSync(entry, "utf8"), {
        exports, __dirname: path.dirname(entry), console,
        process: { execPath: process.execPath, platform: process.platform, env: { ELECTRON_RUN_AS_NODE: "1" } },
        require: (id) => id.startsWith("node:") ? require(id) : mocks[id] ?? {},
      });
      return exports;
    }
    execute("dist/main/main.js");
    assert.equal((await handlers.get("agentHarness:status")()).state, "fixture-launched");
    const host = execute("dist/main/agentHarness/runtime/agentHarnessServiceHost.js");
    assert.equal(await host.launchChampCityDesktop(application, userDataRoot), 777);
    assert.equal(invocations.length, 2);
    for (const [index, invocation] of invocations.entries()) {
      assert.equal(invocation.command, process.execPath);
      assert.deepEqual(invocation.args, [
        ...isPackaged ? [] : [applicationPath],
        ...index === 0 ? ["--agent-harness-service-host"] : [],
      ]);
      assert.equal(invocation.options.cwd, isPackaged ? path.dirname(process.execPath) : applicationPath);
      assert.equal(invocation.options.detached, true);
      assert.equal(invocation.options.stdio, "ignore");
      assert.equal(invocation.options.windowsHide, index === 0);
      assert.equal(invocation.options.env.CHAMPCITY_USER_DATA_ROOT, userDataRoot);
      assert.equal(invocation.options.env.ELECTRON_RUN_AS_NODE, undefined);
    }
  }
});

test("sibling-process cwd uses the executable directory when packaged and the application directory in development", () => {
  const packagedInput = {
    isPackaged: true,
    executablePath: "C:\\Program Files\\ChampCity AI\\ChampCityAI.exe",
    applicationPath: "C:\\Program Files\\ChampCity AI\\resources\\app.asar",
  };
  const developmentInput = {
    isPackaged: false,
    executablePath: "C:\\tools\\electron.exe",
    applicationPath: "D:\\src\\ChampCity_AI",
  };

  const packagedCwd = siblingLaunch.resolveChampCitySiblingProcessWorkingDirectory(packagedInput);
  assert.equal(packagedCwd, "C:\\Program Files\\ChampCity AI");
  assert.notEqual(packagedCwd, packagedInput.applicationPath);
  assert.equal(
    siblingLaunch.resolveChampCitySiblingProcessWorkingDirectory(developmentInput),
    developmentInput.applicationPath,
  );
});

test("accepted sibling launch preserves detached options and unreferences only after spawn", async () => {
  const child = new MockChildProcess(4412);
  let invocation = null;
  const launchPromise = siblingLaunch.launchDetachedChampCitySiblingProcess({
    target: { path: "C:\\Program Files\\ChampCity AI\\ChampCityAI.exe", args: ["--agent-harness-service-host"] },
    launchTargetInput: {
      isPackaged: true,
      executablePath: "C:\\Program Files\\ChampCity AI\\ChampCityAI.exe",
      applicationPath: "C:\\Program Files\\ChampCity AI\\resources\\app.asar",
    },
    environment: { CHAMPCITY_USER_DATA_ROOT: "C:\\isolated-user-data" },
    windowsHide: true,
  }, (command, args, options) => {
    invocation = { command, args, options };
    queueMicrotask(() => child.emit("spawn"));
    return child;
  });

  assert.equal(child.unrefCount, 0);
  assert.equal(await launchPromise, 4412);
  assert.equal(child.unrefCount, 1);
  assert.deepEqual(invocation, {
    command: "C:\\Program Files\\ChampCity AI\\ChampCityAI.exe",
    args: ["--agent-harness-service-host"],
    options: {
      cwd: "C:\\Program Files\\ChampCity AI",
      detached: true,
      stdio: "ignore",
      windowsHide: true,
      env: { CHAMPCITY_USER_DATA_ROOT: "C:\\isolated-user-data" },
    },
  });
});

test("reverse packaged sibling launch uses the same executable-directory cwd for the foreground desktop", async () => {
  const child = new MockChildProcess(5513);
  let invocation = null;
  const result = siblingLaunch.launchDetachedChampCitySiblingProcess({
    target: { path: "C:\\Program Files\\ChampCity AI\\ChampCityAI.exe", args: [] },
    launchTargetInput: {
      isPackaged: true,
      executablePath: "C:\\Program Files\\ChampCity AI\\ChampCityAI.exe",
      applicationPath: "C:\\Program Files\\ChampCity AI\\resources\\app.asar",
    },
    environment: { CHAMPCITY_USER_DATA_ROOT: "C:\\isolated-user-data" },
    windowsHide: false,
  }, (command, args, options) => {
    invocation = { command, args, options };
    queueMicrotask(() => child.emit("spawn"));
    return child;
  });

  assert.equal(await result, 5513);
  assert.equal(invocation.options.cwd, "C:\\Program Files\\ChampCity AI");
  assert.equal(invocation.options.windowsHide, false);
  assert.deepEqual(invocation.args, []);
  assert.equal(child.unrefCount, 1);
});

test("sibling spawn error rejects through the launch promise without an unhandled error event", async () => {
  const child = new MockChildProcess(undefined);
  const spawnError = Object.assign(new Error("spawn failed"), { code: "ENOENT" });
  const launchPromise = siblingLaunch.launchDetachedChampCitySiblingProcess({
    target: { path: "C:\\Missing\\ChampCityAI.exe", args: [] },
    launchTargetInput: {
      isPackaged: true,
      executablePath: "C:\\Missing\\ChampCityAI.exe",
      applicationPath: "C:\\Missing\\resources\\app.asar",
    },
    environment: {},
    windowsHide: false,
  }, () => {
    queueMicrotask(() => child.emit("error", spawnError));
    return child;
  });

  await assert.rejects(launchPromise, (error) => error === spawnError);
  assert.equal(child.unrefCount, 0);
});

class MockChildProcess extends EventEmitter {
  constructor(pid) {
    super();
    this.pid = pid;
    this.unrefCount = 0;
  }

  unref() {
    this.unrefCount += 1;
  }
}
