const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { createPhaseCloseout, getPhaseCloseProjection, setPhaseCloseoutDisposition } = require("../../dist/main/phaseClose/phaseCloseService.js");
const { listPlanningDocuments, savePlanningDocumentRevision } = require("../../dist/main/documents/planningDocumentService.js");

function createRepository() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-phase-close-"));
  fs.mkdirSync(path.join(root, "planning/phases/phase-01/Phase_Interview"), { recursive: true });
  fs.writeFileSync(path.join(root, "planning/phases/phase-01/Phase_Interview.json"), JSON.stringify({ artifactType: "phase-interview", artifactRevision: 1, phaseId: "phase-01", documentDisposition: { status: "Approved" } }, null, 2) + "\n", "utf8");
  return root;
}

function readJson(root, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

test("Phase Closeout begins Pending with source revisions", () => {
  const root = createRepository();
  const result = createPhaseCloseout(root, "phase-01", "Close", "Complete.");
  const closeout = readJson(root, result.jsonPath);
  assert.equal(closeout.documentDisposition.status, "Pending");
  assert.equal(closeout.closureDecision, "Close");
  assert.equal(closeout.sourceRevisions.length > 0, true);
});

test("Approved Close completes phase and returns to Project Building", () => {
  const root = createRepository();
  createPhaseCloseout(root, "phase-01", "Close", "Complete.");
  setPhaseCloseoutDisposition(root, "phase-01", "Approved");
  assert.deepEqual(getPhaseCloseProjection(root, "phase-01"), {
    complete: true,
    workspaceId: "phase-close",
    reason: "Approved Close Phase Closeout completes the phase.",
  });
});

test("Approved DoNotClose remains in Phase Validation", () => {
  const root = createRepository();
  createPhaseCloseout(root, "phase-01", "DoNotClose", "Keep open.");
  setPhaseCloseoutDisposition(root, "phase-01", "Approved");
  assert.equal(getPhaseCloseProjection(root, "phase-01").workspaceId, "phase-validation");
});

test("underlying phase evidence revision invalidates closeout", () => {
  const root = createRepository();
  createPhaseCloseout(root, "phase-01", "Close", "Complete.");
  setPhaseCloseoutDisposition(root, "phase-01", "Approved");
  const interview = listPlanningDocuments(root).find((document) => document.displayFilename === "Phase_Interview");
  savePlanningDocumentRevision(root, interview.logicalDocumentId);
  assert.equal(getPhaseCloseProjection(root, "phase-01").complete, false);
});
