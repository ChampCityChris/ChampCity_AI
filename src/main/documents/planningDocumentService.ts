import fs from "node:fs";
import path from "node:path";
import {
  type DocumentDispositionStatus,
  isDocumentDispositionStatus,
} from "../../shared/documents/documentDisposition";
import type {
  DispositionSyncState,
  InitializationPreview,
  InitializationResult,
  PlanningDocumentDetail,
  PlanningDocumentSummary,
} from "../../shared/documents/planningDocument";
import {
  parseJsonDisposition,
  parseMarkdownDisposition,
  writeJsonDisposition,
  writeMarkdownDisposition,
  writePlansWithRollback,
  type ParsedFileDisposition,
  type RollbackWriteOptions,
  type WritePlan,
} from "./documentDispositionWriter";

const previewLimit = 12000;

interface FileEntry {
  absolutePath: string;
  relativePath: string;
  extension: ".md" | ".json";
  stemKey: string;
  readError?: string;
}

interface LogicalDocumentRecord {
  id: string;
  stemKey: string;
  markdown?: FileEntry;
  json?: FileEntry;
}

interface ReadRecord {
  record: LogicalDocumentRecord;
  summary: PlanningDocumentSummary;
  markdownContent?: string;
  jsonContent?: string;
}

interface PlanningDocumentServiceTestHooks {
  failLstat?: (relativePath: string) => Error | string | undefined;
  failRead?: (relativePath: string) => Error | string | undefined;
}

let testHooks: PlanningDocumentServiceTestHooks = {};

export function __setPlanningDocumentServiceTestHooks(
  hooks: PlanningDocumentServiceTestHooks = {},
): void {
  testHooks = hooks;
}

export function assertPlanningWorkspace(workspaceRoot: string): string {
  const resolvedRoot = path.resolve(workspaceRoot);
  const planningRoot = path.join(resolvedRoot, "planning");
  const stats = fs.statSync(planningRoot);

  if (!stats.isDirectory()) {
    throw new Error("Workspace does not contain planning/.");
  }

  return resolvedRoot;
}

export function listPlanningDocuments(workspaceRoot: string): PlanningDocumentSummary[] {
  return buildReadRecords(workspaceRoot).map((entry) => entry.summary);
}

export function readPlanningDocument(
  workspaceRoot: string,
  logicalDocumentId: string,
): PlanningDocumentDetail {
  const readRecord = findReadRecord(workspaceRoot, logicalDocumentId);
  const sourceContent = readRecord.markdownContent ?? formatJsonPreview(readRecord.jsonContent);
  const preview = sourceContent.slice(0, previewLimit);

  return {
    ...readRecord.summary,
    preview,
    previewTruncated: sourceContent.length > previewLimit,
  };
}

export function setDocumentDisposition(
  workspaceRoot: string,
  logicalDocumentId: string,
  status: DocumentDispositionStatus,
  options: RollbackWriteOptions = {},
): PlanningDocumentSummary {
  if (!isDocumentDispositionStatus(status)) {
    throw new Error("Unsupported document disposition status.");
  }

  const readRecord = findReadRecord(workspaceRoot, logicalDocumentId);
  if (readRecord.summary.synchronizationState === "read-error") {
    throw new Error("Cannot write disposition while document content could not be read.");
  }

  const plans = createWritePlans(readRecord, status, workspaceRoot);
  writePlansWithRollback(plans, options);

  const updated = findReadRecord(workspaceRoot, logicalDocumentId);
  const markdownOk =
    !updated.record.markdown || updated.summary.storedMarkdownDisposition === status;
  const jsonOk = !updated.record.json || updated.summary.storedJsonDisposition === status;

  if (!markdownOk || !jsonOk || updated.summary.effectiveDisposition !== status) {
    throw new Error("Written document disposition could not be confirmed.");
  }

  return updated.summary;
}

export function previewDispositionInitialization(
  workspaceRoot: string,
): InitializationPreview {
  const documents = buildReadRecords(workspaceRoot);
  const affectedPaths: string[] = [];
  let affectedMarkdownFiles = 0;
  let affectedJsonFiles = 0;

  for (const document of documents) {
    if (!document.summary.initializationNeeded) {
      continue;
    }

    if (document.summary.markdownPath) {
      affectedMarkdownFiles += 1;
      affectedPaths.push(document.summary.markdownPath);
    }
    if (document.summary.jsonPath) {
      affectedJsonFiles += 1;
      affectedPaths.push(document.summary.jsonPath);
    }
  }

  affectedPaths.sort(comparePaths);

  return {
    totalLogicalDocuments: documents.length,
    affectedLogicalDocuments: documents.filter(
      (document) => document.summary.initializationNeeded,
    ).length,
    affectedMarkdownFiles,
    affectedJsonFiles,
    affectedPaths,
  };
}

