import {
  type PhaseIntakeGenerationMode,
  slugifyPhaseIntakeName,
  type PhaseIntake,
} from "./phaseIntake";
import { validateSafePhaseFolder } from "./workCardFileNames";

export interface PhaseArchitectInterviewPrompt {
  promptId: string;
  phaseIntakeId: string;
  phaseFolder: string;
  phaseName: string;
  projectName: string;
  createdAt: string;
  updatedAt: string;
  sourcePhaseIntakeJsonFileName: string;
  sourcePhaseIntakeMarkdownFileName?: string;
  sourceProjectPlanningDocument: string;
  sourceProjectPlanningSidecarJsonFileName?: string;
  sourceProjectPlanningSidecarMarkdownFileName?: string;
  promptPurpose: string;
  architectSurface: string;
  operatorInstruction: string;
  promptText: string;
}

export interface PhaseArchitectInterviewPromptArtifactFileNames {
  slug: string;
  jsonFileName: string;
  markdownFileName: string;
}

export interface PhaseArchitectInterviewPromptRequest {
  phaseFolder: string;
  phaseIntakeFileName: string;
}

export interface PhaseArchitectInterviewPromptPreviewResult {
  ok: boolean;
  promptRecord?: PhaseArchitectInterviewPrompt;
  promptText?: string;
  markdown?: string;
  sourcePhaseIntake?: PhaseIntake;
  sourcePhaseIntakeFileName?: string;
  sourcePhaseIntakeMarkdownFileName?: string;
  suggestedFileNames?: PhaseArchitectInterviewPromptArtifactFileNames;
  errorMessages?: string[];
}

export interface PhaseArchitectInterviewPromptSaveResult
  extends PhaseArchitectInterviewPromptPreviewResult {
  savedJsonFileName?: string;
  savedMarkdownFileName?: string;
  jsonPath?: string;
  markdownPath?: string;
}

export interface SavedPhaseIntakeSummary {
  fileName: string;
  phaseIntakeId: string;
  phaseFolder: string;
  phaseName: string;
  projectName: string;
  generationMode?: PhaseIntakeGenerationMode;
  sourceProjectPlanningSidecarJsonFileName?: string;
  updatedAt: string;
}

export interface InvalidSavedPhaseIntakeFile {
  fileName: string;
  errorMessages: string[];
}

export interface ListSavedPhaseIntakesResult {
  ok: boolean;
  phaseIntakes?: SavedPhaseIntakeSummary[];
  invalidFiles?: InvalidSavedPhaseIntakeFile[];
  errorMessages?: string[];
}

export interface SavedPhaseArchitectInterviewPromptSummary {
  fileName: string;
  promptId: string;
  phaseIntakeId: string;
  phaseFolder: string;
  phaseName: string;
  projectName: string;
  updatedAt: string;
}

export interface InvalidSavedPhaseArchitectInterviewPromptFile {
  fileName: string;
  errorMessages: string[];
}

export interface ListSavedPhaseArchitectInterviewPromptsResult {
  ok: boolean;
  prompts?: SavedPhaseArchitectInterviewPromptSummary[];
  invalidFiles?: InvalidSavedPhaseArchitectInterviewPromptFile[];
  errorMessages?: string[];
}

export interface PhaseArchitectInterviewPromptValidationResult {
  valid: boolean;
  errors: string[];
}

export const phaseArchitectInterviewPromptPurpose =
  "Generate a guided Phase Architect Interview from a saved Phase Intake.";

export const phaseArchitectInterviewOperatorInstruction =
  "Copy this prompt into the Architect surface. The Architect should return interview questions and recommended defaults only; Phase Planning Documents and Work Cards are generated later.";

