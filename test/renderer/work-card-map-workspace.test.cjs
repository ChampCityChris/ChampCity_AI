const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "../..");
const appSourcePath = path.join(repoRoot, "src", "renderer", "app", "App.tsx");
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

test("App wires Work Card Map to candidate-scoped planning", () => {
  const appSource = fs.readFileSync(appSourcePath, "utf8");
  const transitionSource = appSource.slice(
    appSource.indexOf("async function beginMappedWorkCardPlanningAndTransition"),
    appSource.indexOf("async function saveLifecycleArchitectOutput"),
  );

  assert.match(appSource, /const isWorkCardMap =\s*activeWorkspaceId === "phase-work-card-selection"/);
  assert.match(appSource, /<WorkCardMapWorkspace/);
  assert.match(appSource, /window\.champcity\.getWorkCardMapProjection\(phaseId/);
  assert.match(transitionSource, /window\.champcity\.beginWorkCardPlanning\(phaseId, candidateId, \{/);
  assert.match(appSource, /activeWorkCardResumeWorkspaceIds = new Set<WorkspaceId>/);
  assert.match(transitionSource, /activeWorkCardResumeWorkspaceIds\.has\(nextModel\.activeWorkspaceId\)/);
  assert.match(transitionSource, /currentModelMatchesCandidate\(nextModel, candidateId\)/);
  assert.match(transitionSource, /const destinationWorkspaceId = nextModel\.activeWorkspaceId/);
  assert.match(transitionSource, /transitionToWorkflowStep\(destinationWorkspaceId/);
  assert.doesNotMatch(transitionSource, /window\.champcity\.generateCurrentHandoff\(\)/);
  assert.doesNotMatch(transitionSource, /generateCloseReturnNextIntakeHandoff/);
});
