export const projectIntakeStages = [
  "idea",
  "prototype",
  "mvp",
  "alpha",
  "beta",
  "production",
  "maintenance",
  "unknown",
] as const;

export type ProjectIntakeStage = (typeof projectIntakeStages)[number];

export interface ProjectIntake {
  projectIntakeId: string;
  projectName: string;
  workingTitle: string;
  createdAt: string;
  updatedAt: string;
  productSummary: string;
  targetUsers: string;
  userProblem: string;
  desiredUserOutcome: string;
  businessOrPersonalGoal: string;
  currentStage: ProjectIntakeStage;
  sourceOfTruthLocation: string;
  preferredImplementerTool: string;
  architectSurface: string;
  knownConstraints: string;
  nonGoals: string;
  securityOrDataConcerns: string;
  examplesOrReferences: string;
  operatorUncertainties: string;
  notesForArchitect: string;
}

export interface ProjectIntakeInput {
  projectName: string;
  workingTitle: string;
  productSummary: string;
  targetUsers: string;
  userProblem: string;
  desiredUserOutcome: string;
  businessOrPersonalGoal: string;
  currentStage: ProjectIntakeStage;
  sourceOfTruthLocation: string;
  preferredImplementerTool: string;
  architectSurface: string;
  knownConstraints: string;
  nonGoals: string;
  securityOrDataConcerns: string;
  examplesOrReferences: string;
  operatorUncertainties: string;
  notesForArchitect: string;
}

export interface ProjectIntakeArtifactFileNames {
  slug: string;
  jsonFileName: string;
  markdownFileName: string;
}

export interface ProjectIntakePreviewResult {
  ok: boolean;
  validation: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
  projectIntake?: ProjectIntake;
  markdown?: string;
  suggestedFileNames?: ProjectIntakeArtifactFileNames;
  errorMessages?: string[];
}

export interface ProjectIntakeSaveResult extends ProjectIntakePreviewResult {
  savedJsonFileName?: string;
  savedMarkdownFileName?: string;
  jsonPath?: string;
  markdownPath?: string;
}

export function buildProjectIntake(
  input: ProjectIntakeInput,
  timestamp: string,
): ProjectIntake {
  const projectName = cleanText(input.projectName);
  const slug = slugifyProjectIntakeName(projectName);

  return {
    projectIntakeId: `PROJECT_INTAKE_${slug}`,
    projectName,
    workingTitle: cleanText(input.workingTitle),
    createdAt: timestamp,
    updatedAt: timestamp,
    productSummary: cleanText(input.productSummary),
    targetUsers: cleanText(input.targetUsers),
    userProblem: cleanText(input.userProblem),
    desiredUserOutcome: cleanText(input.desiredUserOutcome),
    businessOrPersonalGoal: cleanText(input.businessOrPersonalGoal),
    currentStage: input.currentStage,
    sourceOfTruthLocation: cleanText(input.sourceOfTruthLocation),
    preferredImplementerTool: cleanText(input.preferredImplementerTool),
    architectSurface: cleanText(input.architectSurface),
    knownConstraints: cleanText(input.knownConstraints),
    nonGoals: cleanText(input.nonGoals),
    securityOrDataConcerns: cleanText(input.securityOrDataConcerns),
    examplesOrReferences: cleanText(input.examplesOrReferences),
    operatorUncertainties: cleanText(input.operatorUncertainties),
    notesForArchitect: cleanText(input.notesForArchitect),
  };
}

export function buildProjectIntakeFileNames(
  projectName: string,
): ProjectIntakeArtifactFileNames {
  const slug = slugifyProjectIntakeName(projectName);
  const slugErrors = validateProjectIntakeSlug(slug);

  if (slugErrors.length > 0) {
    throw new Error(slugErrors.join(" "));
  }

  return {
    slug,
    jsonFileName: `PROJECT_INTAKE_${slug}.json`,
    markdownFileName: `PROJECT_INTAKE_${slug}.md`,
  };
}

export function slugifyProjectIntakeName(projectName: string): string {
  const slug = projectName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);

  return slug.length > 0 ? slug : "untitled_project";
}

export function validateProjectIntakeSlug(slug: string): string[] {
  const value = slug.trim();

  if (value.length === 0) {
    return ["Project Intake filenames need a project name."];
  }

  if (value.includes("..") || /[\\/:\s]/.test(value)) {
    return ["Project Intake filenames must stay inside the Project Intake folder."];
  }

  if (!/^[a-z0-9][a-z0-9_]*$/.test(value)) {
    return [
      "Project Intake filenames may use only lowercase letters, numbers, and underscores.",
    ];
  }

  return [];
}

export function validateProjectIntakeArtifactFileName(
  fileName: string,
): string[] {
  const value = fileName.trim();

  if (value.length === 0) {
    return ["Project Intake artifact filenames must not be blank."];
  }

  if (value.includes("..") || /[\\/:\s]/.test(value)) {
    return [
      "Project Intake artifact filenames must not include folders or absolute paths.",
    ];
  }

  if (!/^PROJECT_INTAKE_[a-z0-9][a-z0-9_]*\.(json|md)$/.test(value)) {
    return [
      "Project Intake artifacts must be named PROJECT_INTAKE_<slug>.json or PROJECT_INTAKE_<slug>.md.",
    ];
  }

  return [];
}

function cleanText(value: string): string {
  return value.trim();
}
