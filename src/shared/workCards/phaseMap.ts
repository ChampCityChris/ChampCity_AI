import type { PhaseArtifactSummary } from "./phaseCloseout";
import type { ProjectPlanningDocumentsRecord } from "./projectPlanningDocuments";
import type {
  ProjectRoadmapPhaseEntry,
  ProjectRoadmapPhaseStatus,
  ProjectRoadmapRecord,
} from "./projectRoadmap";
import type { RepositoryReconciliationRecord } from "./repositoryReconciliation";
import {
  formatArtifactLifecycleStatus,
  formatWorkCardPlanItemStatus,
  type WorkCardPlanItem,
} from "./workCardPlan";
import { slugifyProjectIntakeName } from "./projectIntake";
import { validateSafePhaseFolder } from "./workCardFileNames";

export type MappedPhaseStatus =
  | "proposed"
  | "mapped"
  | "planning_draft"
  | "planned"
  | "pending_review"
  | "approved_for_work_card_creation"
  | "active"
  | "in_progress"
  | "closed"
  | "deferred"
  | "superseded"
  | "already_satisfied"
  | "implemented_but_not_validated"
  | "validated_but_not_closed";

export interface PhaseMapRequest {
  projectPlanningDocumentFileName?: string;
  repositoryReconciliationFileName?: string;
  projectRoadmapFileName?: string;
  phaseInterviewRequired?: boolean;
  phaseInterviewArtifactId?: string;
}

export interface PhaseMapExistingPhaseArtifact {
  phaseFolder: string;
  summary: PhaseArtifactSummary;
  workCardPlanFileNames: string[];
  phasePlanningDocumentFileNames: string[];
  phaseReadinessReviewFileNames: string[];
}

export interface PhaseMapBuildInput extends PhaseMapRequest {
  sourceProjectPlanningDocuments: ProjectPlanningDocumentsRecord;
  sourceProjectPlanningDocumentsMarkdownFileName?: string;
  sourceRepositoryReconciliation: RepositoryReconciliationRecord;
  sourceRepositoryReconciliationMarkdownFileName?: string;
  sourceProjectRoadmap: ProjectRoadmapRecord;
  sourceProjectRoadmapMarkdownFileName?: string;
  existingPhaseArtifacts: PhaseMapExistingPhaseArtifact[];
}

export interface PhaseMapSourceFileReferences {
  projectPlanningDocumentJsonFileName: string;
  projectPlanningDocumentMarkdownFileName?: string;
  repositoryReconciliationJsonFileName: string;
  repositoryReconciliationMarkdownFileName?: string;
  projectRoadmapJsonFileName: string;
  projectRoadmapMarkdownFileName?: string;
  sourcePhase?: string;
}

export interface PhaseMapExistingArtifactPreview {
  phaseFolder: string;
  workCardCount: number;
  implementerReportCount: number;
  validationReportCount: number;
  repairPromptCount: number;
  closeoutReportCount: number;
  workCardPlanFileNames: string[];
  phasePlanningDocumentFileNames: string[];
  phaseReadinessReviewFileNames: string[];
  observations: string[];
  recommendation: string;
}

export interface MappedPhaseRecord {
  projectName: string;
  projectKey: string;
  phaseId: string;
  phaseTitle: string;
  phasePurpose: string;
  sourceRoadmapId: string;
  sourceReconciliationId: string;
  sourcePlanningDocumentId: string;
  status: MappedPhaseStatus;
  createdAt: string;
  updatedAt: string;
  sourceFiles: PhaseMapSourceFileReferences;
  notes: string[];
  assumptions: string[];
  risks: string[];
  unresolvedQuestions: string[];
  plannedWorkCards: WorkCardPlanItem[];
}

export interface PhaseMapRecord {
  phaseMapId: string;
  projectName: string;
  projectKey: string;
  sourceRoadmapId: string;
  sourceReconciliationId: string;
  sourcePlanningDocumentId: string;
  sourceFiles: PhaseMapSourceFileReferences;
  currentOrNextPhase: string;
  nextPhaseTitle: string;
  sourcePhase?: string;
  sourceFile: string;
  knownExistingPhaseArtifacts: PhaseMapExistingArtifactPreview[];
  plannedRoadmapPhases: string[];
  detectedGapsOrAssumptions: string[];
  mappedPhases: MappedPhaseRecord[];
  createdAt: string;
  updatedAt: string;
  phaseInterviewRequired: boolean;
  phaseInterviewArtifactId?: string;
}

