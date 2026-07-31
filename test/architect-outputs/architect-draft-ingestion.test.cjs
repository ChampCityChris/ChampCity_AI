const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  parseCanonicalMarkdownDocument,
} = require("../../dist/shared/documents/canonicalMarkdown.js");
const {
  __setCanonicalMarkdownWriterTestHooks,
} = require("../../dist/main/documents/canonicalMarkdownDocumentWriter.js");
const {
  buildDeterministicArchitectDraftSubmissionId,
} = require("../../dist/main/architectOutputs/architectDraftPaths.js");
const {
  createArchitectOutputRegistry,
} = require("../../dist/main/architectOutputs/architectOutputRegistry.js");
const {
  cleanupArchitectDraftSubmission,
  createArchitectDraftSubmission,
  inspectArchitectDraftSubmission,
} = require("../../dist/main/architectOutputs/architectDraftSubmissionService.js");
const {
  promoteArchitectDraftSubmission,
} = require("../../dist/main/architectOutputs/architectDraftPromotionService.js");
const {
  listPlanningDocuments,
} = require("../../dist/main/documents/planningDocumentService.js");

function tempWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-architect-drafts-"));
  fs.mkdirSync(path.join(root, "planning"), { recursive: true });
  return root;
}

function context(submissionKey = "demo") {
  return {
    submissionKey,
    sourceHandoff: {
      path: "planning/fixture/Handoffs/FIXTURE_HANDOFF.md",
      revision: 2,
    },
  };
}

function canonicalMetadata(submission, slotId, artifactType, role = "gatingReview") {
  return {
    schemaVersion: 1,
    artifactType,
    artifactRevision: 1,
    participationRole: role,
    identity: {
      fixtureSubmissionId: submission.submissionId,
      fixtureSlotId: slotId,
    },
    sourceRevisions: [submission.sourceHandoff],
    workflowData: {
      fixtureOutputKind: submission.outputKind,
      promotionGroupId: submission.promotionGroupId,
    },
    documentDisposition: { status: "Pending", notes: "", reviewedAt: null },
  };
}

function singleDefinition() {
  const definition = {
    outputKind: "fixture-single-architect-draft",
    owningWorkspaceId: "fixture-architect-workspace",
    bundleMode: "single-output",
    slots: [{
      slotId: "single",
      displayLabel: "Fixture Single Draft",
      draftPathComponent: "single.md",
      validateBody(bodyMarkdown) {
        if (!bodyMarkdown.includes("## Required Structure")) {
          throw new Error("Fixture single draft requires the structure heading.");
        }
      },
      buildCanonicalDocument({ submission, slotId }) {
        return {
          relativePath: `planning/fixtures/${submission.submissionId}/SINGLE_OUTPUT.md`,
          metadata: canonicalMetadata(submission, slotId, "fixture-single-architect-output"),
        };
      },
    }],
    buildSubmissionId(input) {
      return buildDeterministicArchitectDraftSubmissionId({
        outputKind: definition.outputKind,
        owningWorkspaceId: definition.owningWorkspaceId,
        ...input,
      });
    },
    buildPromotionGroupId(input) {
      return buildDeterministicArchitectDraftSubmissionId({
        outputKind: `${definition.outputKind}-group`,
        owningWorkspaceId: definition.owningWorkspaceId,
        ...input,
      });
    },
    buildPostPromotionSelection({ promotedDocuments }) {
      return { selectedPath: promotedDocuments[0].relativePath };
    },
  };
  return definition;
}

function bundleDefinition() {
  const definition = {
    outputKind: "fixture-bundle-architect-draft",
    owningWorkspaceId: "fixture-architect-workspace",
    bundleMode: "atomic-bundle",
    slots: [
      {
        slotId: "alpha",
        displayLabel: "Fixture Bundle Alpha",
        draftPathComponent: "alpha.md",
        validateBody(bodyMarkdown) {
          if (!bodyMarkdown.includes("## Alpha Contract")) {
            throw new Error("Fixture alpha draft requires the alpha heading.");
          }
        },
        buildCanonicalDocument({ submission, slotId }) {
          return {
            relativePath: `planning/fixtures/${submission.submissionId}/BUNDLE_ALPHA.md`,
            metadata: canonicalMetadata(
              submission,
              slotId,
              "fixture-bundle-alpha-architect-output",
              "compoundGatingReview",
            ),
          };
        },
      },
      {
        slotId: "beta",
        displayLabel: "Fixture Bundle Beta",
        draftPathComponent: "beta.md",
        validateBody(bodyMarkdown) {
          if (!bodyMarkdown.includes("## Beta Contract")) {
            throw new Error("Fixture beta draft requires the beta heading.");
          }
        },
        buildCanonicalDocument({ submission, slotId }) {
          return {
            relativePath: `planning/fixtures/${submission.submissionId}/BUNDLE_BETA.md`,
            metadata: canonicalMetadata(
              submission,
              slotId,
              "fixture-bundle-beta-architect-output",
              "compoundGatingReview",
            ),
          };
        },
      },
    ],
    buildSubmissionId(input) {
      return buildDeterministicArchitectDraftSubmissionId({
        outputKind: definition.outputKind,
        owningWorkspaceId: definition.owningWorkspaceId,
        ...input,
      });
    },
    buildPromotionGroupId(input) {
      return buildDeterministicArchitectDraftSubmissionId({
        outputKind: `${definition.outputKind}-group`,
        owningWorkspaceId: definition.owningWorkspaceId,
        ...input,
      });
    },
    buildPostPromotionSelection({ promotedDocuments }) {
      return { selectedPaths: promotedDocuments.map((document) => document.relativePath) };
    },
  };
  return definition;
}

