const assert = require("node:assert/strict");
const { performance } = require("node:perf_hooks");

// Keep REPAIR02's 10 ms cadence, boundary-inclusive maximum-gap math, and
// repeat-until-duration/count search semantics identical for both loaded owners.
async function measureHeartbeat(loadClient = null) {
  const cpuUsageStart = process.cpuUsage();
  const resourceUsageStart = readResourceUsage();
  const eventLoopStart = typeof performance.eventLoopUtilization === "function"
    ? performance.eventLoopUtilization()
    : null;
  const heartbeatTimestampsMs = [];
  const operationStartedAt = Date.now();
  const heartbeat = setInterval(() => {
    heartbeatTimestampsMs.push(Date.now() - operationStartedAt);
  }, 10);
  let broadSearch = { ok: false, matchCount: null };
  let searchCount = 0;
  let operationCompletedAt;
  try {
    if (loadClient) {
      do {
        broadSearch = await loadClient.search(searchCount + 1);
        searchCount += 1;
        assert.equal(broadSearch.ok, true);
        assert.equal(broadSearch.matchCount, 1);
      } while (
        (Date.now() - operationStartedAt < 500 || heartbeatTimestampsMs.length < 20) &&
        searchCount < 32
      );
    } else {
      await new Promise((resolve) => setTimeout(resolve, 5_000));
    }
    operationCompletedAt = Date.now();
  } finally {
    clearInterval(heartbeat);
  }
  const cpuUsageEnd = process.cpuUsage();
  const resourceUsageEnd = readResourceUsage();
  const eventLoop = eventLoopStart
    ? performance.eventLoopUtilization(eventLoopStart)
    : null;
  const operationDurationMs = operationCompletedAt - operationStartedAt;
  const heartbeatGaps = heartbeatTimestampsMs.map((timestamp, index) => ({
    startAtMs: index === 0 ? 0 : heartbeatTimestampsMs[index - 1],
    endAtMs: timestamp,
    durationMs: index === 0 ? timestamp : timestamp - heartbeatTimestampsMs[index - 1],
  }));
  heartbeatGaps.push({
    startAtMs: heartbeatTimestampsMs.at(-1) ?? 0,
    endAtMs: operationDurationMs,
    durationMs: operationDurationMs - (heartbeatTimestampsMs.at(-1) ?? 0),
  });
  const maximumHeartbeatGap = heartbeatGaps.reduce(
    (maximum, candidate) => candidate.durationMs > maximum.durationMs ? candidate : maximum,
    heartbeatGaps[0],
  );
  return {
    operationStartedAtMs: operationStartedAt,
    operationDurationMs,
    searchCount,
    heartbeatCount: heartbeatTimestampsMs.length,
    firstHeartbeatAtMs: heartbeatTimestampsMs[0] ?? null,
    lastHeartbeatAtMs: heartbeatTimestampsMs.at(-1) ?? null,
    maximumHeartbeatGapMs: maximumHeartbeatGap.durationMs,
    maximumHeartbeatGapStartAtMs: maximumHeartbeatGap.startAtMs,
    maximumHeartbeatGapEndAtMs: maximumHeartbeatGap.endAtMs,
    mcpResultStatus: loadClient ? (broadSearch.ok ? "success" : "failure") : "not-requested",
    mcpMatchCount: broadSearch.matchCount,
    processEvidence: {
      runtime: { node: process.versions.node, electron: process.versions.electron, platform: process.platform },
      cpuUsageStart,
      cpuUsageEnd,
      cpuUsageDelta: subtract(cpuUsageEnd, cpuUsageStart),
      resourceUsageStart,
      resourceUsageEnd,
      resourceUsageDelta: subtract(resourceUsageEnd, resourceUsageStart),
      contextSwitchesSupported: process.platform !== "win32" && resourceUsageStart !== null,
      eventLoop,
    },
  };
}

function readResourceUsage() {
  if (typeof process.resourceUsage !== "function") {
    return null;
  }
  const usage = process.resourceUsage();
  return Object.fromEntries([
    "userCPUTime", "systemCPUTime", "voluntaryContextSwitches", "involuntaryContextSwitches",
  ].map((key) => [key, usage[key]]));
}

function subtract(end, start) {
  return end && start
    ? Object.fromEntries(Object.keys(start).map((key) => [key, end[key] - start[key]]))
    : null;
}

module.exports = { measureHeartbeat };
