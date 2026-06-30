const h = React.createElement;

type AppScreen =
  | "new-work-card"
  | "architect-prompt-composer"
  | "risk-router"
  | "builder-prompt-generator"
  | "builder-report-capture"
  | "human-validation"
  | "phase-closeout";

const defaultPhase = "phase-01";
const appIconPath =
  "./assets/champcity_ai_icon_clean_no_shadow_TRANSPARENT.png";
const workCardJsonSelectorHelp =
  "Only Work Cards with JSON artifacts can be selected. Markdown-only notes are not app-readable Work Cards.";

interface WorkflowStep {
  id: AppScreen;
  label: string;
  detail: string;
  lane: "Architect" | "Implementer";
  screenTitle: string;
  nextAction: string;
}

const workflowSteps: WorkflowStep[] = [
  {
    id: "new-work-card",
    label: "Capture",
    detail: "Define intent",
    lane: "Architect",
    screenTitle: "New Work Card",
    nextAction: "Capture the Operator intent and save paired JSON/Markdown.",
  },
  {
    id: "architect-prompt-composer",
    label: "Architect",
    detail: "Refine scope",
    lane: "Architect",
    screenTitle: "Architect Prompt Composer",
    nextAction: "Send the Work Card to the Architect for framing.",
  },
  {
    id: "risk-router",
    label: "Risk",
    detail: "Pre-flight check",
    lane: "Architect",
    screenTitle: "Risk Router",
    nextAction: "Check risk before implementation handoff.",
  },
  {
    id: "builder-prompt-generator",
    label: "Build",
    detail: "Implementer handoff",
    lane: "Implementer",
    screenTitle: "Implementer Prompt Generator",
    nextAction: "Generate a copy-ready prompt for Codex, Claude Code, Cursor, or another coding agent.",
  },
  {
    id: "builder-report-capture",
    label: "Report",
    detail: "Capture evidence",
    lane: "Implementer",
    screenTitle: "Implementer Report Capture",
    nextAction: "Record what the Implementer actually changed and validated.",
  },
  {
    id: "human-validation",
    label: "Validate",
    detail: "Confirm it worked",
    lane: "Implementer",
    screenTitle: "Human Validation",
    nextAction: "Capture manual validation and generate repair prompts only when needed.",
  },
  {
    id: "phase-closeout",
    label: "Closeout",
    detail: "Phase decision",
    lane: "Implementer",
    screenTitle: "Phase Closeout",
    nextAction: "Review phase artifacts and record the closeout decision.",
  },
];

