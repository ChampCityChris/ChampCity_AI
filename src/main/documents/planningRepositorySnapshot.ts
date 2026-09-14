import fs from "node:fs";
import path from "node:path";
import {
  metadataOpenDelimiter,
  parseCanonicalMarkdownDocument,
  type CanonicalDocumentMetadata,
} from "../../shared/documents/canonicalMarkdown";
import type { DocumentDispositionStatus } from "../../shared/documents/documentDisposition";
import type {
  PlanningDocumentMetadata,
  PlanningDocumentSummary,
} from "../../shared/documents/planningDocument";
import { isArchitectDraftRelativePath } from "../architectOutputs/architectDraftPaths";

interface InventoryEntry {
  absolutePath: string;
  relativePath: string;
  identity: string;
  readError?: string;
}

export interface PlanningRepositoryRecord {
  readonly summary: PlanningDocumentSummary;
  readonly content?: string;
  readonly bodyMarkdown?: string;
}

export interface PlanningRepositorySnapshot {
  readonly workspaceRoot: string;
  readonly generation: number;
}

interface SnapshotState {
  orderedRecords: readonly PlanningRepositoryRecord[];
  recordsByPath: ReadonlyMap<string, PlanningRepositoryRecord>;
  recordsByLogicalDocumentId: ReadonlyMap<string, PlanningRepositoryRecord>;
}

interface CacheEntry {
  snapshot: PlanningRepositorySnapshot;
  identitiesByPath: Map<string, string>;
  recordsByPath: Map<string, PlanningRepositoryRecord>;
  dirtyPaths: Set<string>;
}

export interface PlanningRepositorySnapshotTestHooks {
  failLstat?: (relativePath: string) => Error | string | undefined;
  failRead?: (relativePath: string) => Error | string | undefined;
  onSnapshotAcquisition?: (workspaceRoot: string) => void;
  onInventoryScan?: (workspaceRoot: string) => void;
  onContentRead?: (relativePath: string) => void;
  onRecordParse?: (relativePath: string) => void;
}

const cacheByCanonicalRoot = new Map<string, CacheEntry>();
const stateBySnapshot = new WeakMap<PlanningRepositorySnapshot, SnapshotState>();
const recordsNeedingReadRetry = new WeakSet<PlanningRepositoryRecord>();
let nextGeneration = 1;
let testHooks: PlanningRepositorySnapshotTestHooks = {};

export function acquirePlanningRepositorySnapshot(
  workspaceRoot: string,
): PlanningRepositorySnapshot {
  const canonicalRoot = canonicalWorkspaceRoot(workspaceRoot);
  testHooks.onSnapshotAcquisition?.(canonicalRoot);
  const cacheKey = canonicalRootKey(canonicalRoot);
  const inventory = discoverPlanningMarkdownInventory(canonicalRoot);
  const cached = cacheByCanonicalRoot.get(cacheKey);

  if (!cached) {
    return publishSnapshot(canonicalRoot, cacheKey, inventory, new Map(), new Set());
  }

  const inventoryPaths = new Set(inventory.map((entry) => entry.relativePath));
  const removedPaths = new Set(
    [...cached.identitiesByPath.keys()].filter((relativePath) => !inventoryPaths.has(relativePath)),
  );
  const changedPaths = new Set<string>(removedPaths);
  for (const entry of inventory) {
    const previous = cached.recordsByPath.get(entry.relativePath);
    if (
      cached.dirtyPaths.has(entry.relativePath) ||
      cached.identitiesByPath.get(entry.relativePath) !== entry.identity ||
      (previous !== undefined && recordsNeedingReadRetry.has(previous))
    ) {
      changedPaths.add(entry.relativePath);
    }
  }

  if (changedPaths.size === 0) {
    cached.dirtyPaths.clear();
    return cached.snapshot;
  }

  return publishSnapshot(
    canonicalRoot,
    cacheKey,
    inventory,
    cached.recordsByPath,
    changedPaths,
  );
}

export function invalidatePlanningRepositorySnapshotPaths(
  workspaceRoot: string,
  relativePaths: readonly string[],
): void {
  const canonicalRoot = canonicalWorkspaceRoot(workspaceRoot);
  const cached = cacheByCanonicalRoot.get(canonicalRootKey(canonicalRoot));
  if (!cached) return;

  for (const candidate of relativePaths) {
    const relativePath = normalizeRelativePath(candidate);
    if (isEligiblePlanningMarkdownPath(relativePath)) {
      cached.dirtyPaths.add(relativePath);
    }
  }
}

export function listPlanningRecordsFromSnapshot(
  snapshot: PlanningRepositorySnapshot,
): readonly PlanningRepositoryRecord[] {
  return requiredSnapshotState(snapshot).orderedRecords;
}

