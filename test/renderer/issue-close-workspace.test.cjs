const assert = require("node:assert/strict");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const test = require("node:test");

const loader = require("./renderer-source-loader.cjs");
const { IssueCloseWorkspace } = loader.loadRendererSourceModule("src/renderer/app/IssueCloseWorkspace.tsx");
const { IssueResolutionRail } = loader.loadRendererSourceModule("src/renderer/app/IssueResolutionRail.tsx");

test("Issue Close workspace presents exact Issue, ordered Fix Cards, Approved validation, and one final action", () => {
  const markup = renderToStaticMarkup(React.createElement(IssueCloseWorkspace, {
    actionError: "",
    actionFeedback: "",
    actionPending: false,
    currentIssue: currentIssue(),
    isLoading: false,
    onClose: () => undefined,
    onRefresh: () => undefined,
    projection: issueCloseProjection(),
  }));

  assert.match(markup, /<h1 id="workspace-heading">Issue Close<\/h1>/);
  assert.match(markup, /ISSUE_501: Final Issue Close presentation/);
  assert.match(markup, /Original Issue Problem and Record/);
  assert.match(markup, /Original repository problem/);
  assert.match(markup, /Ordered Completed Fix Card Summary/);
  assert.match(markup, /ISSUE_501-FC01/);
  assert.match(markup, /ISSUE_501-FC02/);
  assert.match(markup, /Approved Aggregate Issue Validation/);
  assert.match(markup, /ATTEMPT02 \/ ValidateResolved/);
  assert.match(markup, /Operator confirmed the exact aggregate outcome/);
  assert.match(markup, /Final Issue-level close record/);
  assert.match(markup, /returns to the Workflow Hub/);
  assert.match(markup, /later Development entry uses the existing repository resolver/);
  assert.match(markup, /<button class="apply-button"[^>]*>Close Issue<\/button>/);
  assert.doesNotMatch(markup, /Close Fix Card|Project Close|Phase Close|Request Repair|auto-enter Development/);
});

test("Closed and Needs Attention projections never expose another Close Issue action", () => {
  const closed = renderToStaticMarkup(React.createElement(IssueCloseWorkspace, {
    actionError: "",
    actionFeedback: "Issue closed.",
    actionPending: false,
    currentIssue: currentIssue(),
    isLoading: false,
    onClose: () => undefined,
    onRefresh: () => undefined,
    projection: issueCloseProjection({
      status: "closed",
      statusMessage: "Canonical terminal record is current.",
      eligible: false,
      validationBasisSha256: undefined,
      canCloseIssue: false,
      closeRecord: {
        path: "issues/ISSUE_501/Close_Records/ISSUE_CLOSE_RECORD_ISSUE_501.md",
        state: "readable",
        revision: 1,
      },
      workflowStatus: { ...issueCloseProjection().workflowStatus, state: "closed", stateLabel: "Closed" },
    }),
  }));
  assert.match(closed, /Closed/);
  assert.match(closed, /Issue closed\./);
  assert.doesNotMatch(closed, />Close Issue<\/button>/);

  const needsAttention = renderToStaticMarkup(React.createElement(IssueCloseWorkspace, {
    actionError: "",
    actionFeedback: "",
    actionPending: false,
    currentIssue: currentIssue(),
    isLoading: false,
    onClose: () => undefined,
    onRefresh: () => undefined,
    projection: issueCloseProjection({
      status: "needs-attention",
      eligible: false,
      validationBasisSha256: undefined,
      canCloseIssue: false,
      closeRecord: {
        path: "issues/ISSUE_501/Close_Records/ISSUE_CLOSE_RECORD_ISSUE_501.md",
        state: "read-error",
        readError: "Close record fingerprint is stale.",
      },
      workflowStatus: { ...issueCloseProjection().workflowStatus, state: "needs-attention", stateLabel: "Needs Attention" },
    }),
  }));
  assert.match(needsAttention, /Close record fingerprint is stale/);
  assert.match(needsAttention, /role="alert"/);
  assert.doesNotMatch(needsAttention, />Close Issue<\/button>/);
});

test("parent Issue rail foregrounds repository-derived Issue Close without adding a nested close loop", () => {
  const markup = renderToStaticMarkup(React.createElement(IssueResolutionRail, {
    activeStageId: "issue-close",
    currentIssue: currentIssue(),
    fixCardsAvailable: true,
    issuePlanningAvailable: true,
    navigationProjection: navigationProjection(),
    onStageChange: () => undefined,
  }));

  assert.match(markup, /06 Issue Close[\s\S]*?Current/);
  assert.match(markup, /05 Issue Validation[\s\S]*?Available/);
  assert.doesNotMatch(markup, /aria-label="Issue Fix Card loop"/);
});

