import { contextBridge, ipcRenderer } from "electron";

import type {
  NextWorkCardIdResult,
  WorkCardDraftInput,
  WorkCardPreviewResult,
  WorkCardSaveResult,
} from "../shared/workCards/workCardDraft";
import type {
  ProjectIntakeInput,
  ProjectIntakePreviewResult,
  ProjectIntakeSaveResult,
} from "../shared/workCards/projectIntake";
import type {
  ListSavedProjectIntakesResult,
  ProjectArchitectInterviewPromptPreviewResult,
  ProjectArchitectInterviewPromptRequest,
  ProjectArchitectInterviewPromptSaveResult,
} from "../shared/workCards/projectArchitectInterviewPrompt";
import type {
  ListSavedProjectArchitectInterviewPromptsResult,
  ListSavedProjectPlanningDocumentsResult,
  ProjectPlanningDocumentsPreviewResult,
  ProjectPlanningDocumentsRequest,
  ProjectPlanningDocumentsSaveResult,
} from "../shared/workCards/projectPlanningDocuments";
import type {
  PhaseIntakeInput,
  PhaseIntakePreviewResult,
  PhaseIntakeSaveResult,
} from "../shared/workCards/phaseIntake";
import type {
  ListSavedPhaseArchitectInterviewPromptsResult,
  ListSavedPhaseIntakesResult,
  PhaseArchitectInterviewPromptPreviewResult,
  PhaseArchitectInterviewPromptRequest,
  PhaseArchitectInterviewPromptSaveResult,
} from "../shared/workCards/phaseArchitectInterviewPrompt";
import type {
  ListSavedRepositoryReconciliationsResult,
  RepositoryReconciliationPreviewResult,
  RepositoryReconciliationPromptPreviewResult,
  RepositoryReconciliationPromptRequest,
  RepositoryReconciliationRequest,
  RepositoryReconciliationSaveResult,
} from "../shared/workCards/repositoryReconciliation";
import type {
  PhasePlanningDocumentsPreviewResult,
  PhasePlanningDocumentsRequest,
  PhasePlanningDocumentsSaveResult,
} from "../shared/workCards/phasePlanningDocuments";
import type { ListSavedWorkCardPlansResult } from "../shared/workCards/workCardPlan";
import type {
  ListSavedProjectRoadmapsResult,
  ProjectRoadmapPreviewResult,
  ProjectRoadmapRequest,
  ProjectRoadmapSaveResult,
} from "../shared/workCards/projectRoadmap";
import type {
  ListSavedPhaseMapsResult,
  PhaseMapRequest,
  PhaseMapPreviewResult,
  PhaseMapSaveResult,
} from "../shared/workCards/phaseMap";
import type {
  ArchitectPromptPreviewResult,
  ArchitectPromptRequest,
  ArchitectPromptSaveResult,
  ListSavedWorkCardsResult,
} from "../shared/workCards/renderArchitectFramingPrompt";
import type {
  ImplementerExecutionPacketArtifactListResult,
  ImplementerExecutionPacketPreviewResult,
  ImplementerExecutionPacketRequest,
  ImplementerExecutionPacketSaveResult,
} from "../shared/workCards/renderImplementerExecutionPacket";
import type {
  ImplementerReportCapturePreviewResult,
  ImplementerReportCaptureRequest,
  ImplementerReportCaptureSaveResult,
} from "../shared/workCards/validateImplementerReport";
import type {
  RiskReviewPreviewResult,
  RiskReviewRequest,
  RiskReviewSaveResult,
} from "../shared/workCards/renderRiskReviewMarkdown";
import type {
  AvailablePhaseFoldersResult,
  ImplementerReportFileLoadRequest,
  ImplementerReportFileLoadResult,
  HumanValidationImplementerReportListRequest,
  HumanValidationImplementerReportListResult,
  HumanValidationFormInput,
  HumanValidationPreviewResult,
  HumanValidationSaveResult,
  HumanValidationStatusListResult,
  ValidationEvidenceFileImportRequest,
  ValidationEvidenceFileImportResult,
} from "../shared/workCards/validationRecord";
import type { ListValidationTargetsResult } from "../shared/workCards/validationTarget";
import type {
  PhaseCloseoutFormInput,
  PhaseCloseoutPreviewResult,
  PhaseCloseoutSaveResult,
  PhaseCloseoutSummaryResult,
} from "../shared/workCards/phaseCloseoutRecord";
import type { CurrentRequiredActionResult } from "../shared/workCards/currentActionProjection";
import type {
  RouteReviewRequestInput,
  RouteReviewRequestSaveResult,
} from "../shared/workCards/routeReviewRequest";
import type {
  ArchitectReviewFormInput,
  ArchitectReviewPreviewResult,
  ArchitectReviewSaveResult,
} from "../shared/workCards/architectReviewRecord";
import type {
  PlanningArtifactPreviewRequest,
  PlanningArtifactPreviewResult,
} from "../shared/workCards/artifactReviewWorkspace";
import type {
  ContextPacketExportResult,
  CurrentContextPacketExportRequest,
  CurrentContextPacketPreviewRequest,
  CurrentContextPacketPreviewResult,
} from "../shared/contextPackets/contextPacket";
import type { RoutedActionContract } from "../shared/workflow";
import type {
  AddProjectWorkspaceRequest,
  ProjectScanResult,
  ProjectWorkspaceListResult,
  ProjectWorkspaceMutationResult,
  RefreshRepositoryStateResult,
} from "../shared/projects";

