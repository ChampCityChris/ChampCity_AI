const assert = require("node:assert/strict");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const test = require("node:test");
const { loadRendererSourceModule } = require("./renderer-source-loader.cjs");

const { WorkIntakeWorkspace } = loadRendererSourceModule("src/renderer/app/WorkIntakeWorkspace.tsx");
const { StructuredWorkRoutingWorkspace } = loadRendererSourceModule("src/renderer/app/StructuredWorkRoutingWorkspace.tsx");
const { WorkIntakeRoutingRail } = loadRendererSourceModule("src/renderer/app/WorkIntakeRoutingRail.tsx");
const { shouldAttachArchitectSurface } = loadRendererSourceModule("src/renderer/app/architectSurfaceEligibility.ts");
const { WorkRoutingWorkspace } = loadRendererSourceModule("src/renderer/app/WorkRoutingWorkspace.tsx");
const { WorkArchitectAssessmentWorkspace } = loadRendererSourceModule("src/renderer/app/WorkArchitectAssessmentWorkspace.tsx");
const { WorkPlanWorkspace } = loadRendererSourceModule("src/renderer/app/WorkPlanWorkspace.tsx");
const { RoutedPlanningWorkspace } = loadRendererSourceModule("src/renderer/app/RoutedPlanningWorkspace.tsx");
const { WorkItemDecompositionWorkspace } = loadRendererSourceModule("src/renderer/app/WorkItemDecompositionWorkspace.tsx");
const { RoutedIssueBridge } = loadRendererSourceModule("src/renderer/app/RoutedIssueBridge.tsx");
const { RoutedIssueReturnNav } = loadRendererSourceModule("src/renderer/app/RoutedIssueReturnNav.tsx");
const { activateRoutedIssueWorkspace } = loadRendererSourceModule("src/renderer/app/routedIssueNavigation.ts");
const { RoutedExecutionWorkspace, requiredRoutedExecutionStep } = loadRendererSourceModule("src/renderer/app/RoutedExecutionWorkspace.tsx");
const { RoutedWorkItemMapWorkspace } = loadRendererSourceModule("src/renderer/app/RoutedWorkItemMapWorkspace.tsx");
const { RoutedWorkItemPlanningWorkspace } = loadRendererSourceModule("src/renderer/app/RoutedWorkItemPlanningWorkspace.tsx");
const { RoutedImplementWorkspace } = loadRendererSourceModule("src/renderer/app/RoutedImplementWorkspace.tsx");
const { RoutedReviewValidationWorkspace } = loadRendererSourceModule("src/renderer/app/RoutedReviewValidationWorkspace.tsx");
const { RoutedRepairWorkspace } = loadRendererSourceModule("src/renderer/app/RoutedRepairWorkspace.tsx");
const { RoutedCloseWorkspace } = loadRendererSourceModule("src/renderer/app/RoutedCloseWorkspace.tsx");
const { RoutedAcceptanceWorkspace } = loadRendererSourceModule("src/renderer/app/RoutedAcceptanceWorkspace.tsx");
const { RoutedIntegrationWorkspace } = loadRendererSourceModule("src/renderer/app/RoutedIntegrationWorkspace.tsx");
const { seedResearchIntegrationCompletion } = require("../support/research-integration-scenarios.cjs");
const fs = require("node:fs");
const path = require("node:path");

function withState(values, render) {
  const original = React.useState;
  const originalEffect = React.useEffect;
  let index = 0;
  React.useState = (initial) => [index < values.length ? values[index++] : initial, () => undefined];
  React.useEffect = () => undefined;
  try { return render(); } finally { React.useState = original; React.useEffect = originalEffect; }
}

const routingIntake = { intakeId: "intake-1", projectName: "Product", workRequest: "Improve navigation",
  desiredOutcome: "A usable route", knownConstraints: "Preserve current services" };
const routingAdvice = { recommendedRouteId: "feature-change", rationale: "This changes a bounded existing capability.",
  traits: ["existing-source"], evidencePaths: ["docs/current.md"], relativePath: "planning/routing.md", artifactRevision: 1 };
const routingDecision = { state: "awaiting-decision", artifactRevision: 0, sourceAssessment: { path: "planning/routing.md", revision: 1 },
  recommendation: routingAdvice, selection: null, history: [] };
function routedView(assessment, decision, callback = async () => undefined) {
  return withState(["assessment", assessment, decision, "feature-change", "Operator rationale", false, "", ""], () =>
    WorkRoutingWorkspace({ intake: routingIntake, browserPanel: React.createElement("div", { "aria-label": "Embedded ChatGPT browser" }),
      onReloadBrowser() {}, onNavigationRefresh: callback }));
}

test("saved Intake is a capture confirmation without a child routing lifecycle", () => {
  const saved = { intakeId: "intake-1", workRequest: "Improve navigation", branchBinding: { workBranch: "work/1", baseBranch: "dev" } };
  const projection = { project: null, suggestedBase: null, suggestedProjectName: "Project", branches: [], currentIntake: saved };
  const markup = renderToStaticMarkup(withState([{}, saved, "", false], () =>
    WorkIntakeWorkspace({ projection, onReturn() {}, async onSaved() {} })));
  assert.match(markup, /Work Intake saved/);
  assert.doesNotMatch(markup, /Advisory routing assessment|Operator route decision|Route planning/);
});

