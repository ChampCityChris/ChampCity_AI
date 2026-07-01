import {
  validatePhaseIntakePhaseFolder,
  type PhaseIntake,
} from "./phaseIntake";

export interface PhaseIntakeValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const requiredFieldMessages = {
  phaseFolder: "Please choose a phase folder.",
  phaseName: "Please enter a phase name.",
  projectName: "Please enter a project name.",
  phaseProblem: "Please describe the problem this phase should solve.",
  phaseGoal: "Please describe the goal for this phase.",
  userOutcome: "Please describe what the user should be able to do after this phase.",
} as const satisfies Record<keyof Pick<
  PhaseIntake,
  | "phaseFolder"
  | "phaseName"
  | "projectName"
  | "phaseProblem"
  | "phaseGoal"
  | "userOutcome"
>, string>;

const warningFieldMessages = {
  includedScope:
    "Consider adding included scope so the Architect can avoid under-planning.",
  outOfScope:
    "Consider adding out-of-scope boundaries so phase planning stays bounded.",
  affectedScreensOrWorkflows:
    "Consider naming affected screens or workflows if any are known.",
  knownConstraints:
    "Consider adding known constraints so the Architect can infer safer defaults.",
  knownRisks:
    "Consider adding known risks or drift warnings.",
  dependencies:
    "Consider naming dependencies that may affect phase sequencing.",
  validationExpectations:
    "Consider adding validation expectations before the phase interview.",
} as const satisfies Record<keyof Pick<
  PhaseIntake,
  | "includedScope"
  | "outOfScope"
  | "affectedScreensOrWorkflows"
  | "knownConstraints"
  | "knownRisks"
  | "dependencies"
  | "validationExpectations"
>, string>;

const stringFields = [
  "phaseIntakeId",
  "phaseFolder",
  "phaseName",
  "projectName",
  "sourceProjectPlanningDocument",
  "phaseProblem",
  "phaseGoal",
  "userOutcome",
  "includedScope",
  "outOfScope",
  "affectedScreensOrWorkflows",
  "knownConstraints",
  "knownRisks",
  "dependencies",
  "validationExpectations",
  "operatorNotes",
  "createdAt",
  "updatedAt",
] as const satisfies readonly (keyof PhaseIntake)[];

export function validatePhaseIntake(
  candidate: unknown,
): PhaseIntakeValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isRecord(candidate)) {
    return {
      valid: false,
      errors: ["Phase Intake must be an object."],
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
    "sourceProjectPlanningSidecarJsonFileName" in candidate &&
    candidate.sourceProjectPlanningSidecarJsonFileName !== undefined &&
    typeof candidate.sourceProjectPlanningSidecarJsonFileName !== "string"
  ) {
    errors.push("sourceProjectPlanningSidecarJsonFileName must be saved as text.");
  }

  if (
    "sourceProjectPlanningSidecarMarkdownFileName" in candidate &&
    candidate.sourceProjectPlanningSidecarMarkdownFileName !== undefined &&
    typeof candidate.sourceProjectPlanningSidecarMarkdownFileName !== "string"
  ) {
    errors.push("sourceProjectPlanningSidecarMarkdownFileName must be saved as text.");
  }

  const phaseFolder = candidate.phaseFolder;

  if (typeof phaseFolder === "string") {
    errors.push(...validatePhaseIntakePhaseFolder(phaseFolder));
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
