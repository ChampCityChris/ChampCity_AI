const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { inventoryLegacyMarkdownAuthority } = require("../../dist/main/migrations/legacyAuthorityInventory.js");
const { serializeCanonicalMarkdownDocument } = require("../../dist/shared/documents/canonicalMarkdown.js");

function workspace(context) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-legacy-inventory-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}
function write(root, name, kind, identity, sourceRevisions = [], workflowData = {}) {
  const target = path.join(root, name);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const content = serializeCanonicalMarkdownDocument({ schemaVersion: 1, artifactType: kind, artifactRevision: 1,
    participationRole: "contextOnly", identity, sourceRevisions, workflowData,
    documentDisposition: { status: "Pending", notes: "", reviewedAt: null } }, `# ${kind}\n`);
  fs.writeFileSync(target, content);
  return content;
}

test("legacy authority snapshot is complete, hash addressed, repeatable and read only", context => {
  const root = workspace(context);
  const projectPath = "planning/work-intake/PROJECT.md";
  const project = write(root, projectPath, "work-project", { projectId: "project-1" }, [], { repositoryId: "repository-1" });
  const intakePath = "planning/work-intake/intakes/intake-1.md";
  write(root, intakePath, "work-intake", { intakeId: "intake-1" }, [{ path: projectPath, revision: 1 }],
    { branchBinding: { workBranch: "work/intake-1" } });
  write(root, "issues/ISSUE_001/ISSUE_RECORD.md", "issue-record", { issueId: "ISSUE_001" });
  fs.mkdirSync(path.join(root, "planning", "Architect_Drafts"));
  fs.writeFileSync(path.join(root, "planning", "Architect_Drafts", "unpromoted.md"), "# Draft\n");
  const first = inventoryLegacyMarkdownAuthority(root);
  assert.equal(first.complete, true);
  assert.equal(first.documents.length, 3);
  assert.equal(first.snapshotId, `legacy-v1-${first.digest}`);
  assert.deepEqual(inventoryLegacyMarkdownAuthority(root), first);
  assert.equal(first.documents[0].path, "issues/ISSUE_001/ISSUE_RECORD.md");
  assert.equal(first.documents.find(item => item.path === projectPath).content, project);
  assert.equal(first.documents.find(item => item.path === intakePath).resourceBindings.branchBinding.workBranch, "work/intake-1");
  assert.equal(first.documents.find(item => item.path === intakePath).sourceRevisions[0].path, projectPath);
  assert.equal(fs.readFileSync(path.join(root, projectPath), "utf8"), project);
  fs.appendFileSync(path.join(root, projectPath), "changed\n");
  assert.notEqual(inventoryLegacyMarkdownAuthority(root).digest, first.digest);
});

test("legacy inventory exposes duplicate identity, malformed metadata and source revision conflict", context => {
  const root = workspace(context);
  write(root, "planning/Work_Cards/A.md", "formal-work-card", { workCardId: "A" });
  write(root, "planning/Work_Cards/copy.md", "formal-work-card", { workCardId: "A" });
  write(root, "planning/Validations/V.md", "validation-record", { validationId: "V" },
    [{ path: "planning/Work_Cards/A.md", revision: 2 }, { path: "planning/missing.md", revision: 1 }]);
  fs.mkdirSync(path.join(root, "issues"));
  fs.writeFileSync(path.join(root, "issues", "broken.md"), "# no canonical metadata\n");
  const snapshot = inventoryLegacyMarkdownAuthority(root);
  assert.equal(snapshot.complete, false);
  assert.deepEqual(snapshot.conflicts.map(item => item.code).sort(),
    ["duplicate-identity", "invalid-metadata", "missing-source", "source-revision-mismatch"]);
  assert.equal(snapshot.documents.length, 3);
  assert.deepEqual(inventoryLegacyMarkdownAuthority(root).conflicts, snapshot.conflicts);
});

test("legacy inventory refuses oversized authority instead of silently truncating", context => {
  const root = workspace(context);
  const target = path.join(root, "planning", "big.md");
  fs.mkdirSync(path.dirname(target));
  fs.writeFileSync(target, "x".repeat(2_000_001));
  const snapshot = inventoryLegacyMarkdownAuthority(root);
  assert.equal(snapshot.complete, false);
  assert.equal(snapshot.conflicts[0].code, "unreadable");
  assert.equal(snapshot.documents.length, 0);
});
