import type { PlanningDocumentSummary } from "../../shared/documents/planningDocument";
import { evaluateDocumentFreshness, listPlanningDocuments } from "../documents/planningDocumentService";
import { writeCanonicalMarkdownDocument } from "../documents/canonicalMarkdownDocumentWriter";

export type RepairOrigin = "preValidationReportReview" | "postValidationRecord";

export interface RepairCreationResult {
  repairId: string;
  handoffMarkdownPath: string;
  repairMarkdownPath: string;
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
  const value = relativePath.toLowerCase();
  if (origin === "preValidationReportReview" && !value.includes("/implementer_reports/")) {
    throw new Error("Pre-validation repair requires an Implementer Report.");
  }
  if (origin === "postValidationRecord" && !value.includes("validation")) {
    throw new Error("Post-validation repair requires validation evidence.");
  }
  return document;
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
