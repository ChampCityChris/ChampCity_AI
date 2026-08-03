const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repoRoot = path.join(__dirname, "..", "..");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("renderer uses one generic Architect-output refresh, action bar, and review shell", () => {
  const source = read("src/renderer/app/App.tsx");
  const refreshSource = read("src/renderer/app/architectOutputWorkspaceRefresh.ts");

  assert.match(source, /getArchitectOutputWorkspaceModel\(activeWorkspaceId\)/);
  assert.match(source, /prepareArchitectOutputHandoff\(activeWorkspaceId\)/);
  assert.match(source, /copyArchitectOutputHandoff\(activeWorkspaceId\)/);
  assert.match(source, /reviewArchitectOutput\(/);
  assert.match(source, /function ArchitectOutputActionBar/);
  assert.match(source, /function ArchitectOutputReviewShell/);
  const actionBarSource = source.slice(
    source.indexOf("function ArchitectOutputActionBar"),
    source.indexOf("function ArchitectOutputReviewShell"),
  );
  const reviewShellSource = source.slice(
    source.indexOf("function ArchitectOutputReviewShell"),
    source.indexOf("function CurrentActionPanel"),
  );
  assert.doesNotMatch(actionBarSource, /architect-document-selector/);
  assert.match(reviewShellSource, /model\.documentSlots\.length > 1/);
  assert.match(reviewShellSource, /architect-document-selector/);
  assert.match(reviewShellSource, /document-choice/);
  assert.match(source, /architectOutputPollInFlightRef/);
  assert.match(source, /architectOutputPollRequestRef/);
  assert.match(source, /buildArchitectOutputEvidenceFingerprint/);
  assert.match(refreshSource, /buildArchitectOutputEvidenceFingerprint/);
  assert.match(refreshSource, /selectArchitectOutputSlot/);
  assert.match(source, /viewedArchitectOutputRevisionKeys/);
  assert.match(source, /markSingleDisplayedArchitectOutputRevisionViewed/);
  const loadDocumentSource = source.slice(
    source.indexOf("async function loadDocument"),
    source.indexOf("async function applyDisposition"),
  );
  assert.match(loadDocumentSource, /readDocument\(logicalDocumentId\)/);
  assert.match(loadDocumentSource, /setSelectedDocument\(detail\)/);
  assert.match(loadDocumentSource, /markSingleDisplayedArchitectOutputRevisionViewed\(/);
  assert.match(source, /work-card-planning/);
  assert.match(source, /work-card-repair/);
  assert.match(source, /isWorkCardPlanningPreparation/);
  assert.match(source, /<WorkCardIntakeWorkspace/);
  assert.match(source, /generateWorkCardIntakeAndTransition/);
  assert.match(source, /generateCurrentHandoff\(\)/);
  assert.match(source, /isVisibleArchitectOutputWorkspace/);
  assert.match(source, /work-card-architect-workspace/);
  assert.doesNotMatch(source, /ProjectPlanningActionBar|PhaseMapActionBar|PhasePlanningActionBar|ArchitectInterviewActionBar/);
  assert.doesNotMatch(source, /ProjectPlanningPreviewReview|PhaseMapPreviewReview|PhasePlanningPreviewReview/);
  assert.doesNotMatch(source, /LifecycleArchitectOutputImport/);
  assert.doesNotMatch(source, /Save Architect Output/);
});

test("retired workspace-specific renderer refresh modules are absent", () => {
  for (const relativePath of [
    "src/renderer/app/phaseMapWorkspaceRefresh.ts",
    "src/renderer/app/phaseInterviewWorkspaceRefresh.ts",
    "src/renderer/app/phasePlanningWorkspaceRefresh.ts",
    "src/renderer/app/PhaseInterviewActionBar.tsx",
  ]) {
    assert.equal(fs.existsSync(path.join(repoRoot, relativePath)), false, relativePath);
  }
});
