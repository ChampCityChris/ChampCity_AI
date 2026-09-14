const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const test = require("node:test");

const loader = require("./renderer-source-loader.cjs");
const { IssuePlanningWorkspace } = loader.loadRendererSourceModule("src/renderer/app/IssuePlanningWorkspace.tsx");
const { IssueFixCardMapWorkspace } = loader.loadRendererSourceModule("src/renderer/app/IssueFixCardMapWorkspace.tsx");
const { IssueResolutionRail } = loader.loadRendererSourceModule("src/renderer/app/IssueResolutionRail.tsx");
const { FigmaSidebar } = loader.loadRendererSourceModule("src/renderer/app/figma/FigmaSidebar.tsx");
const { FigmaBrowserPanel } = loader.loadRendererSourceModule("src/renderer/app/figma/FigmaBrowserPanel.tsx");

const repoRoot = path.join(__dirname, "..", "..");

test("Issue Planning workspace presents planning documents, Fix Card Map, disposition, and browser actions", () => {
  const projection = planningProjection({
    status: "awaiting-operator-review",
    stateLabel: "Awaiting Operator Review",
    fixCardsEligible: false,
  });
  const markup = renderToStaticMarkup(React.createElement(IssuePlanningWorkspace, {
    actionError: "",
    actionFeedback: "",
    browserPanel: React.createElement(FigmaBrowserPanel, {
      hostRef: { current: null },
      onReload: () => undefined,
      onRetry: () => undefined,
      retryVisible: false,
      statusLabel: "ChatGPT ready",
    }),
    currentIssue: currentIssue(),
    isActionPending: false,
    onApplyReview: async () => undefined,
    onCopyHandoff: () => undefined,
    onPrepareHandoff: () => undefined,
    onRefresh: () => undefined,
    onReloadBrowser: () => undefined,
    projection,
    projectName: "ChampCity_AI",
  }));

  assert.match(markup, /Issue Planning/);
  assert.match(markup, /issue-document-chat-workspace-shell issue-planning-workspace/);
  assert.match(markup, /figma-doc-chat-workspace issue-planning-doc-chat-workspace/);
  assert.match(markup, /ISSUE_RESOLUTION_PLAN\.md/);
  assert.match(markup, /FIX_CARD_PLAN\.md/);
  assert.match(markup, /Issue Resolution Plan/);
  assert.match(markup, /Fix Card Plan/);
  assert.match(markup, /Fix Card Map/);
  assert.match(markup, /ISSUE_001-FC01/);
  assert.match(markup, /Planning bundle service/);
  assert.match(markup, /No dependencies/);
  assert.match(markup, /Bundle Disposition/);
  assert.match(markup, /Apply Review/);
  assert.match(markup, /issues\/ISSUE_001\/ISSUE_PLANNING_REVIEW\.md/);
  assert.match(markup, /figma-browser-actions-panel issue-planning-browser-actions-panel/);
  assert.match(markup, /Reload ChatGPT/);
  assert.match(markup, /Refresh/);
  assert.doesNotMatch(markup, /Promote Draft|Current Phase|Current Work Card|Development Phase/);
  assert.match(markup, /aria-label="Embedded ChatGPT browser"/);
});

test("Issue Planning pre-promotion surface keeps handoff actions and no disposition panel", () => {
  const projection = planningProjection({
    status: "handoff-prepared",
    stateLabel: "Handoff Prepared",
    hasBundle: false,
    activeSubmission: {
      submissionId: "submission-1",
      issueResolutionPlanDraftPath: "issues/Architect_Drafts/submission-1/issue-resolution-plan.md",
      fixCardPlanDraftPath: "issues/Architect_Drafts/submission-1/fix-card-plan.md",
      preparedInstruction: "prepared",
    },
    canPrepareHandoff: true,
    canCopyHandoff: true,
  });
  const markup = renderToStaticMarkup(React.createElement(IssuePlanningWorkspace, {
    actionError: "",
    actionFeedback: "",
    browserPanel: React.createElement("div", null, "Browser"),
    currentIssue: currentIssue(),
    isActionPending: false,
    onApplyReview: async () => undefined,
    onCopyHandoff: () => undefined,
    onPrepareHandoff: () => undefined,
    onRefresh: () => undefined,
    onReloadBrowser: () => undefined,
    projection,
    projectName: "ChampCity_AI",
  }));

  assert.match(markup, /No planning bundle yet/);
  assert.match(markup, /Handoff Prepared/);
  assert.match(markup, /Prepare Handoff/);
  assert.match(markup, /Copy Handoff/);
  assert.doesNotMatch(markup, /Corrective Issue Planning Required|Corrective Planning Handoff/);
  assert.doesNotMatch(markup, /Bundle Disposition|Promote Draft/);
  assert.doesNotMatch(markup, /issues\/Architect_Drafts\/submission-1/);
});

