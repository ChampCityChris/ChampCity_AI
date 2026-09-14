const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  AgentHarnessOperationalDiagnosticsCollector,
} = require("../../dist/main/agentHarness/runtime/operationalDiagnostics.js");
const {
  startAgentHarnessHttpRuntime,
} = require("../../dist/main/agentHarness/runtime/httpRuntime.js");
const {
  AgentHarnessService,
} = require("../../dist/main/agentHarness/runtime/agentHarnessService.js");
const {
  createAgentHarnessToolRegistry,
} = require("../../dist/main/agentHarness/tools/toolRegistry.js");
const {
  createRegisteredWorkspaceAccessProvider,
  resolveWorkspaceRootContext,
} = require("../../dist/main/agentHarness/workspace/workspaceAccess.js");
const { AgentHarnessError } = require("../../dist/main/agentHarness/core/errors.js");
const {
  REPOSITORY_TRUNCATION_REASONS,
} = require("../../dist/main/agentHarness/repository/repositoryOperations.js");
const { DeterministicReliabilitySoakHarness } = require("./support/reliabilitySoakHarness.cjs");

test("operational diagnostics enforce audit bounding and metadata-only privacy", () => {
  let now = 1_000;
  const eventLoopMonitor = {
    enable() {},
    disable() {},
    percentile() { return 12_000_000; },
    max: 25_000_000,
  };
  const collector = new AgentHarnessOperationalDiagnosticsCollector({
    workerGeneration: "11111111-1111-4111-8111-111111111111",
    recentRequestCapacity: 3,
    latencySampleCapacity: 4,
    now: () => now,
    eventLoopMonitor,
    workerRestartCount: 2,
    lastWorkerRestartReason: "heartbeat-miss-threshold",
  });
  const sensitiveValues = [
    "<PRIVATE_PATH>/secret.md",
    "prompt-with-private-content",
    "Bearer private-token-value",
    "stack trace private frame",
  ];
  for (let index = 0; index < 8; index += 1) {
    const observation = collector.beginOperation({
      toolbox: "repo_toolbox",
      action: index === 0 ? sensitiveValues[1] : "list_files",
      workspaceId: index === 0 ? sensitiveValues[0] : "bounded_workspace",
    });
    now += index + 1;
    observation.finish(index === 6 ? {
      ok: false,
      toolName: "repo_toolbox",
      action: "list_files",
      error: {
        code: "REPOSITORY_TRAVERSAL_INCOMPLETE",
        message: sensitiveValues[2],
        details: {
          completion: { status: "incomplete", reason: "deadline" },
          stack: sensitiveValues[3],
        },
      },
      attemptId: "private-result-attempt",
      timestamp: new Date(now).toISOString(),
    } : {
      ok: true,
      toolName: "repo_toolbox",
      action: "list_files",
      workspaceId: "bounded_workspace",
      payload: index === 7
        ? { completion: { status: "partial", reason: "candidate-limit" }, secret: sensitiveValues[2] }
        : { content: sensitiveValues[1] },
      attemptId: "private-result-attempt",
      timestamp: new Date(now).toISOString(),
    });
  }

  const diagnostics = collector.snapshot(emptySessions(), emptyContract());
  const serialized = JSON.stringify(diagnostics);
  assert.equal(diagnostics.recentRequests.length, 3);
  assert.equal(diagnostics.requests.totalBegun, 8);
  assert.equal(diagnostics.requests.totalCompleted, 7);
  assert.equal(diagnostics.requests.totalFailed, 1);
  assert.equal(diagnostics.requests.latencyMs.sampleCount, 4);
  assert.equal(diagnostics.repositoryIncompleteByReason.deadline, 1);
  assert.equal(diagnostics.repositoryIncompleteByReason["candidate-limit"], 1);
  assert.equal(diagnostics.eventLoopLagMs.p95, 12);
  assert.equal(diagnostics.eventLoopLagMs.maximum, 25);
  assert.equal(diagnostics.lifecycle.workerRestartCount, 2);
  for (const sensitive of sensitiveValues) {
    assert.equal(serialized.includes(sensitive), false, sensitive);
  }
  assert.deepEqual(
    Object.keys(diagnostics.recentRequests[0]).sort(),
    ["action", "attemptId", "completedAt", "durationMs", "outcome", "reasonCode", "startedAt", "toolbox", "workspaceId"].sort(),
  );
  collector.close();
});

