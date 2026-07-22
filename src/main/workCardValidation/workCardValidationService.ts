import fs from "node:fs";
import path from "node:path";
import type { DocumentDispositionStatus } from "../../shared/documents/documentDisposition";
import { evaluateDocumentFreshness, listPlanningDocuments, setDocumentDisposition } from "../documents/planningDocumentService";
import { writeArtifactTransaction } from "../documents/artifactTransaction";

export interface ValidationAttemptResult {
  attemptNumber: number;
  markdownPath: string;
  jsonPath: string;
}

export function createValidationAttempt(workspaceRoot: string, phaseId: string, workCardId: string): ValidationAttemptResult {
  const workCard = requiredApproved(workspaceRoot, `planning/phases/${phaseId}/Work_Cards/${workCardId}`, ".json");
  const report = latestApprovedReport(workspaceRoot, phaseId, workCardId);
  const attemptNumber = nextAttemptNumber(workspaceRoot, phaseId, workCardId);
  const stem = `VALIDATION_RECORD_${workCardId}_ATTEMPT${String(attemptNumber).padStart(2, "0")}`;
  const markdownPath = `planning/phases/${phaseId}/Validation_Records/${stem}.md`;
  const jsonPath = `planning/phases/${phaseId}/Validation_Records/${stem}.json`;
  const sourceRevisions = [
    { path: workCard.jsonPath!, revision: workCard.metadata.artifactRevision ?? 1 },
    { path: report.jsonPath!, revision: report.metadata.artifactRevision ?? 1 },
  ];
  const artifact = {
    artifactType: "validation-record",
    artifactRevision: 1,
    participationRole: "gatingReview",
    phaseId,
    workCardId,
    candidateId: workCardId,
    attemptNumber,
    parentWorkCard: { path: workCard.jsonPath, revision: workCard.metadata.artifactRevision ?? 1 },
    implementationReport: { path: report.jsonPath, revision: report.metadata.artifactRevision ?? 1 },
    guidance: "Operator-started validation attempt.",
    stepsPerformed: [],
    observations: [],
    evidence: [],
    issues: [],
    operatorNotes: "",
    sourceRevisions,
    documentDisposition: { status: "Pending" },
  };
  writeFiles(workspaceRoot, [[markdownPath, renderValidation(artifact)], [jsonPath, json(artifact)]]);
  return { attemptNumber, markdownPath, jsonPath };
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
  const closed = record.effectiveDisposition === "Approved" && record.synchronizationState === "synchronized" && freshness.state === "fresh";
  return {
    closed,
    returnTarget: closed ? "phase-work-card-selection" : "work-card-validation",
    reason: closed
      ? "Current Approved Validation Record closes the Work Card."
      : "Work Card close requires a current, synchronized, Approved Validation Record.",
  };
}

function latestApprovedReport(workspaceRoot: string, phaseId: string, workCardId: string) {
  const report = listPlanningDocuments(workspaceRoot)
    .filter((document) => (document.jsonPath ?? "").startsWith(`planning/phases/${phaseId}/Implementer_Reports/IMPLEMENTER_REPORT_${workCardId}`))
    .filter((document) => document.effectiveDisposition === "Approved")
    .at(-1);
  if (!report) throw new Error("Current Approved implementation or repair report is required.");
  if (evaluateDocumentFreshness(workspaceRoot, report.logicalDocumentId).state === "stale") throw new Error("Implementation report is stale.");
  return report;
}

function requiredApproved(workspaceRoot: string, prefix: string, extension: ".json") {
  const document = listPlanningDocuments(workspaceRoot).filter((candidate) => (candidate.jsonPath ?? "").startsWith(prefix)).filter((candidate) => (candidate.jsonPath ?? "").endsWith(extension)).at(-1);
  if (!document || document.effectiveDisposition !== "Approved") throw new Error(`Current Approved input is required: ${prefix}`);
  if (evaluateDocumentFreshness(workspaceRoot, document.logicalDocumentId).state === "stale") throw new Error(`Current input is stale: ${prefix}`);
  return document;
}

function latestValidationRecord(workspaceRoot: string, phaseId: string, workCardId: string) {
  return listPlanningDocuments(workspaceRoot)
    .filter((document) => (document.jsonPath ?? "").startsWith(`planning/phases/${phaseId}/Validation_Records/VALIDATION_RECORD_${workCardId}_ATTEMPT`))
    .at(-1);
}

function nextAttemptNumber(workspaceRoot: string, phaseId: string, workCardId: string): number {
  return listPlanningDocuments(workspaceRoot)
    .map((document) => document.displayFilename.match(new RegExp(`^VALIDATION_RECORD_${workCardId}_ATTEMPT(\\d+)`, "i"))?.[1])
    .filter((value): value is string => Boolean(value))
    .reduce((max, value) => Math.max(max, Number(value)), 0) + 1;
}

function renderValidation(artifact: any): string {
  return [`# Validation Record - ${artifact.workCardId} Attempt ${artifact.attemptNumber}`, "Artifact.Revision=1", "participationRole=gatingReview", `phaseId=${artifact.phaseId}`, `workCardId=${artifact.workCardId}`, "", "## Source Revisions", ...artifact.sourceRevisions.map((source: { path: string; revision: number }) => `- path: ${source.path} revision: ${source.revision}`), "", "## Document Disposition", "", "Document.Status=Pending", ""].join("\n");
}

function writeFiles(workspaceRoot: string, entries: Array<[string, string]>): void {
  writeArtifactTransaction(
    workspaceRoot,
    entries.map(([relativePath, content]) => ({ relativePath, content })),
  );
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
