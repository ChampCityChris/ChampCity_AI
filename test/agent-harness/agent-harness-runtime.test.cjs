const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StreamableHTTPClientTransport } = require("@modelcontextprotocol/sdk/client/streamableHttp.js");

const {
  AgentHarnessService,
} = require("../../dist/main/agentHarness/runtime/agentHarnessService.js");
const {
  pkceChallenge,
} = require("../../dist/main/agentHarness/runtime/oauthStore.js");
const {
  getAgentHarnessSettingsPath,
} = require("../../dist/main/agentHarness/runtime/agentHarnessSettings.js");

test("Agent Harness HTTP runtime serves selected workspace tool discovery, read, write, diagnostics, and shutdown", async () => {
  const { root, userDataRoot } = createWorkspace("FO76_Collector");
  const beforeEnv = process.env.CHAMPCITY_WC60_SENTINEL;
  process.env.CHAMPCITY_WC60_SENTINEL = "unchanged";
  const service = new AgentHarnessService({
    userDataRoot,
    getSelectedProjectRoot: () => root,
    port: 0,
    allowUnauthenticatedLocal: true,
  });
  let status;
  try {
    status = await service.start();
    assert.equal(status.state, "running");
    assert.equal(status.activeWorkspaceId, "fo76_collector");
    assert.ok(status.mcpEndpoint);
    assert.ok(status.publicToolNames.includes("repo_toolbox"));

    const health = await getJson(status.healthEndpoint);
    assert.equal(health.app, "ChampCity A/I Agent Harness");

    const { client, transport } = await connectMcpClient(status.mcpEndpoint);
    assert.equal(client.getServerVersion().name, "champcity-ai-agent-harness");
    assert.ok(transport.sessionId);

    const tools = await client.listTools();
    assert.ok(tools.tools.some((tool) => tool.name === "repo_toolbox"));
    assert.equal(tools.tools.some((tool) => tool.name === "execution_toolbox"), false);

    const list = await callTool(client, "repo_toolbox", {
      workspaceId: "fo76_collector",
      action: "list_files",
    });
    assert.equal(list.structuredContent.ok, true);
    assert.ok(list.structuredContent.payload.files.includes("README.md"));

    const read = await callTool(client, "repo_toolbox", {
      workspaceId: "fo76_collector",
      action: "read_file",
      params: { relativePath: "README.md" },
    });
    assert.match(read.structuredContent.payload.content, /needle runtime/);

    const search = await callTool(client, "repo_toolbox", {
      workspaceId: "fo76_collector",
      action: "search_files",
      params: { query: "runtime" },
    });
    assert.equal(search.structuredContent.payload.matches[0].relativePath, "README.md");

    const write = await callTool(client, "repo_toolbox", {
      workspaceId: "fo76_collector",
      action: "write_markdown_artifact",
      params: { relativePath: "planning/test.md", content: "# Written\n\nThrough MCP.\n" },
    });
    assert.equal(write.structuredContent.ok, true);
    assert.equal(fs.existsSync(path.join(root, "planning", "test.md")), true);

    const writtenRead = await callTool(client, "repo_toolbox", {
      workspaceId: "fo76_collector",
      action: "read_file",
      params: { relativePath: "planning/test.md" },
    });
    assert.match(writtenRead.structuredContent.payload.content, /Through MCP/);

    const git = await callTool(client, "git_toolbox", {
      workspaceId: "fo76_collector",
      action: "status",
    });
    assert.equal(git.structuredContent.ok, true);
    assert.equal(git.structuredContent.payload.gitBacked, true);
    assert.match(git.structuredContent.payload.shortStatus, /README\.md|planning\/test\.md/);

    const diagnostics = await callTool(client, "diagnostics_toolbox", {
      workspaceId: "fo76_collector",
      action: "list_workspaces",
    });
    assert.equal(diagnostics.structuredContent.payload.workspaces[0].workspaceId, "fo76_collector");

    const foreign = await callTool(client, "repo_toolbox", {
      workspaceId: "champcity_ai",
      action: "status",
    });
    assert.equal(foreign.structuredContent.ok, false);
    assert.equal(foreign.structuredContent.error.code, "AUTHORITY_DENIED");

    await client.close();
  } finally {
    const stopped = await service.stop();
    assert.equal(stopped.state, "stopped");
    assert.equal(process.env.CHAMPCITY_WC60_SENTINEL, "unchanged");
    if (beforeEnv === undefined) {
      delete process.env.CHAMPCITY_WC60_SENTINEL;
    } else {
      process.env.CHAMPCITY_WC60_SENTINEL = beforeEnv;
    }
  }
  await assert.rejects(() => fetch(status.healthEndpoint), /fetch failed/);
});

test("Agent Harness HTTP runtime rejects oversized MCP bodies before SDK handling", async () => {
  const { root, userDataRoot } = createWorkspace("Bounded_Project");
  const service = new AgentHarnessService({
    userDataRoot,
    getSelectedProjectRoot: () => root,
    port: 0,
    allowUnauthenticatedLocal: true,
  });
  try {
    const status = await service.start();
    const response = await fetch(status.mcpEndpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-11-25",
          capabilities: {},
          clientInfo: { name: "oversized-test", version: "0.1.0" },
          padding: "x".repeat(1_050_000),
        },
      }),
    });
    assert.equal(response.status, 413);
    const payload = await response.json();
    assert.equal(payload.error, "Request body too large");
    assert.equal(payload.limitBytes, 1_000_000);
  } finally {
    await service.stop();
  }
});

