const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { app } = require("electron");
const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StreamableHTTPClientTransport } = require("@modelcontextprotocol/sdk/client/streamableHttp.js");

const repositoryRoot = path.resolve(__dirname, "../../..");
const {
  AgentHarnessController,
} = require(path.join(repositoryRoot, "dist/main/agentHarness/runtime/agentHarnessController.js"));

const differentialHeartbeat = process.env.CHAMPCITY_TEST_MINIMAL_EXTERNAL_HEARTBEAT === "true";
if (differentialHeartbeat) {
  app.commandLine.appendSwitch("headless");
}
app.commandLine.appendSwitch("disable-gpu");

app.whenReady()
  .then(differentialHeartbeat ? runMinimalExternalHeartbeat : runBoundaryScenario)
  .then((result) => {
    process.stdout.write(`AGENT_HARNESS_PROCESS_BOUNDARY_RESULT=${JSON.stringify(result)}\n`);
    app.exit(0);
  })
  .catch((error) => {
    process.stderr.write(`${error && error.stack ? error.stack : String(error)}\n`);
    app.exit(1);
  });

// The differential mode connects to the same independent production Service Host as
// Desktop. It does not instantiate the legacy direct-controller scenario below.
async function runMinimalExternalHeartbeat() {
  const userDataRoot = process.env.CHAMPCITY_USER_DATA_ROOT;
  assert.ok(userDataRoot, "Minimal heartbeat requires an isolated user-data root.");
  const { AgentHarnessServiceHostClient } = require(path.join(
    repositoryRoot, "dist/main/agentHarness/runtime/agentHarnessServiceHostClient.js",
  ));
  const { BrowserWindow } = require("electron");
  const { startExternalMcpLoadClient } = require("../support/external-mcp-load-client.cjs");
  const { measureHeartbeat } = require("../support/heartbeat-measurement.cjs");
  const client = new AgentHarnessServiceHostClient({
    userDataRoot,
    launchServiceHost: () => { throw new Error("Parent must establish the isolated production Service Host."); },
    requestTimeoutMs: 15_000,
    discoveryTimeoutMs: 15_000,
  });
  let loadClient = null;
  let measurement = null;
  let mcpLoadCleanup = null;
  try {
    const identity = await client.connect();
    const status = await client.status();
    assert.equal(status.state, "running");
    assert.deepEqual(status.registeredWorkspaceIds, ["project_a"]);
    assert.ok(identity.workerProcessId);
    loadClient = await startExternalMcpLoadClient({
      repositoryRoot, userDataRoot, mcpEndpoint: status.mcpEndpoint,
    });
    measurement = {
      ...await measureHeartbeat(loadClient),
      scenario: "Control B",
      ownerProcessId: process.pid,
      // Preserve the REPAIR02 exact-owner descriptor/cleanup field in minimal mode.
      desktopProcessId: process.pid,
      mcpLoadClientProcessId: loadClient.processId,
      serviceHostProcessId: identity.serviceHostProcessId,
      workerProcessId: identity.workerProcessId,
      normalWindowPresentDuringOperation: false,
      normalWindowCountDuringOperation: BrowserWindow.getAllWindows().length,
    };
  } finally {
    if (loadClient) {
      mcpLoadCleanup = await loadClient.close();
    }
    client.disconnect();
  }
  return { ...measurement, mcpLoadCleanup };
}

