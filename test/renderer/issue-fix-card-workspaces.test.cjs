const assert = require("node:assert/strict");
const path = require("node:path");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const test = require("node:test");

const loader = require("./renderer-source-loader.cjs");
const {
  IssueFixCardCloseWorkspace,
  IssueFixCardContextStrip,
  IssueFixCardImplementWorkspace,
  IssueFixCardMapWorkspace,
  IssueFixCardPlanningWorkspace,
  IssueFixCardRepairWorkspace,
  IssueFixCardReviewValidationWorkspace,
  fixCardPlanningMcpContractAttention,
} = loader.loadRendererSourceModule("src/renderer/app/IssueFixCardMapWorkspace.tsx");
const { IssueResolutionRail } = loader.loadRendererSourceModule("src/renderer/app/IssueResolutionRail.tsx");
const { FigmaBrowserPanel } = loader.loadRendererSourceModule("src/renderer/app/figma/FigmaBrowserPanel.tsx");

test("Issue shell renders the styled second-row Fix Card loop rail from projection availability", () => {
  const markup = renderToStaticMarkup(React.createElement(IssueResolutionRail, {
    activeFixCardStepId: "fix-card-map",
    activeStageId: "fix-cards",
    currentIssue: currentIssue(),
    fixCardProjection: fixCardProjection({ currentStep: "fix-card-map" }),
    fixCardsAvailable: true,
    issuePlanningAvailable: true,
    onFixCardStepChange: () => undefined,
    onStageChange: () => undefined,
  }));

  assert.match(markup, /aria-label="Issue Fix Card loop"/);
  assert.match(markup, /figma-context-loop-bar figma-work-card-loop-bar/);
  assert.match(markup, /Fix Card Loop/);
  assert.match(markup, /ISSUE_001-FC01/);
  assert.match(markup, /Fix Card Map[\s\S]*?Current/);
  assert.match(markup, /Planning[\s\S]*?Available/);
  assert.match(markup, /Implement[\s\S]*?Unavailable/);
  assert.match(markup, /Review &amp; Validation[\s\S]*?Unavailable/);
  assert.match(markup, /Repair[\s\S]*?Unavailable/);
  assert.match(markup, /Close \/ Next[\s\S]*?Unavailable/);
  assert.match(markup, /class="[^"]*figma-sub-pill[^"]*unavailable[^"]*not-ready/);
});

test("Issue Fix Card Map is a map-only workspace with explicit candidate selection", () => {
  const projection = planningProjection({ candidateCount: 9 });
  const candidates = candidateList(9).map((entry, index) => ({
    ...entry,
    lifecycle: index < 5
      ? {
          state: "needs-attention",
          label: "Rejected / Needs Attention",
          reason: "Canonical CHAMPCITY metadata is required for lifecycle participation.",
          selectable: false,
        }
      : {
          state: "not-started",
          label: "Not Started",
          reason: "No current canonical Fix Card contract exists.",
          selectable: true,
        },
  }));
  const markup = renderToStaticMarkup(React.createElement(IssueFixCardMapWorkspace, {
    actionError: "",
    actionFeedback: "Selected ISSUE_001-FC01.",
    actionPending: false,
    currentIssue: currentIssue(),
    fixCardProjection: fixCardProjection({
      currentStep: "fix-card-map",
      candidates,
      selectedCandidate: candidates[5],
    }),
    isLoading: false,
    onRefresh: () => undefined,
    onSelectCandidate: () => undefined,
    projection,
    projectName: "ChampCity_AI",
  }));

  assert.match(markup, /Fix Card Map/);
  assert.match(markup, /Fix Card Map Ready/);
  assert.match(markup, /ISSUE_001-FC01/);
  assert.match(markup, /ISSUE_001-FC09/);
  assert.ok(markup.indexOf("ISSUE_001-FC01") < markup.indexOf("ISSUE_001-FC09"));
  assert.match(markup, /aria-label="Fix Card Map candidate selection"/);
  assert.match(markup, /class="issue-fix-card-candidate-scroll-region"/);
  assert.match(markup, /<button aria-pressed="true" class="issue-fix-card-candidate-card"/);
  assert.match(markup, /Selected/);
  assert.match(markup, /Select Fix Card/);
  assert.match(markup, /Selected ISSUE_001-FC01\./);
  assert.match(markup, /Rejected \/ Needs Attention/);
  assert.match(markup, /Not Started/);
  assert.match(markup, /CHAMPCITY metadata/);
  assert.doesNotMatch(markup, /issue-fix-card-selection-list|Select Candidate/);
  assert.doesNotMatch(markup, /Issue Fix Card loop|figma-context-loop-bar|Embedded ChatGPT browser|Codex execution console/);
  assert.doesNotMatch(markup, /Fix Card Planning|Fix Card Implement|Fix Card Architect Review/);
});

