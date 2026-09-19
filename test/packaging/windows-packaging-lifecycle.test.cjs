const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const net = require("node:net");
const test = require("node:test");

const repositoryRoot = path.join(__dirname, "..", "..");
const lifecycle = require("../../dist/main/agentHarness/runtime/agentHarnessInstallLifecycle.js");
const intent = require("../../dist/main/agentHarness/runtime/backgroundAgentIntent.js");
const settings = require("../../dist/main/agentHarness/runtime/agentHarnessServiceHostLifecycleSettings.js");
const startup = require("../../dist/main/agentHarness/runtime/agentHarnessServiceHostStartupRegistration.js");
const windowsRun = require("../../dist/main/agentHarness/runtime/windowsRunObservation.js");
const realObserveRun = windowsRun.observeCurrentUserWindowsRunValue;
let fakeRunObservation = { state: "absent" };
test.beforeEach((t) => {
  fakeRunObservation = { state: "absent" };
  t.mock.method(windowsRun, "observeCurrentUserWindowsRunValue", (name) => {
    assert.equal(name, startup.agentHarnessServiceHostLoginItemName);
    return fakeRunObservation;
  });
});
const descriptor = require("../../dist/main/agentHarness/runtime/agentHarnessServiceHostDescriptor.js");
const identity = require("../../dist/shared/productIdentity.js");
const codexRuntime = require("../../dist/main/workCardBuilding/codexRuntimeOperations.js");
const desktopLease = require("../../dist/main/agentHarness/runtime/desktopLifecycleLease.js");

test("compiled maintenance bootstrap completes before importing Desktop or Service Host", async () => {
  const vm = require("node:vm");
  const { createRequire } = require("node:module");
  const entry = path.join(repositoryRoot, "dist/main/bootstrap.js");
  const nativeRequire = createRequire(entry);
  for (const [argument, operation] of [["--champcity-install-configure-background-agent=enabled", "configure"], ["--champcity-uninstall-cleanup", "cleanup"]]) {
    const events = [];
    const app = { setPath() {}, getPath: () => "fixture-data", setName() {}, setAppUserModelId() {},
      commandLine: { appendSwitch: (value) => events.push(value) }, whenReady: async () => {}, exit: (code) => events.push(["exit", code]),
    };
    vm.runInNewContext(fs.readFileSync(entry, "utf8"), {
      exports: {}, console, process: {
        argv: ["fixture", argument, "--agent-harness-service-host"], env: {},
        set title(_value) { assert.fail("Maintenance must preserve native process identity"); },
      },
      require: (id) => {
        if (["./main", "./agentHarness/runtime/agentHarnessServiceHost"].includes(id)) assert.fail(`Maintenance imported ${id}`);
        if (id === "electron") return { app };
        if (id === "./agentHarness/runtime/agentHarnessInstallLifecycle") return { ...lifecycle,
          configureInstalledBackgroundAgent: async (_app, enabled) => { assert.equal(enabled, true); events.push("configure"); },
          cleanupBackgroundAgentForUninstall: async () => events.push("cleanup"),
        };
        return nativeRequire(id);
      },
    });
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(events, ["headless", "disable-gpu", operation, ["exit", 0]]);
  }
});

test("compiled Desktop waits for Electron ownership, lifecycle lease, and readiness before window creation", async () => {
  const vm = require("node:vm");
  const { EventEmitter } = require("node:events");
  for (const ownsElectronLock of [false, true]) {
    const events = [];
    let admitLease;
    let admitReady;
    const lease = new Promise((resolve) => { admitLease = resolve; });
    const ready = new Promise((resolve) => { admitReady = resolve; });
    const app = Object.assign(new EventEmitter(), {
      getVersion: () => "fixture", getPath: () => "fixture-data", isPackaged: false,
      requestSingleInstanceLock: () => { events.push("electron-lock"); return ownsElectronLock; },
      whenReady: () => { events.push("ready-request"); return ready; }, quit: () => events.push("quit"),
    });
    const mocks = {
      electron: { app, ipcMain: { handle() {} }, BrowserWindow: class extends EventEmitter {
        constructor() { super(); events.push("window"); this.webContents = new EventEmitter(); }
        loadFile() {} isDestroyed() { return false; } isMinimized() { return false; } show() {} focus() {}
      } },
      "../shared/productIdentity": { productIdentity: { productName: "fixture" } },
      "./sessionActiveWorkspaceSelection": { SessionActiveWorkspaceSelection: class {} },
      "./externalProviders/githubRuntime": { createGithubRuntimeOperations: () => ({}) },
      "./externalProviders/githubProviderService": { GithubProviderService: class { async restore() {} } },
      "./externalProviders/githubProviderIpc": { registerGithubProviderIpc() {} },
      "./workspaceEvidence/selectedWorkspaceEvidenceNotifier": { SelectedWorkspaceEvidenceNotifier: class {} },
      "./browser/architectBrowserService": { subscribeArchitectBrowserFoundationStatus() {} },
      "./agentHarness/runtime/desktopLifecycleLease": { acquireDesktopLifecycleLease: (_root, owner) => { assert.equal(owner, "desktop"); events.push("lease-request"); return lease; } },
      "./workCardBuilding/codexRuntimeManager": { codexRuntimeManager: { initialize: async () => {} } },
      "./workCardBuilding/codexRuntimeInitializerClient": { CodexRuntimeInitializerClient: class {} },
      "./workCardBuilding/codexRuntimeOperations": { createCodexRuntimeExecutionOperations: () => ({}) },
      "./agentHarness/runtime/agentHarnessBuildIdentity": { computeAgentHarnessRuntimeBuildIdentity: () => "fixture-build" },
      "./agentHarness/runtime/agentHarnessServiceHostClient": { AgentHarnessServiceHostClient: class { async startBackgroundAgent() { events.push("agent-start"); } } },
      "./agentHarness/runtime/champCityInstalledScope": { readChampCityInstalledScopeMetadata: () => ({ backgroundAgentLaunchAtLoginDefault: false }) },
      "./agentHarness/runtime/agentHarnessServiceHostLifecycleSettings": { initializeAgentHarnessServiceHostLifecycleSettings: () => ({ launchAtLogin: false }) },
      "./agentHarness/runtime/agentHarnessServiceHostStartupRegistration": { applyAgentHarnessServiceHostStartupRegistration() {} },
    };
    const entry = path.join(repositoryRoot, "dist/main/main.js");
    vm.runInNewContext(fs.readFileSync(entry, "utf8"), {
      exports: {}, __dirname: path.dirname(entry), console,
      process: {
        env: {}, execPath: process.execPath, platform: process.platform,
        set title(_value) { assert.fail("Desktop must preserve native process identity"); },
      },
      require: (id) => id.startsWith("node:") ? require(id) : mocks[id] ?? {},
    });
    app.emit("second-instance");
    assert.deepEqual(events, ownsElectronLock ? ["electron-lock", "lease-request"] : ["electron-lock", "quit"]);
    if (!ownsElectronLock) continue;
    admitLease({ acquired: true, lease: { leaseId: "fixture" } });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(events.includes("window"), false);
    assert.equal(events.at(-1), "ready-request");
    admitReady();
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(events, ["electron-lock", "lease-request", "ready-request", "agent-start", "window"]);
    app.emit("second-instance");
    assert.equal(events.filter((event) => event === "window").length, 1);
    assert.equal(events.filter((event) => event === "agent-start").length, 1);
  }
});

