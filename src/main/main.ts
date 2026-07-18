import {
  app,
  BrowserView,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  type ContextMenuParams,
  type IpcMainInvokeEvent,
  type MenuItemConstructorOptions,
  type OpenDialogOptions,
} from "electron";
import { mkdirSync } from "node:fs";
import path from "node:path";

import {
  attachValidationEvidenceFile,
  getCurrentRequiredAction,
  getNextWorkCardId,
  getPhaseCloseoutSummary,
  ensureArchitectTaskPacket,
  listImplementerExecutionPacketSupportingArtifacts,
  listAvailablePhaseFolders,
  listHumanValidationImplementerReports,
  listHumanValidationStatuses,
  listHumanValidationTargets,
  listSavedPhaseIntakes,
  listSavedPhaseArchitectInterviewPrompts,
  listSavedPhaseMaps,
  listSavedWorkCardPlans,
  listSavedProjectArchitectInterviewPrompts,
  listSavedProjectIntakes,
  listSavedProjectPlanningDocuments,
  listSavedProjectRoadmaps,
  listSavedRepositoryReconciliations,
  listSavedWorkCards,
  previewArchitectReviewRecord,
  previewArchitectPrompt,
  previewImplementerExecutionPacket,
  previewImplementerReportCapture,
  previewDraftWorkCard,
  previewHumanValidationRecord,
  previewPhaseArchitectInterviewPrompt,
  previewPhaseCloseoutRecord,
  previewPhaseIntake,
  previewPhaseMap,
  previewPhasePlanningDocuments,
  previewPlanningArtifact,
  previewProjectRoadmap,
  previewProjectArchitectInterviewPrompt,
  previewProjectIntake,
  previewProjectPlanningDocuments,
  previewRepositoryReconciliation,
  previewRepositoryReconciliationPrompt,
  previewRiskReview,
  loadImplementerReportFile,
  saveArchitectPrompt,
  saveArchitectReviewRecord,
  saveCompletedViaRepairDisposition,
  saveImplementerExecutionPacket,
  saveImplementerReportCapture,
  saveDraftWorkCard,
  saveHumanValidationRecord,
  savePhaseArchitectInterviewPrompt,
  savePhaseCloseoutRecord,
  savePhaseIntake,
  savePhaseMap,
  savePhasePlanningDocuments,
  saveProjectRoadmap,
  saveProjectArchitectInterviewPrompt,
  saveProjectIntake,
  saveProjectPlanningDocuments,
  saveRepositoryReconciliation,
  saveRouteReviewRequest,
  saveRiskReview,
} from "./workCards/workCardFileStore";
import type { WorkCardDraftInput } from "../shared/workCards/workCardDraft";
import type { ProjectIntakeInput } from "../shared/workCards/projectIntake";
import type { ProjectArchitectInterviewPromptRequest } from "../shared/workCards/projectArchitectInterviewPrompt";
import type { ProjectPlanningDocumentsRequest } from "../shared/workCards/projectPlanningDocuments";
import type { PhaseIntakeInput } from "../shared/workCards/phaseIntake";
import type { PhaseArchitectInterviewPromptRequest } from "../shared/workCards/phaseArchitectInterviewPrompt";
import type {
  RepositoryReconciliationPromptRequest,
  RepositoryReconciliationRequest,
} from "../shared/workCards/repositoryReconciliation";
import type { PhasePlanningDocumentsRequest } from "../shared/workCards/phasePlanningDocuments";
import type { ProjectRoadmapRequest } from "../shared/workCards/projectRoadmap";
import type { PhaseMapRequest } from "../shared/workCards/phaseMap";
import type { ArchitectPromptRequest } from "../shared/workCards/renderArchitectFramingPrompt";
import type { ImplementerExecutionPacketRequest } from "../shared/workCards/renderImplementerExecutionPacket";
import type { ImplementerReportCaptureRequest } from "../shared/workCards/validateImplementerReport";
import type { RiskReviewRequest } from "../shared/workCards/renderRiskReviewMarkdown";
import type {
  ImplementerReportFileLoadRequest,
  HumanValidationImplementerReportListRequest,
  HumanValidationFormInput,
  ValidationEvidenceFileImportRequest,
} from "../shared/workCards/validationRecord";
import type { PhaseCloseoutFormInput } from "../shared/workCards/phaseCloseoutRecord";
import type { PlanningArtifactPreviewRequest } from "../shared/workCards/artifactReviewWorkspace";
import type { RouteReviewRequestInput } from "../shared/workCards/routeReviewRequest";
import type { ArchitectReviewFormInput } from "../shared/workCards/architectReviewRecord";
import type {
  CurrentContextPacketExportRequest,
  CurrentContextPacketPreviewRequest,
} from "../shared/contextPackets/contextPacket";
import type {
  ExecutionRunLookupRequest,
  ExecutionRunStartRequest,
} from "../shared/executionRuns";
import type {
  AddProjectWorkspaceRequest,
  ProjectFolderSelectionResult,
} from "../shared/projects";
import {
  addProjectWorkspace,
  contextPacketService,
  currentContextPacketCompiler,
  executionRunService,
  initializeCanonicalRuntime,
  listEligibleExecutionRunWorkCards,
  listProjectWorkspaces,
  refreshSelectedRepository,
  refreshSelectedRepositoryOnFocus,
  routedProcessInvocationService,
  selectProjectWorkspace,
  startExecutionRunFromWorkCard,
  shutdownCanonicalRuntime,
  subscribeToRepositoryProjection,
} from "./canonicalRuntime";
import { requireProcessIpcPolicy } from "./workflow";

