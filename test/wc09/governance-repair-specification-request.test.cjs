const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  ArtifactPairService,
  GovernanceRepairService,
  buildGovernanceRepairSpecificationIdentity,
} = require("../../dist/main/artifacts");
const {
  RelationshipDrivenWorkflowResolver,
} = require("../../dist/main/workflow");
const {
  scanVerifiedArtifactGraph,
} = require("../../dist/main/repository");

const projectId = "champcity-ai";
const phaseId = "phase-04";
const targetArtifactId = "champcity-ai/supporting_document/CLOSEOUT_REPORT_phase-04_fixture";
const targetJsonPath =
  "planning/phases/phase-04/Closeout_Reports/CLOSEOUT_REPORT_phase-04_fixture.json";
const targetMarkdownPath =
  "planning/phases/phase-04/Closeout_Reports/CLOSEOUT_REPORT_phase-04_fixture.md";

test("governance repair specification identity uses the required hash input and fixed paths", () => {
  const expectedKey = crypto
    .createHash("sha256")
    .update(`${projectId}\n${targetArtifactId}\n${targetJsonPath}\n${targetMarkdownPath}`, "utf8")
    .digest("hex")
    .slice(0, 16);
  const identity = buildGovernanceRepairSpecificationIdentity({
    projectId,
    targetArtifactId,
    targetJsonPath,
    targetMarkdownPath,
    phaseId,
  });

  assert.equal(identity.candidateKey, expectedKey);
  assert.equal(identity.requestId, `GOVERNANCE_REPAIR_${expectedKey}`);
  assert.equal(
    identity.requestArtifactId,
    `${projectId}/system/route_review_request/GOVERNANCE_REPAIR_${expectedKey}`,
  );
  assert.equal(
    identity.fixedJsonPath,
    `planning/system/Route_Review_Requests/GOVERNANCE_REPAIR_${expectedKey}.json`,
  );
  assert.equal(
    identity.fixedMarkdownPath,
    `planning/system/Route_Review_Requests/GOVERNANCE_REPAIR_${expectedKey}.md`,
  );
  assert.equal(
    identity.expectedRepairWorkCardId,
    `GOV-REPAIR-${expectedKey.slice(0, 8).toUpperCase()}`,
  );
});

test("governance repair request preview is non-mutating and create is deterministic/idempotent", async () => {
  await withFixture(async ({ root, project, service, context }) => {
    const beforeTargetJson = await readFile(root, targetJsonPath);
    const beforeTargetMarkdown = await readFile(root, targetMarkdownPath);
    const candidate = await firstCandidate(service);

    const preview = await service.previewSpecificationRequest(selection(candidate, context), context);
    assert.equal(preview.ok, true, preview.errorMessages?.join("\n"));
    assert.equal(preview.wouldMutate, false);
    assert.equal(await exists(root, preview.fixedJsonPath), false);
    assert.equal(await readFile(root, targetJsonPath), beforeTargetJson);
    assert.equal(await readFile(root, targetMarkdownPath), beforeTargetMarkdown);

    const created = await service.createSpecificationRequest(
      { ...selection(candidate, context), operatorConfirmed: true },
      context,
    );
    assert.equal(created.ok, true, created.errorMessages?.join("\n"));
    assert.equal(created.created, true);
    assert.equal(created.revision, 1);
    assert.equal(await exists(root, created.fixedJsonPath), true);
    assert.equal(await exists(root, created.fixedMarkdownPath), true);
    assert.equal(await readFile(root, targetJsonPath), beforeTargetJson);
    assert.equal(await readFile(root, targetMarkdownPath), beforeTargetMarkdown);
    assert.equal(
      await anyPathIncludes(root, `planning/phases/${phaseId}/Work_Cards/${created.expectedRepairWorkCardId}`),
      false,
    );

    const repeated = await service.createSpecificationRequest(
      { ...selection(candidate, context), operatorConfirmed: true },
      context,
    );
    assert.equal(repeated.ok, true, repeated.errorMessages?.join("\n"));
    assert.equal(repeated.idempotent, true);
    assert.equal(repeated.revision, 1);

    const updated = await service.createSpecificationRequest(
      { ...selection(candidate, context), operatorNote: "Operator note changed.", operatorConfirmed: true },
      context,
    );
    assert.equal(updated.ok, true, updated.errorMessages?.join("\n"));
    assert.equal(updated.updated, true);
    assert.equal(updated.revision, 2);

    const requestFiles = (await listFiles(root)).filter((file) =>
      file.includes("planning/system/Route_Review_Requests/GOVERNANCE_REPAIR_"),
    );
    assert.equal(requestFiles.filter((file) => file.endsWith(".json")).length, 1);
    assert.equal(requestFiles.filter((file) => file.endsWith(".md")).length, 1);

    const afterPreview = await service.preview();
    assert.equal(afterPreview.candidates.length, 1);
    assert.equal(afterPreview.candidates[0].artifactId, targetArtifactId);
    assert.equal(afterPreview.candidates[0].existingSpecificationRequest.revision, 2);
  });
});

