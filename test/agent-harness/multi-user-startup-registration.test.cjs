const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("../support/windows-test.cjs");

const vm = require("node:vm");
const { createRequire } = require("node:module");
const installedScope = require(
  "../../dist/main/agentHarness/runtime/champCityInstalledScope.js"
);
const lifecycleSettings = require(
  "../../dist/main/agentHarness/runtime/agentHarnessServiceHostLifecycleSettings.js"
);
const installLifecycle = require(
  "../../dist/main/agentHarness/runtime/agentHarnessInstallLifecycle.js"
);
const startupRegistration = require(
  "../../dist/main/agentHarness/runtime/agentHarnessServiceHostStartupRegistration.js"
);
const backgroundIntent = require(
  "../../dist/main/agentHarness/runtime/backgroundAgentIntent.js"
);
const descriptor = require(
  "../../dist/main/agentHarness/runtime/agentHarnessServiceHostDescriptor.js"
);
const oauthStore = require(
  "../../dist/main/agentHarness/runtime/oauthStore.js"
);
const { RegisteredWorkspaceRegistry } = require(
  "../../dist/main/agentHarness/workspace/registeredWorkspaceRegistry.js"
);

const machineMetadata = (launchAtLoginDefault) => ({
  schemaVersion: 1,
  installScope: "all-users",
  backgroundAgentLaunchAtLoginDefault: launchAtLoginDefault,
});

test("installed-scope metadata defaults only when absent and parses the exact versioned contract", (t) => {
  const resourcesRoot = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-install-scope-"));
  t.after(() => fs.rmSync(resourcesRoot, { recursive: true, force: true }));
  assert.deepEqual(installedScope.readChampCityInstalledScopeMetadata(resourcesRoot), {
    schemaVersion: 1,
    installScope: "current-user",
    backgroundAgentLaunchAtLoginDefault: true,
  });

  const target = installedScope.getChampCityInstalledScopeMetadataPath(resourcesRoot);
  const expected = machineMetadata(false);
  fs.writeFileSync(target, `${JSON.stringify(expected)}\n`, "utf8");
  assert.deepEqual(installedScope.readChampCityInstalledScopeMetadata(resourcesRoot), expected);

  const malformedRecords = [
    "{ malformed",
    "null",
    "[]",
    JSON.stringify({ schemaVersion: 2, installScope: "all-users", backgroundAgentLaunchAtLoginDefault: true }),
    JSON.stringify({ schemaVersion: 1, installScope: "everyone", backgroundAgentLaunchAtLoginDefault: true }),
    JSON.stringify({ schemaVersion: 1, installScope: "all-users", backgroundAgentLaunchAtLoginDefault: "true" }),
    JSON.stringify({ ...machineMetadata(true), unexpectedOwnership: true }),
  ];
  for (const source of malformedRecords) {
    fs.writeFileSync(target, source, "utf8");
    assert.throws(
      () => installedScope.readChampCityInstalledScopeMetadata(resourcesRoot),
      (error) => error.name === "ChampCityInstalledScopeMetadataError" &&
        !error.message.includes(resourcesRoot),
    );
  }
});

test("all-users default true initializes one user's durable preference and observes one exact machine trigger without HKCU mutation", async (t) => {
  const userDataRoot = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-machine-user-"));
  t.after(() => fs.rmSync(userDataRoot, { recursive: true, force: true }));
  let loginMutationCount = 0;
  const windowsRun = require("../../dist/main/agentHarness/runtime/windowsRunObservation.js");
  const runObserver = t.mock.method(windowsRun, "observeCurrentUserWindowsRunValue", () => {
    assert.fail("all-users startup ownership must not inspect the per-user HKCU Run value");
  });
  const app = machineApplication(userDataRoot, () => { loginMutationCount += 1; });

  await installLifecycle.configureInstalledBackgroundAgent(
    app,
    false,
    "win32",
    machineMetadata(true),
  );

  assert.deepEqual(lifecycleSettings.readAgentHarnessServiceHostLifecycleSettings(userDataRoot), {
    launchAtLogin: true,
  });
  assert.equal(loginMutationCount, 0);
  assert.equal(runObserver.mock.callCount(), 0);
  const status = startupRegistration.readAgentHarnessServiceHostStartupRegistration(
    app,
    packagedTarget(),
    { launchAtLogin: true },
    "win32",
    machineMetadata(true),
  );
  assert.deepEqual(status, {
    launchAtLogin: true,
    loginItemRegistered: true,
    executableWillLaunchAtLogin: true,
    startupRegistrationSupported: true,
    startupRegistrationScope: "machine",
  });
});