test("repository incomplete telemetry admits the shared bounded reason set and rejects unapproved values", () => {
  const eventLoopMonitor = {
    enable() {},
    disable() {},
    percentile() { return 0; },
    max: 0,
  };
  const collector = new AgentHarnessOperationalDiagnosticsCollector({
    recentRequestCapacity: 32,
    eventLoopMonitor,
  });
  const typedIncompleteReasons = new Set(["visit-limit", "deadline"]);

  for (const reason of REPOSITORY_TRUNCATION_REASONS) {
    const observation = collector.beginOperation({
      toolbox: "repo_toolbox",
      action: "list_files",
      workspaceId: "bounded_workspace",
    });
    observation.finish(typedIncompleteReasons.has(reason) ? {
      ok: false,
      toolName: "repo_toolbox",
      action: "list_files",
      error: {
        code: "REPOSITORY_TRAVERSAL_INCOMPLETE",
        message: "Bounded repository traversal did not complete.",
        details: {
          completion: { status: "incomplete", reason },
          ignoredPath: "<PRIVATE_PATH>/never-retained.md",
          ignoredStack: "private stack-shaped detail",
        },
      },
      attemptId: `approved-${reason}`,
      timestamp: new Date().toISOString(),
    } : {
      ok: true,
      toolName: "repo_toolbox",
      action: "list_files",
      workspaceId: "bounded_workspace",
      payload: {
        completion: { status: "partial", reason },
        ignoredPayload: "private repository payload",
      },
      attemptId: `approved-${reason}`,
      timestamp: new Date().toISOString(),
    });
  }

  const invalidReasons = [
    "<PRIVATE_PATH>/secret.md",
    "prompt: reveal private content",
    "Bearer private-token-value",
    "Error: private stack frame",
  ];
  for (const [index, reason] of invalidReasons.entries()) {
    const observation = collector.beginOperation({
      toolbox: "repo_toolbox",
      action: "list_files",
      workspaceId: "bounded_workspace",
    });
    observation.finish(index % 2 === 0 ? {
      ok: true,
      toolName: "repo_toolbox",
      action: "list_files",
      workspaceId: "bounded_workspace",
      payload: { completion: { status: "partial", reason } },
      attemptId: `invalid-${index}`,
      timestamp: new Date().toISOString(),
    } : {
      ok: false,
      toolName: "repo_toolbox",
      action: "list_files",
      error: {
        code: "REPOSITORY_TRAVERSAL_INCOMPLETE",
        message: "Stable bounded failure.",
        details: { completion: { status: "incomplete", reason } },
      },
      attemptId: `invalid-${index}`,
      timestamp: new Date().toISOString(),
    });
  }

  const diagnostics = collector.snapshot(emptySessions(), emptyContract());
  assert.deepEqual(REPOSITORY_TRUNCATION_REASONS, [
    "file-limit",
    "visit-limit",
    "candidate-limit",
    "deadline",
    "result-limit",
    "content-byte-limit",
    "file-size-limit",
    "output-limit",
  ]);
  assert.deepEqual(
    Object.fromEntries(Object.entries(diagnostics.repositoryIncompleteByReason).sort()),
    Object.fromEntries(REPOSITORY_TRUNCATION_REASONS.map((reason) => [reason, 1]).sort()),
  );
  const serialized = JSON.stringify(diagnostics);
  for (const invalidReason of invalidReasons) {
    assert.equal(serialized.includes(invalidReason), false, invalidReason);
  }
  assert.equal(serialized.includes("<PRIVATE_PATH>/never-retained.md"), false);
  assert.equal(serialized.includes("private stack-shaped detail"), false);
  assert.equal(serialized.includes("private repository payload"), false);
  collector.close();
});

