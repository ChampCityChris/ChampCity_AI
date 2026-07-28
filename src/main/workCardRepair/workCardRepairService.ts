import fs from "node:fs";
import path from "node:path";
import {
  type CanonicalDocumentMetadata,
  metadataCloseDelimiter,
  metadataOpenDelimiter,
  parseCanonicalMarkdownDocument,
} from "../../shared/documents/canonicalMarkdown";
import type { PlanningDocumentSummary } from "../../shared/documents/planningDocument";
import { evaluateDocumentFreshness, listPlanningDocuments } from "../documents/planningDocumentService";
import { writeCanonicalMarkdownDocument } from "../documents/canonicalMarkdownDocumentWriter";

export type RepairOrigin = "preValidationReportReview" | "postValidationRecord";

export interface RepairCreationResult {
  repairId: string;
  handoffMarkdownPath: string;
  repairMarkdownPath: string;
}

export interface RepairWorkCardSaveResult {
  phaseId: string;
  repairId: string;
  repairWorkCardMarkdownPath: string;
}

export function createRepairWorkCard(
  workspaceRoot: string,
  phaseId: string,
  parentWorkCardId: string,
  evidencePath: string,
  origin: RepairOrigin,
  defect: string,
): RepairCreationResult {
  const evidence = requiredRevisionRequestedEvidence(workspaceRoot, evidencePath, origin);
  const originalParentId = parentWorkCardId.replace(/-REPAIR\d+$/i, "");
  const repairId = nextRepairId(workspaceRoot, phaseId, originalParentId);
  const slug = defect.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "repair";
  const handoffMarkdownPath = `planning/phases/${phaseId}/Architect_Handoffs/REPAIR_ARCHITECT_HANDOFF_${repairId}.md`;
  const repairMarkdownPath = `planning/phases/${phaseId}/Work_Cards/${repairId}_${slug}.md`;
  const returnTarget = origin === "preValidationReportReview"
    ? "work-card-building-review"
    : "work-card-validation";
  const content = {
    handoffKind: "repair",
    repairId,
    originalParentWorkCardId: originalParentId,
    origin,
    evidencePath,
    boundedDefect: defect,
    returnTarget,
  };
  writeCanonicalMarkdownDocument({
    workspaceRoot,
    relativePath: handoffMarkdownPath,
    metadata: {
      schemaVersion: 1,
      artifactType: "generated-handoff",
      artifactRevision: 1,
      participationRole: "nonReviewHandoff",
      identity: { handoffKind: "repair", phaseId, repairId },
      sourceRevisions: [{ path: evidence.markdownPath, revision: evidence.metadata.artifactRevision ?? 1 }],
      workflowData: { ...content, repairWorkCardTarget: repairMarkdownPath },
      documentDisposition: { status: "Approved", notes: "", reviewedAt: null },
    },
    bodyMarkdown: `# Repair Architect Handoff\n\nRepair Work Card Markdown: ${repairMarkdownPath}\n`,
  });
  return { repairId, handoffMarkdownPath, repairMarkdownPath };
}

export function saveRepairWorkCardOutput(
  workspaceRoot: string,
  markdownBody: string,
): RepairWorkCardSaveResult {
  const bodyMarkdown = substantiveMarkdown(markdownBody, "Repair Work Card");
  const handoff = requiredApprovedHandoff(workspaceRoot);
  const workflowData = handoff.metadata.canonical?.workflowData ?? {};
  const phaseId = requiredString(handoff.metadata.canonical?.identity.phaseId, "phaseId");
  const repairId = requiredString(workflowData.repairId, "repairId");
  const parentWorkCardId = requiredString(workflowData.originalParentWorkCardId, "originalParentWorkCardId");
  const repairWorkCardMarkdownPath = repairWorkCardTargetFromHandoff(handoff);

  writeCanonicalMarkdownDocument({
    workspaceRoot,
    relativePath: repairWorkCardMarkdownPath,
    metadata: outputMetadata({
      workspaceRoot,
      relativePath: repairWorkCardMarkdownPath,
      phaseId,
      repairId,
      parentWorkCardId,
      workflowData,
      sourceRevisions: [
        ...(handoff.metadata.sourceRevisions ?? []),
        { path: handoff.markdownPath, revision: handoff.metadata.artifactRevision ?? 1 },
      ],
    }),
    bodyMarkdown,
  });

  return { phaseId, repairId, repairWorkCardMarkdownPath };
}

