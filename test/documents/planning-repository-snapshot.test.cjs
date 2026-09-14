const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  __setPlanningDocumentServiceTestHooks,
  evaluateDocumentFreshness,
  listPlanningDocuments,
  readPlanningDocument,
  setDocumentDisposition,
  setDocumentDispositions,
} = require("../../dist/main/documents/planningDocumentService.js");
const {
  acquirePlanningRepositorySnapshot,
  findPlanningRecordByLogicalDocumentIdFromSnapshot,
  findPlanningRecordByPathFromSnapshot,
} = require("../../dist/main/documents/planningRepositorySnapshot.js");
const {
  resolveFirstNonApprovedDocument,
} = require("../../dist/main/documents/firstNonApprovedResolver.js");
const {
  __setCanonicalMarkdownWriterTestHooks,
  replaceCanonicalMarkdownBodyPreservingMetadata,
  writeCanonicalMarkdownDocumentOnce,
} = require("../../dist/main/documents/canonicalMarkdownDocumentWriter.js");
const {
  metadataOpenDelimiter,
  parseCanonicalMarkdownDocument,
  serializeCanonicalMarkdownDocument,
} = require("../../dist/shared/documents/canonicalMarkdown.js");
const {
  tempWorkspace,
  writeDoc,
} = require("../support/canonical-markdown-fixtures.cjs");

test.afterEach(() => {
  __setPlanningDocumentServiceTestHooks();
  __setCanonicalMarkdownWriterTestHooks();
});

function installCounters() {
  const contentReads = [];
  const recordParses = [];
  __setPlanningDocumentServiceTestHooks({
    onContentRead(relativePath) {
      contentReads.push(relativePath);
    },
    onRecordParse(relativePath) {
      recordParses.push(relativePath);
    },
  });
  return { contentReads, recordParses };
}

function metadata(artifactType, status = "Approved") {
  return {
    schemaVersion: 1,
    artifactType,
    artifactRevision: 1,
    participationRole: "gatingReview",
    identity: {},
    sourceRevisions: [],
    workflowData: {},
    documentDisposition: { status, notes: "", reviewedAt: null },
  };
}

function replaceCanonicalExternally(root, relativePath, transform, atomic = false) {
  const absolutePath = path.join(root, relativePath);
  const current = parseCanonicalMarkdownDocument(fs.readFileSync(absolutePath, "utf8"));
  const replacement = serializeCanonicalMarkdownDocument(
    transform(current.metadata),
    current.bodyMarkdown,
  );
  if (!atomic) {
    fs.writeFileSync(absolutePath, replacement, "utf8");
    return;
  }

  const stagedPath = `${absolutePath}.external-replacement`;
  const backupPath = `${absolutePath}.external-backup`;
  fs.writeFileSync(stagedPath, replacement, "utf8");
  fs.renameSync(absolutePath, backupPath);
  fs.renameSync(stagedPath, absolutePath);
  fs.unlinkSync(backupPath);
}

function countsByPath(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}