test("structured Work Intake has no branch ownership controls and saves without a base branch", () => {
  const value = { projectId: "project-1", projectName: "Product", workRequest: "Improve search", desiredOutcome: "Relevant results",
    knownConstraints: "Keep existing data", hasExistingSourceOrPlanning: true, repositoryReviewContext: "", baseBranch: "", baseCommit: "" };
  const projection = { authority: "structured", project: { projectId: "project-1" }, suggestedBase: null, suggestedProjectName: "Product", branches: [] };
  const element = withState([value, null, "", false], () => WorkIntakeWorkspace({ projection, onReturn() {}, async onSaved() {} }));
  const markup = renderToStaticMarkup(element);
  assert.doesNotMatch(markup, /Integrate into branch|creates the work branch|Retry source preparation/);
  assert.match(markup, /Project State keeps the saved request for routing/);
  const submit = React.Children.toArray(element.props.children)[0];
  assert.ok(submit);
  const form = React.Children.toArray(submit.props.children).find(child => child?.type === "form");
  const saveButton = React.Children.toArray(form.props.children).flatMap(child => React.Children.toArray(child?.props?.children))
    .find(child => child?.props?.type === "submit");
  assert.ok(saveButton);
  assert.equal(saveButton.props.disabled, false);
});

test("structured WIR workspace embeds Architect handoff and exposes only the six Existing-Project routes", () => {
  const browser = React.createElement("div", { "aria-label": "Embedded ChatGPT browser" });
  const model = { projectId: "project-1", intakeId: "intake-1", routingWorkflowId: "workflow-1", request: "Improve search",
    desiredOutcome: "Relevant results", constraints: [], evidenceContext: [], intakeRecordVersion: 1, intakeState: "captured", workflowState: "active",
    assessment: { assessmentId: "assessment-1", recommendation: "feature-change", traits: [], rationale: "A bounded change.", evidenceNotes: "", sourceRecordVersion: 1, stale: false },
    reviewState: "none", selectedRoute: null, targetWorkflowId: null, closed: false };
  const element = withState([model, "feature-change", "", false, "", ""], () => StructuredWorkRoutingWorkspace({ intakeId: "intake-1",
    routingWorkflowId: "workflow-1", browserPanel: browser, onReloadBrowser() {}, onReturn() {}, onRouted() {} }));
  const markup = renderToStaticMarkup(element);
  assert.match(markup, /Embedded ChatGPT browser/);
  assert.match(markup, /Prepare Handoff|Copy Handoff|Refresh|Reload ChatGPT/);
  for (const route of ["Feature / Capability", "Refactor / Migration", "Integration / Composition", "Infrastructure / Platform", "Research / Prototype", "Issue Resolution"])
    assert.ok(markup.includes(route), `missing ${route}`);
  assert.doesNotMatch(markup, /Greenfield|Work branch|Integrate into branch|source preparation/);
});

test("routed rail has exact stage order and explains blocked stages", () => {
  const ids = ["intake", "routing", "assessment", "plan", "execution", "integration"];
  const labels = ["Intake", "Routing", "Architect Assessment", "Plan", "Execution", "Integration"];
  const projection = { intakeId: "intake-1", requiredStageId: "routing", selectedRouteId: null,
    stages: ids.map((stageId, index) => ({ stageId, label: labels[index], available: index < 2,
      reason: index < 2 ? "Available" : `Blocked ${labels[index]}`, requiresArchitect: index > 0 && index < 4 })) };
  const markup = renderToStaticMarkup(React.createElement(WorkIntakeRoutingRail, { projection, activeStageId: "routing", onStageChange() {} }));
  assert.deepEqual([...markup.matchAll(/<strong>\d\d ([^<]+)<\/strong>/g)].map((match) => match[1]), labels);
  assert.match(markup, /Blocked Architect Assessment/);
  assert.match(markup, /disabled=""/);
});

test("Architect attachment follows available routed stages and preserves Development and Issue cases", () => {
  const base = { paneVisible: true, developmentForeground: false, developmentBrowserAvailable: false,
    workCardRepair: false, issueForeground: false, issueStageId: "intake", issueFixCardStepId: "fix-card-map",
    workIntakeForeground: true, workIntakeStageId: "routing", workIntakeNavigation: { stages: [
      { stageId: "routing", available: true, requiresArchitect: true },
      { stageId: "execution", available: true, requiresArchitect: false },
    ] } };
  assert.equal(shouldAttachArchitectSurface(base), true);
  assert.equal(shouldAttachArchitectSurface({ ...base, workIntakeStageId: "execution" }), false);
  assert.equal(shouldAttachArchitectSurface({ ...base, workIntakeStageId: "execution", workIntakeExecutionStepId: "planning" }), true);
  assert.equal(shouldAttachArchitectSurface({ ...base, workIntakeStageId: "execution", workIntakeDecompositionActive: true }), true);
  assert.equal(shouldAttachArchitectSurface({ ...base, workIntakeStageId: "intake" }), false);
  assert.equal(shouldAttachArchitectSurface({ ...base, paneVisible: false }), false);
  assert.equal(shouldAttachArchitectSurface({ ...base, workIntakeForeground: false, developmentForeground: true,
    developmentBrowserAvailable: true }), true);
  assert.equal(shouldAttachArchitectSurface({ ...base, workIntakeForeground: false, issueForeground: true,
    issueStageId: "architect-planning" }), true);
});

