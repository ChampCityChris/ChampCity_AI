import { validateSafePhaseFolder } from "./workCardFileNames";
import type { ProjectIntake } from "./projectIntake";
import type { ProjectArchitectInterviewPrompt } from "./projectArchitectInterviewPrompt";
import type { ProjectPlanningDocumentsRecord } from "./projectPlanningDocuments";
import type { RepositoryReconciliationRecord } from "./repositoryReconciliation";

export const phaseIntakeGenerationModes = ["architect-led", "manual"] as const;

export type PhaseIntakeGenerationMode =
  (typeof phaseIntakeGenerationModes)[number];

export const phaseIntakeWorkTypes = [
  "new_project",
  "ongoing_project",
  "repair_pass",
  "ui_pass",
  "validation_pass",
  "planning_pass",
] as const;

export type PhaseIntakeWorkType = (typeof phaseIntakeWorkTypes)[number];

export interface PhaseIntake {
  phaseIntakeId: string;
  phaseFolder: string;
  phaseName: string;
  projectName: string;
  generationMode?: PhaseIntakeGenerationMode;
  sourceProjectPlanningDocument: string;
  sourceArtifactsUsed?: string[];
  sourceProjectIntakeJsonFileName?: string;
  sourceProjectIntakeMarkdownFileName?: string;
  sourceProjectArchitectInterviewPromptJsonFileName?: string;
  sourceProjectArchitectInterviewPromptMarkdownFileName?: string;
  sourceProjectPlanningSidecarJsonFileName?: string;
  sourceProjectPlanningSidecarMarkdownFileName?: string;
  sourceRepositoryReconciliationJsonFileName?: string;
  sourceRepositoryReconciliationMarkdownFileName?: string;
  sourceExistingPhaseIntakeJsonFileName?: string;
  sourceExistingPhaseIntakeMarkdownFileName?: string;
  operatorNextWorkIntent?: string;
  operatorProjectWorkType?: PhaseIntakeWorkType;
  operatorMustKeepConstraints?: string;
  phasePurpose?: string;
  phaseProblem: string;
  phaseGoal: string;
  userOutcome: string;
  architectDerivedScope?: string;
  includedScope: string;
  outOfScope: string;
  affectedScreensOrWorkflows: string;
  knownConstraints: string;
  knownRisks: string;
  dependencies: string;
  validationExpectations: string;
  assumptions?: string[];
  risksAndDriftWarnings?: string[];
  acceptanceDefinition?: string;
  recommendedNextStep?: string;
  operatorNotes: string;
  createdAt: string;
  updatedAt: string;
}

