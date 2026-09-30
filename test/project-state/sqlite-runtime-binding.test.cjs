const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const test = require("node:test");
const { probeSQLite, safeWalVersion } = require("../../scripts/probe-node-sqlite.cjs");

const repositoryRoot = path.resolve(__dirname, "../..");
const probePath = path.join(repositoryRoot, "scripts/probe-node-sqlite.cjs");

test("Node built-in SQLite passes the WAL fix gate and file-backed capability probe", async () => {
  assert.equal(safeWalVersion("3.51.2"), false);
  assert.equal(safeWalVersion("3.51.3"), true);
  assert.equal(safeWalVersion("3.53.4"), true);
  const result = await probeSQLite();
  assert.equal(result.runtime, "node");
  assert.equal(safeWalVersion(result.sqliteVersion), true);
  for (const capability of ["fileBacked", "transactionRollbackCommit", "preparedStatements", "foreignKeys", "wal", "synchronousFull", "backupAndIntegrity"]) assert.equal(result[capability], true);
});

test("Electron main loads built-in SQLite with the same required capabilities", () => {
  const environment = { ...process.env };
  delete environment.ELECTRON_RUN_AS_NODE;
  const electron = require("electron");
  const child = spawnSync(electron, [probePath, "--disable-gpu"], {
    cwd: repositoryRoot, env: environment, encoding: "utf8", windowsHide: true, timeout: 30_000, maxBuffer: 1024 * 1024,
  });
  assert.equal(child.error, undefined, child.error?.message);
  assert.equal(child.status, 0, child.stderr || child.stdout);
  const line = child.stdout.split(/\r?\n/).find(value => value.startsWith("CHAMPCITY_SQLITE_PROBE="));
  assert.ok(line, "Electron main must emit its probe receipt");
  const result = JSON.parse(line.slice("CHAMPCITY_SQLITE_PROBE=".length));
  assert.equal(result.runtime, "electron");
  assert.equal(result.electronVersion, require("electron/package.json").version);
  assert.equal(safeWalVersion(result.sqliteVersion), true);
  for (const capability of ["fileBacked", "transactionRollbackCommit", "preparedStatements", "foreignKeys", "wal", "synchronousFull", "backupAndIntegrity"]) assert.equal(result[capability], true);
});