export interface PhaseMapArtifactFileNames {
  slug: string;
  jsonFileName: string;
  markdownFileName: string;
}

export interface SavedMappedPhaseSummary {
  phaseId: string;
  phaseTitle: string;
  status: MappedPhaseStatus;
  isRecommendedNext: boolean;
  unresolvedQuestions: string[];
}

export interface SavedPhaseMapSummary {
  fileName: string;
  phaseMapId: string;
  projectName: string;
  sourceRoadmapId: string;
  sourceProjectRoadmapJsonFileName: string;
  sourceRepositoryReconciliationJsonFileName: string;
  sourceProjectPlanningDocumentJsonFileName: string;
  currentOrNextPhase: string;
  nextPhaseTitle: string;
  updatedAt: string;
  mappedPhases: SavedMappedPhaseSummary[];
}

export interface InvalidSavedPhaseMapFile {
  fileName: string;
  errorMessages: string[];
}

export interface ListSavedPhaseMapsResult {
  ok: boolean;
  phaseMaps?: SavedPhaseMapSummary[];
  invalidFiles?: InvalidSavedPhaseMapFile[];
  errorMessages?: string[];
}

export interface PhaseMapPreviewResult {
  ok: boolean;
  phaseMap?: PhaseMapRecord;
  markdown?: string;
  suggestedFileNames?: PhaseMapArtifactFileNames;
  errorMessages?: string[];
}

export interface PhaseMapSaveResult extends PhaseMapPreviewResult {
  savedJsonFileName?: string;
  savedMarkdownFileName?: string;
  jsonPath?: string;
  markdownPath?: string;
}

export function buildPhaseMapRecord(
  input: PhaseMapBuildInput,
  timestamp: string,
): PhaseMapRecord {
  const projectName =
    cleanText(input.sourceProjectRoadmap.projectName) ||
    cleanText(input.sourceProjectPlanningDocuments.projectName) ||
    cleanText(input.sourceRepositoryReconciliation.projectName) ||
    "ChampCity A/I";
  const projectKey = slugifyProjectIntakeName(projectName);
  const fileNames = buildPhaseMapFileNames(projectName);
  const sourceFiles: PhaseMapSourceFileReferences = {
    projectPlanningDocumentJsonFileName: requireText(
      input.projectPlanningDocumentFileName,
      "Project Planning Documents source",
    ),
    projectPlanningDocumentMarkdownFileName:
      input.sourceProjectPlanningDocumentsMarkdownFileName,
    repositoryReconciliationJsonFileName: requireText(
      input.repositoryReconciliationFileName,
      "Repository Reconciliation source",
    ),
    repositoryReconciliationMarkdownFileName:
      input.sourceRepositoryReconciliationMarkdownFileName,
    projectRoadmapJsonFileName: requireText(
      input.projectRoadmapFileName,
      "Project Roadmap source",
    ),
    projectRoadmapMarkdownFileName: input.sourceProjectRoadmapMarkdownFileName,
    sourcePhase: input.sourceProjectRoadmap.completedPhaseFolder,
  };
  const existingArtifacts = input.existingPhaseArtifacts.map(
    toExistingArtifactPreview,
  );
  const mappedPhases = input.sourceProjectRoadmap.phaseMap.map((phase) =>
    toMappedPhase({
      phase,
      projectName,
      projectKey,
      sourceRoadmap: input.sourceProjectRoadmap,
      sourceReconciliation: input.sourceRepositoryReconciliation,
      sourcePlanningDocuments: input.sourceProjectPlanningDocuments,
      sourceFiles,
      timestamp,
      existingArtifacts,
    }),
  );

  if (mappedPhases.length === 0) {
    throw new Error("Selected Project Roadmap does not contain mapped phases.");
  }

  return {
    phaseMapId: `PHASE_MAP_${fileNames.slug}`,
    projectName,
    projectKey,
    sourceRoadmapId: input.sourceProjectRoadmap.roadmapId,
    sourceReconciliationId: input.sourceRepositoryReconciliation.reconciliationId,
    sourcePlanningDocumentId: input.sourceProjectPlanningDocuments.recordId,
    sourceFiles,
    currentOrNextPhase: input.sourceProjectRoadmap.nextExecutablePhase.phaseFolder,
    nextPhaseTitle: input.sourceProjectRoadmap.nextExecutablePhase.phaseTitle,
    sourcePhase: input.sourceProjectRoadmap.completedPhaseFolder,
    sourceFile: sourceFiles.projectRoadmapJsonFileName,
    knownExistingPhaseArtifacts: existingArtifacts,
    plannedRoadmapPhases: mappedPhases.map(
      (phase) => `${phase.phaseId}: ${phase.phaseTitle}`,
    ),
    detectedGapsOrAssumptions: buildPhaseMapGaps(
      input.sourceProjectRoadmap,
      existingArtifacts,
    ),
    mappedPhases,
    createdAt: timestamp,
    updatedAt: timestamp,
    phaseInterviewRequired: input.phaseInterviewRequired === true,
    ...(input.phaseInterviewRequired === true && input.phaseInterviewArtifactId
      ? { phaseInterviewArtifactId: input.phaseInterviewArtifactId }
      : {}),
  };
}

