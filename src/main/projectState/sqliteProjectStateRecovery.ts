import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { backup, DatabaseSync } from "node:sqlite";
import type { ProjectId } from "../../shared/projectState/domainContracts";
import { ProjectStateStoreError } from "../../shared/projectState/projectStateStore";
import { openProjectStateDatabase, PROJECT_STATE_DATABASE_SCHEMA_VERSION } from "./sqliteSchema";
import { createSQLiteProjectStateStore } from "./sqliteProjectStateStore";

export interface BackupEvidence { id: string; fileName: string; createdAt: string; verifiedAt: string; schemaVersion: number; projectIds: ProjectId[]; sha256: string; bytes: number; pages: number }
export interface RecoveryEvidence { id: string; backupId: string; fileName: string; preparedAt: string; verifiedAt: string; selectedAt?: string; projectIds: ProjectId[]; sha256: string; status: "prepared" | "selected" }
export interface BackupRetentionPolicy { maxBackups: number; maxAgeDays: number; maxCandidates: number }
interface RecoveryManifest { version: 1; policy: BackupRetentionPolicy; backups: BackupEvidence[]; recoveries: RecoveryEvidence[] }
interface BackupSource { createOnlineBackup(destinationPath: string): Promise<number> }

function invalid(message: string): never { throw new ProjectStateStoreError("INVALID_STATE", message); }
function validPolicy(policy: BackupRetentionPolicy) {
  for (const value of Object.values(policy)) if (!Number.isSafeInteger(value) || value < 1 || value > 100) invalid("Backup retention policy must use bounded positive integers.");
}
function sameIds(actual: ProjectId[], expected: ProjectId[]): boolean {
  return actual.length === expected.length && actual.every((id, index) => id === expected[index]);
}
function safeFile(root: string, fileName: string, kind: "backup" | "candidate"): string {
  const pattern = kind === "backup" ? /^backup-[0-9a-f-]{36}\.sqlite$/ : /^candidate-[0-9a-f-]{36}\.sqlite$/;
  if (!pattern.test(fileName)) invalid("Recovery file name is invalid.");
  const directory = kind === "backup" ? root : path.join(root, "candidates");
  const file = path.resolve(directory, fileName);
  if (path.dirname(file) !== path.resolve(directory)) invalid("Recovery file escapes its storage boundary.");
  return file;
}
function digest(file: string): string {
  const hash = createHash("sha256");
  const descriptor = fs.openSync(file, "r");
  const buffer = Buffer.allocUnsafe(64 * 1024);
  try {
    let length: number;
    while ((length = fs.readSync(descriptor, buffer, 0, buffer.length, null)) > 0) hash.update(buffer.subarray(0, length));
    return hash.digest("hex");
  } finally { fs.closeSync(descriptor); }
}
function regularFile(file: string): boolean {
  try { const stat = fs.lstatSync(file); return stat.isFile() && !stat.isSymbolicLink(); }
  catch { return false; }
}
function nextInstant(times: string[]): string {
  return new Date(Math.max(Date.now(), ...times.map(time => Date.parse(time) + 1))).toISOString();
}
function verifyDatabase(file: string): ProjectId[] {
  const database = openProjectStateDatabase(file);
  try {
    const version = (database.prepare("PRAGMA user_version").get() as { user_version: number }).user_version;
    if (version !== PROJECT_STATE_DATABASE_SCHEMA_VERSION) invalid("Recovery schema version is unsupported.");
    if ((database.prepare("PRAGMA integrity_check").get() as { integrity_check: string }).integrity_check !== "ok") invalid("Recovery SQLite integrity check failed.");
    if (database.prepare("PRAGMA foreign_key_check").all().length) invalid("Recovery foreign keys failed validation.");
    return (database.prepare("SELECT project_id FROM projects ORDER BY project_id").all() as { project_id: string }[]).map(row => row.project_id);
  } finally { database.close(); }
}

