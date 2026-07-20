const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { mkdtemp, readFile, readdir, rm, writeFile } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const sharedArtifacts = require("../../dist/shared/artifacts");
const mainArtifacts = require("../../dist/main/artifacts");
const canonicalRuntime = require("../../dist/main/canonicalRuntime");
const {
  RepositoryRefreshService,
  scanVerifiedArtifactGraph,
} = require("../../dist/main/repository");
const {
  CanonicalWorkflowAuthority,
} = require("../../dist/main/workCards/canonicalWorkflowAuthority");
const {
  RelationshipDrivenWorkflowResolver,
} = require("../../dist/main/workflow/relationshipDrivenWorkflowResolver");

const {
  computeArtifactPayloadHash,
  getArtifactAuthority,
  listActiveArtifactAuthorities,
  validateArtifactRegistry,
  verifyArtifactPair,
} = sharedArtifacts;
const {
  ARTIFACT_REGISTRY_JSON_PATH,
  ARTIFACT_REGISTRY_MARKDOWN_PATH,
  ArtifactPairService,
  ArtifactPartialWriteError,
  ArtifactRepository,
  GovernanceApprovalService,
  GovernanceRepairService,
  GovernanceRepairStaleSelectionError,
  buildCanonicalPaths,
} = mainArtifacts;

const PROJECT_ID = "champcity-ai";
const LOCATION = {
  directoryPath: "planning/phases/phase-03/Work_Cards",
  fileStem: "WC09_cross_process_workflow_authority",
};

function createService(projectRoot, options = {}) {
  let transaction = 0;
  let clockTick = 0;
  return new ArtifactPairService({
    projectRoot,
    clock: () =>
      new Date(Date.parse("2026-07-14T12:00:00.000Z") + clockTick++ * 1000).toISOString(),
    transactionIdFactory: () => `wc09-${++transaction}`,
    ...options,
  });
}

function artifactRequest(overrides = {}) {
  return {
    artifactId: "champcity-ai/phase-03/work-card/WC09",
    artifactType: "work_card",
    status: "active",
    projectId: PROJECT_ID,
    phaseId: "phase-03",
    workCardId: "WC09",
    relationships: {
      sources: ["champcity-ai/project/rules/AGENTS"],
      expectedOutputs: ["champcity-ai/phase-03/implementer-report/WC09"],
      supersedes: [],
      children: [],
    },
    payload: {
      title: "WC09 Cross-process workflow authority",
      contentMarkdown: "# WC09\n\nCanonical authority foundation.\n",
      data: {
        workCardId: "WC09",
        objective: "Stabilize cross-process workflow authority.",
      },
    },
    location: LOCATION,
    expectedRevision: null,
    ...overrides,
  };
}

async function withTemporaryRoot(run) {
  const root = await mkdtemp(path.join(os.tmpdir(), "champcity-wc09-artifacts-"));
  try {
    return await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function readRepositoryFile(root, repositoryPath) {
  return readFile(path.join(root, ...repositoryPath.split("/")), "utf8");
}

async function listFilesRecursively(root) {
  const output = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(absolutePath);
      else output.push(path.relative(root, absolutePath).replaceAll("\\", "/"));
    }
  }
  await visit(root);
  return output.sort();
}

test("canonical pair hash synchronizes JSON and Markdown and detects body tampering", async () => {
  await withTemporaryRoot(async (root) => {
    const service = createService(root);
    const request = artifactRequest();
    const commit = await service.commitArtifact(
      artifactRequest({
        payload: {
          ...request.payload,
          contentMarkdown: "# WC09\r\n\r\nCanonical authority foundation.\r\n\r\n",
        },
      }),
    );
    const paths = buildCanonicalPaths(LOCATION);
    const jsonContent = await readRepositoryFile(root, paths.jsonPath);
    const markdownContent = await readRepositoryFile(root, paths.markdownPath);

    assert.equal(commit.pairVerified, true);
    assert.equal(commit.registryCommitted, true);
    assert.equal(
      commit.artifact.payload.contentMarkdown,
      "# WC09\n\nCanonical authority foundation.\n",
    );
    assert.equal(
      commit.artifact.payloadHash,
      computeArtifactPayloadHash(commit.artifact.payload),
    );

    const synchronized = verifyArtifactPair({
      jsonArtifact: jsonContent,
      markdown: markdownContent,
      jsonPath: paths.jsonPath,
      markdownPath: paths.markdownPath,
    });
    assert.equal(synchronized.valid, true);
    assert.equal(synchronized.synchronized, true);
    assert.equal(synchronized.artifact.payloadHash, commit.artifact.payloadHash);

    const tamperedMarkdown = markdownContent.replace(
      "Canonical authority foundation.",
      "Tampered authority foundation.",
    );
    const tampered = verifyArtifactPair({
      jsonArtifact: jsonContent,
      markdown: tamperedMarkdown,
      jsonPath: paths.jsonPath,
      markdownPath: paths.markdownPath,
    });
    assert.equal(tampered.valid, false);
    assert.equal(tampered.synchronized, false);
    assert.match(tampered.errors.join("\n"), /does not match|payload hash|payloadHash|mismatch/i);
  });
});

test("ordinary updates increment revision at fixed paths and never create numbered suffixes", async () => {
  await withTemporaryRoot(async (root) => {
    const service = createService(root);
    const first = await service.commitArtifact(artifactRequest());
    const second = await service.commitArtifact(
      artifactRequest({
        expectedRevision: 1,
        payload: {
          title: "WC09 Cross-process workflow authority",
          contentMarkdown: "# WC09\n\nCanonical authority foundation, revised.\n",
          data: {
            workCardId: "WC09",
            objective: "Stabilize cross-process workflow and artifact authority.",
          },
        },
      }),
    );

    assert.equal(first.artifact.revision, 1);
    assert.equal(second.artifact.revision, 2);
    assert.equal(second.artifact.createdAt, first.artifact.createdAt);
    assert.notEqual(second.artifact.updatedAt, first.artifact.updatedAt);
    assert.equal(second.artifact.jsonPath, first.artifact.jsonPath);
    assert.equal(second.artifact.markdownPath, first.artifact.markdownPath);

    const pairDirectory = path.join(root, ...LOCATION.directoryPath.split("/"));
    assert.deepEqual((await readdir(pairDirectory)).sort(), [
      `${LOCATION.fileStem}.json`,
      `${LOCATION.fileStem}.md`,
    ]);

    const registry = await service.loadRegistry();
    const authorities = registry.entries.filter(
      (entry) => entry.artifactId === artifactRequest().artifactId,
    );
    assert.equal(authorities.length, 1);
    assert.equal(authorities[0].authoritative, true);
    assert.equal(authorities[0].synchronized, true);
    assert.equal(authorities[0].revision, 2);
    assert.equal(getArtifactAuthority(registry, artifactRequest().artifactId).revision, 2);
    assert.equal(listActiveArtifactAuthorities(registry).length, 1);

    await assert.rejects(
      service.commitArtifact(artifactRequest({ expectedRevision: 1 })),
      (error) => error?.code === "stale_revision",
    );
    assert.throws(
      () => buildCanonicalPaths({ ...LOCATION, fileStem: `${LOCATION.fileStem}_2` }),
      (error) => error?.code === "invalid_location",
    );
  });
});

