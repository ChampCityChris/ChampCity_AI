const assert = require("node:assert/strict");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const test = require("node:test");
const {
  WorkCardMapWorkspace,
} = require("./renderer-source-loader.cjs")
  .loadRendererSourceModule("src/renderer/app/WorkCardMapWorkspace.tsx");

function mapProjection(overrides = {}) {
  return {
    state: "ready",
    phaseId: "phase-01",
    sourceWorkCardPlanPath: "planning/phases/phase-01/Work_Card_Plan.md",
    phaseValidationWorkspaceId: "phase-validation",
    reason: "Work Card candidates are projected from the current Approved Work Card Plan.",
    candidates: [
      {
        candidateId: "WC01",
        order: 1,
        title: "First Work Card",
        purpose: "Implement the first unit.",
        dependsOn: [],
        status: "Complete",
        reason: "Candidate is complete because current Approved validation evidence exists.",
        evidencePaths: ["planning/phases/phase-01/Validation_Records/VALIDATION_RECORD_WC01_ATTEMPT01.md"],
        handoffMarkdownPath: "planning/phases/phase-01/Architect_Handoffs/WORK_CARD_INTAKE_ARCHITECT_HANDOFF_WC01.md",
        formalWorkCardMarkdownPath: "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md",
        formalWorkCardDocument: {
          displayFilename: "WC01_first_work_card",
          disposition: "Approved",
          documentReadState: "readable",
          bodyMarkdown: [
            "# Work Card: WC01",
            "## First Work Card",
            "",
            "### Objective",
            "Use the real Formal Work Card body.",
          ].join("\n"),
        },
      },
      {
        candidateId: "WC02",
        order: 2,
        title: "Second Work Card",
        purpose: "Implement the next unit.",
        dependsOn: ["WC01"],
        status: "Eligible",
        reason: "Candidate is planned, incomplete, and all predecessors permit continuation.",
        evidencePaths: [],
        handoffMarkdownPath: "planning/phases/phase-01/Architect_Handoffs/WORK_CARD_INTAKE_ARCHITECT_HANDOFF_WC02.md",
        formalWorkCardMarkdownPath: "planning/phases/phase-01/Work_Cards/WC02_second_work_card.md",
      },
      {
        candidateId: "WC03",
        order: 3,
        title: "Third Work Card",
        purpose: "Wait for earlier planning.",
        dependsOn: ["WC02"],
        status: "Ineligible",
        reason: "This candidate cannot begin planning until its current plan conditions are satisfied.",
        evidencePaths: [],
        handoffMarkdownPath: "planning/phases/phase-01/Architect_Handoffs/WORK_CARD_INTAKE_ARCHITECT_HANDOFF_WC03.md",
        formalWorkCardMarkdownPath: "planning/phases/phase-01/Work_Cards/WC03_third_work_card.md",
      },
    ],
    ...overrides,
  };
}

test("Work Card Map renders plan candidates without generic document controls", () => {
  const markup = renderToStaticMarkup(
    React.createElement(WorkCardMapWorkspace, {
      actionError: "",
      actionFeedback: "",
      isBeginningPlanning: false,
      model: null,
      onBeginPlanning: () => undefined,
      onOpenPhaseValidation: () => undefined,
      projection: mapProjection(),
    }),
  );

  assert.match(markup, /Work Card Map workspace/);
  assert.match(markup, /figma-work-card-map-dual-pane/);
  assert.match(markup, /Selected Work Card document viewer/);
  assert.match(markup, /Planned Work Card Candidates/);
  assert.match(markup, /WC01/);
  assert.match(markup, /Complete/);
  assert.match(markup, /WC02/);
  assert.match(markup, /Eligible/);
  assert.match(markup, /WC03/);
  assert.match(markup, /Ineligible/);
  assert.match(markup, /Begin Planning/);
  assert.match(markup, /WC01_first_work_card/);
  assert.match(markup, /Use the real Formal Work Card body/);
  assert.match(markup, /planning\/phases\/phase-01\/Work_Cards\/WC01_first_work_card\.md/);
  assert.doesNotMatch(markup, /Dependency Blocked|Deferred|Superseded|Already Satisfied|Carried Forward/);
  assert.doesNotMatch(markup, /Select a document/);
  assert.doesNotMatch(markup, /Document workflow not yet implemented/);
  assert.doesNotMatch(markup, /Run Current Handoff Action/);
});

