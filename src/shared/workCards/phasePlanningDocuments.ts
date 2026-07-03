import type { PhaseArchitectInterviewPrompt } from "./phaseArchitectInterviewPrompt";
import {
  buildCompatibilityPhaseIntakeFromRoadmap,
  type ProjectRoadmapRecord,
} from "./projectRoadmap";
import {
  slugifyPhaseIntakeName,
  validatePhaseIntakeSlug,
  type PhaseIntake,
} from "./phaseIntake";
import type { ProjectPlanningDocumentsRecord } from "./projectPlanningDocuments";
import type { RepositoryReconciliationRecord } from "./repositoryReconciliation";
import type { MappedPhaseRecord, PhaseMapRecord } from "./phaseMap";
import {
  buildWorkCardPlanRecord,
  formatArtifactLifecycleStatus,
  formatWorkCardPlanItemStatus,
  type WorkCardPlanArtifactFileNames,
  type WorkCardPlanItem,
  type WorkCardPlanRecord,
} from "./workCardPlan";
import { validateSafePhaseFolder } from "./workCardFileNames";

export type PhasePlanningReviewStatus = "pending_review" | "approved";
export type PhasePlanningActivationStatus = "not_active" | "active";

export interface PhasePlanningDocumentsRequest {
  phaseFolder: string;
  phaseMapFileName?: string;
  mappedPhaseId?: string;
  projectPlanningDocumentFileName?: string;
  repositoryReconciliationFileName?: string;
  projectRoadmapFileName?: string;
  phaseIntakeFileName?: string;
  phaseArchitectInterviewPromptFileName?: string;
  phaseClarificationAnswers?: string;
  phaseArchitectInterviewOutput: string;
  operatorPlanAdjustments: string;
}

export interface PhasePlanningDocumentsBuildInput
  extends PhasePlanningDocumentsRequest {
  sourceProjectPlanningDocuments?: ProjectPlanningDocumentsRecord;
  sourceProjectPlanningDocumentsMarkdownFileName?: string;
  sourceRepositoryReconciliation?: RepositoryReconciliationRecord;
  sourceRepositoryReconciliationMarkdownFileName?: string;
  sourcePhaseMap?: PhaseMapRecord;
  sourcePhaseMapMarkdownFileName?: string;
  sourceMappedPhase?: MappedPhaseRecord;
  sourceProjectRoadmap?: ProjectRoadmapRecord;
  sourceProjectRoadmapMarkdownFileName?: string;
  sourcePhaseIntake?: PhaseIntake;
  sourcePhaseIntakeMarkdownFileName?: string;
  sourcePhaseArchitectInterviewPrompt?: PhaseArchitectInterviewPrompt;
  sourcePhaseArchitectInterviewPromptMarkdownFileName?: string;
}

export interface PhasePlanningDocumentsRecord {
  phasePlanningDocumentsId: string;
  projectName: string;
  phaseFolder: string;
  phaseName: string;
  sourceProjectPlanningDocument: string;
  sourceProjectPlanningSidecarJsonFileName?: string;
  sourceProjectPlanningSidecarMarkdownFileName?: string;
  sourceRepositoryReconciliationJsonFileName?: string;
  sourceRepositoryReconciliationMarkdownFileName?: string;
  sourcePhaseMapJsonFileName?: string;
  sourcePhaseMapMarkdownFileName?: string;
  sourceMappedPhaseId?: string;
  sourceProjectRoadmapJsonFileName?: string;
  sourceProjectRoadmapMarkdownFileName?: string;
  sourcePhaseIntakeJsonFileName?: string;
  sourcePhaseIntakeMarkdownFileName?: string;
  sourcePhaseArchitectInterviewPromptJsonFileName?: string;
  sourcePhaseArchitectInterviewPromptMarkdownFileName?: string;
  reviewStatus: PhasePlanningReviewStatus;
  phaseActivationStatus: PhasePlanningActivationStatus;
  artifactAuthority: string;
  formalWorkCardCreationPolicy: string;
  phaseBrief: string;
  phaseGoal: string;
  phaseUserOperatorOutcome: string;
  phaseScope: string;
  explicitOutOfScopeItems: string[];
  affectedAppScreensWorkflows: string;
  sourceProjectPlanningContext: string;
  repositoryReconciliationSummary: string;
  architectInterviewSummary: string;
  phaseAssumptions: string[];
  phaseRisks: string[];
  phaseDependencies: string[];
  validationExpectations: string[];
  recommendedImplementationSequence: string[];
  initialWorkCardPlan: WorkCardPlanItem[];
  openQuestions: string[];
  nextRecommendedAction: string;
  phaseClarificationAnswers: string;
  phaseArchitectInterviewOutput: string;
  operatorPlanAdjustments: string;
  createdAt: string;
  updatedAt: string;
}

