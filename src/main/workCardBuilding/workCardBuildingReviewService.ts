import fs from "node:fs";
import path from "node:path";
import type { DocumentDispositionStatus } from "../../shared/documents/documentDisposition";
import type { CanonicalDocumentMetadata } from "../../shared/documents/canonicalMarkdown";
import {
  metadataWithDisposition,
  parseCanonicalMarkdownDocument,
} from "../../shared/documents/canonicalMarkdown";
import type { PlanningDocumentSummary } from "../../shared/documents/planningDocument";
import {
  evaluateDocumentFreshness,
  listPlanningDocuments,
  savePlanningDocumentRevision,
} from "../documents/planningDocumentService";
import {
  updateCanonicalMarkdownDisposition,
  writeCanonicalMarkdownDocument,
  writeCanonicalMarkdownDocuments,
} from "../documents/canonicalMarkdownDocumentWriter";

export interface ImplementerReportResult {
  markdownPath: string;
}

export interface WorkCardImplementerReportContext {
  phaseId: string;
  workCardId: string;
  workCardTitle: string;
  formalWorkCardPath: string;
  formalWorkCardRevision: number;
  implementerReportPath: string;
  existingReport?: PlanningDocumentSummary;
}

export interface WorkCardImplementerReportProjection {
  phaseId: string;
  workCardId: string;
  workCardTitle: string;
  formalWorkCardPath: string;
  formalWorkCardRevision: number;
  implementerReportPath: string;
  report?: {
    logicalDocumentId: string;
    artifactRevision?: number;
    disposition: DocumentDispositionStatus;
  };
  reportDocumentReadState: string;
  reportFreshnessState?: "fresh" | "stale";
  reportReadError?: string;
  reportMissing: boolean;
}

export interface ResolveWorkCardReportContextInput {
  phaseId: string;
  workCardId: string;
  formalWorkCardPath?: string;
  formalWorkCardRevision?: number;
  workCardTitle?: string;
}

export function resolveWorkCardImplementerReportContext(
  workspaceRoot: string,
  input: ResolveWorkCardReportContextInput,
): WorkCardImplementerReportContext {
  const documents = listPlanningDocuments(workspaceRoot);
  const formal = findFormalWorkCard(documents, input);
  const formalWorkCardPath = input.formalWorkCardPath ?? formal?.markdownPath;
  if (!formalWorkCardPath) {
    throw new Error("Current Formal Work Card path is required to resolve the Implementer Report target.");
  }
  const formalWorkCardRevision =
    input.formalWorkCardRevision ??
    formal?.metadata.artifactRevision ??
    readCanonicalRevisionIfPresent(workspaceRoot, formalWorkCardPath) ??
    1;
  const workCardTitle =
    nonEmpty(input.workCardTitle) ??
    workCardTitleFromFormal(formal) ??
    titleFromFormalPath(formalWorkCardPath, input.workCardId);
  const implementerReportPath = implementerReportPathForFormal({
    phaseId: input.phaseId,
    workCardId: input.workCardId,
    formalWorkCardPath,
  });
  const existingReport = documents.find((document) => document.markdownPath === implementerReportPath);
  return {
    phaseId: input.phaseId,
    workCardId: input.workCardId,
    workCardTitle,
    formalWorkCardPath,
    formalWorkCardRevision,
    implementerReportPath,
    existingReport,
  };
}

export function createImplementerReportForApprovedWorkCard(
  workspaceRoot: string,
  phaseId: string,
  workCardId: string,
): ImplementerReportResult {
  const context = resolveApprovedReportContext(workspaceRoot, phaseId, workCardId);
  ensureNoConflictingReport(workspaceRoot, context);
  if (context.existingReport) {
    assertExistingReportMatchesContext(workspaceRoot, context, context.existingReport);
    return { markdownPath: context.implementerReportPath };
  }
  writeCanonicalMarkdownDocument(buildImplementerReportDocument(workspaceRoot, context));
  return { markdownPath: context.implementerReportPath };
}

