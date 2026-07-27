import type { DocumentDispositionStatus } from "../../shared/documents/documentDisposition";
import { evaluateDocumentFreshness, listPlanningDocuments, setDocumentDisposition } from "../documents/planningDocumentService";
import { writeCanonicalMarkdownDocument } from "../documents/canonicalMarkdownDocumentWriter";

export interface ValidationAttemptResult {
  attemptNumber: number;
  markdownPath: string;
}

export function createValidationAttempt(workspaceRoot: string, phaseId: string, workCardId: string): ValidationAttemptResult {
  const workCard = requiredApproved(workspaceRoot, `planning/phases/${phaseId}/Work_Cards/${workCardId}`, ".md");
  const report = latestApprovedReport(workspaceRoot, phaseId, workCardId);
  const attemptNumber = nextAttemptNumber(workspaceRoot, phaseId, workCardId);
  const stem = `VALIDATION_RECORD_${workCardId}_ATTEMPT${String(attemptNumber).padStart(2, "0")}`;
  const markdownPath = `planning/phases/${phaseId}/Validation_Records/${stem}.md`;
  const content = {
    guidance: "Operator-started validation attempt.",
    stepsPerformed: [],
    observations: [],
    evidence: [],
    issues: [],
    operatorNotes: "",
  };
  writeCanonicalMarkdownDocument({
    workspaceRoot,
    relativePath: markdownPath,
    metadata: {
      schemaVersion: 1,
      artifactType: "validation-record",
      artifactRevision: 1,
      participationRole: "gatingReview",
      identity: { phaseId, workCardId, candidateId: workCardId, attemptNumber },
      sourceRevisions: [
        { path: workCard.markdownPath, revision: workCard.metadata.artifactRevision ?? 1 },
        { path: report.markdownPath, revision: report.metadata.artifactRevision ?? 1 },
      ],
      workflowData: content,
      documentDisposition: { status: "Pending", notes: "", reviewedAt: null },
    },
    bodyMarkdown: `# Validation Record - ${workCardId} Attempt ${attemptNumber}\n\nOperator-started validation attempt.\n`,
  });
  return { attemptNumber, markdownPath };
}

export function setValidationRecordDisposition(workspaceRoot: string, phaseId: string, workCardId: string, status: DocumentDispositionStatus) {
  const record = latestValidationRecord(workspaceRoot, phaseId, workCardId);
  if (!record) throw new Error("Validation Record is required.");
  return setDocumentDisposition(workspaceRoot, record.logicalDocumentId, status);
}

export function getWorkCardCloseProjection(workspaceRoot: string, phaseId: string, workCardId: string) {
  const record = latestValidationRecord(workspaceRoot, phaseId, workCardId);
  if (!record) return { closed: false, returnTarget: "work-card-validation", reason: "Approved current Validation Record is required." };
  const freshness = evaluateDocumentFreshness(workspaceRoot, record.logicalDocumentId);
  const closed = record.effectiveDisposition === "Approved" && record.documentReadState === "readable" && freshness.state === "fresh";
  return {
    closed,
    returnTarget: closed ? "phase-work-card-selection" : "work-card-validation",
    reason: closed
      ? "Current Approved Validation Record closes the Work Card."
      : "Work Card close requires a current, readable, Approved Validation Record.",
  };
}

function latestApprovedReport(workspaceRoot: string, phaseId: string, workCardId: string) {
  const report = listPlanningDocuments(workspaceRoot)
    .filter((document) => document.markdownPath.startsWith(`planning/phases/${phaseId}/Implementer_Reports/IMPLEMENTER_REPORT_${workCardId}`))
    .filter((document) => document.effectiveDisposition === "Approved")
    .at(-1);
  if (!report) throw new Error("Current Approved implementation or repair report is required.");
  if (evaluateDocumentFreshness(workspaceRoot, report.logicalDocumentId).state === "stale") throw new Error("Implementation report is stale.");
  return report;
}

function requiredApproved(workspaceRoot: string, prefix: string, extension: ".md") {
  const document = listPlanningDocuments(workspaceRoot).filter((candidate) => candidate.markdownPath.startsWith(prefix)).filter((candidate) => candidate.markdownPath.endsWith(extension)).at(-1);
  if (!document || document.effectiveDisposition !== "Approved") throw new Error(`Current Approved input is required: ${prefix}`);
  if (evaluateDocumentFreshness(workspaceRoot, document.logicalDocumentId).state === "stale") throw new Error(`Current input is stale: ${prefix}`);
  return document;
}

function latestValidationRecord(workspaceRoot: string, phaseId: string, workCardId: string) {
  return listPlanningDocuments(workspaceRoot)
    .filter((document) => document.markdownPath.startsWith(`planning/phases/${phaseId}/Validation_Records/VALIDATION_RECORD_${workCardId}_ATTEMPT`))
    .at(-1);
}

function nextAttemptNumber(workspaceRoot: string, phaseId: string, workCardId: string): number {
  return listPlanningDocuments(workspaceRoot)
    .filter((document) => document.markdownPath.startsWith(`planning/phases/${phaseId}/Validation_Records/VALIDATION_RECORD_${workCardId}_ATTEMPT`))
    .map((document) => Number(document.displayFilename.match(/ATTEMPT(\d+)/i)?.[1] ?? 0))
    .reduce((highest, value) => Math.max(highest, value), 0) + 1;
}
