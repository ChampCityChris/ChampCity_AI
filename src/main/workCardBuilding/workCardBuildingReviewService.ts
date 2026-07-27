import type { DocumentDispositionStatus } from "../../shared/documents/documentDisposition";
import {
  evaluateDocumentFreshness,
  listPlanningDocuments,
  savePlanningDocumentRevision,
  setDocumentDisposition,
} from "../documents/planningDocumentService";
import { writeCanonicalMarkdownDocument } from "../documents/canonicalMarkdownDocumentWriter";
import { getWorkCardBuildingEligibility } from "../workCardPlanning/workCardPlanningService";

export interface ImplementerReportResult {
  markdownPath: string;
}

export function createImplementerReportForApprovedWorkCard(
  workspaceRoot: string,
  phaseId: string,
  workCardId: string,
): ImplementerReportResult {
  const eligibility = getWorkCardBuildingEligibility(workspaceRoot, phaseId, workCardId);
  if (!eligibility.eligible) {
    throw new Error("Current Approved Formal Work Card is required for Implementer handoff.");
  }
  const formal = requiredApproved(workspaceRoot, `planning/phases/${phaseId}/Work_Cards/${workCardId}`, ".md");
  const slug = formal.displayFilename.replace(new RegExp(`^${workCardId}_?`, "i"), "") || "implementation";
  const markdownPath = `planning/phases/${phaseId}/Implementer_Reports/IMPLEMENTER_REPORT_${workCardId}_${slug}.md`;
  const content = {
    repositoryVerification: "Pending Implementer verification.",
    filesChanged: [],
    implementationSummary: "",
    validationResults: [],
    acceptanceEvidence: [],
    deviations: [],
    blockers: [],
    remainingOperatorValidation: [],
  };
  writeCanonicalMarkdownDocument({
    workspaceRoot,
    relativePath: markdownPath,
    metadata: {
      schemaVersion: 1,
      artifactType: "implementer-report",
      artifactRevision: 1,
      participationRole: "gatingReview",
      identity: { phaseId, workCardId },
      sourceRevisions: [{ path: formal.markdownPath, revision: formal.metadata.artifactRevision ?? 1 }],
      workflowData: content,
      documentDisposition: { status: "Pending", notes: "", reviewedAt: null },
    },
    bodyMarkdown: `# Implementer Report - ${workCardId}\n\n`,
  });
  return { markdownPath };
}

export function setImplementerReportDisposition(
  workspaceRoot: string,
  phaseId: string,
  workCardId: string,
  status: DocumentDispositionStatus,
) {
  const report = requiredAny(workspaceRoot, `planning/phases/${phaseId}/Implementer_Reports/IMPLEMENTER_REPORT_${workCardId}`, ".md");
  return setDocumentDisposition(workspaceRoot, report.logicalDocumentId, status);
}

export function getOperatorValidationEligibility(
  workspaceRoot: string,
  phaseId: string,
  workCardId: string,
) {
  const report = requiredAny(workspaceRoot, `planning/phases/${phaseId}/Implementer_Reports/IMPLEMENTER_REPORT_${workCardId}`, ".md");
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
  const report = requiredAny(workspaceRoot, `planning/phases/${phaseId}/Implementer_Reports/IMPLEMENTER_REPORT_${workCardId}`, ".md");
  savePlanningDocumentRevision(workspaceRoot, report.logicalDocumentId);
}

function requiredApproved(workspaceRoot: string, prefix: string, extension: ".md") {
  const document = requiredAny(workspaceRoot, prefix, extension);
  if (document.effectiveDisposition !== "Approved") {
    throw new Error(`Current Approved input is required: ${prefix}`);
  }
  if (evaluateDocumentFreshness(workspaceRoot, document.logicalDocumentId).state === "stale") {
    throw new Error(`Current input is stale: ${prefix}`);
  }
  return document;
}

function requiredAny(workspaceRoot: string, prefix: string, extension: ".md") {
  const document = listPlanningDocuments(workspaceRoot)
    .filter((candidate) => candidate.markdownPath.startsWith(prefix))
    .filter((candidate) => candidate.markdownPath.endsWith(extension))
    .at(-1);
  if (!document) {
    throw new Error(`Implementer Report is missing: ${prefix}`);
  }
  return document;
}