test("Windows package identity is legal, stable, branded, bounded, and preserves V1 userData identity", () => {
  const config = fs.readFileSync(path.join(repositoryRoot, "electron-builder.yml"), "utf8");
  assert.match(config, /^appId: ChampCity\.AI$/m);
  assert.match(config, /^productName: ChampCity A\/I$/m);
  assert.match(config, /^artifactName: ChampCityAI-Setup-\$\{version\}\.\$\{ext\}$/m);
  assert.match(config, /^\s+executableName: ChampCityAI$/m);
  assert.match(config, /^\s+shortcutName: ChampCity AI$/m);
  assert.match(config, /^\s+uninstallDisplayName: ChampCity A\/I \$\{version\}$/m);
  assert.match(config, /dist\/branding\/ChampCity-AI\.ico/);
  assert.match(config, /node_modules\/@openai\/codex-win32-x64\/vendor\/\*\*\/\*/);
  assert.match(config, /^\s+- dist\/main\/\*\*\/\*$/m);
  assert.doesNotMatch(config, /^\s+- (planning|repair|issues|test|\.git)\//m);
  assert.equal(
    identity.resolveChampCityUserDataRoot(path.join("isolated", "AppData", "Roaming")),
    path.join("isolated", "AppData", "Roaming", "champcity-ai"),
  );
});

test("NSIS disclosure exposes one visible startup choice and delegates lifecycle work without image-name killing", () => {
  const installer = fs.readFileSync(path.join(repositoryRoot, "packaging/windows/installer.nsh"), "utf8");
  assert.match(installer, /includes a Background Agent that can start when you sign in to Windows/);
  assert.match(installer, /may remain running after the desktop window closes/);
  assert.match(installer, /This option does not enable public Internet access/);
  assert.match(installer, /Start ChampCity Background Agent at Windows sign-in \(recommended\)/);
  assert.match(installer, /--champcity-install-configure-background-agent=\$ChampCityBackgroundAgentStartupChoice/);
  assert.match(installer, /--champcity-uninstall-cleanup/);
  assert.match(installer, /application data and credentials are preserved in your Windows profile/);
  assert.match(installer, /!macro customCheckAppRunning\s*!macroend/);
  assert.doesNotMatch(installer, /taskkill|Stop-Process|KILL_PROCESS/i);
});

test("install lifecycle mode parsing is exact and mutually exclusive", () => {
  assert.deepEqual(lifecycle.parseChampCityInstallLifecycleMode(["ChampCityAI.exe"]), { kind: "none" });
  assert.deepEqual(lifecycle.parseChampCityInstallLifecycleMode([
    "ChampCityAI.exe",
    "--champcity-install-configure-background-agent=enabled",
  ]), { kind: "install-configure", launchAtLogin: true });
  assert.deepEqual(lifecycle.parseChampCityInstallLifecycleMode([
    "ChampCityAI.exe",
    "--champcity-install-configure-background-agent=disabled",
  ]), { kind: "install-configure", launchAtLogin: false });
  assert.deepEqual(lifecycle.parseChampCityInstallLifecycleMode([
    "ChampCityAI.exe",
    "--champcity-uninstall-cleanup",
  ]), { kind: "uninstall-cleanup" });
  for (const args of [
    ["--champcity-install-configure-background-agent=yes"],
    ["--champcity-install-configure-background-agent"],
    ["--champcity-install-configure-background-agent=enabled", "--champcity-uninstall-cleanup"],
  ]) {
    assert.throws(
      () => lifecycle.parseChampCityInstallLifecycleMode(args),
      (error) => error.exitCode === lifecycle.champCityMaintenanceExitCode.malformedArgument,
    );
  }
});

test("install configuration uses the installed executable target and clears inherited stop only when enabled", async () => {
  const enabledRoot = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-install-enabled-"));
  const enabledApp = fakePackagedApplication(enabledRoot);
  intent.writeBackgroundAgentExplicitStopIntent(enabledRoot, "2026-09-10T12:00:00.000Z");
  await lifecycle.configureInstalledBackgroundAgent(enabledApp, true, "win32");
  assert.deepEqual(settings.readAgentHarnessServiceHostLifecycleSettings(enabledRoot), { launchAtLogin: true });
  assert.deepEqual(intent.readBackgroundAgentIntent(enabledRoot), { state: "clear" });
  assert.deepEqual(enabledApp.lastLoginSettings, {
    openAtLogin: true,
    enabled: true,
    name: "ChampCity Background Agent",
    path: process.execPath,
    args: ["--agent-harness-service-host", "--agent-harness-startup"],
  });

  const disabledRoot = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-install-disabled-"));
  const disabledApp = fakePackagedApplication(disabledRoot);
  intent.writeBackgroundAgentExplicitStopIntent(disabledRoot, "2026-09-10T12:00:00.000Z");
  await lifecycle.configureInstalledBackgroundAgent(disabledApp, false, "win32");
  assert.deepEqual(settings.readAgentHarnessServiceHostLifecycleSettings(disabledRoot), { launchAtLogin: false });
  assert.equal(intent.readBackgroundAgentIntent(disabledRoot).state, "explicit-stop");
  assert.deepEqual(disabledApp.lastLoginSettings.args, [
    "--agent-harness-service-host",
    "--agent-harness-startup",
  ]);
});

test("install confirmation trusts exact launch-item evidence when Electron summary booleans disagree", async (t) => {
  for (const [openAtLogin, executableWillLaunchAtLogin] of [[false, false], [false, true], [true, false]]) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-login-evidence-"));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const app = fakePackagedApplication(root);
    app.getLoginItemSettings = (query) => {
      assert.deepEqual(query, { path: process.execPath, args: expectedLoginItem().args });
      return { openAtLogin, executableWillLaunchAtLogin, launchItems: [expectedLoginItem()] };
    };
    await lifecycle.configureInstalledBackgroundAgent(app, true, "win32");
    assert.deepEqual(settings.readAgentHarnessServiceHostLifecycleSettings(root), { launchAtLogin: true });
  }
});

