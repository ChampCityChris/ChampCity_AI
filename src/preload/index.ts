import { contextBridge, ipcRenderer } from "electron";
import type { AppInfo, ChampCityApi, WorkspaceSelection } from "../shared/workspaceContracts";

const api: ChampCityApi = {
  getSelectedWorkspace: () => ipcRenderer.invoke("workspace:get") as Promise<WorkspaceSelection>,
  chooseWorkspaceFolder: () => ipcRenderer.invoke("workspace:choose") as Promise<WorkspaceSelection>,
  clearSelectedWorkspace: () => ipcRenderer.invoke("workspace:clear") as Promise<WorkspaceSelection>,
  getAppInfo: () => ipcRenderer.invoke("app:info") as Promise<AppInfo>,
  listDocuments: () => ipcRenderer.invoke("documents:list") as ReturnType<ChampCityApi["listDocuments"]>,
  readDocument: (logicalDocumentId) =>
    ipcRenderer.invoke("documents:read", logicalDocumentId) as ReturnType<ChampCityApi["readDocument"]>,
  setDocumentDisposition: (logicalDocumentId, status) =>
    ipcRenderer.invoke(
      "documents:setDisposition",
      logicalDocumentId,
      status,
    ) as ReturnType<ChampCityApi["setDocumentDisposition"]>,
  previewDispositionInitialization: () =>
    ipcRenderer.invoke(
      "documents:previewInitialization",
    ) as ReturnType<ChampCityApi["previewDispositionInitialization"]>,
  applyDispositionInitialization: () =>
    ipcRenderer.invoke(
      "documents:applyInitialization",
    ) as ReturnType<ChampCityApi["applyDispositionInitialization"]>,
  resolveCurrentDocument: () =>
    ipcRenderer.invoke(
      "documents:resolveCurrent",
    ) as ReturnType<ChampCityApi["resolveCurrentDocument"]>,
  submitProjectIntake: (submission) =>
    ipcRenderer.invoke(
      "projectIntake:submit",
      submission,
    ) as ReturnType<ChampCityApi["submitProjectIntake"]>,
  getArchitectBrowserFoundationStatus: () =>
    ipcRenderer.invoke(
      "architectBrowser:foundationStatus",
    ) as ReturnType<ChampCityApi["getArchitectBrowserFoundationStatus"]>,
  setArchitectBrowserBounds: (bounds) =>
    ipcRenderer.invoke(
      "architectBrowser:setBounds",
      bounds,
    ) as ReturnType<ChampCityApi["setArchitectBrowserBounds"]>,
  showArchitectBrowser: () =>
    ipcRenderer.invoke("architectBrowser:show") as ReturnType<ChampCityApi["showArchitectBrowser"]>,
  hideArchitectBrowser: () =>
    ipcRenderer.invoke("architectBrowser:hide") as ReturnType<ChampCityApi["hideArchitectBrowser"]>,
  confirmArchitectSignedIn: () =>
    ipcRenderer.invoke(
      "architectBrowser:confirmSignedIn",
    ) as ReturnType<ChampCityApi["confirmArchitectSignedIn"]>,
  getCurrentWorkspaceModel: () =>
    ipcRenderer.invoke(
      "currentWorkflow:getModel",
    ) as ReturnType<ChampCityApi["getCurrentWorkspaceModel"]>,
  generateCurrentHandoff: () =>
    ipcRenderer.invoke(
      "currentWorkflow:generateHandoff",
    ) as ReturnType<ChampCityApi["generateCurrentHandoff"]>,
  applyCurrentDisposition: (status) =>
    ipcRenderer.invoke(
      "currentWorkflow:applyDisposition",
      status,
    ) as ReturnType<ChampCityApi["applyCurrentDisposition"]>,
  createRepairForCurrentFailure: (defect) =>
    ipcRenderer.invoke(
      "currentWorkflow:createRepair",
      defect,
    ) as ReturnType<ChampCityApi["createRepairForCurrentFailure"]>,
  createValidationAttemptForCurrentWorkCard: () =>
    ipcRenderer.invoke(
      "currentWorkflow:createValidationAttempt",
    ) as ReturnType<ChampCityApi["createValidationAttemptForCurrentWorkCard"]>,
  createPhaseCloseoutForCurrentPhase: (closureDecision, rationale) =>
    ipcRenderer.invoke(
      "currentWorkflow:createPhaseCloseout",
      closureDecision,
      rationale,
    ) as ReturnType<ChampCityApi["createPhaseCloseoutForCurrentPhase"]>,
  createProjectCloseoutForCurrentProject: (closureDecision, rationale) =>
    ipcRenderer.invoke(
      "currentWorkflow:createProjectCloseout",
      closureDecision,
      rationale,
    ) as ReturnType<ChampCityApi["createProjectCloseoutForCurrentProject"]>,
};

contextBridge.exposeInMainWorld("champcity", api);
