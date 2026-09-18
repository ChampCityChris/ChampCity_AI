const assert = require("node:assert/strict");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const test = require("node:test");
const {
  WorkCardCloseWorkspace,
  workCardCloseProjectionFromResult,
} = require("./renderer-source-loader.cjs")
  .loadRendererSourceModule("src/renderer/app/WorkCardCloseWorkspace.tsx");
const {
  closeReturnSelectionProjectionFromResult,
  executeCloseReturnCandidateIntake,
  executeCloseReturnToMap,
} = require("./renderer-source-loader.cjs")
  .loadRendererSourceModule("src/renderer/app/closeReturnRendererOrchestration.ts");

function closeModel() {
  return {
    activeWorkspaceId: "work-card-close",
    currentPhaseId: "phase-08",
    currentWorkCardId: "WC44-REPAIR05",
    currentTarget: "Close / Next Work Card",
    sourceEvidence: [
      "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC44-REPAIR05_work_card_close_next_workspace_completion.md",
      "planning/phases/phase-08/Validation_Records/VALIDATION_RECORD_WC44-REPAIR05_ATTEMPT01.md",
    ],
    executionContext: {
      workCard: {
        title: "Work Card Close / Next Workspace Completion",
      },
    },
  };
}

function closeDocuments() {
  return [
    {
      logicalDocumentId: "report-doc",
      markdownPath: "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC44-REPAIR05_work_card_close_next_workspace_completion.md",
      displayFilename: "IMPLEMENTER_REPORT_WC44-REPAIR05_work_card_close_next_workspace_completion.md",
      documentReadState: "readable",
      effectiveDisposition: "Pending",
      metadata: { artifactType: "implementer-report", participationRole: "gatingReview" },
    },
    {
      logicalDocumentId: "validation-doc",
      markdownPath: "planning/phases/phase-08/Validation_Records/VALIDATION_RECORD_WC44-REPAIR05_ATTEMPT01.md",
      displayFilename: "VALIDATION_RECORD_WC44-REPAIR05_ATTEMPT01.md",
      documentReadState: "readable",
      effectiveDisposition: "Approved",
      metadata: { artifactType: "validation-record", participationRole: "gatingReview" },
    },
  ];
}

function renderWorkspace(overrides = {}) {
  return renderToStaticMarkup(
    React.createElement(WorkCardCloseWorkspace, {
      actionError: "",
      actionFeedback: "",
      documents: closeDocuments(),
      isReturning: false,
      model: closeModel(),
      onReturnToSelection: () => undefined,
      projectionResult: {
        ok: true,
        action: "currentWorkflow:getWorkCardCloseProjection",
        message: "Work Card close projection loaded.",
        payload: {
          closed: true,
          returnTarget: "phase-work-card-selection",
          reason: "Current Approved Validation Record closes the Work Card.",
        },
      },
      ...overrides,
    }),
  );
}

function mapCandidate(candidateId, order, status) {
  return {
    candidateId,
    order,
    title: `${candidateId} title`,
    purpose: `${candidateId} purpose`,
    dependsOn: order === 1 ? [] : ["WC01"],
    status,
    reason: `${candidateId} is ${status}.`,
    evidencePaths: status === "Complete" ? [`planning/${candidateId}-validation.md`] : [],
    handoffMarkdownPath: `planning/${candidateId}-handoff.md`,
    formalWorkCardMarkdownPath: `planning/${candidateId}.md`,
    isActive: false,
  };
}

function closeReturnProjection(state = "selection-required") {
  const candidates = [
    mapCandidate("WC00", 1, "Complete"),
    mapCandidate("WC01", 2, "Complete"),
    mapCandidate("WC02", 3, "Eligible"),
    mapCandidate("WC03", 4, "Eligible"),
  ];
  const common = {
    state,
    phaseId: "phase-08",
    closedWorkCardId: "WC01",
    close: {
      closed: true,
      returnTarget: "phase-work-card-selection",
      reason: "The current Work Card is effectively complete.",
    },
    closeReturnRecordPath: "planning/phases/phase-08/Close_Return_Records/WC01.md",
    closeReturnRecordRevision: 1,
    closeReturnRecordReused: false,
    candidates,
    explanations: candidates.map((candidate) => ({
      candidateId: candidate.candidateId,
      state: candidate.status === "Complete" ? "complete" : "eligible",
      reason: candidate.reason,
      evidencePaths: candidate.evidencePaths,
    })),
  };
  if (state === "selection-required") {
    return {
      ...common,
      sourceWorkCardPlanPath: "planning/phases/phase-08/Work_Card_Plan.md",
      eligibleCandidates: candidates.slice(2),
    };
  }
  if (state === "all-complete") {
    return {
      ...common,
      candidates: candidates.map((candidate) => ({ ...candidate, status: "Complete" })),
      continuationTarget: "phase-validation",
      reason: "All planned Work Cards are complete.",
    };
  }
  return {
    ...common,
    blockerState: "dependency-blocked",
    candidates: candidates.map((candidate) => ({ ...candidate, status: "Ineligible" })),
    reason: "Current dependency state requires attention.",
  };
}