test("Agent Harness status exposes bounded Settings diagnostics and restart lifecycle", async () => {
  const { root, userDataRoot } = createWorkspace("Settings_Project");
  const service = new AgentHarnessService({
    userDataRoot,
    getSelectedProjectRoot: () => root,
    port: 0,
    allowUnauthenticatedLocal: true,
  });
  try {
    const started = await service.start();
    assert.equal(started.state, "running");
    assert.equal(started.selectedProjectRootSummary, "Settings_Project");
    assert.equal(started.expectedWorkspaceId, "settings_project");
    assert.equal(started.activeWorkspaceId, "settings_project");
    assert.equal(started.routingState, "matched");
    assert.equal(started.configuredPort, 0);
    assert.equal(started.publicBaseUrlConfigured, false);
    assert.equal(started.publicBaseUrl, null);
    assert.equal(started.localAuthenticationMode, "local-unauthenticated");
    assert.equal(started.filesReadTransportAuthorized, true);
    assert.equal(started.filesWriteTransportAuthorized, true);
    assert.equal(started.registeredClientCount, 0);
    assert.ok(started.healthEndpoint);
    assert.ok(started.mcpEndpoint);
    assert.ok(started.recentActivity.some((entry) => entry.includes("Agent Harness running")));

    const restarted = await service.restart();
    assert.equal(restarted.state, "running");
    assert.equal(restarted.routingState, "matched");
    assert.ok(restarted.recentActivity.some((entry) => entry.includes("Restart requested")));
  } finally {
    await service.stop();
  }
});

test("Agent Harness configuration persists under userData and survives service reconstruction", async () => {
  const { root, userDataRoot } = createWorkspace("Persisted_Settings_Project");
  const firstService = new AgentHarnessService({
    userDataRoot,
    getSelectedProjectRoot: () => root,
    enabled: false,
  });

  const saved = await firstService.saveConfiguration({
    enabled: false,
    host: "127.0.0.1",
    port: "4321",
    publicBaseUrl: null,
    localAuthenticationMode: "oauth-required",
  });
  assert.equal(saved.state, "stopped");
  assert.equal(saved.enabled, false);
  assert.equal(saved.configuredPort, 4321);
  assert.equal(saved.localAuthenticationMode, "oauth-required");

  const settingsPath = getAgentHarnessSettingsPath(userDataRoot);
  assert.equal(path.dirname(settingsPath), path.join(userDataRoot, "agent-harness"));
  assert.equal(fs.existsSync(settingsPath), true);

  const reconstructed = new AgentHarnessService({
    userDataRoot,
    getSelectedProjectRoot: () => root,
  });
  const reconstructedStatus = reconstructed.status();
  assert.equal(reconstructedStatus.enabled, false);
  assert.equal(reconstructedStatus.host, "127.0.0.1");
  assert.equal(reconstructedStatus.configuredPort, 4321);
  assert.equal(reconstructedStatus.localAuthenticationMode, "oauth-required");
});

test("Agent Harness settings reject unsafe public unauthenticated configuration without corrupting last valid settings", async () => {
  const { root, userDataRoot } = createWorkspace("Invalid_Settings_Project");
  const service = new AgentHarnessService({
    userDataRoot,
    getSelectedProjectRoot: () => root,
    enabled: false,
  });

  await service.saveConfiguration({
    enabled: false,
    host: "127.0.0.1",
    port: 0,
    publicBaseUrl: null,
    localAuthenticationMode: "local-unauthenticated",
  });
  const before = fs.readFileSync(getAgentHarnessSettingsPath(userDataRoot), "utf8");

  await assert.rejects(() => service.saveConfiguration({
    publicBaseUrl: "https://connector.example.test/champcity",
    localAuthenticationMode: "local-unauthenticated",
  }), /Public Agent Harness connectors require OAuth/);

  assert.equal(fs.readFileSync(getAgentHarnessSettingsPath(userDataRoot), "utf8"), before);
  const status = service.status();
  assert.equal(status.publicBaseUrl, null);
  assert.equal(status.localAuthenticationMode, "local-unauthenticated");
});

test("Agent Harness settings reject non-loopback hosts before replacing last-known-good settings", async () => {
  const { root, userDataRoot } = createWorkspace("Loopback_Settings_Project");
  const service = new AgentHarnessService({
    userDataRoot,
    getSelectedProjectRoot: () => root,
    enabled: false,
  });

  const saved = await service.saveConfiguration({
    enabled: false,
    host: "127.0.0.1",
    port: 0,
    publicBaseUrl: null,
    localAuthenticationMode: "oauth-required",
  });
  assert.equal(saved.state, "stopped");
  const settingsPath = getAgentHarnessSettingsPath(userDataRoot);
  const before = fs.readFileSync(settingsPath, "utf8");

  await assert.rejects(() => service.saveConfiguration({
    host: "192.168.1.50",
  }), /loopback hosts/);

  assert.equal(fs.readFileSync(settingsPath, "utf8"), before);
  const rejectedStatus = service.status();
  assert.equal(rejectedStatus.state, "stopped");
  assert.equal(rejectedStatus.enabled, false);
  assert.equal(rejectedStatus.host, "127.0.0.1");
  assert.equal(rejectedStatus.configuredPort, 0);

  const subsequent = await service.saveConfiguration({
    host: "localhost",
    port: 0,
  });
  assert.equal(subsequent.state, "stopped");
  assert.equal(subsequent.host, "localhost");
});

