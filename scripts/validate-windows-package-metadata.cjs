const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

assert.equal(process.platform, "win32", "Windows package metadata validation requires Windows");

const repositoryRoot = path.join(__dirname, "..");
const packageMetadata = JSON.parse(
  fs.readFileSync(path.join(repositoryRoot, "package.json"), "utf8"),
);
const packagedExecutable = path.join(repositoryRoot, "release", "win-unpacked", "ChampCityAI.exe");
const installerExecutable = path.join(
  repositoryRoot,
  "release",
  `ChampCityAI-Setup-${packageMetadata.version}.exe`,
);

assert.equal(path.basename(packagedExecutable), "ChampCityAI.exe");
assert.equal(
  path.basename(installerExecutable),
  `ChampCityAI-Setup-${packageMetadata.version}.exe`,
);
assert.equal(fs.existsSync(packagedExecutable), true, "directory package must exist before metadata validation");
assert.equal(fs.existsSync(installerExecutable), true, "NSIS installer must exist before metadata validation");

const packagedVersionInfo = readWindowsVersionInfo(packagedExecutable);
assert.equal(packagedVersionInfo.ProductName, "ChampCity A/I");
assert.equal(packagedVersionInfo.FileDescription, "ChampCity A/I");
assert.equal(packagedVersionInfo.InternalName, "ChampCityAI");

const installerVersionInfo = readWindowsVersionInfo(installerExecutable);
assert.equal(installerVersionInfo.ProductName, "ChampCity A/I");
assert.match(installerVersionInfo.FileDescription, /ChampCity A\/I/);

process.stdout.write(`${JSON.stringify({
  packagedExecutable: {
    filename: path.basename(packagedExecutable),
    ...packagedVersionInfo,
  },
  installerExecutable: {
    filename: path.basename(installerExecutable),
    ...installerVersionInfo,
  },
})}\n`);

function readWindowsVersionInfo(filePath) {
  const escapedFilePath = filePath.replace(/'/g, "''");
  const command = [
    "$ErrorActionPreference = 'Stop'",
    `$versionInfo = (Get-Item -LiteralPath '${escapedFilePath}').VersionInfo`,
    "[pscustomobject]@{ ProductName = $versionInfo.ProductName; FileDescription = $versionInfo.FileDescription; InternalName = $versionInfo.InternalName; OriginalFilename = $versionInfo.OriginalFilename; FileVersion = $versionInfo.FileVersion; ProductVersion = $versionInfo.ProductVersion } | ConvertTo-Json -Compress",
  ].join("; ");
  const output = childProcess.execFileSync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", command],
    { encoding: "utf8" },
  );
  return JSON.parse(output.trim());
}
