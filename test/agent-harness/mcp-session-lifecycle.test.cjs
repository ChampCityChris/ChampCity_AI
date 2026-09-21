const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  startAgentHarnessHttpRuntime,
} = require("../../dist/main/agentHarness/runtime/httpRuntime.js");
const {
  AgentHarnessService,
} = require("../../dist/main/agentHarness/runtime/agentHarnessService.js");
const {
  pkceChallenge,
} = require("../../dist/main/agentHarness/runtime/oauthStore.js");
const {
  createAgentHarnessToolRegistry,
} = require("../../dist/main/agentHarness/tools/toolRegistry.js");
const {
  createRegisteredWorkspaceAccessProvider,
  resolveWorkspaceRootContext,
} = require("../../dist/main/agentHarness/workspace/workspaceAccess.js");
const { AgentHarnessError } = require("../../dist/main/agentHarness/core/errors.js");
const {createRuntime,createRegistry,createWorkspace,initializeSession,postSessionRequest,deleteSession,openSessionStream,closeSessionStreams,pickSessionDiagnostics,mcpHeaders,listToolsRequest,callToolRequest,issueOAuthToken,postJson,deferred,waitFor}=require("../support/mcp-session-fixture.cjs");


test("default diagnostics align the per-principal and global session caps", { timeout: 30_000 }, async () => {
  const fixture = createWorkspace("Default_Policy_Project");
  const runtime = await createRuntime(fixture);
  try {
    assert.deepEqual(runtime.sessionDiagnostics().limits, {
      globalCap: 32,
      perPrincipalCap: 32,
      idleTtlMs: 5 * 60 * 1_000,
    });
  } finally {
    await runtime.close();
  }
});

test("an explicit lower per-principal cap evicts only that principal's idle LRU session", { timeout: 30_000 }, async () => {
  const fixture = createWorkspace("Principal_Boundary_Project");
  const gate = deferred();
  const entered = deferred();
  const baseRegistry = createRegistry(fixture);
  let delayNextRead = true;
  const runtime = await createRuntime(fixture, {
    allowUnauthenticatedLocal: false,
    registry: {
      listTools: (scope) => baseRegistry.listTools(scope),
      callTool: async (call) => {
        if (delayNextRead && call.name === "repo_toolbox" && call.arguments.action === "read_file") {
          delayNextRead = false;
          entered.resolve();
          await gate.promise;
        }
        return baseRegistry.callTool(call);
      },
    },
    sessionLifecyclePolicy: { globalCap: 9, perPrincipalCap: 8 },
  });
  let protectedRequest;
  try {
    const base = new URL(runtime.url).origin;
    const principalA = await issueOAuthToken(base, "files.read files.write");
    const principalB = await issueOAuthToken(base, "files.read files.write");
    const protectedSession = await initializeSession(runtime.url, principalB.access_token);
    assert.equal(protectedSession.status, 200);
    protectedRequest = postSessionRequest(
      runtime.url,
      protectedSession.sessionId,
      principalB.access_token,
      callToolRequest(200, "principal_boundary_project", "read_file", { relativePath: "README.md" }),
    );
    await entered.promise;

    for (let attempt = 0; attempt < 9; attempt += 1) {
      const initialized = await initializeSession(runtime.url, principalA.access_token);
      assert.equal(initialized.status, 200);
    }

    const diagnostics = runtime.sessionDiagnostics();
    assert.equal(diagnostics.limits.perPrincipalCap, 8);
    assert.equal(diagnostics.retainedSessionCount, 9);
    assert.equal(diagnostics.totalDisposed.capEviction, 1);
    assert.equal(diagnostics.busySessionCount, 1);
    gate.resolve();
    assert.equal((await protectedRequest).status, 200);
    const stillAddressable = await postSessionRequest(
      runtime.url,
      protectedSession.sessionId,
      principalB.access_token,
      listToolsRequest(201),
    );
    assert.equal(stillAddressable.status, 200);
  } finally {
    gate.resolve();
    await protectedRequest;
    await runtime.close();
  }
});

