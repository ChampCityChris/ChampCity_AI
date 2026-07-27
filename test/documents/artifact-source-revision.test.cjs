const assert = require("node:assert/strict");
const test = require("node:test");

const {
  evaluateDocumentFreshness,
  listPlanningDocuments,
} = require("../../dist/main/documents/planningDocumentService.js");
const {
  tempWorkspace,
  writeDoc,
} = require("../support/canonical-markdown-fixtures.cjs");

test("source revision freshness uses canonical Markdown metadata", () => {
  const root = tempWorkspace("champcity-source-revision-");
  const source = writeDoc(root, "planning/project/Project_Intake/PROJECT_INTAKE_demo.md", "project-intake", "Approved");
  const dependent = writeDoc(root, "planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_demo.md", "project-architect-interview-prompt", "Approved", {
    participationRole: "nonReviewHandoff",
    sourceRevisions: [{ path: source, revision: 1 }],
    workflowData: { architectOutputTargets: { markdown: "planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_demo.md" } },
  });

  const before = listPlanningDocuments(root).find((document) => document.markdownPath === dependent);
  assert.equal(evaluateDocumentFreshness(root, before.logicalDocumentId).state, "fresh");

  writeDoc(root, source, "project-intake", "Approved", { artifactRevision: 2 });
  const after = listPlanningDocuments(root).find((document) => document.markdownPath === dependent);
  assert.equal(evaluateDocumentFreshness(root, after.logicalDocumentId).state, "stale");
});
