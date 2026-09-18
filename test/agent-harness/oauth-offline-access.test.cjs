const assert = require("node:assert/strict");
const { createHash, randomBytes } = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StreamableHTTPClientTransport } = require("@modelcontextprotocol/sdk/client/streamableHttp.js");
const { startAgentHarnessHttpRuntime } = require("../../dist/main/agentHarness/runtime/httpRuntime.js");
const { createAgentHarnessToolRegistry } = require("../../dist/main/agentHarness/tools/toolRegistry.js");
const { createRegisteredWorkspaceAccessProvider } = require("../../dist/main/agentHarness/workspace/workspaceAccess.js");
const {
  importLegacyOAuthClientRegistry,
  normalizeAuthorizationScope,
  projectOAuthResourceScope,
  pkceChallenge,
  readOAuthStoreDiagnostics,
  validateAccessToken,
} = require("../../dist/main/agentHarness/runtime/oauthStore.js");

test("OAuth discovery separates permissions from session scopes on both metadata routes", async (t) => {
  const fixture = await createRuntime(t);
  for (const suffix of ["", "/mcp"]) {
    const resource = await fetch(`${fixture.base}/.well-known/oauth-protected-resource${suffix}`);
    assert.equal(resource.status, 200);
    assert.deepEqual((await resource.json()).scopes_supported, ["files.read", "files.write"]);
    const server = await fetch(`${fixture.base}/.well-known/oauth-authorization-server${suffix}`);
    assert.equal(server.status, 200);
    const metadata = await server.json();
    assert.deepEqual(metadata.scopes_supported, ["files.read", "files.write", "offline_access"]);
    assert.deepEqual(metadata.grant_types_supported, ["authorization_code", "refresh_token"]);
    assert.deepEqual(metadata.response_types_supported, ["code"]);
    assert.deepEqual(metadata.code_challenge_methods_supported, ["S256"]);
    assert.deepEqual(metadata.token_endpoint_auth_methods_supported, ["none"]);
  }
  const client = await register(fixture);
  assert.equal(client.scope, "files.read");
  assert.equal(client.token_endpoint_auth_method, "none");
  assert.equal(Object.hasOwn(client, "client_secret"), false);
  const before = fixture.storeText();
  const invalid = await post(fixture, "/oauth/register", {
    redirect_uris: client.redirect_uris,
    scope: "files.read offline_access files.admin",
  });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.error, "invalid_client_metadata");
  for (const scope of ["offline_access", "offline_access offline_access", "files.read offline_access files.admin"]) {
    const response = await authorize(fixture, client, scope);
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error, "invalid_scope");
  }
  assert.ok(fixture.storeText() === before, "Rejected requests must not change the OAuth store");
  assert.equal(normalizeAuthorizationScope(" offline_access files.write files.read offline_access "),
    "files.read files.write offline_access");
  assert.equal(normalizeAuthorizationScope("files.write files.read files.write"), "files.read files.write");
  assert.throws(() => normalizeAuthorizationScope("files.read files.admin"), /unsupported value/);
  assert.equal(projectOAuthResourceScope("offline_access"), "");
  assert.equal(projectOAuthResourceScope(""), "");
});

