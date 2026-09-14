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
  PlanningDocumentSummary,
} from "../../shared/documents/planningDocument";
import {
  metadataWithDisposition,
  metadataWithSubstantiveRevision,
} from "../../shared/documents/canonicalMarkdown";
import { evaluateFreshnessFromSummaries, type FreshnessEvaluation } from "../../shared/documents/sourceFreshness";
import { classifyLifecycleArtifact } from "../../shared/documents/lifecycleArtifact";
import {
  writeCanonicalMarkdownDocument,
  writeCanonicalMarkdownDocuments,
} from "./canonicalMarkdownDocumentWriter";
import {
  __setPlanningRepositorySnapshotTestHooks,
  acquirePlanningRepositorySnapshot,
  findPlanningRecordByLogicalDocumentIdFromSnapshot,
  listPlanningRecordsFromSnapshot,
  type PlanningRepositoryRecord,
  type PlanningRepositorySnapshot,
} from "./planningRepositorySnapshot";
import {
  createPlanningProjectionContext,
  type PlanningProjectionContext,
} from "./planningProjectionContext";

export type PlanningReadContext = string | PlanningProjectionContext;

interface PlanningDocumentServiceTestHooks {
  failLstat?: (relativePath: string) => Error | string | undefined;
  failRead?: (relativePath: string) => Error | string | undefined;
  onContentRead?: (relativePath: string) => void;
  onRecordParse?: (relativePath: string) => void;
  onSnapshotAcquisition?: (workspaceRoot: string) => void;
  onInventoryScan?: (workspaceRoot: string) => void;
}

export interface RollbackWriteOptions {
  failAfterWrites?: number;
  failFinalVerification?: boolean;
}

