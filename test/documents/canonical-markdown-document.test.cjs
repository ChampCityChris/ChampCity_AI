const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  parseCanonicalMarkdownDocument,
  serializeCanonicalMarkdownDocument,
} = require("../../dist/shared/documents/canonicalMarkdown.js");
const {
  writeCanonicalMarkdownDocument,
  updateCanonicalMarkdownDisposition,
  updateCanonicalMarkdownSubstantiveRevision,
  __setCanonicalMarkdownWriterTestHooks,
} = require("../../dist/main/documents/canonicalMarkdownDocumentWriter.js");

function tempWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-canonical-md-"));
  fs.mkdirSync(path.join(root, "planning"), { recursive: true });
  return root;
}

function metadata(overrides = {}) {
  return {
    schemaVersion: 1,
    artifactType: "project-architect-interview",
    artifactRevision: 1,
    participationRole: "gatingReview",
    identity: { projectId: "demo" },
    sourceRevisions: [{ path: "planning/project/Project_Intake/PROJECT_INTAKE_demo.md", revision: 3 }],
    workflowData: {},
    documentDisposition: { status: "Pending", notes: "", reviewedAt: null },
    ...overrides,
  };
}

test("canonical Markdown parser accepts one metadata block and preserves body", () => {
  const body = "# Project Architect Interview\n\nDocument.Status=Approved in prose only.\n";
  const content = serializeCanonicalMarkdownDocument(metadata(), body);
  const parsed = parseCanonicalMarkdownDocument(content);
  assert.equal(parsed.metadata.documentDisposition.status, "Pending");
  assert.equal(parsed.bodyMarkdown, body);
});

test("canonical Markdown parser rejects malformed and duplicate metadata", () => {
  assert.throws(
    () => parseCanonicalMarkdownDocument("<!-- CHAMPCITY-METADATA\n{ broken\nCHAMPCITY-METADATA -->\n\n# Body\n"),
    /malformed JSON/,
  );
  const content = serializeCanonicalMarkdownDocument(metadata(), "# Body\n");
  assert.throws(
    () => parseCanonicalMarkdownDocument(`${content}\n<!-- CHAMPCITY-METADATA\n{}\nCHAMPCITY-METADATA -->\n`),
    /duplicate metadata block/,
  );
  assert.throws(
    () => parseCanonicalMarkdownDocument(`${content}\nCHAMPCITY-METADATA -->\n`),
    /more than one metadata closing delimiter/,
  );
});

test("single-file writer creates one Markdown file and no JSON sibling", () => {
  const root = tempWorkspace();
  writeCanonicalMarkdownDocument({
    workspaceRoot: root,
    relativePath: "planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_demo.md",
    metadata: metadata(),
    bodyMarkdown: "# Project Architect Interview\n\nSubstantive content.\n",
  });
  assert.equal(fs.existsSync(path.join(root, "planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_demo.md")), true);
  assert.equal(fs.existsSync(path.join(root, "planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_demo.json")), false);
});

test("disposition-only update preserves body and revision", () => {
  const root = tempWorkspace();
  const relativePath = "planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_demo.md";
  const body = "# Project Architect Interview\n\nKeep these exact bytes.\n";
  writeCanonicalMarkdownDocument({ workspaceRoot: root, relativePath, metadata: metadata(), bodyMarkdown: body });
  updateCanonicalMarkdownDisposition({ workspaceRoot: root, relativePath, status: "Approved", reviewedAt: "2026-07-27T00:00:00.000Z" });
  const parsed = parseCanonicalMarkdownDocument(fs.readFileSync(path.join(root, relativePath), "utf8"));
  assert.equal(parsed.metadata.artifactRevision, 1);
  assert.equal(parsed.metadata.documentDisposition.status, "Approved");
  assert.equal(parsed.bodyMarkdown, body);
});

test("RevisionRequested disposition requires non-empty notes", () => {
  const root = tempWorkspace();
  const relativePath = "planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_demo.md";
  writeCanonicalMarkdownDocument({ workspaceRoot: root, relativePath, metadata: metadata(), bodyMarkdown: "# Body\n" });
  assert.throws(
    () => updateCanonicalMarkdownDisposition({ workspaceRoot: root, relativePath, status: "RevisionRequested" }),
    /requires non-empty review notes/,
  );
  updateCanonicalMarkdownDisposition({
    workspaceRoot: root,
    relativePath,
    status: "RevisionRequested",
    notes: "Clarify scope.",
    reviewedAt: "2026-07-27T00:00:00.000Z",
  });
  const parsed = parseCanonicalMarkdownDocument(fs.readFileSync(path.join(root, relativePath), "utf8"));
  assert.equal(parsed.metadata.documentDisposition.status, "RevisionRequested");
  assert.equal(parsed.metadata.documentDisposition.notes, "Clarify scope.");
});

test("substantive update increments revision and resets disposition", () => {
  const root = tempWorkspace();
  const relativePath = "planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_demo.md";
  writeCanonicalMarkdownDocument({
    workspaceRoot: root,
    relativePath,
    metadata: metadata({ documentDisposition: { status: "Approved", notes: "ok", reviewedAt: "2026-07-27T00:00:00.000Z" } }),
    bodyMarkdown: "# Old\n",
  });
  updateCanonicalMarkdownSubstantiveRevision({ workspaceRoot: root, relativePath, bodyMarkdown: "# New\n" });
  const parsed = parseCanonicalMarkdownDocument(fs.readFileSync(path.join(root, relativePath), "utf8"));
  assert.equal(parsed.metadata.artifactRevision, 2);
  assert.equal(parsed.metadata.documentDisposition.status, "Pending");
  assert.equal(parsed.metadata.documentDisposition.reviewedAt, null);
  assert.equal(parsed.bodyMarkdown, "# New\n");
});

test("installed verification failure restores original bytes and cleans temp files", () => {
  const root = tempWorkspace();
  const relativePath = "planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_demo.md";
  writeCanonicalMarkdownDocument({
    workspaceRoot: root,
    relativePath,
    metadata: metadata(),
    bodyMarkdown: "# Original\n",
  });
  const absolutePath = path.join(root, relativePath);
  const originalBytes = fs.readFileSync(absolutePath, "utf8");
  __setCanonicalMarkdownWriterTestHooks({
    failInstalledVerification: () => "Injected installed verification failure.",
  });
  try {
    assert.throws(
      () => writeCanonicalMarkdownDocument({
        workspaceRoot: root,
        relativePath,
        metadata: metadata({ artifactRevision: 2 }),
        bodyMarkdown: "# Replacement\n",
      }),
      /Injected installed verification failure/,
    );
  } finally {
    __setCanonicalMarkdownWriterTestHooks();
  }
  assert.equal(fs.readFileSync(absolutePath, "utf8"), originalBytes);
  const siblings = fs.readdirSync(path.dirname(absolutePath));
  assert.equal(siblings.some((name) => name.includes(".champcity-artifact-")), false);
});
