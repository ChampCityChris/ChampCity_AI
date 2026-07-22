import fs from "node:fs";
import path from "node:path";
import type { PlanningDocumentSummary } from "../../shared/documents/planningDocument";
import { evaluateDocumentFreshness, listPlanningDocuments } from "../documents/planningDocumentService";

export type RepairOrigin = "preValidationReportReview" | "postValidationRecord";

export interface RepairCreationResult {
  repairId: string;
  handoffMarkdownPath: string;
  handoffJsonPath: string;
  repairMarkdownPath: string;
  repairJsonPath: string;
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
  const handoffJsonPath = `planning/phases/${phaseId}/Architect_Handoffs/REPAIR_ARCHITECT_HANDOFF_${repairId}.json`;
  const repairMarkdownPath = `planning/phases/${phaseId}/Work_Cards/${repairId}_${slug}.md`;
  const repairJsonPath = `planning/phases/${phaseId}/Work_Cards/${repairId}_${slug}.json`;
  const sourceRevisions = [{ path: evidencePath, revision: evidence.metadata.artifactRevision ?? 1 }];
  const returnTarget = origin === "preValidationReportReview"
    ? "work-card-building-review"
    : "work-card-validation";
  const repair = {
    artifactType: "repair-work-card",
    artifactRevision: 1,
    participationRole: "gatingReview",
    phaseId,
    workCardId: repairId,
    repairId,
    originalParentWorkCardId: originalParentId,
    origin,
    evidencePath,
    evidenceRevision: evidence.metadata.artifactRevision ?? 1,
    boundedDefect: defect,
    scope: "Bounded repair only.",
    nonScope: "No unrelated work is authorized.",
    affectedAcceptanceCriteria: [],
    validationExpectations: [],
    returnTarget,
    expectedReportPath: `planning/phases/${phaseId}/Implementer_Reports/IMPLEMENTER_REPORT_${repairId}_${slug}.*`,
    sourceRevisions,
    documentDisposition: { status: "Pending" },
  };
  writeFiles(workspaceRoot, [
    [handoffMarkdownPath, renderHandoff(repairId, phaseId, sourceRevisions, repairMarkdownPath, repairJsonPath)],
    [handoffJsonPath, json({ artifactType: "repair-architect-handoff", artifactRevision: 1, participationRole: "nonReviewHandoff", phaseId, repairId, originalParentWorkCardId: originalParentId, sourceRevisions, outputTargets: { repairWorkCard: { markdown: repairMarkdownPath, json: repairJsonPath } }, documentDisposition: { status: "Approved" } })],
    [repairMarkdownPath, renderRepair(repair)],
    [repairJsonPath, json(repair)],
  ]);
  return { repairId, handoffMarkdownPath, handoffJsonPath, repairMarkdownPath, repairJsonPath };
}

function requiredRevisionRequestedEvidence(workspaceRoot: string, relativePath: string, origin: RepairOrigin): PlanningDocumentSummary {
  const document = listPlanningDocuments(workspaceRoot).find((candidate) =>
    candidate.jsonPath === relativePath || candidate.markdownPath === relativePath
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
    .filter((document) => (document.jsonPath ?? document.markdownPath ?? "").includes(`planning/phases/${phaseId}/Work_Cards/`))
    .map((document) => document.displayFilename.match(regex)?.[1])
    .filter((value): value is string => Boolean(value))
    .reduce((highest, value) => Math.max(highest, Number(value)), 0);
  return `${parentId}-REPAIR${String(max + 1).padStart(2, "0")}`;
}

function renderHandoff(repairId: string, phaseId: string, sources: Array<{ path: string; revision: number }>, md: string, js: string): string {
  return [`# Repair Architect Handoff - ${repairId}`, "Artifact.Revision=1", "participationRole=nonReviewHandoff", `phaseId=${phaseId}`, "", "## Source Revisions", ...sources.map((source) => `- path: ${source.path} revision: ${source.revision}`), "", "## Output Targets", md, js, "", "## Document Disposition", "", "Document.Status=Approved", ""].join("\n");
}

function renderRepair(repair: any): string {
  return [`# Repair Work Card - ${repair.repairId}`, "Artifact.Revision=1", "participationRole=gatingReview", `phaseId=${repair.phaseId}`, `workCardId=${repair.repairId}`, `originalParentWorkCardId=${repair.originalParentWorkCardId}`, "", "## Source Revisions", ...repair.sourceRevisions.map((source: { path: string; revision: number }) => `- path: ${source.path} revision: ${source.revision}`), "", "## Document Disposition", "", "Document.Status=Pending", ""].join("\n");
}

function writeFiles(workspaceRoot: string, entries: Array<[string, string]>): void {
  for (const [relativePath, content] of entries) {
    const absolutePath = path.join(workspaceRoot, relativePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, content, "utf8");
  }
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
