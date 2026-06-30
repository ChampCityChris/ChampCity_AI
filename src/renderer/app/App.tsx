import {
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
  ClipboardList,
  Copy,
  Eye,
  FileText,
  FolderOpen,
  Info,
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
const workCardJsonSelectorHelp =
  "Only Work Cards with JSON artifacts can be selected. Markdown-only notes are compatibility records, not app-readable Work Cards.";

const workflowSteps: WorkflowStep[] = [
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

const inputCls =
  "w-full min-w-0 rounded-md border border-border bg-white/[0.04] px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/50 transition-colors focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/40";
const selectCls =
  "w-full min-w-0 rounded-md border border-border bg-[#0e1218] px-3 py-1.5 text-sm text-foreground transition-colors [color-scheme:dark] focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/40";
const textareaCls =
  inputCls + " min-h-[64px] resize-y py-2 leading-relaxed";

export default function App() {
  const appInfo = useMemo(() => window.champCity.getAppInfo(), []);
  const [activeScreen, setActiveScreen] =
    useState<AppScreen>("new-work-card");
  const [phase, setPhase] = useState(defaultPhase);
  const [activeCard, setActiveCard] = useState<UiWorkCardSummary | null>(null);

  const screen = {
    "new-work-card": (
      <NewWorkCardScreen
        phase={phase}
        onPhaseChange={setPhase}
        onActiveCardChange={setActiveCard}
      />
    ),
    "architect-prompt-composer": (
      <ArchitectPromptComposerScreen
        phase={phase}
        onPhaseChange={setPhase}
        onActiveCardChange={setActiveCard}
      />
    ),
    "risk-router": (
      <RiskRouterScreen
        phase={phase}
        onPhaseChange={setPhase}
        onActiveCardChange={setActiveCard}
      />
    ),
    "builder-prompt-generator": (
      <BuilderPromptGeneratorScreen
        phase={phase}
        onPhaseChange={setPhase}
        onActiveCardChange={setActiveCard}
      />
    ),
    "builder-report-capture": (
      <BuilderReportCaptureScreen
        phase={phase}
        onPhaseChange={setPhase}
        onActiveCardChange={setActiveCard}
      />
    ),
    "human-validation": (
      <HumanValidationScreen
        phase={phase}
        onPhaseChange={setPhase}
        onActiveCardChange={setActiveCard}
      />
    ),
    "phase-closeout": (
      <PhaseCloseoutScreen phase={phase} onPhaseChange={setPhase} />
    ),
  }[activeScreen];

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <AppHeader
        appName={appInfo.name}
        phase={phase}
        activeCard={activeCard}
        activeScreen={activeScreen}
        onNav={setActiveScreen}
      />
      <div className="min-h-0 flex-1 overflow-hidden">{screen}</div>
    </div>
  );
}

function AppHeader({
  appName,
  phase,
  activeCard,
  activeScreen,
  onNav,
}: {
  appName: string;
  phase: string;
  activeCard: UiWorkCardSummary | null;
  activeScreen: AppScreen;
  onNav: (screen: AppScreen) => void;
}) {
  const activeStep = getWorkflowStep(activeScreen);

  return (
    <header className="shrink-0 border-b border-border bg-card/95">
      <div className="flex min-h-[76px] items-center gap-4 px-4 py-3 max-[1060px]:grid max-[1060px]:grid-cols-[minmax(180px,260px)_1fr] max-[1060px]:items-center max-[720px]:grid-cols-1">
        <div className="min-w-0 shrink-0">
          <img
            src={logoImage}
            alt={`${appName} Architect / Implementer`}
            className="block h-auto w-[min(250px,30vw)] min-w-[170px] object-contain max-[720px]:w-[230px]"
          />
        </div>
        <PipelineStepper active={activeScreen} onNav={onNav} />
        <div className="ml-auto grid min-w-[230px] max-w-[330px] grid-cols-[auto_auto_1fr] items-center gap-2 border-l border-border pl-4 max-[1060px]:col-span-2 max-[1060px]:ml-0 max-[1060px]:max-w-none max-[1060px]:border-l-0 max-[1060px]:pl-0 max-[720px]:grid-cols-1">
          <Badge className="border-border bg-white/[0.03] text-muted-foreground">
            {phase}
          </Badge>
          <Badge
            className={cn(
              "border-border bg-white/[0.03]",
              activeStep.mode === "architect"
                ? "text-blue-300"
                : "text-primary",
            )}
          >
            {activeStep.mode}
          </Badge>
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold text-foreground">
              {activeStep.screenTitle}
            </div>
            <div className="break-anywhere text-[11px] leading-snug text-muted-foreground/70">
              {activeCard
                ? `${activeCard.workCardId} - ${activeCard.title}`
                : activeStep.nextAction}
            </div>
          </div>
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

  return (
    <nav
      aria-label="Work Card pipeline"
      className="flex min-w-0 flex-1 items-center justify-center gap-1 overflow-x-auto overflow-y-hidden py-1 max-[1060px]:col-span-2 max-[1060px]:justify-start"
    >
      {workflowSteps.map((step, index) => {
        const isActive = step.id === active;
        const isDone = index < activeIndex;
        const Icon = step.Icon;

        return (
          <button
            key={step.id}
            type="button"
            title={step.shortDesc}
            onClick={() => onNav(step.id)}
            className={cn(
              "flex min-w-max items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
              isActive &&
                step.mode === "architect" &&
                "bg-blue-500/15 text-blue-300",
              isActive &&
                step.mode === "implementer" &&
                "bg-primary/15 text-primary",
              !isActive &&
                isDone &&
                "text-muted-foreground/80 hover:bg-white/[0.04] hover:text-foreground",
              !isActive &&
                !isDone &&
                "text-muted-foreground/55 hover:bg-white/[0.03] hover:text-muted-foreground",
            )}
          >
            <Icon size={13} className="shrink-0" />
            <span>{step.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function NewWorkCardScreen({
  phase,
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
            <PhaseField phase={phase} onPhaseChange={onPhaseChange} />
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
            <PhaseField phase={phase} onPhaseChange={onPhaseChange} />
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
            <PhaseField phase={phase} onPhaseChange={onPhaseChange} />
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

    const text = await file.text();
    setReportText(text);
    setTopic((previous) =>
      previous.trim().length > 0
        ? previous
        : file.name.replace(/\.(md|txt)$/i, "").replace(/[_-]+/g, " "),
    );
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
            <PhaseField phase={phase} onPhaseChange={onPhaseChange} />
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
  onPhaseChange,
  onActiveCardChange,
}: ScreenProps) {
  const { workCards, invalidFiles, errors: listErrors, isLoading } =
    useWorkCards(phase);
  const [selectedFileName, setSelectedFileName] = useState("");
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
  const [statusMessage, setStatusMessage] = useState("Select a Work Card to validate.");
  const [isBusy, setIsBusy] = useState(false);
  const [saveResult, setSaveResult] =
    useState<ChampCityHumanValidationSaveResult | null>(null);

  const selectedWorkCard = useSelectedWorkCard(
    workCards,
    selectedFileName,
    onActiveCardChange,
  );

  useDefaultSelectedFile(workCards, selectedFileName, setSelectedFileName);

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
        workCardFileName: selectedFileName,
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
        setSelectedBuilderReportFileName((previous) =>
          options.some((option) => option.fileName === previous)
            ? previous
            : result.defaultFileName ?? "",
        );
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
  }, [phase, selectedFileName]);

  const validationInput = useMemo<ChampCityHumanValidationFormInput | null>(() => {
    if (selectedFileName.trim().length === 0) {
      return null;
    }

    return {
      phase,
      workCardFileName: selectedFileName,
      builderReportFileName:
        selectedBuilderReportFileName.trim().length > 0
          ? selectedBuilderReportFileName
          : undefined,
      ...form,
    };
  }, [phase, selectedFileName, selectedBuilderReportFileName, form]);

  useEffect(() => {
    if (!validationInput) {
      setPreviewResult(null);
      setStatusMessage(isLoading ? "Loading saved Work Cards." : "Select a Work Card to validate.");
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

  async function saveValidation() {
    if (!validationInput) {
      setErrors(["Select a saved Work Card before saving validation."]);
      return;
    }

    setIsBusy(true);
    setErrors([]);

    const result = await window.champCity.saveHumanValidationRecord(validationInput);

    setIsBusy(false);
    setPreviewResult(result);

    if (!result.ok) {
      setErrors(result.errorMessages ?? ["The validation record could not be saved."]);
      setStatusMessage("Save needs attention.");
      return;
    }

    setSaveResult(result);
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
          <ErrorList errors={[...listErrors, ...errors]} />
          <FieldGroup title="Source">
            <PhaseField phase={phase} onPhaseChange={onPhaseChange} />
            <WorkCardSelect
              workCards={workCards}
              selectedFileName={selectedFileName}
              onChange={setSelectedFileName}
              isLoading={isLoading}
            />
            {selectedWorkCard ? <WorkCardSummary card={selectedWorkCard} /> : null}
            <InvalidWorkCardFiles files={invalidFiles} />
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
          onSave={() => void saveValidation()}
          saveLabel="Save"
          saveDisabled={!validationInput || isBusy}
          emptyMessage="Select a Work Card to preview validation."
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
              <TextAreaField
                label="Screenshots or files by path"
                value={form.screenshotOrFileReferences}
                rows={2}
                onChange={(value) =>
                  updateForm("screenshotOrFileReferences", value)
                }
              />
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
  onPhaseChange,
}: {
  phase: string;
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
            <PhaseField phase={phase} onPhaseChange={onPhaseChange} />
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
  saveLabel?: string;
  copyLabel?: string;
  saveDisabled?: boolean;
  copyDisabled?: boolean;
  statusMessage?: string;
  statusType?: "success" | "error";
}) {
  return (
    <div className="sticky bottom-0 mt-auto flex items-center justify-between gap-3 border-t border-white/[0.05] bg-card/95 pt-3 max-[520px]:flex-col max-[520px]:items-stretch">
      <div className="min-h-[20px] min-w-0">
        {statusMessage ? (
          <span
            className={cn(
              "break-anywhere flex items-center gap-1.5 text-[11px] font-medium",
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
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        {onPreview ? (
          <IconButton icon={Eye} label="Preview" onClick={onPreview} />
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
        "inline-flex min-h-8 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40",
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
  onPhaseChange,
}: {
  phase: string;
  onPhaseChange: (phase: string) => void;
}) {
  return (
    <TextField label="Phase" value={phase} onChange={onPhaseChange} required />
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

function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}
