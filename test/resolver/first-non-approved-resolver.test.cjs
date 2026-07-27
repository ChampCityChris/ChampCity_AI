const assert = require("node:assert/strict");
const test = require("node:test");

const {
  resolveFirstNonApproved,
} = require("../../dist/shared/documents/documentOrder.js");
const {
  listPlanningDocuments,
  tempWorkspace,
  writeDoc,
} = require("../support/canonical-markdown-fixtures.cjs");

test("first non-approved resolver returns the earliest pending Markdown lifecycle document", () => {
  const root = tempWorkspace("champcity-first-non-approved-");
  writeDoc(root, "planning/project/Project_Intake/PROJECT_INTAKE_demo.md", "project-intake", "Approved");
  writeDoc(root, "planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_demo.md", "project-architect-interview-prompt", "Approved", {
    participationRole: "nonReviewHandoff",
    workflowData: { architectOutputTargets: { markdown: "planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_demo.md" } },
  });
  writeDoc(root, "planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_demo.md", "project-architect-interview", "Pending");

  const result = resolveFirstNonApproved(listPlanningDocuments(root));
  assert.equal(result.status, "current");
  assert.equal(result.document.markdownPath, "planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_demo.md");
  assert.equal(["json", "Path"].join("") in result.document, false);
});
