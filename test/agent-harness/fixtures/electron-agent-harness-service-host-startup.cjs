const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { app, BrowserWindow } = require("electron");
const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StreamableHTTPClientTransport } = require("@modelcontextprotocol/sdk/client/streamableHttp.js");

const repositoryRoot = path.resolve(__dirname, "../../..");
const userDataRoot = process.env.CHAMPCITY_USER_DATA_ROOT;
if (!userDataRoot) {
  throw new Error("Service Host startup fixture requires an isolated user-data root.");
}

const backgroundIntent = require(path.join(
  repositoryRoot,
  "dist/main/agentHarness/runtime/backgroundAgentIntent.js",
));
backgroundIntent.writeBackgroundAgentExplicitStopIntent(userDataRoot, "2026-09-10T12:00:00.000Z");

process.argv.push("--agent-harness-service-host", "--agent-harness-startup");
require(path.join(repositoryRoot, "dist/main/bootstrap.js"));

const fallback = setTimeout(() => {
  process.stderr.write("Service Host startup fixture timed out.\n");
  app.exit(1);
}, 30_000);

app.whenReady()
  .then(async () => {
    const descriptorPath = path.join(userDataRoot, "agent-harness", "service-host.json");
    await waitFor(() => fs.existsSync(descriptorPath), 15_000);
    const { AgentHarnessServiceHostClient } = require(path.join(
      repositoryRoot,
      "dist/main/agentHarness/runtime/agentHarnessServiceHostClient.js",
    ));
    const client = new AgentHarnessServiceHostClient({
      userDataRoot,
      launchServiceHost: () => { throw new Error("Startup mode should own the Service Host endpoint."); },
      requestTimeoutMs: 10_000,
      discoveryTimeoutMs: 10_000,
    });
    const identity = await client.connect();
    const status = await client.status();
    const mcpClient = new Client({ name: "service-host-registry-test", version: "0.1.0" }, { capabilities: {} });
    await mcpClient.connect(new StreamableHTTPClientTransport(new URL(status.mcpEndpoint)));
    const readableWorkspaceIds = [];
    for (const workspaceId of ["project_a", "project_b"]) {
      const read = await mcpClient.callTool({
        name: "repo_toolbox",
        arguments: { workspaceId, action: "read_file", params: { relativePath: "README.md" } },
      });
      assert.equal(read.structuredContent.ok, true);
      readableWorkspaceIds.push(workspaceId);
    }
    const unknown = await mcpClient.callTool({
      name: "repo_toolbox",
      arguments: { workspaceId: "project_c", action: "read_file", params: { relativePath: "README.md" } },
    });
    assert.equal(unknown.structuredContent.error.code, "WORKSPACE_ACCESS_DENIED");
    await mcpClient.close();
    const evidence = {
      startupArgumentsPresent: process.argv.includes("--agent-harness-service-host") &&
        process.argv.includes("--agent-harness-startup"),
      chromiumHeadless: app.commandLine.hasSwitch("headless"),
      gpuDisabled: app.commandLine.hasSwitch("disable-gpu"),
      serviceHostProcessId: identity.serviceHostProcessId,
      workerProcessId: identity.workerProcessId,
      normalWindowCount: BrowserWindow.getAllWindows().length,
      agentHarnessState: status.state,
      activeWorkspaceId: status.activeWorkspaceId,
      registeredWorkspaceIds: status.registeredWorkspaceIds,
      readableWorkspaceIds,
      trayPresent: identity.trayPresent,
      stopIntentState: backgroundIntent.readBackgroundAgentIntent(userDataRoot).state,
    };
    assert.equal(evidence.serviceHostProcessId, process.pid);
    assert.equal(evidence.chromiumHeadless, false);
    assert.equal(evidence.gpuDisabled, true);
    assert.equal(evidence.normalWindowCount, 0);
    assert.equal(evidence.trayPresent, process.platform === "win32");
    assert.equal(evidence.stopIntentState, "clear");
    assert.equal(evidence.activeWorkspaceId, null);
    assert.deepEqual(evidence.registeredWorkspaceIds, ["project_a", "project_b"]);
    process.stdout.write(`AGENT_HARNESS_SERVICE_HOST_STARTUP_RESULT=${JSON.stringify(evidence)}\n`);
    await client.shutdownServiceHost();
  })
  .catch((error) => {
    process.stderr.write(`${error && error.stack ? error.stack : String(error)}\n`);
    app.exit(1);
  });

app.on("will-quit", () => {
  clearTimeout(fallback);
});

async function waitFor(predicate, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("Startup fixture condition was not satisfied within the bounded deadline.");
}
