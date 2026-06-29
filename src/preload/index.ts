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
  RiskReviewPreviewResult,
  RiskReviewRequest,
  RiskReviewSaveResult,
} from "../shared/workCards/renderRiskReviewMarkdown";

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
};

contextBridge.exposeInMainWorld("champCity", api);
