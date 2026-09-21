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
const { DeterministicReliabilitySoakHarness } = require("../agent-harness/support/reliabilitySoakHarness.cjs");
const {createWorkspace,createRegistry,initializeSession,postSessionRequest,callToolRequest,mcpHeaders,deferred,percentile,getJson,emptySessions,emptyContract}=require("../support/mcp-diagnostics-fixture.cjs");


test("two-batch abrupt reconnect soak plateaus at the cap without linear RSS growth", { timeout: 120_000 }, async (t) => {
  const fixture = createWorkspace("Reconnect_Soak_Project");
  await require("../support/mcp-diagnostics-fixture.cjs").warmOperationalRuntime(fixture);
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
