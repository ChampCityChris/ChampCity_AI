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
const { WorkflowInstanceWorkspace } = loader.loadRendererSourceModule("src/renderer/app/WorkflowInstanceWorkspace.tsx");
const { FeaturePlanningWorkspace } = loader.loadRendererSourceModule("src/renderer/app/FeaturePlanningWorkspace.tsx");
const { IssueWorkflowPlanningWorkspace } = loader.loadRendererSourceModule("src/renderer/app/IssueWorkflowPlanningWorkspace.tsx");
const { workflowPlanningSurface, shouldShowClosedWorkIntakeSummary } = loader.loadRendererSourceModule("src/renderer/app/workflowPlanningDispatch.ts");
const { WorkflowPlanningMap } = loader.loadRendererSourceModule("src/renderer/app/WorkflowPlanningMap.tsx");
const { WORKFLOW_TYPE_REGISTRY } = loader.loadRendererSourceModule("src/shared/projectState/workflowTypeRegistry.ts");

const repoRoot = path.join(__dirname, "..", "..");

test("exact planning dispatch follows supported type and persisted currentWorkspace", () => {
  for (const currentWorkspace of ["feature-intake", "feature-assessment", "feature-planning", "work-item-map"])
    assert.equal(workflowPlanningSurface({ workflowType: "feature-capability", lifecycleState: "active", currentWorkspace }), "feature");
  for (const currentWorkspace of ["issue-intake", "issue-rca", "issue-planning", "work-item-map"])
    assert.equal(workflowPlanningSurface({ workflowType: "issue-resolution", lifecycleState: "active", currentWorkspace }), "issue");
  assert.equal(workflowPlanningSurface({ workflowType: "issue-resolution", lifecycleState: "active", currentWorkspace: "feature-planning" }), "generic");
  assert.equal(workflowPlanningSurface({ workflowType: "refactor-migration", lifecycleState: "active", currentWorkspace: "feature-planning" }), "generic");
  assert.equal(workflowPlanningSurface({ workflowType: "feature-capability", lifecycleState: "closed", currentWorkspace: "work-item-map" }), "generic");
  assert.equal(shouldShowClosedWorkIntakeSummary({ workflowType: "work-intake-routing", lifecycleState: "closed", currentWorkspace: "work-intake" }), true);
  assert.equal(shouldShowClosedWorkIntakeSummary({ workflowType: "work-intake-routing", lifecycleState: "active", currentWorkspace: "work-intake" }), false);
});

test("accepted Work Item Map is readable and exposes no execution controls", () => {
  const record = (id, body) => ({ id, body });
  const markup = renderToStaticMarkup(React.createElement(WorkflowPlanningMap, { plan: {
    phases: [{ phaseId: "phase-1", sequence: 1, workItemIds: ["work-1"], criterionIds: [], record: record("phase-1", { title: "Foundation", objective: "Establish base" }) }],
    directWorkItems: [], workItemsByPhase: { "phase-1": [record("work-1", { title: "Add route", objective: "Expose route", workItemKind: "fix" })] },
    dependencyIds: [{ from: "work-1", to: "work-2" }], repairIds: [], criteria: [], decisions: [],
    solutions: [record("solution-1", { title: "Stable export", objective: "Export reliably", scopeIn: ["CSV"], scopeOut: ["PDF"] })],
  } }));
  assert.match(markup, /Phased/);
  assert.match(markup, /Bounded Solution: Stable export/);
  assert.match(markup, /Phase 1: Foundation/);
  assert.match(markup, /Add route/);
  assert.match(markup, /work-2/);
  assert.match(markup, /read-only/i);
  assert.doesNotMatch(markup, /<button|Implement|Checkpoint|Integrate/);
});

test("closed WIR stays on its completed exact-instance summary", () => {
  const workflow = { workflowId: "wir-closed-12", lineageId: "lineage", workflowType: "work-intake-routing", title: "Completed routing", workflowState: "closed", lifecycleState: "closed", currentWorkspace: "work-intake", createdAt: "now", updatedAt: "now" };
  const markup = renderToStaticMarkup(React.createElement(WorkflowInstanceWorkspace, { workflow, onReturn: () => undefined }));
  assert.match(markup, /This Work Intake routing Workflow is complete/);
  assert.match(markup, /Completed/);
  assert.match(markup, /wir-closed-12/);
  assert.doesNotMatch(markup, /ready for its workflow-specific intake/);
});

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