test("idle pressure and expiration never reap an in-flight production tool request", { timeout: 30_000 }, async () => {
  const fixture = createWorkspace("Active_Request_Project");
  let now = 10_000;
  const gate = deferred();
  const entered = deferred();
  const baseRegistry = createRegistry(fixture);
  let delayNextRead = true;
  const registry = {
    listTools: (scope) => baseRegistry.listTools(scope),
    callTool: async (call) => {
      if (delayNextRead && call.name === "repo_toolbox" && call.arguments.action === "read_file") {
        delayNextRead = false;
        entered.resolve();
        await gate.promise;
      }
      return baseRegistry.callTool(call);
    },
  };
  const runtime = await createRuntime(fixture, {
    registry,
    sessionLifecyclePolicy: {
      idleTtlMs: 10,
      reaperCadenceMs: 60_000,
      globalCap: 2,
      perPrincipalCap: 2,
    },
    sessionLifecycleClock: () => now,
  });
  try {
    const active = await initializeSession(runtime.url);
    const abandoned = await initializeSession(runtime.url);
    assert.ok(active.sessionId);
    assert.ok(abandoned.sessionId);

    const pendingTool = postSessionRequest(
      runtime.url,
      active.sessionId,
      undefined,
      callToolRequest(301, "active_request_project", "read_file", { relativePath: "README.md" }),
    );
    await entered.promise;
    const duringRequest = runtime.sessionDiagnostics();
    assert.equal(duringRequest.busySessionCount, 1);
    assert.equal(duringRequest.inFlightSessionCount, 1);
    assert.equal(duringRequest.currentInFlightRequestCount, 1);
    assert.equal(duringRequest.liveStreamCount, 1);

    now += 11;
    assert.equal(await runtime.reapIdleSessions(), 1);
    assert.equal(runtime.sessionDiagnostics().retainedSessionCount, 1);
    const replacement = await initializeSession(runtime.url);
    assert.equal(replacement.status, 200);
    now += 11;
    assert.equal(await runtime.reapIdleSessions(), 1);
    assert.equal(runtime.sessionDiagnostics().retainedSessionCount, 1);

    gate.resolve();
    const completed = await pendingTool;
    assert.equal(completed.status, 200);
    const remainsAddressable = await postSessionRequest(runtime.url, active.sessionId, undefined, listToolsRequest(302));
    assert.equal(remainsAddressable.status, 200);
  } finally {
    gate.resolve();
    await runtime.close();
  }
});

test("an abruptly closed SSE stream releases liveness but leaves TTL as logical session state", { timeout: 30_000 }, async () => {
  const fixture = createWorkspace("Abrupt_Stream_Project");
  let now = 20_000;
  const runtime = await createRuntime(fixture, {
    sessionLifecyclePolicy: {
      idleTtlMs: 10,
      reaperCadenceMs: 60_000,
      globalCap: 32,
      perPrincipalCap: 8,
    },
    sessionLifecycleClock: () => now,
  });
  try {
    const initialized = await initializeSession(runtime.url);
    const abort = new AbortController();
    const stream = await fetch(runtime.url, {
      method: "GET",
      headers: { ...mcpHeaders(), "mcp-session-id": initialized.sessionId },
      signal: abort.signal,
    });
    assert.equal(stream.status, 200);
    assert.equal(runtime.sessionDiagnostics().liveStreamCount, 1);

    now += 11;
    assert.equal(await runtime.reapIdleSessions(), 0);
    assert.equal(runtime.sessionDiagnostics().retainedSessionCount, 1);

    abort.abort();
    await stream.body.cancel().catch(() => undefined);
    await waitFor(() => runtime.sessionDiagnostics().liveStreamCount === 0);
    assert.equal(runtime.sessionDiagnostics().retainedSessionCount, 1);

    assert.equal(await runtime.reapIdleSessions(), 1);
    assert.equal(runtime.sessionDiagnostics().retainedSessionCount, 0);
    assert.equal(runtime.sessionDiagnostics().totalDisposed.idleTtl, 1);
  } finally {
    await runtime.close();
  }
});