let currentRoutedActionBinding: RoutedActionContract | null = null;

async function refreshCurrentRequiredAction(): Promise<CurrentRequiredActionResult> {
  const result = await ipcRenderer.invoke(
    "workCards:getCurrentRequiredAction",
  ) as CurrentRequiredActionResult;
  currentRoutedActionBinding =
    result.ok && result.currentAction?.routedAction
      ? result.currentAction.routedAction
      : null;
  return result;
}

function invokeProcess<T>(channel: string, input: unknown): Promise<T> {
  return ipcRenderer.invoke(channel, input, currentRoutedActionBinding);
}

const api = {
  listProjects: (): Promise<ProjectWorkspaceListResult> =>
    ipcRenderer.invoke("projects:list"),
  addProject: (
    input: AddProjectWorkspaceRequest,
  ): Promise<ProjectWorkspaceMutationResult> =>
    ipcRenderer.invoke("projects:add", input),
  selectProject: (projectId: string): Promise<ProjectWorkspaceMutationResult> =>
    ipcRenderer.invoke("projects:select", projectId),
  refreshRepositoryState: (): Promise<RefreshRepositoryStateResult> =>
    ipcRenderer.invoke("projects:refresh"),
  onRepositoryProjectionChanged: (
    listener: (result: ProjectScanResult) => void,
  ): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, result: ProjectScanResult) =>
      listener(result);
    ipcRenderer.on("repository:projectionChanged", handler);
    return () => ipcRenderer.removeListener("repository:projectionChanged", handler);
  },
  getAppInfo: () => ({
    name: "ChampCity A/I",
    stage: "Alpha app development",
    coreLoop: [
      "Project Intake",
      "Project Architect Interview",
      "Project Plan",
      "Reconcile / Project State Review",
      "Phase Map Composer",
      "Phase Planning Documents Generator",
      "Work Card Plan Review",
      "Ad Hoc Work Card Capture",
      "Architect",
      "Risk",
      "Implement",
      "Report",
      "Validate",
      "Closeout",
    ],
  }),
  listAvailablePhases: (): Promise<AvailablePhaseFoldersResult> =>
    ipcRenderer.invoke("workCards:listAvailablePhases"),
  previewProjectIntake: (
    input: ProjectIntakeInput,
  ): Promise<ProjectIntakePreviewResult> =>
    invokeProcess("projectIntake:preview", input),
  saveProjectIntake: (
    input: ProjectIntakeInput,
  ): Promise<ProjectIntakeSaveResult> =>
    invokeProcess("projectIntake:save", input),
  listSavedProjectIntakes: (): Promise<ListSavedProjectIntakesResult> =>
    ipcRenderer.invoke("projectArchitectInterview:listProjectIntakes"),
  previewProjectArchitectInterviewPrompt: (
    input: ProjectArchitectInterviewPromptRequest,
  ): Promise<ProjectArchitectInterviewPromptPreviewResult> =>
    invokeProcess("projectArchitectInterview:previewPrompt", input),
  saveProjectArchitectInterviewPrompt: (
    input: ProjectArchitectInterviewPromptRequest,
  ): Promise<ProjectArchitectInterviewPromptSaveResult> =>
    invokeProcess("projectArchitectInterview:savePrompt", input),
  listProjectPlanningDocumentProjectIntakes:
    (): Promise<ListSavedProjectIntakesResult> =>
      ipcRenderer.invoke("projectPlanningDocuments:listProjectIntakes"),
  listProjectPlanningDocumentArchitectPrompts:
    (): Promise<ListSavedProjectArchitectInterviewPromptsResult> =>
      ipcRenderer.invoke("projectPlanningDocuments:listArchitectPrompts"),
  previewProjectPlanningDocuments: (
    input: ProjectPlanningDocumentsRequest,
  ): Promise<ProjectPlanningDocumentsPreviewResult> =>
    invokeProcess("projectPlanningDocuments:preview", input),
  saveProjectPlanningDocuments: (
    input: ProjectPlanningDocumentsRequest,
  ): Promise<ProjectPlanningDocumentsSaveResult> =>
    invokeProcess("projectPlanningDocuments:save", input),
  listPhaseIntakeProjectPlanningDocuments:
    (): Promise<ListSavedProjectPlanningDocumentsResult> =>
      ipcRenderer.invoke("phaseIntake:listProjectPlanningDocuments"),
  previewPhaseIntake: (
    input: PhaseIntakeInput,
  ): Promise<PhaseIntakePreviewResult> =>
    invokeProcess("phaseIntake:preview", input),
  savePhaseIntake: (
    input: PhaseIntakeInput,
  ): Promise<PhaseIntakeSaveResult> =>
    invokeProcess("phaseIntake:save", input),
  listPhaseArchitectInterviewPhaseIntakes: (
    phase: string,
  ): Promise<ListSavedPhaseIntakesResult> =>
    ipcRenderer.invoke("phaseArchitectInterview:listPhaseIntakes", phase),
  previewPhaseArchitectInterviewPrompt: (
    input: PhaseArchitectInterviewPromptRequest,
  ): Promise<PhaseArchitectInterviewPromptPreviewResult> =>
    invokeProcess("phaseArchitectInterview:previewPrompt", input),
  savePhaseArchitectInterviewPrompt: (
    input: PhaseArchitectInterviewPromptRequest,
  ): Promise<PhaseArchitectInterviewPromptSaveResult> =>
    invokeProcess("phaseArchitectInterview:savePrompt", input),
  listRepositoryReconciliationProjectPlanningDocuments:
    (): Promise<ListSavedProjectPlanningDocumentsResult> =>
      ipcRenderer.invoke("repositoryReconciliation:listProjectPlanningDocuments"),
  previewRepositoryReconciliationPrompt: (
    input: RepositoryReconciliationPromptRequest,
  ): Promise<RepositoryReconciliationPromptPreviewResult> =>
    invokeProcess("repositoryReconciliation:previewPrompt", input),
  previewRepositoryReconciliation: (
    input: RepositoryReconciliationRequest,
  ): Promise<RepositoryReconciliationPreviewResult> =>
    invokeProcess("repositoryReconciliation:preview", input),
  saveRepositoryReconciliation: (
    input: RepositoryReconciliationRequest,
  ): Promise<RepositoryReconciliationSaveResult> =>
    invokeProcess("repositoryReconciliation:save", input),
  previewProjectRoadmap: (
    input: ProjectRoadmapRequest,
  ): Promise<ProjectRoadmapPreviewResult> =>
    invokeProcess("projectRoadmap:preview", input),
  saveProjectRoadmap: (
    input: ProjectRoadmapRequest,
  ): Promise<ProjectRoadmapSaveResult> =>
    invokeProcess("projectRoadmap:save", input),
  listSavedProjectRoadmaps: (): Promise<ListSavedProjectRoadmapsResult> =>
    ipcRenderer.invoke("projectRoadmap:listSaved"),
  previewPhaseMap: (
    input: PhaseMapRequest,
  ): Promise<PhaseMapPreviewResult> =>
    invokeProcess("phaseMap:preview", input),
  savePhaseMap: (input: PhaseMapRequest): Promise<PhaseMapSaveResult> =>
    invokeProcess("phaseMap:save", input),
  listSavedPhaseMaps: (): Promise<ListSavedPhaseMapsResult> =>
    ipcRenderer.invoke("phaseMap:listSaved"),
  listPhasePlanningProjectPlanningDocuments:
    (): Promise<ListSavedProjectPlanningDocumentsResult> =>
      ipcRenderer.invoke("phasePlanning:listProjectPlanningDocuments"),
  listPhasePlanningRepositoryReconciliations:
    (): Promise<ListSavedRepositoryReconciliationsResult> =>
      ipcRenderer.invoke("phasePlanning:listRepositoryReconciliations"),
  listPhasePlanningPhaseIntakes: (
    phase: string,
  ): Promise<ListSavedPhaseIntakesResult> =>
    ipcRenderer.invoke("phasePlanning:listPhaseIntakes", phase),
  listPhasePlanningPhaseArchitectInterviewPrompts: (
    phase: string,
  ): Promise<ListSavedPhaseArchitectInterviewPromptsResult> =>
    ipcRenderer.invoke("phasePlanning:listPhaseArchitectInterviewPrompts", phase),
  previewPhasePlanningDocuments: (
    input: PhasePlanningDocumentsRequest,
  ): Promise<PhasePlanningDocumentsPreviewResult> =>
    invokeProcess("phasePlanning:preview", input),
  savePhasePlanningDocuments: (
    input: PhasePlanningDocumentsRequest,
  ): Promise<PhasePlanningDocumentsSaveResult> =>
    invokeProcess("phasePlanning:save", input),
  listSavedWorkCardPlans: (
    phase: string,
  ): Promise<ListSavedWorkCardPlansResult> =>
    ipcRenderer.invoke("workCardPlans:listSaved", phase),
  getNextWorkCardId: (phase: string): Promise<NextWorkCardIdResult> =>
    ipcRenderer.invoke("workCards:getNextId", phase),
  previewWorkCardDraft: (
    input: WorkCardDraftInput,
  ): Promise<WorkCardPreviewResult> =>
    invokeProcess("workCards:previewDraft", input),
  saveWorkCardDraft: (input: WorkCardDraftInput): Promise<WorkCardSaveResult> =>
    invokeProcess("workCards:saveDraft", input),
  listSavedWorkCards: (phase: string): Promise<ListSavedWorkCardsResult> =>
    ipcRenderer.invoke("workCards:listSaved", phase),
  previewArchitectPrompt: (
    input: ArchitectPromptRequest,
  ): Promise<ArchitectPromptPreviewResult> =>
    invokeProcess("workCards:previewArchitectPrompt", input),
  saveArchitectPrompt: (
    input: ArchitectPromptRequest,
  ): Promise<ArchitectPromptSaveResult> =>
    invokeProcess("workCards:saveArchitectPrompt", input),
  previewRiskReview: (
    input: RiskReviewRequest,
  ): Promise<RiskReviewPreviewResult> =>
    invokeProcess("workCards:previewRiskReview", input),
  saveRiskReview: (input: RiskReviewRequest): Promise<RiskReviewSaveResult> =>
    invokeProcess("workCards:saveRiskReview", input),
  listImplementerExecutionPacketSupportingArtifacts: (
    input: ImplementerExecutionPacketRequest,
  ): Promise<ImplementerExecutionPacketArtifactListResult> =>
    ipcRenderer.invoke("workCards:listImplementerExecutionPacketSupportingArtifacts", input),
  previewImplementerExecutionPacket: (
    input: ImplementerExecutionPacketRequest,
  ): Promise<ImplementerExecutionPacketPreviewResult> =>
    invokeProcess("workCards:previewImplementerExecutionPacket", input),
  saveImplementerExecutionPacket: (
    input: ImplementerExecutionPacketRequest,
  ): Promise<ImplementerExecutionPacketSaveResult> =>
    invokeProcess("workCards:saveImplementerExecutionPacket", input),
  previewImplementerReportCapture: (
    input: ImplementerReportCaptureRequest,
  ): Promise<ImplementerReportCapturePreviewResult> =>
    invokeProcess("workCards:previewImplementerReportCapture", input),
  saveImplementerReportCapture: (
    input: ImplementerReportCaptureRequest,
  ): Promise<ImplementerReportCaptureSaveResult> =>
    invokeProcess("workCards:saveImplementerReportCapture", input),
  previewArchitectReviewRecord: (
    input: ArchitectReviewFormInput,
  ): Promise<ArchitectReviewPreviewResult> =>
    invokeProcess("workCards:previewArchitectReviewRecord", input),
  saveArchitectReviewRecord: (
    input: ArchitectReviewFormInput,
  ): Promise<ArchitectReviewSaveResult> =>
    invokeProcess("workCards:saveArchitectReviewRecord", input),
  saveCompletedViaRepairDisposition: (input: {
    rationale: string;
  }): Promise<{
    ok: boolean;
    jsonPath?: string;
    markdownPath?: string;
    nextActionId?: string | null;
    errorMessages?: string[];
  }> => ipcRenderer.invoke("workCards:saveCompletedViaRepairDisposition", input),
  loadImplementerReportFile: (
    input: ImplementerReportFileLoadRequest,
  ): Promise<ImplementerReportFileLoadResult> =>
    ipcRenderer.invoke("workCards:loadImplementerReportFile", input),
  listHumanValidationImplementerReports: (
    input: HumanValidationImplementerReportListRequest,
  ): Promise<HumanValidationImplementerReportListResult> =>
    ipcRenderer.invoke("workCards:listHumanValidationImplementerReports", input),
  listHumanValidationTargets: (
    phase: string,
  ): Promise<ListValidationTargetsResult> =>
    ipcRenderer.invoke("workCards:listHumanValidationTargets", phase),
  listHumanValidationStatuses: (
    phase: string,
  ): Promise<HumanValidationStatusListResult> =>
    ipcRenderer.invoke("workCards:listHumanValidationStatuses", phase),
  previewHumanValidationRecord: (
    input: HumanValidationFormInput,
  ): Promise<HumanValidationPreviewResult> =>
    invokeProcess("workCards:previewHumanValidationRecord", input),
  saveHumanValidationRecord: (
    input: HumanValidationFormInput,
  ): Promise<HumanValidationSaveResult> =>
    invokeProcess("workCards:saveHumanValidationRecord", input),
  attachValidationEvidenceFile: (
    input: ValidationEvidenceFileImportRequest,
  ): Promise<ValidationEvidenceFileImportResult> =>
    invokeProcess("workCards:attachValidationEvidenceFile", input),
  getPhaseCloseoutSummary: (
    phase: string,
  ): Promise<PhaseCloseoutSummaryResult> =>
    ipcRenderer.invoke("workCards:getPhaseCloseoutSummary", phase),
  getCurrentRequiredAction: (): Promise<CurrentRequiredActionResult> =>
    refreshCurrentRequiredAction(),
  previewCurrentContextPacket: (
    input: CurrentContextPacketPreviewRequest,
  ): Promise<CurrentContextPacketPreviewResult> =>
    invokeProcess("contextPackets:previewCurrent", input),
  exportCurrentContextPacket: (
    input: CurrentContextPacketExportRequest,
  ): Promise<ContextPacketExportResult> =>
    invokeProcess("contextPackets:exportCurrent", input),
  saveRouteReviewRequest: (
    input: RouteReviewRequestInput,
  ): Promise<RouteReviewRequestSaveResult> =>
    invokeProcess("workCards:saveRouteReviewRequest", input),
  previewPlanningArtifact: (
    input: PlanningArtifactPreviewRequest,
  ): Promise<PlanningArtifactPreviewResult> =>
    invokeProcess("workCards:previewPlanningArtifact", input),
  previewPhaseCloseoutRecord: (
    input: PhaseCloseoutFormInput,
  ): Promise<PhaseCloseoutPreviewResult> =>
    invokeProcess("workCards:previewPhaseCloseoutRecord", input),
  savePhaseCloseoutRecord: (
    input: PhaseCloseoutFormInput,
  ): Promise<PhaseCloseoutSaveResult> =>
    invokeProcess("workCards:savePhaseCloseoutRecord", input),
};

contextBridge.exposeInMainWorld("champCity", api);