export function findPlanningRecordByPathFromSnapshot(
  snapshot: PlanningRepositorySnapshot,
  relativePath: string,
): PlanningRepositoryRecord | undefined {
  return requiredSnapshotState(snapshot).recordsByPath.get(normalizeRelativePath(relativePath));
}

export function findPlanningRecordByLogicalDocumentIdFromSnapshot(
  snapshot: PlanningRepositorySnapshot,
  logicalDocumentId: string,
): PlanningRepositoryRecord | undefined {
  return requiredSnapshotState(snapshot).recordsByLogicalDocumentId.get(logicalDocumentId);
}

export function __setPlanningRepositorySnapshotTestHooks(
  hooks: PlanningRepositorySnapshotTestHooks = {},
): void {
  testHooks = hooks;
  __resetPlanningRepositorySnapshotsForTests();
}

export function __resetPlanningRepositorySnapshotsForTests(): void {
  cacheByCanonicalRoot.clear();
  nextGeneration = 1;
}

function publishSnapshot(
  canonicalRoot: string,
  cacheKey: string,
  inventory: InventoryEntry[],
  previousRecordsByPath: Map<string, PlanningRepositoryRecord>,
  changedPaths: Set<string>,
): PlanningRepositorySnapshot {
  const recordsByPath = new Map<string, PlanningRepositoryRecord>();
  const identitiesByPath = new Map<string, string>();

  for (const entry of inventory) {
    identitiesByPath.set(entry.relativePath, entry.identity);
    const previous = previousRecordsByPath.get(entry.relativePath);
    const record = previous && !changedPaths.has(entry.relativePath)
      ? previous
      : readPlanningRecord(canonicalRoot, entry);
    recordsByPath.set(entry.relativePath, record);
  }

  const orderedRecords = Object.freeze(
    [...recordsByPath.values()].sort((left, right) =>
      comparePaths(left.summary.markdownPath, right.summary.markdownPath),
    ),
  );
  const recordsByLogicalDocumentId = new Map<string, PlanningRepositoryRecord>();
  for (const record of orderedRecords) {
    recordsByLogicalDocumentId.set(record.summary.logicalDocumentId, record);
  }

  const snapshot = Object.freeze({
    workspaceRoot: canonicalRoot,
    generation: nextGeneration++,
  });
  stateBySnapshot.set(snapshot, {
    orderedRecords,
    recordsByPath,
    recordsByLogicalDocumentId,
  });
  cacheByCanonicalRoot.set(cacheKey, {
    snapshot,
    identitiesByPath,
    recordsByPath,
    dirtyPaths: new Set(),
  });
  return snapshot;
}

function discoverPlanningMarkdownInventory(workspaceRoot: string): InventoryEntry[] {
  testHooks.onInventoryScan?.(workspaceRoot);
  const entries: InventoryEntry[] = [];
  const planningRoot = path.join(workspaceRoot, "planning");
  if (!fs.existsSync(planningRoot)) return entries;
  if (!fs.statSync(planningRoot).isDirectory()) {
    throw new Error("Workspace does not contain planning/.");
  }

  function visit(directory: string): void {
    for (const child of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, child.name);
      const relativePath = normalizeRelativePath(path.relative(workspaceRoot, absolutePath));
      if (isArchitectDraftRelativePath(relativePath)) continue;

      const extension = path.extname(child.name).toLowerCase();
      let stats: fs.Stats;
      try {
        const injectedError = testHooks.failLstat?.(relativePath);
        if (injectedError) {
          throw injectedError instanceof Error ? injectedError : new Error(injectedError);
        }
        stats = fs.lstatSync(absolutePath);
      } catch (error) {
        if (extension === ".md") {
          const readError = errorMessage(error);
          entries.push({
            absolutePath,
            relativePath,
            identity: `lstat-error:${readError}`,
            readError,
          });
        }
        continue;
      }

      if (stats.isSymbolicLink()) continue;
      if (stats.isDirectory()) {
        visit(absolutePath);
        continue;
      }
      if (stats.isFile() && extension === ".md") {
        entries.push({
          absolutePath,
          relativePath,
          identity: fileIdentity(stats),
        });
      }
    }
  }

  visit(planningRoot);
  return entries.sort((left, right) => comparePaths(left.relativePath, right.relativePath));
}

