const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");

test("Service Host lifecycle preference defaults enabled and preserves an explicit disable", () => {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-service-host-lifecycle-settings-"));
  try {
    const lifecycle = require(path.join(
      root,
      "dist/main/agentHarness/runtime/agentHarnessServiceHostLifecycleSettings.js",
    ));
    assert.deepEqual(lifecycle.readAgentHarnessServiceHostLifecycleSettings(container), {
      launchAtLogin: true,
    });
    lifecycle.writeAgentHarnessServiceHostLifecycleSettings(container, { launchAtLogin: false });
    assert.deepEqual(lifecycle.readAgentHarnessServiceHostLifecycleSettings(container), {
      launchAtLogin: false,
    });
    const stored = JSON.parse(fs.readFileSync(
      lifecycle.getAgentHarnessServiceHostLifecycleSettingsPath(container),
      "utf8",
    ));
    assert.deepEqual(stored, { schemaVersion: 1, launchAtLogin: false });
  } finally {
    fs.rmSync(container, { recursive: true, force: true });
  }
});

test("Windows login registration uses the same exact packaged and development target for set and query", (t) => {
  const registration = require(path.join(
    root,
    "dist/main/agentHarness/runtime/agentHarnessServiceHostStartupRegistration.js",
  ));
  const packaged = registration.computeAgentHarnessServiceHostLoginLaunchTarget({
    isPackaged: true,
    executablePath: "C:\\Program Files\\ChampCity\\ChampCity.exe",
    applicationPath: "C:\\Program Files\\ChampCity\\resources\\app.asar",
  });
  assert.deepEqual(packaged, {
    path: "C:\\Program Files\\ChampCity\\ChampCity.exe",
    args: ["--agent-harness-service-host", "--agent-harness-startup"],
  });
  const development = registration.computeAgentHarnessServiceHostLoginLaunchTarget({
    isPackaged: false,
    executablePath: "C:\\tools\\electron.exe",
    applicationPath: "D:\\src\\ChampCity_AI",
  });
  assert.deepEqual(development, {
    path: "C:\\tools\\electron.exe",
    args: [
      "D:\\src\\ChampCity_AI",
      "--agent-harness-service-host",
      "--agent-harness-startup",
    ],
  });

  let written = null;
  let queried = null;
  const windowsRun = require(path.join(
    root,
    "dist/main/agentHarness/runtime/windowsRunObservation.js",
  ));
  t.mock.method(windowsRun, "observeCurrentUserWindowsRunValue", () => ({
    state: "present",
    command: `"C:\\tools\\electron.exe" D:\\src\\ChampCity_AI --agent-harness-service-host --agent-harness-startup`,
  }));
  const adapter = {
    setLoginItemSettings(value) { written = value; },
    getLoginItemSettings(value) {
      queried = value;
      return {
        openAtLogin: true,
        executableWillLaunchAtLogin: true,
        launchItems: [{
          name: "ChampCity Background Agent",
          path: "C:\\tools\\electron.exe",
          args: [
            "D:\\src\\ChampCity_AI",
            "--agent-harness-service-host",
            "--agent-harness-startup",
          ],
          scope: "user",
          enabled: true,
        }],
      };
    },
  };
  const status = registration.applyAgentHarnessServiceHostStartupRegistration(
    adapter,
    {
      isPackaged: false,
      executablePath: "C:\\tools\\electron.exe",
      applicationPath: "D:\\src\\ChampCity_AI",
    },
    { launchAtLogin: true },
    "win32",
  );
  assert.deepEqual({ path: written.path, args: written.args }, development);
  assert.deepEqual(queried, development);
  assert.equal(written.name, "ChampCity Background Agent");
  assert.equal(written.openAtLogin, true);
  assert.equal(status.loginItemRegistered, true);
  assert.equal(status.executableWillLaunchAtLogin, true);
  assert.equal(status.startupRegistrationSupported, true);
  assert.equal(status.startupRegistrationScope, "user");
});

