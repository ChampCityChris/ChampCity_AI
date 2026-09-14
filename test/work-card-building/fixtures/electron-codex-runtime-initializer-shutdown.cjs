const assert = require("node:assert/strict");
const path = require("node:path");
const { app } = require("electron");

const repositoryRoot = path.resolve(__dirname, "../../..");
const userDataRoot = process.env.CHAMPCITY_USER_DATA_ROOT;
if (!userDataRoot) {
  throw new Error("Managed Codex initializer shutdown fixture requires an isolated user-data root.");
}

app.setPath("userData", path.resolve(userDataRoot));
app.commandLine.appendSwitch("headless");
app.commandLine.appendSwitch("disable-gpu");

let fallback = setTimeout(() => {
  process.stderr.write("Managed Codex initializer shutdown fixture timed out.\n");
  app.exit(1);
}, 30_000);

void app.whenReady()
  .then(async () => {
    const {
      CodexRuntimeInitializerClient,
    } = require(path.join(
      repositoryRoot,
      "dist/main/workCardBuilding/codexRuntimeInitializerClient.js",
    ));
    const client = new CodexRuntimeInitializerClient({
      workerEntryPath: path.join(
        repositoryRoot,
        "dist/main/workCardBuilding/codexRuntimeInitializerWorker.js",
      ),
      userDataRoot,
      initializationTimeoutMs: 20_000,
      shutdownTimeoutMs: 5_000,
    });
    const initialization = client.initialize();
    const active = await waitForActiveWorker(client);
    const workerProcessId = active.lastWorkerProcessId;
    assert.ok(workerProcessId);
    assert.notEqual(workerProcessId, process.pid);
    await client.shutdown();
    const resultClass = await initialization.then(() => "resolved", () => "rejected");
    const terminal = client.diagnostics();
    assert.equal(terminal.workerProcessId, null);
    assert.equal(terminal.lifecycle, "closed");
    process.stdout.write(`CODEX_RUNTIME_INITIALIZER_SHUTDOWN_RESULT=${JSON.stringify({
      desktopProcessId: process.pid,
      workerProcessId,
      requestCount: terminal.requestCount,
      initializationResultClass: resultClass,
      clientLifecycle: terminal.lifecycle,
    })}\n`);
    app.exit(0);
  })
  .catch((error) => {
    process.stderr.write(`${error && error.stack ? error.stack : String(error)}\n`);
    app.exit(1);
  });

app.on("will-quit", () => {
  clearTimeout(fallback);
  fallback = null;
});

async function waitForActiveWorker(client) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const diagnostics = client.diagnostics();
    if (diagnostics.requestCount === 1 && diagnostics.workerProcessId) {
      return diagnostics;
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.fail("Managed Codex initializer worker did not become active.");
}