test("Agent Harness settings rollback runtime-incompatible restart proposals to the prior running configuration", async () => {
  const { root, userDataRoot } = createWorkspace("Runtime_Rollback_Project");
  const service = new AgentHarnessService({
    userDataRoot,
    getSelectedProjectRoot: () => root,
    enabled: false,
  });
  let blocker;
  try {
    const started = await service.saveConfiguration({
      enabled: true,
      host: "127.0.0.1",
      port: 0,
      publicBaseUrl: null,
      localAuthenticationMode: "local-unauthenticated",
    });
    assert.equal(started.state, "running");
    assert.equal(started.configuredPort, 0);
    const settingsPath = getAgentHarnessSettingsPath(userDataRoot);
    const before = fs.readFileSync(settingsPath, "utf8");
    blocker = await listenOnLoopbackPort();

    await assert.rejects(() => service.saveConfiguration({
      port: blocker.port,
    }), /Rejected Agent Harness settings/);

    assert.equal(fs.readFileSync(settingsPath, "utf8"), before);
    const rejectedStatus = service.status();
    assert.equal(rejectedStatus.state, "running");
    assert.equal(rejectedStatus.enabled, true);
    assert.equal(rejectedStatus.host, "127.0.0.1");
    assert.equal(rejectedStatus.configuredPort, 0);
    assert.match(rejectedStatus.lastError, /Rejected Agent Harness settings/);
    assert.ok(rejectedStatus.mcpEndpoint);

    await closeServer(blocker.server);
    blocker = null;
    const subsequent = await service.saveConfiguration({
      port: 0,
    });
    assert.equal(subsequent.state, "running");
    assert.equal(subsequent.configuredPort, 0);
  } finally {
    if (blocker) {
      await closeServer(blocker.server);
    }
    await service.stop();
  }
});

test("Saving Agent Harness settings applies stopped and running lifecycle state", async () => {
  const { root, userDataRoot } = createWorkspace("Lifecycle_Settings_Project");
  const service = new AgentHarnessService({
    userDataRoot,
    getSelectedProjectRoot: () => root,
    port: 0,
    allowUnauthenticatedLocal: true,
  });
  try {
    const started = await service.start();
    assert.equal(started.state, "running");
    const previousEndpoint = started.mcpEndpoint;

    const disabled = await service.saveConfiguration({
      enabled: false,
      host: "127.0.0.1",
      port: 0,
      publicBaseUrl: null,
      localAuthenticationMode: "local-unauthenticated",
    });
    assert.equal(disabled.state, "stopped");
    assert.equal(disabled.enabled, false);
    await assert.rejects(() => fetch(previousEndpoint), /fetch failed/);

    const enabled = await service.saveConfiguration({
      enabled: true,
      host: "127.0.0.1",
      port: 0,
      publicBaseUrl: null,
      localAuthenticationMode: "local-unauthenticated",
    });
    assert.equal(enabled.state, "running");
    assert.equal(enabled.enabled, true);
    assert.ok(enabled.mcpEndpoint);
    assert.notEqual(enabled.mcpEndpoint, previousEndpoint);
  } finally {
    await service.stop();
  }
});