function requiredRevisionRequestedEvidence(workspaceRoot: string, relativePath: string, origin: RepairOrigin): PlanningDocumentSummary {
  const document = listPlanningDocuments(workspaceRoot).find((candidate) =>
    candidate.markdownPath === relativePath
  );
  if (!document || document.effectiveDisposition !== "RevisionRequested") {
    throw new Error("Repair creation requires RevisionRequested evidence.");
  }
  if (evaluateDocumentFreshness(workspaceRoot, document.logicalDocumentId).state === "stale") {
    throw new Error("Repair evidence is stale.");
  }
  const value = relativePath.replace(/\\/g, "/").toLowerCase();
  if (origin === "preValidationReportReview" && !value.includes("/implementer_reports/")) {
    throw new Error("Pre-validation repair requires an Implementer Report.");
  }
  if (origin === "postValidationRecord" && !value.includes("validation")) {
    throw new Error("Post-validation repair requires validation evidence.");
  }
  return document;
}

function requiredApprovedHandoff(workspaceRoot: string): PlanningDocumentSummary {
  const handoff = listPlanningDocuments(workspaceRoot)
    .filter((document) => document.metadata.artifactType === "generated-handoff")
    .filter((document) => document.metadata.canonical?.workflowData.handoffKind === "repair")
    .filter((document) => document.effectiveDisposition === "Approved")
    .at(-1);
  if (!handoff) {
    throw new Error("Current Approved Repair Architect handoff is required.");
  }
  if (evaluateDocumentFreshness(workspaceRoot, handoff.logicalDocumentId).state === "stale") {
    throw new Error("Current Repair Architect handoff is stale.");
  }
  return handoff;
}

function repairWorkCardTargetFromHandoff(handoff: PlanningDocumentSummary): string {
  const target = handoff.metadata.canonical?.workflowData.repairWorkCardTarget;
  if (typeof target !== "string" || !target.trim() || path.isAbsolute(target) || target.includes("..") || !target.endsWith(".md")) {
    throw new Error("Repair Architect handoff is missing repairWorkCardTarget.");
  }
  return target;
}

function outputMetadata(input: {
  workspaceRoot: string;
  relativePath: string;
  phaseId: string;
  repairId: string;
  parentWorkCardId: string;
  workflowData: Record<string, unknown>;
  sourceRevisions: Array<{ path: string; revision: number }>;
}): CanonicalDocumentMetadata {
  const existing = readExistingCanonical(input.workspaceRoot, input.relativePath);
  return {
    schemaVersion: 1,
    artifactType: "repair-work-card",
    artifactRevision: existing ? existing.metadata.artifactRevision + 1 : 1,
    participationRole: "gatingReview",
    identity: {
      phaseId: input.phaseId,
      workCardId: input.repairId,
      repairId: input.repairId,
      parentWorkCardId: input.parentWorkCardId,
    },
    sourceRevisions: input.sourceRevisions,
    workflowData: {
      repairId: input.repairId,
      parentWorkCardId: input.parentWorkCardId,
      originalParentWorkCardId: input.workflowData.originalParentWorkCardId,
      origin: input.workflowData.origin,
      evidencePath: input.workflowData.evidencePath,
      boundedDefect: input.workflowData.boundedDefect,
      returnTarget: input.workflowData.returnTarget,
    },
    documentDisposition: { status: "Pending", notes: "", reviewedAt: null },
  };
}

function readExistingCanonical(workspaceRoot: string, relativePath: string) {
  const absolutePath = path.join(workspaceRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return null;
  }
  return parseCanonicalMarkdownDocument(fs.readFileSync(absolutePath, "utf8"));
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

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Repair Architect handoff is missing ${field}.`);
  }
  return value.trim();
}

function nextRepairId(workspaceRoot: string, phaseId: string, parentId: string): string {
  const regex = new RegExp(`^${parentId}-REPAIR(\\d+)`, "i");
  const max = listPlanningDocuments(workspaceRoot)
    .filter((document) => document.markdownPath.includes(`planning/phases/${phaseId}/Work_Cards/`))
    .map((document) => document.displayFilename.match(regex)?.[1])
    .filter((value): value is string => Boolean(value))
    .reduce((highest, value) => Math.max(highest, Number(value)), 0);
  return `${parentId}-REPAIR${String(max + 1).padStart(2, "0")}`;
}