test("aggregate Issue Validation revision renders explicit corrective planning basis and actions", () => {
  const boundedCorrectiveWork = "Append one bounded candidate that restores repository-derived Issue Planning re-entry.";
  const recordPath = "issues/ISSUE_007/Validation_Records/ISSUE_VALIDATION_RECORD_ISSUE_007_ATTEMPT01.md";
  const projection = planningProjection({
    status: "revision-requested",
    stateLabel: "Revision Requested",
    fixCardsEligible: false,
    canPrepareHandoff: true,
    canCopyHandoff: true,
    revisionSource: "issue-validation",
    issueValidationRevisionRecordPath: recordPath,
    issueValidationBoundedCorrectiveWork: boundedCorrectiveWork,
  });
  const markup = renderToStaticMarkup(React.createElement(IssuePlanningWorkspace, {
    actionError: "",
    actionFeedback: "",
    browserPanel: React.createElement("div", null, "Browser"),
    currentIssue: currentIssue(),
    isActionPending: false,
    onApplyReview: async () => undefined,
    onCopyHandoff: () => undefined,
    onPrepareHandoff: () => undefined,
    onRefresh: () => undefined,
    onReloadBrowser: () => undefined,
    projection,
    projectName: "ChampCity_AI",
  }));

  assert.match(markup, /Corrective Issue Planning Required/);
  assert.match(markup, new RegExp(recordPath.replaceAll("/", "\\/")));
  assert.match(markup, new RegExp(boundedCorrectiveWork.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(markup, /Existing closed Fix Cards remain completed and cannot be repurposed/);
  assert.match(markup, /must append one or more new bounded Fix Card candidates/);
  assert.match(markup, /This is not Fix Card Repair genealogy/);
  const buttons = markup.match(/<button[^>]*>[\s\S]*?<\/button>/g) ?? [];
  const prepareButton = buttons.find((button) => button.includes("Prepare Corrective Planning Handoff"));
  const copyButton = buttons.find((button) => button.includes("Copy Corrective Planning Handoff"));
  assert.ok(prepareButton, "corrective planning prepare action is rendered");
  assert.ok(copyButton, "corrective planning copy action is rendered");
  assert.doesNotMatch(prepareButton, /disabled/);
  assert.doesNotMatch(copyButton, /disabled/);
  assert.doesNotMatch(markup, />\s*Prepare Handoff\s*</);
  assert.doesNotMatch(markup, />\s*Copy Handoff\s*</);
});

test("ordinary planning-review revision is not presented as aggregate corrective planning", () => {
  const projection = planningProjection({
    status: "revision-requested",
    stateLabel: "Revision Requested",
    fixCardsEligible: false,
    canPrepareHandoff: true,
    canCopyHandoff: true,
    revisionSource: "issue-planning-review",
  });
  const markup = renderToStaticMarkup(React.createElement(IssuePlanningWorkspace, {
    actionError: "",
    actionFeedback: "",
    browserPanel: React.createElement("div", null, "Browser"),
    currentIssue: currentIssue(),
    isActionPending: false,
    onApplyReview: async () => undefined,
    onCopyHandoff: () => undefined,
    onPrepareHandoff: () => undefined,
    onRefresh: () => undefined,
    onReloadBrowser: () => undefined,
    projection,
    projectName: "ChampCity_AI",
  }));

  assert.match(markup, />\s*Prepare Handoff\s*</);
  assert.match(markup, />\s*Copy Handoff\s*</);
  assert.doesNotMatch(markup, /Corrective Issue Planning Required|Corrective Planning Handoff|Fix Card Repair genealogy/);
});

test("Issue rail unlocks Issue Planning from eligibility and Fix Cards only from approved planning", () => {
  const planningOnly = renderToStaticMarkup(React.createElement(IssueResolutionRail, {
    activeStageId: "issue-planning",
    currentIssue: currentIssue(),
    issuePlanningAvailable: true,
    fixCardsAvailable: false,
    onStageChange: () => undefined,
  }));

  assert.match(planningOnly, /03 Issue Planning[\s\S]*?Current/);
  assert.match(planningOnly, /04 Fix Cards[\s\S]*?Unavailable/);

  const fixCards = renderToStaticMarkup(React.createElement(IssueResolutionRail, {
    activeStageId: "fix-cards",
    currentIssue: currentIssue(),
    issuePlanningAvailable: true,
    fixCardsAvailable: true,
    onStageChange: () => undefined,
  }));

  assert.match(fixCards, /03 Issue Planning[\s\S]*?Available/);
  assert.match(fixCards, /04 Fix Cards[\s\S]*?Current/);
});

test("Issue rail uses repository-derived navigation projection for direct later-stage entry", () => {
  const markup = renderToStaticMarkup(React.createElement(IssueResolutionRail, {
    activeStageId: "intake",
    currentIssue: currentIssue(),
    navigationProjection: {
      issueId: "ISSUE_001",
      title: "No Independent Issue Resolution Workflow",
      issuePlanningAvailable: true,
      fixCardsAvailable: true,
      workflowStatus: planningProjection({
        status: "approved-ready-for-fix-cards",
        stateLabel: "Approved - Ready for Fix Cards",
        fixCardsEligible: true,
      }).workflowStatus,
      fixCardsWorkflowStatus: fixCardsWorkflowStatus(),
      stages: [
        { stageId: "intake", available: true, stateLabel: "Available", reason: "Available." },
        { stageId: "architect-planning", available: true, stateLabel: "Available", reason: "Readable." },
        { stageId: "issue-planning", available: true, stateLabel: "Available", reason: "Approved Architect evidence." },
        { stageId: "fix-cards", available: true, stateLabel: "Fix Card Map Ready", reason: "Approved Issue Planning." },
        { stageId: "issue-validation", available: false, stateLabel: "Unavailable", reason: "Later." },
        { stageId: "issue-close", available: false, stateLabel: "Unavailable", reason: "Later." },
      ],
    },
    onStageChange: () => undefined,
  }));

  assert.match(markup, /01 Intake[\s\S]*?Current/);
  assert.match(markup, /03 Issue Planning[\s\S]*?Available/);
  assert.match(markup, /04 Fix Cards[\s\S]*?Available/);
});

test("Fix Cards Map workspace renders approved map state without owning nested step routing", () => {
  const projection = planningProjection({
    status: "approved-ready-for-fix-cards",
    stateLabel: "Approved - Ready for Fix Cards",
    fixCardsEligible: true,
    reviewState: "readable",
    operatorDisposition: "Approved",
  });
  const markup = renderToStaticMarkup(React.createElement(IssueFixCardMapWorkspace, {
    actionError: "",
    actionFeedback: "",
    actionPending: false,
    currentIssue: currentIssue(),
    fixCardProjection: {
      selectedCandidate: {
        fixCardId: "ISSUE_001-FC01",
        order: 1,
        title: "Planning bundle service",
        purpose: "Implement Issue-owned two-draft planning bundle promotion and review behavior.",
        dependsOn: [],
        evidencePaths: ["issues/ISSUE_001/ARCHITECT_INVESTIGATION.md"],
      },
    },
    isLoading: false,
    onRefresh: () => undefined,
    onSelectCandidate: () => undefined,
    projection,
    projectName: "ChampCity_AI",
  }));

  assert.match(markup, /Fix Card Map/);
  assert.match(markup, /Fix Card Map Ready/);
  assert.match(markup, /issues\/ISSUE_001\/FIX_CARD_PLAN\.md/);
  assert.match(markup, /issues\/ISSUE_001\/ISSUE_PLANNING_REVIEW\.md/);
  assert.match(markup, /Approved/);
  assert.match(markup, /champcity-fix-card-plan/);
  assert.match(markup, /ISSUE_001-FC01/);
  assert.match(markup, /Planning bundle service/);
  assert.match(markup, /Implement Issue-owned two-draft planning bundle promotion/);
  assert.match(markup, /Select Fix Card|Selected/);
  assert.match(markup, /aria-label="Fix Card Map candidate selection"/);
  assert.doesNotMatch(markup, /issue-fix-card-selection-list|Select Candidate/);
  assert.doesNotMatch(markup, /Issue Fix Card loop|figma-context-loop-bar|Prepare Handoff|Copy Handoff|Apply Review|Begin Planning|Run Implementer|Request Repair|Close Fix Card|Current Phase|Current Work Card/);
});

test("Fix Cards Map workspace renders Issue-owned unavailable state instead of Development body", () => {
  const projection = planningProjection({
    status: "revision-requested",
    stateLabel: "Revision Requested",
    fixCardsEligible: false,
  });
  const markup = renderToStaticMarkup(React.createElement(IssueFixCardMapWorkspace, {
    actionError: "",
    actionFeedback: "",
    actionPending: false,
    currentIssue: currentIssue(),
    isLoading: false,
    onRefresh: () => undefined,
    projection,
    projectName: "ChampCity_AI",
  }));

  assert.match(markup, /Fix Card Map Unavailable/);
  assert.match(markup, /Issue-Owned Attention State/);
  assert.match(markup, /No approved Fix Card Map/);
  assert.doesNotMatch(markup, /Current Phase|Current Work Card|Development Phase|Work Card Planning|Run Implementer/);
});

test("Issue sidebar reports Stage: Issue Planning and Fix Cards eligibility state", () => {
  const markup = renderToStaticMarkup(React.createElement(FigmaSidebar, {
    activeWorkspaceId: "project-intake-capture",
    currentIssue: currentIssue(),
    issueWorkflowStatus: planningProjection({
      status: "approved-ready-for-fix-cards",
      stateLabel: "Approved - Ready for Fix Cards",
      fixCardsEligible: true,
    }).workflowStatus,
    currentModel: sampleCurrentModel(),
    isChoosing: false,
    mode: "issue-resolution",
    onChooseProject: () => undefined,
    onClearProject: () => undefined,
    onOpenSettings: () => undefined,
    onReturnToWorkflowHub: () => undefined,
    onThemeChange: () => undefined,
    projectName: "ChampCity_AI",
    themeMode: "dark",
    workspace: { ok: true, workspaceRoot: "<PROJECT_REPO>" },
  }));

  assert.match(markup, /Current Issue/);
  assert.match(markup, /Stage/);
  assert.match(markup, /Issue Planning/);
  assert.match(markup, /Approved - Ready for Fix Cards/);
  assert.doesNotMatch(markup, /Current Phase|Current Work Card|phase-00|WC01|Loop Step/);
});

test("Issue sidebar reports Stage: Fix Cards and Fix Card Map Ready while map is foregrounded", () => {
  const markup = renderToStaticMarkup(React.createElement(FigmaSidebar, {
    activeWorkspaceId: "project-intake-capture",
    currentIssue: currentIssue(),
    issueWorkflowStatus: fixCardsWorkflowStatus(),
    currentModel: sampleCurrentModel(),
    isChoosing: false,
    mode: "issue-resolution",
    onChooseProject: () => undefined,
    onClearProject: () => undefined,
    onOpenSettings: () => undefined,
    onReturnToWorkflowHub: () => undefined,
    onThemeChange: () => undefined,
    projectName: "ChampCity_AI",
    themeMode: "dark",
    workspace: { ok: true, workspaceRoot: "<PROJECT_REPO>" },
  }));

  assert.match(markup, /Stage/);
  assert.match(markup, /Fix Cards/);
  assert.match(markup, /Fix Card Map Ready/);
  assert.doesNotMatch(markup, /Current Phase|Current Work Card|phase-00|WC01|Loop Step/);
});

test("App contains an Issue-owned Fix Cards branch and repository-derived navigation refresh", () => {
  const appSource = fs.readFileSync(path.join(repoRoot, "src", "renderer", "app", "App.tsx"), "utf8");
  assert.match(appSource, /getIssueResolutionNavigationProjection/);
  assert.match(appSource, /activeIssueStageId === "fix-cards"[\s\S]*?<IssueFixCardMapWorkspace/);
  assert.match(appSource, /activeIssueFixCardStepId === "planning"[\s\S]*?<IssueFixCardPlanningWorkspace/);
  assert.match(appSource, /navigationProjection=\{issueNavigationProjection\}/);
  assert.match(appSource, /issueNavigationProjection\?\.issuePlanningAvailable/);
  assert.match(appSource, /issueNavigationProjection\?\.fixCardsAvailable/);
  assert.match(appSource, /activeIssueStageId !== "issue-planning" && activeIssueStageId !== "fix-cards"/);
  assert.doesNotMatch(appSource, /activeIssueStageId === "fix-cards"[\s\S]{0,400}<CurrentWorkspaceBanner/);
});

test("Issue Planning foreground reuses embedded Architect browser and scoped evidence refresh", () => {
  const appSource = fs.readFileSync(path.join(repoRoot, "src", "renderer", "app", "App.tsx"), "utf8");
  assert.match(appSource, /activeIssueStageId === "issue-planning"/);
  assert.match(appSource, /window\.champcity\.showArchitectBrowser/);
  assert.match(appSource, /window\.champcity\.getIssuePlanningProjection/);
  assert.match(appSource, /window\.champcity\.prepareIssuePlanningHandoff/);
  assert.match(appSource, /window\.champcity\.copyIssuePlanningHandoff/);
  assert.match(appSource, /window\.champcity\.applyIssuePlanningReview/);
  const refreshTarget = extractEvidenceRefreshTarget(appSource);
  assert.match(refreshTarget, /activeIssueStageId === "issue-planning"/);
  assert.match(refreshTarget, /currentIssue\?\.recordState !== "readable"/);
  assert.match(refreshTarget, /refreshIssuePlanningProjection\(issueId, \{ quiet: true \}\)/);
  assert.doesNotMatch(refreshTarget, /window\.setInterval/);
});

test("Issue Planning browser sizing override preserves the FC03 browser repair behavior", () => {
  const cssSource = fs.readFileSync(path.join(repoRoot, "src", "renderer", "styles.css"), "utf8");
  const genericPanelRule = findCssRule(cssSource, ".figma-browser-column .figma-browser-panel");
  const issuePlanningColumnRule = findCssRule(cssSource, ".issue-planning-browser-column.figma-browser-column");
  const issuePlanningPanelRule = findCssRule(
    cssSource,
    ".issue-planning-browser-column.figma-browser-column .figma-browser-panel",
  );
  const issuePlanningHostRule = findCssRule(
    cssSource,
    ".issue-planning-browser-column.figma-browser-column .architect-browser-host",
  );

  assert.ok(issuePlanningColumnRule.index > genericPanelRule.index);
  assert.ok(issuePlanningPanelRule.index > genericPanelRule.index);
  assert.ok(issuePlanningHostRule.index > genericPanelRule.index);
  assert.match(issuePlanningColumnRule.body, /min-height:\s*640px;/);
  assert.match(issuePlanningPanelRule.body, /min-height:\s*640px;/);
  assert.match(issuePlanningHostRule.body, /min-height:\s*540px;/);
});

function currentIssue() {
  return {
    issueId: "ISSUE_001",
    numericId: 1,
    title: "No Independent Issue Resolution Workflow",
    recordPath: "issues/ISSUE_001/ISSUE_RECORD.md",
    recordState: "readable",
    bodyMarkdown: "# ISSUE_001",
  };
}

function planningProjection({
  activeSubmission,
  canCopyHandoff = false,
  canPrepareHandoff = false,
  fixCardsEligible,
  hasBundle = true,
  issueValidationBoundedCorrectiveWork,
  issueValidationRevisionRecordPath,
  operatorDisposition,
  revisionSource,
  reviewState = "missing",
  stateLabel,
  status,
}) {
  return {
    issueId: "ISSUE_001",
    title: "No Independent Issue Resolution Workflow",
    issueRecordPath: "issues/ISSUE_001/ISSUE_RECORD.md",
    issueRecordMarkdown: "# ISSUE_001\n\n## Issue\nExisting.",
    issueRecordState: "readable",
    architectInvestigationPath: "issues/ISSUE_001/ARCHITECT_INVESTIGATION.md",
    architectInvestigationState: "readable",
    architectReviewPath: "issues/ISSUE_001/ARCHITECT_REVIEW.md",
    architectReviewState: "readable",
    architectReviewDisposition: "Approved",
    architectRecommendation: "Proceed in Issue Resolution",
    architectPlanningEligible: true,
    issueResolutionPlanPath: "issues/ISSUE_001/ISSUE_RESOLUTION_PLAN.md",
    issueResolutionPlanState: hasBundle ? "readable" : "missing",
    issueResolutionPlanMarkdown: hasBundle ? "# ISSUE_001 \u2014 Issue Resolution Plan\n\n## Accepted Correction Objective\nExisting plan." : undefined,
    fixCardPlanPath: "issues/ISSUE_001/FIX_CARD_PLAN.md",
    fixCardPlanState: hasBundle ? "readable" : "missing",
    fixCardPlanMarkdown: hasBundle ? "# ISSUE_001 \u2014 Fix Card Plan\n\n## Fix Card Map\nExisting map." : undefined,
    fixCardCandidates: hasBundle ? [{
      fixCardId: "ISSUE_001-FC01",
      order: 1,
      title: "Planning bundle service",
      purpose: "Implement Issue-owned two-draft planning bundle promotion and review behavior.",
      dependsOn: [],
      evidencePaths: ["issues/ISSUE_001/ARCHITECT_INVESTIGATION.md"],
    }] : [],
    fixCardPlanValidationFindings: [],
    reviewPath: "issues/ISSUE_001/ISSUE_PLANNING_REVIEW.md",
    reviewState,
    operatorDisposition,
    status,
    statusMessage: stateLabel,
    workflowStatus: {
      issueId: "ISSUE_001",
      stageId: "issue-planning",
      stageLabel: "Issue Planning",
      state: status,
      stateLabel,
      issuePlanningEligible: true,
      fixCardsEligible,
      reason: stateLabel,
    },
    fixCardsEligible,
    activeSubmission,
    canPrepareHandoff,
    canCopyHandoff,
    canApplyReview: status === "awaiting-operator-review",
    revisionSource,
    issueValidationRevisionRecordPath,
    issueValidationBoundedCorrectiveWork,
  };
}

function fixCardsWorkflowStatus() {
  return {
    issueId: "ISSUE_001",
    stageId: "fix-cards",
    stageLabel: "Fix Cards",
    state: "fix-card-map-ready",
    stateLabel: "Fix Card Map Ready",
    issuePlanningEligible: true,
    fixCardsEligible: true,
    reason: "Current approved Issue Planning evidence exposes the Fix Card Map.",
  };
}

function sampleCurrentModel() {
  return {
    executionContext: {
      phase: {
        state: "active",
        phaseId: "phase-00",
        title: "Foundation",
        order: 1,
        totalPhaseCount: 1,
        dependsOn: [],
        loopStep: "Work Cards",
        reason: "Current phase resolved.",
      },
      workCard: {
        state: "active",
        workCardId: "WC01",
        title: "Workflow Hub Shell",
        loopStep: "Review & Validation",
        dispositionOrState: "In Progress",
        reason: "Current Work Card resolved.",
      },
    },
  };
}

function extractEvidenceRefreshTarget(source) {
  const start = source.indexOf("function currentEvidenceRefreshTarget");
  assert.notEqual(start, -1, "evidence refresh target not found");
  const end = source.indexOf("async function refreshArchitectStatus", start);
  assert.notEqual(end, -1, "evidence refresh target end not found");
  return source.slice(start, end);
}

function findCssRule(source, selector) {
  const index = source.indexOf(`${selector} {`);
  assert.notEqual(index, -1, `${selector} not found`);
  const bodyStart = source.indexOf("{", index) + 1;
  const bodyEnd = source.indexOf("}", bodyStart);
  assert.notEqual(bodyEnd, -1, `${selector} rule end not found`);
  return {
    index,
    body: source.slice(bodyStart, bodyEnd),
  };
}
