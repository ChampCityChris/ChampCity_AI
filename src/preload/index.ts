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
  getIssueWorkflowPlanning: workflowId => ipcRenderer.invoke("issuePlanning:get", workflowId) as ReturnType<ChampCityApi["getIssueWorkflowPlanning"]>,
  saveIssueWorkflowIntake: (workflowId, intake) => ipcRenderer.invoke("issuePlanning:saveIntake", workflowId, intake) as ReturnType<ChampCityApi["saveIssueWorkflowIntake"]>,
  addIssueWorkflowEvidence: (workflowId, files) => ipcRenderer.invoke("issuePlanning:addEvidence", workflowId, files) as ReturnType<ChampCityApi["addIssueWorkflowEvidence"]>,
  prepareIssueWorkflowPlanning: (workflowId, stage) => ipcRenderer.invoke("issuePlanning:prepare", workflowId, stage) as ReturnType<ChampCityApi["prepareIssueWorkflowPlanning"]>,
  actOnIssueWorkflowPlanning: (workflowId, action) => ipcRenderer.invoke("issuePlanning:act", workflowId, action) as ReturnType<ChampCityApi["actOnIssueWorkflowPlanning"]>,
  copyIssueWorkflowPlanningHandoff: workflowId => ipcRenderer.invoke("issuePlanning:copy", workflowId) as ReturnType<ChampCityApi["copyIssueWorkflowPlanningHandoff"]>,
  getFeaturePlanning: workflowId => ipcRenderer.invoke("featurePlanning:get", workflowId) as ReturnType<ChampCityApi["getFeaturePlanning"]>,
  saveFeatureIntake: (workflowId, intake) => ipcRenderer.invoke("featurePlanning:saveIntake", workflowId, intake) as ReturnType<ChampCityApi["saveFeatureIntake"]>,
  prepareFeaturePlanning: (workflowId, stage) => ipcRenderer.invoke("featurePlanning:prepare", workflowId, stage) as ReturnType<ChampCityApi["prepareFeaturePlanning"]>,
  actOnFeaturePlanning: (workflowId, action) => ipcRenderer.invoke("featurePlanning:act", workflowId, action) as ReturnType<ChampCityApi["actOnFeaturePlanning"]>,
  copyFeaturePlanningHandoff: workflowId => ipcRenderer.invoke("featurePlanning:copy", workflowId) as ReturnType<ChampCityApi["copyFeaturePlanningHandoff"]>,
  getStructuredWorkRouting: (intakeId, workflowId) => ipcRenderer.invoke("structuredWIR:get", intakeId, workflowId) as ReturnType<ChampCityApi["getStructuredWorkRouting"]>,
  prepareStructuredWorkRouting: (intakeId, workflowId) => ipcRenderer.invoke("structuredWIR:prepare", intakeId, workflowId) as ReturnType<ChampCityApi["prepareStructuredWorkRouting"]>,
  decideStructuredWorkRouting: (intakeId, workflowId, input) => ipcRenderer.invoke("structuredWIR:decide", intakeId, workflowId, input) as ReturnType<ChampCityApi["decideStructuredWorkRouting"]>,
  copyStructuredWorkRouting: (intakeId, workflowId) => ipcRenderer.invoke("structuredWIR:copy", intakeId, workflowId) as ReturnType<ChampCityApi["copyStructuredWorkRouting"]>,
  listWorkflows: () => ipcRenderer.invoke("workflow:list") as ReturnType<ChampCityApi["listWorkflows"]>,
  startWorkflow: (request) => ipcRenderer.invoke("workflow:start", request) as ReturnType<ChampCityApi["startWorkflow"]>,
  getWorkflow: (workflowId) => ipcRenderer.invoke("workflow:get", workflowId) as ReturnType<ChampCityApi["getWorkflow"]>,
  getWorkItemValidation: (workflowId, workItemId) => ipcRenderer.invoke("workflow:workItemValidation", workflowId, workItemId) as ReturnType<ChampCityApi["getWorkItemValidation"]>,
  getWorkflowExecutionProjection: workflowId => ipcRenderer.invoke("workflow:executionProjection", workflowId) as ReturnType<ChampCityApi["getWorkflowExecutionProjection"]>,
  decomposeWorkflowWorkItem: input => ipcRenderer.invoke("workflow:decomposeWorkItem", input) as ReturnType<ChampCityApi["decomposeWorkflowWorkItem"]>,
  acceptWorkflowWorkItemExecutionPlan: input => ipcRenderer.invoke("workflow:acceptWorkItemExecutionPlan", input) as ReturnType<ChampCityApi["acceptWorkflowWorkItemExecutionPlan"]>,
  recordWorkflowWorkItemVisualCriterion: input => ipcRenderer.invoke("workflow:recordWorkItemVisualCriterion", input) as ReturnType<ChampCityApi["recordWorkflowWorkItemVisualCriterion"]>,
  recordWorkflowWorkItemCriterionDecision: input => ipcRenderer.invoke("workflow:recordWorkItemCriterionDecision", input) as ReturnType<ChampCityApi["recordWorkflowWorkItemCriterionDecision"]>,
  getWorkflowPhaseValidation: (workflowId, phaseId) => ipcRenderer.invoke("workflow:phaseValidation", workflowId, phaseId) as ReturnType<ChampCityApi["getWorkflowPhaseValidation"]>,
  validateWorkflowPhaseDeterministicCriterion: (workflowId, phaseId, criterionId) => ipcRenderer.invoke("workflow:validateDeterministicPhaseCriterion", workflowId, phaseId, criterionId) as ReturnType<ChampCityApi["validateWorkflowPhaseDeterministicCriterion"]>,
  validateWorkflowPhaseSemanticCriterion: (workflowId, phaseId, criterionId, selection) => ipcRenderer.invoke("workflow:validateSemanticPhaseCriterion", workflowId, phaseId, criterionId, selection) as ReturnType<ChampCityApi["validateWorkflowPhaseSemanticCriterion"]>,
  recordWorkflowPhaseVisualCriterion: input => ipcRenderer.invoke("workflow:recordPhaseVisualCriterion", input) as ReturnType<ChampCityApi["recordWorkflowPhaseVisualCriterion"]>,
  recordWorkflowPhaseCriterionDecision: input => ipcRenderer.invoke("workflow:recordPhaseCriterionDecision", input) as ReturnType<ChampCityApi["recordWorkflowPhaseCriterionDecision"]>,
  completeWorkflowWorkItem: (workflowId, workItemId, expectedVersion) => ipcRenderer.invoke("workflow:completeWorkItem", workflowId, workItemId, expectedVersion) as ReturnType<ChampCityApi["completeWorkflowWorkItem"]>,
  completeWorkflowPhase: (workflowId, phaseId, expectedVersion) => ipcRenderer.invoke("workflow:completePhase", workflowId, phaseId, expectedVersion) as ReturnType<ChampCityApi["completeWorkflowPhase"]>,
  getWorkflowExecutionCompletion: (workflowId) => ipcRenderer.invoke("workflow:executionCompletion", workflowId) as ReturnType<ChampCityApi["getWorkflowExecutionCompletion"]>,
  completeWorkflowExecution: (workflowId, expectedVersion) => ipcRenderer.invoke("workflow:completeExecution", workflowId, expectedVersion) as ReturnType<ChampCityApi["completeWorkflowExecution"]>,
  getWorkflowIntegration: (workflowId) => ipcRenderer.invoke("workflow:integrationQuery", workflowId) as ReturnType<ChampCityApi["getWorkflowIntegration"]>,
  integrateWorkflow: (workflowId) => ipcRenderer.invoke("workflow:integrate", workflowId) as ReturnType<ChampCityApi["integrateWorkflow"]>,
  prepareWorkflowIntegrationRepair: (workflowId, candidateId) => ipcRenderer.invoke("workflow:integrationPrepareRepair", workflowId, candidateId) as ReturnType<ChampCityApi["prepareWorkflowIntegrationRepair"]>,
  applyWorkflowIntegrationRepair: (workflowId, candidateId, repairId, patches) => ipcRenderer.invoke("workflow:integrationApplyRepair", workflowId, candidateId, repairId, patches) as ReturnType<ChampCityApi["applyWorkflowIntegrationRepair"]>,
  completeWorkflowIntegrationRepair: (workflowId, candidateId, repairId) => ipcRenderer.invoke("workflow:integrationCompleteRepair", workflowId, candidateId, repairId) as ReturnType<ChampCityApi["completeWorkflowIntegrationRepair"]>,
  requestWorkflowIntegrationDecision: (workflowId, candidateId, repairId, rationale) => ipcRenderer.invoke("workflow:integrationOperatorDecision", workflowId, candidateId, repairId, rationale) as ReturnType<ChampCityApi["requestWorkflowIntegrationDecision"]>,
  createWorkflowRepair: (workflowId, workItemId, failureEvidenceId) => ipcRenderer.invoke("workflow:createRepair", workflowId, workItemId, failureEvidenceId) as ReturnType<ChampCityApi["createWorkflowRepair"]>,
  createWorkflowPhaseRepair: (workflowId, phaseId, failureEvidenceId) => ipcRenderer.invoke("workflow:createPhaseRepair", workflowId, phaseId, failureEvidenceId) as ReturnType<ChampCityApi["createWorkflowPhaseRepair"]>,
  validateSemanticWorkflowCriterion: (workflowId, workItemId, criterionId, selection) => ipcRenderer.invoke("workflow:validateSemanticCriterion", workflowId, workItemId, criterionId, selection) as ReturnType<ChampCityApi["validateSemanticWorkflowCriterion"]>,
  validateDeterministicWorkflowCriterion: (workflowId, workItemId, criterionId) => ipcRenderer.invoke("workflow:validateDeterministicCriterion", workflowId, workItemId, criterionId) as ReturnType<ChampCityApi["validateDeterministicWorkflowCriterion"]>,
  getSourceGraph: (options) => ipcRenderer.invoke("sourceGraph:get", options),
  getSourceGraphRevisionDetail: (revisionId) => ipcRenderer.invoke("sourceGraph:revisionDetail", revisionId),
  getWorkIntakeProjection: () => ipcRenderer.invoke("workIntake:projection"),
  submitWorkIntake: (submission) => ipcRenderer.invoke("workIntake:submit", submission),
  getGithubProviderStatus: () => ipcRenderer.invoke("githubProvider:status"),
  connectGithubProvider: () => ipcRenderer.invoke("githubProvider:connect"),
  restartGithubProvider: () => ipcRenderer.invoke("githubProvider:restart"),
  disconnectGithubProvider: () => ipcRenderer.invoke("githubProvider:disconnect"),
  readGithubEvidence: (request) => ipcRenderer.invoke("githubProvider:read", request),
  getSelectedWorkspace: () => ipcRenderer.invoke("workspace:get") as Promise<WorkspaceSelection>,
  chooseWorkspaceFolder: () => ipcRenderer.invoke("workspace:choose") as Promise<WorkspaceSelection>,
  inspectExistingProjectGitAdoption: () => ipcRenderer.invoke("project:inspectExistingGitAdoption") as ReturnType<ChampCityApi["inspectExistingProjectGitAdoption"]>,
  applyExistingProjectGitAdoption: planId => ipcRenderer.invoke("project:applyExistingGitAdoption", planId) as ReturnType<ChampCityApi["applyExistingProjectGitAdoption"]>,
  registerCurrentProject: (mode, projectName) => ipcRenderer.invoke("project:registerCurrent", mode, projectName) as ReturnType<ChampCityApi["registerCurrentProject"]>,
  reconcileCurrentProjectModelAccess: () => ipcRenderer.invoke("project:reconcileModelAccess") as ReturnType<ChampCityApi["reconcileCurrentProjectModelAccess"]>,
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
  repairIssueDevelopmentEnvironment: (issueId, fixCardId, currentImplementationId) =>
    ipcRenderer.invoke(
      "issueResolution:repairIssueDevelopmentEnvironment",
      issueId,
      fixCardId,
      currentImplementationId,
    ) as ReturnType<ChampCityApi["repairIssueDevelopmentEnvironment"]>,
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
  getWorkflowWorkItemCodexExecutionStatus: (workflowId, workItemId) =>
    ipcRenderer.invoke("codexImplementer:getWorkflowWorkItemStatus", workflowId, workItemId) as ReturnType<ChampCityApi["getWorkflowWorkItemCodexExecutionStatus"]>,
  getWorkflowWorkItemTesterStatus: (workflowId, workItemId, implementationRecordId) =>
    ipcRenderer.invoke("codexTester:getWorkflowWorkItemStatus", workflowId, workItemId, implementationRecordId) as ReturnType<ChampCityApi["getWorkflowWorkItemTesterStatus"]>,
  getWorkflowCheckpointRecovery: (workflowId, workItemId) => ipcRenderer.invoke("workflow:checkpointRecovery", workflowId, workItemId) as ReturnType<ChampCityApi["getWorkflowCheckpointRecovery"]>,
  retryWorkflowImplementationCheckpoint: (workflowId, workItemId, implementationRecordId) => ipcRenderer.invoke("workflow:retryImplementationCheckpoint", workflowId, workItemId, implementationRecordId) as ReturnType<ChampCityApi["retryWorkflowImplementationCheckpoint"]>,
  retryWorkflowTesterCheckpoint: (workflowId, workItemId, implementationRecordId, testerResultId) => ipcRenderer.invoke("workflow:retryTesterCheckpoint", workflowId, workItemId, implementationRecordId, testerResultId) as ReturnType<ChampCityApi["retryWorkflowTesterCheckpoint"]>,
  getCodexManagedRuntimeStatus: () => ipcRenderer.invoke("codexRuntime:getStatus"),
  setCodexModelSelection: (selection) => ipcRenderer.invoke("codexRuntime:setSelection", selection),
  startCodexImplementerExecution: (selection) =>
    ipcRenderer.invoke(
      "codexImplementer:start",
      selection,
    ) as ReturnType<ChampCityApi["startCodexImplementerExecution"]>,
  startWorkflowWorkItemCodexExecution: (workflowId, workItemId, selection) =>
    ipcRenderer.invoke("codexImplementer:startWorkflowWorkItem", workflowId, workItemId, selection) as ReturnType<ChampCityApi["startWorkflowWorkItemCodexExecution"]>,
  startWorkflowWorkItemTester: (workflowId, workItemId, implementationRecordId, selection) =>
    ipcRenderer.invoke("codexTester:startWorkflowWorkItem", workflowId, workItemId, implementationRecordId, selection) as ReturnType<ChampCityApi["startWorkflowWorkItemTester"]>,
  cancelWorkflowWorkItemTester: (workflowId, workItemId, implementationRecordId) =>
    ipcRenderer.invoke("codexTester:cancel", workflowId, workItemId, implementationRecordId) as ReturnType<ChampCityApi["cancelWorkflowWorkItemTester"]>,
  respondToWorkflowWorkItemTesterApproval: (workflowId, workItemId, implementationRecordId, requestId, decision) =>
    ipcRenderer.invoke("codexTester:respondToApproval", workflowId, workItemId, implementationRecordId, requestId, decision) as ReturnType<ChampCityApi["respondToWorkflowWorkItemTesterApproval"]>,
  respondToWorkflowWorkItemTesterInput: (workflowId, workItemId, implementationRecordId, requestId, answers) =>
    ipcRenderer.invoke("codexTester:respondToUserInput", workflowId, workItemId, implementationRecordId, requestId, answers) as ReturnType<ChampCityApi["respondToWorkflowWorkItemTesterInput"]>,
  repairDevelopmentEnvironment: () =>
    ipcRenderer.invoke(
      "developmentEnvironment:repair",
    ) as ReturnType<ChampCityApi["repairDevelopmentEnvironment"]>,
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
  cancelCodexImplementerExecution: (identity) =>
    ipcRenderer.invoke(
      "codexImplementer:cancel",
      identity,
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
