const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { PassThrough } = require("node:stream");
const test = require("node:test");

const {
  JsonlCodexAppServerTransport,
  buildCodexAppServerEnvironment,
  loadCodexAppServerAdapter,
} = require("../../dist/main/workCardBuilding/codexAppServerTransport.js");

test("App Server transport uses JSONL initialize, thread, turn, notifications, and user input response", async () => {
  const fake = createFakeAppServerProcess();
  const transport = new JsonlCodexAppServerTransport(() => fake.child);

  await transport.initialize();
  const thread = transport.startThread({
    workingDirectory: "<PROJECT_REPO>",
    skipGitRepoCheck: true,
    sandboxMode: "workspace-write",
    approvalPolicy: "on-request",
    approvalsReviewer: "user",
    networkAccessEnabled: true,
    writableRoots: ["<PROJECT_REPO>"],
  });
  const streamed = await thread.runStreamed("Implement the approved Work Card.");
  const iterator = streamed.events[Symbol.asyncIterator]();

  assert.deepEqual((await iterator.next()).value, { type: "turn.started" });
  assert.equal(fake.lastRequest("thread/start").params.approvalPolicy, "on-request");
  assert.equal(fake.lastRequest("thread/start").params.approvalsReviewer, "user");
  assert.equal(fake.lastRequest("thread/start").params.sandbox, "workspace-write");
  assert.equal(fake.lastRequest("thread/start").params.cwd, "<PROJECT_REPO>");
  assert.equal(fake.lastRequest("thread/start").params.serviceName, "ChampCity A/I");
  assert.equal(fake.lastRequest("turn/start").params.sandboxPolicy.type, "workspaceWrite");
  assert.deepEqual(fake.lastRequest("turn/start").params.sandboxPolicy.writableRoots, ["<PROJECT_REPO>"]);
  assert.equal(fake.lastRequest("turn/start").params.sandboxPolicy.networkAccess, true);
  assert.equal(fake.lastRequest("turn/start").params.threadId, "thread-1");
  assert.deepEqual(fake.lastRequest("turn/start").params.input, [{
    type: "text",
    text: "Implement the approved Work Card.",
    text_elements: [],
  }]);

  const approvalResponsePromise = fake.requestClient(
    "item/commandExecution/requestApproval",
    {
      threadId: "thread-1",
      turnId: "turn-1",
      itemId: "command-1",
      command: ["npm", "test"],
    },
    "server-approval-1",
  );
  await assertAutoApproval(iterator, approvalResponsePromise, {
    requestId: "server-approval-1",
    type: "command",
    decision: "accept",
    result: { decision: "accept" },
  });

  const fileApprovalResponsePromise = fake.requestClient(
    "item/fileChange/requestApproval",
    {
      threadId: "thread-1",
      turnId: "turn-1",
      itemId: "file-change-1",
      changes: [],
    },
    "server-file-approval-1",
  );
  await assertAutoApproval(iterator, fileApprovalResponsePromise, {
    requestId: "server-file-approval-1",
    type: "file-change",
    decision: "accept",
    result: { decision: "accept" },
  });

  const legacyApprovalResponsePromise = fake.requestClient(
    "applyPatchApproval",
    {
      conversationId: "thread-1",
      callId: "legacy-patch-1",
      fileChanges: {},
    },
    "server-legacy-approval-1",
  );
  await assertAutoApproval(iterator, legacyApprovalResponsePromise, {
    requestId: "server-legacy-approval-1",
    type: "file-change",
    decision: "approved",
    result: { decision: "approved" },
  });

  const legacyExecApprovalResponsePromise = fake.requestClient(
    "execCommandApproval",
    {
      conversationId: "thread-1",
      turnId: "turn-1",
      callId: "legacy-command-1",
      command: ["npm", "test"],
    },
    "server-legacy-command-approval-1",
  );
  await assertAutoApproval(iterator, legacyExecApprovalResponsePromise, {
    requestId: "server-legacy-command-approval-1",
    type: "command",
    decision: "approved",
    result: { decision: "approved" },
  });

  const permissionApprovalResponsePromise = fake.requestClient(
    "item/permissions/requestApproval",
    {
      threadId: "thread-1",
      turnId: "turn-1",
      itemId: "permission-1",
      permissions: {
        network: { targets: ["https://example.test"] },
        fileSystem: { entries: [] },
      },
    },
    "server-permission-approval-1",
  );
  await assertAutoApproval(iterator, permissionApprovalResponsePromise, {
    requestId: "server-permission-approval-1",
    type: "permission",
    decision: "grant-turn",
    result: {
    permissions: {
      network: { targets: ["https://example.test"] },
      fileSystem: { entries: [] },
    },
    scope: "turn",
    },
  });

  const foreignApprovalResponse = await fake.requestClient(
    "item/commandExecution/requestApproval",
    {
      threadId: "foreign-thread",
      turnId: "turn-1",
      itemId: "command-foreign",
      command: ["npm", "test"],
    },
    "server-foreign-approval-1",
  );
  assert.match(foreignApprovalResponse.error.message, /not owned/);

  const staleApprovalResponse = await fake.requestClient(
    "item/commandExecution/requestApproval",
    {
      threadId: "thread-1",
      turnId: "stale-turn",
      itemId: "command-stale",
      command: ["npm", "test"],
    },
    "server-stale-approval-1",
  );
  assert.match(staleApprovalResponse.error.message, /not owned/);

  const foreignLegacyExecApprovalResponse = await fake.requestClient(
    "execCommandApproval",
    {
      conversationId: "foreign-thread",
      turnId: "turn-1",
      callId: "legacy-command-foreign",
      command: ["npm", "test"],
    },
    "server-foreign-legacy-command-approval-1",
  );
  assert.match(foreignLegacyExecApprovalResponse.error.message, /not owned/);

  const foreignLegacyPatchApprovalResponse = await fake.requestClient(
    "applyPatchApproval",
    {
      conversationId: "foreign-thread",
      turnId: "turn-1",
      callId: "legacy-patch-foreign",
      fileChanges: {},
    },
    "server-foreign-legacy-patch-approval-1",
  );
  assert.match(foreignLegacyPatchApprovalResponse.error.message, /not owned/);

  let mcpElicitationResolved = false;
  const mcpElicitationResponsePromise = fake.requestClient(
    "mcpServer/elicitation/request",
    {
      threadId: "thread-1",
      turnId: "turn-1",
      serverName: "test-mcp",
      mode: "form",
      message: "Need MCP input.",
      requestedSchema: {},
      _meta: null,
    },
    "server-mcp-elicitation-1",
  ).then((response) => {
    mcpElicitationResolved = true;
    return response;
  });
  const mcpElicitationEvent = (await iterator.next()).value;

  assert.equal(mcpElicitationEvent.type, "mcp_elicitation.requested");
  assert.equal(mcpElicitationEvent.request.requestId, "server-mcp-elicitation-1");
  assert.equal(mcpElicitationEvent.request.threadId, "thread-1");
  assert.equal(mcpElicitationEvent.request.turnId, "turn-1");
  assert.equal(mcpElicitationEvent.request.serverName, "test-mcp");
  assert.equal(mcpElicitationEvent.request.mode, "form");
  assert.equal(mcpElicitationEvent.request.responseSupported, true);
  await delay(10);
  assert.equal(mcpElicitationResolved, false);

  await thread.respondToMcpElicitation("server-mcp-elicitation-1", {
    action: "accept",
    content: { answer: "Operator supplied MCP content." },
  });
  const mcpElicitationResponse = await mcpElicitationResponsePromise;

  assert.deepEqual(mcpElicitationResponse.result, {
    action: "accept",
    content: { answer: "Operator supplied MCP content." },
    _meta: null,
  });

  const unsupportedResponsePromise = fake.requestClient(
    "client/unsupported",
    {
      threadId: "thread-1",
      turnId: "turn-1",
    },
    "server-unsupported-1",
  );
  const unsupportedEvent = (await iterator.next()).value;
  const unsupportedResponse = await unsupportedResponsePromise;

  assert.equal(unsupportedEvent.type, "runtime.denial");
  assert.match(unsupportedEvent.message, /unsupported client method client\/unsupported/);
  assert.match(unsupportedResponse.error.message, /unsupported client method client\/unsupported/);

  let inputResolved = false;
  const inputResponsePromise = fake.requestClient(
    "item/tool/requestUserInput",
    {
      threadId: "thread-1",
      turnId: "turn-1",
      itemId: "tool-1",
      questions: [{
        id: "choice",
        header: "Choice",
        question: "How should Codex proceed?",
        options: [{ label: "Continue", description: "Proceed." }],
      }],
    },
    "server-input-1",
  ).then((response) => {
    inputResolved = true;
    return response;
  });
  const inputEvent = (await iterator.next()).value;

  assert.equal(inputEvent.type, "user_input.requested");
  assert.equal(inputEvent.request.questions[0].id, "choice");
  await delay(10);
  assert.equal(inputResolved, false);

  await thread.respondToUserInput("server-input-1", { choice: ["Continue"] });
  const inputResponse = await inputResponsePromise;

  assert.deepEqual(inputResponse.result, {
    answers: { choice: { answers: ["Continue"] } },
  });

  fake.notify("turn/completed", { threadId: "thread-1" });
  assert.deepEqual((await iterator.next()).value, { type: "turn.completed" });
  assert.equal((await iterator.next()).done, true);

  await transport.dispose();
}
);