test("install confirmation rejects missing, wrong, disabled, ambiguous, and unavailable launch-item evidence", async (t) => {
  const exact = expectedLoginItem();
  const cases = [
    ["missing", []],
    ["other name", [{ ...exact, name: "Another Background Agent" }]],
    ["wrong target", [{ ...exact, path: path.join(path.dirname(process.execPath), "other.exe") }]],
    ["relative target", [{ ...exact, path: path.basename(process.execPath) }]],
    ["wrong arguments", [{ ...exact, args: [...exact.args].reverse() }]],
    ["extra argument", [{ ...exact, args: [...exact.args, "--extra"] }]],
    ["missing argument", [{ ...exact, args: exact.args.slice(0, 1) }]],
    ["machine scope", [{ ...exact, scope: "machine" }]],
    ["unknown scope", [{ ...exact, scope: "unknown" }]],
    ["disabled", [{ ...exact, enabled: false }]],
    ["unknown enabled", [{ ...exact, enabled: undefined }]],
    ["conflicting scope", [exact, { ...exact, scope: "machine" }]],
    ["no observation", undefined],
  ];
  for (const [label, launchItems] of cases) {
    await t.test(label, async () => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-login-rejected-"));
      try {
        settings.writeAgentHarnessServiceHostLifecycleSettings(root, { launchAtLogin: false });
        intent.writeBackgroundAgentExplicitStopIntent(root);
        const app = fakePackagedApplication(root);
        app.getLoginItemSettings = () => ({ openAtLogin: true, executableWillLaunchAtLogin: true, launchItems });
        await assert.rejects(lifecycle.configureInstalledBackgroundAgent(app, true, "win32"), (error) => {
          assert.equal(error.exitCode, 21);
          const diagnostic = JSON.parse(error.message.slice(error.message.indexOf("{") ));
          assert.equal(diagnostic.requestedEnabled, true);
          assert.equal(diagnostic.namedItemFound, launchItems?.some((item) => item.name === exact.name) ?? false);
          assert.equal(diagnostic.openAtLogin, true);
          assert.equal(diagnostic.executableWillLaunchAtLogin, true);
          for (const item of diagnostic.items) {
            assert.ok("scope" in item && "enabled" in item && "pathMatches" in item && "argsMatch" in item);
          }
          assert.equal(error.message.includes(process.execPath), false);
          return true;
        });
        assert.deepEqual(settings.readAgentHarnessServiceHostLifecycleSettings(root), { launchAtLogin: false });
        assert.equal(intent.readBackgroundAgentIntent(root).state, "explicit-stop");
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    });
  }
});

test("disabled installation proves absence or exact disabled state despite unrelated active items", async (t) => {
  const exact = expectedLoginItem();
  for (const launchItems of [[], [{ ...exact, enabled: false }], [{ ...exact, name: "Unrelated startup" }]]) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-login-disabled-"));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const app = fakePackagedApplication(root);
    app.getLoginItemSettings = () => ({ openAtLogin: true, executableWillLaunchAtLogin: true, launchItems });
    await lifecycle.configureInstalledBackgroundAgent(app, false, "win32");
    assert.deepEqual(settings.readAgentHarnessServiceHostLifecycleSettings(root), { launchAtLogin: false });
  }
  for (const launchItems of [[exact], undefined, [{ ...exact, scope: "machine" }]]) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-login-still-active-"));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    settings.writeAgentHarnessServiceHostLifecycleSettings(root, { launchAtLogin: true });
    const app = fakePackagedApplication(root);
    app.getLoginItemSettings = () => ({ openAtLogin: false, executableWillLaunchAtLogin: false, launchItems });
    await assert.rejects(lifecycle.configureInstalledBackgroundAgent(app, false, "win32"), (error) =>
      error.exitCode === 21 && error.message.includes('"requestedEnabled":false'));
    assert.deepEqual(settings.readAgentHarnessServiceHostLifecycleSettings(root), { launchAtLogin: true });
  }
});

test("Windows path normalization is comparison-only and registration remains distinct from enabled", () => {
  const exact = expectedLoginItem();
  const actual = {
    openAtLogin: false,
    executableWillLaunchAtLogin: false,
    launchItems: [{ ...exact, path: exact.path.replaceAll("\\", "/").toUpperCase(), enabled: false }],
  };
  const target = { path: exact.path, args: exact.args };
  const result = startup.evaluateWindowsLoginItemSettings(actual, target, true, exactRun(target));
  assert.equal(result.registered, true);
  assert.equal(result.enabled, false);
  assert.equal(result.confirmed, false);
  assert.equal(target.path, process.execPath);
  assert.equal(startup.evaluateWindowsLoginItemSettings(actual, target, false, { state: "absent" }).confirmed, true);
  const projection = startup.readAgentHarnessServiceHostStartupRegistration(
    { getLoginItemSettings: () => actual },
    { isPackaged: true, executablePath: exact.path, applicationPath: "unused" },
    { launchAtLogin: false }, "win32",
  );
  assert.equal("windowsVerification" in projection, false);
});

