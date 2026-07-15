import {
  access,
  mkdir,
  readFile,
  readdir,
  realpath,
  stat,
  writeFile,
} from "node:fs/promises";
import { type Dirent } from "node:fs";
import path from "node:path";

import {
  assertCanonicalArtifact,
  type CanonicalArtifact,
  type ArtifactRelationships,
  type ArtifactStatus,
  type JsonValue,
} from "../../shared/artifacts";
import {
  ArtifactPairServiceError,
  type CanonicalArtifactLocation,
} from "../artifacts";
import { canonicalWorkflowAuthority } from "../canonicalRuntime";
import {
  bindRoutedArtifactWrite,
  recordRoutedArtifactCommit,
} from "../workflow";

import {
  buildDraftWorkCard,
  type NextWorkCardIdResult,
  type WorkCardDraftInput,
  type WorkCardPreviewResult,
  type WorkCardSaveResult,
} from "../../shared/workCards/workCardDraft";
import {
  buildWorkCardFileStem,
  slugifyWorkCardTitle,
  validateSafePhaseFolder,
} from "../../shared/workCards/workCardFileNames";
import {
  buildArchitectPromptFileName,
  type ArchitectPromptRequest,
  type ArchitectPromptPreviewResult,
  type ArchitectPromptSaveResult,
  type InvalidSavedWorkCardFile,
  type ListSavedWorkCardsResult,
  renderArchitectFramingPrompt,
  type SavedWorkCardSummary,
} from "../../shared/workCards/renderArchitectFramingPrompt";
import {
  buildImplementerExecutionPacketFileName,
  hasHighRiskReviewContext,
  type ImplementerExecutionPacketArtifactListResult,
  type ImplementerExecutionPacketArtifactOption,
  type ImplementerExecutionPacketArtifactOptions,
  type ImplementerExecutionPacketRequest,
  type ImplementerExecutionPacketSaveResult,
  type ImplementerExecutionPacketSupportingArtifact,
  type ImplementerExecutionPacketSupportingArtifactFileNames,
  type ImplementerExecutionPacketSupportingArtifacts,
  type ImplementerExecutionPacketPreviewResult,
  renderImplementerExecutionPacket,
} from "../../shared/workCards/renderImplementerExecutionPacket";
import {
  buildRiskReviewFileName,
  type RiskReviewPreviewResult,
  type RiskReviewRequest,
  type RiskReviewSaveResult,
  renderRiskReviewMarkdown,
} from "../../shared/workCards/renderRiskReviewMarkdown";
import {
  buildImplementerReportFileName,
  type ImplementerReportCapturePreviewResult,
  type ImplementerReportCaptureRequest,
  type ImplementerReportCaptureSaveResult,
  validateImplementerReport,
} from "../../shared/workCards/validateImplementerReport";
import { buildRepairPromptFileName, renderRepairPrompt } from "../../shared/workCards/renderRepairPrompt";
import {
  createEmptyPhaseArtifactFiles,
  getAllowedPhaseArtifactExtensions,
  phaseArtifactFolderNames,
  summarizePhaseArtifacts,
  validatePhaseArtifactFileName,
  type PhaseArtifactFilesByFolder,
  type PhaseArtifactFolderName,
} from "../../shared/workCards/phaseCloseout";
import {
  buildPhaseCloseoutJsonFileName,
  buildPhaseCloseoutMarkdownFileName,
  buildPhaseCloseoutRecord,
  type PhaseCloseoutFormInput,
  type PhaseCloseoutPreviewResult,
  type PhaseCloseoutSaveResult,
  type PhaseCloseoutSummaryResult,
} from "../../shared/workCards/phaseCloseoutRecord";
import { renderPhaseCloseoutMarkdown } from "../../shared/workCards/renderPhaseCloseoutMarkdown";
import { renderValidationRecordMarkdown } from "../../shared/workCards/renderValidationRecordMarkdown";
import { pendingArchitectDisposition } from "../../shared/workCards/reportReviewProtocol";
import { validateArchitectReview } from "../../shared/workCards/validateArchitectReview";
import {
  isRepairTarget,
  renderArchitectReviewRecord,
  validateArchitectReviewAssociation,
  validateArchitectReviewForm,
  type ArchitectReviewFormInput,
  type ArchitectReviewPreviewResult,
  type ArchitectReviewSaveResult,
} from "../../shared/workCards/architectReviewRecord";
import {
  buildHumanValidationRecord,
  buildValidationReportJsonFileName,
  buildValidationReportMarkdownFileName,
  type AvailablePhaseFoldersResult,
  type ImplementerReportFileLoadRequest,
  type ImplementerReportFileLoadResult,
  extractManualValidationChecklist,
  extractWorkCardValidationChecklist,
  getDifferentProblemGuidance,
  isHumanValidationOperatorDecision,
  isHumanValidationResult,
  noImplementerReportSelectedWarning,
  noManualValidationChecklistDetectedMessage,
  type HumanValidationImplementerReportListRequest,
  type HumanValidationImplementerReportListResult,
  type HumanValidationImplementerReportOption,
  type HumanValidationFormInput,
  type HumanValidationOperatorDecision,
  type HumanValidationResult,
  type ManualValidationChecklistExtraction,
  type HumanValidationPreviewResult,
  type HumanValidationRecord,
  type HumanValidationSaveResult,
  type HumanValidationStatusListResult,
  type HumanValidationStatusSummary,
  type InvalidHumanValidationImplementerReportFile,
  type InvalidHumanValidationStatusFile,
  shouldGenerateRepairPrompt,
  type ValidationEvidenceFileImportRequest,
  type ValidationEvidenceFileImportResult,
  validateHumanValidationRecord,
  validateValidationReportFileName,
} from "../../shared/workCards/validationRecord";
import {
  buildWorkCardValidationTarget,
  formatValidationTargetLabel,
  isValidationTargetKind,
  toValidationTargetRecord,
  validateValidationTargetJsonFileName,
  type InvalidValidationTargetFile,
  type ListValidationTargetsResult,
  type ValidationTargetRecord,
  type ValidationTargetSummary,
  type WorkCardValidationTargetFields,
} from "../../shared/workCards/validationTarget";
import type {
  CurrentActionArtifactReference,
  CurrentRequiredActionResult,
} from "../../shared/workCards/currentRequiredAction";
import {
  buildRouteReviewRequest,
  buildRouteReviewRequestFileNames,
  renderRouteReviewRequestMarkdown,
  type RouteReviewRequestInput,
  type RouteReviewRequestSaveResult,
} from "../../shared/workCards/routeReviewRequest";
import {
  getArtifactDisplayName,
  isPlanningMarkdownPreviewable,
  type PlanningArtifactPreviewRequest,
  type PlanningArtifactPreviewResult,
} from "../../shared/workCards/artifactReviewWorkspace";
import { renderWorkCardMarkdown } from "../../shared/workCards/renderWorkCardMarkdown";
import { routeWorkCardRisk } from "../../shared/workCards/riskRouter";
import type { WorkCard } from "../../shared/workCards/workCardSchema";
import { validateWorkCard } from "../../shared/workCards/validateWorkCard";
import {
  buildProjectIntake,
  buildProjectIntakeFileNames,
  validateProjectIntakeArtifactFileName,
  type ProjectIntake,
  type ProjectIntakeInput,
  type ProjectIntakePreviewResult,
  type ProjectIntakeSaveResult,
} from "../../shared/workCards/projectIntake";
import { renderProjectIntakeMarkdown } from "../../shared/workCards/renderProjectIntakeMarkdown";
import { validateProjectIntake } from "../../shared/workCards/validateProjectIntake";
import {
  buildProjectArchitectInterviewPrompt,
  buildProjectArchitectInterviewPromptFileNames,
  validateProjectArchitectInterviewPrompt,
  validateProjectArchitectInterviewPromptArtifactFileName,
  type InvalidSavedProjectIntakeFile,
  type ListSavedProjectIntakesResult,
  type ProjectArchitectInterviewPromptPreviewResult,
  type ProjectArchitectInterviewPromptRequest,
  type ProjectArchitectInterviewPromptSaveResult,
  type ProjectArchitectInterviewPrompt,
  type SavedProjectIntakeSummary,
} from "../../shared/workCards/projectArchitectInterviewPrompt";
import { renderProjectArchitectInterviewPromptMarkdown } from "../../shared/workCards/renderProjectArchitectInterviewPromptMarkdown";
import {
  buildProjectPlanningDocuments,
  buildProjectPlanningDocumentsFileNames,
  projectPlanningDocumentFileNames,
  renderProjectPlanningDocumentsPreview,
  renderProjectPlanningDocumentsRecordMarkdown,
  validateProjectPlanningDocumentsArtifactFileName,
  type InvalidSavedProjectArchitectInterviewPromptFile,
  type InvalidSavedProjectPlanningDocumentsFile,
  type ListSavedProjectArchitectInterviewPromptsResult,
  type ListSavedProjectPlanningDocumentsResult,
  type ProjectPlanningDocumentFileName,
  type ProjectPlanningDocumentsRecord,
  type ProjectPlanningDocumentsPreviewResult,
  type ProjectPlanningDocumentsRequest,
  type ProjectPlanningDocumentsSaveResult,
  type SavedProjectArchitectInterviewPromptSummary,
  type SavedProjectPlanningDocumentsSummary,
} from "../../shared/workCards/projectPlanningDocuments";
import {
  buildArchitectLedPhaseIntake,
  buildPhaseIntake,
  buildPhaseIntakeFileNames,
  isPhaseIntakeWorkType,
  validatePhaseIntakeArtifactFileName,
  type ArchitectLedPhaseIntakeBuildInput,
  type PhaseIntake,
  type PhaseIntakeInput,
  type PhaseIntakePreviewResult,
  type PhaseIntakeSaveResult,
} from "../../shared/workCards/phaseIntake";
import { renderPhaseIntakeMarkdown } from "../../shared/workCards/renderPhaseIntakeMarkdown";
import { validatePhaseIntake } from "../../shared/workCards/validatePhaseIntake";
import {
  buildPhaseArchitectInterviewPrompt,
  buildPhaseArchitectInterviewPromptFileNames,
  validatePhaseArchitectInterviewPrompt,
  validatePhaseArchitectInterviewPromptArtifactFileName,
  type InvalidSavedPhaseIntakeFile,
  type InvalidSavedPhaseArchitectInterviewPromptFile,
  type ListSavedPhaseArchitectInterviewPromptsResult,
  type ListSavedPhaseIntakesResult,
  type PhaseArchitectInterviewPrompt,
  type PhaseArchitectInterviewPromptPreviewResult,
  type PhaseArchitectInterviewPromptRequest,
  type PhaseArchitectInterviewPromptSaveResult,
  type SavedPhaseArchitectInterviewPromptSummary,
  type SavedPhaseIntakeSummary,
} from "../../shared/workCards/phaseArchitectInterviewPrompt";
import { renderPhaseArchitectInterviewPromptMarkdown } from "../../shared/workCards/renderPhaseArchitectInterviewPromptMarkdown";
import {
  buildRepositoryReconciliationFileNames,
  buildRepositoryReconciliationPromptText,
  buildRepositoryReconciliationRecord,
  renderRepositoryReconciliationMarkdown,
  validateRepositoryReconciliationArtifactFileName,
  validateRepositoryReconciliationRecord,
  type InvalidSavedRepositoryReconciliationFile,
  type ListSavedRepositoryReconciliationsResult,
  type RepositoryReconciliationPreviewResult,
  type RepositoryReconciliationPromptContext,
  type RepositoryReconciliationPromptPreviewResult,
  type RepositoryReconciliationPromptRequest,
  type RepositoryReconciliationRecord,
  type RepositoryReconciliationRequest,
  type RepositoryReconciliationSaveResult,
  type SavedRepositoryReconciliationSummary,
} from "../../shared/workCards/repositoryReconciliation";
import {
  buildCombinedPhasePlanningMarkdown,
  buildPhasePlanningDocuments,
  buildPhasePlanningDocumentsFileNames,
  renderPhasePlanningDocumentsMarkdown,
  validatePhasePlanningDocumentsArtifactFileName,
  type PhasePlanningDocumentsPreviewResult,
  type PhasePlanningDocumentsRecord,
  type PhasePlanningDocumentsRequest,
  type PhasePlanningDocumentsSaveResult,
} from "../../shared/workCards/phasePlanningDocuments";
import {
  buildWorkCardPlanFileNames,
  buildWorkCardPlanRecord,
  renderPhaseScopedBacklogMarkdown,
  renderWorkCardPlanMarkdown,
  validateWorkCardPlanRecord,
  validateWorkCardPlanArtifactFileName,
  type InvalidSavedWorkCardPlanFile,
  type ListSavedWorkCardPlansResult,
  type SavedWorkCardPlanSummary,
  type WorkCardPlanRecord,
} from "../../shared/workCards/workCardPlan";
import {
  buildCompatibilityPhaseIntakeFromRoadmap,
  buildPhaseReadinessReviewFileNames,
  buildPhaseReadinessReviewRecord,
  buildProjectRoadmap,
  buildProjectRoadmapFileNames,
  buildRoadmapWorkCardPlanFileNames,
  buildRoadmapWorkCardPlanRecord,
  renderPhaseReadinessReviewMarkdown,
  renderProjectRoadmapMarkdown,
  validatePhaseReadinessReviewArtifactFileName,
  validateProjectRoadmapArtifactFileName,
  validateProjectRoadmapRecord,
  type InvalidSavedProjectRoadmapFile,
  type ListSavedProjectRoadmapsResult,
  type ProjectRoadmapBuildInput,
  type ProjectRoadmapNextPhaseArtifactPreview,
  type ProjectRoadmapPreviewResult,
  type ProjectRoadmapRecord,
  type ProjectRoadmapRequest,
  type ProjectRoadmapSaveResult,
  type ProjectRoadmapSourceArtifact,
  type SavedProjectRoadmapSummary,
} from "../../shared/workCards/projectRoadmap";
import {
  buildPhaseMapFileNames,
  buildPhaseMapRecord,
  renderPhaseMapMarkdown,
  validatePhaseMapArtifactFileName,
  validatePhaseMapRecord,
  type InvalidSavedPhaseMapFile,
  type ListSavedPhaseMapsResult,
  type PhaseMapBuildInput,
  type PhaseMapRequest,
  type PhaseMapPreviewResult,
  type PhaseMapRecord,
  type PhaseMapSaveResult,
  type SavedPhaseMapSummary,
} from "../../shared/workCards/phaseMap";

const repositoryRoot = path.resolve(__dirname, "..", "..", "..");
const artifactPairService = canonicalWorkflowAuthority.artifactPairs;
const planningPhasesRoot = path.join(repositoryRoot, "planning", "phases");
const planningProjectRoot = path.join(repositoryRoot, "planning", "project");
const validationEvidenceAllowedExtensions = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".txt",
  ".md",
]);
type SupportingArtifactFolder =
  | "Work_Cards"
  | "Architect_Prompts"
  | "Risk_Reviews"
  | "Implementer_Reports";

interface HumanValidationTargetContext {
  target: ValidationTargetSummary;
}

interface LatestHumanValidationStatus extends HumanValidationStatusSummary {
  latestSortMs: number;
  fileModifiedMs: number;
}

type HumanValidationStatusRecord = Pick<
  HumanValidationRecord,
  "phase" | "validationResult"
> &
  Partial<
    Pick<
      HumanValidationRecord,
      | "workCardId"
      | "workCardTitle"
      | "validationTargetId"
      | "validationTargetKind"
      | "validationTargetTitle"
      | "validationTargetSourceJsonFile"
      | "architectDisposition"
      | "operatorDecision"
      | "createdAt"
    >
  >;

