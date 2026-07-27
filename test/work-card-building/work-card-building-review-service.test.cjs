const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createImplementerReportForApprovedWorkCard,
  getOperatorValidationEligibility,
  setImplementerReportDisposition,
} = require("../../dist/main/workCardBuilding/workCardBuildingReviewService.js");
const {
  seedApprovedFormalWorkCard,
  tempWorkspace,
} = require("../support/canonical-markdown-fixtures.cjs");

test("work card building creates Markdown-only Implementer Report and gates validation eligibility", () => {
  const root = tempWorkspace("champcity-work-card-building-");
  seedApprovedFormalWorkCard(root, "phase-01", "WC01");

  const result = createImplementerReportForApprovedWorkCard(root, "phase-01", "WC01");
  assert.equal(result.markdownPath, "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01_first_work_card.md");
  assert.equal(["json", "Path"].join("") in result, false);

  setImplementerReportDisposition(root, "phase-01", "WC01", "Approved");
  assert.equal(getOperatorValidationEligibility(root, "phase-01", "WC01").eligible, true);
});