export function buildApprovedFormalWorkCardAndReportDocuments(input: {
  workspaceRoot: string;
  formalWorkCardPath: string;
  approvedStatus: DocumentDispositionStatus;
  notes: string;
  reviewedAt: string;
}): Array<Parameters<typeof writeCanonicalMarkdownDocuments>[0][number]> {
  const existingFormal = readCanonical(input.workspaceRoot, input.formalWorkCardPath);
  const phaseId = stringValue(existingFormal.metadata.identity.phaseId);
  const workCardId = stringValue(existingFormal.metadata.identity.workCardId);
  if (!phaseId || !workCardId) {
    throw new Error("Formal Work Card approval requires phase and Work Card identity.");
  }
  const formalRevision = existingFormal.metadata.artifactRevision ?? 1;
  const context = resolveWorkCardImplementerReportContext(input.workspaceRoot, {
    phaseId,
    workCardId,
    formalWorkCardPath: input.formalWorkCardPath,
    formalWorkCardRevision: formalRevision,
    workCardTitle: titleFromFormalMetadata(existingFormal.metadata) ?? undefined,
  });
  ensureNoConflictingReport(input.workspaceRoot, context);
  const documents: Array<Parameters<typeof writeCanonicalMarkdownDocuments>[0][number]> = [{
    workspaceRoot: input.workspaceRoot,
    relativePath: input.formalWorkCardPath,
    metadata: metadataWithDisposition(
      existingFormal.metadata,
      input.approvedStatus,
      input.notes,
      input.reviewedAt,
    ),
    bodyMarkdown: existingFormal.bodyMarkdown,
  }];
  if (context.existingReport) {
    assertExistingReportMatchesContext(input.workspaceRoot, context, context.existingReport);
    return documents;
  }
  documents.push(buildImplementerReportDocument(input.workspaceRoot, context));
  return documents;
}

export function approveFormalWorkCardAndRegisterReport(input: {
  workspaceRoot: string;
  formalWorkCardPath: string;
  notes?: string;
  reviewedAt?: string;
}): void {
  const reviewedAt = input.reviewedAt ?? new Date().toISOString();
  writeCanonicalMarkdownDocuments(buildApprovedFormalWorkCardAndReportDocuments({
    workspaceRoot: input.workspaceRoot,
    formalWorkCardPath: input.formalWorkCardPath,
    approvedStatus: "Approved",
    notes: input.notes ?? "",
    reviewedAt,
  }));
}

export function getWorkCardBuildingReviewProjection(
  workspaceRoot: string,
  phaseId: string,
  workCardId: string,
): WorkCardImplementerReportProjection {
  const context = resolveApprovedReportContext(workspaceRoot, phaseId, workCardId);
  const report = context.existingReport;
  const freshness = report?.documentReadState === "readable"
    ? evaluateDocumentFreshness(workspaceRoot, report.logicalDocumentId).state
    : undefined;
  return {
    phaseId: context.phaseId,
    workCardId: context.workCardId,
    workCardTitle: context.workCardTitle,
    formalWorkCardPath: context.formalWorkCardPath,
    formalWorkCardRevision: context.formalWorkCardRevision,
    implementerReportPath: context.implementerReportPath,
    report: report
      ? {
          logicalDocumentId: report.logicalDocumentId,
          artifactRevision: report.metadata.artifactRevision,
          disposition: report.effectiveDisposition,
        }
      : undefined,
    reportDocumentReadState: report?.documentReadState ?? "missing",
    reportFreshnessState: freshness === "fresh" || freshness === "stale" ? freshness : undefined,
    reportReadError: report?.readError,
    reportMissing: !report,
  };
}

export function setImplementerReportDisposition(
  workspaceRoot: string,
  phaseId: string,
  workCardId: string,
  status: DocumentDispositionStatus,
  notes = "",
) {
  const context = resolveApprovedReportContext(workspaceRoot, phaseId, workCardId);
  if (!context.existingReport) {
    throw new Error(`Implementer Report is missing: ${context.implementerReportPath}`);
  }
  assertExistingReportMatchesContext(workspaceRoot, context, context.existingReport);
  updateCanonicalMarkdownDisposition({
    workspaceRoot,
    relativePath: context.implementerReportPath,
    status,
    notes,
    reviewedAt: new Date().toISOString(),
  });
  return requiredReportAtPath(workspaceRoot, context.implementerReportPath);
}

export function getOperatorValidationEligibility(
  workspaceRoot: string,
  phaseId: string,
  workCardId: string,
) {
  const context = resolveApprovedReportContext(workspaceRoot, phaseId, workCardId);
  const report = context.existingReport;
  if (!report) {
    return {
      eligible: false,
      repairRequired: false,
      reason: "Operator validation requires a readable, fresh, Approved Implementer Report.",
    };
  }
  const freshness = evaluateDocumentFreshness(workspaceRoot, report.logicalDocumentId);
  const eligible =
    report.effectiveDisposition === "Approved" &&
    report.documentReadState === "readable" &&
    freshness.state === "fresh";
  return {
    eligible,
    repairRequired: report.effectiveDisposition === "RevisionRequested",
    reason: eligible
      ? "Approved current Implementer Report is ready for Operator validation."
      : "Operator validation requires a readable, fresh, Approved Implementer Report.",
  };
}