for (const [requestedScope, expectedScope] of [
  ["files.read", "files.read"],
  ["files.read files.write", "files.read files.write"],
  ["files.read offline_access", "files.read offline_access"],
  ["offline_access files.write files.read offline_access", "files.read files.write offline_access"],
]) {
  test(`PKCE issuance and refresh preserve ${expectedScope} without escalating MCP permissions`, async (t) => {
    const fixture = await createRuntime(t);
    const client = await register(fixture, requestedScope);
    assert.equal(client.scope, expectedScope);
    const issued = await issue(fixture, client, requestedScope);
    assert.equal(issued.scope, expectedScope);
    assert.equal(issued.token_type, "Bearer");
    assert.equal(issued.expires_in, 3600);
    assert.ok(issued.access_token && issued.refresh_token);
    const stored = fixture.store().tokens[0];
    assert.equal(stored.scope, expectedScope);
    const lifetimeDifference = Date.parse(stored.refresh_expires_at) - Date.parse(stored.expires_at);
    assert.ok(Math.abs(lifetimeDifference - (30 * 24 * 60 * 60 - 3600) * 1000) < 1000);
    assert.equal(stored.access_token_hash, hash(issued.access_token));
    assert.equal(stored.refresh_token_hash, hash(issued.refresh_token));
    assertNoPlaintext(fixture, issued);

    const connected = await connect(fixture, issued.access_token);
    const tools = (await connected.client.listTools()).tools;
    const baseline = fixture.runtime.publishedToolContractDiagnostics();
    const resourceScope = expectedScope.replace(" offline_access", "");
    assert.ok(baseline.contracts.some((entry) => entry.scope === resourceScope && entry.sessionCount === 1));
    assert.equal(JSON.stringify(baseline).includes("offline_access"), false);
    const rotated = await refresh(fixture, client, issued, { scope: "files.read files.write offline_access files.admin" });
    assert.equal(rotated.status, 200);
    assert.equal(rotated.body.scope, expectedScope);
    assert.ok(rotated.body.access_token !== issued.access_token, "Access token must rotate");
    assert.ok(rotated.body.refresh_token !== issued.refresh_token, "Refresh token must rotate");
    assert.equal(fixture.store().tokens.length, 1);
    assert.equal(fixture.store().tokens[0].scope, expectedScope);
    assert.ok(!fixture.store().tokens.some((entry) => entry.refresh_token_hash === hash(issued.refresh_token)));
    assertNoPlaintext(fixture, rotated.body);

    // A refreshed authorization can reuse its existing resource-scoped session.
    assert.equal((await listSession(fixture, connected.transport.sessionId, rotated.body.access_token)).status, 200);
    const refreshedClient = await connect(fixture, rotated.body.access_token);
    assert.deepEqual((await refreshedClient.client.listTools()).tools, tools);
    assert.equal(fixture.runtime.publishedToolContractDiagnostics().contractCaptureCount, baseline.contractCaptureCount);
    assert.equal((await refresh(fixture, client, issued)).body.error, "invalid_grant");

    if (expectedScope.includes("offline_access")) {
      const resourceOnly = await issue(fixture, client, resourceScope);
      assert.equal((await listSession(fixture, connected.transport.sessionId, resourceOnly.access_token)).status, 200);
      if (resourceScope.includes("files.write")) {
        const readOnly = await issue(fixture, client, "files.read offline_access");
        assert.equal((await listSession(fixture, connected.transport.sessionId, readOnly.access_token)).status, 403);
      }
    }
    await connected.client.close();
    await refreshedClient.client.close();
  });
}

test("offline refresh rejects wrong-client, revoked, and expired tokens without changing the store", async (t) => {
  const fixture = await createRuntime(t);
  const client = await register(fixture, "files.read offline_access");
  const wrongClient = await register(fixture, "files.read files.write offline_access");
  for (const condition of ["wrong-client", "revoked", "expired"]) {
    const issued = await issue(fixture, client, client.scope);
    if (condition !== "wrong-client") {
      const store = fixture.store();
      Object.assign(store.tokens.at(-1), condition === "revoked"
        ? { revoked: true }
        : { refresh_expires_at: new Date(Date.now() - 1000).toISOString() });
      fixture.writeStore(store);
    }
    const before = fixture.storeText();
    const rejected = await refresh(fixture, condition === "wrong-client" ? wrongClient : client, issued);
    assert.equal(rejected.status, 400);
    assert.equal(rejected.body.error, "invalid_grant");
    assert.ok(fixture.storeText() === before, "Rejected refresh must leave the store unchanged");
  }
});