export interface PhaseIntakeInput {
  phaseFolder: string;
  phaseName: string;
  projectName: string;
  generationMode?: PhaseIntakeGenerationMode;
  projectIntakeFileName?: string;
  projectArchitectInterviewPromptFileName?: string;
  sourceProjectPlanningSidecarJsonFileName?: string;
  repositoryReconciliationFileName?: string;
  existingPhaseIntakeFileName?: string;
  operatorNextWorkIntent?: string;
  operatorProjectWorkType?: PhaseIntakeWorkType;
  operatorMustKeepConstraints?: string;
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

export interface ArchitectLedPhaseIntakeBuildInput extends PhaseIntakeInput {
  sourceProjectIntake?: ProjectIntake;
  sourceProjectIntakeJsonFileName?: string;
  sourceProjectIntakeMarkdownFileName?: string;
  sourceProjectArchitectInterviewPrompt?: ProjectArchitectInterviewPrompt;
  sourceProjectArchitectInterviewPromptJsonFileName?: string;
  sourceProjectArchitectInterviewPromptMarkdownFileName?: string;
  sourceProjectPlanningDocuments?: ProjectPlanningDocumentsRecord;
  sourceProjectPlanningSidecarMarkdownFileName?: string;
  sourceRepositoryReconciliation?: RepositoryReconciliationRecord;
  sourceRepositoryReconciliationMarkdownFileName?: string;
  sourceExistingPhaseIntake?: PhaseIntake;
  sourceExistingPhaseIntakeMarkdownFileName?: string;
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
    generationMode: input.generationMode ?? "manual",
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

export function buildArchitectLedPhaseIntake(
  input: ArchitectLedPhaseIntakeBuildInput,
  timestamp: string,
): PhaseIntake {
  const phaseFolder = cleanText(input.phaseFolder);
  const phaseErrors = validateSafePhaseFolder(phaseFolder);

  if (phaseErrors.length > 0) {
    throw new Error(phaseErrors.join(" "));
  }

  const operatorNextWorkIntent = cleanText(input.operatorNextWorkIntent);

  if (operatorNextWorkIntent.length === 0) {
    throw new Error("Describe what you want to work on next.");
  }

  const operatorProjectWorkType =
    input.operatorProjectWorkType && isPhaseIntakeWorkType(input.operatorProjectWorkType)
      ? input.operatorProjectWorkType
      : "ongoing_project";
  const operatorMustKeepConstraints = cleanText(input.operatorMustKeepConstraints);
  const projectName =
    firstUseful([
      input.projectName,
      input.sourceProjectPlanningDocuments?.projectName,
      input.sourceProjectIntake?.projectName,
      input.sourceProjectArchitectInterviewPrompt?.projectName,
      input.sourceRepositoryReconciliation?.projectName,
      input.sourceExistingPhaseIntake?.projectName,
      "ChampCity A/I",
    ]) ?? "ChampCity A/I";
  const phaseName =
    firstUseful([
      input.phaseName,
      usefulReconciliationNextPhase(input.sourceRepositoryReconciliation),
      firstUseful(input.sourceProjectPlanningDocuments?.extracted.initialPhaseCandidates ?? []),
      input.sourceExistingPhaseIntake?.phaseName,
      buildFallbackPhaseName(phaseFolder, operatorProjectWorkType),
    ]) ?? buildFallbackPhaseName(phaseFolder, operatorProjectWorkType);
  const fileNames = buildPhaseIntakeFileNames(phaseName);
  const sourceProjectPlanningSidecarJsonFileName = cleanText(
    input.sourceProjectPlanningSidecarJsonFileName ?? "",
  );
  const sourceProjectPlanningSidecarMarkdownFileName = cleanText(
    input.sourceProjectPlanningSidecarMarkdownFileName ?? "",
  );
  const sourceArtifactsUsed = buildSourceArtifactsUsed(input);
  const sourceProjectPlanningDocument =
    sourceProjectPlanningSidecarJsonFileName.length > 0
      ? `planning/project/Project_Planning_Documents/${sourceProjectPlanningSidecarJsonFileName}`
      : "Current project planning documents under planning/project/.";
  const phasePurpose = buildPhasePurpose(
    operatorNextWorkIntent,
    operatorProjectWorkType,
  );
  const architectDerivedScope = buildArchitectDerivedScope(input, operatorNextWorkIntent);
  const outOfScope = buildOutOfScope(input, operatorProjectWorkType);
  const assumptions = buildArchitectLedAssumptions(input, sourceArtifactsUsed);
  const risksAndDriftWarnings = buildArchitectLedRisks(input, operatorProjectWorkType);
  const validationExpectations = buildValidationExpectations(
    input,
    operatorProjectWorkType,
  );
  const acceptanceDefinition = buildAcceptanceDefinition(
    input,
    operatorNextWorkIntent,
    operatorProjectWorkType,
  );
  const recommendedNextStep = buildRecommendedNextStep(
    input,
    operatorProjectWorkType,
  );

  return {
    phaseIntakeId: `PHASE_INTAKE_${fileNames.slug}`,
    phaseFolder,
    phaseName,
    projectName,
    generationMode: "architect-led",
    sourceProjectPlanningDocument,
    sourceArtifactsUsed,
    sourceProjectIntakeJsonFileName:
      cleanText(input.sourceProjectIntakeJsonFileName ?? "") || undefined,
    sourceProjectIntakeMarkdownFileName:
      cleanText(input.sourceProjectIntakeMarkdownFileName ?? "") || undefined,
    sourceProjectArchitectInterviewPromptJsonFileName:
      cleanText(input.sourceProjectArchitectInterviewPromptJsonFileName ?? "") ||
      undefined,
    sourceProjectArchitectInterviewPromptMarkdownFileName:
      cleanText(
        input.sourceProjectArchitectInterviewPromptMarkdownFileName ?? "",
      ) || undefined,
    sourceProjectPlanningSidecarJsonFileName:
      sourceProjectPlanningSidecarJsonFileName || undefined,
    sourceProjectPlanningSidecarMarkdownFileName:
      sourceProjectPlanningSidecarMarkdownFileName || undefined,
    sourceRepositoryReconciliationJsonFileName:
      cleanText(input.repositoryReconciliationFileName ?? "") || undefined,
    sourceRepositoryReconciliationMarkdownFileName:
      cleanText(input.sourceRepositoryReconciliationMarkdownFileName ?? "") ||
      undefined,
    sourceExistingPhaseIntakeJsonFileName:
      cleanText(input.existingPhaseIntakeFileName ?? "") || undefined,
    sourceExistingPhaseIntakeMarkdownFileName:
      cleanText(input.sourceExistingPhaseIntakeMarkdownFileName ?? "") ||
      undefined,
    operatorNextWorkIntent,
    operatorProjectWorkType,
    operatorMustKeepConstraints,
    phasePurpose,
    phaseProblem: buildPhaseProblem(input, operatorNextWorkIntent),
    phaseGoal: phasePurpose,
    userOutcome: acceptanceDefinition,
    architectDerivedScope,
    includedScope: architectDerivedScope,
    outOfScope,
    affectedScreensOrWorkflows: buildAffectedWorkflows(input, operatorNextWorkIntent),
    knownConstraints: buildKnownConstraints(input, operatorMustKeepConstraints),
    knownRisks: formatListForField(risksAndDriftWarnings),
    dependencies: buildDependencies(input, sourceArtifactsUsed),
    validationExpectations,
    assumptions,
    risksAndDriftWarnings,
    acceptanceDefinition,
    recommendedNextStep,
    operatorNotes: buildOperatorNotes(input),
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

export function validatePhaseIntakeGenerationMode(
  generationMode: string,
): string[] {
  return isPhaseIntakeGenerationMode(generationMode)
    ? []
    : ["Phase Intake generation mode is not supported."];
}

export function validatePhaseIntakeWorkType(workType: string): string[] {
  return isPhaseIntakeWorkType(workType)
    ? []
    : ["Phase Intake work type is not supported."];
}

export function isPhaseIntakeGenerationMode(
  value: string,
): value is PhaseIntakeGenerationMode {
  return phaseIntakeGenerationModes.includes(value as PhaseIntakeGenerationMode);
}

export function isPhaseIntakeWorkType(value: string): value is PhaseIntakeWorkType {
  return phaseIntakeWorkTypes.includes(value as PhaseIntakeWorkType);
}

function buildSourceArtifactsUsed(input: ArchitectLedPhaseIntakeBuildInput): string[] {
  return uniqueNonEmpty([
    input.sourceProjectIntake
      ? `Project Intake: ${input.sourceProjectIntakeJsonFileName ?? "selected"}`
      : "",
    input.sourceProjectArchitectInterviewPrompt
      ? `Project Architect Interview Prompt: ${input.sourceProjectArchitectInterviewPromptJsonFileName ?? "selected"}`
      : "",
    input.sourceProjectPlanningDocuments
      ? `Project Planning Documents: ${input.sourceProjectPlanningSidecarJsonFileName ?? "selected"}`
      : "Current project planning Markdown under planning/project/.",
    input.sourceRepositoryReconciliation
      ? `Repository Reconciliation: ${input.repositoryReconciliationFileName ?? "selected"}`
      : "",
    input.sourceExistingPhaseIntake
      ? `Existing Phase Intake editable source: ${input.existingPhaseIntakeFileName ?? "selected"}`
      : "",
  ]);
}

function buildPhasePurpose(
  operatorNextWorkIntent: string,
  workType: PhaseIntakeWorkType,
): string {
  return `Turn the operator's ${formatWorkType(workType)} intent into a bounded phase: ${operatorNextWorkIntent}`;
}

function buildPhaseProblem(
  input: ArchitectLedPhaseIntakeBuildInput,
  operatorNextWorkIntent: string,
): string {
  return firstUseful([
    input.sourceExistingPhaseIntake?.phaseProblem,
    `The Operator wants to work on: ${operatorNextWorkIntent}`,
    input.sourceRepositoryReconciliation?.recommendedNextPhase,
  ]) ?? `The Operator wants to work on: ${operatorNextWorkIntent}`;
}

function buildArchitectDerivedScope(
  input: ArchitectLedPhaseIntakeBuildInput,
  operatorNextWorkIntent: string,
): string {
  return formatListForField(
    uniqueNonEmpty([
      `Primary operator intent: ${operatorNextWorkIntent}`,
      input.sourceRepositoryReconciliation?.recommendedNextPhase
        ? `Use repository reconciliation next-phase guidance: ${input.sourceRepositoryReconciliation.recommendedNextPhase}`
        : "",
      ...takeItems(input.sourceRepositoryReconciliation?.recommendedMilestones, 5).map(
        (item) => `Recommended milestone: ${item}`,
      ),
      ...takeItems(input.sourceProjectPlanningDocuments?.extracted.initialPhaseCandidates, 4).map(
        (item) => `Project plan phase candidate: ${item}`,
      ),
      input.sourceExistingPhaseIntake?.includedScope
        ? `Editable source scope: ${input.sourceExistingPhaseIntake.includedScope}`
        : "",
    ]),
  );
}

function buildOutOfScope(
  input: ArchitectLedPhaseIntakeBuildInput,
  workType: PhaseIntakeWorkType,
): string {
  const base = [
    "Do not create formal Work Card JSON artifacts from Phase Intake alone.",
    "Do not perform Operator acceptance, Human Validation approval, phase closeout, release, tag, push, auth, database, cloud, provider SDK, connector, MCP, or deployment work.",
  ];

  if (workType !== "validation_pass") {
    base.push("Do not claim manual validation or acceptance has been completed.");
  }

  return formatListForField(
    uniqueNonEmpty([
      ...base,
      input.sourceProjectIntake?.nonGoals
        ? `Project non-goal: ${input.sourceProjectIntake.nonGoals}`
        : "",
      input.sourceExistingPhaseIntake?.outOfScope
        ? `Editable source out-of-scope: ${input.sourceExistingPhaseIntake.outOfScope}`
        : "",
    ]),
  );
}

function buildArchitectLedAssumptions(
  input: ArchitectLedPhaseIntakeBuildInput,
  sourceArtifactsUsed: string[],
): string[] {
  return uniqueNonEmpty([
    "This Phase Intake is generated from prior durable artifacts plus the Operator's plain-language intent.",
    sourceArtifactsUsed.length > 0
      ? "Source artifacts are treated as planning context, not as proof of Operator acceptance."
      : "",
    input.sourceRepositoryReconciliation
      ? "Repository Reconciliation is available and should inform phase ordering."
      : "No Repository Reconciliation source was selected; for ongoing or partially implemented projects, complete Reconcile / Project State Review before relying on phase scope.",
    input.sourceExistingPhaseIntake
      ? "The selected existing Phase Intake is an editable source, not the sole source of truth."
      : "",
  ]);
}

function buildArchitectLedRisks(
  input: ArchitectLedPhaseIntakeBuildInput,
  workType: PhaseIntakeWorkType,
): string[] {
  return uniqueNonEmpty([
    ...takeItems(input.sourceRepositoryReconciliation?.currentRisks, 8),
    ...takeItems(input.sourceProjectPlanningDocuments?.extracted.risksAndWarnings, 8),
    input.operatorMustKeepConstraints
      ? `Operator concern: ${input.operatorMustKeepConstraints}`
      : "",
    !input.sourceRepositoryReconciliation && workType !== "new_project"
      ? "Ongoing or partially implemented work can drift if Repository Reconciliation is skipped."
      : "",
    "Generated Phase Intake can still need Operator review before Phase Interview and Phase Plan generation.",
  ]);
}

function buildValidationExpectations(
  input: ArchitectLedPhaseIntakeBuildInput,
  workType: PhaseIntakeWorkType,
): string {
  const defaults =
    workType === "validation_pass"
      ? [
          "Confirm the selected validation workflow is reachable.",
          "Record remaining Operator manual validation steps without marking acceptance.",
          "Run available automated checks before reporting completion.",
        ]
      : [
          "Run available automated checks before reporting completion.",
          "Keep Operator manual validation separate from Implementer checks.",
          "Save durable JSON and Markdown artifacts for generated planning records.",
        ];

  return formatListForField(
    uniqueNonEmpty([
      input.sourceExistingPhaseIntake?.validationExpectations ?? "",
      ...defaults,
    ]),
  );
}

function buildAcceptanceDefinition(
  input: ArchitectLedPhaseIntakeBuildInput,
  operatorNextWorkIntent: string,
  workType: PhaseIntakeWorkType,
): string {
  return firstUseful([
    input.sourceExistingPhaseIntake?.userOutcome,
    `The Operator can move from "${operatorNextWorkIntent}" into a clear ${formatWorkType(workType)} phase without inventing technical scope by hand.`,
  ]) as string;
}

function buildRecommendedNextStep(
  input: ArchitectLedPhaseIntakeBuildInput,
  workType: PhaseIntakeWorkType,
): string {
  if (!input.sourceRepositoryReconciliation && workType !== "new_project") {
    return "Complete Reconcile / Project State Review, then use this generated Phase Intake to run the Phase Interview.";
  }

  return "Use this generated Phase Intake to run the Phase Interview, then generate Phase Planning Documents from the saved Phase Intake and completed Phase Interview output.";
}

function buildAffectedWorkflows(
  input: ArchitectLedPhaseIntakeBuildInput,
  operatorNextWorkIntent: string,
): string {
  return formatListForField(
    uniqueNonEmpty([
      input.sourceExistingPhaseIntake?.affectedScreensOrWorkflows ?? "",
      inferWorkflowFromIntent(operatorNextWorkIntent),
      "Architect workflow: Reconcile / Project State Review, Phase Intake, Phase Interview, Phase Plan, Capture.",
    ]),
  );
}

function buildKnownConstraints(
  input: ArchitectLedPhaseIntakeBuildInput,
  operatorMustKeepConstraints: string,
): string {
  return formatListForField(
    uniqueNonEmpty([
      operatorMustKeepConstraints,
      input.sourceProjectIntake?.knownConstraints ?? "",
      input.sourceProjectIntake?.securityOrDataConcerns
        ? `Security/data concern: ${input.sourceProjectIntake.securityOrDataConcerns}`
        : "",
      input.sourceExistingPhaseIntake?.knownConstraints ?? "",
      "Keep renderer filesystem access mediated through constrained Electron main/preload IPC.",
      "Do not add LLM API calls, provider SDKs, databases, auth, cloud services, connector integrations, browser automation, or MCP passthrough in this foundation workflow.",
    ]),
  );
}

function buildDependencies(
  input: ArchitectLedPhaseIntakeBuildInput,
  sourceArtifactsUsed: string[],
): string {
  return formatListForField(
    uniqueNonEmpty([
      ...sourceArtifactsUsed,
      input.sourceExistingPhaseIntake?.dependencies ?? "",
      input.sourceRepositoryReconciliation
        ? "Repository Reconciliation informs the phase map and next-phase recommendation."
        : "",
    ]),
  );
}

function buildOperatorNotes(input: ArchitectLedPhaseIntakeBuildInput): string {
  return formatListForField(
    uniqueNonEmpty([
      input.operatorNextWorkIntent
        ? `What to work on next: ${input.operatorNextWorkIntent}`
        : "",
      input.operatorProjectWorkType
        ? `Work type: ${formatWorkType(input.operatorProjectWorkType)}`
        : "",
      input.operatorMustKeepConstraints
        ? `Must-keep constraints or concerns: ${input.operatorMustKeepConstraints}`
        : "",
      input.operatorNotes,
    ]),
  );
}

function usefulReconciliationNextPhase(
  reconciliation: RepositoryReconciliationRecord | undefined,
): string | undefined {
  const value = reconciliation?.recommendedNextPhase.trim() ?? "";

  return value.length > 0 && value.toLowerCase() !== "not provided."
    ? value
    : undefined;
}

function buildFallbackPhaseName(
  phaseFolder: string,
  workType: PhaseIntakeWorkType,
): string {
  return `${phaseFolder} ${formatWorkType(workType)} phase`;
}

function inferWorkflowFromIntent(intent: string): string {
  const normalized = intent.toLowerCase();
  const matches = [
    normalized.includes("intake") ? "Project or Phase Intake" : "",
    normalized.includes("interview") ? "Architect Interview" : "",
    normalized.includes("plan") ? "Project Plan or Phase Plan" : "",
    normalized.includes("reconcile") || normalized.includes("state")
      ? "Reconcile / Project State Review"
      : "",
    normalized.includes("validation") || normalized.includes("validate")
      ? "Human Validation"
      : "",
    normalized.includes("ui") || normalized.includes("screen")
      ? "Renderer UI workflow"
      : "",
  ];

  return firstUseful(matches) ?? "To be confirmed during Phase Interview.";
}

function formatWorkType(workType: PhaseIntakeWorkType): string {
  return workType.replace(/_/g, " ");
}

function formatListForField(items: string[]): string;
function formatListForField(value: string): string;
function formatListForField(value: string[] | string): string {
  if (typeof value === "string") {
    return value.trim();
  }

  return value.map((item) => `- ${item}`).join("\n");
}

function takeItems(items: string[] | undefined, count: number): string[] {
  return (items ?? []).slice(0, count);
}

function firstUseful(values: Array<string | undefined>): string | undefined {
  return values
    .map((value) => value?.trim() ?? "")
    .find((value) => value.length > 0);
}

function uniqueNonEmpty(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of items) {
    const trimmed = item.trim();
    const key = trimmed.toLowerCase();

    if (trimmed.length === 0 || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(trimmed);
  }

  return result;
}

function cleanText(value: string | undefined): string {
  return value?.trim() ?? "";
}
