const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const {
  deriveArchitectInterviewRailStatus,
  deriveProjectRailPresentation,
  isArchitectInterviewDualPaneWorkspace,
  shouldRenderGenericPreviewDispositionControls,
  shouldRenderInlineProjectIntakeDisposition,
  shouldRenderPhaseMapDispositionControls,
} = require("../../dist/shared/workspaces/projectRailPresentation.js");
const {
  deriveProjectLifecycleRailStatuses,
} = require("../../dist/shared/workspaces/projectLifecycleRailStatus.js");
const {
  getProjectPlanningWorkspaceModel,
} = require("../../dist/main/projectPlanning/projectPlanningService.js");
const {
  listPlanningDocuments,
  seedApprovedProjectIntake,
  seedPhaseMap,
  tempWorkspace,
  writeDoc,
} = require("../support/canonical-markdown-fixtures.cjs");

test("top rail separates viewed workspace from current required workspace", () => {
  const projectIntake = deriveProjectRailPresentation({
    activeWorkspaceId: "project-intake-capture",
    requiredWorkspaceId: "architect-interview",
    destinationWorkspaceId: "project-intake-capture",
    statusLabel: "Completed",
  });
  const architectInterview = deriveProjectRailPresentation({
    activeWorkspaceId: "project-intake-capture",
    requiredWorkspaceId: "architect-interview",
    destinationWorkspaceId: "architect-interview",
  });

  assert.equal(projectIntake.isSelected, true);
  assert.equal(projectIntake.isRequired, false);
  assert.equal(architectInterview.isSelected, false);
  assert.equal(architectInterview.isRequired, true);
});

test("top rail allows the viewed workspace to also be required", () => {
  const architectInterview = deriveProjectRailPresentation({
    activeWorkspaceId: "architect-interview",
    requiredWorkspaceId: "architect-interview",
    destinationWorkspaceId: "architect-interview",
  });
  const projectIntake = deriveProjectRailPresentation({
    activeWorkspaceId: "project-intake-capture",
    requiredWorkspaceId: "project-intake-capture",
    destinationWorkspaceId: "project-intake-capture",
    statusLabel: "Awaiting Approval",
  });

  assert.equal(architectInterview.isSelected, true);
  assert.equal(architectInterview.isRequired, true);
  assert.equal(projectIntake.isSelected, true);
  assert.equal(projectIntake.isRequired, true);
});

test("required state does not alter Project Intake lifecycle status text", () => {
  const projectIntake = deriveProjectRailPresentation({
    activeWorkspaceId: "project-intake-capture",
    requiredWorkspaceId: "project-intake-capture",
    destinationWorkspaceId: "project-intake-capture",
    statusLabel: "Completed",
  });

  assert.equal(projectIntake.statusLabel, "Completed");
});

test("top rail has no required card when no required workspace is supplied", () => {
  const projectIntake = deriveProjectRailPresentation({
    activeWorkspaceId: "project-intake-capture",
    requiredWorkspaceId: null,
    destinationWorkspaceId: "project-intake-capture",
  });
  const architectInterview = deriveProjectRailPresentation({
    activeWorkspaceId: "project-intake-capture",
    requiredWorkspaceId: null,
    destinationWorkspaceId: "architect-interview",
  });

  assert.equal(projectIntake.isRequired, false);
  assert.equal(architectInterview.isRequired, false);
});

test("Project Intake disposition controls render inline only for the selected intake document", () => {
  assert.equal(
    shouldRenderInlineProjectIntakeDisposition(
      "project-intake-capture",
      "project-intake",
      "project-intake",
    ),
    true,
  );
  assert.equal(
    shouldRenderInlineProjectIntakeDisposition(
      "project-intake-capture",
      "project-intake",
      "architect-prompt",
    ),
    false,
  );
  assert.equal(
    shouldRenderInlineProjectIntakeDisposition(
      "architect-interview",
      "project-intake",
      "project-intake",
    ),
    false,
  );
});