test("registry validation rejects duplicate active authority for one artifact identity", async () => {
  await withTemporaryRoot(async (root) => {
    const service = createService(root);
    await service.commitArtifact(artifactRequest());
    const registry = await service.loadRegistry();
    const duplicate = structuredClone(registry.entries[0]);
    duplicate.revision += 1;
    duplicate.jsonPath = "planning/phases/phase-03/Work_Cards/WC09_conflicting.json";
    duplicate.markdownPath = "planning/phases/phase-03/Work_Cards/WC09_conflicting.md";
    duplicate.updatedAt = "2026-07-14T12:01:00.000Z";

    const conflictingRegistry = structuredClone(registry);
    conflictingRegistry.entries.push(duplicate);
    const validation = validateArtifactRegistry(conflictingRegistry);
    const codes = new Set(validation.issues.map((issue) => issue.code));

    assert.equal(validation.valid, false);
    assert.equal(codes.has("duplicate_artifact_id"), true);
  });
});

test("artifact and registry rollback together when the registry boundary fails", async () => {
  await withTemporaryRoot(async (root) => {
    const initialService = createService(root);
    await initialService.commitArtifact(artifactRequest());
    const paths = buildCanonicalPaths(LOCATION);
    const protectedPaths = [
      paths.jsonPath,
      paths.markdownPath,
      ARTIFACT_REGISTRY_JSON_PATH,
      ARTIFACT_REGISTRY_MARKDOWN_PATH,
    ];
    const before = new Map(
      await Promise.all(
        protectedPaths.map(async (repositoryPath) => [
          repositoryPath,
          await readRepositoryFile(root, repositoryPath),
        ]),
      ),
    );

    const failingService = createService(root, {
      failureInjector: (point) => {
        if (point === "after_registry_update") {
          throw new Error("Injected registry boundary failure.");
        }
      },
    });
    await assert.rejects(
      failingService.commitArtifact(
        artifactRequest({
          expectedRevision: 1,
          payload: {
            title: "WC09 Cross-process workflow authority",
            contentMarkdown: "# WC09\n\nThis revision must roll back.\n",
            data: { workCardId: "WC09", objective: "Rollback probe." },
          },
        }),
      ),
      (error) =>
        error instanceof ArtifactPartialWriteError && error.rollbackStatus === "succeeded",
    );

    for (const repositoryPath of protectedPaths) {
      assert.equal(
        await readRepositoryFile(root, repositoryPath),
        before.get(repositoryPath),
        `${repositoryPath} changed despite rollback`,
      );
    }
    const transientFiles = (await listFilesRecursively(root)).filter((file) =>
      /\.(?:stage|backup)$/.test(file),
    );
    assert.deepEqual(transientFiles, []);
    assert.equal((await initialService.readArtifact(LOCATION)).artifact.revision, 1);
    assert.equal(
      (
        await initialService.readArtifactByPaths(
          ARTIFACT_REGISTRY_JSON_PATH,
          ARTIFACT_REGISTRY_MARKDOWN_PATH,
        )
      ).artifact.revision,
      1,
    );
  });
});

test("registry-backed authority refuses an unsynchronized pair instead of inferring from files", async () => {
  await withTemporaryRoot(async (root) => {
    const service = createService(root);
    await service.commitArtifact(artifactRequest());
    const repository = new ArtifactRepository(service);
    const paths = buildCanonicalPaths(LOCATION);
    const markdownPath = path.join(root, ...paths.markdownPath.split("/"));
    const markdown = await readFile(markdownPath, "utf8");
    await writeFile(markdownPath, `${markdown}\nunauthorized mutation\n`, "utf8");

    const failures = await repository.auditRegisteredPairs("2026-07-14T13:00:00.000Z");
    assert.equal(failures.length, 1);
    assert.equal(failures[0].artifactId, artifactRequest().artifactId);
    assert.equal(failures[0].code, "registered_pair_unsynchronized");
    await assert.rejects(
      repository.readAuthority({
        artifactId: artifactRequest().artifactId,
        artifactType: artifactRequest().artifactType,
        projectId: PROJECT_ID,
      }),
      (error) => error?.code === "registry_sync_failure",
    );
  });
});

test("top-level governance repair preview reports unknown payload impact on runtime errors", async () => {
  const result = await canonicalRuntime.previewGovernanceRepair();
  assert.equal(result.ok, false);
  assert.equal(result.candidates.length, 0);
  assert.equal(
    result.payloadContentSummary,
    "Payload impact could not be determined because governance analysis failed.",
  );
});

test("repository maintenance snapshot routes registered noncanonical pairs without graph filtering", async () => {
  await withTemporaryRoot(async (root) => {
    const service = createService(root);
    const committed = await service.commitArtifact({
      artifactId: "champcity-ai/phase-09/work_card/NONCANON",
      artifactType: "work_card",
      status: "active",
      projectId: PROJECT_ID,
      phaseId: "phase-09",
      workCardId: "NONCANON",
      relationships: {
        sources: [],
        expectedOutputs: ["champcity-ai/phase-09/implementer_report/NONCANON"],
        supersedes: [],
        children: [],
      },
      payload: {
        title: "Registered Noncanonical Pair",
        contentMarkdown: "# Registered Noncanonical Pair\n",
        data: { workCardId: "NONCANON", status: "ready_for_implementer" },
      },
      location: {
        directoryPath: "planning/phases/phase-09/Work_Cards",
        fileStem: "NONCANON_registered_noncanonical_pair",
      },
      expectedRevision: null,
    });
    const artifact = committed.artifact;
    await writeFile(
      path.join(root, ...artifact.jsonPath.split("/")),
      JSON.stringify(artifact),
      "utf8",
    );

    const configured = testProject(root);
    const graph = await scanVerifiedArtifactGraph(configured, () => "2026-07-14T12:00:00.000Z");
    assert.equal(
      graph.blockers.some(
        (blocker) =>
          blocker.artifactIds.includes(artifact.artifactId) ||
          blocker.paths.includes(artifact.jsonPath) ||
          blocker.paths.includes(artifact.markdownPath),
      ),
      false,
      "registered noncanonical pair should not depend on a graph blocker to remain repair-routed",
    );

    const repair = new GovernanceRepairService(configured, service);
    const preview = await repair.preview();
    assert.equal(preview.candidates.length, 1);
    assert.equal(preview.candidates[0].artifactId, artifact.artifactId);
    assert.equal(preview.candidates[0].registryStatus, "registered");
    assert.equal(preview.candidates[0].issueClassification, "noncanonical_serialization");

    const workspaces = {
      getProject: async (projectId) => projectId === PROJECT_ID ? configured : null,
      updateObserverStatus: async () => {},
      updateScanResult: async () => {},
    };
    const refresh = new RepositoryRefreshService(
      configured,
      workspaces,
      undefined,
      () => "2026-07-14T12:00:00.000Z",
    );
    const snapshot = await refresh.refresh("manual");
    const exposed = await refresh.getProjectionSnapshot();
    assert.deepEqual(exposed.maintenance, snapshot.maintenance);
    assert.equal(snapshot.maintenance.repair.candidates.length, 1);
    assert.equal(snapshot.maintenance.repair.candidates[0].artifactId, artifact.artifactId);
    assert.equal(snapshot.maintenance.approval.items.length, 0);
    assert.equal(
      snapshot.projection.state.currentAction?.actionId,
      "governance_integrity_repair_required",
    );
    assert.equal(snapshot.projection.state.currentAction?.targetArtifactId, artifact.artifactId);
    assert.equal(snapshot.projection.state.currentAction?.expectedOutput.artifactId, artifact.artifactId);
    assert.equal(snapshot.projection.state.currentAction?.expectedOutput.artifactType, artifact.artifactType);
    assert.equal(
      snapshot.projection.state.currentAction?.expectedOutput.relationship,
      "in_place_mutation_target",
    );

    await repair.repairOne({
      artifactId: artifact.artifactId,
      jsonPath: artifact.jsonPath,
      markdownPath: artifact.markdownPath,
      repairKind: "canonical_serialization_repair",
      expectedRevision: artifact.revision,
    });
    const after = await refresh.refreshAfterMutation("test-repair");
    assert.equal(after.maintenance.repair.candidates.length, 0);
    assert.equal(after.projection.state.currentAction?.actionId, "operator_governance_approval_required");
    assert.equal(after.projection.state.currentAction?.targetArtifactId, artifact.artifactId);
    assert.equal(
      after.projection.state.currentAction?.expectedOutput.artifactId,
      "champcity-ai/phase-09/operator_approval/NONCANON",
    );
  });
});