test("open SSE sessions are reclaimed oldest-first under principal pressure", { timeout: 60_000 }, async () => {
  const fixture = createWorkspace("Stream_Pressure_Project");
  let now = 30_000;
  const runtime = await createRuntime(fixture, {
    sessionLifecyclePolicy: {
      idleTtlMs: 60_000,
      reaperCadenceMs: 60_000,
      globalCap: 8,
      perPrincipalCap: 8,
    },
    sessionLifecycleClock: () => now,
  });
  const sessions = [];
  const streams = [];
  try {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const initialized = await initializeSession(runtime.url);
      assert.equal(initialized.status, 200);
      sessions.push(initialized);
      streams.push(await openSessionStream(runtime.url, initialized.sessionId));
      now += 1;
    }

    assert.deepEqual(
      pickSessionDiagnostics(runtime.sessionDiagnostics()),
      { retained: 8, busy: 0, idle: 8, streaming: 8, inFlight: 0, work: 0, streams: 8 },
    );

    const replacement = await initializeSession(runtime.url);
    assert.equal(replacement.status, 200);
    assert.ok(replacement.sessionId);
    const afterReplacement = runtime.sessionDiagnostics();
    assert.equal(afterReplacement.retainedSessionCount, 8);
    assert.equal(afterReplacement.totalDisposed.capEviction, 1);
    assert.equal(afterReplacement.rejectedInitializationCount, 0);
    assert.equal(
      (await postSessionRequest(runtime.url, sessions[0].sessionId, undefined, listToolsRequest(601))).status,
      400,
    );
    assert.equal(
      (await postSessionRequest(runtime.url, sessions[1].sessionId, undefined, listToolsRequest(602))).status,
      200,
    );
  } finally {
    await closeSessionStreams(streams);
    await runtime.close();
  }
});

test("executing work survives pressure while a stream-only session is reclaimed", { timeout: 60_000 }, async () => {
  const fixture = createWorkspace("Protected_Work_Project");
  let now = 40_000;
  const gate = deferred();
  const entered = deferred();
  const baseRegistry = createRegistry(fixture);
  let delayNextRead = true;
  const runtime = await createRuntime(fixture, {
    registry: {
      listTools: (scope) => baseRegistry.listTools(scope),
      callTool: async (call) => {
        if (delayNextRead && call.name === "repo_toolbox" && call.arguments.action === "read_file") {
          delayNextRead = false;
          entered.resolve();
          await gate.promise;
        }
        return baseRegistry.callTool(call);
      },
    },
    sessionLifecyclePolicy: { globalCap: 8, perPrincipalCap: 8 },
    sessionLifecycleClock: () => now,
  });
  const streams = [];
  let pendingTool;
  try {
    const protectedSession = await initializeSession(runtime.url);
    pendingTool = postSessionRequest(
      runtime.url,
      protectedSession.sessionId,
      undefined,
      callToolRequest(701, "protected_work_project", "read_file", { relativePath: "README.md" }),
    );
    await entered.promise;

    const streamSessions = [];
    for (let attempt = 0; attempt < 7; attempt += 1) {
      now += 1;
      const initialized = await initializeSession(runtime.url);
      streamSessions.push(initialized);
      streams.push(await openSessionStream(runtime.url, initialized.sessionId));
    }

    assert.deepEqual(
      pickSessionDiagnostics(runtime.sessionDiagnostics()),
      { retained: 8, busy: 1, idle: 7, streaming: 8, inFlight: 1, work: 1, streams: 8 },
    );
    const replacement = await initializeSession(runtime.url);
    assert.equal(replacement.status, 200);
    assert.equal(runtime.sessionDiagnostics().totalDisposed.capEviction, 1);
    assert.equal(
      (await postSessionRequest(runtime.url, streamSessions[0].sessionId, undefined, listToolsRequest(702))).status,
      400,
    );

    gate.resolve();
    assert.equal((await pendingTool).status, 200);
    assert.equal(
      (await postSessionRequest(runtime.url, protectedSession.sessionId, undefined, listToolsRequest(703))).status,
      200,
    );
  } finally {
    gate.resolve();
    await pendingTool;
    await closeSessionStreams(streams);
    await runtime.close();
  }
});

