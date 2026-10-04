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

test("Architect disposition controls belong to the structured cycle component", async () => {
  const {composeGreenfieldStage}=loadRendererSourceModule('src/renderer/app/GreenfieldStageComposition.tsx');
  const original={useState:React.useState,useEffect:React.useEffect,useRef:React.useRef,useMemo:React.useMemo},old=global.window;
  const model={review:{cycleId:'current-cycle',recordVersion:7,disposition:{state:'none'}},reviewDocument:{logicalDocumentId:'current-review',displayFilename:'ARCHITECT_REVIEW.md'}};
  const values=[model,'Operator notes','Approved','','',false,'architect-review'];let index=0;const calls=[];
  React.useState=initial=>[index<values.length?values[index++]:initial,()=>{}];React.useEffect=()=>{};React.useRef=initial=>({current:initial});React.useMemo=f=>f();
  global.window={champcity:{reviewStructuredArchitectOutput:async(...args)=>{calls.push(args);return model;}}};
  try {
    const adapter=composeGreenfieldStage({workflowId:'wf',selection:{stage:'architect-interview',phaseId:null,workItemId:null,repairId:null},browserPanel:React.createElement('aside'),resume:async()=>calls.push('canonical-refresh')});
    const shell=adapter.type(adapter.props);
    const panel=React.Children.toArray(shell.props.reviewControls.props.children).find(n=>n.type?.name==='FigmaDocumentDispositionPanel');
    panel.props.onApply();await new Promise(setImmediate);
    assert.deepEqual(calls,[['wf','current-cycle',{expectedRecordVersion:7,outcome:'approved',notes:'Operator notes'}],'canonical-refresh']);
  } finally {Object.assign(React,original);global.window=old;}
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
  const model = await recoveredRail.loadGreenfieldNestedRail({getGreenfieldNavigation: async id => {calls.push(id); return {workflowId:id, currentWorkspace:"phase-interview", currentPhaseId:"sql-phase", currentWorkItemId:null, closed:false, nextEligibleWorkspace:"phase-interview", reason:null,executionContext:{phase:{state:"active",phaseId:"sql-phase",dependsOn:[],loopStep:"Phase Intake",reason:""},workCard:{state:"none",dispositionOrState:"",reason:""}}};}}, "sql-workflow", {activeWorkspaceId:"phase-planning-bundle", onWorkspaceChange() {}});
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

const {ProjectPlanningBlockerBanner,ProjectPlanningReviewShell,ProjectPlanningBrowserActions}=require('./renderer-source-loader.cjs').loadRendererSourceModule('src/renderer/app/ProjectPlanningReviewShell.tsx');
function asPlanningBlocker(model, workspace='project-planning-review'){return model && workspace==='project-planning-review' && ['not-ready','needs-attention'].includes(model.state) ? {reason:model.reason,requiredAction:model.requiredAction,evidencePaths:model.evidencePaths} : null;}
function historicalPlanningBlockedModel(overrides = {}) {
  return {
    state: "needs-attention",
    railStatus: "Needs Attention",
    requiredAction: "Correct the Project Planning source mismatch.",
    reason: "Project Planning source revisions do not match the approved Architect Interview.",
    evidencePaths: [
      "planning/project/PROJECT_PROFILE.md",
      "planning/project/Project_Roadmap/PROJECT_ROADMAP_demo.md",
      "planning/project/Project_Planning_Documents/PROJECT_PLANNING_DOCUMENTS_demo.md",
      "planning/project/Project_Architect_Interviews/INTERVIEW_demo.md",
      "planning/project/Project_Intake/PROJECT_INTAKE_demo.md",
    ],
    handoffState: "not-prepared",
    canPrepareHandoff: false,
    canCopyHandoff: false,
    canApplyBundleDisposition: false,
    selectedPlanningDocumentRole: "profile",
    bundleSynchronizationState: "invalid",
    ...overrides,
  };
}

function renderPlanningBanner(props) {
  return renderToStaticMarkup(
    React.createElement(ProjectPlanningBlockerBanner, {blocker: asPlanningBlocker(props?.projectPlanningModel === undefined ? historicalPlanningBlockedModel() : props.projectPlanningModel, props?.activeWorkspaceId)}),
  );
}

test("Project Planning blocker banner renders exact reason and distinct required action", () => {
  const reason = "Exact current blocker reason from Project Planning.";
  const requiredAction = "Regenerate the Project Planning draft bundle from the approved interview.";
  const markup = renderPlanningBanner({
    projectPlanningModel: historicalPlanningBlockedModel({
      reason,
      requiredAction,
      evidencePaths: [],
    }),
  });

  assert.match(markup, /role="status"/);
  assert.match(markup, /Project Planning Needs Attention/);
  assert.match(markup, new RegExp(reason));
  assert.match(markup, new RegExp(`Required action:</strong> ${requiredAction}`));
});

test("Project Planning blocker banner suppresses duplicate required action text", () => {
  const reason = "The Project Planning blocker is already explained.";
  const markup = renderPlanningBanner({
    projectPlanningModel: historicalPlanningBlockedModel({
      reason,
      requiredAction: ` ${reason} `,
      evidencePaths: [],
    }),
  });

  assert.equal(markup.match(new RegExp(reason, "g"))?.length, 1);
  assert.doesNotMatch(markup, /Required action:/);
});

test("Project Planning blocker banner caps initial evidence and exposes disclosure", () => {
  const markup = renderPlanningBanner();

  assert.match(markup, /Evidence/);
  assert.match(markup, /planning\/project\/PROJECT_PROFILE\.md/);
  assert.match(markup, /planning\/project\/Project_Roadmap\/PROJECT_ROADMAP_demo\.md/);
  assert.match(markup, /planning\/project\/Project_Planning_Documents\/PROJECT_PLANNING_DOCUMENTS_demo\.md/);
  assert.doesNotMatch(markup, /planning\/project\/Project_Architect_Interviews\/INTERVIEW_demo\.md/);
  assert.doesNotMatch(markup, /planning\/project\/Project_Intake\/PROJECT_INTAKE_demo\.md/);
  assert.match(markup, /Show 2 more/);
});

test("Project Planning blocker banner renders no layout in non-blocked states or other workspaces", () => {
  assert.equal(
    renderPlanningBanner({
      projectPlanningModel: historicalPlanningBlockedModel({ state: "ready-for-handoff", railStatus: "Ready" }),
    }),
    "",
  );
  assert.equal(renderPlanningBanner({ activeWorkspaceId: "architect-interview" }), "");
  assert.equal(renderPlanningBanner({ projectPlanningModel: null }), "");
  assert.match(renderPlanningBanner({ projectPlanningModel: historicalPlanningBlockedModel({ state: "not-ready" }) }), /Project Planning Needs Attention/);
});

test("Project Planning evidence disclosure expands and collapses without changing model evidence", () => {
  const model = historicalPlanningBlockedModel();
  const snapshot = structuredClone(model);
  let expanded;
  const render = () => {
    const original = React.useState;
    React.useState = (initial) => {
      expanded ??= initial;
      return [expanded, (value) => { expanded = typeof value === "function" ? value(expanded) : value; }];
    };
    try { return ProjectPlanningBlockerBanner({blocker: asPlanningBlocker(model)}); }
    finally { React.useState = original; }
  };
  function nodes(element) {
    if (!element || typeof element !== "object") return [];
    return [element, ...React.Children.toArray(element.props?.children).flatMap(nodes)];
  }
  const initial = render();
  assert.equal(nodes(initial).filter((node) => node.type === "li").length, 3);
  const expand = nodes(initial).find((node) => node.type === "button");
  assert.equal(expand.props.children, "Show 2 more");
  expand.props.onClick();
  const opened = render();
  assert.deepEqual(nodes(opened).filter((node) => node.type === "li").map((node) => node.props.children), model.evidencePaths);
  const collapse = nodes(opened).find((node) => node.type === "button");
  assert.equal(collapse.props.children, "Show less");
  collapse.props.onClick();
  assert.equal(nodes(render()).filter((node) => node.type === "li").length, 3);
  assert.deepEqual(model, snapshot);
});


test('recovered Project Planning shell preserves document review before browser and revision actions',()=>{
  for(const browserVisible of [true,false]){
    const markup=renderToStaticMarkup(React.createElement(ProjectPlanningReviewShell,{label:'Project Planning Review Figma document workspace',browserVisible,blocker:null,document:{selectedDocument:null,documentError:'',feedback:'',onCopy(){}},review:{canApply:false,isApplying:true,notes:'',status:'',onNotesChange(){},onStatusChange(){},onApply(){},workflowStep:'Review & Validation'},browserCompanion:React.createElement('div',{className:'figma-browser-column'},'Architect')}));
    assert.match(markup,/figma-doc-chat-workspace/);assert.match(markup,/tabindex="-1"/);assert.equal(markup.includes('chat-hidden'),!browserVisible);assert.ok(markup.indexOf('figma-doc-review-column')<markup.indexOf('figma-browser-column'));assert.match(markup,/disabled=""/);
  }
  const markup=renderToStaticMarkup(React.createElement(ProjectPlanningBrowserActions,{canPrepareHandoff:true,canCopyHandoff:true,isRevisionRequest:true,onPrepareHandoff(){},onCopyHandoff(){},onReloadBrowser(){},onRefresh(){},onRetryBrowser(){}}));
  let last=-1;for(const label of ['Reload ChatGPT','Prepare Revision Request','Copy Revision Request','Refresh']){let index=markup.indexOf(label);assert.ok(index>last);last=index;}
});

test('recovered Project Planning adapter Refresh exposes both SQL documents and reviews the exact cycle',async t=>{
  const f=await require('../support/structured-architect-fixture.cjs').structuredArchitectFixture(t);
  await f.architect.review(f.root,f.workflow.id,f.candidate.review.cycleId,{expectedRecordVersion:f.candidate.review.recordVersion,outcome:'approved'});
  const service=require('../../dist/main/projectPlanning/structuredProjectPlanningService.js').createStructuredProjectPlanningService();
  const input={facts:[{title:'Verified',statement:'Current understanding',impact:'Bounded outcome'}],direction:{title:'Direction',objective:'Useful outcome',scopeIn:['First'],scopeOut:['Later'],constraints:[],assumptions:[],risks:[]},criteria:[{statement:'Useful',criticality:'required',verificationIntent:'Operator confirms',validationPolicy:'operator_decision'}]};
  await require('../../dist/main/workflow/workflowCandidateIngressService.js').createWorkflowCandidateIngressService().submit(f.root,{workflowId:f.workflow.id,stage:'project-planning',candidateJson:JSON.stringify(input)});
  const sql=await service.get(f.root,f.workflow.id),cycle=sql.review.cycleId,version=sql.review.recordVersion;
  const {StructuredProjectPlanningWorkspace}=require('./renderer-source-loader.cjs').loadRendererSourceModule('src/renderer/app/StructuredProjectPlanningWorkspace.tsx');
  const originals={useState:React.useState,useEffect:React.useEffect,useRef:React.useRef},oldWindow=global.window;const values=[sql,'','notes','Approved',false,'','profile',[`${cycle}@${version}:profile`]];let index=0;const calls=[];
  React.useState=initial=>{const position=index++;return [position<values.length?values[position]:initial,value=>{values[position]=typeof value==='function'?value(values[position]):value;}];};React.useEffect=()=>{};React.useRef=initial=>({current:initial});
  global.window={champcity:{getStructuredProjectPlanning:async id=>{calls.push(['get',id]);return service.get(f.root,id);},reviewStructuredProjectPlanning:async(...args)=>{calls.push(['review',...args]);return service.review(f.root,...args);}}};
  const render=()=>{index=0;return StructuredProjectPlanningWorkspace({workflowId:f.workflow.id,browserPanel:null,onNext:async()=>{const nav=await require('../../dist/main/workflow/greenfieldNavigationService.js').createGreenfieldNavigationService().get(f.root,f.workflow.id);assert.equal(nav.currentWorkspace,'project-phase-map');calls.push(['advance']);}});};
  try{
    let element=render();assert.equal(element.type.name,'ProjectPlanningReviewShell');assert.match(element.props.document.selectedDocument.bodyMarkdown,/Current understanding/);assert.equal(element.props.review.canApply,false);assert.match(element.props.review.warning,/Open every/);
    element.props.document.onSelectSlot('roadmap');element=render();assert.match(element.props.document.selectedDocument.bodyMarkdown,/Useful outcome/);assert.equal(element.props.review.canApply,true);
    element.props.browserCompanion.props.children[1].props.onRefresh();for(let n=0;n<100&&values[4];n++)await new Promise(resolve=>setTimeout(resolve,10));assert.deepEqual(calls[0],['get',f.workflow.id]);
    element=render();element.props.review.onApply();for(let n=0;n<100&&values[4];n++)await new Promise(resolve=>setTimeout(resolve,10));
    assert.deepEqual(calls[1],['review',f.workflow.id,cycle,{expectedRecordVersion:version,outcome:'approved',notes:'notes'}]);assert.equal(values[0].review.disposition.state,'approved');assert.deepEqual(calls[2],['advance']);
    values[1]='SQL readiness blocker';element=render();assert.equal(element.props.blocker.reason,'SQL readiness blocker');
  }finally{Object.assign(React,originals);global.window=oldWindow;}
});

test('Greenfield Architect rail preserves SQL completion unless an explicit model status is supplied',()=>{
 const {greenfieldNestedRailModel}=require('./renderer-source-loader.cjs').loadRendererSourceModule('src/renderer/app/GreenfieldNestedWorkflowRail.tsx');
 const props={activeWorkspaceId:'project-phase-map',requiredWorkspaceId:'project-phase-map',onWorkspaceChange(){},projectRailStatuses:{'architect-interview':'Completed'}};
 const status=extra=>greenfieldNestedRailModel({...props,...extra}).projectSteps.find(step=>step.id==='architect-interview').presentation.statusLabel;
 assert.equal(status({}),'Completed');
 assert.equal(status({architectInterviewStatus:'Needs Attention'}),'Needs Attention');
 assert.equal(status({architectInterviewStatus:'Awaiting Approval'}),'Awaiting Approval');
 assert.equal(status({activeWorkspaceId:'architect-interview',requiredWorkspaceId:'architect-interview',projectRailStatuses:{}}),'Open');
});
