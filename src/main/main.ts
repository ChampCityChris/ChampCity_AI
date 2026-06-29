import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";

import {
  getNextWorkCardId,
  listBuilderPromptSupportingArtifacts,
  listSavedWorkCards,
  previewArchitectPrompt,
  previewBuilderPrompt,
  previewDraftWorkCard,
  previewRiskReview,
  saveArchitectPrompt,
  saveBuilderPrompt,
  saveDraftWorkCard,
  saveRiskReview,
} from "./workCards/workCardFileStore";
import type { WorkCardDraftInput } from "../shared/workCards/workCardDraft";
import type { ArchitectPromptRequest } from "../shared/workCards/renderArchitectFramingPrompt";
import type { BuilderPromptRequest } from "../shared/workCards/renderBuilderPrompt";
import type { RiskReviewRequest } from "../shared/workCards/renderRiskReviewMarkdown";

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
}