test("App Server transport preserves bounded capability identities and web tool config", async () => {
  const fake = createFakeAppServerProcess({
    capabilities: {
      configRead: {
        config: {
          webSearch: true,
          tools: ["shell", "apply_patch"],
          apiKey: "must-not-appear",
        },
      },
      mcpServers: {
        statuses: [
          { name: "github", status: "running" },
          { serverName: "playwright", state: "available" },
        ],
      },
      skills: { skills: [{ name: "webapp-testing" }, { id: "security-review" }] },
      apps: { apps: [{ name: "Google Drive", enabled: true }] },
      plugins: { plugins: [{ name: "Sites", status: "installed" }] },
    },
  });
  const transport = new JsonlCodexAppServerTransport(() => fake.child);

  await transport.initialize();
  const thread = transport.startThread({ workingDirectory: "<PROJECT_REPO>" });
  await thread.runStreamed("Observe capabilities.");

  const runtimeState = transport.getRuntimeState();
  assert.deepEqual(runtimeState.capabilitySummary.mcpServers.details, [
    "github (running)",
    "playwright (available)",
  ]);
  assert.deepEqual(runtimeState.capabilitySummary.skills.details, [
    "webapp-testing",
    "security-review",
  ]);
  assert.deepEqual(runtimeState.capabilitySummary.apps.details, ["Google Drive (enabled)"]);
  assert.deepEqual(runtimeState.capabilitySummary.plugins.details, ["Sites (installed)"]);
  assert.match(runtimeState.capabilitySummary.configRead.summary, /webSearch: enabled/);
  assert.match(runtimeState.capabilitySummary.configRead.summary, /tools: shell, apply_patch/);
  assert.doesNotMatch(runtimeState.capabilitySummary.configRead.summary, /must-not-appear/);

  await transport.dispose();
});