test("Background Agent stop intent is atomic, fail-safe, and reset only by explicit start or enabled login startup", () => {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-background-agent-intent-"));
  const intent = require(path.join(
    root,
    "dist/main/agentHarness/runtime/backgroundAgentIntent.js",
  ));
  try {
    assert.deepEqual(intent.readBackgroundAgentIntent(container), { state: "clear" });
    intent.writeBackgroundAgentExplicitStopIntent(container, "2026-09-10T12:00:00.000Z");
    assert.deepEqual(intent.readBackgroundAgentIntent(container), {
      state: "explicit-stop",
      requestedAt: "2026-09-10T12:00:00.000Z",
    });
    assert.deepEqual(JSON.parse(fs.readFileSync(intent.getBackgroundAgentIntentPath(container), "utf8")), {
      schemaVersion: 1,
      explicitStopRequested: true,
      requestedAt: "2026-09-10T12:00:00.000Z",
    });

    assert.equal(intent.prepareBackgroundAgentStartupIntent(container, {
      startupOrigin: false,
      launchAtLogin: true,
    }), true);
    assert.equal(intent.readBackgroundAgentIntent(container).state, "explicit-stop");
    assert.equal(intent.prepareBackgroundAgentStartupIntent(container, {
      startupOrigin: true,
      launchAtLogin: false,
    }), false);
    assert.equal(intent.readBackgroundAgentIntent(container).state, "explicit-stop");
    assert.equal(intent.prepareBackgroundAgentStartupIntent(container, {
      startupOrigin: true,
      launchAtLogin: true,
    }), true);
    assert.deepEqual(intent.readBackgroundAgentIntent(container), { state: "clear" });

    fs.mkdirSync(path.dirname(intent.getBackgroundAgentIntentPath(container)), { recursive: true });
    fs.writeFileSync(intent.getBackgroundAgentIntentPath(container), "{ malformed", "utf8");
    assert.equal(intent.readBackgroundAgentIntent(container).state, "invalid");
    intent.clearBackgroundAgentExplicitStopIntent(container);
    assert.deepEqual(intent.readBackgroundAgentIntent(container), { state: "clear" });
  } finally {
    fs.rmSync(container, { recursive: true, force: true });
  }
});

test("tray presentation keeps Background Agent and MCP Runtime controls distinct", async () => {
  const tray = require(path.join(
    root,
    "dist/main/agentHarness/runtime/backgroundAgentTray.js",
  ));
  const calls = [];
  const presentation = tray.projectBackgroundAgentTrayPresentation({
    state: "ready",
    reason: "startup",
    stateChangedAt: "2026-09-10T12:00:00.000Z",
    powerEpoch: 0,
    consecutiveHeartbeatMisses: 0,
    workerRecoveryState: "idle",
    lastError: null,
    lastControlledRestart: null,
    lastSuspendAt: null,
    lastResumeAt: null,
    lastRecoveryStartedAt: null,
    lastReadyAt: "2026-09-10T12:00:00.000Z",
  }, { state: "running" });
  const menu = tray.buildBackgroundAgentTrayMenuTemplate(presentation, true, {
    openChampCity: () => calls.push("open"),
    startMcpRuntime: () => calls.push("start-mcp"),
    stopMcpRuntime: () => calls.push("stop-mcp"),
    restartBackgroundAgent: () => calls.push("restart-background"),
    setLaunchAtLogin: (enabled) => calls.push(`login-${enabled}`),
    exitBackgroundAgent: () => calls.push("exit-background"),
  });
  assert.deepEqual(menu.map((item) => item.type === "separator" ? "---" : item.label), [
    "Open ChampCity A/I",
    "---",
    "Background Agent: Ready",
    "MCP Runtime: Running",
    "Stop MCP Runtime",
    "Restart Background Agent",
    "---",
    "Start Background Agent for my Windows user at sign-in",
    "---",
    "Exit Background Agent",
  ]);
  menu[0].click();
  menu[4].click();
  menu[5].click();
  menu[7].click({ checked: false });
  menu[9].click();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(calls, ["open", "stop-mcp", "restart-background", "login-false", "exit-background"]);
});

test("foreground launch target omits Service Host arguments in packaged and development modes", () => {
  const registration = require(path.join(
    root,
    "dist/main/agentHarness/runtime/agentHarnessServiceHostStartupRegistration.js",
  ));
  assert.deepEqual(registration.computeChampCityDesktopLaunchTarget({
    isPackaged: true,
    executablePath: "C:\\Program Files\\ChampCity\\ChampCityAI.exe",
    applicationPath: "ignored",
  }), {
    path: "C:\\Program Files\\ChampCity\\ChampCityAI.exe",
    args: [],
  });
  assert.deepEqual(registration.computeChampCityDesktopLaunchTarget({
    isPackaged: false,
    executablePath: "C:\\tools\\electron.exe",
    applicationPath: "D:\\src\\ChampCity_AI",
  }), {
    path: "C:\\tools\\electron.exe",
    args: ["D:\\src\\ChampCity_AI"],
  });
});

