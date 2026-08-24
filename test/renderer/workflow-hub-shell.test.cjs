const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const test = require("node:test");

const loader = require("./renderer-source-loader.cjs");
const { FigmaSidebar } = loader.loadRendererSourceModule("src/renderer/app/figma/FigmaSidebar.tsx");
const { NestedWorkflowRail } = loader.loadRendererSourceModule("src/renderer/app/NestedWorkflowRail.tsx");
const { WorkflowHubWorkspace } = loader.loadRendererSourceModule("src/renderer/app/WorkflowHubWorkspace.tsx");
const {
  workflowDefinitions,
} = loader.loadRendererSourceModule("src/shared/workflowHubContracts.ts");

const repoRoot = path.join(__dirname, "..", "..");

test("Workflow Hub registry exposes only the functional Development workflow", () => {
  assert.deepEqual(
    workflowDefinitions.map(({ workflowId, label, description, tags }) => ({
      workflowId,
      label,
      description,
      tags,
    })),
    [
      {
        workflowId: "development",
        label: "Development",
        description: "Plan, implement, review, and validate planned software development.",
        tags: ["Plan", "Build", "Prove"],
      },
    ],
  );

  const workspaceContracts = fs.readFileSync(path.join(repoRoot, "src", "shared", "workspaceContracts.ts"), "utf8");
  assert.doesNotMatch(workspaceContracts, /workflow-hub/);
});

test("Hub with no selected project renders project-selection shell without Development lifecycle status", () => {
  const sidebarMarkup = renderToStaticMarkup(React.createElement(FigmaSidebar, {
    activeWorkspaceId: "project-intake-capture",
    currentModel: null,
    isChoosing: false,
    mode: "hub",
    onChooseProject: () => undefined,
    onClearProject: () => undefined,
    onOpenSettings: () => undefined,
    onThemeChange: () => undefined,
    projectName: "No Project Selected",
    themeMode: "dark",
    workspace: { ok: false, workspaceRoot: null, reason: "No project selected." },
  }));
  const hubMarkup = renderToStaticMarkup(React.createElement(WorkflowHubWorkspace, {
    onOpenWorkflow: () => undefined,
    projectName: "No Project Selected",
    workspace: { ok: false, workspaceRoot: null, reason: "No project selected." },
  }));

  assert.match(sidebarMarkup, /aria-label="Project"/);
  assert.match(sidebarMarkup, /Open Project/);
  assert.match(sidebarMarkup, /Settings/);
  assert.match(sidebarMarkup, /aria-label="Theme"/);
  assert.doesNotMatch(sidebarMarkup, /Current Phase|Current Work Card|Workflow navigation|Workflows/);
  assert.match(hubMarkup, /Select a project before choosing a workflow\./);
  assert.doesNotMatch(hubMarkup, /Development|Current Required Workflow Step|Phase Loop|Work Card loop/);
});

test("Selected-project Hub renders exactly one large Development workflow card", () => {
  const markup = renderToStaticMarkup(React.createElement(WorkflowHubWorkspace, {
    onOpenWorkflow: () => undefined,
    projectName: "ChampCity_AI",
    workspace: { ok: true, workspaceRoot: "<PROJECT_REPO>" },
  }));

  assert.match(markup, /<h1 id="workspace-heading">Workflows<\/h1>/);
  assert.match(markup, /Choose how you want to work with ChampCity_AI\./);
  assert.match(markup, /class="workflow-card"/);
  assert.match(markup, /Development/);
  assert.match(markup, /Plan, implement, review, and validate planned software development\./);
  assert.match(markup, /Plan/);
  assert.match(markup, /Build/);
  assert.match(markup, /Prove/);
  assert.match(markup, /Continue Development/);
  assert.doesNotMatch(markup, /Issue Resolution|Feature|Graphic|Brainstorm/);
});