function currentIssue() {
  return {
    issueId: "ISSUE_501",
    numericId: 501,
    title: "Final Issue Close presentation",
    recordPath: "issues/ISSUE_501/ISSUE_RECORD.md",
    recordState: "readable",
    bodyMarkdown: "# ISSUE_501 - Final Issue Close presentation\n\n## Issue\nOriginal repository problem.",
  };
}

function issueCloseProjection(overrides = {}) {
  const projection = {
    issueId: "ISSUE_501",
    title: "Final Issue Close presentation",
    status: "eligible",
    statusMessage: "Exact current state is ready for final Issue closure.",
    eligible: true,
    issueRecordPath: "issues/ISSUE_501/ISSUE_RECORD.md",
    issueRecordState: "readable",
    issueRecordMarkdown: currentIssue().bodyMarkdown,
    sourceEvidence: [],
    completedFixCards: [
      {
        fixCardId: "ISSUE_501-FC01",
        order: 1,
        title: "Repository close foundation",
        closeRecordPath: "issues/ISSUE_501/Close_Records/FIX_CARD_CLOSE_RECORD_ISSUE_501-FC01.md",
        closeRecordOrigin: "fix-card-validation",
        closeRecordRevision: 1,
        currentImplementationId: "ISSUE_501-FC01",
        reason: "Current.",
      },
      {
        fixCardId: "ISSUE_501-FC02",
        order: 2,
        title: "Lifecycle preservation proof",
        closeRecordPath: "issues/ISSUE_501/Close_Records/FIX_CARD_CLOSE_RECORD_ISSUE_501-FC02.md",
        closeRecordOrigin: "bootstrap-cutover",
        closeRecordRevision: 1,
        currentImplementationId: "ISSUE_501-FC02-REPAIR01",
        repairId: "ISSUE_501-FC02-REPAIR01",
        reason: "Current.",
      },
    ],
    validationBasis: {
      recordPath: "issues/ISSUE_501/Validation_Records/ISSUE_VALIDATION_RECORD_ISSUE_501_ATTEMPT02.md",
      recordRevision: 1,
      recordMarkdown: "# ISSUE_501 - Issue Validation Record - Attempt 02\n\nValidateResolved",
      recordSha256: "a".repeat(64),
      attemptNumber: 2,
      disposition: "Approved",
      decision: "ValidateResolved",
      operatorNotes: "Operator confirmed the exact aggregate outcome.",
      aggregateEvidenceSha256: "b".repeat(64),
    },
    validationBasisSha256: "c".repeat(64),
    closeRecord: {
      path: "issues/ISSUE_501/Close_Records/ISSUE_CLOSE_RECORD_ISSUE_501.md",
      state: "missing",
    },
    canCloseIssue: true,
    workflowStatus: {
      issueId: "ISSUE_501",
      stageId: "issue-close",
      stageLabel: "Issue Close",
      state: "eligible",
      stateLabel: "Ready to Close",
      issuePlanningEligible: true,
      fixCardsEligible: true,
      reason: "Exact current state is ready.",
    },
  };
  return { ...projection, ...overrides };
}

function navigationProjection() {
  return {
    issueId: "ISSUE_501",
    title: "Final Issue Close presentation",
    stages: [
      { stageId: "intake", available: true, stateLabel: "Available", reason: "Available." },
      { stageId: "architect-planning", available: true, stateLabel: "Available", reason: "Available." },
      { stageId: "issue-planning", available: true, stateLabel: "Available", reason: "Available." },
      { stageId: "fix-cards", available: true, stateLabel: "Fix Card Map Ready", reason: "Available." },
      { stageId: "issue-validation", available: true, stateLabel: "Approved", reason: "Approved." },
      { stageId: "issue-close", available: true, stateLabel: "Ready to Close", reason: "Current." },
    ],
    issuePlanningAvailable: true,
    fixCardsAvailable: true,
    allFixCardsClosed: true,
    issueValidationAvailable: true,
    issueCloseAvailable: true,
    currentStageId: "issue-close",
    workflowStatus: issueCloseProjection().workflowStatus,
    fixCardsWorkflowStatus: null,
  };
}
