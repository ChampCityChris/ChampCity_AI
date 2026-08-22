import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { CanonicalDocumentMetadata } from "../../shared/documents/canonicalMarkdown";
import type { DocumentDispositionStatus } from "../../shared/documents/documentDisposition";
import type { PlanningDocumentSummary, SourceRevision } from "../../shared/documents/planningDocument";
import { evaluateDocumentFreshness, listPlanningDocuments, setDocumentDisposition } from "../documents/planningDocumentService";
import { writeCanonicalMarkdownDocument } from "../documents/canonicalMarkdownDocumentWriter";
import { requireReadyImplementerReportForReview } from "../workCardBuilding/workCardBuildingReviewService";
import { buildMcpWorkspaceBindingPromptBlock } from "../integrations/mcpWorkspacePromptContract";
import {
  inheritRepositoryAuthorityFromSourceRevisions,
  mergeRepositoryAuthorityIntoWorkflowData,
} from "../documents/repositoryAuthority";

export interface ValidationAttemptResult {
  attemptNumber: number;
  markdownPath: string;
}

export type OperatorValidationDecision = "ValidatePassed" | "RequestRepair";

export interface OperatorValidationDecisionInput {
  decision: OperatorValidationDecision;
  operatorNotes: string;
  advisorySummary?: string;
  repairDefectText?: string;
}

export interface OperatorValidationDecisionResult {
  attemptNumber: number;
  markdownPath: string;
  status: "Approved" | "RevisionRequested";
  updatedExistingPendingRecord: boolean;
}

export interface AdvisoryPromptResult {
  instruction: string;
  formalWorkCardPath: string;
  formalWorkCardRevision: number;
  formalWorkCardSha256: string;
  implementerReportPath: string;
  implementerReportRevision: number;
  implementerReportSha256: string;
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
  const sourceRevisions = [
    { path: workCard.markdownPath, revision: workCard.metadata.artifactRevision ?? 1 },
    { path: report.markdownPath, revision: report.metadata.artifactRevision ?? 1 },
  ];
  writeCanonicalMarkdownDocument({
    workspaceRoot,
    relativePath: markdownPath,
    metadata: {
      schemaVersion: 1,
      artifactType: "validation-record",
      artifactRevision: 1,
      participationRole: "gatingReview",
      identity: { phaseId, workCardId, candidateId: workCardId, attemptNumber },
      sourceRevisions,
      workflowData: mergeRepositoryAuthorityIntoWorkflowData(
        content,
        inheritRepositoryAuthorityFromSourceRevisions(workspaceRoot, sourceRevisions),
      ),
      documentDisposition: { status: "Pending", notes: "", reviewedAt: null },
    },
    bodyMarkdown: `# Validation Record - ${workCardId} Attempt ${attemptNumber}\n\nOperator-started validation attempt.\n`,
  });
  return { attemptNumber, markdownPath };
}