export function applyDispositionInitialization(
  workspaceRoot: string,
  options: RollbackWriteOptions = {},
): InitializationResult {
  const previewBeforeApply = previewDispositionInitialization(workspaceRoot);
  const readRecords = buildReadRecords(workspaceRoot);
  const plans = readRecords
    .filter((readRecord) => readRecord.summary.initializationNeeded)
    .flatMap((readRecord) => createWritePlans(readRecord, "Pending", workspaceRoot));

  writePlansWithRollback(plans, options);

  const documents = listPlanningDocuments(workspaceRoot);
  return {
    previewBeforeApply,
    previewAfterApply: previewDispositionInitialization(workspaceRoot),
    documents,
  };
}

function buildReadRecords(workspaceRoot: string): ReadRecord[] {
  const resolvedRoot = assertPlanningWorkspace(workspaceRoot);
  const records = groupFileEntries(discoverPlanningFiles(resolvedRoot));
  return records.map((record) => readRecord(resolvedRoot, record));
}

function findReadRecord(workspaceRoot: string, logicalDocumentId: string): ReadRecord {
  if (logicalDocumentId.includes("..") || logicalDocumentId.includes("/") || logicalDocumentId.includes("\\")) {
    throw new Error("Unknown logical document ID.");
  }

  const record = buildReadRecords(workspaceRoot).find(
    (candidate) => candidate.summary.logicalDocumentId === logicalDocumentId,
  );

  if (!record) {
    throw new Error("Unknown logical document ID.");
  }

  return record;
}

function discoverPlanningFiles(workspaceRoot: string): FileEntry[] {
  const planningRoot = path.join(workspaceRoot, "planning");
  const entries: FileEntry[] = [];

  function visit(directory: string): void {
    const children = fs.readdirSync(directory, { withFileTypes: true });

    for (const child of children) {
      const absolutePath = path.join(directory, child.name);
      const relativePath = normalizeRelativePath(path.relative(workspaceRoot, absolutePath));
      const extension = path.extname(child.name).toLowerCase();
      let stats: fs.Stats;

      try {
        const injectedError = testHooks.failLstat?.(relativePath);
        if (injectedError) {
          throw injectedError instanceof Error ? injectedError : new Error(injectedError);
        }
        stats = fs.lstatSync(absolutePath);
      } catch (error) {
        if (extension === ".md" || extension === ".json") {
          entries.push(createFileEntry(workspaceRoot, absolutePath, extension, errorMessage(error)));
        }
        continue;
      }

      if (stats.isSymbolicLink()) {
        continue;
      }

      if (stats.isDirectory()) {
        visit(absolutePath);
        continue;
      }

      if (!stats.isFile()) {
        continue;
      }

      if (extension !== ".md" && extension !== ".json") {
        continue;
      }

      entries.push(createFileEntry(workspaceRoot, absolutePath, extension));
    }
  }

  visit(planningRoot);
  return entries.sort((left, right) => comparePaths(left.relativePath, right.relativePath));
}

function groupFileEntries(entries: FileEntry[]): LogicalDocumentRecord[] {
  const groups = new Map<string, LogicalDocumentRecord>();

  for (const entry of entries) {
    const existing =
      groups.get(entry.stemKey) ??
      ({
        id: stableLogicalDocumentId(entry.stemKey),
        stemKey: entry.stemKey,
      } satisfies LogicalDocumentRecord);

    if (entry.extension === ".md") {
      existing.markdown = entry;
    } else {
      existing.json = entry;
    }
    groups.set(entry.stemKey, existing);
  }

  return [...groups.values()].sort((left, right) =>
    comparePaths(left.markdown?.relativePath ?? left.json?.relativePath ?? left.stemKey, right.markdown?.relativePath ?? right.json?.relativePath ?? right.stemKey),
  );
}

function readRecord(
  workspaceRoot: string,
  record: LogicalDocumentRecord,
): ReadRecord {
  let markdownContent: string | undefined;
  let jsonContent: string | undefined;
  let markdownDisposition: ParsedFileDisposition | undefined;
  let jsonDisposition: ParsedFileDisposition | undefined;

  if (record.markdown) {
    if (record.markdown.readError) {
      markdownDisposition = readErrorDisposition(record.markdown.readError);
    } else {
      try {
        markdownContent = readContainedFile(workspaceRoot, record.markdown);
        markdownDisposition = parseMarkdownDisposition(markdownContent);
      } catch (error) {
        markdownDisposition = readErrorDisposition(errorMessage(error));
      }
    }
  }

  if (record.json) {
    if (record.json.readError) {
      jsonDisposition = readErrorDisposition(record.json.readError);
    } else {
      try {
        jsonContent = readContainedFile(workspaceRoot, record.json);
        jsonDisposition = parseJsonDisposition(jsonContent);
      } catch (error) {
        jsonDisposition = readErrorDisposition(errorMessage(error));
      }
    }
  }

  const summary = summarizeRecord(record, markdownDisposition, jsonDisposition);
  return {
    record,
    summary,
    markdownContent,
    jsonContent,
  };
}