test("navigation service unlocks only stages backed by current owner evidence", async (t) => {
  const { seedPreparedRoutedWorkIntake } = require("../support/work-intake-fixtures.cjs");
  const fixture = seedPreparedRoutedWorkIntake(t, "feature-change");
  const { getWorkIntakeNavigation } = require("../../dist/main/workIntake/workIntakeNavigationService.js");
  const navigation = await getWorkIntakeNavigation(fixture.root, fixture.intake.intakeId);
  assert.equal(navigation.requiredStageId, "assessment");
  assert.equal(navigation.selectedRouteId, "feature-change");
  assert.deepEqual(navigation.stages.filter((stage) => stage.available).map((stage) => stage.stageId),
    ["intake", "routing", "assessment"]);
  assert.equal(navigation.execution, null);
});

test("Routing Workspace shows the embedded Architect slot and human handoff state without nested lifecycle", () => {
  const element = routedView({ state: "waiting-for-drafts", assessment: null, preparedInstruction: "Handoff" },
    { ...routingDecision, state: "awaiting-assessment", sourceAssessment: null, recommendation: null });
  const markup = renderToStaticMarkup(element);
  assert.match(markup, /Embedded ChatGPT browser|ChatGPT/);
  assert.match(markup, /Prepare Handoff|Copy Handoff|Refresh|Reload ChatGPT/);
  assert.match(markup, /Handoff prepared/);
  assert.doesNotMatch(markup, /waiting-for-drafts|awaiting-assessment|Work Item Map|Approve Plan|Open Issue Resolution/);
  assert.doesNotMatch(markup, /Accept Recommendation|Override Route|Request Revised Assessment/);
});

test("current assessment exposes recommendation and explicit route disposition", () => {
  const markup = renderToStaticMarkup(routedView({ state: "promoted", assessment: routingAdvice }, routingDecision));
  assert.match(markup, /Work Intake|Routing Assessment/);
  assert.match(markup, /Feature \/ Capability Change/);
  assert.match(markup, /Accept Recommendation|Override Route|Request Revised Assessment/);
  assert.match(markup, /Evidence and document details/);
  assert.doesNotMatch(markup, /<pre/);
});

test("route decision completion refreshes and advances routed navigation", async () => {
  const originalWindow = global.window;
  const calls = [];
  global.window = { champcity: { async decideWorkRoute(intakeId, input) {
    calls.push({ intakeId, input }); return { ...routingDecision, state: "selected", selection: { selectedRouteId: "feature-change" } };
  } } };
  try {
    const element = routedView({ state: "promoted", assessment: routingAdvice }, routingDecision,
      async (advance) => { calls.push({ advance }); });
    const controls = React.Children.toArray(element.props.documentColumn.props.children)
      .flatMap((child) => React.Children.toArray(child?.props?.children))
      .find((child) => child?.type?.name === "WorkRoutingDecisionControls");
    assert.ok(controls);
    await controls.props.onDecide("accept");
    assert.equal(calls[0].intakeId, routingIntake.intakeId);
    assert.equal(calls[0].input.disposition, "accept");
    assert.deepEqual(calls[1], { advance: true });
  } finally { global.window = originalWindow; }
});

const planningArtifact = { relativePath: "planning/assessment.md", artifactRevision: 1, disposition: "Pending",
  stale: false, bodyMarkdown: "# Route Architect Assessment\n\n## Evidence\nBounded evidence." };
const planningModel = { intakeId: "intake-1", routeId: "feature-change", stage: "assessment", canPrepare: true,
  preparedInstruction: "Handoff", researchClosed: false, artifact: planningArtifact };
function planningView(stage, model, supporting = null, intake = routingIntake) {
  const wrapper = stage === "assessment" ? WorkArchitectAssessmentWorkspace : WorkPlanWorkspace;
  const wrapped = wrapper({ intakeId: "intake-1", intake,
    browserPanel: React.createElement("div", { "aria-label": "Embedded ChatGPT browser" }),
    onReloadBrowser() {}, async onNavigationRefresh() {} });
  assert.equal(wrapped.props.stage, stage);
  return withState([model, supporting, stage, "", false, "", ""], () => RoutedPlanningWorkspace(wrapped.props));
}

test("Assessment and Plan render separate Architect workspaces without nested later stages", () => {
  const assessment = renderToStaticMarkup(planningView("assessment", planningModel));
  assert.match(assessment, /Architect Assessment|Embedded ChatGPT browser/);
  assert.match(assessment, /Prepare Handoff|Copy Handoff|Refresh|Reload ChatGPT/);
  assert.match(assessment, /Approve assessment|Request Revision|Reject/);
  assert.doesNotMatch(assessment, /Planning stage|<select|Work Item Decomposition|Plan execution/);

  const planModel = { ...planningModel, stage: "plan", artifact: { ...planningArtifact,
    bodyMarkdown: "# Work Plan\n\n## Delivery\nBounded delivery.",
    structure: { topology: "direct", topologyRationale: "One bounded delivery", phases: [],
      workItems: [{ workItemId: "WI01", title: "Deliver navigation", purpose: "Connect the routed view", dependsOn: [] }] } } };
  const plan = renderToStaticMarkup(planningView("plan", planModel, planningModel));
  assert.match(plan, /Work Plan|Embedded ChatGPT browser|Approved Assessment/);
  assert.match(plan, /Direct Plan|Deliver navigation|Approve Plan and topology/);
  assert.doesNotMatch(plan, /Planning stage|<select|Work Item Decomposition|Plan execution/);
});

test("long Assessment request collapses to a keyboard-accessible full-text detail", () => {
  const request = "Preserve the existing navigation while improving the routed work journey. ".repeat(12);
  const markup = renderToStaticMarkup(planningView("assessment", planningModel, null,
    { ...routingIntake, workRequest: request }));
  assert.match(markup, /<details class="work-intake-request-details"><summary>/);
  assert.match(markup, /Read full work request<\/summary>/);
  assert.match(markup, new RegExp(request.trim().slice(0, 70)));
});