test("generic preview disposition footer is suppressed only for Project Intake and specialized workspaces", () => {
  assert.equal(shouldRenderGenericPreviewDispositionControls("project-intake-capture", false), false);
  assert.equal(shouldRenderGenericPreviewDispositionControls("architect-interview", true), false);
  assert.equal(shouldRenderGenericPreviewDispositionControls("work-card-intake", false), true);
});

test("Architect Interview rail status is evidence-derived and independent from selected state", () => {
  const presentation = deriveProjectRailPresentation({
    activeWorkspaceId: "architect-interview",
    requiredWorkspaceId: "architect-interview",
    destinationWorkspaceId: "architect-interview",
    architectInterviewStatus: "Waiting for Output",
  });

  assert.equal(presentation.isSelected, true);
  assert.equal(presentation.isRequired, true);
  assert.equal(presentation.statusLabel, "Waiting for Output");
  assert.equal(deriveArchitectInterviewRailStatus({ railStatus: "Completed" }), "Completed");
  assert.equal(deriveArchitectInterviewRailStatus(null), "Not Ready");
});

test("Architect Interview rail uses SQL model status independently of historical files", () => {
  const model = {railStatus: "Completed"};
  const statuses = deriveProjectLifecycleRailStatuses([], {projectIntakeStatus: "Completed", architectInterviewStatus: deriveArchitectInterviewRailStatus(model), projectPlanningStatus: "Ready"});
  assert.equal(statuses["architect-interview"], "Completed"); assert.equal(statuses["project-planning-review"], "Ready");
});

test("Architect disposition controls belong to the structured cycle component", () => {
  const source = require("node:fs").readFileSync(path.join(__dirname, "../../src/renderer/app/StructuredArchitectWorkspace.tsx"), "utf8");
  assert.doesNotMatch(source, /canReviewArchitectRevision/); assert.match(source, /expectedRecordVersion: model!\.review!\.recordVersion/);
});

test("embedded Architect workspaces use dual-pane mode without changing other workspaces", () => {
  assert.equal(isArchitectInterviewDualPaneWorkspace("architect-interview"), true);
  assert.equal(isArchitectInterviewDualPaneWorkspace("project-planning-review"), true);
  assert.equal(isArchitectInterviewDualPaneWorkspace("project-phase-map"), true);
  assert.equal(isArchitectInterviewDualPaneWorkspace("work-card-planning"), true);
  assert.equal(isArchitectInterviewDualPaneWorkspace("work-card-building-review"), true);
  assert.equal(isArchitectInterviewDualPaneWorkspace("work-card-report-review"), true);
  assert.equal(isArchitectInterviewDualPaneWorkspace("work-card-repair"), true);
  assert.equal(isArchitectInterviewDualPaneWorkspace("project-intake-capture"), false);
});

test("Phase Map disposition controls render only for readable selected Phase Map review outputs", () => {
  const phaseMapOutput = {
    metadata: { artifactType: "phase-map" },
    effectiveDisposition: "Pending",
    documentReadState: "readable",
  };

  assert.equal(shouldRenderPhaseMapDispositionControls(null), false);
  assert.equal(shouldRenderPhaseMapDispositionControls(phaseMapOutput), true);
  assert.equal(
    shouldRenderPhaseMapDispositionControls({
      ...phaseMapOutput,
      effectiveDisposition: "Rejected",
    }),
    true,
  );
  assert.equal(
    shouldRenderPhaseMapDispositionControls({
      ...phaseMapOutput,
      effectiveDisposition: "RevisionRequested",
    }),
    true,
  );
  assert.equal(
    shouldRenderPhaseMapDispositionControls({
      ...phaseMapOutput,
      effectiveDisposition: "Approved",
    }),
    false,
  );
  assert.equal(
    shouldRenderPhaseMapDispositionControls({
      ...phaseMapOutput,
      metadata: { artifactType: "generated-handoff", participationRole: "nonReviewHandoff" },
    }),
    false,
  );
  assert.equal(
    shouldRenderPhaseMapDispositionControls({
      ...phaseMapOutput,
      readError: "Invalid canonical Markdown.",
    }),
    false,
  );
});

