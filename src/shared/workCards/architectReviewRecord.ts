import {
  architectReviewDecisionValues,
  architectReviewOutputHeadings,
} from "./reportReviewProtocol";
import { buildWorkCardFileStem } from "./workCardFileNames";
import {
  validateArchitectReview,
  type ArchitectReviewValidationResult,
} from "./validateArchitectReview";

export type ArchitectReviewDecision =
  (typeof architectReviewDecisionValues)[number];

export type ArchitectReviewSectionKey =
  | "workCardCompliance"
  | "changedFilesReviewed"
  | "acceptanceCriteriaAssessment"
  | "validationClaimsAssessment"
  | "skippedChecksAssessment"
  | "observationRegisterImpact"
  | "operatorValidationSteps"
  | "requiredRepair";

export interface ArchitectReviewFormInput {
  phase: string;
  workCardFileName: string;
  builderReportFileName: string;
  decision?: ArchitectReviewDecision;
  workCardCompliance: string;
  changedFilesReviewed: string;
  acceptanceCriteriaAssessment: string;
  validationClaimsAssessment: string;
  skippedChecksAssessment: string;
  observationRegisterImpact: string;
  operatorValidationSteps: string;
  requiredRepair: string;
}

export interface ArchitectReviewTarget {
  workCardId: string;
  title: string;
  parentWorkCardId?: string;
}

export interface ArchitectReviewPreviewResult {
  ok: boolean;
  reviewMarkdown?: string;
  savedFileName?: string;
  workCardId?: string;
  workCardTitle?: string;
  workCardFileName?: string;
  builderReportFileName?: string;
  reviewMode?: "repair" | "work_card";
  validation?: ArchitectReviewValidationResult;
  errorMessages?: string[];
}

export interface ArchitectReviewSaveResult
  extends ArchitectReviewPreviewResult {
  markdownPath?: string;
}

const sectionDefinitions: ReadonlyArray<{
  key: ArchitectReviewSectionKey;
  heading: (typeof architectReviewOutputHeadings)[number];
}> = [
  { key: "workCardCompliance", heading: "Work Card Compliance" },
  { key: "changedFilesReviewed", heading: "Changed Files Reviewed" },
  {
    key: "acceptanceCriteriaAssessment",
    heading: "Acceptance Criteria Assessment",
  },
  {
    key: "validationClaimsAssessment",
    heading: "Validation Claims Assessment",
  },
  { key: "skippedChecksAssessment", heading: "Skipped Checks Assessment" },
  {
    key: "observationRegisterImpact",
    heading: "Observation Register Impact",
  },
  { key: "operatorValidationSteps", heading: "Operator Validation Steps" },
  { key: "requiredRepair", heading: "Required Repair, if any" },
];

const substantiveSectionKeys: readonly ArchitectReviewSectionKey[] = [
  "workCardCompliance",
  "changedFilesReviewed",
  "acceptanceCriteriaAssessment",
  "validationClaimsAssessment",
  "skippedChecksAssessment",
  "observationRegisterImpact",
];

export function buildArchitectReviewFileName(
  target: ArchitectReviewTarget,
): string {
  return `ARCHITECT_REVIEW_${buildWorkCardFileStem(target.workCardId, target.title)}.md`;
}

export function renderArchitectReviewRecord(
  input: ArchitectReviewFormInput,
  target: ArchitectReviewTarget,
): string {
  const reviewMode = isRepairTarget(target) ? "repair" : "Work Card";
  const title = isRepairTarget(target)
    ? "Architect Review of Repair Implementer Report"
    : "Architect Review of Implementer Report";
  const lines = [
    `# ${title} - ${target.workCardId} ${target.title}`,
    "",
    `- Phase: ${input.phase}`,
    `- Review mode: ${reviewMode}`,
    `- Source Work Card JSON: ${input.workCardFileName}`,
    `- Associated Implementer Report: ${input.builderReportFileName}`,
    ...(target.parentWorkCardId
      ? [`- Parent Work Card: ${target.parentWorkCardId}`]
      : []),
    "",
    "## Architect Review Decision",
    "",
    `Decision: ${input.decision ?? "Pending selection"}`,
  ];

  for (const section of sectionDefinitions) {
    lines.push(
      "",
      `## ${section.heading}`,
      "",
      input[section.key].trim() || "Pending review.",
    );
  }

  return lines.join("\n");
}

export function validateArchitectReviewForm(
  input: ArchitectReviewFormInput,
  reviewMarkdown: string,
): ArchitectReviewValidationResult {
  const baseValidation = validateArchitectReview(reviewMarkdown);
  const errors = [...baseValidation.errors];

  for (const key of substantiveSectionKeys) {
    if (input[key].trim().length === 0) {
      errors.push(`${sectionLabel(key)} must include the Architect's assessment.`);
    }
  }

  if (
    input.decision === "Repair required before Operator validation" &&
    input.requiredRepair.trim().length === 0
  ) {
    errors.push("Required Repair must identify the exact repair scope.");
  }

  return {
    ...baseValidation,
    valid: errors.length === 0,
    errors,
  };
}

export function isRepairTarget(target: ArchitectReviewTarget): boolean {
  return (
    Boolean(target.parentWorkCardId?.trim()) ||
    /-REPAIR\d+$/i.test(target.workCardId.trim())
  );
}

function sectionLabel(key: ArchitectReviewSectionKey): string {
  return sectionDefinitions.find((section) => section.key === key)?.heading ?? key;
}
