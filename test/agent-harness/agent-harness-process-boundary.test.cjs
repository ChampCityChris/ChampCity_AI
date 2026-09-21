const assert = require("node:assert/strict");
const { execFile, execFileSync, spawn } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { promisify } = require("node:util");
const test = require("../support/windows-test.cjs");
const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StreamableHTTPClientTransport } = require("@modelcontextprotocol/sdk/client/streamableHttp.js");

const execFileAsync = promisify(execFile);
const repositoryRoot = path.resolve(__dirname, "../..");
const electronPath = require("electron");

test("actual Electron utility-process boundary preserves MCP routing, controls, heartbeat concurrency, and bounded recovery", { timeout: 180_000 }, async (context) => {
  const result = await runElectronFixture("electron-agent-harness-process-boundary.cjs");
  const match = result.stdout.match(/AGENT_HARNESS_PROCESS_BOUNDARY_RESULT=(\{.*\})/);
  assert.ok(match, result.stdout);
  const evidence = JSON.parse(match[1]);
  assert.equal(path.relative(os.tmpdir(), evidence.cleanupPath).startsWith(".."), false);
  context.after(() => fs.rmSync(evidence.cleanupPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));
  assert.notEqual(evidence.mainProcessId, evidence.initialWorkerPid);
  assert.notEqual(evidence.initialWorkerPid, evidence.recoveredWorkerPid);
  assert.ok(evidence.heartbeatCount > 0);
  assert.ok(evidence.operationDurationMs >= 20);
  assert.ok(evidence.toolCount >= 3);
  assert.equal(evidence.workerMutationWithoutWorkflowGate, true);
  assert.equal(evidence.gracefulShutdown, true);
  assert.equal(processExists(evidence.failedWorkerPid), false);
  assert.equal(processExists(evidence.recoveredWorkerPid), false);
  context.diagnostic(
    `isolated worker evidence: distinct initial/recovered process identities; bounded stage_changes crossed the worker-backed public MCP path without workflow or planning fixtures; ${evidence.heartbeatCount} host-loop heartbeats during ${evidence.operationDurationMs}ms broad MCP search; ${evidence.toolCount} public tools; graceful shutdown`,
  );
});

test("concurrent first-launch candidates resolve to one canonical Service Host and worker", { timeout: 180_000 }, async (context) => {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-agent-harness-concurrent-host-"));
  const userDataRoot = path.join(container, "user-data");
  const candidates = [];
  let client = null;
  let identity = null;
  try {
    client = recoveringServiceHostClient(userDataRoot, () => {
      candidates.push(launchServiceHostCandidate(userDataRoot));
      candidates.push(launchServiceHostCandidate(userDataRoot));
    });
    identity = await client.connect();
    if (!identity.workerProcessId) {
      identity = await waitForReplacementWorker(client, null, 20_000);
    }
    assert.ok(identity.workerProcessId);
    assert.ok(candidates.some((candidate) => candidate.pid === identity.serviceHostProcessId));
    const loser = candidates.find((candidate) => candidate.pid !== identity.serviceHostProcessId);
    assert.ok(loser);
    await waitForProcessExit(loser.pid, 15_000);
    const descriptor = JSON.parse(fs.readFileSync(
      path.join(userDataRoot, "agent-harness", "service-host.json"),
      "utf8",
    ));
    assert.equal(descriptor.serviceHostProcessId, identity.serviceHostProcessId);
    assert.equal(descriptor.instanceId, identity.instanceId);
    assert.equal(processExists(identity.workerProcessId), true);
    assert.equal((await client.identity()).workerProcessId, identity.workerProcessId);
    context.diagnostic(
      `concurrent launch evidence: candidate ${identity.serviceHostProcessId} won one canonical endpoint with worker ${identity.workerProcessId}; competing candidate ${loser.pid} exited`,
    );
  } finally {
    await client?.shutdownServiceHost().catch(() => undefined);
    terminateIfRunning(identity?.workerProcessId);
    for (const candidate of candidates) {
      terminateIfRunning(candidate.pid);
    }
    fs.rmSync(container, { recursive: true, force: true });
  }
});

test("live canonical endpoint repairs missing and malformed descriptors without duplicate launch", { timeout: 180_000 }, async () => {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-agent-harness-live-reconcile-"));
  const userDataRoot = path.join(container, "user-data");
  const launched = [];
  let owner = null;
  let ownerIdentity = null;
  try {
    owner = recoveringServiceHostClient(userDataRoot, () => {
      launched.push(launchServiceHostCandidate(userDataRoot));
    });
    ownerIdentity = await owner.connect();
    const descriptorPath = path.join(userDataRoot, "agent-harness", "service-host.json");
    fs.unlinkSync(descriptorPath);

    let duplicateLaunchCount = 0;
    const missingDescriptorClient = recoveringServiceHostClient(userDataRoot, () => {
      duplicateLaunchCount += 1;
    });
    const missingIdentity = await missingDescriptorClient.connect();
    assert.equal(missingIdentity.serviceHostProcessId, ownerIdentity.serviceHostProcessId);
    assert.equal(duplicateLaunchCount, 0);
    assert.equal(JSON.parse(fs.readFileSync(descriptorPath, "utf8")).instanceId, ownerIdentity.instanceId);

    fs.writeFileSync(descriptorPath, "{ malformed descriptor", "utf8");
    const malformedDescriptorClient = recoveringServiceHostClient(userDataRoot, () => {
      duplicateLaunchCount += 1;
    });
    const malformedIdentity = await malformedDescriptorClient.connect();
    assert.equal(malformedIdentity.serviceHostProcessId, ownerIdentity.serviceHostProcessId);
    assert.equal(duplicateLaunchCount, 0);
    const repaired = JSON.parse(fs.readFileSync(descriptorPath, "utf8"));
    assert.equal(repaired.instanceId, ownerIdentity.instanceId);
    assert.equal(repaired.serviceHostProcessId, ownerIdentity.serviceHostProcessId);
  } finally {
    await owner?.shutdownServiceHost().catch(() => undefined);
    terminateIfRunning(ownerIdentity?.workerProcessId);
    for (const child of launched) {
      terminateIfRunning(child.pid);
    }
    fs.rmSync(container, { recursive: true, force: true });
  }
});

test("desktop client recovers crashed hosts with durable multi-project registration state", { timeout: 180_000 }, async (context) => {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-agent-harness-host-recovery-"));
  const userDataRoot = path.join(container, "user-data");
  const projectA = createWorkspace(container, "Project_A", "selected recovery project");
  const projectB = createWorkspace(container, "Project_B", "second recovery project");
  const launched = [];
  let client = null;
  let currentIdentity = null;
  try {
    client = recoveringServiceHostClient(userDataRoot, () => {
      launched.push(launchServiceHostCandidate(userDataRoot));
    });
    const firstIdentity = await client.connect();
    currentIdentity = firstIdentity;
    await client.registerWorkspace(projectA);
    await client.registerWorkspace(projectB);
    const beforeRecovery = await client.status();
    assert.deepEqual(beforeRecovery.registeredWorkspaceIds, ["project_a", "project_b"]);
    const firstHealthEndpoint = beforeRecovery.healthEndpoint;
    process.kill(firstIdentity.serviceHostProcessId, "SIGTERM");
    await waitForProcessExit(firstIdentity.serviceHostProcessId, 15_000);
    await waitForProcessExit(firstIdentity.workerProcessId, 15_000);
    await waitForEndpointUnavailable(firstHealthEndpoint, 15_000);

    const recoveredSelected = await client.status();
    const secondIdentity = await client.identity();
    currentIdentity = secondIdentity;
    assert.notEqual(secondIdentity.serviceHostProcessId, firstIdentity.serviceHostProcessId);
    assert.notEqual(secondIdentity.workerProcessId, firstIdentity.workerProcessId);
    assert.deepEqual(recoveredSelected.registeredWorkspaceIds, ["project_a", "project_b"]);
    const selectedMcp = await connectMcpClient(recoveredSelected.mcpEndpoint);
    assert.equal((await readWorkspace(selectedMcp, "project_a")).structuredContent.ok, true);
    assert.equal((await readWorkspace(selectedMcp, "project_b")).structuredContent.ok, true);
    await selectedMcp.close();

    await client.unregisterWorkspace("project_b");
    const secondHealthEndpoint = recoveredSelected.healthEndpoint;
    process.kill(secondIdentity.serviceHostProcessId, "SIGTERM");
    await waitForProcessExit(secondIdentity.serviceHostProcessId, 15_000);
    await waitForProcessExit(secondIdentity.workerProcessId, 15_000);
    await waitForEndpointUnavailable(secondHealthEndpoint, 15_000);
    const recoveredUnbound = await client.status();
    const thirdIdentity = await client.identity();
    currentIdentity = thirdIdentity;
    assert.notEqual(thirdIdentity.serviceHostProcessId, secondIdentity.serviceHostProcessId);
    assert.deepEqual(recoveredUnbound.registeredWorkspaceIds, ["project_a"]);
    const unboundMcp = await connectMcpClient(recoveredUnbound.mcpEndpoint);
    assert.equal((await readWorkspace(unboundMcp, "project_a")).structuredContent.ok, true);
    const denied = await readWorkspace(unboundMcp, "project_b");
    assert.equal(denied.structuredContent.error.code, "WORKSPACE_ACCESS_DENIED");
    await unboundMcp.close();
    assert.equal(launched.length, 3);
    context.diagnostic(
      `host-loss recovery evidence: ${firstIdentity.serviceHostProcessId} -> ${secondIdentity.serviceHostProcessId} restored Projects A/B; ${secondIdentity.serviceHostProcessId} -> ${thirdIdentity.serviceHostProcessId} preserved the explicit Project B removal`,
    );
  } finally {
    await client?.shutdownServiceHost().catch(() => undefined);
    terminateIfRunning(currentIdentity?.workerProcessId);
    for (const child of launched) {
      terminateIfRunning(child.pid);
    }
    fs.rmSync(container, { recursive: true, force: true });
  }
});