export async function listAvailablePhaseFolders(): Promise<AvailablePhaseFoldersResult> {
  try {
    let entries: Dirent[] = [];

    try {
      entries = await readdir(planningPhasesRoot, { withFileTypes: true });
    } catch (error) {
      if (!isNodeErrorWithCode(error, "ENOENT")) {
        throw error;
      }
    }

    const phases = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((entry) => validateSafePhaseFolder(entry).length === 0)
      .sort((left, right) => left.localeCompare(right));

    return {
      ok: true,
      phases,
    };
  } catch (error) {
    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function getCurrentRequiredAction(): Promise<CurrentRequiredActionResult> {
  try {
    return await canonicalWorkflowAuthority.projectCurrentRequiredAction();
  } catch (error) {
    return {
      ok: false,
      workflowSteps: [],
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function previewPlanningArtifact(
  input: PlanningArtifactPreviewRequest,
): Promise<PlanningArtifactPreviewResult> {
  const requestedPath =
    typeof input?.path === "string"
      ? input.path.trim().replace(/\\/g, "/")
      : "";

  if (!isPlanningMarkdownPreviewable(requestedPath)) {
    return {
      ok: false,
      errorMessages: [
        "Only repo-relative Markdown files inside the planning folder can be previewed.",
      ],
    };
  }

  try {
    const planningRoot = resolveInside(repositoryRoot, "planning");
    const relativeSegments = requestedPath.split("/").slice(1);
    const filePath = resolveInside(planningRoot, ...relativeSegments);
    const resolvedPlanningRoot = await realpath(planningRoot);
    const resolvedFilePath = resolveInside(
      resolvedPlanningRoot,
      await realpath(filePath),
    );
    const fileStats = await stat(resolvedFilePath);

    if (!fileStats.isFile()) {
      return {
        ok: false,
        errorMessages: ["The selected planning artifact is not a file."],
      };
    }

    if (fileStats.size > 2 * 1024 * 1024) {
      return {
        ok: false,
        errorMessages: [
          "The selected planning artifact is too large for the inline preview.",
        ],
      };
    }

    const content = await readFile(resolvedFilePath, "utf8");
    const previewLimit = 120_000;

    return {
      ok: true,
      path: requestedPath,
      displayName: getArtifactDisplayName(requestedPath),
      content: content.slice(0, previewLimit),
      truncated: content.length > previewLimit,
    };
  } catch {
    return {
      ok: false,
      errorMessages: [
        "The selected planning artifact could not be read. It may be missing or unavailable.",
      ],
    };
  }
}

export async function getNextWorkCardId(
  phase: string,
): Promise<NextWorkCardIdResult> {
  try {
    const directory = resolveWorkCardsDirectory(phase);

    let entries: string[] = [];

    try {
      entries = await readdir(directory);
    } catch (error) {
      if (!isNodeErrorWithCode(error, "ENOENT")) {
        throw error;
      }
    }

    const nextNumber = entries.reduce((highest, fileName) => {
      const match = /^WC(\d+)/i.exec(fileName);

      if (!match) {
        return highest;
      }

      const value = Number.parseInt(match[1], 10);
      return Number.isNaN(value) ? highest : Math.max(highest, value);
    }, 0) + 1;

    return {
      ok: true,
      workCardId: `WC${String(nextNumber).padStart(2, "0")}`,
    };
  } catch (error) {
    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export function previewDraftWorkCard(
  input: WorkCardDraftInput,
): WorkCardPreviewResult {
  try {
    const workCard = buildDraftWorkCard(input, new Date().toISOString());
    const markdown = renderWorkCardMarkdown(workCard);

    return {
      ok: true,
      markdown,
      workCard,
    };
  } catch (error) {
    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function saveDraftWorkCard(
  input: WorkCardDraftInput,
): Promise<WorkCardSaveResult> {
  try {
    const workCard = buildDraftWorkCard(input, new Date().toISOString());
    const markdown = renderWorkCardMarkdown(workCard);
    const directory = resolveWorkCardsDirectory(workCard.phase);
    const fileStem = buildWorkCardFileStem(workCard.workCardId, workCard.title);
    const targets = await saveCanonicalPlanningArtifact({
      directory,
      jsonFileName: `${fileStem}.json`,
      markdownFileName: `${fileStem}.md`,
      artifactType: "work_card",
      title: workCard.title,
      contentMarkdown: markdown,
      data: workCard,
      phaseId: workCard.phase,
      workCardId: workCard.workCardId,
      parentArtifactId: buildParentWorkCardArtifactId(
        workCard.phase,
        workCard.workCardId,
      ),
    });

    return {
      ok: true,
      markdown,
      workCard,
      markdownPath: targets.secondPath,
      jsonPath: targets.firstPath,
    };
  } catch (error) {
    console.error("Failed to save Work Card draft.", error);

    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export function previewProjectIntake(
  input: ProjectIntakeInput,
): ProjectIntakePreviewResult {
  try {
    const projectIntake = buildProjectIntake(input, new Date().toISOString());
    const validation = validateProjectIntake(projectIntake);
    const suggestedFileNames = buildProjectIntakeFileNames(
      projectIntake.projectName,
    );

    if (!validation.valid) {
      return {
        ok: false,
        validation,
        projectIntake,
        suggestedFileNames,
        errorMessages: validation.errors,
      };
    }

    return {
      ok: true,
      validation,
      projectIntake,
      markdown: renderProjectIntakeMarkdown(projectIntake),
      suggestedFileNames,
    };
  } catch (error) {
    return {
      ok: false,
      validation: {
        valid: false,
        errors: [toPlainSaveError(error)],
        warnings: [],
      },
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function saveProjectIntake(
  input: ProjectIntakeInput,
): Promise<ProjectIntakeSaveResult> {
  try {
    const preview = previewProjectIntake(input);

    if (
      !preview.ok ||
      !preview.projectIntake ||
      !preview.markdown ||
      !preview.suggestedFileNames
    ) {
      return preview;
    }

    const directory = resolveProjectIntakeDirectory();
    const targetNameErrors = [
      ...validateProjectIntakeArtifactFileName(
        preview.suggestedFileNames.jsonFileName,
      ),
      ...validateProjectIntakeArtifactFileName(
        preview.suggestedFileNames.markdownFileName,
      ),
    ];

    if (targetNameErrors.length > 0) {
      throw new Error(targetNameErrors.join(" "));
    }

    const targets = await saveCanonicalPlanningArtifact({
      directory,
      jsonFileName: preview.suggestedFileNames.jsonFileName,
      markdownFileName: preview.suggestedFileNames.markdownFileName,
      artifactType: "project_intake",
      title: preview.projectIntake.projectName,
      contentMarkdown: preview.markdown,
      data: preview.projectIntake,
    });

    return {
      ...preview,
      ok: true,
      savedJsonFileName: targets.firstFileName,
      savedMarkdownFileName: targets.secondFileName,
      jsonPath: targets.firstPath,
      markdownPath: targets.secondPath,
    };
  } catch (error) {
    console.error("Failed to save Project Intake.", error);

    return {
      ok: false,
      validation: {
        valid: false,
        errors: [toPlainSaveError(error)],
        warnings: [],
      },
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function listSavedProjectIntakes(): Promise<ListSavedProjectIntakesResult> {
  try {
    const directory = resolveProjectIntakeDirectory();

    let entries: string[] = [];

    try {
      entries = await readdir(directory);
    } catch (error) {
      if (!isNodeErrorWithCode(error, "ENOENT")) {
        throw error;
      }
    }

    const projectIntakes: SavedProjectIntakeSummary[] = [];
    const invalidFiles: InvalidSavedProjectIntakeFile[] = [];

    for (const fileName of entries.filter((entry) =>
      entry.toLowerCase().endsWith(".json"),
    )) {
      const fileNameErrors = validateSavedProjectIntakeJsonFileName(fileName);

      if (fileNameErrors.length > 0) {
        invalidFiles.push({ fileName, errorMessages: fileNameErrors });
        continue;
      }

      try {
        const projectIntake = await readSavedProjectIntakeFile(fileName);
        projectIntakes.push({
          fileName,
          projectIntakeId: projectIntake.projectIntakeId,
          projectName: projectIntake.projectName,
          currentStage: projectIntake.currentStage,
          architectSurface: projectIntake.architectSurface || "ChatGPT",
          updatedAt: projectIntake.updatedAt,
        });
      } catch (error) {
        invalidFiles.push({
          fileName,
          errorMessages: [toPlainSaveError(error)],
        });
      }
    }

    projectIntakes.sort(compareSavedProjectArtifactSummaries);

    return {
      ok: true,
      projectIntakes,
      invalidFiles,
    };
  } catch (error) {
    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function previewProjectArchitectInterviewPrompt(
  input: ProjectArchitectInterviewPromptRequest,
): Promise<ProjectArchitectInterviewPromptPreviewResult> {
  try {
    const sourceProjectIntake = await readSavedProjectIntakeFile(
      input.projectIntakeFileName,
    );
    const sourceProjectIntakeMarkdownFileName =
      await findMatchingProjectIntakeMarkdownFileName(input.projectIntakeFileName);
    const promptRecord = buildProjectArchitectInterviewPrompt(
      sourceProjectIntake,
      input.projectIntakeFileName.trim(),
      sourceProjectIntakeMarkdownFileName,
      new Date().toISOString(),
    );
    const suggestedFileNames =
      buildProjectArchitectInterviewPromptFileNames(promptRecord.projectName);
    const markdown =
      renderProjectArchitectInterviewPromptMarkdown(promptRecord);

    return {
      ok: true,
      promptRecord,
      promptText: promptRecord.promptText,
      markdown,
      sourceProjectIntake,
      sourceProjectIntakeFileName: input.projectIntakeFileName.trim(),
      sourceProjectIntakeMarkdownFileName,
      suggestedFileNames,
    };
  } catch (error) {
    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function saveProjectArchitectInterviewPrompt(
  input: ProjectArchitectInterviewPromptRequest,
): Promise<ProjectArchitectInterviewPromptSaveResult> {
  try {
    const preview = await previewProjectArchitectInterviewPrompt(input);

    if (
      !preview.ok ||
      !preview.promptRecord ||
      !preview.markdown ||
      !preview.suggestedFileNames
    ) {
      return preview;
    }

    const directory = resolveProjectArchitectInterviewPromptsDirectory();
    const targetNameErrors = [
      ...validateProjectArchitectInterviewPromptArtifactFileName(
        preview.suggestedFileNames.jsonFileName,
      ),
      ...validateProjectArchitectInterviewPromptArtifactFileName(
        preview.suggestedFileNames.markdownFileName,
      ),
    ];

    if (targetNameErrors.length > 0) {
      throw new Error(targetNameErrors.join(" "));
    }

    const targets = await saveCanonicalPlanningArtifact({
      directory,
      jsonFileName: preview.suggestedFileNames.jsonFileName,
      markdownFileName: preview.suggestedFileNames.markdownFileName,
      artifactType: "architect_interview",
      title: `${preview.promptRecord.projectName} Architect Interview`,
      contentMarkdown: preview.markdown,
      data: preview.promptRecord,
    });

    return {
      ...preview,
      ok: true,
      savedJsonFileName: targets.firstFileName,
      savedMarkdownFileName: targets.secondFileName,
      jsonPath: targets.firstPath,
      markdownPath: targets.secondPath,
    };
  } catch (error) {
    console.error("Failed to save Project Architect Interview Prompt.", error);

    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function listSavedProjectArchitectInterviewPrompts(): Promise<ListSavedProjectArchitectInterviewPromptsResult> {
  try {
    const directory = resolveProjectArchitectInterviewPromptsDirectory();

    let entries: string[] = [];

    try {
      entries = await readdir(directory);
    } catch (error) {
      if (!isNodeErrorWithCode(error, "ENOENT")) {
        throw error;
      }
    }

    const prompts: SavedProjectArchitectInterviewPromptSummary[] = [];
    const invalidFiles: InvalidSavedProjectArchitectInterviewPromptFile[] = [];

    for (const fileName of entries.filter((entry) =>
      entry.toLowerCase().endsWith(".json"),
    )) {
      const fileNameErrors =
        validateSavedProjectArchitectInterviewPromptJsonFileName(fileName);

      if (fileNameErrors.length > 0) {
        invalidFiles.push({ fileName, errorMessages: fileNameErrors });
        continue;
      }

      try {
        const promptRecord =
          await readSavedProjectArchitectInterviewPromptFile(fileName);
        prompts.push({
          fileName,
          promptId: promptRecord.promptId,
          projectIntakeId: promptRecord.projectIntakeId,
          projectName: promptRecord.projectName,
          architectSurface: promptRecord.architectSurface,
          updatedAt: promptRecord.updatedAt,
        });
      } catch (error) {
        invalidFiles.push({
          fileName,
          errorMessages: [toPlainSaveError(error)],
        });
      }
    }

    prompts.sort(compareSavedProjectArtifactSummaries);

    return {
      ok: true,
      prompts,
      invalidFiles,
    };
  } catch (error) {
    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function previewProjectPlanningDocuments(
  input: ProjectPlanningDocumentsRequest,
): Promise<ProjectPlanningDocumentsPreviewResult> {
  try {
    const context = await readProjectPlanningDocumentsContext(input);
    const record = buildProjectPlanningDocuments({
      ...context,
      architectInterviewOutput: input.architectInterviewOutput,
      timestamp: new Date().toISOString(),
    });
    const suggestedFileNames = buildProjectPlanningDocumentsFileNames(
      record.projectName,
    );
    const combinedMarkdown = renderProjectPlanningDocumentsPreview(
      record.documents,
    );

    return {
      ok: true,
      record,
      documents: record.documents,
      combinedMarkdown,
      suggestedFileNames,
    };
  } catch (error) {
    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function saveProjectPlanningDocuments(
  input: ProjectPlanningDocumentsRequest,
): Promise<ProjectPlanningDocumentsSaveResult> {
  try {
    const preview = await previewProjectPlanningDocuments(input);

    if (
      !preview.ok ||
      !preview.record ||
      !preview.documents ||
      !preview.combinedMarkdown ||
      !preview.suggestedFileNames
    ) {
      return preview;
    }

    const sidecarDirectory = resolveProjectPlanningDocumentsDirectory();
    const targetNameErrors = [
      ...validateProjectPlanningDocumentsArtifactFileName(
        preview.suggestedFileNames.jsonFileName,
      ),
      ...validateProjectPlanningDocumentsArtifactFileName(
        preview.suggestedFileNames.markdownFileName,
      ),
    ];

    if (targetNameErrors.length > 0) {
      throw new Error(targetNameErrors.join(" "));
    }

    const projectMarkdownPaths: string[] = [];

    for (const document of preview.documents) {
      const documentTargets = await saveCanonicalPlanningArtifact({
        directory: planningProjectRoot,
        markdownFileName: document.fileName,
        artifactType: "supporting_document",
        contentMarkdown: document.markdown,
        data: {
          projectPlanningRecordId: preview.record.recordId,
          fileName: document.fileName,
        },
      });
      projectMarkdownPaths.push(documentTargets.secondPath);
    }

    const sidecarMarkdown = renderProjectPlanningDocumentsRecordMarkdown(
      preview.record,
    );

    const targets = await saveCanonicalPlanningArtifact({
      directory: sidecarDirectory,
      jsonFileName: preview.suggestedFileNames.jsonFileName,
      markdownFileName: preview.suggestedFileNames.markdownFileName,
      artifactType: "project_planning",
      title: `${preview.record.projectName} Project Planning Documents`,
      contentMarkdown: sidecarMarkdown,
      data: preview.record,
    });

    return {
      ...preview,
      ok: true,
      savedJsonFileName: targets.firstFileName,
      savedMarkdownFileName: targets.secondFileName,
      jsonPath: targets.firstPath,
      markdownPath: targets.secondPath,
      projectMarkdownPaths,
    };
  } catch (error) {
    console.error("Failed to save Project Planning Documents.", error);

    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function listSavedProjectPlanningDocuments(): Promise<ListSavedProjectPlanningDocumentsResult> {
  try {
    const directory = resolveProjectPlanningDocumentsDirectory();

    let entries: string[] = [];

    try {
      entries = await readdir(directory);
    } catch (error) {
      if (!isNodeErrorWithCode(error, "ENOENT")) {
        throw error;
      }
    }

    const documents: SavedProjectPlanningDocumentsSummary[] = [];
    const invalidFiles: InvalidSavedProjectPlanningDocumentsFile[] = [];

    for (const fileName of entries.filter((entry) =>
      entry.toLowerCase().endsWith(".json"),
    )) {
      const fileNameErrors =
        validateSavedProjectPlanningDocumentsJsonFileName(fileName);

      if (fileNameErrors.length > 0) {
        invalidFiles.push({ fileName, errorMessages: fileNameErrors });
        continue;
      }

      try {
        const record = await readSavedProjectPlanningDocumentsRecord(fileName);
        documents.push({
          fileName,
          recordId: record.recordId,
          projectName: record.projectName,
          updatedAt: record.updatedAt,
        });
      } catch (error) {
        invalidFiles.push({
          fileName,
          errorMessages: [toPlainSaveError(error)],
        });
      }
    }

    documents.sort(compareSavedProjectArtifactSummaries);

    return {
      ok: true,
      documents,
      invalidFiles,
    };
  } catch (error) {
    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function previewPhaseIntake(
  input: PhaseIntakeInput,
): Promise<PhaseIntakePreviewResult> {
  try {
    const timestamp = new Date().toISOString();
    let phaseIntake: PhaseIntake;

    if (input.generationMode === "architect-led") {
      phaseIntake = buildArchitectLedPhaseIntake(
        await readArchitectLedPhaseIntakeContext(input),
        timestamp,
      );
    } else {
      const context = await readPhaseIntakeProjectPlanningContext(input);
      phaseIntake = buildPhaseIntake(
        context.input,
        timestamp,
        context.sourceProjectPlanningSidecarMarkdownFileName,
      );
    }

    const validation = validatePhaseIntake(phaseIntake);
    const suggestedFileNames = buildPhaseIntakeFileNames(
      phaseIntake.phaseName,
    );

    if (!validation.valid) {
      return {
        ok: false,
        validation,
        phaseIntake,
        suggestedFileNames,
        errorMessages: validation.errors,
      };
    }

    return {
      ok: true,
      validation,
      phaseIntake,
      markdown: renderPhaseIntakeMarkdown(phaseIntake),
      suggestedFileNames,
    };
  } catch (error) {
    return {
      ok: false,
      validation: {
        valid: false,
        errors: [toPlainSaveError(error)],
        warnings: [],
      },
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function savePhaseIntake(
  input: PhaseIntakeInput,
): Promise<PhaseIntakeSaveResult> {
  try {
    const preview = await previewPhaseIntake(input);

    if (
      !preview.ok ||
      !preview.phaseIntake ||
      !preview.markdown ||
      !preview.suggestedFileNames
    ) {
      return preview;
    }

    const directory = resolvePhaseIntakeDirectory(preview.phaseIntake.phaseFolder);
    const targetNameErrors = [
      ...validatePhaseIntakeArtifactFileName(
        preview.suggestedFileNames.jsonFileName,
      ),
      ...validatePhaseIntakeArtifactFileName(
        preview.suggestedFileNames.markdownFileName,
      ),
    ];

    if (targetNameErrors.length > 0) {
      throw new Error(targetNameErrors.join(" "));
    }

    const targets = await saveCanonicalPlanningArtifact({
      directory,
      jsonFileName: preview.suggestedFileNames.jsonFileName,
      markdownFileName: preview.suggestedFileNames.markdownFileName,
      artifactType: "phase_intake",
      title: `${preview.phaseIntake.phaseName} Phase Intake`,
      contentMarkdown: preview.markdown,
      data: preview.phaseIntake,
      phaseId: preview.phaseIntake.phaseFolder,
    });

    return {
      ...preview,
      ok: true,
      savedJsonFileName: targets.firstFileName,
      savedMarkdownFileName: targets.secondFileName,
      jsonPath: targets.firstPath,
      markdownPath: targets.secondPath,
    };
  } catch (error) {
    console.error("Failed to save Phase Intake.", error);

    return {
      ok: false,
      validation: {
        valid: false,
        errors: [toPlainSaveError(error)],
        warnings: [],
      },
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function listSavedPhaseIntakes(
  phase: string,
): Promise<ListSavedPhaseIntakesResult> {
  try {
    const directory = resolvePhaseIntakeDirectory(phase);

    let entries: string[] = [];

    try {
      entries = await readdir(directory);
    } catch (error) {
      if (!isNodeErrorWithCode(error, "ENOENT")) {
        throw error;
      }
    }

    const phaseIntakes: SavedPhaseIntakeSummary[] = [];
    const invalidFiles: InvalidSavedPhaseIntakeFile[] = [];

    for (const fileName of entries.filter((entry) =>
      entry.toLowerCase().endsWith(".json"),
    )) {
      const fileNameErrors = validateSavedPhaseIntakeJsonFileName(fileName);

      if (fileNameErrors.length > 0) {
        invalidFiles.push({ fileName, errorMessages: fileNameErrors });
        continue;
      }

      try {
        const phaseIntake = await readSavedPhaseIntakeFile(phase, fileName);
        phaseIntakes.push({
          fileName,
          phaseIntakeId: phaseIntake.phaseIntakeId,
          phaseFolder: phaseIntake.phaseFolder,
          phaseName: phaseIntake.phaseName,
          projectName: phaseIntake.projectName,
          generationMode: phaseIntake.generationMode,
          sourceProjectPlanningSidecarJsonFileName:
            phaseIntake.sourceProjectPlanningSidecarJsonFileName,
          updatedAt: phaseIntake.updatedAt,
        });
      } catch (error) {
        invalidFiles.push({
          fileName,
          errorMessages: [toPlainSaveError(error)],
        });
      }
    }

    phaseIntakes.sort(compareSavedPhaseIntakeSummaries);

    return {
      ok: true,
      phaseIntakes,
      invalidFiles,
    };
  } catch (error) {
    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function previewPhaseArchitectInterviewPrompt(
  input: PhaseArchitectInterviewPromptRequest,
): Promise<PhaseArchitectInterviewPromptPreviewResult> {
  try {
    const sourcePhaseIntake = await readSavedPhaseIntakeFile(
      input.phaseFolder,
      input.phaseIntakeFileName,
    );
    const sourcePhaseIntakeMarkdownFileName =
      await findMatchingPhaseIntakeMarkdownFileName(
        input.phaseFolder,
        input.phaseIntakeFileName,
      );
    const promptRecord = buildPhaseArchitectInterviewPrompt(
      sourcePhaseIntake,
      input.phaseIntakeFileName.trim(),
      sourcePhaseIntakeMarkdownFileName,
      new Date().toISOString(),
    );
    const suggestedFileNames =
      buildPhaseArchitectInterviewPromptFileNames(promptRecord.phaseName);
    const markdown = renderPhaseArchitectInterviewPromptMarkdown(promptRecord);

    return {
      ok: true,
      promptRecord,
      promptText: promptRecord.promptText,
      markdown,
      sourcePhaseIntake,
      sourcePhaseIntakeFileName: input.phaseIntakeFileName.trim(),
      sourcePhaseIntakeMarkdownFileName,
      suggestedFileNames,
    };
  } catch (error) {
    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function savePhaseArchitectInterviewPrompt(
  input: PhaseArchitectInterviewPromptRequest,
): Promise<PhaseArchitectInterviewPromptSaveResult> {
  try {
    const preview = await previewPhaseArchitectInterviewPrompt(input);

    if (
      !preview.ok ||
      !preview.promptRecord ||
      !preview.markdown ||
      !preview.suggestedFileNames
    ) {
      return preview;
    }

    const directory = resolvePhaseArchitectInterviewPromptsDirectory(
      preview.promptRecord.phaseFolder,
    );
    const targetNameErrors = [
      ...validatePhaseArchitectInterviewPromptArtifactFileName(
        preview.suggestedFileNames.jsonFileName,
      ),
      ...validatePhaseArchitectInterviewPromptArtifactFileName(
        preview.suggestedFileNames.markdownFileName,
      ),
    ];

    if (targetNameErrors.length > 0) {
      throw new Error(targetNameErrors.join(" "));
    }

    const targets = await saveCanonicalPlanningArtifact({
      directory,
      jsonFileName: preview.suggestedFileNames.jsonFileName,
      markdownFileName: preview.suggestedFileNames.markdownFileName,
      artifactType: "architect_interview",
      title: `${preview.promptRecord.phaseName} Architect Interview`,
      contentMarkdown: preview.markdown,
      data: preview.promptRecord,
      phaseId: preview.promptRecord.phaseFolder,
    });

    return {
      ...preview,
      ok: true,
      savedJsonFileName: targets.firstFileName,
      savedMarkdownFileName: targets.secondFileName,
      jsonPath: targets.firstPath,
      markdownPath: targets.secondPath,
    };
  } catch (error) {
    console.error("Failed to save Phase Architect Interview Prompt.", error);

    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function listSavedPhaseArchitectInterviewPrompts(
  phase: string,
): Promise<ListSavedPhaseArchitectInterviewPromptsResult> {
  try {
    const directory = resolvePhaseArchitectInterviewPromptsDirectory(phase);

    let entries: string[] = [];

    try {
      entries = await readdir(directory);
    } catch (error) {
      if (!isNodeErrorWithCode(error, "ENOENT")) {
        throw error;
      }
    }

    const prompts: SavedPhaseArchitectInterviewPromptSummary[] = [];
    const invalidFiles: InvalidSavedPhaseArchitectInterviewPromptFile[] = [];

    for (const fileName of entries.filter((entry) =>
      entry.toLowerCase().endsWith(".json"),
    )) {
      const fileNameErrors =
        validateSavedPhaseArchitectInterviewPromptJsonFileName(fileName);

      if (fileNameErrors.length > 0) {
        invalidFiles.push({ fileName, errorMessages: fileNameErrors });
        continue;
      }

      try {
        const promptRecord = await readSavedPhaseArchitectInterviewPromptFile(
          phase,
          fileName,
        );
        prompts.push({
          fileName,
          promptId: promptRecord.promptId,
          phaseIntakeId: promptRecord.phaseIntakeId,
          phaseFolder: promptRecord.phaseFolder,
          phaseName: promptRecord.phaseName,
          projectName: promptRecord.projectName,
          updatedAt: promptRecord.updatedAt,
        });
      } catch (error) {
        invalidFiles.push({
          fileName,
          errorMessages: [toPlainSaveError(error)],
        });
      }
    }

    prompts.sort(compareSavedPhaseIntakeSummaries);

    return {
      ok: true,
      prompts,
      invalidFiles,
    };
  } catch (error) {
    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function previewRepositoryReconciliationPrompt(
  input: RepositoryReconciliationPromptRequest,
): Promise<RepositoryReconciliationPromptPreviewResult> {
  try {
    const context = await readRepositoryReconciliationPromptContext(input);
    const promptText = buildRepositoryReconciliationPromptText(input, context);

    return {
      ok: true,
      promptText,
    };
  } catch (error) {
    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function previewRepositoryReconciliation(
  input: RepositoryReconciliationRequest,
): Promise<RepositoryReconciliationPreviewResult> {
  try {
    const context = await readRepositoryReconciliationPromptContext(input);
    const reconciliation = buildRepositoryReconciliationRecord(
      input,
      context,
      new Date().toISOString(),
    );
    const markdown = renderRepositoryReconciliationMarkdown(reconciliation);
    const suggestedFileNames = buildRepositoryReconciliationFileNames(
      reconciliation.projectName,
    );

    return {
      ok: true,
      reconciliation,
      markdown,
      suggestedFileNames,
    };
  } catch (error) {
    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function saveRepositoryReconciliation(
  input: RepositoryReconciliationRequest,
): Promise<RepositoryReconciliationSaveResult> {
  try {
    const preview = await previewRepositoryReconciliation(input);

    if (
      !preview.ok ||
      !preview.reconciliation ||
      !preview.markdown ||
      !preview.suggestedFileNames
    ) {
      return preview;
    }

    const directory = resolveRepositoryReconciliationDirectory();
    const targetNameErrors = [
      ...validateRepositoryReconciliationArtifactFileName(
        preview.suggestedFileNames.jsonFileName,
      ),
      ...validateRepositoryReconciliationArtifactFileName(
        preview.suggestedFileNames.markdownFileName,
      ),
    ];

    if (targetNameErrors.length > 0) {
      throw new Error(targetNameErrors.join(" "));
    }

    const targets = await saveCanonicalPlanningArtifact({
      directory,
      jsonFileName: preview.suggestedFileNames.jsonFileName,
      markdownFileName: preview.suggestedFileNames.markdownFileName,
      artifactType: "repository_reconciliation",
      title: `${preview.reconciliation.projectName} Repository Reconciliation`,
      contentMarkdown: preview.markdown,
      data: preview.reconciliation,
    });

    return {
      ...preview,
      ok: true,
      savedJsonFileName: targets.firstFileName,
      savedMarkdownFileName: targets.secondFileName,
      jsonPath: targets.firstPath,
      markdownPath: targets.secondPath,
    };
  } catch (error) {
    console.error("Failed to save Repository Reconciliation.", error);

    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function listSavedRepositoryReconciliations(): Promise<ListSavedRepositoryReconciliationsResult> {
  try {
    const directory = resolveRepositoryReconciliationDirectory();

    let entries: string[] = [];

    try {
      entries = await readdir(directory);
    } catch (error) {
      if (!isNodeErrorWithCode(error, "ENOENT")) {
        throw error;
      }
    }

    const reconciliations: SavedRepositoryReconciliationSummary[] = [];
    const invalidFiles: InvalidSavedRepositoryReconciliationFile[] = [];

    for (const fileName of entries.filter((entry) =>
      entry.toLowerCase().endsWith(".json"),
    )) {
      const fileNameErrors =
        validateSavedRepositoryReconciliationJsonFileName(fileName);

      if (fileNameErrors.length > 0) {
        invalidFiles.push({ fileName, errorMessages: fileNameErrors });
        continue;
      }

      try {
        const reconciliation =
          await readSavedRepositoryReconciliationRecord(fileName);
        reconciliations.push({
          fileName,
          reconciliationId: reconciliation.reconciliationId,
          projectName: reconciliation.projectName,
          sourcePhaseFolder: reconciliation.sourcePhaseFolder,
          recommendedNextPhase: reconciliation.recommendedNextPhase,
          updatedAt: reconciliation.updatedAt,
        });
      } catch (error) {
        invalidFiles.push({
          fileName,
          errorMessages: [toPlainSaveError(error)],
        });
      }
    }

    reconciliations.sort(compareSavedProjectArtifactSummaries);

    return {
      ok: true,
      reconciliations,
      invalidFiles,
    };
  } catch (error) {
    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function previewProjectRoadmap(
  input: ProjectRoadmapRequest,
): Promise<ProjectRoadmapPreviewResult> {
  try {
    const timestamp = new Date().toISOString();
    const context = await readProjectRoadmapContext(input);
    const roadmap = buildProjectRoadmap(context, timestamp);
    const markdown = renderProjectRoadmapMarkdown(roadmap);
    const suggestedFileNames = buildProjectRoadmapFileNames(
      roadmap.projectName,
    );

    return {
      ok: true,
      roadmap,
      markdown,
      suggestedFileNames,
      nextPhaseArtifactPreview:
        await buildProjectRoadmapNextPhaseArtifactPreview(roadmap),
    };
  } catch (error) {
    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function saveProjectRoadmap(
  input: ProjectRoadmapRequest,
): Promise<ProjectRoadmapSaveResult> {
  try {
    const timestamp = new Date().toISOString();
    const context = await readProjectRoadmapContext(input);
    const roadmap = buildProjectRoadmap(context, timestamp);
    const markdown = renderProjectRoadmapMarkdown(roadmap);
    const suggestedFileNames = buildProjectRoadmapFileNames(
      roadmap.projectName,
    );
    const directory = resolveProjectRoadmapDirectory();
    const roadmapFileNameErrors = [
      ...validateProjectRoadmapArtifactFileName(suggestedFileNames.jsonFileName),
      ...validateProjectRoadmapArtifactFileName(
        suggestedFileNames.markdownFileName,
      ),
    ];

    if (roadmapFileNameErrors.length > 0) {
      throw new Error(roadmapFileNameErrors.join(" "));
    }

    const roadmapValidationErrors = validateProjectRoadmapRecord(roadmap);

    if (roadmapValidationErrors.length > 0) {
      throw new Error(roadmapValidationErrors.join(" "));
    }

    const roadmapTargets = await saveCanonicalPlanningArtifact({
      directory,
      jsonFileName: suggestedFileNames.jsonFileName,
      markdownFileName: suggestedFileNames.markdownFileName,
      artifactType: "roadmap",
      title: `${roadmap.projectName} Project Roadmap`,
      contentMarkdown: markdown,
      data: roadmap,
    });

    const nextPhaseSavePaths =
      input.approveNextPhaseArtifacts === true
        ? await saveProjectRoadmapNextPhaseArtifacts(roadmap, timestamp)
        : {};

    return {
      ok: true,
      roadmap,
      markdown,
      suggestedFileNames,
      nextPhaseArtifactPreview:
        await buildProjectRoadmapNextPhaseArtifactPreview(roadmap),
      savedJsonFileName: roadmapTargets.firstFileName,
      savedMarkdownFileName: roadmapTargets.secondFileName,
      jsonPath: roadmapTargets.firstPath,
      markdownPath: roadmapTargets.secondPath,
      ...nextPhaseSavePaths,
    };
  } catch (error) {
    console.error("Failed to save Project Roadmap.", error);

    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function listSavedProjectRoadmaps(): Promise<ListSavedProjectRoadmapsResult> {
  try {
    const directory = resolveProjectRoadmapDirectory();

    let entries: string[] = [];

    try {
      entries = await readdir(directory);
    } catch (error) {
      if (!isNodeErrorWithCode(error, "ENOENT")) {
        throw error;
      }
    }

    const roadmaps: SavedProjectRoadmapSummary[] = [];
    const invalidFiles: InvalidSavedProjectRoadmapFile[] = [];

    for (const fileName of entries.filter((entry) =>
      entry.toLowerCase().endsWith(".json"),
    )) {
      const fileNameErrors = validateSavedProjectRoadmapJsonFileName(fileName);

      if (fileNameErrors.length > 0) {
        invalidFiles.push({ fileName, errorMessages: fileNameErrors });
        continue;
      }

      try {
        const roadmap = await readSavedProjectRoadmapRecord(fileName);
        roadmaps.push({
          fileName,
          roadmapId: roadmap.roadmapId,
          projectName: roadmap.projectName,
          mode: roadmap.mode,
          nextExecutablePhaseFolder: roadmap.nextExecutablePhase.phaseFolder,
          nextExecutablePhaseTitle: roadmap.nextExecutablePhase.phaseTitle,
          updatedAt: roadmap.updatedAt,
        });
      } catch (error) {
        invalidFiles.push({
          fileName,
          errorMessages: [toPlainSaveError(error)],
        });
      }
    }

    roadmaps.sort(compareSavedProjectArtifactSummaries);

    return {
      ok: true,
      roadmaps,
      invalidFiles,
    };
  } catch (error) {
    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function previewPhaseMap(
  input: PhaseMapRequest,
): Promise<PhaseMapPreviewResult> {
  try {
    const timestamp = new Date().toISOString();
    const context = await readPhaseMapContext(input);
    const phaseMap = buildPhaseMapRecord(context, timestamp);
    const markdown = renderPhaseMapMarkdown(phaseMap);
    const suggestedFileNames = buildPhaseMapFileNames(phaseMap.projectName);

    return {
      ok: true,
      phaseMap,
      markdown,
      suggestedFileNames,
    };
  } catch (error) {
    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function savePhaseMap(
  input: PhaseMapRequest,
): Promise<PhaseMapSaveResult> {
  try {
    const timestamp = new Date().toISOString();
    const context = await readPhaseMapContext(input);
    const phaseMap = buildPhaseMapRecord(context, timestamp);
    const markdown = renderPhaseMapMarkdown(phaseMap);
    const suggestedFileNames = buildPhaseMapFileNames(phaseMap.projectName);
    const directory = resolvePhaseMapDirectory();
    const fileNameErrors = [
      ...validatePhaseMapArtifactFileName(suggestedFileNames.jsonFileName),
      ...validatePhaseMapArtifactFileName(suggestedFileNames.markdownFileName),
    ];

    if (fileNameErrors.length > 0) {
      throw new Error(fileNameErrors.join(" "));
    }

    const validationErrors = validatePhaseMapRecord(phaseMap);

    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join(" "));
    }

    const targets = await saveCanonicalPlanningArtifact({
      directory,
      jsonFileName: suggestedFileNames.jsonFileName,
      markdownFileName: suggestedFileNames.markdownFileName,
      artifactType: "phase_map",
      title: `${phaseMap.projectName} Phase Map`,
      contentMarkdown: markdown,
      data: phaseMap,
    });

    return {
      ok: true,
      phaseMap,
      markdown,
      suggestedFileNames,
      savedJsonFileName: targets.firstFileName,
      savedMarkdownFileName: targets.secondFileName,
      jsonPath: targets.firstPath,
      markdownPath: targets.secondPath,
    };
  } catch (error) {
    console.error("Failed to save Phase Map.", error);

    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function listSavedPhaseMaps(): Promise<ListSavedPhaseMapsResult> {
  try {
    const directory = resolvePhaseMapDirectory();

    let entries: string[] = [];

    try {
      entries = await readdir(directory);
    } catch (error) {
      if (!isNodeErrorWithCode(error, "ENOENT")) {
        throw error;
      }
    }

    const phaseMaps: SavedPhaseMapSummary[] = [];
    const invalidFiles: InvalidSavedPhaseMapFile[] = [];

    for (const fileName of entries.filter((entry) =>
      entry.toLowerCase().endsWith(".json"),
    )) {
      const fileNameErrors = validateSavedPhaseMapJsonFileName(fileName);

      if (fileNameErrors.length > 0) {
        invalidFiles.push({ fileName, errorMessages: fileNameErrors });
        continue;
      }

      try {
        const phaseMap = await readSavedPhaseMapRecord(fileName);
        phaseMaps.push(toSavedPhaseMapSummary(fileName, phaseMap));
      } catch (error) {
        invalidFiles.push({
          fileName,
          errorMessages: [toPlainSaveError(error)],
        });
      }
    }

    phaseMaps.sort(compareSavedProjectArtifactSummaries);

    return {
      ok: true,
      phaseMaps,
      invalidFiles,
    };
  } catch (error) {
    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function previewPhasePlanningDocuments(
  input: PhasePlanningDocumentsRequest,
): Promise<PhasePlanningDocumentsPreviewResult> {
  try {
    const context = await readPhasePlanningDocumentsContext(input);
    const timestamp = new Date().toISOString();
    const phasePlanningDocuments = buildPhasePlanningDocuments(
      context,
      timestamp,
    );
    const workCardPlan = buildWorkCardPlanRecord(
      {
        projectName: phasePlanningDocuments.projectName,
        phaseFolder: phasePlanningDocuments.phaseFolder,
        phaseName: phasePlanningDocuments.phaseName,
        sourcePhasePlanningDocumentsId:
          phasePlanningDocuments.phasePlanningDocumentsId,
        phaseGoal: phasePlanningDocuments.phaseGoal,
        phaseScope: phasePlanningDocuments.phaseScope,
        phaseRisks: phasePlanningDocuments.phaseRisks,
        dependencies: phasePlanningDocuments.phaseDependencies,
        validationExpectations: phasePlanningDocuments.validationExpectations,
        recommendedImplementationSequence:
          phasePlanningDocuments.recommendedImplementationSequence,
        phaseArchitectInterviewOutput:
          phasePlanningDocuments.phaseArchitectInterviewOutput,
        operatorPlanAdjustments: phasePlanningDocuments.operatorPlanAdjustments,
      },
      timestamp,
    );
    const phasePlanningMarkdown = renderPhasePlanningDocumentsMarkdown(
      phasePlanningDocuments,
    );
    const workCardPlanMarkdown = renderWorkCardPlanMarkdown(workCardPlan);
    const backlogMarkdown = renderPhaseScopedBacklogMarkdown(workCardPlan);
    const suggestedPhasePlanningFileNames =
      buildPhasePlanningDocumentsFileNames(phasePlanningDocuments.phaseName);
    const suggestedWorkCardPlanFileNames = buildWorkCardPlanFileNames(
      phasePlanningDocuments.phaseName,
    );

    return {
      ok: true,
      phasePlanningDocuments,
      workCardPlan,
      phasePlanningMarkdown,
      workCardPlanMarkdown,
      backlogMarkdown,
      combinedMarkdown: buildCombinedPhasePlanningMarkdown(
        phasePlanningMarkdown,
        workCardPlanMarkdown,
        backlogMarkdown,
      ),
      suggestedPhasePlanningFileNames,
      suggestedWorkCardPlanFileNames,
    };
  } catch (error) {
    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function savePhasePlanningDocuments(
  input: PhasePlanningDocumentsRequest,
): Promise<PhasePlanningDocumentsSaveResult> {
  try {
    const preview = await previewPhasePlanningDocuments(input);

    if (
      !preview.ok ||
      !preview.phasePlanningDocuments ||
      !preview.workCardPlan ||
      !preview.phasePlanningMarkdown ||
      !preview.suggestedPhasePlanningFileNames ||
      !preview.suggestedWorkCardPlanFileNames
    ) {
      return preview;
    }

    const phasePlanningDirectory = resolvePhasePlanningDocumentsDirectory(
      preview.phasePlanningDocuments.phaseFolder,
    );
    const workCardPlanDirectory = resolveWorkCardPlansDirectory(
      preview.phasePlanningDocuments.phaseFolder,
    );
    const targetNameErrors = [
      ...validatePhasePlanningDocumentsArtifactFileName(
        preview.suggestedPhasePlanningFileNames.jsonFileName,
      ),
      ...validatePhasePlanningDocumentsArtifactFileName(
        preview.suggestedPhasePlanningFileNames.markdownFileName,
      ),
      ...validateWorkCardPlanArtifactFileName(
        preview.suggestedWorkCardPlanFileNames.jsonFileName,
      ),
      ...validateWorkCardPlanArtifactFileName(
        preview.suggestedWorkCardPlanFileNames.markdownFileName,
      ),
    ];

    if (targetNameErrors.length > 0) {
      throw new Error(targetNameErrors.join(" "));
    }

    const workCardPlan = {
      ...preview.workCardPlan,
      sourcePhasePlanningDocumentsJsonFileName:
        preview.suggestedPhasePlanningFileNames.jsonFileName,
      sourcePhasePlanningDocumentsMarkdownFileName:
        preview.suggestedPhasePlanningFileNames.markdownFileName,
    };
    const workCardPlanMarkdown = renderWorkCardPlanMarkdown(workCardPlan);
    const backlogMarkdown = renderPhaseScopedBacklogMarkdown(workCardPlan);
    const combinedMarkdown = buildCombinedPhasePlanningMarkdown(
      preview.phasePlanningMarkdown,
      workCardPlanMarkdown,
      backlogMarkdown,
    );
    const requestedPhaseBacklogPath = resolvePhaseScopedBacklogPath(
      preview.phasePlanningDocuments.phaseFolder,
    );

    const phasePlanningTargets = await saveCanonicalPlanningArtifact({
      directory: phasePlanningDirectory,
      jsonFileName: preview.suggestedPhasePlanningFileNames.jsonFileName,
      markdownFileName: preview.suggestedPhasePlanningFileNames.markdownFileName,
      artifactType: "phase_planning",
      title: `${preview.phasePlanningDocuments.phaseName} Phase Planning`,
      contentMarkdown: preview.phasePlanningMarkdown,
      data: preview.phasePlanningDocuments,
      phaseId: preview.phasePlanningDocuments.phaseFolder,
    });
    const workCardPlanTargets = await saveCanonicalPlanningArtifact({
      directory: workCardPlanDirectory,
      jsonFileName: preview.suggestedWorkCardPlanFileNames.jsonFileName,
      markdownFileName: preview.suggestedWorkCardPlanFileNames.markdownFileName,
      artifactType: "work_card_plan",
      title: `${preview.phasePlanningDocuments.phaseName} Work Card Plan`,
      contentMarkdown: workCardPlanMarkdown,
      data: workCardPlan,
      phaseId: preview.phasePlanningDocuments.phaseFolder,
    });
    const backlogTargets = await saveCanonicalPlanningArtifact({
      directory: path.dirname(requestedPhaseBacklogPath),
      markdownFileName: path.basename(requestedPhaseBacklogPath),
      artifactType: "backlog",
      title: `${preview.phasePlanningDocuments.phaseName} Work Card Backlog`,
      contentMarkdown: backlogMarkdown,
      data: {
        phaseFolder: preview.phasePlanningDocuments.phaseFolder,
        sourceWorkCardPlanJsonFileName: workCardPlanTargets.firstFileName,
      },
      phaseId: preview.phasePlanningDocuments.phaseFolder,
    });
    const phaseBacklogPath = backlogTargets.secondPath;

    return {
      ...preview,
      ok: true,
      workCardPlan,
      workCardPlanMarkdown,
      backlogMarkdown,
      combinedMarkdown,
      savedPhasePlanningJsonFileName: phasePlanningTargets.firstFileName,
      savedPhasePlanningMarkdownFileName: phasePlanningTargets.secondFileName,
      phasePlanningJsonPath: phasePlanningTargets.firstPath,
      phasePlanningMarkdownPath: phasePlanningTargets.secondPath,
      savedWorkCardPlanJsonFileName: workCardPlanTargets.firstFileName,
      savedWorkCardPlanMarkdownFileName: workCardPlanTargets.secondFileName,
      workCardPlanJsonPath: workCardPlanTargets.firstPath,
      workCardPlanMarkdownPath: workCardPlanTargets.secondPath,
      phaseBacklogPath,
    };
  } catch (error) {
    console.error("Failed to save Phase Planning Documents.", error);

    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function listSavedWorkCardPlans(
  phase: string,
): Promise<ListSavedWorkCardPlansResult> {
  try {
    const directory = resolveWorkCardPlansDirectory(phase);

    let entries: string[] = [];

    try {
      entries = await readdir(directory);
    } catch (error) {
      if (!isNodeErrorWithCode(error, "ENOENT")) {
        throw error;
      }
    }

    const workCardPlans: SavedWorkCardPlanSummary[] = [];
    const invalidFiles: InvalidSavedWorkCardPlanFile[] = [];

    for (const fileName of entries.filter((entry) =>
      entry.toLowerCase().endsWith(".json"),
    )) {
      const fileNameErrors = validateSavedWorkCardPlanJsonFileName(fileName);

      if (fileNameErrors.length > 0) {
        invalidFiles.push({ fileName, errorMessages: fileNameErrors });
        continue;
      }

      try {
        const workCardPlan = await readSavedWorkCardPlanRecord(phase, fileName);
        workCardPlans.push(
          await toSavedWorkCardPlanSummary(directory, fileName, workCardPlan),
        );
      } catch (error) {
        invalidFiles.push({
          fileName,
          errorMessages: [toPlainSaveError(error)],
        });
      }
    }

    workCardPlans.sort(compareSavedProjectArtifactSummaries);

    return {
      ok: true,
      workCardPlans,
      invalidFiles,
    };
  } catch (error) {
    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function listSavedWorkCards(
  phase: string,
): Promise<ListSavedWorkCardsResult> {
  try {
    const directory = resolveWorkCardsDirectory(phase);

    let entries: string[] = [];

    try {
      entries = await readdir(directory);
    } catch (error) {
      if (!isNodeErrorWithCode(error, "ENOENT")) {
        throw error;
      }
    }

    const workCards: SavedWorkCardSummary[] = [];
    const invalidFiles: InvalidSavedWorkCardFile[] = [];

    for (const fileName of entries.filter((entry) =>
      entry.toLowerCase().endsWith(".json"),
    )) {
      const fileNameErrors = validateSavedWorkCardJsonFileName(fileName);

      if (fileNameErrors.length > 0) {
        invalidFiles.push({ fileName, errorMessages: fileNameErrors });
        continue;
      }

      try {
        const workCard = await readSavedWorkCardAssociationFile(phase, fileName);
        workCards.push(toSavedWorkCardSummary(fileName, workCard));
      } catch (error) {
        invalidFiles.push({
          fileName,
          errorMessages: [toPlainSaveError(error)],
        });
      }
    }

    workCards.sort((left, right) =>
      `${left.workCardId} ${left.title}`.localeCompare(
        `${right.workCardId} ${right.title}`,
      ),
    );

    return {
      ok: true,
      workCards,
      invalidFiles,
    };
  } catch (error) {
    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function listHumanValidationTargets(
  phase: string,
): Promise<ListValidationTargetsResult> {
  try {
    const targets: ValidationTargetSummary[] = [];
    const invalidFiles: InvalidValidationTargetFile[] = [];
    const workCardDirectory = resolveWorkCardsDirectory(phase);

    let workCardEntries: string[] = [];

    try {
      workCardEntries = await readdir(workCardDirectory);
    } catch (error) {
      if (!isNodeErrorWithCode(error, "ENOENT")) {
        throw error;
      }
    }

    for (const fileName of workCardEntries.filter((entry) =>
      entry.toLowerCase().endsWith(".json"),
    )) {
      const fileNameErrors = validateSavedWorkCardJsonFileName(fileName);

      if (fileNameErrors.length > 0) {
        invalidFiles.push({ fileName, errorMessages: fileNameErrors });
        continue;
      }

      try {
        targets.push(await readWorkCardValidationTargetFile(phase, fileName));
      } catch (error) {
        invalidFiles.push({
          fileName,
          errorMessages: [toPlainSaveError(error)],
        });
      }
    }

    const validationTargetDirectory = resolveValidationTargetsDirectory(phase);
    let validationTargetEntries: string[] = [];

    try {
      validationTargetEntries = await readdir(validationTargetDirectory);
    } catch (error) {
      if (!isNodeErrorWithCode(error, "ENOENT")) {
        throw error;
      }
    }

    for (const fileName of validationTargetEntries.filter((entry) =>
      entry.toLowerCase().endsWith(".json"),
    )) {
      const fileNameErrors = validateValidationTargetJsonFileName(fileName);

      if (fileNameErrors.length > 0) {
        invalidFiles.push({ fileName, errorMessages: fileNameErrors });
        continue;
      }

      try {
        targets.push(await readSavedValidationTargetFile(phase, fileName));
      } catch (error) {
        invalidFiles.push({
          fileName,
          errorMessages: [toPlainSaveError(error)],
        });
      }
    }

    targets.sort((left, right) =>
      `${left.id} ${left.kind} ${left.title}`.localeCompare(
        `${right.id} ${right.kind} ${right.title}`,
      ),
    );

    return {
      ok: true,
      targets,
      invalidFiles,
    };
  } catch (error) {
    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function previewArchitectPrompt(
  input: ArchitectPromptRequest,
): Promise<ArchitectPromptPreviewResult> {
  try {
    const workCard = await readSavedWorkCardFile(input.phase, input.fileName);
    const prompt = renderArchitectFramingPrompt(workCard);

    return {
      ok: true,
      prompt,
      workCard,
      sourceFileName: input.fileName,
    };
  } catch (error) {
    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function saveArchitectPrompt(
  input: ArchitectPromptRequest,
): Promise<ArchitectPromptSaveResult> {
  try {
    const workCard = await readSavedWorkCardFile(input.phase, input.fileName);
    const prompt = renderArchitectFramingPrompt(workCard);
    const directory = resolveArchitectPromptsDirectory(workCard.phase);
    const savedFileName = buildArchitectPromptFileName(workCard);
    const targets = await saveCanonicalPlanningArtifact({
      directory,
      markdownFileName: savedFileName,
      artifactType: "architect_prompt",
      title: `${workCard.workCardId} Architect Prompt`,
      contentMarkdown: `${prompt}\n`,
      data: {
        workCardId: workCard.workCardId,
        sourceWorkCardFileName: input.fileName,
      },
      phaseId: workCard.phase,
      workCardId: workCard.workCardId,
      parentArtifactId: buildParentWorkCardArtifactId(
        workCard.phase,
        workCard.workCardId,
      ),
    });

    return {
      ok: true,
      prompt,
      workCard,
      sourceFileName: input.fileName,
      markdownPath: targets.secondPath,
      savedFileName,
    };
  } catch (error) {
    console.error("Failed to save Architect prompt.", error);

    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function previewRiskReview(
  input: RiskReviewRequest,
): Promise<RiskReviewPreviewResult> {
  try {
    const workCard = await readSavedWorkCardFile(input.phase, input.fileName);
    const review = routeWorkCardRisk(workCard);
    const markdown = renderRiskReviewMarkdown(
      workCard,
      review,
      new Date().toISOString(),
    );

    return {
      ok: true,
      review,
      markdown,
      workCard,
      sourceFileName: input.fileName,
    };
  } catch (error) {
    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function saveRiskReview(
  input: RiskReviewRequest,
): Promise<RiskReviewSaveResult> {
  try {
    const workCard = await readSavedWorkCardFile(input.phase, input.fileName);
    const review = routeWorkCardRisk(workCard);
    const markdown = renderRiskReviewMarkdown(
      workCard,
      review,
      new Date().toISOString(),
    );
    const directory = resolveRiskReviewsDirectory(workCard.phase);
    const savedFileName = buildRiskReviewFileName(workCard);
    const targets = await saveCanonicalPlanningArtifact({
      directory,
      markdownFileName: savedFileName,
      artifactType: "risk_review",
      title: `${workCard.workCardId} Risk Review`,
      contentMarkdown: markdown,
      data: review,
      phaseId: workCard.phase,
      workCardId: workCard.workCardId,
      parentArtifactId: buildParentWorkCardArtifactId(
        workCard.phase,
        workCard.workCardId,
      ),
    });

    return {
      ok: true,
      review,
      markdown,
      workCard,
      sourceFileName: input.fileName,
      markdownPath: targets.secondPath,
      savedFileName,
    };
  } catch (error) {
    console.error("Failed to save risk review.", error);

    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function listImplementerExecutionPacketSupportingArtifacts(
  input: ImplementerExecutionPacketRequest,
): Promise<ImplementerExecutionPacketArtifactListResult> {
  try {
    const workCard = await readSavedWorkCardFile(input.phase, input.fileName);
    const workCardMarkdownFileName = input.fileName.replace(/\.json$/i, ".md");
    const invalidFiles: ImplementerExecutionPacketArtifactListResult["invalidFiles"] = [];
    const options: ImplementerExecutionPacketArtifactOptions = {
      workCardMarkdown: await listMarkdownArtifactOptions(
        workCard.phase,
        "Work_Cards",
        workCard.workCardId,
        workCardMarkdownFileName,
        invalidFiles,
      ),
      architectPrompts: await listMarkdownArtifactOptions(
        workCard.phase,
        "Architect_Prompts",
        workCard.workCardId,
        undefined,
        invalidFiles,
      ),
      riskReviews: await listMarkdownArtifactOptions(
        workCard.phase,
        "Risk_Reviews",
        workCard.workCardId,
        undefined,
        invalidFiles,
      ),
      priorImplementerReports: await listMarkdownArtifactOptions(
        workCard.phase,
        "Implementer_Reports",
        workCard.workCardId,
        undefined,
        invalidFiles,
      ),
    };
    const defaultSelections: ImplementerExecutionPacketSupportingArtifactFileNames = {
      workCardMarkdown: pickDefaultArtifactFileName(options.workCardMarkdown),
      architectPrompt: pickDefaultArtifactFileName(options.architectPrompts),
      riskReview: pickDefaultArtifactFileName(options.riskReviews),
      priorImplementerReport: pickDefaultArtifactFileName(
        options.priorImplementerReports,
      ),
    };

    return {
      ok: true,
      workCard,
      options,
      defaultSelections,
      notes: buildMissingArtifactNotes(defaultSelections),
      invalidFiles,
    };
  } catch (error) {
    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function previewImplementerExecutionPacket(
  input: ImplementerExecutionPacketRequest,
): Promise<ImplementerExecutionPacketPreviewResult> {
  try {
    const workCard = await readSavedWorkCardFile(input.phase, input.fileName);
    const supportingArtifacts = await readImplementerExecutionPacketSupportingArtifacts(
      workCard.phase,
      input.supportingArtifactFileNames,
    );
    const prompt = renderImplementerExecutionPacket(workCard, supportingArtifacts);

    return {
      ok: true,
      prompt,
      workCard,
      sourceFileName: input.fileName,
      selectedArtifactFileNames:
        toSelectedSupportingArtifactFileNames(supportingArtifacts),
      hasHighRiskContext: hasImplementerExecutionPacketHighRiskContext(
        workCard,
        supportingArtifacts,
      ),
      hasRiskReviewSelected: Boolean(supportingArtifacts.riskReview),
    };
  } catch (error) {
    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function saveImplementerExecutionPacket(
  input: ImplementerExecutionPacketRequest,
): Promise<ImplementerExecutionPacketSaveResult> {
  try {
    const workCard = await readSavedWorkCardFile(input.phase, input.fileName);
    const supportingArtifacts = await readImplementerExecutionPacketSupportingArtifacts(
      workCard.phase,
      input.supportingArtifactFileNames,
    );
    const prompt = renderImplementerExecutionPacket(workCard, supportingArtifacts);
    const directory = resolveImplementerExecutionPacketsDirectory(workCard.phase);
    const savedFileName = buildImplementerExecutionPacketFileName(workCard);
    const targets = await saveCanonicalPlanningArtifact({
      directory,
      markdownFileName: savedFileName,
      artifactType: "implementer_execution_packet",
      title: `${workCard.workCardId} Implementer Execution Packet`,
      contentMarkdown: `${prompt}\n`,
      data: {
        workCardId: workCard.workCardId,
        sourceWorkCardFileName: input.fileName,
        selectedArtifactFileNames:
          toSelectedSupportingArtifactFileNames(supportingArtifacts),
      },
      phaseId: workCard.phase,
      workCardId: workCard.workCardId,
      parentArtifactId: buildParentWorkCardArtifactId(
        workCard.phase,
        workCard.workCardId,
      ),
    });

    return {
      ok: true,
      prompt,
      workCard,
      sourceFileName: input.fileName,
      selectedArtifactFileNames:
        toSelectedSupportingArtifactFileNames(supportingArtifacts),
      hasHighRiskContext: hasImplementerExecutionPacketHighRiskContext(
        workCard,
        supportingArtifacts,
      ),
      hasRiskReviewSelected: Boolean(supportingArtifacts.riskReview),
      markdownPath: targets.secondPath,
      savedFileName,
    };
  } catch (error) {
    console.error("Failed to save Implementer prompt.", error);

    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function previewImplementerReportCapture(
  input: ImplementerReportCaptureRequest,
): Promise<ImplementerReportCapturePreviewResult> {
  const validation = validateImplementerReport(input.reportText);

  try {
    const workCard = input.workCardFileName
      ? await readSavedWorkCardAssociationFile(
          input.phase,
          input.workCardFileName,
        )
      : undefined;
    const savedFileName = buildImplementerReportFileName({
      reportType: input.reportType,
      workCardId: workCard?.workCardId,
      workCardTitle: workCard?.title,
      topic: input.topic,
    });

    return {
      ok: true,
      savedFileName,
      validation,
    };
  } catch (error) {
    return {
      ok: false,
      validation,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function saveImplementerReportCapture(
  input: ImplementerReportCaptureRequest,
): Promise<ImplementerReportCaptureSaveResult> {
  try {
    const preview = await previewImplementerReportCapture(input);

    if (!preview.ok || !preview.savedFileName || !preview.validation) {
      return preview;
    }

    if (!preview.validation.validEnoughToSave) {
      throw new Error("Paste or import Implementer Report text before saving.");
    }

    const directory = resolveImplementerReportsDirectory(input.phase);
    const workCardId = input.workCardFileName
      ? (await readSavedWorkCardAssociationFile(input.phase, input.workCardFileName))
          .workCardId
      : undefined;
    const targets = await saveCanonicalPlanningArtifact({
      directory,
      markdownFileName: preview.savedFileName,
      artifactType: "implementer_report",
      title: workCardId
        ? `${workCardId} Implementer Report`
        : `${input.topic ?? "Governance"} Implementer Report`,
      contentMarkdown: `${input.reportText.trimEnd()}\n`,
      data: {
        reportType: input.reportType,
        workCardId: workCardId ?? null,
        workCardFileName: input.workCardFileName ?? null,
        topic: input.topic ?? null,
      },
      phaseId: input.phase,
      workCardId,
      parentArtifactId: workCardId
        ? buildParentWorkCardArtifactId(input.phase, workCardId)
        : undefined,
    });

    return {
      ...preview,
      ok: true,
      markdownPath: targets.secondPath,
    };
  } catch (error) {
    console.error("Failed to save Implementer Report capture.", error);

    return {
      ok: false,
      validation: validateImplementerReport(input.reportText),
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function loadImplementerReportFile(
  input: ImplementerReportFileLoadRequest,
): Promise<ImplementerReportFileLoadResult> {
  try {
    const value = input.fileName.trim();

    if (value.length === 0) {
      throw new Error("Choose an Implementer Report to import.");
    }

    const implementerReport = await readOptionalImplementerReport(input.phase, value);

    if (!implementerReport) {
      throw new Error("Choose an Implementer Report to import.");
    }

    return {
      ok: true,
      fileName: implementerReport.fileName,
      content: implementerReport.content,
    };
  } catch (error) {
    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function listHumanValidationImplementerReports(
  input: HumanValidationImplementerReportListRequest,
): Promise<HumanValidationImplementerReportListResult> {
  try {
    const { target } = await readHumanValidationTargetContext(input);
    const { options, invalidFiles } =
      await listImplementerReportOptionsForValidationTarget(target);

    return {
      ok: true,
      validationTarget: target,
      options,
      defaultFileName: options.find((option) => option.isDefaultMatch)?.fileName,
      invalidFiles,
    };
  } catch (error) {
    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function listHumanValidationStatuses(
  phase: string,
): Promise<HumanValidationStatusListResult> {
  try {
    const targetResult = await listHumanValidationTargets(phase);

    if (!targetResult.ok) {
      return {
        ok: false,
        errorMessages:
          targetResult.errorMessages ?? ["Validation Targets could not be loaded."],
      };
    }

    const targets = targetResult.targets ?? [];
    const invalidFiles: InvalidHumanValidationStatusFile[] = [];
    const latestByTargetFileName = new Map<string, LatestHumanValidationStatus>();
    const directory = resolveValidationReportsDirectory(phase);
    let entries: string[] = [];

    try {
      entries = await readdir(directory);
    } catch (error) {
      if (!isNodeErrorWithCode(error, "ENOENT")) {
        throw error;
      }
    }

    for (const fileName of entries.filter((entry) =>
      entry.toLowerCase().endsWith(".json"),
    )) {
      try {
        validateValidationReportFileName(fileName);

        const filePath = resolveInside(directory, fileName);
        const fileStats = await stat(filePath);
        const rawJson = await readFile(filePath, "utf8");
  const parsed = parseCanonicalArtifactData(rawJson);
        const record = toHumanValidationStatusRecord(parsed, phase);
        const target = targets.find((candidate) =>
          validationRecordMatchesTarget(record, candidate),
        );

        if (!target) {
          continue;
        }

        const createdAt = normalizeOptionalText(record.createdAt);
        const createdAtMs = createdAt ? Date.parse(createdAt) : Number.NaN;
        const latestSortMs = Number.isNaN(createdAtMs)
          ? fileStats.mtimeMs
          : createdAtMs;
        const nextStatus: LatestHumanValidationStatus = {
          validationTargetFileName: target.fileName,
          validationTargetId: target.id,
          validationTargetKind: target.kind,
          validationResult: record.validationResult,
          architectDisposition:
            record.architectDisposition ??
            "Not recorded (legacy report; Architect review required)",
          legacyOperatorDecision: record.operatorDecision,
          operatorDecision: record.operatorDecision,
          validationReportJsonFile: fileName,
          validationReportMarkdownFile: await findValidationReportMarkdownFileName(
            directory,
            fileName,
          ),
          createdAt,
          latestSortMs,
          fileModifiedMs: fileStats.mtimeMs,
        };
        const previousStatus = latestByTargetFileName.get(target.fileName);

        if (
          !previousStatus ||
          compareHumanValidationStatuses(nextStatus, previousStatus) > 0
        ) {
          latestByTargetFileName.set(target.fileName, nextStatus);
        }
      } catch (error) {
        invalidFiles.push({
          fileName,
          errorMessages: [toPlainSaveError(error)],
        });
      }
    }

    const statuses = Array.from(latestByTargetFileName.values())
      .sort((left, right) =>
        left.validationTargetFileName.localeCompare(right.validationTargetFileName),
      )
      .map(({ latestSortMs: _latestSortMs, fileModifiedMs: _fileModifiedMs, ...status }) => status);

    return {
      ok: true,
      statuses,
      invalidFiles,
    };
  } catch (error) {
    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function previewHumanValidationRecord(
  input: HumanValidationFormInput,
): Promise<HumanValidationPreviewResult> {
  try {
    return await buildHumanValidationPreview(input, new Date().toISOString());
  } catch (error) {
    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function saveHumanValidationRecord(
  input: HumanValidationFormInput,
): Promise<HumanValidationSaveResult> {
  try {
    const createdAt = new Date().toISOString();
    const preview = await buildHumanValidationPreview(input, createdAt);

    if (!preview.ok || !preview.record || !preview.validationMarkdown) {
      return preview;
    }

    const validationDirectory = resolveValidationReportsDirectory(
      preview.record.phase,
    );
    const validationTargets = await saveCanonicalPlanningArtifact({
      directory: validationDirectory,
      jsonFileName: buildValidationReportJsonFileName(preview.record),
      markdownFileName: buildValidationReportMarkdownFileName(preview.record),
      artifactType: "validation_report",
      title: `${preview.record.workCardId} Validation Report`,
      contentMarkdown: preview.validationMarkdown,
      data: preview.record,
      phaseId: preview.record.phase,
      workCardId: preview.record.workCardId,
      parentArtifactId: buildParentWorkCardArtifactId(
        preview.record.phase,
        preview.record.workCardId,
      ),
    });

    let repairPromptPath: string | undefined;
    let savedRepairPromptFileName: string | undefined;
    let repairPrompt = preview.repairPrompt;

    if (preview.shouldGenerateRepairPrompt) {
      const repairDirectory = resolveRepairPromptsDirectory(preview.record.phase);
      const repairFileName = buildRepairPromptFileName(preview.record);

      repairPrompt = renderRepairPrompt(preview.record, {
        validationRecordFileName: validationTargets.firstFileName,
      });

      const repairTarget = await saveCanonicalPlanningArtifact({
        directory: repairDirectory,
        markdownFileName: repairFileName,
        artifactType: "repair_record",
        title: `${preview.record.workCardId} Repair Prompt`,
        contentMarkdown: `${repairPrompt}\n`,
        data: {
          validationId: preview.record.validationId,
          validationRecordFileName: validationTargets.firstFileName,
          workCardId: preview.record.workCardId,
        },
        phaseId: preview.record.phase,
        workCardId: preview.record.workCardId,
        parentArtifactId: buildParentWorkCardArtifactId(
          preview.record.phase,
          preview.record.workCardId,
        ),
      });

      repairPromptPath = repairTarget.secondPath;
      savedRepairPromptFileName = repairTarget.secondFileName;
    }

    return {
      ...preview,
      ok: true,
      repairPrompt,
      savedValidationJsonFileName: validationTargets.firstFileName,
      savedValidationMarkdownFileName: validationTargets.secondFileName,
      savedRepairPromptFileName,
      validationJsonPath: validationTargets.firstPath,
      validationMarkdownPath: validationTargets.secondPath,
      repairPromptPath,
    };
  } catch (error) {
    console.error("Failed to save Human Validation record.", error);

    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function previewArchitectReviewRecord(
  input: ArchitectReviewFormInput,
): Promise<ArchitectReviewPreviewResult> {
  try {
    const authority = await canonicalWorkflowAuthority.authorizeArchitectReview(
      input.routedReviewBinding,
    );
    const workCard = {
      workCardId: authority.workCardId,
      title: authority.workCardTitle,
      ...(typeof authority.workCard.parentWorkCardId === "string"
        ? { parentWorkCardId: authority.workCard.parentWorkCardId }
        : {}),
    };
    const authoritativeInput: ArchitectReviewFormInput = {
      ...input,
      phase: authority.phaseId,
      workCardFileName: authority.workCardFileName,
      implementerReportFileName: authority.implementerReportFileName,
      routedReviewBinding: authority.binding,
    };
    const implementerReport = await readOptionalImplementerReport(
      authority.phaseId,
      authority.implementerReportFileName,
    );

    if (!implementerReport) {
      throw new Error("Choose the existing Implementer Report to review.");
    }

    const associationErrors = validateArchitectReviewAssociation(
      {
        phase: authority.phaseId,
        implementerReportFileName: implementerReport.fileName,
        routedReviewBinding: authority.binding,
      },
      workCard,
    );

    if (associationErrors.length > 0) {
      throw new Error(associationErrors.join(" "));
    }

    const reviewMarkdown = renderArchitectReviewRecord(authoritativeInput, workCard);
    const validation = validateArchitectReviewForm(
      authoritativeInput,
      reviewMarkdown,
    );

    return {
      ok: true,
      reviewMarkdown,
      savedFileName: authority.expectedOutputFileName,
      workCardId: workCard.workCardId,
      workCardTitle: workCard.title,
      workCardFileName: authority.workCardFileName,
      implementerReportFileName: implementerReport.fileName,
      reviewMode: isRepairTarget(workCard) ? "repair" : "work_card",
      validation,
    };
  } catch (error) {
    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function saveArchitectReviewRecord(
  input: ArchitectReviewFormInput,
): Promise<ArchitectReviewSaveResult> {
  try {
    const preview = await previewArchitectReviewRecord(input);

    if (
      !preview.ok ||
      !preview.reviewMarkdown ||
      !preview.savedFileName ||
      !preview.validation
    ) {
      return preview;
    }

    if (!preview.validation.valid) {
      throw new Error(
        `Architect Review is incomplete: ${preview.validation.errors.join(" ")}`,
      );
    }

    if (!input.decision) {
      throw new Error("Choose an Architect Review decision before saving.");
    }
    const authority = await canonicalWorkflowAuthority.authorizeArchitectReview(
      input.routedReviewBinding,
    );
    const committed = await canonicalWorkflowAuthority.commitArchitectReview({
      authority,
      reviewMarkdown: `${preview.reviewMarkdown.trimEnd()}\n`,
      decision: input.decision,
      reviewData: toCanonicalJsonValue({
        phase: authority.phaseId,
        workCardId: authority.workCardId,
        workCardTitle: authority.workCardTitle,
        workCardArtifactId: authority.target.artifactId,
        implementerReportArtifactId: authority.source.artifactId,
        decision: input.decision,
        workCardCompliance: input.workCardCompliance,
        changedFilesReviewed: input.changedFilesReviewed,
        acceptanceCriteriaAssessment: input.acceptanceCriteriaAssessment,
        validationClaimsAssessment: input.validationClaimsAssessment,
        skippedChecksAssessment: input.skippedChecksAssessment,
        observationRegisterImpact: input.observationRegisterImpact,
        operatorValidationSteps: input.operatorValidationSteps,
        requiredRepair: input.requiredRepair,
      }) as Record<string, JsonValue>,
    });
    const nextAction = committed.transition.state.currentAction;

    return {
      ...preview,
      ok: true,
      markdownPath: committed.pairCommit.artifact.markdownPath,
      jsonPath: committed.pairCommit.artifact.jsonPath,
      workflowTransition: {
        fromActionId: authority.routedAction.actionId,
        toActionId: nextAction?.actionId ?? null,
        workflowStateRevision: committed.transition.state.stateRevision,
        ...(nextAction ? { nextScreenId: nextAction.screenId } : {}),
      },
    };
  } catch (error) {
    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function saveRouteReviewRequest(
  input: RouteReviewRequestInput,
): Promise<RouteReviewRequestSaveResult> {
  try {
    const record = buildRouteReviewRequest(input, new Date().toISOString());
    const markdown = renderRouteReviewRequestMarkdown(record);
    const fileNames = buildRouteReviewRequestFileNames(record);
    const directory = resolveRouteReviewRequestsDirectory(record.phase);
    const workCardId = record.currentRoute.workCardId;
    const targets = await saveCanonicalPlanningArtifact({
      directory,
      jsonFileName: fileNames.json,
      markdownFileName: fileNames.markdown,
      artifactType: "route_review_request",
      title: `${record.currentRoute.title} Route Review Request`,
      contentMarkdown: markdown,
      data: record,
      phaseId: record.phase,
      workCardId,
      parentArtifactId: workCardId
        ? buildParentWorkCardArtifactId(record.phase, workCardId)
        : undefined,
    });

    return {
      ok: true,
      record,
      markdown,
      savedJsonFileName: targets.firstFileName,
      savedMarkdownFileName: targets.secondFileName,
      savedJsonPath: toRepoRelativePath(targets.firstPath),
      savedMarkdownPath: toRepoRelativePath(targets.secondPath),
    };
  } catch (error) {
    console.error("Failed to save Route Review Request.", error);

    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function attachValidationEvidenceFile(
  input: ValidationEvidenceFileImportRequest,
): Promise<ValidationEvidenceFileImportResult> {
  try {
    const { target } = await readHumanValidationTargetContext(input);
    const safeFileName = buildValidationEvidenceFileName(input.fileName);
    const content = Buffer.from(input.content);

    if (content.byteLength === 0) {
      throw new Error("Evidence file is empty.");
    }

    const directory = resolveValidationEvidenceDirectory({
      workCardId: target.id,
      title: target.title,
      phase: target.phase,
    });
    const evidenceTarget = await resolveAvailableFilePath(
      directory,
      safeFileName,
      "A safe validation evidence filename could not be generated.",
    );

    await mkdir(directory, { recursive: true });
    await writeFile(evidenceTarget.filePath, content, { flag: "wx" });

    return {
      ok: true,
      savedFileName: evidenceTarget.fileName,
      savedRelativePath: toRepositoryRelativePath(evidenceTarget.filePath),
    };
  } catch (error) {
    console.error("Failed to attach validation evidence file.", error);

    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function getPhaseCloseoutSummary(
  phase: string,
): Promise<PhaseCloseoutSummaryResult> {
  try {
    return {
      ok: true,
      summary: await readPhaseArtifactSummary(phase),
    };
  } catch (error) {
    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function previewPhaseCloseoutRecord(
  input: PhaseCloseoutFormInput,
): Promise<PhaseCloseoutPreviewResult> {
  try {
    const createdAt = new Date().toISOString();
    const summary = await readPhaseArtifactSummary(input.phase);
    const record = buildPhaseCloseoutRecord(input, summary, createdAt);
    const markdown = renderPhaseCloseoutMarkdown(record);

    return {
      ok: true,
      summary,
      record,
      markdown,
      savedJsonFileName: buildPhaseCloseoutJsonFileName(record),
      savedMarkdownFileName: buildPhaseCloseoutMarkdownFileName(record),
    };
  } catch (error) {
    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function savePhaseCloseoutRecord(
  input: PhaseCloseoutFormInput,
): Promise<PhaseCloseoutSaveResult> {
  try {
    const createdAt = new Date().toISOString();
    const summary = await readPhaseArtifactSummary(input.phase);
    const record = buildPhaseCloseoutRecord(input, summary, createdAt);
    const markdown = renderPhaseCloseoutMarkdown(record);
    const directory = resolveCloseoutReportsDirectory(record.phase);
    const targets = await saveCanonicalPlanningArtifact({
      directory,
      jsonFileName: buildPhaseCloseoutJsonFileName(record),
      markdownFileName: buildPhaseCloseoutMarkdownFileName(record),
      artifactType: "phase_closeout",
      title: `${record.phase} Phase Closeout`,
      contentMarkdown: markdown,
      data: record,
      phaseId: record.phase,
    });

    return {
      ok: true,
      summary,
      record,
      markdown,
      savedJsonFileName: targets.firstFileName,
      savedMarkdownFileName: targets.secondFileName,
      jsonPath: targets.firstPath,
      markdownPath: targets.secondPath,
    };
  } catch (error) {
    console.error("Failed to save Phase Closeout record.", error);

    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export function resolveWorkCardsDirectory(phase: string): string {
  const phaseErrors = validateSafePhaseFolder(phase);

  if (phaseErrors.length > 0) {
    throw new Error(phaseErrors.join(" "));
  }

  return resolveInside(planningPhasesRoot, phase.trim(), "Work_Cards");
}

export function resolveArchitectPromptsDirectory(phase: string): string {
  const phaseErrors = validateSafePhaseFolder(phase);

  if (phaseErrors.length > 0) {
    throw new Error(phaseErrors.join(" "));
  }

  return resolveInside(planningPhasesRoot, phase.trim(), "Architect_Prompts");
}

export function resolveRiskReviewsDirectory(phase: string): string {
  const phaseErrors = validateSafePhaseFolder(phase);

  if (phaseErrors.length > 0) {
    throw new Error(phaseErrors.join(" "));
  }

  return resolveInside(planningPhasesRoot, phase.trim(), "Risk_Reviews");
}

export function resolveImplementerReportsDirectory(phase: string): string {
  const phaseErrors = validateSafePhaseFolder(phase);

  if (phaseErrors.length > 0) {
    throw new Error(phaseErrors.join(" "));
  }

  return resolveInside(planningPhasesRoot, phase.trim(), "Implementer_Reports");
}

export function resolveArchitectReviewsDirectory(phase: string): string {
  const phaseErrors = validateSafePhaseFolder(phase);

  if (phaseErrors.length > 0) {
    throw new Error(phaseErrors.join(" "));
  }

  return resolveInside(planningPhasesRoot, phase.trim(), "Architect_Reviews");
}

export function resolveImplementerExecutionPacketsDirectory(phase: string): string {
  const phaseErrors = validateSafePhaseFolder(phase);

  if (phaseErrors.length > 0) {
    throw new Error(phaseErrors.join(" "));
  }

  return resolveInside(planningPhasesRoot, phase.trim(), "Implementer_Execution_Packets");
}

export function resolveValidationReportsDirectory(phase: string): string {
  const phaseErrors = validateSafePhaseFolder(phase);

  if (phaseErrors.length > 0) {
    throw new Error(phaseErrors.join(" "));
  }

  return resolveInside(planningPhasesRoot, phase.trim(), "Validation_Reports");
}

export function resolveRouteReviewRequestsDirectory(phase: string): string {
  const phaseErrors = validateSafePhaseFolder(phase);

  if (phaseErrors.length > 0) {
    throw new Error(phaseErrors.join(" "));
  }

  return resolveInside(
    planningPhasesRoot,
    phase.trim(),
    "Route_Review_Requests",
  );
}

export function resolveValidationTargetsDirectory(phase: string): string {
  const phaseErrors = validateSafePhaseFolder(phase);

  if (phaseErrors.length > 0) {
    throw new Error(phaseErrors.join(" "));
  }

  return resolveInside(planningPhasesRoot, phase.trim(), "Validation_Targets");
}

export function resolveValidationEvidenceDirectory(
  workCard: Pick<WorkCard, "workCardId" | "title" | "phase">,
): string {
  const phaseErrors = validateSafePhaseFolder(workCard.phase);

  if (phaseErrors.length > 0) {
    throw new Error(phaseErrors.join(" "));
  }

  return resolveInside(
    planningPhasesRoot,
    workCard.phase.trim(),
    "Validation_Evidence",
    buildWorkCardFileStem(workCard.workCardId, workCard.title),
  );
}

export function resolveRepairPromptsDirectory(phase: string): string {
  const phaseErrors = validateSafePhaseFolder(phase);

  if (phaseErrors.length > 0) {
    throw new Error(phaseErrors.join(" "));
  }

  return resolveInside(planningPhasesRoot, phase.trim(), "Repair_Prompts");
}

export function resolveCloseoutReportsDirectory(phase: string): string {
  const phaseErrors = validateSafePhaseFolder(phase);

  if (phaseErrors.length > 0) {
    throw new Error(phaseErrors.join(" "));
  }

  return resolveInside(planningPhasesRoot, phase.trim(), "Closeout_Reports");
}

export function resolveProjectIntakeDirectory(): string {
  return resolveInside(planningProjectRoot, "Project_Intake");
}

export function resolveProjectArchitectInterviewPromptsDirectory(): string {
  return resolveInside(planningProjectRoot, "Project_Architect_Interview_Prompts");
}

export function resolveProjectPlanningDocumentsDirectory(): string {
  return resolveInside(planningProjectRoot, "Project_Planning_Documents");
}

export function resolveRepositoryReconciliationDirectory(): string {
  return resolveInside(planningProjectRoot, "Repository_Reconciliation");
}

export function resolveProjectRoadmapDirectory(): string {
  return resolveInside(planningProjectRoot, "Project_Roadmap");
}

export function resolvePhaseMapDirectory(): string {
  return resolveInside(planningProjectRoot, "Phase_Map");
}

export function resolvePhaseIntakeDirectory(phase: string): string {
  const phaseErrors = validateSafePhaseFolder(phase);

  if (phaseErrors.length > 0) {
    throw new Error(phaseErrors.join(" "));
  }

  return resolveInside(planningPhasesRoot, phase.trim(), "Phase_Intake");
}

export function resolvePhaseArchitectInterviewPromptsDirectory(
  phase: string,
): string {
  const phaseErrors = validateSafePhaseFolder(phase);

  if (phaseErrors.length > 0) {
    throw new Error(phaseErrors.join(" "));
  }

  return resolveInside(
    planningPhasesRoot,
    phase.trim(),
    "Phase_Architect_Interview_Prompts",
  );
}

export function resolvePhasePlanningDocumentsDirectory(phase: string): string {
  const phaseErrors = validateSafePhaseFolder(phase);

  if (phaseErrors.length > 0) {
    throw new Error(phaseErrors.join(" "));
  }

  return resolveInside(
    planningPhasesRoot,
    phase.trim(),
    "Phase_Planning_Documents",
  );
}

export function resolveWorkCardPlansDirectory(phase: string): string {
  const phaseErrors = validateSafePhaseFolder(phase);

  if (phaseErrors.length > 0) {
    throw new Error(phaseErrors.join(" "));
  }

  return resolveInside(planningPhasesRoot, phase.trim(), "Work_Card_Plans");
}

export function resolvePhaseReadinessReviewsDirectory(phase: string): string {
  const phaseErrors = validateSafePhaseFolder(phase);

  if (phaseErrors.length > 0) {
    throw new Error(phaseErrors.join(" "));
  }

  return resolveInside(
    planningPhasesRoot,
    phase.trim(),
    "Phase_Readiness_Reviews",
  );
}

export function resolvePhaseScopedBacklogPath(phase: string): string {
  const phaseErrors = validateSafePhaseFolder(phase);

  if (phaseErrors.length > 0) {
    throw new Error(phaseErrors.join(" "));
  }

  return resolveInside(planningPhasesRoot, phase.trim(), "WORK_CARD_BACKLOG.md");
}

export function resolveProjectPlanningDocumentPath(
  fileName: ProjectPlanningDocumentFileName,
): string {
  if (!projectPlanningDocumentFileNames.includes(fileName)) {
    throw new Error("Project Planning Document filename is not approved.");
  }

  return resolveInside(planningProjectRoot, fileName);
}

export function resolveInside(root: string, ...segments: string[]): string {
  const resolvedRoot = path.resolve(root);
  const resolvedPath = path.resolve(resolvedRoot, ...segments);
  const relative = path.relative(resolvedRoot, resolvedPath);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Work Card files must stay inside the approved planning folder.");
  }

  return resolvedPath;
}

export function validateSavedWorkCardJsonFileName(fileName: string): string[] {
  const value = fileName.trim();

  if (value.length === 0) {
    return ["Choose a saved Work Card JSON file."];
  }

  if (value !== path.basename(value)) {
    return ["Saved Work Card file names must not include folders."];
  }

  if (!value.toLowerCase().endsWith(".json")) {
    return ["Saved Work Card files must be JSON files."];
  }

  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*\.json$/.test(value)) {
    return [
      "Saved Work Card file names must use only letters, numbers, hyphens, underscores, and the .json extension.",
    ];
  }

  return [];
}

export function validateSavedWorkCardPlanJsonFileName(
  fileName: string,
): string[] {
  const value = fileName.trim();

  if (value.length === 0) {
    return ["Choose a saved Work Card Plan JSON file."];
  }

  if (value !== path.basename(value)) {
    return ["Saved Work Card Plan file names must not include folders."];
  }

  if (!value.toLowerCase().endsWith(".json")) {
    return ["Saved Work Card Plan files must be JSON files."];
  }

  return validateWorkCardPlanArtifactFileName(value);
}

export function validateSavedProjectIntakeJsonFileName(
  fileName: string,
): string[] {
  const value = fileName.trim();

  if (value.length === 0) {
    return ["Choose a saved Project Intake JSON file."];
  }

  if (value !== path.basename(value)) {
    return ["Saved Project Intake file names must not include folders."];
  }

  if (!value.toLowerCase().endsWith(".json")) {
    return ["Saved Project Intake files must be JSON files."];
  }

  return validateProjectIntakeArtifactFileName(value);
}

export function validateSavedProjectArchitectInterviewPromptJsonFileName(
  fileName: string,
): string[] {
  const value = fileName.trim();

  if (value.length === 0) {
    return ["Choose a saved Project Architect Interview Prompt JSON file."];
  }

  if (value !== path.basename(value)) {
    return [
      "Saved Project Architect Interview Prompt file names must not include folders.",
    ];
  }

  if (!value.toLowerCase().endsWith(".json")) {
    return ["Saved Project Architect Interview Prompt files must be JSON files."];
  }

  return validateProjectArchitectInterviewPromptArtifactFileName(value);
}

export function validateSavedProjectPlanningDocumentsJsonFileName(
  fileName: string,
): string[] {
  const value = fileName.trim();

  if (value.length === 0) {
    return ["Choose a saved Project Planning Documents JSON file."];
  }

  if (value !== path.basename(value)) {
    return [
      "Saved Project Planning Documents file names must not include folders.",
    ];
  }

  if (!value.toLowerCase().endsWith(".json")) {
    return ["Saved Project Planning Documents files must be JSON files."];
  }

  return validateProjectPlanningDocumentsArtifactFileName(value);
}

export function validateSavedRepositoryReconciliationJsonFileName(
  fileName: string,
): string[] {
  const value = fileName.trim();

  if (value.length === 0) {
    return ["Choose a saved Repository Reconciliation JSON file."];
  }

  if (value !== path.basename(value)) {
    return [
      "Saved Repository Reconciliation file names must not include folders.",
    ];
  }

  if (!value.toLowerCase().endsWith(".json")) {
    return ["Saved Repository Reconciliation files must be JSON files."];
  }

  return validateRepositoryReconciliationArtifactFileName(value);
}

export function validateSavedProjectRoadmapJsonFileName(
  fileName: string,
): string[] {
  const value = fileName.trim();

  if (value.length === 0) {
    return ["Choose a saved Project Roadmap JSON file."];
  }

  if (value !== path.basename(value)) {
    return ["Saved Project Roadmap file names must not include folders."];
  }

  if (!value.toLowerCase().endsWith(".json")) {
    return ["Saved Project Roadmap files must be JSON files."];
  }

  return validateProjectRoadmapArtifactFileName(value);
}

export function validateSavedPhaseMapJsonFileName(fileName: string): string[] {
  const value = fileName.trim();

  if (value.length === 0) {
    return ["Choose a saved Phase Map JSON file."];
  }

  if (value !== path.basename(value)) {
    return ["Saved Phase Map file names must not include folders."];
  }

  if (!value.toLowerCase().endsWith(".json")) {
    return ["Saved Phase Map files must be JSON files."];
  }

  return validatePhaseMapArtifactFileName(value);
}

export function validateSavedPhaseIntakeJsonFileName(
  fileName: string,
): string[] {
  const value = fileName.trim();

  if (value.length === 0) {
    return ["Choose a saved Phase Intake JSON file."];
  }

  if (value !== path.basename(value)) {
    return ["Saved Phase Intake file names must not include folders."];
  }

  if (!value.toLowerCase().endsWith(".json")) {
    return ["Saved Phase Intake files must be JSON files."];
  }

  return validatePhaseIntakeArtifactFileName(value);
}

export function validateSavedPhaseArchitectInterviewPromptJsonFileName(
  fileName: string,
): string[] {
  const value = fileName.trim();

  if (value.length === 0) {
    return ["Choose a saved Phase Architect Interview Prompt JSON file."];
  }

  if (value !== path.basename(value)) {
    return [
      "Saved Phase Architect Interview Prompt file names must not include folders.",
    ];
  }

  if (!value.toLowerCase().endsWith(".json")) {
    return ["Saved Phase Architect Interview Prompt files must be JSON files."];
  }

  return validatePhaseArchitectInterviewPromptArtifactFileName(value);
}

export function validateMarkdownArtifactFileName(fileName: string): string[] {
  const value = fileName.trim();

  if (value.length === 0) {
    return ["Choose a Markdown artifact or leave it unselected."];
  }

  if (value !== path.basename(value)) {
    return ["Markdown artifact file names must not include folders."];
  }

  if (!value.toLowerCase().endsWith(".md")) {
    return ["Supporting artifacts must be Markdown files."];
  }

  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*\.md$/.test(value)) {
    return [
      "Markdown artifact file names must use only letters, numbers, hyphens, underscores, and the .md extension.",
    ];
  }

  return [];
}

export function validateValidationEvidenceFileName(fileName: string): string[] {
  const value = fileName.trim();

  if (value.length === 0) {
    return ["Choose an evidence file."];
  }

  if (value !== path.basename(value) || value.includes("..")) {
    return ["Evidence file names must not include folders or traversal."];
  }

  const extension = path.extname(value).toLowerCase();

  if (!validationEvidenceAllowedExtensions.has(extension)) {
    return [
      "Evidence files must use .png, .jpg, .jpeg, .webp, .gif, .txt, or .md.",
    ];
  }

  return [];
}

function buildValidationEvidenceFileName(fileName: string): string {
  const value = fileName.trim();
  const errors = validateValidationEvidenceFileName(value);

  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }

  const extension = path.extname(value).toLowerCase();
  const stem = path
    .basename(value, path.extname(value))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);

  return `${stem || "validation_evidence"}${extension}`;
}

async function buildHumanValidationPreview(
  input: HumanValidationFormInput,
  createdAt: string,
): Promise<HumanValidationPreviewResult> {
  const { target } = await readHumanValidationTargetContext(input);
  const implementerReport = await readOptionalImplementerReport(
    target.phase,
    input.implementerReportFileName,
  );
  const matchingImplementerReports = await listImplementerReportOptionsForValidationTarget(
    target,
  );
  const bestMatchingImplementerReport = matchingImplementerReports.options.find(
    (option) => option.isDefaultMatch,
  );

  if (
    implementerReport &&
    target.expectedImplementerReportFile &&
    implementerReport.fileName !== target.expectedImplementerReportFile
  ) {
    throw new Error(
      `Selected Implementer Report does not match ${target.id}. Choose ${target.expectedImplementerReportFile} or clear the association before saving.`,
    );
  }

  if (
    implementerReport &&
    !target.expectedImplementerReportFile &&
    bestMatchingImplementerReport &&
    !fileNameMatchesValidationTarget(implementerReport.fileName, target)
  ) {
    throw new Error(
      `Selected Implementer Report does not match ${target.id}. Choose ${bestMatchingImplementerReport.fileName} or clear the association before saving.`,
    );
  }

  const record = buildHumanValidationRecord(
    target,
    {
      ...input,
      phase: target.phase,
      implementerReportFileName: implementerReport?.fileName,
    },
    createdAt,
  );
  const recordValidation = validateHumanValidationRecord(record);

  if (!recordValidation.valid) {
    return {
      ok: false,
      record,
      errorMessages: recordValidation.errors,
    };
  }

  const shouldRepair = shouldGenerateRepairPrompt(record);
  const validationMarkdown = renderValidationRecordMarkdown(record);
  const repairPrompt = shouldRepair ? renderRepairPrompt(record) : undefined;
  const manualValidationChecklist = await resolveManualValidationChecklist(
    target,
    implementerReport,
  );

  return {
    ok: true,
    record,
    validationMarkdown,
    repairPrompt,
    shouldGenerateRepairPrompt: shouldRepair,
    manualValidationChecklist,
    implementerReportWarning: implementerReport
      ? undefined
      : noImplementerReportSelectedWarning,
    differentProblemGuidance: getDifferentProblemGuidance(record),
    savedValidationJsonFileName: buildValidationReportJsonFileName(record),
    savedValidationMarkdownFileName:
      buildValidationReportMarkdownFileName(record),
    savedRepairPromptFileName: shouldRepair
      ? buildRepairPromptFileName(record)
      : undefined,
  };
}

async function findMatchingMarkdownArtifact(
  directory: string,
  prefix: string,
  role: string,
): Promise<CurrentActionArtifactReference | undefined> {
  const entries = await readDirectoryFileNames(directory, ".md");
  const normalizedPrefix = prefix.toLowerCase();
  const matches: Array<{ fileName: string; modifiedMs: number }> = [];

  for (const fileName of entries) {
    const stem = path.basename(fileName, path.extname(fileName)).toLowerCase();

    if (stem === normalizedPrefix || stem.startsWith(`${normalizedPrefix}_`)) {
      const filePath = resolveInside(directory, fileName);
      const stats = await stat(filePath);
      matches.push({ fileName, modifiedMs: stats.mtimeMs });
    }
  }

  matches.sort((left, right) => right.modifiedMs - left.modifiedMs);

  return matches[0]
    ? artifactReferenceForPath(
        resolveInside(directory, matches[0].fileName),
        role,
      )
    : undefined;
}

async function readDirectoryFileNames(
  directory: string,
  extension: string,
): Promise<string[]> {
  try {
    const entries = await readdir(directory);

    return entries
      .filter((entry) => entry.toLowerCase().endsWith(extension))
      .sort((left, right) => left.localeCompare(right));
  } catch (error) {
    if (!isNodeErrorWithCode(error, "ENOENT")) {
      throw error;
    }

    return [];
  }
}

async function artifactReferenceForPath(
  filePath: string,
  role: string,
  status?: string,
): Promise<CurrentActionArtifactReference> {
  return {
    path: toRepoRelativePath(filePath),
    role,
    status: status || (await readFirstStatusLine(filePath)),
    exists: await pathExists(filePath),
  };
}

async function readFirstStatusLine(filePath: string): Promise<string | undefined> {
  try {
    const content = await readFile(filePath, "utf8");
    const line = content
      .split(/\r?\n/)
      .find((candidate) => /^Status\s*:/i.test(candidate.trim()));

    return line?.replace(/^Status\s*:\s*/i, "").trim();
  } catch {
    return undefined;
  }
}

function toRepoRelativePath(filePath: string): string {
  const relativePath = path.relative(repositoryRoot, filePath).replace(/\\/g, "/");

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return "<PROJECT_REPO>";
  }

  return relativePath;
}

function absoluteFromRepoPath(repoPath: string): string {
  return resolveInside(repositoryRoot, ...repoPath.split("/"));
}

function parseCanonicalArtifactData(rawJson: string): unknown {
  const parsed = JSON.parse(rawJson) as unknown;
  assertCanonicalArtifact(parsed);
  return (parsed as CanonicalArtifact).payload.data;
}

async function readSavedProjectIntakeFile(
  fileName: string,
): Promise<ProjectIntake> {
  const fileNameErrors = validateSavedProjectIntakeJsonFileName(fileName);

  if (fileNameErrors.length > 0) {
    throw new Error(fileNameErrors.join(" "));
  }

  const directory = resolveProjectIntakeDirectory();
  const filePath = resolveInside(directory, fileName.trim());
  const rawJson = await readFile(filePath, "utf8");
  const parsed = parseCanonicalArtifactData(rawJson);
  const validation = validateProjectIntake(parsed);

  if (!validation.valid) {
    throw new Error(
      `Saved Project Intake JSON is not valid: ${validation.errors.join(" ")}`,
    );
  }

  return parsed as ProjectIntake;
}

async function readSavedProjectPlanningDocumentsRecord(
  fileName: string,
): Promise<ProjectPlanningDocumentsRecord> {
  const fileNameErrors =
    validateSavedProjectPlanningDocumentsJsonFileName(fileName);

  if (fileNameErrors.length > 0) {
    throw new Error(fileNameErrors.join(" "));
  }

  const directory = resolveProjectPlanningDocumentsDirectory();
  const filePath = resolveInside(directory, fileName.trim());
  const rawJson = await readFile(filePath, "utf8");
  const parsed = parseCanonicalArtifactData(rawJson);

  if (!isPlainRecord(parsed)) {
    throw new Error("Saved Project Planning Documents JSON must be an object.");
  }

  requireStatusText(parsed.recordId, "Project Planning Documents record ID");
  requireStatusText(parsed.projectName, "Project name");
  requireStatusText(parsed.createdAt, "Created timestamp");
  requireStatusText(parsed.updatedAt, "Updated timestamp");

  if (!Array.isArray(parsed.documents)) {
    throw new Error("Project Planning Documents JSON must include documents.");
  }

  return parsed as unknown as ProjectPlanningDocumentsRecord;
}

async function readSavedRepositoryReconciliationRecord(
  fileName: string,
): Promise<RepositoryReconciliationRecord> {
  const fileNameErrors =
    validateSavedRepositoryReconciliationJsonFileName(fileName);

  if (fileNameErrors.length > 0) {
    throw new Error(fileNameErrors.join(" "));
  }

  const directory = resolveRepositoryReconciliationDirectory();
  const filePath = resolveInside(directory, fileName.trim());
  const rawJson = await readFile(filePath, "utf8");
  const parsed = parseCanonicalArtifactData(rawJson);
  const validationErrors = validateRepositoryReconciliationRecord(parsed);

  if (validationErrors.length > 0) {
    throw new Error(
      `Saved Repository Reconciliation JSON is not valid: ${validationErrors.join(" ")}`,
    );
  }

  return parsed as RepositoryReconciliationRecord;
}

async function readSavedProjectRoadmapRecord(
  fileName: string,
): Promise<ProjectRoadmapRecord> {
  const fileNameErrors = validateSavedProjectRoadmapJsonFileName(fileName);

  if (fileNameErrors.length > 0) {
    throw new Error(fileNameErrors.join(" "));
  }

  const directory = resolveProjectRoadmapDirectory();
  const filePath = resolveInside(directory, fileName.trim());
  const rawJson = await readFile(filePath, "utf8");
  const parsed = parseCanonicalArtifactData(rawJson);
  const validationErrors = validateProjectRoadmapRecord(parsed);

  if (validationErrors.length > 0) {
    throw new Error(
      `Saved Project Roadmap JSON is not valid: ${validationErrors.join(" ")}`,
    );
  }

  return parsed as ProjectRoadmapRecord;
}

async function readSavedPhaseMapRecord(fileName: string): Promise<PhaseMapRecord> {
  const fileNameErrors = validateSavedPhaseMapJsonFileName(fileName);

  if (fileNameErrors.length > 0) {
    throw new Error(fileNameErrors.join(" "));
  }

  const directory = resolvePhaseMapDirectory();
  const filePath = resolveInside(directory, fileName.trim());
  const rawJson = await readFile(filePath, "utf8");
  const parsed = parseCanonicalArtifactData(rawJson);
  const validationErrors = validatePhaseMapRecord(parsed);

  if (validationErrors.length > 0) {
    throw new Error(
      `Saved Phase Map JSON is not valid: ${validationErrors.join(" ")}`,
    );
  }

  return parsed as PhaseMapRecord;
}

async function readSavedWorkCardPlanRecord(
  phase: string,
  fileName: string,
): Promise<WorkCardPlanRecord> {
  const phaseErrors = validateSafePhaseFolder(phase);

  if (phaseErrors.length > 0) {
    throw new Error(phaseErrors.join(" "));
  }

  const fileNameErrors = validateSavedWorkCardPlanJsonFileName(fileName);

  if (fileNameErrors.length > 0) {
    throw new Error(fileNameErrors.join(" "));
  }

  const directory = resolveWorkCardPlansDirectory(phase);
  const filePath = resolveInside(directory, fileName.trim());
  const rawJson = await readFile(filePath, "utf8");
  const parsed = parseCanonicalArtifactData(rawJson);
  const validationErrors = validateWorkCardPlanRecord(parsed);

  if (validationErrors.length > 0) {
    throw new Error(
      `Saved Work Card Plan JSON is not valid: ${validationErrors.join(" ")}`,
    );
  }

  return parsed as WorkCardPlanRecord;
}

async function findMatchingProjectPlanningDocumentsMarkdownFileName(
  projectPlanningDocumentsJsonFileName: string,
): Promise<string | undefined> {
  const markdownFileName = projectPlanningDocumentsJsonFileName.replace(
    /\.json$/i,
    ".md",
  );
  const fileNameErrors =
    validateProjectPlanningDocumentsArtifactFileName(markdownFileName);

  if (fileNameErrors.length > 0) {
    return undefined;
  }

  const filePath = resolveInside(
    resolveProjectPlanningDocumentsDirectory(),
    markdownFileName,
  );

  return (await pathExists(filePath)) ? markdownFileName : undefined;
}

async function findMatchingProjectRoadmapMarkdownFileName(
  projectRoadmapJsonFileName: string,
): Promise<string | undefined> {
  const markdownFileName = projectRoadmapJsonFileName.replace(/\.json$/i, ".md");
  const fileNameErrors =
    validateProjectRoadmapArtifactFileName(markdownFileName);

  if (fileNameErrors.length > 0) {
    return undefined;
  }

  const filePath = resolveInside(
    resolveProjectRoadmapDirectory(),
    markdownFileName,
  );

  return (await pathExists(filePath)) ? markdownFileName : undefined;
}

async function findMatchingPhaseMapMarkdownFileName(
  phaseMapJsonFileName: string,
): Promise<string | undefined> {
  const markdownFileName = phaseMapJsonFileName.replace(/\.json$/i, ".md");
  const fileNameErrors = validatePhaseMapArtifactFileName(markdownFileName);

  if (fileNameErrors.length > 0) {
    return undefined;
  }

  const filePath = resolveInside(resolvePhaseMapDirectory(), markdownFileName);

  return (await pathExists(filePath)) ? markdownFileName : undefined;
}

async function findMatchingRepositoryReconciliationMarkdownFileName(
  repositoryReconciliationJsonFileName: string,
): Promise<string | undefined> {
  const markdownFileName = repositoryReconciliationJsonFileName.replace(
    /\.json$/i,
    ".md",
  );
  const fileNameErrors =
    validateRepositoryReconciliationArtifactFileName(markdownFileName);

  if (fileNameErrors.length > 0) {
    return undefined;
  }

  const filePath = resolveInside(
    resolveRepositoryReconciliationDirectory(),
    markdownFileName,
  );

  return (await pathExists(filePath)) ? markdownFileName : undefined;
}

async function findMatchingProjectIntakeMarkdownFileName(
  projectIntakeJsonFileName: string,
): Promise<string | undefined> {
  const markdownFileName = projectIntakeJsonFileName.replace(/\.json$/i, ".md");
  const fileNameErrors = validateProjectIntakeArtifactFileName(markdownFileName);

  if (fileNameErrors.length > 0) {
    return undefined;
  }

  const filePath = resolveInside(resolveProjectIntakeDirectory(), markdownFileName);

  return (await pathExists(filePath)) ? markdownFileName : undefined;
}

async function readSavedProjectArchitectInterviewPromptFile(
  fileName: string,
): Promise<ProjectArchitectInterviewPrompt> {
  const fileNameErrors =
    validateSavedProjectArchitectInterviewPromptJsonFileName(fileName);

  if (fileNameErrors.length > 0) {
    throw new Error(fileNameErrors.join(" "));
  }

  const directory = resolveProjectArchitectInterviewPromptsDirectory();
  const filePath = resolveInside(directory, fileName.trim());
  const rawJson = await readFile(filePath, "utf8");
  const parsed = parseCanonicalArtifactData(rawJson);
  const validation = validateProjectArchitectInterviewPrompt(parsed);

  if (!validation.valid) {
    throw new Error(
      `Saved Project Architect Interview Prompt JSON is not valid: ${validation.errors.join(" ")}`,
    );
  }

  return parsed as ProjectArchitectInterviewPrompt;
}

async function readPhaseIntakeProjectPlanningContext(
  input: PhaseIntakeInput,
): Promise<{
  input: PhaseIntakeInput;
  sourceProjectPlanningSidecarMarkdownFileName?: string;
}> {
  const sourceFileName =
    input.sourceProjectPlanningSidecarJsonFileName?.trim() ?? "";

  if (sourceFileName.length === 0) {
    return { input };
  }

  const sourceRecord =
    await readSavedProjectPlanningDocumentsRecord(sourceFileName);
  const sourceProjectPlanningSidecarMarkdownFileName =
    await findMatchingProjectPlanningDocumentsMarkdownFileName(sourceFileName);

  return {
    input: {
      ...input,
      projectName: input.projectName.trim() || sourceRecord.projectName,
      sourceProjectPlanningSidecarJsonFileName: sourceFileName,
    },
    sourceProjectPlanningSidecarMarkdownFileName,
  };
}

async function readArchitectLedPhaseIntakeContext(
  input: PhaseIntakeInput,
): Promise<ArchitectLedPhaseIntakeBuildInput> {
  const phaseFolder = input.phaseFolder.trim();
  const phaseErrors = validateSafePhaseFolder(phaseFolder);

  if (phaseErrors.length > 0) {
    throw new Error(phaseErrors.join(" "));
  }

  if (
    input.operatorProjectWorkType &&
    !isPhaseIntakeWorkType(input.operatorProjectWorkType)
  ) {
    throw new Error("Phase Intake work type is not supported.");
  }

  const projectIntakeFileName = input.projectIntakeFileName?.trim() ?? "";
  const projectArchitectInterviewPromptFileName =
    input.projectArchitectInterviewPromptFileName?.trim() ?? "";
  const projectPlanningDocumentFileName =
    input.sourceProjectPlanningSidecarJsonFileName?.trim() ?? "";
  const repositoryReconciliationFileName =
    input.repositoryReconciliationFileName?.trim() ?? "";
  const existingPhaseIntakeFileName =
    input.existingPhaseIntakeFileName?.trim() ?? "";
  const sourceProjectIntake =
    projectIntakeFileName.length > 0
      ? await readSavedProjectIntakeFile(projectIntakeFileName)
      : undefined;
  const sourceProjectIntakeMarkdownFileName = sourceProjectIntake
    ? await findMatchingProjectIntakeMarkdownFileName(projectIntakeFileName)
    : undefined;
  const sourceProjectArchitectInterviewPrompt =
    projectArchitectInterviewPromptFileName.length > 0
      ? await readSavedProjectArchitectInterviewPromptFile(
          projectArchitectInterviewPromptFileName,
        )
      : undefined;
  const sourceProjectArchitectInterviewPromptMarkdownFileName =
    sourceProjectArchitectInterviewPrompt
      ? await findMatchingProjectArchitectInterviewPromptMarkdownFileName(
          projectArchitectInterviewPromptFileName,
        )
      : undefined;
  const sourceProjectPlanningDocuments =
    projectPlanningDocumentFileName.length > 0
      ? await readSavedProjectPlanningDocumentsRecord(
          projectPlanningDocumentFileName,
        )
      : undefined;
  const sourceProjectPlanningSidecarMarkdownFileName =
    sourceProjectPlanningDocuments
      ? await findMatchingProjectPlanningDocumentsMarkdownFileName(
          projectPlanningDocumentFileName,
        )
      : undefined;
  const sourceRepositoryReconciliation =
    repositoryReconciliationFileName.length > 0
      ? await readSavedRepositoryReconciliationRecord(
          repositoryReconciliationFileName,
        )
      : undefined;
  const sourceRepositoryReconciliationMarkdownFileName =
    sourceRepositoryReconciliation
      ? await findMatchingRepositoryReconciliationMarkdownFileName(
          repositoryReconciliationFileName,
        )
      : undefined;
  const sourceExistingPhaseIntake =
    existingPhaseIntakeFileName.length > 0
      ? await readSavedPhaseIntakeFile(phaseFolder, existingPhaseIntakeFileName)
      : undefined;
  const sourceExistingPhaseIntakeMarkdownFileName = sourceExistingPhaseIntake
    ? await findMatchingPhaseIntakeMarkdownFileName(
        phaseFolder,
        existingPhaseIntakeFileName,
      )
    : undefined;

  return {
    ...input,
    generationMode: "architect-led",
    phaseFolder,
    projectName:
      input.projectName.trim() ||
      sourceProjectPlanningDocuments?.projectName ||
      sourceProjectIntake?.projectName ||
      sourceProjectArchitectInterviewPrompt?.projectName ||
      sourceRepositoryReconciliation?.projectName ||
      sourceExistingPhaseIntake?.projectName ||
      "ChampCity A/I",
    projectIntakeFileName,
    projectArchitectInterviewPromptFileName,
    sourceProjectPlanningSidecarJsonFileName:
      projectPlanningDocumentFileName || undefined,
    repositoryReconciliationFileName:
      repositoryReconciliationFileName || undefined,
    existingPhaseIntakeFileName: existingPhaseIntakeFileName || undefined,
    sourceProjectIntake,
    sourceProjectIntakeJsonFileName: sourceProjectIntake
      ? projectIntakeFileName
      : undefined,
    sourceProjectIntakeMarkdownFileName,
    sourceProjectArchitectInterviewPrompt,
    sourceProjectArchitectInterviewPromptJsonFileName:
      sourceProjectArchitectInterviewPrompt
        ? projectArchitectInterviewPromptFileName
        : undefined,
    sourceProjectArchitectInterviewPromptMarkdownFileName,
    sourceProjectPlanningDocuments,
    sourceProjectPlanningSidecarMarkdownFileName,
    sourceRepositoryReconciliation,
    sourceRepositoryReconciliationMarkdownFileName,
    sourceExistingPhaseIntake,
    sourceExistingPhaseIntakeMarkdownFileName,
  };
}

async function readSavedPhaseIntakeFile(
  phase: string,
  fileName: string,
): Promise<PhaseIntake> {
  const fileNameErrors = validateSavedPhaseIntakeJsonFileName(fileName);

  if (fileNameErrors.length > 0) {
    throw new Error(fileNameErrors.join(" "));
  }

  const directory = resolvePhaseIntakeDirectory(phase);
  const filePath = resolveInside(directory, fileName.trim());
  const rawJson = await readFile(filePath, "utf8");
  const parsed = parseCanonicalArtifactData(rawJson);
  const validation = validatePhaseIntake(parsed);

  if (!validation.valid) {
    throw new Error(
      `Saved Phase Intake JSON is not valid: ${validation.errors.join(" ")}`,
    );
  }

  const phaseIntake = parsed as PhaseIntake;

  if (phaseIntake.phaseFolder !== phase.trim()) {
    throw new Error("Saved Phase Intake phase folder does not match selection.");
  }

  return phaseIntake;
}

async function findMatchingPhaseIntakeMarkdownFileName(
  phase: string,
  phaseIntakeJsonFileName: string,
): Promise<string | undefined> {
  const markdownFileName = phaseIntakeJsonFileName.replace(/\.json$/i, ".md");
  const fileNameErrors = validatePhaseIntakeArtifactFileName(markdownFileName);

  if (fileNameErrors.length > 0) {
    return undefined;
  }

  const filePath = resolveInside(
    resolvePhaseIntakeDirectory(phase),
    markdownFileName,
  );

  return (await pathExists(filePath)) ? markdownFileName : undefined;
}

async function readSavedPhaseArchitectInterviewPromptFile(
  phase: string,
  fileName: string,
): Promise<PhaseArchitectInterviewPrompt> {
  const fileNameErrors =
    validateSavedPhaseArchitectInterviewPromptJsonFileName(fileName);

  if (fileNameErrors.length > 0) {
    throw new Error(fileNameErrors.join(" "));
  }

  const directory = resolvePhaseArchitectInterviewPromptsDirectory(phase);
  const filePath = resolveInside(directory, fileName.trim());
  const rawJson = await readFile(filePath, "utf8");
  const parsed = parseCanonicalArtifactData(rawJson);
  const validation = validatePhaseArchitectInterviewPrompt(parsed);

  if (!validation.valid) {
    throw new Error(
      `Saved Phase Architect Interview Prompt JSON is not valid: ${validation.errors.join(" ")}`,
    );
  }

  const promptRecord = parsed as PhaseArchitectInterviewPrompt;

  if (promptRecord.phaseFolder !== phase.trim()) {
    throw new Error(
      "Saved Phase Architect Interview Prompt phase folder does not match selection.",
    );
  }

  return promptRecord;
}

async function findMatchingPhaseArchitectInterviewPromptMarkdownFileName(
  phase: string,
  promptJsonFileName: string,
): Promise<string | undefined> {
  const markdownFileName = promptJsonFileName.replace(/\.json$/i, ".md");
  const fileNameErrors =
    validatePhaseArchitectInterviewPromptArtifactFileName(markdownFileName);

  if (fileNameErrors.length > 0) {
    return undefined;
  }

  const filePath = resolveInside(
    resolvePhaseArchitectInterviewPromptsDirectory(phase),
    markdownFileName,
  );

  return (await pathExists(filePath)) ? markdownFileName : undefined;
}

async function findMatchingProjectArchitectInterviewPromptMarkdownFileName(
  promptJsonFileName: string,
): Promise<string | undefined> {
  const markdownFileName = promptJsonFileName.replace(/\.json$/i, ".md");
  const fileNameErrors =
    validateProjectArchitectInterviewPromptArtifactFileName(markdownFileName);

  if (fileNameErrors.length > 0) {
    return undefined;
  }

  const filePath = resolveInside(
    resolveProjectArchitectInterviewPromptsDirectory(),
    markdownFileName,
  );

  return (await pathExists(filePath)) ? markdownFileName : undefined;
}

async function readRepositoryReconciliationPromptContext(
  input: RepositoryReconciliationPromptRequest,
): Promise<RepositoryReconciliationPromptContext> {
  const sourceFileName = input.projectPlanningDocumentFileName?.trim() ?? "";
  const sourcePhaseFolder = input.sourcePhaseFolder?.trim() ?? "";
  let selectedProjectPlanningDocumentsSummary =
    "No Project Planning Documents sidecar was selected. Review the current approved project Markdown files instead.";

  if (sourceFileName.length > 0) {
    const sourceRecord = await readSavedProjectPlanningDocumentsRecord(
      sourceFileName,
    );
    const sourceMarkdownFileName =
      await findMatchingProjectPlanningDocumentsMarkdownFileName(sourceFileName);
    selectedProjectPlanningDocumentsSummary = [
      `Selected sidecar JSON: ${sourceFileName}`,
      `Selected sidecar Markdown: ${sourceMarkdownFileName ?? "Not found."}`,
      `Record ID: ${sourceRecord.recordId}`,
      `Project: ${sourceRecord.projectName}`,
      `Documents included: ${sourceRecord.documents
        .map((document) => document.fileName)
        .join(", ")}`,
    ].join("\n");
  }

  if (sourcePhaseFolder.length > 0) {
    const phaseErrors = validateSafePhaseFolder(sourcePhaseFolder);

    if (phaseErrors.length > 0) {
      throw new Error(phaseErrors.join(" "));
    }
  }

  return {
    projectPlanningDocumentsSummary:
      await readProjectPlanningMarkdownSummaries(),
    selectedProjectPlanningDocumentsSummary,
    phaseArtifactSummary: await readReconciliationPhaseArtifactSummary(
      sourcePhaseFolder,
    ),
    repositoryStructureSummary: await readRepositoryStructureSummary(),
    appWorkflowSummary: buildAppWorkflowSurfaceSummary(),
  };
}

async function readPhaseMapContext(
  input: PhaseMapRequest,
): Promise<PhaseMapBuildInput> {
  const projectPlanningDocumentFileName =
    input.projectPlanningDocumentFileName?.trim() ?? "";
  const repositoryReconciliationFileName =
    input.repositoryReconciliationFileName?.trim() ?? "";
  const projectRoadmapFileName = input.projectRoadmapFileName?.trim() ?? "";

  if (projectPlanningDocumentFileName.length === 0) {
    throw new Error("Select a saved Project Planning Documents source.");
  }

  if (repositoryReconciliationFileName.length === 0) {
    throw new Error("Select a saved Repository Reconciliation source.");
  }

  if (projectRoadmapFileName.length === 0) {
    throw new Error("Select a saved Project Roadmap source.");
  }

  const sourceProjectPlanningDocuments =
    await readSavedProjectPlanningDocumentsRecord(projectPlanningDocumentFileName);
  const sourceProjectPlanningDocumentsMarkdownFileName =
    await findMatchingProjectPlanningDocumentsMarkdownFileName(
      projectPlanningDocumentFileName,
    );
  const sourceRepositoryReconciliation =
    await readSavedRepositoryReconciliationRecord(
      repositoryReconciliationFileName,
    );
  const sourceRepositoryReconciliationMarkdownFileName =
    await findMatchingRepositoryReconciliationMarkdownFileName(
      repositoryReconciliationFileName,
    );
  const sourceProjectRoadmap =
    await readSavedProjectRoadmapRecord(projectRoadmapFileName);
  const sourceProjectRoadmapMarkdownFileName =
    await findMatchingProjectRoadmapMarkdownFileName(projectRoadmapFileName);
  const phaseContexts = await readProjectRoadmapPhaseContexts();

  return {
    ...input,
    projectPlanningDocumentFileName,
    repositoryReconciliationFileName,
    projectRoadmapFileName,
    sourceProjectPlanningDocuments,
    sourceProjectPlanningDocumentsMarkdownFileName,
    sourceRepositoryReconciliation,
    sourceRepositoryReconciliationMarkdownFileName,
    sourceProjectRoadmap,
    sourceProjectRoadmapMarkdownFileName,
    existingPhaseArtifacts: phaseContexts.map((context) => ({
      phaseFolder: context.phase,
      summary: context.summary,
      workCardPlanFileNames: context.workCardPlanFileNames,
      phasePlanningDocumentFileNames: context.phasePlanningDocumentFileNames,
      phaseReadinessReviewFileNames: context.phaseReadinessReviewFileNames,
    })),
  };
}

async function readPhasePlanningDocumentsContext(
  input: PhasePlanningDocumentsRequest,
) {
  const phaseMapFileName = input.phaseMapFileName?.trim() ?? "";
  const sourcePhaseMap =
    phaseMapFileName.length > 0
      ? await readSavedPhaseMapRecord(phaseMapFileName)
      : undefined;
  const sourcePhaseMapMarkdownFileName = sourcePhaseMap
    ? await findMatchingPhaseMapMarkdownFileName(phaseMapFileName)
    : undefined;
  const mappedPhaseId = input.mappedPhaseId?.trim() ?? "";
  const sourceMappedPhase = sourcePhaseMap
    ? sourcePhaseMap.mappedPhases.find(
        (mappedPhase) => mappedPhase.phaseId === mappedPhaseId,
      )
    : undefined;

  if (sourcePhaseMap && mappedPhaseId.length === 0) {
    throw new Error("Select a mapped phase from the saved Phase Map.");
  }

  if (sourcePhaseMap && !sourceMappedPhase) {
    throw new Error("Selected mapped phase was not found in the Phase Map.");
  }

  const phaseFolder = sourceMappedPhase?.phaseId ?? input.phaseFolder.trim();
  const phaseErrors = validateSafePhaseFolder(phaseFolder);

  if (phaseErrors.length > 0) {
    throw new Error(phaseErrors.join(" "));
  }

  const projectPlanningDocumentFileName =
    input.projectPlanningDocumentFileName?.trim() ||
    sourcePhaseMap?.sourceFiles.projectPlanningDocumentJsonFileName ||
    "";
  const repositoryReconciliationFileName =
    input.repositoryReconciliationFileName?.trim() ||
    sourcePhaseMap?.sourceFiles.repositoryReconciliationJsonFileName ||
    "";
  const projectRoadmapFileName =
    input.projectRoadmapFileName?.trim() ||
    sourcePhaseMap?.sourceFiles.projectRoadmapJsonFileName ||
    "";
  const phaseIntakeFileName = input.phaseIntakeFileName?.trim() ?? "";
  const phaseArchitectInterviewPromptFileName =
    input.phaseArchitectInterviewPromptFileName?.trim() ?? "";

  if (projectPlanningDocumentFileName.length === 0) {
    throw new Error("Select a saved Project Planning Documents source.");
  }

  if (repositoryReconciliationFileName.length === 0) {
    throw new Error("Select a saved Repository Reconciliation source.");
  }

  if (
    !sourcePhaseMap &&
    projectRoadmapFileName.length === 0 &&
    phaseIntakeFileName.length === 0
  ) {
    throw new Error(
      "Run Phase Map Composer first, then select a mapped phase for planning.",
    );
  }

  const sourceProjectPlanningDocuments =
    await readSavedProjectPlanningDocumentsRecord(projectPlanningDocumentFileName);
  const sourceProjectPlanningDocumentsMarkdownFileName =
    await findMatchingProjectPlanningDocumentsMarkdownFileName(
      projectPlanningDocumentFileName,
    );
  const sourceRepositoryReconciliation =
    await readSavedRepositoryReconciliationRecord(
      repositoryReconciliationFileName,
    );
  const sourceRepositoryReconciliationMarkdownFileName =
    await findMatchingRepositoryReconciliationMarkdownFileName(
      repositoryReconciliationFileName,
    );
  const sourceProjectRoadmap =
    projectRoadmapFileName.length > 0
      ? await readSavedProjectRoadmapRecord(projectRoadmapFileName)
      : undefined;
  if (
    !sourcePhaseMap &&
    sourceProjectRoadmap &&
    sourceProjectRoadmap.nextExecutablePhase.phaseFolder !== phaseFolder
  ) {
    throw new Error(
      "Selected Project Roadmap next recommended phase must match the selected phase.",
    );
  }

  const sourceProjectRoadmapMarkdownFileName = sourceProjectRoadmap
    ? await findMatchingProjectRoadmapMarkdownFileName(projectRoadmapFileName)
    : undefined;
  const sourcePhaseIntake =
    phaseIntakeFileName.length > 0
      ? await readSavedPhaseIntakeFile(phaseFolder, phaseIntakeFileName)
      : undefined;
  const sourcePhaseIntakeMarkdownFileName = sourcePhaseIntake
    ? await findMatchingPhaseIntakeMarkdownFileName(
        phaseFolder,
        phaseIntakeFileName,
      )
    : undefined;
  const sourcePhaseArchitectInterviewPrompt =
    phaseArchitectInterviewPromptFileName.length > 0
      ? await readSavedPhaseArchitectInterviewPromptFile(
          phaseFolder,
          phaseArchitectInterviewPromptFileName,
        )
      : undefined;
  const sourcePhaseArchitectInterviewPromptMarkdownFileName =
    sourcePhaseArchitectInterviewPrompt
      ? await findMatchingPhaseArchitectInterviewPromptMarkdownFileName(
          phaseFolder,
          phaseArchitectInterviewPromptFileName,
        )
      : undefined;

  return {
    ...input,
    phaseFolder,
    phaseMapFileName: phaseMapFileName || undefined,
    mappedPhaseId: mappedPhaseId || undefined,
    projectPlanningDocumentFileName,
    repositoryReconciliationFileName,
    projectRoadmapFileName: projectRoadmapFileName || undefined,
    phaseIntakeFileName: phaseIntakeFileName || undefined,
    phaseArchitectInterviewPromptFileName:
      phaseArchitectInterviewPromptFileName || undefined,
    sourceProjectPlanningDocuments,
    sourceProjectPlanningDocumentsMarkdownFileName,
    sourceRepositoryReconciliation,
    sourceRepositoryReconciliationMarkdownFileName,
    sourcePhaseMap,
    sourcePhaseMapMarkdownFileName,
    sourceMappedPhase,
    sourceProjectRoadmap,
    sourceProjectRoadmapMarkdownFileName,
    sourcePhaseIntake,
    sourcePhaseIntakeMarkdownFileName,
    sourcePhaseArchitectInterviewPrompt,
    sourcePhaseArchitectInterviewPromptMarkdownFileName,
  };
}

async function readProjectRoadmapContext(
  input: ProjectRoadmapRequest,
): Promise<ProjectRoadmapBuildInput> {
  const projectName = input.projectName?.trim() ?? "";
  const completedPhaseFolder = input.completedPhaseFolder?.trim() ?? "";

  if (completedPhaseFolder.length > 0) {
    const phaseErrors = validateSafePhaseFolder(completedPhaseFolder);

    if (phaseErrors.length > 0) {
      throw new Error(phaseErrors.join(" "));
    }
  }

  const projectStateMarkdown = await readOptionalProjectMarkdownFile(
    "PROJECT_STATE.md",
  );
  const workCardBacklogMarkdown = await readOptionalProjectMarkdownFile(
    "WORK_CARD_BACKLOG.md",
  );
  const openQuestionsMarkdown = await readOptionalProjectMarkdownFile(
    "OPEN_QUESTIONS.md",
  );
  const risksMarkdown = await readOptionalProjectMarkdownFile("RISKS.md");
  const decisionsMarkdown = await readOptionalProjectMarkdownFile(
    "DECISIONS.md",
  );
  const projectPlanningDocumentFileName =
    input.sourceProjectPlanningDocumentFileName?.trim() ||
    (await findLatestValidJsonFileName(
      resolveProjectPlanningDocumentsDirectory(),
      validateSavedProjectPlanningDocumentsJsonFileName,
    ));
  const repositoryReconciliationFileName =
    input.sourceRepositoryReconciliationFileName?.trim() ||
    (await findLatestValidJsonFileName(
      resolveRepositoryReconciliationDirectory(),
      validateSavedRepositoryReconciliationJsonFileName,
    ));
  const selectedProjectPlanningDocuments = projectPlanningDocumentFileName
    ? await readSavedProjectPlanningDocumentsRecord(
        projectPlanningDocumentFileName,
      )
    : undefined;
  const selectedRepositoryReconciliation = repositoryReconciliationFileName
    ? await readSavedRepositoryReconciliationRecord(
        repositoryReconciliationFileName,
      )
    : undefined;
  const existingRoadmapFileNames = await readProjectRoadmapFileNames();
  const phaseContexts = await readProjectRoadmapPhaseContexts();

  return {
    ...input,
    projectName:
      projectName ||
      selectedProjectPlanningDocuments?.projectName ||
      selectedRepositoryReconciliation?.projectName ||
      "ChampCity A/I",
    completedPhaseFolder: completedPhaseFolder || undefined,
    sourceProjectPlanningDocumentFileName:
      projectPlanningDocumentFileName || undefined,
    sourceRepositoryReconciliationFileName:
      repositoryReconciliationFileName || undefined,
    sourceArtifacts: await buildProjectRoadmapSourceArtifacts({
      phaseContexts,
      existingRoadmapFileNames,
      projectPlanningDocumentFileName,
      repositoryReconciliationFileName,
    }),
    phaseContexts,
    projectStateMarkdown,
    workCardBacklogMarkdown,
    openQuestionsMarkdown,
    risksMarkdown,
    decisionsMarkdown,
    projectPlanningSummary:
      selectedProjectPlanningDocuments
        ? [
            `Project Planning Documents: ${projectPlanningDocumentFileName}`,
            `Record ID: ${selectedProjectPlanningDocuments.recordId}`,
            `Project: ${selectedProjectPlanningDocuments.projectName}`,
            `Documents included: ${selectedProjectPlanningDocuments.documents
              .map((document) => document.fileName)
              .join(", ")}`,
          ].join("\n")
        : await readProjectPlanningMarkdownSummaries(),
    repositoryReconciliationSummary: selectedRepositoryReconciliation
      ? [
          `Repository Reconciliation: ${repositoryReconciliationFileName}`,
          `Reconciliation ID: ${selectedRepositoryReconciliation.reconciliationId}`,
          `Recommended next phase: ${selectedRepositoryReconciliation.recommendedNextPhase}`,
          `Recommended phases: ${selectedRepositoryReconciliation.recommendedPhases.join("; ")}`,
        ].join("\n")
      : "No Repository Reconciliation record selected or found.",
    repositoryReconciliationRecommendedPhases:
      selectedRepositoryReconciliation?.recommendedPhases,
    repositoryReconciliationRisks:
      selectedRepositoryReconciliation?.currentRisks,
    existingRoadmapFileNames,
    latestProjectRoadmapId:
      existingRoadmapFileNames[existingRoadmapFileNames.length - 1],
  };
}

async function buildProjectRoadmapNextPhaseArtifactPreview(
  roadmap: ProjectRoadmapRecord,
): Promise<ProjectRoadmapNextPhaseArtifactPreview> {
  const phaseFolder = roadmap.nextExecutablePhase.phaseFolder;
  const phaseDirectory = resolveInside(planningPhasesRoot, phaseFolder);
  const phaseFolderExists = await pathExists(phaseDirectory);
  const workCardPlanFileNames = buildRoadmapWorkCardPlanFileNames(
    roadmap.nextExecutablePhase.phaseTitle || phaseFolder,
  );
  const readinessReviewFileNames =
    buildPhaseReadinessReviewFileNames(phaseFolder);
  const compatibilityPhaseIntake = buildCompatibilityPhaseIntakeFromRoadmap(
    roadmap,
    roadmap.updatedAt,
  );

  return {
    phaseFolder,
    phaseFolderExists,
    shouldCreatePhaseFolder:
      roadmap.nextExecutablePhase.shouldCreatePhaseFolder && !phaseFolderExists,
    workCardPlanFileNames,
    readinessReviewFileNames,
    compatibilityPhaseIntakeFileNames: buildPhaseIntakeFileNames(
      compatibilityPhaseIntake.phaseName || phaseFolder,
    ),
  };
}

async function saveProjectRoadmapNextPhaseArtifacts(
  roadmap: ProjectRoadmapRecord,
  timestamp: string,
): Promise<
  Pick<
    ProjectRoadmapSaveResult,
    | "createdPhaseFolder"
    | "phaseReadinessReviewJsonPath"
    | "phaseReadinessReviewMarkdownPath"
    | "workCardPlanJsonPath"
    | "workCardPlanMarkdownPath"
    | "compatibilityPhaseIntakeJsonPath"
    | "compatibilityPhaseIntakeMarkdownPath"
  >
> {
  const phaseFolder = roadmap.nextExecutablePhase.phaseFolder;
  const phaseErrors = validateSafePhaseFolder(phaseFolder);

  if (phaseErrors.length > 0) {
    throw new Error(phaseErrors.join(" "));
  }

  const phaseDirectory = resolveInside(planningPhasesRoot, phaseFolder);
  const phaseFolderExists = await pathExists(phaseDirectory);

  if (roadmap.nextExecutablePhase.shouldCreatePhaseFolder && phaseFolderExists) {
    throw new Error(
      `Proposed phase folder ${phaseFolder} already exists. Review the Roadmap before creating next-phase artifacts.`,
    );
  }

  if (!phaseFolderExists) {
    await mkdir(phaseDirectory, { recursive: true });
  }

  const readinessReview = buildPhaseReadinessReviewRecord(roadmap, timestamp);
  const readinessMarkdown =
    renderPhaseReadinessReviewMarkdown(readinessReview);
  const readinessDirectory = resolvePhaseReadinessReviewsDirectory(phaseFolder);
  const readinessFileNames = buildPhaseReadinessReviewFileNames(phaseFolder);
  const readinessNameErrors = [
    ...validatePhaseReadinessReviewArtifactFileName(
      readinessFileNames.jsonFileName,
    ),
    ...validatePhaseReadinessReviewArtifactFileName(
      readinessFileNames.markdownFileName,
    ),
  ];

  if (readinessNameErrors.length > 0) {
    throw new Error(readinessNameErrors.join(" "));
  }

  const workCardPlan = buildRoadmapWorkCardPlanRecord(roadmap, timestamp);
  const workCardPlanMarkdown = renderWorkCardPlanMarkdown(workCardPlan);
  const workCardPlanDirectory = resolveWorkCardPlansDirectory(phaseFolder);
  const workCardPlanFileNames = buildRoadmapWorkCardPlanFileNames(
    roadmap.nextExecutablePhase.phaseTitle || phaseFolder,
  );
  const workCardPlanNameErrors = [
    ...validateWorkCardPlanArtifactFileName(workCardPlanFileNames.jsonFileName),
    ...validateWorkCardPlanArtifactFileName(
      workCardPlanFileNames.markdownFileName,
    ),
  ];

  if (workCardPlanNameErrors.length > 0) {
    throw new Error(workCardPlanNameErrors.join(" "));
  }

  const readinessTargets = await saveCanonicalPlanningArtifact({
    directory: readinessDirectory,
    jsonFileName: readinessFileNames.jsonFileName,
    markdownFileName: readinessFileNames.markdownFileName,
    artifactType: "phase_readiness_review",
    title: `${phaseFolder} Phase Readiness Review`,
    contentMarkdown: readinessMarkdown,
    data: readinessReview,
    phaseId: phaseFolder,
  });
  const workCardPlanTargets = await saveCanonicalPlanningArtifact({
    directory: workCardPlanDirectory,
    jsonFileName: workCardPlanFileNames.jsonFileName,
    markdownFileName: workCardPlanFileNames.markdownFileName,
    artifactType: "work_card_plan",
    title: `${phaseFolder} Work Card Plan`,
    contentMarkdown: workCardPlanMarkdown,
    data: workCardPlan,
    phaseId: phaseFolder,
  });

  const compatibilityPhaseIntakePaths =
    roadmap.compatibilityPhaseIntakeGenerated
      ? await saveRoadmapCompatibilityPhaseIntake(roadmap, timestamp)
      : {};

  return {
    createdPhaseFolder: phaseFolderExists ? undefined : phaseDirectory,
    phaseReadinessReviewJsonPath: readinessTargets.firstPath,
    phaseReadinessReviewMarkdownPath: readinessTargets.secondPath,
    workCardPlanJsonPath: workCardPlanTargets.firstPath,
    workCardPlanMarkdownPath: workCardPlanTargets.secondPath,
    ...compatibilityPhaseIntakePaths,
  };
}

async function saveRoadmapCompatibilityPhaseIntake(
  roadmap: ProjectRoadmapRecord,
  timestamp: string,
): Promise<
  Pick<
    ProjectRoadmapSaveResult,
    "compatibilityPhaseIntakeJsonPath" | "compatibilityPhaseIntakeMarkdownPath"
  >
> {
  const phaseIntake = buildCompatibilityPhaseIntakeFromRoadmap(
    roadmap,
    timestamp,
  );
  const markdown = renderPhaseIntakeMarkdown(phaseIntake);
  const directory = resolvePhaseIntakeDirectory(phaseIntake.phaseFolder);
  const fileNames = buildPhaseIntakeFileNames(phaseIntake.phaseName);
  const targetNameErrors = [
    ...validatePhaseIntakeArtifactFileName(fileNames.jsonFileName),
    ...validatePhaseIntakeArtifactFileName(fileNames.markdownFileName),
  ];
  const validation = validatePhaseIntake(phaseIntake);

  if (targetNameErrors.length > 0) {
    throw new Error(targetNameErrors.join(" "));
  }

  if (!validation.valid) {
    throw new Error(validation.errors.join(" "));
  }

  const targets = await saveCanonicalPlanningArtifact({
    directory,
    jsonFileName: fileNames.jsonFileName,
    markdownFileName: fileNames.markdownFileName,
    artifactType: "phase_intake",
    title: `${phaseIntake.phaseName} Phase Intake`,
    contentMarkdown: markdown,
    data: phaseIntake,
    phaseId: phaseIntake.phaseFolder,
  });

  return {
    compatibilityPhaseIntakeJsonPath: targets.firstPath,
    compatibilityPhaseIntakeMarkdownPath: targets.secondPath,
  };
}

async function readProjectRoadmapPhaseContexts(): Promise<
  ProjectRoadmapBuildInput["phaseContexts"]
> {
  const phases = await readSafePhaseFolders();
  const contexts: ProjectRoadmapBuildInput["phaseContexts"] = [];

  for (const phase of phases) {
    contexts.push({
      phase,
      summary: await readPhaseArtifactSummary(phase),
      workCardFileNames: await readPlanningFolderFileNames(
        resolveWorkCardsDirectory(phase),
        [".json", ".md"],
      ),
      implementerReportFileNames: await readPlanningFolderFileNames(
        resolveImplementerReportsDirectory(phase),
        [".md"],
      ),
      validationReportFileNames: await readPlanningFolderFileNames(
        resolveValidationReportsDirectory(phase),
        [".json", ".md"],
      ),
      repairPromptFileNames: await readPlanningFolderFileNames(
        resolveRepairPromptsDirectory(phase),
        [".md"],
      ),
      closeoutReportFileNames: await readPlanningFolderFileNames(
        resolveCloseoutReportsDirectory(phase),
        [".json", ".md"],
      ),
      workCardPlanFileNames: await readPlanningFolderFileNames(
        resolveWorkCardPlansDirectory(phase),
        [".json", ".md"],
      ),
      phasePlanningDocumentFileNames: await readPlanningFolderFileNames(
        resolvePhasePlanningDocumentsDirectory(phase),
        [".json", ".md"],
      ),
      phaseReadinessReviewFileNames: await readPlanningFolderFileNames(
        resolvePhaseReadinessReviewsDirectory(phase),
        [".json", ".md"],
      ),
    });
  }

  return contexts;
}

async function buildProjectRoadmapSourceArtifacts(input: {
  phaseContexts: ProjectRoadmapBuildInput["phaseContexts"];
  existingRoadmapFileNames: string[];
  projectPlanningDocumentFileName?: string;
  repositoryReconciliationFileName?: string;
}): Promise<ProjectRoadmapSourceArtifact[]> {
  const artifacts: ProjectRoadmapSourceArtifact[] = [];

  for (const fileName of [
    "PROJECT_PROFILE.md",
    "PROJECT_STATE.md",
    "WORK_CARD_BACKLOG.md",
    "OPEN_QUESTIONS.md",
    "RISKS.md",
    "DECISIONS.md",
  ]) {
    const filePath = resolveInside(planningProjectRoot, fileName);
    artifacts.push({
      label: fileName,
      path: `planning/project/${fileName}`,
      status: (await pathExists(filePath)) ? "found" : "missing",
    });
  }

  artifacts.push({
    label: "Project Planning Documents",
    path: "planning/project/Project_Planning_Documents/",
    status: input.projectPlanningDocumentFileName ? "selected" : "missing",
    notes: input.projectPlanningDocumentFileName ?? "No JSON sidecar found.",
  });
  artifacts.push({
    label: "Repository Reconciliation",
    path: "planning/project/Repository_Reconciliation/",
    status: input.repositoryReconciliationFileName ? "selected" : "missing",
    notes: input.repositoryReconciliationFileName ?? "No reconciliation JSON found.",
  });
  artifacts.push({
    label: "Project Roadmap",
    path: "planning/project/Project_Roadmap/",
    status: input.existingRoadmapFileNames.length > 0 ? "found" : "missing",
    notes:
      input.existingRoadmapFileNames.length > 0
        ? `${input.existingRoadmapFileNames.length} file(s) found.`
        : "No prior roadmap artifacts found.",
  });

  for (const context of input.phaseContexts) {
    artifacts.push({
      label: `${context.phase} phase artifacts`,
      path: `planning/phases/${context.phase}/`,
      status: "found",
      notes: [
        `${context.summary.workCardCount} Work Card(s)`,
        `${context.summary.implementerReportCount} Implementer Report(s)`,
        `${context.summary.validationReportCount} Validation Report(s)`,
        `${context.summary.repairPromptCount} Repair Prompt(s)`,
        `${context.summary.closeoutReportCount} Closeout Report(s)`,
      ].join(", "),
    });
  }

  return artifacts;
}

async function readSafePhaseFolders(): Promise<string[]> {
  let entries: Dirent[] = [];

  try {
    entries = await readdir(planningPhasesRoot, { withFileTypes: true });
  } catch (error) {
    if (!isNodeErrorWithCode(error, "ENOENT")) {
      throw error;
    }
  }

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((entry) => validateSafePhaseFolder(entry).length === 0)
    .sort((left, right) => left.localeCompare(right));
}

async function readProjectRoadmapFileNames(): Promise<string[]> {
  return readPlanningFolderFileNames(resolveProjectRoadmapDirectory(), [
    ".json",
    ".md",
  ]);
}

async function readPlanningFolderFileNames(
  directory: string,
  allowedExtensions: string[],
): Promise<string[]> {
  let entries: string[] = [];

  try {
    entries = await readdir(directory);
  } catch (error) {
    if (!isNodeErrorWithCode(error, "ENOENT")) {
      throw error;
    }
  }

  return entries
    .filter((entry) =>
      allowedExtensions.some((extension) =>
        entry.toLowerCase().endsWith(extension),
      ),
    )
    .filter((entry) => validateMarkdownOrJsonArtifactFileName(entry).length === 0)
    .sort((left, right) => left.localeCompare(right));
}

async function findLatestValidJsonFileName(
  directory: string,
  validateFileName: (fileName: string) => string[],
): Promise<string | undefined> {
  let entries: string[] = [];

  try {
    entries = await readdir(directory);
  } catch (error) {
    if (!isNodeErrorWithCode(error, "ENOENT")) {
      throw error;
    }
  }

  const candidates: Array<{ fileName: string; modifiedMs: number }> = [];

  for (const fileName of entries.filter((entry) =>
    entry.toLowerCase().endsWith(".json"),
  )) {
    if (validateFileName(fileName).length > 0) {
      continue;
    }

    const filePath = resolveInside(directory, fileName);
    const fileStats = await stat(filePath);

    candidates.push({ fileName, modifiedMs: fileStats.mtimeMs });
  }

  candidates.sort((left, right) => {
    if (left.modifiedMs !== right.modifiedMs) {
      return right.modifiedMs - left.modifiedMs;
    }

    return left.fileName.localeCompare(right.fileName);
  });

  return candidates[0]?.fileName;
}

async function readOptionalProjectMarkdownFile(
  fileName: string,
): Promise<string | undefined> {
  const fileNameErrors = validateMarkdownArtifactFileName(fileName);

  if (fileNameErrors.length > 0) {
    throw new Error(fileNameErrors.join(" "));
  }

  const filePath = resolveInside(planningProjectRoot, fileName);

  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if (isNodeErrorWithCode(error, "ENOENT")) {
      return undefined;
    }

    throw error;
  }
}

function validateMarkdownOrJsonArtifactFileName(fileName: string): string[] {
  const value = fileName.trim();

  if (value.length === 0) {
    return ["Artifact filename must not be blank."];
  }

  if (value !== path.basename(value) || value.includes("..")) {
    return ["Artifact filenames must not include folders or traversal."];
  }

  if (!/\.(json|md)$/i.test(value)) {
    return ["Artifact filenames must use .json or .md."];
  }

  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*\.(json|md)$/i.test(value)) {
    return [
      "Artifact filenames must use only letters, numbers, hyphens, underscores, and a .json or .md extension.",
    ];
  }

  return [];
}

async function readProjectPlanningMarkdownSummaries(): Promise<string> {
  const summaries: string[] = [];

  for (const fileName of projectPlanningDocumentFileNames) {
    const filePath = resolveProjectPlanningDocumentPath(fileName);

    try {
      const content = await readFile(filePath, "utf8");
      summaries.push(
        [
          `### ${fileName}`,
          summarizeMarkdownForPrompt(content),
        ].join("\n"),
      );
    } catch (error) {
      if (!isNodeErrorWithCode(error, "ENOENT")) {
        throw error;
      }

      summaries.push(`### ${fileName}\nNot found.`);
    }
  }

  return summaries.join("\n\n");
}

async function readReconciliationPhaseArtifactSummary(
  sourcePhaseFolder: string,
): Promise<string> {
  const selectedPhase = sourcePhaseFolder.trim();

  if (selectedPhase.length > 0) {
    const summary = await readPhaseArtifactSummary(selectedPhase);

    return formatPhaseArtifactSummaryForPrompt(summary);
  }

  let entries: Dirent[] = [];

  try {
    entries = await readdir(planningPhasesRoot, { withFileTypes: true });
  } catch (error) {
    if (!isNodeErrorWithCode(error, "ENOENT")) {
      throw error;
    }
  }

  const phases = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((entry) => validateSafePhaseFolder(entry).length === 0)
    .sort((left, right) => left.localeCompare(right));
  const summaries: string[] = [];

  for (const phase of phases) {
    summaries.push(
      formatPhaseArtifactSummaryForPrompt(await readPhaseArtifactSummary(phase)),
    );
  }

  return summaries.length > 0
    ? summaries.join("\n\n")
    : "No phase artifact folders were found.";
}

async function readRepositoryStructureSummary(): Promise<string> {
  let entries: Dirent[] = [];

  try {
    entries = await readdir(repositoryRoot, { withFileTypes: true });
  } catch (error) {
    if (!isNodeErrorWithCode(error, "ENOENT")) {
      throw error;
    }
  }

  const excluded = new Set([".git", "node_modules", "dist", "tmp"]);
  const topLevel = entries
    .filter((entry) => !excluded.has(entry.name))
    .map((entry) => `${entry.isDirectory() ? "dir" : "file"}:${entry.name}`)
    .sort((left, right) => left.localeCompare(right));

  return [
    `Repository root: ${repositoryRoot}`,
    `Top-level entries: ${topLevel.join(", ") || "None found."}`,
    "Known implementation folders: src/main, src/preload, src/renderer, src/shared.",
    "Known planning folders: planning/project and planning/phases.",
  ].join("\n");
}

function buildAppWorkflowSurfaceSummary(): string {
  return [
    "- Project Intake",
    "- Project Architect Interview",
    "- Project Planning Documents",
    "- Reconcile / Project State Review",
    "- Phase Intake",
    "- Phase Architect Interview",
    "- Phase Planning Documents",
    "- Work Card Capture",
    "- Architect Prompt Composer",
    "- Risk Router",
    "- Implementer Prompt Generator",
    "- Implementer Report Capture",
    "- Human Validation",
    "- Phase Closeout",
  ].join("\n");
}

function formatPhaseArtifactSummaryForPrompt(
  summary: Awaited<ReturnType<typeof readPhaseArtifactSummary>>,
): string {
  return [
    `### ${summary.phase}`,
    `Work Cards: ${summary.workCardCount}`,
    `Work Cards with JSON and Markdown: ${summary.workCardsWithBothJsonAndMarkdown.length}`,
    `Canonical Implementer Reports: ${summary.implementerReportCount}`,
    `Validation reports: ${summary.validationReportCount}`,
    `Repair prompts: ${summary.repairPromptCount}`,
    `Closeout reports: ${summary.closeoutReportCount}`,
    `Recommendation: ${summary.deterministicRecommendation}`,
    summary.missingExpectedArtifactObservations.length > 0
      ? `Missing artifact observations: ${summary.missingExpectedArtifactObservations.join("; ")}`
      : "Missing artifact observations: None detected by deterministic summary.",
  ].join("\n");
}

function summarizeMarkdownForPrompt(markdown: string): string {
  const lines = markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, 18);

  return lines.length > 0 ? lines.join("\n") : "Empty document.";
}

async function readProjectPlanningDocumentsContext(
  input: ProjectPlanningDocumentsRequest,
): Promise<{
  projectIntake?: ProjectIntake;
  sourceProjectIntakeJsonFileName?: string;
  sourceProjectIntakeMarkdownFileName?: string;
  projectArchitectInterviewPrompt?: ProjectArchitectInterviewPrompt;
  sourceProjectArchitectInterviewPromptJsonFileName?: string;
  sourceProjectArchitectInterviewPromptMarkdownFileName?: string;
}> {
  const projectIntakeFileName = input.projectIntakeFileName?.trim() ?? "";
  const promptFileName =
    input.projectArchitectInterviewPromptFileName?.trim() ?? "";
  const projectIntake =
    projectIntakeFileName.length > 0
      ? await readSavedProjectIntakeFile(projectIntakeFileName)
      : undefined;
  const sourceProjectIntakeMarkdownFileName = projectIntake
    ? await findMatchingProjectIntakeMarkdownFileName(projectIntakeFileName)
    : undefined;
  const projectArchitectInterviewPrompt =
    promptFileName.length > 0
      ? await readSavedProjectArchitectInterviewPromptFile(promptFileName)
      : undefined;
  const sourceProjectArchitectInterviewPromptMarkdownFileName =
    projectArchitectInterviewPrompt
      ? await findMatchingProjectArchitectInterviewPromptMarkdownFileName(
          promptFileName,
        )
      : undefined;

  return {
    projectIntake,
    sourceProjectIntakeJsonFileName: projectIntake
      ? projectIntakeFileName
      : undefined,
    sourceProjectIntakeMarkdownFileName,
    projectArchitectInterviewPrompt,
    sourceProjectArchitectInterviewPromptJsonFileName:
      projectArchitectInterviewPrompt ? promptFileName : undefined,
    sourceProjectArchitectInterviewPromptMarkdownFileName,
  };
}

async function readSavedWorkCardFile(
  phase: string,
  fileName: string,
): Promise<WorkCard> {
  const fileNameErrors = validateSavedWorkCardJsonFileName(fileName);

  if (fileNameErrors.length > 0) {
    throw new Error(fileNameErrors.join(" "));
  }

  const directory = resolveWorkCardsDirectory(phase);
  const filePath = resolveInside(directory, fileName.trim());
  const rawJson = await readFile(filePath, "utf8");
  const parsed = parseCanonicalArtifactData(rawJson);
  const validation = validateWorkCard(parsed);

  if (!validation.valid) {
    throw new Error(
      `Saved Work Card JSON is not valid: ${validation.errors.join(" ")}`,
    );
  }

  const workCard = parsed as WorkCard;

  if (workCard.phase !== phase.trim()) {
    throw new Error("Saved Work Card phase must match the selected phase folder.");
  }

  return workCard;
}

async function readSavedWorkCardAssociationFile(
  phase: string,
  fileName: string,
): Promise<WorkCardValidationTargetFields> {
  const fileNameErrors = validateSavedWorkCardJsonFileName(fileName);

  if (fileNameErrors.length > 0) {
    throw new Error(fileNameErrors.join(" "));
  }

  const directory = resolveWorkCardsDirectory(phase);
  const filePath = resolveInside(directory, fileName.trim());
  const rawJson = await readFile(filePath, "utf8");
  const parsed = parseCanonicalArtifactData(rawJson);
  const validation = validateWorkCard(parsed);

  if (!validation.valid) {
    throw new Error(
      `Saved Work Card JSON is not valid: ${validation.errors.join(" ")}`,
    );
  }

  const workCard = parsed as WorkCard;
  if (workCard.phase !== phase.trim()) {
    throw new Error("Saved Work Card phase must match the selected phase folder.");
  }
  return {
    workCardId: workCard.workCardId,
    title: workCard.title,
    phase: workCard.phase,
    status: workCard.status,
    riskLevel: workCard.riskLevel,
  };
}

async function readWorkCardValidationTargetFile(
  phase: string,
  fileName: string,
): Promise<ValidationTargetSummary> {
  const fileNameErrors = validateSavedWorkCardJsonFileName(fileName);

  if (fileNameErrors.length > 0) {
    throw new Error(fileNameErrors.join(" "));
  }

  const directory = resolveWorkCardsDirectory(phase);
  const filePath = resolveInside(directory, fileName.trim());
  const rawJson = await readFile(filePath, "utf8");
  const parsed = parseCanonicalArtifactData(rawJson);
  const validation = validateWorkCard(parsed);

  if (!validation.valid) {
    throw new Error(
      `Saved Work Card JSON is not valid: ${validation.errors.join(" ")}`,
    );
  }

  const workCard = parsed as WorkCard;
  return buildWorkCardValidationTarget(
    workCard,
    fileName,
    expectedImplementerReportFileName(workCard),
  );
}

function expectedImplementerReportFileName(
  workCard: Pick<WorkCardValidationTargetFields, "workCardId" | "title">,
): string {
  return `IMPLEMENTER_REPORT_${buildWorkCardFileStem(workCard.workCardId, workCard.title)}.md`;
}

async function readHumanValidationTargetContext(input: {
  phase: string;
  workCardFileName: string;
  validationTargetFileName?: string;
}): Promise<HumanValidationTargetContext> {
  const selectedFileName =
    input.validationTargetFileName?.trim() || input.workCardFileName.trim();

  if (selectedFileName.length === 0) {
    throw new Error("Choose a Validation Target.");
  }

  const workCardPath = resolveInside(
    resolveWorkCardsDirectory(input.phase),
    selectedFileName,
  );

  if (await pathExists(workCardPath)) {
    return {
      target: await readWorkCardValidationTargetFile(
        input.phase,
        selectedFileName,
      ),
    };
  }

  return {
    target: await readSavedValidationTargetFile(input.phase, selectedFileName),
  };
}

async function readSavedValidationTargetFile(
  phase: string,
  fileName: string,
): Promise<ValidationTargetSummary> {
  const fileNameErrors = validateValidationTargetJsonFileName(fileName);

  if (fileNameErrors.length > 0) {
    throw new Error(fileNameErrors.join(" "));
  }

  const directory = resolveValidationTargetsDirectory(phase);
  const filePath = resolveInside(directory, fileName.trim());
  const rawJson = await readFile(filePath, "utf8");
  const parsed = parseCanonicalArtifactData(rawJson);
  const target = toValidationTargetRecord(parsed);

  if (target.phase !== phase.trim()) {
    throw new Error(
      "Validation Target phase must match the selected phase folder.",
    );
  }

  return {
    ...target,
    fileName,
    label: formatValidationTargetLabel(target),
  };
}

async function readOptionalImplementerReport(
  phase: string,
  fileName: string | undefined,
): Promise<{ fileName: string; content: string } | undefined> {
  const value = fileName?.trim() ?? "";

  if (value.length === 0) {
    return undefined;
  }

  const fileNameErrors = validateMarkdownArtifactFileName(value);

  if (fileNameErrors.length > 0) {
    throw new Error(fileNameErrors.join(" "));
  }

  const directory = resolveImplementerReportsDirectory(phase);
  const filePath = resolveInside(directory, value);

  return {
    fileName: value,
    content: await readFile(filePath, "utf8"),
  };
}

async function resolveManualValidationChecklist(
  target: ValidationTargetSummary,
  implementerReport: { fileName: string; content: string } | undefined,
): Promise<ManualValidationChecklistExtraction | undefined> {
  const architectChecklist = await findArchitectValidationChecklist(target);

  if (architectChecklist) {
    return architectChecklist;
  }

  if (target.sourceMarkdownFile) {
    const candidateDirectories = [
      resolveWorkCardsDirectory(target.phase),
      resolveValidationTargetsDirectory(target.phase),
    ];

    for (const directory of candidateDirectories) {
      const filePath = resolveInside(directory, target.sourceMarkdownFile);

      if (!(await pathExists(filePath))) {
        continue;
      }

      const workCardChecklist = extractWorkCardValidationChecklist(
        await readFile(filePath, "utf8"),
      );

      if (workCardChecklist.detected) {
        return {
          ...workCardChecklist,
          sourceLabel: target.parentWorkCardId
            ? "Repair Work Card"
            : "Work Card",
          sourceFileName: target.sourceMarkdownFile,
          isFallback: true,
        };
      }
    }
  }

  if (target.parentWorkCardId) {
    const parentWorkCard = await findMatchingMarkdownArtifact(
      resolveWorkCardsDirectory(target.phase),
      target.parentWorkCardId,
      "Parent Work Card",
    );

    if (parentWorkCard?.path) {
      const parentChecklist = extractWorkCardValidationChecklist(
        await readFile(absoluteFromRepoPath(parentWorkCard.path), "utf8"),
      );

      if (parentChecklist.detected) {
        return {
          ...parentChecklist,
          sourceLabel: "Parent Work Card",
          sourceFileName: path.basename(parentWorkCard.path),
          isFallback: true,
        };
      }
    }
  }

  if (!implementerReport) {
    return {
      detected: false,
      text: noManualValidationChecklistDetectedMessage,
      isFallback: true,
    };
  }

  return {
    ...extractManualValidationChecklist(implementerReport.content),
    sourceLabel: "Implementer Report",
    sourceFileName: implementerReport.fileName,
    isFallback: true,
  };
}

async function findArchitectValidationChecklist(
  target: ValidationTargetSummary,
): Promise<ManualValidationChecklistExtraction | undefined> {
  const directory = resolveInside(
    planningPhasesRoot,
    target.phase,
    "Architect_Reviews",
  );
  const targetId = target.id.trim().toLowerCase();
  const exactPrefix = `architect_review_${targetId}`;
  const candidates: Array<{
    fileName: string;
    content: string;
    exact: boolean;
  }> = [];

  for (const fileName of await readDirectoryFileNames(directory, ".md")) {
    const filePath = resolveInside(directory, fileName);
    const content = await readFile(filePath, "utf8");
    const stem = path.basename(fileName, path.extname(fileName)).toLowerCase();
    const exact = stem === exactPrefix || stem.startsWith(`${exactPrefix}_`);

    if (exact || content.toLowerCase().includes(targetId)) {
      candidates.push({ fileName, content, exact });
    }
  }

  candidates.sort((left, right) => {
    if (left.exact !== right.exact) {
      return left.exact ? -1 : 1;
    }

    return right.fileName.localeCompare(left.fileName);
  });

  for (const candidate of candidates) {
    const checklist = extractManualValidationChecklist(candidate.content);

    if (checklist.detected) {
      return {
        ...checklist,
        sourceLabel: "Architect Review",
        sourceFileName: candidate.fileName,
        isFallback: false,
      };
    }
  }

  return undefined;
}

async function listImplementerReportOptionsForWorkCard(
  workCard: WorkCard,
): Promise<{
  options: Array<HumanValidationImplementerReportOption & { modifiedMs: number }>;
  invalidFiles: InvalidHumanValidationImplementerReportFile[];
}> {
  return listImplementerReportOptionsForValidationTarget(
    buildWorkCardValidationTarget(
      workCard,
      `${buildWorkCardFileStem(workCard.workCardId, workCard.title)}.json`,
    ),
  );
}

async function listImplementerReportOptionsForValidationTarget(
  target: ValidationTargetRecord,
): Promise<{
  options: Array<HumanValidationImplementerReportOption & { modifiedMs: number }>;
  invalidFiles: InvalidHumanValidationImplementerReportFile[];
}> {
  const directory = resolveImplementerReportsDirectory(target.phase);
  let entries: string[] = [];

  try {
    entries = await readdir(directory);
  } catch (error) {
    if (!isNodeErrorWithCode(error, "ENOENT")) {
      throw error;
    }
  }

  const options: Array<HumanValidationImplementerReportOption & { modifiedMs: number }> =
    [];
  const invalidFiles: InvalidHumanValidationImplementerReportFile[] = [];

  for (const fileName of entries.filter((entry) =>
    entry.toLowerCase().endsWith(".md"),
  )) {
    const fileNameErrors = validateMarkdownArtifactFileName(fileName);

    if (fileNameErrors.length > 0) {
      invalidFiles.push({ fileName, errorMessages: fileNameErrors });
      continue;
    }

    const filePath = resolveInside(directory, fileName);
    const fileStats = await stat(filePath);
    const isExpectedMatch =
      target.expectedImplementerReportFile === fileName;

    options.push({
      fileName,
      label: fileName,
      isDefaultMatch:
        isExpectedMatch ||
        (!target.expectedImplementerReportFile &&
          fileNameMatchesValidationTarget(fileName, target)),
      modifiedAt: fileStats.mtime.toISOString(),
      modifiedMs: fileStats.mtimeMs,
    });
  }

  options.sort((left, right) => {
    if (left.isDefaultMatch !== right.isDefaultMatch) {
      return left.isDefaultMatch ? -1 : 1;
    }

    if (left.isDefaultMatch && right.isDefaultMatch) {
      const modifiedDelta = right.modifiedMs - left.modifiedMs;

      if (modifiedDelta !== 0) {
        return modifiedDelta;
      }
    }

    return left.fileName.localeCompare(right.fileName);
  });

  return { options, invalidFiles };
}

async function listMarkdownArtifactOptions(
  phase: string,
  folder: SupportingArtifactFolder,
  workCardId: string,
  preferredFileName: string | undefined,
  invalidFiles: NonNullable<ImplementerExecutionPacketArtifactListResult["invalidFiles"]>,
): Promise<ImplementerExecutionPacketArtifactOption[]> {
  const directory = resolveSupportingArtifactDirectory(phase, folder);
  let entries: string[] = [];

  try {
    entries = await readdir(directory);
  } catch (error) {
    if (!isNodeErrorWithCode(error, "ENOENT")) {
      throw error;
    }
  }

  const options: ImplementerExecutionPacketArtifactOption[] = [];

  for (const fileName of entries.filter((entry) =>
    entry.toLowerCase().endsWith(".md"),
  )) {
    const fileNameErrors = validateMarkdownArtifactFileName(fileName);

    if (fileNameErrors.length > 0) {
      invalidFiles.push({
        folder,
        fileName,
        errorMessages: fileNameErrors,
      });
      continue;
    }

    options.push({
      fileName,
      label: fileName,
      isDefaultMatch:
        fileName === preferredFileName ||
        fileNameMatchesWorkCardId(fileName, workCardId),
    });
  }

  return options.sort((left, right) => {
    if (left.fileName === preferredFileName) {
      return -1;
    }

    if (right.fileName === preferredFileName) {
      return 1;
    }

    if (left.isDefaultMatch !== right.isDefaultMatch) {
      return left.isDefaultMatch ? -1 : 1;
    }

    return left.fileName.localeCompare(right.fileName);
  });
}

async function readImplementerExecutionPacketSupportingArtifacts(
  phase: string,
  fileNames: ImplementerExecutionPacketSupportingArtifactFileNames | undefined,
): Promise<ImplementerExecutionPacketSupportingArtifacts> {
  const selected = fileNames ?? {};

  return {
    workCardMarkdown: await readOptionalMarkdownArtifact(
      phase,
      "Work_Cards",
      selected.workCardMarkdown,
    ),
    architectPrompt: await readOptionalMarkdownArtifact(
      phase,
      "Architect_Prompts",
      selected.architectPrompt,
    ),
    riskReview: await readOptionalMarkdownArtifact(
      phase,
      "Risk_Reviews",
      selected.riskReview,
    ),
    priorImplementerReport: await readOptionalMarkdownArtifact(
      phase,
      "Implementer_Reports",
      selected.priorImplementerReport,
    ),
  };
}

async function readOptionalMarkdownArtifact(
  phase: string,
  folder: SupportingArtifactFolder,
  fileName: string | undefined,
): Promise<ImplementerExecutionPacketSupportingArtifact | undefined> {
  const value = fileName?.trim() ?? "";

  if (value.length === 0) {
    return undefined;
  }

  const fileNameErrors = validateMarkdownArtifactFileName(value);

  if (fileNameErrors.length > 0) {
    throw new Error(fileNameErrors.join(" "));
  }

  const directory = resolveSupportingArtifactDirectory(phase, folder);
  const filePath = resolveInside(directory, value);
  const content = await readFile(filePath, "utf8");

  return {
    fileName: value,
    content,
  };
}

function resolveSupportingArtifactDirectory(
  phase: string,
  folder: SupportingArtifactFolder,
): string {
  if (folder === "Work_Cards") {
    return resolveWorkCardsDirectory(phase);
  }

  if (folder === "Architect_Prompts") {
    return resolveArchitectPromptsDirectory(phase);
  }

  if (folder === "Risk_Reviews") {
    return resolveRiskReviewsDirectory(phase);
  }

  return resolveImplementerReportsDirectory(phase);
}

async function readPhaseArtifactSummary(phase: string) {
  const phaseErrors = validateSafePhaseFolder(phase);

  if (phaseErrors.length > 0) {
    throw new Error(phaseErrors.join(" "));
  }

  const filesByFolder: PhaseArtifactFilesByFolder =
    createEmptyPhaseArtifactFiles();

  for (const folder of phaseArtifactFolderNames) {
    filesByFolder[folder] = await readPhaseArtifactFileNames(phase, folder);
  }

  return summarizePhaseArtifacts({
    phase,
    filesByFolder,
  });
}

async function readPhaseArtifactFileNames(
  phase: string,
  folder: PhaseArtifactFolderName,
): Promise<string[]> {
  const directory = resolvePhaseArtifactDirectory(phase, folder);
  const allowedExtensions = getAllowedPhaseArtifactExtensions(folder);
  let entries: string[] = [];

  try {
    entries = await readdir(directory);
  } catch (error) {
    if (!isNodeErrorWithCode(error, "ENOENT")) {
      throw error;
    }
  }

  return entries
    .filter((entry) =>
      allowedExtensions.some((extension) =>
        entry.toLowerCase().endsWith(extension),
      ),
    )
    .filter(
      (entry) =>
        validatePhaseArtifactFileName(entry, allowedExtensions).length === 0,
    )
    .sort((left, right) => left.localeCompare(right));
}

function resolvePhaseArtifactDirectory(
  phase: string,
  folder: PhaseArtifactFolderName,
): string {
  if (folder === "Work_Cards") {
    return resolveWorkCardsDirectory(phase);
  }

  if (folder === "Architect_Prompts") {
    return resolveArchitectPromptsDirectory(phase);
  }

  if (folder === "Risk_Reviews") {
    return resolveRiskReviewsDirectory(phase);
  }

  if (folder === "Implementer_Execution_Packets") {
    return resolveImplementerExecutionPacketsDirectory(phase);
  }

  if (folder === "Implementer_Reports") {
    return resolveImplementerReportsDirectory(phase);
  }

  if (folder === "Validation_Reports") {
    return resolveValidationReportsDirectory(phase);
  }

  if (folder === "Repair_Prompts") {
    return resolveRepairPromptsDirectory(phase);
  }

  return resolveCloseoutReportsDirectory(phase);
}

function pickDefaultArtifactFileName(
  options: ImplementerExecutionPacketArtifactOption[],
): string | undefined {
  return options.find((option) => option.isDefaultMatch)?.fileName;
}

function buildMissingArtifactNotes(
  defaultSelections: ImplementerExecutionPacketSupportingArtifactFileNames,
): string[] {
  const notes: string[] = [];

  if (!defaultSelections.workCardMarkdown) {
    notes.push(
      "No matching Work Card Markdown artifact was found. Prompt generation will use the Work Card JSON as the primary source.",
    );
  }

  if (!defaultSelections.architectPrompt) {
    notes.push(
      "No matching Architect Prompt artifact was found. You can still generate an Implementer prompt from the Work Card JSON.",
    );
  }

  if (!defaultSelections.riskReview) {
    notes.push(
      "No matching Risk Review artifact was found. The generated prompt will include a no-risk-review warning.",
    );
  }

  if (!defaultSelections.priorImplementerReport) {
    notes.push(
      "No matching prior Implementer Report artifact was found. Implementation-history context will be omitted unless selected.",
    );
  }

  return notes;
}

function toHumanValidationStatusRecord(
  candidate: unknown,
  phase: string,
): HumanValidationStatusRecord {
  if (!isPlainRecord(candidate)) {
    throw new Error("Validation Report JSON must be an object.");
  }

  const recordPhase = requireStatusText(
    candidate.phase,
    "Phase",
  );

  if (recordPhase !== phase.trim()) {
    throw new Error("Validation Report phase must match the selected phase folder.");
  }

  const validationResult = normalizeHumanValidationResult(
    candidate.validationResult ?? candidate.status,
  );
  const architectDisposition = normalizeOptionalText(
    candidate.architectDisposition,
  );
  const operatorDecisionValue = candidate.operatorDecision;
  const operatorDecision =
    operatorDecisionValue === undefined
      ? undefined
      : normalizeHumanValidationOperatorDecision(operatorDecisionValue);

  if (!isHumanValidationResult(validationResult)) {
    throw new Error("Validation result is not a supported value.");
  }

  if (
    operatorDecision !== undefined &&
    !isHumanValidationOperatorDecision(operatorDecision)
  ) {
    throw new Error("Operator decision is not a supported advisory value.");
  }

  const validationTargetKindValue =
    candidate.validationTargetKind;
  const validationTargetKind =
    typeof validationTargetKindValue === "string" &&
    isValidationTargetKind(validationTargetKindValue)
      ? validationTargetKindValue
      : undefined;

  const statusRecord: HumanValidationStatusRecord = {
    phase: recordPhase,
    validationResult,
    architectDisposition,
    operatorDecision,
    workCardId: normalizeOptionalText(candidate.workCardId),
    workCardTitle: normalizeOptionalText(candidate.workCardTitle),
    validationTargetId: normalizeOptionalText(candidate.validationTargetId),
    validationTargetKind,
    validationTargetTitle: normalizeOptionalText(candidate.validationTargetTitle),
    validationTargetSourceJsonFile: normalizeOptionalText(
      candidate.validationTargetSourceJsonFile,
    ),
    createdAt: normalizeOptionalText(
      candidate.createdAt,
    ),
  };

  if (
    !statusRecord.validationTargetSourceJsonFile &&
    !statusRecord.validationTargetId &&
    !statusRecord.workCardId
  ) {
    throw new Error("Validation Report does not identify a Validation Target.");
  }

  return statusRecord;
}

function normalizeHumanValidationResult(value: unknown): HumanValidationResult {
  const text = requireStatusText(value, "Validation result");

  if (isHumanValidationResult(text)) {
    return text;
  }

  const normalized = text.trim().toLowerCase().replace(/[_-]+/g, " ");
  const resultByLegacyValue: Record<string, string> = {
    pass: "Pass",
    passed: "Pass",
    "pass with concerns": "Pass with concerns",
    fail: "Fail",
    failed: "Fail",
    partial: "Partial",
    blocked: "Blocked",
    "not tested": "Not tested",
  };
  const result = resultByLegacyValue[normalized];

  if (!result || !isHumanValidationResult(result)) {
    throw new Error("Validation result is not a supported value.");
  }

  return result;
}

function normalizeHumanValidationOperatorDecision(
  value: unknown,
): HumanValidationOperatorDecision {
  const text = requireStatusText(value, "Legacy Operator decision");

  if (!isHumanValidationOperatorDecision(text)) {
    throw new Error("Legacy Operator decision is not a supported advisory value.");
  }

  return text;
}

function validationRecordMatchesTarget(
  record: HumanValidationStatusRecord,
  target: ValidationTargetSummary,
): boolean {
  const sourceJsonFile = normalizeComparableText(
    record.validationTargetSourceJsonFile,
  );

  if (
    sourceJsonFile &&
    (sourceJsonFile === normalizeComparableText(target.sourceJsonFile) ||
      sourceJsonFile === normalizeComparableText(target.fileName))
  ) {
    return true;
  }

  const recordTargetId = normalizeComparableText(record.validationTargetId);
  const recordWorkCardId = normalizeComparableText(record.workCardId);
  const targetId = normalizeComparableText(target.id);

  if (recordTargetId && recordTargetId === targetId) {
    return !record.validationTargetKind || record.validationTargetKind === target.kind;
  }

  if (recordWorkCardId && recordWorkCardId === targetId) {
    return !record.validationTargetKind || record.validationTargetKind === target.kind;
  }

  return (
    recordWorkCardId === targetId &&
    normalizeComparableText(record.workCardTitle) ===
      normalizeComparableText(target.title)
  );
}

async function findValidationReportMarkdownFileName(
  directory: string,
  jsonFileName: string,
): Promise<string | undefined> {
  const markdownFileName = jsonFileName.replace(/\.json$/i, ".md");

  try {
    validateValidationReportFileName(markdownFileName);
  } catch {
    return undefined;
  }

  const markdownPath = resolveInside(directory, markdownFileName);

  return (await pathExists(markdownPath)) ? markdownFileName : undefined;
}

function compareHumanValidationStatuses(
  left: LatestHumanValidationStatus,
  right: LatestHumanValidationStatus,
): number {
  if (left.latestSortMs !== right.latestSortMs) {
    return left.latestSortMs - right.latestSortMs;
  }

  return left.fileModifiedMs - right.fileModifiedMs;
}

function fileNameMatchesWorkCardId(
  fileName: string,
  workCardId: string,
): boolean {
  const normalizedFileName = fileName.toLowerCase();
  const normalizedWorkCardId = workCardId.toLowerCase();

  return (
    normalizedFileName.startsWith(`${normalizedWorkCardId}_`) ||
    normalizedFileName.includes(`_${normalizedWorkCardId}_`) ||
    normalizedFileName.includes(`_${normalizedWorkCardId}.`)
  );
}

function fileNameMatchesWorkCard(
  fileName: string,
  workCard: Pick<WorkCard, "workCardId" | "title">,
): boolean {
  const normalizedFileName = fileName.toLowerCase();
  const normalizedSlug = slugifyWorkCardTitle(workCard.title).toLowerCase();

  return (
    fileNameMatchesWorkCardId(fileName, workCard.workCardId) ||
    (normalizedSlug.length > 0 && normalizedFileName.includes(normalizedSlug))
  );
}

function fileNameMatchesValidationTarget(
  fileName: string,
  target: Pick<
    ValidationTargetRecord,
    "id" | "title" | "parentWorkCardId"
  >,
): boolean {
  const normalizedFileName = fileName.toLowerCase();
  const normalizedSlug = slugifyWorkCardTitle(target.title).toLowerCase();

  return (
    fileNameMatchesWorkCardId(fileName, target.id) ||
    (target.parentWorkCardId
      ? fileNameMatchesWorkCardId(fileName, target.parentWorkCardId)
      : false) ||
    (normalizedSlug.length > 0 && normalizedFileName.includes(normalizedSlug))
  );
}

function toSelectedSupportingArtifactFileNames(
  supportingArtifacts: ImplementerExecutionPacketSupportingArtifacts,
): ImplementerExecutionPacketSupportingArtifactFileNames {
  return {
    workCardMarkdown: supportingArtifacts.workCardMarkdown?.fileName,
    architectPrompt: supportingArtifacts.architectPrompt?.fileName,
    riskReview: supportingArtifacts.riskReview?.fileName,
    priorImplementerReport: supportingArtifacts.priorImplementerReport?.fileName,
  };
}

function hasImplementerExecutionPacketHighRiskContext(
  workCard: WorkCard,
  supportingArtifacts: ImplementerExecutionPacketSupportingArtifacts,
): boolean {
  return (
    workCard.riskLevel === "high" ||
    hasHighRiskReviewContext(supportingArtifacts.riskReview?.content ?? "")
  );
}

function toSavedWorkCardSummary(
  fileName: string,
  workCard: WorkCardValidationTargetFields,
): SavedWorkCardSummary {
  const isRepair =
    Boolean(workCard.parentWorkCardId?.trim()) ||
    /-REPAIR\d+$/i.test(workCard.workCardId.trim());

  return {
    fileName,
    workCardId: workCard.workCardId,
    title: workCard.title,
    status: workCard.status,
    phase: workCard.phase,
    riskLevel: workCard.riskLevel ?? "not_recorded",
    parentWorkCardId: workCard.parentWorkCardId,
    kind: isRepair ? "repair" : "work_card",
  };
}

function toSavedPhaseMapSummary(
  fileName: string,
  phaseMap: PhaseMapRecord,
): SavedPhaseMapSummary {
  return {
    fileName,
    phaseMapId: phaseMap.phaseMapId,
    projectName: phaseMap.projectName,
    sourceRoadmapId: phaseMap.sourceRoadmapId,
    sourceProjectRoadmapJsonFileName:
      phaseMap.sourceFiles.projectRoadmapJsonFileName,
    sourceRepositoryReconciliationJsonFileName:
      phaseMap.sourceFiles.repositoryReconciliationJsonFileName,
    sourceProjectPlanningDocumentJsonFileName:
      phaseMap.sourceFiles.projectPlanningDocumentJsonFileName,
    currentOrNextPhase: phaseMap.currentOrNextPhase,
    nextPhaseTitle: phaseMap.nextPhaseTitle,
    updatedAt: phaseMap.updatedAt,
    mappedPhases: phaseMap.mappedPhases.map((phase) => ({
      phaseId: phase.phaseId,
      phaseTitle: phase.phaseTitle,
      status: phase.status,
      isRecommendedNext: phase.phaseId === phaseMap.currentOrNextPhase,
      unresolvedQuestions: phase.unresolvedQuestions,
    })),
  };
}

async function toSavedWorkCardPlanSummary(
  directory: string,
  fileName: string,
  workCardPlan: WorkCardPlanRecord,
): Promise<SavedWorkCardPlanSummary> {
  const markdownFileName = fileName.replace(/\.json$/i, ".md");
  const markdownPath = resolveInside(directory, markdownFileName);
  const safeMarkdownFileName =
    validateWorkCardPlanArtifactFileName(markdownFileName).length === 0 &&
    (await pathExists(markdownPath))
      ? markdownFileName
      : undefined;

  return {
    fileName,
    markdownFileName: safeMarkdownFileName,
    workCardPlanId: workCardPlan.workCardPlanId,
    projectName: workCardPlan.projectName,
    phaseFolder: workCardPlan.phaseFolder,
    phaseName: workCardPlan.phaseName,
    sourcePhasePlanningDocumentsId:
      workCardPlan.sourcePhasePlanningDocumentsId,
    reviewStatus: workCardPlan.reviewStatus,
    phaseActivationStatus: workCardPlan.phaseActivationStatus,
    artifactAuthority: workCardPlan.artifactAuthority,
    proposedWorkCards: workCardPlan.proposedWorkCards,
    proposedWorkCardCount: workCardPlan.proposedWorkCards.length,
    updatedAt: workCardPlan.updatedAt,
  };
}

function compareSavedProjectArtifactSummaries(
  left: { updatedAt: string; projectName: string; fileName: string },
  right: { updatedAt: string; projectName: string; fileName: string },
): number {
  const leftUpdatedAt = Date.parse(left.updatedAt);
  const rightUpdatedAt = Date.parse(right.updatedAt);
  const leftHasDate = Number.isFinite(leftUpdatedAt);
  const rightHasDate = Number.isFinite(rightUpdatedAt);

  if (leftHasDate && rightHasDate && leftUpdatedAt !== rightUpdatedAt) {
    return rightUpdatedAt - leftUpdatedAt;
  }

  if (leftHasDate !== rightHasDate) {
    return leftHasDate ? -1 : 1;
  }

  return `${left.projectName} ${left.fileName}`.localeCompare(
    `${right.projectName} ${right.fileName}`,
  );
}

function compareSavedPhaseIntakeSummaries(
  left: {
    generationMode?: string;
    updatedAt: string;
    phaseName: string;
    fileName: string;
  },
  right: {
    generationMode?: string;
    updatedAt: string;
    phaseName: string;
    fileName: string;
  },
): number {
  if (left.generationMode !== right.generationMode) {
    if (left.generationMode === "architect-led") {
      return -1;
    }

    if (right.generationMode === "architect-led") {
      return 1;
    }
  }

  const leftUpdatedAt = Date.parse(left.updatedAt);
  const rightUpdatedAt = Date.parse(right.updatedAt);
  const leftHasDate = Number.isFinite(leftUpdatedAt);
  const rightHasDate = Number.isFinite(rightUpdatedAt);

  if (leftHasDate && rightHasDate && leftUpdatedAt !== rightUpdatedAt) {
    return rightUpdatedAt - leftUpdatedAt;
  }

  if (leftHasDate !== rightHasDate) {
    return leftHasDate ? -1 : 1;
  }

  return `${left.phaseName} ${left.fileName}`.localeCompare(
    `${right.phaseName} ${right.fileName}`,
  );
}

interface CanonicalPlanningArtifactSaveInput {
  directory: string;
  jsonFileName?: string;
  markdownFileName: string;
  artifactType: string;
  title?: string;
  contentMarkdown: string;
  data: unknown;
  phaseId?: string;
  workCardId?: string;
  parentArtifactId?: string;
  status?: ArtifactStatus;
  relationships?: Partial<ArtifactRelationships>;
}

interface CanonicalPlanningArtifactSaveResult {
  firstPath: string;
  secondPath: string;
  firstFileName: string;
  secondFileName: string;
}

/**
 * The only planning-artifact write boundary in this store. A logical artifact
 * keeps one fixed JSON/Markdown filename pair; subsequent saves create a new
 * canonical revision and synchronously update the registry.
 */
async function saveCanonicalPlanningArtifact(
  input: CanonicalPlanningArtifactSaveInput,
): Promise<CanonicalPlanningArtifactSaveResult> {
  const markdownFileName = input.markdownFileName.trim();
  const jsonFileName =
    input.jsonFileName?.trim() ?? markdownFileName.replace(/\.md$/i, ".json");
  const markdownStem = markdownFileName.replace(/\.md$/i, "");
  const jsonStem = jsonFileName.replace(/\.json$/i, "");

  if (
    !/\.md$/i.test(markdownFileName) ||
    !/\.json$/i.test(jsonFileName) ||
    markdownStem !== jsonStem
  ) {
    throw new Error("Canonical artifact filenames must be one matching JSON/Markdown pair.");
  }

  const relativeDirectory = toRepositoryRelativePath(input.directory);
  const location: CanonicalArtifactLocation = {
    directoryPath: relativeDirectory,
    fileStem: markdownStem,
  };
  let existing: CanonicalArtifact | undefined;

  try {
    existing = (await artifactPairService.readArtifact(location)).artifact;
  } catch (error) {
    if (!(error instanceof ArtifactPairServiceError && error.code === "not_found")) {
      throw error;
    }
  }

  const phaseId = existing?.phaseId ?? input.phaseId;
  const workCardId = existing?.workCardId ?? input.workCardId?.trim();
  const artifactType = existing?.artifactType ?? input.artifactType;
  const artifactId =
    existing?.artifactId ??
    buildCanonicalArtifactId(phaseId, artifactType, workCardId ?? markdownStem);
  const relationships = mergeArtifactRelationships(
    existing?.relationships,
    input.relationships,
  );
  const title =
    input.title?.trim() ||
    /^#\s+(.+)$/m.exec(input.contentMarkdown)?.[1]?.trim() ||
    markdownStem.replaceAll("_", " ");
  const routedWrite = bindRoutedArtifactWrite({
    artifactId,
    artifactType,
    ...(phaseId ? { phaseId } : {}),
    ...(workCardId ? { workCardId } : {}),
    relationships,
    data: toCanonicalJsonValue(input.data),
  });
  const result = await artifactPairService.commitArtifact({
    artifactId: routedWrite.artifactId,
    artifactType,
    status: existing?.status ?? input.status ?? "active",
    projectId: existing?.projectId ?? "champcity-ai",
    ...(phaseId ? { phaseId } : {}),
    ...(workCardId ? { workCardId } : {}),
    ...((existing?.parentArtifactId ?? input.parentArtifactId)
      ? { parentArtifactId: existing?.parentArtifactId ?? input.parentArtifactId }
      : {}),
    relationships: routedWrite.relationships,
    payload: {
      title,
      contentMarkdown: input.contentMarkdown,
      data: routedWrite.data,
    },
    location,
    expectedRevision: existing?.revision ?? null,
  });
  recordRoutedArtifactCommit(result.artifact);

  return {
    firstPath: resolveInside(repositoryRoot, result.artifact.jsonPath),
    secondPath: resolveInside(repositoryRoot, result.artifact.markdownPath),
    firstFileName: jsonFileName,
    secondFileName: markdownFileName,
  };
}

function buildCanonicalArtifactId(
  phaseId: string | undefined,
  artifactType: string,
  logicalSuffix: string,
): string {
  const suffix = logicalSuffix
    .trim()
    .replace(/\.(?:json|md)$/i, "")
    .replace(/[^A-Za-z0-9-]+/g, "_");
  return `champcity-ai/${phaseId ?? "project"}/${artifactType}/${suffix}`;
}

function buildParentWorkCardArtifactId(
  phaseId: string,
  workCardId: string,
): string | undefined {
  const parentWorkCardId = /^(WC\d+)-REPAIR\d+$/i.exec(workCardId.trim())?.[1];
  return parentWorkCardId
    ? `champcity-ai/${phaseId}/work_card/${parentWorkCardId.toUpperCase()}`
    : undefined;
}

function mergeArtifactRelationships(
  existing: ArtifactRelationships | undefined,
  additional: Partial<ArtifactRelationships> | undefined,
): ArtifactRelationships {
  const merge = (left: readonly string[] | undefined, right: readonly string[] | undefined) =>
    Array.from(new Set([...(left ?? []), ...(right ?? [])])).sort();

  return {
    sources: merge(existing?.sources, additional?.sources),
    expectedOutputs: merge(existing?.expectedOutputs, additional?.expectedOutputs),
    supersedes: merge(existing?.supersedes, additional?.supersedes),
    children: merge(existing?.children, additional?.children),
  };
}

function toCanonicalJsonValue(value: unknown): JsonValue {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) {
    throw new TypeError("Canonical artifact data must be JSON serializable.");
  }
  return JSON.parse(serialized) as JsonValue;
}

async function resolveAvailableFilePath(
  directory: string,
  fileName: string,
  failureMessage: string,
): Promise<{ filePath: string; fileName: string }> {
  for (let suffix = 1; suffix <= 99; suffix += 1) {
    const nextFileName = appendFileNameSuffix(fileName, suffix);
    const filePath = resolveInside(directory, nextFileName);

    if (!(await pathExists(filePath))) {
      return { filePath, fileName: nextFileName };
    }
  }

  throw new Error(failureMessage);
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch (error) {
    if (isNodeErrorWithCode(error, "ENOENT")) {
      return false;
    }

    throw error;
  }
}

function appendFileNameSuffix(fileName: string, suffix: number): string {
  if (suffix === 1) {
    return fileName;
  }

  return fileName.replace(/(\.[^.]+)$/, `_${suffix}$1`);
}

function toRepositoryRelativePath(filePath: string): string {
  const relative = path.relative(repositoryRoot, filePath);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Saved evidence path must stay inside the repository.");
  }

  return relative.split(path.sep).join("/");
}

function requireStatusText(value: unknown, label: string): string {
  const text = normalizeOptionalText(value);

  if (!text) {
    throw new Error(`${label} is required.`);
  }

  return text;
}

function normalizeOptionalText(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeComparableText(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toPlainSaveError(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "The Work Card could not be saved. Please check the form and try again.";
}

function isNodeErrorWithCode(error: unknown, code: string): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === code
  );
}
