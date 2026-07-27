const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  migratePairedArtifactsToCanonicalMarkdownV1,
  previewPairedArtifactsToCanonicalMarkdownV1,
} = require("../../dist/main/migrations/pairedArtifactsToCanonicalMarkdownV1.js");
const {
  parseCanonicalMarkdownDocument,
} = require("../../dist/shared/documents/canonicalMarkdown.js");

function tempWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-migration-"));
  fs.mkdirSync(path.join(root, "planning"), { recursive: true });
  return root;
}

function writeLegacyPair(root, stem, overrides = {}) {
  const markdownPath = `${stem}.md`;
  const legacyDataPath = `${stem}.json`;
  const absoluteMarkdown = path.join(root, markdownPath);
  fs.mkdirSync(path.dirname(absoluteMarkdown), { recursive: true });
  fs.writeFileSync(
    absoluteMarkdown,
    "# Legacy Artifact\nArtifact.Revision=1\nparticipationRole=gatingReview\n\n## Document Disposition\n\nDocument.Status=Pending\n",
    "utf8",
  );
  fs.writeFileSync(
    path.join(root, legacyDataPath),
    `${JSON.stringify({
      artifactType: "project-intake",
      artifactRevision: 1,
      participationRole: "gatingReview",
      projectSlug: "demo",
      sourceRevisions: [],
      documentDisposition: { status: "Pending" },
      ...overrides,
    }, null, 2)}\n`,
    "utf8",
  );
  return { markdownPath, legacyDataPath };
}

test("paired artifact migration previews target Markdown and deletes legacy sibling on apply", () => {
  const root = tempWorkspace();
  const pair = writeLegacyPair(root, "planning/project/Project_Intake/PROJECT_INTAKE_demo");

  const preview = previewPairedArtifactsToCanonicalMarkdownV1(root);
  assert.equal(preview.readyCount, 1);
  assert.equal(preview.blockedCount, 0);
  assert.equal(preview.items[0].targetMarkdownPath, pair.markdownPath);
  assert.deepEqual(preview.items[0].filesToDelete, [pair.legacyDataPath]);

  const result = migratePairedArtifactsToCanonicalMarkdownV1(root);
  assert.deepEqual(result.migratedPaths, [pair.markdownPath]);
  assert.deepEqual(result.deletedPaths, [pair.legacyDataPath]);
  assert.equal(fs.existsSync(path.join(root, pair.legacyDataPath)), false);

  const parsed = parseCanonicalMarkdownDocument(fs.readFileSync(path.join(root, pair.markdownPath), "utf8"));
  assert.equal(parsed.metadata.artifactType, "project-intake");
  assert.equal(parsed.metadata.documentDisposition.status, "Pending");
});

test("paired artifact migration blocks missing and malformed siblings without changing originals", () => {
  const root = tempWorkspace();
  const pair = writeLegacyPair(root, "planning/project/Project_Intake/PROJECT_INTAKE_bad", {
    artifactRevision: "not-a-number",
  });
  const markdownBefore = fs.readFileSync(path.join(root, pair.markdownPath), "utf8");
  fs.writeFileSync(
    path.join(root, "planning/project/Project_Intake/PROJECT_INTAKE_orphan.md"),
    "# Orphan\n",
    "utf8",
  );

  const preview = previewPairedArtifactsToCanonicalMarkdownV1(root);
  assert.equal(preview.blockedCount, 2);
  assert.equal(preview.items.some((item) => item.findings.includes("Missing legacy JSON sibling.")), true);
  assert.throws(() => migratePairedArtifactsToCanonicalMarkdownV1(root), /blocked by 2 document/);
  assert.equal(fs.readFileSync(path.join(root, pair.markdownPath), "utf8"), markdownBefore);
  assert.equal(fs.existsSync(path.join(root, pair.legacyDataPath)), true);
});