const appName = "ChampCity A/I";
const repositoryRoot = path.resolve(__dirname, "..", "..");
const electronRuntimeRoot = process.env.CHAMPCITY_ELECTRON_RUNTIME_ROOT
  ? path.resolve(process.env.CHAMPCITY_ELECTRON_RUNTIME_ROOT)
  : path.join(repositoryRoot, "tmp", "electron-runtime");
const allowRepositoryTmpProjects =
  process.env.CHAMPCITY_ALLOW_REPOSITORY_TMP_PROJECTS === "1";
let architectBrowserView: BrowserView | null = null;
let architectBrowserOwner: BrowserWindow | null = null;

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

  mainWindow.on("focus", () => {
    void refreshSelectedRepositoryOnFocus();
  });

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

interface ArchitectBrowserBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

function registerArchitectBrowserIpc(): void {
  ipcMain.handle(
    "architectBrowser:show",
    (event, bounds: ArchitectBrowserBounds) => {
      const owner = BrowserWindow.fromWebContents(event.sender);

      if (!owner) {
        return {
          ok: false,
          errorMessages: ["Architect browser owner window is unavailable."],
        };
      }

      const view = ensureArchitectBrowserView(owner);
      view.setBounds(sanitizeArchitectBrowserBounds(bounds));

      if (!view.webContents.getURL().startsWith("https://chatgpt.com")) {
        void view.webContents.loadURL("https://chatgpt.com");
      }

      return { ok: true };
    },
  );
  ipcMain.handle(
    "architectBrowser:resize",
    (_event, bounds: ArchitectBrowserBounds) => {
      architectBrowserView?.setBounds(sanitizeArchitectBrowserBounds(bounds));
      return { ok: true };
    },
  );
  ipcMain.handle("architectBrowser:hide", () => {
    detachArchitectBrowserView();
    return { ok: true };
  });
}

function ensureArchitectBrowserView(owner: BrowserWindow): BrowserView {
  if (architectBrowserView && architectBrowserOwner === owner) {
    return architectBrowserView;
  }

  detachArchitectBrowserView();
  architectBrowserOwner = owner;
  architectBrowserView = new BrowserView({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      partition: "persist:champcity-architect-bridge",
    },
  });
  owner.addBrowserView(architectBrowserView);
  owner.on("closed", () => {
    if (architectBrowserOwner === owner) {
      architectBrowserView = null;
      architectBrowserOwner = null;
    }
  });

  return architectBrowserView;
}

function detachArchitectBrowserView(): void {
  if (
    architectBrowserView &&
    architectBrowserOwner &&
    !architectBrowserOwner.isDestroyed()
  ) {
    architectBrowserOwner.removeBrowserView(architectBrowserView);
  }

  architectBrowserView = null;
  architectBrowserOwner = null;
}

function sanitizeArchitectBrowserBounds(
  bounds: ArchitectBrowserBounds,
): Electron.Rectangle {
  const positive = (value: unknown, fallback: number) =>
    typeof value === "number" && Number.isFinite(value)
      ? Math.max(0, Math.round(value))
      : fallback;

  return {
    x: positive(bounds.x, 0),
    y: positive(bounds.y, 0),
    width: Math.max(120, positive(bounds.width, 640)),
    height: Math.max(120, positive(bounds.height, 360)),
  };
}