test("Agent Harness OAuth gates write actions by files.write scope", async () => {
  const { root, userDataRoot } = createWorkspace("OAuth_Project");
  const service = new AgentHarnessService({
    userDataRoot,
    getSelectedProjectRoot: () => root,
    port: 0,
    allowUnauthenticatedLocal: false,
  });
  try {
    const status = await service.start();
    const base = status.mcpEndpoint.replace(/\/mcp$/, "");
    const protectedResourceMetadata = await getJson(`${base}/.well-known/oauth-protected-resource`);
    assert.deepEqual(protectedResourceMetadata.scopes_supported, ["files.read", "files.write"]);
    assert.equal(protectedResourceMetadata.bearer_methods_supported[0], "header");
    const authorizationServerMetadata = await getJson(`${base}/.well-known/oauth-authorization-server`);
    assert.deepEqual(authorizationServerMetadata.response_types_supported, ["code"]);
    assert.deepEqual(authorizationServerMetadata.grant_types_supported, ["authorization_code", "refresh_token"]);
    assert.deepEqual(authorizationServerMetadata.code_challenge_methods_supported, ["S256"]);
    assert.deepEqual(authorizationServerMetadata.token_endpoint_auth_methods_supported, ["none"]);

    const invalidRegistration = await postJsonResponse(`${base}/oauth/register`, {
      redirect_uris: [],
      scope: "files.read",
    });
    assert.equal(invalidRegistration.status, 400);
    assert.equal(invalidRegistration.body.error, "invalid_client_metadata");

    const registered = await postJson(`${base}/oauth/register`, {
      redirect_uris: ["http://127.0.0.1/callback"],
      scope: "files.read",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      client_name: "Read connector",
    });
    assert.equal(registered.token_endpoint_auth_method, "none");
    assert.equal(registered.client_secret, undefined);
    assert.deepEqual(registered.grant_types, ["authorization_code", "refresh_token"]);
    assert.deepEqual(registered.response_types, ["code"]);
    const registeredStatus = service.status();
    assert.equal(registeredStatus.registeredClientCount, 1);
    assert.equal(registeredStatus.filesReadTransportAuthorized, false);
    assert.equal(registeredStatus.filesWriteTransportAuthorized, false);
    assert.equal(registeredStatus.activeFilesReadAuthorizationCount, 0);
    assert.equal(registeredStatus.activeFilesWriteAuthorizationCount, 0);
    const verifier = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUV";
    const authorizeUrl = new URL(`${base}/oauth/authorize`);
    authorizeUrl.searchParams.set("client_id", registered.client_id);
    authorizeUrl.searchParams.set("redirect_uri", "http://127.0.0.1/callback");
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("scope", "files.read");
    authorizeUrl.searchParams.set("code_challenge", pkceChallenge(verifier));
    authorizeUrl.searchParams.set("code_challenge_method", "S256");
    authorizeUrl.searchParams.set("state", "state-123");
    const authorize = await getRedirectResponse(authorizeUrl);
    assert.equal(authorize.status, 302);
    const authorizedRedirect = new URL(authorize.location);
    assert.equal(authorizedRedirect.origin + authorizedRedirect.pathname, "http://127.0.0.1/callback");
    assert.equal(authorizedRedirect.searchParams.get("state"), "state-123");
    const code = authorizedRedirect.searchParams.get("code");
    assert.ok(code);

    const wrongVerifierToken = await postForm(`${base}/oauth/token`, {
      grant_type: "authorization_code",
      client_id: registered.client_id,
      redirect_uri: "http://127.0.0.1/callback",
      code,
      code_verifier: "wrong-verifier-0123456789abcdefghijklmnopqrstuvwxyz",
    });
    assert.equal(wrongVerifierToken.error, "invalid_grant");

    const token = await postForm(`${base}/oauth/token`, {
      grant_type: "authorization_code",
      client_id: registered.client_id,
      redirect_uri: "http://127.0.0.1/callback",
      code,
      code_verifier: verifier,
    });
    assert.equal(token.scope, "files.read");

    const authorizedStatus = service.status();
    assert.equal(authorizedStatus.filesReadTransportAuthorized, true);
    assert.equal(authorizedStatus.filesWriteTransportAuthorized, false);
    assert.equal(authorizedStatus.activeFilesReadAuthorizationCount, 1);
    assert.equal(authorizedStatus.activeFilesWriteAuthorizationCount, 0);

    const readOnlyClient = await connectMcpClient(status.mcpEndpoint, token.access_token);
    const readOnlyTools = await readOnlyClient.client.listTools();
    const readOnlyRepoTool = readOnlyTools.tools.find((tool) => tool.name === "repo_toolbox");
    assert.ok(readOnlyRepoTool);
    assert.equal(schemaHasEnumValue(readOnlyRepoTool.inputSchema.properties.action, "read_file"), true);
    assert.equal(schemaHasEnumValue(readOnlyRepoTool.inputSchema.properties.action, "write_markdown_artifact"), false);
    assert.equal(schemaHasUnconstrainedStringBranch(readOnlyRepoTool.inputSchema.properties.action), false);
    assert.equal(schemaAccepts(readOnlyRepoTool.inputSchema, {
      workspaceId: "oauth_project",
      action: "read_file",
      params: { relativePath: "README.md" },
    }), true);
    assert.equal(schemaAccepts(readOnlyRepoTool.inputSchema, {
      workspaceId: "oauth_project",
      action: "read_file",
    }), false);
    assert.equal(schemaAccepts(readOnlyRepoTool.inputSchema, {
      workspaceId: "oauth_project",
      action: "read_file",
      params: { relativePath: "README.md", ignored: true },
    }), false);
    assert.equal(schemaAccepts(readOnlyRepoTool.inputSchema, {
      workspaceId: "oauth_project",
      action: "write_markdown_artifact",
      params: { relativePath: "planning/denied.md", content: "# Denied\n" },
    }), false);
    assert.ok(readOnlyTools.tools.some((tool) => tool.name === "git_toolbox"));
    assert.equal(readOnlyTools.tools.some((tool) => tool.name === "workspace_write_attached_image"), false);
    const missingRequiredParam = await callTool(readOnlyClient.client, "repo_toolbox", {
      workspaceId: "oauth_project",
      action: "read_file",
    });
    assert.equal(missingRequiredParam.isError, true);
    assert.match(missingRequiredParam.content[0].text, /Input validation error|Invalid arguments/);
    const denied = await callTool(readOnlyClient.client, "repo_toolbox", {
      workspaceId: "oauth_project",
      action: "write_markdown_artifact",
      params: { relativePath: "planning/denied.md", content: "# Denied\n" },
    });
    assert.equal(denied.isError, true);
    assert.match(denied.content[0].text, /Input validation error|Invalid arguments/);
    assert.equal(fs.existsSync(path.join(root, "planning", "denied.md")), false);
    await readOnlyClient.client.close();

    const refreshedReadToken = await postForm(`${base}/oauth/token`, {
      grant_type: "refresh_token",
      client_id: registered.client_id,
      refresh_token: token.refresh_token,
    });
    assert.equal(refreshedReadToken.scope, "files.read");

    let store = readOAuthStore(userDataRoot);
    assert.equal(store.clients.find((client) => client.client_id === registered.client_id).scope, "files.read");
    const writeAuthorizeUrl = new URL(`${base}/oauth/authorize`);
    writeAuthorizeUrl.searchParams.set("client_id", registered.client_id);
    writeAuthorizeUrl.searchParams.set("redirect_uri", "http://127.0.0.1/callback");
    writeAuthorizeUrl.searchParams.set("response_type", "code");
    writeAuthorizeUrl.searchParams.set("scope", "files.read files.write");
    writeAuthorizeUrl.searchParams.set("code_challenge", pkceChallenge(verifier));
    writeAuthorizeUrl.searchParams.set("code_challenge_method", "S256");
    const writeAuthorize = await getRedirectResponse(writeAuthorizeUrl);
    assert.equal(writeAuthorize.status, 302);
    const writeCode = new URL(writeAuthorize.location).searchParams.get("code");
    assert.ok(writeCode);
    const writeToken = await postForm(`${base}/oauth/token`, {
      grant_type: "authorization_code",
      client_id: registered.client_id,
      redirect_uri: "http://127.0.0.1/callback",
      code: writeCode,
      code_verifier: verifier,
    });
    assert.equal(writeToken.scope, "files.read files.write");
    store = readOAuthStore(userDataRoot);
    assert.equal(store.clients.find((client) => client.client_id === registered.client_id).scope, "files.read");
    const writeMcpClient = await connectMcpClient(status.mcpEndpoint, writeToken.access_token);
    const allowed = await callTool(writeMcpClient.client, "repo_toolbox", {
      workspaceId: "oauth_project",
      action: "write_markdown_artifact",
      params: { relativePath: "planning/allowed.md", content: "# Allowed\n" },
    });
    assert.equal(allowed.structuredContent.ok, true);
    const refreshedWriteToken = await postForm(`${base}/oauth/token`, {
      grant_type: "refresh_token",
      client_id: registered.client_id,
      refresh_token: writeToken.refresh_token,
    });
    assert.equal(refreshedWriteToken.scope, "files.read files.write");
    await writeMcpClient.client.close();
  } finally {
    await service.stop();
  }
});

