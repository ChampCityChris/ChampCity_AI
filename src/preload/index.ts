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
  previewWorkspaceMigration: () =>
    ipcRenderer.invoke(
      "workspaceMigration:preview",
    ) as ReturnType<ChampCityApi["previewWorkspaceMigration"]>,
  applyWorkspaceMigration: () =>
    ipcRenderer.invoke(
      "workspaceMigration:apply",
    ) as ReturnType<ChampCityApi["applyWorkspaceMigration"]>,
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
  showArchitectBrowser: (attachmentGeneration) =>
    ipcRenderer.invoke(
      "architectBrowser:show",
      attachmentGeneration,
    ) as ReturnType<ChampCityApi["showArchitectBrowser"]>,
  hideArchitectBrowser: (attachmentGeneration) =>
    ipcRenderer.invoke(
      "architectBrowser:hide",
      attachmentGeneration,
    ) as ReturnType<ChampCityApi["hideArchitectBrowser"]>,
  confirmArchitectSignedIn: () =>
    ipcRenderer.invoke(
      "architectBrowser:confirmSignedIn",
    ) as ReturnType<ChampCityApi["confirmArchitectSignedIn"]>,
  reloadArchitectBrowser: () =>
    ipcRenderer.invoke(
      "architectBrowser:reload",
    ) as ReturnType<ChampCityApi["reloadArchitectBrowser"]>,
  getArchitectOutputWorkspaceModel: (workspaceId) =>
    ipcRenderer.invoke(
      "architectOutput:getWorkspaceModel",
      workspaceId,
    ) as ReturnType<ChampCityApi["getArchitectOutputWorkspaceModel"]>,
  prepareArchitectOutputHandoff: (workspaceId) =>
    ipcRenderer.invoke(
      "architectOutput:prepareHandoff",
      workspaceId,
    ) as ReturnType<ChampCityApi["prepareArchitectOutputHandoff"]>,
  copyArchitectOutputHandoff: (workspaceId) =>
    ipcRenderer.invoke(
      "architectOutput:copyHandoff",
      workspaceId,
    ) as ReturnType<ChampCityApi["copyArchitectOutputHandoff"]>,
  reviewArchitectOutput: (workspaceId, status, operatorReviewNotes, presentedRevisions) =>
    ipcRenderer.invoke(
      "architectOutput:review",
      workspaceId,
      status,
      operatorReviewNotes,
      presentedRevisions,
    ) as ReturnType<ChampCityApi["reviewArchitectOutput"]>,
  getCurrentWorkspaceModel: () =>
    ipcRenderer.invoke(
      "currentWorkflow:getModel",
    ) as ReturnType<ChampCityApi["getCurrentWorkspaceModel"]>,
  getCodexImplementerExecutionStatus: () =>
    ipcRenderer.invoke(
      "codexImplementer:getStatus",
    ) as ReturnType<ChampCityApi["getCodexImplementerExecutionStatus"]>,
  startCodexImplementerExecution: () =>
    ipcRenderer.invoke(
      "codexImplementer:start",
    ) as ReturnType<ChampCityApi["startCodexImplementerExecution"]>,
  cancelCodexImplementerExecution: () =>
    ipcRenderer.invoke(
      "codexImplementer:cancel",
    ) as ReturnType<ChampCityApi["cancelCodexImplementerExecution"]>,
  generateCurrentHandoff: () =>
    ipcRenderer.invoke(
      "currentWorkflow:generateHandoff",
    ) as ReturnType<ChampCityApi["generateCurrentHandoff"]>,
  getWorkCardMapProjection: (phaseId, options) =>
    ipcRenderer.invoke(
      "currentWorkflow:getWorkCardMapProjection",
      phaseId,
      options,
    ) as ReturnType<ChampCityApi["getWorkCardMapProjection"]>,
  beginWorkCardPlanning: (phaseId, candidateId, options) =>
    ipcRenderer.invoke(
      "currentWorkflow:beginWorkCardPlanning",
      phaseId,
      candidateId,
      options,
    ) as ReturnType<ChampCityApi["beginWorkCardPlanning"]>,
  getCurrentCloseProjection: () =>
    ipcRenderer.invoke(
      "currentWorkflow:getCloseProjection",
    ) as ReturnType<ChampCityApi["getCurrentCloseProjection"]>,
  getCurrentRepairWorkspaceProjection: () =>
    ipcRenderer.invoke(
      "currentWorkflow:getRepairWorkspaceProjection",
    ) as ReturnType<ChampCityApi["getCurrentRepairWorkspaceProjection"]>,
  getCloseReturnSelectionProjection: () =>
    ipcRenderer.invoke(
      "currentWorkflow:getCloseReturnSelectionProjection",
    ) as ReturnType<ChampCityApi["getCloseReturnSelectionProjection"]>,
  generateCloseReturnNextIntakeHandoff: () =>
    ipcRenderer.invoke(
      "currentWorkflow:generateCloseReturnNextIntakeHandoff",
    ) as ReturnType<ChampCityApi["generateCloseReturnNextIntakeHandoff"]>,
  copyCurrentWorkCardAdvisoryReviewPrompt: () =>
    ipcRenderer.invoke(
      "currentWorkflow:copyAdvisoryReviewPrompt",
    ) as ReturnType<ChampCityApi["copyCurrentWorkCardAdvisoryReviewPrompt"]>,
  applyOperatorValidationDecisionForCurrentWorkCard: (input) =>
    ipcRenderer.invoke(
      "currentWorkflow:applyOperatorValidationDecision",
      input,
    ) as ReturnType<ChampCityApi["applyOperatorValidationDecisionForCurrentWorkCard"]>,
  applyCurrentDisposition: (status, operatorReviewNotes, targetWorkspaceId) =>
    ipcRenderer.invoke(
      "currentWorkflow:applyDisposition",
      status,
      operatorReviewNotes,
      targetWorkspaceId,
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
