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
  PlanningDocumentMetadata,
  PlanningDocumentDetail,
  PlanningDocumentSummary,
  SourceRevision,
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
import {
  evaluateFreshnessFromSummaries,
  type FreshnessEvaluation,
} from "../../shared/documents/sourceFreshness";
import { classifyLifecycleArtifact } from "../../shared/documents/lifecycleArtifact";

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

export function setDocumentDispositions(
  workspaceRoot: string,
  logicalDocumentIds: string[],
  status: DocumentDispositionStatus,
  options: RollbackWriteOptions = {},
): PlanningDocumentSummary[] {
  if (!isDocumentDispositionStatus(status)) {
    throw new Error("Unsupported document disposition status.");
  }

  const readRecords = logicalDocumentIds.map((logicalDocumentId) =>
    findReadRecord(workspaceRoot, logicalDocumentId),
  );
  for (const readRecord of readRecords) {
    if (readRecord.summary.synchronizationState === "read-error") {
      throw new Error("Cannot write disposition while document content could not be read.");
    }
  }

  const plans = readRecords.flatMap((readRecord) =>
    createWritePlans(readRecord, status, workspaceRoot),
  );
  writePlansWithRollback(plans, options);

  return logicalDocumentIds.map((logicalDocumentId) => {
    const updated = findReadRecord(workspaceRoot, logicalDocumentId);
    const markdownOk =
      !updated.record.markdown || updated.summary.storedMarkdownDisposition === status;
    const jsonOk = !updated.record.json || updated.summary.storedJsonDisposition === status;

    if (!markdownOk || !jsonOk || updated.summary.effectiveDisposition !== status) {
      throw new Error("Written document disposition could not be confirmed.");
    }

    return updated.summary;
  });
}

export interface RevisionSaveResult {
  revisedDocument: PlanningDocumentSummary;
  invalidatedDocuments: PlanningDocumentSummary[];
}

export function savePlanningDocumentRevision(
  workspaceRoot: string,
  logicalDocumentId: string,
  options: RollbackWriteOptions = {},
): RevisionSaveResult {
  const readRecord = findReadRecord(workspaceRoot, logicalDocumentId);
  if (readRecord.summary.synchronizationState === "read-error") {
    throw new Error("Cannot revise document while document content could not be read.");
  }

  const nextRevision = (readRecord.summary.metadata.artifactRevision ?? 0) + 1;
  const allRecords = buildReadRecords(workspaceRoot);
  const downstreamRecords = downstreamDependencyRecords(readRecord, allRecords);
  const handoffRecords = downstreamRecords.filter(
    (record) => classifyLifecycleArtifact(record.summary).participationRole === "nonReviewHandoff",
  );
  const invalidationRecords = downstreamRecords.filter(
    (record) => classifyLifecycleArtifact(record.summary).participationRole !== "nonReviewHandoff",
  );
  const plans = [
    ...createRevisionWritePlans(readRecord, nextRevision, workspaceRoot),
    ...handoffRecords.flatMap((record) =>
      createHandoffRegenerationPlans(record, readRecord, nextRevision, workspaceRoot),
    ),
    ...invalidationRecords.flatMap((record) =>
      createWritePlans(record, "Pending", workspaceRoot),
    ),
  ];

  writePlansWithRollback(plans, options);

  const revisedDocument = findReadRecord(workspaceRoot, logicalDocumentId).summary;
  const updatedDocuments = buildReadRecords(workspaceRoot).map((record) => record.summary);
  const invalidatedDocuments = invalidationRecords
    .map((record) =>
      updatedDocuments.find((document) => document.logicalDocumentId === record.summary.logicalDocumentId),
    )
    .filter((document): document is PlanningDocumentSummary => Boolean(document));

  return { revisedDocument, invalidatedDocuments };
}

export function evaluateDocumentFreshness(
  workspaceRoot: string,
  logicalDocumentId: string,
): FreshnessEvaluation {
  const records = buildReadRecords(workspaceRoot);
  const readRecord = records.find(
    (record) => record.summary.logicalDocumentId === logicalDocumentId,
  );
  if (!readRecord) {
    throw new Error("Unknown logical document ID.");
  }

  return evaluateFreshnessFromSummaries(
    readRecord.summary,
    records.map((record) => record.summary),
  );
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

  const summary = summarizeRecord(
    record,
    collectDocumentMetadata(markdownContent, jsonContent),
    markdownDisposition,
    jsonDisposition,
  );
  return {
    record,
    summary,
    markdownContent,
    jsonContent,
  };
}

