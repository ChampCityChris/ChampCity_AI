import fs from "node:fs";
import path from "node:path";
import type { DocumentDispositionStatus } from "../../shared/documents/documentDisposition";
import type { PlanningDocumentSummary } from "../../shared/documents/planningDocument";
import {
  evaluateDocumentFreshness,
  listPlanningDocuments,
  savePlanningDocumentRevision,
  setDocumentDisposition,
} from "../documents/planningDocumentService";
import { writeArtifactTransaction } from "../documents/artifactTransaction";

export interface FormalWorkCardResult {
  phaseId: string;
  workCardId: string;
  markdownPath: string;
  jsonPath: string;
}

export interface WorkCardBuildingEligibility {
  eligible: boolean;
  reason: string;
}

export function createFormalWorkCardFromIntakeHandoff(
  workspaceRoot: string,
  phaseId: string,
  workCardId: string,
): FormalWorkCardResult {
  const handoff = requiredApproved(
    workspaceRoot,
    `planning/phases/${phaseId}/Architect_Handoffs/WORK_CARD_INTAKE_ARCHITECT_HANDOFF_${workCardId}`,
    ".json",
  );
  const handoffJson = JSON.parse(fs.readFileSync(path.join(workspaceRoot, handoff.jsonPath!), "utf8"));
  const target = handoffJson.outputTargets?.formalWorkCard;
  if (!target || typeof target.markdown !== "string" || typeof target.json !== "string") {
    throw new Error("Work Card Intake handoff must name one Formal Work Card target.");
  }
  const candidate = handoffJson.candidate ?? {};
  const sourceRevisions = [
    ...(Array.isArray(handoffJson.sourceRevisions) ? handoffJson.sourceRevisions : []),
    { path: handoff.jsonPath!, revision: handoff.metadata.artifactRevision ?? 1 },
  ];
  const artifact = {
    artifactType: "formal-work-card",
    artifactRevision: 1,
    participationRole: "gatingReview",
    phaseId,
    workCardId,
    candidateId: workCardId,
    title: candidate.title ?? workCardId,
    sourceRevisions,
    implementationContract: {
      scope: "Architect-authored implementation scope required before approval.",
      nonScope: "No out-of-scope implementation is authorized.",
      risks: [],
      authorizedFilesAndTests: [],
      acceptanceCriteria: [],
      validationExpectations: ["npm run typecheck", "npm run build", "npm test"],
      implementerInstructions: "Implement only this approved Formal Work Card.",
      requiredReportContract: "Write the required Implementer Report for this Work Card.",
      manualValidation: "Operator manual validation remains required after implementation.",
    },
    returnToPhasePlanningOnRejected: true,
    documentDisposition: { status: "Pending" },
  };

  writeFiles(workspaceRoot, [
    [target.markdown, renderFormalWorkCardMarkdown(artifact)],
    [target.json, json(artifact)],
  ]);

  return {
    phaseId,
    workCardId,
    markdownPath: target.markdown,
    jsonPath: target.json,
  };
}

export function setFormalWorkCardDisposition(
  workspaceRoot: string,
  phaseId: string,
  workCardId: string,
  status: DocumentDispositionStatus,
): PlanningDocumentSummary {
  const formal = requiredAny(workspaceRoot, `planning/phases/${phaseId}/Work_Cards/${workCardId}`, ".json");
  return setDocumentDisposition(workspaceRoot, formal.logicalDocumentId, status);
}

export function getWorkCardBuildingEligibility(
  workspaceRoot: string,
  phaseId: string,
  workCardId: string,
): WorkCardBuildingEligibility {
  const formal = findByPrefix(workspaceRoot, `planning/phases/${phaseId}/Work_Cards/${workCardId}`, ".json");
  if (!formal) {
    return { eligible: false, reason: "Formal Work Card is required." };
  }
  const freshness = evaluateDocumentFreshness(workspaceRoot, formal.logicalDocumentId);
  const eligible =
    formal.effectiveDisposition === "Approved" &&
    formal.synchronizationState === "synchronized" &&
    freshness.state === "fresh";
  if (eligible) {
    return { eligible: true, reason: "Approved Formal Work Card is the Work Card Building instruction." };
  }
  if (formal.effectiveDisposition === "Rejected") {
    return { eligible: false, reason: "Rejected Formal Work Card must return to Phase Planning bundle revision." };
  }
  return { eligible: false, reason: "Work Card Building requires a synchronized, fresh, Approved Formal Work Card." };
}

export function reviseFormalWorkCard(
  workspaceRoot: string,
  phaseId: string,
  workCardId: string,
): void {
  const formal = requiredAny(workspaceRoot, `planning/phases/${phaseId}/Work_Cards/${workCardId}`, ".json");
  savePlanningDocumentRevision(workspaceRoot, formal.logicalDocumentId);
}

function requiredApproved(workspaceRoot: string, prefix: string, extension: ".json") {
  const document = requiredAny(workspaceRoot, prefix, extension);
  if (document.effectiveDisposition !== "Approved") {
    throw new Error(`Current Approved input is required: ${prefix}`);
  }
  if (evaluateDocumentFreshness(workspaceRoot, document.logicalDocumentId).state === "stale") {
    throw new Error(`Current input is stale: ${prefix}`);
  }
  if (!document.jsonPath) {
    throw new Error(`JSON input is required: ${prefix}`);
  }
  return document;
}

function requiredAny(workspaceRoot: string, prefix: string, extension: ".json") {
  const document = findByPrefix(workspaceRoot, prefix, extension);
  if (!document) {
    throw new Error(`Formal Work Card document is missing: ${prefix}`);
  }
  return document;
}

function findByPrefix(workspaceRoot: string, prefix: string, extension: ".json") {
  return listPlanningDocuments(workspaceRoot)
    .filter((document) => (document.jsonPath ?? document.markdownPath ?? "").startsWith(prefix))
    .filter((document) => (document.jsonPath ?? document.markdownPath ?? "").endsWith(extension))
    .at(-1);
}

function renderFormalWorkCardMarkdown(artifact: any): string {
  return [
    `# Formal Work Card - ${artifact.workCardId}`,
    `Artifact.Revision=${artifact.artifactRevision}`,
    "participationRole=gatingReview",
    `phaseId=${artifact.phaseId}`,
    `workCardId=${artifact.workCardId}`,
    `candidateId=${artifact.candidateId}`,
    "",
    "## Source Revisions",
    ...artifact.sourceRevisions.map((source: { path: string; revision: number }) => `- path: ${source.path} revision: ${source.revision}`),
    "",
    "## Implementation Contract",
    "Scope, non-scope, risks, authorized files/tests, acceptance criteria, validation expectations, Implementer instructions, report contract, and manual validation are required before approval.",
    "",
    "## Document Disposition",
    "",
    "Document.Status=Pending",
    "",
  ].join("\n");
}

function writeFiles(workspaceRoot: string, entries: Array<[relativePath: string, content: string]>): void {
  writeArtifactTransaction(
    workspaceRoot,
    entries.map(([relativePath, content]) => ({ relativePath, content })),
  );
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
