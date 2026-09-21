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
module.exports={createWorkspace,createRegistry,initializeSession,postSessionRequest,callToolRequest,mcpHeaders,deferred,percentile,getJson,emptySessions,emptyContract};

// Qualification starts after a bounded HTTP/tool warm-up, independent of test order.
// A separate runtime keeps all measured session and disposal counts unchanged.
async function warmOperationalRuntime(fixture) {
  const runtime = await startAgentHarnessHttpRuntime({
    host: "127.0.0.1", port: 0, userDataRoot: fixture.userDataRoot,
    allowUnauthenticatedLocal: true, registry: createRegistry(fixture),
  });
  try {
    const session = await initializeSession(runtime.url, 1);
    const workspaceId = resolveWorkspaceRootContext(fixture.root).workspaceId;
    for (let index = 0; index < 100; index++) {
      assert.equal((await getJson(runtime.healthUrl)).body.status, "ok");
      assert.equal((await getJson(runtime.readinessUrl)).status, 200);
      assert.equal((await postSessionRequest(runtime.url, session, callToolRequest(2 + index * 2, workspaceId, "read_file", { relativePath: "README.md" }))).status, 200);
      assert.equal((await postSessionRequest(runtime.url, session, callToolRequest(3 + index * 2, workspaceId, "list_files", { directory: ".", maxFiles: 100 }))).status, 200);
    }
  } finally { await runtime.close(); }
}
module.exports.warmOperationalRuntime = warmOperationalRuntime;