test("Feature workspace is keyed by exact Workflow identity and exposes only its planning front half", () => {
  const workflow = { workflowId: "feature-exact-123", lineageId: "lineage", workflowType: "feature-capability", title: "Same title", workflowState: "active", lifecycleState: "active", currentWorkspace: "feature-intake", createdAt: "now", updatedAt: "now" };
  const markup = renderToStaticMarkup(React.createElement(FeaturePlanningWorkspace, { workflow, onReturn: () => undefined, browserPanel: React.createElement("div", null, "Architect browser") }));
  assert.match(markup, /feature-exact-123/);
  assert.match(markup, /Feature Intake/);
  assert.match(markup, /Architect browser/);
  assert.doesNotMatch(markup, /Implement|Create Work Card|Checkpoint|Integrate|Close Workflow/);
});

test("Issue Workflow workspace uses exact Workflow identity and keeps execution actions out of the front half", () => {
  const workflow = { workflowId: "issue-exact-987", lineageId: "lineage", workflowType: "issue-resolution", title: "Same incident", workflowState: "active", lifecycleState: "active", currentWorkspace: "issue-intake", createdAt: "now", updatedAt: "now" };
  const markup = renderToStaticMarkup(React.createElement(IssueWorkflowPlanningWorkspace, { workflow, onReturn: () => undefined, browserPanel: React.createElement("div", null, "Architect browser") }));
  assert.match(markup, /issue-exact-987/);
  assert.match(markup, /Issue Intake/);
  assert.match(markup, /Architect browser/);
  assert.doesNotMatch(markup, /Create Fix Card|Implement|Checkpoint|Integrate|Close Issue/);
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
  const { workRouteProfiles, getWorkRouteProfile, isWorkRouteId } =
    loader.loadRendererSourceModule("src/shared/workIntakeRoutingContracts.ts");
  // Planning profiles are independent of the two existing execution entries.
  assert.deepEqual(workRouteProfiles.map(({ routeId }) => routeId), [
    "greenfield", "feature-change", "refactor-migration", "integration-composition",
    "infrastructure-platform", "research-prototype", "issue-resolution",
  ]);
  assert.ok(Object.isFrozen(workRouteProfiles));
  for (const [index, profile] of workRouteProfiles.entries()) {
    assert.equal(getWorkRouteProfile(profile.routeId), profile);
    assert.equal(isWorkRouteId(profile.routeId), true);
    assert.ok(Object.isFrozen(profile));
    assert.ok(profile.label && profile.description);
    assert.ok(index === 0 || profile.order > workRouteProfiles[index - 1].order);
    assert.equal("topology" in profile, false);
    assert.equal("workflowId" in profile, false);
  }
  assert.equal(getWorkRouteProfile("issue-resolution").assessmentKind, "root-cause-analysis");
  for (const unknown of ["maintenance", "development", "direct", "phased", "GREENFIELD", "toString", null]) {
    assert.equal(isWorkRouteId(unknown), false);
    assert.equal(getWorkRouteProfile(unknown), undefined);
  }
  assert.deepEqual(Object.values(WORKFLOW_TYPE_REGISTRY).filter(row => row.directStart).map(row => row.workflowType), [
    "feature-capability", "refactor-migration", "integration-composition", "infrastructure-platform", "research-prototype", "issue-resolution",
  ]);
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
    onOpenSourceControl: () => undefined,
    onOpenWorkflow: () => undefined,
    onStartWorkflow: async () => undefined,
    onStartWorkIntake: () => undefined,
    projectName: "No Project Selected",
    sourceControlAvailable: false,
    inventory: null, selectedWorkflowId: null, loading: false, error: "",
    workspace: { ok: false, workspaceRoot: null, reason: "No project selected." },
  }));

  assert.match(sidebarMarkup, /aria-label="Select Project"/);
  assert.match(sidebarMarkup, /Open Project/);
  assert.match(sidebarMarkup, /Settings/);
  assert.match(sidebarMarkup, /aria-label="Theme"/);
  assert.doesNotMatch(sidebarMarkup, /Current Phase|Current Work Card|Workflow navigation|Workflows/);
  assert.match(hubMarkup, /Select a project to start work\./);
  assert.doesNotMatch(hubMarkup, /Development|Current Required Workflow Step|Phase Loop|Work Card loop/);
});

