const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const test = require("node:test");

const loader = require("./renderer-source-loader.cjs");
const {
  executePhaseValidationMutation,
  loadPhaseValidationEntry,
  phaseValidationActionForWorkspace,
  phaseValidationPresentation,
  requirePhaseValidationActionProjection,
} = loader.loadRendererSourceModule("src/renderer/app/phaseValidationRendererOrchestration.ts");
const {
  CurrentActionPanel,
  FigmaActionWorkspace,
} = loader.loadRendererSourceModule("src/renderer/app/App.tsx");

const repoRoot = path.resolve(__dirname, "../..");

function phaseAction(requiredAction) {
  const workspaceId = requiredAction === "phase-close-complete" ? "phase-close" : "phase-validation";
  return {
    eligible: true,
    phaseId: "phase-01",
    workspaceId,
    requiredAction,
    sourceEvidence: ["planning/phases/phase-01/Work_Card_Plan.md"],
    reason: `Repository-derived ${requiredAction} state.`,
    ...(requiredAction === "create-closeout"
      ? {}
      : {
          closeout: {
            logicalDocumentId: "phase-closeout:phase-01",
            markdownPath: "planning/phases/phase-01/Phase_Closeouts/PHASE_01_CLOSEOUT_close.md",
            artifactRevision: 1,
            effectiveDisposition: requiredAction === "phase-close-complete" ? "Approved" : "Pending",
            closureDecision: "Close",
            freshnessState: "fresh",
          },
        }),
  };
}

function props(action, activeWorkspaceId = action.workspaceId) {
  return {
    activeWorkspaceId,
    documentError: "",
    feedback: "",
    inputs: {
      defect: "",
      closureDecision: "Close",
      rationale: "Phase work is complete.",
      status: "Approved",
    },
    model: {
      currentTarget: "Work Card Map mutation state",
      level: "phase",
      stage: "building",
      currentPhaseId: "phase-01",
      executionContext: { phase: { loopStep: "Work Cards" }, workCard: {} },
      eligibility: "Work Card Map eligibility",
      requiredAction: "Choose a Work Card",
      expectedOutput: "Work Card Intake",
      expectedNextState: "Work Card Planning",
    },
    phaseAction: action,
    onApplyPhaseDisposition: () => undefined,
    onChange: () => undefined,
    onCreatePhaseCloseout: () => undefined,
    onRun: async () => undefined,
    onSelectDocument: () => undefined,
    selectedDocument: null,
    selectedDocumentId: null,
    selectedSummary: null,
    workspaceGroups: [],
    workspaceOk: true,
  };
}

function renderBoth(action, activeWorkspaceId = action.workspaceId) {
  const allProps = props(action, activeWorkspaceId);
  return [
    renderToStaticMarkup(React.createElement(FigmaActionWorkspace, allProps)),
    renderToStaticMarkup(React.createElement(CurrentActionPanel, {
      activeWorkspaceId: allProps.activeWorkspaceId,
      inputs: allProps.inputs,
      model: allProps.model,
      phaseAction: allProps.phaseAction,
      onApplyPhaseDisposition: allProps.onApplyPhaseDisposition,
      onChange: allProps.onChange,
      onCreatePhaseCloseout: allProps.onCreatePhaseCloseout,
      onRun: allProps.onRun,
      selectedDocument: null,
    })),
  ];
}

test("both Phase Validation action surfaces render create-only action state", () => {
  for (const markup of renderBoth(phaseAction("create-closeout"))) {
    assert.match(markup, /Phase Validation — phase-01/);
    assert.match(markup, /Create Current Phase Closeout/);
    assert.doesNotMatch(markup, /Apply Current Disposition/);
    assert.doesNotMatch(markup, /Work Card Map mutation state/);
  }
  const presentation = phaseValidationPresentation(phaseAction("create-closeout"));
  assert.equal(presentation.canCreateCloseout, true);
  assert.equal(presentation.dispositionTarget, null);
});

test("both Phase Validation action surfaces render dispose-only action state", () => {
  for (const markup of renderBoth(phaseAction("dispose-closeout"))) {
    assert.match(markup, /Phase Validation — phase-01/);
    assert.match(markup, /Apply Current Disposition/);
    assert.doesNotMatch(markup, /Create Current Phase Closeout/);
    assert.doesNotMatch(markup, /Work Card Map mutation state/);
  }
  const presentation = phaseValidationPresentation(phaseAction("dispose-closeout"));
  assert.equal(presentation.canCreateCloseout, false);
  assert.equal(presentation.dispositionTarget, "phase-validation");
});

