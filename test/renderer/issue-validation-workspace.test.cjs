const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const test = require("node:test");

const loader = require("./renderer-source-loader.cjs");
const { IssueValidationWorkspace } = loader.loadRendererSourceModule("src/renderer/app/IssueValidationWorkspace.tsx");
const { IssueResolutionRail } = loader.loadRendererSourceModule("src/renderer/app/IssueResolutionRail.tsx");

const repoRoot = path.join(__dirname, "..", "..");

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

test("parent renderer consumes repository-derived Issue Planning destination after corrective decision and on re-entry", () => {
  const appSource = fs.readFileSync(path.join(repoRoot, "src", "renderer", "app", "App.tsx"), "utf8");
  const applyPostMutationSource = extractFunctionSource(
    appSource,
    "function applyIssuePostMutationProjection",
    "function focusProjectIntakeReviewSurface",
  );
  const decisionSource = extractFunctionSource(
    appSource,
    "async function runIssueValidationDecision",
    "async function refreshIssueCloseProjection",
  );
  const selectionSource = extractFunctionSource(
    appSource,
    "async function selectIssueFromSidebar",
    "function browseIssuesFromSidebar",
  );

  assert.match(decisionSource, /applyIssuePostMutationProjection\(result\.postMutation, \{ synchronizeStage: true \}\)/);
  assert.match(applyPostMutationSource, /setActiveIssueStageId\(projection\.navigation\.currentStageId\)/);
  assert.match(applyPostMutationSource, /projection\.planning[\s\S]*setIssuePlanningProjection\(projection\.planning\)/);
  assert.match(selectionSource, /const nextStage: IssueResolutionStageId = navigation\.currentStageId/);
  assert.match(selectionSource, /setActiveIssueStageId\(nextStage\)/);
  assert.match(selectionSource, /nextStage === "issue-planning"[\s\S]*getIssuePlanningProjection\(issueId\)/);
  assert.doesNotMatch(`${applyPostMutationSource}\n${decisionSource}\n${selectionSource}`, /setTimeout|correctiveStage|correctiveMode/);
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

function extractFunctionSource(source, startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  assert.notEqual(start, -1, `${startNeedle} not found`);
  const end = source.indexOf(endNeedle, start);
  assert.notEqual(end, -1, `${endNeedle} not found after ${startNeedle}`);
  return source.slice(start, end);
}
