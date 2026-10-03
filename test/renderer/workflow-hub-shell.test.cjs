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
const { acceptExistingProjectAdoption, openInspectedExistingProject } = loader.loadRendererSourceModule("src/renderer/app/existingProjectEntryController.ts");
const { WorkflowHubWorkspace } = loader.loadRendererSourceModule("src/renderer/app/WorkflowHubWorkspace.tsx");
const { WorkflowTypeWorkspace } = loader.loadRendererSourceModule("src/renderer/app/WorkflowTypeWorkspace.tsx");
const { WorkflowInstanceWorkspace } = loader.loadRendererSourceModule("src/renderer/app/WorkflowInstanceWorkspace.tsx");
const { WorkflowExecutionWorkspace } = loader.loadRendererSourceModule("src/renderer/app/WorkflowExecutionWorkspace.tsx");
const { CodexBoundedUserInputPanel, CodexBoundedMcpElicitationPanel } = loader.loadRendererSourceModule("src/renderer/app/CodexBoundedInteractionPanels.tsx");

test("human execution actions expose outcomes and cannot submit derived identity", () => {
  const source = fs.readFileSync(path.join(__dirname, "../../src/renderer/app/WorkflowExecutionWorkspace.tsx"), "utf8");
  assert.match(source, /value=\{humanVisualOutcome\}/);
  assert.match(source, /outcome: humanVisualOutcome/);
  assert.doesNotMatch(source, /implementationRecordId:\s*latest\.id/);
  assert.doesNotMatch(source, /sourceRevisionId:\s*(?:validation|review)\.sourceRevisionId/);
  assert.doesNotMatch(source, /testerResultId:\s*tester\./);
  assert.match(source, /Create Phase Repair/);
  assert.match(source, /createWorkflowPhaseRepair\(workflow\.workflowId, phase\.phaseId/);
});
const { workflowPlanningSurface, shouldShowClosedWorkIntakeSummary } = loader.loadRendererSourceModule("src/renderer/app/workflowPlanningDispatch.ts");
const { StructuredWorkflowWorkspace } = loader.loadRendererSourceModule("src/renderer/app/StructuredWorkflowWorkspace.tsx");
const { WorkflowPlanningMap } = loader.loadRendererSourceModule("src/renderer/app/WorkflowPlanningMap.tsx");
const { WORKFLOW_TYPE_REGISTRY } = loader.loadRendererSourceModule("src/shared/projectState/workflowTypeRegistry.ts");

const repoRoot = path.join(__dirname, "..", "..");

test("exact planning dispatch follows supported type and persisted currentWorkspace", () => {
  for (const currentWorkspace of ["feature-assessment", "feature-planning"])
    assert.equal(workflowPlanningSurface({ workflowType: "feature-capability", lifecycleState: "active", currentWorkspace }), "feature");
  for (const currentWorkspace of ["issue-rca", "issue-planning"])
    assert.equal(workflowPlanningSurface({ workflowType: "issue-resolution", lifecycleState: "active", currentWorkspace }), "issue");
  for (const currentWorkspace of ["work-item-map", "execution-complete", "integration-ready"])
    assert.equal(workflowPlanningSurface({ workflowType: "feature-capability", lifecycleState: "active", currentWorkspace }), "execution");
  assert.equal(workflowPlanningSurface({ workflowType: "issue-resolution", lifecycleState: "active", currentWorkspace: "work-item-map" }), "execution");
  assert.equal(workflowPlanningSurface({ workflowType: "issue-resolution", lifecycleState: "active", currentWorkspace: "feature-planning" }), "generic");
  assert.equal(workflowPlanningSurface({ workflowType: "refactor-migration", lifecycleState: "active", currentWorkspace: "feature-planning" }), "generic");
  for (const workflowType of ["refactor-migration", "integration-composition", "infrastructure-platform", "research-prototype"])
    assert.equal(workflowPlanningSurface({ workflowType, lifecycleState: "active", currentWorkspace: "planning" }), "planning");
  assert.equal(workflowPlanningSurface({ workflowType: "feature-capability", lifecycleState: "closed", currentWorkspace: "work-item-map" }), "generic");
  assert.equal(shouldShowClosedWorkIntakeSummary({ workflowType: "work-intake-routing", lifecycleState: "closed", currentWorkspace: "work-intake" }), true);
  assert.equal(shouldShowClosedWorkIntakeSummary({ workflowType: "work-intake-routing", lifecycleState: "active", currentWorkspace: "work-intake" }), false);
});

test("shared execution Workspace is the six exact post-plan surfaces with return navigation", () => {
  for (const workflowType of Object.keys(WORKFLOW_TYPE_REGISTRY).filter(type => !["project-creation","work-intake-routing"].includes(type))) {
    const markup = renderToStaticMarkup(React.createElement(WorkflowExecutionWorkspace, { workflow: {
      workflowId: `${workflowType}-exact-id`, workflowType, title: "Same-title concurrent Workflow", lifecycleState: "active",
      currentWorkspace: "work-item-map", workflowState: "active", lineageId: `${workflowType}-lineage`, createdAt: "now", updatedAt: "now",
    }, onReturn() {}, browserPanel: React.createElement("div", null, "Architect browser") }));
    assert.match(markup, /Shared Execution Workspace/);
    assert.match(markup, new RegExp(`${workflowType}-exact-id`));
    assert.match(markup, /Back to Workflows/);
    assert.match(markup, /Work Item Map and readiness/);
    assert.match(markup, /Embedded Architect/);
  }
});

test("shared execution Workspace binds pending Implementer and Tester interactions to exact execution identities", () => {
  const fs = require("node:fs");
  const source = fs.readFileSync(require("node:path").resolve(__dirname, "../../src/renderer/app/WorkflowExecutionWorkspace.tsx"), "utf8");
  const shell = fs.readFileSync(path.join(repoRoot, "src/renderer/app/ExecutionShell.tsx"), "utf8");
  assert.match(shell, /approval request/);
  assert.match(shell, /CodexBoundedUserInputPanel/);
  assert.match(shell, /CodexBoundedMcpElicitationPanel/);
  assert.doesNotMatch(shell, /window\.champcity|JSON\.parse/);
  assert.match(source, /respondToCodexApproval\(\{[^}]*workflowId: workflow\.workflowId, workItemId: item\.record\.id/s);
  assert.match(source, /respondToCodexUserInput\(\{[^}]*workflowId: workflow\.workflowId, workItemId: item\.record\.id/s);
  assert.match(source, /respondToCodexMcpElicitation\(\{[^}]*workflowId: workflow\.workflowId, workItemId: item\.record\.id/s);
  assert.match(source, /cancelCodexImplementerExecution\(\{ workflowId: workflow\.workflowId, workItemId: item\.record\.id \}/);
  assert.match(source, /respondToWorkflowWorkItemTesterApproval\(workflow\.workflowId, item\.record\.id, latest\.id/);
  assert.match(source, /respondToWorkflowWorkItemTesterInput\(workflow\.workflowId, item\.record\.id, latest\.id/);
  assert.match(source, /cancelWorkflowWorkItemTester\(workflow\.workflowId, item\.record\.id, latest\.id/);
  assert.match(source, /WorkItemPlanningWorkspace/);
  const planning=fs.readFileSync(path.join(repoRoot,"src/renderer/app/WorkItemPlanningWorkspace.tsx"),"utf8");
  assert.match(planning,/saveStructuredWorkItemPlanning/);
  assert.match(planning,/decomposeStructuredWorkItemPlanning/);
  assert.doesNotMatch(planning,/JSON\.parse/);
  assert.match(source, /Execution could not start\./);
  assert.match(source, /item\.record\.body\.implementationBoundaries\?\.length/);
  assert.doesNotMatch(source, /runtime\?\.busy/);
  assert.match(source, /respondToCodexMcpElicitation\(\{[^}]*requestId, action, content, workflowId: workflow\.workflowId, workItemId: item\.record\.id/s);
  assert.match(source, /getWorkflowWorkItemTesterStatus\(workflow\.workflowId, selected\.record\.id, selected\.implementationAttempts\.at\(-1\)!\.id\)/);
  const pending = { requestId: "request-exact", threadId: "thread", turnId: "turn", itemId: "item", questions: [
    { id: "choice-id", header: "Choice", question: "Pick one", options: [{ label: "A", description: "First" }] },
    { id: "free-id", header: "Details", question: "Describe it", options: [] },
  ] };
  const inputMarkup = renderToStaticMarkup(React.createElement(CodexBoundedUserInputPanel, { pending, label: "Implementer", onSubmit() {} }));
  assert.match(inputMarkup, /<select/);
  assert.match(inputMarkup, /aria-label="Details"/);
  assert.match(inputMarkup, /<input/);
  const elicitation = { requestId: "mcp-exact", threadId: "thread", turnId: "turn", serverName: "fixture", mode: "form", message: "Provide values", responseSupported: true,
    unsupportedReason: null, elicitationId: null, url: null, requestedSchemaSummary: "Two fields", fields: [
      { id: "region", title: "Region", description: "Select", type: "string", required: true, options: [{ value: "east", label: "East" }] },
      { id: "notes", title: "Notes", description: "Explain", type: "string", required: false, options: [] },
    ] };
  const mcpMarkup = renderToStaticMarkup(React.createElement(CodexBoundedMcpElicitationPanel, { pending: elicitation, onSubmit() {} }));
  assert.match(mcpMarkup, /aria-label="Region"/);
  assert.match(mcpMarkup, /aria-label="Notes"/);
  assert.doesNotMatch(mcpMarkup, /Content JSON|textarea/);
  const unsupported = renderToStaticMarkup(React.createElement(CodexBoundedMcpElicitationPanel, { pending: { ...elicitation, responseSupported: false, unsupportedReason: "Unsupported schema" }, onSubmit() {} }));
  assert.match(unsupported, /Unsupported schema/);
  assert.doesNotMatch(unsupported, /Send elicitation response|Decline elicitation|Cancel elicitation/);
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

test("landing conversion warning renders only the material consequence with Accept and Cancel actions", () => {
  const markup = renderToStaticMarkup(React.createElement(LandingWorkspace, {
    feedback: "",
    isChoosing: false,
    migrationPlan: {
      planId: "a".repeat(64), state: "conversion-required", repositoryId: "project-source", priorGitDetected: true,
      topology: { conventionalGit: true, managedMetadata: false, mainCheckout: false, devCheckout: false, recoveryStaging: false },
      preservedRefCount: 7, preservedRemoteCount: 1, requiresConsent: true, warnings: [], failureReason: null,
    },
    onAcceptMigration: () => undefined,
    onCancelMigration: () => undefined,
    onOpenExistingProject: () => undefined,
    onStartNewProject: () => undefined,
  }));
  assert.match(markup, /Git conversion required/);
  assert.match(markup, /Convert this project for ChampCity source control\?/);
  assert.match(markup, /may change or damage the project&#x27;s existing Git branch, worktree, and repository configuration/);
  assert.match(markup, /preserve the current project files and will retain readable Git history where possible/);
  assert.match(markup, /Accept and Convert/);
  assert.match(markup, />Cancel</);
  assert.doesNotMatch(markup, /feature\/current|staged|unstaged|untracked|repair|detached|conflict/);
  assert.doesNotMatch(markup, /C:\\|\/Users\//);
});

test("Existing Project entry controller applies before one registration and gates consent", async () => {
  const calls = [];
  const project = { projectId: "project", projectName: "Project", repositoryId: "source", projectRoot: "opaque", mode: "existing", created: true };
  const api = {
    applyExistingProjectGitAdoption: async planId => { calls.push(["apply", planId]); return { sourceApplied: false }; },
    registerCurrentProject: async mode => { calls.push(["register", mode]); return project; },
  };
  const automatic = { planId: "b".repeat(64), state: "managed-ready", requiresConsent: false };
  assert.deepEqual(await openInspectedExistingProject(api, automatic), { kind: "ready", project });
  assert.deepEqual(calls, [["apply", automatic.planId], ["register", "existing"]]);
  calls.length = 0;
  const consent = { ...automatic, state: "conversion-required", requiresConsent: true };
  assert.deepEqual(await openInspectedExistingProject(api, consent), { kind: "consent-required", plan: consent });
  assert.deepEqual(calls, []);
  await acceptExistingProjectAdoption(api, consent);
  assert.deepEqual(calls, [["apply", consent.planId], ["register", "existing"]]);
});

test("Feature and Issue route through one exact Structured Workflow planning shell", () => {
  for (const [workflowType, currentWorkspace, workflowId] of [
    ["feature-capability", "feature-assessment", "feature-exact-123"],
    ["issue-resolution", "issue-rca", "issue-exact-987"],
  ]) {
    const workflow = { workflowId, lineageId: "lineage", workflowType, title: "Exact Workflow", workflowState: "active", lifecycleState: "active", currentWorkspace, createdAt: "now", updatedAt: "now" };
    const tree = progressionRender(StructuredWorkflowWorkspace,{workflow, repositoryIdentity: "", onReturn: () => undefined, onOpen: () => undefined, browserPanel: React.createElement("div", null, "Architect browser")},[null]);
    const element = progressionFind(tree,node=>node.type?.name === "ExactWorkflowPlanningWorkspace");
    assert.equal(element.type.name, "ExactWorkflowPlanningWorkspace");
    assert.equal(element.props.workflow.workflowId, workflowId);
    assert.equal(element.props.browserPanel.props.children, "Architect browser");
  }
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

test("Selected-project Hub is an eight-card stable launcher with canonical order and purpose", () => {
  const instance = (workflowId, workflowType, title, lifecycleState = "active") => ({
    workflowId, workflowType, title, lineageId: `lineage-${workflowId}`, workflowState: lifecycleState === "closed" ? "closed" : "intake",
    lifecycleState, currentWorkspace: "feature-intake", createdAt: "2026-01-01", updatedAt: "2026-01-01",
  });
  const markup = renderToStaticMarkup(React.createElement(WorkflowHubWorkspace, {
    onOpenSourceControl: () => undefined,
    onSelectType: () => undefined,
    onOpenGreenfield: () => undefined,
    projectName: "ChampCity_AI",
    sourceControlAvailable: true,
    inventory: { groups: [
      { workflowType: "feature-capability", workflows: [instance("feature-1111", "feature-capability", "Improve onboarding"), instance("feature-2222", "feature-capability", "Add dashboard", "closed")] },
      { workflowType: "issue-resolution", workflows: Array.from({ length: 50 }, (_, index) => instance(`issue-${index}`, "issue-resolution", `Issue ${index}`)) },
      { workflowType: "work-intake-routing", workflows: [instance("wir-1111", "work-intake-routing", "Route request")] },
    ] }, loading: false, error: "",
    workspace: { ok: true, workspaceRoot: "<PROJECT_REPO>" },
  }));

  assert.match(markup, /<h1 id="workspace-heading">Workflows<\/h1>/);
  const order = [...markup.matchAll(/id="workflow-card-([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(order, ["work-intake-routing", "project-creation", "feature-capability", "refactor-migration",
    "integration-composition", "issue-resolution", "infrastructure-platform", "research-prototype"]);
  for (const definition of Object.values(WORKFLOW_TYPE_REGISTRY)) {
    assert.ok(markup.includes(definition.purpose), `purpose for ${definition.workflowType}`);
  }
  assert.equal((markup.match(/class="workflow-launcher-card/g) ?? []).length, 8);
  assert.match(markup, /Open Work Intake Routing/);
  assert.match(markup, /Open Feature \/ Capability/);
  assert.match(markup, /Not applicable to this existing or migrated project/);
  assert.doesNotMatch(markup, /Workflow title|workflow-instance-list|Improve onboarding|Add dashboard|Issue 49|Route request|Start New/);
  assert.match(markup, /Source Control/);
});

test("Greenfield card stays enabled for completed and reopened Project Creation history", () => {
  const instance = { workflowId: "project-create-1", workflowType: "project-creation", title: "New product",
    lineageId: "lineage-project-create-1", workflowState: "closed", lifecycleState: "closed", currentWorkspace: "project-intake",
    createdAt: "2026-01-01", updatedAt: "2026-01-01" };
  const markup = renderToStaticMarkup(React.createElement(WorkflowHubWorkspace, {
    onOpenSourceControl: () => undefined, onSelectType: () => undefined, onOpenGreenfield: () => undefined,
    projectName: "New product", sourceControlAvailable: true,
    inventory: { groups: [{ workflowType: "project-creation", workflows: [instance] }] },
    loading: false, error: "", workspace: { ok: true, workspaceRoot: "<PROJECT_REPO>" },
  }));
  assert.match(markup, /Greenfield Project/);
  assert.match(markup, /Completed/);
  assert.match(markup, /View Greenfield Project/);
  assert.doesNotMatch(markup, /workflow-instance-list|Start New|Unavailable/);
});

test("Hub card actions navigate by type or exact Greenfield identity without starting Workflows", () => {
  const selected = [];
  const greenfield = [];
  const workflow = { workflowId: "greenfield-exact-id", workflowType: "project-creation", title: "Origin",
    lineageId: "lineage", workflowState: "intake", lifecycleState: "active", currentWorkspace: "project-intake",
    createdAt: "now", updatedAt: "now" };
  const element = WorkflowHubWorkspace({
    onSelectType: type => selected.push(type), onOpenGreenfield: id => greenfield.push(id),
    onOpenSourceControl() {}, projectName: "Reopened", sourceControlAvailable: false,
    inventory: { groups: [{ workflowType: "project-creation", workflows: [workflow] }] },
    loading: false, error: "", workspace: { ok: true, workspaceRoot: "<PROJECT_REPO>" },
  });
  function buttons(node) {
    if (Array.isArray(node)) return node.flatMap(buttons);
    if (!React.isValidElement(node)) return [];
    return [...(node.type === "button" ? [node] : []), ...buttons(node.props.children)];
  }
  const actions = buttons(element);
  const label = button => String(button.props.children);
  actions.find(button => label(button) === "Open Feature / Capability").props.onClick();
  actions.find(button => label(button) === "Open Work Intake Routing").props.onClick();
  actions.find(button => label(button) === "View Greenfield Project").props.onClick();
  assert.deepEqual(selected, ["feature-capability", "work-intake-routing"]);
  assert.deepEqual(greenfield, ["greenfield-exact-id"]);
  assert.equal(actions.length, 8);
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
  assert.match(declarations.get("startWorkflow"), /startWorkflow\(request\)/);
  assert.match(declarations.get("startWorkflow"), /getWorkflow\(created\.workflow\.workflowId\)/);
  assert.match(declarations.get("startWorkflow"), /setWorkflowId\(opened\.workflow\.workflowId\)/);
  assert.match(declarations.get("openWorkflow"), /getWorkflow\(id\)/);
  assert.match(declarations.get("openWorkflow"), /workflowType === "project-creation"/);
  assert.match(declarations.get("activateProject"), /projectCreationWorkflowId/);
  assert.match(declarations.get("activateProject"), /setWorkflowId\(id\)/);
  assert.match(declarations.get("openWorkflow"), /openWorkIntakeForWorkflow\(opened\.workflow\.workIntakeId, opened\.workflow\.workflowId\)/);
  assert.match(declarations.get("openWorkIntakeForWorkflow"), /workflowType !== "work-intake-routing" \|\| opened\.workflow\.workIntakeId !== intakeId/);
  assert.doesNotMatch(source, /selectStructuredWorkflowAuthority/);
  assert.match(declarations.get("openWorkIntakeForWorkflow"), /setView\("work-intake"\)/);
  assert.match(source, /onSelectType=\{type => \{ setWorkflowType\(type\)/);
  assert.match(source, /onOpenGreenfield=\{id => void openWorkflow\(id\)\}/);
  assert.match(source, /onOpenWorkflow=\{id => void openWorkflow\(id\)\}/);
  assert.match(source, /onStartWorkIntake=\{\(\) => void openWorkIntake\(\)\}/);
  assert.match(declarations.get("returnToWorkflowType"), /setView\(workflowType \? "workflow-type" : "workflow-hub"\)/);
  assert.match(source, /onReturn=\{returnToWorkflowType\}/);
  assert.match(declarations.get("openWorkIntakeForWorkflow"), /setWorkflowId\(routingWorkflowId\)/);
  assert.doesNotMatch(declarations.get("startWorkflow"), /startWorkIntake|createWorkIntake|submitWorkIntake/);
});

test("non-source Current Project Hub omits Source Control", () => {
  const markup = renderToStaticMarkup(React.createElement(WorkflowHubWorkspace, {
    onOpenSourceControl: () => undefined, onSelectType: () => undefined, onOpenGreenfield: () => undefined,
    inventory: { groups: [] }, loading: false, error: "",
    projectName: "Notes Project", sourceControlAvailable: false,
    workspace: { ok: true, workspaceRoot: "<PROJECT_REPO>" },
  }));
  assert.doesNotMatch(markup, /Source Control|View source graph/);
  assert.match(markup, /Open Issue Resolution/);
  assert.match(markup, /Not applicable to this existing or migrated project/);
});

test("reusable workflow-type surface owns exact inventory and creation entry for all repeatable types", () => {
  const substantive = Object.values(WORKFLOW_TYPE_REGISTRY).filter(definition => definition.directStart);
  for (const definition of substantive) {
    const workflow = { workflowId: `${definition.workflowType}-exact`, workflowType: definition.workflowType,
      title: `Existing ${definition.label}`, workflowState: "intake", lifecycleState: "active",
      currentWorkspace: definition.entryWorkspace, lineageId: "lineage", createdAt: "now", updatedAt: "now" };
    const markup = renderToStaticMarkup(React.createElement(WorkflowTypeWorkspace, {
      workflowType: definition.workflowType, workflows: [workflow], loading: false, error: "",
      onOpenWorkflow() {}, onStartWorkflow: async () => undefined, onStartWorkIntake() {}, onReturn() {},
    }));
    assert.match(markup, /Start New/);
    assert.ok(markup.includes(workflow.title));
    assert.ok(markup.includes(`${definition.workflowType}-exact`.slice(0, 8)));
    assert.match(markup, /Back to Workflows/);
    assert.ok(markup.includes(definition.purpose));
  }
  const wir = renderToStaticMarkup(React.createElement(WorkflowTypeWorkspace, {
    workflowType: "work-intake-routing", workflows: [], loading: false, error: "",
    onOpenWorkflow() {}, onStartWorkflow: async () => undefined, onStartWorkIntake() {}, onReturn() {},
  }));
  assert.match(wir, /Start New Work Intake/);
  assert.doesNotMatch(wir, /Workflow title|<form/);
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

test("Hub sidebar has no legacy Development lifecycle fields", () => {
  const hubMarkup = renderToStaticMarkup(React.createElement(FigmaSidebar, {
    activeWorkspaceId: "work-card-report-review",
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
  assert.match(hubMarkup, /ChampCity_AI/);
  assert.match(hubMarkup, /Change Project/);
  assert.match(hubMarkup, /Clear Project/);
  assert.doesNotMatch(hubMarkup, /Current Phase|Current Work Card|phase-00|WC01|Workflows/);
  assert.doesNotMatch(hubMarkup, /Current Phase|Current Work Card|phase-00|WC01/);
});

test("all six intake entry workspaces share ordered fields and generated Markdown review", () => {
  const { WorkflowIntakeWorkspace } = loader.loadRendererSourceModule("src/renderer/app/WorkflowIntakeWorkspace.tsx");
  const { WORKFLOW_INTAKE_DEFINITIONS } = loader.loadRendererSourceModule("src/shared/workflowIntakeContracts.ts");
  for (const [workflowType, definition] of Object.entries(WORKFLOW_INTAKE_DEFINITIONS).filter(([type]) => type !== "project-creation")) {
    const workflow = { workflowId: "private-exact-id", workflowType, lifecycleState: "active", currentWorkspace: WORKFLOW_TYPE_REGISTRY[workflowType].entryWorkspace };
    assert.equal(workflowPlanningSurface(workflow), "intake");
    assert.notEqual(workflowPlanningSurface({ ...workflow, currentWorkspace: "unrelated-intake" }), "intake");
    assert.equal(workflowPlanningSurface({ ...workflow, lifecycleState: "closed" }), "generic");
    const markup = renderToStaticMarkup(React.createElement(WorkflowIntakeWorkspace, { workflow, onReturn() {}, onPrepared() {}, browserPanel: React.createElement("div", null, "Embedded Architect companion") }));
    assert.match(markup, /intake-workspace-shell/);
    assert.match(markup, /Back to Workflows/); assert.match(markup, /Save Intake/); assert.doesNotMatch(markup, /Embedded Architect companion/); assert.match(markup, /No document yet/);
    assert.doesNotMatch(markup, /private-exact-id|SourceBaseline/);
    let previous = -1;
    for (const field of definition.fields) {
      const escaped = field.label.replaceAll("&", "&amp;");
      const index = markup.indexOf(escaped); assert.ok(index > previous); previous = index;
      assert.ok(markup.includes(`<span>${escaped}${field.required ? " *" : ""}</span>`));
    }
  }
});
const { WorkflowStageRail } = loader.loadRendererSourceModule("src/renderer/app/WorkflowStageRail.tsx");
const { deriveWorkflowStageRailModel } = loader.loadRendererSourceModule("src/renderer/app/workflowStageRailModel.ts");

test("six exact substantive Intake rails share seven stages with independent inspection availability", () => {
  const substantive = Object.values(WORKFLOW_TYPE_REGISTRY).filter(d => d.directStart);
  assert.equal(substantive.length, 6);
  for (const definition of substantive) {
    const stages = deriveWorkflowStageRailModel({ workflowType: definition.workflowType, currentWorkspace: definition.entryWorkspace });
    assert.deepEqual(stages.map(s => s.id), ["intake", "assessment", "planning", "topology", "execution", "validation", "close"]);
    assert.deepEqual(stages.map(s => s.statusLabel), ["Open", ...Array(6).fill("Not Ready")]);
    assert.equal(stages[0].state, "exact");
    assert.equal(stages[0].enabled, true);
    assert.equal(stages[0].isRequired, true);
    assert.equal(stages[1].label, definition.workflowType === "issue-resolution" ? "Root Cause Analysis" : "Architect Assessment");
    assert.equal(stages[2].label, definition.workflowType === "issue-resolution" ? "Correction Planning" : "Planning");
    for (const stage of stages.slice(1)) {
      assert.equal(stage.state, "available");
      assert.equal(stage.enabled, true);
      assert.equal(typeof stage.onClick, "function");
      assert.equal(stage.isRequired, false);
    }
    const markup = renderToStaticMarkup(React.createElement(WorkflowStageRail, { stages, ariaLabel: "Workflow pipeline" }));
    assert.equal((markup.match(/class="figma-pipeline-stage"/g) || []).length, 7);
    assert.equal((markup.match(/figma-stage-connector /g) || []).length, 12);
    assert.equal((markup.match(/disabled=""/g) || []).length, 0);
    assert.equal((markup.match(/aria-current="page"/g) || []).length, 1);
    assert.match(markup, /01 Intake: Open\. Current required step\. Inspected stage\. Inspect workflow step\./);
    assert.match(markup, /figma-pipeline-step active required in-progress/);
    assert.match(markup, /07 Close: Not Ready\. Inspect workflow step\./);
    assert.equal(deriveWorkflowStageRailModel({ workflowType: definition.workflowType, currentWorkspace: "feature-intake-extra" }), null);
    for (const other of substantive.filter(d => d !== definition))
      assert.equal(deriveWorkflowStageRailModel({ workflowType: definition.workflowType, currentWorkspace: other.entryWorkspace }), null);
  }
  for (const workflowType of ["project-creation", "work-intake-routing", "unknown"])
    assert.equal(deriveWorkflowStageRailModel({ workflowType, currentWorkspace: "feature-intake" }), null);
  assert.equal(deriveWorkflowStageRailModel(null), null);
});

test("Project Creation selection is SQL-driven and does not use the Markdown Work Card Map", () => {
  const source = fs.readFileSync(path.join(repoRoot, "src/renderer/app/GreenfieldWorkspace.tsx"), "utf8");
  assert.match(source, /getGreenfieldNavigation\(workflow\.workflowId\)/);
  assert.match(source, /<WorkflowExecutionWorkspace workflow=\{workflow\}/);
  assert.match(source, /onProjectionChanged=\{refresh\}/);
  assert.doesNotMatch(source, /getStructuredPhaseWorkIntake|prepareStructuredPhaseWorkItem|work-card-intake/);
  const {selectExecutionWorkItem}=loader.loadRendererSourceModule("src/renderer/app/WorkflowExecutionWorkspace.tsx");
  for (const workflowType of ["project-creation","feature-capability","issue-resolution","refactor-migration","integration-composition","infrastructure-platform","research-prototype"]) {
    const item=(id,blockers,workState="planned")=>({record:{id,body:{workState}},eligibility:{eligible:!blockers.length,blockers}});
    const blocked=item("a-dependent",["dependency:z-first","work-item-contract-review-required"]),first=item("z-first",["work-item-contract-review-required"]),later=item("b-later-phase",["prior-phase:phase-1","work-item-contract-review-required"]);
    assert.equal(selectExecutionWorkItem([blocked,later,first],"").record.id,"z-first",workflowType);
    assert.equal(selectExecutionWorkItem([blocked,later,first],"a-dependent").record.id,"a-dependent");
    assert.equal(selectExecutionWorkItem([blocked,first,item("ready",[])],"").record.id,"ready");
    assert.equal(selectExecutionWorkItem([item("closed",[],"closed"),first],"").record.id,"z-first");
  }
  assert.doesNotMatch(source, /getWorkCardMapProjection|WorkCardMapWorkspace/);
  const app = fs.readFileSync(path.join(repoRoot, "src/renderer/app/App.tsx"), "utf8");
  assert.match(app, /<StructuredWorkflowWorkspace/);
  assert.doesNotMatch(app, /<NestedWorkflowRail|<WorkCardMapWorkspace/);
});

test("structured Intake renderer actions show SQL review, exact approval and unsaved/revised continuation gates", async () => {
  const {loadProductionFunctions} = require("../support/production-execution.cjs");
  const {WorkflowIntakeReviewCard, WorkflowIntakeDisposition} = loader.loadRendererSourceModule("src/renderer/app/WorkflowIntakeReview.tsx");
  for (const workflowType of ["project-creation", "refactor-migration", "feature-capability"]) {
    const slots = [], effects = [], calls = []; let cursor = 0;
    const slot = initial => {const index = cursor++; return slots[index] ??= {value: initial};};
    let sqlModel = {workflowType, values: {request: "Committed SQL content"}, intakeId: "intake", recordVersion: 1, disposition: {state: "approved"},
      reviewDocument: {logicalDocumentId: "intake", markdownPath: `planning/workflows/exact/Intake/WORKFLOW_INTAKE_${workflowType}.md`, displayFilename: "Generated Intake.md", metadata: {artifactType: "generated-workflow-intake"}, initializationNeeded: false, effectiveDisposition: "Approved", bodyMarkdown: "# Committed SQL content"}};
    const api = {
      async getWorkflowIntake(id) {calls.push(["get",id]); return sqlModel;},
      async saveWorkflowIntake(id,payload,version) {calls.push(["save",id,payload,version]); assert.equal(version,sqlModel.recordVersion);
        sqlModel = {...sqlModel, values: payload.values, recordVersion: version+1, disposition: {state: "none"}, reviewDocument: {...sqlModel.reviewDocument, effectiveDisposition: "Pending", bodyMarkdown: "# Revised SQL content"}}; return sqlModel;},
      async reviewWorkflowIntake(id,input) {calls.push(["review",id,input]); assert.equal(input.expectedIntakeRecordVersion,sqlModel.recordVersion);
        sqlModel = {...sqlModel, disposition: {state: input.outcome}, reviewDocument: {...sqlModel.reviewDocument, effectiveDisposition: "Approved"}}; return sqlModel;},
    };
    const {useWorkflowIntake} = loadProductionFunctions("src/renderer/app/useWorkflowIntake.ts", ["useWorkflowIntake"], {
      exports: {}, window: {champcity: api},
      useState(initial) {const entry=slot(initial); return [entry.value,next=>{entry.value=typeof next === "function" ? next(entry.value) : next;}];},
      useRef(initial) {return slot({current:initial}).value;},
      useEffect(effect,deps) {const entry=slot(null); if (!entry.value || entry.value.some((value,index)=>value!==deps[index])) {entry.value=deps; effects.push(effect);}},
    });
    const render = () => {cursor=0; const state=useWorkflowIntake("exact"); for (const effect of effects.splice(0)) effect(); return state;};
    let state=render();
    assert.match(renderToStaticMarkup(React.createElement(WorkflowIntakeReviewCard,{state})), /No document yet/);
    await Promise.resolve(); state=render(); assert.equal(state.approved,true);
    const approved=renderToStaticMarkup(React.createElement(WorkflowIntakeReviewCard,{state}));
    assert.match(approved,/Committed SQL content|Approved|Generated Intake/);
    assert.equal((renderToStaticMarkup(React.createElement(WorkflowIntakeDisposition,{state})).match(/Document Disposition/g)||[]).length,1);
    state.markDirty(); state=render(); assert.equal(state.approved,false);
    assert.match(renderToStaticMarkup(React.createElement(WorkflowIntakeDisposition,{state})), /disabled=""/);
    await state.save({workflowType,values:{request:"Revised"}}); state=render();
    assert.equal(state.dirty,false); assert.equal(state.approved,false); assert.equal(state.model.recordVersion,2);
    assert.match(renderToStaticMarkup(React.createElement(WorkflowIntakeReviewCard,{state})), /Revised SQL content|Pending/);
    state.setStatus("Approved"); state.setNotes("Exact review"); state=render(); await state.review(); state=render();
    assert.equal(state.approved,true); assert.equal(calls.at(-1)[2].expectedIntakeRecordVersion,2);
    state.markDirty(); state=render(); assert.equal(state.approved,false);
  }
});

test("four remaining Architect stages route through the shared shell with a right browser companion", () => {
  const {StructuredArchitectWorkspace} = loader.loadRendererSourceModule("src/renderer/app/StructuredArchitectWorkspace.tsx");
  for (const [workflowType, currentWorkspace] of [["refactor-migration", "refactor-assessment"], ["integration-composition", "integration-assessment"], ["infrastructure-platform", "infrastructure-assessment"], ["research-prototype", "research-assessment"]]) {
    assert.equal(workflowPlanningSurface({workflowType, currentWorkspace, lifecycleState: "active"}), "architect");
    const html = renderToStaticMarkup(React.createElement(StructuredArchitectWorkspace, {workflowId: "exact-workflow", stageLabel: "Architect Assessment", browserVisible: true, browserCompanion: React.createElement("div", {id: "assessment-browser"}), onReturn: () => {}}));
    assert.match(html, /figma-doc-review-column/); assert.match(html, /figma-doc-chat-workspace/); assert.match(html, /assessment-browser/); assert.doesNotMatch(html, /Architect Workflow pipeline/);
    const shell=renderToStaticMarkup(React.createElement(StructuredWorkflowWorkspace,{workflow:{workflowId:"exact-workflow",workflowType,currentWorkspace,lifecycleState:"active"},onReturn(){},onOpen(){},repositoryIdentity:"",browserPanel:React.createElement("div",{id:"assessment-browser"})}));
    assert.match(shell,/Workflow pipeline/); assert.match(shell,/Not Ready/);
    for (const label of ["Work Item Map", "Execution", "Validation", "Close"]) assert.ok(shell.includes(label));
  }
});


test("Execution Shell preserves phased readiness, exact source identity and bounded recovery actions", () => {
  const {ExecutionWorkMapPanel,ExecutionCheckpointPanel,ExecutionInteractionsPanel}=loader.loadRendererSourceModule("src/renderer/app/ExecutionShell.tsx");
  const record=(id,body)=>({id,body}), calls=[];
  const plan={phases:[{phaseId:"phase-exact",sequence:1,record:record("phase-exact",{title:"Foundation",objective:"Acceptance boundary",phaseState:"active"})}],criteria:[],dependencyIds:[{from:"work-next",to:"work-exact"}]};
  const items=[{record:record("work-exact",{title:"Current outcome",objective:"Deliver exact scope",workState:"ready"}),phaseId:"phase-exact",eligibility:{eligible:true,blockers:[]}},{record:record("work-next",{title:"Next outcome",objective:"Wait for proof",workState:"ready"}),phaseId:"phase-exact",eligibility:{eligible:false,blockers:["dependency-not-closed"]}}];
  const projection={plan,items,activeWorkItemIds:[],source:{state:"prepared",baselineId:"baseline-exact",currentRevisionId:"revision-exact",workSourceLineId:"line-exact",repositoryCheckoutId:"checkout-exact"}};
  const markup=renderToStaticMarkup(React.createElement(ExecutionWorkMapPanel,{projection,selectedId:"work-exact",onSelect:id=>calls.push(id)}));
  for(const text of ["Foundation","Current outcome","Next outcome","dependency-not-closed","baseline-exact","revision-exact","line-exact","checkout-exact"]) assert.ok(markup.includes(text),text);
  const panel=ExecutionCheckpointPanel({projection:{sourceMode:"source-backed",implementation:{state:"failed",retryable:true,implementationRecordId:"implementation-exact"},tester:{state:"pending",retryable:false}},onRetryImplementation:id=>calls.push(id),onRetryTester:()=>assert.fail("Tester retry is unavailable")});
  function buttons(node){if(Array.isArray(node))return node.flatMap(buttons);if(!React.isValidElement(node))return [];return [...(node.type==="button"?[node]:[]),...buttons(node.props.children)];}
  const actions=buttons(panel);assert.equal(actions.length,1);actions[0].props.onClick();assert.deepEqual(calls,["implementation-exact"]);
  const neutral=renderToStaticMarkup(React.createElement(ExecutionCheckpointPanel,{projection:{sourceMode:"source-neutral"},onRetryImplementation(){},onRetryTester(){}}));assert.match(neutral,/not required/);assert.doesNotMatch(neutral,/<button/);
  const approval=ExecutionInteractionsPanel({role:"Tester",approval:{requestId:"approval-exact",impactSummary:"Bounded proof"},onApproval:(id,decision)=>calls.push([id,decision]),onInput(){}});
  buttons(approval)[0].props.onClick();assert.deepEqual(calls.at(-1),["approval-exact","approve"]);
});


test("SQL Review Validation shell shows exact evidence and leaves human actions with adapters", () => {
  const {ReviewValidationShell}=loader.loadRendererSourceModule("src/renderer/app/ReviewValidationShell.tsx"),review={workflowId:"workflow-exact",workItem:{id:"work-exact",recordVersion:4},implementations:[{id:"implementation-exact",body:{outcome:"implemented",summary:"Bounded result"}}],testers:[{id:"tester-exact",body:{implementationRecordId:"implementation-exact",recommendation:"reuse-existing-proof",rationale:"Independent review"}}],validations:[{id:"validation-exact",body:{targetEntityId:"criterion-exact",targetRecordVersion:2,validationMode:"semantic_ai",outcome:"pass"}}],decisions:[],evidence:[],checkpoints:[],repairs:[{repairId:"repair-exact",parentId:"work-exact"}],validation:{implementationRecordId:"implementation-exact",testerResultId:"tester-exact"},markdown:"Generated SQL report"};
  const markup=renderToStaticMarkup(React.createElement(ReviewValidationShell,{review},React.createElement("button",null,"Record exact visual evidence")));
  for(const identity of ["work-exact","implementation-exact","tester-exact","validation-exact","criterion-exact","repair-exact"])assert.ok(markup.includes(identity),identity);assert.match(markup,/Record exact visual evidence/);
  const shell=fs.readFileSync(path.join(repoRoot,"src/renderer/app/ReviewValidationShell.tsx"),"utf8");assert.doesNotMatch(shell,/window\.champcity|JSON\.parse|onClick/);
  const adapter=fs.readFileSync(path.join(repoRoot,"src/renderer/app/GreenfieldWorkspace.tsx"),"utf8");assert.match(adapter,/<WorkflowExecutionWorkspace workflow=\{workflow\}/);
  const app=fs.readFileSync(path.join(repoRoot,"src/renderer/app/App.tsx"),"utf8");
  assert.match(app,/<StructuredWorkflowWorkspace/);
  assert.doesNotMatch(app,/activeIssueStageId|IssueResolutionWorkspace|isStructuredGreenfieldExecution|GreenfieldExecutionWorkspace|StructuredPhaseMapWorkspace|StructuredPhaseLoopWorkspace|WorkItemPlanningWorkspace|CloseAdvanceWorkspace/);
  const router=fs.readFileSync(path.join(repoRoot,"src/renderer/app/StructuredWorkflowWorkspace.tsx"),"utf8");assert.match(router,/<GreenfieldWorkspace/);
});


test("Close Advance shell renders exact SQL eligibility and dispatches typed closure callbacks",()=>{
 const {CloseAdvanceShell}=loader.loadRendererSourceModule("src/renderer/app/CloseAdvanceShell.tsx"),calls=[];
 const projection={workflowId:"workflow-exact",entityId:"work-exact",expectedVersion:7,scope:"work-item",label:"WorkItem",closed:false,eligible:false,blockers:["tester-current-proof-required"],sourceMode:"source-neutral",next:{workspaceId:"phase-validation",entityId:"phase-exact",label:"Phase validation"},criteria:[]};
 const markup=renderToStaticMarkup(React.createElement(CloseAdvanceShell,{projection,rationale:"Current exact proof",onRationale(){},onClose(){},onKeepOpen(){},onNext(){}}));for(const text of ["work-exact","tester-current-proof-required","phase-exact"])assert.ok(markup.includes(text));assert.match(markup,/disabled/);
 const node=CloseAdvanceShell({projection:{...projection,eligible:true,blockers:[]},rationale:"Exact proof",onRationale(){},onClose:()=>calls.push("close"),onKeepOpen:()=>calls.push("keep"),onNext:()=>calls.push("next")});
 function buttons(node){if(Array.isArray(node))return node.flatMap(buttons);if(!React.isValidElement(node))return [];return [...(node.type==="button"?[node]:[]),...buttons(node.props.children)];}buttons(node)[0].props.onClick();assert.deepEqual(calls,["close"]);
 const source=fs.readFileSync(path.join(repoRoot,"src/renderer/app/CloseAdvanceShell.tsx"),"utf8");assert.doesNotMatch(source,/window.champcity|MarkdownPath|JSON.parse/);
});


function progressionRender(component, props, slots) {
  const originals = [React.useState, React.useEffect, React.useRef, React.useMemo];
  let index = 0;
  React.useState = initial => {const slot = index++; return [slot < slots.length ? slots[slot] : initial, value => {slots[slot] = typeof value === 'function' ? value(slots[slot]) : value;}];};
  React.useEffect = () => {};
  React.useMemo = factory => factory();
  React.useRef = initial => ({current: initial});
  try {return component(props);} finally {[React.useState, React.useEffect, React.useRef, React.useMemo] = originals;}
}
function progressionFind(element, predicate) {
  if (!element || typeof element !== 'object') return null;
  if (predicate(element)) return element;
  for (const value of Object.values(element.props ?? {})) {
    for (const child of Array.isArray(value) ? value : [value]) {
      const found = progressionFind(child, predicate);
      if (found) return found;
    }
  }
  return null;
}
test('six existing-project renderer pipelines await exact application re-resolution at Intake, Architect and Plan transitions', async () => {
  const previousWindow = global.window;
  const architectWorkspaces = {'feature-capability':'feature-assessment','issue-resolution':'issue-rca','refactor-migration':'refactor-assessment','integration-composition':'integration-assessment','infrastructure-platform':'infrastructure-assessment','research-prototype':'research-assessment'};
  try {
    for (const [workflowType, assessment] of Object.entries(architectWorkspaces)) for (const routed of [false,true]) {
      const id = `exact-${workflowType}`;
      let persisted = {workflowId:id,workflowType,lifecycleState:'active',currentWorkspace:WORKFLOW_TYPE_REGISTRY[workflowType].entryWorkspace,...(routed ? {routedSourceWorkflowId:'routing-exact'} : {})};
      let resolved = {...persisted};
      const reads = [];
      global.window = {champcity:{
        reviewWorkflowIntake: async actual => {assert.equal(actual,id); persisted = {...persisted,currentWorkspace:assessment}; return {disposition:{state:'approved'}};},
        reviewStructuredArchitectOutput: async actual => {assert.equal(actual,id); persisted = {...persisted,currentWorkspace:workflowType === 'feature-capability' ? 'feature-planning' : workflowType === 'issue-resolution' ? 'issue-planning' : 'planning'}; return {workflowId:id};},
        reviewExactWorkflowPlan: async actual => {assert.equal(actual,id); persisted = {...persisted,currentWorkspace:'work-item-map'}; return {acceptedPlan:{}};},
        getWorkflow: async actual => {assert.equal(actual,id); reads.push(actual); return {workflow:{...persisted}};},
      }};
      const appSlots = ['dark','workflow-instance',{ok:true,workspaceRoot:'fixture'},null,false,'',null,null,null,false,'',workflowType,id,resolved,null,null];
      const shell = () => {
        resolved = appSlots[13];
        const mounted = progressionFind(progressionRender(App,{},appSlots),node => node.type?.name === 'StructuredWorkflowWorkspace');
        assert.ok(mounted);
        return progressionFind(progressionRender(mounted.type,mounted.props,[null]),node=>['WorkflowIntakeWorkspace','ExactWorkflowPlanningWorkspace','WorkflowExecutionWorkspace'].includes(node.type?.name));
      };
      let child = shell();
      const intake = progressionRender(child.type, child.props, [{},{recordVersion:1,reviewDocument:{displayFilename:'Intake'},disposition:{state:'none'},values:{}},false,true,false,'','','Approved',false,'']);
      const disposition = progressionFind(intake,node => node.type?.name === 'WorkflowIntakeDisposition');
      await disposition.props.state.review();
      assert.equal(appSlots[13].currentWorkspace,assessment); assert.equal(reads.length,1);
      child = shell();
      const architect = progressionRender(child.type,child.props,[null,'',false,null,false]);
      const architectSurface = progressionRender(architect.type,architect.props,[{review:{cycleId:'cycle',recordVersion:1},reviewDocument:{logicalDocumentId:'review'},workflowType},'','','','',false,'architect-review']);
      const architectReview = progressionFind(architectSurface,node=>node.type?.name === 'ReviewDecisionPanel');
      assert.ok(architectReview);
      await architectReview.props.onReview({expectedRecordVersion:1,outcome:'approved'});
      assert.equal(reads.length,2);
      child = shell();
      const planningSlots = [{review:{cycleId:'cycle-exact',disposition:{state:'awaiting_review'}}},'',false,null,true];
      const planning = progressionRender(child.type,child.props,planningSlots);
      const review = progressionFind(planning,node => node.type?.name === 'PlanReviewShell');
      assert.ok(review);
      await review.props.onReview({outcome:'approved',expectedRecordVersion:1});
      assert.equal(reads.length,3);
      assert.equal(planningSlots[0].acceptedPlan,undefined,'accepted topology must leave Planning through the shell');
      assert.equal(appSlots[13].currentWorkspace,'work-item-map');
      assert.equal(shell().type.name,'WorkflowExecutionWorkspace');
      assert.equal(typeof shell().props.onProgressed,'function');
    }
  } finally {global.window = previousWindow;}
});

test('all six families fail closed for unknown and mismatched Architect stages', () => {
  for (const workflowType of ['feature-capability','issue-resolution','refactor-migration','integration-composition','infrastructure-platform','research-prototype']) {
    for (const currentWorkspace of ['work-item-map','implementation','execution-complete','integration-ready','validation']) assert.equal(workflowPlanningSurface({workflowType,currentWorkspace,lifecycleState:'active'}),'execution');
    for (const currentWorkspace of ['unknown-active-stage','architect-interview','wrong-assessment']) assert.equal(workflowPlanningSurface({workflowType,currentWorkspace,lifecycleState:'active'}),'generic');
    for (const currentWorkspace of ['feature-assessment','issue-rca','refactor-assessment','integration-assessment','infrastructure-assessment','research-assessment']) {
      const own = {'feature-capability':'feature-assessment','issue-resolution':'issue-rca','refactor-migration':'refactor-assessment','integration-composition':'integration-assessment','infrastructure-platform':'infrastructure-assessment','research-prototype':'research-assessment'}[workflowType];
      if (currentWorkspace !== own) assert.equal(workflowPlanningSurface({workflowType,currentWorkspace,lifecycleState:'active'}),'generic');
    }
  }
});


test('application progression rejects mismatched exact identity and returns terminal Research to its Workflow list', async () => {
  const previousWindow = global.window;
  const workflow = {workflowId:'research-exact',workflowType:'research-prototype',workflowState:'active',lifecycleState:'active',currentWorkspace:'planning'};
  const slots = ['dark','workflow-instance',{ok:true,workspaceRoot:'fixture'},null,false,'',null,null,null,false,'','research-prototype',workflow.workflowId,workflow,null,null];
  let persisted = {...workflow};
  const mounted = () => progressionFind(progressionRender(App,{},slots),node => node.type?.name === 'StructuredWorkflowWorkspace');
  try {
    global.window = {champcity:{getWorkflow:async () => ({workflow:{...persisted,workflowId:'wrong-exact-id'}})}};
    await assert.rejects(mounted().props.onProgressed(workflow.workflowId),/Exact Workflow progression identity/);
    assert.equal(slots[13],workflow); assert.equal(slots[1],'workflow-instance');
    window.champcity.getWorkflow = async id => {assert.equal(id,workflow.workflowId); return {workflow:persisted};};
    window.champcity.closeExactResearch = async id => {assert.equal(id,workflow.workflowId); persisted = {...persisted,lifecycleState:'closed',workflowState:'closed'};};
    const appShell = mounted();
    const child = progressionFind(progressionRender(appShell.type,appShell.props,[null]),node=>['WorkflowIntakeWorkspace','ExactWorkflowPlanningWorkspace','WorkflowExecutionWorkspace'].includes(node.type?.name));
    const planning = progressionRender(child.type,child.props,[{researchOutcome:{outcome:'no-implementation-plan-required'}},'',false,null,true]);
    const close = progressionFind(planning,node => node.type === 'button' && node.props.children === 'Close Research with approved outcome');
    assert.ok(close); close.props.onClick(); await new Promise(resolve => setImmediate(resolve));
    assert.equal(slots[1],'workflow-type'); assert.equal(slots[13],null); assert.equal(slots[12],null);
  } finally {global.window = previousWindow;}
});

test('Execution reroutes changed SQL stages and terminal closure while within-stage refresh stays local', async () => {
  const previousWindow = global.window;
  const workflow = {workflowId:'execution-exact',workflowType:'feature-capability',workflowState:'active',lifecycleState:'active',currentWorkspace:'work-item-map'};
  const appSlots = ['dark','workflow-instance',{ok:true,workspaceRoot:'fixture'},null,false,'',null,null,null,false,'','feature-capability',workflow.workflowId,workflow,null,null];
  let persisted = {...workflow}, reads = 0, closed = false;
  const projection = () => ({items:[],plan:{workflow:{lifecycleState:persisted.lifecycleState,body:{currentWorkspace:persisted.currentWorkspace}},phases:[]},source:{state:'non-source'}});
  const mountExecution = () => {
    const appShell = progressionFind(progressionRender(App,{},appSlots),node => node.type?.name === 'StructuredWorkflowWorkspace');
    const child = progressionFind(progressionRender(appShell.type,appShell.props,[null]),node=>['WorkflowIntakeWorkspace','ExactWorkflowPlanningWorkspace','WorkflowExecutionWorkspace'].includes(node.type?.name));
    return progressionRender(child.type,child.props,[projection(),null,null,{catalog:[]},null,null,null,'','','',null,null,'[]','','','pass','approved',{}]);
  };
  try {
    global.window = {champcity:{getWorkflowExecutionProjection:async () => {if (closed) throw Error('Workflow is closed');return projection();},getCodexManagedRuntimeStatus:async () => ({catalog:[]}),getWorkflowIntegration:async () => null,getWorkflow:async id => {assert.equal(id,workflow.workflowId);reads++;return {workflow:{...persisted}};}}};
    let execution = mountExecution();
    let close = progressionFind(execution,node => node.type?.name === 'CloseAdvanceWorkspace' && node.props.scope === 'workflow');
    close.props.onNext({workspaceId:'implementation'}); await new Promise(resolve => setImmediate(resolve));
    assert.equal(reads,0,'within-stage refresh does not reroute the parent');
    persisted = {...persisted,currentWorkspace:'execution-complete'};
    close.props.onNext({workspaceId:'integration-ready'}); await new Promise(resolve => setImmediate(resolve));
    assert.equal(reads,1); assert.equal(appSlots[13].currentWorkspace,'execution-complete');
    execution = mountExecution(); close = progressionFind(execution,node => node.type?.name === 'CloseAdvanceWorkspace' && node.props.scope === 'workflow');
    closed = true; persisted = {...persisted,lifecycleState:'closed',workflowState:'closed'};
    close.props.onNext({workspaceId:'workflow-hub'}); await new Promise(resolve => setImmediate(resolve));
    assert.equal(appSlots[1],'workflow-type'); assert.equal(appSlots[13],null);
  } finally {global.window = previousWindow;}
});


test('all six direct and routed rails inspect every stage without mutation and reset on exact reload', async () => {
  const previousWindow = global.window;
  const types = Object.values(WORKFLOW_TYPE_REGISTRY).filter(d=>d.directStart);
  try {
    global.window = {champcity:new Proxy({}, {get:(_target,name)=>{throw Error(`Unexpected service mutation during rail navigation: ${String(name)}`);}})};
    for (const definition of types) for (const routed of [false,true]) {
      const assessment = {'feature-capability':'feature-assessment','issue-resolution':'issue-rca','refactor-migration':'refactor-assessment','integration-composition':'integration-assessment','infrastructure-platform':'infrastructure-assessment','research-prototype':'research-assessment'}[definition.workflowType];
      const planning = definition.workflowType === 'feature-capability' ? 'feature-planning' : definition.workflowType === 'issue-resolution' ? 'issue-planning' : 'planning';
      for (const currentWorkspace of [definition.entryWorkspace,assessment,planning,'work-item-map','implementation','validation','integration-ready']) {
        const workflow={workflowId:'exact-'+definition.workflowType,workflowType:definition.workflowType,currentWorkspace,lifecycleState:'active',...(routed?{routedSourceWorkflowId:'route'}:{})};
        const props={workflow,onReturn(){},onOpen(){},onProgressed:async()=>{},repositoryIdentity:'',browserPanel:null}, slots=[null];
        const render=()=>progressionRender(StructuredWorkflowWorkspace,props,slots);
        const rail=()=>progressionFind(render(),node=>node.type?.name==='WorkflowStageRail');
        const canonical=rail().props.stages.find(stage=>stage.isRequired).id;
        for (const stage of rail().props.stages) {
          assert.equal(stage.enabled,true); stage.onClick();
          const selected=rail().props.stages.find(entry=>entry.state==='exact'); assert.equal(selected.id,stage.id);
          assert.equal(workflow.currentWorkspace,currentWorkspace);
          const inspector=progressionFind(render(),node=>node.type?.name==='WorkflowStageInspectionWorkspace');
          if (stage.id===canonical) assert.equal(inspector,null,'current stage retains normal work surface');
          else {
            assert.ok(inspector);
            const snapshot={workflowId:workflow.workflowId,currentWorkspace,records:[{id:'intake',entityType:'WorkflowIntake',body:{values:{objective:'Saved exact Intake'}}}],relationships:[],truncated:false};
            const view=progressionRender(inspector.type,inspector.props,[snapshot,'']);
            const markup=renderToStaticMarkup(view);
            assert.match(markup,/Read only/);
            assert.equal(progressionFind(view,node=>node.type==='textarea'||node.type==='form'),null);
            if (stage.statusLabel==='Not Ready') {assert.match(markup,/Not Ready/); assert.ok(progressionFind(view,node=>node.props?.role==='note'));}
            if (stage.id==='intake') assert.match(markup,/Saved exact Intake/);
          }
        }
        props.workflow={...workflow};
        assert.equal(rail().props.stages.find(stage=>stage.state==='exact').id,canonical,'exact reload resets inspection');
        props.workflow={...workflow,workflowId:'other-exact'};
        assert.equal(rail().props.stages.find(stage=>stage.state==='exact').id,canonical,'different Workflow resets inspection');
        assert.equal(progressionFind(progressionRender(StructuredWorkflowWorkspace,{...props,workflow},[null]),node=>node.type?.name==='WorkflowStageRail').props.stages.find(stage=>stage.state==='exact').id,canonical,'fresh reopen starts at persisted stage');
      }
    }
  } finally {global.window=previousWindow;}
});

test('inspection mount reads exact bounded evidence and ignores obsolete asynchronous results', async () => {
  const {WorkflowStageInspectionWorkspace}=loader.loadRendererSourceModule('src/renderer/app/StructuredWorkflowWorkspace.tsx');
  const previousWindow=global.window, previousEffect=React.useEffect, previousState=React.useState;
  const slots=[null,''], effects=[]; let index=0, resolveRead, reads=0;
  try {
    global.window={champcity:{getWorkflowStageInspection:id=>{assert.equal(id,'exact');reads++;return new Promise(resolve=>{resolveRead=resolve;});}}};
    React.useState=initial=>{const i=index++;return [slots[i]??initial,value=>{slots[i]=value;}];};
    React.useEffect=effect=>effects.push(effect);
    const workflow={workflowId:'exact',currentWorkspace:'feature-assessment'};
    WorkflowStageInspectionWorkspace({workflow,stage:'intake',label:'Intake',status:'Completed',canonical:'assessment',onReturn(){}});
    const cleanup=effects[0](); assert.equal(reads,1);
    cleanup(); resolveRead({workflowId:'exact',currentWorkspace:'feature-assessment',records:[],relationships:[],truncated:false});
    await new Promise(resolve=>setImmediate(resolve)); assert.equal(slots[0],null);
  } finally {global.window=previousWindow;React.useEffect=previousEffect;React.useState=previousState;}
});
