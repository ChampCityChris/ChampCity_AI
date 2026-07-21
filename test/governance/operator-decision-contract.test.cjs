const assert = require("node:assert/strict");
const { test } = require("node:test");

const {
  computeOperatorDecisionTargetSetHash,
  normalizeOperatorDecisionTargets,
  normalizeOperatorReason,
  operatorDecisionOutcomeEquals,
  stableOperatorDecisionTargetSetPayload,
  validateOperatorDecisionIntentShape,
} = require("../../dist/shared/operatorDecisionContract.js");

function target(input) {
  return {
    artifactId: input.artifactId,
    artifactType: input.artifactType,
    revision: input.revision,
    payloadHash: input.payloadHash,
  };
}

test("Operator decision contract validates stages, outcomes, targets, reasons, and deterministic target identity", () => {
  const phase = target({
    artifactId: "champcity-ai/phase-07/phase_planning/Phase_Planning",
    artifactType: "phase_planning",
    revision: 1,
    payloadHash: "sha256:1111111111111111111111111111111111111111111111111111111111111111",
  });
  const plan = target({
    artifactId: "champcity-ai/phase-07/work_card_plan/Work_Card_Plan",
    artifactType: "work_card_plan",
    revision: 1,
    payloadHash: "sha256:2222222222222222222222222222222222222222222222222222222222222222",
  });
  const reversed = [plan, phase];
  const normal = [phase, plan];

  assert.deepEqual(normalizeOperatorDecisionTargets(reversed), normal);
  assert.equal(
    stableOperatorDecisionTargetSetPayload({ stage: "phase_planning", targets: reversed }),
    stableOperatorDecisionTargetSetPayload({ stage: "phase_planning", targets: normal }),
  );
  assert.equal(
    computeOperatorDecisionTargetSetHash({ stage: "phase_planning", targets: reversed }),
    computeOperatorDecisionTargetSetHash({ stage: "phase_planning", targets: normal }),
  );

  assert.notEqual(
    computeOperatorDecisionTargetSetHash({ stage: "phase_planning", targets: normal }),
    computeOperatorDecisionTargetSetHash({ stage: "work_card", targets: normal }),
  );
  assert.notEqual(
    computeOperatorDecisionTargetSetHash({ stage: "phase_planning", targets: normal }),
    computeOperatorDecisionTargetSetHash({ stage: "phase_planning", targets: [phase] }),
  );
  assert.notEqual(
    computeOperatorDecisionTargetSetHash({ stage: "phase_planning", targets: normal }),
    computeOperatorDecisionTargetSetHash({
      stage: "phase_planning",
      targets: [{ ...phase, revision: 2 }, plan],
    }),
  );
  assert.notEqual(
    computeOperatorDecisionTargetSetHash({ stage: "phase_planning", targets: normal }),
    computeOperatorDecisionTargetSetHash({
      stage: "phase_planning",
      targets: [{ ...phase, payloadHash: "sha256:3333333333333333333333333333333333333333333333333333333333333333" }, plan],
    }),
  );

  assert.throws(
    () => validateOperatorDecisionIntentShape({
      stage: "unsupported_stage",
      targets: [phase],
      outcome: { kind: "stage_decision", decision: "approved" },
    }),
    /stage is not supported/i,
  );
  assert.throws(
    () => validateOperatorDecisionIntentShape({
      stage: "phase_planning",
      targets: [phase, phase],
      outcome: { kind: "stage_decision", decision: "approved" },
    }),
    /duplicate artifact IDs/i,
  );
  assert.throws(
    () => validateOperatorDecisionIntentShape({
      stage: "work_card",
      targets: [phase],
      outcome: { kind: "stage_decision", decision: "rejected" },
    }),
    /reason is required/i,
  );
  assert.throws(
    () => validateOperatorDecisionIntentShape({
      stage: "work_card",
      targets: [phase],
      outcome: { kind: "unsupported_kind", decision: "approved" },
    }),
    /outcome kind is not supported/i,
  );
  assert.throws(
    () => validateOperatorDecisionIntentShape({
      stage: "work_card",
      targets: [phase],
      outcome: { kind: "stage_decision", decision: "maybe" },
    }),
    /stage decision value is not supported/i,
  );
  assert.throws(
    () => validateOperatorDecisionIntentShape({
      stage: "work_card",
      targets: [phase],
      outcome: { kind: "record_disposition", disposition: "parked" },
    }),
    /record disposition value is not supported/i,
  );
  assert.throws(
    () => validateOperatorDecisionIntentShape({
      stage: "work_card",
      targets: [phase],
      outcome: { kind: "record_disposition", disposition: "merged" },
      operatorReason: "merged into approved record",
    }),
    /canonical surviving artifact ID/i,
  );
  assert.throws(
    () => validateOperatorDecisionIntentShape({
      stage: "work_card",
      targets: [phase],
      outcome: { kind: "record_disposition", disposition: "superseded" },
      operatorReason: "superseded by a later record",
    }),
    /superseding artifact ID/i,
  );
  assert.doesNotThrow(() => validateOperatorDecisionIntentShape({
    stage: "work_card",
    targets: [phase],
    outcome: {
      kind: "record_disposition",
      disposition: "merged",
      canonicalSurvivingArtifactId: "champcity-ai/phase-07/work_card/WC01",
    },
    operatorReason: "merged into approved record",
  }));
  assert.equal(normalizeOperatorReason("  same reason  "), "same reason");
  assert.equal(
    operatorDecisionOutcomeEquals(
      { decision: "approved", kind: "stage_decision" },
      { kind: "stage_decision", decision: "approved" },
    ),
    true,
  );
  assert.equal(
    normalizeOperatorReason("same reason"),
    normalizeOperatorReason("  same reason  "),
  );
  assert.notEqual(
    normalizeOperatorReason("same reason"),
    normalizeOperatorReason("changed reason"),
  );
});
