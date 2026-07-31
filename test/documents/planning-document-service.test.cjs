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

test("planning document detail returns the complete selected review body", () => {
  const root = tempWorkspace("champcity-planning-full-body-");
  const finalMarker = "UNIQUE_COMPLETE_REVIEW_BODY_END";
  writeDoc(root, "planning/project/PROJECT_PROFILE.md", "project-profile", "Pending", {
    participationRole: "compoundGatingReview",
    bodyMarkdown: `# Project Profile\n\n${"Full review paragraph.\n".repeat(700)}\n${finalMarker}\n`,
  });

  const [document] = listPlanningDocuments(root);
  const detail = readPlanningDocument(root, document.logicalDocumentId);

  assert.equal(detail.bodyMarkdown.length > 12000, true);
  assert.match(detail.bodyMarkdown, new RegExp(`${finalMarker}\\n$`));
  assert.equal(detail.preview, detail.bodyMarkdown);
  assert.equal(detail.previewTruncated, false);
});

test("planning document detail reloads same-path substantive revisions by logical document id", () => {
  const root = tempWorkspace("champcity-planning-refresh-body-");
  const relativePath = "planning/project/PROJECT_PROFILE.md";
  writeDoc(root, relativePath, "project-profile", "Pending", {
    participationRole: "compoundGatingReview",
    artifactRevision: 1,
    bodyMarkdown: `# Project Profile\n\n${"Old body.\n".repeat(1400)}\nOLD_FINAL_MARKER\n`,
  });

  const [original] = listPlanningDocuments(root);
  const originalDetail = readPlanningDocument(root, original.logicalDocumentId);
  assert.match(originalDetail.bodyMarkdown, /OLD_FINAL_MARKER/);

  writeDoc(root, relativePath, "project-profile", "Pending", {
    participationRole: "compoundGatingReview",
    artifactRevision: 2,
    bodyMarkdown: `# Project Profile\n\n${"New body.\n".repeat(1400)}\nNEW_FINAL_MARKER\n`,
  });

  const [revised] = listPlanningDocuments(root);
  assert.equal(revised.logicalDocumentId, original.logicalDocumentId);
  const revisedDetail = readPlanningDocument(root, original.logicalDocumentId);
  assert.equal(revisedDetail.metadata.artifactRevision, 2);
  assert.match(revisedDetail.bodyMarkdown, /NEW_FINAL_MARKER\n$/);
  assert.doesNotMatch(revisedDetail.bodyMarkdown, /OLD_FINAL_MARKER/);
});
