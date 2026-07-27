const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createRepairWorkCard,
} = require("../../dist/main/workCardRepair/workCardRepairService.js");
const {
  tempWorkspace,
  writeDoc,
} = require("../support/canonical-markdown-fixtures.cjs");

test("work card repair creates Markdown-only repair handoff from RevisionRequested evidence", () => {
  const root = tempWorkspace("champcity-work-card-repair-");
  const evidencePath = writeDoc(root, "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01_first_work_card.md", "implementer-report", "RevisionRequested", {
    identity: { phaseId: "phase-01", workCardId: "WC01" },
    notes: "Repair required.",
  });

  const result = createRepairWorkCard(root, "phase-01", "WC01", evidencePath, "preValidationReportReview", "Fix literal compliance");
  assert.equal(result.repairId, "WC01-REPAIR01");
  assert.equal(result.handoffMarkdownPath, "planning/phases/phase-01/Architect_Handoffs/REPAIR_ARCHITECT_HANDOFF_WC01-REPAIR01.md");
  assert.equal(result.repairMarkdownPath, "planning/phases/phase-01/Work_Cards/WC01-REPAIR01_fix_literal_compliance.md");
  assert.equal(["repair", "Json", "Path"].join("") in result, false);
});
