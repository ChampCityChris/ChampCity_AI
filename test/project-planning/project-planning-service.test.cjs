const assert = require("node:assert/strict");
const test = require("node:test");

const {
  generateProjectPlanningHandoff,
} = require("../../dist/main/projectPlanning/projectPlanningService.js");
const {
  seedApprovedProjectIntake,
  tempWorkspace,
  writeDoc,
} = require("../support/canonical-markdown-fixtures.cjs");

test("project planning service generates Markdown-only handoff targets", () => {
  const root = tempWorkspace("champcity-project-planning-");
  const seeded = seedApprovedProjectIntake(root);
  writeDoc(root, seeded.interview, "project-architect-interview", "Approved", {
    sourceRevisions: [
      { path: seeded.intake, revision: 1 },
      { path: seeded.prompt, revision: 1 },
    ],
  });

  const result = generateProjectPlanningHandoff(root);
  assert.equal(result.handoffMarkdownPath, "planning/project/Project_Planning_Documents/PROJECT_PLANNING_DOCUMENTS_demo.md");
  assert.equal(result.profileMarkdownPath, "planning/project/PROJECT_PROFILE.md");
  assert.equal(["handoff", "Json", "Path"].join("") in result, false);
});