test("liveness and readiness are shallow constant-cost surfaces with stable reason codes", async () => {
  const fixture = createWorkspace("Readiness_Project");
  let listToolsCount = 0;
  let toolCallCount = 0;
  const baseRegistry = createRegistry(fixture);
  const runtime = await startAgentHarnessHttpRuntime({
    host: "127.0.0.1",
    port: 0,
    userDataRoot: fixture.userDataRoot,
    allowUnauthenticatedLocal: true,
    registry: {
      listTools(scope) {
        listToolsCount += 1;
        return baseRegistry.listTools(scope);
      },
      callTool(call) {
        toolCallCount += 1;
        return baseRegistry.callTool(call);
      },
    },
  });
  try {
    const afterStartupCaptures = listToolsCount;
    for (let index = 0; index < 100; index += 1) {
      const health = await getJson(runtime.healthUrl);
      const readiness = await getJson(runtime.readinessUrl);
      assert.equal(health.body.status, "ok");
      assert.equal(readiness.status, 200);
      assert.equal(readiness.body.status, "ready");
      assert.equal(readiness.body.reasonCode, "ready");
      assert.deepEqual(Object.keys(readiness.body).sort(), ["reasonCode", "status", "workerGeneration"]);
    }
    assert.equal(listToolsCount, afterStartupCaptures);
    assert.equal(toolCallCount, 0);

    runtime.suspendAdmission();
    const suspended = await getJson(runtime.readinessUrl);
    assert.equal(suspended.status, 503);
    assert.equal(suspended.body.reasonCode, "suspend-admission-paused");
    await runtime.resumeAfterPowerEpoch();
    const resumed = await getJson(runtime.readinessUrl);
    assert.equal(resumed.status, 200);
    const diagnostics = runtime.operationalDiagnostics();
    assert.ok(diagnostics.lifecycle.lastSuspendAt);
    assert.ok(diagnostics.lifecycle.lastResumeAt);
    assert.ok(diagnostics.lifecycle.lastRecoveryStartedAt);
    assert.equal(diagnostics.readiness.reasonCode, "ready");
  } finally {
    await runtime.close();
  }
});

test("service diagnostics remain monotonic across HTTP runtime generations within one worker generation", async () => {
  const fixture = createWorkspace("Monotonic_Service_Project");
  const service = new AgentHarnessService({
    userDataRoot: fixture.userDataRoot,
    port: 0,
    allowUnauthenticatedLocal: true,
    workerGeneration: "22222222-2222-4222-8222-222222222222",
  });
  await service.registerWorkspaceRoot(fixture.root);
  try {
    const started = await service.start();
    const session = await initializeSession(started.mcpEndpoint, 20);
    const call = await postSessionRequest(
      started.mcpEndpoint,
      session,
      callToolRequest(21, "monotonic_service_project", "read_file", { relativePath: "README.md" }),
    );
    assert.equal(call.status, 200);
    const generationOne = service.status().operationalDiagnostics.toolContract.currentGeneration;
    const restarted = await service.restart();
    const diagnostics = restarted.operationalDiagnostics;
    assert.equal(diagnostics.workerGeneration, "22222222-2222-4222-8222-222222222222");
    assert.notEqual(diagnostics.toolContract.currentGeneration, generationOne);
    assert.equal(diagnostics.toolContract.captureCount, 2);
    assert.equal(diagnostics.toolContract.publicationGenerationCount, 2);
    assert.equal(diagnostics.sessions.totalCreated, 1);
    assert.equal(diagnostics.sessions.totalDisposed.runtimeClose, 1);
    assert.equal(diagnostics.requests.totalBegun, 1);
    assert.equal(diagnostics.requests.totalCompleted, 1);
  } finally {
    await service.stop();
  }
});

