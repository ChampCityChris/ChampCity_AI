import { contextBridge, ipcRenderer } from "electron";
import type {
  AgentHarnessSettingsInput,
  AgentHarnessServiceHostLifecycleSettingsInput,
  AgentHarnessServiceHostLifecycleStatus,
  AgentHarnessStatus,
  AgentHarnessWorkspaceRegistrationResult,
  AgentHarnessWorkspaceRegistrySnapshot,
  AppInfo,
  CodexApprovalResponse,
  ChampCityApi,
  LegacyOAuthClientImportResult,
  WorkspaceSelection,
} from "../shared/workspaceContracts";

const api: ChampCityApi = {
  getGithubProviderStatus: () => ipcRenderer.invoke("githubProvider:status"),
  connectGithubProvider: () => ipcRenderer.invoke("githubProvider:connect"),
  restartGithubProvider: () => ipcRenderer.invoke("githubProvider:restart"),
  disconnectGithubProvider: () => ipcRenderer.invoke("githubProvider:disconnect"),
  readGithubEvidence: (request) => ipcRenderer.invoke("githubProvider:read", request),
  getSelectedWorkspace: () => ipcRenderer.invoke("workspace:get") as Promise<WorkspaceSelection>,
  chooseWorkspaceFolder: () => ipcRenderer.invoke("workspace:choose") as Promise<WorkspaceSelection>,
  clearSelectedWorkspace: () => ipcRenderer.invoke("workspace:clear") as Promise<WorkspaceSelection>,
  getAppInfo: () => ipcRenderer.invoke("app:info") as Promise<AppInfo>,
  getAgentHarnessStatus: () => ipcRenderer.invoke("agentHarness:status") as Promise<AgentHarnessStatus>,
  getAgentHarnessServiceHostLifecycleStatus: () =>
    ipcRenderer.invoke("agentHarness:serviceHostLifecycleStatus") as Promise<AgentHarnessServiceHostLifecycleStatus>,
  startBackgroundAgent: () =>
    ipcRenderer.invoke("agentHarness:startBackgroundAgent") as Promise<AgentHarnessServiceHostLifecycleStatus>,
  exitBackgroundAgent: () =>
    ipcRenderer.invoke("agentHarness:exitBackgroundAgent") as Promise<AgentHarnessServiceHostLifecycleStatus>,
  restartAgentHarnessServiceHost: () =>
    ipcRenderer.invoke("agentHarness:restartServiceHost") as Promise<AgentHarnessServiceHostLifecycleStatus>,
  saveAgentHarnessSettings: (settings: AgentHarnessSettingsInput) =>
    ipcRenderer.invoke("agentHarness:saveSettings", settings) as Promise<AgentHarnessStatus>,
  saveAgentHarnessServiceHostLifecycleSettings: (settings: AgentHarnessServiceHostLifecycleSettingsInput) =>
    ipcRenderer.invoke(
      "agentHarness:saveServiceHostLifecycleSettings",
      settings,
    ) as Promise<AgentHarnessServiceHostLifecycleStatus>,
  importLegacyOAuthClients: () =>
    ipcRenderer.invoke("agentHarness:importLegacyOAuthClients") as Promise<LegacyOAuthClientImportResult>,
  startAgentHarness: () => ipcRenderer.invoke("agentHarness:start") as Promise<AgentHarnessStatus>,
  stopAgentHarness: () => ipcRenderer.invoke("agentHarness:stop") as Promise<AgentHarnessStatus>,
  restartAgentHarness: () => ipcRenderer.invoke("agentHarness:restart") as Promise<AgentHarnessStatus>,
  listAgentHarnessRegisteredWorkspaces: () =>
    ipcRenderer.invoke("agentHarness:listRegisteredWorkspaces") as Promise<AgentHarnessWorkspaceRegistrySnapshot>,
  chooseAndRegisterAgentHarnessWorkspace: () =>
    ipcRenderer.invoke("agentHarness:chooseAndRegisterWorkspace") as Promise<AgentHarnessWorkspaceRegistrationResult>,
  unregisterAgentHarnessWorkspace: (workspaceId) =>
    ipcRenderer.invoke("agentHarness:unregisterWorkspace", workspaceId) as Promise<AgentHarnessWorkspaceRegistrySnapshot>,
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
  discoverIssueInventory: () =>
    ipcRenderer.invoke(
      "issueResolution:discoverIssues",
    ) as ReturnType<ChampCityApi["discoverIssueInventory"]>,
  createLightweightIssueRecord: (input) =>
    ipcRenderer.invoke(
      "issueResolution:createIssue",
      input,
    ) as ReturnType<ChampCityApi["createLightweightIssueRecord"]>,
  getIssueArchitectPlanningProjection: (issueId) =>
    ipcRenderer.invoke(
      "issueResolution:getArchitectPlanning",
      issueId,
    ) as ReturnType<ChampCityApi["getIssueArchitectPlanningProjection"]>,
  prepareIssueArchitectPlanningHandoff: (issueId) =>
    ipcRenderer.invoke(
      "issueResolution:prepareArchitectHandoff",
      issueId,
    ) as ReturnType<ChampCityApi["prepareIssueArchitectPlanningHandoff"]>,
  copyIssueArchitectPlanningHandoff: (issueId) =>
    ipcRenderer.invoke(
      "issueResolution:copyArchitectHandoff",
      issueId,
    ) as ReturnType<ChampCityApi["copyIssueArchitectPlanningHandoff"]>,
  promoteIssueArchitectPlanningDraft: (issueId) =>
    ipcRenderer.invoke(
      "issueResolution:promoteArchitectDraft",
      issueId,
    ) as ReturnType<ChampCityApi["promoteIssueArchitectPlanningDraft"]>,
  applyIssueArchitectReview: (issueId, input) =>
    ipcRenderer.invoke(
      "issueResolution:applyArchitectReview",
      issueId,
      input,
    ) as ReturnType<ChampCityApi["applyIssueArchitectReview"]>,
  getIssuePlanningProjection: (issueId) =>
    ipcRenderer.invoke(
      "issueResolution:getIssuePlanning",
      issueId,
    ) as ReturnType<ChampCityApi["getIssuePlanningProjection"]>,
  getIssueResolutionNavigationProjection: (issueId) =>
    ipcRenderer.invoke(
      "issueResolution:getNavigation",
      issueId,
    ) as ReturnType<ChampCityApi["getIssueResolutionNavigationProjection"]>,
  getIssueValidationProjection: (issueId) =>
    ipcRenderer.invoke(
      "issueResolution:getIssueValidation",
      issueId,
    ) as ReturnType<ChampCityApi["getIssueValidationProjection"]>,
  applyIssueValidationDecision: (issueId, input) =>
    ipcRenderer.invoke(
      "issueResolution:applyIssueValidationDecision",
      issueId,
      input,
    ) as ReturnType<ChampCityApi["applyIssueValidationDecision"]>,
  getIssueCloseProjection: (issueId) =>
    ipcRenderer.invoke(
      "issueResolution:getIssueClose",
      issueId,
    ) as ReturnType<ChampCityApi["getIssueCloseProjection"]>,
  closeIssue: (issueId, input) =>
    ipcRenderer.invoke(
      "issueResolution:closeIssue",
      issueId,
      input,
    ) as ReturnType<ChampCityApi["closeIssue"]>,
  prepareIssuePlanningHandoff: (issueId) =>
    ipcRenderer.invoke(
      "issueResolution:prepareIssuePlanningHandoff",
      issueId,
    ) as ReturnType<ChampCityApi["prepareIssuePlanningHandoff"]>,
  copyIssuePlanningHandoff: (issueId) =>
    ipcRenderer.invoke(
      "issueResolution:copyIssuePlanningHandoff",
      issueId,
    ) as ReturnType<ChampCityApi["copyIssuePlanningHandoff"]>,
  applyIssuePlanningReview: (issueId, input) =>
    ipcRenderer.invoke(
      "issueResolution:applyIssuePlanningReview",
      issueId,
      input,
    ) as ReturnType<ChampCityApi["applyIssuePlanningReview"]>,
  getIssueFixCardProjection: (issueId, currentStep) =>
    ipcRenderer.invoke(
      "issueResolution:getIssueFixCard",
      issueId,
      currentStep,
    ) as ReturnType<ChampCityApi["getIssueFixCardProjection"]>,
  selectIssueFixCardCandidate: (issueId, fixCardId, currentStep) =>
    ipcRenderer.invoke(
      "issueResolution:selectIssueFixCardCandidate",
      issueId,
      fixCardId,
      currentStep,
    ) as ReturnType<ChampCityApi["selectIssueFixCardCandidate"]>,
  prepareIssueFixCardPlanningHandoff: (issueId, currentStep) =>
    ipcRenderer.invoke(
      "issueResolution:prepareIssueFixCardPlanningHandoff",
      issueId,
      currentStep,
    ) as ReturnType<ChampCityApi["prepareIssueFixCardPlanningHandoff"]>,
  copyIssueFixCardPlanningHandoff: (issueId, currentStep) =>
    ipcRenderer.invoke(
      "issueResolution:copyIssueFixCardPlanningHandoff",
      issueId,
      currentStep,
    ) as ReturnType<ChampCityApi["copyIssueFixCardPlanningHandoff"]>,
  applyIssueFixCardContractReview: (issueId, input, currentStep) =>
    ipcRenderer.invoke(
      "issueResolution:applyIssueFixCardContractReview",
      issueId,
      input,
      currentStep,
    ) as ReturnType<ChampCityApi["applyIssueFixCardContractReview"]>,
  reserveIssueFixCardImplementerReport: (issueId, currentStep) =>
    ipcRenderer.invoke(
      "issueResolution:reserveIssueFixCardImplementerReport",
      issueId,
      currentStep,
    ) as ReturnType<ChampCityApi["reserveIssueFixCardImplementerReport"]>,
  copyIssueFixCardAdvisoryReviewPrompt: (issueId, currentStep) =>
    ipcRenderer.invoke(
      "issueResolution:copyIssueFixCardAdvisoryReviewPrompt",
      issueId,
      currentStep,
    ) as ReturnType<ChampCityApi["copyIssueFixCardAdvisoryReviewPrompt"]>,
  applyIssueFixCardValidationDecision: (issueId, input, currentStep) =>
    ipcRenderer.invoke(
      "issueResolution:applyIssueFixCardValidationDecision",
      issueId,
      input,
      currentStep,
    ) as ReturnType<ChampCityApi["applyIssueFixCardValidationDecision"]>,
  prepareIssueFixCardRepairHandoff: (issueId, currentStep) =>
    ipcRenderer.invoke(
      "issueResolution:prepareIssueFixCardRepairHandoff",
      issueId,
      currentStep,
    ) as ReturnType<ChampCityApi["prepareIssueFixCardRepairHandoff"]>,
  copyIssueFixCardRepairHandoff: (issueId, currentStep) =>
    ipcRenderer.invoke(
      "issueResolution:copyIssueFixCardRepairHandoff",
      issueId,
      currentStep,
    ) as ReturnType<ChampCityApi["copyIssueFixCardRepairHandoff"]>,
  closeIssueFixCard: (issueId, currentStep) =>
    ipcRenderer.invoke(
      "issueResolution:closeIssueFixCard",
      issueId,
      currentStep,
    ) as ReturnType<ChampCityApi["closeIssueFixCard"]>,
  getIssueCodexImplementerExecutionStatus: (issueId, fixCardId, currentImplementationId) =>
    ipcRenderer.invoke(
      "issueResolution:getIssueCodexStatus",
      issueId,
      fixCardId,
      currentImplementationId,
    ) as ReturnType<ChampCityApi["getIssueCodexImplementerExecutionStatus"]>,
  startIssueCodexImplementerExecution: (issueId, fixCardId, currentImplementationId, selection) =>
    ipcRenderer.invoke(
      "issueResolution:startIssueCodex",
      issueId,
      fixCardId,
      currentImplementationId,
      selection,
    ) as ReturnType<ChampCityApi["startIssueCodexImplementerExecution"]>,
  startIssueCodexEnvironmentResolution: (issueId, fixCardId, currentImplementationId) =>
    ipcRenderer.invoke(
      "issueResolution:startIssueCodexEnvironmentResolution",
      issueId,
      fixCardId,
      currentImplementationId,
    ) as ReturnType<ChampCityApi["startIssueCodexEnvironmentResolution"]>,
  submitProjectIntake: (submission) =>
    ipcRenderer.invoke(
      "projectIntake:submit",
      submission,
    ) as ReturnType<ChampCityApi["submitProjectIntake"]>,
  getArchitectBrowserFoundationStatus: () =>
    ipcRenderer.invoke(
      "architectBrowser:foundationStatus",
    ) as ReturnType<ChampCityApi["getArchitectBrowserFoundationStatus"]>,
  onArchitectBrowserFoundationStatus: (listener) => {
    const wrapped = (_event: Electron.IpcRendererEvent, status: Parameters<typeof listener>[0]): void => {
      listener(status);
    };
    ipcRenderer.on("architectBrowser:statusChanged", wrapped);
    return () => ipcRenderer.removeListener("architectBrowser:statusChanged", wrapped);
  },
  onWorkspaceEvidenceChanged: (listener) => {
    const wrapped = (_event: Electron.IpcRendererEvent, notification: Parameters<typeof listener>[0]): void => {
      listener(notification);
    };
    ipcRenderer.on("workspace:evidenceChanged", wrapped);
    return () => ipcRenderer.removeListener("workspace:evidenceChanged", wrapped);
  },
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
  getProjectPlanningWorkspaceModel: () =>
    ipcRenderer.invoke(
      "projectPlanning:getWorkspaceModel",
    ) as ReturnType<ChampCityApi["getProjectPlanningWorkspaceModel"]>,
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
  regenerateArchitectInterviewPrompt: () =>
    ipcRenderer.invoke(
      "architectOutput:regenerateInterviewPrompt",
    ) as ReturnType<ChampCityApi["regenerateArchitectInterviewPrompt"]>,
  copyArchitectOutputHandoff: (workspaceId) =>
    ipcRenderer.invoke(
      "architectOutput:copyHandoff",
      workspaceId,
    ) as ReturnType<ChampCityApi["copyArchitectOutputHandoff"]>,
  prepareArchitectInterviewFinalDraftHandoff: () =>
    ipcRenderer.invoke(
      "architectInterview:prepareFinalDraftHandoff",
    ) as ReturnType<ChampCityApi["prepareArchitectInterviewFinalDraftHandoff"]>,
  copyArchitectInterviewFinalDraftHandoff: () =>
    ipcRenderer.invoke(
      "architectInterview:copyFinalDraftHandoff",
    ) as ReturnType<ChampCityApi["copyArchitectInterviewFinalDraftHandoff"]>,
  preparePhaseInterviewFinalDraftHandoff: () =>
    ipcRenderer.invoke(
      "phaseInterview:prepareFinalDraftHandoff",
    ) as ReturnType<ChampCityApi["preparePhaseInterviewFinalDraftHandoff"]>,
  copyPhaseInterviewFinalDraftHandoff: () =>
    ipcRenderer.invoke(
      "phaseInterview:copyFinalDraftHandoff",
    ) as ReturnType<ChampCityApi["copyPhaseInterviewFinalDraftHandoff"]>,
  reviewArchitectOutput: (workspaceId, status, operatorReviewNotes, presentedRevisions, selectedDocumentId) =>
    ipcRenderer.invoke(
      "architectOutput:review",
      workspaceId,
      status,
      operatorReviewNotes,
      presentedRevisions,
      selectedDocumentId,
    ) as ReturnType<ChampCityApi["reviewArchitectOutput"]>,
  getCurrentWorkspaceModel: () =>
    ipcRenderer.invoke(
      "currentWorkflow:getModel",
    ) as ReturnType<ChampCityApi["getCurrentWorkspaceModel"]>,
  getCodexImplementerExecutionStatus: () =>
    ipcRenderer.invoke(
      "codexImplementer:getStatus",
    ) as ReturnType<ChampCityApi["getCodexImplementerExecutionStatus"]>,
  getCodexManagedRuntimeStatus: () => ipcRenderer.invoke("codexRuntime:getStatus"),
  setCodexModelSelection: (selection) => ipcRenderer.invoke("codexRuntime:setSelection", selection),
  startCodexImplementerExecution: (selection) =>
    ipcRenderer.invoke(
      "codexImplementer:start",
      selection,
    ) as ReturnType<ChampCityApi["startCodexImplementerExecution"]>,
  startCodexEnvironmentResolution: () =>
    ipcRenderer.invoke(
      "codexImplementer:startEnvironmentResolution",
    ) as ReturnType<ChampCityApi["startCodexEnvironmentResolution"]>,
  respondToCodexUserInput: (response) =>
    ipcRenderer.invoke(
      "codexImplementer:respondToUserInput",
      response,
    ) as ReturnType<ChampCityApi["respondToCodexUserInput"]>,
  respondToCodexApproval: (response: CodexApprovalResponse) =>
    ipcRenderer.invoke(
      "codexImplementer:respondToApproval",
      response,
    ) as ReturnType<ChampCityApi["respondToCodexApproval"]>,
  respondToCodexMcpElicitation: (response) =>
    ipcRenderer.invoke(
      "codexImplementer:respondToMcpElicitation",
      response,
    ) as ReturnType<ChampCityApi["respondToCodexMcpElicitation"]>,
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
  getPhaseValidationActionProjection: () =>
    ipcRenderer.invoke(
      "currentWorkflow:getPhaseValidationActionProjection",
    ) as ReturnType<ChampCityApi["getPhaseValidationActionProjection"]>,
  getCloseReturnSelectionProjection: () =>
    ipcRenderer.invoke(
      "currentWorkflow:getCloseReturnSelectionProjection",
    ) as ReturnType<ChampCityApi["getCloseReturnSelectionProjection"]>,
  generateCloseReturnNextIntakeHandoff: (candidateId) =>
    ipcRenderer.invoke(
      "currentWorkflow:generateCloseReturnNextIntakeHandoff",
      candidateId,
    ) as ReturnType<ChampCityApi["generateCloseReturnNextIntakeHandoff"]>,
  copyCurrentWorkCardAdvisoryReviewPrompt: () =>
    ipcRenderer.invoke(
      "currentWorkflow:copyAdvisoryReviewPrompt",
    ) as ReturnType<ChampCityApi["copyCurrentWorkCardAdvisoryReviewPrompt"]>,
  applyOperatorValidationDecisionForCurrentWorkCard: (input, selectedDocumentId) =>
    ipcRenderer.invoke(
      "currentWorkflow:applyOperatorValidationDecision",
      input,
      selectedDocumentId,
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