test("failed desktop host replacement latches across passive polling while a fresh client gets one new opportunity", { timeout: 180_000 }, async (context) => {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-agent-harness-host-recovery-latch-"));
  const userDataRoot = path.join(container, "user-data");
  const projectA = createWorkspace(container, "Project_A", "latched host recovery project");
  const descriptorPath = path.join(userDataRoot, "agent-harness", "service-host.json");
  const launched = [];
  let launchCount = 0;
  let failReplacementLaunch = false;
  let client = null;
  let freshClient = null;
  let currentIdentity = null;
  try {
    client = recoveringServiceHostClient(userDataRoot, () => {
      launchCount += 1;
      if (failReplacementLaunch) {
        throw new Error("Deterministic replacement Service Host launch failure.");
      }
      launched.push(launchServiceHostCandidate(userDataRoot));
    });
    const firstIdentity = await client.connect();
    currentIdentity = firstIdentity;
    await client.registerWorkspace(projectA);
    const selected = await client.status();
    assert.deepEqual(selected.registeredWorkspaceIds, ["project_a"]);
    assert.equal(launchCount, 1);

    process.kill(firstIdentity.serviceHostProcessId, "SIGTERM");
    await waitForProcessExit(firstIdentity.serviceHostProcessId, 15_000);
    await waitForProcessExit(firstIdentity.workerProcessId, 15_000);
    await waitForEndpointUnavailable(selected.healthEndpoint, 15_000);
    failReplacementLaunch = true;

    const failedLifecycle = await client.lifecycleStatus();
    assert.equal(failedLifecycle.state, "degraded");
    assert.equal(failedLifecycle.serviceHostProcessId, null);
    assert.equal(failedLifecycle.workerProcessId, null);
    assert.match(failedLifecycle.lastError, /recovery failed closed/i);
    assert.equal(launchCount, 2);
    assert.equal(fs.existsSync(descriptorPath), false);

    const failedStatus = await client.status();
    assertFailedAndUnrouted(failedStatus);
    assert.match(failedStatus.lastError, /recovery failed closed/i);
    assert.equal(launchCount, 2);

    for (let poll = 0; poll < 8; poll += 1) {
      const [status, lifecycle] = await Promise.all([
        client.status(),
        client.lifecycleStatus(),
      ]);
      assertFailedAndUnrouted(status);
      assert.equal(lifecycle.state, "degraded");
      assert.equal(lifecycle.serviceHostProcessId, null);
      assert.equal(lifecycle.workerProcessId, null);
      assert.equal(lifecycle.workerRecoveryState, "idle");
      assert.match(lifecycle.lastError, /recovery failed closed/i);
    }
    assert.equal(launchCount, 2);
    assert.equal(fs.existsSync(descriptorPath), false);

    let freshLaunchCount = 0;
    freshClient = recoveringServiceHostClient(userDataRoot, () => {
      freshLaunchCount += 1;
      launched.push(launchServiceHostCandidate(userDataRoot));
    });
    let freshIdentity = await freshClient.connect();
    if (!freshIdentity.workerProcessId) {
      freshIdentity = await waitForReplacementWorker(freshClient, null, 20_000);
    }
    currentIdentity = freshIdentity;
    assert.equal(freshLaunchCount, 1);
    assert.notEqual(freshIdentity.serviceHostProcessId, firstIdentity.serviceHostProcessId);
    assert.ok(freshIdentity.workerProcessId);
    assert.deepEqual((await freshClient.listRegisteredWorkspaces()).workspaces.map((entry) => entry.workspaceId), ["project_a"]);
    assert.equal(launchCount, 2);
    context.diagnostic(
      `host recovery latch evidence: failed replacement consumed launch ${launchCount}; 8 passive status/lifecycle polls added zero launches; fresh client launched host ${freshIdentity.serviceHostProcessId}`,
    );
  } finally {
    await freshClient?.shutdownServiceHost().catch(() => undefined);
    terminateIfRunning(currentIdentity?.workerProcessId);
    for (const child of launched) {
      terminateIfRunning(child.pid);
    }
    fs.rmSync(container, { recursive: true, force: true });
  }
});

test("unexpected worker exits recover with finite circuit breaker and explicit reset", { timeout: 180_000 }, async (context) => {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-agent-harness-worker-recovery-"));
  const userDataRoot = path.join(container, "user-data");
  const projectA = createWorkspace(container, "Project_A", "worker recovery project");
  const launched = [];
  let client = null;
  let identity = null;
  const workerPids = [];
  try {
    client = recoveringServiceHostClient(userDataRoot, () => {
      launched.push(launchServiceHostCandidate(userDataRoot));
    });
    identity = await client.connect();
    if (!identity.workerProcessId) {
      identity = await waitForReplacementWorker(client, null, 20_000);
    }
    const hostPid = identity.serviceHostProcessId;
    await client.registerWorkspace(projectA);
    workerPids.push(identity.workerProcessId);

    for (let crash = 0; crash < 3; crash += 1) {
      process.kill(identity.workerProcessId, "SIGTERM");
      identity = await waitForReplacementWorker(client, identity.workerProcessId, 20_000);
      workerPids.push(identity.workerProcessId);
      assert.equal(identity.serviceHostProcessId, hostPid);
      assert.deepEqual((await client.status()).registeredWorkspaceIds, ["project_a"]);
    }

    process.kill(identity.workerProcessId, "SIGTERM");
    const circuitIdentity = await waitForWorkerRecoveryState(client, "circuit-open", 20_000);
    assert.equal(circuitIdentity.serviceHostProcessId, hostPid);
    assert.equal(circuitIdentity.workerProcessId, null);
    assert.equal(circuitIdentity.lifecycleState, "degraded");
    assert.equal(circuitIdentity.lifecycleReason, "worker-recovery-exhausted");
    assert.equal((await client.status()).state, "failed");
    assert.equal(processExists(hostPid), true);

    const restarted = await client.start();
    const restartedIdentity = await waitForReplacementWorker(client, null, 20_000);
    workerPids.push(restartedIdentity.workerProcessId);
    assert.deepEqual(restarted.registeredWorkspaceIds, ["project_a"]);
    assert.equal(restartedIdentity.serviceHostProcessId, hostPid);
    assert.equal(restartedIdentity.lifecycleState, "ready");
    const stopped = await client.stop();
    const stoppedIdentity = await client.identity();
    assert.equal(stopped.state, "stopped");
    assert.equal(stoppedIdentity.workerProcessId, restartedIdentity.workerProcessId);
    assert.equal(stoppedIdentity.workerRecoveryState, "idle");
    context.diagnostic(
      `worker recovery evidence: host ${hostPid} retained identity across ${workerPids.length - 1} replacement workers, opened a finite circuit, and explicit Start reset recovery`,
    );
  } finally {
    await client?.shutdownServiceHost().catch(() => undefined);
    for (const workerPid of workerPids) {
      terminateIfRunning(workerPid);
    }
    for (const child of launched) {
      terminateIfRunning(child.pid);
    }
    fs.rmSync(container, { recursive: true, force: true });
  }
});

test("exact Windows startup mode launches only the background Service Host path without Chromium headless mode", { timeout: 180_000 }, async () => {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-agent-harness-startup-mode-"));
  const userDataRoot = path.join(container, "user-data");
  const projectA = createWorkspace(container, "Project_A", "background project A");
  const projectB = createWorkspace(container, "Project_B", "background project B");
  const { RegisteredWorkspaceRegistry } = require("../../dist/main/agentHarness/workspace/registeredWorkspaceRegistry.js");
  const registry = new RegisteredWorkspaceRegistry({ userDataRoot });
  await registry.register(projectA);
  await registry.register(projectB);
  try {
    const result = await runElectronFixtureToExit("electron-agent-harness-service-host-startup.cjs", {
      CHAMPCITY_USER_DATA_ROOT: userDataRoot,
      CHAMPCITY_AGENT_HARNESS_ENABLED: "true",
      CHAMPCITY_AGENT_HARNESS_HOST: "127.0.0.1",
      CHAMPCITY_AGENT_HARNESS_PORT: "0",
      CHAMPCITY_AGENT_HARNESS_LOCAL_AUTH: "development-unauthenticated",
    });
    const match = result.stdout.match(/AGENT_HARNESS_SERVICE_HOST_STARTUP_RESULT=(\{.*\})/);
    assert.ok(match, result.stdout);
    const evidence = JSON.parse(match[1]);
    assert.equal(evidence.startupArgumentsPresent, true);
    assert.equal(evidence.chromiumHeadless, false);
    assert.equal(evidence.gpuDisabled, true);
    assert.equal(evidence.normalWindowCount, 0);
    assert.equal(evidence.trayPresent, process.platform === "win32");
    assert.equal(evidence.stopIntentState, "clear");
    assert.ok(evidence.workerProcessId);
    assert.equal(evidence.activeWorkspaceId, null);
    assert.deepEqual(evidence.registeredWorkspaceIds, ["project_a", "project_b"]);
    assert.deepEqual(evidence.readableWorkspaceIds, ["project_a", "project_b"]);
    assert.equal(fs.existsSync(path.join(userDataRoot, "agent-harness", "service-host.json")), false);
  } finally {
    fs.rmSync(container, { recursive: true, force: true });
  }
});

