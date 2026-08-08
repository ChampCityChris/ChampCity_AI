const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  submitProjectIntake,
} = require("../../dist/main/projectIntake/projectIntakeService.js");
const {
  listPlanningDocuments,
  setDocumentDisposition,
} = require("../../dist/main/documents/planningDocumentService.js");
const {
  getArchitectInterviewWorkspaceModel,
  prepareArchitectInterviewFinalDraftHandoff,
  prepareArchitectInterviewHandoff,
  reviewArchitectInterview,
} = require("../../dist/main/architectInterview/architectInterviewService.js");
const {
  parseCanonicalMarkdownDocument,
} = require("../../dist/shared/documents/canonicalMarkdown.js");

function tempWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-single-file-flow-"));
  fs.mkdirSync(path.join(root, "planning"), { recursive: true });
  fs.mkdirSync(path.join(root, ".champcity"), { recursive: true });
  fs.writeFileSync(
    path.join(root, ".champcity", "mcp-workspace-binding.json"),
    JSON.stringify({
      mcpWorkspaceId: "alpha",
      label: "Alpha Test Workspace",
      repositoryName: "Test/Alpha",
      gitBacked: true,
    }, null, 2),
    "utf8",
  );
  return root;
}

function intake(root) {
  return submitProjectIntake({
    projectName: "Single File Flow",
    projectPurpose: "Prove one canonical Markdown document per workflow artifact.",
    desiredOutcome: "Architect output can be pasted as substantive Markdown.",
    projectType: "Desktop application",
    projectRepository: root,
    hasExistingSourceOrPlanning: false,
    knownConstraints: "",
    repositoryReviewContext: "",
  });
}

function submitDraft(root, body) {
  prepareArchitectInterviewHandoff(root);
  const finalized = prepareArchitectInterviewFinalDraftHandoff(root);
  const draftPath = finalized.finalDraftHandoffInstruction.match(/Temporary draft Markdown: ([^\n]+)/)[1];
  fs.mkdirSync(path.dirname(path.join(root, draftPath)), { recursive: true });
  fs.writeFileSync(path.join(root, draftPath), body, "utf8");
  return getArchitectInterviewWorkspaceModel(root);
}

test("Project Intake and Architect Output create canonical Markdown only", () => {
  const root = tempWorkspace();
  const result = intake(root);
  assert.equal(fs.existsSync(path.join(root, result.projectIntakeMarkdownPath)), true);
  assert.equal(fs.existsSync(path.join(root, result.projectIntakeMarkdownPath.replace(/\.md$/, ".json"))), false);
  assert.equal(fs.existsSync(path.join(root, result.architectPromptMarkdownPath)), true);
  assert.equal(fs.existsSync(path.join(root, result.architectPromptMarkdownPath.replace(/\.md$/, ".json"))), false);

  const intakeDoc = listPlanningDocuments(root).find((document) => document.markdownPath === result.projectIntakeMarkdownPath);
  setDocumentDisposition(root, intakeDoc.logicalDocumentId, "Approved");
  let model = getArchitectInterviewWorkspaceModel(root);
  assert.equal(model.railStatus, "Waiting for Output");
  const saved = submitDraft(root, "# Project Understanding\n\nThe project needs a single-file governed workflow.");
  assert.equal(fs.existsSync(path.join(root, saved.interviewTargets.markdownPath)), true);
  assert.equal(fs.existsSync(path.join(root, saved.interviewTargets.markdownPath.replace(/\.md$/, ".json"))), false);
  const parsed = parseCanonicalMarkdownDocument(fs.readFileSync(path.join(root, saved.interviewTargets.markdownPath), "utf8"));
  assert.equal(parsed.metadata.artifactType, "project-architect-interview");
  assert.equal(parsed.metadata.documentDisposition.status, "Pending");
  assert.match(parsed.bodyMarkdown, /single-file governed workflow/);

  model = getArchitectInterviewWorkspaceModel(root);
  assert.equal(model.railStatus, "Awaiting Approval");
  const reviewed = reviewArchitectInterview(root, "Approved", "", undefined);
  assert.equal(reviewed.railStatus, "Completed");
  const approved = parseCanonicalMarkdownDocument(fs.readFileSync(path.join(root, saved.interviewTargets.markdownPath), "utf8"));
  assert.equal(approved.metadata.documentDisposition.status, "Approved");
  assert.equal(approved.metadata.artifactRevision, 1);
});
