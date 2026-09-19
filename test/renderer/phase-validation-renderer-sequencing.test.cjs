const assert = require("node:assert/strict");
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

const { loadProductionFunctions } = require("../support/production-execution.cjs");

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

test("App disposition uses the projection target, refreshes evidence, and then navigates to Phase Close", async () => {
  const calls = [];
  const state = {};
  const complete = phaseAction("phase-close-complete");
  const scope = {
    phaseValidationAction: phaseAction("dispose-closeout"),
    actionInputs: { status: "Approved" }, executePhaseValidationMutation,
    window: { champcity: {
      applyCurrentDisposition: async (...args) => { calls.push(["mutate", ...args]); return {
        ok: true, message: "Approved", payload: { phaseAction: complete },
      }; },
      listDocuments: async () => { calls.push(["documents"]); return []; },
      getProjectPlanningWorkspaceModel: async () => { calls.push(["planning"]); return {}; },
      getCurrentWorkspaceModel: async () => { calls.push(["model"]); return { activeWorkspaceId: "phase-interview" }; },
      resolveCurrentDocument: async () => { calls.push(["resolve"]); return null; },
    } },
    applyDocumentInventory() {},
    transitionToWorkflowStep: (destination) => calls.push(["navigate", destination]),
  };
  for (const name of ["IsApplying", "DocumentError", "Feedback", "ProjectPlanningModel", "CurrentModel", "ResolverResult", "PhaseValidationAction"]) {
    scope["set" + name] = (value) => { state[name] = value; };
  }
  const { applyCurrentPhaseCloseoutDisposition } = loadProductionFunctions("src/renderer/app/App.tsx", [
    "applyCurrentPhaseCloseoutDisposition", "runPhaseValidationMutation",
  ], scope);
  await applyCurrentPhaseCloseoutDisposition();
  assert.deepEqual(calls, [
    ["mutate", "Approved", "", scope.phaseValidationAction.workspaceId],
    ["documents"], ["planning"], ["model"], ["resolve"], ["navigate", "phase-close"],
  ]);
  assert.notEqual(calls[0][3], "phase-close");
  assert.equal(state.PhaseValidationAction, complete);
  assert.equal(state.DocumentError, "");
  assert.equal(state.IsApplying, false);
  assert.equal(state.CurrentModel.activeWorkspaceId, "phase-interview");
});

test("App refuses disposition without a current Phase Validation disposition projection", async () => {
  for (const action of [null, phaseAction("create-closeout"), phaseAction("phase-close-complete"),
    { ...phaseAction("dispose-closeout"), workspaceId: "phase-close" }]) {
    let error;
    const { applyCurrentPhaseCloseoutDisposition } = loadProductionFunctions("src/renderer/app/App.tsx", ["applyCurrentPhaseCloseoutDisposition"], {
      phaseValidationAction: action,
      setDocumentError: (value) => { error = value; },
      runPhaseValidationMutation: () => assert.fail("Ineligible disposition must not mutate"),
    });
    await applyCurrentPhaseCloseoutDisposition();
    assert.match(error, /does not currently permit/);
  }
});