test("snapshot-bound governance maintenance projection keeps one revision through refreshes", async () => {
  await withTemporaryRoot(async (root) => {
    const { service, artifact, configured } = await createRegisteredNoncanonicalGovernancePair(root, {
      workCardId: "SNAPSHOT",
      fileStem: "SNAPSHOT_registered_noncanonical_pair",
    });
    const workspaces = {
      getProject: async (projectId) => projectId === PROJECT_ID ? configured : null,
      updateObserverStatus: async () => {},
      updateScanResult: async () => {},
    };
    const refresh = new RepositoryRefreshService(
      configured,
      workspaces,
      undefined,
      () => "2026-07-14T12:00:00.000Z",
    );
    const authority = new CanonicalWorkflowAuthority(root, {
      authorityProvider: refresh,
      registryProvider: async () => {
        throw new Error("snapshot-bound projection must not read the live registry provider");
      },
      refreshAfterWrite: async (reason) =>
        (await refresh.refresh(reason)).projection.state,
    });

    const initial = await refresh.refresh("initial-snapshot");
    const initialProjection = await authority.projectCurrentRequiredActionFromSnapshot({
      state: initial.projection.state,
      routedAction: initial.projection.state.currentAction,
      registry: initial.registry,
      nodes: initial.graph.nodes,
    });
    assertSnapshotProjectionRevisionAgreement(initial, initialProjection, "initial repair route");
    assert.equal(
      initialProjection.currentAction.routedAction.targetArtifactId,
      artifact.artifactId,
      "initial snapshot should select the unrepaired artifact",
    );

    const repair = new GovernanceRepairService(configured, service);
    await repair.repairOne({
      artifactId: artifact.artifactId,
      jsonPath: artifact.jsonPath,
      markdownPath: artifact.markdownPath,
      repairKind: "canonical_serialization_repair",
      expectedRevision: artifact.revision,
    });
    const afterRepair = await refresh.refreshAfterMutation("test-repair");
    assert.notEqual(
      afterRepair.scanResult.projectionRevision,
      initial.scanResult.projectionRevision,
      "post-mutation refresh should advance the projection revision",
    );
    const projectedFromOriginalAfterRefresh = await authority.projectCurrentRequiredActionFromSnapshot({
      state: initial.projection.state,
      routedAction: initial.projection.state.currentAction,
      registry: initial.registry,
      nodes: initial.graph.nodes,
    });
    assertSnapshotProjectionRevisionAgreement(
      initial,
      projectedFromOriginalAfterRefresh,
      "original snapshot projected after later refresh",
    );
    assert.equal(
      projectedFromOriginalAfterRefresh.currentAction.routedAction.targetArtifactId,
      artifact.artifactId,
      "projection from the original snapshot must not observe post-repair routing",
    );

    const afterRepairProjection = await authority.projectCurrentRequiredActionFromSnapshot({
      state: afterRepair.projection.state,
      routedAction: afterRepair.projection.state.currentAction,
      registry: afterRepair.registry,
      nodes: afterRepair.graph.nodes,
    });
    assertSnapshotProjectionRevisionAgreement(afterRepair, afterRepairProjection, "post-repair route");
    assert.equal(
      afterRepairProjection.currentAction.routedAction.actionId,
      "operator_governance_approval_required",
    );

    const approvals = new GovernanceApprovalService(configured, service);
    const approvalQueue = await approvals.listQueue();
    const approvalItem = approvalQueue.items.find(
      (item) => item.targetArtifactId === artifact.artifactId,
    );
    assert.ok(approvalItem, "post-repair approval queue should include repaired artifact");
    assert.equal(typeof approvals.approve, "undefined", "Governance Approval queue must not expose a direct approval mutation.");
    assert.equal(approvalItem.decisionWorkspaceLabel, "Work Card Approval");
    assert.equal(approvalItem.contentMarkdown, artifact.payload.contentMarkdown);
    await decideExact(approvals, approvalItem, "approved");
    const afterApproval = await refresh.refreshAfterMutation("test-approval");
    const afterApprovalProjection = await authority.projectCurrentRequiredActionFromSnapshot({
      state: afterApproval.projection.state,
      routedAction: afterApproval.projection.state.currentAction,
      registry: afterApproval.registry,
      nodes: afterApproval.graph.nodes,
    });
    assertSnapshotProjectionRevisionAgreement(
      afterApproval,
      afterApprovalProjection,
      "post-approval route",
    );
  });
});

