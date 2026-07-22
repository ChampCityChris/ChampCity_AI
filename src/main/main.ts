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
import { submitProjectIntake } from "./projectIntake/projectIntakeService";
import { getArchitectBrowserFoundationStatus } from "./browser/architectBrowserService";
import type { DocumentDispositionStatus } from "../shared/documents/documentDisposition";
import type {
  AppInfo,
  ProjectIntakeSubmission,
  ProjectIntakeSubmissionResult,
  ProjectRepositorySelection,
  ArchitectBrowserFoundationStatus,
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

  const mainWindow = new BrowserWindow({
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

  return saveSelectedWorkspace(getUserDataRoot(), result.filePaths[0]);
});

ipcMain.handle("projectRepository:choose", async (): Promise<ProjectRepositorySelection | WorkspaceSelection> => {
  const result = await dialog.showOpenDialog({
    title: "Choose Project Repository",
    properties: ["openDirectory"],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return {
      ok: false,
      workspaceRoot: null,
      reason: "No project repository selected.",
    };
  }

  return {
    ok: true,
    repositoryPath: path.resolve(result.filePaths[0]),
  };
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
    return submitProjectIntake(submission);
  },
);

ipcMain.handle("architectBrowser:foundationStatus", (): ArchitectBrowserFoundationStatus => {
  return getArchitectBrowserFoundationStatus(getRequiredWorkspaceRoot());
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