test("uninstall cleanup disables startup, persists stop intent, and succeeds when the host is absent", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-uninstall-absent-"));
  const app = fakePackagedApplication(root);
  descriptor.writeAgentHarnessServiceHostDescriptor(root, fakeDescriptor());
  let probes = 0;
  await lifecycle.cleanupBackgroundAgentForUninstall(app, "win32", {
    probe: async () => {
      probes += 1;
      return { state: "absent" };
    },
    shutdownLiveHost: async () => assert.fail("absent host must not receive shutdown"),
  });
  assert.equal(probes, 1);
  assert.equal(fs.existsSync(desktopLease.getDesktopLifecycleLeasePath(root)), false);
  assert.deepEqual(settings.readAgentHarnessServiceHostLifecycleSettings(root), { launchAtLogin: false });
  assert.equal(intent.readBackgroundAgentIntent(root).state, "explicit-stop");
  assert.equal(app.lastLoginSettings.openAtLogin, false);
  assert.equal(descriptor.readAgentHarnessServiceHostDescriptor(root), null);
});

test("all-users uninstall preserves enabled lifecycle bytes and absent stop intent when the host is absent", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-all-users-uninstall-enabled-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const app = fakePackagedApplication(root);
  settings.writeAgentHarnessServiceHostLifecycleSettings(root, { launchAtLogin: true });
  const lifecyclePath = settings.getAgentHarnessServiceHostLifecycleSettingsPath(root);
  const intentPath = intent.getBackgroundAgentIntentPath(root);
  const lifecycleBefore = fs.readFileSync(lifecyclePath);

  await lifecycle.cleanupBackgroundAgentForUninstall(app, "win32", {
    probe: async () => ({ state: "absent" }),
    shutdownLiveHost: async () => assert.fail("absent host must not receive shutdown"),
  }, allUsersInstalledScope());

  assert.deepEqual(fs.readFileSync(lifecyclePath), lifecycleBefore);
  assert.equal(fs.existsSync(intentPath), false);
  assert.equal(app.lastLoginSettings, null);

  const emptyRoot = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-all-users-uninstall-empty-"));
  t.after(() => fs.rmSync(emptyRoot, { recursive: true, force: true }));
  await lifecycle.cleanupBackgroundAgentForUninstall(fakePackagedApplication(emptyRoot), "win32", {
    probe: async () => ({ state: "absent" }),
    shutdownLiveHost: async () => assert.fail("absent host must not receive shutdown"),
  }, allUsersInstalledScope());
  assert.equal(fs.existsSync(settings.getAgentHarnessServiceHostLifecycleSettingsPath(emptyRoot)), false);
  assert.equal(fs.existsSync(intent.getBackgroundAgentIntentPath(emptyRoot)), false);
});

test("all-users uninstall preserves disabled lifecycle and prior explicit-stop bytes", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-all-users-uninstall-disabled-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const app = fakePackagedApplication(root);
  settings.writeAgentHarnessServiceHostLifecycleSettings(root, { launchAtLogin: false });
  intent.writeBackgroundAgentExplicitStopIntent(root, "2026-09-12T15:30:00.000Z");
  const lifecyclePath = settings.getAgentHarnessServiceHostLifecycleSettingsPath(root);
  const intentPath = intent.getBackgroundAgentIntentPath(root);
  const lifecycleBefore = fs.readFileSync(lifecyclePath);
  const intentBefore = fs.readFileSync(intentPath);

  await lifecycle.cleanupBackgroundAgentForUninstall(app, "win32", {
    probe: async () => ({ state: "absent" }),
    shutdownLiveHost: async () => assert.fail("absent host must not receive shutdown"),
  }, allUsersInstalledScope());

  assert.deepEqual(fs.readFileSync(lifecyclePath), lifecycleBefore);
  assert.deepEqual(fs.readFileSync(intentPath), intentBefore);
  assert.equal(app.lastLoginSettings, null);
});

test("all-users uninstall preserves lifecycle and intent while proving live-host quiescence", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-all-users-uninstall-live-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const app = fakePackagedApplication(root);
  const admittedIdentity = fakeIdentity();
  settings.writeAgentHarnessServiceHostLifecycleSettings(root, { launchAtLogin: true });
  intent.writeBackgroundAgentExplicitStopIntent(root, "2026-09-12T15:31:00.000Z");
  descriptor.writeAgentHarnessServiceHostDescriptor(root, fakeDescriptor(admittedIdentity));
  const lifecyclePath = settings.getAgentHarnessServiceHostLifecycleSettingsPath(root);
  const intentPath = intent.getBackgroundAgentIntentPath(root);
  const lifecycleBefore = fs.readFileSync(lifecyclePath);
  const intentBefore = fs.readFileSync(intentPath);
  let shutdownRequested = false;
  let shutdowns = 0;

  await lifecycle.cleanupBackgroundAgentForUninstall(app, "win32", {
    probe: async () => shutdownRequested
      ? { state: "absent" }
      : { state: "live", identity: admittedIdentity },
    shutdownLiveHost: async (_userDataRoot, identityForShutdown) => {
      shutdowns += 1;
      assert.deepEqual(identityForShutdown, admittedIdentity);
      shutdownRequested = true;
      descriptor.removeCurrentAgentHarnessServiceHostDescriptor(root, admittedIdentity.instanceId);
    },
    isProcessRunning: (processId) => {
      assert.ok(processId === admittedIdentity.serviceHostProcessId ||
        processId === admittedIdentity.workerProcessId);
      return false;
    },
    wait: async () => undefined,
    now: monotonicClock(),
    shutdownTimeoutMs: 100,
  }, allUsersInstalledScope());

  assert.equal(shutdowns, 1);
  assert.equal(descriptor.readAgentHarnessServiceHostDescriptor(root), null);
  assert.deepEqual(fs.readFileSync(lifecyclePath), lifecycleBefore);
  assert.deepEqual(fs.readFileSync(intentPath), intentBefore);
  assert.equal(app.lastLoginSettings, null);
});

