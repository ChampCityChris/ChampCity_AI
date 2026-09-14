const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { app, BrowserWindow, dialog } = require("electron");
const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StreamableHTTPClientTransport } = require("@modelcontextprotocol/sdk/client/streamableHttp.js");

const repositoryRoot = path.resolve(__dirname, "../../..");
const userDataRoot = process.env.CHAMPCITY_USER_DATA_ROOT;
const selectedWorkspaceRoot = process.env.CHAMPCITY_TEST_SELECTED_WORKSPACE_ROOT || null;
const exerciseControls = process.env.CHAMPCITY_TEST_EXERCISE_CONTROLS === "true";
const idleDesktopHeartbeat = process.env.CHAMPCITY_TEST_IDLE_DESKTOP_HEARTBEAT === "true";
const codexStartupMode = process.env.CHAMPCITY_TEST_CODEX_STARTUP_MODE || null;
const measureDesktopHeartbeat = process.env.CHAMPCITY_TEST_MEASURE_DESKTOP_HEARTBEAT === "true";
const exerciseBackgroundLifecycle = process.env.CHAMPCITY_TEST_EXERCISE_BACKGROUND_LIFECYCLE === "true";
const verifySingleInstance = process.env.CHAMPCITY_TEST_VERIFY_SINGLE_INSTANCE === "true";
const exerciseDesktopMaintenanceExclusion =
  process.env.CHAMPCITY_TEST_DESKTOP_MAINTENANCE_EXCLUSION === "true";
const desktopMaintenanceReleasePath =
  process.env.CHAMPCITY_TEST_DESKTOP_MAINTENANCE_RELEASE_PATH || null;

if (!userDataRoot) {
  throw new Error("Service Host desktop fixture requires an isolated user-data root.");
}

app.commandLine.appendSwitch("headless");
app.commandLine.appendSwitch("disable-gpu");

let loginItemSettings = { openAtLogin: false, executableWillLaunchAtLogin: false, launchItems: [] };
let runObservation = { state: "absent" };
const windowsRunObservation = require(path.join(
  repositoryRoot,
  "dist/main/agentHarness/runtime/windowsRunObservation.js",
));
windowsRunObservation.observeCurrentUserWindowsRunValue = () => runObservation;
app.setLoginItemSettings = (settings) => {
  const enabled = Boolean(settings.openAtLogin);
  loginItemSettings = {
    openAtLogin: enabled,
    executableWillLaunchAtLogin: enabled,
    launchItems: enabled ? [{
      name: settings.name,
      path: settings.path,
      args: settings.args,
      scope: "user",
      enabled: Boolean(settings.enabled),
    }] : [],
  };
  runObservation = enabled
    ? { state: "present", command: `"${settings.path}" ${settings.args.join(" ")}` }
    : { state: "absent" };
};
app.getLoginItemSettings = () => ({ ...loginItemSettings });

dialog.showOpenDialog = async (options) => {
  if (options && options.title === "Import Legacy OAuth Client Registry") {
    return { canceled: true, filePaths: [] };
  }
  if (selectedWorkspaceRoot) {
    return { canceled: false, filePaths: [selectedWorkspaceRoot] };
  }
  return { canceled: true, filePaths: [] };
};

assert.ok(!codexStartupMode || (idleDesktopHeartbeat && codexStartupMode === "eager"),
  "Codex startup interception is limited to the idle Desktop diagnostic.");
const codexStartup = codexStartupMode
  ? require("../support/codex-startup-observation.cjs").observeCodexStartup(repositoryRoot, codexStartupMode)
  : null;

require(path.join(repositoryRoot, "dist/main/bootstrap.js"));

let fallback = setTimeout(() => {
  process.stderr.write("Service Host desktop fixture timed out.\n");
  app.exit(1);
}, 170_000);

