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

async function openSessionStream(url, sessionId, token) {
  const abort = new AbortController();
  const response = await fetch(url, {
    method: "GET",
    headers: { ...mcpHeaders(token), "mcp-session-id": sessionId },
    signal: abort.signal,
  });
  assert.equal(response.status, 200);
  return { abort, response };
}

async function closeSessionStreams(streams) {
  for (const stream of streams) {
    stream.abort.abort();
    await stream.response.body?.cancel().catch(() => undefined);
  }
}

function pickSessionDiagnostics(diagnostics) {
  return {
    retained: diagnostics.retainedSessionCount,
    busy: diagnostics.busySessionCount,
    idle: diagnostics.idleSessionCount,
    streaming: diagnostics.streamingSessionCount,
    inFlight: diagnostics.inFlightSessionCount,
    work: diagnostics.currentInFlightRequestCount,
    streams: diagnostics.liveStreamCount,
  };
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
module.exports={createRuntime,createRegistry,createWorkspace,initializeSession,postSessionRequest,deleteSession,openSessionStream,closeSessionStreams,pickSessionDiagnostics,mcpHeaders,listToolsRequest,callToolRequest,issueOAuthToken,postJson,deferred,waitFor};