test("governance repair service rejects stale selected repair identities", async () => {
  await withTemporaryRoot(async (root) => {
    const { service, artifact, configured } = await createRegisteredNoncanonicalGovernancePair(root, {
      workCardId: "STALE",
      fileStem: "STALE_registered_noncanonical_pair",
    });
    const repair = new GovernanceRepairService(configured, service);
    const preview = await repair.preview();
    const candidate = preview.candidates[0];
    assert.equal(candidate.artifactId, artifact.artifactId);

    const intent = {
      artifactId: candidate.artifactId,
      jsonPath: candidate.jsonPath,
      markdownPath: candidate.markdownPath,
      repairKind: candidate.repairKind,
      expectedRevision: candidate.revision,
    };
    const assertStaleSelection = (error) =>
      error instanceof GovernanceRepairStaleSelectionError ||
      error?.code === "stale_governance_repair_selection";

    await assert.rejects(
      () => repair.repairOne({ ...intent, artifactId: `${intent.artifactId}_changed` }),
      assertStaleSelection,
      "changed artifact ID must reject as stale",
    );
    await assert.rejects(
      () => repair.repairOne({ ...intent, jsonPath: intent.jsonPath.replace(".json", "_changed.json") }),
      assertStaleSelection,
      "changed JSON path must reject as stale",
    );
    await assert.rejects(
      () => repair.repairOne({ ...intent, expectedRevision: intent.expectedRevision + 1 }),
      assertStaleSelection,
      "changed revision must reject as stale",
    );
    await assert.rejects(
      () => repair.repairOne({ ...intent, repairKind: "missing_registry_registration" }),
      assertStaleSelection,
      "changed repair kind must reject as stale",
    );

    const result = await repair.repairOne(intent);
    assert.deepEqual(result.repairedArtifactIds, [artifact.artifactId]);
    assert.ok(
      result.repairedArtifactIds.length > 0,
      "successful selected repair must not return an empty repaired ID list",
    );

    await assert.rejects(
      () => repair.repairOne(intent),
      assertStaleSelection,
      "disappeared candidate must reject as stale after repair",
    );
  });
});

test("governance approval queue is navigation-only for canonical phase authority", async () => {
  await withTemporaryRoot(async (root) => {
    const service = createService(root);
    const phasePlanning = await service.commitArtifact({
      artifactId: "champcity-ai/phase-08/phase_planning/Phase_Planning",
      artifactType: "phase_planning",
      status: "active",
      projectId: PROJECT_ID,
      phaseId: "phase-08",
      relationships: {},
      payload: {
        title: "Phase 08 Planning",
        contentMarkdown: "# Phase 08 Planning\n",
        data: { phaseId: "phase-08" },
      },
      location: { directoryPath: "planning/phases/phase-08", fileStem: "Phase_Planning" },
      expectedRevision: null,
    });
    const workCardPlan = await service.commitArtifact({
      artifactId: "champcity-ai/phase-08/work_card_plan/Work_Card_Plan",
      artifactType: "work_card_plan",
      status: "active",
      projectId: PROJECT_ID,
      phaseId: "phase-08",
      relationships: {
        sources: [phasePlanning.artifact.artifactId],
        expectedOutputs: ["champcity-ai/phase-08/work_card/WC01"],
      },
      payload: {
        title: "Phase 08 Work Card Plan",
        contentMarkdown: "# Phase 08 Work Card Plan\n",
        data: { phaseId: "phase-08", candidates: [{ id: "WC01" }] },
      },
      location: { directoryPath: "planning/phases/phase-08", fileStem: "Work_Card_Plan" },
      expectedRevision: null,
    });

    const approvals = new GovernanceApprovalService(testProject(root), service);
    const before = await approvals.listQueue();
    assert.equal(before.ok, true);
    assert.equal(typeof approvals.approve, "undefined");
    const phasePlanningItem = before.items.find(
      (item) => item.targetArtifactId === phasePlanning.artifact.artifactId,
    );
    const workCardPlanItem = before.items.find(
      (item) => item.targetArtifactId === workCardPlan.artifact.artifactId,
    );
    assert.equal(phasePlanningItem.approvalStatus, "pending_operator_disposition");
    assert.equal(workCardPlanItem.approvalStatus, "pending_operator_disposition");
    for (const item of [phasePlanningItem, workCardPlanItem]) {
      assert.equal(item.decisionWorkspaceScreenId, "operator-phase-approval");
      assert.equal(item.decisionWorkspaceLabel, "Operator Phase Approval");
      assert.equal(item.implementationAuthorizationAvailable, false);
      assert.match(item.decisionEffect, /phase-planning bundle/);
      assert.equal(item.contentMarkdown, item.targetArtifactId === phasePlanning.artifact.artifactId
        ? phasePlanning.artifact.payload.contentMarkdown
        : workCardPlan.artifact.payload.contentMarkdown);
    }

    await decideExact(approvals, workCardPlanItem, "approved");
    const after = await approvals.listQueue();
    const phasePlanningAfter = after.items.find(
      (item) => item.targetArtifactId === phasePlanning.artifact.artifactId,
    );
    const workCardPlanAfter = after.items.find(
      (item) => item.targetArtifactId === workCardPlan.artifact.artifactId,
    );
    assert.equal(phasePlanningAfter.approvalStatus, "exact");
    assert.equal(workCardPlanAfter.approvalStatus, "exact");
  });
});

test("governance approval queue never infers Implementer authorization from Work Card type", async () => {
  await withTemporaryRoot(async (root) => {
    const service = createService(root);
    const architectOwned = await service.commitArtifact({
      artifactId: "champcity-ai/phase-08/work_card/WC01",
      artifactType: "work_card",
      status: "active",
      projectId: PROJECT_ID,
      phaseId: "phase-08",
      workCardId: "WC01",
      relationships: {
        expectedOutputs: ["champcity-ai/phase-08/implementer_report/WC01"],
      },
      payload: {
        title: "WC01 Architect-owned Planning",
        contentMarkdown: "# WC01 Architect-owned Planning\n\nNo implementation is required.\n",
        data: {
          workCardId: "WC01",
          requiresImplementer: false,
          codeChangesAuthorized: false,
          ownerRole: "architect",
        },
      },
      location: {
        directoryPath: "planning/phases/phase-08/Work_Cards",
        fileStem: "WC01_architect_owned_planning",
      },
      expectedRevision: null,
    });
    const implementerWork = await service.commitArtifact({
      artifactId: "champcity-ai/phase-08/work_card/WC02",
      artifactType: "work_card",
      status: "active",
      projectId: PROJECT_ID,
      phaseId: "phase-08",
      workCardId: "WC02",
      relationships: {
        expectedOutputs: ["champcity-ai/phase-08/implementer_report/WC02"],
      },
      payload: {
        title: "WC02 Implementation Work",
        contentMarkdown: "# WC02 Implementation Work\n",
        data: {
          workCardId: "WC02",
          requiresImplementer: true,
          codeChangesAuthorized: true,
        },
      },
      location: {
        directoryPath: "planning/phases/phase-08/Work_Cards",
        fileStem: "WC02_implementation_work",
      },
      expectedRevision: null,
    });
    const approvals = new GovernanceApprovalService(testProject(root), service);
    const queue = await approvals.listQueue();
    const architectOwnedItem = queue.items.find((candidate) => candidate.targetArtifactId === architectOwned.artifact.artifactId);
    const implementerItem = queue.items.find((candidate) => candidate.targetArtifactId === implementerWork.artifact.artifactId);
    assert.equal(architectOwnedItem.decisionWorkspaceScreenId, "operator-work-card-approval");
    assert.equal(architectOwnedItem.decisionWorkspaceLabel, "Work Card Approval");
    assert.equal(architectOwnedItem.implementationAuthorizationAvailable, false);
    assert.match(architectOwnedItem.authorizationBoundary, /does not explicitly request Implementer execution/);
    assert.equal(architectOwnedItem.contentMarkdown, architectOwned.artifact.payload.contentMarkdown);
    assert.equal(implementerItem.implementationAuthorizationAvailable, true);
    assert.match(implementerItem.authorizationBoundary, /projected in memory as Implementer execution authority/);
  });
});

