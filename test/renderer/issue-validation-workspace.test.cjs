const assert = require("node:assert/strict");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const test = require("node:test");

const loader = require("./renderer-source-loader.cjs");
const { IssueValidationWorkspace } = loader.loadRendererSourceModule("src/renderer/app/IssueValidationWorkspace.tsx");
const { IssueResolutionRail } = loader.loadRendererSourceModule("src/renderer/app/IssueResolutionRail.tsx");

const { loadProductionFunctions } = require("../support/production-execution.cjs");

test("aggregate Issue Validation workspace presents exact Issue, plan, close record, and explicit non-Repair decisions", () => {
  const projection = issueValidationProjection();
  const markup = renderToStaticMarkup(React.createElement(IssueValidationWorkspace, {
    actionError: "",
    actionFeedback: "",
    actionPending: false,
    currentIssue: currentIssue(),
    onApplyDecision: () => undefined,
    onRefresh: () => undefined,
    projection,
  }));

  assert.match(markup, /<h1 id="workspace-heading">Issue Validation<\/h1>/);
  assert.match(markup, /Aggregate Issue Validation asks whether the combined closed Fix Cards resolve the original Issue/);
  assert.match(markup, /distinct from Fix Card Validation and does not close the Issue/);
  assert.match(markup, /ISSUE_301: Aggregate validation presentation/);
  assert.match(markup, /Original Issue/);
  assert.match(markup, /Accepted Architect Investigation/);
  assert.match(markup, /Current Issue Resolution Plan/);
  assert.match(markup, /Current Fix Card Plan/);
  assert.match(markup, /Ordered Completed Fix Card Close Records/);
  assert.match(markup, /fix-card-validation/);
  assert.match(markup, /bootstrap-cutover/);
  assert.match(markup, /Validate Issue Resolved/);
  assert.match(markup, /Request Further Corrective Work/);
  assert.match(markup, /<button class="apply-button"[^>]*>.*Validate Issue Resolved/s);
  assert.match(markup, /<button class="apply-button secondary" disabled=""[^>]*>.*Request Further Corrective Work/s);
  assert.doesNotMatch(markup, /Request Repair|Fix Card Repair|Repair controls/);
  assert.doesNotMatch(markup, /Issue Close Record|Return to Workflow Hub/);
});

test("parent Issue rail exposes repository-derived Issue Validation eligibility without adding it to the Fix Card loop", () => {
  const markup = renderToStaticMarkup(React.createElement(IssueResolutionRail, {
    activeStageId: "issue-validation",
    currentIssue: currentIssue(),
    fixCardsAvailable: true,
    issuePlanningAvailable: true,
    navigationProjection: {
      issueId: "ISSUE_301",
      title: "Aggregate validation presentation",
      stages: [
        { stageId: "intake", available: true, stateLabel: "Available", reason: "Available." },
        { stageId: "architect-planning", available: true, stateLabel: "Available", reason: "Available." },
        { stageId: "issue-planning", available: true, stateLabel: "Available", reason: "Available." },
        { stageId: "fix-cards", available: true, stateLabel: "Fix Card Map Ready", reason: "Available." },
        { stageId: "issue-validation", available: true, stateLabel: "Eligible", reason: "All closed." },
        { stageId: "issue-close", available: false, stateLabel: "Unavailable", reason: "Later card." },
      ],
      issuePlanningAvailable: true,
      fixCardsAvailable: true,
      allFixCardsClosed: true,
      issueValidationAvailable: true,
      currentStageId: "issue-validation",
      workflowStatus: null,
      fixCardsWorkflowStatus: null,
    },
    onStageChange: () => undefined,
  }));

  assert.match(markup, /05 Issue Validation[\s\S]*?Current/);
  assert.doesNotMatch(markup, /aria-label="Issue Fix Card loop"/);
});