test("production Service Host survives desktop exit and the next desktop reconnects to the same host", { timeout: 180_000 }, async (context) => {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-agent-harness-service-persistence-"));
  const userDataRoot = path.join(container, "user-data");
  const projectA = createWorkspace(container, "Project_A", "alpha persistent service project");
  const projectB = createWorkspace(container, "Project_B", "beta independently registered project");
  const { RegisteredWorkspaceRegistry } = require("../../dist/main/agentHarness/workspace/registeredWorkspaceRegistry.js");
  await new RegisteredWorkspaceRegistry({ userDataRoot }).register(projectB);
  let client = null;
  let mcpClient = null;
  let hostPid = null;
  let workerPid = null;
  let healthEndpoint = null;
  try {
    const firstDesktop = await runServiceHostDesktop(userDataRoot, projectA, true);
    assert.notEqual(firstDesktop.desktopProcessId, firstDesktop.serviceHostProcessId);
    assert.equal(firstDesktop.normalWindowCount, 1);
    assert.equal(firstDesktop.selection.ok, true);
    assert.deepEqual(firstDesktop.registryManagement.listed.workspaces.map((entry) => entry.workspaceId), ["project_a", "project_b"]);
    assert.equal(firstDesktop.registryManagement.added.workspace.workspaceId, "project_a");
    assert.deepEqual(firstDesktop.registryManagement.removed.workspaces.map((entry) => entry.workspaceId), ["project_b"]);
    assert.equal(firstDesktop.registryManagement.selectionAfterRemoval.ok, true);
    assert.equal(firstDesktop.registryManagement.selectionAfterRemoval.workspaceRoot, projectA);
    assert.equal(firstDesktop.registryManagement.restored.workspace.workspaceId, "project_a");
    assert.deepEqual(firstDesktop.crossWorkspaceRouting, {
      projectBExactRead: true,
      desktopSelectionUnchanged: true,
    });
    assert.equal(firstDesktop.status.state, "running");
    assert.deepEqual(firstDesktop.status.registeredWorkspaceIds, ["project_a", "project_b"]);
    assert.equal(firstDesktop.lifecycleStatus.state, "ready");
    assert.equal(firstDesktop.lifecycleStatus.serviceHostProcessId, firstDesktop.serviceHostProcessId);
    assert.ok(firstDesktop.lifecycleStatus.workerProcessId);
    assert.equal(firstDesktop.lifecycleStatus.launchAtLogin, true);
    assert.equal(firstDesktop.lifecycleStatus.loginItemRegistered, true);
    assert.deepEqual(firstDesktop.controlStates, {
      stopped: "stopped",
      started: "running",
      restarted: "running",
      configured: "running",
      importCanceled: true,
    });

    hostPid = firstDesktop.serviceHostProcessId;
    healthEndpoint = firstDesktop.status.healthEndpoint;
    assert.equal(processExists(firstDesktop.desktopProcessId), false);
    assert.equal(processExists(hostPid), true);
    assert.equal((await getJson(healthEndpoint)).app, "ChampCity A/I Agent Harness");

    client = serviceHostClient(userDataRoot);
    await client.connect();
    const firstIdentity = await client.identity();
    workerPid = firstIdentity.workerProcessId;
    assert.ok(workerPid);
    assert.notEqual(workerPid, hostPid);
    assert.equal(processExists(workerPid), true);
    assert.deepEqual(await client.importLegacyOAuthClientRegistry({ clients: [] }), {
      canceled: false,
      importedCount: 0,
      alreadyPresentCount: 0,
      totalAcceptedCount: 0,
      registeredClientCount: 0,
    });

    mcpClient = await connectMcpClient(firstDesktop.status.mcpEndpoint);
    const tools = await mcpClient.listTools();
    assert.ok(tools.tools.some((tool) => tool.name === "repo_toolbox"));
    assert.ok(tools.tools.some((tool) => tool.name === "git_toolbox"));
    const persistedRead = await readWorkspace(mcpClient, "project_a");
    assert.equal(persistedRead.structuredContent.ok, true);
    assert.match(persistedRead.structuredContent.payload.content, /alpha persistent service project/);
    const independentRead = await readWorkspace(mcpClient, "project_b");
    assert.equal(independentRead.structuredContent.ok, true);
    assert.match(independentRead.structuredContent.payload.content, /beta independently registered project/);
    const listed = await callTool(mcpClient, "repo_toolbox", {
      workspaceId: "project_a",
      action: "list_files",
      params: { directory: "docs", maxFiles: 20 },
    });
    assert.equal(listed.structuredContent.ok, true);
    assert.ok(listed.structuredContent.payload.files.includes("docs/overview.md"));
    const searched = await callTool(mcpClient, "repo_toolbox", {
      workspaceId: "project_a",
      action: "search_files",
      params: { directory: ".", query: "persistent service", maxResults: 10 },
    });
    assert.equal(searched.structuredContent.ok, true);
    const written = await callTool(mcpClient, "repo_toolbox", {
      workspaceId: "project_a",
      action: "write_markdown_artifact",
      params: {
        relativePath: "planning/service-host-proof.md",
        content: "# Service Host proof\n\nWritten after the desktop process exited.\n",
      },
    });
    assert.equal(written.structuredContent.ok, true);
    const gitStatus = await callTool(mcpClient, "git_toolbox", {
      workspaceId: "project_a",
      action: "status",
    });
    assert.equal(gitStatus.structuredContent.ok, true);
    await mcpClient.close();
    mcpClient = null;

    const serializedDescriptor = JSON.stringify(firstDesktop.descriptor);
    assert.deepEqual(Object.keys(firstDesktop.descriptor).sort(), [
      "controlAddress",
      "controlProtocolVersion",
      "instanceId",
      "runtimeBuildIdentity",
      "schemaVersion",
      "serviceHostProcessId",
    ]);
    assert.match(firstDesktop.descriptor.runtimeBuildIdentity, /^sha256:[0-9a-f]{64}$/);
    assert.doesNotMatch(serializedDescriptor, /Project_A|alpha persistent|workspaceRoot|token|secret|oauth/i);

    const secondDesktop = await runServiceHostDesktop(userDataRoot, null, false);
    assert.equal(secondDesktop.serviceHostProcessId, hostPid);
    assert.equal(secondDesktop.descriptor.instanceId, firstDesktop.descriptor.instanceId);
    assert.equal(secondDesktop.status.activeWorkspaceId, null);
    assert.deepEqual(secondDesktop.status.registeredWorkspaceIds, ["project_a", "project_b"]);
    assert.equal(secondDesktop.selection.ok, false);
    assert.equal(processExists(secondDesktop.desktopProcessId), false);
    const secondIdentity = await client.identity();
    assert.equal(secondIdentity.serviceHostProcessId, hostPid);
    assert.equal(secondIdentity.workerProcessId, workerPid);

    await client.shutdownServiceHost();
    await waitForProcessExit(workerPid, 15_000);
    await waitForProcessExit(hostPid, 15_000);
    await waitForEndpointUnavailable(healthEndpoint, 10_000);
    assert.equal(fs.existsSync(path.join(userDataRoot, "agent-harness", "service-host.json")), false);

    context.diagnostic(
      `three-process persistence evidence: desktop ${firstDesktop.desktopProcessId} exited; host ${hostPid} and worker ${workerPid} served a real MCP repository read; relaunch reused host ${hostPid}; intentional shutdown removed both processes and descriptor`,
    );
  } finally {
    await mcpClient?.close().catch(() => undefined);
    await client?.shutdownServiceHost().catch(() => undefined);
    terminateIfRunning(workerPid);
    terminateIfRunning(hostPid);
    fs.rmSync(container, { recursive: true, force: true });
  }
});