export function renderPhaseMapMarkdown(record: PhaseMapRecord): string {
  return [
    `# Phase Map: ${record.projectName}`,
    section(
      "Source Context",
      [
        `Phase Map ID: ${record.phaseMapId}`,
        `Project: ${record.projectName}`,
        `Project key: ${record.projectKey}`,
        `Project Planning Documents JSON: ${record.sourceFiles.projectPlanningDocumentJsonFileName}`,
        `Project Planning Documents Markdown: ${record.sourceFiles.projectPlanningDocumentMarkdownFileName ?? "Not found."}`,
        `Repository Reconciliation JSON: ${record.sourceFiles.repositoryReconciliationJsonFileName}`,
        `Repository Reconciliation Markdown: ${record.sourceFiles.repositoryReconciliationMarkdownFileName ?? "Not found."}`,
        `Project Roadmap JSON: ${record.sourceFiles.projectRoadmapJsonFileName}`,
        `Project Roadmap Markdown: ${record.sourceFiles.projectRoadmapMarkdownFileName ?? "Not found."}`,
        `Roadmap ID: ${record.sourceRoadmapId}`,
        `Current/next phase: ${record.currentOrNextPhase}`,
        `Next phase title: ${record.nextPhaseTitle}`,
        "Activation boundary: mapped and pending-review phases are not active until an explicit Operator activation decision.",
        `Source phase: ${record.sourcePhase ?? "Not provided."}`,
        `Source file: ${record.sourceFile}`,
        `Created: ${record.createdAt}`,
        `Updated: ${record.updatedAt}`,
        `Phase Interview required: ${record.phaseInterviewRequired ? "Yes" : "No"}`,
        `Phase Interview authority: ${record.phaseInterviewArtifactId ?? "Not required."}`,
      ].join("\n"),
    ),
    section(
      "Known Existing Phase Artifacts",
      record.knownExistingPhaseArtifacts.map(renderExistingArtifact).join("\n\n"),
    ),
    section(
      "Planned Roadmap Phases",
      formatListOrFallback(record.plannedRoadmapPhases, "No phases mapped."),
    ),
    section(
      "Detected Gaps Or Assumptions",
      formatListOrFallback(
        record.detectedGapsOrAssumptions,
        "No deterministic gaps detected.",
      ),
    ),
    section("Mapped Phase Records", record.mappedPhases.map(renderMappedPhase).join("\n\n")),
  ].join("\n\n") + "\n";
}