test("governance approval queue keeps historical Work Cards visible", async () => {
  await withTemporaryRoot(async (root) => {
    const service = createService(root);
    const historical = await service.commitArtifact({
      artifactId: "champcity-ai/phase-01/work_card/WC01",
      artifactType: "work_card",
      status: "historical",
      projectId: PROJECT_ID,
      phaseId: "phase-01",
      workCardId: "WC01",
      relationships: {},
      payload: {
        title: "Historical WC01",
        contentMarkdown: "# Historical WC01\n",
        data: { workCardId: "WC01" },
      },
      location: {
        directoryPath: "planning/phases/phase-01/Work_Cards",
        fileStem: "WC01_historical",
      },
      expectedRevision: null,
    });
    const approvals = new GovernanceApprovalService(testProject(root), service);
    const queue = await approvals.listQueue();
    const item = queue.items.find(
      (candidate) => candidate.targetArtifactId === historical.artifact.artifactId,
    );
    assert.equal(queue.ok, true);
    assert.equal(item.status, "historical");
    assert.equal(item.approvalStatus, "pending_operator_disposition");
    assert.equal(item.decisionWorkspaceScreenId, "historical-operator-review");
    assert.equal(item.decisionWorkspaceLabel, "Historical Operator Disposition");
    assert.equal(item.implementationAuthorizationAvailable, false);
    assert.equal(item.contentMarkdown, historical.artifact.payload.contentMarkdown);
  });
});

test("governance approval queue recognizes current exact decisions without changing routing", async () => {
  await withTemporaryRoot(async (root) => {
    const service = createService(root);
    const configured = testProject(root);
    const canonicalWorkCard = await service.commitArtifact({
      artifactId: "champcity-ai/phase-09/work_card/WC01",
      artifactType: "work_card",
      status: "active",
      projectId: PROJECT_ID,
      phaseId: "phase-09",
      workCardId: "WC01",
      relationships: {
        expectedOutputs: ["champcity-ai/phase-09/implementer_report/WC01"],
      },
      payload: {
        title: "WC01 Canonical Exact Route",
        contentMarkdown: "# WC01 Canonical Exact Route\n",
        data: {
          workCardId: "WC01",
          requiresImplementer: true,
          codeChangesAuthorized: true,
          expectedImplementerReportArtifactId: "champcity-ai/phase-09/implementer_report/WC01",
        },
      },
      location: {
        directoryPath: "planning/phases/phase-09/Work_Cards",
        fileStem: "WC01_canonical_exact_route",
      },
      expectedRevision: null,
    });
    const historical = await service.commitArtifact({
      artifactId: "champcity-ai/phase-09/work_card/WC01_legacy",
      artifactType: "work_card",
      status: "historical",
      projectId: PROJECT_ID,
      phaseId: "phase-09",
      workCardId: "WC01",
      relationships: {},
      payload: {
        title: "WC01 Legacy",
        contentMarkdown: "# WC01 Legacy\n",
        data: { workCardId: "WC01", historical: true },
      },
      location: {
        directoryPath: "planning/phases/phase-09/Work_Cards",
        fileStem: "WC01_legacy",
      },
      expectedRevision: null,
    });

    const approvals = new GovernanceApprovalService(configured, service);
    const before = await approvals.listQueue();
    const canonicalItem = before.items.find((item) => item.targetArtifactId === canonicalWorkCard.artifact.artifactId);
    const historicalItem = before.items.find((item) => item.targetArtifactId === historical.artifact.artifactId);
    assert.equal(canonicalItem.approvalStatus, "pending_operator_disposition");
    assert.equal(historicalItem.approvalStatus, "pending_operator_disposition");

    const beforeHistoricalRoute = await resolveProjection(configured);
    await decideExact(approvals, canonicalItem, "approved");
    await decideExact(approvals, historicalItem, "accepted_as_historical_evidence");
    const afterHistoricalRoute = await resolveProjection(configured);

    assert.equal(afterHistoricalRoute.state.currentActionId, beforeHistoricalRoute.state.currentActionId);
    assert.equal(
      afterHistoricalRoute.state.authoritativeTargetArtifactId,
      beforeHistoricalRoute.state.authoritativeTargetArtifactId,
    );

    const queue = await approvals.listQueue();
    assert.equal(queue.ok, true);
    const canonicalAfter = queue.items.find((item) => item.targetArtifactId === canonicalWorkCard.artifact.artifactId);
    const historicalAfter = queue.items.find((item) => item.targetArtifactId === historical.artifact.artifactId);
    assert.equal(canonicalAfter.approvalStatus, "exact");
    assert.equal(historicalAfter.approvalStatus, "exact");
    assert.match(historicalAfter.existingApprovalArtifactId, /\/operator_approval\/sha256_[a-f0-9]{64}$/);
    assert.notEqual(historicalAfter.existingApprovalArtifactId, canonicalAfter.existingApprovalArtifactId);
    const registry = await service.loadRegistry();
    const historicalDecisionEntry = registry.entries.find(
      (candidate) => candidate.artifactId === historicalAfter.existingApprovalArtifactId,
    );
    const historicalDecision = (
      await service.readArtifactByPaths(
        historicalDecisionEntry.jsonPath,
        historicalDecisionEntry.markdownPath,
      )
    ).artifact;
    assert.equal(historicalDecision.payload.data.schemaVersion, "operator-decision-record.v1");
    assert.equal(historicalDecision.payload.data.stage, "work_card");
    assert.equal(historicalDecision.payload.data.outcome.disposition, "accepted_as_historical_evidence");
    assert.equal(historicalDecision.payload.data.targets[0].artifactId, historical.artifact.artifactId);
    assert.equal(historicalDecision.payload.data.targets[0].revision, historical.artifact.revision);
    assert.equal(historicalDecision.payload.data.targets[0].payloadHash, historical.artifact.payloadHash);
    assert.equal("implementationAuthorized" in historicalDecision.payload.data, false);
    assert.equal("phaseProgressionAuthorized" in historicalDecision.payload.data, false);
    assert.equal("routeSelectionAuthorized" in historicalDecision.payload.data, false);
    assert.deepEqual(historicalDecision.relationships.expectedOutputs, []);
  });
});

