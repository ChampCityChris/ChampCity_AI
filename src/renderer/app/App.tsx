import { useEffect, useMemo, useRef, useState } from "react";
import { Clipboard, FolderOpen, RefreshCw, RotateCcw } from "lucide-react";
import {
  type ClosureDecision,
  type CurrentWorkspaceModel,
  projectTypeOptions,
  type RuntimeActionResult,
  workspaceDefinitions,
  type ArchitectBrowserFoundationStatus,
  type ArchitectInterviewWorkspaceModel,
  type ArchitectInterviewSelectedDocumentRole,
  type ProjectPlanningSelectedDocumentRole,
  type ProjectPlanningWorkspaceModel,
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
  shouldRenderPhaseMapDispositionControls,
  shouldRenderInlineProjectIntakeDisposition,
  deriveArchitectInterviewRailStatus,
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
  buildArchitectInterviewEvidenceFingerprint,
  getArchitectInterviewReviewRegionState,
  hydrateArchitectInterviewReviewEditState,
  reviewEditStateFromModel,
  type ArchitectInterviewReviewEditState,
} from "../../shared/architectInterview/architectInterviewRefreshState";
import {
  createArchitectAttachmentCoordinator,
  shouldShowArchitectBrowserRetry,
  type ArchitectHostMeasurement,
} from "../../shared/architectInterview/architectBrowserAttachmentCoordinator";
import { NestedWorkflowRail } from "./NestedWorkflowRail";

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
const dispositionOptions = [
  { label: "Approve", status: "Approved" },
  { label: "Reject", status: "Rejected" },
  { label: "Request Revision", status: "RevisionRequested" },
] as const;
const revisionRequestedFeedback =
  "Revision requested. Copy the revised handoff and send it in the embedded ChatGPT pane. The handoff includes your revision instructions. The revised Interview will return here as Pending after the Architect saves it through MCP.";
const revisedHandoffCopiedFeedback =
  "Revised handoff copied. Paste and send it in embedded ChatGPT.";
const projectPlanningHandoffCopiedFeedback =
  "Project Planning handoff copied. Paste and send it manually in embedded ChatGPT.";
const phaseMapHandoffPreparedFeedback =
  "Phase Map handoff prepared. Copy the Phase Map handoff and send it manually in embedded ChatGPT.";
const phaseMapHandoffCopiedFeedback =
  "Phase Map handoff copied. Paste and send it manually in embedded ChatGPT.";

function architectReviewAppliedFeedback(status: DocumentDispositionStatus): string {
  if (status === "RevisionRequested") {
    return revisionRequestedFeedback;
  }
  return `Architect Interview disposition applied: ${status}.`;
}

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

type LifecycleArchitectOutputDrafts = {
  phaseInterviewMarkdown: string;
  phasePlanningMarkdown: string;
  workCardPlanMarkdown: string;
  formalWorkCardMarkdown: string;
  repairWorkCardMarkdown: string;
};

