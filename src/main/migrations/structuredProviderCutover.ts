import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { StateProviderGeneration } from "../../shared/projectState/projectStateStore";
import { acquireLegacyCutoverFence } from "../documents/legacyCanonicalWriteFence";
import { createSQLiteProjectStateRecovery, type BackupEvidence } from "../projectState/sqliteProjectStateRecovery";
import { createSQLiteProjectStateStore } from "../projectState/sqliteProjectStateStore";
import { PROJECT_STATE_DATABASE_SCHEMA_VERSION } from "../projectState/sqliteSchema";
import { verifyStagedLegacyEquivalence } from "./legacyEquivalenceVerification";
import { inventoryLegacyMarkdownAuthority, type LegacyAuthoritySnapshot } from "./legacyAuthorityInventory";
import type { StagedLegacyImport } from "./stagedLegacyImporter";

export interface CutoverReceipt { projectId: string; generation: number; authority: "structured"; outcome: "selected" | "recovered"; candidateBackup: BackupEvidence; priorBackup?: BackupEvidence }
export interface CutoverHooks { beforeSelection?: () => void; afterSelection?: () => void }

function livePaths(workspaceRoot: string) {
  const root = fs.realpathSync(workspaceRoot);
  const appRoot = path.join(root, ".champcity");
  if (!fs.existsSync(appRoot) || fs.lstatSync(appRoot).isSymbolicLink() || !fs.lstatSync(appRoot).isDirectory() || path.dirname(fs.realpathSync(appRoot)) !== root) {
    throw Error("Project State application storage is unavailable or escapes the selected workspace.");
  }
  return { root, appRoot, live: path.join(appRoot, "project-state.sqlite") };
}

/** Recovery reads only the durable live provider row; caller memory and a staged candidate never select authority. */
export function readDurableProviderGeneration(workspaceRoot: string, projectId: string): StateProviderGeneration | null {
  const { live } = livePaths(workspaceRoot);
  if (!fs.existsSync(live)) return null;
  if (fs.lstatSync(live).isSymbolicLink() || !fs.lstatSync(live).isFile()) throw Error("Live Project State store is invalid.");
  const database = new DatabaseSync(live, { readOnly: true });
  try {
    const schema = (database.prepare("PRAGMA user_version").get() as { user_version: number }).user_version;
    if (schema !== PROJECT_STATE_DATABASE_SCHEMA_VERSION) throw Error("Live Project State schema is unsupported.");
    const projects = database.prepare("SELECT project_id FROM projects").all() as { project_id: string }[];
    if (projects.some(row => row.project_id !== projectId)) throw Error("Live Project State belongs to another Project.");
    const row = database.prepare("SELECT project_id, generation, authority, updated_at FROM project_state_authority WHERE project_id = ?").get(projectId) as
      { project_id: string; generation: number; authority: "legacy" | "structured"; updated_at: string } | undefined;
    return row ? { projectId: row.project_id, generation: row.generation, authority: row.authority, updatedAt: row.updated_at } : null;
  } finally { database.close(); }
}

function digest(file: string): string { return createHash("sha256").update(fs.readFileSync(file)).digest("hex"); }
function installEvidence(appRoot: string, staged: StagedLegacyImport, snapshot: LegacyAuthoritySnapshot): void {
  const sourceRoot = path.join(staged.stageRoot, "legacy-evidence");
  const destinationRoot = path.join(appRoot, "legacy-evidence");
  if (fs.existsSync(destinationRoot) && (fs.lstatSync(destinationRoot).isSymbolicLink() || !fs.lstatSync(destinationRoot).isDirectory())) throw Error("Live legacy Evidence directory is invalid.");
  fs.mkdirSync(destinationRoot, { recursive: true });
  if (path.dirname(fs.realpathSync(destinationRoot)) !== fs.realpathSync(appRoot)) throw Error("Live legacy Evidence escapes Project State storage.");
  for (const hash of new Set(snapshot.documents.map(document => document.sha256))) {
    const name = `${hash}.md`;
    const source = path.join(sourceRoot, name);
    const destination = path.join(destinationRoot, name);
    if (!/^[a-f0-9]{64}\.md$/.test(name) || !fs.lstatSync(source).isFile() || fs.lstatSync(source).isSymbolicLink() || digest(source) !== hash) throw Error("Staged legacy Evidence failed integrity verification.");
    if (fs.existsSync(destination)) {
      if (!fs.lstatSync(destination).isFile() || fs.lstatSync(destination).isSymbolicLink() || digest(destination) !== hash) throw Error("Live legacy Evidence conflicts with the staged source.");
    } else fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
  }
}

