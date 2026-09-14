const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const repositoryRoot = path.resolve(__dirname, "../..");
const sourceExecutable = path.resolve(
  process.argv[2] ?? path.join(repositoryRoot, "release/win-unpacked/ChampCityAI.exe"),
);
assert.equal(process.platform, "win32", "Packaged path-with-spaces smoke requires Windows");
assert.equal(path.basename(sourceExecutable), "ChampCityAI.exe");
assert.equal(fs.existsSync(sourceExecutable), true, "Packaged ChampCityAI.exe must exist");

const sourcePackageRoot = path.dirname(sourceExecutable);
const temporaryRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "ChampCity WC03 Path With Spaces "),
);
const copiedPackageRoot = path.join(temporaryRoot, "ChampCity A-I Package");
const copiedExecutable = path.join(copiedPackageRoot, "ChampCityAI.exe");

try {
  fs.cpSync(sourcePackageRoot, copiedPackageRoot, { recursive: true });
  assert.equal(copiedExecutable.includes(" "), true);
  assert.equal(fs.existsSync(copiedExecutable), true);

  const smoke = childProcess.spawnSync(
    process.execPath,
    [path.join(__dirname, "packaged-background-agent-smoke.cjs"), copiedExecutable],
    {
      cwd: repositoryRoot,
      encoding: "utf8",
      windowsHide: true,
      timeout: 90_000,
      maxBuffer: 1024 * 1024,
    },
  );
  assert.equal(
    smoke.status,
    0,
    `Packaged path-with-spaces smoke failed: ${smoke.stderr || smoke.stdout}`,
  );
  const runtimeEvidence = JSON.parse(smoke.stdout.trim());
  assert.equal(runtimeEvidence.noForegroundServiceHostWindowWhileLive, true);
  assert.equal(runtimeEvidence.uninstallMaintenanceExitCode, 0);

  process.stdout.write(`${JSON.stringify({
    copiedPackagePathContainsSpaces: true,
    executableName: path.basename(copiedExecutable),
    backgroundAgentLaunchPassed: true,
    uninstallMaintenancePassed: true,
  })}\n`);
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}
