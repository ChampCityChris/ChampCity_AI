import { contextBridge, ipcRenderer } from "electron";

import type {
  NextWorkCardIdResult,
  WorkCardDraftInput,
  WorkCardPreviewResult,
  WorkCardSaveResult,
} from "../shared/workCards/workCardDraft";

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
};

contextBridge.exposeInMainWorld("champCity", api);
