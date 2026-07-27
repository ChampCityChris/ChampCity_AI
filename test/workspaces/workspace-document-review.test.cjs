const assert = require("node:assert/strict");
const test = require("node:test");

const {
  assignDocumentsToWorkspaces,
} = require("../../dist/shared/workspaces/documentWorkspace.js");
const {
  listPlanningDocuments,
  tempWorkspace,
  writeDoc,
} = require("../support/canonical-markdown-fixtures.cjs");

test("workspace document assignment routes Markdown artifacts without JSON aliases", () => {
  const root = tempWorkspace("champcity-workspace-review-");
  writeDoc(root, "planning/project/Project_Intake/PROJECT_INTAKE_demo.md", "project-intake", "Pending");

  const assigned = assignDocumentsToWorkspaces(listPlanningDocuments(root));
  assert.equal(assigned[0].workspaceId, "project-intake-capture");
  assert.equal(assigned[0].markdownPath, "planning/project/Project_Intake/PROJECT_INTAKE_demo.md");
  assert.equal(["json", "Path"].join("") in assigned[0], false);
});
