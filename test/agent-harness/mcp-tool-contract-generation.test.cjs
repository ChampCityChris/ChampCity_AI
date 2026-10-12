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
const { randomUUID, createHash } = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");
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
      const local = tool.name === "git_toolbox" && !action.required.includes("workspaceId");
      const checkoutBound = (tool.name === "git_toolbox" && action.title !== "list_repository_checkouts" && !local) ||
        tool.name === "release_toolbox" || (tool.name === "test_toolbox" && action.title !== "status");
      assert.equal(params.required.includes("repositoryCheckoutId"), checkoutBound, `${tool.name}.${action.title} checkout boundary`);
      if (local) {
        assert.equal(action.properties.workspaceId, undefined);
        assert.equal(params.properties.repositoryCheckoutId, undefined);
        assert.equal(params.required.includes("localCheckoutHandle"), !["inspect_local_git_access", "configure_local_git_access", "select_repository_context", "inspect_repository_context", "discover_local_repositories", "init_local_repository"].includes(action.title));
      }
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

async function issueOAuthToken(base, scope, registrationScope = scope) {
  const verifier = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUV";
  const registeredResponse = await fetch(`${base}/oauth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ redirect_uris: ["http://127.0.0.1/callback"], scope: registrationScope }),
  });
  assert.equal(registeredResponse.status, 201);
  const registered = await registeredResponse.json();
  const authorizeUrl = new URL(`${base}/oauth/authorize`);
  authorizeUrl.searchParams.set("client_id", registered.client_id);
  authorizeUrl.searchParams.set("redirect_uri", "http://127.0.0.1/callback");
  authorizeUrl.searchParams.set("response_type", "code");
  if (scope !== undefined) authorizeUrl.searchParams.set("scope", scope);
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

test("LOCALGIT01 built OAuth contracts publish local targets and gate every local mutation", { timeout: 30000 }, async t => {
  const { LocalGitRepositoryAccessService } = require("../../dist/main/agentHarness/workspace/localGitRepositoryAccessService.js");
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "localgit01-oauth-"));
  const directory = path.join(container, "ordinary"); fs.mkdirSync(directory); fs.writeFileSync(path.join(directory, "source.txt"), "preserve");
  const workspaces = new RegisteredWorkspaceRegistry({ userDataRoot: path.join(container, "harness") });
  // A separate generic diagnostic workspace supplies the existing diagnostics
  // route. The local repository is never registered or enrolled.
  const diagnosticRoot = path.join(container, "diagnostics"); fs.mkdirSync(diagnosticRoot);
  const workspaceId = (await workspaces.register(diagnosticRoot)).workspaceId;
  const registry = createAgentHarnessToolRegistry({ userDataRoot: path.join(container, "harness"),
    localGitAccess: new LocalGitRepositoryAccessService(() => [container]),
    workspaceAccess: createRegisteredWorkspaceAccessProvider({ resolveWorkspaceContext: id => workspaces.resolve(id), listWorkspaceSummaries: () => workspaces.snapshot().workspaces }) });
  const runtime = await startAgentHarnessHttpRuntime({ host: "127.0.0.1", port: 0, userDataRoot: path.join(container, "harness"), registry });
  const clients = [];
  t.after(async () => { for (const client of clients) await client.close(); await runtime.close(); fs.rmSync(container, { recursive: true, force: true }); });
  const readToken = await issueOAuthToken(new URL(runtime.url).origin, "files.read");
  const { client: read } = await connectMcpClient(runtime.url, readToken.access_token); clients.push(read);
  const readTools = (await read.listTools()).tools;
  const gitDefinition = readTools.find(tool => tool.name === "git_toolbox");
  assert.ok(gitDefinition.inputSchema.oneOf.some(action => action.title === "discover_local_repositories"));
  for (const name of ["init_local_repository", "create_local_worktree", "remove_local_worktree", "stage_changes", "commit", "merge_branch"]) {
    assert.equal(gitDefinition.inputSchema.oneOf.some(action => action.title === name), false);
    const response = await read.callTool({ name: "git_toolbox", arguments: { action: name, params: { directory, initialBranch: "dev", localCheckoutHandle: "unavailable" } } });
    assert.equal(response.isError, true);
  }
  assert.equal(fs.existsSync(path.join(directory, ".git")), false);
  const fullToken = await issueOAuthToken(new URL(runtime.url).origin, "files.read files.write");
  const { client: full } = await connectMcpClient(runtime.url, fullToken.access_token); clients.push(full);
  const fullTools = (await full.listTools()).tools;
  const fullDefinition = fullTools.find(tool => tool.name === "git_toolbox");
  assert.deepEqual(fullDefinition.inputSchema, registry.listTools().find(tool => tool.name === "git_toolbox").inputSchema);
  const initialized = await full.callTool({ name: "git_toolbox", arguments: { action: "init_local_repository", params: { directory, initialBranch: "dev" } } });
  assert.equal(initialized.structuredContent.ok, true);
  const discovered = await read.callTool({ name: "git_toolbox", arguments: { action: "discover_local_repositories", params: { directory } } });
  assert.equal(discovered.structuredContent.payload.repositories[0].checkouts[0].unborn, true);
  const inventory = await full.callTool({ name: "diagnostics_toolbox", arguments: { workspaceId, action: "tool_inventory" } });
  const actions = inventory.structuredContent.payload.registry.tools.find(tool => tool.name === "git_toolbox").actions;
  for (const name of ["discover_local_repositories", "init_local_repository", "create_local_worktree", "remove_local_worktree"]) assert.ok(actions.includes(name));
  assert.equal(workspaces.snapshot().workspaces.length, 1);
  assert.equal(workspaces.snapshot().workspaces[0].workspaceId, workspaceId);
});

test("read-only public MCP inspects bounded registered Project history without changing authority", {timeout: 30_000}, async t => {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-mpsi-client-"));
  const userDataRoot = path.join(container, "harness");
  const projectRoots = [path.join(container, "Primary"), path.join(container, "Peer")];
  const {registerCurrentProject} = require("../../dist/main/projectState/currentProjectRegistrationService.js");
  const {createProjectStateEntity} = require("../../dist/shared/projectState/entityTypeRegistry.js");
  const {createSQLiteProjectStateStore} = require("../../dist/main/projectState/sqliteProjectStateStore.js");
  const workspaces = new RegisteredWorkspaceRegistry({userDataRoot});
  const principal = {principalId: "fixture", principalType: "system", role: "test"};
  const fixtures = [];
  for (const projectRoot of projectRoots) {
    fs.mkdirSync(projectRoot);
    fs.writeFileSync(path.join(projectRoot, "README.md"), "Unchanged fixture\n");
    const registration = await registerCurrentProject(projectRoot, "greenfield");
    const projectId = registration.project.id;
    const file = path.join(projectRoot, ".champcity", "project-state.sqlite");
    const store = createSQLiteProjectStateStore(file);
    const entity = (entityType, body) => createProjectStateEntity({entityType, projectId, principal, body});
    const binding = entity("SourceBinding", {workflowId: randomUUID(), sourceBaselineId: randomUUID(), preparationState: "preparing"});
    const workItemId = randomUUID();
    const attempt = entity("ImplementationAttempt", {workflowId: binding.body.workflowId, workItemId, workItemVersion: 1,
      contractId: "fixture-contract", contractDigest: "a".repeat(64), attemptState: "prepared", sourceRevisionId: "reserved-revision", sourceMode: "source-backed",
      layout: {memberIds: [binding.id, binding.body.workflowId], sources: [{entityId: binding.id, recordVersion: 1}, {entityId: workItemId, recordVersion: 1}]}});
    const items = Array.from({length: 63}, (_, i) => entity("WorkItem", {workItemKind: "feature", title: `Work ${i}`, objective: "ordinary\nSQL value", workState: "ready"}));
    const large = entity("WorkItem", {workItemKind: "feature", title: "Large", objective: "Small exact field", workState: "ready", implementationBoundaries: Array(15).fill("x".repeat(4090))});
    const secrets = entity("WorkflowIntake", {workflowId: binding.body.workflowId, workflowType: "project-creation", values: {
      apiKey: "synthetic-credential", ordinary: "ordinary\nSQL value", endpoint: "https://user:synthetic-password@example.invalid/path", local: projectRoot,
      textual: "Bearer synthetic-value", nestedText: "password=synthetic-value"}});
    const at = "2026-01-01T00:00:00.000Z";
    const relationship = {id: randomUUID(), projectId, fromEntityId: attempt.id, relationshipType: "relates_to", toEntityId: binding.id, createdAt: at, createdBy: principal};
    try {
      await store.transaction(projectId, async unit => {
        for (const record of [binding, attempt, ...items, large, secrets]) await unit.saveEntity(record, null);
        await unit.saveRelationship(relationship);
        await unit.appendStateChange({id: "00000000-0000-4000-8000-000000000001", projectId, entityId: binding.id,
          fromRecordVersion: null, toRecordVersion: 1, operation: "create", principal, occurredAt: at, changedFields: ["preparationState"], reason: "reservation", causationId: "fixture-cause", correlationId: "fixture-correlation"});
        await unit.saveEntity({...binding, recordVersion: 2, body: {...binding.body, preparationState: "ready", workSourceLineId: "work-line", currentRevisionId: "revision", repositoryCheckoutId: "checkout"}}, 1);
        await unit.appendStateChange({id: "00000000-0000-4000-8000-000000000002", projectId, entityId: binding.id,
          fromRecordVersion: 1, toRecordVersion: 2, operation: "revise", principal, occurredAt: at, changedFields: ["preparationState", "currentRevisionId"], reason: "materialization"});
        await unit.appendOutbox({id: randomUUID(), projectId, eventType: "fixture", occurredAt: at, payload: {fixture: true}});
      });
    } finally { store.close(); }
    const workspaceId = (await workspaces.register(projectRoot)).workspaceId;
    fixtures.push({projectRoot, file, projectId, workspaceId, binding, attempt, items, large, secrets, relationship});
  }
  const [f, peer] = fixtures;
  let runtime;
  const registry = createAgentHarnessToolRegistry({userDataRoot, workspaceAccess: createRegisteredWorkspaceAccessProvider({
    resolveWorkspaceContext: id => workspaces.resolve(id), listWorkspaceSummaries: () => workspaces.snapshot().workspaces,
  }), runtimeDiagnostics: () => ({toolContractDiagnostics: {registry: runtime.runtimeToolContract(), published: runtime.publishedToolContractDiagnostics()}})});
  runtime = await startAgentHarnessHttpRuntime({host: "127.0.0.1", port: 0, userDataRoot, registry, allowUnauthenticatedLocal: false});
  const clients = [];
  t.after(async () => { for (const client of clients) await client.close(); await runtime.close(); fs.rmSync(container, {recursive: true, force: true}); });
  const token = await issueOAuthToken(new URL(runtime.url).origin, "files.read");
  const connected = await connectMcpClient(runtime.url, token.access_token); clients.push(connected.client);
  let client = connected.client;
  const invoke = async (action, params = {}, workspaceId = f.workspaceId) => (await client.callTool({name: "data_toolbox", arguments: {workspaceId, action, params}})).structuredContent;
  const read = async (...args) => { const response = await invoke(...args); assert.equal(response.ok, true, JSON.stringify(response));
    assert.equal(response.payload.workspaceId, args[2] ?? f.workspaceId); assert.ok(Buffer.byteLength(JSON.stringify(response)) < 65536); return response.payload; };
  const snapshot = fixture => {
    const db = new DatabaseSync(fixture.file, {readOnly: true});
    try { return JSON.stringify(["projects", "project_versions", "state_entities", "state_entity_versions", "relationships", "state_changes", "outbox_events", "project_state_authority"].map(table => db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all())); }
    finally { db.close(); }
  };
  const contents = () => projectRoots.map(projectRoot => {
    const files = [];
    const visit = dir => { for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
      const file = path.join(dir, entry.name); if (entry.isDirectory()) visit(file); else files.push([path.relative(projectRoot, file), createHash("sha256").update(fs.readFileSync(file)).digest("hex")]);
    } }; visit(projectRoot); return files;
  });
  const before = fixtures.map(snapshot), beforeFiles = contents();
  const status = await read("status"); assert.equal(status.projectId, f.projectId); assert.equal(status.storeAvailable, true);
  assert.equal(status.capability, "bounded-read-only-project-state");
  assert.equal((await client.listTools()).tools.length, registry.listTools("files.read").length);
  assert.equal(registry.listTools().length, 35);
  const inventory = (await client.callTool({name: "diagnostics_toolbox", arguments: {workspaceId: f.workspaceId, action: "tool_inventory"}})).structuredContent;
  assert.equal(JSON.stringify(inventory).includes("list_entity_changes"), true);
  for (const entityType of ["ImplementationAttempt", "SourceBinding", "ImplementationRecord", "SourceCheckpoint", "Project"]) {
    const page = await read("list_entities", {entityType}); assert.equal(page.projectId, f.projectId);
    assert.equal(page.items.some(item => Object.hasOwn(item, "body")), false);
    if (entityType === "ImplementationAttempt") assert.equal(page.items[0].id, f.attempt.id);
    if (entityType === "SourceBinding") assert.equal(page.items[0].id, f.binding.id);
    if (entityType === "Project") assert.equal(page.items[0].id, f.projectId);
  }
  assert.deepEqual((await read("inspect_entity", {entityId: f.attempt.id})).record.body.layout.sources, f.attempt.body.layout.sources);
  const historical = await read("inspect_entity", {entityId: f.binding.id, recordVersion: 1});
  assert.equal(historical.record.body.preparationState, "preparing"); assert.equal(historical.versionSelection, "historical"); assert.equal(historical.currentRecordVersion, 2);
  assert.equal((await read("inspect_entity", {entityId: f.binding.id})).record.body.preparationState, "ready");
  const firstVersion = await read("list_entity_versions", {entityId: f.binding.id, limit: 1});
  const secondVersion = await read("list_entity_versions", {entityId: f.binding.id, limit: 1, cursor: firstVersion.nextCursor});
  assert.deepEqual([...firstVersion.items, ...secondVersion.items].map(item => item.recordVersion), [1, 2]); assert.equal(secondVersion.hasMore, false);
  const inbound = await read("list_entity_relationships", {entityId: f.binding.id, direction: "inbound", selection: "active"});
  assert.equal(inbound.items[0].fromEntityId, f.attempt.id); assert.equal(inbound.items[0].effectiveAt, f.relationship.createdAt);
  assert.equal((await read("list_entity_relationships", {entityId: f.binding.id, direction: "outbound"})).items.length, 0);
  assert.equal((await read("list_entity_relationships", {entityId: f.binding.id, selection: "ended"})).items.length, 0);
  const changes = await read("list_entity_changes", {entityId: f.binding.id, limit: 1});
  const changes2 = await read("list_entity_changes", {entityId: f.binding.id, limit: 1, cursor: changes.nextCursor});
  assert.deepEqual([...changes.items, ...changes2.items].map(item => item.reason), ["reservation", "materialization"]);
  assert.deepEqual(changes2.items[0].changedFields, ["preparationState", "currentRevisionId"]);
  assert.equal(changes.items[0].causationId, "fixture-cause"); assert.equal(changes.items[0].principal.principalId, "fixture");
  const ids = []; let cursor;
  do { const page = await read("list_entities", {entityType: "WorkItem", limit: 13, ...(cursor ? {cursor} : {})}); ids.push(...page.items.map(item => item.id)); cursor = page.nextCursor; } while (cursor);
  assert.deepEqual(ids, [...f.items, f.large].map(item => item.id).sort()); assert.equal(new Set(ids).size, ids.length);
  assert.equal((await read("inspect_entity", {entityId: randomUUID()})).status, "not-found");
  assert.equal((await read("inspect_entity", {entityId: f.binding.id, recordVersion: 99})).status, "version-not-found");
  assert.equal((await read("inspect_entity", {entityId: peer.binding.id})).status, "not-found");
  assert.equal((await read("inspect_entity", {entityId: peer.binding.id}, peer.workspaceId)).record.body.preparationState, "ready");
  const tooLarge = await read("inspect_entity", {entityId: f.large.id}); assert.equal(tooLarge.status, "response-too-large");
  const subset = await read("inspect_entity", {entityId: f.large.id, bodyFields: ["objective"]});
  assert.equal(subset.partialBody, true); assert.deepEqual(subset.record.body, {objective: "Small exact field"}); assert.ok(subset.omittedBodyFields.includes("implementationBoundaries"));
  const redacted = await read("inspect_entity", {entityId: f.secrets.id});
  assert.equal(redacted.record.body.values.ordinary, "ordinary\nSQL value");
  for (const key of ["apiKey", "endpoint", "local", "textual", "nestedText"]) { assert.equal(redacted.record.body.values[key], "[redacted]"); assert.ok(redacted.redactedFields.includes(`body.values.${key}`)); }
  for (const [action, params] of [
    ["list_entities", {entityType: "unknown"}], ["list_entities", {entityType: "WorkItem", limit: 1.5}], ["list_entities", {entityType: "WorkItem", limit: 0}], ["list_entities", {entityType: "WorkItem", limit: 51}],
    ["inspect_entity", {entityId: f.binding.id, recordVersion: 0}], ["inspect_entity", {entityId: f.binding.id, recordVersion: 1.1}],
    ["inspect_entity", {entityId: f.binding.id, projectId: peer.projectId}], ["inspect_entity", {entityId: f.binding.id, path: peer.file}],
    ["inspect_entity", {entityId: f.binding.id, bodyFields: ["missing"]}],
    ["list_entities", {entityType: "WorkItem", cursor: "invalid"}], ["list_entity_versions", {entityId: f.binding.id, cursor: changes.nextCursor}],
    ["list_entity_relationships", {entityId: f.binding.id, direction: "invalid"}],
  ]) {
    const response = await client.callTool({name: "data_toolbox", arguments: {workspaceId: f.workspaceId, action, params}});
    assert.equal(response.isError, true, `${action}: ${JSON.stringify(params)}`);
  }
  const scopedCursor = await read("list_entities", {entityType: "WorkItem", limit: 1});
  assert.equal((await invoke("list_entities", {entityType: "WorkItem", cursor: scopedCursor.nextCursor}, peer.workspaceId)).error.code, "INVALID_INPUT");
  assert.equal((await invoke("status", {}, "unregistered")).error.code, "WORKSPACE_ACCESS_DENIED");
  assert.equal((await registry.callTool({name: "data_toolbox", scope: "files.write", arguments: {workspaceId: f.workspaceId, action: "status"}})).error.code, "OAUTH_SCOPE_DENIED");
  const reconnected = await connectMcpClient(runtime.url, token.access_token); clients.push(reconnected.client); client = reconnected.client;
  assert.equal((await read("list_entities", {entityType: "WorkItem", cursor: scopedCursor.nextCursor, limit: 1})).items.length, 1);
  assert.deepEqual(fixtures.map(snapshot), before); assert.deepEqual(contents(), beforeFiles);
});


test("OAuth public MCP capture exposes candidate submission only to new full grants and persists SQL", async t => {
  const f = await require('../support/structured-architect-fixture.cjs').structuredArchitectFixture(t, {save:false});
  f.userDataRoot = path.join(f.root, 'harness-data');
  const registry = createRegistry(f);
  const runtime = await startAgentHarnessHttpRuntime({host:'127.0.0.1', port:0, userDataRoot:f.userDataRoot, registry});
  t.after(() => runtime.close());
  const base = new URL(runtime.url).origin;
  const workspaceId = resolveWorkspaceRootContext(f.root).workspaceId;
  for (const [requested, registered, expected] of [
    ['files.read','files.read','files.read'],
    [undefined,undefined,'files.read files.write'],
    [undefined,'files.read','files.read files.write'],
  ]) {
    const token = await issueOAuthToken(base, requested, registered);
    assert.equal(token.scope, expected);
    const {client,transport} = await connectMcpClient(runtime.url, token.access_token);
    try {
      const tools = (await client.listTools()).tools;
      const tool = tools.find(tool => tool.name === 'workflow_toolbox');
      const actions = tool.inputSchema.oneOf.map(branch => branch.properties.action.const);
      const available = expected === 'files.read' ? ['status'] : ['status','submit_stage_candidate'];
      assert.deepEqual(actions, available);
      t.diagnostic(JSON.stringify({grantedScope:token.scope,registrationScope:registered ?? "omitted",authorizationScope:requested ?? "omitted",workflowActions:actions,publicContractFingerprint:fingerprintAgentHarnessPublicToolDefinitions(token.scope,tools)}));
      const status = await client.callTool({name:'workflow_toolbox', arguments:{workspaceId,action:'status'}});
      assert.equal(status.structuredContent.payload.submissionAvailable, expected !== 'files.read');
      assert.deepEqual(status.structuredContent.payload.availableActions, available);
      assert.equal(status.structuredContent.payload.requiredWriteScope,'files.write');
      if (expected === 'files.read') {
        assert.match(status.structuredContent.payload.submissionRequirement,/reauthorization/);
        continue;
      }
      const result = await client.callTool({name:'workflow_toolbox', arguments:{workspaceId,action:'submit_stage_candidate',params:{workflowId:f.workflow.id,stage:'architect-interview',candidateJson:JSON.stringify(f.output)}}});
      assert.equal(result.structuredContent.ok,true,JSON.stringify(result));
      const review = await f.architect.get(f.root, f.workflow.id);
      assert.equal(review.review.cycleId, result.structuredContent.payload.reviewId);
      assert.ok(review.reviewDocument);
    } finally {await transport.close();}
  }
});
