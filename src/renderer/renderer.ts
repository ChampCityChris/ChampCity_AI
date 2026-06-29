const h = React.createElement;

type AppScreen = "new-work-card" | "architect-prompt-composer";

const defaultPhase = "phase-01";

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
        h(
          "h1",
          null,
          activeScreen === "new-work-card"
            ? "New Work Card"
            : "Architect Prompt Composer",
        ),
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
      ),
    ),
    activeScreen === "new-work-card"
      ? h(NewWorkCardScreen)
      : h(ArchitectPromptComposerScreen),
  );
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
  );
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