test("parent renderer follows repository Issue destinations after corrective decision and re-entry", async () => {
  for (const destination of ["issue-planning", "issue-validation", "issue-close"]) {
    const state = {};
    const calls = [];
    const planning = { issueId: "ISSUE_301", state: "corrective-work-required" };
    const validation = issueValidationProjection();
    const close = { issueId: "ISSUE_301", state: "ready" };
    const navigation = { currentStageId: destination };
    const projection = { navigation, planning, validation, close };
    const input = { decision: destination === "issue-planning" ? "RequestCorrectiveWork" : "ValidateResolved", operatorNotes: "Additional correction required." };
    const scope = {
      currentIssue: currentIssue(),
      issueCodexExecutionPreviousStateRef: { current: null },
      issueCodexExecutionContextRef: { current: null },
      dispatchCodexExecutionPresentation() {},
      refreshIssueValidationProjection: async () => assert.fail("No fallback refresh expected"),
      setTimeout: () => assert.fail("Repository projection must apply without a timer"),
      window: { champcity: {
        applyIssueValidationDecision: async (...args) => { calls.push(["decision", ...args]); return { projection: validation, postMutation: projection, message: "Recorded" }; },
        getIssueResolutionNavigationProjection: async (id) => { calls.push(["navigation", id]); return navigation; },
        getIssuePlanningProjection: async (id) => { calls.push(["planning", id]); return planning; },
        getIssueValidationProjection: async (id) => { calls.push(["validation", id]); return validation; },
        getIssueCloseProjection: async (id) => { calls.push(["close", id]); return close; },
      } },
    };
    for (const name of ["IssueNavigationProjection", "IssuePlanningProjection", "IssueValidationProjection",
      "IssueCloseProjection", "ActiveIssueStageId", "IssuePlanningActionError", "IssuePlanningActionFeedback",
      "IsIssuePlanningActionPending", "SelectedIssueId", "ActiveIssueFixCardStepId", "IssueFixCardProjection", "IssueArchitectProjection"]) {
      scope["set" + name] = (value) => { state[name] = value; };
    }
    const actions = loadProductionFunctions("src/renderer/app/App.tsx", [
      "applyIssuePostMutationProjection", "runIssueValidationDecision", "selectIssueFromSidebar",
    ], scope);
    await actions.runIssueValidationDecision(input);
    assert.equal(state.ActiveIssueStageId, destination);
    assert.equal(state.IssuePlanningProjection, planning);
    assert.equal(state.IssueNavigationProjection, navigation);
    assert.equal(state.IssuePlanningActionError, "");
    assert.equal(state.IsIssuePlanningActionPending, false);
    assert.deepEqual(calls, [["decision", "ISSUE_301", input]]);
    state.ActiveIssueStageId = "intake";
    state.IssuePlanningProjection = null;
    await actions.selectIssueFromSidebar("ISSUE_301");
    assert.equal(state.ActiveIssueStageId, destination);
    assert.equal(state.IssuePlanningActionError, "");
    assert.equal(state.IssueNavigationProjection, navigation);
    assert.equal(state.SelectedIssueId, "ISSUE_301");
    assert.deepEqual(calls.slice(1), [["navigation", "ISSUE_301"], [
      destination === "issue-planning" ? "planning" : destination === "issue-validation" ? "validation" : "close", "ISSUE_301",
    ]]);
    assert.equal(state.IssuePlanningProjection, destination === "issue-planning" ? planning : null);
  }
});

function currentIssue() {
  return {
    issueId: "ISSUE_301",
    numericId: 301,
    title: "Aggregate validation presentation",
    recordPath: "issues/ISSUE_301/ISSUE_RECORD.md",
    recordState: "readable",
    bodyMarkdown: "# ISSUE_301 - Aggregate validation presentation",
  };
}

function issueValidationProjection() {
  const sourceEvidence = [
    ["Original Issue", "issues/ISSUE_301/ISSUE_RECORD.md"],
    ["Accepted Architect Investigation", "issues/ISSUE_301/ARCHITECT_INVESTIGATION.md"],
    ["Accepted Architect Review", "issues/ISSUE_301/ARCHITECT_REVIEW.md"],
    ["Current Issue Resolution Plan", "issues/ISSUE_301/ISSUE_RESOLUTION_PLAN.md"],
    ["Current Fix Card Plan", "issues/ISSUE_301/FIX_CARD_PLAN.md"],
    ["Current Approved Issue Planning Review", "issues/ISSUE_301/ISSUE_PLANNING_REVIEW.md"],
  ].map(([label, path]) => ({
    label,
    path,
    revision: 1,
    sha256: "a".repeat(64),
    state: "readable",
    bodyMarkdown: `# ${label}\n\nCurrent repository evidence.`,
  }));
  return {
    issueId: "ISSUE_301",
    title: "Aggregate validation presentation",
    status: "eligible",
    statusMessage: "Every current Fix Card Plan candidate has valid close record. Aggregate Issue Validation is eligible.",
    eligible: true,
    sourceEvidence,
    completedFixCards: [
      {
        fixCardId: "ISSUE_301-FC01",
        order: 1,
        title: "Normal close record",
        closeRecordPath: "issues/ISSUE_301/Close_Records/FIX_CARD_CLOSE_RECORD_ISSUE_301-FC01.md",
        closeRecordOrigin: "fix-card-validation",
        closeRecordRevision: 1,
        currentImplementationId: "ISSUE_301-FC01",
        reason: "Current.",
      },
      {
        fixCardId: "ISSUE_301-FC02",
        order: 2,
        title: "Bootstrap close record",
        closeRecordPath: "issues/ISSUE_301/Close_Records/FIX_CARD_CLOSE_RECORD_ISSUE_301-FC02.md",
        closeRecordOrigin: "bootstrap-cutover",
        closeRecordRevision: 1,
        currentImplementationId: "ISSUE_301-FC02",
        reason: "Current.",
      },
    ],
    evidenceSha256: "b".repeat(64),
    planningDisposition: "Approved",
    currentRecordState: "missing",
    nextAttemptNumber: 1,
    canValidateResolved: true,
    canRequestCorrectiveWork: true,
    workflowStatus: {
      issueId: "ISSUE_301",
      stageId: "issue-validation",
      stageLabel: "Issue Validation",
      state: "eligible",
      stateLabel: "Eligible",
      issuePlanningEligible: true,
      fixCardsEligible: true,
      reason: "All closed.",
    },
  };
}
