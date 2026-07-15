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
  implementerReportFileName: string;
  routedReviewBinding?: RoutedArchitectReviewBinding;
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

export type RoutedArchitectReviewBindingIssueKind =
  | "missing"
  | "ambiguity"
  | "mismatch";

export interface RoutedArchitectReviewBindingIssue {
  kind: RoutedArchitectReviewBindingIssueKind;
  message: string;
}

export interface RoutedArchitectReviewBindingBlockingState {
  blocked: boolean;
  issues: RoutedArchitectReviewBindingIssue[];
}

export interface RoutedArchitectReviewBinding {
  bindingSource: "routed_action_and_artifact_registry";
  currentActionId: "architect_review_of_implementer_report_required";
  workflowStateRevision: number;
  targetArtifactId: string;
  sourceArtifactId: string;
  sourceArtifactIds?: string[];
  expectedOutputArtifactId: string;
  phaseId: string;
  workCardId: string;
  workCardTitle: string;
  implementerReportPath: string;
  implementerReportFileName: string;
  expectedOutputPath: string;
  expectedOutputFileName: string;
  reviewScope?: "standard" | "combined_parent_and_final_repair";
  parentWorkCardId?: string;
  repairWorkCardId?: string;
  repairClassification?: "final_permitted_repair";
  originalImplementerReportArtifactId?: string;
  repairImplementerReportArtifactId?: string;
  authorizingArchitectReviewArtifactId?: string;
  combinedEvidence?: Array<{
    artifactId: string;
    artifactType: string;
    title: string;
    markdownPath: string;
    revision: number;
  }>;
  blockingState: RoutedArchitectReviewBindingBlockingState;
}

export interface ArchitectReviewWorkCardOption {
  fileName: string;
  workCardId: string;
}

export interface ArchitectReviewPreviewResult {
  ok: boolean;
  reviewMarkdown?: string;
  savedFileName?: string;
  workCardId?: string;
  workCardTitle?: string;
  workCardFileName?: string;
  implementerReportFileName?: string;
  reviewMode?: "repair" | "work_card";
  validation?: ArchitectReviewValidationResult;
  errorMessages?: string[];
}

