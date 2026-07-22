const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  __setPlanningDocumentServiceTestHooks,
  applyDispositionInitialization,
  listPlanningDocuments,
  previewDispositionInitialization,
  readPlanningDocument,
  setDocumentDisposition,
} = require("../../dist/main/documents/planningDocumentService.js");

function createWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-docs-"));
  fs.mkdirSync(path.join(root, "planning"), { recursive: true });
  return root;
}

function writeFile(root, relativePath, content) {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content, "utf8");
}

function readFile(root, relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function byDisplayName(documents, displayFilename) {
  return documents.find((document) => document.displayFilename === displayFilename);
}

function snapshotFiles(root) {
  const files = [];
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(absolutePath);
      } else if (entry.isFile()) {
        const relativePath = path.relative(root, absolutePath).split(path.sep).join("/");
        files.push([relativePath, fs.readFileSync(absolutePath, "utf8")]);
      }
    }
  }
  visit(path.join(root, "planning"));
  return files.sort(([left], [right]) => left.localeCompare(right));
}

function dispositionTempFiles(root) {
  const files = [];
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(absolutePath);
      } else if (entry.isFile() && entry.name.includes(".champcity-disposition-")) {
        files.push(path.relative(root, absolutePath).split(path.sep).join("/"));
      }
    }
  }
  visit(path.join(root, "planning"));
  return files.sort();
}

function withServiceHooks(t, hooks) {
  __setPlanningDocumentServiceTestHooks(hooks);
  t.after(() => __setPlanningDocumentServiceTestHooks());
}

test("recursive discovery includes paired standalone archive system malformed and missing-status files", () => {
  const root = createWorkspace();
  writeFile(root, "planning/project/paired.md", "# Pair\n");
  writeFile(root, "planning/project/paired.json", "{}\n");
  writeFile(root, "planning/archive/archived.md", "# Archive\n");
  writeFile(root, "planning/system/system.json", "{}\n");
  writeFile(root, "planning/malformed.json", "{ nope\n");
  writeFile(root, "planning/notes.txt", "ignored\n");

  const documents = listPlanningDocuments(root);

  assert.deepEqual(
    documents.map((document) => document.displayFilename).sort(),
    ["archived", "malformed", "paired", "system"],
  );
  assert.equal(byDisplayName(documents, "malformed").readError.length > 0, true);
});

test("same-stem Markdown and JSON files are one logical document", () => {
  const root = createWorkspace();
  writeFile(root, "planning/card.md", "# Card\n");
  writeFile(root, "planning/card.json", "{}\n");

  const documents = listPlanningDocuments(root);

  assert.equal(documents.length, 1);
  assert.equal(documents[0].pairStatus, "paired");
  assert.equal(documents[0].markdownPath, "planning/card.md");
  assert.equal(documents[0].jsonPath, "planning/card.json");
});

test("different stems remain separate logical documents", () => {
  const root = createWorkspace();
  writeFile(root, "planning/card.md", "# Card\n");
  writeFile(root, "planning/card-data.json", "{}\n");

  const documents = listPlanningDocuments(root);

  assert.equal(documents.length, 2);
});

test("missing status reads as Pending and needs initialization", () => {
  const root = createWorkspace();
  writeFile(root, "planning/missing.md", "# Missing\n");

  const document = byDisplayName(listPlanningDocuments(root), "missing");

  assert.equal(document.effectiveDisposition, "Pending");
  assert.equal(document.initializationNeeded, true);
});

test("invalid status reads as Pending and needs initialization", () => {
  const root = createWorkspace();
  writeFile(
    root,
    "planning/invalid.md",
    "# Invalid\n\n## Document Disposition\nDocument.Status=Maybe\n",
  );

  const document = byDisplayName(listPlanningDocuments(root), "invalid");

  assert.equal(document.effectiveDisposition, "Pending");
  assert.equal(document.initializationNeeded, true);
});

