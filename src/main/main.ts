import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";

import {
  getNextWorkCardId,
  getPhaseCloseoutSummary,
  listBuilderPromptSupportingArtifacts,
  listHumanValidationBuilderReports,
  listSavedWorkCards,
  previewArchitectPrompt,
  previewBuilderPrompt,
  previewBuilderReportCapture,
  previewDraftWorkCard,
  previewHumanValidationRecord,
  previewPhaseCloseoutRecord,
  previewRiskReview,
  saveArchitectPrompt,
  saveBuilderPrompt,
  saveBuilderReportCapture,
  saveDraftWorkCard,
  saveHumanValidationRecord,
  savePhaseCloseoutRecord,
  saveRiskReview,
} from "./workCards/workCardFileStore";
import type { WorkCardDraftInput } from "../shared/workCards/workCardDraft";
import type { ArchitectPromptRequest } from "../shared/workCards/renderArchitectFramingPrompt";
import type { BuilderPromptRequest } from "../shared/workCards/renderBuilderPrompt";
import type { BuilderReportCaptureRequest } from "../shared/workCards/validateBuilderReport";
import type { RiskReviewRequest } from "../shared/workCards/renderRiskReviewMarkdown";
import type {
  HumanValidationBuilderReportListRequest,
  HumanValidationFormInput,
} from "../shared/workCards/validationRecord";
import type { PhaseCloseoutFormInput } from "../shared/workCards/phaseCloseoutRecord";

const appName = "ChampCity A/I";

function createMainWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1040,
    height: 720,
    minWidth: 760,
    minHeight: 560,
    title: appName,
    backgroundColor: "#f7f6f2",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "..", "preload", "index.js"),
    },
  });

  void mainWindow.loadFile(path.join(__dirname, "..", "renderer", "index.html"));
}

app.whenReady().then(() => {
  registerWorkCardIpc();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

function registerWorkCardIpc(): void {
  ipcMain.handle("workCards:getNextId", (_event, phase: string) =>
    getNextWorkCardId(phase),
  );
  ipcMain.handle(
    "workCards:previewDraft",
    (_event, input: WorkCardDraftInput) => previewDraftWorkCard(input),
  );
  ipcMain.handle("workCards:saveDraft", (_event, input: WorkCardDraftInput) =>
    saveDraftWorkCard(input),
  );
  ipcMain.handle("workCards:listSaved", (_event, phase: string) =>
    listSavedWorkCards(phase),
  );
  ipcMain.handle(
    "workCards:previewArchitectPrompt",
    (_event, input: ArchitectPromptRequest) => previewArchitectPrompt(input),
  );
  ipcMain.handle(
    "workCards:saveArchitectPrompt",
    (_event, input: ArchitectPromptRequest) => saveArchitectPrompt(input),
  );
  ipcMain.handle(
    "workCards:previewRiskReview",
    (_event, input: RiskReviewRequest) => previewRiskReview(input),
  );
  ipcMain.handle("workCards:saveRiskReview", (_event, input: RiskReviewRequest) =>
    saveRiskReview(input),
  );
  ipcMain.handle(
    "workCards:listBuilderPromptSupportingArtifacts",
    (_event, input: BuilderPromptRequest) =>
      listBuilderPromptSupportingArtifacts(input),
  );
  ipcMain.handle(
    "workCards:previewBuilderPrompt",
    (_event, input: BuilderPromptRequest) => previewBuilderPrompt(input),
  );
  ipcMain.handle(
    "workCards:saveBuilderPrompt",
    (_event, input: BuilderPromptRequest) => saveBuilderPrompt(input),
  );
  ipcMain.handle(
    "workCards:previewBuilderReportCapture",
    (_event, input: BuilderReportCaptureRequest) =>
      previewBuilderReportCapture(input),
  );
  ipcMain.handle(
    "workCards:saveBuilderReportCapture",
    (_event, input: BuilderReportCaptureRequest) =>
      saveBuilderReportCapture(input),
  );
  ipcMain.handle(
    "workCards:listHumanValidationBuilderReports",
    (_event, input: HumanValidationBuilderReportListRequest) =>
      listHumanValidationBuilderReports(input),
  );
  ipcMain.handle(
    "workCards:previewHumanValidationRecord",
    (_event, input: HumanValidationFormInput) =>
      previewHumanValidationRecord(input),
  );
  ipcMain.handle(
    "workCards:saveHumanValidationRecord",
    (_event, input: HumanValidationFormInput) =>
      saveHumanValidationRecord(input),
  );
  ipcMain.handle("workCards:getPhaseCloseoutSummary", (_event, phase: string) =>
    getPhaseCloseoutSummary(phase),
  );
  ipcMain.handle(
    "workCards:previewPhaseCloseoutRecord",
    (_event, input: PhaseCloseoutFormInput) =>
      previewPhaseCloseoutRecord(input),
  );
  ipcMain.handle(
    "workCards:savePhaseCloseoutRecord",
    (_event, input: PhaseCloseoutFormInput) =>
      savePhaseCloseoutRecord(input),
  );
}