export interface ArchitectReviewSaveResult
  extends ArchitectReviewPreviewResult {
  markdownPath?: string;
  jsonPath?: string;
  workflowTransition?: {
    fromActionId: string;
    toActionId: string | null;
    workflowStateRevision: number;
    nextScreenId?: string;
  };
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

export function findCurrentActionArchitectReviewWorkCardFileName(
  binding: RoutedArchitectReviewBinding,
  workCards: readonly ArchitectReviewWorkCardOption[],
): string | undefined {
  return workCards.find(
    (workCard) =>
      workCard.workCardId.trim().toLowerCase() ===
      binding.workCardId.trim().toLowerCase(),
  )?.fileName;
}

export function isExactImplementerReportForWorkCard(
  fileName: string,
  workCardId: string,
): boolean {
  return fileNameTargetsExactWorkCard(fileName, "IMPLEMENTER_REPORT_", workCardId);
}

export function validateArchitectReviewAssociation(
  input: Pick<
    ArchitectReviewFormInput,
    "phase" | "implementerReportFileName" | "routedReviewBinding"
  >,
  target: ArchitectReviewTarget,
): string[] {
  const errors: string[] = [];
  const selectedReport = input.implementerReportFileName.trim();
  const binding = input.routedReviewBinding;

  if (!binding) {
    if (
      !isExactImplementerReportForWorkCard(selectedReport, target.workCardId)
    ) {
      errors.push(
        `Selected Work Card ${target.workCardId} and Implementer Report ${selectedReport || "none"} do not share the same exact Work Card or repair ID. Choose the Implementer Report for ${target.workCardId}. The Architect owns correcting this manual association before preview or save.`,
      );
    }

    return errors;
  }

  if (binding.bindingSource !== "routed_action_and_artifact_registry") {
    errors.push(
      `Routed-review binding source ${binding.bindingSource} cannot control this Architect Review.`,
    );
  }

  if (
    binding.currentActionId !==
    "architect_review_of_implementer_report_required"
  ) {
    errors.push(
      `Current-action binding ${binding.currentActionId} cannot control this Architect Review.`,
    );
  }

  errors.push(...binding.blockingState.issues.map((issue) => issue.message));

  if (
    binding.blockingState.blocked &&
    binding.blockingState.issues.length === 0
  ) {
    errors.push(
      "The routed-review binding is blocked and does not identify a resolvable ambiguity or mismatch.",
    );
  }

  if (!sameIdentifier(input.phase, binding.phaseId)) {
    errors.push(
      `Current action targets phase ${binding.phaseId}, but the review targets phase ${input.phase}.`,
    );
  }

  if (!sameIdentifier(target.workCardId, binding.workCardId)) {
    errors.push(
      `Current action targets ${binding.workCardId}, but the selected Work Card is ${target.workCardId} and the selected Implementer Report is ${selectedReport || "none"}. The Reference card does not control this routed review.`,
    );
  }

  if (!sameIdentifier(target.title, binding.workCardTitle)) {
    errors.push(
      `Current action targets ${binding.workCardTitle}, but the selected Work Card title is ${target.title}.`,
    );
  }

  if (!sameFileName(selectedReport, binding.implementerReportFileName)) {
    errors.push(
      `Current action ${binding.workCardId} requires ${binding.implementerReportFileName}, but ${selectedReport || "no Implementer Report"} is selected.`,
    );
  }

  const selectedReportPath = `planning/phases/${input.phase.trim()}/Implementer_Reports/${selectedReport}`;

  if (!sameArtifactPath(selectedReportPath, binding.implementerReportPath)) {
    errors.push(
      `Current action ${binding.workCardId} requires report path ${binding.implementerReportPath || "not identified"}, but the selected report resolves to ${selectedReportPath}.`,
    );
  }

  const generatedOutputFileName = buildArchitectReviewFileName(target);

  if (!sameFileName(generatedOutputFileName, binding.expectedOutputFileName)) {
    errors.push(
      `Current action ${binding.workCardId} requires output ${binding.expectedOutputFileName}, but the selected Work Card would create ${generatedOutputFileName}.`,
    );
  }

  const generatedOutputPath = `planning/phases/${input.phase.trim()}/Architect_Reviews/${generatedOutputFileName}`;

  if (!sameArtifactPath(generatedOutputPath, binding.expectedOutputPath)) {
    errors.push(
      `Current action ${binding.workCardId} requires output path ${binding.expectedOutputPath || "not identified"}, but the selected Work Card would create ${generatedOutputPath}.`,
    );
  }

  if (errors.length > 0) {
    errors.push(
      "The Architect owns correction of the routed current-action binding; Reference-card selection cannot override it.",
    );
  }

  return [...new Set(errors)];
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
    `- Associated Implementer Report: ${input.implementerReportFileName}`,
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

function fileNameTargetsExactWorkCard(
  fileName: string,
  prefix: string,
  workCardId: string,
): boolean {
  const normalizedFileName = fileNameFromArtifactPath(fileName).toLowerCase();
  const normalizedWorkCardId = workCardId.trim().toLowerCase();
  const normalizedPrefix = prefix.toLowerCase();

  if (!normalizedFileName || !normalizedWorkCardId) {
    return false;
  }

  return (
    normalizedFileName === `${normalizedPrefix}${normalizedWorkCardId}.md` ||
    normalizedFileName.startsWith(
      `${normalizedPrefix}${normalizedWorkCardId}_`,
    )
  );
}

function fileNameFromArtifactPath(value: string): string {
  return value.trim().split(/[\\/]/).pop() ?? "";
}

function sameIdentifier(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function sameFileName(left: string, right: string): boolean {
  return (
    fileNameFromArtifactPath(left).toLowerCase() ===
    fileNameFromArtifactPath(right).toLowerCase()
  );
}

function sameArtifactPath(left: string, right: string): boolean {
  return (
    left.trim().replace(/\\/g, "/").toLowerCase() ===
    right.trim().replace(/\\/g, "/").toLowerCase()
  );
}