test("Hub sidebar omits Development lifecycle fields while Development sidebar owns them", () => {
  const currentModel = sampleCurrentModel();
  const hubMarkup = renderToStaticMarkup(React.createElement(FigmaSidebar, {
    activeWorkspaceId: "work-card-report-review",
    currentModel,
    isChoosing: false,
    mode: "hub",
    onChooseProject: () => undefined,
    onClearProject: () => undefined,
    onOpenSettings: () => undefined,
    onThemeChange: () => undefined,
    projectName: "ChampCity_AI",
    themeMode: "light",
    workspace: { ok: true, workspaceRoot: "<PROJECT_REPO>" },
  }));
  const developmentMarkup = renderToStaticMarkup(React.createElement(FigmaSidebar, {
    activeWorkspaceId: "work-card-report-review",
    currentModel,
    isChoosing: false,
    mode: "development",
    onChooseProject: () => undefined,
    onClearProject: () => undefined,
    onOpenSettings: () => undefined,
    onReturnToWorkflowHub: () => undefined,
    onThemeChange: () => undefined,
    projectName: "ChampCity_AI",
    themeMode: "light",
    workspace: { ok: true, workspaceRoot: "<PROJECT_REPO>" },
  }));

  assert.match(hubMarkup, /ChampCity_AI/);
  assert.match(hubMarkup, /Change Project/);
  assert.match(hubMarkup, /Clear Project/);
  assert.doesNotMatch(hubMarkup, /Current Phase|Current Work Card|phase-00|WC01|Workflows/);
  assert.match(developmentMarkup, /Workflows/);
  assert.match(developmentMarkup, /Current Phase/);
  assert.match(developmentMarkup, /phase-00/);
  assert.match(developmentMarkup, /Current Work Card/);
  assert.match(developmentMarkup, /WC01/);
});

test("Development rail remains owned by Development foreground routing", () => {
  const railMarkup = renderToStaticMarkup(React.createElement(NestedWorkflowRail, {
    activeWorkspaceId: "work-card-report-review",
    executionContext: sampleCurrentModel().executionContext,
    onWorkspaceChange: () => undefined,
    requiredWorkspaceId: "work-card-report-review",
  }));
  const appSource = fs.readFileSync(path.join(repoRoot, "src", "renderer", "app", "App.tsx"), "utf8");

  assert.match(railMarkup, /aria-label="Workflow navigation"/);
  assert.match(railMarkup, /aria-label="Phase loop"/);
  assert.match(railMarkup, /aria-label="Work Card loop"/);
  assert.match(appSource, /\{isDevelopmentForeground \? \(\s*<NestedWorkflowRail/);
  assert.doesNotMatch(appSource, /workflow-hub" as WorkspaceId/);
});

test("Project selection routes to Hub, while Development entry delegates to the existing resolver", () => {
  const appSource = fs.readFileSync(path.join(repoRoot, "src", "renderer", "app", "App.tsx"), "utf8");
  const activateSelectionSource = extractFunctionSource(appSource, "async function activateWorkspaceSelection", "function clearRepositoryDerivedState");
  const openWorkflowSource = extractFunctionSource(appSource, "async function openWorkflow", "function returnToWorkflowHub");
  const returnToHubSource = extractFunctionSource(appSource, "function returnToWorkflowHub", "async function refreshAgentHarnessStatus");

  assert.match(activateSelectionSource, /setShellView\("workflow-hub"\)/);
  assert.match(activateSelectionSource, /setActiveWorkflowId\(null\)/);
  assert.doesNotMatch(activateSelectionSource, /refreshDocuments\(\{ useResolver: true \}\)/);
  assert.doesNotMatch(activateSelectionSource, /resolveCurrentDocument/);

  assert.match(openWorkflowSource, /workflowId !== "development"/);
  assert.match(openWorkflowSource, /setShellView\("workflow"\)/);
  assert.match(openWorkflowSource, /setActiveWorkflowId\("development"\)/);
  assert.match(openWorkflowSource, /refreshDocuments\(\{ useResolver: true \}\)/);

  assert.match(returnToHubSource, /setShellView\("workflow-hub"\)/);
  assert.match(returnToHubSource, /setActiveWorkflowId\(null\)/);
  assert.doesNotMatch(returnToHubSource, /clearRepositoryDerivedState|resolveCurrentDocument|setCurrentModel/);
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
    activeWorkspaceId: "work-card-report-review",
    level: "work-card",
    stage: "Review",
    railStatus: "In Progress",
    currentPhaseId: "phase-00",
    currentWorkCardId: "WC01",
    executionContext: {
      phase: {
        state: "active",
        phaseId: "phase-00",
        title: "Foundation",
        order: 1,
        totalPhaseCount: 1,
        purpose: "Prove the shell.",
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
    currentTarget: "WC01",
    sourceEvidence: [],
    requiredAction: "Review implementation.",
    expectedOutput: "Hub shell.",
    eligibility: "Ready",
    expectedNextState: "Operator validation",
  };
}
