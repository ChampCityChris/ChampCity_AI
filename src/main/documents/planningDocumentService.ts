import fs from "node:fs";
import path from "node:path";
import {
  type DocumentDispositionStatus,
  isDocumentDispositionStatus,
} from "../../shared/documents/documentDisposition";
import type {
  InitializationPreview,
  InitializationResult,
  PlanningDocumentDetail,
  PlanningDocumentMetadata,
  PlanningDocumentSummary,
  SourceRevision,
} from "../../shared/documents/planningDocument";
import {
  type CanonicalDocumentMetadata,
  metadataOpenDelimiter,
  metadataWithDisposition,
  metadataWithSubstantiveRevision,
  parseCanonicalMarkdownDocument,
  serializeCanonicalMarkdownDocument,
} from "../../shared/documents/canonicalMarkdown";
import { evaluateFreshnessFromSummaries, type FreshnessEvaluation } from "../../shared/documents/sourceFreshness";
import { classifyLifecycleArtifact } from "../../shared/documents/lifecycleArtifact";
import { writeArtifactTransaction } from "./artifactTransaction";

const previewLimit = 12000;

interface FileEntry {
  absolutePath: string;
  relativePath: string;
  readError?: string;
}

interface ReadRecord {
  entry: FileEntry;
  summary: PlanningDocumentSummary;
  content?: string;
  bodyMarkdown?: string;
}

interface PlanningDocumentServiceTestHooks {
  failLstat?: (relativePath: string) => Error | string | undefined;
  failRead?: (relativePath: string) => Error | string | undefined;
}