test("Agent Harness OAuth refresh tokens rotate, expire, and preserve granted scope", async () => {
  const { root, userDataRoot } = createWorkspace("Refresh_Token_Project");
  const service = new AgentHarnessService({
    userDataRoot,
    getSelectedProjectRoot: () => root,
    port: 0,
    allowUnauthenticatedLocal: false,
  });
  try {
    const status = await service.start();
    const base = status.mcpEndpoint.replace(/\/mcp$/, "");

    const readToken = await issueOAuthToken(base, "files.read");
    mutateLatestOAuthToken(userDataRoot, {
      expires_at: new Date(Date.now() - 1_000).toISOString(),
    });
    const expiredAccess = await postMcpInitialize(status.mcpEndpoint, readToken.access_token);
    assert.equal(expiredAccess.status, 401);

    const rotatedRead = await postForm(`${base}/oauth/token`, {
      grant_type: "refresh_token",
      client_id: readToken.client_id,
      refresh_token: readToken.refresh_token,
    });
    assert.equal(rotatedRead.scope, "files.read");
    assert.ok(rotatedRead.access_token);
    assert.ok(rotatedRead.refresh_token);
    assert.notEqual(rotatedRead.refresh_token, readToken.refresh_token);

    const reusedRead = await postForm(`${base}/oauth/token`, {
      grant_type: "refresh_token",
      client_id: readToken.client_id,
      refresh_token: readToken.refresh_token,
    });
    assert.equal(reusedRead.error, "invalid_grant");

    const writeToken = await issueOAuthToken(base, "files.read files.write");
    const rotatedWrite = await postForm(`${base}/oauth/token`, {
      grant_type: "refresh_token",
      client_id: writeToken.client_id,
      refresh_token: writeToken.refresh_token,
    });
    assert.equal(rotatedWrite.scope, "files.read files.write");

    const expiringToken = await issueOAuthToken(base, "files.read");
    mutateLatestOAuthToken(userDataRoot, {
      expires_at: new Date(Date.now() - 1_000).toISOString(),
      refresh_expires_at: new Date(Date.now() - 1_000).toISOString(),
    });
    const beforeExpiredRefresh = fs.readFileSync(oauthStorePath(userDataRoot), "utf8");
    const expiredRefresh = await postForm(`${base}/oauth/token`, {
      grant_type: "refresh_token",
      client_id: expiringToken.client_id,
      refresh_token: expiringToken.refresh_token,
    });
    assert.equal(expiredRefresh.error, "invalid_grant");
    assert.equal(fs.readFileSync(oauthStorePath(userDataRoot), "utf8"), beforeExpiredRefresh);
  } finally {
    await service.stop();
  }
});

test("Agent Harness imports legacy OAuth client registrations without donor token state", async () => {
  const { root, userDataRoot } = createWorkspace("Legacy_OAuth_Project");
  const service = new AgentHarnessService({
    userDataRoot,
    getSelectedProjectRoot: () => root,
    port: 0,
    allowUnauthenticatedLocal: false,
  });
  try {
    const status = await service.start();
    const base = status.mcpEndpoint.replace(/\/mcp$/, "");
    const verifier = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUV";
    const legacyClient = legacyOAuthClient({
      client_id: "champcity_legacy_continuity_client",
    });
    const requestedScope = "files.read files.write";

    const absent = await getResponseJson(authorizationUrl(base, legacyClient, verifier, requestedScope));
    assert.equal(absent.status, 400);
    assert.equal(absent.body.error, "invalid_request");
    assert.match(absent.body.error_description, /Invalid client_id/);

    const importResult = service.importLegacyOAuthClientRegistry({
      clients: [legacyClient],
      accessTokens: [{ tokenHash: "legacy-access-token-hash", client_id: legacyClient.client_id }],
      refreshTokens: [{ refreshTokenHash: "legacy-refresh-token-hash", client_id: legacyClient.client_id }],
      adminPasswordHash: "legacy-admin-password-hash",
    });
    assert.deepEqual(importResult, {
      canceled: false,
      importedCount: 1,
      alreadyPresentCount: 0,
      totalAcceptedCount: 1,
      registeredClientCount: 1,
    });
    let store = readOAuthStore(userDataRoot);
    assert.equal(store.clients[0].client_id, legacyClient.client_id);
    assert.deepEqual(store.clients[0].redirect_uris, legacyClient.redirect_uris);
    assert.deepEqual(store.clients[0].grant_types, legacyClient.grant_types);
    assert.deepEqual(store.clients[0].response_types, legacyClient.response_types);
    assert.equal(store.clients[0].scope, "files.read");
    assert.equal(store.clients[0].created_at, legacyClient.created_at);
    assert.deepEqual(store.tokens, []);
    assert.equal(Object.hasOwn(store, "accessTokens"), false);
    assert.equal(Object.hasOwn(store, "refreshTokens"), false);
    assert.equal(Object.hasOwn(store, "adminPasswordHash"), false);

    const accepted = await getRedirectResponse(authorizationUrl(base, legacyClient, verifier, requestedScope));
    assert.equal(accepted.status, 302);
    const code = new URL(accepted.location).searchParams.get("code");
    assert.ok(code);
    const token = await postForm(`${base}/oauth/token`, {
      grant_type: "authorization_code",
      client_id: legacyClient.client_id,
      redirect_uri: legacyClient.redirect_uris[0],
      code,
      code_verifier: verifier,
    });
    assert.equal(token.scope, "files.read files.write");
    assert.ok(token.access_token);
    assert.ok(token.refresh_token);
    store = readOAuthStore(userDataRoot);
    assert.equal(store.clients[0].scope, "files.read");
    assert.equal(store.tokens.length, 1);
    assert.equal(store.tokens[0].client_id, legacyClient.client_id);
    assert.equal(store.tokens[0].scope, "files.read files.write");
    assert.ok(store.tokens[0].refresh_expires_at);

    const reimport = service.importLegacyOAuthClientRegistry({ clients: [legacyClient] });
    assert.equal(reimport.importedCount, 0);
    assert.equal(reimport.alreadyPresentCount, 1);
    assert.equal(readOAuthStore(userDataRoot).clients.filter((client) => client.client_id === legacyClient.client_id).length, 1);

    const beforeConflict = fs.readFileSync(oauthStorePath(userDataRoot), "utf8");
    assert.throws(() => service.importLegacyOAuthClientRegistry({
      clients: [{ ...legacyClient, redirect_uris: ["https://chatgpt.com/connector/oauth/conflict"] }],
    }), /different registration metadata/);
    assert.equal(fs.readFileSync(oauthStorePath(userDataRoot), "utf8"), beforeConflict);

    assert.throws(() => service.importLegacyOAuthClientRegistry({
      clients: [legacyOAuthClient({ client_id: "champcity_bad_scope", scope: "files.admin" })],
    }), /unsupported value/);
    assert.equal(fs.readFileSync(oauthStorePath(userDataRoot), "utf8"), beforeConflict);

    assert.throws(() => service.importLegacyOAuthClientRegistry({
      clients: "not-a-client-list",
    }), /clients array/);
    assert.equal(fs.readFileSync(oauthStorePath(userDataRoot), "utf8"), beforeConflict);
  } finally {
    await service.stop();
  }
});

