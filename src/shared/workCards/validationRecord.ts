import { buildWorkCardFileStem } from "./workCardFileNames";
import type { WorkCard } from "./workCardSchema";
import { validateWorkCard } from "./validateWorkCard";

export const humanValidationResults = [
  "Pass",
  "Fail",
  "Partial",
  "Blocked",
  "Not Tested",
] as const;

export type HumanValidationResult = (typeof humanValidationResults)[number];

export const humanValidationOperatorDecisions = [
  "Passed - proceed",
  "Failed - repair needed",
  "Partial - repair or follow-up needed",
  "Blocked - operator/build environment issue",
  "Deferred - not validated yet",
  "Different problem found - open new Work Card",
] as const;

export type HumanValidationOperatorDecision =
  (typeof humanValidationOperatorDecisions)[number];

export interface HumanValidationRecord {
  validationId: string;
  workCardId: string;
  workCardTitle: string;
  phase: string;
  builderReportFile?: string;
  validationResult: HumanValidationResult;
  testedItems: string;
  passedItems: string;
  failedItems: string;
  evidenceReferences: string;
  screenshotOrFileReferences: string;
  commandsRun: string;
  observedErrors: string;
  additionalOperatorObservations: string;
  operatorDecision: HumanValidationOperatorDecision;
  recommendedNextAction: string;
  createdAt: string;
}

export interface HumanValidationFormInput {
  phase: string;
  workCardFileName: string;
  builderReportFileName?: string;
  validationResult: HumanValidationResult;
  testedItems: string;
  passedItems: string;
  failedItems: string;
  evidenceReferences: string;
  screenshotOrFileReferences: string;
  commandsRun: string;
  observedErrors: string;
  additionalOperatorObservations: string;
  operatorDecision: HumanValidationOperatorDecision;
  recommendedNextAction: string;
}

export interface HumanValidationBuilderReportOption {
  fileName: string;
  label: string;
  isDefaultMatch: boolean;
}

export interface InvalidHumanValidationBuilderReportFile {
  fileName: string;
  errorMessages: string[];
}

export interface HumanValidationBuilderReportListRequest {
  phase: string;
  workCardFileName: string;
}

export interface HumanValidationBuilderReportListResult {
  ok: boolean;
  workCard?: WorkCard;
  options?: HumanValidationBuilderReportOption[];
  defaultFileName?: string;
  invalidFiles?: InvalidHumanValidationBuilderReportFile[];
  errorMessages?: string[];
}

export interface ManualValidationChecklistExtraction {
  detected: boolean;
  text: string;
}

export interface HumanValidationPreviewResult {
  ok: boolean;
  record?: HumanValidationRecord;
  validationMarkdown?: string;
  repairPrompt?: string;
  shouldGenerateRepairPrompt?: boolean;
  manualValidationChecklist?: ManualValidationChecklistExtraction;
  builderReportWarning?: string;
  differentProblemGuidance?: string;
  savedValidationJsonFileName?: string;
  savedValidationMarkdownFileName?: string;
  savedRepairPromptFileName?: string;
  errorMessages?: string[];
}

export interface HumanValidationSaveResult
  extends HumanValidationPreviewResult {
  validationJsonPath?: string;
  validationMarkdownPath?: string;
  repairPromptPath?: string;
}

export interface HumanValidationRecordValidationResult {
  valid: boolean;
  errors: string[];
}

export const noBuilderReportSelectedWarning =
  "No Implementer Report is selected. You can still save validation, but the evidence chain is incomplete.";

export const noManualValidationChecklistDetectedMessage =
  "No manual validation checklist was detected in the selected Implementer Report.";

export const differentProblemFoundGuidance =
  "Different problem found. Create a new Work Card instead of repairing the selected Work Card.";

const repairTriggerResults: HumanValidationResult[] = [
  "Fail",
  "Partial",
  "Blocked",
];

const repairTriggerDecisions: HumanValidationOperatorDecision[] = [
  "Failed - repair needed",
  "Partial - repair or follow-up needed",
  "Blocked - operator/build environment issue",
];

const manualValidationSectionPatterns = [
  /manual validation should confirm/i,
  /manual validation required/i,
  /manual electron validation/i,
  /\bmanual validation\b/i,
];