test("all-users uninstall timeout preserves lifecycle and explicit-stop bytes", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-all-users-uninstall-timeout-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const app = fakePackagedApplication(root);
  const admittedIdentity = fakeIdentity();
  settings.writeAgentHarnessServiceHostLifecycleSettings(root, { launchAtLogin: false });
  intent.writeBackgroundAgentExplicitStopIntent(root, "2026-09-12T15:32:00.000Z");
  const lifecyclePath = settings.getAgentHarnessServiceHostLifecycleSettingsPath(root);
  const intentPath = intent.getBackgroundAgentIntentPath(root);
  const lifecycleBefore = fs.readFileSync(lifecyclePath);
  const intentBefore = fs.readFileSync(intentPath);
  let shutdownRequested = false;

  await assert.rejects(
    lifecycle.cleanupBackgroundAgentForUninstall(app, "win32", {
      probe: async () => shutdownRequested
        ? { state: "absent" }
        : { state: "live", identity: admittedIdentity },
      shutdownLiveHost: async () => { shutdownRequested = true; },
      readDescriptor: () => null,
      isProcessRunning: (processId) => processId === admittedIdentity.serviceHostProcessId,
      wait: async () => undefined,
      now: monotonicClock(),
      shutdownTimeoutMs: 4,
    }, allUsersInstalledScope()),
    (error) => error.exitCode === lifecycle.champCityMaintenanceExitCode.serviceHostShutdownFailed &&
      /Service Host is still running/.test(error.message),
  );

  assert.deepEqual(fs.readFileSync(lifecyclePath), lifecycleBefore);
  assert.deepEqual(fs.readFileSync(intentPath), intentBefore);
  assert.equal(app.lastLoginSettings, null);
});

test("uninstall cleanup retains the admitted descriptor and waits for worker and host exit after endpoint absence", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-uninstall-live-"));
  const app = fakePackagedApplication(root);
  const admittedIdentity = fakeIdentity();
  descriptor.writeAgentHarnessServiceHostDescriptor(root, fakeDescriptor(admittedIdentity));
  const running = new Map([
    [admittedIdentity.serviceHostProcessId, true],
    [admittedIdentity.workerProcessId, true],
  ]);
  const probes = [{ state: "live", identity: admittedIdentity }, { state: "absent" }];
  let shutdowns = 0;
  let waits = 0;
  await lifecycle.cleanupBackgroundAgentForUninstall(app, "win32", {
    probe: async () => probes.shift() ?? { state: "absent" },
    shutdownLiveHost: async (_userDataRoot, identityForShutdown) => {
      shutdowns += 1;
      assert.deepEqual(identityForShutdown, admittedIdentity);
    },
    isProcessRunning: (processId) => running.get(processId) ?? false,
    wait: async () => {
      waits += 1;
      if (waits === 1) {
        assert.equal(descriptor.readAgentHarnessServiceHostDescriptor(root).instanceId, admittedIdentity.instanceId);
        running.set(admittedIdentity.workerProcessId, false);
        descriptor.removeCurrentAgentHarnessServiceHostDescriptor(root, admittedIdentity.instanceId);
      } else if (waits === 2) {
        assert.equal(descriptor.readAgentHarnessServiceHostDescriptor(root), null);
        assert.equal(running.get(admittedIdentity.serviceHostProcessId), true);
        running.set(admittedIdentity.serviceHostProcessId, false);
      }
    },
    now: monotonicClock(),
    shutdownTimeoutMs: 100,
  });
  assert.equal(shutdowns, 1);
  assert.equal(waits, 2);
  assert.equal(descriptor.readAgentHarnessServiceHostDescriptor(root), null);
  assert.equal(fs.existsSync(desktopLease.getDesktopLifecycleLeasePath(root)), false);
});

test("uninstall cleanup treats a post-admission closing endpoint as transitional until full quiescence", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-uninstall-closing-endpoint-"));
  const app = fakePackagedApplication(root);
  const admittedIdentity = fakeIdentity();
  let shutdownRequested = false;
  let probeCount = 0;
  await lifecycle.cleanupBackgroundAgentForUninstall(app, "win32", {
    probe: async () => {
      probeCount += 1;
      if (!shutdownRequested) return { state: "live", identity: admittedIdentity };
      if (probeCount === 2) {
        return { state: "indeterminate", error: "Service Host control connection closed." };
      }
      return { state: "absent" };
    },
    shutdownLiveHost: async () => { shutdownRequested = true; },
    readDescriptor: () => null,
    isProcessRunning: () => false,
    wait: async () => undefined,
    now: monotonicClock(),
    shutdownTimeoutMs: 100,
  });
  assert.equal(probeCount, 3);
  assert.equal(fs.existsSync(desktopLease.getDesktopLifecycleLeasePath(root)), false);
});

test("uninstall cleanup fails closed when the admitted host remains alive after endpoint absence", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-uninstall-timeout-"));
  const app = fakePackagedApplication(root);
  const admittedIdentity = fakeIdentity();
  let shutdowns = 0;
  await assert.rejects(
    lifecycle.cleanupBackgroundAgentForUninstall(app, "win32", {
      probe: async () => shutdowns === 0
        ? { state: "live", identity: admittedIdentity }
        : { state: "absent" },
      shutdownLiveHost: async (_userDataRoot, identityForShutdown) => {
        shutdowns += 1;
        assert.deepEqual(identityForShutdown, admittedIdentity);
      },
      readDescriptor: () => null,
      isProcessRunning: (processId) => processId === admittedIdentity.serviceHostProcessId,
      wait: async () => undefined,
      now: monotonicClock(),
      shutdownTimeoutMs: 4,
    }),
    (error) => error.exitCode === lifecycle.champCityMaintenanceExitCode.serviceHostShutdownFailed &&
      /Service Host is still running/.test(error.message),
  );
  assert.equal(shutdowns, 1);
  assert.equal(fs.existsSync(desktopLease.getDesktopLifecycleLeasePath(root)), false);
});

test("uninstall cleanup remains pending while only the admitted worker is still alive", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-uninstall-worker-pending-"));
  const app = fakePackagedApplication(root);
  const admittedIdentity = fakeIdentity();
  let shutdownRequested = false;
  let workerRunning = true;
  let waits = 0;
  await lifecycle.cleanupBackgroundAgentForUninstall(app, "win32", {
    probe: async () => shutdownRequested
      ? { state: "absent" }
      : { state: "live", identity: admittedIdentity },
    shutdownLiveHost: async () => { shutdownRequested = true; },
    readDescriptor: () => null,
    isProcessRunning: (processId) => processId === admittedIdentity.workerProcessId && workerRunning,
    wait: async () => {
      waits += 1;
      workerRunning = false;
    },
    now: monotonicClock(),
    shutdownTimeoutMs: 100,
  });
  assert.equal(waits, 1);
  assert.equal(fs.existsSync(desktopLease.getDesktopLifecycleLeasePath(root)), false);
});