function summarizeRecord(
  record: LogicalDocumentRecord,
  metadata: PlanningDocumentMetadata,
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
    metadata,
    pairStatus,
    effectiveDisposition,
    storedMarkdownDisposition: markdownStatus,
    storedJsonDisposition: jsonStatus,
    synchronizationState,
    initializationNeeded,
    readError,
  };
}

function collectDocumentMetadata(
  markdownContent?: string,
  jsonContent?: string,
): PlanningDocumentMetadata {
  const metadata = {
    ...metadataFromMarkdown(markdownContent),
    ...metadataFromJson(jsonContent),
  };
  return {
    ...metadata,
    sourceRevisions: metadata.sourceRevisions ?? [],
  };
}

function metadataFromMarkdown(content?: string): PlanningDocumentMetadata {
  if (!content) {
    return {};
  }

  const closureDecision = content.match(/closureDecision\s*[:=]\s*([A-Za-z ]+)/i)?.[1] ??
    content.match(/closure decision\s*[:=]\s*([A-Za-z ]+)/i)?.[1];
  const participationRole = content.match(/participationRole\s*[:=]\s*([A-Za-z]+)/i)?.[1];
  const artifactRevision = content.match(/Artifact\.Revision\s*=\s*(\d+)/i)?.[1];

  return {
    closureDecision: normalizeToken(closureDecision),
    participationRole: normalizeToken(participationRole),
    artifactRevision: artifactRevision ? Number(artifactRevision) : undefined,
    sourceRevisions: parseMarkdownSourceRevisions(content),
  };
}

function metadataFromJson(content?: string): PlanningDocumentMetadata {
  if (!content) {
    return {};
  }

  try {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    return {
      artifactType: stringValue(parsed.artifactType),
      participationRole: stringValue(parsed.participationRole),
      artifactRevision: numberValue(parsed.artifactRevision),
      sourceRevisions: sourceRevisionsValue(parsed.sourceRevisions),
      closureDecision: normalizeToken(stringValue(parsed.closureDecision)),
      phaseId: stringValue(parsed.phaseId),
      workCardId: stringValue(parsed.workCardId),
      candidateId: stringValue(parsed.candidateId),
    };
  } catch {
    return {};
  }
}

function parseMarkdownSourceRevisions(content: string): SourceRevision[] {
  return [...content.matchAll(/-\s*path:\s*`?([^`\r\n]+)`?\s*revision:\s*(\d+)/gi)].map(
    (match) => ({
      path: match[1].trim(),
      revision: Number(match[2]),
    }),
  );
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

function createRevisionWritePlans(
  readRecord: ReadRecord,
  nextRevision: number,
  workspaceRoot: string,
): WritePlan[] {
  const plans: WritePlan[] = [];

  if (readRecord.record.markdown) {
    plans.push({
      absolutePath: readRecord.record.markdown.absolutePath,
      content: writeMarkdownArtifactRevision(readRecord.markdownContent ?? "", nextRevision),
      expectedStatus: readRecord.summary.effectiveDisposition,
      workspaceRoot,
    });
  }

  if (readRecord.record.json) {
    if (readRecord.jsonContent === undefined) {
      throw new Error("JSON content was not available.");
    }
    plans.push({
      absolutePath: readRecord.record.json.absolutePath,
      content: writeJsonArtifactRevision(readRecord.jsonContent, nextRevision),
      expectedStatus: readRecord.summary.effectiveDisposition,
      workspaceRoot,
    });
  }

  return plans;
}

function downstreamDependencyRecords(
  sourceRecord: ReadRecord,
  records: ReadRecord[],
): ReadRecord[] {
  const sourcePaths = new Set(
    [sourceRecord.summary.markdownPath, sourceRecord.summary.jsonPath].filter(
      (value): value is string => Boolean(value),
    ),
  );
  const invalidationIds = new Set<string>();

  for (const record of records) {
    if (record.summary.logicalDocumentId === sourceRecord.summary.logicalDocumentId) {
      continue;
    }

    const referencesSource = (record.summary.metadata.sourceRevisions ?? []).some((source) =>
      sourcePaths.has(source.path),
    );
    if (referencesSource && record.summary.effectiveDisposition === "Approved") {
      invalidationIds.add(record.summary.logicalDocumentId);
      for (const bundleRecord of coordinatedBundleRecords(record, records)) {
        if (bundleRecord.summary.effectiveDisposition === "Approved") {
          invalidationIds.add(bundleRecord.summary.logicalDocumentId);
        }
      }
    }
  }

  return records.filter((record) => invalidationIds.has(record.summary.logicalDocumentId));
}

function createHandoffRegenerationPlans(
  readRecord: ReadRecord,
  sourceRecord: ReadRecord,
  sourceRevision: number,
  workspaceRoot: string,
): WritePlan[] {
  const sourcePaths = [sourceRecord.summary.markdownPath, sourceRecord.summary.jsonPath].filter(
    (value): value is string => Boolean(value),
  );
  const nextRevision = (readRecord.summary.metadata.artifactRevision ?? 0) + 1;
  const plans = createRevisionWritePlans(readRecord, nextRevision, workspaceRoot);

  return plans.map((plan) => ({
    ...plan,
    content: rewriteSourceReferences(plan.content, path.extname(plan.absolutePath), sourcePaths, sourceRevision),
    expectedStatus: "Approved" as const,
  }));
}

function rewriteSourceReferences(
  content: string,
  extension: string,
  sourcePaths: string[],
  sourceRevision: number,
): string {
  if (extension.toLowerCase() === ".json") {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    parsed.sourceRevisions = sourceRevisionsValue(parsed.sourceRevisions).map((source) =>
      sourcePaths.includes(source.path) ? { ...source, revision: sourceRevision } : source,
    );
    parsed.documentDisposition = { status: "Approved" };
    return `${JSON.stringify(parsed, null, 2)}\n`;
  }

  return sourcePaths.reduce(
    (nextContent, sourcePath) =>
      nextContent.replace(
        new RegExp(`(path:\\s*\`?${escapeRegExp(sourcePath)}\`?\\s*revision:\\s*)\\d+`, "g"),
        `$1${sourceRevision}`,
      ),
    content,
  );
}