export interface PhasePlanningDocumentsArtifactFileNames {
  slug: string;
  jsonFileName: string;
  markdownFileName: string;
}

export interface PhasePlanningDocumentsPreviewResult {
  ok: boolean;
  phasePlanningDocuments?: PhasePlanningDocumentsRecord;
  workCardPlan?: WorkCardPlanRecord;
  phasePlanningMarkdown?: string;
  workCardPlanMarkdown?: string;
  backlogMarkdown?: string;
  combinedMarkdown?: string;
  suggestedPhasePlanningFileNames?: PhasePlanningDocumentsArtifactFileNames;
  suggestedWorkCardPlanFileNames?: WorkCardPlanArtifactFileNames;
  errorMessages?: string[];
}

export interface PhasePlanningDocumentsSaveResult
  extends PhasePlanningDocumentsPreviewResult {
  savedPhasePlanningJsonFileName?: string;
  savedPhasePlanningMarkdownFileName?: string;
  phasePlanningJsonPath?: string;
  phasePlanningMarkdownPath?: string;
  savedWorkCardPlanJsonFileName?: string;
  savedWorkCardPlanMarkdownFileName?: string;
  workCardPlanJsonPath?: string;
  workCardPlanMarkdownPath?: string;
  phaseBacklogPath?: string;
}