test("valid synchronized status is preserved", () => {
  const root = createWorkspace();
  writeFile(
    root,
    "planning/approved.md",
    "# Approved\n\n## Document Disposition\nDocument.Status=Approved\n",
  );
  writeFile(
    root,
    "planning/approved.json",
    JSON.stringify({ title: "Approved", documentDisposition: { status: "Approved" } }, null, 2),
  );

  const document = byDisplayName(listPlanningDocuments(root), "approved");

  assert.equal(document.effectiveDisposition, "Approved");
  assert.equal(document.initializationNeeded, false);
  assert.equal(document.synchronizationState, "synchronized");
});

test("Markdown disposition examples inside fenced code are ignored", () => {
  const root = createWorkspace();
  writeFile(
    root,
    "planning/example.md",
    [
      "# Example",
      "",
      "```markdown",
      "## Document Disposition",
      "Document.Status=Pending",
      "```",
      "",
      "## Document Disposition",
      "Document.Status=Approved",
      "",
    ].join("\n"),
  );

  const document = byDisplayName(listPlanningDocuments(root), "example");

  assert.equal(document.effectiveDisposition, "Approved");
  assert.equal(document.initializationNeeded, false);
});

test("Markdown writes one terminal disposition section only", () => {
  const root = createWorkspace();
  writeFile(
    root,
    "planning/markdown.md",
    "# Markdown\n\n## Document Disposition\nDocument.Status=Maybe\n\n## Document Disposition\nDocument.Status=Pending\n",
  );
  const id = byDisplayName(listPlanningDocuments(root), "markdown").logicalDocumentId;

  setDocumentDisposition(root, id, "Rejected");
  const content = readFile(root, "planning/markdown.md");

  assert.equal((content.match(/## Document Disposition/g) ?? []).length, 1);
  assert.equal(content.trimEnd().endsWith("Document.Status=Rejected"), true);
});

test("Markdown write preserves content after a valid disposition followed by another section", () => {
  const root = createWorkspace();
  writeFile(
    root,
    "planning/after-section.md",
    "# Card\n\n## Document Disposition\n\nDocument.Status=Pending\n\n## Next\nMore detail.\n",
  );
  const id = byDisplayName(listPlanningDocuments(root), "after-section").logicalDocumentId;

  setDocumentDisposition(root, id, "Approved");

  assert.equal(
    readFile(root, "planning/after-section.md"),
    "# Card\n\n## Next\nMore detail.\n\n## Document Disposition\n\nDocument.Status=Approved\n",
  );
});

test("Markdown write preserves ordinary prose after a valid disposition", () => {
  const root = createWorkspace();
  writeFile(
    root,
    "planning/after-prose.md",
    "# Card\n\n## Document Disposition\nDocument.Status=Pending\n\nThis prose must stay.\n",
  );
  const id = byDisplayName(listPlanningDocuments(root), "after-prose").logicalDocumentId;

  setDocumentDisposition(root, id, "Rejected");

  assert.equal(
    readFile(root, "planning/after-prose.md"),
    "# Card\n\nThis prose must stay.\n\n## Document Disposition\n\nDocument.Status=Rejected\n",
  );
});

test("Markdown write preserves content after an invalid disposition assignment", () => {
  const root = createWorkspace();
  writeFile(
    root,
    "planning/invalid-after.md",
    "# Card\n\n## Document Disposition\nDocument.Status=Maybe\n\nKeep this paragraph.\n",
  );
  const id = byDisplayName(listPlanningDocuments(root), "invalid-after").logicalDocumentId;

  setDocumentDisposition(root, id, "RevisionRequested");

  assert.equal(
    readFile(root, "planning/invalid-after.md"),
    "# Card\n\nKeep this paragraph.\n\n## Document Disposition\n\nDocument.Status=RevisionRequested\n",
  );
});

test("Markdown write normalizes duplicate disposition blocks without deleting intervening content", () => {
  const root = createWorkspace();
  writeFile(
    root,
    "planning/duplicates.md",
    "# Card\n\n## Document Disposition\nDocument.Status=Pending\n\nIntervening content.\n\n## Document Disposition\nDocument.Status=Rejected\n\nTail content.\n",
  );
  const id = byDisplayName(listPlanningDocuments(root), "duplicates").logicalDocumentId;

  setDocumentDisposition(root, id, "Approved");

  const content = readFile(root, "planning/duplicates.md");
  assert.equal(
    content,
    "# Card\n\nIntervening content.\n\nTail content.\n\n## Document Disposition\n\nDocument.Status=Approved\n",
  );
  assert.equal((content.match(/^## Document Disposition$/gm) ?? []).length, 1);
});

test("Markdown write preserves fenced disposition examples exactly", () => {
  const root = createWorkspace();
  const fenced = [
    "# Card",
    "",
    "```markdown",
    "## Document Disposition",
    "",
    "Document.Status=Pending",
    "```",
    "",
    "## Document Disposition",
    "Document.Status=Rejected",
    "",
    "Tail content.",
    "",
  ].join("\n");
  writeFile(root, "planning/fenced.md", fenced);
  const id = byDisplayName(listPlanningDocuments(root), "fenced").logicalDocumentId;

  setDocumentDisposition(root, id, "Approved");

  assert.equal(
    readFile(root, "planning/fenced.md"),
    [
      "# Card",
      "",
      "```markdown",
      "## Document Disposition",
      "",
      "Document.Status=Pending",
      "```",
      "",
      "Tail content.",
      "",
      "## Document Disposition",
      "",
      "Document.Status=Approved",
      "",
    ].join("\n"),
  );
});

test("Markdown write preserves CRLF convention and remains idempotent", () => {
  const root = createWorkspace();
  writeFile(root, "planning/crlf.md", "# Card\r\n\r\nBody\r\n");
  const id = byDisplayName(listPlanningDocuments(root), "crlf").logicalDocumentId;

  setDocumentDisposition(root, id, "Pending");
  const afterFirst = readFile(root, "planning/crlf.md");
  setDocumentDisposition(root, id, "Pending");

  assert.equal(readFile(root, "planning/crlf.md"), afterFirst);
  assert.equal(afterFirst.includes("\r\n## Document Disposition\r\n\r\nDocument.Status=Pending\r\n"), true);
  assert.equal(byDisplayName(listPlanningDocuments(root), "crlf").effectiveDisposition, "Pending");
});

test("Markdown write appends one canonical disposition when none exists", () => {
  const root = createWorkspace();
  writeFile(root, "planning/no-disposition.md", "# Card\n\nBody\n");
  const id = byDisplayName(listPlanningDocuments(root), "no-disposition").logicalDocumentId;

  setDocumentDisposition(root, id, "Approved");

  assert.equal(
    readFile(root, "planning/no-disposition.md"),
    "# Card\n\nBody\n\n## Document Disposition\n\nDocument.Status=Approved\n",
  );
});

test("JSON writes one root disposition field only", () => {
  const root = createWorkspace();
  writeFile(root, "planning/json.json", JSON.stringify({ title: "Json" }, null, 2));
  const id = byDisplayName(listPlanningDocuments(root), "json").logicalDocumentId;

  setDocumentDisposition(root, id, "RevisionRequested");
  const parsed = JSON.parse(readFile(root, "planning/json.json"));

  assert.deepEqual(parsed, {
    title: "Json",
    documentDisposition: { status: "RevisionRequested" },
  });
});

test("pair writes stay synchronized", () => {
  const root = createWorkspace();
  writeFile(root, "planning/pair.md", "# Pair\n");
  writeFile(root, "planning/pair.json", "{}\n");
  const id = byDisplayName(listPlanningDocuments(root), "pair").logicalDocumentId;

  const updated = setDocumentDisposition(root, id, "Approved");

  assert.equal(updated.storedMarkdownDisposition, "Approved");
  assert.equal(updated.storedJsonDisposition, "Approved");
  assert.equal(updated.synchronizationState, "synchronized");
  assert.deepEqual(dispositionTempFiles(root), []);
});

test("second-file failure rolls back the first file", () => {
  const root = createWorkspace();
  writeFile(root, "planning/rollback.md", "# Rollback\n");
  writeFile(root, "planning/rollback.json", "{}\n");
  const before = snapshotFiles(root);
  const id = byDisplayName(listPlanningDocuments(root), "rollback").logicalDocumentId;

  assert.throws(() => setDocumentDisposition(root, id, "Approved", { failAfterWrites: 1 }));
  assert.deepEqual(snapshotFiles(root), before);
  assert.deepEqual(dispositionTempFiles(root), []);
});

test("final verification failure restores all original pair bytes", () => {
  const root = createWorkspace();
  writeFile(root, "planning/final-rollback.md", "# Rollback\n");
  writeFile(root, "planning/final-rollback.json", "{}\n");
  const before = snapshotFiles(root);
  const id = byDisplayName(listPlanningDocuments(root), "final-rollback").logicalDocumentId;

  assert.throws(
    () => setDocumentDisposition(root, id, "Approved", { failFinalVerification: true }),
    /Injected final verification failure/,
  );
  assert.deepEqual(snapshotFiles(root), before);
  assert.deepEqual(dispositionTempFiles(root), []);
});

test("stale or unknown logical IDs are rejected", () => {
  const root = createWorkspace();
  writeFile(root, "planning/stale.md", "# Stale\n");
  const id = byDisplayName(listPlanningDocuments(root), "stale").logicalDocumentId;
  fs.unlinkSync(path.join(root, "planning/stale.md"));

  assert.throws(() => readPlanningDocument(root, id), /Unknown logical document ID/);
  assert.throws(() => setDocumentDisposition(root, "unknown", "Approved"), /Unknown logical document ID/);
});

test("containment blocks traversal IDs and symlink discovery", (t) => {
  const root = createWorkspace();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-outside-"));
  fs.writeFileSync(path.join(outside, "outside.md"), "# Outside\n", "utf8");
  const linkPath = path.join(root, "planning/linked");
  try {
    fs.symlinkSync(outside, linkPath, "junction");
  } catch {
    t.skip("Symlink creation is unavailable in this environment.");
    return;
  }

  assert.throws(() => readPlanningDocument(root, "../outside"), /Unknown logical document ID/);
  assert.equal(listPlanningDocuments(root).length, 0);
});

test("missing planning directory lists as an empty pre-intake repository", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-empty-repository-"));

  assert.deepEqual(listPlanningDocuments(root), []);
  assert.equal(fs.existsSync(path.join(root, "planning")), false);
});

test("initialization preview is read-only", () => {
  const root = createWorkspace();
  writeFile(root, "planning/init.md", "# Init\n");
  const before = snapshotFiles(root);

  const preview = previewDispositionInitialization(root);

  assert.equal(preview.affectedLogicalDocuments, 1);
  assert.deepEqual(snapshotFiles(root), before);
});

test("initialization apply sets missing or invalid records to Pending only", () => {
  const root = createWorkspace();
  writeFile(root, "planning/missing.md", "# Missing\n");
  writeFile(
    root,
    "planning/invalid.json",
    JSON.stringify({ documentDisposition: { status: "Maybe" } }, null, 2),
  );
  writeFile(
    root,
    "planning/approved.md",
    "# Approved\n\n## Document Disposition\nDocument.Status=Approved\n",
  );
  writeFile(
    root,
    "planning/approved.json",
    JSON.stringify({ documentDisposition: { status: "Approved" } }, null, 2),
  );

  const result = applyDispositionInitialization(root);
  const documents = result.documents;

  assert.equal(byDisplayName(documents, "missing").effectiveDisposition, "Pending");
  assert.equal(byDisplayName(documents, "invalid").effectiveDisposition, "Pending");
  assert.equal(byDisplayName(documents, "approved").effectiveDisposition, "Approved");
  assert.equal(result.previewAfterApply.affectedLogicalDocuments, 0);
});

test("initialization rollback restores all changed fixtures after injected failure", () => {
  const root = createWorkspace();
  writeFile(root, "planning/one.md", "# One\n");
  writeFile(root, "planning/two.md", "# Two\n");
  const before = snapshotFiles(root);

  assert.throws(() => applyDispositionInitialization(root, { failAfterWrites: 1 }));
  assert.deepEqual(snapshotFiles(root), before);
});

test("repeated initialization is byte-stable", () => {
  const root = createWorkspace();
  writeFile(root, "planning/stable.md", "# Stable\n");

  applyDispositionInitialization(root);
  const afterFirstApply = snapshotFiles(root);
  applyDispositionInitialization(root);

  assert.deepEqual(snapshotFiles(root), afterFirstApply);
});

test("legacy fields are not consulted as disposition authority", () => {
  const root = createWorkspace();
  writeFile(
    root,
    "planning/legacy.json",
    JSON.stringify(
      {
        artifactId: "old-id",
        approval: "Approved",
        status: "Approved",
      },
      null,
      2,
    ),
  );

  const document = byDisplayName(listPlanningDocuments(root), "legacy");

  assert.equal(document.effectiveDisposition, "Pending");
  assert.equal(document.initializationNeeded, true);
});

test("malformed JSON is discoverable but cannot be written until corrected", () => {
  const root = createWorkspace();
  writeFile(root, "planning/broken.json", "{ broken\n");
  const document = byDisplayName(listPlanningDocuments(root), "broken");

  assert.equal(document.effectiveDisposition, "Pending");
  assert.equal(document.initializationNeeded, true);
  assert.throws(
    () => setDocumentDisposition(root, document.logicalDocumentId, "Approved"),
    /content could not be read|Unexpected token|Expected property name/,
  );
});

test("one injected file read failure is isolated to one pending read-error document", (t) => {
  const root = createWorkspace();
  writeFile(root, "planning/broken.md", "# Broken\n");
  writeFile(root, "planning/healthy.md", "# Healthy\n");
  withServiceHooks(t, {
    failRead: (relativePath) =>
      relativePath === "planning/broken.md" ? "Injected local read failure." : undefined,
  });

  const documents = listPlanningDocuments(root);
  const broken = byDisplayName(documents, "broken");
  const healthy = byDisplayName(documents, "healthy");

  assert.equal(documents.length, 2);
  assert.equal(broken.effectiveDisposition, "Pending");
  assert.equal(broken.initializationNeeded, true);
  assert.equal(broken.synchronizationState, "read-error");
  assert.equal(broken.readError, "Injected local read failure.");
  assert.equal(readPlanningDocument(root, healthy.logicalDocumentId).preview, "# Healthy\n");
  assert.equal(setDocumentDisposition(root, healthy.logicalDocumentId, "Approved").effectiveDisposition, "Approved");
  assert.throws(
    () => setDocumentDisposition(root, broken.logicalDocumentId, "Approved"),
    /content could not be read/,
  );
});

test("one injected file metadata failure is isolated to one read-error document", (t) => {
  const root = createWorkspace();
  writeFile(root, "planning/meta-broken.md", "# Broken\n");
  writeFile(root, "planning/meta-healthy.md", "# Healthy\n");
  withServiceHooks(t, {
    failLstat: (relativePath) =>
      relativePath === "planning/meta-broken.md" ? "Injected metadata failure." : undefined,
  });

  const documents = listPlanningDocuments(root);
  const broken = byDisplayName(documents, "meta-broken");
  const healthy = byDisplayName(documents, "meta-healthy");

  assert.equal(documents.length, 2);
  assert.equal(broken.synchronizationState, "read-error");
  assert.equal(broken.readError, "Injected metadata failure.");
  assert.equal(healthy.effectiveDisposition, "Pending");
});
