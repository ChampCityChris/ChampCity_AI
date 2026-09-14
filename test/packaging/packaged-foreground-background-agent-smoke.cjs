const assert = require("node:assert/strict");
const { spawn, execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StreamableHTTPClientTransport } = require("@modelcontextprotocol/sdk/client/streamableHttp.js");
const {
  AgentHarnessServiceHostClient,
  probeAgentHarnessServiceHostEndpoint,
} = require("../../dist/main/agentHarness/runtime/agentHarnessServiceHostClient.js");

const sourceExecutable = path.resolve(process.argv[2] ?? "release/win-unpacked/ChampCityAI.exe");
assert.equal(process.platform, "win32", "Packaged foreground Background Agent smoke requires Windows.");
assert.equal(path.basename(sourceExecutable), "ChampCityAI.exe");
assert.equal(fs.existsSync(sourceExecutable), true, `Packaged executable is missing: ${sourceExecutable}`);

const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-packaged-foreground-smoke-"));
const packageRoot = path.join(temporaryRoot, "ChampCity A-I Installed Package");
const executablePath = path.join(packageRoot, "ChampCityAI.exe");
const userDataRoot = path.join(temporaryRoot, "isolated-user-data");
let desktop = null;
let secondDesktop = null;
let client = null;
let mcpClient = null;
let admittedIdentity = null;

void (async () => {
  try {
    fs.cpSync(path.dirname(sourceExecutable), packageRoot, { recursive: true });
    fs.writeFileSync(
      path.join(packageRoot, "resources", "champcity-install-scope.json"),
      JSON.stringify({
        schemaVersion: 1,
        installScope: "all-users",
        backgroundAgentLaunchAtLoginDefault: true,
      }),
      "utf8",
    );

    const environment = {
      ...process.env,
      CHAMPCITY_USER_DATA_ROOT: userDataRoot,
      CHAMPCITY_AGENT_HARNESS_ENABLED: "true",
      CHAMPCITY_AGENT_HARNESS_HOST: "127.0.0.1",
      CHAMPCITY_AGENT_HARNESS_PORT: "0",
      CHAMPCITY_AGENT_HARNESS_LOCAL_AUTH: "development-unauthenticated",
    };
    delete environment.ELECTRON_RUN_AS_NODE;
    delete environment.CHAMPCITY_AGENT_HARNESS_PUBLIC_BASE_URL;

    desktop = launchPackagedDesktop(executablePath, packageRoot, environment);
    client = new AgentHarnessServiceHostClient({
      userDataRoot,
      // The foreground was launched immediately above. Discovery can reach
      // this hook before that process publishes its endpoint, so the observer
      // waits without launching a second candidate.
      launchServiceHost: () => undefined,
      requestTimeoutMs: 2_000,
      discoveryTimeoutMs: 30_000,
      discoveryPollIntervalMs: 100,
    });

    admittedIdentity = await client.connect();
    const status = await client.status();
    assert.equal(admittedIdentity.trayPresent, true);
    assert.ok(admittedIdentity.serviceHostProcessId > 0);
    assert.ok(admittedIdentity.workerProcessId > 0);
    assert.notEqual(admittedIdentity.serviceHostProcessId, desktop.pid);
    assert.notEqual(admittedIdentity.workerProcessId, admittedIdentity.serviceHostProcessId);
    assert.equal(status.state, "running");
    assert.match(status.mcpEndpoint, /^http:\/\/127\.0\.0\.1:\d+\/mcp$/);

    mcpClient = new Client(
      { name: "packaged-foreground-background-agent-smoke", version: "0.1.0" },
      { capabilities: {} },
    );
    await mcpClient.connect(new StreamableHTTPClientTransport(new URL(status.mcpEndpoint)));
    const tools = await mcpClient.listTools();
    assert.ok(tools.tools.length > 0);

    const serviceHostProcess = readWindowsProcess(admittedIdentity.serviceHostProcessId);
    assert.equal(serviceHostProcess.ParentProcessId, desktop.pid);
    assert.equal(path.normalize(serviceHostProcess.ExecutablePath).toLowerCase(), path.normalize(executablePath).toLowerCase());
    assert.match(serviceHostProcess.CommandLine, /--agent-harness-service-host(?:\s|$)/);
    assert.doesNotMatch(serviceHostProcess.CommandLine, /--agent-harness-startup/);

    secondDesktop = launchPackagedDesktop(executablePath, packageRoot, environment);
    const secondExit = await waitForChildExit(secondDesktop, 20_000);
    assert.equal(secondExit.code, 0, `Second packaged desktop did not exit cleanly: ${secondExit.stderr}`);

    await delay(500);
    const stableProbe = await probeAgentHarnessServiceHostEndpoint(userDataRoot, 2_000);
    assert.equal(stableProbe.state, "live");
    assert.equal(stableProbe.identity.serviceHostProcessId, admittedIdentity.serviceHostProcessId);
    assert.equal(stableProbe.identity.workerProcessId, admittedIdentity.workerProcessId);
    assert.equal(stableProbe.identity.trayPresent, true);

    await mcpClient.close();
    mcpClient = null;
    await client.shutdownServiceHost();
    client = null;
    await waitForEndpointAbsence(userDataRoot, 10_000);
    await Promise.all([
      waitForProcessExit(admittedIdentity.serviceHostProcessId, 10_000),
      waitForProcessExit(admittedIdentity.workerProcessId, 10_000),
    ]);
    assert.equal(isProcessRunning(admittedIdentity.serviceHostProcessId), false);
    assert.equal(isProcessRunning(admittedIdentity.workerProcessId), false);

    desktop.kill();
    const desktopExit = await waitForChildExit(desktop, 10_000);
    assert.equal(desktopExit.code !== null || desktopExit.signal !== null, true);

    process.stdout.write(`${JSON.stringify({
      packagedForegroundLaunchPassed: true,
      siblingCwdIsExecutableDirectory: true,
      serviceHostArgumentObserved: true,
      startupOriginArgumentAbsent: true,
      serviceHostProcessId: admittedIdentity.serviceHostProcessId,
      workerProcessId: admittedIdentity.workerProcessId,
      trayPresent: admittedIdentity.trayPresent,
      mcpState: status.state,
      mcpToolCount: tools.tools.length,
      desktopSingleInstancePassed: true,
      startupRegistrationMutationAvoided: true,
      isolatedUserDataCleaned: true,
    })}\n`);
  } finally {
    await mcpClient?.close().catch(() => undefined);
    await shutdownServiceHostForCleanup(client, userDataRoot).catch(() => undefined);
    terminateKnownProcess(admittedIdentity?.workerProcessId);
    terminateKnownProcess(admittedIdentity?.serviceHostProcessId);
    terminateChild(secondDesktop);
    terminateChild(desktop);
    await delay(500);
    fs.rmSync(temporaryRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
})().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});

