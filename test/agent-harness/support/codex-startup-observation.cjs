const assert = require("node:assert/strict");
const path = require("node:path");

// Loaded only by the disposable Desktop fixture before production bootstrap.
// It observes the production utility-worker client without intercepting or delaying work.
function observeCodexStartup(repositoryRoot, mode) {
  assert.equal(mode, "eager");
  const {
    CodexRuntimeInitializerClient,
  } = require(path.join(
    repositoryRoot,
    "dist/main/workCardBuilding/codexRuntimeInitializerClient.js",
  ));
  const originalInitialize = CodexRuntimeInitializerClient.prototype.initialize;
  let client = null;
  let requestCount = 0;
  let requestedAt = null;
  let invocation = null;

  CodexRuntimeInitializerClient.prototype.initialize = function () {
    requestCount += 1;
    assert.equal(requestCount, 1, "Expected exactly one production startup initialization request.");
    client = this;
    requestedAt = Date.now();
    invocation = { startedAt: requestedAt, endedAt: null, resultClass: "pending" };
    try {
      const result = originalInitialize.call(this);
      result.then(
        () => finish(invocation, "resolved"),
        () => finish(invocation, "rejected"),
      );
      return result;
    } catch (error) {
      finish(invocation, "rejected");
      throw error;
    }
  };

  return {
    snapshot(measurement) {
      const origin = measurement.operationStartedAtMs;
      const end = origin + measurement.operationDurationMs;
      const diagnostics = client?.diagnostics() ?? null;
      const spawnedAt = diagnostics?.workerSpawnedAt ?? null;
      const exitedAt = diagnostics?.workerExitedAt ?? null;
      return {
        mode,
        requestCount,
        requestedAtMs: requestedAt === null ? null : requestedAt - origin,
        resultClass: invocation?.resultClass ?? "not-invoked",
        resultStartedAtMs: invocation ? invocation.startedAt - origin : null,
        resultEndedAtMs: invocation?.endedAt == null ? null : invocation.endedAt - origin,
        initializerWorkerProcessId: diagnostics?.lastWorkerProcessId ?? null,
        workerRequestCount: diagnostics?.requestCount ?? 0,
        workerLifecycle: diagnostics?.lifecycle ?? "not-created",
        workerSpawnedAtMs: spawnedAt === null ? null : spawnedAt - origin,
        workerResponseReceivedAtMs: diagnostics?.responseReceivedAt == null
          ? null
          : diagnostics.responseReceivedAt - origin,
        workerExitedAtMs: exitedAt === null ? null : exitedAt - origin,
        workerActiveDuringMeasurement: spawnedAt !== null && spawnedAt < end &&
          (exitedAt === null || exitedAt > origin),
      };
    },
  };
}

function finish(record, resultClass) {
  record.endedAt = Date.now();
  record.resultClass = resultClass;
}

module.exports = { observeCodexStartup };
