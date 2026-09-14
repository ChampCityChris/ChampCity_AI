const assert = require("node:assert/strict");
const test = require("node:test");
const path = require("node:path");
const fs = require("node:fs");

const {
  AgentHarnessServiceLifecycleCoordinator,
  defaultAgentHarnessServiceLifecyclePolicy,
} = require("../../dist/main/agentHarness/runtime/agentHarnessServiceLifecycle.js");

function heartbeat(epoch, overrides = {}) {
  return {
    workerProcessId: 2002,
    runtimeReady: true,
    workspaceRegistryReady: true,
    registeredWorkspaceCount: 3,
    powerEpoch: epoch,
    observedAt: new Date(0).toISOString(),
    ...overrides,
  };
}

function controller(overrides = {}) {
  const calls = {
    start: 0,
    restart: 0,
    suspend: [],
    resume: [],
    heartbeat: 0,
    replace: [],
    controlledRestart: 0,
  };
  return {
    calls,
    start: async () => {
      calls.start += 1;
      return runtimeStatus("running");
    },
    restart: async () => {
      calls.restart += 1;
      return runtimeStatus("running");
    },
    workerProcessId: () => 2002,
    heartbeat: async () => {
      calls.heartbeat += 1;
      return heartbeat(0);
    },
    prepareSuspend: async (epoch) => { calls.suspend.push(epoch); },
    reconcileAfterResume: async (epoch) => {
      calls.resume.push(epoch);
      return heartbeat(epoch);
    },
    replaceWorker: async (reason) => {
      calls.replace.push(reason);
      return heartbeat(calls.resume.at(-1) ?? 0);
    },
    prepareControlledRestart: async () => {
      calls.controlledRestart += 1;
      return {
        outcome: "drained",
        activeRequestsAtStart: 2,
        activeRequestsAtEnd: 0,
        requestedAt: new Date(0).toISOString(),
        completedAt: new Date(1).toISOString(),
      };
    },
    ...overrides,
  };
}

function runtimeStatus(state, lastError = null) {
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
    lastError,
    recentActivity: [],
  };
}

function coordinator(fakeController, overrides = {}) {
  let now = 0;
  const instance = new AgentHarnessServiceLifecycleCoordinator({
    controller: fakeController,
    now: () => now,
    delay: async (milliseconds) => { now += milliseconds; },
    policy: {
      heartbeatIntervalMs: 5,
      heartbeatDeadlineMs: 10,
      resumeReadinessTargetMs: 10_000,
      resumeGraceMs: 0,
      recoveryBackoffMs: [1, 2, 4],
      controlledRestartDrainMs: 10,
      ...overrides,
    },
  });
  instance.markReady();
  return instance;
}

test("default lifecycle supervision values are bounded and production-safe", () => {
  assert.equal(defaultAgentHarnessServiceLifecyclePolicy.heartbeatIntervalMs, 30_000);
  assert.equal(defaultAgentHarnessServiceLifecyclePolicy.heartbeatDeadlineMs, 2_000);
  assert.equal(defaultAgentHarnessServiceLifecyclePolicy.heartbeatMissThreshold, 3);
  assert.equal(defaultAgentHarnessServiceLifecyclePolicy.resumeReadinessTargetMs, 10_000);
  assert.deepEqual(defaultAgentHarnessServiceLifecyclePolicy.recoveryBackoffMs, [250, 1_000, 3_000]);
  assert.equal(defaultAgentHarnessServiceLifecyclePolicy.recoveryAttemptLimit, 3);
});

test("production power-event handling and restart ownership belong only to the detached Service Host", () => {
  const root = path.resolve(__dirname, "../..");
  const host = fs.readFileSync(path.join(root, "src/main/agentHarness/runtime/agentHarnessServiceHost.ts"), "utf8");
  const controllerSource = fs.readFileSync(path.join(root, "src/main/agentHarness/runtime/agentHarnessController.ts"), "utf8");
  const worker = fs.readFileSync(path.join(root, "src/main/agentHarness/runtime/agentHarnessWorker.ts"), "utf8");
  const desktop = fs.readFileSync(path.join(root, "src/main/main.ts"), "utf8");
  assert.match(host, /powerMonitor\.on\("suspend", onSuspend\)/);
  assert.match(host, /powerMonitor\.on\("resume", onResume\)/);
  assert.match(host, /AgentHarnessServiceLifecycleCoordinator/);
  assert.doesNotMatch(controllerSource, /powerMonitor/);
  assert.doesNotMatch(worker, /powerMonitor/);
  assert.doesNotMatch(desktop, /powerMonitor/);
  assert.match(controllerSource, /fencedWorkerAwaitingExit/);
  assert.match(controllerSource, /replaceWorkerExclusive/);
});

