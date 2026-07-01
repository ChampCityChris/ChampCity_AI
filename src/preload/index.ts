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
  ProjectPlanningDocumentsPreviewResult,
  ProjectPlanningDocumentsRequest,
  ProjectPlanningDocumentsSaveResult,
} from "../shared/workCards/projectPlanningDocuments";
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

const api = {
  getAppInfo: () => ({
    name: "ChampCity A/I",
    stage: "Alpha app development",
    coreLoop: [
      "Project Intake",
      "Project Architect",
      "Project Plan",
      "Capture",
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