test("snapshot reproduces canonical, legacy, nested, draft-exclusion, ordering, indexes, and read-error semantics", () => {
  const root = tempWorkspace("champcity-planning-snapshot-corpus-");
  const canonicalPath = writeDoc(
    root,
    "planning/project/Project_Intake/PROJECT_INTAKE_demo.md",
    "project-intake",
    "Approved",
  );
  const nestedPath = writeDoc(
    root,
    "planning/phases/phase-01/Work_Cards/WC01_example.md",
    "formal-work-card",
    "Pending",
  );
  const legacyPath = "planning/project/notes/legacy.md";
  const invalidPath = "planning/project/notes/invalid.md";
  const draftPath = "planning/Architect_Drafts/example/draft.md";
  fs.mkdirSync(path.join(root, path.dirname(legacyPath)), { recursive: true });
  fs.mkdirSync(path.join(root, path.dirname(draftPath)), { recursive: true });
  fs.writeFileSync(path.join(root, legacyPath), "# Legacy\n", "utf8");
  fs.writeFileSync(path.join(root, invalidPath), `${metadataOpenDelimiter}\nnot json\n`, "utf8");
  fs.writeFileSync(path.join(root, draftPath), "# Draft\n", "utf8");

  const snapshot = acquirePlanningRepositorySnapshot(root);
  const documents = listPlanningDocuments(root);

  assert.deepEqual(
    documents.map((document) => document.markdownPath),
    [canonicalPath, invalidPath, legacyPath, nestedPath].sort((left, right) =>
      left.localeCompare(right, "en", { sensitivity: "base" }),
    ),
  );
  assert.equal(documents.some((document) => document.markdownPath === draftPath), false);
  assert.equal(findPlanningRecordByPathFromSnapshot(snapshot, legacyPath).summary.metadata.artifactType, "legacy-unmanaged");
  assert.equal(findPlanningRecordByPathFromSnapshot(snapshot, invalidPath).summary.documentReadState, "read-error");
  const canonical = findPlanningRecordByPathFromSnapshot(snapshot, canonicalPath);
  assert.equal(
    findPlanningRecordByLogicalDocumentIdFromSnapshot(snapshot, canonical.summary.logicalDocumentId),
    canonical,
  );
  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(Object.isFrozen(canonical.summary), true);
});

test("unchanged list, exact read, freshness, and first-current queries reuse one parsed generation", () => {
  const root = tempWorkspace("champcity-planning-snapshot-reuse-");
  const sourcePath = writeDoc(root, "planning/project/source.md", "project-intake", "Approved");
  const dependentPath = writeDoc(root, "planning/project/dependent.md", "project-profile", "Pending", {
    sourceRevisions: [{ path: sourcePath, revision: 1 }],
  });
  for (let index = 1; index <= 22; index += 1) {
    writeDoc(
      root,
      `planning/project/context/context-${String(index).padStart(2, "0")}.md`,
      "context-record",
      "Approved",
      { participationRole: "historical" },
    );
  }
  const { contentReads, recordParses } = installCounters();

  const initial = acquirePlanningRepositorySnapshot(root);
  const dependent = listPlanningDocuments(root).find((document) => document.markdownPath === dependentPath);
  assert.ok(dependent);
  readPlanningDocument(root, dependent.logicalDocumentId);
  readPlanningDocument(root, dependent.logicalDocumentId);
  evaluateDocumentFreshness(root, dependent.logicalDocumentId);
  evaluateDocumentFreshness(root, dependent.logicalDocumentId);
  resolveFirstNonApprovedDocument(root);
  const final = acquirePlanningRepositorySnapshot(root);

  assert.equal(initial.generation, final.generation);
  assert.equal(contentReads.length, 24);
  assert.equal(recordParses.length, 24);
  assert.equal(countsByPath(contentReads).size, 24);
  assert.equal([...countsByPath(contentReads).values()].every((count) => count === 1), true);
});

test("external overwrite and atomic replacement refresh only the changed record", () => {
  const root = tempWorkspace("champcity-planning-snapshot-external-edit-");
  const changedPath = writeDoc(root, "planning/project/changed.md", "project-profile", "Pending");
  const stablePath = writeDoc(root, "planning/project/stable.md", "project-roadmap", "Pending");
  const counters = installCounters();
  const generation1 = acquirePlanningRepositorySnapshot(root).generation;

  replaceCanonicalExternally(root, changedPath, (current) => ({ ...current, artifactRevision: 2 }));
  const afterOverwrite = listPlanningDocuments(root).find((document) => document.markdownPath === changedPath);
  const generation2 = acquirePlanningRepositorySnapshot(root).generation;
  assert.equal(afterOverwrite.metadata.artifactRevision, 2);
  assert.ok(generation2 > generation1);

  replaceCanonicalExternally(
    root,
    changedPath,
    (current) => ({ ...current, artifactRevision: 3 }),
    true,
  );
  const afterReplacement = readPlanningDocument(root, afterOverwrite.logicalDocumentId);
  const generation3 = acquirePlanningRepositorySnapshot(root).generation;
  assert.equal(afterReplacement.metadata.artifactRevision, 3);
  assert.ok(generation3 > generation2);
  assert.deepEqual(countsByPath(counters.contentReads), new Map([[changedPath, 3], [stablePath, 1]]));
  assert.deepEqual(countsByPath(counters.recordParses), new Map([[changedPath, 3], [stablePath, 1]]));
});

