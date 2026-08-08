const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  deriveArchitectInterviewRailStatus,
  deriveProjectRailPresentation,
  isArchitectInterviewDualPaneWorkspace,
  shouldRenderArchitectInterviewDispositionControls,
  shouldRenderGenericPreviewDispositionControls,
  shouldRenderInlineProjectIntakeDisposition,
  shouldRenderPhaseMapDispositionControls,
} = require("../../dist/shared/workspaces/projectRailPresentation.js");
const {
  deriveArchitectInterviewRailStatusFromDocuments,
  deriveProjectLifecycleRailStatuses,
} = require("../../dist/shared/workspaces/projectLifecycleRailStatus.js");
const {
  listPlanningDocuments,
  seedApprovedProjectIntake,
  seedPhaseMap,
  tempWorkspace,
  writeDoc,
} = require("../support/canonical-markdown-fixtures.cjs");

const railSourcePath = path.join(__dirname, "..", "..", "src", "renderer", "app", "NestedWorkflowRail.tsx");
const appSourcePath = path.join(__dirname, "..", "..", "src", "renderer", "app", "App.tsx");
const stylesSourcePath = path.join(__dirname, "..", "..", "src", "renderer", "styles.css");

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
  assert.equal(deriveArchitectInterviewRailStatus(null), "Open");
});

test("Architect Interview rail status can be derived from repository documents without active Architect model", () => {
  const root = tempWorkspace("champcity-rail-architect-doc-status-");
  const seeded = seedApprovedProjectIntake(root, "demo");
  let documents = listPlanningDocuments(root);

  assert.equal(deriveArchitectInterviewRailStatusFromDocuments(documents), "Waiting for Output");

  writeDoc(root, seeded.interview, "project-architect-interview", "Approved", {
    sourceRevisions: [
      { path: seeded.intake, revision: 1 },
      { path: seeded.prompt, revision: 1 },
    ],
  });
  documents = listPlanningDocuments(root);
  assert.equal(deriveArchitectInterviewRailStatusFromDocuments(documents), "Completed");

  const statuses = deriveProjectLifecycleRailStatuses(documents, {
    projectIntakeStatus: "Completed",
    architectInterviewStatus: deriveArchitectInterviewRailStatusFromDocuments(documents),
  });
  assert.notEqual(statuses["project-planning-review"], "Not Ready");
});

test("App does not derive Architect Interview rail status from unrelated active Architect-output model", () => {
  const appSource = fs.readFileSync(appSourcePath, "utf8");

  assert.match(appSource, /deriveArchitectInterviewRailStatusFromDocuments\(documents\)/);
  assert.match(appSource, /architectOutputModel\?\.workspaceId === "architect-interview"/);
});

test("App preserves completed Project Planning rail status over transient Architect-output state", () => {
  const appSource = fs.readFileSync(appSourcePath, "utf8");

  assert.match(appSource, /architectOutputModel\.workspaceId === "project-planning-review"/);
  assert.match(appSource, /statuses\["project-planning-review"\] === "Completed"/);
  assert.match(appSource, /break;/);
});

