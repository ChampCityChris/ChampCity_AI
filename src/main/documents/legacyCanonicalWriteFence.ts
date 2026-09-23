import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const cutoverFences = new Set<string>();

/** Blocks every canonical V1 write in this main process, including callbacks that finish after cutover starts. */
export function acquireLegacyCutoverFence(workspaceRoot: string): () => void {
  const root = fs.realpathSync(workspaceRoot);
  if (cutoverFences.has(root)) throw Error("A Project State cutover already owns the legacy writer fence.");
  cutoverFences.add(root);
  return () => { cutoverFences.delete(root); };
}

/** Temporary V1 compatibility fence: legacy writes end when the durable provider generation selects structured authority. */
export function assertLegacyCanonicalWriteAllowed(workspaceRoot: string): void {
  assertLegacyCanonicalAccessAllowed(workspaceRoot, "writes");
}

/** A cut-over Project may read historical Markdown as Evidence, but not reconstruct current state from it. */
export function assertLegacyCanonicalReadAllowed(workspaceRoot: string): void {
  assertLegacyCanonicalAccessAllowed(workspaceRoot, "reads");
}

function assertLegacyCanonicalAccessAllowed(workspaceRoot: string, action: "reads" | "writes"): void {
  const root = fs.realpathSync(workspaceRoot);
  if (cutoverFences.has(root)) throw Error(`Legacy canonical Markdown ${action} are fenced during Project State cutover.`);
  const appRoot = path.join(root, ".champcity");
  if (!fs.existsSync(appRoot)) return;
  if (fs.lstatSync(appRoot).isSymbolicLink() || !fs.lstatSync(appRoot).isDirectory() || path.dirname(fs.realpathSync(appRoot)) !== root) {
    throw Error("Application authority storage escapes the selected workspace.");
  }
  const databasePath = path.join(appRoot, "project-state.sqlite");
  if (!fs.existsSync(databasePath)) return;
  if (fs.lstatSync(databasePath).isSymbolicLink() || !fs.lstatSync(databasePath).isFile()) throw Error("Project State authority store is invalid.");
  const database = new DatabaseSync(databasePath, { readOnly: true });
  try {
    const row = database.prepare("SELECT COUNT(*) AS selected FROM project_state_authority WHERE authority = 'structured'").get() as { selected: number };
    if (row.selected > 0) throw Error(`Legacy canonical Markdown ${action} are fenced after Structured Project State authority selection.`);
  } finally { database.close(); }
}
