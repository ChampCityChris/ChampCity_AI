const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { createValidationAttempt, getWorkCardCloseProjection, setValidationRecordDisposition } = require("../../dist/main/workCardValidation/workCardValidationService.js");
const { savePlanningDocumentRevision } = require("../../dist/main/documents/planningDocumentService.js");

function createRepository() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-work-card-validation-"));
  fs.mkdirSync(path.join(root, "planning/phases/phase-01/Work_Cards"), { recursive: true });
  fs.mkdirSync(path.join(root, "planning/phases/phase-01/Implementer_Reports"), { recursive: true });
  fs.writeFileSync(path.join(root, "planning/phases/phase-01/Work_Cards/WC01_build.json"), JSON.stringify({ artifactType: "formal-work-card", artifactRevision: 1, participationRole: "gatingReview", phaseId: "phase-01", workCardId: "WC01", documentDisposition: { status: "Approved" } }, null, 2) + "\n", "utf8");
  fs.writeFileSync(path.join(root, "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01_build.json"), JSON.stringify({ artifactType: "implementer-report", artifactRevision: 1, participationRole: "gatingReview", phaseId: "phase-01", workCardId: "WC01", sourceRevisions: [{ path: "planning/phases/phase-01/Work_Cards/WC01_build.json", revision: 1 }], documentDisposition: { status: "Approved" } }, null, 2) + "\n", "utf8");
  return root;
}

function readJson(root, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

test("validation record is created only when Operator starts attempt", () => {
  const root = createRepository();
  assert.equal(fs.existsSync(path.join(root, "planning/phases/phase-01/Validation_Records")), false);
  const result = createValidationAttempt(root, "phase-01", "WC01");
  const record = readJson(root, result.jsonPath);
  assert.equal(result.attemptNumber, 1);
  assert.equal(record.documentDisposition.status, "Pending");
  assert.equal(record.parentWorkCard.revision, 1);
});

test("validation attempts are sequential and earlier attempts remain", () => {
  const root = createRepository();
  const first = createValidationAttempt(root, "phase-01", "WC01");
  setValidationRecordDisposition(root, "phase-01", "WC01", "RevisionRequested");
  const second = createValidationAttempt(root, "phase-01", "WC01");
  assert.equal(second.attemptNumber, 2);
  assert.equal(fs.existsSync(path.join(root, first.jsonPath)), true);
});

test("approved current validation closes Work Card and returns to candidate selection", () => {
  const root = createRepository();
  createValidationAttempt(root, "phase-01", "WC01");
  setValidationRecordDisposition(root, "phase-01", "WC01", "Approved");
  assert.deepEqual(getWorkCardCloseProjection(root, "phase-01", "WC01"), {
    closed: true,
    returnTarget: "phase-work-card-selection",
    reason: "Current Approved Validation Record closes the Work Card.",
  });
});

test("later report revision makes older passing validation stale", () => {
  const root = createRepository();
  createValidationAttempt(root, "phase-01", "WC01");
  setValidationRecordDisposition(root, "phase-01", "WC01", "Approved");
  const report = require("../../dist/main/documents/planningDocumentService.js").listPlanningDocuments(root).find((document) => document.displayFilename === "IMPLEMENTER_REPORT_WC01_build");
  savePlanningDocumentRevision(root, report.logicalDocumentId);
  assert.equal(getWorkCardCloseProjection(root, "phase-01", "WC01").closed, false);
});
