const assert = require("node:assert/strict");
const test = require("node:test");

const {
  getWorkCardBuildingEligibility,
  saveFormalWorkCardOutput,
  setFormalWorkCardDisposition,
} = require("../../dist/main/workCardPlanning/workCardPlanningService.js");
const {
  generateWorkCardIntakeHandoff,
} = require("../../dist/main/workCardIntake/workCardIntakeService.js");
const {
  seedApprovedPhasePlanningBundle,
  tempWorkspace,
} = require("../support/canonical-markdown-fixtures.cjs");

test("work card planning creates Markdown-only Formal Work Card and approves eligibility", () => {
  const root = tempWorkspace("champcity-work-card-planning-");
  seedApprovedPhasePlanningBundle(root, "phase-01", "WC01");
  generateWorkCardIntakeHandoff(root, "phase-01");

  const result = saveFormalWorkCardOutput(root, "# Formal Work Card\n\nArchitect-authored scope and acceptance.");
  assert.equal(result.formalWorkCardMarkdownPath, "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md");
  assert.equal(["json", "Path"].join("") in result, false);

  setFormalWorkCardDisposition(root, "phase-01", "WC01", "Approved");
  assert.equal(getWorkCardBuildingEligibility(root, "phase-01", "WC01").eligible, true);
});