export function buildAdvisoryArchitectReviewPrompt(
  workspaceRoot: string,
  phaseId: string,
  workCardId: string,
): AdvisoryPromptResult {
  const formal = currentApprovedFormalWorkCard(workspaceRoot, phaseId, workCardId);
  const report = currentImplementerReport(workspaceRoot, phaseId, workCardId);
  const reportFreshness = evaluateDocumentFreshness(workspaceRoot, report.logicalDocumentId);
  if (report.documentReadState !== "readable" || report.readError) {
    throw new Error(report.readError ?? "Current Implementer Report is not readable.");
  }
  if (reportFreshness.state !== "fresh") {
    throw new Error("Current Implementer Report is stale.");
  }
  const formalRevision = formal.metadata.artifactRevision ?? 1;
  const reportRevision = report.metadata.artifactRevision ?? 1;
  const changedFiles = changedFilesList(report.metadata.canonical?.workflowData.filesChanged);
  const formalSha256 = sha256RelativeFile(workspaceRoot, formal.markdownPath);
  const reportSha256 = sha256RelativeFile(workspaceRoot, report.markdownPath);
  const instruction = [
    ...buildMcpWorkspaceBindingPromptBlock(workspaceRoot),
    "",
    "This is an advisory Architect review for Operator decision support.",
    "You are not the disposition authority. Do not approve, reject, validate, or create repair artifacts.",
    "The Operator is the final authority and will choose Validate Passed or Request Repair.",
    "",
    "Read the exact Approved Formal Work Card:",
    `- path: ${formal.markdownPath}`,
    `- revision: ${formalRevision}`,
    `- sha256: ${formalSha256}`,
    "- read only from the bound workspaceId above",
    "",
    "Read the current Implementer Report:",
    `- path: ${report.markdownPath}`,
    `- revision: ${reportRevision}`,
    `- sha256: ${reportSha256}`,
    "- read only from the bound workspaceId above",
    "",
    "If either exact artifact path, revision, or sha256 fails verification in the bound workspace, stop with BLOCKED_WORKSPACE_OR_ARTIFACT_MISMATCH.",
    "Do not search other workspaces, switch workspace IDs, or treat a missing exact path in the bound workspace as proof of implementation absence.",
    "",
    "Inspect the implementation evidence named by the report, including changed files, tests, validation output, and any production path necessary to verify the Work Card.",
    "Changed files reported by the Implementer:",
    changedFiles,
    "",
    "Review standard:",
    "- The Approved Work Card defines the implementation contract.",
    "- The Implementer Report is evidence, not authority.",
    "- Passing tests are supporting evidence only.",
    "- Verify production behavior, preserved behavior, failure paths, and absence of unauthorized parallel mechanisms.",
    "- Distinguish verified repository evidence from Implementer claims and assumptions.",
    "",
    "Return an advisory review with exactly these sections:",
    `# Advisory Architect Review — ${workCardId}`,
    "## Evidence Inspected",
    "## Contract Alignment",
    "## Blocking Findings",
    "## Non-Blocking Concerns",
    "## Acceptance Criteria Assessment",
    "## Suggested Operator Decision",
    "## Suggested Repair Defect Text",
    "",
    "Suggested Operator Decision must be one of:",
    "- Validate Passed",
    "- Request Repair",
    "- Inconclusive",
    "",
    "Do not write repository files. Do not change dispositions. Do not create repair artifacts. End by reminding the Operator that final authority remains with the Operator.",
  ].join("\n");
  return {
    instruction,
    formalWorkCardPath: formal.markdownPath,
    formalWorkCardRevision: formalRevision,
    formalWorkCardSha256: formalSha256,
    implementerReportPath: report.markdownPath,
    implementerReportRevision: reportRevision,
    implementerReportSha256: reportSha256,
  };
}