function readPlanningRecord(
  workspaceRoot: string,
  entry: InventoryEntry,
): PlanningRepositoryRecord {
  let content: string | undefined;
  let bodyMarkdown: string | undefined;
  let metadata: PlanningDocumentMetadata = { sourceRevisions: [] };
  let disposition: DocumentDispositionStatus = "Pending";
  let readError = entry.readError;

  let retryOnNextAcquisition = false;
  if (!readError) {
    try {
      content = readContainedFile(workspaceRoot, entry);
      testHooks.onContentRead?.(entry.relativePath);
      testHooks.onRecordParse?.(entry.relativePath);
    } catch (error) {
      readError = errorMessage(error);
      retryOnNextAcquisition = true;
    }
  }

  if (content !== undefined && !readError) {
    try {
      if (content.startsWith(metadataOpenDelimiter)) {
        const parsed = parseCanonicalMarkdownDocument(content);
        bodyMarkdown = parsed.bodyMarkdown;
        disposition = parsed.metadata.documentDisposition.status;
        metadata = metadataFromCanonical(parsed.metadata);
      } else {
        bodyMarkdown = content;
        metadata = {
          artifactType: "legacy-unmanaged",
          participationRole: "historical",
          sourceRevisions: [],
        };
      }
    } catch (error) {
      readError = errorMessage(error);
    }
  }

  const summary = deepFreeze({
    logicalDocumentId: stableLogicalDocumentId(entry.relativePath),
    markdownPath: entry.relativePath,
    displayFilename: path.basename(entry.relativePath, ".md"),
    metadata,
    effectiveDisposition: disposition,
    documentReadState: readError ? "read-error" as const : "readable" as const,
    initializationNeeded: Boolean(readError),
    readError,
  });
  const record = Object.freeze({ summary, content, bodyMarkdown });
  if (retryOnNextAcquisition) {
    recordsNeedingReadRetry.add(record);
  }
  return record;
}

function readContainedFile(workspaceRoot: string, entry: InventoryEntry): string {
  const resolvedPath = path.resolve(entry.absolutePath);
  if (!isInside(workspaceRoot, resolvedPath)) {
    throw new Error("Document path escapes selected workspace.");
  }
  const injectedError = testHooks.failRead?.(entry.relativePath);
  if (injectedError) {
    throw injectedError instanceof Error ? injectedError : new Error(injectedError);
  }
  return fs.readFileSync(resolvedPath, "utf8");
}

function metadataFromCanonical(canonical: CanonicalDocumentMetadata): PlanningDocumentMetadata {
  const workflow = canonical.workflowData;
  return {
    artifactType: canonical.artifactType,
    participationRole: canonical.participationRole,
    artifactRevision: canonical.artifactRevision,
    sourceRevisions: canonical.sourceRevisions,
    architectOutputTargets: architectOutputTargetsValue(workflow.architectOutputTargets),
    closureDecision: stringValue(workflow.closureDecision),
    phaseId: stringValue(canonical.identity.phaseId ?? workflow.phaseId),
    workCardId: stringValue(canonical.identity.workCardId ?? workflow.workCardId),
    candidateId: stringValue(canonical.identity.candidateId ?? workflow.candidateId),
    canonical,
  };
}

function requiredSnapshotState(snapshot: PlanningRepositorySnapshot): SnapshotState {
  const state = stateBySnapshot.get(snapshot);
  if (!state) {
    throw new Error("Planning repository snapshot is not owned by this process.");
  }
  return state;
}

function canonicalWorkspaceRoot(workspaceRoot: string): string {
  const resolvedRoot = path.resolve(workspaceRoot);
  try {
    return fs.realpathSync.native(resolvedRoot);
  } catch {
    return resolvedRoot;
  }
}

function canonicalRootKey(canonicalRoot: string): string {
  return process.platform === "win32" ? canonicalRoot.toLowerCase() : canonicalRoot;
}

function fileIdentity(stats: fs.Stats): string {
  return [
    "file",
    stats.dev,
    stats.ino,
    stats.mode,
    stats.size,
    stats.mtimeMs,
    stats.ctimeMs,
    stats.birthtimeMs,
  ].join(":");
}

function isEligiblePlanningMarkdownPath(relativePath: string): boolean {
  const normalized = normalizeRelativePath(relativePath);
  return normalized.toLowerCase().startsWith("planning/") &&
    path.posix.extname(normalized).toLowerCase() === ".md" &&
    !isArchitectDraftRelativePath(normalized);
}

function architectOutputTargetsValue(value: unknown): PlanningDocumentMetadata["architectOutputTargets"] {
  if (!value || typeof value !== "object") return undefined;
  const markdown = (value as { markdown?: unknown }).markdown;
  return typeof markdown === "string" ? { markdown } : undefined;
}

function stableLogicalDocumentId(relativePath: string): string {
  return Buffer.from(relativePath, "utf8").toString("base64url");
}

function normalizeRelativePath(relativePath: string): string {
  return relativePath.split(path.sep).join("/");
}

function comparePaths(left: string, right: string): number {
  return left.localeCompare(right, "en", { sensitivity: "base" });
}

function isInside(root: string, target: string): boolean {
  const relativePath = path.relative(root, target);
  return relativePath.length === 0 ||
    (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
  }
  return value;
}