test("external add, delete, and rename update indexes without rereading unrelated records", () => {
  const root = tempWorkspace("champcity-planning-snapshot-inventory-");
  const stablePath = writeDoc(root, "planning/project/stable.md", "project-intake", "Approved");
  const renamedFrom = writeDoc(root, "planning/project/rename-me.md", "project-profile", "Pending");
  const counters = installCounters();
  const generation1 = acquirePlanningRepositorySnapshot(root).generation;
  const originalId = findPlanningRecordByPathFromSnapshot(
    acquirePlanningRepositorySnapshot(root),
    renamedFrom,
  ).summary.logicalDocumentId;

  const addedPath = "planning/project/added.md";
  fs.writeFileSync(
    path.join(root, addedPath),
    serializeCanonicalMarkdownDocument(metadata("phase-map", "Pending"), "# Added\n"),
    "utf8",
  );
  const afterAdd = acquirePlanningRepositorySnapshot(root);
  assert.ok(afterAdd.generation > generation1);
  assert.ok(findPlanningRecordByPathFromSnapshot(afterAdd, addedPath));

  fs.unlinkSync(path.join(root, addedPath));
  const afterDelete = acquirePlanningRepositorySnapshot(root);
  assert.ok(afterDelete.generation > afterAdd.generation);
  assert.equal(findPlanningRecordByPathFromSnapshot(afterDelete, addedPath), undefined);

  const renamedTo = "planning/project/renamed.md";
  fs.renameSync(path.join(root, renamedFrom), path.join(root, renamedTo));
  const afterRename = acquirePlanningRepositorySnapshot(root);
  assert.ok(afterRename.generation > afterDelete.generation);
  assert.equal(findPlanningRecordByPathFromSnapshot(afterRename, renamedFrom), undefined);
  assert.equal(findPlanningRecordByLogicalDocumentIdFromSnapshot(afterRename, originalId), undefined);
  assert.ok(findPlanningRecordByPathFromSnapshot(afterRename, renamedTo));

  fs.unlinkSync(path.join(root, renamedTo));
  fs.mkdirSync(path.join(root, renamedTo));
  const nestedAfterTypeChange = `${renamedTo}/nested.md`;
  fs.writeFileSync(
    path.join(root, nestedAfterTypeChange),
    serializeCanonicalMarkdownDocument(metadata("project-profile", "Pending"), "# Nested\n"),
    "utf8",
  );
  const afterTypeChange = acquirePlanningRepositorySnapshot(root);
  assert.ok(afterTypeChange.generation > afterRename.generation);
  assert.equal(findPlanningRecordByPathFromSnapshot(afterTypeChange, renamedTo), undefined);
  assert.ok(findPlanningRecordByPathFromSnapshot(afterTypeChange, nestedAfterTypeChange));
  assert.deepEqual(
    countsByPath(counters.contentReads),
    new Map([
      [renamedFrom, 1],
      [stablePath, 1],
      [addedPath, 1],
      [renamedTo, 1],
      [nestedAfterTypeChange, 1],
    ]),
  );
});

