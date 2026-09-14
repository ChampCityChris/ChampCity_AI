"use strict";

class DeterministicReliabilitySoakHarness {
  constructor(runtime, options = {}) {
    this.runtime = runtime;
    this.seed = options.seed ?? 0x5eed1234;
    this.snapshots = [];
  }

  async createSessions(count, token) {
    const sessions = [];
    for (let index = 0; index < count; index += 1) {
      const session = await initializeSession(this.runtime.url, token, index + 1);
      if (session.status !== 200 || !session.sessionId) {
        throw new Error(`Session initialization ${index + 1} failed with HTTP ${session.status}.`);
      }
      sessions.push(session.sessionId);
    }
    this.capture(`created-${count}`);
    return sessions;
  }

  async cleanDelete(sessionId, token) {
    const response = await fetch(this.runtime.url, {
      method: "DELETE",
      headers: { ...mcpHeaders(token), "mcp-session-id": sessionId },
    });
    await response.text();
    return response.status;
  }

  abruptDisconnect(_sessionId) {
    // A stateful HTTP client that vanishes without logical DELETE intentionally
    // leaves only its bounded server-side session state behind.
  }

  async runReconnectBatch(count, token) {
    const sessions = await this.createSessions(count, token);
    sessions.forEach((sessionId) => this.abruptDisconnect(sessionId));
    return this.capture(`abrupt-${count}`);
  }

  async runRandomizedChurn(iterations, token) {
    const live = [];
    for (let index = 0; index < iterations; index += 1) {
      const session = await initializeSession(this.runtime.url, token, index + 10_000);
      if (session.status !== 200 || !session.sessionId) {
        throw new Error(`Randomized reconnect ${index + 1} failed with HTTP ${session.status}.`);
      }
      if (this.nextRandom() < 0.35) {
        await this.cleanDelete(session.sessionId, token);
      } else {
        live.push(session.sessionId);
        this.abruptDisconnect(session.sessionId);
      }
      if ((index + 1) % 25 === 0) {
        this.capture(`random-${index + 1}`);
      }
    }
    return live;
  }

  async simulateResumeCycles(count) {
    for (let cycle = 0; cycle < count; cycle += 1) {
      this.runtime.suspendAdmission();
      await this.runtime.resumeAfterPowerEpoch();
      this.capture(`resume-${cycle + 1}`);
    }
  }

  async runConcurrentOperations({ startBroad, waitForBroadStart, runFast }) {
    const broad = startBroad();
    await waitForBroadStart();
    const fastStartedAt = Date.now();
    const fastResult = await runFast();
    const fastCompletedAt = Date.now();
    const broadResult = await broad;
    return {
      broadResult,
      fastResult,
      fastDurationMs: fastCompletedAt - fastStartedAt,
      fastCompletedAt,
    };
  }

  async runHeartbeatFailureRecovery(lifecycle, missCount) {
    const snapshots = [];
    for (let miss = 0; miss < missCount; miss += 1) {
      snapshots.push(await lifecycle.superviseNow());
    }
    return snapshots;
  }

  capture(label) {
    const snapshot = {
      label,
      capturedAt: new Date().toISOString(),
      sessions: this.runtime.sessionDiagnostics(),
      operational: this.runtime.operationalDiagnostics(),
      rssMiB: Math.round((process.memoryUsage().rss / 1024 / 1024) * 100) / 100,
    };
    this.snapshots.push(snapshot);
    return snapshot;
  }

  nextRandom() {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return this.seed / 0x1_0000_0000;
  }
}

async function initializeSession(url, token, id) {
  const response = await fetch(url, {
    method: "POST",
    headers: mcpHeaders(token),
    body: JSON.stringify({
      jsonrpc: "2.0",
      id,
      method: "initialize",
      params: {
        protocolVersion: "2025-11-25",
        capabilities: {},
        clientInfo: { name: "deterministic-reliability-soak", version: "1.0.0" },
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

module.exports = { DeterministicReliabilitySoakHarness };
