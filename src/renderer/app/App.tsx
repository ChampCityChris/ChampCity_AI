import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Clipboard, ExternalLink, FileText, FolderOpen, RefreshCw, RotateCcw } from "lucide-react";
import {
  type CloseReturnSelectionProjection,
  type ClosureDecision,
  type CodexImplementerExecutionModel,
  type CurrentWorkspaceModel,
  type ArchitectOutputWorkspaceModel,
  projectTypeOptions,
  type RuntimeActionResult,
  type WorkCardCandidateSelectionExplanation,
  type WorkCardIntakeProjection,
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
import { WorkCardSelectionWorkspace } from "./WorkCardSelectionWorkspace";
import { FigmaAppStrip } from "./figma/FigmaAppStrip";
import { FigmaBrowserPanel } from "./figma/FigmaBrowserPanel";
import { FigmaSidebar, type FigmaThemeMode } from "./figma/FigmaSidebar";

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
  "phase-validation",
  "phase-close",
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
const architectOutputCopiedFeedback =
  "Architect handoff copied. Paste and send it manually in embedded ChatGPT.";
const figmaThemePreferenceKey = "champcity:figma-theme";

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
  const [workspace, setWorkspace] = useState<WorkspaceSelection>(fallbackWorkspace);
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
  const [isSubmittingIntake, setIsSubmittingIntake] = useState(false);
  const [projectIntake, setProjectIntake] =
    useState<ProjectIntakeSubmission>(emptyProjectIntake);
  const [architectStatus, setArchitectStatus] =
    useState<ArchitectBrowserFoundationStatus | null>(null);
  const [architectOutputModel, setArchitectOutputModel] =
    useState<ArchitectOutputWorkspaceModel | null>(null);
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
  const [codexExecution, setCodexExecution] =
    useState<CodexImplementerExecutionModel | null>(null);
  const [isCodexExecutionActionRunning, setIsCodexExecutionActionRunning] = useState(false);
  const [viewedArchitectOutputRevisionKeys, setViewedArchitectOutputRevisionKeys] =
    useState<string[]>([]);
  const [architectActionFeedback, setArchitectActionFeedback] =
    useState<ArchitectActionFeedback>(null);
  const [architectOutputPollingError, setArchitectOutputPollingError] = useState("");
  const [workCardCloseProjectionResult, setWorkCardCloseProjectionResult] =
    useState<RuntimeActionResult | null>(null);
  const [closeReturnSelectionResult, setCloseReturnSelectionResult] =
    useState<RuntimeActionResult | null>(null);
  const architectOutputFingerprintRef = useRef<string | null>(null);
  const architectOutputPollInFlightRef = useRef<number | null>(null);
  const architectOutputPollRequestRef = useRef(0);
  const codexExecutionPreviousStateRef = useRef<CodexImplementerExecutionModel["state"] | null>(null);
  const architectBoundsSequenceRef = useRef(0);
  const architectAttachmentGenerationRef = useRef(0);
  const architectBoundsRafRef = useRef<number | null>(null);
  const architectFeedbackTimeoutRef = useRef<number | null>(null);
  const architectAttachmentCoordinatorRef =
    useRef<ReturnType<typeof createArchitectAttachmentCoordinator> | null>(null);
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
  const isWorkCardClose =
    activeWorkspaceId === "work-card-close";
  const isWorkCardSelection =
    activeWorkspaceId === "phase-work-card-selection";
  const isPhaseMapFigmaWorkspace =
    activeWorkspaceId === "project-phase-map";
  const isVisibleArchitectOutputWorkspace =
    isArchitectEnabledWorkspace(activeWorkspaceId) && !isWorkCardPlanningPreparation;
  const shouldAttachEmbeddedArchitectSurface =
    ((isVisibleArchitectOutputWorkspace && !isPhaseMapFigmaWorkspace) || isWorkCardReportReview) &&
    isArchitectPaneVisible;

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
        void refreshDocuments({ useResolver: true });
      }
    });
  }, []);

  useEffect(() => {
    return () => {
      if (architectFeedbackTimeoutRef.current !== null) {
        window.clearTimeout(architectFeedbackTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!selectedDocumentId) {
      setSelectedDocument(null);
      setSelectedStatus("");
      return;
    }

    void loadDocument(selectedDocumentId);
  }, [selectedDocumentId]);

  useEffect(() => {
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
  }, [activeWorkspaceId, currentModel?.workCardBuildingReview, currentModel?.workCardIntake, documents, selectedDocumentId]);

  useEffect(() => {
    if (!workspace.ok || activeWorkspaceId !== "work-card-building-review") {
      setCodexExecution(null);
      codexExecutionPreviousStateRef.current = null;
      return;
    }

    let isDisposed = false;
    const refreshStatus = async (): Promise<void> => {
      try {
        const status = await window.champcity.getCodexImplementerExecutionStatus();
        if (isDisposed) {
          return;
        }
        setCodexExecution(status);
        const previousState = codexExecutionPreviousStateRef.current;
        codexExecutionPreviousStateRef.current = status.state;
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
  }, [activeWorkspaceId, workspace.ok, codexExecution?.state]);

  useEffect(() => {
    if (!workspace.ok || activeWorkspaceId !== "work-card-close") {
      setWorkCardCloseProjectionResult(null);
      return;
    }
    void refreshWorkCardCloseProjection();
  }, [activeWorkspaceId, workspace.ok]);

  useEffect(() => {
    if (activeWorkspaceId !== "phase-work-card-selection") {
      setCloseReturnSelectionResult(null);
    }
  }, [activeWorkspaceId]);

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
        }).then((status) => {
          if (sequence === architectBoundsSequenceRef.current) {
            applyArchitectStatus(status);
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
    if (!workspace.ok || !isVisibleArchitectOutputWorkspace) {
      return;
    }

    void refreshArchitectOutputWorkspace({ autoSelectOutput: true, force: true });
    const interval = window.setInterval(() => {
      void refreshArchitectStatus();
      void refreshArchitectOutputWorkspace({ autoSelectOutput: true, quiet: true });
    }, 3000);

    return () => {
      window.clearInterval(interval);
      architectOutputPollRequestRef.current += 1;
      architectOutputPollInFlightRef.current = null;
    };
  }, [activeWorkspaceId, isVisibleArchitectOutputWorkspace, workspace.ok]);

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
    });
    if (architectOutputModel) {
      switch (architectOutputModel.workspaceId) {
        case "architect-interview":
        case "project-planning-review":
        case "project-phase-map":
        case "phase-interview":
          statuses[architectOutputModel.workspaceId] = architectOutputModel.railStatus;
          break;
        default:
          break;
      }
    }
    return statuses;
  }, [architectInterviewRailStatus, architectOutputModel, documents, projectIntakeRailStatus]);
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
  const selectedDocumentHasLocalError =
    Boolean(selectedSummary?.readError);
  async function chooseWorkspace(): Promise<void> {
    setIsChoosing(true);
    setDocumentError("");
    try {
      await activateWorkspaceSelection(await window.champcity.chooseWorkspaceFolder());
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
    transitionToWorkflowStep("project-intake-capture", { documents: [] });
  }

  async function chooseProjectRepository(): Promise<void> {
    setIsChoosingProjectRepository(true);
    setDocumentError("");
    try {
      await activateWorkspaceSelection(await window.champcity.chooseWorkspaceFolder());
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
      const nextDocumentId = selectedSlot?.logicalDocumentId ?? null;

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
    }
  }

  async function copyArchitectHandoff(): Promise<void> {
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
    setDocumentError("");
    setArchitectFeedback(null);
    try {
      const nextModel = await window.champcity.prepareArchitectOutputHandoff(activeWorkspaceId);
      setArchitectOutputModel(nextModel);
      setArchitectFeedback({ kind: "success", message: architectOutputPreparedFeedback }, 3500);
      await refreshDocuments({ useResolver: true });
      await refreshArchitectOutputWorkspace({ force: true, autoSelectOutput: true });
    } catch (error) {
      setArchitectFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Architect handoff could not be prepared.",
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
      );
      setArchitectOutputModel(nextModel);
      setArchitectOutputReviewStatus("");
      setArchitectOutputReviewNotes("");
      await refreshDocuments({ useResolver: true });
      await refreshArchitectOutputWorkspace({ force: true, autoSelectOutput: true });
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

  async function runWorkspaceAction(action: () => Promise<RuntimeActionResult>): Promise<void> {
    setDocumentError("");
    setFeedback("");
    try {
      const result = await action();
      setFeedback(result.message);
      await refreshDocuments();
      await refreshCurrentModel();
    } catch (error) {
      setDocumentError(error instanceof Error ? error.message : "Workspace action failed.");
    }
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

  async function returnFromWorkCardCloseToSelection(): Promise<void> {
    setIsApplying(true);
    setDocumentError("");
    setFeedback("");
    try {
      const selectionResult = await window.champcity.getCloseReturnSelectionProjection();
      setCloseReturnSelectionResult(selectionResult);
      const projection = closeReturnSelectionProjectionFromResult(selectionResult);
      if (!projection) {
        setDocumentError("Close-return selection projection was malformed.");
        await refreshCurrentModel();
        return;
      }
      setWorkCardCloseProjectionResult(
        {
          ok: true,
          action: "currentWorkflow:getWorkCardCloseProjection",
          message: projection.close.reason,
          payload: projection.close,
        },
      );

      const nextDocuments = await window.champcity.listDocuments();
      applyDocumentInventory(nextDocuments);
      await refreshCurrentModel();
      const nextResolverResult = await window.champcity.resolveCurrentDocument();
      setResolverResult(nextResolverResult);
      transitionToWorkflowStep("phase-work-card-selection", {
        documents: nextDocuments,
        preferredDocumentId: preferredDocumentIdFromResolver(
          nextResolverResult,
          "phase-work-card-selection",
        ),
        resolverResult: nextResolverResult,
      });
      setFeedback(selectionResult.message);
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

  async function startCodexImplementerExecution(): Promise<void> {
    setIsCodexExecutionActionRunning(true);
    setDocumentError("");
    setFeedback("");
    try {
      const status = await window.champcity.startCodexImplementerExecution();
      setCodexExecution(status);
      codexExecutionPreviousStateRef.current = status.state;
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

  async function cancelCodexImplementerExecution(): Promise<void> {
    setIsCodexExecutionActionRunning(true);
    setDocumentError("");
    try {
      const status = await window.champcity.cancelCodexImplementerExecution();
      setCodexExecution(status);
      if (status.failureReason) {
        setFeedback(status.failureReason);
      }
    } catch (error) {
      setDocumentError(error instanceof Error ? error.message : "Codex Implementer execution could not be cancelled.");
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
      });
      setFeedback(result.message);
      setOperatorValidationNotes("");
      setAdvisorySummary("");
      setRepairDefectText("");
      const nextDocuments = await window.champcity.listDocuments();
      applyDocumentInventory(nextDocuments);
      await refreshCurrentModel();
      const nextResolverResult = await window.champcity.resolveCurrentDocument();
      setResolverResult(nextResolverResult);
      if (selectedDocumentId) {
        await loadDocument(selectedDocumentId, { preserveOnFailure: true });
      }
    } catch (error) {
      setDocumentError(error instanceof Error ? error.message : "Operator validation decision could not be applied.");
    } finally {
      setIsApplying(false);
    }
  }

  async function generateWorkCardIntakeAndTransition(): Promise<void> {
    if (isWorkCardIntakeGenerating) {
      return;
    }
    setIsWorkCardIntakeGenerating(true);
    setWorkCardIntakeError("");
    setWorkCardIntakeFeedback("");
    setDocumentError("");
    setFeedback("");
    try {
      const result = await window.champcity.generateCurrentHandoff();
      const nextDocuments = await window.champcity.listDocuments();
      applyDocumentInventory(nextDocuments);
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

  async function generateCloseReturnNextIntakeAndTransition(): Promise<void> {
    if (isWorkCardIntakeGenerating) {
      return;
    }
    setIsWorkCardIntakeGenerating(true);
    setWorkCardIntakeError("");
    setWorkCardIntakeFeedback("");
    setDocumentError("");
    setFeedback("");
    try {
      const closeReturnSelection = closeReturnSelectionProjectionFromResult(closeReturnSelectionResult);
      const selectedCandidateId = closeReturnSelection?.state === "selected"
        ? closeReturnSelection.workCardIntake.candidate.candidateId
        : null;
      const result = await window.champcity.generateCloseReturnNextIntakeHandoff();
      const nextDocuments = await window.champcity.listDocuments();
      applyDocumentInventory(nextDocuments);
      const nextModel = await refreshCurrentModel();
      const nextResolverResult = await window.champcity.resolveCurrentDocument();
      setResolverResult(nextResolverResult);
      if (
        nextModel?.activeWorkspaceId !== "work-card-planning" ||
        nextModel.currentWorkCardId !== selectedCandidateId ||
        nextModel.workCardIntake
      ) {
        const resolvedWorkspace = nextModel?.activeWorkspaceId ?? "unresolved";
        setWorkCardIntakeError(
          `Close-return intake handoff generated, but the refreshed workspace resolved to ${resolvedWorkspace} for ${nextModel?.currentWorkCardId ?? "no Work Card"} instead of ${selectedCandidateId ?? "the selected candidate"}.`,
        );
        setWorkCardIntakeFeedback(result.message);
        return;
      }
      setSelectedDocumentId(null);
      setSelectedDocument(null);
      setSelectedStatus("");
      transitionToWorkflowStep("work-card-planning", {
        documents: nextDocuments,
        preferredDocumentId: preferredDocumentIdFromResolver(
          nextResolverResult,
          "work-card-planning",
        ),
        resolverResult: nextResolverResult,
      });
      setCloseReturnSelectionResult(null);
      await refreshArchitectOutputWorkspace({
        autoSelectOutput: true,
        force: true,
        refreshRepositoryProjection: false,
        workspaceId: "work-card-planning",
      });
      setFeedback(result.message);
    } catch (error) {
      setWorkCardIntakeError(error instanceof Error ? error.message : "Close-return Work Card Intake handoff could not be generated.");
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

  async function activateWorkspaceSelection(selection: WorkspaceSelection): Promise<void> {
    if (!selection.ok) {
      setDocumentError(selection.reason);
      return;
    }

    clearRepositoryDerivedState();
    setWorkspace(selection);
    setProjectIntake((current) => ({
      ...current,
      projectRepository: selection.workspaceRoot,
    }));
    await refreshDocuments({ useResolver: true });
  }

  function clearRepositoryDerivedState(): void {
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
    setArchitectStatus(null);
    setArchitectOutputModel(null);
    setSelectedArchitectOutputSlotId(null);
    setArchitectOutputReviewStatus("");
    setArchitectOutputReviewNotes("");
    setCodexExecution(null);
    setIsCodexExecutionActionRunning(false);
    setViewedArchitectOutputRevisionKeys([]);
    setArchitectFeedback(null);
    setArchitectOutputPollingError("");
    architectOutputFingerprintRef.current = null;
    architectOutputPollRequestRef.current += 1;
    architectOutputPollInFlightRef.current = null;
    codexExecutionPreviousStateRef.current = null;
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
    setActiveWorkspaceId(destinationWorkspaceId);
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
      await window.champcity.setDocumentDisposition(selectedDocumentId, selectedStatus);
      const nextDocuments = await window.champcity.listDocuments();
      applyDocumentInventory(nextDocuments);
      const nextResolverResult = await window.champcity.resolveCurrentDocument();
      setResolverResult(nextResolverResult);
      const nextCurrentModel = await refreshCurrentModel();
      if (isArchitectEnabledWorkspace(activeWorkspaceId)) {
        await refreshArchitectOutputWorkspace({
          force: true,
          refreshRepositoryProjection: false,
        });
      }
      if (
        selectedStatus === "Approved" &&
        nextResolverResult.status === "current" &&
        activeWorkspaceId !== "project-intake-capture"
      ) {
        selectResolverResult(nextResolverResult, {
          currentModel: nextCurrentModel,
          documents: nextDocuments,
        });
        setFeedback(getResolverFeedback(nextResolverResult));
      } else if (selectedStatus === "Approved" && nextResolverResult.status === "all-approved") {
        selectResolverResult(nextResolverResult, {
          currentModel: nextCurrentModel,
          documents: nextDocuments,
        });
        setFeedback(nextResolverResult.message);
      } else {
        await loadDocument(selectedDocumentId);
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
    (isVisibleArchitectOutputWorkspace && !isPhaseMapFigmaWorkspace) || isWorkCardReportReview;
  const isFigmaActionWorkspace =
    activeWorkspaceId !== "project-intake-capture" &&
    !isWorkCardPlanningPreparation &&
    !isWorkCardBuildingReview &&
    !isWorkCardReportReview &&
    !isVisibleArchitectOutputWorkspace &&
    !isWorkCardClose &&
    !isWorkCardSelection;
  const usesFigmaWorkspaceBody =
    activeWorkspaceId === "project-intake-capture" ||
    isVisibleArchitectOutputWorkspace ||
    isWorkCardBuildingReview ||
    isWorkCardReportReview ||
    isWorkCardClose ||
    isWorkCardSelection ||
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
    activeWorkspaceId === "project-intake-capture"
      ? "Project Intake Questionnaire"
      : activeWorkspace.label;

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

  return (
    <div className={`app-root ${themeMode === "dark" ? "dark" : ""}`}>
      <FigmaAppStrip />
      <NestedWorkflowRail
        activeWorkspaceId={activeWorkspaceId}
        architectInterviewStatus={architectInterviewRailStatus}
        executionContext={currentModel?.executionContext}
        onWorkspaceChange={transitionToWorkflowStep}
        projectRailStatuses={projectRailStatuses}
        projectIntakeStatus={projectIntakeRailStatus}
        requiredWorkspaceId={currentModel?.activeWorkspaceId ?? null}
        workspaceCounts={workspaceCounts}
      />

      <div className="app-body">
        <FigmaSidebar
          currentModel={currentModel}
          isChoosing={isChoosing}
          onChooseProject={chooseWorkspace}
          onClearProject={clearWorkspace}
          onThemeChange={setThemeMode}
          projectName={projectDisplayName(workspace)}
          themeMode={themeMode}
          workspace={workspace}
        />

        <section
          className={[
            "workspace-surface",
            usesFigmaWorkspaceBody ? "figma-workspace-surface" : "",
            isVisibleArchitectOutputWorkspace ? "architect-interview-surface" : "",
            isWorkCardReportReview ? "review-validation-surface" : "",
          ].filter(Boolean).join(" ")}
          aria-labelledby="workspace-heading"
          ref={workspaceSurfaceRef}
        >
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

          {!usesFigmaWorkspaceBody ? (
            <CurrentWorkspaceBanner
              activeWorkspaceLabel={activeWorkspace.label}
              model={currentModel}
              resolverResult={resolverResult}
              suppress={isWorkCardReportReview}
            />
          ) : null}

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

          {isPhaseMapFigmaWorkspace ? (
            <section
              className="figma-phase-map-workspace"
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
                    actionFeedback={architectActionFeedback}
                    attachmentError={architectAttachmentError}
                    browserStatus={architectStatus}
                    model={architectOutputModel}
                    onCopyHandoff={copyArchitectHandoff}
                    onPrepareHandoff={prepareArchitectOutputFromAction}
                    onRefresh={() => {
                      void refreshArchitectStatus();
                      void refreshArchitectOutputWorkspace({ force: true });
                    }}
                    onReloadBrowser={() => void reloadArchitectBrowser()}
                    onRetryBrowser={() => void retryArchitectBrowser()}
                    pollingError={architectOutputPollingError}
                  />
                </div>
              ) : null}
            </section>
          ) : null}

          {isFigmaActionWorkspace ? (
            <FigmaActionWorkspace
              activeWorkspaceId={activeWorkspaceId}
              documentError={documentError}
              feedback={feedback}
              inputs={actionInputs}
              model={currentModel}
              onChange={setActionInputs}
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
              onRunCodex={() => void startCodexImplementerExecution()}
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
                onCopyAdvisoryPrompt={() => void copyWorkCardAdvisoryReviewPrompt()}
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
                <FigmaBrowserPanel
                  hostRef={architectHostRef}
                  onReload={() => void reloadArchitectBrowser()}
                  onRetry={() => void retryArchitectBrowser()}
                  retryVisible={shouldShowArchitectBrowserRetry(architectStatus, architectAttachmentError)}
                  statusLabel={architectBrowserPresentation(architectStatus).label}
                />
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

          {isWorkCardSelection ? (
            <WorkCardSelectionWorkspace
              actionError={workCardIntakeError || documentError}
              actionFeedback={workCardIntakeFeedback || feedback}
              isGenerating={isWorkCardIntakeGenerating}
              model={currentModel}
              onPreparePlanning={() => void generateCloseReturnNextIntakeAndTransition()}
              projection={closeReturnSelectionProjectionFromResult(closeReturnSelectionResult)}
            />
          ) : null}

          {!isVisibleArchitectOutputWorkspace && !isWorkCardPlanningPreparation && !isWorkCardBuildingReview && !isWorkCardReportReview && !isFigmaActionWorkspace && !isWorkCardClose && !isWorkCardSelection && activeWorkspaceId !== "project-intake-capture" ? (
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
        </section>
      </div>
    </div>
  );
}

function FigmaDocumentCard({
  documentError,
  feedback,
  onCopy,
  onSelectSlot,
  selectedDocument,
  selectedSlotId,
  slots = [],
}: {
  documentError: string;
  feedback: string;
  onCopy: () => void;
  onSelectSlot?: (slotId: string, logicalDocumentId?: string) => void;
  selectedDocument: PlanningDocumentDetail | null;
  selectedSlotId?: string | null;
  slots?: ArchitectOutputWorkspaceModel["documentSlots"];
}): JSX.Element {
  const hasTabs = slots.length > 1 && Boolean(onSelectSlot);
  const selectedStatus = selectedDocument?.effectiveDisposition ?? "Pending";

  return (
    <article className="figma-document-card" aria-label="Current document">
      {hasTabs ? (
        <div className="figma-document-tabs" role="tablist" aria-label="Current output documents">
          {slots.map((slot) => {
            const isActive = selectedSlotId === slot.slotId ||
              Boolean(slot.logicalDocumentId && slot.logicalDocumentId === selectedDocument?.logicalDocumentId);
            return (
              <button
                aria-selected={isActive}
                className={isActive ? "active" : ""}
                disabled={!slot.logicalDocumentId}
                key={slot.slotId}
                onClick={() => onSelectSlot?.(slot.slotId, slot.logicalDocumentId)}
                type="button"
              >
                <FileText aria-hidden="true" size={14} />
                {slot.displayLabel}
              </button>
            );
          })}
        </div>
      ) : null}

      <header className="figma-document-card-header">
        <div className="figma-document-title-row">
          <FileText aria-hidden="true" size={14} />
          <strong>{selectedDocument?.displayFilename ?? "No document selected"}</strong>
        </div>
        <div className="figma-document-card-actions">
          {selectedDocument ? (
            <span className={`figma-document-status ${selectedStatus.toLowerCase()}`}>
              {selectedStatus}
            </span>
          ) : null}
          <button disabled={!selectedDocument} onClick={onCopy} type="button">
            <Clipboard aria-hidden="true" size={13} />
            Copy
          </button>
          <button disabled title="Open document is not exposed through the current renderer API" type="button">
            <ExternalLink aria-hidden="true" size={13} />
            Open
          </button>
        </div>
      </header>

      <div className="figma-document-path-row">
        <FileText aria-hidden="true" size={12} />
        <span>{selectedDocument?.markdownPath ?? "Repository-relative path"}</span>
      </div>

      {selectedDocumentHasError(selectedDocument, documentError) ? (
        <div className="document-error" role="status">
          {documentError || selectedDocument?.readError || "Document must be readable as canonical Markdown before applying a disposition."}
        </div>
      ) : null}

      {feedback ? <div className="document-feedback" role="status">{feedback}</div> : null}

      <div className="figma-document-card-body">
        {selectedDocument && shouldRenderPhaseMapDocumentPreview(selectedDocument) ? (
          <PhaseMapDocumentPreview document={selectedDocument} />
        ) : selectedDocument && shouldRenderWorkCardPlanDocumentPreview(selectedDocument) ? (
          <WorkCardPlanDocumentPreview document={selectedDocument} />
        ) : selectedDocument ? (
          <FigmaMarkdownBody markdown={selectedDocument.bodyMarkdown ?? selectedDocument.preview ?? ""} />
        ) : (
          <div className="figma-empty-document">
            <strong>No document yet</strong>
            <span>{neutralMessage}</span>
          </div>
        )}
      </div>

      <footer className="figma-document-card-footer">
        <span>{selectedDocument?.markdownPath ?? "Repository-relative path"}</span>
      </footer>
    </article>
  );
}

function FigmaMarkdownBody({ markdown }: { markdown: string }): JSX.Element {
  const lines = markdown.split(/\r?\n/);
  return (
    <div className="figma-markdown-body">
      {lines.map((line, index) => {
        const key = `${index}-${line.slice(0, 16)}`;
        const trimmed = line.trim();
        if (!trimmed) {
          return <div className="figma-markdown-space" key={key} />;
        }
        if (trimmed.startsWith("### ")) {
          return <h4 key={key}>{trimmed.slice(4)}</h4>;
        }
        if (trimmed.startsWith("## ")) {
          return <h3 key={key}>{trimmed.slice(3)}</h3>;
        }
        if (trimmed.startsWith("# ")) {
          return <h2 key={key}>{trimmed.slice(2)}</h2>;
        }
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <p className="figma-markdown-list-item" key={key}>
              <span aria-hidden="true">-</span>
              {trimmed.slice(2)}
            </p>
          );
        }
        return <p key={key}>{trimmed}</p>;
      })}
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
    <section className="figma-disposition-panel" aria-label="Document disposition">
      <header>
        <span>Document Disposition</span>
      </header>
      <div className="figma-disposition-row">
        <label>
          <span>Disposition</span>
          <select
            disabled={isApplying || !model?.canApplyDisposition}
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
          onClick={onReview}
          type="button"
        >
          Apply Review
        </button>
        <label className="figma-review-notes">
          <span>Review Notes</span>
          <input
            disabled={isApplying || !model?.canApplyDisposition}
            onChange={(event) => onNotesChange(event.target.value)}
            placeholder="Add notes..."
            value={notes}
          />
        </label>
      </div>
      <dl>
        <div>
          <dt>Current Document</dt>
          <dd>{selectedDocument?.displayFilename ?? "Waiting"}</dd>
        </div>
        <div>
          <dt>Effective Disposition</dt>
          <dd>{selectedDocument?.effectiveDisposition ?? "Pending"}</dd>
        </div>
        <div>
          <dt>Workflow Step</dt>
          <dd>Review & Validation</dd>
        </div>
      </dl>
      {!allCurrentRevisionsViewed && model?.canApplyDisposition ? (
        <div className="document-feedback" role="status">
          Open every current output revision before approval.
        </div>
      ) : null}
    </section>
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

function FigmaBrowserActionsPanel({
  actionFeedback,
  attachmentError,
  browserStatus,
  model,
  onCopyHandoff,
  onPrepareHandoff,
  onRefresh,
  onReloadBrowser,
  onRetryBrowser,
  pollingError,
}: {
  actionFeedback: ArchitectActionFeedback;
  attachmentError: string;
  browserStatus: ArchitectBrowserFoundationStatus | null;
  model: ArchitectOutputWorkspaceModel | null;
  onCopyHandoff: () => void;
  onPrepareHandoff: () => void;
  onRefresh: () => void;
  onReloadBrowser: () => void;
  onRetryBrowser: () => void;
  pollingError: string;
}): JSX.Element {
  const showRetryButton = shouldShowArchitectBrowserRetry(browserStatus, attachmentError);
  const actionMessage = actionFeedbackForDisplay(attachmentError, pollingError, actionFeedback);
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
        <i aria-hidden="true" />
        <button disabled={!model?.canPrepareHandoff} onClick={onPrepareHandoff} type="button">
          <FolderOpen aria-hidden="true" size={14} />
          Prepare Handoff
        </button>
        <button disabled={!model?.canCopyHandoff} onClick={onCopyHandoff} type="button">
          <Clipboard aria-hidden="true" size={14} />
          Copy Handoff
        </button>
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

function selectedDocumentHasError(
  selectedDocument: PlanningDocumentDetail | null,
  documentError: string,
): boolean {
  return Boolean(documentError || selectedDocument?.readError);
}

function FigmaActionWorkspace({
  activeWorkspaceId,
  documentError,
  feedback,
  inputs,
  model,
  onChange,
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
  onChange: (value: {
    defect: string;
    closureDecision: ClosureDecision;
    rationale: string;
    status: DocumentDispositionStatus;
  }) => void;
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
  const canApplyDisposition =
    specializedDispositionWorkspaceIds.has(activeWorkspaceId) && canApplyPhaseMapDisposition;
  const hasDocuments = workspaceGroups.some((group) => group.documents.length > 0);
  const actionPath = [model?.level, model?.stage, model?.currentPhaseId, model?.currentWorkCardId]
    .filter(Boolean)
    .join(" / ") || "Repository evidence required";

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden" aria-label={`${model?.currentTarget ?? activeWorkspaceId} workspace`}>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="scrollbar-thin flex-1 overflow-y-auto px-4 py-4">
          <div className="max-w-2xl space-y-3">
            <FigmaInfoCard>
              <FigmaInfoGrid
                items={[
                  { label: "Current Required Workflow Step", value: model?.executionContext.workCard.loopStep ?? model?.executionContext.phase.loopStep ?? model?.stage ?? "Waiting" },
                  { label: "Current Target", value: model?.currentTarget ?? "Resolve current workflow target" },
                  { label: "Eligibility", value: model?.eligibility ?? "Repository evidence required.", muted: true },
                  { label: "Required Action", value: model?.requiredAction ?? "Select a project and refresh workflow evidence.", muted: true },
                ]}
              />
              <div className="mt-3 border-t border-border pt-3">
                <p className="mb-0.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Expected Output</p>
                <p className="break-all font-mono text-[12px] text-muted-foreground">{model?.expectedOutput ?? neutralMessage}</p>
              </div>
              <div className="mt-2">
                <p className="mb-0.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Next State</p>
                <p className="text-[12px] text-muted-foreground">{model?.expectedNextState ?? "Waiting for current workflow evidence."}</p>
              </div>
            </FigmaInfoCard>

            <FigmaInfoCard>
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-0 flex-1">
                  <p className="mb-0.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Action Authority</p>
                  <p className="break-words text-[13px] font-medium text-foreground">{model?.currentTarget ?? "Current workflow action"}</p>
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
                        onClick={() => onRun(() => window.champcity.applyCurrentDisposition(inputs.status))}
                        type="button"
                      >
                        Apply Current Disposition
                      </button>
                    </>
                  ) : null}
                  {handoffWorkspaceIds.has(activeWorkspaceId) ? (
                    <button
                      className="min-h-8 rounded bg-sky-500 px-3 text-[13px] font-semibold text-[#0c0e14] transition-colors hover:bg-sky-400"
                      onClick={() => onRun(() => window.champcity.generateCurrentHandoff())}
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
                  {activeWorkspaceId === "work-card-repair" ? (
                    <>
                      <input
                        className="min-h-8 rounded border border-border bg-input-background px-2 text-[13px] text-foreground outline-none transition-colors focus:border-primary/50"
                        onChange={(event) => update("defect", event.target.value)}
                        placeholder="Bounded defect"
                        value={inputs.defect}
                      />
                      <button
                        className="min-h-8 rounded border border-amber-500/20 bg-amber-500/10 px-3 text-[13px] font-medium text-amber-400 transition-colors hover:bg-amber-500/20"
                        onClick={() => onRun(() => window.champcity.createRepairForCurrentFailure(inputs.defect))}
                        type="button"
                      >
                        Create Current Repair Handoff
                      </button>
                    </>
                  ) : null}
                  {activeWorkspaceId === "phase-validation" || activeWorkspaceId === "phase-close" ? (
                    <FigmaCloseControls
                      inputs={inputs}
                      onChange={update}
                      onRun={() => onRun(() => window.champcity.createPhaseCloseoutForCurrentPhase(inputs.closureDecision, inputs.rationale))}
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

function CurrentActionPanel({
  activeWorkspaceId,
  inputs,
  model,
  onChange,
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
  onChange: (value: {
    defect: string;
    closureDecision: ClosureDecision;
    rationale: string;
    status: DocumentDispositionStatus;
  }) => void;
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
  const canApplyDisposition =
    specializedDispositionWorkspaceIds.has(activeWorkspaceId) && canApplyPhaseMapDisposition;

  return (
    <section className="workspace-action-panel" aria-label="Workflow step actions">
      <div className="current-action-context">
        <span>Action Authority</span>
        <strong>{model?.currentTarget ?? "Resolve current workflow step to enable actions"}</strong>
        <small>
          {[model?.level, model?.stage, model?.currentPhaseId, model?.currentWorkCardId]
            .filter(Boolean)
            .join(" / ") || "Repository evidence required"}
        </small>
      </div>
      {canApplyDisposition ? (
        <>
          {statusSelect}
          <button className="apply-button" onClick={() => onRun(() => window.champcity.applyCurrentDisposition(inputs.status))} type="button">
            Apply Current Disposition
          </button>
        </>
      ) : null}
      {handoffWorkspaceIds.has(activeWorkspaceId) ? (
        <button className="apply-button" onClick={() => onRun(() => window.champcity.generateCurrentHandoff())} type="button">
          Run Current Handoff Action
        </button>
      ) : null}
      {activeWorkspaceId === "work-card-validation" ? (
        <button className="apply-button" onClick={() => onRun(() => window.champcity.createValidationAttemptForCurrentWorkCard())} type="button">
          Create Current Validation Attempt
        </button>
      ) : null}
      {activeWorkspaceId === "work-card-repair" ? (
        <>
          <label>
            <span>Bounded Defect</span>
            <input onChange={(event) => update("defect", event.target.value)} value={inputs.defect} />
          </label>
          <button className="apply-button" onClick={() => onRun(() => window.champcity.createRepairForCurrentFailure(inputs.defect))} type="button">
            Create Current Repair Handoff
          </button>
        </>
      ) : null}
      {activeWorkspaceId === "phase-validation" || activeWorkspaceId === "phase-close" ? (
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
          <button className="apply-button" onClick={() => onRun(() => window.champcity.createPhaseCloseoutForCurrentPhase(inputs.closureDecision, inputs.rationale))} type="button">
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

function closeReturnSelectionProjectionFromResult(
  result: RuntimeActionResult | null,
): CloseReturnSelectionProjection | null {
  if (!result || !isAppRecord(result.payload)) {
    return null;
  }
  const payload = result.payload;
  if (
    typeof payload.state !== "string" ||
    typeof payload.closedWorkCardId !== "string" ||
    !isAppRecord(payload.close) ||
    typeof payload.close.closed !== "boolean" ||
    typeof payload.close.returnTarget !== "string" ||
    typeof payload.close.reason !== "string" ||
    !Array.isArray(payload.explanations) ||
    !payload.explanations.every(isCandidateSelectionExplanation)
  ) {
    return null;
  }
  const base = {
    phaseId: typeof payload.phaseId === "string" ? payload.phaseId : undefined,
    closedWorkCardId: payload.closedWorkCardId,
    close: {
      closed: payload.close.closed,
      returnTarget: payload.close.returnTarget as WorkspaceId,
      reason: payload.close.reason,
    },
    explanations: payload.explanations,
  };
  if (
    payload.state === "selected" &&
    typeof payload.phaseId === "string" &&
    typeof payload.selectionReason === "string" &&
    isWorkCardIntakeProjection(payload.workCardIntake)
  ) {
    return {
      ...base,
      state: "selected",
      phaseId: payload.phaseId,
      selectionReason: payload.selectionReason,
      workCardIntake: payload.workCardIntake,
    };
  }
  if (
    (
      payload.state === "invalid-plan" ||
      payload.state === "all-complete" ||
      payload.state === "dependency-blocked" ||
      payload.state === "explicitly-resolved"
    ) &&
    typeof payload.reason === "string"
  ) {
    return {
      ...base,
      state: payload.state,
      reason: payload.reason,
    };
  }
  return null;
}

function isCandidateSelectionExplanation(value: unknown): value is WorkCardCandidateSelectionExplanation {
  return isAppRecord(value) &&
    typeof value.candidateId === "string" &&
    typeof value.state === "string" &&
    typeof value.reason === "string" &&
    Array.isArray(value.evidencePaths) &&
    value.evidencePaths.every((entry) => typeof entry === "string");
}

function isWorkCardIntakeProjection(value: unknown): value is WorkCardIntakeProjection {
  if (!isAppRecord(value) || !isAppRecord(value.candidate)) {
    return false;
  }
  const formalTargetKey = ["formal", "WorkCard", "MarkdownPath"].join("");
  return typeof value.phaseId === "string" &&
    typeof value.sourceWorkCardPlanPath === "string" &&
    typeof value.selectionReason === "string" &&
    typeof value.handoffMarkdownPath === "string" &&
    typeof value[formalTargetKey] === "string" &&
    typeof value.candidate.candidateId === "string" &&
    typeof value.candidate.order === "number" &&
    typeof value.candidate.title === "string" &&
    typeof value.candidate.purpose === "string" &&
    Array.isArray(value.candidate.dependsOn) &&
    value.candidate.dependsOn.every((entry) => typeof entry === "string") &&
    typeof value.candidate.resolutionStatus === "string" &&
    typeof value.candidate.resolutionReason === "string" &&
    Array.isArray(value.candidate.evidencePaths) &&
    value.candidate.evidencePaths.every((entry) => typeof entry === "string");
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
      classifyPlanningDocument(document).workspaceId === destinationWorkspaceId,
  );
  if (resolverPreferredDocument) {
    return resolverPreferredDocument.logicalDocumentId;
  }

  const currentReviewDocument = documents.find(
    (document) =>
      classifyPlanningDocument(document).workspaceId === destinationWorkspaceId &&
      isWorkflowReviewDocument(document) &&
      document.effectiveDisposition !== "Approved",
  );
  if (currentReviewDocument) {
    return currentReviewDocument.logicalDocumentId;
  }

  const selectedDocumentStillOwned = documents.find(
    (document) =>
      document.logicalDocumentId === selectedDocumentId &&
      classifyPlanningDocument(document).workspaceId === destinationWorkspaceId,
  );
  if (selectedDocumentStillOwned) {
    return selectedDocumentStillOwned.logicalDocumentId;
  }

  const reviewDocument = documents.find(
    (document) =>
      classifyPlanningDocument(document).workspaceId === destinationWorkspaceId &&
      isWorkflowReviewDocument(document),
  );

  return reviewDocument?.logicalDocumentId ?? null;
}

function isWorkflowReviewDocument(document: PlanningDocumentSummary): boolean {
  return document.metadata.participationRole !== "nonReviewHandoff";
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