test("Issue Fix Card Map renders candidate selection errors in the map workspace", () => {
  const markup = renderToStaticMarkup(React.createElement(IssueFixCardMapWorkspace, {
    actionError: "Fix Card candidate selection failed.",
    actionFeedback: "",
    actionPending: false,
    currentIssue: currentIssue(),
    fixCardProjection: fixCardProjection({ currentStep: "fix-card-map", selectedCandidate: undefined }),
    isLoading: false,
    onRefresh: () => undefined,
    onSelectCandidate: () => undefined,
    projection: planningProjection({ candidateCount: 2 }),
    projectName: "ChampCity_AI",
  }));

  assert.match(markup, /Fix Card candidate selection failed\./);
  assert.match(markup, /role="status"/);
  assert.match(markup, /aria-pressed="false"/);
  assert.doesNotMatch(markup, /issue-fix-card-selection-list/);
});

test("Issue Close adapter reuses the Work Card Close presentation with exact Issue evidence and explicit return action", () => {
  const markup = renderToStaticMarkup(React.createElement(IssueFixCardCloseWorkspace, {
    actionError: "",
    actionFeedback: "",
    actionPending: false,
    currentIssue: currentIssue(),
    fixCardProjection: fixCardProjection({
      currentStep: "close-next",
      canCloseFixCard: true,
      validationRecordPath: "issues/ISSUE_001/Validation_Records/VALIDATION_RECORD_ISSUE_001-FC01_ATTEMPT01.md",
      validationRecordState: "readable",
      validationRecordDisposition: "Approved",
      currentImplementationId: "ISSUE_001-FC01-REPAIR02",
      currentRepairId: "ISSUE_001-FC01-REPAIR02",
      nextEligibleCandidate: candidateList(2)[1],
      closeRecord: {
        path: "issues/ISSUE_001/Close_Records/FIX_CARD_CLOSE_RECORD_ISSUE_001-FC01.md",
        state: "missing",
        reason: "Exact current Approved validation is ready for explicit close.",
      },
    }),
    onClose: () => undefined,
  }));
  assert.match(markup, /Issue Fix Card Close workspace/);
  assert.match(markup, /Close Evidence/);
  assert.match(markup, /ISSUE_001-FC01-REPAIR02/);
  assert.match(markup, /VALIDATION_RECORD_ISSUE_001-FC01_ATTEMPT01\.md/);
  assert.match(markup, /Approved \/ readable/);
  assert.match(markup, /fix-card-map/);
  assert.match(markup, /ISSUE_001-FC02: Fix Card candidate 02/);
  assert.match(markup, /Close Fix Card \/ Return to Map/);
  assert.doesNotMatch(markup, /Phase ID|phase unresolved|Development/);
});