test("uninstall cleanup blocks on a live desktop lease before granting destructive-removal eligibility", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-uninstall-desktop-"));
  const app = fakePackagedApplication(root);
  const desktopAcquisition = await desktopLease.acquireDesktopLifecycleLease(root, "desktop");
  assert.equal(desktopAcquisition.acquired, true);
  await assert.rejects(
    lifecycle.cleanupBackgroundAgentForUninstall(app, "win32", {
      probe: async () => assert.fail("desktop-held cleanup must not probe the host"),
    }),
    (error) => error.exitCode === lifecycle.champCityMaintenanceExitCode.foregroundDesktopOpen,
  );
  assert.equal(app.lastLoginSettings, null);
  assert.equal(fs.existsSync(settings.getAgentHarnessServiceHostLifecycleSettingsPath(root)), false);
  assert.equal(await desktopLease.releaseDesktopLifecycleLease(root, desktopAcquisition.lease), true);
});

test("uninstall cleanup classifies live maintenance ownership without claiming a desktop is open", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-uninstall-maintenance-owner-"));
  const app = fakePackagedApplication(root);
  const maintenanceOwner = await desktopLease.acquireDesktopLifecycleLease(root, "uninstall-maintenance");
  assert.equal(maintenanceOwner.acquired, true);
  await assert.rejects(
    lifecycle.cleanupBackgroundAgentForUninstall(app, "win32", {
      probe: async () => assert.fail("contended cleanup must not probe the host"),
    }),
    (error) => error.exitCode === lifecycle.champCityMaintenanceExitCode.failure &&
      /another champcity uninstall maintenance operation/i.test(error.message),
  );
  assert.equal(app.lastLoginSettings, null);
  assert.equal(await desktopLease.releaseDesktopLifecycleLease(root, maintenanceOwner.lease), true);
});

test("uninstall cleanup fails closed on indeterminate endpoint ownership", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-uninstall-indeterminate-"));
  const app = fakePackagedApplication(root);
  let shutdowns = 0;
  await assert.rejects(
    lifecycle.cleanupBackgroundAgentForUninstall(app, "win32", {
      probe: async () => ({ state: "indeterminate", error: "not a ChampCity handshake" }),
      shutdownLiveHost: async () => { shutdowns += 1; },
    }),
    (error) => error.exitCode === lifecycle.champCityMaintenanceExitCode.endpointOwnershipIndeterminate,
  );
  assert.equal(shutdowns, 0);
  assert.equal(fs.existsSync(desktopLease.getDesktopLifecycleLeasePath(root)), false);
});

test("desktop lifecycle endpoint atomically excludes owners while diagnostic JSON remains non-controlling", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-desktop-lease-"));
  const leasePath = desktopLease.getDesktopLifecycleLeasePath(root);
  fs.writeFileSync(leasePath, "stale diagnostic content\n", "utf8");
  const desktop = await desktopLease.acquireDesktopLifecycleLease(root, "desktop");
  assert.equal(desktop.acquired, true);
  assert.match(desktop.address, /^\\\\\.\\pipe\\champcity-desktop-lifecycle-[0-9a-f]{24}$/);
  assert.equal(desktopLease.getDesktopLifecycleExclusionAddress(root), desktop.address);
  assert.notEqual(
    desktopLease.getDesktopLifecycleExclusionAddress(fs.mkdtempSync(path.join(os.tmpdir(), "champcity-other-user-data-"))),
    desktop.address,
  );
  assert.equal(JSON.parse(fs.readFileSync(leasePath, "utf8")).leaseId, desktop.lease.leaseId);
  const maintenance = await desktopLease.acquireDesktopLifecycleLease(root, "uninstall-maintenance");
  assert.deepEqual(
    { acquired: maintenance.acquired, reason: maintenance.reason, owner: maintenance.existingLease?.owner },
    { acquired: false, reason: "live-owner", owner: "desktop" },
  );
  assert.equal(await desktopLease.releaseDesktopLifecycleLease(root, desktop.lease), true);

  const maintenanceFirst = await desktopLease.acquireDesktopLifecycleLease(root, "uninstall-maintenance");
  assert.equal(maintenanceFirst.acquired, true);
  const blockedDesktop = await desktopLease.acquireDesktopLifecycleLease(root, "desktop");
  assert.deepEqual(
    { acquired: blockedDesktop.acquired, reason: blockedDesktop.reason, owner: blockedDesktop.existingLease?.owner },
    { acquired: false, reason: "live-owner", owner: "uninstall-maintenance" },
  );
  assert.equal(await desktopLease.releaseDesktopLifecycleLease(root, maintenanceFirst.lease), true);
});

test("desktop lifecycle endpoint fails closed when occupied owner identity is unverifiable", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-desktop-endpoint-closed-"));
  const address = desktopLease.getDesktopLifecycleExclusionAddress(root);
  const unknownOwner = net.createServer((socket) => socket.end("not-json\n"));
  await new Promise((resolve, reject) => {
    unknownOwner.once("error", reject);
    unknownOwner.listen(address, resolve);
  });
  try {
    const unverifiable = await desktopLease.acquireDesktopLifecycleLease(root, "desktop");
    assert.equal(unverifiable.acquired, false);
    assert.equal(unverifiable.reason, "unverifiable-owner");
    assert.equal(unverifiable.existingLease, null);
  } finally {
    await new Promise((resolve) => unknownOwner.close(resolve));
  }
});

