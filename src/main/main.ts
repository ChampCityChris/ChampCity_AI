import type { CodexModelSelection } from "../shared/codexRuntimeContracts";
import { createGithubRuntimeOperations } from "./externalProviders/githubRuntime";
import { GithubProviderService } from "./externalProviders/githubProviderService";
import { registerGithubProviderIpc } from "./externalProviders/githubProviderIpc";
import { productIdentity } from "../shared/productIdentity";
import { codexRuntimeManager } from "./workCardBuilding/codexRuntimeManager";
import { createCodexRuntimeExecutionOperations } from "./workCardBuilding/codexRuntimeOperations";
import { CodexRuntimeInitializerClient } from "./workCardBuilding/codexRuntimeInitializerClient";
import { app, BrowserWindow, clipboard, dialog, ipcMain, Menu } from "electron";
import fs from "node:fs";
import path from "node:path";
import {
  clearSelectedWorkspace,
  saveSelectedWorkspace,
  validateWorkspaceRoot,
} from "./workspaceSettings";
import { SessionActiveWorkspaceSelection } from "./sessionActiveWorkspaceSelection";
import { AgentHarnessServiceHostClient } from "./agentHarness/runtime/agentHarnessServiceHostClient";
import {
  acquireDesktopLifecycleLease,
  releaseDesktopLifecycleLease,
  type DesktopLifecycleLease,
} from "./agentHarness/runtime/desktopLifecycleLease";
import { computeAgentHarnessRuntimeBuildIdentity } from "./agentHarness/runtime/agentHarnessBuildIdentity";
import {
  initializeAgentHarnessServiceHostLifecycleSettings,
  readAgentHarnessServiceHostLifecycleSettings,
  validateAgentHarnessServiceHostLifecycleSettingsInput,
  writeAgentHarnessServiceHostLifecycleSettings,
} from "./agentHarness/runtime/agentHarnessServiceHostLifecycleSettings";
import {
  readChampCityInstalledScopeMetadata,
  startupRegistrationScopeForInstallScope,
} from "./agentHarness/runtime/champCityInstalledScope";
import {
  applyAgentHarnessServiceHostStartupRegistration,
  computeAgentHarnessServiceHostDesktopLaunchTarget,
  readAgentHarnessServiceHostStartupRegistration,
  type AgentHarnessServiceHostLaunchTargetInput,
} from "./agentHarness/runtime/agentHarnessServiceHostStartupRegistration";
import { launchDetachedChampCitySiblingProcess } from "./agentHarness/runtime/champCitySiblingProcessLaunch";
import {
  applyDispositionInitialization,
  listPlanningDocuments,
  previewDispositionInitialization,
  readPlanningDocument,
  setGenericDocumentDispositionWithPlanningContext,
} from "./documents/planningDocumentService";
import {
  buildDevelopmentPostMutationProjection,
  buildStableDevelopmentPostMutationResult,
  createFinalDevelopmentPlanningContext,
} from "./documents/developmentPostMutationProjection";
import { resolveFirstNonApprovedDocument } from "./documents/firstNonApprovedResolver";
import { submitProjectIntakeForRepository } from "./projectIntake/projectIntakeService";
import { getWorkIntakeProjection, readWorkIntake, submitWorkIntake } from "./workIntake/workIntakeService";
import { copyWorkRoutingAssessment, getWorkRoutingAssessment, prepareWorkRoutingAssessment } from "./workIntake/workRoutingAssessmentService";
import type { WorkIntakeSubmission } from "../shared/workIntakeContracts";
import {
  attachArchitectBrowserSurface,
  confirmArchitectSignedIn,
  detachArchitectBrowserSurface,
  getArchitectBrowserFoundationStatus,
  reloadArchitectBrowserSurface,
  setArchitectBrowserBounds,
  subscribeArchitectBrowserFoundationStatus,
} from "./browser/architectBrowserService";
import { SelectedWorkspaceEvidenceNotifier } from "./workspaceEvidence/selectedWorkspaceEvidenceNotifier";
import {
  getArchitectOutputWorkspaceModel,
  prepareArchitectInterviewFinalDraftHandoffWorkspace,
  prepareArchitectOutputHandoff,
  preparePhaseInterviewFinalDraftHandoffWorkspace,
  regenerateArchitectInterviewPromptWorkspace,
  resolveArchitectInterviewCopyFinalDraftHandoff,
  resolveArchitectOutputCopyHandoff,
  resolvePhaseInterviewCopyFinalDraftHandoff,
  mutateArchitectOutputReviewWithPlanningContext,
} from "./architectOutputs/architectOutputWorkspaceService";
import {
  getProjectPlanningWorkspaceModel as getCurrentProjectPlanningWorkspaceModel,
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
  getCurrentWorkspaceModelFromContext,
  getCurrentWorkCardMapProjection,
  getPhaseValidationActionProjection,
  resolveCurrentAdvisoryReviewPrompt,
} from "./currentWorkflow/currentWorkflowService";
import { codexImplementerExecutionService } from "./workCardBuilding/codexImplementerExecutionService";
import {
  migrateWorkspaceToCanonicalMarkdownV1,
  previewWorkspaceMigrationToCanonicalMarkdownV1,
} from "./migrations/pairedArtifactsToCanonicalMarkdownV1";
import {
  applyIssueArchitectReview,
  applyIssuePlanningReview,
  createLightweightIssueRecord,
  discoverIssueInventory,
  getIssueCloseProjection,
  getIssueArchitectPlanningProjection,
  getIssueFixCardProjection,
  getIssuePlanningProjection,
  getIssueResolutionNavigationProjection,
  getIssueValidationProjection,
  prepareIssueArchitectPlanningHandoff,
  prepareIssueFixCardPlanningHandoff,
  prepareIssuePlanningHandoff,
  promoteIssueArchitectPlanningDraft,
  reserveIssueFixCardImplementerReport,
  resolveIssueArchitectPlanningCopyHandoff,
  resolveIssueFixCardAdvisoryReviewPrompt,
  resolveIssueFixCardPlanningCopyHandoff,
  resolveIssuePlanningCopyHandoff,
  selectIssueFixCardCandidate,
  applyIssueFixCardContractReview,
  applyIssueFixCardValidationDecision,
  applyIssueValidationDecision,
  closeIssue,
  closeIssueFixCard,
  prepareIssueFixCardRepairHandoff,
  resolveIssueFixCardRepairCopyHandoff,
} from "./issueResolution/issueResolutionService";
import { buildLocalRendererContextMenuTemplate } from "./contextMenu/localRendererContextMenu";
import type { DocumentDispositionStatus } from "../shared/documents/documentDisposition";
import type {
  AppInfo,
  BeginWorkCardPlanningOptions,
  BrowserViewBounds,
  ClosureDecision,
  ProjectIntakeSubmission,
  ProjectIntakeSubmissionResult,
  ArchitectBrowserBoundsAck,
  ArchitectBrowserFoundationStatus,
  ArchitectOutputPresentedSlotRevision,
  ArchitectOutputWorkspaceModel,
  ArchitectOutputReviewResult,
  CodexApprovalResponse,
  CodexImplementerExecutionModel,
  CodexMcpElicitationResponse,
  CodexUserInputResponse,
  CurrentWorkspaceModel,
  CurrentWorkflowMutationResult,
  DocumentDispositionTransactionResult,
  OperatorValidationDecisionInput,
  PhaseValidationActionProjection,
  ProjectPlanningWorkspaceModel,
  RuntimeActionResult,
  WorkCardMapProjectionOptions,
  WorkspaceId,
  WorkspaceMigrationPreview,
  WorkspaceMigrationResult,
  WorkspaceSelection,
  AgentHarnessSettingsInput,
  AgentHarnessServiceHostLifecycleSettingsInput,
  AgentHarnessServiceHostLifecycleStatus,
  LegacyOAuthClientImportResult,
  AgentHarnessWorkspaceRegistrationResult,
  AgentHarnessWorkspaceRegistrySnapshot,
} from "../shared/workspaceContracts";
import type { NewIssueInput } from "../shared/issueResolutionContracts";
import type {
  IssueArchitectReviewInput,
  IssueCloseActionInput,
  IssueFixCardLoopStepId,
  IssueFixCardValidationDecisionInput,
  IssueValidationDecisionInput,
} from "../shared/issueResolutionContracts";