test("App Server transport hard-denies protected ChampCity termination commands", async () => {
  const cases = [
    {
      name: "taskkill protected pid",
      method: "item/commandExecution/requestApproval",
      params: { threadId: "thread-1", turnId: "turn-1", itemId: "kill-pid", command: ["taskkill", "/PID", "4321", "/F"] },
    },
    {
      name: "taskkill protected image",
      method: "item/commandExecution/requestApproval",
      params: { threadId: "thread-1", turnId: "turn-1", itemId: "kill-image", command: ["taskkill", "/IM", "ChampCity.exe", "/F"] },
    },
    {
      name: "Stop-Process protected pid",
      method: "item/commandExecution/requestApproval",
      params: { threadId: "thread-1", turnId: "turn-1", itemId: "stop-pid", command: ["Stop-Process", "-Id", "4321"] },
    },
    {
      name: "Stop-Process protected name",
      method: "item/commandExecution/requestApproval",
      params: { threadId: "thread-1", turnId: "turn-1", itemId: "stop-name", command: ["Stop-Process", "-Name", "ChampCity"] },
    },
  ];

  for (const current of cases) {
    const fake = createFakeAppServerProcess();
    const transport = new JsonlCodexAppServerTransport(() => fake.child, {
      protectedProcess: { pid: 4321, execPath: "ChampCity.exe" },
    });

    await transport.initialize();
    const thread = transport.startThread({ workingDirectory: "<PROJECT_REPO>" });
    const streamed = await thread.runStreamed(`Protected command: ${current.name}`);
    const iterator = streamed.events[Symbol.asyncIterator]();

    assert.deepEqual((await iterator.next()).value, { type: "turn.started" });
    const responsePromise = fake.requestClient(current.method, current.params, `server-${current.name}`);
    const denialEvent = (await iterator.next()).value;
    const approvalEvent = (await iterator.next()).value;
    const response = await responsePromise;

    assert.equal(denialEvent.type, "runtime.denial");
    assert.match(denialEvent.message, /terminate the active ChampCity A\/I application/);
    assert.equal(approvalEvent.type, "approval.completed");
    assert.equal(approvalEvent.approval.type, "command");
    assert.equal(approvalEvent.approval.decision, "reject");
    assert.deepEqual(response.result, { decision: "reject" });

    fake.notify("turn/completed", { threadId: "thread-1" });
    assert.deepEqual((await iterator.next()).value, { type: "turn.completed" });
    await transport.dispose();
  }
});

