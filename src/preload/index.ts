import { contextBridge, ipcRenderer } from "electron";

import type {
  NextWorkCardIdResult,
  WorkCardDraftInput,
  WorkCardPreviewResult,
  WorkCardSaveResult,
} from "../shared/workCards/workCardDraft";
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
  HumanValidationBuilderReportListRequest,
  HumanValidationBuilderReportListResult,
  HumanValidationFormInput,
  HumanValidationPreviewResult,
  HumanValidationSaveResult,
} from "../shared/workCards/validationRecord";

const api = {
  getAppInfo: () => ({
    name: "ChampCity A/I",
    stage: "work card capture",
    coreLoop: ["Capture", "Frame", "Plan", "Build", "Prove"],
  }),
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
  listHumanValidationBuilderReports: (
    input: HumanValidationBuilderReportListRequest,
  ): Promise<HumanValidationBuilderReportListResult> =>
    ipcRenderer.invoke("workCards:listHumanValidationBuilderReports", input),
  previewHumanValidationRecord: (
    input: HumanValidationFormInput,
  ): Promise<HumanValidationPreviewResult> =>
    ipcRenderer.invoke("workCards:previewHumanValidationRecord", input),
  saveHumanValidationRecord: (
    input: HumanValidationFormInput,
  ): Promise<HumanValidationSaveResult> =>
    ipcRenderer.invoke("workCards:saveHumanValidationRecord", input),
};

contextBridge.exposeInMainWorld("champCity", api);