test("governed single and multi-document writes publish coherent selective generations", () => {
  const root = tempWorkspace("champcity-planning-snapshot-governed-");
  const alphaPath = writeDoc(root, "planning/project/alpha.md", "project-intake", "Pending");
  const betaPath = writeDoc(root, "planning/project/beta.md", "project-profile", "Pending");
  const stablePath = writeDoc(root, "planning/project/stable.md", "project-roadmap", "Pending");
  const counters = installCounters();
  const initial = acquirePlanningRepositorySnapshot(root);
  const alpha = findPlanningRecordByPathFromSnapshot(initial, alphaPath).summary;
  const beta = findPlanningRecordByPathFromSnapshot(initial, betaPath).summary;

  const updatedAlpha = setDocumentDisposition(root, alpha.logicalDocumentId, "Approved");
  const afterSingle = acquirePlanningRepositorySnapshot(root);
  assert.equal(updatedAlpha.effectiveDisposition, "Approved");
  assert.ok(afterSingle.generation > initial.generation);

  const updated = setDocumentDispositions(
    root,
    [alpha.logicalDocumentId, beta.logicalDocumentId],
    "Rejected",
  );
  const afterMulti = acquirePlanningRepositorySnapshot(root);
  assert.ok(afterMulti.generation > afterSingle.generation);
  assert.deepEqual(updated.map((document) => document.effectiveDisposition), ["Rejected", "Rejected"]);
  assert.equal(findPlanningRecordByPathFromSnapshot(afterMulti, alphaPath).summary.effectiveDisposition, "Rejected");
  assert.equal(findPlanningRecordByPathFromSnapshot(afterMulti, betaPath).summary.effectiveDisposition, "Rejected");
  assert.deepEqual(
    countsByPath(counters.contentReads),
    new Map([[alphaPath, 3], [betaPath, 2], [stablePath, 1]]),
  );
});

test("failed canonical verification never exposes staged bytes through the snapshot", () => {
  const root = tempWorkspace("champcity-planning-snapshot-rollback-");
  const alphaPath = writeDoc(root, "planning/project/alpha.md", "project-intake", "Pending");
  const betaPath = writeDoc(root, "planning/project/beta.md", "project-profile", "Pending");
  const initial = acquirePlanningRepositorySnapshot(root);
  const alpha = findPlanningRecordByPathFromSnapshot(initial, alphaPath).summary;
  const beta = findPlanningRecordByPathFromSnapshot(initial, betaPath).summary;

  __setCanonicalMarkdownWriterTestHooks({
    failInstalledVerification(relativePath) {
      return relativePath === betaPath ? "Injected snapshot rollback failure." : undefined;
    },
  });
  assert.throws(
    () => setDocumentDispositions(root, [alpha.logicalDocumentId, beta.logicalDocumentId], "Approved"),
    /Injected snapshot rollback failure/,
  );

  const afterRollback = acquirePlanningRepositorySnapshot(root);
  assert.equal(findPlanningRecordByPathFromSnapshot(afterRollback, alphaPath).summary.effectiveDisposition, "Pending");
  assert.equal(findPlanningRecordByPathFromSnapshot(afterRollback, betaPath).summary.effectiveDisposition, "Pending");
  assert.equal(parseCanonicalMarkdownDocument(fs.readFileSync(path.join(root, alphaPath), "utf8")).metadata.documentDisposition.status, "Pending");
  assert.equal(parseCanonicalMarkdownDocument(fs.readFileSync(path.join(root, betaPath), "utf8")).metadata.documentDisposition.status, "Pending");
});

