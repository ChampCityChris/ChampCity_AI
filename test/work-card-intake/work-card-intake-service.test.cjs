const assert = require("node:assert/strict");
const test = require("node:test");

const {
  generateWorkCardIntakeHandoff,
  getWorkCardIntakeProjection,
  selectNextWorkCardCandidate,
} = require("../../dist/main/workCardIntake/workCardIntakeService.js");
const {
  seedApprovedPhaseInterview,
  seedApprovedPhasePlanningBundle,
  seedApprovedProjectPlanning,
  seedPhaseMap,
  tempWorkspace,
} = require("../support/canonical-markdown-fixtures.cjs");

test("work card intake selects eligible candidate and writes Markdown-only handoff", () => {
  const root = tempWorkspace("champcity-work-card-intake-");
  seedApprovedProjectPlanning(root);
  seedPhaseMap(root, "phase-01");
  seedApprovedPhaseInterview(root, "phase-01");
  seedApprovedPhasePlanningBundle(root, "phase-01", "WC01");

  const selection = selectNextWorkCardCandidate(root, "phase-01");
  assert.equal(selection.state, "selected");
  const result = generateWorkCardIntakeHandoff(root, "phase-01");
  assert.equal(result.handoffMarkdownPath, "planning/phases/phase-01/Architect_Handoffs/WORK_CARD_INTAKE_ARCHITECT_HANDOFF_WC01.md");
  assert.equal(result.formalWorkCardMarkdownPath, "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md");
  assert.equal(["handoff", "Json", "Path"].join("") in result, false);
});

test("work card intake projection uses the same selected candidate and target paths as generation", () => {
  const root = tempWorkspace("champcity-work-card-intake-projection-");
  seedApprovedProjectPlanning(root);
  seedPhaseMap(root, "phase-01");
  seedApprovedPhaseInterview(root, "phase-01");
  seedApprovedPhasePlanningBundle(root, "phase-01", "WC01");

  const projection = getWorkCardIntakeProjection(root, "phase-01");
  const generated = generateWorkCardIntakeHandoff(root, "phase-01");

  assert.equal(projection.phaseId, "phase-01");
  assert.equal(projection.sourceWorkCardPlanPath, "planning/phases/phase-01/Work_Card_Plan.md");
  assert.equal(projection.selectionReason, "Candidate is planned, incomplete, and all predecessors permit continuation.");
  assert.deepEqual(projection.candidate, {
    candidateId: "WC01",
    order: 1,
    title: "First Work Card",
    purpose: "Implement the first unit.",
    dependsOn: [],
    resolutionStatus: "planned",
    resolutionReason: "",
    evidencePaths: [],
    carriedForwardToPhaseId: undefined,
  });
  assert.equal(projection.handoffMarkdownPath, generated.handoffMarkdownPath);
  assert.equal(projection.formalWorkCardMarkdownPath, generated.formalWorkCardMarkdownPath);
});
