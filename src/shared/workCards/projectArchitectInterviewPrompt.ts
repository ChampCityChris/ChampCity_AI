import {
  slugifyProjectIntakeName,
  type ProjectIntake,
} from "./projectIntake";

export interface ProjectArchitectInterviewPrompt {
  promptId: string;
  projectIntakeId: string;
  projectName: string;
  createdAt: string;
  updatedAt: string;
  sourceProjectIntakeJsonFileName: string;
  sourceProjectIntakeMarkdownFileName?: string;
  promptPurpose: string;
  architectSurface: string;
  operatorInstruction: string;
  promptText: string;
}

export interface ProjectArchitectInterviewPromptArtifactFileNames {
  slug: string;
  jsonFileName: string;
  markdownFileName: string;
}

export interface ProjectArchitectInterviewPromptRequest {
  projectIntakeFileName: string;
}

export interface ProjectArchitectInterviewPromptPreviewResult {
  ok: boolean;
  promptRecord?: ProjectArchitectInterviewPrompt;
  promptText?: string;
  markdown?: string;
  sourceProjectIntake?: ProjectIntake;
  sourceProjectIntakeFileName?: string;
  sourceProjectIntakeMarkdownFileName?: string;
  suggestedFileNames?: ProjectArchitectInterviewPromptArtifactFileNames;
  errorMessages?: string[];
}

export interface ProjectArchitectInterviewPromptSaveResult
  extends ProjectArchitectInterviewPromptPreviewResult {
  savedJsonFileName?: string;
  savedMarkdownFileName?: string;
  jsonPath?: string;
  markdownPath?: string;
}

export interface SavedProjectIntakeSummary {
  fileName: string;
  projectIntakeId: string;
  projectName: string;
  currentStage: string;
  architectSurface: string;
  updatedAt: string;
}

export interface InvalidSavedProjectIntakeFile {
  fileName: string;
  errorMessages: string[];
}

export interface ListSavedProjectIntakesResult {
  ok: boolean;
  projectIntakes?: SavedProjectIntakeSummary[];
  invalidFiles?: InvalidSavedProjectIntakeFile[];
  errorMessages?: string[];
}

export interface ProjectArchitectInterviewPromptValidationResult {
  valid: boolean;
  errors: string[];
}

export const projectArchitectInterviewPromptPurpose =
  "Generate a guided Project Architect Interview from a saved Project Intake.";

export const projectArchitectInterviewOperatorInstruction =
  "Copy this prompt into the Architect surface, then answer the Architect's questions. The output of that interview will later be used to create Project Planning Documents.";

export function buildProjectArchitectInterviewPrompt(
  projectIntake: ProjectIntake,
  sourceProjectIntakeJsonFileName: string,
  sourceProjectIntakeMarkdownFileName: string | undefined,
  timestamp: string,
): ProjectArchitectInterviewPrompt {
  const projectName = projectIntake.projectName.trim();
  const fileNames = buildProjectArchitectInterviewPromptFileNames(projectName);
  const architectSurface = projectIntake.architectSurface.trim() || "ChatGPT";

  return {
    promptId: `PROJECT_ARCHITECT_INTERVIEW_PROMPT_${fileNames.slug}`,
    projectIntakeId: projectIntake.projectIntakeId,
    projectName,
    createdAt: timestamp,
    updatedAt: timestamp,
    sourceProjectIntakeJsonFileName,
    sourceProjectIntakeMarkdownFileName,
    promptPurpose: projectArchitectInterviewPromptPurpose,
    architectSurface,
    operatorInstruction: projectArchitectInterviewOperatorInstruction,
    promptText: renderProjectArchitectInterviewPromptText(projectIntake),
  };
}