test("Issue Fix Card Planning reuses shared document review presentation with controlled draft browser actions", () => {
  const controlledDraftPath = "issues/Architect_Drafts/submission-001/fix-card-contract.md";
  const markup = renderStepWorkspace("Planning", React.createElement(IssueFixCardPlanningWorkspace, {
    activeStepLabel: "Planning",
    actionError: "",
    actionFeedback: "",
    actionPending: false,
    browserPanel: React.createElement(FigmaBrowserPanel, {
      hostRef: { current: null },
      onReload: () => undefined,
      onRetry: () => undefined,
      retryVisible: false,
      statusLabel: "ChatGPT ready",
    }),
    fixCardProjection: fixCardProjection({
      currentStep: "planning",
      contractMarkdown: validFixCardContract(),
      contractDisposition: "Pending",
      contractPath: controlledDraftPath,
      controlledDraftPath,
      controlledDraftRevision: 1,
      controlledDraftBodySha256: "a".repeat(64),
      canApplyContractReview: true,
    }),
    currentIssue: currentIssue(),
    onApplyContractReview: async () => undefined,
    onCopyPlanningHandoff: () => undefined,
    onPreparePlanningHandoff: () => undefined,
    onRefresh: () => undefined,
    onReloadBrowser: () => undefined,
    projectName: "ChampCity_AI",
  }));

  assert.match(markup, /issue-document-chat-workspace-shell issue-fix-card-document-chat-workspace/);
  assert.match(markup, /Fix Card Planning/);
  assert.match(markup, /Issue: ISSUE_001: No Independent Issue Resolution Workflow/);
  assert.match(markup, /Step: Planning/);
  assert.match(markup, /figma-doc-chat-workspace issue-fix-card-planning-workspace/);
  assert.match(markup, /aria-label="Embedded ChatGPT browser"/);
  assert.match(markup, /Prepare Handoff/);
  assert.match(markup, /Copy Handoff/);
  assert.match(markup, /aria-label="Current document"/);
  assert.match(markup, /Document Disposition/);
  assert.match(markup, /issues\/Architect_Drafts\/submission-001\/fix-card-contract\.md/);
  assert.match(markup, /Apply Review/);
  assert.doesNotMatch(markup, /Promote Draft|validates and promotes|Fix Card Map Ready|champcity-fix-card-plan|Codex execution console/);
});

test("Fix Card Planning reports published MCP readiness without inventing remote client uptake", () => {
  const emptyDraft = fixCardProjection({
    currentStep: "planning",
    controlledDraftPath: "issues/Architect_Drafts/submission-001/fix-card-contract.md",
    activePlanningSubmission: {
      submissionId: "submission-001",
      temporaryDraftPath: "issues/Architect_Drafts/submission-001/fix-card-contract.md",
      preparedInstruction: "Use replace_markdown_body.",
    },
    canApplyContractReview: false,
  });
  const noPublishedSession = agentHarnessContractStatus("none", []);
  assert.match(
    fixCardPlanningMcpContractAttention(noPublishedSession, emptyDraft),
    /no active MCP session has published the required body-write contract/,
  );
  const staleSession = agentHarnessContractStatus("stale", [{ current: false }]);
  staleSession.toolContractDiagnostics.published.staleSessionCount = 1;
  assert.match(fixCardPlanningMcpContractAttention(staleSession, emptyDraft), /1 published MCP session contract/);
  const currentSession = agentHarnessContractStatus("all-current", [{ current: true }]);
  assert.equal(fixCardPlanningMcpContractAttention(currentSession, emptyDraft), null);
  assert.equal(
    fixCardPlanningMcpContractAttention(noPublishedSession, { ...emptyDraft, canApplyContractReview: true }),
    null,
  );
});

test("Issue Fix Card Implement is a sibling workspace that owns the shared Codex console", () => {
  const markup = renderStepWorkspace("Implement", React.createElement(IssueFixCardImplementWorkspace, {
    actionError: "",
    actionFeedback: "",
    codexExecution: codexExecution(),
    fixCardProjection: fixCardProjection({
      currentStep: "implement",
      contractDisposition: "Approved",
      implementerReportReadiness: "reserved-skeleton",
      canRunImplementer: true,
    }),
    isActionPending: false,
    onCancelCodex: () => undefined,
    onRecoverImplementSetup: () => undefined,
    onRunCodex: () => undefined,
  }));

  assert.match(markup, /Fix Card Implement/);
  assert.match(markup, /work-card-building-workspace issue-fix-card-implement-workspace/);
  assert.match(markup, /Codex execution console/);
  assert.match(markup, /Approved Fix Card Contract/);
  assert.match(markup, /IMPLEMENTER_REPORT_ISSUE_001-FC01_fix_card_contract_service\.md/);
  assert.match(markup, /Codex Availability[\s\S]*?Ready/);
  assert.match(markup, /<button class="apply-button codex-command" disabled="" type="button">[\s\S]*?Run Codex Implementer/);
  assert.match(markup, /Run Codex Implementer/);
  assert.doesNotMatch(markup, /Embedded ChatGPT browser|Fix Card Map Ready|champcity-fix-card-plan/);
});

