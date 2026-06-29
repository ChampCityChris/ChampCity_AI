const h = React.createElement;

type AppScreen =
  | "new-work-card"
  | "architect-prompt-composer"
  | "risk-router"
  | "builder-prompt-generator"
  | "builder-report-capture";

const defaultPhase = "phase-01";
const workCardJsonSelectorHelp =
  "Only Work Cards with JSON artifacts can be selected. Markdown-only notes are not app-readable Work Cards.";

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

function App(): unknown {
  const appInfo = React.useMemo(() => window.champCity.getAppInfo(), []);
  const [activeScreen, setActiveScreen] =
    React.useState<AppScreen>("new-work-card");

  return h(
    "main",
    { className: "app-shell" },
    h(
      "header",
      { className: "top-bar" },
      h(
        "div",
        null,
        h("p", { className: "eyebrow" }, appInfo.name),
        h("h1", null, getScreenTitle(activeScreen)),
      ),
      h(
        "nav",
        { className: "screen-nav", "aria-label": "Work Card screens" },
        renderNavButton(
          "New Work Card",
          activeScreen === "new-work-card",
          () => setActiveScreen("new-work-card"),
        ),
        renderNavButton(
          "Architect Prompt Composer",
          activeScreen === "architect-prompt-composer",
          () => setActiveScreen("architect-prompt-composer"),
        ),
        renderNavButton(
          "Risk Router",
          activeScreen === "risk-router",
          () => setActiveScreen("risk-router"),
        ),
        renderNavButton(
          "Builder Prompt Generator",
          activeScreen === "builder-prompt-generator",
          () => setActiveScreen("builder-prompt-generator"),
        ),
        renderNavButton(
          "Builder Report Capture",
          activeScreen === "builder-report-capture",
          () => setActiveScreen("builder-report-capture"),
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
            : h(BuilderReportCaptureScreen),
  );
}

function getScreenTitle(activeScreen: AppScreen): string {
  if (activeScreen === "new-work-card") {
    return "New Work Card";
  }

  if (activeScreen === "architect-prompt-composer") {
    return "Architect Prompt Composer";
  }

  if (activeScreen === "builder-prompt-generator") {
    return "Builder Prompt Generator";
  }

  if (activeScreen === "builder-report-capture") {
    return "Builder Report Capture";
  }

  return "Risk Router";
}

function renderNavButton(
  label: string,
  isActive: boolean,
  onClick: () => void,
): unknown {
  return h(
    "button",
    {
      type: "button",
      className: isActive ? "nav-button active" : "nav-button",
      onClick,
    },
    label,
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
          setErrors(result.errorMessages ?? ["The Builder prompt could not be generated."]);
          setStatusMessage("Builder prompt generation needs attention.");
          return;
        }

        setPrompt(result.prompt);
        setHasHighRiskContext(Boolean(result.hasHighRiskContext));
        setHasRiskReviewSelected(Boolean(result.hasRiskReviewSelected));
        setStatusMessage("Builder prompt generated.");
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setIsPromptBusy(false);
        setPrompt("");
        setHasHighRiskContext(false);
        setHasRiskReviewSelected(false);
        setErrors(["The Builder prompt could not be generated."]);
        setStatusMessage("Builder prompt generation needs attention.");
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
      setCopyMessage("Generate a Builder prompt before copying.");
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
      setErrors(["Select a saved Work Card before saving a Builder prompt."]);
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
      setErrors(result.errorMessages ?? ["The Builder prompt could not be saved."]);
      setStatusMessage("Save needs attention.");
      return;
    }

    setPrompt(result.prompt);
    setHasHighRiskContext(Boolean(result.hasHighRiskContext));
    setHasRiskReviewSelected(Boolean(result.hasRiskReviewSelected));
    setSaveResult(result);
    setStatusMessage("Builder prompt saved.");
  }

  return h(
    "section",
    {
      className: "workspace prompt-workspace",
      "aria-label": "Builder Prompt Generator",
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
          "Prior Builder Report",
          supportSelections.priorBuilderReport ?? "",
          artifactOptions.priorBuilderReports,
          (value) => updateSupportSelection("priorBuilderReport", value),
          "No Prior Builder Report artifact is available.",
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
      { className: "composer-panel", "aria-label": "Builder prompt preview" },
      h(
        "div",
        { className: "preview-header" },
        h(
          "div",
          null,
          h("p", { className: "eyebrow" }, "Builder"),
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
            "High-risk context is present. The generated prompt tells Builder not to broaden scope and to stop for blocking questions if risky work appears.",
          )
        : null,
      !hasRiskReviewSelected
        ? h(
            "div",
            { className: "warning-box", role: "status" },
            "No Risk Review artifact is selected. The generated prompt warns Builder not to infer approval.",
          )
        : null,
      h(
        "pre",
        { className: "markdown-preview prompt-preview" },
        prompt || "No Builder prompt generated yet.",
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
          "Save Builder Prompt",
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
          errorMessages: ["Builder Report preview could not be generated."],
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
      setErrors(result.errorMessages ?? ["The Builder Report could not be saved."]);
      setStatusMessage("Save needs attention.");
      return;
    }

    setSaveResult(result);
    setStatusMessage("Builder Report saved.");
  }

  return h(
    "section",
    {
      className: "workspace report-workspace",
      "aria-label": "Builder Report Capture",
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
      { className: "composer-panel report-editor-panel", "aria-label": "Builder Report text" },
      h(
        "div",
        { className: "preview-header" },
        h(
          "div",
          null,
          h("p", { className: "eyebrow" }, "Builder Report"),
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
        h("span", null, "Builder Report Markdown"),
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
          "Save Builder Report",
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
          "This Work Card appears high risk. Do not send it directly to Builder until the Architect reviews the flagged items.",
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