export function buildProjectArchitectInterviewPromptFileNames(
  projectNameOrProjectIntakeId: string,
): ProjectArchitectInterviewPromptArtifactFileNames {
  const slugSource = projectNameOrProjectIntakeId
    .trim()
    .replace(/^PROJECT_INTAKE_/i, "");
  const slug = slugifyProjectIntakeName(slugSource);
  const slugErrors = validateProjectArchitectInterviewPromptSlug(slug);

  if (slugErrors.length > 0) {
    throw new Error(slugErrors.join(" "));
  }

  return {
    slug,
    jsonFileName: `PROJECT_ARCHITECT_INTERVIEW_PROMPT_${slug}.json`,
    markdownFileName: `PROJECT_ARCHITECT_INTERVIEW_PROMPT_${slug}.md`,
  };
}

export function validateProjectArchitectInterviewPrompt(
  candidate: unknown,
): ProjectArchitectInterviewPromptValidationResult {
  const errors: string[] = [];

  if (!isRecord(candidate)) {
    return {
      valid: false,
      errors: ["Project Architect Interview Prompt must be an object."],
    };
  }

  const requiredStringFields = [
    "promptId",
    "projectIntakeId",
    "projectName",
    "createdAt",
    "updatedAt",
    "sourceProjectIntakeJsonFileName",
    "promptPurpose",
    "architectSurface",
    "operatorInstruction",
    "promptText",
  ] as const satisfies readonly (keyof ProjectArchitectInterviewPrompt)[];

  for (const field of requiredStringFields) {
    const value = candidate[field];

    if (typeof value !== "string") {
      errors.push(`${field} must be saved as text.`);
    } else if (value.trim().length === 0) {
      errors.push(`${field} must not be blank.`);
    }
  }

  if (
    "sourceProjectIntakeMarkdownFileName" in candidate &&
    candidate.sourceProjectIntakeMarkdownFileName !== undefined &&
    typeof candidate.sourceProjectIntakeMarkdownFileName !== "string"
  ) {
    errors.push("sourceProjectIntakeMarkdownFileName must be saved as text.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateProjectArchitectInterviewPromptSlug(
  slug: string,
): string[] {
  const value = slug.trim();

  if (value.length === 0) {
    return ["Project Architect Interview Prompt filenames need a source project."];
  }

  if (value.includes("..") || /[\\/:\s]/.test(value)) {
    return [
      "Project Architect Interview Prompt filenames must stay inside the approved prompt folder.",
    ];
  }

  if (!/^[a-z0-9][a-z0-9_]*$/.test(value)) {
    return [
      "Project Architect Interview Prompt filenames may use only lowercase letters, numbers, and underscores.",
    ];
  }

  return [];
}

export function validateProjectArchitectInterviewPromptArtifactFileName(
  fileName: string,
): string[] {
  const value = fileName.trim();

  if (value.length === 0) {
    return ["Project Architect Interview Prompt filenames must not be blank."];
  }

  if (value.includes("..") || /[\\/:\s]/.test(value)) {
    return [
      "Project Architect Interview Prompt filenames must not include folders or absolute paths.",
    ];
  }

  if (
    !/^PROJECT_ARCHITECT_INTERVIEW_PROMPT_[a-z0-9][a-z0-9_]*\.(json|md)$/.test(
      value,
    )
  ) {
    return [
      "Project Architect Interview Prompt artifacts must be named PROJECT_ARCHITECT_INTERVIEW_PROMPT_<slug>.json or PROJECT_ARCHITECT_INTERVIEW_PROMPT_<slug>.md.",
    ];
  }

  return [];
}

export function renderProjectArchitectInterviewPromptText(
  projectIntake: ProjectIntake,
): string {
  return [
    "Act as Architect for the project described below.",
    "",
    "Project Intake:",
    renderProjectIntakeSummary(projectIntake),
    "",
    "Goal:",
    "Run a guided Project Architect Interview that completes the missing project-profile information needed for later Project Planning Documents.",
    "",
    "Important:",
    "Do not create the final Project Profile yet.",
    "Do not create a roadmap yet.",
    "Do not create Phase Plans yet.",
    "Do not create Work Cards yet.",
    "Do not write implementation code.",
    "Do not pretend you saved files.",
    "",
    "Your goal is not to create the final Project Profile yet. Your goal is to complete the missing project-profile information through a short guided interview. After the Operator answers, produce a structured interview completion summary that can be used by a later Project Planning Documents generator.",
    "",
    "Before asking questions:",
    "1. Review the Project Intake.",
    "2. Identify which project-profile fields are already answered.",
    "3. Identify which fields can be safely inferred.",
    "4. Ask only the questions that truly require Operator judgment.",
    "5. When a reasonable default is available, propose the default and mark it as an assumption instead of asking an unnecessary question.",
    "6. For every question you ask, provide suggested answers in plain language.",
    "7. Remember the Operator may be tech savvy but is not expected to think like a software architect or developer.",
    "8. Preserve the Architect / Implementer mental model.",
    "9. Treat the source-of-truth location and Builder/Implementer tooling as durable project constraints.",
    "",
    "Required project-profile areas to complete:",
    "- Project name",
    "- Product/problem summary",
    "- Primary users/operators",
    "- User/operator problem being solved",
    "- Desired user/operator outcome",
    "- Business/product goal",
    "- Source-of-truth location",
    "- Source-of-truth type",
    "- Preferred Implementer tool",
    "- Architect surface",
    "- Current stage",
    "- Known constraints",
    "- Non-goals",
    "- Security/data concerns",
    "- Examples or references",
    "- Operator uncertainties",
    "- Success definition",
    "- Validation expectations",
    "- Initial phase candidates",
    "- Key risks and drift warnings",
    "",
    "Interview behavior:",
    "- Ask questions in small batches.",
    "- Use plain language.",
    "- Avoid broad expert-only questions.",
    "- Provide suggested answers.",
    "- Clearly separate assumptions from questions.",
    "- Push back if the Operator's stated goal conflicts with constraints or scope.",
    "- Do not ask broad expert-only questions when a reasonable default can be proposed.",
    "- Use the Operator's non-developer perspective.",
    "",
    "After the Operator answers:",
    "Produce a structured Project Architect Interview Completion Summary with:",
    "1. Confirmed facts.",
    "2. Safe assumptions.",
    "3. Open questions.",
    "4. Recommended project-profile values.",
    "5. Recommended initial phase candidates.",
    "6. Risks and drift warnings.",
    "7. Suggested next step: generate Project Planning Documents.",
    "",
    "Do not generate the Project Planning Documents yet.",
  ].join("\n");
}

function renderProjectIntakeSummary(projectIntake: ProjectIntake): string {
  return [
    `- Project Intake ID: ${formatValue(projectIntake.projectIntakeId)}`,
    `- Project name: ${formatValue(projectIntake.projectName)}`,
    `- Working title: ${formatValue(projectIntake.workingTitle)}`,
    `- Product/problem summary: ${formatValue(projectIntake.productSummary)}`,
    `- Primary users/operators: ${formatValue(projectIntake.targetUsers)}`,
    `- User/operator problem being solved: ${formatValue(projectIntake.userProblem)}`,
    `- Desired user/operator outcome: ${formatValue(projectIntake.desiredUserOutcome)}`,
    `- Business/product goal: ${formatValue(projectIntake.businessOrPersonalGoal)}`,
    `- Current stage: ${formatValue(projectIntake.currentStage)}`,
    `- Source-of-truth location: ${formatValue(projectIntake.sourceOfTruthLocation)}`,
    "- Source-of-truth type: Existing local repository and durable planning files unless the Operator says otherwise.",
    `- Preferred Implementer tool: ${formatValue(projectIntake.preferredImplementerTool)}`,
    `- Architect surface: ${formatValue(projectIntake.architectSurface || "ChatGPT")}`,
    `- Known constraints: ${formatValue(projectIntake.knownConstraints)}`,
    `- Non-goals: ${formatValue(projectIntake.nonGoals)}`,
    `- Security/data concerns: ${formatValue(projectIntake.securityOrDataConcerns)}`,
    `- Examples or references: ${formatValue(projectIntake.examplesOrReferences)}`,
    `- Operator uncertainties: ${formatValue(projectIntake.operatorUncertainties)}`,
    `- Notes for the Architect: ${formatValue(projectIntake.notesForArchitect)}`,
  ].join("\n");
}

function formatValue(value: string): string {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "Not provided.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