test("desktop lifecycle endpoint release is exact handle bound", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-desktop-lease-release-"));
  const acquired = await desktopLease.acquireDesktopLifecycleLease(root, "desktop");
  assert.equal(acquired.acquired, true);
  assert.equal(await desktopLease.releaseDesktopLifecycleLease(root, {
    ...acquired.lease,
    owner: "uninstall-maintenance",
  }), false);
  assert.equal(await desktopLease.releaseDesktopLifecycleLease(root, {
    ...acquired.lease,
    leaseId: "00000000-0000-4000-8000-000000000000",
  }), false);
  assert.equal(fs.existsSync(desktopLease.getDesktopLifecycleLeasePath(root)), true);
  const stillBlocked = await desktopLease.acquireDesktopLifecycleLease(root, "uninstall-maintenance");
  assert.equal(stillBlocked.acquired, false);
  assert.equal(stillBlocked.existingLease?.leaseId, acquired.lease.leaseId);
  assert.equal(await desktopLease.releaseDesktopLifecycleLease(root, acquired.lease), true);
});

test("uninstall maintenance classifies a live maintenance owner without foreground-desktop exit 20", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-uninstall-maintenance-owner-"));
  const owner = await desktopLease.acquireDesktopLifecycleLease(root, "uninstall-maintenance");
  assert.equal(owner.acquired, true);
  try {
    await assert.rejects(
      lifecycle.cleanupBackgroundAgentForUninstall(fakePackagedApplication(root), "win32"),
      (error) => error.exitCode === lifecycle.champCityMaintenanceExitCode.failure &&
        /already running/.test(error.message),
    );
  } finally {
    assert.equal(await desktopLease.releaseDesktopLifecycleLease(root, owner.lease), true);
  }
});

test("packaged launch computation cannot fall back to development Electron or repository arguments", () => {
  const installedExecutable = path.join("installed", "ChampCity AI", "ChampCityAI.exe");
  const target = startup.computeAgentHarnessServiceHostLoginLaunchTarget({
    isPackaged: true,
    executablePath: installedExecutable,
    applicationPath: path.join("repository-must-not-be-used"),
  });
  assert.deepEqual(target, {
    path: installedExecutable,
    args: ["--agent-harness-service-host", "--agent-harness-startup"],
  });
});

test("managed Codex bootstrap resolves only the narrowly unpacked vendor directory inside a packaged app", () => {
  const packagedRoot = path.join("packaged", "ChampCity AI", "resources", "app.asar", "node_modules", "@openai", "codex-win32-x64");
  assert.equal(
    codexRuntime.resolveBundledCodexVendorPath(packagedRoot),
    path.join("packaged", "ChampCity AI", "resources", "app.asar.unpacked", "node_modules", "@openai", "codex-win32-x64", "vendor"),
  );
  const developmentRoot = path.join(repositoryRoot, "node_modules", "@openai", "codex-win32-x64");
  assert.equal(
    codexRuntime.resolveBundledCodexVendorPath(developmentRoot),
    path.join(developmentRoot, "vendor"),
  );
});

function fakePackagedApplication(userDataRoot) {
  let currentLoginSettings = { openAtLogin: false, executableWillLaunchAtLogin: false };
  return {
    isPackaged: true,
    lastLoginSettings: null,
    getPath(name) {
      if (name === "userData") return userDataRoot;
      throw new Error(`Unexpected path request: ${name}`);
    },
    getAppPath() {
      return path.join("installed", "resources", "app.asar");
    },
    setLoginItemSettings(value) {
      this.lastLoginSettings = value;
      fakeRunObservation = value.openAtLogin ? exactRun(value) : { state: "absent" };
      currentLoginSettings = {
        openAtLogin: value.openAtLogin,
        executableWillLaunchAtLogin: value.enabled,
        launchItems: value.openAtLogin ? [{
          name: value.name, path: value.path, args: value.args, scope: "user", enabled: value.enabled,
        }] : [],
      };
    },
    getLoginItemSettings() {
      return currentLoginSettings;
    },
  };
}

function expectedLoginItem() {
  return {
    name: "ChampCity Background Agent",
    path: process.execPath,
    args: ["--agent-harness-service-host", "--agent-harness-startup"],
    scope: "user",
    enabled: true,
  };
}

function allUsersInstalledScope() {
  return {
    schemaVersion: 1,
    installScope: "all-users",
    backgroundAgentLaunchAtLoginDefault: true,
  };
}

function exactRun(target = expectedLoginItem()) {
  return { state: "present", command: `"${target.path}" ${target.args.join(" ")}` };
}

test("install accepts empty Electron switch evidence only with the exact Windows command", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-login-composite-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const app = fakePackagedApplication(root);
  app.getLoginItemSettings = () => ({ openAtLogin: false, executableWillLaunchAtLogin: false,
    launchItems: [{ ...expectedLoginItem(), args: [] }] });
  await lifecycle.configureInstalledBackgroundAgent(app, true, "win32");
  assert.deepEqual(settings.readAgentHarnessServiceHostLifecycleSettings(root), { launchAtLogin: true });
});

test("composite confirmation rejects wrong, reordered, extra, absent and unverifiable Run commands", async (t) => {
  const target = expectedLoginItem();
  const exactCommand = exactRun(target).command;
  for (const observation of [
    { state: "present", command: exactCommand.replace("--agent-harness-startup", "--wrong") },
    { state: "present", command: `"${target.path}" ${[...target.args].reverse().join(" ")}` },
    { state: "present", command: exactCommand + " --extra" },
    { state: "present", command: `"${target.path}" ${target.args[0]}` },
    { state: "present", command: `"${target.path}.other.exe" ${target.args.join(" ")}` },
    { state: "absent" },
    { state: "unverifiable", reason: "read-failure" },
  ]) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-login-run-rejected-"));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    settings.writeAgentHarnessServiceHostLifecycleSettings(root, { launchAtLogin: false });
    intent.writeBackgroundAgentExplicitStopIntent(root);
    const app = fakePackagedApplication(root);
    app.getLoginItemSettings = () => {
      fakeRunObservation = observation;
      return { openAtLogin: true, executableWillLaunchAtLogin: true, launchItems: [{ ...target, args: [] }] };
    };
    await assert.rejects(lifecycle.configureInstalledBackgroundAgent(app, true, "win32"), (error) =>
      error.exitCode === 21 && !error.message.includes(target.path));
    assert.deepEqual(settings.readAgentHarnessServiceHostLifecycleSettings(root), { launchAtLogin: false });
    assert.equal(intent.readBackgroundAgentIntent(root).state, "explicit-stop");
  }
});

