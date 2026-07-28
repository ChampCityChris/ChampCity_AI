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
  type ProjectIntakeSubmission,
  type WorkspaceMigrationPreview,
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
  getWorkspaceDocumentCounts,
  getWorkspaceGroups,
} from "../../shared/workspaces/documentWorkspace";
import {
  shouldRenderGenericPreviewDispositionControls,
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
  "project-planning-review",
  "project-phase-map",
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

const navigationGroups: Array<{ label: string; workspaceIds: WorkspaceId[] }> = [
  {
    label: "Project",
    workspaceIds: [
      "project-intake-capture",
      "architect-interview",
      "project-planning-review",
      "project-phase-map",
      "project-validation",
      "project-close",
    ],
  },
  {
    label: "Phase",
    workspaceIds: [
      "phase-interview",
      "phase-planning-bundle",
      "phase-work-card-selection",
      "phase-validation",
      "phase-close",
    ],
  },
  {
    label: "Work Card",
    workspaceIds: [
      "work-card-intake",
      "work-card-planning",
      "work-card-building-review",
      "work-card-repair",
      "work-card-validation",
      "work-card-close",
    ],
  },
];

const fallbackWorkspace: WorkspaceSelection = {
  ok: false,
  workspaceRoot: null,
  reason: "No workspace selected.",
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
  projectProfileMarkdown: string;
  projectRoadmapMarkdown: string;
  phaseMapMarkdown: string;
  phaseInterviewMarkdown: string;
  phasePlanningMarkdown: string;
  workCardPlanMarkdown: string;
  formalWorkCardMarkdown: string;
  repairWorkCardMarkdown: string;
};

const emptyLifecycleArchitectOutputDrafts: LifecycleArchitectOutputDrafts = {
  projectProfileMarkdown: "",
  projectRoadmapMarkdown: "",
  phaseMapMarkdown: "",
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
  const [migrationPreview, setMigrationPreview] = useState<WorkspaceMigrationPreview | null>(null);
  const [migrationFeedback, setMigrationFeedback] = useState("");
  const [isPreviewingMigration, setIsPreviewingMigration] = useState(false);
  const [isMigratingWorkspace, setIsMigratingWorkspace] = useState(false);
  const [projectIntake, setProjectIntake] =
    useState<ProjectIntakeSubmission>(emptyProjectIntake);
  const [architectStatus, setArchitectStatus] =
    useState<ArchitectBrowserFoundationStatus | null>(null);
  const [architectInterviewModel, setArchitectInterviewModel] =
    useState<ArchitectInterviewWorkspaceModel | null>(null);
  const [architectReviewEdit, setArchitectReviewEdit] =
    useState<ArchitectInterviewReviewEditState | null>(null);
  const [architectActionFeedback, setArchitectActionFeedback] =
    useState<ArchitectActionFeedback>(null);
  const [architectOutputMarkdown, setArchitectOutputMarkdown] = useState("");
  const [lifecycleArchitectOutputs, setLifecycleArchitectOutputs] =
    useState<LifecycleArchitectOutputDrafts>(emptyLifecycleArchitectOutputDrafts);
  const [architectPollingError, setArchitectPollingError] = useState("");
  const architectEvidenceFingerprintRef = useRef<string | null>(null);
  const architectPollInFlightRef = useRef(false);
  const architectPollRequestRef = useRef(0);
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

    const shouldAttachEmbeddedSurface = activeWorkspaceId === "architect-interview";
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

  const workspaceGroups = useMemo(
    () => getWorkspaceGroups(documents, activeWorkspaceId),
    [activeWorkspaceId, documents],
  );
  const workspaceCounts = useMemo(() => getWorkspaceDocumentCounts(documents), [documents]);
  const projectIntakeRailStatus = useMemo(
    () => deriveProjectIntakeRailStatus(documents),
    [documents],
  );
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
      setDocumentError(error instanceof Error ? error.message : "Workspace could not be selected.");
    } finally {
      setIsChoosing(false);
    }
  }

  async function clearWorkspace(): Promise<void> {
    setWorkspace(await window.champcity.clearSelectedWorkspace());
    clearRepositoryDerivedState();
    setProjectIntake((current) => ({ ...current, projectRepository: "" }));
    setActiveWorkspaceId("project-intake-capture");
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
      setActiveWorkspaceId(nextPostSubmitState.viewedWorkspaceId);
      setSelectedDocumentId(nextPostSubmitState.selectedDocumentId);
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
    try {
      const result = await window.champcity.copyArchitectHandoff();
      setArchitectFeedback({ kind: "success", message: result.message }, 4500);
      await refreshArchitectStatus();
      await refreshArchitectInterviewWorkspace();
    } catch (error) {
      setArchitectFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Architect handoff could not be copied.",
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
      setArchitectAttachmentError("Architect Interview must be active before retrying the embedded browser.");
      return;
    }
    await coordinator.retry();
  }

  async function applyArchitectInterviewReview(): Promise<void> {
    if (!architectReviewEdit?.sourceToken || !architectReviewEdit.selectedDisposition) {
      setDocumentError("Refresh the Architect Interview output before applying review.");
      return;
    }
    setIsApplying(true);
    setDocumentError("");
    setFeedback("");
    try {
      const nextModel = await window.champcity.reviewArchitectInterview(
        architectReviewEdit.selectedDisposition,
        architectReviewEdit.notes,
        architectReviewEdit.sourceToken,
      );
      setArchitectInterviewModel(nextModel);
      setArchitectReviewEdit(reviewEditStateFromModel(workspace.ok ? workspace.workspaceRoot : null, nextModel));
      architectEvidenceFingerprintRef.current = buildArchitectInterviewEvidenceFingerprint(
        workspace.ok ? workspace.workspaceRoot : null,
        nextModel,
      );
      setFeedback(`Architect Interview disposition applied: ${architectReviewEdit.selectedDisposition}.`);
      const nextDocuments = await window.champcity.listDocuments();
      applyDocumentInventory(nextDocuments);
      const nextResolverResult = await window.champcity.resolveCurrentDocument();
      setResolverResult(nextResolverResult);
      await refreshCurrentModel();
      if (nextModel.interviewDocument?.logicalDocumentId) {
        setSelectedDocumentId(nextModel.interviewDocument.logicalDocumentId);
      }
      setActiveWorkspaceId("architect-interview");
    } catch (error) {
      setDocumentError(error instanceof Error ? error.message : "Architect Interview review could not be applied.");
    } finally {
      setIsApplying(false);
    }
  }

  async function saveArchitectOutput(): Promise<void> {
    if (!architectInterviewModel?.interviewTargets?.markdownPath) {
      setDocumentError("Architect Output is unavailable until Architect Interview prerequisites are satisfied.");
      return;
    }
    if (!architectOutputMarkdown.trim()) {
      setDocumentError("Paste substantive Architect Markdown before saving.");
      return;
    }
    setIsApplying(true);
    setDocumentError("");
    setFeedback("");
    try {
      await window.champcity.saveArchitectInterviewOutput(architectOutputMarkdown);
      setArchitectOutputMarkdown("");
      setFeedback("Architect Output saved.");
      await refreshDocuments();
      await refreshArchitectInterviewWorkspace({ autoSelectNewOutput: true, force: true });
      setActiveWorkspaceId("architect-interview");
    } catch (error) {
      setDocumentError(error instanceof Error ? error.message : "Architect Output could not be saved.");
    } finally {
      setIsApplying(false);
    }
  }

  async function refreshCurrentModel(): Promise<void> {
    try {
      const nextModel = await window.champcity.getCurrentWorkspaceModel();
      setCurrentModel(nextModel);
    } catch {
      setCurrentModel(null);
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
        case "project-planning-review": {
          const result = await window.champcity.saveProjectPlanningOutputs({
            projectProfileMarkdown: lifecycleArchitectOutputs.projectProfileMarkdown,
            projectRoadmapMarkdown: lifecycleArchitectOutputs.projectRoadmapMarkdown,
          });
          selectedPath = result.projectProfileMarkdownPath;
          setCurrentModel(result.currentWorkspaceModel);
          setLifecycleArchitectOutputs((current) => ({
            ...current,
            projectProfileMarkdown: "",
            projectRoadmapMarkdown: "",
          }));
          break;
        }
        case "project-phase-map": {
          const result = await window.champcity.savePhaseMapOutput(lifecycleArchitectOutputs.phaseMapMarkdown);
          selectedPath = result.phaseMapMarkdownPath;
          setCurrentModel(result.currentWorkspaceModel);
          setLifecycleArchitectOutputs((current) => ({ ...current, phaseMapMarkdown: "" }));
          break;
        }
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
          throw new Error("Current workspace does not accept Architect output.");
      }
      setFeedback("Architect Output saved.");
      const nextDocuments = await window.champcity.listDocuments();
      applyDocumentInventory(nextDocuments);
      const nextResolverResult = await window.champcity.resolveCurrentDocument();
      setResolverResult(nextResolverResult);
      const savedDocument = nextDocuments.find((document) => document.markdownPath === selectedPath);
      if (savedDocument) {
        setSelectedDocumentId(savedDocument.logicalDocumentId);
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
      await refreshMigrationPreview({ quiet: true });
      await refreshCurrentModel();
      await refreshArchitectInterviewWorkspace({
        autoSelectNewOutput: activeWorkspaceId === "architect-interview",
        force: true,
        quiet: activeWorkspaceId !== "architect-interview",
        refreshRepositoryProjection: false,
      });
      if (options.useResolver) {
        const nextResolverResult = await window.champcity.resolveCurrentDocument();
        selectResolverResult(nextResolverResult);
        setFeedback(getResolverFeedback(nextResolverResult));
      } else {
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

  async function refreshMigrationPreview(options: { quiet?: boolean } = {}): Promise<void> {
    if (!workspace.ok) {
      setMigrationPreview(null);
      return;
    }
    setIsPreviewingMigration(true);
    if (!options.quiet) {
      setDocumentError("");
      setMigrationFeedback("");
    }
    try {
      const preview = await window.champcity.previewWorkspaceMigration();
      setMigrationPreview(preview);
      if (!options.quiet) {
        setMigrationFeedback(preview.state === "not-required"
          ? "No workspace migration required."
          : `${preview.readyCount} ready, ${preview.blockedCount} blocked.`);
      }
    } catch (error) {
      setMigrationPreview(null);
      if (!options.quiet) {
        setDocumentError(error instanceof Error ? error.message : "Migration preview failed.");
      }
    } finally {
      setIsPreviewingMigration(false);
    }
  }

  async function applyWorkspaceMigration(): Promise<void> {
    setIsMigratingWorkspace(true);
    setDocumentError("");
    setMigrationFeedback("");
    try {
      const result = await window.champcity.applyWorkspaceMigration();
      setMigrationPreview(result.preview);
      setMigrationFeedback(`Migrated ${result.migratedPaths.length} document(s); deleted ${result.deletedPaths.length} legacy file(s).`);
      await refreshDocuments({ useResolver: true });
    } catch (error) {
      setDocumentError(error instanceof Error ? error.message : "Migration failed.");
      await refreshMigrationPreview({ quiet: true });
    } finally {
      setIsMigratingWorkspace(false);
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
    setActiveWorkspaceId("project-intake-capture");
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
    setMigrationPreview(null);
    setMigrationFeedback("");
    setArchitectFeedback(null);
    setArchitectPollingError("");
    architectEvidenceFingerprintRef.current = null;
    architectPollRequestRef.current += 1;
    architectPollInFlightRef.current = false;
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

  function selectResolverResult(result: FirstNonApprovedResult): void {
    setResolverResult(result);

    if (result.status === "pre-intake") {
      setActiveWorkspaceId(result.activeWorkspaceId);
      setSelectedDocumentId(null);
      setSelectedDocument(null);
      void refreshCurrentModel();
      return;
    }

    if (result.status === "project-intake-incomplete") {
      setActiveWorkspaceId(result.activeWorkspaceId);
      setSelectedDocumentId(null);
      setSelectedDocument(null);
      void refreshCurrentModel();
      return;
    }

    if (result.status === "project-intake-conflict") {
      setActiveWorkspaceId(result.activeWorkspaceId);
      setSelectedDocumentId(null);
      setSelectedDocument(null);
      void refreshCurrentModel();
      return;
    }

    if (result.status === "waiting-for-architect-interview") {
      setActiveWorkspaceId(result.activeWorkspaceId);
      setSelectedDocumentId(result.promptLogicalDocumentId);
      void refreshCurrentModel();
      return;
    }

    if (result.status === "current") {
      setActiveWorkspaceId(result.document.owningWorkspaceId);
      setSelectedDocumentId(result.document.logicalDocumentId);
      void refreshCurrentModel();
      return;
    }

    setSelectedDocumentId(null);
    setSelectedDocument(null);
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
      await refreshCurrentModel();
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
        setActiveWorkspaceId(nextResolverResult.document.owningWorkspaceId);
        setSelectedDocumentId(nextResolverResult.document.logicalDocumentId);
        setFeedback(getResolverFeedback(nextResolverResult));
      } else if (selectedStatus === "Approved" && nextResolverResult.status === "all-approved") {
        setSelectedDocumentId(null);
        setSelectedDocument(null);
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

  return (
    <main className="app-root">
      <NestedWorkflowRail
        activeWorkspaceId={activeWorkspaceId}
        architectInterviewStatus={deriveArchitectInterviewRailStatus(architectInterviewModel)}
        onWorkspaceChange={setActiveWorkspaceId}
        projectIntakeStatus={projectIntakeRailStatus}
        requiredWorkspaceId={currentModel?.activeWorkspaceId ?? null}
        workspaceCounts={workspaceCounts}
      />

      <div className="app-body">
      <aside className="sidebar" aria-label="Workspaces">
        <nav className="workspace-nav">
          {navigationGroups.map((group) => (
            <div className="workspace-nav-group" key={group.label}>
              <h2>{group.label}</h2>
              {group.workspaceIds.map((workspaceId) => {
                const definition = workspaceDefinitions.find((candidate) => candidate.id === workspaceId);
                if (!definition) {
                  return null;
                }
                const isCurrentRequired = currentModel?.activeWorkspaceId === definition.id;
                return (
                  <button
                    className={[
                      "workspace-tab",
                      definition.id === activeWorkspaceId ? "active" : "",
                      isCurrentRequired ? "required" : "",
                    ].filter(Boolean).join(" ")}
                    key={definition.id}
                    onClick={() => setActiveWorkspaceId(definition.id)}
                    type="button"
                  >
                    <span>{shortWorkspaceLabel(definition.label)}</span>
                    <small>{workspaceCounts[definition.id] ?? 0}</small>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

        <section
          className={[
            "workspace-surface",
            activeWorkspaceId === "architect-interview" ? "architect-interview-surface" : "",
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
              <button
                className="icon-button text-button"
                disabled={isChoosing}
                onClick={chooseWorkspace}
                title="Choose workspace"
                type="button"
              >
                <FolderOpen aria-hidden="true" size={18} />
                {isChoosing ? "Choosing..." : "Choose Workspace"}
              </button>
              <button
                className="icon-button"
                onClick={clearWorkspace}
                title="Clear selected workspace"
                type="button"
              >
                <RotateCcw aria-hidden="true" size={18} />
              </button>
            </div>
          </header>

          {activeWorkspaceId !== "architect-interview" ? (
            <div className={workspace.ok ? "workspace-status ready" : "workspace-status"}>
              <span>Selected workspace</span>
              <strong>{workspace.ok ? workspace.workspaceRoot : workspace.reason}</strong>
            </div>
          ) : null}

          {activeWorkspaceId !== "architect-interview" && workspace.ok ? (
            <section className={[
              "migration-panel",
              migrationPreview?.state === "blocked" ? "blocked" : "",
              migrationPreview?.state === "required" ? "required" : "",
            ].filter(Boolean).join(" ")}
            >
              <div>
                <span>Workspace Migration Required</span>
                <strong>
                  {migrationPreview
                    ? migrationPreview.state === "not-required"
                      ? "No"
                      : migrationPreview.state === "blocked"
                        ? "Blocked"
                        : "Yes"
                    : "Unknown"}
                </strong>
                <p>{migrationFeedback || migrationPreviewSummary(migrationPreview)}</p>
              </div>
              <div className="migration-actions">
                <button
                  className="icon-button text-button"
                  disabled={isPreviewingMigration || isMigratingWorkspace}
                  onClick={() => void refreshMigrationPreview()}
                  type="button"
                >
                  <RefreshCw aria-hidden="true" size={18} />
                  {isPreviewingMigration ? "Previewing..." : "Preview Migration"}
                </button>
                <button
                  className="primary-button"
                  disabled={
                    isMigratingWorkspace ||
                    isPreviewingMigration ||
                    !migrationPreview ||
                    migrationPreview.state !== "required"
                  }
                  onClick={() => void applyWorkspaceMigration()}
                  type="button"
                >
                  {isMigratingWorkspace ? "Migrating..." : "Migrate Workspace"}
                </button>
              </div>
            </section>
          ) : null}

          {activeWorkspaceId !== "architect-interview" ? (
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

          {activeWorkspaceId !== "project-intake-capture" && activeWorkspaceId !== "architect-interview" ? (
            <CurrentActionPanel
              activeWorkspaceId={activeWorkspaceId}
              inputs={actionInputs}
              model={currentModel}
              onChange={setActionInputs}
              onRun={runWorkspaceAction}
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
            {activeWorkspaceId !== "architect-interview" ? (
            <div className="document-list" aria-label={`${activeWorkspace.label} documents`}>
              {workspaceGroups.length === 0 ? (
                <div className="empty-list">
                  <p>{workspace.ok ? "No documents in this workspace." : neutralMessage}</p>
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
                {selectedDocument?.preview ?? neutralMessage}
              </pre>

              {activeWorkspaceId === "architect-interview" ? (
                <ArchitectOutputImport
                  disabled={isApplying || !architectInterviewModel?.interviewTargets?.markdownPath}
                  model={architectInterviewModel}
                  onChange={setArchitectOutputMarkdown}
                  onSave={saveArchitectOutput}
                  value={architectOutputMarkdown}
                />
              ) : null}

              {activeWorkspaceId !== "architect-interview" ? (
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
              ) : specializedDispositionWorkspaceIds.has(activeWorkspaceId) ? (
                <div className="document-feedback" role="status">
                  This workspace uses its specialized action authority instead of generic single-document disposition.
                </div>
              ) : shouldRenderGenericPreviewDispositionControls(
                  activeWorkspaceId,
                  specializedDispositionWorkspaceIds.has(activeWorkspaceId),
                ) ? (
                renderDispositionControls("disposition-controls")
              ) : null}
            </article>
            {activeWorkspaceId === "architect-interview" ? (
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
  const canApplyDisposition = specializedDispositionWorkspaceIds.has(activeWorkspaceId);

  return (
    <section className="workspace-action-panel" aria-label="Workspace actions">
      <div className="current-action-context">
        <span>Action Authority</span>
        <strong>{model?.currentTarget ?? "Resolve current workspace to enable actions"}</strong>
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
  const showRetryButton = shouldShowArchitectBrowserRetry(browserStatus);
  const actionMessage = actionFeedbackForDisplay(attachmentError, pollingError, actionFeedback);

  return (
    <section className="architect-action-bar" aria-label="Architect Interview controls">
      <div className="architect-action-context">
        <span>Lifecycle</span>
        <strong>{model?.railStatus ?? "Open"}</strong>
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
        Copy Architect Handoff
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

function ArchitectOutputImport({
  disabled,
  model,
  onChange,
  onSave,
  value,
}: {
  disabled: boolean;
  model: ArchitectInterviewWorkspaceModel | null;
  onChange: (value: string) => void;
  onSave: () => void;
  value: string;
}): JSX.Element {
  const target = model?.interviewTargets?.markdownPath ?? "Architect Interview Markdown";
  const sources = model?.evidencePaths ?? [];
  return (
    <section className="architect-output-import" aria-label="Architect Output">
      <div className="architect-output-header">
        <span>Architect Output</span>
        <strong>{target}</strong>
      </div>
      {sources.length ? <small>{sources.join("; ")}</small> : null}
      <label>
        <span>Paste the substantive Markdown produced in the embedded Architect chat.</span>
        <textarea
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          value={value}
        />
      </label>
      <button
        className="apply-button"
        disabled={disabled || value.trim().length === 0}
        onClick={onSave}
        type="button"
      >
        Save Architect Output
      </button>
    </section>
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
      case "project-planning-review":
        return {
          target: "Project Profile and Project Roadmap",
          fields: [
            textarea("projectProfileMarkdown", "Project Profile Markdown"),
            textarea("projectRoadmapMarkdown", "Project Roadmap Markdown"),
          ],
          canSave: Boolean(value.projectProfileMarkdown.trim() && value.projectRoadmapMarkdown.trim()),
        };
      case "project-phase-map":
        return {
          target: "Phase Map",
          fields: [textarea("phaseMapMarkdown", "Phase Map Markdown")],
          canSave: Boolean(value.phaseMapMarkdown.trim()),
        };
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

function shortWorkspaceLabel(label: string): string {
  return label
    .replace("Project Plan and Roadmap Review", "Planning")
    .replace("Project Intake Capture", "Intake")
    .replace("Project Validation", "Validation")
    .replace("Project Close", "Close")
    .replace("Phase Planning Bundle", "Planning")
    .replace("Phase Work Card Selection", "Work Card Selection")
    .replace("Work Card Building Review", "Building Review");
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
    <section className="current-workspace-banner" aria-label="Current required workspace">
      <div>
        <span>Current Required Workspace</span>
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

function migrationPreviewSummary(preview: WorkspaceMigrationPreview | null): string {
  if (!preview) {
    return "Preview has not run for the selected workspace.";
  }
  if (preview.state === "not-required") {
    return "No legacy pairs found.";
  }
  const firstBlocked = preview.items.find((item) => item.status === "blocked");
  if (firstBlocked) {
    return `${preview.readyCount} ready, ${preview.blockedCount} blocked: ${firstBlocked.findings[0] ?? firstBlocked.markdownPath}`;
  }
  const firstReady = preview.items.find((item) => item.status === "ready");
  return `${preview.readyCount} ready, target ${firstReady?.targetMarkdownPath ?? "Markdown"}.`;
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
        <span>Current workspace</span>
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
        <span>Current workspace</span>
        <strong>All planning documents approved</strong>
      </section>
    );
  }

  if (resolverResult?.status === "project-intake-incomplete") {
    return (
      <section className="current-document-summary">
        <span>Current workspace</span>
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
        <span>Current workspace</span>
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
        <span>Current workspace</span>
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
      <span>Current workspace</span>
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
