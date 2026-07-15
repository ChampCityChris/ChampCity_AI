import {
  workCardRiskLevels,
  workCardStatuses,
  type WorkCard,
  type WorkCardRiskLevel,
  type WorkCardStatus,
} from "./workCardSchema";

export interface WorkCardValidationResult {
  valid: boolean;
  errors: string[];
}

const requiredStringFields = [
  "workCardId",
  "title",
  "phase",
  "status",
  "createdAt",
  "updatedAt",
  "problem",
  "goal",
  "userOutcome",
  "riskLevel",
] as const satisfies readonly (keyof WorkCard)[];

const requiredArrayFields = [
  "scope",
  "outOfScope",
  "requirements",
  "acceptanceCriteria",
  "validationPlan",
  "risks",
  "implementerInstructions",
  "operatorNotes",
] as const satisfies readonly (keyof WorkCard)[];

export function validateWorkCard(candidate: unknown): WorkCardValidationResult {
  const errors: string[] = [];

  if (!isRecord(candidate)) {
    return {
      valid: false,
      errors: ["Work Card must be an object."],
    };
  }

  for (const field of requiredStringFields) {
    const value = candidate[field];

    if (typeof value !== "string") {
      errors.push(`${field} is required and must be a string.`);
    } else if (value.trim().length === 0) {
      errors.push(`${field} must not be blank.`);
    }
  }

  for (const field of requiredArrayFields) {
    const value = candidate[field];

    if (!Array.isArray(value)) {
      errors.push(`${field} is required and must be an array.`);
      continue;
    }

    value.forEach((item, index) => {
      if (typeof item !== "string" || item.trim().length === 0) {
        errors.push(`${field}[${index}] must be a non-blank string.`);
      }
    });
  }

  if (
    typeof candidate.status === "string" &&
    candidate.status.trim().length > 0 &&
    !isWorkCardStatus(candidate.status)
  ) {
    errors.push(
      `status must be one of: ${workCardStatuses.join(", ")}.`,
    );
  }

  if (
    typeof candidate.riskLevel === "string" &&
    candidate.riskLevel.trim().length > 0 &&
    !isWorkCardRiskLevel(candidate.riskLevel)
  ) {
    errors.push(
      `riskLevel must be one of: ${workCardRiskLevels.join(", ")}.`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function isWorkCardStatus(value: string): value is WorkCardStatus {
  return (workCardStatuses as readonly string[]).includes(value);
}

export function isWorkCardRiskLevel(
  value: string,
): value is WorkCardRiskLevel {
  return (workCardRiskLevels as readonly string[]).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
