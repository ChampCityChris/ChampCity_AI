const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const test = require("node:test");

const loader = require("./renderer-source-loader.cjs");
const { App } = loader.loadRendererSourceModule("src/renderer/app/App.tsx");
const { FigmaSidebar } = loader.loadRendererSourceModule("src/renderer/app/figma/FigmaSidebar.tsx");
const { LandingWorkspace } = loader.loadRendererSourceModule("src/renderer/app/LandingWorkspace.tsx");
const { NestedWorkflowRail } = loader.loadRendererSourceModule("src/renderer/app/NestedWorkflowRail.tsx");
const { WorkflowHubWorkspace } = loader.loadRendererSourceModule("src/renderer/app/WorkflowHubWorkspace.tsx");
const {
  workflowDefinitions,
} = loader.loadRendererSourceModule("src/shared/workflowHubContracts.ts");

const repoRoot = path.join(__dirname, "..", "..");

test("fresh composed renderer foregrounds landing without sidebar or workflow rails", () => {
  const markup = renderToStaticMarkup(React.createElement(App));

  assert.match(markup, /class="workspace-surface landing-surface"/);
  assert.match(markup, /Choose where to begin/);
  assert.match(markup, /Open Existing Project/);
  assert.match(markup, /Start New Project/);
  assert.doesNotMatch(markup, /aria-label="Project navigation"/);
  assert.doesNotMatch(markup, /aria-label="Workflow navigation"/);
  assert.doesNotMatch(markup, /aria-label="Issue Resolution navigation"/);
});

test("fresh application shell presents the project-neutral landing actions without project navigation", () => {
  const markup = renderToStaticMarkup(React.createElement(LandingWorkspace, {
    feedback: "",
    isChoosing: false,
    onOpenExistingProject: () => undefined,
    onStartNewProject: () => undefined,
  }));

  assert.match(markup, /<h1 id="workspace-heading">Choose where to begin<\/h1>/);
  assert.match(markup, /Open Existing Project/);
  assert.match(markup, /Start New Project/);
  assert.doesNotMatch(markup, /Project navigation|Workflow navigation|Available workflows/);
});

test("landing selection feedback remains bounded to the landing surface", () => {
  const markup = renderToStaticMarkup(React.createElement(LandingWorkspace, {
    feedback: "Project selection was canceled.",
    isChoosing: false,
    onOpenExistingProject: () => undefined,
    onStartNewProject: () => undefined,
  }));

  assert.match(markup, /role="status"/);
  assert.match(markup, /Project selection was canceled\./);
});

test("Workflow Hub registry exposes only the functional peer workflows", () => {
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
      {
        workflowId: "issue-resolution",
        label: "Issue Resolution",
        description: "Investigate and resolve problems in the current project baseline.",
        tags: ["Investigate", "Fix", "Verify"],
      },
    ],
  );
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

  assert.match(sidebarMarkup, /aria-label="Select Project"/);
  assert.match(sidebarMarkup, /Open Project/);
  assert.match(sidebarMarkup, /Settings/);
  assert.match(sidebarMarkup, /aria-label="Theme"/);
  assert.doesNotMatch(sidebarMarkup, /Current Phase|Current Work Card|Workflow navigation|Workflows/);
  assert.match(hubMarkup, /Select a project before choosing a workflow\./);
  assert.doesNotMatch(hubMarkup, /Development|Current Required Workflow Step|Phase Loop|Work Card loop/);
});

test("Selected-project Hub renders exactly Development and Issue Resolution workflow cards", () => {
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
  assert.match(markup, /Issue Resolution/);
  assert.match(markup, /Investigate and resolve problems in the current project baseline\./);
  assert.match(markup, /Investigate/);
  assert.match(markup, /Fix/);
  assert.match(markup, /Verify/);
  assert.match(markup, /Open Issue Resolution/);
  assert.doesNotMatch(markup, /Feature|Graphic|Brainstorm/);
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

test("Development rail renders workflow, phase, and Work Card navigation", () => {
  const railMarkup = renderToStaticMarkup(React.createElement(NestedWorkflowRail, {
    activeWorkspaceId: "work-card-report-review",
    executionContext: sampleCurrentModel().executionContext,
    onWorkspaceChange: () => undefined,
    requiredWorkspaceId: "work-card-report-review",
  }));

  assert.match(railMarkup, /aria-label="Workflow navigation"/);
  assert.match(railMarkup, /aria-label="Phase loop"/);
  assert.match(railMarkup, /aria-label="Work Card loop"/);
});

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


test("MCP handoff preflight preserves drafts while stale or unavailable and permits retry only on current refresh", async () => {
  const source = fs.readFileSync(path.join(repoRoot, "src/renderer/app/App.tsx"), "utf8");
  // Execute the production handler bodies with IPC/state boundaries supplied explicitly.
  function handler(name) {
    const start = source.indexOf(`  async function ${name}(`);
    assert.ok(start >= 0);
    const end = source.indexOf("\n  async function ", start + 1);
    return source.slice(start, end);
  }
  const ts = require("typescript");
  const body = ts.transpileModule([
    handler("refreshAgentHarnessServiceHostLifecycleStatus"),
    handler("preflightMcpHandoff"),
    handler("runMcpHandoff"),
    handler("copyArchitectHandoff"),
    handler("prepareArchitectOutputFromAction"),
  ].join("\n"), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  let current = { restartRequired: true };
  let projected = current;
  let copies = 0, prepares = 0, issueActions = 0;
  const draft = { id: "existing-controlled-draft", body: "preserved" };
  const api = {
    getAgentHarnessServiceHostLifecycleStatus: async () => {
      if (!current) throw Error("status unavailable");
      return current;
    },
    copyArchitectOutputHandoff: async () => { copies++; },
    prepareArchitectOutputHandoff: async () => { prepares++; return draft; },
  };
  const noop = () => {};
  const handlers = new Function("window", "setAgentHarnessServiceHostLifecycleStatus", "setAgentHarnessActionError", "setDocumentError", "setArchitectFeedback", "setArchitectOutputModel", "refreshArchitectStatus", "refreshArchitectOutputWorkspace", "refreshDocuments", `
    const activeWorkspaceId = "work-card-repair";
    const architectOutputCopiedFeedback = "copied", architectOutputPreparedFeedback = "prepared";
    ${body}
    return { copyArchitectHandoff, prepareArchitectOutputFromAction, runMcpHandoff };
  `)({ champcity: api }, status => { projected = status; }, noop, noop, noop, noop, noop, noop, noop);
  for (const status of [{ restartRequired: true }, null]) {
    current = status;
    await handlers.copyArchitectHandoff();
    await handlers.prepareArchitectOutputFromAction();
    await handlers.runMcpHandoff(async () => { issueActions++; });
    assert.equal(projected.restartRequired, true);
    assert.deepEqual([copies, prepares, issueActions], [0, 0, 0]);
  }
  current = { restartRequired: false };
  await handlers.copyArchitectHandoff();
  await handlers.prepareArchitectOutputFromAction();
  await handlers.runMcpHandoff(async () => { issueActions++; });
  assert.deepEqual([copies, prepares, issueActions], [1, 1, 1]);
  assert.equal(projected.restartRequired, false);
  assert.deepEqual(draft, { id: "existing-controlled-draft", body: "preserved" });
});