app.whenReady()
  .then(exerciseDesktopMaintenanceExclusion ? runDesktopMaintenanceExclusionScenario : runDesktopScenario)
  .then((evidence) => {
    process.stdout.write(`AGENT_HARNESS_SERVICE_HOST_DESKTOP_RESULT=${JSON.stringify(evidence)}\n`);
    app.quit();
  })
  .catch((error) => {
    process.stderr.write(`${error && error.stack ? error.stack : String(error)}\n`);
    app.exit(1);
  });

app.on("will-quit", () => {
  clearTimeout(fallback);
  fallback = null;
  process.stdout.write("AGENT_HARNESS_SERVICE_HOST_DESKTOP_GRACEFUL=1\n");
});

async function runDesktopScenario() {
  const window = await waitForMainWindow();
  await waitForLoad(window);

  const initialStatus = await invoke(window, "window.champcity.getAgentHarnessStatus()");
  const initialLifecycleStatus = await invoke(
    window,
    "window.champcity.getAgentHarnessServiceHostLifecycleStatus()",
  );
  assert.ok(["running", "stopped"].includes(initialStatus.state));

  let controlStates = null;
  if (exerciseControls) {
    const stopped = await invoke(window, "window.champcity.stopAgentHarness()");
    const started = await invoke(window, "window.champcity.startAgentHarness()");
    const restarted = await invoke(window, "window.champcity.restartAgentHarness()");
    const configured = await invoke(window, `window.champcity.saveAgentHarnessSettings({
      enabled: true,
      host: "127.0.0.1",
      port: 0,
      publicBaseUrl: null,
      localAuthenticationMode: "local-unauthenticated",
    })`);
    const imported = await invoke(window, "window.champcity.importLegacyOAuthClients()");
    controlStates = {
      stopped: stopped.state,
      started: started.state,
      restarted: restarted.state,
      configured: configured.state,
      importCanceled: imported.canceled,
    };
  }

  let selection = await invoke(window, "window.champcity.getSelectedWorkspace()");
  if (selectedWorkspaceRoot) {
    selection = await invoke(window, "window.champcity.chooseWorkspaceFolder()");
    assert.equal(selection.ok, true);
    assert.equal(selection.workspaceRoot, selectedWorkspaceRoot);
  }
  let registryManagement = null;
  if (selectedWorkspaceRoot) {
    const listed = await invoke(window, "window.champcity.listAgentHarnessRegisteredWorkspaces()");
    const added = await invoke(window, "window.champcity.chooseAndRegisterAgentHarnessWorkspace()");
    const removed = await invoke(
      window,
      `window.champcity.unregisterAgentHarnessWorkspace(${JSON.stringify(added.workspace.workspaceId)})`,
    );
    const selectionAfterRemoval = await invoke(window, "window.champcity.getSelectedWorkspace()");
    const restored = await invoke(window, "window.champcity.chooseAndRegisterAgentHarnessWorkspace()");
    registryManagement = { listed, added, removed, selectionAfterRemoval, restored };
  }
  const status = await invoke(window, "window.champcity.getAgentHarnessStatus()");
  const crossWorkspaceRouting = selectedWorkspaceRoot && status.registeredWorkspaceIds.includes("project_b")
    ? await verifyCrossWorkspaceRoutingWhileDesktopSelectsA(window, status, selection)
    : null;
  let backgroundLifecycle = null;
  let singleInstance = null;
  if (exerciseBackgroundLifecycle) {
    const exited = await invoke(window, "window.champcity.exitBackgroundAgent()");
    const passiveRefresh = await invoke(window, "window.champcity.getAgentHarnessServiceHostLifecycleStatus()");
    const blockedRuntime = await invoke(window, `window.champcity.getAgentHarnessStatus().then(
      () => ({ unexpectedlyAvailable: true }),
      (error) => ({ unexpectedlyAvailable: false, message: error.message }),
    )`);
    singleInstance = verifySingleInstance
      ? await verifySecondDesktopInvocation(window)
      : null;
    const afterSecondInstance = await invoke(
      window,
      "window.champcity.getAgentHarnessServiceHostLifecycleStatus()",
    );
    const runtimeAfterSecondInstance = await invoke(window, `window.champcity.getAgentHarnessStatus().then(
      () => ({ unexpectedlyAvailable: true }),
      (error) => ({ unexpectedlyAvailable: false, message: error.message }),
    )`);
    const started = await invoke(window, "window.champcity.startBackgroundAgent()");
    const restoredStatus = await invoke(window, "window.champcity.getAgentHarnessStatus()");
    const restoredRegistry = await invoke(window, "window.champcity.listAgentHarnessRegisteredWorkspaces()");
    backgroundLifecycle = {
      exited,
      passiveRefresh,
      blockedRuntime,
      afterSecondInstance,
      runtimeAfterSecondInstance,
      started,
      restoredStatus,
      restoredRegistry,
    };
  }
  singleInstance = singleInstance || (verifySingleInstance
    ? await verifySecondDesktopInvocation(window)
    : null);
  const descriptor = JSON.parse(fs.readFileSync(
    path.join(userDataRoot, "agent-harness", "service-host.json"),
    "utf8",
  ));
  const desktopHeartbeat = (measureDesktopHeartbeat || idleDesktopHeartbeat)
    ? await measureHeartbeatDuringWorkerSearch(window, status)
    : null;
  return {
    desktopProcessId: process.pid,
    serviceHostProcessId: descriptor.serviceHostProcessId,
    descriptor,
    status,
    lifecycleStatus: initialLifecycleStatus,
    selection,
    registryManagement,
    crossWorkspaceRouting,
    controlStates,
    normalWindowCount: BrowserWindow.getAllWindows().length,
    desktopHeartbeat,
    backgroundLifecycle,
    singleInstance,
  };
}

