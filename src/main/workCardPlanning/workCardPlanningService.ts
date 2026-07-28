import fs from "node:fs";
import path from "node:path";
import {
  type CanonicalDocumentMetadata,
  metadataCloseDelimiter,
  metadataOpenDelimiter,
  parseCanonicalMarkdownDocument,
} from "../../shared/documents/canonicalMarkdown";
import type { DocumentDispositionStatus } from "../../shared/documents/documentDisposition";
import type { PlanningDocumentSummary, SourceRevision } from "../../shared/documents/planningDocument";
import {
  evaluateDocumentFreshness,
  listPlanningDocuments,
  savePlanningDocumentRevision,
  setDocumentDisposition,
} from "../documents/planningDocumentService";
import { writeCanonicalMarkdownDocument } from "../documents/canonicalMarkdownDocumentWriter";

export interface FormalWorkCardResult {
  phaseId: string;
  workCardId: string;
  formalWorkCardMarkdownPath: string;
}

export interface WorkCardBuildingEligibility {
  eligible: boolean;
  reason: string;
}

export function saveFormalWorkCardOutput(
  workspaceRoot: string,
  markdownBody: string,
): FormalWorkCardResult {
  const bodyMarkdown = substantiveMarkdown(markdownBody, "Formal Work Card");
  const handoff = requiredApprovedHandoff(workspaceRoot);
  const workflowData = handoff.metadata.canonical?.workflowData ?? {};
  const candidate = candidateFromHandoff(workflowData.candidate);
  const phaseId = candidate.phaseId;
  const candidateId = candidate.candidateId;
  const workCardId = typeof handoff.metadata.canonical?.identity.workCardId === "string"
    ? handoff.metadata.canonical.identity.workCardId
    : candidateId;
  const formalWorkCardMarkdownPath = formalWorkCardTargetFromHandoff(handoff);
  const sourceRevisions = sourceRevisionsFromHandoff(handoff);

  writeCanonicalMarkdownDocument({
    workspaceRoot,
    relativePath: formalWorkCardMarkdownPath,
    metadata: outputMetadata({
      workspaceRoot,
      relativePath: formalWorkCardMarkdownPath,
      phaseId,
      workCardId,
      candidateId,
      candidate,
      sourceRevisions,
    }),
    bodyMarkdown,
  });

  return {
    phaseId,
    workCardId,
    formalWorkCardMarkdownPath,
  };
}

export function setFormalWorkCardDisposition(
  workspaceRoot: string,
  phaseId: string,
  workCardId: string,
  status: DocumentDispositionStatus,
): PlanningDocumentSummary {
  const formal = requiredAny(workspaceRoot, `planning/phases/${phaseId}/Work_Cards/${workCardId}`, ".md");
  return setDocumentDisposition(workspaceRoot, formal.logicalDocumentId, status);
}

export function getWorkCardBuildingEligibility(
  workspaceRoot: string,
  phaseId: string,
  workCardId: string,
): WorkCardBuildingEligibility {
  const formal = findByPrefix(workspaceRoot, `planning/phases/${phaseId}/Work_Cards/${workCardId}`, ".md");
  if (!formal) {
    return { eligible: false, reason: "Formal Work Card is required." };
  }
  const freshness = evaluateDocumentFreshness(workspaceRoot, formal.logicalDocumentId);
  const eligible =
    formal.effectiveDisposition === "Approved" &&
    formal.documentReadState === "readable" &&
    freshness.state === "fresh";
  if (eligible) {
    return { eligible: true, reason: "Approved Formal Work Card is the Work Card Building instruction." };
  }
  if (formal.effectiveDisposition === "Rejected") {
    return { eligible: false, reason: "Rejected Formal Work Card must return to Phase Planning bundle revision." };
  }
  return { eligible: false, reason: "Work Card Building requires a readable, fresh, Approved Formal Work Card." };
}

export function reviseFormalWorkCard(
  workspaceRoot: string,
  phaseId: string,
  workCardId: string,
): void {
  const formal = requiredAny(workspaceRoot, `planning/phases/${phaseId}/Work_Cards/${workCardId}`, ".md");
  savePlanningDocumentRevision(workspaceRoot, formal.logicalDocumentId);
}

