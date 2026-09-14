const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { computeAgentHarnessRuntimeBuildIdentity } = require(
  "../../dist/main/agentHarness/runtime/agentHarnessBuildIdentity.js"
);

function createCompiledFixture(container, name) {
  const deploymentRoot = path.join(container, name);
  const mainRoot = path.join(deploymentRoot, "main");
  const modules = {
    lifecycle: "agentHarness/runtime/agentHarnessServiceLifecycle.js",
    server: "agentHarness/runtime/agentHarnessServiceHostServer.js",
    tools: "agentHarness/tools/toolRegistry.js",
    repository: "agentHarness/repository/repositoryOperations.js",
  };
  for (const [key, relativePath] of Object.entries(modules)) {
    const target = path.join(mainRoot, ...relativePath.split("/"));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, `module.exports = ${JSON.stringify(`${key}-runtime-v1`)};\n`, "utf8");
  }
  const externalPath = path.join(mainRoot, "documents", "canonicalMarkdownDocumentWriter.js");
  fs.mkdirSync(path.dirname(externalPath), { recursive: true });
  fs.writeFileSync(externalPath, "module.exports = 'external-runtime-v1';\n", "utf8");
  const dependentPath = path.join(mainRoot, "agentHarness", "repository", "controlledMarkdownDrafts.js");
  fs.writeFileSync(
    dependentPath,
    "module.exports = require('../../documents/canonicalMarkdownDocumentWriter');\n",
    "utf8",
  );
  return { mainRoot, modules, externalPath };
}

test("complete runtime build digest changes for lifecycle, control, tool, repository, and external modules", () => {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-build-identity-"));
  try {
    const fixture = createCompiledFixture(container, "deployment-a");
    const baseline = computeAgentHarnessRuntimeBuildIdentity(fixture.mainRoot);
    const targets = [
      fixture.modules.lifecycle,
      fixture.modules.server,
      fixture.modules.tools,
      fixture.modules.repository,
    ].map((relativePath) => path.join(fixture.mainRoot, ...relativePath.split("/")));
    targets.push(fixture.externalPath);
    for (const target of targets) {
      const original = fs.readFileSync(target);
      fs.appendFileSync(target, "// material runtime build change\n", "utf8");
      assert.notEqual(computeAgentHarnessRuntimeBuildIdentity(fixture.mainRoot), baseline);
      fs.writeFileSync(target, original);
      assert.equal(computeAgentHarnessRuntimeBuildIdentity(fixture.mainRoot), baseline);
    }
  } finally {
    fs.rmSync(container, { recursive: true, force: true });
  }
});

test("runtime build digest is independent of fixture root, mtimes, and enumeration order", () => {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-build-identity-determinism-"));
  const originalReaddirSync = fs.readdirSync;
  try {
    const left = createCompiledFixture(container, "left-root");
    const right = createCompiledFixture(container, "different-right-root");
    const baseline = computeAgentHarnessRuntimeBuildIdentity(left.mainRoot);
    const future = new Date("2035-01-02T03:04:05.000Z");
    for (const relativePath of Object.values(right.modules)) {
      fs.utimesSync(path.join(right.mainRoot, ...relativePath.split("/")), future, future);
    }
    fs.readdirSync = function reversedReaddirSync(...args) {
      const result = originalReaddirSync.apply(fs, args);
      return Array.isArray(result) ? result.reverse() : result;
    };
    const reordered = computeAgentHarnessRuntimeBuildIdentity(right.mainRoot);
    assert.equal(reordered, baseline);
    assert.match(reordered, /^sha256:[0-9a-f]{64}$/);
    assert.doesNotMatch(reordered, /[\\/]|left-root|different-right-root/);
  } finally {
    fs.readdirSync = originalReaddirSync;
    fs.rmSync(container, { recursive: true, force: true });
  }
});

test("a previously omitted runtime change projects restart-required against the older generation", () => {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-build-identity-generation-"));
  try {
    const fixture = createCompiledFixture(container, "deployment");
    const generationA = computeAgentHarnessRuntimeBuildIdentity(fixture.mainRoot);
    const lifecyclePath = path.join(
      fixture.mainRoot,
      ...fixture.modules.lifecycle.split("/"),
    );
    fs.appendFileSync(lifecyclePath, "// rebuilt lifecycle runtime generation B\n", "utf8");
    const generationB = computeAgentHarnessRuntimeBuildIdentity(fixture.mainRoot);
    assert.notEqual(generationB, generationA);

    const { AgentHarnessServiceHostClient } = require(
      "../../dist/main/agentHarness/runtime/agentHarnessServiceHostClient.js"
    );
    const client = new AgentHarnessServiceHostClient({
      userDataRoot: "bounded-test-root",
      launchServiceHost: () => undefined,
      expectedBuildIdentity: generationB,
    });
    client.acceptLifecycleIdentity({
      descriptorSchemaVersion: 1,
      controlProtocolVersion: 1,
      serviceHostProcessId: 1001,
      workerProcessId: 1002,
      instanceId: "11111111-1111-4111-8111-111111111111",
      runtimeBuildIdentity: generationA,
      lifecycleState: "ready",
      lifecycleReason: "startup",
      lifecycleStateChangedAt: new Date(0).toISOString(),
      powerEpoch: 0,
      consecutiveHeartbeatMisses: 0,
      workerRecoveryState: "idle",
      workerRecoveryError: null,
      lastControlledRestart: null,
    });
    const status = client.lifecycleStatusProjection();
    assert.equal(status.state, "restart-required");
    assert.equal(status.reason, "build-generation-mismatch");
    assert.equal(status.runtimeBuildIdentity, generationA);
    assert.equal(status.expectedBuildIdentity, generationB);
  } finally {
    fs.rmSync(container, { recursive: true, force: true });
  }
});

test("runtime build identity fails closed for absent roots and unresolved local dependencies", () => {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-build-identity-fail-closed-"));
  try {
    assert.throws(
      () => computeAgentHarnessRuntimeBuildIdentity(path.join(container, "absent", "main")),
      { code: "AGENT_HARNESS_BUILD_IDENTITY_FAILED" },
    );
    const fixture = createCompiledFixture(container, "broken-deployment");
    fs.writeFileSync(
      path.join(fixture.mainRoot, "agentHarness", "runtime", "broken.js"),
      "module.exports = require('../../documents/missingRuntimeModule');\n",
      "utf8",
    );
    assert.throws(
      () => computeAgentHarnessRuntimeBuildIdentity(fixture.mainRoot),
      { code: "AGENT_HARNESS_BUILD_IDENTITY_FAILED" },
    );
  } finally {
    fs.rmSync(container, { recursive: true, force: true });
  }
});