/** The live SQLite rename is the selection point: its row is already structured before becoming visible. */
export async function cutOverLegacyProject(workspaceRoot: string, snapshot: LegacyAuthoritySnapshot,
  staged: StagedLegacyImport, hooks: CutoverHooks = {}): Promise<CutoverReceipt> {
  const { root, appRoot, live } = livePaths(workspaceRoot);
  const release = acquireLegacyCutoverFence(root);
  const transferId = randomUUID().replaceAll("-", "").slice(0, 16);
  const temporary = path.join(appRoot, `p-${transferId}.sqlite`);
  const stagingCopy = path.join(staged.stageRoot, `t-${transferId}.sqlite`);
  let candidate: ReturnType<typeof createSQLiteProjectStateStore> | undefined;
  let prior: ReturnType<typeof createSQLiteProjectStateStore> | undefined;
  let selected = false;
  let candidateBackup: BackupEvidence | undefined;
  let priorBackup: BackupEvidence | undefined;
  try {
    const previous = readDurableProviderGeneration(root, staged.projectId);
    if (previous?.authority === "structured") throw Error("Structured Project State is already the durable authority; cutover is exactly once.");
    if (!snapshot.complete || staged.projectId.length === 0) throw Error("Complete legacy source and staged Project identity are required.");
    const current = inventoryLegacyMarkdownAuthority(root);
    if (!current.complete || current.snapshotId !== snapshot.snapshotId || current.digest !== snapshot.digest ||
      JSON.stringify(current.documents) !== JSON.stringify(snapshot.documents)) throw Error("Legacy source changed before the cutover fence.");
    const equivalence = await verifyStagedLegacyEquivalence(root, snapshot, staged, { shadowRead: true });
    if (!equivalence.eligible || equivalence.mismatches.some(item => item.severity === "blocking")) throw Error("Blocking legacy equivalence mismatch prevents cutover.");
    if (readDurableProviderGeneration(root, staged.projectId)?.generation !== previous?.generation) throw Error("Provider generation changed during cutover verification.");
    if (fs.existsSync(live)) {
      prior = createSQLiteProjectStateStore(live);
      priorBackup = await createSQLiteProjectStateRecovery(live, prior).createBackup();
      prior.close(); prior = undefined;
    }
    const source = createSQLiteProjectStateStore(staged.databasePath);
    try { await source.createOnlineBackup(stagingCopy); }
    finally { source.close(); }
    fs.renameSync(stagingCopy, temporary);
    candidate = createSQLiteProjectStateStore(temporary);
    if (await candidate.getProviderGeneration(staged.projectId)) throw Error("Staged candidate already has provider authority.");
    const now = new Date().toISOString();
    for (let generation = 1; generation <= (previous?.generation ?? 0); generation++) {
      await candidate.transaction(staged.projectId, unit => unit.advanceProviderGeneration({ projectId: staged.projectId,
        generation, authority: "legacy", updatedAt: now }, generation === 1 ? null : generation - 1));
    }
    const generation = (previous?.generation ?? 0) + 1;
    await candidate.transaction(staged.projectId, unit => unit.advanceProviderGeneration({ projectId: staged.projectId,
      generation, authority: "structured", updatedAt: now }, previous?.generation ?? null));
    candidateBackup = await createSQLiteProjectStateRecovery(temporary, candidate).createBackup();
    candidate.close(); candidate = undefined;
    installEvidence(appRoot, staged, snapshot);
    if (readDurableProviderGeneration(root, staged.projectId)?.generation !== previous?.generation) throw Error("Provider generation changed before selection.");
    hooks.beforeSelection?.();
    fs.renameSync(temporary, live);
    selected = true;
    hooks.afterSelection?.();
    const durable = readDurableProviderGeneration(root, staged.projectId);
    if (durable?.authority !== "structured" || durable.generation !== generation) throw Error("Durable provider selection could not be verified.");
    return { projectId: staged.projectId, generation, authority: "structured", outcome: "selected", candidateBackup, ...(priorBackup ? { priorBackup } : {}) };
  } catch (error) {
    candidate?.close(); prior?.close();
    const durable = readDurableProviderGeneration(root, staged.projectId);
    if (selected && durable?.authority === "structured" && candidateBackup) return { projectId: staged.projectId,
      generation: durable.generation, authority: "structured", outcome: "recovered", candidateBackup,
      ...(priorBackup ? { priorBackup } : {}) };
    if (fs.existsSync(stagingCopy)) fs.rmSync(stagingCopy, { force: true });
    if (fs.existsSync(temporary)) fs.rmSync(temporary, { force: true });
    throw error;
  } finally { release(); }
}

/** Administrative rollback is allowed only before any structured mutation and while exact legacy source remains. */
export async function rollBackUnwrittenCutover(workspaceRoot: string, projectId: string, snapshotDigest: string,
  expectedGeneration: number, administrative: true): Promise<StateProviderGeneration> {
  if (administrative !== true) throw Error("Administrative rollback authorization is required.");
  const { root, live } = livePaths(workspaceRoot);
  const release = acquireLegacyCutoverFence(root);
  try {
    const current = readDurableProviderGeneration(root, projectId);
    if (!current || current.authority !== "structured" || current.generation !== expectedGeneration) throw Error("Structured provider generation changed; rollback is unavailable.");
    const legacy = inventoryLegacyMarkdownAuthority(root);
    if (!legacy.complete || legacy.digest !== snapshotDigest) throw Error("Legacy source changed; rollback is unavailable.");
    const database = new DatabaseSync(live, { readOnly: true });
    try {
      const mutations = (database.prepare("SELECT COUNT(*) AS count FROM state_changes WHERE project_id = ? AND occurred_at >= ?").get(projectId, current.updatedAt) as { count: number }).count;
      if (mutations !== 0) throw Error("Structured mutations occurred after cutover; rollback is unavailable.");
    } finally { database.close(); }
    const store = createSQLiteProjectStateStore(live);
    try {
      await createSQLiteProjectStateRecovery(live, store).createBackup();
      const next = { projectId, generation: expectedGeneration + 1, authority: "legacy" as const, updatedAt: new Date().toISOString() };
      await store.transaction(projectId, unit => unit.advanceProviderGeneration(next, expectedGeneration));
      return next;
    } finally { store.close(); }
  } finally { release(); }
}
