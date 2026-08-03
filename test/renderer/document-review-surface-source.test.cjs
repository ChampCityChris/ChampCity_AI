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

test("catalog Architect-output workspaces use the generic action and review shell", () => {
  const appSource = fs.readFileSync(appSourcePath, "utf8");

  assert.match(appSource, /<ArchitectOutputActionBar/);
  assert.match(appSource, /<ArchitectOutputReviewShell/);
  assert.match(appSource, /isArchitectEnabledWorkspace\(activeWorkspaceId\)/);
  assert.match(appSource, /prepareArchitectOutputHandoff\(activeWorkspaceId\)/);
  assert.match(appSource, /copyArchitectOutputHandoff\(activeWorkspaceId\)/);
  assert.match(appSource, /reviewArchitectOutput\(/);
  assert.doesNotMatch(appSource, /ProjectPlanningActionBar/);
  assert.doesNotMatch(appSource, /ProjectPlanningPreviewReview/);
  assert.doesNotMatch(appSource, /Workspace Migration Required/);
  assert.doesNotMatch(appSource, /Project Profile Markdown/);
  assert.doesNotMatch(appSource, /Project Roadmap Markdown/);
});

test("Phase Map uses generic Architect-output controls with structured preview plug-in only", () => {
  const appSource = fs.readFileSync(appSourcePath, "utf8");

  assert.match(appSource, /activeWorkspaceId === "project-phase-map"/);
  assert.match(appSource, /PhaseMapDocumentPreview/);
  assert.match(appSource, /ArchitectOutputActionBar/);
  assert.doesNotMatch(appSource, /PhaseMapActionBar/);
  assert.doesNotMatch(appSource, /PhaseMapPreviewReview/);
  assert.doesNotMatch(appSource, /Prepare Phase Map Handoff/);
  assert.doesNotMatch(appSource, /Copy Phase Map Handoff/);
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
  assert.doesNotMatch(appSource, /onWorkspaceChange=\{setActiveWorkspaceId\}/);
  assert.doesNotMatch(appSource, /onClick=\{\(\) => setActiveWorkspaceId/);
});

test("left sidebar owns project selection and does not duplicate workflow-step lists", () => {
  const appSource = fs.readFileSync(appSourcePath, "utf8");

  assert.match(appSource, /<aside className="sidebar" aria-label="Project navigation">/);
  assert.match(appSource, /<section className="project-selector" aria-label="Selected Project">/);
  assert.match(appSource, /Choose Project/);
  assert.match(appSource, /Clear Project/);
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
  assert.match(appSource, /generateWorkCardIntakeAndTransition/);
  assert.match(appSource, /window\.champcity\.generateCurrentHandoff\(\)/);
  assert.match(appSource, /nextModel\?\.activeWorkspaceId !== "work-card-planning" \|\| nextModel\.workCardIntake/);
  assert.match(appSource, /!isWorkCardPlanningPreparation \? \(/);
  assert.doesNotMatch(appSource, /Generate Work Card Intake Handoff[\s\S]*CurrentActionPanel/);
});