test("App Server transport auto-resolves representative routine implementation approvals", async () => {
  const cases = [
    {
      name: "live wrapped npm build string",
      method: "item/commandExecution/requestApproval",
      params: { threadId: "thread-1", turnId: "turn-1", itemId: "live-build", command: "powershell.exe -Command 'npm run build'" },
      expectedType: "command",
      expectedDecision: "accept",
      expectedResult: { decision: "accept" },
    },
    {
      name: "wrapped npm build",
      method: "item/commandExecution/requestApproval",
      params: { threadId: "thread-1", turnId: "turn-1", itemId: "build", command: ["powershell.exe", "-Command", "npm run build"] },
      expectedType: "command",
      expectedDecision: "accept",
      expectedResult: { decision: "accept" },
    },
    {
      name: "npm test",
      method: "item/commandExecution/requestApproval",
      params: { threadId: "thread-1", turnId: "turn-1", itemId: "test", command: ["npm", "test"] },
      expectedType: "command",
      expectedDecision: "accept",
      expectedResult: { decision: "accept" },
    },
    {
      name: "npm ci",
      method: "item/commandExecution/requestApproval",
      params: { threadId: "thread-1", turnId: "turn-1", itemId: "ci", command: ["npm", "ci"] },
      expectedType: "command",
      expectedDecision: "accept",
      expectedResult: { decision: "accept" },
    },
    {
      name: "ordinary file change",
      method: "item/fileChange/requestApproval",
      params: { threadId: "thread-1", turnId: "turn-1", itemId: "file", changes: [{ path: "src/main/example.ts" }] },
      expectedType: "file-change",
      expectedDecision: "accept",
      expectedResult: { decision: "accept" },
    },
    {
      name: "ordinary permission",
      method: "item/permissions/requestApproval",
      params: {
        threadId: "thread-1",
        turnId: "turn-1",
        itemId: "permission",
        permissions: {
          network: { targets: ["https://registry.npmjs.org"] },
          fileSystem: { entries: [{ path: "<PROJECT_REPO>/dist" }] },
        },
      },
      expectedType: "permission",
      expectedDecision: "grant-turn",
      expectedResult: {
        permissions: {
          network: { targets: ["https://registry.npmjs.org"] },
          fileSystem: { entries: [{ path: "<PROJECT_REPO>/dist" }] },
        },
        scope: "turn",
      },
    },
  ];

  for (const current of cases) {
    const { transport, iterator, responsePromise } = await captureServerRequest({
      method: current.method,
      params: current.params,
      requestId: `server-${current.name}`,
    });

    await assertAutoApproval(iterator, responsePromise, {
      requestId: `server-${current.name}`,
      type: current.expectedType,
      decision: current.expectedDecision,
      result: current.expectedResult,
    });
    await transport.dispose();
  }
});

