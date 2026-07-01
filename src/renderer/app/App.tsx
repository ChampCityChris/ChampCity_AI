import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
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
  Info,
  Map as MapIcon,
  MessageSquareText,
  Save,
  ShieldAlert,
  Upload,
  Wand2,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";

import logoImage from "../assets/champcity_ai_ui_branding.png";

type AppScreen =
  | "project-intake"
  | "project-architect-interview"
  | "project-planning-documents"
  | "phase-intake"
  | "phase-architect-interview"
  | "new-work-card"
  | "architect-prompt-composer"
  | "risk-router"
  | "builder-prompt-generator"
  | "builder-report-capture"
  | "human-validation"
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
    id: "phase-intake",
    label: "Phase Intake",
    mode: "architect",
    shortDesc: "Define phase",
    screenTitle: "Phase Intake",
    nextAction: "Capture phase intent from project planning context.",
    Icon: ClipboardList,
  },
  {
    id: "phase-architect-interview",
    label: "Phase Interview",
    mode: "architect",
    shortDesc: "Phase prompt",
    screenTitle: "Phase Architect Interview",
    nextAction: "Generate a copy-ready phase interview prompt.",
    Icon: MessageSquareText,
  },
  {
    id: "new-work-card",
    label: "Capture",
    mode: "architect",
    shortDesc: "Define intent",
    screenTitle: "New Work Card",
    nextAction: "Capture Operator intent and save paired JSON/Markdown.",
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
    id: "builder-prompt-generator",
    label: "Implement",
    mode: "implementer",
    shortDesc: "Implementer handoff",
    screenTitle: "Implementer Prompt Generator",
    nextAction: "Generate a bounded prompt for Codex or another coding agent.",
    Icon: Zap,
  },
  {
    id: "builder-report-capture",
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

const initialHumanValidationForm: Omit<
  ChampCityHumanValidationFormInput,
  "phase" | "workCardFileName" | "builderReportFileName"
> = {
  validationResult: "Not Tested",
  testedItems: "",
  passedItems: "",
  failedItems: "",
  evidenceReferences: "",
  screenshotOrFileReferences: "",
  commandsRun: "",
  observedErrors: "",
  additionalOperatorObservations: "",
  operatorDecision: "Deferred - not validated yet",
  recommendedNextAction: "",
};

const initialPhaseCloseoutForm: ChampCityPhaseCloseoutFormInput = {
  phase: defaultPhase,
  decision: "Continue phase",
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
  sourceOfTruthLocation: "C:\\Users\\chapm\\Projects\\ChampCity_AI",
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
  sourceProjectPlanningSidecarJsonFileName: "",
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
  const { phases: availablePhases } = useAvailablePhases();
  const phaseOptions = useMemo(
    () => buildPhaseOptions(phase, availablePhases),
    [phase, availablePhases],
  );
  const { workCards: headerWorkCards } = useWorkCards(phase);

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
    "builder-prompt-generator": (
      <BuilderPromptGeneratorScreen
        phase={phase}
        phaseOptions={phaseOptions}
        onPhaseChange={handlePhaseChange}
        onActiveCardChange={setActiveCard}
      />
    ),
    "builder-report-capture": (
      <BuilderReportCaptureScreen
        phase={phase}
        phaseOptions={phaseOptions}
        onPhaseChange={handlePhaseChange}
        onActiveCardChange={setActiveCard}
      />
    ),
    "human-validation": (
      <HumanValidationScreen
        phase={phase}
        phaseOptions={phaseOptions}
        onPhaseChange={handlePhaseChange}
        activeCard={activeCard}
        onActiveCardChange={setActiveCard}
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
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <AppHeader
        appName={appInfo.name}
        phase={phase}
        phaseOptions={phaseOptions}
        activeCard={activeCard}
        activeScreen={activeScreen}
        onNav={setActiveScreen}
        onPhaseChange={handlePhaseChange}
        workCards={headerWorkCards}
        onCardChange={handleHeaderCardChange}
      />
      <div className="min-h-0 flex-1 overflow-hidden">{screen}</div>
    </div>
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
          </div>

          {activeCard ? (
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
    ["builder-prompt-generator", "builder-report-capture"].includes(step.id),
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
                  onClick={() => onNavigate("phase-intake")}
                  className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-md border border-blue-400/25 bg-blue-400/10 px-3 py-1.5 text-xs font-semibold text-blue-200 transition-colors hover:bg-blue-400/15"
                >
                  Open Phase Intake
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

function PhaseIntakeScreen({
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
  } = useProjectPlanningDocumentSources();
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

  const selectedProjectPlanningDocuments =
    projectPlanningDocuments.find(
      (document) =>
        document.fileName === form.sourceProjectPlanningSidecarJsonFileName,
    ) ?? null;
  const allErrors = [...sourceErrors, ...screenErrors, ...validation.errors];

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
          },
    );
    setPreviewMarkdown("");
    setSaveResult(null);
    setCopyMessage("");
    setScreenErrors([]);
    setStatusMessage("Phase selection updated.");
  }, [phase]);

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

  function updatePhaseFolder(nextPhase: string) {
    onPhaseChange(nextPhase);
    updateField("phaseFolder", nextPhase);
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

  function resetGeneratedPhaseIntake(nextStatusMessage: string) {
    setPreviewMarkdown("");
    setSaveResult(null);
    setCopyMessage("");
    setScreenErrors([]);
    setStatusMessage(nextStatusMessage);
  }

  async function previewPhaseIntake() {
    setIsBusy(true);
    setCopyMessage("");
    setScreenErrors([]);

    const result = await window.champCity.previewPhaseIntake(form);
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
    setIsBusy(true);
    setCopyMessage("");
    setScreenErrors([]);

    const result = await window.champCity.savePhaseIntake(form);
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
            title="Phase Intake"
            description="Define a development phase from saved project planning context."
            badge="upstream"
          />
          <Notice type="info">
            This saves a phase-scoped intake artifact only. It does not generate
            Phase Planning Documents, an initial Work Card plan, implementation
            code, or closeout records.
          </Notice>
          <ErrorList errors={allErrors} />
          <WarningList warnings={validation.warnings} />
          <InvalidProjectPlanningDocumentsFiles files={invalidFiles} />
          <FieldGroup title="Source">
            <PhaseField
              phase={form.phaseFolder}
              phaseOptions={phaseOptions}
              onPhaseChange={updatePhaseFolder}
            />
            <Field label="Saved Project Planning Documents sidecar">
              <select
                className={selectCls}
                value={form.sourceProjectPlanningSidecarJsonFileName ?? ""}
                disabled={isLoading}
                onChange={(event) =>
                  updateProjectPlanningSource(event.target.value)
                }
              >
                <option value="">
                  {isLoading
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
            ) : (
              <Notice type="info">
                Without a sidecar selection, the saved Phase Intake records the
                current `planning/project/` documents as the project context
                reference.
              </Notice>
            )}
          </FieldGroup>
          <FieldGroup title="Phase">
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
          <FieldGroup title="Scope And Boundaries">
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
          <FieldGroup title="Planning Context">
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
          <ActionBar
            onPreview={() => void previewPhaseIntake()}
            onSave={() => void savePhaseIntake()}
            onCopy={() => void copyText(previewMarkdown, setCopyMessage)}
            saveLabel="Save Phase Intake"
            copyLabel="Copy Preview"
            saveDisabled={isBusy}
            copyDisabled={previewMarkdown.trim().length === 0}
            statusMessage={copyMessage || statusMessage}
            statusType={allErrors.length > 0 ? "error" : "success"}
          />
        </div>
      }
      right={
        <ArtifactPanel
          eyebrow="Phase Intake"
          title="Phase Intake Markdown Preview"
          status={statusMessage}
          filename={saveResult?.savedMarkdownFileName}
          emptyMessage="Preview a Phase Intake to see the durable Markdown artifact."
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
            Next step: use this saved Phase Intake to generate a Phase Architect
            Interview prompt.
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
}: ScreenProps) {
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
              Save a Phase Intake first.
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
                  {isLoading ? "Loading Phase Intakes..." : "Select Phase Intake"}
                </option>
                {phaseIntakes.map((phaseIntake) => (
                  <option key={phaseIntake.fileName} value={phaseIntake.fileName}>
                    {phaseIntake.phaseName} ({phaseIntake.fileName})
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
    "Draft status: ready_for_architect",
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
    setStatusMessage("Markdown preview refreshed. Draft requires Architect review.");
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
    setStatusMessage("Work Card draft saved for Architect review.");
    if (result.workCard) {
      onActiveCardChange(toUiWorkCardSummary(result.workCard));
    }
  }

  return (
    <ScreenLayout
      left={
        <div className="flex h-full flex-col gap-5 p-4">
          <ScreenIntro
            title="Operator Intent"
            description="Shape the idea into a durable Work Card before it becomes implementation work."
            badge="ready_for_architect"
          />
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
                label="Phase"
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
            saveLabel="Save Work Card"
            saveDisabled={isBusy}
            statusMessage={statusMessage}
            statusType={errors.length > 0 ? "error" : "success"}
          />
        </div>
      }
      right={
        <ArtifactPanel
          eyebrow="Markdown"
          title="Work Card Preview"
          status={statusMessage}
          emptyMessage="Preview a Work Card to see the durable Markdown artifact."
        >
          {saveResult?.markdownPath && saveResult.jsonPath ? (
            <Notice type="success">
              <div className="grid gap-1">
                <span>Saved paired Work Card artifacts.</span>
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

function BuilderPromptGeneratorScreen({
  phase,
  phaseOptions,
  onPhaseChange,
  onActiveCardChange,
}: ScreenProps) {
  const { workCards, invalidFiles, errors: listErrors, isLoading } =
    useWorkCards(phase);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [artifactOptions, setArtifactOptions] =
    useState<ChampCityBuilderPromptArtifactOptions>(
      emptyBuilderPromptArtifactOptions(),
    );
  const [artifactSelections, setArtifactSelections] =
    useState<ChampCityBuilderPromptSupportingArtifactFileNames>({});
  const [artifactNotes, setArtifactNotes] = useState<string[]>([]);
  const [invalidArtifactFiles, setInvalidArtifactFiles] = useState<
    ChampCityInvalidBuilderPromptArtifactFile[]
  >([]);
  const [prompt, setPrompt] = useState("");
  const [previewResult, setPreviewResult] =
    useState<ChampCityBuilderPromptPreviewResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState("Loading saved Work Cards.");
  const [copyMessage, setCopyMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [saveResult, setSaveResult] =
    useState<ChampCityBuilderPromptSaveResult | null>(null);

  const selectedWorkCard = useSelectedWorkCard(
    workCards,
    selectedFileName,
    onActiveCardChange,
  );

  useDefaultSelectedFile(workCards, selectedFileName, setSelectedFileName);

  useEffect(() => {
    if (selectedFileName.trim().length === 0) {
      setArtifactOptions(emptyBuilderPromptArtifactOptions());
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
      .listBuilderPromptSupportingArtifacts({
        phase,
        fileName: selectedFileName,
      })
      .then((result) => {
        if (!active) {
          return;
        }

        if (!result.ok) {
          setArtifactOptions(emptyBuilderPromptArtifactOptions());
          setArtifactSelections({});
          setArtifactNotes([]);
          setInvalidArtifactFiles([]);
          setErrors(result.errorMessages ?? ["Supporting artifacts could not be loaded."]);
          setStatusMessage("Supporting artifacts need attention.");
          setIsBusy(false);
          return;
        }

        setArtifactOptions(result.options ?? emptyBuilderPromptArtifactOptions());
        setArtifactSelections(result.defaultSelections ?? {});
        setArtifactNotes(result.notes ?? []);
        setInvalidArtifactFiles(result.invalidFiles ?? []);
        setStatusMessage("Supporting artifacts loaded.");
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setArtifactOptions(emptyBuilderPromptArtifactOptions());
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
      .previewBuilderPrompt({
        phase,
        fileName: selectedFileName,
        supportingArtifactFileNames:
          cleanBuilderPromptSelections(artifactSelections),
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
    field: keyof ChampCityBuilderPromptSupportingArtifactFileNames,
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

    const result = await window.champCity.saveBuilderPrompt({
      phase,
      fileName: selectedFileName,
      supportingArtifactFileNames:
        cleanBuilderPromptSelections(artifactSelections),
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
              value={artifactSelections.priorBuilderReport ?? ""}
              options={artifactOptions.priorBuilderReports}
              onChange={(value) =>
                updateArtifactSelection("priorBuilderReport", value)
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
            <InvalidBuilderPromptFiles files={invalidArtifactFiles} />
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

function BuilderReportCaptureScreen({
  phase,
  phaseOptions,
  onPhaseChange,
  onActiveCardChange,
}: ScreenProps) {
  const { workCards, invalidFiles, errors: listErrors, isLoading } =
    useWorkCards(phase);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [reportType, setReportType] =
    useState<ChampCityBuilderReportType>("Work Card");
  const [topic, setTopic] = useState("");
  const [reportText, setReportText] = useState("");
  const [previewResult, setPreviewResult] =
    useState<ChampCityBuilderReportCapturePreviewResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState("Paste or import an Implementer Report.");
  const [isBusy, setIsBusy] = useState(false);
  const [saveResult, setSaveResult] =
    useState<ChampCityBuilderReportCaptureSaveResult | null>(null);
  const [importableReports, setImportableReports] = useState<
    ChampCityHumanValidationBuilderReportOption[]
  >([]);
  const [selectedImportReportFileName, setSelectedImportReportFileName] =
    useState("");

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
    if (reportType !== "Work Card" || selectedFileName.trim().length === 0) {
      setImportableReports([]);
      setSelectedImportReportFileName("");
      return;
    }

    let active = true;

    window.champCity
      .listHumanValidationBuilderReports({
        phase,
        workCardFileName: selectedFileName,
      })
      .then((result) => {
        if (!active) {
          return;
        }

        if (!result.ok) {
          setImportableReports([]);
          setSelectedImportReportFileName("");
          return;
        }

        const options = result.options ?? [];
        const defaultFileName = result.defaultFileName ?? "";

        setImportableReports(options);
        setSelectedImportReportFileName(defaultFileName);

        if (defaultFileName) {
          void loadSavedReportText(defaultFileName, () => active);
        }
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setImportableReports([]);
        setSelectedImportReportFileName("");
      });

    return () => {
      active = false;
    };
  }, [phase, reportType, selectedFileName]);

  useEffect(() => {
    let active = true;

    setIsBusy(true);
    setErrors([]);
    setSaveResult(null);

    window.champCity
      .previewBuilderReportCapture({
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

  async function importReportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!/\.(md|txt)$/i.test(file.name)) {
      setErrors(["Import a Markdown or text report file."]);
      return;
    }

    try {
      const text = await file.text();
      applyImportedReportText(file.name, text);
    } catch {
      setErrors(["The selected report file could not be imported."]);
      setStatusMessage("Report import needs attention.");
    } finally {
      event.target.value = "";
    }
  }

  async function loadSavedReportText(fileName: string, isActive?: () => boolean) {
    if (fileName.trim().length === 0) {
      return;
    }

    setIsBusy(true);
    setErrors([]);

    try {
      const result = await window.champCity.loadBuilderReportFile({
        phase,
        fileName,
      });

      if (isActive && !isActive()) {
        return;
      }

      setIsBusy(false);

      if (!result.ok || !result.content || !result.fileName) {
        setErrors(
          result.errorMessages ?? ["The saved Implementer Report could not be loaded."],
        );
        setStatusMessage("Report import needs attention.");
        return;
      }

      applyImportedReportText(result.fileName, result.content);
    } catch {
      if (isActive && !isActive()) {
        return;
      }

      setIsBusy(false);
      setErrors(["The saved Implementer Report could not be loaded."]);
      setStatusMessage("Report import needs attention.");
    }
  }

  function applyImportedReportText(fileName: string, text: string) {
    setReportText(text);
    setTopic((previous) =>
      previous.trim().length > 0
        ? previous
        : fileName.replace(/\.(md|txt)$/i, "").replace(/[_-]+/g, " "),
    );
    setStatusMessage("Implementer Report text imported.");
  }

  async function saveReport() {
    setIsBusy(true);
    setErrors([]);

    const result = await window.champCity.saveBuilderReportCapture({
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
  }

  return (
    <ScreenLayout
      left={
        <div className="flex h-full flex-col gap-5 p-4">
          <ScreenIntro
            title="Implementer Report Capture"
            description="Paste or import implementation evidence, then save it in the compatibility Builder_Reports folder."
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
                  setReportType(event.target.value as ChampCityBuilderReportType)
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
            {importableReports.length > 0 ? (
              <Field label="Saved Implementer Report">
                <select
                  className={selectCls}
                  value={selectedImportReportFileName}
                  onChange={(event) => {
                    const fileName = event.target.value;

                    setSelectedImportReportFileName(fileName);
                    void loadSavedReportText(fileName);
                  }}
                >
                  <option value="">Select saved report to import</option>
                  {importableReports.map((option) => (
                    <option key={option.fileName} value={option.fileName}>
                      {option.isDefaultMatch
                        ? `${option.label} (match)`
                        : option.label}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}
            <Field label="Import .md or .txt file">
              <label className="flex items-center gap-2 rounded-md border border-border bg-white/[0.03] px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground">
                <Upload size={13} />
                <span>Choose report file</span>
                <input
                  className="sr-only"
                  type="file"
                  accept=".md,.txt,text/markdown,text/plain"
                  onChange={(event) => void importReportFile(event)}
                />
              </label>
            </Field>
            <TextAreaField
              label="Paste or edit Implementer Report Markdown"
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
          emptyMessage="Paste or import report text to see validation signals."
        >
          <div className="grid gap-4">
            {previewResult?.validation ? (
              <>
                <DetectionGrid validation={previewResult.validation} />
                <BuilderReportWarnings validation={previewResult.validation} />
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

function HumanValidationScreen({
  phase,
  phaseOptions,
  activeCard,
  onPhaseChange,
  onActiveCardChange,
}: ScreenProps) {
  const { targets, invalidFiles, errors: listErrors, isLoading } =
    useValidationTargets(phase);
  const {
    statuses: validationStatuses,
    errors: validationStatusErrors,
    isLoading: isValidationStatusLoading,
    reload: reloadValidationStatuses,
  } = useValidationStatuses(phase);
  const [selectedFileName, setSelectedFileName] = useState(() =>
    activeCard?.phase === phase ? activeCard.fileName ?? "" : "",
  );
  const [builderReports, setBuilderReports] = useState<
    ChampCityHumanValidationBuilderReportOption[]
  >([]);
  const [invalidBuilderReports, setInvalidBuilderReports] = useState<
    ChampCityInvalidHumanValidationBuilderReportFile[]
  >([]);
  const [selectedBuilderReportFileName, setSelectedBuilderReportFileName] =
    useState("");
  const [form, setForm] = useState(initialHumanValidationForm);
  const [previewResult, setPreviewResult] =
    useState<ChampCityHumanValidationPreviewResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState(
    "Select a Validation Target to validate.",
  );
  const [isBusy, setIsBusy] = useState(false);
  const [saveResult, setSaveResult] =
    useState<ChampCityHumanValidationSaveResult | null>(null);
  const [importedEvidencePaths, setImportedEvidencePaths] = useState<string[]>(
    [],
  );

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

    setSelectedFileName((previous) => {
      if (
        headerSelectedFileName &&
        targets.some((target) => target.fileName === headerSelectedFileName)
      ) {
        return previous === headerSelectedFileName
          ? previous
          : headerSelectedFileName;
      }

      return targets.some((target) => target.fileName === previous)
        ? previous
        : targets[0]?.fileName ?? "";
    });
  }, [activeCard?.fileName, activeCard?.phase, phase, targets]);

  useEffect(() => {
    setImportedEvidencePaths([]);
  }, [phase, selectedFileName]);

  useEffect(() => {
    if (selectedFileName.trim().length === 0) {
      setBuilderReports([]);
      setInvalidBuilderReports([]);
      setSelectedBuilderReportFileName("");
      return;
    }

    let active = true;

    setIsBusy(true);
    setErrors([]);

    window.champCity
      .listHumanValidationBuilderReports({
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
          setBuilderReports([]);
          setInvalidBuilderReports([]);
          setSelectedBuilderReportFileName("");
          setErrors(result.errorMessages ?? ["Implementer Reports could not be loaded."]);
          setStatusMessage("Implementer Reports need attention.");
          return;
        }

        const options = result.options ?? [];
        setBuilderReports(options);
        setInvalidBuilderReports(result.invalidFiles ?? []);
        setSelectedBuilderReportFileName(result.defaultFileName ?? "");
        setStatusMessage("Validation source loaded.");
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setIsBusy(false);
        setBuilderReports([]);
        setInvalidBuilderReports([]);
        setSelectedBuilderReportFileName("");
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
      builderReportFileName:
        selectedBuilderReportFileName.trim().length > 0
          ? selectedBuilderReportFileName
          : undefined,
      ...form,
    };
  }, [
    phase,
    selectedFileName,
    selectedValidationTarget,
    selectedBuilderReportFileName,
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
            ? "Validation preview generated. Repair prompt will be saved."
            : "Validation preview generated.",
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
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  async function importEvidenceFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!selectedFileName) {
      setErrors(["Select a Validation Target before attaching evidence."]);
      event.target.value = "";
      return;
    }

    if (!/\.(png|jpe?g|webp|gif|txt|md)$/i.test(file.name)) {
      setErrors(["Attach a .png, .jpg, .jpeg, .webp, .gif, .txt, or .md file."]);
      event.target.value = "";
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

      setImportedEvidencePaths((previous) => [
        result.savedRelativePath as string,
        ...previous,
      ]);
      setForm((previous) => ({
        ...previous,
        screenshotOrFileReferences: appendLine(
          previous.screenshotOrFileReferences,
          result.savedRelativePath as string,
        ),
      }));
      setStatusMessage("Evidence file attached.");
    } catch {
      setIsBusy(false);
      setErrors(["The evidence file could not be attached."]);
      setStatusMessage("Evidence import needs attention.");
    } finally {
      event.target.value = "";
    }
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
            title="Human Validation"
            description="Record what the Operator tested and generate a narrow repair prompt only when needed."
            badge={phase}
          />
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
              selectedFileName={selectedFileName}
              onChange={setSelectedFileName}
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
                value={selectedBuilderReportFileName}
                onChange={(event) =>
                  setSelectedBuilderReportFileName(event.target.value)
                }
              >
                <option value="">No Implementer Report selected</option>
                {builderReports.map((option) => (
                  <option key={option.fileName} value={option.fileName}>
                    {option.isDefaultMatch
                      ? `${option.label} (match)`
                      : option.label}
                  </option>
                ))}
              </select>
            </Field>
            {invalidBuilderReports.length > 0 ? (
              <Notice type="warning">
                <ul className="grid gap-1">
                  {invalidBuilderReports.map((file) => (
                    <li key={file.fileName}>
                      {file.fileName}: {file.errorMessages.join(" ")}
                    </li>
                  ))}
                </ul>
              </Notice>
            ) : null}
            {previewResult?.builderReportWarning ? (
              <Notice type="warning">{previewResult.builderReportWarning}</Notice>
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
                  {["Pass", "Fail", "Partial", "Blocked", "Not Tested"].map(
                    (option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ),
                  )}
                </select>
              </Field>
              <Field label="Operator decision">
                <select
                  className={selectCls}
                  value={form.operatorDecision}
                  onChange={(event) =>
                    updateForm(
                      "operatorDecision",
                      event.target.value as ChampCityHumanValidationOperatorDecision,
                    )
                  }
                >
                  {[
                    "Passed - proceed",
                    "Failed - repair needed",
                    "Partial - repair or follow-up needed",
                    "Blocked - operator/build environment issue",
                    "Deferred - not validated yet",
                    "Different problem found - open new Work Card",
                  ].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>
            </FieldRow>
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
                <div className="grid gap-2">
                  <textarea
                    className={cn(textareaCls, "break-anywhere")}
                    value={form.screenshotOrFileReferences}
                    rows={2}
                    onChange={(event) =>
                      updateForm(
                        "screenshotOrFileReferences",
                        event.target.value,
                      )
                    }
                  />
                  <label className="flex items-center gap-2 rounded-md border border-border bg-white/[0.03] px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground">
                    <Upload size={13} />
                    <span>Import Screenshot/File</span>
                    <input
                      className="sr-only"
                      type="file"
                      accept=".png,.jpg,.jpeg,.webp,.gif,.txt,.md,image/png,image/jpeg,image/webp,image/gif,text/plain,text/markdown"
                      onChange={(event) => void importEvidenceFile(event)}
                    />
                  </label>
                  {importedEvidencePaths.length > 0 ? (
                    <div className="grid gap-1 text-[10px] text-muted-foreground/70">
                      {importedEvidencePaths.slice(0, 3).map((filePath) => (
                        <code key={filePath} className="break-anywhere">
                          {filePath}
                        </code>
                      ))}
                    </div>
                  ) : null}
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
              label="Recommended next action"
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
            description="Review phase artifacts and record a non-mutating closeout decision."
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
  emptyLabel = "Select a Work Card",
}: {
  workCards: ChampCitySavedWorkCardSummary[];
  selectedFileName: string;
  onChange: (fileName: string) => void;
  isLoading: boolean;
  allowEmpty?: boolean;
  emptyLabel?: string;
}) {
  return (
    <Field label="Saved Work Card JSON">
      <select
        className={selectCls}
        value={selectedFileName}
        disabled={isLoading}
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
  selectedFileName,
  onChange,
  isLoading,
}: {
  targets: ChampCityValidationTargetSummary[];
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
        {targets.map((target) => (
          <option key={target.fileName} value={target.fileName}>
            {target.label} ({target.fileName})
          </option>
        ))}
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
    <div className="grid min-w-0 gap-3 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.04] p-3">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <h3 className="text-xs font-semibold text-foreground">
          Validation Status
        </h3>
        <ValidationStatusPill
          className={validationResultColor(status.validationResult)}
        >
          {status.validationResult}
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
          label="Latest Operator decision"
          value={status.operatorDecision}
        />
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
    <Notice type="warning">
      <div className="grid gap-2">
        <strong>Skipped Work Card files</strong>
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

function InvalidBuilderPromptFiles({
  files,
}: {
  files: ChampCityInvalidBuilderPromptArtifactFile[];
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
  options: ChampCityBuilderPromptArtifactOption[];
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
  validation: ChampCityBuilderReportValidationResult;
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

function BuilderReportWarnings({
  validation,
}: {
  validation: ChampCityBuilderReportValidationResult;
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
      No Repair Implementer Prompt will be generated for the current result and
      Operator decision.
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

function emptyBuilderPromptArtifactOptions(): ChampCityBuilderPromptArtifactOptions {
  return {
    workCardMarkdown: [],
    architectPrompts: [],
    riskReviews: [],
    priorBuilderReports: [],
  };
}

function cleanBuilderPromptSelections(
  selections: ChampCityBuilderPromptSupportingArtifactFileNames,
): ChampCityBuilderPromptSupportingArtifactFileNames {
  return {
    workCardMarkdown: nonBlankSelection(selections.workCardMarkdown),
    architectPrompt: nonBlankSelection(selections.architectPrompt),
    riskReview: nonBlankSelection(selections.riskReview),
    priorBuilderReport: nonBlankSelection(selections.priorBuilderReport),
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

  if (status === "ready_for_builder") {
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

  if (result === "Partial") {
    return "border-amber-400/20 bg-amber-400/10 text-amber-300";
  }

  if (result === "Blocked") {
    return "border-orange-400/20 bg-orange-400/10 text-orange-300";
  }

  return "border-border bg-muted text-muted-foreground";
}

function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}
