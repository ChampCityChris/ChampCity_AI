const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { performance } = require("node:perf_hooks");
const test = require("node:test");
const { execFileSync } = require("node:child_process");
const { RegisteredWorkspaceRegistry } = require("../../dist/main/agentHarness/workspace/registeredWorkspaceRegistry.js");

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
const { AgentHarnessError } = require(path.join(root, "dist/main/core/applicationErrors.js"));
const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const {
  StreamableHTTPClientTransport,
} = require("@modelcontextprotocol/sdk/client/streamableHttp.js");

test("public MCP test execution consumes exact checkout routing before the strict child adapter", { timeout: 30_000 }, async (t) => {
  const { validationFixture } = require("../support/validation-fixture.cjs");
  const testPath = "test/checkout-routing.test.cjs";
  const fixture = validationFixture(t, { [testPath]: { source:
    "require('node:test')('checkout proof', () => require('node:assert/strict').equal(require('node:path').basename(process.cwd()), 'Dev'));" } });
  const project = fixture.root;
  const checkoutRoot = path.join(project, "Dev");
  fs.mkdirSync(checkoutRoot);
  for (const name of ["test", "validation"]) fs.renameSync(path.join(project, name), path.join(checkoutRoot, name));
  fs.cpSync(path.join(root, "scripts/validation"), path.join(checkoutRoot, "scripts/validation"), { recursive: true });
  const observedRequest = path.join(project, "child-request.json");
  // Observe the actual stdin bytes in the child, without changing the strict runner.
  // Evidence lives outside the checkout so the source-stability check stays meaningful.
  fs.appendFileSync(path.join(checkoutRoot, "scripts/validation/child-cleanup.cjs"),
    `\nif (require('node:path').basename(process.argv[1] ?? '') === 'toolbox-runner.cjs') {\n` +
    `let routingProofBody = ''; process.stdin.on('data', chunk => { routingProofBody += chunk; });\n` +
    `process.stdin.on('end', () => require('node:fs').writeFileSync(${JSON.stringify(observedRequest)}, JSON.stringify({ cwd: process.cwd(), request: JSON.parse(routingProofBody) }))); }\n`);
  const git = (...args) => execFileSync("git", args, { cwd: checkoutRoot, encoding: "utf8", windowsHide: true, stdio: ["ignore", "pipe", "pipe"] }).trim();
  git("init", "-b", "dev");
  git("-c", "user.name=MCP Test", "-c", "user.email=mcp-test@example.invalid", "add", ".");
  git("-c", "user.name=MCP Test", "-c", "user.email=mcp-test@example.invalid", "commit", "-m", "checkout routing fixture");
  const revision = git("rev-parse", "HEAD");
  const userDataRoot = path.join(project, "user-data");
  const workspaces = new RegisteredWorkspaceRegistry({ userDataRoot });
  const workspaceId = (await workspaces.register(project)).workspaceId;
  const repositoryCheckoutId = "routing-dev";
  await workspaces.registerRepositoryCheckout(workspaceId, { repositoryCheckoutId, repositoryId: "routing-repo",
    sourceLineId: "dev", role: "dev", projectRelativePath: "Dev" });
  let resolutions = 0, releases = 0;
  const registry = createAgentHarnessToolRegistry({ userDataRoot, workspaceAccess: createRegisteredWorkspaceAccessProvider({
    resolveWorkspaceContext: (id) => workspaces.resolve(id),
    listWorkspaceSummaries: () => workspaces.snapshot().workspaces,
    listRepositoryCheckoutSummaries: (id) => workspaces.listRepositoryCheckoutSummaries(id),
    resolveRepositoryCheckoutContext: async (id, checkoutId) => {
      resolutions += 1;
      const context = await workspaces.resolveRepositoryCheckoutContext(id, checkoutId);
      assert.equal(context.root, fs.realpathSync(checkoutRoot));
      return { ...context, release: () => { releases += 1; context.release(); } };
    },
  }) });
  const runtime = await startAgentHarnessHttpRuntime({ host: "127.0.0.1", port: 0, userDataRoot, registry, allowUnauthenticatedLocal: true });
  let client;
  t.after(async () => { await client?.close(); await runtime.close(); });
  ({ client } = await connectMcpClient(runtime.url));
  const invoke = async (action, params) => {
    const response = await client.callTool({ name: "test_toolbox", arguments: { workspaceId, action, params } });
    return response.structuredContent ?? response;
  };
  const missing = await invoke("run_test_file", { testPath });
  assert.equal(missing.isError, true, "MCP schema rejects a missing selector");
  const missingDispatch = await registry.callTool({ name: "test_toolbox", scope: "files.write",
    arguments: { workspaceId, action: "run_test_file", params: { testPath } } });
  assert.equal(missingDispatch.error.code, "REPOSITORY_CHECKOUT_REQUIRED");
  assert.equal(resolutions, 0);
  const unknown = await invoke("run_test_file", { repositoryCheckoutId: "unregistered", testPath });
  assert.equal(unknown.ok, false);
  assert.equal(unknown.error.code, "REPOSITORY_CHECKOUT_REQUIRED");
  assert.equal(resolutions, 1);
  const extra = await invoke("run_test_file", { repositoryCheckoutId, testPath, command: "node --test" });
  assert.equal(extra.isError, true, "MCP schema rejects arbitrary execution fields");
  const extraDispatch = await registry.callTool({ name: "test_toolbox", scope: "files.write",
    arguments: { workspaceId, action: "run_test_file", params: { repositoryCheckoutId, testPath, command: "node --test" } } });
  assert.equal(extraDispatch.error.code, "INVALID_INPUT");
  assert.equal(resolutions, 1);
  assert.equal(fs.existsSync(observedRequest), false, "invalid calls never start the adapter");
  for (const [action, executionParams] of [
    ["run_test_file", { testPath }],
    ["run_test_pattern", { testPath, testNamePattern: "checkout proof" }],
  ]) {
    const result = await invoke(action, { repositoryCheckoutId, ...executionParams });
    assert.equal(result.ok, true, JSON.stringify(result));
    const payload = result.payload;
    assert.equal(payload.status, "passed", JSON.stringify(payload));
    assert.equal(payload.executionFailed, false);
    assert.equal(payload.failureReason, null);
    assert.deepEqual(payload.selectedFiles, [testPath]);
    assert.equal(payload.sourceContext.revision, revision);
    assert.equal(payload.records[0].counts.pass, 1);
    assert.equal(payload.receipt.sourceStable, true);
    const observed = JSON.parse(fs.readFileSync(observedRequest, "utf8"));
    assert.equal(observed.cwd, fs.realpathSync(checkoutRoot));
    assert.deepEqual(observed.request, { action, params: executionParams });
    assert.equal(Object.hasOwn(observed.request.params, "repositoryCheckoutId"), false);
    t.diagnostic(JSON.stringify({ action, status: payload.status, selectedFiles: payload.selectedFiles, pass: payload.records[0].counts.pass }));
  }
  assert.equal(resolutions, 3);
  assert.equal(releases, 2, "both checkout leases are released");
  // The actual fixed child still rejects selectors and arbitrary execution fields.
  const runner = path.join(checkoutRoot, "scripts/validation/toolbox-runner.cjs");
  for (const field of [{ repositoryCheckoutId }, { command: "node --test" }]) {
    assert.throws(() => execFileSync(process.execPath, [runner], { cwd: checkoutRoot, encoding: "utf8", windowsHide: true,
      input: JSON.stringify({ action: "run_test_file", params: { testPath, ...field } }), stdio: ["pipe", "pipe", "pipe"] }),
    error => error.status === 1 && JSON.parse(error.stdout).message === "Unsupported toolbox request fields");
  }
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
  const capturedScopes = [];
  const registry = {
    listTools(scope) {
      registryCaptureCount += 1;
      capturedScopes.push(scope);
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

    const baselineContracts = runtime.publishedToolContractDiagnostics().contracts;
    for (const [scope, expectedTools] of [
      ["files.read offline_access", readTools.tools],
      ["offline_access files.write files.read offline_access", fullTools.tools],
    ]) {
      const offlineToken = await issueOAuthToken(base, scope);
      assert.ok(offlineToken.scope.endsWith("offline_access"));
      const offlineClient = await connectMcpClient(runtime.url, offlineToken.access_token);
      clients.push(offlineClient);
      assert.deepEqual((await offlineClient.client.listTools()).tools, expectedTools);
    }
    assert.equal(fullTools.tools.length, 35);
    assert.equal(registryCaptureCount, 2);

    const diagnostics = runtime.publishedToolContractDiagnostics();
    assert.equal(diagnostics.capturedScopeCount, 2);
    assert.equal(diagnostics.contractCaptureCount, 2);
    assert.equal(diagnostics.periodicContractTimerCount, 0);
    assert.equal(diagnostics.contracts.find((entry) => entry.scope === "files.read").sessionCount, 9);
    assert.equal(diagnostics.contracts.find((entry) => entry.scope === "files.read files.write").sessionCount, 2);
    assert.deepEqual(
      diagnostics.contracts.map(({ sessionCount, ...contract }) => contract),
      baselineContracts.map(({ sessionCount, ...contract }) => contract),
    );
    assert.deepEqual(capturedScopes, ["files.read files.write", "files.read"]);
    assert.equal(JSON.stringify(diagnostics).includes("offline_access"), false);
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

test("public MCP Git contract requires exact registered checkout targeting", { timeout: 30_000 }, async (t) => {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-mcp-workspace-git-"));
  let runtime;
  let client;
  t.after(async () => {
    await client?.close();
    await runtime?.close();
    fs.rmSync(container, { recursive: true, force: true });
  });
  const primary = path.join(container, "Conventional");
  const alternate = path.join(primary, "Dev");
  const notes = path.join(container, "Notes");
  const notesCheckout = path.join(notes, "Dev");
  const userDataRoot = path.join(container, "user-data");
  function git(cwd, ...args) {
    return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  }
  function initialize(root, branch) {
    fs.mkdirSync(root, { recursive: true });
    git(root, "init", "-b", branch);
    git(root, "config", "user.name", "MCP Test");
    git(root, "config", "user.email", "mcp-test@example.invalid");
    fs.writeFileSync(path.join(root, ".gitignore"), "/Dev/\n");
    fs.writeFileSync(path.join(root, "README.md"), `${branch} workspace\n`);
    git(root, "add", ".gitignore", "README.md");
    git(root, "commit", "-m", `${branch} baseline`);
  }
  initialize(primary, "main");
  git(primary, "worktree", "add", "-b", "dev", alternate, "HEAD");
  fs.writeFileSync(path.join(alternate, "README.md"), "alternate checkout\n");
  git(alternate, "commit", "-am", "alternate baseline");
  initialize(notesCheckout, "dev");
  fs.writeFileSync(path.join(notes, "README.md"), "plain notes\n");
  fs.writeFileSync(path.join(primary, "primary-only.txt"), "primary change\n");
  fs.writeFileSync(path.join(alternate, "alternate-only.txt"), "alternate change\n");
  const primaryHead = git(primary, "rev-parse", "HEAD");
  const alternateHead = git(alternate, "rev-parse", "HEAD");
  assert.notEqual(primaryHead, alternateHead);

  const workspaces = new RegisteredWorkspaceRegistry({ userDataRoot });
  const workspaceId = (await workspaces.register(primary)).workspaceId;
  const notesId = (await workspaces.register(notes)).workspaceId;
  const descriptor = { repositoryCheckoutId: "alternate", repositoryId: "conventional-repo", sourceLineId: "dev", role: "dev", projectRelativePath: "Dev" };
  let checkoutResolutions = 0;
  const registry = createAgentHarnessToolRegistry({ userDataRoot, managedWorkspaces: workspaces, workspaceAccess: createRegisteredWorkspaceAccessProvider({
    resolveWorkspaceContext: (id) => workspaces.resolve(id),
    listWorkspaceSummaries: () => workspaces.snapshot().workspaces,
    listRepositoryCheckoutSummaries: (id) => workspaces.listRepositoryCheckoutSummaries(id),
    resolveRepositoryCheckoutContext: (id, checkoutId) => {
      checkoutResolutions += 1;
      assert.notEqual(checkoutId, undefined, "omitted selector must never call the checkout resolver");
      return workspaces.resolveRepositoryCheckoutContext(id, checkoutId);
    },
  }) });
  runtime = await startAgentHarnessHttpRuntime({ host: "127.0.0.1", port: 0, userDataRoot, registry, allowUnauthenticatedLocal: true });
  ({ client } = await connectMcpClient(runtime.url));
  const published = (await client.listTools()).tools;
  const definitions = registry.listTools();
  for (const tool of published) {
    assert.deepEqual(tool.inputSchema, definitions.find((entry) => entry.name === tool.name).inputSchema);
    for (const action of tool.inputSchema.oneOf) {
      const params = action.properties.params;
      const checkoutBound = (tool.name === "git_toolbox" && action.title !== "list_repository_checkouts") ||
        tool.name === "release_toolbox" || (tool.name === "test_toolbox" && action.title !== "status");
      assert.equal(params.required.includes("repositoryCheckoutId"), checkoutBound, `${tool.name}.${action.title} checkout boundary`);
      for (const identity of ["checkoutId", "projectId", "workflowId", "workIntakeId", "sourceBaselineId", "sourceBindingId", "sourceLineId", "workItemId"]) {
        assert.equal(params.required.includes(identity), tool.name === "workflow_toolbox" && action.title === "submit_stage_candidate" && identity === "workflowId", `${tool.name}.${action.title} requires ${identity}`);
      }
      if (checkoutBound) {
        assert.deepEqual(params.properties.repositoryCheckoutId, { type: "string", minLength: 1, maxLength: 128 });
      }
    }
  }
  const gitDefinition = definitions.find((tool) => tool.name === "git_toolbox");
  async function invoke(action, params, id = workspaceId, expectedError) {
    const args = { workspaceId: id, action, ...(params === undefined ? {} : { params }) };
    assert.equal(gitDefinition.inputZodSchema.safeParse(args).success, true, action);
    const result = await client.callTool({ name: "git_toolbox", arguments: args });
    assert.equal(result.structuredContent?.ok, !expectedError, JSON.stringify(result));
    if (expectedError) assert.equal(result.structuredContent.error.code, expectedError);
    else assert.equal(result.structuredContent.workspaceId, id);
    return result.structuredContent.payload;
  }
  assert.deepEqual(await invoke("list_repository_checkouts"), []);
  const conventional = { repositoryCheckoutId: "conventional-root", repositoryId: "conventional-repo", sourceLineId: "conventional", role: "conventional", projectRelativePath: "." };
  await workspaces.registerRepositoryCheckout(workspaceId, conventional);
  const rootSelected = { repositoryCheckoutId: "conventional-root" };
  assert.match((await invoke("status", rootSelected)).shortStatus, /primary-only\.txt/);
  assert.equal((await invoke("inspect_branch_state", rootSelected)).head, primaryHead);
  assert.equal((await invoke("inspect_history", rootSelected)).resolvedCommit, primaryHead);
  await invoke("stage_changes", { ...rootSelected, paths: ["primary-only.txt"] });
  await invoke("commit", { ...rootSelected, message: "workspace-only commit" });
  const committedPrimary = git(primary, "rev-parse", "HEAD");
  assert.notEqual(committedPrimary, primaryHead);
  assert.equal(git(primary, "show", "HEAD:primary-only.txt"), "primary change");
  assert.equal(git(alternate, "rev-parse", "HEAD"), alternateHead);
  assert.equal(checkoutResolutions > 0, true);

  await workspaces.registerRepositoryCheckout(workspaceId, descriptor);
  await workspaces.registerRepositoryCheckout(notesId, { ...descriptor, repositoryCheckoutId: "notes-dev", repositoryId: "notes-repo" });
  const selected = { repositoryCheckoutId: "alternate" };
  assert.equal((await invoke("list_repository_checkouts"))[0].repositoryCheckoutId, "alternate");
  assert.equal((await invoke("status", rootSelected)).shortStatus, "");
  assert.match((await invoke("status", selected)).shortStatus, /alternate-only\.txt/);
  assert.equal((await invoke("inspect_branch_state", rootSelected)).head, committedPrimary);
  const alternateBranch = await invoke("inspect_branch_state", selected);
  assert.equal(alternateBranch.head, alternateHead);
  assert.equal(alternateBranch.currentBranch, "dev");
  await invoke("stage_changes", { ...selected, paths: ["alternate-only.txt"] });
  await invoke("commit", { ...selected, message: "selected checkout commit" });
  assert.equal(git(alternate, "show", "HEAD:alternate-only.txt"), "alternate change");
  assert.equal(git(primary, "rev-parse", "HEAD"), committedPrimary);
  assert.equal(fs.existsSync(path.join(primary, "alternate-only.txt")), false);

  const missingSelector = await registry.callTool({ name: "git_toolbox", arguments: { workspaceId: notesId, action: "status", params: {} }, scope: "files.read" });
  assert.equal(missingSelector.error.code, "REPOSITORY_CHECKOUT_REQUIRED");
  assert.equal((await invoke("list_repository_checkouts", undefined, notesId))[0].repositoryCheckoutId, "notes-dev");
  assert.equal((await invoke("status", { repositoryCheckoutId: "notes-dev" }, notesId)).gitBacked, true);
  for (const repositoryCheckoutId of ["notes-dev", "unknown", notesCheckout]) {
    await invoke("status", { repositoryCheckoutId }, workspaceId, "REPOSITORY_CHECKOUT_REQUIRED");
    await invoke("stage_changes", { repositoryCheckoutId, paths: ["README.md"] }, workspaceId, "REPOSITORY_CHECKOUT_REQUIRED");
  }
  for (const invalid of [null, "", 42, "x".repeat(129)]) {
    const args = { workspaceId, action: "status", params: { repositoryCheckoutId: invalid } };
    assert.equal(gitDefinition.inputZodSchema.safeParse(args).success, false);
    assert.equal((await registry.callTool({ name: "git_toolbox", arguments: args })).error.code,
      invalid === "x".repeat(129) ? "INVALID_INPUT" : "REPOSITORY_CHECKOUT_REQUIRED");
    assert.equal((await client.callTool({ name: "git_toolbox", arguments: args })).isError, true);
  }
  const resolutionCount = checkoutResolutions;
  for (const [name, action, params] of [
    ["repo_toolbox", "read_file", { relativePath: "README.md" }],
    ["diagnostics_toolbox", "list_workspaces", undefined],
  ]) {
    const result = await client.callTool({ name, arguments: { workspaceId: notesId, action, ...(params ? { params } : {}) } });
    assert.equal(result.structuredContent.ok, true, JSON.stringify(result));
    if (name === "repo_toolbox") assert.equal(result.structuredContent.payload.content, "plain notes\n");
  }
  assert.equal(checkoutResolutions, resolutionCount);
  await invoke("status", rootSelected);
  assert.equal(checkoutResolutions, resolutionCount + 1);
  const managed = await invoke("create_worktree_from_ref", { ...rootSelected, checkoutName: "generic", branchName: "generic", sourceRef: "HEAD" });
  assert.deepEqual(await invoke("list_repository_checkouts", undefined, managed.workspaceId), []);
  assert.equal((await invoke("inspect_worktree", { ...rootSelected, workspaceId: managed.workspaceId })).branchName, "generic");
  await invoke("inspect_worktree", { repositoryCheckoutId: "notes-dev", workspaceId: managed.workspaceId }, notesId, "GIT_EXECUTION_FAILED");
  for (const root of [primary, notes, alternate, notesCheckout]) {
    assert.equal(fs.existsSync(path.join(root, ".champcity")), false, "no application state fixture");
    assert.equal(fs.existsSync(path.join(root, "planning")), false, "no workflow fixture");
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
