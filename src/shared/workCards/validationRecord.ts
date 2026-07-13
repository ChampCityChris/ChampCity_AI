import { buildWorkCardFileStem } from "./workCardFileNames";
import {
  isValidationTargetKind,
  type ValidationTargetKind,
  type ValidationTargetRecord,
  type ValidationTargetSummary,
} from "./validationTarget";
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
  validationTargetId?: string;
  validationTargetKind?: ValidationTargetKind;
  validationTargetTitle?: string;
  validationTargetSourceJsonFile?: string;
  validationTargetSourceMarkdownFile?: string;
  validationTargetExpectedImplementerReportFile?: string;
  parentWorkCardId?: string;
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
  validationTargetFileName?: string;
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
  modifiedAt?: string;
}

export interface InvalidHumanValidationBuilderReportFile {
  fileName: string;
  errorMessages: string[];
}

export interface HumanValidationBuilderReportListRequest {
  phase: string;
  workCardFileName: string;
  validationTargetFileName?: string;
}

export interface HumanValidationBuilderReportListResult {
  ok: boolean;
  workCard?: WorkCard;
  validationTarget?: ValidationTargetSummary;
  options?: HumanValidationBuilderReportOption[];
  defaultFileName?: string;
  invalidFiles?: InvalidHumanValidationBuilderReportFile[];
  errorMessages?: string[];
}

export interface HumanValidationStatusSummary {
  validationTargetFileName: string;
  validationTargetId: string;
  validationTargetKind?: ValidationTargetKind;
  validationResult: HumanValidationResult;
  operatorDecision: HumanValidationOperatorDecision;
  validationReportJsonFile: string;
  validationReportMarkdownFile?: string;
  createdAt?: string;
}

export interface InvalidHumanValidationStatusFile {
  fileName: string;
  errorMessages: string[];
}

export interface HumanValidationStatusListResult {
  ok: boolean;
  statuses?: HumanValidationStatusSummary[];
  invalidFiles?: InvalidHumanValidationStatusFile[];
  errorMessages?: string[];
}

export interface ManualValidationChecklistExtraction {
  detected: boolean;
  text: string;
  sourceLabel?:
    | "Architect Review"
    | "Repair Work Card"
    | "Parent Work Card"
    | "Work Card"
    | "Implementer Report";
  sourceFileName?: string;
  isFallback?: boolean;
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

export interface AvailablePhaseFoldersResult {
  ok: boolean;
  phases?: string[];
  errorMessages?: string[];
}

export interface BuilderReportFileLoadRequest {
  phase: string;
  fileName: string;
}

export interface BuilderReportFileLoadResult {
  ok: boolean;
  fileName?: string;
  content?: string;
  errorMessages?: string[];
}

export interface ValidationEvidenceFileImportRequest {
  phase: string;
  workCardFileName: string;
  validationTargetFileName?: string;
  fileName: string;
  content: ArrayBuffer;
}

export interface ValidationEvidenceFileImportResult {
  ok: boolean;
  savedFileName?: string;
  savedRelativePath?: string;
  errorMessages?: string[];
}

export interface HumanValidationRecordValidationResult {
  valid: boolean;
  errors: string[];
}

export const noBuilderReportSelectedWarning =
  "No Implementer Report is selected. You can still save validation, but the evidence chain is incomplete.";

export const noManualValidationChecklistDetectedMessage =
  "No Operator validation guidance was detected in the Architect Review, Work Card, or selected Implementer Report.";

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
  /operator validation guidance/i,
  /manual validation should confirm/i,
  /manual validation required/i,
  /manual electron validation/i,
  /\bmanual validation\b/i,
];

const workCardValidationSectionPatterns = [
  /acceptance criteria/i,
  /validation expectations/i,
];

export function buildHumanValidationRecord(
  source: WorkCard | ValidationTargetRecord,
  input: HumanValidationFormInput,
  createdAt: string,
): HumanValidationRecord {
  const target = toHumanValidationTarget(source);

  if (target.phase !== input.phase.trim()) {
    throw new Error(
      "Saved Validation Target phase must match the selected phase folder.",
    );
  }

  if (!isHumanValidationResult(input.validationResult)) {
    throw new Error("Choose a valid validation result.");
  }

  if (!isHumanValidationOperatorDecision(input.operatorDecision)) {
    throw new Error("Choose a valid Operator decision.");
  }

  const builderReportFile = input.builderReportFileName?.trim();

  return {
    validationId: buildValidationId(target.id, createdAt),
    workCardId: target.id,
    workCardTitle: target.title,
    validationTargetId: target.id,
    validationTargetKind: target.kind,
    validationTargetTitle: target.title,
    validationTargetSourceJsonFile: target.sourceJsonFile,
    validationTargetSourceMarkdownFile: target.sourceMarkdownFile,
    validationTargetExpectedImplementerReportFile:
      target.expectedImplementerReportFile,
    parentWorkCardId: target.parentWorkCardId,
    phase: target.phase,
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

  if (
    record.validationTargetKind &&
    !isValidationTargetKind(record.validationTargetKind)
  ) {
    errors.push("Validation Target kind is not a supported value.");
  }

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
  return extractChecklistSection(reportText, manualValidationSectionPatterns);
}

export function extractWorkCardValidationChecklist(
  workCardText: string,
): ManualValidationChecklistExtraction {
  return extractChecklistSection(workCardText, workCardValidationSectionPatterns);
}

function extractChecklistSection(
  reportText: string,
  sectionPatterns: RegExp[],
): ManualValidationChecklistExtraction {
  const lines = reportText.replace(/\r\n/g, "\n").split("\n");
  const startIndex = lines.findIndex((line) =>
    sectionPatterns.some((pattern) => pattern.test(line)),
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

function toHumanValidationTarget(
  source: WorkCard | ValidationTargetRecord,
): ValidationTargetRecord {
  if (isValidationTargetRecord(source)) {
    return source;
  }

  const workCardValidation = validateWorkCard(source);

  if (!workCardValidation.valid) {
    throw new Error(
      `Cannot create validation record for invalid Work Card: ${workCardValidation.errors.join("; ")}`,
    );
  }

  return {
    id: source.workCardId,
    kind: "work_card",
    phase: source.phase,
    title: source.title,
    status: source.status,
    risk: source.riskLevel,
    sourceJsonFile: `${buildWorkCardFileStem(
      source.workCardId,
      source.title,
    )}.json`,
    sourceMarkdownFile: `${buildWorkCardFileStem(
      source.workCardId,
      source.title,
    )}.md`,
  };
}

function isValidationTargetRecord(
  source: WorkCard | ValidationTargetRecord,
): source is ValidationTargetRecord {
  return "kind" in source && "id" in source && "sourceJsonFile" in source;
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
