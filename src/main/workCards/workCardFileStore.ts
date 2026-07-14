import {
  access,
  mkdir,
  readFile,
  readdir,
  realpath,
  stat,
  writeFile,
} from "node:fs/promises";
import { readFileSync, readdirSync, statSync, type Dirent } from "node:fs";
import path from "node:path";

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
  buildBuilderPromptFileName,
  hasHighRiskReviewContext,
  type BuilderPromptArtifactListResult,
  type BuilderPromptArtifactOption,
  type BuilderPromptArtifactOptions,
  type BuilderPromptRequest,
  type BuilderPromptSaveResult,
  type BuilderPromptSupportingArtifact,
  type BuilderPromptSupportingArtifactFileNames,
  type BuilderPromptSupportingArtifacts,
  type BuilderPromptPreviewResult,
  renderBuilderPrompt,
} from "../../shared/workCards/renderBuilderPrompt";
import {
  buildRiskReviewFileName,
  type RiskReviewPreviewResult,
  type RiskReviewRequest,
  type RiskReviewSaveResult,
  renderRiskReviewMarkdown,
} from "../../shared/workCards/renderRiskReviewMarkdown";
import {
  buildBuilderReportFileName,
  type BuilderReportCapturePreviewResult,
  type BuilderReportCaptureRequest,
  type BuilderReportCaptureSaveResult,
  validateBuilderReport,
} from "../../shared/workCards/validateBuilderReport";
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
  buildHumanValidationRecord,
  buildValidationReportJsonFileName,
  buildValidationReportMarkdownFileName,
  type AvailablePhaseFoldersResult,
  type BuilderReportFileLoadRequest,
  type BuilderReportFileLoadResult,
  extractManualValidationChecklist,
  extractWorkCardValidationChecklist,
  getDifferentProblemGuidance,
  isHumanValidationOperatorDecision,
  isHumanValidationResult,
  noBuilderReportSelectedWarning,
  noManualValidationChecklistDetectedMessage,
  type HumanValidationBuilderReportListRequest,
  type HumanValidationBuilderReportListResult,
  type HumanValidationBuilderReportOption,
  type HumanValidationFormInput,
  type HumanValidationOperatorDecision,
  type HumanValidationResult,
  type ManualValidationChecklistExtraction,
  type HumanValidationPreviewResult,
  type HumanValidationRecord,
  type HumanValidationSaveResult,
  type HumanValidationStatusListResult,
  type HumanValidationStatusSummary,
  type InvalidHumanValidationBuilderReportFile,
  type InvalidHumanValidationStatusFile,
  shouldGenerateRepairPrompt,
  type ValidationEvidenceFileImportRequest,
  type ValidationEvidenceFileImportResult,
  validateHumanValidationRecord,
  validateValidationReportFileName,
} from "../../shared/workCards/validationRecord";
import {
  buildWorkCardValidationTarget,
  buildValidationTargetFromWorkCardFields,
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
import {
  buildCurrentRequiredActionResult,
  type CurrentActionArtifactReference,
  type CurrentActionArchitectReviewState,
  type CurrentActionPhaseState,
  type CurrentActionPhaseCloseoutState,
  type CurrentActionRepairState,
  type CurrentActionValidationState,
  type CurrentActionWorkCardCandidate,
  type CurrentActionWorkCardState,
  type CurrentRequiredActionResult,
  type CurrentRequiredActionState,
  type CurrentRequiredActionWarning,
} from "../../shared/workCards/currentRequiredAction";
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
  type PhaseMapBuilderRequest,
  type PhaseMapPreviewResult,
  type PhaseMapRecord,
  type PhaseMapSaveResult,
  type SavedPhaseMapSummary,
} from "../../shared/workCards/phaseMap";

