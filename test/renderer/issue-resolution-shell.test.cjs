const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const test = require("node:test");

const loader = require("./renderer-source-loader.cjs");
const { FigmaSidebar } = loader.loadRendererSourceModule("src/renderer/app/figma/FigmaSidebar.tsx");
const { IssueResolutionRail } = loader.loadRendererSourceModule("src/renderer/app/IssueResolutionRail.tsx");
const { IssueResolutionWorkspace } = loader.loadRendererSourceModule("src/renderer/app/IssueResolutionWorkspace.tsx");
const {
  issueFixCardLoop,
  issueResolutionStages,
} = loader.loadRendererSourceModule("src/shared/issueResolutionContracts.ts");

const repoRoot = path.join(__dirname, "..", "..");

test("Issue Resolution rail exposes parent lifecycle and gates Architect Planning on a readable Issue", () => {
  const readableIssue = {
    issueId: "ISSUE_001",
    numericId: 1,
    title: "No Independent Issue Resolution Workflow",
    recordPath: "issues/ISSUE_001/ISSUE_RECORD.md",
    recordState: "readable",
    bodyMarkdown: "# ISSUE_001",
  };
  const markup = renderToStaticMarkup(React.createElement(IssueResolutionRail, {
    activeStageId: "architect-planning",
    currentIssue: readableIssue,
    onStageChange: () => undefined,
  }));

  assert.match(markup, /aria-label="Issue Resolution parent rail"/);
  for (const label of [
    "01 Intake",
    "02 Architect Planning",
    "03 Issue Planning",
    "04 Fix Cards",
    "05 Issue Validation",
    "06 Issue Close",
  ]) {
    assert.match(markup, new RegExp(escapeRegex(label)));
  }
  assert.equal(issueResolutionStages.find((stage) => stage.id === "intake").defaultAvailable, true);
  assert.equal(issueResolutionStages.find((stage) => stage.id === "architect-planning").defaultAvailable, true);
  assert.match(markup, /02 Architect Planning[\s\S]*?Current/);
  assert.match(markup, /03 Issue Planning[\s\S]*?Unavailable/);
  assert.deepEqual(issueFixCardLoop.map((step) => step.label), [
    "Fix Card Map",
    "Planning",
    "Implement",
    "Architect Review",
    "Fix Card Validation",
    "Repair",
    "Close / Next",
  ]);
});

test("Issue sidebar shows workflow return, project, current Issue, Settings, and no Development state", () => {
  const markup = renderToStaticMarkup(React.createElement(FigmaSidebar, {
    activeWorkspaceId: "project-intake-capture",
    currentIssue: {
      issueId: "ISSUE_001",
      numericId: 1,
      title: "No Independent Issue Resolution Workflow",
      recordPath: "issues/ISSUE_001/ISSUE_RECORD.md",
      recordState: "readable",
      bodyMarkdown: "# ISSUE_001",
    },
    issueWorkflowStatus: {
      issueId: "ISSUE_001",
      stageId: "architect-planning",
      stageLabel: "Architect Planning",
      state: "awaiting-operator-review",
      stateLabel: "Awaiting Operator Review",
      issuePlanningEligible: false,
      reason: "Architect Investigation is ready for Operator review.",
    },
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

  assert.match(markup, /Workflows/);
  assert.match(markup, /ChampCity_AI/);
  assert.match(markup, /Current Issue/);
  assert.match(markup, /ISSUE_001/);
  assert.match(markup, /No Independent Issue Resolution Workflow/);
  assert.match(markup, /Stage/);
  assert.match(markup, /Architect Planning/);
  assert.match(markup, /Awaiting Operator Review/);
  assert.match(markup, /Settings/);
  assert.match(markup, /aria-label="Theme"/);
  assert.doesNotMatch(markup, /Current Phase|Current Work Card|phase-00|WC01|Loop Step/);
});

test("Issue Intake renders selected record read-only and bounded New Issue fields", () => {
  const inventory = {
    issues: [{
      issueId: "ISSUE_001",
      numericId: 1,
      title: "No Independent Issue Resolution Workflow",
      recordPath: "issues/ISSUE_001/ISSUE_RECORD.md",
      recordState: "readable",
      bodyMarkdown: "# ISSUE_001 - No Independent Issue Resolution Workflow\n\n## Issue\nBaseline problem.",
    }],
  };
  const markup = renderToStaticMarkup(React.createElement(IssueResolutionWorkspace, {
    currentIssue: inventory.issues[0],
    error: "",
    inventory,
    isCreating: false,
    isLoading: false,
    onCreateIssue: async () => undefined,
    onRefresh: () => undefined,
    onSelectIssue: () => undefined,
    projectName: "ChampCity_AI",
  }));

  assert.match(markup, /Issue Intake/);
  assert.match(markup, /issues\/ISSUE_001\/ISSUE_RECORD\.md/);
  assert.match(markup, /Baseline problem\./);
  assert.match(markup, /Title/);
  assert.match(markup, /Current Consequence/);
  assert.match(markup, /Needed Capability \/ Expected Outcome/);
  assert.match(markup, /Discovery Context/);
  assert.doesNotMatch(markup, /Root Cause|Severity|Assignee|Sprint|SLA|Phase Position|Work Card/);
});

test("Issue entry branch does not invoke Development resolver authority", () => {
  const appSource = fs.readFileSync(path.join(repoRoot, "src", "renderer", "app", "App.tsx"), "utf8");
  const openWorkflowSource = extractFunctionSource(appSource, "async function openWorkflow", "function returnToWorkflowHub");
  const issueBranch = openWorkflowSource.slice(
    openWorkflowSource.indexOf('workflowId === "issue-resolution"'),
    openWorkflowSource.indexOf('setActiveWorkflowId("development")'),
  );

  assert.match(issueBranch, /setActiveWorkflowId\("issue-resolution"\)/);
  assert.match(issueBranch, /refreshIssueInventory\(\)/);
  assert.doesNotMatch(issueBranch, /refreshDocuments|resolveCurrentDocument|getCurrentWorkspaceModel/);
  assert.match(appSource, /<IssueResolutionRail[\s\S]*?activeStageId=\{activeIssueStageId\}/);
  assert.doesNotMatch(appSource, /isIssueResolutionForeground[\s\S]{0,180}<NestedWorkflowRail/);
});

function extractFunctionSource(source, startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  assert.notEqual(start, -1, `${startNeedle} not found`);
  const end = source.indexOf(endNeedle, start);
  assert.notEqual(end, -1, `${endNeedle} not found after ${startNeedle}`);
  return source.slice(start, end);
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

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