test("governance repair request rejects stale and newly repairable selections", async () => {
  await withFixture(async ({ context, service }) => {
    const candidate = await firstCandidate(service);
    const stale = await service.previewSpecificationRequest(
      {
        ...selection(candidate, context),
        expectedProjectionRevision: context.projectionRevision + 1,
      },
      context,
    );
    assert.equal(stale.ok, false);
    assert.match(stale.errorMessages.join(" "), /stale/i);

    const changed = await service.previewSpecificationRequest(
      {
        ...selection(candidate, context),
        expectedCandidateFingerprint: "sha256:not-current",
      },
      context,
    );
    assert.equal(changed.ok, false);
    assert.match(changed.errorMessages.join(" "), /fingerprint changed/i);
  });
});

test("pending governance repair request routes maintenance to Architect specification", async () => {
  await withFixture(async ({ root, project, service, context }) => {
    const candidate = await firstCandidate(service);
    const created = await service.createSpecificationRequest(
      { ...selection(candidate, context), operatorConfirmed: true },
      context,
    );
    assert.equal(created.ok, true, created.errorMessages?.join("\n"));

    const graph = await scanVerifiedArtifactGraph(project, () => "2026-07-20T12:00:00.000Z");
    const maintenance = { repair: await service.preview(), approval: { ok: true, items: [] } };
    const projection = new RelationshipDrivenWorkflowResolver().resolve(project, graph, 2, maintenance);

    assert.equal(projection.state.currentAction.actionId, "governance_repair_specification_required");
    assert.equal(projection.state.currentAction.role, "architect");
    assert.equal(projection.state.currentAction.screenId, "architect-bridge");
    assert.equal(projection.state.currentAction.targetArtifactId, created.requestArtifactId);
    assert.equal(projection.state.currentAction.expectedOutput.artifactId, created.expectedRepairWorkCardArtifactId);
    assert.equal(await anyPathIncludes(root, `Work_Cards/${created.expectedRepairWorkCardId}`), false);
  });
});

test("governance repair request preview uses lifecycle phase despite unrelated governance blockers", async () => {
  await withBlockedLifecycleFixture(async ({ root, service, graph, projection, context }) => {
    assert.equal(graph.blockers.length > 0, true);
    assert.equal(
      graph.blockers.some((blocker) => blocker.code === "branch_mismatch"),
      true,
    );
    assert.equal(projection.domain.lifecycleActivePhaseId, "phase-07");
    assert.equal(projection.domain.activePhaseId, null);
    assert.equal(projection.state.activePhaseId, null);
    assert.equal(projection.state.currentAction.actionId, "governance_integrity_repair_required");

    const repair = await service.preview();
    assert.equal(repair.candidates.length, 6);
    assert.equal(repair.repairableCount, 0);
    assert.equal(repair.candidates.every((candidate) => !candidate.safelyRepairable), true);
    assert.equal(
      repair.candidates.every((candidate) => candidate.operationLabel === "Create repair request"),
      true,
    );

    const candidate = repair.candidates[0];
    const beforeTargetJson = await readFile(root, candidate.jsonPath);
    const beforeTargetMarkdown = await readFile(root, candidate.markdownPath);
    const preview = await service.previewSpecificationRequest(selection(candidate, context), context);

    assert.equal(preview.ok, true, preview.errorMessages?.join("\n"));
    assert.equal(preview.wouldMutate, false);
    assert.match(preview.expectedRepairWorkCardArtifactId, /\/phase-07\/work_card\/GOV-REPAIR-/);
    assert.equal(await exists(root, preview.fixedJsonPath), false);
    assert.equal(await exists(root, preview.fixedMarkdownPath), false);
    assert.equal(await readFile(root, candidate.jsonPath), beforeTargetJson);
    assert.equal(await readFile(root, candidate.markdownPath), beforeTargetMarkdown);
  });
});

