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

test("abrupt MCP clients remain globally bounded and one runtime reaper expires retained session state", { timeout: 120_000 }, async () => {
  const fixture = createWorkspace("Abrupt_Client_Project");
  let now = 1_000;
  const runtime = await createRuntime(fixture, {
    sessionLifecyclePolicy: {
      idleTtlMs: 10,
      reaperCadenceMs: 5,
      globalCap: 32,
      perPrincipalCap: 32,
    },
    sessionLifecycleClock: () => now,
  });
  const checkpoints = new Map([[0, runtime.sessionDiagnostics().retainedSessionCount]]);
  try {
    for (let attempt = 1; attempt <= 1_000; attempt += 1) {
      const initialized = await initializeSession(runtime.url);
      assert.equal(initialized.status, 200, `initialize attempt ${attempt}`);
      assert.ok(initialized.sessionId, `initialize attempt ${attempt}`);
      if ([32, 100, 500, 1_000].includes(attempt)) {
        checkpoints.set(attempt, runtime.sessionDiagnostics().retainedSessionCount);
      }
    }

    assert.deepEqual(Object.fromEntries(checkpoints), {
      0: 0,
      32: 32,
      100: 32,
      500: 32,
      1000: 32,
    });
    const bounded = runtime.sessionDiagnostics();
    assert.equal(bounded.totalCreated, 1_000);
    assert.equal(bounded.totalDisposed.capEviction, 968);
    assert.equal(bounded.reaperTimerCount, 1);
    assert.equal(bounded.limits.globalCap, 32);
    assert.equal(bounded.limits.perPrincipalCap, 32);

    now += 11;
    await waitFor(() => runtime.sessionDiagnostics().retainedSessionCount === 0);
    const expired = runtime.sessionDiagnostics();
    assert.equal(expired.totalDisposed.idleTtl, 32);
    assert.equal(expired.idleSessionCount, 0);
  } finally {
    await runtime.close();
  }
  assert.equal(runtime.sessionDiagnostics().reaperTimerCount, 0);
});

test("default per-principal cap evicts only that principal's idle LRU session", { timeout: 30_000 }, async () => {
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
    sessionLifecyclePolicy: { globalCap: 9 },
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
    abort.abort();
    await stream.body.cancel().catch(() => undefined);
    await waitFor(() => runtime.sessionDiagnostics().liveStreamCount === 0);
    assert.equal(runtime.sessionDiagnostics().retainedSessionCount, 1);

    now += 11;
    assert.equal(await runtime.reapIdleSessions(), 1);
    assert.equal(runtime.sessionDiagnostics().retainedSessionCount, 0);
    assert.equal(runtime.sessionDiagnostics().totalDisposed.idleTtl, 1);
  } finally {
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

async function createRuntime(fixture, overrides = {}) {
  return startAgentHarnessHttpRuntime({
    host: "127.0.0.1",
    port: 0,
    userDataRoot: fixture.userDataRoot,
    registry: overrides.registry ?? createRegistry(fixture),
    allowUnauthenticatedLocal: overrides.allowUnauthenticatedLocal ?? true,
    sessionLifecyclePolicy: overrides.sessionLifecyclePolicy,
    sessionLifecycleClock: overrides.sessionLifecycleClock,
  });
}

function createRegistry(fixture) {
  const workspaceAccess = createRegisteredWorkspaceAccessProvider({
    resolveWorkspaceContext: (workspaceId) => {
      const context = resolveWorkspaceRootContext(fixture.root, { gitMutationAuthorized: false });
      if (workspaceId !== context.workspaceId) {
        throw new AgentHarnessError("WORKSPACE_ACCESS_DENIED", "Tool call workspaceId is not registered.");
      }
      return context;
    },
    listWorkspaceSummaries: () => {
      const context = resolveWorkspaceRootContext(fixture.root);
      return [{
        workspaceId: context.workspaceId,
        repositoryName: context.repositoryName,
        gitBacked: context.gitBacked,
        availability: "available",
        validationError: null,
      }];
    },
    isGitMutationAuthorized: () => false,
  });
  return createAgentHarnessToolRegistry({ workspaceAccess, userDataRoot: fixture.userDataRoot });
}

function createWorkspace(name) {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-mcp-session-lifecycle-"));
  const root = path.join(container, name);
  const userDataRoot = path.join(container, "user-data");
  fs.mkdirSync(path.join(root, "planning"), { recursive: true });
  fs.mkdirSync(userDataRoot, { recursive: true });
  fs.writeFileSync(path.join(root, "README.md"), "# Fixture\n\nLifecycle test content.\n", "utf8");
  return { root, userDataRoot };
}

async function initializeSession(url, token) {
  const response = await fetch(url, {
    method: "POST",
    headers: mcpHeaders(token),
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-11-25",
        capabilities: {},
        clientInfo: { name: "bounded-lifecycle-test", version: "0.1.0" },
      },
    }),
  });
  await response.text();
  return {
    status: response.status,
    sessionId: response.headers.get("mcp-session-id"),
    retryAfter: response.headers.get("retry-after"),
  };
}

async function postSessionRequest(url, sessionId, token, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { ...mcpHeaders(token), "mcp-session-id": sessionId },
    body: JSON.stringify(body),
  });
  const responseBody = await response.text();
  return { status: response.status, body: responseBody };
}

async function deleteSession(url, sessionId, token) {
  const response = await fetch(url, {
    method: "DELETE",
    headers: { ...mcpHeaders(token), "mcp-session-id": sessionId },
  });
  await response.text();
  return { status: response.status };
}

function mcpHeaders(token) {
  return {
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
}

function listToolsRequest(id) {
  return { jsonrpc: "2.0", id, method: "tools/list", params: {} };
}

function callToolRequest(id, workspaceId, action, params) {
  return {
    jsonrpc: "2.0",
    id,
    method: "tools/call",
    params: {
      name: "repo_toolbox",
      arguments: { workspaceId, action, params },
    },
  };
}

async function issueOAuthToken(base, scope) {
  const verifier = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUV";
  const registered = await postJson(`${base}/oauth/register`, {
    redirect_uris: ["http://127.0.0.1/callback"],
    scope,
  });
  const authorizeUrl = new URL(`${base}/oauth/authorize`);
  authorizeUrl.searchParams.set("client_id", registered.client_id);
  authorizeUrl.searchParams.set("redirect_uri", "http://127.0.0.1/callback");
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("scope", scope);
  authorizeUrl.searchParams.set("code_challenge", pkceChallenge(verifier));
  authorizeUrl.searchParams.set("code_challenge_method", "S256");
  const authorization = await fetch(authorizeUrl, { redirect: "manual" });
  assert.equal(authorization.status, 302);
  const code = new URL(authorization.headers.get("location")).searchParams.get("code");
  const tokenResponse = await fetch(`${base}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: registered.client_id,
      redirect_uri: "http://127.0.0.1/callback",
      code,
      code_verifier: verifier,
    }).toString(),
  });
  return tokenResponse.json();
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  assert.ok(response.ok);
  return response.json();
}

function deferred() {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

async function waitFor(predicate) {
  const deadline = Date.now() + 2_000;
  while (!predicate()) {
    if (Date.now() >= deadline) {
      assert.fail("Timed out waiting for MCP lifecycle condition.");
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}
