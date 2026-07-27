const assert = require("node:assert/strict");
const test = require("node:test");

const {
  generatePhasePlanningHandoff,
  getPhasePlanningCompletion,
  setPhasePlanningBundleDisposition,
} = require("../../dist/main/phasePlanning/phasePlanningService.js");
const {
  seedApprovedPhaseInterview,
  seedApprovedProjectPlanning,
  seedPhaseMap,
  tempWorkspace,
  writeDoc,
} = require("../support/canonical-markdown-fixtures.cjs");

test("phase planning service generates Markdown-only handoff and validates approved bundle", () => {
  const root = tempWorkspace("champcity-phase-planning-");
  seedApprovedProjectPlanning(root);
  seedPhaseMap(root, "phase-01");
  seedApprovedPhaseInterview(root, "phase-01");

  const result = generatePhasePlanningHandoff(root);
  assert.equal(result.phasePlanningMarkdownPath, "planning/phases/phase-01/Phase_Planning.md");
  assert.equal(result.workCardPlanMarkdownPath, "planning/phases/phase-01/Work_Card_Plan.md");
  assert.equal(["workCardPlan", "Json", "Path"].join("") in result, false);

  writeDoc(root, result.phasePlanningMarkdownPath, "phase-planning", "Pending", {
    participationRole: "compoundGatingReview",
    identity: { phaseId: "phase-01" },
    workflowData: { candidates: [] },
  });
  writeDoc(root, result.workCardPlanMarkdownPath, "work-card-plan", "Pending", {
    participationRole: "compoundGatingReview",
    identity: { phaseId: "phase-01" },
    workflowData: { candidates: [] },
  });
  setPhasePlanningBundleDisposition(root, "phase-01", "Approved");
  assert.equal(getPhasePlanningCompletion(root, "phase-01").complete, true);
});
