import fs from "node:fs";
import path from "node:path";
import {
  type CanonicalDocumentMetadata,
  parseCanonicalMarkdownDocument,
} from "../../shared/documents/canonicalMarkdown";
import type {
  WorkspaceMigrationPreview,
  WorkspaceMigrationResult,
} from "../../shared/workspaceContracts";
import { writeCanonicalMarkdownDocument } from "../documents/canonicalMarkdownDocumentWriter";

export interface PairedArtifactMigrationItem {
  markdownPath: string;
  jsonPath: string;
  targetMarkdownPath: string;
  filesToDelete: string[];
  status: "ready" | "blocked";
  findings: string[];
  error?: string;
}

export interface PairedArtifactMigrationPreview {
  migrationId: "paired-artifacts-to-canonical-markdown-v1";
  items: PairedArtifactMigrationItem[];
  readyCount: number;
  blockedCount: number;
}

export interface PairedArtifactMigrationResult {
  preview: PairedArtifactMigrationPreview;
  migratedPaths: string[];
  deletedPaths: string[];
}

export function previewPairedArtifactsToCanonicalMarkdownV1(
  workspaceRoot: string,
): PairedArtifactMigrationPreview {
  const resolvedRoot = path.resolve(workspaceRoot);
  const planningRoot = path.join(resolvedRoot, "planning");
  const markdownFiles = discover(planningRoot, ".md", resolvedRoot);
  const jsonFiles = new Set(discover(planningRoot, ".json", resolvedRoot));
  const items: PairedArtifactMigrationItem[] = [];
  const seenMarkdown = new Set<string>();

  for (const markdownPath of markdownFiles) {
    if (isAlreadyCanonical(resolvedRoot, markdownPath)) {
      continue;
    }
    const jsonPath = `${stripExtension(markdownPath)}.json`;
    seenMarkdown.add(jsonPath);
    if (!jsonFiles.has(jsonPath)) {
      items.push(blockedItem(markdownPath, jsonPath, "Missing legacy JSON sibling."));
      continue;
    }
    items.push(previewItem(resolvedRoot, markdownPath, jsonPath));
  }
  for (const jsonPath of jsonFiles) {
    if (seenMarkdown.has(jsonPath)) continue;
    const markdownPath = `${stripExtension(jsonPath)}.md`;
    if (!markdownFiles.includes(markdownPath)) {
      items.push(blockedItem(markdownPath, jsonPath, "Missing legacy Markdown sibling."));
    }
  }

  const activeIdentityCounts = new Map<string, number>();
  for (const item of items) {
    if (item.status !== "ready") continue;
    const key = activeIdentityKey(resolvedRoot, item.jsonPath);
    activeIdentityCounts.set(key, (activeIdentityCounts.get(key) ?? 0) + 1);
  }
  for (const item of items) {
    if (item.status !== "ready") continue;
    const key = activeIdentityKey(resolvedRoot, item.jsonPath);
    if ((activeIdentityCounts.get(key) ?? 0) > 1) {
      item.status = "blocked";
      item.findings.push("Duplicate active identity.");
      item.error = "Duplicate active identity.";
    }
  }

  return {
    migrationId: "paired-artifacts-to-canonical-markdown-v1",
    items,
    readyCount: items.filter((item) => item.status === "ready").length,
    blockedCount: items.filter((item) => item.status === "blocked").length,
  };
}

export function migratePairedArtifactsToCanonicalMarkdownV1(
  workspaceRoot: string,
): PairedArtifactMigrationResult {
  const preview = previewPairedArtifactsToCanonicalMarkdownV1(workspaceRoot);
  if (preview.blockedCount > 0) {
    throw new Error(`Workspace migration blocked by ${preview.blockedCount} document(s).`);
  }
  const migratedPaths: string[] = [];
  const deletedPaths: string[] = [];
  for (const item of preview.items) {
    const json = readJson(workspaceRoot, item.jsonPath);
    const markdown = fs.readFileSync(path.join(workspaceRoot, item.markdownPath), "utf8");
    const metadata = metadataFromLegacyJson(json);
    const bodyMarkdown = stripLegacyAuthoritySections(markdown);
    writeCanonicalMarkdownDocument({
      workspaceRoot,
      relativePath: item.targetMarkdownPath,
      metadata,
      bodyMarkdown,
    });
    parseCanonicalMarkdownDocument(fs.readFileSync(path.join(workspaceRoot, item.targetMarkdownPath), "utf8"));
    fs.unlinkSync(path.join(workspaceRoot, item.jsonPath));
    migratedPaths.push(item.targetMarkdownPath);
    deletedPaths.push(item.jsonPath);
  }
  return { preview, migratedPaths, deletedPaths };
}