test("stage-owned approval decisions are final per exact Work Card revision", async () => {
  await withTemporaryRoot(async (root) => {
    const fixture = await createRoutedWorkCardApprovalFixture(root);
    const { service, configured, workCard: first } = fixture;
    const approvals = new GovernanceApprovalService(configured, service);
    const firstItem = (await approvals.listQueue()).items.find(
      (item) => item.targetArtifactId === first.artifact.artifactId,
    );
    assert.equal(firstItem.approvalStatus, "pending_operator_disposition");
    assert.equal((await resolveProjection(configured)).state.currentActionId, "operator_work_card_approval_required");

    await decideExact(approvals, firstItem, "revision_requested", "Needs a narrower scope.");
    assert.equal((await resolveProjection(configured)).state.currentActionId, "work_card_authoring_required");
    const idempotent = await approvals.decide({
      stage: firstItem.decisionStage,
      targets: firstItem.targetBindings,
      outcome: outcomeForDecision("revision_requested"),
      operatorReason: "Needs a narrower scope.",
    });
    assert.equal(idempotent.ok, true, idempotent.errorMessages?.join(" "));
    const contradictoryFirst = await approvals.decide({
      stage: firstItem.decisionStage,
      targets: firstItem.targetBindings,
      outcome: outcomeForDecision("approved"),
    });
    assert.equal(contradictoryFirst.ok, false);
    assert.match(contradictoryFirst.errorMessages.join(" "), /already has a durable Operator decision/);

    const second = await service.commitArtifact({
      artifactId: first.artifact.artifactId,
      artifactType: first.artifact.artifactType,
      status: "active",
      projectId: first.artifact.projectId,
      phaseId: first.artifact.phaseId,
      workCardId: "WC01",
      relationships: first.artifact.relationships,
      payload: {
        title: "WC01 Routed Timeline",
        contentMarkdown: "# WC01 Routed Timeline\n\nRevision 2.\n",
        data: {
          workCardId: "WC01",
          requiresImplementer: true,
          codeChangesAuthorized: true,
          expectedImplementerReportArtifactId: "champcity-ai/phase-10/implementer_report/WC01",
        },
      },
      location: {
        directoryPath: "planning/phases/phase-10/Work_Cards",
        fileStem: "WC01_routed_timeline",
      },
      expectedRevision: first.artifact.revision,
    });
    const secondItem = (await approvals.listQueue()).items.find(
      (item) => item.targetArtifactId === second.artifact.artifactId,
    );
    assert.equal(secondItem.approvalStatus, "stale");
    assert.equal(secondItem.decisionTimeline.length, 1);
    assert.equal(secondItem.decisionTimeline[0].outcome.decision, "revision_requested");

    await decideExact(approvals, secondItem, "rejected", "Still too broad.");
    assert.equal((await resolveProjection(configured)).state.currentActionId, "candidate_disposition_required");
    const contradictorySecond = await approvals.decide({
      stage: secondItem.decisionStage,
      targets: secondItem.targetBindings,
      outcome: outcomeForDecision("approved"),
    });
    assert.equal(contradictorySecond.ok, false);
    assert.match(contradictorySecond.errorMessages.join(" "), /already has a durable Operator decision/);
    const rejected = (await approvals.listQueue()).items.find(
      (item) => item.targetArtifactId === second.artifact.artifactId,
    );
    assert.equal(rejected.approvalStatus, "exact");
    assert.equal(rejected.decisionTimeline.length, 2);
    assert.deepEqual(
      rejected.decisionTimeline.map((event) => event.outcome.decision),
      ["revision_requested", "rejected"],
    );

    const third = await service.commitArtifact({
      artifactId: second.artifact.artifactId,
      artifactType: second.artifact.artifactType,
      status: "active",
      projectId: second.artifact.projectId,
      phaseId: second.artifact.phaseId,
      workCardId: "WC01",
      relationships: second.artifact.relationships,
      payload: {
        title: "WC01 Routed Timeline",
        contentMarkdown: "# WC01 Routed Timeline\n\nRevision 3.\n",
        data: {
          workCardId: "WC01",
          requiresImplementer: true,
          codeChangesAuthorized: true,
          expectedImplementerReportArtifactId: "champcity-ai/phase-10/implementer_report/WC01",
        },
      },
      location: {
        directoryPath: "planning/phases/phase-10/Work_Cards",
        fileStem: "WC01_routed_timeline",
      },
      expectedRevision: second.artifact.revision,
    });
    const thirdItem = (await approvals.listQueue()).items.find(
      (item) => item.targetArtifactId === third.artifact.artifactId,
    );
    assert.equal(thirdItem.approvalStatus, "stale");
    assert.deepEqual(
      thirdItem.decisionTimeline.map((event) => event.outcome.decision),
      ["revision_requested", "rejected"],
    );

    await decideExact(approvals, thirdItem, "approved");
    const approvedRoute = await resolveProjection(configured);
    assert.equal(approvedRoute.state.currentActionId, "implementer_execution_required");
    assert.equal(approvedRoute.implementerAssignment.operatorApprovalArtifactId, thirdItem.approvalArtifactId);
    assert.equal(
      approvedRoute.implementerAssignment.expectedImplementerReportArtifactId,
      "champcity-ai/phase-10/implementer_report/WC01",
    );
    const approved = (await approvals.listQueue()).items.find(
      (item) => item.targetArtifactId === third.artifact.artifactId,
    );
    assert.equal(approved.approvalStatus, "exact");
    assert.deepEqual(
      approved.decisionTimeline.map((event) => `${event.targets[0].revision}:${event.outcome.decision}`),
      ["1:revision_requested", "2:rejected", "3:approved"],
    );
  });
});

test("phase approval revision request and rejection use existing phase failure routes", async () => {
  await withTemporaryRoot(async (root) => {
    const { service, configured, workCardPlan } = await createRoutedWorkCardApprovalFixture(root, {
      phaseApproved: false,
    });
    const approvals = new GovernanceApprovalService(configured, service);
    const queue = await approvals.listQueue();
    const planItem = queue.items.find(
      (item) => item.targetArtifactId === workCardPlan.artifact.artifactId,
    );
    await decideExact(approvals, planItem, "revision_requested", "Revise phase planning.");
    assert.equal((await resolveProjection(configured)).state.currentActionId, "phase_mapping_required");
  });

  await withTemporaryRoot(async (root) => {
    const { service, configured, workCardPlan } = await createRoutedWorkCardApprovalFixture(root, {
      phaseApproved: false,
    });
    const approvals = new GovernanceApprovalService(configured, service);
    const queue = await approvals.listQueue();
    const planItem = queue.items.find(
      (item) => item.targetArtifactId === workCardPlan.artifact.artifactId,
    );
    await decideExact(approvals, planItem, "rejected", "Reject phase planning.");
    assert.equal((await resolveProjection(configured)).state.currentActionId, "phase_mapping_required");
  });
});

