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
const {createRuntime,createRegistry,createWorkspace,initializeSession,postSessionRequest,deleteSession,openSessionStream,closeSessionStreams,pickSessionDiagnostics,mcpHeaders,listToolsRequest,callToolRequest,issueOAuthToken,postJson,deferred,waitFor}=require("../support/mcp-session-fixture.cjs");


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