const userDataRootOverride = process.env.CHAMPCITY_USER_DATA_ROOT;
if (userDataRootOverride) {
  app.setPath("userData", path.resolve(userDataRootOverride));
}

const appInfo: AppInfo = {
  name: productIdentity.productName,
  version: app.getVersion(),
};
let mainWindow: BrowserWindow | null = null;
let quitAfterCodexCleanup = false;
let agentHarnessServiceHostClient: AgentHarnessServiceHostClient | null = null;
let agentHarnessStartupRegistrationError: string | null = null;
const desktopSingleInstanceLockAcquired = app.requestSingleInstanceLock({
  userDataRoot: getUserDataRoot(),
});
let desktopLifecycleLease: DesktopLifecycleLease | null = null;
let desktopExclusionConfirmed = false;
let desktopRuntimeReady = false;
let pendingSecondInstanceActivation = false;
const sessionActiveWorkspace = new SessionActiveWorkspaceSelection();
const githubProviderService = new GithubProviderService({ runtime: createGithubRuntimeOperations(getUserDataRoot()) });
registerGithubProviderIpc(ipcMain, githubProviderService, getRequiredWorkspaceRoot);
const selectedWorkspaceEvidenceNotifier = new SelectedWorkspaceEvidenceNotifier((notification) => {
  sendRendererEvent("workspace:evidenceChanged", notification);
});

subscribeArchitectBrowserFoundationStatus((status) => {
  sendRendererEvent("architectBrowser:statusChanged", status);
});