async function runDesktopMaintenanceExclusionScenario() {
  assert.ok(desktopMaintenanceReleasePath);
  const window = await waitForMainWindow();
  await waitForLoad(window);
  process.stdout.write(`CHAMPCITY_DESKTOP_MAINTENANCE_READY=${JSON.stringify({
    desktopProcessId: process.pid,
    normalWindowCount: BrowserWindow.getAllWindows().length,
  })}\n`);
  while (!fs.existsSync(desktopMaintenanceReleasePath)) {
    await delay(50);
  }
  return {
    desktopProcessId: process.pid,
    normalWindowCount: BrowserWindow.getAllWindows().length,
    desktopMaintenanceExclusion: true,
  };
}

async function verifySecondDesktopInvocation(window) {
  const environment = { ...process.env, CHAMPCITY_USER_DATA_ROOT: userDataRoot };
  delete environment.ELECTRON_RUN_AS_NODE;
  const child = spawn(process.execPath, [repositoryRoot], {
    cwd: repositoryRoot,
    env: environment,
    stdio: "ignore",
    windowsHide: true,
  });
  const exitCode = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error("Second desktop invocation did not exit through the single-instance boundary."));
    }, 15_000);
    child.once("error", reject);
    child.once("exit", (code) => {
      clearTimeout(timeout);
      resolve(code);
    });
  });
  await delay(100);
  return {
    secondInvocationExitCode: exitCode,
    firstDesktopWindowCount: BrowserWindow.getAllWindows().length,
    firstDesktopWindowDestroyed: window.isDestroyed(),
  };
}

async function verifyCrossWorkspaceRoutingWhileDesktopSelectsA(window, status, selectionBefore) {
  assert.equal(selectionBefore.ok, true);
  assert.ok(status.mcpEndpoint);
  const mcpClient = new Client({
    name: "champcity-agent-harness-cross-workspace-routing-test",
    version: "0.1.0",
  }, { capabilities: {} });
  try {
    await mcpClient.connect(new StreamableHTTPClientTransport(new URL(status.mcpEndpoint)));
    const projectB = await mcpClient.callTool({
      name: "repo_toolbox",
      arguments: {
        workspaceId: "project_b",
        action: "read_file",
        params: { relativePath: "README.md" },
      },
    });
    const selectionAfter = await invoke(window, "window.champcity.getSelectedWorkspace()");
    assert.equal(projectB.structuredContent.ok, true);
    assert.equal(selectionAfter.ok, true);
    assert.equal(selectionAfter.workspaceRoot, selectionBefore.workspaceRoot);
    return {
      projectBExactRead: true,
      desktopSelectionUnchanged: true,
    };
  } finally {
    await mcpClient.close().catch(() => undefined);
  }
}