export function reviseImplementerReport(workspaceRoot: string, phaseId: string, workCardId: string): void {
  const context = resolveApprovedReportContext(workspaceRoot, phaseId, workCardId);
  if (!context.existingReport) {
    throw new Error(`Implementer Report is missing: ${context.implementerReportPath}`);
  }
  savePlanningDocumentRevision(workspaceRoot, context.existingReport.logicalDocumentId);
}

function resolveApprovedReportContext(
  workspaceRoot: string,
  phaseId: string,
  workCardId: string,
): WorkCardImplementerReportContext {
  const formal = requiredApprovedFormal(workspaceRoot, phaseId, workCardId);
  return resolveWorkCardImplementerReportContext(workspaceRoot, {
    phaseId,
    workCardId,
    formalWorkCardPath: formal.markdownPath,
    formalWorkCardRevision: formal.metadata.artifactRevision ?? 1,
  });
}

function buildImplementerReportDocument(
  workspaceRoot: string,
  context: WorkCardImplementerReportContext,
): Parameters<typeof writeCanonicalMarkdownDocuments>[0][number] {
  const workflowData = {
    repositoryVerification: "Pending Implementer verification.",
    filesChanged: [],
    implementationSummary: "",
    validationResults: [],
    acceptanceEvidence: [],
    deviations: [],
    blockers: [],
    remainingOperatorValidation: [],
  };
  return {
    workspaceRoot,
    relativePath: context.implementerReportPath,
    metadata: {
      schemaVersion: 1,
      artifactType: "implementer-report",
      artifactRevision: 1,
      participationRole: "gatingReview",
      identity: {
        phaseId: context.phaseId,
        workCardId: context.workCardId,
      },
      sourceRevisions: [{
        path: context.formalWorkCardPath,
        revision: context.formalWorkCardRevision,
      }],
      workflowData,
      documentDisposition: { status: "Pending", notes: "", reviewedAt: null },
    },
    bodyMarkdown: implementerReportBody(context),
  };
}

function implementerReportBody(context: WorkCardImplementerReportContext): string {
  return [
    `# Implementer Report — ${context.workCardId}`,
    "",
    `Approved Formal Work Card: ${context.formalWorkCardPath} revision ${context.formalWorkCardRevision}`,
    `Report target: ${context.implementerReportPath}`,
    "",
    "Status: Pending Implementer completion.",
    "",
    "## Repository Verification",
    "## Implementation Summary",
    "## Files Created",
    "## Files Modified",
    "## Acceptance Criteria Evidence",
    "## Commands and Results",
    "## Validation Performed",
    "## Validation Skipped",
    "## Operator Validation Remaining",
    "## Scope Expansion and Deviations",
    "## Residual Risks and Blockers",
    "## Git Actions",
    "",
  ].join("\n");
}

function assertExistingReportMatchesContext(
  workspaceRoot: string,
  context: WorkCardImplementerReportContext,
  report: PlanningDocumentSummary,
): void {
  if (report.documentReadState !== "readable" || report.readError) {
    throw new Error(report.readError ?? "Existing Implementer Report is not readable.");
  }
  const metadata = report.metadata.canonical;
  if (!metadata) {
    throw new Error("Existing Implementer Report is not canonical.");
  }
  if (
    metadata.artifactType !== "implementer-report" ||
    metadata.participationRole !== "gatingReview" ||
    metadata.identity.phaseId !== context.phaseId ||
    metadata.identity.workCardId !== context.workCardId
  ) {
    throw new Error("Existing Implementer Report identity conflicts with the approved Formal Work Card.");
  }
  const expectedSource = [{ path: context.formalWorkCardPath, revision: context.formalWorkCardRevision }];
  if (JSON.stringify(metadata.sourceRevisions ?? []) !== JSON.stringify(expectedSource)) {
    throw new Error("Existing Implementer Report source revision conflicts with the approved Formal Work Card.");
  }
  const absolutePath = path.join(path.resolve(workspaceRoot), context.implementerReportPath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error("Existing Implementer Report target disappeared during verification.");
  }
}