test("Issue Fix Card Implement exposes Issue-scoped environment resolution", () => {
  const markup = renderStepWorkspace("Implement", React.createElement(IssueFixCardImplementWorkspace, {
    actionError: "",
    actionFeedback: "",
    codexExecution: {
      ...codexExecution(),
      state: "unavailable",
      canRunAgain: false,
      canResolveEnvironment: true,
      failureReason: "Development environment resolution is required before Work Card implementation can start.",
      developmentEnvironmentPreflight: {
        state: "resolution-required",
        summary: "Development environment resolution is required before Work Card implementation can start.",
        retryAllowed: true,
        requirements: [],
      },
    },
    fixCardProjection: fixCardProjection({
      currentStep: "implement",
      contractDisposition: "Approved",
      implementerReportReadiness: "reserved-skeleton",
      canRunImplementer: true,
    }),
    isActionPending: false,
    onCancelCodex: () => undefined,
    onRecoverImplementSetup: () => undefined,
    onResolveEnvironment: () => undefined,
    onRunCodex: () => undefined,
  }));

  assert.match(markup, /Resolve Environment/);
  assert.match(markup, /Development environment resolution is required/);
});

test("Issue Fix Card Implement presents recovery action and visible action and Codex failures", () => {
  const markup = renderStepWorkspace("Implement", React.createElement(IssueFixCardImplementWorkspace, {
    actionError: "Report setup failed: simulated write failure.",
    actionFeedback: "",
    codexExecution: {
      ...codexExecution(),
      state: "failed",
      failureReason: "Codex start failed before execution.",
      retryBlocker: "Environment blocker remains unresolved.",
      eventTail: ["status resolution failed"],
      canRunAgain: false,
      lastRunState: "failed",
      developmentEnvironmentPreflight: {
        state: "blocked",
        summary: "Development environment preflight is blocked.",
        requirements: [],
      },
    },
    fixCardProjection: fixCardProjection({
      currentStep: "implement",
      contractDisposition: "Approved",
      implementerReportReadiness: "missing",
      implementerReportState: "missing",
      implementerReportMarkdown: undefined,
      canReserveImplementerReport: true,
      canRunImplementer: false,
    }),
    isActionPending: false,
    onCancelCodex: () => undefined,
    onRecoverImplementSetup: () => undefined,
    onRunCodex: () => undefined,
  }));

  assert.match(markup, /Retry Implement Setup/);
  assert.match(markup, /Report setup failed: simulated write failure\./);
  assert.match(markup, /Codex start failed before execution\./);
  assert.match(markup, /Environment blocker remains unresolved\./);
  assert.match(markup, /Development environment preflight is blocked\./);
});