test("true executing-work saturation rejects initialization with retry guidance", { timeout: 60_000 }, async () => {
  const fixture = createWorkspace("Saturated_Work_Project");
  const gate = deferred();
  const allEntered = deferred();
  const baseRegistry = createRegistry(fixture);
  let enteredCount = 0;
  const runtime = await createRuntime(fixture, {
    registry: {
      listTools: (scope) => baseRegistry.listTools(scope),
      callTool: async (call) => {
        if (call.name === "repo_toolbox" && call.arguments.action === "read_file") {
          enteredCount += 1;
          if (enteredCount === 8) {
            allEntered.resolve();
          }
          await gate.promise;
        }
        return baseRegistry.callTool(call);
      },
    },
    sessionLifecyclePolicy: { globalCap: 8, perPrincipalCap: 8 },
  });
  const pendingTools = [];
  try {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const initialized = await initializeSession(runtime.url);
      pendingTools.push(postSessionRequest(
        runtime.url,
        initialized.sessionId,
        undefined,
        callToolRequest(800 + attempt, "saturated_work_project", "read_file", { relativePath: "README.md" }),
      ));
    }
    await allEntered.promise;
    assert.equal(runtime.sessionDiagnostics().currentInFlightRequestCount, 8);

    const rejected = await initializeSession(runtime.url);
    assert.equal(rejected.status, 503);
    assert.equal(rejected.retryAfter, "1");
    assert.equal(runtime.sessionDiagnostics().rejectedInitializationCount, 1);
    assert.equal(runtime.sessionDiagnostics().totalDisposed.capEviction, 0);

    gate.resolve();
    assert.deepEqual((await Promise.all(pendingTools)).map((result) => result.status), Array(8).fill(200));
  } finally {
    gate.resolve();
    await Promise.allSettled(pendingTools);
    await runtime.close();
  }
});

test("ChatGPT-style stream churn remains bounded without admission rejection growth", { timeout: 120_000 }, async () => {
  const fixture = createWorkspace("Stream_Churn_Project");
  let now = 50_000;
  const runtime = await createRuntime(fixture, {
    sessionLifecyclePolicy: {
      idleTtlMs: 60_000,
      reaperCadenceMs: 60_000,
      globalCap: 8,
      perPrincipalCap: 8,
    },
    sessionLifecycleClock: () => now,
  });
  const streams = [];
  try {
    for (let attempt = 0; attempt < 24; attempt += 1) {
      const initialized = await initializeSession(runtime.url);
      assert.equal(initialized.status, 200, `initialize attempt ${attempt + 1}`);
      assert.equal(
        (await postSessionRequest(runtime.url, initialized.sessionId, undefined, listToolsRequest(900 + attempt))).status,
        200,
      );
      streams.push(await openSessionStream(runtime.url, initialized.sessionId));
      now += 1;
      assert.ok(runtime.sessionDiagnostics().retainedSessionCount <= 8);
    }

    const diagnostics = runtime.sessionDiagnostics();
    assert.equal(diagnostics.retainedSessionCount, 8);
    assert.equal(diagnostics.streamingSessionCount, 8);
    assert.equal(diagnostics.totalCreated, 24);
    assert.equal(diagnostics.totalDisposed.capEviction, 16);
    assert.equal(diagnostics.rejectedInitializationCount, 0);
  } finally {
    await closeSessionStreams(streams);
    await runtime.close();
  }
});

