const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  getArchitectInterviewWorkspaceModel,
  saveCurrentArchitectInterviewOutput,
  reviewArchitectInterview,
} = require("../../dist/main/architectInterview/architectInterviewService.js");
const {
  parseCanonicalMarkdownDocument,
} = require("../../dist/shared/documents/canonicalMarkdown.js");
const {
  seedApprovedProjectIntake,
  tempWorkspace,
} = require("../support/canonical-markdown-fixtures.cjs");

test("Architect Interview workspace saves direct Markdown output without creation contracts", () => {
  const root = tempWorkspace("champcity-architect-interview-");
  const targets = seedApprovedProjectIntake(root);

  const waiting = getArchitectInterviewWorkspaceModel(root);
  assert.equal(waiting.railStatus, "Waiting for Output");
  const retiredContractField = ["architectOutput", "Creation", "ContractId"].join("");
  assert.equal(waiting[retiredContractField], undefined);
  assert.equal(waiting.interviewTargets.markdownPath, targets.interview);

  const saved = saveCurrentArchitectInterviewOutput(root, "# Architect Interview\n\nDirect output body.\n");
  assert.equal(saved.interviewDocument.markdownPath, targets.interview);
  assert.equal(fs.existsSync(path.join(root, targets.interview.replace(/\.md$/, ".json"))), false);

  const parsed = parseCanonicalMarkdownDocument(fs.readFileSync(path.join(root, targets.interview), "utf8"));
  assert.equal(parsed.metadata.artifactType, "project-architect-interview");
  assert.equal(parsed.metadata.documentDisposition.status, "Pending");
  assert.match(parsed.bodyMarkdown, /Direct output body/);

  const reviewed = reviewArchitectInterview(root, "Approved", "", undefined);
  assert.equal(reviewed.railStatus, "Completed");
});