test("Agent Harness MCP sessions reject reuse when request OAuth scope is lower than initialized scope", async () => {
  const { root, userDataRoot } = createWorkspace("Session_Scope_Project");
  const service = new AgentHarnessService({
    userDataRoot,
    getSelectedProjectRoot: () => root,
    port: 0,
    allowUnauthenticatedLocal: false,
  });
  let readMcpClient;
  let writeMcpClient;
  try {
    const status = await service.start();
    const base = status.mcpEndpoint.replace(/\/mcp$/, "");
    const readToken = await issueOAuthToken(base, "files.read");
    const writeToken = await issueOAuthToken(base, "files.read files.write");

    readMcpClient = await connectMcpClient(status.mcpEndpoint, readToken.access_token);
    assert.ok(readMcpClient.transport.sessionId);
    const readTools = await readMcpClient.client.listTools();
    const readRepoTool = readTools.tools.find((tool) => tool.name === "repo_toolbox");
    assert.ok(readRepoTool);
    assert.equal(schemaHasEnumValue(readRepoTool.inputSchema.properties.action, "write_markdown_artifact"), false);

    writeMcpClient = await connectMcpClient(status.mcpEndpoint, writeToken.access_token);
    const writeSessionId = writeMcpClient.transport.sessionId;
    assert.ok(writeSessionId);
    const writeTools = await writeMcpClient.client.listTools();
    const writeRepoTool = writeTools.tools.find((tool) => tool.name === "repo_toolbox");
    assert.ok(writeRepoTool);
    assert.equal(schemaHasEnumValue(writeRepoTool.inputSchema.properties.action, "write_markdown_artifact"), true);

    const downgradedList = await postMcpWithSession(status.mcpEndpoint, writeSessionId, readToken.access_token, {
      jsonrpc: "2.0",
      id: 91,
      method: "tools/list",
      params: {},
    });
    assert.equal(downgradedList.status, 403);
    assert.match(downgradedList.body.error.message, /OAUTH_SCOPE_DENIED/);

    const downgradedWrite = await postMcpWithSession(status.mcpEndpoint, writeSessionId, readToken.access_token, {
      jsonrpc: "2.0",
      id: 92,
      method: "tools/call",
      params: {
        name: "repo_toolbox",
        arguments: {
          workspaceId: "session_scope_project",
          action: "write_markdown_artifact",
          params: { relativePath: "planning/cross-scope-denied.md", content: "# Denied\n" },
        },
      },
    });
    assert.equal(downgradedWrite.status, 403);
    assert.match(downgradedWrite.body.error.message, /OAUTH_SCOPE_DENIED/);
    assert.equal(fs.existsSync(path.join(root, "planning", "cross-scope-denied.md")), false);

    const allowed = await callTool(writeMcpClient.client, "repo_toolbox", {
      workspaceId: "session_scope_project",
      action: "write_markdown_artifact",
      params: { relativePath: "planning/write-session-allowed.md", content: "# Allowed\n" },
    });
    assert.equal(allowed.structuredContent.ok, true);
    assert.equal(fs.existsSync(path.join(root, "planning", "write-session-allowed.md")), true);
  } finally {
    await writeMcpClient?.client.close();
    await readMcpClient?.client.close();
    await service.stop();
  }
});

