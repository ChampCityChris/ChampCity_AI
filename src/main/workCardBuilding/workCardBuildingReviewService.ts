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
import {
  inheritRepositoryAuthorityFromSourceRevisions,
  mergeRepositoryAuthorityIntoWorkflowData,
} from "../documents/repositoryAuthority";

export interface ImplementerReportResult {
  markdownPath: string;
}

export interface WorkCardImplementerReportContext {
  phaseId: string;
  workCardId: string;
  workCardTitle: string;
  formalWorkCardPath: string;
  formalWorkCardRevision: number;
  implementationContractType: "formal-work-card" | "repair-work-card";
  implementationContractLabel: string;
  parentWorkCardId?: string;
  repairId?: string;
  implementerReportPath: string;
  existingReport?: PlanningDocumentSummary;
}

export type ImplementerReportReadiness =
  | "missing"
  | "reserved-skeleton"
  | "ready-for-review"
  | "invalid"
  | "conflict";

export interface ImplementerReportReadinessClassification {
  reportReadiness: ImplementerReportReadiness;
  reportReadinessReason: string;
  report?: PlanningDocumentSummary;
}

export interface WorkCardImplementerReportProjection {
  phaseId: string;
  workCardId: string;
  workCardTitle: string;
  formalWorkCardPath: string;
  formalWorkCardRevision: number;
  implementationContractType?: "formal-work-card" | "repair-work-card";
  implementationContractLabel?: string;
  parentWorkCardId?: string;
  repairId?: string;
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
  reportReadiness: ImplementerReportReadiness;
  reportReadinessReason: string;
}

export interface ResolveWorkCardReportContextInput {
  phaseId: string;
  workCardId: string;
  formalWorkCardPath?: string;
  formalWorkCardRevision?: number;
  workCardTitle?: string;
  implementationContractType?: "formal-work-card" | "repair-work-card";
  parentWorkCardId?: string;
  repairId?: string;
}