function selection(candidate, context) {
  return {
    artifactId: candidate.artifactId,
    jsonPath: candidate.jsonPath,
    markdownPath: candidate.markdownPath,
    expectedCandidateRevision: candidate.revision,
    expectedProjectionRevision: context.projectionRevision,
    expectedCandidateFingerprint: candidate.candidateFingerprint,
  };
}

async function firstCandidate(service) {
  const preview = await service.preview();
  assert.equal(preview.candidates.length, 1, JSON.stringify(preview.candidates, null, 2));
  const candidate = preview.candidates[0];
  assert.equal(candidate.safelyRepairable, false);
  assert.equal(candidate.itemStatus, "irreconcilable_conflict");
  return candidate;
}

async function withFixture(callback) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "champcity-gov-request-"));
  try {
    await fs.mkdir(path.join(root, "planning"), { recursive: true });
    await fs.mkdir(path.join(root, ".git"), { recursive: true });
    await fs.writeFile(path.join(root, ".git", "HEAD"), "ref: refs/heads/feature-test\n");
    const artifactPairs = new ArtifactPairService({
      projectRoot: root,
      clock: () => "2026-07-20T10:00:00.000Z",
    });
    await artifactPairs.commitArtifact({
      artifactId: `${projectId}/${phaseId}/phase_activation/${phaseId}`,
      artifactType: "phase_activation",
      status: "active",
      projectId,
      phaseId,
      payload: {
        title: "Phase 04 Activation",
        contentMarkdown: "# Phase 04 Activation\n",
        data: { phaseId, phaseSequence: 4 },
      },
      location: {
        directoryPath: `planning/phases/${phaseId}`,
        fileStem: "PHASE_ACTIVATION_phase-04",
      },
      expectedRevision: null,
    });
    await artifactPairs.commitArtifact({
      artifactId: `${projectId}/${phaseId}/work_card_plan/WORK_CARD_PLAN_phase-04`,
      artifactType: "work_card_plan",
      status: "active",
      projectId,
      phaseId,
      payload: {
        title: "Phase 04 Work Card Plan",
        contentMarkdown: "# Phase 04 Work Card Plan\n",
        data: { candidates: [] },
      },
      location: {
        directoryPath: `planning/phases/${phaseId}/Work_Card_Plans`,
        fileStem: "WORK_CARD_PLAN_phase-04",
      },
      expectedRevision: null,
    });
    await artifactPairs.commitArtifact({
      artifactId: targetArtifactId,
      artifactType: "supporting_document",
      status: "active",
      projectId,
      payload: {
        title: "Unsupported Closeout Fixture",
        contentMarkdown: "# Unsupported Closeout Fixture\n",
        data: { fixture: "unsupported-governance-repair-request" },
      },
      location: {
        directoryPath: `planning/phases/${phaseId}/Closeout_Reports`,
        fileStem: "CLOSEOUT_REPORT_phase-04_fixture",
      },
      expectedRevision: null,
    });
    const project = {
      projectId,
      displayName: "ChampCity A/I",
      repositoryRoot: root,
      planningRoot: path.join(root, "planning"),
      branchBehavior: { mode: "observe-current" },
      enabled: true,
      createdAt: "",
      updatedAt: "",
      lastOpenedAt: null,
      lastScanAt: null,
      lastScanResult: null,
      observerStatus: "stopped",
    };
    const service = new GovernanceRepairService(project, artifactPairs);
    const graph = await scanVerifiedArtifactGraph(project, () => "2026-07-20T10:00:00.000Z");
    const maintenance = { repair: await service.preview(), approval: { ok: true, items: [] } };
    const projection = new RelationshipDrivenWorkflowResolver().resolve(project, graph, 1, maintenance);
    const context = {
      projectionRevision: 1,
      maintenancePhaseId: projection.domain.lifecycleActivePhaseId,
      currentAction: projection.state.currentAction,
      registryRevision: graph.controlling(`${projectId}/system/artifact_registry`).artifact.revision,
    };
    await callback({ root, project, service, context });
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

async function withBlockedLifecycleFixture(callback) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "champcity-gov-request-blocked-lifecycle-"));
  try {
    await fs.mkdir(path.join(root, "planning"), { recursive: true });
    await fs.mkdir(path.join(root, ".git"), { recursive: true });
    await fs.writeFile(path.join(root, ".git", "HEAD"), "ref: refs/heads/feature-test\n");
    const artifactPairs = new ArtifactPairService({
      projectRoot: root,
      clock: () => "2026-07-20T10:00:00.000Z",
    });
    const blockedPhaseId = "phase-07";
    await artifactPairs.commitArtifact({
      artifactId: `${projectId}/${blockedPhaseId}/phase_activation/${blockedPhaseId}`,
      artifactType: "phase_activation",
      status: "active",
      projectId,
      phaseId: blockedPhaseId,
      payload: {
        title: "Phase 07 Activation",
        contentMarkdown: "# Phase 07 Activation\n",
        data: { phaseId: blockedPhaseId, phaseSequence: 7 },
      },
      location: {
        directoryPath: `planning/phases/${blockedPhaseId}`,
        fileStem: "PHASE_ACTIVATION_phase-07",
      },
      expectedRevision: null,
    });
    for (let index = 1; index <= 6; index += 1) {
      const suffix = `phase_0${index}_closeout`;
      await artifactPairs.commitArtifact({
        artifactId: `${projectId}/supporting_document/CLOSEOUT_REPORT_${suffix}`,
        artifactType: "supporting_document",
        status: "active",
        projectId,
        payload: {
          title: `Unsupported Governance Candidate ${index}`,
          contentMarkdown: `# Unsupported Governance Candidate ${index}\n`,
          data: { fixture: "unsupported-governance-repair-request", index },
        },
        location: {
          directoryPath: `planning/phases/phase-0${index}/Closeout_Reports`,
          fileStem: `CLOSEOUT_REPORT_${suffix}`,
        },
        expectedRevision: null,
      });
    }

    const project = {
      projectId,
      displayName: "ChampCity A/I",
      repositoryRoot: root,
      planningRoot: path.join(root, "planning"),
      branchBehavior: { mode: "require", branch: "dev" },
      enabled: true,
      createdAt: "",
      updatedAt: "",
      lastOpenedAt: null,
      lastScanAt: null,
      lastScanResult: null,
      observerStatus: "stopped",
    };
    const service = new GovernanceRepairService(project, artifactPairs);
    const graph = await scanVerifiedArtifactGraph(project, () => "2026-07-20T10:00:00.000Z");
    const maintenance = { repair: await service.preview(), approval: { ok: true, items: [] } };
    const projection = new RelationshipDrivenWorkflowResolver().resolve(project, graph, 1, maintenance);
    const context = {
      projectionRevision: 1,
      maintenancePhaseId: projection.domain.lifecycleActivePhaseId,
      currentAction: projection.state.currentAction,
      registryRevision: graph.controlling(`${projectId}/system/artifact_registry`).artifact.revision,
    };
    await callback({ root, project, service, graph, projection, context });
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

async function readFile(root, repoPath) {
  return fs.readFile(path.join(root, ...repoPath.split("/")), "utf8");
}

async function exists(root, repoPath) {
  try {
    await fs.access(path.join(root, ...repoPath.split("/")));
    return true;
  } catch {
    return false;
  }
}

async function anyPathIncludes(root, needle) {
  return (await listFiles(root)).some((file) => file.includes(needle));
}

async function listFiles(root) {
  const files = [];
  async function visit(directory) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(absolute);
      else files.push(absolute.replaceAll("\\", "/"));
    }
  }
  await visit(root);
  return files;
}
