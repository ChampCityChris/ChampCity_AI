const assert = require("node:assert/strict");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const test = require("node:test");

const loader = require("./renderer-source-loader.cjs");
const { IssueArchitectPlanningWorkspace } = loader.loadRendererSourceModule("src/renderer/app/IssueArchitectPlanningWorkspace.tsx");
const { FigmaBrowserPanel } = loader.loadRendererSourceModule("src/renderer/app/figma/FigmaBrowserPanel.tsx");

test("Architect Planning workspace shows Issue evidence, target path, controls, and embedded browser", () => {
  const projection = {
    issueId: "ISSUE_002",
    title: "Blank shell",
    issueRecordPath: "issues/ISSUE_002/ISSUE_RECORD.md",
    issueRecordMarkdown: "# ISSUE_002 - Blank shell\n\n## Issue\nThe shell is blank.",
    issueRecordState: "readable",
    finalInvestigationPath: "issues/ISSUE_002/ARCHITECT_INVESTIGATION.md",
    finalInvestigationState: "missing",
    reviewPath: "issues/ISSUE_002/ARCHITECT_REVIEW.md",
    reviewState: "missing",
    status: "handoff-prepared",
    statusMessage: "Architect handoff prepared. Copy it and send it in embedded ChatGPT.",
    workflowStatus: {
      issueId: "ISSUE_002",
      stageId: "architect-planning",
      stageLabel: "Architect Planning",
      state: "handoff-prepared",
      stateLabel: "Handoff Prepared",
      issuePlanningEligible: false,
      reason: "Architect handoff prepared. Copy it and send it in embedded ChatGPT.",
    },
    issuePlanningEligible: false,
    activeSubmission: {
      submissionId: "submission-1",
      temporaryDraftPath: "issues/Architect_Drafts/submission-1/architect-investigation.md",
      preparedInstruction: "prepared",
    },
    canPrepareHandoff: true,
    canCopyHandoff: true,
    canPromoteDraft: false,
  };
  const markup = renderToStaticMarkup(React.createElement(IssueArchitectPlanningWorkspace, {
    actionError: "",
    actionFeedback: "",
    browserPanel: React.createElement(FigmaBrowserPanel, {
      hostRef: { current: null },
      onReload: () => undefined,
      onRetry: () => undefined,
      retryVisible: false,
      statusLabel: "ChatGPT ready",
    }),
    currentIssue: {
      issueId: "ISSUE_002",
      numericId: 2,
      title: "Blank shell",
      recordPath: "issues/ISSUE_002/ISSUE_RECORD.md",
      recordState: "readable",
      bodyMarkdown: "# ISSUE_002",
    },
    isActionPending: false,
    onApplyReview: async () => undefined,
    onCopyHandoff: () => undefined,
    onPrepareHandoff: () => undefined,
    onRefresh: () => undefined,
    onReloadBrowser: () => undefined,
    projection,
    projectName: "ChampCity_AI",
  }));

  assert.match(markup, /Architect Planning/);
  assert.match(markup, /issue-document-chat-workspace-shell issue-architect-workspace/);
  assert.match(markup, /ISSUE_002: Blank shell/);
  assert.match(markup, /figma-doc-chat-workspace issue-architect-doc-chat-workspace/);
  assert.match(markup, /figma-doc-review-column issue-architect-review-column/);
  assert.match(markup, /figma-document-card issue-architect-document-card/);
  assert.match(markup, /issues\/ISSUE_002\/ISSUE_RECORD\.md/);
  assert.match(markup, /Handoff Prepared/);
  assert.match(markup, /ISSUE_RECORD\.md/);
  assert.doesNotMatch(markup, /issues\/Architect_Drafts\/submission-1\/architect-investigation\.md/);
  assert.match(markup, /figma-browser-actions-panel issue-architect-browser-actions-panel/);
  assert.match(markup, /Reload ChatGPT/);
  assert.match(markup, /Prepare Handoff/);
  assert.match(markup, /Copy Handoff/);
  assert.doesNotMatch(markup, /Promote Draft/);
  assert.match(markup, /aria-label="Embedded ChatGPT browser"/);
  assert.match(markup, /figma-browser-column issue-architect-browser-column/);
  assert.doesNotMatch(markup, /issue-architect-status-panel|issue-architect-facts|Current Phase|Current Work Card|Document Disposition|Phase Position|Work Card Planning/);
});

test("awaiting-review Architect Investigation renders Figma disposition below the document pane", () => {
  const markup = renderToStaticMarkup(React.createElement(IssueArchitectPlanningWorkspace, {
    actionError: "",
    actionFeedback: "",
    browserPanel: React.createElement("div", null, "Browser"),
    currentIssue: {
      issueId: "ISSUE_001",
      numericId: 1,
      title: "No Independent Issue Resolution Workflow",
      recordPath: "issues/ISSUE_001/ISSUE_RECORD.md",
      recordState: "readable",
      bodyMarkdown: "# ISSUE_001",
    },
    isActionPending: false,
    onApplyReview: async () => undefined,
    onCopyHandoff: () => undefined,
    onPrepareHandoff: () => undefined,
    onRefresh: () => undefined,
    onReloadBrowser: () => undefined,
    projection: {
      issueId: "ISSUE_001",
      title: "No Independent Issue Resolution Workflow",
      issueRecordPath: "issues/ISSUE_001/ISSUE_RECORD.md",
      issueRecordMarkdown: "# ISSUE_001\n\n## Issue\nExisting.",
      issueRecordState: "readable",
      finalInvestigationPath: "issues/ISSUE_001/ARCHITECT_INVESTIGATION.md",
      finalInvestigationState: "readable",
      finalInvestigationMarkdown: "# ISSUE_001 \u2014 Architect Investigation\n\n## Purpose\nExisting final.",
      architectRecommendation: "Proceed in Issue Resolution",
      reviewPath: "issues/ISSUE_001/ARCHITECT_REVIEW.md",
      reviewState: "missing",
      status: "awaiting-operator-review",
      statusMessage: "Architect Investigation is ready for Operator review.",
      workflowStatus: {
        issueId: "ISSUE_001",
        stageId: "architect-planning",
        stageLabel: "Architect Planning",
        state: "awaiting-operator-review",
        stateLabel: "Awaiting Operator Review",
        issuePlanningEligible: false,
        reason: "Architect Investigation is ready for Operator review.",
      },
      issuePlanningEligible: false,
      canPrepareHandoff: false,
      canCopyHandoff: false,
      canPromoteDraft: false,
    },
    projectName: "ChampCity_AI",
  }));

  assert.match(markup, /Architect Investigation is ready for Operator review/);
  assert.match(markup, /Awaiting Operator Review/);
  assert.match(markup, /Architect Investigation/);
  assert.match(markup, /Issue Record/);
  assert.match(markup, /Existing final/);
  assert.match(markup, /figma-disposition-panel issue-architect-disposition-panel/);
  assert.match(markup, /Document Disposition/);
  assert.match(markup, /Apply Review/);
  assert.match(markup, /Proceed in Issue Resolution/);
  assert.match(markup, /Workflow Step/);
  assert.match(markup, /Effective Disposition/);
  assert.match(markup, /issues\/ISSUE_001\/ARCHITECT_REVIEW\.md/);
  assert.match(markup, /figma-browser-actions-panel issue-architect-browser-actions-panel/);
  assert.match(markup, /Reload ChatGPT/);
  assert.match(markup, /Refresh/);
  assert.doesNotMatch(markup, /Prepare Handoff|Copy Handoff|Promote Draft/);
});