async function measureHeartbeatDuringWorkerSearch(window, status) {
  assert.ok(selectedWorkspaceRoot, "Desktop heartbeat scenario requires a selected workspace.");
  assert.ok(status.mcpEndpoint, "Desktop heartbeat scenario requires a running MCP endpoint.");

  const { AgentHarnessServiceHostClient } = require(path.join(
    repositoryRoot,
    "dist/main/agentHarness/runtime/agentHarnessServiceHostClient.js",
  ));
  const serviceHostClient = new AgentHarnessServiceHostClient({
    userDataRoot,
    launchServiceHost: () => {
      throw new Error("Desktop heartbeat scenario expected the production desktop to establish the Service Host.");
    },
    requestTimeoutMs: 15_000,
    discoveryTimeoutMs: 15_000,
  });
  const identity = await serviceHostClient.connect();
  let loadClient = null;
  let mcpLoadCleanup = null;
  let measurement = null;
  try {
    const { startExternalMcpLoadClient } = require("../support/external-mcp-load-client.cjs");
    const { measureHeartbeat } = require("../support/heartbeat-measurement.cjs");
    if (!idleDesktopHeartbeat) {
      loadClient = await startExternalMcpLoadClient({
        repositoryRoot, userDataRoot, mcpEndpoint: status.mcpEndpoint,
      });
    }
    measurement = {
      ...await measureHeartbeat(loadClient),
      scenario: idleDesktopHeartbeat ? "Normal eager startup" : "Experiment C",
      ownerProcessId: process.pid,
      desktopProcessId: process.pid,
      mcpLoadClientProcessId: loadClient?.processId ?? null,
      serviceHostProcessId: identity.serviceHostProcessId,
      workerProcessId: identity.workerProcessId,
      normalWindowPresentDuringOperation: BrowserWindow.getAllWindows().includes(window),
      normalWindowCountDuringOperation: BrowserWindow.getAllWindows().length,
    };
    if (codexStartup) {
      measurement.codexStartup = codexStartup.snapshot(measurement);
      const status = await waitForCodexRuntimeTerminal(window);
      measurement.codexStartupTerminal = {
        observation: codexStartup.snapshot(measurement),
        status: {
          version: status.version,
          updateState: status.updateState,
          catalogCount: status.catalog.length,
          selection: status.selection,
          selectionBlocker: status.selectionBlocker,
          message: status.message,
        },
      };
    }
  } finally {
    if (loadClient) {
      mcpLoadCleanup = await loadClient.close();
    }
    serviceHostClient.disconnect();
  }
  return { ...measurement, mcpLoadCleanup };
}

async function waitForCodexRuntimeTerminal(window) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const status = await invoke(window, "window.champcity.getCodexManagedRuntimeStatus()");
    if (!["initializing", "checking"].includes(status.updateState)) {
      return status;
    }
    await delay(50);
  }
  assert.fail("Managed Codex initializer did not reach a bounded terminal status.");
}

async function waitForMainWindow() {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    const window = BrowserWindow.getAllWindows()[0];
    if (window) {
      return window;
    }
    await delay(50);
  }
  assert.fail("ChampCity A/I main window was not created.");
}

async function waitForLoad(window) {
  if (!window.webContents.isLoading()) {
    return;
  }
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("ChampCity A/I renderer did not load.")), 10_000);
    window.webContents.once("did-finish-load", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

function invoke(window, expression) {
  return window.webContents.executeJavaScript(`(async () => ${expression})()`);
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
