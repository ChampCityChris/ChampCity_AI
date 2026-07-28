import { app, BrowserWindow, clipboard, dialog, ipcMain, Menu } from "electron";
import path from "node:path";
import {
  clearSelectedWorkspace,
  readSelectedWorkspace,
  saveSelectedWorkspace,
} from "./workspaceSettings";
import {
  applyDispositionInitialization,
  listPlanningDocuments,
  previewDispositionInitialization,
  readPlanningDocument,
  setDocumentDisposition,
} from "./documents/planningDocumentService";
import { resolveFirstNonApprovedDocument } from "./documents/firstNonApprovedResolver";
import { submitProjectIntakeForRepository } from "./projectIntake/projectIntakeService";
import {
  attachArchitectBrowserSurface,
  confirmArchitectSignedIn,
  detachArchitectBrowserSurface,
  getArchitectBrowserFoundationStatus,
  reloadArchitectBrowserSurface,
  setArchitectBrowserBounds,
} from "./browser/architectBrowserService";
import {
  getArchitectInterviewWorkspaceModel,
  reviewArchitectInterview,
  saveCurrentArchitectInterviewOutput,
} from "./architectInterview/architectInterviewService";
import { saveProjectPlanningOutputs } from "./projectPlanning/projectPlanningService";
import { savePhaseMapOutput } from "./phaseMap/phaseMapService";
import { savePhaseInterviewOutput } from "./phaseInterview/phaseInterviewService";
import { savePhasePlanningOutputs } from "./phasePlanning/phasePlanningService";
import { saveFormalWorkCardOutput } from "./workCardPlanning/workCardPlanningService";
import { saveRepairWorkCardOutput } from "./workCardRepair/workCardRepairService";
import {
  applyCurrentDisposition,
  createPhaseCloseoutForCurrentPhase,
  createProjectCloseoutForCurrentProject,
  createRepairForCurrentFailure,
  createValidationAttemptForCurrentWorkCard,
  generateCurrentHandoff,
  getCurrentCloseProjection,
  getCurrentWorkspaceModel,
} from "./currentWorkflow/currentWorkflowService";
import {
  migrateWorkspaceToCanonicalMarkdownV1,
  previewWorkspaceMigrationToCanonicalMarkdownV1,
} from "./migrations/pairedArtifactsToCanonicalMarkdownV1";
import { buildLocalRendererContextMenuTemplate } from "./contextMenu/localRendererContextMenu";
import type { DocumentDispositionStatus } from "../shared/documents/documentDisposition";
import type {
  AppInfo,
  BrowserViewBounds,
  ClosureDecision,
  ProjectIntakeSubmission,
  ProjectIntakeSubmissionResult,
  ArchitectBrowserFoundationStatus,
  ArchitectInterviewWorkspaceModel,
  CurrentWorkspaceModel,
  RuntimeActionResult,
  ProjectPlanningOutputsInput,
  ProjectPlanningOutputsSaveResult,
  PhaseMapOutputSaveResult,
  PhaseInterviewOutputSaveResult,
  PhasePlanningOutputsInput,
  PhasePlanningOutputsSaveResult,
  FormalWorkCardOutputSaveResult,
  RepairWorkCardOutputSaveResult,
  WorkspaceMigrationPreview,
  WorkspaceMigrationResult,
  WorkspaceSelection,
} from "../shared/workspaceContracts";

const userDataRootOverride = process.env.CHAMPCITY_USER_DATA_ROOT;
if (userDataRootOverride) {
  app.setPath("userData", path.resolve(userDataRootOverride));
}

const appInfo: AppInfo = {
  name: "ChampCity A/I",
  version: app.getVersion(),
};
let mainWindow: BrowserWindow | null = null;

function getUserDataRoot(): string {
  return app.getPath("userData");
}

function getRequiredWorkspaceRoot(): string {
  const selectedWorkspace = readSelectedWorkspace(getUserDataRoot());
  if (!selectedWorkspace.ok) {
    throw new Error(selectedWorkspace.reason);
  }

  return selectedWorkspace.workspaceRoot;
}

function detachArchitectBrowserForSelectedWorkspace(): void {
  const selectedWorkspace = readSelectedWorkspace(getUserDataRoot());
  if (selectedWorkspace.ok) {
    detachArchitectBrowserSurface(selectedWorkspace.workspaceRoot);
  }
}

function createMainWindow(): void {
  const preloadPath = path.join(__dirname, "../preload/index.js");
  const rendererPath = path.join(__dirname, "../renderer/index.html");

  mainWindow = new BrowserWindow({
    width: 1160,
    height: 780,
    minWidth: 900,
    minHeight: 620,
    title: "ChampCity A/I",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: preloadPath,
      spellcheck: true,
    },
  });

  registerLocalRendererContextMenu(mainWindow);
  void mainWindow.loadFile(rendererPath);
}