function sendRendererEvent(channel: string, payload: unknown): void {
  if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

function getUserDataRoot(): string {
  return app.getPath("userData");
}

function getRequiredWorkspaceRoot(): string {
  return sessionActiveWorkspace.requireWorkspaceRoot();
}

function createMainWindow(): void {
  const preloadPath = path.join(__dirname, "../preload/index.js");
  const rendererPath = path.join(__dirname, "../renderer/index.html");
  const nativeWindowIconPath = path.join(__dirname, "../branding/ChampCity-AI.ico");

  mainWindow = new BrowserWindow({
    width: 1160,
    height: 780,
    minWidth: 900,
    minHeight: 620,
    title: productIdentity.productName,
    icon: nativeWindowIconPath,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: preloadPath,
      spellcheck: true,
    },
  });

  registerLocalRendererContextMenu(mainWindow);
  void mainWindow.loadFile(rendererPath);
  mainWindow.once("closed", () => {
    mainWindow = null;
  });
}

function activateMainWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createMainWindow();
    return;
  }
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.show();
  mainWindow.focus();
}

app.on("second-instance", () => {
  pendingSecondInstanceActivation = true;
  activateDesktopAfterExclusion();
});

function activateDesktopAfterExclusion(): void {
  if (!desktopExclusionConfirmed || !desktopRuntimeReady) {
    return;
  }
  pendingSecondInstanceActivation = false;
  activateMainWindow();
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
  return sessionActiveWorkspace.currentSelection();
});

ipcMain.handle("workspace:choose", async (): Promise<WorkspaceSelection> => {
  const result = await dialog.showOpenDialog({
    title: "Choose ChampCity A/I Workspace",
    // A relative directory keeps Windows' native last-used folder. Electron 43+
    // forces Downloads for an empty path; only absolute paths call SetFolder.
    defaultPath: process.platform === "win32" ? "." : undefined,
    properties: ["openDirectory"],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return sessionActiveWorkspace.retainCurrentSelection();
  }

  const selection = saveSelectedWorkspace(getUserDataRoot(), result.filePaths[0]);
  if (!selection.ok) {
    throw new Error(selection.reason);
  }
  const evidenceGeneration = selectedWorkspaceEvidenceNotifier.selectWorkspace(selection.workspaceRoot);
  const activeSelection = sessionActiveWorkspace.activateFromValidation(
    { ...selection, evidenceGeneration },
    () => detachArchitectBrowserSurface(),
  );
  if (!activeSelection.ok) {
    selectedWorkspaceEvidenceNotifier.clear();
    throw new Error(activeSelection.reason);
  }
  try {
    await getAgentHarnessServiceHostClient().registerWorkspace(activeSelection.workspaceRoot);
    return activeSelection;
  } catch (error) {
    return {
      ...activeSelection,
      mcpRegistrationError: boundedLifecycleError(error),
    };
  }
});

ipcMain.handle("workspace:clear", (): WorkspaceSelection => {
  sessionActiveWorkspace.deactivate(deactivateSelectedWorkspaceRuntime);
  return clearSelectedWorkspace(getUserDataRoot());
});

ipcMain.handle("app:info", (): AppInfo => {
  return appInfo;
});

ipcMain.handle("agentHarness:status", () => {
  return getAgentHarnessServiceHostClient().status();
});

ipcMain.handle("agentHarness:serviceHostLifecycleStatus", () => {
  return getAgentHarnessServiceHostLifecycleStatus();
});

ipcMain.handle("agentHarness:startBackgroundAgent", async () => {
  await getAgentHarnessServiceHostClient().startBackgroundAgent();
  return getAgentHarnessServiceHostLifecycleStatus();
});

ipcMain.handle("agentHarness:exitBackgroundAgent", async () => {
  await getAgentHarnessServiceHostClient().exitBackgroundAgent();
  return getAgentHarnessServiceHostLifecycleStatus();
});

ipcMain.handle("agentHarness:restartServiceHost", async () => {
  await getAgentHarnessServiceHostClient().controlledRestartServiceHost();
  return getAgentHarnessServiceHostLifecycleStatus();
});

ipcMain.handle(
  "agentHarness:saveServiceHostLifecycleSettings",
  (_event, input: AgentHarnessServiceHostLifecycleSettingsInput) => {
    const settings = validateAgentHarnessServiceHostLifecycleSettingsInput(input);
    writeAgentHarnessServiceHostLifecycleSettings(getUserDataRoot(), settings);
    try {
      const installedScope = readChampCityInstalledScopeMetadata();
      applyAgentHarnessServiceHostStartupRegistration(
        app,
        currentAgentHarnessServiceHostLaunchTargetInput(),
        settings,
        process.platform,
        installedScope,
      );
      agentHarnessStartupRegistrationError = null;
    } catch (error) {
      agentHarnessStartupRegistrationError = boundedLifecycleError(error);
    }
    return getAgentHarnessServiceHostLifecycleStatus();
  },
);

ipcMain.handle("agentHarness:saveSettings", (_event, settings: AgentHarnessSettingsInput) => {
  return getAgentHarnessServiceHostClient().saveConfiguration(settings);
});

ipcMain.handle("agentHarness:importLegacyOAuthClients", async (): Promise<LegacyOAuthClientImportResult> => {
  const result = await dialog.showOpenDialog({
    title: "Import Legacy OAuth Client Registry",
    defaultPath: process.platform === "win32" ? "." : undefined,
    properties: ["openFile"],
    filters: [{ name: "OAuth client registry", extensions: ["json"] }],
  });
  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }
  const source = JSON.parse(await fs.promises.readFile(result.filePaths[0], "utf8")) as unknown;
  return getAgentHarnessServiceHostClient().importLegacyOAuthClientRegistry(source);
});