export function buildPhaseMapFileNames(projectName: string): PhaseMapArtifactFileNames {
  const slug = slugifyProjectIntakeName(projectName);
  const slugErrors = validatePhaseMapSlug(slug);

  if (slugErrors.length > 0) {
    throw new Error(slugErrors.join(" "));
  }

  return {
    slug,
    jsonFileName: `PHASE_MAP_${slug}.json`,
    markdownFileName: `PHASE_MAP_${slug}.md`,
  };
}

export function validatePhaseMapSlug(slug: string): string[] {
  const value = cleanText(slug);

  if (value.length === 0) {
    return ["Phase Map filenames need a project name."];
  }

  if (value.includes("..") || /[\\/:\s]/.test(value)) {
    return ["Phase Map filenames must stay inside the approved folder."];
  }

  if (!/^[a-z0-9][a-z0-9_]*$/.test(value)) {
    return [
      "Phase Map filenames may use only lowercase letters, numbers, and underscores.",
    ];
  }

  return [];
}

export function validatePhaseMapArtifactFileName(fileName: string): string[] {
  const value = cleanText(fileName);

  if (value.length === 0) {
    return ["Phase Map filenames must not be blank."];
  }

  if (value.includes("..") || /[\\/:\s]/.test(value)) {
    return ["Phase Map filenames must not include folders or absolute paths."];
  }

  if (!/^PHASE_MAP_[a-z0-9][a-z0-9_]*\.(json|md)$/.test(value)) {
    return [
      "Phase Map artifacts must be named PHASE_MAP_<slug>.json or PHASE_MAP_<slug>.md.",
    ];
  }

  return [];
}

export function validatePhaseMapRecord(candidate: unknown): string[] {
  const errors: string[] = [];

  if (!isRecord(candidate)) {
    return ["Phase Map JSON must be an object."];
  }

  for (const field of [
    "phaseMapId",
    "projectName",
    "projectKey",
    "sourceRoadmapId",
    "sourceReconciliationId",
    "sourcePlanningDocumentId",
    "currentOrNextPhase",
    "nextPhaseTitle",
    "sourceFile",
    "createdAt",
    "updatedAt",
  ] as const) {
    const value = candidate[field];

    if (typeof value !== "string" || value.trim().length === 0) {
      errors.push(`${field} must be saved as text.`);
    }
  }

  if (!isRecord(candidate.sourceFiles)) {
    errors.push("sourceFiles must be saved as an object.");
  }
  if (typeof candidate.phaseInterviewRequired !== "boolean") {
    errors.push("phaseInterviewRequired must be saved as a boolean.");
  }
  if (
    candidate.phaseInterviewArtifactId !== undefined &&
    (typeof candidate.phaseInterviewArtifactId !== "string" ||
      candidate.phaseInterviewArtifactId.trim().length === 0)
  ) {
    errors.push("phaseInterviewArtifactId must be non-empty text when provided.");
  }

  for (const field of [
    "knownExistingPhaseArtifacts",
    "plannedRoadmapPhases",
    "detectedGapsOrAssumptions",
    "mappedPhases",
  ] as const) {
    if (!Array.isArray(candidate[field])) {
      errors.push(`${field} must be saved as a list.`);
    }
  }

  if (Array.isArray(candidate.mappedPhases)) {
    for (const phase of candidate.mappedPhases) {
      errors.push(...validateMappedPhaseRecord(phase));
    }
  }

  return errors;
}

function validateMappedPhaseRecord(candidate: unknown): string[] {
  const errors: string[] = [];

  if (!isRecord(candidate)) {
    return ["Mapped phase records must be objects."];
  }

  for (const field of [
    "projectName",
    "projectKey",
    "phaseId",
    "phaseTitle",
    "phasePurpose",
    "sourceRoadmapId",
    "sourceReconciliationId",
    "sourcePlanningDocumentId",
    "status",
    "createdAt",
    "updatedAt",
  ] as const) {
    const value = candidate[field];

    if (typeof value !== "string" || value.trim().length === 0) {
      errors.push(`mappedPhase.${field} must be saved as text.`);
    }
  }

  if (typeof candidate.phaseId === "string") {
    errors.push(...validateSafePhaseFolder(candidate.phaseId));
  }

  if (
    typeof candidate.status === "string" &&
    ![
      "mapped",
      "proposed",
      "planning_draft",
      "planned",
      "pending_review",
      "approved_for_work_card_creation",
      "active",
      "in_progress",
      "closed",
      "deferred",
      "superseded",
      "already_satisfied",
      "implemented_but_not_validated",
      "validated_but_not_closed",
    ].includes(candidate.status)
  ) {
    errors.push("mappedPhase.status is not supported.");
  }

  for (const field of [
    "notes",
    "assumptions",
    "risks",
    "unresolvedQuestions",
    "plannedWorkCards",
  ] as const) {
    if (!Array.isArray(candidate[field])) {
      errors.push(`mappedPhase.${field} must be saved as a list.`);
    }
  }

  return errors;
}

