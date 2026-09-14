const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const electronPath = require("electron");
const {
  acquireDesktopLifecycleLease,
  getDesktopLifecycleLeasePath,
  releaseDesktopLifecycleLease,
} = require("../../dist/main/agentHarness/runtime/desktopLifecycleLease.js");
const {
  AgentHarnessServiceHostClient,
  probeAgentHarnessServiceHostEndpoint,
} = require("../../dist/main/agentHarness/runtime/agentHarnessServiceHostClient.js");

const executablePath = path.resolve(process.argv[2] ?? "release/win-unpacked/ChampCityAI.exe");
assert.equal(path.basename(executablePath), "ChampCityAI.exe");
assert.equal(fs.existsSync(executablePath), true, `Packaged executable is missing: ${executablePath}`);

void (async () => {
  const maintenanceFirst = await proveMaintenancePreventsPackagedDesktop();
  const desktopFirst = await provePackagedDesktopPreventsMaintenance();
  process.stdout.write(`${JSON.stringify({
    executablePath,
    isolatedUserData: true,
    maintenanceFirst,
    desktopFirst,
  })}\n`);
})().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});

async function proveMaintenancePreventsPackagedDesktop() {
  const userDataRoot = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-maintenance-first-"));
  const acquisition = await acquireDesktopLifecycleLease(userDataRoot, "uninstall-maintenance");
  assert.equal(acquisition.acquired, true);
  try {
    const desktop = spawnChampCity([], userDataRoot);
    const exitCode = await waitForChildExit(desktop, 10_000);
    assert.equal(exitCode, 0, `Lease-blocked packaged desktop exited ${exitCode}: ${desktop.stderrText()}`);
    const retainedLease = JSON.parse(fs.readFileSync(getDesktopLifecycleLeasePath(userDataRoot), "utf8"));
    assert.equal(retainedLease.leaseId, acquisition.lease.leaseId);
    return {
      maintenanceLeaseId: acquisition.lease.leaseId,
      blockedDesktopProcessId: desktop.pid,
      blockedDesktopExitCode: exitCode,
      browserWindowCreationPrevented: true,
    };
  } finally {
    assert.equal(await releaseDesktopLifecycleLease(userDataRoot, acquisition.lease), true);
  }
}

async function provePackagedDesktopPreventsMaintenance() {
  const userDataRoot = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-desktop-first-"));
  const releasePath = path.join(userDataRoot, "desktop-maintenance-fixture-release");
  const desktop = spawnElectronDesktopFixture(userDataRoot, releasePath);
  let observedLease = null;
  try {
    const ready = await waitForDesktopReady(desktop, 20_000);
    assert.equal(ready.desktopProcessId, desktop.pid);
    assert.equal(ready.normalWindowCount, 1);
    observedLease = await waitForLease(userDataRoot, "desktop", desktop.pid, 5_000);
    assert.equal(desktop.exitCode, null, `Packaged desktop closed unexpectedly: ${desktop.stderrText()}`);

    const maintenance = spawnChampCity(["--champcity-uninstall-cleanup"], userDataRoot);
    const maintenanceExitCode = await waitForChildExit(maintenance, 10_000);
    assert.equal(
      maintenanceExitCode,
      20,
      `Desktop-blocked uninstall maintenance exited ${maintenanceExitCode}: ${maintenance.stderrText()}`,
    );
    assert.equal(desktop.exitCode, null, "Uninstall maintenance perturbed the live packaged desktop.");
    const retainedLease = JSON.parse(fs.readFileSync(getDesktopLifecycleLeasePath(userDataRoot), "utf8"));
    assert.equal(retainedLease.leaseId, observedLease.leaseId);
    return {
      desktopProcessId: desktop.pid,
      desktopLeaseId: observedLease.leaseId,
      browserWindowCount: ready.normalWindowCount,
      uninstallMaintenanceExitCode: maintenanceExitCode,
      desktopRemainedAlive: true,
    };
  } finally {
    if (desktop.exitCode === null) {
      fs.writeFileSync(releasePath, "release\n", "utf8");
      await waitForChildExit(desktop, 15_000);
    }
    await shutdownBackgroundAgentIfPresent(userDataRoot);
  }
}