test("both Phase Close surfaces render completion evidence with no Phase Validation mutation", () => {
  for (const markup of renderBoth(phaseAction("phase-close-complete"))) {
    assert.match(markup, /Phase Validation — phase-01/);
    assert.doesNotMatch(markup, /Apply Current Disposition/);
    assert.doesNotMatch(markup, /Create Current Phase Closeout/);
  }
});

test("both Phase Close action surfaces suppress retained create-closeout action state", () => {
  const action = phaseAction("create-closeout");
  assert.equal(phaseValidationActionForWorkspace("phase-close", action), null);
  for (const markup of renderBoth(action, "phase-close")) {
    assert.doesNotMatch(markup, /Create Current Phase Closeout/);
    assert.doesNotMatch(markup, /Apply Current Disposition/);
    assert.match(markup, /Phase Validation basis not loaded/);
  }
});

test("both Phase Close action surfaces suppress retained dispose-closeout action state", () => {
  const action = phaseAction("dispose-closeout");
  assert.equal(phaseValidationActionForWorkspace("phase-close", action), null);
  for (const markup of renderBoth(action, "phase-close")) {
    assert.doesNotMatch(markup, /Create Current Phase Closeout/);
    assert.doesNotMatch(markup, /Apply Current Disposition/);
    assert.match(markup, /Phase Validation basis not loaded/);
  }
});

test("Phase Close retains only the current phase-close-complete projection", () => {
  const complete = phaseAction("phase-close-complete");
  assert.equal(phaseValidationActionForWorkspace("phase-close", complete), complete);
  assert.equal(
    phaseValidationActionForWorkspace("phase-validation", complete),
    null,
  );
});

test("renderer rejects local or malformed Phase Validation state", () => {
  assert.throws(
    () => requirePhaseValidationActionProjection({
      ...phaseAction("dispose-closeout"),
      workspaceId: "phase-close",
    }),
    /malformed repository action projection/,
  );
  assert.throws(
    () => requirePhaseValidationActionProjection({
      ...phaseAction("create-closeout"),
      closeout: phaseAction("dispose-closeout").closeout,
    }),
    /malformed repository action projection/,
  );

  const pendingProps = props(phaseAction("create-closeout"));
  pendingProps.phaseAction = null;
  const markup = renderToStaticMarkup(React.createElement(FigmaActionWorkspace, pendingProps));
  assert.match(markup, /Phase Validation basis not loaded/);
  assert.doesNotMatch(markup, /Apply Current Disposition|Create Current Phase Closeout/);
});

test("explicit entry reads repository binding before returning a navigation target", async () => {
  const calls = [];
  const action = await loadPhaseValidationEntry(async () => {
    calls.push("getPhaseValidationActionProjection");
    return phaseAction("create-closeout");
  });
  calls.push(`navigate:${action.workspaceId}`);
  assert.deepEqual(calls, [
    "getPhaseValidationActionProjection",
    "navigate:phase-validation",
  ]);
});

test("post-mutation refresh cannot overwrite current Phase Close navigation", async () => {
  const calls = [];
  const result = await executePhaseValidationMutation(
    async () => {
      calls.push("mutate");
      return {
        ok: true,
        action: "currentWorkflow:applyDisposition",
        message: "Approved.",
        payload: { phaseAction: phaseAction("phase-close-complete") },
      };
    },
    async () => {
      calls.push("refresh-repository");
      return { currentModel: { activeWorkspaceId: "phase-interview", currentPhaseId: "phase-02" } };
    },
  );
  calls.push(`navigate:${result.phaseAction.workspaceId}`);
  assert.deepEqual(calls, ["mutate", "refresh-repository", "navigate:phase-close"]);
  assert.equal(result.repositoryEvidence.currentModel.activeWorkspaceId, "phase-interview");
});

test("App routes Phase Validation disposition with the validated projection target", () => {
  const source = fs.readFileSync(path.join(repoRoot, "src", "renderer", "app", "App.tsx"), "utf8");
  const dispositionSource = source.slice(
    source.indexOf("async function applyCurrentPhaseCloseoutDisposition"),
    source.indexOf("async function refreshWorkCardCloseProjection"),
  );
  assert.match(dispositionSource, /requiredAction !== "dispose-closeout"/);
  assert.match(dispositionSource, /workspaceId !== "phase-validation"/);
  assert.match(dispositionSource, /applyCurrentDisposition\([\s\S]*?phaseValidationAction\.workspaceId/);
  assert.doesNotMatch(dispositionSource, /"phase-close"\s*\)/);
});