export function buildPhasePlanningDocuments(
  input: PhasePlanningDocumentsBuildInput,
  timestamp: string,
): PhasePlanningDocumentsRecord {
  const phaseFolder = cleanText(input.phaseFolder);
  const phaseErrors = validateSafePhaseFolder(phaseFolder);

  if (phaseErrors.length > 0) {
    throw new Error(phaseErrors.join(" "));
  }

  if (!input.sourceProjectPlanningDocuments) {
    throw new Error("Select a saved Project Planning Documents source.");
  }

  if (!input.sourceRepositoryReconciliation) {
    throw new Error("Select a saved Repository Reconciliation source.");
  }

  if (
    !input.sourceMappedPhase &&
    !input.sourcePhaseIntake &&
    !input.sourceProjectRoadmap
  ) {
    throw new Error(
      "Run Phase Map Builder first, then select a mapped phase for planning.",
    );
  }

  const sourcePhaseIntake =
    input.sourcePhaseIntake ??
    (!input.sourceMappedPhase && input.sourceProjectRoadmap
      ? buildCompatibilityPhaseIntakeFromRoadmap(
          input.sourceProjectRoadmap as ProjectRoadmapRecord,
          timestamp,
        )
      : undefined);
  const phaseClarificationAnswers = cleanText(input.phaseClarificationAnswers);
  const legacyInterviewOutput = cleanText(input.phaseArchitectInterviewOutput);
  const phaseArchitectInterviewOutput =
    firstUseful([
      phaseClarificationAnswers,
      legacyInterviewOutput,
      input.sourceMappedPhase
        ? buildMappedPhaseContext(input.sourceMappedPhase)
        : undefined,
      input.sourceProjectRoadmap
        ? buildRoadmapContext(input.sourceProjectRoadmap)
        : undefined,
    ]) ||
    "No phase-specific clarification was required after roadmap and reconciliation context were evaluated.";
  const phaseName =
    firstUseful([
      input.sourceMappedPhase?.phaseTitle,
      sourcePhaseIntake?.phaseName,
      phaseFolder,
    ]) || phaseFolder;
  const fileNames = buildPhasePlanningDocumentsFileNames(phaseName);
  const extraction = extractPhasePlanningSections(phaseArchitectInterviewOutput);
  const projectName =
    cleanText(input.sourceMappedPhase?.projectName) ||
    cleanText(sourcePhaseIntake?.projectName) ||
    cleanText(input.sourceProjectPlanningDocuments.projectName) ||
    cleanText(input.sourceRepositoryReconciliation.projectName) ||
    "ChampCity A/I";
  const phaseGoal =
    firstUseful([
      input.sourceMappedPhase?.phasePurpose,
      sourcePhaseIntake?.phaseGoal,
      firstUseful(extraction.phaseGoals),
    ]) || "Not provided.";
  const phaseScope =
    firstUseful([
      input.sourceMappedPhase?.phasePurpose,
      sourcePhaseIntake?.includedScope,
      firstUseful(extraction.scopeItems),
    ]) || "Not provided.";
  const phaseRisks = uniqueNonEmpty([
    ...(input.sourceMappedPhase?.risks ?? []),
    ...(sourcePhaseIntake?.risksAndDriftWarnings ?? []),
    ...extractListField(sourcePhaseIntake?.knownRisks),
    ...input.sourceRepositoryReconciliation.currentRisks,
    ...extraction.risks,
  ]);
  const phaseDependencies = uniqueNonEmpty([
    ...(input.sourceMappedPhase?.notes ?? []),
    ...extractListField(sourcePhaseIntake?.dependencies),
    ...extraction.dependencies,
  ]);
  const validationExpectations = uniqueNonEmpty([
    ...extractListField(sourcePhaseIntake?.validationExpectations),
    input.sourceMappedPhase
      ? `Validate mapped phase ${input.sourceMappedPhase.phaseId} planning artifacts before Operator acceptance.`
      : "",
    ...extraction.validationExpectations,
  ]);
  const recommendedImplementationSequence = uniqueNonEmpty([
    ...(input.sourceMappedPhase?.plannedWorkCards.map(
      (workCard) => `${workCard.workCardIdProposal}: ${workCard.title}`,
    ) ?? []),
    ...extraction.recommendedImplementationSequence,
    ...input.sourceRepositoryReconciliation.recommendedMilestones,
  ]);
  const phasePlanningDocumentsId = `PHASE_PLANNING_DOCUMENTS_${fileNames.slug}`;
  const workCardPlan = buildWorkCardPlanRecord(
    {
      projectName,
      phaseFolder,
      phaseName,
      sourcePhasePlanningDocumentsId: phasePlanningDocumentsId,
      phaseGoal,
      phaseScope,
      phaseRisks,
      dependencies: phaseDependencies,
      validationExpectations,
      recommendedImplementationSequence,
      phaseArchitectInterviewOutput,
      operatorPlanAdjustments: input.operatorPlanAdjustments,
    },
    timestamp,
  );

  return {
    phasePlanningDocumentsId,
    projectName,
    phaseFolder,
    phaseName,
    sourceProjectPlanningDocument: `planning/project/Project_Planning_Documents/${input.projectPlanningDocumentFileName}`,
    sourceProjectPlanningSidecarJsonFileName:
      input.projectPlanningDocumentFileName,
    sourceProjectPlanningSidecarMarkdownFileName:
      input.sourceProjectPlanningDocumentsMarkdownFileName,
    sourceRepositoryReconciliationJsonFileName:
      input.repositoryReconciliationFileName,
    sourceRepositoryReconciliationMarkdownFileName:
      input.sourceRepositoryReconciliationMarkdownFileName,
    sourcePhaseMapJsonFileName: input.phaseMapFileName,
    sourcePhaseMapMarkdownFileName: input.sourcePhaseMapMarkdownFileName,
    sourceMappedPhaseId: input.sourceMappedPhase?.phaseId ?? input.mappedPhaseId,
    sourceProjectRoadmapJsonFileName: input.projectRoadmapFileName,
    sourceProjectRoadmapMarkdownFileName:
      input.sourceProjectRoadmapMarkdownFileName,
    sourcePhaseIntakeJsonFileName: input.phaseIntakeFileName,
    sourcePhaseIntakeMarkdownFileName: input.sourcePhaseIntakeMarkdownFileName,
    sourcePhaseArchitectInterviewPromptJsonFileName:
      input.phaseArchitectInterviewPromptFileName,
    sourcePhaseArchitectInterviewPromptMarkdownFileName:
      input.sourcePhaseArchitectInterviewPromptMarkdownFileName,
    reviewStatus: "pending_review",
    phaseActivationStatus: "not_active",
    artifactAuthority:
      "Phase Planning Documents = draft or approved plan for a selected phase; the phase remains Not Active until an explicit Operator activation decision.",
    formalWorkCardCreationPolicy:
      "Work Card Plans propose count, order, names, and rough intent only. Formal Work Cards require a separate Operator approval step before Implementer Prompts can be generated.",
    phaseBrief:
      firstUseful([
        firstUseful(extraction.phaseBriefs),
        input.sourceMappedPhase?.phasePurpose,
        sourcePhaseIntake?.phasePurpose,
        sourcePhaseIntake?.phaseProblem,
        input.sourceRepositoryReconciliation.recommendedNextPhase,
      ]) || "Not provided.",
    phaseGoal,
    phaseUserOperatorOutcome:
      firstUseful([
        sourcePhaseIntake?.userOutcome,
        input.sourceMappedPhase
          ? `The Operator can generate phase planning documents for ${input.sourceMappedPhase.phaseTitle} from mapped roadmap context.`
          : undefined,
        firstUseful(extraction.userOutcomes),
      ]) || "Not provided.",
    phaseScope,
    explicitOutOfScopeItems: uniqueNonEmpty([
      ...extractListField(sourcePhaseIntake?.outOfScope),
      ...extraction.outOfScopeItems,
    ]),
    affectedAppScreensWorkflows:
      firstUseful([
        sourcePhaseIntake?.affectedScreensOrWorkflows,
        firstUseful(extraction.affectedWorkflows),
      ]) || "Not provided.",
    sourceProjectPlanningContext: summarizeProjectPlanningContext(
      input.sourceProjectPlanningDocuments,
    ),
    repositoryReconciliationSummary: summarizeRepositoryReconciliation(
      input.sourceRepositoryReconciliation,
    ),
    architectInterviewSummary:
      firstUseful(extraction.architectInterviewSummaries) ||
      summarizeText(phaseArchitectInterviewOutput),
    phaseAssumptions: uniqueNonEmpty([
      ...(input.sourceMappedPhase?.assumptions ?? []),
      ...(sourcePhaseIntake?.assumptions ?? []),
      ...extraction.assumptions,
      input.sourceMappedPhase
        ? "The formal Phase Map is the selectable phase authority for this planning pass."
        : "",
      input.sourceProjectRoadmap
        ? "Project Roadmap and Phase Map are planning authorities; compatibility Phase Intake is generated only if needed internally."
        : "Phase Intake notes are constraints/context, not the sole source of roadmap truth.",
    ]),
    phaseRisks,
    phaseDependencies,
    validationExpectations,
    recommendedImplementationSequence,
    initialWorkCardPlan: workCardPlan.proposedWorkCards,
    openQuestions: uniqueNonEmpty([
      ...(input.sourceMappedPhase?.unresolvedQuestions ?? []),
      ...extraction.openQuestions,
    ]),
    nextRecommendedAction:
      firstUseful(extraction.nextActions) ||
      sourcePhaseIntake?.recommendedNextStep ||
      "Review the Phase Planning Documents and pending-review Work Card Plan, keep them Draft / Pending Review / Not Active until a Closeout activation decision, then convert selected plan items into Formal Work Cards in a later approval workflow.",
    phaseClarificationAnswers,
    phaseArchitectInterviewOutput,
    operatorPlanAdjustments: cleanText(input.operatorPlanAdjustments),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function renderPhasePlanningDocumentsMarkdown(
  record: PhasePlanningDocumentsRecord,
): string {
  return [
    `# Phase Planning Documents: ${record.phaseName}`,
    section(
      "Source Context",
      [
        `Phase Planning Documents ID: ${record.phasePlanningDocumentsId}`,
        `Project: ${record.projectName}`,
        `Phase folder: ${record.phaseFolder}`,
        `Phase name: ${record.phaseName}`,
        `Project Planning Documents JSON: ${record.sourceProjectPlanningSidecarJsonFileName ?? "Not selected."}`,
        `Project Planning Documents Markdown: ${record.sourceProjectPlanningSidecarMarkdownFileName ?? "Not found."}`,
        `Repository Reconciliation JSON: ${record.sourceRepositoryReconciliationJsonFileName ?? "Not selected."}`,
        `Repository Reconciliation Markdown: ${record.sourceRepositoryReconciliationMarkdownFileName ?? "Not found."}`,
        `Phase Map JSON: ${record.sourcePhaseMapJsonFileName ?? "Not selected."}`,
        `Phase Map Markdown: ${record.sourcePhaseMapMarkdownFileName ?? "Not found."}`,
        `Mapped phase ID: ${record.sourceMappedPhaseId ?? "Not selected."}`,
        `Project Roadmap JSON: ${record.sourceProjectRoadmapJsonFileName ?? "Not selected."}`,
        `Project Roadmap Markdown: ${record.sourceProjectRoadmapMarkdownFileName ?? "Not found."}`,
        `Phase Intake JSON: ${record.sourcePhaseIntakeJsonFileName ?? "Not selected."}`,
        `Phase Intake Markdown: ${record.sourcePhaseIntakeMarkdownFileName ?? "Not found."}`,
        `Phase Architect Interview Prompt JSON: ${record.sourcePhaseArchitectInterviewPromptJsonFileName ?? "Not selected."}`,
        `Phase Architect Interview Prompt Markdown: ${record.sourcePhaseArchitectInterviewPromptMarkdownFileName ?? "Not found."}`,
        `Review status: ${formatReviewStatus(record.reviewStatus)}`,
        `Phase activation status: ${formatPhaseActivationStatus(record.phaseActivationStatus)}`,
        `Created: ${record.createdAt}`,
        `Updated: ${record.updatedAt}`,
      ].join("\n"),
    ),
    section("Artifact Authority", record.artifactAuthority),
    section("Formal Work Card Boundary", record.formalWorkCardCreationPolicy),
    section("Phase Brief", record.phaseBrief),
    section("Phase Goal", record.phaseGoal),
    section("Phase User/Operator Outcome", record.phaseUserOperatorOutcome),
    section("Phase Scope", record.phaseScope),
    section(
      "Explicit Out-Of-Scope Items",
      formatListOrFallback(record.explicitOutOfScopeItems, "Not provided."),
    ),
    section("Affected App Screens/Workflows", record.affectedAppScreensWorkflows),
    section("Source Project Planning Context", record.sourceProjectPlanningContext),
    section("Repository Reconciliation Summary", record.repositoryReconciliationSummary),
    section(
      "Clarification / Legacy Interview Summary",
      record.architectInterviewSummary,
    ),
    section(
      "Phase Assumptions",
      formatListOrFallback(record.phaseAssumptions, "Not provided."),
    ),
    section(
      "Phase Risks",
      formatListOrFallback(record.phaseRisks, "Not provided."),
    ),
    section(
      "Phase Dependencies",
      formatListOrFallback(record.phaseDependencies, "Not provided."),
    ),
    section(
      "Validation Expectations",
      formatListOrFallback(record.validationExpectations, "Not provided."),
    ),
    section(
      "Recommended Implementation Sequence",
      formatNumberedListOrFallback(
        record.recommendedImplementationSequence,
        "Not provided.",
      ),
    ),
    section(
      "Proposed Work Card Plan",
      record.initialWorkCardPlan.map(renderInitialPlanItem).join("\n\n"),
    ),
    section(
      "Open Questions",
      formatListOrFallback(record.openQuestions, "Not provided."),
    ),
    section("Next Recommended Action", record.nextRecommendedAction),
    section(
      "Phase-Specific Clarification Answers",
      record.phaseClarificationAnswers,
    ),
    section(
      "Clarification / Legacy Interview Context",
      record.phaseArchitectInterviewOutput,
    ),
  ].join("\n\n") + "\n";
}

export function buildPhasePlanningDocumentsFileNames(
  phaseNameOrFolder: string,
): PhasePlanningDocumentsArtifactFileNames {
  const slug = slugifyPhaseIntakeName(phaseNameOrFolder);
  const slugErrors = validatePhaseIntakeSlug(slug);

  if (slugErrors.length > 0) {
    throw new Error(slugErrors.join(" "));
  }

  return {
    slug,
    jsonFileName: `PHASE_PLANNING_DOCUMENTS_${slug}.json`,
    markdownFileName: `PHASE_PLANNING_DOCUMENTS_${slug}.md`,
  };
}

export function validatePhasePlanningDocumentsArtifactFileName(
  fileName: string,
): string[] {
  const value = cleanText(fileName);

  if (value.length === 0) {
    return ["Phase Planning Documents filenames must not be blank."];
  }

  if (value.includes("..") || /[\\/:\s]/.test(value)) {
    return [
      "Phase Planning Documents filenames must not include folders or absolute paths.",
    ];
  }

  if (!/^PHASE_PLANNING_DOCUMENTS_[a-z0-9][a-z0-9_]*\.(json|md)$/.test(value)) {
    return [
      "Phase Planning Documents artifacts must be named PHASE_PLANNING_DOCUMENTS_<slug>.json or PHASE_PLANNING_DOCUMENTS_<slug>.md.",
    ];
  }

  return [];
}

export function validatePhasePlanningDocumentsRecord(candidate: unknown): string[] {
  const errors: string[] = [];

  if (!isRecord(candidate)) {
    return ["Phase Planning Documents JSON must be an object."];
  }

  for (const field of [
    "phasePlanningDocumentsId",
    "projectName",
    "phaseFolder",
    "phaseName",
    "sourceProjectPlanningDocument",
    "phaseBrief",
    "phaseGoal",
    "phaseUserOperatorOutcome",
    "phaseScope",
    "affectedAppScreensWorkflows",
    "sourceProjectPlanningContext",
    "repositoryReconciliationSummary",
    "architectInterviewSummary",
    "nextRecommendedAction",
    "phaseClarificationAnswers",
    "phaseArchitectInterviewOutput",
    "operatorPlanAdjustments",
    "createdAt",
    "updatedAt",
  ] as const) {
    const value = candidate[field];

    if (typeof value !== "string") {
      errors.push(`${field} must be saved as text.`);
    }
  }

  if (typeof candidate.phaseFolder === "string") {
    errors.push(...validateSafePhaseFolder(candidate.phaseFolder));
  }

  for (const field of [
    "explicitOutOfScopeItems",
    "phaseAssumptions",
    "phaseRisks",
    "phaseDependencies",
    "validationExpectations",
    "recommendedImplementationSequence",
    "initialWorkCardPlan",
    "openQuestions",
  ] as const) {
    if (!Array.isArray(candidate[field])) {
      errors.push(`${field} must be saved as a list.`);
    }
  }

  if (
    "reviewStatus" in candidate &&
    typeof candidate.reviewStatus === "string" &&
    !isPhasePlanningReviewStatus(candidate.reviewStatus)
  ) {
    errors.push("reviewStatus is not supported.");
  }

  if (
    "phaseActivationStatus" in candidate &&
    typeof candidate.phaseActivationStatus === "string" &&
    !isPhasePlanningActivationStatus(candidate.phaseActivationStatus)
  ) {
    errors.push("phaseActivationStatus is not supported.");
  }

  return errors;
}

export function buildCombinedPhasePlanningMarkdown(
  phasePlanningMarkdown: string,
  workCardPlanMarkdown: string,
  backlogMarkdown: string,
): string {
  return [
    phasePlanningMarkdown.trim(),
    "---",
    workCardPlanMarkdown.trim(),
    "---",
    backlogMarkdown.trim(),
  ].join("\n\n") + "\n";
}

function extractPhasePlanningSections(output: string): {
  phaseBriefs: string[];
  phaseGoals: string[];
  userOutcomes: string[];
  scopeItems: string[];
  outOfScopeItems: string[];
  affectedWorkflows: string[];
  architectInterviewSummaries: string[];
  assumptions: string[];
  risks: string[];
  dependencies: string[];
  validationExpectations: string[];
  recommendedImplementationSequence: string[];
  openQuestions: string[];
  nextActions: string[];
} {
  return {
    phaseBriefs: extractNamedSection(output, ["phase brief", "brief"]),
    phaseGoals: extractNamedSection(output, ["phase goal", "goal"]),
    userOutcomes: extractNamedSection(output, [
      "user outcome",
      "operator outcome",
      "outcome",
    ]),
    scopeItems: extractNamedSection(output, ["phase scope", "included scope", "scope"]),
    outOfScopeItems: extractNamedSection(output, [
      "out of scope",
      "explicit out",
      "non-goal",
    ]),
    affectedWorkflows: extractNamedSection(output, [
      "affected screen",
      "affected workflow",
      "workflow",
    ]),
    architectInterviewSummaries: extractNamedSection(output, [
      "architect interview summary",
      "interview summary",
      "summary",
    ]),
    assumptions: extractNamedSection(output, ["assumption", "safe assumption"]),
    risks: uniqueNonEmpty([
      ...extractNamedSection(output, ["risk", "warning", "drift"]),
      ...extractLinesByPattern(output, /\b(risk|warning|drift|security)\b/i),
    ]),
    dependencies: extractNamedSection(output, ["dependency", "dependencies"]),
    validationExpectations: extractNamedSection(output, [
      "validation expectation",
      "validation",
      "test",
    ]),
    recommendedImplementationSequence: extractNamedSection(output, [
      "recommended implementation sequence",
      "implementation sequence",
      "sequence",
      "ordering",
    ]),
    openQuestions: uniqueNonEmpty([
      ...extractNamedSection(output, ["open question", "question"]),
      ...extractLinesByPattern(output, /\?/),
    ]),
    nextActions: extractNamedSection(output, ["next recommended action", "next action"]),
  };
}

function buildMappedPhaseContext(phase: MappedPhaseRecord): string {
  return [
    `Mapped phase: ${phase.phaseId} - ${phase.phaseTitle}`,
    `Purpose: ${phase.phasePurpose}`,
    `Status: ${phase.status}`,
    `Notes: ${formatInlineList(phase.notes)}`,
    `Assumptions: ${formatInlineList(phase.assumptions)}`,
    `Risks: ${formatInlineList(phase.risks)}`,
    `Unresolved questions: ${formatInlineList(phase.unresolvedQuestions)}`,
    `Planned Work Cards: ${formatInlineList(
      phase.plannedWorkCards.map(
        (workCard) => `${workCard.workCardIdProposal}: ${workCard.title}`,
      ),
    )}`,
  ].join("\n");
}

function buildRoadmapContext(roadmap: ProjectRoadmapRecord): string {
  return [
    `Project Roadmap: ${roadmap.roadmapId}`,
    `Next recommended phase: ${roadmap.nextExecutablePhase.phaseFolder} - ${roadmap.nextExecutablePhase.phaseTitle}`,
    `Action: ${roadmap.nextExecutablePhase.actionSummary}`,
    `Rationale: ${roadmap.nextExecutablePhase.rationale}`,
    `Clarification questions: ${formatInlineList(
      roadmap.operatorClarificationQuestions.map(
        (question) => question.question,
      ),
    )}`,
  ].join("\n");
}

function summarizeProjectPlanningContext(
  record: ProjectPlanningDocumentsRecord,
): string {
  const phaseCandidates = record.extracted.initialPhaseCandidates;
  const facts = record.extracted.confirmedFacts;

  return [
    `Project Planning Documents record: ${record.recordId}`,
    `Project: ${record.projectName}`,
    `Confirmed facts: ${formatInlineList(facts)}`,
    `Initial phase candidates: ${formatInlineList(phaseCandidates)}`,
  ].join("\n");
}

function summarizeRepositoryReconciliation(
  record: RepositoryReconciliationRecord,
): string {
  return [
    `Repository Reconciliation: ${record.reconciliationId}`,
    `Implemented state: ${record.implementedStateSummary}`,
    `Recommended next phase: ${record.recommendedNextPhase}`,
    `Current risks: ${formatInlineList(record.currentRisks)}`,
  ].join("\n");
}

function summarizeText(value: string): string {
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, 6);

  return lines.length > 0 ? lines.join("\n") : "Not provided.";
}

function extractListField(value: string | undefined): string[] {
  return cleanText(value)
    .split(/\r?\n|;/)
    .map((line) => cleanListLine(line.trim()))
    .filter((line) => line.length > 0);
}

function extractNamedSection(output: string, keys: string[]): string[] {
  const lines = output.split(/\r?\n/);
  const collected: string[] = [];
  let active = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line.length === 0) {
      continue;
    }

    if (isLikelyHeading(line)) {
      const heading = normalizeHeading(line);
      active = keys.some((key) => heading.includes(key));

      if (active && headingHasInlineValue(line)) {
        const [, value] = line.replace(/^#+\s*/, "").split(/:\s+/, 2);

        if (value) {
          collected.push(cleanListLine(value));
        }
      }

      continue;
    }

    if (active) {
      collected.push(cleanListLine(line));
    }
  }

  return uniqueNonEmpty(collected).slice(0, 14);
}

