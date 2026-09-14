// Run with Node on Windows after npm run build. No production startup name is written.
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const windowsRun = require("../../dist/main/agentHarness/runtime/windowsRunObservation.js");

assert.equal(process.platform, "win32", "This smoke requires real Windows Electron login-item APIs.");

if (!process.versions.electron) {
  const name = `ChampCity Login Smoke ${randomUUID()}`;
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-login-smoke-"));
  const env = { ...process.env, CHAMPCITY_LOGIN_SMOKE_USER_DATA: userData };
  const packagedArgument = process.argv.find((argument) => argument.startsWith("--packaged-executable="));
  if (packagedArgument) {
    const executable = path.resolve(packagedArgument.slice("--packaged-executable=".length));
    assert.equal(path.basename(executable), "ChampCityAI.exe");
    assert.equal(fs.statSync(executable).isFile(), true);
    env.CHAMPCITY_LOGIN_SMOKE_EXECUTABLE = executable;
  } else {
    delete env.CHAMPCITY_LOGIN_SMOKE_EXECUTABLE;
  }
  delete env.ELECTRON_RUN_AS_NODE;
  const run = (extra) => spawnSync(require("electron"), [__filename, name, ...extra], {
    env, windowsHide: true, encoding: "utf8", timeout: 30_000,
  });
  let result;
  try {
    assert.deepEqual(windowsRun.observeCurrentUserWindowsRunValue(name), { state: "absent" });
    result = run(process.argv.includes("--inject-failure") ? ["--inject-failure"] : []);
    process.stdout.write(result.stdout ?? "");
    process.stderr.write(result.stderr ?? "");
    assert.ifError(result.error);
    assert.equal(result.status, 0, "Real Electron login-item verification failed.");
  } finally {
    // A second Electron process also removes/verifies the unique item if the
    // first process crashed or hit its timeout before its own finally block.
    const cleanup = run(["--cleanup-only"]);
    process.stdout.write(cleanup.stdout ?? "");
    process.stderr.write(cleanup.stderr ?? "");
    assert.ifError(cleanup.error);
    assert.equal(cleanup.status, 0, `Mandatory cleanup failed for ${name}.`);
    const finalRun = windowsRun.observeCurrentUserWindowsRunValue(name);
    assert.deepEqual(finalRun, { state: "absent" }, "Parent must independently prove HKCU Run cleanup.");
    process.stdout.write(`${JSON.stringify({ stage: "parent-cleanup-proof", name, runState: finalRun.state })}\n`);
    assert.equal(path.dirname(userData), os.tmpdir());
    fs.rmSync(userData, { recursive: true, force: true });
  }
} else {
  const { app } = require("electron");
  const startup = require("../../dist/main/agentHarness/runtime/agentHarnessServiceHostStartupRegistration.js");
  const name = process.argv[2];
  assert.match(name, /^ChampCity Login Smoke [0-9a-f-]{36}$/);
  assert.notEqual(name, startup.agentHarnessServiceHostLoginItemName);
  app.setPath("userData", process.env.CHAMPCITY_LOGIN_SMOKE_USER_DATA);
  app.disableHardwareAcceleration();
  const target = startup.computeAgentHarnessServiceHostLoginLaunchTarget({
    isPackaged: true,
    executablePath: process.env.CHAMPCITY_LOGIN_SMOKE_EXECUTABLE ?? process.execPath,
    applicationPath: "unused",
  });
  const read = () => app.getLoginItemSettings(target);
  const set = (enabled) => app.setLoginItemSettings({ ...target, name, openAtLogin: enabled, enabled });
  const check = (actual, enabled) => {
    const observation = windowsRun.observeCurrentUserWindowsRunValue(name);
    const result = startup.evaluateWindowsLoginItemSettings(actual, target, enabled, observation, name);
    assert.equal(result.confirmed, true, result.diagnostic);
    return JSON.parse(result.diagnostic);
  };
  app.whenReady().then(() => {
    const before = read().launchItems.filter((item) => item.name !== name);
    try {
      if (!process.argv.includes("--cleanup-only")) {
        assert.equal(read().launchItems.some((item) => item.name === name), false);
        set(true);
        const actual = read();
        const evidence = check(actual, true);
        process.stdout.write(`${JSON.stringify({ stage: "enabled", electron: process.versions.electron,
          targetExecutable: path.basename(target.path), packagedTarget: Boolean(process.env.CHAMPCITY_LOGIN_SMOKE_EXECUTABLE),
          name, evidence })}\n`);
        if (process.argv.includes("--inject-failure")) throw new Error("Injected failure after real login-item creation.");
      }
    } finally {
      set(false);
      const actual = read();
      const evidence = check(actual, false);
      assert.equal(actual.launchItems.some((item) => item.name === name), false, "Temporary startup item must be removed.");
      assert.deepEqual(actual.launchItems.filter((item) => item.name !== name), before);
      process.stdout.write(`${JSON.stringify({ stage: "cleanup", name, absent: true, otherItemsUnchanged: true, evidence })}\n`);
    }
  }).then(() => app.exit(0)).catch((error) => {
    process.stderr.write(`${error.stack ?? error}\n`);
    app.exit(1);
  });
}
