const assert = require("node:assert/strict");
const test = require("node:test");
const { determineTestLifecycle } = require("../../dist/main/validation/testLifecycleDeterminationService.js");

test("bounded lifecycle determination reuses supplied permanent proof for the exact affected capability", () => {
  const result = determineTestLifecycle({ workItemId: "work-1", implementationRecordId: "implementation-1", implementerRevision: "rev-1",
    changedPaths: ["src/main/example.ts"], affectedCapabilityIds: ["example-capability"], evidenceComplete: true,
    catalogProof: [{ testPath: "test/example.test.cjs", behaviorCoverage: [
      { capabilityId: "example-capability", behaviorId: "example-behavior" },
    ], proofRole: "primary", validationLane: "fast", durationMs: 125, ownedResources: ["pure-stateless"] }],
    regressionObligations: [{ id: "obligation-1", capabilityId: "example-capability", state: "active" }] });
  assert.equal(result.recommendation, "reuse-existing-proof");
  assert.equal(result.workItemId, "work-1");
  assert.equal(result.implementerRevision, "rev-1");
  assert.deepEqual(result.consideredProof, [{ testPath: "test/example.test.cjs", behaviorIds: ["example-behavior"],
    proofRole: "primary", validationLane: "fast", durationMs: 125, ownedResources: ["pure-stateless"] }]);
});

test("bounded lifecycle determination keeps incomplete or absent metadata unknown", () => {
  const incomplete = determineTestLifecycle({ workItemId: "work-2", implementationRecordId: "implementation-2", implementerRevision: "rev-2",
    changedPaths: ["src/main/example.ts"], affectedCapabilityIds: ["example-capability"], catalogProof: [] });
  assert.equal(incomplete.recommendation, "lifecycle-review-candidate");
  assert.ok(incomplete.unknowns.length > 0);
  const unsupportedNoTest = determineTestLifecycle({ workItemId: "work-2", implementationRecordId: "implementation-2", implementerRevision: "rev-2",
    changedPaths: ["src/main/example.ts"], affectedCapabilityIds: ["example-capability"], catalogProof: [],
    noPermanentTestRationale: "No behavior change", evidenceComplete: false });
  assert.notEqual(unsupportedNoTest.recommendation, "no-permanent-test-required");
});

test("bounded lifecycle determination rejects unsafe paths and proof outside affected capabilities", () => {
  const base = { workItemId: "work-3", implementationRecordId: "implementation-3", implementerRevision: "rev-3", changedPaths: ["src/main/example.ts"],
    affectedCapabilityIds: ["example-capability"], catalogProof: [] };
  assert.throws(() => determineTestLifecycle({ ...base, changedPaths: ["../secret"] }), /safe repository-relative/);
  assert.throws(() => determineTestLifecycle({ ...base, catalogProof: [{ testPath: "test/a.test.cjs",
    behaviorCoverage: [{ capabilityId: "unrelated", behaviorId: "other" }] }] }), /valid behavior coverage/);
  assert.throws(() => determineTestLifecycle({ ...base, catalogProof: [{ testPath: "../test/a.test.cjs",
    behaviorCoverage: [{ capabilityId: "example-capability", behaviorId: "example" }] }] }), /safe repository-relative/);
  assert.throws(() => determineTestLifecycle({ ...base, catalogProof: [{ testPath: "test/a.test.cjs", durationMs: -1,
    behaviorCoverage: [{ capabilityId: "example-capability", behaviorId: "example" }] }] }), /nonnegative integer/);
});