export function previewWorkspaceMigrationToCanonicalMarkdownV1(
  workspaceRoot: string,
): WorkspaceMigrationPreview {
  return toWorkspaceMigrationPreview(previewPairedArtifactsToCanonicalMarkdownV1(workspaceRoot));
}

export function migrateWorkspaceToCanonicalMarkdownV1(
  workspaceRoot: string,
): WorkspaceMigrationResult {
  const result = migratePairedArtifactsToCanonicalMarkdownV1(workspaceRoot);
  return {
    preview: toWorkspaceMigrationPreview(result.preview),
    migratedPaths: result.migratedPaths,
    deletedPaths: result.deletedPaths,
  };
}

function toWorkspaceMigrationPreview(
  preview: PairedArtifactMigrationPreview,
): WorkspaceMigrationPreview {
  return {
    migrationId: preview.migrationId,
    state: preview.blockedCount > 0 ? "blocked" : preview.readyCount > 0 ? "required" : "not-required",
    readyCount: preview.readyCount,
    blockedCount: preview.blockedCount,
    items: preview.items.map((item) => ({
      markdownPath: item.markdownPath,
      legacyDataPath: item.jsonPath,
      targetMarkdownPath: item.targetMarkdownPath,
      filesToDelete: item.filesToDelete,
      status: item.status,
      findings: item.error ? [...item.findings, item.error] : item.findings,
    })),
  };
}