test("concurrent broad work does not block exact-path requests and live audit metadata is bounded", { timeout: 30_000 }, async (t) => {
  const fixture = createWorkspace("Concurrency_Project");
  let runtime;
  const baseRegistry = createRegistry(fixture, () => ({
    operationalDiagnostics: runtime?.operationalDiagnostics() ?? {},
  }));
  const broadEntered = deferred();
  const releaseBroad = deferred();
  let broadComplete = false;
  runtime = await startAgentHarnessHttpRuntime({
    host: "127.0.0.1",
    port: 0,
    userDataRoot: fixture.userDataRoot,
    allowUnauthenticatedLocal: true,
    registry: {
      listTools: (scope) => baseRegistry.listTools(scope),
      callTool: async (call) => {
        if (call.name === "repo_toolbox" && call.arguments.action === "search_files") {
          broadEntered.resolve();
          await releaseBroad.promise;
        }
        return baseRegistry.callTool(call);
      },
    },
  });
  let broadSession;
  let exactSession;
  try {
    broadSession = await initializeSession(runtime.url, 1);
    exactSession = await initializeSession(runtime.url, 2);
    const broadRequest = postSessionRequest(
      runtime.url,
      broadSession,
      callToolRequest(10, "concurrency_project", "search_files", { query: "diagnostic" }),
    ).then((result) => {
      broadComplete = true;
      return result;
    });
    await broadEntered.promise;

    const exactDurations = [];
    for (let index = 0; index < 100; index += 1) {
      const startedAt = Date.now();
      const response = await postSessionRequest(
        runtime.url,
        exactSession,
        callToolRequest(100 + index, "concurrency_project", "read_file", { relativePath: "README.md" }),
      );
      exactDurations.push(Date.now() - startedAt);
      assert.equal(response.status, 200);
    }
    assert.equal(broadComplete, false);
    const broadCompletedBeforeExactRequests = broadComplete;
    const sorted = [...exactDurations].sort((left, right) => left - right);
    assert.ok(percentile(sorted, 95) <= 1_000, `exact-path p95 was ${percentile(sorted, 95)} ms`);
    assert.ok(sorted.at(-1) <= 3_000, `exact-path maximum was ${sorted.at(-1)} ms`);

    const listDurations = [];
    for (let index = 0; index < 100; index += 1) {
      const startedAt = Date.now();
      const response = await postSessionRequest(
        runtime.url,
        exactSession,
        callToolRequest(1_000 + index, "concurrency_project", "list_files", { directory: ".", maxFiles: 100 }),
      );
      listDurations.push(Date.now() - startedAt);
      const messages = response.body.split("\n").filter((line) => line.startsWith("data: "));
      assert.equal(response.status, 200);
      assert.ok(messages.some((line) => line.includes("README.md")));
    }
    const sortedListDurations = [...listDurations].sort((left, right) => left - right);
    assert.ok(percentile(sortedListDurations, 95) <= 2_000, `non-Git list p95 was ${percentile(sortedListDurations, 95)} ms`);

    const authorizedDiagnostics = await postSessionRequest(
      runtime.url,
      exactSession,
      callToolRequest(2_000, "concurrency_project", "status", {}, "diagnostics_toolbox"),
    );
    assert.equal(authorizedDiagnostics.status, 200);
    assert.equal(authorizedDiagnostics.body.includes(fixture.root), false);
    assert.equal(authorizedDiagnostics.body.includes("operationalDiagnostics"), false);
    assert.equal(authorizedDiagnostics.body.includes("recentRequests"), true);

    releaseBroad.resolve();
    assert.equal((await broadRequest).status, 200);
    const diagnostics = runtime.operationalDiagnostics();
    assert.equal(diagnostics.requests.currentInFlight, 0);
    assert.equal(diagnostics.requests.totalBegun, 202);
    assert.equal(diagnostics.requests.totalCompleted, 202);
    assert.equal(diagnostics.recentRequests.length, 100);
    assert.equal(JSON.stringify(diagnostics).includes(fixture.root), false);
    assert.equal(diagnostics.recentRequests.every((entry) => entry.workspaceId === "concurrency_project"), true);
    t.diagnostic(JSON.stringify({
      exactPathP95Ms: percentile(sorted, 95),
      exactPathMaximumMs: sorted.at(-1),
      requestCount: exactDurations.length,
      nonGitListP95Ms: percentile(sortedListDurations, 95),
      nonGitListMaximumMs: sortedListDurations.at(-1),
      nonGitListRequestCount: listDurations.length,
      broadCompletedBeforeExactRequests,
    }));
  } finally {
    releaseBroad.resolve();
    await runtime.close();
  }
});

