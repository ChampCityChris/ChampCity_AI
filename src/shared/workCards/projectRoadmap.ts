import type { PhaseArtifactSummary } from "./phaseCloseout";
import type { PhaseIntake } from "./phaseIntake";
import {
  buildPhaseIntakeFileNames,
  slugifyPhaseIntakeName,
  validatePhaseIntakeSlug,
} from "./phaseIntake";
import { slugifyProjectIntakeName } from "./projectIntake";
import {
  buildWorkCardPlanFileNames,
  formatArtifactLifecycleStatus,
  formatWorkCardPlanItemStatus,
  type WorkCardPlanItem,
  type WorkCardPlanRecord,
} from "./workCardPlan";
import { validateSafePhaseFolder } from "./workCardFileNames";

export const projectRoadmapModes = [
  "project-roadmap",
  "next-phase-readiness-review",
] as const;

export type ProjectRoadmapMode = (typeof projectRoadmapModes)[number];

export type ProjectRoadmapPhaseStatus =
  | "not started"
  | "proposed"
  | "pending review"
  | "active"
  | "blocked"
  | "repair required"
  | "ready for closeout"
  | "closed"
  | "future/planned";

export type ProjectRoadmapConfidence = "high" | "medium" | "low";

export type ProjectRoadmapNextPhaseKind =
  | "continue-current"
  | "repair-current"
  | "closeout-current"
  | "new-phase"
  | "release-readiness";

export interface ProjectRoadmapRequest {
  projectName?: string;
  operatorDirection?: string;
  mode?: ProjectRoadmapMode;
  completedPhaseFolder?: string;
  sourceProjectPlanningDocumentFileName?: string;
  sourceRepositoryReconciliationFileName?: string;
  approveNextPhaseArtifacts?: boolean;
  generateCompatibilityPhaseIntake?: boolean;
}

export interface ProjectRoadmapSourceArtifact {
  label: string;
  path: string;
  status: "found" | "missing" | "selected" | "generated";
  notes?: string;
}

export interface ProjectRoadmapPhaseArtifactContext {
  phase: string;
  summary: PhaseArtifactSummary;
  workCardFileNames: string[];
  implementerReportFileNames: string[];
  validationReportFileNames: string[];
  repairPromptFileNames: string[];
  closeoutReportFileNames: string[];
  workCardPlanFileNames: string[];
  phasePlanningDocumentFileNames: string[];
  phaseReadinessReviewFileNames: string[];
}

export interface ProjectRoadmapBuildInput extends ProjectRoadmapRequest {
  sourceArtifacts: ProjectRoadmapSourceArtifact[];
  phaseContexts: ProjectRoadmapPhaseArtifactContext[];
  projectStateMarkdown?: string;
  workCardBacklogMarkdown?: string;
  openQuestionsMarkdown?: string;
  risksMarkdown?: string;
  decisionsMarkdown?: string;
  projectPlanningSummary?: string;
  repositoryReconciliationSummary?: string;
  repositoryReconciliationRecommendedPhases?: string[];
  repositoryReconciliationRisks?: string[];
  existingRoadmapFileNames?: string[];
  latestProjectRoadmapId?: string;
}

export interface ProjectRoadmapPhaseEntry {
  phaseFolder: string;
  phaseTitle: string;
  phasePurpose: string;
  status: ProjectRoadmapPhaseStatus;
  confidenceLevel: ProjectRoadmapConfidence;
  sourceArtifactsUsed: string[];
  majorDeliverables: string[];
  proposedWorkCards: WorkCardPlanItem[];
  dependencies: string[];
  risks: string[];
  openQuestions: string[];
  decisionsNeeded: string[];
  validationExpectations: string[];
  closeoutCriteria: string[];
}

export interface ProjectRoadmapNextExecutablePhase {
  kind: ProjectRoadmapNextPhaseKind;
  phaseFolder: string;
  phaseTitle: string;
  actionSummary: string;
  rationale: string;
  shouldCreatePhaseFolder: boolean;
  proposedPhaseFolder?: string;
  proposedWorkCards: WorkCardPlanItem[];
}