function toMappedPhase(input: {
  phase: ProjectRoadmapPhaseEntry;
  projectName: string;
  projectKey: string;
  sourceRoadmap: ProjectRoadmapRecord;
  sourceReconciliation: RepositoryReconciliationRecord;
  sourcePlanningDocuments: ProjectPlanningDocumentsRecord;
  sourceFiles: PhaseMapSourceFileReferences;
  timestamp: string;
  existingArtifacts: PhaseMapExistingArtifactPreview[];
}): MappedPhaseRecord {
  const existingArtifact = input.existingArtifacts.find(
    (artifact) => artifact.phaseFolder === input.phase.phaseFolder,
  );

  return {
    projectName: input.projectName,
    projectKey: input.projectKey,
    phaseId: input.phase.phaseFolder,
    phaseTitle: input.phase.phaseTitle,
    phasePurpose: input.phase.phasePurpose,
    sourceRoadmapId: input.sourceRoadmap.roadmapId,
    sourceReconciliationId: input.sourceReconciliation.reconciliationId,
    sourcePlanningDocumentId: input.sourcePlanningDocuments.recordId,
    status: toMappedStatus(input.phase.status, existingArtifact),
    createdAt: input.timestamp,
    updatedAt: input.timestamp,
    sourceFiles: {
      ...input.sourceFiles,
      sourcePhase: input.phase.phaseFolder,
    },
    notes: uniqueNonEmpty([
      `Roadmap confidence: ${input.phase.confidenceLevel}`,
      ...input.phase.dependencies,
      ...input.phase.decisionsNeeded,
      existingArtifact?.recommendation ?? "",
    ]),
    assumptions: uniqueNonEmpty([
      ...input.phase.sourceArtifactsUsed,
      ...input.phase.closeoutCriteria,
    ]),
    risks: uniqueNonEmpty(input.phase.risks),
    unresolvedQuestions: uniqueNonEmpty(input.phase.openQuestions),
    plannedWorkCards: input.phase.proposedWorkCards,
  };
}

function toExistingArtifactPreview(
  artifact: PhaseMapExistingPhaseArtifact,
): PhaseMapExistingArtifactPreview {
  return {
    phaseFolder: artifact.phaseFolder,
    workCardCount: artifact.summary.workCardCount,
    implementerReportCount: artifact.summary.implementerReportCount,
    validationReportCount: artifact.summary.validationReportCount,
    repairPromptCount: artifact.summary.repairPromptCount,
    closeoutReportCount: artifact.summary.closeoutReportCount,
    workCardPlanFileNames: artifact.workCardPlanFileNames,
    phasePlanningDocumentFileNames: artifact.phasePlanningDocumentFileNames,
    phaseReadinessReviewFileNames: artifact.phaseReadinessReviewFileNames,
    observations: artifact.summary.missingExpectedArtifactObservations,
    recommendation: artifact.summary.deterministicRecommendation,
  };
}

function toMappedStatus(
  status: ProjectRoadmapPhaseStatus,
  existingArtifact: PhaseMapExistingArtifactPreview | undefined,
): MappedPhaseStatus {
  if (status === "closed" || existingArtifact?.closeoutReportCount) {
    return "closed";
  }

  if (
    status === "pending review" ||
    (existingArtifact?.phasePlanningDocumentFileNames.length ?? 0) > 0 ||
    (existingArtifact?.workCardPlanFileNames.length ?? 0) > 0 ||
    (existingArtifact?.phaseReadinessReviewFileNames.length ?? 0) > 0
  ) {
    return "pending_review";
  }

  if (
    status === "active" ||
    status === "blocked" ||
    status === "repair required" ||
    status === "ready for closeout"
  ) {
    return "in_progress";
  }

  return "mapped";
}

