const assert = require("node:assert/strict");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const protocol = require(path.join(
  root,
  "dist/main/agentHarness/runtime/agentHarnessServiceHostProtocol.js",
));
const {
  AgentHarnessServiceHostClient,
} = require(path.join(
  root,
  "dist/main/agentHarness/runtime/agentHarnessServiceHostClient.js",
));
const {
  getAgentHarnessServiceHostControlAddress,
} = require(path.join(
  root,
  "dist/main/agentHarness/runtime/agentHarnessServiceHostDescriptor.js",
));

function serviceHostIdentity(overrides = {}) {
  return {
    descriptorSchemaVersion: 1,
    controlProtocolVersion: 1,
    serviceHostProcessId: process.pid,
    workerProcessId: process.pid + 1,
    instanceId: "11111111-1111-4111-8111-111111111111",
    runtimeBuildIdentity: `sha256:${"a".repeat(64)}`,
    lifecycleState: "ready",
    lifecycleReason: "startup",
    lifecycleStateChangedAt: new Date(0).toISOString(),
    powerEpoch: 0,
    consecutiveHeartbeatMisses: 0,
    workerRecoveryState: "idle",
    workerRecoveryError: null,
    lastControlledRestart: null,
    lastSuspendAt: null,
    lastResumeAt: null,
    lastRecoveryStartedAt: null,
    lastReadyAt: new Date(0).toISOString(),
    workerRestartCount: 0,
    lastWorkerRestartReason: null,
    trayPresent: true,
    ...overrides,
  };
}

async function listenIdentityHost(address, identity, options = {}) {
  const operations = [];
  const sockets = new Set();
  const server = net.createServer((socket) => {
    sockets.add(socket);
    socket.setEncoding("utf8");
    let buffered = "";
    socket.on("data", (chunk) => {
      buffered += chunk;
      let newlineIndex = buffered.indexOf("\n");
      while (newlineIndex >= 0) {
        const frame = buffered.slice(0, newlineIndex);
        buffered = buffered.slice(newlineIndex + 1);
        if (frame.trim()) {
          const request = JSON.parse(frame);
          operations.push(request.operation);
          const controlledRestart = request.operation === "service-host-controlled-restart";
          const result = controlledRestart
            ? {
                outcome: "drained",
                activeRequestsAtStart: 0,
                activeRequestsAtEnd: 0,
                requestedAt: new Date(0).toISOString(),
                completedAt: new Date(1).toISOString(),
              }
            : identity;
          const response = {
            protocolVersion: 1,
            kind: "response",
            requestId: request.requestId,
            operation: request.operation,
            ok: true,
            serviceHostProcessId: identity.serviceHostProcessId,
            workerProcessId: identity.workerProcessId,
            instanceId: identity.instanceId,
            result,
          };
          socket.write(`${JSON.stringify(response)}\n`, () => {
            if (controlledRestart && options.closeOnControlledRestart) {
              server.close();
            }
          });
        }
        newlineIndex = buffered.indexOf("\n");
      }
    });
    socket.on("close", () => sockets.delete(socket));
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(address, resolve);
  });
  return {
    operations,
    async close() {
      for (const socket of sockets) socket.destroy();
      if (!server.listening) return;
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

test("identity normalization accepts only the prior protocol-v1 omission of trayPresent", () => {
  const current = serviceHostIdentity();
  assert.equal(protocol.isAgentHarnessServiceHostIdentity(current), true);
  assert.equal(protocol.normalizeAgentHarnessServiceHostIdentity(current).trayPresent, true);

  const prior = { ...current };
  delete prior.trayPresent;
  assert.equal(protocol.isAgentHarnessServiceHostIdentity(prior), false);
  assert.equal(protocol.normalizeAgentHarnessServiceHostIdentity(prior).trayPresent, false);

  assert.equal(protocol.normalizeAgentHarnessServiceHostIdentity({ ...prior, trayPresent: "yes" }), null);
  const missingCoreIdentity = { ...prior };
  delete missingCoreIdentity.instanceId;
  assert.equal(protocol.normalizeAgentHarnessServiceHostIdentity(missingCoreIdentity), null);
  assert.equal(protocol.normalizeAgentHarnessServiceHostIdentity({ ...prior, controlProtocolVersion: 2 }), null);
});

test("client discovers a stale prior identity and reaches controlled restart to a current tray host", async () => {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-prior-service-host-"));
  const userDataRoot = path.join(container, "user-data");
  const address = getAgentHarnessServiceHostControlAddress(userDataRoot);
  fs.mkdirSync(path.join(userDataRoot, "agent-harness"), { recursive: true });
  const expectedBuildIdentity = `sha256:${"b".repeat(64)}`;
  const priorIdentity = serviceHostIdentity();
  delete priorIdentity.trayPresent;
  const replacementIdentity = serviceHostIdentity({
    instanceId: "22222222-2222-4222-8222-222222222222",
    runtimeBuildIdentity: expectedBuildIdentity,
    trayPresent: true,
  });
  let priorHost;
  let replacementHost;
  try {
    priorHost = await listenIdentityHost(address, priorIdentity, { closeOnControlledRestart: true });
    const client = new AgentHarnessServiceHostClient({
      userDataRoot,
      expectedBuildIdentity,
      requestTimeoutMs: 1_000,
      discoveryTimeoutMs: 3_000,
      discoveryPollIntervalMs: 10,
      launchServiceHost: async () => {
        replacementHost = await listenIdentityHost(address, replacementIdentity);
      },
    });

    const discovered = await client.connect();
    assert.equal(discovered.trayPresent, false);
    const staleStatus = await client.lifecycleStatus();
    assert.equal(staleStatus.state, "restart-required");
    assert.equal(staleStatus.reason, "build-generation-mismatch");
    assert.equal(staleStatus.trayPresent, false);

    const replacement = await client.controlledRestartServiceHost();
    assert.equal(replacement.instanceId, replacementIdentity.instanceId);
    assert.equal(replacement.runtimeBuildIdentity, expectedBuildIdentity);
    assert.equal(replacement.trayPresent, true);
    assert.ok(priorHost.operations.includes("service-host-controlled-restart"));
    assert.ok(replacementHost.operations.includes("reconcile-descriptor"));
  } finally {
    await replacementHost?.close();
    await priorHost?.close();
    fs.rmSync(container, { recursive: true, force: true });
  }
});
