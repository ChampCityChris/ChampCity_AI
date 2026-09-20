import type { CodexModelSelection } from "../../shared/codexRuntimeContracts";
import { GithubProviderSettings } from "./GithubProviderSettings";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type FormEvent } from "react";
import { Bot, Clipboard, FileText, FolderOpen, Play, RefreshCw, RotateCcw, Settings as SettingsIcon, Square } from "lucide-react";
import {
  type ClosureDecision,
  type CloseReturnSelectionProjection,
  type CodexImplementerExecutionModel,
  type CurrentWorkspaceModel,
  type DevelopmentPostMutationProjection,
  type AgentHarnessAuthenticationMode,
  type AgentHarnessSettingsInput,
  type AgentHarnessServiceHostLifecycleSettingsInput,
  type AgentHarnessServiceHostLifecycleStatus,
  type AgentHarnessStatus,
  type AgentHarnessWorkspaceRegistrySnapshot,
  type ArchitectOutputWorkspaceModel,
  projectTypeOptions,
  type ProjectPlanningWorkspaceModel,
  type PhaseValidationActionProjection,
  type RuntimeActionResult,
  type WorkCardRepairProjection,
  type WorkCardMapCandidateProjection,
  type WorkCardMapProjection,
  workspaceDefinitions,
  type ArchitectBrowserFoundationStatus,
  type ArchitectInterviewRailStatus,
  type ProjectIntakeSubmission,
  type WorkspaceId,
  type WorkspaceSelection,
} from "../../shared/workspaceContracts";
import type {
  FirstNonApprovedResult,
  ResolvedCurrentDocument,
} from "../../shared/documents/documentOrder";
import type {
  PlanningDocumentDetail,
  PlanningDocumentSummary,
} from "../../shared/documents/planningDocument";
import type { DocumentDispositionStatus } from "../../shared/documents/documentDisposition";
import {
  classifyPlanningDocument,
  getWorkspaceDocumentCounts,
  getWorkspaceGroups,
} from "../../shared/workspaces/documentWorkspace";
import {
  shouldRenderGenericPreviewDispositionControls,
  shouldRenderInlineProjectIntakeDisposition,
  isArchitectInterviewDualPaneWorkspace,
} from "../../shared/workspaces/projectRailPresentation";
import {
  applySuccessfulProjectIntakeSubmission,
  clearProjectIntakePostSubmitReviewState,
  type ProjectIntakePostSubmitConfirmation,
} from "../../shared/projectIntake/postSubmitReviewState";
import { deriveProjectIntakeRailStatus } from "../../shared/projectIntake/projectIntakeCorpus";
import {
  deriveArchitectInterviewRailStatusFromDocuments,
  deriveProjectLifecycleRailStatuses,
} from "../../shared/workspaces/projectLifecycleRailStatus";
import {
  createArchitectAttachmentCoordinator,
  shouldShowArchitectBrowserRetry,
  type ArchitectHostMeasurement,
} from "../../shared/architectInterview/architectBrowserAttachmentCoordinator";
import { NestedWorkflowRail } from "./NestedWorkflowRail";
import { IssueResolutionRail } from "./IssueResolutionRail";
import { IssueResolutionWorkspace } from "./IssueResolutionWorkspace";
import { IssueArchitectPlanningWorkspace } from "./IssueArchitectPlanningWorkspace";
import { IssuePlanningWorkspace } from "./IssuePlanningWorkspace";
import { IssueValidationWorkspace } from "./IssueValidationWorkspace";
import { IssueCloseWorkspace } from "./IssueCloseWorkspace";
import {
  IssueFixCardCloseWorkspace,
  IssueFixCardContextStrip,
  IssueFixCardImplementWorkspace,
  IssueFixCardMapWorkspace,
  IssueFixCardPlanningWorkspace,
  IssueFixCardRepairWorkspace,
  IssueFixCardReviewValidationWorkspace,
} from "./IssueFixCardMapWorkspace";
import {
  FigmaPhaseMapWorkspace,
  PhaseMapDocumentPreview,
  shouldRenderPhaseMapDocumentPreview,
} from "./phaseMapPresentation";
import {
  shouldRenderWorkCardPlanDocumentPreview,
  WorkCardPlanDocumentPreview,
} from "./workCardPlanPresentation";
import {
  buildArchitectOutputEvidenceFingerprint,
  markSingleDisplayedArchitectOutputRevisionViewed,
  presentedRevisionsForArchitectOutputModel,
  revisionKeyForArchitectOutputSlot,
  selectArchitectOutputSlot,
} from "./architectOutputWorkspaceRefresh";
import { WorkCardIntakeWorkspace } from "./WorkCardIntakeWorkspace";
import { WorkCardBuildingReviewWorkspace } from "./WorkCardBuildingReviewWorkspace";
import { WorkCardReportReviewWorkspace, type OperatorValidationDecision } from "./WorkCardReportReviewWorkspace";
import {
  WorkCardCloseWorkspace,
  workCardCloseProjectionFromResult,
} from "./WorkCardCloseWorkspace";
import { WorkCardMapWorkspace } from "./WorkCardMapWorkspace";
import { WorkCardRepairWorkspace } from "./WorkCardRepairWorkspace";
import {
  executeCloseReturnCandidateIntake,
  executeCloseReturnToMap,
  refreshRendererRepositoryBinding,
} from "./closeReturnRendererOrchestration";
import {
  createEvidenceDrivenRefreshCoordinator,
  type EvidenceDrivenRefreshCoordinator,
  type EvidenceDrivenRefreshTarget,
} from "./evidenceDrivenRefreshCoordinator";
import {
  codexExecutionPresentationReducer,
  initialCodexExecutionPresentationState,
  issueCodexExecutionContextKey,
} from "./codexExecutionPresentationOwnership";
import { reconcileArchitectBrowserBoundsAck } from "./architectBrowserBoundsOrchestration";
import {
  shouldPollDevelopmentCodexExecution,
  shouldPollIssueCodexExecution,
  startAgentHarnessSettingsPolling,
} from "./rendererPollingPolicy";
import {
  executePhaseValidationMutation,
  loadPhaseValidationEntry,
  phaseValidationActionForWorkspace,
  phaseValidationPresentation,
} from "./phaseValidationRendererOrchestration";
import { FigmaDocumentCard, FigmaMarkdownBody } from "./FigmaDocumentCard";
import { FigmaDocumentDispositionPanel } from "./FigmaDocumentDispositionPanel";
import { FigmaAppStrip } from "./figma/FigmaAppStrip";
import { FigmaBrowserPanel } from "./figma/FigmaBrowserPanel";
import { FigmaSidebar, type FigmaThemeMode } from "./figma/FigmaSidebar";
import { LandingWorkspace } from "./LandingWorkspace";
import { WorkflowHubWorkspace } from "./WorkflowHubWorkspace";
import { WorkIntakeWorkspace } from "./WorkIntakeWorkspace";
import type { WorkIntakeProjection } from "../../shared/workIntakeContracts";
import { isWorkflowReviewDocument } from "./workflowReviewDocuments";
import type { WorkflowId } from "../../shared/workflowHubContracts";
import type {
  IssueArchitectPlanningProjection,
  IssueArchitectReviewInput,
  IssueCloseActionInput,
  IssueCloseProjection,
  IssueFixCardLoopStepId,
  IssueFixCardProjection,
  IssueFixCardValidationDecisionInput,
  IssueInventoryProjection,
  IssuePlanningProjection,
  IssuePostMutationProjection,
  IssueValidationDecisionInput,
  IssueValidationProjection,
  IssueRecordProjection,
  IssueResolutionNavigationProjection,
  IssueResolutionStageId,
  NewIssueInput,
} from "../../shared/issueResolutionContracts";
import { issueFixCardLoop } from "../../shared/issueResolutionContracts";

const neutralMessage = "Document workflow not yet implemented";
const handoffWorkspaceIds = new Set<WorkspaceId>([
  "phase-interview",
  "phase-planning-bundle",
  "phase-work-card-selection",
  "work-card-intake",
]);
const specializedDispositionWorkspaceIds = new Set<WorkspaceId>([
  "architect-interview",
  "project-planning-review",
  "project-phase-map",
  "phase-interview",
  "phase-planning-bundle",
  "work-card-planning",
  "work-card-report-review",
  "work-card-validation",
  "project-validation",
  "project-close",
]);
const dispositionOptions = [
  { label: "Approve", status: "Approved" },
  { label: "Reject", status: "Rejected" },
  { label: "Request Revision", status: "RevisionRequested" },
] as const;
const architectOutputPreparedFeedback =
  "Architect handoff prepared. Copy it and send it manually in embedded ChatGPT.";
const projectPlanningRevisionReadyFeedback =
  "Revision Request Ready. Copy Handoff and send it manually in embedded ChatGPT.";
const workCardPlanningRevisionReadyFeedback =
  "Revision request ready to copy. Select Copy Revision Request and send it manually in embedded ChatGPT.";
const architectOutputCopiedFeedback =
  "Architect handoff copied. Paste and send it manually in embedded ChatGPT.";
const architectInterviewFinalDraftPreparedFeedback =
  "Final Draft handoff prepared. Copy it after confirming the interview summary.";
const architectInterviewFinalDraftCopiedFeedback =
  "Final Draft handoff copied. Paste and send it manually after the interview summary is confirmed.";
const figmaThemePreferenceKey = "champcity:figma-theme";
const activeWorkCardResumeWorkspaceIds = new Set<WorkspaceId>([
  "work-card-planning",
  "work-card-building-review",
  "work-card-report-review",
  "work-card-repair",
  "work-card-close",
]);
export const settingsWorkspaceId = "settings" as WorkspaceId;

type ShellView = "landing" | "workflow-hub" | "workflow" | "settings" | "work-intake";
type SettingsReturnShellView = Exclude<ShellView, "landing" | "settings">;
type ProjectEntryDestination = "workflow-hub" | "project-intake-capture" | "work-intake";

const fallbackWorkspace: WorkspaceSelection = {
  ok: false,
  workspaceRoot: null,
  reason: "No project selected.",
};

const emptyProjectIntake: ProjectIntakeSubmission = {
  projectName: "",
  projectPurpose: "",
  desiredOutcome: "",
  projectType: "Desktop application",
  projectRepository: "",
  hasExistingSourceOrPlanning: false,
  knownConstraints: "",
  repositoryReviewContext: "",
};

type ArchitectActionFeedback = {
  kind: "success" | "info" | "error";
  message: string;
} | null;

export interface SettingsNavigationState {
  activeWorkspaceId: WorkspaceId;
  priorWorkflowWorkspaceId: WorkspaceId;
}

export function openSettingsNavigationState(
  activeWorkspaceId: WorkspaceId,
  priorWorkflowWorkspaceId: WorkspaceId,
): SettingsNavigationState {
  return {
    activeWorkspaceId: settingsWorkspaceId,
    priorWorkflowWorkspaceId: activeWorkspaceId === settingsWorkspaceId
      ? priorWorkflowWorkspaceId
      : activeWorkspaceId,
  };
}

export function returnFromSettingsNavigationState(
  priorWorkflowWorkspaceId: WorkspaceId,
): WorkspaceId {
  return priorWorkflowWorkspaceId;
}