ipcMain.handle("agentHarness:start", () => {
  return getAgentHarnessServiceHostClient().start();
});

ipcMain.handle("agentHarness:stop", () => {
  return getAgentHarnessServiceHostClient().stop();
});

ipcMain.handle("agentHarness:restart", () => {
  return getAgentHarnessServiceHostClient().restart();
});

ipcMain.handle("agentHarness:listRegisteredWorkspaces", (): Promise<AgentHarnessWorkspaceRegistrySnapshot> => {
  return getAgentHarnessServiceHostClient().listRegisteredWorkspaces();
});

ipcMain.handle("agentHarness:chooseAndRegisterWorkspace", async (): Promise<AgentHarnessWorkspaceRegistrationResult> => {
  const result = await dialog.showOpenDialog({
    title: "Register ChampCity MCP Project",
    defaultPath: process.platform === "win32" ? "." : undefined,
    properties: ["openDirectory"],
  });
  if (result.canceled || result.filePaths.length === 0) {
    return {
      canceled: true,
      registry: await getAgentHarnessServiceHostClient().listRegisteredWorkspaces(),
    };
  }
  const validation = validateWorkspaceRoot(result.filePaths[0]);
  if (!validation.ok) {
    throw new Error(validation.reason);
  }
  const registered = await getAgentHarnessServiceHostClient().registerWorkspace(validation.workspaceRoot);
  return { canceled: false, ...registered };
});

ipcMain.handle("agentHarness:unregisterWorkspace", (_event, workspaceId: string) => {
  return getAgentHarnessServiceHostClient().unregisterWorkspace(workspaceId);
});

ipcMain.handle("documents:list", () => {
  return listPlanningDocuments(getRequiredWorkspaceRoot());
});

ipcMain.handle("documents:read", (_event, logicalDocumentId: string) => {
  return readPlanningDocument(getRequiredWorkspaceRoot(), logicalDocumentId);
});

