import { app, BrowserWindow, clipboard, dialog, ipcMain, Menu } from "electron";
import fs from "node:fs";
import path from "node:path";
import {
  clearSelectedWorkspace,
  readSelectedWorkspace,
  saveSelectedWorkspace,
} from "./workspaceSettings";
import { AgentHarnessService } from "./agentHarness/runtime/agentHarnessService";
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
  prepareArchitectInterviewFinalDraftHandoffWorkspace,
  prepareArchitectOutputHandoff,
  preparePhaseInterviewFinalDraftHandoffWorkspace,
  regenerateArchitectInterviewPromptWorkspace,
  resolveArchitectInterviewCopyFinalDraftHandoff,
  resolveArchitectOutputCopyHandoff,
  resolvePhaseInterviewCopyFinalDraftHandoff,
  reviewArchitectOutput,
} from "./architectOutputs/architectOutputWorkspaceService";
import {
  getProjectPlanningWorkspaceModel as getAuthoritativeProjectPlanningWorkspaceModel,
} from "./projectPlanning/projectPlanningService";
import {
  applyCurrentDisposition,
  applyOperatorValidationDecisionForCurrentWorkCard,
  createPhaseCloseoutForCurrentPhase,
  createProjectCloseoutForCurrentProject,
  createRepairForCurrentFailure,
  createValidationAttemptForCurrentWorkCard,
  beginWorkCardPlanning,
  generateCloseReturnNextIntakeHandoff,
  generateCurrentHandoff,
  getCloseReturnSelectionProjection,
  getCurrentCloseProjection,
  getCurrentRepairWorkspaceProjection,
  getCurrentWorkspaceModel,
  getCurrentWorkCardMapProjection,
  resolveCurrentAdvisoryReviewPrompt,
} from "./currentWorkflow/currentWorkflowService";
import { codexImplementerExecutionService } from "./workCardBuilding/codexImplementerExecutionService";
import {
  migrateWorkspaceToCanonicalMarkdownV1,
  previewWorkspaceMigrationToCanonicalMarkdownV1,
} from "./migrations/pairedArtifactsToCanonicalMarkdownV1";
import { buildLocalRendererContextMenuTemplate } from "./contextMenu/localRendererContextMenu";
import type { DocumentDispositionStatus } from "../shared/documents/documentDisposition";
import type {
  AppInfo,
  BeginWorkCardPlanningOptions,
  BrowserViewBounds,
  ClosureDecision,
  ProjectIntakeSubmission,
  ProjectIntakeSubmissionResult,
  ArchitectBrowserFoundationStatus,
  ArchitectOutputPresentedSlotRevision,
  ArchitectOutputWorkspaceModel,
  CodexApprovalResponse,
  CodexImplementerExecutionModel,
  CodexMcpElicitationResponse,
  CodexUserInputResponse,
  CurrentWorkspaceModel,
  OperatorValidationDecisionInput,
  ProjectPlanningWorkspaceModel,
  RuntimeActionResult,
  WorkCardMapProjectionOptions,
  WorkspaceId,
  WorkspaceMigrationPreview,
  WorkspaceMigrationResult,
  WorkspaceSelection,
  AgentHarnessSettingsInput,
  LegacyOAuthClientImportResult,
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
let quitAfterCodexCleanup = false;
let agentHarnessService: AgentHarnessService | null = null;

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

ipcMain.handle("agentHarness:status", () => {
  return getAgentHarnessService().status();
});

ipcMain.handle("agentHarness:saveSettings", (_event, settings: AgentHarnessSettingsInput) => {
  return getAgentHarnessService().saveConfiguration(settings);
});

ipcMain.handle("agentHarness:importLegacyOAuthClients", async (): Promise<LegacyOAuthClientImportResult> => {
  const result = await dialog.showOpenDialog({
    title: "Import Legacy OAuth Client Registry",
    properties: ["openFile"],
    filters: [{ name: "OAuth client registry", extensions: ["json"] }],
  });
  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }
  const source = JSON.parse(await fs.promises.readFile(result.filePaths[0], "utf8")) as unknown;
  return getAgentHarnessService().importLegacyOAuthClientRegistry(source);
});

ipcMain.handle("agentHarness:start", () => {
  return getAgentHarnessService().start();
});

ipcMain.handle("agentHarness:stop", () => {
  return getAgentHarnessService().stop();
});