function orchestrationApi(calls, projection = closeReturnProjection()) {
  return {
    async getCloseReturnSelectionProjection() {
      calls.push("getCloseReturnSelectionProjection");
      return {
        ok: true,
        action: "currentWorkflow:getCloseReturnSelectionProjection",
        message: "Close return consumed.",
        payload: projection,
      };
    },
    async generateCloseReturnNextIntakeHandoff(candidateId) {
      calls.push(`generateCloseReturnNextIntakeHandoff:${candidateId}`);
      return {
        ok: true,
        action: "currentWorkflow:generateCloseReturnNextIntakeHandoff",
        message: "Selected intake established.",
        payload: { candidateId },
      };
    },
    async listDocuments() {
      calls.push("listDocuments");
      return [];
    },
    async getProjectPlanningWorkspaceModel() {
      calls.push("getProjectPlanningWorkspaceModel");
      return { state: "ready" };
    },
    async getCurrentWorkspaceModel() {
      calls.push("getCurrentWorkspaceModel");
      return {
        activeWorkspaceId: "work-card-intake",
        currentWorkCardId: "WC03",
        executionContext: { workCard: { workCardId: "WC03" } },
      };
    },
    async resolveCurrentDocument() {
      calls.push("resolveCurrentDocument");
      return { status: "current" };
    },
    async getWorkCardMapProjection(phaseId) {
      calls.push(`getWorkCardMapProjection:${phaseId}`);
      return {
        ok: true,
        action: "currentWorkflow:getWorkCardMapProjection",
        message: "Default map loaded.",
        payload: { phaseId, state: projection.state },
      };
    },
  };
}

test("Work Card Close workspace renders projection, evidence names, and return action", () => {
  const markup = renderWorkspace();

  assert.match(markup, /Work Card Close workspace/);
  assert.match(markup, /WC44-REPAIR05 - Work Card Close \/ Next Workspace Completion/);
  assert.match(markup, /phase-08 \/ WC44-REPAIR05/);
  assert.match(markup, /Closed/);
  assert.match(markup, /phase-work-card-selection/);
  assert.match(markup, /Current Approved Validation Record closes the Work Card\./);
  assert.match(markup, /IMPLEMENTER_REPORT_WC44-REPAIR05_work_card_close_next_workspace_completion\.md/);
  assert.match(markup, /VALIDATION_RECORD_WC44-REPAIR05_ATTEMPT01\.md/);
  assert.match(markup, /Pending \/ readable/);
  assert.match(markup, /Approved \/ readable/);
  assert.match(markup, /Return to Phase Building \/ Next Work Card/);
  assert.doesNotMatch(markup, /Run Current Handoff Action/);
});

test("Work Card Close workspace blocks return when projection is not closed", () => {
  const markup = renderWorkspace({
    projectionResult: {
      ok: true,
      action: "currentWorkflow:getWorkCardCloseProjection",
      message: "Work Card close projection loaded.",
      payload: {
        closed: false,
        returnTarget: "work-card-validation",
        reason: "Work Card close requires a current, readable, Approved Validation Record.",
      },
    },
  });

  assert.match(markup, /Not Closed/);
  assert.match(markup, /Work Card close requires a current, readable, Approved Validation Record\./);
  assert.match(markup, /<button[^>]*disabled=""/);
});

