const assert = require("node:assert/strict");
const test = require("node:test");

const {
  loadRendererSourceModule,
} = require("./renderer-source-loader.cjs");
const {
  markSingleDisplayedArchitectOutputRevisionViewed,
  revisionKeyForArchitectOutputSlot,
} = loadRendererSourceModule("src/renderer/app/architectOutputWorkspaceRefresh.ts");

function slot(overrides = {}) {
  return {
    slotId: overrides.slotId ?? "formal-work-card",
    displayLabel: overrides.displayLabel ?? "Formal Work Card",
    targetPath: overrides.targetPath ?? "planning/phases/phase-08/Work_Cards/WC43_demo.md",
    logicalDocumentId: Object.hasOwn(overrides, "logicalDocumentId")
      ? overrides.logicalDocumentId
      : "formal-work-card-id",
    artifactRevision: Object.hasOwn(overrides, "artifactRevision")
      ? overrides.artifactRevision
      : 1,
    disposition: overrides.disposition ?? "Pending",
    documentReadState: overrides.documentReadState ?? "readable",
    freshnessState: overrides.freshnessState ?? "fresh",
    readError: overrides.readError,
  };
}

function model(overrides = {}) {
  const documentSlots = overrides.documentSlots ?? [slot(overrides.slot ?? {})];
  return {
    workspaceId: overrides.workspaceId ?? "work-card-planning",
    outputKind: overrides.outputKind ?? "formal-work-card",
    bundleMode: overrides.bundleMode ?? "single-output",
    state: overrides.state ?? "ready-for-review",
    railStatus: overrides.railStatus ?? "Awaiting Approval",
    requiredAction: overrides.requiredAction ?? "Review Formal Work Card.",
    reason: overrides.reason ?? "Current output is ready for review.",
    evidencePaths: overrides.evidencePaths ?? [],
    canPrepareHandoff: overrides.canPrepareHandoff ?? true,
    canCopyHandoff: overrides.canCopyHandoff ?? true,
    canApplyDisposition: overrides.canApplyDisposition ?? true,
    documentSlots,
  };
}

function detail(overrides = {}) {
  return {
    logicalDocumentId: overrides.logicalDocumentId ?? "formal-work-card-id",
    markdownPath: overrides.markdownPath ?? "planning/phases/phase-08/Work_Cards/WC43_demo.md",
    displayFilename: overrides.displayFilename ?? "WC43_demo.md",
    metadata: {
      artifactRevision: overrides.artifactRevision ?? 1,
      artifactType: overrides.artifactType ?? "work-card",
      participationRole: overrides.participationRole ?? "gatingReview",
    },
    effectiveDisposition: overrides.effectiveDisposition ?? "Pending",
    documentReadState: overrides.documentReadState ?? "readable",
    initializationNeeded: false,
    readError: overrides.readError,
    bodyMarkdown: overrides.bodyMarkdown ?? "# Demo",
    preview: overrides.preview ?? "# Demo",
    previewTruncated: false,
  };
}

test("single readable displayed output revision is marked viewed exactly once", () => {
  const currentModel = model();
  const revisionKey = revisionKeyForArchitectOutputSlot(currentModel.documentSlots[0]);

  assert.deepEqual(
    markSingleDisplayedArchitectOutputRevisionViewed(currentModel, detail(), []),
    [revisionKey],
  );
  assert.deepEqual(
    markSingleDisplayedArchitectOutputRevisionViewed(currentModel, detail(), [revisionKey]),
    [revisionKey],
  );
});

test("mismatched or unreadable single-output detail is not marked viewed", () => {
  const currentModel = model();

  for (const displayedDetail of [
    detail({ logicalDocumentId: "wrong-id" }),
    detail({ markdownPath: "planning/phases/phase-08/Work_Cards/WC43_wrong.md" }),
    detail({ artifactRevision: 2 }),
    detail({ readError: "Invalid canonical Markdown." }),
    detail({ documentReadState: "read-error" }),
  ]) {
    assert.deepEqual(
      markSingleDisplayedArchitectOutputRevisionViewed(currentModel, displayedDetail, []),
      [],
    );
  }
});

test("missing slot revision or logical document does not mark viewed", () => {
  assert.deepEqual(
    markSingleDisplayedArchitectOutputRevisionViewed(
      model({ slot: { artifactRevision: undefined } }),
      detail(),
      [],
    ),
    [],
  );
  assert.deepEqual(
    markSingleDisplayedArchitectOutputRevisionViewed(
      model({ slot: { logicalDocumentId: undefined } }),
      detail(),
      [],
    ),
    [],
  );
});

test("replacement revision must be displayed before the new key is marked", () => {
  const revisedModel = model({ slot: { artifactRevision: 2 } });
  const revisedKey = revisionKeyForArchitectOutputSlot(revisedModel.documentSlots[0]);

  assert.deepEqual(
    markSingleDisplayedArchitectOutputRevisionViewed(revisedModel, detail({ artifactRevision: 1 }), []),
    [],
  );
  assert.deepEqual(
    markSingleDisplayedArchitectOutputRevisionViewed(revisedModel, detail({ artifactRevision: 2 }), []),
    [revisedKey],
  );
});

test("atomic bundles are not automatically marked by single-output display logic", () => {
  const bundleModel = model({
    bundleMode: "atomic-bundle",
    documentSlots: [
      slot({ slotId: "phase-plan", targetPath: "planning/phase.md", logicalDocumentId: "phase-plan-id" }),
      slot({ slotId: "work-card-plan", targetPath: "planning/work-cards.md", logicalDocumentId: "work-card-plan-id" }),
    ],
  });

  assert.deepEqual(
    markSingleDisplayedArchitectOutputRevisionViewed(
      bundleModel,
      detail({
        logicalDocumentId: "phase-plan-id",
        markdownPath: "planning/phase.md",
      }),
      [],
    ),
    [],
  );
});
