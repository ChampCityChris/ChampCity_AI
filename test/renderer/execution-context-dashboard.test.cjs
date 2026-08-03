const assert = require("node:assert/strict");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const test = require("node:test");

const {
  ExecutionContextDashboard,
} = require("./renderer-source-loader.cjs")
  .loadRendererSourceModule("src/renderer/app/ExecutionContextDashboard.tsx");

const selectedWorkspace = {
  ok: true,
  workspaceRoot: "repo",
};

function modelForContext(executionContext) {
  return {
    activeWorkspaceId: "phase-interview",
    level: "phase",
    stage: "intake",
    executionContext,
    currentTarget: "Phase Interview",
    sourceEvidence: [],
    requiredAction: "Continue.",
    expectedOutput: "Output.",
    eligibility: "Ready.",
    expectedNextState: "Next.",
  };
}

test("execution context dashboard renders empty project state without stale phase or Work Card values", () => {
  const markup = renderToStaticMarkup(
    React.createElement(ExecutionContextDashboard, {
      workspace: { ok: false, workspaceRoot: null, reason: "No project selected." },
      model: null,
    }),
  );

  assert.match(markup, /Execution Context/);
  assert.match(markup, /No Project Selected/);
  assert.match(markup, /No active phase/);
  assert.match(markup, /No active Work Card/);
  assert.doesNotMatch(markup, /phase-01/);
  assert.doesNotMatch(markup, /WC01/);
});

test("execution context dashboard renders active phase metadata and no Work Card before selection", () => {
  const markup = renderToStaticMarkup(
    React.createElement(ExecutionContextDashboard, {
      workspace: selectedWorkspace,
      model: modelForContext({
        phase: {
          state: "active",
          phaseId: "phase-01",
          title: "Foundation",
          order: 1,
          totalPhaseCount: 2,
          purpose: "Create the first usable workflow.",
          dependsOn: [],
          loopStep: "Phase Planning",
          reason: "Current phase is first incomplete.",
        },
        workCard: {
          state: "none",
          dispositionOrState: "Phase Planning",
          reason: "No active Work Card; current phase-loop step is Phase Planning.",
        },
      }),
    }),
  );

  assert.match(markup, /phase-01/);
  assert.match(markup, /Foundation/);
  assert.match(markup, /1 of 2/);
  assert.match(markup, /Create the first usable workflow/);
  assert.match(markup, /None/);
  assert.match(markup, /No active Work Card/);
  assert.match(markup, /Phase Planning/);
});

test("execution context dashboard preserves parent Work Card authority during repair", () => {
  const markup = renderToStaticMarkup(
    React.createElement(ExecutionContextDashboard, {
      workspace: selectedWorkspace,
      model: modelForContext({
        phase: {
          state: "active",
          phaseId: "phase-01",
          title: "Foundation",
          order: 1,
          totalPhaseCount: 1,
          purpose: "Create the first usable workflow.",
          dependsOn: [],
          loopStep: "Work Cards",
          reason: "Current phase is first incomplete.",
        },
        workCard: {
          state: "active",
          workCardId: "WC01",
          title: "First Work Card",
          loopStep: "Repair",
          dispositionOrState: "Repair Work Card output is ready to import.",
          repairId: "WC01-REPAIR01",
          parentWorkCardId: "WC01",
          reason: "Repair context preserves the parent Work Card authority.",
        },
      }),
    }),
  );

  assert.match(markup, /WC01/);
  assert.match(markup, /First Work Card/);
  assert.match(markup, /Repair/);
  assert.match(markup, /WC01-REPAIR01/);
});
