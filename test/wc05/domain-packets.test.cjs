const assert = require("node:assert/strict");
const test = require("node:test");

const {
  advanceExecutionRun,
  compileImplementerPassJob,
  compileIndependentVerificationJob,
  createExecutionRun,
  validateExecutionPassPlan,
} = require("../../dist/shared/executionRuns/executionRun.js");
const { estimateContextTokens } = require("../../dist/shared/contextPackets/contextPacket.js");
const {
  executionAcceptanceContract,
  executionPassPlan,
  repositoryFacts,
} = require("./execution-fixtures.cjs");

test("Execution Pass Plan validates strict identities and pass assignments", () => {
  assert.deepEqual(validateExecutionPassPlan(executionPassPlan, executionAcceptanceContract), []);
  assert.match(
    validateExecutionPassPlan(
      { ...executionPassPlan, workCardRevision: 2 },
      executionAcceptanceContract,
    ).join(" "),
    /does not match its Acceptance Contract/,
  );
  const misassigned = {
    ...executionPassPlan,
    passes: executionPassPlan.passes.map((pass) =>
      pass.passId === "P02" ? { ...pass, requirementIds: ["R-DOMAIN"] } : pass,
    ),
  };
  assert.match(
    validateExecutionPassPlan(misassigned, executionAcceptanceContract).join(" "),
    /does not authorize Execution Pass P02/,
  );
});

test("bounded Implementer and Verifier packets bind to current pass and exact result", () => {
  let run = createExecutionRun(
    executionPassPlan,
    executionAcceptanceContract,
    "2026-07-18T20:00:00.000Z",
  );
  const implementer = compileImplementerPassJob({
    run,
    plan: executionPassPlan,
    contract: executionAcceptanceContract,
    repositoryFacts,
    sourceSummaries: [
      {
        sourceId: executionAcceptanceContract.workCardArtifactId,
        title: "WC05",
        summary: "Only P01 source summary.",
      },
    ],
    priorPassResults: [],
  });
  assert.equal(implementer.passId, "P01");
  assert.deepEqual(implementer.includedRequirementIds, ["R-DOMAIN", "R-PACKETS"]);
  assert.match(implementer.markdown, /Pure Execution Run transitions/);
  assert.doesNotMatch(implementer.markdown, /Contract, Plan, and Run canonical pairs persist/);
  assert.ok(estimateContextTokens(implementer.markdown) <= executionPassPlan.passTokenBudget);

  run = advanceExecutionRun(run, executionPassPlan, executionAcceptanceContract, {
    type: "packet_compiled",
    passId: "P01",
    packetId: implementer.jobId,
    packetFingerprint: implementer.packetFingerprint,
    occurredAt: "2026-07-18T20:01:00.000Z",
  });
  run = advanceExecutionRun(run, executionPassPlan, executionAcceptanceContract, {
    type: "implementer_started",
    passId: "P01",
    occurredAt: "2026-07-18T20:02:00.000Z",
  });
  run = advanceExecutionRun(run, executionPassPlan, executionAcceptanceContract, {
    type: "implementer_completed",
    passId: "P01",
    resultArtifactId: "champcity-ai/phase-06/implementer_result/WC05/P01/1",
    occurredAt: "2026-07-18T20:03:00.000Z",
  });
  assert.equal(run.currentPassId, "P01");
  assert.equal(run.passes[0].status, "implementer_complete");

  assert.throws(
    () =>
      compileIndependentVerificationJob({
        run,
        plan: executionPassPlan,
        contract: executionAcceptanceContract,
        repositoryFacts,
        implementerResultArtifactId: "wrong-result",
        changedRepositoryPaths: [],
        validationResults: [],
      }),
    /exact recorded Implementer result/,
  );
  const verifier = compileIndependentVerificationJob({
    run,
    plan: executionPassPlan,
    contract: executionAcceptanceContract,
    repositoryFacts,
    implementerResultArtifactId: "champcity-ai/phase-06/implementer_result/WC05/P01/1",
    changedRepositoryPaths: ["src/shared/executionRuns/executionRun.ts"],
    validationResults: ["focused domain tests passed"],
  });
  assert.equal(verifier.role, "independent_verifier");
  assert.deepEqual(verifier.includedSourceIds, [
    "champcity-ai/phase-06/implementer_result/WC05/P01/1",
  ]);
});