test("existing persisted OAuth clients and tokens load unchanged and refresh without a migration", async (t) => {
  const fixture = await createRuntime(t);
  for (const scope of ["files.read", "files.read files.write"]) {
    const client = legacyClient(`persisted-${scope.includes("files.write") ? "write" : "read"}`, scope);
    const accessToken = randomBytes(32).toString("base64url");
    const refreshToken = randomBytes(32).toString("base64url");
    fixture.writeStore({ clients: [client], codes: [], tokens: [tokenRecord(client, accessToken, refreshToken)] });
    const before = fixture.storeText();
    assert.deepEqual(validateAccessToken(fixture.userDataRoot, accessToken), { clientId: client.client_id, scope });
    readOAuthStoreDiagnostics(fixture.userDataRoot);
    assert.ok(fixture.storeText() === before, "Reading pre-hotfix records must not rewrite them");
    const rotated = await refresh(fixture, client, { refresh_token: refreshToken });
    assert.equal(rotated.status, 200);
    assert.equal(rotated.body.scope, scope);
    assert.deepEqual(fixture.store().clients, [client]);
    assert.deepEqual(Object.keys(fixture.store()).sort(), ["clients", "codes", "tokens"]);
    // The existing registration can request offline access without re-registration.
    assert.equal((await issue(fixture, client, `${scope} offline_access`)).scope, `${scope} offline_access`);
  }
});

test("legacy import accepts and canonicalizes offline scopes while rejecting unknown scopes atomically", async (t) => {
  const fixture = await createRuntime(t);
  for (const [index, scope] of ["files.read", "files.read files.write", "offline_access files.read", "files.write offline_access files.read"].entries()) {
    const client = legacyClient(`imported-${index}`, scope);
    assert.equal(importLegacyOAuthClientRegistry(fixture.userDataRoot, { clients: [client] }).importedCount, 1);
    assert.equal(importLegacyOAuthClientRegistry(fixture.userDataRoot, { clients: [client] }).alreadyPresentCount, 1);
    const issued = await issue(fixture, client, scope);
    assert.equal(issued.scope, normalizeAuthorizationScope(scope));
    assert.equal((await refresh(fixture, client, issued)).body.scope, issued.scope);
  }
  const before = fixture.storeText();
  assert.throws(() => importLegacyOAuthClientRegistry(fixture.userDataRoot, {
    clients: [legacyClient("invalid-import", "files.read offline_access files.admin")],
  }), /unsupported value/);
  assert.ok(fixture.storeText() === before, "Invalid import must leave the store unchanged");
});

test("offline-only persisted authorization fails MCP closed and contributes no resource diagnostic counts", async (t) => {
  const fixture = await createRuntime(t);
  const offlineClient = await register(fixture, "offline_access");
  const accessToken = randomBytes(32).toString("base64url");
  const refreshToken = randomBytes(32).toString("base64url");
  fixture.writeStore({ clients: [offlineClient], codes: [], tokens: [tokenRecord(offlineClient, accessToken, refreshToken)] });
  assert.deepEqual(readOAuthStoreDiagnostics(fixture.userDataRoot), {
    clientCount: 1, filesReadClientCount: 0, filesWriteClientCount: 0,
    activeTokenCount: 1, activeFilesReadAuthorizationCount: 0, activeFilesWriteAuthorizationCount: 0,
  });
  const before = fixture.runtime.publishedToolContractDiagnostics();
  const denied = await fetch(fixture.runtime.url, {
    method: "POST", headers: mcpHeaders(accessToken),
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {
      protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "offline-test", version: "1" },
    } }),
  });
  assert.equal(denied.status, 401);
  await denied.text();
  assert.equal(fixture.runtime.sessionDiagnostics().retainedSessionCount, 0);
  assert.deepEqual(fixture.runtime.publishedToolContractDiagnostics(), before);
  for (const scope of ["files.read offline_access", "files.write offline_access", "files.read files.write offline_access"]) {
    const client = await register(fixture, scope);
    await issue(fixture, client, scope);
  }
  assert.deepEqual(readOAuthStoreDiagnostics(fixture.userDataRoot), {
    clientCount: 4, filesReadClientCount: 2, filesWriteClientCount: 2,
    activeTokenCount: 4, activeFilesReadAuthorizationCount: 2, activeFilesWriteAuthorizationCount: 2,
  });
});