function ensureNoConflictingReport(
  workspaceRoot: string,
  context: WorkCardImplementerReportContext,
): void {
  const conflicts = listPlanningDocuments(workspaceRoot)
    .filter((document) => document.markdownPath !== context.implementerReportPath)
    .filter((document) =>
      document.markdownPath.startsWith(`planning/phases/${context.phaseId}/Implementer_Reports/IMPLEMENTER_REPORT_${context.workCardId}`) ||
      (
        document.metadata.artifactType === "implementer-report" &&
        document.metadata.phaseId === context.phaseId &&
        document.metadata.workCardId === context.workCardId
      ) ||
      (
        document.metadata.canonical?.artifactType === "implementer-report" &&
        document.metadata.canonical.identity.phaseId === context.phaseId &&
        document.metadata.canonical.identity.workCardId === context.workCardId
      )
    );
  if (conflicts.length > 0) {
    throw new Error(`Conflicting Implementer Report target exists: ${conflicts[0].markdownPath}`);
  }
}

function requiredApprovedFormal(
  workspaceRoot: string,
  phaseId: string,
  workCardId: string,
): PlanningDocumentSummary {
  const formal = findFormalWorkCard(listPlanningDocuments(workspaceRoot), { phaseId, workCardId });
  if (!formal) {
    throw new Error(`Formal Work Card document is missing: planning/phases/${phaseId}/Work_Cards/${workCardId}`);
  }
  if (formal.documentReadState !== "readable" || formal.readError) {
    throw new Error(formal.readError ?? "Formal Work Card is not readable.");
  }
  if (formal.effectiveDisposition !== "Approved") {
    throw new Error("Current Approved Formal Work Card is required for Implementer Report registration.");
  }
  if (evaluateDocumentFreshness(workspaceRoot, formal.logicalDocumentId).state === "stale") {
    throw new Error("Current Formal Work Card is stale.");
  }
  return formal;
}

function requiredReportAtPath(workspaceRoot: string, markdownPath: string): PlanningDocumentSummary {
  const report = listPlanningDocuments(workspaceRoot)
    .find((document) => document.markdownPath === markdownPath);
  if (!report) {
    throw new Error(`Implementer Report is missing: ${markdownPath}`);
  }
  return report;
}

function findFormalWorkCard(
  documents: PlanningDocumentSummary[],
  input: ResolveWorkCardReportContextInput,
): PlanningDocumentSummary | undefined {
  if (input.formalWorkCardPath) {
    const exact = documents.find((document) => document.markdownPath === input.formalWorkCardPath);
    if (exact) {
      return exact;
    }
  }
  return documents
    .filter((document) => document.metadata.artifactType === "formal-work-card")
    .filter((document) => document.metadata.phaseId === input.phaseId || document.metadata.canonical?.identity.phaseId === input.phaseId)
    .filter((document) => document.metadata.workCardId === input.workCardId || document.metadata.canonical?.identity.workCardId === input.workCardId)
    .at(-1);
}

function implementerReportPathForFormal(input: {
  phaseId: string;
  workCardId: string;
  formalWorkCardPath: string;
}): string {
  const displayFilename = path.posix.basename(input.formalWorkCardPath, ".md");
  const escapedWorkCardId = input.workCardId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const slug = displayFilename.replace(new RegExp(`^${escapedWorkCardId}_?`, "i"), "") || "implementation";
  return `planning/phases/${input.phaseId}/Implementer_Reports/IMPLEMENTER_REPORT_${input.workCardId}_${slug}.md`;
}

function readCanonical(workspaceRoot: string, relativePath: string) {
  return parseCanonicalMarkdownDocument(
    fs.readFileSync(path.join(path.resolve(workspaceRoot), relativePath), "utf8"),
  );
}

function readCanonicalRevisionIfPresent(workspaceRoot: string, relativePath: string): number | undefined {
  const absolutePath = path.join(path.resolve(workspaceRoot), relativePath);
  if (!fs.existsSync(absolutePath)) {
    return undefined;
  }
  return readCanonical(workspaceRoot, relativePath).metadata.artifactRevision ?? 1;
}

function workCardTitleFromFormal(formal?: PlanningDocumentSummary): string | undefined {
  return formal ? titleFromFormalMetadata(formal.metadata.canonical) ?? formal.displayFilename : undefined;
}

function titleFromFormalMetadata(metadata?: CanonicalDocumentMetadata): string | undefined {
  const candidate = metadata?.workflowData.candidate;
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return undefined;
  }
  const title = (candidate as Record<string, unknown>).title;
  return nonEmpty(title);
}

function titleFromFormalPath(formalWorkCardPath: string, workCardId: string): string {
  const displayFilename = path.posix.basename(formalWorkCardPath, ".md");
  const escapedWorkCardId = workCardId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const slug = displayFilename.replace(new RegExp(`^${escapedWorkCardId}_?`, "i"), "") || workCardId;
  return slug
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function nonEmpty(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
