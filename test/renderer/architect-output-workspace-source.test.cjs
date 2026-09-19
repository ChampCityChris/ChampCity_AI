const assert = require("node:assert/strict");
const test = require("node:test");
const {
  buildArchitectOutputEvidenceFingerprint, selectArchitectOutputSlot,
  markSingleDisplayedArchitectOutputRevisionViewed, presentedRevisionsForArchitectOutputModel,
} = require("./renderer-source-loader.cjs").loadRendererSourceModule("src/renderer/app/architectOutputWorkspaceRefresh.ts");

const slot = { slotId: "formal-work-card", targetPath: "planning/phases/phase-01/Work_Cards/WC01_demo.md", logicalDocumentId: "wc01", artifactRevision: 2, disposition: "Pending", documentReadState: "readable", freshnessState: "fresh" };
const model = { workspaceId: "work-card-planning", outputKind: "formal-work-card", state: "awaiting-review", documentSlots: [slot] };

test("Architect refresh fingerprints distinguish repository, revision, and disposition changes", () => {
  const baseline = buildArchitectOutputEvidenceFingerprint("project-a", model);
  assert.equal(buildArchitectOutputEvidenceFingerprint("project-a", { ...model, documentSlots: [{ ...slot }] }), baseline);
  assert.notEqual(buildArchitectOutputEvidenceFingerprint("project-b", model), baseline);
  for (const changed of [{ artifactRevision: 3 }, { disposition: "Approved" }, { documentReadState: "missing" }]) {
    assert.notEqual(buildArchitectOutputEvidenceFingerprint("project-a", { ...model, documentSlots: [{ ...slot, ...changed }] }), baseline);
  }
});

test("Architect review marks only the displayed readable current revision as viewed", () => {
  const detail = { logicalDocumentId: slot.logicalDocumentId, markdownPath: slot.targetPath, documentReadState: "readable", metadata: { artifactRevision: 2 } };
  for (const changed of [{ metadata: { artifactRevision: 1 } }, { logicalDocumentId: "other" }, { readError: "unreadable" }, { markdownPath: "other.md" }]) {
    assert.deepEqual(markSingleDisplayedArchitectOutputRevisionViewed(model, { ...detail, ...changed }, []), []);
  }
  const viewed = markSingleDisplayedArchitectOutputRevisionViewed(model, detail, []);
  assert.equal(viewed.length, 1);
  assert.equal(markSingleDisplayedArchitectOutputRevisionViewed(model, detail, viewed), viewed);
  assert.deepEqual(presentedRevisionsForArchitectOutputModel(model), [{ slotId: slot.slotId, targetPath: slot.targetPath, artifactRevision: 2 }]);
  const missing = { slotId: "missing", targetPath: "pending.md" };
  const bundle = { ...model, documentSlots: [missing, slot] };
  assert.equal(selectArchitectOutputSlot(bundle, null), slot);
  assert.equal(selectArchitectOutputSlot(bundle, "missing"), missing);
  assert.deepEqual(presentedRevisionsForArchitectOutputModel(bundle), presentedRevisionsForArchitectOutputModel(model));
  assert.deepEqual(markSingleDisplayedArchitectOutputRevisionViewed(bundle, detail, []), []);
});
