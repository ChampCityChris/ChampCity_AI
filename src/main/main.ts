import { app, BrowserWindow, clipboard, dialog, ipcMain, Menu } from "electron";
import path from "node:path";
import {
  clearSelectedWorkspace,
  readSelectedWorkspace,
  saveSelectedWorkspace,
} from "./workspaceSettings";
import {
  applyDispositionInitialization,
  assertGenericDocumentDispositionRouteAllowed,
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
  getArchitectOutputWorkspaceModel,
  prepareArchitectOutputHandoff,
  resolveArchitectOutputCopyHandoff,
  reviewArchitectOutput,
} from "./architectOutputs/architectOutputWorkspaceService";
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
  ArchitectOutputPresentedSlotRevision,
  ArchitectOutputWorkspaceModel,
  CurrentWorkspaceModel,
  RuntimeActionResult,
  WorkspaceId,
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
    const workspaceRoot = getRequiredWorkspaceRoot();
    assertGenericDocumentDispositionRouteAllowed(workspaceRoot, logicalDocumentId);
    return setDocumentDisposition(workspaceRoot, logicalDocumentId, status);
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

ipcMain.handle(
  "architectOutput:getWorkspaceModel",
  (_event, workspaceId: WorkspaceId): ArchitectOutputWorkspaceModel => {
    return getArchitectOutputWorkspaceModel(getRequiredWorkspaceRoot(), workspaceId);
  },
);

ipcMain.handle(
  "architectOutput:prepareHandoff",
  (_event, workspaceId: WorkspaceId): ArchitectOutputWorkspaceModel => {
    return prepareArchitectOutputHandoff(getRequiredWorkspaceRoot(), workspaceId);
  },
);

ipcMain.handle(
  "architectOutput:copyHandoff",
  (_event, workspaceId: WorkspaceId): RuntimeActionResult => {
    const workspaceRoot = getRequiredWorkspaceRoot();
    const { instruction, result } = resolveArchitectOutputCopyHandoff(workspaceRoot, workspaceId);
    clipboard.writeText(instruction);
    return result;
  },
);

ipcMain.handle(
  "architectOutput:review",
  (
    _event,
    workspaceId: WorkspaceId,
    status: DocumentDispositionStatus,
    operatorReviewNotes: string,
    presentedRevisions: ArchitectOutputPresentedSlotRevision[],
  ): ArchitectOutputWorkspaceModel => {
    return reviewArchitectOutput(
      getRequiredWorkspaceRoot(),
      workspaceId,
      status,
      operatorReviewNotes,
      presentedRevisions,
    );
  },
);

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
