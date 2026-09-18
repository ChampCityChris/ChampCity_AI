const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StreamableHTTPServerTransport } = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  McpError,
} = require("@modelcontextprotocol/sdk/types.js");
const {
  ExternalProviderGateway,
} = require("../../dist/main/externalProviders/externalProviderGateway.js");
const {
  ExternalProviderRegistry,
} = require("../../dist/main/externalProviders/externalProviderRegistry.js");
const {
  ExternalProviderAuthenticationRegistry,
  SdkExternalMcpSessionFactory,
} = require("../../dist/main/externalProviders/externalMcpTransport.js");

test("provider registry rejects duplicate and unknown provider identities", () => {
  const registry = new ExternalProviderRegistry();
  registry.register(definition({ providerId: "registered" }));

  assert.throws(
    () => registry.register(definition({ providerId: "registered" })),
    /already registered/,
  );
  assert.throws(
    () => registry.require("missing"),
    (error) => error.kind === "unknown-provider" && error.providerId === "missing",
  );
});

test("provider registration requires credentials to use a secure strategy reference", () => {
  const registry = new ExternalProviderRegistry();
  assert.throws(
    () => registry.register(definition({
      providerId: "unsafe-header",
      transport: {
        kind: "streamable-http",
        endpoint: "http://127.0.0.1:3000/mcp",
        fixedHeaders: { Authorization: "Bearer should-not-be-here" },
      },
    })),
    /registered authentication strategy/,
  );
  assert.throws(
    () => registry.register(definition({
      providerId: "unsafe-url",
      transport: {
        kind: "streamable-http",
        endpoint: "http://127.0.0.1:3000/mcp?access_token=should-not-be-here",
      },
    })),
    /must not contain credentials/,
  );
});

test("not-configured providers report truthful unknown capabilities and fail closed", async () => {
  const gateway = new ExternalProviderGateway();
  gateway.register(definition({
    providerId: "disabled",
    configured: false,
    transport: null,
  }));

  const status = gateway.getStatus("disabled");
  assert.equal(status.configuration, "not-configured");
  assert.equal(status.capabilities[0].availability, "unknown");
  await assert.rejects(
    gateway.discover("disabled"),
    (error) => error.kind === "not-configured",
  );
});

test("stdio gateway discovers, invokes, attributes, and closes a synthetic MCP provider", async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-external-stdio-"));
  const logPath = path.join(tempRoot, "events.jsonl");
  const gateway = new ExternalProviderGateway();
  gateway.register(definition({
    providerId: "stdio-proof",
    transport: {
      kind: "stdio",
      command: process.execPath,
      args: [path.join(__dirname, "..", "fixtures", "fake-winget-mcp-server.cjs"), logPath],
      cwd: process.cwd(),
    },
    adapter: adapterFor({ "package.search": "find" }),
  }));

  const receipt = await gateway.invokeCapability("stdio-proof", "package.search", { query: "cmake" });

  assert.equal(receipt.providerId, "stdio-proof");
  assert.equal(receipt.capabilityId, "package.search");
  assert.equal(receipt.toolName, "find");
  assert.equal(receipt.capabilityGeneration, 1);
  assert.equal(gateway.getStatus("stdio-proof").transport, "not-connected");
  const events = fs.readFileSync(logPath, "utf8").trim().split(/\r?\n/).map(JSON.parse);
  assert.deepEqual(events.map((event) => event.event), [
    "initialized",
    "tools/list",
    "tools/call",
    "close",
  ]);
});

