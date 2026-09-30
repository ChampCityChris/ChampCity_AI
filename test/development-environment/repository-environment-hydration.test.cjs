const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { hydrateRepositoryEnvironment, executeRestoreCommand } = require(
  "../../dist/main/developmentEnvironment/repositoryEnvironmentHydrationService.js");

function devRoot(context) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-hydration-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const dev = path.join(root, "Dev");
  fs.mkdirSync(dev);
  return dev;
}

test("top-level package lock restores the existing npm provider with Dev as cwd", async context => {
  const dev = devRoot(context);
  fs.writeFileSync(path.join(dev, "package-lock.json"), "{}");
  const calls = [];
  const result = await hydrateRepositoryEnvironment(dev, async (command, cwd) => {
    calls.push({ command, cwd });
    return { exitCode: 0, error: null };
  });
  assert.deepEqual(calls, [{ command: ["npm", "ci"], cwd: dev }]);
  assert.deepEqual(result, { state: "ready", providers: [
    { ecosystem: "npm", state: "ready" },
  ], error: null });
});

test("no top-level provider needs no restore", async context => {
  const dev = devRoot(context);
  fs.mkdirSync(path.join(dev, "nested"));
  fs.writeFileSync(path.join(dev, "nested", "package-lock.json"), "{}");
  const result = await hydrateRepositoryEnvironment(dev, () => { throw Error("must not run"); });
  assert.deepEqual(result, { state: "not-applicable", providers: [], error: null });
});

test("multiple top-level restores run sequentially and a failure is degraded", async context => {
  const dev = devRoot(context);
  fs.writeFileSync(path.join(dev, "package-lock.json"), "{}");
  fs.writeFileSync(path.join(dev, "requirements.txt"), "");
  const calls = [];
  const result = await hydrateRepositoryEnvironment(dev, async (command, cwd) => {
    assert.equal(cwd, dev);
    calls.push(command);
    if (command[0] === "npm") return { exitCode: 1, error: "failed" };
    assert.equal(calls.length, 2);
    return { exitCode: 0, error: null };
  });
  assert.deepEqual(calls, [["npm", "ci"], ["python", "-m", "pip", "install", "-r", "requirements.txt"]]);
  assert.equal(result.state, "degraded");
  assert.deepEqual(result.providers.map(item => item.state), ["degraded", "ready"]);
  assert.match(result.error, /npm/);
});

test("Windows npm command execution uses the shared standalone Node/npm resolver", { skip: process.platform !== "win32" }, async context => {
  const dev = devRoot(context);
  const result = await executeRestoreCommand(["npm", "--version"], dev);
  assert.equal(result.exitCode, 0);
  assert.equal(result.error, null);
});

test("npm ci restores a local executable into Dev node_modules", { skip: process.platform !== "win32" }, async context => {
  const dev = devRoot(context);
  const fixture = path.join(path.dirname(dev), "fixture-tsc");
  fs.mkdirSync(path.join(fixture, "bin"), { recursive: true });
  fs.writeFileSync(path.join(fixture, "package.json"), JSON.stringify({
    name: "fixture-tsc", version: "1.0.0", bin: { tsc: "bin/tsc.js" },
  }));
  fs.writeFileSync(path.join(fixture, "bin", "tsc.js"), "#!/usr/bin/env node\n");
  fs.writeFileSync(path.join(dev, "package.json"), JSON.stringify({
    name: "fixture-dev", version: "1.0.0", devDependencies: { "fixture-tsc": "file:../fixture-tsc" },
  }));
  const lock = await executeRestoreCommand(["npm", "install", "--package-lock-only", "--offline", "--ignore-scripts"], dev);
  assert.equal(lock.exitCode, 0);
  const result = await hydrateRepositoryEnvironment(dev);
  assert.equal(result.state, "ready");
  assert.equal(fs.existsSync(path.join(dev, "node_modules", ".bin", "tsc")), true);
});

test("hydration and Source Control keep their implementation boundaries", () => {
  const hydrationSource = fs.readFileSync(path.join(__dirname, "../../src/main/developmentEnvironment/repositoryEnvironmentHydrationService.ts"), "utf8");
  const sourceControl = fs.readFileSync(path.join(__dirname, "../../src/main/sourceControl/existingProjectGitAdoptionService.ts"), "utf8");
  assert.match(hydrationSource, /core\/windowsNpmInvocation/);
  assert.doesNotMatch(hydrationSource, /agentHarness|mcp|shell:\s*true/);
  assert.doesNotMatch(sourceControl, /repositoryEnvironmentHydrationService/);
});
