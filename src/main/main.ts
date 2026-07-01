import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  type ContextMenuParams,
  type MenuItemConstructorOptions,
} from "electron";
import { mkdirSync } from "node:fs";
import path from "node:path";

import {
  attachValidationEvidenceFile,
  getNextWorkCardId,
  getPhaseCloseoutSummary,
  listBuilderPromptSupportingArtifacts,
  listAvailablePhaseFolders,
  listHumanValidationBuilderReports,
  listHumanValidationTargets,
  listSavedProjectIntakes,
  listSavedWorkCards,
  previewArchitectPrompt,
  previewBuilderPrompt,
  previewBuilderReportCapture,
  previewDraftWorkCard,
  previewHumanValidationRecord,
  previewPhaseCloseoutRecord,
  previewProjectArchitectInterviewPrompt,
  previewProjectIntake,
  previewRiskReview,
  loadBuilderReportFile,
  saveArchitectPrompt,
  saveBuilderPrompt,
  saveBuilderReportCapture,
  saveDraftWorkCard,
  saveHumanValidationRecord,
  savePhaseCloseoutRecord,
  saveProjectArchitectInterviewPrompt,
  saveProjectIntake,
  saveRiskReview,
} from "./workCards/workCardFileStore";
import type { WorkCardDraftInput } from "../shared/workCards/workCardDraft";
import type { ProjectIntakeInput } from "../shared/workCards/projectIntake";
import type { ProjectArchitectInterviewPromptRequest } from "../shared/workCards/projectArchitectInterviewPrompt";
import type { ArchitectPromptRequest } from "../shared/workCards/renderArchitectFramingPrompt";
import type { BuilderPromptRequest } from "../shared/workCards/renderBuilderPrompt";
import type { BuilderReportCaptureRequest } from "../shared/workCards/validateBuilderReport";
import type { RiskReviewRequest } from "../shared/workCards/renderRiskReviewMarkdown";
import type {
  BuilderReportFileLoadRequest,
  HumanValidationBuilderReportListRequest,
  HumanValidationFormInput,
  ValidationEvidenceFileImportRequest,
} from "../shared/workCards/validationRecord";
import type { PhaseCloseoutFormInput } from "../shared/workCards/phaseCloseoutRecord";

const appName = "ChampCity A/I";
const repositoryRoot = path.resolve(__dirname, "..", "..");
const electronRuntimeRoot = path.join(repositoryRoot, "tmp", "electron-runtime");

configureLocalElectronRuntimePaths();

function configureLocalElectronRuntimePaths(): void {
  const runtimePaths = {
    userData: path.join(electronRuntimeRoot, "user-data"),
    sessionData: path.join(electronRuntimeRoot, "session-data"),
    logs: path.join(electronRuntimeRoot, "logs"),
    crashDumps: path.join(electronRuntimeRoot, "crash-dumps"),
  };

  for (const directory of Object.values(runtimePaths)) {
    mkdirSync(directory, { recursive: true });
  }

  app.setPath("userData", runtimePaths.userData);
  app.setPath("sessionData", runtimePaths.sessionData);
  app.setPath("logs", runtimePaths.logs);
  app.setPath("crashDumps", runtimePaths.crashDumps);
}

function createMainWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1040,
    height: 720,
    minWidth: 760,
    minHeight: 560,
    title: appName,
    backgroundColor: "#080a0d",
    icon: path.join(
      __dirname,
      "..",
      "renderer",
      "assets",
      "champcity_ai_icon_clean_no_shadow_TRANSPARENT.png",
    ),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "..", "preload", "index.js"),
    },
  });

  registerEditContextMenu(mainWindow);

  void mainWindow.loadFile(path.join(__dirname, "..", "renderer", "index.html"));
}

function registerEditContextMenu(mainWindow: BrowserWindow): void {
  mainWindow.webContents.on("context-menu", (_event, params) => {
    const template = buildEditContextMenuTemplate(params);

    if (template.length === 0) {
      return;
    }

    Menu.buildFromTemplate(template).popup({ window: mainWindow });
  });
}

function buildEditContextMenuTemplate(
  params: ContextMenuParams,
): MenuItemConstructorOptions[] {
  if (params.isEditable) {
    return [
      { role: "undo", enabled: params.editFlags.canUndo },
      { role: "redo", enabled: params.editFlags.canRedo },
      { type: "separator" },
      { role: "cut", enabled: params.editFlags.canCut },
      { role: "copy", enabled: params.editFlags.canCopy },
      { role: "paste", enabled: params.editFlags.canPaste },
      { type: "separator" },
      { role: "selectAll", enabled: params.editFlags.canSelectAll },
    ];
  }

  if (params.selectionText.length > 0) {
    return [
      { role: "copy", enabled: params.editFlags.canCopy },
      { role: "selectAll", enabled: params.editFlags.canSelectAll },
    ];
  }

  return [];
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
  ipcMain.handle("workCards:listAvailablePhases", () =>
    listAvailablePhaseFolders(),
  );
  ipcMain.handle(
    "projectIntake:preview",
    (_event, input: ProjectIntakeInput) => previewProjectIntake(input),
  );
  ipcMain.handle(
    "projectIntake:save",
    (_event, input: ProjectIntakeInput) => saveProjectIntake(input),
  );
  ipcMain.handle("projectArchitectInterview:listProjectIntakes", () =>
    listSavedProjectIntakes(),
  );
  ipcMain.handle(
    "projectArchitectInterview:previewPrompt",
    (_event, input: ProjectArchitectInterviewPromptRequest) =>
      previewProjectArchitectInterviewPrompt(input),
  );
  ipcMain.handle(
    "projectArchitectInterview:savePrompt",
    (_event, input: ProjectArchitectInterviewPromptRequest) =>
      saveProjectArchitectInterviewPrompt(input),
  );
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
    "workCards:loadBuilderReportFile",
    (_event, input: BuilderReportFileLoadRequest) =>
      loadBuilderReportFile(input),
  );
  ipcMain.handle(
    "workCards:listHumanValidationBuilderReports",
    (_event, input: HumanValidationBuilderReportListRequest) =>
      listHumanValidationBuilderReports(input),
  );
  ipcMain.handle("workCards:listHumanValidationTargets", (_event, phase: string) =>
    listHumanValidationTargets(phase),
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
  ipcMain.handle(
    "workCards:attachValidationEvidenceFile",
    (_event, input: ValidationEvidenceFileImportRequest) =>
      attachValidationEvidenceFile(input),
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
