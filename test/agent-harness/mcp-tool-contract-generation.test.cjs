const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { performance } = require("node:perf_hooks");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const {
  startAgentHarnessHttpRuntime,
} = require(path.join(root, "dist/main/agentHarness/runtime/httpRuntime.js"));
const {
  pkceChallenge,
} = require(path.join(root, "dist/main/agentHarness/runtime/oauthStore.js"));
const {
  fingerprintAgentHarnessPublicToolDefinitions,
} = require(path.join(root, "dist/main/agentHarness/runtime/mcpServer.js"));
const {
  createAgentHarnessToolRegistry,
} = require(path.join(root, "dist/main/agentHarness/tools/toolRegistry.js"));
const {
  createRegisteredWorkspaceAccessProvider,
  resolveWorkspaceRootContext,
} = require(path.join(root, "dist/main/agentHarness/workspace/workspaceAccess.js"));
const { AgentHarnessError } = require(path.join(root, "dist/main/agentHarness/core/errors.js"));
const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const {
  StreamableHTTPClientTransport,
} = require("@modelcontextprotocol/sdk/client/streamableHttp.js");

test("production source contains no contract polling, per-request synchronization, or mutable-session publication path", () => {
  const httpRuntimeSource = fs.readFileSync(
    path.join(root, "src/main/agentHarness/runtime/httpRuntime.ts"),
    "utf8",
  );
  const mcpServerSource = fs.readFileSync(
    path.join(root, "src/main/agentHarness/runtime/mcpServer.ts"),
    "utf8",
  );
  const serviceSource = fs.readFileSync(
    path.join(root, "src/main/agentHarness/runtime/agentHarnessService.ts"),
    "utf8",
  );
  assert.doesNotMatch(httpRuntimeSource, /publicContractRefreshIntervalMs|contractRefreshTimer|synchronizePublished/);
  assert.equal((httpRuntimeSource.match(/setInterval\s*\(/g) ?? []).length, 1);
  assert.match(httpRuntimeSource, /const sessionReaperTimer = setInterval/);
  assert.doesNotMatch(mcpServerSource, /sendToolListChanged|synchronizePublishedContract/);
  const statusBody = serviceSource.slice(serviceSource.indexOf("  status(): AgentHarnessStatus"));
  assert.doesNotMatch(statusBody, /captureAgentHarnessPublicToolContract/);
});

test("one runtime contract generation remains constant across 32 sessions and one simulated idle hour", { timeout: 30_000 }, async (t) => {
  const fixture = createWorkspace("Contract_Generation_Project");
  let runtime;
  const baseRegistry = createRegistry(fixture, () => ({
    toolContractDiagnostics: runtime ? {
      registry: runtime.runtimeToolContract(),
      published: runtime.publishedToolContractDiagnostics(),
    } : undefined,
  }));
  let registryCaptureCount = 0;
  const registry = {
    listTools(scope) {
      registryCaptureCount += 1;
      return baseRegistry.listTools(scope);
    },
    callTool: (call) => baseRegistry.callTool(call),
  };
  let now = 10_000;
  runtime = await startAgentHarnessHttpRuntime({
    host: "127.0.0.1",
    port: 0,
    userDataRoot: fixture.userDataRoot,
    registry,
    allowUnauthenticatedLocal: true,
    sessionLifecyclePolicy: {
      idleTtlMs: 2 * 60 * 60 * 1_000,
      reaperCadenceMs: 24 * 60 * 60 * 1_000,
      globalCap: 32,
      perPrincipalCap: 32,
    },
    sessionLifecycleClock: () => now,
  });
  const capturesBySessionCount = {};
  const statusDurationsMs = {};
  const toolInventoryDurationsMs = {};
  let inventoryClient;
  try {
    captureStatusEvidence(runtime, registryCaptureCount, 0, capturesBySessionCount, statusDurationsMs);
    inventoryClient = await connectMcpClient(runtime.url);
    captureStatusEvidence(runtime, registryCaptureCount, 1, capturesBySessionCount, statusDurationsMs);
    await captureToolInventoryEvidence(
      inventoryClient.client,
      "contract_generation_project",
      registryCaptureCount,
      1,
      toolInventoryDurationsMs,
    );
    for (let index = 2; index <= 32; index += 1) {
      const initialized = await initializeSession(runtime.url);
      assert.equal(initialized.status, 200);
      assert.ok(initialized.sessionId);
      if ([8, 32].includes(index)) {
        captureStatusEvidence(runtime, registryCaptureCount, index, capturesBySessionCount, statusDurationsMs);
      }
    }
    await captureToolInventoryEvidence(
      inventoryClient.client,
      "contract_generation_project",
      registryCaptureCount,
      32,
      toolInventoryDurationsMs,
    );

    assert.deepEqual(capturesBySessionCount, { 0: 1, 1: 1, 8: 1, 32: 1 });
    assert.equal(registryCaptureCount, 1);
    const beforeIdle = runtime.publishedToolContractDiagnostics();
    now += 60 * 60 * 1_000;
    const cpuBefore = process.cpuUsage();
    await new Promise((resolve) => setTimeout(resolve, 100));
    const idleCpu = process.cpuUsage(cpuBefore);
    const afterIdle = runtime.publishedToolContractDiagnostics();
    assert.equal(afterIdle.contractCaptureCount, beforeIdle.contractCaptureCount);
    assert.equal(registryCaptureCount, 1);
    assert.equal(afterIdle.periodicContractTimerCount, 0);
    assert.equal(afterIdle.activeSessionCount, 32);
    assert.equal(afterIdle.contracts[0].sessionCount, 32);
    t.diagnostic(JSON.stringify({
      capturesBySessionCount,
      capturesAfterSimulatedIdleHour: afterIdle.contractCaptureCount,
      statusDurationsMs,
      toolInventoryDurationsMs,
      idleCpuSampleMicros: idleCpu,
      periodicContractTimerCount: afterIdle.periodicContractTimerCount,
    }));
  } finally {
    await runtime.close();
    await inventoryClient?.client.close().catch(() => undefined);
  }
  assert.equal(runtime.sessionDiagnostics().totalDisposed.runtimeClose, 32);
});

test("normalized OAuth scopes capture at most once and preserve exact scope-filtered public tools", { timeout: 30_000 }, async () => {
  const fixture = createWorkspace("Scoped_Contract_Project");
  const baseRegistry = createRegistry(fixture);
  let registryCaptureCount = 0;
  const registry = {
    listTools(scope) {
      registryCaptureCount += 1;
      return baseRegistry.listTools(scope);
    },
    callTool: (call) => baseRegistry.callTool(call),
  };
  const runtime = await startAgentHarnessHttpRuntime({
    host: "127.0.0.1",
    port: 0,
    userDataRoot: fixture.userDataRoot,
    registry,
    allowUnauthenticatedLocal: false,
    sessionLifecyclePolicy: { globalCap: 32, perPrincipalCap: 32 },
  });
  const clients = [];
  try {
    assert.equal(registryCaptureCount, 1);
    const base = new URL(runtime.url).origin;
    const readToken = await issueOAuthToken(base, "files.read");
    for (let index = 0; index < 8; index += 1) {
      const connected = await connectMcpClient(runtime.url, readToken.access_token);
      clients.push(connected);
    }
    assert.equal(registryCaptureCount, 2);
    const readTools = await clients[0].client.listTools();
    assert.equal(registryCaptureCount, 2);

    const fullToken = await issueOAuthToken(base, "files.write files.read files.write");
    const fullClient = await connectMcpClient(runtime.url, fullToken.access_token);
    clients.push(fullClient);
    const fullTools = await fullClient.client.listTools();
    assert.equal(registryCaptureCount, 2);

    const diagnostics = runtime.publishedToolContractDiagnostics();
    assert.equal(diagnostics.capturedScopeCount, 2);
    assert.equal(diagnostics.contractCaptureCount, 2);
    assert.equal(diagnostics.periodicContractTimerCount, 0);
    assert.equal(diagnostics.contracts.find((entry) => entry.scope === "files.read").sessionCount, 8);
    assert.equal(diagnostics.contracts.find((entry) => entry.scope === "files.read files.write").sessionCount, 1);
    assert.equal(
      diagnostics.contracts.find((entry) => entry.scope === "files.read").fingerprint,
      fingerprintAgentHarnessPublicToolDefinitions("files.read", readTools.tools),
    );
    assert.equal(
      diagnostics.contracts.find((entry) => entry.scope === "files.read files.write").fingerprint,
      fingerprintAgentHarnessPublicToolDefinitions("files.read files.write", fullTools.tools),
    );
    assert.notDeepEqual(readTools.tools, fullTools.tools);
  } finally {
    await Promise.all(clients.map(({ client }) => client.close().catch(() => undefined)));
    await runtime.close();
  }
});

function captureStatusEvidence(runtime, registryCaptureCount, sessionCount, captures, durations) {
  const startedAt = performance.now();
  const diagnostics = runtime.publishedToolContractDiagnostics();
  durations[sessionCount] = Number((performance.now() - startedAt).toFixed(3));
  captures[sessionCount] = diagnostics.contractCaptureCount;
  assert.equal(diagnostics.activeSessionCount, sessionCount);
  assert.equal(diagnostics.contractCaptureCount, registryCaptureCount);
  assert.equal(diagnostics.periodicContractTimerCount, 0);
}

async function captureToolInventoryEvidence(client, workspaceId, registryCaptureCount, sessionCount, durations) {
  const startedAt = performance.now();
  const inventory = await client.callTool({
    name: "diagnostics_toolbox",
    arguments: { workspaceId, action: "tool_inventory" },
  });
  durations[sessionCount] = Number((performance.now() - startedAt).toFixed(3));
  assert.equal(inventory.structuredContent.ok, true);
  assert.equal(inventory.structuredContent.payload.published.activeSessionCount, sessionCount);
  assert.equal(inventory.structuredContent.payload.published.contractCaptureCount, registryCaptureCount);
}

function createWorkspace(name) {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-mcp-contract-generation-"));
  const workspaceRoot = path.join(container, name);
  const userDataRoot = path.join(container, "user-data");
  fs.mkdirSync(path.join(workspaceRoot, "planning"), { recursive: true });
  fs.mkdirSync(userDataRoot, { recursive: true });
  fs.writeFileSync(path.join(workspaceRoot, "README.md"), "# Fixture\n", "utf8");
  return { root: workspaceRoot, userDataRoot };
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
  return createAgentHarnessToolRegistry({ workspaceAccess, userDataRoot: fixture.userDataRoot, runtimeDiagnostics });
}

async function initializeSession(url) {
  const response = await fetch(url, {
    method: "POST",
    headers: mcpHeaders(),
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-11-25",
        capabilities: {},
        clientInfo: { name: "contract-generation-test", version: "0.1.0" },
      },
    }),
  });
  await response.text();
  return { status: response.status, sessionId: response.headers.get("mcp-session-id") };
}

function mcpHeaders(token) {
  return {
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
}

async function issueOAuthToken(base, scope) {
  const verifier = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUV";
  const registeredResponse = await fetch(`${base}/oauth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ redirect_uris: ["http://127.0.0.1/callback"], scope }),
  });
  assert.equal(registeredResponse.status, 201);
  const registered = await registeredResponse.json();
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
  assert.equal(tokenResponse.status, 200);
  return tokenResponse.json();
}

async function connectMcpClient(url, token) {
  const client = new Client({ name: "contract-generation-client", version: "0.1.0" }, { capabilities: {} });
  const transport = new StreamableHTTPClientTransport(new URL(url), {
    requestInit: { headers: { authorization: `Bearer ${token}` } },
  });
  await client.connect(transport);
  return { client, transport };
}