test("Issue Fix Card combined Review & Validation owns advisory browser controls and Operator decisions", () => {
  const markup = renderToStaticMarkup(React.createElement(IssueFixCardReviewValidationWorkspace, {
    activeStepLabel: "Review & Validation",
    actionError: "",
    actionFeedback: "",
    actionPending: false,
    browserPanel: React.createElement(FigmaBrowserPanel, {
      hostRef: { current: null },
      onReload: () => undefined,
      onRetry: () => undefined,
      retryVisible: false,
      statusLabel: "ChatGPT ready",
    }),
    fixCardProjection: fixCardProjection({
      currentStep: "review-validation",
      contractDisposition: "Approved",
      contractMarkdown: "# Exact Fix Card Contract",
      implementerReportReadiness: "ready-for-review",
      canApplyValidationDecision: true,
      canCopyAdvisoryPrompt: true,
      architectReviewRecommendation: "Inconclusive",
      architectReviewMarkdown: "# Review\n\n## Advisory Recommendation\nInconclusive",
    }),
    currentIssue: currentIssue(),
    onApplyDecision: () => undefined,
    onCopyAdvisoryPrompt: () => undefined,
    onRefresh: () => undefined,
    onReloadBrowser: () => undefined,
    projectName: "ChampCity_AI",
  }));

  assert.match(markup, /Fix Card Review &amp; Validation/);
  assert.match(markup, /issue-document-chat-workspace-shell issue-fix-card-document-chat-workspace/);
  assert.match(markup, /Issue: ISSUE_001: No Independent Issue Resolution Workflow/);
  assert.match(markup, /Step: Review &amp; Validation/);
  assert.match(markup, /figma-doc-chat-workspace issue-fix-card-review-validation-workspace/);
  assert.match(markup, /aria-label="Embedded ChatGPT browser"/);
  assert.match(markup, /Reload ChatGPT/);
  assert.match(markup, /Copy Advisory Prompt/);
  assert.match(markup, /Refresh/);
  assert.doesNotMatch(markup, /Prepare Handoff|Copy Handoff/);
  assert.match(markup, /Current Contract[\s\S]*Implementer Report[\s\S]*Advisory Context \(optional\)[\s\S]*Validation Record/);
  assert.match(markup, /class="work-card-report-document-pane"/);
  assert.match(markup, /class="architect-document-selector"/);
  assert.match(markup, /class="document-choice selected"/);
  assert.match(markup, /class="document-preview"[\s\S]*class="preview-body"/);
  assert.equal((markup.match(/<textarea/g) ?? []).length, 3);
  assert.match(markup, /Advisory summary \/ pasted recommendation \(optional\)/);
  assert.match(markup, /class="architect-review-panel"/);
  assert.match(markup, /class="validation-action-row"/);
  assert.match(markup, /<button class="apply-button" type="button">[\s\S]*?Validate Passed<\/button>/);
  assert.match(markup, /<button class="apply-button secondary" disabled="" type="button">[\s\S]*?Request Repair<\/button>/);
  assert.match(markup, /Inconclusive/);
  assert.doesNotMatch(markup, /Fix Card Map Ready|champcity-fix-card-plan|Codex execution console|Apply Review/);
});

test("Issue Repair reuses the Work Card Repair presentation with Issue-owned evidence and actions", () => {
  const eligible = renderToStaticMarkup(React.createElement(IssueFixCardRepairWorkspace, {
    actionError: "",
    actionFeedback: "Repair handoff prepared.",
    actionPending: false,
    currentIssue: currentIssue(),
    fixCardProjection: fixCardProjection({
      currentStep: "repair",
      validationRecordDisposition: "RevisionRequested",
      validationBoundedDefect: "Bounded identity defect.",
      canPrepareRepairHandoff: true,
      canCopyRepairHandoff: false,
    }),
    onApplyContractReview: () => undefined,
    onCopyRepairHandoff: () => undefined,
    onPrepareRepairHandoff: () => undefined,
    onRefresh: () => undefined,
  }));
  assert.match(eligible, /Issue Repair/);
  assert.match(eligible, /figma-doc-chat-workspace work-card-repair-workspace/);
  assert.match(eligible, /class="figma-document-tabs"/);
  assert.match(eligible, /Validation Record[\s\S]*Implementer Report[\s\S]*Failed \/ Current Implementation Contract/);
  assert.match(eligible, /class="work-card-repair-actions"/);
  assert.match(eligible, /class="work-card-repair-primary"[^>]*>[^]*Prepare Repair Handoff/);
  assert.match(eligible, /class="work-card-repair-secondary" disabled=""[^>]*>[^]*Copy Handoff/);
  assert.match(eligible, /Reload ChatGPT/);
  assert.match(eligible, /Refresh/);
  assert.match(eligible, /Prepare Repair Handoff/);
  assert.match(eligible, /Bounded identity defect/);
  assert.match(eligible, /Issue ISSUE_001; root Fix Card ISSUE_001-FC01/);

  const reviewable = renderToStaticMarkup(React.createElement(IssueFixCardRepairWorkspace, {
    actionError: "",
    actionFeedback: "",
    actionPending: false,
    currentIssue: currentIssue(),
    fixCardProjection: fixCardProjection({
      currentStep: "repair",
      currentImplementationId: "ISSUE_001-FC01-REPAIR01",
      currentImplementationKind: "repair",
      currentRepairId: "ISSUE_001-FC01-REPAIR01",
      parentImplementationId: "ISSUE_001-FC01",
      parentImplementationPath: "issues/ISSUE_001/Fix_Cards/ISSUE_001-FC01_fix_card_contract_service.md",
      contractMarkdown: "# ISSUE_001-FC01-REPAIR01",
      contractDisposition: "Pending",
      canApplyContractReview: true,
    }),
    onApplyContractReview: () => undefined,
    onCopyRepairHandoff: () => undefined,
    onPrepareRepairHandoff: () => undefined,
    onRefresh: () => undefined,
  }));
  assert.match(reviewable, /Current Repair Contract/);
  assert.match(reviewable, /failed implementation ISSUE_001-FC01/);
  assert.match(reviewable, /Issue Repair Architect/);
  assert.match(reviewable, /Document Disposition/);
  assert.match(reviewable, /Workflow Step[\s\S]*Issue Repair/);
});