function spawnChampCity(args, userDataRoot) {
  const environment = {
    ...process.env,
    CHAMPCITY_USER_DATA_ROOT: userDataRoot,
  };
  delete environment.ELECTRON_RUN_AS_NODE;
  const child = spawn(executablePath, args, {
    cwd: path.dirname(executablePath),
    env: environment,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  let stderr = "";
  child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
  child.stderrText = () => stderr;
  return child;
}

function spawnElectronDesktopFixture(userDataRoot, releasePath) {
  const environment = {
    ...process.env,
    CHAMPCITY_USER_DATA_ROOT: userDataRoot,
    CHAMPCITY_AGENT_HARNESS_ENABLED: "true",
    CHAMPCITY_AGENT_HARNESS_HOST: "127.0.0.1",
    CHAMPCITY_AGENT_HARNESS_PORT: "0",
    CHAMPCITY_AGENT_HARNESS_LOCAL_AUTH: "development-unauthenticated",
    CHAMPCITY_TEST_DESKTOP_MAINTENANCE_EXCLUSION: "true",
    CHAMPCITY_TEST_DESKTOP_MAINTENANCE_RELEASE_PATH: releasePath,
  };
  delete environment.ELECTRON_RUN_AS_NODE;
  const fixturePath = path.join(
    __dirname,
    "..",
    "agent-harness",
    "fixtures",
    "electron-agent-harness-service-host-desktop.cjs",
  );
  const child = spawn(electronPath, [fixturePath], {
    cwd: path.join(__dirname, "..", ".."),
    env: environment,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
  child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
  child.stdoutText = () => stdout;
  child.stderrText = () => stderr;
  return child;
}

async function waitForDesktopReady(desktop, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  const pattern = /CHAMPCITY_DESKTOP_MAINTENANCE_READY=(\{.*\})/;
  while (Date.now() < deadline) {
    const match = desktop.stdoutText().match(pattern);
    if (match) return JSON.parse(match[1]);
    if (desktop.exitCode !== null) {
      throw new Error(`Electron desktop fixture exited before readiness: ${desktop.stderrText()}`);
    }
    await wait(50);
  }
  throw new Error(`Timed out waiting for Electron desktop fixture readiness: ${desktop.stderrText()}`);
}

async function waitForLease(userDataRoot, owner, processId, timeoutMs) {
  const leasePath = getDesktopLifecycleLeasePath(userDataRoot);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const lease = JSON.parse(fs.readFileSync(leasePath, "utf8"));
      if (lease.owner === owner && lease.processId === processId) return lease;
    } catch {
      // The packaged process may still be starting or writing its exclusive claim.
    }
    if (processId && !isProcessRunning(processId)) {
      throw new Error(`Packaged desktop exited before acquiring its ${owner} lease.`);
    }
    await wait(50);
  }
  throw new Error(`Timed out waiting for the packaged ${owner} lease.`);
}

async function shutdownBackgroundAgentIfPresent(userDataRoot) {
  const probe = await probeAgentHarnessServiceHostEndpoint(userDataRoot, 1_000);
  if (probe.state !== "live") return;
  const client = new AgentHarnessServiceHostClient({
    userDataRoot,
    launchServiceHost: () => undefined,
    requestTimeoutMs: 2_000,
    discoveryTimeoutMs: 2_000,
    discoveryPollIntervalMs: 50,
  });
  await client.connect();
  await client.shutdownServiceHost();
}

function waitForChildExit(target, timeoutMs) {
  if (target.exitCode !== null) return Promise.resolve(target.exitCode);
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(
      `Executable did not exit. stdout=${target.stdoutText?.() ?? "<not captured>"}; ` +
        `stderr=${target.stderrText?.() ?? "<not captured>"}`,
    )), timeoutMs);
    target.once("exit", (code) => {
      clearTimeout(timeout);
      resolve(code);
    });
    target.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

function isProcessRunning(processId) {
  try {
    process.kill(processId, 0);
    return true;
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ESRCH") return false;
    if (error && typeof error === "object" && error.code === "EPERM") return true;
    throw error;
  }
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
