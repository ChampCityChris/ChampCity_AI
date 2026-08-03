const assert = require("node:assert/strict");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const test = require("node:test");

const {
  WorkCardIntakeWorkspace,
  workCardIntakeProjectionFingerprint,
} = require("./renderer-source-loader.cjs")
  .loadRendererSourceModule("src/renderer/app/WorkCardIntakeWorkspace.tsx");

function intakeModel(overrides = {}) {
  const projection = overrides.projection ?? {
    phaseId: "phase-01",
    sourceWorkCardPlanPath: "planning/phases/phase-01/Work_Card_Plan.md",
    selectionReason: "Candidate is planned, incomplete, and all predecessors permit continuation.",
    candidate: {
      candidateId: "WC01",
      order: 1,
      title: "First Work Card",
      purpose: "Implement the first bounded product correction.",
      dependsOn: [],
      resolutionStatus: "planned",
      resolutionReason: "",
      evidencePaths: ["planning/phases/phase-01/Phase_Planning.md"],
    },
    handoffMarkdownPath: "planning/phases/phase-01/Architect_Handoffs/WORK_CARD_INTAKE_ARCHITECT_HANDOFF_WC01.md",
    formalWorkCardMarkdownPath: "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md",
  };
  return {
    activeWorkspaceId: "work-card-planning",
    level: "work-card",
    stage: "planning",
    currentPhaseId: "phase-01",
    currentWorkCardId: "WC01",
    executionContext: {
      phase: {
        state: "active",
        phaseId: "phase-01",
        title: "Foundation",
        order: 1,
        totalPhaseCount: 1,
        purpose: "Build the first phase.",
        dependsOn: [],
        loopStep: "Work Cards",
        reason: "Current phase is active.",
      },
      workCard: {
        state: "active",
        workCardId: "WC01",
        title: "First Work Card",
        loopStep: "Planning",
        dispositionOrState: "Candidate is eligible.",
        reason: "Current Work Card comes from the current workflow model.",
      },
    },
    currentTarget: "Work Card Planning",
    workCardIntake: projection,
    sourceEvidence: [projection.sourceWorkCardPlanPath],
    requiredAction: "Prepare Work Card Planning.",
    expectedOutput: "Work Card Planning handoff.",
    eligibility: projection.selectionReason,
    expectedNextState: "Formal Work Card Planning.",
  };
}

test("Work Card Planning preparation renders the selected candidate and exact output paths", () => {
  const markup = renderToStaticMarkup(
    React.createElement(WorkCardIntakeWorkspace, {
      actionError: "",
      actionFeedback: "",
      isGenerating: false,
      model: intakeModel(),
      onGenerate: () => undefined,
    }),
  );

  assert.match(markup, /phase-01/);
  assert.match(markup, /Foundation/);
  assert.match(markup, /1\. WC01/);
  assert.match(markup, /First Work Card/);
  assert.match(markup, /Implement the first bounded product correction/);
  assert.match(markup, /Dependencies/);
  assert.match(markup, /None/);
  assert.match(markup, /Resolution Status/);
  assert.match(markup, /planned/);
  assert.match(markup, /Selection Eligibility/);
  assert.match(markup, /planning\/phases\/phase-01\/Work_Card_Plan\.md/);
  assert.match(markup, /WORK_CARD_INTAKE_ARCHITECT_HANDOFF_WC01\.md/);
  assert.match(markup, /Work_Cards\/WC01_first_work_card\.md/);
  assert.match(markup, /Application-generated non-review handoff/);
  assert.match(markup, /Prepare Work Card Planning/);
  assert.match(markup, /Creates the application-owned Approved non-review intake handoff/);
  assert.doesNotMatch(markup, /Generate Work Card Intake Handoff/);
  assert.doesNotMatch(markup, /Select a document/);
  assert.doesNotMatch(markup, /Canonical Markdown/);
  assert.doesNotMatch(markup, /Document workflow not yet implemented/);
  assert.doesNotMatch(markup, /Apply Current Disposition/);
  assert.doesNotMatch(markup, /Embedded ChatGPT/);
});

test("Work Card Planning preparation disables repeated generation while in flight and shows exact local errors", () => {
  const markup = renderToStaticMarkup(
    React.createElement(WorkCardIntakeWorkspace, {
      actionError: "No eligible Work Card candidate is available: dependency-blocked",
      actionFeedback: "",
      isGenerating: true,
      model: intakeModel(),
      onGenerate: () => undefined,
    }),
  );

  assert.match(markup, /disabled=""/);
  assert.match(markup, /Preparing\.\.\./);
  assert.match(markup, /No eligible Work Card candidate is available: dependency-blocked/);
});

test("Work Card Intake projection fingerprint tracks shared path identity", () => {
  const projection = intakeModel().workCardIntake;

  assert.equal(
    workCardIntakeProjectionFingerprint(projection),
    "phase-01|WC01|planning/phases/phase-01/Architect_Handoffs/WORK_CARD_INTAKE_ARCHITECT_HANDOFF_WC01.md|planning/phases/phase-01/Work_Cards/WC01_first_work_card.md",
  );
});