test("two-batch abrupt reconnect soak plateaus at the cap without linear RSS growth", { timeout: 120_000 }, async (t) => {
  const fixture = createWorkspace("Reconnect_Soak_Project");
  let now = 50_000;
  const runtime = await startAgentHarnessHttpRuntime({
    host: "127.0.0.1",
    port: 0,
    userDataRoot: fixture.userDataRoot,
    allowUnauthenticatedLocal: true,
    registry: createRegistry(fixture),
    sessionLifecyclePolicy: {
      idleTtlMs: 10,
      reaperCadenceMs: 60_000,
      globalCap: 32,
      perPrincipalCap: 32,
    },
    sessionLifecycleClock: () => now,
  });
  const soak = new DeterministicReliabilitySoakHarness(runtime);
  try {
    const initialCaptureCount = runtime.operationalDiagnostics().toolContract.captureCount;
    const first = await soak.runReconnectBatch(500);
    assert.equal(first.sessions.retainedSessionCount, 32);
    assert.equal(first.sessions.totalCreated, 500);
    assert.equal(first.operational.toolContract.captureCount, initialCaptureCount);
    now += 11;
    assert.equal(await runtime.reapIdleSessions(), 32);
    assert.equal(runtime.sessionDiagnostics().retainedSessionCount, 0);

    const second = await soak.runReconnectBatch(500);
    assert.equal(second.sessions.retainedSessionCount, 32);
    assert.equal(second.sessions.totalCreated, 1_000);
    assert.equal(second.operational.toolContract.captureCount, initialCaptureCount);
    assert.ok(second.rssMiB - first.rssMiB <= 64, `RSS delta was ${second.rssMiB - first.rssMiB} MiB`);
    now += 11;
    assert.equal(await runtime.reapIdleSessions(), 32);
    const settled = soak.capture("settled");
    assert.equal(settled.sessions.retainedSessionCount, 0);
    assert.equal(settled.sessions.totalDisposed.capEviction, 936);
    assert.equal(settled.sessions.totalDisposed.idleTtl, 64);
    assert.equal(settled.operational.toolContract.periodicRecaptureTimerCount, 0);
    t.diagnostic(JSON.stringify({
      batchSize: 500,
      firstPlateauSessions: first.sessions.retainedSessionCount,
      secondPlateauSessions: second.sessions.retainedSessionCount,
      firstPlateauRssMiB: first.rssMiB,
      secondPlateauRssMiB: second.rssMiB,
      rssDeltaMiB: Math.round((second.rssMiB - first.rssMiB) * 100) / 100,
      settledSessions: settled.sessions.retainedSessionCount,
      totalCreated: settled.sessions.totalCreated,
      contractCaptureCount: settled.operational.toolContract.captureCount,
    }));
  } finally {
    await runtime.close();
  }
});

test("settled sixty-second idle sample stays within CPU and event-loop lag limits", { timeout: 75_000 }, async (t) => {
  const fixture = createWorkspace("Idle_Performance_Project");
  const runtime = await startAgentHarnessHttpRuntime({
    host: "127.0.0.1",
    port: 0,
    userDataRoot: fixture.userDataRoot,
    allowUnauthenticatedLocal: true,
    registry: createRegistry(fixture),
  });
  try {
    await new Promise((resolve) => setTimeout(resolve, 250));
    const wallStartedAt = process.hrtime.bigint();
    const cpuStartedAt = process.cpuUsage();
    await new Promise((resolve) => setTimeout(resolve, 60_000));
    const wallDurationMs = Number(process.hrtime.bigint() - wallStartedAt) / 1_000_000;
    const cpu = process.cpuUsage(cpuStartedAt);
    const cpuMilliseconds = (cpu.user + cpu.system) / 1_000;
    const oneProcessorCpuPercent = (cpuMilliseconds / wallDurationMs) * 100;
    const diagnostics = runtime.operationalDiagnostics();
    assert.ok(oneProcessorCpuPercent <= 5, `idle CPU was ${oneProcessorCpuPercent.toFixed(3)} percent`);
    assert.ok(diagnostics.eventLoopLagMs.p95 <= 50, `event-loop lag p95 was ${diagnostics.eventLoopLagMs.p95} ms`);
    t.diagnostic(JSON.stringify({
      sampleDurationMs: Math.round(wallDurationMs),
      oneProcessorCpuPercent: Math.round(oneProcessorCpuPercent * 1_000) / 1_000,
      eventLoopLagP95Ms: diagnostics.eventLoopLagMs.p95,
      eventLoopLagMaximumMs: diagnostics.eventLoopLagMs.maximum,
      retainedSessions: diagnostics.sessions.retainedSessionCount,
    }));
  } finally {
    await runtime.close();
  }
});