test("native select and option rows have explicit theme-readable colors", () => {
  const stylesSource = fs.readFileSync(stylesSourcePath, "utf8");

  assert.match(stylesSource, /select\s*\{[\s\S]*color:\s*var\(--foreground\)/);
  assert.match(stylesSource, /select\s+option\s*\{[\s\S]*background-color:\s*#eaecf0/);
  assert.match(stylesSource, /\.dark select\s*\{[\s\S]*color-scheme:\s*dark/);
  assert.match(stylesSource, /\.dark select option\s*\{[\s\S]*background-color:\s*#12151f/);
  assert.match(stylesSource, /select:disabled,[\s\S]*select option:disabled/);
});

test("light theme navigation rail uses explicit restrained contrast overrides", () => {
  const stylesSource = fs.readFileSync(stylesSourcePath, "utf8");

  assert.match(stylesSource, /html:not\(\.dark\) \.figma-pipeline-nav\s*\{[\s\S]*background:\s*#d7dce5/);
  assert.match(stylesSource, /html:not\(\.dark\) \.figma-context-loop-bar\s*\{[\s\S]*background:\s*#e0e4eb/);
  assert.match(stylesSource, /html:not\(\.dark\) \.figma-work-card-loop-bar\s*\{[\s\S]*background:\s*#e5e8ee/);
  assert.match(stylesSource, /html:not\(\.dark\) \.figma-pipeline-status\.completed\s*\{\s*color:\s*#166534/);
  assert.match(stylesSource, /html:not\(\.dark\) \.figma-pipeline-status\.in-progress\s*\{\s*color:\s*#0369a1/);
});

test("Architect Interview prompt selection hides disposition controls", () => {
  assert.equal(
    shouldRenderArchitectInterviewDispositionControls({
      selectedRole: "prompt",
      canApplyDisposition: true,
    }),
    false,
  );
  assert.equal(
    shouldRenderArchitectInterviewDispositionControls({
      selectedRole: "interview",
      canApplyDisposition: true,
    }),
    true,
  );
  assert.equal(
    shouldRenderArchitectInterviewDispositionControls({
      selectedRole: "interview",
      canApplyDisposition: false,
    }),
    false,
  );
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

test("Architect-output dual-pane preview renders the Figma review workspace panels", () => {
  const source = fs.readFileSync(appSourcePath, "utf8");

  assert.match(source, /figma-doc-chat-workspace/);
  assert.match(source, /<FigmaDocumentCard/);
  assert.match(source, /<FigmaArchitectReviewPanel/);
  assert.match(source, /aria-label="Document disposition"/);
  assert.match(source, /Apply Review/);
  assert.match(source, /onReview=\{applyArchitectOutputReview\}/);
  assert.match(source, /viewedArchitectOutputRevisionKeys/);
  assert.doesNotMatch(source, /<ArchitectOutputReviewShell/);
  assert.doesNotMatch(source, /<PhaseMapPreviewReview/);
  assert.doesNotMatch(source, /onReview=\{applyDisposition\}[\s\S]{0,120}Apply Phase Map Review/);
  assert.doesNotMatch(source, /Specialized review controls appear when the current outputs exist/);
});

test("project selector uses a stacked full-width action layout", () => {
  const source = fs.readFileSync(stylesSourcePath, "utf8");
  const actionsRule = source.match(/\.project-selector-actions\s*\{(?<body>[^}]*)\}/);

  assert.ok(actionsRule);
  assert.match(actionsRule.groups.body, /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.doesNotMatch(actionsRule.groups.body, /\bauto\b/);
  assert.match(source, /\.project-selector-actions \.text-button\s*\{[\s\S]*width:\s*100%/);
});

test("all top project rail cards receive one title-cased lifecycle status", () => {
  const statuses = deriveProjectLifecycleRailStatuses([], {
    projectIntakeStatus: "Open",
    architectInterviewStatus: "Open",
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

test("top project rail source does not render the static lower Open line", () => {
  const source = fs.readFileSync(railSourcePath, "utf8");
  assert.doesNotMatch(source, /group-hover:opacity-85[\s\S]*Open[\s\S]*<\/span>/);
});

test("visible Work Card loop has one Planning item and no separate Intake item", () => {
  const source = fs.readFileSync(railSourcePath, "utf8");
  const workCardLoopSource = source.slice(
    source.indexOf("const workCardLoopItems"),
    source.indexOf("const phaseStepIdsByLoopStep"),
  );

  assert.match(workCardLoopSource, /label:\s*"Work Card Map"/);
  assert.match(workCardLoopSource, /destination:\s*"phase-work-card-selection"/);
  assert.match(workCardLoopSource, /label:\s*"Planning"/);
  assert.match(workCardLoopSource, /destination:\s*"work-card-planning"/);
  assert.match(workCardLoopSource, /label:\s*"Implement"/);
  assert.match(workCardLoopSource, /destination:\s*"work-card-building-review"/);
  assert.match(workCardLoopSource, /label:\s*"Review & Validation"/);
  assert.match(workCardLoopSource, /destination:\s*"work-card-report-review"/);
  assert.match(workCardLoopSource, /label:\s*"Close \/ Next"/);
  assert.doesNotMatch(workCardLoopSource, /label:\s*"Validation"/);
  assert.doesNotMatch(workCardLoopSource, /destination:\s*"work-card-validation"/);
  assert.doesNotMatch(workCardLoopSource, /label:\s*"Work Card Intake"/);
  assert.doesNotMatch(workCardLoopSource, /destination:\s*"work-card-intake"/);
});

test("Work Card Architect workspaces reuse the shared dual-pane layout", () => {
  const appSource = fs.readFileSync(appSourcePath, "utf8");
  const stylesSource = fs.readFileSync(stylesSourcePath, "utf8");
  const existingArchitectRule = stylesSource.match(/\.document-workspace\.architect-interview-workspace\s*\{(?<body>[^}]*)\}/);

  assert.doesNotMatch(appSource, /workCardArchitectLayoutWorkspaceIds/);
  assert.doesNotMatch(appSource, /work-card-architect-workspace/);
  assert.match(appSource, /isArchitectInterviewDualPaneWorkspace\(activeWorkspaceId\)/);
  assert.ok(existingArchitectRule);
  assert.match(existingArchitectRule.groups.body, /minmax\(0,\s*0\.95fr\)\s+minmax\(0,\s*1\.05fr\)/);
  assert.doesNotMatch(stylesSource, /work-card-architect-workspace/);
});

test("project rail reports duplicate current Project Planning handoffs as Needs Attention", () => {
  const root = tempWorkspace("champcity-rail-project-planning-conflict-");
  seedCompletedProjectPlanning(root);
  writeDoc(root, "planning/project/Project_Planning_Documents/PROJECT_PLANNING_DOCUMENTS_demo_DUPLICATE.md", "generated-handoff", "Approved", {
    participationRole: "nonReviewHandoff",
    workflowData: {
      handoffKind: "project-planning",
      projectProfileTarget: "planning/project/PROJECT_PROFILE.md",
      projectRoadmapTarget: "planning/project/Project_Roadmap/PROJECT_ROADMAP_demo.md",
    },
  });

  const statuses = deriveProjectLifecycleRailStatuses(listPlanningDocuments(root), {
    projectIntakeStatus: "Completed",
    architectInterviewStatus: "Completed",
  });

  assert.equal(statuses["project-planning-review"], "Needs Attention");
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
  });
  assert.equal(distinctStatuses["phase-interview"], "Completed");

  writeDoc(root, "planning/phases/phase-01/Phase_Closeouts/PHASE_01_CLOSEOUT_duplicate.md", "phase-closeout", "Approved", {
    identity: { phaseId: "phase-01" },
    workflowData: { closureDecision: "Close" },
  });

  const duplicateStatuses = deriveProjectLifecycleRailStatuses(listPlanningDocuments(root), {
    projectIntakeStatus: "Completed",
    architectInterviewStatus: "Completed",
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
