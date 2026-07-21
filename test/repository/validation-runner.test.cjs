const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");

const repoRoot = path.resolve(__dirname, "..", "..");

test("codex validation wrapper propagates child npm script failures", async () => {
  const temp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "champcity-validation-runner-"));
  try {
    await fs.promises.mkdir(path.join(temp, "scripts"), { recursive: true });
    await fs.promises.copyFile(
      path.join(repoRoot, "scripts", "codex-validate.ps1"),
      path.join(temp, "scripts", "codex-validate.ps1"),
    );
    await fs.promises.writeFile(
      path.join(temp, "package.json"),
      JSON.stringify({
        scripts: {
          "test:unit": "node -e \"process.exit(7)\"",
        },
      }),
      "utf8",
    );

    const failed = runWrapper(temp);
    assert.notEqual(failed.status, 0);

    await fs.promises.writeFile(
      path.join(temp, "package.json"),
      JSON.stringify({
        scripts: {
          "test:unit": "node -e \"process.exit(0)\"",
        },
      }),
      "utf8",
    );
    const passed = runWrapper(temp);
    assert.equal(passed.status, 0, `${passed.stdout}\n${passed.stderr}`);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
});

function runWrapper(cwd) {
  return childProcess.spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      path.join(cwd, "scripts", "codex-validate.ps1"),
      "-Suite",
      "unit",
    ],
    {
      cwd,
      encoding: "utf8",
      windowsHide: true,
    },
  );
}