function writeDraft(root, submission, slotId, bodyMarkdown) {
  const slot = submission.expectedDraftSlots.find((candidate) => candidate.slotId === slotId);
  assert.ok(slot);
  const absolutePath = path.join(root, slot.draftRelativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, bodyMarkdown, "utf8");
  return slot.draftRelativePath;
}

function readCanonical(root, relativePath) {
  return parseCanonicalMarkdownDocument(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

test("central draft paths are deterministic and excluded from planning discovery", () => {
  const root = tempWorkspace();
  const definition = singleDefinition();
  const submission = createArchitectDraftSubmission(definition, context("discovery"));
  assert.match(submission.submissionId, /^architect-draft-fixture-architect-workspace-/);
  assert.equal(
    submission.expectedDraftSlots[0].draftRelativePath,
    `planning/Architect_Drafts/${submission.submissionId}/single.md`,
  );

  writeDraft(root, submission, "single", "# Draft\n\n## Required Structure\n");
  fs.mkdirSync(path.join(root, "planning/visible"), { recursive: true });
  fs.writeFileSync(path.join(root, "planning/visible/VISIBLE.md"), "# Visible\n", "utf8");

  const documents = listPlanningDocuments(root);
  assert.deepEqual(
    documents.map((document) => document.markdownPath),
    ["planning/visible/VISIBLE.md"],
  );
});

test("inspection reports waiting, partial, ready, failed, promoted, and superseded states", () => {
  const root = tempWorkspace();
  const definition = bundleDefinition();
  const submission = createArchitectDraftSubmission(definition, context("states"));

  assert.equal(inspectArchitectDraftSubmission(root, submission).state, "waiting-for-drafts");
  writeDraft(root, submission, "alpha", "# Alpha\n\n## Alpha Contract\n");
  const partial = inspectArchitectDraftSubmission(root, submission);
  assert.equal(partial.state, "partial-draft-set");
  assert.deepEqual(partial.missingSlots.map((slot) => slot.slotId), ["beta"]);

  writeDraft(root, submission, "beta", "# Beta\n\n## Beta Contract\n");
  assert.equal(inspectArchitectDraftSubmission(root, submission).state, "ready-for-promotion");
  assert.equal(inspectArchitectDraftSubmission(root, { ...submission, state: "promotion-failed" }).state, "promotion-failed");
  assert.equal(inspectArchitectDraftSubmission(root, { ...submission, state: "promoted" }).state, "promoted");
  assert.equal(inspectArchitectDraftSubmission(root, { ...submission, state: "superseded" }).state, "superseded");

  assert.throws(
    () => inspectArchitectDraftSubmission(root, {
      ...submission,
      expectedDraftSlots: [{
        ...submission.expectedDraftSlots[0],
        draftRelativePath: "planning/not-drafts/alpha.md",
      }],
    }),
    /central submission draft root/,
  );
});

test("single-output promotion writes canonical metadata, cleans drafts, and is idempotent", () => {
  const root = tempWorkspace();
  const definition = singleDefinition();
  const registry = createArchitectOutputRegistry([definition]);
  const submission = createArchitectDraftSubmission(definition, context("single-promotion"));
  writeDraft(root, submission, "single", "# Fixture Single\n\n## Required Structure\n\nBody text.\n");

  const result = promoteArchitectDraftSubmission({ workspaceRoot: root, registry, submission });
  assert.equal(result.status, "promoted");
  assert.equal(result.alreadyPromoted, false);
  assert.deepEqual(result.selection, { selectedPath: result.finalRelativePaths[0] });
  assert.equal(fs.existsSync(path.join(root, submission.expectedDraftSlots[0].draftRelativePath)), false);

  const promoted = readCanonical(root, result.finalRelativePaths[0]);
  assert.equal(promoted.metadata.artifactType, "fixture-single-architect-output");
  assert.equal(promoted.metadata.identity.fixtureSubmissionId, submission.submissionId);
  assert.deepEqual(promoted.metadata.sourceRevisions, [submission.sourceHandoff]);
  assert.equal(promoted.bodyMarkdown, "# Fixture Single\n\n## Required Structure\n\nBody text.\n");

  const beforeBytes = fs.readFileSync(path.join(root, result.finalRelativePaths[0]), "utf8");
  const repeated = promoteArchitectDraftSubmission({
    workspaceRoot: root,
    registry,
    submission: result.submission,
  });
  assert.equal(repeated.status, "promoted");
  assert.equal(repeated.alreadyPromoted, true);
  assert.equal(fs.readFileSync(path.join(root, result.finalRelativePaths[0]), "utf8"), beforeBytes);
});

test("atomic bundle promotion blocks partials, rolls back failures, retains drafts, and cleans on success", () => {
  const root = tempWorkspace();
  const definition = bundleDefinition();
  const registry = createArchitectOutputRegistry([definition]);
  const submission = createArchitectDraftSubmission(definition, context("bundle-promotion"));
  writeDraft(root, submission, "alpha", "# Alpha\n\n## Alpha Contract\n");

  const partial = promoteArchitectDraftSubmission({ workspaceRoot: root, registry, submission });
  assert.equal(partial.status, "not-ready");
  assert.equal(fs.existsSync(path.join(root, `planning/fixtures/${submission.submissionId}/BUNDLE_ALPHA.md`)), false);

  writeDraft(root, submission, "beta", "# Beta\n\nWrong structure.\n");
  const structuralFailure = promoteArchitectDraftSubmission({ workspaceRoot: root, registry, submission });
  assert.equal(structuralFailure.status, "promotion-failed");
  assert.match(structuralFailure.error, /beta heading/);
  assert.equal(fs.existsSync(path.join(root, submission.expectedDraftSlots[0].draftRelativePath)), true);
  assert.equal(fs.existsSync(path.join(root, submission.expectedDraftSlots[1].draftRelativePath)), true);
  assert.equal(fs.existsSync(path.join(root, `planning/fixtures/${submission.submissionId}/BUNDLE_BETA.md`)), false);

  writeDraft(root, submission, "beta", "# Beta\n\n## Beta Contract\n");
  __setCanonicalMarkdownWriterTestHooks({
    failInstalledVerification(relativePath) {
      return relativePath.endsWith("BUNDLE_BETA.md") ? "Injected bundle verification failure." : undefined;
    },
  });
  try {
    const writeFailure = promoteArchitectDraftSubmission({ workspaceRoot: root, registry, submission });
    assert.equal(writeFailure.status, "promotion-failed");
    assert.match(writeFailure.error, /Injected bundle verification failure/);
    assert.equal(fs.existsSync(path.join(root, `planning/fixtures/${submission.submissionId}/BUNDLE_ALPHA.md`)), false);
    assert.equal(fs.existsSync(path.join(root, `planning/fixtures/${submission.submissionId}/BUNDLE_BETA.md`)), false);
    assert.equal(fs.existsSync(path.join(root, submission.expectedDraftSlots[0].draftRelativePath)), true);
    assert.equal(fs.existsSync(path.join(root, submission.expectedDraftSlots[1].draftRelativePath)), true);
  } finally {
    __setCanonicalMarkdownWriterTestHooks();
  }

  const success = promoteArchitectDraftSubmission({ workspaceRoot: root, registry, submission });
  assert.equal(success.status, "promoted");
  assert.deepEqual(success.selection, { selectedPaths: success.finalRelativePaths });
  assert.equal(success.finalRelativePaths.length, 2);
  assert.equal(readCanonical(root, success.finalRelativePaths[0]).metadata.artifactType, "fixture-bundle-alpha-architect-output");
  assert.equal(readCanonical(root, success.finalRelativePaths[1]).metadata.artifactType, "fixture-bundle-beta-architect-output");
  assert.equal(fs.existsSync(path.join(root, submission.expectedDraftSlots[0].draftRelativePath)), false);
  assert.equal(fs.existsSync(path.join(root, submission.expectedDraftSlots[1].draftRelativePath)), false);
});

test("superseded submissions do not promote and cleanup removes only expected drafts", () => {
  const root = tempWorkspace();
  const definition = singleDefinition();
  const registry = createArchitectOutputRegistry([definition]);
  const submission = createArchitectDraftSubmission(definition, context("superseded-cleanup"));
  const draftRelativePath = writeDraft(root, submission, "single", "# Fixture Single\n\n## Required Structure\n");
  const unrelatedPath = path.join(root, `planning/Architect_Drafts/${submission.submissionId}/unrelated.md`);
  fs.writeFileSync(unrelatedPath, "# Unrelated\n", "utf8");

  const superseded = promoteArchitectDraftSubmission({
    workspaceRoot: root,
    registry,
    submission: { ...submission, state: "superseded" },
  });
  assert.equal(superseded.status, "superseded");
  assert.equal(fs.existsSync(path.join(root, draftRelativePath)), true);

  cleanupArchitectDraftSubmission(root, submission);
  assert.equal(fs.existsSync(path.join(root, draftRelativePath)), false);
  assert.equal(fs.existsSync(unrelatedPath), true);
});