ipcMain.handle("agentHarness:restart", () => {
  return getAgentHarnessService().restart();
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
  "projectPlanning:getWorkspaceModel",
  (): ProjectPlanningWorkspaceModel => {
    return getAuthoritativeProjectPlanningWorkspaceModel(getRequiredWorkspaceRoot());
  },
);

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
  "architectOutput:regenerateInterviewPrompt",
  (): ArchitectOutputWorkspaceModel => {
    return regenerateArchitectInterviewPromptWorkspace(getRequiredWorkspaceRoot());
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
  "architectInterview:prepareFinalDraftHandoff",
  (): ArchitectOutputWorkspaceModel => {
    return prepareArchitectInterviewFinalDraftHandoffWorkspace(getRequiredWorkspaceRoot());
  },
);

ipcMain.handle(
  "architectInterview:copyFinalDraftHandoff",
  (): RuntimeActionResult => {
    const workspaceRoot = getRequiredWorkspaceRoot();
    const { instruction, result } = resolveArchitectInterviewCopyFinalDraftHandoff(workspaceRoot);
    clipboard.writeText(instruction);
    return result;
  },
);

ipcMain.handle(
  "phaseInterview:prepareFinalDraftHandoff",
  (): ArchitectOutputWorkspaceModel => {
    return preparePhaseInterviewFinalDraftHandoffWorkspace(getRequiredWorkspaceRoot());
  },
);

ipcMain.handle(
  "phaseInterview:copyFinalDraftHandoff",
  (): RuntimeActionResult => {
    const workspaceRoot = getRequiredWorkspaceRoot();
    const { instruction, result } = resolvePhaseInterviewCopyFinalDraftHandoff(workspaceRoot);
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

ipcMain.handle("codexImplementer:getStatus", (): Promise<CodexImplementerExecutionModel> => {
  return codexImplementerExecutionService.getStatus(getRequiredWorkspaceRoot());
});

ipcMain.handle("codexImplementer:start", (): Promise<CodexImplementerExecutionModel> => {
  return codexImplementerExecutionService.start(getRequiredWorkspaceRoot());
});

ipcMain.handle("codexImplementer:startEnvironmentResolution", (): Promise<CodexImplementerExecutionModel> => {
  return codexImplementerExecutionService.startEnvironmentResolution(getRequiredWorkspaceRoot());
});

ipcMain.handle(
  "codexImplementer:respondToUserInput",
  (_event, response: CodexUserInputResponse): Promise<CodexImplementerExecutionModel> => {
    return codexImplementerExecutionService.respondToUserInput(
      getRequiredWorkspaceRoot(),
      response.requestId,
      response.answers,
    );
  },
);

ipcMain.handle(
  "codexImplementer:respondToApproval",
  (_event, response: CodexApprovalResponse): Promise<CodexImplementerExecutionModel> => {
    return codexImplementerExecutionService.respondToApproval(
      getRequiredWorkspaceRoot(),
      response.requestId,
      response.decision,
    );
  },
);

ipcMain.handle(
  "codexImplementer:respondToMcpElicitation",
  (_event, response: CodexMcpElicitationResponse): Promise<CodexImplementerExecutionModel> => {
    return codexImplementerExecutionService.respondToMcpElicitation(
      getRequiredWorkspaceRoot(),
      response.requestId,
      {
        action: response.action,
        content: response.content,
      },
    );
  },
);

ipcMain.handle("codexImplementer:cancel", (): Promise<CodexImplementerExecutionModel> => {
  return codexImplementerExecutionService.cancel(getRequiredWorkspaceRoot());
});

ipcMain.handle("currentWorkflow:generateHandoff", (): RuntimeActionResult => {
  return generateCurrentHandoff(getRequiredWorkspaceRoot());
});

ipcMain.handle("currentWorkflow:getWorkCardMapProjection", (
  _event,
  phaseId: string,
  options: WorkCardMapProjectionOptions = {},
): RuntimeActionResult => {
  return getCurrentWorkCardMapProjection(getRequiredWorkspaceRoot(), phaseId, options);
});

ipcMain.handle("currentWorkflow:beginWorkCardPlanning", (
  _event,
  phaseId: string,
  candidateId: string,
  options: BeginWorkCardPlanningOptions = {},
): RuntimeActionResult => {
  return beginWorkCardPlanning(getRequiredWorkspaceRoot(), phaseId, candidateId, options);
});

ipcMain.handle("currentWorkflow:copyAdvisoryReviewPrompt", (): RuntimeActionResult => {
  const { instruction, result } = resolveCurrentAdvisoryReviewPrompt(getRequiredWorkspaceRoot());
  clipboard.writeText(instruction);
  return result;
});

ipcMain.handle("currentWorkflow:applyOperatorValidationDecision", (
  _event,
  input: OperatorValidationDecisionInput,
): RuntimeActionResult => {
  return applyOperatorValidationDecisionForCurrentWorkCard(getRequiredWorkspaceRoot(), input);
});

ipcMain.handle("currentWorkflow:applyDisposition", (
  _event,
  status: DocumentDispositionStatus,
  operatorReviewNotes = "",
  targetWorkspaceId?: WorkspaceId,
): RuntimeActionResult => {
  return applyCurrentDisposition(getRequiredWorkspaceRoot(), status, operatorReviewNotes, targetWorkspaceId);
});

ipcMain.handle("currentWorkflow:createRepair", (_event, defect = ""): RuntimeActionResult => {
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

ipcMain.handle("currentWorkflow:getRepairWorkspaceProjection", (): RuntimeActionResult => {
  return getCurrentRepairWorkspaceProjection(getRequiredWorkspaceRoot());
});

ipcMain.handle("currentWorkflow:getCloseReturnSelectionProjection", (): RuntimeActionResult => {
  return getCloseReturnSelectionProjection(getRequiredWorkspaceRoot());
});

ipcMain.handle("currentWorkflow:generateCloseReturnNextIntakeHandoff", (): RuntimeActionResult => {
  return generateCloseReturnNextIntakeHandoff(getRequiredWorkspaceRoot());
});

app.whenReady().then(() => {
  void getAgentHarnessService().start();
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

app.on("before-quit", (event) => {
  if (quitAfterCodexCleanup) {
    return;
  }
  event.preventDefault();
  void Promise.all([
    codexImplementerExecutionService.shutdownActiveExecutions(),
    getAgentHarnessService().stop(),
  ])
    .catch((error) => {
      console.error("Codex App Server shutdown cleanup failed.", error);
    })
    .finally(() => {
      quitAfterCodexCleanup = true;
      app.quit();
    });
});

function getAgentHarnessService(): AgentHarnessService {
  if (!agentHarnessService) {
    agentHarnessService = new AgentHarnessService({
      userDataRoot: getUserDataRoot(),
      getSelectedProjectRoot: getRequiredWorkspaceRoot,
      gitMutationAuthorized: () => false,
      ...agentHarnessEnvironmentOverrides(),
    });
  }
  return agentHarnessService;
}

function agentHarnessEnvironmentOverrides(): Partial<ConstructorParameters<typeof AgentHarnessService>[0]> {
  const overrides: Partial<ConstructorParameters<typeof AgentHarnessService>[0]> = {};
  if (process.env.CHAMPCITY_AGENT_HARNESS_ENABLED !== undefined) {
    overrides.enabled = process.env.CHAMPCITY_AGENT_HARNESS_ENABLED !== "false";
  }
  if (process.env.CHAMPCITY_AGENT_HARNESS_HOST !== undefined) {
    overrides.host = process.env.CHAMPCITY_AGENT_HARNESS_HOST;
  }
  if (process.env.CHAMPCITY_AGENT_HARNESS_PORT !== undefined) {
    overrides.port = Number.parseInt(process.env.CHAMPCITY_AGENT_HARNESS_PORT, 10);
  }
  if (process.env.CHAMPCITY_AGENT_HARNESS_PUBLIC_BASE_URL !== undefined) {
    overrides.publicBaseUrl = process.env.CHAMPCITY_AGENT_HARNESS_PUBLIC_BASE_URL;
  }
  if (process.env.CHAMPCITY_AGENT_HARNESS_LOCAL_AUTH !== undefined) {
    overrides.allowUnauthenticatedLocal =
      process.env.CHAMPCITY_AGENT_HARNESS_LOCAL_AUTH === "development-unauthenticated" &&
      !process.env.CHAMPCITY_AGENT_HARNESS_PUBLIC_BASE_URL;
  }
  return overrides;
}