test("Streamable HTTP gateway applies fixed configuration, filters tools, discovers resources, invokes, and closes", async (t) => {
  const provider = await startSyntheticHttpProvider();
  t.after(() => provider.close());
  const gateway = new ExternalProviderGateway();
  gateway.register(definition({
    providerId: "http-proof",
    transport: {
      kind: "streamable-http",
      endpoint: provider.endpoint,
      fixedHeaders: { "x-champcity-toolset": "bounded-proof" },
    },
    nativeToolFilter: { tools: ["echo"], toolsets: ["proof"] },
    adapter: adapterFor({ "example.echo": "echo", "example.hidden": "hidden" }),
  }));

  const receipt = await gateway.invokeCapability("http-proof", "example.echo", { value: "hello" });
  await new Promise((resolve) => setImmediate(resolve));
  const status = gateway.getStatus("http-proof");

  assert.equal(receipt.toolName, "echo");
  assert.match(JSON.stringify(receipt.result), /hello/);
  assert.deepEqual(status.discoveredToolNames, ["echo"]);
  assert.equal(status.discoveredResourceCount, 1);
  assert.equal(capability(status, "example.echo").availability, "available");
  assert.equal(capability(status, "example.hidden").availability, "unavailable");
  assert.equal(status.transport, "not-connected");
  assert.equal(provider.requests.every((request) => request.headers["x-champcity-toolset"] === "bounded-proof"), true);
  assert.equal(provider.methods.includes("tools/list"), true);
  assert.equal(provider.methods.includes("resources/list"), true);
  assert.equal(provider.methods.includes("tools/call"), true);
  assert.equal(provider.closedRequestTransports > 0, true);
});

test("missing filtered capability is unavailable instead of inferred from an undiscovered tool", async () => {
  const factory = fakeSessionFactory([{ tools: [tool("allowed"), tool("hidden")] }]);
  const gateway = new ExternalProviderGateway({ sessionFactory: factory });
  gateway.register(definition({
    providerId: "filtered",
    lifecycle: "persistent",
    nativeToolFilter: { tools: ["allowed"] },
    adapter: adapterFor({ "thing.read": "allowed", "thing.write": "hidden" }),
  }));

  const status = await gateway.discover("filtered");
  assert.deepEqual(status.discoveredToolNames, ["allowed"]);
  assert.equal(capability(status, "thing.read").availability, "available");
  assert.equal(capability(status, "thing.write").availability, "unavailable");
  await assert.rejects(
    gateway.invokeCapability("filtered", "thing.write", {}),
    (error) => error.kind === "capability-unavailable",
  );
  await gateway.shutdown();
});

test("adapter cannot invoke a different or undiscovered provider tool", async () => {
  const factory = fakeSessionFactory([{ tools: [tool("allowed"), tool("other")] }]);
  const maliciousAdapter = adapterFor({ "thing.read": "allowed" });
  maliciousAdapter.prepareInvocation = () => ({ toolName: "other", arguments: {} });
  const gateway = new ExternalProviderGateway({ sessionFactory: factory });
  gateway.register(definition({ providerId: "fail-closed", adapter: maliciousAdapter }));

  await assert.rejects(
    gateway.invokeCapability("fail-closed", "thing.read", {}),
    (error) => error.kind === "undiscovered-tool",
  );
  assert.equal(factory.calls.length, 0);
});

test("timeout and cancellation remain distinguishable", async () => {
  const timeoutFactory = fakeSessionFactory([{
    tools: [tool("echo")],
    invokeError: new McpError(ErrorCode.RequestTimeout, "late provider response"),
  }]);
  const timeoutGateway = new ExternalProviderGateway({ sessionFactory: timeoutFactory });
  timeoutGateway.register(definition({ providerId: "timeout", adapter: adapterFor({ "thing.read": "echo" }) }));
  await assert.rejects(
    timeoutGateway.invokeCapability("timeout", "thing.read", {}),
    (error) => error.kind === "timeout",
  );

  const cancellationFactory = fakeSessionFactory([{
    tools: [tool("echo")],
    invokeError: Object.assign(new Error("operation aborted"), { name: "AbortError" }),
  }]);
  const cancellationGateway = new ExternalProviderGateway({ sessionFactory: cancellationFactory });
  cancellationGateway.register(definition({ providerId: "cancelled", adapter: adapterFor({ "thing.read": "echo" }) }));
  await assert.rejects(
    cancellationGateway.invokeCapability("cancelled", "thing.read", {}),
    (error) => error.kind === "cancelled",
  );
});

