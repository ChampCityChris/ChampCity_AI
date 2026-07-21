const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");

const { ArtifactPairService } = require("../../dist/main/artifacts/index.js");
const {
  ExecutionRunAuthorityService,
  ExecutionRunPersistenceService,
} = require("../../dist/main/executionRuns/executionRunAuthority.js");

const projectId = "champcity-ai";
const fixedTime = "2026-07-20T18:00:00.000Z";
const sourceAuthorityPaths = [
  "planning/phases/phase-06/Architect_Reviews/ARCHITECT_REVIEW_WC05_execution_pass_independent_verification_foundation_recovery.json",
  "planning/phases/phase-06/Work_Cards/WC06_trusted_execution_run_activation_workspace_test_fixture_isolation.json",
  "planning/phases/phase-06/Operator_Approvals/OPERATOR_APPROVAL_WC06_trusted_execution_run_activation_workspace_test_fixture_isolation.json",
];

test("Execution Run authority keeps the WC05 review retained compatibility dependency explicit and rejects wrong revisions", async () => {
  const repo = await createTempRepo();
  try {
    const artifactPairs = pairService(repo);
    const wc05Review = JSON.parse(await fs.promises.readFile(sourceAuthorityPaths[0], "utf8"));
    const workCard = JSON.parse(await fs.promises.readFile(sourceAuthorityPaths[1], "utf8"));
    const approval = JSON.parse(await fs.promises.readFile(sourceAuthorityPaths[2], "utf8"));
    await commitFromArtifact(artifactPairs, wc05Review);
    const committedWorkCard = await commitFromArtifact(artifactPairs, workCard);
    await commitFromArtifact(artifactPairs, approval);
    const preRunRegistry = await artifactPairs.loadRegistry();
    assert.deepEqual(
      preRunRegistry.entries.map((entry) => entry.jsonPath).sort(),
      [...sourceAuthorityPaths].sort(),
    );
    assert.equal(preRunRegistry.entries.some((entry) => entry.jsonPath.includes("phase-07")), false);

    const persistence = new ExecutionRunPersistenceService(artifactPairs, projectId, () => fixedTime);
    const authority = new ExecutionRunAuthorityService(persistence, projectId, () => fixedTime);
    const eligible = await authority.listEligibleWorkCards();
    assert.equal(eligible.ok, true, eligible.errorMessages?.join("\n"));
    assert.equal(eligible.workCards.length, 1);
    assert.equal(eligible.workCards[0].workCardArtifactId, workCard.artifactId);
    assert.equal(eligible.workCards[0].eligible, true);

    const started = await authority.startFromWorkCardAuthority({
      workCardArtifactId: workCard.artifactId,
      workCardRevision: committedWorkCard.artifact.revision,
    });
    assert.equal(started.ok, true, started.errorMessages?.join("\n"));
    assert.equal(started.run.workCardArtifactId, workCard.artifactId);
    assert.equal(started.run.workCardRevision, committedWorkCard.artifact.revision);

    const repeated = await authority.startFromWorkCardAuthority({
      workCardArtifactId: workCard.artifactId,
      workCardRevision: committedWorkCard.artifact.revision,
    });
    assert.equal(repeated.ok, true, repeated.errorMessages?.join("\n"));
    assert.deepEqual(repeated.run, started.run);

    const wrongRevision = await authority.startFromWorkCardAuthority({
      workCardArtifactId: workCard.artifactId,
      workCardRevision: committedWorkCard.artifact.revision + 1,
    });
    assert.equal(wrongRevision.ok, false);
    assert.match(wrongRevision.errorMessages.join("\n"), /revision does not match/i);

    const registry = await artifactPairs.loadRegistry();
    assert.equal(registry.entries.some((entry) => entry.jsonPath.includes("phase-07")), false);
  } finally {
    cleanup(repo);
  }
});

async function createTempRepo() {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "champcity-execution-run-"));
  await fs.promises.mkdir(path.join(root, "planning"), { recursive: true });
  await fs.promises.writeFile(path.join(root, "package.json"), JSON.stringify({ name: "fixture" }), "utf8");
  return root;
}

function cleanup(root) {
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}

function pairService(root) {
  return new ArtifactPairService({
    projectRoot: root,
    clock: () => fixedTime,
    transactionIdFactory: () => `txn-${Math.random().toString(16).slice(2)}`,
  });
}

async function commitFromArtifact(artifactPairs, artifact) {
  return artifactPairs.commitArtifact({
    artifactId: artifact.artifactId,
    artifactType: artifact.artifactType,
    status: artifact.status,
    projectId: artifact.projectId,
    ...(artifact.phaseId ? { phaseId: artifact.phaseId } : {}),
    ...(artifact.workCardId ? { workCardId: artifact.workCardId } : {}),
    ...(artifact.parentArtifactId ? { parentArtifactId: artifact.parentArtifactId } : {}),
    relationships: artifact.relationships,
    payload: artifact.payload,
    location: locationFromArtifact(artifact),
    expectedRevision: null,
  });
}

function locationFromArtifact(artifact) {
  return {
    directoryPath: path.posix.dirname(artifact.jsonPath),
    fileStem: path.posix.basename(artifact.jsonPath, ".json"),
  };
}