test("pure run transitions require independent verification, retry same pass, and block contradictions", () => {
  let run = createExecutionRun(
    executionPassPlan,
    executionAcceptanceContract,
    "2026-07-18T20:00:00.000Z",
  );
  const packet = compileImplementerPassJob({
    run,
    plan: executionPassPlan,
    contract: executionAcceptanceContract,
    repositoryFacts,
    sourceSummaries: [],
    priorPassResults: [],
  });
  run = advanceExecutionRun(run, executionPassPlan, executionAcceptanceContract, {
    type: "packet_compiled",
    passId: "P01",
    packetId: packet.jobId,
    packetFingerprint: packet.packetFingerprint,
    occurredAt: "2026-07-18T20:01:00.000Z",
  });
  run = advanceExecutionRun(run, executionPassPlan, executionAcceptanceContract, {
    type: "implementer_started",
    passId: "P01",
    occurredAt: "2026-07-18T20:02:00.000Z",
  });
  run = advanceExecutionRun(run, executionPassPlan, executionAcceptanceContract, {
    type: "implementer_completed",
    passId: "P01",
    resultArtifactId: "result-1",
    occurredAt: "2026-07-18T20:03:00.000Z",
  });
  assert.equal(run.currentPassId, "P01");

  run = advanceExecutionRun(run, executionPassPlan, executionAcceptanceContract, {
    type: "verifier_started",
    passId: "P01",
    occurredAt: "2026-07-18T20:04:00.000Z",
  });
  run = advanceExecutionRun(run, executionPassPlan, executionAcceptanceContract, {
    type: "verifier_completed",
    passId: "P01",
    decision: "changes_required_in_current_pass",
    resultArtifactId: "verification-1",
    findings: ["Renderer still exposes completion."],
    occurredAt: "2026-07-18T20:05:00.000Z",
  });
  assert.equal(run.status, "changes_required");
  assert.equal(run.currentPassId, "P01");
  const retry = compileImplementerPassJob({
    run,
    plan: executionPassPlan,
    contract: executionAcceptanceContract,
    repositoryFacts,
    sourceSummaries: [],
    priorPassResults: [],
    correctionFindings: ["Renderer still exposes completion."],
  });
  assert.equal(retry.attempt, 2);
  assert.match(retry.markdown, /Renderer still exposes completion/);

  run = advanceExecutionRun(run, executionPassPlan, executionAcceptanceContract, {
    type: "packet_compiled",
    passId: "P01",
    packetId: retry.jobId,
    packetFingerprint: retry.packetFingerprint,
    occurredAt: "2026-07-18T20:06:00.000Z",
  });
  run = advanceExecutionRun(run, executionPassPlan, executionAcceptanceContract, {
    type: "implementer_started",
    passId: "P01",
    occurredAt: "2026-07-18T20:07:00.000Z",
  });
  run = advanceExecutionRun(run, executionPassPlan, executionAcceptanceContract, {
    type: "implementer_completed",
    passId: "P01",
    resultArtifactId: "result-2",
    occurredAt: "2026-07-18T20:08:00.000Z",
  });
  run = advanceExecutionRun(run, executionPassPlan, executionAcceptanceContract, {
    type: "verifier_started",
    passId: "P01",
    occurredAt: "2026-07-18T20:09:00.000Z",
  });
  run = advanceExecutionRun(run, executionPassPlan, executionAcceptanceContract, {
    type: "verifier_completed",
    passId: "P01",
    decision: "verified_for_next_pass",
    resultArtifactId: "verification-2",
    findings: [],
    occurredAt: "2026-07-18T20:10:00.000Z",
  });
  assert.equal(run.currentPassId, "P02");
  assert.equal(run.passes[0].status, "verified");

  let contradiction = createExecutionRun(
    executionPassPlan,
    executionAcceptanceContract,
    "2026-07-18T20:00:00.000Z",
  );
  const contradictionPacket = compileImplementerPassJob({
    run: contradiction,
    plan: executionPassPlan,
    contract: executionAcceptanceContract,
    repositoryFacts,
    sourceSummaries: [],
    priorPassResults: [],
  });
  for (const event of [
    {
      type: "packet_compiled",
      passId: "P01",
      packetId: contradictionPacket.jobId,
      packetFingerprint: contradictionPacket.packetFingerprint,
      occurredAt: "2026-07-18T21:01:00.000Z",
    },
    { type: "implementer_started", passId: "P01", occurredAt: "2026-07-18T21:02:00.000Z" },
    {
      type: "implementer_completed",
      passId: "P01",
      resultArtifactId: "result",
      occurredAt: "2026-07-18T21:03:00.000Z",
    },
    { type: "verifier_started", passId: "P01", occurredAt: "2026-07-18T21:04:00.000Z" },
    {
      type: "verifier_completed",
      passId: "P01",
      decision: "governance_contradiction",
      resultArtifactId: "verification",
      findings: ["Authority artifacts conflict."],
      occurredAt: "2026-07-18T21:05:00.000Z",
    },
  ]) {
    contradiction = advanceExecutionRun(
      contradiction,
      executionPassPlan,
      executionAcceptanceContract,
      event,
    );
  }
  assert.equal(contradiction.status, "blocked_by_governance_contradiction");
  assert.deepEqual(contradiction.operatorAttentionReasons, ["Authority artifacts conflict."]);
});