test("authentication-required status never exposes secure headers or echoed secrets", async (t) => {
  const secret = "gateway-secret-value";
  const authServer = http.createServer((request, response) => {
    response.writeHead(401, { "content-type": "text/plain" });
    response.end(`Unauthorized ${request.headers.authorization}`);
  });
  await listen(authServer);
  t.after(() => closeHttpServer(authServer));
  const authentication = new ExternalProviderAuthenticationRegistry();
  authentication.register({
    reference: "secure-test-reference",
    async resolve() {
      return { headers: { Authorization: `Bearer ${secret}` } };
    },
  });
  const gateway = new ExternalProviderGateway({
    sessionFactory: new SdkExternalMcpSessionFactory(authentication),
  });
  gateway.register(definition({
    providerId: "auth-proof",
    authenticationStrategyReference: "secure-test-reference",
    transport: {
      kind: "streamable-http",
      endpoint: endpointFor(authServer),
    },
  }));

  await assert.rejects(
    gateway.discover("auth-proof"),
    (error) => error.kind === "authentication-required" && !error.message.includes(secret),
  );
  const serializedStatus = JSON.stringify(gateway.getStatus("auth-proof"));
  assert.equal(gateway.getStatus("auth-proof").readiness, "authentication-required");
  assert.equal(serializedStatus.includes(secret), false);
  assert.equal(serializedStatus.includes("Authorization"), false);
});

test("malformed results and provider-declared errors have distinct failure kinds", async () => {
  const malformedFactory = fakeSessionFactory([{
    tools: [tool("echo")],
    result: { content: [] },
  }]);
  const strictAdapter = adapterFor({ "thing.read": "echo" });
  strictAdapter.validateResult = (_capabilityId, result) => Boolean(result.content?.[0]?.text);
  const malformedGateway = new ExternalProviderGateway({ sessionFactory: malformedFactory });
  malformedGateway.register(definition({ providerId: "malformed", adapter: strictAdapter }));
  await assert.rejects(
    malformedGateway.invokeCapability("malformed", "thing.read", {}),
    (error) => error.kind === "malformed-result",
  );

  const providerErrorFactory = fakeSessionFactory([{
    tools: [tool("echo")],
    result: { isError: true, content: [{ type: "text", text: "provider refused" }] },
  }]);
  const providerErrorGateway = new ExternalProviderGateway({ sessionFactory: providerErrorFactory });
  providerErrorGateway.register(definition({ providerId: "provider-error", adapter: adapterFor({ "thing.read": "echo" }) }));
  await assert.rejects(
    providerErrorGateway.invokeCapability("provider-error", "thing.read", {}),
    (error) => error.kind === "provider-error",
  );
});

test("bounded receipts redact likely secrets", async () => {
  const factory = fakeSessionFactory([{
    tools: [tool("echo")],
    result: {
      content: [{ type: "text", text: "Authorization: Bearer receipt-secret" }],
      access_token: "receipt-secret",
    },
  }]);
  const gateway = new ExternalProviderGateway({ sessionFactory: factory });
  gateway.register(definition({ providerId: "redaction", adapter: adapterFor({ "thing.read": "echo" }) }));

  const receipt = await gateway.invokeCapability("redaction", "thing.read", {});
  const serialized = JSON.stringify(receipt);
  assert.equal(serialized.includes("receipt-secret"), false);
  assert.match(serialized, /REDACTED/);
});

test("reconnect closes the old persistent session and refreshes capability generation without stale tools", async () => {
  const factory = fakeSessionFactory([
    { tools: [tool("echo")] },
    { tools: [tool("replacement")] },
  ]);
  const gateway = new ExternalProviderGateway({ sessionFactory: factory });
  gateway.register(definition({
    providerId: "refresh",
    lifecycle: "persistent",
    adapter: adapterFor({ "thing.read": "echo" }),
  }));

  const first = await gateway.discover("refresh");
  const second = await gateway.reconnect("refresh");

  assert.equal(first.capabilityGeneration, 1);
  assert.equal(capability(first, "thing.read").availability, "available");
  assert.equal(second.capabilityGeneration, 2);
  assert.equal(capability(second, "thing.read").availability, "unavailable");
  assert.deepEqual(second.discoveredToolNames, ["replacement"]);
  assert.equal(factory.sessions[0].closed, true);
  await gateway.shutdown();
  assert.equal(factory.sessions[1].closed, true);
  const shutdownStatus = gateway.getStatus("refresh");
  assert.equal(shutdownStatus.discovery, "not-attempted");
  assert.equal(shutdownStatus.capabilities[0].availability, "unknown");
});

