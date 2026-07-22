import fs from "node:fs";
import path from "node:path";
import type { DocumentDispositionStatus } from "../../shared/documents/documentDisposition";
import {
  evaluateDocumentFreshness,
  listPlanningDocuments,
  savePlanningDocumentRevision,
  setDocumentDisposition,
} from "../documents/planningDocumentService";
import { getWorkCardBuildingEligibility } from "../workCardPlanning/workCardPlanningService";

export interface ImplementerReportResult {
  markdownPath: string;
  jsonPath: string;
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
  const formal = requiredApproved(workspaceRoot, `planning/phases/${phaseId}/Work_Cards/${workCardId}`, ".json");
  const slug = formal.displayFilename.replace(new RegExp(`^${workCardId}_?`, "i"), "") || "implementation";
  const markdownPath = `planning/phases/${phaseId}/Implementer_Reports/IMPLEMENTER_REPORT_${workCardId}_${slug}.md`;
  const jsonPath = `planning/phases/${phaseId}/Implementer_Reports/IMPLEMENTER_REPORT_${workCardId}_${slug}.json`;
  const sourceRevisions = [{ path: formal.jsonPath!, revision: formal.metadata.artifactRevision ?? 1 }];
  const artifact = {
    artifactType: "implementer-report",
    artifactRevision: 1,
    participationRole: "gatingReview",
    phaseId,
    workCardId,
    sourceRevisions,
    parentWorkCard: { path: formal.jsonPath, revision: formal.metadata.artifactRevision ?? 1 },
    repositoryVerification: "Pending Implementer verification.",
    filesChanged: [],
    implementationSummary: "",
    validationResults: [],
    acceptanceEvidence: [],
    deviations: [],
    blockers: [],
    remainingOperatorValidation: [],
    documentDisposition: { status: "Pending" },
  };
  writeFiles(workspaceRoot, [
    [markdownPath, renderReportMarkdown(artifact)],
    [jsonPath, json(artifact)],
  ]);
  return { markdownPath, jsonPath };
}

export function setImplementerReportDisposition(
  workspaceRoot: string,
  phaseId: string,
  workCardId: string,
  status: DocumentDispositionStatus,
) {
  const report = requiredAny(workspaceRoot, `planning/phases/${phaseId}/Implementer_Reports/IMPLEMENTER_REPORT_${workCardId}`, ".json");
  return setDocumentDisposition(workspaceRoot, report.logicalDocumentId, status);
}

export function getOperatorValidationEligibility(
  workspaceRoot: string,
  phaseId: string,
  workCardId: string,
) {
  const report = requiredAny(workspaceRoot, `planning/phases/${phaseId}/Implementer_Reports/IMPLEMENTER_REPORT_${workCardId}`, ".json");
  const freshness = evaluateDocumentFreshness(workspaceRoot, report.logicalDocumentId);
  const eligible =
    report.effectiveDisposition === "Approved" &&
    report.synchronizationState === "synchronized" &&
    freshness.state === "fresh";
  return {
    eligible,
    repairRequired: report.effectiveDisposition === "RevisionRequested",
    reason: eligible
      ? "Approved current Implementer Report is ready for Operator validation."
      : "Operator validation requires a synchronized, fresh, Approved Implementer Report.",
  };
}

export function reviseImplementerReport(workspaceRoot: string, phaseId: string, workCardId: string): void {
  const report = requiredAny(workspaceRoot, `planning/phases/${phaseId}/Implementer_Reports/IMPLEMENTER_REPORT_${workCardId}`, ".json");
  savePlanningDocumentRevision(workspaceRoot, report.logicalDocumentId);
}

function requiredApproved(workspaceRoot: string, prefix: string, extension: ".json") {
  const document = requiredAny(workspaceRoot, prefix, extension);
  if (document.effectiveDisposition !== "Approved") {
    throw new Error(`Current Approved input is required: ${prefix}`);
  }
  if (evaluateDocumentFreshness(workspaceRoot, document.logicalDocumentId).state === "stale") {
    throw new Error(`Current input is stale: ${prefix}`);
  }
  return document;
}

function requiredAny(workspaceRoot: string, prefix: string, extension: ".json") {
  const document = listPlanningDocuments(workspaceRoot)
    .filter((candidate) => (candidate.jsonPath ?? candidate.markdownPath ?? "").startsWith(prefix))
    .filter((candidate) => (candidate.jsonPath ?? candidate.markdownPath ?? "").endsWith(extension))
    .at(-1);
  if (!document) {
    throw new Error(`Implementer Report is missing: ${prefix}`);
  }
  return document;
}

function renderReportMarkdown(artifact: any): string {
  return [
    `# Implementer Report - ${artifact.workCardId}`,
    `Artifact.Revision=${artifact.artifactRevision}`,
    "participationRole=gatingReview",
    `phaseId=${artifact.phaseId}`,
    `workCardId=${artifact.workCardId}`,
    "",
    "## Source Revisions",
    ...artifact.sourceRevisions.map((source: { path: string; revision: number }) => `- path: ${source.path} revision: ${source.revision}`),
    "",
    "## Document Disposition",
    "",
    "Document.Status=Pending",
    "",
  ].join("\n");
}

function writeFiles(workspaceRoot: string, entries: Array<[relativePath: string, content: string]>): void {
  for (const [relativePath, content] of entries) {
    const absolutePath = path.join(workspaceRoot, relativePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, content, "utf8");
  }
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
