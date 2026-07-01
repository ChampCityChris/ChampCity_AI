import { workCardRiskLevels, type WorkCard } from "./workCardSchema";
import {
  validateSafePhaseFolder,
  validateSafeWorkCardId,
} from "./workCardFileNames";

export const validationTargetKinds = ["work_card", "repair", "fix"] as const;

export type ValidationTargetKind = (typeof validationTargetKinds)[number];

export interface ValidationTargetRecord {
  id: string;
  kind: ValidationTargetKind;
  phase: string;
  title: string;
  status: string;
  risk?: string;
  parentWorkCardId?: string;
  sourceJsonFile: string;
  sourceMarkdownFile?: string;
  expectedImplementerReportFile?: string;
}

export interface ValidationTargetSummary extends ValidationTargetRecord {
  fileName: string;
  label: string;
}

export interface InvalidValidationTargetFile {
  fileName: string;
  errorMessages: string[];
}

export interface ListValidationTargetsResult {
  ok: boolean;
  targets?: ValidationTargetSummary[];
  invalidFiles?: InvalidValidationTargetFile[];
  errorMessages?: string[];
}

export function buildWorkCardValidationTarget(
  workCard: WorkCard,
  fileName: string,
  expectedImplementerReportFile?: string,
): ValidationTargetSummary {
  const sourceMarkdownFile = fileName.replace(/\.json$/i, ".md");

  return {
    id: workCard.workCardId,
    kind: "work_card",
    phase: workCard.phase,
    title: workCard.title,
    status: workCard.status,
    risk: workCard.riskLevel,
    sourceJsonFile: fileName,
    sourceMarkdownFile,
    expectedImplementerReportFile,
    fileName,
    label: `${workCard.workCardId} - ${workCard.title}`,
  };
}

export function validateValidationTargetRecord(
  candidate: unknown,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!isRecord(candidate)) {
    return {
      valid: false,
      errors: ["Validation Target must be an object."],
    };
  }

  requireString(candidate.id, "id", errors);
  requireString(candidate.phase, "phase", errors);
  requireString(candidate.title, "title", errors);
  requireString(candidate.status, "status", errors);
  requireString(candidate.sourceJsonFile, "sourceJsonFile", errors);
  requireString(
    candidate.expectedImplementerReportFile,
    "expectedImplementerReportFile",
    errors,
  );

  if (
    typeof candidate.kind !== "string" ||
    !isValidationTargetKind(candidate.kind)
  ) {
    errors.push("kind must be one of: work_card, repair, fix.");
  }

  if (typeof candidate.id === "string") {
    errors.push(...validateSafeWorkCardId(candidate.id));
  }

  if (typeof candidate.phase === "string") {
    errors.push(...validateSafePhaseFolder(candidate.phase));
  }

  if (
    candidate.risk !== undefined &&
    (typeof candidate.risk !== "string" ||
      !(workCardRiskLevels as readonly string[]).includes(candidate.risk))
  ) {
    errors.push("risk must be one of: low, medium, high.");
  }

  if (
    candidate.parentWorkCardId !== undefined &&
    typeof candidate.parentWorkCardId !== "string"
  ) {
    errors.push("parentWorkCardId must be a string when provided.");
  }

  if (typeof candidate.parentWorkCardId === "string") {
    errors.push(...validateSafeWorkCardId(candidate.parentWorkCardId));
  }

  if (
    typeof candidate.sourceJsonFile === "string" &&
    validateValidationTargetJsonReference(candidate.sourceJsonFile).length > 0
  ) {
    errors.push(...validateValidationTargetJsonReference(candidate.sourceJsonFile));
  }

  if (
    candidate.sourceMarkdownFile !== undefined &&
    (typeof candidate.sourceMarkdownFile !== "string" ||
      validateValidationTargetMarkdownReference(candidate.sourceMarkdownFile)
        .length > 0)
  ) {
    errors.push(
      ...(typeof candidate.sourceMarkdownFile === "string"
        ? validateValidationTargetMarkdownReference(candidate.sourceMarkdownFile)
        : ["sourceMarkdownFile must be a Markdown filename when provided."]),
    );
  }

  if (
    typeof candidate.expectedImplementerReportFile === "string" &&
    validateValidationTargetMarkdownReference(
      candidate.expectedImplementerReportFile,
    ).length > 0
  ) {
    errors.push(
      ...validateValidationTargetMarkdownReference(
        candidate.expectedImplementerReportFile,
      ),
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function toValidationTargetRecord(
  candidate: unknown,
): ValidationTargetRecord {
  const validation = validateValidationTargetRecord(candidate);

  if (!validation.valid || !isRecord(candidate)) {
    throw new Error(
      `Validation Target JSON is not valid: ${validation.errors.join(" ")}`,
    );
  }

  return {
    id: candidate.id as string,
    kind: candidate.kind as ValidationTargetKind,
    phase: candidate.phase as string,
    title: candidate.title as string,
    status: candidate.status as string,
    risk: candidate.risk as string | undefined,
    parentWorkCardId: candidate.parentWorkCardId as string | undefined,
    sourceJsonFile: candidate.sourceJsonFile as string,
    sourceMarkdownFile: candidate.sourceMarkdownFile as string | undefined,
    expectedImplementerReportFile:
      candidate.expectedImplementerReportFile as string | undefined,
  };
}

export function validateValidationTargetJsonFileName(fileName: string): string[] {
  const value = fileName.trim();

  if (value.length === 0) {
    return ["Choose a Validation Target JSON file."];
  }

  return validateValidationTargetJsonReference(value);
}

export function formatValidationTargetLabel(
  target: Pick<ValidationTargetRecord, "id" | "kind" | "title">,
): string {
  if (target.kind === "work_card") {
    return `${target.id} - ${target.title}`;
  }

  return `${target.id} - ${target.title} (${target.kind})`;
}

export function isValidationTargetKind(
  value: string,
): value is ValidationTargetKind {
  return (validationTargetKinds as readonly string[]).includes(value);
}

function validateValidationTargetJsonReference(fileName: string): string[] {
  const value = fileName.trim();

  if (value.length === 0) {
    return ["JSON artifact file names must not be blank."];
  }

  if (/[\\/]/.test(value) || value.includes("..")) {
    return ["JSON artifact file names must not include folders or traversal."];
  }

  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*\.json$/.test(value)) {
    return [
      "JSON artifact file names must use only letters, numbers, hyphens, underscores, and the .json extension.",
    ];
  }

  return [];
}

function validateValidationTargetMarkdownReference(fileName: string): string[] {
  const value = fileName.trim();

  if (value.length === 0) {
    return ["Markdown artifact file names must not be blank."];
  }

  if (/[\\/]/.test(value) || value.includes("..")) {
    return [
      "Markdown artifact file names must not include folders or traversal.",
    ];
  }

  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*\.md$/.test(value)) {
    return [
      "Markdown artifact file names must use only letters, numbers, hyphens, underscores, and the .md extension.",
    ];
  }

  return [];
}

function requireString(
  value: unknown,
  label: string,
  errors: string[],
): void {
  if (typeof value !== "string") {
    errors.push(`${label} is required and must be a string.`);
    return;
  }

  if (value.trim().length === 0) {
    errors.push(`${label} must not be blank.`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