export function buildPhaseArchitectInterviewPrompt(
  phaseIntake: PhaseIntake,
  sourcePhaseIntakeJsonFileName: string,
  sourcePhaseIntakeMarkdownFileName: string | undefined,
  timestamp: string,
): PhaseArchitectInterviewPrompt {
  const fileNames = buildPhaseArchitectInterviewPromptFileNames(
    phaseIntake.phaseName || phaseIntake.phaseFolder,
  );

  return {
    promptId: `PHASE_ARCHITECT_INTERVIEW_PROMPT_${fileNames.slug}`,
    phaseIntakeId: phaseIntake.phaseIntakeId,
    phaseFolder: phaseIntake.phaseFolder,
    phaseName: phaseIntake.phaseName,
    projectName: phaseIntake.projectName,
    createdAt: timestamp,
    updatedAt: timestamp,
    sourcePhaseIntakeJsonFileName,
    sourcePhaseIntakeMarkdownFileName,
    sourceProjectPlanningDocument: phaseIntake.sourceProjectPlanningDocument,
    sourceProjectPlanningSidecarJsonFileName:
      phaseIntake.sourceProjectPlanningSidecarJsonFileName,
    sourceProjectPlanningSidecarMarkdownFileName:
      phaseIntake.sourceProjectPlanningSidecarMarkdownFileName,
    promptPurpose: phaseArchitectInterviewPromptPurpose,
    architectSurface: "ChatGPT",
    operatorInstruction: phaseArchitectInterviewOperatorInstruction,
    promptText: renderPhaseArchitectInterviewPromptText(phaseIntake),
  };
}

export function buildPhaseArchitectInterviewPromptFileNames(
  phaseNameOrPhaseIntakeId: string,
): PhaseArchitectInterviewPromptArtifactFileNames {
  const slugSource = phaseNameOrPhaseIntakeId
    .trim()
    .replace(/^PHASE_INTAKE_/i, "");
  const slug = slugifyPhaseIntakeName(slugSource);
  const slugErrors = validatePhaseArchitectInterviewPromptSlug(slug);

  if (slugErrors.length > 0) {
    throw new Error(slugErrors.join(" "));
  }

  return {
    slug,
    jsonFileName: `PHASE_ARCHITECT_INTERVIEW_PROMPT_${slug}.json`,
    markdownFileName: `PHASE_ARCHITECT_INTERVIEW_PROMPT_${slug}.md`,
  };
}

