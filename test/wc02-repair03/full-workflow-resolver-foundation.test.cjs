const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const {
  scanVerifiedArtifactGraph,
} = require("../../dist/main/repository");
const {
  RelationshipDrivenWorkflowResolver,
} = require("../../dist/main/workflow/relationshipDrivenWorkflowResolver");
const {
  workflowActionCatalog,
} = require("../../dist/shared/workflow");

const FIXED_TIME = "2026-07-18T04:00:00.000Z";

function project(root) {
  return {
    projectId: "champcity-ai",
    displayName: "ChampCity_AI",
    repositoryRoot: root,
    planningRoot: path.join(root, "planning"),
    branchBehavior: { mode: "observe-current" },
    enabled: true,
    createdAt: FIXED_TIME,
    updatedAt: FIXED_TIME,
    lastOpenedAt: null,
    lastScanAt: null,
    lastScanResult: null,
    observerStatus: "stopped",
  };
}

async function liveProjection() {
  const configured = project(process.cwd());
  const graph = await scanVerifiedArtifactGraph(configured, () => FIXED_TIME);
  return new RelationshipDrivenWorkflowResolver().resolve(configured, graph, 1);
}

test("real Phase 04-06 corpus routes WC02-REPAIR03 through exact existing-output traversal", async () => {
  const projection = await liveProjection();
  assert.equal(projection.state.activePhaseId, "phase-06");
  assert.equal(projection.state.phaseExecution.activeCandidateId, "WC02");
  assert.equal(projection.state.phaseExecution.activeRepairArtifactId, "champcity-ai/phase-06/work_card/WC02-REPAIR03");
  assert.deepEqual(projection.state.blockingConditions, []);

  const expectedReportId = "champcity-ai/phase-06/implementer_report/WC02-REPAIR03";
  const reportExists = projection.graph.controlling(expectedReportId) !== null;
  if (reportExists) {
    assert.equal(projection.state.currentActionId, "architect_review_of_implementer_report_required");
    assert.equal(projection.state.currentAction?.screenId, "architect-review");
    assert.equal(projection.state.expectedOutput?.artifactId, "champcity-ai/phase-06/architect_review/WC02-REPAIR03");
  } else {
    assert.equal(projection.state.currentActionId, "implementer_execution_required");
    assert.equal(projection.state.currentAction?.screenId, "implementer-execution");
    assert.equal(projection.state.expectedOutput?.artifactId, expectedReportId);
  }
});

test("repairs remain explicit sequential lineage, not Work Card Plan candidates", async () => {
  const projection = await liveProjection();
  const plan = projection.graph.controlling("champcity-ai/phase-06/work_card_plan/Work_Card_Plan");
  const planCandidates = plan.artifact.payload.data.candidates.map((candidate) => candidate.id);
  assert.deepEqual(planCandidates, ["WC01", "WC02"]);

  const repair = projection.graph.controlling("champcity-ai/phase-06/work_card/WC02-REPAIR03");
  assert.equal(repair.artifact.parentArtifactId, "champcity-ai/phase-06/work_card/WC02");
  assert.equal(repair.artifact.payload.data.repairSequence, 3);
  assert.equal(
    repair.artifact.payload.data.priorRepairWorkCardArtifactId,
    "champcity-ai/phase-06/work_card/WC02-REPAIR02",
  );
  assert.equal(
    repair.artifact.payload.data.authorizingDispositionArtifactId,
    "champcity-ai/phase-06/candidate_disposition/WC02",
  );
});

test("catalog contains no routed Ad Hoc Work Card Capture action", () => {
  const normalActions = workflowActionCatalog.filter((entry) => entry.advancesWorkflowState);
  assert.equal(
    normalActions.some((entry) => entry.manualScreenId === "new-work-card" || entry.screenId === "new-work-card"),
    false,
  );
  assert.equal(
    normalActions.some((entry) => entry.actionId.includes("ad_hoc")),
    false,
  );
});