function extractLinesByPattern(output: string, pattern: RegExp): string[] {
  return uniqueNonEmpty(
    output
      .split(/\r?\n/)
      .map((line) => cleanListLine(line.trim()))
      .filter((line) => line.length > 0 && pattern.test(line)),
  ).slice(0, 12);
}

function renderInitialPlanItem(item: WorkCardPlanItem): string {
  return [
    `### ${item.workCardIdProposal}: ${item.title}`,
    "",
    `- Plan status: ${formatArtifactLifecycleStatus(item.planStatus ?? "proposed")}`,
    `- Reconciliation status: ${formatWorkCardPlanItemStatus(item.reconciliationStatus ?? "planned")}`,
    `- Executable status: Not Executable`,
    `- Problem: ${item.problem}`,
    `- User outcome: ${item.userOutcome}`,
    `- Included scope: ${item.includedScope}`,
    `- Out of scope: ${item.outOfScope}`,
    `- Dependencies: ${item.dependencies}`,
    `- Risk level: ${item.riskLevel}`,
    `- Validation items: ${item.validationItems.join("; ")}`,
    `- Suggested ordering: ${item.suggestedOrdering}`,
    `- Notes for Architect/Implementer: ${item.notesForArchitectImplementer}`,
  ].join("\n");
}