test("all-users default false blocks startup-origin continuation before Service Host runtime construction", async (t) => {
  const userDataRoot = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-machine-opt-out-"));
  t.after(() => fs.rmSync(userDataRoot, { recursive: true, force: true }));
  const settings = lifecycleSettings.initializeAgentHarnessServiceHostLifecycleSettings(
    userDataRoot,
    machineMetadata(false).backgroundAgentLaunchAtLoginDefault,
  );
  assert.deepEqual(settings, { launchAtLogin: false });
  assert.equal(backgroundIntent.prepareBackgroundAgentStartupIntent(userDataRoot, {
    startupOrigin: true,
    launchAtLogin: settings.launchAtLogin,
  }), false);
  assert.equal(fs.existsSync(descriptor.getAgentHarnessServiceHostDescriptorPath(userDataRoot)), false);

  const entry = path.resolve(__dirname, "../../dist/main/agentHarness/runtime/agentHarnessServiceHost.js");
  const nativeRequire = createRequire(entry);
  const calls = [];
  const forbidConstruction = (name) => class {
    constructor() { calls.push(name); throw new Error(`Unexpected ${name} construction`); }
  };
  const mocks = {
    electron: { powerMonitor: {} },
    "./champCityInstalledScope": { readChampCityInstalledScopeMetadata: () => machineMetadata(false) },
    "./backgroundAgentIntent": {
      prepareBackgroundAgentStartupIntent: (...args) => {
        calls.push("startup-intent");
        const allowed = backgroundIntent.prepareBackgroundAgentStartupIntent(...args);
        assert.equal(allowed, false);
        return allowed;
      },
    },
    "./agentHarnessController": { AgentHarnessController: forbidConstruction("controller") },
    "./backgroundAgentTray": { BackgroundAgentTrayController: forbidConstruction("tray") },
    "./agentHarnessServiceLifecycle": { AgentHarnessServiceLifecycleCoordinator: forbidConstruction("lifecycle") },
    "./agentHarnessServiceHostServer": { AgentHarnessServiceHostServer: forbidConstruction("server") },
    "./agentHarnessBuildIdentity": { computeAgentHarnessRuntimeBuildIdentity() {
      calls.push("runtime-build");
      throw new Error("Opted-out startup must not initialize runtime identity");
    } },
  };
  const exports = {};
  vm.runInNewContext(fs.readFileSync(entry, "utf8"), {
    exports, __dirname: path.dirname(entry),
    process: { platform: "win32", argv: [startupRegistration.agentHarnessServiceHostStartupOriginArgument], env: {} },
    require: (id) => Object.hasOwn(mocks, id) ? mocks[id] : nativeRequire(id),
  });
  await exports.runAgentHarnessServiceHost({
    getPath: () => userDataRoot,
    exit: (code) => calls.push(["exit", code]),
  });
  assert.deepEqual(calls, ["startup-intent", ["exit", 0]]);
  assert.equal(fs.existsSync(descriptor.getAgentHarnessServiceHostDescriptorPath(userDataRoot)), false);
});

test("all-users initialization never overwrites an existing user's stored choice", (t) => {
  const userDataRoot = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-machine-preserve-"));
  t.after(() => fs.rmSync(userDataRoot, { recursive: true, force: true }));
  lifecycleSettings.initializeAgentHarnessServiceHostLifecycleSettings(userDataRoot, false);
  assert.deepEqual(
    lifecycleSettings.initializeAgentHarnessServiceHostLifecycleSettings(userDataRoot, true),
    { launchAtLogin: false },
  );
  assert.deepEqual(
    JSON.parse(fs.readFileSync(lifecycleSettings.getAgentHarnessServiceHostLifecycleSettingsPath(userDataRoot), "utf8")),
    { schemaVersion: 1, launchAtLogin: false },
  );
});

test("current-user scope retains the exact Electron user login-item mutation and confirmation path", (t) => {
  const windowsRun = require(
    "../../dist/main/agentHarness/runtime/windowsRunObservation.js"
  );
  const target = startupRegistration.computeAgentHarnessServiceHostLoginLaunchTarget(packagedTarget());
  t.mock.method(windowsRun, "observeCurrentUserWindowsRunValue", () => ({
    state: "present",
    command: `"${target.path}" ${target.args.join(" ")}`,
  }));
  let written = null;
  const app = {
    setLoginItemSettings(value) { written = value; },
    getLoginItemSettings(query) {
      assert.deepEqual(query, target);
      return {
        openAtLogin: false,
        executableWillLaunchAtLogin: false,
        launchItems: [{
          name: startupRegistration.agentHarnessServiceHostLoginItemName,
          path: target.path,
          args: target.args,
          scope: "user",
          enabled: true,
        }],
      };
    },
  };
  const result = startupRegistration.applyAgentHarnessServiceHostStartupRegistration(
    app,
    packagedTarget(),
    { launchAtLogin: true },
    "win32",
  );
  assert.deepEqual(written, {
    openAtLogin: true,
    enabled: true,
    name: "ChampCity Background Agent",
    path: target.path,
    args: target.args,
  });
  assert.equal(result.windowsVerification.confirmed, true);
  assert.equal(result.startupRegistrationScope, "user");
});

