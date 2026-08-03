const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  listPlanningDocuments,
  readPlanningDocument,
  savePlanningDocumentRevision,
  setDocumentDisposition,
  setDocumentDispositions,
} = require("../../dist/main/documents/planningDocumentService.js");
const {
  __setCanonicalMarkdownWriterTestHooks,
} = require("../../dist/main/documents/canonicalMarkdownDocumentWriter.js");
const {
  parseCanonicalMarkdownDocument,
} = require("../../dist/shared/documents/canonicalMarkdown.js");
const {
  tempWorkspace,
  writeDoc,
} = require("../support/canonical-markdown-fixtures.cjs");

function readCanonical(root, relativePath) {
  return parseCanonicalMarkdownDocument(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function documentByPath(root, relativePath) {
  const document = listPlanningDocuments(root).find((candidate) => candidate.markdownPath === relativePath);
  assert.ok(document, `Expected planning document at ${relativePath}`);
  return document;
}

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(absolutePath);
    return entry.isFile() && absolutePath.endsWith(".ts") ? [absolutePath] : [];
  });
}

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

test("planning disposition update preserves canonical body and artifact revision", () => {
  const root = tempWorkspace("champcity-planning-disposition-preserve-");
  const relativePath = "planning/project/Project_Intake/PROJECT_INTAKE_demo.md";
  const body = "# Project Intake\n\nKeep this body exactly.\n";
  writeDoc(root, relativePath, "project-intake", "Pending", {
    artifactRevision: 7,
    bodyMarkdown: body,
  });

  const document = documentByPath(root, relativePath);
  const updated = setDocumentDisposition(root, document.logicalDocumentId, "Approved");
  const parsed = readCanonical(root, relativePath);

  assert.equal(updated.metadata.artifactRevision, 7);
  assert.equal(parsed.metadata.artifactRevision, 7);
  assert.equal(parsed.metadata.documentDisposition.status, "Approved");
  assert.equal(parsed.bodyMarkdown, body);
});

test("planning multi-document disposition update rolls back atomically", () => {
  const root = tempWorkspace("champcity-planning-multi-rollback-");
  const alphaPath = "planning/project/Project_Intake/PROJECT_INTAKE_alpha.md";
  const betaPath = "planning/project/Project_Intake/PROJECT_INTAKE_beta.md";
  writeDoc(root, alphaPath, "project-intake", "Pending", { bodyMarkdown: "# Alpha\n\nOriginal.\n" });
  writeDoc(root, betaPath, "project-intake", "Pending", { bodyMarkdown: "# Beta\n\nOriginal.\n" });
  const alphaBytes = fs.readFileSync(path.join(root, alphaPath), "utf8");
  const betaBytes = fs.readFileSync(path.join(root, betaPath), "utf8");
  const logicalIds = [
    documentByPath(root, alphaPath).logicalDocumentId,
    documentByPath(root, betaPath).logicalDocumentId,
  ];

  __setCanonicalMarkdownWriterTestHooks({
    failInstalledVerification(relativePath) {
      return relativePath === betaPath ? "Injected planning bundle verification failure." : undefined;
    },
  });
  try {
    assert.throws(
      () => setDocumentDispositions(root, logicalIds, "Approved"),
      /Injected planning bundle verification failure/,
    );
  } finally {
    __setCanonicalMarkdownWriterTestHooks();
  }

  assert.equal(fs.readFileSync(path.join(root, alphaPath), "utf8"), alphaBytes);
  assert.equal(fs.readFileSync(path.join(root, betaPath), "utf8"), betaBytes);
  assert.equal(readCanonical(root, alphaPath).metadata.documentDisposition.status, "Pending");
  assert.equal(readCanonical(root, betaPath).metadata.documentDisposition.status, "Pending");
});

