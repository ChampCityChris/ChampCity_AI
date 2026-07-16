import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent as ReactClipboardEvent,
  type ReactNode,
} from "react";
import {
  Archive,
  AlertTriangle,
  CheckCircle,
  CheckSquare,
  ChevronRight,
  ClipboardList,
  Copy,
  Eye,
  FileText,
  FolderOpen,
  GitBranch,
  Info,
  ListChecks,
  Map as MapIcon,
  MessageSquareText,
  RefreshCw,
  Save,
  ShieldAlert,
  Upload,
  Wand2,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type {
  ProjectScanResult,
  ProjectWorkspaceListResult,
} from "../../shared/projects";

import logoImage from "../assets/champcity_ai_ui_branding.png";
import {
  readHumanValidationDraft,
  storeHumanValidationDraft,
  type HumanValidationDraft,
  type HumanValidationDraftCache,
} from "../../shared/workCards/humanValidationDrafts";
import { resolveValidationTargetFileName } from "../../shared/workCards/validationTarget";
import { architectReviewDecisionValues } from "../../shared/workCards/reportReviewProtocol";
import {
  findCurrentActionArchitectReviewWorkCardFileName,
  type ArchitectReviewDecision,
  type ArchitectReviewFormInput,
  type ArchitectReviewPreviewResult,
  type RoutedArchitectReviewBinding,
  type ArchitectReviewSaveResult,
  type ArchitectReviewSectionKey,
} from "../../shared/workCards/architectReviewRecord";
import type { ArchitectTaskPacketSaveResult } from "../../shared/workCards/architectTaskPacket";
import {
  getManualScreenForCurrentAction,
  WorkflowRouterShell,
} from "./WorkflowRouterShell";

type AppScreen =
  | "project-intake"
  | "project-architect-interview"
  | "project-planning-documents"
  | "project-roadmap"
  | "phase-map"
  | "phase-intake"
  | "phase-architect-interview"
  | "repository-reconciliation"
  | "phase-planning-documents"
  | "work-card-plan-review"
  | "new-work-card"
  | "architect-prompt-composer"
  | "risk-router"
  | "implementer-execution-packet"
  | "implementer-report-capture"
  | "architect-review"
  | "architect-bridge"
  | "human-validation"
  | "candidate-disposition"
  | "phase-closeout";

type NoticeType = "warning" | "error" | "info" | "success";
type WorkflowMode = "architect" | "implementer";

interface WorkflowStep {
  id: AppScreen;
  label: string;
  mode: WorkflowMode;
  shortDesc: string;
  screenTitle: string;
  nextAction: string;
  Icon: LucideIcon;
}

interface UiWorkCardSummary {
  fileName?: string;
  workCardId: string;
  title: string;
  phase: string;
  status: string;
  riskLevel: string;
}

const defaultPhase = "phase-01";
const PHASES = ["phase-01", "phase-02", "phase-03"];
const projectIntakeStageOptions: ChampCityProjectIntakeStage[] = [
  "idea",
  "prototype",
  "mvp",
  "alpha",
  "beta",
  "production",
  "maintenance",
  "unknown",
];
const phaseIntakeWorkTypeOptions: Array<{
  value: NonNullable<ChampCityPhaseIntakeInput["operatorProjectWorkType"]>;
  label: string;
}> = [
  { value: "new_project", label: "New project" },
  { value: "ongoing_project", label: "Ongoing project" },
  { value: "repair_pass", label: "Repair pass" },
  { value: "ui_pass", label: "UI pass" },
  { value: "validation_pass", label: "Validation pass" },
  { value: "planning_pass", label: "Planning pass" },
];
const workCardJsonSelectorHelp =
  "Only Work Cards with JSON artifacts can be selected. Markdown-only notes are compatibility records, not app-readable Work Cards.";

const workflowSteps: WorkflowStep[] = [
  {
    id: "project-intake",
    label: "Project Intake",
    mode: "architect",
    shortDesc: "Start upstream",
    screenTitle: "Project Intake",
    nextAction: "Capture plain-language project intent before Architect interview.",
    Icon: ClipboardList,
  },
  {
    id: "project-architect-interview",
    label: "Project Architect Interview",
    mode: "architect",
    shortDesc: "Interview prompt",
    screenTitle: "Project Architect Interview",
    nextAction: "Generate a copy-ready Architect interview prompt from saved intake.",
    Icon: MessageSquareText,
  },
  {
    id: "project-planning-documents",
    label: "Project Plan",
    mode: "architect",
    shortDesc: "Planning docs",
    screenTitle: "Project Planning Documents",
    nextAction:
      "Generate durable project planning documents from completed Architect output.",
    Icon: MapIcon,
  },
  {
    id: "repository-reconciliation",
    label: "Reconcile",
    mode: "architect",
    shortDesc: "Project state review",
    screenTitle: "Repository Reconciliation",
    nextAction:
      "Review current repo/project state before Roadmap generation.",
    Icon: GitBranch,
  },
  {
    id: "project-roadmap",
    label: "Project Roadmap",
    mode: "architect",
    shortDesc: "Sequence phases",
    screenTitle: "Project Roadmap",
    nextAction: "Propose the reviewed project progression before phase mapping.",
    Icon: MapIcon,
  },
  {
    id: "phase-map",
    label: "Phase Map",
    mode: "architect",
    shortDesc: "Mapped phases",
    screenTitle: "Phase Map Composer",
    nextAction:
      "Generate or update mapped phase records from the reviewed Roadmap.",
    Icon: MapIcon,
  },
  {
    id: "phase-intake",
    label: "Phase Intake",
    mode: "architect",
    shortDesc: "Capture phase intent",
    screenTitle: "Phase Intake",
    nextAction: "Capture the exact intent and constraints for the mapped phase.",
    Icon: ClipboardList,
  },
  {
    id: "phase-architect-interview",
    label: "Phase Architect Interview",
    mode: "architect",
    shortDesc: "Frame phase",
    screenTitle: "Phase Architect Interview",
    nextAction: "Generate the phase-specific Architect framing prompt.",
    Icon: MessageSquareText,
  },
  {
    id: "phase-planning-documents",
    label: "Phase Plan",
    mode: "architect",
    shortDesc: "Plan phase",
    screenTitle: "Phase Planning Documents Generator",
    nextAction:
      "Select a mapped phase and generate phase planning documents.",
    Icon: ListChecks,
  },
  {
    id: "work-card-plan-review",
    label: "Work Card Plan Review",
    mode: "architect",
    shortDesc: "Review planned cards",
    screenTitle: "Work Card Plan Review",
    nextAction:
      "Review proposed Work Card slots before any Formal Work Cards are created.",
    Icon: CheckSquare,
  },
  {
    id: "new-work-card",
    label: "Ad Hoc Work Card Capture",
    mode: "architect",
    shortDesc: "Out-of-cycle work",
    screenTitle: "Ad Hoc Work Card Capture",
    nextAction:
      "Capture one-off, repair, emergency, or operator-discovered work outside the planned phase path.",
    Icon: FileText,
  },
  {
    id: "architect-prompt-composer",
    label: "Architect",
    mode: "architect",
    shortDesc: "Refine scope",
    screenTitle: "Architect Prompt Composer",
    nextAction: "Frame the Work Card before implementation.",
    Icon: Wand2,
  },
  {
    id: "risk-router",
    label: "Risk",
    mode: "architect",
    shortDesc: "Pre-flight check",
    screenTitle: "Risk Router",
    nextAction: "Check risk flags without mutating the Work Card.",
    Icon: ShieldAlert,
  },
  {
    id: "implementer-execution-packet",
    label: "Implement",
    mode: "implementer",
    shortDesc: "Implementer handoff",
    screenTitle: "Implementer Prompt Generator",
    nextAction: "Generate a bounded prompt for Codex or another coding agent.",
    Icon: Zap,
  },
  {
    id: "implementer-report-capture",
    label: "Report",
    mode: "implementer",
    shortDesc: "Capture evidence",
    screenTitle: "Implementer Report Capture",
    nextAction: "Record what changed and what was validated.",
    Icon: ClipboardList,
  },
  {
    id: "human-validation",
    label: "Validate",
    mode: "implementer",
    shortDesc: "Confirm it worked",
    screenTitle: "Human Validation",
    nextAction: "Capture Operator validation and repair needs.",
    Icon: CheckSquare,
  },
  {
    id: "phase-closeout",
    label: "Closeout",
    mode: "implementer",
    shortDesc: "Phase decision",
    screenTitle: "Phase Closeout",
    nextAction: "Review phase artifacts and record a closeout decision.",
    Icon: Archive,
  },
];

const routedOnlyWorkflowScreens: WorkflowStep[] = [
  {
    id: "architect-review",
    label: "Architect Review",
    mode: "architect",
    shortDesc: "Review implementation evidence",
    screenTitle: "Architect Review of Implementer Report",
    nextAction:
      "Review the associated Implementer Report and create the governed Architect Review output.",
    Icon: Eye,
  },
  {
    id: "architect-bridge",
    label: "Architect Bridge",
    mode: "architect",
    shortDesc: "Task packet and ChatGPT",
    screenTitle: "Architect Bridge",
    nextAction:
      "Generate a canonical Architect Task Packet and copy the prompt into ChatGPT.com.",
    Icon: MessageSquareText,
  },
  {
    id: "candidate-disposition",
    label: "Parent Disposition",
    mode: "implementer",
    shortDesc: "Record repaired-parent resolution",
    screenTitle: "Completed via Repair Disposition",
    nextAction: "Record the explicit Operator-approved parent resolution before advancing.",
    Icon: CheckCircle,
  },
];

const availableWorkflowScreens = [
  ...workflowSteps,
  ...routedOnlyWorkflowScreens,
];

const initialWorkCardForm: ChampCityWorkCardDraftInput = {
  workCardId: "WC02",
  title: "",
  phase: defaultPhase,
  riskLevel: "medium",
  problem: "",
  importance: "",
  userOutcome: "",
  scope: "",
  outOfScope: "",
  knownSystems: "",
  evidence: "",
  risks: "",
  operatorNotes: "",
};

const initialHumanValidationForm: HumanValidationDraft = {
  validationResult: "Not tested",
  testedItems: "",
  passedItems: "",
  failedItems: "",
  evidenceReferences: "",
  screenshotOrFileReferences: "",
  commandsRun: "",
  observedErrors: "",
  additionalOperatorObservations: "",
  recommendedNextAction: "",
};

const nextPhaseActivationDecisionOptions: ChampCityNextPhaseActivationDecision[] = [
  "Activate next phase",
  "Defer next phase",
  "Revise roadmap first",
  "Carry unresolved current-phase items forward",
  "Close current phase without activation",
  "Keep next phase inactive",
  "Approve next phase activation",
  "Keep next phase pending review",
  "Request revised next phase plan",
  "No next phase planned",
];

const initialPhaseCloseoutForm: ChampCityPhaseCloseoutFormInput = {
  phase: defaultPhase,
  decision: "Continue phase",
  nextPhaseActivationDecision: "Close current phase without activation",
  nextPhaseActivationNotes: "",
  closeoutSummary: "",
  completedItems: "",
  remainingItems: "",
  knownRisks: "",
  operatorNotes: "",
  recommendedNextAction: "",
};

const initialProjectIntakeForm: ChampCityProjectIntakeInput = {
  projectName: "",
  workingTitle: "",
  productSummary: "",
  targetUsers: "",
  userProblem: "",
  desiredUserOutcome: "",
  businessOrPersonalGoal: "",
  currentStage: "alpha",
  sourceOfTruthLocation: "<PROJECT_REPO>",
  preferredImplementerTool: "Codex",
  architectSurface: "ChatGPT",
  knownConstraints: "",
  nonGoals: "",
  securityOrDataConcerns: "",
  examplesOrReferences: "",
  operatorUncertainties: "",
  notesForArchitect: "",
};

const initialPhaseIntakeForm: ChampCityPhaseIntakeInput = {
  phaseFolder: defaultPhase,
  phaseName: "",
  projectName: "ChampCity A/I",
  generationMode: "architect-led",
  projectIntakeFileName: "",
  projectArchitectInterviewPromptFileName: "",
  sourceProjectPlanningSidecarJsonFileName: "",
  repositoryReconciliationFileName: "",
  existingPhaseIntakeFileName: "",
  operatorNextWorkIntent: "",
  operatorProjectWorkType: "ongoing_project",
  operatorMustKeepConstraints: "",
  phaseProblem: "",
  phaseGoal: "",
  userOutcome: "",
  includedScope: "",
  outOfScope: "",
  affectedScreensOrWorkflows: "",
  knownConstraints: "",
  knownRisks: "",
  dependencies: "",
  validationExpectations: "",
  operatorNotes: "",
};

const initialRepositoryReconciliationForm: ChampCityRepositoryReconciliationRequest = {
  projectName: "ChampCity A/I",
  projectPlanningDocumentFileName: "",
  sourcePhaseFolder: "phase-02",
  architectReconciliationOutput: "",
};

const initialProjectRoadmapForm: ChampCityProjectRoadmapRequest = {
  projectName: "ChampCity A/I",
  operatorDirection:
    "Map the full project from current state through releasable finish. Recommend repair or closeout before new phase creation when current evidence is incomplete.",
  mode: "project-roadmap",
  completedPhaseFolder: "phase-02",
  sourceProjectPlanningDocumentFileName: "",
  sourceRepositoryReconciliationFileName: "",
  approveNextPhaseArtifacts: false,
  generateCompatibilityPhaseIntake: true,
};

const initialPhaseMapForm: ChampCityPhaseMapRequest = {
  projectPlanningDocumentFileName: "",
  repositoryReconciliationFileName: "",
  projectRoadmapFileName: "",
};

const initialPhasePlanningForm: ChampCityPhasePlanningDocumentsRequest = {
  phaseFolder: "phase-02",
  phaseMapFileName: "",
  mappedPhaseId: "",
  projectPlanningDocumentFileName: "",
  repositoryReconciliationFileName: "",
  projectRoadmapFileName: "",
  phaseIntakeFileName: "",
  phaseArchitectInterviewPromptFileName: "",
  phaseClarificationAnswers: "",
  phaseArchitectInterviewOutput: "",
  operatorPlanAdjustments: "",
};

const inputCls =
  "w-full min-w-0 rounded-md border border-border bg-white/[0.04] px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/50 transition-colors focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/40";
const selectCls =
  "w-full min-w-0 rounded-md border border-border bg-[#0e1218] px-3 py-1.5 text-sm text-foreground transition-colors [color-scheme:dark] focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/40";
const textareaCls =
  inputCls + " min-h-[64px] resize-y py-2 leading-relaxed";

export default function App() {
  const appInfo = useMemo(() => window.champCity.getAppInfo(), []);
  const [activeScreen, setActiveScreen] =
    useState<AppScreen>("project-intake");
  const [phase, setPhase] = useState(defaultPhase);
  const [activeCard, setActiveCard] = useState<UiWorkCardSummary | null>(null);
  const [humanValidationDrafts, setHumanValidationDrafts] =
    useState<HumanValidationDraftCache>({});
  const [humanValidationTargetSelections, setHumanValidationTargetSelections] =
    useState<Record<string, string>>({});
  const [currentActionResult, setCurrentActionResult] =
    useState<ChampCityCurrentRequiredActionResult | null>(null);
  const [currentActionLoadState, setCurrentActionLoadState] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [currentActionError, setCurrentActionError] = useState<string>();
  const [projectWorkspaces, setProjectWorkspaces] =
    useState<ProjectWorkspaceListResult | null>(null);
  const [projectPathDraft, setProjectPathDraft] = useState("");
  const [projectBusy, setProjectBusy] = useState(false);
  const [projectError, setProjectError] = useState<string>();
  const hasAlignedInitialWorkspace = useRef(false);
  const { phases: availablePhases } = useAvailablePhases();
  const phaseOptions = useMemo(
    () => buildPhaseOptions(phase, availablePhases),
    [phase, availablePhases],
  );
  const routedArchitectReviewBinding = useMemo(() => {
    return currentActionResult?.routedArchitectReviewBinding;
  }, [currentActionResult?.routedArchitectReviewBinding]);
  const routedArchitectReviewWorkCardFileName = useMemo(() => {
    const jsonPath = currentActionResult?.routedScreen?.target?.jsonPath ?? "";
    return jsonPath.split("/").filter(Boolean).pop() ?? "";
  }, [currentActionResult?.routedScreen?.target?.jsonPath]);
  const architectReviewScreenKey = routedArchitectReviewBinding
    ? [
        routedArchitectReviewBinding.bindingSource,
        routedArchitectReviewBinding.currentActionId,
        routedArchitectReviewBinding.phaseId,
        routedArchitectReviewBinding.workCardId,
        routedArchitectReviewWorkCardFileName,
        routedArchitectReviewBinding.implementerReportPath,
        routedArchitectReviewBinding.expectedOutputPath,
        ...routedArchitectReviewBinding.blockingState.issues.map(
          (issue) => `${issue.kind}:${issue.message}`,
        ),
      ].join("::")
    : `manual::${phase}`;
  const { workCards: headerWorkCards } = useWorkCards(phase);
  const manualNavigationItems = useMemo(
    () =>
      availableWorkflowScreens.map((step) => ({
        id: step.id,
        label: step.label,
        mode: step.mode,
        screenTitle: step.screenTitle,
        shortDesc: step.shortDesc,
      })),
    [],
  );

  const handleSupportScreenChange = useCallback((screenId: string) => {
    if (!availableWorkflowScreens.some((step) => step.id === screenId)) {
      return;
    }

    setActiveScreen(screenId as AppScreen);
  }, []);

  const loadCurrentRequiredAction = useCallback(async () => {
    setCurrentActionLoadState("loading");
    setCurrentActionError(undefined);

    try {
      const result = await window.champCity.getCurrentRequiredAction();
      setCurrentActionResult(result);
      setCurrentActionLoadState(result.ok ? "ready" : "error");
      setCurrentActionError(result.errorMessages?.join(" ") || undefined);
    } catch (error) {
      setCurrentActionResult(null);
      setCurrentActionLoadState("error");
      setCurrentActionError(
        error instanceof Error
          ? error.message
          : "Current-action state could not be loaded.",
      );
    }
  }, []);

  const loadProjectWorkspaces = useCallback(async () => {
    const result = await window.champCity.listProjects();
    setProjectWorkspaces(result);
    setProjectError(result.errorMessages?.join(" ") || undefined);
  }, []);

  useEffect(() => {
    void loadCurrentRequiredAction();
    void loadProjectWorkspaces();
  }, [loadCurrentRequiredAction]);

  useEffect(() => {
    return window.champCity.onRepositoryProjectionChanged(
      (_scanResult: ProjectScanResult) => {
        void loadCurrentRequiredAction();
        void loadProjectWorkspaces();
      },
    );
  }, [loadCurrentRequiredAction, loadProjectWorkspaces]);

  const handleProjectSelect = useCallback(
    async (projectId: string) => {
      setProjectBusy(true);
      setProjectError(undefined);
      try {
        const result = await window.champCity.selectProject(projectId);
        setProjectWorkspaces(result);
        if (!result.ok) throw new Error(result.errorMessages?.join(" ") || "Project switch failed.");
        hasAlignedInitialWorkspace.current = false;
        setActiveCard(null);
        await loadCurrentRequiredAction();
      } catch (error) {
        setProjectError(error instanceof Error ? error.message : "Project switch failed.");
      } finally {
        setProjectBusy(false);
      }
    },
    [loadCurrentRequiredAction],
  );

  const handleRepositoryRefresh = useCallback(async () => {
    setProjectBusy(true);
    setProjectError(undefined);
    try {
      const result = await window.champCity.refreshRepositoryState();
      if (!result.ok && !result.scanResult) {
        throw new Error(result.errorMessages?.join(" ") || "Repository refresh failed.");
      }
      await Promise.all([loadCurrentRequiredAction(), loadProjectWorkspaces()]);
    } catch (error) {
      setProjectError(error instanceof Error ? error.message : "Repository refresh failed.");
    } finally {
      setProjectBusy(false);
    }
  }, [loadCurrentRequiredAction, loadProjectWorkspaces]);

  const handleAddProject = useCallback(async () => {
    if (!projectPathDraft.trim()) return;
    setProjectBusy(true);
    setProjectError(undefined);
    try {
      const result = await window.champCity.addProject({
        repositoryRoot: projectPathDraft.trim(),
      });
      setProjectWorkspaces(result);
      if (!result.ok) throw new Error(result.errorMessages?.join(" ") || "Project configuration failed.");
      setProjectPathDraft("");
    } catch (error) {
      setProjectError(error instanceof Error ? error.message : "Project configuration failed.");
    } finally {
      setProjectBusy(false);
    }
  }, [projectPathDraft]);

  useEffect(() => {
    const currentAction = currentActionResult?.currentAction;

    if (currentAction?.phaseId) {
      setPhase(currentAction.phaseId);
    }

    if (!currentAction || hasAlignedInitialWorkspace.current) {
      return;
    }

    const suggestedScreen = getManualScreenForCurrentAction(currentAction);

    if (
      activeScreen === "project-intake" &&
      suggestedScreen !== "project-intake" &&
      availableWorkflowScreens.some((step) => step.id === suggestedScreen)
    ) {
      setActiveScreen(suggestedScreen as AppScreen);
    }

    hasAlignedInitialWorkspace.current = true;
  }, [activeScreen, currentActionResult]);

  function handlePhaseChange(nextPhase: string) {
    setPhase(nextPhase);
    setActiveCard(null);
  }

  function handleHeaderCardChange(fileName: string) {
    const selectedWorkCard =
      headerWorkCards.find((workCard) => workCard.fileName === fileName) ??
      null;

    setActiveCard(
      selectedWorkCard ? toUiWorkCardSummary(selectedWorkCard) : null,
    );
  }

  const screen = {
    "project-intake": (
      <ProjectIntakeScreen
        onActiveCardChange={setActiveCard}
        onNavigate={setActiveScreen}
      />
    ),
    "project-architect-interview": (
      <ProjectArchitectInterviewScreen
        onActiveCardChange={setActiveCard}
        onNavigate={setActiveScreen}
      />
    ),
    "project-planning-documents": (
      <ProjectPlanningDocumentsScreen
        onActiveCardChange={setActiveCard}
        onNavigate={setActiveScreen}
      />
    ),
    "project-roadmap": (
      <ProjectRoadmapScreen
        phase={phase}
        phaseOptions={phaseOptions}
        onPhaseChange={handlePhaseChange}
        onActiveCardChange={setActiveCard}
        onNavigate={setActiveScreen}
      />
    ),
    "phase-map": (
      <PhaseMapScreen
        onActiveCardChange={setActiveCard}
        onNavigate={setActiveScreen}
      />
    ),
    "phase-intake": (
      <PhaseIntakeScreen
        phase={phase}
        phaseOptions={phaseOptions}
        onPhaseChange={handlePhaseChange}
        onActiveCardChange={setActiveCard}
        onNavigate={setActiveScreen}
      />
    ),
    "phase-architect-interview": (
      <PhaseArchitectInterviewScreen
        phase={phase}
        phaseOptions={phaseOptions}
        onPhaseChange={handlePhaseChange}
        onActiveCardChange={setActiveCard}
        onNavigate={setActiveScreen}
      />
    ),
    "repository-reconciliation": (
      <RepositoryReconciliationScreen
        phase={phase}
        phaseOptions={phaseOptions}
        onPhaseChange={handlePhaseChange}
        onActiveCardChange={setActiveCard}
        onNavigate={setActiveScreen}
      />
    ),
    "phase-planning-documents": (
      <PhasePlanningDocumentsScreen
        phase={phase}
        phaseOptions={phaseOptions}
        onPhaseChange={handlePhaseChange}
        onActiveCardChange={setActiveCard}
        onNavigate={setActiveScreen}
      />
    ),
    "work-card-plan-review": (
      <WorkCardPlanReviewScreen
        phase={phase}
        phaseOptions={phaseOptions}
        onPhaseChange={handlePhaseChange}
        onActiveCardChange={setActiveCard}
        onNavigate={setActiveScreen}
      />
    ),
    "new-work-card": (
      <NewWorkCardScreen
        phase={phase}
        phaseOptions={phaseOptions}
        onPhaseChange={handlePhaseChange}
        onActiveCardChange={setActiveCard}
      />
    ),
    "architect-prompt-composer": (
      <ArchitectPromptComposerScreen
        phase={phase}
        phaseOptions={phaseOptions}
        onPhaseChange={handlePhaseChange}
        onActiveCardChange={setActiveCard}
      />
    ),
    "risk-router": (
      <RiskRouterScreen
        phase={phase}
        phaseOptions={phaseOptions}
        onPhaseChange={handlePhaseChange}
        onActiveCardChange={setActiveCard}
      />
    ),
    "implementer-execution-packet": (
      <ImplementerExecutionPacketGeneratorScreen
        phase={phase}
        phaseOptions={phaseOptions}
        onPhaseChange={handlePhaseChange}
        onActiveCardChange={setActiveCard}
      />
    ),
    "implementer-report-capture": (
      <ImplementerReportCaptureScreen
        phase={phase}
        phaseOptions={phaseOptions}
        onPhaseChange={handlePhaseChange}
        onActiveCardChange={setActiveCard}
        onWorkflowAdvanced={async (nextScreenId) => {
          await loadCurrentRequiredAction();
          if (nextScreenId === "architect-review") {
            setActiveScreen("architect-review");
          }
        }}
      />
    ),
    "architect-review": (
      <ArchitectReviewScreen
        key={architectReviewScreenKey}
        phase={phase}
        phaseOptions={phaseOptions}
        onPhaseChange={handlePhaseChange}
        routedReviewBinding={routedArchitectReviewBinding}
        routedWorkCardFileName={routedArchitectReviewWorkCardFileName}
        onWorkflowAdvanced={async (nextScreenId) => {
          await loadCurrentRequiredAction();
          if (nextScreenId === "operator-validation") {
            setActiveScreen("human-validation");
          }
        }}
      />
    ),
    "architect-bridge": (
      <ArchitectBridgeScreen
        currentActionResult={currentActionResult}
        onRefresh={handleRepositoryRefresh}
      />
    ),
    "human-validation": (
      <HumanValidationScreen
        phase={phase}
        phaseOptions={phaseOptions}
        onPhaseChange={handlePhaseChange}
        activeCard={activeCard}
        onActiveCardChange={setActiveCard}
        routedTargetId={
          currentActionResult?.currentAction?.responsibleRole === "operator" &&
          currentActionResult.currentAction.status === "needs_validation" &&
          currentActionResult.currentAction.phaseId === phase
            ? currentActionResult.currentAction.workCardId
            : undefined
        }
        routedEvidenceArtifactIds={
          currentActionResult?.currentAction?.routedAction?.bindingSource.evidenceArtifactIds ?? []
        }
        drafts={humanValidationDrafts}
        selectedTargetFileName={
          humanValidationTargetSelections[phase] ?? ""
        }
        onSelectedTargetFileNameChange={(fileName) =>
          setHumanValidationTargetSelections((previous) => ({
            ...previous,
            [phase]: fileName,
          }))
        }
        onDraftChange={(targetFileName, updateDraft) =>
          setHumanValidationDrafts((previous) =>
            storeHumanValidationDraft(
              previous,
              phase,
              targetFileName,
              updateDraft(
                readHumanValidationDraft(
                  previous,
                  phase,
                  targetFileName,
                  initialHumanValidationForm,
                ),
              ),
            ),
          )
        }
      />
    ),
    "candidate-disposition": (
      <CandidateDispositionScreen
        currentActionResult={currentActionResult}
        onSaved={loadCurrentRequiredAction}
      />
    ),
    "phase-closeout": (
      <PhaseCloseoutScreen
        phase={phase}
        phaseOptions={phaseOptions}
        onPhaseChange={handlePhaseChange}
      />
    ),
  }[activeScreen];

  return (
    <WorkflowRouterShell
      appName={appInfo.name}
      activeScreen={activeScreen}
      phase={phase}
      phaseOptions={phaseOptions}
      activeCard={activeCard}
      workCards={headerWorkCards}
      manualNavigationItems={manualNavigationItems}
      currentActionResult={currentActionResult}
      currentActionLoadState={currentActionLoadState}
      currentActionError={currentActionError}
      onRefreshCurrentAction={loadCurrentRequiredAction}
      onManualScreenChange={handleSupportScreenChange}
      onPhaseChange={handlePhaseChange}
      onCardChange={handleHeaderCardChange}
      projectWorkspaceBar={
        <ProjectWorkspaceBar
          workspaces={projectWorkspaces}
          pathDraft={projectPathDraft}
          busy={projectBusy}
          error={projectError}
          onPathDraftChange={setProjectPathDraft}
          onSelect={handleProjectSelect}
          onRefresh={handleRepositoryRefresh}
          onAdd={handleAddProject}
        />
      }
    >
      {screen}
    </WorkflowRouterShell>
  );
}

function AppHeader({
  appName,
  phase,
  phaseOptions,
  activeCard,
  activeScreen,
  onNav,
  onPhaseChange,
  workCards,
  onCardChange,
}: {
  appName: string;
  phase: string;
  phaseOptions: string[];
  activeCard: UiWorkCardSummary | null;
  activeScreen: AppScreen;
  onNav: (screen: AppScreen) => void;
  onPhaseChange: (phase: string) => void;
  workCards: ChampCitySavedWorkCardSummary[];
  onCardChange: (fileName: string) => void;
}) {
  const showHeaderPhaseSelector = ![
    "phase-map",
    "phase-planning-documents",
    "work-card-plan-review",
    "new-work-card",
  ].includes(activeScreen);
  const showHeaderWorkCardSelector = ![
    "phase-map",
    "phase-planning-documents",
    "work-card-plan-review",
    "new-work-card",
  ].includes(activeScreen);

  return (
    <header className="shrink-0 border-b border-border bg-card/70 px-4 py-2 backdrop-blur-sm">
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex shrink-0 items-center border-r border-border pr-4 max-[900px]:border-r-0 max-[900px]:pr-0">
            <img
              src={logoImage}
              alt={`${appName} Architect / Implementer`}
              className="h-11 w-auto max-w-[220px] object-contain"
            />
          </div>

          <div className="min-w-[34rem] flex-1 max-[900px]:min-w-full">
            <PipelineStepper active={activeScreen} onNav={onNav} />
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2 border-t border-border/70 pt-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            {showHeaderPhaseSelector ? (
              <select
                value={phase}
                onChange={(event) => onPhaseChange(event.target.value)}
                className={cn(
                  selectCls,
                  "w-[112px] max-w-full shrink-0 py-1.5 font-mono text-xs",
                )}
              >
                {phaseOptions.map((phaseOption) => (
                  <option key={phaseOption} value={phaseOption}>
                    {phaseOption}
                  </option>
                ))}
              </select>
            ) : null}

            {showHeaderWorkCardSelector ? (
              <select
                value={activeCard?.fileName ?? ""}
                onChange={(event) => onCardChange(event.target.value)}
                className={cn(
                  selectCls,
                  "min-w-[14rem] max-w-[42rem] flex-1 basis-[24rem] truncate py-1.5 text-xs",
                )}
              >
                <option value="">- Select Work Card -</option>
                {workCards.map((workCard) => (
                  <option key={workCard.fileName} value={workCard.fileName}>
                    {workCard.workCardId} - {workCard.title}
                  </option>
                ))}
              </select>
            ) : (
              <span className="min-w-[14rem] flex-1 basis-[24rem] rounded border border-border bg-white/[0.03] px-3 py-1.5 text-xs text-muted-foreground/65">
                Planned review and ad hoc capture use screen-local authority.
              </span>
            )}
          </div>

          {showHeaderWorkCardSelector && activeCard ? (
            <div className="flex min-w-0 shrink-0 flex-wrap items-center gap-1.5 max-[720px]:w-full">
              <RiskBadge level={activeCard.riskLevel} />
              <StatusBadge status={activeCard.status} />
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function PipelineStepper({
  active,
  onNav,
}: {
  active: AppScreen;
  onNav: (screen: AppScreen) => void;
}) {
  const activeIndex = workflowSteps.findIndex((step) => step.id === active);

  const renderStep = (
    step: WorkflowStep,
    globalIndex: number,
    larger = false,
  ) => {
    const isActive = step.id === active;
    const isDone = globalIndex < activeIndex;

    return (
      <button
        key={step.id}
        type="button"
        onClick={() => onNav(step.id)}
        title={step.shortDesc}
        className={cn(
          "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-all",
          larger ? "px-3 py-2 text-sm" : "px-2.5 py-1.5 text-xs",
          isActive && step.mode === "architect" && "bg-blue-500/12 text-blue-300",
          isActive && step.mode === "implementer" && "bg-primary/12 text-primary",
          !isActive &&
            isDone &&
            "text-muted-foreground/80 hover:bg-white/[0.04] hover:text-foreground",
          !isActive &&
            !isDone &&
            "text-muted-foreground/55 hover:bg-white/[0.03] hover:text-muted-foreground",
        )}
      >
        <div
          className={cn(
            "shrink-0 rounded-full transition-colors",
            larger ? "h-2 w-2" : "h-1.5 w-1.5",
            isActive && step.mode === "architect" && "bg-blue-400",
            isActive && step.mode === "implementer" && "bg-primary",
            !isActive && isDone && "bg-muted-foreground/45",
            !isActive && !isDone && "bg-muted-foreground/20",
          )}
        />
        {step.label}
      </button>
    );
  };

  const architectSteps = workflowSteps.filter((step) => step.mode === "architect");
  const implementerSteps = workflowSteps.filter((step) =>
    ["implementer-execution-packet", "implementer-report-capture"].includes(step.id),
  );
  const finalSteps = workflowSteps.filter((step) =>
    ["human-validation", "phase-closeout"].includes(step.id),
  );

  return (
    <nav
      aria-label="Work Card pipeline"
      className="w-full min-w-0 py-1"
    >
      <div className="flex min-w-0 flex-wrap items-end justify-center gap-x-3 gap-y-2">
        <div className="flex max-w-full flex-col items-center gap-1">
          <span className="text-[9px] font-bold uppercase leading-none tracking-[0.18em] text-blue-400/70">
            Architect
          </span>
          <div className="flex max-w-full flex-wrap items-center justify-center gap-y-1">
            {architectSteps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                {renderStep(step, workflowSteps.indexOf(step))}
                {index < architectSteps.length - 1 ? (
                  <ChevronRight
                    size={9}
                    className="mx-0.5 text-muted-foreground/15"
                  />
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <span className="mb-0.5 text-3xl font-thin leading-none text-muted-foreground/45">
          /
        </span>

        <div className="flex max-w-full flex-col items-center gap-1">
          <span className="text-[9px] font-bold uppercase leading-none tracking-[0.18em] text-primary/70">
            Implementer
          </span>
          <div className="flex max-w-full flex-wrap items-center justify-center gap-y-1">
            {implementerSteps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                {renderStep(step, workflowSteps.indexOf(step))}
                {index < implementerSteps.length - 1 ? (
                  <ChevronRight
                    size={9}
                    className="mx-0.5 text-muted-foreground/15"
                  />
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="flex max-w-full flex-wrap items-center justify-center gap-y-1 border-l border-white/[0.07] pl-3 max-[720px]:border-l-0 max-[720px]:pl-0">
          {finalSteps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              {renderStep(step, workflowSteps.indexOf(step), true)}
              {index < finalSteps.length - 1 ? (
                <ChevronRight
                  size={10}
                  className="mx-1 text-muted-foreground/15"
                />
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </nav>
  );
}

function ProjectIntakeScreen({
  onActiveCardChange,
  onNavigate,
}: {
  onActiveCardChange: (card: UiWorkCardSummary | null) => void;
  onNavigate: (screen: AppScreen) => void;
}) {
  const [form, setForm] = useState<ChampCityProjectIntakeInput>({
    ...initialProjectIntakeForm,
  });
  const [validation, setValidation] =
    useState<ChampCityProjectIntakeValidationResult>({
      valid: true,
      errors: [],
      warnings: [],
    });
  const [previewMarkdown, setPreviewMarkdown] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    "Project Intake is ready for plain-language capture.",
  );
  const [saveResult, setSaveResult] =
    useState<ChampCityProjectIntakeSaveResult | null>(null);

  useEffect(() => {
    onActiveCardChange(null);
  }, [onActiveCardChange]);

  function updateField<Field extends keyof ChampCityProjectIntakeInput>(
    field: Field,
    value: ChampCityProjectIntakeInput[Field],
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
    setSaveResult(null);
    setCopyMessage("");
  }

  async function previewProjectIntake() {
    setIsBusy(true);
    setCopyMessage("");

    const result = await window.champCity.previewProjectIntake(form);
    setIsBusy(false);
    setValidation(result.validation);

    if (!result.ok || !result.markdown) {
      setPreviewMarkdown("");
      setStatusMessage("Please fill in the required Project Intake details.");
      return;
    }

    setPreviewMarkdown(result.markdown);
    setSaveResult(null);
    setStatusMessage("Project Intake preview refreshed.");
  }

  async function saveProjectIntake() {
    setIsBusy(true);
    setCopyMessage("");

    const result = await window.champCity.saveProjectIntake(form);
    setIsBusy(false);
    setValidation(result.validation);

    if (!result.ok || !result.markdown) {
      setPreviewMarkdown("");
      setStatusMessage("Project Intake save needs attention.");
      return;
    }

    setPreviewMarkdown(result.markdown);
    setSaveResult(result);
    setStatusMessage("Project Intake saved for future Architect work.");
  }

  return (
    <ScreenLayout
      left={
        <div className="flex h-full flex-col gap-5 p-4">
          <ScreenIntro
            title="Project Intake"
            description="Capture what the Operator wants to build before asking the Architect to shape it."
            badge="upstream"
          />
          <Notice type="info">
            This saves an intake artifact only. It does not generate an
            Architect Interview prompt, Project Profile, roadmap, phase plan, or
            Work Cards.
          </Notice>
          <ErrorList errors={validation.errors} />
          <WarningList warnings={validation.warnings} />
          <FieldGroup title="Project">
            <FieldRow>
              <TextField
                label="Project Name"
                value={form.projectName}
                onChange={(value) => updateField("projectName", value)}
                required
              />
              <TextField
                label="Working Title"
                value={form.workingTitle}
                onChange={(value) => updateField("workingTitle", value)}
              />
            </FieldRow>
          </FieldGroup>
          <FieldGroup title="What You Want">
            <TextAreaField
              label="What are you trying to build?"
              value={form.productSummary}
              rows={4}
              onChange={(value) => updateField("productSummary", value)}
              required
            />
            <FieldRow>
              <TextAreaField
                label="Who is this for?"
                value={form.targetUsers}
                rows={4}
                onChange={(value) => updateField("targetUsers", value)}
                required
              />
              <TextAreaField
                label="What problem does this solve?"
                value={form.userProblem}
                rows={4}
                onChange={(value) => updateField("userProblem", value)}
                required
              />
            </FieldRow>
            <TextAreaField
              label="What should the user be able to do?"
              value={form.desiredUserOutcome}
              rows={4}
              onChange={(value) => updateField("desiredUserOutcome", value)}
              required
            />
            <TextAreaField
              label="Goal for this project"
              value={form.businessOrPersonalGoal}
              rows={3}
              onChange={(value) => updateField("businessOrPersonalGoal", value)}
            />
          </FieldGroup>
          <FieldGroup title="Setup">
            <FieldRow>
              <Field label="Current stage">
                <select
                  className={selectCls}
                  value={form.currentStage}
                  onChange={(event) =>
                    updateField(
                      "currentStage",
                      event.target.value as ChampCityProjectIntakeStage,
                    )
                  }
                >
                  {projectIntakeStageOptions.map((stage) => (
                    <option key={stage} value={stage}>
                      {stage}
                    </option>
                  ))}
                </select>
              </Field>
              <TextField
                label="Source of truth location"
                value={form.sourceOfTruthLocation}
                onChange={(value) =>
                  updateField("sourceOfTruthLocation", value)
                }
                required
              />
            </FieldRow>
            <FieldRow>
              <TextField
                label="Preferred Implementer tool"
                value={form.preferredImplementerTool}
                onChange={(value) =>
                  updateField("preferredImplementerTool", value)
                }
              />
              <TextField
                label="Architect surface"
                value={form.architectSurface}
                onChange={(value) => updateField("architectSurface", value)}
              />
            </FieldRow>
          </FieldGroup>
          <FieldGroup title="Boundaries">
            <FieldRow>
              <TextAreaField
                label="Known constraints"
                value={form.knownConstraints}
                rows={3}
                onChange={(value) => updateField("knownConstraints", value)}
              />
              <TextAreaField
                label="What this project should not try to do yet"
                value={form.nonGoals}
                rows={3}
                onChange={(value) => updateField("nonGoals", value)}
              />
            </FieldRow>
            <FieldRow>
              <TextAreaField
                label="Security or data concerns"
                value={form.securityOrDataConcerns}
                rows={3}
                onChange={(value) =>
                  updateField("securityOrDataConcerns", value)
                }
              />
              <TextAreaField
                label="Examples or references"
                value={form.examplesOrReferences}
                rows={3}
                onChange={(value) => updateField("examplesOrReferences", value)}
              />
            </FieldRow>
            <TextAreaField
              label="What are you unsure about?"
              value={form.operatorUncertainties}
              rows={3}
              onChange={(value) => updateField("operatorUncertainties", value)}
            />
            <TextAreaField
              label="Notes for the Architect"
              value={form.notesForArchitect}
              rows={3}
              onChange={(value) => updateField("notesForArchitect", value)}
            />
          </FieldGroup>
          <ActionBar
            onPreview={() => void previewProjectIntake()}
            onSave={() => void saveProjectIntake()}
            onCopy={() => void copyText(previewMarkdown, setCopyMessage)}
            saveLabel="Save Project Intake"
            copyLabel="Copy Preview"
            saveDisabled={isBusy}
            copyDisabled={previewMarkdown.trim().length === 0}
            statusMessage={copyMessage || statusMessage}
            statusType={validation.errors.length > 0 ? "error" : "success"}
          />
        </div>
      }
      right={
        <ArtifactPanel
          eyebrow="Project Intake"
          title="Intake Markdown Preview"
          status={statusMessage}
          filename={saveResult?.savedMarkdownFileName}
          emptyMessage="Preview a Project Intake to see the durable Markdown artifact."
        >
          {saveResult?.markdownPath && saveResult.jsonPath ? (
            <Notice type="success">
              <div className="grid gap-1">
                <span>Saved paired Project Intake artifacts.</span>
                <code className="break-anywhere text-[11px]">
                  {saveResult.markdownPath}
                </code>
                <code className="break-anywhere text-[11px]">
                  {saveResult.jsonPath}
                </code>
                <button
                  type="button"
                  onClick={() => onNavigate("project-architect-interview")}
                  className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-md border border-blue-400/25 bg-blue-400/10 px-3 py-1.5 text-xs font-semibold text-blue-200 transition-colors hover:bg-blue-400/15"
                >
                  Open Project Architect Interview
                  <ChevronRight size={14} aria-hidden="true" />
                </button>
              </div>
            </Notice>
          ) : null}
          <Notice type="info">
            Next step: use this intake to generate a Project Architect Interview
            prompt.
          </Notice>
          <MonoBlock className="mt-4 min-h-[calc(100vh-260px)]">
            {previewMarkdown || "No Project Intake preview yet."}
          </MonoBlock>
        </ArtifactPanel>
      }
    />
  );
}

function ProjectArchitectInterviewScreen({
  onActiveCardChange,
  onNavigate,
}: {
  onActiveCardChange: (card: UiWorkCardSummary | null) => void;
  onNavigate: (screen: AppScreen) => void;
}) {
  const { projectIntakes, invalidFiles, errors, isLoading } =
    useProjectIntakes();
  const [selectedFileName, setSelectedFileName] = useState("");
  const [screenErrors, setScreenErrors] = useState<string[]>([]);
  const [promptText, setPromptText] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    "Choose a saved Project Intake to generate an Architect interview prompt.",
  );
  const [saveResult, setSaveResult] =
    useState<ChampCityProjectArchitectInterviewPromptSaveResult | null>(null);

  const selectedProjectIntake =
    projectIntakes.find((intake) => intake.fileName === selectedFileName) ??
    null;
  const allErrors = [...errors, ...screenErrors];

  useEffect(() => {
    onActiveCardChange(null);
  }, [onActiveCardChange]);

  useEffect(() => {
    if (projectIntakes.some((intake) => intake.fileName === selectedFileName)) {
      return;
    }

    setSelectedFileName(projectIntakes[0]?.fileName ?? "");
  }, [projectIntakes, selectedFileName]);

  function handleSelectedFileChange(fileName: string) {
    setSelectedFileName(fileName);
    setPromptText("");
    setSaveResult(null);
    setCopyMessage("");
    setScreenErrors([]);
    setStatusMessage(
      fileName
        ? "Saved Project Intake selected."
        : "Choose a saved Project Intake first.",
    );
  }

  async function generateInterviewPrompt() {
    if (!selectedFileName) {
      setScreenErrors(["Choose a saved Project Intake first."]);
      setStatusMessage("Project Intake selection is required.");
      return;
    }

    setIsBusy(true);
    setCopyMessage("");
    setScreenErrors([]);

    const result = await window.champCity.previewProjectArchitectInterviewPrompt({
      projectIntakeFileName: selectedFileName,
    });
    setIsBusy(false);

    if (!result.ok || !result.promptText) {
      setPromptText("");
      setSaveResult(null);
      setScreenErrors(
        result.errorMessages ?? ["Architect prompt could not be generated."],
      );
      setStatusMessage("Architect prompt generation needs attention.");
      return;
    }

    setPromptText(result.promptText);
    setSaveResult(null);
    setStatusMessage("Architect prompt preview refreshed.");
  }

  async function saveInterviewPrompt() {
    if (!selectedFileName) {
      setScreenErrors(["Choose a saved Project Intake first."]);
      setStatusMessage("Project Intake selection is required.");
      return;
    }

    setIsBusy(true);
    setCopyMessage("");
    setScreenErrors([]);

    const result = await window.champCity.saveProjectArchitectInterviewPrompt({
      projectIntakeFileName: selectedFileName,
    });
    setIsBusy(false);

    if (!result.ok || !result.promptText) {
      setPromptText("");
      setSaveResult(null);
      setScreenErrors(
        result.errorMessages ?? ["Architect prompt could not be saved."],
      );
      setStatusMessage("Architect prompt save needs attention.");
      return;
    }

    setPromptText(result.promptText);
    setSaveResult(result);
    setStatusMessage("Architect prompt saved for the Operator to copy.");
  }

  return (
    <ScreenLayout
      left={
        <div className="flex h-full flex-col gap-5 p-4">
          <ScreenIntro
            title="Project Architect Interview"
            description="Generate a copy-ready Architect prompt from a saved Project Intake."
            badge="upstream"
          />
          <Notice type="info">
            This prompt asks the Architect to interview you before creating
            project planning documents.
          </Notice>
          <ErrorList errors={allErrors} />
          <InvalidProjectIntakeFiles files={invalidFiles} />
          {projectIntakes.length === 0 && !isLoading ? (
            <Notice type="warning">
              No saved Project Intake JSON artifacts were found. Save a Project
              Intake first.
            </Notice>
          ) : null}
          <FieldGroup title="Source">
            <Field label="Saved Project Intake">
              <select
                className={selectCls}
                value={selectedFileName}
                disabled={isLoading || projectIntakes.length === 0}
                onChange={(event) =>
                  handleSelectedFileChange(event.target.value)
                }
              >
                <option value="">
                  {isLoading ? "Loading Project Intakes..." : "Select Project Intake"}
                </option>
                {projectIntakes.map((projectIntake) => (
                  <option
                    key={projectIntake.fileName}
                    value={projectIntake.fileName}
                  >
                    {projectIntake.projectName} ({projectIntake.fileName})
                  </option>
                ))}
              </select>
            </Field>
            {selectedProjectIntake ? (
              <ProjectIntakeSummary projectIntake={selectedProjectIntake} />
            ) : null}
          </FieldGroup>
          <FieldGroup title="What happens next?">
            <Notice type="info">
              Copy this prompt into the Architect surface. The Architect should
              complete a guided interview, not create the Project Profile,
              roadmap, phase plan, Work Cards, or implementation code yet.
            </Notice>
          </FieldGroup>
          <ActionBar
            onPreview={() => void generateInterviewPrompt()}
            onSave={() => void saveInterviewPrompt()}
            onCopy={() => void copyText(promptText, setCopyMessage)}
            previewLabel="Generate Interview Prompt"
            saveLabel="Save Architect Prompt"
            copyLabel="Copy Architect Prompt"
            saveDisabled={isBusy || !selectedFileName}
            copyDisabled={promptText.trim().length === 0}
            statusMessage={copyMessage || statusMessage}
            statusType={allErrors.length > 0 ? "error" : "success"}
          />
        </div>
      }
      right={
        <ArtifactPanel
          eyebrow="Project Architect Interview"
          title="Preview Architect Prompt"
          status={statusMessage}
          filename={saveResult?.savedMarkdownFileName}
          emptyMessage="Generate an Architect prompt to preview the copy-ready text."
        >
          {saveResult?.markdownPath && saveResult.jsonPath ? (
            <Notice type="success">
              <div className="grid gap-1">
                <span>Saved paired Project Architect Interview Prompt artifacts.</span>
                <code className="break-anywhere text-[11px]">
                  {saveResult.markdownPath}
                </code>
                <code className="break-anywhere text-[11px]">
                  {saveResult.jsonPath}
                </code>
                <button
                  type="button"
                  onClick={() => onNavigate("project-planning-documents")}
                  className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-md border border-blue-400/25 bg-blue-400/10 px-3 py-1.5 text-xs font-semibold text-blue-200 transition-colors hover:bg-blue-400/15"
                >
                  Open Project Plan
                  <ChevronRight size={14} aria-hidden="true" />
                </button>
              </div>
            </Notice>
          ) : null}
          <Notice type="info">
            Next step: copy the prompt into the Architect surface, complete the
            interview, then use that output to generate Project Planning
            Documents.
          </Notice>
          <MonoBlock className="mt-4 min-h-[calc(100vh-260px)]">
            {promptText || "No Architect prompt preview yet."}
          </MonoBlock>
        </ArtifactPanel>
      }
    />
  );
}

function ProjectPlanningDocumentsScreen({
  onActiveCardChange,
  onNavigate,
}: {
  onActiveCardChange: (card: UiWorkCardSummary | null) => void;
  onNavigate: (screen: AppScreen) => void;
}) {
  const {
    projectIntakes,
    invalidFiles: invalidProjectIntakeFiles,
    errors: projectIntakeErrors,
    isLoading: isProjectIntakesLoading,
  } = useProjectPlanningDocumentProjectIntakes();
  const {
    prompts,
    invalidFiles: invalidPromptFiles,
    errors: promptErrors,
    isLoading: isPromptsLoading,
  } = useProjectArchitectInterviewPrompts();
  const [selectedProjectIntakeFileName, setSelectedProjectIntakeFileName] =
    useState("");
  const [selectedPromptFileName, setSelectedPromptFileName] = useState("");
  const [architectInterviewOutput, setArchitectInterviewOutput] = useState("");
  const [screenErrors, setScreenErrors] = useState<string[]>([]);
  const [previewResult, setPreviewResult] =
    useState<ChampCityProjectPlanningDocumentsPreviewResult | null>(null);
  const [saveResult, setSaveResult] =
    useState<ChampCityProjectPlanningDocumentsSaveResult | null>(null);
  const [copyMessage, setCopyMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    "Choose source context and paste completed Architect output.",
  );

  const selectedProjectIntake =
    projectIntakes.find(
      (projectIntake) =>
        projectIntake.fileName === selectedProjectIntakeFileName,
    ) ?? null;
  const selectedPrompt =
    prompts.find((prompt) => prompt.fileName === selectedPromptFileName) ??
    null;
  const hasSource =
    selectedProjectIntakeFileName.trim().length > 0 ||
    selectedPromptFileName.trim().length > 0;
  const allErrors = [...projectIntakeErrors, ...promptErrors, ...screenErrors];
  const previewMarkdown =
    saveResult?.combinedMarkdown ?? previewResult?.combinedMarkdown ?? "";

  useEffect(() => {
    onActiveCardChange(null);
  }, [onActiveCardChange]);

  useEffect(() => {
    if (projectIntakes.length === 0) {
      if (selectedProjectIntakeFileName.length > 0) {
        setSelectedProjectIntakeFileName("");
      }

      return;
    }

    if (
      projectIntakes.some(
        (projectIntake) =>
          projectIntake.fileName === selectedProjectIntakeFileName,
      )
    ) {
      return;
    }

    setSelectedProjectIntakeFileName(projectIntakes[0]?.fileName ?? "");
  }, [projectIntakes, selectedProjectIntakeFileName]);

  useEffect(() => {
    if (prompts.length === 0) {
      if (selectedPromptFileName.length > 0) {
        setSelectedPromptFileName("");
      }

      return;
    }

    if (prompts.some((prompt) => prompt.fileName === selectedPromptFileName)) {
      return;
    }

    setSelectedPromptFileName(prompts[0]?.fileName ?? "");
  }, [prompts, selectedPromptFileName]);

  function updateSelectedProjectIntake(fileName: string) {
    setSelectedProjectIntakeFileName(fileName);
    resetGeneratedPlanningDocuments("Project Intake source updated.");
  }

  function updateSelectedPrompt(fileName: string) {
    setSelectedPromptFileName(fileName);
    resetGeneratedPlanningDocuments("Architect prompt source updated.");
  }

  function updateArchitectInterviewOutput(value: string) {
    setArchitectInterviewOutput(value);
    resetGeneratedPlanningDocuments("Architect interview output updated.");
  }

  function resetGeneratedPlanningDocuments(nextStatusMessage: string) {
    setPreviewResult(null);
    setSaveResult(null);
    setCopyMessage("");
    setScreenErrors([]);
    setStatusMessage(nextStatusMessage);
  }

  function buildRequest(): ChampCityProjectPlanningDocumentsRequest {
    return {
      projectIntakeFileName: nonBlankSelection(selectedProjectIntakeFileName),
      projectArchitectInterviewPromptFileName:
        nonBlankSelection(selectedPromptFileName),
      architectInterviewOutput,
    };
  }

  function validatePlanningDocumentRequest(): string[] {
    const errors: string[] = [];

    if (!hasSource) {
      errors.push(
        "Select a saved Project Intake or Project Architect Interview Prompt.",
      );
    }

    if (architectInterviewOutput.trim().length === 0) {
      errors.push("Paste the completed Architect interview output first.");
    }

    return errors;
  }

  async function previewPlanningDocuments() {
    const requestErrors = validatePlanningDocumentRequest();

    if (requestErrors.length > 0) {
      setScreenErrors(requestErrors);
      setStatusMessage("Project Planning Documents preview needs attention.");
      return;
    }

    setIsBusy(true);
    setCopyMessage("");
    setScreenErrors([]);

    const result = await window.champCity.previewProjectPlanningDocuments(
      buildRequest(),
    );
    setIsBusy(false);

    if (!result.ok || !result.combinedMarkdown) {
      setPreviewResult(null);
      setSaveResult(null);
      setScreenErrors(
        result.errorMessages ?? [
          "Project Planning Documents could not be generated.",
        ],
      );
      setStatusMessage("Project Planning Documents preview needs attention.");
      return;
    }

    setPreviewResult(result);
    setSaveResult(null);
    setStatusMessage("Project Planning Documents preview refreshed.");
  }

  async function savePlanningDocuments() {
    const requestErrors = validatePlanningDocumentRequest();

    if (requestErrors.length > 0) {
      setScreenErrors(requestErrors);
      setStatusMessage("Project Planning Documents save needs attention.");
      return;
    }

    setIsBusy(true);
    setCopyMessage("");
    setScreenErrors([]);

    const result = await window.champCity.saveProjectPlanningDocuments(
      buildRequest(),
    );
    setIsBusy(false);

    if (!result.ok || !result.combinedMarkdown) {
      setSaveResult(null);
      setScreenErrors(
        result.errorMessages ?? [
          "Project Planning Documents could not be saved.",
        ],
      );
      setStatusMessage("Project Planning Documents save needs attention.");
      return;
    }

    setPreviewResult(result);
    setSaveResult(result);
    setStatusMessage("Project Planning Documents saved.");
  }

  return (
    <ScreenLayout
      left={
        <div className="flex h-full flex-col gap-5 p-4">
          <ScreenIntro
            title="Project Planning Documents"
            description="Turn completed Architect interview output into durable project-level planning artifacts."
            badge="upstream"
          />
          <Notice type="info">
            Project-level Markdown files are updated in place under
            `planning/project/`. A JSON and Markdown generation sidecar is saved
            separately for later reuse.
          </Notice>
          <ErrorList errors={allErrors} />
          <InvalidProjectIntakeFiles files={invalidProjectIntakeFiles} />
          <InvalidProjectArchitectInterviewPromptFiles files={invalidPromptFiles} />
          {!isProjectIntakesLoading &&
          !isPromptsLoading &&
          projectIntakes.length === 0 &&
          prompts.length === 0 ? (
            <Notice type="warning">
              No saved Project Intake or Project Architect Interview Prompt JSON
              artifacts were found.
            </Notice>
          ) : null}
          <FieldGroup title="Project Sources">
            <Field label="Saved Project Intake">
              <select
                className={selectCls}
                value={selectedProjectIntakeFileName}
                disabled={isProjectIntakesLoading}
                onChange={(event) =>
                  updateSelectedProjectIntake(event.target.value)
                }
              >
                <option value="">
                  {isProjectIntakesLoading
                    ? "Loading Project Intakes..."
                    : "Select Project Intake"}
                </option>
                {projectIntakes.map((projectIntake) => (
                  <option
                    key={projectIntake.fileName}
                    value={projectIntake.fileName}
                  >
                    {projectIntake.projectName} ({projectIntake.fileName})
                  </option>
                ))}
              </select>
            </Field>
            {selectedProjectIntake ? (
              <ProjectIntakeSummary projectIntake={selectedProjectIntake} />
            ) : null}
            <Field label="Saved Project Architect Interview Prompt">
              <select
                className={selectCls}
                value={selectedPromptFileName}
                disabled={isPromptsLoading}
                onChange={(event) => updateSelectedPrompt(event.target.value)}
              >
                <option value="">
                  {isPromptsLoading
                    ? "Loading Architect prompts..."
                    : "Select Architect Prompt"}
                </option>
                {prompts.map((prompt) => (
                  <option key={prompt.fileName} value={prompt.fileName}>
                    {prompt.projectName} ({prompt.fileName})
                  </option>
                ))}
              </select>
            </Field>
            {selectedPrompt ? (
              <ProjectArchitectInterviewPromptSummary prompt={selectedPrompt} />
            ) : null}
          </FieldGroup>
          <FieldGroup title="Completed Interview">
            <TextAreaField
              label="Completed Architect interview output"
              value={architectInterviewOutput}
              rows={12}
              onChange={updateArchitectInterviewOutput}
              required
            />
          </FieldGroup>
          <Notice type="warning">
            Saving updates `PROJECT_PROFILE.md`, `PROJECT_STATE.md`,
            `WORK_CARD_BACKLOG.md`, `OPEN_QUESTIONS.md`, `RISKS.md`, and
            `DECISIONS.md` in place.
          </Notice>
          <ActionBar
            onPreview={() => void previewPlanningDocuments()}
            onSave={() => void savePlanningDocuments()}
            onCopy={() => void copyText(previewMarkdown, setCopyMessage)}
            previewLabel="Generate Preview"
            saveLabel="Save Planning Docs"
            copyLabel="Copy Preview"
            saveDisabled={
              isBusy || !hasSource || architectInterviewOutput.trim().length === 0
            }
            copyDisabled={previewMarkdown.trim().length === 0}
            statusMessage={copyMessage || statusMessage}
            statusType={allErrors.length > 0 ? "error" : "success"}
          />
        </div>
      }
      right={
        <ArtifactPanel
          eyebrow="Project Plan"
          title="Preview Project Planning Documents"
          status={statusMessage}
          filename={saveResult?.savedMarkdownFileName}
          emptyMessage="Generate a preview to see the project planning documents."
        >
          {saveResult?.projectMarkdownPaths?.length ? (
            <Notice type="success">
              <div className="grid gap-2">
                <span>Updated project-level Markdown files in place.</span>
                <div className="grid gap-1">
                  {saveResult.projectMarkdownPaths.map((filePath) => (
                    <code
                      key={filePath}
                      className="break-anywhere text-[11px]"
                    >
                      {filePath}
                    </code>
                  ))}
                </div>
              </div>
            </Notice>
          ) : null}
          {saveResult?.markdownPath && saveResult.jsonPath ? (
            <Notice type="success">
              <div className="grid gap-1">
                <span>Saved Project Planning Documents sidecar artifacts.</span>
                <code className="break-anywhere text-[11px]">
                  {saveResult.markdownPath}
                </code>
                <code className="break-anywhere text-[11px]">
                  {saveResult.jsonPath}
                </code>
                <button
                  type="button"
                  onClick={() => onNavigate("repository-reconciliation")}
                  className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-md border border-blue-400/25 bg-blue-400/10 px-3 py-1.5 text-xs font-semibold text-blue-200 transition-colors hover:bg-blue-400/15"
                >
                  Open Reconcile
                  <ChevronRight size={14} aria-hidden="true" />
                </button>
              </div>
            </Notice>
          ) : null}
          {previewResult?.documents ? (
            <ProjectPlanningDocumentFileList
              documents={previewResult.documents}
            />
          ) : null}
          <MonoBlock className="mt-4 min-h-[calc(100vh-280px)]">
            {previewMarkdown || "No Project Planning Documents preview yet."}
          </MonoBlock>
        </ArtifactPanel>
      }
    />
  );
}

function PhaseMapScreen({
  onActiveCardChange,
  onNavigate,
}: {
  onActiveCardChange: (card: UiWorkCardSummary | null) => void;
  onNavigate: (screen: AppScreen) => void;
}) {
  const {
    documents: projectPlanningDocuments,
    invalidFiles: invalidProjectPlanningFiles,
    errors: projectPlanningErrors,
    isLoading: isProjectPlanningLoading,
  } = usePhasePlanningProjectPlanningDocuments();
  const {
    reconciliations,
    invalidFiles: invalidReconciliationFiles,
    errors: reconciliationErrors,
    isLoading: isReconciliationsLoading,
  } = useRepositoryReconciliations();
  const {
    roadmaps,
    invalidFiles: invalidRoadmapFiles,
    errors: roadmapErrors,
    isLoading: isRoadmapsLoading,
  } = useProjectRoadmaps();
  const [form, setForm] = useState<ChampCityPhaseMapRequest>(
    initialPhaseMapForm,
  );
  const [previewResult, setPreviewResult] =
    useState<ChampCityPhaseMapPreviewResult | null>(null);
  const [saveResult, setSaveResult] =
    useState<ChampCityPhaseMapSaveResult | null>(null);
  const [screenErrors, setScreenErrors] = useState<string[]>([]);
  const [copyMessage, setCopyMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    "Select source artifacts to generate mapped phase records.",
  );

  const selectedProjectPlanningDocuments =
    projectPlanningDocuments.find(
      (document) =>
        document.fileName === form.projectPlanningDocumentFileName,
    ) ?? null;
  const selectedReconciliation =
    reconciliations.find(
      (reconciliation) =>
        reconciliation.fileName === form.repositoryReconciliationFileName,
    ) ?? null;
  const selectedRoadmap =
    roadmaps.find((roadmap) => roadmap.fileName === form.projectRoadmapFileName) ??
    null;
  const phaseMap = saveResult?.phaseMap ?? previewResult?.phaseMap;
  const previewMarkdown = saveResult?.markdown ?? previewResult?.markdown ?? "";
  const allErrors = [
    ...projectPlanningErrors,
    ...reconciliationErrors,
    ...roadmapErrors,
    ...screenErrors,
  ];

  useEffect(() => {
    onActiveCardChange(null);
  }, [onActiveCardChange]);

  useEffect(() => {
    setFirstAvailablePhaseMapSource(
      "projectPlanningDocumentFileName",
      projectPlanningDocuments[0]?.fileName,
      form.projectPlanningDocumentFileName,
      projectPlanningDocuments.map((document) => document.fileName),
    );
  }, [projectPlanningDocuments, form.projectPlanningDocumentFileName]);

  useEffect(() => {
    setFirstAvailablePhaseMapSource(
      "repositoryReconciliationFileName",
      reconciliations[0]?.fileName,
      form.repositoryReconciliationFileName,
      reconciliations.map((reconciliation) => reconciliation.fileName),
    );
  }, [reconciliations, form.repositoryReconciliationFileName]);

  useEffect(() => {
    setFirstAvailablePhaseMapSource(
      "projectRoadmapFileName",
      roadmaps[0]?.fileName,
      form.projectRoadmapFileName,
      roadmaps.map((roadmap) => roadmap.fileName),
    );
  }, [roadmaps, form.projectRoadmapFileName]);

  function setFirstAvailablePhaseMapSource(
    field: keyof ChampCityPhaseMapRequest,
    firstFileName: string | undefined,
    currentFileName: string | undefined,
    availableFileNames: string[],
  ) {
    if (!firstFileName) {
      return;
    }

    if (currentFileName && availableFileNames.includes(currentFileName)) {
      return;
    }

    setForm((previous) => ({
      ...previous,
      [field]: firstFileName,
    }));
  }

  function updateField<Field extends keyof ChampCityPhaseMapRequest>(
    field: Field,
    value: ChampCityPhaseMapRequest[Field],
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
    resetPhaseMapPreview("Phase Map source selection updated.");
  }

  function validatePhaseMapRequest(): string[] {
    const errors: string[] = [];

    if (!form.projectPlanningDocumentFileName) {
      errors.push("Select a saved Project Planning Documents source.");
    }

    if (!form.repositoryReconciliationFileName) {
      errors.push("Select a saved Repository Reconciliation source.");
    }

    if (!form.projectRoadmapFileName) {
      errors.push("Select a saved Project Roadmap source.");
    }

    return errors;
  }

  function resetPhaseMapPreview(nextStatusMessage: string) {
    setPreviewResult(null);
    setSaveResult(null);
    setCopyMessage("");
    setScreenErrors([]);
    setStatusMessage(nextStatusMessage);
  }

  async function previewPhaseMap() {
    const requestErrors = validatePhaseMapRequest();

    if (requestErrors.length > 0) {
      setScreenErrors(requestErrors);
      setStatusMessage("Phase Map preview needs attention.");
      return;
    }

    setIsBusy(true);
    setCopyMessage("");
    setScreenErrors([]);

    const result = await window.champCity.previewPhaseMap(form);
    setIsBusy(false);

    if (!result.ok || !result.markdown) {
      setPreviewResult(null);
      setSaveResult(null);
      setScreenErrors(result.errorMessages ?? ["Phase Map could not be generated."]);
      setStatusMessage("Phase Map preview needs attention.");
      return;
    }

    setPreviewResult(result);
    setSaveResult(null);
    setStatusMessage("Phase Map preview refreshed.");
  }

  async function savePhaseMap() {
    const requestErrors = validatePhaseMapRequest();

    if (requestErrors.length > 0) {
      setScreenErrors(requestErrors);
      setStatusMessage("Phase Map save needs attention.");
      return;
    }

    setIsBusy(true);
    setCopyMessage("");
    setScreenErrors([]);

    const result = await window.champCity.savePhaseMap(form);
    setIsBusy(false);

    if (!result.ok || !result.markdown) {
      setSaveResult(null);
      setScreenErrors(result.errorMessages ?? ["Phase Map could not be saved."]);
      setStatusMessage("Phase Map save needs attention.");
      return;
    }

    setPreviewResult(result);
    setSaveResult(result);
    setStatusMessage("Phase Map saved. Mapped phases are ready for draft planning.");
  }

  return (
    <ScreenLayout
      left={
        <div className="flex h-full flex-col gap-5 p-4">
          <ScreenIntro
            title="Phase Map Composer"
            description="Generate mapped phase records from durable project planning, reconciliation, and roadmap sources."
            badge="phase map"
          />
          <Notice type="info">
            This creates the selectable phase authority for planning. Existing
            phase folders are shown only as context and are not treated as the
            roadmap phase list. Mapped phases remain Not Active until an
            explicit Operator activation decision is recorded.
          </Notice>
          {roadmaps.length === 0 && !isRoadmapsLoading ? (
            <Notice type="warning">
              No Project Roadmap source was found. Save a Project Roadmap source
              first, then return here to generate the formal Phase Map.
              <button
                type="button"
                onClick={() => onNavigate("phase-intake")}
                className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-md border border-blue-400/25 bg-blue-400/10 px-3 py-1.5 text-xs font-semibold text-blue-200 transition-colors hover:bg-blue-400/15"
              >
                Open Project Roadmap Source
                <ChevronRight size={14} aria-hidden="true" />
              </button>
            </Notice>
          ) : null}
          <ErrorList errors={allErrors} />
          <InvalidProjectPlanningDocumentsFiles files={invalidProjectPlanningFiles} />
          <InvalidRepositoryReconciliationFiles files={invalidReconciliationFiles} />
          <InvalidProjectRoadmapFiles files={invalidRoadmapFiles} />
          <FieldGroup title="Source Artifacts">
            <Field label="Project Planning Documents source">
              <select
                className={selectCls}
                value={form.projectPlanningDocumentFileName ?? ""}
                disabled={isProjectPlanningLoading}
                onChange={(event) =>
                  updateField(
                    "projectPlanningDocumentFileName",
                    event.target.value,
                  )
                }
              >
                <option value="">
                  {isProjectPlanningLoading
                    ? "Loading Project Planning Documents..."
                    : "Select Project Planning Documents"}
                </option>
                {projectPlanningDocuments.map((document) => (
                  <option key={document.fileName} value={document.fileName}>
                    {document.projectName} ({document.fileName})
                  </option>
                ))}
              </select>
            </Field>
            {selectedProjectPlanningDocuments ? (
              <ProjectPlanningDocumentsSummary
                document={selectedProjectPlanningDocuments}
              />
            ) : null}
            <Field label="Repository Reconciliation source">
              <select
                className={selectCls}
                value={form.repositoryReconciliationFileName ?? ""}
                disabled={isReconciliationsLoading}
                onChange={(event) =>
                  updateField(
                    "repositoryReconciliationFileName",
                    event.target.value,
                  )
                }
              >
                <option value="">
                  {isReconciliationsLoading
                    ? "Loading Repository Reconciliations..."
                    : "Select Repository Reconciliation"}
                </option>
                {reconciliations.map((reconciliation) => (
                  <option
                    key={reconciliation.fileName}
                    value={reconciliation.fileName}
                  >
                    {reconciliation.projectName} ({reconciliation.fileName})
                  </option>
                ))}
              </select>
            </Field>
            {selectedReconciliation ? (
              <RepositoryReconciliationSummary
                reconciliation={selectedReconciliation}
              />
            ) : null}
            <Field label="Project Roadmap source">
              <select
                className={selectCls}
                value={form.projectRoadmapFileName ?? ""}
                disabled={isRoadmapsLoading}
                onChange={(event) =>
                  updateField("projectRoadmapFileName", event.target.value)
                }
              >
                <option value="">
                  {isRoadmapsLoading
                    ? "Loading Project Roadmaps..."
                    : "Select Project Roadmap"}
                </option>
                {roadmaps.map((roadmap) => (
                  <option key={roadmap.fileName} value={roadmap.fileName}>
                    {roadmap.nextExecutablePhaseFolder} -{" "}
                    {roadmap.nextExecutablePhaseTitle} ({roadmap.fileName})
                  </option>
                ))}
              </select>
            </Field>
            {selectedRoadmap ? (
              <ProjectRoadmapSummary roadmap={selectedRoadmap} />
            ) : null}
          </FieldGroup>
          <ActionBar
            onPreview={() => void previewPhaseMap()}
            onSave={() => void savePhaseMap()}
            onCopy={() => void copyText(previewMarkdown, setCopyMessage)}
            previewLabel="Preview Phase Map"
            saveLabel="Generate / Update Phase Map"
            copyLabel="Copy Preview"
            saveDisabled={
              isBusy ||
              !form.projectPlanningDocumentFileName ||
              !form.repositoryReconciliationFileName ||
              !form.projectRoadmapFileName
            }
            copyDisabled={previewMarkdown.trim().length === 0}
            statusMessage={copyMessage || statusMessage}
            statusType={allErrors.length > 0 ? "error" : "success"}
          />
        </div>
      }
      right={
        <ArtifactPanel
          eyebrow="Phase Map"
          title="Formal Phase Map Preview"
          status={statusMessage}
          filename={saveResult?.savedMarkdownFileName}
          emptyMessage="Generate a preview to see mapped phase records."
        >
          {saveResult?.markdownPath && saveResult.jsonPath ? (
            <Notice type="success">
              <div className="grid gap-1">
                <span>Saved paired Phase Map artifacts.</span>
                <code className="break-anywhere text-[11px]">
                  {saveResult.markdownPath}
                </code>
                <code className="break-anywhere text-[11px]">
                  {saveResult.jsonPath}
                </code>
                <button
                  type="button"
                  onClick={() => onNavigate("phase-planning-documents")}
                  className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-md border border-blue-400/25 bg-blue-400/10 px-3 py-1.5 text-xs font-semibold text-blue-200 transition-colors hover:bg-blue-400/15"
                >
                  Open Phase Planning Generator
                  <ChevronRight size={14} aria-hidden="true" />
                </button>
              </div>
            </Notice>
          ) : null}
          {phaseMap ? <PhaseMapPreviewSummary phaseMap={phaseMap} /> : null}
          <MonoBlock className="mt-4 min-h-[calc(100vh-300px)]">
            {previewMarkdown || "No Phase Map preview yet."}
          </MonoBlock>
        </ArtifactPanel>
      }
    />
  );
}

function ProjectRoadmapScreen({
  phase,
  phaseOptions,
  onPhaseChange,
  onActiveCardChange,
  onNavigate,
}: ScreenProps & {
  onNavigate: (screen: AppScreen) => void;
}) {
  const {
    documents: projectPlanningDocuments,
    invalidFiles: invalidProjectPlanningFiles,
    errors: projectPlanningErrors,
    isLoading: isProjectPlanningLoading,
  } = usePhasePlanningProjectPlanningDocuments();
  const {
    reconciliations,
    invalidFiles: invalidReconciliationFiles,
    errors: reconciliationErrors,
    isLoading: isReconciliationsLoading,
  } = useRepositoryReconciliations();
  const [showLegacyPhaseIntake, setShowLegacyPhaseIntake] = useState(false);
  const [form, setForm] = useState<ChampCityProjectRoadmapRequest>({
    ...initialProjectRoadmapForm,
    completedPhaseFolder: phase,
  });
  const [previewResult, setPreviewResult] =
    useState<ChampCityProjectRoadmapPreviewResult | null>(null);
  const [saveResult, setSaveResult] =
    useState<ChampCityProjectRoadmapSaveResult | null>(null);
  const [screenErrors, setScreenErrors] = useState<string[]>([]);
  const [copyMessage, setCopyMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    "Roadmap is ready to map the full project.",
  );

  const selectedProjectPlanningDocuments =
    projectPlanningDocuments.find(
      (document) =>
        document.fileName === form.sourceProjectPlanningDocumentFileName,
    ) ?? null;
  const selectedReconciliation =
    reconciliations.find(
      (reconciliation) =>
        reconciliation.fileName === form.sourceRepositoryReconciliationFileName,
    ) ?? null;
  const allErrors = [
    ...projectPlanningErrors,
    ...reconciliationErrors,
    ...screenErrors,
  ];
  const previewMarkdown =
    saveResult?.markdown ?? previewResult?.markdown ?? "";
  const roadmap = saveResult?.roadmap ?? previewResult?.roadmap;
  const nextPhasePreview =
    saveResult?.nextPhaseArtifactPreview ??
    previewResult?.nextPhaseArtifactPreview;

  useEffect(() => {
    onActiveCardChange(null);
  }, [onActiveCardChange]);

  useEffect(() => {
    setForm((previous) =>
      previous.completedPhaseFolder === phase
        ? previous
        : {
            ...previous,
            completedPhaseFolder: phase,
          },
    );
  }, [phase]);

  useEffect(() => {
    setFirstAvailableRoadmapSource(
      "sourceProjectPlanningDocumentFileName",
      projectPlanningDocuments[0]?.fileName,
      form.sourceProjectPlanningDocumentFileName,
      projectPlanningDocuments.map((document) => document.fileName),
    );
  }, [
    projectPlanningDocuments,
    form.sourceProjectPlanningDocumentFileName,
  ]);

  useEffect(() => {
    setFirstAvailableRoadmapSource(
      "sourceRepositoryReconciliationFileName",
      reconciliations[0]?.fileName,
      form.sourceRepositoryReconciliationFileName,
      reconciliations.map((reconciliation) => reconciliation.fileName),
    );
  }, [reconciliations, form.sourceRepositoryReconciliationFileName]);

  function setFirstAvailableRoadmapSource(
    field: keyof ChampCityProjectRoadmapRequest,
    firstFileName: string | undefined,
    currentFileName: string | undefined,
    availableFileNames: string[],
  ) {
    if (!firstFileName) {
      return;
    }

    if (currentFileName && availableFileNames.includes(currentFileName)) {
      return;
    }

    setForm((previous) => ({
      ...previous,
      [field]: firstFileName,
    }));
  }

  function updateField<Field extends keyof ChampCityProjectRoadmapRequest>(
    field: Field,
    value: ChampCityProjectRoadmapRequest[Field],
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
    resetRoadmapPreview("Roadmap details updated.");
  }

  function updateCompletedPhase(nextPhase: string) {
    onPhaseChange(nextPhase);
    updateField("completedPhaseFolder", nextPhase);
  }

  function resetRoadmapPreview(nextStatusMessage: string) {
    setPreviewResult(null);
    setSaveResult(null);
    setCopyMessage("");
    setScreenErrors([]);
    setStatusMessage(nextStatusMessage);
  }

  async function previewRoadmap() {
    setIsBusy(true);
    setCopyMessage("");
    setScreenErrors([]);

    const result = await window.champCity.previewProjectRoadmap(form);
    setIsBusy(false);

    if (!result.ok || !result.markdown) {
      setPreviewResult(null);
      setSaveResult(null);
      setScreenErrors(
        result.errorMessages ?? ["Project Roadmap could not be generated."],
      );
      setStatusMessage("Project Roadmap preview needs attention.");
      return;
    }

    setPreviewResult(result);
    setSaveResult(null);
    setStatusMessage("Project Roadmap preview refreshed.");
  }

  async function saveRoadmap() {
    setIsBusy(true);
    setCopyMessage("");
    setScreenErrors([]);

    const result = await window.champCity.saveProjectRoadmap(form);
    setIsBusy(false);

    if (!result.ok || !result.markdown) {
      setSaveResult(null);
      setScreenErrors(
        result.errorMessages ?? ["Project Roadmap could not be saved."],
      );
      setStatusMessage("Project Roadmap save needs attention.");
      return;
    }

    setPreviewResult(result);
    setSaveResult(result);
    setStatusMessage(
      form.approveNextPhaseArtifacts
        ? "Project Roadmap and pending-review next-phase artifacts saved."
        : "Project Roadmap saved.",
    );
  }

  if (showLegacyPhaseIntake) {
    return (
      <PhaseIntakeScreen
        phase={phase}
        phaseOptions={phaseOptions}
        onPhaseChange={onPhaseChange}
        onActiveCardChange={onActiveCardChange}
        onNavigate={onNavigate}
        onExitLegacy={() => setShowLegacyPhaseIntake(false)}
      />
    );
  }

  return (
    <ScreenLayout
      left={
        <div className="flex h-full flex-col gap-5 p-4">
          <ScreenIntro
            title="Project Roadmap"
            description="Architect-led proposed project progression from durable artifacts through releasable finish."
            badge="roadmap"
          />
          <Notice type="info">
            The Roadmap proposes phases. Phase Map Composer creates selectable
            mapped phase records. Saving draft next-phase artifacts does not
            activate a phase or create Formal Work Cards.
          </Notice>
          <ErrorList errors={allErrors} />
          <InvalidProjectPlanningDocumentsFiles files={invalidProjectPlanningFiles} />
          <InvalidRepositoryReconciliationFiles files={invalidReconciliationFiles} />
          <FieldGroup title="Source Artifacts">
            <Field label="Project Planning Documents">
              <select
                className={selectCls}
                value={form.sourceProjectPlanningDocumentFileName ?? ""}
                disabled={isProjectPlanningLoading}
                onChange={(event) =>
                  updateField(
                    "sourceProjectPlanningDocumentFileName",
                    event.target.value,
                  )
                }
              >
                <option value="">
                  {isProjectPlanningLoading
                    ? "Loading Project Planning Documents..."
                    : "Use latest durable project documents"}
                </option>
                {projectPlanningDocuments.map((document) => (
                  <option key={document.fileName} value={document.fileName}>
                    {document.projectName} ({document.fileName})
                  </option>
                ))}
              </select>
            </Field>
            {selectedProjectPlanningDocuments ? (
              <ProjectPlanningDocumentsSummary
                document={selectedProjectPlanningDocuments}
              />
            ) : null}
            <Field label="Repository Reconciliation">
              <select
                className={selectCls}
                value={form.sourceRepositoryReconciliationFileName ?? ""}
                disabled={isReconciliationsLoading}
                onChange={(event) =>
                  updateField(
                    "sourceRepositoryReconciliationFileName",
                    event.target.value,
                  )
                }
              >
                <option value="">
                  {isReconciliationsLoading
                    ? "Loading Repository Reconciliations..."
                    : "Use latest reconciliation context"}
                </option>
                {reconciliations.map((reconciliation) => (
                  <option
                    key={reconciliation.fileName}
                    value={reconciliation.fileName}
                  >
                    {reconciliation.projectName} ({reconciliation.fileName})
                  </option>
                ))}
              </select>
            </Field>
            {selectedReconciliation ? (
              <RepositoryReconciliationSummary
                reconciliation={selectedReconciliation}
              />
            ) : null}
          </FieldGroup>
          <FieldGroup title="Operator Direction">
            <FieldRow>
              <Field label="Roadmap mode">
                <select
                  className={selectCls}
                  value={form.mode ?? "project-roadmap"}
                  onChange={(event) =>
                    updateField(
                      "mode",
                      event.target
                        .value as ChampCityProjectRoadmapRequest["mode"],
                    )
                  }
                >
                  <option value="project-roadmap">Project Roadmap</option>
                  <option value="next-phase-readiness-review">
                    Next Phase Readiness Review
                  </option>
                </select>
              </Field>
              <PhaseField
                phase={form.completedPhaseFolder ?? phase}
                phaseOptions={phaseOptions}
                onPhaseChange={updateCompletedPhase}
              />
            </FieldRow>
            <TextAreaField
              label="Direction for the Architect"
              value={form.operatorDirection ?? ""}
              rows={5}
              onChange={(value) => updateField("operatorDirection", value)}
            />
          </FieldGroup>
          <FieldGroup title="Save Roadmap / Generate Next Phase Artifacts">
            <label className="flex items-start gap-2 rounded-md border border-border bg-white/[0.02] p-3 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={Boolean(form.approveNextPhaseArtifacts)}
                onChange={(event) =>
                  updateField(
                    "approveNextPhaseArtifacts",
                    event.target.checked,
                  )
                }
                className="mt-1 h-4 w-4 rounded border-border bg-[#0e1218]"
              />
              <span>
                Operator allows saving draft / pending-review next-phase
                planning artifacts.
              </span>
            </label>
            <label className="flex items-start gap-2 rounded-md border border-border bg-white/[0.02] p-3 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={Boolean(form.generateCompatibilityPhaseIntake)}
                disabled={!form.approveNextPhaseArtifacts}
                onChange={(event) =>
                  updateField(
                    "generateCompatibilityPhaseIntake",
                    event.target.checked,
                  )
                }
                className="mt-1 h-4 w-4 rounded border-border bg-[#0e1218]"
              />
              <span>
                Generate compatibility Phase Intake from the reviewed Roadmap.
              </span>
            </label>
            {nextPhasePreview ? (
              <Notice type="info">
                <div className="grid gap-1">
                  <span>
                    Next recommended phase:{" "}
                    <code>{nextPhasePreview.phaseFolder}</code>
                  </span>
                  <span>
                    Phase folder exists:{" "}
                    {nextPhasePreview.phaseFolderExists ? "yes" : "no"}
                  </span>
                  <span>
                    Create folder for draft planning artifacts:{" "}
                    {nextPhasePreview.shouldCreatePhaseFolder ? "yes" : "no"}
                  </span>
                </div>
              </Notice>
            ) : null}
          </FieldGroup>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowLegacyPhaseIntake(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-amber-400/25 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-200 transition-colors hover:bg-amber-400/15"
            >
              Advanced / Legacy Phase Intake
              <ChevronRight size={14} aria-hidden="true" />
            </button>
          </div>
          <ActionBar
            onPreview={() => void previewRoadmap()}
            onSave={() => void saveRoadmap()}
            onCopy={() => void copyText(previewMarkdown, setCopyMessage)}
            previewLabel="Generate Roadmap"
            saveLabel={
              form.approveNextPhaseArtifacts
                ? "Save Roadmap & Draft Artifacts"
                : "Save Roadmap"
            }
            copyLabel="Copy Roadmap"
            saveDisabled={isBusy}
            copyDisabled={previewMarkdown.trim().length === 0}
            statusMessage={copyMessage || statusMessage}
            statusType={allErrors.length > 0 ? "error" : "success"}
          />
        </div>
      }
      right={
        <ArtifactPanel
          eyebrow="Roadmap"
          title="Project Roadmap"
          status={statusMessage}
          filename={saveResult?.savedMarkdownFileName}
          emptyMessage="Generate a Roadmap to see the proposed phase progression."
        >
          {saveResult?.markdownPath && saveResult.jsonPath ? (
            <Notice type="success">
              <div className="grid gap-1">
                <span>Saved paired Project Roadmap artifacts.</span>
                <code className="break-anywhere text-[11px]">
                  {saveResult.markdownPath}
                </code>
                <code className="break-anywhere text-[11px]">
                  {saveResult.jsonPath}
                </code>
              </div>
            </Notice>
          ) : null}
          {saveResult?.phaseReadinessReviewMarkdownPath ? (
            <Notice type="success">
              <div className="grid gap-1">
                <span>Saved pending-review Next Phase Readiness Review.</span>
                <code className="break-anywhere text-[11px]">
                  {saveResult.phaseReadinessReviewMarkdownPath}
                </code>
              </div>
            </Notice>
          ) : null}
          {saveResult?.workCardPlanMarkdownPath ? (
            <Notice type="success">
              <div className="grid gap-1">
                <span>Saved pending-review Work Card Plan proposal.</span>
                <code className="break-anywhere text-[11px]">
                  {saveResult.workCardPlanMarkdownPath}
                </code>
              </div>
            </Notice>
          ) : null}
          {saveResult?.compatibilityPhaseIntakeMarkdownPath ? (
            <Notice type="success">
              <div className="grid gap-1">
                <span>Saved generated compatibility Phase Intake.</span>
                <code className="break-anywhere text-[11px]">
                  {saveResult.compatibilityPhaseIntakeMarkdownPath}
                </code>
              </div>
            </Notice>
          ) : null}
          {roadmap?.nextExecutablePhase ? (
            <Notice type="info">
              <div className="grid gap-1">
                <span>
                  Next recommended phase:{" "}
                  <code>{roadmap.nextExecutablePhase.phaseFolder}</code>
                </span>
                <span>{roadmap.nextExecutablePhase.actionSummary}</span>
                <span>{roadmap.nextExecutablePhase.rationale}</span>
                <button
                  type="button"
                  onClick={() => onNavigate("phase-map")}
                  className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-md border border-blue-400/25 bg-blue-400/10 px-3 py-1.5 text-xs font-semibold text-blue-200 transition-colors hover:bg-blue-400/15"
                >
                  Open Phase Map
                  <ChevronRight size={14} aria-hidden="true" />
                </button>
              </div>
            </Notice>
          ) : null}
          <MonoBlock className="mt-4 min-h-[calc(100vh-280px)]">
            {previewMarkdown || "No Project Roadmap preview yet."}
          </MonoBlock>
        </ArtifactPanel>
      }
    />
  );
}

function PhaseIntakeScreen({
  phase,
  phaseOptions,
  onPhaseChange,
  onActiveCardChange,
  onNavigate,
  onExitLegacy,
}: ScreenProps & {
  onNavigate: (screen: AppScreen) => void;
  onExitLegacy?: () => void;
}) {
  const {
    projectIntakes,
    invalidFiles: invalidProjectIntakeFiles,
    errors: projectIntakeErrors,
    isLoading: isProjectIntakesLoading,
  } = useProjectIntakes();
  const {
    prompts: projectArchitectPrompts,
    invalidFiles: invalidProjectArchitectPromptFiles,
    errors: projectArchitectPromptErrors,
    isLoading: isProjectArchitectPromptsLoading,
  } = useProjectArchitectInterviewPrompts();
  const {
    documents: projectPlanningDocuments,
    invalidFiles: invalidProjectPlanningFiles,
    errors: projectPlanningErrors,
    isLoading: isProjectPlanningLoading,
  } = useProjectPlanningDocumentSources();
  const {
    reconciliations,
    invalidFiles: invalidReconciliationFiles,
    errors: reconciliationErrors,
    isLoading: isReconciliationsLoading,
  } = useRepositoryReconciliations();
  const {
    phaseIntakes: existingPhaseIntakes,
    invalidFiles: invalidPhaseIntakeFiles,
    errors: existingPhaseIntakeErrors,
    isLoading: isExistingPhaseIntakesLoading,
  } = usePhaseIntakes(phase);
  const [mode, setMode] =
    useState<NonNullable<ChampCityPhaseIntakeInput["generationMode"]>>(
      "architect-led",
    );
  const [form, setForm] = useState<ChampCityPhaseIntakeInput>({
    ...initialPhaseIntakeForm,
    phaseFolder: phase,
  });
  const [validation, setValidation] =
    useState<ChampCityPhaseIntakeValidationResult>({
      valid: true,
      errors: [],
      warnings: [],
    });
  const [previewMarkdown, setPreviewMarkdown] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [screenErrors, setScreenErrors] = useState<string[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    "Phase Intake is ready for phase-level capture.",
  );
  const [saveResult, setSaveResult] =
    useState<ChampCityPhaseIntakeSaveResult | null>(null);

  const selectedProjectIntake =
    projectIntakes.find(
      (projectIntake) => projectIntake.fileName === form.projectIntakeFileName,
    ) ?? null;
  const selectedProjectArchitectPrompt =
    projectArchitectPrompts.find(
      (prompt) =>
        prompt.fileName === form.projectArchitectInterviewPromptFileName,
    ) ?? null;
  const selectedProjectPlanningDocuments =
    projectPlanningDocuments.find(
      (document) =>
        document.fileName === form.sourceProjectPlanningSidecarJsonFileName,
    ) ?? null;
  const selectedReconciliation =
    reconciliations.find(
      (reconciliation) =>
        reconciliation.fileName === form.repositoryReconciliationFileName,
    ) ?? null;
  const selectedExistingPhaseIntake =
    existingPhaseIntakes.find(
      (phaseIntake) => phaseIntake.fileName === form.existingPhaseIntakeFileName,
    ) ?? null;
  const allErrors = [
    ...projectIntakeErrors,
    ...projectArchitectPromptErrors,
    ...projectPlanningErrors,
    ...reconciliationErrors,
    ...existingPhaseIntakeErrors,
    ...screenErrors,
    ...validation.errors,
  ];
  const shouldRecommendReconciliation =
    mode === "architect-led" &&
    form.operatorProjectWorkType !== "new_project" &&
    reconciliations.length === 0 &&
    !isReconciliationsLoading;

  useEffect(() => {
    onActiveCardChange(null);
  }, [onActiveCardChange]);

  useEffect(() => {
    setForm((previous) =>
      previous.phaseFolder === phase
        ? previous
        : {
            ...previous,
            phaseFolder: phase,
            existingPhaseIntakeFileName: "",
          },
    );
    setPreviewMarkdown("");
    setSaveResult(null);
    setCopyMessage("");
    setScreenErrors([]);
    setStatusMessage("Phase selection updated.");
  }, [phase]);

  useEffect(() => {
    setFirstAvailableGeneratedSource(
      "projectIntakeFileName",
      projectIntakes[0]?.fileName,
      form.projectIntakeFileName,
      projectIntakes.map((projectIntake) => projectIntake.fileName),
    );
  }, [projectIntakes, form.projectIntakeFileName]);

  useEffect(() => {
    setFirstAvailableGeneratedSource(
      "projectArchitectInterviewPromptFileName",
      projectArchitectPrompts[0]?.fileName,
      form.projectArchitectInterviewPromptFileName,
      projectArchitectPrompts.map((prompt) => prompt.fileName),
    );
  }, [projectArchitectPrompts, form.projectArchitectInterviewPromptFileName]);

  useEffect(() => {
    setFirstAvailableGeneratedSource(
      "sourceProjectPlanningSidecarJsonFileName",
      projectPlanningDocuments[0]?.fileName,
      form.sourceProjectPlanningSidecarJsonFileName,
      projectPlanningDocuments.map((document) => document.fileName),
    );
  }, [projectPlanningDocuments, form.sourceProjectPlanningSidecarJsonFileName]);

  useEffect(() => {
    setFirstAvailableGeneratedSource(
      "repositoryReconciliationFileName",
      reconciliations[0]?.fileName,
      form.repositoryReconciliationFileName,
      reconciliations.map((reconciliation) => reconciliation.fileName),
    );
  }, [reconciliations, form.repositoryReconciliationFileName]);

  function setFirstAvailableGeneratedSource(
    field: keyof ChampCityPhaseIntakeInput,
    firstFileName: string | undefined,
    currentFileName: string | undefined,
    availableFileNames: string[],
  ) {
    if (mode !== "architect-led" || !firstFileName) {
      return;
    }

    if (currentFileName && availableFileNames.includes(currentFileName)) {
      return;
    }

    setForm((previous) => ({
      ...previous,
      [field]: firstFileName,
    }));
  }

  function updateField<Field extends keyof ChampCityPhaseIntakeInput>(
    field: Field,
    value: ChampCityPhaseIntakeInput[Field],
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
    resetGeneratedPhaseIntake("Phase Intake details updated.");
  }

  function updateMode(
    nextMode: NonNullable<ChampCityPhaseIntakeInput["generationMode"]>,
  ) {
    setMode(nextMode);
    setForm((previous) => ({
      ...previous,
      generationMode: nextMode,
    }));
    resetGeneratedPhaseIntake(
      nextMode === "architect-led"
        ? "Generate compatibility Phase Intake from the reviewed Roadmap."
        : "Advanced manual Phase Intake mode selected.",
    );
  }

  function updatePhaseFolder(nextPhase: string) {
    onPhaseChange(nextPhase);
    updateField("phaseFolder", nextPhase);
  }

  function updateProjectIntakeSource(fileName: string) {
    const selectedSource =
      projectIntakes.find((projectIntake) => projectIntake.fileName === fileName) ??
      null;

    setForm((previous) => ({
      ...previous,
      projectIntakeFileName: fileName,
      projectName:
        previous.projectName.trim().length > 0
          ? previous.projectName
          : selectedSource?.projectName ?? previous.projectName,
    }));
    resetGeneratedPhaseIntake(
      fileName ? "Project Intake source selected." : "Project Intake source cleared.",
    );
  }

  function updateProjectArchitectPromptSource(fileName: string) {
    const selectedSource =
      projectArchitectPrompts.find((prompt) => prompt.fileName === fileName) ??
      null;

    setForm((previous) => ({
      ...previous,
      projectArchitectInterviewPromptFileName: fileName,
      projectName:
        previous.projectName.trim().length > 0
          ? previous.projectName
          : selectedSource?.projectName ?? previous.projectName,
    }));
    resetGeneratedPhaseIntake(
      fileName
        ? "Project Architect Interview Prompt source selected."
        : "Project Architect Interview Prompt source cleared.",
    );
  }

  function updateProjectPlanningSource(fileName: string) {
    const selectedSource =
      projectPlanningDocuments.find((document) => document.fileName === fileName) ??
      null;

    setForm((previous) => ({
      ...previous,
      sourceProjectPlanningSidecarJsonFileName: fileName,
      projectName:
        previous.projectName.trim().length > 0
          ? previous.projectName
          : selectedSource?.projectName ?? previous.projectName,
    }));
    resetGeneratedPhaseIntake(
      fileName
        ? "Project planning source selected."
        : "Project planning source cleared.",
    );
  }

  function updateRepositoryReconciliationSource(fileName: string) {
    const selectedSource =
      reconciliations.find(
        (reconciliation) => reconciliation.fileName === fileName,
      ) ?? null;

    setForm((previous) => ({
      ...previous,
      repositoryReconciliationFileName: fileName,
      projectName:
        previous.projectName.trim().length > 0
          ? previous.projectName
          : selectedSource?.projectName ?? previous.projectName,
    }));
    resetGeneratedPhaseIntake(
      fileName
        ? "Repository Reconciliation source selected."
        : "Repository Reconciliation source cleared.",
    );
  }

  function updateExistingPhaseIntakeSource(fileName: string) {
    setForm((previous) => ({
      ...previous,
      existingPhaseIntakeFileName: fileName,
    }));
    resetGeneratedPhaseIntake(
      fileName
        ? "Existing Phase Intake selected as an editable source."
        : "Existing Phase Intake source cleared.",
    );
  }

  function resetGeneratedPhaseIntake(nextStatusMessage: string) {
    setPreviewMarkdown("");
    setSaveResult(null);
    setCopyMessage("");
    setScreenErrors([]);
    setValidation({
      valid: true,
      errors: [],
      warnings: [],
    });
    setStatusMessage(nextStatusMessage);
  }

  async function previewPhaseIntake() {
    if (
      mode === "architect-led" &&
      (form.operatorNextWorkIntent ?? "").trim().length === 0
    ) {
      setScreenErrors(["Describe what you want to work on next."]);
      setStatusMessage("Phase Intake generation needs plain-language intent.");
      return;
    }

    setIsBusy(true);
    setCopyMessage("");
    setScreenErrors([]);

    const result = await window.champCity.previewPhaseIntake({
      ...form,
      generationMode: mode,
    });
    setIsBusy(false);
    setValidation(result.validation);

    if (!result.ok || !result.markdown) {
      setPreviewMarkdown("");
      setSaveResult(null);
      setScreenErrors(result.errorMessages ?? ["Phase Intake could not be previewed."]);
      setStatusMessage("Phase Intake preview needs attention.");
      return;
    }

    setPreviewMarkdown(result.markdown);
    setSaveResult(null);
    setStatusMessage("Phase Intake preview refreshed.");
  }

  async function savePhaseIntake() {
    if (
      mode === "architect-led" &&
      (form.operatorNextWorkIntent ?? "").trim().length === 0
    ) {
      setScreenErrors(["Describe what you want to work on next."]);
      setStatusMessage("Phase Intake generation needs plain-language intent.");
      return;
    }

    setIsBusy(true);
    setCopyMessage("");
    setScreenErrors([]);

    const result = await window.champCity.savePhaseIntake({
      ...form,
      generationMode: mode,
    });
    setIsBusy(false);
    setValidation(result.validation);

    if (!result.ok || !result.markdown) {
      setPreviewMarkdown("");
      setSaveResult(null);
      setScreenErrors(result.errorMessages ?? ["Phase Intake could not be saved."]);
      setStatusMessage("Phase Intake save needs attention.");
      return;
    }

    setPreviewMarkdown(result.markdown);
    setSaveResult(result);
    setStatusMessage("Phase Intake saved for Phase Architect Interview work.");
  }

  return (
    <ScreenLayout
      left={
        <div className="flex h-full flex-col gap-5 p-4">
          <ScreenIntro
            title="Advanced / Legacy Phase Intake"
            description="Compatibility path for existing Phase Intake records after Roadmap review."
            badge="legacy"
          />
          {onExitLegacy ? (
            <button
              type="button"
              onClick={onExitLegacy}
              className="inline-flex w-fit items-center gap-1.5 rounded-md border border-blue-400/25 bg-blue-400/10 px-3 py-1.5 text-xs font-semibold text-blue-200 transition-colors hover:bg-blue-400/15"
            >
              Back to Roadmap
              <ChevronRight size={14} aria-hidden="true" />
            </button>
          ) : null}
          <Notice type="info">
            Manual Phase Intake is preserved for compatibility. The normal path
            is Roadmap first, with compatibility Phase Intake generated from an
            reviewed Roadmap or Next Phase Readiness Review when needed.
          </Notice>
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-white/[0.02] p-1">
            <button
              type="button"
              onClick={() => updateMode("architect-led")}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-semibold transition-colors",
                mode === "architect-led"
                  ? "bg-blue-500/15 text-blue-200"
                  : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
              )}
            >
              Generate Compatibility Intake
            </button>
            <button
              type="button"
              onClick={() => updateMode("manual")}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-semibold transition-colors",
                mode === "manual"
                  ? "bg-amber-500/15 text-amber-200"
                  : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
              )}
            >
              Manual Legacy Edit
            </button>
          </div>
          <ErrorList errors={allErrors} />
          <WarningList warnings={validation.warnings} />
          <InvalidProjectIntakeFiles files={invalidProjectIntakeFiles} />
          <InvalidProjectArchitectInterviewPromptFiles
            files={invalidProjectArchitectPromptFiles}
          />
          <InvalidProjectPlanningDocumentsFiles files={invalidProjectPlanningFiles} />
          <InvalidRepositoryReconciliationFiles files={invalidReconciliationFiles} />
          <InvalidPhaseIntakeFiles files={invalidPhaseIntakeFiles} />
          {mode === "architect-led" ? (
            <>
              {shouldRecommendReconciliation ? (
                <Notice type="warning">
                  Repository Reconciliation is recommended for ongoing,
                  partially implemented, repair, UI, validation, or planning
                  passes before generating Phase Intake. New projects can
                  continue without it.
                </Notice>
              ) : null}
              <FieldGroup title="Operator Intent">
                <PhaseField
                  phase={form.phaseFolder}
                  phaseOptions={phaseOptions}
                  onPhaseChange={updatePhaseFolder}
                />
                <TextAreaField
                  label="What do you want to work on next?"
                  value={form.operatorNextWorkIntent ?? ""}
                  rows={4}
                  onChange={(value) =>
                    updateField("operatorNextWorkIntent", value)
                  }
                  required
                />
                <Field label="What kind of work is this?">
                  <select
                    className={selectCls}
                    value={form.operatorProjectWorkType ?? "ongoing_project"}
                    onChange={(event) =>
                      updateField(
                        "operatorProjectWorkType",
                        event.target
                          .value as ChampCityPhaseIntakeInput["operatorProjectWorkType"],
                      )
                    }
                  >
                    {phaseIntakeWorkTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <TextAreaField
                  label="Any must-keep constraints or concerns?"
                  value={form.operatorMustKeepConstraints ?? ""}
                  rows={3}
                  onChange={(value) =>
                    updateField("operatorMustKeepConstraints", value)
                  }
                />
                <TextField
                  label="Optional phase title"
                  value={form.phaseName}
                  onChange={(value) => updateField("phaseName", value)}
                />
              </FieldGroup>
              <FieldGroup title="Source Artifacts">
                <Field label="Project Intake">
                  <select
                    className={selectCls}
                    value={form.projectIntakeFileName ?? ""}
                    disabled={isProjectIntakesLoading}
                    onChange={(event) =>
                      updateProjectIntakeSource(event.target.value)
                    }
                  >
                    <option value="">
                      {isProjectIntakesLoading
                        ? "Loading Project Intakes..."
                        : "Use current project context"}
                    </option>
                    {projectIntakes.map((projectIntake) => (
                      <option
                        key={projectIntake.fileName}
                        value={projectIntake.fileName}
                      >
                        {projectIntake.projectName} ({projectIntake.fileName})
                      </option>
                    ))}
                  </select>
                </Field>
                {selectedProjectIntake ? (
                  <ProjectIntakeSummary projectIntake={selectedProjectIntake} />
                ) : null}
                <Field label="Project Architect Interview Prompt">
                  <select
                    className={selectCls}
                    value={form.projectArchitectInterviewPromptFileName ?? ""}
                    disabled={isProjectArchitectPromptsLoading}
                    onChange={(event) =>
                      updateProjectArchitectPromptSource(event.target.value)
                    }
                  >
                    <option value="">
                      {isProjectArchitectPromptsLoading
                        ? "Loading Project Architect prompts..."
                        : "Optional Project Architect prompt"}
                    </option>
                    {projectArchitectPrompts.map((prompt) => (
                      <option key={prompt.fileName} value={prompt.fileName}>
                        {prompt.projectName} ({prompt.fileName})
                      </option>
                    ))}
                  </select>
                </Field>
                {selectedProjectArchitectPrompt ? (
                  <ProjectArchitectInterviewPromptSummary
                    prompt={selectedProjectArchitectPrompt}
                  />
                ) : null}
                <Field label="Project Planning Documents">
                  <select
                    className={selectCls}
                    value={form.sourceProjectPlanningSidecarJsonFileName ?? ""}
                    disabled={isProjectPlanningLoading}
                    onChange={(event) =>
                      updateProjectPlanningSource(event.target.value)
                    }
                  >
                    <option value="">
                      {isProjectPlanningLoading
                        ? "Loading Project Planning Documents..."
                        : "Use current planning docs reference"}
                    </option>
                    {projectPlanningDocuments.map((document) => (
                      <option key={document.fileName} value={document.fileName}>
                        {document.projectName} ({document.fileName})
                      </option>
                    ))}
                  </select>
                </Field>
                {selectedProjectPlanningDocuments ? (
                  <ProjectPlanningDocumentsSummary
                    document={selectedProjectPlanningDocuments}
                  />
                ) : null}
                <Field label="Repository Reconciliation">
                  <select
                    className={selectCls}
                    value={form.repositoryReconciliationFileName ?? ""}
                    disabled={isReconciliationsLoading}
                    onChange={(event) =>
                      updateRepositoryReconciliationSource(event.target.value)
                    }
                  >
                    <option value="">
                      {isReconciliationsLoading
                        ? "Loading Repository Reconciliations..."
                        : "Optional for new projects"}
                    </option>
                    {reconciliations.map((reconciliation) => (
                      <option
                        key={reconciliation.fileName}
                        value={reconciliation.fileName}
                      >
                        {reconciliation.projectName} ({reconciliation.fileName})
                      </option>
                    ))}
                  </select>
                </Field>
                {selectedReconciliation ? (
                  <RepositoryReconciliationSummary
                    reconciliation={selectedReconciliation}
                  />
                ) : null}
                <Field label="Existing Phase Intake editable source">
                  <select
                    className={selectCls}
                    value={form.existingPhaseIntakeFileName ?? ""}
                    disabled={isExistingPhaseIntakesLoading}
                    onChange={(event) =>
                      updateExistingPhaseIntakeSource(event.target.value)
                    }
                  >
                    <option value="">
                      {isExistingPhaseIntakesLoading
                        ? "Loading Phase Intakes..."
                        : "Do not use existing Phase Intake"}
                    </option>
                    {existingPhaseIntakes.map((phaseIntake) => (
                      <option key={phaseIntake.fileName} value={phaseIntake.fileName}>
                        {formatPhaseIntakeOptionLabel(phaseIntake)}
                      </option>
                    ))}
                  </select>
                </Field>
                {selectedExistingPhaseIntake ? (
                  <PhaseIntakeSummary phaseIntake={selectedExistingPhaseIntake} />
                ) : null}
              </FieldGroup>
            </>
          ) : (
            <>
              <Notice type="warning">
                Advanced manual mode is for editing or repairing Phase Intake
                details directly. The normal path is Roadmap first.
              </Notice>
              <FieldGroup title="Advanced Source">
                <PhaseField
                  phase={form.phaseFolder}
                  phaseOptions={phaseOptions}
                  onPhaseChange={updatePhaseFolder}
                />
                <Field label="Saved Project Planning Documents sidecar">
                  <select
                    className={selectCls}
                    value={form.sourceProjectPlanningSidecarJsonFileName ?? ""}
                    disabled={isProjectPlanningLoading}
                    onChange={(event) =>
                      updateProjectPlanningSource(event.target.value)
                    }
                  >
                    <option value="">
                      {isProjectPlanningLoading
                        ? "Loading Project Planning Documents..."
                        : "Use current planning docs reference"}
                    </option>
                    {projectPlanningDocuments.map((document) => (
                      <option key={document.fileName} value={document.fileName}>
                        {document.projectName} ({document.fileName})
                      </option>
                    ))}
                  </select>
                </Field>
                {selectedProjectPlanningDocuments ? (
                  <ProjectPlanningDocumentsSummary
                    document={selectedProjectPlanningDocuments}
                  />
                ) : null}
              </FieldGroup>
              <FieldGroup title="Advanced Phase Details">
                <FieldRow>
                  <TextField
                    label="Phase name"
                    value={form.phaseName}
                    onChange={(value) => updateField("phaseName", value)}
                    required
                  />
                  <TextField
                    label="Project name"
                    value={form.projectName}
                    onChange={(value) => updateField("projectName", value)}
                    required
                  />
                </FieldRow>
                <TextAreaField
                  label="Phase problem"
                  value={form.phaseProblem}
                  rows={4}
                  onChange={(value) => updateField("phaseProblem", value)}
                  required
                />
                <TextAreaField
                  label="Phase goal"
                  value={form.phaseGoal}
                  rows={4}
                  onChange={(value) => updateField("phaseGoal", value)}
                  required
                />
                <TextAreaField
                  label="User outcome"
                  value={form.userOutcome}
                  rows={4}
                  onChange={(value) => updateField("userOutcome", value)}
                  required
                />
              </FieldGroup>
              <FieldGroup title="Advanced Scope And Boundaries">
                <FieldRow>
                  <TextAreaField
                    label="Included scope"
                    value={form.includedScope}
                    rows={4}
                    onChange={(value) => updateField("includedScope", value)}
                  />
                  <TextAreaField
                    label="Out of scope"
                    value={form.outOfScope}
                    rows={4}
                    onChange={(value) => updateField("outOfScope", value)}
                  />
                </FieldRow>
                <TextAreaField
                  label="Affected screens or workflows"
                  value={form.affectedScreensOrWorkflows}
                  rows={3}
                  onChange={(value) =>
                    updateField("affectedScreensOrWorkflows", value)
                  }
                />
              </FieldGroup>
              <FieldGroup title="Advanced Planning Context">
                <FieldRow>
                  <TextAreaField
                    label="Known constraints"
                    value={form.knownConstraints}
                    rows={3}
                    onChange={(value) => updateField("knownConstraints", value)}
                  />
                  <TextAreaField
                    label="Known risks"
                    value={form.knownRisks}
                    rows={3}
                    onChange={(value) => updateField("knownRisks", value)}
                  />
                </FieldRow>
                <FieldRow>
                  <TextAreaField
                    label="Dependencies"
                    value={form.dependencies}
                    rows={3}
                    onChange={(value) => updateField("dependencies", value)}
                  />
                  <TextAreaField
                    label="Validation expectations"
                    value={form.validationExpectations}
                    rows={3}
                    onChange={(value) =>
                      updateField("validationExpectations", value)
                    }
                  />
                </FieldRow>
                <TextAreaField
                  label="Operator notes"
                  value={form.operatorNotes}
                  rows={3}
                  onChange={(value) => updateField("operatorNotes", value)}
                />
              </FieldGroup>
            </>
          )}
          <ActionBar
            onPreview={() => void previewPhaseIntake()}
            onSave={() => void savePhaseIntake()}
            onCopy={() => void copyText(previewMarkdown, setCopyMessage)}
            previewLabel={
              mode === "architect-led"
                ? "Preview Compatibility Intake"
                : "Preview Manual Intake"
            }
            saveLabel="Save Legacy Intake"
            copyLabel="Copy Preview"
            saveDisabled={
              isBusy ||
              (mode === "architect-led" &&
                (form.operatorNextWorkIntent ?? "").trim().length === 0)
            }
            copyDisabled={previewMarkdown.trim().length === 0}
            statusMessage={copyMessage || statusMessage}
            statusType={allErrors.length > 0 ? "error" : "success"}
          />
        </div>
      }
      right={
        <ArtifactPanel
          eyebrow="Phase Intake"
          title="Advanced / Legacy Phase Intake Preview"
          status={statusMessage}
          filename={saveResult?.savedMarkdownFileName}
          emptyMessage="Generate a compatibility or manual legacy Phase Intake to see the durable Markdown artifact."
        >
          {saveResult?.markdownPath && saveResult.jsonPath ? (
            <Notice type="success">
              <div className="grid gap-1">
                <span>Saved paired Phase Intake artifacts.</span>
                <code className="break-anywhere text-[11px]">
                  {saveResult.markdownPath}
                </code>
                <code className="break-anywhere text-[11px]">
                  {saveResult.jsonPath}
                </code>
                <button
                  type="button"
                  onClick={() => onNavigate("phase-architect-interview")}
                  className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-md border border-blue-400/25 bg-blue-400/10 px-3 py-1.5 text-xs font-semibold text-blue-200 transition-colors hover:bg-blue-400/15"
                >
                  Open Phase Interview
                  <ChevronRight size={14} aria-hidden="true" />
                </button>
              </div>
            </Notice>
          ) : null}
          <Notice type="info">
            Next step: use the saved Phase Intake to generate a Phase Architect
            Interview prompt, then generate the Phase Plan from that saved
            source.
          </Notice>
          <MonoBlock className="mt-4 min-h-[calc(100vh-260px)]">
            {previewMarkdown || "No Phase Intake preview yet."}
          </MonoBlock>
        </ArtifactPanel>
      }
    />
  );
}

function PhaseArchitectInterviewScreen({
  phase,
  phaseOptions,
  onPhaseChange,
  onActiveCardChange,
  onNavigate,
}: ScreenProps & {
  onNavigate: (screen: AppScreen) => void;
}) {
  const { phaseIntakes, invalidFiles, errors, isLoading } =
    usePhaseIntakes(phase);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [screenErrors, setScreenErrors] = useState<string[]>([]);
  const [promptText, setPromptText] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    "Choose a saved Phase Intake to generate a Phase Architect Interview prompt.",
  );
  const [saveResult, setSaveResult] =
    useState<ChampCityPhaseArchitectInterviewPromptSaveResult | null>(null);

  const selectedPhaseIntake =
    phaseIntakes.find((phaseIntake) => phaseIntake.fileName === selectedFileName) ??
    null;
  const allErrors = [...errors, ...screenErrors];

  useEffect(() => {
    onActiveCardChange(null);
  }, [onActiveCardChange]);

  useEffect(() => {
    if (phaseIntakes.some((phaseIntake) => phaseIntake.fileName === selectedFileName)) {
      return;
    }

    setSelectedFileName(phaseIntakes[0]?.fileName ?? "");
    setPromptText("");
    setSaveResult(null);
  }, [phaseIntakes, selectedFileName]);

  function handlePhaseChange(nextPhase: string) {
    onPhaseChange(nextPhase);
    setSelectedFileName("");
    setPromptText("");
    setSaveResult(null);
    setCopyMessage("");
    setScreenErrors([]);
    setStatusMessage("Phase selection updated.");
  }

  function handleSelectedFileChange(fileName: string) {
    setSelectedFileName(fileName);
    setPromptText("");
    setSaveResult(null);
    setCopyMessage("");
    setScreenErrors([]);
    setStatusMessage(
      fileName
        ? "Saved Phase Intake selected."
        : "Choose a saved Phase Intake first.",
    );
  }

  async function generatePhaseInterviewPrompt() {
    if (!selectedFileName) {
      setScreenErrors(["Choose a saved Phase Intake first."]);
      setStatusMessage("Phase Intake selection is required.");
      return;
    }

    setIsBusy(true);
    setCopyMessage("");
    setScreenErrors([]);

    const result = await window.champCity.previewPhaseArchitectInterviewPrompt({
      phaseFolder: phase,
      phaseIntakeFileName: selectedFileName,
    });
    setIsBusy(false);

    if (!result.ok || !result.promptText) {
      setPromptText("");
      setSaveResult(null);
      setScreenErrors(
        result.errorMessages ?? ["Phase Architect Interview prompt could not be generated."],
      );
      setStatusMessage("Phase Architect Interview prompt generation needs attention.");
      return;
    }

    setPromptText(result.promptText);
    setSaveResult(null);
    setStatusMessage("Phase Architect Interview prompt preview refreshed.");
  }

  async function savePhaseInterviewPrompt() {
    if (!selectedFileName) {
      setScreenErrors(["Choose a saved Phase Intake first."]);
      setStatusMessage("Phase Intake selection is required.");
      return;
    }

    setIsBusy(true);
    setCopyMessage("");
    setScreenErrors([]);

    const result = await window.champCity.savePhaseArchitectInterviewPrompt({
      phaseFolder: phase,
      phaseIntakeFileName: selectedFileName,
    });
    setIsBusy(false);

    if (!result.ok || !result.promptText) {
      setPromptText("");
      setSaveResult(null);
      setScreenErrors(
        result.errorMessages ?? ["Phase Architect Interview prompt could not be saved."],
      );
      setStatusMessage("Phase Architect Interview prompt save needs attention.");
      return;
    }

    setPromptText(result.promptText);
    setSaveResult(result);
    setStatusMessage("Phase Architect Interview prompt saved for the Operator to copy.");
  }

  return (
    <ScreenLayout
      left={
        <div className="flex h-full flex-col gap-5 p-4">
          <ScreenIntro
            title="Phase Architect Interview"
            description="Generate a copy-ready Architect prompt from a saved Phase Intake."
            badge="upstream"
          />
          <Notice type="info">
            This prompt asks the Architect for phase interview questions and
            recommended defaults only. It does not create Phase Planning
            Documents, Work Cards, or implementation code.
          </Notice>
          <ErrorList errors={allErrors} />
          <InvalidPhaseIntakeFiles files={invalidFiles} />
          {phaseIntakes.length === 0 && !isLoading ? (
            <Notice type="warning">
              No saved Phase Intake JSON artifacts were found for this phase.
              Generate a Roadmap and compatibility Phase Intake first.
            </Notice>
          ) : null}
          <FieldGroup title="Source">
            <PhaseField
              phase={phase}
              phaseOptions={phaseOptions}
              onPhaseChange={handlePhaseChange}
            />
            <Field label="Saved Phase Intake">
              <select
                className={selectCls}
                value={selectedFileName}
                disabled={isLoading || phaseIntakes.length === 0}
                onChange={(event) =>
                  handleSelectedFileChange(event.target.value)
                }
              >
                <option value="">
                  {isLoading
                    ? "Loading Phase Intakes..."
                    : "Select generated compatibility intake"}
                </option>
                {phaseIntakes.map((phaseIntake) => (
                  <option key={phaseIntake.fileName} value={phaseIntake.fileName}>
                    {formatPhaseIntakeOptionLabel(phaseIntake)}
                  </option>
                ))}
              </select>
            </Field>
            {selectedPhaseIntake ? (
              <PhaseIntakeSummary phaseIntake={selectedPhaseIntake} />
            ) : null}
          </FieldGroup>
          <FieldGroup title="What happens next?">
            <Notice type="info">
              Copy this prompt into the Architect surface. The Architect should
              return interview questions and recommended defaults only; the
              dedicated Phase Planning Documents workflow comes later.
            </Notice>
          </FieldGroup>
          <ActionBar
            onPreview={() => void generatePhaseInterviewPrompt()}
            onSave={() => void savePhaseInterviewPrompt()}
            onCopy={() => void copyText(promptText, setCopyMessage)}
            previewLabel="Generate Phase Prompt"
            saveLabel="Save Phase Prompt"
            copyLabel="Copy Phase Prompt"
            saveDisabled={isBusy || !selectedFileName}
            copyDisabled={promptText.trim().length === 0}
            statusMessage={copyMessage || statusMessage}
            statusType={allErrors.length > 0 ? "error" : "success"}
          />
        </div>
      }
      right={
        <ArtifactPanel
          eyebrow="Phase Architect Interview"
          title="Preview Phase Prompt"
          status={statusMessage}
          filename={saveResult?.savedMarkdownFileName}
          emptyMessage="Generate a Phase Architect Interview prompt to preview the copy-ready text."
        >
          {saveResult?.markdownPath && saveResult.jsonPath ? (
            <Notice type="success">
              <div className="grid gap-1">
                <span>Saved paired Phase Architect Interview Prompt artifacts.</span>
                <code className="break-anywhere text-[11px]">
                  {saveResult.markdownPath}
                </code>
                <code className="break-anywhere text-[11px]">
                  {saveResult.jsonPath}
                </code>
                <button
                  type="button"
                  onClick={() => onNavigate("phase-intake")}
                  className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-md border border-blue-400/25 bg-blue-400/10 px-3 py-1.5 text-xs font-semibold text-blue-200 transition-colors hover:bg-blue-400/15"
                >
                  Open Roadmap
                  <ChevronRight size={14} aria-hidden="true" />
                </button>
              </div>
            </Notice>
          ) : null}
          <Notice type="info">
            Next step: copy the prompt into the Architect surface and save the
            completed phase interview output for the future Phase Planning
            Documents workflow.
          </Notice>
          <MonoBlock className="mt-4 min-h-[calc(100vh-260px)]">
            {promptText || "No Phase Architect Interview prompt preview yet."}
          </MonoBlock>
        </ArtifactPanel>
      }
    />
  );
}

function RepositoryReconciliationScreen({
  phase,
  phaseOptions,
  onPhaseChange,
  onActiveCardChange,
  onNavigate,
}: ScreenProps & {
  onNavigate: (screen: AppScreen) => void;
}) {
  const {
    documents: projectPlanningDocuments,
    invalidFiles,
    errors: sourceErrors,
    isLoading,
  } = useRepositoryReconciliationProjectPlanningDocuments();
  const [form, setForm] = useState<ChampCityRepositoryReconciliationRequest>({
    ...initialRepositoryReconciliationForm,
    sourcePhaseFolder: phase,
  });
  const [promptText, setPromptText] = useState("");
  const [previewMarkdown, setPreviewMarkdown] = useState("");
  const [saveResult, setSaveResult] =
    useState<ChampCityRepositoryReconciliationSaveResult | null>(null);
  const [screenErrors, setScreenErrors] = useState<string[]>([]);
  const [copyMessage, setCopyMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    "Generate a Repository Reconciliation prompt from current project context.",
  );
  const [activePreviewLabel, setActivePreviewLabel] =
    useState("Repository Reconciliation Prompt");

  const selectedProjectPlanningDocuments =
    projectPlanningDocuments.find(
      (document) =>
        document.fileName === form.projectPlanningDocumentFileName,
    ) ?? null;
  const allErrors = [...sourceErrors, ...screenErrors];
  const displayedPreview = previewMarkdown || promptText;

  useEffect(() => {
    onActiveCardChange(null);
  }, [onActiveCardChange]);

  useEffect(() => {
    setForm((previous) =>
      previous.sourcePhaseFolder === phase
        ? previous
        : {
            ...previous,
            sourcePhaseFolder: phase,
          },
    );
    resetReconciliationPreview("Phase selection updated.");
  }, [phase]);

  useEffect(() => {
    if (projectPlanningDocuments.length === 0) {
      return;
    }

    if (
      projectPlanningDocuments.some(
        (document) => document.fileName === form.projectPlanningDocumentFileName,
      )
    ) {
      return;
    }

    setForm((previous) => ({
      ...previous,
      projectPlanningDocumentFileName:
        projectPlanningDocuments[0]?.fileName ?? "",
      projectName:
        previous.projectName?.trim() || projectPlanningDocuments[0]?.projectName,
    }));
  }, [projectPlanningDocuments, form.projectPlanningDocumentFileName]);

  function updateField<Field extends keyof ChampCityRepositoryReconciliationRequest>(
    field: Field,
    value: ChampCityRepositoryReconciliationRequest[Field],
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
    resetReconciliationPreview("Repository reconciliation details updated.");
  }

  function updatePhaseFolder(nextPhase: string) {
    onPhaseChange(nextPhase);
    updateField("sourcePhaseFolder", nextPhase);
  }

  function updateProjectPlanningSource(fileName: string) {
    const selectedSource =
      projectPlanningDocuments.find((document) => document.fileName === fileName) ??
      null;

    setForm((previous) => ({
      ...previous,
      projectPlanningDocumentFileName: fileName,
      projectName:
        previous.projectName?.trim() || selectedSource?.projectName || "",
    }));
    resetReconciliationPreview(
      fileName
        ? "Project planning source selected."
        : "Project planning source cleared.",
    );
  }

  function resetReconciliationPreview(nextStatusMessage: string) {
    setPromptText("");
    setPreviewMarkdown("");
    setSaveResult(null);
    setCopyMessage("");
    setScreenErrors([]);
    setStatusMessage(nextStatusMessage);
  }

  function buildPromptRequest(): ChampCityRepositoryReconciliationPromptRequest {
    return {
      projectName: form.projectName,
      projectPlanningDocumentFileName: nonBlankSelection(
        form.projectPlanningDocumentFileName,
      ),
      sourcePhaseFolder: nonBlankSelection(form.sourcePhaseFolder),
    };
  }

  async function generateReconciliationPrompt() {
    setIsBusy(true);
    setCopyMessage("");
    setScreenErrors([]);

    const result = await window.champCity.previewRepositoryReconciliationPrompt(
      buildPromptRequest(),
    );
    setIsBusy(false);

    if (!result.ok || !result.promptText) {
      setPromptText("");
      setPreviewMarkdown("");
      setScreenErrors(
        result.errorMessages ?? [
          "Repository Reconciliation prompt could not be generated.",
        ],
      );
      setStatusMessage("Repository Reconciliation prompt needs attention.");
      return;
    }

    setPromptText(result.promptText);
    setPreviewMarkdown("");
    setSaveResult(null);
    setActivePreviewLabel("Repository Reconciliation Prompt");
    setStatusMessage("Repository Reconciliation prompt preview refreshed.");
  }

  async function previewReconciliationOutput() {
    if (form.architectReconciliationOutput.trim().length === 0) {
      setScreenErrors(["Paste the completed Architect reconciliation output first."]);
      setStatusMessage("Repository Reconciliation preview needs attention.");
      return;
    }

    setIsBusy(true);
    setCopyMessage("");
    setScreenErrors([]);

    const result = await window.champCity.previewRepositoryReconciliation(form);
    setIsBusy(false);

    if (!result.ok || !result.markdown) {
      setPreviewMarkdown("");
      setSaveResult(null);
      setScreenErrors(
        result.errorMessages ?? ["Repository Reconciliation could not be previewed."],
      );
      setStatusMessage("Repository Reconciliation preview needs attention.");
      return;
    }

    setPreviewMarkdown(result.markdown);
    setSaveResult(null);
    setActivePreviewLabel("Repository Reconciliation Markdown");
    setStatusMessage("Repository Reconciliation preview refreshed.");
  }

  async function saveReconciliationOutput() {
    if (form.architectReconciliationOutput.trim().length === 0) {
      setScreenErrors(["Paste the completed Architect reconciliation output first."]);
      setStatusMessage("Repository Reconciliation save needs attention.");
      return;
    }

    setIsBusy(true);
    setCopyMessage("");
    setScreenErrors([]);

    const result = await window.champCity.saveRepositoryReconciliation(form);
    setIsBusy(false);

    if (!result.ok || !result.markdown) {
      setPreviewMarkdown("");
      setSaveResult(null);
      setScreenErrors(
        result.errorMessages ?? ["Repository Reconciliation could not be saved."],
      );
      setStatusMessage("Repository Reconciliation save needs attention.");
      return;
    }

    setPreviewMarkdown(result.markdown);
    setSaveResult(result);
    setActivePreviewLabel("Repository Reconciliation Markdown");
    setStatusMessage("Repository Reconciliation saved for Phase Map Composer.");
  }

  return (
    <ScreenLayout
      left={
        <div className="flex h-full flex-col gap-5 p-4">
          <ScreenIntro
            title="Repository Reconciliation"
            description="Package current repo/project state for Architect review before phase planning."
            badge="upstream"
          />
          <Notice type="info">
            Reconciliation is reusable for partially completed projects. The
            generated prompt uses safe summaries of project documents, phase
            artifacts, app workflow surface, and repository structure.
          </Notice>
          <ErrorList errors={allErrors} />
          <InvalidProjectPlanningDocumentsFiles files={invalidFiles} />
          <FieldGroup title="Sources">
            <PhaseField
              phase={form.sourcePhaseFolder ?? phase}
              phaseOptions={phaseOptions}
              onPhaseChange={updatePhaseFolder}
            />
            <Field label="Saved Project Planning Documents source">
              <select
                className={selectCls}
                value={form.projectPlanningDocumentFileName ?? ""}
                disabled={isLoading}
                onChange={(event) =>
                  updateProjectPlanningSource(event.target.value)
                }
              >
                <option value="">
                  {isLoading
                    ? "Loading Project Planning Documents..."
                    : "Use current project planning docs"}
                </option>
                {projectPlanningDocuments.map((document) => (
                  <option key={document.fileName} value={document.fileName}>
                    {document.projectName} ({document.fileName})
                  </option>
                ))}
              </select>
            </Field>
            {selectedProjectPlanningDocuments ? (
              <ProjectPlanningDocumentsSummary
                document={selectedProjectPlanningDocuments}
              />
            ) : null}
            <TextField
              label="Project name"
              value={form.projectName ?? ""}
              onChange={(value) => updateField("projectName", value)}
            />
          </FieldGroup>
          <ActionBar
            onPreview={() => void generateReconciliationPrompt()}
            onCopy={() => void copyText(promptText, setCopyMessage)}
            previewLabel="Generate Prompt"
            copyLabel="Copy Prompt"
            copyDisabled={promptText.trim().length === 0}
            statusMessage={copyMessage || statusMessage}
            statusType={allErrors.length > 0 ? "error" : "success"}
          />
          <FieldGroup title="Completed Architect Reconciliation">
            <TextAreaField
              label="Completed Architect repository reconciliation output"
              value={form.architectReconciliationOutput}
              rows={12}
              onChange={(value) =>
                updateField("architectReconciliationOutput", value)
              }
              required
            />
          </FieldGroup>
          <ActionBar
            onPreview={() => void previewReconciliationOutput()}
            onSave={() => void saveReconciliationOutput()}
            onCopy={() => void copyText(previewMarkdown, setCopyMessage)}
            previewLabel="Preview Output"
            saveLabel="Save Reconciliation"
            copyLabel="Copy Output Preview"
            saveDisabled={
              isBusy || form.architectReconciliationOutput.trim().length === 0
            }
            copyDisabled={previewMarkdown.trim().length === 0}
            statusMessage={copyMessage || statusMessage}
            statusType={allErrors.length > 0 ? "error" : "success"}
          />
        </div>
      }
      right={
        <ArtifactPanel
          eyebrow="Repository Reconciliation"
          title={activePreviewLabel}
          status={statusMessage}
          filename={saveResult?.savedMarkdownFileName}
          emptyMessage="Generate a reconciliation prompt or preview the completed output."
        >
          {saveResult?.markdownPath && saveResult.jsonPath ? (
            <Notice type="success">
              <div className="grid gap-1">
                <span>Saved paired Repository Reconciliation artifacts.</span>
                <code className="break-anywhere text-[11px]">
                  {saveResult.markdownPath}
                </code>
                <code className="break-anywhere text-[11px]">
                  {saveResult.jsonPath}
                </code>
                <button
                  type="button"
                  onClick={() => onNavigate("phase-map")}
                  className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-md border border-blue-400/25 bg-blue-400/10 px-3 py-1.5 text-xs font-semibold text-blue-200 transition-colors hover:bg-blue-400/15"
                >
                  Open Phase Map
                  <ChevronRight size={14} aria-hidden="true" />
                </button>
              </div>
            </Notice>
          ) : null}
          <MonoBlock className="mt-4 min-h-[calc(100vh-260px)]">
            {displayedPreview || "No Repository Reconciliation preview yet."}
          </MonoBlock>
        </ArtifactPanel>
      }
    />
  );
}

function PhasePlanningDocumentsScreen({
  phase,
  phaseOptions,
  onPhaseChange,
  onActiveCardChange,
  onNavigate,
}: ScreenProps & {
  onNavigate: (screen: AppScreen) => void;
}) {
  const {
    documents: projectPlanningDocuments,
    invalidFiles: invalidProjectPlanningFiles,
    errors: projectPlanningErrors,
    isLoading: isProjectPlanningLoading,
  } = usePhasePlanningProjectPlanningDocuments();
  const {
    reconciliations,
    invalidFiles: invalidReconciliationFiles,
    errors: reconciliationErrors,
    isLoading: isReconciliationsLoading,
  } = useRepositoryReconciliations();
  const {
    roadmaps,
    invalidFiles: invalidRoadmapFiles,
    errors: roadmapErrors,
    isLoading: isRoadmapsLoading,
  } = useProjectRoadmaps();
  const {
    phaseMaps,
    invalidFiles: invalidPhaseMapFiles,
    errors: phaseMapErrors,
    isLoading: isPhaseMapsLoading,
  } = usePhaseMaps();
  const {
    phaseIntakes,
    invalidFiles: invalidPhaseIntakeFiles,
    errors: phaseIntakeErrors,
    isLoading: isPhaseIntakesLoading,
  } = usePhaseIntakes(phase);
  const {
    prompts,
    invalidFiles: invalidPhasePromptFiles,
    errors: phasePromptErrors,
    isLoading: isPhasePromptsLoading,
  } = usePhaseArchitectInterviewPrompts(phase);
  const [form, setForm] = useState<ChampCityPhasePlanningDocumentsRequest>({
    ...initialPhasePlanningForm,
    phaseFolder: phase,
  });
  const [previewResult, setPreviewResult] =
    useState<ChampCityPhasePlanningDocumentsPreviewResult | null>(null);
  const [saveResult, setSaveResult] =
    useState<ChampCityPhasePlanningDocumentsSaveResult | null>(null);
  const [screenErrors, setScreenErrors] = useState<string[]>([]);
  const [copyMessage, setCopyMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [showLegacySources, setShowLegacySources] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    "Select a mapped phase from a saved Phase Map.",
  );

  const selectedPhaseMap =
    phaseMaps.find((phaseMap) => phaseMap.fileName === form.phaseMapFileName) ??
    null;
  const selectedMappedPhase =
    selectedPhaseMap?.mappedPhases.find(
      (mappedPhase) => mappedPhase.phaseId === form.mappedPhaseId,
    ) ?? null;
  const selectedProjectPlanningDocuments =
    projectPlanningDocuments.find(
      (document) => document.fileName === form.projectPlanningDocumentFileName,
    ) ?? null;
  const selectedReconciliation =
    reconciliations.find(
      (reconciliation) =>
        reconciliation.fileName === form.repositoryReconciliationFileName,
    ) ?? null;
  const selectedRoadmap =
    roadmaps.find((roadmap) => roadmap.fileName === form.projectRoadmapFileName) ??
    null;
  const selectedPhaseIntake =
    phaseIntakes.find(
      (phaseIntake) => phaseIntake.fileName === form.phaseIntakeFileName,
    ) ?? null;
  const generatedPhaseIntakes = phaseIntakes.filter(
    (phaseIntake) => phaseIntake.generationMode === "architect-led",
  );
  const selectedPhasePrompt =
    prompts.find(
      (prompt) =>
        prompt.fileName === form.phaseArchitectInterviewPromptFileName,
    ) ?? null;
  const allErrors = [
    ...phaseMapErrors,
    ...(showLegacySources ? projectPlanningErrors : []),
    ...(showLegacySources ? reconciliationErrors : []),
    ...(showLegacySources ? roadmapErrors : []),
    ...(showLegacySources ? phaseIntakeErrors : []),
    ...(showLegacySources ? phasePromptErrors : []),
    ...screenErrors,
  ];
  const previewMarkdown =
    saveResult?.combinedMarkdown ?? previewResult?.combinedMarkdown ?? "";

  useEffect(() => {
    onActiveCardChange(null);
  }, [onActiveCardChange]);

  useEffect(() => {
    if (phaseMaps.length === 0) {
      return;
    }

    if (phaseMaps.some((phaseMap) => phaseMap.fileName === form.phaseMapFileName)) {
      return;
    }

    applyPhaseMapSelection(phaseMaps[0]?.fileName ?? "");
  }, [phaseMaps, form.phaseMapFileName]);

  useEffect(() => {
    if (!selectedPhaseMap) {
      return;
    }

    if (
      selectedPhaseMap.mappedPhases.some(
        (mappedPhase) => mappedPhase.phaseId === form.mappedPhaseId,
      )
    ) {
      return;
    }

    const recommended =
      selectedPhaseMap.mappedPhases.find(
        (mappedPhase) => mappedPhase.isRecommendedNext,
      ) ?? selectedPhaseMap.mappedPhases[0];

    applyMappedPhaseSelection(recommended?.phaseId ?? "");
  }, [selectedPhaseMap, form.mappedPhaseId]);

  useEffect(() => {
    setFirstAvailableSource(
      "projectPlanningDocumentFileName",
      projectPlanningDocuments[0]?.fileName,
      form.projectPlanningDocumentFileName,
      projectPlanningDocuments.map((document) => document.fileName),
    );
  }, [projectPlanningDocuments, form.projectPlanningDocumentFileName]);

  useEffect(() => {
    setFirstAvailableSource(
      "repositoryReconciliationFileName",
      reconciliations[0]?.fileName,
      form.repositoryReconciliationFileName,
      reconciliations.map((reconciliation) => reconciliation.fileName),
    );
  }, [reconciliations, form.repositoryReconciliationFileName]);

  useEffect(() => {
    setFirstAvailableSource(
      "projectRoadmapFileName",
      roadmaps.find((roadmap) => roadmap.nextExecutablePhaseFolder === phase)
        ?.fileName,
      form.projectRoadmapFileName,
      roadmaps.map((roadmap) => roadmap.fileName),
    );
  }, [roadmaps, form.projectRoadmapFileName, phase]);

  useEffect(() => {
    if (form.projectRoadmapFileName) {
      return;
    }

    setFirstAvailableSource(
      "phaseIntakeFileName",
      phaseIntakes[0]?.fileName,
      form.phaseIntakeFileName,
      phaseIntakes.map((phaseIntake) => phaseIntake.fileName),
    );
  }, [phaseIntakes, form.phaseIntakeFileName, form.projectRoadmapFileName]);

  useEffect(() => {
    setFirstAvailableSource(
      "phaseArchitectInterviewPromptFileName",
      prompts[0]?.fileName,
      form.phaseArchitectInterviewPromptFileName,
      prompts.map((prompt) => prompt.fileName),
    );
  }, [prompts, form.phaseArchitectInterviewPromptFileName]);

  function applyPhaseMapSelection(fileName: string) {
    const nextPhaseMap =
      phaseMaps.find((phaseMap) => phaseMap.fileName === fileName) ?? null;
    const defaultMappedPhase =
      nextPhaseMap?.mappedPhases.find(
        (mappedPhase) => mappedPhase.isRecommendedNext,
      ) ?? nextPhaseMap?.mappedPhases[0];

    setForm((previous) => ({
      ...previous,
      phaseMapFileName: fileName,
      mappedPhaseId: defaultMappedPhase?.phaseId ?? "",
      phaseFolder: defaultMappedPhase?.phaseId ?? previous.phaseFolder,
      projectPlanningDocumentFileName:
        nextPhaseMap?.sourceProjectPlanningDocumentJsonFileName ?? "",
      repositoryReconciliationFileName:
        nextPhaseMap?.sourceRepositoryReconciliationJsonFileName ?? "",
      projectRoadmapFileName:
        nextPhaseMap?.sourceProjectRoadmapJsonFileName ?? "",
      phaseIntakeFileName: "",
      phaseArchitectInterviewPromptFileName: "",
      phaseClarificationAnswers: "",
      phaseArchitectInterviewOutput: "",
    }));
    resetPhasePlanningPreview(
      fileName
        ? "Phase Map selected."
        : "Select a saved Phase Map before generating planning documents.",
    );
  }

  function applyMappedPhaseSelection(phaseId: string) {
    setForm((previous) => ({
      ...previous,
      mappedPhaseId: phaseId,
      phaseFolder: phaseId || previous.phaseFolder,
      phaseClarificationAnswers: "",
    }));
    resetPhasePlanningPreview(
      phaseId ? "Mapped phase selected." : "Select a mapped phase.",
    );
  }

  function setFirstAvailableSource(
    field: keyof ChampCityPhasePlanningDocumentsRequest,
    firstFileName: string | undefined,
    currentFileName: string | undefined,
    availableFileNames: string[],
  ) {
    if (!firstFileName) {
      return;
    }

    if (currentFileName && availableFileNames.includes(currentFileName)) {
      return;
    }

    setForm((previous) => ({
      ...previous,
      [field]: firstFileName,
    }));
  }

  function updateField<Field extends keyof ChampCityPhasePlanningDocumentsRequest>(
    field: Field,
    value: ChampCityPhasePlanningDocumentsRequest[Field],
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
    resetPhasePlanningPreview("Phase planning details updated.");
  }

  function handlePhaseChange(nextPhase: string) {
    onPhaseChange(nextPhase);
    updateField("phaseFolder", nextPhase);
  }

  function resetPhasePlanningPreview(nextStatusMessage: string) {
    setPreviewResult(null);
    setSaveResult(null);
    setCopyMessage("");
    setScreenErrors([]);
    setStatusMessage(nextStatusMessage);
  }

  function validatePhasePlanningRequest(): string[] {
    const errors: string[] = [];

    if (phaseMaps.length === 0) {
      errors.push("Run Phase Map Composer first, then return to select a mapped phase.");
      return errors;
    }

    if (!form.phaseMapFileName) {
      errors.push("Select a saved Phase Map source.");
    }

    if (!form.mappedPhaseId) {
      errors.push("Select a mapped phase from the Phase Map.");
    }

    if (!form.projectPlanningDocumentFileName) {
      errors.push("Phase Map is missing its Project Planning Documents source.");
    }

    if (!form.repositoryReconciliationFileName) {
      errors.push("Phase Map is missing its Repository Reconciliation source.");
    }

    if (!form.projectRoadmapFileName) {
      errors.push("Phase Map is missing its Project Roadmap source.");
    }

    return errors;
  }

  async function previewPhasePlanning() {
    const requestErrors = validatePhasePlanningRequest();

    if (requestErrors.length > 0) {
      setScreenErrors(requestErrors);
      setStatusMessage("Phase Planning Documents preview needs attention.");
      return;
    }

    setIsBusy(true);
    setCopyMessage("");
    setScreenErrors([]);

    const result = await window.champCity.previewPhasePlanningDocuments(form);
    setIsBusy(false);

    if (!result.ok || !result.combinedMarkdown) {
      setPreviewResult(null);
      setSaveResult(null);
      setScreenErrors(
        result.errorMessages ?? ["Phase Planning Documents could not be generated."],
      );
      setStatusMessage("Phase Planning Documents preview needs attention.");
      return;
    }

    setPreviewResult(result);
    setSaveResult(null);
    setStatusMessage("Phase Planning Documents preview refreshed.");
  }

  async function savePhasePlanning() {
    const requestErrors = validatePhasePlanningRequest();

    if (requestErrors.length > 0) {
      setScreenErrors(requestErrors);
      setStatusMessage("Phase Planning Documents save needs attention.");
      return;
    }

    setIsBusy(true);
    setCopyMessage("");
    setScreenErrors([]);

    const result = await window.champCity.savePhasePlanningDocuments(form);
    setIsBusy(false);

    if (!result.ok || !result.combinedMarkdown) {
      setSaveResult(null);
      setScreenErrors(
        result.errorMessages ?? ["Phase Planning Documents could not be saved."],
      );
      setStatusMessage("Phase Planning Documents save needs attention.");
      return;
    }

    setPreviewResult(result);
    setSaveResult(result);
    setStatusMessage("Pending-review Phase Planning Documents and Work Card Plan proposal saved.");
  }

  return (
    <ScreenLayout
      left={
        <div className="flex h-full flex-col gap-5 p-4">
          <ScreenIntro
            title="Phase Planning Documents Generator"
            description="Select a mapped phase and generate phase planning documents from the formal Phase Map."
            badge="upstream"
          />
          <Notice type="info">
            This creates Draft / Pending Review / Not Active planning artifacts
            only. It does not create Formal Work Cards, activate the phase,
            perform closeout, or call an LLM API.
          </Notice>
          {phaseMaps.length === 0 && !isPhaseMapsLoading ? (
            <Notice type="warning">
              No saved Phase Map was found. Run Phase Map Composer first so the
              generator can use mapped phase records instead of generated phase
              artifact folders.
              <button
                type="button"
                onClick={() => onNavigate("phase-map")}
                className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-md border border-blue-400/25 bg-blue-400/10 px-3 py-1.5 text-xs font-semibold text-blue-200 transition-colors hover:bg-blue-400/15"
              >
                Open Phase Map Composer
                <ChevronRight size={14} aria-hidden="true" />
              </button>
            </Notice>
          ) : null}
          <ErrorList errors={allErrors} />
          <InvalidPhaseMapFiles files={invalidPhaseMapFiles} />
          <FieldGroup title="Mapped Phase Source">
            <Field label="Phase Map source">
              <select
                className={selectCls}
                value={form.phaseMapFileName ?? ""}
                disabled={isPhaseMapsLoading}
                onChange={(event) => applyPhaseMapSelection(event.target.value)}
              >
                <option value="">
                  {isPhaseMapsLoading ? "Loading Phase Maps..." : "Select Phase Map"}
                </option>
                {phaseMaps.map((phaseMap) => (
                  <option key={phaseMap.fileName} value={phaseMap.fileName}>
                    {phaseMap.currentOrNextPhase} - {phaseMap.nextPhaseTitle} (
                    {phaseMap.fileName})
                  </option>
                ))}
              </select>
            </Field>
            {selectedPhaseMap ? (
              <SavedPhaseMapSummaryPanel phaseMap={selectedPhaseMap} />
            ) : null}
            <Field label="Mapped phase">
              <select
                className={selectCls}
                value={form.mappedPhaseId ?? ""}
                disabled={!selectedPhaseMap}
                onChange={(event) =>
                  applyMappedPhaseSelection(event.target.value)
                }
              >
                <option value="">Select mapped phase</option>
                {selectedPhaseMap?.mappedPhases.map((mappedPhase) => (
                  <option key={mappedPhase.phaseId} value={mappedPhase.phaseId}>
                    {mappedPhase.phaseId} - {mappedPhase.phaseTitle}
                    {mappedPhase.isRecommendedNext ? " (recommended)" : ""}
                  </option>
                ))}
              </select>
            </Field>
            {selectedMappedPhase ? (
              <MappedPhaseSummary mappedPhase={selectedMappedPhase} />
            ) : null}
          </FieldGroup>
          <FieldGroup title="Phase-Specific Clarification">
            {selectedMappedPhase?.unresolvedQuestions.length ? (
              <Notice type="warning">
                The mapped phase has unresolved questions. Add short answers
                here only for blockers that must be resolved before planning.
              </Notice>
            ) : (
              <Notice type="info">
                No blocking clarification questions were detected for the
                selected mapped phase. This field is optional.
              </Notice>
            )}
            {selectedMappedPhase?.unresolvedQuestions.length ? (
              <ul className="grid gap-1 text-xs text-muted-foreground">
                {selectedMappedPhase.unresolvedQuestions.map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ul>
            ) : null}
            <TextAreaField
              label="Clarification answers"
              value={form.phaseClarificationAnswers ?? ""}
              rows={5}
              onChange={(value) =>
                updateField("phaseClarificationAnswers", value)
              }
            />
            <TextAreaField
              label="Operator plan adjustments"
              value={form.operatorPlanAdjustments}
              rows={4}
              onChange={(value) => updateField("operatorPlanAdjustments", value)}
            />
          </FieldGroup>
          <FieldGroup title="Advanced / Legacy">
            <button
              type="button"
              onClick={() => setShowLegacySources((value) => !value)}
              className="inline-flex w-fit items-center gap-1.5 rounded-md border border-border bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              {showLegacySources ? "Hide Legacy Sources" : "Show Legacy Sources"}
            </button>
            {showLegacySources ? (
              <>
                <Notice type="warning">
                  Compatibility Phase Intake, Phase Architect Prompt, and
                  completed Phase Architect Interview output are optional legacy
                  context. They are not required in the normal mapped-phase
                  planning path.
                </Notice>
                <InvalidProjectPlanningDocumentsFiles
                  files={invalidProjectPlanningFiles}
                />
                <InvalidRepositoryReconciliationFiles
                  files={invalidReconciliationFiles}
                />
                <InvalidProjectRoadmapFiles files={invalidRoadmapFiles} />
                <InvalidPhaseIntakeFiles files={invalidPhaseIntakeFiles} />
                <InvalidPhaseArchitectInterviewPromptFiles
                  files={invalidPhasePromptFiles}
                />
                <Field label="Compatibility Phase Intake source">
                  <select
                    className={selectCls}
                    value={form.phaseIntakeFileName ?? ""}
                    disabled={isPhaseIntakesLoading}
                    onChange={(event) =>
                      updateField("phaseIntakeFileName", event.target.value)
                    }
                  >
                    <option value="">
                      {isPhaseIntakesLoading
                        ? "Loading Phase Intakes..."
                        : "Optional compatibility intake"}
                    </option>
                    {phaseIntakes.map((phaseIntake) => (
                      <option key={phaseIntake.fileName} value={phaseIntake.fileName}>
                        {formatPhaseIntakeOptionLabel(phaseIntake)}
                      </option>
                    ))}
                  </select>
                </Field>
                {selectedPhaseIntake ? (
                  <PhaseIntakeSummary phaseIntake={selectedPhaseIntake} />
                ) : null}
                <Field label="Phase Architect Interview Prompt source">
                  <select
                    className={selectCls}
                    value={form.phaseArchitectInterviewPromptFileName ?? ""}
                    disabled={isPhasePromptsLoading}
                    onChange={(event) =>
                      updateField(
                        "phaseArchitectInterviewPromptFileName",
                        event.target.value,
                      )
                    }
                  >
                    <option value="">
                      {isPhasePromptsLoading
                        ? "Loading Phase Architect prompts..."
                        : "Optional Phase Architect Prompt"}
                    </option>
                    {prompts.map((prompt) => (
                      <option key={prompt.fileName} value={prompt.fileName}>
                        {prompt.phaseName} ({prompt.fileName})
                      </option>
                    ))}
                  </select>
                </Field>
                {selectedPhasePrompt ? (
                  <PhaseArchitectInterviewPromptSummary prompt={selectedPhasePrompt} />
                ) : null}
                <TextAreaField
                  label="Completed Phase Architect Interview output"
                  value={form.phaseArchitectInterviewOutput}
                  rows={8}
                  onChange={(value) =>
                    updateField("phaseArchitectInterviewOutput", value)
                  }
                />
              </>
            ) : null}
          </FieldGroup>
          <ActionBar
            onPreview={() => void previewPhasePlanning()}
            onSave={() => void savePhasePlanning()}
            onCopy={() => void copyText(previewMarkdown, setCopyMessage)}
            previewLabel="Generate Preview"
            saveLabel="Save Phase Plan"
            copyLabel="Copy Preview"
            saveDisabled={
              isBusy ||
              !form.phaseMapFileName ||
              !form.mappedPhaseId ||
              !form.projectPlanningDocumentFileName ||
              !form.repositoryReconciliationFileName ||
              !form.projectRoadmapFileName
            }
            copyDisabled={previewMarkdown.trim().length === 0}
            statusMessage={copyMessage || statusMessage}
            statusType={allErrors.length > 0 ? "error" : "success"}
          />
        </div>
      }
      right={
        <ArtifactPanel
          eyebrow="Phase Plan"
          title="Preview Phase Planning Documents"
          status={statusMessage}
          filename={saveResult?.savedPhasePlanningMarkdownFileName}
          emptyMessage="Generate a preview to see the Draft / Pending Review Phase Planning Documents and Work Card Plan proposal."
        >
          {saveResult?.phasePlanningMarkdownPath &&
          saveResult.phasePlanningJsonPath ? (
            <Notice type="success">
              <div className="grid gap-1">
                <span>Saved pending-review Phase Planning Documents.</span>
                <code className="break-anywhere text-[11px]">
                  {saveResult.phasePlanningMarkdownPath}
                </code>
                <code className="break-anywhere text-[11px]">
                  {saveResult.phasePlanningJsonPath}
                </code>
              </div>
            </Notice>
          ) : null}
          {saveResult?.workCardPlanMarkdownPath &&
          saveResult.workCardPlanJsonPath ? (
            <Notice type="success">
              <div className="grid gap-1">
                <span>Saved pending-review Work Card Plan proposal.</span>
                <code className="break-anywhere text-[11px]">
                  {saveResult.workCardPlanMarkdownPath}
                </code>
                <code className="break-anywhere text-[11px]">
                  {saveResult.workCardPlanJsonPath}
                </code>
                <button
                  type="button"
                  onClick={() => onNavigate("work-card-plan-review")}
                  className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-md border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-100 transition-colors hover:bg-emerald-400/15"
                >
                  Open Work Card Plan Review
                  <ChevronRight size={14} aria-hidden="true" />
                </button>
              </div>
            </Notice>
          ) : null}
          {saveResult?.phaseBacklogPath ? (
            <Notice type="success">
              <div className="grid gap-1">
                <span>Updated phase-scoped backlog artifact.</span>
                <code className="break-anywhere text-[11px]">
                  {saveResult.phaseBacklogPath}
                </code>
              </div>
            </Notice>
          ) : null}
          <MonoBlock className="mt-4 min-h-[calc(100vh-280px)]">
            {previewMarkdown || "No Phase Planning Documents preview yet."}
          </MonoBlock>
        </ArtifactPanel>
      }
    />
  );
}

function WorkCardPlanReviewScreen({
  phase,
  phaseOptions,
  onPhaseChange,
  onActiveCardChange,
  onNavigate,
}: ScreenProps & {
  onNavigate: (screen: AppScreen) => void;
}) {
  const {
    workCardPlans,
    invalidFiles,
    errors,
    isLoading,
  } = useWorkCardPlans(phase);
  const { phaseMaps } = usePhaseMaps();
  const [selectedFileName, setSelectedFileName] = useState("");

  useEffect(() => {
    onActiveCardChange(null);
  }, [onActiveCardChange]);

  useEffect(() => {
    if (
      selectedFileName &&
      workCardPlans.some((plan) => plan.fileName === selectedFileName)
    ) {
      return;
    }

    setSelectedFileName(workCardPlans[0]?.fileName ?? "");
  }, [selectedFileName, workCardPlans]);

  function handlePhaseChange(nextPhase: string) {
    setSelectedFileName("");
    onPhaseChange(nextPhase);
  }

  const selectedPlan =
    workCardPlans.find((plan) => plan.fileName === selectedFileName) ?? null;
  const mappedPhaseContext = selectedPlan
    ? phaseMaps
        .flatMap((phaseMap) => phaseMap.mappedPhases)
        .find((mappedPhase) => mappedPhase.phaseId === selectedPlan.phaseFolder)
    : undefined;
  const statusMessage = selectedPlan
    ? `${formatWorkCardPlanReviewStatus(selectedPlan.reviewStatus)} / ${formatWorkCardPlanActivationStatus(selectedPlan.phaseActivationStatus)} / Not Executable`
    : isLoading
      ? "Loading saved Work Card Plans."
      : "No saved Work Card Plan selected.";

  return (
    <ScreenLayout
      left={
        <div className="flex h-full flex-col gap-5 p-4">
          <ScreenIntro
            title="Work Card Plan Review"
            description="Review proposed Work Card slots from Phase Planning before any Formal Work Cards are approved or materialized."
            badge="planned path"
          />
          <Notice type="info">
            Use this screen for planned phase work after Phase Planning. Planned
            entries are proposals only: they are not executable Formal Work
            Cards, and they cannot generate Implementer Prompts until the
            Operator separately approves materialization.
          </Notice>
          <ErrorList errors={errors} />
          <InvalidWorkCardPlanFiles files={invalidFiles} />
          <FieldGroup title="Review Source">
            <PhaseField
              phase={phase}
              phaseOptions={phaseOptions}
              onPhaseChange={handlePhaseChange}
            />
            <Field label="Saved Work Card Plan JSON">
              <select
                className={selectCls}
                value={selectedFileName}
                disabled={isLoading}
                onChange={(event) => setSelectedFileName(event.target.value)}
              >
                <option value="">
                  {isLoading ? "Loading Work Card Plans..." : "Select Work Card Plan"}
                </option>
                {workCardPlans.map((plan) => (
                  <option key={plan.fileName} value={plan.fileName}>
                    {plan.phaseFolder} - {plan.phaseName} ({plan.fileName})
                  </option>
                ))}
              </select>
            </Field>
            {selectedPlan ? (
              <WorkCardPlanSummary plan={selectedPlan} />
            ) : (
              <Notice type="warning">
                No Work Card Plan is available for this phase. Generate Phase
                Planning Documents first; that creates a Draft / Pending Review
                Work Card Plan under `Work_Card_Plans/`.
              </Notice>
            )}
            {mappedPhaseContext ? (
              <MappedPhaseSummary mappedPhase={mappedPhaseContext} />
            ) : selectedPlan ? (
              <Notice type="info">
                No current Phase Map summary matched this plan in the saved
                Phase Map list. The Work Card Plan source ID remains the review
                authority for this screen.
              </Notice>
            ) : null}
          </FieldGroup>
          <FieldGroup title="Planned Decision Boundary">
            <Notice type="warning">
              The controls below are scaffolded as future Operator decisions.
              They are disabled in this repair pass so review cannot silently
              create Formal Work Cards.
            </Notice>
            <DisabledPlanActionGrid />
          </FieldGroup>
          <ActionBar
            onPreview={() => onNavigate("phase-planning-documents")}
            previewLabel="Open Phase Plan"
            statusMessage={statusMessage}
            statusType={errors.length > 0 ? "error" : "success"}
          />
        </div>
      }
      right={
        <ArtifactPanel
          eyebrow="Plan Review"
          title="Proposed Work Card Entries"
          status={statusMessage}
          filename={selectedPlan?.markdownFileName ?? selectedPlan?.fileName}
          emptyMessage="Select a Work Card Plan to review proposed entries."
        >
          {selectedPlan ? (
            <div className="grid gap-5">
              <Notice type="info">
                Phase Backlog source:{" "}
                <code className="break-anywhere">
                  planning/phases/{selectedPlan.phaseFolder}/WORK_CARD_BACKLOG.md
                </code>
                . The backlog and Work Card Plan are planning artifacts, not
                executable Work Cards.
              </Notice>
              <FieldGroup title="Artifact Authority">
                <MonoBlock>
                  {[
                    selectedPlan.artifactAuthority,
                    "Work Card Plan Review may draft, defer, rename, reorder, merge, split, supersede, or mark proposals already satisfied only after future Operator-approved edit/materialization support exists.",
                    "Formal Work Cards require a separate Operator approval step and must be saved under Work_Cards/ before Implementer Prompts can be generated.",
                  ].join("\n\n")}
                </MonoBlock>
              </FieldGroup>
              <FieldGroup title="Planned Cards">
                {selectedPlan.proposedWorkCards.length > 0 ? (
                  <div className="grid gap-3">
                    {selectedPlan.proposedWorkCards.map((item) => (
                      <PlannedWorkCardReviewItem
                        key={`${item.workCardIdProposal}-${item.suggestedOrdering}`}
                        item={item}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState message="This Work Card Plan has no proposed Work Card entries." />
                )}
              </FieldGroup>
            </div>
          ) : null}
        </ArtifactPanel>
      }
    />
  );
}

function NewWorkCardScreen({
  phase,
  phaseOptions,
  onPhaseChange,
  onActiveCardChange,
}: ScreenProps) {
  const [form, setForm] = useState<ChampCityWorkCardDraftInput>({
    ...initialWorkCardForm,
    phase,
  });
  const [idEdited, setIdEdited] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [previewMarkdown, setPreviewMarkdown] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    "Ad hoc draft status: ready_for_architect",
  );
  const [saveResult, setSaveResult] =
    useState<ChampCityWorkCardSaveResult | null>(null);

  useEffect(() => {
    setForm((previous) =>
      previous.phase === phase ? previous : { ...previous, phase },
    );
  }, [phase]);

  useEffect(() => {
    let active = true;

    window.champCity
      .getNextWorkCardId(form.phase)
      .then((result) => {
        if (!active || idEdited || !result.ok || !result.workCardId) {
          return;
        }

        setForm((previous) => ({
          ...previous,
          workCardId: result.workCardId ?? previous.workCardId,
        }));
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [form.phase, idEdited]);

  function updateField(field: keyof ChampCityWorkCardDraftInput, value: string) {
    if (field === "workCardId") {
      setIdEdited(true);
    }

    if (field === "phase") {
      onPhaseChange(value);
    }

    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
    setSaveResult(null);
  }

  async function previewWorkCard() {
    const nextErrors = validateWorkCardForm(form);

    if (nextErrors.length > 0) {
      setErrors(nextErrors);
      setStatusMessage("Please fix the highlighted Work Card details.");
      return;
    }

    setIsBusy(true);
    setErrors([]);

    const result = await window.champCity.previewWorkCardDraft(form);
    setIsBusy(false);

    if (!result.ok || !result.markdown) {
      setErrors(result.errorMessages ?? ["The Markdown preview could not be created."]);
      setStatusMessage("Preview needs attention.");
      return;
    }

    setPreviewMarkdown(result.markdown);
    setStatusMessage(
      "Markdown preview refreshed. Ad hoc draft requires Architect review.",
    );
  }

  async function saveWorkCard() {
    const nextErrors = validateWorkCardForm(form);

    if (nextErrors.length > 0) {
      setErrors(nextErrors);
      setStatusMessage("Please fix the highlighted Work Card details.");
      return;
    }

    setIsBusy(true);
    setErrors([]);

    const result = await window.champCity.saveWorkCardDraft(form);
    setIsBusy(false);

    if (!result.ok || !result.markdown) {
      setErrors(result.errorMessages ?? ["The Work Card could not be saved."]);
      setStatusMessage("Save needs attention.");
      return;
    }

    setPreviewMarkdown(result.markdown);
    setSaveResult(result);
    setStatusMessage("Ad hoc Work Card draft saved for Architect review.");
    if (result.workCard) {
      onActiveCardChange(toUiWorkCardSummary(result.workCard));
    }
  }

  const adHocSaveTarget = `This will create a new ad hoc draft Work Card ${form.workCardId || "(missing ID)"} under planning/phases/${form.phase || "(missing phase)"}/Work_Cards/. It will not link to a mapped phase, Work Card Plan, or planned Work Card proposal.`;

  return (
    <ScreenLayout
      left={
        <div className="flex h-full flex-col gap-5 p-4">
          <ScreenIntro
            title="Ad Hoc Work Card Capture"
            description="Capture one-off, repair, emergency, or operator-discovered work outside the planned phase execution path."
            badge="ready_for_architect"
          />
          <Notice type="info">
            This is not the normal next step after Phase Planning. Planned
            phase execution waits for Work Card Plan review and Formal Work
            Card approval.
          </Notice>
          <Notice type="warning">
            Manual/ad hoc mode is active. The Work Card ID, title, and phase
            fields below are authoritative for preview and save; the header
            Work Card selector is hidden on this screen to avoid mixing a
            selected Formal Work Card with a new ad hoc draft.
          </Notice>
          <ErrorList errors={errors} />
          <FieldGroup title="Identity">
            <FieldRow>
              <TextField
                label="Work Card ID"
                value={form.workCardId}
                onChange={(value) => updateField("workCardId", value)}
                required
              />
              <TextField
                label="Title"
                value={form.title}
                onChange={(value) => updateField("title", value)}
                required
              />
            </FieldRow>
            <FieldRow>
              <TextField
                label="Manual/ad hoc phase"
                value={form.phase}
                onChange={(value) => updateField("phase", value)}
                required
              />
              <Field label="Risk Level">
                <select
                  className={selectCls}
                  value={form.riskLevel}
                  onChange={(event) =>
                    updateField("riskLevel", event.target.value)
                  }
                >
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                </select>
              </Field>
            </FieldRow>
            <Notice type="info">{adHocSaveTarget}</Notice>
          </FieldGroup>
          <FieldGroup title="Intent">
            <TextAreaField
              label="What are you trying to build or fix?"
              value={form.problem}
              rows={4}
              onChange={(value) => updateField("problem", value)}
              required
            />
            <TextAreaField
              label="What should the user be able to do when this is done?"
              value={form.userOutcome}
              rows={4}
              onChange={(value) => updateField("userOutcome", value)}
              required
            />
            <TextAreaField
              label="Why does this matter?"
              value={form.importance}
              rows={3}
              onChange={(value) => updateField("importance", value)}
            />
          </FieldGroup>
          <FieldGroup title="Boundaries">
            <FieldRow>
              <TextAreaField
                label="What should be included?"
                value={form.scope}
                rows={5}
                onChange={(value) => updateField("scope", value)}
              />
              <TextAreaField
                label="What should not be included?"
                value={form.outOfScope}
                rows={5}
                onChange={(value) => updateField("outOfScope", value)}
              />
            </FieldRow>
            <TextAreaField
              label="Known files, screens, or systems involved"
              value={form.knownSystems}
              rows={3}
              onChange={(value) => updateField("knownSystems", value)}
            />
            <FieldRow>
              <TextAreaField
                label="Evidence or examples"
                value={form.evidence}
                rows={3}
                onChange={(value) => updateField("evidence", value)}
              />
              <TextAreaField
                label="Concerns or risks"
                value={form.risks}
                rows={3}
                onChange={(value) => updateField("risks", value)}
              />
            </FieldRow>
            <TextAreaField
              label="Operator notes"
              value={form.operatorNotes}
              rows={3}
              onChange={(value) => updateField("operatorNotes", value)}
            />
          </FieldGroup>
          <ActionBar
            onPreview={() => void previewWorkCard()}
            onSave={() => void saveWorkCard()}
            saveLabel="Save Ad Hoc Work Card"
            saveDisabled={isBusy}
            statusMessage={`${statusMessage} ${adHocSaveTarget}`}
            statusType={errors.length > 0 ? "error" : "success"}
          />
        </div>
      }
      right={
        <ArtifactPanel
          eyebrow="Markdown"
          title="Ad Hoc Work Card Preview"
          status={statusMessage}
          emptyMessage="Preview an ad hoc Work Card to see the durable Markdown artifact."
        >
          {saveResult?.markdownPath && saveResult.jsonPath ? (
            <Notice type="success">
              <div className="grid gap-1">
                <span>Saved paired ad hoc Work Card draft artifacts.</span>
                <code className="break-anywhere text-[11px]">
                  {saveResult.markdownPath}
                </code>
                <code className="break-anywhere text-[11px]">
                  {saveResult.jsonPath}
                </code>
              </div>
            </Notice>
          ) : null}
          <MonoBlock className="mt-4 min-h-[calc(100vh-230px)]">
            {previewMarkdown || "No preview yet."}
          </MonoBlock>
        </ArtifactPanel>
      }
    />
  );
}

function ArchitectPromptComposerScreen({
  phase,
  phaseOptions,
  onPhaseChange,
  onActiveCardChange,
}: ScreenProps) {
  const { workCards, invalidFiles, errors: listErrors, isLoading } =
    useWorkCards(phase);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState("Loading saved Work Cards.");
  const [copyMessage, setCopyMessage] = useState("");
  const [isPromptBusy, setIsPromptBusy] = useState(false);
  const [saveResult, setSaveResult] =
    useState<ChampCityArchitectPromptSaveResult | null>(null);

  const selectedWorkCard = useSelectedWorkCard(
    workCards,
    selectedFileName,
    onActiveCardChange,
  );

  useDefaultSelectedFile(workCards, selectedFileName, setSelectedFileName);

  useEffect(() => {
    if (selectedFileName.trim().length === 0) {
      setPrompt("");
      setSaveResult(null);
      setStatusMessage(isLoading ? "Loading saved Work Cards." : "No saved Work Card JSON files found.");
      return;
    }

    let active = true;

    setIsPromptBusy(true);
    setErrors([]);
    setCopyMessage("");
    setSaveResult(null);

    window.champCity
      .previewArchitectPrompt({ phase, fileName: selectedFileName })
      .then((result) => {
        if (!active) {
          return;
        }

        setIsPromptBusy(false);

        if (!result.ok || !result.prompt) {
          setPrompt("");
          setErrors(result.errorMessages ?? ["The Architect prompt could not be generated."]);
          setStatusMessage("Architect prompt generation needs attention.");
          return;
        }

        setPrompt(result.prompt);
        setStatusMessage("Architect prompt generated.");
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setIsPromptBusy(false);
        setPrompt("");
        setErrors(["The Architect prompt could not be generated."]);
        setStatusMessage("Architect prompt generation needs attention.");
      });

    return () => {
      active = false;
    };
  }, [phase, selectedFileName, isLoading]);

  async function copyPrompt() {
    await copyText(prompt, setCopyMessage);
  }

  async function savePrompt() {
    if (selectedFileName.trim().length === 0) {
      setErrors(["Select a saved Work Card before saving a prompt."]);
      return;
    }

    setIsPromptBusy(true);
    setErrors([]);
    setCopyMessage("");

    const result = await window.champCity.saveArchitectPrompt({
      phase,
      fileName: selectedFileName,
    });

    setIsPromptBusy(false);

    if (!result.ok || !result.prompt) {
      setErrors(result.errorMessages ?? ["The Architect prompt could not be saved."]);
      setStatusMessage("Save needs attention.");
      return;
    }

    setPrompt(result.prompt);
    setSaveResult(result);
    setStatusMessage("Architect prompt saved.");
  }

  return (
    <ScreenLayout
      left={
        <div className="flex h-full flex-col gap-5 p-4">
          <ScreenIntro
            title="Architect Prompt Composer"
            description="Turn a saved Work Card into a focused Architect framing prompt."
            badge={phase}
          />
          <ErrorList errors={[...listErrors, ...errors]} />
          <Notice type="info">{workCardJsonSelectorHelp}</Notice>
          <FieldGroup title="Source">
            <PhaseField
              phase={phase}
              phaseOptions={phaseOptions}
              onPhaseChange={onPhaseChange}
            />
            <WorkCardSelect
              workCards={workCards}
              selectedFileName={selectedFileName}
              onChange={setSelectedFileName}
              isLoading={isLoading}
            />
            {selectedWorkCard ? <WorkCardSummary card={selectedWorkCard} /> : null}
            {selectedWorkCard?.status !== "ready_for_architect" && selectedWorkCard ? (
              <Notice type="warning">
                This Work Card status is {selectedWorkCard.status}. Normal
                Architect review is still expected before implementation.
              </Notice>
            ) : null}
            <InvalidWorkCardFiles files={invalidFiles} />
          </FieldGroup>
          {saveResult?.markdownPath ? (
            <Notice type="success">
              Saved Architect Prompt at{" "}
              <code className="break-anywhere">{saveResult.markdownPath}</code>
            </Notice>
          ) : null}
          <ActionBar
            onCopy={() => void copyPrompt()}
            onSave={() => void savePrompt()}
            copyLabel="Copy Prompt"
            saveLabel="Save Architect Prompt"
            copyDisabled={!prompt || isPromptBusy}
            saveDisabled={!selectedFileName || isPromptBusy}
            statusMessage={copyMessage || statusMessage}
            statusType={errors.length > 0 ? "error" : "success"}
          />
        </div>
      }
      right={
        <ArtifactPanel
          eyebrow="Architect"
          title="Framing Prompt"
          status={statusMessage}
          filename={saveResult?.savedFileName}
          onCopy={() => void copyPrompt()}
          onSave={() => void savePrompt()}
          copyLabel="Copy"
          saveLabel="Save"
          copyDisabled={!prompt || isPromptBusy}
          saveDisabled={!selectedFileName || isPromptBusy}
          emptyMessage="Select a Work Card to generate an Architect prompt."
        >
          <MonoBlock className="min-h-[calc(100vh-220px)]">
            {prompt || "No prompt generated yet."}
          </MonoBlock>
        </ArtifactPanel>
      }
    />
  );
}

function RiskRouterScreen({
  phase,
  phaseOptions,
  onPhaseChange,
  onActiveCardChange,
}: ScreenProps) {
  const { workCards, invalidFiles, errors: listErrors, isLoading } =
    useWorkCards(phase);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [previewResult, setPreviewResult] =
    useState<ChampCityRiskReviewPreviewResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState("Loading saved Work Cards.");
  const [isBusy, setIsBusy] = useState(false);
  const [saveResult, setSaveResult] =
    useState<ChampCityRiskReviewSaveResult | null>(null);

  const selectedWorkCard = useSelectedWorkCard(
    workCards,
    selectedFileName,
    onActiveCardChange,
  );

  useDefaultSelectedFile(workCards, selectedFileName, setSelectedFileName);

  useEffect(() => {
    if (selectedFileName.trim().length === 0) {
      setPreviewResult(null);
      setStatusMessage(isLoading ? "Loading saved Work Cards." : "No saved Work Card JSON files found.");
      return;
    }

    let active = true;

    setIsBusy(true);
    setErrors([]);
    setSaveResult(null);

    window.champCity
      .previewRiskReview({ phase, fileName: selectedFileName })
      .then((result) => {
        if (!active) {
          return;
        }

        setIsBusy(false);

        if (!result.ok || !result.review) {
          setPreviewResult(null);
          setErrors(result.errorMessages ?? ["The risk review could not be generated."]);
          setStatusMessage("Risk review needs attention.");
          return;
        }

        setPreviewResult(result);
        setStatusMessage("Risk review generated.");
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setIsBusy(false);
        setPreviewResult(null);
        setErrors(["The risk review could not be generated."]);
        setStatusMessage("Risk review needs attention.");
      });

    return () => {
      active = false;
    };
  }, [phase, selectedFileName, isLoading]);

  async function saveRiskReview() {
    if (selectedFileName.trim().length === 0) {
      setErrors(["Select a saved Work Card before saving a Risk Review."]);
      return;
    }

    setIsBusy(true);
    setErrors([]);

    const result = await window.champCity.saveRiskReview({
      phase,
      fileName: selectedFileName,
    });

    setIsBusy(false);

    if (!result.ok || !result.review) {
      setErrors(result.errorMessages ?? ["The Risk Review could not be saved."]);
      setStatusMessage("Save needs attention.");
      return;
    }

    setPreviewResult(result);
    setSaveResult(result);
    setStatusMessage("Risk Review saved.");
  }

  return (
    <ScreenLayout
      left={
        <div className="flex h-full flex-col gap-5 p-4">
          <ScreenIntro
            title="Risk Router"
            description="Run deterministic checks before the Work Card crosses into Implementer mode."
            badge={phase}
          />
          <ErrorList errors={[...listErrors, ...errors]} />
          <FieldGroup title="Source">
            <PhaseField
              phase={phase}
              phaseOptions={phaseOptions}
              onPhaseChange={onPhaseChange}
            />
            <WorkCardSelect
              workCards={workCards}
              selectedFileName={selectedFileName}
              onChange={setSelectedFileName}
              isLoading={isLoading}
            />
            {selectedWorkCard ? <WorkCardSummary card={selectedWorkCard} /> : null}
            <InvalidWorkCardFiles files={invalidFiles} />
          </FieldGroup>
          {previewResult?.review ? (
            <Notice
              type={
                previewResult.review.assessedRiskLevel === "high"
                  ? "warning"
                  : "info"
              }
            >
              Assessed risk:{" "}
              <span className="font-semibold">
                {previewResult.review.assessedRiskLevel}
              </span>
              . Risk review does not approve or mutate a Work Card.
            </Notice>
          ) : null}
          {saveResult?.markdownPath ? (
            <Notice type="success">
              Saved Risk Review at{" "}
              <code className="break-anywhere">{saveResult.markdownPath}</code>
            </Notice>
          ) : null}
          <ActionBar
            onSave={() => void saveRiskReview()}
            saveLabel="Save Risk Review"
            saveDisabled={!selectedFileName || isBusy}
            statusMessage={statusMessage}
            statusType={errors.length > 0 ? "error" : "success"}
          />
        </div>
      }
      right={
        <ArtifactPanel
          eyebrow="Risk"
          title="Deterministic Review"
          status={statusMessage}
          filename={saveResult?.savedFileName}
          onSave={() => void saveRiskReview()}
          saveLabel="Save"
          saveDisabled={!selectedFileName || isBusy}
          emptyMessage="Select a saved Work Card JSON file to generate a risk review."
        >
          {previewResult?.review ? (
            <RiskReviewView review={previewResult.review} />
          ) : (
            <EmptyState
              message="No risk review generated yet."
              icon={<ShieldAlert size={22} />}
            />
          )}
        </ArtifactPanel>
      }
    />
  );
}

function ImplementerExecutionPacketGeneratorScreen({
  phase,
  phaseOptions,
  onPhaseChange,
  onActiveCardChange,
}: ScreenProps) {
  const { workCards, invalidFiles, errors: listErrors, isLoading } =
    useWorkCards(phase);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [artifactOptions, setArtifactOptions] =
    useState<ChampCityImplementerExecutionPacketArtifactOptions>(
      emptyImplementerExecutionPacketArtifactOptions(),
    );
  const [artifactSelections, setArtifactSelections] =
    useState<ChampCityImplementerExecutionPacketSupportingArtifactFileNames>({});
  const [artifactNotes, setArtifactNotes] = useState<string[]>([]);
  const [invalidArtifactFiles, setInvalidArtifactFiles] = useState<
    ChampCityInvalidImplementerExecutionPacketArtifactFile[]
  >([]);
  const [prompt, setPrompt] = useState("");
  const [previewResult, setPreviewResult] =
    useState<ChampCityImplementerExecutionPacketPreviewResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState("Loading saved Work Cards.");
  const [copyMessage, setCopyMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [saveResult, setSaveResult] =
    useState<ChampCityImplementerExecutionPacketSaveResult | null>(null);

  const selectedWorkCard = useSelectedWorkCard(
    workCards,
    selectedFileName,
    onActiveCardChange,
  );

  useDefaultSelectedFile(workCards, selectedFileName, setSelectedFileName);

  useEffect(() => {
    if (selectedFileName.trim().length === 0) {
      setArtifactOptions(emptyImplementerExecutionPacketArtifactOptions());
      setArtifactSelections({});
      setArtifactNotes([]);
      setInvalidArtifactFiles([]);
      setPrompt("");
      setPreviewResult(null);
      setStatusMessage(isLoading ? "Loading saved Work Cards." : "No saved Work Card JSON files found.");
      return;
    }

    let active = true;

    setIsBusy(true);
    setErrors([]);
    setCopyMessage("");
    setSaveResult(null);

    window.champCity
      .listImplementerExecutionPacketSupportingArtifacts({
        phase,
        fileName: selectedFileName,
      })
      .then((result) => {
        if (!active) {
          return;
        }

        if (!result.ok) {
          setArtifactOptions(emptyImplementerExecutionPacketArtifactOptions());
          setArtifactSelections({});
          setArtifactNotes([]);
          setInvalidArtifactFiles([]);
          setErrors(result.errorMessages ?? ["Supporting artifacts could not be loaded."]);
          setStatusMessage("Supporting artifacts need attention.");
          setIsBusy(false);
          return;
        }

        setArtifactOptions(result.options ?? emptyImplementerExecutionPacketArtifactOptions());
        setArtifactSelections(result.defaultSelections ?? {});
        setArtifactNotes(result.notes ?? []);
        setInvalidArtifactFiles(result.invalidFiles ?? []);
        setStatusMessage("Supporting artifacts loaded.");
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setArtifactOptions(emptyImplementerExecutionPacketArtifactOptions());
        setArtifactSelections({});
        setArtifactNotes([]);
        setInvalidArtifactFiles([]);
        setErrors(["Supporting artifacts could not be loaded."]);
        setStatusMessage("Supporting artifacts need attention.");
        setIsBusy(false);
      });

    return () => {
      active = false;
    };
  }, [phase, selectedFileName, isLoading]);

  useEffect(() => {
    if (selectedFileName.trim().length === 0) {
      return;
    }

    let active = true;

    setIsBusy(true);
    setErrors([]);
    setCopyMessage("");
    setSaveResult(null);

    window.champCity
      .previewImplementerExecutionPacket({
        phase,
        fileName: selectedFileName,
        supportingArtifactFileNames:
          cleanImplementerExecutionPacketSelections(artifactSelections),
      })
      .then((result) => {
        if (!active) {
          return;
        }

        setIsBusy(false);

        if (!result.ok || !result.prompt) {
          setPrompt("");
          setPreviewResult(null);
          setErrors(result.errorMessages ?? ["The Implementer prompt could not be generated."]);
          setStatusMessage("Implementer prompt generation needs attention.");
          return;
        }

        setPrompt(result.prompt);
        setPreviewResult(result);
        setStatusMessage("Implementer prompt generated.");
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setIsBusy(false);
        setPrompt("");
        setPreviewResult(null);
        setErrors(["The Implementer prompt could not be generated."]);
        setStatusMessage("Implementer prompt generation needs attention.");
      });

    return () => {
      active = false;
    };
  }, [phase, selectedFileName, artifactSelections]);

  function updateArtifactSelection(
    field: keyof ChampCityImplementerExecutionPacketSupportingArtifactFileNames,
    value: string,
  ) {
    setArtifactSelections((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function copyPrompt() {
    await copyText(prompt, setCopyMessage);
  }

  async function savePrompt() {
    if (selectedFileName.trim().length === 0) {
      setErrors(["Select a saved Work Card before saving an Implementer Prompt."]);
      return;
    }

    setIsBusy(true);
    setErrors([]);
    setCopyMessage("");

    const result = await window.champCity.saveImplementerExecutionPacket({
      phase,
      fileName: selectedFileName,
      supportingArtifactFileNames:
        cleanImplementerExecutionPacketSelections(artifactSelections),
    });

    setIsBusy(false);

    if (!result.ok || !result.prompt) {
      setErrors(result.errorMessages ?? ["The Implementer Prompt could not be saved."]);
      setStatusMessage("Save needs attention.");
      return;
    }

    setPrompt(result.prompt);
    setPreviewResult(result);
    setSaveResult(result);
    setStatusMessage("Implementer Prompt saved.");
  }

  return (
    <ScreenLayout
      left={
        <div className="flex h-full flex-col gap-5 p-4">
          <ScreenIntro
            title="Implementer Prompt Generator"
            description="Compose the exact handoff from Work Card plus optional supporting artifacts."
            badge={phase}
          />
          <ErrorList errors={[...listErrors, ...errors]} />
          <FieldGroup title="Work Card">
            <PhaseField
              phase={phase}
              phaseOptions={phaseOptions}
              onPhaseChange={onPhaseChange}
            />
            <WorkCardSelect
              workCards={workCards}
              selectedFileName={selectedFileName}
              onChange={setSelectedFileName}
              isLoading={isLoading}
            />
            {selectedWorkCard ? <WorkCardSummary card={selectedWorkCard} /> : null}
            <InvalidWorkCardFiles files={invalidFiles} />
          </FieldGroup>
          <FieldGroup title="Supporting Artifacts">
            <OptionalArtifactSelect
              label="Work Card Markdown"
              value={artifactSelections.workCardMarkdown ?? ""}
              options={artifactOptions.workCardMarkdown}
              onChange={(value) =>
                updateArtifactSelection("workCardMarkdown", value)
              }
              emptyMessage="No matching Work Card Markdown found."
            />
            <OptionalArtifactSelect
              label="Architect Prompt"
              value={artifactSelections.architectPrompt ?? ""}
              options={artifactOptions.architectPrompts}
              onChange={(value) =>
                updateArtifactSelection("architectPrompt", value)
              }
              emptyMessage="No matching Architect Prompt found."
            />
            <OptionalArtifactSelect
              label="Risk Review"
              value={artifactSelections.riskReview ?? ""}
              options={artifactOptions.riskReviews}
              onChange={(value) => updateArtifactSelection("riskReview", value)}
              emptyMessage="No matching Risk Review found."
            />
            <OptionalArtifactSelect
              label="Prior Implementer Report"
              value={artifactSelections.priorImplementerReport ?? ""}
              options={artifactOptions.priorImplementerReports}
              onChange={(value) =>
                updateArtifactSelection("priorImplementerReport", value)
              }
              emptyMessage="No matching prior Implementer Report found."
            />
            {artifactNotes.length > 0 ? (
              <Notice type="info">
                <ul className="grid gap-1">
                  {artifactNotes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </Notice>
            ) : null}
            <InvalidImplementerExecutionPacketFiles files={invalidArtifactFiles} />
          </FieldGroup>
          {saveResult?.markdownPath ? (
            <Notice type="success">
              Saved Implementer Prompt at{" "}
              <code className="break-anywhere">{saveResult.markdownPath}</code>
            </Notice>
          ) : null}
          <ActionBar
            onCopy={() => void copyPrompt()}
            onSave={() => void savePrompt()}
            copyLabel="Copy Prompt"
            saveLabel="Save Implementer Prompt"
            copyDisabled={!prompt || isBusy}
            saveDisabled={!selectedFileName || isBusy}
            statusMessage={copyMessage || statusMessage}
            statusType={errors.length > 0 ? "error" : "success"}
          />
        </div>
      }
      right={
        <ArtifactPanel
          eyebrow="Implement"
          title="Implementer Handoff"
          status={statusMessage}
          filename={saveResult?.savedFileName}
          onCopy={() => void copyPrompt()}
          onSave={() => void savePrompt()}
          copyLabel="Copy"
          saveLabel="Save"
          copyDisabled={!prompt || isBusy}
          saveDisabled={!selectedFileName || isBusy}
          emptyMessage="Select a Work Card to generate an Implementer prompt."
        >
          <div className="grid gap-3">
            {previewResult?.hasHighRiskContext ? (
              <Notice type="warning">
                High-risk context is present. Architect review should happen
                before sending this handoff to the Implementer.
              </Notice>
            ) : null}
            {previewResult && !previewResult.hasRiskReviewSelected ? (
              <Notice type="warning">
                No Risk Review artifact is selected. The prompt will include a
                missing-risk-review warning.
              </Notice>
            ) : null}
            <MonoBlock className="min-h-[calc(100vh-280px)]">
              {prompt || "No prompt generated yet."}
            </MonoBlock>
          </div>
        </ArtifactPanel>
      }
    />
  );
}

function ImplementerReportCaptureScreen({
  phase,
  phaseOptions,
  onPhaseChange,
  onActiveCardChange,
  onWorkflowAdvanced,
}: ScreenProps & {
  onWorkflowAdvanced?: (nextScreenId?: string) => void | Promise<void>;
}) {
  const { workCards, invalidFiles, errors: listErrors, isLoading } =
    useWorkCards(phase);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [reportType, setReportType] =
    useState<ChampCityImplementerReportType>("Work Card");
  const [topic, setTopic] = useState("");
  const [reportText, setReportText] = useState("");
  const [previewResult, setPreviewResult] =
    useState<ChampCityImplementerReportCapturePreviewResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState("Paste or import an Implementer Report.");
  const [isBusy, setIsBusy] = useState(false);
  const [saveResult, setSaveResult] =
    useState<ChampCityImplementerReportCaptureSaveResult | null>(null);

  const selectedWorkCard = useSelectedWorkCard(
    workCards,
    selectedFileName,
    onActiveCardChange,
  );

  useEffect(() => {
    if (reportType === "Work Card") {
      setSelectedFileName((previous) =>
        workCards.some((workCard) => workCard.fileName === previous)
          ? previous
          : workCards[0]?.fileName ?? "",
      );
    }
  }, [reportType, workCards]);

  useEffect(() => {
    let active = true;

    setIsBusy(true);
    setErrors([]);
    setSaveResult(null);

    window.champCity
      .previewImplementerReportCapture({
        phase,
        reportType,
        workCardFileName:
          selectedFileName.trim().length > 0 ? selectedFileName : undefined,
        topic,
        reportText,
      })
      .then((result) => {
        if (!active) {
          return;
        }

        setIsBusy(false);
        setPreviewResult(result);

        if (!result.ok) {
          setErrors(result.errorMessages ?? ["The report filename preview could not be generated."]);
          setStatusMessage("Report preview needs attention.");
          return;
        }

        setStatusMessage(
          result.validation?.validEnoughToSave
            ? "Implementer Report is ready to save."
            : "Report needs required content before save.",
        );
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setIsBusy(false);
        setPreviewResult(null);
        setErrors(["The report filename preview could not be generated."]);
        setStatusMessage("Report preview needs attention.");
      });

    return () => {
      active = false;
    };
  }, [phase, reportType, selectedFileName, topic, reportText]);

  async function saveReport() {
    setIsBusy(true);
    setErrors([]);

    const result = await window.champCity.saveImplementerReportCapture({
      phase,
      reportType,
      workCardFileName:
        selectedFileName.trim().length > 0 ? selectedFileName : undefined,
      topic,
      reportText,
    });

    setIsBusy(false);
    setPreviewResult(result);

    if (!result.ok) {
      setErrors(result.errorMessages ?? ["The Implementer Report could not be saved."]);
      setStatusMessage("Save needs attention.");
      return;
    }

    setSaveResult(result);
    setStatusMessage("Implementer Report saved.");
    await onWorkflowAdvanced?.(result.workflowTransition?.nextScreenId ?? undefined);
  }

  return (
    <ScreenLayout
      left={
        <div className="flex h-full flex-col gap-5 p-4">
          <ScreenIntro
            title="Implementer Report Capture"
            description="Create an in-app report when needed. Reports already written to the selected repository are observed automatically and do not need import."
            badge={phase}
          />
          <ErrorList errors={[...listErrors, ...errors]} />
          <FieldGroup title="Report Setup">
            <PhaseField
              phase={phase}
              phaseOptions={phaseOptions}
              onPhaseChange={onPhaseChange}
            />
            <Field label="Report Type">
              <select
                className={selectCls}
                value={reportType}
                onChange={(event) =>
                  setReportType(event.target.value as ChampCityImplementerReportType)
                }
              >
                {["Work Card", "Fix", "Repair", "Other"].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>
            <WorkCardSelect
              workCards={workCards}
              selectedFileName={selectedFileName}
              onChange={setSelectedFileName}
              isLoading={isLoading}
              allowEmpty
              emptyLabel="No Work Card association"
            />
            {selectedWorkCard ? <WorkCardSummary card={selectedWorkCard} /> : null}
            <InvalidWorkCardFiles files={invalidFiles} />
            <TextField label="Topic" value={topic} onChange={setTopic} />
          </FieldGroup>
          <FieldGroup title="Report Text">
            <TextAreaField
              label="Implementer Report Markdown"
              value={reportText}
              rows={16}
              onChange={setReportText}
            />
          </FieldGroup>
          {saveResult?.markdownPath ? (
            <Notice type="success">
              Saved Implementer Report at{" "}
              <code className="break-anywhere">{saveResult.markdownPath}</code>
            </Notice>
          ) : null}
          <ActionBar
            onSave={() => void saveReport()}
            saveLabel="Save Implementer Report"
            saveDisabled={isBusy || !previewResult?.validation?.validEnoughToSave}
            statusMessage={statusMessage}
            statusType={errors.length > 0 ? "error" : "success"}
          />
        </div>
      }
      right={
        <ArtifactPanel
          eyebrow="Report"
          title="Evidence Check"
          status={statusMessage}
          filename={previewResult?.savedFileName}
          onSave={() => void saveReport()}
          saveLabel="Save"
          saveDisabled={isBusy || !previewResult?.validation?.validEnoughToSave}
          emptyMessage="Enter report text to see validation signals."
        >
          <div className="grid gap-4">
            {previewResult?.validation ? (
              <>
                <DetectionGrid validation={previewResult.validation} />
                <ImplementerReportWarnings validation={previewResult.validation} />
              </>
            ) : (
              <EmptyState
                message="No report validation result yet."
                icon={<ClipboardList size={22} />}
              />
            )}
          </div>
        </ArtifactPanel>
      }
    />
  );
}

function ProjectWorkspaceBar({
  workspaces,
  pathDraft,
  busy,
  error,
  onPathDraftChange,
  onSelect,
  onRefresh,
  onAdd,
}: {
  workspaces: ProjectWorkspaceListResult | null;
  pathDraft: string;
  busy: boolean;
  error?: string;
  onPathDraftChange: (value: string) => void;
  onSelect: (projectId: string) => void | Promise<void>;
  onRefresh: () => void | Promise<void>;
  onAdd: () => void | Promise<void>;
}) {
  const selected = workspaces?.projects.find((project) => project.selected);
  const scan = selected?.lastScanResult;
  return (
    <div className="shrink-0 border-b border-border bg-card/55 px-4 py-2">
      <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold uppercase tracking-[0.12em] text-muted-foreground/60">
          Active project
        </span>
        <select
          aria-label="Active project"
          value={workspaces?.selectedProjectId ?? ""}
          disabled={busy || !workspaces?.projects.length}
          onChange={(event) => void onSelect(event.target.value)}
          className="min-w-[13rem] rounded border border-border bg-[#0e1218] px-2 py-1 text-foreground"
        >
          {(workspaces?.projects ?? []).map((project) => (
            <option key={project.projectId} value={project.projectId}>
              {project.displayName}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={busy || !selected}
          onClick={() => void onRefresh()}
          className="inline-flex items-center gap-1 rounded border border-primary/30 bg-primary/10 px-2 py-1 text-primary disabled:opacity-50"
        >
          <RefreshCw size={12} className={busy ? "animate-spin" : ""} />
          Refresh Repository State
        </button>
        <input
          aria-label="Repository directory to add"
          value={pathDraft}
          onChange={(event) => onPathDraftChange(event.target.value)}
          placeholder="Repository directory"
          className="min-w-[16rem] flex-1 rounded border border-border bg-white/[0.04] px-2 py-1 text-foreground"
        />
        <button
          type="button"
          disabled={busy || !pathDraft.trim()}
          onClick={() => void onAdd()}
          className="rounded border border-border px-2 py-1 text-foreground/80 disabled:opacity-50"
        >
          Add project
        </button>
      </div>
      <div className="mt-1 flex min-w-0 flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground/60">
        <span className="truncate">{selected?.repositoryRoot ?? "No configured repository"}</span>
        <span>Observer: {selected?.observerStatus ?? "stopped"}</span>
        <span>Branch: {scan?.branch ?? "unavailable"}</span>
        <span>Last scan: {scan?.scannedAt ?? "not scanned"}</span>
        <span>
          Changes: +{scan?.changes.addedArtifactIds.length ?? 0} / ~{scan?.changes.changedArtifactIds.length ?? 0} / -{scan?.changes.removedArtifactIds.length ?? 0}
        </span>
        <span>Blockers: {scan?.blockers.length ?? 0}</span>
        <span>Action: {scan?.currentAction?.actionId ?? "unavailable"}</span>
      </div>
      {error ? <div className="mt-1 text-[10px] text-red-300">{error}</div> : null}
    </div>
  );
}

type ArchitectReviewDraft = Omit<
  ArchitectReviewFormInput,
  | "phase"
  | "workCardFileName"
  | "implementerReportFileName"
  | "routedReviewBinding"
>;

const initialArchitectReviewDraft: ArchitectReviewDraft = {
  decision: undefined,
  workCardCompliance: "",
  changedFilesReviewed: "",
  acceptanceCriteriaAssessment: "",
  validationClaimsAssessment: "",
  skippedChecksAssessment: "",
  observationRegisterImpact: "",
  operatorValidationSteps: "",
  requiredRepair: "",
};

function ArchitectReviewScreen({
  phase,
  phaseOptions,
  onPhaseChange,
  routedReviewBinding,
  routedWorkCardFileName,
  onWorkflowAdvanced,
}: Pick<ScreenProps, "phase" | "phaseOptions" | "onPhaseChange"> & {
  routedReviewBinding?: RoutedArchitectReviewBinding;
  routedWorkCardFileName?: string;
  onWorkflowAdvanced?: (nextScreenId?: string) => void | Promise<void>;
}) {
  const reviewPhase = routedReviewBinding?.phaseId ?? phase;
  const { workCards, invalidFiles, errors: listErrors, isLoading } =
    useWorkCards(reviewPhase);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [implementerReports, setImplementerReports] = useState<
    ChampCityHumanValidationImplementerReportOption[]
  >([]);
  const [selectedImplementerReportFileName, setSelectedImplementerReportFileName] =
    useState("");
  const [implementerReportText, setImplementerReportText] = useState("");
  const [draft, setDraft] = useState<ArchitectReviewDraft>({
    ...initialArchitectReviewDraft,
  });
  const [previewResult, setPreviewResult] =
    useState<ArchitectReviewPreviewResult | null>(null);
  const [saveResult, setSaveResult] =
    useState<ArchitectReviewSaveResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState(
    "Select an Implementer Report to review.",
  );
  const [isBusy, setIsBusy] = useState(false);

  const selectedWorkCardRecord = useMemo(
    () =>
      workCards.find((workCard) => workCard.fileName === selectedFileName) ??
      null,
    [selectedFileName, workCards],
  );
  const selectedWorkCard = selectedWorkCardRecord
    ? toUiWorkCardSummary(selectedWorkCardRecord)
    : null;
  const routedReportFileName =
    routedReviewBinding?.implementerReportFileName ?? "";
  const routedTargetWorkCardFileName = routedWorkCardFileName ?? "";
  const bindingErrors =
    routedReviewBinding?.blockingState.issues.map((issue) => issue.message) ??
    [];
  const hasReviewErrors =
    listErrors.length > 0 || bindingErrors.length > 0 || errors.length > 0;
  const isRepairReview = Boolean(
    (routedReviewBinding?.workCardId ?? selectedWorkCard?.workCardId)?.match(
      /-REPAIR\d+$/i,
    ) || selectedWorkCardRecord?.kind === "repair",
  );
  const isRepairedParentReview =
    routedReviewBinding?.reviewScope === "combined_parent_and_final_repair";
  const selectedRoutedWorkCardMatches = Boolean(
    routedReviewBinding &&
      (selectedWorkCard?.workCardId.toLowerCase() ===
        routedReviewBinding.workCardId.toLowerCase() ||
        (routedTargetWorkCardFileName &&
          selectedFileName === routedTargetWorkCardFileName)),
  );
  const routedBindingActive = Boolean(
    routedReviewBinding &&
      !routedReviewBinding.blockingState.blocked &&
      selectedRoutedWorkCardMatches &&
      selectedImplementerReportFileName === routedReportFileName,
  );

  useEffect(() => {
    if (routedReviewBinding && routedReportFileName) {
      setSelectedImplementerReportFileName(routedReportFileName);
      setStatusMessage(
        isRepairedParentReview
          ? "Combined parent Architect Review is bound from the current action."
          : "Current-action target and Implementer Report are bound for Architect Review.",
      );
    }
  }, [isRepairedParentReview, routedReportFileName, routedReviewBinding]);

  useEffect(() => {
    if (workCards.length === 0) {
      setSelectedFileName(routedTargetWorkCardFileName);
      return;
    }

    const routedFileName = routedReviewBinding
      ? routedTargetWorkCardFileName ||
        findCurrentActionArchitectReviewWorkCardFileName(
            routedReviewBinding,
            workCards,
          )
      : undefined;
    const nextFileName = routedReviewBinding
      ? routedFileName ?? ""
      : workCards.some((workCard) => workCard.fileName === selectedFileName)
        ? selectedFileName
        : workCards[0]?.fileName ?? "";

    if (nextFileName !== selectedFileName) {
      setSelectedFileName(nextFileName);
    }
  }, [
    routedReviewBinding,
    routedTargetWorkCardFileName,
    selectedFileName,
    workCards,
  ]);

  useEffect(() => {
    if (!selectedFileName) {
      setImplementerReports([]);
      setSelectedImplementerReportFileName("");
      setImplementerReportText("");
      return;
    }

    let active = true;
    setIsBusy(true);
    setErrors([]);

    window.champCity
      .listHumanValidationImplementerReports({
        phase: reviewPhase,
        workCardFileName: selectedFileName,
      })
      .then((result) => {
        if (!active) {
          return;
        }

        setIsBusy(false);

        if (!result.ok) {
          setImplementerReports(
            routedReviewBinding && routedReportFileName
              ? [
                  {
                    fileName: routedReportFileName,
                    label: `${routedReportFileName} (current action)`,
                    isDefaultMatch: true,
                  },
                ]
              : [],
          );
          setSelectedImplementerReportFileName(
            routedReviewBinding ? routedReportFileName : "",
          );
          setErrors(
            result.errorMessages ?? ["Implementer Reports could not be loaded."],
          );
          setStatusMessage("Implementer Report association needs attention.");
          return;
        }

        const options = result.options ?? [];
        const routedMatch = options.find(
          (option) =>
            option.fileName.toLowerCase() ===
            routedReportFileName.toLowerCase(),
        );
        const displayedOptions =
          routedReviewBinding && routedReportFileName && !routedMatch
            ? [
                {
                  fileName: routedReportFileName,
                  label: `${routedReportFileName} (current action)`,
                  isDefaultMatch: true,
                },
                ...options,
              ]
            : options;
        const nextReportFileName = routedReviewBinding
          ? routedReportFileName
          : result.defaultFileName || options[0]?.fileName || "";
        const nextStatusMessage = routedReviewBinding
          ? isRepairedParentReview
            ? "Combined parent Architect Review is bound from the current action."
            : "Current-action target and Implementer Report are bound for Architect Review."
          : routedMatch
            ? "Current-action target and Implementer Report are bound for Architect Review."
            : nextReportFileName
              ? "Implementer Report association loaded."
              : "No matching Implementer Report is available.";

        setImplementerReports(displayedOptions);
        setSelectedImplementerReportFileName(nextReportFileName);
        setStatusMessage(nextStatusMessage);

        setErrors([]);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setIsBusy(false);
        setImplementerReports(
          routedReviewBinding && routedReportFileName
            ? [
                {
                  fileName: routedReportFileName,
                  label: `${routedReportFileName} (current action)`,
                  isDefaultMatch: true,
                },
              ]
            : [],
        );
        setSelectedImplementerReportFileName(
          routedReviewBinding ? routedReportFileName : "",
        );
        setErrors(["Implementer Reports could not be loaded."]);
        setStatusMessage("Implementer Report association needs attention.");
      });

    return () => {
      active = false;
    };
  }, [
    reviewPhase,
    isRepairedParentReview,
    routedReportFileName,
    routedReviewBinding,
    selectedFileName,
  ]);

  useEffect(() => {
    if (!selectedImplementerReportFileName) {
      setImplementerReportText("");
      return;
    }

    let active = true;

    window.champCity
      .loadImplementerReportFile({
        phase: reviewPhase,
        fileName: selectedImplementerReportFileName,
      })
      .then((result) => {
        if (!active) {
          return;
        }

        if (!result.ok || !result.content) {
          setImplementerReportText("");
          setErrors(
            result.errorMessages ?? ["The Implementer Report could not be loaded."],
          );
          return;
        }

        setImplementerReportText(result.content);
      })
      .catch(() => {
        if (active) {
          setImplementerReportText("");
          setErrors(["The Implementer Report could not be loaded."]);
        }
      });

    return () => {
      active = false;
    };
  }, [reviewPhase, selectedImplementerReportFileName]);

  const previewInput = useMemo<ArchitectReviewFormInput | null>(() => {
    if (
      !selectedFileName ||
      !selectedImplementerReportFileName ||
      routedReviewBinding?.blockingState.blocked
    ) {
      return null;
    }

    return {
      phase: reviewPhase,
      workCardFileName: selectedFileName,
      implementerReportFileName: selectedImplementerReportFileName,
      ...draft,
      routedReviewBinding,
    };
  }, [
    draft,
    reviewPhase,
    routedReviewBinding,
    selectedImplementerReportFileName,
    selectedFileName,
  ]);

  useEffect(() => {
    if (!previewInput) {
      setPreviewResult(null);
      return;
    }

    let active = true;
    setIsBusy(true);
    setSaveResult(null);

    window.champCity
      .previewArchitectReviewRecord(previewInput)
      .then((result) => {
        if (!active) {
          return;
        }

        setIsBusy(false);
        setPreviewResult(result);

        if (!result.ok) {
          setErrors(
            result.errorMessages ?? ["Architect Review preview could not be generated."],
          );
          setStatusMessage("Architect Review preview needs attention.");
          return;
        }

        setErrors([]);
        setStatusMessage(
          result.validation?.valid
            ? "Architect Review is ready to save."
            : "Complete the Architect assessment before saving.",
        );
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setIsBusy(false);
        setPreviewResult(null);
        setErrors(["Architect Review preview could not be generated."]);
        setStatusMessage("Architect Review preview needs attention.");
      });

    return () => {
      active = false;
    };
  }, [previewInput]);

  function updateDraft<K extends keyof ArchitectReviewDraft>(
    field: K,
    value: ArchitectReviewDraft[K],
  ) {
    setDraft((previous) => ({ ...previous, [field]: value }));
  }

  async function saveReview() {
    if (!previewInput) {
      return;
    }

    setIsBusy(true);
    setErrors([]);

    const result = await window.champCity.saveArchitectReviewRecord(previewInput);

    setIsBusy(false);
    setPreviewResult(result);

    if (!result.ok) {
      setErrors(result.errorMessages ?? ["The Architect Review could not be saved."]);
      setStatusMessage("Architect Review save needs attention.");
      return;
    }

    setSaveResult(result);
    setStatusMessage(
      result.workflowTransition?.toActionId === "operator_validation_required"
        ? "Architect Review saved. Workflow advanced to Operator Validation."
        : "Architect Review saved.",
    );
    await onWorkflowAdvanced?.(result.workflowTransition?.nextScreenId);
  }

  return (
    <ScreenLayout
      left={
        <div className="flex h-full flex-col gap-5 p-4">
          <ScreenIntro
            title={
              isRepairedParentReview
                ? `Combined Architect Review of Parent ${routedReviewBinding?.parentWorkCardId ?? "Work Card"}`
                : isRepairReview
                ? "Architect Review of Repair Implementer Report"
                : "Architect Review of Implementer Report"
            }
            description="Review the existing implementation evidence and create the governed Architect Review output."
            badge={reviewPhase}
          />
          {routedReviewBinding ? (
            <Notice
              type={
                routedReviewBinding.blockingState.blocked
                  ? "error"
                  : routedBindingActive
                    ? "success"
                    : "info"
              }
            >
              <div className="grid gap-1">
                <strong>Bound from current action:</strong>
                <span>
                  {routedReviewBinding.workCardId || "Unresolved target"}
                  {routedReviewBinding.workCardTitle
                    ? ` - ${routedReviewBinding.workCardTitle}`
                    : ""}
                </span>
                <code className="break-anywhere">
                  {routedReviewBinding.implementerReportPath ||
                    "Exact Implementer Report binding unavailable"}
                </code>
                <span>
                  Expected output: {" "}
                  <code className="break-anywhere">
                    {routedReviewBinding.expectedOutputPath ||
                      "not identified"}
                  </code>
                </span>
                <span>
                  Binding source: {routedReviewBinding.bindingSource}
                </span>
                <span>
                  The Reference card is optional navigation context and does not
                  control this routed review.
                </span>
              </div>
            </Notice>
          ) : null}
          {isRepairedParentReview ? (
            <Notice type="warning">
              <div className="grid gap-2">
                <strong>Repaired-parent acceptance review</strong>
                <span>Parent Work Card: {routedReviewBinding?.parentWorkCardId}</span>
                <span>Repair Work Card: {routedReviewBinding?.repairWorkCardId}</span>
                <span>Repair classification: final permitted repair</span>
                <span>
                  Review the combined original and repair implementation. The decision applies to the parent Work Card and may route only the parent to Operator Validation.
                </span>
                <strong>No additional numbered repair is permitted.</strong>
                <ul className="grid gap-1">
                  {routedReviewBinding?.combinedEvidence?.map((item) => (
                    <li key={`${item.artifactId}:${item.revision}`}>
                      {item.artifactType}: {item.title} (revision {item.revision})
                    </li>
                  ))}
                </ul>
              </div>
            </Notice>
          ) : null}
          <ErrorList errors={[...listErrors, ...bindingErrors, ...errors]} />
          <FieldGroup title="Current Action Binding">
            {routedReviewBinding ? (
              <Field label="Routed current-action phase">
                <div className={inputCls}>{reviewPhase}</div>
              </Field>
            ) : (
              <PhaseField
                phase={phase}
                phaseOptions={phaseOptions}
                onPhaseChange={onPhaseChange}
              />
            )}
            <WorkCardSelect
              workCards={workCards}
              selectedFileName={selectedFileName}
              onChange={setSelectedFileName}
              isLoading={isLoading}
              allowEmpty
              disabled={Boolean(routedReviewBinding)}
              label={
                routedReviewBinding
                  ? "Routed current-action Work Card"
                  : "Saved Work Card JSON"
              }
              emptyLabel={
                routedReviewBinding
                  ? "Current-action Work Card unavailable"
                  : "Select Work Card fallback"
              }
            />
            {selectedWorkCard ? <WorkCardSummary card={selectedWorkCard} /> : null}
            <Field label="Associated Implementer Report">
              <select
                className={selectCls}
                value={selectedImplementerReportFileName}
                disabled={Boolean(routedReviewBinding)}
                onChange={(event) =>
                  setSelectedImplementerReportFileName(event.target.value)
                }
              >
                <option value="">Select Implementer Report fallback</option>
                {implementerReports.map((option) => (
                  <option key={option.fileName} value={option.fileName}>
                    {option.fileName === routedReportFileName
                      ? `${option.label} (current action)`
                      : option.isDefaultMatch
                        ? `${option.label} (match)`
                        : option.label}
                  </option>
                ))}
              </select>
            </Field>
            <Notice type="info">
              Review mode: {isRepairedParentReview ? "combined parent and final repair evidence" : `Architect review of ${isRepairReview ? "repair " : ""}Implementer Report`}.
              This workflow does not create or replace an
              Implementer Report. Manual Work Card and report selectors are
              available only when no routed current action controls the review.
            </Notice>
          </FieldGroup>
          <FieldGroup title="Architect Review Assessment">
            <Field label="Decision">
              <select
                className={selectCls}
                value={draft.decision ?? ""}
                onChange={(event) =>
                  updateDraft(
                    "decision",
                    (event.target.value || undefined) as
                      | ArchitectReviewDecision
                      | undefined,
                  )
                }
              >
                <option value="">Select Architect decision</option>
                {architectReviewDecisionValues.map((decision) => (
                  <option key={decision} value={decision}>
                    {decision}
                  </option>
                ))}
              </select>
            </Field>
            <ArchitectReviewTextArea
              label={isRepairedParentReview ? "Is parent WC01 ready for Operator Validation?" : "Work Card Compliance"}
              field="workCardCompliance"
              value={draft.workCardCompliance}
              onChange={updateDraft}
            />
            <ArchitectReviewTextArea
              label={isRepairedParentReview ? "Was superseded authority actually removed?" : "Changed Files Reviewed"}
              field="changedFilesReviewed"
              value={draft.changedFilesReviewed}
              onChange={updateDraft}
            />
            <ArchitectReviewTextArea
              label={isRepairedParentReview ? "Were all parent WC01 requirements revalidated?" : "Acceptance Criteria Assessment"}
              field="acceptanceCriteriaAssessment"
              value={draft.acceptanceCriteriaAssessment}
              onChange={updateDraft}
            />
            <ArchitectReviewTextArea
              label={isRepairedParentReview ? "Did WC01-REPAIR01 correct the identified defects?" : "Validation Claims Assessment"}
              field="validationClaimsAssessment"
              value={draft.validationClaimsAssessment}
              onChange={updateDraft}
            />
            <ArchitectReviewTextArea
              label={isRepairedParentReview ? "Is another repair prohibited?" : "Skipped Checks Assessment"}
              field="skippedChecksAssessment"
              value={draft.skippedChecksAssessment}
              onChange={updateDraft}
            />
            <ArchitectReviewTextArea
              label="Observation Register Impact"
              field="observationRegisterImpact"
              value={draft.observationRegisterImpact}
              onChange={updateDraft}
            />
            <ArchitectReviewTextArea
              label="Operator Validation Steps"
              field="operatorValidationSteps"
              value={draft.operatorValidationSteps}
              onChange={updateDraft}
            />
            <ArchitectReviewTextArea
              label={isRepairedParentReview ? "Residual risks (no additional repair)" : "Required Repair, if any"}
              field="requiredRepair"
              value={draft.requiredRepair}
              onChange={updateDraft}
            />
          </FieldGroup>
          {saveResult?.markdownPath ? (
            <Notice type="success">
              Saved Architect Review at {" "}
              <code className="break-anywhere">{saveResult.markdownPath}</code>
            </Notice>
          ) : null}
          <ActionBar
            onSave={() => void saveReview()}
            saveLabel="Save Architect Review"
            saveDisabled={isBusy || !previewResult?.validation?.valid}
            statusMessage={statusMessage}
            statusType={hasReviewErrors ? "error" : "success"}
          />
          <InvalidWorkCardFiles files={invalidFiles} />
        </div>
      }
      right={
        <ArtifactPanel
          eyebrow="Architect Review"
          title="Architect Review Preview"
          status={statusMessage}
          filename={previewResult?.savedFileName}
          onSave={() => void saveReview()}
          saveLabel="Save Architect Review"
          saveDisabled={isBusy || !previewResult?.validation?.valid}
          emptyMessage="Bind a Work Card and Implementer Report to start review."
        >
          <div className="grid gap-4">
            {previewResult?.validation &&
            previewResult.validation.errors.length > 0 ? (
              <Notice type="info">
                <div className="grid gap-2">
                  <strong>Review completion guidance</strong>
                  <ul className="grid gap-1">
                    {previewResult.validation.errors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                </div>
              </Notice>
            ) : null}
            <MonoBlock className="min-h-[320px]">
              {previewResult?.reviewMarkdown ??
                "No Architect Review preview generated yet."}
            </MonoBlock>
            <details className="rounded-md border border-border bg-white/[0.02] p-3">
              <summary className="cursor-pointer text-sm font-semibold text-foreground">
                Associated Implementer Report: {selectedImplementerReportFileName || "none"}
              </summary>
              <MonoBlock className="mt-3 max-h-[420px]">
                {implementerReportText || "No Implementer Report content loaded."}
              </MonoBlock>
            </details>
          </div>
        </ArtifactPanel>
      }
    />
  );
}

function ArchitectReviewTextArea({
  label,
  field,
  value,
  onChange,
}: {
  label: string;
  field: ArchitectReviewSectionKey;
  value: string;
  onChange: <K extends keyof ArchitectReviewDraft>(
    field: K,
    value: ArchitectReviewDraft[K],
  ) => void;
}) {
  return (
    <TextAreaField
      label={label}
      value={value}
      rows={4}
      onChange={(nextValue) => onChange(field, nextValue)}
    />
  );
}

function CandidateDispositionScreen({
  currentActionResult,
  onSaved,
}: {
  currentActionResult: ChampCityCurrentRequiredActionResult | null;
  onSaved: () => void | Promise<void>;
}) {
  const action = currentActionResult?.currentAction;
  const routedAction = action?.routedAction;
  const [rationale, setRationale] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [savedPath, setSavedPath] = useState<string>();
  const authorized = action?.id === "candidate_disposition_required" &&
    action.responsibleRole === "operator" &&
    routedAction?.expectedOutput.artifactType === "candidate_disposition";

  async function saveDisposition() {
    if (!authorized || !rationale.trim()) return;
    setBusy(true);
    setErrors([]);
    const result = await window.champCity.saveCompletedViaRepairDisposition({ rationale });
    setBusy(false);
    if (!result.ok) {
      setErrors(result.errorMessages ?? ["The parent disposition could not be saved."]);
      return;
    }
    setSavedPath(result.markdownPath);
    await onSaved();
  }

  return (
    <ScreenLayout
      left={
        <div className="flex h-full flex-col gap-5 p-4">
          <ScreenIntro
            title="Completed via Repair Parent Disposition"
            description="Record the durable Operator-approved parent resolution. The next candidate cannot activate until this evidence exists."
            badge={action?.phaseId ?? "governed action"}
          />
          <Notice type="warning">
            <div className="grid gap-1">
              <strong>Candidate: {action?.workCardId ?? "unresolved"}</strong>
              <span>Status to record: completed_via_repair</span>
              <span>This resolves the parent Work Card; it does not independently accept the repair Work Card.</span>
            </div>
          </Notice>
          <ErrorList errors={errors} />
          <FieldGroup title="Required evidence">
            <ul className="grid gap-1">
              {routedAction?.sourceArtifactIds.map((artifactId) => (
                <li key={artifactId}><code className="break-anywhere">{artifactId}</code></li>
              ))}
            </ul>
          </FieldGroup>
          <TextAreaField
            label="Operator rationale"
            value={rationale}
            rows={6}
            onChange={setRationale}
          />
          {savedPath ? <Notice type="success">Saved <code className="break-anywhere">{savedPath}</code></Notice> : null}
          <ActionBar
            onSave={() => void saveDisposition()}
            saveLabel="Record completed_via_repair"
            saveDisabled={busy || !authorized || !rationale.trim()}
            statusMessage={authorized ? "Operator disposition authority verified." : "This screen is not the current governed action."}
            statusType={authorized ? "success" : "error"}
          />
        </div>
      }
      right={
        <ArtifactPanel
          eyebrow="Parent resolution"
          title="Candidate Disposition Preview"
          status={authorized ? "Ready for Operator rationale" : "Not authorized"}
          emptyMessage="No disposition preview."
        >
          <MonoBlock>{`Candidate: ${action?.workCardId ?? "unresolved"}\nStatus: completed_via_repair\nExpected output: ${routedAction?.expectedOutput.artifactId ?? "unresolved"}\n\n${rationale}`}</MonoBlock>
        </ArtifactPanel>
      }
    />
  );
}

function ArchitectBridgeScreen({
  currentActionResult,
  onRefresh,
}: {
  currentActionResult: ChampCityCurrentRequiredActionResult | null;
  onRefresh: () => void | Promise<void>;
}) {
  const action = currentActionResult?.currentAction;
  const [packetResult, setPacketResult] =
    useState<ArchitectTaskPacketSaveResult | null>(null);
  const browserHostRef = useRef<HTMLDivElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const isArchitectAction = action?.responsibleRole === "architect";
  const packet = packetResult?.packet;
  const sourceIds = packet?.payload.data.sourceArtifactIds ??
    action?.routedAction?.sourceArtifactIds ??
    [];
  const expectedOutput = packet?.payload.data.expectedOutput ??
    action?.routedAction?.expectedOutput;
  const prompt = packetResult?.chatGptPrompt ?? "";

  const ensurePacket = useCallback(async () => {
    if (!isArchitectAction) return;
    setBusy(true);
    setErrors([]);
    setCopyMessage("");
    try {
      const result = await window.champCity.ensureArchitectTaskPacket();
      setPacketResult(result);
      if (!result.ok) {
        setErrors(result.errorMessages ?? ["Architect Task Packet could not be generated."]);
      }
    } catch (error) {
      setErrors([
        error instanceof Error
          ? error.message
          : "Architect Task Packet could not be generated.",
      ]);
      setPacketResult(null);
    } finally {
      setBusy(false);
    }
  }, [isArchitectAction]);

  useEffect(() => {
    void ensurePacket();
  }, [ensurePacket]);

  useEffect(() => {
    const host = browserHostRef.current;

    if (!host || !isArchitectAction) {
      void window.champCity.hideArchitectBrowser();
      return;
    }

    const bounds = () => {
      const rect = host.getBoundingClientRect();

      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      };
    };
    const syncBrowser = () => {
      void window.champCity.resizeArchitectBrowser(bounds());
    };

    void window.champCity.showArchitectBrowser(bounds());
    const resizeObserver = new ResizeObserver(syncBrowser);
    resizeObserver.observe(host);
    window.addEventListener("resize", syncBrowser);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", syncBrowser);
      void window.champCity.hideArchitectBrowser();
    };
  }, [isArchitectAction]);

  return (
    <ScreenLayout
      left={
        <div className="flex h-full min-h-0 flex-col gap-4 p-4">
          <ScreenIntro
            title="Architect Bridge"
            description="Generate a canonical Architect Task Packet and use the subscription ChatGPT surface to complete the Architect-owned action."
            badge={action?.id ?? "architect action"}
          />
          {!isArchitectAction ? (
            <Notice type="error">
              This surface is only available for Architect-owned current actions.
            </Notice>
          ) : null}
          <ErrorList errors={errors} />
          <div className="grid gap-3 md:grid-cols-2">
            <FieldGroup title="Current action">
              <MetadataLine label="Action ID" value={action?.id ?? "unresolved"} />
              <MetadataLine label="Responsible role" value="Architect" />
              <MetadataLine
                label="Requested action"
                value={packet?.payload.data.requestedAction ?? "pending packet generation"}
              />
              <MetadataLine
                label="Target artifact"
                value={packet?.payload.data.targetArtifactId ?? action?.routedAction?.targetArtifactId ?? "unresolved"}
              />
            </FieldGroup>
            <FieldGroup title="Expected output">
              <MetadataLine
                label="Artifact ID"
                value={expectedOutput?.artifactId ?? "unresolved"}
              />
              <MetadataLine
                label="Artifact type"
                value={expectedOutput?.artifactType ?? "unresolved"}
              />
              <MetadataLine
                label="Task packet JSON"
                value={packetResult?.jsonPath ?? "pending packet generation"}
              />
              <MetadataLine
                label="Task packet Markdown"
                value={packetResult?.markdownPath ?? "pending packet generation"}
              />
            </FieldGroup>
          </div>
          <FieldGroup title="Source artifacts">
            <ul className="grid max-h-40 gap-1 overflow-auto pr-1">
              {sourceIds.length > 0 ? (
                sourceIds.map((artifactId) => (
                  <li key={artifactId}>
                    <code className="break-anywhere text-xs text-muted-foreground/85">
                      {artifactId}
                    </code>
                  </li>
                ))
              ) : (
                <li className="text-xs text-muted-foreground/65">
                  Source artifacts are pending current-action resolution.
                </li>
              )}
            </ul>
          </FieldGroup>
          <FieldGroup title="Copy-ready ChatGPT prompt">
            <textarea
              className={cn(textareaCls, "min-h-[150px] font-mono text-xs")}
              value={prompt}
              readOnly
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void copyText(prompt, setCopyMessage)}
                disabled={!prompt}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Copy size={14} />
                Copy prompt
              </button>
              <button
                type="button"
                onClick={() => void ensurePacket()}
                disabled={busy || !isArchitectAction}
                className="inline-flex items-center gap-2 rounded-md border border-border bg-white/[0.03] px-3 py-2 text-sm text-foreground transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FileText size={14} />
                Generate packet
              </button>
              <button
                type="button"
                onClick={() => void onRefresh()}
                className="inline-flex items-center gap-2 rounded-md border border-border bg-white/[0.03] px-3 py-2 text-sm text-foreground transition hover:bg-white/[0.06]"
              >
                <RefreshCw size={14} />
                Refresh / recheck
              </button>
            </div>
            {copyMessage ? (
              <p className="mt-2 text-xs text-muted-foreground/70">{copyMessage}</p>
            ) : null}
          </FieldGroup>
          <Notice type="info">
            ChatGPT.com is a subscription-surface Architect Bridge. The browser is not workflow authority and the app does not scrape or automate ChatGPT conversation contents.
          </Notice>
        </div>
      }
      right={
        <div className="flex h-full min-h-0 flex-col border-l border-border bg-card/20">
          <div className="grid min-h-0 flex-1 grid-rows-[minmax(180px,42%)_1fr]">
            <ArtifactPanel
              eyebrow="Canonical bridge artifact"
              title="Architect Task Packet Preview"
              status={packetResult?.ok ? "Generated" : busy ? "Generating" : "Pending"}
              filename={packetResult?.markdownPath}
              emptyMessage="No Architect Task Packet generated yet."
            >
              <MonoBlock className="max-h-full">
                {packetResult?.markdown ?? "Open or generate the Architect Bridge task packet."}
              </MonoBlock>
            </ArtifactPanel>
            <div className="flex min-h-0 flex-col border-t border-border">
              <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-3">
                <div>
                  <div className="text-xs font-semibold text-foreground">
                    Embedded ChatGPT Browser
                  </div>
                  <div className="text-[10px] text-muted-foreground/60">
                    https://chatgpt.com
                  </div>
                </div>
                <span className="rounded border border-primary/20 bg-primary/8 px-2 py-0.5 text-[10px] text-primary">
                  Architect Bridge only
                </span>
              </div>
              <div
                ref={browserHostRef}
                data-testid="architect-browser-surface"
                className="relative min-h-0 flex-1 overflow-hidden bg-[#f7f7f8]"
              >
                <div className="pointer-events-none absolute inset-0 grid place-items-center text-xs text-slate-500">
                  Loading ChatGPT.com...
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    />
  );
}

function MetadataLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/45">
        {label}
      </div>
      <code className="break-anywhere text-xs leading-relaxed text-foreground/80">
        {value}
      </code>
    </div>
  );
}

function HumanValidationScreen({
  phase,
  phaseOptions,
  activeCard,
  onPhaseChange,
  onActiveCardChange,
  routedTargetId,
  routedEvidenceArtifactIds,
  drafts,
  selectedTargetFileName,
  onSelectedTargetFileNameChange,
  onDraftChange,
}: ScreenProps & {
  drafts: HumanValidationDraftCache;
  selectedTargetFileName: string;
  routedTargetId?: string;
  routedEvidenceArtifactIds?: string[];
  onSelectedTargetFileNameChange: (fileName: string) => void;
  onDraftChange: (
    targetFileName: string,
    updateDraft: (draft: HumanValidationDraft) => HumanValidationDraft,
  ) => void;
}) {
  const { targets, invalidFiles, errors: listErrors, isLoading } =
    useValidationTargets(phase);
  const {
    statuses: validationStatuses,
    errors: validationStatusErrors,
    isLoading: isValidationStatusLoading,
    reload: reloadValidationStatuses,
  } = useValidationStatuses(phase);
  const selectedFileName =
    selectedTargetFileName ||
    (activeCard?.phase === phase ? activeCard.fileName ?? "" : "");
  const lastAlignedRouteKey = useRef("");
  const [implementerReports, setImplementerReports] = useState<
    ChampCityHumanValidationImplementerReportOption[]
  >([]);
  const [invalidImplementerReports, setInvalidImplementerReports] = useState<
    ChampCityInvalidHumanValidationImplementerReportFile[]
  >([]);
  const [selectedImplementerReportFileName, setSelectedImplementerReportFileName] =
    useState("");
  const form = readHumanValidationDraft(
    drafts,
    phase,
    selectedFileName,
    initialHumanValidationForm,
  );
  const [previewResult, setPreviewResult] =
    useState<ChampCityHumanValidationPreviewResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState(
    "Select a Validation Target to validate.",
  );
  const [isBusy, setIsBusy] = useState(false);
  const [saveResult, setSaveResult] =
    useState<ChampCityHumanValidationSaveResult | null>(null);
  const repairedParentValidation = Boolean(
    routedTargetId &&
      routedEvidenceArtifactIds?.some((artifactId) => /\/work_card\/[^/]+-REPAIR\d+$/i.test(artifactId)) &&
      routedEvidenceArtifactIds?.some((artifactId) => /\/implementer_report\/[^/]+-REPAIR\d+/i.test(artifactId)),
  );
  const routedRepairId = routedEvidenceArtifactIds
    ?.map((artifactId) => artifactId.match(/\/work_card\/([^/]+-REPAIR\d+)$/i)?.[1])
    .find(Boolean);

  const selectedValidationTarget =
    targets.find((target) => target.fileName === selectedFileName) ?? null;
  const selectedTargetSummary = useMemo(
    () =>
      selectedValidationTarget
        ? toUiValidationTargetSummary(selectedValidationTarget)
        : null,
    [selectedValidationTarget],
  );
  const validationStatusByTargetFileName = useMemo(
    () =>
      new Map(
        validationStatuses.map((status) => [
          status.validationTargetFileName,
          status,
        ]),
      ),
    [validationStatuses],
  );
  const selectedValidationStatus = selectedValidationTarget
    ? validationStatusByTargetFileName.get(selectedValidationTarget.fileName) ??
      null
    : null;

  useEffect(() => {
    if (selectedTargetSummary) {
      onActiveCardChange(selectedTargetSummary);
      return;
    }

    if (selectedFileName.trim().length === 0 || targets.length > 0) {
      onActiveCardChange(null);
    }
  }, [onActiveCardChange, selectedFileName, selectedTargetSummary, targets.length]);

  useEffect(() => {
    if (targets.length === 0) {
      return;
    }

    const headerSelectedFileName =
      activeCard?.phase === phase ? activeCard.fileName ?? "" : "";
    const currentSelection = selectedTargetFileName || headerSelectedFileName;
    const routeKey = routedTargetId
      ? `${phase}::${routedTargetId.trim().toLowerCase()}`
      : "";
    const routedTargetExists = Boolean(
      routedTargetId &&
        targets.some(
          (target) =>
            target.id.trim().toLowerCase() ===
            routedTargetId.trim().toLowerCase(),
        ),
    );
    const shouldAlignRoutedTarget = Boolean(
      routeKey &&
        routedTargetExists &&
        lastAlignedRouteKey.current !== routeKey,
    );
    const nextFileName = resolveValidationTargetFileName(
      targets,
      currentSelection,
      routedTargetId,
      shouldAlignRoutedTarget,
    );

    if (shouldAlignRoutedTarget) {
      lastAlignedRouteKey.current = routeKey;
    } else if (!routeKey) {
      lastAlignedRouteKey.current = "";
    }

    if (nextFileName !== selectedTargetFileName) {
      onSelectedTargetFileNameChange(nextFileName);
    }
  }, [
    activeCard?.fileName,
    activeCard?.phase,
    onSelectedTargetFileNameChange,
    phase,
    routedTargetId,
    selectedTargetFileName,
    targets,
  ]);

  useEffect(() => {
    if (selectedFileName.trim().length === 0) {
      setImplementerReports([]);
      setInvalidImplementerReports([]);
      setSelectedImplementerReportFileName("");
      return;
    }

    let active = true;

    setIsBusy(true);
    setErrors([]);

    window.champCity
      .listHumanValidationImplementerReports({
        phase,
        workCardFileName:
          selectedValidationTarget?.sourceJsonFile ?? selectedFileName,
        validationTargetFileName: selectedFileName,
      })
      .then((result) => {
        if (!active) {
          return;
        }

        setIsBusy(false);

        if (!result.ok) {
          setImplementerReports([]);
          setInvalidImplementerReports([]);
          setSelectedImplementerReportFileName("");
          setErrors(result.errorMessages ?? ["Implementer Reports could not be loaded."]);
          setStatusMessage("Implementer Reports need attention.");
          return;
        }

        const options = result.options ?? [];
        setImplementerReports(options);
        setInvalidImplementerReports(result.invalidFiles ?? []);
        setSelectedImplementerReportFileName(result.defaultFileName ?? "");
        setStatusMessage("Validation source loaded.");
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setIsBusy(false);
        setImplementerReports([]);
        setInvalidImplementerReports([]);
        setSelectedImplementerReportFileName("");
        setErrors(["Implementer Reports could not be loaded."]);
        setStatusMessage("Implementer Reports need attention.");
      });

    return () => {
      active = false;
    };
  }, [phase, selectedFileName, selectedValidationTarget]);

  const validationInput = useMemo<ChampCityHumanValidationFormInput | null>(() => {
    if (!selectedValidationTarget || selectedFileName.trim().length === 0) {
      return null;
    }

    return {
      phase,
      workCardFileName: selectedValidationTarget.sourceJsonFile,
      validationTargetFileName: selectedFileName,
      implementerReportFileName:
        selectedImplementerReportFileName.trim().length > 0
          ? selectedImplementerReportFileName
          : undefined,
      ...form,
    };
  }, [
    phase,
    selectedFileName,
    selectedValidationTarget,
    selectedImplementerReportFileName,
    form,
  ]);

  useEffect(() => {
    if (!validationInput) {
      setPreviewResult(null);
      setStatusMessage(
        isLoading
          ? "Loading Validation Targets."
          : "Select a Validation Target to validate.",
      );
      return;
    }

    let active = true;

    setIsBusy(true);
    setErrors([]);
    setSaveResult(null);

    window.champCity
      .previewHumanValidationRecord(validationInput)
      .then((result) => {
        if (!active) {
          return;
        }

        setIsBusy(false);
        setPreviewResult(result);

        if (!result.ok) {
          setErrors(result.errorMessages ?? ["Validation preview could not be generated."]);
          setStatusMessage("Validation preview needs attention.");
          return;
        }

        setStatusMessage(
          result.shouldGenerateRepairPrompt
            ? "Architect disposition requires repair. Repair prompt will be saved."
            : "Validation preview generated. Architect disposition is pending.",
        );
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setIsBusy(false);
        setPreviewResult(null);
        setErrors(["Validation preview could not be generated."]);
        setStatusMessage("Validation preview needs attention.");
      });

    return () => {
      active = false;
    };
  }, [validationInput, isLoading]);

  function updateForm<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    if (!selectedFileName) {
      return;
    }

    onDraftChange(selectedFileName, (previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function attachEvidenceFile(file: File, successMessage: string) {
    if (!selectedFileName) {
      setErrors(["Select a Validation Target before attaching evidence."]);
      return;
    }

    if (!/\.(png|jpe?g|webp|gif|txt|md)$/i.test(file.name)) {
      setErrors(["Attach a .png, .jpg, .jpeg, .webp, .gif, .txt, or .md file."]);
      return;
    }

    setIsBusy(true);
    setErrors([]);

    try {
      const content = await file.arrayBuffer();
      const result = await window.champCity.attachValidationEvidenceFile({
        phase,
        workCardFileName:
          selectedValidationTarget?.sourceJsonFile ?? selectedFileName,
        validationTargetFileName: selectedFileName,
        fileName: file.name,
        content,
      });

      setIsBusy(false);

      if (!result.ok || !result.savedRelativePath) {
        setErrors(
          result.errorMessages ?? ["The evidence file could not be attached."],
        );
        setStatusMessage("Evidence import needs attention.");
        return;
      }

      onDraftChange(selectedFileName, (previous) => ({
        ...previous,
        screenshotOrFileReferences: appendLine(
          previous.screenshotOrFileReferences,
          result.savedRelativePath as string,
        ),
      }));
      setStatusMessage(successMessage);
    } catch {
      setIsBusy(false);
      setErrors(["The evidence file could not be attached."]);
      setStatusMessage("Evidence import needs attention.");
    }
  }

  async function importEvidenceFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (file) {
      await attachEvidenceFile(file, "Evidence file attached.");
    }

    event.target.value = "";
  }

  async function pasteScreenshotEvidence(
    event: ReactClipboardEvent<HTMLElement>,
  ) {
    const clipboardImage =
      Array.from(event.clipboardData.files).find((file) =>
        file.type.startsWith("image/"),
      ) ??
      Array.from(event.clipboardData.items)
        .find((item) => item.type.startsWith("image/"))
        ?.getAsFile();

    if (!clipboardImage) {
      return;
    }

    event.preventDefault();

    const extension = clipboardImage.type.split("/")[1]?.replace("jpeg", "jpg") || "png";
    const hasSupportedExtension = /\.(png|jpe?g|webp|gif)$/i.test(
      clipboardImage.name,
    );
    const file = hasSupportedExtension
      ? clipboardImage
      : new File([clipboardImage], `pasted-screenshot.${extension}`, {
          type: clipboardImage.type,
        });

    await attachEvidenceFile(file, "Pasted screenshot attached.");
  }

  async function saveValidation() {
    if (!validationInput) {
      setErrors(["Select a Validation Target before saving validation."]);
      return;
    }

    setIsBusy(true);
    setErrors([]);

    const result = await window.champCity.saveHumanValidationRecord(validationInput);

    setPreviewResult(result);

    if (!result.ok) {
      setIsBusy(false);
      setErrors(result.errorMessages ?? ["The validation record could not be saved."]);
      setStatusMessage("Save needs attention.");
      return;
    }

    setSaveResult(result);
    await reloadValidationStatuses();
    setIsBusy(false);
    setStatusMessage("Human validation saved.");
  }

  return (
    <ScreenLayout
      left={
        <div className="flex h-full flex-col gap-5 p-4">
          <ScreenIntro
            title={repairedParentValidation ? "Operator Validation of Repaired Parent Work Card" : "Human Validation"}
            description="Record what the Operator tested and generate a narrow repair prompt only when needed."
            badge={phase}
          />
          {repairedParentValidation ? (
            <Notice type="warning">
              <div className="grid gap-2">
                <strong>Parent Work Card: {routedTargetId}</strong>
                <span>Resolution path: completed via {routedRepairId}</span>
                <span>The Validation Report must identify the parent Work Card, not the repair as an independent product outcome.</span>
                <strong>Combined implementation scope and exact manual validation</strong>
                <ul className="grid gap-1">
                  <li>Confirm repository refresh detects external reports without import.</li>
                  <li>Confirm project switching preserves strict repository isolation.</li>
                  <li>Confirm stale cached state cannot override verified repository evidence.</li>
                  <li>Confirm Current Action routes the parent review and validation targets exactly.</li>
                  <li>Confirm legacy CurrentRequiredAction and snapshot authority remain removed.</li>
                </ul>
              </div>
            </Notice>
          ) : null}
          <ErrorList
            errors={[...listErrors, ...validationStatusErrors, ...errors]}
          />
          <FieldGroup title="Source">
            <PhaseField
              phase={phase}
              phaseOptions={phaseOptions}
              onPhaseChange={onPhaseChange}
            />
            <ValidationTargetSelect
              targets={targets}
              validationStatusByTargetFileName={
                validationStatusByTargetFileName
              }
              selectedFileName={selectedFileName}
              onChange={onSelectedTargetFileNameChange}
              isLoading={isLoading}
            />
            {selectedValidationTarget ? (
              <>
                <ValidationTargetSummaryView target={selectedValidationTarget} />
                <ValidationStatusCard
                  status={selectedValidationStatus}
                  isLoading={isValidationStatusLoading}
                />
              </>
            ) : null}
            <InvalidValidationTargetFiles files={invalidFiles} />
            <Field label="Associated Implementer Report">
              <select
                className={selectCls}
                value={selectedImplementerReportFileName}
                onChange={(event) =>
                  setSelectedImplementerReportFileName(event.target.value)
                }
              >
                <option value="">No Implementer Report selected</option>
                {implementerReports.map((option) => (
                  <option key={option.fileName} value={option.fileName}>
                    {option.isDefaultMatch
                      ? `${option.label} (match)`
                      : option.label}
                  </option>
                ))}
              </select>
            </Field>
            {invalidImplementerReports.length > 0 ? (
              <Notice type="warning">
                <ul className="grid gap-1">
                  {invalidImplementerReports.map((file) => (
                    <li key={file.fileName}>
                      {file.fileName}: {file.errorMessages.join(" ")}
                    </li>
                  ))}
                </ul>
              </Notice>
            ) : null}
            {previewResult?.implementerReportWarning ? (
              <Notice type="warning">{previewResult.implementerReportWarning}</Notice>
            ) : null}
          </FieldGroup>
          {saveResult?.validationJsonPath ? (
            <Notice type="success">
              <div className="grid gap-1">
                <span>Saved validation artifacts.</span>
                <code className="break-anywhere">
                  {saveResult.validationJsonPath}
                </code>
                {saveResult.validationMarkdownPath ? (
                  <code className="break-anywhere">
                    {saveResult.validationMarkdownPath}
                  </code>
                ) : null}
                {saveResult.repairPromptPath ? (
                  <code className="break-anywhere">
                    {saveResult.repairPromptPath}
                  </code>
                ) : null}
              </div>
            </Notice>
          ) : null}
          <ActionBar
            onSave={() => void saveValidation()}
            saveLabel="Save Validation"
            saveDisabled={!validationInput || isBusy}
            statusMessage={statusMessage}
            statusType={errors.length > 0 ? "error" : "success"}
          />
        </div>
      }
      right={
        <ArtifactPanel
          eyebrow="Validate"
          title="Operator Record"
          status={statusMessage}
          filename={previewResult?.savedValidationMarkdownFileName}
          emptyMessage="Select a Validation Target to preview validation."
        >
          <div className="grid gap-4">
            <FieldRow>
              <Field label="Validation result">
                <select
                  className={selectCls}
                  value={form.validationResult}
                  onChange={(event) =>
                    updateForm(
                      "validationResult",
                      event.target.value as ChampCityHumanValidationResult,
                    )
                  }
                >
                  {[
                    "Pass",
                    "Pass with concerns",
                    "Partial",
                    "Fail",
                    "Not tested",
                    "Blocked",
                  ].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Architect disposition">
                <div className="rounded-md border border-border bg-white/[0.03] px-3 py-2 text-xs text-muted-foreground">
                  Pending Architect review
                </div>
              </Field>
            </FieldRow>
            <Notice type="info">
              Use <strong>Concern</strong> for a non-blocking item-level issue and
              <strong> Fail</strong> only when an acceptance criterion was not
              satisfied enough to pass. The Architect decides merge, repair,
              deferral, and backlog disposition after reviewing this evidence.
            </Notice>
            <TextAreaField
              label="What was tested?"
              value={form.testedItems}
              rows={2}
              onChange={(value) => updateForm("testedItems", value)}
            />
            <FieldRow>
              <TextAreaField
                label="What passed?"
                value={form.passedItems}
                rows={3}
                onChange={(value) => updateForm("passedItems", value)}
              />
              <TextAreaField
                label="What failed?"
                value={form.failedItems}
                rows={3}
                onChange={(value) => updateForm("failedItems", value)}
              />
            </FieldRow>
            <FieldRow>
              <TextAreaField
                label="Evidence references or paths"
                value={form.evidenceReferences}
                rows={2}
                onChange={(value) => updateForm("evidenceReferences", value)}
              />
              <Field label="Screenshots or files by path">
                <div
                  className="grid gap-2 rounded-md focus:outline-none focus:ring-1 focus:ring-primary/40"
                  tabIndex={0}
                  title="Focus this evidence area and press Ctrl+V to paste a screenshot."
                  onPaste={(event) => void pasteScreenshotEvidence(event)}
                >
                  {evidenceAttachmentPaths(form.screenshotOrFileReferences).length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 max-[720px]:grid-cols-1">
                      {evidenceAttachmentPaths(form.screenshotOrFileReferences).map(
                        (filePath) => (
                          <div
                            key={filePath}
                            title={filePath}
                            className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-white/[0.03] px-2.5 py-2"
                          >
                            <FileText size={14} className="shrink-0 text-primary/70" />
                            <span className="truncate text-[11px] text-foreground/80">
                              {evidenceAttachmentFileName(filePath)}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  ) : (
                    <span className="text-[11px] text-muted-foreground/55">
                      No screenshot evidence attached.
                    </span>
                  )}
                  <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-white/[0.03] px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground">
                    <Upload size={13} />
                    <span>Attach or paste screenshot</span>
                    <input
                      className="sr-only"
                      type="file"
                      accept=".png,.jpg,.jpeg,.webp,.gif,.txt,.md,image/png,image/jpeg,image/webp,image/gif,text/plain,text/markdown"
                      onChange={(event) => void importEvidenceFile(event)}
                    />
                  </label>
                  <details className="rounded-md border border-border bg-black/10 px-3 py-2 text-[11px] text-muted-foreground/65">
                    <summary className="cursor-pointer font-medium text-foreground/70">
                      Add or edit repo-relative paths
                    </summary>
                    <textarea
                      className={cn(textareaCls, "mt-2 break-anywhere")}
                      value={form.screenshotOrFileReferences}
                      rows={2}
                      placeholder="Paste an image or enter a repo-relative evidence path."
                      onChange={(event) =>
                        updateForm(
                          "screenshotOrFileReferences",
                          event.target.value,
                        )
                      }
                    />
                  </details>
                </div>
              </Field>
            </FieldRow>
            <FieldRow>
              <TextAreaField
                label="Manual commands run"
                value={form.commandsRun}
                rows={2}
                onChange={(value) => updateForm("commandsRun", value)}
              />
              <TextAreaField
                label="Observed errors"
                value={form.observedErrors}
                rows={2}
                onChange={(value) => updateForm("observedErrors", value)}
              />
            </FieldRow>
            <TextAreaField
              label="Additional Operator observations"
              value={form.additionalOperatorObservations}
              rows={2}
              onChange={(value) =>
                updateForm("additionalOperatorObservations", value)
              }
            />
            <TextAreaField
              label="Operator suggested follow-up (advisory)"
              value={form.recommendedNextAction}
              rows={2}
              onChange={(value) => updateForm("recommendedNextAction", value)}
            />
            <ManualChecklist previewResult={previewResult} />
            <RepairPromptState previewResult={previewResult} />
            <FieldGroup title="Validation Preview">
              <MonoBlock className="max-h-52">
                {previewResult?.validationMarkdown ??
                  "No validation preview generated yet."}
              </MonoBlock>
            </FieldGroup>
          </div>
        </ArtifactPanel>
      }
    />
  );
}

function PhaseCloseoutScreen({
  phase,
  phaseOptions,
  onPhaseChange,
}: {
  phase: string;
  phaseOptions: string[];
  onPhaseChange: (phase: string) => void;
}) {
  const [form, setForm] = useState<ChampCityPhaseCloseoutFormInput>({
    ...initialPhaseCloseoutForm,
    phase,
  });
  const [summaryResult, setSummaryResult] =
    useState<ChampCityPhaseCloseoutSummaryResult | null>(null);
  const [previewResult, setPreviewResult] =
    useState<ChampCityPhaseCloseoutPreviewResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState("Loading phase artifact summary.");
  const [isBusy, setIsBusy] = useState(false);
  const [saveResult, setSaveResult] =
    useState<ChampCityPhaseCloseoutSaveResult | null>(null);

  useEffect(() => {
    setForm((previous) =>
      previous.phase === phase ? previous : { ...previous, phase },
    );
  }, [phase]);

  useEffect(() => {
    let active = true;

    setIsBusy(true);
    setErrors([]);

    window.champCity
      .getPhaseCloseoutSummary(phase)
      .then((result) => {
        if (!active) {
          return;
        }

        setSummaryResult(result);
        setIsBusy(false);

        if (!result.ok) {
          setErrors(result.errorMessages ?? ["Phase artifact summary could not be loaded."]);
          setStatusMessage("Phase summary needs attention.");
          return;
        }

        setStatusMessage("Phase artifact summary loaded.");
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setSummaryResult(null);
        setIsBusy(false);
        setErrors(["Phase artifact summary could not be loaded."]);
        setStatusMessage("Phase summary needs attention.");
      });

    return () => {
      active = false;
    };
  }, [phase]);

  useEffect(() => {
    let active = true;

    setIsBusy(true);
    setErrors([]);
    setSaveResult(null);

    window.champCity
      .previewPhaseCloseoutRecord(form)
      .then((result) => {
        if (!active) {
          return;
        }

        setIsBusy(false);
        setPreviewResult(result);

        if (!result.ok) {
          setErrors(result.errorMessages ?? ["Closeout preview could not be generated."]);
          setStatusMessage("Closeout preview needs attention.");
          return;
        }

        setStatusMessage("Closeout preview refreshed.");
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setIsBusy(false);
        setPreviewResult(null);
        setErrors(["Closeout preview could not be generated."]);
        setStatusMessage("Closeout preview needs attention.");
      });

    return () => {
      active = false;
    };
  }, [form]);

  function updateField<K extends keyof ChampCityPhaseCloseoutFormInput>(
    field: K,
    value: ChampCityPhaseCloseoutFormInput[K],
  ) {
    if (field === "phase") {
      onPhaseChange(String(value));
    }

    setForm((previous) => ({ ...previous, [field]: value }));
  }

  async function saveCloseout() {
    setIsBusy(true);
    setErrors([]);

    const result = await window.champCity.savePhaseCloseoutRecord(form);

    setIsBusy(false);
    setPreviewResult(result);

    if (!result.ok) {
      setErrors(result.errorMessages ?? ["The closeout record could not be saved."]);
      setStatusMessage("Save needs attention.");
      return;
    }

    setSaveResult(result);
    setStatusMessage("Phase Closeout saved.");
  }

  const summary = previewResult?.summary ?? summaryResult?.summary;

  return (
    <ScreenLayout
      left={
        <div className="flex h-full flex-col gap-5 p-4">
          <ScreenIntro
            title="Phase Closeout"
            description="Review phase artifacts and record non-mutating closeout and next-phase activation decisions."
            badge={phase}
          />
          <ErrorList errors={errors} />
          <FieldGroup title="Phase">
            <PhaseField
              phase={phase}
              phaseOptions={phaseOptions}
              onPhaseChange={onPhaseChange}
            />
            {summary ? <PhaseArtifactSummaryView summary={summary} compact /> : null}
          </FieldGroup>
          {saveResult?.jsonPath ? (
            <Notice type="success">
              <div className="grid gap-1">
                <span>Saved closeout artifacts.</span>
                <code className="break-anywhere">{saveResult.jsonPath}</code>
                {saveResult.markdownPath ? (
                  <code className="break-anywhere">{saveResult.markdownPath}</code>
                ) : null}
              </div>
            </Notice>
          ) : null}
          <ActionBar
            onSave={() => void saveCloseout()}
            saveLabel="Save Closeout"
            saveDisabled={isBusy}
            statusMessage={statusMessage}
            statusType={errors.length > 0 ? "error" : "success"}
          />
        </div>
      }
      right={
        <ArtifactPanel
          eyebrow="Closeout"
          title="Decision Record"
          status={statusMessage}
          filename={previewResult?.savedMarkdownFileName}
          onSave={() => void saveCloseout()}
          saveLabel="Save"
          saveDisabled={isBusy}
          emptyMessage="Loading phase closeout preview."
        >
          <div className="grid gap-5">
            {summary ? <PhaseArtifactSummaryView summary={summary} /> : null}
            {summary?.deterministicRecommendation ? (
              <Notice type="info">{summary.deterministicRecommendation}</Notice>
            ) : null}
            <FieldGroup title="Decision">
              <Field label="Closeout decision">
                <select
                  className={selectCls}
                  value={form.decision}
                  onChange={(event) =>
                    updateField(
                      "decision",
                      event.target.value as ChampCityPhaseCloseoutDecision,
                    )
                  }
                >
                  {[
                    "Close phase",
                    "Continue phase",
                    "Needs repair",
                    "Needs UI cleanup",
                    "Ready for release/package pass",
                    "Ready for next phase",
                  ].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Next phase activation decision">
                <select
                  className={selectCls}
                  value={form.nextPhaseActivationDecision}
                  onChange={(event) =>
                    updateField(
                      "nextPhaseActivationDecision",
                      event.target
                        .value as ChampCityNextPhaseActivationDecision,
                    )
                  }
                >
                  {nextPhaseActivationDecisionOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>
              <TextAreaField
                label="Next phase activation notes"
                value={form.nextPhaseActivationNotes}
                rows={2}
                onChange={(value) =>
                  updateField("nextPhaseActivationNotes", value)
                }
              />
              <TextAreaField
                label="Closeout summary"
                value={form.closeoutSummary}
                rows={2}
                onChange={(value) => updateField("closeoutSummary", value)}
              />
              <FieldRow>
                <TextAreaField
                  label="What was completed?"
                  value={form.completedItems}
                  rows={2}
                  onChange={(value) => updateField("completedItems", value)}
                />
                <TextAreaField
                  label="What remains?"
                  value={form.remainingItems}
                  rows={2}
                  onChange={(value) => updateField("remainingItems", value)}
                />
              </FieldRow>
              <FieldRow>
                <TextAreaField
                  label="Known risks"
                  value={form.knownRisks}
                  rows={2}
                  onChange={(value) => updateField("knownRisks", value)}
                />
                <TextAreaField
                  label="Operator notes"
                  value={form.operatorNotes}
                  rows={2}
                  onChange={(value) => updateField("operatorNotes", value)}
                />
              </FieldRow>
              <TextAreaField
                label="Recommended next action"
                value={form.recommendedNextAction}
                rows={2}
                onChange={(value) => updateField("recommendedNextAction", value)}
              />
            </FieldGroup>
            <FieldGroup title="Closeout Preview">
              <MonoBlock className="max-h-64">
                {previewResult?.markdown ?? "No closeout preview generated yet."}
              </MonoBlock>
            </FieldGroup>
          </div>
        </ArtifactPanel>
      }
    />
  );
}

interface ScreenProps {
  phase: string;
  phaseOptions: string[];
  activeCard?: UiWorkCardSummary | null;
  onPhaseChange: (phase: string) => void;
  onActiveCardChange: (card: UiWorkCardSummary | null) => void;
}

function ScreenLayout({
  left,
  right,
}: {
  left: ReactNode;
  right: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 overflow-hidden max-[900px]:flex-col">
      <div className="w-[390px] shrink-0 overflow-y-auto border-r border-border bg-card max-[900px]:h-[46vh] max-[900px]:w-full max-[900px]:border-b max-[900px]:border-r-0">
        {left}
      </div>
      <div className="min-w-0 flex-1 overflow-y-auto bg-background">{right}</div>
    </div>
  );
}

function ScreenIntro({
  title,
  description,
  badge,
}: {
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="break-anywhere text-sm font-semibold text-foreground">
          {title}
        </h1>
        <p className="mt-1 break-anywhere text-xs leading-snug text-muted-foreground/65">
          {description}
        </p>
      </div>
      {badge ? (
        <Badge className="shrink-0 border-border bg-white/[0.03] text-[9px] text-muted-foreground/70">
          {badge}
        </Badge>
      ) : null}
    </div>
  );
}

function ArtifactPanel({
  eyebrow,
  title,
  status,
  filename,
  onCopy,
  onSave,
  copyLabel = "Copy",
  saveLabel = "Save",
  copyDisabled,
  saveDisabled,
  children,
  emptyMessage,
}: {
  eyebrow?: string;
  title: string;
  status?: string;
  filename?: string;
  onCopy?: () => void;
  onSave?: () => void;
  copyLabel?: string;
  saveLabel?: string;
  copyDisabled?: boolean;
  saveDisabled?: boolean;
  children?: ReactNode;
  emptyMessage?: string;
}) {
  return (
    <div className="flex min-h-full flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3 max-[640px]:flex-col">
        <div className="min-w-0">
          {eyebrow ? (
            <div className="mb-1 text-[9px] font-bold uppercase tracking-[0.14em] text-primary/60">
              {eyebrow}
            </div>
          ) : null}
          <h2 className="break-anywhere text-sm font-semibold leading-tight text-foreground">
            {title}
          </h2>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {status ? (
            <span className="max-w-[280px] break-anywhere rounded border border-border bg-white/[0.03] px-2 py-1 text-[10px] text-muted-foreground/65">
              {status}
            </span>
          ) : null}
          {onCopy ? (
            <IconButton
              icon={Copy}
              label={copyLabel}
              onClick={onCopy}
              disabled={copyDisabled}
            />
          ) : null}
          {onSave ? (
            <IconButton
              icon={Save}
              label={saveLabel}
              onClick={onSave}
              disabled={saveDisabled}
              primary
            />
          ) : null}
        </div>
      </div>
      {filename ? <FilenameDisplay filename={filename} /> : null}
      <div className="min-w-0 flex-1">
        {children ?? (
          <EmptyState
            message={emptyMessage ?? "Nothing to preview yet."}
            icon={<FolderOpen size={22} />}
          />
        )}
      </div>
    </div>
  );
}

function ActionBar({
  onPreview,
  onSave,
  onCopy,
  previewLabel = "Preview",
  saveLabel = "Save",
  copyLabel = "Copy",
  saveDisabled,
  copyDisabled,
  statusMessage,
  statusType = "success",
}: {
  onPreview?: () => void;
  onSave?: () => void;
  onCopy?: () => void;
  previewLabel?: string;
  saveLabel?: string;
  copyLabel?: string;
  saveDisabled?: boolean;
  copyDisabled?: boolean;
  statusMessage?: string;
  statusType?: "success" | "error";
}) {
  return (
    <div className="sticky bottom-0 mt-auto flex flex-wrap items-start justify-between gap-2 border-t border-white/[0.05] bg-card/95 pt-3">
      <div className="min-h-[20px] min-w-[14rem] flex-1 basis-64">
        {statusMessage ? (
          <span
            className={cn(
              "inline-flex max-w-full items-start gap-1.5 whitespace-normal break-words text-[11px] font-medium leading-snug",
              statusType === "success" ? "text-emerald-400" : "text-red-400",
            )}
          >
            {statusType === "success" ? (
              <CheckCircle size={11} className="shrink-0" />
            ) : (
              <X size={11} className="shrink-0" />
            )}
            {statusMessage}
          </span>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
        {onPreview ? (
          <IconButton icon={Eye} label={previewLabel} onClick={onPreview} />
        ) : null}
        {onCopy ? (
          <IconButton
            icon={Copy}
            label={copyLabel}
            onClick={onCopy}
            disabled={copyDisabled}
          />
        ) : null}
        {onSave ? (
          <IconButton
            icon={Save}
            label={saveLabel}
            onClick={onSave}
            disabled={saveDisabled}
            primary
          />
        ) : null}
      </div>
    </div>
  );
}

function IconButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  primary,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-8 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40",
        primary
          ? "bg-primary text-primary-foreground hover:bg-primary/85"
          : "border border-border text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
      )}
    >
      <Icon size={12} className="shrink-0" />
      <span>{label}</span>
    </button>
  );
}

function Badge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide",
        className,
      )}
    >
      {children}
    </span>
  );
}

function ValidationStatusPill({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold leading-none tracking-wide",
        className,
      )}
    >
      {children}
    </span>
  );
}

function Notice({
  type,
  children,
}: {
  type: NoticeType;
  children: ReactNode;
}) {
  const styles: Record<NoticeType, string> = {
    warning: "border-amber-500/25 bg-amber-500/10 text-amber-100/90",
    error: "border-red-500/25 bg-red-500/10 text-red-100/90",
    info: "border-blue-500/25 bg-blue-500/10 text-blue-100/90",
    success: "border-emerald-500/25 bg-emerald-500/10 text-emerald-100/90",
  };
  const icons: Record<NoticeType, LucideIcon> = {
    warning: AlertTriangle,
    error: X,
    info: Info,
    success: CheckCircle,
  };
  const Icon = icons[type];

  return (
    <div
      className={cn(
        "flex min-w-0 gap-2 rounded-lg border p-3 text-xs leading-relaxed",
        styles[type],
      )}
    >
      <Icon size={12} className="mt-px shrink-0" />
      <div className="break-anywhere min-w-0">{children}</div>
    </div>
  );
}

function MonoBlock({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-w-0 overflow-auto rounded-lg border border-white/[0.05] bg-black/30 p-4 font-mono text-xs text-foreground/65",
        className,
      )}
    >
      <pre className="break-anywhere whitespace-pre-wrap leading-relaxed">
        {children}
      </pre>
    </div>
  );
}

function FilenameDisplay({ filename }: { filename: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-white/[0.03] px-3 py-2">
      <FolderOpen size={11} className="shrink-0 text-muted-foreground/60" />
      <span className="truncate font-mono text-[11px] leading-none text-foreground/65">
        {filename}
      </span>
    </div>
  );
}

function EmptyState({
  message,
  icon,
}: {
  message: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
      <div className="text-muted-foreground/20">
        {icon ?? <FolderOpen size={22} />}
      </div>
      <p className="max-w-[240px] text-xs leading-relaxed text-muted-foreground/55">
        {message}
      </p>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label className="break-anywhere text-[11px] font-medium leading-none text-muted-foreground/70">
        {label}
      </label>
      {children}
    </div>
  );
}

function FieldRow({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-w-0 grid-cols-2 gap-3 max-[760px]:grid-cols-1">
      {children}
    </div>
  );
}

function FieldGroup({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      {title ? (
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground/40">
            {title}
          </span>
          <div className="h-px flex-1 bg-white/[0.05]" />
        </div>
      ) : null}
      {children}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <Field label={label}>
      <input
        className={inputCls}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

function TextAreaField({
  label,
  value,
  rows,
  onChange,
  required,
}: {
  label: string;
  value: string;
  rows: number;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <Field label={label}>
      <textarea
        className={cn(textareaCls, "break-anywhere")}
        value={value}
        rows={rows}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

function PhaseField({
  phase,
  phaseOptions,
  onPhaseChange,
}: {
  phase: string;
  phaseOptions: string[];
  onPhaseChange: (phase: string) => void;
}) {
  const options = buildPhaseOptions(phase, phaseOptions);

  return (
    <Field label="Phase">
      <select
        className={selectCls}
        value={phase}
        onChange={(event) => onPhaseChange(event.target.value)}
        required
      >
        {options.map((phaseOption) => (
          <option key={phaseOption} value={phaseOption}>
            {phaseOption}
          </option>
        ))}
      </select>
    </Field>
  );
}

function WorkCardSelect({
  workCards,
  selectedFileName,
  onChange,
  isLoading,
  allowEmpty,
  disabled,
  label = "Saved Work Card JSON",
  emptyLabel = "Select a Work Card",
}: {
  workCards: ChampCitySavedWorkCardSummary[];
  selectedFileName: string;
  onChange: (fileName: string) => void;
  isLoading: boolean;
  allowEmpty?: boolean;
  disabled?: boolean;
  label?: string;
  emptyLabel?: string;
}) {
  return (
    <Field label={label}>
      <select
        className={selectCls}
        value={selectedFileName}
        disabled={isLoading || disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {allowEmpty || workCards.length === 0 ? (
          <option value="">{isLoading ? "Loading..." : emptyLabel}</option>
        ) : null}
        {workCards.map((workCard) => (
          <option key={workCard.fileName} value={workCard.fileName}>
            {workCard.workCardId} - {workCard.title} ({workCard.fileName})
          </option>
        ))}
      </select>
    </Field>
  );
}

function ValidationTargetSelect({
  targets,
  validationStatusByTargetFileName,
  selectedFileName,
  onChange,
  isLoading,
}: {
  targets: ChampCityValidationTargetSummary[];
  validationStatusByTargetFileName: Map<
    string,
    ChampCityHumanValidationStatusSummary
  >;
  selectedFileName: string;
  onChange: (fileName: string) => void;
  isLoading: boolean;
}) {
  return (
    <Field label="Validation Target">
      <select
        className={selectCls}
        value={selectedFileName}
        disabled={isLoading}
        onChange={(event) => onChange(event.target.value)}
      >
        {targets.length === 0 ? (
          <option value="">
            {isLoading ? "Loading..." : "Select a Validation Target"}
          </option>
        ) : null}
        {targets.map((target) => {
          const status = validationStatusByTargetFileName.get(target.fileName);

          return (
            <option key={target.fileName} value={target.fileName}>
              {target.label} — {status
                ? `${validationStatusLabel(status)}; report ${status.validationReportMarkdownFile ?? status.validationReportJsonFile}`
                : "not validated yet"} ({target.fileName})
            </option>
          );
        })}
      </select>
    </Field>
  );
}

function ProjectIntakeSummary({
  projectIntake,
}: {
  projectIntake: ChampCitySavedProjectIntakeSummary;
}) {
  return (
    <div className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-2.5 rounded-lg border border-border bg-white/[0.02] p-3">
      <SummaryItem label="Project" value={projectIntake.projectName} />
      <SummaryItem
        label="Project Intake ID"
        value={projectIntake.projectIntakeId}
        mono
      />
      <SummaryItem label="Stage" value={projectIntake.currentStage} mono />
      <SummaryItem
        label="Architect Surface"
        value={projectIntake.architectSurface}
      />
      <SummaryItem label="File" value={projectIntake.fileName} mono />
      <SummaryItem label="Updated" value={projectIntake.updatedAt} mono />
    </div>
  );
}

function ProjectArchitectInterviewPromptSummary({
  prompt,
}: {
  prompt: ChampCitySavedProjectArchitectInterviewPromptSummary;
}) {
  return (
    <div className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-2.5 rounded-lg border border-border bg-white/[0.02] p-3">
      <SummaryItem label="Project" value={prompt.projectName} />
      <SummaryItem label="Prompt ID" value={prompt.promptId} mono />
      <SummaryItem label="Project Intake ID" value={prompt.projectIntakeId} mono />
      <SummaryItem label="Architect Surface" value={prompt.architectSurface} />
      <SummaryItem label="File" value={prompt.fileName} mono />
      <SummaryItem label="Updated" value={prompt.updatedAt} mono />
    </div>
  );
}

function ProjectPlanningDocumentsSummary({
  document,
}: {
  document: ChampCitySavedProjectPlanningDocumentsSummary;
}) {
  return (
    <div className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-2.5 rounded-lg border border-border bg-white/[0.02] p-3">
      <SummaryItem label="Project" value={document.projectName} />
      <SummaryItem label="Record ID" value={document.recordId} mono />
      <SummaryItem label="File" value={document.fileName} mono />
      <SummaryItem label="Updated" value={document.updatedAt} mono />
    </div>
  );
}

function ProjectRoadmapSummary({
  roadmap,
}: {
  roadmap: ChampCitySavedProjectRoadmapSummary;
}) {
  return (
    <div className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-2.5 rounded-lg border border-border bg-white/[0.02] p-3">
      <SummaryItem label="Project" value={roadmap.projectName} />
      <SummaryItem label="Roadmap ID" value={roadmap.roadmapId} mono />
      <SummaryItem
        label="Next Phase"
        value={roadmap.nextExecutablePhaseFolder}
        mono
      />
      <SummaryItem
        label="Next Phase Title"
        value={roadmap.nextExecutablePhaseTitle}
      />
      <SummaryItem label="File" value={roadmap.fileName} mono />
      <SummaryItem label="Updated" value={roadmap.updatedAt} mono />
    </div>
  );
}

function PhaseMapPreviewSummary({
  phaseMap,
}: {
  phaseMap: ChampCityPhaseMapRecord;
}) {
  return (
    <div className="mt-4 grid gap-3 rounded-lg border border-border bg-white/[0.02] p-3">
      <div className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-2.5">
        <SummaryItem label="Project" value={phaseMap.projectName} />
        <SummaryItem label="Phase Map ID" value={phaseMap.phaseMapId} mono />
        <SummaryItem label="Roadmap ID" value={phaseMap.sourceRoadmapId} mono />
        <SummaryItem label="Current/Next Phase" value={phaseMap.currentOrNextPhase} mono />
        <SummaryItem label="Next Phase Title" value={phaseMap.nextPhaseTitle} />
        <SummaryItem label="Source File" value={phaseMap.sourceFile} mono />
        <SummaryItem label="Updated" value={phaseMap.updatedAt} mono />
      </div>
      <div className="grid gap-1 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">Mapped phases</span>
        {phaseMap.mappedPhases.map((mappedPhase) => (
          <span key={mappedPhase.phaseId}>
            {mappedPhase.phaseId} - {mappedPhase.phaseTitle} ({mappedPhase.status})
          </span>
        ))}
      </div>
    </div>
  );
}

function SavedPhaseMapSummaryPanel({
  phaseMap,
}: {
  phaseMap: ChampCitySavedPhaseMapSummary;
}) {
  return (
    <div className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-2.5 rounded-lg border border-border bg-white/[0.02] p-3">
      <SummaryItem label="Project" value={phaseMap.projectName} />
      <SummaryItem label="Phase Map ID" value={phaseMap.phaseMapId} mono />
      <SummaryItem label="Current/Next Phase" value={phaseMap.currentOrNextPhase} mono />
      <SummaryItem label="Next Phase Title" value={phaseMap.nextPhaseTitle} />
      <SummaryItem
        label="Planning Source"
        value={phaseMap.sourceProjectPlanningDocumentJsonFileName}
        mono
      />
      <SummaryItem
        label="Reconciliation Source"
        value={phaseMap.sourceRepositoryReconciliationJsonFileName}
        mono
      />
      <SummaryItem
        label="Roadmap Source"
        value={phaseMap.sourceProjectRoadmapJsonFileName}
        mono
      />
      <SummaryItem label="Updated" value={phaseMap.updatedAt} mono />
    </div>
  );
}

function MappedPhaseSummary({
  mappedPhase,
}: {
  mappedPhase: ChampCitySavedMappedPhaseSummary;
}) {
  return (
    <div className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-2.5 rounded-lg border border-border bg-white/[0.02] p-3">
      <SummaryItem label="Phase ID" value={mappedPhase.phaseId} mono />
      <SummaryItem label="Title" value={mappedPhase.phaseTitle} />
      <SummaryItem label="Status" value={mappedPhase.status} />
      <SummaryItem
        label="Recommended"
        value={mappedPhase.isRecommendedNext ? "yes" : "no"}
      />
      <SummaryItem
        label="Unresolved Questions"
        value={String(mappedPhase.unresolvedQuestions.length)}
      />
    </div>
  );
}

function WorkCardPlanSummary({
  plan,
}: {
  plan: ChampCitySavedWorkCardPlanSummary;
}) {
  return (
    <div className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-2.5 rounded-lg border border-border bg-white/[0.02] p-3">
      <SummaryItem label="Project" value={plan.projectName} />
      <SummaryItem label="Plan ID" value={plan.workCardPlanId} mono />
      <SummaryItem label="Phase" value={plan.phaseFolder} mono />
      <SummaryItem label="Phase Name" value={plan.phaseName} />
      <SummaryItem
        label="Review Status"
        value={formatWorkCardPlanReviewStatus(plan.reviewStatus)}
      />
      <SummaryItem
        label="Activation"
        value={formatWorkCardPlanActivationStatus(plan.phaseActivationStatus)}
      />
      <SummaryItem
        label="Proposed Cards"
        value={String(plan.proposedWorkCardCount)}
      />
      <SummaryItem label="Updated" value={plan.updatedAt} mono />
      <SummaryItem
        label="Phase Planning Source"
        value={plan.sourcePhasePlanningDocumentsId}
        mono
      />
      <SummaryItem label="JSON" value={plan.fileName} mono />
    </div>
  );
}

function PlannedWorkCardReviewItem({
  item,
}: {
  item: ChampCityWorkCardPlanItem;
}) {
  return (
    <div className="grid gap-3 rounded-lg border border-border bg-white/[0.02] p-4">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/45">
            {item.workCardIdProposal} / order {item.suggestedOrdering}
          </div>
          <h3 className="mt-1 break-anywhere text-sm font-semibold text-foreground">
            {item.title}
          </h3>
        </div>
        <div className="flex shrink-0 flex-wrap gap-1.5">
          <Badge className="border-blue-400/20 bg-blue-400/10 text-blue-200">
            {formatArtifactStatusLabel(item.planStatus ?? "proposed")}
          </Badge>
          <Badge className="border-amber-400/20 bg-amber-400/10 text-amber-100">
            {formatPlanItemStatusLabel(item.reconciliationStatus ?? "planned")}
          </Badge>
          <Badge className="border-border bg-muted text-muted-foreground">
            Not Executable
          </Badge>
        </div>
      </div>
      <div className="grid gap-2 text-xs leading-relaxed text-muted-foreground/75">
        <p className="break-anywhere">
          <span className="font-semibold text-foreground/80">Problem: </span>
          {item.problem}
        </p>
        <p className="break-anywhere">
          <span className="font-semibold text-foreground/80">Outcome: </span>
          {item.userOutcome}
        </p>
        <p className="break-anywhere">
          <span className="font-semibold text-foreground/80">Scope: </span>
          {item.includedScope}
        </p>
      </div>
      <DisabledPlanActionGrid compact />
    </div>
  );
}

function DisabledPlanActionGrid({ compact = false }: { compact?: boolean }) {
  const actions = [
    "Draft this Work Card",
    "Skip / defer",
    "Rename",
    "Reorder",
    "Merge",
    "Split",
    "Mark superseded",
    "Mark already satisfied",
  ];

  return (
    <div
      className={cn(
        "grid min-w-0 gap-2",
        compact ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2",
      )}
    >
      {actions.map((action) => (
        <button
          key={action}
          type="button"
          disabled
          title="Future Operator decision; disabled until formal materialization support is approved."
          className="inline-flex min-h-8 items-center justify-center gap-1.5 whitespace-normal rounded-md border border-border bg-muted px-2 py-1.5 text-center text-[11px] font-semibold leading-tight text-muted-foreground/60 disabled:opacity-60"
        >
          <CheckSquare size={11} className="shrink-0" />
          <span>{action}</span>
        </button>
      ))}
    </div>
  );
}

function PhaseIntakeSummary({
  phaseIntake,
}: {
  phaseIntake: ChampCitySavedPhaseIntakeSummary;
}) {
  return (
    <div className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-2.5 rounded-lg border border-border bg-white/[0.02] p-3">
      <SummaryItem label="Project" value={phaseIntake.projectName} />
      <SummaryItem label="Phase" value={phaseIntake.phaseName} />
      <SummaryItem label="Phase Folder" value={phaseIntake.phaseFolder} mono />
      <SummaryItem
        label="Mode"
        value={
          phaseIntake.generationMode === "architect-led"
            ? "Generated"
            : "Advanced manual"
        }
      />
      <SummaryItem label="Phase Intake ID" value={phaseIntake.phaseIntakeId} mono />
      <SummaryItem label="File" value={phaseIntake.fileName} mono />
      <SummaryItem label="Updated" value={phaseIntake.updatedAt} mono />
      {phaseIntake.sourceProjectPlanningSidecarJsonFileName ? (
        <SummaryItem
          label="Project Sidecar"
          value={phaseIntake.sourceProjectPlanningSidecarJsonFileName}
          mono
        />
      ) : null}
    </div>
  );
}

function formatPhaseIntakeOptionLabel(
  phaseIntake: ChampCitySavedPhaseIntakeSummary,
): string {
  const mode =
    phaseIntake.generationMode === "architect-led"
      ? "Generated"
      : "Advanced manual";

  return `${mode}: ${phaseIntake.phaseName} (${phaseIntake.fileName})`;
}

function formatWorkCardPlanReviewStatus(status: string): string {
  return status === "pending_review" ? "Pending Review" : "Approved";
}

function formatWorkCardPlanActivationStatus(status: string): string {
  return status === "not_active" ? "Not Active" : "Active";
}

function formatArtifactStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    proposed: "Proposed",
    mapped: "Mapped",
    planning_draft: "Planning Draft",
    pending_review: "Pending Review",
    approved_for_work_card_creation: "Approved for Work Card Creation",
    active: "Active",
    closed: "Closed",
    deferred: "Deferred",
    superseded: "Superseded",
    already_satisfied: "Already Satisfied",
    implemented_but_not_validated: "Implemented But Not Validated",
    validated_but_not_closed: "Validated But Not Closed",
  };

  return labels[status] ?? status;
}

function formatPlanItemStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    planned: "Planned",
    approved_for_work_card_creation: "Approved for Work Card Creation",
    deferred: "Deferred",
    superseded: "Superseded",
    already_satisfied: "Already Satisfied",
    implemented_but_not_validated: "Implemented But Not Validated",
    validated_but_not_closed: "Validated But Not Closed",
  };

  return labels[status] ?? status;
}

function PhaseArchitectInterviewPromptSummary({
  prompt,
}: {
  prompt: ChampCitySavedPhaseArchitectInterviewPromptSummary;
}) {
  return (
    <div className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-2.5 rounded-lg border border-border bg-white/[0.02] p-3">
      <SummaryItem label="Project" value={prompt.projectName} />
      <SummaryItem label="Phase" value={prompt.phaseName} />
      <SummaryItem label="Phase Folder" value={prompt.phaseFolder} mono />
      <SummaryItem label="Prompt ID" value={prompt.promptId} mono />
      <SummaryItem label="Phase Intake ID" value={prompt.phaseIntakeId} mono />
      <SummaryItem label="File" value={prompt.fileName} mono />
      <SummaryItem label="Updated" value={prompt.updatedAt} mono />
    </div>
  );
}

function RepositoryReconciliationSummary({
  reconciliation,
}: {
  reconciliation: ChampCitySavedRepositoryReconciliationSummary;
}) {
  return (
    <div className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-2.5 rounded-lg border border-border bg-white/[0.02] p-3">
      <SummaryItem label="Project" value={reconciliation.projectName} />
      <SummaryItem
        label="Reconciliation ID"
        value={reconciliation.reconciliationId}
        mono
      />
      <SummaryItem
        label="Recommended Next Phase"
        value={reconciliation.recommendedNextPhase}
      />
      <SummaryItem
        label="Source Phase"
        value={reconciliation.sourcePhaseFolder ?? "Not selected."}
        mono
      />
      <SummaryItem label="File" value={reconciliation.fileName} mono />
      <SummaryItem label="Updated" value={reconciliation.updatedAt} mono />
    </div>
  );
}

function ProjectPlanningDocumentFileList({
  documents,
}: {
  documents: ChampCityProjectPlanningDocumentArtifact[];
}) {
  return (
    <div className="grid gap-2 rounded-lg border border-border bg-white/[0.02] p-3">
      <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground/40">
        Previewed documents
      </div>
      <div className="grid grid-cols-2 gap-2 max-[760px]:grid-cols-1">
        {documents.map((document) => (
          <div
            key={document.fileName}
            className="rounded-md border border-border bg-black/10 px-2 py-1.5"
          >
            <div className="font-mono text-[10px] text-primary/80">
              {document.fileName}
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground/65">
              {document.title}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkCardSummary({ card }: { card: UiWorkCardSummary }) {
  return (
    <div className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-2.5 rounded-lg border border-border bg-white/[0.02] p-3">
      <SummaryItem label="ID" value={card.workCardId} mono />
      <SummaryItem label="Phase" value={card.phase} mono />
      <SummaryItem label="Title" value={card.title} />
      <SummaryItem label="Status" value={<StatusBadge status={card.status} />} />
      <SummaryItem label="Risk" value={<RiskBadge level={card.riskLevel} />} />
      {card.fileName ? <SummaryItem label="File" value={card.fileName} mono /> : null}
    </div>
  );
}

function ValidationTargetSummaryView({
  target,
}: {
  target: ChampCityValidationTargetSummary;
}) {
  return (
    <div className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-2.5 rounded-lg border border-border bg-white/[0.02] p-3">
      <SummaryItem label="ID" value={target.id} mono />
      <SummaryItem label="Kind" value={target.kind.replace(/_/g, " ")} mono />
      <SummaryItem label="Phase" value={target.phase} mono />
      <SummaryItem label="Title" value={target.title} />
      <SummaryItem label="Status" value={<StatusBadge status={target.status} />} />
      {target.risk ? (
        <SummaryItem label="Risk" value={<RiskBadge level={target.risk} />} />
      ) : null}
      {target.parentWorkCardId ? (
        <SummaryItem
          label="Parent Work Card"
          value={target.parentWorkCardId}
          mono
        />
      ) : null}
      <SummaryItem label="Source JSON" value={target.sourceJsonFile} mono />
      {target.sourceMarkdownFile ? (
        <SummaryItem
          label="Source Markdown"
          value={target.sourceMarkdownFile}
          mono
        />
      ) : null}
      {target.expectedImplementerReportFile ? (
        <SummaryItem
          label="Expected Report"
          value={target.expectedImplementerReportFile}
          mono
        />
      ) : null}
    </div>
  );
}

function ValidationStatusCard({
  status,
  isLoading,
}: {
  status: ChampCityHumanValidationStatusSummary | null;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid min-w-0 gap-3 rounded-lg border border-border bg-white/[0.02] p-3">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <h3 className="text-xs font-semibold text-foreground">
            Validation Status
          </h3>
          <ValidationStatusPill className="border-blue-400/20 bg-blue-400/10 text-blue-400">
            Checking
          </ValidationStatusPill>
        </div>
        <p className="break-anywhere text-xs leading-relaxed text-muted-foreground/70">
          Checking saved validation reports.
        </p>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="grid min-w-0 gap-3 rounded-lg border border-border bg-white/[0.02] p-3">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <h3 className="text-xs font-semibold text-foreground">
            Validation Status
          </h3>
          <ValidationStatusPill className="border-border bg-muted text-muted-foreground">
            Not validated yet
          </ValidationStatusPill>
        </div>
        <p className="break-anywhere text-xs leading-relaxed text-muted-foreground/70">
          No saved validation report was found for this Validation Target.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid min-w-0 gap-3 rounded-lg border p-3",
        validationStatusContainerColor(status),
      )}
    >
      <div className="flex min-w-0 items-center justify-between gap-3">
        <h3 className="text-xs font-semibold text-foreground">
          Validation Status
        </h3>
        <ValidationStatusPill
          className={validationStatusColor(status)}
        >
          {validationStatusLabel(status)}
        </ValidationStatusPill>
      </div>
      <div className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-2.5">
        <SummaryItem
          label="Latest result"
          value={
            <ValidationStatusPill
              className={validationResultColor(status.validationResult)}
            >
              {status.validationResult}
            </ValidationStatusPill>
          }
        />
        <SummaryItem
          label="Architect disposition"
          value={status.architectDisposition}
        />
        {status.legacyOperatorDecision ? (
          <SummaryItem
            label="Legacy Operator Decision (advisory)"
            value={status.legacyOperatorDecision}
          />
        ) : null}
        <SummaryItem
          label="Report JSON"
          value={status.validationReportJsonFile}
          mono
        />
        {status.validationReportMarkdownFile ? (
          <SummaryItem
            label="Report Markdown"
            value={status.validationReportMarkdownFile}
            mono
          />
        ) : null}
        {status.createdAt ? (
          <SummaryItem label="Timestamp" value={status.createdAt} mono />
        ) : null}
      </div>
    </div>
  );
}

function SummaryItem({
  label,
  value,
  mono,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/40">
        {label}
      </div>
      {typeof value === "string" ? (
        <div
          className={cn(
            "break-anywhere text-xs leading-snug text-foreground",
            mono && "font-mono",
          )}
        >
          {value}
        </div>
      ) : (
        value
      )}
    </div>
  );
}

function RiskBadge({ level }: { level: string }) {
  return <Badge className={riskColor(level)}>{level}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={statusColor(status)}>{status.replace(/_/g, " ")}</Badge>
  );
}

function ErrorList({ errors }: { errors: string[] }) {
  if (errors.length === 0) {
    return null;
  }

  return (
    <Notice type="error">
      <ul className="grid gap-1">
        {errors.map((error) => (
          <li key={error}>{error}</li>
        ))}
      </ul>
    </Notice>
  );
}

function WarningList({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) {
    return null;
  }

  return (
    <Notice type="warning">
      <div className="grid gap-2">
        <strong>Helpful context to consider</strong>
        <ul className="grid gap-1">
          {warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      </div>
    </Notice>
  );
}

function InvalidWorkCardFiles({
  files,
}: {
  files: ChampCityInvalidSavedWorkCardFile[];
}) {
  if (files.length === 0) {
    return null;
  }

  return (
    <details className="rounded-md border border-border bg-white/[0.02] px-3 py-2 text-xs text-muted-foreground">
      <summary className="cursor-pointer font-semibold text-muted-foreground">
        Compatibility diagnostics: {files.length} skipped Work Card {files.length === 1 ? "file" : "files"}
      </summary>
      <div className="mt-3 grid gap-2">
        <p>
          These historical or unsupported files are not current-action blockers.
          Usable Work Cards remain available above.
        </p>
        <ul className="grid gap-1">
          {files.map((file) => (
            <li key={file.fileName}>
              {file.fileName}: {file.errorMessages.join(" ")}
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}

function InvalidValidationTargetFiles({
  files,
}: {
  files: ChampCityInvalidValidationTargetFile[];
}) {
  if (files.length === 0) {
    return null;
  }

  return (
    <Notice type="warning">
      <div className="grid gap-2">
        <strong>Skipped Validation Target files</strong>
        <ul className="grid gap-1">
          {files.map((file) => (
            <li key={file.fileName}>
              {file.fileName}: {file.errorMessages.join(" ")}
            </li>
          ))}
        </ul>
      </div>
    </Notice>
  );
}

function InvalidProjectIntakeFiles({
  files,
}: {
  files: ChampCityInvalidSavedProjectIntakeFile[];
}) {
  if (files.length === 0) {
    return null;
  }

  return (
    <Notice type="warning">
      <div className="grid gap-2">
        <strong>Skipped Project Intake files</strong>
        <ul className="grid gap-1">
          {files.map((file) => (
            <li key={file.fileName}>
              {file.fileName}: {file.errorMessages.join(" ")}
            </li>
          ))}
        </ul>
      </div>
    </Notice>
  );
}

function InvalidProjectArchitectInterviewPromptFiles({
  files,
}: {
  files: ChampCityInvalidSavedProjectArchitectInterviewPromptFile[];
}) {
  if (files.length === 0) {
    return null;
  }

  return (
    <Notice type="warning">
      <div className="grid gap-2">
        <strong>Skipped Project Architect Interview Prompt files</strong>
        <ul className="grid gap-1">
          {files.map((file) => (
            <li key={file.fileName}>
              {file.fileName}: {file.errorMessages.join(" ")}
            </li>
          ))}
        </ul>
      </div>
    </Notice>
  );
}

function InvalidProjectPlanningDocumentsFiles({
  files,
}: {
  files: ChampCityInvalidSavedProjectPlanningDocumentsFile[];
}) {
  if (files.length === 0) {
    return null;
  }

  return (
    <Notice type="warning">
      <div className="grid gap-2">
        <strong>Skipped Project Planning Documents files</strong>
        <ul className="grid gap-1">
          {files.map((file) => (
            <li key={file.fileName}>
              {file.fileName}: {file.errorMessages.join(" ")}
            </li>
          ))}
        </ul>
      </div>
    </Notice>
  );
}

function InvalidProjectRoadmapFiles({
  files,
}: {
  files: ChampCityInvalidSavedProjectRoadmapFile[];
}) {
  if (files.length === 0) {
    return null;
  }

  return (
    <Notice type="warning">
      <div className="grid gap-2">
        <strong>Skipped Project Roadmap files</strong>
        <ul className="grid gap-1">
          {files.map((file) => (
            <li key={file.fileName}>
              {file.fileName}: {file.errorMessages.join(" ")}
            </li>
          ))}
        </ul>
      </div>
    </Notice>
  );
}

function InvalidPhaseMapFiles({
  files,
}: {
  files: ChampCityInvalidSavedPhaseMapFile[];
}) {
  if (files.length === 0) {
    return null;
  }

  return (
    <Notice type="warning">
      <div className="grid gap-2">
        <strong>Skipped Phase Map files</strong>
        <ul className="grid gap-1">
          {files.map((file) => (
            <li key={file.fileName}>
              {file.fileName}: {file.errorMessages.join(" ")}
            </li>
          ))}
        </ul>
      </div>
    </Notice>
  );
}

function InvalidWorkCardPlanFiles({
  files,
}: {
  files: ChampCityInvalidSavedWorkCardPlanFile[];
}) {
  if (files.length === 0) {
    return null;
  }

  return (
    <Notice type="warning">
      <div className="grid gap-2">
        <strong>Skipped Work Card Plan files</strong>
        <ul className="grid gap-1">
          {files.map((file) => (
            <li key={file.fileName}>
              {file.fileName}: {file.errorMessages.join(" ")}
            </li>
          ))}
        </ul>
      </div>
    </Notice>
  );
}

function InvalidPhaseIntakeFiles({
  files,
}: {
  files: ChampCityInvalidSavedPhaseIntakeFile[];
}) {
  if (files.length === 0) {
    return null;
  }

  return (
    <Notice type="warning">
      <div className="grid gap-2">
        <strong>Skipped Phase Intake files</strong>
        <ul className="grid gap-1">
          {files.map((file) => (
            <li key={file.fileName}>
              {file.fileName}: {file.errorMessages.join(" ")}
            </li>
          ))}
        </ul>
      </div>
    </Notice>
  );
}

function InvalidPhaseArchitectInterviewPromptFiles({
  files,
}: {
  files: ChampCityInvalidSavedPhaseArchitectInterviewPromptFile[];
}) {
  if (files.length === 0) {
    return null;
  }

  return (
    <Notice type="warning">
      <div className="grid gap-2">
        <strong>Skipped Phase Architect Interview Prompt files</strong>
        <ul className="grid gap-1">
          {files.map((file) => (
            <li key={file.fileName}>
              {file.fileName}: {file.errorMessages.join(" ")}
            </li>
          ))}
        </ul>
      </div>
    </Notice>
  );
}

function InvalidRepositoryReconciliationFiles({
  files,
}: {
  files: ChampCityInvalidSavedRepositoryReconciliationFile[];
}) {
  if (files.length === 0) {
    return null;
  }

  return (
    <Notice type="warning">
      <div className="grid gap-2">
        <strong>Skipped Repository Reconciliation files</strong>
        <ul className="grid gap-1">
          {files.map((file) => (
            <li key={file.fileName}>
              {file.fileName}: {file.errorMessages.join(" ")}
            </li>
          ))}
        </ul>
      </div>
    </Notice>
  );
}

function InvalidImplementerExecutionPacketFiles({
  files,
}: {
  files: ChampCityInvalidImplementerExecutionPacketArtifactFile[];
}) {
  if (files.length === 0) {
    return null;
  }

  return (
    <Notice type="warning">
      <div className="grid gap-2">
        <strong>Skipped supporting files</strong>
        <ul className="grid gap-1">
          {files.map((file) => (
            <li key={`${file.folder}/${file.fileName}`}>
              {file.folder}/{file.fileName}: {file.errorMessages.join(" ")}
            </li>
          ))}
        </ul>
      </div>
    </Notice>
  );
}

function OptionalArtifactSelect({
  label,
  value,
  options,
  onChange,
  emptyMessage,
}: {
  label: string;
  value: string;
  options: ChampCityImplementerExecutionPacketArtifactOption[];
  onChange: (value: string) => void;
  emptyMessage: string;
}) {
  return (
    <Field label={label}>
      <select
        className={selectCls}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Do not include</option>
        {options.map((option) => (
          <option key={option.fileName} value={option.fileName}>
            {option.isDefaultMatch ? `${option.label} (match)` : option.label}
          </option>
        ))}
      </select>
      {options.length === 0 ? (
        <small className="break-anywhere text-[11px] text-muted-foreground/55">
          {emptyMessage}
        </small>
      ) : null}
    </Field>
  );
}

function RiskReviewView({ review }: { review: ChampCityWorkCardRiskReview }) {
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-4 gap-3 rounded-lg border border-border bg-card p-4 max-[900px]:grid-cols-2">
        <Metric label="Work Card" value={review.workCardId} />
        <Metric label="Phase" value={review.phase} />
        <Metric label="Risk" value={review.assessedRiskLevel} accent />
        <Metric label="Flags" value={String(review.flaggedCategories.length)} />
      </div>
      {review.assessedRiskLevel === "high" ? (
        <Notice type="warning">
          This Work Card appears high risk. Do not send it directly to the
          Implementer until the Architect reviews the flagged items.
        </Notice>
      ) : null}
      {review.assessedRiskLevel === "low" ? (
        <Notice type="info">
          No major risk flags were detected. Normal Architect review is still
          required.
        </Notice>
      ) : null}
      <ReviewSection title="Summary">
        <p>{review.summary}</p>
      </ReviewSection>
      <ReviewSection title="Flagged Categories">
        {review.flaggedCategories.length === 0 ? (
          <p>No flagged categories.</p>
        ) : (
          <ul className="grid gap-3">
            {review.flaggedCategories.map((flag) => (
              <li
                key={flag.category}
                className="grid gap-2 rounded-lg border border-border bg-white/[0.02] p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <strong className="break-anywhere text-xs text-foreground">
                    {flag.category}
                  </strong>
                  <RiskBadge level={flag.severity} />
                </div>
                <p>{flag.rationale}</p>
                <p className="text-muted-foreground/70">
                  Matched terms: {flag.matchedTerms.join(", ")}
                </p>
                <p>{flag.suggestedArchitectQuestion}</p>
              </li>
            ))}
          </ul>
        )}
      </ReviewSection>
      <ReviewSection title="Scope-Creep Signals">
        <SimpleList
          items={review.scopeCreepSignals}
          emptyMessage="No scope-creep signals were detected."
        />
      </ReviewSection>
      <ReviewSection title="Architect Review Questions">
        <SimpleList
          items={review.architectReviewQuestions}
          emptyMessage="No extra Architect review questions were generated."
        />
      </ReviewSection>
    </div>
  );
}

function ReviewSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="break-anywhere grid gap-2 border-b border-border pb-4 text-sm leading-relaxed text-foreground/80 last:border-b-0">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  );
}

function SimpleList({
  items,
  emptyMessage,
}: {
  items: string[];
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return <p>{emptyMessage}</p>;
  }

  return (
    <ul className="grid gap-1">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function DetectionGrid({
  validation,
}: {
  validation: ChampCityImplementerReportValidationResult;
}) {
  const items = [
    ["Repository path", validation.detected.hasRepositoryPath],
    ["Git status", validation.detected.hasGitStatus],
    ["Files changed", validation.detected.hasFilesModified],
    ["Validation", validation.detected.hasValidationResults],
    ["Commit hash", validation.detected.hasCommitHash],
    ["Next task", validation.detected.hasRecommendedNextTask],
  ];

  return (
    <div className="grid grid-cols-3 gap-3 max-[760px]:grid-cols-2">
      {items.map(([label, detected]) => (
        <div
          key={String(label)}
          className="rounded-lg border border-border bg-white/[0.02] p-3"
        >
          <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/40">
            {label}
          </div>
          <div
            className={cn(
              "mt-1 text-xs font-semibold",
              detected ? "text-emerald-400" : "text-amber-400",
            )}
          >
            {detected ? "Detected" : "Missing"}
          </div>
        </div>
      ))}
    </div>
  );
}

function ImplementerReportWarnings({
  validation,
}: {
  validation: ChampCityImplementerReportValidationResult;
}) {
  if (validation.warnings.length === 0) {
    return <Notice type="success">No required-section warnings detected.</Notice>;
  }

  return (
    <Notice type={validation.validEnoughToSave ? "warning" : "error"}>
      <div className="grid gap-2">
        <strong>
          {validation.validEnoughToSave ? "Validation warnings" : "Cannot save yet"}
        </strong>
        <ul className="grid gap-1">
          {validation.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      </div>
    </Notice>
  );
}

function ManualChecklist({
  previewResult,
}: {
  previewResult: ChampCityHumanValidationPreviewResult | null;
}) {
  const checklist = previewResult?.manualValidationChecklist;

  if (!checklist) {
    return null;
  }

  return (
    <Notice type={checklist.detected ? "info" : "warning"}>
      <div className="grid gap-2">
        <strong>Manual validation checklist</strong>
        {checklist.isFallback ? (
          <span className="break-anywhere text-[11px] font-medium leading-relaxed text-amber-200/85">
            No durable Architect validation guidance found for this target.
            Showing fallback guidance.
          </span>
        ) : null}
        {checklist.sourceLabel ? (
          <span className="break-anywhere text-[11px] text-muted-foreground/70">
            Checklist source: {checklist.sourceLabel}
            {checklist.sourceFileName
              ? ` — ${checklist.sourceFileName}`
              : ""}
          </span>
        ) : null}
        <MonoBlock className="max-h-36">{checklist.text}</MonoBlock>
      </div>
    </Notice>
  );
}

function RepairPromptState({
  previewResult,
}: {
  previewResult: ChampCityHumanValidationPreviewResult | null;
}) {
  if (!previewResult?.ok) {
    return null;
  }

  if (previewResult.differentProblemGuidance) {
    return <Notice type="info">{previewResult.differentProblemGuidance}</Notice>;
  }

  if (previewResult.shouldGenerateRepairPrompt) {
    return (
      <Notice type="warning">
        <div className="grid gap-2">
          <span>
            A draft Repair Implementer Prompt will be generated and saved with
            this validation record.
          </span>
          {previewResult.repairPrompt ? (
            <MonoBlock className="max-h-40">{previewResult.repairPrompt}</MonoBlock>
          ) : null}
        </div>
      </Notice>
    );
  }

  return (
    <Notice type="info">
      No Repair Implementer Prompt will be generated while Architect disposition
      is pending. Validation Result records the functional outcome; it does not
      decide workflow routing by itself.
    </Notice>
  );
}

function PhaseArtifactSummaryView({
  summary,
  compact,
}: {
  summary: ChampCityPhaseArtifactSummary;
  compact?: boolean;
}) {
  const folderRows = summary.folders.map((folder) => (
    <div
      key={folder.folder}
      className="grid gap-1 rounded-md border border-border bg-white/[0.02] p-2"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="break-anywhere text-xs text-muted-foreground/75">
          {folder.folder.replace(/_/g, " ")}
        </span>
        <Badge
          className={cn(
            "font-mono",
            folder.count > 0
              ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-400"
              : "border-amber-400/20 bg-amber-400/10 text-amber-400",
          )}
        >
          {folder.count}
        </Badge>
      </div>
      {!compact && folder.fileNames.length > 0 ? (
        <div className="grid gap-1 pl-1">
          {folder.fileNames.map((fileName) => (
            <span
              key={fileName}
              className="truncate font-mono text-[10px] text-muted-foreground/45"
              title={fileName}
            >
              {fileName}
            </span>
          ))}
        </div>
      ) : null}
      {!compact && folder.fileNames.length === 0 ? (
        <span className="text-[10px] text-amber-400/60">No artifacts found.</span>
      ) : null}
    </div>
  ));

  if (compact) {
    return <div className="grid gap-2">{folderRows}</div>;
  }

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-4 gap-3 rounded-lg border border-border bg-card p-4 max-[900px]:grid-cols-2">
        <Metric
          label="Work Cards"
          value={String(summary.workCardCount)}
        />
        <Metric
          label="Paired JSON + MD"
          value={String(summary.workCardsWithBothJsonAndMarkdown.length)}
          accent
        />
        <Metric
          label="Missing JSON"
          value={String(summary.workCardsMissingJson.length)}
        />
        <Metric
          label="Missing Markdown"
          value={String(summary.workCardsMissingMarkdown.length)}
        />
      </div>
      <div className="grid grid-cols-2 gap-2 max-[760px]:grid-cols-1">
        {folderRows}
      </div>
      {summary.missingExpectedArtifactObservations.length > 0 ? (
        <Notice type="warning">
          <ul className="grid gap-1">
            {summary.missingExpectedArtifactObservations.map((observation) => (
              <li key={observation}>{observation}</li>
            ))}
          </ul>
        </Notice>
      ) : (
        <Notice type="success">
          No missing expected artifact observations were detected.
        </Notice>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="min-w-0 text-center">
      <div
        className={cn(
          "break-anywhere text-xl font-semibold tabular-nums",
          accent ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </div>
      <div className="mt-0.5 break-anywhere text-[9px] leading-tight text-muted-foreground/45">
        {label}
      </div>
    </div>
  );
}

function useWorkCards(phase: string) {
  const [workCards, setWorkCards] = useState<ChampCitySavedWorkCardSummary[]>([]);
  const [invalidFiles, setInvalidFiles] = useState<
    ChampCityInvalidSavedWorkCardFile[]
  >([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;

    setIsLoading(true);
    setErrors([]);

    window.champCity
      .listSavedWorkCards(phase)
      .then((result) => {
        if (!active) {
          return;
        }

        setIsLoading(false);

        if (!result.ok) {
          setWorkCards([]);
          setInvalidFiles([]);
          setErrors(result.errorMessages ?? ["Saved Work Cards could not be loaded."]);
          return;
        }

        setWorkCards(result.workCards ?? []);
        setInvalidFiles(result.invalidFiles ?? []);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setIsLoading(false);
        setWorkCards([]);
        setInvalidFiles([]);
        setErrors(["Saved Work Cards could not be loaded."]);
      });

    return () => {
      active = false;
    };
  }, [phase]);

  return { workCards, invalidFiles, errors, isLoading };
}

function useWorkCardPlans(phase: string) {
  const [workCardPlans, setWorkCardPlans] = useState<
    ChampCitySavedWorkCardPlanSummary[]
  >([]);
  const [invalidFiles, setInvalidFiles] = useState<
    ChampCityInvalidSavedWorkCardPlanFile[]
  >([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;

    setIsLoading(true);
    setErrors([]);

    window.champCity
      .listSavedWorkCardPlans(phase)
      .then((result) => {
        if (!active) {
          return;
        }

        setIsLoading(false);

        if (!result.ok) {
          setWorkCardPlans([]);
          setInvalidFiles([]);
          setErrors(
            result.errorMessages ?? ["Saved Work Card Plans could not be loaded."],
          );
          return;
        }

        setWorkCardPlans(result.workCardPlans ?? []);
        setInvalidFiles(result.invalidFiles ?? []);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setIsLoading(false);
        setWorkCardPlans([]);
        setInvalidFiles([]);
        setErrors(["Saved Work Card Plans could not be loaded."]);
      });

    return () => {
      active = false;
    };
  }, [phase]);

  return { workCardPlans, invalidFiles, errors, isLoading };
}

function useValidationTargets(phase: string) {
  const [targets, setTargets] = useState<ChampCityValidationTargetSummary[]>([]);
  const [invalidFiles, setInvalidFiles] = useState<
    ChampCityInvalidValidationTargetFile[]
  >([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;

    setIsLoading(true);
    setErrors([]);

    window.champCity
      .listHumanValidationTargets(phase)
      .then((result) => {
        if (!active) {
          return;
        }

        setIsLoading(false);

        if (!result.ok) {
          setTargets([]);
          setInvalidFiles([]);
          setErrors(
            result.errorMessages ?? ["Validation Targets could not be loaded."],
          );
          return;
        }

        setTargets(result.targets ?? []);
        setInvalidFiles(result.invalidFiles ?? []);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setIsLoading(false);
        setTargets([]);
        setInvalidFiles([]);
        setErrors(["Validation Targets could not be loaded."]);
      });

    return () => {
      active = false;
    };
  }, [phase]);

  return { targets, invalidFiles, errors, isLoading };
}

function useValidationStatuses(phase: string) {
  const [statuses, setStatuses] = useState<
    ChampCityHumanValidationStatusSummary[]
  >([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadStatuses = useCallback(
    async (isActive: () => boolean = () => true) => {
      setIsLoading(true);
      setErrors([]);

      try {
        const result = await window.champCity.listHumanValidationStatuses(phase);

        if (!isActive()) {
          return;
        }

        setIsLoading(false);

        if (!result.ok) {
          setStatuses([]);
          setErrors(
            result.errorMessages ?? ["Validation Status could not be loaded."],
          );
          return;
        }

        setStatuses(result.statuses ?? []);
      } catch {
        if (!isActive()) {
          return;
        }

        setIsLoading(false);
        setStatuses([]);
        setErrors(["Validation Status could not be loaded."]);
      }
    },
    [phase],
  );

  useEffect(() => {
    let active = true;

    void loadStatuses(() => active);

    return () => {
      active = false;
    };
  }, [loadStatuses]);

  return { statuses, errors, isLoading, reload: () => loadStatuses() };
}

function useAvailablePhases() {
  const [phases, setPhases] = useState<string[]>(PHASES);

  useEffect(() => {
    let active = true;

    window.champCity
      .listAvailablePhases()
      .then((result) => {
        if (!active) {
          return;
        }

        if (result.ok && result.phases && result.phases.length > 0) {
          setPhases(result.phases);
        }
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setPhases(PHASES);
      });

    return () => {
      active = false;
    };
  }, []);

  return { phases };
}

function useProjectIntakes() {
  const [projectIntakes, setProjectIntakes] = useState<
    ChampCitySavedProjectIntakeSummary[]
  >([]);
  const [invalidFiles, setInvalidFiles] = useState<
    ChampCityInvalidSavedProjectIntakeFile[]
  >([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;

    setIsLoading(true);
    setErrors([]);

    window.champCity
      .listSavedProjectIntakes()
      .then((result) => {
        if (!active) {
          return;
        }

        setIsLoading(false);

        if (!result.ok) {
          setProjectIntakes([]);
          setInvalidFiles([]);
          setErrors(
            result.errorMessages ?? ["Saved Project Intakes could not be loaded."],
          );
          return;
        }

        setProjectIntakes(result.projectIntakes ?? []);
        setInvalidFiles(result.invalidFiles ?? []);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setIsLoading(false);
        setProjectIntakes([]);
        setInvalidFiles([]);
        setErrors(["Saved Project Intakes could not be loaded."]);
      });

    return () => {
      active = false;
    };
  }, []);

  return { projectIntakes, invalidFiles, errors, isLoading };
}

function useProjectPlanningDocumentProjectIntakes() {
  const [projectIntakes, setProjectIntakes] = useState<
    ChampCitySavedProjectIntakeSummary[]
  >([]);
  const [invalidFiles, setInvalidFiles] = useState<
    ChampCityInvalidSavedProjectIntakeFile[]
  >([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;

    setIsLoading(true);
    setErrors([]);

    window.champCity
      .listProjectPlanningDocumentProjectIntakes()
      .then((result) => {
        if (!active) {
          return;
        }

        setIsLoading(false);

        if (!result.ok) {
          setProjectIntakes([]);
          setInvalidFiles([]);
          setErrors(
            result.errorMessages ?? ["Saved Project Intakes could not be loaded."],
          );
          return;
        }

        setProjectIntakes(result.projectIntakes ?? []);
        setInvalidFiles(result.invalidFiles ?? []);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setIsLoading(false);
        setProjectIntakes([]);
        setInvalidFiles([]);
        setErrors(["Saved Project Intakes could not be loaded."]);
      });

    return () => {
      active = false;
    };
  }, []);

  return { projectIntakes, invalidFiles, errors, isLoading };
}

function useProjectArchitectInterviewPrompts() {
  const [prompts, setPrompts] = useState<
    ChampCitySavedProjectArchitectInterviewPromptSummary[]
  >([]);
  const [invalidFiles, setInvalidFiles] = useState<
    ChampCityInvalidSavedProjectArchitectInterviewPromptFile[]
  >([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;

    setIsLoading(true);
    setErrors([]);

    window.champCity
      .listProjectPlanningDocumentArchitectPrompts()
      .then((result) => {
        if (!active) {
          return;
        }

        setIsLoading(false);

        if (!result.ok) {
          setPrompts([]);
          setInvalidFiles([]);
          setErrors(
            result.errorMessages ?? [
              "Saved Project Architect Interview Prompts could not be loaded.",
            ],
          );
          return;
        }

        setPrompts(result.prompts ?? []);
        setInvalidFiles(result.invalidFiles ?? []);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setIsLoading(false);
        setPrompts([]);
        setInvalidFiles([]);
        setErrors([
          "Saved Project Architect Interview Prompts could not be loaded.",
        ]);
      });

    return () => {
      active = false;
    };
  }, []);

  return { prompts, invalidFiles, errors, isLoading };
}

function useProjectPlanningDocumentSources() {
  const [documents, setDocuments] = useState<
    ChampCitySavedProjectPlanningDocumentsSummary[]
  >([]);
  const [invalidFiles, setInvalidFiles] = useState<
    ChampCityInvalidSavedProjectPlanningDocumentsFile[]
  >([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;

    setIsLoading(true);
    setErrors([]);

    window.champCity
      .listPhaseIntakeProjectPlanningDocuments()
      .then((result) => {
        if (!active) {
          return;
        }

        setIsLoading(false);

        if (!result.ok) {
          setDocuments([]);
          setInvalidFiles([]);
          setErrors(
            result.errorMessages ?? [
              "Saved Project Planning Documents could not be loaded.",
            ],
          );
          return;
        }

        setDocuments(result.documents ?? []);
        setInvalidFiles(result.invalidFiles ?? []);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setIsLoading(false);
        setDocuments([]);
        setInvalidFiles([]);
        setErrors(["Saved Project Planning Documents could not be loaded."]);
      });

    return () => {
      active = false;
    };
  }, []);

  return { documents, invalidFiles, errors, isLoading };
}

function useRepositoryReconciliationProjectPlanningDocuments() {
  const [documents, setDocuments] = useState<
    ChampCitySavedProjectPlanningDocumentsSummary[]
  >([]);
  const [invalidFiles, setInvalidFiles] = useState<
    ChampCityInvalidSavedProjectPlanningDocumentsFile[]
  >([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;

    setIsLoading(true);
    setErrors([]);

    window.champCity
      .listRepositoryReconciliationProjectPlanningDocuments()
      .then((result) => {
        if (!active) {
          return;
        }

        setIsLoading(false);

        if (!result.ok) {
          setDocuments([]);
          setInvalidFiles([]);
          setErrors(
            result.errorMessages ?? [
              "Saved Project Planning Documents could not be loaded.",
            ],
          );
          return;
        }

        setDocuments(result.documents ?? []);
        setInvalidFiles(result.invalidFiles ?? []);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setIsLoading(false);
        setDocuments([]);
        setInvalidFiles([]);
        setErrors(["Saved Project Planning Documents could not be loaded."]);
      });

    return () => {
      active = false;
    };
  }, []);

  return { documents, invalidFiles, errors, isLoading };
}

function usePhasePlanningProjectPlanningDocuments() {
  const [documents, setDocuments] = useState<
    ChampCitySavedProjectPlanningDocumentsSummary[]
  >([]);
  const [invalidFiles, setInvalidFiles] = useState<
    ChampCityInvalidSavedProjectPlanningDocumentsFile[]
  >([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;

    setIsLoading(true);
    setErrors([]);

    window.champCity
      .listPhasePlanningProjectPlanningDocuments()
      .then((result) => {
        if (!active) {
          return;
        }

        setIsLoading(false);

        if (!result.ok) {
          setDocuments([]);
          setInvalidFiles([]);
          setErrors(
            result.errorMessages ?? [
              "Saved Project Planning Documents could not be loaded.",
            ],
          );
          return;
        }

        setDocuments(result.documents ?? []);
        setInvalidFiles(result.invalidFiles ?? []);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setIsLoading(false);
        setDocuments([]);
        setInvalidFiles([]);
        setErrors(["Saved Project Planning Documents could not be loaded."]);
      });

    return () => {
      active = false;
    };
  }, []);

  return { documents, invalidFiles, errors, isLoading };
}

function useRepositoryReconciliations() {
  const [reconciliations, setReconciliations] = useState<
    ChampCitySavedRepositoryReconciliationSummary[]
  >([]);
  const [invalidFiles, setInvalidFiles] = useState<
    ChampCityInvalidSavedRepositoryReconciliationFile[]
  >([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;

    setIsLoading(true);
    setErrors([]);

    window.champCity
      .listPhasePlanningRepositoryReconciliations()
      .then((result) => {
        if (!active) {
          return;
        }

        setIsLoading(false);

        if (!result.ok) {
          setReconciliations([]);
          setInvalidFiles([]);
          setErrors(
            result.errorMessages ?? [
              "Saved Repository Reconciliations could not be loaded.",
            ],
          );
          return;
        }

        setReconciliations(result.reconciliations ?? []);
        setInvalidFiles(result.invalidFiles ?? []);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setIsLoading(false);
        setReconciliations([]);
        setInvalidFiles([]);
        setErrors(["Saved Repository Reconciliations could not be loaded."]);
      });

    return () => {
      active = false;
    };
  }, []);

  return { reconciliations, invalidFiles, errors, isLoading };
}

function useProjectRoadmaps() {
  const [roadmaps, setRoadmaps] = useState<
    ChampCitySavedProjectRoadmapSummary[]
  >([]);
  const [invalidFiles, setInvalidFiles] = useState<
    ChampCityInvalidSavedProjectRoadmapFile[]
  >([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;

    setIsLoading(true);
    setErrors([]);

    window.champCity
      .listSavedProjectRoadmaps()
      .then((result) => {
        if (!active) {
          return;
        }

        setIsLoading(false);

        if (!result.ok) {
          setRoadmaps([]);
          setInvalidFiles([]);
          setErrors(
            result.errorMessages ?? ["Saved Project Roadmaps could not be loaded."],
          );
          return;
        }

        setRoadmaps(result.roadmaps ?? []);
        setInvalidFiles(result.invalidFiles ?? []);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setIsLoading(false);
        setRoadmaps([]);
        setInvalidFiles([]);
        setErrors(["Saved Project Roadmaps could not be loaded."]);
      });

    return () => {
      active = false;
    };
  }, []);

  return { roadmaps, invalidFiles, errors, isLoading };
}

function usePhaseMaps() {
  const [phaseMaps, setPhaseMaps] = useState<ChampCitySavedPhaseMapSummary[]>(
    [],
  );
  const [invalidFiles, setInvalidFiles] = useState<
    ChampCityInvalidSavedPhaseMapFile[]
  >([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;

    setIsLoading(true);
    setErrors([]);

    window.champCity
      .listSavedPhaseMaps()
      .then((result) => {
        if (!active) {
          return;
        }

        setIsLoading(false);

        if (!result.ok) {
          setPhaseMaps([]);
          setInvalidFiles([]);
          setErrors(result.errorMessages ?? ["Saved Phase Maps could not be loaded."]);
          return;
        }

        setPhaseMaps(result.phaseMaps ?? []);
        setInvalidFiles(result.invalidFiles ?? []);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setIsLoading(false);
        setPhaseMaps([]);
        setInvalidFiles([]);
        setErrors(["Saved Phase Maps could not be loaded."]);
      });

    return () => {
      active = false;
    };
  }, []);

  return { phaseMaps, invalidFiles, errors, isLoading };
}

function usePhaseIntakes(phase: string) {
  const [phaseIntakes, setPhaseIntakes] = useState<
    ChampCitySavedPhaseIntakeSummary[]
  >([]);
  const [invalidFiles, setInvalidFiles] = useState<
    ChampCityInvalidSavedPhaseIntakeFile[]
  >([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;

    setIsLoading(true);
    setErrors([]);

    window.champCity
      .listPhaseArchitectInterviewPhaseIntakes(phase)
      .then((result) => {
        if (!active) {
          return;
        }

        setIsLoading(false);

        if (!result.ok) {
          setPhaseIntakes([]);
          setInvalidFiles([]);
          setErrors(
            result.errorMessages ?? ["Saved Phase Intakes could not be loaded."],
          );
          return;
        }

        setPhaseIntakes(result.phaseIntakes ?? []);
        setInvalidFiles(result.invalidFiles ?? []);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setIsLoading(false);
        setPhaseIntakes([]);
        setInvalidFiles([]);
        setErrors(["Saved Phase Intakes could not be loaded."]);
      });

    return () => {
      active = false;
    };
  }, [phase]);

  return { phaseIntakes, invalidFiles, errors, isLoading };
}

function usePhaseArchitectInterviewPrompts(phase: string) {
  const [prompts, setPrompts] = useState<
    ChampCitySavedPhaseArchitectInterviewPromptSummary[]
  >([]);
  const [invalidFiles, setInvalidFiles] = useState<
    ChampCityInvalidSavedPhaseArchitectInterviewPromptFile[]
  >([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;

    setIsLoading(true);
    setErrors([]);

    window.champCity
      .listPhasePlanningPhaseArchitectInterviewPrompts(phase)
      .then((result) => {
        if (!active) {
          return;
        }

        setIsLoading(false);

        if (!result.ok) {
          setPrompts([]);
          setInvalidFiles([]);
          setErrors(
            result.errorMessages ?? [
              "Saved Phase Architect Interview Prompts could not be loaded.",
            ],
          );
          return;
        }

        setPrompts(result.prompts ?? []);
        setInvalidFiles(result.invalidFiles ?? []);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setIsLoading(false);
        setPrompts([]);
        setInvalidFiles([]);
        setErrors([
          "Saved Phase Architect Interview Prompts could not be loaded.",
        ]);
      });

    return () => {
      active = false;
    };
  }, [phase]);

  return { prompts, invalidFiles, errors, isLoading };
}

function useDefaultSelectedFile(
  workCards: ChampCitySavedWorkCardSummary[],
  selectedFileName: string,
  setSelectedFileName: (fileName: string) => void,
) {
  useEffect(() => {
    setSelectedFileName(
      workCards.some((workCard) => workCard.fileName === selectedFileName)
        ? selectedFileName
        : workCards[0]?.fileName ?? "",
    );
  }, [workCards, selectedFileName, setSelectedFileName]);
}

function useSelectedWorkCard(
  workCards: ChampCitySavedWorkCardSummary[],
  selectedFileName: string,
  onActiveCardChange: (card: UiWorkCardSummary | null) => void,
) {
  const selectedWorkCard =
    workCards.find((workCard) => workCard.fileName === selectedFileName) ?? null;

  useEffect(() => {
    onActiveCardChange(
      selectedWorkCard ? toUiWorkCardSummary(selectedWorkCard) : null,
    );
  }, [selectedWorkCard, onActiveCardChange]);

  return selectedWorkCard ? toUiWorkCardSummary(selectedWorkCard) : null;
}

function getWorkflowStep(activeScreen: AppScreen) {
  return (
    workflowSteps.find((step) => step.id === activeScreen) ?? workflowSteps[0]
  );
}

function buildPhaseOptions(currentPhase: string, availablePhases: string[]): string[] {
  const basePhases = availablePhases.length > 0 ? availablePhases : PHASES;

  return basePhases.includes(currentPhase)
    ? basePhases
    : [currentPhase, ...basePhases];
}

function appendLine(value: string, nextLine: string): string {
  const trimmed = value.trim();

  return trimmed.length > 0 ? `${trimmed}\n${nextLine}` : nextLine;
}

function evidenceAttachmentPaths(value: string): string[] {
  return value
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function evidenceAttachmentFileName(filePath: string): string {
  return filePath.split(/[\\/]/).filter(Boolean).pop() ?? "Evidence file";
}

function validateWorkCardForm(form: ChampCityWorkCardDraftInput): string[] {
  const errors: string[] = [];

  if (form.workCardId.trim().length === 0) {
    errors.push("Please enter a Work Card ID.");
  }

  if (form.title.trim().length === 0) {
    errors.push("Please enter a Work Card title.");
  }

  if (form.phase.trim().length === 0) {
    errors.push("Please choose a phase.");
  }

  if (form.problem.trim().length === 0) {
    errors.push("Please describe what you are trying to build or fix.");
  }

  if (form.userOutcome.trim().length === 0) {
    errors.push("Please describe what the user should be able to do.");
  }

  return errors;
}

async function copyText(
  value: string,
  setCopyMessage: (message: string) => void,
) {
  if (value.trim().length === 0) {
    setCopyMessage("Generate text before copying.");
    return;
  }

  try {
    if (!navigator.clipboard?.writeText) {
      throw new Error("Clipboard unavailable.");
    }

    await navigator.clipboard.writeText(value);
    setCopyMessage("Copied to clipboard.");
  } catch {
    setCopyMessage("Clipboard access failed. Select and copy the text manually.");
  }
}

function emptyImplementerExecutionPacketArtifactOptions(): ChampCityImplementerExecutionPacketArtifactOptions {
  return {
    workCardMarkdown: [],
    architectPrompts: [],
    riskReviews: [],
    priorImplementerReports: [],
  };
}

function cleanImplementerExecutionPacketSelections(
  selections: ChampCityImplementerExecutionPacketSupportingArtifactFileNames,
): ChampCityImplementerExecutionPacketSupportingArtifactFileNames {
  return {
    workCardMarkdown: nonBlankSelection(selections.workCardMarkdown),
    architectPrompt: nonBlankSelection(selections.architectPrompt),
    riskReview: nonBlankSelection(selections.riskReview),
    priorImplementerReport: nonBlankSelection(selections.priorImplementerReport),
  };
}

function nonBlankSelection(value: string | undefined): string | undefined {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : undefined;
}

function toUiWorkCardSummary(workCard: {
  fileName?: string;
  workCardId: string;
  title: string;
  phase: string;
  status: string;
  riskLevel: string;
}): UiWorkCardSummary {
  return {
    fileName: workCard.fileName,
    workCardId: workCard.workCardId,
    title: workCard.title,
    phase: workCard.phase,
    status: workCard.status,
    riskLevel: workCard.riskLevel,
  };
}

function toUiValidationTargetSummary(
  target: ChampCityValidationTargetSummary,
): UiWorkCardSummary {
  return {
    fileName: target.fileName,
    workCardId: target.id,
    title: target.title,
    phase: target.phase,
    status: target.status,
    riskLevel: target.risk ?? "medium",
  };
}

function riskColor(level: string): string {
  if (level === "high") {
    return "border-red-400/20 bg-red-400/10 text-red-400";
  }

  if (level === "medium") {
    return "border-amber-400/20 bg-amber-400/10 text-amber-400";
  }

  return "border-emerald-400/20 bg-emerald-400/10 text-emerald-400";
}

function statusColor(status: string): string {
  if (status === "ready_for_architect") {
    return "border-blue-400/20 bg-blue-400/10 text-blue-400";
  }

  if (status === "ready_for_implementer") {
    return "border-primary/20 bg-primary/10 text-primary";
  }

  if (status === "validated") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-400";
  }

  return "border-border bg-muted text-muted-foreground";
}

function validationResultColor(result: string): string {
  if (result === "Pass") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  }

  if (result === "Fail") {
    return "border-red-400/20 bg-red-400/10 text-red-300";
  }

  if (result === "Partial" || result === "Pass with concerns") {
    return "border-amber-400/20 bg-amber-400/10 text-amber-300";
  }

  if (result === "Blocked") {
    return "border-orange-400/20 bg-orange-400/10 text-orange-300";
  }

  return "border-border bg-muted text-muted-foreground";
}

function validationStatusLabel(
  status: ChampCityHumanValidationStatusSummary,
): string {
  const disposition = status.architectDisposition.toLowerCase();

  if (disposition.includes("pending architect review")) {
    return "Pending Architect review";
  }

  if (disposition.includes("repair required")) {
    return "Repair required";
  }

  if (disposition.includes("blocked") || status.validationResult === "Blocked") {
    return "Blocked";
  }

  if (disposition.includes("not recorded")) {
    return "Legacy report - Architect review not recorded";
  }

  return "Architect reviewed";
}

function validationStatusColor(
  status: ChampCityHumanValidationStatusSummary,
): string {
  const label = validationStatusLabel(status);

  if (label === "Architect reviewed") {
    return validationResultColor(status.validationResult);
  }

  if (label === "Repair required") {
    return validationResultColor("Fail");
  }

  if (label === "Blocked") {
    return validationResultColor("Blocked");
  }

  if (
    label === "Pending Architect review" ||
    label === "Legacy report - Architect review not recorded"
  ) {
    return validationResultColor("Partial");
  }

  return validationResultColor("Not tested");
}

function validationStatusContainerColor(
  status: ChampCityHumanValidationStatusSummary,
): string {
  const label = validationStatusLabel(status);

  if (label === "Architect reviewed" && status.validationResult === "Pass") {
    return "border-emerald-400/20 bg-emerald-400/[0.04]";
  }

  if (label === "Repair required") {
    return "border-red-400/20 bg-red-400/[0.04]";
  }

  if (label === "Blocked") {
    return "border-orange-400/20 bg-orange-400/[0.04]";
  }

  if (
    label === "Pending Architect review" ||
    label === "Legacy report - Architect review not recorded"
  ) {
    return "border-amber-400/20 bg-amber-400/[0.04]";
  }

  return "border-border bg-white/[0.02]";
}

function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}
