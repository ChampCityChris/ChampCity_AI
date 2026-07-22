import { app, BrowserWindow, dialog, ipcMain } from "electron";
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
  setArchitectBrowserBounds,
} from "./browser/architectBrowserService";
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
import type { DocumentDispositionStatus } from "../shared/documents/documentDisposition";
import type {
  AppInfo,
  BrowserViewBounds,
  ClosureDecision,
  ProjectIntakeSubmission,
  ProjectIntakeSubmissionResult,
  ArchitectBrowserFoundationStatus,
  CurrentWorkspaceModel,
  RuntimeActionResult,
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
    },
  });

  void mainWindow.loadFile(rendererPath);
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

  const selection = saveSelectedWorkspace(getUserDataRoot(), result.filePaths[0]);
  if (!selection.ok) {
    throw new Error(selection.reason);
  }
  return selection;
});

ipcMain.handle("workspace:clear", (): WorkspaceSelection => {
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

ipcMain.handle("architectBrowser:show", (): ArchitectBrowserFoundationStatus => {
  if (!mainWindow) {
    throw new Error("Main window is not available.");
  }
  return attachArchitectBrowserSurface(mainWindow, getRequiredWorkspaceRoot());
});

ipcMain.handle("architectBrowser:setBounds", (_event, bounds: BrowserViewBounds): ArchitectBrowserFoundationStatus => {
  return setArchitectBrowserBounds(getRequiredWorkspaceRoot(), bounds);
});

ipcMain.handle("architectBrowser:hide", (): ArchitectBrowserFoundationStatus => {
  return detachArchitectBrowserSurface(getRequiredWorkspaceRoot());
});

ipcMain.handle("architectBrowser:confirmSignedIn", (): ArchitectBrowserFoundationStatus => {
  return confirmArchitectSignedIn(getRequiredWorkspaceRoot());
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