export function applyOperatorValidationDecision(
  workspaceRoot: string,
  phaseId: string,
  workCardId: string,
  input: OperatorValidationDecisionInput,
): OperatorValidationDecisionResult {
  const workCard = currentApprovedFormalWorkCard(workspaceRoot, phaseId, workCardId);
  const report = currentImplementerReport(workspaceRoot, phaseId, workCardId);
  if (report.documentReadState !== "readable" || report.readError) {
    throw new Error(report.readError ?? "Current Implementer Report is not readable.");
  }
  if (evaluateDocumentFreshness(workspaceRoot, report.logicalDocumentId).state !== "fresh") {
    throw new Error("Current Implementer Report is stale.");
  }
  const status = statusForDecision(input.decision);
  const repairDefectText = input.repairDefectText?.trim() ?? "";
  if (input.decision === "RequestRepair" && !repairDefectText) {
    throw new Error("Repair defect text is required to request repair.");
  }
  const reportSource = { path: report.markdownPath, revision: report.metadata.artifactRevision ?? 1 };
  const existing = validationRecordForReportRevision(workspaceRoot, phaseId, workCardId, reportSource);
  if (existing && existing.effectiveDisposition !== "Pending") {
    throw new Error(`Validation decision already exists for this Implementer Report revision: ${existing.markdownPath}`);
  }
  const attemptNumber = existing
    ? attemptNumberFromValidationRecord(existing)
    : nextAttemptNumber(workspaceRoot, phaseId, workCardId);
  const markdownPath = existing?.markdownPath ??
    `planning/phases/${phaseId}/Validation_Records/VALIDATION_RECORD_${workCardId}_ATTEMPT${String(attemptNumber).padStart(2, "0")}.md`;
  const sourceRevisions = [
    { path: workCard.markdownPath, revision: workCard.metadata.artifactRevision ?? 1 },
    reportSource,
  ];
  const workflowData = validationWorkflowData(input, {
    decisionStatus: status,
    operatorNotes: input.operatorNotes,
    advisorySummary: input.advisorySummary ?? "",
    repairDefectText,
    formalWorkCardPath: workCard.markdownPath,
    implementerReportPath: report.markdownPath,
    implementerReportRevision: reportSource.revision,
  });
  const workflowDataWithAuthority = mergeRepositoryAuthorityIntoWorkflowData(
    workflowData,
    inheritRepositoryAuthorityFromSourceRevisions(workspaceRoot, sourceRevisions),
  );
  writeCanonicalMarkdownDocument({
    workspaceRoot,
    relativePath: markdownPath,
    metadata: validationMetadata({
      existing,
      phaseId,
      workCardId,
      attemptNumber,
      sourceRevisions,
      status,
      workflowData: workflowDataWithAuthority,
      dispositionNotes: dispositionNotesForValidation(input, repairDefectText),
    }),
    bodyMarkdown: validationBodyMarkdown({
      workCardId,
      attemptNumber,
      status,
      operatorNotes: input.operatorNotes,
      advisorySummary: input.advisorySummary ?? "",
      repairDefectText,
    }),
  });
  return {
    attemptNumber,
    markdownPath,
    status,
    updatedExistingPendingRecord: Boolean(existing),
  };
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
  const report = requireReadyImplementerReportForReview(workspaceRoot, phaseId, workCardId);
  if (report.effectiveDisposition !== "Approved") {
    throw new Error("Current Approved implementation or repair report is required.");
  }
  return report;
}

function currentApprovedFormalWorkCard(workspaceRoot: string, phaseId: string, workCardId: string): PlanningDocumentSummary {
  return requiredApproved(workspaceRoot, `planning/phases/${phaseId}/Work_Cards/${workCardId}`, ".md");
}