test("Agent Harness OAuth rejects redirect, PKCE method, and unsupported scope before token issuance", async () => {
  const { root, userDataRoot } = createWorkspace("Scope_Project");
  const service = new AgentHarnessService({
    userDataRoot,
    getSelectedProjectRoot: () => root,
    port: 0,
    allowUnauthenticatedLocal: false,
  });
  try {
    const status = await service.start();
    const base = status.mcpEndpoint.replace(/\/mcp$/, "");
    const registered = await postJson(`${base}/oauth/register`, {
      redirect_uris: ["http://127.0.0.1/callback"],
      scope: "files.read",
    });
    const authorizeUrl = new URL(`${base}/oauth/authorize`);
    authorizeUrl.searchParams.set("client_id", registered.client_id);
    authorizeUrl.searchParams.set("redirect_uri", "http://127.0.0.1/callback");
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("scope", "files.read files.admin");
    authorizeUrl.searchParams.set("code_challenge", pkceChallenge("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUV"));
    authorizeUrl.searchParams.set("code_challenge_method", "S256");
    const unsupportedScope = await getResponseJson(authorizeUrl);

    assert.equal(unsupportedScope.status, 400);
    assert.equal(unsupportedScope.body.error, "invalid_scope");
    assert.equal(readOAuthStore(userDataRoot).tokens.length, 0);

    const invalidRedirectUrl = new URL(`${base}/oauth/authorize`);
    invalidRedirectUrl.searchParams.set("client_id", registered.client_id);
    invalidRedirectUrl.searchParams.set("redirect_uri", "http://127.0.0.1/not-registered");
    invalidRedirectUrl.searchParams.set("response_type", "code");
    invalidRedirectUrl.searchParams.set("scope", "files.read");
    invalidRedirectUrl.searchParams.set("code_challenge", pkceChallenge("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUV"));
    invalidRedirectUrl.searchParams.set("code_challenge_method", "S256");
    const invalidRedirect = await getResponseJson(invalidRedirectUrl);
    assert.equal(invalidRedirect.status, 400);
    assert.equal(invalidRedirect.body.error, "invalid_request");
    assert.match(invalidRedirect.body.error_description, /redirect_uri/);

    const invalidPkceUrl = new URL(`${base}/oauth/authorize`);
    invalidPkceUrl.searchParams.set("client_id", registered.client_id);
    invalidPkceUrl.searchParams.set("redirect_uri", "http://127.0.0.1/callback");
    invalidPkceUrl.searchParams.set("response_type", "code");
    invalidPkceUrl.searchParams.set("scope", "files.read");
    invalidPkceUrl.searchParams.set("code_challenge", pkceChallenge("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUV"));
    invalidPkceUrl.searchParams.set("code_challenge_method", "plain");
    const invalidPkce = await getResponseJson(invalidPkceUrl);
    assert.equal(invalidPkce.status, 400);
    assert.equal(invalidPkce.body.error, "invalid_request");
    assert.match(invalidPkce.body.error_description, /PKCE S256/);
    assert.equal(typeof service.approvePendingOAuthAuthorization, "undefined");
  } finally {
    await service.stop();
  }
});

test("Agent Harness public connector configuration cannot use unauthenticated local mode", async () => {
  const { root, userDataRoot } = createWorkspace("Public_Project");
  assert.throws(() => new AgentHarnessService({
    userDataRoot,
    getSelectedProjectRoot: () => root,
    port: 0,
    publicBaseUrl: "https://connector.example.test/champcity",
    allowUnauthenticatedLocal: true,
  }), /Public Agent Harness connectors require OAuth/);

  const localService = new AgentHarnessService({
    userDataRoot,
    getSelectedProjectRoot: () => root,
    port: 0,
  });
  try {
    const started = await localService.start();
    assert.equal(started.state, "running");
    assert.equal(started.oauthConfigured, true);
    assert.equal(started.localAuthenticationMode, "oauth-required");
    const unauthorized = await fetchLocalMcp(started);
    assert.equal(unauthorized.status, 401);
    assert.deepEqual(await unauthorized.json(), { error: "Unauthorized" });
  } finally {
    await localService.stop();
  }
});

test("Agent Harness source has no donor runtime dependency or future role orchestration", () => {
  const root = path.resolve(__dirname, "..", "..");
  const files = walk(path.join(root, "src", "main", "agentHarness"));
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(text, /ChampCity_GPT|CHAMPCITY_GPT|runAllowedScript|execution_toolbox|delegate_codex|delegate_local/);
    assert.doesNotMatch(text, /require\(.+ChampCity_GPT|from .+ChampCity_GPT/);
    assert.doesNotMatch(text, /pending_authorizations|approvePendingOAuthAuthorization|authorization_request_id/);
  }
});

function createWorkspace(name) {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-agent-harness-runtime-"));
  const root = path.join(container, name);
  const userDataRoot = path.join(container, "user-data");
  fs.mkdirSync(root, { recursive: true });
  execFileSync("git", ["init"], { cwd: root, stdio: "ignore" });
  fs.writeFileSync(path.join(root, "README.md"), "needle runtime\n", "utf8");
  return { root, userDataRoot };
}