test("fresh foreground desktop clears explicit-stop and starts one Agent while launch-at-login remains disabled", { timeout: 180_000 }, async (context) => {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-foreground-explicit-start-"));
  const userDataRoot = path.join(container, "user-data");
  const lifecycleSettings = require(
    "../../dist/main/agentHarness/runtime/agentHarnessServiceHostLifecycleSettings.js"
  );
  const intent = require(
    "../../dist/main/agentHarness/runtime/backgroundAgentIntent.js"
  );
  let client = null;
  let mcpClient = null;
  let identity = null;
  try {
    lifecycleSettings.writeAgentHarnessServiceHostLifecycleSettings(userDataRoot, {
      launchAtLogin: false,
    });
    intent.writeBackgroundAgentExplicitStopIntent(userDataRoot, "2026-09-12T12:00:00.000Z");

    const desktop = await runServiceHostDesktop(userDataRoot, null, false);
    assert.equal(desktop.status.state, "running");
    assert.ok(desktop.status.mcpEndpoint);
    assert.equal(desktop.lifecycleStatus.state, "ready");
    assert.equal(desktop.lifecycleStatus.explicitlyStopped, false);
    assert.equal(desktop.lifecycleStatus.explicitStopState, "none");
    assert.equal(desktop.lifecycleStatus.trayPresent, process.platform === "win32");
    assert.equal(desktop.lifecycleStatus.launchAtLogin, false);
    assert.equal(desktop.lifecycleStatus.loginItemRegistered, false);
    assert.equal(desktop.lifecycleStatus.executableWillLaunchAtLogin, false);
    assert.equal(
      desktop.lifecycleStatus.startupRegistrationScope,
      process.platform === "win32" ? "user" : null,
    );
    assert.equal(intent.readBackgroundAgentIntent(userDataRoot).state, "clear");
    assert.deepEqual(
      lifecycleSettings.readAgentHarnessServiceHostLifecycleSettings(userDataRoot),
      { launchAtLogin: false },
    );

    client = serviceHostClient(userDataRoot);
    identity = await client.connect();
    assert.equal(identity.serviceHostProcessId, desktop.serviceHostProcessId);
    assert.ok(identity.workerProcessId);
    mcpClient = await connectMcpClient(desktop.status.mcpEndpoint);
    const tools = await mcpClient.listTools();
    assert.ok(tools.tools.some((tool) => tool.name === "repo_toolbox"));

    context.diagnostic(
      `fresh foreground explicit-start evidence: stopped intent cleared; one host ${identity.serviceHostProcessId} and worker ${identity.workerProcessId} served MCP while launch-at-login remained false`,
    );
  } finally {
    await mcpClient?.close().catch(() => undefined);
    await client?.shutdownServiceHost().catch(() => undefined);
    terminateIfRunning(identity?.workerProcessId);
    terminateIfRunning(identity?.serviceHostProcessId);
    fs.rmSync(container, { recursive: true, force: true });
  }
});

test("desktop Background Agent lifecycle honors user exit, explicit start, MCP-only controls, and single-instance activation", { timeout: 180_000 }, async (context) => {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-background-agent-desktop-lifecycle-"));
  const userDataRoot = path.join(container, "user-data");
  const projectA = createWorkspace(container, "Project_A", "background lifecycle project");
  let client = null;
  let restoredIdentity = null;
  try {
    const evidence = await runServiceHostDesktop(userDataRoot, projectA, true, false, true);
    assert.deepEqual(evidence.controlStates, {
      stopped: "stopped",
      started: "running",
      restarted: "running",
      configured: "running",
      importCanceled: true,
    });
    assert.equal(evidence.backgroundLifecycle.exited.state, "stopped-by-user");
    assert.equal(evidence.backgroundLifecycle.exited.explicitlyStopped, true);
    assert.equal(evidence.backgroundLifecycle.exited.trayPresent, false);
    assert.equal(evidence.backgroundLifecycle.passiveRefresh.state, "stopped-by-user");
    assert.equal(evidence.backgroundLifecycle.passiveRefresh.explicitStopState, "requested");
    assert.equal(evidence.backgroundLifecycle.blockedRuntime.unexpectedlyAvailable, false);
    assert.match(evidence.backgroundLifecycle.blockedRuntime.message, /Start Background Agent/);
    assert.equal(evidence.backgroundLifecycle.afterSecondInstance.state, "stopped-by-user");
    assert.equal(evidence.backgroundLifecycle.afterSecondInstance.explicitStopState, "requested");
    assert.equal(evidence.backgroundLifecycle.runtimeAfterSecondInstance.unexpectedlyAvailable, false);
    assert.match(evidence.backgroundLifecycle.runtimeAfterSecondInstance.message, /Start Background Agent/);
    assert.equal(evidence.backgroundLifecycle.started.explicitlyStopped, false);
    assert.equal(evidence.backgroundLifecycle.started.trayPresent, process.platform === "win32");
    assert.notEqual(
      evidence.backgroundLifecycle.started.serviceHostProcessId,
      evidence.lifecycleStatus.serviceHostProcessId,
    );
    assert.equal(evidence.backgroundLifecycle.restoredStatus.state, "running");
    assert.deepEqual(
      evidence.backgroundLifecycle.restoredRegistry.workspaces.map((workspace) => workspace.workspaceId),
      ["project_a"],
    );
    assert.deepEqual(evidence.singleInstance, {
      secondInvocationExitCode: 0,
      firstDesktopWindowCount: 1,
      firstDesktopWindowDestroyed: false,
    });

    client = serviceHostClient(userDataRoot);
    restoredIdentity = await client.connect();
    assert.equal(restoredIdentity.serviceHostProcessId, evidence.backgroundLifecycle.started.serviceHostProcessId);
    context.diagnostic(
      `desktop lifecycle evidence: MCP stop/start retained the host; user exit suppressed passive relaunch and second-instance activation; explicit start replaced host ${evidence.lifecycleStatus.serviceHostProcessId} with ${restoredIdentity.serviceHostProcessId}; repeated desktop invocation exited without a second window`,
    );
  } finally {
    await client?.shutdownServiceHost().catch(() => undefined);
    terminateIfRunning(restoredIdentity?.workerProcessId);
    terminateIfRunning(restoredIdentity?.serviceHostProcessId);
    fs.rmSync(container, { recursive: true, force: true });
  }
});

test("controlled Service Host restart preserves registry and confirms replacement build identity", { timeout: 180_000 }, async (context) => {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-agent-harness-controlled-host-restart-"));
  const userDataRoot = path.join(container, "user-data");
  const projectA = createWorkspace(container, "Project_A", "controlled restart workspace project");
  createSearchWorkload(projectA);
  const launched = [];
  let client = null;
  let mcpClient = null;
  try {
    launched.push(launchServiceHostCandidate(userDataRoot));
    const { computeAgentHarnessRuntimeBuildIdentity } = require(path.join(
      repositoryRoot,
      "dist/main/agentHarness/runtime/agentHarnessBuildIdentity.js",
    ));
    const expectedBuildIdentity = computeAgentHarnessRuntimeBuildIdentity(path.join(repositoryRoot, "dist", "main"));
    client = recoveringServiceHostClient(userDataRoot, () => {
      launched.push(launchServiceHostCandidate(userDataRoot));
    }, expectedBuildIdentity);
    const original = await client.connect();
    await client.registerWorkspace(projectA);
    const runtimeStatus = await client.status();
    mcpClient = await connectMcpClient(runtimeStatus.mcpEndpoint);
    let broadCompleted = false;
    void callTool(mcpClient, "repo_toolbox", {
      workspaceId: "project_a",
      action: "search_files",
      params: { directory: "bulk", query: "desktop-main-isolation-target", maxResults: 1 },
    }).then(
      (value) => { broadCompleted = true; return value; },
      (error) => { broadCompleted = true; return error; },
    );
    await delay(50);
    assert.equal(broadCompleted, false);
    const replacement = await client.controlledRestartServiceHost();
    assert.notEqual(replacement.instanceId, original.instanceId);
    assert.notEqual(replacement.serviceHostProcessId, original.serviceHostProcessId);
    assert.equal(replacement.runtimeBuildIdentity, expectedBuildIdentity);
    assert.equal(replacement.lifecycleState, "ready");
    assert.deepEqual((await client.listRegisteredWorkspaces()).workspaces.map((workspace) => workspace.workspaceId), ["project_a"]);
    const lifecycle = await client.lifecycleStatus();
    assert.equal(lifecycle.restartRequired, false);
    assert.equal(lifecycle.lastControlledRestart.outcome, "deadline-exceeded");
    assert.ok(lifecycle.lastControlledRestart.activeRequestsAtStart >= 1);
    assert.ok(lifecycle.lastControlledRestart.activeRequestsAtEnd >= 1);
    assert.equal(processExists(original.serviceHostProcessId), false);
    context.diagnostic(
      `controlled restart replaced host ${original.serviceHostProcessId} with ${replacement.serviceHostProcessId} and preserved one registered workspace`,
    );
  } finally {
    await mcpClient?.close().catch(() => undefined);
    await client?.shutdownServiceHost().catch(() => undefined);
    for (const child of launched) {
      terminateIfRunning(child.pid);
    }
    fs.rmSync(container, { recursive: true, force: true });
  }
});