test("Selected-project Hub groups independent Workflow instances and direct starts", () => {
  const instance = (workflowId, workflowType, title, lifecycleState = "active") => ({
    workflowId, workflowType, title, lineageId: `lineage-${workflowId}`, workflowState: lifecycleState === "closed" ? "closed" : "intake",
    lifecycleState, currentWorkspace: "feature-intake", createdAt: "2026-01-01", updatedAt: "2026-01-01",
  });
  const markup = renderToStaticMarkup(React.createElement(WorkflowHubWorkspace, {
    onOpenSourceControl: () => undefined,
    onOpenWorkflow: () => undefined,
    onStartWorkflow: async () => undefined,
    onStartWorkIntake: () => undefined,
    projectName: "ChampCity_AI",
    sourceControlAvailable: true,
    inventory: { groups: [
      { workflowType: "feature-capability", workflows: [instance("feature-1111", "feature-capability", "Improve onboarding"), instance("feature-2222", "feature-capability", "Add dashboard", "closed")] },
      { workflowType: "issue-resolution", workflows: [instance("issue-1111", "issue-resolution", "Startup crash"), instance("issue-2222", "issue-resolution", "Broken export")] },
      { workflowType: "work-intake-routing", workflows: [instance("wir-1111", "work-intake-routing", "Route request")] },
    ] }, selectedWorkflowId: "feature-2222", loading: false, error: "",
    workspace: { ok: true, workspaceRoot: "<PROJECT_REPO>" },
  }));

  assert.match(markup, /<h1 id="workspace-heading">Workflows<\/h1>/);
  assert.match(markup, /Feature \/ Capability/);
  assert.match(markup, /\+ Start Feature/);
  assert.match(markup, /Improve onboarding/);
  assert.match(markup, /Add dashboard/);
  assert.match(markup, /Completed/);
  assert.match(markup, /aria-label="Open Add dashboard \(feature-\)/);
  assert.match(markup, /\+ Help Me Route New Work/);
  assert.match(markup, /Broken export/);
  assert.match(markup, /2 instances/);
  assert.match(markup, /Source Control/);
  assert.doesNotMatch(markup, /Continue legacy Development or Issue work|Existing workflow recovery|Continue Development|Open Issue Resolution/);
  assert.doesNotMatch(markup, /Plan, implement, review, and validate planned software development\.|Investigate and resolve problems in the current project baseline\./);
  assert.equal((markup.match(/class="workflow-type-group"/g) ?? []).length, 7);
});

test("Hub represents the one-time Project Creation instance without a direct-start action", () => {
  const instance = { workflowId: "project-create-1", workflowType: "project-creation", title: "New product",
    lineageId: "lineage-project-create-1", workflowState: "active", lifecycleState: "active", currentWorkspace: "project-intake",
    createdAt: "2026-01-01", updatedAt: "2026-01-01" };
  const markup = renderToStaticMarkup(React.createElement(WorkflowHubWorkspace, {
    onOpenSourceControl: () => undefined, onOpenWorkflow: () => undefined, onStartWorkflow: async () => undefined,
    onStartWorkIntake: () => undefined, projectName: "New product", sourceControlAvailable: true,
    inventory: { groups: [{ workflowType: "project-creation", workflows: [instance] }] }, selectedWorkflowId: instance.workflowId,
    loading: false, error: "", workspace: { ok: true, workspaceRoot: "<PROJECT_REPO>" },
  }));
  assert.match(markup, /Project Creation \/ Greenfield/);
  assert.match(markup, /New product/);
  assert.match(markup, /aria-label="Open New product \(project-/);
  assert.doesNotMatch(markup, /\+ Start Project Creation/);
});

test("Hub actions preserve exact Workflow identity and route WIR rows to their exact intake", () => {
  const source = fs.readFileSync(path.join(repoRoot, "src/renderer/app/App.tsx"), "utf8");
  const ts = require("typescript");
  const ast = ts.createSourceFile("App.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declarations = new Map();
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name) declarations.set(node.name.text, node.getText(ast));
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.match(declarations.get("startDirectWorkflow"), /startWorkflow\(request\)/);
  assert.match(declarations.get("startDirectWorkflow"), /getWorkflow\(created\.workflow\.workflowId\)/);
  assert.match(declarations.get("startDirectWorkflow"), /setSelectedWorkflowId\(opened\.workflow\.workflowId\)/);
  assert.match(declarations.get("openCurrentWorkflow"), /getWorkflow\(workflowId\)/);
  assert.match(declarations.get("openCurrentWorkflow"), /workflowType === "project-creation"/);
  assert.match(declarations.get("activateWorkspaceSelection"), /projectCreationWorkflowId/);
  assert.match(declarations.get("activateWorkspaceSelection"), /setSelectedWorkflowId\(opened\.workflow\.workflowId\)/);
  assert.match(declarations.get("openCurrentWorkflow"), /openWorkIntakeForWorkflow\(result\.workflow\.workIntakeId, result\.workflow\.workflowId\)/);
  assert.match(declarations.get("openWorkIntakeForWorkflow"), /item\.intakeId === intakeId/);
  assert.match(declarations.get("openWorkIntakeForWorkflow"), /setShellView\("work-intake"\)/);
  assert.match(source, /onStartWorkIntake=\{\(\) => void openWorkIntake\(\)\}/);
  assert.match(source, /onOpenWorkflow=\{workflowId => void openCurrentWorkflow\(workflowId\)\}/);
  assert.match(source, /setSelectedWorkflowId\(routing\.workflowId\)/);
  assert.doesNotMatch(declarations.get("startDirectWorkflow"), /startWorkIntake|createWorkIntake|submitWorkIntake/);
});

test("non-source Current Project Hub omits Source Control", () => {
  const markup = renderToStaticMarkup(React.createElement(WorkflowHubWorkspace, {
    onOpenSourceControl: () => undefined, onOpenWorkflow: () => undefined, onStartWorkflow: async () => undefined,
    onStartWorkIntake: () => undefined, inventory: { groups: [] }, selectedWorkflowId: null, loading: false, error: "",
    projectName: "Notes Project", sourceControlAvailable: false,
    workspace: { ok: true, workspaceRoot: "<PROJECT_REPO>" },
  }));
  assert.doesNotMatch(markup, /Source Control|View source graph/);
  assert.match(markup, /\+ New Issue/);
});

test("Workflow IPC accepts exact bounded arguments and binds calls to the main-selected project", async () => {
  const { registerWorkflowApplicationIpc } = require("../../dist/main/workflow/workflowApplicationIpc.js");
  const handlers = new Map();
  const calls = [];
  const service = {
    listCurrentProjectWorkflows: async root => { calls.push(["list", root]); return { groups: [] }; },
    startDirectWorkflow: async (root, request) => { calls.push(["start", root, request]); return { workflow: { workflowId: "wf-1" } }; },
    getCurrentProjectWorkflow: async (root, id) => { calls.push(["get", root, id]); return { workflow: { workflowId: id } }; },
  };
  registerWorkflowApplicationIpc({ handle: (channel, handler) => handlers.set(channel, handler) }, () => "<PROJECT_REPO>", service);
  assert.deepEqual(await handlers.get("workflow:list")({},), { groups: [] });
  await assert.rejects(handlers.get("workflow:list")({}, "renderer-root"), /does not accept renderer arguments/);
  assert.deepEqual(await handlers.get("workflow:start")({}, { workflowType: "feature-capability", title: "A feature" }), { workflow: { workflowId: "wf-1" } });
  await assert.rejects(handlers.get("workflow:start")({}, { workflowType: "feature-capability", title: "A", projectRoot: "elsewhere" }), /only Workflow type and title/);
  assert.deepEqual(await handlers.get("workflow:get")({}, "exact-workflow-id"), { workflow: { workflowId: "exact-workflow-id" } });
  await assert.rejects(handlers.get("workflow:get")({}, "   "), /Exact Workflow ID/);
  assert.deepEqual(calls, [
    ["list", "<PROJECT_REPO>"], ["start", "<PROJECT_REPO>", { workflowType: "feature-capability", title: "A feature" }],
    ["get", "<PROJECT_REPO>", "exact-workflow-id"],
  ]);
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
  // Select declarations structurally; whitespace and neighboring function order are irrelevant.
  const ts = require("typescript");
  const ast = ts.createSourceFile("App.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declarations = new Map();
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name) declarations.set(node.name.text, node);
    ts.forEachChild(node, visit);
  }
  visit(ast);
  function handler(name) {
    assert.ok(declarations.has(name), "Missing production handler: " + name);
    return declarations.get(name).getText(ast);
  }
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