test("tray restart drains, schedules one same-application relaunch, and then requests shutdown", async () => {
  const { relaunchBackgroundAgent } = require(path.join(
    root,
    "dist/main/agentHarness/runtime/backgroundAgentRelaunch.js",
  ));
  const events = [];
  await relaunchBackgroundAgent(
    { relaunch: (options) => events.push(["relaunch", options]) },
    { path: "C:\\tools\\electron.exe", args: ["D:\\src\\ChampCity_AI", "--agent-harness-service-host"] },
    async () => { events.push(["drain"]); },
    () => { events.push(["shutdown"]); },
  );
  assert.deepEqual(events, [
    ["drain"],
    ["relaunch", {
      execPath: "C:\\tools\\electron.exe",
      args: ["D:\\src\\ChampCity_AI", "--agent-harness-service-host"],
    }],
    ["shutdown"],
  ]);
});

test("Service Host descriptors use one deterministic user-data-keyed control endpoint", () => {
  const descriptor = require(path.join(
    root,
    "dist/main/agentHarness/runtime/agentHarnessServiceHostDescriptor.js",
  ));
  const buildIdentity = `sha256:${"a".repeat(64)}`;
  const first = descriptor.createAgentHarnessServiceHostDescriptor("C:\\Users\\Example\\AppData\\ChampCity", buildIdentity, 1001);
  const second = descriptor.createAgentHarnessServiceHostDescriptor("C:\\Users\\Example\\AppData\\ChampCity", buildIdentity, 1002);
  const other = descriptor.createAgentHarnessServiceHostDescriptor("C:\\Users\\Example\\AppData\\Other", buildIdentity, 1003);
  assert.equal(first.controlAddress, second.controlAddress);
  assert.notEqual(first.instanceId, second.instanceId);
  assert.notEqual(first.controlAddress, other.controlAddress);
  assert.doesNotMatch(first.controlAddress, new RegExp(first.instanceId, "i"));
  assert.equal(first.runtimeBuildIdentity, buildIdentity);
});

test("runtime build identity changes when deployed Service Host code changes", () => {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-service-host-build-identity-"));
  const runtimeDirectory = path.join(container, "agentHarness", "runtime");
  fs.mkdirSync(runtimeDirectory, { recursive: true });
  const identity = require(path.join(
    root,
    "dist/main/agentHarness/runtime/agentHarnessBuildIdentity.js",
  ));
  try {
    fs.writeFileSync(path.join(runtimeDirectory, "agentHarnessWorker.js"), "generation-a", "utf8");
    const generationA = identity.computeAgentHarnessRuntimeBuildIdentity(container);
    fs.writeFileSync(path.join(runtimeDirectory, "agentHarnessWorker.js"), "generation-b", "utf8");
    const generationB = identity.computeAgentHarnessRuntimeBuildIdentity(container);
    assert.match(generationA, /^sha256:[0-9a-f]{64}$/);
    assert.match(generationB, /^sha256:[0-9a-f]{64}$/);
    assert.notEqual(generationA, generationB);
  } finally {
    fs.rmSync(container, { recursive: true, force: true });
  }
});

function runtimeHeartbeat(powerEpoch, overrides = {}) {
  return {
    workerProcessId: 2002,
    runtimeReady: true,
    workspaceRegistryReady: true,
    registeredWorkspaceCount: 1,
    powerEpoch,
    observedAt: new Date(0).toISOString(),
    ...overrides,
  };
}

function lifecycleRuntimeStatus(state) {
  return {
    state,
    enabled: true,
    host: "127.0.0.1",
    configuredPort: 0,
    port: state === "running" ? 10101 : null,
    healthEndpoint: state === "running" ? "http://127.0.0.1:10101/health" : null,
    mcpEndpoint: state === "running" ? "http://127.0.0.1:10101/mcp" : null,
    localAuthMode: "development-unauthenticated",
    routingState: state === "running" ? "ready" : "unavailable",
    activeWorkspaceId: null,
    expectedWorkspaceId: null,
    workspaceRoot: null,
    registeredWorkspaceIds: [],
    startedAt: null,
    lastError: null,
    recentActivity: [],
  };
}

