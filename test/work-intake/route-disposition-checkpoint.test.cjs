const assert = require("node:assert/strict");
const test = require("node:test");
const { seedRoutedWorkIntake } = require("../support/work-intake-fixtures.cjs");
const { decideWorkRoute, getWorkRouteDecision } = require("../../dist/main/workIntake/workRouteDecisionService.js");

test("Operator route selection checkpoints its exact Intake source line and retry reuses the commit", async context => {
  const { root, intake, route, git } = await seedRoutedWorkIntake(context, "feature-change");
  assert.equal(route.checkpoint?.status, "committed", JSON.stringify(route.checkpoint));
  const head = git("rev-parse", "HEAD");
  assert.equal(route.checkpoint.commit, head);
  assert.equal((await getWorkRouteDecision(root, intake.intakeId)).state, "selected");
  const again = await decideWorkRoute(root, intake.intakeId, { expectedDecisionRevision: 0,
    sourceAssessment: route.history[0].decision.sourceAssessment, disposition: "override",
    selectedRouteId: "feature-change", rationale: "Operator selects the intended planning focus." });
  assert.equal(again.checkpoint?.status, "committed", JSON.stringify(again.checkpoint));
  assert.equal(again.checkpoint.commit, head);
  assert.equal(git("rev-parse", "HEAD"), head);
});