test("App Server transport auto-resolves non-protected process termination", async () => {
  const cases = [
    {
      name: "taskkill other pid",
      params: { threadId: "thread-1", turnId: "turn-1", itemId: "kill-other", command: ["taskkill", "/PID", "9876", "/F"] },
    },
    {
      name: "Stop-Process other name",
      params: { threadId: "thread-1", turnId: "turn-1", itemId: "stop-other", command: ["Stop-Process", "-Name", "ExampleApp"] },
    },
  ];

  for (const current of cases) {
    const { transport, iterator, responsePromise } = await captureServerRequest({
      protectedProcess: { pid: 4321, execPath: "ChampCity.exe" },
      params: current.params,
      requestId: `server-${current.name}`,
    });

    await assertAutoApproval(iterator, responsePromise, {
      requestId: `server-${current.name}`,
      type: "command",
      decision: "accept",
      result: { decision: "accept" },
    });
    await transport.dispose();
  }
});

test("App Server transport hard-denies machine shutdown restart and logoff commands", async () => {
  const cases = [
    { name: "shutdown restart", command: ["shutdown", "/r", "/t", "0"] },
    { name: "shutdown power off", command: ["shutdown", "/p"] },
    { name: "shutdown power off wrapped", command: ["cmd.exe", "/c", "shutdown /p"] },
    { name: "shutdown abort allowed", command: ["shutdown", "/a"], allowed: true },
    { name: "Restart-Computer", command: ["Restart-Computer"] },
    { name: "Stop-Computer wrapped", command: ["powershell.exe", "-Command", "Stop-Computer"] },
    { name: "logoff wrapped", command: ["cmd.exe", "/c", "logoff"] },
  ];

  for (const current of cases) {
    const { transport, iterator, responsePromise } = await captureServerRequest({
      params: {
        threadId: "thread-1",
        turnId: "turn-1",
        itemId: current.name,
        command: current.command,
      },
      requestId: `server-${current.name}`,
    });

    if (current.allowed) {
      await assertAutoApproval(iterator, responsePromise, {
        requestId: `server-${current.name}`,
        type: "command",
        decision: "accept",
        result: { decision: "accept" },
      });
    } else {
      await assertHardDenial(iterator, responsePromise, {
        requestId: `server-${current.name}`,
        reason: /restart, shut down, or log off/,
      });
    }
    await transport.dispose();
  }
});

test("App Server transport hard-denies Windows service stop restart and disable commands", async () => {
  const cases = [
    { name: "Stop-Service", command: ["Stop-Service", "Spooler"] },
    { name: "Restart-Service", command: ["Restart-Service", "Spooler"] },
    { name: "Set-Service disabled", command: ["Set-Service", "Spooler", "-StartupType", "Disabled"] },
    { name: "Set-Service stopped", command: ["Set-Service", "Spooler", "-Status", "Stopped"] },
    { name: "Set-Service stopped wrapped", command: ["powershell.exe", "-Command", "Set-Service Spooler -Status Stopped"] },
    { name: "sc stop", command: ["sc.exe", "stop", "Spooler"] },
    { name: "sc config disabled", command: ["sc.exe", "config", "Spooler", "start=", "disabled"] },
    { name: "net stop wrapped", command: ["cmd.exe", "/c", "net stop Spooler"] },
    { name: "Get-Service allowed", command: ["Get-Service", "Spooler"], allowed: true },
    { name: "sc query allowed", command: ["sc.exe", "query", "Spooler"], allowed: true },
  ];

  for (const current of cases) {
    const { transport, iterator, responsePromise } = await captureServerRequest({
      params: {
        threadId: "thread-1",
        turnId: "turn-1",
        itemId: current.name,
        command: current.command,
      },
      requestId: `server-${current.name}`,
    });

    if (current.allowed) {
      await assertAutoApproval(iterator, responsePromise, {
        requestId: `server-${current.name}`,
        type: "command",
        decision: "accept",
        result: { decision: "accept" },
      });
    } else {
      await assertHardDenial(iterator, responsePromise, {
        requestId: `server-${current.name}`,
        reason: /stop, restart, or disable a Windows service/,
      });
    }
    await transport.dispose();
  }
});

test("App Server transport reports benign stderr without runtime denial telemetry", async () => {
  const fake = createFakeAppServerProcess();
  const transport = new JsonlCodexAppServerTransport(() => fake.child);

  await transport.initialize();
  const thread = transport.startThread({ workingDirectory: "<PROJECT_REPO>" });
  const streamed = await thread.runStreamed("Warn but continue.");
  const iterator = streamed.events[Symbol.asyncIterator]();

  assert.deepEqual((await iterator.next()).value, { type: "turn.started" });
  fake.child.stderr.write("benign app-server warning\n");
  const stderrEvent = (await iterator.next()).value;

  assert.equal(stderrEvent.type, "runtime.stderr");
  assert.equal(stderrEvent.message, "benign app-server warning");

  fake.notify("turn/completed", { threadId: "thread-1" });
  assert.deepEqual((await iterator.next()).value, { type: "turn.completed" });

  await transport.dispose();
});