function coordinatedBundleRecords(record: ReadRecord, records: ReadRecord[]): ReadRecord[] {
  const value = [
    record.summary.markdownPath,
    record.summary.jsonPath,
    record.summary.displayFilename,
  ]
    .filter(Boolean)
    .join("/")
    .toLowerCase();

  if (value.includes("project_profile") || value.includes("project_roadmap")) {
    return records.filter((candidate) => {
      const candidateValue = [
        candidate.summary.markdownPath,
        candidate.summary.jsonPath,
        candidate.summary.displayFilename,
      ]
        .filter(Boolean)
        .join("/")
        .toLowerCase();
      return candidateValue.includes("project_profile") || candidateValue.includes("project_roadmap");
    });
  }

  if (value.includes("phase_planning") || value.includes("work_card_plan")) {
    return records.filter((candidate) => {
      const candidateValue = [
        candidate.summary.markdownPath,
        candidate.summary.jsonPath,
        candidate.summary.displayFilename,
      ]
        .filter(Boolean)
        .join("/")
        .toLowerCase();
      return candidateValue.includes("phase_planning") || candidateValue.includes("work_card_plan");
    });
  }

  return [record];
}

function writeMarkdownArtifactRevision(content: string, nextRevision: number): string {
  const eol = content.includes("\r\n") ? "\r\n" : "\n";
  const line = `Artifact.Revision=${nextRevision}`;
  if (/^Artifact\.Revision=\d+$/m.test(content)) {
    return content.replace(/^Artifact\.Revision=\d+$/m, line);
  }

  return content.startsWith("#")
    ? content.replace(/^([^\r\n]*(?:\r\n|\n|\r))/, `$1${line}${eol}`)
    : `${line}${eol}${content}`;
}

function writeJsonArtifactRevision(content: string, nextRevision: number): string {
  const parsed = JSON.parse(content) as Record<string, unknown>;
  parsed.artifactRevision = nextRevision;
  return `${JSON.stringify(parsed, null, 2)}\n`;
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

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) ? value : undefined;
}

function sourceRevisionsValue(value: unknown): SourceRevision[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") {
      return [];
    }

    const pathValue = (entry as { path?: unknown }).path;
    const revisionValue = (entry as { revision?: unknown }).revision;
    return typeof pathValue === "string" &&
      typeof revisionValue === "number" &&
      Number.isInteger(revisionValue)
      ? [{ path: pathValue, revision: revisionValue }]
      : [];
  });
}

function normalizeToken(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  return value.trim().replace(/\s+/g, "");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