test("all top project rail cards receive one title-cased lifecycle status", () => {
  const statuses = deriveProjectLifecycleRailStatuses([], {
    projectIntakeStatus: "Open",
    architectInterviewStatus: "Open",
    projectPlanningStatus: "Not Ready",
  });

  assert.deepEqual(Object.keys(statuses).sort(), [
    "architect-interview",
    "phase-interview",
    "project-close",
    "project-intake-capture",
    "project-phase-map",
    "project-planning-review",
    "project-validation",
  ]);
  for (const status of Object.values(statuses)) {
    assert.doesNotMatch(status, /^[A-Z_]+$/);
  }
});

test("project rail consumes Project Planning blocker state from the current model input", () => {
  const statuses = deriveProjectLifecycleRailStatuses([], {
    projectIntakeStatus: "Completed",
    architectInterviewStatus: "Completed",
    projectPlanningStatus: "Needs Attention",
  });

  assert.equal(statuses["project-planning-review"], "Needs Attention");
  assert.equal(statuses["project-phase-map"], "Needs Attention");
  assert.equal(statuses["project-intake-capture"], "Completed");
  assert.equal(statuses["architect-interview"], "Completed");
});

test("project rail reports duplicate current Phase Maps as Needs Attention", () => {
  const root = tempWorkspace("champcity-rail-phase-map-conflict-");
  seedCompletedProjectPlanning(root);
  seedPhaseMapHandoff(root);
  seedPhaseMap(root, "phase-01");
  writeDoc(root, "planning/project/Phase_Map/PHASE_MAP_duplicate.md", "phase-map", "Approved", {
    workflowData: {
      phases: [{ phaseId: "phase-01", title: "Duplicate", order: 1 }],
    },
  });

  const statuses = deriveProjectLifecycleRailStatuses(listPlanningDocuments(root), {
    projectIntakeStatus: "Completed",
    architectInterviewStatus: "Completed",
    projectPlanningStatus: "Completed",
  });

  assert.equal(statuses["project-phase-map"], "Needs Attention");
});

test("project rail rejects duplicate closeouts for one phase but accepts distinct phase closeouts", () => {
  const root = tempWorkspace("champcity-rail-phase-closeout-conflict-");
  seedCompletedProjectPlanning(root);
  seedPhaseMapHandoff(root);
  seedPhaseMap(root, "phase-01");
  writeDoc(root, "planning/project/Phase_Map/PHASE_MAP_demo.md", "phase-map", "Approved", {
    workflowData: {
      phases: [
        { phaseId: "phase-01", title: "Phase 01", order: 1 },
        { phaseId: "phase-02", title: "Phase 02", order: 2 },
      ],
    },
  });
  writeDoc(root, "planning/phases/phase-01/Phase_Closeouts/PHASE_01_CLOSEOUT.md", "phase-closeout", "Approved", {
    identity: { phaseId: "phase-01" },
    workflowData: { closureDecision: "Close" },
  });
  writeDoc(root, "planning/phases/phase-02/Phase_Closeouts/PHASE_02_CLOSEOUT.md", "phase-closeout", "Approved", {
    identity: { phaseId: "phase-02" },
    workflowData: { closureDecision: "Close" },
  });

  const distinctStatuses = deriveProjectLifecycleRailStatuses(listPlanningDocuments(root), {
    projectIntakeStatus: "Completed",
    architectInterviewStatus: "Completed",
    projectPlanningStatus: "Completed",
  });
  assert.equal(distinctStatuses["phase-interview"], "Completed");

  writeDoc(root, "planning/phases/phase-01/Phase_Closeouts/PHASE_01_CLOSEOUT_duplicate.md", "phase-closeout", "Approved", {
    identity: { phaseId: "phase-01" },
    workflowData: { closureDecision: "Close" },
  });

  const duplicateStatuses = deriveProjectLifecycleRailStatuses(listPlanningDocuments(root), {
    projectIntakeStatus: "Completed",
    architectInterviewStatus: "Completed",
    projectPlanningStatus: "Completed",
  });
  assert.equal(duplicateStatuses["phase-interview"], "Needs Attention");
});