export function __setPlanningDocumentServiceTestHooks(
  hooks: PlanningDocumentServiceTestHooks = {},
): void {
  __setPlanningRepositorySnapshotTestHooks(hooks);
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

export function listPlanningDocuments(source: PlanningReadContext): PlanningDocumentSummary[] {
  return typeof source === "string"
    ? listPlanningDocumentsFromSnapshot(acquirePlanningRepositorySnapshot(source))
    : listPlanningDocumentsFromContext(source);
}

export function listPlanningDocumentsFromSnapshot(
  snapshot: PlanningRepositorySnapshot,
): PlanningDocumentSummary[] {
  return listPlanningRecordsFromSnapshot(snapshot).map((entry) => entry.summary);
}

export function listPlanningDocumentsFromContext(
  context: import("./planningProjectionContext").PlanningProjectionContext,
): PlanningDocumentSummary[] {
  return [...context.documents];
}

export function readPlanningDocument(
  workspaceRoot: string,
  logicalDocumentId: string,
): PlanningDocumentDetail {
  return readPlanningDocumentFromSnapshot(
    acquirePlanningRepositorySnapshot(workspaceRoot),
    logicalDocumentId,
  );
}

export function readPlanningDocumentFromSnapshot(
  snapshot: PlanningRepositorySnapshot,
  logicalDocumentId: string,
): PlanningDocumentDetail {
  const record = findReadRecordFromSnapshot(snapshot, logicalDocumentId);
  const bodyMarkdown = record.bodyMarkdown ?? record.content ?? "";
  return {
    ...record.summary,
    bodyMarkdown,
    preview: bodyMarkdown,
    previewTruncated: false,
  };
}

export function readPlanningDocumentFromContext(
  context: import("./planningProjectionContext").PlanningProjectionContext,
  logicalDocumentId: string,
): PlanningDocumentDetail {
  return readPlanningDocumentFromSnapshot(context.snapshot, logicalDocumentId);
}

export function setDocumentDisposition(
  workspaceRoot: string,
  logicalDocumentId: string,
  status: DocumentDispositionStatus,
  _options: RollbackWriteOptions = {},
): PlanningDocumentSummary {
  return setDocumentDispositionWithPlanningContext(
    workspaceRoot,
    logicalDocumentId,
    status,
    _options,
  ).document;
}

export function setDocumentDispositionWithPlanningContext(
  workspaceRoot: string,
  logicalDocumentId: string,
  status: DocumentDispositionStatus,
  _options: RollbackWriteOptions = {},
  postWriteContextFactory?: () => PlanningProjectionContext,
): { document: PlanningDocumentSummary; planningContext: PlanningProjectionContext } {
  return setDocumentDispositionTransaction(
    workspaceRoot,
    logicalDocumentId,
    status,
    postWriteContextFactory,
    false,
  );
}

export function setGenericDocumentDispositionWithPlanningContext(
  workspaceRoot: string,
  logicalDocumentId: string,
  status: DocumentDispositionStatus,
  _options: RollbackWriteOptions = {},
  postWriteContextFactory?: () => PlanningProjectionContext,
): { document: PlanningDocumentSummary; planningContext: PlanningProjectionContext } {
  return setDocumentDispositionTransaction(
    workspaceRoot,
    logicalDocumentId,
    status,
    postWriteContextFactory,
    true,
  );
}

function setDocumentDispositionTransaction(
  workspaceRoot: string,
  logicalDocumentId: string,
  status: DocumentDispositionStatus,
  postWriteContextFactory: (() => PlanningProjectionContext) | undefined,
  enforceGenericRoute: boolean,
): { document: PlanningDocumentSummary; planningContext: PlanningProjectionContext } {
  if (!isDocumentDispositionStatus(status)) {
    throw new Error("Unsupported document disposition status.");
  }
  const snapshot = acquirePlanningRepositorySnapshot(workspaceRoot);
  const record = findReadableRecordFromSnapshot(snapshot, logicalDocumentId);
  if (enforceGenericRoute) {
    assertGenericDocumentDispositionRecordAllowed(record.summary);
  }
  const metadata = metadataWithDisposition(
    record.summary.metadata.canonical!,
    status,
    status === "RevisionRequested" ? record.summary.metadata.canonical!.documentDisposition.notes : "",
    new Date().toISOString(),
  );
  writeCanonicalMarkdownDocument({
    workspaceRoot,
    relativePath: record.summary.markdownPath,
    metadata,
    bodyMarkdown: record.bodyMarkdown ?? "",
  });
  const planningContext = postWriteContextFactory?.() ?? createPlanningProjectionContext(workspaceRoot);
  return {
    document: findReadRecordFromSnapshot(
      planningContext.snapshot,
      logicalDocumentId,
    ).summary,
    planningContext,
  };
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
  const snapshot = acquirePlanningRepositorySnapshot(workspaceRoot);
  const records = logicalDocumentIds.map((logicalDocumentId) =>
    findReadableRecordFromSnapshot(snapshot, logicalDocumentId),
  );
  writeCanonicalMarkdownDocuments(
    records.map((record) => ({
      workspaceRoot,
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
  const updatedSnapshot = acquirePlanningRepositorySnapshot(workspaceRoot);
  return records.map((record) =>
    findReadRecordFromSnapshot(updatedSnapshot, record.summary.logicalDocumentId).summary,
  );
}

export function assertGenericDocumentDispositionRouteAllowed(
  workspaceRoot: string,
  logicalDocumentId: string,
): void {
  const record = findReadableRecordFromSnapshot(
    acquirePlanningRepositorySnapshot(workspaceRoot),
    logicalDocumentId,
  );
  assertGenericDocumentDispositionRecordAllowed(record.summary);
}

function assertGenericDocumentDispositionRecordAllowed(document: PlanningDocumentSummary): void {
  if (isCatalogOwnedArchitectOutput(document)) {
    throw new Error("Catalog-owned Architect outputs must be reviewed through architectOutput:review.");
  }
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
  const snapshot = acquirePlanningRepositorySnapshot(workspaceRoot);
  const record = findReadableRecordFromSnapshot(snapshot, logicalDocumentId);
  const nextMetadata = metadataWithSubstantiveRevision(record.summary.metadata.canonical!);
  const allRecords = [...listPlanningRecordsFromSnapshot(snapshot)];
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

  writeCanonicalMarkdownDocuments(entries.map((entry) => ({
    workspaceRoot,
    ...entry,
  })));

  const updatedSnapshot = acquirePlanningRepositorySnapshot(workspaceRoot);
  const revisedDocument = findReadRecordFromSnapshot(updatedSnapshot, logicalDocumentId).summary;
  const invalidatedDocuments = downstreamRecords
    .map((downstream) => findPlanningRecordByLogicalDocumentIdFromSnapshot(
      updatedSnapshot,
      downstream.summary.logicalDocumentId,
    )?.summary)
    .filter((candidate): candidate is PlanningDocumentSummary => Boolean(candidate));
  return { revisedDocument, invalidatedDocuments };
}

export function evaluateDocumentFreshness(
  source: PlanningReadContext,
  logicalDocumentId: string,
): FreshnessEvaluation {
  return typeof source === "string"
    ? evaluateDocumentFreshnessFromSnapshot(acquirePlanningRepositorySnapshot(source), logicalDocumentId)
    : evaluateDocumentFreshnessFromContext(source, logicalDocumentId);
}

export function evaluateDocumentFreshnessFromContext(
  context: import("./planningProjectionContext").PlanningProjectionContext,
  logicalDocumentId: string,
): FreshnessEvaluation {
  return evaluateDocumentFreshnessFromSnapshot(context.snapshot, logicalDocumentId);
}

export function evaluateDocumentFreshnessFromSnapshot(
  snapshot: PlanningRepositorySnapshot,
  logicalDocumentId: string,
): FreshnessEvaluation {
  const documents = listPlanningDocumentsFromSnapshot(snapshot);
  const document = findPlanningRecordByLogicalDocumentIdFromSnapshot(
    snapshot,
    logicalDocumentId,
  )?.summary;
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

function findReadRecordFromSnapshot(
  snapshot: PlanningRepositorySnapshot,
  logicalDocumentId: string,
): PlanningRepositoryRecord {
  if (logicalDocumentId.includes("..") || logicalDocumentId.includes("/") || logicalDocumentId.includes("\\")) {
    throw new Error("Unknown logical document ID.");
  }
  const record = findPlanningRecordByLogicalDocumentIdFromSnapshot(snapshot, logicalDocumentId);
  if (!record) {
    throw new Error("Unknown logical document ID.");
  }
  return record;
}

function findReadableRecordFromSnapshot(
  snapshot: PlanningRepositorySnapshot,
  logicalDocumentId: string,
): PlanningRepositoryRecord {
  const record = findReadRecordFromSnapshot(snapshot, logicalDocumentId);
  if (record.summary.readError || !record.summary.metadata.canonical) {
    throw new Error("Cannot update a document while canonical metadata could not be read.");
  }
  return record;
}

function downstreamDependencyRecords(
  sourceRecord: PlanningRepositoryRecord,
  records: PlanningRepositoryRecord[],
): PlanningRepositoryRecord[] {
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

function coordinatedBundleRecords(
  record: PlanningRepositoryRecord,
  records: PlanningRepositoryRecord[],
): PlanningRepositoryRecord[] {
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

function comparePaths(left: string, right: string): number {
  return left.localeCompare(right, "en", { sensitivity: "base" });
}

function isCatalogOwnedArchitectOutput(document: PlanningDocumentSummary): boolean {
  return new Set([
    "project-architect-interview",
    "project-profile",
    "project-roadmap",
    "phase-map",
    "phase-interview",
    "phase-planning",
    "work-card-plan",
    "formal-work-card",
    "repair-work-card",
  ]).has(document.metadata.artifactType ?? "");
}
