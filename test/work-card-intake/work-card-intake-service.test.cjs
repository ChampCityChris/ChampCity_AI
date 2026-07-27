const assert = require("node:assert/strict");
const test = require("node:test");

const {
  generateWorkCardIntakeHandoff,
  selectNextWorkCardCandidate,
} = require("../../dist/main/workCardIntake/workCardIntakeService.js");
const {
  seedApprovedPhasePlanningBundle,
  tempWorkspace,
} = require("../support/canonical-markdown-fixtures.cjs");

test("work card intake selects eligible candidate and writes Markdown-only handoff", () => {
  const root = tempWorkspace("champcity-work-card-intake-");
  seedApprovedPhasePlanningBundle(root, "phase-01", "WC01");

  const selection = selectNextWorkCardCandidate(root, "phase-01");
  assert.equal(selection.state, "selected");
  const result = generateWorkCardIntakeHandoff(root, "phase-01");
  assert.equal(result.handoffMarkdownPath, "planning/phases/phase-01/Architect_Handoffs/WORK_CARD_INTAKE_ARCHITECT_HANDOFF_WC01.md");
  assert.equal(result.formalWorkCardMarkdownPath, "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md");
  assert.equal(["handoff", "Json", "Path"].join("") in result, false);
});
