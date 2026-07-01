import { validateSafePhaseFolder } from "./workCardFileNames";

export interface PhaseIntake {
  phaseIntakeId: string;
  phaseFolder: string;
  phaseName: string;
  projectName: string;
  sourceProjectPlanningDocument: string;
  sourceProjectPlanningSidecarJsonFileName?: string;
  sourceProjectPlanningSidecarMarkdownFileName?: string;
  phaseProblem: string;
  phaseGoal: string;
  userOutcome: string;
  includedScope: string;
  outOfScope: string;
  affectedScreensOrWorkflows: string;
  knownConstraints: string;
  knownRisks: string;
  dependencies: string;
  validationExpectations: string;
  operatorNotes: string;
  createdAt: string;
  updatedAt: string;
}

export interface PhaseIntakeInput {
  phaseFolder: string;
  phaseName: string;
  projectName: string;
  sourceProjectPlanningSidecarJsonFileName?: string;
  phaseProblem: string;
  phaseGoal: string;
  userOutcome: string;
  includedScope: string;
  outOfScope: string;
  affectedScreensOrWorkflows: string;
  knownConstraints: string;
  knownRisks: string;
  dependencies: string;
  validationExpectations: string;
  operatorNotes: string;
}

export interface PhaseIntakeArtifactFileNames {
  slug: string;
  jsonFileName: string;
  markdownFileName: string;
}

export interface PhaseIntakePreviewResult {
  ok: boolean;
  validation: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
  phaseIntake?: PhaseIntake;
  markdown?: string;
  suggestedFileNames?: PhaseIntakeArtifactFileNames;
  errorMessages?: string[];
}

export interface PhaseIntakeSaveResult extends PhaseIntakePreviewResult {
  savedJsonFileName?: string;
  savedMarkdownFileName?: string;
  jsonPath?: string;
  markdownPath?: string;
}

export function buildPhaseIntake(
  input: PhaseIntakeInput,
  timestamp: string,
  sourceProjectPlanningSidecarMarkdownFileName?: string,
): PhaseIntake {
  const phaseFolder = cleanText(input.phaseFolder);
  const phaseName = cleanText(input.phaseName);
  const sourceProjectPlanningSidecarJsonFileName = cleanText(
    input.sourceProjectPlanningSidecarJsonFileName ?? "",
  );
  const sourceMarkdownFileName = cleanText(
    sourceProjectPlanningSidecarMarkdownFileName ?? "",
  );
  const fileNames = buildPhaseIntakeFileNames(phaseName || phaseFolder);

  return {
    phaseIntakeId: `PHASE_INTAKE_${fileNames.slug}`,
    phaseFolder,
    phaseName,
    projectName: cleanText(input.projectName),
    sourceProjectPlanningDocument:
      sourceProjectPlanningSidecarJsonFileName.length > 0
        ? `planning/project/Project_Planning_Documents/${sourceProjectPlanningSidecarJsonFileName}`
        : "Current project planning documents under planning/project/.",
    sourceProjectPlanningSidecarJsonFileName:
      sourceProjectPlanningSidecarJsonFileName || undefined,
    sourceProjectPlanningSidecarMarkdownFileName:
      sourceMarkdownFileName || undefined,
    phaseProblem: cleanText(input.phaseProblem),
    phaseGoal: cleanText(input.phaseGoal),
    userOutcome: cleanText(input.userOutcome),
    includedScope: cleanText(input.includedScope),
    outOfScope: cleanText(input.outOfScope),
    affectedScreensOrWorkflows: cleanText(input.affectedScreensOrWorkflows),
    knownConstraints: cleanText(input.knownConstraints),
    knownRisks: cleanText(input.knownRisks),
    dependencies: cleanText(input.dependencies),
    validationExpectations: cleanText(input.validationExpectations),
    operatorNotes: cleanText(input.operatorNotes),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function buildPhaseIntakeFileNames(
  phaseNameOrFolder: string,
): PhaseIntakeArtifactFileNames {
  const slug = slugifyPhaseIntakeName(phaseNameOrFolder);
  const slugErrors = validatePhaseIntakeSlug(slug);

  if (slugErrors.length > 0) {
    throw new Error(slugErrors.join(" "));
  }

  return {
    slug,
    jsonFileName: `PHASE_INTAKE_${slug}.json`,
    markdownFileName: `PHASE_INTAKE_${slug}.md`,
  };
}

export function slugifyPhaseIntakeName(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/^phase[-_\s]*/i, "phase_")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);

  return slug.length > 0 ? slug : "untitled_phase";
}

export function validatePhaseIntakeSlug(slug: string): string[] {
  const value = slug.trim();

  if (value.length === 0) {
    return ["Phase Intake filenames need a phase name."];
  }

  if (value.includes("..") || /[\\/:\s]/.test(value)) {
    return ["Phase Intake filenames must stay inside the Phase Intake folder."];
  }

  if (!/^[a-z0-9][a-z0-9_]*$/.test(value)) {
    return [
      "Phase Intake filenames may use only lowercase letters, numbers, and underscores.",
    ];
  }

  return [];
}

export function validatePhaseIntakeArtifactFileName(
  fileName: string,
): string[] {
  const value = fileName.trim();

  if (value.length === 0) {
    return ["Phase Intake artifact filenames must not be blank."];
  }

  if (value.includes("..") || /[\\/:\s]/.test(value)) {
    return [
      "Phase Intake artifact filenames must not include folders or absolute paths.",
    ];
  }

  if (!/^PHASE_INTAKE_[a-z0-9][a-z0-9_]*\.(json|md)$/.test(value)) {
    return [
      "Phase Intake artifacts must be named PHASE_INTAKE_<slug>.json or PHASE_INTAKE_<slug>.md.",
    ];
  }

  return [];
}

export function validatePhaseIntakePhaseFolder(phaseFolder: string): string[] {
  return validateSafePhaseFolder(phaseFolder);
}

function cleanText(value: string): string {
  return value.trim();
}