test("Work Card Close parser rejects malformed close projection payloads", () => {
  assert.deepEqual(workCardCloseProjectionFromResult(null), null);
  assert.deepEqual(workCardCloseProjectionFromResult({
    ok: true,
    action: "currentWorkflow:getWorkCardCloseProjection",
    message: "loaded",
    payload: { closed: true, reason: "missing return target" },
  }), null);
  assert.deepEqual(workCardCloseProjectionFromResult({
    ok: true,
    action: "currentWorkflow:getWorkCardCloseProjection",
    message: "loaded",
    payload: {
      closed: true,
      returnTarget: "phase-work-card-selection",
      reason: "closed",
    },
  }), {
    closed: true,
    returnTarget: "phase-work-card-selection",
    reason: "closed",
  });
});

test("Close / Next executes canonical consumption followed by default repository refresh", async () => {
  const calls = [];
  const api = orchestrationApi(calls);
  let consumedProjection = null;

  assert.deepEqual(calls, []);
  const transition = await executeCloseReturnToMap(api, (projection) => {
    calls.push(`consumed:${projection.state}`);
    consumedProjection = projection;
  });

  assert.deepEqual(calls, [
    "getCloseReturnSelectionProjection",
    "consumed:selection-required",
    "listDocuments",
    "getProjectPlanningWorkspaceModel",
    "getCurrentWorkspaceModel",
    "resolveCurrentDocument",
    "getWorkCardMapProjection:phase-08",
  ]);
  assert.equal(consumedProjection.state, "selection-required");
  assert.deepEqual(
    transition.projection.eligibleCandidates.map((candidate) => candidate.candidateId),
    ["WC02", "WC03"],
  );
  assert.equal(transition.projection.candidates[0].status, "Complete");
  assert.equal(transition.projection.candidates[0].isActive, false);
  assert.equal(transition.projection.candidates[1].status, "Complete");
  assert.equal(transition.projection.candidates[1].isActive, false);
  assert.equal(transition.mapResult.message, "Default map loaded.");
});

test("Close-return parser and orchestration reject malformed results before false navigation", async () => {
  const malformed = {
    ok: true,
    action: "currentWorkflow:getCloseReturnSelectionProjection",
    message: "Malformed response.",
    payload: {
      ...closeReturnProjection(),
      eligibleCandidates: "WC02",
    },
  };
  assert.equal(closeReturnSelectionProjectionFromResult(malformed), null);

  const calls = [];
  const api = orchestrationApi(calls);
  api.getCloseReturnSelectionProjection = async () => {
    calls.push("getCloseReturnSelectionProjection");
    return malformed;
  };
  await assert.rejects(
    executeCloseReturnToMap(api),
    /malformed canonical selection projection/,
  );
  assert.deepEqual(calls, ["getCloseReturnSelectionProjection"]);
});

test("all-complete and needs-attention close returns refresh the map without creating intake", async () => {
  for (const state of ["all-complete", "needs-attention"]) {
    const calls = [];
    const transition = await executeCloseReturnToMap(
      orchestrationApi(calls, closeReturnProjection(state)),
    );
    assert.equal(transition.projection.state, state);
    assert.equal(calls.includes("getWorkCardMapProjection:phase-08"), true);
    assert.equal(calls.some((call) => call.startsWith("generateCloseReturnNextIntakeHandoff")), false);
  }
});

test("explicit non-first candidate selection uses close-return intake and refreshes state", async () => {
  const calls = [];
  const transition = await executeCloseReturnCandidateIntake(
    orchestrationApi(calls),
    "phase-08",
    "WC03",
  );

  assert.equal(transition.state, "established");
  assert.deepEqual(calls, [
    "generateCloseReturnNextIntakeHandoff:WC03",
    "listDocuments",
    "getProjectPlanningWorkspaceModel",
    "getCurrentWorkspaceModel",
    "resolveCurrentDocument",
  ]);
  assert.equal(transition.currentModel.currentWorkCardId, "WC03");
});

test("rejected close-return candidate preserves the error and reloads only the default map", async () => {
  const calls = [];
  const api = orchestrationApi(calls);
  api.generateCloseReturnNextIntakeHandoff = async (candidateId) => {
    calls.push(`generateCloseReturnNextIntakeHandoff:${candidateId}`);
    throw new Error("WC02 is no longer Eligible.");
  };

  const transition = await executeCloseReturnCandidateIntake(api, "phase-08", "WC02");
  assert.equal(transition.state, "rejected");
  assert.match(transition.error.message, /no longer Eligible/);
  assert.equal(transition.mapResult.message, "Default map loaded.");
  assert.deepEqual(calls, [
    "generateCloseReturnNextIntakeHandoff:WC02",
    "getWorkCardMapProjection:phase-08",
  ]);
});