test("App Server adapter disposes a spawned child when initialize fails", async () => {
  const fake = createFakeAppServerProcess({ failInitialize: true });

  await assert.rejects(
    () => loadCodexAppServerAdapter(() => fake.child),
    /initialize failed/,
  );

  assert.deepEqual(fake.killSignals, ["SIGTERM"]);
});

test("App Server transport sends schema-supported turn interrupt and terminates cleanly", async () => {
  const fake = createFakeAppServerProcess();
  const transport = new JsonlCodexAppServerTransport(() => fake.child);

  await transport.initialize();
  const thread = transport.startThread({ workingDirectory: "<PROJECT_REPO>" });
  const streamed = await thread.runStreamed("Cancel me.");
  const iterator = streamed.events[Symbol.asyncIterator]();

  assert.deepEqual((await iterator.next()).value, { type: "turn.started" });
  await thread.interrupt();
  const interrupt = fake.lastRequest("turn/interrupt");

  assert.deepEqual(interrupt.params, {
    threadId: "thread-1",
    turnId: "turn-1",
  });

  fake.notify("turn/completed", { threadId: "thread-1" });
  assert.deepEqual((await iterator.next()).value, { type: "turn.completed" });

  await transport.dispose();
  assert.deepEqual(fake.killSignals, ["SIGTERM"]);
});

test("App Server transport escalates disposal kill when the child does not exit", async () => {
  const fake = createFakeAppServerProcess({ exitOnKill: false });
  const transport = new JsonlCodexAppServerTransport(() => fake.child);

  await transport.initialize();
  await transport.dispose();

  assert.deepEqual(fake.killSignals, ["SIGTERM", "SIGKILL"]);
});

test("App Server transport fails pending requests and active turns when the child exits", async () => {
  const fake = createFakeAppServerProcess({ holdCapabilities: true });
  const transport = new JsonlCodexAppServerTransport(() => fake.child);

  await transport.initialize();
  const thread = transport.startThread({ workingDirectory: "<PROJECT_REPO>" });
  const runPromise = thread.runStreamed("This turn will fail.");
  await fake.waitForMessage((message) => message.method === "thread/start");

  fake.child.emit("exit", 1, null);
  await assert.rejects(runPromise, /Codex App Server exited/);

  await transport.dispose();
});

test("App Server runtime environment inherits non-allowlisted variables and Codex home", () => {
  const env = buildCodexAppServerEnvironment({
    PATH: "refreshed-path",
    CODEX_HOME: "<CODEX_HOME>",
    CHAMPCITY_NON_ALLOWLISTED_MARKER: "kept",
  });

  assert.equal(env.PATH, "refreshed-path");
  assert.equal(env.CODEX_HOME, "<CODEX_HOME>");
  assert.equal(env.CHAMPCITY_NON_ALLOWLISTED_MARKER, "kept");
});

async function captureServerRequest({
  method = "item/commandExecution/requestApproval",
  params,
  protectedProcess,
  requestId,
}) {
  const fake = createFakeAppServerProcess();
  const transport = new JsonlCodexAppServerTransport(() => fake.child, protectedProcess ? { protectedProcess } : undefined);

  await transport.initialize();
  const thread = transport.startThread({ workingDirectory: "<PROJECT_REPO>" });
  const streamed = await thread.runStreamed("Capture approval.");
  const iterator = streamed.events[Symbol.asyncIterator]();

  assert.deepEqual((await iterator.next()).value, { type: "turn.started" });
  const responsePromise = fake.requestClient(method, params, requestId);
  return {
    iterator,
    responsePromise,
    thread,
    transport,
  };
}

async function assertAutoApproval(iterator, responsePromise, expected) {
  const event = (await iterator.next()).value;
  const response = await responsePromise;

  assert.equal(event.type, "approval.completed");
  assert.equal(event.approval.requestId, expected.requestId);
  assert.equal(event.approval.type, expected.type);
  assert.equal(event.approval.decision, expected.decision);
  assert.equal(event.approval.completed, true);
  assert.deepEqual(response.result, expected.result);
}