function buildPhaseMapGaps(
  roadmap: ProjectRoadmapRecord,
  existingArtifacts: PhaseMapExistingArtifactPreview[],
): string[] {
  const existingPhaseIds = new Set(
    existingArtifacts.map((artifact) => artifact.phaseFolder),
  );
  const mappedPhaseIds = roadmap.phaseMap.map((phase) => phase.phaseFolder);
  const futureWithoutFolders = mappedPhaseIds.filter(
    (phaseId) => !existingPhaseIds.has(phaseId),
  );

  return uniqueNonEmpty([
    ...roadmap.staleStateWarnings,
    ...roadmap.openQuestions,
    ...roadmap.decisionsNeeded,
    ...futureWithoutFolders.map(
      (phaseId) =>
        `${phaseId} is mapped from the roadmap but has no generated phase artifact folder yet.`,
    ),
  ]);
}

function renderExistingArtifact(artifact: PhaseMapExistingArtifactPreview): string {
  return [
    `### ${artifact.phaseFolder}`,
    "",
    `- Work Cards: ${artifact.workCardCount}`,
    `- Implementer Reports: ${artifact.implementerReportCount}`,
    `- Validation Reports: ${artifact.validationReportCount}`,
    `- Repair Prompts: ${artifact.repairPromptCount}`,
    `- Closeout Reports: ${artifact.closeoutReportCount}`,
    `- Work Card Plans: ${artifact.workCardPlanFileNames.join("; ") || "None."}`,
    `- Phase Planning Documents: ${artifact.phasePlanningDocumentFileNames.join("; ") || "None."}`,
    `- Phase Readiness Reviews: ${artifact.phaseReadinessReviewFileNames.join("; ") || "None."}`,
    `- Recommendation: ${artifact.recommendation}`,
    `- Observations: ${artifact.observations.join("; ") || "None."}`,
  ].join("\n");
}

function renderMappedPhase(phase: MappedPhaseRecord): string {
  return [
    `### ${phase.phaseId}: ${phase.phaseTitle}`,
    "",
    `- Status: ${phase.status}`,
    `- Purpose: ${phase.phasePurpose}`,
    `- Source Roadmap ID: ${phase.sourceRoadmapId}`,
    `- Source Reconciliation ID: ${phase.sourceReconciliationId}`,
    `- Source Planning Document ID: ${phase.sourcePlanningDocumentId}`,
    `- Notes: ${phase.notes.join("; ") || "None."}`,
    `- Assumptions: ${phase.assumptions.join("; ") || "None."}`,
    `- Risks: ${phase.risks.join("; ") || "None."}`,
    `- Unresolved questions: ${phase.unresolvedQuestions.join("; ") || "None."}`,
    "",
    "#### Planned Work Cards",
    phase.plannedWorkCards.length > 0
      ? phase.plannedWorkCards
          .map(
            (item) =>
              [
                `${item.suggestedOrdering}. ${item.workCardIdProposal}: ${item.title}`,
                `   - Plan status: ${formatArtifactLifecycleStatus(item.planStatus ?? "proposed")}`,
                `   - Reconciliation status: ${formatWorkCardPlanItemStatus(item.reconciliationStatus ?? "planned")}`,
                "   - Executable status: Not Executable",
              ].join("\n"),
          )
          .join("\n")
      : "No planned Work Cards mapped.",
  ].join("\n");
}

function formatListOrFallback(items: string[], fallback: string): string {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : `- ${fallback}`;
}

function section(title: string, body: string): string {
  return `## ${title}\n\n${body.trim().length > 0 ? body : "Not provided."}`;
}

function requireText(value: string | undefined, label: string): string {
  const text = cleanText(value);

  if (text.length === 0) {
    throw new Error(`${label} is required.`);
  }

  return text;
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