test("machine trigger verification rejects every named identity mismatch and never falls back to summary booleans", () => {
  const target = startupRegistration.computeAgentHarnessServiceHostLoginLaunchTarget(packagedTarget());
  const exact = machineLaunchItem(target);
  assert.equal(startupRegistration.evaluateWindowsMachineLoginItemSettings({
    openAtLogin: false,
    executableWillLaunchAtLogin: false,
    launchItems: [exact],
  }, target).confirmed, true);
  for (const launchItems of [
    undefined,
    [],
    [{ ...exact, name: "Wrong name" }],
    [{ ...exact, scope: "user" }],
    [{ ...exact, path: "C:\\Wrong\\ChampCityAI.exe" }],
    [{ ...exact, args: [...exact.args].reverse() }],
    [{ ...exact, args: [] }],
    [{ ...exact, enabled: false }],
    [exact, exact],
  ]) {
    const result = startupRegistration.evaluateWindowsMachineLoginItemSettings({
      openAtLogin: true,
      executableWillLaunchAtLogin: true,
      launchItems,
    }, target);
    assert.equal(result.confirmed, false);
    assert.equal(result.registered && result.enabled, false);
  }
});

test("all-users tray wording separates the user's preference from installer-owned machine trigger ownership", () => {
  const tray = require("../../dist/main/agentHarness/runtime/backgroundAgentTray.js");
  const actions = {
    openChampCity() {},
    startMcpRuntime() {},
    stopMcpRuntime() {},
    restartBackgroundAgent() {},
    setLaunchAtLogin() {},
    exitBackgroundAgent() {},
  };
  const menu = tray.buildBackgroundAgentTrayMenuTemplate({
    backgroundAgentState: "Ready",
    mcpRuntimeState: "Running",
    mcpRunning: true,
    mcpStartEligible: false,
    mcpStopEligible: true,
  }, false, actions, "machine");
  const labels = menu.map((item) => item.label).filter(Boolean);
  assert.ok(labels.includes("Windows startup trigger: Managed for everyone"));
  assert.ok(labels.includes("Start Background Agent for my Windows user at sign-in"));
  assert.equal(labels.includes("Start at Windows sign-in"), false);
});

test("two synthetic users keep lifecycle, endpoint, stop, OAuth, and workspace state isolated", async (t) => {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-two-users-"));
  t.after(() => fs.rmSync(container, { recursive: true, force: true }));
  const userA = path.join(container, "user-a");
  const userB = path.join(container, "user-b");
  const workspace = path.join(container, "Project_A");
  fs.mkdirSync(workspace, { recursive: true });
  fs.writeFileSync(path.join(workspace, "README.md"), "synthetic user A workspace\n", "utf8");

  lifecycleSettings.initializeAgentHarnessServiceHostLifecycleSettings(userA, true);
  lifecycleSettings.initializeAgentHarnessServiceHostLifecycleSettings(userB, false);
  assert.deepEqual(lifecycleSettings.readAgentHarnessServiceHostLifecycleSettings(userA), { launchAtLogin: true });
  assert.deepEqual(lifecycleSettings.readAgentHarnessServiceHostLifecycleSettings(userB), { launchAtLogin: false });
  assert.notEqual(
    descriptor.getAgentHarnessServiceHostControlAddress(userA),
    descriptor.getAgentHarnessServiceHostControlAddress(userB),
  );

  backgroundIntent.writeBackgroundAgentExplicitStopIntent(userA, "2026-09-12T12:00:00.000Z");
  assert.equal(backgroundIntent.readBackgroundAgentIntent(userA).state, "explicit-stop");
  assert.equal(backgroundIntent.readBackgroundAgentIntent(userB).state, "clear");

  oauthStore.registerOAuthClient(userA, {
    redirect_uris: ["http://127.0.0.1/callback"],
    client_name: "Synthetic user A",
  });
  assert.equal(oauthStore.readOAuthStoreDiagnostics(userA).clientCount, 1);
  assert.equal(oauthStore.readOAuthStoreDiagnostics(userB).clientCount, 0);

  const registryA = new RegisteredWorkspaceRegistry({ userDataRoot: userA });
  const registryB = new RegisteredWorkspaceRegistry({ userDataRoot: userB });
  await registryA.register(workspace);
  assert.deepEqual(registryA.snapshot().workspaces.map((entry) => entry.workspaceId), ["project_a"]);
  assert.deepEqual(registryB.snapshot().workspaces, []);
});

function packagedTarget() {
  return {
    isPackaged: true,
    executablePath: "C:\\Program Files\\ChampCity AI\\ChampCityAI.exe",
    applicationPath: "C:\\Program Files\\ChampCity AI\\resources\\app.asar",
  };
}

function machineLaunchItem(target) {
  return {
    name: startupRegistration.agentHarnessServiceHostLoginItemName,
    path: target.path,
    args: target.args,
    scope: "machine",
    enabled: true,
  };
}

function machineApplication(userDataRoot, onLoginMutation) {
  return {
    isPackaged: true,
    getPath(name) {
      assert.equal(name, "userData");
      return userDataRoot;
    },
    getAppPath() { return packagedTarget().applicationPath; },
    setLoginItemSettings() { onLoginMutation(); },
    getLoginItemSettings(query) {
      const target = { path: query.path, args: query.args };
      return {
        openAtLogin: false,
        executableWillLaunchAtLogin: false,
        launchItems: [machineLaunchItem(target)],
      };
    },
  };
}