export interface ProjectRoadmapRecord {
  roadmapId: string;
  projectName: string;
  mode: ProjectRoadmapMode;
  artifactAuthority?: string[];
  operatorDirection: string;
  completedPhaseFolder?: string;
  sourceProjectPlanningDocumentFileName?: string;
  sourceRepositoryReconciliationFileName?: string;
  sourceArtifacts: ProjectRoadmapSourceArtifact[];
  phaseMap: ProjectRoadmapPhaseEntry[];
  nextExecutablePhase: ProjectRoadmapNextExecutablePhase;
  staleStateWarnings: string[];
  openQuestions: string[];
  decisionsNeeded: string[];
  risks: string[];
  operatorClarificationQuestions: ProjectRoadmapClarificationQuestion[];
  artifactPolicy: string[];
  approvedNextPhaseArtifactGeneration: boolean;
  compatibilityPhaseIntakeGenerated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectRoadmapClarificationQuestion {
  question: string;
  suggestedDefault: string;
  reason: string;
}

export interface ProjectRoadmapArtifactFileNames {
  slug: string;
  jsonFileName: string;
  markdownFileName: string;
}

export interface ProjectRoadmapPreviewResult {
  ok: boolean;
  roadmap?: ProjectRoadmapRecord;
  markdown?: string;
  suggestedFileNames?: ProjectRoadmapArtifactFileNames;
  nextPhaseArtifactPreview?: ProjectRoadmapNextPhaseArtifactPreview;
  errorMessages?: string[];
}

export interface ProjectRoadmapNextPhaseArtifactPreview {
  phaseFolder: string;
  phaseFolderExists: boolean;
  shouldCreatePhaseFolder: boolean;
  workCardPlanFileNames?: ProjectRoadmapArtifactFileNames;
  readinessReviewFileNames?: ProjectRoadmapArtifactFileNames;
  compatibilityPhaseIntakeFileNames?: ProjectRoadmapArtifactFileNames;
}

export interface ProjectRoadmapSaveResult extends ProjectRoadmapPreviewResult {
  savedJsonFileName?: string;
  savedMarkdownFileName?: string;
  jsonPath?: string;
  markdownPath?: string;
  createdPhaseFolder?: string;
  phaseReadinessReviewJsonPath?: string;
  phaseReadinessReviewMarkdownPath?: string;
  workCardPlanJsonPath?: string;
  workCardPlanMarkdownPath?: string;
  compatibilityPhaseIntakeJsonPath?: string;
  compatibilityPhaseIntakeMarkdownPath?: string;
}

export interface SavedProjectRoadmapSummary {
  fileName: string;
  roadmapId: string;
  projectName: string;
  mode: ProjectRoadmapMode;
  nextExecutablePhaseFolder: string;
  nextExecutablePhaseTitle: string;
  updatedAt: string;
}

export interface InvalidSavedProjectRoadmapFile {
  fileName: string;
  errorMessages: string[];
}

export interface ListSavedProjectRoadmapsResult {
  ok: boolean;
  roadmaps?: SavedProjectRoadmapSummary[];
  invalidFiles?: InvalidSavedProjectRoadmapFile[];
  errorMessages?: string[];
}

export interface PhaseReadinessReviewRecord {
  readinessReviewId: string;
  projectRoadmapId: string;
  projectName: string;
  completedPhaseFolder?: string;
  nextExecutablePhase: ProjectRoadmapNextExecutablePhase;
  roadmapWarnings: string[];
  operatorClarificationQuestions: ProjectRoadmapClarificationQuestion[];
  sourceArtifactsUsed: string[];
  createdAt: string;
  updatedAt: string;
}

const defaultFuturePhases: Array<{
  phaseFolder: string;
  phaseTitle: string;
  phasePurpose: string;
}> = [
  {
    phaseFolder: "phase-03",
    phaseTitle: "Workflow Router Screen Correction and Guided Current Action UI",
    phasePurpose:
      "Correct the application screens so durable project state routes the Operator to the current required action.",
  },
  {
    phaseFolder: "phase-04",
    phaseTitle: "Workflow Execution Hardening",
    phasePurpose:
      "Harden the Work Card Loop, Implementer Report review, validation records, repair routing, and closeout status transitions.",
  },
  {
    phaseFolder: "phase-05",
    phaseTitle: "MCP Integration, Repo Bridge, and Security Boundary",
    phasePurpose:
      "Make repo access visible, bounded, understandable, and safe for non-developer Operators.",
  },
  {
    phaseFolder: "phase-06",
    phaseTitle: "Guided Operator UX Polish and Figma Implementation",
    phasePurpose:
      "Apply broader visual polish and Figma design refinement after the workflow-router correction is implemented.",
  },
  {
    phaseFolder: "phase-07",
    phaseTitle: "Evidence, Validation, and Release Packaging",
    phasePurpose:
      "Prepare auditability, validation summaries, onboarding, release notes, packaging, and Beta readiness.",
  },
];

export function buildProjectRoadmap(
  input: ProjectRoadmapBuildInput,
  timestamp: string,
): ProjectRoadmapRecord {
  const projectName = cleanText(input.projectName) || "ChampCity A/I";
  const mode = isProjectRoadmapMode(input.mode ?? "")
    ? (input.mode as ProjectRoadmapMode)
    : "project-roadmap";
  const completedPhaseFolder = cleanText(input.completedPhaseFolder);

  if (completedPhaseFolder.length > 0) {
    const phaseErrors = validateSafePhaseFolder(completedPhaseFolder);

    if (phaseErrors.length > 0) {
      throw new Error(phaseErrors.join(" "));
    }
  }

  const fileNames = buildProjectRoadmapFileNames(projectName);
  const phaseMap = buildPhaseMap(input);
  const staleStateWarnings = buildStaleStateWarnings(input, phaseMap);
  const nextExecutablePhase = selectNextExecutablePhase(phaseMap);
  const openQuestions = extractPlanningLines(input.openQuestionsMarkdown).slice(0, 10);
  const decisionsNeeded = extractPlanningLines(input.decisionsMarkdown).slice(0, 10);
  const risks = uniqueNonEmpty([
    ...extractPlanningLines(input.risksMarkdown),
    ...(input.repositoryReconciliationRisks ?? []),
    ...phaseMap.flatMap((phase) => phase.risks.slice(0, 2)),
  ]).slice(0, 16);

  return {
    roadmapId: `PROJECT_ROADMAP_${fileNames.slug}`,
    projectName,
    mode,
    operatorDirection: cleanText(input.operatorDirection) || buildDefaultDirection(mode),
    completedPhaseFolder: completedPhaseFolder || undefined,
    sourceProjectPlanningDocumentFileName:
      cleanText(input.sourceProjectPlanningDocumentFileName) || undefined,
    sourceRepositoryReconciliationFileName:
      cleanText(input.sourceRepositoryReconciliationFileName) || undefined,
    sourceArtifacts: input.sourceArtifacts,
    phaseMap,
    nextExecutablePhase,
    staleStateWarnings,
    openQuestions,
    decisionsNeeded,
    risks,
    operatorClarificationQuestions: buildClarificationQuestions(
      mode,
      nextExecutablePhase,
      openQuestions,
      decisionsNeeded,
      risks,
    ),
    artifactPolicy: [
      "Project Roadmap artifacts propose the end-to-end project progression; they do not activate phases.",
      "Roadmap phases remain Proposed until the Phase Map Composer creates mapped phase records.",
      "Mapped phases, draft Phase Planning Documents, and Work Card Plans remain Not Active until an explicit Operator activation decision.",
      "Roadmap artifacts are paired JSON and Markdown under planning/project/Project_Roadmap/.",
      "Next-phase artifacts require Operator approval before phase folders are created or updated.",
      "Work Card plans are planning artifacts and do not create formal app-selectable Work Card JSON files.",
      "Compatibility Phase Intake is generated only from a reviewed Roadmap or Next Phase Readiness Review.",
      "Renderer filesystem access remains mediated through constrained Electron main/preload IPC.",
    ],
    approvedNextPhaseArtifactGeneration: Boolean(
      input.approveNextPhaseArtifacts,
    ),
    compatibilityPhaseIntakeGenerated: Boolean(
      input.approveNextPhaseArtifacts && input.generateCompatibilityPhaseIntake,
    ),
    artifactAuthority: [
      "Project Plan / Roadmap = proposed end-to-end project progression.",
      "Phase Map = structured phase status and phase-selection authority.",
      "Phase Planning Documents = draft or approved plan for a selected phase.",
      "Work Card Plan = proposed Work Card count, order, names, and rough intent.",
      "Formal Work Cards = approved executable units saved under Work_Cards/.",
      "Implementer Prompt = build instruction generated from an approved Formal Work Card.",
      "Implementer Report = Implementer result.",
      "Human Validation Report = Operator evidence and decision.",
      "Closeout Report = phase-level acceptance and transition authority.",
    ],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function renderProjectRoadmapMarkdown(
  record: ProjectRoadmapRecord,
): string {
  return [
    `# Project Roadmap: ${record.projectName}`,
    section(
      "Source Context",
      [
        `Project Roadmap ID: ${record.roadmapId}`,
        `Mode: ${formatMode(record.mode)}`,
        `Project: ${record.projectName}`,
        `Project Planning Documents source: ${record.sourceProjectPlanningDocumentFileName ?? "Current durable project planning files."}`,
        `Repository Reconciliation source: ${record.sourceRepositoryReconciliationFileName ?? "Latest/current durable reconciliation context."}`,
        `Completed phase for readiness review: ${record.completedPhaseFolder ?? "Not selected."}`,
        `Created: ${record.createdAt}`,
        `Updated: ${record.updatedAt}`,
      ].join("\n"),
    ),
    section("Operator Direction", record.operatorDirection),
    section(
      "Artifact Authority Model",
      formatListOrFallback(record.artifactAuthority ?? [], "Not provided."),
    ),
    section(
      "Source Artifacts",
      record.sourceArtifacts.map(renderSourceArtifact).join("\n"),
    ),
    section(
      "Proposed Roadmap Phases",
      record.phaseMap.map(renderPhaseMapEntry).join("\n\n"),
    ),
    section(
      "Next Phase Recommendation",
      renderNextExecutablePhase(record.nextExecutablePhase),
    ),
    section(
      "Proposed Work Card Plan",
      renderProposedWorkCards(record.nextExecutablePhase.proposedWorkCards),
    ),
    section(
      "Open Questions / Decisions / Risks",
      [
        "### Open Questions",
        formatListOrFallback(record.openQuestions, "No open questions detected."),
        "",
        "### Decisions Needed",
        formatListOrFallback(record.decisionsNeeded, "No decisions detected."),
        "",
        "### Risks",
        formatListOrFallback(record.risks, "No risks detected."),
      ].join("\n"),
    ),
    section(
      "Stale-State Warnings",
      formatListOrFallback(
        record.staleStateWarnings,
        "No deterministic stale-state warnings detected.",
      ),
    ),
    section(
      "Next Phase Readiness Review Questions",
      record.operatorClarificationQuestions.map(renderClarificationQuestion).join("\n\n"),
    ),
    section(
      "Artifact Policy",
      formatListOrFallback(record.artifactPolicy, "Not provided."),
    ),
  ].join("\n\n") + "\n";
}

export function buildProjectRoadmapFileNames(
  projectName: string,
): ProjectRoadmapArtifactFileNames {
  const slug = slugifyProjectIntakeName(projectName);
  const slugErrors = validateProjectRoadmapSlug(slug);

  if (slugErrors.length > 0) {
    throw new Error(slugErrors.join(" "));
  }

  return {
    slug,
    jsonFileName: `PROJECT_ROADMAP_${slug}.json`,
    markdownFileName: `PROJECT_ROADMAP_${slug}.md`,
  };
}

export function buildPhaseReadinessReviewFileNames(
  phaseFolder: string,
): ProjectRoadmapArtifactFileNames {
  const slug = slugifyPhaseIntakeName(phaseFolder);
  const slugErrors = validatePhaseIntakeSlug(slug);

  if (slugErrors.length > 0) {
    throw new Error(slugErrors.join(" "));
  }

  return {
    slug,
    jsonFileName: `PHASE_READINESS_REVIEW_${slug}.json`,
    markdownFileName: `PHASE_READINESS_REVIEW_${slug}.md`,
  };
}

export function buildRoadmapWorkCardPlanFileNames(
  phaseTitleOrFolder: string,
): ProjectRoadmapArtifactFileNames {
  const fileNames = buildWorkCardPlanFileNames(phaseTitleOrFolder);

  return {
    slug: fileNames.slug,
    jsonFileName: fileNames.jsonFileName,
    markdownFileName: fileNames.markdownFileName,
  };
}

export function validateProjectRoadmapSlug(slug: string): string[] {
  const value = cleanText(slug);

  if (value.length === 0) {
    return ["Project Roadmap filenames need a project name."];
  }

  if (value.includes("..") || /[\\/:\s]/.test(value)) {
    return [
      "Project Roadmap filenames must stay inside the approved roadmap folder.",
    ];
  }

  if (!/^[a-z0-9][a-z0-9_]*$/.test(value)) {
    return [
      "Project Roadmap filenames may use only lowercase letters, numbers, and underscores.",
    ];
  }

  return [];
}

export function validateProjectRoadmapArtifactFileName(
  fileName: string,
): string[] {
  const value = cleanText(fileName);

  if (value.length === 0) {
    return ["Project Roadmap filenames must not be blank."];
  }

  if (value.includes("..") || /[\\/:\s]/.test(value)) {
    return [
      "Project Roadmap filenames must not include folders or absolute paths.",
    ];
  }

  if (!/^PROJECT_ROADMAP_[a-z0-9][a-z0-9_]*\.(json|md)$/.test(value)) {
    return [
      "Project Roadmap artifacts must be named PROJECT_ROADMAP_<slug>.json or PROJECT_ROADMAP_<slug>.md.",
    ];
  }

  return [];
}

export function validatePhaseReadinessReviewArtifactFileName(
  fileName: string,
): string[] {
  const value = cleanText(fileName);

  if (value.length === 0) {
    return ["Phase Readiness Review filenames must not be blank."];
  }

  if (value.includes("..") || /[\\/:\s]/.test(value)) {
    return [
      "Phase Readiness Review filenames must not include folders or absolute paths.",
    ];
  }

  if (!/^PHASE_READINESS_REVIEW_[a-z0-9][a-z0-9_]*\.(json|md)$/.test(value)) {
    return [
      "Phase Readiness Review artifacts must be named PHASE_READINESS_REVIEW_<slug>.json or PHASE_READINESS_REVIEW_<slug>.md.",
    ];
  }

  return [];
}

export function validateProjectRoadmapRecord(candidate: unknown): string[] {
  const errors: string[] = [];

  if (!isRecord(candidate)) {
    return ["Project Roadmap JSON must be an object."];
  }

  for (const field of [
    "roadmapId",
    "projectName",
    "mode",
    "operatorDirection",
    "createdAt",
    "updatedAt",
  ] as const) {
    const value = candidate[field];

    if (typeof value !== "string" || value.trim().length === 0) {
      errors.push(`${field} must be saved as text.`);
    }
  }

  if (
    typeof candidate.mode === "string" &&
    !isProjectRoadmapMode(candidate.mode)
  ) {
    errors.push("mode is not a supported Project Roadmap mode.");
  }

  for (const field of [
    "sourceArtifacts",
    "phaseMap",
    "staleStateWarnings",
    "openQuestions",
    "decisionsNeeded",
    "risks",
    "operatorClarificationQuestions",
    "artifactPolicy",
  ] as const) {
    if (!Array.isArray(candidate[field])) {
      errors.push(`${field} must be saved as a list.`);
    }
  }

  if (!isRecord(candidate.nextExecutablePhase)) {
    errors.push("nextExecutablePhase must be saved as an object.");
  }

  if (
    "completedPhaseFolder" in candidate &&
    candidate.completedPhaseFolder !== undefined
  ) {
    if (typeof candidate.completedPhaseFolder !== "string") {
      errors.push("completedPhaseFolder must be saved as text.");
    } else {
      errors.push(...validateSafePhaseFolder(candidate.completedPhaseFolder));
    }
  }

  return errors;
}

export function buildPhaseReadinessReviewRecord(
  roadmap: ProjectRoadmapRecord,
  timestamp: string,
): PhaseReadinessReviewRecord {
  return {
    readinessReviewId: `PHASE_READINESS_REVIEW_${slugifyPhaseIntakeName(
      roadmap.nextExecutablePhase.phaseFolder,
    )}`,
    projectRoadmapId: roadmap.roadmapId,
    projectName: roadmap.projectName,
    completedPhaseFolder: roadmap.completedPhaseFolder,
    nextExecutablePhase: roadmap.nextExecutablePhase,
    roadmapWarnings: roadmap.staleStateWarnings,
    operatorClarificationQuestions: roadmap.operatorClarificationQuestions,
    sourceArtifactsUsed: roadmap.sourceArtifacts
      .filter((artifact) => artifact.status !== "missing")
      .map((artifact) => `${artifact.label}: ${artifact.path}`),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function renderPhaseReadinessReviewMarkdown(
  record: PhaseReadinessReviewRecord,
): string {
  return [
    `# Next Phase Readiness Review: ${record.nextExecutablePhase.phaseTitle}`,
    section(
      "Source Context",
      [
        `Review ID: ${record.readinessReviewId}`,
        `Project Roadmap ID: ${record.projectRoadmapId}`,
        `Project: ${record.projectName}`,
        `Completed phase: ${record.completedPhaseFolder ?? "Not selected."}`,
        `Next recommended phase: ${record.nextExecutablePhase.phaseFolder}`,
        `Created: ${record.createdAt}`,
        `Updated: ${record.updatedAt}`,
      ].join("\n"),
    ),
    section(
      "Next Phase Recommendation",
      renderNextExecutablePhase(record.nextExecutablePhase),
    ),
    section(
      "Operator Clarification Questions",
      record.operatorClarificationQuestions
        .map(renderClarificationQuestion)
        .join("\n\n"),
    ),
    section(
      "Roadmap Warnings",
      formatListOrFallback(record.roadmapWarnings, "No warnings detected."),
    ),
    section(
      "Source Artifacts Used",
      formatListOrFallback(
        record.sourceArtifactsUsed,
        "No source artifacts recorded.",
      ),
    ),
  ].join("\n\n") + "\n";
}

export function buildRoadmapWorkCardPlanRecord(
  roadmap: ProjectRoadmapRecord,
  timestamp: string,
): WorkCardPlanRecord {
  const next = roadmap.nextExecutablePhase;
  const phaseErrors = validateSafePhaseFolder(next.phaseFolder);

  if (phaseErrors.length > 0) {
    throw new Error(phaseErrors.join(" "));
  }

  const fileNames = buildWorkCardPlanFileNames(
    next.phaseTitle || next.phaseFolder,
  );

  return {
    workCardPlanId: `WORK_CARD_PLAN_${fileNames.slug}`,
    projectName: roadmap.projectName,
    phaseFolder: next.phaseFolder,
    phaseName: next.phaseTitle,
    sourcePhasePlanningDocumentsId: roadmap.roadmapId,
    planPurpose:
      "Pending-review Project Roadmap proposal only. This artifact does not create formal app-selectable Work Card JSON files.",
    reviewStatus: "pending_review",
    artifactAuthority:
      "Work Card Plan = proposed Work Card count, order, names, and rough intent; Formal Work Cards require a separate Operator approval step.",
    phaseActivationStatus: "not_active",
    proposedWorkCards: next.proposedWorkCards,
    operatorPlanAdjustments: roadmap.operatorDirection,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function buildCompatibilityPhaseIntakeFromRoadmap(
  roadmap: ProjectRoadmapRecord,
  timestamp: string,
): PhaseIntake {
  const next = roadmap.nextExecutablePhase;
  const phaseErrors = validateSafePhaseFolder(next.phaseFolder);

  if (phaseErrors.length > 0) {
    throw new Error(phaseErrors.join(" "));
  }

  const fileNames = buildPhaseIntakeFileNames(next.phaseTitle || next.phaseFolder);
  const selectedPhase =
    roadmap.phaseMap.find((phase) => phase.phaseFolder === next.phaseFolder) ??
    roadmap.phaseMap[0];

  return {
    phaseIntakeId: `PHASE_INTAKE_${fileNames.slug}`,
    phaseFolder: next.phaseFolder,
    phaseName: next.phaseTitle,
    projectName: roadmap.projectName,
    generationMode: "architect-led",
    sourceProjectPlanningDocument:
      roadmap.sourceProjectPlanningDocumentFileName ??
      "Current project planning documents under planning/project/.",
    sourceArtifactsUsed: [
      `Project Roadmap: ${roadmap.roadmapId}`,
      ...roadmap.sourceArtifacts
        .filter((artifact) => artifact.status !== "missing")
        .map((artifact) => `${artifact.label}: ${artifact.path}`),
    ],
    sourceProjectPlanningSidecarJsonFileName:
      roadmap.sourceProjectPlanningDocumentFileName,
    sourceProjectPlanningSidecarMarkdownFileName:
      roadmap.sourceProjectPlanningDocumentFileName?.replace(/\.json$/i, ".md"),
    sourceRepositoryReconciliationJsonFileName:
      roadmap.sourceRepositoryReconciliationFileName,
    sourceRepositoryReconciliationMarkdownFileName:
      roadmap.sourceRepositoryReconciliationFileName?.replace(/\.json$/i, ".md"),
    operatorNextWorkIntent: roadmap.operatorDirection,
    operatorProjectWorkType:
      next.kind === "repair-current" ? "repair_pass" : "planning_pass",
    operatorMustKeepConstraints:
      "Use the reviewed Project Roadmap / Phase Map as the source of phase scope.",
    phasePurpose: selectedPhase?.phasePurpose ?? next.actionSummary,
    phaseProblem: next.rationale,
    phaseGoal: next.actionSummary,
    userOutcome:
      "The Operator can review the Roadmap recommendation for the next bounded phase without inventing phase scope manually.",
    architectDerivedScope: selectedPhase
      ? selectedPhase.majorDeliverables.join("\n")
      : next.actionSummary,
    includedScope: selectedPhase
      ? selectedPhase.majorDeliverables.map((item) => `- ${item}`).join("\n")
      : next.actionSummary,
    outOfScope:
      "Do not create formal Work Card JSON artifacts automatically. Do not perform Operator acceptance, phase closeout, release work, provider SDK integration, database/auth/cloud work, connector work, or MCP passthrough.",
    affectedScreensOrWorkflows:
      "Roadmap, Phase Plan, Work Card Plan, Phase Closeout, and Next Phase Readiness Review.",
    knownConstraints:
      "Renderer filesystem access must stay mediated through constrained Electron main/preload IPC. Roadmap artifacts remain planning records until Operator approval and activation.",
    knownRisks: roadmap.risks.map((risk) => `- ${risk}`).join("\n"),
    dependencies: selectedPhase
      ? selectedPhase.dependencies.map((item) => `- ${item}`).join("\n")
      : "Reviewed Project Roadmap / Phase Map.",
    validationExpectations: selectedPhase
      ? selectedPhase.validationExpectations.map((item) => `- ${item}`).join("\n")
      : "Run available automated checks and record remaining Operator manual validation.",
    assumptions: [
      "This compatibility Phase Intake was generated from a reviewed Project Roadmap / Phase Map.",
      "Manual Phase Intake is an advanced or legacy edit path, not the primary planning source.",
    ],
    risksAndDriftWarnings: roadmap.staleStateWarnings,
    acceptanceDefinition:
      "Phase Plan can consume this generated compatibility artifact while the Roadmap remains the planning authority.",
    recommendedNextStep:
      "Use Phase Plan with the reviewed Roadmap source and this generated compatibility Phase Intake only if the current implementation still requires a Phase Intake object.",
    operatorNotes: roadmap.operatorDirection,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function buildPhaseMap(input: ProjectRoadmapBuildInput): ProjectRoadmapPhaseEntry[] {
  const existingEntries = input.phaseContexts.map((context) =>
    buildExistingPhaseEntry(context),
  );
  const existingFolders = new Set(
    existingEntries.map((entry) => entry.phaseFolder.toLowerCase()),
  );
  const futurePhaseSpecs = mergeFuturePhaseSpecs(
    input.repositoryReconciliationRecommendedPhases,
  );
  const futureEntries = futurePhaseSpecs
    .filter((phase) => !existingFolders.has(phase.phaseFolder.toLowerCase()))
    .map((phase) => buildFuturePhaseEntry(phase));

  return [...existingEntries, ...futureEntries].sort(comparePhaseEntries);
}

function buildExistingPhaseEntry(
  context: ProjectRoadmapPhaseArtifactContext,
): ProjectRoadmapPhaseEntry {
  const status = inferExistingPhaseStatus(context);
  const phaseTitle = inferExistingPhaseTitle(context.phase);
  const risks = uniqueNonEmpty([
    ...context.summary.missingExpectedArtifactObservations,
    context.summary.repairPromptCount > 0
      ? "Repair prompts exist and should be resolved before closeout."
      : "",
    context.summary.validationReportCount > 0 &&
    context.summary.closeoutReportCount === 0
      ? "Validation reports exist but no closeout report is recorded."
      : "",
  ]);

  return {
    phaseFolder: context.phase,
    phaseTitle,
    phasePurpose: buildExistingPhasePurpose(context, status),
    status,
    confidenceLevel: "high",
    sourceArtifactsUsed: buildExistingPhaseSourceArtifacts(context),
    majorDeliverables: buildExistingPhaseDeliverables(context),
    proposedWorkCards: buildProposedWorkCardsForPhase({
      phaseFolder: context.phase,
      phaseTitle,
      status,
      detailed: status !== "closed",
      risks,
    }),
    dependencies: buildExistingPhaseDependencies(context),
    risks,
    openQuestions: buildExistingPhaseOpenQuestions(context, status),
    decisionsNeeded: buildExistingPhaseDecisions(context, status),
    validationExpectations: [
      "Run available automated checks before reporting Implementer completion.",
      "Keep Operator manual validation separate from Implementer checks.",
      "Record validation evidence and repair decisions in durable artifacts.",
    ],
    closeoutCriteria: buildExistingPhaseCloseoutCriteria(context, status),
  };
}

function buildFuturePhaseEntry(phase: {
  phaseFolder: string;
  phaseTitle: string;
  phasePurpose: string;
}): ProjectRoadmapPhaseEntry {
  return {
    phaseFolder: phase.phaseFolder,
    phaseTitle: phase.phaseTitle,
    phasePurpose: phase.phasePurpose,
    status: "proposed",
    confidenceLevel: phase.phaseFolder === "phase-03" ? "medium" : "low",
    sourceArtifactsUsed: [
      "Project Planning Documents",
      "Repository Reconciliation",
      "2026-07-01 Architect Alignment Amendment",
    ],
    majorDeliverables: buildFutureDeliverables(phase.phaseTitle),
    proposedWorkCards: buildProposedWorkCardsForPhase({
      phaseFolder: phase.phaseFolder,
      phaseTitle: phase.phaseTitle,
      status: "proposed",
      detailed: phase.phaseFolder === "phase-03",
      risks: [],
    }),
    dependencies: [
      "Prior phase must be repaired, validated, and closed or explicitly carried forward.",
      "Roadmap / Phase Map should be reviewed at phase closeout before this phase starts.",
    ],
    risks: [
      "Later phase details are lower confidence until the previous phase has been closed.",
    ],
    openQuestions: [
      "Confirm scope boundaries during Next Phase Readiness Review.",
    ],
    decisionsNeeded: [
      "Operator must approve the phase before formal Work Cards are created.",
    ],
    validationExpectations: [
      "Define phase-specific automated checks before implementation.",
      "List remaining Operator manual validation steps in Implementer Reports.",
    ],
    closeoutCriteria: [
      "All approved Formal Work Cards have Implementer Reports.",
      "Validation Reports and repair decisions are reconciled.",
      "Phase Closeout includes a Next Phase Activation decision.",
    ],
  };
}

function selectNextExecutablePhase(
  phaseMap: ProjectRoadmapPhaseEntry[],
): ProjectRoadmapNextExecutablePhase {
  const existingPhases = phaseMap.filter(
    (phase) => !isProposedPhaseStatus(phase.status),
  );
  const repairPhase = existingPhases.find(
    (phase) => phase.status === "repair required" || phase.status === "blocked",
  );

  if (repairPhase) {
    return {
      kind: "repair-current",
      phaseFolder: repairPhase.phaseFolder,
      phaseTitle: `${repairPhase.phaseTitle} repair and closeout readiness`,
      actionSummary:
        "Repair unresolved phase evidence, stale planning conflicts, or missing lifecycle records before starting a new phase.",
      rationale: `Do not create the next phase yet. ${repairPhase.phaseFolder} still has repair or lifecycle evidence gaps.`,
      shouldCreatePhaseFolder: false,
      proposedWorkCards: repairPhase.proposedWorkCards,
    };
  }

  const activePhase = existingPhases.find((phase) => phase.status === "active");

  if (activePhase) {
    return {
      kind: "continue-current",
      phaseFolder: activePhase.phaseFolder,
      phaseTitle: activePhase.phaseTitle,
      actionSummary: "Continue the current active phase.",
      rationale: `${activePhase.phaseFolder} is active and should be completed before a new phase starts.`,
      shouldCreatePhaseFolder: false,
      proposedWorkCards: activePhase.proposedWorkCards,
    };
  }

  const closeoutPhase = existingPhases.find(
    (phase) => phase.status === "ready for closeout",
  );

  if (closeoutPhase) {
    return {
      kind: "closeout-current",
      phaseFolder: closeoutPhase.phaseFolder,
      phaseTitle: `${closeoutPhase.phaseTitle} closeout`,
      actionSummary:
        "Run phase closeout and Next Phase Readiness Review before starting a new phase.",
      rationale: `${closeoutPhase.phaseFolder} appears ready for closeout, but the next phase should be confirmed after closeout evidence is reviewed.`,
      shouldCreatePhaseFolder: false,
      proposedWorkCards: closeoutPhase.proposedWorkCards,
    };
  }

  const pendingReviewPhase = existingPhases.find(
    (phase) => phase.status === "pending review",
  );

  if (pendingReviewPhase) {
    return {
      kind: "new-phase",
      phaseFolder: pendingReviewPhase.phaseFolder,
      phaseTitle: pendingReviewPhase.phaseTitle,
      actionSummary:
        "Review the pending phase plan and record a Next Phase Activation decision before formal Work Cards or Implementer Prompts are created.",
      rationale: `${pendingReviewPhase.phaseFolder} has draft or pending-review planning artifacts, but it is not active.`,
      shouldCreatePhaseFolder: false,
      proposedWorkCards: pendingReviewPhase.proposedWorkCards,
    };
  }

  const nextFuture =
    phaseMap.find((phase) => isProposedPhaseStatus(phase.status)) ??
    phaseMap[phaseMap.length - 1];

  if (nextFuture) {
    return {
      kind: "new-phase",
      phaseFolder: nextFuture.phaseFolder,
      phaseTitle: nextFuture.phaseTitle,
      actionSummary:
        "Review the next phase recommendation and record a Next Phase Activation decision before execution.",
      rationale:
        "Earlier phases are closed or have no deterministic blocker in the current artifact summary.",
      shouldCreatePhaseFolder: true,
      proposedPhaseFolder: nextFuture.phaseFolder,
      proposedWorkCards: nextFuture.proposedWorkCards,
    };
  }

  return {
    kind: "release-readiness",
    phaseFolder: "phase-07",
    phaseTitle: "Release Readiness",
    actionSummary: "Review release readiness.",
    rationale: "No planned phase entries were found.",
    shouldCreatePhaseFolder: true,
    proposedPhaseFolder: "phase-07",
    proposedWorkCards: buildProposedWorkCardsForPhase({
      phaseFolder: "phase-07",
      phaseTitle: "Release Readiness",
      status: "proposed",
      detailed: true,
      risks: [],
    }),
  };
}

function buildStaleStateWarnings(
  input: ProjectRoadmapBuildInput,
  phaseMap: ProjectRoadmapPhaseEntry[],
): string[] {
  const warnings: string[] = [];
  const state = cleanText(input.projectStateMarkdown);
  const backlog = cleanText(input.workCardBacklogMarkdown);

  if (/PH02\s+WC06/i.test(state) && /PH02\s+WC05/i.test(backlog)) {
    warnings.push(
      "PROJECT_STATE and WORK_CARD_BACKLOG disagree about the next Phase 02 milestone.",
    );
  }

  if (/Latest selected intake stage:\s*mvp/i.test(state)) {
    warnings.push(
      "PROJECT_STATE still references an MVP intake-stage label while the current stage is Alpha app development.",
    );
  }

  if ((input.existingRoadmapFileNames ?? []).length === 0) {
    warnings.push(
      "No prior Project Roadmap artifacts were found under planning/project/Project_Roadmap/.",
    );
  }

  for (const context of input.phaseContexts) {
    if (
      context.summary.validationReportCount > 0 &&
      context.summary.closeoutReportCount === 0
    ) {
      warnings.push(
        `${context.phase} has Validation Reports but no Closeout Report.`,
      );
    }

    if (context.summary.repairPromptCount > 0) {
      warnings.push(
        `${context.phase} has Repair Prompts that must be reviewed before closeout or next-phase creation.`,
      );
    }

    if (
      context.summary.workCardCount > 0 &&
      context.workCardPlanFileNames.length === 0 &&
      context.summary.closeoutReportCount === 0
    ) {
      warnings.push(
        `${context.phase} has Work Cards but no phase-scoped Work Card Plan artifact.`,
      );
    }

    for (const pair of context.summary.workCardsWithBothJsonAndMarkdown) {
      if (!hasMatchingImplementerReport(context.implementerReportFileNames, pair.workCardId)) {
        warnings.push(
          `${context.phase} ${pair.workCardId} does not have a matching Implementer Report filename in Implementer_Reports.`,
        );
      }
    }
  }

  if (
    phaseMap.some((phase) => isProposedPhaseStatus(phase.status)) &&
    phaseMap.some(
      (phase) =>
        phase.status === "repair required" || phase.status === "ready for closeout",
    )
  ) {
    warnings.push(
      "Future phases are mapped, but the current phase should be repaired or closed before a new phase is created.",
    );
  }

  return uniqueNonEmpty(warnings);
}

function buildClarificationQuestions(
  mode: ProjectRoadmapMode,
  nextExecutablePhase: ProjectRoadmapNextExecutablePhase,
  openQuestions: string[],
  decisionsNeeded: string[],
  risks: string[],
): ProjectRoadmapClarificationQuestion[] {
  return [
    {
      question:
        "Has the project priority changed since the last saved planning artifact?",
      suggestedDefault:
        "No. Keep the current roadmap order unless the Operator says priorities changed.",
      reason:
        "The Roadmap is a living artifact and should adjust when priorities change.",
    },
    {
      question:
        nextExecutablePhase.kind === "repair-current"
          ? "Should the current phase be repaired before any new phase folder is created?"
          : "Does the recommended next phase still make sense after the latest closeout evidence?",
      suggestedDefault:
        nextExecutablePhase.kind === "repair-current"
          ? "Yes. Repair or close the current phase first."
          : "Yes, if no new blockers or priority changes are found.",
      reason: nextExecutablePhase.rationale,
    },
    {
      question:
        "Are there any scope boundaries the Architect should preserve for the next recommended phase?",
      suggestedDefault:
        "Keep implementation scoped to the next recommended phase and do not create formal Work Card JSON automatically.",
      reason:
        "Operator approval is required before planning proposals become formal Work Cards.",
    },
    {
      question:
        "What validation evidence will make the next phase feel proved to the Operator?",
      suggestedDefault:
        "Automated checks plus Operator notes/screenshots where visual or usability judgment is required.",
      reason:
        "Implementer validation and Operator acceptance must remain separate.",
    },
    {
      question:
        "Do any open questions, decisions, or risks need an answer before the next phase starts?",
      suggestedDefault:
        buildOpenQuestionDefault(openQuestions, decisionsNeeded, risks, mode),
      reason:
        "The Next Phase Readiness Review should ask only for unresolved clarification.",
    },
  ];
}

function buildOpenQuestionDefault(
  openQuestions: string[],
  decisionsNeeded: string[],
  risks: string[],
  mode: ProjectRoadmapMode,
): string {
  if (mode === "next-phase-readiness-review") {
    return "Answer only blockers or changed-priority questions before phase execution starts.";
  }

  if (openQuestions.length > 0) {
    return `Start with: ${openQuestions[0]}`;
  }

  if (decisionsNeeded.length > 0) {
    return `Start with: ${decisionsNeeded[0]}`;
  }

  if (risks.length > 0) {
    return `Review risk: ${risks[0]}`;
  }

  return "No blocking clarification detected.";
}

function inferExistingPhaseStatus(
  context: ProjectRoadmapPhaseArtifactContext,
): ProjectRoadmapPhaseStatus {
  if (context.summary.closeoutReportCount > 0) {
    return "closed";
  }

  if (
    context.summary.repairPromptCount > 0 ||
    context.summary.missingExpectedArtifactObservations.some((observation) =>
      /\brepair\b|\bmissing\b/i.test(observation),
    )
  ) {
    return "repair required";
  }

  if (
    context.summary.workCardCount > 0 &&
    context.summary.validationReportCount > 0
  ) {
    return "ready for closeout";
  }

  if (context.summary.workCardCount > 0) {
    return "active";
  }

  if (
    context.workCardPlanFileNames.length > 0 ||
    context.phasePlanningDocumentFileNames.length > 0 ||
    context.phaseReadinessReviewFileNames.length > 0
  ) {
    return "pending review";
  }

  return "not started";
}

function inferExistingPhaseTitle(phaseFolder: string): string {
  if (phaseFolder === "phase-01") {
    return "MVP foundation and core Work Card loop";
  }

  if (phaseFolder === "phase-02") {
    return "Upstream project planning workflow";
  }

  return `${phaseFolder} project phase`;
}

function buildExistingPhasePurpose(
  context: ProjectRoadmapPhaseArtifactContext,
  status: ProjectRoadmapPhaseStatus,
): string {
  if (status === "closed") {
    return "Preserve completed phase evidence and use closeout records as source context.";
  }

  if (status === "repair required") {
    return "Resolve repair prompts, stale-state warnings, missing reports, or validation/closeout gaps.";
  }

  if (status === "ready for closeout") {
    return "Consolidate validation evidence and complete phase closeout before the next phase starts.";
  }

  if (status === "pending review") {
    return "Review draft phase planning artifacts and decide whether to activate the phase.";
  }

  return context.summary.deterministicRecommendation;
}

function buildExistingPhaseSourceArtifacts(
  context: ProjectRoadmapPhaseArtifactContext,
): string[] {
  return uniqueNonEmpty([
    `${context.phase}/Work_Cards (${context.summary.workCardCount})`,
    `${context.phase}/Implementer_Reports (${context.summary.implementerReportCount})`,
    `${context.phase}/Validation_Reports (${context.summary.validationReportCount})`,
    `${context.phase}/Repair_Prompts (${context.summary.repairPromptCount})`,
    `${context.phase}/Closeout_Reports (${context.summary.closeoutReportCount})`,
    context.workCardPlanFileNames.length > 0
      ? `${context.phase}/Work_Card_Plans (${context.workCardPlanFileNames.length})`
      : "",
    context.phaseReadinessReviewFileNames.length > 0
      ? `${context.phase}/Phase_Readiness_Reviews (${context.phaseReadinessReviewFileNames.length})`
      : "",
    context.phasePlanningDocumentFileNames.length > 0
      ? `${context.phase}/Phase_Planning_Documents (${context.phasePlanningDocumentFileNames.length})`
      : "",
  ]);
}

function buildExistingPhaseDeliverables(
  context: ProjectRoadmapPhaseArtifactContext,
): string[] {
  const deliverables = [
    context.summary.workCardCount > 0
      ? `${context.summary.workCardCount} Work Card artifact set(s)`
      : "",
    context.summary.implementerReportCount > 0
      ? `${context.summary.implementerReportCount} Implementer Report artifact(s)`
      : "",
    context.summary.validationReportCount > 0
      ? `${context.summary.validationReportCount} Validation Report artifact(s)`
      : "",
    context.summary.closeoutReportCount > 0
      ? `${context.summary.closeoutReportCount} Closeout Report artifact(s)`
      : "",
  ];

  return uniqueNonEmpty(deliverables).length > 0
    ? uniqueNonEmpty(deliverables)
    : ["No durable phase deliverables found yet."];
}

function buildExistingPhaseDependencies(
  context: ProjectRoadmapPhaseArtifactContext,
): string[] {
  return uniqueNonEmpty([
    context.phase === "phase-01" ? "MVP foundation decisions." : "",
    context.phase === "phase-02" ? "Phase 01 core workflow artifacts." : "",
    context.summary.repairPromptCount > 0
      ? "Repair prompts must be resolved or explicitly deferred."
      : "",
    context.summary.closeoutReportCount === 0
      ? "Phase closeout evidence is still required."
      : "",
  ]);
}

function buildExistingPhaseOpenQuestions(
  context: ProjectRoadmapPhaseArtifactContext,
  status: ProjectRoadmapPhaseStatus,
): string[] {
  return uniqueNonEmpty([
    status === "repair required"
      ? "Which repair prompts remain unresolved, superseded, or accepted?"
      : "",
    status === "ready for closeout"
      ? "Is the Operator ready to run phase closeout and approve the next-phase review?"
      : "",
    status === "pending review"
      ? "Should this pending-review phase plan stay draft, be revised, or be activated?"
      : "",
    context.workCardPlanFileNames.length === 0 && status !== "closed"
      ? "Should a phase-scoped Work Card Plan be generated from the Roadmap?"
      : "",
  ]);
}

function buildExistingPhaseDecisions(
  context: ProjectRoadmapPhaseArtifactContext,
  status: ProjectRoadmapPhaseStatus,
): string[] {
  return uniqueNonEmpty([
    status === "repair required"
      ? "Decide whether to repair current phase before new phase creation."
      : "",
    status === "ready for closeout"
      ? "Decide whether the phase can close or needs another repair pass."
      : "",
    status === "pending review"
      ? "Operator must make a Next Phase Activation decision before formal Work Cards or Implementer Prompts are created."
      : "",
    context.summary.closeoutReportCount === 0
      ? "Operator closeout decision is still required."
      : "",
  ]);
}

function buildExistingPhaseCloseoutCriteria(
  context: ProjectRoadmapPhaseArtifactContext,
  status: ProjectRoadmapPhaseStatus,
): string[] {
  if (status === "closed") {
    return [
      "Closeout artifacts are present.",
      "Use the latest closeout report when running future readiness reviews.",
    ];
  }

  if (status === "pending review") {
    return [
      "Phase Planning Documents are reviewed by the Operator.",
      "Work Card Plan remains a proposal until selected items are approved as Formal Work Cards.",
      "Next Phase Activation decision is recorded in a Closeout Report.",
    ];
  }

  return [
    "Required Work Cards have paired JSON and Markdown where applicable.",
    "Relevant Implementer Reports are saved in canonical Implementer_Reports storage.",
    "Validation Reports are present or intentionally deferred by the Operator.",
    "Repair Prompts are resolved, superseded, or explicitly carried forward.",
    "Phase Closeout includes a Next Phase Activation decision.",
  ];
}

function buildFutureDeliverables(phaseTitle: string): string[] {
  if (/workflow router|current required action|guided current action/i.test(phaseTitle)) {
    return [
      "Durable current-action state model",
      "Workflow-router UI shell",
      "Artifact review workspace",
      "Stale and superseded artifact warnings",
    ];
  }

  if (/workflow execution|work card/i.test(phaseTitle)) {
    return [
      "Coherent Work Card execution loop",
      "Implementer report review path",
      "Validation and repair handoff behavior",
      "Closeout-ready status transitions",
    ];
  }

  if (/mcp|repo bridge|security/i.test(phaseTitle)) {
    return [
      "Repo connection status model",
      "Safe read/write boundaries",
      "Operator-visible approval and fallback behavior",
      "No-secret handling guidance",
    ];
  }

  if (/ux|operator/i.test(phaseTitle)) {
    return [
      "Guided Operator workflow",
      "Plain-language status and next actions",
      "Reduced duplicate planning surfaces",
      "Readable progress map",
    ];
  }

  if (/release|packaging|validation/i.test(phaseTitle)) {
    return [
      "Validation summary consolidation",
      "Release readiness evidence",
      "Onboarding and known limitations",
      "Windows package path",
    ];
  }

  return [
    "Repository reconciliation summary",
    "Durable phase planning documents",
    "Roadmap-driven Work Card plan",
    "Stale-state warning list",
  ];
}

function buildProposedWorkCardsForPhase(input: {
  phaseFolder: string;
  phaseTitle: string;
  status: ProjectRoadmapPhaseStatus;
  detailed: boolean;
  risks: string[];
}): WorkCardPlanItem[] {
  const titles = buildWorkCardTitles(input);
  const riskLevel = input.risks.some((risk) =>
    /\b(secret|credential|security|unsafe|blocked|blocking)\b/i.test(risk),
  )
    ? "high"
    : input.risks.length > 0
      ? "medium"
      : "low";

  return titles.map((title, index) => ({
    workCardIdProposal: `WC${String(index + 1).padStart(2, "0")}`,
    title,
    planStatus: "proposed",
    reconciliationStatus: "planned",
    executableStatus: "not_executable",
    problem: buildWorkCardProblem(title, input),
    userOutcome: buildWorkCardOutcome(title, input),
    includedScope: buildWorkCardIncludedScope(title, input),
    outOfScope:
      "Do not automatically create formal Work Card JSON. Do not perform Operator acceptance, phase closeout, release, provider SDK, auth, database, cloud, connector, MCP passthrough, or deployment work unless separately approved.",
    dependencies:
      isProposedPhaseStatus(input.status)
        ? "Prior phase closeout, Next Phase Readiness Review, and explicit activation decision."
        : "Current phase artifacts, Implementer Reports, Validation Reports, Repair Prompts, and Operator direction.",
    riskLevel,
    validationItems: [
      "Run available automated checks.",
      "Confirm generated artifacts save to approved planning folders.",
      "List remaining Operator manual validation steps.",
    ],
    suggestedOrdering: index + 1,
    notesForArchitectImplementer:
      "Planning proposal only. Operator approval is required before conversion to formal Work Cards.",
  }));
}

function buildWorkCardTitles(input: {
  phaseTitle: string;
  status: ProjectRoadmapPhaseStatus;
  detailed: boolean;
}): string[] {
  if (input.status === "repair required") {
    return [
      "Resolve current phase repair prompts and missing evidence",
      "Consolidate validation and stale-state warnings",
      "Prepare closeout and Next Phase Readiness Review",
    ];
  }

  if (input.status === "ready for closeout") {
    return [
      "Consolidate phase validation evidence",
      "Run phase closeout decision review",
      "Confirm next recommended phase and Work Card order",
    ];
  }

  if (input.status === "active") {
    return [
      `Complete remaining ${input.phaseTitle} implementation work`,
      `Validate ${input.phaseTitle} artifacts and workflow reachability`,
      `Prepare ${input.phaseTitle} closeout evidence`,
    ];
  }

  if (input.status === "pending review") {
    return [
      `Review pending ${input.phaseTitle} planning documents`,
      `Approve, revise, or defer ${input.phaseTitle} Work Card Plan proposals`,
      `Record ${input.phaseTitle} activation decision at phase closeout`,
    ];
  }

  if (!input.detailed) {
    return [
      `Scope ${input.phaseTitle}`,
      `Implement ${input.phaseTitle} foundation`,
      `Validate ${input.phaseTitle} outcomes`,
    ];
  }

  if (/Repository Reconciliation|Phase Planning/i.test(input.phaseTitle)) {
    return [
      "Generate durable Project Roadmap and Phase Map",
      "Consolidate validation evidence and stale-state warnings",
      "Create Next Phase Readiness Review workflow",
      "Produce roadmap-driven Work Card plans",
    ];
  }

  if (/Workflow Router|Current Required Action|Guided Current Action/i.test(input.phaseTitle)) {
    return [
      "Reconcile superseded Phase 03 artifacts and state labels",
      "Define durable current required action model",
      "Integrate workflow-router UI shell",
      "Validate routed workflow scenarios",
    ];
  }

  return [
    `Define ${input.phaseTitle} source context`,
    `Implement ${input.phaseTitle} workflow`,
    `Validate ${input.phaseTitle} artifacts`,
    `Prepare ${input.phaseTitle} closeout`,
  ];
}

function buildWorkCardProblem(
  title: string,
  input: { phaseTitle: string; status: ProjectRoadmapPhaseStatus },
): string {
  if (isProposedPhaseStatus(input.status)) {
    return `${title} is needed to move ${input.phaseTitle} from roadmap proposal into a reviewed phase plan.`;
  }

  if (input.status === "pending review") {
    return `${title} is needed because ${input.phaseTitle} has draft planning artifacts that are not active executable work.`;
  }

  return `${title} is needed because ${input.phaseTitle} is not yet cleanly ready for the next phase.`;
}

function buildWorkCardOutcome(
  title: string,
  input: { phaseTitle: string },
): string {
  return `The Operator can review ${title.toLowerCase()} as part of ${input.phaseTitle}.`;
}

function buildWorkCardIncludedScope(
  title: string,
  input: { phaseTitle: string; status: ProjectRoadmapPhaseStatus },
): string {
  if (isProposedPhaseStatus(input.status)) {
    return `${title}. Keep the work bounded to reviewed roadmap and readiness-review artifacts for ${input.phaseTitle}.`;
  }

  if (input.status === "pending review") {
    return `${title}. Preserve the Draft / Pending Review / Not Active boundary until the Operator records a next-phase activation decision.`;
  }

  return `${title}. Inspect current phase artifacts, update planning records, and preserve Operator approval boundaries.`;
}

function mergeFuturePhaseSpecs(
  recommendedPhases: string[] | undefined,
): Array<{ phaseFolder: string; phaseTitle: string; phasePurpose: string }> {
  const parsed = (recommendedPhases ?? [])
    .map(parseRecommendedPhase)
    .filter(
      (
        phase,
      ): phase is {
        phaseFolder: string;
        phaseTitle: string;
        phasePurpose: string;
      } => Boolean(phase),
    );
  const byFolder = new Map<string, {
    phaseFolder: string;
    phaseTitle: string;
    phasePurpose: string;
  }>();

  for (const phase of [...parsed, ...defaultFuturePhases]) {
    if (!byFolder.has(phase.phaseFolder)) {
      byFolder.set(phase.phaseFolder, phase);
    }
  }

  return [...byFolder.values()].sort((left, right) =>
    left.phaseFolder.localeCompare(right.phaseFolder),
  );
}

function parseRecommendedPhase(value: string):
  | { phaseFolder: string; phaseTitle: string; phasePurpose: string }
  | undefined {
  const cleaned = cleanText(value).replace(/^[-*]\s+/, "");
  const match = /^Phase\s+(\d+)\s*:\s*(.+)$/i.exec(cleaned);

  if (!match) {
    return undefined;
  }

  const phaseNumber = Number.parseInt(match[1], 10);
  const phaseFolder = `phase-${String(phaseNumber).padStart(2, "0")}`;
  const title = match[2].replace(/\.$/, "").trim();

  if (validateSafePhaseFolder(phaseFolder).length > 0 || title.length === 0) {
    return undefined;
  }

  return {
    phaseFolder,
    phaseTitle: title,
    phasePurpose: `Roadmap phase recommended by Repository Reconciliation: ${title}.`,
  };
}

function comparePhaseEntries(
  left: ProjectRoadmapPhaseEntry,
  right: ProjectRoadmapPhaseEntry,
): number {
  return phaseSortNumber(left.phaseFolder) - phaseSortNumber(right.phaseFolder);
}

function phaseSortNumber(phaseFolder: string): number {
  const match = /^phase-(\d+)$/i.exec(phaseFolder);

  return match ? Number.parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
}

function hasMatchingImplementerReport(
  fileNames: string[],
  workCardId: string,
): boolean {
  const normalizedWorkCardId = workCardId.toLowerCase();

  return fileNames.some((fileName) => {
    const normalizedFileName = fileName.toLowerCase();

    return (
      normalizedFileName.startsWith(`implementer_report_${normalizedWorkCardId}_`) ||
      normalizedFileName.includes(`_${normalizedWorkCardId}_`) ||
      normalizedFileName.includes(`_${normalizedWorkCardId}.`)
    );
  });
}

function extractPlanningLines(markdown: string | undefined): string[] {
  return uniqueNonEmpty(
    cleanText(markdown)
      .split(/\r?\n/)
      .map((line) =>
        line
          .trim()
          .replace(/^[-*]\s+/, "")
          .replace(/^\d+[.)]\s+/, "")
          .replace(/^#+\s*/, "")
          .trim(),
      )
      .filter(
        (line) =>
          line.length > 0 &&
          !/^Current Decisions$/i.test(line) &&
          !/^Known Risks/i.test(line) &&
          !/^Questions$/i.test(line),
      ),
  );
}

function renderSourceArtifact(artifact: ProjectRoadmapSourceArtifact): string {
  const notes = artifact.notes ? ` - ${artifact.notes}` : "";

  return `- ${artifact.label}: ${artifact.status} (${artifact.path})${notes}`;
}

function renderPhaseMapEntry(phase: ProjectRoadmapPhaseEntry): string {
  return [
    `### ${phase.phaseFolder}: ${phase.phaseTitle}`,
    "",
    `- Status: ${phase.status}`,
    `- Confidence: ${phase.confidenceLevel}`,
    `- Purpose: ${phase.phasePurpose}`,
    `- Source artifacts used: ${phase.sourceArtifactsUsed.join("; ") || "Not provided."}`,
    `- Major deliverables: ${phase.majorDeliverables.join("; ") || "Not provided."}`,
    `- Dependencies: ${phase.dependencies.join("; ") || "None detected."}`,
    `- Risks: ${phase.risks.join("; ") || "None detected."}`,
    `- Open questions: ${phase.openQuestions.join("; ") || "None detected."}`,
    `- Decisions needed: ${phase.decisionsNeeded.join("; ") || "None detected."}`,
    `- Validation expectations: ${phase.validationExpectations.join("; ") || "Not provided."}`,
    `- Closeout criteria: ${phase.closeoutCriteria.join("; ") || "Not provided."}`,
    "",
    "#### Proposed Ordered Work Cards",
    renderProposedWorkCards(phase.proposedWorkCards),
  ].join("\n");
}

function renderNextExecutablePhase(
  next: ProjectRoadmapNextExecutablePhase,
): string {
  return [
    `- Recommendation kind: ${next.kind}`,
    `- Phase folder: ${next.phaseFolder}`,
    `- Phase title: ${next.phaseTitle}`,
    `- Action: ${next.actionSummary}`,
    `- Rationale: ${next.rationale}`,
    `- Create phase folder for draft planning artifacts after Operator permission: ${next.shouldCreatePhaseFolder ? "yes" : "no"}`,
    "- Activation decision required before execution: yes",
    `- Proposed phase folder: ${next.proposedPhaseFolder ?? "Not needed."}`,
  ].join("\n");
}

function renderProposedWorkCards(items: WorkCardPlanItem[]): string {
  if (items.length === 0) {
    return "- No Work Card proposals generated.";
  }

  return items
    .map(
      (item) =>
        [
          `${item.suggestedOrdering}. ${item.workCardIdProposal}: ${item.title}`,
          `   - Plan status: ${formatArtifactLifecycleStatus(item.planStatus ?? "proposed")}`,
          `   - Reconciliation status: ${formatWorkCardPlanItemStatus(item.reconciliationStatus ?? "planned")}`,
          `   - Executable status: Not Executable`,
          `   - Problem: ${item.problem}`,
          `   - User outcome: ${item.userOutcome}`,
          `   - Risk: ${item.riskLevel}`,
          `   - Validation: ${item.validationItems.join("; ")}`,
        ].join("\n"),
    )
    .join("\n");
}

function renderClarificationQuestion(
  question: ProjectRoadmapClarificationQuestion,
): string {
  return [
    `- Question: ${question.question}`,
    `  Suggested default: ${question.suggestedDefault}`,
    `  Reason: ${question.reason}`,
  ].join("\n");
}

function formatMode(mode: ProjectRoadmapMode): string {
  return mode === "next-phase-readiness-review"
    ? "Next Phase Readiness Review"
    : "Project Roadmap";
}

function buildDefaultDirection(mode: ProjectRoadmapMode): string {
  return mode === "next-phase-readiness-review"
    ? "Review the completed phase and confirm whether the next immediate phase and Work Card order are still correct."
    : "Map the full project from current state through releasable finish using durable artifacts.";
}

function formatListOrFallback(items: string[], fallback: string): string {
  const values = uniqueNonEmpty(items);

  if (values.length === 0) {
    return `- ${fallback}`;
  }

  return values.map((item) => `- ${item}`).join("\n");
}

function section(title: string, body: string): string {
  return `## ${title}\n\n${body.trim().length > 0 ? body : "Not provided."}`;
}

function isProjectRoadmapMode(value: string): value is ProjectRoadmapMode {
  return projectRoadmapModes.includes(value as ProjectRoadmapMode);
}

function isProposedPhaseStatus(status: ProjectRoadmapPhaseStatus): boolean {
  return status === "proposed" || status === "future/planned";
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