function renderStepWorkspace(activeStepLabel, child) {
  return renderToStaticMarkup(React.createElement(React.Fragment, null,
    React.createElement(IssueFixCardContextStrip, {
      activeStepLabel,
      currentIssue: currentIssue(),
      fixCardProjection: fixCardProjection({ currentStep: "planning" }),
    }),
    child,
  ));
}

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

function planningProjection(overrides = {}) {
  return {
    issueId: "ISSUE_001",
    title: "No Independent Issue Resolution Workflow",
    issueRecordPath: "issues/ISSUE_001/ISSUE_RECORD.md",
    issueRecordState: "readable",
    architectInvestigationPath: "issues/ISSUE_001/ARCHITECT_INVESTIGATION.md",
    architectInvestigationState: "readable",
    architectReviewPath: "issues/ISSUE_001/ARCHITECT_REVIEW.md",
    architectReviewState: "readable",
    architectReviewDisposition: "Approved",
    architectRecommendation: "Proceed in Issue Resolution",
    architectPlanningEligible: true,
    issueResolutionPlanPath: "issues/ISSUE_001/ISSUE_RESOLUTION_PLAN.md",
    issueResolutionPlanState: "readable",
    issueResolutionPlanMarkdown: "# ISSUE_001",
    fixCardPlanPath: "issues/ISSUE_001/FIX_CARD_PLAN.md",
    fixCardPlanState: "readable",
    fixCardPlanMarkdown: "# ISSUE_001",
    fixCardCandidates: candidateList(overrides.candidateCount ?? 1),
    fixCardPlanValidationFindings: [],
    reviewPath: "issues/ISSUE_001/ISSUE_PLANNING_REVIEW.md",
    reviewState: "readable",
    operatorDisposition: "Approved",
    status: "approved-ready-for-fix-cards",
    statusMessage: "Approved.",
    workflowStatus: {
      issueId: "ISSUE_001",
      stageId: "issue-planning",
      stageLabel: "Issue Planning",
      state: "approved-ready-for-fix-cards",
      stateLabel: "Approved - Ready for Fix Cards",
      issuePlanningEligible: true,
      fixCardsEligible: true,
      reason: "Approved.",
    },
    fixCardsEligible: true,
    canPrepareHandoff: false,
    canCopyHandoff: false,
    canApplyReview: false,
  };
}