function currentImplementerReport(workspaceRoot: string, phaseId: string, workCardId: string): PlanningDocumentSummary {
  return requireReadyImplementerReportForReview(workspaceRoot, phaseId, workCardId);
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

function validationRecordForReportRevision(
  workspaceRoot: string,
  phaseId: string,
  workCardId: string,
  reportSource: SourceRevision,
): PlanningDocumentSummary | undefined {
  return listPlanningDocuments(workspaceRoot)
    .filter((document) => document.markdownPath.startsWith(`planning/phases/${phaseId}/Validation_Records/VALIDATION_RECORD_${workCardId}_ATTEMPT`))
    .filter((document) => document.metadata.artifactType === "validation-record")
    .find((document) => (document.metadata.sourceRevisions ?? []).some((source) =>
      source.path === reportSource.path && source.revision === reportSource.revision
    ));
}

function nextAttemptNumber(workspaceRoot: string, phaseId: string, workCardId: string): number {
  return listPlanningDocuments(workspaceRoot)
    .filter((document) => document.markdownPath.startsWith(`planning/phases/${phaseId}/Validation_Records/VALIDATION_RECORD_${workCardId}_ATTEMPT`))
    .map((document) => Number(document.displayFilename.match(/ATTEMPT(\d+)/i)?.[1] ?? 0))
    .reduce((highest, value) => Math.max(highest, value), 0) + 1;
}

function statusForDecision(decision: OperatorValidationDecision): "Approved" | "RevisionRequested" {
  switch (decision) {
    case "ValidatePassed":
      return "Approved";
    case "RequestRepair":
      return "RevisionRequested";
    default:
      throw new Error("Unsupported Operator validation decision.");
  }
}

function validationMetadata(input: {
  existing?: PlanningDocumentSummary;
  phaseId: string;
  workCardId: string;
  attemptNumber: number;
  sourceRevisions: SourceRevision[];
  status: "Approved" | "RevisionRequested";
  workflowData: Record<string, unknown>;
  dispositionNotes: string;
}): CanonicalDocumentMetadata {
  const existingMetadata = input.existing?.metadata.canonical;
  return {
    schemaVersion: 1,
    artifactType: "validation-record",
    artifactRevision: existingMetadata?.artifactRevision ?? 1,
    participationRole: "gatingReview",
    identity: {
      ...(existingMetadata?.identity ?? {}),
      phaseId: input.phaseId,
      workCardId: input.workCardId,
      candidateId: input.workCardId,
      attemptNumber: input.attemptNumber,
    },
    sourceRevisions: input.sourceRevisions,
    workflowData: input.workflowData,
    documentDisposition: {
      status: input.status,
      notes: input.dispositionNotes,
      reviewedAt: new Date().toISOString(),
    },
  };
}

function validationWorkflowData(
  input: OperatorValidationDecisionInput,
  context: {
    decisionStatus: "Approved" | "RevisionRequested";
    operatorNotes: string;
    advisorySummary: string;
    repairDefectText: string;
    formalWorkCardPath: string;
    implementerReportPath: string;
    implementerReportRevision: number;
  },
): Record<string, unknown> {
  return {
    decision: input.decision,
    validationStatus: context.decisionStatus,
    operatorValidationNotes: context.operatorNotes,
    advisorySummary: context.advisorySummary,
    repairDefectText: context.repairDefectText,
    formalWorkCardPath: context.formalWorkCardPath,
    implementerReportPath: context.implementerReportPath,
    implementerReportRevision: context.implementerReportRevision,
    architectReviewAuthority: "advisory-only",
    operatorDecisionCreatesAuthority: true,
  };
}

function validationBodyMarkdown(input: {
  workCardId: string;
  attemptNumber: number;
  status: "Approved" | "RevisionRequested";
  operatorNotes: string;
  advisorySummary: string;
  repairDefectText: string;
}): string {
  return [
    `# Validation Record - ${input.workCardId} Attempt ${input.attemptNumber}`,
    "",
    `Status: ${input.status}`,
    "",
    "Architect review is advisory. Operator decision creates the validation authority.",
    "",
    "## Operator Validation Notes",
    input.operatorNotes.trim() || "No Operator notes provided.",
    "",
    "## Advisory Summary",
    input.advisorySummary.trim() || "No advisory summary provided.",
    "",
    "## Repair Defect Text",
    input.repairDefectText.trim() || "Not applicable.",
    "",
  ].join("\n");
}

function dispositionNotesForValidation(input: OperatorValidationDecisionInput, repairDefectText: string): string {
  if (input.decision === "RequestRepair") {
    return repairDefectText;
  }
  return input.operatorNotes.trim() || "Operator validated passed.";
}

function changedFilesList(value: unknown): string {
  if (!Array.isArray(value) || value.length === 0) {
    return "- <none reported>";
  }
  const files = value
    .map((entry) => {
      if (typeof entry === "string") {
        return entry.trim();
      }
      if (entry && typeof entry === "object" && !Array.isArray(entry)) {
        const pathValue = (entry as Record<string, unknown>).path ?? (entry as Record<string, unknown>).file;
        return typeof pathValue === "string" ? pathValue.trim() : "";
      }
      return "";
    })
    .filter(Boolean);
  return files.length > 0 ? files.map((file) => `- ${file}`).join("\n") : "- <none reported>";
}

function sha256RelativeFile(workspaceRoot: string, relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/");
  if (!normalized.trim() || path.isAbsolute(normalized) || normalized.includes("..")) {
    throw new Error("SHA-256 source must be a repository-relative path.");
  }
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(path.join(path.resolve(workspaceRoot), normalized)))
    .digest("hex");
}

function attemptNumberFromValidationRecord(record: PlanningDocumentSummary): number {
  return Number(record.displayFilename.match(/ATTEMPT(\d+)/i)?.[1] ?? 0) || 1;
}