function previewItem(
  workspaceRoot: string,
  markdownPath: string,
  jsonPath: string,
): PairedArtifactMigrationItem {
  try {
    const json = readJson(workspaceRoot, jsonPath);
    const metadata = metadataFromLegacyJson(json);
    const findings = legacyMarkdownFindings(workspaceRoot, markdownPath, metadata);
    const mismatchFindings = findings.filter((finding) => finding !== "Valid legacy Markdown/JSON pair.");
    return {
      markdownPath,
      jsonPath,
      targetMarkdownPath: markdownPath,
      filesToDelete: [jsonPath],
      status: mismatchFindings.length > 0 ? "blocked" : "ready",
      findings,
      error: mismatchFindings.length > 0 ? "Legacy Markdown/JSON authority mismatch." : undefined,
    };
  } catch (error) {
    return {
      markdownPath,
      jsonPath,
      targetMarkdownPath: markdownPath,
      filesToDelete: [jsonPath],
      status: "blocked",
      findings: ["Malformed or ambiguous legacy metadata."],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function blockedItem(markdownPath: string, jsonPath: string, finding: string): PairedArtifactMigrationItem {
  return {
    markdownPath,
    jsonPath,
    targetMarkdownPath: markdownPath,
    filesToDelete: [],
    status: "blocked",
    findings: [finding],
    error: finding,
  };
}

function metadataFromLegacyJson(json: Record<string, unknown>): CanonicalDocumentMetadata {
  const disposition = json.documentDisposition && typeof json.documentDisposition === "object"
    ? json.documentDisposition as { status?: unknown; notes?: unknown; reviewedAt?: unknown }
    : {};
  return {
    schemaVersion: 1,
    artifactType: requiredString(json.artifactType, "artifactType"),
    artifactRevision: requiredPositiveInteger(json.artifactRevision, "artifactRevision"),
    participationRole: requiredParticipationRole(json.participationRole),
    identity: identityFromJson(json),
    sourceRevisions: sourceRevisions(json.sourceRevisions),
    workflowData: workflowDataFromJson(json),
    documentDisposition: {
      status: requiredDispositionStatus(disposition.status),
      notes: typeof disposition.notes === "string" ? disposition.notes : "",
      reviewedAt: typeof disposition.reviewedAt === "string" ? disposition.reviewedAt : null,
    },
  };
}

function legacyMarkdownFindings(
  workspaceRoot: string,
  markdownPath: string,
  metadata: CanonicalDocumentMetadata,
): string[] {
  const markdown = fs.readFileSync(path.join(workspaceRoot, markdownPath), "utf8");
  const findings = ["Valid legacy Markdown/JSON pair."];
  const artifactType = markdown.match(/^Artifact\.Type=(.+?)\s*$/im)?.[1]?.trim();
  if (artifactType && artifactType !== metadata.artifactType) {
    findings.push("Artifact type mismatch.");
  }
  const markdownIdentity = legacyMarkdownIdentity(markdown);
  if (markdownIdentity && JSON.stringify(markdownIdentity) !== JSON.stringify(metadata.identity)) {
    findings.push("Canonical identity mismatch.");
  }
  const revision = markdown.match(/^Artifact\.Revision=([0-9]+)\s*$/im)?.[1];
  if (revision && Number(revision) !== metadata.artifactRevision) {
    findings.push("Revision mismatch.");
  }
  const disposition = markdown.match(/^Document\.Status=([A-Za-z]+)\s*$/im)?.[1];
  if (disposition && disposition !== metadata.documentDisposition.status) {
    findings.push("Disposition mismatch.");
  }
  const markdownSources = legacyMarkdownSourceRevisions(markdown);
  if (markdownSources && !sameSourceRevisions(markdownSources, metadata.sourceRevisions)) {
    findings.push("Source mismatch.");
  }
  return findings;
}

function activeIdentityKey(workspaceRoot: string, jsonPath: string): string {
  const metadata = metadataFromLegacyJson(readJson(workspaceRoot, jsonPath));
  return JSON.stringify({
    artifactType: metadata.artifactType,
    identity: metadata.identity,
  });
}

function legacyMarkdownIdentity(markdown: string): Record<string, unknown> | null {
  const identityText = markdown.match(/^Identity\.JSON=(.+?)\s*$/im)?.[1]?.trim();
  if (identityText) {
    const parsed = JSON.parse(identityText) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Legacy Markdown Identity.JSON must be an object.");
    }
    return parsed as Record<string, unknown>;
  }
  const identity: Record<string, unknown> = {};
  for (const key of ["projectSlug", "projectArtifactKey", "phaseId", "workCardId", "candidateId", "repairId", "attemptNumber"]) {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const value = markdown.match(new RegExp(`^${escapedKey}=(.+?)\\s*$`, "im"))?.[1]?.trim();
    if (value) {
      identity[key] = value;
    }
  }
  return Object.keys(identity).length > 0 ? identity : null;
}

function legacyMarkdownSourceRevisions(markdown: string): CanonicalDocumentMetadata["sourceRevisions"] | null {
  const matches = [...markdown.matchAll(/^- path:\s+(.+?)\s+revision:\s+([0-9]+)\s*$/gim)];
  if (matches.length === 0) {
    return null;
  }
  return matches.map((match) => ({
    path: match[1].trim().replace(/\.json$/i, ".md"),
    revision: Number(match[2]),
  }));
}

function sameSourceRevisions(
  left: CanonicalDocumentMetadata["sourceRevisions"],
  right: CanonicalDocumentMetadata["sourceRevisions"],
): boolean {
  return JSON.stringify(normalizedSourceRevisions(left)) === JSON.stringify(normalizedSourceRevisions(right));
}

function normalizedSourceRevisions(
  value: CanonicalDocumentMetadata["sourceRevisions"],
): CanonicalDocumentMetadata["sourceRevisions"] {
  return value
    .map((source) => ({ path: source.path.replace(/\\/g, "/"), revision: source.revision }))
    .sort((left, right) => left.path.localeCompare(right.path, "en", { sensitivity: "base" }) || left.revision - right.revision);
}

function workflowDataFromJson(json: Record<string, unknown>): Record<string, unknown> {
  const blocked = new Set([
    "artifactType",
    "artifactRevision",
    "participationRole",
    "sourceRevisions",
    "documentDisposition",
  ]);
  return Object.fromEntries(
    Object.entries(json)
      .filter(([key]) => !blocked.has(key))
      .map(([key, value]) => [key, convertSourcePaths(value)]),
  );
}

function convertSourcePaths(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(convertSourcePaths);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      key === "json" && typeof entry === "string" ? entry.replace(/\.json$/i, ".md") : convertSourcePaths(entry),
    ]),
  );
}

