const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("../support/windows-test.cjs");

const repositoryRoot = path.resolve(__dirname, "../..");
const electronPath = require("electron");

test("real Electron shutdown cancels an in-flight initializer and leaves no utility worker", { timeout: 45_000 }, async (context) => {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-codex-initializer-shutdown-"));
  const userDataRoot = path.join(container, "user-data");
  try {
    const result = await runFixture(userDataRoot);
    assert.equal(result.exitCode, 0, result.stderr);
    const match = result.stdout.match(/CODEX_RUNTIME_INITIALIZER_SHUTDOWN_RESULT=(\{.*\})/);
    assert.ok(match, result.stdout);
    const evidence = JSON.parse(match[1]);
    assert.notEqual(evidence.desktopProcessId, evidence.workerProcessId);
    assert.equal(evidence.requestCount, 1);
    assert.equal(evidence.initializationResultClass, "rejected");
    assert.equal(evidence.clientLifecycle, "closed");
    assert.equal(processExists(evidence.workerProcessId), false);
    context.diagnostic(
      `bounded initializer shutdown evidence: desktop ${evidence.desktopProcessId}, utility worker ${evidence.workerProcessId}, one request, confirmed worker exit`,
    );
  } finally {
    fs.rmSync(container, { recursive: true, force: true });
  }
});

function runFixture(userDataRoot) {
  const environment = { ...process.env, CHAMPCITY_USER_DATA_ROOT: userDataRoot };
  delete environment.ELECTRON_RUN_AS_NODE;
  return new Promise((resolve, reject) => {
    const child = spawn(electronPath, [path.join(
      repositoryRoot,
      "test/work-card-building/fixtures/electron-codex-runtime-initializer-shutdown.cjs",
    )], {
      cwd: repositoryRoot,
      env: environment,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error("Managed Codex initializer shutdown fixture exceeded its deadline."));
    }, 35_000);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once("exit", (exitCode) => {
      clearTimeout(timeout);
      resolve({ exitCode, stdout, stderr });
    });
  });
}

function processExists(processId) {
  try {
    process.kill(processId, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
}