function isLikelyHeading(line: string): boolean {
  if (/^#{1,6}\s+\S/.test(line)) {
    return true;
  }

  if (/^\*{0,2}\d+[.)]\s+[^:]+:?/.test(line)) {
    return true;
  }

  if (/^[A-Z][A-Za-z /-]{2,100}:$/.test(line)) {
    return true;
  }

  return /^[*-]\s+\*\*[^*]+:\*\*/.test(line);
}

function headingHasInlineValue(line: string): boolean {
  return /:\s+\S/.test(line);
}

function normalizeHeading(line: string): string {
  return line
    .toLowerCase()
    .replace(/^#+\s*/, "")
    .replace(/^[*-]\s+/, "")
    .replace(/^\d+[.)]\s+/, "")
    .replace(/\*\*/g, "")
    .replace(/:.*$/, "")
    .trim();
}

function cleanListLine(line: string): string {
  return line
    .replace(/^[-*]\s+/, "")
    .replace(/^\d+[.)]\s+/, "")
    .replace(/^\*\*([^*]+)\*\*:\s*/, "$1: ")
    .trim()
    .slice(0, 420);
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

function formatInlineList(items: string[]): string {
  return items.length > 0 ? items.join("; ") : "Not provided.";
}

function formatListOrFallback(items: string[], fallback: string): string {
  if (items.length === 0) {
    return `- ${fallback}`;
  }

  return items.map((item) => `- ${item}`).join("\n");
}

function formatNumberedListOrFallback(items: string[], fallback: string): string {
  if (items.length === 0) {
    return `1. ${fallback}`;
  }

  return items.map((item, index) => `${index + 1}. ${item}`).join("\n");
}

function section(title: string, body: string): string {
  return `## ${title}\n\n${body.trim().length > 0 ? body : "Not provided."}`;
}

function formatReviewStatus(status: PhasePlanningReviewStatus): string {
  return status === "pending_review" ? "Pending Review" : "Approved";
}

function formatPhaseActivationStatus(
  status: PhasePlanningActivationStatus,
): string {
  return status === "not_active" ? "Not Active" : "Active";
}

function isPhasePlanningReviewStatus(
  value: string,
): value is PhasePlanningReviewStatus {
  return value === "pending_review" || value === "approved";
}

function isPhasePlanningActivationStatus(
  value: string,
): value is PhasePlanningActivationStatus {
  return value === "not_active" || value === "active";
}

function cleanText(value: string | undefined): string {
  return value?.trim() ?? "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
