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

test("both production sibling directions delegate to the shared launch boundary", () => {
  const mainSource = fs.readFileSync(path.join(repositoryRoot, "src/main/main.ts"), "utf8");
  const serviceHostSource = fs.readFileSync(
    path.join(repositoryRoot, "src/main/agentHarness/runtime/agentHarnessServiceHost.ts"),
    "utf8",
  );

  assert.match(mainSource, /await launchDetachedChampCitySiblingProcess\(\{/);
  assert.match(serviceHostSource, /return launchDetachedChampCitySiblingProcess\(\{/);
  assert.doesNotMatch(mainSource, /cwd: app\.getAppPath\(\)/);
  assert.doesNotMatch(serviceHostSource, /cwd: application\.getAppPath\(\)/);
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
