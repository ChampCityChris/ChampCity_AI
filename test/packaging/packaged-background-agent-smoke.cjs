const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync, spawn } = require("node:child_process");
const {
  AgentHarnessServiceHostClient,
  probeAgentHarnessServiceHostEndpoint,
} = require("../../dist/main/agentHarness/runtime/agentHarnessServiceHostClient.js");
const {
  readAgentHarnessServiceHostDescriptor,
} = require("../../dist/main/agentHarness/runtime/agentHarnessServiceHostDescriptor.js");
const {
  getDesktopLifecycleLeasePath,
} = require("../../dist/main/agentHarness/runtime/desktopLifecycleLease.js");

const executablePath = path.resolve(process.argv[2] ?? "release/win-unpacked/ChampCityAI.exe");
assert.equal(path.basename(executablePath), "ChampCityAI.exe");
assert.equal(fs.existsSync(executablePath), true, `Packaged executable is missing: ${executablePath}`);

const isolatedUserDataRoot = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-packaged-smoke-"));
const childEnvironment = {
  ...process.env,
  CHAMPCITY_USER_DATA_ROOT: isolatedUserDataRoot,
};
delete childEnvironment.ELECTRON_RUN_AS_NODE;

const child = spawn(executablePath, ["--agent-harness-service-host"], {
  cwd: path.dirname(executablePath),
  env: childEnvironment,
  stdio: ["ignore", "pipe", "pipe"],
  windowsHide: true,
});
let stderr = "";
child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });

const client = new AgentHarnessServiceHostClient({
  userDataRoot: isolatedUserDataRoot,
  // The executable was spawned immediately above; discovery may reach this
  // hook before its endpoint is listening, so the hook deliberately does not
  // launch a second candidate.
  launchServiceHost: () => undefined,
  requestTimeoutMs: 2_000,
  discoveryTimeoutMs: 20_000,
  discoveryPollIntervalMs: 100,
});

void (async () => {
let admittedIdentity = null;
try {
  const identity = await client.connect();
  admittedIdentity = identity;
  assert.match(identity.runtimeBuildIdentity, /^sha256:[0-9a-f]{64}$/);
  assert.equal(identity.trayPresent, true);
  assert.ok(identity.serviceHostProcessId > 0);
  assert.ok(identity.workerProcessId > 0);
  assert.equal(isProcessRunning(identity.serviceHostProcessId), true);
  assert.equal(isProcessRunning(identity.workerProcessId), true);
  await delay(750);
  const stableProbe = await probeAgentHarnessServiceHostEndpoint(isolatedUserDataRoot, 2_000);
  assert.equal(stableProbe.state, "live");
  assert.equal(stableProbe.identity.serviceHostProcessId, identity.serviceHostProcessId);
  assert.equal(stableProbe.identity.workerProcessId, identity.workerProcessId);
  assert.equal(stableProbe.identity.trayPresent, true);
  assert.equal(isProcessRunning(stableProbe.identity.serviceHostProcessId), true);
  assert.equal(isProcessRunning(stableProbe.identity.workerProcessId), true);
  const serviceHostMainWindowHandle = readWindowsMainWindowHandle(identity.serviceHostProcessId);
  assert.equal(serviceHostMainWindowHandle, "0");
  const maintenance = spawn(executablePath, ["--champcity-uninstall-cleanup"], {
    cwd: path.dirname(executablePath),
    env: childEnvironment,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  let maintenanceStderr = "";
  maintenance.stderr.on("data", (chunk) => { maintenanceStderr += chunk.toString(); });
  const maintenanceExitCode = await waitForChildExit(maintenance, 20_000);
  const postMaintenanceFailureProbe = maintenanceExitCode === 0
    ? null
    : await probeAgentHarnessServiceHostEndpoint(isolatedUserDataRoot, 2_000);
  assert.equal(
    maintenanceExitCode,
    0,
    `Packaged uninstall maintenance exited ${maintenanceExitCode}: ${maintenanceStderr}; ` +
      `postMaintenanceFailureProbe=${JSON.stringify(postMaintenanceFailureProbe)}`,
  );
  await waitForEndpointAbsence(isolatedUserDataRoot, 5_000);
  const serviceHostExitCode = await waitForChildExit(child, 5_000);
  assert.equal(serviceHostExitCode, 0, `Packaged Background Agent exited ${serviceHostExitCode}: ${stderr}`);
  assert.equal(readAgentHarnessServiceHostDescriptor(isolatedUserDataRoot), null);
  assert.equal(isProcessRunning(identity.workerProcessId), false);
  assert.equal(isProcessRunning(identity.serviceHostProcessId), false);
  assert.equal(fs.existsSync(getDesktopLifecycleLeasePath(isolatedUserDataRoot)), false);
  process.stdout.write(`${JSON.stringify({
    executablePath,
    isolatedUserData: true,
    runtimeBuildIdentity: identity.runtimeBuildIdentity,
    trayPresent: identity.trayPresent,
    serviceHostProcessId: identity.serviceHostProcessId,
    workerProcessId: identity.workerProcessId,
    serviceHostMainWindowHandle,
    noForegroundServiceHostWindowWhileLive: true,
    uninstallMaintenanceExitCode: maintenanceExitCode,
    descriptorAbsentAtMaintenanceExit: true,
    workerExitedAtMaintenanceExit: true,
    serviceHostExitedAtMaintenanceExit: true,
    maintenanceLeaseReleasedAtExit: true,
  })}\n`);
} catch (error) {
  await client.shutdownServiceHost().catch(() => undefined);
  await waitForChildExit(child, 5_000).catch(() => undefined);
  const diagnostic = `admittedIdentity=${JSON.stringify(admittedIdentity)}; terminalProcessState=${JSON.stringify({
    serviceHostRunning: admittedIdentity ? isProcessRunning(admittedIdentity.serviceHostProcessId) : null,
    workerRunning: admittedIdentity?.workerProcessId ? isProcessRunning(admittedIdentity.workerProcessId) : null,
  })}; hostExitCode=${child.exitCode}; hostStderr=${stderr || "<empty>"}`;
  throw new Error(`${error instanceof Error ? error.stack : String(error)}\n${diagnostic}`);
}
})().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});

async function waitForEndpointAbsence(userDataRoot, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const probe = await probeAgentHarnessServiceHostEndpoint(userDataRoot, 500);
    if (probe.state === "absent") return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Packaged Background Agent endpoint did not disappear after graceful shutdown.");
}

function readWindowsMainWindowHandle(processId) {
  assert.equal(process.platform, "win32", "Packaged Windows smoke requires Windows.");
  assert.equal(Number.isSafeInteger(processId) && processId > 0, true);
  const script = `$target = Get-Process -Id ${processId} -ErrorAction Stop; ` +
    "[Console]::Write($target.MainWindowHandle.ToInt64())";
  return execFileSync("powershell.exe", [
    "-NoLogo",
    "-NoProfile",
    "-NonInteractive",
    "-Command",
    script,
  ], {
    encoding: "utf8",
    timeout: 10_000,
    windowsHide: true,
  }).trim();
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function waitForChildExit(target, timeoutMs) {
  if (target.exitCode !== null) return Promise.resolve(target.exitCode);
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Packaged executable did not exit.")), timeoutMs);
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