test("controlled restart drains executing work but not transport-only streams", { timeout: 60_000 }, async () => {
  const fixture = createWorkspace("Controlled_Restart_Project");
  const gate = deferred();
  const entered = deferred();
  const baseRegistry = createRegistry(fixture);
  let delayNextRead = true;
  const runtime = await createRuntime(fixture, {
    registry: {
      listTools: (scope) => baseRegistry.listTools(scope),
      callTool: async (call) => {
        if (delayNextRead && call.name === "repo_toolbox" && call.arguments.action === "read_file") {
          delayNextRead = false;
          entered.resolve();
          await gate.promise;
        }
        return baseRegistry.callTool(call);
      },
    },
  });
  const streams = [];
  let pendingTool;
  try {
    const streamingSession = await initializeSession(runtime.url);
    streams.push(await openSessionStream(runtime.url, streamingSession.sessionId));
    const workingSession = await initializeSession(runtime.url);
    pendingTool = postSessionRequest(
      runtime.url,
      workingSession.sessionId,
      undefined,
      callToolRequest(1_001, "controlled_restart_project", "read_file", { relativePath: "README.md" }),
    );
    await entered.promise;

    assert.equal(runtime.sessionDiagnostics().liveStreamCount, 2);
    assert.equal(runtime.sessionDiagnostics().currentInFlightRequestCount, 1);
    assert.deepEqual(await runtime.drainForControlledRestart(20), {
      outcome: "deadline-exceeded",
      activeRequestsAtStart: 1,
      activeRequestsAtEnd: 1,
    });

    gate.resolve();
    assert.equal((await pendingTool).status, 200);
    await waitFor(() => runtime.sessionDiagnostics().liveStreamCount === 1);
    assert.deepEqual(await runtime.drainForControlledRestart(100), {
      outcome: "drained",
      activeRequestsAtStart: 0,
      activeRequestsAtEnd: 0,
    });
    assert.equal(runtime.sessionDiagnostics().liveStreamCount, 1);
  } finally {
    gate.resolve();
    await pendingTool;
    await closeSessionStreams(streams);
    await runtime.close();
  }
});

test("capacity overload, initialization failure, clean close, and runtime close use bounded idempotent cleanup", { timeout: 30_000 }, async () => {
  const fixture = createWorkspace("Cleanup_Project");
  const gate = deferred();
  const entered = deferred();
  const baseRegistry = createRegistry(fixture);
  let delayNextRead = true;
  const runtime = await createRuntime(fixture, {
    registry: {
      listTools: (scope) => baseRegistry.listTools(scope),
      callTool: async (call) => {
        if (delayNextRead && call.name === "repo_toolbox" && call.arguments.action === "read_file") {
          delayNextRead = false;
          entered.resolve();
          await gate.promise;
        }
        return baseRegistry.callTool(call);
      },
    },
    sessionLifecyclePolicy: { globalCap: 1, perPrincipalCap: 1 },
  });
  const active = await initializeSession(runtime.url);
  const pendingTool = postSessionRequest(
    runtime.url,
    active.sessionId,
    undefined,
    callToolRequest(401, "cleanup_project", "read_file", { relativePath: "README.md" }),
  );
  await entered.promise;
  const overloaded = await initializeSession(runtime.url);
  assert.equal(overloaded.status, 503);
  assert.equal(overloaded.retryAfter, "1");
  assert.equal(runtime.sessionDiagnostics().rejectedInitializationCount, 1);
  gate.resolve();
  assert.equal((await pendingTool).status, 200);

  const closed = await deleteSession(runtime.url, active.sessionId);
  assert.equal(closed.status, 200);
  const alreadyClosed = await deleteSession(runtime.url, active.sessionId);
  assert.equal(alreadyClosed.status, 404);
  assert.equal(runtime.sessionDiagnostics().totalDisposed.cleanClose, 1);
  assert.equal(runtime.sessionDiagnostics().retainedSessionCount, 0);
  await runtime.close();
  await runtime.close();
  assert.equal(runtime.sessionDiagnostics().reaperTimerCount, 0);

  const failedScopeRegistry = createRegistry(fixture);
  const failedRuntime = await createRuntime(fixture, {
    allowUnauthenticatedLocal: false,
    registry: {
      listTools: (scope) => {
        if (scope === "files.read") {
          throw new Error("bounded initialization failure");
        }
        return failedScopeRegistry.listTools(scope);
      },
      callTool: (call) => failedScopeRegistry.callTool(call),
    },
  });
  try {
    const readToken = await issueOAuthToken(new URL(failedRuntime.url).origin, "files.read");
    const failed = await initializeSession(failedRuntime.url, readToken.access_token);
    assert.equal(failed.status, 500);
    assert.equal(failedRuntime.sessionDiagnostics().retainedSessionCount, 0);
    assert.equal(failedRuntime.sessionDiagnostics().totalDisposed.initializationFailure, 1);
  } finally {
    await failedRuntime.close();
  }

  const runtimeClose = await createRuntime(fixture);
  await initializeSession(runtimeClose.url);
  assert.equal(runtimeClose.sessionDiagnostics().retainedSessionCount, 1);
  await runtimeClose.close();
  const closedDiagnostics = runtimeClose.sessionDiagnostics();
  assert.equal(closedDiagnostics.retainedSessionCount, 0);
  assert.equal(closedDiagnostics.totalDisposed.runtimeClose, 1);
});

