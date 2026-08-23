const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const appSourcePath = path.join(__dirname, "..", "..", "src", "renderer", "app", "App.tsx");

test("shared document review surface renders selected document bodyMarkdown", () => {
  const appSource = fs.readFileSync(appSourcePath, "utf8");

  assert.match(appSource, /selectedDocument\?\.bodyMarkdown \?\? selectedDocument\?\.preview/);
  assert.match(appSource, /<pre className="preview-body">/);
});

test("document refresh reloads the still-selected document detail", () => {
  const appSource = fs.readFileSync(appSourcePath, "utf8");

  assert.match(appSource, /nextDocuments\.some\(\(document\) => document\.logicalDocumentId === selectedDocumentId\)/);
  assert.match(appSource, /await loadDocument\(selectedDocumentId, \{ preserveOnFailure: true \}\)/);
});

test("catalog Architect-output workspaces use the Figma document and browser action panels", () => {
  const appSource = fs.readFileSync(appSourcePath, "utf8");

  assert.match(appSource, /usesFigmaWorkspaceBody/);
  assert.match(appSource, /<section[\s\S]{0,240}className=\{\[[\s\S]{0,160}"figma-doc-chat-workspace"/);
  assert.match(appSource, /<FigmaDocumentCard/);
  assert.match(appSource, /<FigmaArchitectReviewPanel/);
  assert.match(appSource, /<FigmaBrowserActionsPanel/);
  assert.match(appSource, /isArchitectEnabledWorkspace\(activeWorkspaceId\)/);
  assert.match(appSource, /prepareArchitectOutputHandoff\(activeWorkspaceId\)/);
  assert.match(appSource, /copyArchitectOutputHandoff\(activeWorkspaceId\)/);
  assert.match(appSource, /reviewArchitectOutput\(/);
  assert.match(appSource, /!usesFigmaWorkspaceBody \? \(\s*<CurrentWorkspaceBanner/s);
  assert.doesNotMatch(appSource, /ProjectPlanningActionBar/);
  assert.doesNotMatch(appSource, /ProjectPlanningPreviewReview/);
  assert.doesNotMatch(appSource, /Workspace Migration Required/);
  assert.doesNotMatch(appSource, /Project Profile Markdown/);
  assert.doesNotMatch(appSource, /Project Roadmap Markdown/);
});

test("Phase Map uses its compact Figma phase-list workspace with shared browser handoff actions", () => {
  const appSource = fs.readFileSync(appSourcePath, "utf8");

  assert.match(appSource, /activeWorkspaceId === "project-phase-map"/);
  assert.match(appSource, /isPhaseMapFigmaWorkspace/);
  assert.match(appSource, /<FigmaPhaseMapWorkspace/);
  assert.match(appSource, /\{architectBrowserColumn\}/);
  assert.match(appSource, /isVisibleArchitectOutputWorkspace && !isPhaseMapFigmaWorkspace/);
  assert.match(appSource, /const architectBrowserWorkspaceAvailable =\s*isVisibleArchitectOutputWorkspace \|\| isWorkCardReportReview/);
  assert.match(appSource, /<FigmaBrowserActionsPanel/);
  assert.match(appSource, /Prepare Phase Map Handoff/);
  assert.match(appSource, /Copy Phase Map Handoff/);
  assert.match(appSource, /onPrepareHandoff=\{prepareArchitectOutputFromAction\}/);
  assert.match(appSource, /onCopyHandoff=\{copyArchitectHandoff\}/);
  assert.doesNotMatch(appSource, /PhaseMapActionBar/);
  assert.doesNotMatch(appSource, /PhaseMapPreviewReview/);
  assert.doesNotMatch(appSource, /copyPhaseMapHandoff/);
  assert.doesNotMatch(appSource, /Phase Map Markdown/);
  assert.doesNotMatch(appSource, /savePhaseMapOutput/);
});

test("application shell routes workflow navigation through one transition helper", () => {
  const appSource = fs.readFileSync(appSourcePath, "utf8");

  assert.match(appSource, /function transitionToWorkflowStep\(/);
  assert.match(appSource, /onWorkspaceChange=\{transitionToWorkflowStep\}/);
  assert.match(appSource, /function documentIdForWorkflowStep\(/);
  assert.match(appSource, /classifyPlanningDocument\(document\)\.workspaceId === destinationWorkspaceId/);
  assert.match(appSource, /isWorkflowReviewDocument\(document, destinationWorkspaceId\)/);
  assert.doesNotMatch(appSource, /onWorkspaceChange=\{setActiveWorkspaceId\}/);
  assert.doesNotMatch(appSource, /onClick=\{\(\) => setActiveWorkspaceId/);
});

test("renderer imports the shared strict workflow review predicate", () => {
  const appSource = fs.readFileSync(appSourcePath, "utf8");
  const helperSource = fs.readFileSync(path.join(process.cwd(), "src", "renderer", "app", "workflowReviewDocuments.ts"), "utf8");

  assert.match(appSource, /from "\.\/workflowReviewDocuments"/);
  assert.doesNotMatch(appSource, /function isWorkflowReviewDocument\(document: PlanningDocumentSummary\)/);
  assert.match(helperSource, /participationRole === "gatingReview"/);
  assert.match(helperSource, /participationRole === "compoundGatingReview"/);
  assert.match(helperSource, /classification\.workspaceId === workspaceId/);
  assert.doesNotMatch(helperSource, /participationRole !== "nonReviewHandoff"/);
});

test("left sidebar owns project selection and does not duplicate workflow-step lists", () => {
  const appSource = fs.readFileSync(appSourcePath, "utf8");
  const sidebarSource = fs.readFileSync(path.join(process.cwd(), "src", "renderer", "app", "figma", "FigmaSidebar.tsx"), "utf8");

  assert.match(appSource, /<FigmaSidebar/);
  assert.match(sidebarSource, /<aside className="sidebar figma-sidebar" aria-label="Project navigation">/);
  assert.match(sidebarSource, /aria-label="Select Project"/);
  assert.match(sidebarSource, /Choose Project/);
  assert.match(sidebarSource, /Clear Project/);
  assert.doesNotMatch(appSource, /<small>\{workspace\.ok \? workspace\.workspaceRoot/);
  assert.doesNotMatch(appSource, /Choose Workspace/);
  assert.doesNotMatch(appSource, /Selected workspace/);
  assert.doesNotMatch(appSource, /navigationGroups/);
  assert.doesNotMatch(appSource, /workspace-tab/);
});

test("Phase Map actions do not offer disposition before a Phase Map output is selected", () => {
  const appSource = fs.readFileSync(appSourcePath, "utf8");

  assert.match(appSource, /const selectedDocumentIsPhaseMapOutput = Boolean/);
  assert.match(appSource, /activeWorkspaceId !== "project-phase-map" \|\| selectedDocumentIsPhaseMapOutput/);
  assert.match(appSource, /selectedDocument\.metadata\.participationRole !== "nonReviewHandoff"/);
  assert.match(appSource, /No documents in this workflow step\./);
});

test("Work Card Planning preparation uses the intake view instead of generic document review", () => {
  const appSource = fs.readFileSync(appSourcePath, "utf8");

  assert.match(appSource, /<WorkCardIntakeWorkspace/);
  assert.match(appSource, /isWorkCardPlanningPreparation/);
  assert.match(appSource, /const isFigmaActionWorkspace =/);
  assert.match(appSource, /<FigmaActionWorkspace/);
  assert.match(appSource, /generateWorkCardIntakeAndTransition/);
  assert.match(appSource, /window\.champcity\.generateCurrentHandoff\(\)/);
  assert.match(appSource, /nextModel\?\.activeWorkspaceId !== "work-card-planning" \|\| nextModel\.workCardIntake/);
  assert.match(appSource, /!isWorkCardPlanningPreparation &&\s*!isWorkCardBuildingReview &&\s*!isWorkCardReportReview &&\s*!isFigmaActionWorkspace/);
  assert.doesNotMatch(appSource, /Generate Work Card Intake Handoff[\s\S]*CurrentActionPanel/);
});
