import {
  architectReviewDecisionValues,
  architectReviewOutputHeadings,
} from "./reportReviewProtocol";
import { buildWorkCardFileStem } from "./workCardFileNames";
import {
  authoritativeCurrentActionImplementerReportStatus,
  type CurrentRequiredAction,
} from "./currentRequiredAction";
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
  bindingSource: "workflow_state_index";
  currentActionId: "architect_review_of_implementer_report_required";
  workflowStateRevision: number;
  targetArtifactId: string;
  sourceArtifactId: string;
  expectedOutputArtifactId: string;
  phaseId: string;
  workCardId: string;
  workCardTitle: string;
  implementerReportPath: string;
  implementerReportFileName: string;
  expectedOutputPath: string;
  expectedOutputFileName: string;
  blockingState: RoutedArchitectReviewBindingBlockingState;
}

export interface RoutedArchitectReviewBindingResult {
  binding?: RoutedArchitectReviewBinding;
  errors: string[];
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

export function resolveCurrentActionArchitectReviewBinding(
  action: CurrentRequiredAction | undefined,
): RoutedArchitectReviewBindingResult {
  if (!action) {
    return { errors: [] };
  }

  if (action.id !== "architect_review_of_implementer_report_required") {
    return {
      errors: [
        `Current action ${action.id} does not authorize an Implementer Report Architect Review.`,
      ],
    };
  }

  const phaseId = action.phaseId?.trim() ?? "";
  const workCardId = action.workCardId?.trim() ?? "";
  const workCardTitle = action.workCardTitle?.trim() ?? "";
  const issues: RoutedArchitectReviewBindingIssue[] = [];
  const addIssue = (
    kind: RoutedArchitectReviewBindingIssueKind,
    message: string,
  ) => issues.push({ kind, message });

  const routedAction = action.routedAction;
  if (!routedAction) {
    addIssue(
      "missing",
      "The current action does not carry the canonical workflow-state routed-action contract.",
    );
  } else {
    if (routedAction.actionId !== action.id) {
      addIssue("mismatch", "The routed-action ID does not match the current action.");
    }
    if (routedAction.authorityStatus !== "ready" || routedAction.blockers.length > 0) {
      addIssue("ambiguity", "The canonical routed action is blocked by workflow authority.");
    }
  }

  if (!phaseId) {
    addIssue("missing", "The current action does not identify its phase.");
  }

  if (!workCardId) {
    addIssue(
      "missing",
      "The current action does not identify its Work Card or repair target.",
    );
  }

  if (!workCardTitle) {
    addIssue(
      "missing",
      "The current action does not identify its Work Card or repair title.",
    );
  }

  const authoritativeImplementerReportPaths = [
    ...new Set(
      action.sourceArtifacts
        .filter(
          (artifact) =>
            artifact.status ===
            authoritativeCurrentActionImplementerReportStatus,
        )
        .map((artifact) => artifact.path.trim())
        .filter(Boolean),
    ),
  ];

  if (authoritativeImplementerReportPaths.length === 0) {
    addIssue(
      "missing",
      `Current action ${workCardId || "target"} does not mark an authoritative Implementer Report in source artifacts.`,
    );
  } else if (authoritativeImplementerReportPaths.length > 1) {
    addIssue(
      "ambiguity",
      `Current action ${workCardId || "target"} marks multiple authoritative Implementer Reports and requires Architect authority before one can be selected.`,
    );
  }

  const implementerReportPath =
    authoritativeImplementerReportPaths.length === 1
      ? authoritativeImplementerReportPaths[0]
      : "";
  const implementerReportFileName = fileNameFromArtifactPath(implementerReportPath);

  if (
    implementerReportFileName &&
    workCardId &&
    !isExactImplementerReportForWorkCard(implementerReportFileName, workCardId)
  ) {
    addIssue(
      "mismatch",
      `Current action ${workCardId} marks ${implementerReportFileName} as authoritative, but that report targets a different Work Card or repair ID.`,
    );
  }

  const expectedOutputPath = action.expectedOutput?.path?.trim() ?? "";
  const expectedOutputFileName = fileNameFromArtifactPath(expectedOutputPath);

  if (!expectedOutputFileName) {
    addIssue(
      "missing",
      `Current action ${workCardId || "target"} does not identify its expected output.`,
    );
  } else if (
    workCardId &&
    !isExactArchitectReviewForWorkCard(expectedOutputFileName, workCardId)
  ) {
    addIssue(
      "mismatch",
      `Current action ${workCardId} expects ${expectedOutputFileName}, which does not target the same exact Work Card or repair ID.`,
    );
  }

  const errors = issues.map((issue) => issue.message);
  return {
    binding: {
      bindingSource: "workflow_state_index",
      currentActionId: "architect_review_of_implementer_report_required",
      workflowStateRevision: action.routedAction?.stateRevision ?? 0,
      targetArtifactId: action.routedAction?.targetArtifactId ?? "",
      sourceArtifactId: action.routedAction?.sourceArtifactIds[0] ?? "",
      expectedOutputArtifactId:
        action.routedAction?.expectedOutput.artifactId ?? "",
      phaseId,
      workCardId,
      workCardTitle,
      implementerReportPath,
      implementerReportFileName,
      expectedOutputPath,
      expectedOutputFileName,
      blockingState: {
        blocked: issues.length > 0,
        issues,
      },
    },
    errors,
  };
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

  if (binding.bindingSource !== "workflow_state_index") {
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

function isExactArchitectReviewForWorkCard(
  fileName: string,
  workCardId: string,
): boolean {
  return fileNameTargetsExactWorkCard(fileName, "ARCHITECT_REVIEW_", workCardId);
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
