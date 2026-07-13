import { contextBridge, ipcRenderer } from "electron";

import type {
  NextWorkCardIdResult,
  WorkCardDraftInput,
  WorkCardPreviewResult,
  WorkCardSaveResult,
} from "../shared/workCards/workCardDraft";
import type {
  ProjectIntakeInput,
  ProjectIntakePreviewResult,
  ProjectIntakeSaveResult,
} from "../shared/workCards/projectIntake";
import type {
  ListSavedProjectIntakesResult,
  ProjectArchitectInterviewPromptPreviewResult,
  ProjectArchitectInterviewPromptRequest,
  ProjectArchitectInterviewPromptSaveResult,
} from "../shared/workCards/projectArchitectInterviewPrompt";
import type {
  ListSavedProjectArchitectInterviewPromptsResult,
  ListSavedProjectPlanningDocumentsResult,
  ProjectPlanningDocumentsPreviewResult,
  ProjectPlanningDocumentsRequest,
  ProjectPlanningDocumentsSaveResult,
} from "../shared/workCards/projectPlanningDocuments";
import type {
  PhaseIntakeInput,
  PhaseIntakePreviewResult,
  PhaseIntakeSaveResult,
} from "../shared/workCards/phaseIntake";
import type {
  ListSavedPhaseArchitectInterviewPromptsResult,
  ListSavedPhaseIntakesResult,
  PhaseArchitectInterviewPromptPreviewResult,
  PhaseArchitectInterviewPromptRequest,
  PhaseArchitectInterviewPromptSaveResult,
} from "../shared/workCards/phaseArchitectInterviewPrompt";
import type {
  ListSavedRepositoryReconciliationsResult,
  RepositoryReconciliationPreviewResult,
  RepositoryReconciliationPromptPreviewResult,
  RepositoryReconciliationPromptRequest,
  RepositoryReconciliationRequest,
  RepositoryReconciliationSaveResult,
} from "../shared/workCards/repositoryReconciliation";
import type {
  PhasePlanningDocumentsPreviewResult,
  PhasePlanningDocumentsRequest,
  PhasePlanningDocumentsSaveResult,
} from "../shared/workCards/phasePlanningDocuments";
import type { ListSavedWorkCardPlansResult } from "../shared/workCards/workCardPlan";
import type {
  ListSavedProjectRoadmapsResult,
  ProjectRoadmapPreviewResult,
  ProjectRoadmapRequest,
  ProjectRoadmapSaveResult,
} from "../shared/workCards/projectRoadmap";
import type {
  ListSavedPhaseMapsResult,
  PhaseMapBuilderRequest,
  PhaseMapPreviewResult,
  PhaseMapSaveResult,
} from "../shared/workCards/phaseMap";
import type {
  ArchitectPromptPreviewResult,
  ArchitectPromptRequest,
  ArchitectPromptSaveResult,
  ListSavedWorkCardsResult,
} from "../shared/workCards/renderArchitectFramingPrompt";
import type {
  BuilderPromptArtifactListResult,
  BuilderPromptPreviewResult,
  BuilderPromptRequest,
  BuilderPromptSaveResult,
} from "../shared/workCards/renderBuilderPrompt";
import type {
  BuilderReportCapturePreviewResult,
  BuilderReportCaptureRequest,
  BuilderReportCaptureSaveResult,
} from "../shared/workCards/validateBuilderReport";
import type {
  RiskReviewPreviewResult,
  RiskReviewRequest,
  RiskReviewSaveResult,
} from "../shared/workCards/renderRiskReviewMarkdown";
import type {
  AvailablePhaseFoldersResult,
  BuilderReportFileLoadRequest,
  BuilderReportFileLoadResult,
  HumanValidationBuilderReportListRequest,
  HumanValidationBuilderReportListResult,
  HumanValidationFormInput,
  HumanValidationPreviewResult,
  HumanValidationSaveResult,
  HumanValidationStatusListResult,
  ValidationEvidenceFileImportRequest,
  ValidationEvidenceFileImportResult,
} from "../shared/workCards/validationRecord";
import type { ListValidationTargetsResult } from "../shared/workCards/validationTarget";
import type {
  PhaseCloseoutFormInput,
  PhaseCloseoutPreviewResult,
  PhaseCloseoutSaveResult,
  PhaseCloseoutSummaryResult,
} from "../shared/workCards/phaseCloseoutRecord";
import type { CurrentRequiredActionResult } from "../shared/workCards/currentRequiredAction";
import type {
  PlanningArtifactPreviewRequest,
  PlanningArtifactPreviewResult,
} from "../shared/workCards/artifactReviewWorkspace";