function identityFromJson(json: Record<string, unknown>): Record<string, unknown> {
  const identity: Record<string, unknown> = {};
  for (const key of ["projectSlug", "projectArtifactKey", "phaseId", "workCardId", "candidateId", "repairId", "attemptNumber"]) {
    if (json[key] !== undefined) identity[key] = json[key];
  }
  return identity;
}

function sourceRevisions(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const record = entry as { path?: unknown; revision?: unknown; artifactRevision?: unknown };
    const revision = typeof record.revision === "number" ? record.revision : record.artifactRevision;
    return typeof record.path === "string" && typeof revision === "number"
      ? [{ path: record.path.replace(/\.json$/i, ".md"), revision }]
      : [];
  });
}

function stripLegacyAuthoritySections(markdown: string): string {
  return markdown
    .replace(/^Artifact\.Revision=.*(?:\r?\n)?/gim, "")
    .replace(/^participationRole=.*(?:\r?\n)?/gim, "")
    .replace(/\n## Source Revisions\n[\s\S]*?(?=\n## |\n# |$)/g, "")
    .replace(/\n## Document Disposition\n[\s\S]*?(?=\n## |\n# |$)/g, "")
    .replace(/<!-- CHAMPCITY-METADATA/g, "&lt;!-- CHAMPCITY-METADATA")
    .replace(/CHAMPCITY-METADATA -->/g, "CHAMPCITY-METADATA --&gt;")
    .replace(/\n{3,}/g, "\n\n")
    .trimStart();
}

function readJson(workspaceRoot: string, relativePath: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(path.join(workspaceRoot, relativePath), "utf8")) as Record<string, unknown>;
}

function isAlreadyCanonical(workspaceRoot: string, relativePath: string): boolean {
  try {
    parseCanonicalMarkdownDocument(fs.readFileSync(path.join(workspaceRoot, relativePath), "utf8"));
    return true;
  } catch {
    return false;
  }
}

function discover(directory: string, extension: ".md" | ".json", workspaceRoot: string): string[] {
  if (!fs.existsSync(directory)) return [];
  const results: string[] = [];
  for (const child of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, child.name);
    if (child.isDirectory()) {
      results.push(...discover(absolutePath, extension, workspaceRoot));
    } else if (child.isFile() && path.extname(child.name).toLowerCase() === extension) {
      results.push(path.relative(workspaceRoot, absolutePath).split(path.sep).join("/"));
    }
  }
  return results.sort((left, right) => left.localeCompare(right, "en", { sensitivity: "base" }));
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Legacy metadata requires ${field}.`);
  }
  return value;
}

function requiredPositiveInteger(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new Error(`Legacy metadata requires positive integer ${field}.`);
  }
  return value;
}

function requiredParticipationRole(value: unknown): CanonicalDocumentMetadata["participationRole"] {
  return value === "gatingReview" ||
    value === "compoundGatingReview" ||
    value === "nonReviewHandoff" ||
    value === "contextOnly" ||
    value === "historical"
    ? value
    : (() => { throw new Error("Legacy metadata requires participationRole."); })();
}

function requiredDispositionStatus(value: unknown): CanonicalDocumentMetadata["documentDisposition"]["status"] {
  return value === "Approved" || value === "Rejected" || value === "RevisionRequested" || value === "Pending"
    ? value
    : (() => { throw new Error("Legacy metadata requires documentDisposition.status."); })();
}

function stripExtension(relativePath: string): string {
  return relativePath.slice(0, relativePath.length - path.extname(relativePath).length);
}