test("healthy Service Host client routes exact registered Projects A and B independently", { timeout: 180_000 }, async (context) => {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-agent-harness-service-healthy-access-"));
  const userDataRoot = path.join(container, "user-data");
  const projectA = createWorkspace(container, "Project_A", "alpha healthy access project");
  const projectB = createWorkspace(container, "Project_B", "beta healthy access project");
  createSearchWorkload(projectA);
  let client = null;
  let mcpClient = null;
  let hostPid = null;
  let workerPid = null;
  try {
    const desktop = await runServiceHostDesktop(userDataRoot, null, false);
    hostPid = desktop.serviceHostProcessId;
    client = serviceHostClient(userDataRoot);
    const identity = await client.connect();
    workerPid = identity.workerProcessId;
    assert.ok(workerPid);
    assert.notEqual(desktop.desktopProcessId, hostPid);
    assert.notEqual(desktop.desktopProcessId, workerPid);
    assert.notEqual(hostPid, workerPid);

    mcpClient = await connectMcpClient(desktop.status.mcpEndpoint);
    const unbound = await readWorkspace(mcpClient, "project_a");
    assert.equal(unbound.structuredContent.ok, false);
    assert.match(unbound.structuredContent.error.message, /workspace|project/i);

    await client.registerWorkspace(projectA);
    const exactA = await readWorkspace(mcpClient, "project_a");
    assert.equal(exactA.structuredContent.ok, true);
    assert.match(exactA.structuredContent.payload.content, /alpha healthy access project/);
    const unregisteredB = await readWorkspace(mcpClient, "project_b");
    assert.equal(unregisteredB.structuredContent.error.code, "WORKSPACE_ACCESS_DENIED");

    await client.registerWorkspace(projectB);
    const stillExactA = await readWorkspace(mcpClient, "project_a");
    assert.equal(stillExactA.structuredContent.ok, true);
    const exactB = await readWorkspace(mcpClient, "project_b");
    assert.equal(exactB.structuredContent.ok, true);
    assert.match(exactB.structuredContent.payload.content, /beta healthy access project/);

    const broadStartedAt = Date.now();
    let broadCompleted = false;
    const broadPromise = callTool(mcpClient, "repo_toolbox", {
      workspaceId: "project_a",
      action: "search_files",
      params: { directory: "bulk", query: "desktop-main-isolation-target", maxResults: 1 },
    }).then((result) => {
      broadCompleted = true;
      return result;
    });
    await delay(5);
    const lightweightStartedAt = Date.now();
    const concurrentB = await readWorkspace(mcpClient, "project_b");
    const lightweightCompletedAt = Date.now();
    assert.equal(concurrentB.structuredContent.ok, true);
    assert.match(concurrentB.structuredContent.payload.content, /beta healthy access project/);
    assert.equal(broadCompleted, false);
    const broadResult = await broadPromise;
    const broadCompletedAt = Date.now();
    assert.equal(broadResult.structuredContent.ok, true);
    assert.equal(broadResult.structuredContent.payload.matches.length, 1);
    assert.ok(lightweightCompletedAt < broadCompletedAt);

    const status = await client.status();
    assert.deepEqual(status.registeredWorkspaceIds, ["project_a", "project_b"]);
    assert.equal(status.activeWorkspaceId, null);
    await client.unregisterWorkspace("project_b");
    assert.equal((await readWorkspace(mcpClient, "project_a")).structuredContent.ok, true);
    const deniedAfterRemoval = await readWorkspace(mcpClient, "project_b");
    assert.equal(deniedAfterRemoval.structuredContent.error.code, "WORKSPACE_ACCESS_DENIED");

    context.diagnostic(
      `healthy Service Host registry/fairness evidence: desktop ${desktop.desktopProcessId}, host ${hostPid}, worker ${workerPid}; Project B read completed in ${lightweightCompletedAt - lightweightStartedAt}ms before Project A broad search completed in ${broadCompletedAt - broadStartedAt}ms; removing B preserved A`,
    );
  } finally {
    await mcpClient?.close().catch(() => undefined);
    await client?.shutdownServiceHost().catch(() => undefined);
    terminateIfRunning(workerPid);
    terminateIfRunning(hostPid);
    fs.rmSync(container, { recursive: true, force: true });
  }
});

test("normal eager-startup Desktop heartbeat remains responsive while the Codex utility worker initializes", { timeout: 180_000 }, async (context) => {
  await runDifferentialHeartbeatControl(context, "Normal eager startup");
});

test("differential Control B minimal Electron main heartbeat with external Service Host worker load", { timeout: 180_000 }, async (context) => {
  await runDifferentialHeartbeatControl(context, "Control B");
});

test("real desktop main heartbeat continues during Service Host worker-owned broad MCP search", { timeout: 180_000 }, async (context) => {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-agent-harness-desktop-heartbeat-"));
  const userDataRoot = path.join(container, "user-data");
  const projectA = createWorkspace(container, "Project_A", "desktop heartbeat project");
  createSearchWorkload(projectA);
  let heartbeatEvidence = null;
  let cleanup = null;
  let cleanupDiagnosticEmitted = false;
  try {
    const desktop = await runServiceHostDesktop(userDataRoot, projectA, false, true);
    const evidence = desktop.desktopHeartbeat;
    assert.ok(evidence);
    heartbeatEvidence = evidence;
    cleanup = await cleanupIsolatedServiceHost(userDataRoot, heartbeatEvidence);
    context.diagnostic(`desktop heartbeat measurements: ${JSON.stringify({
      scenario: evidence.scenario,
      ownerProcessId: evidence.ownerProcessId,
      processEvidence: evidence.processEvidence,
      normalWindowPresentDuringOperation: evidence.normalWindowPresentDuringOperation,
      normalWindowCountDuringOperation: evidence.normalWindowCountDuringOperation,
      desktopProcessId: evidence.desktopProcessId,
      mcpLoadClientProcessId: evidence.mcpLoadClientProcessId,
      serviceHostProcessId: evidence.serviceHostProcessId,
      workerProcessId: evidence.workerProcessId,
      operationDurationMs: evidence.operationDurationMs,
      searchCount: evidence.searchCount,
      heartbeatCount: evidence.heartbeatCount,
      firstHeartbeatAtMs: evidence.firstHeartbeatAtMs,
      lastHeartbeatAtMs: evidence.lastHeartbeatAtMs,
      maximumHeartbeatGapMs: evidence.maximumHeartbeatGapMs,
      maximumHeartbeatGapStartAtMs: evidence.maximumHeartbeatGapStartAtMs,
      maximumHeartbeatGapEndAtMs: evidence.maximumHeartbeatGapEndAtMs,
      mcpResultStatus: evidence.mcpResultStatus,
      mcpMatchCount: evidence.mcpMatchCount,
      mcpLoadCleanup: evidence.mcpLoadCleanup,
      cleanupCompleted: cleanup.completed,
      remainingOwnedProcessIds: cleanup.remainingProcessIds,
    })}`);
    context.diagnostic(`desktop heartbeat cleanup: ${JSON.stringify(cleanup)}`);
    cleanupDiagnosticEmitted = true;
    assertProcessMeasurement(evidence);
    assert.equal(evidence.scenario, "Experiment C");
    assert.equal(evidence.desktopProcessId, desktop.desktopProcessId);
    assert.equal(evidence.serviceHostProcessId, desktop.serviceHostProcessId);
    assert.notEqual(evidence.desktopProcessId, evidence.mcpLoadClientProcessId);
    assert.notEqual(evidence.desktopProcessId, evidence.serviceHostProcessId);
    assert.notEqual(evidence.desktopProcessId, evidence.workerProcessId);
    assert.notEqual(evidence.mcpLoadClientProcessId, evidence.serviceHostProcessId);
    assert.notEqual(evidence.mcpLoadClientProcessId, evidence.workerProcessId);
    assert.notEqual(evidence.serviceHostProcessId, evidence.workerProcessId);
    assert.equal(evidence.normalWindowPresentDuringOperation, true);
    assert.equal(evidence.normalWindowCountDuringOperation, 1);
    assert.ok(evidence.operationDurationMs >= 500);
    assert.ok(evidence.heartbeatCount >= 20);
    assert.ok(evidence.searchCount >= 1);
    assert.ok(evidence.firstHeartbeatAtMs < evidence.operationDurationMs);
    assert.ok(evidence.lastHeartbeatAtMs < evidence.operationDurationMs);
    assert.equal(evidence.mcpResultStatus, "success");
    assert.equal(evidence.mcpMatchCount, 1);
    assert.equal(evidence.mcpLoadCleanup.clientClosed, true);
    assert.equal(evidence.mcpLoadCleanup.processExited, true);
    assert.equal(evidence.mcpLoadCleanup.forcedTermination, false);
    assert.equal(
      cleanup.completed,
      true,
      `Isolated heartbeat cleanup left test-owned processes running: ${cleanup.remainingProcessIds.join(", ")}`,
    );
    assert.ok(
      evidence.maximumHeartbeatGapMs <= 250,
      `maximumHeartbeatGapMs ${evidence.maximumHeartbeatGapMs} exceeded the unchanged 250 ms gate`,
    );

    context.diagnostic(
      `desktop-main concurrency evidence: desktop ${evidence.desktopProcessId}, external MCP load client ${evidence.mcpLoadClientProcessId}, host ${evidence.serviceHostProcessId}, worker ${evidence.workerProcessId}; ${evidence.heartbeatCount} desktop-main timer callbacks across ${evidence.searchCount} bounded MCP searches lasting ${evidence.operationDurationMs}ms; maximum heartbeat gap ${evidence.maximumHeartbeatGapMs}ms from ${evidence.maximumHeartbeatGapStartAtMs}ms to ${evidence.maximumHeartbeatGapEndAtMs}ms`,
    );
  } finally {
    cleanup = cleanup || await cleanupIsolatedServiceHost(userDataRoot, heartbeatEvidence);
    if (!cleanupDiagnosticEmitted) {
      context.diagnostic(`desktop heartbeat cleanup: ${JSON.stringify(cleanup)}`);
    }
    assert.equal(
      cleanup.completed,
      true,
      `Isolated heartbeat cleanup left test-owned processes running: ${cleanup.remainingProcessIds.join(", ")}`,
    );
    fs.rmSync(container, { recursive: true, force: true });
  }
});

