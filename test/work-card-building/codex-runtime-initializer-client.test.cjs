const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {
  CodexRuntimeInitializerClient,
} = require("../../dist/main/workCardBuilding/codexRuntimeInitializerClient.js");
const {
  codexRuntimeInitializerProtocolVersion,
} = require("../../dist/main/workCardBuilding/codexRuntimeInitializerProtocol.js");

const repositoryRoot = path.resolve(__dirname, "../..");

const selection = { model: "gpt-5.6-sol", reasoningEffort: "high" };
const result = {
  runtime: {
    version: "0.153.4",
    directory: path.join(process.cwd(), "managed", "candidate"),
    executable: path.join(process.cwd(), "managed", "candidate", "codex.exe"),
  },
  status: {
    version: "0.153.4",
    updateState: "updated",
    catalog: [{
      id: "picker-sol",
      model: selection.model,
      displayName: "GPT-5.6 Sol",
      description: "Sol",
      supportedReasoningEfforts: ["low", "high"],
      defaultReasoningEffort: "low",
      isDefault: false,
    }],
    selection,
    selectionBlocker: null,
    message: "Managed Codex runtime is ready.",
    busy: false,
  },
};

class FakeUtilityProcess extends EventEmitter {
  constructor(pid, onPostMessage) {
    super();
    this.pid = pid;
    this.messages = [];
    this.onPostMessage = onPostMessage;
  }

  postMessage(message) {
    this.messages.push(message);
    this.onPostMessage?.(message, this);
  }

  kill() {
    this.exit(0);
    return true;
  }

  exit(code) {
    if (this.pid === undefined) return;
    this.pid = undefined;
    this.emit("exit", code);
  }
}

test("one initializer request adopts one bounded result from a distinct worker PID", async () => {
  let forkCount = 0;
  const workerPid = process.pid + 10_000;
  const worker = new FakeUtilityProcess(workerPid, (message, current) => {
    if (message.kind !== "initialize") return;
    queueMicrotask(() => {
      current.emit("message", {
        protocolVersion: codexRuntimeInitializerProtocolVersion,
        kind: "success",
        workerProcessId: workerPid,
        result,
      });
      current.exit(0);
    });
  });
  const client = createClient(worker, () => { forkCount += 1; });
  const first = client.initialize();
  const second = client.initialize();
  assert.strictEqual(first, second);
  assert.deepEqual(await first, result);
  assert.equal(forkCount, 1);
  assert.equal(worker.messages.filter((message) => message.kind === "initialize").length, 1);
  assert.deepEqual(client.diagnostics(), {
    requestCount: 1,
    workerProcessId: null,
    lastWorkerProcessId: workerPid,
    lifecycle: "succeeded",
    workerSpawnedAt: client.diagnostics().workerSpawnedAt,
    responseReceivedAt: client.diagnostics().responseReceivedAt,
    workerExitedAt: client.diagnostics().workerExitedAt,
  });
  assert.ok(Number.isFinite(client.diagnostics().workerSpawnedAt));
  assert.ok(Number.isFinite(client.diagnostics().responseReceivedAt));
  assert.ok(Number.isFinite(client.diagnostics().workerExitedAt));
});

test("worker failure and invalid responses reject without adopting false Ready state", async () => {
  const workerPid = process.pid + 10_001;
  const worker = new FakeUtilityProcess(workerPid, (message, current) => {
    if (message.kind === "initialize") {
      queueMicrotask(() => current.emit("message", {
        protocolVersion: codexRuntimeInitializerProtocolVersion,
        kind: "failure",
        workerProcessId: workerPid,
        error: {
          code: "CODEX_RUNTIME_INITIALIZER_FAILED",
          message: "Managed Codex initialization failed in the utility worker.",
        },
      }));
    }
  });
  const client = createClient(worker);
  await assert.rejects(client.initialize(), /failed in the utility worker/);
  assert.equal(client.diagnostics().lifecycle, "failed");
  assert.equal(worker.pid, undefined);
});

test("shutdown during initialization requests cancellation and confirms worker exit", async () => {
  const workerPid = process.pid + 10_002;
  const worker = new FakeUtilityProcess(workerPid, (message, current) => {
    if (message.kind === "shutdown") queueMicrotask(() => current.exit(0));
  });
  const client = createClient(worker);
  const initialization = client.initialize();
  while (client.diagnostics().requestCount === 0) {
    await new Promise((resolve) => setImmediate(resolve));
  }
  await client.shutdown();
  await assert.rejects(initialization, /exited before producing a result/);
  assert.deepEqual(worker.messages.map((message) => message.kind), ["initialize", "shutdown"]);
  assert.equal(worker.pid, undefined);
  assert.equal(client.diagnostics().lifecycle, "closed");
});

test("production startup has one worker-owned shared initialization algorithm and bounded main adoption", () => {
  const main = readSource("src/main/main.ts");
  const manager = readSource("src/main/workCardBuilding/codexRuntimeManager.ts");
  const algorithm = readSource("src/main/workCardBuilding/codexRuntimeInitialization.ts");
  const client = readSource("src/main/workCardBuilding/codexRuntimeInitializerClient.ts");
  const worker = readSource("src/main/workCardBuilding/codexRuntimeInitializerWorker.ts");
  const protocol = readSource("src/main/workCardBuilding/codexRuntimeInitializerProtocol.ts");

  assert.match(main, /new CodexRuntimeInitializerClient/);
  assert.match(main, /createCodexRuntimeExecutionOperations/);
  assert.doesNotMatch(main, /createCodexRuntimeOperations/);
  assert.match(client, /utilityProcess\.fork/);
  assert.match(client, /serviceName: "ChampCity A\/I Managed Codex Initializer"/);
  assert.match(worker, /createCodexRuntimeOperations\(request\.userDataRoot\)/);
  assert.match(worker, /initializeManagedCodexRuntime\(operations\)/);
  assert.doesNotMatch(manager, /\.latestVersion\(|\.stage\(|\.bootstrap\(|\.probe\(|\.promote\(/);
  assert.match(manager, /adoptInitializationResult/);
  assert.match(algorithm, /operations\.latestVersion\(\)/);
  assert.match(algorithm, /operations\.stage\(latest\)/);
  assert.match(algorithm, /operations\.probe\(candidate\)/);
  assert.match(algorithm, /operations\.promote\(candidate\)/);
  assert.match(protocol, /kind: "initialize"/);
  assert.match(protocol, /kind: "success"/);
  assert.match(protocol, /kind: "failure"/);
  assert.match(protocol, /kind: "shutdown"/);
});

function createClient(worker, onFork = () => undefined) {
  return new CodexRuntimeInitializerClient({
    workerEntryPath: path.join(process.cwd(), "dist", "main", "workCardBuilding", "codexRuntimeInitializerWorker.js"),
    userDataRoot: path.join(process.cwd(), "test-user-data"),
    initializationTimeoutMs: 1_000,
    spawnTimeoutMs: 100,
    shutdownTimeoutMs: 100,
    forkWorker: () => {
      onFork();
      return worker;
    },
  });
}

function readSource(relativePath) {
  return fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");
}