const api = {
  getAppInfo: () => ({
    name: "ChampCity A/I",
    stage: "Alpha app development",
    coreLoop: [
      "Project Intake",
      "Project Architect Interview",
      "Project Plan",
      "Reconcile / Project State Review",
      "Phase Map Builder",
      "Phase Planning Documents Generator",
      "Work Card Plan Review",
      "Ad Hoc Work Card Capture",
      "Architect",
      "Risk",
      "Implement",
      "Report",
      "Validate",
      "Closeout",
    ],
  }),
  listAvailablePhases: (): Promise<AvailablePhaseFoldersResult> =>
    ipcRenderer.invoke("workCards:listAvailablePhases"),
  previewProjectIntake: (
    input: ProjectIntakeInput,
  ): Promise<ProjectIntakePreviewResult> =>
    ipcRenderer.invoke("projectIntake:preview", input),
  saveProjectIntake: (
    input: ProjectIntakeInput,
  ): Promise<ProjectIntakeSaveResult> =>
    ipcRenderer.invoke("projectIntake:save", input),
  listSavedProjectIntakes: (): Promise<ListSavedProjectIntakesResult> =>
    ipcRenderer.invoke("projectArchitectInterview:listProjectIntakes"),
  previewProjectArchitectInterviewPrompt: (
    input: ProjectArchitectInterviewPromptRequest,
  ): Promise<ProjectArchitectInterviewPromptPreviewResult> =>
    ipcRenderer.invoke("projectArchitectInterview:previewPrompt", input),
  saveProjectArchitectInterviewPrompt: (
    input: ProjectArchitectInterviewPromptRequest,
  ): Promise<ProjectArchitectInterviewPromptSaveResult> =>
    ipcRenderer.invoke("projectArchitectInterview:savePrompt", input),
  listProjectPlanningDocumentProjectIntakes:
    (): Promise<ListSavedProjectIntakesResult> =>
      ipcRenderer.invoke("projectPlanningDocuments:listProjectIntakes"),
  listProjectPlanningDocumentArchitectPrompts:
    (): Promise<ListSavedProjectArchitectInterviewPromptsResult> =>
      ipcRenderer.invoke("projectPlanningDocuments:listArchitectPrompts"),
  previewProjectPlanningDocuments: (
    input: ProjectPlanningDocumentsRequest,
  ): Promise<ProjectPlanningDocumentsPreviewResult> =>
    ipcRenderer.invoke("projectPlanningDocuments:preview", input),
  saveProjectPlanningDocuments: (
    input: ProjectPlanningDocumentsRequest,
  ): Promise<ProjectPlanningDocumentsSaveResult> =>
    ipcRenderer.invoke("projectPlanningDocuments:save", input),
  listPhaseIntakeProjectPlanningDocuments:
    (): Promise<ListSavedProjectPlanningDocumentsResult> =>
      ipcRenderer.invoke("phaseIntake:listProjectPlanningDocuments"),
  previewPhaseIntake: (
    input: PhaseIntakeInput,
  ): Promise<PhaseIntakePreviewResult> =>
    ipcRenderer.invoke("phaseIntake:preview", input),
  savePhaseIntake: (
    input: PhaseIntakeInput,
  ): Promise<PhaseIntakeSaveResult> =>
    ipcRenderer.invoke("phaseIntake:save", input),
  listPhaseArchitectInterviewPhaseIntakes: (
    phase: string,
  ): Promise<ListSavedPhaseIntakesResult> =>
    ipcRenderer.invoke("phaseArchitectInterview:listPhaseIntakes", phase),
  previewPhaseArchitectInterviewPrompt: (
    input: PhaseArchitectInterviewPromptRequest,
  ): Promise<PhaseArchitectInterviewPromptPreviewResult> =>
    ipcRenderer.invoke("phaseArchitectInterview:previewPrompt", input),
  savePhaseArchitectInterviewPrompt: (
    input: PhaseArchitectInterviewPromptRequest,
  ): Promise<PhaseArchitectInterviewPromptSaveResult> =>
    ipcRenderer.invoke("phaseArchitectInterview:savePrompt", input),
  listRepositoryReconciliationProjectPlanningDocuments:
    (): Promise<ListSavedProjectPlanningDocumentsResult> =>
      ipcRenderer.invoke("repositoryReconciliation:listProjectPlanningDocuments"),
  previewRepositoryReconciliationPrompt: (
    input: RepositoryReconciliationPromptRequest,
  ): Promise<RepositoryReconciliationPromptPreviewResult> =>
    ipcRenderer.invoke("repositoryReconciliation:previewPrompt", input),
  previewRepositoryReconciliation: (
    input: RepositoryReconciliationRequest,
  ): Promise<RepositoryReconciliationPreviewResult> =>
    ipcRenderer.invoke("repositoryReconciliation:preview", input),
  saveRepositoryReconciliation: (
    input: RepositoryReconciliationRequest,
  ): Promise<RepositoryReconciliationSaveResult> =>
    ipcRenderer.invoke("repositoryReconciliation:save", input),
  previewProjectRoadmap: (
    input: ProjectRoadmapRequest,
  ): Promise<ProjectRoadmapPreviewResult> =>
    ipcRenderer.invoke("projectRoadmap:preview", input),
  saveProjectRoadmap: (
    input: ProjectRoadmapRequest,
  ): Promise<ProjectRoadmapSaveResult> =>
    ipcRenderer.invoke("projectRoadmap:save", input),
  listSavedProjectRoadmaps: (): Promise<ListSavedProjectRoadmapsResult> =>
    ipcRenderer.invoke("projectRoadmap:listSaved"),
  previewPhaseMap: (
    input: PhaseMapBuilderRequest,
  ): Promise<PhaseMapPreviewResult> =>
    ipcRenderer.invoke("phaseMap:preview", input),
  savePhaseMap: (input: PhaseMapBuilderRequest): Promise<PhaseMapSaveResult> =>
    ipcRenderer.invoke("phaseMap:save", input),
  listSavedPhaseMaps: (): Promise<ListSavedPhaseMapsResult> =>
    ipcRenderer.invoke("phaseMap:listSaved"),
  listPhasePlanningProjectPlanningDocuments:
    (): Promise<ListSavedProjectPlanningDocumentsResult> =>
      ipcRenderer.invoke("phasePlanning:listProjectPlanningDocuments"),
  listPhasePlanningRepositoryReconciliations:
    (): Promise<ListSavedRepositoryReconciliationsResult> =>
      ipcRenderer.invoke("phasePlanning:listRepositoryReconciliations"),
  listPhasePlanningPhaseIntakes: (
    phase: string,
  ): Promise<ListSavedPhaseIntakesResult> =>
    ipcRenderer.invoke("phasePlanning:listPhaseIntakes", phase),
  listPhasePlanningPhaseArchitectInterviewPrompts: (
    phase: string,
  ): Promise<ListSavedPhaseArchitectInterviewPromptsResult> =>
    ipcRenderer.invoke("phasePlanning:listPhaseArchitectInterviewPrompts", phase),
  previewPhasePlanningDocuments: (
    input: PhasePlanningDocumentsRequest,
  ): Promise<PhasePlanningDocumentsPreviewResult> =>
    ipcRenderer.invoke("phasePlanning:preview", input),
  savePhasePlanningDocuments: (
    input: PhasePlanningDocumentsRequest,
  ): Promise<PhasePlanningDocumentsSaveResult> =>
    ipcRenderer.invoke("phasePlanning:save", input),
  listSavedWorkCardPlans: (
    phase: string,
  ): Promise<ListSavedWorkCardPlansResult> =>
    ipcRenderer.invoke("workCardPlans:listSaved", phase),
  getNextWorkCardId: (phase: string): Promise<NextWorkCardIdResult> =>
    ipcRenderer.invoke("workCards:getNextId", phase),
  previewWorkCardDraft: (
    input: WorkCardDraftInput,
  ): Promise<WorkCardPreviewResult> =>
    ipcRenderer.invoke("workCards:previewDraft", input),
  saveWorkCardDraft: (input: WorkCardDraftInput): Promise<WorkCardSaveResult> =>
    ipcRenderer.invoke("workCards:saveDraft", input),
  listSavedWorkCards: (phase: string): Promise<ListSavedWorkCardsResult> =>
    ipcRenderer.invoke("workCards:listSaved", phase),
  previewArchitectPrompt: (
    input: ArchitectPromptRequest,
  ): Promise<ArchitectPromptPreviewResult> =>
    ipcRenderer.invoke("workCards:previewArchitectPrompt", input),
  saveArchitectPrompt: (
    input: ArchitectPromptRequest,
  ): Promise<ArchitectPromptSaveResult> =>
    ipcRenderer.invoke("workCards:saveArchitectPrompt", input),
  previewRiskReview: (
    input: RiskReviewRequest,
  ): Promise<RiskReviewPreviewResult> =>
    ipcRenderer.invoke("workCards:previewRiskReview", input),
  saveRiskReview: (input: RiskReviewRequest): Promise<RiskReviewSaveResult> =>
    ipcRenderer.invoke("workCards:saveRiskReview", input),
  listBuilderPromptSupportingArtifacts: (
    input: BuilderPromptRequest,
  ): Promise<BuilderPromptArtifactListResult> =>
    ipcRenderer.invoke("workCards:listBuilderPromptSupportingArtifacts", input),
  previewBuilderPrompt: (
    input: BuilderPromptRequest,
  ): Promise<BuilderPromptPreviewResult> =>
    ipcRenderer.invoke("workCards:previewBuilderPrompt", input),
  saveBuilderPrompt: (
    input: BuilderPromptRequest,
  ): Promise<BuilderPromptSaveResult> =>
    ipcRenderer.invoke("workCards:saveBuilderPrompt", input),
  previewBuilderReportCapture: (
    input: BuilderReportCaptureRequest,
  ): Promise<BuilderReportCapturePreviewResult> =>
    ipcRenderer.invoke("workCards:previewBuilderReportCapture", input),
  saveBuilderReportCapture: (
    input: BuilderReportCaptureRequest,
  ): Promise<BuilderReportCaptureSaveResult> =>
    ipcRenderer.invoke("workCards:saveBuilderReportCapture", input),
  loadBuilderReportFile: (
    input: BuilderReportFileLoadRequest,
  ): Promise<BuilderReportFileLoadResult> =>
    ipcRenderer.invoke("workCards:loadBuilderReportFile", input),
  listHumanValidationBuilderReports: (
    input: HumanValidationBuilderReportListRequest,
  ): Promise<HumanValidationBuilderReportListResult> =>
    ipcRenderer.invoke("workCards:listHumanValidationBuilderReports", input),
  listHumanValidationTargets: (
    phase: string,
  ): Promise<ListValidationTargetsResult> =>
    ipcRenderer.invoke("workCards:listHumanValidationTargets", phase),
  listHumanValidationStatuses: (
    phase: string,
  ): Promise<HumanValidationStatusListResult> =>
    ipcRenderer.invoke("workCards:listHumanValidationStatuses", phase),
  previewHumanValidationRecord: (
    input: HumanValidationFormInput,
  ): Promise<HumanValidationPreviewResult> =>
    ipcRenderer.invoke("workCards:previewHumanValidationRecord", input),
  saveHumanValidationRecord: (
    input: HumanValidationFormInput,
  ): Promise<HumanValidationSaveResult> =>
    ipcRenderer.invoke("workCards:saveHumanValidationRecord", input),
  attachValidationEvidenceFile: (
    input: ValidationEvidenceFileImportRequest,
  ): Promise<ValidationEvidenceFileImportResult> =>
    ipcRenderer.invoke("workCards:attachValidationEvidenceFile", input),
  getPhaseCloseoutSummary: (
    phase: string,
  ): Promise<PhaseCloseoutSummaryResult> =>
    ipcRenderer.invoke("workCards:getPhaseCloseoutSummary", phase),
  getCurrentRequiredAction: (): Promise<CurrentRequiredActionResult> =>
    ipcRenderer.invoke("workCards:getCurrentRequiredAction"),
  previewPlanningArtifact: (
    input: PlanningArtifactPreviewRequest,
  ): Promise<PlanningArtifactPreviewResult> =>
    ipcRenderer.invoke("workCards:previewPlanningArtifact", input),
  previewPhaseCloseoutRecord: (
    input: PhaseCloseoutFormInput,
  ): Promise<PhaseCloseoutPreviewResult> =>
    ipcRenderer.invoke("workCards:previewPhaseCloseoutRecord", input),
  savePhaseCloseoutRecord: (
    input: PhaseCloseoutFormInput,
  ): Promise<PhaseCloseoutSaveResult> =>
    ipcRenderer.invoke("workCards:savePhaseCloseoutRecord", input),
};

contextBridge.exposeInMainWorld("champCity", api);