export function validatePhaseArchitectInterviewPrompt(
  candidate: unknown,
): PhaseArchitectInterviewPromptValidationResult {
  const errors: string[] = [];

  if (!isRecord(candidate)) {
    return {
      valid: false,
      errors: ["Phase Architect Interview Prompt must be an object."],
    };
  }

  const requiredStringFields = [
    "promptId",
    "phaseIntakeId",
    "phaseFolder",
    "phaseName",
    "projectName",
    "createdAt",
    "updatedAt",
    "sourcePhaseIntakeJsonFileName",
    "sourceProjectPlanningDocument",
    "promptPurpose",
    "architectSurface",
    "operatorInstruction",
    "promptText",
  ] as const satisfies readonly (keyof PhaseArchitectInterviewPrompt)[];

  for (const field of requiredStringFields) {
    const value = candidate[field];

    if (typeof value !== "string") {
      errors.push(`${field} must be saved as text.`);
    } else if (value.trim().length === 0) {
      errors.push(`${field} must not be blank.`);
    }
  }

  for (const field of [
    "sourcePhaseIntakeMarkdownFileName",
    "sourceProjectPlanningSidecarJsonFileName",
    "sourceProjectPlanningSidecarMarkdownFileName",
  ] as const) {
    if (
      field in candidate &&
      candidate[field] !== undefined &&
      typeof candidate[field] !== "string"
    ) {
      errors.push(`${field} must be saved as text.`);
    }
  }

  const phaseFolder = candidate.phaseFolder;

  if (typeof phaseFolder === "string") {
    errors.push(...validateSafePhaseFolder(phaseFolder));
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validatePhaseArchitectInterviewPromptSlug(
  slug: string,
): string[] {
  const value = slug.trim();

  if (value.length === 0) {
    return ["Phase Architect Interview Prompt filenames need a source phase."];
  }

  if (value.includes("..") || /[\\/:\s]/.test(value)) {
    return [
      "Phase Architect Interview Prompt filenames must stay inside the approved prompt folder.",
    ];
  }

  if (!/^[a-z0-9][a-z0-9_]*$/.test(value)) {
    return [
      "Phase Architect Interview Prompt filenames may use only lowercase letters, numbers, and underscores.",
    ];
  }

  return [];
}

export function validatePhaseArchitectInterviewPromptArtifactFileName(
  fileName: string,
): string[] {
  const value = fileName.trim();

  if (value.length === 0) {
    return ["Phase Architect Interview Prompt filenames must not be blank."];
  }

  if (value.includes("..") || /[\\/:\s]/.test(value)) {
    return [
      "Phase Architect Interview Prompt filenames must not include folders or absolute paths.",
    ];
  }

  if (
    !/^PHASE_ARCHITECT_INTERVIEW_PROMPT_[a-z0-9][a-z0-9_]*\.(json|md)$/.test(
      value,
    )
  ) {
    return [
      "Phase Architect Interview Prompt artifacts must be named PHASE_ARCHITECT_INTERVIEW_PROMPT_<slug>.json or PHASE_ARCHITECT_INTERVIEW_PROMPT_<slug>.md.",
    ];
  }

  return [];
}

export function renderPhaseArchitectInterviewPromptText(
  phaseIntake: PhaseIntake,
): string {
  return [
    "Act as Architect for the development phase described below.",
    "",
    "Saved Phase Intake:",
    renderPhaseIntakeSummary(phaseIntake),
    "",
    "Project planning context:",
    renderProjectPlanningContext(phaseIntake),
    "",
    "Goal:",
    "Run a guided Phase Architect Interview that asks only the questions needed to complete phase planning.",
    "",
    "Important:",
    "1. Review the saved Phase Intake before asking questions.",
    "2. Review relevant project planning context if a source sidecar or project planning document is included.",
    "3. Ask only the questions needed to complete phase planning.",
    "4. Infer safe defaults where reasonable and label them as assumptions.",
    "5. Provide suggested plain-language answers for each question.",
    "6. Preserve Operator / Architect / Implementer terminology.",
    "7. Preserve the Capture -> Frame -> Plan -> Build -> Prove mental model.",
    "8. Avoid implementation code.",
    "9. Avoid generating Phase Planning Documents or Work Cards in this step.",
    "10. Do not perform phase closeout, validation acceptance, release work, or product-owner approval.",
    "",
    "Required phase-planning areas to complete:",
    "- Phase identity and goal",
    "- User outcome",
    "- Included scope",
    "- Out-of-scope boundaries",
    "- Affected screens or workflows",
    "- Constraints",
    "- Risks and drift warnings",
    "- Dependencies",
    "- Validation expectations",
    "- Open Operator decisions",
    "- Suggested sequencing notes for later Phase Planning Documents",
    "",
    "Interview behavior:",
    "- Ask questions in small batches.",
    "- Use plain language.",
    "- Avoid broad expert-only questions when a reasonable default can be proposed.",
    "- For every question, include a recommended default answer the Operator can accept or edit.",
    "- Clearly separate safe assumptions from questions that require Operator judgment.",
    "- Push back if the requested phase conflicts with known project constraints or out-of-scope boundaries.",
    "",
    "Return only:",
    "1. Phase interview questions grouped by topic.",
    "2. Recommended default answer for each question.",
    "3. Safe assumptions you can make without asking.",
    "4. Blockers or decisions that require Operator judgment.",
    "",
    "Do not generate Phase Planning Documents.",
    "Do not generate a Work Card Plan proposal.",
    "Do not generate Work Cards.",
    "Do not write implementation code.",
  ].join("\n");
}

function renderPhaseIntakeSummary(phaseIntake: PhaseIntake): string {
  return [
    `- Phase Intake ID: ${formatValue(phaseIntake.phaseIntakeId)}`,
    `- Generation mode: ${formatValue(phaseIntake.generationMode ?? "manual")}`,
    `- Project name: ${formatValue(phaseIntake.projectName)}`,
    `- Phase folder: ${formatValue(phaseIntake.phaseFolder)}`,
    `- Phase name: ${formatValue(phaseIntake.phaseName)}`,
    `- Operator next-work intent: ${formatValue(phaseIntake.operatorNextWorkIntent ?? "")}`,
    `- Operator work type: ${formatValue(phaseIntake.operatorProjectWorkType?.replace(/_/g, " ") ?? "")}`,
    `- Operator must-keep constraints or concerns: ${formatValue(phaseIntake.operatorMustKeepConstraints ?? "")}`,
    `- Phase purpose: ${formatValue(phaseIntake.phasePurpose ?? "")}`,
    `- Phase problem: ${formatValue(phaseIntake.phaseProblem)}`,
    `- Phase goal: ${formatValue(phaseIntake.phaseGoal)}`,
    `- User outcome: ${formatValue(phaseIntake.userOutcome)}`,
    `- Architect-derived scope: ${formatValue(phaseIntake.architectDerivedScope ?? "")}`,
    `- Included scope: ${formatValue(phaseIntake.includedScope)}`,
    `- Out of scope: ${formatValue(phaseIntake.outOfScope)}`,
    `- Affected screens or workflows: ${formatValue(phaseIntake.affectedScreensOrWorkflows)}`,
    `- Known constraints: ${formatValue(phaseIntake.knownConstraints)}`,
    `- Known risks: ${formatValue(phaseIntake.knownRisks)}`,
    `- Dependencies: ${formatValue(phaseIntake.dependencies)}`,
    `- Validation expectations: ${formatValue(phaseIntake.validationExpectations)}`,
    `- Assumptions: ${formatListValue(phaseIntake.assumptions)}`,
    `- Risks and drift warnings: ${formatListValue(phaseIntake.risksAndDriftWarnings)}`,
    `- Acceptance definition: ${formatValue(phaseIntake.acceptanceDefinition ?? "")}`,
    `- Recommended next step: ${formatValue(phaseIntake.recommendedNextStep ?? "")}`,
    `- Operator notes: ${formatValue(phaseIntake.operatorNotes)}`,
  ].join("\n");
}

function renderProjectPlanningContext(phaseIntake: PhaseIntake): string {
  return [
    `- Source context: ${formatValue(phaseIntake.sourceProjectPlanningDocument)}`,
    `- Source artifacts used: ${formatListValue(phaseIntake.sourceArtifactsUsed)}`,
    `- Project Intake JSON: ${formatValue(phaseIntake.sourceProjectIntakeJsonFileName ?? "")}`,
    `- Project Intake Markdown: ${formatValue(phaseIntake.sourceProjectIntakeMarkdownFileName ?? "")}`,
    `- Project Architect Interview Prompt JSON: ${formatValue(phaseIntake.sourceProjectArchitectInterviewPromptJsonFileName ?? "")}`,
    `- Project Architect Interview Prompt Markdown: ${formatValue(phaseIntake.sourceProjectArchitectInterviewPromptMarkdownFileName ?? "")}`,
    `- Project Planning Documents sidecar JSON: ${formatValue(phaseIntake.sourceProjectPlanningSidecarJsonFileName ?? "")}`,
    `- Project Planning Documents sidecar Markdown: ${formatValue(phaseIntake.sourceProjectPlanningSidecarMarkdownFileName ?? "")}`,
    `- Repository Reconciliation JSON: ${formatValue(phaseIntake.sourceRepositoryReconciliationJsonFileName ?? "")}`,
    `- Repository Reconciliation Markdown: ${formatValue(phaseIntake.sourceRepositoryReconciliationMarkdownFileName ?? "")}`,
  ].join("\n");
}

function formatValue(value: string): string {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "Not provided.";
}

function formatListValue(items: string[] | undefined): string {
  const safeItems =
    items?.map((item) => item.trim()).filter((item) => item.length > 0) ?? [];

  return safeItems.length > 0 ? safeItems.join("; ") : "Not provided.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
