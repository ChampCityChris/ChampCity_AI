import {
  buildPhaseCloseoutRecommendation,
  type PhaseArtifactSummary,
} from "./phaseCloseout";
import { validateSafePhaseFolder } from "./workCardFileNames";

export const phaseCloseoutDecisions = [
  "Close phase",
  "Continue phase",
  "Needs repair",
  "Needs UI cleanup",
  "Ready for release/package pass",
  "Ready for next phase",
] as const;

export type PhaseCloseoutDecision =
  (typeof phaseCloseoutDecisions)[number];

export interface PhaseCloseoutRecord {
  closeoutId: string;
  phase: string;
  decision: PhaseCloseoutDecision;
  artifactSummary: PhaseArtifactSummary;
  closeoutSummary: string;
  completedItems: string;
  remainingItems: string;
  knownRisks: string;
  operatorNotes: string;
  recommendedNextAction: string;
  deterministicRecommendation: string;
  createdAt: string;
}

export interface PhaseCloseoutFormInput {
  phase: string;
  decision: PhaseCloseoutDecision;
  closeoutSummary: string;
  completedItems: string;
  remainingItems: string;
  knownRisks: string;
  operatorNotes: string;
  recommendedNextAction: string;
}

export interface PhaseCloseoutRecordValidationResult {
  valid: boolean;
  errors: string[];
}

export interface PhaseCloseoutSummaryResult {
  ok: boolean;
  summary?: PhaseArtifactSummary;
  errorMessages?: string[];
}

export interface PhaseCloseoutPreviewResult extends PhaseCloseoutSummaryResult {
  record?: PhaseCloseoutRecord;
  markdown?: string;
  savedJsonFileName?: string;
  savedMarkdownFileName?: string;
}

export interface PhaseCloseoutSaveResult extends PhaseCloseoutPreviewResult {
  jsonPath?: string;
  markdownPath?: string;
}

export function buildPhaseCloseoutRecord(
  input: PhaseCloseoutFormInput,
  artifactSummary: PhaseArtifactSummary,
  createdAt: string,
): PhaseCloseoutRecord {
  const phase = input.phase.trim();
  const phaseErrors = validateSafePhaseFolder(phase);

  if (phaseErrors.length > 0) {
    throw new Error(phaseErrors.join(" "));
  }

  if (artifactSummary.phase !== phase) {
    throw new Error("Closeout summary phase must match the selected phase.");
  }

  if (!isPhaseCloseoutDecision(input.decision)) {
    throw new Error("Choose a valid phase closeout decision.");
  }

  return {
    closeoutId: buildPhaseCloseoutId(phase, createdAt),
    phase,
    decision: input.decision,
    artifactSummary,
    closeoutSummary: input.closeoutSummary,
    completedItems: input.completedItems,
    remainingItems: input.remainingItems,
    knownRisks: input.knownRisks,
    operatorNotes: input.operatorNotes,
    recommendedNextAction: input.recommendedNextAction,
    deterministicRecommendation: buildPhaseCloseoutRecommendation(
      artifactSummary,
      input.decision,
    ),
    createdAt,
  };
}

export function validatePhaseCloseoutRecord(
  record: PhaseCloseoutRecord,
): PhaseCloseoutRecordValidationResult {
  const errors: string[] = [];

  requireText(record.closeoutId, "Closeout ID", errors);
  requireText(record.phase, "Phase", errors);
  requireText(record.createdAt, "Created timestamp", errors);
  requireText(
    record.deterministicRecommendation,
    "Deterministic recommendation",
    errors,
  );

  if (!record.artifactSummary || record.artifactSummary.phase !== record.phase) {
    errors.push("Artifact summary phase must match the closeout phase.");
  }

  if (!isPhaseCloseoutDecision(record.decision)) {
    errors.push("Closeout decision is not a supported value.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function buildPhaseCloseoutJsonFileName(
  record: Pick<PhaseCloseoutRecord, "phase">,
): string {
  return validatePhaseCloseoutReportFileName(
    `CLOSEOUT_REPORT_${record.phase}_${buildPhaseCloseoutSlug(record.phase)}.json`,
  );
}

export function buildPhaseCloseoutMarkdownFileName(
  record: Pick<PhaseCloseoutRecord, "phase">,
): string {
  return validatePhaseCloseoutReportFileName(
    `CLOSEOUT_REPORT_${record.phase}_${buildPhaseCloseoutSlug(record.phase)}.md`,
  );
}

export function validatePhaseCloseoutReportFileName(fileName: string): string {
  const value = fileName.trim();

  if (value.length === 0) {
    throw new Error("Closeout Report filename must not be blank.");
  }

  if (/[\\/]/.test(value) || value.includes("..")) {
    throw new Error("Closeout Report filename must not include folders.");
  }

  if (!/\.(json|md)$/.test(value)) {
    throw new Error("Closeout Report filename must use .json or .md.");
  }

  if (!/^CLOSEOUT_REPORT_[a-z0-9][a-z0-9_-]*\.(json|md)$/.test(value)) {
    throw new Error(
      "Closeout Report filename must use only lowercase letters, numbers, hyphens, underscores, and a .json or .md extension.",
    );
  }

  return value;
}

export function isPhaseCloseoutDecision(
  value: string,
): value is PhaseCloseoutDecision {
  return (phaseCloseoutDecisions as readonly string[]).includes(value);
}

function buildPhaseCloseoutId(phase: string, createdAt: string): string {
  const timestamp = createdAt.replace(/[^0-9]/g, "").slice(0, 14);

  return `CLOSEOUT_${phase}_${timestamp || "created"}`;
}

function buildPhaseCloseoutSlug(phase: string): string {
  const phaseMatch = /^phase-(\d+)$/i.exec(phase);

  if (phaseMatch) {
    return `phase_${Number.parseInt(phaseMatch[1], 10)}_closeout`;
  }

  return `${phase.replace(/-/g, "_")}_closeout`;
}

function requireText(
  value: string,
  label: string,
  errors: string[],
): void {
  if (value.trim().length === 0) {
    errors.push(`${label} is required.`);
  }
}