const emptyLifecycleArchitectOutputDrafts: LifecycleArchitectOutputDrafts = {
  phaseInterviewMarkdown: "",
  phasePlanningMarkdown: "",
  workCardPlanMarkdown: "",
  formalWorkCardMarkdown: "",
  repairWorkCardMarkdown: "",
};

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
  const [architectInterviewModel, setArchitectInterviewModel] =
    useState<ArchitectInterviewWorkspaceModel | null>(null);
  const [projectPlanningModel, setProjectPlanningModel] =
    useState<ProjectPlanningWorkspaceModel | null>(null);
  const [selectedProjectPlanningRole, setSelectedProjectPlanningRole] =
    useState<ProjectPlanningSelectedDocumentRole>("profile");
  const [projectPlanningReviewStatus, setProjectPlanningReviewStatus] =
    useState<DocumentDispositionStatus | "">("");
  const [projectPlanningReviewNotes, setProjectPlanningReviewNotes] = useState("");
  const [viewedProjectPlanningRevisionKeys, setViewedProjectPlanningRevisionKeys] =
    useState<string[]>([]);
  const [architectReviewEdit, setArchitectReviewEdit] =
    useState<ArchitectInterviewReviewEditState | null>(null);
  const [architectActionFeedback, setArchitectActionFeedback] =
    useState<ArchitectActionFeedback>(null);
  const [lifecycleArchitectOutputs, setLifecycleArchitectOutputs] =
    useState<LifecycleArchitectOutputDrafts>(emptyLifecycleArchitectOutputDrafts);
  const [architectPollingError, setArchitectPollingError] = useState("");
  const [projectPlanningPollingError, setProjectPlanningPollingError] = useState("");
  const [phaseMapPollingError, setPhaseMapPollingError] = useState("");
  const architectEvidenceFingerprintRef = useRef<string | null>(null);
  const projectPlanningFingerprintRef = useRef<string | null>(null);
  const phaseMapFingerprintRef = useRef<string | null>(null);
  const architectPollInFlightRef = useRef(false);
  const architectPollRequestRef = useRef(0);
  const projectPlanningPollInFlightRef = useRef<number | null>(null);
  const projectPlanningPollRequestRef = useRef(0);
  const phaseMapPollInFlightRef = useRef<number | null>(null);
  const phaseMapPollRequestRef = useRef(0);
  const architectBoundsSequenceRef = useRef(0);
  const architectAttachmentGenerationRef = useRef(0);
  const architectBoundsRafRef = useRef<number | null>(null);
  const architectFeedbackTimeoutRef = useRef<number | null>(null);
  const architectAttachmentCoordinatorRef =
    useRef<ReturnType<typeof createArchitectAttachmentCoordinator> | null>(null);
  const [architectAttachmentError, setArchitectAttachmentError] = useState("");
  const [currentModel, setCurrentModel] = useState<CurrentWorkspaceModel | null>(null);
  const [actionInputs, setActionInputs] = useState({
    defect: "",
    closureDecision: "Close" as ClosureDecision,
    rationale: "",
    status: "Approved" as DocumentDispositionStatus,
  });
  const architectHostRef = useRef<HTMLDivElement | null>(null);
  const workspaceSurfaceRef = useRef<HTMLElement | null>(null);
  const documentReviewSurfaceRef = useRef<HTMLElement | null>(null);

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
    if (!workspace.ok) {
      return;
    }

    const shouldAttachEmbeddedSurface = isArchitectEnabledWorkspace(activeWorkspaceId);
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
  }, [activeWorkspaceId, workspace.ok]);

  useEffect(() => {
    if (!workspace.ok || activeWorkspaceId !== "architect-interview") {
      return;
    }

    void refreshArchitectInterviewWorkspace({ autoSelectNewOutput: true, force: true });
    const interval = window.setInterval(() => {
      void refreshArchitectStatus();
      void refreshArchitectInterviewWorkspace({ autoSelectNewOutput: true, quiet: true });
    }, 3000);

    return () => window.clearInterval(interval);
  }, [activeWorkspaceId, workspace.ok]);

  useEffect(() => {
    if (!workspace.ok || activeWorkspaceId !== "project-planning-review") {
      return;
    }

    void refreshProjectPlanningWorkspace({ autoSelectOutput: true, force: true });
    const interval = window.setInterval(() => {
      void refreshArchitectStatus();
      void refreshProjectPlanningWorkspace({ autoSelectOutput: true, quiet: true });
    }, 3000);

    return () => {
      window.clearInterval(interval);
      projectPlanningPollRequestRef.current += 1;
      projectPlanningPollInFlightRef.current = null;
    };
  }, [activeWorkspaceId, workspace.ok]);

  useEffect(() => {
    if (!workspace.ok || activeWorkspaceId !== "project-phase-map") {
      return;
    }

    void refreshPhaseMapWorkspace({ autoSelectOutput: true, force: true });
    const interval = window.setInterval(() => {
      void refreshArchitectStatus();
      void refreshPhaseMapWorkspace({ autoSelectOutput: true, quiet: true });
    }, 3000);

    return () => {
      window.clearInterval(interval);
      phaseMapPollRequestRef.current += 1;
      phaseMapPollInFlightRef.current = null;
    };
  }, [activeWorkspaceId, workspace.ok]);

  useEffect(() => {
    const selectedRole = architectInterviewRoleForSelection(selectedDocumentId, architectInterviewModel);
    setArchitectReviewEdit((current) =>
      hydrateArchitectInterviewReviewEditState({
        current,
        model: architectInterviewModel,
        repositoryIdentity: workspace.ok ? workspace.workspaceRoot : null,
        selectedRole,
      }),
    );
  }, [architectInterviewModel, selectedDocumentId, workspace]);

  useEffect(() => {
    if (activeWorkspaceId !== "project-planning-review" || !selectedDocumentId || !projectPlanningModel) {
      return;
    }
    const role = projectPlanningRoleForSelection(selectedDocumentId, projectPlanningModel);
    if (!role) {
      return;
    }
    const key = projectPlanningRevisionKey(role, projectPlanningModel);
    if (!key) {
      return;
    }
    setViewedProjectPlanningRevisionKeys((current) =>
      current.includes(key) ? current : [...current, key],
    );
  }, [activeWorkspaceId, projectPlanningModel, selectedDocumentId]);

  const workspaceGroups = useMemo(
    () => getWorkspaceGroups(documents, activeWorkspaceId),
    [activeWorkspaceId, documents],
  );
  const workspaceCounts = useMemo(() => getWorkspaceDocumentCounts(documents), [documents]);
  const projectIntakeRailStatus = useMemo(
    () => deriveProjectIntakeRailStatus(documents),
    [documents],
  );
  const architectInterviewRailStatus = deriveArchitectInterviewRailStatus(architectInterviewModel);
  const projectRailStatuses = useMemo(() => {
    const statuses = deriveProjectLifecycleRailStatuses(documents, {
      projectIntakeStatus: projectIntakeRailStatus,
      architectInterviewStatus: architectInterviewRailStatus,
    });
    if (projectPlanningModel?.railStatus) {
      statuses["project-planning-review"] = projectPlanningModel.railStatus;
    }
    return statuses;
  }, [architectInterviewRailStatus, documents, projectIntakeRailStatus, projectPlanningModel]);
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
  const selectedArchitectInterviewRole = architectInterviewRoleForSelection(
    selectedDocumentId,
    architectInterviewModel,
  );
  const architectReviewStatus = architectReviewEdit?.selectedDisposition ?? "";
  const architectReviewNotes = architectReviewEdit?.notes ?? "";

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
      await refreshArchitectInterviewWorkspace({
        force: true,
        quiet: activeWorkspaceId !== "architect-interview",
        refreshRepositoryProjection: false,
      });
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

  async function refreshArchitectInterviewWorkspace(
    options: { autoSelectNewOutput?: boolean; force?: boolean; quiet?: boolean; refreshRepositoryProjection?: boolean } = {},
  ): Promise<void> {
    if (architectPollInFlightRef.current) {
      return;
    }
    architectPollInFlightRef.current = true;
    const requestId = architectPollRequestRef.current + 1;
    architectPollRequestRef.current = requestId;
    if (!options.quiet) {
      setDocumentError("");
    }
    try {
      const nextModel = await window.champcity.getArchitectInterviewWorkspaceModel();
      if (requestId !== architectPollRequestRef.current) {
        return;
      }
      const nextFingerprint = buildArchitectInterviewEvidenceFingerprint(
        workspace.ok ? workspace.workspaceRoot : null,
        nextModel,
      );
      const fingerprintChanged = architectEvidenceFingerprintRef.current !== nextFingerprint;
      if (!options.force && !fingerprintChanged && options.quiet) {
        setArchitectPollingError("");
        return;
      }
      architectEvidenceFingerprintRef.current = nextFingerprint;
      setArchitectPollingError("");
      setArchitectInterviewModel(nextModel);
      const nextInterviewId = nextModel.interviewDocument?.logicalDocumentId ?? null;

      if (
        options.autoSelectNewOutput &&
        nextInterviewId &&
        selectedDocumentId !== nextInterviewId
      ) {
        setSelectedDocumentId(nextInterviewId);
      } else if (!selectedDocumentId && nextModel.promptDocument?.logicalDocumentId) {
        setSelectedDocumentId(nextModel.promptDocument.logicalDocumentId);
      }
      if (options.refreshRepositoryProjection ?? fingerprintChanged) {
        const nextDocuments = await window.champcity.listDocuments();
        if (requestId !== architectPollRequestRef.current) {
          return;
        }
        applyDocumentInventory(nextDocuments);
        const nextResolverResult = await window.champcity.resolveCurrentDocument();
        if (requestId !== architectPollRequestRef.current) {
          return;
        }
        setResolverResult(nextResolverResult);
        await refreshCurrentModel();
        const previewId = nextInterviewId ?? selectedDocumentId ?? nextModel.promptDocument?.logicalDocumentId;
        if (previewId) {
          await loadDocument(previewId, { preserveOnFailure: true });
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Architect Interview model could not be loaded.";
      setArchitectPollingError(message);
      if (!options.quiet) {
        setDocumentError(message);
      }
    } finally {
      if (requestId === architectPollRequestRef.current) {
        architectPollInFlightRef.current = false;
      }
    }
  }

  async function copyArchitectHandoff(): Promise<void> {
    setDocumentError("");
    setArchitectFeedback(null);
    const isRevisionHandoff = architectInterviewModel?.state === "revision-requested";
    try {
      const result = await window.champcity.copyArchitectHandoff();
      setArchitectFeedback(
        {
          kind: "success",
          message: isRevisionHandoff
            ? revisedHandoffCopiedFeedback
            : result.message,
        },
        4500,
      );
      await refreshArchitectStatus();
      await refreshArchitectInterviewWorkspace();
    } catch (error) {
      setArchitectFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Architect handoff could not be copied.",
      });
    }
  }

  async function refreshProjectPlanningWorkspace(
    options: { autoSelectOutput?: boolean; force?: boolean; quiet?: boolean; refreshRepositoryProjection?: boolean } = {},
  ): Promise<void> {
    if (!workspace.ok) {
      return;
    }
    if (options.quiet && projectPlanningPollInFlightRef.current !== null) {
      return;
    }
    const requestId = projectPlanningPollRequestRef.current + 1;
    projectPlanningPollRequestRef.current = requestId;
    projectPlanningPollInFlightRef.current = requestId;
    if (!options.quiet) {
      setDocumentError("");
    }
    try {
      const nextModel = await window.champcity.getProjectPlanningWorkspaceModel();
      if (requestId !== projectPlanningPollRequestRef.current) {
        return;
      }
      const nextFingerprint = buildProjectPlanningEvidenceFingerprint(workspace.workspaceRoot, nextModel);
      const fingerprintChanged = projectPlanningFingerprintRef.current !== nextFingerprint;
      if (!options.force && !fingerprintChanged && options.quiet) {
        setProjectPlanningPollingError("");
        return;
      }
      projectPlanningFingerprintRef.current = nextFingerprint;
      setProjectPlanningPollingError("");
      setProjectPlanningModel(nextModel);
      if (fingerprintChanged) {
        setViewedProjectPlanningRevisionKeys([]);
      }
      const selectedRole = selectedProjectPlanningRole;
      const preferredDocumentId =
        selectedRole === "roadmap"
          ? nextModel.roadmapDocument?.logicalDocumentId
          : nextModel.profileDocument?.logicalDocumentId;
      const fallbackDocumentId =
        nextModel.profileDocument?.logicalDocumentId ?? nextModel.roadmapDocument?.logicalDocumentId ?? null;
      const nextDocumentId = preferredDocumentId ?? fallbackDocumentId;
      if (options.autoSelectOutput && nextDocumentId && selectedDocumentId !== nextDocumentId) {
        setSelectedDocumentId(nextDocumentId);
      }
      if (options.refreshRepositoryProjection ?? fingerprintChanged) {
        const nextDocuments = await window.champcity.listDocuments();
        if (requestId !== projectPlanningPollRequestRef.current) {
          return;
        }
        applyDocumentInventory(nextDocuments);
        const nextResolverResult = await window.champcity.resolveCurrentDocument();
        if (requestId !== projectPlanningPollRequestRef.current) {
          return;
        }
        setResolverResult(nextResolverResult);
        try {
          const nextCurrentModel = await window.champcity.getCurrentWorkspaceModel();
          if (requestId !== projectPlanningPollRequestRef.current) {
            return;
          }
          setCurrentModel(nextCurrentModel);
        } catch {
          if (requestId !== projectPlanningPollRequestRef.current) {
            return;
          }
          setCurrentModel(null);
        }
        if (requestId !== projectPlanningPollRequestRef.current) {
          return;
        }
        if (nextDocumentId) {
          await loadProjectPlanningDocumentForRequest(nextDocumentId, requestId);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Project Planning model could not be loaded.";
      if (requestId === projectPlanningPollRequestRef.current) {
        setProjectPlanningPollingError(message);
      }
      if (!options.quiet) {
        setDocumentError(message);
      }
    } finally {
      if (projectPlanningPollInFlightRef.current === requestId) {
        projectPlanningPollInFlightRef.current = null;
      }
    }
  }

  async function refreshPhaseMapWorkspace(
    options: { autoSelectOutput?: boolean; force?: boolean; quiet?: boolean; refreshRepositoryProjection?: boolean } = {},
  ): Promise<void> {
    if (!workspace.ok) {
      return;
    }
    if (options.quiet && phaseMapPollInFlightRef.current !== null) {
      return;
    }
    const requestId = phaseMapPollRequestRef.current + 1;
    phaseMapPollRequestRef.current = requestId;
    phaseMapPollInFlightRef.current = requestId;
    if (!options.quiet) {
      setDocumentError("");
    }
    try {
      const nextDocuments = await window.champcity.listDocuments();
      if (requestId !== phaseMapPollRequestRef.current) {
        return;
      }
      const nextFingerprint = buildPhaseMapEvidenceFingerprint(workspace.workspaceRoot, nextDocuments);
      const fingerprintChanged = phaseMapFingerprintRef.current !== nextFingerprint;
      if (!options.force && !fingerprintChanged && options.quiet) {
        setPhaseMapPollingError("");
        return;
      }
      phaseMapFingerprintRef.current = nextFingerprint;
      setPhaseMapPollingError("");

      const shouldRefreshRepositoryProjection =
        options.refreshRepositoryProjection ?? (fingerprintChanged || Boolean(options.force));
      if (!shouldRefreshRepositoryProjection) {
        return;
      }

      applyDocumentInventory(nextDocuments);
      const nextResolverResult = await window.champcity.resolveCurrentDocument();
      if (requestId !== phaseMapPollRequestRef.current) {
        return;
      }
      setResolverResult(nextResolverResult);
      try {
        const nextCurrentModel = await window.champcity.getCurrentWorkspaceModel();
        if (requestId !== phaseMapPollRequestRef.current) {
          return;
        }
        setCurrentModel(nextCurrentModel);
      } catch {
        if (requestId !== phaseMapPollRequestRef.current) {
          return;
        }
        setCurrentModel(null);
      }

      const nextOutputDocument = phaseMapOutputDocument(nextDocuments);
      const nextHandoffDocument = phaseMapHandoffDocument(nextDocuments);
      const nextDocumentId =
        options.autoSelectOutput && nextOutputDocument
          ? nextOutputDocument.logicalDocumentId
          : selectedDocumentId ?? nextOutputDocument?.logicalDocumentId ?? nextHandoffDocument?.logicalDocumentId ?? null;
      if (options.autoSelectOutput && nextOutputDocument && selectedDocumentId !== nextOutputDocument.logicalDocumentId) {
        setSelectedDocumentId(nextOutputDocument.logicalDocumentId);
      }
      if (nextDocumentId) {
        const detail = await window.champcity.readDocument(nextDocumentId);
        if (requestId !== phaseMapPollRequestRef.current) {
          return;
        }
        setSelectedDocument(detail);
        setSelectedStatus(
          detail.effectiveDisposition === "Pending" ? "" : detail.effectiveDisposition,
        );
        if (detail.readError) {
          setDocumentError(detail.readError);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Phase Map workspace could not be refreshed.";
      if (requestId === phaseMapPollRequestRef.current) {
        setPhaseMapPollingError(message);
      }
      if (!options.quiet) {
        setDocumentError(message);
      }
    } finally {
      if (phaseMapPollInFlightRef.current === requestId) {
        phaseMapPollInFlightRef.current = null;
      }
    }
  }

  async function prepareProjectPlanningHandoff(): Promise<void> {
    setDocumentError("");
    setArchitectFeedback(null);
    try {
      const nextModel = await window.champcity.prepareProjectPlanningHandoff();
      setProjectPlanningModel(nextModel);
      setArchitectFeedback({
        kind: "success",
        message: nextModel.handoffPreparationMessage ?? "Project Planning handoff prepared.",
      }, 3500);
      await refreshDocuments();
    } catch (error) {
      setArchitectFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Project Planning handoff could not be prepared.",
      });
    }
  }

  async function copyProjectPlanningHandoff(): Promise<void> {
    setDocumentError("");
    setArchitectFeedback(null);
    try {
      await window.champcity.copyProjectPlanningHandoff();
      setArchitectFeedback({ kind: "success", message: projectPlanningHandoffCopiedFeedback }, 4500);
      await refreshArchitectStatus();
      await refreshProjectPlanningWorkspace({ force: true });
    } catch (error) {
      setArchitectFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Project Planning handoff could not be copied.",
      });
    }
  }

  async function preparePhaseMapHandoff(): Promise<void> {
    setDocumentError("");
    setArchitectFeedback(null);
    try {
      await window.champcity.generateCurrentHandoff();
      setArchitectFeedback({ kind: "success", message: phaseMapHandoffPreparedFeedback }, 4500);
      const nextDocuments = await window.champcity.listDocuments();
      applyDocumentInventory(nextDocuments);
      const nextResolverResult = await window.champcity.resolveCurrentDocument();
      setResolverResult(nextResolverResult);
      await refreshCurrentModel();
      transitionToWorkflowStep("project-phase-map", {
        documents: nextDocuments,
        resolverResult: nextResolverResult,
      });
    } catch (error) {
      setArchitectFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Phase Map handoff could not be prepared.",
      });
    }
  }

  async function copyPhaseMapHandoff(): Promise<void> {
    setDocumentError("");
    setArchitectFeedback(null);
    try {
      await window.champcity.copyPhaseMapHandoff();
      setArchitectFeedback({ kind: "success", message: phaseMapHandoffCopiedFeedback }, 4500);
      await refreshArchitectStatus();
      await refreshPhaseMapWorkspace({ force: true });
    } catch (error) {
      setArchitectFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Phase Map handoff could not be copied.",
      });
    }
  }

  async function applyProjectPlanningReview(): Promise<void> {
    if (!projectPlanningReviewStatus) {
      return;
    }
    setIsApplying(true);
    setDocumentError("");
    setFeedback("");
    try {
      const nextModel = await window.champcity.reviewProjectPlanningBundle(
        projectPlanningReviewStatus,
        projectPlanningReviewNotes,
      );
      setProjectPlanningModel(nextModel);
      setProjectPlanningReviewStatus("");
      setProjectPlanningReviewNotes("");
      setFeedback(`Project Planning bundle disposition applied: ${projectPlanningReviewStatus}.`);
      await refreshDocuments({ useResolver: true });
      await refreshProjectPlanningWorkspace({ force: true });
    } catch (error) {
      setDocumentError(error instanceof Error ? error.message : "Project Planning review could not be applied.");
    } finally {
      setIsApplying(false);
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

  async function applyArchitectInterviewReview(): Promise<void> {
    if (!architectReviewEdit?.sourceToken || !architectReviewEdit.selectedDisposition) {
      setDocumentError("Refresh the Architect Interview output before applying review.");
      return;
    }
    const selectedDisposition = architectReviewEdit.selectedDisposition;
    setIsApplying(true);
    setDocumentError("");
    setFeedback("");
    try {
      const nextModel = await window.champcity.reviewArchitectInterview(
        selectedDisposition,
        architectReviewEdit.notes,
        architectReviewEdit.sourceToken,
      );
      setArchitectInterviewModel(nextModel);
      setArchitectReviewEdit(reviewEditStateFromModel(workspace.ok ? workspace.workspaceRoot : null, nextModel));
      architectEvidenceFingerprintRef.current = buildArchitectInterviewEvidenceFingerprint(
        workspace.ok ? workspace.workspaceRoot : null,
        nextModel,
      );
      const nextDocuments = await window.champcity.listDocuments();
      applyDocumentInventory(nextDocuments);
      const nextResolverResult = await window.champcity.resolveCurrentDocument();
      setResolverResult(nextResolverResult);
      await refreshCurrentModel();
      if (nextModel.interviewDocument?.logicalDocumentId) {
        setSelectedDocumentId(nextModel.interviewDocument.logicalDocumentId);
        await loadDocument(nextModel.interviewDocument.logicalDocumentId, { preserveOnFailure: true });
      }
      transitionToWorkflowStep("architect-interview", {
        documents: nextDocuments,
        preferredDocumentId: nextModel.interviewDocument?.logicalDocumentId ?? null,
      });
      setFeedback(architectReviewAppliedFeedback(selectedDisposition));
    } catch (error) {
      setDocumentError(error instanceof Error ? error.message : "Architect Interview review could not be applied.");
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

  async function saveLifecycleArchitectOutput(): Promise<void> {
    setIsApplying(true);
    setDocumentError("");
    setFeedback("");
    try {
      let selectedPath = "";
      switch (activeWorkspaceId) {
        case "phase-interview": {
          const result = await window.champcity.savePhaseInterviewOutput(lifecycleArchitectOutputs.phaseInterviewMarkdown);
          selectedPath = result.phaseInterviewMarkdownPath;
          setCurrentModel(result.currentWorkspaceModel);
          setLifecycleArchitectOutputs((current) => ({ ...current, phaseInterviewMarkdown: "" }));
          break;
        }
        case "phase-planning-bundle": {
          const result = await window.champcity.savePhasePlanningOutputs({
            phasePlanningMarkdown: lifecycleArchitectOutputs.phasePlanningMarkdown,
            workCardPlanMarkdown: lifecycleArchitectOutputs.workCardPlanMarkdown,
          });
          selectedPath = result.phasePlanningMarkdownPath;
          setCurrentModel(result.currentWorkspaceModel);
          setLifecycleArchitectOutputs((current) => ({
            ...current,
            phasePlanningMarkdown: "",
            workCardPlanMarkdown: "",
          }));
          break;
        }
        case "work-card-planning": {
          const result = await window.champcity.saveFormalWorkCardOutput(lifecycleArchitectOutputs.formalWorkCardMarkdown);
          selectedPath = result.formalWorkCardMarkdownPath;
          setCurrentModel(result.currentWorkspaceModel);
          setLifecycleArchitectOutputs((current) => ({ ...current, formalWorkCardMarkdown: "" }));
          break;
        }
        case "work-card-repair": {
          const result = await window.champcity.saveRepairWorkCardOutput(lifecycleArchitectOutputs.repairWorkCardMarkdown);
          selectedPath = result.repairWorkCardMarkdownPath;
          setCurrentModel(result.currentWorkspaceModel);
          setLifecycleArchitectOutputs((current) => ({ ...current, repairWorkCardMarkdown: "" }));
          break;
        }
        default:
          throw new Error("Current workflow step does not accept Architect output.");
      }
      setFeedback("Architect Output saved.");
      const nextDocuments = await window.champcity.listDocuments();
      applyDocumentInventory(nextDocuments);
      const nextResolverResult = await window.champcity.resolveCurrentDocument();
      setResolverResult(nextResolverResult);
      const savedDocument = nextDocuments.find((document) => document.markdownPath === selectedPath);
      if (savedDocument) {
        transitionToWorkflowStep(activeWorkspaceId, {
          documents: nextDocuments,
          preferredDocumentId: savedDocument.logicalDocumentId,
          resolverResult: nextResolverResult,
        });
      }
    } catch (error) {
      setDocumentError(error instanceof Error ? error.message : "Architect Output could not be saved.");
    } finally {
      setIsApplying(false);
    }
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
      await refreshArchitectInterviewWorkspace({
        autoSelectNewOutput: activeWorkspaceId === "architect-interview",
        force: true,
        quiet: activeWorkspaceId !== "architect-interview",
        refreshRepositoryProjection: false,
      });
      await refreshProjectPlanningWorkspace({
        autoSelectOutput: activeWorkspaceId === "project-planning-review",
        force: true,
        quiet: activeWorkspaceId !== "project-planning-review",
        refreshRepositoryProjection: false,
      });
      await refreshPhaseMapWorkspace({
        autoSelectOutput: activeWorkspaceId === "project-phase-map",
        force: true,
        quiet: activeWorkspaceId !== "project-phase-map",
        refreshRepositoryProjection: false,
      });
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
    setArchitectInterviewModel(null);
    setArchitectReviewEdit(null);
    setProjectPlanningModel(null);
    setProjectPlanningReviewStatus("");
    setProjectPlanningReviewNotes("");
    setViewedProjectPlanningRevisionKeys([]);
    setArchitectFeedback(null);
    setArchitectPollingError("");
    setProjectPlanningPollingError("");
    setPhaseMapPollingError("");
    architectEvidenceFingerprintRef.current = null;
    projectPlanningFingerprintRef.current = null;
    phaseMapFingerprintRef.current = null;
    architectPollRequestRef.current += 1;
    architectPollInFlightRef.current = false;
    projectPlanningPollRequestRef.current += 1;
    projectPlanningPollInFlightRef.current = null;
    phaseMapPollRequestRef.current += 1;
    phaseMapPollInFlightRef.current = null;
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
    options: { preserveOnFailure?: boolean } = {},
  ): Promise<void> {
    setDocumentError("");
    setFeedback("");
    try {
      const detail = await window.champcity.readDocument(logicalDocumentId);
      setSelectedDocument(detail);
      setSelectedStatus(
        detail.effectiveDisposition === "Pending" ? "" : detail.effectiveDisposition,
      );
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

  async function loadProjectPlanningDocumentForRequest(
    logicalDocumentId: string,
    requestId: number,
  ): Promise<void> {
    setDocumentError("");
    setFeedback("");
    try {
      const detail = await window.champcity.readDocument(logicalDocumentId);
      if (requestId !== projectPlanningPollRequestRef.current) {
        return;
      }
      setSelectedDocument(detail);
      setSelectedStatus(
        detail.effectiveDisposition === "Pending" ? "" : detail.effectiveDisposition,
      );
      if (detail.readError) {
        setDocumentError(detail.readError);
      }
    } catch (error) {
      if (requestId !== projectPlanningPollRequestRef.current) {
        return;
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
      await refreshArchitectInterviewWorkspace({
        force: true,
        quiet: activeWorkspaceId !== "architect-interview",
        refreshRepositoryProjection: false,
      });
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

  function selectArchitectInterviewDocument(
    role: ArchitectInterviewSelectedDocumentRole,
    model: ArchitectInterviewWorkspaceModel | null,
  ): void {
    const documentId = role === "interview"
      ? model?.interviewDocument?.logicalDocumentId
      : model?.promptDocument?.logicalDocumentId;
    if (documentId) {
      setSelectedDocumentId(documentId);
    }
  }

  function selectProjectPlanningDocument(role: ProjectPlanningSelectedDocumentRole): void {
    setSelectedProjectPlanningRole(role);
    const documentId = role === "roadmap"
      ? projectPlanningModel?.roadmapDocument?.logicalDocumentId
      : projectPlanningModel?.profileDocument?.logicalDocumentId;
    if (documentId) {
      setSelectedDocumentId(documentId);
    }
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
        </aside>

        <section
          className={[
            "workspace-surface",
            isArchitectEnabledWorkspace(activeWorkspaceId) ? "architect-interview-surface" : "",
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

          {!isArchitectEnabledWorkspace(activeWorkspaceId) ? (
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

          {activeWorkspaceId === "architect-interview" ? (
            <ArchitectInterviewActionBar
              browserStatus={architectStatus}
              attachmentError={architectAttachmentError}
              actionFeedback={architectActionFeedback}
              model={architectInterviewModel}
              pollingError={architectPollingError}
              onCopyHandoff={copyArchitectHandoff}
              onReloadBrowser={() => void reloadArchitectBrowser()}
              onRefresh={() => {
                void refreshDocuments();
                void refreshArchitectStatus();
                void refreshArchitectInterviewWorkspace({ force: true });
              }}
              onRetryBrowser={() => void retryArchitectBrowser()}
              onSelectDocument={(role) => selectArchitectInterviewDocument(role, architectInterviewModel)}
              selectedRole={selectedArchitectInterviewRole}
            />
          ) : null}

          {activeWorkspaceId === "project-planning-review" ? (
            <ProjectPlanningActionBar
              actionFeedback={architectActionFeedback}
              attachmentError={architectAttachmentError}
              browserStatus={architectStatus}
              model={projectPlanningModel}
              onCopyHandoff={copyProjectPlanningHandoff}
              onPrepareHandoff={prepareProjectPlanningHandoff}
              onRefresh={() => {
                void refreshDocuments();
                void refreshArchitectStatus();
                void refreshProjectPlanningWorkspace({ force: true });
              }}
              onReloadBrowser={() => void reloadArchitectBrowser()}
              onRetryBrowser={() => void retryArchitectBrowser()}
              onSelectDocument={(role) => selectProjectPlanningDocument(role)}
              pollingError={projectPlanningPollingError}
              selectedRole={selectedProjectPlanningRole}
            />
          ) : null}

          {activeWorkspaceId === "project-phase-map" ? (
            <PhaseMapActionBar
              actionFeedback={architectActionFeedback}
              attachmentError={architectAttachmentError}
              browserStatus={architectStatus}
              currentModel={currentModel}
              documents={documents}
              onCopyHandoff={copyPhaseMapHandoff}
              onPrepareHandoff={preparePhaseMapHandoff}
              onRefresh={() => {
                void refreshArchitectStatus();
                void refreshPhaseMapWorkspace({ force: true });
              }}
              onReloadBrowser={() => void reloadArchitectBrowser()}
              onRetryBrowser={() => void retryArchitectBrowser()}
              pollingError={phaseMapPollingError}
            />
          ) : null}

          {activeWorkspaceId !== "project-intake-capture" && !isArchitectEnabledWorkspace(activeWorkspaceId) ? (
            <CurrentActionPanel
              activeWorkspaceId={activeWorkspaceId}
              inputs={actionInputs}
              model={currentModel}
              onChange={setActionInputs}
              onRun={runWorkspaceAction}
              selectedDocument={selectedSummary}
            />
          ) : null}

          <section
            className={
              isArchitectInterviewDualPaneWorkspace(activeWorkspaceId)
                ? "document-workspace architect-interview-workspace"
                : "document-workspace"
            }
            aria-label={activeWorkspace.label}
            ref={documentReviewSurfaceRef}
            tabIndex={-1}
          >
            {!isArchitectEnabledWorkspace(activeWorkspaceId) ? (
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

              <pre className="preview-body">
                {selectedDocument?.bodyMarkdown ?? selectedDocument?.preview ?? neutralMessage}
              </pre>

              {activeWorkspaceId !== "architect-interview" &&
              activeWorkspaceId !== "project-planning-review" &&
              activeWorkspaceId !== "project-phase-map" ? (
                <LifecycleArchitectOutputImport
                  activeWorkspaceId={activeWorkspaceId}
                  disabled={isApplying}
                  onChange={setLifecycleArchitectOutputs}
                  onSave={saveLifecycleArchitectOutput}
                  value={lifecycleArchitectOutputs}
                />
              ) : null}

              {activeWorkspaceId === "architect-interview" ? (
                <ArchitectInterviewPreviewReview
                  canApplyReview={
                    getArchitectInterviewReviewRegionState({
                      model: architectInterviewModel,
                      selectedRole: selectedArchitectInterviewRole,
                    }).kind === "valid" && Boolean(architectReviewStatus)
                  }
                  isApplying={isApplying}
                  model={architectInterviewModel}
                  notes={architectReviewNotes}
                  onNotesChange={(notes) => setArchitectReviewEdit((current) => current
                    ? { ...current, notes, isDirty: true }
                    : current)}
                  onReview={applyArchitectInterviewReview}
                  onStatusChange={(status) => setArchitectReviewEdit((current) => current
                    ? { ...current, selectedDisposition: status, isDirty: true }
                    : current)}
                  selectedRole={selectedArchitectInterviewRole}
                  status={architectReviewStatus}
                />
              ) : activeWorkspaceId === "project-planning-review" ? (
                <ProjectPlanningPreviewReview
                  canApplyReview={
                    Boolean(projectPlanningReviewStatus) &&
                    Boolean(projectPlanningModel?.canApplyBundleDisposition) &&
                    projectPlanningDocumentsViewed(projectPlanningModel, viewedProjectPlanningRevisionKeys)
                  }
                  isApplying={isApplying}
                  model={projectPlanningModel}
                  notes={projectPlanningReviewNotes}
                  onNotesChange={setProjectPlanningReviewNotes}
                  onReview={applyProjectPlanningReview}
                  onStatusChange={setProjectPlanningReviewStatus}
                  status={projectPlanningReviewStatus}
                  viewedBoth={projectPlanningDocumentsViewed(projectPlanningModel, viewedProjectPlanningRevisionKeys)}
                />
              ) : activeWorkspaceId === "project-phase-map" ? (
                <PhaseMapPreviewReview
                  isApplying={isApplying}
                  onReview={applyDisposition}
                  onStatusChange={setSelectedStatus}
                  selectedDocument={selectedDocument}
                  status={selectedStatus}
                />
              ) : specializedDispositionWorkspaceIds.has(activeWorkspaceId) ? (
                <div className="document-feedback" role="status">
                  Specialized review controls appear when the current outputs exist.
                </div>
              ) : shouldRenderGenericPreviewDispositionControls(
                  activeWorkspaceId,
                  specializedDispositionWorkspaceIds.has(activeWorkspaceId),
                ) ? (
                renderDispositionControls("disposition-controls")
              ) : null}
            </article>
            {isArchitectEnabledWorkspace(activeWorkspaceId) ? (
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
        </section>
      </div>
    </main>
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

function ArchitectInterviewActionBar({
  actionFeedback,
  attachmentError,
  browserStatus,
  model,
  onCopyHandoff,
  onReloadBrowser,
  onRefresh,
  onRetryBrowser,
  onSelectDocument,
  pollingError,
  selectedRole,
}: {
  actionFeedback: ArchitectActionFeedback;
  attachmentError: string;
  browserStatus: ArchitectBrowserFoundationStatus | null;
  model: ArchitectInterviewWorkspaceModel | null;
  onCopyHandoff: () => void;
  onReloadBrowser: () => void;
  onRefresh: () => void;
  onRetryBrowser: () => void;
  onSelectDocument: (role: ArchitectInterviewSelectedDocumentRole) => void;
  pollingError: string;
  selectedRole: ArchitectInterviewSelectedDocumentRole;
}): JSX.Element {
  const browserPresentation = architectBrowserPresentation(browserStatus);
  const showRetryButton = shouldShowArchitectBrowserRetry(browserStatus, attachmentError);
  const actionMessage = actionFeedbackForDisplay(attachmentError, pollingError, actionFeedback);
  const copyHandoffLabel = model?.state === "revision-requested"
    ? "Copy Revised Handoff"
    : "Copy Architect Handoff";

  return (
    <section className="architect-action-bar" aria-label="Architect Interview controls">
      <div className="architect-action-context">
        <span>Lifecycle</span>
        <strong>{model?.railStatus ?? "Open"}</strong>
      </div>

      <div className="architect-required-action">
        <span>Required Action</span>
        <strong>{model?.requiredAction ?? "Refresh to resolve the required action."}</strong>
      </div>

      <div className="architect-browser-state">
        <span>Embedded ChatGPT</span>
        <strong>{browserPresentation.label}</strong>
        <small>{browserPresentation.detail}</small>
      </div>

      <div className="architect-document-selector" role="group" aria-label="Architect Interview document selector">
        <button
          className={selectedRole === "prompt" ? "document-choice selected" : "document-choice"}
          disabled={!model?.promptDocument}
          onClick={() => onSelectDocument("prompt")}
          type="button"
        >
          Prompt
        </button>
        <button
          className={selectedRole === "interview" ? "document-choice selected" : "document-choice"}
          disabled={!model?.interviewDocument}
          onClick={() => onSelectDocument("interview")}
          type="button"
        >
          Interview
        </button>
      </div>

      <button
        className="apply-button architect-copy-button"
        disabled={!model?.canCopyHandoff}
        onClick={onCopyHandoff}
        type="button"
      >
        <Clipboard aria-hidden="true" size={16} />
        {copyHandoffLabel}
      </button>

      <button className="icon-button text-button" onClick={onRefresh} type="button">
        <RefreshCw aria-hidden="true" size={18} />
        Refresh Output
      </button>

      <button className="icon-button text-button" onClick={onReloadBrowser} type="button">
        <RefreshCw aria-hidden="true" size={18} />
        Reload ChatGPT
      </button>

      {showRetryButton ? (
        <button className="apply-button" onClick={onRetryBrowser} type="button">
          Retry Embedded Browser
        </button>
      ) : null}

      {actionMessage ? (
        <div
          className={`architect-action-message ${actionMessage.kind}`}
          role={actionMessage.kind === "error" ? "alert" : "status"}
        >
          {actionMessage.message}
        </div>
      ) : null}
    </section>
  );
}

function ProjectPlanningActionBar({
  actionFeedback,
  attachmentError,
  browserStatus,
  model,
  onCopyHandoff,
  onPrepareHandoff,
  onRefresh,
  onReloadBrowser,
  onRetryBrowser,
  onSelectDocument,
  pollingError,
  selectedRole,
}: {
  actionFeedback: ArchitectActionFeedback;
  attachmentError: string;
  browserStatus: ArchitectBrowserFoundationStatus | null;
  model: ProjectPlanningWorkspaceModel | null;
  onCopyHandoff: () => void;
  onPrepareHandoff: () => void;
  onRefresh: () => void;
  onReloadBrowser: () => void;
  onRetryBrowser: () => void;
  onSelectDocument: (role: ProjectPlanningSelectedDocumentRole) => void;
  pollingError: string;
  selectedRole: ProjectPlanningSelectedDocumentRole;
}): JSX.Element {
  const browserPresentation = architectBrowserPresentation(browserStatus);
  const showRetryButton = shouldShowArchitectBrowserRetry(browserStatus, attachmentError);
  const actionMessage = actionFeedbackForDisplay(attachmentError, pollingError, actionFeedback);

  return (
    <section className="architect-action-bar project-planning-action-bar" aria-label="Project Planning controls">
      <div className="architect-action-context">
        <span>Lifecycle</span>
        <strong>{model?.railStatus ?? "Not Ready"}</strong>
      </div>

      <div className="architect-required-action">
        <span>Required Action</span>
        <strong>{model?.requiredAction ?? "Refresh to resolve Project Planning evidence."}</strong>
      </div>

      <div className="architect-browser-state">
        <span>Embedded ChatGPT</span>
        <strong>{browserPresentation.label}</strong>
        <small>{browserPresentation.detail}</small>
      </div>

      <div className="architect-document-selector" role="group" aria-label="Project Planning document selector">
        <button
          className={selectedRole === "profile" ? "document-choice selected" : "document-choice"}
          disabled={!model?.profileDocument}
          onClick={() => onSelectDocument("profile")}
          type="button"
        >
          Profile
        </button>
        <button
          className={selectedRole === "roadmap" ? "document-choice selected" : "document-choice"}
          disabled={!model?.roadmapDocument}
          onClick={() => onSelectDocument("roadmap")}
          type="button"
        >
          Roadmap
        </button>
      </div>

      <button
        className="apply-button architect-copy-button"
        disabled={!model?.canPrepareHandoff}
        onClick={onPrepareHandoff}
        type="button"
      >
        Prepare Project Planning Handoff
      </button>

      <button
        className="apply-button architect-copy-button"
        disabled={!model?.canCopyHandoff}
        onClick={onCopyHandoff}
        type="button"
      >
        <Clipboard aria-hidden="true" size={16} />
        Copy Project Planning Handoff
      </button>

      <button className="icon-button text-button" onClick={onRefresh} type="button">
        <RefreshCw aria-hidden="true" size={18} />
        Refresh Planning Outputs
      </button>

      <button className="icon-button text-button" onClick={onReloadBrowser} type="button">
        <RefreshCw aria-hidden="true" size={18} />
        Reload ChatGPT
      </button>

      {showRetryButton ? (
        <button className="apply-button" onClick={onRetryBrowser} type="button">
          Retry Embedded Browser
        </button>
      ) : null}

      {actionMessage ? (
        <div
          className={`architect-action-message ${actionMessage.kind}`}
          role={actionMessage.kind === "error" ? "alert" : "status"}
        >
          {actionMessage.message}
        </div>
      ) : null}
    </section>
  );
}

function PhaseMapPreviewReview({
  isApplying,
  onReview,
  onStatusChange,
  selectedDocument,
  status,
}: {
  isApplying: boolean;
  onReview: () => void;
  onStatusChange: (status: DocumentDispositionStatus | "") => void;
  selectedDocument: PlanningDocumentDetail | null;
  status: DocumentDispositionStatus | "";
}): JSX.Element {
  const canApplyReview = shouldRenderPhaseMapDispositionControls(selectedDocument);
  const reviewDocument = canApplyReview ? selectedDocument : null;

  if (!reviewDocument) {
    return (
      <div className="document-feedback architect-preview-disposition" role="status">
        Phase Map disposition controls appear after selecting a readable Pending, Rejected, or RevisionRequested Phase Map output.
      </div>
    );
  }

  return (
    <div className="architect-preview-disposition phase-map-review" aria-label="Phase Map Review">
      <div className="architect-review-current">
        <span>Phase Map Review</span>
        <strong>Current: {reviewDocument.effectiveDisposition}</strong>
      </div>
      <label>
        <span>Disposition</span>
        <select
          disabled={isApplying}
          onChange={(event) => onStatusChange(event.target.value as DocumentDispositionStatus | "")}
          value={status}
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
        disabled={!status || isApplying}
        onClick={onReview}
        type="button"
      >
        Apply Phase Map Review
      </button>
    </div>
  );
}

function PhaseMapActionBar({
  actionFeedback,
  attachmentError,
  browserStatus,
  currentModel,
  documents,
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
  currentModel: CurrentWorkspaceModel | null;
  documents: PlanningDocumentSummary[];
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
  const handoffDocument = phaseMapHandoffDocument(documents);
  const outputDocument = phaseMapOutputDocument(documents);
  const canPrepareHandoff =
    currentModel?.activeWorkspaceId === "project-phase-map" &&
    !handoffDocument &&
    !outputDocument;

  return (
    <section className="architect-action-bar phase-map-action-bar" aria-label="Phase Map controls">
      <div className="architect-action-context">
        <span>Lifecycle</span>
        <strong>{outputDocument?.effectiveDisposition ?? (handoffDocument ? "Waiting for Output" : "Ready")}</strong>
      </div>

      <div className="architect-required-action">
        <span>Required Action</span>
        <strong>{currentModel?.requiredAction ?? "Prepare the Phase Map handoff from approved Project Planning inputs."}</strong>
      </div>

      <div className="architect-browser-state">
        <span>Embedded ChatGPT</span>
        <strong>{browserPresentation.label}</strong>
        <small>{browserPresentation.detail}</small>
      </div>

      <div className="architect-required-action">
        <span>Phase Map Evidence</span>
        <strong>{handoffDocument?.displayFilename ?? "No Phase Map handoff prepared"}</strong>
        <small>{outputDocument?.displayFilename ?? "No Phase Map output selected yet"}</small>
      </div>

      {!handoffDocument && !outputDocument ? (
        <button
          className="apply-button architect-copy-button"
          disabled={!canPrepareHandoff}
          onClick={onPrepareHandoff}
          type="button"
        >
          Prepare Phase Map Handoff
        </button>
      ) : null}

      {handoffDocument ? (
        <button
          className="apply-button architect-copy-button"
          onClick={onCopyHandoff}
          type="button"
        >
          <Clipboard aria-hidden="true" size={16} />
          Copy Phase Map Handoff
        </button>
      ) : null}

      <button className="icon-button text-button" onClick={onRefresh} type="button">
        <RefreshCw aria-hidden="true" size={18} />
        Refresh Phase Map
      </button>

      <button className="icon-button text-button" onClick={onReloadBrowser} type="button">
        <RefreshCw aria-hidden="true" size={18} />
        Reload ChatGPT
      </button>

      {showRetryButton ? (
        <button className="apply-button" onClick={onRetryBrowser} type="button">
          Retry Embedded Browser
        </button>
      ) : null}

      {actionMessage ? (
        <div
          className={`architect-action-message ${actionMessage.kind}`}
          role={actionMessage.kind === "error" ? "alert" : "status"}
        >
          {actionMessage.message}
        </div>
      ) : null}
    </section>
  );
}

function ProjectPlanningPreviewReview({
  canApplyReview,
  isApplying,
  model,
  notes,
  onNotesChange,
  onReview,
  onStatusChange,
  status,
  viewedBoth,
}: {
  canApplyReview: boolean;
  isApplying: boolean;
  model: ProjectPlanningWorkspaceModel | null;
  notes: string;
  onNotesChange: (value: string) => void;
  onReview: () => void;
  onStatusChange: (status: DocumentDispositionStatus) => void;
  status: DocumentDispositionStatus | "";
  viewedBoth: boolean;
}): JSX.Element {
  if (!model?.profileDocument || !model.roadmapDocument) {
    return (
      <div className="document-feedback architect-preview-disposition" role="status">
        {model?.reason ?? "Project Profile and Project Roadmap will appear here after MCP writes both exact outputs."}
      </div>
    );
  }

  if (!model.canApplyBundleDisposition) {
    return (
      <div className="document-error architect-preview-disposition" role="status">
        <strong>Needs Attention</strong>
        <span>{model.reason}</span>
      </div>
    );
  }

  return (
    <div className="architect-preview-disposition project-planning-review" aria-label="Project Planning Bundle Review">
      <div className="architect-review-current">
        <span>Bundle Review</span>
        <strong>Current: {model.profileDocument.disposition}</strong>
      </div>
      <label>
        <span>Disposition</span>
        <select
          onChange={(event) => onStatusChange(event.target.value as DocumentDispositionStatus)}
          value={status}
        >
          <option value="">Select disposition</option>
          {dispositionOptions.map((option) => (
            <option key={option.status} value={option.status}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="architect-notes">
        <span>{status === "RevisionRequested" ? "Revision Instructions" : "Review Notes"}</span>
        <textarea
          disabled={isApplying}
          onChange={(event) => onNotesChange(event.target.value)}
          value={notes}
        />
      </label>
      <button
        className="apply-button"
        disabled={
          !canApplyReview ||
          isApplying ||
          (status === "RevisionRequested" && notes.trim().length === 0) ||
          (status === "Approved" && !viewedBoth)
        }
        onClick={onReview}
        type="button"
      >
        Apply Planning Bundle Review
      </button>
    </div>
  );
}

function LifecycleArchitectOutputImport({
  activeWorkspaceId,
  disabled,
  onChange,
  onSave,
  value,
}: {
  activeWorkspaceId: WorkspaceId;
  disabled: boolean;
  onChange: (value: LifecycleArchitectOutputDrafts) => void;
  onSave: () => void;
  value: LifecycleArchitectOutputDrafts;
}): JSX.Element | null {
  const update = <Key extends keyof LifecycleArchitectOutputDrafts>(
    key: Key,
    nextValue: LifecycleArchitectOutputDrafts[Key],
  ): void => {
    onChange({ ...value, [key]: nextValue });
  };

  const textarea = (key: keyof LifecycleArchitectOutputDrafts, label: string): JSX.Element => (
    <label>
      <span>{label}</span>
      <textarea
        disabled={disabled}
        onChange={(event) => update(key, event.target.value)}
        value={value[key]}
      />
    </label>
  );

  const content = (() => {
    switch (activeWorkspaceId) {
      case "phase-interview":
        return {
          target: "Phase Interview",
          fields: [textarea("phaseInterviewMarkdown", "Phase Interview Markdown")],
          canSave: Boolean(value.phaseInterviewMarkdown.trim()),
        };
      case "phase-planning-bundle":
        return {
          target: "Phase Planning and Work Card Plan",
          fields: [
            textarea("phasePlanningMarkdown", "Phase Planning Markdown"),
            textarea("workCardPlanMarkdown", "Work Card Plan Markdown"),
          ],
          canSave: Boolean(value.phasePlanningMarkdown.trim() && value.workCardPlanMarkdown.trim()),
        };
      case "work-card-planning":
        return {
          target: "Formal Work Card",
          fields: [textarea("formalWorkCardMarkdown", "Formal Work Card Markdown")],
          canSave: Boolean(value.formalWorkCardMarkdown.trim()),
        };
      case "work-card-repair":
        return {
          target: "Repair Work Card",
          fields: [textarea("repairWorkCardMarkdown", "Repair Work Card Markdown")],
          canSave: Boolean(value.repairWorkCardMarkdown.trim()),
        };
      default:
        return null;
    }
  })();

  if (!content) {
    return null;
  }

  return (
    <section className="architect-output-import" aria-label="Architect Output">
      <div className="architect-output-header">
        <span>Architect Output</span>
        <strong>{content.target}</strong>
      </div>
      {content.fields.map((field, index) => (
        <div key={index}>{field}</div>
      ))}
      <button
        className="apply-button"
        disabled={disabled || !content.canSave}
        onClick={onSave}
        type="button"
      >
        Save Architect Output
      </button>
    </section>
  );
}

function ArchitectInterviewPreviewReview({
  canApplyReview,
  isApplying,
  model,
  notes,
  onNotesChange,
  onReview,
  onStatusChange,
  selectedRole,
  status,
}: {
  canApplyReview: boolean;
  isApplying: boolean;
  model: ArchitectInterviewWorkspaceModel | null;
  notes: string;
  onNotesChange: (value: string) => void;
  onReview: () => void;
  onStatusChange: (status: DocumentDispositionStatus) => void;
  selectedRole: ArchitectInterviewSelectedDocumentRole;
  status: DocumentDispositionStatus | "";
}): JSX.Element {
  const reviewRegion = getArchitectInterviewReviewRegionState({ model, selectedRole });

  if (reviewRegion.kind === "prompt-or-missing") {
    return (
      <div className="document-feedback architect-preview-disposition" role="status">
        {reviewRegion.statement}
      </div>
    );
  }

  if (reviewRegion.kind === "invalid") {
    return (
      <div className="document-error architect-preview-disposition" role="status">
        <strong>Needs Attention</strong>
        <span>{reviewRegion.diagnostics}</span>
      </div>
    );
  }

  return (
    <div className="architect-preview-disposition" aria-label="Interview Review">
      <div className="architect-review-current">
        <span>Interview Review</span>
        <strong>Current: {model?.interviewDisposition ?? "Pending"}</strong>
      </div>
      <label>
        <span>Disposition</span>
        <select
          onChange={(event) => onStatusChange(event.target.value as DocumentDispositionStatus)}
          value={status}
        >
          <option value="">Select disposition</option>
          {dispositionOptions.map((option) => (
            <option key={option.status} value={option.status}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      {status === "RevisionRequested" ? (
        <label className="architect-notes">
          <span>Revision Instructions</span>
          <textarea
            disabled={!canApplyReview}
            onChange={(event) => onNotesChange(event.target.value)}
            value={notes}
          />
        </label>
      ) : null}
      <button
        className="apply-button"
        disabled={!canApplyReview || isApplying || (status === "RevisionRequested" && notes.trim().length === 0)}
        onClick={onReview}
        type="button"
      >
        Apply Interview Review
      </button>
    </div>
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

function architectInterviewRoleForSelection(
  selectedDocumentId: string | null,
  model: ArchitectInterviewWorkspaceModel | null,
): ArchitectInterviewSelectedDocumentRole {
  if (selectedDocumentId && selectedDocumentId === model?.interviewDocument?.logicalDocumentId) {
    return "interview";
  }
  return "prompt";
}

function projectPlanningRoleForSelection(
  selectedDocumentId: string | null,
  model: ProjectPlanningWorkspaceModel | null,
): ProjectPlanningSelectedDocumentRole | null {
  if (!selectedDocumentId || !model) {
    return null;
  }
  if (selectedDocumentId === model.profileDocument?.logicalDocumentId) {
    return "profile";
  }
  if (selectedDocumentId === model.roadmapDocument?.logicalDocumentId) {
    return "roadmap";
  }
  return null;
}

function projectPlanningRevisionKey(
  role: ProjectPlanningSelectedDocumentRole,
  model: ProjectPlanningWorkspaceModel | null,
): string | null {
  const document = role === "profile" ? model?.profileDocument : model?.roadmapDocument;
  return document ? `${role}:${document.markdownPath}:${document.artifactRevision}` : null;
}

function projectPlanningDocumentsViewed(
  model: ProjectPlanningWorkspaceModel | null,
  viewedKeys: string[],
): boolean {
  const profileKey = projectPlanningRevisionKey("profile", model);
  const roadmapKey = projectPlanningRevisionKey("roadmap", model);
  return Boolean(profileKey && roadmapKey && viewedKeys.includes(profileKey) && viewedKeys.includes(roadmapKey));
}

function buildProjectPlanningEvidenceFingerprint(
  workspaceRoot: string,
  model: ProjectPlanningWorkspaceModel,
): string {
  return JSON.stringify({
    workspaceRoot,
    state: model.state,
    handoff: [model.handoffMarkdownPath, model.handoffArtifactRevision],
    profile: model.profileDocument
      ? [model.profileDocument.markdownPath, model.profileDocument.artifactRevision, model.profileDocument.disposition]
      : null,
    roadmap: model.roadmapDocument
      ? [model.roadmapDocument.markdownPath, model.roadmapDocument.artifactRevision, model.roadmapDocument.disposition]
      : null,
    bundle: model.bundleSynchronizationState,
  });
}

function buildPhaseMapEvidenceFingerprint(
  workspaceRoot: string,
  documents: PlanningDocumentSummary[],
): string {
  return JSON.stringify({
    workspaceRoot,
    phaseMapDocuments: documents
      .filter((document) =>
        document.metadata.artifactType === "phase-map" ||
        (
          document.metadata.artifactType === "generated-handoff" &&
          document.metadata.canonical?.workflowData.handoffKind === "phase-map"
        ),
      )
      .map((document) => ({
        markdownPath: document.markdownPath,
        artifactRevision: document.metadata.artifactRevision,
        disposition: document.effectiveDisposition,
        readError: document.readError ?? "",
        workflowData: document.metadata.canonical?.workflowData ?? {},
        sourceRevisions: document.metadata.sourceRevisions ?? [],
      })),
  });
}

function isArchitectEnabledWorkspace(activeWorkspaceId: WorkspaceId): boolean {
  return activeWorkspaceId === "architect-interview" ||
    activeWorkspaceId === "project-planning-review" ||
    activeWorkspaceId === "project-phase-map";
}

function phaseMapHandoffDocument(documents: PlanningDocumentSummary[]): PlanningDocumentSummary | null {
  return documents
    .filter((document) => document.metadata.artifactType === "generated-handoff")
    .filter((document) => document.metadata.participationRole === "nonReviewHandoff")
    .filter((document) => document.metadata.canonical?.workflowData.handoffKind === "phase-map")
    .at(-1) ?? null;
}

function phaseMapOutputDocument(documents: PlanningDocumentSummary[]): PlanningDocumentSummary | null {
  return documents
    .filter((document) => classifyPlanningDocument(document).workspaceId === "project-phase-map")
    .filter(isWorkflowReviewDocument)
    .at(-1) ?? null;
}

function architectPreviewMessage(
  selectedRole: ArchitectInterviewSelectedDocumentRole,
  model: ArchitectInterviewWorkspaceModel | null,
): string {
  if (selectedRole === "prompt") {
    return "Prompt is an Approved non-review handoff input. Interview disposition controls are unavailable for this document.";
  }
  if (!model?.interviewDocument) {
    return "Waiting for the Architect-authored Interview output at the exact prompt targets.";
  }
  if (!model.canApplyDisposition) {
    return model.reason;
  }
  return "Interview output is the Operator review target.";
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
}): JSX.Element {
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