test("approved ordinary Assessment opens Plan and approved Plan opens Execution", async (t) => {
  const { seedPreparedRoutedWorkIntake, seedPreparedApprovedRoutedWorkPlan } = require("../support/work-intake-fixtures.cjs");
  const { getWorkIntakeNavigation } = require("../../dist/main/workIntake/workIntakeNavigationService.js");
  const { workPlanningKernel } = require("../../dist/main/workPlanning/workPlanningKernel.js");
  const { resolveWorkPlanningProfile } = require("../../dist/main/workPlanning/workPlanningProfiles.js");
  const fixture = seedPreparedRoutedWorkIntake(t, "feature-change");
  const profile = resolveWorkPlanningProfile("feature-change");
  const prepared = await workPlanningKernel.prepare(fixture.root, fixture.intake.intakeId, "assessment");
  const draftPath = path.join(fixture.root, prepared.submission.expectedDraftSlots[0].draftRelativePath);
  fs.mkdirSync(path.dirname(draftPath), { recursive: true });
  fs.writeFileSync(draftPath, "# Route Architect Assessment\n\n" + profile.assessmentSections
    .map((heading) => `## ${heading}\nBounded evidence.`).join("\n\n") + "\n");
  const current = await workPlanningKernel.get(fixture.root, fixture.intake.intakeId, "assessment");
  await workPlanningKernel.review(fixture.root, fixture.intake.intakeId, "assessment", {
    expectedRevision: current.artifact.artifactRevision, disposition: "Approved", notes: "Assessment approved" });
  const afterAssessment = await getWorkIntakeNavigation(fixture.root, fixture.intake.intakeId);
  assert.equal(afterAssessment.requiredStageId, "plan");
  assert.equal(afterAssessment.stages.find((stage) => stage.stageId === "execution").available, false);

  const structure = { topology: "direct", topologyRationale: "One bounded delivery", acceptanceCriteria: ["Navigation works"],
    workItems: [{ workItemId: "WI01", title: "Deliver navigation", purpose: "Connect routed views", dependsOn: [], acceptanceCriteria: ["Navigation works"] }] };
  const approved = await seedPreparedApprovedRoutedWorkPlan(t, structure, "feature-change", {
    setupRepository(root) { fs.writeFileSync(path.join(root, ".gitignore"), "/planning/\n"); },
  });
  const afterPlan = await getWorkIntakeNavigation(approved.root, approved.intake.intakeId);
  assert.equal(afterPlan.requiredStageId, "execution");
  assert.equal(afterPlan.stages.find((stage) => stage.stageId === "execution").available, true);
});

function elements(node) {
  if (!node || typeof node !== "object") return [];
  return [node, ...React.Children.toArray(node.props?.children).flatMap(elements)];
}
const proposal = { kind: "siblings", rationale: "Split review from delivery", evidence: ["Separate acceptance boundary"],
  replacements: [{ workItemId: "WI01A", title: "Deliver", purpose: "Build the change", dependsOn: [], acceptanceCriteria: ["Done"] },
    { workItemId: "WI01B", title: "Verify", purpose: "Check the result", dependsOn: ["WI01A"], acceptanceCriteria: ["Verified"] }] };
const decomposition = { kind: "decomposition-proposal", intakeId: "intake-1", workItemId: "WI01",
  relativePath: "planning/decomposition.md", revision: 2, planRevision: 1, state: "pending", proposal,
  canPrepare: true, preparedInstruction: "Handoff", notes: "" };
function decompositionView(model, onReturn) {
  return withState([model, planningModel, "proposal", "Review notes", false, "", ""], () =>
    WorkItemDecompositionWorkspace({ intakeId: "intake-1", workItemId: "WI01", returnTarget: "plan",
      browserPanel: React.createElement("div", { "aria-label": "Embedded ChatGPT browser" }),
      onReloadBrowser() {}, onReturn }));
}