export interface RollbackWriteOptions {
  failAfterWrites?: number;
  failFinalVerification?: boolean;
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
  const stats = fs.existsSync(planningRoot) ? fs.statSync(planningRoot) : null;
  if (!stats?.isDirectory()) {
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
  const record = findReadRecord(workspaceRoot, logicalDocumentId);
  const previewSource = record.bodyMarkdown ?? record.content ?? "";
  return {
    ...record.summary,
    preview: previewSource.slice(0, previewLimit),
    previewTruncated: previewSource.length > previewLimit,
  };
}

export function setDocumentDisposition(
  workspaceRoot: string,
  logicalDocumentId: string,
  status: DocumentDispositionStatus,
  _options: RollbackWriteOptions = {},
): PlanningDocumentSummary {
  if (!isDocumentDispositionStatus(status)) {
    throw new Error("Unsupported document disposition status.");
  }
  const record = findReadableRecord(workspaceRoot, logicalDocumentId);
  const metadata = metadataWithDisposition(
    record.summary.metadata.canonical!,
    status,
    status === "RevisionRequested" ? record.summary.metadata.canonical!.documentDisposition.notes : "",
    new Date().toISOString(),
  );
  writeCanonicalMarkdownTransaction(workspaceRoot, [{
    relativePath: record.summary.markdownPath,
    metadata,
    bodyMarkdown: record.bodyMarkdown ?? "",
  }]);
  return findReadRecord(workspaceRoot, logicalDocumentId).summary;
}

export function setDocumentDispositions(
  workspaceRoot: string,
  logicalDocumentIds: string[],
  status: DocumentDispositionStatus,
  _options: RollbackWriteOptions = {},
): PlanningDocumentSummary[] {
  if (!isDocumentDispositionStatus(status)) {
    throw new Error("Unsupported document disposition status.");
  }
  const records = logicalDocumentIds.map((logicalDocumentId) => findReadableRecord(workspaceRoot, logicalDocumentId));
  writeCanonicalMarkdownTransaction(
    workspaceRoot,
    records.map((record) => ({
      relativePath: record.summary.markdownPath,
      metadata: metadataWithDisposition(
        record.summary.metadata.canonical!,
        status,
        status === "RevisionRequested" ? record.summary.metadata.canonical!.documentDisposition.notes : "",
        new Date().toISOString(),
      ),
      bodyMarkdown: record.bodyMarkdown ?? "",
    })),
  );
  return records.map((record) => findReadRecord(workspaceRoot, record.summary.logicalDocumentId).summary);
}

export interface RevisionSaveResult {
  revisedDocument: PlanningDocumentSummary;
  invalidatedDocuments: PlanningDocumentSummary[];
}

export function savePlanningDocumentRevision(
  workspaceRoot: string,
  logicalDocumentId: string,
  _options: RollbackWriteOptions = {},
): RevisionSaveResult {
  const record = findReadableRecord(workspaceRoot, logicalDocumentId);
  const nextMetadata = metadataWithSubstantiveRevision(record.summary.metadata.canonical!);
  const allRecords = buildReadRecords(workspaceRoot);
  const downstreamRecords = downstreamDependencyRecords(record, allRecords);

  const entries = [{
    relativePath: record.summary.markdownPath,
    metadata: nextMetadata,
    bodyMarkdown: record.bodyMarkdown ?? "",
  }, ...downstreamRecords
    .filter((downstream) => Boolean(downstream.summary.metadata.canonical))
    .map((downstream) => ({
      relativePath: downstream.summary.markdownPath,
      metadata: metadataWithDisposition(
        downstream.summary.metadata.canonical!,
        classifyLifecycleArtifact(downstream.summary).participationRole === "nonReviewHandoff"
          ? "Approved"
          : "Pending",
        "",
        null,
      ),
      bodyMarkdown: downstream.bodyMarkdown ?? "",
    }))];

  writeCanonicalMarkdownTransaction(workspaceRoot, entries);

  const revisedDocument = findReadRecord(workspaceRoot, logicalDocumentId).summary;
  const updatedDocuments = listPlanningDocuments(workspaceRoot);
  const invalidatedDocuments = downstreamRecords
    .map((downstream) =>
      updatedDocuments.find((candidate) => candidate.logicalDocumentId === downstream.summary.logicalDocumentId),
    )
    .filter((candidate): candidate is PlanningDocumentSummary => Boolean(candidate));
  return { revisedDocument, invalidatedDocuments };
}

function writeCanonicalMarkdownTransaction(
  workspaceRoot: string,
  documents: Array<{ relativePath: string; metadata: CanonicalDocumentMetadata; bodyMarkdown: string }>,
): void {
  const entries = documents.map((document) => ({
    relativePath: document.relativePath,
    content: serializeCanonicalMarkdownDocument(document.metadata, document.bodyMarkdown),
  }));
  writeArtifactTransaction(workspaceRoot, entries, () => {
    for (const document of documents) {
      const installed = parseCanonicalMarkdownDocument(
        fs.readFileSync(path.join(workspaceRoot, document.relativePath), "utf8"),
      );
      if (JSON.stringify(installed.metadata) !== JSON.stringify(document.metadata)) {
        throw new Error("Installed canonical metadata verification failed.");
      }
      if (installed.bodyMarkdown !== parseCanonicalMarkdownDocument(
        serializeCanonicalMarkdownDocument(document.metadata, document.bodyMarkdown),
      ).bodyMarkdown) {
        throw new Error("Installed canonical body verification failed.");
      }
    }
  });
}

export function evaluateDocumentFreshness(
  workspaceRoot: string,
  logicalDocumentId: string,
): FreshnessEvaluation {
  const documents = listPlanningDocuments(workspaceRoot);
  const document = documents.find((candidate) => candidate.logicalDocumentId === logicalDocumentId);
  if (!document) {
    throw new Error("Unknown logical document ID.");
  }
  return evaluateFreshnessFromSummaries(document, documents);
}

export function previewDispositionInitialization(workspaceRoot: string): InitializationPreview {
  const documents = listPlanningDocuments(workspaceRoot);
  const affectedPaths = documents
    .filter((document) => document.initializationNeeded)
    .map((document) => document.markdownPath)
    .sort(comparePaths);
  return {
    totalLogicalDocuments: documents.length,
    affectedLogicalDocuments: affectedPaths.length,
    affectedMarkdownFiles: affectedPaths.length,
    affectedPaths,
  };
}

export function applyDispositionInitialization(
  workspaceRoot: string,
  options: RollbackWriteOptions = {},
): InitializationResult {
  const previewBeforeApply = previewDispositionInitialization(workspaceRoot);
  const documents = listPlanningDocuments(workspaceRoot);
  return {
    previewBeforeApply,
    previewAfterApply: previewDispositionInitialization(workspaceRoot),
    documents,
  };
}

function buildReadRecords(workspaceRoot: string): ReadRecord[] {
  const resolvedRoot = path.resolve(workspaceRoot);
  const planningRoot = path.join(resolvedRoot, "planning");
  if (!fs.existsSync(planningRoot)) return [];
  if (!fs.statSync(planningRoot).isDirectory()) {
    throw new Error("Workspace does not contain planning/.");
  }
  return discoverMarkdownFiles(resolvedRoot).map((entry) => readRecord(resolvedRoot, entry));
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

function findReadableRecord(workspaceRoot: string, logicalDocumentId: string): ReadRecord {
  const record = findReadRecord(workspaceRoot, logicalDocumentId);
  if (record.summary.readError || !record.summary.metadata.canonical) {
    throw new Error("Cannot update a document while canonical metadata could not be read.");
  }
  return record;
}

function discoverMarkdownFiles(workspaceRoot: string): FileEntry[] {
  const entries: FileEntry[] = [];
  const planningRoot = path.join(workspaceRoot, "planning");
  function visit(directory: string): void {
    for (const child of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, child.name);
      const relativePath = normalizeRelativePath(path.relative(workspaceRoot, absolutePath));
      const extension = path.extname(child.name).toLowerCase();
      let stats: fs.Stats;
      try {
        const injectedError = testHooks.failLstat?.(relativePath);
        if (injectedError) throw injectedError instanceof Error ? injectedError : new Error(injectedError);
        stats = fs.lstatSync(absolutePath);
      } catch (error) {
        if (extension === ".md") {
          entries.push({ absolutePath, relativePath, readError: errorMessage(error) });
        }
        continue;
      }
      if (stats.isSymbolicLink()) continue;
      if (stats.isDirectory()) {
        visit(absolutePath);
        continue;
      }
      if (stats.isFile() && extension === ".md") {
        entries.push({ absolutePath, relativePath });
      }
    }
  }
  visit(planningRoot);
  return entries.sort((left, right) => comparePaths(left.relativePath, right.relativePath));
}

function readRecord(workspaceRoot: string, entry: FileEntry): ReadRecord {
  let content: string | undefined;
  let bodyMarkdown: string | undefined;
  let metadata: PlanningDocumentMetadata = { sourceRevisions: [] };
  let disposition: DocumentDispositionStatus = "Pending";
  let readError = entry.readError;

  if (!readError) {
    try {
      content = readContainedFile(workspaceRoot, entry);
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

  const summary: PlanningDocumentSummary = {
    logicalDocumentId: stableLogicalDocumentId(entry.relativePath),
    markdownPath: entry.relativePath,
    displayFilename: path.basename(entry.relativePath, ".md"),
    metadata,
    effectiveDisposition: disposition,
    documentReadState: readError ? "read-error" : "readable",
    initializationNeeded: Boolean(readError),
    readError,
  };
  return { entry, summary, content, bodyMarkdown };
}

function metadataFromCanonical(canonical: PlanningDocumentMetadata["canonical"]): PlanningDocumentMetadata {
  if (!canonical) return { sourceRevisions: [] };
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

function downstreamDependencyRecords(sourceRecord: ReadRecord, records: ReadRecord[]): ReadRecord[] {
  const invalidationIds = new Set<string>();
  for (const record of records) {
    if (record.summary.logicalDocumentId === sourceRecord.summary.logicalDocumentId) continue;
    const referencesSource = (record.summary.metadata.sourceRevisions ?? []).some(
      (source) => source.path === sourceRecord.summary.markdownPath,
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

function coordinatedBundleRecords(record: ReadRecord, records: ReadRecord[]): ReadRecord[] {
  const value = `${record.summary.markdownPath}/${record.summary.displayFilename}`.toLowerCase();
  if (value.includes("project_profile") || value.includes("project_roadmap")) {
    return records.filter((candidate) => {
      const candidateValue = `${candidate.summary.markdownPath}/${candidate.summary.displayFilename}`.toLowerCase();
      return candidateValue.includes("project_profile") || candidateValue.includes("project_roadmap");
    });
  }
  if (value.includes("phase_planning") || value.includes("work_card_plan")) {
    return records.filter((candidate) => {
      const candidateValue = `${candidate.summary.markdownPath}/${candidate.summary.displayFilename}`.toLowerCase();
      return candidateValue.includes("phase_planning") || candidateValue.includes("work_card_plan");
    });
  }
  return [record];
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

function architectOutputTargetsValue(value: unknown): PlanningDocumentMetadata["architectOutputTargets"] {
  if (!value || typeof value !== "object") return undefined;
  const markdown = (value as { markdown?: unknown }).markdown;
  return typeof markdown === "string" ? { markdown } : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
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
  return relativePath.length === 0 || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
}