test("malformed discovery metadata is removed only after canonical endpoint absence is proven", async () => {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-agent-harness-service-invalid-descriptor-"));
  const userDataRoot = path.join(container, "user-data");
  const descriptorDirectory = path.join(userDataRoot, "agent-harness");
  const descriptorPath = path.join(descriptorDirectory, "service-host.json");
  const malformedDescriptor = "{ malformed service host descriptor";
  fs.mkdirSync(descriptorDirectory, { recursive: true });
  fs.writeFileSync(descriptorPath, malformedDescriptor, "utf8");
  let launchCount = 0;
  try {
    const { AgentHarnessServiceHostClient } = require(path.join(
      repositoryRoot,
      "dist/main/agentHarness/runtime/agentHarnessServiceHostClient.js",
    ));
    const client = new AgentHarnessServiceHostClient({
      userDataRoot,
      launchServiceHost: () => { launchCount += 1; },
      requestTimeoutMs: 500,
      discoveryTimeoutMs: 500,
    });
    const startedAt = Date.now();
    await assert.rejects(() => client.connect(), /bounded discovery deadline/);
    const durationMs = Date.now() - startedAt;
    assert.ok(durationMs < 2_000);
    assert.equal(launchCount, 1);
    assert.equal(fs.existsSync(descriptorPath), false);
  } finally {
    fs.rmSync(container, { recursive: true, force: true });
  }
});

test("stale valid discovery metadata cannot veto one bounded replacement launch", async () => {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-agent-harness-service-stale-descriptor-"));
  const userDataRoot = path.join(container, "user-data");
  const descriptorDirectory = path.join(userDataRoot, "agent-harness");
  fs.mkdirSync(descriptorDirectory, { recursive: true });
  fs.writeFileSync(path.join(descriptorDirectory, "service-host.json"), JSON.stringify({
    schemaVersion: 1,
    controlProtocolVersion: 1,
    serviceHostProcessId: process.pid,
    controlAddress: process.platform === "win32"
      ? `\\\\.\\pipe\\champcity-agent-harness-unreachable-${Date.now()}`
      : path.join(descriptorDirectory, `.unreachable-${Date.now()}.sock`),
    instanceId: "11111111-1111-4111-8111-111111111111",
    runtimeBuildIdentity: `sha256:${"1".repeat(64)}`,
  }), "utf8");
  let launchCount = 0;
  try {
    const { AgentHarnessServiceHostClient } = require(path.join(
      repositoryRoot,
      "dist/main/agentHarness/runtime/agentHarnessServiceHostClient.js",
    ));
    const client = new AgentHarnessServiceHostClient({
      userDataRoot,
      launchServiceHost: () => { launchCount += 1; },
      requestTimeoutMs: 500,
      discoveryTimeoutMs: 500,
    });
    await assert.rejects(() => client.connect());
    assert.equal(launchCount, 1);
    assert.equal(fs.existsSync(path.join(descriptorDirectory, "service-host.json")), false);
  } finally {
    fs.rmSync(container, { recursive: true, force: true });
  }
});

test("valid and malformed explicit-stop intent suppress passive launch while explicit Start clears suppression", async () => {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-background-agent-stop-guard-"));
  const userDataRoot = path.join(container, "user-data");
  const { AgentHarnessServiceHostClient } = require(path.join(
    repositoryRoot,
    "dist/main/agentHarness/runtime/agentHarnessServiceHostClient.js",
  ));
  const intent = require(path.join(
    repositoryRoot,
    "dist/main/agentHarness/runtime/backgroundAgentIntent.js",
  ));
  let launchCount = 0;
  const client = new AgentHarnessServiceHostClient({
    userDataRoot,
    launchServiceHost: () => { launchCount += 1; },
    requestTimeoutMs: 100,
    discoveryTimeoutMs: 150,
    discoveryPollIntervalMs: 10,
  });
  try {
    intent.writeBackgroundAgentExplicitStopIntent(userDataRoot, "2026-09-10T12:00:00.000Z");
    const requested = await client.lifecycleStatus();
    assert.equal(requested.state, "stopped-by-user");
    assert.equal(requested.explicitStopState, "requested");
    assert.equal(requested.lastError, null);
    assert.equal(launchCount, 0);

    fs.writeFileSync(intent.getBackgroundAgentIntentPath(userDataRoot), "{ malformed", "utf8");
    const invalid = await client.lifecycleStatus();
    assert.equal(invalid.state, "stopped-by-user");
    assert.equal(invalid.explicitStopState, "invalid");
    assert.match(invalid.lastError, /needs attention/);
    assert.equal(launchCount, 0);

    await assert.rejects(
      () => client.startBackgroundAgent(),
      (error) => error.code === "SERVICE_HOST_DISCOVERY_TIMEOUT",
    );
    assert.equal(intent.readBackgroundAgentIntent(userDataRoot).state, "clear");
    assert.equal(launchCount, 1);
  } finally {
    fs.rmSync(container, { recursive: true, force: true });
  }
});

function read(relativePath) {
  return fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");
}

async function runDifferentialHeartbeatControl(context, scenario) {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-agent-harness-differential-"));
  const userDataRoot = path.join(container, "user-data");
  const projectA = createWorkspace(container, "Project_A", "desktop heartbeat project");
  // The normal eager-startup run performs no measured repository request.
  createSearchWorkload(projectA);
  let heartbeatEvidence = null;
  let cleanup = null;
  let owner = null;
  let launchedHost = null;
  try {
    if (scenario !== "Control B") {
      assert.equal(fs.existsSync(path.join(userDataRoot, "codex-runtime")), false);
      const desktop = await runServiceHostDesktop(userDataRoot, projectA, false, false, false, true, "eager");
      heartbeatEvidence = desktop.desktopHeartbeat;
      assert.equal(heartbeatEvidence.ownerProcessId, desktop.desktopProcessId);
      assert.equal(heartbeatEvidence.serviceHostProcessId, desktop.serviceHostProcessId);
      assert.equal(desktop.selection.ok, true);
      assert.equal(desktop.selection.workspaceRoot, projectA);
      assert.equal(desktop.registryManagement.restored.workspace.workspaceId, "project_a");
      assert.equal(desktop.status.state, "running");
      assert.deepEqual(desktop.status.registeredWorkspaceIds, ["project_a"]);
      assert.equal(desktop.normalWindowCount, 1);
    } else {
      owner = recoveringServiceHostClient(userDataRoot, () => {
        launchedHost = launchServiceHostCandidate(userDataRoot);
      });
      const identity = await owner.connect();
      heartbeatEvidence = {
        serviceHostProcessId: identity.serviceHostProcessId,
        workerProcessId: identity.workerProcessId,
      };
      await owner.registerWorkspace(projectA);
      const result = await runElectronFixtureToExit("electron-agent-harness-process-boundary.cjs", {
        CHAMPCITY_USER_DATA_ROOT: userDataRoot,
        CHAMPCITY_TEST_MINIMAL_EXTERNAL_HEARTBEAT: "true",
      });
      const match = result.stdout.match(/AGENT_HARNESS_PROCESS_BOUNDARY_RESULT=(\{.*\})/);
      assert.ok(match, result.stdout);
      heartbeatEvidence = JSON.parse(match[1]);
      assert.equal(heartbeatEvidence.serviceHostProcessId, launchedHost.pid);
    }
    owner?.disconnect();
    cleanup = await cleanupIsolatedServiceHost(userDataRoot, heartbeatEvidence);
    context.diagnostic(`differential heartbeat measurements: ${JSON.stringify({
      ...heartbeatEvidence,
      cleanupCompleted: cleanup.completed,
      remainingOwnedProcessIds: cleanup.remainingProcessIds,
    })}`);
    context.diagnostic(`differential heartbeat cleanup: ${JSON.stringify(cleanup)}`);
    const evidence = heartbeatEvidence;
    assert.equal(evidence.scenario, scenario);
    const processIds = [evidence.ownerProcessId, evidence.serviceHostProcessId, evidence.workerProcessId];
    if (scenario === "Control B") {
      processIds.push(evidence.mcpLoadClientProcessId);
      assert.equal(evidence.normalWindowCountDuringOperation, 0);
      assert.ok(evidence.searchCount >= 1);
      assert.equal(evidence.mcpResultStatus, "success");
      assert.equal(evidence.mcpMatchCount, 1);
      assert.equal(evidence.mcpLoadCleanup.clientClosed, true);
      assert.equal(evidence.mcpLoadCleanup.processExited, true);
      assert.equal(evidence.mcpLoadCleanup.exitCode, 0);
      assert.equal(evidence.mcpLoadCleanup.signalCode, null);
      assert.equal(evidence.mcpLoadCleanup.forcedTermination, false);
      assert.equal(evidence.mcpLoadCleanup.closeError, null);
      assert.deepEqual(evidence.mcpLoadCleanup.cleanupErrors, []);
    } else {
      assert.equal(evidence.normalWindowPresentDuringOperation, true);
      assert.equal(evidence.normalWindowCountDuringOperation, 1);
      assert.ok(evidence.operationDurationMs >= 5_000);
      assert.equal(evidence.searchCount, 0);
      assert.equal(evidence.mcpResultStatus, "not-requested");
      assert.equal(evidence.mcpMatchCount, null);
      assert.equal(evidence.mcpLoadClientProcessId, null);
      assert.equal(evidence.mcpLoadCleanup, null);
      assert.equal(cleanup.externalLoadDescriptorPresent, false);
    }
    assert.ok(processIds.every((pid) => Number.isInteger(pid) && pid > 0));
    assert.equal(new Set(processIds).size, processIds.length);
    assert.ok(evidence.operationDurationMs >= 500);
    assert.ok(evidence.heartbeatCount >= 20);
    assert.ok(evidence.firstHeartbeatAtMs < evidence.operationDurationMs);
    // The idle timeout can complete in the same Date.now() millisecond as the
    // final timer callback. Loaded scenarios retain REPAIR02's strict boundary.
    assert.ok(scenario !== "Control B"
      ? evidence.lastHeartbeatAtMs <= evidence.operationDurationMs
      : evidence.lastHeartbeatAtMs < evidence.operationDurationMs);
    assert.equal(cleanup.completed, true);
    assert.equal(cleanup.identityConfirmed, true);
    assert.equal(cleanup.gracefulShutdown, true);
    assert.deepEqual(cleanup.forcedProcessIds, []);
    assert.deepEqual(cleanup.cleanupErrors, []);
    assertProcessMeasurement(evidence);
    if (scenario !== "Control B") {
      assertCodexStartupObservation(evidence);
    }
    assert.ok(
      evidence.maximumHeartbeatGapMs <= 250,
      `maximumHeartbeatGapMs ${evidence.maximumHeartbeatGapMs} exceeded the unchanged 250 ms gate`,
    );
  } finally {
    owner?.disconnect();
    cleanup = cleanup || await cleanupIsolatedServiceHost(userDataRoot, heartbeatEvidence);
    // This exact child handle also covers launch failure before a descriptor exists.
    if (launchedHost?.pid && processExists(launchedHost.pid)) {
      terminateIfRunning(launchedHost.pid);
      await waitForProcessExit(launchedHost.pid, 15_000);
    }
    context.diagnostic(`differential final cleanup: ${JSON.stringify(cleanup)}`);
    assert.equal(cleanup.completed, true);
    fs.rmSync(container, { recursive: true, force: true });
  }
}