function registerLocalRendererContextMenu(window: BrowserWindow): void {
  window.webContents.on("context-menu", (_event, params) => {
    const template = buildLocalRendererContextMenuTemplate(params, {
      replaceMisspelling: (replacement) => {
        window.webContents.replaceMisspelling(replacement);
      },
      addWordToDictionary: (word) => {
        window.webContents.session.addWordToSpellCheckerDictionary(word);
      },
    });

    if (template.length === 0) {
      return;
    }

    Menu.buildFromTemplate(template).popup({ window });
  });
}

ipcMain.handle("workspace:get", (): WorkspaceSelection => {
  return readSelectedWorkspace(getUserDataRoot());
});

ipcMain.handle("workspace:choose", async (): Promise<WorkspaceSelection> => {
  const result = await dialog.showOpenDialog({
    title: "Choose ChampCity A/I Workspace",
    properties: ["openDirectory"],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return readSelectedWorkspace(getUserDataRoot());
  }

  detachArchitectBrowserForSelectedWorkspace();
  const selection = saveSelectedWorkspace(getUserDataRoot(), result.filePaths[0]);
  if (!selection.ok) {
    throw new Error(selection.reason);
  }
  return selection;
});

ipcMain.handle("workspace:clear", (): WorkspaceSelection => {
  detachArchitectBrowserForSelectedWorkspace();
  return clearSelectedWorkspace(getUserDataRoot());
});

ipcMain.handle("app:info", (): AppInfo => {
  return appInfo;
});

ipcMain.handle("documents:list", () => {
  return listPlanningDocuments(getRequiredWorkspaceRoot());
});

ipcMain.handle("documents:read", (_event, logicalDocumentId: string) => {
  return readPlanningDocument(getRequiredWorkspaceRoot(), logicalDocumentId);
});

ipcMain.handle(
  "documents:setDisposition",
  (_event, logicalDocumentId: string, status: DocumentDispositionStatus) => {
    return setDocumentDisposition(getRequiredWorkspaceRoot(), logicalDocumentId, status);
  },
);

ipcMain.handle("documents:previewInitialization", () => {
  return previewDispositionInitialization(getRequiredWorkspaceRoot());
});

ipcMain.handle("documents:applyInitialization", () => {
  return applyDispositionInitialization(getRequiredWorkspaceRoot());
});

ipcMain.handle("workspaceMigration:preview", (): WorkspaceMigrationPreview => {
  return previewWorkspaceMigrationToCanonicalMarkdownV1(getRequiredWorkspaceRoot());
});

ipcMain.handle("workspaceMigration:apply", (): WorkspaceMigrationResult => {
  return migrateWorkspaceToCanonicalMarkdownV1(getRequiredWorkspaceRoot());
});

ipcMain.handle("documents:resolveCurrent", () => {
  return resolveFirstNonApprovedDocument(getRequiredWorkspaceRoot());
});

ipcMain.handle(
  "projectIntake:submit",
  (_event, submission: ProjectIntakeSubmission): ProjectIntakeSubmissionResult => {
    return submitProjectIntakeForRepository(getRequiredWorkspaceRoot(), submission);
  },
);

ipcMain.handle("architectBrowser:foundationStatus", (): ArchitectBrowserFoundationStatus => {
  return getArchitectBrowserFoundationStatus(getRequiredWorkspaceRoot());
});

ipcMain.handle("architectBrowser:show", (_event, attachmentGeneration?: number): ArchitectBrowserFoundationStatus => {
  if (!mainWindow) {
    throw new Error("Main window is not available.");
  }
  return attachArchitectBrowserSurface(mainWindow, getRequiredWorkspaceRoot(), attachmentGeneration);
});

ipcMain.handle("architectBrowser:setBounds", (_event, bounds: BrowserViewBounds): ArchitectBrowserFoundationStatus => {
  return setArchitectBrowserBounds(getRequiredWorkspaceRoot(), bounds);
});

ipcMain.handle("architectBrowser:hide", (_event, attachmentGeneration?: number): ArchitectBrowserFoundationStatus => {
  return detachArchitectBrowserSurface(getRequiredWorkspaceRoot(), attachmentGeneration);
});

ipcMain.handle("architectBrowser:confirmSignedIn", (): ArchitectBrowserFoundationStatus => {
  return confirmArchitectSignedIn(getRequiredWorkspaceRoot());
});

ipcMain.handle("architectBrowser:reload", (): ArchitectBrowserFoundationStatus => {
  return reloadArchitectBrowserSurface(getRequiredWorkspaceRoot());
});

ipcMain.handle("architectInterview:getModel", (): ArchitectInterviewWorkspaceModel => {
  return getArchitectInterviewWorkspaceModel(getRequiredWorkspaceRoot());
});

ipcMain.handle("architectInterview:copyHandoff", (): RuntimeActionResult => {
  const model = getArchitectInterviewWorkspaceModel(getRequiredWorkspaceRoot());
  if (!model.canCopyHandoff || !model.handoffInstruction) {
    throw new Error(model.reason || "Architect handoff is not available.");
  }
  clipboard.writeText(model.handoffInstruction);
  return {
    ok: true,
    action: "architectInterview:copyHandoff",
    message: "Architect handoff copied. Paste and send it manually in the embedded Architect chat.",
    payload: {
      bytes: Buffer.byteLength(model.handoffInstruction, "utf8"),
    },
  };
});

ipcMain.handle(
  "architectInterview:review",
  (_event, status: DocumentDispositionStatus, operatorReviewNotes: string, expectedSourceKey?: string): ArchitectInterviewWorkspaceModel => {
    return reviewArchitectInterview(getRequiredWorkspaceRoot(), status, operatorReviewNotes, expectedSourceKey);
  },
);

ipcMain.handle("architectInterview:saveOutput", (_event, markdownBody: string): ArchitectInterviewWorkspaceModel => {
  return saveCurrentArchitectInterviewOutput(getRequiredWorkspaceRoot(), markdownBody);
});

ipcMain.handle("projectPlanning:saveOutputs", (_event, input: ProjectPlanningOutputsInput): ProjectPlanningOutputsSaveResult => {
  const workspaceRoot = getRequiredWorkspaceRoot();
  return {
    ...saveProjectPlanningOutputs(workspaceRoot, input),
    currentWorkspaceModel: getCurrentWorkspaceModel(workspaceRoot),
  };
});

ipcMain.handle("phaseMap:saveOutput", (_event, markdownBody: string): PhaseMapOutputSaveResult => {
  const workspaceRoot = getRequiredWorkspaceRoot();
  return {
    ...savePhaseMapOutput(workspaceRoot, markdownBody),
    currentWorkspaceModel: getCurrentWorkspaceModel(workspaceRoot),
  };
});

ipcMain.handle("phaseInterview:saveOutput", (_event, markdownBody: string): PhaseInterviewOutputSaveResult => {
  const workspaceRoot = getRequiredWorkspaceRoot();
  return {
    ...savePhaseInterviewOutput(workspaceRoot, markdownBody),
    currentWorkspaceModel: getCurrentWorkspaceModel(workspaceRoot),
  };
});

ipcMain.handle("phasePlanning:saveOutputs", (_event, input: PhasePlanningOutputsInput): PhasePlanningOutputsSaveResult => {
  const workspaceRoot = getRequiredWorkspaceRoot();
  return {
    ...savePhasePlanningOutputs(workspaceRoot, input),
    currentWorkspaceModel: getCurrentWorkspaceModel(workspaceRoot),
  };
});

ipcMain.handle("workCardPlanning:saveOutput", (_event, markdownBody: string): FormalWorkCardOutputSaveResult => {
  const workspaceRoot = getRequiredWorkspaceRoot();
  return {
    ...saveFormalWorkCardOutput(workspaceRoot, markdownBody),
    currentWorkspaceModel: getCurrentWorkspaceModel(workspaceRoot),
  };
});

ipcMain.handle("workCardRepair:saveOutput", (_event, markdownBody: string): RepairWorkCardOutputSaveResult => {
  const workspaceRoot = getRequiredWorkspaceRoot();
  return {
    ...saveRepairWorkCardOutput(workspaceRoot, markdownBody),
    currentWorkspaceModel: getCurrentWorkspaceModel(workspaceRoot),
  };
});

ipcMain.handle("currentWorkflow:getModel", (): CurrentWorkspaceModel => {
  return getCurrentWorkspaceModel(getRequiredWorkspaceRoot());
});

ipcMain.handle("currentWorkflow:generateHandoff", (): RuntimeActionResult => {
  return generateCurrentHandoff(getRequiredWorkspaceRoot());
});

ipcMain.handle("currentWorkflow:applyDisposition", (_event, status: DocumentDispositionStatus): RuntimeActionResult => {
  return applyCurrentDisposition(getRequiredWorkspaceRoot(), status);
});

ipcMain.handle("currentWorkflow:createRepair", (_event, defect: string): RuntimeActionResult => {
  return createRepairForCurrentFailure(getRequiredWorkspaceRoot(), defect);
});

ipcMain.handle("currentWorkflow:createValidationAttempt", (): RuntimeActionResult => {
  return createValidationAttemptForCurrentWorkCard(getRequiredWorkspaceRoot());
});

ipcMain.handle("currentWorkflow:createPhaseCloseout", (_event, closureDecision: ClosureDecision, rationale: string): RuntimeActionResult => {
  return createPhaseCloseoutForCurrentPhase(getRequiredWorkspaceRoot(), closureDecision, rationale);
});

ipcMain.handle("currentWorkflow:createProjectCloseout", (_event, closureDecision: ClosureDecision, rationale: string): RuntimeActionResult => {
  return createProjectCloseoutForCurrentProject(getRequiredWorkspaceRoot(), closureDecision, rationale);
});

ipcMain.handle("currentWorkflow:getCloseProjection", (): RuntimeActionResult => {
  return getCurrentCloseProjection(getRequiredWorkspaceRoot());
});

app.whenReady().then(() => {
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
