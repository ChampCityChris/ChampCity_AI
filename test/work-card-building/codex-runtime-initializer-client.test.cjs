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

test("initializer worker executes maintenance once and manager adopts its result without rerunning maintenance", async () => {
  const vm = require("node:vm");
  const { createRequire } = require("node:module");
  const { CodexRuntimeManager } = require("../../dist/main/workCardBuilding/codexRuntimeManager.js");
  const entry = path.join(repositoryRoot, "dist/main/workCardBuilding/codexRuntimeInitializerWorker.js");
  const nativeRequire = createRequire(entry);
  const calls = [];
  const userDataRoot = path.join(repositoryRoot, "fixture-user-data");
  const operations = {
    readSelection: async () => { calls.push("selection"); return selection; },
    loadCurrent: async () => { calls.push("current"); return null; },
    latestVersion: async () => { calls.push("latest"); return result.runtime.version; },
    stage: async (version) => { calls.push(["stage", version]); return result.runtime; },
    probe: async (runtime) => { calls.push(["probe", runtime]); return result.status.catalog; },
    promote: async (runtime) => { calls.push(["promote", runtime]); },
    bootstrap: async () => assert.fail("Unexpected fallback"),
    shutdown: async () => { calls.push("shutdown"); },
  };
  const workerProcess = new EventEmitter();
  workerProcess.pid = process.pid + 10003;
  workerProcess.parentPort = new EventEmitter();
  const messages = [];
  workerProcess.parentPort.postMessage = (message) => messages.push(message);
  let finish;
  const exited = new Promise((resolve) => { finish = resolve; });
  workerProcess.exit = finish;
  vm.runInNewContext(fs.readFileSync(entry, "utf8"), {
    exports: {}, process: workerProcess, setImmediate,
    require: (id) => id === "./codexRuntimeOperations" ? {
      createCodexRuntimeOperations: (root) => { assert.equal(root, userDataRoot); calls.push("operations"); return operations; },
    } : nativeRequire(id),
  });
  workerProcess.parentPort.emit("message", { data: { protocolVersion: -1, kind: "initialize", userDataRoot: "ignored" } });
  assert.deepEqual(calls, []);
  workerProcess.parentPort.emit("message", { data: { protocolVersion: codexRuntimeInitializerProtocolVersion, kind: "initialize", userDataRoot } });
  assert.equal(await exited, 0);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].kind, "success");
  assert.equal(messages[0].workerProcessId, workerProcess.pid);
  assert.deepEqual(calls, ["operations", "selection", "current", "latest", ["stage", result.runtime.version], ["probe", result.runtime], ["promote", result.runtime], "shutdown"]);
  const manager = new CodexRuntimeManager();
  let initialized = 0;
  const initializer = { initialize: async () => { initialized += 1; return messages[0].result; }, shutdown: async () => {} };
  const execution = new Proxy({ writeSelection: async () => {}, launch: async () => "launched" }, {
    get: (target, key) => { if (["latestVersion", "stage", "bootstrap", "probe", "promote"].includes(key)) assert.fail(`Main ran ${key}`); return target[key]; },
  });
  await Promise.all([manager.initialize(initializer, execution), manager.initialize(initializer, execution)]);
  assert.equal(initialized, 1);
  assert.deepEqual(manager.getStatus(), result.status);
  assert.equal(await manager.launch(), "launched");
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