function assertCodexStartupObservation(evidence) {
  const startup = evidence.codexStartup;
  assert.equal(startup.requestCount, 1);
  assert.equal(startup.mode, "eager");
  assert.ok(Number.isFinite(startup.requestedAtMs));
  assert.ok(startup.requestedAtMs <= 0);
  assert.equal(startup.workerRequestCount, 1);
  assert.ok(Number.isInteger(startup.initializerWorkerProcessId));
  assert.notEqual(startup.initializerWorkerProcessId, evidence.desktopProcessId);
  assert.notEqual(startup.initializerWorkerProcessId, evidence.serviceHostProcessId);
  assert.notEqual(startup.initializerWorkerProcessId, evidence.workerProcessId);
  assert.ok(Number.isFinite(startup.workerSpawnedAtMs));
  assert.equal(startup.workerActiveDuringMeasurement, true);
  const terminal = evidence.codexStartupTerminal;
  assert.ok(terminal);
  assert.equal(terminal.observation.resultClass, "resolved");
  assert.ok(["current", "updated", "degraded"].includes(terminal.status.updateState));
  assert.ok(terminal.status.catalogCount > 0);
  if (terminal.status.selection) {
    assert.equal(terminal.status.selectionBlocker, null);
  }
}

function assertProcessMeasurement(evidence) {
  const processEvidence = evidence.processEvidence;
  assert.ok(processEvidence);
  assert.ok(processEvidence.cpuUsageDelta.user >= 0);
  assert.ok(processEvidence.cpuUsageDelta.system >= 0);
  assert.equal(
    evidence.maximumHeartbeatGapEndAtMs - evidence.maximumHeartbeatGapStartAtMs,
    evidence.maximumHeartbeatGapMs,
  );
}

async function runServiceHostDesktop(
  userDataRoot,
  selectedWorkspaceRoot,
  exerciseControls,
  measureDesktopHeartbeat = false,
  exerciseBackgroundLifecycle = false,
  idleDesktopHeartbeat = false,
  codexStartupMode = "",
) {
  const result = await runElectronFixtureToExit("electron-agent-harness-service-host-desktop.cjs", {
    CHAMPCITY_USER_DATA_ROOT: userDataRoot,
    CHAMPCITY_AGENT_HARNESS_ENABLED: "true",
    CHAMPCITY_AGENT_HARNESS_HOST: "127.0.0.1",
    CHAMPCITY_AGENT_HARNESS_PORT: "0",
    CHAMPCITY_AGENT_HARNESS_LOCAL_AUTH: "development-unauthenticated",
    CHAMPCITY_TEST_SELECTED_WORKSPACE_ROOT: selectedWorkspaceRoot || "",
    CHAMPCITY_TEST_EXERCISE_CONTROLS: exerciseControls ? "true" : "false",
    CHAMPCITY_TEST_MEASURE_DESKTOP_HEARTBEAT: measureDesktopHeartbeat ? "true" : "false",
    CHAMPCITY_TEST_IDLE_DESKTOP_HEARTBEAT: idleDesktopHeartbeat ? "true" : "false",
    CHAMPCITY_TEST_CODEX_STARTUP_MODE: codexStartupMode,
    CHAMPCITY_TEST_EXERCISE_BACKGROUND_LIFECYCLE: exerciseBackgroundLifecycle ? "true" : "false",
    CHAMPCITY_TEST_VERIFY_SINGLE_INSTANCE: exerciseBackgroundLifecycle ? "true" : "false",
  });
  assert.match(result.stdout, /AGENT_HARNESS_SERVICE_HOST_DESKTOP_GRACEFUL=1/);
  const match = result.stdout.match(/AGENT_HARNESS_SERVICE_HOST_DESKTOP_RESULT=(\{.*\})/);
  assert.ok(match, result.stdout);
  return JSON.parse(match[1]);
}