function desiredStateLifecycle(initialDesiredRunning, heartbeatOverrides = {}) {
  const lifecycleModule = require(path.join(
    root,
    "dist/main/agentHarness/runtime/agentHarnessServiceLifecycle.js",
  ));
  const state = { desiredRunning: initialDesiredRunning };
  const calls = { heartbeat: 0, replace: [], resume: [], start: 0 };
  const controller = {
    isRuntimeDesiredRunning: () => state.desiredRunning,
    workerProcessId: () => 2002,
    start: async () => {
      calls.start += 1;
      state.desiredRunning = true;
      return lifecycleRuntimeStatus("running");
    },
    restart: async () => lifecycleRuntimeStatus("running"),
    heartbeat: async () => {
      calls.heartbeat += 1;
      return runtimeHeartbeat(0, heartbeatOverrides);
    },
    prepareSuspend: async () => undefined,
    reconcileAfterResume: async (powerEpoch) => {
      calls.resume.push(powerEpoch);
      return runtimeHeartbeat(powerEpoch, heartbeatOverrides);
    },
    replaceWorker: async (reason) => {
      calls.replace.push(reason);
      return runtimeHeartbeat(calls.resume.at(-1) ?? 0);
    },
    prepareControlledRestart: async () => ({
      outcome: "no-runtime",
      activeRequestsAtStart: 0,
      activeRequestsAtEnd: 0,
      requestedAt: new Date(0).toISOString(),
      completedAt: new Date(0).toISOString(),
    }),
  };
  const coordinator = new lifecycleModule.AgentHarnessServiceLifecycleCoordinator({
    controller,
    delay: async () => undefined,
    policy: {
      heartbeatIntervalMs: 1,
      heartbeatDeadlineMs: 100,
      heartbeatMissThreshold: 3,
      resumeReadinessTargetMs: 1_000,
      resumeGraceMs: 0,
      recoveryAttemptLimit: 1,
      recoveryBackoffMs: [0],
      controlledRestartDrainMs: 100,
    },
  });
  coordinator.markReady();
  return { coordinator, state, calls };
}

test("intentionally stopped MCP runtime remains healthy across supervision, resume, and explicit start", async () => {
  const fixture = desiredStateLifecycle(false, { runtimeReady: false });
  let stableSnapshot;
  for (let pass = 0; pass < 5; pass += 1) {
    stableSnapshot = await fixture.coordinator.superviseNow();
    assert.equal(stableSnapshot.state, "ready");
    assert.equal(stableSnapshot.consecutiveHeartbeatMisses, 0);
  }
  const tray = require(path.join(
    root,
    "dist/main/agentHarness/runtime/backgroundAgentTray.js",
  ));
  const presentation = tray.projectBackgroundAgentTrayPresentation(stableSnapshot, { state: "stopped" });
  assert.equal(presentation.backgroundAgentState, "Ready");
  assert.equal(presentation.mcpRuntimeState, "Stopped");
  await fixture.coordinator.handleSuspend();
  const resumed = await fixture.coordinator.handleResume();
  assert.equal(resumed.state, "ready");
  assert.equal(resumed.consecutiveHeartbeatMisses, 0);
  assert.deepEqual(fixture.calls.replace, []);

  const started = await fixture.coordinator.start();
  assert.equal(started.state, "running");
  assert.equal(fixture.state.desiredRunning, true);
  assert.equal(fixture.calls.start, 1);
  assert.deepEqual(fixture.calls.replace, []);
});

test("runtime readiness failure still recovers when MCP runtime is desired running", async () => {
  const fixture = desiredStateLifecycle(true, { runtimeReady: false });
  assert.equal((await fixture.coordinator.superviseNow()).consecutiveHeartbeatMisses, 1);
  assert.equal((await fixture.coordinator.superviseNow()).consecutiveHeartbeatMisses, 2);
  const recovered = await fixture.coordinator.superviseNow();
  assert.equal(recovered.state, "ready");
  assert.deepEqual(fixture.calls.replace, ["heartbeat-miss-threshold"]);
});

test("workspace-registry readiness remains mandatory while MCP runtime is intentionally stopped", async () => {
  const fixture = desiredStateLifecycle(false, {
    runtimeReady: false,
    workspaceRegistryReady: false,
  });
  await fixture.coordinator.superviseNow();
  await fixture.coordinator.superviseNow();
  await fixture.coordinator.superviseNow();
  assert.deepEqual(fixture.calls.replace, ["heartbeat-miss-threshold"]);
});