async function runBoundaryScenario() {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-agent-harness-process-boundary-"));
  const userDataRoot = path.join(container, "user-data");
  const projectA = createWorkspace(container, "Project_A", "alpha selected project");
  const projectB = createWorkspace(container, "Project_B", "beta replacement project");
  createSearchWorkload(projectA);

  const controller = new AgentHarnessController({
    workerEntryPath: path.join(repositoryRoot, "dist/main/agentHarness/runtime/agentHarnessWorker.js"),
    userDataRoot,
    environmentOverrides: {
      enabled: true,
      host: "127.0.0.1",
      port: 0,
      allowUnauthenticatedLocal: true,
    },
    requestTimeoutMs: 60_000,
    shutdownTimeoutMs: 10_000,
  });

  let mcpClient = null;
  let failedWorkerPid = null;
  try {
    const started = await controller.start();
    const initialWorkerPid = controller.workerProcessId();
    assert.ok(initialWorkerPid);
    assert.notEqual(initialWorkerPid, process.pid);
    assert.equal(started.state, "running");
    assert.equal(started.registeredWorkspaceCount, 0);
    assert.ok(started.healthEndpoint);
    assert.ok(started.readinessEndpoint);
    assert.ok(started.mcpEndpoint);
    const initialWorkerGeneration = started.operationalDiagnostics.workerGeneration;
    assert.equal((await getJson(started.healthEndpoint)).app, "ChampCity A/I Agent Harness");

    const status = await controller.status();
    assert.equal(status.state, "running");
    assert.equal(controller.workerProcessId(), initialWorkerPid);

    const stopped = await controller.stop();
    assert.equal(stopped.state, "stopped");
    await assert.rejects(() => fetch(started.healthEndpoint));

    const startedAgain = await controller.start();
    assert.equal(startedAgain.state, "running");
    const restarted = await controller.restart();
    assert.equal(restarted.state, "running");
    const configured = await controller.saveConfiguration({
      enabled: true,
      host: "127.0.0.1",
      port: 0,
      publicBaseUrl: null,
      localAuthenticationMode: "local-unauthenticated",
    });
    assert.equal(configured.state, "running");
    await assert.rejects(
      () => controller.saveConfiguration({ host: "0.0.0.0" }),
      (error) => error &&
        error.name === "AgentHarnessControllerError" &&
        error.code === "AGENT_HARNESS_CONTROL_OPERATION_FAILED" &&
        /loopback hosts/.test(error.message),
    );
    assert.equal((await controller.status()).state, "running");
    const imported = await controller.importLegacyOAuthClientRegistry({ clients: [] });
    assert.deepEqual(imported, {
      canceled: false,
      importedCount: 0,
      alreadyPresentCount: 0,
      totalAcceptedCount: 0,
      registeredClientCount: 0,
    });

    mcpClient = await connectMcpClient(configured.mcpEndpoint);
    const tools = await mcpClient.listTools();
    assert.ok(tools.tools.some((tool) => tool.name === "repo_toolbox"));
    assert.ok(tools.tools.some((tool) => tool.name === "git_toolbox"));

    const unbound = await callTool(mcpClient, "repo_toolbox", {
      workspaceId: "project_a",
      action: "list_files",
    });
    assert.equal(unbound.structuredContent.ok, false);

    const registeredA = await controller.registerWorkspace(projectA);
    const registeredB = await controller.registerWorkspace(projectB);
    assert.equal(registeredA.workspace.workspaceId, "project_a");
    assert.equal(registeredB.workspace.workspaceId, "project_b");
    assert.deepEqual((await controller.listRegisteredWorkspaces()).workspaces.map((entry) => entry.workspaceId), ["project_a", "project_b"]);

    const listedA = await callTool(mcpClient, "repo_toolbox", {
      workspaceId: "project_a",
      action: "list_files",
      params: { directory: "docs", maxFiles: 30 },
    });
    assert.equal(listedA.structuredContent.ok, true);
    assert.ok(listedA.structuredContent.payload.files.includes("docs/overview.md"));

    const readA = await callTool(mcpClient, "repo_toolbox", {
      workspaceId: "project_a",
      action: "read_file",
      params: { relativePath: "README.md" },
    });
    assert.match(readA.structuredContent.payload.content, /alpha selected project/);

    const simpleSearch = await callTool(mcpClient, "repo_toolbox", {
      workspaceId: "project_a",
      action: "search_files",
      params: { directory: ".", query: "selected project", maxResults: 10 },
    });
    assert.equal(simpleSearch.structuredContent.ok, true);

    const writeA = await callTool(mcpClient, "repo_toolbox", {
      workspaceId: "project_a",
      action: "write_markdown_artifact",
      params: {
        relativePath: "planning/process-boundary.md",
        content: "# Process boundary\n\nWritten through the worker-backed MCP endpoint.\n",
      },
    });
    assert.equal(writeA.structuredContent.ok, true);
    assert.equal(fs.existsSync(path.join(projectA, "planning", "process-boundary.md")), true);

    const gitA = await callTool(mcpClient, "git_toolbox", {
      workspaceId: "project_a",
      action: "status",
    });
    assert.equal(gitA.structuredContent.ok, true);
    assert.equal(gitA.structuredContent.payload.gitBacked, true);

    assert.equal(fs.existsSync(path.join(projectA, "planning", "phases")), false);
    fs.writeFileSync(path.join(projectA, "worker-bounded.txt"), "worker-backed mutation\n", "utf8");
    const boundedMutation = await callTool(mcpClient, "git_toolbox", {
      workspaceId: "project_a",
      action: "stage_changes",
      params: { paths: ["worker-bounded.txt"] },
    });
    assert.equal(boundedMutation.structuredContent.ok, true);
    assert.deepEqual(boundedMutation.structuredContent.payload.stagedPaths, ["worker-bounded.txt"]);
    assert.equal(
      execFileSync("git", ["diff", "--cached", "--name-only", "--", "worker-bounded.txt"], {
        cwd: projectA,
        encoding: "utf8",
      }).trim(),
      "worker-bounded.txt",
    );

    const readBWhileAIsAvailable = await callTool(mcpClient, "repo_toolbox", {
      workspaceId: "project_b",
      action: "read_file",
      params: { relativePath: "README.md" },
    });
    assert.equal(readBWhileAIsAvailable.structuredContent.ok, true);
    assert.match(readBWhileAIsAvailable.structuredContent.payload.content, /beta replacement project/);
    const diagnostics = await callTool(mcpClient, "diagnostics_toolbox", {
      workspaceId: "project_a",
      action: "list_workspaces",
    });
    assert.deepEqual(
      diagnostics.structuredContent.payload.workspaces.map((entry) => entry.workspaceId),
      ["project_a", "project_b"],
    );
    assert.equal(diagnostics.structuredContent.payload.workspaces.some((entry) => "root" in entry), false);
    const unknown = await callTool(mcpClient, "repo_toolbox", {
      workspaceId: "project_c",
      action: "read_file",
      params: { relativePath: "README.md" },
    });
    assert.equal(unknown.structuredContent.ok, false);
    assert.equal(unknown.structuredContent.error.code, "WORKSPACE_ACCESS_DENIED");
    const unknownDiagnostics = await callTool(mcpClient, "diagnostics_toolbox", {
      workspaceId: "project_c",
      action: "list_workspaces",
    });
    assert.equal(unknownDiagnostics.structuredContent.error.code, "WORKSPACE_ACCESS_DENIED");

    let heartbeatCount = 0;
    let firstHeartbeatAt = null;
    const operationStartedAt = Date.now();
    const heartbeat = setInterval(() => {
      heartbeatCount += 1;
      firstHeartbeatAt ??= Date.now();
    }, 5);
    const broadSearch = await callTool(mcpClient, "repo_toolbox", {
      workspaceId: "project_a",
      action: "search_files",
      params: { directory: "bulk", query: "worker-isolation-target", maxResults: 1 },
    });
    const operationCompletedAt = Date.now();
    clearInterval(heartbeat);
    assert.equal(broadSearch.structuredContent.ok, true);
    assert.equal(broadSearch.structuredContent.payload.matches.length, 1);
    assert.ok(operationCompletedAt - operationStartedAt >= 20);
    assert.ok(heartbeatCount > 0);
    assert.ok(firstHeartbeatAt < operationCompletedAt);

    const stillAvailableA = await callTool(mcpClient, "repo_toolbox", {
      workspaceId: "project_a",
      action: "read_file",
      params: { relativePath: "README.md" },
    });
    assert.equal(stillAvailableA.structuredContent.ok, true);
    const readB = await callTool(mcpClient, "repo_toolbox", {
      workspaceId: "project_b",
      action: "read_file",
      params: { relativePath: "README.md" },
    });
    assert.match(readB.structuredContent.payload.content, /beta replacement project/);

    await controller.unregisterWorkspace("project_b");
    const removed = await callTool(mcpClient, "repo_toolbox", {
      workspaceId: "project_b",
      action: "read_file",
      params: { relativePath: "README.md" },
    });
    assert.equal(removed.structuredContent.ok, false);
    assert.equal(removed.structuredContent.error.code, "WORKSPACE_ACCESS_DENIED");
    await controller.registerWorkspace(projectB);

    await mcpClient.close();
    mcpClient = null;

    failedWorkerPid = controller.workerProcessId();
    assert.ok(failedWorkerPid);
    process.kill(failedWorkerPid, "SIGTERM");
    await waitForProcessExit(failedWorkerPid, 10_000);
    const recovered = await waitForControllerRecovery(controller, failedWorkerPid, 10_000);
    const recoveredWorkerPid = controller.workerProcessId();
    assert.equal(recovered.state, "running");
    assert.deepEqual(recovered.registeredWorkspaceIds, ["project_a", "project_b"]);
    assert.ok(recoveredWorkerPid);
    assert.notEqual(recoveredWorkerPid, process.pid);
    assert.notEqual(recoveredWorkerPid, failedWorkerPid);
    assert.notEqual(recovered.operationalDiagnostics.workerGeneration, initialWorkerGeneration);
    assert.equal(recovered.operationalDiagnostics.lifecycle.workerRestartCount, 1);
    assert.equal(recovered.operationalDiagnostics.lifecycle.lastWorkerRestartReason, "worker-exited");

    mcpClient = await connectMcpClient(recovered.mcpEndpoint);
    for (const workspaceId of ["project_a", "project_b"]) {
      const recoveredRead = await callTool(mcpClient, "repo_toolbox", {
        workspaceId,
        action: "read_file",
        params: { relativePath: "README.md" },
      });
      assert.equal(recoveredRead.structuredContent.ok, true);
    }
    await mcpClient.close();
    mcpClient = null;

    await controller.shutdown();
    assert.equal(controller.workerProcessId(), null);
    await waitForProcessExit(recoveredWorkerPid, 10_000);
    await assert.rejects(() => fetch(recovered.healthEndpoint));

    return {
      mainProcessId: process.pid,
      initialWorkerPid,
      failedWorkerPid,
      recoveredWorkerPid,
      heartbeatCount,
      operationDurationMs: operationCompletedAt - operationStartedAt,
      toolCount: tools.tools.length,
      workerMutationWithoutWorkflowGate: true,
      cleanupPath: container,
      gracefulShutdown: true,
    };
  } finally {
    await mcpClient?.close().catch(() => undefined);
    await controller.shutdown().catch(() => undefined);
    if (failedWorkerPid && processExists(failedWorkerPid)) {
      process.kill(failedWorkerPid, "SIGTERM");
    }
  }
}

