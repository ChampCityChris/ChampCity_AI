const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);
const appAsarPath = path.resolve(process.argv[2] ?? "release/win-unpacked/resources/app.asar");
assert.equal(fs.existsSync(appAsarPath), true, `Packaged app archive is missing: ${appAsarPath}`);

void (async () => {
  const { createCodexRuntimeOperations } = require(path.join(
    appAsarPath,
    "dist/main/workCardBuilding/codexRuntimeOperations.js",
  ));
  const isolatedUserDataRoot = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-packaged-codex-"));
  const operations = createCodexRuntimeOperations(isolatedUserDataRoot);
  try {
    const runtime = await operations.bootstrap();
    assert.equal(runtime.version, "0.146.0");
    assert.equal(fs.existsSync(runtime.executable), true);
    const result = await execFileAsync(runtime.executable, ["--version"], {
      windowsHide: true,
      timeout: 15_000,
      encoding: "utf8",
    });
    assert.match(result.stdout, /codex-cli 0\.146\.0/);
    process.stdout.write(`${JSON.stringify({
      appAsarPath,
      isolatedUserData: true,
      bundledVersion: runtime.version,
      nativeRuntimeCopied: true,
      nativeRuntimeExecuted: true,
      versionOutput: result.stdout.trim(),
    })}\n`);
  } finally {
    await operations.shutdown?.();
  }
})().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