function definition(overrides = {}) {
  return {
    providerId: "example",
    displayName: "Example Provider",
    configured: true,
    transport: { kind: "stdio", command: process.execPath, args: [] },
    lifecycle: "ephemeral",
    requestTimeoutMs: 1_000,
    adapter: adapterFor({ "example.echo": "echo" }),
    ...overrides,
  };
}

function adapterFor(capabilityTools) {
  return {
    capabilityIds: Object.keys(capabilityTools),
    mapCapabilities(discovery) {
      const names = new Set(discovery.tools.map((entry) => entry.name));
      return Object.entries(capabilityTools).map(([capabilityId, toolName]) => ({
        capabilityId,
        availability: names.has(toolName) ? "available" : "unavailable",
        toolName: names.has(toolName) ? toolName : undefined,
      }));
    },
    prepareInvocation({ capability, request }) {
      return {
        toolName: capability.toolName,
        arguments: request && typeof request === "object" ? request : {},
      };
    },
    validateResult(_capabilityId, result) {
      return Boolean(result && typeof result === "object" && Array.isArray(result.content));
    },
  };
}

function capability(status, capabilityId) {
  return status.capabilities.find((entry) => entry.capabilityId === capabilityId);
}

function tool(name) {
  return { name, inputSchema: { type: "object" } };
}

function fakeSessionFactory(generations) {
  const factory = {
    sessions: [],
    calls: [],
    async createSession() {
      const specification = generations[Math.min(factory.sessions.length, generations.length - 1)];
      const session = {
        closed: false,
        async connect() {},
        async discover() {
          return { tools: specification.tools ?? [], resourceCount: specification.resourceCount ?? 0 };
        },
        async invokeTool(name, args) {
          factory.calls.push({ name, args });
          if (specification.invokeError) throw specification.invokeError;
          return specification.result ?? { content: [{ type: "text", text: "ok" }] };
        },
        async close() {
          session.closed = true;
        },
      };
      factory.sessions.push(session);
      return session;
    },
  };
  return factory;
}

async function startSyntheticHttpProvider() {
  const state = {
    requests: [],
    methods: [],
    closedRequestTransports: 0,
  };
  const server = http.createServer(async (request, response) => {
    state.requests.push({ method: request.method, headers: request.headers });
    if (request.method === "GET") {
      response.writeHead(405, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "Method not allowed" }));
      return;
    }
    if (request.method === "DELETE") {
      response.writeHead(200).end();
      return;
    }
    const body = await readJsonBody(request);
    if (body?.method) state.methods.push(body.method);
    const mcpServer = new Server(
      { name: "synthetic-http-provider", version: "1.0.0" },
      { capabilities: { tools: {}, resources: {} } },
    );
    mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        { name: "echo", inputSchema: { type: "object" } },
        { name: "hidden", inputSchema: { type: "object" } },
      ],
    }));
    mcpServer.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [{ uri: "test://resource", name: "Synthetic resource" }],
    }));
    mcpServer.setRequestHandler(CallToolRequestSchema, async (mcpRequest) => ({
      content: [{ type: "text", text: String(mcpRequest.params.arguments?.value ?? "") }],
    }));
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    response.once("finish", () => {
      state.closedRequestTransports += 1;
      void transport.close();
      void mcpServer.close();
    });
    try {
      await mcpServer.connect(transport);
      await transport.handleRequest(request, response, body);
    } catch (error) {
      if (!response.headersSent) {
        response.writeHead(500, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: String(error) }));
      }
    }
  });
  await listen(server);
  return {
    requests: state.requests,
    methods: state.methods,
    get closedRequestTransports() {
      return state.closedRequestTransports;
    },
    endpoint: endpointFor(server),
    close: () => closeHttpServer(server),
  };
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => { body += chunk; });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : undefined);
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
}

function endpointFor(server) {
  const address = server.address();
  return `http://127.0.0.1:${address.port}/mcp`;
}

function closeHttpServer(server) {
  server.closeAllConnections?.();
  return new Promise((resolve) => server.close(resolve));
}
