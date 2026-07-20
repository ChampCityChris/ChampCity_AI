const assert = require("node:assert/strict");
const test = require("node:test");

const {
  canonicalWorkflowSpine,
  defaultLifecycleActionTemplates,
  lockedProcessContract,
  materializeActionCatalog,
  validateExecutableProcessConformance,
} = require("../../dist/shared/workflow");

const LOCKED_PROCESS = [
  "project_intake",
  "project_interview",
  "reconciliation_review",
  "project_mapping",
  "operator_project_approval",
  "phase_mapping",
  "operator_phase_approval",
  "work_card_loop",
  "phase_closeout",
  "operator_phase_closeout_approval",
  "roadmap_update",
  "next_phase_activation",
  "repeat_phase_mapping_and_work_card_loop",
];

function bindings() {
  return Object.fromEntries(
    defaultLifecycleActionTemplates.map((action) => [
      action.actionId,
      {
        targetArtifactId: `champcity-ai/target/${action.actionId}`,
        sourceArtifactIds: [`champcity-ai/source/${action.actionId}`],
        expectedOutputArtifactId: `champcity-ai/output/${action.actionId}`,
      },
    ]),
  );
}

test("the typed contract is the single source for the exact locked top-level process", () => {
  const topLevel = lockedProcessContract.filter(
    (item) => item.classification === "top_level",
  );
  assert.deepEqual([...canonicalWorkflowSpine], LOCKED_PROCESS);
  assert.deepEqual(
    topLevel.map((item) => item.processId),
    LOCKED_PROCESS,
  );
  for (const item of lockedProcessContract) {
    assert.ok(item.processId);
    assert.ok(item.displayName);
    assert.ok(["top_level", "subordinate"].includes(item.classification));
    assert.ok(item.owner);
    assert.ok(Array.isArray(item.requiredSourceAuthority));
    assert.ok(Array.isArray(item.conditionalSourceRequirements));
    assert.ok(item.expectedOutput);
    assert.deepEqual(Object.keys(item.routes), ["success", "failure", "repair"]);
    assert.equal(typeof item.advancesWorkflowState, "boolean");
  }
});

test("the executable catalog conforms to the contract it is derived from", () => {
  const catalog = materializeActionCatalog(
    defaultLifecycleActionTemplates,
    bindings(),
  );
  const result = validateExecutableProcessConformance(catalog);
  assert.equal(result.conforms, true, result.issues.join("\n"));
  assert.deepEqual(result.topLevelProcessIds, LOCKED_PROCESS);
});

test("subordinate project artifacts and optional handoff utilities are not runtime gates", () => {
  const runtimeActionIds = new Set(
    defaultLifecycleActionTemplates.map((item) => item.actionId),
  );
  for (const forbiddenActionId of [
    "project_planning_required",
    "project_roadmap_required",
    "phase_intake_required",
    "phase_interview_required",
    "phase_planning_required",
    "work_card_plan_review_required",
    "implementer_handoff_required",
  ]) {
    assert.equal(runtimeActionIds.has(forbiddenActionId), false, forbiddenActionId);
  }
  const packet = lockedProcessContract.find(
    (item) => item.processId === "implementer_execution_packet",
  );
  assert.equal(packet.classification, "subordinate");
  assert.equal(packet.advancesWorkflowState, false);
});

test("operator gates use scoped target protocol artifact types only", () => {
  const expectedByAction = new Map(
    defaultLifecycleActionTemplates.map((item) => [
      item.actionId,
      item.expectedOutputArtifactType,
    ]),
  );
  assert.equal(expectedByAction.get("operator_project_approval_required"), "operator_approval");
  assert.equal(expectedByAction.get("operator_phase_approval_required"), "operator_approval");
  assert.equal(expectedByAction.get("operator_work_card_approval_required"), "operator_approval");
  assert.equal(expectedByAction.get("operator_validation_required"), "operator_validation");
  assert.equal(expectedByAction.get("operator_phase_closeout_approval_required"), "operator_approval");
  assert.equal(expectedByAction.get("project_mapping_required"), "project_roadmap");
  assert.equal(expectedByAction.get("roadmap_update_required"), "project_roadmap");

  const runtimeArtifactTypes = new Set(
    defaultLifecycleActionTemplates.map((item) => item.expectedOutputArtifactType),
  );
  for (const legacyType of [
    "project_approval",
    "phase_approval",
    "work_card_approval",
    "phase_closeout_approval",
    "validation_report",
    "repository_reconciliation",
    "roadmap",
  ]) {
    assert.equal(runtimeArtifactTypes.has(legacyType), false, legacyType);
  }
});

test("governance maintenance actions are outside the normal Work Card Loop", () => {
  const repair = defaultLifecycleActionTemplates.find(
    (item) => item.actionId === "governance_integrity_repair_required",
  );
  const approval = defaultLifecycleActionTemplates.find(
    (item) => item.actionId === "operator_governance_approval_required",
  );
  for (const action of [repair, approval]) {
    assert.ok(action);
    assert.equal(action.processId, "governance_maintenance");
    assert.equal(action.stage, "maintenance");
    assert.equal(action.processClassification, "subordinate");
    assert.equal(action.advancesWorkflowState, false);
    assert.notEqual(action.processId, "work_card_loop");
    assert.notEqual(action.stage, "prove");
  }
});

test("conformance rejects a subordinate action promoted into the top-level process", () => {
  const catalog = materializeActionCatalog(
    defaultLifecycleActionTemplates,
    bindings(),
  );
  const routeReview = catalog.find(
    (item) => item.actionId === "route_review_request_required",
  );
  routeReview.processClassification = "top_level";
  routeReview.advancesWorkflowState = true;
  const result = validateExecutableProcessConformance(catalog);
  assert.equal(result.conforms, false);
  assert.match(result.issues.join("\n"), /classification|advancement|exactly match/i);
});

test("conformance rejects top-level process reordering and unknown gates", () => {
  const catalog = materializeActionCatalog(
    defaultLifecycleActionTemplates,
    bindings(),
  );
  const first = catalog.shift();
  catalog.splice(2, 0, first);
  catalog.push({
    ...catalog[0],
    actionId: "project_planning_required",
    processId: "project_planning",
  });
  const result = validateExecutableProcessConformance(catalog);
  assert.equal(result.conforms, false);
  assert.match(result.issues.join("\n"), /not defined|exactly match/i);
});