test("write-once and controlled body replacement invalidate their planning paths after success", () => {
  const root = tempWorkspace("champcity-planning-snapshot-writer-boundaries-");
  const initial = acquirePlanningRepositorySnapshot(root);
  const relativePath = "planning/project/created-once.md";
  const canonicalMetadata = metadata("project-intake", "Pending");

  writeCanonicalMarkdownDocumentOnce({
    workspaceRoot: root,
    relativePath,
    metadata: canonicalMetadata,
    bodyMarkdown: "# Original\n",
  });
  const afterCreate = acquirePlanningRepositorySnapshot(root);
  assert.ok(afterCreate.generation > initial.generation);
  assert.match(findPlanningRecordByPathFromSnapshot(afterCreate, relativePath).bodyMarkdown, /Original/);

  const installed = fs.readFileSync(path.join(root, relativePath), "utf8");
  const closeIndex = installed.indexOf("CHAMPCITY-METADATA -->") + "CHAMPCITY-METADATA -->".length;
  replaceCanonicalMarkdownBodyPreservingMetadata({
    workspaceRoot: root,
    relativePath,
    metadataEnvelope: installed.slice(0, closeIndex),
    expectedMetadata: canonicalMetadata,
    bodyMarkdown: "# Replaced\n",
  });
  const afterReplace = acquirePlanningRepositorySnapshot(root);
  assert.ok(afterReplace.generation > afterCreate.generation);
  assert.match(findPlanningRecordByPathFromSnapshot(afterReplace, relativePath).bodyMarkdown, /Replaced/);
});

test("snapshot generations and logical indexes remain isolated by canonical workspace root", () => {
  const rootA = tempWorkspace("champcity-planning-snapshot-root-a-");
  const rootB = tempWorkspace("champcity-planning-snapshot-root-b-");
  const pathA = writeDoc(rootA, "planning/project/a.md", "project-intake", "Pending");
  const pathB = writeDoc(rootB, "planning/project/b.md", "project-intake", "Pending");
  const snapshotA1 = acquirePlanningRepositorySnapshot(rootA);
  const snapshotB1 = acquirePlanningRepositorySnapshot(rootB);
  const idA = findPlanningRecordByPathFromSnapshot(snapshotA1, pathA).summary.logicalDocumentId;
  const idB = findPlanningRecordByPathFromSnapshot(snapshotB1, pathB).summary.logicalDocumentId;

  setDocumentDisposition(rootA, idA, "Approved");
  const snapshotA2 = acquirePlanningRepositorySnapshot(rootA);
  const snapshotB2 = acquirePlanningRepositorySnapshot(rootB);

  assert.ok(snapshotA2.generation > snapshotA1.generation);
  assert.equal(snapshotB2.generation, snapshotB1.generation);
  assert.equal(findPlanningRecordByLogicalDocumentIdFromSnapshot(snapshotA2, idB), undefined);
  assert.equal(findPlanningRecordByLogicalDocumentIdFromSnapshot(snapshotB2, idA), undefined);
});

test("lstat and content-read failures retain bounded read-error projection", () => {
  const root = tempWorkspace("champcity-planning-snapshot-errors-");
  const lstatPath = writeDoc(root, "planning/project/lstat.md", "project-intake", "Pending");
  const readPath = writeDoc(root, "planning/project/read.md", "project-profile", "Pending");
  let injectFailures = true;
  __setPlanningDocumentServiceTestHooks({
    failLstat(relativePath) {
      return injectFailures && relativePath === lstatPath ? "Injected lstat error." : undefined;
    },
    failRead(relativePath) {
      return injectFailures && relativePath === readPath ? "Injected read error." : undefined;
    },
  });

  const documents = listPlanningDocuments(root);
  assert.equal(documents.find((document) => document.markdownPath === lstatPath).documentReadState, "read-error");
  assert.match(documents.find((document) => document.markdownPath === lstatPath).readError, /Injected lstat error/);
  assert.equal(documents.find((document) => document.markdownPath === readPath).documentReadState, "read-error");
  assert.match(documents.find((document) => document.markdownPath === readPath).readError, /Injected read error/);

  injectFailures = false;
  const recovered = listPlanningDocuments(root);
  assert.equal(recovered.find((document) => document.markdownPath === lstatPath).documentReadState, "readable");
  assert.equal(recovered.find((document) => document.markdownPath === readPath).documentReadState, "readable");
});