function fixCardProjection(overrides = {}) {
  const currentStep = overrides.currentStep ?? "fix-card-map";
  return {
    issueId: "ISSUE_001",
    title: "No Independent Issue Resolution Workflow",
    selectedCandidate: candidate(),
    candidates: [candidate()],
    currentStep,
    status: "planning-ready",
    statusMessage: "Ready.",
    currentImplementationId: "ISSUE_001-FC01",
    currentImplementationKind: "root-fix-card",
    stepAvailability: [
      { stepId: "fix-card-map", available: true, stateLabel: currentStep === "fix-card-map" ? "Current" : "Available", reason: "Map." },
      { stepId: "planning", available: true, stateLabel: currentStep === "planning" ? "Current" : "Available", reason: "Planning." },
      { stepId: "implement", available: overrides.contractDisposition === "Approved", stateLabel: currentStep === "implement" ? "Current" : "Unavailable", reason: "Implement." },
      { stepId: "review-validation", available: overrides.implementerReportReadiness === "ready-for-review", stateLabel: currentStep === "review-validation" ? "Current" : "Unavailable", reason: "Review and validation." },
      { stepId: "repair", available: false, stateLabel: "Unavailable", reason: "FC06." },
      { stepId: "close-next", available: false, stateLabel: "Unavailable", reason: "FC07." },
    ],
    contractPath: "issues/ISSUE_001/Fix_Cards/ISSUE_001-FC01_fix_card_contract_service.md",
    contractState: overrides.contractMarkdown ? "readable" : "missing",
    contractMarkdown: overrides.contractMarkdown,
    contractRevision: 1,
    contractDisposition: overrides.contractDisposition,
    implementerReportPath: "issues/ISSUE_001/Implementer_Reports/IMPLEMENTER_REPORT_ISSUE_001-FC01_fix_card_contract_service.md",
    implementerReportState: "readable",
    implementerReportMarkdown: "# Implementer Report",
    implementerReportRevision: 1,
    implementerReportDisposition: "Pending",
    implementerReportReadiness: overrides.implementerReportReadiness ?? "missing",
    implementerReportReadinessReason: "Ready.",
    architectReviewPath: "issues/ISSUE_001/Architect_Reviews/ARCHITECT_REVIEW_ISSUE_001-FC01.md",
    architectReviewState: overrides.architectReviewMarkdown ? "readable" : "missing",
    architectReviewMarkdown: overrides.architectReviewMarkdown,
    architectReviewRecommendation: overrides.architectReviewRecommendation,
    validationRecordState: overrides.validationRecordState ?? "missing",
    closeRecord: overrides.closeRecord ?? {
      path: "issues/ISSUE_001/Close_Records/FIX_CARD_CLOSE_RECORD_ISSUE_001-FC01.md",
      state: "missing",
      reason: "No close record exists.",
    },
    allFixCardsClosed: false,
    canSelectCandidate: true,
    canPreparePlanningHandoff: true,
    canCopyPlanningHandoff: true,
    canApplyContractReview: Boolean(overrides.canApplyContractReview),
    canReserveImplementerReport: true,
    canRunImplementer: Boolean(overrides.canRunImplementer),
    canCopyAdvisoryPrompt: Boolean(overrides.canCopyAdvisoryPrompt),
    canApplyValidationDecision: false,
    canRequestRepair: false,
    canPrepareRepairHandoff: false,
    canCopyRepairHandoff: false,
    canCloseFixCard: false,
    ...overrides,
  };
}

function candidate() {
  return {
    fixCardId: "ISSUE_001-FC01",
    order: 1,
    title: "Fix Card contract service",
    purpose: "Implement Issue-owned contract, report, Codex context, and advisory review behavior.",
    dependsOn: [],
    evidencePaths: ["issues/ISSUE_001/ARCHITECT_INVESTIGATION.md"],
  };
}

function agentHarnessContractStatus(state, publishedContracts) {
  const tools = [{ name: "artifact_toolbox", actions: ["status", "replace_markdown_body"] }];
  return {
    state: "running",
    toolContractDiagnostics: {
      registry: {
        scope: "files.read files.write",
        fingerprint: "a".repeat(64),
        toolCount: 1,
        tools,
      },
      published: {
        state,
        activeSessionCount: publishedContracts.length,
        staleSessionCount: 0,
        contracts: publishedContracts.map((contract) => ({
          scope: "files.read files.write",
          fingerprint: contract.current ? "a".repeat(64) : "b".repeat(64),
          toolCount: 1,
          tools,
          current: contract.current,
          sessionCount: 1,
        })),
      },
    },
  };
}

