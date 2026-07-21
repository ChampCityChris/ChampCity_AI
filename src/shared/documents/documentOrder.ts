import type { DocumentDispositionStatus } from "./documentDisposition";
import type { PlanningDocumentSummary } from "./planningDocument";
import { type WorkspaceDocument, assignDocumentsToWorkspaces } from "../workspaces/documentWorkspace";
import { type WorkspaceLabel, workspaceLabels } from "../workspaceContracts";

export interface ResolvedCurrentDocument {
  logicalDocumentId: string;
  owningWorkspace: WorkspaceLabel;
  markdownPath?: string;
  jsonPath?: string;
  displayTitle: string;
  effectiveDisposition: DocumentDispositionStatus;
  orderPosition: number;
  totalDocumentCount: number;
}

export type FirstNonApprovedResult =
  | {
      status: "current";
      document: ResolvedCurrentDocument;
    }
  | {
      status: "all-approved";
      message: "All planning documents approved";
      totalDocumentCount: number;
    };

const stageOrder = new Map<WorkspaceLabel, number>(
  workspaceLabels.map((label, index) => [label, index]),
);

export function orderPlanningDocuments(
  documents: PlanningDocumentSummary[],
): WorkspaceDocument[] {
  return assignDocumentsToWorkspaces(documents).sort(comparePlanningDocuments);
}

export function comparePlanningDocuments(
  left: WorkspaceDocument,
  right: WorkspaceDocument,
): number {
  const leftScope = getPlanningScope(left);
  const rightScope = getPlanningScope(right);

  if (leftScope === "project" || rightScope === "project") {
    return (
      compareNumber(scopeRank(leftScope), scopeRank(rightScope)) ||
      compareNumber(getProjectCategory(left), getProjectCategory(right)) ||
      getNormalizedPath(left).localeCompare(getNormalizedPath(right), "en", { sensitivity: "base" })
    );
  }

  const leftPhaseNumber = getPhaseNumber(left);
  const rightPhaseNumber = getPhaseNumber(right);
  const leftNumbered = leftPhaseNumber < 9999;
  const rightNumbered = rightPhaseNumber < 9999;

  if (!leftNumbered || !rightNumbered) {
    return (
      compareNumber(leftNumbered ? 0 : 1, rightNumbered ? 0 : 1) ||
      getNormalizedPath(left).localeCompare(getNormalizedPath(right), "en", { sensitivity: "base" })
    );
  }

  return (
    compareNumber(leftPhaseNumber, rightPhaseNumber) ||
    compareNumber(getStageRank(left), getStageRank(right)) ||
    compareNumber(getWithinPhaseCategory(left), getWithinPhaseCategory(right)) ||
    compareNumber(getWorkCardNumber(left), getWorkCardNumber(right)) ||
    compareNumber(getRepairNumber(left), getRepairNumber(right)) ||
    compareNumber(getValidationEvidenceCategory(left), getValidationEvidenceCategory(right)) ||
    compareNumber(getArchiveRank(left), getArchiveRank(right)) ||
    getNormalizedPath(left).localeCompare(getNormalizedPath(right), "en", { sensitivity: "base" })
  );
}

export function resolveFirstNonApproved(
  documents: PlanningDocumentSummary[],
): FirstNonApprovedResult {
  const ordered = orderPlanningDocuments(documents);
  const currentIndex = ordered.findIndex(
    (document) => document.effectiveDisposition !== "Approved",
  );

  if (currentIndex === -1) {
    return {
      status: "all-approved",
      message: "All planning documents approved",
      totalDocumentCount: ordered.length,
    };
  }

  const document = ordered[currentIndex];
  return {
    status: "current",
    document: {
      logicalDocumentId: document.logicalDocumentId,
      owningWorkspace: document.workspace,
      markdownPath: document.markdownPath,
      jsonPath: document.jsonPath,
      displayTitle: document.displayFilename,
      effectiveDisposition: document.effectiveDisposition,
      orderPosition: currentIndex + 1,
      totalDocumentCount: ordered.length,
    },
  };
}

function getProjectCategory(document: WorkspaceDocument): number {
  if (getPlanningScope(document) !== "project") {
    return 0;
  }

  const value = getSearchValue(document);
  if (/project[_ -]?intake/.test(value)) {
    return 1;
  }
  if (value.includes("project_architect")) {
    return 2;
  }
  if (value.includes("project_planning")) {
    return 3;
  }
  if (value.includes("project_roadmap")) {
    return 4;
  }
  if (value.includes("phase_map")) {
    return 5;
  }
  return 6;
}

function getPhaseNumber(document: WorkspaceDocument): number {
  const match = getNormalizedPath(document).match(/phase-(\d+)/i);
  return match ? Number(match[1]) : 9999;
}

function getPlanningScope(document: WorkspaceDocument): "project" | "phase" {
  const value = getSearchValue(document);
  if (value.includes("planning/phases/") || value.includes("planning/archive/phases/")) {
    return "phase";
  }
  return "project";
}

function scopeRank(scope: "project" | "phase"): number {
  return scope === "project" ? 0 : 1;
}

function getStageRank(document: WorkspaceDocument): number {
  if (document.workspace === "Project Planning") {
    return 99;
  }
  return stageOrder.get(document.workspace) ?? 99;
}

function getArchiveRank(document: WorkspaceDocument): number {
  return getNormalizedPath(document).includes("/archive/") ||
    getNormalizedPath(document).includes("planning/archive/")
    ? 1
    : 0;
}

function getWithinPhaseCategory(document: WorkspaceDocument): number {
  const value = getSearchValue(document);

  if (document.workspace === "Phase Planning") {
    if (value.includes("phase_planning")) {
      return 1;
    }
    if (value.includes("work_card_plan")) {
      return 2;
    }
    return 3;
  }
  if (document.workspace === "Work Card") {
    return 4;
  }
  if (document.workspace === "Operator Validation") {
    return 5;
  }
  if (document.workspace === "Phase Closeout") {
    return 6;
  }
  return 0;
}

function getWorkCardNumber(document: WorkspaceDocument): number {
  const match = getFilename(document).match(/^WC(\d+)/i);
  return match ? Number(match[1]) : 9999;
}

function getRepairNumber(document: WorkspaceDocument): number {
  const filename = getFilename(document);
  if (!/^WC\d+/i.test(filename)) {
    return 9999;
  }

  const match = filename.match(/REPAIR(\d+)/i);
  return match ? Number(match[1]) : 0;
}

function getValidationEvidenceCategory(document: WorkspaceDocument): number {
  const value = getSearchValue(document);
  if (value.includes("implementer_report")) {
    return 1;
  }
  if (value.includes("architect_review")) {
    return 2;
  }
  if (value.includes("validation_report") || value.includes("operator_validation")) {
    return 3;
  }
  if (value.includes("candidate_disposition")) {
    return 4;
  }
  return 5;
}

function getSearchValue(document: WorkspaceDocument): string {
  return getNormalizedPath(document).toLowerCase();
}

function getNormalizedPath(document: WorkspaceDocument): string {
  return document.markdownPath ?? document.jsonPath ?? document.displayFilename;
}

function getFilename(document: WorkspaceDocument): string {
  const normalizedPath = getNormalizedPath(document);
  return normalizedPath.slice(normalizedPath.lastIndexOf("/") + 1);
}

function compareNumber(left: number, right: number): number {
  return left === right ? 0 : left < right ? -1 : 1;
}