async function listenOnLoopbackPort() {
  const server = http.createServer((req, res) => {
    res.writeHead(204);
    res.end();
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
  const address = server.address();
  assert.ok(address && typeof address === "object");
  return { server, port: address.port };
}

async function closeServer(server) {
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

async function getJson(url) {
  const response = await fetch(url);
  return response.json();
}

async function getResponseJson(url) {
  const response = await fetch(url, { redirect: "manual" });
  return { status: response.status, body: await response.json() };
}

async function getRedirectResponse(url) {
  const response = await fetch(url, { redirect: "manual" });
  return { status: response.status, location: response.headers.get("location") };
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return response.json();
}

async function postJsonResponse(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

async function postForm(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });
  return response.json();
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
  const authorize = await getRedirectResponse(authorizeUrl);
  assert.equal(authorize.status, 302);
  const code = new URL(authorize.location).searchParams.get("code");
  assert.ok(code);
  const token = await postForm(`${base}/oauth/token`, {
    grant_type: "authorization_code",
    client_id: registered.client_id,
    redirect_uri: "http://127.0.0.1/callback",
    code,
    code_verifier: verifier,
  });
  assert.equal(token.scope, scope);
  assert.ok(token.access_token);
  return { ...token, client_id: registered.client_id };
}

function oauthStorePath(userDataRoot) {
  return path.join(userDataRoot, "agent-harness", "oauth", "oauth-store.local.json");
}

function readOAuthStore(userDataRoot) {
  return JSON.parse(fs.readFileSync(oauthStorePath(userDataRoot), "utf8"));
}

function legacyOAuthClient(overrides = {}) {
  return {
    client_id: "champcity_legacy_client",
    redirect_uris: ["https://chatgpt.com/connector/oauth/champcity"],
    client_name: "Legacy ChatGPT Connector",
    client_uri: "https://chatgpt.com/",
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    scope: "files.read",
    created_at: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

function authorizationUrl(base, client, verifier, requestedScope = client.scope) {
  const authorizeUrl = new URL(`${base}/oauth/authorize`);
  authorizeUrl.searchParams.set("client_id", client.client_id);
  authorizeUrl.searchParams.set("redirect_uri", client.redirect_uris[0]);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("scope", requestedScope);
  authorizeUrl.searchParams.set("code_challenge", pkceChallenge(verifier));
  authorizeUrl.searchParams.set("code_challenge_method", "S256");
  return authorizeUrl;
}

function mutateLatestOAuthToken(userDataRoot, patch) {
  const target = oauthStorePath(userDataRoot);
  const store = JSON.parse(fs.readFileSync(target, "utf8"));
  assert.ok(Array.isArray(store.tokens));
  assert.ok(store.tokens.length > 0);
  store.tokens[store.tokens.length - 1] = {
    ...store.tokens[store.tokens.length - 1],
    ...patch,
  };
  fs.writeFileSync(target, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

async function postMcpInitialize(url, token) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-11-25",
        capabilities: {},
        clientInfo: { name: "oauth-expiration-test", version: "0.1.0" },
      },
    }),
  });
  return { status: response.status, body: await response.json() };
}

async function postMcpWithSession(url, sessionId, accessToken, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      authorization: `Bearer ${accessToken}`,
      "mcp-session-id": sessionId,
    },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

async function connectMcpClient(url, token) {
  const client = new Client({
    name: "champcity-ai-agent-harness-test",
    version: "0.1.0",
  }, {
    capabilities: {},
  });
  const transport = new StreamableHTTPClientTransport(new URL(url), {
    requestInit: token ? { headers: { authorization: `Bearer ${token}` } } : undefined,
  });
  await client.connect(transport);
  return { client, transport };
}

function callTool(client, name, args) {
  return client.callTool({ name, arguments: args });
}

function fetchLocalMcp(status) {
  const endpoint = new URL(status.mcpEndpoint);
  const localEndpoint = `http://${status.host}:${status.port}${endpoint.pathname}`;
  return fetch(localEndpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-11-25",
        capabilities: {},
        clientInfo: { name: "unauthorized-test", version: "0.1.0" },
      },
    }),
  });
}

function schemaHasEnumValue(schema, value) {
  if (!schema || typeof schema !== "object") {
    return false;
  }
  if (schema.const === value) {
    return true;
  }
  if (Array.isArray(schema.enum) && schema.enum.includes(value)) {
    return true;
  }
  for (const key of ["anyOf", "oneOf", "allOf"]) {
    if (Array.isArray(schema[key]) && schema[key].some((entry) => schemaHasEnumValue(entry, value))) {
      return true;
    }
  }
  return false;
}

function schemaHasUnconstrainedStringBranch(schema) {
  if (!schema || typeof schema !== "object") {
    return false;
  }
  if (schema.type === "string" && !schema.const && !Array.isArray(schema.enum)) {
    return true;
  }
  for (const key of ["anyOf", "oneOf", "allOf"]) {
    if (Array.isArray(schema[key]) && schema[key].some((entry) => schemaHasUnconstrainedStringBranch(entry))) {
      return true;
    }
  }
  return false;
}

function schemaAccepts(schema, value) {
  return schemaErrors(schema, value).length === 0;
}

function schemaErrors(schema, value) {
  if (!schema || typeof schema !== "object") {
    return [];
  }
  const errors = [];
  if (schema.const !== undefined && value !== schema.const) {
    errors.push("const");
  }
  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
    errors.push("enum");
  }
  if (schema.type === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      errors.push("object");
    } else {
      for (const required of schema.required ?? []) {
        if (value[required] === undefined) {
          errors.push(`required:${required}`);
        }
      }
      const properties = schema.properties ?? {};
      if (schema.additionalProperties === false) {
        for (const key of Object.keys(value)) {
          if (!Object.hasOwn(properties, key)) {
            errors.push(`unknown:${key}`);
          }
        }
      }
      for (const [key, propertySchema] of Object.entries(properties)) {
        if (value[key] !== undefined) {
          errors.push(...schemaErrors(propertySchema, value[key]).map((error) => `${key}.${error}`));
        }
      }
    }
  } else if (schema.type === "string" && typeof value !== "string") {
    errors.push("string");
  } else if (schema.type === "number" && (typeof value !== "number" || !Number.isFinite(value))) {
    errors.push("number");
  } else if (schema.type === "boolean" && typeof value !== "boolean") {
    errors.push("boolean");
  }
  if (Array.isArray(schema.oneOf)) {
    const matches = schema.oneOf.filter((entry) => schemaErrors(entry, value).length === 0).length;
    if (matches !== 1) {
      errors.push("oneOf");
    }
  }
  if (Array.isArray(schema.anyOf) && !schema.anyOf.some((entry) => schemaErrors(entry, value).length === 0)) {
    errors.push("anyOf");
  }
  if (Array.isArray(schema.allOf)) {
    for (const entry of schema.allOf) {
      errors.push(...schemaErrors(entry, value));
    }
  }
  return errors;
}

function walk(directory) {
  const output = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      output.push(...walk(fullPath));
    } else {
      output.push(fullPath);
    }
  }
  return output;
}