test("session diagnostics are aggregate-only and ordinary stateful read/write behavior remains compatible", { timeout: 30_000 }, async () => {
  const fixture = createWorkspace("Compatibility_Project");
  const runtime = await createRuntime(fixture);
  const client = await initializeSession(runtime.url);
  try {
    const listed = await postSessionRequest(runtime.url, client.sessionId, undefined, listToolsRequest(501));
    assert.equal(listed.status, 200);
    const read = await postSessionRequest(
      runtime.url,
      client.sessionId,
      undefined,
      callToolRequest(502, "compatibility_project", "read_file", { relativePath: "README.md" }),
    );
    assert.equal(read.status, 200);
    const write = await postSessionRequest(
      runtime.url,
      client.sessionId,
      undefined,
      callToolRequest(503, "compatibility_project", "write_markdown_artifact", {
        relativePath: "planning/session-lifecycle-proof.md",
        content: "# Session lifecycle proof\n",
      }),
    );
    assert.equal(write.status, 200);
    assert.equal(fs.existsSync(path.join(fixture.root, "planning", "session-lifecycle-proof.md")), true);

    const diagnostics = runtime.sessionDiagnostics();
    const serialized = JSON.stringify(diagnostics);
    assert.equal(diagnostics.retainedSessionCount, 1);
    assert.equal(serialized.includes(client.sessionId), false);
    assert.equal(serialized.includes(fixture.root), false);
    assert.equal(serialized.includes("authorization"), false);
    assert.deepEqual(Object.keys(diagnostics.totalDisposed).sort(), [
      "capEviction",
      "cleanClose",
      "idleTtl",
      "initializationFailure",
      "resumeReset",
      "runtimeClose",
    ]);
  } finally {
    assert.equal((await deleteSession(runtime.url, client.sessionId)).status, 200);
    await runtime.close();
  }
});

test("resume reconciliation disposes every pre-epoch session through canonical resumeReset", { timeout: 30_000 }, async () => {
  const fixture = createWorkspace("Resume_Reset_Project");
  const runtime = await createRuntime(fixture);
  try {
    const first = await initializeSession(runtime.url);
    const second = await initializeSession(runtime.url);
    assert.equal(runtime.sessionDiagnostics().retainedSessionCount, 2);
    runtime.suspendAdmission();
    const rejected = await initializeSession(runtime.url);
    assert.equal(rejected.status, 503);
    await runtime.resumeAfterPowerEpoch();
    const diagnostics = runtime.sessionDiagnostics();
    assert.equal(diagnostics.retainedSessionCount, 0);
    assert.equal(diagnostics.totalDisposed.resumeReset, 2);
    assert.equal((await postSessionRequest(runtime.url, first.sessionId, undefined, listToolsRequest(901))).status, 400);
    assert.equal((await postSessionRequest(runtime.url, second.sessionId, undefined, listToolsRequest(902))).status, 400);
    assert.equal((await initializeSession(runtime.url)).status, 200);
  } finally {
    await runtime.close();
  }
});

test("Agent Harness status retains bounded runtime-close diagnostics after service shutdown", { timeout: 30_000 }, async () => {
  const fixture = createWorkspace("Service_Status_Project");
  const service = new AgentHarnessService({
    userDataRoot: fixture.userDataRoot,
    port: 0,
    allowUnauthenticatedLocal: true,
  });
  await service.registerWorkspaceRoot(fixture.root);
  const started = await service.start();
  const initialized = await initializeSession(started.mcpEndpoint);
  assert.equal(initialized.status, 200);

  const stopped = await service.stop();
  assert.equal(stopped.state, "stopped");
  assert.equal(stopped.toolContractDiagnostics.published.sessionLifecycle.retainedSessionCount, 0);
  assert.equal(stopped.toolContractDiagnostics.published.sessionLifecycle.reaperTimerCount, 0);
  assert.equal(stopped.toolContractDiagnostics.published.sessionLifecycle.totalDisposed.runtimeClose, 1);
});