async function waitForControllerRecovery(controller, failedWorkerPid, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastStatus = null;
  while (Date.now() < deadline) {
    const workerPid = controller.workerProcessId();
    if (workerPid && workerPid !== failedWorkerPid) {
      const status = await controller.status();
      lastStatus = status;
      if (status.state === "running") {
        return status;
      }
    }
    await delay(50);
  }
  assert.fail(
    `Agent Harness controller did not automatically recover within the bounded deadline: ${JSON.stringify({
      failedWorkerPid,
      workerProcessId: controller.workerProcessId(),
      recovery: controller.recoveryStatus(),
      statusState: lastStatus?.state ?? null,
      statusError: lastStatus?.lastError ?? null,
    })}`,
  );
}

function createWorkspace(container, name, readme) {
  const root = path.join(container, name);
  fs.mkdirSync(root, { recursive: true });
  execFileSync("git", ["init"], { cwd: root, stdio: "ignore" });
  fs.writeFileSync(path.join(root, "README.md"), `${readme}\n`, "utf8");
  fs.mkdirSync(path.join(root, "docs"), { recursive: true });
  fs.writeFileSync(path.join(root, "docs", "overview.md"), `${name} documentation\n`, "utf8");
  return root;
}

function createSearchWorkload(root) {
  const bulkRoot = path.join(root, "bulk");
  fs.mkdirSync(bulkRoot, { recursive: true });
  const filler = "x".repeat(64 * 1024);
  for (let index = 0; index < 1_000; index += 1) {
    const suffix = index === 999 ? "\nworker-isolation-target\n" : "\nordinary-content\n";
    fs.writeFileSync(path.join(bulkRoot, `file-${String(index).padStart(4, "0")}.txt`), filler + suffix, "utf8");
  }
}

async function connectMcpClient(url) {
  const client = new Client({
    name: "champcity-agent-harness-process-boundary-test",
    version: "0.1.0",
  }, { capabilities: {} });
  const transport = new StreamableHTTPClientTransport(new URL(url));
  await client.connect(transport);
  return client;
}

function callTool(client, name, args) {
  return client.callTool({ name, arguments: args });
}

async function getJson(url) {
  const response = await fetch(url);
  return response.json();
}

async function waitForProcessExit(processId, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!processExists(processId)) {
      return;
    }
    await delay(50);
  }
  assert.fail(`Process ${processId} did not exit within ${timeoutMs}ms.`);
}

function processExists(processId) {
  try {
    process.kill(processId, 0);
    return true;
  } catch {
    return false;
  }
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