test("planned Implementer Work Cards require exact implementation authorization", async () => {
  await withTemporaryRoot(async (root) => {
    const { configured } = await createRoutedWorkCardApprovalFixture(root);
    const route = await resolveProjection(configured);
    assert.equal(route.state.currentActionId, "operator_work_card_approval_required");
  });

  await withTemporaryRoot(async (root) => {
    const { service, configured, workCard } = await createRoutedWorkCardApprovalFixture(root);
    await service.commitArtifact({
      artifactId: "champcity-ai/phase-10/operator_approval/WC01",
      artifactType: "operator_approval",
      status: "active",
      projectId: PROJECT_ID,
      phaseId: "phase-10",
      workCardId: "WC01",
      parentArtifactId: workCard.artifact.artifactId,
      relationships: {
        sources: [workCard.artifact.artifactId],
        expectedOutputs: ["champcity-ai/phase-10/implementer_report/WC01"],
      },
      payload: {
        title: "Operator Approval: WC01",
        contentMarkdown: "# Operator Approval: WC01\n",
        data: {
          approvalScope: "work_card",
          approvedArtifactId: workCard.artifact.artifactId,
          approvedRevision: workCard.artifact.revision,
          approvedPayloadHash: workCard.artifact.payloadHash,
          decision: "approved",
          implementationAuthorized: false,
          phaseProgressionAuthorized: false,
          routeSelectionAuthorized: false,
        },
      },
      location: {
        directoryPath: "planning/phases/phase-10/Operator_Approvals",
        fileStem: "OPERATOR_APPROVAL_WC01_routed_timeline",
      },
      expectedRevision: null,
    });
    const route = await resolveProjection(configured);
    assert.equal(route.state.currentActionId, "operator_work_card_approval_required");
    assert.notEqual(route.state.currentActionId, "implementer_execution_required");
  });
});

test("Phase 05 WC02-shaped Architect-owned Work Card is dispositioned by approved Reconciliation Review", async () => {
  await withTemporaryRoot(async (root) => {
    const service = createService(root);
    const workCard = await service.commitArtifact({
      artifactId: "champcity-ai/phase-05/work_card/WC02",
      artifactType: "work_card",
      status: "active",
      projectId: PROJECT_ID,
      phaseId: "phase-05",
      workCardId: "WC02",
      relationships: {
        expectedOutputs: ["champcity-ai/phase-05/reconciliation_review/WC02"],
      },
      payload: {
        title: "WC02 Architect-owned reconciliation",
        contentMarkdown: "# WC02 Architect-owned reconciliation\n",
        data: {
          workCardId: "WC02",
          requiresImplementer: false,
          codeChangesAuthorized: false,
          ownerRole: "architect",
        },
      },
      location: {
        directoryPath: "planning/phases/phase-05/Work_Cards",
        fileStem: "WC02_architect_owned_reconciliation",
      },
      expectedRevision: null,
    });
    const review = await service.commitArtifact({
      artifactId: "champcity-ai/phase-05/reconciliation_review/WC02",
      artifactType: "reconciliation_review",
      status: "active",
      projectId: PROJECT_ID,
      phaseId: "phase-05",
      workCardId: "WC02",
      parentArtifactId: workCard.artifact.artifactId,
      relationships: {
        sources: [workCard.artifact.artifactId],
      },
      payload: {
        title: "WC02 Reconciliation Review",
        contentMarkdown: "# WC02 Reconciliation Review\n\nApproved planning reconciliation.\n",
        data: { workCardId: "WC02" },
      },
      location: {
        directoryPath: "planning/phases/phase-05/Reconciliation_Reviews",
        fileStem: "RECONCILIATION_REVIEW_WC02",
      },
      expectedRevision: null,
    });
    await service.commitArtifact({
      artifactId: "champcity-ai/phase-05/operator_approval/RECONCILIATION_REVIEW_WC02",
      artifactType: "operator_approval",
      status: "active",
      projectId: PROJECT_ID,
      phaseId: "phase-05",
      workCardId: "WC02",
      parentArtifactId: review.artifact.artifactId,
      relationships: {
        sources: [review.artifact.artifactId],
      },
      payload: {
        title: "Operator Approval: WC02 Reconciliation Review",
        contentMarkdown: "# Operator Approval: WC02 Reconciliation Review\n",
        data: operatorDecisionRecord("work_card", [review.artifact], { kind: "stage_decision", decision: "approved" }),
      },
      location: {
        directoryPath: "planning/phases/phase-05/Operator_Approvals",
        fileStem: "OPERATOR_APPROVAL_RECONCILIATION_REVIEW_WC02",
      },
      expectedRevision: null,
    });

    const approvals = new GovernanceApprovalService(testProject(root), service);
    const queue = await approvals.listQueue();
    const item = queue.items.find(
      (candidate) => candidate.targetArtifactId === workCard.artifact.artifactId,
    );
    assert.equal(item.approvalStatus, "exact");
    assert.equal(item.implementationAuthorizationAvailable, false);
    assert.match(item.reason, /approved Reconciliation Review/);
    assert.equal(item.authorizationBoundary.includes("authorizes Implementer execution"), false);
  });
});

async function createRegisteredNoncanonicalGovernancePair(root, options = {}) {
  const service = createService(root);
  const workCardId = options.workCardId ?? "NONCANON";
  const fileStem = options.fileStem ?? `${workCardId}_registered_noncanonical_pair`;
  const committed = await service.commitArtifact({
    artifactId: `champcity-ai/phase-09/work_card/${workCardId}`,
    artifactType: "work_card",
    status: "active",
    projectId: PROJECT_ID,
    phaseId: "phase-09",
    workCardId,
    relationships: {
      sources: [],
      expectedOutputs: [`champcity-ai/phase-09/implementer_report/${workCardId}`],
      supersedes: [],
      children: [],
    },
    payload: {
      title: `Registered Noncanonical Pair ${workCardId}`,
      contentMarkdown: `# Registered Noncanonical Pair ${workCardId}\n`,
      data: { workCardId, status: "ready_for_implementer" },
    },
    location: {
      directoryPath: "planning/phases/phase-09/Work_Cards",
      fileStem,
    },
    expectedRevision: null,
  });
  await writeFile(
    path.join(root, ...committed.artifact.jsonPath.split("/")),
    JSON.stringify(committed.artifact),
    "utf8",
  );
  return {
    service,
    artifact: committed.artifact,
    configured: testProject(root),
  };
}

function assertSnapshotProjectionRevisionAgreement(snapshot, projection, label) {
  const revision = snapshot.scanResult.projectionRevision;
  assert.equal(
    snapshot.projection.state.stateRevision,
    revision,
    `${label} workflow state revision should match scan projection revision`,
  );
  if (snapshot.projection.state.currentAction) {
    assert.equal(
      snapshot.projection.state.currentAction.stateRevision,
      revision,
      `${label} routed action revision should match scan projection revision`,
    );
  }
  if (projection.currentAction.routedAction) {
    assert.equal(
      projection.currentAction.routedAction.stateRevision,
      revision,
      `${label} current-required-action routed revision should match scan projection revision`,
    );
  }
}