test("project rail reports duplicate current Project Closeouts as Needs Attention", () => {
  const root = tempWorkspace("champcity-rail-project-closeout-conflict-");
  seedCompletedProjectPlanning(root);
  seedPhaseMapHandoff(root);
  seedPhaseMap(root, "phase-01");
  writeDoc(root, "planning/phases/phase-01/Phase_Closeouts/PHASE_01_CLOSEOUT.md", "phase-closeout", "Approved", {
    identity: { phaseId: "phase-01" },
    workflowData: { closureDecision: "Close" },
  });
  writeDoc(root, "planning/project/Project_Closeout/PROJECT_CLOSEOUT_demo.md", "project-closeout", "Approved", {
    participationRole: "compoundGatingReview",
    workflowData: { closureDecision: "Close" },
  });
  writeDoc(root, "planning/project/Project_Closeout/PROJECT_CLOSEOUT_duplicate.md", "project-closeout", "Approved", {
    participationRole: "compoundGatingReview",
    workflowData: { closureDecision: "Close" },
  });

  const statuses = deriveProjectLifecycleRailStatuses(listPlanningDocuments(root), {
    projectIntakeStatus: "Completed",
    architectInterviewStatus: "Completed",
    projectPlanningStatus: "Completed",
  });

  assert.equal(statuses["project-validation"], "Needs Attention");
  assert.equal(statuses["project-close"], "Needs Attention");
});

function seedCompletedProjectPlanning(root) {
  const seeded = seedApprovedProjectIntake(root);
  writeDoc(root, seeded.interview, "project-architect-interview", "Approved", {
    sourceRevisions: [
      { path: seeded.intake, revision: 1 },
      { path: seeded.prompt, revision: 1 },
    ],
  });
  writeDoc(root, "planning/project/Project_Planning_Documents/PROJECT_PLANNING_DOCUMENTS_demo.md", "generated-handoff", "Approved", {
    participationRole: "nonReviewHandoff",
    sourceRevisions: [
      { path: seeded.intake, revision: 1 },
      { path: seeded.prompt, revision: 1 },
      { path: seeded.interview, revision: 1 },
    ],
    workflowData: {
      handoffKind: "project-planning",
      projectProfileTarget: "planning/project/PROJECT_PROFILE.md",
      projectRoadmapTarget: "planning/project/Project_Roadmap/PROJECT_ROADMAP_demo.md",
    },
  });
  writeDoc(root, "planning/project/PROJECT_PROFILE.md", "project-profile", "Approved", {
    participationRole: "compoundGatingReview",
  });
  writeDoc(root, "planning/project/Project_Roadmap/PROJECT_ROADMAP_demo.md", "project-roadmap", "Approved", {
    participationRole: "compoundGatingReview",
  });
}

function seedPhaseMapHandoff(root) {
  writeDoc(root, "planning/project/Phase_Map/PHASE_MAP_HANDOFF_demo.md", "generated-handoff", "Approved", {
    participationRole: "nonReviewHandoff",
    workflowData: { handoffKind: "phase-map" },
  });
}

const React = require("react");
const {renderToStaticMarkup} = require("react-dom/server");
const {loadRendererSourceModule} = require("./renderer-source-loader.cjs");
const recoveredRail = loadRendererSourceModule("src/renderer/app/GreenfieldNestedWorkflowRail.tsx");
const {NestedWorkflowRailShell} = loadRendererSourceModule("src/renderer/app/NestedWorkflowRailShell.tsx");

