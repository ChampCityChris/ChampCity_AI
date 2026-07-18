const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const { ArtifactPairService } = require("../../dist/main/artifacts");
const {
  ExecutionRunAuthorityService,
  ExecutionRunPersistenceService,
} = require("../../dist/main/executionRuns");
const {
  compileExecutionRunDefinitionV1,
} = require("../../dist/shared/executionRuns");

const repoRoot = path.resolve(__dirname, "..", "..");
const wc06Path = path.join(
  repoRoot,
  "planning",
  "phases",
  "phase-06",
  "Work_Cards",
  "WC06_trusted_execution_run_activation_workspace_test_fixture_isolation.json",
);
const workCardArtifactId = "champcity-ai/phase-06/work_card/WC06";
const approvalArtifactId = "champcity-ai/phase-06/operator_approval/WC06";

function service() {
  const pairs = new ArtifactPairService({ projectRoot: repoRoot });
  const persistence = new ExecutionRunPersistenceService(pairs, "champcity-ai");
  return new ExecutionRunAuthorityService(persistence, "champcity-ai");
}

function wc06Artifact() {
  return JSON.parse(fs.readFileSync(wc06Path, "utf8"));
}

test("strict WC06 execution definition compiles deterministically and rejects unknown or missing fields", () => {
  const artifact = wc06Artifact();
  const data = artifact.payload.data;
  const input = {
    definition: data.executionRunDefinition,
    workCardArtifactId,
    workCardRevision: artifact.revision,
    approvalArtifactId,
    implementationBranch: data.implementationBranch,
    passTokenBudget: 5000,
  };

  const first = compileExecutionRunDefinitionV1(input);
  const second = compileExecutionRunDefinitionV1(input);
  assert.deepEqual(second, first);
  assert.equal(first.contract.requirements.length, 10);
  assert.deepEqual(first.plan.passes.map((pass) => pass.passId), ["P01", "P02", "P03"]);

  assert.throws(
    () =>
      compileExecutionRunDefinitionV1({
        ...input,
        definition: { ...data.executionRunDefinition, markdownFallback: true },
      }),
    /unknown field markdownFallback/,
  );
  const missing = structuredClone(data.executionRunDefinition);
  delete missing.passes[0].requirements[0].statement;
  assert.throws(
    () => compileExecutionRunDefinitionV1({ ...input, definition: missing }),
    /statement is required/,
  );
});

test("trusted eligible list and start use exact Registry authority and repeat start is idempotent", async () => {
  const authority = service();
  const listed = await authority.listEligibleWorkCards();
  assert.equal(listed.ok, true, listed.errorMessages?.join(" "));
  const wc06 = listed.workCards.find((workCard) => workCard.workCardArtifactId === workCardArtifactId);
  assert.ok(wc06, "WC06 must be listed as an eligible approved Work Card.");
  assert.equal(wc06.approvalArtifactId, approvalArtifactId);

  const started = await authority.startFromWorkCardAuthority({
    workCardArtifactId,
    workCardRevision: wc06.workCardRevision,
  });
  assert.equal(started.ok, true, started.errorMessages?.join(" "));
  assert.equal(started.run.workCardArtifactId, workCardArtifactId);
  assert.equal(started.run.currentPassId, "P01");

  const repeated = await authority.startFromWorkCardAuthority({
    workCardArtifactId,
    workCardRevision: wc06.workCardRevision,
  });
  assert.equal(repeated.ok, true, repeated.errorMessages?.join(" "));
  assert.deepEqual(repeated.run, started.run, "Exact repeat start must return the existing run without mutation.");

  const wrongRevision = await authority.startFromWorkCardAuthority({
    workCardArtifactId,
    workCardRevision: wc06.workCardRevision + 1,
  });
  assert.equal(wrongRevision.ok, false);
  assert.match(wrongRevision.errorMessages.join(" "), /revision does not match/);
});

test("public renderer boundary exposes no Contract, Plan, lifecycle, verifier, or acceptance mutation inputs", () => {
  const preload = fs.readFileSync(path.join(repoRoot, "src", "preload", "index.ts"), "utf8");
  assert.match(preload, /startExecutionRun/);
  assert.doesNotMatch(preload, /initializeExecutionRun|recordExecutionRunEvent|recordImplementerResult|recordVerificationResult/);
  assert.doesNotMatch(preload, /acceptExecutionRun|completeExecutionRun|queueExecutionRun|processExecutionRun/);
  assert.doesNotMatch(preload, /ipcRenderer\.invoke\("executionRuns:start",\s*\{[^}]*contract/s);
  assert.doesNotMatch(preload, /ipcRenderer\.invoke\("executionRuns:start",\s*\{[^}]*plan/s);
});
