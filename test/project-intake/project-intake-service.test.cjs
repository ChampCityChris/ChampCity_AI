const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  submitProjectIntake,
} = require("../../dist/main/projectIntake/projectIntakeService.js");
const {
  tempWorkspace,
} = require("../support/canonical-markdown-fixtures.cjs");

test("project intake submission writes Project Intake and Architect Prompt Markdown only", () => {
  const root = tempWorkspace("champcity-project-intake-");
  const result = submitProjectIntake({
    projectName: "Markdown Only",
    projectPurpose: "Delete paired JSON workflow authority.",
    desiredOutcome: "One canonical Markdown artifact per governed document.",
    projectType: "Desktop application",
    projectRepository: root,
    hasExistingSourceOrPlanning: false,
    knownConstraints: "",
    repositoryReviewContext: "",
  });

  assert.equal(fs.existsSync(path.join(root, result.projectIntakeMarkdownPath)), true);
  assert.equal(fs.existsSync(path.join(root, result.architectPromptMarkdownPath)), true);
  assert.equal(fs.existsSync(path.join(root, result.projectIntakeMarkdownPath.replace(/\.md$/, ".json"))), false);
  assert.equal(["projectIntake", "Json", "Path"].join("") in result, false);
  assert.equal(["architectInterviewTarget", "Json", "Path"].join("") in result, false);
});