function createWorkspace(name) {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-operational-diagnostics-"));
  const root = path.join(container, name);
  const userDataRoot = path.join(container, "user-data");
  fs.mkdirSync(root, { recursive: true });
  fs.mkdirSync(userDataRoot, { recursive: true });
  fs.writeFileSync(path.join(root, "README.md"), "# Diagnostic fixture\n", "utf8");
  return { root, userDataRoot };
}

function createRegistry(fixture, runtimeDiagnostics) {
  const workspaceAccess = createRegisteredWorkspaceAccessProvider({
    resolveWorkspaceContext: (workspaceId) => {
      const context = resolveWorkspaceRootContext(fixture.root, { gitMutationAuthorized: false });
      if (workspaceId !== context.workspaceId) {
        throw new AgentHarnessError("WORKSPACE_ACCESS_DENIED", "Tool call workspaceId is not registered.");
      }
      return context;
    },
    listWorkspaceSummaries: () => [],
    isGitMutationAuthorized: () => false,
  });
  return createAgentHarnessToolRegistry({
    workspaceAccess,
    userDataRoot: fixture.userDataRoot,
    ...(runtimeDiagnostics ? { runtimeDiagnostics } : {}),
  });
}

async function initializeSession(url, id) {
  const response = await fetch(url, {
    method: "POST",
    headers: mcpHeaders(),
    body: JSON.stringify({
      jsonrpc: "2.0",
      id,
      method: "initialize",
      params: {
        protocolVersion: "2025-11-25",
        capabilities: {},
        clientInfo: { name: "operational-diagnostics-test", version: "1.0.0" },
      },
    }),
  });
  await response.text();
  assert.equal(response.status, 200);
  return response.headers.get("mcp-session-id");
}

async function postSessionRequest(url, sessionId, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { ...mcpHeaders(), "mcp-session-id": sessionId },
    body: JSON.stringify(body),
  });
  const responseBody = await response.text();
  return { status: response.status, body: responseBody };
}

function callToolRequest(id, workspaceId, action, params, name = "repo_toolbox") {
  return {
    jsonrpc: "2.0",
    id,
    method: "tools/call",
    params: { name, arguments: { workspaceId, action, params } },
  };
}

function mcpHeaders() {
  return { "content-type": "application/json", accept: "application/json, text/event-stream" };
}

function deferred() {
  let resolve;
  const promise = new Promise((resolvePromise) => { resolve = resolvePromise; });
  return { promise, resolve };
}

function percentile(sorted, requestedPercentile) {
  return sorted[Math.max(0, Math.ceil((requestedPercentile / 100) * sorted.length) - 1)] ?? 0;
}

async function getJson(url) {
  const response = await fetch(url);
  return { status: response.status, body: await response.json() };
}

function emptySessions() {
  return {
    retainedSessionCount: 0,
    busySessionCount: 0,
    idleSessionCount: 0,
    streamingSessionCount: 0,
    inFlightSessionCount: 0,
    currentInFlightRequestCount: 0,
    liveStreamCount: 0,
    totalCreated: 0,
    totalDisposed: {
      cleanClose: 0,
      idleTtl: 0,
      capEviction: 0,
      runtimeClose: 0,
      resumeReset: 0,
      initializationFailure: 0,
    },
    rejectedInitializationCount: 0,
    reaperTimerCount: 1,
    reaperRunCount: 0,
    lastSuccessfulReaperAt: null,
    limits: { globalCap: 32, perPrincipalCap: 8, idleTtlMs: 300_000 },
  };
}

function emptyContract() {
  return {
    state: "none",
    runtimeGeneration: "11111111-1111-4111-8111-111111111111",
    capturedScopeCount: 1,
    contractCaptureCount: 1,
    explicitGenerationChangeCount: 0,
    lastControlledPublicationAt: new Date(0).toISOString(),
    periodicContractTimerCount: 0,
    activeSessionCount: 0,
    staleSessionCount: 0,
    contracts: [],
    sessionLifecycle: emptySessions(),
  };
}
