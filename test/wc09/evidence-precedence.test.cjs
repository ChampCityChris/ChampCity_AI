const assert = require("node:assert/strict");
const test = require("node:test");

const {
  resolveCandidateEvidencePrecedence,
} = require("../../dist/shared/workflow");

function evidence(
  artifactId,
  kind,
  controllingSequence,
  overrides = {},
) {
  return {
    artifactId,
    candidateId: "WC08",
    kind,
    controllingSequence,
    status: "active",
    ...overrides,
  };
}

test("later failure and repair authority reopen an earlier passing candidate", () => {
  const result = resolveCandidateEvidencePrecedence("WC08", [
    evidence("validation/WC08-pass", "candidate_validation_pass", 1),
    evidence("validation/WC08-later-fail", "candidate_validation_failure", 2),
    evidence("disposition/WC08", "architect_repair_disposition", 3, {
      repairArtifactId: "work-card/WC08-REPAIR01",
    }),
    evidence("work-card/WC08-REPAIR01", "work_card_repair_active", 4),
  ]);

  assert.equal(result.ambiguous, false);
  assert.equal(result.resolutionStatus, "unresolved");
  assert.equal(result.reopenedByArtifactId, "validation/WC08-later-fail");
  assert.equal(result.activeRepairArtifactId, "work-card/WC08-REPAIR01");
  assert.deepEqual(result.resolutionEvidenceArtifactIds, []);
});

test("a later controlling repair pass resolves the reopened parent via repair", () => {
  const result = resolveCandidateEvidencePrecedence("WC08", [
    evidence("work-card/WC08-REPAIR01", "work_card_repair_active", 4),
    evidence("validation/WC08-pass", "candidate_validation_pass", 1),
    evidence("validation/WC08-REPAIR01-pass", "repair_validation_pass", 5),
    evidence("disposition/WC08", "architect_repair_disposition", 3, {
      repairArtifactId: "work-card/WC08-REPAIR01",
    }),
    evidence("validation/WC08-later-fail", "candidate_validation_failure", 2),
  ]);

  assert.equal(result.resolutionStatus, "completed_via_repair");
  assert.equal(result.activeRepairArtifactId, null);
  assert.deepEqual(result.resolutionEvidenceArtifactIds, [
    "validation/WC08-REPAIR01-pass",
  ]);
  assert.deepEqual(result.controllingEvidenceArtifactIds, [
    "validation/WC08-pass",
    "validation/WC08-later-fail",
    "disposition/WC08",
    "work-card/WC08-REPAIR01",
    "validation/WC08-REPAIR01-pass",
  ]);
});

test("historical, superseded, and archived favorable evidence cannot resolve", () => {
  const result = resolveCandidateEvidencePrecedence("WC08", [
    evidence("validation/historical-pass", "candidate_validation_pass", 1, {
      status: "historical",
    }),
    evidence("validation/superseded-repair-pass", "repair_validation_pass", 2, {
      status: "superseded",
    }),
    evidence("validation/archived-pass", "candidate_validation_pass", 3, {
      status: "archived",
    }),
    evidence("work-card/active-repair", "work_card_repair_active", 4),
  ]);

  assert.equal(result.resolutionStatus, "unresolved");
  assert.equal(result.activeRepairArtifactId, "work-card/active-repair");
  assert.deepEqual(result.excludedEvidenceArtifactIds, [
    "validation/archived-pass",
    "validation/historical-pass",
    "validation/superseded-repair-pass",
  ]);
});

test("duplicate controlling sequence blocks instead of using input or timestamp order", () => {
  const result = resolveCandidateEvidencePrecedence("WC08", [
    evidence("validation/pass", "candidate_validation_pass", 1),
    evidence("validation/fail", "candidate_validation_failure", 1),
  ]);

  assert.equal(result.ambiguous, true);
  assert.equal(result.resolutionStatus, "unresolved");
  assert.equal(result.blockers[0].code, "candidate_authority_ambiguous");
  assert.deepEqual(result.blockers[0].artifactIds, [
    "validation/fail",
    "validation/pass",
  ]);
});

test("a later active repair reopens an earlier repair pass", () => {
  const result = resolveCandidateEvidencePrecedence("WC08", [
    evidence("validation/repair-pass", "repair_validation_pass", 5),
    evidence("work-card/later-active-repair", "work_card_repair_active", 6),
  ]);

  assert.equal(result.resolutionStatus, "unresolved");
  assert.equal(result.reopenedByArtifactId, "work-card/later-active-repair");
  assert.equal(result.activeRepairArtifactId, "work-card/later-active-repair");
});