app.whenReady().then(async () => {
  subscribeToRepositoryProjection((snapshot) => {
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send("repository:projectionChanged", snapshot.scanResult);
    }
  });
  await initializeCanonicalRuntime({
    defaultRepositoryRoot: repositoryRoot,
    workspaceStoragePath: path.join(app.getPath("userData"), "project-workspaces.json"),
    allowRepositoryTmpProjects,
  });
  registerWorkCardIpc();
  registerArchitectBrowserIpc();
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

app.on("before-quit", () => {
  void shutdownCanonicalRuntime();
});

function registerWorkCardIpc(): void {
  ipcMain.handle("projects:list", () => listProjectWorkspaces());
  ipcMain.handle(
    "projects:chooseFolder",
    async (event): Promise<ProjectFolderSelectionResult> => {
      const owner = BrowserWindow.fromWebContents(event.sender) ?? undefined;
      const options: OpenDialogOptions = {
        title: "Choose project folder",
        properties: ["openDirectory"],
      };
      const result = owner
        ? await dialog.showOpenDialog(owner, options)
        : await dialog.showOpenDialog(options);
      if (result.canceled || result.filePaths.length === 0) {
        return { ok: false, cancelled: true };
      }
      return { ok: true, repositoryRoot: result.filePaths[0] };
    },
  );
  ipcMain.handle(
    "projects:add",
    (_event, input: AddProjectWorkspaceRequest) => addProjectWorkspace(input),
  );
  ipcMain.handle("projects:select", (_event, projectId: string) =>
    selectProjectWorkspace(projectId),
  );
  ipcMain.handle("projects:refresh", () => refreshSelectedRepository());
  ipcMain.handle("workCards:listAvailablePhases", () =>
    listAvailablePhaseFolders(),
  );
  registerProcessIpc(
    "projectIntake:preview",
    (_event, input: ProjectIntakeInput) => previewProjectIntake(input),
  );
  registerProcessIpc(
    "projectIntake:save",
    (_event, input: ProjectIntakeInput) => saveProjectIntake(input),
  );
  ipcMain.handle("projectArchitectInterview:listProjectIntakes", () =>
    listSavedProjectIntakes(),
  );
  registerProcessIpc(
    "projectArchitectInterview:previewPrompt",
    (_event, input: ProjectArchitectInterviewPromptRequest) =>
      previewProjectArchitectInterviewPrompt(input),
  );
  registerProcessIpc(
    "projectArchitectInterview:savePrompt",
    (_event, input: ProjectArchitectInterviewPromptRequest) =>
      saveProjectArchitectInterviewPrompt(input),
  );
  ipcMain.handle("projectPlanningDocuments:listProjectIntakes", () =>
    listSavedProjectIntakes(),
  );
  ipcMain.handle("projectPlanningDocuments:listArchitectPrompts", () =>
    listSavedProjectArchitectInterviewPrompts(),
  );
  registerProcessIpc(
    "projectPlanningDocuments:preview",
    (_event, input: ProjectPlanningDocumentsRequest) =>
      previewProjectPlanningDocuments(input),
  );
  registerProcessIpc(
    "projectPlanningDocuments:save",
    (_event, input: ProjectPlanningDocumentsRequest) =>
      saveProjectPlanningDocuments(input),
  );
  ipcMain.handle("phaseIntake:listProjectPlanningDocuments", () =>
    listSavedProjectPlanningDocuments(),
  );
  registerProcessIpc(
    "phaseIntake:preview",
    (_event, input: PhaseIntakeInput) => previewPhaseIntake(input),
  );
  registerProcessIpc(
    "phaseIntake:save",
    (_event, input: PhaseIntakeInput) => savePhaseIntake(input),
  );
  ipcMain.handle("phaseArchitectInterview:listPhaseIntakes", (_event, phase: string) =>
    listSavedPhaseIntakes(phase),
  );
  registerProcessIpc(
    "phaseArchitectInterview:previewPrompt",
    (_event, input: PhaseArchitectInterviewPromptRequest) =>
      previewPhaseArchitectInterviewPrompt(input),
  );
  registerProcessIpc(
    "phaseArchitectInterview:savePrompt",
    (_event, input: PhaseArchitectInterviewPromptRequest) =>
      savePhaseArchitectInterviewPrompt(input),
  );
  ipcMain.handle(
    "repositoryReconciliation:listProjectPlanningDocuments",
    () => listSavedProjectPlanningDocuments(),
  );
  registerProcessIpc(
    "repositoryReconciliation:previewPrompt",
    (_event, input: RepositoryReconciliationPromptRequest) =>
      previewRepositoryReconciliationPrompt(input),
  );
  registerProcessIpc(
    "repositoryReconciliation:preview",
    (_event, input: RepositoryReconciliationRequest) =>
      previewRepositoryReconciliation(input),
  );
  registerProcessIpc(
    "repositoryReconciliation:save",
    (_event, input: RepositoryReconciliationRequest) =>
      saveRepositoryReconciliation(input),
  );
  registerProcessIpc(
    "projectRoadmap:preview",
    (_event, input: ProjectRoadmapRequest) => previewProjectRoadmap(input),
  );
  registerProcessIpc(
    "projectRoadmap:save",
    (_event, input: ProjectRoadmapRequest) => saveProjectRoadmap(input),
  );
  ipcMain.handle("projectRoadmap:listSaved", () => listSavedProjectRoadmaps());
  registerProcessIpc(
    "phaseMap:preview",
    (_event, input: PhaseMapRequest) => previewPhaseMap(input),
  );
  registerProcessIpc(
    "phaseMap:save",
    (_event, input: PhaseMapRequest) => savePhaseMap(input),
  );
  ipcMain.handle("phaseMap:listSaved", () => listSavedPhaseMaps());
  ipcMain.handle("phasePlanning:listProjectPlanningDocuments", () =>
    listSavedProjectPlanningDocuments(),
  );
  ipcMain.handle("phasePlanning:listRepositoryReconciliations", () =>
    listSavedRepositoryReconciliations(),
  );
  ipcMain.handle("phasePlanning:listPhaseIntakes", (_event, phase: string) =>
    listSavedPhaseIntakes(phase),
  );
  ipcMain.handle(
    "phasePlanning:listPhaseArchitectInterviewPrompts",
    (_event, phase: string) => listSavedPhaseArchitectInterviewPrompts(phase),
  );
  registerProcessIpc(
    "phasePlanning:preview",
    (_event, input: PhasePlanningDocumentsRequest) =>
      previewPhasePlanningDocuments(input),
  );
  registerProcessIpc(
    "phasePlanning:save",
    (_event, input: PhasePlanningDocumentsRequest) =>
      savePhasePlanningDocuments(input),
  );
  ipcMain.handle("workCardPlans:listSaved", (_event, phase: string) =>
    listSavedWorkCardPlans(phase),
  );
  ipcMain.handle("workCards:getNextId", (_event, phase: string) =>
    getNextWorkCardId(phase),
  );
  registerProcessIpc(
    "workCards:previewDraft",
    (_event, input: WorkCardDraftInput) => previewDraftWorkCard(input),
  );
  registerProcessIpc("workCards:saveDraft", (_event, input: WorkCardDraftInput) =>
    saveDraftWorkCard(input),
  );
  ipcMain.handle("workCards:listSaved", (_event, phase: string) =>
    listSavedWorkCards(phase),
  );
  registerProcessIpc(
    "workCards:previewArchitectPrompt",
    (_event, input: ArchitectPromptRequest) => previewArchitectPrompt(input),
  );
  registerProcessIpc(
    "workCards:saveArchitectPrompt",
    (_event, input: ArchitectPromptRequest) => saveArchitectPrompt(input),
  );
  registerProcessIpc(
    "workCards:previewRiskReview",
    (_event, input: RiskReviewRequest) => previewRiskReview(input),
  );
  registerProcessIpc("workCards:saveRiskReview", (_event, input: RiskReviewRequest) =>
    saveRiskReview(input),
  );
  ipcMain.handle(
    "workCards:listImplementerExecutionPacketSupportingArtifacts",
    (_event, input: ImplementerExecutionPacketRequest) =>
      listImplementerExecutionPacketSupportingArtifacts(input),
  );
  registerProcessIpc(
    "workCards:previewImplementerExecutionPacket",
    (_event, input: ImplementerExecutionPacketRequest) => previewImplementerExecutionPacket(input),
  );
  registerProcessIpc(
    "workCards:saveImplementerExecutionPacket",
    (_event, input: ImplementerExecutionPacketRequest) => saveImplementerExecutionPacket(input),
  );
  registerProcessIpc(
    "workCards:previewImplementerReportCapture",
    (_event, input: ImplementerReportCaptureRequest) =>
      previewImplementerReportCapture(input),
  );
  registerProcessIpc(
    "workCards:saveImplementerReportCapture",
    (_event, input: ImplementerReportCaptureRequest) =>
      saveImplementerReportCapture(input),
  );
  ipcMain.handle(
    "workCards:saveCompletedViaRepairDisposition",
    (_event, input: { rationale: string }) =>
      saveCompletedViaRepairDisposition(input),
  );
  registerProcessIpc("workCards:ensureArchitectTaskPacket", () =>
    ensureArchitectTaskPacket(),
  );
  registerProcessIpc(
    "workCards:previewArchitectReviewRecord",
    (_event, input: ArchitectReviewFormInput) =>
      previewArchitectReviewRecord(input),
  );
  registerProcessIpc(
    "workCards:saveArchitectReviewRecord",
    (_event, input: ArchitectReviewFormInput) =>
      saveArchitectReviewRecord(input),
  );
  ipcMain.handle(
    "workCards:loadImplementerReportFile",
    (_event, input: ImplementerReportFileLoadRequest) =>
      loadImplementerReportFile(input),
  );
  ipcMain.handle(
    "workCards:listHumanValidationImplementerReports",
    (_event, input: HumanValidationImplementerReportListRequest) =>
      listHumanValidationImplementerReports(input),
  );
  ipcMain.handle("workCards:listHumanValidationTargets", (_event, phase: string) =>
    listHumanValidationTargets(phase),
  );
  ipcMain.handle("workCards:listHumanValidationStatuses", (_event, phase: string) =>
    listHumanValidationStatuses(phase),
  );
  registerProcessIpc(
    "workCards:previewHumanValidationRecord",
    (_event, input: HumanValidationFormInput) =>
      previewHumanValidationRecord(input),
  );
  registerProcessIpc(
    "workCards:saveHumanValidationRecord",
    (_event, input: HumanValidationFormInput) =>
      saveHumanValidationRecord(input),
  );
  registerProcessIpc(
    "workCards:attachValidationEvidenceFile",
    (_event, input: ValidationEvidenceFileImportRequest) =>
      attachValidationEvidenceFile(input),
  );
  ipcMain.handle("workCards:getPhaseCloseoutSummary", (_event, phase: string) =>
    getPhaseCloseoutSummary(phase),
  );
  ipcMain.handle("workCards:getCurrentRequiredAction", () =>
    getCurrentRequiredAction(),
  );
  ipcMain.handle("executionRuns:listEligibleWorkCards", () =>
    listEligibleExecutionRunWorkCards(),
  );
  ipcMain.handle(
    "executionRuns:start",
    (_event, input: ExecutionRunStartRequest) =>
      startExecutionRunFromWorkCard(input),
  );
  ipcMain.handle(
    "executionRuns:load",
    (_event, input: ExecutionRunLookupRequest) =>
      executionRunService.loadStatus(input),
  );
  ipcMain.handle(
    "executionRuns:previewNextPacket",
    (_event, input: ExecutionRunLookupRequest) =>
      executionRunService.previewNextPacket(input),
  );
  registerProcessIpc(
    "contextPackets:previewCurrent",
    (_event, input: CurrentContextPacketPreviewRequest) =>
      currentContextPacketCompiler.preview(input),
  );
  registerProcessIpc(
    "contextPackets:exportCurrent",
    async (_event, input: CurrentContextPacketExportRequest) => {
      const preview = await currentContextPacketCompiler.preview(input);
      if (!preview.ok || !preview.packet) {
        return {
          ok: false,
          blocked: true,
          acknowledgementRequired: false,
          errorMessages: preview.errorMessages ?? ["Context packet compilation failed."],
        };
      }
      return contextPacketService.exportPacket({
        packet: preview.packet,
        operatorAcknowledgedOverBudget:
          input.operatorAcknowledgedOverBudget,
      });
    },
  );
  registerProcessIpc(
    "workCards:saveRouteReviewRequest",
    (_event, input: RouteReviewRequestInput) => saveRouteReviewRequest(input),
  );
  registerProcessIpc(
    "workCards:previewPlanningArtifact",
    (_event, input: PlanningArtifactPreviewRequest) =>
      previewPlanningArtifact(input),
  );
  registerProcessIpc(
    "workCards:previewPhaseCloseoutRecord",
    (_event, input: PhaseCloseoutFormInput) =>
      previewPhaseCloseoutRecord(input),
  );
  registerProcessIpc(
    "workCards:savePhaseCloseoutRecord",
    (_event, input: PhaseCloseoutFormInput) =>
      savePhaseCloseoutRecord(input),
  );
}

function registerProcessIpc(
  channel: string,
  handler: (event: IpcMainInvokeEvent, input: any) => unknown,
): void {
  // Fail startup if a preview/write handler has not made an explicit routed,
  // reference, corrective, or context-utility classification.
  requireProcessIpcPolicy(channel);
  ipcMain.handle(channel, (event, payload, rendererBinding) =>
    routedProcessInvocationService.invoke({
      channel,
      rendererBinding,
      payload,
      operation: () => handler(event, payload),
    }),
  );
}