function requiredApproved(workspaceRoot: string, prefix: string, extension: ".md") {
  const document = requiredAny(workspaceRoot, prefix, extension);
  if (document.effectiveDisposition !== "Approved") {
    throw new Error(`Current Approved input is required: ${prefix}`);
  }
  if (evaluateDocumentFreshness(workspaceRoot, document.logicalDocumentId).state === "stale") {
    throw new Error(`Current input is stale: ${prefix}`);
  }
  if (!document.markdownPath) {
    throw new Error(`Canonical Markdown input is required: ${prefix}`);
  }
  return document;
}

function requiredAny(workspaceRoot: string, prefix: string, extension: ".md") {
  const document = findByPrefix(workspaceRoot, prefix, extension);
  if (!document) {
    throw new Error(`Formal Work Card document is missing: ${prefix}`);
  }
  return document;
}

function findByPrefix(workspaceRoot: string, prefix: string, extension: ".md") {
  return listPlanningDocuments(workspaceRoot)
    .filter((document) => document.markdownPath.startsWith(prefix))
    .filter((document) => document.markdownPath.endsWith(extension))
    .at(-1);
}

function requiredApprovedHandoff(workspaceRoot: string): PlanningDocumentSummary {
  const handoff = listPlanningDocuments(workspaceRoot)
    .filter((document) => document.metadata.artifactType === "work-card-intake-handoff")
    .filter((document) => document.effectiveDisposition === "Approved")
    .at(-1);
  if (!handoff) {
    throw new Error("Current Approved Work Card Intake handoff is required.");
  }
  if (evaluateDocumentFreshness(workspaceRoot, handoff.logicalDocumentId).state === "stale") {
    throw new Error("Current Work Card Intake handoff is stale.");
  }
  return handoff;
}

function formalWorkCardTargetFromHandoff(handoff: PlanningDocumentSummary): string {
  const target = handoff.metadata.canonical?.workflowData.formalWorkCardTarget;
  if (typeof target !== "string" || !target.trim() || path.isAbsolute(target) || target.includes("..") || !target.endsWith(".md")) {
    throw new Error("Work Card Intake handoff is missing formalWorkCardTarget.");
  }
  return target;
}

function outputMetadata(input: {
  workspaceRoot: string;
  relativePath: string;
  phaseId: string;
  workCardId: string;
  candidateId: string;
  candidate: Record<string, unknown>;
  sourceRevisions: SourceRevision[];
}): CanonicalDocumentMetadata {
  const existing = readExistingCanonical(input.workspaceRoot, input.relativePath);
  return {
    schemaVersion: 1,
    artifactType: "formal-work-card",
    artifactRevision: existing ? existing.metadata.artifactRevision + 1 : 1,
    participationRole: "gatingReview",
    identity: {
      phaseId: input.phaseId,
      workCardId: input.workCardId,
      candidateId: input.candidateId,
    },
    sourceRevisions: input.sourceRevisions,
    workflowData: {
      phaseId: input.phaseId,
      workCardId: input.workCardId,
      candidateId: input.candidateId,
      candidate: input.candidate,
      returnToPhasePlanningOnRejected: true,
    },
    documentDisposition: { status: "Pending", notes: "", reviewedAt: null },
  };
}

function candidateFromHandoff(value: unknown): Record<string, unknown> & { phaseId: string; candidateId: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Work Card Intake handoff is missing candidate data.");
  }
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.phaseId !== "string" || !candidate.phaseId.trim()) {
    throw new Error("Work Card Intake handoff candidate is missing phaseId.");
  }
  if (typeof candidate.candidateId !== "string" || !candidate.candidateId.trim()) {
    throw new Error("Work Card Intake handoff candidate is missing candidateId.");
  }
  return candidate as Record<string, unknown> & { phaseId: string; candidateId: string };
}

function readExistingCanonical(workspaceRoot: string, relativePath: string) {
  const absolutePath = path.join(workspaceRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return null;
  }
  return parseCanonicalMarkdownDocument(fs.readFileSync(absolutePath, "utf8"));
}

function sourceRevisionsFromHandoff(handoff: PlanningDocumentSummary): SourceRevision[] {
  return [
    ...(handoff.metadata.sourceRevisions ?? []),
    { path: handoff.markdownPath, revision: handoff.metadata.artifactRevision ?? 1 },
  ];
}

function substantiveMarkdown(value: string, label: string): string {
  const body = value.trim();
  if (!body) {
    throw new Error(`${label} output requires substantive Markdown.`);
  }
  if (body.includes(metadataOpenDelimiter) || body.includes(metadataCloseDelimiter)) {
    throw new Error(`${label} output must not contain application metadata delimiters.`);
  }
  return body;
}