test("recovered nested rail preserves project, phase and Work Card hierarchy and exact navigation", () => {
  const calls = [];
  const model = recoveredRail.greenfieldNestedRailModel({activeWorkspaceId: "work-card-building-review", requiredWorkspaceId: "work-card-report-review", onWorkspaceChange: id => calls.push(id), projectIntakeStatus: "Completed"});
  const html = renderToStaticMarkup(React.createElement(NestedWorkflowRailShell, model));
  assert.match(html, /aria-label="Project pipeline"/);
  assert.match(html, /aria-label="Phase loop"/);
  assert.match(html, /aria-label="Work Card loop"/);
  assert.match(html, /01 Project Intake: Completed/);
  assert.match(html, /Phases: In Progress\. Current required step/);
  assert.match(html, /Implement: Current/);
  assert.match(html, /class="figma-sub-pill repair/);
  model.projectSteps[0].onClick();
  model.phaseLoop.onDestinationChange(model.phaseLoop.items[2].destination);
  model.workCardLoop.onDestinationChange(model.workCardLoop.items[3].destination);
  assert.deepEqual(calls, ["project-intake-capture", "phase-work-card-selection", "work-card-report-review"]);
});

test("recovered rail project-only inspection retains distinct selected and required steps", () => {
  const model = recoveredRail.greenfieldNestedRailModel({activeWorkspaceId: "project-intake-capture", requiredWorkspaceId: "architect-interview", onWorkspaceChange() {}, projectIntakeStatus: "Completed", architectInterviewStatus: "Waiting for Output"});
  assert.equal(model.phaseLoop, undefined); assert.equal(model.workCardLoop, undefined);
  assert.equal(model.projectSteps[0].state, "exact");
  assert.equal(model.projectSteps[0].presentation.isRequired, false);
  assert.equal(model.projectSteps[1].presentation.isRequired, true);
  const html = renderToStaticMarkup(React.createElement(NestedWorkflowRailShell, model));
  assert.match(html, /aria-current="page"/);
  assert.match(html, /Architect Interview: Waiting for Output\. Current required step/);
});

test("Greenfield recovered rail harness binds exact SQL navigation without advancing authority", async () => {
  const calls = [];
  const model = await recoveredRail.loadGreenfieldNestedRail({getGreenfieldNavigation: async id => {calls.push(id); return {workflowId:id, currentWorkspace:"phase-interview", currentPhaseId:"sql-phase", currentWorkItemId:null, closed:false, nextEligibleWorkspace:"phase-interview", reason:null};}}, "sql-workflow", {activeWorkspaceId:"phase-planning-bundle", onWorkspaceChange() {}});
  assert.deepEqual(calls, ["sql-workflow"]);
  assert.equal(model.phaseLoop.context.id, "sql-phase");
  assert.equal(model.phaseLoop.activeStepId, "phase-intake");
  assert.equal(model.projectSteps[4].presentation.isRequired, true);
  await assert.rejects(recoveredRail.loadGreenfieldNestedRail({getGreenfieldNavigation: async () => ({workflowId:"wrong"})}, "sql-workflow", {activeWorkspaceId:"project-intake-capture", onWorkspaceChange() {}}), /Exact Greenfield/);
});

test("recovered shell presents supplied not-ready loop actions as disabled", () => {
  const model = recoveredRail.greenfieldNestedRailModel({activeWorkspaceId:"phase-interview", onWorkspaceChange() {}});
  model.phaseLoop.items = model.phaseLoop.items.map(item => ({...item, available:false, reason:"SQL readiness blocker"}));
  const html = renderToStaticMarkup(React.createElement(NestedWorkflowRailShell, model));
  assert.match(html, /aria-disabled="true"/); assert.match(html, /disabled=""/); assert.match(html, /SQL readiness blocker/);
});
