const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { DatabaseSync, backup } = require("node:sqlite");

const MINIMUM_SAFE_SQLITE = [3, 51, 3];
function safeWalVersion(version) {
  const parts = /^([0-9]+)\.([0-9]+)\.([0-9]+)$/.exec(version)?.slice(1).map(Number);
  if (!parts) return false;
  for (let i = 0; i < 3; i++) {
    if (parts[i] > MINIMUM_SAFE_SQLITE[i]) return true;
    if (parts[i] < MINIMUM_SAFE_SQLITE[i]) return false;
  }
  return true;
}

async function probeSQLite() {
  const tempRoot = path.resolve(os.tmpdir());
  const directory = fs.mkdtempSync(path.join(tempRoot, "champcity-sqlite-probe-"));
  if (path.dirname(path.resolve(directory)) !== tempRoot) throw new Error("SQLite probe temp directory escaped its root.");
  const databasePath = path.join(directory, "state.sqlite");
  const backupPath = path.join(directory, "backup.sqlite");
  let database;
  let restored;
  try {
    database = new DatabaseSync(databasePath, { timeout: 1000, defensive: true, allowExtension: false });
    const sqliteVersion = database.prepare("SELECT sqlite_version() AS version").get().version;
    assert.equal(safeWalVersion(sqliteVersion), true, "SQLite must contain the WAL-reset fix (3.51.3 or newer)");
    const defensiveAvailable = typeof database.enableDefensive === "function";
    if (defensiveAvailable) database.enableDefensive(true);
    database.exec("PRAGMA foreign_keys = ON; PRAGMA synchronous = FULL; PRAGMA busy_timeout = 1000;");
    assert.equal(database.prepare("PRAGMA foreign_keys").get().foreign_keys, 1);
    assert.equal(database.prepare("PRAGMA synchronous").get().synchronous, 2);
    assert.equal(database.prepare("PRAGMA journal_mode = WAL").get().journal_mode.toLowerCase(), "wal");
    database.exec("CREATE TABLE parent (id INTEGER PRIMARY KEY); CREATE TABLE child (id INTEGER PRIMARY KEY, parent_id INTEGER NOT NULL REFERENCES parent(id));");
    const insertParent = database.prepare("INSERT INTO parent(id) VALUES (?)");
    const insertChild = database.prepare("INSERT INTO child(id, parent_id) VALUES (?, ?)");
    database.exec("BEGIN IMMEDIATE");
    insertParent.run(1);
    database.exec("ROLLBACK");
    assert.equal(database.prepare("SELECT COUNT(*) AS count FROM parent").get().count, 0);
    database.exec("BEGIN IMMEDIATE");
    insertParent.run(2);
    insertChild.run(3, 2);
    database.exec("COMMIT");
    assert.equal(database.prepare("SELECT COUNT(*) AS count FROM child WHERE parent_id = ?").get(2).count, 1);
    assert.throws(() => insertChild.run(4, 99), /FOREIGN KEY/);
    assert.equal(database.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
    const pagesCopied = await backup(database, backupPath);
    assert.ok(pagesCopied > 0);
    restored = new DatabaseSync(backupPath, { readOnly: true, defensive: true, allowExtension: false });
    assert.equal(restored.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
    assert.equal(restored.prepare("SELECT COUNT(*) AS count FROM child").get().count, 1);
    assert.equal(fs.existsSync(databasePath) && fs.existsSync(backupPath), true);
    return {
      runtime: process.versions.electron ? "electron" : "node",
      nodeVersion: process.version,
      electronVersion: process.versions.electron ?? null,
      sqliteVersion,
      fileBacked: true,
      transactionRollbackCommit: true,
      preparedStatements: true,
      foreignKeys: true,
      wal: true,
      synchronousFull: true,
      defensiveAvailable,
      backupAndIntegrity: true,
    };
  } finally {
    restored?.close();
    database?.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

async function run() {
  try {
    const result = await probeSQLite();
    process.stdout.write(`CHAMPCITY_SQLITE_PROBE=${JSON.stringify(result)}\n`);
    return 0;
  } catch (error) {
    process.stderr.write(`SQLite capability probe failed: ${error instanceof Error ? error.message : "unknown error"}\n`);
    return 1;
  }
}

if (process.versions.electron && process.env.ELECTRON_RUN_AS_NODE !== "1") {
  const { app } = require("electron");
  app.commandLine.appendSwitch("disable-gpu");
  app.whenReady().then(run).then(code => app.exit(code), () => app.exit(1));
} else if (require.main === module) {
  run().then(code => { process.exitCode = code; });
}

module.exports = { probeSQLite, safeWalVersion };