function runElectronFixtureToExit(fixtureName, extraEnvironment = {}) {
  const environment = { ...process.env, ...extraEnvironment };
  delete environment.ELECTRON_RUN_AS_NODE;
  return new Promise((resolve, reject) => {
    const child = spawn(
      electronPath,
      [path.join(repositoryRoot, "test", "agent-harness", "fixtures", fixtureName)],
      {
        cwd: repositoryRoot,
        env: environment,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      },
    );
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error(`Electron fixture ${fixtureName} did not exit within the bounded deadline.`));
    }, 175_000);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once("exit", (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        reject(new Error(`Electron fixture ${fixtureName} exited with code ${code}.\n${stderr}\n${stdout}`));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

async function runElectronFixture(fixtureName, extraEnvironment = {}) {
  const environment = { ...process.env, ...extraEnvironment };
  delete environment.ELECTRON_RUN_AS_NODE;
  return execFileAsync(
    electronPath,
    [path.join(repositoryRoot, "test", "agent-harness", "fixtures", fixtureName)],
    {
      cwd: repositoryRoot,
      env: environment,
      maxBuffer: 4 * 1024 * 1024,
      timeout: 170_000,
      windowsHide: true,
    },
  );
}

function serviceHostClient(userDataRoot) {
  const { AgentHarnessServiceHostClient } = require(path.join(
    repositoryRoot,
    "dist/main/agentHarness/runtime/agentHarnessServiceHostClient.js",
  ));
  return new AgentHarnessServiceHostClient({
    userDataRoot,
    launchServiceHost: () => {
      throw new Error("Test expected an already-running Service Host.");
    },
    requestTimeoutMs: 15_000,
    discoveryTimeoutMs: 15_000,
  });
}

async function cleanupIsolatedServiceHost(userDataRoot, heartbeatEvidence) {
  const descriptorRecord = readExactIsolatedServiceHostDescriptor(userDataRoot);
  const externalLoadDescriptorRecord = readExactExternalMcpLoadDescriptor(userDataRoot);
  const ownedProcessIds = new Set();
  const forcedProcessIds = [];
  const cleanupErrors = [];
  let gracefulShutdown = false;
  let identityConfirmed = false;
  let externalLoadExitedNaturally = true;

  addOwnedProcessId(ownedProcessIds, externalLoadDescriptorRecord.descriptor?.desktopProcessId);
  addOwnedProcessId(ownedProcessIds, externalLoadDescriptorRecord.descriptor?.mcpLoadClientProcessId);
  addOwnedProcessId(ownedProcessIds, heartbeatEvidence?.desktopProcessId);
  addOwnedProcessId(ownedProcessIds, heartbeatEvidence?.mcpLoadClientProcessId);
  addOwnedProcessId(ownedProcessIds, descriptorRecord.descriptor?.serviceHostProcessId);
  addOwnedProcessId(ownedProcessIds, heartbeatEvidence?.serviceHostProcessId);
  addOwnedProcessId(ownedProcessIds, heartbeatEvidence?.workerProcessId);
  addOwnedProcessId(ownedProcessIds, heartbeatEvidence?.codexStartup?.initializerWorkerProcessId);

  if (descriptorRecord.error) {
    cleanupErrors.push(descriptorRecord.error);
  }
  if (externalLoadDescriptorRecord.error) {
    cleanupErrors.push(externalLoadDescriptorRecord.error);
  }

  const externalLoadProcessId = externalLoadDescriptorRecord.descriptor?.mcpLoadClientProcessId
    ?? heartbeatEvidence?.mcpLoadClientProcessId;
  if (externalLoadProcessId && processExists(externalLoadProcessId)) {
    externalLoadExitedNaturally = await waitForProcessExitWithin(externalLoadProcessId, 5_000);
  }

  if (descriptorRecord.descriptor) {
    const client = serviceHostClient(userDataRoot);
    try {
      const identity = await client.connect();
      if (
        identity.instanceId !== descriptorRecord.descriptor.instanceId ||
        identity.serviceHostProcessId !== descriptorRecord.descriptor.serviceHostProcessId
      ) {
        throw new Error("Isolated Service Host handshake did not match the exact test descriptor.");
      }
      identityConfirmed = true;
      addOwnedProcessId(ownedProcessIds, identity.workerProcessId);
      await client.shutdownServiceHost();
      gracefulShutdown = true;
    } catch (error) {
      cleanupErrors.push(error instanceof Error ? error.message : String(error));
    } finally {
      client.disconnect();
    }
  }

  if (gracefulShutdown) {
    await Promise.all([...ownedProcessIds].map((processId) => waitForProcessExitWithin(processId, 10_000)));
  }

  for (const processId of ownedProcessIds) {
    if (processExists(processId)) {
      terminateIfRunning(processId);
      forcedProcessIds.push(processId);
    }
  }
  await Promise.all([...ownedProcessIds].map((processId) => waitForProcessExitWithin(processId, 15_000)));

  const remainingProcessIds = [...ownedProcessIds].filter(processExists);
  return {
    completed: remainingProcessIds.length === 0,
    descriptorPresent: Boolean(descriptorRecord.descriptor),
    externalLoadDescriptorPresent: Boolean(externalLoadDescriptorRecord.descriptor),
    evidencePresent: Boolean(heartbeatEvidence),
    identityConfirmed,
    gracefulShutdown,
    externalLoadClientClosed: heartbeatEvidence?.mcpLoadCleanup?.clientClosed ?? null,
    externalLoadExitedNaturally,
    forcedProcessIds,
    remainingProcessIds,
    cleanupErrors,
  };
}

function readExactIsolatedServiceHostDescriptor(userDataRoot) {
  const descriptorModule = require(path.join(
    repositoryRoot,
    "dist/main/agentHarness/runtime/agentHarnessServiceHostDescriptor.js",
  ));
  try {
    const descriptor = descriptorModule.readAgentHarnessServiceHostDescriptor(userDataRoot);
    if (!descriptor) {
      return { descriptor: null, error: null };
    }
    if (descriptor.controlAddress !== descriptorModule.getAgentHarnessServiceHostControlAddress(userDataRoot)) {
      return {
        descriptor: null,
        error: "Isolated Service Host descriptor did not match the test-owned control address.",
      };
    }
    return { descriptor, error: null };
  } catch (error) {
    return {
      descriptor: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function readExactExternalMcpLoadDescriptor(userDataRoot) {
  const descriptorPath = path.join(
    userDataRoot,
    "agent-harness",
    "external-mcp-load-client.json",
  );
  if (!fs.existsSync(descriptorPath)) {
    return { descriptor: null, error: null };
  }
  try {
    const descriptor = JSON.parse(fs.readFileSync(descriptorPath, "utf8"));
    if (
      descriptor?.kind !== "champcity-test-external-mcp-load-client" ||
      !Number.isInteger(descriptor.desktopProcessId) ||
      descriptor.desktopProcessId <= 0 ||
      !Number.isInteger(descriptor.mcpLoadClientProcessId) ||
      descriptor.mcpLoadClientProcessId <= 0 ||
      descriptor.desktopProcessId === descriptor.mcpLoadClientProcessId
    ) {
      throw new Error("External MCP load descriptor did not contain distinct valid test-owned identities.");
    }
    return { descriptor, error: null };
  } catch (error) {
    return {
      descriptor: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function addOwnedProcessId(processIds, processId) {
  if (Number.isInteger(processId) && processId > 0 && processId !== process.pid) {
    processIds.add(processId);
  }
}

function recoveringServiceHostClient(userDataRoot, launchServiceHost, expectedBuildIdentity) {
  const { AgentHarnessServiceHostClient } = require(path.join(
    repositoryRoot,
    "dist/main/agentHarness/runtime/agentHarnessServiceHostClient.js",
  ));
  return new AgentHarnessServiceHostClient({
    userDataRoot,
    launchServiceHost,
    requestTimeoutMs: 5_000,
    discoveryTimeoutMs: 20_000,
    discoveryPollIntervalMs: 50,
    expectedBuildIdentity,
  });
}

function launchServiceHostCandidate(userDataRoot) {
  const environment = {
    ...process.env,
    CHAMPCITY_USER_DATA_ROOT: userDataRoot,
    CHAMPCITY_AGENT_HARNESS_ENABLED: "true",
    CHAMPCITY_AGENT_HARNESS_HOST: "127.0.0.1",
    CHAMPCITY_AGENT_HARNESS_PORT: "0",
    CHAMPCITY_AGENT_HARNESS_LOCAL_AUTH: "development-unauthenticated",
  };
  delete environment.ELECTRON_RUN_AS_NODE;
  return spawn(electronPath, [repositoryRoot, "--agent-harness-service-host"], {
    cwd: repositoryRoot,
    env: environment,
    stdio: "ignore",
    windowsHide: true,
  });
}

async function waitForReplacementWorker(client, priorWorkerPid, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const identity = await client.identity();
    if (identity.workerProcessId &&
      identity.workerProcessId !== priorWorkerPid &&
      identity.workerRecoveryState === "idle") {
      return identity;
    }
    await delay(50);
  }
  assert.fail(`Replacement Agent Harness worker was not healthy within ${timeoutMs}ms.`);
}

async function waitForWorkerRecoveryState(client, recoveryState, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const identity = await client.identity();
    if (identity.workerRecoveryState === recoveryState) {
      return identity;
    }
    await delay(50);
  }
  assert.fail(`Worker recovery state ${recoveryState} was not observed within ${timeoutMs}ms.`);
}

async function beginUnconfirmedRequest(descriptor, operation, payload) {
  const socket = net.createConnection(descriptor.controlAddress);
  await new Promise((resolve, reject) => {
    socket.once("connect", resolve);
    socket.once("error", reject);
  });
  const request = {
    protocolVersion: 1,
    kind: "request",
    requestId: `unconfirmed-${Date.now()}-${Math.random()}`,
    expectedInstanceId: descriptor.instanceId,
    operation,
    payload,
  };
  socket.write(`${JSON.stringify(request)}\n`);
  const response = await readControlFrame(socket);
  assert.equal(response.ok, true);
  assert.equal(response.operation, operation);
  assert.equal(response.result.phase, "awaiting-client-confirmation");
  socket.destroy();
}

function readControlFrame(socket) {
  return new Promise((resolve, reject) => {
    let buffered = "";
    socket.setEncoding("utf8");
    socket.on("data", (chunk) => {
      buffered += chunk;
      const newline = buffered.indexOf("\n");
      if (newline < 0) {
        return;
      }
      try {
        resolve(JSON.parse(buffered.slice(0, newline)));
      } catch (error) {
        reject(error);
      }
    });
    socket.once("error", reject);
    socket.once("close", () => reject(new Error("Control connection closed before a response frame.")));
  });
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
    const suffix = index === 999 ? "\ndesktop-main-isolation-target\n" : "\nordinary-content\n";
    fs.writeFileSync(path.join(bulkRoot, `file-${String(index).padStart(4, "0")}.txt`), filler + suffix, "utf8");
  }
}

async function connectMcpClient(url) {
  const client = new Client({
    name: "champcity-agent-harness-service-host-test",
    version: "0.1.0",
  }, { capabilities: {} });
  await client.connect(new StreamableHTTPClientTransport(new URL(url)));
  return client;
}

function readWorkspace(client, workspaceId) {
  return client.callTool({
    name: "repo_toolbox",
    arguments: {
      workspaceId,
      action: "read_file",
      params: { relativePath: "README.md" },
    },
  });
}

function callTool(client, name, args) {
  return client.callTool({ name, arguments: args });
}

async function getJson(url) {
  const response = await fetch(url);
  return response.json();
}

function assertFailedAndUnrouted(status) {
  assert.equal(status.state, "failed");
  assert.equal(status.port, null);
  assert.equal(status.healthEndpoint, null);
  assert.equal(status.mcpEndpoint, null);
  assert.equal(status.activeWorkspaceId, null);
  assert.equal(status.expectedWorkspaceId, null);
  assert.equal(status.routingState, "unavailable");
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

async function waitForProcessExitWithin(processId, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!processExists(processId)) {
      return true;
    }
    await delay(50);
  }
  return !processExists(processId);
}

async function waitForEndpointUnavailable(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await fetch(url, { signal: AbortSignal.timeout(500) });
    } catch {
      return;
    }
    await delay(50);
  }
  assert.fail("Agent Harness endpoint remained reachable after bounded shutdown/fencing.");
}

function processExists(processId) {
  try {
    process.kill(processId, 0);
    return true;
  } catch {
    return false;
  }
}

function terminateIfRunning(processId) {
  if (processId && processExists(processId)) {
    process.kill(processId, "SIGTERM");
  }
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