export function resolveWorkCardImplementerReportContext(
  workspaceRoot: string,
  input: ResolveWorkCardReportContextInput,
): WorkCardImplementerReportContext {
  const documents = listPlanningDocuments(workspaceRoot);
  const implementationContractType =
    input.implementationContractType ??
    (/-REPAIR\d+$/i.test(input.workCardId) ? "repair-work-card" : "formal-work-card");
  const formal = findImplementationContract(documents, {
    ...input,
    implementationContractType,
  });
  const formalWorkCardPath = input.formalWorkCardPath ?? formal?.markdownPath;
  if (!formalWorkCardPath) {
    throw new Error("Current Approved Work Card Contract path is required to resolve the Implementer Report target.");
  }
  const formalWorkCardRevision =
    input.formalWorkCardRevision ??
    formal?.metadata.artifactRevision ??
    readCanonicalRevisionIfPresent(workspaceRoot, formalWorkCardPath) ??
    1;
  const workCardTitle =
    nonEmpty(input.workCardTitle) ??
    workCardTitleFromContract(formal) ??
    titleFromFormalPath(formalWorkCardPath, input.workCardId);
  const repairId = input.repairId ?? (implementationContractType === "repair-work-card" ? input.workCardId : undefined);
  const parentWorkCardId = input.parentWorkCardId ?? stringValue(formal?.metadata.canonical?.identity.parentWorkCardId) ??
    stringValue(formal?.metadata.canonical?.workflowData.parentWorkCardId) ??
    stringValue(formal?.metadata.canonical?.workflowData.originalParentWorkCardId);
  const implementerReportPath = implementerReportPathForContract({
    phaseId: input.phaseId,
    workCardId: input.workCardId,
    formalWorkCardPath,
    implementationContractType,
  });
  const existingReport = documents.find((document) => document.markdownPath === implementerReportPath);
  return {
    phaseId: input.phaseId,
    workCardId: input.workCardId,
    workCardTitle,
    formalWorkCardPath,
    formalWorkCardRevision,
    implementationContractType,
    implementationContractLabel: implementationContractType === "repair-work-card"
      ? "Approved Repair Work Card Contract"
      : "Approved Formal Work Card",
    parentWorkCardId,
    repairId,
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

export function buildApprovedRepairWorkCardAndReportDocuments(input: {
  workspaceRoot: string;
  repairWorkCardPath: string;
  approvedStatus: DocumentDispositionStatus;
  notes: string;
  reviewedAt: string;
}): Array<Parameters<typeof writeCanonicalMarkdownDocuments>[0][number]> {
  const existingRepair = readCanonical(input.workspaceRoot, input.repairWorkCardPath);
  const phaseId = stringValue(existingRepair.metadata.identity.phaseId);
  const repairId = stringValue(existingRepair.metadata.identity.repairId) ??
    stringValue(existingRepair.metadata.identity.workCardId);
  const parentWorkCardId = stringValue(existingRepair.metadata.identity.parentWorkCardId) ??
    stringValue(existingRepair.metadata.workflowData.parentWorkCardId) ??
    stringValue(existingRepair.metadata.workflowData.originalParentWorkCardId);
  if (!phaseId || !repairId || !parentWorkCardId) {
    throw new Error("Repair Work Card approval requires phase, repair, and parent Work Card identity.");
  }
  const repairRevision = existingRepair.metadata.artifactRevision ?? 1;
  const context = resolveWorkCardImplementerReportContext(input.workspaceRoot, {
    phaseId,
    workCardId: repairId,
    formalWorkCardPath: input.repairWorkCardPath,
    formalWorkCardRevision: repairRevision,
    workCardTitle: titleFromFormalMetadata(existingRepair.metadata) ?? repairId,
    implementationContractType: "repair-work-card",
    parentWorkCardId,
    repairId,
  });
  ensureNoConflictingReport(input.workspaceRoot, context);
  const documents: Array<Parameters<typeof writeCanonicalMarkdownDocuments>[0][number]> = [{
    workspaceRoot: input.workspaceRoot,
    relativePath: input.repairWorkCardPath,
    metadata: metadataWithDisposition(
      existingRepair.metadata,
      input.approvedStatus,
      input.notes,
      input.reviewedAt,
    ),
    bodyMarkdown: existingRepair.bodyMarkdown,
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
  const readiness = classifyExpectedImplementerReportReadiness(workspaceRoot, context);
  const freshness = report?.documentReadState === "readable"
    ? evaluateDocumentFreshness(workspaceRoot, report.logicalDocumentId).state
    : undefined;
  return {
    phaseId: context.phaseId,
    workCardId: context.workCardId,
    workCardTitle: context.workCardTitle,
    formalWorkCardPath: context.formalWorkCardPath,
    formalWorkCardRevision: context.formalWorkCardRevision,
    implementationContractType: context.implementationContractType,
    implementationContractLabel: context.implementationContractLabel,
    parentWorkCardId: context.parentWorkCardId,
    repairId: context.repairId,
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
    reportReadiness: readiness.reportReadiness,
    reportReadinessReason: readiness.reportReadinessReason,
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
  const readiness = classifyExpectedImplementerReportReadiness(workspaceRoot, context);
  if (readiness.reportReadiness !== "ready-for-review" || !readiness.report) {
    return {
      eligible: false,
      repairRequired: false,
      reason: readiness.reportReadinessReason,
    };
  }
  const report = readiness.report;
  const eligible = report.effectiveDisposition === "Approved";
  return {
    eligible,
    repairRequired: report.effectiveDisposition === "RevisionRequested",
    reason: eligible
      ? "Approved current Implementer Report is ready for Operator validation."
      : "Operator validation requires an Approved Implementer Report.",
  };
}

export function classifyExpectedImplementerReportReadiness(
  workspaceRoot: string,
  context: WorkCardImplementerReportContext,
): ImplementerReportReadinessClassification {
  const conflicts = findConflictingReports(workspaceRoot, context);
  if (conflicts.length > 0) {
    return {
      reportReadiness: "conflict",
      reportReadinessReason: `Conflicting Implementer Report target exists: ${conflicts[0].markdownPath}`,
      report: context.existingReport,
    };
  }

  const report = context.existingReport;
  if (!report) {
    return {
      reportReadiness: "missing",
      reportReadinessReason: `Implementer Report is missing at the expected target: ${context.implementerReportPath}`,
    };
  }
  if (report.documentReadState !== "readable" || report.readError) {
    return {
      reportReadiness: "invalid",
      reportReadinessReason: report.readError ?? "Expected Implementer Report is not readable.",
      report,
    };
  }
  const metadata = report.metadata.canonical;
  if (!metadata) {
    return {
      reportReadiness: "invalid",
      reportReadinessReason: "Expected Implementer Report is not canonical.",
      report,
    };
  }
  if (
    metadata.artifactType !== "implementer-report" ||
    metadata.participationRole !== "gatingReview" ||
    metadata.identity.phaseId !== context.phaseId ||
    metadata.identity.workCardId !== context.workCardId
  ) {
    return {
      reportReadiness: "invalid",
      reportReadinessReason: `Expected Implementer Report identity does not match the ${context.implementationContractLabel}.`,
      report,
    };
  }
  if (
    context.repairId &&
    (
      metadata.identity.repairId !== context.repairId ||
      metadata.identity.parentWorkCardId !== context.parentWorkCardId
    )
  ) {
    return {
      reportReadiness: "invalid",
      reportReadinessReason: "Expected Implementer Report repair identity does not match the approved Repair Work Card.",
      report,
    };
  }
  const expectedSource = [{ path: context.formalWorkCardPath, revision: context.formalWorkCardRevision }];
  if (JSON.stringify(metadata.sourceRevisions ?? []) !== JSON.stringify(expectedSource)) {
    return {
      reportReadiness: "invalid",
      reportReadinessReason: `Expected Implementer Report source revision does not match the ${context.implementationContractLabel}.`,
      report,
    };
  }
  const freshness = evaluateDocumentFreshness(workspaceRoot, report.logicalDocumentId);
  if (freshness.state !== "fresh") {
    return {
      reportReadiness: "invalid",
      reportReadinessReason: "Expected Implementer Report is stale.",
      report,
    };
  }
  if (!["Pending", "Approved"].includes(report.effectiveDisposition)) {
    return {
      reportReadiness: "invalid",
      reportReadinessReason: "Expected Implementer Report disposition is not reviewable.",
      report,
    };
  }

  const bodyMarkdown = readCanonical(workspaceRoot, context.implementerReportPath).bodyMarkdown;
  if (isReservedSkeletonImplementerReport(metadata, bodyMarkdown)) {
    return {
      reportReadiness: "reserved-skeleton",
      reportReadinessReason: "Expected Implementer Report is only the reserved scaffold and does not contain substantive Implementer evidence.",
      report,
    };
  }
  if (!hasSubstantiveImplementerEvidence(metadata.workflowData, bodyMarkdown)) {
    return {
      reportReadiness: "reserved-skeleton",
      reportReadinessReason: "Expected Implementer Report contains only headings or placeholders, not substantive Implementer evidence.",
      report,
    };
  }

  return {
    reportReadiness: "ready-for-review",
    reportReadinessReason: "Expected Implementer Report is readable, fresh, identity-matching, source-matching, and contains substantive Implementer evidence.",
    report,
  };
}

export function requireReadyImplementerReportForReview(
  workspaceRoot: string,
  phaseId: string,
  workCardId: string,
): PlanningDocumentSummary {
  const context = resolveApprovedReportContext(workspaceRoot, phaseId, workCardId);
  const readiness = classifyExpectedImplementerReportReadiness(workspaceRoot, context);
  if (readiness.reportReadiness !== "ready-for-review" || !readiness.report) {
    throw new Error(readiness.reportReadinessReason);
  }
  return readiness.report;
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
  const implementationContractType = /-REPAIR\d+$/i.test(workCardId) ? "repair-work-card" : "formal-work-card";
  const formal = requiredApprovedImplementationContract(workspaceRoot, phaseId, workCardId, implementationContractType);
  return resolveWorkCardImplementerReportContext(workspaceRoot, {
    phaseId,
    workCardId,
    formalWorkCardPath: formal.markdownPath,
    formalWorkCardRevision: formal.metadata.artifactRevision ?? 1,
    implementationContractType,
  });
}

function buildImplementerReportDocument(
  workspaceRoot: string,
  context: WorkCardImplementerReportContext,
): Parameters<typeof writeCanonicalMarkdownDocuments>[0][number] {
  const sourceRevisions = [{
    path: context.formalWorkCardPath,
    revision: context.formalWorkCardRevision,
  }];
  const workflowData = mergeRepositoryAuthorityIntoWorkflowData({
    repositoryVerification: "Pending Implementer verification.",
    filesChanged: [],
    implementationSummary: "",
    validationResults: [],
    acceptanceEvidence: [],
    deviations: [],
    blockers: [],
    remainingOperatorValidation: [],
  }, inheritRepositoryAuthorityFromSourceRevisions(workspaceRoot, sourceRevisions));
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
        ...(context.repairId ? { repairId: context.repairId } : {}),
        ...(context.parentWorkCardId ? { parentWorkCardId: context.parentWorkCardId } : {}),
      },
      sourceRevisions,
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
    `${context.implementationContractLabel}: ${context.formalWorkCardPath} revision ${context.formalWorkCardRevision}`,
    ...(context.parentWorkCardId ? [`Parent Work Card: ${context.parentWorkCardId}`] : []),
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
    throw new Error(`Existing Implementer Report identity conflicts with the ${context.implementationContractLabel}.`);
  }
  if (
    context.repairId &&
    (
      metadata.identity.repairId !== context.repairId ||
      metadata.identity.parentWorkCardId !== context.parentWorkCardId
    )
  ) {
    throw new Error("Existing Implementer Report repair identity conflicts with the approved Repair Work Card.");
  }
  const expectedSource = [{ path: context.formalWorkCardPath, revision: context.formalWorkCardRevision }];
  if (JSON.stringify(metadata.sourceRevisions ?? []) !== JSON.stringify(expectedSource)) {
    throw new Error(`Existing Implementer Report source revision conflicts with the ${context.implementationContractLabel}.`);
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
  const conflicts = findConflictingReports(workspaceRoot, context);
  if (conflicts.length > 0) {
    throw new Error(`Conflicting Implementer Report target exists: ${conflicts[0].markdownPath}`);
  }
}

function findConflictingReports(
  workspaceRoot: string,
  context: WorkCardImplementerReportContext,
): PlanningDocumentSummary[] {
  return listPlanningDocuments(workspaceRoot)
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
}

function isReservedSkeletonImplementerReport(
  metadata: CanonicalDocumentMetadata,
  bodyMarkdown: string,
): boolean {
  const workflowData = metadata.workflowData;
  const metadataHasSkeletonMarkers =
    workflowData.repositoryVerification === "Pending Implementer verification." &&
    isEmptyArray(workflowData.filesChanged) &&
    isEmptyArray(workflowData.validationResults) &&
    isEmptyArray(workflowData.acceptanceEvidence) &&
    !nonEmpty(workflowData.implementationSummary);
  const bodyHasGeneratedStatus = bodyMarkdown.includes("Status: Pending Implementer completion.");
  const bodyHasEvidence = hasSubstantiveBodyEvidence(bodyMarkdown);

  return (
    (metadataHasSkeletonMarkers && bodyHasGeneratedStatus) ||
    (metadataHasSkeletonMarkers && !bodyHasEvidence) ||
    (bodyHasGeneratedStatus && !hasSubstantiveImplementerEvidence(workflowData, bodyMarkdown)) ||
    !hasSubstantiveImplementerEvidence(workflowData, bodyMarkdown)
  );
}

function hasSubstantiveImplementerEvidence(
  workflowData: Record<string, unknown>,
  bodyMarkdown: string,
): boolean {
  const repositoryVerification = nonEmpty(workflowData.repositoryVerification);
  return Boolean(
    (repositoryVerification && repositoryVerification !== "Pending Implementer verification.") ||
    nonEmpty(workflowData.implementationSummary) ||
    hasNonEmptyArray(workflowData.filesChanged) ||
    hasNonEmptyArray(workflowData.validationResults) ||
    hasNonEmptyArray(workflowData.acceptanceEvidence) ||
    hasSubstantiveBodyEvidence(bodyMarkdown),
  );
}

function hasSubstantiveBodyEvidence(bodyMarkdown: string): boolean {
  const boilerplate = new Set([
    "Status: Pending Implementer completion.",
  ]);
  const substantiveLines = bodyMarkdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("#"))
    .filter((line) => !line.startsWith("Approved Formal Work Card:"))
    .filter((line) => !line.startsWith("Approved Repair Work Card Contract:"))
    .filter((line) => !line.startsWith("Parent Work Card:"))
    .filter((line) => !line.startsWith("Report target:"))
    .filter((line) => !boilerplate.has(line));
  return substantiveLines.length > 0;
}

function hasNonEmptyArray(value: unknown): boolean {
  return Array.isArray(value) && value.some((entry) => {
    if (typeof entry === "string") {
      return Boolean(entry.trim());
    }
    return Boolean(entry && typeof entry === "object" && !Array.isArray(entry));
  });
}

function isEmptyArray(value: unknown): boolean {
  return Array.isArray(value) && value.length === 0;
}

function requiredApprovedImplementationContract(
  workspaceRoot: string,
  phaseId: string,
  workCardId: string,
  implementationContractType: "formal-work-card" | "repair-work-card",
): PlanningDocumentSummary {
  const formal = findImplementationContract(listPlanningDocuments(workspaceRoot), {
    phaseId,
    workCardId,
    implementationContractType,
  });
  if (!formal) {
    throw new Error(`Approved Work Card Contract document is missing: planning/phases/${phaseId}/Work_Cards/${workCardId}`);
  }
  if (formal.documentReadState !== "readable" || formal.readError) {
    throw new Error(formal.readError ?? "Work Card Contract is not readable.");
  }
  if (formal.effectiveDisposition !== "Approved") {
    throw new Error("Current Approved Work Card Contract is required for Implementer Report registration.");
  }
  if (evaluateDocumentFreshness(workspaceRoot, formal.logicalDocumentId).state === "stale") {
    throw new Error("Current Work Card Contract is stale.");
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

function findImplementationContract(
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
    .filter((document) => document.metadata.artifactType === input.implementationContractType)
    .filter((document) => document.metadata.phaseId === input.phaseId || document.metadata.canonical?.identity.phaseId === input.phaseId)
    .filter((document) => document.metadata.workCardId === input.workCardId || document.metadata.canonical?.identity.workCardId === input.workCardId)
    .at(-1);
}

function implementerReportPathForContract(input: {
  phaseId: string;
  workCardId: string;
  formalWorkCardPath: string;
  implementationContractType: "formal-work-card" | "repair-work-card";
}): string {
  if (input.implementationContractType === "repair-work-card") {
    return `planning/phases/${input.phaseId}/Implementer_Reports/IMPLEMENTER_REPORT_${input.workCardId}.md`;
  }
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

function workCardTitleFromContract(formal?: PlanningDocumentSummary): string | undefined {
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
