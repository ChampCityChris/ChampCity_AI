const assert = require("node:assert/strict");
const test = require("node:test");

const {
  listPlanningDocuments,
} = require("../../dist/main/documents/planningDocumentService.js");

test("repository planning corpus is readable as canonical Markdown documents", () => {
  const documents = listPlanningDocuments(process.cwd());
  assert.ok(documents.length > 0);
  assert.equal(documents.some((document) => document.markdownPath.endsWith(".json")), false);
  assert.equal(documents.some((document) => ["json", "Path"].join("") in document), false);
});