async function createRuntime(t) {
  const userDataRoot = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-oauth-offline-"));
  const target = path.join(userDataRoot, "agent-harness", "oauth", "oauth-store.local.json");
  const registry = createAgentHarnessToolRegistry({
    userDataRoot,
    workspaceAccess: createRegisteredWorkspaceAccessProvider({
      resolveWorkspaceContext: () => { throw new Error("No test workspace is registered."); },
      listWorkspaceSummaries: () => [],
    }),
  });
  const runtime = await startAgentHarnessHttpRuntime({
    host: "127.0.0.1", port: 0, userDataRoot, registry, allowUnauthenticatedLocal: false,
  });
  t.after(async () => {
    await runtime.close();
    fs.rmSync(userDataRoot, { recursive: true, force: true });
  });
  return {
    runtime, userDataRoot, base: new URL(runtime.url).origin,
    store: () => JSON.parse(fs.readFileSync(target, "utf8")),
    storeText: () => fs.readFileSync(target, "utf8"),
    writeStore: (store) => {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, JSON.stringify(store), "utf8");
    },
  };
}

async function post(fixture, route, body) {
  const response = await fetch(`${fixture.base}${route}`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

async function register(fixture, scope) {
  const result = await post(fixture, "/oauth/register", { redirect_uris: ["http://127.0.0.1/callback"], scope });
  assert.equal(result.status, 201);
  return result.body;
}

const verifier = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUV";
async function authorize(fixture, client, scope) {
  const url = new URL(`${fixture.base}/oauth/authorize`);
  url.search = new URLSearchParams({
    client_id: client.client_id, redirect_uri: client.redirect_uris[0], response_type: "code", scope,
    code_challenge: pkceChallenge(verifier), code_challenge_method: "S256",
  }).toString();
  return fetch(url, { redirect: "manual" });
}

async function issue(fixture, client, scope) {
  const response = await authorize(fixture, client, scope);
  assert.equal(response.status, 302);
  const code = new URL(response.headers.get("location")).searchParams.get("code");
  await response.text();
  assert.equal(fixture.store().codes.at(-1).scope, normalizeAuthorizationScope(scope));
  assert.ok(!fixture.storeText().includes(code), "Authorization codes must be stored only as hashes");
  const input = {
    grant_type: "authorization_code", client_id: client.client_id,
    redirect_uri: client.redirect_uris[0], code, code_verifier: verifier,
  };
  const result = await post(fixture, "/oauth/token", input);
  assert.equal(result.status, 200);
  assert.equal((await post(fixture, "/oauth/token", input)).body.error, "invalid_grant");
  return result.body;
}

function refresh(fixture, client, issued, extra = {}) {
  return post(fixture, "/oauth/token", {
    grant_type: "refresh_token", client_id: client.client_id, refresh_token: issued.refresh_token, ...extra,
  });
}

function mcpHeaders(token) {
  return { "content-type": "application/json", accept: "application/json, text/event-stream", authorization: `Bearer ${token}` };
}

async function connect(fixture, token) {
  const client = new Client({ name: "offline-access-test", version: "1" }, { capabilities: {} });
  const transport = new StreamableHTTPClientTransport(new URL(fixture.runtime.url), {
    requestInit: { headers: { authorization: `Bearer ${token}` } },
  });
  await client.connect(transport);
  return { client, transport };
}

async function listSession(fixture, sessionId, token) {
  const response = await fetch(fixture.runtime.url, {
    method: "POST", headers: { ...mcpHeaders(token), "mcp-session-id": sessionId },
    body: JSON.stringify({ jsonrpc: "2.0", id: 10, method: "tools/list", params: {} }),
  });
  await response.text();
  return response;
}

function legacyClient(clientId, scope) {
  return {
    client_id: clientId, redirect_uris: ["http://127.0.0.1/callback"], scope,
    grant_types: ["authorization_code", "refresh_token"], response_types: ["code"], created_at: "2026-08-01T00:00:00.000Z",
  };
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function tokenRecord(client, accessToken, refreshToken) {
  return {
    client_id: client.client_id, scope: client.scope,
    access_token_hash: hash(accessToken), refresh_token_hash: hash(refreshToken),
    expires_at: new Date(Date.now() + 3600_000).toISOString(),
    refresh_expires_at: new Date(Date.now() + 30 * 24 * 3600_000).toISOString(), revoked: false,
  };
}

function assertNoPlaintext(fixture, issued) {
  assert.ok(!fixture.storeText().includes(issued.access_token), "No plaintext access token in store");
  assert.ok(!fixture.storeText().includes(issued.refresh_token), "No plaintext refresh token in store");
}
