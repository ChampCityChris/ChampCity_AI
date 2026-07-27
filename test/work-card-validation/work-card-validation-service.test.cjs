const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createValidationAttempt,
  getWorkCardCloseProjection,
  setValidationRecordDisposition,
} = require("../../dist/main/workCardValidation/workCardValidationService.js");
const {
  seedApprovedFormalWorkCard,
  tempWorkspace,
  writeDoc,
} = require("../support/canonical-markdown-fixtures.cjs");

test("work card validation creates Markdown-only validation record and closes on approval", () => {
  const root = tempWorkspace("champcity-work-card-validation-");
  seedApprovedFormalWorkCard(root, "phase-01", "WC01");
  writeDoc(root, "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01_first_work_card.md", "implementer-report", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC01" },
  });

  const result = createValidationAttempt(root, "phase-01", "WC01");
  assert.equal(result.attemptNumber, 1);
  assert.equal(result.markdownPath, "planning/phases/phase-01/Validation_Records/VALIDATION_RECORD_WC01_ATTEMPT01.md");
  assert.equal(["json", "Path"].join("") in result, false);

  setValidationRecordDisposition(root, "phase-01", "WC01", "Approved");
  assert.equal(getWorkCardCloseProjection(root, "phase-01", "WC01").closed, true);
});