async function resolveProjection(configured) {
  const graph = await scanVerifiedArtifactGraph(configured, () => "2026-07-14T12:00:00.000Z");
  return new RelationshipDrivenWorkflowResolver().resolve(configured, graph, 1);
}

async function createRoutedWorkCardApprovalFixture(root, options = {}) {
  const service = createService(root);
  const configured = testProject(root);
  const phaseActivation = await service.commitArtifact({
    artifactId: "champcity-ai/phase-10/phase_activation/phase-10",
    artifactType: "phase_activation",
    status: "active",
    projectId: PROJECT_ID,
    phaseId: "phase-10",
    relationships: {},
    payload: {
      title: "Phase 10 Activation",
      contentMarkdown: "# Phase 10 Activation\n",
      data: { phaseId: "phase-10", phaseSequence: 10 },
    },
    location: { directoryPath: "planning/phases/phase-10", fileStem: "Phase_Activation" },
    expectedRevision: null,
  });
  const phasePlanning = await service.commitArtifact({
    artifactId: "champcity-ai/phase-10/phase_planning/Phase_Planning",
    artifactType: "phase_planning",
    status: "active",
    projectId: PROJECT_ID,
    phaseId: "phase-10",
    relationships: { sources: [phaseActivation.artifact.artifactId] },
    payload: {
      title: "Phase 10 Planning",
      contentMarkdown: "# Phase 10 Planning\n",
      data: { phaseId: "phase-10" },
    },
    location: { directoryPath: "planning/phases/phase-10", fileStem: "Phase_Planning" },
    expectedRevision: null,
  });
  const workCardPlan = await service.commitArtifact({
    artifactId: "champcity-ai/phase-10/work_card_plan/Work_Card_Plan",
    artifactType: "work_card_plan",
    status: "active",
    projectId: PROJECT_ID,
    phaseId: "phase-10",
    parentArtifactId: phasePlanning.artifact.artifactId,
    relationships: {
      sources: [phasePlanning.artifact.artifactId],
      expectedOutputs: [
        "champcity-ai/phase-10/operator_approval/Operator_Phase_Approval",
        "champcity-ai/phase-10/work_card/WC01",
      ],
    },
    payload: {
      title: "Phase 10 Work Card Plan",
      contentMarkdown: "# Phase 10 Work Card Plan\n",
      data: {
        phaseId: "phase-10",
        candidates: [{ id: "WC01", title: "WC01 Routed Timeline", order: 1 }],
      },
    },
    location: { directoryPath: "planning/phases/phase-10", fileStem: "Work_Card_Plan" },
    expectedRevision: null,
  });
  let phaseApproval = null;
  if (options.phaseApproved !== false) {
    const approvals = new GovernanceApprovalService(configured, service);
    const planItem = (await approvals.listQueue()).items.find(
      (item) => item.targetArtifactId === workCardPlan.artifact.artifactId,
    );
    await decideExact(approvals, planItem, "approved");
    const registry = await service.loadRegistry();
    const approvalEntry = registry.entries.find(
      (entry) => entry.artifactId === "champcity-ai/phase-10/operator_approval/Operator_Phase_Approval",
    );
    phaseApproval = approvalEntry
      ? await service.readArtifactByPaths(approvalEntry.jsonPath, approvalEntry.markdownPath)
      : null;
  }
  const workCard = await service.commitArtifact({
    artifactId: "champcity-ai/phase-10/work_card/WC01",
    artifactType: "work_card",
    status: "active",
    projectId: PROJECT_ID,
    phaseId: "phase-10",
    workCardId: "WC01",
    parentArtifactId: workCardPlan.artifact.artifactId,
    relationships: {
      sources: [
        workCardPlan.artifact.artifactId,
        ...(phaseApproval ? [phaseApproval.artifact.artifactId] : []),
      ],
      expectedOutputs: [
        "champcity-ai/phase-10/implementer_report/WC01",
        "champcity-ai/phase-10/candidate_disposition/WC01",
      ],
    },
    payload: {
      title: "WC01 Routed Timeline",
      contentMarkdown: "# WC01 Routed Timeline\n\nRevision 1.\n",
      data: {
        workCardId: "WC01",
        requiresImplementer: true,
        codeChangesAuthorized: true,
        expectedImplementerReportArtifactId: "champcity-ai/phase-10/implementer_report/WC01",
      },
    },
    location: {
      directoryPath: "planning/phases/phase-10/Work_Cards",
      fileStem: "WC01_routed_timeline",
    },
    expectedRevision: null,
  });
  return {
    service,
    configured,
    phaseActivation,
    phasePlanning,
    workCardPlan,
    phaseApproval,
    workCard,
  };
}

async function decideExact(approvals, item, decision, operatorReason = "Temporary fixture decision.") {
  const result = await approvals.decide({
    stage: item.decisionStage,
    targets: item.targetBindings,
    outcome: outcomeForDecision(decision),
    operatorReason,
  });
  assert.equal(result.ok, true, result.errorMessages?.join(" "));
  assert.equal(result.decisionEvent.stage, item.decisionStage);
  assert.equal(result.decisionEvent.targetSetHash, item.targetSetHash);
  return result;
}

function outcomeForDecision(decision, extra = {}) {
  if (decision === "approved" || decision === "revision_requested" || decision === "rejected") {
    return { kind: "stage_decision", decision };
  }
  return { kind: "record_disposition", disposition: decision, ...extra };
}

function operatorDecisionRecord(stage, artifacts, outcome, operatorReason) {
  const targets = artifacts.map((artifact) => ({
    artifactId: artifact.artifactId,
    artifactType: artifact.artifactType,
    revision: artifact.revision,
    payloadHash: artifact.payloadHash,
  })).sort((left, right) => left.artifactId.localeCompare(right.artifactId));
  const targetSetHash = createHash("sha256")
    .update(JSON.stringify({ stage, targets }), "utf8")
    .digest("hex");
  const event = {
    schemaVersion: "operator-decision-event.v1",
    stage,
    targets,
    targetSetHash,
    outcome,
    ...(operatorReason ? { operatorReason } : {}),
    decidedAt: "2026-07-14T12:30:00.000Z",
  };
  return {
    schemaVersion: "operator-decision-record.v1",
    stage,
    targets,
    targetSetHash,
    outcome,
    ...(operatorReason ? { operatorReason } : {}),
    decidedAt: event.decidedAt,
    decisionTimeline: [event],
  };
}

function testProject(root) {
  return {
    projectId: PROJECT_ID,
    displayName: "ChampCity A/I",
    repositoryRoot: root,
    planningRoot: path.join(root, "planning"),
    branchBehavior: { mode: "observe-current" },
    enabled: true,
    createdAt: "2026-07-14T12:00:00.000Z",
    updatedAt: "2026-07-14T12:00:00.000Z",
    lastOpenedAt: "2026-07-14T12:00:00.000Z",
    lastScanAt: null,
    lastScanResult: null,
    observerStatus: "stopped",
  };
}
