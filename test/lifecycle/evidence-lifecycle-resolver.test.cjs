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

test("lifecycle resolver waits for Architect Interview Markdown target after approved intake", () => {
  const root = tempWorkspace("champcity-lifecycle-resolver-");
  const intake = writeDoc(root, "planning/project/Project_Intake/PROJECT_INTAKE_demo.md", "project-intake", "Approved");
  writeDoc(root, "planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_demo.md", "project-architect-interview-prompt", "Approved", {
    participationRole: "nonReviewHandoff",
    sourceRevisions: [{ path: intake, revision: 1 }],
    workflowData: { architectOutputTargets: { markdown: "planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_demo.md" } },
  });

  const result = resolveFirstNonApproved(listPlanningDocuments(root));
  assert.equal(result.status, "waiting-for-architect-interview");
  assert.deepEqual(result.expectedOutputPaths, {
    markdown: "planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_demo.md",
  });
});