test("decomposition presents readable proposal and Architect handoff as a contextual workspace", () => {
  const markup = renderToStaticMarkup(decompositionView(decomposition, async () => undefined));
  assert.match(markup, /Embedded ChatGPT browser|Prepare Handoff|Copy Handoff|Refresh|Reload ChatGPT/);
  assert.match(markup, /Decomposition Proposal|Approved Plan|Split review from delivery|Separate acceptance boundary/);
  assert.match(markup, /WI01A: Deliver|WI01B: Verify|Accept Plan Change|Request Revised Proposal/);
  assert.doesNotMatch(markup, /<pre|\{&quot;kind&quot;|<select|Decompose a candidate \(optional\)/);
});

test("accepting decomposition returns the resume Work Item; revision stays in context", async () => {
  const originalWindow = global.window;
  const calls = [];
  global.window = { champcity: {
    async reviewWorkItemDecomposition(intakeId, workItemId, input) {
      calls.push({ intakeId, workItemId, input });
      return input.disposition === "accept" ? { ...decomposition, state: "accepted", resumeWorkItemId: "WI01A" }
        : { ...decomposition, state: "revision-requested" };
    },
    async getWorkPlanning() { calls.push("refresh-plan"); return planningModel; },
  } };
  try {
    const accepted = decompositionView(decomposition, async (target, resume) => { calls.push({ target, resume }); });
    const accept = elements(accepted.props.documentColumn).find((entry) => entry.type === "button" && entry.props.children === "Accept Plan Change");
    accept.props.onClick();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(calls[0].input.disposition, "accept");
    assert.equal(calls[0].input.expectedPlanRevision, 1);
    assert.equal(calls[1], "refresh-plan");
    assert.deepEqual(calls[2], { target: "work-item-map", resume: "WI01A" });

    calls.length = 0;
    const revision = decompositionView(decomposition, async (target, resume) => { calls.push({ target, resume }); });
    const revise = elements(revision.props.documentColumn).find((entry) => entry.type === "button" && entry.props.children === "Request Revised Proposal");
    revise.props.onClick();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(calls[0].input.disposition, "request-revision");
    assert.equal(calls.length, 1, "revision does not leave the workspace or change the Plan");
  } finally { global.window = originalWindow; }
});

test("Work Item Map opens decomposition for the selected approved Plan candidate", () => {
  const selected = [];
  const approved = { ...planningModel, stage: "plan", artifact: { ...planningArtifact, disposition: "Approved",
    structure: { topology: "direct", topologyRationale: "One delivery", phases: [],
      workItems: [{ workItemId: "WI01", title: "Deliver", purpose: "Build", dependsOn: [] }] } } };
  const element = RoutedWorkItemMapWorkspace({ model: { actions: ["activate"], reasons: [], execution: null }, plan: approved,
    selectedWorkItemId: "WI01", busy: false, error: "", onSelect() {}, onActivate() {}, onBegin() {},
    onContinue() {}, onDecompose: (workItemId) => selected.push(workItemId) });
  const open = elements(element).find((entry) => entry.type === "button" && entry.props.children === "Decompose Work Item");
  assert.ok(open);
  open.props.onClick();
  assert.deepEqual(selected, ["WI01"]);
});

const executionCandidate = { workItemId: "WI01", title: "Deliver", purpose: "Build the navigation", dependsOn: [] };
const executionPlan = { ...planningModel, stage: "plan", artifact: { ...planningArtifact, disposition: "Approved",
  structure: { topology: "direct", topologyRationale: "One delivery", phases: [], workItems: [executionCandidate] } } };
const executionModel = { actions: ["begin"], reasons: [], feedback: "", execution: { fingerprint: "current",
  nextWorkItemId: "WI01", acceptance: [], blockers: [], workItems: [{ candidate: executionCandidate,
    stage: "ready", eligible: true, reasons: [] }] }, current: { workItemId: "WI01", implementationId: "WI01",
    contractTargetPath: "planning/work-card.md" }, implementer: null };

test("routed Execution opens Work Item Map with seven task destinations", () => {
  const markup = renderToStaticMarkup(withState([executionModel, executionPlan, "map", false, ""], () =>
    RoutedExecutionWorkspace({ intakeId: "intake-1", selectedWorkItemId: "WI01", browserPanel: null,
      onSelectWorkItem() {}, onDecompose() {}, onReloadBrowser() {}, onStepChange() {} })));
  assert.match(markup, /Work Item Map|Planning|Implement|Review &amp; Validation|Repair|Close \/ Next|Acceptance/);
  assert.match(markup, /Begin Work Item|Ready to begin|Eligibility: Ready|Decompose Work Item/);
  assert.doesNotMatch(markup, /Formal Work Card disposition|Codex Execution Console/);
  assert.equal(requiredRoutedExecutionStep(executionModel), "map");
});

test("Work Item Planning mounts ChatGPT with separate Prepare and Copy and gates review on draft", () => {
  const props = { model: { ...executionModel, actions: ["prepare", "copy", "check-draft"] },
    browserPanel: React.createElement("div", null, "Embedded ChatGPT browser"), busy: false, error: "",
    onReloadBrowser() {}, onAction() {}, onDecompose() {} };
  const pending = renderToStaticMarkup(withState([""], () => RoutedWorkItemPlanningWorkspace(props)));
  assert.match(pending, /Embedded ChatGPT browser|Prepare Handoff|Copy Handoff|Refresh/);
  assert.match(pending, /<summary>Formal Work Card file location<\/summary><p>planning\/work-card.md<\/p>/);
  assert.doesNotMatch(pending, /Approve Work Card|Request Revision|Reject/);
  const draft = renderToStaticMarkup(withState([""], () => RoutedWorkItemPlanningWorkspace({ ...props,
    model: { ...props.model, actions: [...props.model.actions, "review-contract"],
      current: { ...executionModel.current, contract: { body: "# Formal Work Card\n\nReady", path: "planning/work-card.md",
        revision: 1, disposition: "Pending" } } } })));
  assert.match(draft, /Approve Work Card|Request Revision|Reject/);
});

test("routed Implement reuses Codex console and actions without review controls", () => {
  const model = { ...executionModel, actions: ["implement", "resolve-environment"],
    current: { ...executionModel.current, reportTargetPath: "planning/implementer-report.md",
      contract: { body: "# Work Card", path: "planning/work-card.md", revision: 1, disposition: "Approved" } } };
  const markup = renderToStaticMarkup(RoutedImplementWorkspace({ model, busy: false, error: "", onAction() {} }));
  assert.match(markup, /Implement WI01|Approved Work Card|Implementer Report target|Codex/);
  assert.doesNotMatch(markup, /Validate report|Request Repair|Integration|Approve report/);
});

test("routed Work Card Prepare and Copy are separate service actions", async (t) => {
  const { seedPreparedApprovedRoutedWorkPlan } = require("../support/work-intake-fixtures.cjs");
  const { getRoutedWorkflow, runRoutedWorkflow } = require("../../dist/main/planExecution/routedWorkflowService.js");
  const structure = { topology: "direct", topologyRationale: "One bounded task", acceptanceCriteria: ["Navigation works"],
    workItems: [{ ...executionCandidate, acceptanceCriteria: ["Navigation works"] }] };
  const fixture = await seedPreparedApprovedRoutedWorkPlan(t, structure, "feature-change", {
    setupRepository(root) { fs.writeFileSync(path.join(root, ".gitignore"), "/planning/\n"); },
  });
  const before = await getRoutedWorkflow(fixture.root, fixture.intake.intakeId);
  assert.ok(before.actions.includes("begin"));
  const begun = await runRoutedWorkflow(fixture.root, fixture.intake.intakeId, "begin", {
    workItemId: "WI01", expectedFingerprint: before.execution.fingerprint });
  assert.ok(begun.model.actions.includes("prepare"));
  assert.equal(begun.model.actions.includes("copy"), false);
  const prepared = await runRoutedWorkflow(fixture.root, fixture.intake.intakeId, "prepare", {
    workItemId: "WI01", expectedFingerprint: begun.model.execution.fingerprint });
  assert.equal(prepared.instruction, undefined);
  assert.ok(prepared.model.actions.includes("copy"));
  const copied = await runRoutedWorkflow(fixture.root, fixture.intake.intakeId, "copy", {
    workItemId: "WI01", expectedFingerprint: prepared.model.execution.fingerprint });
  assert.match(copied.instruction, /Formal Work Card|Work Card/);
});

const reviewedModel = { ...executionModel, actions: ["review-report", "advisory-review", "validate"],
  current: { ...executionModel.current, contract: { path: "planning/work-card.md", body: "# Approved card", revision: 1, disposition: "Approved" },
    report: { path: "planning/implementer-report.md", body: "# Delivered work", revision: 1, disposition: "Approved" } } };

test("routed Review selects evidence and offers explicit Operator validation", () => {
  const markup = renderToStaticMarkup(withState(["report", "", "", ""], () => RoutedReviewValidationWorkspace({
    model: reviewedModel, browserPanel: React.createElement("div", null, "Embedded ChatGPT browser"), busy: false, error: "",
    onAction() {}, onReloadBrowser() {} })));
  assert.match(markup, /Approved Work Card|Implementer Report|Delivered work|Validate Passed|Request Repair/);
  assert.match(markup, /Copy advisory review handoff|Embedded ChatGPT browser|Report review/);
  assert.doesNotMatch(markup, /Begin bounded Repair|Close Work Item|Save Plan evidence/);
});

test("routed Repair is a separate Architect step with Prepare Copy Refresh and disposition", () => {
  const model = { ...reviewedModel, actions: ["prepare", "copy", "check-draft", "review-contract"],
    current: { ...reviewedModel.current, repairId: "R01", implementationId: "R01",
      contractTargetPath: "planning/repair-card.md",
      contract: { path: "planning/repair-card.md", body: "# Repair Work Card", revision: 1, disposition: "Pending" } } };
  const markup = renderToStaticMarkup(withState(["repair-card", ""], () => RoutedRepairWorkspace({ model,
    browserPanel: React.createElement("div", null, "Embedded ChatGPT browser"), busy: false, error: "",
    onAction() {}, onReloadBrowser() {} })));
  assert.match(markup, /Repair Work Card|Governing Implementer Report|Embedded ChatGPT browser/);
  assert.match(markup, /Prepare Handoff|Copy Handoff|Refresh|Approve Repair Work Card|Request Revision/);
  assert.doesNotMatch(markup, /Close Work Item|Save Plan evidence|Integrate completed/);
  assert.equal(requiredRoutedExecutionStep(model), "repair");
});

test("routed Close presents its evidence and returns to the Work Item Map", async () => {
  const model = { ...reviewedModel, actions: ["close"], execution: { ...executionModel.execution,
    workItems: [{ ...executionModel.execution.workItems[0], stage: "close" }] } };
  const markup = renderToStaticMarkup(RoutedCloseWorkspace({ model, busy: false, error: "", onAction() {}, onReturnMap() {} }));
  assert.match(markup, /Close Evidence|Close Work Item|Return to Work Item Map|Next eligible Work Item/);
  assert.doesNotMatch(markup, /Validate Passed|Prepare Handoff|Integrate completed/);
  const originalWindow = global.window;
  const steps = [];
  global.window = { champcity: { async runRoutedWorkflow() { return { ...model, actions: [], current: null }; } } };
  try {
    const parent = withState([model, executionPlan, "close-next", false, ""], () => RoutedExecutionWorkspace({
      intakeId: "intake-1", selectedWorkItemId: "WI01", browserPanel: null, onSelectWorkItem() {}, onDecompose() {},
      onReloadBrowser() {}, onStepChange: (step) => steps.push(step), onIntegration() {} }));
    const close = elements(parent).find((entry) => entry.type?.name === "RoutedCloseWorkspace");
    assert.ok(close);
    close.props.onAction("close");
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(steps, ["map"]);
  } finally { global.window = originalWindow; }
});

test("eligible Phase and Plan acceptance use their own evidence workspace", () => {
  const boundary = { boundary: { kind: "phase", phaseId: "P01" }, relativePath: "planning/phase-acceptance.md",
    acceptanceCriteria: ["Navigation works"], eligible: true, fresh: true, reasons: [], artifactRevision: 1,
    disposition: "Pending", criteria: [{ criterion: "Navigation works", status: "passed", evidencePaths: ["planning/report.md"] }] };
  const model = { ...reviewedModel, current: null, actions: ["save-acceptance", "review-acceptance"],
    execution: { ...executionModel.execution, acceptance: [boundary] } };
  const markup = renderToStaticMarkup(withState(["", "Ready", []], () => RoutedAcceptanceWorkspace({ model,
    busy: false, error: "", onAction() {}, onReturnMap() {}, onIntegration() {} })));
  assert.match(markup, /Phase P01 acceptance|Navigation works|Save Phase P01 evidence|Approve Phase P01 acceptance|Request Revision/);
  assert.match(markup, /Return to Work Item Map|Acceptance document details/);
  assert.doesNotMatch(markup, /Validate Passed|Prepare Handoff|Close Work Item/);
  assert.equal(requiredRoutedExecutionStep(model), "acceptance");
});

test("routed Issue bridge opens one Issue then continues the same Issue without duplicate RCA controls", async () => {
  const originalWindow = global.window;
  const calls = [];
  global.window = { champcity: { async runWorkIssueAction(intakeId, action) {
    calls.push({ intakeId, action }); return { issueId: "ISSUE_001" };
  } } };
  try {
    const open = withState([{ issueId: null }, false, ""], () => RoutedIssueBridge({ intakeId: "intake-1",
      async onOpenIssue(issueId) { calls.push({ opened: issueId }); } }));
    const openMarkup = renderToStaticMarkup(open);
    assert.match(openMarkup, /Open Issue Resolution/);
    assert.doesNotMatch(openMarkup, /Approve RCA|Correction execution|Plan acceptance/);
    elements(open).find((entry) => entry.type === "button").props.onClick();
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(calls, [{ intakeId: "intake-1", action: "open" }, { opened: "ISSUE_001" }]);

    calls.length = 0;
    const continued = withState([{ issueId: "ISSUE_001" }, false, ""], () => RoutedIssueBridge({ intakeId: "intake-1",
      async onOpenIssue(issueId) { calls.push({ opened: issueId }); } }));
    assert.match(renderToStaticMarkup(continued), /Continue Issue Resolution/);
    elements(continued).find((entry) => entry.type === "button").props.onClick();
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(calls, [{ opened: "ISSUE_001" }]);
  } finally { global.window = originalWindow; }
});

test("routed Issue transition selects existing Architect Planning and Issue workflow", async () => {
  const steps = [];
  await activateRoutedIssueWorkspace("ISSUE_001", {
    async refreshInventory(issueId) { steps.push(`inventory:${issueId}`); },
    async getNavigation(issueId) { steps.push(`navigation:${issueId}`); return { issueId }; },
    selectIssue(issueId) { steps.push(`select:${issueId}`); },
    setNavigation(value) { steps.push(`projection:${value.issueId}`); },
    setArchitectPlanning() { steps.push("architect-planning"); },
    showIssueWorkflow() { steps.push("issue-resolution"); },
  });
  assert.deepEqual(steps, ["inventory:ISSUE_001", "navigation:ISSUE_001", "select:ISSUE_001",
    "projection:ISSUE_001", "architect-planning", "issue-resolution"]);
});

test("routed Issue lineage remains queryable from canonical handoff after UI state is lost", async (t) => {
  const { seedPreparedRoutedWorkIntake, bypassWorkIntakeBranchVerification } = require("../support/work-intake-fixtures.cjs");
  const fixture = seedPreparedRoutedWorkIntake(t, "issue-resolution");
  bypassWorkIntakeBranchVerification(t);
  const { runWorkIssueAction } = require("../../dist/main/workPlanning/workIssueRoutingService.js");
  const { getRoutedIssueLineage } = require("../../dist/main/workPlanning/routedIssueLineageService.js");
  const opened = await runWorkIssueAction(fixture.root, fixture.intake.intakeId, "open");
  const issueId = opened.model.issueId;
  const expected = { issueId, intakeId: fixture.intake.intakeId,
    routeDecisionId: fixture.route.selection.decisionId, handoffPath: opened.model.handoffPath };
  assert.deepEqual(getRoutedIssueLineage(fixture.root, issueId), expected);
  assert.deepEqual(getRoutedIssueLineage(fixture.root, issueId), expected);
  assert.equal(getRoutedIssueLineage(fixture.root, "ISSUE_999"), null);
  const handoffFile = path.join(fixture.root, opened.model.handoffPath);
  const { parseCanonicalMarkdownDocument, serializeCanonicalMarkdownDocument } = require("../../dist/shared/documents/canonicalMarkdown.js");
  const handoff = parseCanonicalMarkdownDocument(fs.readFileSync(handoffFile, "utf8"));
  fs.writeFileSync(handoffFile, serializeCanonicalMarkdownDocument({ ...handoff.metadata, participationRole: "historical" }, handoff.bodyMarkdown));
  assert.deepEqual(getRoutedIssueLineage(fixture.root, issueId), expected, "superseded route still retains source lineage");
});

test("Issue reframe offers return to Work Intake Routing without selecting a replacement route", () => {
  const lineage = { issueId: "ISSUE_001", intakeId: "intake-1", routeDecisionId: "decision-1", handoffPath: "planning/handoff.md" };
  const calls = [];
  const none = React.createElement(RoutedIssueReturnNav, { lineage, rerouteRecommended: false, error: "",
    onReturnToRouting(value) { calls.push(value); } });
  assert.doesNotMatch(renderToStaticMarkup(none), /Return to Work Intake Routing/);
  const recommended = RoutedIssueReturnNav({ lineage, rerouteRecommended: true, error: "",
    onReturnToRouting(value) { calls.push(value); } });
  assert.match(renderToStaticMarkup(recommended), /Return to Work Intake Routing/);
  elements(recommended).find((entry) => entry.type === "button").props.onClick();
  assert.deepEqual(calls, [lineage]);
});

test("approved Research assessment advances directly to Integration", async (t) => {
  const fixture = seedResearchIntegrationCompletion(t);
  const { getWorkIntakeNavigation } = require("../../dist/main/workIntake/workIntakeNavigationService.js");
  const navigation = await getWorkIntakeNavigation(fixture.root, fixture.intake.intakeId);
  assert.equal(navigation.requiredStageId, "integration");
  assert.deepEqual(navigation.stages.filter((stage) => stage.available).map((stage) => stage.stageId),
    ["intake", "routing", "assessment", "integration"]);
  assert.equal(navigation.stages.find((stage) => stage.stageId === "plan").available, false);
  assert.equal(navigation.stages.find((stage) => stage.stageId === "execution").available, false);
});

test("Research Integration keeps Research language and the direct integrate action", () => {
  const model = { intakeId: "intake-1", route: "research-prototype", workBranch: "work-intake/research",
    targetBranch: "main", actions: ["integrate"], reasons: [], integration: { status: "ready", reasons: [],
      completionKind: "research", completionFingerprint: "a".repeat(64), checkpointCommits: [] } };
  const markup = renderToStaticMarkup(withState([model, false, "", ""], () => RoutedIntegrationWorkspace({ intakeId: model.intakeId })));
  assert.match(markup, /Research Integration|Integrate completed Research/);
  assert.doesNotMatch(markup, /Plan execution|Begin approved Plan|Current Work Item|Plan acceptance/);
});

const repairCandidateId = "a".repeat(64);
const repairIntegrationModel = { intakeId: "intake-1", route: "feature-change", workBranch: "work-intake/feature",
  targetBranch: "main", actions: ["run-integration-repair", "integration-decision"], reasons: [],
  integration: { status: "repair-required", reasons: ["Candidate validation failed"], completionKind: "plan",
    completionFingerprint: "b".repeat(64), checkpointCommits: [], candidate: { candidateId: repairCandidateId,
      targetBranch: "main", incomingBranch: "work-intake/feature",
      validation: [{ checkId: "build", exitCode: 1, summary: "Type error" }], message: "Repair source" } },
  repair: { repairId: "REPAIR01", candidateId: repairCandidateId, status: "prepared", message: "Bounded source resolution prepared.",
    policy: { editablePaths: ["src/change.ts"] }, prompt: "# Governing intent" },
  integrationRepairImplementer: { state: "ready", executionKind: "integration-repair", canRunAgain: true,
    canResolveEnvironment: false, approvalTail: [], runtimeDenialTail: [], eventTail: [], stderrTail: [],
    finalResponseTail: [], pendingApproval: null, pendingUserInput: null, pendingMcpElicitation: null, runtimeState: null },
};

test("repair-required Integration exposes in-product Codex without JSON patch transfer", () => {
  const markup = renderToStaticMarkup(withState([repairIntegrationModel, false, "", ""], () =>
    RoutedIntegrationWorkspace({ intakeId: repairIntegrationModel.intakeId })));
  assert.match(markup, /Integration Repair required|Continue to Integration Repair|Run Integration Repair|Codex execution console|Required validation|Failed/);
  assert.match(markup, /<h2>Integration Repair<\/h2>.*Attempt REPAIR01/);
  assert.doesNotMatch(markup, /Integration Repair patch response|Apply source patch|<dt>Implementer Report<\/dt>|<dt>Work Card Contract<\/dt>/);
});

test("Integration Repair action sends exact candidate and repair identity to the application", async () => {
  const originalWindow = global.window;
  const calls = [];
  global.window = { champcity: { async runRoutedWorkflow(intakeId, action, input) {
    calls.push({ intakeId, action, input }); return repairIntegrationModel;
  } } };
  try {
    const view = withState([repairIntegrationModel, false, "", ""], () =>
      RoutedIntegrationWorkspace({ intakeId: repairIntegrationModel.intakeId }));
    const controls = elements(view).find((element) => element.type?.name === "CodexExecutionActions");
    assert.ok(controls);
    controls.props.onRun({ model: "gpt-6-sol", reasoningEffort: "high" });
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(calls, [{ intakeId: "intake-1", action: "run-integration-repair", input: {
      expectedFingerprint: "b".repeat(64), candidateId: repairCandidateId, repairId: "REPAIR01",
      selection: { model: "gpt-6-sol", reasoningEffort: "high" },
    } }]);
  } finally { global.window = originalWindow; }
});

test("Integration displays an explicit Operator decision for incompatible accepted intent", () => {
  const model = { ...repairIntegrationModel, actions: [], integration: { ...repairIntegrationModel.integration,
    status: "operator-decision-required", completionKind: "research", candidate: {
      ...repairIntegrationModel.integration.candidate, message: "Accepted intent conflicts." } } };
  const markup = renderToStaticMarkup(withState([model, false, "", ""], () =>
    RoutedIntegrationWorkspace({ intakeId: model.intakeId })));
  assert.match(markup, /Operator decision required|Accepted intent conflicts\./);
  assert.doesNotMatch(markup, /Run Integration Repair|Apply source patch/);
});