export function App(): JSX.Element {
  const [themeMode, setThemeMode] = useState<FigmaThemeMode>(() => {
    if (typeof window === "undefined") {
      return "dark";
    }
    try {
      const storedTheme = window.localStorage.getItem(figmaThemePreferenceKey);
      return storedTheme === "light" ? "light" : "dark";
    } catch {
      return "dark";
    }
  });
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<WorkspaceId>(
    workspaceDefinitions[0].id,
  );
  const [priorWorkflowWorkspaceId, setPriorWorkflowWorkspaceId] = useState<WorkspaceId>(
    workspaceDefinitions[0].id,
  );
  const [shellView, setShellView] = useState<ShellView>("landing");
  const [workIntakeProjection, setWorkIntakeProjection] = useState<WorkIntakeProjection | null>(null);
  const [activeWorkflowId, setActiveWorkflowId] = useState<WorkflowId | null>(null);
  const [settingsReturnShellView, setSettingsReturnShellView] =
    useState<SettingsReturnShellView>("workflow-hub");
  const [settingsReturnWorkflowId, setSettingsReturnWorkflowId] =
    useState<WorkflowId | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceSelection>(fallbackWorkspace);
  const [agentHarnessStatus, setAgentHarnessStatus] =
    useState<AgentHarnessStatus | null>(null);
  const [agentHarnessServiceHostLifecycleStatus, setAgentHarnessServiceHostLifecycleStatus] =
    useState<AgentHarnessServiceHostLifecycleStatus | null>(null);
  const [agentHarnessWorkspaceRegistry, setAgentHarnessWorkspaceRegistry] =
    useState<AgentHarnessWorkspaceRegistrySnapshot | null>(null);
  const [agentHarnessActionPending, setAgentHarnessActionPending] = useState<
    "start" | "stop" | "restart" | "startBackgroundAgent" | "exitBackgroundAgent" | "restartServiceHost" | "importLegacyOAuthClients" | "registerWorkspace" | "unregisterWorkspace" | null
  >(null);
  const [agentHarnessSettingsPending, setAgentHarnessSettingsPending] = useState(false);
  const [agentHarnessServiceHostSettingsPending, setAgentHarnessServiceHostSettingsPending] = useState(false);
  const [agentHarnessActionFeedback, setAgentHarnessActionFeedback] = useState("");
  const [agentHarnessActionError, setAgentHarnessActionError] = useState("");
  const [documents, setDocuments] = useState<PlanningDocumentSummary[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<PlanningDocumentDetail | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<DocumentDispositionStatus | "">("");
  const [feedback, setFeedback] = useState<string>("");
  const [documentError, setDocumentError] = useState<string>("");
  const [resolverResult, setResolverResult] = useState<FirstNonApprovedResult | null>(null);
  const [projectIntakeConfirmation, setProjectIntakeConfirmation] =
    useState<ProjectIntakePostSubmitConfirmation | null>(null);
  const [isChoosing, setIsChoosing] = useState(false);
  const [isChoosingProjectRepository, setIsChoosingProjectRepository] = useState(false);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isRepairPromptPreparing, setIsRepairPromptPreparing] = useState(false);
  const [isSubmittingIntake, setIsSubmittingIntake] = useState(false);
  const [projectIntake, setProjectIntake] =
    useState<ProjectIntakeSubmission>(emptyProjectIntake);
  const [architectStatus, setArchitectStatus] =
    useState<ArchitectBrowserFoundationStatus | null>(null);
  const [architectOutputModel, setArchitectOutputModel] =
    useState<ArchitectOutputWorkspaceModel | null>(null);
  const [projectPlanningModel, setProjectPlanningModel] =
    useState<ProjectPlanningWorkspaceModel | null>(null);
  const [selectedArchitectOutputSlotId, setSelectedArchitectOutputSlotId] =
    useState<string | null>(null);
  const [architectOutputReviewStatus, setArchitectOutputReviewStatus] =
    useState<DocumentDispositionStatus | "">("");
  const [architectOutputReviewNotes, setArchitectOutputReviewNotes] = useState("");
  const [projectIntakeReviewNotes, setProjectIntakeReviewNotes] = useState("");
  const [operatorValidationNotes, setOperatorValidationNotes] = useState("");
  const [advisorySummary, setAdvisorySummary] = useState("");
  const [repairDefectText, setRepairDefectText] = useState("");
  const [isArchitectPaneVisible, setIsArchitectPaneVisible] = useState(true);
  const [codexExecutionPresentation, dispatchCodexExecutionPresentation] = useReducer(
    codexExecutionPresentationReducer,
    initialCodexExecutionPresentationState,
  );
  const codexExecution = codexExecutionPresentation.development;
  const [isCodexExecutionActionRunning, setIsCodexExecutionActionRunning] = useState(false);
  const [viewedArchitectOutputRevisionKeys, setViewedArchitectOutputRevisionKeys] =
    useState<string[]>([]);
  const [architectActionFeedback, setArchitectActionFeedback] =
    useState<ArchitectActionFeedback>(null);
  const [architectOutputPollingError, setArchitectOutputPollingError] = useState("");
  const [workCardCloseProjectionResult, setWorkCardCloseProjectionResult] =
    useState<RuntimeActionResult | null>(null);
  const [workCardRepairProjectionResult, setWorkCardRepairProjectionResult] =
    useState<RuntimeActionResult | null>(null);
  const [workCardMapResult, setWorkCardMapResult] =
    useState<RuntimeActionResult | null>(null);
  const [phaseValidationAction, setPhaseValidationAction] =
    useState<PhaseValidationActionProjection | null>(null);
  const [issueInventory, setIssueInventory] =
    useState<IssueInventoryProjection | null>(null);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [activeIssueStageId, setActiveIssueStageId] =
    useState<IssueResolutionStageId>("intake");
  const [issueArchitectProjection, setIssueArchitectProjection] =
    useState<IssueArchitectPlanningProjection | null>(null);
  const [issuePlanningProjection, setIssuePlanningProjection] =
    useState<IssuePlanningProjection | null>(null);
  const [issueNavigationProjection, setIssueNavigationProjection] =
    useState<IssueResolutionNavigationProjection | null>(null);
  const [issueValidationProjection, setIssueValidationProjection] =
    useState<IssueValidationProjection | null>(null);
  const [issueCloseProjection, setIssueCloseProjection] =
    useState<IssueCloseProjection | null>(null);
  const [activeIssueFixCardStepId, setActiveIssueFixCardStepId] =
    useState<IssueFixCardLoopStepId>("fix-card-map");
  const [issueFixCardProjection, setIssueFixCardProjection] =
    useState<IssueFixCardProjection | null>(null);
  const [issueInventoryError, setIssueInventoryError] = useState("");
  const [isIssueInventoryLoading, setIsIssueInventoryLoading] = useState(false);
  const [isIssueCreating, setIsIssueCreating] = useState(false);
  const [isIssueArchitectActionPending, setIsIssueArchitectActionPending] = useState(false);
  const [issueArchitectActionFeedback, setIssueArchitectActionFeedback] = useState("");
  const [issueArchitectActionError, setIssueArchitectActionError] = useState("");
  const [isIssuePlanningActionPending, setIsIssuePlanningActionPending] = useState(false);
  const [issuePlanningActionFeedback, setIssuePlanningActionFeedback] = useState("");
  const [issuePlanningActionError, setIssuePlanningActionError] = useState("");
  const [isIssueCloseLoading, setIsIssueCloseLoading] = useState(false);
  const [isIssueCloseActionPending, setIsIssueCloseActionPending] = useState(false);
  const [issueCloseActionFeedback, setIssueCloseActionFeedback] = useState("");
  const [issueCloseActionError, setIssueCloseActionError] = useState("");
  const [closeReturnSelectionProjection, setCloseReturnSelectionProjection] =
    useState<CloseReturnSelectionProjection | null>(null);
  const architectOutputFingerprintRef = useRef<string | null>(null);
  const architectOutputPollInFlightRef = useRef<number | null>(null);
  const architectOutputPollRequestRef = useRef(0);
  const architectOutputRefreshCompletionRef = useRef<Promise<void> | null>(null);
  const workCardRepairRefreshInFlightRef = useRef<number | null>(null);
  const workCardRepairRefreshRequestRef = useRef(0);
  const workCardRepairRefreshCompletionRef = useRef<Promise<void> | null>(null);
  const issueArchitectProjectionRefreshInFlightRef = useRef<number | null>(null);
  const issueArchitectProjectionRefreshRequestRef = useRef(0);
  const issueArchitectProjectionRefreshCompletionRef = useRef<Promise<void> | null>(null);
  const issuePlanningProjectionRefreshInFlightRef = useRef<number | null>(null);
  const issuePlanningProjectionRefreshRequestRef = useRef(0);
  const issuePlanningProjectionRefreshCompletionRef = useRef<Promise<void> | null>(null);
  const issueFixCardProjectionRefreshInFlightRef = useRef<number | null>(null);
  const issueFixCardProjectionRefreshRequestRef = useRef(0);
  const issueFixCardProjectionRefreshCompletionRef = useRef<Promise<void> | null>(null);
  const developmentCodexExecutionPreviousStateRef = useRef<CodexImplementerExecutionModel["state"] | null>(null);
  const issueCodexExecutionPreviousStateRef = useRef<CodexImplementerExecutionModel["state"] | null>(null);
  const issueCodexExecutionContextRef = useRef<string | null>(null);
  const architectBoundsSequenceRef = useRef(0);
  const architectAttachmentGenerationRef = useRef(0);
  const architectBoundsRafRef = useRef<number | null>(null);
  const architectFeedbackTimeoutRef = useRef<number | null>(null);
  const architectAttachmentCoordinatorRef =
    useRef<ReturnType<typeof createArchitectAttachmentCoordinator> | null>(null);
  const evidenceRefreshTargetRef = useRef<EvidenceDrivenRefreshTarget | null>(null);
  const evidenceRefreshCoordinatorRef = useRef<EvidenceDrivenRefreshCoordinator | null>(null);
  const [architectAttachmentError, setArchitectAttachmentError] = useState("");
  const [currentModel, setCurrentModel] = useState<CurrentWorkspaceModel | null>(null);
  const [isWorkCardIntakeGenerating, setIsWorkCardIntakeGenerating] = useState(false);
  const [workCardIntakeError, setWorkCardIntakeError] = useState("");
  const [workCardIntakeFeedback, setWorkCardIntakeFeedback] = useState("");
  const [actionInputs, setActionInputs] = useState({
    defect: "",
    closureDecision: "Close" as ClosureDecision,
    rationale: "",
    status: "Approved" as DocumentDispositionStatus,
  });
  const architectHostRef = useRef<HTMLDivElement | null>(null);
  const workspaceSurfaceRef = useRef<HTMLElement | null>(null);
  const documentReviewSurfaceRef = useRef<HTMLElement | null>(null);
  const isWorkCardPlanningPreparation =
    activeWorkspaceId === "work-card-planning" && Boolean(currentModel?.workCardIntake);
  const isWorkCardBuildingReview =
    activeWorkspaceId === "work-card-building-review";
  const isWorkCardReportReview =
    activeWorkspaceId === "work-card-report-review";
  const isWorkCardRepair =
    activeWorkspaceId === "work-card-repair";
  const isWorkCardClose =
    activeWorkspaceId === "work-card-close";
  const isWorkCardMap =
    activeWorkspaceId === "phase-work-card-selection";
  const isPhaseMapFigmaWorkspace =
    activeWorkspaceId === "project-phase-map";
  const isVisibleArchitectOutputWorkspace =
    isArchitectEnabledWorkspace(activeWorkspaceId) && !isWorkCardPlanningPreparation && !isWorkCardRepair;
  const shouldRefreshArchitectOutputWorkspace =
    isVisibleArchitectOutputWorkspace || isWorkCardRepair;
  const architectBrowserWorkspaceAvailable =
    isVisibleArchitectOutputWorkspace || isWorkCardReportReview;
  const isDevelopmentForeground =
    shellView === "workflow" && activeWorkflowId === "development";
  const isIssueResolutionForeground =
    shellView === "workflow" && activeWorkflowId === "issue-resolution";
  const isIssueCodexExecutionForeground =
    isIssueResolutionForeground &&
    activeIssueStageId === "fix-cards" &&
    activeIssueFixCardStepId === "implement";
  const isLandingForeground = shellView === "landing";
  const isWorkflowHubForeground = shellView === "workflow-hub";
  const isWorkIntakeForeground = shellView === "work-intake";
  const shouldAttachEmbeddedArchitectSurface =
    ((isDevelopmentForeground &&
      (architectBrowserWorkspaceAvailable || isWorkCardRepair)) ||
      (isIssueResolutionForeground &&
        (
          activeIssueStageId === "architect-planning" ||
          activeIssueStageId === "issue-planning" ||
          (activeIssueStageId === "fix-cards" &&
            (activeIssueFixCardStepId === "planning" || activeIssueFixCardStepId === "review-validation" || activeIssueFixCardStepId === "repair"))
        ))) &&
    isArchitectPaneVisible;
  const isSettingsWorkspace = shellView === "settings";
  const currentIssue = useMemo(
    () => issueInventory?.issues.find((issue) => issue.issueId === selectedIssueId) ?? null,
    [issueInventory, selectedIssueId],
  );
  evidenceRefreshTargetRef.current = currentEvidenceRefreshTarget();
  const selectedIssueFixCardId = issueFixCardProjection?.selectedCandidate?.fixCardId ?? null;
  const selectedIssueImplementationId = issueFixCardProjection?.currentImplementationId ?? selectedIssueFixCardId;
  const selectedIssueCodexExecutionContextKey = currentIssue && selectedIssueImplementationId
    ? issueCodexExecutionContextKey(currentIssue.issueId, selectedIssueImplementationId)
    : null;
  const issueCodexExecution = selectedIssueCodexExecutionContextKey &&
      codexExecutionPresentation.issue?.contextKey === selectedIssueCodexExecutionContextKey
    ? codexExecutionPresentation.issue.status
    : null;
  const issueWorkflowStatus =
    activeIssueStageId === "issue-close"
      ? issueCloseProjection?.workflowStatus ?? null
      : activeIssueStageId === "issue-validation"
      ? issueValidationProjection?.workflowStatus ?? null
      : activeIssueStageId === "fix-cards"
      ? {
          ...(issueNavigationProjection?.fixCardsWorkflowStatus ?? {
            issueId: currentIssue?.issueId ?? "",
            stageId: "fix-cards" as const,
            stageLabel: "Fix Cards" as const,
            state: "fix-card-map-ready" as const,
            stateLabel: "Fix Card Map Ready",
            issuePlanningEligible: true,
            fixCardsEligible: true,
            reason: "Fix Cards foregrounded.",
          }),
          stateLabel: issueFixCardProjection?.selectedCandidate
            ? `${issueFixCardProjection.selectedCandidate.fixCardId} - ${issueFixCardProjection.stepAvailability.find((step) => step.stepId === activeIssueFixCardStepId)?.stateLabel ?? "Current"}`
            : issueNavigationProjection?.fixCardsWorkflowStatus?.stateLabel ?? "Fix Card Map Ready",
        }
      : activeIssueStageId === "issue-planning"
      ? issuePlanningProjection?.workflowStatus ?? null
      : issueArchitectProjection?.workflowStatus ?? issueNavigationProjection?.workflowStatus ?? issuePlanningProjection?.workflowStatus ?? null;
  const issuePlanningAvailable = Boolean(issueNavigationProjection?.issuePlanningAvailable);
  const fixCardsAvailable = Boolean(issueNavigationProjection?.fixCardsAvailable);
  const activeIssueFixCardStepLabel =
    issueFixCardLoop.find((step) => step.id === activeIssueFixCardStepId)?.label ?? "Fix Card Map";

  useEffect(() => {
    const isDark = themeMode === "dark";
    document.documentElement.classList.toggle("dark", isDark);
    try {
      window.localStorage.setItem(figmaThemePreferenceKey, themeMode);
    } catch {
      // Renderer-local preference only; storage failures should not block the app.
    }
  }, [themeMode]);

  useEffect(() => {
    void window.champcity.getSelectedWorkspace().then((selection) => {
      setWorkspace(selection);
      if (selection.ok) {
        setProjectIntake((current) => ({
          ...current,
          projectRepository: selection.workspaceRoot,
        }));
      }
    });
  }, []);

  useEffect(() => {
    let disposed = false;
    void window.champcity.getAgentHarnessServiceHostLifecycleStatus().then((status) => {
      if (!disposed) setAgentHarnessServiceHostLifecycleStatus(status);
    }).catch(() => { /* Retain the last current lifecycle projection. */ });
    return () => { disposed = true; };
  }, [shellView, activeWorkspaceId, activeIssueStageId, activeIssueFixCardStepId]);

  useEffect(() => {
    if (!isSettingsWorkspace) {
      return;
    }
    let isDisposed = false;
    const refresh = async (): Promise<void> => {
      try {
        const lifecycleStatus = await window.champcity.getAgentHarnessServiceHostLifecycleStatus();
        if (!isDisposed) {
          setAgentHarnessServiceHostLifecycleStatus(lifecycleStatus);
        }
        if (lifecycleStatus.explicitlyStopped) {
          if (!isDisposed) {
            setAgentHarnessStatus(null);
          }
          return;
        }
        const [status, workspaceRegistry] = await Promise.all([
          window.champcity.getAgentHarnessStatus(),
          window.champcity.listAgentHarnessRegisteredWorkspaces(),
        ]);
        if (!isDisposed) {
          setAgentHarnessStatus(status);
          setAgentHarnessWorkspaceRegistry(workspaceRegistry);
        }
      } catch {
        if (!isDisposed) {
          setAgentHarnessStatus(null);
          // A failed refresh must not erase a known stale-host warning.
          setAgentHarnessWorkspaceRegistry(null);
        }
      }
    };
    const stopPolling = startAgentHarnessSettingsPolling({
      refresh,
      setInterval: (callback, milliseconds) => window.setInterval(callback, milliseconds),
      clearInterval: (handle) => window.clearInterval(handle),
    });
    return () => {
      isDisposed = true;
      stopPolling();
    };
  }, [isSettingsWorkspace]);

  useEffect(() => {
    return () => {
      if (architectFeedbackTimeoutRef.current !== null) {
        window.clearTimeout(architectFeedbackTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const coordinator = createEvidenceDrivenRefreshCoordinator({
      getForegroundTarget: () => evidenceRefreshTargetRef.current,
    });
    evidenceRefreshCoordinatorRef.current = coordinator;
    const unsubscribeEvidence = window.champcity.onWorkspaceEvidenceChanged((notification) => {
      coordinator.notify(notification);
    });
    const unsubscribeBrowserStatus = window.champcity.onArchitectBrowserFoundationStatus((status) => {
      applyArchitectStatus(status);
    });
    const refreshOnFocus = (): void => coordinator.refreshBoundary();
    const refreshOnVisibility = (): void => {
      if (document.visibilityState === "visible") {
        coordinator.refreshBoundary();
      }
    };
    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnVisibility);
    return () => {
      unsubscribeEvidence();
      unsubscribeBrowserStatus();
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnVisibility);
      coordinator.dispose();
      if (evidenceRefreshCoordinatorRef.current === coordinator) {
        evidenceRefreshCoordinatorRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    evidenceRefreshCoordinatorRef.current?.setWorkspaceGeneration(
      workspace.ok ? workspace.evidenceGeneration ?? null : null,
    );
  }, [workspace.ok, workspace.workspaceRoot, workspace.ok ? workspace.evidenceGeneration : null]);

  useEffect(() => {
    if (!selectedDocumentId) {
      setSelectedDocument(null);
      setSelectedStatus("");
      return;
    }

    if (selectedDocument?.logicalDocumentId === selectedDocumentId) {
      return;
    }

    void loadDocument(selectedDocumentId);
  }, [selectedDocumentId, selectedDocument?.logicalDocumentId]);

  useEffect(() => {
    if (!isDevelopmentForeground) {
      return;
    }
    if (activeWorkspaceId === "work-card-intake") {
      transitionToWorkflowStep("work-card-planning");
      return;
    }
    if (activeWorkspaceId === "work-card-report-review") {
      const projection = currentModel?.workCardBuildingReview;
      const reportId = projection?.report?.logicalDocumentId;
      const formalId = documents.find((document) => document.markdownPath === projection?.formalWorkCardPath)?.logicalDocumentId;
      if (reportId && selectedDocumentId !== reportId && selectedDocumentId !== formalId) {
        setSelectedDocumentId(reportId);
      }
      return;
    }
    if (activeWorkspaceId === "work-card-planning" && currentModel?.workCardIntake) {
      setFeedback("");
      setDocumentError("");
      setSelectedDocumentId(null);
      setSelectedDocument(null);
      setSelectedStatus("");
      return;
    }
    setWorkCardIntakeError("");
    setWorkCardIntakeFeedback("");
    if (activeWorkspaceId !== "work-card-repair") {
      setWorkCardRepairProjectionResult(null);
    }
  }, [activeWorkspaceId, currentModel?.workCardBuildingReview, currentModel?.workCardIntake, documents, isDevelopmentForeground, selectedDocumentId]);

  useEffect(() => {
    if (
      activeWorkspaceId === "phase-validation" &&
      phaseValidationAction &&
      currentModel?.currentPhaseId &&
      currentModel?.currentPhaseId !== phaseValidationAction.phaseId
    ) {
      setPhaseValidationAction(null);
    }
  }, [activeWorkspaceId, currentModel?.currentPhaseId, phaseValidationAction]);

  useEffect(() => {
    if (!isIssueResolutionForeground || issueInventory || isIssueInventoryLoading) {
      return;
    }
    void refreshIssueInventory();
  }, [isIssueResolutionForeground, issueInventory, isIssueInventoryLoading]);

  useEffect(() => {
    if (
      activeIssueStageId !== "intake" &&
      (!currentIssue || currentIssue.recordState !== "readable")
    ) {
      setActiveIssueStageId("intake");
    }
  }, [activeIssueStageId, currentIssue]);

  useEffect(() => {
    setActiveIssueFixCardStepId("fix-card-map");
    setIssueFixCardProjection(null);
    setIssueValidationProjection(null);
    setIssueCloseProjection(null);
    setIssueCloseActionError("");
    setIssueCloseActionFeedback("");
    setIssuePlanningActionError("");
    setIssuePlanningActionFeedback("");
    issueFixCardProjectionRefreshRequestRef.current += 1;
    issueFixCardProjectionRefreshInFlightRef.current = null;
  }, [currentIssue?.issueId]);

  useEffect(() => {
    if (
      !isIssueResolutionForeground ||
      activeIssueStageId !== "issue-validation" ||
      !currentIssue
    ) {
      setIssueValidationProjection(null);
      return;
    }
    void refreshIssueValidationProjection(currentIssue.issueId);
  }, [activeIssueStageId, currentIssue?.issueId, isIssueResolutionForeground]);

  useEffect(() => {
    if (
      !isIssueResolutionForeground ||
      activeIssueStageId !== "issue-close" ||
      !currentIssue
    ) {
      setIssueCloseProjection(null);
      return;
    }
    void refreshIssueCloseProjection(currentIssue.issueId);
  }, [activeIssueStageId, currentIssue?.issueId, isIssueResolutionForeground]);

  useEffect(() => {
    if (!isIssueResolutionForeground || !currentIssue) {
      setIssueNavigationProjection(null);
      return;
    }
    void refreshIssueResolutionNavigationProjection(currentIssue.issueId);
  }, [currentIssue?.issueId, isIssueResolutionForeground]);

  useEffect(() => {
    if (
      !isIssueResolutionForeground ||
      activeIssueStageId !== "architect-planning" ||
      !currentIssue
    ) {
      setIssueArchitectProjection(null);
      setIssueArchitectActionError("");
      setIssueArchitectActionFeedback("");
      issueArchitectProjectionRefreshRequestRef.current += 1;
      issueArchitectProjectionRefreshInFlightRef.current = null;
      return;
    }
    void refreshIssueArchitectPlanningProjection(currentIssue.issueId);
  }, [activeIssueStageId, currentIssue?.issueId, isIssueResolutionForeground]);

  useEffect(() => {
    if (
      !isIssueResolutionForeground ||
      !currentIssue
    ) {
      setIssuePlanningProjection(null);
      setIssuePlanningActionError("");
      setIssuePlanningActionFeedback("");
      issuePlanningProjectionRefreshRequestRef.current += 1;
      issuePlanningProjectionRefreshInFlightRef.current = null;
      return;
    }
    if (activeIssueStageId !== "issue-planning" && activeIssueStageId !== "fix-cards") {
      setIssuePlanningActionError("");
      setIssuePlanningActionFeedback("");
      issuePlanningProjectionRefreshRequestRef.current += 1;
      issuePlanningProjectionRefreshInFlightRef.current = null;
      return;
    }
    void refreshIssuePlanningProjection(currentIssue.issueId);
  }, [activeIssueStageId, currentIssue?.issueId, isIssueResolutionForeground]);

  useEffect(() => {
    if (
      !isIssueResolutionForeground ||
      activeIssueStageId !== "fix-cards" ||
      !currentIssue
    ) {
      setIssueFixCardProjection(null);
      issueFixCardProjectionRefreshRequestRef.current += 1;
      issueFixCardProjectionRefreshInFlightRef.current = null;
      return;
    }
    const requestedStep = issueFixCardProjection?.issueId === currentIssue.issueId
      ? activeIssueFixCardStepId
      : "fix-card-map";
    void refreshIssueFixCardProjection(currentIssue.issueId, requestedStep);
  }, [
    activeIssueFixCardStepId,
    activeIssueStageId,
    currentIssue?.issueId,
    isIssueResolutionForeground,
    issueFixCardProjection?.issueId,
  ]);

  useEffect(() => {
    if (!shouldPollDevelopmentCodexExecution({
      isDevelopmentForeground,
      workspaceAvailable: workspace.ok,
      activeWorkspaceId,
    })) {
      dispatchCodexExecutionPresentation({ type: "clear-development" });
      developmentCodexExecutionPreviousStateRef.current = null;
      return;
    }

    let isDisposed = false;
    const refreshStatus = async (): Promise<void> => {
      try {
        const status = await window.champcity.getCodexImplementerExecutionStatus();
        if (isDisposed) {
          return;
        }
        dispatchCodexExecutionPresentation({ type: "set-development", status });
        const previousState = developmentCodexExecutionPreviousStateRef.current;
        developmentCodexExecutionPreviousStateRef.current = status.state;
        if (
          previousState === "running" &&
          ["completed", "failed", "cancelled"].includes(status.state)
        ) {
          await refreshBuildReviewAfterCodex(status);
        }
      } catch (error) {
        if (!isDisposed) {
          setDocumentError(error instanceof Error ? error.message : "Codex execution status could not be loaded.");
        }
      }
    };

    void refreshStatus();
    const interval = window.setInterval(() => {
      void refreshStatus();
    }, codexExecution?.state === "running" ? 1500 : 4000);

    return () => {
      isDisposed = true;
      window.clearInterval(interval);
    };
  }, [activeWorkspaceId, isDevelopmentForeground, workspace.ok, codexExecution?.state]);

  useEffect(() => {
    if (!shouldPollIssueCodexExecution({
      isIssueCodexExecutionForeground,
      workspaceAvailable: workspace.ok,
      hasCurrentIssue: Boolean(currentIssue),
      hasSelectedFixCard: Boolean(selectedIssueFixCardId),
      hasExecutionContext: Boolean(selectedIssueCodexExecutionContextKey),
    }) || !currentIssue || !selectedIssueFixCardId || !selectedIssueCodexExecutionContextKey) {
      dispatchCodexExecutionPresentation({ type: "clear-issue" });
      issueCodexExecutionPreviousStateRef.current = null;
      issueCodexExecutionContextRef.current = null;
      return;
    }

    if (issueCodexExecutionContextRef.current !== selectedIssueCodexExecutionContextKey) {
      issueCodexExecutionContextRef.current = selectedIssueCodexExecutionContextKey;
      issueCodexExecutionPreviousStateRef.current = null;
    }
    dispatchCodexExecutionPresentation({
      type: "activate-issue-context",
      contextKey: selectedIssueCodexExecutionContextKey,
    });

    let isDisposed = false;
    const refreshStatus = async (): Promise<void> => {
      try {
        const status = await window.champcity.getIssueCodexImplementerExecutionStatus(
          currentIssue.issueId,
          selectedIssueFixCardId,
          selectedIssueImplementationId ?? undefined,
        );
        if (isDisposed) {
          return;
        }
        dispatchCodexExecutionPresentation({
          type: "set-issue",
          contextKey: selectedIssueCodexExecutionContextKey,
          status,
        });
        const previousState = issueCodexExecutionPreviousStateRef.current;
        issueCodexExecutionPreviousStateRef.current = status.state;
        if (
          previousState === "running" &&
          ["completed", "failed", "cancelled"].includes(status.state)
        ) {
          await refreshIssueFixCardProjection(currentIssue.issueId, activeIssueFixCardStepId, { quiet: true });
        }
      } catch (error) {
        if (!isDisposed) {
          setIssuePlanningActionError(error instanceof Error ? error.message : "Codex execution status could not be loaded.");
        }
      }
    };

    void refreshStatus();
    const interval = window.setInterval(() => {
      void refreshStatus();
    }, issueCodexExecution?.state === "running" ? 1500 : 4000);

    return () => {
      isDisposed = true;
      window.clearInterval(interval);
    };
  }, [
    currentIssue?.issueId,
    isIssueCodexExecutionForeground,
    issueCodexExecution?.state,
    selectedIssueCodexExecutionContextKey,
    selectedIssueFixCardId,
    selectedIssueImplementationId,
    workspace.ok,
  ]);

  useEffect(() => {
    if (!isDevelopmentForeground || !workspace.ok || activeWorkspaceId !== "work-card-close") {
      setWorkCardCloseProjectionResult(null);
      return;
    }
    void refreshWorkCardCloseProjection();
  }, [activeWorkspaceId, isDevelopmentForeground, workspace.ok]);

  useEffect(() => {
    if (!isDevelopmentForeground) {
      return;
    }
    if (activeWorkspaceId !== "phase-work-card-selection") {
      setWorkCardMapResult(null);
      if (activeWorkspaceId !== "work-card-close") {
        setCloseReturnSelectionProjection(null);
      }
    }
  }, [activeWorkspaceId, isDevelopmentForeground]);

  useEffect(() => {
    if (!isDevelopmentForeground || !workspace.ok || activeWorkspaceId !== "phase-work-card-selection") {
      return;
    }
    const phaseId = currentModel?.currentPhaseId;
    if (!phaseId) {
      setDocumentError("Work Card Map requires a current phase.");
      return;
    }
    void refreshWorkCardMapProjection(phaseId);
  }, [activeWorkspaceId, currentModel?.currentPhaseId, isDevelopmentForeground, workspace.ok]);

  useEffect(() => {
    if (!workspace.ok) {
      return;
    }

    const shouldAttachEmbeddedSurface = shouldAttachEmbeddedArchitectSurface;
    if (!shouldAttachEmbeddedSurface) {
      const coordinator = architectAttachmentCoordinatorRef.current;
      architectAttachmentCoordinatorRef.current = null;
      setArchitectAttachmentError("");
      if (coordinator) {
        void coordinator.detach().catch(() => undefined);
      } else {
        void window.champcity.hideArchitectBrowser(architectAttachmentGenerationRef.current)
          .then(applyArchitectStatus)
          .catch(() => undefined);
      }
      return;
    }

    let isDisposed = false;
    const measureHost = (): ArchitectHostMeasurement | null => {
      const host = architectHostRef.current;
      if (!host) {
        return null;
      }
      const rect = host.getBoundingClientRect();
      return {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      };
    };
    const waitForNextFrame = (): Promise<void> =>
      new Promise((resolve) => {
        window.requestAnimationFrame(() => resolve());
      });
    const syncBounds = (): void => {
      if (architectBoundsRafRef.current !== null) {
        window.cancelAnimationFrame(architectBoundsRafRef.current);
      }
      architectBoundsRafRef.current = window.requestAnimationFrame(() => {
        architectBoundsRafRef.current = null;
        if (isDisposed) {
          return;
        }
        const measurement = measureHost();
        if (!measurement) {
          return;
        }
        architectBoundsSequenceRef.current += 1;
        const sequence = architectBoundsSequenceRef.current;
        void window.champcity.setArchitectBrowserBounds({
          x: measurement.x,
          y: measurement.y,
          width: measurement.width,
          height: measurement.height,
          sequence,
          attachmentGeneration: coordinator.getGeneration(),
        }).then((ack) => {
          const application = reconcileArchitectBrowserBoundsAck(ack, {
            attachmentGeneration: coordinator.getGeneration(),
            latestRequestedSequence: architectBoundsSequenceRef.current,
          });
          if (application.applied && !isDisposed) {
            setArchitectAttachmentError(application.error);
          }
        }).catch(() => undefined);
      });
    };
    const coordinator = createArchitectAttachmentCoordinator({
      measureHost,
      nextSequence: () => {
        architectBoundsSequenceRef.current += 1;
        return architectBoundsSequenceRef.current;
      },
      onError: (message) => {
        if (!isDisposed) {
          setArchitectAttachmentError(message);
        }
      },
      onStatus: (status) => {
        if (!isDisposed) {
          applyArchitectStatus(status);
        }
      },
      setBounds: window.champcity.setArchitectBrowserBounds,
      showBrowser: (attachmentGeneration) => {
        architectAttachmentGenerationRef.current = attachmentGeneration;
        return window.champcity.showArchitectBrowser(attachmentGeneration);
      },
      hideBrowser: window.champcity.hideArchitectBrowser,
      waitForNextFrame,
    });
    architectAttachmentCoordinatorRef.current = coordinator;
    const observer = new ResizeObserver(syncBounds);
    if (architectHostRef.current) {
      observer.observe(architectHostRef.current);
    }
    void coordinator.attach();
    window.addEventListener("resize", syncBounds);
    return () => {
      isDisposed = true;
      const cleanupGeneration = coordinator.getGeneration();
      if (architectAttachmentCoordinatorRef.current === coordinator) {
        architectAttachmentCoordinatorRef.current = null;
      }
      observer.disconnect();
      window.removeEventListener("resize", syncBounds);
      if (architectBoundsRafRef.current !== null) {
        window.cancelAnimationFrame(architectBoundsRafRef.current);
        architectBoundsRafRef.current = null;
      }
      void coordinator.detach().catch(() => {
        void window.champcity.hideArchitectBrowser(cleanupGeneration).catch(() => undefined);
      });
    };
  }, [activeWorkspaceId, shouldAttachEmbeddedArchitectSurface, workspace.ok]);

  useEffect(() => {
    if (!workspace.ok || !shouldRefreshArchitectOutputWorkspace) {
      return;
    }

    void refreshArchitectOutputWorkspace({ autoSelectOutput: true, force: true });
    if (isWorkCardRepair) {
      void refreshWorkCardRepairProjection();
    }
    return () => {
      architectOutputPollRequestRef.current += 1;
      architectOutputPollInFlightRef.current = null;
      workCardRepairRefreshRequestRef.current += 1;
      workCardRepairRefreshInFlightRef.current = null;
    };
  }, [activeWorkspaceId, isWorkCardRepair, shouldRefreshArchitectOutputWorkspace, workspace.ok, workspace.workspaceRoot]);

  const workspaceGroups = useMemo(
    () => getWorkspaceGroups(documents, activeWorkspaceId),
    [activeWorkspaceId, documents],
  );
  const workspaceCounts = useMemo(() => getWorkspaceDocumentCounts(documents), [documents]);
  const projectIntakeRailStatus = useMemo(
    () => deriveProjectIntakeRailStatus(documents),
    [documents],
  );
  const documentDerivedArchitectInterviewRailStatus = useMemo(
    () => deriveArchitectInterviewRailStatusFromDocuments(documents),
    [documents],
  );
  const architectInterviewRailStatus = architectOutputModel?.workspaceId === "architect-interview"
    ? architectInterviewRailStatusFromGenericModel(architectOutputModel)
    : documentDerivedArchitectInterviewRailStatus;
  const projectRailStatuses = useMemo(() => {
    const statuses = deriveProjectLifecycleRailStatuses(documents, {
      projectIntakeStatus: projectIntakeRailStatus,
      architectInterviewStatus: architectInterviewRailStatus,
      projectPlanningStatus: projectPlanningModel?.railStatus ?? "Not Ready",
    });
    if (architectOutputModel) {
      switch (architectOutputModel.workspaceId) {
        case "architect-interview":
        case "project-phase-map":
        case "phase-interview":
          statuses[architectOutputModel.workspaceId] = architectOutputModel.railStatus;
          break;
        default:
          break;
      }
    }
    return statuses;
  }, [
    architectInterviewRailStatus,
    architectOutputModel,
    documents,
    projectIntakeRailStatus,
    projectPlanningModel?.railStatus,
  ]);
  const currentResolvedWorkspace =
    resolverResult?.status === "current" &&
    resolverResult.document.owningWorkspaceId === activeWorkspaceId
      ? {
          id: resolverResult.document.owningWorkspaceId,
          label: `${resolverResult.document.owningWorkspace} (not yet implemented)`,
        }
      : null;
  const activeWorkspace =
    workspaceDefinitions.find((definition) => definition.id === activeWorkspaceId) ??
    currentResolvedWorkspace ??
    workspaceDefinitions[0];
  const selectedSummary = useMemo(
    () =>
      documents.find((document) => document.logicalDocumentId === selectedDocumentId) ??
      null,
    [documents, selectedDocumentId],
  );
  const repairWorkCardSlot = architectOutputModel?.workspaceId === "work-card-repair"
    ? architectOutputModel.documentSlots.find((slot) => slot.slotId === "repair-work-card")
    : undefined;
  const selectedRepairWorkCardDocument =
    selectedDocument && repairWorkCardSlot?.logicalDocumentId === selectedDocument.logicalDocumentId
      ? selectedDocument
      : null;
  const selectRepairWorkCardReviewDocument = useCallback(() => {
    if (!repairWorkCardSlot?.logicalDocumentId) {
      return;
    }
    setSelectedArchitectOutputSlotId(repairWorkCardSlot.slotId);
    const revisionKey = revisionKeyForArchitectOutputSlot(repairWorkCardSlot);
    if (revisionKey) {
      setViewedArchitectOutputRevisionKeys((current) =>
        current.includes(revisionKey) ? current : [...current, revisionKey],
      );
    }
    setSelectedDocumentId((current) =>
      current === repairWorkCardSlot.logicalDocumentId ? current : repairWorkCardSlot.logicalDocumentId ?? current,
    );
  }, [repairWorkCardSlot]);
  const selectedDocumentHasLocalError =
    Boolean(selectedSummary?.readError);
  async function chooseWorkspace(): Promise<void> {
    setIsChoosing(true);
    setDocumentError("");
    try {
      await activateWorkspaceSelection(
        await window.champcity.chooseWorkspaceFolder(),
        "workflow-hub",
      );
    } catch (error) {
      setDocumentError(error instanceof Error ? error.message : "Project could not be selected.");
    } finally {
      setIsChoosing(false);
    }
  }

  async function clearWorkspace(): Promise<void> {
    setWorkspace(await window.champcity.clearSelectedWorkspace());
    clearRepositoryDerivedState();
    setProjectIntake((current) => ({ ...current, projectRepository: "" }));
    setShellView("workflow-hub");
    setActiveWorkflowId(null);
    setActiveWorkspaceId(workspaceDefinitions[0].id);
  }

  async function chooseProjectRepository(): Promise<void> {
    setIsChoosingProjectRepository(true);
    setDocumentError("");
    try {
      await activateWorkspaceSelection(
        await window.champcity.chooseWorkspaceFolder(),
        "workflow-hub",
      );
    } catch (error) {
      setDocumentError(error instanceof Error ? error.message : "Project repository could not be selected.");
    } finally {
      setIsChoosingProjectRepository(false);
    }
  }

  async function submitProjectIntake(): Promise<void> {
    setIsSubmittingIntake(true);
    setDocumentError("");
    setFeedback("");
    try {
      const result = await window.champcity.submitProjectIntake(projectIntake);
      setProjectIntake((current) => ({ ...current, projectRepository: result.projectRoot }));
      const nextDocuments = await window.champcity.listDocuments();
      applyDocumentInventory(nextDocuments);
      await refreshProjectPlanningWorkspaceModel();
      const nextResolverResult = await window.champcity.resolveCurrentDocument();
      const nextPostSubmitState = applySuccessfulProjectIntakeSubmission(
        {
          confirmation: projectIntakeConfirmation,
          viewedWorkspaceId: activeWorkspaceId,
          selectedDocumentId,
          resolverResult,
        },
        result,
        nextDocuments,
        nextResolverResult,
      );
      setProjectIntakeConfirmation(nextPostSubmitState.confirmation);
      setResolverResult(nextPostSubmitState.resolverResult);
      transitionToWorkflowStep(nextPostSubmitState.viewedWorkspaceId, {
        documents: nextDocuments,
        preferredDocumentId: nextPostSubmitState.selectedDocumentId,
      });
      setFeedback(getResolverFeedback(nextResolverResult));
      await refreshCurrentModel();
      if (isArchitectEnabledWorkspace(activeWorkspaceId)) {
        await refreshArchitectOutputWorkspace({
          force: true,
          refreshRepositoryProjection: false,
        });
      }
      focusProjectIntakeReviewSurface();
    } catch (error) {
      setDocumentError(error instanceof Error ? error.message : "Project Intake could not be saved.");
    } finally {
      setIsSubmittingIntake(false);
    }
  }

  function currentEvidenceRefreshTarget(): EvidenceDrivenRefreshTarget | null {
    if (workspace.ok && isDevelopmentForeground && shouldRefreshArchitectOutputWorkspace) {
      const workspaceId = activeWorkspaceId;
      const refreshRepair = isWorkCardRepair;
      return {
        ownerKey: refreshRepair ? "planning:work-card-repair" : `planning:architect-output:${workspaceId}`,
        domain: "planning",
        waitForIdle: () => Promise.all([
          architectOutputRefreshCompletionRef.current,
          refreshRepair ? workCardRepairRefreshCompletionRef.current : null,
        ].filter((completion): completion is Promise<void> => completion !== null)).then(() => undefined),
        refresh: async () => {
          await refreshArchitectOutputWorkspace({
            autoSelectOutput: true,
            quiet: true,
            workspaceId,
          });
          if (refreshRepair) {
            await refreshWorkCardRepairProjection({ quiet: true });
          }
        },
      };
    }
    if (!workspace.ok || !isIssueResolutionForeground || currentIssue?.recordState !== "readable") {
      return null;
    }
    const issueId = currentIssue.issueId;
    if (activeIssueStageId === "architect-planning") {
      return {
        ownerKey: `issues:${issueId}:architect-planning`,
        domain: "issues",
        waitForIdle: () => issueArchitectProjectionRefreshCompletionRef.current ?? Promise.resolve(),
        refresh: () => refreshIssueArchitectPlanningProjection(issueId, { quiet: true }),
      };
    }
    if (activeIssueStageId === "issue-planning") {
      return {
        ownerKey: `issues:${issueId}:issue-planning`,
        domain: "issues",
        waitForIdle: () => issuePlanningProjectionRefreshCompletionRef.current ?? Promise.resolve(),
        refresh: () => refreshIssuePlanningProjection(issueId, { quiet: true }),
      };
    }
    if (
      activeIssueStageId === "fix-cards" &&
      (activeIssueFixCardStepId === "planning" || activeIssueFixCardStepId === "review-validation")
    ) {
      const stepId = activeIssueFixCardStepId;
      return {
        ownerKey: `issues:${issueId}:fix-card:${stepId}`,
        domain: "issues",
        waitForIdle: () => issueFixCardProjectionRefreshCompletionRef.current ?? Promise.resolve(),
        refresh: () => refreshIssueFixCardProjection(issueId, stepId, { quiet: true }),
      };
    }
    return null;
  }

  async function refreshArchitectStatus(): Promise<void> {
    setDocumentError("");
    try {
      applyArchitectStatus(await window.champcity.getArchitectBrowserFoundationStatus());
    } catch (error) {
      setArchitectStatus(null);
      setDocumentError(error instanceof Error ? error.message : "Architect browser status could not be loaded.");
    }
  }

  async function refreshArchitectOutputWorkspace(
    options: { autoSelectOutput?: boolean; autoSelectNewOutput?: boolean; force?: boolean; quiet?: boolean; refreshRepositoryProjection?: boolean; workspaceId?: WorkspaceId } = {},
  ): Promise<void> {
    if (!workspace.ok) {
      return;
    }
    if (options.quiet && architectOutputPollInFlightRef.current !== null) {
      return;
    }
    const requestId = architectOutputPollRequestRef.current + 1;
    architectOutputPollRequestRef.current = requestId;
    architectOutputPollInFlightRef.current = requestId;
    let resolveCompletion!: () => void;
    const completion = new Promise<void>((resolve) => {
      resolveCompletion = resolve;
    });
    architectOutputRefreshCompletionRef.current = completion;
    if (!options.quiet) {
      setDocumentError("");
    }
    try {
      const nextModel = options.workspaceId
        ? await window.champcity.getArchitectOutputWorkspaceModel(options.workspaceId)
        : await window.champcity.getArchitectOutputWorkspaceModel(activeWorkspaceId);
      if (requestId !== architectOutputPollRequestRef.current) {
        return;
      }
      const nextFingerprint = buildArchitectOutputEvidenceFingerprint(
        workspace.workspaceRoot,
        nextModel,
      );
      const fingerprintChanged = architectOutputFingerprintRef.current !== nextFingerprint;
      if (!options.force && !fingerprintChanged && options.quiet) {
        setArchitectOutputPollingError("");
        return;
      }
      architectOutputFingerprintRef.current = nextFingerprint;
      setArchitectOutputPollingError(nextModel.state === "promotion-failed" ? nextModel.promotionError ?? nextModel.reason : "");
      setArchitectOutputModel(nextModel);
      if (fingerprintChanged) {
        setViewedArchitectOutputRevisionKeys([]);
      }
      const selectedSlot = selectArchitectOutputSlot(
        nextModel,
        selectedArchitectOutputSlotId,
      );
      if (!selectedArchitectOutputSlotId && selectedSlot) {
        setSelectedArchitectOutputSlotId(selectedSlot.slotId);
      }
      const nextDocumentId =
        selectedSlot?.logicalDocumentId ?? architectInterviewRecoveryDocumentId(nextModel) ?? null;

      if (
        (options.autoSelectOutput ?? options.autoSelectNewOutput) &&
        nextDocumentId &&
        selectedDocumentId !== nextDocumentId
      ) {
        setSelectedDocumentId(nextDocumentId);
      }
      if (options.refreshRepositoryProjection ?? fingerprintChanged) {
        const nextDocuments = await window.champcity.listDocuments();
        if (requestId !== architectOutputPollRequestRef.current) {
          return;
        }
        applyDocumentInventory(nextDocuments);
        await refreshProjectPlanningWorkspaceModel();
        const nextResolverResult = await window.champcity.resolveCurrentDocument();
        if (requestId !== architectOutputPollRequestRef.current) {
          return;
        }
        setResolverResult(nextResolverResult);
        await refreshCurrentModel();
        if (nextDocumentId) {
          await loadDocument(nextDocumentId, {
            architectOutputModelForViewedRevision: nextModel,
            preserveOnFailure: true,
          });
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Architect output model could not be loaded.";
      setArchitectOutputPollingError(message);
      if (!options.quiet) {
        setDocumentError(message);
      }
    } finally {
      if (architectOutputPollInFlightRef.current === requestId) {
        architectOutputPollInFlightRef.current = null;
      }
      if (architectOutputRefreshCompletionRef.current === completion) {
        architectOutputRefreshCompletionRef.current = null;
      }
      resolveCompletion();
    }
  }

  async function copyArchitectHandoff(): Promise<void> {
    if (!(await preflightMcpHandoff())) return;
    setDocumentError("");
    setArchitectFeedback(null);
    try {
      await window.champcity.copyArchitectOutputHandoff(activeWorkspaceId);
      setArchitectFeedback({ kind: "success", message: architectOutputCopiedFeedback }, 4500);
      await refreshArchitectStatus();
      await refreshArchitectOutputWorkspace({ force: true });
    } catch (error) {
      setArchitectFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Architect handoff could not be copied.",
      });
    }
  }

  async function prepareArchitectOutputFromAction(): Promise<void> {
    if (!(await preflightMcpHandoff())) return;
    setDocumentError("");
    setArchitectFeedback(null);
    try {
      const nextModel = await window.champcity.prepareArchitectOutputHandoff(activeWorkspaceId);
      setArchitectOutputModel(nextModel);
      setArchitectFeedback({
        kind: "success",
        message: architectOutputRevisionReadyFeedback(nextModel) ?? architectOutputPreparedFeedback,
      }, 3500);
      await refreshDocuments({ useResolver: true });
      await refreshArchitectOutputWorkspace({ force: true, autoSelectOutput: true });
    } catch (error) {
      setArchitectFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Architect handoff could not be prepared.",
      });
    }
  }

  async function prepareArchitectInterviewFinalDraftFromAction(): Promise<void> {
    if (!(await preflightMcpHandoff())) return;
    setDocumentError("");
    setArchitectFeedback(null);
    try {
      const nextModel = await window.champcity.prepareArchitectInterviewFinalDraftHandoff();
      setArchitectOutputModel(nextModel);
      setArchitectFeedback({ kind: "success", message: architectInterviewFinalDraftPreparedFeedback }, 3500);
      await refreshDocuments({ useResolver: true });
      await refreshArchitectOutputWorkspace({ force: true, autoSelectOutput: true });
    } catch (error) {
      setArchitectFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Final Draft handoff could not be prepared.",
      });
    }
  }

  async function preparePhaseInterviewFinalDraftFromAction(): Promise<void> {
    if (!(await preflightMcpHandoff())) return;
    setDocumentError("");
    setArchitectFeedback(null);
    try {
      const nextModel = await window.champcity.preparePhaseInterviewFinalDraftHandoff();
      setArchitectOutputModel(nextModel);
      setArchitectFeedback({ kind: "success", message: architectInterviewFinalDraftPreparedFeedback }, 3500);
      await refreshDocuments({ useResolver: true });
      await refreshArchitectOutputWorkspace({ force: true, autoSelectOutput: true });
    } catch (error) {
      setArchitectFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Final Draft handoff could not be prepared.",
      });
    }
  }

  async function copyArchitectInterviewFinalDraftHandoff(): Promise<void> {
    if (!(await preflightMcpHandoff())) return;
    setDocumentError("");
    setArchitectFeedback(null);
    try {
      await window.champcity.copyArchitectInterviewFinalDraftHandoff();
      setArchitectFeedback({ kind: "success", message: architectInterviewFinalDraftCopiedFeedback }, 4500);
      await refreshArchitectStatus();
      await refreshArchitectOutputWorkspace({ force: true });
    } catch (error) {
      setArchitectFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Final Draft handoff could not be copied.",
      });
    }
  }

  async function copyPhaseInterviewFinalDraftHandoff(): Promise<void> {
    if (!(await preflightMcpHandoff())) return;
    setDocumentError("");
    setArchitectFeedback(null);
    try {
      await window.champcity.copyPhaseInterviewFinalDraftHandoff();
      setArchitectFeedback({ kind: "success", message: architectInterviewFinalDraftCopiedFeedback }, 4500);
      await refreshArchitectStatus();
      await refreshArchitectOutputWorkspace({ force: true });
    } catch (error) {
      setArchitectFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Final Draft handoff could not be copied.",
      });
    }
  }

  async function regenerateArchitectInterviewPromptFromAction(): Promise<void> {
    if (!(await preflightMcpHandoff())) return;
    setDocumentError("");
    setArchitectFeedback(null);
    try {
      const nextModel = await window.champcity.regenerateArchitectInterviewPrompt();
      setArchitectOutputModel(nextModel);
      setArchitectFeedback({ kind: "success", message: "Project Architect Interview prompt regenerated." }, 3500);
      await refreshDocuments({ useResolver: true });
      await refreshArchitectOutputWorkspace({ force: true, autoSelectOutput: true });
    } catch (error) {
      setArchitectFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Project Architect Interview prompt could not be regenerated.",
      });
    }
  }

  async function reloadArchitectBrowser(): Promise<void> {
    setDocumentError("");
    setArchitectFeedback({ kind: "info", message: "Reloading ChatGPT." }, 3000);
    try {
      applyArchitectStatus(await window.champcity.reloadArchitectBrowser());
      window.setTimeout(() => {
        void refreshArchitectStatus();
      }, 1200);
    } catch (error) {
      setArchitectFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Embedded ChatGPT could not be reloaded.",
      });
    }
  }

  function setArchitectFeedback(nextFeedback: ArchitectActionFeedback, clearAfterMs?: number): void {
    if (architectFeedbackTimeoutRef.current !== null) {
      window.clearTimeout(architectFeedbackTimeoutRef.current);
      architectFeedbackTimeoutRef.current = null;
    }
    setArchitectActionFeedback(nextFeedback);
    if (nextFeedback && nextFeedback.kind !== "error" && clearAfterMs) {
      architectFeedbackTimeoutRef.current = window.setTimeout(() => {
        setArchitectActionFeedback(null);
        architectFeedbackTimeoutRef.current = null;
      }, clearAfterMs);
    }
  }

  function applyArchitectStatus(status: ArchitectBrowserFoundationStatus): void {
    architectBoundsSequenceRef.current = Math.max(
      architectBoundsSequenceRef.current,
      status.boundsSequence ?? 0,
      status.attachment.bounds.sequence,
    );
    setArchitectStatus(status);
  }

  async function retryArchitectBrowser(): Promise<void> {
    const coordinator = architectAttachmentCoordinatorRef.current;
    if (!coordinator) {
      setArchitectAttachmentError("An Architect-enabled workflow step must be active before retrying the embedded browser.");
      return;
    }
    await coordinator.retry();
  }

  async function applyArchitectOutputReview(): Promise<void> {
    if (!architectOutputReviewStatus) {
      setDocumentError("Select a disposition before applying review.");
      return;
    }
    if (!architectOutputModel) {
      setDocumentError("Refresh the Architect output workspace before applying review.");
      return;
    }
    setIsApplying(true);
    setDocumentError("");
    setFeedback("");
    try {
      const nextModel = await window.champcity.reviewArchitectOutput(
        activeWorkspaceId,
        architectOutputReviewStatus,
        architectOutputReviewNotes,
        presentedRevisionsForArchitectOutputModel(architectOutputModel),
        selectedDocumentId,
      );
      architectOutputPollRequestRef.current += 1;
      setArchitectOutputModel(nextModel.architectOutput);
      if (workspace.ok) {
        architectOutputFingerprintRef.current = buildArchitectOutputEvidenceFingerprint(
          workspace.workspaceRoot,
          nextModel.architectOutput,
        );
      }
      setViewedArchitectOutputRevisionKeys([]);
      applyDevelopmentPostMutationProjection(nextModel.development);
      setArchitectOutputReviewStatus("");
      setArchitectOutputReviewNotes("");
      setFeedback(`Architect output disposition applied: ${architectOutputReviewStatus}.`);
    } catch (error) {
      setDocumentError(error instanceof Error ? error.message : "Architect output review could not be applied.");
    } finally {
      setIsApplying(false);
    }
  }

  async function refreshCurrentModel(): Promise<CurrentWorkspaceModel | null> {
    try {
      const nextModel = await window.champcity.getCurrentWorkspaceModel();
      setCurrentModel(nextModel);
      return nextModel;
    } catch {
      setCurrentModel(null);
      return null;
    }
  }

  async function refreshProjectPlanningWorkspaceModel(): Promise<ProjectPlanningWorkspaceModel | null> {
    try {
      const nextModel = await window.champcity.getProjectPlanningWorkspaceModel();
      setProjectPlanningModel(nextModel);
      return nextModel;
    } catch {
      setProjectPlanningModel(null);
      return null;
    }
  }

  async function runWorkspaceAction(action: () => Promise<RuntimeActionResult>): Promise<void> {
    if (action === window.champcity.generateCurrentHandoff && !(await preflightMcpHandoff())) return;
    setDocumentError("");
    setFeedback("");
    try {
      const result = await action();
      setFeedback(result.message);
      await refreshDocuments();
    } catch (error) {
      setDocumentError(error instanceof Error ? error.message : "Workspace action failed.");
    }
  }

  async function openPhaseValidation(): Promise<void> {
    setDocumentError("");
    setFeedback("");
    try {
      const nextPhaseAction = await loadPhaseValidationEntry(
        () => window.champcity.getPhaseValidationActionProjection(),
      );
      transitionToWorkflowStep(nextPhaseAction.workspaceId, {
        preferredDocumentId: nextPhaseAction.closeout?.logicalDocumentId ?? null,
      });
      setPhaseValidationAction(nextPhaseAction);
      setFeedback(nextPhaseAction.reason);
    } catch (error) {
      setPhaseValidationAction(null);
      setDocumentError(
        error instanceof Error
          ? error.message
          : "Phase Validation eligibility could not be verified.",
      );
    }
  }

  async function runPhaseValidationMutation(
    mutation: () => Promise<RuntimeActionResult>,
  ): Promise<void> {
    setIsApplying(true);
    setDocumentError("");
    setFeedback("");
    try {
      const transition = await executePhaseValidationMutation(
        mutation,
        async () => {
          const nextDocuments = await window.champcity.listDocuments();
          const nextProjectPlanningModel = await window.champcity.getProjectPlanningWorkspaceModel();
          const nextCurrentModel = await window.champcity.getCurrentWorkspaceModel();
          const nextResolverResult = await window.champcity.resolveCurrentDocument();
          return {
            documents: nextDocuments,
            projectPlanningModel: nextProjectPlanningModel,
            currentModel: nextCurrentModel,
            resolverResult: nextResolverResult,
          };
        },
      );
      const repository = transition.repositoryEvidence;
      applyDocumentInventory(repository.documents);
      setProjectPlanningModel(repository.projectPlanningModel);
      setCurrentModel(repository.currentModel);
      setResolverResult(repository.resolverResult);
      transitionToWorkflowStep(transition.phaseAction.workspaceId, {
        documents: repository.documents,
        preferredDocumentId: transition.phaseAction.closeout?.logicalDocumentId ?? null,
        resolverResult: repository.resolverResult,
      });
      setPhaseValidationAction(transition.phaseAction);
      setFeedback(transition.result.message);
    } catch (error) {
      setPhaseValidationAction(null);
      setDocumentError(error instanceof Error ? error.message : "Phase Validation action failed.");
    } finally {
      setIsApplying(false);
    }
  }

  async function createCurrentPhaseCloseout(): Promise<void> {
    if (phaseValidationAction?.requiredAction !== "create-closeout") {
      setDocumentError("Repository binding does not currently permit Phase Closeout creation.");
      return;
    }
    await runPhaseValidationMutation(
      () => window.champcity.createPhaseCloseoutForCurrentPhase(
        actionInputs.closureDecision,
        actionInputs.rationale,
      ),
    );
  }

  async function applyCurrentPhaseCloseoutDisposition(): Promise<void> {
    if (
      phaseValidationAction?.requiredAction !== "dispose-closeout" ||
      phaseValidationAction.workspaceId !== "phase-validation"
    ) {
      setDocumentError("Repository binding does not currently permit Phase Closeout disposition.");
      return;
    }
    await runPhaseValidationMutation(
      () => window.champcity.applyCurrentDisposition(
        actionInputs.status,
        "",
        phaseValidationAction.workspaceId,
      ),
    );
  }

  async function refreshWorkCardCloseProjection(): Promise<RuntimeActionResult | null> {
    try {
      const result = await window.champcity.getCurrentCloseProjection();
      setWorkCardCloseProjectionResult(result);
      return result;
    } catch (error) {
      setWorkCardCloseProjectionResult(null);
      setDocumentError(error instanceof Error ? error.message : "Work Card close projection could not be loaded.");
      return null;
    }
  }

  async function refreshWorkCardRepairProjection(
    options: { quiet?: boolean } = {},
  ): Promise<RuntimeActionResult | null> {
    if (options.quiet && workCardRepairRefreshInFlightRef.current !== null) {
      return null;
    }
    const requestId = workCardRepairRefreshRequestRef.current + 1;
    workCardRepairRefreshRequestRef.current = requestId;
    workCardRepairRefreshInFlightRef.current = requestId;
    let resolveCompletion!: () => void;
    const completion = new Promise<void>((resolve) => {
      resolveCompletion = resolve;
    });
    workCardRepairRefreshCompletionRef.current = completion;
    try {
      const result = await window.champcity.getCurrentRepairWorkspaceProjection();
      if (requestId !== workCardRepairRefreshRequestRef.current) {
        return null;
      }
      setWorkCardRepairProjectionResult(result);
      return result;
    } catch (error) {
      if (requestId !== workCardRepairRefreshRequestRef.current) {
        return null;
      }
      setWorkCardRepairProjectionResult(null);
      if (!options.quiet) {
        setDocumentError(error instanceof Error ? error.message : "Work Card Repair projection could not be loaded.");
      }
      return null;
    } finally {
      if (workCardRepairRefreshInFlightRef.current === requestId) {
        workCardRepairRefreshInFlightRef.current = null;
      }
      if (workCardRepairRefreshCompletionRef.current === completion) {
        workCardRepairRefreshCompletionRef.current = null;
      }
      resolveCompletion();
    }
  }

  async function createRepairHandoffFromCurrentEvidence(): Promise<void> {
    setIsApplying(true);
    setDocumentError("");
    setFeedback("");
    try {
      const result = await window.champcity.createRepairForCurrentFailure();
      setFeedback(result.message);
      const nextDocuments = await window.champcity.listDocuments();
      applyDocumentInventory(nextDocuments);
      await refreshProjectPlanningWorkspaceModel();
      const nextModel = await refreshCurrentModel();
      const nextResolverResult = await window.champcity.resolveCurrentDocument();
      setResolverResult(nextResolverResult);
      transitionToWorkflowStep("work-card-repair", {
        documents: nextDocuments,
        resolverResult: nextResolverResult,
      });
      await refreshWorkCardRepairProjection();
      await refreshArchitectOutputWorkspace({
        autoSelectOutput: true,
        force: true,
        refreshRepositoryProjection: false,
        workspaceId: nextModel?.activeWorkspaceId === "work-card-repair" ? "work-card-repair" : activeWorkspaceId,
      });
    } catch (error) {
      setDocumentError(error instanceof Error ? error.message : "Repair handoff could not be created.");
    } finally {
      setIsApplying(false);
    }
  }

  async function prepareRepairWorkCardPromptFromEvidence(): Promise<void> {
    if (!(await preflightMcpHandoff())) return;
    setIsRepairPromptPreparing(true);
    setDocumentError("");
    setFeedback("");
    setArchitectFeedback(null);
    try {
      const currentProjection = workCardRepairProjection ??
        workCardRepairProjectionFromResult(await refreshWorkCardRepairProjection());
      if (!currentProjection?.handoffPath) {
        await window.champcity.createRepairForCurrentFailure();
      }
      const nextDocuments = await window.champcity.listDocuments();
      applyDocumentInventory(nextDocuments);
      await refreshProjectPlanningWorkspaceModel();
      const nextResolverResult = await window.champcity.resolveCurrentDocument();
      setResolverResult(nextResolverResult);
      await refreshCurrentModel();
      const nextModel = await window.champcity.prepareArchitectOutputHandoff("work-card-repair");
      setArchitectOutputModel(nextModel);
      setArchitectFeedback({
        kind: "success",
        message: "Repair Work Card prompt prepared. Copy it and send it manually in embedded ChatGPT.",
      }, 4500);
      await refreshWorkCardRepairProjection();
      await refreshArchitectOutputWorkspace({
        autoSelectOutput: true,
        force: true,
        refreshRepositoryProjection: false,
        workspaceId: "work-card-repair",
      });
    } catch (error) {
      setArchitectFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Repair Work Card prompt could not be prepared.",
      });
    } finally {
      setIsRepairPromptPreparing(false);
    }
  }

  async function refreshWorkCardMapProjection(
    phaseId: string,
  ): Promise<RuntimeActionResult | null> {
    try {
      const result = await window.champcity.getWorkCardMapProjection(phaseId);
      setWorkCardMapResult(result);
      return result;
    } catch (error) {
      setWorkCardMapResult(null);
      setDocumentError(error instanceof Error ? error.message : "Work Card Map could not be loaded.");
      return null;
    }
  }

  async function returnFromWorkCardCloseToSelection(): Promise<void> {
    setIsApplying(true);
    setDocumentError("");
    setFeedback("");
    try {
      const transition = await executeCloseReturnToMap(
        window.champcity,
        (projection) => {
          setCloseReturnSelectionProjection(projection);
          setWorkCardCloseProjectionResult(null);
          transitionToWorkflowStep("phase-work-card-selection");
        },
      );
      applyDocumentInventory(transition.documents);
      setProjectPlanningModel(transition.projectPlanningModel);
      setCurrentModel(transition.currentModel);
      setResolverResult(transition.resolverResult);
      setWorkCardMapResult(transition.mapResult);
      transitionToWorkflowStep("phase-work-card-selection", {
        documents: transition.documents,
        preferredDocumentId: preferredDocumentIdFromResolver(
          transition.resolverResult,
          "phase-work-card-selection",
        ),
        resolverResult: transition.resolverResult,
      });
      setFeedback(transition.closeReturnResult.message);
    } catch (error) {
      setDocumentError(error instanceof Error ? error.message : "Work Card close return could not be completed.");
    } finally {
      setIsApplying(false);
    }
  }

  async function createImplementerReportFromBuildReview(): Promise<RuntimeActionResult | void> {
    setDocumentError("");
    setFeedback("");
    try {
      const result = await window.champcity.generateCurrentHandoff();
      setFeedback(result.message);
      const nextDocuments = await window.champcity.listDocuments();
      applyDocumentInventory(nextDocuments);
      await refreshProjectPlanningWorkspaceModel();
      const nextModel = await refreshCurrentModel();
      const reportId = nextModel?.workCardBuildingReview?.report?.logicalDocumentId;
      if (reportId) {
        setSelectedDocumentId(reportId);
      }
      const nextResolverResult = await window.champcity.resolveCurrentDocument();
      setResolverResult(nextResolverResult);
      return result;
    } catch (error) {
      setDocumentError(error instanceof Error ? error.message : "Implementer Report could not be created.");
    }
  }

  async function refreshBuildReviewAfterCodex(status: CodexImplementerExecutionModel): Promise<void> {
    const nextDocuments = await window.champcity.listDocuments();
    applyDocumentInventory(nextDocuments);
    await refreshProjectPlanningWorkspaceModel();
    const nextModel = await refreshCurrentModel();
    const reportId = nextModel?.workCardBuildingReview?.report?.logicalDocumentId;
    if (reportId) {
      setSelectedDocumentId(reportId);
      await loadDocument(reportId, { preserveOnFailure: true });
    }
    const nextResolverResult = await window.champcity.resolveCurrentDocument();
    setResolverResult(nextResolverResult);
    const terminalMessage = status.failureReason ??
      (status.reportUpdated
        ? "Codex execution finished. Review the existing Implementer Report."
        : "Codex completed, but the Implementer Report was not updated.");
    setFeedback(terminalMessage);
  }

  async function startCodexImplementerExecution(selection: CodexModelSelection): Promise<void> {
    setIsCodexExecutionActionRunning(true);
    setDocumentError("");
    setFeedback("");
    try {
      const status = await window.champcity.startCodexImplementerExecution(selection);
      dispatchCodexExecutionPresentation({ type: "set-development", status });
      developmentCodexExecutionPreviousStateRef.current = status.state;
      if (status.state === "running") {
        setFeedback("Codex Implementer execution started.");
      } else if (["completed", "failed", "cancelled"].includes(status.state)) {
        await refreshBuildReviewAfterCodex(status);
      } else if (status.failureReason) {
        setDocumentError(status.failureReason);
      }
    } catch (error) {
      setDocumentError(error instanceof Error ? error.message : "Codex Implementer execution could not start.");
    } finally {
      setIsCodexExecutionActionRunning(false);
    }
  }

  async function startCodexEnvironmentResolution(): Promise<void> {
    setIsCodexExecutionActionRunning(true);
    setDocumentError("");
    setFeedback("");
    try {
      const status = await window.champcity.startCodexEnvironmentResolution();
      dispatchCodexExecutionPresentation({ type: "set-development", status });
      developmentCodexExecutionPreviousStateRef.current = status.state;
      if (status.state === "running") {
        setFeedback("Environment Resolution started.");
      } else if (["completed", "failed", "cancelled"].includes(status.state)) {
        await refreshBuildReviewAfterCodex(status);
      } else if (status.failureReason) {
        setDocumentError(status.failureReason);
      }
    } catch (error) {
      setDocumentError(error instanceof Error ? error.message : "Environment Resolution could not be started.");
    } finally {
      setIsCodexExecutionActionRunning(false);
    }
  }

  function projectCodexExecutionForActiveSurface(status: CodexImplementerExecutionModel): void {
    if (isIssueCodexExecutionForeground && selectedIssueCodexExecutionContextKey) {
      dispatchCodexExecutionPresentation({
        type: "set-issue",
        contextKey: selectedIssueCodexExecutionContextKey,
        status,
      });
      return;
    }
    dispatchCodexExecutionPresentation({ type: "set-development", status });
  }

  async function cancelCodexImplementerExecution(): Promise<void> {
    const isIssueFixCardSurface = isIssueCodexExecutionForeground;
    setIsCodexExecutionActionRunning(true);
    setDocumentError("");
    if (isIssueFixCardSurface) {
      setIssuePlanningActionError("");
      setIssuePlanningActionFeedback("");
    }
    try {
      const status = await window.champcity.cancelCodexImplementerExecution();
      projectCodexExecutionForActiveSurface(status);
      if (status.failureReason) {
        if (isIssueFixCardSurface) {
          setIssuePlanningActionFeedback(status.failureReason);
        } else {
          setFeedback(status.failureReason);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Codex Implementer execution could not be cancelled.";
      if (isIssueFixCardSurface) {
        setIssuePlanningActionError(message);
      } else {
        setDocumentError(message);
      }
    } finally {
      setIsCodexExecutionActionRunning(false);
    }
  }

  async function respondToCodexUserInput(requestId: string, answers: Record<string, string[]>): Promise<void> {
    setIsCodexExecutionActionRunning(true);
    if (isIssueCodexExecutionForeground) {
      setIssuePlanningActionError("");
      setIssuePlanningActionFeedback("");
    } else {
      setDocumentError("");
      setFeedback("");
    }
    try {
      const status = await window.champcity.respondToCodexUserInput({ requestId, answers });
      projectCodexExecutionForActiveSurface(status);
      if (isIssueCodexExecutionForeground) {
        setIssuePlanningActionFeedback("Codex input submitted.");
      } else {
        setFeedback("Codex input submitted.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Codex input could not be submitted.";
      if (isIssueCodexExecutionForeground) {
        setIssuePlanningActionError(message);
      } else {
        setDocumentError(message);
      }
    } finally {
      setIsCodexExecutionActionRunning(false);
    }
  }

  async function respondToCodexApproval(requestId: string, decision: "approve" | "deny"): Promise<void> {
    setIsCodexExecutionActionRunning(true);
    if (isIssueCodexExecutionForeground) {
      setIssuePlanningActionError("");
      setIssuePlanningActionFeedback("");
    } else {
      setDocumentError("");
      setFeedback("");
    }
    try {
      const status = await window.champcity.respondToCodexApproval({ requestId, decision });
      projectCodexExecutionForActiveSurface(status);
      const message = decision === "approve" ? "Codex approval granted once." : "Codex approval denied.";
      if (isIssueCodexExecutionForeground) {
        setIssuePlanningActionFeedback(message);
      } else {
        setFeedback(message);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Codex approval response could not be submitted.";
      if (isIssueCodexExecutionForeground) {
        setIssuePlanningActionError(message);
      } else {
        setDocumentError(message);
      }
    } finally {
      setIsCodexExecutionActionRunning(false);
    }
  }

  async function respondToCodexMcpElicitation(
    requestId: string,
    action: "accept" | "decline" | "cancel",
    content: unknown | null,
  ): Promise<void> {
    setIsCodexExecutionActionRunning(true);
    if (isIssueCodexExecutionForeground) {
      setIssuePlanningActionError("");
      setIssuePlanningActionFeedback("");
    } else {
      setDocumentError("");
      setFeedback("");
    }
    try {
      const status = await window.champcity.respondToCodexMcpElicitation({ requestId, action, content });
      projectCodexExecutionForActiveSurface(status);
      if (isIssueCodexExecutionForeground) {
        setIssuePlanningActionFeedback("MCP input submitted.");
      } else {
        setFeedback("MCP input submitted.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "MCP input could not be submitted.";
      if (isIssueCodexExecutionForeground) {
        setIssuePlanningActionError(message);
      } else {
        setDocumentError(message);
      }
    } finally {
      setIsCodexExecutionActionRunning(false);
    }
  }

  async function copyWorkCardAdvisoryReviewPrompt(): Promise<void> {
    setDocumentError("");
    setFeedback("");
    try {
      const result = await window.champcity.copyCurrentWorkCardAdvisoryReviewPrompt();
      setFeedback(result.message);
    } catch (error) {
      setDocumentError(error instanceof Error ? error.message : "Advisory Architect review prompt could not be copied.");
    }
  }

  async function applyOperatorValidationDecision(decision: OperatorValidationDecision): Promise<void> {
    if (decision === "RequestRepair" && !repairDefectText.trim()) {
      setDocumentError("Repair defect text is required to request repair.");
      return;
    }
    setIsApplying(true);
    setDocumentError("");
    setFeedback("");
    try {
      const result = await window.champcity.applyOperatorValidationDecisionForCurrentWorkCard({
        decision,
        operatorNotes: operatorValidationNotes,
        advisorySummary,
        repairDefectText,
      }, selectedDocumentId);
      setFeedback(result.message);
      setOperatorValidationNotes("");
      setAdvisorySummary("");
      setRepairDefectText("");
      applyDevelopmentPostMutationProjection(result.development);
    } catch (error) {
      setDocumentError(error instanceof Error ? error.message : "Operator validation decision could not be applied.");
    } finally {
      setIsApplying(false);
    }
  }

  async function generateWorkCardIntakeAndTransition(): Promise<void> {
    if (!(await preflightMcpHandoff())) return;
    if (isWorkCardIntakeGenerating) {
      return;
    }
    setIsWorkCardIntakeGenerating(true);
    setWorkCardIntakeError("");
    setWorkCardIntakeFeedback("");
    setWorkCardRepairProjectionResult(null);
    setDocumentError("");
    setFeedback("");
    try {
      const result = await window.champcity.generateCurrentHandoff();
      const nextDocuments = await window.champcity.listDocuments();
      applyDocumentInventory(nextDocuments);
      await refreshProjectPlanningWorkspaceModel();
      const nextModel = await refreshCurrentModel();
      if (nextModel?.activeWorkspaceId !== "work-card-planning" || nextModel.workCardIntake) {
        const resolvedWorkspace = nextModel?.activeWorkspaceId ?? "unresolved";
        setWorkCardIntakeFeedback(result.message);
        setWorkCardIntakeError(
          `Work Card Planning handoff generated, but the refreshed workspace resolved to ${resolvedWorkspace} without Formal Work Card preparation.`,
        );
        transitionToWorkflowStep("work-card-planning", { documents: nextDocuments });
        return;
      }
      const nextResolverResult = await window.champcity.resolveCurrentDocument();
      setResolverResult(nextResolverResult);
      transitionToWorkflowStep("work-card-planning", {
        documents: nextDocuments,
        preferredDocumentId: preferredDocumentIdFromResolver(
          nextResolverResult,
          "work-card-planning",
        ),
        resolverResult: nextResolverResult,
      });
      await refreshArchitectOutputWorkspace({
        autoSelectOutput: true,
        force: true,
        refreshRepositoryProjection: false,
      });
      setFeedback(result.message);
    } catch (error) {
      setWorkCardIntakeError(error instanceof Error ? error.message : "Work Card Planning handoff could not be generated.");
    } finally {
      setIsWorkCardIntakeGenerating(false);
    }
  }

  async function beginMappedWorkCardPlanningAndTransition(candidateId: string): Promise<void> {
    if (isWorkCardIntakeGenerating) {
      return;
    }
    setIsWorkCardIntakeGenerating(true);
    setWorkCardIntakeError("");
    setWorkCardIntakeFeedback("");
    setDocumentError("");
    setFeedback("");
    const phaseId = workCardMapProjectionFromResult(workCardMapResult)?.phaseId ?? currentModel?.currentPhaseId;
    const isCloseReturnCandidateAction =
      closeReturnSelectionProjection?.state === "selection-required" &&
      closeReturnSelectionProjection.phaseId === phaseId;
    try {
      if (!phaseId) {
        setWorkCardIntakeError("Work Card Map requires a current phase before planning can begin.");
        return;
      }
      if (closeReturnSelectionProjection && !isCloseReturnCandidateAction) {
        setWorkCardIntakeError("The current Close / Next result does not permit successor intake selection.");
        await refreshWorkCardMapProjection(phaseId);
        return;
      }

      let result: RuntimeActionResult;
      let refresh: Awaited<ReturnType<typeof refreshRendererRepositoryBinding>>;
      if (isCloseReturnCandidateAction) {
        const closeReturnTransition = await executeCloseReturnCandidateIntake(
          window.champcity,
          phaseId,
          candidateId,
        );
        if (closeReturnTransition.state === "rejected") {
          if (closeReturnTransition.mapResult) {
            setWorkCardMapResult(closeReturnTransition.mapResult);
          }
          if (closeReturnTransition.mapRefreshError) {
            setDocumentError(
              closeReturnTransition.mapRefreshError instanceof Error
                ? `Work Card Map refresh failed: ${closeReturnTransition.mapRefreshError.message}`
                : "Work Card Map refresh failed after the selection was rejected.",
            );
          }
          setWorkCardIntakeError(
            closeReturnTransition.error instanceof Error
              ? closeReturnTransition.error.message
              : "The selected Work Card was rejected by current repository binding.",
          );
          return;
        }
        result = closeReturnTransition.actionResult;
        refresh = closeReturnTransition;
      } else {
        result = await window.champcity.beginWorkCardPlanning(phaseId, candidateId);
        refresh = await refreshRendererRepositoryBinding(window.champcity);
      }

      const nextDocuments = refresh.documents;
      const nextModel = refresh.currentModel;
      const nextResolverResult = refresh.resolverResult;
      applyDocumentInventory(nextDocuments);
      setProjectPlanningModel(refresh.projectPlanningModel);
      setCurrentModel(nextModel);
      setResolverResult(nextResolverResult);
      if (
        !activeWorkCardResumeWorkspaceIds.has(nextModel.activeWorkspaceId) ||
        !currentModelMatchesCandidate(nextModel, candidateId) ||
        (nextModel.activeWorkspaceId === "work-card-planning" && nextModel.workCardIntake)
      ) {
        const resolvedWorkspace = nextModel?.activeWorkspaceId ?? "unresolved";
        setWorkCardIntakeError(
          `Work Card action completed, but the refreshed workspace resolved to ${resolvedWorkspace} for ${nextModel?.currentWorkCardId ?? "no Work Card"} instead of ${candidateId}.`,
        );
        setWorkCardIntakeFeedback(result.message);
        await refreshWorkCardMapProjection(phaseId);
        return;
      }
      const destinationWorkspaceId = nextModel.activeWorkspaceId;
      setSelectedDocumentId(null);
      setSelectedDocument(null);
      setSelectedStatus("");
      transitionToWorkflowStep(destinationWorkspaceId, {
        documents: nextDocuments,
        preferredDocumentId: preferredDocumentIdFromResolver(
          nextResolverResult,
          destinationWorkspaceId,
        ),
        resolverResult: nextResolverResult,
      });
      setWorkCardMapResult(null);
      setCloseReturnSelectionProjection(null);
      if (isArchitectEnabledWorkspace(destinationWorkspaceId)) {
        await refreshArchitectOutputWorkspace({
          autoSelectOutput: true,
          force: true,
          refreshRepositoryProjection: false,
          workspaceId: destinationWorkspaceId,
        });
      }
      setFeedback(result.message);
    } catch (error) {
      if (isCloseReturnCandidateAction && phaseId) {
        await refreshWorkCardMapProjection(phaseId);
      }
      setWorkCardIntakeError(error instanceof Error ? error.message : "Work Card Planning could not be started.");
    } finally {
      setIsWorkCardIntakeGenerating(false);
    }
  }

  async function saveLifecycleArchitectOutput(): Promise<void> {
    setDocumentError("Direct Architect output import has been retired. Use Prepare Handoff, Copy Handoff, and MCP-created temporary drafts.");
  }

  async function refreshDocuments(options: { useResolver?: boolean } = {}): Promise<void> {
    setIsLoadingDocuments(true);
    setDocumentError("");
    try {
      const nextDocuments = await window.champcity.listDocuments();
      applyDocumentInventory(nextDocuments);
      await refreshProjectPlanningWorkspaceModel();
      const nextCurrentModel = await refreshCurrentModel();
      if (
        selectedDocumentId &&
        nextDocuments.some((document) => document.logicalDocumentId === selectedDocumentId)
      ) {
        await loadDocument(selectedDocumentId, { preserveOnFailure: true });
      }
      if (
        isArchitectEnabledWorkspace(activeWorkspaceId) &&
        !(activeWorkspaceId === "work-card-planning" && nextCurrentModel?.workCardIntake)
      ) {
        await refreshArchitectOutputWorkspace({
          autoSelectOutput: true,
          force: true,
          refreshRepositoryProjection: false,
        });
      }
      if (options.useResolver) {
        const nextResolverResult = await window.champcity.resolveCurrentDocument();
        selectResolverResult(nextResolverResult, {
          currentModel: nextCurrentModel,
          documents: nextDocuments,
        });
        setFeedback(getResolverFeedback(nextResolverResult));
      } else if (activeWorkspaceId === "phase-validation") {
        try {
          const refreshedPhaseAction = await loadPhaseValidationEntry(
            () => window.champcity.getPhaseValidationActionProjection(),
          );
          setPhaseValidationAction(refreshedPhaseAction);
          transitionToWorkflowStep(refreshedPhaseAction.workspaceId, {
            documents: nextDocuments,
            preferredDocumentId: refreshedPhaseAction.closeout?.logicalDocumentId ?? null,
          });
          setFeedback("Documents and Phase Validation basis refreshed.");
        } catch (error) {
          setPhaseValidationAction(null);
          setDocumentError(
            error instanceof Error
              ? error.message
              : "Phase Validation basis could not be refreshed.",
          );
        }
      } else {
        transitionToWorkflowStep(activeWorkspaceId, { documents: nextDocuments });
        setFeedback("Documents refreshed.");
      }
    } catch (error) {
      setDocuments([]);
      setResolverResult(null);
      setDocumentError(error instanceof Error ? error.message : "Documents could not be loaded.");
    } finally {
      setIsLoadingDocuments(false);
    }
  }

  async function openExistingProjectFromLanding(): Promise<void> {
    setIsChoosing(true);
    setDocumentError("");
    try {
      await activateWorkspaceSelection(
        await window.champcity.chooseWorkspaceFolder(),
        "workflow-hub",
      );
    } catch (error) {
      setDocumentError(error instanceof Error ? error.message : "Existing project could not be opened.");
    } finally {
      setIsChoosing(false);
    }
  }

  async function startNewProjectFromLanding(): Promise<void> {
    setIsChoosing(true);
    setDocumentError("");
    try {
      await activateWorkspaceSelection(
        await window.champcity.chooseWorkspaceFolder(),
        "work-intake",
      );
    } catch (error) {
      setDocumentError(error instanceof Error ? error.message : "New project directory could not be selected.");
    } finally {
      setIsChoosing(false);
    }
  }

  async function activateWorkspaceSelection(
    selection: WorkspaceSelection,
    destination: ProjectEntryDestination,
  ): Promise<void> {
    if (!selection.ok) {
      setDocumentError(selection.reason);
      return;
    }

    clearRepositoryDerivedState();
    setWorkspace(selection);
    if (selection.mcpRegistrationError) {
      setDocumentError(`Project selected, but MCP registration failed: ${selection.mcpRegistrationError}`);
    }
    setProjectIntake((current) => ({
      ...current,
      projectRepository: selection.workspaceRoot,
    }));

    if (destination === "work-intake") {
      await openWorkIntake();
      return;
    }
    if (destination === "project-intake-capture") {
      setShellView("workflow");
      setActiveWorkflowId("development");
      setActiveWorkspaceId("project-intake-capture");
      setPriorWorkflowWorkspaceId("project-intake-capture");
      return;
    }

    setShellView("workflow-hub");
    setActiveWorkflowId(null);
    setActiveWorkspaceId(workspaceDefinitions[0].id);
  }

  function clearRepositoryDerivedState(): void {
    setWorkIntakeProjection(null);
    const clearedPostSubmitState = clearProjectIntakePostSubmitReviewState({
      confirmation: projectIntakeConfirmation,
      viewedWorkspaceId: activeWorkspaceId,
      selectedDocumentId,
      resolverResult,
    });
    setDocuments([]);
    setSelectedDocumentId(null);
    setSelectedDocument(null);
    setSelectedStatus("");
    setFeedback("");
    setDocumentError("");
    setResolverResult(null);
    setProjectIntakeConfirmation(clearedPostSubmitState.confirmation);
    setCurrentModel(null);
    setPhaseValidationAction(null);
    setProjectPlanningModel(null);
    setArchitectStatus(null);
    setArchitectOutputModel(null);
    setSelectedArchitectOutputSlotId(null);
    setArchitectOutputReviewStatus("");
    setArchitectOutputReviewNotes("");
    dispatchCodexExecutionPresentation({ type: "clear-development" });
    dispatchCodexExecutionPresentation({ type: "clear-issue" });
    setIsCodexExecutionActionRunning(false);
    setViewedArchitectOutputRevisionKeys([]);
    setArchitectFeedback(null);
    setArchitectOutputPollingError("");
    architectOutputFingerprintRef.current = null;
    architectOutputPollRequestRef.current += 1;
    architectOutputPollInFlightRef.current = null;
    developmentCodexExecutionPreviousStateRef.current = null;
    issueCodexExecutionPreviousStateRef.current = null;
    issueCodexExecutionContextRef.current = null;
    setIssueInventory(null);
    setSelectedIssueId(null);
    setActiveIssueStageId("intake");
    setIssueArchitectProjection(null);
    setIssuePlanningProjection(null);
    setIssueNavigationProjection(null);
    setIssueValidationProjection(null);
    setIssueCloseProjection(null);
    setActiveIssueFixCardStepId("fix-card-map");
    setIssueFixCardProjection(null);
    setIssueInventoryError("");
    setIsIssueInventoryLoading(false);
    setIsIssueCreating(false);
    setIsIssueArchitectActionPending(false);
    setIssueArchitectActionFeedback("");
    setIssueArchitectActionError("");
    setIsIssuePlanningActionPending(false);
    setIssuePlanningActionFeedback("");
    setIssuePlanningActionError("");
    setIsIssueCloseLoading(false);
    setIsIssueCloseActionPending(false);
    setIssueCloseActionFeedback("");
    setIssueCloseActionError("");
    issuePlanningProjectionRefreshRequestRef.current += 1;
    issuePlanningProjectionRefreshInFlightRef.current = null;
    issueFixCardProjectionRefreshRequestRef.current += 1;
    issueFixCardProjectionRefreshInFlightRef.current = null;
  }

  function applyDocumentInventory(nextDocuments: PlanningDocumentSummary[]): void {
    setDocuments(nextDocuments);
    if (
      selectedDocumentId &&
      !nextDocuments.some((document) => document.logicalDocumentId === selectedDocumentId)
    ) {
      setSelectedDocumentId(null);
      setSelectedDocument(null);
      setSelectedStatus("");
    }
  }

  function applyDevelopmentPostMutationProjection(
    projection: DevelopmentPostMutationProjection,
  ): void {
    applyDocumentInventory(projection.documents);
    setProjectPlanningModel(projection.projectPlanningModel);
    setCurrentModel(projection.currentModel);
    setResolverResult(projection.resolverResult);
    if (projection.selectedDocument) {
      setSelectedDocumentId(projection.selectedDocument.logicalDocumentId);
      setSelectedDocument(projection.selectedDocument);
      setSelectedStatus(
        projection.selectedDocument.effectiveDisposition === "Pending"
          ? ""
          : projection.selectedDocument.effectiveDisposition,
      );
    } else {
      setSelectedDocumentId(null);
      setSelectedDocument(null);
      setSelectedStatus("");
    }
    transitionToWorkflowStep(projection.currentModel.activeWorkspaceId, {
      documents: projection.documents,
      preferredDocumentId: projection.selectedDocument?.logicalDocumentId ?? null,
      resolverResult: projection.resolverResult,
    });
  }

  function applyIssuePostMutationProjection(
    projection: IssuePostMutationProjection,
    options: { synchronizeStage?: boolean } = {},
  ): void {
    setIssueNavigationProjection(projection.navigation);
    if (projection.planning) {
      setIssuePlanningProjection(projection.planning);
    }
    if (projection.validation) {
      setIssueValidationProjection(projection.validation);
    }
    if (projection.close) {
      setIssueCloseProjection(projection.close);
    }
    if (options.synchronizeStage) {
      setActiveIssueStageId(projection.navigation.currentStageId);
    }
  }

  function focusProjectIntakeReviewSurface(): void {
    window.requestAnimationFrame(() => {
      documentReviewSurfaceRef.current?.scrollIntoView({
        block: "start",
        behavior: "smooth",
      });
      documentReviewSurfaceRef.current?.focus({ preventScroll: true });
    });
  }

  function transitionToWorkflowStep(
    destinationWorkspaceId: WorkspaceId,
    options: {
      documents?: PlanningDocumentSummary[];
      preferredDocumentId?: string | null;
      resolverResult?: FirstNonApprovedResult | null;
    } = {},
  ): void {
    const retainedPhaseValidationAction = phaseValidationActionForWorkspace(
      destinationWorkspaceId,
      phaseValidationAction,
    );
    if (retainedPhaseValidationAction !== phaseValidationAction) {
      setPhaseValidationAction(retainedPhaseValidationAction);
    }
    if (destinationWorkspaceId !== settingsWorkspaceId) {
      setShellView("workflow");
      setActiveWorkflowId("development");
    }
    setActiveWorkspaceId(destinationWorkspaceId);
    if (destinationWorkspaceId !== settingsWorkspaceId) {
      setPriorWorkflowWorkspaceId(destinationWorkspaceId);
    }
    const nextDocuments = options.documents ?? documents;
    const nextDocumentId = documentIdForWorkflowStep({
      destinationWorkspaceId,
      documents: nextDocuments,
      preferredDocumentId: options.preferredDocumentId,
      resolverResult: options.resolverResult ?? resolverResult,
      selectedDocumentId,
    });

    if (nextDocumentId) {
      setSelectedDocumentId(nextDocumentId);
      return;
    }

    setSelectedDocumentId(null);
    setSelectedDocument(null);
    setSelectedStatus("");
  }

  function openSettingsWorkspace(): void {
    const returnShellView = shellView === "workflow" ? "workflow" : "workflow-hub";
    setSettingsReturnShellView(returnShellView);
    setSettingsReturnWorkflowId(returnShellView === "workflow" ? activeWorkflowId : null);
    const next = openSettingsNavigationState(activeWorkspaceId, priorWorkflowWorkspaceId);
    setPriorWorkflowWorkspaceId(next.priorWorkflowWorkspaceId);
    setActiveWorkspaceId(next.activeWorkspaceId);
    setShellView("settings");
  }

  function returnFromSettingsWorkspace(): void {
    if (settingsReturnShellView === "workflow-hub") {
      setShellView("workflow-hub");
      setActiveWorkflowId(null);
      setActiveWorkspaceId(returnFromSettingsNavigationState(priorWorkflowWorkspaceId));
      return;
    }
    if (settingsReturnWorkflowId === "issue-resolution") {
      setShellView("workflow");
      setActiveWorkflowId("issue-resolution");
      setActiveWorkspaceId(returnFromSettingsNavigationState(priorWorkflowWorkspaceId));
      return;
    }
    transitionToWorkflowStep(returnFromSettingsNavigationState(priorWorkflowWorkspaceId));
  }

  async function openWorkflow(workflowId: WorkflowId): Promise<void> {
    if (!workspace.ok) {
      setDocumentError("Select a project before opening a workflow.");
      return;
    }
    setIssueCloseActionFeedback("");
    if (workflowId === "issue-resolution") {
      setShellView("workflow");
      setActiveWorkflowId("issue-resolution");
      setActiveWorkspaceId(workspaceDefinitions[0].id);
      await refreshIssueInventory(undefined, true);
      return;
    }
    setShellView("workflow");
    setActiveWorkflowId("development");
    await refreshDocuments({ useResolver: true });
  }

  async function openWorkIntake(): Promise<void> {
    try {
      setWorkIntakeProjection(await window.champcity.getWorkIntakeProjection());
      setActiveWorkflowId(null);
      setShellView("work-intake");
    } catch (error) {
      setDocumentError(error instanceof Error ? error.message : "Work Intake could not be opened.");
    }
  }

  function returnToWorkflowHub(): void {
    setShellView("workflow-hub");
    setActiveWorkflowId(null);
  }

  async function refreshIssueInventory(
    preferredIssueId = selectedIssueId,
    synchronizeStage = false,
  ): Promise<void> {
    if (!workspace.ok) {
      setIssueInventory(null);
      setSelectedIssueId(null);
      setIssueInventoryError("Select a project before opening Issue Resolution.");
      return;
    }
    setIsIssueInventoryLoading(true);
    setIssueInventoryError("");
    try {
      const nextInventory = await window.champcity.discoverIssueInventory();
      setIssueInventory(nextInventory);
      const nextIssueId = resolveSelectedIssueId(nextInventory.issues, preferredIssueId);
      setSelectedIssueId(nextIssueId);
      if (synchronizeStage && nextIssueId) {
        const navigation = await window.champcity.getIssueResolutionNavigationProjection(nextIssueId);
        setIssueNavigationProjection(navigation);
        setActiveIssueStageId(navigation.currentStageId);
      }
      if (activeIssueStageId === "architect-planning" || activeIssueStageId === "issue-planning") {
        const nextIssue = nextInventory.issues.find((issue) => issue.issueId === nextIssueId) ?? null;
        if (nextIssue?.recordState !== "readable") {
          setActiveIssueStageId("intake");
        }
      }
    } catch (error) {
      setIssueInventory(null);
      setSelectedIssueId(null);
      setIssueInventoryError(error instanceof Error ? error.message : "Issue inventory could not be loaded.");
    } finally {
      setIsIssueInventoryLoading(false);
    }
  }

  async function refreshIssueResolutionNavigationProjection(
    issueId = currentIssue?.issueId,
    options: { synchronizeStage?: boolean } = {},
  ): Promise<void> {
    if (!workspace.ok || !issueId) {
      setIssueNavigationProjection(null);
      return;
    }
    try {
      const projection = await window.champcity.getIssueResolutionNavigationProjection(issueId);
      setIssueNavigationProjection(projection);
      if (options.synchronizeStage) {
        setActiveIssueStageId(projection.currentStageId);
      }
    } catch {
      setIssueNavigationProjection(null);
    }
  }

  async function selectIssueFromSidebar(issueId: string): Promise<void> {
    setSelectedIssueId(issueId);
    setActiveIssueFixCardStepId("fix-card-map");
    setIssueFixCardProjection(null);
    dispatchCodexExecutionPresentation({ type: "clear-issue" });
    issueCodexExecutionPreviousStateRef.current = null;
    issueCodexExecutionContextRef.current = null;
    setIssuePlanningActionError("");
    setIssuePlanningActionFeedback("");
    try {
      const navigation = await window.champcity.getIssueResolutionNavigationProjection(issueId);
      setIssueNavigationProjection(navigation);
      const nextStage: IssueResolutionStageId = navigation.currentStageId;
      setActiveIssueStageId(nextStage);
      if (nextStage === "issue-close") {
        setIssueCloseProjection(await window.champcity.getIssueCloseProjection(issueId));
        setIssueValidationProjection(null);
        setIssuePlanningProjection(null);
        setIssueFixCardProjection(null);
        setIssueArchitectProjection(null);
      } else if (nextStage === "issue-validation") {
        setIssueValidationProjection(await window.champcity.getIssueValidationProjection(issueId));
        setIssueCloseProjection(null);
        setIssuePlanningProjection(null);
        setIssueFixCardProjection(null);
        setIssueArchitectProjection(null);
      } else if (nextStage === "fix-cards") {
        const planning = await window.champcity.getIssuePlanningProjection(issueId);
        setIssuePlanningProjection(planning);
        setIssueFixCardProjection(await window.champcity.getIssueFixCardProjection(issueId, "fix-card-map"));
        setIssueArchitectProjection(null);
        setIssueValidationProjection(null);
        setIssueCloseProjection(null);
      } else if (nextStage === "issue-planning") {
        setIssuePlanningProjection(await window.champcity.getIssuePlanningProjection(issueId));
        setIssueValidationProjection(null);
        setIssueCloseProjection(null);
        setIssueFixCardProjection(null);
        setIssueArchitectProjection(null);
      } else if (nextStage === "architect-planning") {
        setIssueArchitectProjection(await window.champcity.getIssueArchitectPlanningProjection(issueId));
        setIssuePlanningProjection(null);
        setIssueFixCardProjection(null);
        setIssueValidationProjection(null);
        setIssueCloseProjection(null);
      } else {
        setIssueArchitectProjection(null);
        setIssuePlanningProjection(null);
        setIssueFixCardProjection(null);
        setIssueValidationProjection(null);
        setIssueCloseProjection(null);
      }
    } catch (error) {
      setActiveIssueStageId("intake");
      setIssueNavigationProjection(null);
      setIssuePlanningActionError(error instanceof Error ? error.message : "Issue navigation could not be loaded.");
    }
  }

  function browseIssuesFromSidebar(): void {
    setActiveIssueStageId("intake");
    setActiveIssueFixCardStepId("fix-card-map");
    setIssueFixCardProjection(null);
    setIssueCloseProjection(null);
    setIssueCloseActionError("");
    setIssueCloseActionFeedback("");
    setIssuePlanningActionError("");
    setIssuePlanningActionFeedback("");
  }

  async function createIssue(input: NewIssueInput): Promise<void> {
    setIsIssueCreating(true);
    setIssueInventoryError("");
    try {
      const result = await window.champcity.createLightweightIssueRecord(input);
      setIssueInventory(result.inventory);
      setSelectedIssueId(result.createdIssueId);
      setActiveIssueStageId("intake");
    } catch (error) {
      const creationError = error instanceof Error
        ? error
        : new Error("Issue Record could not be created.");
      setIssueInventoryError(creationError.message);
      throw creationError;
    } finally {
      setIsIssueCreating(false);
    }
  }

  async function refreshIssueArchitectPlanningProjection(
    issueId = currentIssue?.issueId,
    options: { quiet?: boolean } = {},
  ): Promise<void> {
    if (!issueId) {
      setIssueArchitectProjection(null);
      return;
    }
    if (options.quiet && issueArchitectProjectionRefreshInFlightRef.current !== null) {
      return;
    }
    const requestId = issueArchitectProjectionRefreshRequestRef.current + 1;
    issueArchitectProjectionRefreshRequestRef.current = requestId;
    issueArchitectProjectionRefreshInFlightRef.current = requestId;
    let resolveCompletion!: () => void;
    const completion = new Promise<void>((resolve) => {
      resolveCompletion = resolve;
    });
    issueArchitectProjectionRefreshCompletionRef.current = completion;
    setIssueArchitectActionError("");
    try {
      const projection = await window.champcity.getIssueArchitectPlanningProjection(issueId);
      if (requestId !== issueArchitectProjectionRefreshRequestRef.current) {
        return;
      }
      setIssueArchitectProjection(projection);
    } catch (error) {
      if (requestId !== issueArchitectProjectionRefreshRequestRef.current) {
        return;
      }
      setIssueArchitectProjection(null);
      setIssueArchitectActionError(error instanceof Error ? error.message : "Architect Planning could not be loaded.");
    } finally {
      if (issueArchitectProjectionRefreshInFlightRef.current === requestId) {
        issueArchitectProjectionRefreshInFlightRef.current = null;
      }
      if (issueArchitectProjectionRefreshCompletionRef.current === completion) {
        issueArchitectProjectionRefreshCompletionRef.current = null;
      }
      resolveCompletion();
    }
  }

  async function runIssueArchitectAction(
    action: (issueId: string) => Promise<{ message: string; projection: IssueArchitectPlanningProjection }>,
  ): Promise<void> {
    if (!currentIssue) {
      setIssueArchitectActionError("Select a readable Issue before using Architect Planning.");
      return;
    }
    setIsIssueArchitectActionPending(true);
    setIssueArchitectActionError("");
    setIssueArchitectActionFeedback("");
    try {
      const result = await action(currentIssue.issueId);
      setIssueArchitectProjection(result.projection);
      setIssueArchitectActionFeedback(result.message);
      await refreshIssueResolutionNavigationProjection(currentIssue.issueId);
      if (result.projection.finalInvestigationState === "readable") {
        await refreshIssueInventory(currentIssue.issueId);
      }
    } catch (error) {
      setIssueArchitectActionError(error instanceof Error ? error.message : "Issue Architect action failed.");
      await refreshIssueArchitectPlanningProjection(currentIssue.issueId);
    } finally {
      setIsIssueArchitectActionPending(false);
    }
  }

  async function runIssueArchitectReview(input: IssueArchitectReviewInput): Promise<void> {
    if (!currentIssue) {
      setIssueArchitectActionError("Select a readable Issue before applying Architect review.");
      return;
    }
    setIsIssueArchitectActionPending(true);
    setIssueArchitectActionError("");
    setIssueArchitectActionFeedback("");
    try {
      const result = await window.champcity.applyIssueArchitectReview(currentIssue.issueId, input);
      setIssueArchitectProjection(result.projection);
      applyIssuePostMutationProjection(result.postMutation);
      setIssueArchitectActionFeedback(result.message);
    } catch (error) {
      setIssueArchitectActionError(error instanceof Error ? error.message : "Issue Architect review failed.");
      await refreshIssueArchitectPlanningProjection(currentIssue.issueId);
    } finally {
      setIsIssueArchitectActionPending(false);
    }
  }

  async function refreshIssuePlanningProjection(
    issueId = currentIssue?.issueId,
    options: { quiet?: boolean } = {},
  ): Promise<void> {
    if (!issueId) {
      setIssuePlanningProjection(null);
      return;
    }
    if (options.quiet && issuePlanningProjectionRefreshInFlightRef.current !== null) {
      return;
    }
    const requestId = issuePlanningProjectionRefreshRequestRef.current + 1;
    issuePlanningProjectionRefreshRequestRef.current = requestId;
    issuePlanningProjectionRefreshInFlightRef.current = requestId;
    let resolveCompletion!: () => void;
    const completion = new Promise<void>((resolve) => {
      resolveCompletion = resolve;
    });
    issuePlanningProjectionRefreshCompletionRef.current = completion;
    setIssuePlanningActionError("");
    try {
      const projection = await window.champcity.getIssuePlanningProjection(issueId);
      if (requestId !== issuePlanningProjectionRefreshRequestRef.current) {
        return;
      }
      setIssuePlanningProjection(projection);
    } catch (error) {
      if (requestId !== issuePlanningProjectionRefreshRequestRef.current) {
        return;
      }
      setIssuePlanningProjection(null);
      setIssuePlanningActionError(error instanceof Error ? error.message : "Issue Planning could not be loaded.");
    } finally {
      if (issuePlanningProjectionRefreshInFlightRef.current === requestId) {
        issuePlanningProjectionRefreshInFlightRef.current = null;
      }
      if (issuePlanningProjectionRefreshCompletionRef.current === completion) {
        issuePlanningProjectionRefreshCompletionRef.current = null;
      }
      resolveCompletion();
    }
  }

  async function refreshIssueValidationProjection(
    issueId = currentIssue?.issueId,
    options: { synchronizeStage?: boolean } = {},
  ): Promise<void> {
    if (!issueId) {
      setIssueValidationProjection(null);
      return;
    }
    setIssuePlanningActionError("");
    try {
      const projection = await window.champcity.getIssueValidationProjection(issueId);
      setIssueValidationProjection(projection);
      if (options.synchronizeStage) {
        const navigation = await window.champcity.getIssueResolutionNavigationProjection(issueId);
        setIssueNavigationProjection(navigation);
        setActiveIssueStageId(navigation.currentStageId);
        if (navigation.currentStageId === "issue-close") {
          setIssueCloseProjection(await window.champcity.getIssueCloseProjection(issueId));
        } else if (navigation.currentStageId === "issue-planning") {
          setIssuePlanningProjection(await window.champcity.getIssuePlanningProjection(issueId));
        }
      }
    } catch (error) {
      setIssueValidationProjection(null);
      setIssuePlanningActionError(error instanceof Error ? error.message : "Issue Validation could not be loaded.");
    }
  }

  async function runIssueValidationDecision(input: IssueValidationDecisionInput): Promise<void> {
    if (!currentIssue) {
      setIssuePlanningActionError("Select an eligible Issue before applying aggregate Issue Validation.");
      return;
    }
    setIsIssuePlanningActionPending(true);
    setIssuePlanningActionError("");
    setIssuePlanningActionFeedback("");
    try {
      const result = await window.champcity.applyIssueValidationDecision(currentIssue.issueId, input);
      setIssueValidationProjection(result.projection);
      applyIssuePostMutationProjection(result.postMutation, { synchronizeStage: true });
      setIssuePlanningActionFeedback(result.message);
    } catch (error) {
      setIssuePlanningActionError(error instanceof Error ? error.message : "Aggregate Issue Validation decision failed.");
      await refreshIssueValidationProjection(currentIssue.issueId);
    } finally {
      setIsIssuePlanningActionPending(false);
    }
  }

  async function refreshIssueCloseProjection(
    issueId = currentIssue?.issueId,
    options: { synchronizeStage?: boolean } = {},
  ): Promise<void> {
    if (!issueId) {
      setIssueCloseProjection(null);
      return;
    }
    setIsIssueCloseLoading(true);
    setIssueCloseActionError("");
    try {
      const projection = await window.champcity.getIssueCloseProjection(issueId);
      setIssueCloseProjection(projection);
      if (options.synchronizeStage) {
        const navigation = await window.champcity.getIssueResolutionNavigationProjection(issueId);
        setIssueNavigationProjection(navigation);
        setActiveIssueStageId(navigation.currentStageId);
      }
    } catch (error) {
      setIssueCloseProjection(null);
      setIssueCloseActionError(error instanceof Error ? error.message : "Issue Close record could not be loaded.");
    } finally {
      setIsIssueCloseLoading(false);
    }
  }

  async function runIssueClose(input: IssueCloseActionInput): Promise<void> {
    if (!currentIssue) {
      setIssueCloseActionError("Select an eligible Issue before closing it.");
      return;
    }
    setIsIssueCloseActionPending(true);
    setIssueCloseActionError("");
    setIssueCloseActionFeedback("");
    try {
      const result = await window.champcity.closeIssue(currentIssue.issueId, input);
      setIssueCloseProjection(result.projection);
      setIssueCloseActionFeedback(result.message);
      const navigation = await window.champcity.getIssueResolutionNavigationProjection(currentIssue.issueId);
      setIssueNavigationProjection(navigation);
      await refreshIssueInventory(currentIssue.issueId);
      returnToWorkflowHub();
    } catch (error) {
      setIssueCloseActionError(error instanceof Error ? error.message : "Issue Close failed.");
      await refreshIssueCloseProjection(currentIssue.issueId);
    } finally {
      setIsIssueCloseActionPending(false);
    }
  }

  async function runIssuePlanningAction(
    action: (issueId: string) => Promise<{ message: string; projection: IssuePlanningProjection }>,
  ): Promise<void> {
    if (!currentIssue) {
      setIssuePlanningActionError("Select an eligible Issue before using Issue Planning.");
      return;
    }
    setIsIssuePlanningActionPending(true);
    setIssuePlanningActionError("");
    setIssuePlanningActionFeedback("");
    try {
      const result = await action(currentIssue.issueId);
      setIssuePlanningProjection(result.projection);
      setIssuePlanningActionFeedback(result.message);
      await refreshIssueResolutionNavigationProjection(currentIssue.issueId);
      if (result.projection.issueResolutionPlanState === "readable" && result.projection.fixCardPlanState === "readable") {
        await refreshIssueInventory(currentIssue.issueId);
      }
    } catch (error) {
      setIssuePlanningActionError(error instanceof Error ? error.message : "Issue Planning action failed.");
      await refreshIssuePlanningProjection(currentIssue.issueId);
    } finally {
      setIsIssuePlanningActionPending(false);
    }
  }

  async function runIssuePlanningReview(input: IssueArchitectReviewInput): Promise<void> {
    if (!currentIssue) {
      setIssuePlanningActionError("Select an eligible Issue before applying Issue Planning review.");
      return;
    }
    setIsIssuePlanningActionPending(true);
    setIssuePlanningActionError("");
    setIssuePlanningActionFeedback("");
    try {
      const result = await window.champcity.applyIssuePlanningReview(currentIssue.issueId, input);
      setIssuePlanningProjection(result.projection);
      applyIssuePostMutationProjection(result.postMutation);
      setIssuePlanningActionFeedback(result.message);
    } catch (error) {
      setIssuePlanningActionError(error instanceof Error ? error.message : "Issue Planning review failed.");
      await refreshIssuePlanningProjection(currentIssue.issueId);
    } finally {
      setIsIssuePlanningActionPending(false);
    }
  }

  async function refreshIssueFixCardProjection(
    issueId = currentIssue?.issueId,
    currentStep = activeIssueFixCardStepId,
    options: { quiet?: boolean } = {},
  ): Promise<void> {
    if (!issueId) {
      setIssueFixCardProjection(null);
      return;
    }
    if (options.quiet && issueFixCardProjectionRefreshInFlightRef.current !== null) {
      return;
    }
    const requestId = issueFixCardProjectionRefreshRequestRef.current + 1;
    issueFixCardProjectionRefreshRequestRef.current = requestId;
    issueFixCardProjectionRefreshInFlightRef.current = requestId;
    let resolveCompletion!: () => void;
    const completion = new Promise<void>((resolve) => {
      resolveCompletion = resolve;
    });
    issueFixCardProjectionRefreshCompletionRef.current = completion;
    if (!options.quiet) {
      setIssuePlanningActionError("");
    }
    try {
      const projection = await window.champcity.getIssueFixCardProjection(issueId, currentStep);
      if (requestId !== issueFixCardProjectionRefreshRequestRef.current) {
        return;
      }
      setIssueFixCardProjection(projection);
      setActiveIssueFixCardStepId((current) =>
        current === projection.currentStep ? current : projection.currentStep,
      );
    } catch (error) {
      if (requestId !== issueFixCardProjectionRefreshRequestRef.current) {
        return;
      }
      setIssueFixCardProjection(null);
      if (!options.quiet) {
        setIssuePlanningActionError(error instanceof Error ? error.message : "Issue Fix Card state could not be loaded.");
      }
    } finally {
      if (issueFixCardProjectionRefreshInFlightRef.current === requestId) {
        issueFixCardProjectionRefreshInFlightRef.current = null;
      }
      if (issueFixCardProjectionRefreshCompletionRef.current === completion) {
        issueFixCardProjectionRefreshCompletionRef.current = null;
      }
      resolveCompletion();
    }
  }

  async function selectIssueFixCardCandidate(fixCardId: string): Promise<void> {
    if (!currentIssue) {
      setIssuePlanningActionError("Select an Issue before selecting a Fix Card candidate.");
      return;
    }
    setIsIssuePlanningActionPending(true);
    setIssuePlanningActionError("");
    setIssuePlanningActionFeedback("");
    try {
      const result = await window.champcity.selectIssueFixCardCandidate(
        currentIssue.issueId,
        fixCardId,
        "fix-card-map",
      );
      setActiveIssueFixCardStepId(result.projection.currentStep);
      setIssueFixCardProjection(result.projection);
      setIssuePlanningActionFeedback(result.message);
      await refreshIssueResolutionNavigationProjection(currentIssue.issueId);
    } catch (error) {
      setIssuePlanningActionError(error instanceof Error ? error.message : "Fix Card candidate selection failed.");
      await refreshIssueFixCardProjection(currentIssue.issueId, activeIssueFixCardStepId);
    } finally {
      setIsIssuePlanningActionPending(false);
    }
  }

  function openIssueFixCardStep(stepId: IssueFixCardLoopStepId): void {
    const availability = issueFixCardProjection?.stepAvailability.find((step) => step.stepId === stepId);
    const available = availability?.available ?? stepId === "fix-card-map";
    if (!available) {
      setIssuePlanningActionError(availability?.reason ?? "That Fix Card step is unavailable for the current Issue.");
      return;
    }
    setActiveIssueFixCardStepId(stepId);
    void refreshIssueFixCardProjection(currentIssue?.issueId, stepId);
  }

  async function runIssueFixCardAction(
    action: (issueId: string, currentStep?: IssueFixCardLoopStepId) => Promise<{ message: string; projection: IssueFixCardProjection }>,
  ): Promise<void> {
    if (!currentIssue) {
      setIssuePlanningActionError("Select an Issue before using Fix Cards.");
      return;
    }
    setIsIssuePlanningActionPending(true);
    setIssuePlanningActionError("");
    setIssuePlanningActionFeedback("");
    try {
      const result = await action(currentIssue.issueId, activeIssueFixCardStepId);
      setIssueFixCardProjection(result.projection);
      setIssuePlanningActionFeedback(result.message);
      await refreshIssueResolutionNavigationProjection(currentIssue.issueId);
    } catch (error) {
      setIssuePlanningActionError(error instanceof Error ? error.message : "Issue Fix Card action failed.");
      await refreshIssueFixCardProjection(currentIssue.issueId, activeIssueFixCardStepId);
    } finally {
      setIsIssuePlanningActionPending(false);
    }
  }

  async function runIssueFixCardContractReview(input: IssueArchitectReviewInput): Promise<void> {
    if (!currentIssue) {
      setIssuePlanningActionError("Select an Issue before applying Fix Card review.");
      return;
    }
    setIsIssuePlanningActionPending(true);
    setIssuePlanningActionError("");
    setIssuePlanningActionFeedback("");
    try {
      const nextStep = input.disposition === "Approved" ? "implement" : activeIssueFixCardStepId;
      const result = await window.champcity.applyIssueFixCardContractReview(
        currentIssue.issueId,
        input,
        nextStep,
      );
      setActiveIssueFixCardStepId(result.projection.currentStep);
      setIssueFixCardProjection(result.projection);
      applyIssuePostMutationProjection(result.postMutation);
      setIssuePlanningActionFeedback(result.message);
    } catch (error) {
      setIssuePlanningActionError(error instanceof Error ? error.message : "Fix Card contract review failed.");
      await refreshIssueFixCardProjection(currentIssue.issueId, activeIssueFixCardStepId);
    } finally {
      setIsIssuePlanningActionPending(false);
    }
  }

  async function runIssueFixCardValidationDecision(input: IssueFixCardValidationDecisionInput): Promise<void> {
    if (!currentIssue) {
      setIssuePlanningActionError("Select an Issue before applying Fix Card validation.");
      return;
    }
    setIsIssuePlanningActionPending(true);
    setIssuePlanningActionError("");
    setIssuePlanningActionFeedback("");
    try {
      const nextStep: IssueFixCardLoopStepId = input.decision === "RequestRepair" ? "repair" : "close-next";
      const result = await window.champcity.applyIssueFixCardValidationDecision(currentIssue.issueId, input, nextStep);
      setActiveIssueFixCardStepId(result.projection.currentStep);
      setIssueFixCardProjection(result.projection);
      applyIssuePostMutationProjection(result.postMutation);
      setIssuePlanningActionFeedback(result.message);
    } catch (error) {
      setIssuePlanningActionError(error instanceof Error ? error.message : "Fix Card validation decision failed.");
      await refreshIssueFixCardProjection(currentIssue.issueId, activeIssueFixCardStepId);
    } finally {
      setIsIssuePlanningActionPending(false);
    }
  }

  async function runIssueFixCardClose(): Promise<void> {
    if (!currentIssue) {
      setIssuePlanningActionError("Select an Issue before closing a Fix Card.");
      return;
    }
    setIsIssuePlanningActionPending(true);
    setIssuePlanningActionError("");
    setIssuePlanningActionFeedback("");
    try {
      const result = await window.champcity.closeIssueFixCard(currentIssue.issueId, "close-next");
      setActiveIssueFixCardStepId(result.projection.currentStep);
      setIssueFixCardProjection(result.projection);
      applyIssuePostMutationProjection(result.postMutation, { synchronizeStage: true });
      setIssuePlanningActionFeedback(result.message);
    } catch (error) {
      setIssuePlanningActionError(error instanceof Error ? error.message : "Fix Card close failed.");
      await refreshIssueFixCardProjection(currentIssue.issueId, activeIssueFixCardStepId);
    } finally {
      setIsIssuePlanningActionPending(false);
    }
  }

  async function startIssueCodexImplementerExecution(selection: CodexModelSelection): Promise<void> {
    const selectedFixCardId = issueFixCardProjection?.selectedCandidate?.fixCardId;
    const currentImplementationId = issueFixCardProjection?.currentImplementationId;
    if (!currentIssue || !selectedFixCardId || !currentImplementationId) {
      setIssuePlanningActionError("Select an approved Fix Card before running Codex.");
      return;
    }
    setIsCodexExecutionActionRunning(true);
    setIssuePlanningActionError("");
    setIssuePlanningActionFeedback("");
    try {
      const status = await window.champcity.startIssueCodexImplementerExecution(
        currentIssue.issueId,
        selectedFixCardId,
        currentImplementationId,
        selection,
      );
      const contextKey = issueCodexExecutionContextKey(currentIssue.issueId, currentImplementationId);
      dispatchCodexExecutionPresentation({ type: "set-issue", contextKey, status });
      issueCodexExecutionPreviousStateRef.current = status.state;
      setIssuePlanningActionFeedback(status.failureReason ?? "Codex Implementer started for the selected Fix Card.");
    } catch (error) {
      setIssuePlanningActionError(error instanceof Error ? error.message : "Codex Implementer could not start.");
    } finally {
      setIsCodexExecutionActionRunning(false);
    }
  }

  async function startIssueCodexEnvironmentResolution(): Promise<void> {
    const selectedFixCardId = issueFixCardProjection?.selectedCandidate?.fixCardId;
    const currentImplementationId = issueFixCardProjection?.currentImplementationId;
    if (!currentIssue || !selectedFixCardId || !currentImplementationId) {
      setIssuePlanningActionError("Select an approved Fix Card before resolving its environment.");
      return;
    }
    setIsCodexExecutionActionRunning(true);
    setIssuePlanningActionError("");
    setIssuePlanningActionFeedback("");
    try {
      const status = await window.champcity.startIssueCodexEnvironmentResolution(
        currentIssue.issueId,
        selectedFixCardId,
        currentImplementationId,
      );
      const contextKey = issueCodexExecutionContextKey(currentIssue.issueId, currentImplementationId);
      dispatchCodexExecutionPresentation({ type: "set-issue", contextKey, status });
      issueCodexExecutionPreviousStateRef.current = status.state;
      setIssuePlanningActionFeedback(status.failureReason ?? "Environment Resolution started for the selected Fix Card.");
    } catch (error) {
      setIssuePlanningActionError(error instanceof Error ? error.message : "Environment Resolution could not start.");
    } finally {
      setIsCodexExecutionActionRunning(false);
    }
  }

  async function refreshAgentHarnessStatus(): Promise<AgentHarnessStatus | null> {
    const lifecycle = await refreshAgentHarnessServiceHostLifecycleStatus();
    if (lifecycle?.explicitlyStopped) {
      setAgentHarnessStatus(null);
      return null;
    }
    void refreshAgentHarnessWorkspaceRegistry();
    try {
      const status = await window.champcity.getAgentHarnessStatus();
      setAgentHarnessStatus(status);
      return status;
    } catch (error) {
      setAgentHarnessStatus(null);
      setAgentHarnessActionError(error instanceof Error ? error.message : "Agent Harness status could not be loaded.");
      return null;
    }
  }

  async function refreshAgentHarnessWorkspaceRegistry(): Promise<AgentHarnessWorkspaceRegistrySnapshot | null> {
    try {
      const registry = await window.champcity.listAgentHarnessRegisteredWorkspaces();
      setAgentHarnessWorkspaceRegistry(registry);
      return registry;
    } catch (error) {
      setAgentHarnessWorkspaceRegistry(null);
      setAgentHarnessActionError(
        error instanceof Error ? error.message : "Registered MCP projects could not be loaded.",
      );
      return null;
    }
  }

  async function addAgentHarnessWorkspace(): Promise<void> {
    setAgentHarnessActionPending("registerWorkspace");
    setAgentHarnessActionFeedback("");
    setAgentHarnessActionError("");
    try {
      const result = await window.champcity.chooseAndRegisterAgentHarnessWorkspace();
      setAgentHarnessWorkspaceRegistry(result.registry);
      if (result.canceled) {
        setAgentHarnessActionFeedback("MCP project registration canceled.");
      } else {
        setAgentHarnessActionFeedback(`Registered MCP project ${result.workspace.workspaceId}.`);
      }
      await refreshAgentHarnessStatus();
    } catch (error) {
      setAgentHarnessActionError(error instanceof Error ? error.message : "MCP project registration failed.");
      await refreshAgentHarnessWorkspaceRegistry();
    } finally {
      setAgentHarnessActionPending(null);
    }
  }

  async function removeAgentHarnessWorkspace(workspaceId: string): Promise<void> {
    setAgentHarnessActionPending("unregisterWorkspace");
    setAgentHarnessActionFeedback("");
    setAgentHarnessActionError("");
    try {
      const registry = await window.champcity.unregisterAgentHarnessWorkspace(workspaceId);
      setAgentHarnessWorkspaceRegistry(registry);
      setAgentHarnessActionFeedback(`Unregistered MCP project ${workspaceId}.`);
      await refreshAgentHarnessStatus();
    } catch (error) {
      setAgentHarnessActionError(error instanceof Error ? error.message : "MCP project removal failed.");
      await refreshAgentHarnessWorkspaceRegistry();
    } finally {
      setAgentHarnessActionPending(null);
    }
  }

  async function preflightMcpHandoff(): Promise<boolean> {
    const status = await refreshAgentHarnessServiceHostLifecycleStatus();
    if (!status || status.restartRequired || status.explicitlyStopped) {
      setAgentHarnessActionError(status?.explicitlyStopped
        ? "Background Agent is stopped by user request. Start Background Agent before preparing or copying this MCP-dependent handoff. Your workflow draft is preserved."
        : status?.restartRequired
        ? "Restart Background Agent before preparing or copying this MCP-dependent handoff. Your workflow draft is preserved."
        : "Background Agent status could not be confirmed. Retry the handoff to refresh status.");
      return false;
    }
    setAgentHarnessActionError("");
    return true;
  }

  async function runMcpHandoff(action: () => Promise<unknown>): Promise<void> {
    if (!(await preflightMcpHandoff())) return;
    await action();
  }

  async function refreshAgentHarnessServiceHostLifecycleStatus(): Promise<AgentHarnessServiceHostLifecycleStatus | null> {
    try {
      const status = await window.champcity.getAgentHarnessServiceHostLifecycleStatus();
      setAgentHarnessServiceHostLifecycleStatus(status);
      return status;
    } catch (error) {
      // Retain the last current lifecycle projection on refresh failure.
      setAgentHarnessActionError(
        error instanceof Error ? error.message : "Background Agent lifecycle status could not be loaded.",
      );
      return null;
    }
  }

  async function runAgentHarnessLifecycleAction(
    action: "start" | "stop" | "restart",
  ): Promise<void> {
    setAgentHarnessActionPending(action);
    setAgentHarnessActionFeedback("");
    setAgentHarnessActionError("");
    try {
      const status = action === "start"
        ? await window.champcity.startAgentHarness()
        : action === "stop"
        ? await window.champcity.stopAgentHarness()
        : await window.champcity.restartAgentHarness();
      setAgentHarnessStatus(status);
      setAgentHarnessActionFeedback(`Agent Harness ${action} completed: ${status.state}.`);
      await refreshAgentHarnessServiceHostLifecycleStatus();
    } catch (error) {
      setAgentHarnessActionError(error instanceof Error ? error.message : `Agent Harness ${action} failed.`);
      await refreshAgentHarnessStatus();
    } finally {
      setAgentHarnessActionPending(null);
    }
  }

  async function saveAgentHarnessServiceHostLifecycleSettings(
    settings: AgentHarnessServiceHostLifecycleSettingsInput,
  ): Promise<void> {
    setAgentHarnessServiceHostSettingsPending(true);
    setAgentHarnessActionFeedback("");
    setAgentHarnessActionError("");
    try {
      const status = await window.champcity.saveAgentHarnessServiceHostLifecycleSettings(settings);
      setAgentHarnessServiceHostLifecycleStatus(status);
      setAgentHarnessActionFeedback(
        `Background Agent Windows sign-in launch ${status.launchAtLogin ? "enabled" : "disabled"}.`,
      );
    } catch (error) {
      setAgentHarnessActionError(
        error instanceof Error ? error.message : "Background Agent lifecycle settings could not be saved.",
      );
      await refreshAgentHarnessServiceHostLifecycleStatus();
    } finally {
      setAgentHarnessServiceHostSettingsPending(false);
    }
  }

  async function restartAgentHarnessServiceHost(): Promise<void> {
    setAgentHarnessActionPending("restartServiceHost");
    setAgentHarnessActionFeedback("");
    setAgentHarnessActionError("");
    try {
      const lifecycle = await window.champcity.restartAgentHarnessServiceHost();
      setAgentHarnessServiceHostLifecycleStatus(lifecycle);
      setAgentHarnessActionFeedback("Background Agent restarted and confirmed the expected build generation.");
      await refreshAgentHarnessStatus();
    } catch (error) {
      setAgentHarnessActionError(
        error instanceof Error ? error.message : "Background Agent controlled restart failed.",
      );
      await refreshAgentHarnessServiceHostLifecycleStatus();
    } finally {
      setAgentHarnessActionPending(null);
    }
  }

  async function startBackgroundAgent(): Promise<void> {
    setAgentHarnessActionPending("startBackgroundAgent");
    setAgentHarnessActionFeedback("");
    setAgentHarnessActionError("");
    try {
      const lifecycle = await window.champcity.startBackgroundAgent();
      setAgentHarnessServiceHostLifecycleStatus(lifecycle);
      setAgentHarnessActionFeedback("Background Agent started.");
      await refreshAgentHarnessStatus();
    } catch (error) {
      setAgentHarnessActionError(error instanceof Error ? error.message : "Background Agent could not be started.");
      await refreshAgentHarnessServiceHostLifecycleStatus();
    } finally {
      setAgentHarnessActionPending(null);
    }
  }

  async function exitBackgroundAgent(): Promise<void> {
    setAgentHarnessActionPending("exitBackgroundAgent");
    setAgentHarnessActionFeedback("");
    setAgentHarnessActionError("");
    try {
      const lifecycle = await window.champcity.exitBackgroundAgent();
      setAgentHarnessServiceHostLifecycleStatus(lifecycle);
      setAgentHarnessStatus(null);
      setAgentHarnessActionFeedback("Background Agent exited and will remain stopped for this login session.");
    } catch (error) {
      setAgentHarnessActionError(error instanceof Error ? error.message : "Background Agent could not be exited safely.");
      await refreshAgentHarnessServiceHostLifecycleStatus();
    } finally {
      setAgentHarnessActionPending(null);
    }
  }

  async function saveAgentHarnessSettings(settings: AgentHarnessSettingsInput): Promise<void> {
    setAgentHarnessSettingsPending(true);
    setAgentHarnessActionFeedback("");
    setAgentHarnessActionError("");
    try {
      const status = await window.champcity.saveAgentHarnessSettings(settings);
      setAgentHarnessStatus(status);
      setAgentHarnessActionFeedback(`Agent Harness settings saved: ${status.state}.`);
    } catch (error) {
      setAgentHarnessActionError(error instanceof Error ? error.message : "Agent Harness settings could not be saved.");
      await refreshAgentHarnessStatus();
    } finally {
      setAgentHarnessSettingsPending(false);
    }
  }

  async function importLegacyOAuthClients(): Promise<void> {
    setAgentHarnessActionPending("importLegacyOAuthClients");
    setAgentHarnessActionFeedback("");
    setAgentHarnessActionError("");
    try {
      const result = await window.champcity.importLegacyOAuthClients();
      if (result.canceled) {
        setAgentHarnessActionFeedback("Legacy OAuth client import canceled.");
        return;
      }
      setAgentHarnessActionFeedback(
        `Legacy OAuth clients imported: ${result.importedCount} new, ${result.alreadyPresentCount} already present.`,
      );
      await refreshAgentHarnessStatus();
    } catch (error) {
      setAgentHarnessActionError(error instanceof Error ? error.message : "Legacy OAuth client import failed.");
      await refreshAgentHarnessStatus();
    } finally {
      setAgentHarnessActionPending(null);
    }
  }

  function selectResolverResult(
    result: FirstNonApprovedResult,
    options: {
      currentModel?: CurrentWorkspaceModel | null;
      documents?: PlanningDocumentSummary[];
    } = {},
  ): void {
    setResolverResult(result);
    const destinationWorkspaceId =
      options.currentModel?.activeWorkspaceId ?? destinationWorkspaceIdFromResolver(result);
    transitionToWorkflowStep(destinationWorkspaceId, {
      documents: options.documents,
      preferredDocumentId: preferredDocumentIdFromResolver(result, destinationWorkspaceId),
      resolverResult: result,
    });

    if (!options.currentModel) {
      void refreshCurrentModel();
    }
  }

  async function loadDocument(
    logicalDocumentId: string,
    options: {
      architectOutputModelForViewedRevision?: ArchitectOutputWorkspaceModel | null;
      preserveOnFailure?: boolean;
    } = {},
  ): Promise<void> {
    setDocumentError("");
    setFeedback("");
    try {
      const detail = await window.champcity.readDocument(logicalDocumentId);
      setSelectedDocument(detail);
      setSelectedStatus(
        detail.effectiveDisposition === "Pending" ? "" : detail.effectiveDisposition,
      );
      if (isArchitectEnabledWorkspace(activeWorkspaceId)) {
        setViewedArchitectOutputRevisionKeys((current) =>
          markSingleDisplayedArchitectOutputRevisionViewed(
            options.architectOutputModelForViewedRevision ?? architectOutputModel,
            detail,
            current,
          ),
        );
      }
      if (detail.readError) {
        setDocumentError("Document could not be read as canonical Markdown.");
      } else if (detail.readError) {
        setDocumentError(detail.readError);
      }
    } catch (error) {
      if (!options.preserveOnFailure) {
        setSelectedDocument(null);
      }
      setDocumentError(error instanceof Error ? error.message : "Document could not be loaded.");
    }
  }

  async function applyDisposition(): Promise<void> {
    if (!selectedDocumentId || !selectedStatus || selectedDocumentHasLocalError) {
      return;
    }

    setIsApplying(true);
    setDocumentError("");
    setFeedback("");
    try {
      const result = await window.champcity.setDocumentDisposition(selectedDocumentId, selectedStatus);
      const { resolverResult: nextResolverResult } = result.development;
      applyDevelopmentPostMutationProjection(result.development);
      if (
        selectedStatus === "Approved" &&
        nextResolverResult.status === "current" &&
        activeWorkspaceId !== "project-intake-capture"
      ) {
        setFeedback(getResolverFeedback(nextResolverResult));
      } else if (selectedStatus === "Approved" && nextResolverResult.status === "all-approved") {
        setFeedback(nextResolverResult.message);
      } else {
        setFeedback(getResolverFeedback(nextResolverResult));
      }
    } catch (error) {
      setDocumentError(error instanceof Error ? error.message : "Disposition could not be applied.");
    } finally {
      setIsApplying(false);
    }
  }

  function renderDispositionControls(className: string): JSX.Element {
    return (
      <div className={className}>
        <label>
          <span>Disposition</span>
          <select
            disabled={!selectedDocument || selectedDocumentHasLocalError}
            onChange={(event) =>
              setSelectedStatus(event.target.value as DocumentDispositionStatus | "")
            }
            value={selectedStatus}
          >
            <option value="">Select disposition</option>
            {dispositionOptions.map((option) => (
              <option key={option.status} value={option.status}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button
          className="apply-button"
          disabled={
            !selectedDocument ||
            !selectedStatus ||
            selectedDocumentHasLocalError ||
            isApplying
          }
          onClick={applyDisposition}
          type="button"
        >
          Apply Disposition
        </button>
      </div>
    );
  }

  const activeLifecycleStatus =
    currentModel?.railStatus ??
    projectRailStatuses[activeWorkspaceId as keyof typeof projectRailStatuses] ??
    "Pending";
  const embeddedBrowserAvailable =
    architectBrowserWorkspaceAvailable || isWorkCardRepair;
  const isFigmaActionWorkspace =
    activeWorkspaceId !== "project-intake-capture" &&
    !isSettingsWorkspace &&
    !isWorkCardPlanningPreparation &&
    !isWorkCardBuildingReview &&
    !isWorkCardReportReview &&
    !isVisibleArchitectOutputWorkspace &&
    !isWorkCardRepair &&
    !isWorkCardClose &&
    !isWorkCardMap;
  const usesFigmaWorkspaceBody =
    isWorkflowHubForeground ||
    activeWorkspaceId === "project-intake-capture" ||
    isVisibleArchitectOutputWorkspace ||
    isWorkCardBuildingReview ||
    isWorkCardReportReview ||
    isWorkCardRepair ||
    isWorkCardClose ||
    isWorkCardMap ||
    isSettingsWorkspace ||
    isFigmaActionWorkspace;
  const currentArchitectRevisionKeys = architectOutputModel?.documentSlots
    .map((slot) => revisionKeyForArchitectOutputSlot(slot))
    .filter((key): key is string => Boolean(key)) ?? [];
  const allCurrentArchitectRevisionsViewed =
    currentArchitectRevisionKeys.length > 0 &&
    currentArchitectRevisionKeys.every((key) => viewedArchitectOutputRevisionKeys.includes(key));
  const canApplyArchitectReview =
    Boolean(architectOutputModel?.canApplyDisposition) &&
    Boolean(architectOutputReviewStatus) &&
    allCurrentArchitectRevisionsViewed &&
    (architectOutputReviewStatus !== "RevisionRequested" || Boolean(architectOutputReviewNotes.trim()));
  const workspaceHeadingLabel =
    isSettingsWorkspace
      ? "Settings"
      : activeWorkspaceId === "project-intake-capture"
      ? "Project Intake Questionnaire"
      : activeWorkspace.label;
  const workCardRepairProjection = workCardRepairProjectionFromResult(workCardRepairProjectionResult);
  const workCardReviewProjection = currentModel?.workCardBuildingReview;
  const canCopyWorkCardAdvisoryPrompt =
    isWorkCardReportReview &&
    Boolean(workCardReviewProjection?.report) &&
    workCardReviewProjection?.reportReadiness === "ready-for-review" &&
    workCardReviewProjection?.reportDocumentReadState === "readable" &&
    workCardReviewProjection?.reportFreshnessState === "fresh" &&
    !workCardReviewProjection?.reportReadError &&
    !isApplying;

  async function copySelectedDocumentBody(): Promise<void> {
    if (!selectedDocument) {
      return;
    }
    try {
      await window.navigator.clipboard.writeText(selectedDocument.bodyMarkdown ?? selectedDocument.preview ?? "");
      setFeedback("Selected document content copied.");
    } catch {
      setDocumentError("Selected document content could not be copied.");
    }
  }

  const architectOutputPrepareHandoffLabel =
    activeWorkspaceId === "architect-interview"
      ? "Prepare ChatGPT Handoff"
      : activeWorkspaceId === "phase-interview"
      ? "Prepare Phase Interview Handoff"
      : activeWorkspaceId === "project-planning-review"
      ? "Prepare Project Planning Handoff"
      : activeWorkspaceId === "project-phase-map"
      ? "Prepare Phase Map Handoff"
      : "Prepare Handoff";
  const architectOutputCopyHandoffLabel =
    activeWorkspaceId === "architect-interview"
      ? "Copy ChatGPT Handoff"
      : activeWorkspaceId === "phase-interview"
      ? "Copy Phase Interview Handoff"
      : activeWorkspaceId === "project-planning-review"
      ? "Copy Project Planning Handoff"
      : activeWorkspaceId === "project-phase-map"
      ? "Copy Phase Map Handoff"
      : "Copy Handoff";
  const architectBrowserColumn = isArchitectPaneVisible ? (
    <div className="figma-browser-column">
      <FigmaBrowserPanel
        hostRef={architectHostRef}
        onReload={() => void reloadArchitectBrowser()}
        onRetry={() => void retryArchitectBrowser()}
        retryVisible={shouldShowArchitectBrowserRetry(architectStatus, architectAttachmentError)}
        statusLabel={architectBrowserPresentation(architectStatus).label}
      />
      <FigmaBrowserActionsPanel
        actionFeedback={architectActionFeedback}
        attachmentError={architectAttachmentError}
        browserStatus={architectStatus}
        copyHandoffLabel={architectOutputCopyHandoffLabel}
        model={architectOutputModel}
        onCopyHandoff={copyArchitectHandoff}
        onCopyFinalDraftHandoff={
          activeWorkspaceId === "architect-interview"
            ? copyArchitectInterviewFinalDraftHandoff
            : activeWorkspaceId === "phase-interview"
            ? copyPhaseInterviewFinalDraftHandoff
            : undefined
        }
        onPrepareFinalDraftHandoff={
          activeWorkspaceId === "architect-interview"
            ? prepareArchitectInterviewFinalDraftFromAction
            : activeWorkspaceId === "phase-interview"
            ? preparePhaseInterviewFinalDraftFromAction
            : undefined
        }
        onPrepareHandoff={prepareArchitectOutputFromAction}
        onRegeneratePrompt={regenerateArchitectInterviewPromptFromAction}
        onRefresh={() => {
          void refreshArchitectStatus();
          void refreshArchitectOutputWorkspace({ force: true });
        }}
        onReloadBrowser={() => void reloadArchitectBrowser()}
        onRetryBrowser={() => void retryArchitectBrowser()}
        pollingError={architectOutputPollingError}
        prepareHandoffLabel={architectOutputPrepareHandoffLabel}
      />
    </div>
  ) : null;

  return (
    <div className={`app-root ${themeMode === "dark" ? "dark" : ""}`}>
      <FigmaAppStrip />
      {isDevelopmentForeground ? (
        <NestedWorkflowRail
          activeWorkspaceId={activeWorkspaceId}
          architectInterviewStatus={architectInterviewRailStatus}
          executionContext={currentModel?.executionContext}
          onWorkspaceChange={(workspaceId) => {
            if (workspaceId === "phase-validation") {
              void openPhaseValidation();
              return;
            }
            transitionToWorkflowStep(workspaceId);
          }}
          projectRailStatuses={projectRailStatuses}
          projectIntakeStatus={projectIntakeRailStatus}
          requiredWorkspaceId={currentModel?.activeWorkspaceId ?? null}
          workspaceCounts={workspaceCounts}
        />
      ) : null}
      {isIssueResolutionForeground ? (
        <IssueResolutionRail
          activeStageId={activeIssueStageId}
          currentIssue={currentIssue}
          activeFixCardStepId={activeIssueFixCardStepId}
          fixCardProjection={issueFixCardProjection}
          fixCardsAvailable={fixCardsAvailable}
          issuePlanningAvailable={issuePlanningAvailable}
          navigationProjection={issueNavigationProjection}
          onFixCardStepChange={openIssueFixCardStep}
          onStageChange={setActiveIssueStageId}
        />
      ) : null}

      <div className={isLandingForeground ? "app-body landing-app-body" : "app-body"}>
          {!isSettingsWorkspace && (agentHarnessServiceHostLifecycleStatus?.restartRequired || agentHarnessActionError) ? (
            <div className="service-host-shell-notice">
              <ServiceHostRemediation
                lifecycleStatus={agentHarnessServiceHostLifecycleStatus}
                isBusy={agentHarnessActionPending !== null}
                onRestartServiceHost={() => void restartAgentHarnessServiceHost()}
              />
              {agentHarnessActionError ? (
                <div className="agent-harness-message error" role="status">{agentHarnessActionError}</div>
              ) : null}
            </div>
          ) : null}
        {!isLandingForeground ? (
          <FigmaSidebar
            activeWorkspaceId={activeWorkspaceId}
            currentModel={currentModel}
            currentIssue={currentIssue}
            issueInventory={issueInventory}
            issueWorkflowStatus={issueWorkflowStatus}
            isChoosing={isChoosing}
            mode={
              isDevelopmentForeground
                ? "development"
                : isIssueResolutionForeground
                ? "issue-resolution"
                : "hub"
            }
            onChooseProject={chooseWorkspace}
            onClearProject={clearWorkspace}
            onBrowseIssues={isIssueResolutionForeground ? browseIssuesFromSidebar : undefined}
            onIssueSelect={isIssueResolutionForeground ? (issueId) => void selectIssueFromSidebar(issueId) : undefined}
            onOpenSettings={openSettingsWorkspace}
            onReturnToWorkflowHub={returnToWorkflowHub}
            onThemeChange={setThemeMode}
            projectName={projectDisplayName(workspace)}
            themeMode={themeMode}
            workspace={workspace}
          />
        ) : null}

        <section
          className={[
            "workspace-surface",
            isLandingForeground ? "landing-surface" : "",
            !isLandingForeground && usesFigmaWorkspaceBody ? "figma-workspace-surface" : "",
            isWorkflowHubForeground ? "workflow-hub-surface" : "",
            isIssueResolutionForeground ? "issue-resolution-surface" : "",
            isSettingsWorkspace ? "settings-workspace-surface" : "",
            isVisibleArchitectOutputWorkspace ? "architect-interview-surface" : "",
            isWorkCardReportReview ? "review-validation-surface" : "",
          ].filter(Boolean).join(" ")}
          aria-labelledby="workspace-heading"
          ref={workspaceSurfaceRef}
        >
          {isLandingForeground ? (
            <LandingWorkspace
              feedback={documentError}
              isChoosing={isChoosing}
              onOpenExistingProject={() => void openExistingProjectFromLanding()}
              onStartNewProject={() => void startNewProjectFromLanding()}
            />
          ) : isWorkIntakeForeground && workIntakeProjection ? (
            <WorkIntakeWorkspace
              key={workspace.workspaceRoot}
              projection={workIntakeProjection}
              onReturn={returnToWorkflowHub}
              onRefresh={async () => setWorkIntakeProjection(await window.champcity.getWorkIntakeProjection())}
            />
          ) : isWorkflowHubForeground ? (
            <>
              {issueCloseActionFeedback ? (
                <div className="document-feedback issue-close-hub-feedback" role="status">
                  {issueCloseActionFeedback}
                </div>
              ) : null}
              <WorkflowHubWorkspace
                isEnteringDevelopment={isLoadingDocuments && activeWorkflowId === "development"}
                onOpenWorkflow={(workflowId) => void openWorkflow(workflowId)}
                projectName={projectDisplayName(workspace)}
                workspace={workspace}
              />
              {workspace.ok ? <button type="button" onClick={() => void openWorkIntake()}>Capture Work Intake</button> : null}
              {documentError ? <p role="alert">{documentError}</p> : null}
            </>
          ) : isIssueResolutionForeground && activeIssueStageId === "intake" ? (
            <IssueResolutionWorkspace
              currentIssue={currentIssue}
              error={issueInventoryError}
              inventory={issueInventory}
              isCreating={isIssueCreating}
              isLoading={isIssueInventoryLoading}
              onCreateIssue={createIssue}
              onRefresh={() => void refreshIssueInventory()}
              onSelectIssue={setSelectedIssueId}
              projectName={projectDisplayName(workspace)}
            />
          ) : isIssueResolutionForeground && activeIssueStageId === "architect-planning" ? (
            <IssueArchitectPlanningWorkspace
              actionError={issueArchitectActionError}
              actionFeedback={issueArchitectActionFeedback}
              browserPanel={
                <FigmaBrowserPanel
                  hostRef={architectHostRef}
                  onReload={() => void reloadArchitectBrowser()}
                  onRetry={() => void retryArchitectBrowser()}
                  retryVisible={shouldShowArchitectBrowserRetry(architectStatus, architectAttachmentError)}
                  statusLabel={architectBrowserPresentation(architectStatus).label}
                />
              }
              currentIssue={currentIssue}
              isActionPending={isIssueArchitectActionPending}
              onApplyReview={runIssueArchitectReview}
              onCopyHandoff={() => void runMcpHandoff(() => runIssueArchitectAction(window.champcity.copyIssueArchitectPlanningHandoff))}
              onPrepareHandoff={() => void runMcpHandoff(() => runIssueArchitectAction(window.champcity.prepareIssueArchitectPlanningHandoff))}
              onRefresh={() => {
                void refreshIssueInventory();
                void refreshIssueArchitectPlanningProjection(currentIssue?.issueId);
                void refreshArchitectStatus();
              }}
              onReloadBrowser={() => void reloadArchitectBrowser()}
              projection={issueArchitectProjection}
              projectName={projectDisplayName(workspace)}
            />
          ) : isIssueResolutionForeground && activeIssueStageId === "issue-planning" ? (
            <IssuePlanningWorkspace
              actionError={issuePlanningActionError}
              actionFeedback={issuePlanningActionFeedback}
              browserPanel={
                <FigmaBrowserPanel
                  hostRef={architectHostRef}
                  onReload={() => void reloadArchitectBrowser()}
                  onRetry={() => void retryArchitectBrowser()}
                  retryVisible={shouldShowArchitectBrowserRetry(architectStatus, architectAttachmentError)}
                  statusLabel={architectBrowserPresentation(architectStatus).label}
                />
              }
              currentIssue={currentIssue}
              isActionPending={isIssuePlanningActionPending}
              onApplyReview={runIssuePlanningReview}
              onCopyHandoff={() => void runMcpHandoff(() => runIssuePlanningAction(window.champcity.copyIssuePlanningHandoff))}
              onPrepareHandoff={() => void runMcpHandoff(() => runIssuePlanningAction(window.champcity.prepareIssuePlanningHandoff))}
              onRefresh={() => {
                void refreshIssueInventory();
                void refreshIssuePlanningProjection(currentIssue?.issueId);
                void refreshArchitectStatus();
              }}
              onReloadBrowser={() => void reloadArchitectBrowser()}
              projection={issuePlanningProjection}
              projectName={projectDisplayName(workspace)}
            />
          ) : isIssueResolutionForeground && activeIssueStageId === "fix-cards" && activeIssueFixCardStepId === "fix-card-map" ? (
            <IssueFixCardMapWorkspace
              actionError={issuePlanningActionError}
              actionFeedback={issuePlanningActionFeedback}
              actionPending={isIssuePlanningActionPending}
              currentIssue={currentIssue}
              fixCardProjection={issueFixCardProjection}
              isLoading={issuePlanningProjectionRefreshInFlightRef.current !== null}
              onRefresh={() => {
                void refreshIssueInventory();
                void refreshIssuePlanningProjection(currentIssue?.issueId);
                void refreshIssueResolutionNavigationProjection(currentIssue?.issueId);
                void refreshIssueFixCardProjection(currentIssue?.issueId, activeIssueFixCardStepId);
              }}
              onSelectCandidate={(fixCardId) => void selectIssueFixCardCandidate(fixCardId)}
              projection={issuePlanningProjection}
              projectName={projectDisplayName(workspace)}
            />
          ) : isIssueResolutionForeground && activeIssueStageId === "fix-cards" && activeIssueFixCardStepId === "planning" ? (
            <IssueFixCardPlanningWorkspace
              activeStepLabel={activeIssueFixCardStepLabel}
              agentHarnessStatus={agentHarnessStatus}
              actionError={issuePlanningActionError}
              actionFeedback={issuePlanningActionFeedback}
              actionPending={isIssuePlanningActionPending || isCodexExecutionActionRunning}
              browserPanel={
                <FigmaBrowserPanel
                  hostRef={architectHostRef}
                  onReload={() => void reloadArchitectBrowser()}
                  onRetry={() => void retryArchitectBrowser()}
                  retryVisible={shouldShowArchitectBrowserRetry(architectStatus, architectAttachmentError)}
                  statusLabel={architectBrowserPresentation(architectStatus).label}
                />
              }
              currentIssue={currentIssue}
              fixCardProjection={issueFixCardProjection}
              onApplyContractReview={runIssueFixCardContractReview}
              onCopyPlanningHandoff={() => void runMcpHandoff(() => runIssueFixCardAction(window.champcity.copyIssueFixCardPlanningHandoff))}
              onPreparePlanningHandoff={() => void runMcpHandoff(() => runIssueFixCardAction(window.champcity.prepareIssueFixCardPlanningHandoff))}
              onRefresh={() => {
                void refreshIssueInventory();
                void refreshIssuePlanningProjection(currentIssue?.issueId);
                void refreshIssueFixCardProjection(currentIssue?.issueId, activeIssueFixCardStepId);
                void refreshArchitectStatus();
              }}
              onReloadBrowser={() => void reloadArchitectBrowser()}
              projectName={projectDisplayName(workspace)}
            />
          ) : isIssueResolutionForeground && activeIssueStageId === "fix-cards" && activeIssueFixCardStepId === "implement" ? (
            <section className="issue-fix-card-step-workspace-body" aria-labelledby="workspace-heading">
              <header className="issue-resolution-header">
                <div>
                  <span>Issue Resolution</span>
                  <h1 id="workspace-heading">Fix Card Implement</h1>
                  <p>{`Run the shared Codex Implementer against the selected Issue-owned Fix Card.`}</p>
                </div>
              </header>
              <IssueFixCardContextStrip
                activeStepLabel={activeIssueFixCardStepLabel}
                currentIssue={currentIssue}
                fixCardProjection={issueFixCardProjection}
              />
              <IssueFixCardImplementWorkspace
                actionError={issuePlanningActionError}
                actionFeedback={issuePlanningActionFeedback}
                codexExecution={issueCodexExecution}
                fixCardProjection={issueFixCardProjection}
                isActionPending={isIssuePlanningActionPending || isCodexExecutionActionRunning}
                onCancelCodex={() => void cancelCodexImplementerExecution()}
                onRecoverImplementSetup={() => void runIssueFixCardAction(window.champcity.reserveIssueFixCardImplementerReport)}
                onResolveEnvironment={() => void startIssueCodexEnvironmentResolution()}
                onRespondToCodexMcpElicitation={(requestId, action, content) =>
                  void respondToCodexMcpElicitation(requestId, action, content)}
                onRespondToCodexApproval={(requestId, decision) => void respondToCodexApproval(requestId, decision)}
                onRespondToCodexUserInput={(requestId, answers) => void respondToCodexUserInput(requestId, answers)}
                onRunCodex={(selection) => void startIssueCodexImplementerExecution(selection)}
              />
            </section>
          ) : isIssueResolutionForeground && activeIssueStageId === "fix-cards" && activeIssueFixCardStepId === "review-validation" ? (
            <IssueFixCardReviewValidationWorkspace
              key={`${currentIssue?.issueId ?? "none"}:${issueFixCardProjection?.currentImplementationId ?? "none"}`}
              activeStepLabel={activeIssueFixCardStepLabel}
              actionError={issuePlanningActionError}
              actionFeedback={issuePlanningActionFeedback}
              actionPending={isIssuePlanningActionPending}
              browserPanel={
                <FigmaBrowserPanel
                  hostRef={architectHostRef}
                  onReload={() => void reloadArchitectBrowser()}
                  onRetry={() => void retryArchitectBrowser()}
                  retryVisible={shouldShowArchitectBrowserRetry(architectStatus, architectAttachmentError)}
                  statusLabel={architectBrowserPresentation(architectStatus).label}
                />
              }
              currentIssue={currentIssue}
              fixCardProjection={issueFixCardProjection}
              onApplyDecision={(input) => void runIssueFixCardValidationDecision(input)}
              onCopyAdvisoryPrompt={() => void runIssueFixCardAction(window.champcity.copyIssueFixCardAdvisoryReviewPrompt)}
              onRefresh={() => {
                void refreshIssueInventory();
                void refreshIssuePlanningProjection(currentIssue?.issueId);
                void refreshIssueFixCardProjection(currentIssue?.issueId, activeIssueFixCardStepId);
                void refreshArchitectStatus();
              }}
              onReloadBrowser={() => void reloadArchitectBrowser()}
              projectName={projectDisplayName(workspace)}
            />
          ) : isIssueResolutionForeground && activeIssueStageId === "fix-cards" && activeIssueFixCardStepId === "repair" ? (
            <IssueFixCardRepairWorkspace
              key={`${currentIssue?.issueId ?? "none"}:${issueFixCardProjection?.currentImplementationId ?? "none"}`}
              actionError={issuePlanningActionError}
              actionFeedback={issuePlanningActionFeedback}
              actionPending={isIssuePlanningActionPending}
              browserPanel={
                <FigmaBrowserPanel
                  hostRef={architectHostRef}
                  onReload={() => void reloadArchitectBrowser()}
                  onRetry={() => void retryArchitectBrowser()}
                  retryVisible={shouldShowArchitectBrowserRetry(architectStatus, architectAttachmentError)}
                  statusLabel={architectBrowserPresentation(architectStatus).label}
                />
              }
              currentIssue={currentIssue}
              fixCardProjection={issueFixCardProjection}
              onApplyContractReview={runIssueFixCardContractReview}
              onCopyRepairHandoff={() => void runMcpHandoff(() => runIssueFixCardAction(window.champcity.copyIssueFixCardRepairHandoff))}
              onPrepareRepairHandoff={() => void runMcpHandoff(() => runIssueFixCardAction(window.champcity.prepareIssueFixCardRepairHandoff))}
              onRefresh={() => {
                void refreshIssueInventory();
                void refreshIssuePlanningProjection(currentIssue?.issueId);
                void refreshIssueFixCardProjection(currentIssue?.issueId, activeIssueFixCardStepId);
                void refreshArchitectStatus();
              }}
              onReloadBrowser={() => void reloadArchitectBrowser()}
            />
          ) : isIssueResolutionForeground && activeIssueStageId === "fix-cards" && activeIssueFixCardStepId === "close-next" ? (
            <IssueFixCardCloseWorkspace
              actionError={issuePlanningActionError}
              actionFeedback={issuePlanningActionFeedback}
              actionPending={isIssuePlanningActionPending}
              currentIssue={currentIssue}
              fixCardProjection={issueFixCardProjection}
              onClose={() => void runIssueFixCardClose()}
            />
          ) : isIssueResolutionForeground && activeIssueStageId === "issue-validation" ? (
            <IssueValidationWorkspace
              key={`${currentIssue?.issueId ?? "none"}:${issueValidationProjection?.currentAttemptNumber ?? "pending"}`}
              actionError={issuePlanningActionError}
              actionFeedback={issuePlanningActionFeedback}
              actionPending={isIssuePlanningActionPending}
              currentIssue={currentIssue}
              onApplyDecision={(input) => void runIssueValidationDecision(input)}
              onRefresh={() => void refreshIssueValidationProjection(currentIssue?.issueId, { synchronizeStage: true })}
              projection={issueValidationProjection}
            />
          ) : isIssueResolutionForeground && activeIssueStageId === "issue-close" ? (
            <IssueCloseWorkspace
              key={`${currentIssue?.issueId ?? "none"}:${issueCloseProjection?.closeRecord.revision ?? "pending"}`}
              actionError={issueCloseActionError}
              actionFeedback={issueCloseActionFeedback}
              actionPending={isIssueCloseActionPending}
              currentIssue={currentIssue}
              isLoading={isIssueCloseLoading}
              onClose={(input) => void runIssueClose(input)}
              onRefresh={() => void refreshIssueCloseProjection(currentIssue?.issueId, { synchronizeStage: true })}
              projection={issueCloseProjection}
            />
          ) : (
          <>
          {!isWorkCardMap ? (
          <header className="workspace-header">
            <div className="workspace-heading-copy">
              <h1 id="workspace-heading">{workspaceHeadingLabel}</h1>
              {!usesFigmaWorkspaceBody ? (
              <div className="figma-screen-status-strip" aria-label="Current screen status">
                <FigmaHeaderStatus label="Lifecycle" value={activeLifecycleStatus} />
                <FigmaHeaderStatus
                  label="Workflow Step"
                  value={currentModel?.executionContext.workCard.loopStep ?? currentModel?.executionContext.phase.loopStep ?? activeWorkspace.label}
                />
                <FigmaHeaderStatus
                  label="Effective Disposition"
                  value={selectedDocument?.effectiveDisposition ?? "Pending"}
                />
                <FigmaHeaderStatus
                  label="Harness"
                  value={agentHarnessStatus
                    ? `${agentHarnessStatus.state} / ${agentHarnessStatus.registeredWorkspaceCount} registered`
                    : "Unavailable"}
                  mono
                />
                {selectedDocument ? (
                  <FigmaHeaderStatus label="Current Document" value={selectedDocument.displayFilename} mono />
                ) : null}
              </div>
              ) : null}
            </div>
            {!usesFigmaWorkspaceBody ? (
            <div className="workspace-actions">
              {embeddedBrowserAvailable ? (
                <button
                  className={isArchitectPaneVisible ? "icon-button text-button active" : "icon-button text-button"}
                  onClick={() => setIsArchitectPaneVisible((current) => !current)}
                  title={isArchitectPaneVisible ? "Hide embedded ChatGPT" : "Show embedded ChatGPT"}
                  type="button"
                >
                  <Bot aria-hidden="true" size={16} />
                  {isArchitectPaneVisible ? "Hide ChatGPT" : "Show ChatGPT"}
                </button>
              ) : null}
              <button
                className="icon-button text-button"
                disabled={!workspace.ok || isLoadingDocuments}
                onClick={() => refreshDocuments({ useResolver: true })}
                title="Refresh documents"
                type="button"
              >
                <RefreshCw aria-hidden="true" size={18} />
                Refresh
              </button>
            </div>
            ) : null}
          </header>
          ) : null}

          {!usesFigmaWorkspaceBody ? (
            <CurrentWorkspaceBanner
              activeWorkspaceLabel={activeWorkspace.label}
              model={currentModel}
              resolverResult={resolverResult}
              suppress={isWorkCardReportReview}
            />
          ) : null}

          <ProjectPlanningBlockerBanner
            activeWorkspaceId={activeWorkspaceId}
            projectPlanningModel={projectPlanningModel}
          />

          {activeWorkspaceId === "project-intake-capture" ? (
            <section className="figma-intake-workspace" aria-label="Project Intake Questionnaire">
              <div className="figma-intake-form-column">
                <ProjectIntakeCapture
                  isChoosingProjectRepository={isChoosingProjectRepository}
                  isSubmittingIntake={isSubmittingIntake}
                  onChange={setProjectIntake}
                  onChooseProjectRepository={chooseProjectRepository}
                  onSubmit={submitProjectIntake}
                  postSubmitConfirmation={projectIntakeConfirmation}
                  value={projectIntake}
                />
                {selectedDocument ? (
                  <FigmaProjectIntakeDispositionPanel
                    canApply={
                      Boolean(selectedDocument) &&
                      Boolean(selectedStatus) &&
                      !selectedDocumentHasLocalError
                    }
                    isApplying={isApplying}
                    notes={projectIntakeReviewNotes}
                    onApply={applyDisposition}
                    onNotesChange={setProjectIntakeReviewNotes}
                    onStatusChange={setSelectedStatus}
                    selectedDocument={selectedDocument}
                    selectedDocumentHasLocalError={selectedDocumentHasLocalError}
                    status={selectedStatus}
                  />
                ) : null}
              </div>
              <FigmaDocumentCard
                documentError={documentError}
                feedback={feedback}
                onCopy={copySelectedDocumentBody}
                selectedDocument={selectedDocument}
              />
            </section>
          ) : null}

          {isSettingsWorkspace ? (
            <AgentHarnessSettingsWorkspace
              actionError={agentHarnessActionError}
              actionFeedback={agentHarnessActionFeedback}
              actionPending={agentHarnessActionPending}
              lifecycleSavePending={agentHarnessServiceHostSettingsPending}
              lifecycleStatus={agentHarnessServiceHostLifecycleStatus}
              onRefresh={() => void refreshAgentHarnessStatus()}
              onExitBackgroundAgent={() => void exitBackgroundAgent()}
              onImportLegacyOAuthClients={() => void importLegacyOAuthClients()}
              onRegisterWorkspace={() => void addAgentHarnessWorkspace()}
              onRestart={() => void runAgentHarnessLifecycleAction("restart")}
              onRestartServiceHost={() => void restartAgentHarnessServiceHost()}
              onReturn={returnFromSettingsWorkspace}
              onSaveConfiguration={(settings) => void saveAgentHarnessSettings(settings)}
              onSaveServiceHostLifecycleSettings={(settings) =>
                void saveAgentHarnessServiceHostLifecycleSettings(settings)}
              onStartBackgroundAgent={() => void startBackgroundAgent()}
              onStart={() => void runAgentHarnessLifecycleAction("start")}
              onStop={() => void runAgentHarnessLifecycleAction("stop")}
              onUnregisterWorkspace={(workspaceId) => void removeAgentHarnessWorkspace(workspaceId)}
              savePending={agentHarnessSettingsPending}
              selectedProjectName={projectDisplayName(workspace)}
              status={agentHarnessStatus}
              workspaceRegistry={agentHarnessWorkspaceRegistry}
            />
          ) : null}

          {isPhaseMapFigmaWorkspace ? (
            <section
              className={[
                "figma-phase-map-workspace",
                !isArchitectPaneVisible ? "chat-hidden" : "",
              ].filter(Boolean).join(" ")}
              aria-label="Phase Map Figma workspace"
              ref={documentReviewSurfaceRef}
              tabIndex={-1}
            >
              <div className="figma-phase-map-column">
                <FigmaPhaseMapWorkspace
                  currentPhaseId={currentModel?.currentPhaseId}
                  documentError={documentError}
                  documents={documents}
                  feedback={feedback}
                  onCopy={copySelectedDocumentBody}
                  selectedDocument={selectedDocument}
                />
                {architectOutputModel?.canApplyDisposition ? (
                  <FigmaArchitectReviewPanel
                    allCurrentRevisionsViewed={allCurrentArchitectRevisionsViewed}
                    canApply={canApplyArchitectReview}
                    isApplying={isApplying}
                    model={architectOutputModel}
                    notes={architectOutputReviewNotes}
                    onNotesChange={setArchitectOutputReviewNotes}
                    onReview={applyArchitectOutputReview}
                    onStatusChange={setArchitectOutputReviewStatus}
                    status={architectOutputReviewStatus}
                    selectedDocument={selectedDocument}
                  />
                ) : null}
              </div>
              {architectBrowserColumn}
            </section>
          ) : null}

          {isVisibleArchitectOutputWorkspace && !isPhaseMapFigmaWorkspace ? (
            <section
              className={[
                "figma-doc-chat-workspace",
                !isArchitectPaneVisible ? "chat-hidden" : "",
              ].filter(Boolean).join(" ")}
              aria-label={`${activeWorkspace.label} Figma document workspace`}
              ref={documentReviewSurfaceRef}
              tabIndex={-1}
            >
              <div className="figma-doc-review-column">
                <FigmaDocumentCard
                  documentError={documentError}
                  feedback={feedback}
                  onCopy={copySelectedDocumentBody}
                  selectedDocument={selectedDocument}
                  slots={architectOutputModel?.documentSlots}
                  selectedSlotId={selectedArchitectOutputSlotId}
                  onSelectSlot={(slotId, logicalDocumentId) => {
                    setSelectedArchitectOutputSlotId(slotId);
                    const slot = architectOutputModel?.documentSlots.find((candidate) => candidate.slotId === slotId);
                    const revisionKey = slot ? revisionKeyForArchitectOutputSlot(slot) : null;
                    if (revisionKey) {
                      setViewedArchitectOutputRevisionKeys((current) =>
                        current.includes(revisionKey) ? current : [...current, revisionKey],
                      );
                    }
                    if (logicalDocumentId) {
                      setSelectedDocumentId(logicalDocumentId);
                    }
                  }}
                />
                <FigmaArchitectReviewPanel
                  allCurrentRevisionsViewed={allCurrentArchitectRevisionsViewed}
                  canApply={canApplyArchitectReview}
                  isApplying={isApplying}
                  model={architectOutputModel}
                  notes={architectOutputReviewNotes}
                  onNotesChange={setArchitectOutputReviewNotes}
                  onReview={applyArchitectOutputReview}
                  onStatusChange={setArchitectOutputReviewStatus}
                  status={architectOutputReviewStatus}
                  selectedDocument={selectedDocument}
                />
              </div>
              {architectBrowserColumn}
            </section>
          ) : null}

          {isWorkCardRepair ? (
            <WorkCardRepairWorkspace
              actionError={documentError || architectOutputPollingError}
              actionFeedback={feedback}
              architectOutputModel={architectOutputModel}
              browserPanel={
                <FigmaBrowserPanel
                  hostRef={architectHostRef}
                  onReload={() => void reloadArchitectBrowser()}
                  onRetry={() => void retryArchitectBrowser()}
                  retryVisible={shouldShowArchitectBrowserRetry(architectStatus, architectAttachmentError)}
                  statusLabel={architectBrowserPresentation(architectStatus).label}
                />
              }
              isArchitectPaneVisible={isArchitectPaneVisible}
              isCreating={isApplying}
              isPreparing={isRepairPromptPreparing}
              model={currentModel}
              onCopyHandoff={() => void copyArchitectHandoff()}
              onReloadBrowser={() => void reloadArchitectBrowser()}
              onPrepareHandoff={() => void prepareRepairWorkCardPromptFromEvidence()}
              onRefresh={() => {
                void refreshDocuments({ useResolver: true });
                void refreshArchitectStatus();
                void refreshArchitectOutputWorkspace({ force: true });
                void refreshWorkCardRepairProjection();
              }}
              onSelectRepairWorkCard={selectRepairWorkCardReviewDocument}
              projection={workCardRepairProjection}
              repairWorkCardDocument={selectedRepairWorkCardDocument}
              repairReviewPanel={
                architectOutputModel?.documentSlots.some((slot) => slot.logicalDocumentId) ? (
                  <FigmaArchitectReviewPanel
                    allCurrentRevisionsViewed={allCurrentArchitectRevisionsViewed}
                    canApply={canApplyArchitectReview}
                    isApplying={isApplying}
                    model={architectOutputModel}
                    notes={architectOutputReviewNotes}
                    onNotesChange={setArchitectOutputReviewNotes}
                    onReview={applyArchitectOutputReview}
                    onStatusChange={setArchitectOutputReviewStatus}
                    status={architectOutputReviewStatus}
                    selectedDocument={selectedRepairWorkCardDocument}
                  />
                ) : undefined
              }
            />
          ) : null}

          {isFigmaActionWorkspace ? (
            <FigmaActionWorkspace
              activeWorkspaceId={activeWorkspaceId}
              documentError={documentError}
              feedback={feedback}
              inputs={actionInputs}
              model={currentModel}
              phaseAction={phaseValidationAction}
              onChange={setActionInputs}
              onCreatePhaseCloseout={() => void createCurrentPhaseCloseout()}
              onApplyPhaseDisposition={() => void applyCurrentPhaseCloseoutDisposition()}
              onRun={runWorkspaceAction}
              onSelectDocument={setSelectedDocumentId}
              selectedDocument={selectedDocument}
              selectedDocumentId={selectedDocumentId}
              selectedSummary={selectedSummary}
              workspaceGroups={workspaceGroups}
              workspaceOk={workspace.ok}
            />
          ) : null}

          {isWorkCardPlanningPreparation ? (
            <WorkCardIntakeWorkspace
              actionError={workCardIntakeError}
              actionFeedback={workCardIntakeFeedback}
              isGenerating={isWorkCardIntakeGenerating}
              model={currentModel}
              onGenerate={() => void generateWorkCardIntakeAndTransition()}
            />
          ) : null}

          {isWorkCardBuildingReview ? (
            <WorkCardBuildingReviewWorkspace
              codexExecution={codexExecution}
              documentError={documentError}
              feedback={feedback}
              isCodexActionRunning={isCodexExecutionActionRunning}
              model={currentModel}
              onCancelCodex={() => void cancelCodexImplementerExecution()}
              onCreateReport={createImplementerReportFromBuildReview}
              onRespondToCodexMcpElicitation={(requestId, action, content) =>
                void respondToCodexMcpElicitation(requestId, action, content)}
              onRespondToCodexApproval={(requestId, decision) => void respondToCodexApproval(requestId, decision)}
              onRespondToCodexUserInput={(requestId, answers) => void respondToCodexUserInput(requestId, answers)}
              onResolveEnvironment={() => void startCodexEnvironmentResolution()}
              onRunCodex={(selection) => void startCodexImplementerExecution(selection)}
            />
          ) : null}

          {isWorkCardReportReview ? (
            <section
              aria-label="Review & Validation workspace"
              className={[
                "figma-doc-chat-workspace review-validation-workspace",
                !isArchitectPaneVisible ? "chat-hidden" : "",
              ].filter(Boolean).join(" ")}
              ref={documentReviewSurfaceRef}
              tabIndex={-1}
            >
              <WorkCardReportReviewWorkspace
                advisorySummary={advisorySummary}
                documentError={documentError}
                documents={documents}
                feedback={feedback}
                isApplying={isApplying}
                model={currentModel}
                onAdvisorySummaryChange={setAdvisorySummary}
                onOperatorNotesChange={setOperatorValidationNotes}
                onRepairDefectTextChange={setRepairDefectText}
                onSelectDocument={setSelectedDocumentId}
                onValidationDecision={(decision) => void applyOperatorValidationDecision(decision)}
                operatorNotes={operatorValidationNotes}
                repairDefectText={repairDefectText}
                selectedDocument={selectedDocument}
                selectedDocumentId={selectedDocumentId}
              />
              {isArchitectPaneVisible ? (
                <div className="figma-browser-column">
                  <FigmaBrowserPanel
                    hostRef={architectHostRef}
                    onReload={() => void reloadArchitectBrowser()}
                    onRetry={() => void retryArchitectBrowser()}
                    retryVisible={shouldShowArchitectBrowserRetry(architectStatus, architectAttachmentError)}
                    statusLabel={architectBrowserPresentation(architectStatus).label}
                  />
                  <FigmaBrowserActionsPanel
                    actionFeedback={null}
                    attachmentError={architectAttachmentError}
                    browserStatus={architectStatus}
                    contextualActions={
                      <button
                        disabled={!canCopyWorkCardAdvisoryPrompt}
                        onClick={() => void copyWorkCardAdvisoryReviewPrompt()}
                        type="button"
                      >
                        <Clipboard aria-hidden="true" size={14} />
                        Copy Advisory Prompt
                      </button>
                    }
                    handoffActionsVisible={false}
                    model={null}
                    onCopyHandoff={copyArchitectHandoff}
                    onPrepareHandoff={prepareArchitectOutputFromAction}
                    onRefresh={() => {
                      void refreshDocuments({ useResolver: true });
                      void refreshArchitectStatus();
                      void refreshCurrentModel();
                    }}
                    onReloadBrowser={() => void reloadArchitectBrowser()}
                    onRetryBrowser={() => void retryArchitectBrowser()}
                    pollingError=""
                  />
                </div>
              ) : null}
            </section>
          ) : null}

          {isWorkCardClose ? (
            <WorkCardCloseWorkspace
              actionError={documentError}
              actionFeedback={feedback}
              documents={documents}
              isReturning={isApplying}
              model={currentModel}
              onReturnToSelection={() => void returnFromWorkCardCloseToSelection()}
              projectionResult={workCardCloseProjectionResult}
            />
          ) : null}

          {isWorkCardMap ? (
            <WorkCardMapWorkspace
              actionError={workCardIntakeError || documentError}
              actionFeedback={workCardIntakeFeedback || feedback}
              candidateActionEnabled={
                !closeReturnSelectionProjection ||
                closeReturnSelectionProjection.state === "selection-required"
              }
              isBeginningPlanning={isWorkCardIntakeGenerating}
              model={currentModel}
              onBeginPlanning={(candidateId) => void beginMappedWorkCardPlanningAndTransition(candidateId)}
              onOpenPhaseValidation={() => void openPhaseValidation()}
              projection={workCardMapProjectionFromResult(workCardMapResult)}
            />
          ) : null}

          {!isVisibleArchitectOutputWorkspace && !isWorkCardClose && !isWorkCardPlanningPreparation && !isWorkCardBuildingReview && !isWorkCardReportReview && !isFigmaActionWorkspace && !isWorkCardRepair && !isWorkCardMap && !isSettingsWorkspace && activeWorkspaceId !== "project-intake-capture" ? (
          <section
            className={[
              isArchitectInterviewDualPaneWorkspace(activeWorkspaceId) || activeWorkspaceId === "phase-planning-bundle"
                ? "document-workspace architect-interview-workspace"
                : "document-workspace",
              isVisibleArchitectOutputWorkspace && !isArchitectPaneVisible ? "chat-hidden" : "",
            ].filter(Boolean).join(" ")}
            aria-label={activeWorkspace.label}
            ref={documentReviewSurfaceRef}
            tabIndex={-1}
          >
            {!isVisibleArchitectOutputWorkspace ? (
            <div className="document-list" aria-label={`${activeWorkspace.label} documents`}>
              {workspaceGroups.length === 0 ? (
                <div className="empty-list">
                  <p>{workspace.ok ? "No documents in this workflow step." : neutralMessage}</p>
                </div>
              ) : (
                workspaceGroups.map((group) => (
                  <div className="document-group" key={group.group}>
                    <h2>{group.group}</h2>
                    {group.documents.map((document) => {
                      const isSelectedDocument =
                        document.logicalDocumentId === selectedDocumentId;
                      const renderInlineDisposition =
                        shouldRenderInlineProjectIntakeDisposition(
                          activeWorkspaceId,
                          selectedDocumentId,
                          document.logicalDocumentId,
                        );
                      const documentRowContent = (
                        <>
                          <span className="document-title">{document.displayFilename}</span>
                          <span className="document-path">
                            {document.markdownPath}
                          </span>
                          <span className={`status-pill ${document.effectiveDisposition.toLowerCase()}`}>
                            {document.effectiveDisposition}
                          </span>
                        </>
                      );

                      if (activeWorkspaceId === "project-intake-capture") {
                        return (
                          <div
                            className={[
                              "document-row-shell",
                              isSelectedDocument ? "selected" : "",
                            ].filter(Boolean).join(" ")}
                            key={document.logicalDocumentId}
                          >
                            <button
                              className="document-selection-button"
                              onClick={() => setSelectedDocumentId(document.logicalDocumentId)}
                              type="button"
                            >
                              {documentRowContent}
                            </button>
                            {renderInlineDisposition
                              ? renderDispositionControls("inline-disposition-controls")
                              : null}
                          </div>
                        );
                      }

                      return (
                        <button
                          className={isSelectedDocument ? "document-row selected" : "document-row"}
                          key={document.logicalDocumentId}
                          onClick={() => setSelectedDocumentId(document.logicalDocumentId)}
                          type="button"
                        >
                          {documentRowContent}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
            ) : null}

            <article className="document-preview">
              <CurrentDocumentSummary
                resolverResult={resolverResult}
                selectedDocument={selectedDocument}
              />
              <header className="preview-header">
                <div>
                  <h2>{selectedDocument?.displayFilename ?? "Select a document"}</h2>
                  <p>{selectedDocument?.markdownPath ?? "Repository-relative path"}</p>
                </div>
                <div className="document-read-status">
                  <span>Canonical Markdown</span>
                  <strong>{selectedDocument?.readError ? "Local Error" : selectedDocument ? "Readable" : "Waiting"}</strong>
                </div>
              </header>

              {selectedDocumentHasLocalError || documentError ? (
                <div className="document-error" role="status">
                  {documentError || "Document must be readable as canonical Markdown before applying a disposition."}
                </div>
              ) : null}

              {feedback ? (
                <div className="document-feedback" role="status">
                  {feedback}
                </div>
              ) : null}

              {selectedDocument && shouldRenderPhaseMapDocumentPreview(selectedDocument) ? (
                <PhaseMapDocumentPreview document={selectedDocument} />
              ) : selectedDocument && shouldRenderWorkCardPlanDocumentPreview(selectedDocument) ? (
                <WorkCardPlanDocumentPreview document={selectedDocument} />
              ) : (
                <pre className="preview-body">
                  {selectedDocument?.bodyMarkdown ?? selectedDocument?.preview ?? neutralMessage}
                </pre>
              )}

              {specializedDispositionWorkspaceIds.has(activeWorkspaceId) ? (
                <div className="document-feedback" role="status">
                  Review controls appear when the current lifecycle document is ready.
                </div>
              ) : shouldRenderGenericPreviewDispositionControls(
                  activeWorkspaceId,
                  specializedDispositionWorkspaceIds.has(activeWorkspaceId),
                ) ? (
                renderDispositionControls("disposition-controls")
              ) : null}
            </article>
          </section>
          ) : null}
          </>
          )}
        </section>
      </div>
    </div>
  );
}

function FigmaArchitectReviewPanel({
  allCurrentRevisionsViewed,
  canApply,
  isApplying,
  model,
  notes,
  onNotesChange,
  onReview,
  onStatusChange,
  selectedDocument,
  status,
}: {
  allCurrentRevisionsViewed: boolean;
  canApply: boolean;
  isApplying: boolean;
  model: ArchitectOutputWorkspaceModel | null;
  notes: string;
  onNotesChange: (notes: string) => void;
  onReview: () => void;
  onStatusChange: (status: DocumentDispositionStatus | "") => void;
  selectedDocument: PlanningDocumentDetail | null;
  status: DocumentDispositionStatus | "";
}): JSX.Element {
  return (
    <FigmaDocumentDispositionPanel
      canApply={canApply}
      currentDocument={selectedDocument?.displayFilename}
      effectiveDisposition={selectedDocument?.effectiveDisposition}
      isApplying={isApplying || !model?.canApplyDisposition}
      notes={notes}
      onApply={onReview}
      onNotesChange={onNotesChange}
      onStatusChange={onStatusChange}
      status={status}
      warning={!allCurrentRevisionsViewed && model?.canApplyDisposition
        ? "Open every current output revision before approval."
        : undefined}
      workflowStep="Review & Validation"
    />
  );
}

function FigmaProjectIntakeDispositionPanel({
  canApply,
  isApplying,
  notes,
  onApply,
  onNotesChange,
  onStatusChange,
  selectedDocument,
  selectedDocumentHasLocalError,
  status,
}: {
  canApply: boolean;
  isApplying: boolean;
  notes: string;
  onApply: () => void;
  onNotesChange: (notes: string) => void;
  onStatusChange: (status: DocumentDispositionStatus | "") => void;
  selectedDocument: PlanningDocumentDetail;
  selectedDocumentHasLocalError: boolean;
  status: DocumentDispositionStatus | "";
}): JSX.Element {
  const controlsDisabled = isApplying || selectedDocumentHasLocalError;

  return (
    <section className="figma-disposition-panel figma-project-intake-disposition" aria-label="Document disposition">
      <header>
        <span>Document Disposition</span>
      </header>
      <div className="figma-disposition-row">
        <label>
          <span>Disposition</span>
          <select
            disabled={controlsDisabled}
            onChange={(event) => onStatusChange(event.target.value as DocumentDispositionStatus | "")}
            value={status}
          >
            <option value="">Select disposition</option>
            {dispositionOptions.map((option) => (
              <option key={option.status} value={option.status}>{option.label}</option>
            ))}
          </select>
        </label>
        <button
          className="apply-button"
          disabled={isApplying || !canApply}
          onClick={onApply}
          type="button"
        >
          Apply Review
        </button>
        <label className="figma-review-notes">
          <span>Review Notes</span>
          <input
            disabled={controlsDisabled}
            onChange={(event) => onNotesChange(event.target.value)}
            placeholder="Add notes..."
            value={notes}
          />
        </label>
      </div>
      <dl>
        <div>
          <dt>Current Document</dt>
          <dd>{selectedDocument.displayFilename}</dd>
        </div>
        <div>
          <dt>Effective Disposition</dt>
          <dd>{selectedDocument.effectiveDisposition ?? "Pending"}</dd>
        </div>
        <div>
          <dt>Workflow Step</dt>
          <dd>Review & Validation</dd>
        </div>
      </dl>
    </section>
  );
}

export function ProjectPlanningBlockerBanner({
  activeWorkspaceId,
  projectPlanningModel,
}: {
  activeWorkspaceId: WorkspaceId;
  projectPlanningModel: ProjectPlanningWorkspaceModel | null;
}): JSX.Element | null {
  const [evidenceExpanded, setEvidenceExpanded] = useState(false);
  const isProjectPlanningBlocked =
    activeWorkspaceId === "project-planning-review" &&
    (projectPlanningModel?.state === "not-ready" ||
      projectPlanningModel?.state === "needs-attention");
  if (!isProjectPlanningBlocked || !projectPlanningModel) {
    return null;
  }

  const reason = projectPlanningModel.reason;
  const requiredAction = projectPlanningModel.requiredAction;
  const shouldRenderRequiredAction =
    requiredAction.trim() !== "" && requiredAction.trim() !== reason.trim();
  const evidencePaths = projectPlanningModel.evidencePaths
    .map((evidencePath) => evidencePath.trim())
    .filter(Boolean);
  const visibleEvidencePaths = evidenceExpanded ? evidencePaths : evidencePaths.slice(0, 3);
  const hiddenEvidencePathCount = evidencePaths.length - visibleEvidencePaths.length;

  return (
    <section className="project-planning-blocker-banner" role="status" aria-live="polite">
      <div className="project-planning-blocker-copy">
        <h2>Project Planning Needs Attention</h2>
        <p>{reason}</p>
        {shouldRenderRequiredAction ? (
          <p>
            <strong>Required action:</strong> {requiredAction}
          </p>
        ) : null}
      </div>
      {evidencePaths.length > 0 ? (
        <div className="project-planning-blocker-evidence">
          <span>Evidence</span>
          <ul>
            {visibleEvidencePaths.map((evidencePath) => (
              <li key={evidencePath}>{evidencePath}</li>
            ))}
          </ul>
          {evidencePaths.length > 3 ? (
            <button
              className="project-planning-blocker-disclosure"
              onClick={() => setEvidenceExpanded((current) => !current)}
              type="button"
            >
              {evidenceExpanded ? "Show less" : `Show ${hiddenEvidencePathCount} more`}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export function FigmaBrowserActionsPanel({
  actionFeedback,
  attachmentError,
  browserStatus,
  copyHandoffLabel = "Copy Handoff",
  contextualActions,
  handoffActionsVisible = true,
  model,
  onCopyHandoff,
  onCopyFinalDraftHandoff,
  onPrepareHandoff,
  onPrepareFinalDraftHandoff,
  onRegeneratePrompt,
  onRefresh,
  onReloadBrowser,
  onRetryBrowser,
  pollingError,
  prepareHandoffLabel = "Prepare Handoff",
}: {
  actionFeedback: ArchitectActionFeedback;
  attachmentError: string;
  browserStatus: ArchitectBrowserFoundationStatus | null;
  copyHandoffLabel?: string;
  contextualActions?: JSX.Element;
  handoffActionsVisible?: boolean;
  model: ArchitectOutputWorkspaceModel | null;
  onCopyHandoff: () => void;
  onCopyFinalDraftHandoff?: () => void;
  onPrepareHandoff: () => void;
  onPrepareFinalDraftHandoff?: () => void;
  onRegeneratePrompt?: () => void;
  onRefresh: () => void;
  onReloadBrowser: () => void;
  onRetryBrowser: () => void;
  pollingError: string;
  prepareHandoffLabel?: string;
}): JSX.Element {
  const showRetryButton = shouldShowArchitectBrowserRetry(browserStatus, attachmentError);
  const isRevisionRequest = isArchitectOutputRevisionRequestModel(model);
  const revisionReadyFeedback = architectOutputRevisionReadyFeedback(model);
  const revisionRequestReady = revisionReadyFeedback
    ? { kind: "success" as const, message: revisionReadyFeedback }
    : null;
  const modelFailure = isRevisionRequest && model?.promotionError
    ? { kind: "error" as const, message: model.promotionError }
    : null;
  const actionMessage = actionFeedbackForDisplay(
    attachmentError,
    pollingError,
    modelFailure ?? actionFeedback ?? revisionRequestReady,
  );
  return (
    <section className="figma-browser-actions-panel" aria-label="Browser actions">
      <header>
        <span>Browser Actions</span>
      </header>
      <div className="figma-browser-actions-row">
        <button className="primary-action" onClick={onReloadBrowser} type="button">
          <Bot aria-hidden="true" size={14} />
          Reload ChatGPT
        </button>
        {handoffActionsVisible ? (
          <>
            <i aria-hidden="true" />
            {model?.canRegeneratePrompt && onRegeneratePrompt ? (
              <button onClick={onRegeneratePrompt} type="button">
                <FileText aria-hidden="true" size={14} />
                Regenerate Interview Prompt
              </button>
            ) : null}
            <button disabled={!model?.canPrepareHandoff} onClick={onPrepareHandoff} type="button">
              <FolderOpen aria-hidden="true" size={14} />
              {isRevisionRequest ? "Prepare Revision Request" : prepareHandoffLabel}
            </button>
            <button disabled={!model?.canCopyHandoff} onClick={onCopyHandoff} type="button">
              <Clipboard aria-hidden="true" size={14} />
              {isRevisionRequest ? "Copy Revision Request" : copyHandoffLabel}
            </button>
            {onPrepareFinalDraftHandoff && onCopyFinalDraftHandoff ? (
              <>
                <button
                  disabled={!model?.canPrepareFinalDraftHandoff}
                  onClick={onPrepareFinalDraftHandoff}
                  type="button"
                >
                  <FileText aria-hidden="true" size={14} />
                  Prepare Final Draft Handoff
                </button>
                <button
                  disabled={!model?.canCopyFinalDraftHandoff}
                  onClick={onCopyFinalDraftHandoff}
                  type="button"
                >
                  <Clipboard aria-hidden="true" size={14} />
                  Copy Final Draft Handoff
                </button>
              </>
            ) : null}
          </>
        ) : null}
        {contextualActions ? (
          <>
            <i aria-hidden="true" />
            {contextualActions}
          </>
        ) : null}
        <button onClick={onRefresh} type="button">
          <RefreshCw aria-hidden="true" size={14} />
          Refresh
        </button>
        {showRetryButton ? (
          <button onClick={onRetryBrowser} type="button">
            <RotateCcw aria-hidden="true" size={14} />
            Retry Browser
          </button>
        ) : null}
      </div>
      {actionMessage ? (
        <div className={`figma-browser-action-message ${actionMessage.kind}`} role="status">
          {actionMessage.message}
        </div>
      ) : null}
    </section>
  );
}

function isArchitectOutputRevisionRequestModel(
  model: ArchitectOutputWorkspaceModel | null,
): boolean {
  if (model?.workspaceId === "work-card-planning") {
    return model.documentSlots.some((slot) =>
      slot.slotId === "formal-work-card" && slot.disposition === "RevisionRequested"
    );
  }
  return Boolean(
    model?.workspaceId === "project-planning-review" &&
    model.documentSlots.length > 0 &&
    model.documentSlots.every((slot) => slot.disposition === "RevisionRequested"),
  );
}

function architectOutputRevisionReadyFeedback(model: ArchitectOutputWorkspaceModel | null): string | null {
  if (!isArchitectOutputRevisionRequestModel(model) || !model?.canCopyHandoff || !model.preparedInstruction) {
    return null;
  }
  return model.workspaceId === "work-card-planning"
    ? workCardPlanningRevisionReadyFeedback
    : projectPlanningRevisionReadyFeedback;
}

export interface AgentHarnessSettingsForm {
  enabled: boolean;
  host: string;
  port: string;
  publicBaseUrl: string;
  localAuthenticationMode: AgentHarnessAuthenticationMode;
}

export function agentHarnessSettingsFormFromStatus(
  status: AgentHarnessStatus | null,
): AgentHarnessSettingsForm {
  return {
    enabled: status?.enabled ?? true,
    host: status?.host ?? "127.0.0.1",
    port: status?.configuredPort.toString() ?? "0",
    publicBaseUrl: status?.publicBaseUrl ?? "",
    localAuthenticationMode: status?.localAuthenticationMode ?? "oauth-required",
  };
}

export function buildAgentHarnessSettingsInput(
  form: AgentHarnessSettingsForm,
): AgentHarnessSettingsInput {
  return {
    enabled: form.enabled,
    host: form.host.trim(),
    port: form.port.trim() === "" ? "0" : form.port.trim(),
    publicBaseUrl: form.publicBaseUrl.trim() || null,
    localAuthenticationMode: form.localAuthenticationMode,
  };
}

export function ServiceHostRemediation({ lifecycleStatus, isBusy, onRestartServiceHost }: {
  lifecycleStatus: AgentHarnessServiceHostLifecycleStatus | null;
  isBusy: boolean;
  onRestartServiceHost: () => void;
}): JSX.Element | null {
  if (!lifecycleStatus?.restartRequired) return null;
  return (
    <section className="agent-harness-message error service-host-remediation" role="status" aria-label="Background Agent update required">
      <div className="service-host-remediation-message">
        <strong>Background Agent update required</strong>
        <p>The running Background Agent belongs to a different ChampCity build generation.</p>
        <p>MCP-dependent work may fail or use stale loaded runtime state until the Background Agent is replaced.</p>
      </div>
      <div className="service-host-remediation-actions">
        <button disabled={isBusy} onClick={onRestartServiceHost} type="button">Restart Background Agent</button>
      </div>
    </section>
  );
}

export function AgentHarnessSettingsWorkspace({
  actionError,
  actionFeedback,
  actionPending,
  lifecycleSavePending,
  lifecycleStatus,
  onExitBackgroundAgent,
  onImportLegacyOAuthClients,
  onRegisterWorkspace,
  onRefresh,
  onRestart,
  onRestartServiceHost,
  onReturn,
  onSaveConfiguration,
  onSaveServiceHostLifecycleSettings,
  onStartBackgroundAgent,
  onStart,
  onStop,
  onUnregisterWorkspace,
  savePending,
  selectedProjectName,
  status,
  workspaceRegistry,
}: {
  actionError: string;
  actionFeedback: string;
  actionPending: "start" | "stop" | "restart" | "startBackgroundAgent" | "exitBackgroundAgent" | "restartServiceHost" | "importLegacyOAuthClients" | "registerWorkspace" | "unregisterWorkspace" | null;
  lifecycleSavePending: boolean;
  lifecycleStatus: AgentHarnessServiceHostLifecycleStatus | null;
  onExitBackgroundAgent: () => void;
  onImportLegacyOAuthClients: () => void;
  onRegisterWorkspace: () => void;
  onRefresh: () => void;
  onRestart: () => void;
  onRestartServiceHost: () => void;
  onReturn: () => void;
  onSaveConfiguration: (settings: AgentHarnessSettingsInput) => void;
  onSaveServiceHostLifecycleSettings: (settings: AgentHarnessServiceHostLifecycleSettingsInput) => void;
  onStartBackgroundAgent: () => void;
  onStart: () => void;
  onStop: () => void;
  onUnregisterWorkspace: (workspaceId: string) => void;
  savePending: boolean;
  selectedProjectName: string;
  status: AgentHarnessStatus | null;
  workspaceRegistry: AgentHarnessWorkspaceRegistrySnapshot | null;
}): JSX.Element {
  const [settingsForm, setSettingsForm] = useState<AgentHarnessSettingsForm>(() =>
    agentHarnessSettingsFormFromStatus(status),
  );
  const [settingsFormDirty, setSettingsFormDirty] = useState(false);
  const configuredPort = status?.configuredPort === 0
    ? "Auto"
    : status?.configuredPort?.toString() ?? "Unavailable";
  const isBusy = Boolean(actionPending) || savePending || lifecycleSavePending;
  const backgroundAgentStopped = lifecycleStatus?.explicitlyStopped === true;

  useEffect(() => {
    if (!settingsFormDirty) {
      setSettingsForm(agentHarnessSettingsFormFromStatus(status));
    }
  }, [
    settingsFormDirty,
    status?.configuredPort,
    status?.enabled,
    status?.host,
    status?.localAuthenticationMode,
    status?.publicBaseUrl,
  ]);

  function updateSettingsForm<K extends keyof AgentHarnessSettingsForm>(
    key: K,
    value: AgentHarnessSettingsForm[K],
  ): void {
    setSettingsFormDirty(true);
    setSettingsForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function submitSettings(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setSettingsFormDirty(false);
    onSaveConfiguration(buildAgentHarnessSettingsInput(settingsForm));
  }

  return (
    <section className="settings-workspace" aria-label="Settings workspace">
      <header className="settings-workspace-header">
        <div>
          <span>Settings</span>
          <h2>Agent Harness</h2>
        </div>
        <div className="settings-workspace-actions">
          <button onClick={onReturn} type="button">
            <RotateCcw aria-hidden="true" size={14} />
            Return
          </button>
          <button onClick={onRefresh} type="button">
            <RefreshCw aria-hidden="true" size={14} />
            Refresh
          </button>
        </div>
      </header>

      <div className="agent-harness-control-strip" aria-label="Agent Harness controls">
        <div className={`agent-harness-state ${status?.state ?? "unavailable"}`}>
          <span>MCP Runtime</span>
          <strong>{status?.state ?? "unavailable"}</strong>
        </div>
        <button disabled={isBusy || backgroundAgentStopped} onClick={onStart} type="button">
          <Play aria-hidden="true" size={14} />
          Start MCP Runtime
        </button>
        <button disabled={isBusy || backgroundAgentStopped} onClick={onStop} type="button">
          <Square aria-hidden="true" size={13} />
          Stop MCP Runtime
        </button>
        <button disabled={isBusy || backgroundAgentStopped} onClick={onRestart} type="button">
          <RotateCcw aria-hidden="true" size={14} />
          Restart MCP Runtime
        </button>
      </div>

      {actionFeedback ? (
        <div className="agent-harness-message success" role="status">{actionFeedback}</div>
      ) : null}
      {actionError || lifecycleStatus?.lastError || status?.lastError ? (
        <div className="agent-harness-message error" role="status">
          {actionError || lifecycleStatus?.lastError || status?.lastError}
        </div>
      ) : null}

      <section className="settings-panel settings-panel-wide" aria-label="Background Agent lifecycle">
        <header>
          <span>Background Agent</span>
          <strong>{backgroundAgentLifecycleLabel(lifecycleStatus)}</strong>
        </header>
        <div className="settings-workspace-actions">
          {backgroundAgentStopped ? (
            <button disabled={isBusy} onClick={onStartBackgroundAgent} type="button">Start Background Agent</button>
          ) : (
            <button disabled={isBusy || !lifecycleStatus?.serviceHostProcessId} onClick={onExitBackgroundAgent} type="button">Exit Background Agent</button>
          )}
        </div>
        <label className="agent-harness-checkbox-row">
          <input
            checked={lifecycleStatus?.launchAtLogin ?? true}
            disabled={isBusy || lifecycleStatus?.startupRegistrationSupported === false}
            onChange={(event) => onSaveServiceHostLifecycleSettings({
              launchAtLogin: event.currentTarget.checked,
            })}
            type="checkbox"
          />
          <span>Start Background Agent for my Windows user at sign-in</span>
        </label>
        <SettingsFacts
          facts={[
            ["Background Agent State", backgroundAgentLifecycleLabel(lifecycleStatus)],
            ["Service Host PID", lifecycleStatus?.serviceHostProcessId?.toString() ?? "Unavailable"],
            ["Worker PID", lifecycleStatus?.workerProcessId?.toString() ?? "Unavailable"],
            ["Worker Recovery", lifecycleStatus?.workerRecoveryState ?? "idle"],
            ["Power Epoch", lifecycleStatus?.powerEpoch?.toString() ?? "0"],
            ["Recovery Reason", lifecycleStatus?.reason ?? "None"],
            ["Heartbeat Misses", lifecycleStatus?.consecutiveHeartbeatMisses?.toString() ?? "0"],
            ["Runtime Build", lifecycleStatus?.runtimeBuildIdentity?.slice(0, 23) ?? "Unavailable"],
            ["Startup Trigger Scope", startupRegistrationScopeLabel(lifecycleStatus?.startupRegistrationScope)],
            ["Login Registration", lifecycleStatus?.loginItemRegistered ? "Exact trigger detected" : "Exact trigger not detected"],
            ["Executable Will Launch", yesNo(lifecycleStatus?.executableWillLaunchAtLogin)],
            ["Windows Registration Supported", yesNo(lifecycleStatus?.startupRegistrationSupported)],
          ]}
        />
        <ServiceHostRemediation
          lifecycleStatus={lifecycleStatus}
          isBusy={isBusy}
          onRestartServiceHost={onRestartServiceHost}
        />
      </section>

      <form className="agent-harness-settings-form" aria-label="Agent Harness configuration" onSubmit={submitSettings}>
        <label className="agent-harness-checkbox-row">
          <input
            checked={settingsForm.enabled}
            disabled={isBusy}
            onChange={(event) => updateSettingsForm("enabled", event.currentTarget.checked)}
            type="checkbox"
          />
          <span>Start MCP Runtime when Background Agent starts</span>
        </label>
        <label>
          <span>Host</span>
          <input
            disabled={isBusy}
            onChange={(event) => updateSettingsForm("host", event.currentTarget.value)}
            value={settingsForm.host}
          />
        </label>
        <label>
          <span>Port</span>
          <input
            disabled={isBusy}
            inputMode="numeric"
            min="0"
            max="65535"
            onChange={(event) => updateSettingsForm("port", event.currentTarget.value)}
            type="number"
            value={settingsForm.port}
          />
        </label>
        <label>
          <span>Public Base URL</span>
          <input
            disabled={isBusy}
            onChange={(event) => updateSettingsForm("publicBaseUrl", event.currentTarget.value)}
            placeholder="https://connector.example.test/champcity"
            value={settingsForm.publicBaseUrl}
          />
        </label>
        <label>
          <span>Authentication</span>
          <select
            disabled={isBusy}
            onChange={(event) =>
              updateSettingsForm(
                "localAuthenticationMode",
                event.currentTarget.value as AgentHarnessAuthenticationMode,
              )}
            value={settingsForm.localAuthenticationMode}
          >
            <option value="oauth-required">OAuth required</option>
            <option value="local-unauthenticated">Local unauthenticated</option>
          </select>
        </label>
        <button disabled={isBusy} type="submit">
          Save Settings
        </button>
      </form>

      <div className="settings-grid">
        <GithubProviderSettings />
        <section className="settings-panel settings-panel-wide" aria-label="Registered MCP Projects">
          <header>
            <span>Registered MCP Projects</span>
            <strong>{workspaceRegistry?.workspaces.length ?? 0} projects</strong>
          </header>
          <SettingsFacts
            facts={[
              ["Registry", workspaceRegistry?.state ?? "unavailable"],
              ["Desktop-selected project", selectedProjectName],
              ["MCP routing", "Exact registered workspaceId"],
            ]}
          />
          <button
            className="settings-inline-action"
            disabled={isBusy}
            onClick={onRegisterWorkspace}
            type="button"
          >
            <FolderOpen aria-hidden="true" size={14} />
            Add Project
          </button>
          <ul className="settings-tool-list" aria-label="Registered MCP project list">
            {(workspaceRegistry?.workspaces ?? []).map((registeredWorkspace) => (
              <li key={registeredWorkspace.workspaceId}>
                <span>
                  {registeredWorkspace.repositoryName} / {registeredWorkspace.workspaceId} / {registeredWorkspace.availability}
                </span>
                <button
                  disabled={isBusy}
                  onClick={() => onUnregisterWorkspace(registeredWorkspace.workspaceId)}
                  type="button"
                >
                  Remove
                </button>
              </li>
            ))}
            {workspaceRegistry?.state === "failed" ? <li>{workspaceRegistry.error}</li> : null}
            {workspaceRegistry?.state === "ready" && workspaceRegistry.workspaces.length === 0
              ? <li>No MCP projects registered</li>
              : null}
            {!workspaceRegistry ? <li>Registry unavailable</li> : null}
          </ul>
        </section>

        <section className="settings-panel" aria-label="Local service">
          <header>
            <span>Local Service</span>
          </header>
          <SettingsFacts
            facts={[
              ["MCP Endpoint", status?.mcpEndpoint ?? "Not running"],
              ["Health Endpoint", status?.healthEndpoint ?? "Not running"],
              ["Host", status?.host ?? "Unavailable"],
              ["Configured Port", configuredPort],
              ["Active Port", status?.port?.toString() ?? "Not running"],
            ]}
          />
        </section>

        <section className="settings-panel" aria-label="Public connector">
          <header>
            <span>Public Connector</span>
          </header>
          <button
            className="settings-inline-action"
            disabled={isBusy}
            onClick={onImportLegacyOAuthClients}
            type="button"
          >
            <FileText aria-hidden="true" size={14} />
            Import Legacy OAuth Clients
          </button>
          <SettingsFacts
            facts={[
              ["Public Base URL", status?.publicBaseUrl ?? "Not configured"],
              ["Public URL Configured", yesNo(status?.publicBaseUrlConfigured)],
              ["OAuth", status?.oauthConfigured ? "Configured" : "Not configured"],
              ["Auth Mode", status?.localAuthenticationMode ?? "Unavailable"],
              ["files.read Transport", accessGrantedLabel(status?.filesReadTransportAuthorized)],
              ["files.write Transport", accessGrantedLabel(status?.filesWriteTransportAuthorized)],
              ["Registered Clients", status?.registeredClientCount.toString() ?? "Unavailable"],
              ["Active Tokens", status?.activeOAuthTokenCount.toString() ?? "Unavailable"],
              ["Active files.read Grants", status?.activeFilesReadAuthorizationCount.toString() ?? "Unavailable"],
              ["Active files.write Grants", status?.activeFilesWriteAuthorizationCount.toString() ?? "Unavailable"],
            ]}
          />
        </section>

        <section className="settings-panel" aria-label="Tool exposure">
          <header>
            <span>Tool Exposure</span>
            <strong>{status?.publicToolCount ?? 0} tools</strong>
          </header>
          <ul className="settings-tool-list">
            {(status?.publicToolNames ?? []).map((toolName) => (
              <li key={toolName}>{toolName}</li>
            ))}
            {status && status.publicToolNames.length === 0 ? <li>No public tools exposed</li> : null}
            {!status ? <li>Unavailable</li> : null}
          </ul>
        </section>

        <section className="settings-panel settings-panel-wide" aria-label="Diagnostics">
          <header>
            <span>Diagnostics</span>
          </header>
          <ol className="settings-activity-list">
            {(status?.recentActivity ?? []).map((entry) => (
              <li key={entry}>{entry}</li>
            ))}
            {status && status.recentActivity.length === 0 ? <li>No lifecycle activity recorded</li> : null}
            {!status ? <li>Status unavailable</li> : null}
          </ol>
        </section>
      </div>
    </section>
  );
}

function SettingsFacts({
  facts,
}: {
  facts: Array<[string, string]>;
}): JSX.Element {
  return (
    <dl className="settings-facts">
      {facts.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function backgroundAgentLifecycleLabel(
  lifecycleStatus: AgentHarnessServiceHostLifecycleStatus | null,
): string {
  if (lifecycleStatus?.explicitlyStopped) {
    return "Stopped by user";
  }
  return lifecycleStatus?.state ?? "unavailable";
}

export function startupRegistrationScopeLabel(
  scope: AgentHarnessServiceHostLifecycleStatus["startupRegistrationScope"] | undefined,
): string {
  if (scope === "machine") return "Machine managed for everyone";
  if (scope === "user") return "Current Windows user";
  return "Unavailable";
}

function yesNo(value: boolean | undefined): string {
  return value ? "Yes" : "No";
}

function accessGrantedLabel(value: boolean | undefined): string {
  return value ? "Access granted" : "No access grant";
}

export function FigmaActionWorkspace({
  activeWorkspaceId,
  documentError,
  feedback,
  inputs,
  model,
  phaseAction,
  onApplyPhaseDisposition,
  onChange,
  onCreatePhaseCloseout,
  onRun,
  onSelectDocument,
  selectedDocument,
  selectedDocumentId,
  selectedSummary,
  workspaceGroups,
  workspaceOk,
}: {
  activeWorkspaceId: WorkspaceId;
  documentError: string;
  feedback: string;
  inputs: {
    defect: string;
    closureDecision: ClosureDecision;
    rationale: string;
    status: DocumentDispositionStatus;
  };
  model: CurrentWorkspaceModel | null;
  phaseAction: PhaseValidationActionProjection | null;
  onApplyPhaseDisposition: () => void;
  onChange: (value: {
    defect: string;
    closureDecision: ClosureDecision;
    rationale: string;
    status: DocumentDispositionStatus;
  }) => void;
  onCreatePhaseCloseout: () => void;
  onRun: (action: () => Promise<RuntimeActionResult>) => Promise<void>;
  onSelectDocument: (logicalDocumentId: string) => void;
  selectedDocument: PlanningDocumentDetail | null;
  selectedDocumentId: string | null;
  selectedSummary: PlanningDocumentSummary | null;
  workspaceGroups: Array<{ group: string; documents: PlanningDocumentSummary[] }>;
  workspaceOk: boolean;
}): JSX.Element {
  const update = <Key extends keyof typeof inputs>(key: Key, value: (typeof inputs)[Key]): void => {
    onChange({ ...inputs, [key]: value });
  };
  const selectedDocumentIsPhaseMapOutput = Boolean(
    selectedSummary &&
    classifyPlanningDocument(selectedSummary).workspaceId === "project-phase-map" &&
    selectedSummary.metadata.participationRole !== "nonReviewHandoff",
  );
  const canApplyPhaseMapDisposition =
    activeWorkspaceId !== "project-phase-map" || selectedDocumentIsPhaseMapOutput;
  const canApplyGenericDisposition =
    specializedDispositionWorkspaceIds.has(activeWorkspaceId) && canApplyPhaseMapDisposition;
  const visiblePhaseAction = phaseValidationActionForWorkspace(activeWorkspaceId, phaseAction);
  const phasePresentation = visiblePhaseAction
    ? phaseValidationPresentation(visiblePhaseAction)
    : null;
  const canApplyPhaseDisposition = phasePresentation?.dispositionTarget === "phase-validation";
  const canApplyDisposition = canApplyGenericDisposition || canApplyPhaseDisposition;
  const hasDocuments = workspaceGroups.some((group) => group.documents.length > 0);
  const actionPath = phasePresentation?.actionPath ?? (
    [model?.level, model?.stage, model?.currentPhaseId, model?.currentWorkCardId]
      .filter(Boolean)
      .join(" / ") || "Repository evidence required"
  );
  const phaseProjectionPending =
    (activeWorkspaceId === "phase-validation" || activeWorkspaceId === "phase-close") && !phasePresentation;

  return (
    <section
      className="flex h-full min-h-0 flex-col overflow-hidden"
      aria-label={`${phasePresentation?.currentTarget ?? (phaseProjectionPending ? "Phase Validation basis" : model?.currentTarget ?? activeWorkspaceId)} workspace`}
    >
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="scrollbar-thin flex-1 overflow-y-auto px-4 py-4">
          <div className="max-w-2xl space-y-3">
            <FigmaInfoCard>
              <FigmaInfoGrid
                items={[
                  { label: "Current Required Workflow Step", value: phasePresentation?.currentRequiredWorkflowStep ?? (phaseProjectionPending ? "Phase Validation basis required" : model?.executionContext.workCard.loopStep ?? model?.executionContext.phase.loopStep ?? model?.stage ?? "Waiting") },
                  { label: "Current Target", value: phasePresentation?.currentTarget ?? (phaseProjectionPending ? "Repository-validated current phase required" : model?.currentTarget ?? "Resolve current workflow target") },
                  { label: "Eligibility", value: phasePresentation?.eligibility ?? (phaseProjectionPending ? "Phase mutation controls remain disabled until repository binding is loaded." : model?.eligibility ?? "Repository evidence required."), muted: true },
                  { label: "Required Action", value: phasePresentation?.requiredAction ?? (phaseProjectionPending ? "Load repository Phase Validation action" : model?.requiredAction ?? "Select a project and refresh workflow evidence."), muted: true },
                ]}
              />
              <div className="mt-3 border-t border-border pt-3">
                <p className="mb-0.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Expected Output</p>
                <p className="break-all font-mono text-[12px] text-muted-foreground">{phasePresentation?.expectedOutput ?? (phaseProjectionPending ? "Repository Phase Validation projection." : model?.expectedOutput ?? neutralMessage)}</p>
              </div>
              <div className="mt-2">
                <p className="mb-0.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Next State</p>
                <p className="text-[12px] text-muted-foreground">{phasePresentation?.expectedNextState ?? (phaseProjectionPending ? "No Phase Validation transition is eligible yet." : model?.expectedNextState ?? "Waiting for current workflow evidence.")}</p>
              </div>
            </FigmaInfoCard>

            <FigmaInfoCard>
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-0 flex-1">
                  <p className="mb-0.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Action Context</p>
                  <p className="break-words text-[13px] font-medium text-foreground">{phasePresentation?.actionContext ?? (phaseProjectionPending ? "Phase Validation basis not loaded" : model?.currentTarget ?? "Current workflow action")}</p>
                  <p className="mt-1 break-all font-mono text-[12px] text-muted-foreground">{actionPath}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {canApplyDisposition ? (
                    <>
                      <select
                        className="min-h-8 rounded border border-border bg-input-background px-2 text-[13px] text-foreground outline-none transition-colors focus:border-primary/50"
                        onChange={(event) => update("status", event.target.value as DocumentDispositionStatus)}
                        value={inputs.status}
                      >
                        {dispositionOptions.map((option) => (
                          <option key={option.status} value={option.status}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <button
                        className="min-h-8 rounded border border-sky-500/20 bg-sky-500/10 px-3 text-[13px] font-medium text-sky-400 transition-colors hover:bg-sky-500/20"
                        onClick={canApplyPhaseDisposition
                          ? onApplyPhaseDisposition
                          : () => void onRun(() => window.champcity.applyCurrentDisposition(inputs.status))}
                        type="button"
                      >
                        Apply Current Disposition
                      </button>
                    </>
                  ) : null}
                  {handoffWorkspaceIds.has(activeWorkspaceId) ? (
                    <button
                      className="min-h-8 rounded bg-sky-500 px-3 text-[13px] font-semibold text-[#0c0e14] transition-colors hover:bg-sky-400"
                      onClick={() => onRun(window.champcity.generateCurrentHandoff)}
                      type="button"
                    >
                      Run Current Handoff Action
                    </button>
                  ) : null}
                  {activeWorkspaceId === "work-card-validation" ? (
                    <button
                      className="min-h-8 rounded border border-emerald-500/20 bg-emerald-500/10 px-3 text-[13px] font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20"
                      onClick={() => onRun(() => window.champcity.createValidationAttemptForCurrentWorkCard())}
                      type="button"
                    >
                      Create Current Validation Attempt
                    </button>
                  ) : null}
                  {phasePresentation?.canCreateCloseout ? (
                    <FigmaCloseControls
                      inputs={inputs}
                      onChange={update}
                      onRun={onCreatePhaseCloseout}
                      submitLabel="Create Current Phase Closeout"
                    />
                  ) : null}
                  {activeWorkspaceId === "project-validation" || activeWorkspaceId === "project-close" ? (
                    <FigmaCloseControls
                      inputs={inputs}
                      onChange={update}
                      onRun={() => onRun(() => window.champcity.createProjectCloseoutForCurrentProject(inputs.closureDecision, inputs.rationale))}
                      submitLabel="Create Current Project Closeout"
                    />
                  ) : null}
                </div>
              </div>
            </FigmaInfoCard>

            {!hasDocuments ? (
              <FigmaEmptyDocSlot message={workspaceOk ? "No documents in this workflow step." : neutralMessage} />
            ) : null}

            <FigmaDocumentSelectCard
              groups={workspaceGroups}
              onSelectDocument={onSelectDocument}
              selectedDocument={selectedDocument}
              selectedDocumentId={selectedDocumentId}
            />

            {selectedDocument ? (
              <FigmaInfoCard className="overflow-hidden p-0">
                <div className="border-b border-border bg-muted px-4 py-2">
                  <p className="truncate font-mono text-[13px] font-medium text-foreground">{selectedDocument.displayFilename}</p>
                  <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">{selectedDocument.markdownPath}</p>
                </div>
                <div className="max-h-80 overflow-auto px-4 py-3">
                  <FigmaMarkdownBody markdown={selectedDocument.bodyMarkdown ?? selectedDocument.preview ?? ""} />
                </div>
              </FigmaInfoCard>
            ) : null}

            {feedback ? <div className="rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[12px] text-emerald-500" role="status">{feedback}</div> : null}
            {documentError ? <div className="rounded border border-red-500/20 bg-red-500/10 px-3 py-2 text-[12px] text-red-400" role="status">{documentError}</div> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function FigmaInfoCard({ children, className = "" }: { children: React.ReactNode; className?: string }): JSX.Element {
  return (
    <section className={`rounded-lg border border-border bg-card p-3.5 text-card-foreground ${className}`}>
      {children}
    </section>
  );
}

function FigmaInfoGrid({
  items,
}: {
  items: Array<{ label: string; value: string; muted?: boolean }>;
}): JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <p className="mb-0.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{item.label}</p>
          <p className={`break-words text-[13px] ${item.muted ? "text-muted-foreground" : "text-foreground"}`}>{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function FigmaEmptyDocSlot({ message }: { message: string }): JSX.Element {
  return (
    <section className="rounded-lg border border-border bg-card p-8 text-center">
      <FileText className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
      <p className="text-[13px] text-muted-foreground">{message}</p>
    </section>
  );
}

function FigmaDocumentSelectCard({
  groups,
  onSelectDocument,
  selectedDocument,
  selectedDocumentId,
}: {
  groups: Array<{ group: string; documents: PlanningDocumentSummary[] }>;
  onSelectDocument: (logicalDocumentId: string) => void;
  selectedDocument: PlanningDocumentDetail | null;
  selectedDocumentId: string | null;
}): JSX.Element {
  const flatDocuments = groups.flatMap((group) => group.documents);
  const selectedPosition = selectedDocumentId
    ? flatDocuments.findIndex((document) => document.logicalDocumentId === selectedDocumentId) + 1
    : 0;
  return (
    <FigmaInfoCard>
      <div className="mb-3 grid grid-cols-2 gap-4">
        <div>
          <p className="mb-0.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Current Workflow Step</p>
          <p className="text-[12px] text-foreground">{selectedDocument ? classifyPlanningDocument(selectedDocument).workspaceId : "Waiting"}</p>
        </div>
        <div>
          <p className="mb-0.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Current Document</p>
          <p className="truncate font-mono text-[12px] text-sky-400/80">{selectedDocument?.displayFilename ?? "Select a document"}</p>
        </div>
        <div>
          <p className="mb-0.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Effective Disposition</p>
          <p className={`text-[12px] ${selectedDocument?.effectiveDisposition === "Pending" ? "text-amber-400" : selectedDocument ? "text-emerald-400" : "text-muted-foreground"}`}>
            {selectedDocument?.effectiveDisposition ?? "Waiting"}
          </p>
        </div>
        <div>
          <p className="mb-0.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Position</p>
          <p className="text-[12px] text-muted-foreground">
            {selectedPosition > 0 ? `Document ${selectedPosition} of ${flatDocuments.length}` : "Waiting"}
          </p>
        </div>
      </div>
      <div className="border-t border-border pt-2">
        <p className="mb-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Select a document</p>
        <p className="mb-1.5 text-[11px] text-muted-foreground">Repository relative path</p>
        <select
          className="w-full rounded border border-border bg-input-background px-2 py-1.5 text-[13px] text-foreground outline-none transition-colors focus:border-primary/50"
          disabled={flatDocuments.length === 0}
          onChange={(event) => event.target.value && onSelectDocument(event.target.value)}
          value={selectedDocumentId ?? ""}
        >
          <option value="">{flatDocuments.length ? "Select document" : "Document workflow not yet implemented"}</option>
          {flatDocuments.map((document) => (
            <option key={document.logicalDocumentId} value={document.logicalDocumentId}>
              {document.displayFilename}
            </option>
          ))}
        </select>
      </div>
    </FigmaInfoCard>
  );
}

function FigmaCloseControls({
  inputs,
  onChange,
  onRun,
  submitLabel,
}: {
  inputs: {
    defect: string;
    closureDecision: ClosureDecision;
    rationale: string;
    status: DocumentDispositionStatus;
  };
  onChange: <Key extends keyof FigmaCloseControlsProps["inputs"]>(key: Key, value: FigmaCloseControlsProps["inputs"][Key]) => void;
  onRun: () => void;
  submitLabel: string;
}): JSX.Element {
  return (
    <>
      <select
        className="min-h-8 rounded border border-border bg-input-background px-2 text-[13px] text-foreground outline-none transition-colors focus:border-primary/50"
        onChange={(event) => onChange("closureDecision", event.target.value as ClosureDecision)}
        value={inputs.closureDecision}
      >
        <option value="Close">Close</option>
        <option value="DoNotClose">Do Not Close</option>
      </select>
      <input
        className="min-h-8 rounded border border-border bg-input-background px-2 text-[13px] text-foreground outline-none transition-colors focus:border-primary/50"
        onChange={(event) => onChange("rationale", event.target.value)}
        placeholder="Rationale"
        value={inputs.rationale}
      />
      <button
        className="min-h-8 rounded border border-emerald-500/20 bg-emerald-500/10 px-3 text-[13px] font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20"
        onClick={onRun}
        type="button"
      >
        {submitLabel}
      </button>
    </>
  );
}

type FigmaCloseControlsProps = {
  inputs: {
    defect: string;
    closureDecision: ClosureDecision;
    rationale: string;
    status: DocumentDispositionStatus;
  };
};

export function CurrentActionPanel({
  activeWorkspaceId,
  inputs,
  model,
  phaseAction,
  onApplyPhaseDisposition,
  onChange,
  onCreatePhaseCloseout,
  onRun,
  selectedDocument,
}: {
  activeWorkspaceId: WorkspaceId;
  inputs: {
    defect: string;
    closureDecision: ClosureDecision;
    rationale: string;
    status: DocumentDispositionStatus;
  };
  phaseAction: PhaseValidationActionProjection | null;
  onApplyPhaseDisposition: () => void;
  onChange: (value: {
    defect: string;
    closureDecision: ClosureDecision;
    rationale: string;
    status: DocumentDispositionStatus;
  }) => void;
  onCreatePhaseCloseout: () => void;
  model: CurrentWorkspaceModel | null;
  onRun: (action: () => Promise<RuntimeActionResult>) => Promise<void>;
  selectedDocument: PlanningDocumentSummary | null;
}): JSX.Element {
  const update = <Key extends keyof typeof inputs>(key: Key, value: (typeof inputs)[Key]): void => {
    onChange({ ...inputs, [key]: value });
  };
  const statusSelect = (
    <label>
      <span>Disposition</span>
      <select
        onChange={(event) => update("status", event.target.value as DocumentDispositionStatus)}
        value={inputs.status}
      >
        {dispositionOptions.map((option) => (
          <option key={option.status} value={option.status}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
  const selectedDocumentIsPhaseMapOutput = Boolean(
    selectedDocument &&
    classifyPlanningDocument(selectedDocument).workspaceId === "project-phase-map" &&
    selectedDocument.metadata.participationRole !== "nonReviewHandoff",
  );
  const canApplyPhaseMapDisposition =
    activeWorkspaceId !== "project-phase-map" || selectedDocumentIsPhaseMapOutput;
  const canApplyGenericDisposition =
    specializedDispositionWorkspaceIds.has(activeWorkspaceId) && canApplyPhaseMapDisposition;
  const visiblePhaseAction = phaseValidationActionForWorkspace(activeWorkspaceId, phaseAction);
  const phasePresentation = visiblePhaseAction
    ? phaseValidationPresentation(visiblePhaseAction)
    : null;
  const canApplyPhaseDisposition = phasePresentation?.dispositionTarget === "phase-validation";
  const canApplyDisposition = canApplyGenericDisposition || canApplyPhaseDisposition;
  const phaseProjectionPending =
    (activeWorkspaceId === "phase-validation" || activeWorkspaceId === "phase-close") && !phasePresentation;

  return (
    <section className="workspace-action-panel" aria-label="Workflow step actions">
      <div className="current-action-context">
        <span>Action Context</span>
        <strong>{phasePresentation?.actionContext ?? (phaseProjectionPending ? "Phase Validation basis not loaded" : model?.currentTarget ?? "Resolve current workflow step to enable actions")}</strong>
        <small>
          {phasePresentation?.actionPath ?? (
            [model?.level, model?.stage, model?.currentPhaseId, model?.currentWorkCardId]
              .filter(Boolean)
              .join(" / ") || "Repository evidence required"
          )}
        </small>
      </div>
      {canApplyDisposition ? (
        <>
          {statusSelect}
          <button className="apply-button" onClick={canApplyPhaseDisposition
            ? onApplyPhaseDisposition
            : () => void onRun(() => window.champcity.applyCurrentDisposition(inputs.status))} type="button">
            Apply Current Disposition
          </button>
        </>
      ) : null}
      {handoffWorkspaceIds.has(activeWorkspaceId) ? (
        <button className="apply-button" onClick={() => onRun(window.champcity.generateCurrentHandoff)} type="button">
          Run Current Handoff Action
        </button>
      ) : null}
      {activeWorkspaceId === "work-card-validation" ? (
        <button className="apply-button" onClick={() => onRun(() => window.champcity.createValidationAttemptForCurrentWorkCard())} type="button">
          Create Current Validation Attempt
        </button>
      ) : null}
      {phasePresentation?.canCreateCloseout ? (
        <>
          <label>
            <span>Closure Decision</span>
            <select onChange={(event) => update("closureDecision", event.target.value as ClosureDecision)} value={inputs.closureDecision}>
              <option value="Close">Close</option>
              <option value="DoNotClose">Do Not Close</option>
            </select>
          </label>
          <label>
            <span>Rationale</span>
            <input onChange={(event) => update("rationale", event.target.value)} value={inputs.rationale} />
          </label>
          <button className="apply-button" onClick={onCreatePhaseCloseout} type="button">
            Create Current Phase Closeout
          </button>
        </>
      ) : null}
      {activeWorkspaceId === "project-validation" || activeWorkspaceId === "project-close" ? (
        <>
          <label>
            <span>Closure Decision</span>
            <select onChange={(event) => update("closureDecision", event.target.value as ClosureDecision)} value={inputs.closureDecision}>
              <option value="Close">Close</option>
              <option value="DoNotClose">Do Not Close</option>
            </select>
          </label>
          <label>
            <span>Rationale</span>
            <input onChange={(event) => update("rationale", event.target.value)} value={inputs.rationale} />
          </label>
          <button className="apply-button" onClick={() => onRun(() => window.champcity.createProjectCloseoutForCurrentProject(inputs.closureDecision, inputs.rationale))} type="button">
            Create Current Project Closeout
          </button>
        </>
      ) : null}
    </section>
  );
}

function ProjectIntakeCapture({
  isChoosingProjectRepository,
  isSubmittingIntake,
  onChange,
  onChooseProjectRepository,
  onSubmit,
  postSubmitConfirmation,
  value,
}: {
  isChoosingProjectRepository: boolean;
  isSubmittingIntake: boolean;
  onChange: (value: ProjectIntakeSubmission) => void;
  onChooseProjectRepository: () => void;
  onSubmit: () => void;
  postSubmitConfirmation: ProjectIntakePostSubmitConfirmation | null;
  value: ProjectIntakeSubmission;
}): JSX.Element {
  const update = <Key extends keyof ProjectIntakeSubmission>(
    key: Key,
    nextValue: ProjectIntakeSubmission[Key],
  ): void => {
    onChange({ ...value, [key]: nextValue });
  };

  return (
    <section className="intake-form" aria-label="Project Intake Capture">
      <label className="figma-intake-full">
        <span>Project Name</span>
        <input
          onChange={(event) => update("projectName", event.target.value)}
          required
          value={value.projectName}
        />
      </label>
      <label className="figma-intake-full">
        <span>Project Purpose - What are you trying to create, change, or accomplish?</span>
        <textarea
          onChange={(event) => update("projectPurpose", event.target.value)}
          required
          value={value.projectPurpose}
        />
      </label>
      <label className="figma-intake-full">
        <span>Desired Outcome - What should the finished product allow the user or Operator to do?</span>
        <textarea
          onChange={(event) => update("desiredOutcome", event.target.value)}
          required
          value={value.desiredOutcome}
        />
      </label>
      <div className="figma-intake-project-type">
        <label>
          <span>Project Type</span>
          <select
            onChange={(event) =>
              update("projectType", event.target.value as ProjectIntakeSubmission["projectType"])
            }
            required
            value={value.projectType}
          >
            {projectTypeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="checkbox-row">
          <input
            checked={value.hasExistingSourceOrPlanning}
            onChange={(event) => update("hasExistingSourceOrPlanning", event.target.checked)}
            type="checkbox"
          />
          <span>Does this repository already contain source code or project planning documents?</span>
        </label>
      </div>
      <label>
        <span>Constraints / Non-Negotiables</span>
        <textarea
          onChange={(event) => update("knownConstraints", event.target.value)}
          value={value.knownConstraints ?? ""}
        />
      </label>
      <div className="intake-repository-row figma-intake-full">
        <label>
          <span>Project Repository</span>
          <input readOnly required value={value.projectRepository} />
        </label>
        <button
          className="icon-button text-button"
          disabled={isChoosingProjectRepository}
          onClick={onChooseProjectRepository}
          type="button"
        >
          <FolderOpen aria-hidden="true" size={18} />
          {isChoosingProjectRepository ? "Choosing..." : "Choose"}
        </button>
      </div>
      {value.hasExistingSourceOrPlanning ? (
        <label className="figma-intake-full">
          <span>What should the Architect know before reviewing the existing repository?</span>
          <textarea
            onChange={(event) => update("repositoryReviewContext", event.target.value)}
            value={value.repositoryReviewContext ?? ""}
          />
        </label>
      ) : null}
      <button
        className="apply-button"
        disabled={isSubmittingIntake}
        onClick={onSubmit}
        type="button"
      >
        {isSubmittingIntake ? "Saving..." : "Submit Project Intake"}
      </button>
      {postSubmitConfirmation ? (
        <section className="intake-confirmation" aria-label="Project Intake submission confirmation">
          <strong>Project Intake and Architect Interview Prompt Markdown were created successfully in the active repository.</strong>
          <dl>
            <div>
              <dt>Project Intake Markdown</dt>
              <dd>{postSubmitConfirmation.projectIntakeMarkdownPath}</dd>
            </div>
            <div>
              <dt>Architect Interview Prompt Markdown</dt>
              <dd>{postSubmitConfirmation.architectPromptMarkdownPath}</dd>
            </div>
          </dl>
        </section>
      ) : null}
    </section>
  );
}

function getResolverFeedback(result: FirstNonApprovedResult): string {
  if (result.status === "pre-intake") {
    return result.reason;
  }

  if (result.status === "project-intake-incomplete") {
    return result.reason;
  }

  if (result.status === "project-intake-conflict") {
    return result.reason;
  }

  if (result.status === "waiting-for-architect-interview") {
    return `${result.message}: ${result.expectedOutputPaths.markdown}`;
  }

  if (result.status === "all-approved") {
    return result.message;
  }

  return `Document ${result.document.orderPosition} of ${result.document.totalDocumentCount}: ${result.document.displayTitle}`;
}

function isArchitectEnabledWorkspace(activeWorkspaceId: WorkspaceId): boolean {
  return activeWorkspaceId === "architect-interview" ||
    activeWorkspaceId === "phase-interview" ||
    activeWorkspaceId === "phase-planning-bundle" ||
    activeWorkspaceId === "project-planning-review" ||
    activeWorkspaceId === "project-phase-map" ||
    activeWorkspaceId === "work-card-planning" ||
    activeWorkspaceId === "work-card-repair";
}

function architectInterviewRecoveryDocumentId(model: ArchitectOutputWorkspaceModel): string | undefined {
  if (model.workspaceId !== "architect-interview") {
    return undefined;
  }
  const domain = model.domain as {
    selectedReviewDocumentRole?: string;
    projectIntakeDocument?: { logicalDocumentId?: string };
  } | undefined;
  return domain?.selectedReviewDocumentRole === "project-intake"
    ? domain.projectIntakeDocument?.logicalDocumentId
    : undefined;
}

function architectInterviewRailStatusFromGenericModel(
  model: ArchitectOutputWorkspaceModel | null,
): ArchitectInterviewRailStatus {
  if (model?.workspaceId !== "architect-interview") {
    return "Open";
  }
  if (model.railStatus === "Ready" || model.railStatus === "Not Ready") {
    return "Open";
  }
  if (model.railStatus === "In Progress" || model.railStatus === "Conflict") {
    return "Needs Attention";
  }
  return model.railStatus;
}

function architectBrowserPresentation(status: ArchitectBrowserFoundationStatus | null): {
  label: "Starting browser..." | "Loading ChatGPT..." | "ChatGPT ready" | "Browser unavailable";
  detail: string;
} {
  const attachment = status?.attachment.state ?? "detached";
  if (attachment === "attach-failed") {
    return {
      label: "Browser unavailable",
      detail: status?.attachment.lastError ?? "The embedded browser could not attach to this window.",
    };
  }
  if (attachment === "detached" || attachment === "attaching" || attachment === "attached-zero-bounds") {
    return {
      label: "Starting browser...",
      detail: "Preparing the embedded ChatGPT surface.",
    };
  }

  const state = status?.browserState ?? "detached";
  if (state === "loading") {
    return {
      label: "Loading ChatGPT...",
      detail: "The embedded ChatGPT page is loading.",
    };
  }
  if (state === "loaded-auth-state-unknown" || state === "operator-confirmed-signed-in") {
    return {
      label: "ChatGPT ready",
      detail: "The embedded ChatGPT page is loaded.",
    };
  }
  if (state === "load-failed") {
    return {
      label: "Browser unavailable",
      detail: "The embedded ChatGPT page failed to load. Use Reload ChatGPT to try again.",
    };
  }
  return {
    label: "Starting browser...",
    detail: "Preparing the embedded ChatGPT surface.",
  };
}

function workCardMapProjectionFromResult(
  result: RuntimeActionResult | null,
): WorkCardMapProjection | null {
  if (!result || !isAppRecord(result.payload)) {
    return null;
  }
  const payload = result.payload;
  if (
    typeof payload.state !== "string" ||
    !Array.isArray(payload.candidates) ||
    !payload.candidates.every(isWorkCardMapCandidateProjection) ||
    payload.phaseValidationWorkspaceId !== "phase-validation" ||
    typeof payload.reason !== "string"
  ) {
    return null;
  }
  if (
    (payload.state === "ready" || payload.state === "all-complete") &&
    typeof payload.phaseId === "string" &&
    typeof payload.sourceWorkCardPlanPath === "string"
  ) {
    return {
      state: payload.state,
      phaseId: payload.phaseId,
      sourceWorkCardPlanPath: payload.sourceWorkCardPlanPath,
      candidates: payload.candidates,
      phaseValidationWorkspaceId: "phase-validation",
      reason: payload.reason,
    };
  }
  if (payload.state === "needs-attention") {
    return {
      state: "needs-attention",
      phaseId: typeof payload.phaseId === "string" ? payload.phaseId : undefined,
      sourceWorkCardPlanPath: typeof payload.sourceWorkCardPlanPath === "string" ? payload.sourceWorkCardPlanPath : undefined,
      candidates: payload.candidates,
      phaseValidationWorkspaceId: "phase-validation",
      reason: payload.reason,
    };
  }
  return null;
}

function workCardRepairProjectionFromResult(
  result: RuntimeActionResult | null,
): WorkCardRepairProjection | null {
  if (!result || !isAppRecord(result.payload)) {
    return null;
  }
  const payload = result.payload;
  if (
    ![
      "handoff-needed",
      "handoff-ready",
      "draft-pending",
      "repair-card-reviewable",
      "needs-attention",
    ].includes(String(payload.state)) ||
    typeof payload.canCreateRepairHandoff !== "boolean" ||
    typeof payload.canPrepareArchitectHandoff !== "boolean" ||
    typeof payload.canCopyArchitectHandoff !== "boolean" ||
    typeof payload.reason !== "string"
  ) {
    return null;
  }
  return {
    state: payload.state as WorkCardRepairProjection["state"],
    phaseId: stringOrUndefined(payload.phaseId),
    parentWorkCardId: stringOrUndefined(payload.parentWorkCardId),
    repairId: stringOrUndefined(payload.repairId),
    evidencePath: stringOrUndefined(payload.evidencePath),
    evidenceRevision: typeof payload.evidenceRevision === "number" ? payload.evidenceRevision : undefined,
    primaryEvidenceDocument: isWorkCardRepairEvidenceDocument(payload.primaryEvidenceDocument)
      ? payload.primaryEvidenceDocument
      : undefined,
    supportingEvidenceDocuments: Array.isArray(payload.supportingEvidenceDocuments)
      ? payload.supportingEvidenceDocuments.filter(isWorkCardRepairEvidenceDocument)
      : undefined,
    operatorValidationNotes: stringOrUndefined(payload.operatorValidationNotes),
    advisorySummary: stringOrUndefined(payload.advisorySummary),
    repairDefectText: stringOrUndefined(payload.repairDefectText),
    repairOrigin: payload.repairOrigin === "preValidationReportReview" || payload.repairOrigin === "postValidationRecord"
      ? payload.repairOrigin
      : undefined,
    repairWorkCardTarget: stringOrUndefined(payload.repairWorkCardTarget),
    returnTarget: stringOrUndefined(payload.returnTarget) as WorkCardRepairProjection["returnTarget"],
    handoffPath: stringOrUndefined(payload.handoffPath),
    handoffRevision: typeof payload.handoffRevision === "number" ? payload.handoffRevision : undefined,
    canCreateRepairHandoff: payload.canCreateRepairHandoff,
    canPrepareArchitectHandoff: payload.canPrepareArchitectHandoff,
    canCopyArchitectHandoff: payload.canCopyArchitectHandoff,
    reason: payload.reason,
  };
}

function isWorkCardRepairEvidenceDocument(value: unknown): value is NonNullable<WorkCardRepairProjection["primaryEvidenceDocument"]> {
  if (!isAppRecord(value)) {
    return false;
  }
  return (
    [
      "primary-validation-record",
      "primary-implementer-report",
      "supporting-implementer-report",
      "supporting-formal-work-card",
    ].includes(String(value.role)) &&
    typeof value.label === "string" &&
    typeof value.markdownPath === "string" &&
    ["readable", "missing", "invalid", "read-error"].includes(String(value.documentReadState)) &&
    (value.logicalDocumentId === undefined || typeof value.logicalDocumentId === "string") &&
    (value.artifactRevision === undefined || typeof value.artifactRevision === "number") &&
    (value.disposition === undefined || typeof value.disposition === "string") &&
    (value.readError === undefined || typeof value.readError === "string") &&
    (value.bodyMarkdown === undefined || typeof value.bodyMarkdown === "string")
  );
}

function isWorkCardMapCandidateProjection(value: unknown): value is WorkCardMapCandidateProjection {
  const formalTargetKey = ["formal", "WorkCard", "MarkdownPath"].join("");
  return isAppRecord(value) &&
    typeof value.candidateId === "string" &&
    typeof value.order === "number" &&
    typeof value.title === "string" &&
    typeof value.purpose === "string" &&
    Array.isArray(value.dependsOn) &&
    value.dependsOn.every((entry) => typeof entry === "string") &&
    (value.status === undefined ||
      value.status === "Complete" ||
      value.status === "Eligible" ||
      value.status === "Ineligible") &&
    typeof value.reason === "string" &&
    Array.isArray(value.evidencePaths) &&
    value.evidencePaths.every((entry) => typeof entry === "string") &&
    typeof value.handoffMarkdownPath === "string" &&
    typeof value[formalTargetKey] === "string" &&
    (value.isActive === undefined || typeof value.isActive === "boolean");
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function resolveSelectedIssueId(
  issues: IssueRecordProjection[],
  preferredIssueId: string | null,
): string | null {
  if (preferredIssueId && issues.some((issue) => issue.issueId === preferredIssueId)) {
    return preferredIssueId;
  }
  return issues.at(-1)?.issueId ?? null;
}

function currentModelMatchesCandidate(model: CurrentWorkspaceModel, candidateId: string): boolean {
  const workCard = model.executionContext.workCard;
  return model.currentWorkCardId === candidateId ||
    workCard.workCardId === candidateId ||
    workCard.parentWorkCardId === candidateId;
}

function isAppRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function actionFeedbackForDisplay(
  attachmentError: string,
  pollingError: string,
  actionFeedback: ArchitectActionFeedback,
): ArchitectActionFeedback {
  if (attachmentError) {
    return { kind: "error", message: attachmentError };
  }
  if (pollingError) {
    return { kind: "error", message: pollingError };
  }
  return actionFeedback;
}

function destinationWorkspaceIdFromResolver(result: FirstNonApprovedResult): WorkspaceId {
  if (
    result.status === "pre-intake" ||
    result.status === "project-intake-incomplete" ||
    result.status === "project-intake-conflict" ||
    result.status === "waiting-for-architect-interview"
  ) {
    return result.activeWorkspaceId;
  }

  if (result.status === "current") {
    return result.document.owningWorkspaceId;
  }

  return "project-close";
}

function preferredDocumentIdFromResolver(
  result: FirstNonApprovedResult | null,
  destinationWorkspaceId: WorkspaceId,
): string | null {
  if (!result) {
    return null;
  }

  if (
    result.status === "waiting-for-architect-interview" &&
    destinationWorkspaceId === result.activeWorkspaceId
  ) {
    return result.promptLogicalDocumentId;
  }

  if (
    result.status === "current" &&
    destinationWorkspaceId === result.document.owningWorkspaceId
  ) {
    return result.document.logicalDocumentId;
  }

  return null;
}

function documentIdForWorkflowStep({
  destinationWorkspaceId,
  documents,
  preferredDocumentId,
  resolverResult,
  selectedDocumentId,
}: {
  destinationWorkspaceId: WorkspaceId;
  documents: PlanningDocumentSummary[];
  preferredDocumentId?: string | null;
  resolverResult: FirstNonApprovedResult | null;
  selectedDocumentId: string | null;
}): string | null {
  const resolverPreferredId =
    preferredDocumentId ?? preferredDocumentIdFromResolver(resolverResult, destinationWorkspaceId);
  const resolverPreferredDocument = documents.find(
    (document) =>
      document.logicalDocumentId === resolverPreferredId &&
      classifyPlanningDocument(document).workspaceId === destinationWorkspaceId &&
      isWorkflowReviewDocument(document, destinationWorkspaceId),
  );
  if (resolverPreferredDocument) {
    return resolverPreferredDocument.logicalDocumentId;
  }

  const currentReviewDocument = documents.find(
    (document) =>
      classifyPlanningDocument(document).workspaceId === destinationWorkspaceId &&
      isWorkflowReviewDocument(document, destinationWorkspaceId) &&
      document.effectiveDisposition !== "Approved",
  );
  if (currentReviewDocument) {
    return currentReviewDocument.logicalDocumentId;
  }

  const selectedDocumentStillOwned = documents.find(
    (document) =>
      document.logicalDocumentId === selectedDocumentId &&
      classifyPlanningDocument(document).workspaceId === destinationWorkspaceId &&
      isWorkflowReviewDocument(document, destinationWorkspaceId),
  );
  if (selectedDocumentStillOwned) {
    return selectedDocumentStillOwned.logicalDocumentId;
  }

  const reviewDocument = documents.find(
    (document) =>
      classifyPlanningDocument(document).workspaceId === destinationWorkspaceId &&
      isWorkflowReviewDocument(document, destinationWorkspaceId),
  );

  return reviewDocument?.logicalDocumentId ?? null;
}

function FigmaHeaderStatus({
  label,
  mono = false,
  value,
}: {
  label: string;
  mono?: boolean;
  value: string;
}): JSX.Element {
  return (
    <div className="figma-header-status">
      <span>{label}</span>
      <strong className={mono ? "mono" : undefined}>{value}</strong>
    </div>
  );
}

function projectDisplayName(selection: WorkspaceSelection): string {
  if (!selection.ok) {
    return "No Project Selected";
  }

  const normalized = selection.workspaceRoot.replace(/\\/g, "/");
  return normalized.split("/").filter(Boolean).at(-1) ?? "Selected Project";
}

function CurrentWorkspaceBanner({
  activeWorkspaceLabel,
  model,
  resolverResult,
  suppress,
}: {
  activeWorkspaceLabel: string;
  model: CurrentWorkspaceModel | null;
  resolverResult: FirstNonApprovedResult | null;
  suppress?: boolean;
}): JSX.Element | null {
  if (suppress) {
    return null;
  }
  if (model?.activeWorkspaceId === "work-card-intake") {
    return null;
  }
  const current = resolverResult?.status === "current" ? resolverResult.document : null;
  const requiredWorkspaceLabel = model
    ? workspaceDefinitions.find((definition) => definition.id === model.activeWorkspaceId)?.label
    : null;
  return (
    <section className="current-workspace-banner" aria-label="Current required workflow step">
      <div>
        <span>Current Required Workflow Step</span>
        <strong>{requiredWorkspaceLabel ?? current?.owningWorkspace ?? activeWorkspaceLabel}</strong>
      </div>
      <div>
        <span>Current Target</span>
        <strong>{model?.currentTarget ?? current?.displayTitle ?? "No current target"}</strong>
      </div>
      <div>
        <span>Eligibility</span>
        <strong>{model?.eligibility ?? "Resolve current evidence"}</strong>
      </div>
      <div className="banner-wide">
        <span>Required Action</span>
        <strong>{model?.requiredAction ?? current?.reason ?? "Refresh to resolve the required action."}</strong>
      </div>
      <div className="banner-wide">
        <span>Expected Output</span>
        <strong>{model?.expectedOutput ?? "Current workflow output will appear here."}</strong>
      </div>
      <div className="banner-wide">
        <span>Evidence</span>
        <strong>{model?.sourceEvidence.join("; ") || "No source evidence selected."}</strong>
      </div>
      <div className="banner-wide">
        <span>Next State</span>
        <strong>{model?.expectedNextState ?? "Refresh resolves the next lifecycle document."}</strong>
      </div>
      {model?.blocker ? (
        <div className="banner-wide blocker">
          <span>Blocker</span>
          <strong>{model.blocker}</strong>
        </div>
      ) : null}
    </section>
  );
}

function CurrentDocumentSummary({
  resolverResult,
  selectedDocument,
}: {
  resolverResult: FirstNonApprovedResult | null;
  selectedDocument: PlanningDocumentDetail | null;
}): JSX.Element {
  if (resolverResult?.status === "pre-intake") {
    return (
      <section className="current-document-summary">
        <span>Current workflow step</span>
        <strong>Project Intake Capture</strong>
        <span>Current document</span>
        <strong>No Project Intake captured</strong>
        <span>Effective disposition</span>
        <strong>Pending</strong>
        <span>Position</span>
        <strong>Pre-intake</strong>
      </section>
    );
  }

  if (resolverResult?.status === "all-approved") {
    return (
      <section className="current-document-summary">
        <span>Current workflow step</span>
        <strong>All planning documents approved</strong>
      </section>
    );
  }

  if (resolverResult?.status === "project-intake-incomplete") {
    return (
      <section className="current-document-summary">
        <span>Current workflow step</span>
        <strong>Project Intake Capture</strong>
        <span>Current document</span>
        <strong>Generated prompt missing or incomplete</strong>
        <span>Effective disposition</span>
        <strong>Local error</strong>
        <span>Position</span>
        <strong>{resolverResult.totalDocumentCount} planning document(s)</strong>
      </section>
    );
  }

  if (resolverResult?.status === "project-intake-conflict") {
    return (
      <section className="current-document-summary">
        <span>Current workflow step</span>
        <strong>Project Intake Capture</strong>
        <span>Current document</span>
        <strong>Multiple canonical Project Intake documents</strong>
        <span>Effective disposition</span>
        <strong>Conflict</strong>
        <span>Position</span>
        <strong>{resolverResult.totalDocumentCount} planning document(s)</strong>
      </section>
    );
  }

  if (resolverResult?.status === "waiting-for-architect-interview") {
    return (
      <section className="current-document-summary">
        <span>Current workflow step</span>
        <strong>Architect Interview</strong>
        <span>Current document</span>
        <strong>Project Architect Interview Prompt</strong>
        <span>Effective disposition</span>
        <strong>Approved handoff</strong>
        <span>Position</span>
        <strong>Waiting for Architect output</strong>
      </section>
    );
  }

  const currentDocument: ResolvedCurrentDocument | null =
    resolverResult?.status === "current" ? resolverResult.document : null;

  return (
    <section className="current-document-summary">
      <span>Current workflow step</span>
      <strong>{currentDocument?.owningWorkspace ?? "Manual review"}</strong>
      <span>Current document</span>
      <strong>{selectedDocument?.displayFilename ?? currentDocument?.displayTitle ?? "Select a document"}</strong>
      <span>Effective disposition</span>
      <strong>{selectedDocument?.effectiveDisposition ?? currentDocument?.effectiveDisposition ?? "Pending"}</strong>
      <span>Position</span>
      <strong>
        {currentDocument
          ? `Document ${currentDocument.orderPosition} of ${currentDocument.totalDocumentCount}`
          : "Document not resolved"}
      </strong>
    </section>
  );
}
