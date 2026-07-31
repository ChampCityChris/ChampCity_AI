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

test("Project Planning uses dedicated dual-pane controls instead of the generic lifecycle shell", () => {
  const appSource = fs.readFileSync(appSourcePath, "utf8");

  assert.match(appSource, /ProjectPlanningActionBar/);
  assert.match(appSource, /ProjectPlanningPreviewReview/);
  assert.match(appSource, /activeWorkspaceId !== "project-planning-review"/);
  assert.match(appSource, /isArchitectEnabledWorkspace\(activeWorkspaceId\)/);
  assert.doesNotMatch(appSource, /Workspace Migration Required/);
  assert.doesNotMatch(appSource, /Project Profile Markdown/);
  assert.doesNotMatch(appSource, /Project Roadmap Markdown/);
});

test("Phase Map uses embedded Architect controls with Phase Map-specific handoff labels", () => {
  const appSource = fs.readFileSync(appSourcePath, "utf8");

  assert.match(appSource, /PhaseMapActionBar/);
  assert.match(appSource, /activeWorkspaceId === "project-phase-map"/);
  assert.match(appSource, /Prepare Phase Map Handoff/);
  assert.match(appSource, /Copy Phase Map Handoff/);
  assert.match(appSource, /copyPhaseMapHandoff/);
  assert.doesNotMatch(appSource, /project-phase-map"[\s\S]{0,120}Run Current Handoff Action/);
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