test("planning substantive revision increments once and invalidates downstream bundle", () => {
  const root = tempWorkspace("champcity-planning-revision-invalidation-");
  const intakePath = "planning/project/Project_Intake/PROJECT_INTAKE_demo.md";
  const profilePath = "planning/project/PROJECT_PROFILE.md";
  const roadmapPath = "planning/project/Project_Roadmap/PROJECT_ROADMAP_demo.md";
  writeDoc(root, intakePath, "project-intake", "Approved", {
    artifactRevision: 3,
    bodyMarkdown: "# Intake\n\nCurrent source.\n",
  });
  const sourceRevisions = [{ path: intakePath, revision: 3 }];
  writeDoc(root, profilePath, "project-profile", "Approved", {
    participationRole: "compoundGatingReview",
    sourceRevisions,
    bodyMarkdown: "# Project Profile\n\nApproved profile.\n",
  });
  writeDoc(root, roadmapPath, "project-roadmap", "Approved", {
    participationRole: "compoundGatingReview",
    sourceRevisions,
    bodyMarkdown: "# Project Roadmap\n\nApproved roadmap.\n",
  });

  const intake = documentByPath(root, intakePath);
  const result = savePlanningDocumentRevision(root, intake.logicalDocumentId);
  const revised = readCanonical(root, intakePath);
  const profile = readCanonical(root, profilePath);
  const roadmap = readCanonical(root, roadmapPath);

  assert.equal(result.revisedDocument.metadata.artifactRevision, 4);
  assert.equal(revised.metadata.artifactRevision, 4);
  assert.equal(revised.metadata.documentDisposition.status, "Pending");
  assert.equal(revised.bodyMarkdown, "# Intake\n\nCurrent source.\n");
  assert.deepEqual(
    result.invalidatedDocuments.map((document) => document.markdownPath).sort(),
    [profilePath, roadmapPath].sort(),
  );
  assert.equal(profile.metadata.artifactRevision, 1);
  assert.equal(profile.metadata.documentDisposition.status, "Pending");
  assert.equal(roadmap.metadata.artifactRevision, 1);
  assert.equal(roadmap.metadata.documentDisposition.status, "Pending");
});

test("planning service write verification failure restores original bytes", () => {
  const root = tempWorkspace("champcity-planning-single-rollback-");
  const relativePath = "planning/project/Project_Intake/PROJECT_INTAKE_demo.md";
  writeDoc(root, relativePath, "project-intake", "Pending", { bodyMarkdown: "# Intake\n\nOriginal.\n" });
  const absolutePath = path.join(root, relativePath);
  const originalBytes = fs.readFileSync(absolutePath, "utf8");
  const document = documentByPath(root, relativePath);

  __setCanonicalMarkdownWriterTestHooks({
    failInstalledVerification() {
      return "Injected planning verification failure.";
    },
  });
  try {
    assert.throws(
      () => setDocumentDisposition(root, document.logicalDocumentId, "Approved"),
      /Injected planning verification failure/,
    );
  } finally {
    __setCanonicalMarkdownWriterTestHooks();
  }

  assert.equal(fs.readFileSync(absolutePath, "utf8"), originalBytes);
  assert.equal(readCanonical(root, relativePath).metadata.documentDisposition.status, "Pending");
});

test("planning service delegates canonical writes to the shared writer", () => {
  const planningService = fs.readFileSync(path.join(process.cwd(), "src/main/documents/planningDocumentService.ts"), "utf8");
  const canonicalWriter = fs.readFileSync(path.join(process.cwd(), "src/main/documents/canonicalMarkdownDocumentWriter.ts"), "utf8");
  const projectIntake = fs.readFileSync(path.join(process.cwd(), "src/main/projectIntake/projectIntakeService.ts"), "utf8");
  const architectPromotion = fs.readFileSync(path.join(process.cwd(), "src/main/architectOutputs/architectDraftPromotionService.ts"), "utf8");
  const mainSourceRoot = path.join(process.cwd(), "src/main");
  const forbiddenWriterImplementers = sourceFiles(mainSourceRoot)
    .filter((absolutePath) => !absolutePath.endsWith(path.join("src", "main", "documents", "canonicalMarkdownDocumentWriter.ts")))
    .filter((absolutePath) => !absolutePath.endsWith(path.join("src", "main", "documents", "artifactTransaction.ts")))
    .map((absolutePath) => ({
      relativePath: path.relative(process.cwd(), absolutePath).replace(/\\/g, "/"),
      content: fs.readFileSync(absolutePath, "utf8"),
    }))
    .filter((source) =>
      source.content.includes("serializeCanonicalMarkdownDocument") ||
      source.content.includes("writeArtifactTransaction"),
    )
    .map((source) => source.relativePath);

  assert.doesNotMatch(planningService, /writeCanonicalMarkdownTransaction/);
  assert.doesNotMatch(planningService, /writeArtifactTransaction/);
  assert.doesNotMatch(planningService, /serializeCanonicalMarkdownDocument/);
  assert.deepEqual(forbiddenWriterImplementers, []);
  assert.match(canonicalWriter, /function writeCanonicalMarkdownDocuments/);
  assert.match(canonicalWriter, /writeArtifactTransaction/);
  assert.match(projectIntake, /documents\/canonicalMarkdownDocumentWriter/);
  assert.match(architectPromotion, /documents\/canonicalMarkdownDocumentWriter/);
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
