import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { parseCanonicalMarkdownDocument, type CanonicalDocumentMetadata } from "../../shared/documents/canonicalMarkdown";

export type LegacyFamily = "project-architect-planning" | "work-intake-routing" | "development-phase-work-repair" | "issue-resolution" | "validation-close" | "source-revision";
export interface LegacyAuthorityDocument {
  path: string;
  sha256: string;
  bytes: number;
  content: string;
  metadata: CanonicalDocumentMetadata;
  families: LegacyFamily[];
  aliases: Record<string, unknown>;
  sourceRevisions: CanonicalDocumentMetadata["sourceRevisions"];
  resourceBindings: Record<string, unknown>;
}
export interface LegacyInventoryConflict { path: string; code: "unreadable" | "invalid-metadata" | "duplicate-identity" | "duplicate-path" | "missing-source" | "source-revision-mismatch" | "unsupported-artifact"; detail: string }
export interface LegacyAuthoritySnapshot { formatVersion: 1; snapshotId: string; digest: string; documents: LegacyAuthorityDocument[]; conflicts: LegacyInventoryConflict[]; complete: boolean }

const maxDocuments = 5000;
const maxFileBytes = 2_000_000;
const maxTotalBytes = 50_000_000;
const sourceKeys = new Set(["source-binding", "source-checkpoint", "integration-record", "routed-development-execution-binding", "integration-candidate", "integration-repair", "work-item-checkpoint", "lifecycle-evidence-checkpoint"]);

