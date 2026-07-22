const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { architectBrowserSecuritySummary } = require("../../dist/main/browser/architectBrowserService.js");
const { createRepairWorkCard } = require("../../dist/main/workCardRepair/workCardRepairService.js");

function createRepository(evidenceKind = "report") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-work-card-repair-"));
  const dir = evidenceKind === "report"
    ? path.join(root, "planning/phases/phase-01/Implementer_Reports")
    : path.join(root, "planning/phases/phase-01/Validation_Reports");
  fs.mkdirSync(dir, { recursive: true });
  const file = evidenceKind === "report" ? "IMPLEMENTER_REPORT_WC01_build" : "VALIDATION_REPORT_WC01";
  fs.writeFileSync(path.join(dir, `${file}.json`), JSON.stringify({
    artifactType: evidenceKind,
    artifactRevision: 1,
    participationRole: "gatingReview",
    phaseId: "phase-01",
    workCardId: "WC01",
    documentDisposition: { status: "RevisionRequested" },
  }, null, 2) + "\n", "utf8");
  return { root, evidencePath: `planning/phases/phase-01/${evidenceKind === "report" ? "Implementer_Reports" : "Validation_Reports"}/${file}.json` };
}

function readJson(root, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

test("pre-validation repair creates Approved handoff and Pending repair with original parent", () => {
  const { root, evidencePath } = createRepository("report");

  const result = createRepairWorkCard(root, "phase-01", "WC01", evidencePath, "preValidationReportReview", "Fix report issue");
  const handoff = readJson(root, result.handoffJsonPath);
  const repair = readJson(root, result.repairJsonPath);

  assert.equal(result.repairId, "WC01-REPAIR01");
  assert.equal(handoff.participationRole, "nonReviewHandoff");
  assert.equal(handoff.documentDisposition.status, "Approved");
  assert.equal(repair.originalParentWorkCardId, "WC01");
  assert.equal(repair.returnTarget, "work-card-building-review");
  assert.equal(repair.documentDisposition.status, "Pending");
});

test("failed repair report creates next sibling rather than nested repair parent", () => {
  const { root, evidencePath } = createRepository("report");
  createRepairWorkCard(root, "phase-01", "WC01", evidencePath, "preValidationReportReview", "First fix");

  const result = createRepairWorkCard(root, "phase-01", "WC01-REPAIR01", evidencePath, "preValidationReportReview", "Second fix");
  const repair = readJson(root, result.repairJsonPath);

  assert.equal(result.repairId, "WC01-REPAIR02");
  assert.equal(repair.originalParentWorkCardId, "WC01");
});

test("post-validation repair contract uses validation return target", () => {
  const { root, evidencePath } = createRepository("validation");

  const result = createRepairWorkCard(root, "phase-01", "WC01", evidencePath, "postValidationRecord", "Fix validation issue");
  const repair = readJson(root, result.repairJsonPath);

  assert.equal(repair.origin, "postValidationRecord");
  assert.equal(repair.returnTarget, "work-card-validation");
});

test("repair creation rejects wrong origin evidence", () => {
  const { root, evidencePath } = createRepository("validation");

  assert.throws(
    () => createRepairWorkCard(root, "phase-01", "WC01", evidencePath, "preValidationReportReview", "Wrong origin"),
    /Implementer Report/,
  );
});

test("Work Card Repair preserves WC03 browser security contract", () => {
  assert.deepEqual(architectBrowserSecuritySummary(), {
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
    preload: null,
  });
});