test("Work Card Map renders the active Work Card indication", () => {
  const projection = mapProjection({
    candidates: mapProjection().candidates.map((candidate) =>
      candidate.candidateId === "WC02"
        ? { ...candidate, isActive: true }
        : candidate.candidateId === "WC03"
          ? { ...candidate, status: "Ineligible", reason: "Cannot begin planning while WC02 is the active Work Card." }
          : candidate
    ),
  });
  const markup = renderToStaticMarkup(
    React.createElement(WorkCardMapWorkspace, {
      actionError: "",
      actionFeedback: "",
      isBeginningPlanning: false,
      model: null,
      onBeginPlanning: () => undefined,
      onOpenPhaseValidation: () => undefined,
      projection,
    }),
  );

  assert.match(markup, /Active Work Card/);
  assert.match(markup, /Ineligible/);
  assert.doesNotMatch(markup, /Dependency Blocked|Deferred|Superseded|Already Satisfied|Carried Forward/);
});

test("Work Card Map labels active candidate action as continuation", () => {
  const projection = mapProjection({
    candidates: mapProjection().candidates.map((candidate) =>
      candidate.candidateId === "WC01"
        ? {
            ...candidate,
            status: "Eligible",
            isActive: true,
            reason: "Continue WC01; it is the active Work Card for this phase.",
          }
        : { ...candidate, status: "Ineligible", reason: "Cannot begin planning while WC01 is the active Work Card." }
    ),
  });
  const markup = renderToStaticMarkup(
    React.createElement(WorkCardMapWorkspace, {
      actionError: "",
      actionFeedback: "",
      isBeginningPlanning: false,
      model: null,
      onBeginPlanning: () => undefined,
      onOpenPhaseValidation: () => undefined,
      projection,
    }),
  );

  assert.match(markup, /Continue Work Card/);
  assert.match(markup, /Active Work Card/);
  assert.doesNotMatch(markup, /Dependency Blocked|Deferred|Superseded|Already Satisfied|Carried Forward/);
});

test("Work Card Map all-complete state routes toward Phase Validation", () => {
  const projection = mapProjection({
    state: "all-complete",
    reason: "All planned Work Card candidates are complete for this phase.",
    candidates: mapProjection().candidates.slice(0, 2).map((candidate) => ({
      ...candidate,
      status: "Complete",
    })),
  });
  const markup = renderToStaticMarkup(
    React.createElement(WorkCardMapWorkspace, {
      actionError: "",
      actionFeedback: "",
      isBeginningPlanning: false,
      model: null,
      onBeginPlanning: () => undefined,
      onOpenPhaseValidation: () => undefined,
      projection,
    }),
  );

  assert.match(markup, /All planned Work Cards are complete for this phase/);
  assert.match(markup, /Phase Validation/);
  assert.doesNotMatch(markup, /Phase Intake/);
});

test("Work Card Map needs-attention presentation cannot start a successor intake", () => {
  const markup = renderToStaticMarkup(
    React.createElement(WorkCardMapWorkspace, {
      actionError: "",
      actionFeedback: "",
      candidateActionEnabled: false,
      isBeginningPlanning: false,
      model: null,
      onBeginPlanning: () => undefined,
      onOpenPhaseValidation: () => undefined,
      projection: mapProjection({
        state: "needs-attention",
        reason: "Current dependency state requires attention.",
      }),
    }),
  );

  assert.match(markup, /Current dependency state requires attention\./);
  assert.match(markup, /<button[^>]*disabled=""[^>]*>[\s\S]*Begin Planning/);
  assert.doesNotMatch(markup, />Phase Validation</);
});