const repositoryRoot = path.resolve(__dirname, "..", "..", "..");
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
  | "Builder_Reports";

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
    const state = await buildCurrentRequiredActionStateFromRepo();

    return buildCurrentRequiredActionResult(state);
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
    const markdownPath = resolveInside(directory, `${fileStem}.md`);
    const jsonPath = resolveInside(directory, `${fileStem}.json`);

    await failIfExists(
      markdownPath,
      "A Work Card file with this ID and title already exists.",
    );
    await failIfExists(
      jsonPath,
      "A Work Card file with this ID and title already exists.",
    );
    await mkdir(directory, { recursive: true });
    await writeFile(jsonPath, `${JSON.stringify(workCard, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
    });
    await writeFile(markdownPath, markdown, {
      encoding: "utf8",
      flag: "wx",
    });

    return {
      ok: true,
      markdown,
      workCard,
      markdownPath,
      jsonPath,
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
    const targets = await resolveAvailableFilePair(
      directory,
      preview.suggestedFileNames.jsonFileName,
      preview.suggestedFileNames.markdownFileName,
      "A safe Project Intake filename could not be generated.",
    );
    const targetNameErrors = [
      ...validateProjectIntakeArtifactFileName(targets.firstFileName),
      ...validateProjectIntakeArtifactFileName(targets.secondFileName),
    ];

    if (targetNameErrors.length > 0) {
      throw new Error(targetNameErrors.join(" "));
    }

    await mkdir(directory, { recursive: true });
    await writeFile(
      targets.firstPath,
      `${JSON.stringify(preview.projectIntake, null, 2)}\n`,
      {
        encoding: "utf8",
        flag: "wx",
      },
    );
    await writeFile(targets.secondPath, preview.markdown, {
      encoding: "utf8",
      flag: "wx",
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
    const targets = await resolveAvailableFilePair(
      directory,
      preview.suggestedFileNames.jsonFileName,
      preview.suggestedFileNames.markdownFileName,
      "A safe Project Architect Interview Prompt filename could not be generated.",
    );
    const targetNameErrors = [
      ...validateProjectArchitectInterviewPromptArtifactFileName(
        targets.firstFileName,
      ),
      ...validateProjectArchitectInterviewPromptArtifactFileName(
        targets.secondFileName,
      ),
    ];

    if (targetNameErrors.length > 0) {
      throw new Error(targetNameErrors.join(" "));
    }

    await mkdir(directory, { recursive: true });
    await writeFile(
      targets.firstPath,
      `${JSON.stringify(preview.promptRecord, null, 2)}\n`,
      {
        encoding: "utf8",
        flag: "wx",
      },
    );
    await writeFile(targets.secondPath, preview.markdown, {
      encoding: "utf8",
      flag: "wx",
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
    const targets = await resolveAvailableFilePair(
      sidecarDirectory,
      preview.suggestedFileNames.jsonFileName,
      preview.suggestedFileNames.markdownFileName,
      "A safe Project Planning Documents sidecar filename could not be generated.",
    );
    const targetNameErrors = [
      ...validateProjectPlanningDocumentsArtifactFileName(
        targets.firstFileName,
      ),
      ...validateProjectPlanningDocumentsArtifactFileName(
        targets.secondFileName,
      ),
    ];

    if (targetNameErrors.length > 0) {
      throw new Error(targetNameErrors.join(" "));
    }

    await mkdir(planningProjectRoot, { recursive: true });
    await mkdir(sidecarDirectory, { recursive: true });

    const projectMarkdownPaths: string[] = [];

    for (const document of preview.documents) {
      const documentPath = resolveProjectPlanningDocumentPath(document.fileName);
      await writeFile(documentPath, document.markdown, {
        encoding: "utf8",
      });
      projectMarkdownPaths.push(documentPath);
    }

    const sidecarMarkdown = renderProjectPlanningDocumentsRecordMarkdown(
      preview.record,
    );

    await writeFile(
      targets.firstPath,
      `${JSON.stringify(preview.record, null, 2)}\n`,
      {
        encoding: "utf8",
        flag: "wx",
      },
    );
    await writeFile(targets.secondPath, sidecarMarkdown, {
      encoding: "utf8",
      flag: "wx",
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
    const targets = await resolveAvailableFilePair(
      directory,
      preview.suggestedFileNames.jsonFileName,
      preview.suggestedFileNames.markdownFileName,
      "A safe Phase Intake filename could not be generated.",
    );
    const targetNameErrors = [
      ...validatePhaseIntakeArtifactFileName(targets.firstFileName),
      ...validatePhaseIntakeArtifactFileName(targets.secondFileName),
    ];

    if (targetNameErrors.length > 0) {
      throw new Error(targetNameErrors.join(" "));
    }

    await mkdir(directory, { recursive: true });
    await writeFile(
      targets.firstPath,
      `${JSON.stringify(preview.phaseIntake, null, 2)}\n`,
      {
        encoding: "utf8",
        flag: "wx",
      },
    );
    await writeFile(targets.secondPath, preview.markdown, {
      encoding: "utf8",
      flag: "wx",
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
    const targets = await resolveAvailableFilePair(
      directory,
      preview.suggestedFileNames.jsonFileName,
      preview.suggestedFileNames.markdownFileName,
      "A safe Phase Architect Interview Prompt filename could not be generated.",
    );
    const targetNameErrors = [
      ...validatePhaseArchitectInterviewPromptArtifactFileName(
        targets.firstFileName,
      ),
      ...validatePhaseArchitectInterviewPromptArtifactFileName(
        targets.secondFileName,
      ),
    ];

    if (targetNameErrors.length > 0) {
      throw new Error(targetNameErrors.join(" "));
    }

    await mkdir(directory, { recursive: true });
    await writeFile(
      targets.firstPath,
      `${JSON.stringify(preview.promptRecord, null, 2)}\n`,
      {
        encoding: "utf8",
        flag: "wx",
      },
    );
    await writeFile(targets.secondPath, preview.markdown, {
      encoding: "utf8",
      flag: "wx",
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
    const targets = await resolveAvailableFilePair(
      directory,
      preview.suggestedFileNames.jsonFileName,
      preview.suggestedFileNames.markdownFileName,
      "A safe Repository Reconciliation filename could not be generated.",
    );
    const targetNameErrors = [
      ...validateRepositoryReconciliationArtifactFileName(targets.firstFileName),
      ...validateRepositoryReconciliationArtifactFileName(targets.secondFileName),
    ];

    if (targetNameErrors.length > 0) {
      throw new Error(targetNameErrors.join(" "));
    }

    await mkdir(directory, { recursive: true });
    await writeFile(
      targets.firstPath,
      `${JSON.stringify(preview.reconciliation, null, 2)}\n`,
      {
        encoding: "utf8",
        flag: "wx",
      },
    );
    await writeFile(targets.secondPath, preview.markdown, {
      encoding: "utf8",
      flag: "wx",
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
    const roadmapTargets = await resolveAvailableFilePair(
      directory,
      suggestedFileNames.jsonFileName,
      suggestedFileNames.markdownFileName,
      "A safe Project Roadmap filename could not be generated.",
    );
    const roadmapFileNameErrors = [
      ...validateProjectRoadmapArtifactFileName(roadmapTargets.firstFileName),
      ...validateProjectRoadmapArtifactFileName(roadmapTargets.secondFileName),
    ];

    if (roadmapFileNameErrors.length > 0) {
      throw new Error(roadmapFileNameErrors.join(" "));
    }

    const roadmapValidationErrors = validateProjectRoadmapRecord(roadmap);

    if (roadmapValidationErrors.length > 0) {
      throw new Error(roadmapValidationErrors.join(" "));
    }

    await mkdir(directory, { recursive: true });
    await writeFile(
      roadmapTargets.firstPath,
      `${JSON.stringify(roadmap, null, 2)}\n`,
      {
        encoding: "utf8",
        flag: "wx",
      },
    );
    await writeFile(roadmapTargets.secondPath, markdown, {
      encoding: "utf8",
      flag: "wx",
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
  input: PhaseMapBuilderRequest,
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
  input: PhaseMapBuilderRequest,
): Promise<PhaseMapSaveResult> {
  try {
    const timestamp = new Date().toISOString();
    const context = await readPhaseMapContext(input);
    const phaseMap = buildPhaseMapRecord(context, timestamp);
    const markdown = renderPhaseMapMarkdown(phaseMap);
    const suggestedFileNames = buildPhaseMapFileNames(phaseMap.projectName);
    const directory = resolvePhaseMapDirectory();
    const targets = await resolveAvailableFilePair(
      directory,
      suggestedFileNames.jsonFileName,
      suggestedFileNames.markdownFileName,
      "A safe Phase Map filename could not be generated.",
    );
    const fileNameErrors = [
      ...validatePhaseMapArtifactFileName(targets.firstFileName),
      ...validatePhaseMapArtifactFileName(targets.secondFileName),
    ];

    if (fileNameErrors.length > 0) {
      throw new Error(fileNameErrors.join(" "));
    }

    const validationErrors = validatePhaseMapRecord(phaseMap);

    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join(" "));
    }

    await mkdir(directory, { recursive: true });
    await writeFile(
      targets.firstPath,
      `${JSON.stringify(phaseMap, null, 2)}\n`,
      {
        encoding: "utf8",
        flag: "wx",
      },
    );
    await writeFile(targets.secondPath, markdown, {
      encoding: "utf8",
      flag: "wx",
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
    const phasePlanningTargets = await resolveAvailableFilePair(
      phasePlanningDirectory,
      preview.suggestedPhasePlanningFileNames.jsonFileName,
      preview.suggestedPhasePlanningFileNames.markdownFileName,
      "A safe Phase Planning Documents filename could not be generated.",
    );
    const workCardPlanTargets = await resolveAvailableFilePair(
      workCardPlanDirectory,
      preview.suggestedWorkCardPlanFileNames.jsonFileName,
      preview.suggestedWorkCardPlanFileNames.markdownFileName,
      "A safe Work Card Plan filename could not be generated.",
    );
    const targetNameErrors = [
      ...validatePhasePlanningDocumentsArtifactFileName(
        phasePlanningTargets.firstFileName,
      ),
      ...validatePhasePlanningDocumentsArtifactFileName(
        phasePlanningTargets.secondFileName,
      ),
      ...validateWorkCardPlanArtifactFileName(workCardPlanTargets.firstFileName),
      ...validateWorkCardPlanArtifactFileName(workCardPlanTargets.secondFileName),
    ];

    if (targetNameErrors.length > 0) {
      throw new Error(targetNameErrors.join(" "));
    }

    const workCardPlan = {
      ...preview.workCardPlan,
      sourcePhasePlanningDocumentsJsonFileName:
        phasePlanningTargets.firstFileName,
      sourcePhasePlanningDocumentsMarkdownFileName:
        phasePlanningTargets.secondFileName,
    };
    const workCardPlanMarkdown = renderWorkCardPlanMarkdown(workCardPlan);
    const backlogMarkdown = renderPhaseScopedBacklogMarkdown(workCardPlan);
    const combinedMarkdown = buildCombinedPhasePlanningMarkdown(
      preview.phasePlanningMarkdown,
      workCardPlanMarkdown,
      backlogMarkdown,
    );
    const phaseBacklogPath = resolvePhaseScopedBacklogPath(
      preview.phasePlanningDocuments.phaseFolder,
    );

    await mkdir(phasePlanningDirectory, { recursive: true });
    await mkdir(workCardPlanDirectory, { recursive: true });
    await writeFile(
      phasePlanningTargets.firstPath,
      `${JSON.stringify(preview.phasePlanningDocuments, null, 2)}\n`,
      {
        encoding: "utf8",
        flag: "wx",
      },
    );
    await writeFile(
      phasePlanningTargets.secondPath,
      preview.phasePlanningMarkdown,
      {
        encoding: "utf8",
        flag: "wx",
      },
    );
    await writeFile(
      workCardPlanTargets.firstPath,
      `${JSON.stringify(workCardPlan, null, 2)}\n`,
      {
        encoding: "utf8",
        flag: "wx",
      },
    );
    await writeFile(workCardPlanTargets.secondPath, workCardPlanMarkdown, {
      encoding: "utf8",
      flag: "wx",
    });
    await writeFile(phaseBacklogPath, backlogMarkdown, {
      encoding: "utf8",
    });

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
        const workCard = await readSavedWorkCardFile(phase, fileName);
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
    const markdownPath = resolveInside(directory, savedFileName);

    await failIfExists(
      markdownPath,
      "An Architect prompt artifact for this Work Card already exists.",
    );
    await mkdir(directory, { recursive: true });
    await writeFile(markdownPath, `${prompt}\n`, {
      encoding: "utf8",
      flag: "wx",
    });

    return {
      ok: true,
      prompt,
      workCard,
      sourceFileName: input.fileName,
      markdownPath,
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
    const markdownPath = resolveInside(directory, savedFileName);

    await failIfExists(
      markdownPath,
      "A Risk Review artifact for this Work Card already exists.",
    );
    await mkdir(directory, { recursive: true });
    await writeFile(markdownPath, markdown, {
      encoding: "utf8",
      flag: "wx",
    });

    return {
      ok: true,
      review,
      markdown,
      workCard,
      sourceFileName: input.fileName,
      markdownPath,
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

export async function listBuilderPromptSupportingArtifacts(
  input: BuilderPromptRequest,
): Promise<BuilderPromptArtifactListResult> {
  try {
    const workCard = await readSavedWorkCardFile(input.phase, input.fileName);
    const workCardMarkdownFileName = input.fileName.replace(/\.json$/i, ".md");
    const invalidFiles: BuilderPromptArtifactListResult["invalidFiles"] = [];
    const options: BuilderPromptArtifactOptions = {
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
      priorBuilderReports: await listMarkdownArtifactOptions(
        workCard.phase,
        "Builder_Reports",
        workCard.workCardId,
        undefined,
        invalidFiles,
      ),
    };
    const defaultSelections: BuilderPromptSupportingArtifactFileNames = {
      workCardMarkdown: pickDefaultArtifactFileName(options.workCardMarkdown),
      architectPrompt: pickDefaultArtifactFileName(options.architectPrompts),
      riskReview: pickDefaultArtifactFileName(options.riskReviews),
      priorBuilderReport: pickDefaultArtifactFileName(
        options.priorBuilderReports,
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

export async function previewBuilderPrompt(
  input: BuilderPromptRequest,
): Promise<BuilderPromptPreviewResult> {
  try {
    const workCard = await readSavedWorkCardFile(input.phase, input.fileName);
    const supportingArtifacts = await readBuilderPromptSupportingArtifacts(
      workCard.phase,
      input.supportingArtifactFileNames,
    );
    const prompt = renderBuilderPrompt(workCard, supportingArtifacts);

    return {
      ok: true,
      prompt,
      workCard,
      sourceFileName: input.fileName,
      selectedArtifactFileNames:
        toSelectedSupportingArtifactFileNames(supportingArtifacts),
      hasHighRiskContext: hasBuilderPromptHighRiskContext(
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

export async function saveBuilderPrompt(
  input: BuilderPromptRequest,
): Promise<BuilderPromptSaveResult> {
  try {
    const workCard = await readSavedWorkCardFile(input.phase, input.fileName);
    const supportingArtifacts = await readBuilderPromptSupportingArtifacts(
      workCard.phase,
      input.supportingArtifactFileNames,
    );
    const prompt = renderBuilderPrompt(workCard, supportingArtifacts);
    const directory = resolveBuilderPromptsDirectory(workCard.phase);
    const savedFileName = buildBuilderPromptFileName(workCard);
    const markdownPath = resolveInside(directory, savedFileName);

    await failIfExists(
      markdownPath,
      "An Implementer Prompt artifact for this Work Card already exists.",
    );
    await mkdir(directory, { recursive: true });
    await writeFile(markdownPath, `${prompt}\n`, {
      encoding: "utf8",
      flag: "wx",
    });

    return {
      ok: true,
      prompt,
      workCard,
      sourceFileName: input.fileName,
      selectedArtifactFileNames:
        toSelectedSupportingArtifactFileNames(supportingArtifacts),
      hasHighRiskContext: hasBuilderPromptHighRiskContext(
        workCard,
        supportingArtifacts,
      ),
      hasRiskReviewSelected: Boolean(supportingArtifacts.riskReview),
      markdownPath,
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

export async function previewBuilderReportCapture(
  input: BuilderReportCaptureRequest,
): Promise<BuilderReportCapturePreviewResult> {
  const validation = validateBuilderReport(input.reportText);

  try {
    const workCard = input.workCardFileName
      ? await readSavedWorkCardFile(input.phase, input.workCardFileName)
      : undefined;
    const savedFileName = buildBuilderReportFileName({
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

export async function saveBuilderReportCapture(
  input: BuilderReportCaptureRequest,
): Promise<BuilderReportCaptureSaveResult> {
  try {
    const preview = await previewBuilderReportCapture(input);

    if (!preview.ok || !preview.savedFileName || !preview.validation) {
      return preview;
    }

    if (!preview.validation.validEnoughToSave) {
      throw new Error("Paste or import Implementer Report text before saving.");
    }

    const directory = resolveBuilderReportsDirectory(input.phase);
    const markdownPath = resolveInside(directory, preview.savedFileName);

    await failIfExists(
      markdownPath,
      "An Implementer Report with this generated filename already exists.",
    );
    await mkdir(directory, { recursive: true });
    await writeFile(markdownPath, `${input.reportText.trimEnd()}\n`, {
      encoding: "utf8",
      flag: "wx",
    });

    return {
      ...preview,
      ok: true,
      markdownPath,
    };
  } catch (error) {
    console.error("Failed to save Implementer Report capture.", error);

    return {
      ok: false,
      validation: validateBuilderReport(input.reportText),
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function loadBuilderReportFile(
  input: BuilderReportFileLoadRequest,
): Promise<BuilderReportFileLoadResult> {
  try {
    const value = input.fileName.trim();

    if (value.length === 0) {
      throw new Error("Choose an Implementer Report to import.");
    }

    const builderReport = await readOptionalBuilderReport(input.phase, value);

    if (!builderReport) {
      throw new Error("Choose an Implementer Report to import.");
    }

    return {
      ok: true,
      fileName: builderReport.fileName,
      content: builderReport.content,
    };
  } catch (error) {
    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function listHumanValidationBuilderReports(
  input: HumanValidationBuilderReportListRequest,
): Promise<HumanValidationBuilderReportListResult> {
  try {
    const { target } = await readHumanValidationTargetContext(input);
    const { options, invalidFiles } =
      await listBuilderReportOptionsForValidationTarget(target);

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
        const parsed = JSON.parse(rawJson) as unknown;
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
    const validationTargets = await resolveAvailableFilePair(
      validationDirectory,
      buildValidationReportJsonFileName(preview.record),
      buildValidationReportMarkdownFileName(preview.record),
    );

    await mkdir(validationDirectory, { recursive: true });
    await writeFile(
      validationTargets.firstPath,
      `${JSON.stringify(preview.record, null, 2)}\n`,
      {
        encoding: "utf8",
        flag: "wx",
      },
    );
    await writeFile(validationTargets.secondPath, preview.validationMarkdown, {
      encoding: "utf8",
      flag: "wx",
    });

    let repairPromptPath: string | undefined;
    let savedRepairPromptFileName: string | undefined;
    let repairPrompt = preview.repairPrompt;

    if (preview.shouldGenerateRepairPrompt) {
      const repairDirectory = resolveRepairPromptsDirectory(preview.record.phase);
      const repairTarget = await resolveAvailableMarkdownPath(
        repairDirectory,
        buildRepairPromptFileName(preview.record),
      );

      repairPrompt = renderRepairPrompt(preview.record, {
        validationRecordFileName: validationTargets.firstFileName,
      });

      await mkdir(repairDirectory, { recursive: true });
      await writeFile(repairTarget.filePath, `${repairPrompt}\n`, {
        encoding: "utf8",
        flag: "wx",
      });

      repairPromptPath = repairTarget.filePath;
      savedRepairPromptFileName = repairTarget.fileName;
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
    const targets = await resolveAvailableFilePair(
      directory,
      buildPhaseCloseoutJsonFileName(record),
      buildPhaseCloseoutMarkdownFileName(record),
    );

    await mkdir(directory, { recursive: true });
    await writeFile(
      targets.firstPath,
      `${JSON.stringify(record, null, 2)}\n`,
      {
        encoding: "utf8",
        flag: "wx",
      },
    );
    await writeFile(targets.secondPath, markdown, {
      encoding: "utf8",
      flag: "wx",
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

export function resolveBuilderReportsDirectory(phase: string): string {
  const phaseErrors = validateSafePhaseFolder(phase);

  if (phaseErrors.length > 0) {
    throw new Error(phaseErrors.join(" "));
  }

  return resolveInside(planningPhasesRoot, phase.trim(), "Builder_Reports");
}

export function resolveBuilderPromptsDirectory(phase: string): string {
  const phaseErrors = validateSafePhaseFolder(phase);

  if (phaseErrors.length > 0) {
    throw new Error(phaseErrors.join(" "));
  }

  return resolveInside(planningPhasesRoot, phase.trim(), "Builder_Prompts");
}

export function resolveValidationReportsDirectory(phase: string): string {
  const phaseErrors = validateSafePhaseFolder(phase);

  if (phaseErrors.length > 0) {
    throw new Error(phaseErrors.join(" "));
  }

  return resolveInside(planningPhasesRoot, phase.trim(), "Validation_Reports");
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
  const builderReport = await readOptionalBuilderReport(
    target.phase,
    input.builderReportFileName,
  );
  const matchingBuilderReports = await listBuilderReportOptionsForValidationTarget(
    target,
  );
  const bestMatchingBuilderReport = matchingBuilderReports.options.find(
    (option) => option.isDefaultMatch,
  );

  if (
    builderReport &&
    target.expectedImplementerReportFile &&
    builderReport.fileName !== target.expectedImplementerReportFile
  ) {
    throw new Error(
      `Selected Implementer Report does not match ${target.id}. Choose ${target.expectedImplementerReportFile} or clear the association before saving.`,
    );
  }

  if (
    builderReport &&
    !target.expectedImplementerReportFile &&
    bestMatchingBuilderReport &&
    !fileNameMatchesValidationTarget(builderReport.fileName, target)
  ) {
    throw new Error(
      `Selected Implementer Report does not match ${target.id}. Choose ${bestMatchingBuilderReport.fileName} or clear the association before saving.`,
    );
  }

  const record = buildHumanValidationRecord(
    target,
    {
      ...input,
      phase: target.phase,
      builderReportFileName: builderReport?.fileName,
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
    builderReport,
  );

  return {
    ok: true,
    record,
    validationMarkdown,
    repairPrompt,
    shouldGenerateRepairPrompt: shouldRepair,
    manualValidationChecklist,
    builderReportWarning: builderReport
      ? undefined
      : noBuilderReportSelectedWarning,
    differentProblemGuidance: getDifferentProblemGuidance(record),
    savedValidationJsonFileName: buildValidationReportJsonFileName(record),
    savedValidationMarkdownFileName:
      buildValidationReportMarkdownFileName(record),
    savedRepairPromptFileName: shouldRepair
      ? buildRepairPromptFileName(record)
      : undefined,
  };
}

async function buildCurrentRequiredActionStateFromRepo(): Promise<CurrentRequiredActionState> {
  const warnings: CurrentRequiredActionWarning[] = [];
  const projectRoadmapJsonPath = resolveInside(
    resolveProjectRoadmapDirectory(),
    "PROJECT_ROADMAP_champcity_a_i.json",
  );
  const phaseMapJsonPath = resolveInside(
    resolvePhaseMapDirectory(),
    "PHASE_MAP_champcity_a_i.json",
  );
  const phaseMapRecord = await readJsonRecordIfExists<PhaseMapRecord>(
    phaseMapJsonPath,
    warnings,
    "phase_map_json_invalid",
  );
  const roadmapRecord = await readJsonRecordIfExists<ProjectRoadmapRecord>(
    projectRoadmapJsonPath,
    warnings,
    "project_roadmap_json_invalid",
  );
  const activePhaseId = getActivePhaseId(roadmapRecord, phaseMapRecord);
  const activePhaseTitle = getActivePhaseTitle(
    activePhaseId,
    roadmapRecord,
    phaseMapRecord,
  );
  const activePhase =
    activePhaseId.length > 0
      ? await buildCurrentActionPhaseStateFromRepo(
          activePhaseId,
          activePhaseTitle,
          phaseMapRecord,
          roadmapRecord,
          warnings,
        )
      : undefined;

  const projectApprovalSatisfiedByPhaseActivation =
    artifactReferenceExists(activePhase?.operatorPhaseApproval) ||
    /active|approved|closed/i.test(
      getRecordString(roadmapRecord, "status") +
        " " +
        getRecordString(roadmapRecord, "currentActivePhase"),
    );

  addProjectStateWarnings(roadmapRecord, activePhase, warnings);

  return {
    project: {
      projectName:
        getRecordString(roadmapRecord, "project") ||
        getRecordString(roadmapRecord, "projectName") ||
        "ChampCity A/I",
      projectIntake: await latestArtifactInDirectory(
        resolveProjectIntakeDirectory(),
        "Project Intake",
        "json",
      ),
      projectInterview: await latestArtifactInDirectory(
        resolveProjectArchitectInterviewPromptsDirectory(),
        "Project Interview",
        "json",
      ),
      reconciliationReview: await latestArtifactInDirectory(
        resolveRepositoryReconciliationDirectory(),
        "Reconciliation Review",
        "json",
      ),
      projectRoadmap: await artifactReferenceForPath(
        projectRoadmapJsonPath,
        "Living Roadmap",
        getRecordString(roadmapRecord, "status"),
      ),
      phaseMap: await artifactReferenceForPath(
        phaseMapJsonPath,
        "Phase Map",
        getRecordString(phaseMapRecord, "status"),
      ),
      operatorProjectApproval: await artifactReferenceForPath(
        resolveInside(planningProjectRoot, "OPERATOR_PROJECT_APPROVAL.json"),
        "Operator Project Approval",
      ),
      projectApprovalSatisfiedByPhaseActivation,
      roadmapCurrentExecutableWorkCardId: extractWorkCardId(
        getRecordString(roadmapRecord, "currentExecutableWorkCard"),
      ),
    },
    activePhase,
    warnings,
  };
}

async function buildCurrentActionPhaseStateFromRepo(
  phaseId: string,
  phaseTitle: string,
  phaseMapRecord: PhaseMapRecord | undefined,
  roadmapRecord: ProjectRoadmapRecord | undefined,
  warnings: CurrentRequiredActionWarning[],
): Promise<CurrentActionPhaseState> {
  const phaseDirectory = resolveInside(planningPhasesRoot, phaseId);
  const phaseMapJsonPath = resolveInside(
    resolvePhaseMapDirectory(),
    "PHASE_MAP_champcity_a_i.json",
  );
  const phaseSources = [
    await artifactReferenceForPath(
      resolveInside(phaseDirectory, "Phase_Interview.md"),
      "Phase Interview",
    ),
    await artifactReferenceForPath(
      resolveInside(phaseDirectory, "Phase_Planning.md"),
      "Phase Planning",
    ),
    await artifactReferenceForPath(
      resolveInside(phaseDirectory, "Work_Card_Plan.md"),
      "Work Card Plan",
    ),
    await artifactReferenceForPath(
      phaseMapJsonPath,
      "Phase Map",
      getRecordString(phaseMapRecord, "status"),
    ),
  ];
  const operatorPhaseApproval = await artifactReferenceForPath(
    resolveInside(phaseDirectory, "Operator_Phase_Approval.json"),
    "Operator Phase Approval",
  );
  const candidates = getMappedWorkCardCandidates(
    phaseId,
    phaseMapRecord,
    phaseMapJsonPath,
  );
  const workCards = await readCurrentActionWorkCards(
    phaseId,
    candidates,
    warnings,
  );
  const closeout = await readPhaseCloseoutState(phaseId, warnings);

  addSupersededPhaseWarnings(phaseId, warnings);
  addValidationTargetWarnings(phaseId, warnings);

  return {
    phaseId,
    phaseTitle,
    status: getMappedPhaseStatus(phaseId, phaseMapRecord) ||
      getRecordString(roadmapRecord, "status"),
    sourceArtifacts: phaseSources,
    operatorPhaseApproval,
    workCardCandidates: candidates,
    workCards,
    closeout,
    roadmapUpdatedAfterCloseout: false,
    nextPhaseActivated: false,
  };
}

async function readCurrentActionWorkCards(
  phase: string,
  candidates: CurrentActionWorkCardCandidate[],
  warnings: CurrentRequiredActionWarning[],
): Promise<CurrentActionWorkCardState[]> {
  const directory = resolveWorkCardsDirectory(phase);
  const entries = await readDirectoryFileNames(directory, ".json");
  const candidateIds = new Set(
    candidates.map((candidate) => normalizeCurrentActionId(candidate.workCardId)),
  );
  const result: CurrentActionWorkCardState[] = [];

  for (const fileName of entries) {
    const filePath = resolveInside(directory, fileName);

    try {
      const rawJson = await readFile(filePath, "utf8");
      const parsed = JSON.parse(rawJson) as unknown;
      const fields = coerceWorkCardValidationTargetFields(parsed, phase);

      if (!fields || !candidateIds.has(normalizeCurrentActionId(fields.workCardId))) {
        continue;
      }

      const markdownFileName = fileName.replace(/\.json$/i, ".md");
      const markdownPath = resolveInside(directory, markdownFileName);
      const sourceArtifacts = [
        await artifactReferenceForPath(filePath, "Work Card JSON", fields.status),
        await artifactReferenceForPath(
          markdownPath,
          "Work Card Markdown",
          fields.status,
        ),
      ];
      const implementerReport = await findMatchingMarkdownArtifact(
        resolveBuilderReportsDirectory(phase),
        `BUILDER_REPORT_${fields.workCardId}`,
        "Implementer Report",
      );
      const architectReviewArtifact = await findMatchingMarkdownArtifact(
        resolveInside(planningPhasesRoot, phase, "Architect_Reviews"),
        `ARCHITECT_REVIEW_${fields.workCardId}`,
        "Architect Review",
      );
      const architectReviewStatus = architectReviewArtifact
        ? await readArchitectReviewStatus(
            absoluteFromRepoPath(architectReviewArtifact.path),
          )
        : undefined;
      const validation = await findValidationForWorkCard(phase, fields.workCardId);
      const repair = await findRepairState(phase, fields.workCardId);

      result.push({
        workCardId: fields.workCardId,
        title: fields.title,
        phaseId: fields.phase,
        status: fields.status,
        sourceJsonFile: toRepoRelativePath(filePath),
        sourceMarkdownFile: toRepoRelativePath(markdownPath),
        sourceArtifacts,
        implementerReport,
        architectReview: architectReviewArtifact
          ? {
              status: architectReviewStatus,
              sourceArtifact: {
                ...architectReviewArtifact,
                status: architectReviewStatus ?? architectReviewArtifact.status,
              },
            }
          : undefined,
        validation,
        repair,
      });
    } catch (error) {
      warnings.push({
        code: "work_card_read_warning",
        message: `Current-action evaluation skipped ${toRepoRelativePath(filePath)}: ${toPlainSaveError(error)}`,
        severity: "warning",
        sourceArtifactPath: toRepoRelativePath(filePath),
      });
    }
  }

  return result;
}

async function findValidationForWorkCard(
  phase: string,
  workCardId: string,
): Promise<CurrentActionValidationState | undefined> {
  const directory = resolveValidationReportsDirectory(phase);
  const entries = await readDirectoryFileNames(directory, ".json");
  const matching: Array<{
    validation: CurrentActionValidationState;
    modifiedMs: number;
  }> = [];

  for (const fileName of entries) {
    const filePath = resolveInside(directory, fileName);

    try {
      const rawJson = await readFile(filePath, "utf8");
      const parsed = JSON.parse(rawJson) as unknown;
      const targetId =
        getRecordString(parsed, "workCardId") ||
        getRecordString(parsed, "work_card_id") ||
        getRecordString(parsed, "validationTargetId") ||
        getRecordString(parsed, "validation_target_id");

      if (normalizeCurrentActionId(targetId) !== normalizeCurrentActionId(workCardId)) {
        continue;
      }

      const stats = await stat(filePath);
      const markdownPath = filePath.replace(/\.json$/i, ".md");
      const sourceArtifacts = [
        await artifactReferenceForPath(filePath, "Validation Report JSON"),
        await artifactReferenceForPath(markdownPath, "Validation Report Markdown"),
        ...(await Promise.all(
          getPlanningEvidenceReferences(parsed).map((evidencePath) =>
            artifactReferenceForPath(
              absoluteFromRepoPath(evidencePath),
              "Source Evidence",
            ),
          ),
        )),
      ];
      const architectDisposition = getArchitectDisposition(parsed);
      const legacyOperatorDecision =
        getRecordString(parsed, "operatorDecision") ||
        getRecordString(parsed, "operator_decision") ||
        getRecordString(parsed, "decision");

      matching.push({
        modifiedMs: stats.mtimeMs,
        validation: {
          result:
            getRecordString(parsed, "validationResult") ||
            getRecordString(parsed, "validation_result") ||
            getRecordString(parsed, "status"),
          decision: architectDisposition,
          architectDispositionPending: isArchitectDispositionPending(parsed),
          architectDispositionMissing:
            /_repair\d+$/i.test(normalizeCurrentActionId(workCardId)) &&
            !architectDisposition &&
            !legacyOperatorDecision,
          legacyOperatorDecision,
          repairRequired: getRecordBoolean(parsed, "repair_required"),
          routeBlocked: isRouteBlockedValidationRecord(parsed),
          sourceArtifacts,
        },
      });
    } catch {
      continue;
    }
  }

  matching.sort((left, right) => right.modifiedMs - left.modifiedMs);

  return matching[0]?.validation;
}

function getPlanningEvidenceReferences(record: unknown): string[] {
  const values = [
    getRecordString(record, "evidenceReferences"),
    getRecordString(record, "evidence_references"),
    getRecordString(record, "screenshotOrFileReferences"),
    getRecordString(record, "screenshot_or_file_references"),
  ];
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    for (const line of value.split(/\r?\n/)) {
      const normalized = line
        .trim()
        .replace(/^[-*]\s+/, "")
        .replace(/^`|`$/g, "")
        .replace(/\\/g, "/");
      const segments = normalized.split("/");

      if (
        !normalized.startsWith("planning/") ||
        segments.some(
          (segment) => segment.length === 0 || segment === "." || segment === "..",
        ) ||
        seen.has(normalized)
      ) {
        continue;
      }

      seen.add(normalized);
      result.push(normalized);
    }
  }

  return result;
}

function getArchitectDisposition(record: unknown): string | undefined {
  return (
    getRecordString(record, "architectDisposition") ||
    getRecordString(record, "architect_disposition")
  );
}

function isArchitectDispositionPending(record: unknown): boolean {
  return (
    normalizeCurrentActionStatus(getArchitectDisposition(record)) ===
    normalizeCurrentActionStatus(pendingArchitectDisposition)
  );
}

async function findRepairState(
  phase: string,
  workCardId: string,
): Promise<CurrentActionRepairState | undefined> {
  const repairPrompt = await findMatchingMarkdownArtifact(
    resolveRepairPromptsDirectory(phase),
    `REPAIR_PROMPT_${workCardId}`,
    "Repair Prompt",
  );
  const repairStates = await findRepairWorkCardStates(phase, workCardId);
  const validationReadyRepair = repairStates.find(
    isRepoRepairValidationObligationUnresolved,
  );

  if (validationReadyRepair) {
    return {
      ...validationReadyRepair,
      repairPrompt,
    };
  }

  const fallbackRepair = repairStates[0];

  if (fallbackRepair) {
    return {
      ...fallbackRepair,
      repairPrompt,
    };
  }

  const repairWorkCard = await findRepairWorkCardArtifact(phase, workCardId);

  if (!repairPrompt && !repairWorkCard) {
    return undefined;
  }

  // Compatibility fallback for legacy prompt/Markdown-only repair routes.
  const repairId = `${workCardId}-REPAIR01`;
  const implementerReport = await findMatchingMarkdownArtifact(
    resolveBuilderReportsDirectory(phase),
    `BUILDER_REPORT_${repairId}`,
    "Repair Implementer Report",
  );
  const validation = await findValidationForWorkCard(phase, repairId);

  return {
    repairId,
    repairPrompt,
    repairWorkCard,
    implementerReport,
    validation,
  };
}

async function findRepairWorkCardStates(
  phase: string,
  parentWorkCardId: string,
): Promise<CurrentActionRepairState[]> {
  const directory = resolveWorkCardsDirectory(phase);
  const entries = await readDirectoryFileNames(directory, ".json");
  const parentId = normalizeCurrentActionId(parentWorkCardId);
  const repairPrefix = normalizeCurrentActionId(`${parentWorkCardId}-REPAIR`);
  const repairs: CurrentActionRepairState[] = [];

  for (const fileName of entries) {
    const filePath = resolveInside(directory, fileName);

    try {
      const parsed = JSON.parse(await readFile(filePath, "utf8")) as unknown;
      const fields = coerceWorkCardValidationTargetFields(parsed, phase);

      if (!fields) {
        continue;
      }

      const repairId = normalizeCurrentActionId(fields.workCardId);
      const declaredParentId = normalizeCurrentActionId(
        fields.parentWorkCardId ?? "",
      );

      if (
        !repairId.startsWith(repairPrefix) ||
        (declaredParentId && declaredParentId !== parentId)
      ) {
        continue;
      }

      const markdownPath = filePath.replace(/\.json$/i, ".md");
      const implementerReport = await findMatchingMarkdownArtifact(
        resolveBuilderReportsDirectory(phase),
        `BUILDER_REPORT_${fields.workCardId}`,
        "Repair Implementer Report",
      );
      const architectReviewArtifact = await findMatchingMarkdownArtifact(
        resolveInside(planningPhasesRoot, phase, "Architect_Reviews"),
        `ARCHITECT_REVIEW_${fields.workCardId}`,
        "Repair Architect Review",
      );
      const architectReviewStatus = architectReviewArtifact
        ? await readArchitectReviewStatus(
            absoluteFromRepoPath(architectReviewArtifact.path),
          )
        : undefined;

      repairs.push({
        repairId: fields.workCardId,
        title: fields.title,
        repairWorkCard: await artifactReferenceForPath(
          markdownPath,
          "Repair Work Card",
          fields.status,
        ),
        implementerReport,
        architectReview: architectReviewArtifact
          ? {
              status: architectReviewStatus,
              sourceArtifact: {
                ...architectReviewArtifact,
                status: architectReviewStatus ?? architectReviewArtifact.status,
              },
            }
          : undefined,
        validation: await findValidationForWorkCard(phase, fields.workCardId),
      });
    } catch {
      continue;
    }
  }

  return repairs;
}

async function findRepairWorkCardArtifact(
  phase: string,
  workCardId: string,
): Promise<CurrentActionArtifactReference | undefined> {
  const directory = resolveWorkCardsDirectory(phase);
  const entries = await readDirectoryFileNames(directory, ".md");
  const repairPrefix = normalizeFileStem(`${workCardId}-REPAIR`);
  const match = entries.find((entry) =>
    normalizeFileStem(entry).startsWith(repairPrefix),
  );

  return match
    ? artifactReferenceForPath(
        resolveInside(directory, match),
        "Repair Work Card",
      )
    : undefined;
}

async function readPhaseCloseoutState(
  phase: string,
  warnings: CurrentRequiredActionWarning[],
): Promise<CurrentActionPhaseCloseoutState | undefined> {
  const directory = resolveCloseoutReportsDirectory(phase);
  const entries = await readDirectoryFileNames(directory, ".json");
  const closeouts: Array<{
    closeout: CurrentActionPhaseCloseoutState;
    modifiedMs: number;
  }> = [];

  for (const fileName of entries) {
    const filePath = resolveInside(directory, fileName);

    try {
      const rawJson = await readFile(filePath, "utf8");
      const parsed = JSON.parse(rawJson) as unknown;
      const stats = await stat(filePath);
      const decision = getRecordString(parsed, "decision");
      const nextPhaseActivationDecision = getRecordString(
        parsed,
        "nextPhaseActivationDecision",
      );

      closeouts.push({
        modifiedMs: stats.mtimeMs,
        closeout: {
          sourceArtifact: await artifactReferenceForPath(
            filePath,
            "Phase Closeout",
            decision,
          ),
          decision,
          nextPhaseActivationDecision,
          operatorApproved: /close phase|ready|activate|approve/i.test(
            `${decision} ${nextPhaseActivationDecision}`,
          ),
        },
      });
    } catch (error) {
      warnings.push({
        code: "phase_closeout_read_warning",
        message: `Current-action evaluation skipped ${toRepoRelativePath(filePath)}: ${toPlainSaveError(error)}`,
        severity: "warning",
        sourceArtifactPath: toRepoRelativePath(filePath),
      });
    }
  }

  closeouts.sort((left, right) => right.modifiedMs - left.modifiedMs);

  return closeouts[0]?.closeout;
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

async function latestArtifactInDirectory(
  directory: string,
  role: string,
  extension: "json" | "md",
): Promise<CurrentActionArtifactReference | undefined> {
  const entries = await readDirectoryFileNames(directory, `.${extension}`);
  const artifacts: Array<{ fileName: string; modifiedMs: number }> = [];

  for (const fileName of entries) {
    const filePath = resolveInside(directory, fileName);
    const stats = await stat(filePath);
    artifacts.push({ fileName, modifiedMs: stats.mtimeMs });
  }

  artifacts.sort((left, right) => right.modifiedMs - left.modifiedMs);

  return artifacts[0]
    ? artifactReferenceForPath(resolveInside(directory, artifacts[0].fileName), role)
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

function artifactReferenceExists(
  artifactRef: CurrentActionArtifactReference | undefined,
): boolean {
  return artifactRef?.exists !== false && !!artifactRef?.path;
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

async function readArchitectReviewStatus(
  filePath: string,
): Promise<string | undefined> {
  try {
    const content = await readFile(filePath, "utf8");
    const standardReview = validateArchitectReview(content);

    if (standardReview.usesStandardShape) {
      if (!standardReview.valid) {
        return `Architect review incomplete - ${standardReview.errors.join(" ")}`;
      }

      return standardReview.decision;
    }

    const explicitStatus = content
      .split(/\r?\n/)
      .find((candidate) => /^Status\s*:/i.test(candidate.trim()))
      ?.replace(/^Status\s*:\s*/i, "")
      .trim();

    if (explicitStatus) {
      return explicitStatus;
    }

    const repairRequired = content.match(
      /^Repair(?: is)? required before Operator(?: visual)? validation\.?$/im,
    );

    if (repairRequired) {
      return repairRequired[0].replace(/\.$/, "");
    }

    const ready = content.match(
      /^Ready for Operator(?: visual)? validation\.?$/im,
    );

    return ready?.[0].replace(/\.$/, "");
  } catch {
    return undefined;
  }
}

async function readJsonRecordIfExists<T>(
  filePath: string,
  warnings: CurrentRequiredActionWarning[],
  warningCode: string,
): Promise<T | undefined> {
  if (!(await pathExists(filePath))) {
    return undefined;
  }

  try {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
  } catch (error) {
    warnings.push({
      code: warningCode,
      message: `${toRepoRelativePath(filePath)} could not be parsed: ${toPlainSaveError(error)}`,
      severity: "warning",
      sourceArtifactPath: toRepoRelativePath(filePath),
    });

    return undefined;
  }
}

function getMappedWorkCardCandidates(
  phaseId: string,
  phaseMapRecord: PhaseMapRecord | undefined,
  phaseMapJsonPath: string,
): CurrentActionWorkCardCandidate[] {
  const phase = phaseMapRecord?.mappedPhases?.find(
    (candidate) => candidate.phaseId === phaseId,
  );

  return (phase?.plannedWorkCards ?? [])
    .map((item, index) => ({
      workCardId: item.workCardIdProposal,
      title: item.title,
      order: item.suggestedOrdering || index + 1,
      status: item.reconciliationStatus || item.planStatus,
      sourceArtifact: {
        path: toRepoRelativePath(phaseMapJsonPath),
        role: "Mapped Work Card candidate",
        status: item.reconciliationStatus || item.planStatus,
        exists: true,
      },
    }))
    .filter((item) => item.workCardId.trim().length > 0);
}

function getActivePhaseId(
  roadmapRecord: ProjectRoadmapRecord | undefined,
  phaseMapRecord: PhaseMapRecord | undefined,
): string {
  return (
    getRecordString(roadmapRecord, "currentActivePhase") ||
    getRecordString(roadmapRecord, "currentFirstIncompletePhase") ||
    getRecordString(phaseMapRecord, "currentOrNextPhase")
  );
}

function getActivePhaseTitle(
  phaseId: string,
  roadmapRecord: ProjectRoadmapRecord | undefined,
  phaseMapRecord: PhaseMapRecord | undefined,
): string {
  const mappedPhase = phaseMapRecord?.mappedPhases?.find(
    (phase) => phase.phaseId === phaseId,
  );
  const roadmapPhase = getRecordArray(roadmapRecord, "phases").find(
    (phase) => getRecordString(phase, "id") === phaseId,
  );

  return (
    mappedPhase?.phaseTitle ||
    getRecordString(roadmapPhase, "title") ||
    getRecordString(phaseMapRecord, "nextPhaseTitle") ||
    phaseId
  );
}

function getMappedPhaseStatus(
  phaseId: string,
  phaseMapRecord: PhaseMapRecord | undefined,
): string | undefined {
  return phaseMapRecord?.mappedPhases?.find((phase) => phase.phaseId === phaseId)
    ?.status;
}

function addProjectStateWarnings(
  roadmapRecord: ProjectRoadmapRecord | undefined,
  activePhase: CurrentActionPhaseState | undefined,
  warnings: CurrentRequiredActionWarning[],
): void {
  const roadmapCurrentWorkCardId = extractWorkCardId(
    getRecordString(roadmapRecord, "currentExecutableWorkCard"),
  );

  if (!roadmapCurrentWorkCardId || !activePhase) {
    return;
  }

  const nextUnresolved = findNextUnresolvedWorkCardId(activePhase);

  if (
    nextUnresolved &&
    normalizeCurrentActionId(nextUnresolved) !==
      normalizeCurrentActionId(roadmapCurrentWorkCardId)
  ) {
    warnings.push({
      code: "stale_current_executable_work_card",
      message: `Roadmap still names ${roadmapCurrentWorkCardId} as current, but durable Work Card evidence routes to ${nextUnresolved}.`,
      severity: "warning",
      sourceArtifactPath:
        "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.json",
    });
  }
}

function findNextUnresolvedWorkCardId(
  phase: CurrentActionPhaseState,
): string | undefined {
  const workCardsById = new Map(
    phase.workCards.map((workCard) => [
      normalizeCurrentActionId(workCard.workCardId),
      workCard,
    ]),
  );

  for (const candidate of phase.workCardCandidates) {
    const workCard = workCardsById.get(normalizeCurrentActionId(candidate.workCardId));

    if (!workCard) {
      return candidate.workCardId;
    }

    if (!isRepoWorkCardResolved(candidate.status, workCard)) {
      return workCard.workCardId;
    }
  }

  return undefined;
}

function isRepoWorkCardResolved(
  candidateStatus: string | undefined,
  workCard: CurrentActionWorkCardState,
): boolean {
  if (isRepoRepairValidationObligationUnresolved(workCard.repair)) {
    return false;
  }

  if (
    isRepoPassingValidation(workCard.validation) ||
    isRepoPassingValidation(workCard.repair?.validation)
  ) {
    return true;
  }

  if (workCard.validation || workCard.repair) {
    return false;
  }

  const status = normalizeCurrentActionStatus(candidateStatus || workCard.status);

  if (
    [
      "already_satisfied",
      "cancelled",
      "carried_forward",
      "closed",
      "complete",
      "completed",
      "completed_via_repair",
      "deferred",
      "superseded",
      "validated",
    ].includes(status)
  ) {
    return true;
  }

  return false;
}

function isRepoRepairValidationObligationUnresolved(
  repair: CurrentActionRepairState | undefined,
): boolean {
  if (
    !repair ||
    !artifactReferenceExists(repair.repairWorkCard) ||
    !artifactReferenceExists(repair.implementerReport)
  ) {
    return false;
  }

  const reviewStatus = normalizeCurrentActionStatus(
    repair.architectReview?.status,
  );

  if (!/ready_for_operator_(?:visual_)?validation/.test(reviewStatus)) {
    return false;
  }

  return !isRepoPassingValidation(repair.validation);
}

function isRepoPassingValidation(
  validation: CurrentActionValidationState | undefined,
): boolean {
  if (!validation?.result && !validation?.decision) {
    return false;
  }

  const result = normalizeCurrentActionStatus(validation.result);
  const decision = normalizeCurrentActionStatus(validation.decision);

  if (validation.repairRequired) {
    return false;
  }

  if (validation.architectDispositionPending) {
    return false;
  }

  if (validation.architectDispositionMissing) {
    return false;
  }

  if (decision.length > 0) {
    return [
      "passed_proceed",
      "passed",
      "mergeable",
      "ready_to_merge",
      "no_action_required",
      "pass_with_observation",
      "pass_with_observations",
      "carry_forward_observation",
      "future_scope_product_backlog",
    ].includes(decision);
  }

  return ["pass", "passed", "pass_with_concerns"].includes(result);
}

function addSupersededPhaseWarnings(
  phase: string,
  warnings: CurrentRequiredActionWarning[],
): void {
  const knownSupersededPaths = [
    `planning/phases/${phase}/Operator_Phase_Approval_PENDING.md`,
    `planning/phases/${phase}/WORK_CARD_BACKLOG.md`,
    `planning/phases/${phase}/Phase_Planning_Documents/PHASE_PLANNING_DOCUMENTS_repository_reconciliation_and_phase_planning_documents.md`,
    `planning/phases/${phase}/Phase_Planning_Documents/PHASE_PLANNING_DOCUMENTS_repository_reconciliation_and_phase_planning_documents.json`,
    `planning/phases/${phase}/Work_Card_Plans/WORK_CARD_PLAN_repository_reconciliation_and_phase_planning_documents.md`,
    `planning/phases/${phase}/Work_Card_Plans/WORK_CARD_PLAN_repository_reconciliation_and_phase_planning_documents.json`,
  ];

  for (const repoPath of knownSupersededPaths) {
    const absolutePath = absoluteFromRepoPath(repoPath);

    if (!pathExistsSync(absolutePath)) {
      continue;
    }

    warnings.push({
      code: "superseded_phase_artifact",
      message: `${repoPath} is superseded historical context and must not be treated as active Phase 03 authority.`,
      severity: "info",
      sourceArtifactPath: repoPath,
    });
  }
}

function addValidationTargetWarnings(
  phase: string,
  warnings: CurrentRequiredActionWarning[],
): void {
  const validationReportDirectory = resolveValidationReportsDirectory(phase);
  const validationReports = readDirectoryFileNamesSync(
    validationReportDirectory,
    [".json", ".md"],
  );

  for (const fileName of validationReports) {
    const filePath = resolveInside(validationReportDirectory, fileName);
    let content = "";

    try {
      content = readFileSyncUtf8(filePath);
    } catch {
      continue;
    }

    for (const reference of extractValidationTargetReferences(content, phase)) {
      const absoluteReferencePath = absoluteFromRepoPath(reference);

      if (pathExistsSync(absoluteReferencePath)) {
        continue;
      }

      warnings.push({
        code: "missing_stale_validation_target",
        message: `${reference} is referenced by validation evidence but is missing; current-action routing treats it as stale context, not current authority.`,
        severity: "warning",
        sourceArtifactPath: toRepoRelativePath(filePath),
      });
    }
  }
}

function extractValidationTargetReferences(
  content: string,
  phase: string,
): string[] {
  const references = new Set<string>();
  const fullPathPattern =
    /planning\/phases\/[A-Za-z0-9_-]+\/Validation_Targets\/[A-Za-z0-9_-]+\.json/g;
  const shortPathPattern =
    /Validation_Targets\/[A-Za-z0-9_-]+\.json/g;

  for (const match of content.matchAll(fullPathPattern)) {
    references.add(match[0]);
  }

  for (const match of content.matchAll(shortPathPattern)) {
    references.add(`planning/phases/${phase}/${match[0]}`);
  }

  return [...references];
}

function coerceWorkCardValidationTargetFields(
  candidate: unknown,
  selectedPhase: string,
): WorkCardValidationTargetFields | undefined {
  if (!isCurrentActionRecord(candidate)) {
    return undefined;
  }

  const workCardId =
    getRecordString(candidate, "workCardId") ||
    getRecordString(candidate, "work_card_id") ||
    getRecordString(candidate, "id");
  const title = getRecordString(candidate, "title");
  const phase =
    getRecordString(candidate, "phase") ||
    getRecordString(candidate, "phase_id") ||
    getRecordString(candidate, "phaseId");
  const status = getRecordString(candidate, "status") || "ready_for_implementer";
  const riskLevel =
    getRecordString(candidate, "riskLevel") ||
    getRecordString(candidate, "risk_level") ||
    undefined;
  const parentWorkCardId =
    getRecordString(candidate, "parentWorkCardId") ||
    getRecordString(candidate, "parent_work_card_id") ||
    undefined;

  if (!workCardId || !title || !phase) {
    return undefined;
  }

  if (phase !== selectedPhase.trim()) {
    return undefined;
  }

  return {
    workCardId,
    title,
    phase,
    status,
    riskLevel,
    parentWorkCardId,
  };
}

function isRouteBlockedValidationRecord(candidate: unknown): boolean {
  const result = normalizeCurrentActionStatus(
    getRecordString(candidate, "validationResult") ||
      getRecordString(candidate, "validation_result") ||
      getRecordString(candidate, "status"),
  );

  if (!["fail", "failed", "blocked", "partial", "not_tested"].includes(result)) {
    return false;
  }

  const detail = [
    getRecordString(candidate, "failedItems"),
    getRecordString(candidate, "failed_items"),
    getRecordString(candidate, "observedErrors"),
    getRecordString(candidate, "observed_errors"),
    getRecordString(candidate, "additionalOperatorObservations"),
    getRecordString(candidate, "additional_operator_observations"),
  ]
    .filter(Boolean)
    .join("\n");

  return (
    /\bvalidation\b.{0,100}\b(?:cannot|could not|can't)\b.{0,100}\b(?:reach|open|access)/is.test(
      detail,
    ) ||
    /\bad[\s-]*hoc work card capture\b.{0,160}\b(?:instead of|rather than)\b.{0,100}\bvalidation\b/is.test(
      detail,
    )
  );
}

function getRecordString(candidate: unknown, key: string): string {
  if (!isCurrentActionRecord(candidate)) {
    return "";
  }

  const value = candidate[key];

  return typeof value === "string" ? value.trim() : "";
}

function getRecordBoolean(candidate: unknown, key: string): boolean | undefined {
  if (!isCurrentActionRecord(candidate)) {
    return undefined;
  }

  const value = candidate[key];

  return typeof value === "boolean" ? value : undefined;
}

function getRecordArray(candidate: unknown, key: string): unknown[] {
  if (!isCurrentActionRecord(candidate)) {
    return [];
  }

  const value = candidate[key];

  return Array.isArray(value) ? value : [];
}

function extractWorkCardId(value: string): string | undefined {
  return /\b(WC\d+(?:-[A-Za-z0-9]+)?)/.exec(value)?.[1];
}

function normalizeCurrentActionId(value: string | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeCurrentActionStatus(value: string | undefined): string {
  return normalizeCurrentActionId(value);
}

function normalizeFileStem(value: string): string {
  return path
    .basename(value, path.extname(value))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
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

function pathExistsSync(filePath: string): boolean {
  try {
    statSync(filePath);
    return true;
  } catch {
    return false;
  }
}

function readDirectoryFileNamesSync(
  directory: string,
  extensions: string[],
): string[] {
  try {
    return readdirSync(directory)
      .filter((entry) =>
        extensions.some((extension) => entry.toLowerCase().endsWith(extension)),
      )
      .sort((left, right) => left.localeCompare(right));
  } catch {
    return [];
  }
}

function readFileSyncUtf8(filePath: string): string {
  return readFileSync(filePath, "utf8");
}

function isCurrentActionRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
  const parsed = JSON.parse(rawJson) as unknown;
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
  const parsed = JSON.parse(rawJson) as unknown;

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
  const parsed = JSON.parse(rawJson) as unknown;
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
  const parsed = JSON.parse(rawJson) as unknown;
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
  const parsed = JSON.parse(rawJson) as unknown;
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
  const parsed = JSON.parse(rawJson) as unknown;
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
  const parsed = JSON.parse(rawJson) as unknown;
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
  const parsed = JSON.parse(rawJson) as unknown;
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
  const parsed = JSON.parse(rawJson) as unknown;
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
  input: PhaseMapBuilderRequest,
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
      "Run Phase Map Builder first, then select a mapped phase for planning.",
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
  const readinessTargets = await resolveAvailableFilePair(
    readinessDirectory,
    readinessFileNames.jsonFileName,
    readinessFileNames.markdownFileName,
    "A safe Phase Readiness Review filename could not be generated.",
  );
  const readinessNameErrors = [
    ...validatePhaseReadinessReviewArtifactFileName(
      readinessTargets.firstFileName,
    ),
    ...validatePhaseReadinessReviewArtifactFileName(
      readinessTargets.secondFileName,
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
  const workCardPlanTargets = await resolveAvailableFilePair(
    workCardPlanDirectory,
    workCardPlanFileNames.jsonFileName,
    workCardPlanFileNames.markdownFileName,
    "A safe Work Card Plan filename could not be generated.",
  );
  const workCardPlanNameErrors = [
    ...validateWorkCardPlanArtifactFileName(workCardPlanTargets.firstFileName),
    ...validateWorkCardPlanArtifactFileName(workCardPlanTargets.secondFileName),
  ];

  if (workCardPlanNameErrors.length > 0) {
    throw new Error(workCardPlanNameErrors.join(" "));
  }

  await mkdir(readinessDirectory, { recursive: true });
  await mkdir(workCardPlanDirectory, { recursive: true });
  await writeFile(
    readinessTargets.firstPath,
    `${JSON.stringify(readinessReview, null, 2)}\n`,
    {
      encoding: "utf8",
      flag: "wx",
    },
  );
  await writeFile(readinessTargets.secondPath, readinessMarkdown, {
    encoding: "utf8",
    flag: "wx",
  });
  await writeFile(
    workCardPlanTargets.firstPath,
    `${JSON.stringify(workCardPlan, null, 2)}\n`,
    {
      encoding: "utf8",
      flag: "wx",
    },
  );
  await writeFile(workCardPlanTargets.secondPath, workCardPlanMarkdown, {
    encoding: "utf8",
    flag: "wx",
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
  const targets = await resolveAvailableFilePair(
    directory,
    fileNames.jsonFileName,
    fileNames.markdownFileName,
    "A safe compatibility Phase Intake filename could not be generated.",
  );
  const targetNameErrors = [
    ...validatePhaseIntakeArtifactFileName(targets.firstFileName),
    ...validatePhaseIntakeArtifactFileName(targets.secondFileName),
  ];
  const validation = validatePhaseIntake(phaseIntake);

  if (targetNameErrors.length > 0) {
    throw new Error(targetNameErrors.join(" "));
  }

  if (!validation.valid) {
    throw new Error(validation.errors.join(" "));
  }

  await mkdir(directory, { recursive: true });
  await writeFile(
    targets.firstPath,
    `${JSON.stringify(phaseIntake, null, 2)}\n`,
    {
      encoding: "utf8",
      flag: "wx",
    },
  );
  await writeFile(targets.secondPath, markdown, {
    encoding: "utf8",
    flag: "wx",
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
      builderReportFileNames: await readPlanningFolderFileNames(
        resolveBuilderReportsDirectory(phase),
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
        `${context.summary.builderReportCount} Builder Report(s)`,
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
    `Builder_Reports compatibility reports: ${summary.builderReportCount}`,
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
  const parsed = JSON.parse(rawJson) as unknown;
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
  const parsed = JSON.parse(rawJson) as unknown;
  const validation = validateWorkCard(parsed);

  if (validation.valid) {
    return buildWorkCardValidationTarget(parsed as WorkCard, fileName);
  }

  const compatibleWorkCard = coerceWorkCardValidationTargetFields(
    parsed,
    phase,
  );

  if (!compatibleWorkCard) {
    throw new Error(
      `Saved Work Card JSON is not valid: ${validation.errors.join(" ")}`,
    );
  }

  return buildValidationTargetFromWorkCardFields(
    compatibleWorkCard,
    fileName,
  );
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
  const parsed = JSON.parse(rawJson) as unknown;
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

async function readOptionalBuilderReport(
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

  const directory = resolveBuilderReportsDirectory(phase);
  const filePath = resolveInside(directory, value);

  return {
    fileName: value,
    content: await readFile(filePath, "utf8"),
  };
}

async function resolveManualValidationChecklist(
  target: ValidationTargetSummary,
  builderReport: { fileName: string; content: string } | undefined,
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

  if (!builderReport) {
    return {
      detected: false,
      text: noManualValidationChecklistDetectedMessage,
      isFallback: true,
    };
  }

  return {
    ...extractManualValidationChecklist(builderReport.content),
    sourceLabel: "Implementer Report",
    sourceFileName: builderReport.fileName,
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

async function listBuilderReportOptionsForWorkCard(
  workCard: WorkCard,
): Promise<{
  options: Array<HumanValidationBuilderReportOption & { modifiedMs: number }>;
  invalidFiles: InvalidHumanValidationBuilderReportFile[];
}> {
  return listBuilderReportOptionsForValidationTarget(
    buildWorkCardValidationTarget(
      workCard,
      `${buildWorkCardFileStem(workCard.workCardId, workCard.title)}.json`,
    ),
  );
}

async function listBuilderReportOptionsForValidationTarget(
  target: ValidationTargetRecord,
): Promise<{
  options: Array<HumanValidationBuilderReportOption & { modifiedMs: number }>;
  invalidFiles: InvalidHumanValidationBuilderReportFile[];
}> {
  const directory = resolveBuilderReportsDirectory(target.phase);
  let entries: string[] = [];

  try {
    entries = await readdir(directory);
  } catch (error) {
    if (!isNodeErrorWithCode(error, "ENOENT")) {
      throw error;
    }
  }

  const options: Array<HumanValidationBuilderReportOption & { modifiedMs: number }> =
    [];
  const invalidFiles: InvalidHumanValidationBuilderReportFile[] = [];

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
  invalidFiles: NonNullable<BuilderPromptArtifactListResult["invalidFiles"]>,
): Promise<BuilderPromptArtifactOption[]> {
  const directory = resolveSupportingArtifactDirectory(phase, folder);
  let entries: string[] = [];

  try {
    entries = await readdir(directory);
  } catch (error) {
    if (!isNodeErrorWithCode(error, "ENOENT")) {
      throw error;
    }
  }

  const options: BuilderPromptArtifactOption[] = [];

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

async function readBuilderPromptSupportingArtifacts(
  phase: string,
  fileNames: BuilderPromptSupportingArtifactFileNames | undefined,
): Promise<BuilderPromptSupportingArtifacts> {
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
    priorBuilderReport: await readOptionalMarkdownArtifact(
      phase,
      "Builder_Reports",
      selected.priorBuilderReport,
    ),
  };
}

async function readOptionalMarkdownArtifact(
  phase: string,
  folder: SupportingArtifactFolder,
  fileName: string | undefined,
): Promise<BuilderPromptSupportingArtifact | undefined> {
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

  return resolveBuilderReportsDirectory(phase);
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

  if (folder === "Builder_Prompts") {
    return resolveBuilderPromptsDirectory(phase);
  }

  if (folder === "Builder_Reports") {
    return resolveBuilderReportsDirectory(phase);
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
  options: BuilderPromptArtifactOption[],
): string | undefined {
  return options.find((option) => option.isDefaultMatch)?.fileName;
}

function buildMissingArtifactNotes(
  defaultSelections: BuilderPromptSupportingArtifactFileNames,
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

  if (!defaultSelections.priorBuilderReport) {
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
    candidate.phase ?? candidate.phase_id,
    "Phase",
  );

  if (recordPhase !== phase.trim()) {
    throw new Error("Validation Report phase must match the selected phase folder.");
  }

  const validationResult = normalizeHumanValidationResult(
    candidate.validationResult ?? candidate.status,
  );
  const architectDisposition = normalizeOptionalText(
    candidate.architectDisposition ?? candidate.architect_disposition,
  );
  const legacyOperatorDecisionValue =
    candidate.operatorDecision ?? candidate.operator_decision ?? candidate.decision;
  const operatorDecision =
    legacyOperatorDecisionValue === undefined
      ? undefined
      : normalizeHumanValidationOperatorDecision(legacyOperatorDecisionValue);

  if (!isHumanValidationResult(validationResult)) {
    throw new Error("Validation result is not a supported value.");
  }

  if (
    operatorDecision !== undefined &&
    !isHumanValidationOperatorDecision(operatorDecision)
  ) {
    throw new Error("Legacy Operator decision is not a supported advisory value.");
  }

  const validationTargetKindValue =
    candidate.validationTargetKind ?? candidate.validation_target_kind;
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
    workCardId: normalizeOptionalText(
      candidate.workCardId ?? candidate.work_card_id,
    ),
    workCardTitle: normalizeOptionalText(
      candidate.workCardTitle ?? candidate.work_card_title,
    ),
    validationTargetId: normalizeOptionalText(
      candidate.validationTargetId ?? candidate.validation_target_id,
    ),
    validationTargetKind,
    validationTargetTitle: normalizeOptionalText(
      candidate.validationTargetTitle ?? candidate.validation_target_title,
    ),
    validationTargetSourceJsonFile: normalizeOptionalText(
      candidate.validationTargetSourceJsonFile ??
        candidate.validation_target_source_json_file,
    ),
    createdAt: normalizeOptionalText(
      candidate.createdAt ?? candidate.validation_date,
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
  supportingArtifacts: BuilderPromptSupportingArtifacts,
): BuilderPromptSupportingArtifactFileNames {
  return {
    workCardMarkdown: supportingArtifacts.workCardMarkdown?.fileName,
    architectPrompt: supportingArtifacts.architectPrompt?.fileName,
    riskReview: supportingArtifacts.riskReview?.fileName,
    priorBuilderReport: supportingArtifacts.priorBuilderReport?.fileName,
  };
}

function hasBuilderPromptHighRiskContext(
  workCard: WorkCard,
  supportingArtifacts: BuilderPromptSupportingArtifacts,
): boolean {
  return (
    workCard.riskLevel === "high" ||
    hasHighRiskReviewContext(supportingArtifacts.riskReview?.content ?? "")
  );
}

function toSavedWorkCardSummary(
  fileName: string,
  workCard: WorkCard,
): SavedWorkCardSummary {
  return {
    fileName,
    workCardId: workCard.workCardId,
    title: workCard.title,
    status: workCard.status,
    phase: workCard.phase,
    riskLevel: workCard.riskLevel,
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

async function failIfExists(
  filePath: string,
  message: string,
): Promise<void> {
  try {
    await access(filePath);
  } catch (error) {
    if (isNodeErrorWithCode(error, "ENOENT")) {
      return;
    }

    throw error;
  }

  throw new Error(message);
}

async function resolveAvailableFilePair(
  directory: string,
  firstFileName: string,
  secondFileName: string,
  failureMessage = "A safe paired artifact filename could not be generated.",
): Promise<{
  firstPath: string;
  secondPath: string;
  firstFileName: string;
  secondFileName: string;
}> {
  for (let suffix = 1; suffix <= 99; suffix += 1) {
    const nextFirstFileName = appendFileNameSuffix(firstFileName, suffix);
    const nextSecondFileName = appendFileNameSuffix(secondFileName, suffix);
    const firstPath = resolveInside(directory, nextFirstFileName);
    const secondPath = resolveInside(directory, nextSecondFileName);

    if (!(await pathExists(firstPath)) && !(await pathExists(secondPath))) {
      return {
        firstPath,
        secondPath,
        firstFileName: nextFirstFileName,
        secondFileName: nextSecondFileName,
      };
    }
  }

  throw new Error(failureMessage);
}

async function resolveAvailableMarkdownPath(
  directory: string,
  fileName: string,
): Promise<{ filePath: string; fileName: string }> {
  return resolveAvailableFilePath(
    directory,
    fileName,
    "A safe repair prompt filename could not be generated.",
  );
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