export function buildHumanValidationRecord(
  workCard: WorkCard,
  input: HumanValidationFormInput,
  createdAt: string,
): HumanValidationRecord {
  const workCardValidation = validateWorkCard(workCard);

  if (!workCardValidation.valid) {
    throw new Error(
      `Cannot create validation record for invalid Work Card: ${workCardValidation.errors.join("; ")}`,
    );
  }

  if (workCard.phase !== input.phase.trim()) {
    throw new Error("Saved Work Card phase must match the selected phase folder.");
  }

  if (!isHumanValidationResult(input.validationResult)) {
    throw new Error("Choose a valid validation result.");
  }

  if (!isHumanValidationOperatorDecision(input.operatorDecision)) {
    throw new Error("Choose a valid Operator decision.");
  }

  const builderReportFile = input.builderReportFileName?.trim();

  return {
    validationId: buildValidationId(workCard.workCardId, createdAt),
    workCardId: workCard.workCardId,
    workCardTitle: workCard.title,
    phase: workCard.phase,
    builderReportFile:
      builderReportFile && builderReportFile.length > 0
        ? builderReportFile
        : undefined,
    validationResult: input.validationResult,
    testedItems: input.testedItems,
    passedItems: input.passedItems,
    failedItems: input.failedItems,
    evidenceReferences: input.evidenceReferences,
    screenshotOrFileReferences: input.screenshotOrFileReferences,
    commandsRun: input.commandsRun,
    observedErrors: input.observedErrors,
    additionalOperatorObservations: input.additionalOperatorObservations,
    operatorDecision: input.operatorDecision,
    recommendedNextAction: input.recommendedNextAction,
    createdAt,
  };
}

export function validateHumanValidationRecord(
  record: HumanValidationRecord,
): HumanValidationRecordValidationResult {
  const errors: string[] = [];

  requireText(record.validationId, "Validation ID", errors);
  requireText(record.workCardId, "Work Card ID", errors);
  requireText(record.workCardTitle, "Work Card title", errors);
  requireText(record.phase, "Phase", errors);
  requireText(record.createdAt, "Created timestamp", errors);

  if (!isHumanValidationResult(record.validationResult)) {
    errors.push("Validation result is not a supported value.");
  }

  if (!isHumanValidationOperatorDecision(record.operatorDecision)) {
    errors.push("Operator decision is not a supported value.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function shouldGenerateRepairPrompt(
  record: HumanValidationRecord,
): boolean {
  if (
    record.operatorDecision ===
    "Different problem found - open new Work Card"
  ) {
    return false;
  }

  return (
    repairTriggerResults.includes(record.validationResult) ||
    repairTriggerDecisions.includes(record.operatorDecision)
  );
}

export function getDifferentProblemGuidance(
  record: HumanValidationRecord,
): string | undefined {
  return record.operatorDecision ===
    "Different problem found - open new Work Card"
    ? differentProblemFoundGuidance
    : undefined;
}

export function extractManualValidationChecklist(
  reportText: string,
): ManualValidationChecklistExtraction {
  const lines = reportText.replace(/\r\n/g, "\n").split("\n");
  const startIndex = lines.findIndex((line) =>
    manualValidationSectionPatterns.some((pattern) => pattern.test(line)),
  );

  if (startIndex === -1) {
    return {
      detected: false,
      text: noManualValidationChecklistDetectedMessage,
    };
  }

  const captured: string[] = [];

  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index];

    if (index > startIndex && /^#{1,6}\s+\S/.test(line)) {
      break;
    }

    captured.push(line);

    if (captured.length >= 60) {
      break;
    }
  }

  const text = captured.join("\n").trim();

  return {
    detected: text.length > 0,
    text: text.length > 0 ? text : noManualValidationChecklistDetectedMessage,
  };
}

export function buildValidationReportJsonFileName(
  record: Pick<HumanValidationRecord, "workCardId" | "workCardTitle">,
): string {
  return validateValidationReportFileName(
    `${buildValidationReportFileStem(record)}.json`,
  );
}

export function buildValidationReportMarkdownFileName(
  record: Pick<HumanValidationRecord, "workCardId" | "workCardTitle">,
): string {
  return validateValidationReportFileName(
    `${buildValidationReportFileStem(record)}.md`,
  );
}

export function validateValidationReportFileName(fileName: string): string {
  const value = fileName.trim();

  if (value.length === 0) {
    throw new Error("Validation Report filename must not be blank.");
  }

  if (/[\\/]/.test(value) || value.includes("..")) {
    throw new Error("Validation Report filename must not include folders.");
  }

  if (!/\.(json|md)$/.test(value)) {
    throw new Error("Validation Report filename must use .json or .md.");
  }

  if (!/^VALIDATION_REPORT_[A-Za-z0-9][A-Za-z0-9_-]*\.(json|md)$/.test(value)) {
    throw new Error(
      "Validation Report filename must use only letters, numbers, hyphens, underscores, and a .json or .md extension.",
    );
  }

  return value;
}

export function isHumanValidationResult(
  value: string,
): value is HumanValidationResult {
  return (humanValidationResults as readonly string[]).includes(value);
}

export function isHumanValidationOperatorDecision(
  value: string,
): value is HumanValidationOperatorDecision {
  return (humanValidationOperatorDecisions as readonly string[]).includes(value);
}

function buildValidationReportFileStem(
  record: Pick<HumanValidationRecord, "workCardId" | "workCardTitle">,
): string {
  return `VALIDATION_REPORT_${buildWorkCardFileStem(
    record.workCardId,
    record.workCardTitle,
  )}`;
}

function buildValidationId(workCardId: string, createdAt: string): string {
  const timestamp = createdAt.replace(/[^0-9]/g, "").slice(0, 14);
  return `VALIDATION_${workCardId}_${timestamp || "created"}`;
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
