const assert = require("node:assert/strict");
const test = require("node:test");

const {
  listPlanningDocuments,
  readPlanningDocument,
  setDocumentDisposition,
} = require("../../dist/main/documents/planningDocumentService.js");
const {
  tempWorkspace,
  writeDoc,
} = require("../support/canonical-markdown-fixtures.cjs");

test("planning document service discovers canonical Markdown without JSON summaries", () => {
  const root = tempWorkspace("champcity-planning-service-");
  const relativePath = writeDoc(root, "planning/project/Project_Intake/PROJECT_INTAKE_demo.md", "project-intake", "Pending");

  const documents = listPlanningDocuments(root);
  assert.equal(documents.length, 1);
  assert.equal(documents[0].markdownPath, relativePath);
  assert.equal(["json", "Path"].join("") in documents[0], false);
  assert.equal(documents[0].metadata.artifactType, "project-intake");

  const updated = setDocumentDisposition(root, documents[0].logicalDocumentId, "Approved");
  assert.equal(updated.effectiveDisposition, "Approved");
  assert.match(readPlanningDocument(root, documents[0].logicalDocumentId).preview, /project-intake/);
});