test("duplicate resume signals coalesce into one epoch reconciliation", async () => {
  const fake = controller();
  let releaseResume;
  fake.reconcileAfterResume = (epoch) => {
    fake.calls.resume.push(epoch);
    return new Promise((resolve) => { releaseResume = () => resolve(heartbeat(epoch)); });
  };
  const lifecycle = coordinator(fake);
  await lifecycle.handleSuspend();
  const first = lifecycle.handleResume();
  const second = lifecycle.handleResume();
  assert.equal(first, second);
  releaseResume();
  const [left, right] = await Promise.all([first, second]);
  assert.equal(left.state, "ready");
  assert.deepEqual(right, left);
  assert.equal(left.powerEpoch, 1);
  assert.deepEqual(fake.calls.resume, [1]);
  assert.deepEqual(fake.calls.suspend, [0]);
});

test("twenty-five suspend and resume cycles preserve one worker and registry without replacement", async () => {
  const fake = controller();
  const lifecycle = coordinator(fake);
  for (let cycle = 1; cycle <= 25; cycle += 1) {
    assert.equal((await lifecycle.handleSuspend()).state, "suspended");
    const resumed = await lifecycle.handleResume();
    assert.equal(resumed.state, "ready");
    assert.equal(resumed.powerEpoch, cycle);
  }
  assert.equal(fake.calls.resume.length, 25);
  assert.equal(fake.calls.suspend.length, 25);
  assert.equal(fake.calls.replace.length, 0);
  assert.equal(fake.workerProcessId(), 2002);
  const diagnostics = lifecycle.snapshot();
  assert.ok(diagnostics.lastSuspendAt);
  assert.ok(diagnostics.lastResumeAt);
  assert.ok(diagnostics.lastRecoveryStartedAt);
  assert.ok(diagnostics.lastReadyAt);
});

test("heartbeat miss threshold fences and replaces a worker exactly once", async () => {
  const fake = controller();
  fake.heartbeat = async () => {
    fake.calls.heartbeat += 1;
    throw new Error("bounded heartbeat timeout");
  };
  const lifecycle = coordinator(fake);
  assert.equal((await lifecycle.superviseNow()).consecutiveHeartbeatMisses, 1);
  assert.equal((await lifecycle.superviseNow()).consecutiveHeartbeatMisses, 2);
  const recovered = await lifecycle.superviseNow();
  assert.equal(recovered.state, "ready");
  assert.equal(recovered.consecutiveHeartbeatMisses, 0);
  assert.deepEqual(fake.calls.replace, ["heartbeat-miss-threshold"]);
});

test("repeated replacement failure opens a bounded recovery circuit", async () => {
  const fake = controller();
  fake.heartbeat = async () => { throw new Error("worker hung"); };
  fake.replaceWorker = async (reason) => {
    fake.calls.replace.push(reason);
    throw new Error("replacement unavailable");
  };
  const lifecycle = coordinator(fake, { heartbeatMissThreshold: 1 });
  const degraded = await lifecycle.superviseNow();
  assert.equal(degraded.state, "degraded");
  assert.equal(degraded.reason, "worker-recovery-exhausted");
  assert.equal(degraded.workerRecoveryState, "circuit-open");
  assert.equal(fake.calls.replace.length, 3);
});

test("controlled restart reports active-request disposition before host shutdown", async () => {
  const fake = controller();
  const lifecycle = coordinator(fake);
  const disposition = await lifecycle.prepareControlledRestart();
  assert.equal(disposition.outcome, "drained");
  assert.equal(disposition.activeRequestsAtStart, 2);
  assert.equal(disposition.activeRequestsAtEnd, 0);
  assert.equal(lifecycle.snapshot().state, "stopping");
  assert.equal(fake.calls.controlledRestart, 1);
});

test("unready resume replaces one worker and publishes only current-epoch readiness", async () => {
  const fake = controller();
  fake.reconcileAfterResume = async (epoch) => {
    fake.calls.resume.push(epoch);
    return heartbeat(epoch, { runtimeReady: false });
  };
  const lifecycle = coordinator(fake);
  await lifecycle.handleSuspend();
  const recovered = await lifecycle.handleResume();
  assert.equal(recovered.state, "ready");
  assert.equal(recovered.powerEpoch, 1);
  assert.deepEqual(fake.calls.replace, ["resume-readiness-failed"]);
});