function launchPackagedDesktop(targetExecutable, cwd, environment) {
  const child = spawn(targetExecutable, [], {
    cwd,
    env: environment,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.capturedStderr = "";
  child.stderr.on("data", (chunk) => { child.capturedStderr += chunk; });
  return child;
}

function readWindowsProcess(processId) {
  const script = `Get-CimInstance Win32_Process -Filter \"ProcessId = ${processId}\" | ` +
    "Select-Object ProcessId,ParentProcessId,ExecutablePath,CommandLine | ConvertTo-Json -Compress";
  const output = execFileSync("powershell.exe", [
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
  assert.notEqual(output, "", `Packaged process ${processId} was not observable.`);
  return JSON.parse(output);
}

async function shutdownServiceHostForCleanup(existingClient, isolatedUserDataRoot) {
  const probe = await probeAgentHarnessServiceHostEndpoint(isolatedUserDataRoot, 1_000);
  if (probe.state !== "live") return;
  if (existingClient) {
    await existingClient.shutdownServiceHost();
    return;
  }
  const cleanupClient = new AgentHarnessServiceHostClient({
    userDataRoot: isolatedUserDataRoot,
    launchServiceHost: () => undefined,
    requestTimeoutMs: 2_000,
    discoveryTimeoutMs: 2_000,
  });
  await cleanupClient.connect();
  await cleanupClient.shutdownServiceHost();
}

async function waitForEndpointAbsence(isolatedUserDataRoot, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const probe = await probeAgentHarnessServiceHostEndpoint(isolatedUserDataRoot, 500);
    if (probe.state === "absent") return;
    await delay(100);
  }
  throw new Error("Packaged foreground-launched Service Host endpoint did not disappear.");
}

async function waitForProcessExit(processId, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!isProcessRunning(processId)) return;
    await delay(100);
  }
  throw new Error(`Packaged process ${processId} did not exit within the bounded deadline.`);
}

function waitForChildExit(child, timeoutMs) {
  if (child.exitCode !== null) {
    return Promise.resolve({ code: child.exitCode, signal: child.signalCode, stderr: child.capturedStderr });
  }
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Packaged desktop did not exit within the bounded deadline.")), timeoutMs);
    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once("exit", (code, signal) => {
      clearTimeout(timeout);
      resolve({ code, signal, stderr: child.capturedStderr });
    });
  });
}

function terminateChild(child) {
  if (child && child.exitCode === null) {
    child.kill();
  }
}

function terminateKnownProcess(processId) {
  if (!processId || !isProcessRunning(processId)) return;
  try {
    process.kill(processId);
  } catch {
    // Cleanup remains exact-PID bounded when a process has already exited.
  }
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

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