function hash(value: string | Buffer): string { return createHash("sha256").update(value).digest("hex"); }
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => `${JSON.stringify(key)}:${stable(entry)}`).join(",")}}`;
  return JSON.stringify(value);
}
function relative(root: string, file: string): string { return path.relative(root, file).split(path.sep).join("/"); }
function family(file: string, kind: string, metadata: CanonicalDocumentMetadata): LegacyFamily[] {
  const result = new Set<LegacyFamily>();
  if (/^issues\//.test(file) || kind.startsWith("issue-") || kind.startsWith("fix-card")) result.add("issue-resolution");
  if (/^planning\/work-intake\//.test(file) || kind.startsWith("work-intake") || kind.startsWith("work-planning") || kind.startsWith("routed-")) result.add("work-intake-routing");
  if (/project|architect|planning|roadmap|interview|assessment|handoff|profile/.test(kind)) result.add("project-architect-planning");
  if (/work-card|repair|phase|implementer|execution-plan/.test(kind)) result.add("development-phase-work-repair");
  if (/validation|close|acceptance/.test(kind)) result.add("validation-close");
  if (metadata.sourceRevisions.length || sourceKeys.has(kind) || metadata.workflowData.repositoryBinding || metadata.workflowData.branchBinding) result.add("source-revision");
  return [...result].sort();
}
function bindings(data: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(["repositoryBinding", "repositoryAuthority", "projectRepository", "repositoryId", "branchBinding", "sourceBinding", "mcpWorkspaceBinding"].filter(key => data[key] !== undefined).map(key => [key, data[key]]));
}

/** Captures canonical V1 authority from one selected workspace without writing either authority. */
export function inventoryLegacyMarkdownAuthority(workspaceRoot: string): LegacyAuthoritySnapshot {
  const root = fs.realpathSync(workspaceRoot);
  if (!fs.statSync(root).isDirectory()) throw Error("Selected workspace is not a directory.");
  const files: string[] = [];
  const conflicts: LegacyInventoryConflict[] = [];
  for (const directory of ["planning", "issues"]) {
    const start = path.join(root, directory);
    if (!fs.existsSync(start)) continue;
    if (!fs.lstatSync(start).isDirectory() || fs.lstatSync(start).isSymbolicLink()) throw Error(`Legacy authority root ${directory} is not a regular directory.`);
    const visit = (folder: string): void => {
      let entries: fs.Dirent[];
      try { entries = fs.readdirSync(folder, { withFileTypes: true }); }
      catch { conflicts.push({ path: relative(root, folder), code: "unreadable", detail: "Legacy authority directory is unreadable." }); return; }
      for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
        const file = path.join(folder, entry.name);
        if (entry.isSymbolicLink()) { conflicts.push({ path: relative(root, file), code: "unreadable", detail: "Symbolic-link authority is unsupported." }); continue; }
        if (entry.isDirectory() && entry.name.toLowerCase() === "architect_drafts") continue;
        if (entry.isDirectory()) visit(file);
        else if (entry.name.toLowerCase().endsWith(".md")) {
          if (!entry.isFile()) conflicts.push({ path: relative(root, file), code: "unreadable", detail: "Markdown authority is not a regular file." });
          else files.push(file);
          if (files.length + conflicts.length > maxDocuments) throw Error("Legacy authority inventory exceeds the document bound.");
        }
      }
    };
    visit(start);
  }
  files.sort((a, b) => relative(root, a).localeCompare(relative(root, b)));
  const documents: LegacyAuthorityDocument[] = [];
  let totalBytes = 0;
  for (const file of files) {
    const name = relative(root, file);
    try {
      const stat = fs.lstatSync(file);
      if (!stat.isFile() || stat.isSymbolicLink()) throw Error("Legacy authority is not a regular file.");
      const size = stat.size;
      if (size > maxFileBytes || totalBytes + size > maxTotalBytes) throw Error("Legacy authority exceeds the bounded byte limit.");
      const raw = fs.readFileSync(file);
      totalBytes += raw.length;
      if (raw.length !== size) throw Error("Legacy authority changed during snapshot capture.");
      const content = new TextDecoder("utf-8", { fatal: true }).decode(raw);
      let metadata: CanonicalDocumentMetadata;
      try { metadata = parseCanonicalMarkdownDocument(content).metadata; }
      catch (error) { conflicts.push({ path: name, code: "invalid-metadata", detail: error instanceof Error ? error.message : String(error) }); continue; }
      const families = family(name, metadata.artifactType, metadata);
      if (!families.length) conflicts.push({ path: name, code: "unsupported-artifact", detail: `Unclassified artifact type ${metadata.artifactType}.` });
      documents.push({ path: name, sha256: hash(raw), bytes: raw.length, content, metadata, families,
        aliases: metadata.identity, sourceRevisions: metadata.sourceRevisions, resourceBindings: bindings(metadata.workflowData) });
    } catch (error) { conflicts.push({ path: name, code: "unreadable", detail: (error instanceof Error ? error.message : String(error)).replaceAll(root, "<PROJECT_REPO>") }); }
  }
  const byIdentity = new Map<string, string>();
  const byPath = new Map(documents.map(document => [document.path, document]));
  const pathCases = new Map<string, string>();
  for (const document of documents) {
    const lowered = document.path.toLowerCase();
    const previousCase = pathCases.get(lowered);
    if (previousCase && previousCase !== document.path) conflicts.push({ path: document.path, code: "duplicate-path", detail: `Path collides with ${previousCase}.` });
    pathCases.set(lowered, document.path);
    const key = stable([document.metadata.artifactType, document.metadata.identity]);
    const previous = byIdentity.get(key);
    if (previous) conflicts.push({ path: document.path, code: "duplicate-identity", detail: `Identity duplicates ${previous}.` });
    else byIdentity.set(key, document.path);
    for (const source of document.sourceRevisions) {
      const target = byPath.get(source.path.replace(/\\/g, "/"));
      if (!target) conflicts.push({ path: document.path, code: "missing-source", detail: `Source document is missing: ${source.path}.` });
      else if (target.metadata.artifactRevision !== source.revision) conflicts.push({ path: document.path, code: "source-revision-mismatch", detail: `Source revision disagrees with ${source.path}.` });
    }
  }
  conflicts.sort((a, b) => a.path.localeCompare(b.path) || a.code.localeCompare(b.code) || a.detail.localeCompare(b.detail));
  const digest = hash(stable({ formatVersion: 1, documents: documents.map(({ path: name, sha256, metadata, families, aliases, sourceRevisions, resourceBindings }) => ({ path: name, sha256, metadata, families, aliases, sourceRevisions, resourceBindings })), conflicts }));
  return { formatVersion: 1, snapshotId: `legacy-v1-${digest}`, digest, documents, conflicts, complete: conflicts.length === 0 };
}
