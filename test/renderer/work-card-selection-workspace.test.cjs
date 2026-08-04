const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "../..");
const appSourcePath = path.join(repoRoot, "src", "renderer", "app", "App.tsx");
const {
  WorkCardSelectionWorkspace,
} = require("./renderer-source-loader.cjs")
  .loadRendererSourceModule("src/renderer/app/WorkCardSelectionWorkspace.tsx");

function selectedProjection() {
  return {
    state: "selected",
    phaseId: "phase-01",
    closedWorkCardId: "WC01",
    close: {
      closed: true,
      returnTarget: "phase-work-card-selection",
      reason: "Current Approved Validation Record closes the Work Card.",
    },
    selectionReason: "WC02 is eligible after WC01 completion.",
    workCardIntake: {
      phaseId: "phase-01",
      sourceWorkCardPlanPath: "planning/phases/phase-01/Work_Card_Plan.md",
      selectionReason: "WC02 is eligible after WC01 completion.",
      handoffMarkdownPath: "planning/phases/phase-01/Architect_Handoffs/WORK_CARD_INTAKE_ARCHITECT_HANDOFF_WC02.md",
      formalWorkCardMarkdownPath: "planning/phases/phase-01/Work_Cards/WC02_second_work_card.md",
      candidate: {
        candidateId: "WC02",
        order: 2,
        title: "Second Work Card",
        purpose: "Implement the next unit.",
        dependsOn: ["WC01"],
        resolutionStatus: "planned",
        resolutionReason: "",
        evidencePaths: [],
      },
    },
    explanations: [
      {
        candidateId: "WC01",
        state: "complete",
        reason: "Approved validation evidence completes WC01.",
        evidencePaths: ["planning/phases/phase-01/Validation_Records/VALIDATION_RECORD_WC01_ATTEMPT01.md"],
      },
      {
        candidateId: "WC02",
        state: "eligible",
        reason: "Dependencies are satisfied.",
        evidencePaths: [],
      },
    ],
  };
}

test("Work Card Selection renders selected next candidate without generic document controls", () => {
  const markup = renderToStaticMarkup(
    React.createElement(WorkCardSelectionWorkspace, {
      actionError: "",
      actionFeedback: "",
      isGenerating: false,
      model: null,
      onPreparePlanning: () => undefined,
      projection: selectedProjection(),
    }),
  );

  assert.match(markup, /Work Card Selection workspace/);
  assert.match(markup, /WC02 - Second Work Card/);
  assert.match(markup, /phase-01 \/ closed WC01/);
  assert.match(markup, /Prepare Work Card Planning/);
  assert.match(markup, /WORK_CARD_INTAKE_ARCHITECT_HANDOFF_WC02\.md/);
  assert.match(markup, /WC01/);
  assert.match(markup, /complete/);
  assert.doesNotMatch(markup, /Select a document/);
  assert.doesNotMatch(markup, /Document workflow not yet implemented/);
  assert.doesNotMatch(markup, /Run Current Handoff Action/);
});

test("Work Card Selection terminal states disable fake planning handoffs", () => {
  const markup = renderToStaticMarkup(
    React.createElement(WorkCardSelectionWorkspace, {
      actionError: "",
      actionFeedback: "",
      isGenerating: false,
      model: null,
      onPreparePlanning: () => undefined,
      projection: {
        state: "all-complete",
        phaseId: "phase-01",
        closedWorkCardId: "WC01",
        close: {
          closed: true,
          returnTarget: "phase-work-card-selection",
          reason: "Current Approved Validation Record closes the Work Card.",
        },
        reason: "All Work Card candidates are complete.",
        explanations: [],
      },
    }),
  );

  assert.match(markup, /All Work Card candidates are complete\./);
  assert.match(markup, /<button[^>]*disabled=""/);
  assert.doesNotMatch(markup, /WORK_CARD_INTAKE_ARCHITECT_HANDOFF_WC/);
});

test("App excludes Work Card Selection from the generic action workspace", () => {
  const appSource = fs.readFileSync(appSourcePath, "utf8");
  const transitionSource = appSource.slice(
    appSource.indexOf("async function generateCloseReturnNextIntakeAndTransition"),
    appSource.indexOf("async function saveLifecycleArchitectOutput"),
  );

  assert.match(appSource, /const isWorkCardSelection =\s*activeWorkspaceId === "phase-work-card-selection"/);
  assert.match(appSource, /<WorkCardSelectionWorkspace/);
  assert.match(appSource, /!isWorkCardClose &&\s*!isWorkCardSelection/);
  assert.match(transitionSource, /nextModel\.currentWorkCardId !== selectedCandidateId/);
  assert.match(transitionSource, /return;/);
  assert.match(transitionSource, /workspaceId: "work-card-planning"/);
  assert.doesNotMatch(transitionSource, /window\.champcity\.generateCurrentHandoff\(\)/);
});