function candidateList(count) {
  return Array.from({ length: count }, (_, index) => {
    const order = index + 1;
    const suffix = String(order).padStart(2, "0");
    return {
      fixCardId: `ISSUE_001-FC${suffix}`,
      order,
      title: order === 1 ? "Fix Card contract service" : `Fix Card candidate ${suffix}`,
      purpose: order === 1
        ? "Implement Issue-owned contract, report, Codex context, and advisory review behavior."
        : `Implement bounded candidate ${suffix} behavior.`,
      dependsOn: order === 1 ? [] : [`ISSUE_001-FC${String(order - 1).padStart(2, "0")}`],
      evidencePaths: ["issues/ISSUE_001/ARCHITECT_INVESTIGATION.md"],
    };
  });
}

function codexExecution() {
  return {
    state: "ready",
    executionKind: "work-card-implementation",
    lastRunState: null,
    canRunAgain: true,
    canResolveEnvironment: false,
    retryBlocker: null,
    integrationMode: "app-server-stdio",
    phaseId: null,
    workCardId: "ISSUE_001-FC01",
    workCardTitle: "Fix Card contract service",
    projectRoot: "<PROJECT_REPO>",
    formalWorkCardPath: "issues/ISSUE_001/Fix_Cards/ISSUE_001-FC01_fix_card_contract_service.md",
    formalWorkCardRevision: 1,
    formalWorkCardSha256: "abc",
    implementerReportPath: "issues/ISSUE_001/Implementer_Reports/IMPLEMENTER_REPORT_ISSUE_001-FC01_fix_card_contract_service.md",
    implementerReportRevision: 1,
    implementerReportSha256: "def",
    startedAt: null,
    completedAt: null,
    elapsedMs: null,
    eventTail: [],
    stderrTail: [],
    finalResponseTail: [],
    approvalTail: [],
    runtimeDenialTail: [],
    runtimeState: null,
    pendingUserInput: {
      requestId: "input-1",
      threadId: "thread-1",
      turnId: "turn-1",
      itemId: "item-1",
      questions: [{
        id: "scope",
        header: "Scope",
        question: "Confirm bounded implementation scope.",
        options: [{ label: "Proceed", description: "Continue with bounded work." }],
      }],
    },
    pendingMcpElicitation: {
      requestId: "mcp-1",
      threadId: "thread-1",
      turnId: "turn-1",
      serverName: "ChampCity MCP",
      mode: "form",
      message: "Provide repository evidence.",
      responseSupported: true,
      unsupportedReason: null,
      elicitationId: "elicitation-1",
      url: null,
      requestedSchemaSummary: "object",
      fields: [],
    },
    pendingApproval: null,
    failureReason: null,
    reportUpdated: false,
    reportSha256After: null,
    developmentEnvironmentPreflight: null,
  };
}

function validFixCardContract() {
  return [
    "# ISSUE_001-FC01 - Fix Card Contract",
    "## Verified Repository Evidence",
    "Repository evidence.",
    "## Objective",
    "Objective.",
    "## Runtime Sequence",
    "Sequence.",
  ].join("\n");
}

test("visible Fix Card candidate buttons deliver exact identity and reflect selection and busy state", () => {
  const { IssueFixCardMapPanel } = loader.loadRendererSourceModule("src/renderer/app/IssuePlanningWorkspace.tsx");
  const candidates = candidateList(2).map((entry) => ({ ...entry, lifecycle: { selectable: true, state: "not-started", label: "Not Started" } }));
  const selected = [];
  function controls(node) {
    if (!node || typeof node !== "object") return [];
    return [...(node.type === "button" && Object.hasOwn(node.props, "aria-pressed") ? [node] : []), ...React.Children.toArray(node.props?.children).flatMap(controls)];
  }
  const input = { candidates, selectedFixCardId: candidates[0].fixCardId, onSelectCandidate: (id) => selected.push(id), isSelectionPending: false };
  const buttons = controls(IssueFixCardMapPanel(input));
  assert.equal(buttons.length, 2);
  assert.deepEqual(buttons.map((node) => node.props["aria-pressed"]), [true, false]);
  buttons[1].props.onClick();
  assert.deepEqual(selected, [candidates[1].fixCardId]);
  assert.ok(controls(IssueFixCardMapPanel({ ...input, isSelectionPending: true })).every((node) => node.props.disabled));
});
