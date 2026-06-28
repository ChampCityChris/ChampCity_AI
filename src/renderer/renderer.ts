const h = React.createElement;

const initialForm: ChampCityWorkCardDraftInput = {
  workCardId: "WC02",
  title: "",
  phase: "phase-01",
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
    "main",
    { className: "app-shell" },
    h(
      "header",
      { className: "top-bar" },
      h(
        "div",
        null,
        h("p", { className: "eyebrow" }, appInfo.name),
        h("h1", null, "New Work Card"),
      ),
      h(
        "ol",
        { className: "loop-list", "aria-label": "Core workflow" },
        ...appInfo.coreLoop.map((step) => h("li", { key: step }, step)),
      ),
    ),
    h(
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
        errors.length > 0
          ? h(
              "div",
              { className: "error-box", role: "alert" },
              h("h3", null, "Needs attention"),
              h(
                "ul",
                null,
                ...errors.map((error) => h("li", { key: error }, error)),
              ),
            )
          : null,
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
          h("div", null, h("p", { className: "eyebrow" }, "Markdown"), h("h2", null, "Preview")),
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
    ),
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