const initialForm: ChampCityWorkCardDraftInput = {
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

function App(): unknown {
  const appInfo = React.useMemo(() => window.champCity.getAppInfo(), []);
  const [activeScreen, setActiveScreen] =
    React.useState<AppScreen>("new-work-card");
  const activeStep = getWorkflowStep(activeScreen);

  return h(
    "main",
    { className: "app-shell" },
    h(
      "header",
      { className: "top-bar" },
      h(
        "div",
        { className: "brand-block" },
        h("img", {
          src: appIconPath,
          alt: "ChampCity A/I",
          className: "brand-mark",
        }),
        h(
          "div",
          null,
          h("p", { className: "eyebrow" }, "Architect / Implementer"),
          h("h1", null, appInfo.name),
        ),
      ),
      renderWorkflowStepper(activeScreen, setActiveScreen),
      h(
        "div",
        { className: "step-context", "aria-label": "Current workflow context" },
        h("span", { className: "context-chip" }, defaultPhase),
        h("span", { className: "context-chip" }, activeStep.lane),
        h(
          "div",
          { className: "context-copy" },
          h("strong", null, activeStep.screenTitle),
          h("span", null, activeStep.nextAction),
        ),
      ),
    ),
    activeScreen === "new-work-card"
      ? h(NewWorkCardScreen)
      : activeScreen === "architect-prompt-composer"
        ? h(ArchitectPromptComposerScreen)
        : activeScreen === "risk-router"
          ? h(RiskRouterScreen)
          : activeScreen === "builder-prompt-generator"
            ? h(BuilderPromptGeneratorScreen)
            : activeScreen === "builder-report-capture"
              ? h(BuilderReportCaptureScreen)
              : activeScreen === "human-validation"
                ? h(HumanValidationScreen)
                : h(PhaseCloseoutScreen),
  );
}

function getScreenTitle(activeScreen: AppScreen): string {
  return getWorkflowStep(activeScreen).screenTitle;
}

function getWorkflowStep(activeScreen: AppScreen): WorkflowStep {
  return (
    workflowSteps.find((step) => step.id === activeScreen) ?? workflowSteps[0]
  );
}

function renderWorkflowStepper(
  activeScreen: AppScreen,
  setActiveScreen: (screen: AppScreen) => void,
): unknown {
  return h(
    "nav",
    { className: "workflow-rail", "aria-label": "Work Card pipeline" },
    ...workflowSteps.map((step, index) =>
      h(
        "div",
        { key: step.id, className: "workflow-node-wrap" },
        h(
          "button",
          {
            type: "button",
            className:
              step.id === activeScreen
                ? `nav-button active ${step.lane.toLowerCase()}`
                : `nav-button ${step.lane.toLowerCase()}`,
            title: step.detail,
            onClick: () => setActiveScreen(step.id),
          },
          h("span", { className: "step-dot" }, String(index + 1)),
          h(
            "span",
            { className: "step-copy" },
            h("strong", null, step.label),
            h("small", null, step.detail),
          ),
        ),
        index === 2
          ? h("span", { className: "ai-divider", "aria-label": "A/I boundary" }, "A/I")
          : null,
      ),
    ),
  );
}

function NewWorkCardScreen(): unknown {
  const [form, setForm] =
    React.useState<ChampCityWorkCardDraftInput>(initialForm);
  const [idEdited, setIdEdited] = React.useState(false);
  const [errors, setErrors] = React.useState<string[]>([]);
  const [previewMarkdown, setPreviewMarkdown] = React.useState("");
  const [isBusy, setIsBusy] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState(
    "Draft status: ready_for_architect",
  );
  const [saveResult, setSaveResult] =
    React.useState<ChampCityWorkCardSaveResult | null>(null);

  React.useEffect(() => {
    let active = true;

    window.champCity
      .getNextWorkCardId(form.phase)
      .then((result: ChampCityNextWorkCardIdResult) => {
        if (!active || idEdited || !result.ok || !result.workCardId) {
          return;
        }

        setForm((previous) => ({
          ...previous,
          workCardId: result.workCardId ?? previous.workCardId,
        }));
      })
      .catch(() => {
        if (active) {
          setStatusMessage("Draft status: ready_for_architect");
        }
      });

    return () => {
      active = false;
    };
  }, [form.phase, idEdited]);

  function updateField(field: keyof ChampCityWorkCardDraftInput, value: string) {
    if (field === "workCardId") {
      setIdEdited(true);
    }

    setForm(
      (previous) =>
        ({
          ...previous,
          [field]: value,
        }) as ChampCityWorkCardDraftInput,
    );
    setSaveResult(null);
  }

  async function previewWorkCard(): Promise<void> {
    const nextErrors = validateForm(form);

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

  async function saveWorkCard(event: Event): Promise<void> {
    event.preventDefault();

    const nextErrors = validateForm(form);

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
  }

  return h(
    "section",
    { className: "workspace", "aria-label": "New Work Card capture" },
    h(
      "form",
      { className: "capture-panel", onSubmit: saveWorkCard },
      h(
        "div",
        { className: "form-header" },
        h("h2", null, "Operator Intent"),
        h("span", { className: "status-pill" }, "ready_for_architect"),
      ),
      renderErrors(errors),
      h(
        "div",
        { className: "field-grid" },
        renderInputField(
          "workCardId",
          "Work Card ID",
          form.workCardId,
          updateField,
          true,
        ),
        renderInputField("title", "Title", form.title, updateField, true),
        renderInputField("phase", "Phase", form.phase, updateField, true),
        renderSelectField("riskLevel", form.riskLevel, updateField),
      ),
      renderTextAreaField(
        "problem",
        "What are you trying to build or fix?",
        form.problem,
        updateField,
        true,
        4,
      ),
      renderTextAreaField(
        "importance",
        "Why does this matter?",
        form.importance,
        updateField,
        false,
        3,
      ),
      renderTextAreaField(
        "userOutcome",
        "What should the user be able to do when this is done?",
        form.userOutcome,
        updateField,
        true,
        4,
      ),
      h(
        "div",
        { className: "two-column" },
        renderTextAreaField(
          "scope",
          "What should be included?",
          form.scope,
          updateField,
          false,
          5,
        ),
        renderTextAreaField(
          "outOfScope",
          "What should not be included?",
          form.outOfScope,
          updateField,
          false,
          5,
        ),
      ),
      h(
        "div",
        { className: "two-column" },
        renderTextAreaField(
          "knownSystems",
          "Known files, screens, or systems involved",
          form.knownSystems,
          updateField,
          false,
          4,
        ),
        renderTextAreaField(
          "evidence",
          "Evidence or examples",
          form.evidence,
          updateField,
          false,
          4,
        ),
      ),
      h(
        "div",
        { className: "two-column" },
        renderTextAreaField(
          "risks",
          "Concerns or risks",
          form.risks,
          updateField,
          false,
          4,
        ),
        renderTextAreaField(
          "operatorNotes",
          "Operator notes",
          form.operatorNotes,
          updateField,
          false,
          4,
        ),
      ),
      h(
        "div",
        { className: "actions" },
        h(
          "button",
          {
            type: "button",
            className: "button secondary",
            disabled: isBusy,
            onClick: () => {
              void previewWorkCard();
            },
          },
          "Preview Markdown",
        ),
        h(
          "button",
          {
            type: "submit",
            className: "button primary",
            disabled: isBusy,
          },
          "Save Work Card",
        ),
      ),
    ),
    h(
      "aside",
      { className: "preview-panel", "aria-label": "Markdown preview" },
      h(
        "div",
        { className: "preview-header" },
        h(
          "div",
          null,
          h("p", { className: "eyebrow" }, "Markdown"),
          h("h2", null, "Preview"),
        ),
        h("span", { className: "status-text" }, statusMessage),
      ),
      saveResult?.markdownPath && saveResult.jsonPath
        ? h(
            "div",
            { className: "save-result", role: "status" },
            h("h3", null, "Saved"),
            h("p", null, "Markdown: ", h("code", null, saveResult.markdownPath)),
            h("p", null, "JSON: ", h("code", null, saveResult.jsonPath)),
          )
        : null,
      h(
        "pre",
        { className: "markdown-preview" },
        previewMarkdown || "No preview yet.",
      ),
    ),
  );
}

function ArchitectPromptComposerScreen(): unknown {
  const [phase, setPhase] = React.useState(defaultPhase);
  const [workCards, setWorkCards] = React.useState<
    ChampCitySavedWorkCardSummary[]
  >([]);
  const [invalidFiles, setInvalidFiles] = React.useState<
    ChampCityInvalidSavedWorkCardFile[]
  >([]);
  const [selectedFileName, setSelectedFileName] = React.useState("");
  const [prompt, setPrompt] = React.useState("");
  const [errors, setErrors] = React.useState<string[]>([]);
  const [statusMessage, setStatusMessage] =
    React.useState("Loading saved Work Cards.");
  const [copyMessage, setCopyMessage] = React.useState("");
  const [isListBusy, setIsListBusy] = React.useState(false);
  const [isPromptBusy, setIsPromptBusy] = React.useState(false);
  const [saveResult, setSaveResult] =
    React.useState<ChampCityArchitectPromptSaveResult | null>(null);

  React.useEffect(() => {
    let active = true;

    setIsListBusy(true);
    setErrors([]);
    setCopyMessage("");

    window.champCity
      .listSavedWorkCards(phase)
      .then((result: ChampCityListSavedWorkCardsResult) => {
        if (!active) {
          return;
        }

        setIsListBusy(false);

        if (!result.ok) {
          setWorkCards([]);
          setInvalidFiles([]);
          setSelectedFileName("");
          setPrompt("");
          setErrors(result.errorMessages ?? ["Saved Work Cards could not be loaded."]);
          setStatusMessage("Saved Work Cards could not be loaded.");
          return;
        }

        const nextWorkCards = result.workCards ?? [];

        setWorkCards(nextWorkCards);
        setInvalidFiles(result.invalidFiles ?? []);
        setSelectedFileName((previous) =>
          nextWorkCards.some((workCard) => workCard.fileName === previous)
            ? previous
            : nextWorkCards[0]?.fileName ?? "",
        );

        if (nextWorkCards.length === 0) {
          setPrompt("");
          setStatusMessage("No saved Work Card JSON files found.");
          return;
        }

        setStatusMessage("Saved Work Cards loaded.");
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setIsListBusy(false);
        setWorkCards([]);
        setInvalidFiles([]);
        setSelectedFileName("");
        setPrompt("");
        setErrors(["Saved Work Cards could not be loaded."]);
        setStatusMessage("Saved Work Cards could not be loaded.");
      });

    return () => {
      active = false;
    };
  }, [phase]);

  React.useEffect(() => {
    if (selectedFileName.trim().length === 0) {
      setPrompt("");
      setSaveResult(null);
      return;
    }

    let active = true;

    setIsPromptBusy(true);
    setErrors([]);
    setCopyMessage("");
    setSaveResult(null);

    window.champCity
      .previewArchitectPrompt({ phase, fileName: selectedFileName })
      .then((result: ChampCityArchitectPromptPreviewResult) => {
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
  }, [phase, selectedFileName]);

  const selectedWorkCard =
    workCards.find((workCard) => workCard.fileName === selectedFileName) ?? null;
  const hasWorkCards = workCards.length > 0;

  async function copyPrompt(): Promise<void> {
    if (prompt.trim().length === 0) {
      setCopyMessage("Generate a prompt before copying.");
      return;
    }

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard unavailable.");
      }

      await navigator.clipboard.writeText(prompt);
      setCopyMessage("Prompt copied to clipboard.");
    } catch {
      setCopyMessage(
        "Clipboard access failed. Please manually select and copy the prompt text.",
      );
    }
  }

  async function savePrompt(): Promise<void> {
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

  return h(
    "section",
    {
      className: "workspace prompt-workspace",
      "aria-label": "Architect Prompt Composer",
    },
    h(
      "div",
      { className: "selector-panel" },
      h(
        "div",
        { className: "form-header" },
        h("h2", null, "Saved Work Cards"),
        h("span", { className: "status-pill" }, phase),
      ),
      renderErrors(errors),
      h("p", { className: "selector-help" }, workCardJsonSelectorHelp),
      invalidFiles.length > 0
        ? h(
            "div",
            { className: "warning-box", role: "status" },
            h("h3", null, "Skipped files"),
            h(
              "ul",
              null,
              ...invalidFiles.map((file) =>
                h(
                  "li",
                  { key: file.fileName },
                  `${file.fileName}: ${file.errorMessages.join(" ")}`,
                ),
              ),
            ),
          )
        : null,
      renderPhaseField(phase, setPhase),
      !hasWorkCards
        ? h(
            "div",
            { className: "empty-state", role: "status" },
            "No saved Work Card JSON files were found. Create a draft Work Card from the New Work Card screen first.",
          )
        : h(
            "label",
            { className: "field" },
            h("span", null, "Saved Work Card"),
            h(
              "select",
              {
                value: selectedFileName,
                disabled: isListBusy,
                onChange: (event: Event) => {
                  setSelectedFileName((event.target as HTMLSelectElement).value);
                },
              },
              ...workCards.map((workCard) =>
                h(
                  "option",
                  { key: workCard.fileName, value: workCard.fileName },
                  `${workCard.workCardId} - ${workCard.title} (${workCard.status}, ${workCard.phase})`,
                ),
              ),
            ),
          ),
      selectedWorkCard ? renderSelectedWorkCardSummary(selectedWorkCard) : null,
      selectedWorkCard && selectedWorkCard.status !== "ready_for_architect"
        ? h(
            "div",
            { className: "warning-box", role: "status" },
            "This Work Card is not marked ready_for_architect. You can still generate an Architect prompt, but confirm this is intentional.",
          )
        : null,
    ),
    h(
      "aside",
      { className: "composer-panel", "aria-label": "Architect prompt preview" },
      h(
        "div",
        { className: "preview-header" },
        h(
          "div",
          null,
          h("p", { className: "eyebrow" }, "Architect"),
          h("h2", null, "Prompt"),
        ),
        h("span", { className: "status-text" }, statusMessage),
      ),
      saveResult?.markdownPath
        ? h(
            "div",
            { className: "save-result", role: "status" },
            h("h3", null, "Saved"),
            h("p", null, "Markdown: ", h("code", null, saveResult.markdownPath)),
          )
        : null,
      copyMessage.length > 0
        ? h("div", { className: "notice-box", role: "status" }, copyMessage)
        : null,
      h(
        "pre",
        { className: "markdown-preview prompt-preview" },
        prompt || "No Architect prompt generated yet.",
      ),
      h(
        "div",
        { className: "actions prompt-actions" },
        h(
          "button",
          {
            type: "button",
            className: "button secondary",
            disabled: isPromptBusy || prompt.trim().length === 0,
            onClick: () => {
              void copyPrompt();
            },
          },
          "Copy Prompt",
        ),
        h(
          "button",
          {
            type: "button",
            className: "button primary",
            disabled: isPromptBusy || selectedFileName.trim().length === 0,
            onClick: () => {
              void savePrompt();
            },
          },
          "Save Prompt",
        ),
      ),
    ),
  );
}

function RiskRouterScreen(): unknown {
  const [phase, setPhase] = React.useState(defaultPhase);
  const [workCards, setWorkCards] = React.useState<
    ChampCitySavedWorkCardSummary[]
  >([]);
  const [invalidFiles, setInvalidFiles] = React.useState<
    ChampCityInvalidSavedWorkCardFile[]
  >([]);
  const [selectedFileName, setSelectedFileName] = React.useState("");
  const [riskReview, setRiskReview] =
    React.useState<ChampCityWorkCardRiskReview | null>(null);
  const [errors, setErrors] = React.useState<string[]>([]);
  const [statusMessage, setStatusMessage] =
    React.useState("Loading saved Work Cards.");
  const [isListBusy, setIsListBusy] = React.useState(false);
  const [isReviewBusy, setIsReviewBusy] = React.useState(false);
  const [saveResult, setSaveResult] =
    React.useState<ChampCityRiskReviewSaveResult | null>(null);

  React.useEffect(() => {
    let active = true;

    setIsListBusy(true);
    setErrors([]);

    window.champCity
      .listSavedWorkCards(phase)
      .then((result: ChampCityListSavedWorkCardsResult) => {
        if (!active) {
          return;
        }

        setIsListBusy(false);

        if (!result.ok) {
          setWorkCards([]);
          setInvalidFiles([]);
          setSelectedFileName("");
          setRiskReview(null);
          setErrors(result.errorMessages ?? ["Saved Work Cards could not be loaded."]);
          setStatusMessage("Saved Work Cards could not be loaded.");
          return;
        }

        const nextWorkCards = result.workCards ?? [];

        setWorkCards(nextWorkCards);
        setInvalidFiles(result.invalidFiles ?? []);
        setSelectedFileName((previous) =>
          nextWorkCards.some((workCard) => workCard.fileName === previous)
            ? previous
            : nextWorkCards[0]?.fileName ?? "",
        );

        if (nextWorkCards.length === 0) {
          setRiskReview(null);
          setStatusMessage("No saved Work Card JSON files found.");
          return;
        }

        setStatusMessage("Saved Work Cards loaded.");
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setIsListBusy(false);
        setWorkCards([]);
        setInvalidFiles([]);
        setSelectedFileName("");
        setRiskReview(null);
        setErrors(["Saved Work Cards could not be loaded."]);
        setStatusMessage("Saved Work Cards could not be loaded.");
      });

    return () => {
      active = false;
    };
  }, [phase]);

  React.useEffect(() => {
    if (selectedFileName.trim().length === 0) {
      setRiskReview(null);
      setSaveResult(null);
      return;
    }

    let active = true;

    setIsReviewBusy(true);
    setErrors([]);
    setSaveResult(null);

    window.champCity
      .previewRiskReview({ phase, fileName: selectedFileName })
      .then((result: ChampCityRiskReviewPreviewResult) => {
        if (!active) {
          return;
        }

        setIsReviewBusy(false);

        if (!result.ok || !result.review) {
          setRiskReview(null);
          setErrors(result.errorMessages ?? ["The risk review could not be generated."]);
          setStatusMessage("Risk review generation needs attention.");
          return;
        }

        setRiskReview(result.review);
        setStatusMessage("Risk review generated.");
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setIsReviewBusy(false);
        setRiskReview(null);
        setErrors(["The risk review could not be generated."]);
        setStatusMessage("Risk review generation needs attention.");
      });

    return () => {
      active = false;
    };
  }, [phase, selectedFileName]);

  const selectedWorkCard =
    workCards.find((workCard) => workCard.fileName === selectedFileName) ?? null;
  const hasWorkCards = workCards.length > 0;

  async function saveReview(): Promise<void> {
    if (selectedFileName.trim().length === 0) {
      setErrors(["Select a saved Work Card before saving a risk review."]);
      return;
    }

    setIsReviewBusy(true);
    setErrors([]);

    const result = await window.champCity.saveRiskReview({
      phase,
      fileName: selectedFileName,
    });

    setIsReviewBusy(false);

    if (!result.ok || !result.review) {
      setErrors(result.errorMessages ?? ["The risk review could not be saved."]);
      setStatusMessage("Save needs attention.");
      return;
    }

    setRiskReview(result.review);
    setSaveResult(result);
    setStatusMessage("Risk review saved.");
  }

  return h(
    "section",
    {
      className: "workspace prompt-workspace",
      "aria-label": "Risk Router",
    },
    h(
      "div",
      { className: "selector-panel" },
      h(
        "div",
        { className: "form-header" },
        h("h2", null, "Saved Work Cards"),
        h("span", { className: "status-pill" }, phase),
      ),
      renderErrors(errors),
      h("p", { className: "selector-help" }, workCardJsonSelectorHelp),
      invalidFiles.length > 0
        ? h(
            "div",
            { className: "warning-box", role: "status" },
            h("h3", null, "Skipped files"),
            h(
              "ul",
              null,
              ...invalidFiles.map((file) =>
                h(
                  "li",
                  { key: file.fileName },
                  `${file.fileName}: ${file.errorMessages.join(" ")}`,
                ),
              ),
            ),
          )
        : null,
      renderPhaseField(phase, setPhase),
      !hasWorkCards
        ? h(
            "div",
            { className: "empty-state", role: "status" },
            "No saved Work Card JSON files were found. Create a draft Work Card from the New Work Card screen first.",
          )
        : h(
            "label",
            { className: "field" },
            h("span", null, "Saved Work Card"),
            h(
              "select",
              {
                value: selectedFileName,
                disabled: isListBusy,
                onChange: (event: Event) => {
                  setSelectedFileName((event.target as HTMLSelectElement).value);
                },
              },
              ...workCards.map((workCard) =>
                h(
                  "option",
                  { key: workCard.fileName, value: workCard.fileName },
                  `${workCard.workCardId} - ${workCard.title} (${workCard.phase})`,
                ),
              ),
            ),
          ),
      selectedWorkCard ? renderSelectedWorkCardSummary(selectedWorkCard) : null,
    ),
    h(
      "aside",
      { className: "composer-panel", "aria-label": "Risk review" },
      h(
        "div",
        { className: "preview-header" },
        h(
          "div",
          null,
          h("p", { className: "eyebrow" }, "Deterministic"),
          h("h2", null, "Risk Review"),
        ),
        h("span", { className: "status-text" }, statusMessage),
      ),
      saveResult?.markdownPath
        ? h(
            "div",
            { className: "save-result", role: "status" },
            h("h3", null, "Saved"),
            h("p", null, "Markdown: ", h("code", null, saveResult.markdownPath)),
          )
        : null,
      riskReview ? renderRiskReview(riskReview) : renderNoRiskReviewState(),
      h(
        "div",
        { className: "actions prompt-actions" },
        h(
          "button",
          {
            type: "button",
            className: "button primary",
            disabled: isReviewBusy || selectedFileName.trim().length === 0,
            onClick: () => {
              void saveReview();
            },
          },
          "Save Risk Review",
        ),
      ),
    ),
  );
}

function BuilderPromptGeneratorScreen(): unknown {
  const [phase, setPhase] = React.useState(defaultPhase);
  const [workCards, setWorkCards] = React.useState<
    ChampCitySavedWorkCardSummary[]
  >([]);
  const [invalidFiles, setInvalidFiles] = React.useState<
    ChampCityInvalidSavedWorkCardFile[]
  >([]);
  const [selectedFileName, setSelectedFileName] = React.useState("");
  const [artifactOptions, setArtifactOptions] =
    React.useState<ChampCityBuilderPromptArtifactOptions>(
      emptyBuilderPromptArtifactOptions,
    );
  const [supportSelections, setSupportSelections] =
    React.useState<ChampCityBuilderPromptSupportingArtifactFileNames>({});
  const [artifactNotes, setArtifactNotes] = React.useState<string[]>([]);
  const [artifactInvalidFiles, setArtifactInvalidFiles] = React.useState<
    ChampCityInvalidBuilderPromptArtifactFile[]
  >([]);
  const [prompt, setPrompt] = React.useState("");
  const [errors, setErrors] = React.useState<string[]>([]);
  const [statusMessage, setStatusMessage] =
    React.useState("Loading saved Work Cards.");
  const [copyMessage, setCopyMessage] = React.useState("");
  const [isListBusy, setIsListBusy] = React.useState(false);
  const [isArtifactBusy, setIsArtifactBusy] = React.useState(false);
  const [isPromptBusy, setIsPromptBusy] = React.useState(false);
  const [hasHighRiskContext, setHasHighRiskContext] = React.useState(false);
  const [hasRiskReviewSelected, setHasRiskReviewSelected] =
    React.useState(false);
  const [saveResult, setSaveResult] =
    React.useState<ChampCityBuilderPromptSaveResult | null>(null);

  React.useEffect(() => {
    let active = true;

    setIsListBusy(true);
    setErrors([]);
    setCopyMessage("");

    window.champCity
      .listSavedWorkCards(phase)
      .then((result: ChampCityListSavedWorkCardsResult) => {
        if (!active) {
          return;
        }

        setIsListBusy(false);

        if (!result.ok) {
          setWorkCards([]);
          setInvalidFiles([]);
          setSelectedFileName("");
          setPrompt("");
          setErrors(result.errorMessages ?? ["Saved Work Cards could not be loaded."]);
          setStatusMessage("Saved Work Cards could not be loaded.");
          return;
        }

        const nextWorkCards = result.workCards ?? [];

        setWorkCards(nextWorkCards);
        setInvalidFiles(result.invalidFiles ?? []);
        setSelectedFileName((previous) =>
          nextWorkCards.some((workCard) => workCard.fileName === previous)
            ? previous
            : nextWorkCards[0]?.fileName ?? "",
        );

        if (nextWorkCards.length === 0) {
          setPrompt("");
          setStatusMessage("No saved Work Card JSON files found.");
          return;
        }

        setStatusMessage("Saved Work Cards loaded.");
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setIsListBusy(false);
        setWorkCards([]);
        setInvalidFiles([]);
        setSelectedFileName("");
        setPrompt("");
        setErrors(["Saved Work Cards could not be loaded."]);
        setStatusMessage("Saved Work Cards could not be loaded.");
      });

    return () => {
      active = false;
    };
  }, [phase]);

  React.useEffect(() => {
    if (selectedFileName.trim().length === 0) {
      setArtifactOptions(emptyBuilderPromptArtifactOptions());
      setSupportSelections({});
      setArtifactNotes([]);
      setArtifactInvalidFiles([]);
      setPrompt("");
      setSaveResult(null);
      return;
    }

    let active = true;

    setIsArtifactBusy(true);
    setErrors([]);
    setCopyMessage("");
    setSaveResult(null);

    window.champCity
      .listBuilderPromptSupportingArtifacts({
        phase,
        fileName: selectedFileName,
      })
      .then((result: ChampCityBuilderPromptArtifactListResult) => {
        if (!active) {
          return;
        }

        setIsArtifactBusy(false);

        if (!result.ok) {
          setArtifactOptions(emptyBuilderPromptArtifactOptions());
          setSupportSelections({});
          setArtifactNotes([]);
          setArtifactInvalidFiles([]);
          setPrompt("");
          setErrors(result.errorMessages ?? ["Supporting artifacts could not be loaded."]);
          setStatusMessage("Supporting artifacts could not be loaded.");
          return;
        }

        setArtifactOptions(
          result.options ?? emptyBuilderPromptArtifactOptions(),
        );
        setSupportSelections(result.defaultSelections ?? {});
        setArtifactNotes(result.notes ?? []);
        setArtifactInvalidFiles(result.invalidFiles ?? []);
        setStatusMessage("Supporting artifact selectors loaded.");
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setIsArtifactBusy(false);
        setArtifactOptions(emptyBuilderPromptArtifactOptions());
        setSupportSelections({});
        setArtifactNotes([]);
        setArtifactInvalidFiles([]);
        setPrompt("");
        setErrors(["Supporting artifacts could not be loaded."]);
        setStatusMessage("Supporting artifacts could not be loaded.");
      });

    return () => {
      active = false;
    };
  }, [phase, selectedFileName]);

  React.useEffect(() => {
    if (selectedFileName.trim().length === 0) {
      setPrompt("");
      setHasHighRiskContext(false);
      setHasRiskReviewSelected(false);
      setSaveResult(null);
      return;
    }

    let active = true;

    setIsPromptBusy(true);
    setErrors([]);
    setCopyMessage("");
    setSaveResult(null);

    window.champCity
      .previewBuilderPrompt({
        phase,
        fileName: selectedFileName,
        supportingArtifactFileNames:
          cleanBuilderPromptSelections(supportSelections),
      })
      .then((result: ChampCityBuilderPromptPreviewResult) => {
        if (!active) {
          return;
        }

        setIsPromptBusy(false);

        if (!result.ok || !result.prompt) {
          setPrompt("");
          setHasHighRiskContext(false);
          setHasRiskReviewSelected(false);
          setErrors(result.errorMessages ?? ["The Implementer prompt could not be generated."]);
          setStatusMessage("Implementer prompt generation needs attention.");
          return;
        }

        setPrompt(result.prompt);
        setHasHighRiskContext(Boolean(result.hasHighRiskContext));
        setHasRiskReviewSelected(Boolean(result.hasRiskReviewSelected));
        setStatusMessage("Implementer prompt generated.");
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setIsPromptBusy(false);
        setPrompt("");
        setHasHighRiskContext(false);
        setHasRiskReviewSelected(false);
        setErrors(["The Implementer prompt could not be generated."]);
        setStatusMessage("Implementer prompt generation needs attention.");
      });

    return () => {
      active = false;
    };
  }, [
    phase,
    selectedFileName,
    supportSelections.workCardMarkdown,
    supportSelections.architectPrompt,
    supportSelections.riskReview,
    supportSelections.priorBuilderReport,
  ]);

  const selectedWorkCard =
    workCards.find((workCard) => workCard.fileName === selectedFileName) ?? null;
  const hasWorkCards = workCards.length > 0;

  function updateSupportSelection(
    field: keyof ChampCityBuilderPromptSupportingArtifactFileNames,
    value: string,
  ): void {
    setSupportSelections((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function copyPrompt(): Promise<void> {
    if (prompt.trim().length === 0) {
      setCopyMessage("Generate an Implementer prompt before copying.");
      return;
    }

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard unavailable.");
      }

      await navigator.clipboard.writeText(prompt);
      setCopyMessage("Prompt copied to clipboard.");
    } catch {
      setCopyMessage(
        "Clipboard access failed. Please manually select and copy the prompt text.",
      );
    }
  }

  async function savePrompt(): Promise<void> {
    if (selectedFileName.trim().length === 0) {
      setErrors(["Select a saved Work Card before saving an Implementer prompt."]);
      return;
    }

    setIsPromptBusy(true);
    setErrors([]);
    setCopyMessage("");

    const result = await window.champCity.saveBuilderPrompt({
      phase,
      fileName: selectedFileName,
      supportingArtifactFileNames: cleanBuilderPromptSelections(supportSelections),
    });

    setIsPromptBusy(false);

    if (!result.ok || !result.prompt) {
      setErrors(result.errorMessages ?? ["The Implementer prompt could not be saved."]);
      setStatusMessage("Save needs attention.");
      return;
    }

    setPrompt(result.prompt);
    setHasHighRiskContext(Boolean(result.hasHighRiskContext));
    setHasRiskReviewSelected(Boolean(result.hasRiskReviewSelected));
    setSaveResult(result);
    setStatusMessage("Implementer prompt saved.");
  }

  return h(
    "section",
    {
      className: "workspace prompt-workspace",
      "aria-label": "Implementer Prompt Generator",
    },
    h(
      "div",
      { className: "selector-panel" },
      h(
        "div",
        { className: "form-header" },
        h("h2", null, "Source Artifacts"),
        h("span", { className: "status-pill" }, phase),
      ),
      renderErrors(errors),
      h("p", { className: "selector-help" }, workCardJsonSelectorHelp),
      invalidFiles.length > 0
        ? h(
            "div",
            { className: "warning-box", role: "status" },
            h("h3", null, "Skipped Work Card files"),
            h(
              "ul",
              null,
              ...invalidFiles.map((file) =>
                h(
                  "li",
                  { key: file.fileName },
                  `${file.fileName}: ${file.errorMessages.join(" ")}`,
                ),
              ),
            ),
          )
        : null,
      renderPhaseField(phase, setPhase),
      !hasWorkCards
        ? h(
            "div",
            { className: "empty-state", role: "status" },
            "No saved Work Card JSON files were found. Create or backfill a JSON Work Card artifact first.",
          )
        : h(
            "label",
            { className: "field" },
            h("span", null, "Saved Work Card JSON"),
            h(
              "select",
              {
                value: selectedFileName,
                disabled: isListBusy,
                onChange: (event: Event) => {
                  setSelectedFileName((event.target as HTMLSelectElement).value);
                },
              },
              ...workCards.map((workCard) =>
                h(
                  "option",
                  { key: workCard.fileName, value: workCard.fileName },
                  `${workCard.workCardId} - ${workCard.title} (${workCard.status}, ${workCard.phase})`,
                ),
              ),
            ),
          ),
      selectedWorkCard ? renderSelectedWorkCardSummary(selectedWorkCard) : null,
      selectedWorkCard?.riskLevel === "high"
        ? h(
            "div",
            { className: "warning-box", role: "status" },
            "This Work Card has high risk marked in the JSON. The generated prompt will preserve narrow scope and blocker language.",
          )
        : null,
      artifactInvalidFiles.length > 0
        ? renderBuilderPromptInvalidFiles(artifactInvalidFiles)
        : null,
      artifactNotes.length > 0
        ? h(
            "div",
            { className: "notice-box", role: "status" },
            h("h3", null, "Optional artifact notes"),
            h(
              "ul",
              null,
              ...artifactNotes.map((note) => h("li", { key: note }, note)),
            ),
          )
        : null,
      h(
        "div",
        { className: "artifact-selector-grid" },
        renderOptionalArtifactSelect(
          "Work Card Markdown",
          supportSelections.workCardMarkdown ?? "",
          artifactOptions.workCardMarkdown,
          (value) => updateSupportSelection("workCardMarkdown", value),
          "No Work Card Markdown artifact is available.",
        ),
        renderOptionalArtifactSelect(
          "Architect Prompt",
          supportSelections.architectPrompt ?? "",
          artifactOptions.architectPrompts,
          (value) => updateSupportSelection("architectPrompt", value),
          "No Architect Prompt artifact is available.",
        ),
        renderOptionalArtifactSelect(
          "Risk Review",
          supportSelections.riskReview ?? "",
          artifactOptions.riskReviews,
          (value) => updateSupportSelection("riskReview", value),
          "No Risk Review artifact is available.",
        ),
        renderOptionalArtifactSelect(
          "Prior Implementer Report",
          supportSelections.priorBuilderReport ?? "",
          artifactOptions.priorBuilderReports,
          (value) => updateSupportSelection("priorBuilderReport", value),
          "No prior Implementer Report artifact is available.",
        ),
      ),
      isArtifactBusy
        ? h(
            "div",
            { className: "notice-box", role: "status" },
            "Loading supporting artifact selectors.",
          )
        : null,
    ),
    h(
      "aside",
      { className: "composer-panel", "aria-label": "Implementer prompt preview" },
      h(
        "div",
        { className: "preview-header" },
        h(
          "div",
          null,
          h("p", { className: "eyebrow" }, "Implementer"),
          h("h2", null, "Prompt"),
        ),
        h("span", { className: "status-text" }, statusMessage),
      ),
      saveResult?.markdownPath
        ? h(
            "div",
            { className: "save-result", role: "status" },
            h("h3", null, "Saved"),
            h("p", null, "Markdown: ", h("code", null, saveResult.markdownPath)),
          )
        : null,
      copyMessage.length > 0
        ? h("div", { className: "notice-box", role: "status" }, copyMessage)
        : null,
      hasHighRiskContext
        ? h(
            "div",
            { className: "warning-box", role: "status" },
            "High-risk context is present. The generated prompt tells the Implementer not to broaden scope and to stop for blocking questions if risky work appears.",
          )
        : null,
      !hasRiskReviewSelected
        ? h(
            "div",
            { className: "warning-box", role: "status" },
            "No Risk Review artifact is selected. The generated prompt warns the Implementer not to infer approval.",
          )
        : null,
      h(
        "pre",
        { className: "markdown-preview prompt-preview" },
        prompt || "No Implementer prompt generated yet.",
      ),
      h(
        "div",
        { className: "actions prompt-actions" },
        h(
          "button",
          {
            type: "button",
            className: "button secondary",
            disabled: isPromptBusy || prompt.trim().length === 0,
            onClick: () => {
              void copyPrompt();
            },
          },
          "Copy Prompt",
        ),
        h(
          "button",
          {
            type: "button",
            className: "button primary",
            disabled: isPromptBusy || selectedFileName.trim().length === 0,
            onClick: () => {
              void savePrompt();
            },
          },
          "Save Implementer Prompt",
        ),
      ),
    ),
  );
}

function BuilderReportCaptureScreen(): unknown {
  const [phase, setPhase] = React.useState(defaultPhase);
  const [workCards, setWorkCards] = React.useState<
    ChampCitySavedWorkCardSummary[]
  >([]);
  const [invalidFiles, setInvalidFiles] = React.useState<
    ChampCityInvalidSavedWorkCardFile[]
  >([]);
  const [selectedFileName, setSelectedFileName] = React.useState("");
  const [reportType, setReportType] =
    React.useState<ChampCityBuilderReportType>("Work Card");
  const [topic, setTopic] = React.useState("");
  const [topicEdited, setTopicEdited] = React.useState(false);
  const [reportText, setReportText] = React.useState("");
  const [errors, setErrors] = React.useState<string[]>([]);
  const [statusMessage, setStatusMessage] =
    React.useState("Loading saved Work Cards.");
  const [isListBusy, setIsListBusy] = React.useState(false);
  const [isPreviewBusy, setIsPreviewBusy] = React.useState(false);
  const [isSaveBusy, setIsSaveBusy] = React.useState(false);
  const [previewResult, setPreviewResult] =
    React.useState<ChampCityBuilderReportCapturePreviewResult | null>(null);
  const [saveResult, setSaveResult] =
    React.useState<ChampCityBuilderReportCaptureSaveResult | null>(null);

  React.useEffect(() => {
    let active = true;

    setIsListBusy(true);
    setErrors([]);

    window.champCity
      .listSavedWorkCards(phase)
      .then((result: ChampCityListSavedWorkCardsResult) => {
        if (!active) {
          return;
        }

        setIsListBusy(false);

        if (!result.ok) {
          setWorkCards([]);
          setInvalidFiles([]);
          setSelectedFileName("");
          setErrors(result.errorMessages ?? ["Saved Work Cards could not be loaded."]);
          setStatusMessage("Saved Work Cards could not be loaded.");
          return;
        }

        const nextWorkCards = result.workCards ?? [];

        setWorkCards(nextWorkCards);
        setInvalidFiles(result.invalidFiles ?? []);
        setSelectedFileName((previous) =>
          nextWorkCards.some((workCard) => workCard.fileName === previous)
            ? previous
            : nextWorkCards[0]?.fileName ?? "",
        );

        if (nextWorkCards.length === 0) {
          setStatusMessage("No saved Work Card JSON files found.");
          return;
        }

        setStatusMessage("Saved Work Cards loaded.");
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setIsListBusy(false);
        setWorkCards([]);
        setInvalidFiles([]);
        setSelectedFileName("");
        setErrors(["Saved Work Cards could not be loaded."]);
        setStatusMessage("Saved Work Cards could not be loaded.");
      });

    return () => {
      active = false;
    };
  }, [phase]);

  const selectedWorkCard =
    workCards.find((workCard) => workCard.fileName === selectedFileName) ?? null;
  const hasWorkCards = workCards.length > 0;
  const isWorkCardReport = reportType === "Work Card";
  const validation = previewResult?.validation ?? null;
  const combinedErrors = [
    ...errors,
    ...(previewResult?.ok === false ? previewResult.errorMessages ?? [] : []),
  ];

  React.useEffect(() => {
    if (!topicEdited && selectedWorkCard) {
      setTopic(selectedWorkCard.title);
    }
  }, [selectedWorkCard?.fileName, topicEdited]);

  React.useEffect(() => {
    let active = true;

    setIsPreviewBusy(true);

    window.champCity
      .previewBuilderReportCapture({
        phase,
        reportType,
        workCardFileName: nonBlankSelection(selectedFileName),
        topic,
        reportText,
      })
      .then((result: ChampCityBuilderReportCapturePreviewResult) => {
        if (!active) {
          return;
        }

        setIsPreviewBusy(false);
        setPreviewResult(result);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setIsPreviewBusy(false);
        setPreviewResult({
          ok: false,
          errorMessages: ["Implementer Report preview could not be generated."],
        });
      });

    return () => {
      active = false;
    };
  }, [phase, reportType, selectedFileName, topic, reportText]);

  function updateReportType(value: ChampCityBuilderReportType): void {
    setReportType(value);
    setSaveResult(null);
  }

  function updateTopic(value: string): void {
    setTopic(value);
    setTopicEdited(true);
    setSaveResult(null);
  }

  async function importReportFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    input.value = "";

    if (!file) {
      return;
    }

    const lowerName = file.name.toLowerCase();

    if (!lowerName.endsWith(".md") && !lowerName.endsWith(".txt")) {
      setErrors(["Import accepts only .md or .txt report files."]);
      setStatusMessage("Import needs attention.");
      return;
    }

    try {
      const text = await file.text();

      setReportText(text);
      setSaveResult(null);
      setErrors([]);
      setStatusMessage(`Imported ${file.name}. Review the text before saving.`);
    } catch {
      setErrors(["The selected report file could not be read as text."]);
      setStatusMessage("Import needs attention.");
    }
  }

  async function saveReport(): Promise<void> {
    setIsSaveBusy(true);
    setErrors([]);

    const result = await window.champCity.saveBuilderReportCapture({
      phase,
      reportType,
      workCardFileName: nonBlankSelection(selectedFileName),
      topic,
      reportText,
    });

    setIsSaveBusy(false);
    setPreviewResult(result);

    if (!result.ok || !result.markdownPath) {
      setSaveResult(null);
      setErrors(result.errorMessages ?? ["The Implementer Report could not be saved."]);
      setStatusMessage("Save needs attention.");
      return;
    }

    setSaveResult(result);
    setStatusMessage("Implementer Report saved.");
  }

  return h(
    "section",
    {
      className: "workspace report-workspace",
      "aria-label": "Implementer Report Capture",
    },
    h(
      "div",
      { className: "selector-panel report-selector-panel" },
      h(
        "div",
        { className: "form-header" },
        h("h2", null, "Report Source"),
        h("span", { className: "status-pill" }, phase),
      ),
      renderErrors(combinedErrors),
      h("p", { className: "selector-help" }, workCardJsonSelectorHelp),
      invalidFiles.length > 0
        ? h(
            "div",
            { className: "warning-box", role: "status" },
            h("h3", null, "Skipped Work Card files"),
            h(
              "ul",
              null,
              ...invalidFiles.map((file) =>
                h(
                  "li",
                  { key: file.fileName },
                  `${file.fileName}: ${file.errorMessages.join(" ")}`,
                ),
              ),
            ),
          )
        : null,
      renderPhaseField(phase, setPhase),
      renderReportTypeSelect(reportType, updateReportType),
      !hasWorkCards
        ? h(
            "div",
            { className: "empty-state", role: "status" },
            "No saved Work Card JSON files were found. Work Card reports require a saved Work Card JSON artifact.",
          )
        : h(
            "label",
            { className: "field" },
            h("span", null, isWorkCardReport ? "Saved Work Card JSON" : "Associated Work Card"),
            h(
              "select",
              {
                value: selectedFileName,
                disabled: isListBusy,
                onChange: (event: Event) => {
                  setSelectedFileName((event.target as HTMLSelectElement).value);
                  setSaveResult(null);
                },
              },
              ...(isWorkCardReport
                ? []
                : [h("option", { key: "none", value: "" }, "No associated Work Card")]),
              ...workCards.map((workCard) =>
                h(
                  "option",
                  { key: workCard.fileName, value: workCard.fileName },
                  `${workCard.workCardId} - ${workCard.title} (${workCard.status}, ${workCard.phase})`,
                ),
              ),
            ),
          ),
      selectedWorkCard ? renderSelectedWorkCardSummary(selectedWorkCard) : null,
      h(
        "label",
        { className: "field" },
        h("span", null, "Short topic / slug"),
        h("input", {
          value: topic,
          onChange: (event: Event) => {
            updateTopic((event.target as HTMLInputElement).value);
          },
        }),
      ),
      h(
        "label",
        { className: "field" },
        h("span", null, "Import Markdown or text report"),
        h("input", {
          type: "file",
          accept: ".md,.txt,text/markdown,text/plain",
          onChange: (event: Event) => {
            void importReportFile(event);
          },
        }),
      ),
      previewResult?.savedFileName
        ? h(
            "div",
            { className: "notice-box", role: "status" },
            h("h3", null, "Generated filename"),
            h("p", null, h("code", null, previewResult.savedFileName)),
          )
        : null,
      isPreviewBusy
        ? h(
            "div",
            { className: "notice-box", role: "status" },
            "Checking report text and filename.",
          )
        : null,
    ),
    h(
      "aside",
      { className: "composer-panel report-editor-panel", "aria-label": "Implementer Report text" },
      h(
        "div",
        { className: "preview-header" },
        h(
          "div",
          null,
          h("p", { className: "eyebrow" }, "Implementer Report"),
          h("h2", null, "Capture"),
        ),
        h("span", { className: "status-text" }, statusMessage),
      ),
      saveResult?.markdownPath
        ? h(
            "div",
            { className: "save-result", role: "status" },
            h("h3", null, "Saved"),
            h("p", null, "Markdown: ", h("code", null, saveResult.markdownPath)),
          )
        : null,
      h(
        "label",
        { className: "field report-text-field" },
        h("span", null, "Implementer Report Markdown"),
        h("textarea", {
          value: reportText,
          rows: 18,
          onChange: (event: Event) => {
            setReportText((event.target as HTMLTextAreaElement).value);
            setSaveResult(null);
          },
        }),
      ),
      validation ? renderBuilderReportDetection(validation) : null,
      validation ? renderBuilderReportWarnings(validation) : null,
      h(
        "div",
        { className: "actions prompt-actions" },
        h(
          "button",
          {
            type: "button",
            className: "button primary",
            disabled:
              isSaveBusy ||
              !previewResult?.ok ||
              !validation?.validEnoughToSave ||
              (isWorkCardReport && selectedFileName.trim().length === 0),
            onClick: () => {
              void saveReport();
            },
          },
          "Save Implementer Report",
        ),
      ),
    ),
  );
}

function HumanValidationScreen(): unknown {
  const [phase, setPhase] = React.useState(defaultPhase);
  const [workCards, setWorkCards] = React.useState<
    ChampCitySavedWorkCardSummary[]
  >([]);
  const [invalidFiles, setInvalidFiles] = React.useState<
    ChampCityInvalidSavedWorkCardFile[]
  >([]);
  const [selectedFileName, setSelectedFileName] = React.useState("");
  const [builderReports, setBuilderReports] = React.useState<
    ChampCityHumanValidationBuilderReportOption[]
  >([]);
  const [invalidBuilderReports, setInvalidBuilderReports] = React.useState<
    ChampCityInvalidHumanValidationBuilderReportFile[]
  >([]);
  const [selectedBuilderReportFileName, setSelectedBuilderReportFileName] =
    React.useState("");
  const [form, setForm] = React.useState(initialHumanValidationForm);
  const [errors, setErrors] = React.useState<string[]>([]);
  const [statusMessage, setStatusMessage] =
    React.useState("Loading saved Work Cards.");
  const [isListBusy, setIsListBusy] = React.useState(false);
  const [isReportListBusy, setIsReportListBusy] = React.useState(false);
  const [isPreviewBusy, setIsPreviewBusy] = React.useState(false);
  const [isSaveBusy, setIsSaveBusy] = React.useState(false);
  const [previewResult, setPreviewResult] =
    React.useState<ChampCityHumanValidationPreviewResult | null>(null);
  const [saveResult, setSaveResult] =
    React.useState<ChampCityHumanValidationSaveResult | null>(null);

  React.useEffect(() => {
    let active = true;

    setIsListBusy(true);
    setErrors([]);

    window.champCity
      .listSavedWorkCards(phase)
      .then((result: ChampCityListSavedWorkCardsResult) => {
        if (!active) {
          return;
        }

        setIsListBusy(false);

        if (!result.ok) {
          setWorkCards([]);
          setInvalidFiles([]);
          setSelectedFileName("");
          setErrors(result.errorMessages ?? ["Saved Work Cards could not be loaded."]);
          setStatusMessage("Saved Work Cards could not be loaded.");
          return;
        }

        const nextWorkCards = result.workCards ?? [];

        setWorkCards(nextWorkCards);
        setInvalidFiles(result.invalidFiles ?? []);
        setSelectedFileName((previous) =>
          nextWorkCards.some((workCard) => workCard.fileName === previous)
            ? previous
            : nextWorkCards[0]?.fileName ?? "",
        );

        if (nextWorkCards.length === 0) {
          setStatusMessage("No saved Work Card JSON files found.");
          return;
        }

        setStatusMessage("Saved Work Cards loaded.");
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setIsListBusy(false);
        setWorkCards([]);
        setInvalidFiles([]);
        setSelectedFileName("");
        setErrors(["Saved Work Cards could not be loaded."]);
        setStatusMessage("Saved Work Cards could not be loaded.");
      });

    return () => {
      active = false;
    };
  }, [phase]);

  React.useEffect(() => {
    if (selectedFileName.trim().length === 0) {
      setBuilderReports([]);
      setInvalidBuilderReports([]);
      setSelectedBuilderReportFileName("");
      return;
    }

    let active = true;

    setIsReportListBusy(true);
    setErrors([]);

    window.champCity
      .listHumanValidationBuilderReports({
        phase,
        workCardFileName: selectedFileName,
      })
      .then((result: ChampCityHumanValidationBuilderReportListResult) => {
        if (!active) {
          return;
        }

        setIsReportListBusy(false);

        if (!result.ok) {
          setBuilderReports([]);
          setInvalidBuilderReports([]);
          setSelectedBuilderReportFileName("");
          setErrors(result.errorMessages ?? ["Implementer Reports could not be loaded."]);
          setStatusMessage("Implementer Reports could not be loaded.");
          return;
        }

        const nextReports = result.options ?? [];

        setBuilderReports(nextReports);
        setInvalidBuilderReports(result.invalidFiles ?? []);
        setSelectedBuilderReportFileName((previous) =>
          nextReports.some((report) => report.fileName === previous)
            ? previous
            : "",
        );
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setIsReportListBusy(false);
        setBuilderReports([]);
        setInvalidBuilderReports([]);
        setSelectedBuilderReportFileName("");
        setErrors(["Implementer Reports could not be loaded."]);
        setStatusMessage("Implementer Reports could not be loaded.");
      });

    return () => {
      active = false;
    };
  }, [phase, selectedFileName]);

  React.useEffect(() => {
    if (selectedFileName.trim().length === 0) {
      setPreviewResult(null);
      return;
    }

    let active = true;

    setIsPreviewBusy(true);

    window.champCity
      .previewHumanValidationRecord({
        phase,
        workCardFileName: selectedFileName,
        builderReportFileName: nonBlankSelection(selectedBuilderReportFileName),
        ...form,
      })
      .then((result: ChampCityHumanValidationPreviewResult) => {
        if (!active) {
          return;
        }

        setIsPreviewBusy(false);
        setPreviewResult(result);

        if (result.ok) {
          setStatusMessage("Human Validation preview refreshed.");
        }
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setIsPreviewBusy(false);
        setPreviewResult({
          ok: false,
          errorMessages: ["Human Validation preview could not be generated."],
        });
      });

    return () => {
      active = false;
    };
  }, [
    phase,
    selectedFileName,
    selectedBuilderReportFileName,
    form.validationResult,
    form.testedItems,
    form.passedItems,
    form.failedItems,
    form.evidenceReferences,
    form.screenshotOrFileReferences,
    form.commandsRun,
    form.observedErrors,
    form.additionalOperatorObservations,
    form.operatorDecision,
    form.recommendedNextAction,
  ]);

  const selectedWorkCard =
    workCards.find((workCard) => workCard.fileName === selectedFileName) ?? null;
  const hasWorkCards = workCards.length > 0;
  const combinedErrors = [
    ...errors,
    ...(previewResult?.ok === false ? previewResult.errorMessages ?? [] : []),
  ];

  function updateValidationField<
    TField extends keyof typeof initialHumanValidationForm,
  >(field: TField, value: (typeof initialHumanValidationForm)[TField]): void {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
    setSaveResult(null);
  }

  async function saveValidation(): Promise<void> {
    if (selectedFileName.trim().length === 0) {
      setErrors(["Select a saved Work Card before saving validation."]);
      setStatusMessage("Save needs attention.");
      return;
    }

    setIsSaveBusy(true);
    setErrors([]);

    const result = await window.champCity.saveHumanValidationRecord({
      phase,
      workCardFileName: selectedFileName,
      builderReportFileName: nonBlankSelection(selectedBuilderReportFileName),
      ...form,
    });

    setIsSaveBusy(false);
    setPreviewResult(result);

    if (
      !result.ok ||
      !result.validationJsonPath ||
      !result.validationMarkdownPath
    ) {
      setSaveResult(null);
      setErrors(result.errorMessages ?? ["Human Validation could not be saved."]);
      setStatusMessage("Save needs attention.");
      return;
    }

    setSaveResult(result);
    setStatusMessage("Human Validation saved.");
  }

  return h(
    "section",
    {
      className: "workspace validation-workspace",
      "aria-label": "Human Validation",
    },
    h(
      "div",
      { className: "selector-panel validation-selector-panel" },
      h(
        "div",
        { className: "form-header" },
        h("h2", null, "Validation Source"),
        h("span", { className: "status-pill" }, phase),
      ),
      renderErrors(combinedErrors),
      h("p", { className: "selector-help" }, workCardJsonSelectorHelp),
      invalidFiles.length > 0
        ? h(
            "div",
            { className: "warning-box", role: "status" },
            h("h3", null, "Skipped Work Card files"),
            h(
              "ul",
              null,
              ...invalidFiles.map((file) =>
                h(
                  "li",
                  { key: file.fileName },
                  `${file.fileName}: ${file.errorMessages.join(" ")}`,
                ),
              ),
            ),
          )
        : null,
      renderPhaseField(phase, setPhase),
      !hasWorkCards
        ? h(
            "div",
            { className: "empty-state", role: "status" },
            "No saved Work Card JSON files were found. Human Validation requires a saved Work Card JSON artifact.",
          )
        : h(
            "label",
            { className: "field" },
            h("span", null, "Saved Work Card JSON"),
            h(
              "select",
              {
                value: selectedFileName,
                disabled: isListBusy,
                onChange: (event: Event) => {
                  setSelectedFileName((event.target as HTMLSelectElement).value);
                  setSaveResult(null);
                },
              },
              ...workCards.map((workCard) =>
                h(
                  "option",
                  { key: workCard.fileName, value: workCard.fileName },
                  `${workCard.workCardId} - ${workCard.title} (${workCard.status}, ${workCard.phase})`,
                ),
              ),
            ),
          ),
      selectedWorkCard ? renderSelectedWorkCardSummary(selectedWorkCard) : null,
      h(
        "label",
        { className: "field" },
        h("span", null, "Associated Implementer Report"),
        h(
          "select",
          {
            value: selectedBuilderReportFileName,
            disabled: isReportListBusy || selectedFileName.trim().length === 0,
            onChange: (event: Event) => {
              setSelectedBuilderReportFileName(
                (event.target as HTMLSelectElement).value,
              );
              setSaveResult(null);
            },
          },
          h("option", { value: "" }, "No Implementer Report selected"),
          ...builderReports.map((report) =>
            h(
              "option",
              { key: report.fileName, value: report.fileName },
              report.isDefaultMatch ? `${report.label} (match)` : report.label,
            ),
          ),
        ),
        builderReports.length === 0
          ? h(
              "small",
              { className: "field-note" },
              "No Implementer Report Markdown files were found for this phase.",
            )
          : null,
      ),
      selectedBuilderReportFileName.trim().length === 0
        ? h(
            "div",
            { className: "warning-box", role: "status" },
            previewResult?.builderReportWarning ??
              "No Implementer Report is selected. You can still save validation, but the evidence chain is incomplete.",
          )
        : null,
      invalidBuilderReports.length > 0
        ? h(
            "div",
            { className: "warning-box", role: "status" },
            h("h3", null, "Skipped Implementer Report files"),
            h(
              "ul",
              null,
              ...invalidBuilderReports.map((file) =>
                h(
                  "li",
                  { key: file.fileName },
                  `${file.fileName}: ${file.errorMessages.join(" ")}`,
                ),
              ),
            ),
          )
        : null,
      renderManualValidationChecklist(
        selectedBuilderReportFileName,
        previewResult?.manualValidationChecklist,
      ),
    ),
    h(
      "aside",
      {
        className: "composer-panel validation-editor-panel",
        "aria-label": "Human Validation record",
      },
      h(
        "div",
        { className: "preview-header" },
        h(
          "div",
          null,
          h("p", { className: "eyebrow" }, "Operator Validation"),
          h("h2", null, "Record"),
        ),
        h("span", { className: "status-text" }, statusMessage),
      ),
      saveResult?.validationJsonPath && saveResult.validationMarkdownPath
        ? h(
            "div",
            { className: "save-result", role: "status" },
            h("h3", null, "Saved"),
            h("p", null, "JSON: ", h("code", null, saveResult.validationJsonPath)),
            h(
              "p",
              null,
              "Markdown: ",
              h("code", null, saveResult.validationMarkdownPath),
            ),
            saveResult.repairPromptPath
              ? h(
                  "p",
                  null,
                  "Repair Prompt: ",
                  h("code", null, saveResult.repairPromptPath),
                )
              : null,
          )
        : null,
      h(
        "div",
        { className: "field-grid" },
        renderHumanValidationResultSelect(
          form.validationResult,
          (value) => updateValidationField("validationResult", value),
        ),
        renderHumanValidationDecisionSelect(
          form.operatorDecision,
          (value) => updateValidationField("operatorDecision", value),
        ),
      ),
      renderHumanValidationTextAreaField(
        "What was tested?",
        form.testedItems,
        (value) => updateValidationField("testedItems", value),
        4,
      ),
      h(
        "div",
        { className: "two-column" },
        renderHumanValidationTextAreaField(
          "What passed?",
          form.passedItems,
          (value) => updateValidationField("passedItems", value),
          5,
        ),
        renderHumanValidationTextAreaField(
          "What failed?",
          form.failedItems,
          (value) => updateValidationField("failedItems", value),
          5,
        ),
      ),
      h(
        "div",
        { className: "two-column" },
        renderHumanValidationTextAreaField(
          "Evidence references or paths",
          form.evidenceReferences,
          (value) => updateValidationField("evidenceReferences", value),
          4,
        ),
        renderHumanValidationTextAreaField(
          "Screenshots or files referenced by path",
          form.screenshotOrFileReferences,
          (value) =>
            updateValidationField("screenshotOrFileReferences", value),
          4,
        ),
      ),
      h(
        "div",
        { className: "two-column" },
        renderHumanValidationTextAreaField(
          "Manual commands run",
          form.commandsRun,
          (value) => updateValidationField("commandsRun", value),
          4,
        ),
        renderHumanValidationTextAreaField(
          "Observed errors",
          form.observedErrors,
          (value) => updateValidationField("observedErrors", value),
          4,
        ),
      ),
      renderHumanValidationTextAreaField(
        "Additional Operator observations",
        form.additionalOperatorObservations,
        (value) => updateValidationField("additionalOperatorObservations", value),
        4,
      ),
      renderHumanValidationTextAreaField(
        "Recommended next action",
        form.recommendedNextAction,
        (value) => updateValidationField("recommendedNextAction", value),
        4,
      ),
      renderRepairPromptState(previewResult),
      previewResult?.repairPrompt
        ? h(
            "pre",
            { className: "markdown-preview prompt-preview repair-prompt-preview" },
            previewResult.repairPrompt,
          )
        : null,
      h(
        "div",
        { className: "actions prompt-actions" },
        h(
          "button",
          {
            type: "button",
            className: "button primary",
            disabled:
              isSaveBusy ||
              isPreviewBusy ||
              selectedFileName.trim().length === 0 ||
              !previewResult?.ok,
            onClick: () => {
              void saveValidation();
            },
          },
          "Save Validation",
        ),
      ),
    ),
  );
}

function PhaseCloseoutScreen(): unknown {
  const [form, setForm] =
    React.useState<ChampCityPhaseCloseoutFormInput>(initialPhaseCloseoutForm);
  const [summary, setSummary] =
    React.useState<ChampCityPhaseArtifactSummary | null>(null);
  const [previewResult, setPreviewResult] =
    React.useState<ChampCityPhaseCloseoutPreviewResult | null>(null);
  const [saveResult, setSaveResult] =
    React.useState<ChampCityPhaseCloseoutSaveResult | null>(null);
  const [errors, setErrors] = React.useState<string[]>([]);
  const [isPreviewBusy, setIsPreviewBusy] = React.useState(false);
  const [isSaveBusy, setIsSaveBusy] = React.useState(false);
  const [statusMessage, setStatusMessage] =
    React.useState("Loading phase artifacts.");

  React.useEffect(() => {
    let active = true;

    setIsPreviewBusy(true);
    setErrors([]);

    window.champCity
      .previewPhaseCloseoutRecord(form)
      .then((result: ChampCityPhaseCloseoutPreviewResult) => {
        if (!active) {
          return;
        }

        setIsPreviewBusy(false);
        setPreviewResult(result);
        setSummary(result.summary ?? null);

        if (!result.ok) {
          setErrors(result.errorMessages ?? ["Phase Closeout preview could not be generated."]);
          setStatusMessage("Phase Closeout preview needs attention.");
          return;
        }

        setStatusMessage("Phase Closeout preview refreshed.");
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setIsPreviewBusy(false);
        setPreviewResult(null);
        setSummary(null);
        setErrors(["Phase Closeout preview could not be generated."]);
        setStatusMessage("Phase Closeout preview needs attention.");
      });

    return () => {
      active = false;
    };
  }, [
    form.phase,
    form.decision,
    form.closeoutSummary,
    form.completedItems,
    form.remainingItems,
    form.knownRisks,
    form.operatorNotes,
    form.recommendedNextAction,
  ]);

  function updateCloseoutField(
    field: keyof ChampCityPhaseCloseoutFormInput,
    value: string,
  ): void {
    setForm(
      (previous) =>
        ({
          ...previous,
          [field]: value,
        }) as ChampCityPhaseCloseoutFormInput,
    );
    setSaveResult(null);
  }

  async function saveCloseout(): Promise<void> {
    setIsSaveBusy(true);
    setErrors([]);

    const result = await window.champCity.savePhaseCloseoutRecord(form);
    setIsSaveBusy(false);
    setPreviewResult(result);
    setSummary(result.summary ?? null);

    if (!result.ok || !result.markdown) {
      setErrors(result.errorMessages ?? ["The Phase Closeout record could not be saved."]);
      setStatusMessage("Save needs attention.");
      return;
    }

    setSaveResult(result);
    setStatusMessage("Phase Closeout record saved.");
  }

  return h(
    "section",
    {
      className: "workspace prompt-workspace",
      "aria-label": "Phase Closeout",
    },
    h(
      "div",
      { className: "selector-panel" },
      h(
        "div",
        { className: "form-header" },
        h("h2", null, "Phase Artifacts"),
        h("span", { className: "status-pill" }, form.phase),
      ),
      renderErrors(errors),
      renderPhaseField(form.phase, (value) => updateCloseoutField("phase", value)),
      summary ? renderPhaseArtifactCounts(summary) : renderPhaseCloseoutLoading(),
      summary ? renderPhaseArtifactFileNames(summary) : null,
      summary ? renderPhaseWorkCardPairing(summary) : null,
      summary ? renderPhaseCloseoutObservations(summary) : null,
      summary
        ? h(
            "div",
            { className: "notice-box", role: "status" },
            h("h3", null, "Deterministic recommendation"),
            h("p", null, previewResult?.record?.deterministicRecommendation ?? summary.deterministicRecommendation),
          )
        : null,
    ),
    h(
      "aside",
      {
        className: "composer-panel validation-editor-panel",
        "aria-label": "Phase Closeout record",
      },
      h(
        "div",
        { className: "preview-header" },
        h(
          "div",
          null,
          h("p", { className: "eyebrow" }, "Closeout"),
          h("h2", null, "Decision Record"),
        ),
        h("span", { className: "status-text" }, statusMessage),
      ),
      saveResult?.jsonPath && saveResult.markdownPath
        ? h(
            "div",
            { className: "save-result", role: "status" },
            h("h3", null, "Saved"),
            h("p", null, "JSON: ", h("code", null, saveResult.jsonPath)),
            h("p", null, "Markdown: ", h("code", null, saveResult.markdownPath)),
          )
        : null,
      h(
        "div",
        { className: "field-grid" },
        renderPhaseCloseoutDecisionSelect(form.decision, (value) =>
          updateCloseoutField("decision", value),
        ),
      ),
      renderPhaseCloseoutTextAreaField(
        "Closeout summary",
        form.closeoutSummary,
        (value) => updateCloseoutField("closeoutSummary", value),
        4,
      ),
      h(
        "div",
        { className: "two-column" },
        renderPhaseCloseoutTextAreaField(
          "What was completed?",
          form.completedItems,
          (value) => updateCloseoutField("completedItems", value),
          5,
        ),
        renderPhaseCloseoutTextAreaField(
          "What remains?",
          form.remainingItems,
          (value) => updateCloseoutField("remainingItems", value),
          5,
        ),
      ),
      h(
        "div",
        { className: "two-column" },
        renderPhaseCloseoutTextAreaField(
          "Known risks",
          form.knownRisks,
          (value) => updateCloseoutField("knownRisks", value),
          4,
        ),
        renderPhaseCloseoutTextAreaField(
          "Operator notes",
          form.operatorNotes,
          (value) => updateCloseoutField("operatorNotes", value),
          4,
        ),
      ),
      renderPhaseCloseoutTextAreaField(
        "Recommended next action",
        form.recommendedNextAction,
        (value) => updateCloseoutField("recommendedNextAction", value),
        4,
      ),
      h(
        "pre",
        { className: "markdown-preview prompt-preview" },
        previewResult?.markdown ?? "No Phase Closeout preview generated yet.",
      ),
      h(
        "div",
        { className: "actions prompt-actions" },
        h(
          "button",
          {
            type: "button",
            className: "button primary",
            disabled: isSaveBusy || isPreviewBusy || !previewResult?.ok,
            onClick: () => {
              void saveCloseout();
            },
          },
          "Save Closeout",
        ),
      ),
    ),
  );
}

function renderPhaseField(
  value: string,
  setPhase: (value: string) => void,
): unknown {
  return h(
    "label",
    { className: "field" },
    h("span", null, "Phase"),
    h("input", {
      value,
      onChange: (event: Event) => {
        setPhase((event.target as HTMLInputElement).value);
      },
    }),
  );
}

function renderPhaseArtifactCounts(
  summary: ChampCityPhaseArtifactSummary,
): unknown {
  return h(
    "dl",
    { className: "summary-grid report-summary-grid" },
    ...summary.folders.map((folder) =>
      h(
        "div",
        { key: folder.folder },
        h("dt", null, folder.folder.replace(/_/g, " ")),
        h("dd", null, String(folder.count)),
      ),
    ),
  );
}

function renderPhaseArtifactFileNames(
  summary: ChampCityPhaseArtifactSummary,
): unknown {
  return h(
    "section",
    { className: "review-section" },
    h("h3", null, "Artifact filenames"),
    ...summary.folders.map((folder) =>
      h(
        "div",
        { key: `files-${folder.folder}`, className: "artifact-folder" },
        h("h4", null, `${folder.folder.replace(/_/g, " ")} (${folder.count})`),
        renderSimpleList(
          folder.fileNames,
          "No matching artifacts found in this folder.",
        ),
      ),
    ),
  );
}

function renderPhaseWorkCardPairing(
  summary: ChampCityPhaseArtifactSummary,
): unknown {
  return h(
    "section",
    { className: "review-section" },
    h("h3", null, "Work Card pairing"),
    h(
      "dl",
      { className: "summary-grid" },
      h(
        "div",
        null,
        h("dt", null, "Unique Work Cards"),
        h("dd", null, String(summary.workCardCount)),
      ),
      h(
        "div",
        null,
        h("dt", null, "Paired JSON + Markdown"),
        h("dd", null, String(summary.workCardsWithBothJsonAndMarkdown.length)),
      ),
      h(
        "div",
        null,
        h("dt", null, "Missing JSON"),
        h("dd", null, String(summary.workCardsMissingJson.length)),
      ),
      h(
        "div",
        null,
        h("dt", null, "Missing Markdown"),
        h("dd", null, String(summary.workCardsMissingMarkdown.length)),
      ),
    ),
    h("h4", null, "Paired Work Cards"),
    renderPhaseWorkCardPairList(
      summary.workCardsWithBothJsonAndMarkdown,
      "No paired Work Card artifacts found.",
    ),
    summary.workCardsMissingJson.length > 0
      ? h(
          "div",
          { className: "warning-box", role: "status" },
          h("h3", null, "Missing JSON"),
          renderPhaseWorkCardPairList(
            summary.workCardsMissingJson,
            "No Work Cards are missing JSON.",
          ),
        )
      : null,
    summary.workCardsMissingMarkdown.length > 0
      ? h(
          "div",
          { className: "warning-box", role: "status" },
          h("h3", null, "Missing Markdown"),
          renderPhaseWorkCardPairList(
            summary.workCardsMissingMarkdown,
            "No Work Cards are missing Markdown.",
          ),
        )
      : null,
  );
}

function renderPhaseCloseoutObservations(
  summary: ChampCityPhaseArtifactSummary,
): unknown {
  if (summary.missingExpectedArtifactObservations.length === 0) {
    return h(
      "div",
      { className: "notice-box", role: "status" },
      "No missing expected artifact observations were detected.",
    );
  }

  return h(
    "div",
    { className: "warning-box", role: "status" },
    h("h3", null, "Missing or warning observations"),
    h(
      "ul",
      null,
      ...summary.missingExpectedArtifactObservations.map((observation) =>
        h("li", { key: observation }, observation),
      ),
    ),
  );
}

function renderPhaseCloseoutLoading(): unknown {
  return h(
    "div",
    { className: "empty-state", role: "status" },
    "Loading phase artifact summary.",
  );
}

function renderPhaseWorkCardPairList(
  pairs: ChampCityPhaseWorkCardArtifactPair[],
  emptyMessage: string,
): unknown {
  if (pairs.length === 0) {
    return h("p", null, emptyMessage);
  }

  return h(
    "ul",
    null,
    ...pairs.map((pair) =>
      h(
        "li",
        { key: pair.stem },
        `${pair.workCardId}: ${pair.jsonFileName ?? "missing JSON"} + ${
          pair.markdownFileName ?? "missing Markdown"
        }`,
      ),
    ),
  );
}

function renderPhaseCloseoutDecisionSelect(
  value: ChampCityPhaseCloseoutDecision,
  onChange: (value: ChampCityPhaseCloseoutDecision) => void,
): unknown {
  const options: ChampCityPhaseCloseoutDecision[] = [
    "Close phase",
    "Continue phase",
    "Needs repair",
    "Needs UI cleanup",
    "Ready for release/package pass",
    "Ready for next phase",
  ];

  return h(
    "label",
    { className: "field" },
    h("span", null, "Closeout decision"),
    h(
      "select",
      {
        value,
        onChange: (event: Event) => {
          onChange(
            (event.target as HTMLSelectElement)
              .value as ChampCityPhaseCloseoutDecision,
          );
        },
      },
      ...options.map((option) => h("option", { key: option, value: option }, option)),
    ),
  );
}

function renderPhaseCloseoutTextAreaField(
  label: string,
  value: string,
  onChange: (value: string) => void,
  rows: number,
): unknown {
  return h(
    "label",
    { className: "field" },
    h("span", null, label),
    h("textarea", {
      value,
      rows,
      onChange: (event: Event) => {
        onChange((event.target as HTMLTextAreaElement).value);
      },
    }),
  );
}

function renderReportTypeSelect(
  value: ChampCityBuilderReportType,
  onChange: (value: ChampCityBuilderReportType) => void,
): unknown {
  const options: ChampCityBuilderReportType[] = [
    "Work Card",
    "Fix",
    "Repair",
    "Other",
  ];

  return h(
    "label",
    { className: "field" },
    h("span", null, "Report Type"),
    h(
      "select",
      {
        value,
        onChange: (event: Event) => {
          onChange((event.target as HTMLSelectElement).value as ChampCityBuilderReportType);
        },
      },
      ...options.map((option) => h("option", { key: option, value: option }, option)),
    ),
  );
}

function renderHumanValidationResultSelect(
  value: ChampCityHumanValidationResult,
  onChange: (value: ChampCityHumanValidationResult) => void,
): unknown {
  const options: ChampCityHumanValidationResult[] = [
    "Pass",
    "Fail",
    "Partial",
    "Blocked",
    "Not Tested",
  ];

  return h(
    "label",
    { className: "field" },
    h("span", null, "Validation result"),
    h(
      "select",
      {
        value,
        onChange: (event: Event) => {
          onChange(
            (event.target as HTMLSelectElement)
              .value as ChampCityHumanValidationResult,
          );
        },
      },
      ...options.map((option) => h("option", { key: option, value: option }, option)),
    ),
  );
}

function renderHumanValidationDecisionSelect(
  value: ChampCityHumanValidationOperatorDecision,
  onChange: (value: ChampCityHumanValidationOperatorDecision) => void,
): unknown {
  const options: ChampCityHumanValidationOperatorDecision[] = [
    "Passed - proceed",
    "Failed - repair needed",
    "Partial - repair or follow-up needed",
    "Blocked - operator/build environment issue",
    "Deferred - not validated yet",
    "Different problem found - open new Work Card",
  ];

  return h(
    "label",
    { className: "field" },
    h("span", null, "Operator decision"),
    h(
      "select",
      {
        value,
        onChange: (event: Event) => {
          onChange(
            (event.target as HTMLSelectElement)
              .value as ChampCityHumanValidationOperatorDecision,
          );
        },
      },
      ...options.map((option) => h("option", { key: option, value: option }, option)),
    ),
  );
}

function renderHumanValidationTextAreaField(
  label: string,
  value: string,
  onChange: (value: string) => void,
  rows: number,
): unknown {
  return h(
    "label",
    { className: "field" },
    h("span", null, label),
    h("textarea", {
      value,
      rows,
      onChange: (event: Event) => {
        onChange((event.target as HTMLTextAreaElement).value);
      },
    }),
  );
}

function renderManualValidationChecklist(
  selectedBuilderReportFileName: string,
  checklist: ChampCityManualValidationChecklistExtraction | undefined,
): unknown {
  if (selectedBuilderReportFileName.trim().length === 0) {
    return null;
  }

  if (!checklist) {
    return h(
      "div",
      { className: "notice-box", role: "status" },
      "Checking the selected Implementer Report for manual validation guidance.",
    );
  }

  return h(
    "div",
    {
      className: checklist.detected ? "notice-box" : "warning-box",
      role: "status",
    },
    h(
      "h3",
      null,
      checklist.detected
        ? "Manual validation checklist"
        : "Manual validation checklist",
    ),
    h("pre", { className: "checklist-preview" }, checklist.text),
  );
}

function renderRepairPromptState(
  previewResult: ChampCityHumanValidationPreviewResult | null,
): unknown {
  if (!previewResult?.ok) {
    return null;
  }

  if (previewResult.differentProblemGuidance) {
    return h(
      "div",
      { className: "notice-box", role: "status" },
      previewResult.differentProblemGuidance,
    );
  }

  if (previewResult.shouldGenerateRepairPrompt) {
    return h(
      "div",
      { className: "warning-box", role: "status" },
      "A draft Repair Implementer Prompt will be generated and saved with this validation record.",
    );
  }

  return h(
    "div",
    { className: "notice-box", role: "status" },
    "No Repair Implementer Prompt will be generated for the current result and Operator decision.",
  );
}

function renderBuilderReportDetection(
  validation: ChampCityBuilderReportValidationResult,
): unknown {
  return h(
    "dl",
    { className: "summary-grid report-summary-grid" },
    renderDetectionItem("Commit hash", validation.detected.hasCommitHash),
    renderDetectionItem(
      "Validation results",
      validation.detected.hasValidationResults,
    ),
    renderDetectionItem(
      "Blocking questions",
      validation.detected.hasBlockingQuestions || validation.detected.hasBlockers,
    ),
    renderDetectionItem(
      "Recommended next task",
      validation.detected.hasRecommendedNextTask,
    ),
  );
}

function renderDetectionItem(label: string, detected: boolean): unknown {
  return h(
    "div",
    null,
    h("dt", null, label),
    h("dd", null, detected ? "Detected" : "Not detected"),
  );
}

function renderBuilderReportWarnings(
  validation: ChampCityBuilderReportValidationResult,
): unknown {
  if (validation.warnings.length === 0) {
    return h(
      "div",
      { className: "notice-box", role: "status" },
      "No required-section warnings detected.",
    );
  }

  return h(
    "div",
    { className: "warning-box", role: "status" },
    h(
      "h3",
      null,
      validation.validEnoughToSave
        ? "Validation warnings"
        : "Cannot save yet",
    ),
    h(
      "ul",
      null,
      ...validation.warnings.map((warning) =>
        h("li", { key: warning }, warning),
      ),
    ),
  );
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

function renderOptionalArtifactSelect(
  label: string,
  value: string,
  options: ChampCityBuilderPromptArtifactOption[],
  onChange: (value: string) => void,
  emptyMessage: string,
): unknown {
  return h(
    "label",
    { className: "field" },
    h("span", null, label),
    h(
      "select",
      {
        value,
        onChange: (event: Event) => {
          onChange((event.target as HTMLSelectElement).value);
        },
      },
      h("option", { value: "" }, "Do not include"),
      ...options.map((option) =>
        h(
          "option",
          { key: option.fileName, value: option.fileName },
          option.isDefaultMatch ? `${option.label} (match)` : option.label,
        ),
      ),
    ),
    options.length === 0
      ? h("small", { className: "field-note" }, emptyMessage)
      : null,
  );
}

function renderBuilderPromptInvalidFiles(
  files: ChampCityInvalidBuilderPromptArtifactFile[],
): unknown {
  return h(
    "div",
    { className: "warning-box", role: "status" },
    h("h3", null, "Skipped supporting files"),
    h(
      "ul",
      null,
      ...files.map((file) =>
        h(
          "li",
          { key: `${file.folder}/${file.fileName}` },
          `${file.folder}/${file.fileName}: ${file.errorMessages.join(" ")}`,
        ),
      ),
    ),
  );
}

function renderSelectedWorkCardSummary(
  workCard: ChampCitySavedWorkCardSummary,
): unknown {
  return h(
    "dl",
    { className: "summary-grid" },
    h("div", null, h("dt", null, "Work Card ID"), h("dd", null, workCard.workCardId)),
    h("div", null, h("dt", null, "Title"), h("dd", null, workCard.title)),
    h("div", null, h("dt", null, "Status"), h("dd", null, workCard.status)),
    h("div", null, h("dt", null, "Phase"), h("dd", null, workCard.phase)),
    h("div", null, h("dt", null, "Current Risk Level"), h("dd", null, workCard.riskLevel)),
  );
}

function renderRiskReview(review: ChampCityWorkCardRiskReview): unknown {
  return h(
    "div",
    { className: "risk-review" },
    h(
      "dl",
      { className: "summary-grid risk-summary-grid" },
      h("div", null, h("dt", null, "Work Card ID"), h("dd", null, review.workCardId)),
      h("div", null, h("dt", null, "Title"), h("dd", null, review.title)),
      h("div", null, h("dt", null, "Phase"), h("dd", null, review.phase)),
      h(
        "div",
        null,
        h("dt", null, "Assessed Risk"),
        h(
          "dd",
          { className: riskLevelClassName(review.assessedRiskLevel) },
          review.assessedRiskLevel,
        ),
      ),
    ),
    review.assessedRiskLevel === "high"
      ? h(
          "div",
          { className: "warning-box", role: "status" },
          "This Work Card appears high risk. Do not send it directly to the Implementer until the Architect reviews the flagged items.",
        )
      : null,
    review.assessedRiskLevel === "low"
      ? h(
          "div",
          { className: "notice-box", role: "status" },
          "No major risk flags were detected. Normal Architect review is still required.",
        )
      : null,
    h(
      "section",
      { className: "review-section" },
      h("h3", null, "Summary"),
      h("p", null, review.summary),
    ),
    h(
      "section",
      { className: "review-section" },
      h("h3", null, "Flagged Categories"),
      review.flaggedCategories.length === 0
        ? h("p", null, "No flagged categories.")
        : h(
            "ul",
            { className: "flag-list" },
            ...review.flaggedCategories.map((flag) =>
              h(
                "li",
                { key: flag.category, className: "flag-item" },
                h(
                  "div",
                  { className: "flag-heading" },
                  h("strong", null, flag.category),
                  h("span", { className: riskLevelClassName(flag.severity) }, flag.severity),
                ),
                h("p", null, flag.rationale),
                h(
                  "p",
                  { className: "matched-terms" },
                  "Matched terms: ",
                  flag.matchedTerms.join(", "),
                ),
                h("p", null, flag.suggestedArchitectQuestion),
              ),
            ),
          ),
    ),
    h(
      "section",
      { className: "review-section" },
      h("h3", null, "Scope-Creep Signals"),
      renderSimpleList(
        review.scopeCreepSignals,
        "No scope-creep signals were detected.",
      ),
    ),
    h(
      "section",
      { className: "review-section review-section-last" },
      h("h3", null, "Architect Review Questions"),
      renderSimpleList(
        review.architectReviewQuestions,
        "No extra Architect review questions were generated.",
      ),
    ),
  );
}

function renderNoRiskReviewState(): unknown {
  return h(
    "div",
    { className: "empty-state", role: "status" },
    "Select a saved Work Card JSON file to generate a deterministic risk review.",
  );
}

function renderSimpleList(items: string[], emptyMessage: string): unknown {
  if (items.length === 0) {
    return h("p", null, emptyMessage);
  }

  return h(
    "ul",
    null,
    ...items.map((item) => h("li", { key: item }, item)),
  );
}

function riskLevelClassName(level: string): string {
  return `risk-level risk-level-${level}`;
}

function renderErrors(errors: string[]): unknown {
  if (errors.length === 0) {
    return null;
  }

  return h(
    "div",
    { className: "error-box", role: "alert" },
    h("h3", null, "Needs attention"),
    h("ul", null, ...errors.map((error) => h("li", { key: error }, error))),
  );
}

function renderInputField(
  field: keyof ChampCityWorkCardDraftInput,
  label: string,
  value: string,
  updateField: (field: keyof ChampCityWorkCardDraftInput, value: string) => void,
  required: boolean,
): unknown {
  return h(
    "label",
    { className: "field" },
    h("span", null, label),
    h("input", {
      value,
      required,
      onChange: (event: Event) => {
        updateField(field, (event.target as HTMLInputElement).value);
      },
    }),
  );
}

function renderSelectField(
  field: keyof ChampCityWorkCardDraftInput,
  value: string,
  updateField: (field: keyof ChampCityWorkCardDraftInput, value: string) => void,
): unknown {
  return h(
    "label",
    { className: "field" },
    h("span", null, "Risk Level"),
    h(
      "select",
      {
        value,
        onChange: (event: Event) => {
          updateField(field, (event.target as HTMLSelectElement).value);
        },
      },
      h("option", { value: "low" }, "low"),
      h("option", { value: "medium" }, "medium"),
      h("option", { value: "high" }, "high"),
    ),
  );
}

function renderTextAreaField(
  field: keyof ChampCityWorkCardDraftInput,
  label: string,
  value: string,
  updateField: (field: keyof ChampCityWorkCardDraftInput, value: string) => void,
  required: boolean,
  rows: number,
): unknown {
  return h(
    "label",
    { className: "field" },
    h("span", null, label),
    h("textarea", {
      value,
      required,
      rows,
      onChange: (event: Event) => {
        updateField(field, (event.target as HTMLTextAreaElement).value);
      },
    }),
  );
}

function validateForm(form: ChampCityWorkCardDraftInput): string[] {
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

const root = document.querySelector("#app-root");

if (root) {
  ReactDOM.createRoot(root).render(h(App));
}