/** Backup files and evidence live beside the caller-selected Project State database, never in source control. */
export function createSQLiteProjectStateRecovery(databasePath: string, source: BackupSource,
  policy: BackupRetentionPolicy = { maxBackups: 5, maxAgeDays: 30, maxCandidates: 5 }) {
  if (!path.isAbsolute(databasePath) || !source || typeof source.createOnlineBackup !== "function") invalid("A selected SQLite Project State source is required.");
  validPolicy(policy);
  const root = path.join(path.dirname(databasePath), "project-state-backups");
  const manifestPath = path.join(root, "backup-manifest.json");
  const candidateRoot = path.join(root, "candidates");
  const parentReal = fs.realpathSync(path.dirname(databasePath));
  if (path.dirname(fs.realpathSync(databasePath)) !== parentReal) invalid("Project State database escapes its selected storage boundary.");
  fs.mkdirSync(root, { recursive: true });
  const rootReal = fs.realpathSync(root);
  if (path.dirname(rootReal) !== parentReal) invalid("Backup storage escapes the selected Project State boundary.");
  fs.mkdirSync(candidateRoot, { recursive: true });
  const candidateReal = fs.realpathSync(candidateRoot);
  if (path.dirname(candidateReal) !== rootReal) invalid("Backup storage escapes the selected Project State boundary.");

  function readManifest(): RecoveryManifest {
    if (!fs.existsSync(manifestPath)) return { version: 1, policy, backups: [], recoveries: [] };
    let value: unknown;
    try { value = JSON.parse(fs.readFileSync(manifestPath, "utf8")); }
    catch { return invalid("Backup manifest is unreadable."); }
    if (!value || typeof value !== "object" || (value as RecoveryManifest).version !== 1 || !Array.isArray((value as RecoveryManifest).backups) || !Array.isArray((value as RecoveryManifest).recoveries)) invalid("Backup manifest is invalid.");
    return value as RecoveryManifest;
  }
  function writeManifest(manifest: RecoveryManifest) {
    const temporary = path.join(root, `manifest-${randomUUID()}.tmp`);
    fs.writeFileSync(temporary, `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" });
    fs.renameSync(temporary, manifestPath);
  }
  function prune(manifest: RecoveryManifest) {
    const cutoff = Date.now() - policy.maxAgeDays * 86_400_000;
    const sorted = [...manifest.backups].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
    const keep = sorted.filter((item, index) => index < policy.maxBackups && Date.parse(item.createdAt) >= cutoff);
    const retainedIds = new Set(keep.map(item => item.id));
    const removed = sorted.filter(item => !retainedIds.has(item.id));
    manifest.backups = keep;
    const selected = manifest.recoveries.filter(item => item.status === "selected");
    if (selected.length > policy.maxCandidates) invalid("Selected recovery candidates exceed the retention bound.");
    const prepared = manifest.recoveries.filter(item => item.status === "prepared")
      .sort((a, b) => b.preparedAt.localeCompare(a.preparedAt) || b.id.localeCompare(a.id));
    const available = policy.maxCandidates - selected.length;
    const removedRecoveries = prepared.slice(available);
    manifest.recoveries = [...selected, ...prepared.slice(0, available)];
    writeManifest(manifest);
    for (const item of removed) fs.rmSync(safeFile(root, item.fileName, "backup"), { force: true });
    for (const item of removedRecoveries) fs.rmSync(safeFile(root, item.fileName, "candidate"), { force: true });
  }

  return {
    listEvidence() { const manifest = readManifest(); return { policy: manifest.policy, backups: manifest.backups, recoveries: manifest.recoveries }; },
    async createBackup(): Promise<BackupEvidence> {
      const fileName = `backup-${randomUUID()}.sqlite`;
      const file = safeFile(root, fileName, "backup");
      const liveIds = verifyDatabase(databasePath);
      try {
        const pages = await source.createOnlineBackup(file);
        const projectIds = verifyDatabase(file);
        if (!sameIds(projectIds, liveIds)) invalid("Backup Project identities differ from the live source.");
        const manifest = readManifest();
        const now = nextInstant(manifest.backups.map(item => item.createdAt));
        const evidence: BackupEvidence = { id: randomUUID(), fileName, createdAt: now, verifiedAt: now,
          schemaVersion: PROJECT_STATE_DATABASE_SCHEMA_VERSION, projectIds, sha256: digest(file), bytes: fs.statSync(file).size, pages };
        manifest.policy = policy;
        manifest.backups.push(evidence);
        prune(manifest);
        return evidence;
      } catch (error) {
        fs.rmSync(file, { force: true });
        throw error;
      }
    },
    async prepareRestoreCandidate(backupId: string, expectedProjectIds: ProjectId[]): Promise<RecoveryEvidence> {
      if (!Array.isArray(expectedProjectIds) || expectedProjectIds.length === 0 || new Set(expectedProjectIds).size !== expectedProjectIds.length) invalid("Expected Project identities are required.");
      const expected = [...expectedProjectIds].sort();
      const manifest = readManifest();
      const sourceEvidence = manifest.backups.find(item => item.id === backupId);
      if (!sourceEvidence) invalid("Backup evidence does not exist.");
      const sourceFile = safeFile(root, sourceEvidence.fileName, "backup");
      if (!regularFile(sourceFile) || digest(sourceFile) !== sourceEvidence.sha256 || !sameIds(sourceEvidence.projectIds, expected)) invalid("Backup evidence or Project identities do not match.");
      const fileName = `candidate-${randomUUID()}.sqlite`;
      const candidateFile = safeFile(root, fileName, "candidate");
      try {
        const sourceDatabase = new DatabaseSync(sourceFile, { readOnly: true });
        try { await backup(sourceDatabase, candidateFile); }
        finally { sourceDatabase.close(); }
        const actualIds = verifyDatabase(candidateFile);
        if (!sameIds(actualIds, expected)) invalid("Restore candidate Project identities do not match.");
        const now = nextInstant(manifest.recoveries.map(item => item.preparedAt));
        const evidence: RecoveryEvidence = { id: randomUUID(), backupId, fileName, preparedAt: now,
          verifiedAt: now, projectIds: actualIds, sha256: digest(candidateFile), status: "prepared" };
        manifest.recoveries.push(evidence);
        prune(manifest);
        return evidence;
      } catch (error) {
        fs.rmSync(candidateFile, { force: true });
        throw error;
      }
    },
    selectVerifiedCandidate(candidateId: string, expectedProjectIds: ProjectId[]) {
      if (!Array.isArray(expectedProjectIds) || expectedProjectIds.length === 0) invalid("Expected Project identities are required.");
      const expected = [...expectedProjectIds].sort();
      const manifest = readManifest();
      const evidence = manifest.recoveries.find(item => item.id === candidateId);
      if (!evidence || evidence.status !== "prepared") invalid("Prepared recovery candidate does not exist.");
      const candidateFile = safeFile(root, evidence.fileName, "candidate");
      if (!regularFile(candidateFile) || digest(candidateFile) !== evidence.sha256) invalid("Recovery candidate differs from verified evidence.");
      const actualIds = verifyDatabase(candidateFile);
      if (!sameIds(actualIds, expected) || !sameIds(actualIds, evidence.projectIds)) invalid("Recovery candidate Project identities do not match.");
      const selectedAt = new Date().toISOString();
      const selected: RecoveryEvidence = { ...evidence, selectedAt, status: "selected" };
      manifest.recoveries = manifest.recoveries.map(item => item.id === candidateId ? selected : item);
      const selectedStore = createSQLiteProjectStateStore(candidateFile);
      try {
        writeManifest(manifest);
        return { evidence: selected, candidatePath: candidateFile, store: selectedStore };
      } catch (error) { selectedStore.close(); throw error; }
    },
  };
}