ipcMain.handle(
  "documents:setDisposition",
  (_event, logicalDocumentId: string, status: DocumentDispositionStatus): DocumentDispositionTransactionResult => {
    const workspaceRoot = getRequiredWorkspaceRoot();
    const mutation = setGenericDocumentDispositionWithPlanningContext(
      workspaceRoot,
      logicalDocumentId,
      status,
      {},
      () => createFinalDevelopmentPlanningContext(workspaceRoot),
    );
    return buildStableDevelopmentPostMutationResult(
      workspaceRoot,
      mutation.planningContext,
      (planningContext) => {
        const currentModel = getCurrentWorkspaceModelFromContext(workspaceRoot, planningContext);
        const development = buildDevelopmentPostMutationProjection(
          workspaceRoot,
          planningContext,
          currentModel,
          logicalDocumentId,
        );
        const document = development.documents.find((entry) =>
          entry.logicalDocumentId === logicalDocumentId
        );
        if (!document) {
          throw new Error("Updated planning document is missing from stable post-mutation projection.");
        }
        return { document, development };
      },
    );
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

ipcMain.handle("issueResolution:discoverIssues", () => {
  return discoverIssueInventory(getRequiredWorkspaceRoot());
});

ipcMain.handle(
  "issueResolution:createIssue",
  (_event, input: NewIssueInput) => {
    return createLightweightIssueRecord(getRequiredWorkspaceRoot(), input);
  },
);

ipcMain.handle(
  "issueResolution:getArchitectPlanning",
  (_event, issueId: string | null) => {
    return getIssueArchitectPlanningProjection(getRequiredWorkspaceRoot(), issueId);
  },
);

ipcMain.handle(
  "issueResolution:prepareArchitectHandoff",
  (_event, issueId: string) => {
    return prepareIssueArchitectPlanningHandoff(getRequiredWorkspaceRoot(), issueId);
  },
);

ipcMain.handle(
  "issueResolution:copyArchitectHandoff",
  async (_event, issueId: string) => {
    const workspaceRoot = getRequiredWorkspaceRoot();
    const { instruction, result } = resolveIssueArchitectPlanningCopyHandoff(workspaceRoot, issueId);
    await clipboard.writeText(instruction);
    return result;
  },
);

ipcMain.handle(
  "issueResolution:promoteArchitectDraft",
  (_event, issueId: string) => {
    return promoteIssueArchitectPlanningDraft(getRequiredWorkspaceRoot(), issueId);
  },
);

ipcMain.handle(
  "issueResolution:applyArchitectReview",
  (_event, issueId: string, input: IssueArchitectReviewInput) => {
    return applyIssueArchitectReview(getRequiredWorkspaceRoot(), issueId, input);
  },
);

ipcMain.handle(
  "issueResolution:getIssuePlanning",
  (_event, issueId: string | null) => {
    return getIssuePlanningProjection(getRequiredWorkspaceRoot(), issueId);
  },
);

ipcMain.handle(
  "issueResolution:getNavigation",
  (_event, issueId: string | null) => {
    return getIssueResolutionNavigationProjection(getRequiredWorkspaceRoot(), issueId);
  },
);

ipcMain.handle(
  "issueResolution:getIssueValidation",
  (_event, issueId: string | null) => {
    return getIssueValidationProjection(getRequiredWorkspaceRoot(), issueId);
  },
);

ipcMain.handle(
  "issueResolution:applyIssueValidationDecision",
  (_event, issueId: string, input: IssueValidationDecisionInput) => {
    return applyIssueValidationDecision(getRequiredWorkspaceRoot(), issueId, input);
  },
);

ipcMain.handle(
  "issueResolution:getIssueClose",
  (_event, issueId: string | null) => {
    return getIssueCloseProjection(getRequiredWorkspaceRoot(), issueId);
  },
);

ipcMain.handle(
  "issueResolution:closeIssue",
  (_event, issueId: string, input: IssueCloseActionInput) => {
    return closeIssue(getRequiredWorkspaceRoot(), issueId, input);
  },
);

ipcMain.handle(
  "issueResolution:prepareIssuePlanningHandoff",
  (_event, issueId: string) => {
    return prepareIssuePlanningHandoff(getRequiredWorkspaceRoot(), issueId);
  },
);

ipcMain.handle(
  "issueResolution:copyIssuePlanningHandoff",
  async (_event, issueId: string) => {
    const workspaceRoot = getRequiredWorkspaceRoot();
    const { instruction, result } = resolveIssuePlanningCopyHandoff(workspaceRoot, issueId);
    await clipboard.writeText(instruction);
    return result;
  },
);

ipcMain.handle(
  "issueResolution:applyIssuePlanningReview",
  (_event, issueId: string, input: IssueArchitectReviewInput) => {
    return applyIssuePlanningReview(getRequiredWorkspaceRoot(), issueId, input);
  },
);

ipcMain.handle(
  "issueResolution:getIssueFixCard",
  (_event, issueId: string | null, currentStep?: IssueFixCardLoopStepId) => {
    return getIssueFixCardProjection(getRequiredWorkspaceRoot(), issueId, currentStep);
  },
);

ipcMain.handle(
  "issueResolution:selectIssueFixCardCandidate",
  (_event, issueId: string, fixCardId: string, currentStep?: IssueFixCardLoopStepId) => {
    return selectIssueFixCardCandidate(getRequiredWorkspaceRoot(), issueId, fixCardId, currentStep);
  },
);

ipcMain.handle(
  "issueResolution:prepareIssueFixCardPlanningHandoff",
  (_event, issueId: string, currentStep?: IssueFixCardLoopStepId) => {
    return prepareIssueFixCardPlanningHandoff(getRequiredWorkspaceRoot(), issueId, currentStep);
  },
);

ipcMain.handle(
  "issueResolution:copyIssueFixCardPlanningHandoff",
  async (_event, issueId: string, currentStep?: IssueFixCardLoopStepId) => {
    const workspaceRoot = getRequiredWorkspaceRoot();
    const { instruction, result } = resolveIssueFixCardPlanningCopyHandoff(workspaceRoot, issueId, currentStep);
    await clipboard.writeText(instruction);
    return result;
  },
);

ipcMain.handle(
  "issueResolution:applyIssueFixCardContractReview",
  (_event, issueId: string, input: IssueArchitectReviewInput, currentStep?: IssueFixCardLoopStepId) => {
    return applyIssueFixCardContractReview(getRequiredWorkspaceRoot(), issueId, input, currentStep);
  },
);

ipcMain.handle(
  "issueResolution:reserveIssueFixCardImplementerReport",
  (_event, issueId: string, currentStep?: IssueFixCardLoopStepId) => {
    return reserveIssueFixCardImplementerReport(getRequiredWorkspaceRoot(), issueId, currentStep);
  },
);

ipcMain.handle(
  "issueResolution:copyIssueFixCardAdvisoryReviewPrompt",
  async (_event, issueId: string, currentStep?: IssueFixCardLoopStepId) => {
    const workspaceRoot = getRequiredWorkspaceRoot();
    const { instruction, result } = resolveIssueFixCardAdvisoryReviewPrompt(workspaceRoot, issueId, currentStep);
    await clipboard.writeText(instruction);
    return result;
  },
);

ipcMain.handle(
  "issueResolution:applyIssueFixCardValidationDecision",
  (_event, issueId: string, input: IssueFixCardValidationDecisionInput, currentStep?: IssueFixCardLoopStepId) => {
    return applyIssueFixCardValidationDecision(getRequiredWorkspaceRoot(), issueId, input, currentStep);
  },
);

ipcMain.handle(
  "issueResolution:prepareIssueFixCardRepairHandoff",
  (_event, issueId: string, currentStep?: IssueFixCardLoopStepId) => {
    return prepareIssueFixCardRepairHandoff(getRequiredWorkspaceRoot(), issueId, currentStep);
  },
);

ipcMain.handle(
  "issueResolution:copyIssueFixCardRepairHandoff",
  async (_event, issueId: string, currentStep?: IssueFixCardLoopStepId) => {
    const workspaceRoot = getRequiredWorkspaceRoot();
    const { instruction, result } = resolveIssueFixCardRepairCopyHandoff(workspaceRoot, issueId, currentStep);
    await clipboard.writeText(instruction);
    return result;
  },
);

ipcMain.handle(
  "issueResolution:closeIssueFixCard",
  (_event, issueId: string, currentStep?: IssueFixCardLoopStepId) => {
    return closeIssueFixCard(getRequiredWorkspaceRoot(), issueId, currentStep);
  },
);

ipcMain.handle(
  "issueResolution:getIssueCodexStatus",
  (_event, issueId: string, fixCardId: string, currentImplementationId?: string): Promise<CodexImplementerExecutionModel> => {
    return codexImplementerExecutionService.getStatus(getRequiredWorkspaceRoot(), {
      ownerKind: "issue",
      issueId,
      fixCardId,
      currentImplementationId,
    });
  },
);

ipcMain.handle(
  "issueResolution:startIssueCodex",
  (_event, issueId: string, fixCardId: string, currentImplementationId: string | undefined, selection: CodexModelSelection): Promise<CodexImplementerExecutionModel> => {
    return codexImplementerExecutionService.start(getRequiredWorkspaceRoot(), {
      ownerKind: "issue",
      issueId,
      fixCardId,
      currentImplementationId,
    }, selection);
  },
);

ipcMain.handle(
  "issueResolution:startIssueCodexEnvironmentResolution",
  (_event, issueId: string, fixCardId: string, currentImplementationId?: string): Promise<CodexImplementerExecutionModel> => {
    return codexImplementerExecutionService.startEnvironmentResolution(getRequiredWorkspaceRoot(), {
      ownerKind: "issue",
      issueId,
      fixCardId,
      currentImplementationId,
    });
  },
);

ipcMain.handle("workIntake:projection", () => getWorkIntakeProjection(getRequiredWorkspaceRoot()));
ipcMain.handle("workIntake:read", (_event, intakeId: string) => readWorkIntake(getRequiredWorkspaceRoot(), intakeId));
ipcMain.handle("workIntake:submit", (_event, submission: WorkIntakeSubmission) => submitWorkIntake(getRequiredWorkspaceRoot(), submission));
ipcMain.handle("workRouting:prepare", (_event, intakeId: string) => prepareWorkRoutingAssessment(getRequiredWorkspaceRoot(), intakeId));
ipcMain.handle("workRouting:status", (_event, intakeId: string) => getWorkRoutingAssessment(getRequiredWorkspaceRoot(), intakeId));
ipcMain.handle("workRouting:copy", async (_event, intakeId: string) => {
  const instruction = await copyWorkRoutingAssessment(getRequiredWorkspaceRoot(), intakeId);
  clipboard.writeText(instruction);
});

ipcMain.handle(
  "projectIntake:submit",
  (_event, submission: ProjectIntakeSubmission): ProjectIntakeSubmissionResult => {
    return submitProjectIntakeForRepository(getRequiredWorkspaceRoot(), submission);
  },
);

ipcMain.handle("architectBrowser:foundationStatus", (): ArchitectBrowserFoundationStatus => {
  return getArchitectBrowserFoundationStatus();
});

ipcMain.handle("architectBrowser:show", (_event, attachmentGeneration?: number): ArchitectBrowserFoundationStatus => {
  if (!mainWindow) {
    throw new Error("Main window is not available.");
  }
  return attachArchitectBrowserSurface(mainWindow, attachmentGeneration);
});

ipcMain.handle("architectBrowser:setBounds", (_event, bounds: BrowserViewBounds): ArchitectBrowserBoundsAck => {
  return setArchitectBrowserBounds(bounds);
});

ipcMain.handle("architectBrowser:hide", (_event, attachmentGeneration?: number): ArchitectBrowserFoundationStatus => {
  return detachArchitectBrowserSurface(attachmentGeneration);
});

ipcMain.handle("architectBrowser:confirmSignedIn", (): ArchitectBrowserFoundationStatus => {
  return confirmArchitectSignedIn();
});

ipcMain.handle("architectBrowser:reload", (): ArchitectBrowserFoundationStatus => {
  return reloadArchitectBrowserSurface();
});

ipcMain.handle(
  "projectPlanning:getWorkspaceModel",
  (): ProjectPlanningWorkspaceModel => {
    return getCurrentProjectPlanningWorkspaceModel(getRequiredWorkspaceRoot());
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
  async (_event, workspaceId: WorkspaceId): Promise<RuntimeActionResult> => {
    const workspaceRoot = getRequiredWorkspaceRoot();
    const { instruction, result } = resolveArchitectOutputCopyHandoff(workspaceRoot, workspaceId);
    await clipboard.writeText(instruction);
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
  async (): Promise<RuntimeActionResult> => {
    const workspaceRoot = getRequiredWorkspaceRoot();
    const { instruction, result } = resolveArchitectInterviewCopyFinalDraftHandoff(workspaceRoot);
    await clipboard.writeText(instruction);
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
  async (): Promise<RuntimeActionResult> => {
    const workspaceRoot = getRequiredWorkspaceRoot();
    const { instruction, result } = resolvePhaseInterviewCopyFinalDraftHandoff(workspaceRoot);
    await clipboard.writeText(instruction);
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
    selectedDocumentId?: string | null,
  ): ArchitectOutputReviewResult => {
    const workspaceRoot = getRequiredWorkspaceRoot();
    const planningContext = mutateArchitectOutputReviewWithPlanningContext(
      workspaceRoot,
      workspaceId,
      status,
      operatorReviewNotes,
      presentedRevisions,
    );
    return buildStableDevelopmentPostMutationResult(
      workspaceRoot,
      planningContext,
      (stablePlanningContext) => {
        const currentModel = getCurrentWorkspaceModelFromContext(workspaceRoot, stablePlanningContext);
        return {
          architectOutput: getArchitectOutputWorkspaceModel(
            workspaceRoot,
            workspaceId,
            stablePlanningContext,
          ),
          development: buildDevelopmentPostMutationProjection(
            workspaceRoot,
            stablePlanningContext,
            currentModel,
            selectedDocumentId,
          ),
        };
      },
    );
  },
);

ipcMain.handle("currentWorkflow:getModel", (): CurrentWorkspaceModel => {
  return getCurrentWorkspaceModel(getRequiredWorkspaceRoot());
});

ipcMain.handle("currentWorkflow:getPhaseValidationActionProjection", (): PhaseValidationActionProjection => {
  return getPhaseValidationActionProjection(getRequiredWorkspaceRoot());
});

ipcMain.handle("codexImplementer:getStatus", (): Promise<CodexImplementerExecutionModel> => {
  return codexImplementerExecutionService.getStatus(getRequiredWorkspaceRoot());
});

ipcMain.handle("codexRuntime:getStatus", () => codexRuntimeManager.getStatus());
ipcMain.handle("codexRuntime:setSelection", (_event, selection: unknown) => codexRuntimeManager.setSelection(selection));

ipcMain.handle("codexImplementer:start", (_event, selection: CodexModelSelection): Promise<CodexImplementerExecutionModel> => {
  return codexImplementerExecutionService.start(getRequiredWorkspaceRoot(), undefined, selection);
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

ipcMain.handle("currentWorkflow:copyAdvisoryReviewPrompt", async (): Promise<RuntimeActionResult> => {
  const { instruction, result } = resolveCurrentAdvisoryReviewPrompt(getRequiredWorkspaceRoot());
  await clipboard.writeText(instruction);
  return result;
});

ipcMain.handle("currentWorkflow:applyOperatorValidationDecision", (
  _event,
  input: OperatorValidationDecisionInput,
  selectedDocumentId?: string | null,
): CurrentWorkflowMutationResult => {
  return applyOperatorValidationDecisionForCurrentWorkCard(
    getRequiredWorkspaceRoot(),
    input,
    selectedDocumentId,
  );
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

ipcMain.handle("currentWorkflow:generateCloseReturnNextIntakeHandoff", (_event, candidateId: string): RuntimeActionResult => {
  return generateCloseReturnNextIntakeHandoff(getRequiredWorkspaceRoot(), candidateId);
});

if (!desktopSingleInstanceLockAcquired) {
  app.quit();
} else {
  void acquireDesktopLifecycleLease(getUserDataRoot(), "desktop")
    .then(async (acquisition) => {
      if (!acquisition.acquired) {
        app.releaseSingleInstanceLock();
        app.quit();
        return;
      }
      desktopLifecycleLease = acquisition.lease;
      desktopExclusionConfirmed = true;
      await app.whenReady();
      await githubProviderService.restore();
      const codexUserDataRoot = getUserDataRoot();
      void codexRuntimeManager.initialize(
        new CodexRuntimeInitializerClient({
          workerEntryPath: path.join(__dirname, "workCardBuilding/codexRuntimeInitializerWorker.js"),
          userDataRoot: codexUserDataRoot,
        }),
        createCodexRuntimeExecutionOperations(codexUserDataRoot),
      );
      initializeAgentHarnessServiceHostStartupRegistration();
      try {
        await getAgentHarnessServiceHostClient().startBackgroundAgent();
      } catch {
        // The UI remains available while bounded Service Host failures surface through status.
      }
      createMainWindow();
      desktopRuntimeReady = true;
      if (pendingSecondInstanceActivation) {
        activateDesktopAfterExclusion();
      }

      app.on("activate", () => {
        if (desktopExclusionConfirmed && desktopRuntimeReady && BrowserWindow.getAllWindows().length === 0) {
          createMainWindow();
        }
      });
    })
    .catch((error) => {
      console.error("ChampCity desktop lifecycle exclusion failed.", error);
      app.releaseSingleInstanceLock();
      app.quit();
    });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("will-quit", () => {
  if (desktopLifecycleLease) {
    void releaseDesktopLifecycleLease(getUserDataRoot(), desktopLifecycleLease);
    desktopLifecycleLease = null;
    desktopExclusionConfirmed = false;
    desktopRuntimeReady = false;
  }
});

app.on("before-quit", (event) => {
  if (quitAfterCodexCleanup) {
    return;
  }
  event.preventDefault();
  selectedWorkspaceEvidenceNotifier.clear();
  agentHarnessServiceHostClient?.disconnect();
  void Promise.all([
    codexImplementerExecutionService.shutdownActiveExecutions(),
    codexRuntimeManager.shutdown(),
    githubProviderService.disconnect(),
  ])
    .catch((error) => {
      console.error("Codex App Server shutdown cleanup failed.", error);
    })
    .finally(() => {
      quitAfterCodexCleanup = true;
      app.quit();
    });
});

function deactivateSelectedWorkspaceRuntime(_workspaceRoot: string): void {
  selectedWorkspaceEvidenceNotifier.clear();
  detachArchitectBrowserSurface();
}

function getAgentHarnessServiceHostClient(): AgentHarnessServiceHostClient {
  if (!agentHarnessServiceHostClient) {
    agentHarnessServiceHostClient = new AgentHarnessServiceHostClient({
      userDataRoot: getUserDataRoot(),
      launchServiceHost: launchIndependentAgentHarnessServiceHost,
      expectedBuildIdentity: computeAgentHarnessRuntimeBuildIdentity(__dirname),
    });
  }
  return agentHarnessServiceHostClient;
}

async function launchIndependentAgentHarnessServiceHost(): Promise<void> {
  const launchTargetInput = currentAgentHarnessServiceHostLaunchTargetInput();
  const launchTarget = computeAgentHarnessServiceHostDesktopLaunchTarget(launchTargetInput);
  const serviceHostEnvironment: NodeJS.ProcessEnv = {
    ...process.env,
    CHAMPCITY_USER_DATA_ROOT: getUserDataRoot(),
  };
  delete serviceHostEnvironment.ELECTRON_RUN_AS_NODE;
  await launchDetachedChampCitySiblingProcess({
    target: launchTarget,
    launchTargetInput,
    environment: serviceHostEnvironment,
    windowsHide: true,
  });
}

function initializeAgentHarnessServiceHostStartupRegistration(): void {
  try {
    const installedScope = readChampCityInstalledScopeMetadata();
    const settings = initializeAgentHarnessServiceHostLifecycleSettings(
      getUserDataRoot(),
      installedScope.backgroundAgentLaunchAtLoginDefault,
    );
    applyAgentHarnessServiceHostStartupRegistration(
      app,
      currentAgentHarnessServiceHostLaunchTargetInput(),
      settings,
      process.platform,
      installedScope,
    );
    agentHarnessStartupRegistrationError = null;
  } catch (error) {
    agentHarnessStartupRegistrationError = boundedLifecycleError(error);
  }
}

async function getAgentHarnessServiceHostLifecycleStatus(): Promise<AgentHarnessServiceHostLifecycleStatus> {
  let installedScope;
  let settings;
  try {
    installedScope = readChampCityInstalledScopeMetadata();
    settings = readAgentHarnessServiceHostLifecycleSettings(getUserDataRoot());
  } catch (error) {
    return {
      state: "degraded",
      reason: null,
      stateChangedAt: null,
      powerEpoch: 0,
      serviceHostProcessId: null,
      workerProcessId: null,
      workerRecoveryState: "idle",
      consecutiveHeartbeatMisses: 0,
      runtimeBuildIdentity: null,
      expectedBuildIdentity: computeAgentHarnessRuntimeBuildIdentity(__dirname),
      restartRequired: false,
      lastControlledRestart: null,
      launchAtLogin: true,
      loginItemRegistered: false,
      executableWillLaunchAtLogin: false,
      startupRegistrationSupported: process.platform === "win32",
      startupRegistrationScope: null,
      trayPresent: false,
      explicitlyStopped: false,
      explicitStopState: "none",
      lastError: boundedLifecycleError(error),
    };
  }
  let registration;
  try {
    registration = readAgentHarnessServiceHostStartupRegistration(
      app,
      currentAgentHarnessServiceHostLaunchTargetInput(),
      settings,
      process.platform,
      installedScope,
    );
  } catch (error) {
    agentHarnessStartupRegistrationError = boundedLifecycleError(error);
    registration = {
      launchAtLogin: settings.launchAtLogin,
      loginItemRegistered: false,
      executableWillLaunchAtLogin: false,
      startupRegistrationSupported: process.platform === "win32",
      startupRegistrationScope: process.platform === "win32"
        ? startupRegistrationScopeForInstallScope(installedScope.installScope)
        : null,
    };
  }
  const runtime = await getAgentHarnessServiceHostClient().lifecycleStatus();
  return {
    ...runtime,
    ...registration,
    lastError: runtime.lastError ?? agentHarnessStartupRegistrationError,
  };
}

function boundedLifecycleError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/[\r\n]+/g, " ").slice(0, 500) || "Service Host lifecycle operation failed.";
}

function currentAgentHarnessServiceHostLaunchTargetInput(): AgentHarnessServiceHostLaunchTargetInput {
  return {
    isPackaged: app.isPackaged,
    executablePath: process.execPath,
    applicationPath: app.isPackaged ? app.getAppPath() : path.resolve(__dirname, "../.."),
  };
}