async function assertHardDenial(iterator, responsePromise, expected) {
  const denialEvent = (await iterator.next()).value;
  const completedEvent = (await iterator.next()).value;
  const response = await responsePromise;

  assert.equal(denialEvent.type, "runtime.denial");
  assert.match(denialEvent.message, expected.reason);
  assert.equal(completedEvent.type, "approval.completed");
  assert.equal(completedEvent.approval.requestId, expected.requestId);
  assert.equal(completedEvent.approval.type, "command");
  assert.equal(completedEvent.approval.decision, "reject");
  assert.equal(completedEvent.approval.completed, true);
  assert.deepEqual(response.result, { decision: "reject" });
}

function createFakeAppServerProcess(options = {}) {
  const stdin = new PassThrough();
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  const child = new EventEmitter();
  const outbound = [];
  const waiters = [];
  const killSignals = [];
  let buffer = "";

  Object.assign(child, {
    stdin,
    stdout,
    stderr,
    killed: false,
    kill(signal) {
      killSignals.push(signal);
      if (options.exitOnKill !== false) {
        child.killed = true;
        child.emit("exit", 0, signal);
      }
      return true;
    },
  });

  stdin.setEncoding("utf8");
  stdin.on("data", (chunk) => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }
      const message = JSON.parse(line);
      outbound.push(message);
      settleWaiters(message);
      if (message.method) {
        respondToClientRequest(message);
      }
    }
  });

  function respondToClientRequest(message) {
    switch (message.method) {
      case "initialize":
        if (options.failInitialize) {
          stdout.write(`${JSON.stringify({
            jsonrpc: "2.0",
            id: message.id,
            error: { message: "initialize failed after child spawn" },
          })}\n`);
          return;
        }
        respond(message.id, { userAgent: "fake-codex-app-server", codexHome: "<CODEX_HOME>" });
        return;
      case "thread/start":
        if (options.holdCapabilities) {
          return;
        }
        respond(message.id, {
          thread: { id: "thread-1" },
          cwd: message.params.cwd,
          model: "gpt-5-codex",
          reasoningEffort: "high",
          approvalPolicy: "on-request",
          approvalsReviewer: "user",
          sandbox: message.params.sandbox,
        });
        return;
      case "turn/start":
        respond(message.id, { turn: { id: "turn-1", status: "running" } });
        return;
      case "config/read":
        respond(message.id, options.capabilities?.configRead ?? { layers: [] });
        return;
      case "mcpServerStatus/list":
        respond(message.id, options.capabilities?.mcpServers ?? { statuses: [] });
        return;
      case "skills/list":
        respond(message.id, options.capabilities?.skills ?? { skills: [] });
        return;
      case "app/installed":
        respond(message.id, options.capabilities?.apps ?? { apps: [] });
        return;
      case "plugin/installed":
        respond(message.id, options.capabilities?.plugins ?? { plugins: [] });
        return;
      case "turn/interrupt":
        respond(message.id, {});
        return;
      default:
        return;
    }
  }

  function respond(id, result) {
    stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, result })}\n`);
  }

  function settleWaiters(message) {
    for (let index = waiters.length - 1; index >= 0; index -= 1) {
      const waiter = waiters[index];
      if (waiter.predicate(message)) {
        waiters.splice(index, 1);
        waiter.resolve(message);
      }
    }
  }

  return {
    child,
    killSignals,
    lastRequest(method) {
      const matches = outbound.filter((message) => message.method === method);
      assert.ok(matches.length > 0, `Expected ${method} request.`);
      return matches.at(-1);
    },
    notify(method, params) {
      stdout.write(`${JSON.stringify({ jsonrpc: "2.0", method, params })}\n`);
    },
    requestClient(method, params, id) {
      stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
      return this.waitForMessage((message) => message.id === id && ("result" in message || "error" in message));
    },
    waitForMessage(predicate) {
      const existing = outbound.find(predicate);
      if (existing) {
        return Promise.resolve(existing);
      }
      return new Promise((resolve) => waiters.push({ predicate, resolve }));
    },
  };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
