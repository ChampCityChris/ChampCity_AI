import {
  projectIntakeStages,
  type ProjectIntake,
} from "./projectIntake";

export interface ProjectIntakeValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const requiredFieldMessages = {
  projectName: "Please enter a project name.",
  productSummary: "Please describe what you are trying to build.",
  targetUsers: "Please describe who this is for.",
  userProblem: "Please describe the problem this should solve.",
  desiredUserOutcome: "Please describe what the user should be able to do.",
  sourceOfTruthLocation:
    "Please enter where the source of truth for this project lives.",
} as const satisfies Record<keyof Pick<
  ProjectIntake,
  | "projectName"
  | "productSummary"
  | "targetUsers"
  | "userProblem"
  | "desiredUserOutcome"
  | "sourceOfTruthLocation"
>, string>;

const warningFieldMessages = {
  knownConstraints:
    "Consider adding known constraints so the Architect can avoid bad assumptions.",
  nonGoals:
    "Consider adding what this project should not try to do yet.",
  securityOrDataConcerns:
    "Consider noting any security or data concerns, even if you are unsure.",
  operatorUncertainties:
    "Consider adding what you are unsure about so the Architect can ask better questions.",
} as const satisfies Record<keyof Pick<
  ProjectIntake,
  | "knownConstraints"
  | "nonGoals"
  | "securityOrDataConcerns"
  | "operatorUncertainties"
>, string>;

const stringFields = [
  "projectIntakeId",
  "projectName",
  "workingTitle",
  "createdAt",
  "updatedAt",
  "productSummary",
  "targetUsers",
  "userProblem",
  "desiredUserOutcome",
  "businessOrPersonalGoal",
  "sourceOfTruthLocation",
  "preferredImplementerTool",
  "architectSurface",
  "knownConstraints",
  "nonGoals",
  "securityOrDataConcerns",
  "examplesOrReferences",
  "operatorUncertainties",
  "notesForArchitect",
] as const satisfies readonly (keyof ProjectIntake)[];

export function validateProjectIntake(
  candidate: unknown,
): ProjectIntakeValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isRecord(candidate)) {
    return {
      valid: false,
      errors: ["Project Intake must be an object."],
      warnings,
    };
  }

  for (const field of stringFields) {
    if (typeof candidate[field] !== "string") {
      errors.push(`${field} must be saved as text.`);
    }
  }

  for (const [field, message] of Object.entries(requiredFieldMessages)) {
    const value = candidate[field];

    if (typeof value !== "string" || value.trim().length === 0) {
      errors.push(message);
    }
  }

  for (const [field, message] of Object.entries(warningFieldMessages)) {
    const value = candidate[field];

    if (typeof value !== "string" || value.trim().length === 0) {
      warnings.push(message);
    }
  }

  if (
    typeof candidate.currentStage !== "string" ||
    !(projectIntakeStages as readonly string[]).includes(candidate.currentStage)
  ) {
    errors.push(
      `Please choose a current stage: ${projectIntakeStages.join(", ")}.`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
