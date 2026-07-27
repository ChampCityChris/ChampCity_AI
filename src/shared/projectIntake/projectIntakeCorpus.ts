import type { PlanningDocumentSummary } from "../documents/planningDocument";

export type ProjectIntakeCorpusState = "open" | "single" | "conflict";
export type ProjectIntakeRailStatus = "Open" | "Awaiting Approval" | "Completed" | "Conflict";

export interface ProjectIntakeCorpusAnalysis {
  state: ProjectIntakeCorpusState;
  documents: PlanningDocumentSummary[];
  evidencePaths: string[];
}

const canonicalProjectIntakeDirectories = [
  "planning/project/project_intake/",
  "planning/project/project-intake/",
] as const;

export function analyzeProjectIntakeCorpus(
  documents: PlanningDocumentSummary[],
): ProjectIntakeCorpusAnalysis {
  const intakeDocuments = documents
    .filter(isActiveCanonicalProjectIntake)
    .sort((left, right) =>
      firstEvidencePath(left).localeCompare(firstEvidencePath(right), "en", { sensitivity: "base" }),
    );
  const evidencePaths = intakeDocuments.map((document) => document.markdownPath);

  return {
    state: intakeDocuments.length === 0
      ? "open"
      : intakeDocuments.length === 1
        ? "single"
        : "conflict",
    documents: intakeDocuments,
    evidencePaths,
  };
}

export function deriveProjectIntakeRailStatus(
  documents: PlanningDocumentSummary[],
): ProjectIntakeRailStatus {
  const corpus = analyzeProjectIntakeCorpus(documents);
  if (corpus.state === "open") {
    return "Open";
  }
  if (corpus.state === "conflict") {
    return "Conflict";
  }
  return corpus.documents[0]?.effectiveDisposition === "Approved"
    ? "Completed"
    : "Awaiting Approval";
}

export function isActiveCanonicalProjectIntake(
  document: PlanningDocumentSummary,
): boolean {
  if (document.metadata.participationRole === "historical") {
    return false;
  }
  if (isArchivedPlanningDocument(document)) {
    return false;
  }

  return document.metadata.artifactType === "project-intake" ||
    isCanonicalProjectIntakePath(document.markdownPath);
}

export function isArchivedPlanningDocument(document: PlanningDocumentSummary): boolean {
  return isArchivedPlanningPath(document.markdownPath);
}

export function isCanonicalProjectIntakePath(relativePath: string | undefined): boolean {
  if (!relativePath) {
    return false;
  }
  const normalized = relativePath.replace(/\\/g, "/").toLowerCase();
  return canonicalProjectIntakeDirectories.some((directory) => normalized.startsWith(directory));
}

function isArchivedPlanningPath(relativePath: string | undefined): boolean {
  if (!relativePath) {
    return false;
  }
  const normalized = relativePath.replace(/\\/g, "/").toLowerCase();
  return normalized.startsWith("planning/archive/");
}

function firstEvidencePath(document: PlanningDocumentSummary): string {
  return document.markdownPath || document.displayFilename;
}