test("explicit Start and Restart fail closed throughout suspend and resume recovery states", async () => {
  const fake = controller();
  let releaseSuspend;
  fake.prepareSuspend = (epoch) => {
    fake.calls.suspend.push(epoch);
    return new Promise((resolve) => { releaseSuspend = resolve; });
  };
  const lifecycle = coordinator(fake);
  const suspending = lifecycle.handleSuspend();
  assert.equal(lifecycle.snapshot().state, "suspending");
  await assert.rejects(() => lifecycle.start(), { code: "SERVICE_HOST_RECOVERY_IN_PROGRESS" });
  await assert.rejects(() => lifecycle.restart(), { code: "SERVICE_HOST_RECOVERY_IN_PROGRESS" });
  releaseSuspend();
  await suspending;
  assert.equal(lifecycle.snapshot().state, "suspended");
  await assert.rejects(() => lifecycle.start(), { code: "SERVICE_HOST_RECOVERY_IN_PROGRESS" });
  await assert.rejects(() => lifecycle.restart(), { code: "SERVICE_HOST_RECOVERY_IN_PROGRESS" });

  let releaseResume;
  let releaseRecovery;
  fake.reconcileAfterResume = (epoch) => {
    fake.calls.resume.push(epoch);
    return new Promise((resolve) => {
      releaseResume = () => resolve(heartbeat(epoch, { runtimeReady: false }));
    });
  };
  fake.replaceWorker = (reason) => {
    fake.calls.replace.push(reason);
    return new Promise((resolve) => { releaseRecovery = () => resolve(heartbeat(1)); });
  };
  const resuming = lifecycle.handleResume();
  assert.equal(lifecycle.snapshot().state, "resuming");
  await assert.rejects(() => lifecycle.start(), { code: "SERVICE_HOST_RECOVERY_IN_PROGRESS" });
  await assert.rejects(() => lifecycle.restart(), { code: "SERVICE_HOST_RECOVERY_IN_PROGRESS" });
  releaseResume();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(lifecycle.snapshot().state, "recovering");
  await assert.rejects(() => lifecycle.start(), { code: "SERVICE_HOST_RECOVERY_IN_PROGRESS" });
  await assert.rejects(() => lifecycle.restart(), { code: "SERVICE_HOST_RECOVERY_IN_PROGRESS" });
  releaseRecovery();
  await resuming;
  assert.equal(fake.calls.start, 0);
  assert.equal(fake.calls.restart, 0);
  assert.equal(lifecycle.snapshot().powerEpoch, 1);
});

test("in-flight explicit recovery cannot overwrite a newer suspend or resume reconciliation", async () => {
  const fake = controller();
  let releaseStart;
  fake.start = () => {
    fake.calls.start += 1;
    return new Promise((resolve) => { releaseStart = () => resolve(runtimeStatus("running")); });
  };
  const lifecycle = coordinator(fake);
  const start = lifecycle.start();
  assert.equal(lifecycle.snapshot().state, "recovering");
  lifecycle.observeControllerRecovery("idle", null);
  assert.equal(lifecycle.snapshot().state, "recovering");
  const suspended = await lifecycle.handleSuspend();
  assert.equal(suspended.state, "suspended");
  releaseStart();
  await start;
  assert.equal(lifecycle.snapshot().state, "suspended");
  assert.equal(lifecycle.snapshot().powerEpoch, 0);
  const resumed = await lifecycle.handleResume();
  assert.equal(resumed.state, "ready");
  assert.equal(resumed.reason, "resume-reset");
  assert.equal(resumed.powerEpoch, 1);
});

test("stable degraded lifecycle permits bounded explicit recovery and reports failed recovery truthfully", async () => {
  const fake = controller();
  const lifecycle = coordinator(fake);
  lifecycle.markDegraded("worker-recovery-exhausted", "circuit open");
  const recovered = await lifecycle.restart();
  assert.equal(recovered.state, "running");
  assert.equal(lifecycle.snapshot().state, "ready");
  assert.equal(fake.calls.restart, 1);

  lifecycle.markDegraded("worker-recovery-exhausted", "circuit open again");
  fake.start = async () => {
    fake.calls.start += 1;
    return runtimeStatus("failed", "replacement unavailable");
  };
  const failed = await lifecycle.start();
  assert.equal(failed.state, "failed");
  assert.equal(lifecycle.snapshot().state, "degraded");
  assert.equal(lifecycle.snapshot().reason, "worker-recovery-exhausted");
  assert.equal(lifecycle.snapshot().workerRecoveryState, "idle");
});

test("desktop projection reports restart-required for a different running build generation", () => {
  const { AgentHarnessServiceHostClient } = require(path.resolve(
    __dirname,
    "../../dist/main/agentHarness/runtime/agentHarnessServiceHostClient.js",
  ));
  const expectedBuildIdentity = `sha256:${"a".repeat(64)}`;
  const runningBuildIdentity = `sha256:${"b".repeat(64)}`;
  const client = new AgentHarnessServiceHostClient({
    userDataRoot: "bounded-test-root",
    launchServiceHost: () => undefined,
    expectedBuildIdentity,
  });
  client.acceptLifecycleIdentity({
    descriptorSchemaVersion: 1,
    controlProtocolVersion: 1,
    serviceHostProcessId: 1001,
    workerProcessId: 1002,
    instanceId: "11111111-1111-4111-8111-111111111111",
    runtimeBuildIdentity: runningBuildIdentity,
    lifecycleState: "ready",
    lifecycleReason: "startup",
    lifecycleStateChangedAt: new Date(0).toISOString(),
    powerEpoch: 0,
    consecutiveHeartbeatMisses: 0,
    workerRecoveryState: "idle",
    workerRecoveryError: null,
    lastControlledRestart: null,
  });
  const status = client.lifecycleStatusProjection();
  assert.equal(status.state, "restart-required");
  assert.equal(status.reason, "build-generation-mismatch");
  assert.equal(status.restartRequired, true);
  assert.equal(status.runtimeBuildIdentity, runningBuildIdentity);
  assert.equal(status.expectedBuildIdentity, expectedBuildIdentity);
});