test("Windows command matching accepts only an exact unambiguous executable and literal switch tail", () => {
  const target = expectedLoginItem();
  const spaced = { ...target, path: path.win32.join(path.win32.dirname(target.path), "space directory", "ChampCityAI.exe") };
  const compact = { ...target, path: path.win32.join(path.win32.parse(target.path).root, "fixture", "ChampCityAI.exe") };
  for (const value of [spaced, compact]) {
    assert.equal(startup.windowsRunCommandMatchesTarget(exactRun(value).command, value), true);
    assert.equal(startup.windowsRunCommandMatchesTarget(exactRun(value).command.replace(value.path,
      value.path.replaceAll("\\", "/").toUpperCase()), value), true);
  }
  assert.equal(startup.windowsRunCommandMatchesTarget(`${compact.path} ${compact.args.join(" ")}`, compact), true);
  assert.equal(startup.windowsRunCommandMatchesTarget(`${spaced.path} ${spaced.args.join(" ")}`, spaced), false);
  for (const command of [
    exactRun(target).command + " | other", exactRun(target).command + " > output",
    exactRun(target).command + " & other", exactRun(target).command + "\n",
    `"%SystemRoot%\\ChampCityAI.exe" ${target.args.join(" ")}`,
    `"${target.path}" "${target.args[0]}" ${target.args[1]}`,
    `"${target.path}"${target.args.join(" ")}`,
    `"${path.win32.basename(target.path)}" ${target.args.join(" ")}`,
  ]) assert.equal(startup.windowsRunCommandMatchesTarget(command, target), false);
});

test("disabled confirmation requires Run absence and at most one exact inactive stale item", () => {
  const exact = expectedLoginItem();
  const check = (launchItems, run) => startup.evaluateWindowsLoginItemSettings({
    openAtLogin: false, executableWillLaunchAtLogin: false, launchItems,
  }, exact, false, run).confirmed;
  const stale = { ...exact, enabled: false, args: [] };
  assert.equal(check([], { state: "absent" }), true);
  assert.equal(check([stale], { state: "absent" }), true);
  for (const items of [undefined, [exact], [{ ...stale, enabled: undefined }],
    [{ ...stale, scope: "machine" }], [{ ...stale, path: "wrong" }],
    [{ ...stale, args: ["--wrong"] }], [stale, stale]]) {
    assert.equal(check(items, { state: "absent" }), false);
  }
  for (const items of [[], [stale], [exact]]) {
    assert.equal(check(items, exactRun()), false);
    assert.equal(check(items, { state: "unverifiable", reason: "timeout" }), false);
  }
});

test("Windows Run observer bounds its fixed read-only helper and fails closed on helper or parse failures", (t) => {
  const childProcess = require("node:child_process");
  let output = JSON.stringify({ state: "absent" });
  let failure = null;
  const name = 'Fixture value with "quotes"; $()';
  const helper = t.mock.method(childProcess, "execFileSync", (file, args, options) => {
    assert.equal(path.win32.isAbsolute(file), true);
    assert.equal(path.win32.basename(file), "powershell.exe");
    assert.deepEqual(args.slice(0, 4), ["-NoLogo", "-NoProfile", "-NonInteractive", "-EncodedCommand"]);
    const script = Buffer.from(args[4], "base64").toString("utf16le");
    assert.equal(script.includes(name), false);
    assert.match(script, /OpenSubKey\([^\n]+, \$false\)/);
    assert.doesNotMatch(script, /SetValue|DeleteValue|CreateSubKey/);
    assert.equal(options.env.CHAMPCITY_RUN_OBSERVATION_NAME, name);
    assert.equal(options.shell, undefined);
    assert.equal(options.windowsHide, true);
    assert.equal(options.timeout, 5000);
    assert.equal(options.maxBuffer, 128 * 1024);
    if (failure) throw failure;
    return output;
  });
  for (const value of [{ state: "absent" }, exactRun(),
    { state: "unverifiable", reason: "read-failure" },
    { state: "unverifiable", reason: "unsupported-value-type" }]) {
    output = JSON.stringify(value);
    assert.deepEqual(realObserveRun(name), value);
  }
  for (const value of ["", "not JSON", "null", '{}', '{"state":"present"}',
    JSON.stringify({ state: "present", command: "x".repeat(32_768) }),
    '{"state":"unverifiable","reason":"raw private path"}']) {
    output = value;
    assert.deepEqual(realObserveRun(name), { state: "unverifiable", reason: "invalid-output" });
  }
  for (const [code, reason] of [["ETIMEDOUT", "timeout"], ["ENOENT", "tool-failure"],
    ["EACCES", "tool-failure"], ["ENOBUFS", "tool-failure"]]) {
    failure = Object.assign(new Error("private helper details"), { code });
    assert.deepEqual(realObserveRun(name), { state: "unverifiable", reason });
  }
  const calls = helper.mock.callCount();
  assert.deepEqual(realObserveRun("bad\nname"), { state: "unverifiable", reason: "invalid-name" });
  assert.equal(helper.mock.callCount(), calls);
});

function fakeIdentity() {
  return {
    descriptorSchemaVersion: 1,
    controlProtocolVersion: 1,
    serviceHostProcessId: 123,
    workerProcessId: 456,
    instanceId: "11111111-1111-4111-8111-111111111111",
    runtimeBuildIdentity: `sha256:${"a".repeat(64)}`,
    lifecycleState: "running",
    lifecycleReason: null,
    lifecycleStateChangedAt: "2026-09-10T12:00:00.000Z",
    powerEpoch: 0,
    workerRecoveryState: "idle",
    consecutiveHeartbeatMisses: 0,
    workerRecoveryError: null,
    trayPresent: true,
    lastControlledRestart: null,
  };
}

function fakeDescriptor(serviceHostIdentity = fakeIdentity()) {
  return {
    schemaVersion: 1,
    controlProtocolVersion: 1,
    serviceHostProcessId: serviceHostIdentity.serviceHostProcessId,
    controlAddress: "bounded-test-control-address",
    instanceId: serviceHostIdentity.instanceId,
    runtimeBuildIdentity: serviceHostIdentity.runtimeBuildIdentity,
  };
}

function monotonicClock() {
  let value = 0;
  return () => ++value;
}