function summarizeRecord(
  record: LogicalDocumentRecord,
  markdownDisposition?: ParsedFileDisposition,
  jsonDisposition?: ParsedFileDisposition,
): PlanningDocumentSummary {
  const markdownStatus = markdownDisposition?.valid ? markdownDisposition.status : undefined;
  const jsonStatus = jsonDisposition?.valid ? jsonDisposition.status : undefined;
  const pairStatus = record.markdown && record.json
    ? "paired"
    : record.markdown
      ? "markdown-only"
      : "json-only";
  const readError = markdownDisposition?.readError ?? jsonDisposition?.readError;
  const synchronizationState = getSynchronizationState(
    pairStatus,
    markdownDisposition,
    jsonDisposition,
  );
  const initializationNeeded = synchronizationState !== "synchronized" &&
    synchronizationState !== "single-valid";
  const effectiveDisposition = initializationNeeded
    ? "Pending"
    : markdownStatus ?? jsonStatus ?? "Pending";

  return {
    logicalDocumentId: record.id,
    markdownPath: record.markdown?.relativePath,
    jsonPath: record.json?.relativePath,
    displayFilename: path.basename(record.stemKey),
    pairStatus,
    effectiveDisposition,
    storedMarkdownDisposition: markdownStatus,
    storedJsonDisposition: jsonStatus,
    synchronizationState,
    initializationNeeded,
    readError,
  };
}

function getSynchronizationState(
  pairStatus: "paired" | "markdown-only" | "json-only",
  markdownDisposition?: ParsedFileDisposition,
  jsonDisposition?: ParsedFileDisposition,
): DispositionSyncState {
  if (markdownDisposition?.readError || jsonDisposition?.readError) {
    return "read-error";
  }

  if (pairStatus === "paired") {
    if (!markdownDisposition?.valid && !jsonDisposition?.valid) {
      return markdownDisposition || jsonDisposition ? "invalid" : "missing";
    }
    if (!markdownDisposition?.valid || !jsonDisposition?.valid) {
      return "missing";
    }
    return markdownDisposition.status === jsonDisposition.status
      ? "synchronized"
      : "mismatched";
  }

  const singleDisposition =
    pairStatus === "markdown-only" ? markdownDisposition : jsonDisposition;
  return singleDisposition?.valid ? "single-valid" : "missing";
}

function createWritePlans(
  readRecord: ReadRecord,
  status: DocumentDispositionStatus,
  workspaceRoot: string,
): WritePlan[] {
  if (readRecord.summary.synchronizationState === "read-error") {
    throw new Error("Cannot write disposition while document content could not be read.");
  }

  const plans: WritePlan[] = [];

  if (readRecord.record.markdown) {
    plans.push({
      absolutePath: readRecord.record.markdown.absolutePath,
      content: writeMarkdownDisposition(readRecord.markdownContent ?? "", status),
      expectedStatus: status,
      workspaceRoot,
    });
  }

  if (readRecord.record.json) {
    if (readRecord.jsonContent === undefined) {
      throw new Error("JSON content was not available.");
    }
    plans.push({
      absolutePath: readRecord.record.json.absolutePath,
      content: writeJsonDisposition(readRecord.jsonContent, status),
      expectedStatus: status,
      workspaceRoot,
    });
  }

  return plans;
}

function createFileEntry(
  workspaceRoot: string,
  absolutePath: string,
  extension: ".md" | ".json",
  readError?: string,
): FileEntry {
  const relativePath = normalizeRelativePath(path.relative(workspaceRoot, absolutePath));
  const relativeDirectory = normalizeRelativePath(
    path.dirname(path.relative(workspaceRoot, absolutePath)),
  );
  const stem = path.basename(absolutePath, extension);
  const stemKey =
    relativeDirectory === "."
      ? stem
      : `${relativeDirectory}/${stem}`;

  return {
    absolutePath,
    relativePath,
    extension,
    stemKey,
    readError,
  };
}

function readContainedFile(workspaceRoot: string, entry: FileEntry): string {
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

function readErrorDisposition(message: string): ParsedFileDisposition {
  return {
    valid: false,
    needsInitialization: true,
    readError: message,
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function formatJsonPreview(content: string | undefined): string {
  if (content === undefined) {
    return "";
  }

  try {
    return `${JSON.stringify(JSON.parse(content), null, 2)}\n`;
  } catch {
    return content;
  }
}

function stableLogicalDocumentId(stemKey: string): string {
  return Buffer.from(stemKey, "utf8").toString("base64url");
}

function normalizeRelativePath(relativePath: string): string {
  return relativePath.split(path.sep).join("/");
}

function comparePaths(left: string, right: string): number {
  return left.localeCompare(right, "en", { sensitivity: "base" });
}

function isInside(root: string, target: string): boolean {
  const relativePath = path.relative(root, target);
  return (
    relativePath.length === 0 ||
    (!relativePath.startsWith("..") && !path.isAbsolute(relativePath))
  );
}
