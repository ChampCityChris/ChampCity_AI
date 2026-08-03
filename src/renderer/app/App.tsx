import { useEffect, useMemo, useRef, useState } from "react";
import { Clipboard, FolderOpen, RefreshCw, RotateCcw } from "lucide-react";
import {
  type ClosureDecision,
  type CurrentWorkspaceModel,
  type ArchitectOutputWorkspaceModel,
  projectTypeOptions,
  type RuntimeActionResult,
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
import { deriveProjectLifecycleRailStatuses } from "../../shared/workspaces/projectLifecycleRailStatus";
import {
  createArchitectAttachmentCoordinator,
  shouldShowArchitectBrowserRetry,
  type ArchitectHostMeasurement,
} from "../../shared/architectInterview/architectBrowserAttachmentCoordinator";
import { NestedWorkflowRail } from "./NestedWorkflowRail";
import {
  PhaseMapDocumentPreview,
  shouldRenderPhaseMapDocumentPreview,
} from "./phaseMapPresentation";
import {
  shouldRenderWorkCardPlanDocumentPreview,
  WorkCardPlanDocumentPreview,
} from "./workCardPlanPresentation";
import { ExecutionContextDashboard } from "./ExecutionContextDashboard";
import {
  buildArchitectOutputEvidenceFingerprint,
  markSingleDisplayedArchitectOutputRevisionViewed,
  presentedRevisionsForArchitectOutputModel,
  revisionKeyForArchitectOutputSlot,
  selectArchitectOutputSlot,
} from "./architectOutputWorkspaceRefresh";
import { WorkCardIntakeWorkspace } from "./WorkCardIntakeWorkspace";

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
  "work-card-building-review",
  "work-card-validation",
  "phase-validation",
  "phase-close",
  "project-validation",
  "project-close",
]);
const workCardArchitectLayoutWorkspaceIds = new Set<WorkspaceId>([
  "work-card-planning",
  "work-card-repair",
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
  const [viewedArchitectOutputRevisionKeys, setViewedArchitectOutputRevisionKeys] =
    useState<string[]>([]);
  const [architectActionFeedback, setArchitectActionFeedback] =
    useState<ArchitectActionFeedback>(null);
  const [architectOutputPollingError, setArchitectOutputPollingError] = useState("");
  const architectOutputFingerprintRef = useRef<string | null>(null);
  const architectOutputPollInFlightRef = useRef<number | null>(null);
  const architectOutputPollRequestRef = useRef(0);
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
  const isVisibleArchitectOutputWorkspace =
    isArchitectEnabledWorkspace(activeWorkspaceId) && !isWorkCardPlanningPreparation;

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
  }, [activeWorkspaceId, currentModel?.workCardIntake]);

  useEffect(() => {
    if (!workspace.ok) {
      return;
    }

    const shouldAttachEmbeddedSurface = isVisibleArchitectOutputWorkspace;
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
  }, [activeWorkspaceId, isVisibleArchitectOutputWorkspace, workspace.ok]);

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
  const architectInterviewRailStatus = architectInterviewRailStatusFromGenericModel(
    architectOutputModel,
  );
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
    options: { autoSelectOutput?: boolean; autoSelectNewOutput?: boolean; force?: boolean; quiet?: boolean; refreshRepositoryProjection?: boolean } = {},
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
      const nextModel = await window.champcity.getArchitectOutputWorkspaceModel(activeWorkspaceId);
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
    setViewedArchitectOutputRevisionKeys([]);
    setArchitectFeedback(null);
    setArchitectOutputPollingError("");
    architectOutputFingerprintRef.current = null;
    architectOutputPollRequestRef.current += 1;
    architectOutputPollInFlightRef.current = null;
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

  return (
    <main className="app-root">
      <NestedWorkflowRail
        activeWorkspaceId={activeWorkspaceId}
        architectInterviewStatus={architectInterviewRailStatus}
        onWorkspaceChange={transitionToWorkflowStep}
        projectRailStatuses={projectRailStatuses}
        projectIntakeStatus={projectIntakeRailStatus}
        requiredWorkspaceId={currentModel?.activeWorkspaceId ?? null}
        workspaceCounts={workspaceCounts}
      />

      <div className="app-body">
        <aside className="sidebar" aria-label="Project navigation">
          <section className="project-selector" aria-label="Selected Project">
            <div className="project-selector-summary">
              <span>Selected Project</span>
              <strong>{projectDisplayName(workspace)}</strong>
            </div>
            <div className="project-selector-actions">
              <button
                className="icon-button text-button"
                disabled={isChoosing}
                onClick={chooseWorkspace}
                title="Choose project"
                type="button"
              >
                <FolderOpen aria-hidden="true" size={18} />
                {isChoosing ? "Choosing..." : "Choose Project"}
              </button>
              {workspace.ok ? (
                <button
                  className="icon-button text-button"
                  onClick={clearWorkspace}
                  title="Clear selected project"
                  type="button"
                >
                  <RotateCcw aria-hidden="true" size={18} />
                  Clear Project
                </button>
              ) : null}
            </div>
          </section>
          <ExecutionContextDashboard
            model={currentModel}
            workspace={workspace}
          />
        </aside>

        <section
          className={[
            "workspace-surface",
            isVisibleArchitectOutputWorkspace ? "architect-interview-surface" : "",
          ].filter(Boolean).join(" ")}
          aria-labelledby="workspace-heading"
          ref={workspaceSurfaceRef}
        >
          <header className="workspace-header">
            <div>
              <p className="eyebrow">ChampCity A/I</p>
              <h1 id="workspace-heading">{activeWorkspace.label}</h1>
            </div>
            <div className="workspace-actions">
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
          </header>

          {!isVisibleArchitectOutputWorkspace ? (
            <CurrentWorkspaceBanner
              activeWorkspaceLabel={activeWorkspace.label}
              model={currentModel}
              resolverResult={resolverResult}
            />
          ) : null}

          {activeWorkspaceId === "project-intake-capture" ? (
            <ProjectIntakeCapture
              isChoosingProjectRepository={isChoosingProjectRepository}
              isSubmittingIntake={isSubmittingIntake}
              onChange={setProjectIntake}
              onChooseProjectRepository={chooseProjectRepository}
              onSubmit={submitProjectIntake}
              postSubmitConfirmation={projectIntakeConfirmation}
              value={projectIntake}
            />
          ) : null}

          {isVisibleArchitectOutputWorkspace ? (
            <ArchitectOutputActionBar
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
          ) : null}

          {activeWorkspaceId !== "project-intake-capture" &&
          !isWorkCardPlanningPreparation &&
          !isVisibleArchitectOutputWorkspace ? (
            <CurrentActionPanel
              activeWorkspaceId={activeWorkspaceId}
              inputs={actionInputs}
              model={currentModel}
              onChange={setActionInputs}
              onRun={runWorkspaceAction}
              selectedDocument={selectedSummary}
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

          {!isWorkCardPlanningPreparation ? (
          <section
            className={
              workCardArchitectLayoutWorkspaceIds.has(activeWorkspaceId)
                ? "document-workspace work-card-architect-workspace"
                : isArchitectInterviewDualPaneWorkspace(activeWorkspaceId) || activeWorkspaceId === "phase-planning-bundle"
                ? "document-workspace architect-interview-workspace"
                : "document-workspace"
            }
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

              {isVisibleArchitectOutputWorkspace ? (
                <ArchitectOutputReviewShell
                  isApplying={isApplying}
                  model={architectOutputModel}
                  notes={architectOutputReviewNotes}
                  onNotesChange={setArchitectOutputReviewNotes}
                  onReview={applyArchitectOutputReview}
                  onSelectSlot={(slotId) => {
                    setSelectedArchitectOutputSlotId(slotId);
                    const slot = architectOutputModel?.documentSlots.find((candidate) => candidate.slotId === slotId);
                    if (slot?.logicalDocumentId) {
                      setSelectedDocumentId(slot.logicalDocumentId);
                    }
                  }}
                  onStatusChange={setArchitectOutputReviewStatus}
                  onViewedRevision={(key) => {
                    setViewedArchitectOutputRevisionKeys((current) =>
                      current.includes(key) ? current : [...current, key],
                    );
                  }}
                  selectedSlotId={selectedArchitectOutputSlotId}
                  status={architectOutputReviewStatus}
                  viewedRevisionKeys={viewedArchitectOutputRevisionKeys}
                />
              ) : specializedDispositionWorkspaceIds.has(activeWorkspaceId) ? (
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
            {isVisibleArchitectOutputWorkspace ? (
              <aside className="architect-surface-pane" aria-label="Architect browser surface">
                <div className="architect-pane-header">
                  <strong>Embedded ChatGPT</strong>
                  <span>{architectBrowserPresentation(architectStatus).label}</span>
                </div>
                <div ref={architectHostRef} className="architect-browser-host">
                  {architectStatus?.attachment.state !== "attached-visible" ? (
                    <span>{architectBrowserPresentation(architectStatus).label}</span>
                  ) : null}
                </div>
              </aside>
            ) : null}
          </section>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function ArchitectOutputActionBar({
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
  const browserPresentation = architectBrowserPresentation(browserStatus);
  const showRetryButton = shouldShowArchitectBrowserRetry(browserStatus, attachmentError);
  const actionMessage = actionFeedbackForDisplay(attachmentError, pollingError, actionFeedback);
  return (
    <section className="architect-action-bar" aria-label="Architect output controls">
      <div className="architect-action-context">
        <span>Lifecycle</span>
        <strong>{model?.railStatus ?? "Not Ready"}</strong>
      </div>
      <div className="architect-action-context wide">
        <span>Required Action</span>
        <strong>{model?.requiredAction ?? "Resolve repository evidence."}</strong>
      </div>
      <div className="architect-action-buttons">
        <button className="architect-command-button icon-button text-button" disabled={!model?.canPrepareHandoff} onClick={onPrepareHandoff} type="button">
          <FolderOpen aria-hidden="true" size={18} />
          Prepare Handoff
        </button>
        <button className="architect-command-button icon-button text-button" disabled={!model?.canCopyHandoff} onClick={onCopyHandoff} type="button">
          <Clipboard aria-hidden="true" size={18} />
          Copy Handoff
        </button>
        <button className="architect-command-button icon-button text-button" onClick={onRefresh} type="button">
          <RefreshCw aria-hidden="true" size={18} />
          Refresh Outputs
        </button>
        <button className="architect-command-button icon-button text-button" onClick={onReloadBrowser} type="button">
          <RotateCcw aria-hidden="true" size={18} />
          Reload ChatGPT
        </button>
        {showRetryButton ? (
          <button className="architect-command-button icon-button text-button" onClick={onRetryBrowser} type="button">
            <RotateCcw aria-hidden="true" size={18} />
            Retry Browser
          </button>
        ) : null}
      </div>
      <div className={`architect-browser-status ${actionMessage?.kind ?? "info"}`}>
        <strong>{browserPresentation.label}</strong>
        <span>{actionMessage?.message ?? model?.reason ?? browserPresentation.detail}</span>
      </div>
    </section>
  );
}

function ArchitectOutputReviewShell({
  isApplying,
  model,
  notes,
  onNotesChange,
  onReview,
  onSelectSlot,
  onStatusChange,
  onViewedRevision,
  selectedSlotId,
  status,
  viewedRevisionKeys,
}: {
  isApplying: boolean;
  model: ArchitectOutputWorkspaceModel | null;
  notes: string;
  onNotesChange: (notes: string) => void;
  onReview: () => void;
  onSelectSlot: (slotId: string) => void;
  onStatusChange: (status: DocumentDispositionStatus | "") => void;
  onViewedRevision: (key: string) => void;
  selectedSlotId: string | null;
  status: DocumentDispositionStatus | "";
  viewedRevisionKeys: string[];
}): JSX.Element {
  const selectedSlot =
    model?.documentSlots.find((slot) => slot.slotId === selectedSlotId) ??
    model?.documentSlots[0];
  const currentRevisionKeys = model?.documentSlots
    .map((slot) => revisionKeyForArchitectOutputSlot(slot))
    .filter((key): key is string => Boolean(key)) ?? [];
  const allCurrentRevisionsViewed =
    currentRevisionKeys.length > 0 &&
    currentRevisionKeys.every((key) => viewedRevisionKeys.includes(key));
  const canReview =
    Boolean(model?.canApplyDisposition) &&
    Boolean(status) &&
    allCurrentRevisionsViewed &&
    (status !== "RevisionRequested" || Boolean(notes.trim()));

  return (
    <section className="architect-review-panel" aria-label="Architect output review">
      {model && model.documentSlots.length > 1 ? (
        <div className="architect-document-selector" role="tablist" aria-label="Current output slots">
          {model.documentSlots.map((slot) => {
            const revisionKey = revisionKeyForArchitectOutputSlot(slot);
            return (
              <button
                aria-selected={selectedSlot?.slotId === slot.slotId}
                className={selectedSlot?.slotId === slot.slotId ? "document-choice selected" : "document-choice"}
                disabled={!slot.logicalDocumentId}
                key={slot.slotId}
                onClick={() => {
                  onSelectSlot(slot.slotId);
                  if (revisionKey) {
                    onViewedRevision(revisionKey);
                  }
                }}
                type="button"
              >
                <span>{slot.displayLabel}</span>
              </button>
            );
          })}
        </div>
      ) : null}
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
      <label>
        <span>Review Notes</span>
        <textarea
          disabled={isApplying || !model?.canApplyDisposition}
          onChange={(event) => onNotesChange(event.target.value)}
          value={notes}
        />
      </label>
      <button
        className="apply-button"
        disabled={isApplying || !canReview}
        onClick={onReview}
        type="button"
      >
        Apply Review
      </button>
      {!allCurrentRevisionsViewed && model?.canApplyDisposition ? (
        <div className="document-feedback" role="status">
          Open every current output revision before approval.
        </div>
      ) : null}
    </section>
  );
}

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
      <label>
        <span>Project Name</span>
        <input
          onChange={(event) => update("projectName", event.target.value)}
          required
          value={value.projectName}
        />
      </label>
      <label>
        <span>Project Purpose - What are you trying to create, change, or accomplish?</span>
        <textarea
          onChange={(event) => update("projectPurpose", event.target.value)}
          required
          value={value.projectPurpose}
        />
      </label>
      <label>
        <span>Desired Outcome - What should the finished project allow the user or Operator to do?</span>
        <textarea
          onChange={(event) => update("desiredOutcome", event.target.value)}
          required
          value={value.desiredOutcome}
        />
      </label>
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
      <div className="intake-repository-row">
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
      <label className="checkbox-row">
        <input
          checked={value.hasExistingSourceOrPlanning}
          onChange={(event) => update("hasExistingSourceOrPlanning", event.target.checked)}
          type="checkbox"
        />
        <span>Does this repository already contain source code or project-planning documents?</span>
      </label>
      <label>
        <span>Known Constraints or Non-Negotiables</span>
        <textarea
          onChange={(event) => update("knownConstraints", event.target.value)}
          value={value.knownConstraints ?? ""}
        />
      </label>
      {value.hasExistingSourceOrPlanning ? (
        <label>
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
}: {
  activeWorkspaceLabel: string;
  model: CurrentWorkspaceModel | null;
  resolverResult: FirstNonApprovedResult | null;
}): JSX.Element | null {
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
