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
  getGreenfieldNavigation: workflowId => ipcRenderer.invoke("workflow:greenfieldNavigation", workflowId) as ReturnType<ChampCityApi["getGreenfieldNavigation"]>,
  exportMarkdownDocument: request => ipcRenderer.invoke("documents:exportMarkdown", request) as ReturnType<ChampCityApi["exportMarkdownDocument"]>,
  getStructuredWorkItemPlanning: (workflowId, workItemId) => ipcRenderer.invoke("workflow:workItemPlanningGet", workflowId, workItemId),
  saveStructuredWorkItemPlanning: (workflowId, workItemId, json) => ipcRenderer.invoke("workflow:workItemPlanningSave", workflowId, workItemId, json),
  reviewStructuredWorkItemPlanning: (workflowId, workItemId, input) => ipcRenderer.invoke("workflow:workItemPlanningReview", workflowId, workItemId, input),
  decomposeStructuredWorkItemPlanning: (workflowId, workItemId, json) => ipcRenderer.invoke("workflow:workItemPlanningDecompose", workflowId, workItemId, json),
  getStructuredPhaseLoop: (workflowId, phaseId, stageKind) => ipcRenderer.invoke("workflow:phaseLoopGet", workflowId, phaseId, stageKind),
  saveStructuredPhaseLoop: (workflowId, phaseId, stageKind, input) => ipcRenderer.invoke("workflow:phaseLoopSave", workflowId, phaseId, stageKind, input),
  reviewStructuredPhaseLoop: (workflowId, phaseId, stageKind, cycleId, input) => ipcRenderer.invoke("workflow:phaseLoopReview", workflowId, phaseId, stageKind, cycleId, input),


  getStructuredPhaseMap: (workflowId) => ipcRenderer.invoke("workflow:phaseMapGet", workflowId),
  saveStructuredPhaseMap: (workflowId, candidate) => ipcRenderer.invoke("workflow:phaseMapSave", workflowId, candidate),
  reviewStructuredPhaseMap: (workflowId, cycleId, input) => ipcRenderer.invoke("workflow:phaseMapReview", workflowId, cycleId, input),
  getStructuredProjectPlanning: (workflowId) => ipcRenderer.invoke("workflow:projectPlanningGet", workflowId),
  saveStructuredProjectPlanning: (workflowId, candidate) => ipcRenderer.invoke("workflow:projectPlanningSave", workflowId, candidate),
  reviewStructuredProjectPlanning: (workflowId, cycleId, input) => ipcRenderer.invoke("workflow:projectPlanningReview", workflowId, cycleId, input),
  getExactWorkflowPlanning: workflowId => ipcRenderer.invoke("workflow:planningGet", workflowId) as ReturnType<ChampCityApi["getExactWorkflowPlanning"]>,
  prepareExactWorkflowPlanning: workflowId => ipcRenderer.invoke("workflow:planningPrepare", workflowId) as ReturnType<ChampCityApi["prepareExactWorkflowPlanning"]>,
  saveExactWorkflowPlan: (workflowId, candidate) => ipcRenderer.invoke("workflow:planningSave", workflowId, candidate) as ReturnType<ChampCityApi["saveExactWorkflowPlan"]>,
  reviewExactWorkflowPlan: (workflowId, cycleId, input) => ipcRenderer.invoke("workflow:planningReview", workflowId, cycleId, input) as ReturnType<ChampCityApi["reviewExactWorkflowPlan"]>,
  closeExactResearch: workflowId => ipcRenderer.invoke("workflow:researchClose", workflowId) as ReturnType<ChampCityApi["closeExactResearch"]>,
  getIssueWorkflowPlanning: workflowId => ipcRenderer.invoke("issuePlanning:get", workflowId) as ReturnType<ChampCityApi["getIssueWorkflowPlanning"]>,
  addIssueWorkflowEvidence: (workflowId, files) => ipcRenderer.invoke("issuePlanning:addEvidence", workflowId, files) as ReturnType<ChampCityApi["addIssueWorkflowEvidence"]>,
  prepareIssueWorkflowPlanning: (workflowId, stage) => ipcRenderer.invoke("issuePlanning:prepare", workflowId, stage) as ReturnType<ChampCityApi["prepareIssueWorkflowPlanning"]>,
  actOnIssueWorkflowPlanning: (workflowId, action) => ipcRenderer.invoke("issuePlanning:act", workflowId, action) as ReturnType<ChampCityApi["actOnIssueWorkflowPlanning"]>,
  copyIssueWorkflowPlanningHandoff: workflowId => ipcRenderer.invoke("issuePlanning:copy", workflowId) as ReturnType<ChampCityApi["copyIssueWorkflowPlanningHandoff"]>,
  getWorkflowIntake: workflowId => ipcRenderer.invoke("workflow:getIntake", workflowId) as ReturnType<ChampCityApi["getWorkflowIntake"]>,
  getStructuredArchitectWorkspace: workflowId => ipcRenderer.invoke("workflow:architectGet", workflowId) as ReturnType<ChampCityApi["getStructuredArchitectWorkspace"]>,
  prepareStructuredArchitectWorkspace: workflowId => ipcRenderer.invoke("workflow:architectPrepare", workflowId) as ReturnType<ChampCityApi["prepareStructuredArchitectWorkspace"]>,
  saveStructuredArchitectOutput: (workflowId, input) => ipcRenderer.invoke("workflow:architectSave", workflowId, input) as ReturnType<ChampCityApi["saveStructuredArchitectOutput"]>,
  reviewStructuredArchitectOutput: (workflowId, cycleId, input) => ipcRenderer.invoke("workflow:architectReview", workflowId, cycleId, input) as ReturnType<ChampCityApi["reviewStructuredArchitectOutput"]>,
  reviewWorkflowIntake: (workflowId, input) => ipcRenderer.invoke("workflow:reviewIntake", workflowId, input) as ReturnType<ChampCityApi["reviewWorkflowIntake"]>,
  saveWorkflowIntake: (workflowId, payload, expectedIntakeRecordVersion) => ipcRenderer.invoke("workflow:saveIntake", workflowId, payload, expectedIntakeRecordVersion) as ReturnType<ChampCityApi["saveWorkflowIntake"]>,
  getFeaturePlanning: workflowId => ipcRenderer.invoke("featurePlanning:get", workflowId) as ReturnType<ChampCityApi["getFeaturePlanning"]>,
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
  getCloseAdvance:(workflowId,scope,entityId)=>ipcRenderer.invoke("closeAdvance:get",workflowId,scope,entityId),
  closeAndAdvance:input=>ipcRenderer.invoke("closeAdvance:close",input),
  recordProjectCriterion:input=>ipcRenderer.invoke("closeAdvance:projectCriterion",input),
  getStructuredWorkItemReview: (workflowId,workItemId) => ipcRenderer.invoke("workReview:get",workflowId,workItemId),
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












  getWorkflowWorkItemCodexExecutionStatus: (workflowId, workItemId) =>
    ipcRenderer.invoke("codexImplementer:getWorkflowWorkItemStatus", workflowId, workItemId) as ReturnType<ChampCityApi["getWorkflowWorkItemCodexExecutionStatus"]>,
  getWorkflowWorkItemTesterStatus: (workflowId, workItemId, implementationRecordId) =>
    ipcRenderer.invoke("codexTester:getWorkflowWorkItemStatus", workflowId, workItemId, implementationRecordId) as ReturnType<ChampCityApi["getWorkflowWorkItemTesterStatus"]>,
  getWorkflowCheckpointRecovery: (workflowId, workItemId) => ipcRenderer.invoke("workflow:checkpointRecovery", workflowId, workItemId) as ReturnType<ChampCityApi["getWorkflowCheckpointRecovery"]>,
  retryWorkflowImplementationCheckpoint: (workflowId, workItemId, implementationRecordId) => ipcRenderer.invoke("workflow:retryImplementationCheckpoint", workflowId, workItemId, implementationRecordId) as ReturnType<ChampCityApi["retryWorkflowImplementationCheckpoint"]>,
  retryWorkflowTesterCheckpoint: (workflowId, workItemId, implementationRecordId, testerResultId) => ipcRenderer.invoke("workflow:retryTesterCheckpoint", workflowId, workItemId, implementationRecordId, testerResultId) as ReturnType<ChampCityApi["retryWorkflowTesterCheckpoint"]>,
  getCodexManagedRuntimeStatus: () => ipcRenderer.invoke("codexRuntime:getStatus"),
  retryCodexRuntime: () => ipcRenderer.invoke("codexRuntime:retry"),
  refreshCodexConnections: () => ipcRenderer.invoke("codexRuntime:refreshConnections"),
  setCodexConnectionEnabled: (name, enabled) => ipcRenderer.invoke("codexRuntime:setConnectionEnabled", name, enabled),
  setCodexModelSelection: (selection) => ipcRenderer.invoke("codexRuntime:setSelection", selection),

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















};

contextBridge.exposeInMainWorld("champcity", api);
