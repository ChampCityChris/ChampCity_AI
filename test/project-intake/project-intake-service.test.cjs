const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  submitProjectIntake,
} = require("../../dist/main/projectIntake/projectIntakeService.js");
const {
  parseCanonicalMarkdownDocument,
} = require("../../dist/shared/documents/canonicalMarkdown.js");
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

  const prompt = parseCanonicalMarkdownDocument(
    fs.readFileSync(path.join(root, result.architectPromptMarkdownPath), "utf8"),
  );
  assert.match(prompt.bodyMarkdown, /diagnostics_toolbox\.list_workspaces/);
  assert.match(prompt.bodyMarkdown, /"action": "submit_handoff_outputs"/);
  assert.match(prompt.bodyMarkdown, /"workspaceId": "<resolved workspace ID>"/);
  assert.match(prompt.bodyMarkdown, /"handoffKind": "architect-interview"/);
  assert.match(prompt.bodyMarkdown, /"architectInterviewMarkdown": "<complete substantive Interview Markdown>"/);
  assert.match(prompt.bodyMarkdown, /complete substantive Project Architect Interview Markdown document, not a snippet/);
  assert.match(prompt.bodyMarkdown, /tool returns saved or already_saved/);
  assert.match(prompt.bodyMarkdown, /handoff kind is a selector, not authority/);
  assert.doesNotMatch(prompt.bodyMarkdown, /save_architect_interview_output/);
  assert.doesNotMatch(prompt.bodyMarkdown, /paste .*Architect Output import surface/i);
});
