const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  buildArtifactRegistry,
  buildArtifactRegistryEntry,
  buildCanonicalArtifact,
  canonicalPrettyStringify,
  renderArtifactMarkdown,
  renderArtifactRegistryContentMarkdown,
  validateArtifactRegistry,
} = require("../../dist/shared/artifacts");
const {
  ArtifactPairService,
  GovernanceRepairService,
} = require("../../dist/main/artifacts");
const {
  buildValidationReportJsonFileName,
  buildValidationReportMarkdownFileName,
} = require("../../dist/shared/workCards/validationRecord");
const {
  canonicalWorkflowAuthority,
  getCurrentGovernanceMaintenance,
  initializeCanonicalRuntime,
  repairGovernanceRecord,
  shutdownCanonicalRuntime,
} = require("../../dist/main/canonicalRuntime");
const {
  saveHumanValidationRecord,
} = require("../../dist/main/workCards/workCardFileStore");

const projectId = "champcity-ai";
const phaseId = "phase-02";
const workCardId = "FIX_context_menu_copy_paste";
const legacyArtifactId =
  "champcity-ai/operator_validation/VALIDATION_REPORT_FIX_context_menu_copy_paste_context_menu_copy_paste_2";
const canonicalArtifactId =
  "champcity-ai/phase-02/operator_validation/FIX_context_menu_copy_paste";
const legacyJsonPath =
  "planning/phases/phase-02/Validation_Reports/VALIDATION_REPORT_FIX_context_menu_copy_paste_context_menu_copy_paste_2.json";
const legacyMarkdownPath =
  "planning/phases/phase-02/Validation_Reports/VALIDATION_REPORT_FIX_context_menu_copy_paste_context_menu_copy_paste_2.md";
const fixedLegacyArtifactId =
  "champcity-ai/operator_validation/VALIDATION_REPORT_FIX_context_menu_copy_paste_context_menu_copy_paste";
const canonicalJsonPath =
  "planning/phases/phase-02/Validation_Reports/VALIDATION_REPORT_FIX_context_menu_copy_paste_context_menu_copy_paste.json";
const canonicalMarkdownPath =
  "planning/phases/phase-02/Validation_Reports/VALIDATION_REPORT_FIX_context_menu_copy_paste_context_menu_copy_paste.md";
const shortenedJsonPath =
  "planning/phases/phase-02/Validation_Reports/VALIDATION_REPORT_FIX_context_menu_copy_paste.json";
const samePathWorkCardId = "WC03_REPAIR_header_layout_regression";
const samePathLegacyArtifactId =
  "champcity-ai/operator_validation/VALIDATION_REPORT_WC03_REPAIR_header_layout_regression_repair_header_layout_regression";
const samePathCanonicalArtifactId =
  "champcity-ai/phase-02/operator_validation/WC03_REPAIR_header_layout_regression";
const samePathJsonPath =
  "planning/phases/phase-02/Validation_Reports/VALIDATION_REPORT_WC03_REPAIR_header_layout_regression_repair_header_layout_regression.json";
const samePathMarkdownPath =
  "planning/phases/phase-02/Validation_Reports/VALIDATION_REPORT_WC03_REPAIR_header_layout_regression_repair_header_layout_regression.md";
const fixedTime = "2026-07-19T12:00:00.000Z";

test("Governance Repair and normal validation writer generate identical fixed paths", () => {
  const record = {
    workCardId,
    workCardTitle: "Context menu copy paste",
  };
  assert.equal(
    `planning/phases/${phaseId}/Validation_Reports/${buildValidationReportJsonFileName(record)}`,
    canonicalJsonPath,
  );
  assert.equal(
    `planning/phases/${phaseId}/Validation_Reports/${buildValidationReportMarkdownFileName(record)}`,
    canonicalMarkdownPath,
  );
});

test("real legacy Operator Validation shape proposes exact Work Card based canonical identity", async () => {
  await withSemanticFixture(async ({ project, root, artifact }) => {
    const service = repairService(root, project);
    const candidate = await firstCandidate(service, artifact.artifactId);

    assert.equal(candidate.repairKind, "semantic_identity_repair");
    assert.equal(candidate.operationLabel, "Duplicate Artifact Cleanup");
    assert.equal(candidate.itemStatus, "operator_semantic_decision_required");
    assert.equal(candidate.phaseId, undefined, "phase is proposed, not silently applied");
    assert.equal(candidate.semanticProposal.currentArtifactId, legacyArtifactId);
    assert.equal(candidate.semanticProposal.proposedArtifactId, canonicalArtifactId);
    assert.equal(candidate.semanticProposal.proposedPhaseId, phaseId);
    assert.equal(candidate.semanticProposal.currentWorkCardId, workCardId);
    assert.equal(candidate.semanticProposal.proposedWorkCardId, workCardId);
    assert.equal(candidate.semanticProposal.currentJsonPath, legacyJsonPath);
    assert.equal(candidate.semanticProposal.proposedJsonPath, canonicalJsonPath);
    assert.equal(candidate.semanticProposal.proposedMarkdownPath, canonicalMarkdownPath);
    assert.equal(candidate.semanticProposal.duplicateReconciliation.fixedPathAlreadyOccupied, true);
    assert.equal(
      candidate.semanticProposal.duplicateReconciliation.fixedPathRecord.artifactId,
      fixedLegacyArtifactId,
    );
    assert.match(candidate.semanticProposal.workCardTitleEvidence, /Validation Target/);
    assert.match(candidate.semanticProposal.basisSummary, /Structured workCardId is FIX_context_menu_copy_paste/);
    assert.match(candidate.semanticProposal.basisSummary, /fixed writer path is already occupied/i);
    assert.equal(candidate.semanticProposal.requiredDisposition, "numbered_legacy_path");
    assert.deepEqual(candidate.semanticProposal.allowedNumberedLegacyDispositions, [
      "migrate_to_canonical_fixed_path",
    ]);
    assert.equal(candidate.semanticProposal.duplicateReconciliation.title, "Duplicate Artifact Cleanup");
    assert.deepEqual(candidate.semanticProposal.duplicateReconciliation.allowedDispositions, [
      "use_numbered_record_as_next_canonical_revision",
      "keep_fixed_record_and_delete_duplicate",
    ]);
    assert.equal(
      candidate.blockReason,
      "An earlier application save created a numbered duplicate instead of revising the fixed canonical validation record. Two records now compete for one canonical artifact identity.",
    );
    assert.equal(
      candidate.semanticProposal.duplicateReconciliation.canonicalArtifactId,
      canonicalArtifactId,
    );
    assert.equal(
      candidate.semanticProposal.duplicateReconciliation.duplicateJsonPathToDelete,
      legacyJsonPath,
    );
    assert.ok(
      candidate.semanticProposal.duplicateReconciliation.actualPayloadDifferences.some((item) =>
        item.includes("fixedPathFixture"),
      ),
    );
    assert.ok(candidate.semanticProposal.canonicalPathContractSource.includes("validationRecord"));
    assert.equal(candidate.safelyRepairable, false);
  });
});

test("registered same-path Operator Validation proposes canonical phase identity without self-collision", async () => {
  await withRegisteredSamePathFixture(async ({ project, root, artifact }) => {
    const service = repairService(root, project);
    const candidate = await firstCandidate(service, artifact.artifactId);

    assert.equal(candidate.repairKind, "semantic_identity_repair");
    assert.equal(candidate.safelyRepairable, true);
    assert.equal(candidate.semanticProposal.currentArtifactId, samePathLegacyArtifactId);
    assert.equal(candidate.semanticProposal.proposedArtifactId, samePathCanonicalArtifactId);
    assert.equal(candidate.semanticProposal.proposedPhaseId, phaseId);
    assert.equal(candidate.semanticProposal.currentWorkCardId, samePathWorkCardId);
    assert.equal(candidate.semanticProposal.proposedWorkCardId, samePathWorkCardId);
    assert.equal(candidate.semanticProposal.currentJsonPath, samePathJsonPath);
    assert.equal(candidate.semanticProposal.currentMarkdownPath, samePathMarkdownPath);
    assert.equal(candidate.semanticProposal.proposedJsonPath, samePathJsonPath);
    assert.equal(candidate.semanticProposal.proposedMarkdownPath, samePathMarkdownPath);
    assert.equal(candidate.semanticProposal.numberedLegacyPath, false);
    assert.equal(candidate.semanticProposal.duplicateReconciliation, undefined);
    assert.equal(candidate.semanticProposal.collision, undefined);
    assert.match(candidate.semanticProposal.workCardTitleEvidence, /Validation Target/);
  });
});

test("registered same-path migration succeeds through ArtifactPairService without deleting or creating a pair", async () => {
  await withRegisteredSamePathFixture(async ({ project, root, artifact }) => {
    const pairService = new ArtifactPairService({ projectRoot: root, clock: () => fixedTime });
    const service = new GovernanceRepairService(project, pairService);
    const candidate = await firstCandidate(service, artifact.artifactId);
    const before = await readJson(root, samePathJsonPath);
    const beforeFiles = (await listFilesRecursively(root)).filter((file) =>
      file.includes("Validation_Reports/VALIDATION_REPORT_WC03_REPAIR_header_layout_regression"),
    );

    const result = await pairService.repairSemanticArtifactIdentity({
      currentArtifactId: candidate.artifactId,
      currentJsonPath: candidate.jsonPath,
      currentMarkdownPath: candidate.markdownPath,
      expectedRevision: candidate.revision,
      proposal: candidate.semanticProposal,
    });

    assert.equal(result.artifact.artifactId, samePathCanonicalArtifactId);
    assert.equal(result.artifact.phaseId, phaseId);
    assert.equal(result.artifact.workCardId, samePathWorkCardId);
    assert.equal(result.artifact.revision, 2);
    assert.equal(result.artifact.status, before.status);
    assert.equal(result.artifact.createdAt, before.createdAt);
    assert.deepEqual(result.artifact.payload, before.payload);
    assert.equal(result.artifact.jsonPath, samePathJsonPath);
    assert.equal(result.artifact.markdownPath, samePathMarkdownPath);
    assert.ok(result.artifact.relationships.supersedes.includes(samePathLegacyArtifactId));
    assert.equal(await exists(path.join(root, ...samePathJsonPath.split("/"))), true);
    assert.equal(await exists(path.join(root, ...samePathMarkdownPath.split("/"))), true);

    const afterFiles = (await listFilesRecursively(root)).filter((file) =>
      file.includes("Validation_Reports/VALIDATION_REPORT_WC03_REPAIR_header_layout_regression"),
    );
    assert.deepEqual(afterFiles.sort(), beforeFiles.sort());
    const registry = (await readJson(root, registryJsonPath())).payload.data;
    const canonicalEntries = registry.entries.filter(
      (entry) => entry.artifactId === samePathCanonicalArtifactId,
    );
    assert.equal(canonicalEntries.length, 1);
    assert.equal(canonicalEntries[0].authoritative, true);
    assert.equal(canonicalEntries[0].synchronized, true);
    assert.equal(registry.entries.some((entry) => entry.artifactId === samePathLegacyArtifactId), false);
  });
});

test("registered same-path migration rewrites safe inbound references and rolls back on same-path write failure", async () => {
  await withRegisteredSamePathFixture(async ({ project, root, artifact }) => {
    const pairService = new ArtifactPairService({ projectRoot: root, clock: () => fixedTime });
    const service = new GovernanceRepairService(project, pairService);
    const candidate = await firstCandidate(service, artifact.artifactId);
    assert.equal(candidate.semanticProposal.inboundReferences.length, 3);

    await pairService.repairSemanticArtifactIdentity({
      currentArtifactId: candidate.artifactId,
      currentJsonPath: candidate.jsonPath,
      currentMarkdownPath: candidate.markdownPath,
      expectedRevision: candidate.revision,
      proposal: candidate.semanticProposal,
    });

    const source = await readJson(root, "planning/phases/phase-02/Support/source_ref.json");
    const expected = await readJson(root, "planning/phases/phase-02/Support/expected_ref.json");
    const parent = await readJson(root, "planning/phases/phase-02/Support/parent_ref.json");
    assert.deepEqual(source.relationships.sources, [samePathCanonicalArtifactId]);
    assert.deepEqual(expected.relationships.expectedOutputs, [samePathCanonicalArtifactId]);
    assert.equal(parent.parentArtifactId, samePathCanonicalArtifactId);
    const registry = (await readJson(root, registryJsonPath())).payload.data;
    for (const entry of registry.entries) {
      if (entry.artifactId === samePathCanonicalArtifactId) continue;
      assert.equal(entry.relationships.sources.includes(samePathLegacyArtifactId), false);
      assert.equal(entry.relationships.expectedOutputs.includes(samePathLegacyArtifactId), false);
      assert.notEqual(entry.parentArtifactId, samePathLegacyArtifactId);
    }
  }, { inboundReferences: true });

  await withRegisteredSamePathFixture(async ({ project, root, artifact }) => {
    const pairService = new ArtifactPairService({
      projectRoot: root,
      clock: () => fixedTime,
      failureInjector: (point) => {
        if (point === "before_registry_update") throw new Error("injected same-path failure");
      },
    });
    const service = new GovernanceRepairService(project, pairService);
    const candidate = await firstCandidate(service, artifact.artifactId);

    await assert.rejects(
      () =>
        pairService.repairSemanticArtifactIdentity({
          currentArtifactId: candidate.artifactId,
          currentJsonPath: candidate.jsonPath,
          currentMarkdownPath: candidate.markdownPath,
          expectedRevision: candidate.revision,
          proposal: candidate.semanticProposal,
        }),
      /Semantic governance repair failed/,
    );

    const repairedPath = await readJson(root, samePathJsonPath);
    assert.equal(repairedPath.artifactId, samePathLegacyArtifactId);
    assert.equal(repairedPath.revision, 1);
    const source = await readJson(root, "planning/phases/phase-02/Support/source_ref.json");
    assert.deepEqual(source.relationships.sources, [samePathLegacyArtifactId]);
    const registry = (await readJson(root, registryJsonPath())).payload.data;
    assert.ok(registry.entries.some((entry) => entry.artifactId === samePathLegacyArtifactId));
    assert.equal(registry.entries.some((entry) => entry.artifactId === samePathCanonicalArtifactId), false);
  }, { inboundReferences: true });
});

test("registered same-path migration succeeds through runtime repair and routes the next candidate after restart", async () => {
  await withRegisteredSamePathFixture(async ({ root, artifact }) => {
    await makeRuntimeProject(root);
    const noncanonical = buildCanonicalArtifact({
      artifactId: `${projectId}/phase-02/diagnostic_report/SAME_PATH_NEXT`,
      artifactType: "diagnostic_report",
      revision: 1,
      status: "active",
      projectId,
      phaseId,
      createdAt: fixedTime,
      updatedAt: fixedTime,
      jsonPath: "planning/phases/phase-02/Diagnostics/SAME_PATH_NEXT.json",
      markdownPath: "planning/phases/phase-02/Diagnostics/SAME_PATH_NEXT.md",
      relationships: { sources: [], expectedOutputs: [], supersedes: [], children: [] },
      payload: {
        kind: "diagnostic_report",
        title: "Same path next",
        contentMarkdown: "# Same path next\n",
        data: {},
      },
    });
    await writeArtifact(root, noncanonical);
    await fs.writeFile(
      path.join(root, ...noncanonical.jsonPath.split("/")),
      JSON.stringify(noncanonical),
      "utf8",
    );
    await writeRegistry(root, [artifact, noncanonical]);
    await initializeCanonicalRuntime({
      defaultRepositoryRoot: root,
      workspaceStoragePath: path.join(root, ".runtime", "workspaces.json"),
      allowRepositoryTmpProjects: true,
    });
    try {
      const snapshot = await getCurrentGovernanceMaintenance();
      const samePath = snapshot.maintenance.repair.candidates.find(
        (item) => item.artifactId === samePathLegacyArtifactId,
      );
      assert.ok(samePath);

      const result = await repairGovernanceRecord(migrationIntent(samePath));
      assert.equal(result.ok, true, result.errorMessages?.join(" "));
      assert.equal(result.repairedArtifactIds.includes(samePathCanonicalArtifactId), true);
      assert.equal(result.maintenance.repair.candidates.some((item) => item.artifactId === samePathLegacyArtifactId), false);
      assert.equal(result.currentRequiredAction.currentAction.routedAction.targetArtifactId, noncanonical.artifactId);

      await shutdownCanonicalRuntime().catch(() => undefined);
      await initializeCanonicalRuntime({
        defaultRepositoryRoot: root,
        workspaceStoragePath: path.join(root, ".runtime", "workspaces.json"),
        allowRepositoryTmpProjects: true,
      });
      const afterRestart = await getCurrentGovernanceMaintenance();
      assert.equal(afterRestart.maintenance.repair.candidates.some((item) => item.artifactId === samePathLegacyArtifactId), false);
      assert.equal(afterRestart.currentRequiredAction.currentAction.routedAction.targetArtifactId, noncanonical.artifactId);
    } finally {
      await shutdownCanonicalRuntime().catch(() => undefined);
    }
  });
});

test("registered same-path migration blocks true Registry and stale-source collisions", async () => {
  await withRegisteredSamePathFixture(async ({ project, root, artifact }) => {
    const collision = buildCanonicalArtifact({
      ...artifact,
      artifactId: samePathCanonicalArtifactId,
      phaseId,
      jsonPath: "planning/phases/phase-02/Validation_Reports/VALIDATION_REPORT_WC03_REPAIR_header_layout_regression_collision.json",
      markdownPath: "planning/phases/phase-02/Validation_Reports/VALIDATION_REPORT_WC03_REPAIR_header_layout_regression_collision.md",
    });
    await writeRegistry(root, [artifact, collision]);
    const service = repairService(root, project);
    const candidate = await firstCandidate(service, artifact.artifactId);
    assert.match(candidate.semanticProposal.collision, /Registry collision/);
    await assert.rejects(() => service.repairOne(migrationIntent(candidate)), /Registry collision/);
  });

  await withRegisteredSamePathFixture(async ({ project, root, artifact }) => {
    const stale = buildCanonicalArtifact({ ...artifact, revision: 99 });
    await writeRegistry(root, [stale]);
    const service = repairService(root, project);
    const candidate = await firstCandidate(service, artifact.artifactId);
    await assert.rejects(
      () => service.repairOne(migrationIntent(candidate)),
      /not safe|proposal no longer matches|collides/i,
    );
  });
});

test("different target path occupants remain blocked for semantic migration", async () => {
  await withSemanticFixture(async ({ root, project, artifact }) => {
    await fs.rm(path.join(root, ...canonicalJsonPath.split("/")), { force: true });
    await fs.rm(path.join(root, ...canonicalMarkdownPath.split("/")), { force: true });
    const pathCollision = buildCanonicalArtifact({
      artifactId: "champcity-ai/phase-02/support/path_collision",
      artifactType: "support",
      revision: 1,
      status: "active",
      projectId,
      phaseId,
      createdAt: fixedTime,
      updatedAt: fixedTime,
      jsonPath: canonicalJsonPath,
      markdownPath: canonicalMarkdownPath,
      relationships: { sources: [], expectedOutputs: [], supersedes: [], children: [] },
      payload: {
        kind: "support",
        title: "Path collision",
        contentMarkdown: "# Path collision\n",
        data: {},
      },
    });
    await writeArtifact(root, pathCollision);
    await writeRegistry(root, [artifact, pathCollision]);
    const service = repairService(root, project);
    const candidate = await firstCandidate(service, artifact.artifactId);
    assert.match(candidate.semanticProposal.collision, /Registry collision/);
    await assert.rejects(() => service.repairOne(migrationIntent(candidate)), /Registry collision/);
  }, { registerFixed: false });

  await withSemanticFixture(async ({ root, project, artifact }) => {
    await fs.rm(path.join(root, ...canonicalJsonPath.split("/")), { force: true });
    await fs.rm(path.join(root, ...canonicalMarkdownPath.split("/")), { force: true });
    const unregisteredOccupant = buildCanonicalArtifact({
      artifactId: "champcity-ai/phase-02/support/unregistered_path_occupant",
      artifactType: "support",
      revision: 1,
      status: "active",
      projectId,
      phaseId,
      createdAt: fixedTime,
      updatedAt: fixedTime,
      jsonPath: canonicalJsonPath,
      markdownPath: canonicalMarkdownPath,
      relationships: { sources: [], expectedOutputs: [], supersedes: [], children: [] },
      payload: {
        kind: "support",
        title: "Unregistered path occupant",
        contentMarkdown: "# Unregistered path occupant\n",
        data: {},
      },
    });
    await writeArtifact(root, unregisteredOccupant);
    await writeRegistry(root, [artifact]);
    const service = repairService(root, project);
    const candidate = await firstCandidate(service, artifact.artifactId);
    await assert.rejects(
      () => service.repairOne(migrationIntent(candidate)),
      /target paths already contain a canonical pair/,
    );
  }, { registerFixed: false });
});

test("duplicate reconciliation uses numbered record as next canonical revision without creating shortened third path", async () => {
  await withSemanticFixture(async ({ root, project, artifact }) => {
    const service = repairService(root, project);
    const candidate = await firstCandidate(service, artifact.artifactId);
    const original = await readJson(root, legacyJsonPath);
    const result = await service.repairOne(migrationIntent(candidate));

    assert.deepEqual(result.repairedArtifactIds, [legacyArtifactId, canonicalArtifactId]);
    const repaired = await readJson(root, canonicalJsonPath);
    assert.equal(repaired.artifactId, canonicalArtifactId);
    assert.equal(repaired.phaseId, phaseId);
    assert.equal(repaired.workCardId, workCardId);
    assert.equal(repaired.jsonPath, canonicalJsonPath);
    assert.equal(repaired.markdownPath, canonicalMarkdownPath);
    assert.equal(repaired.revision, 2, "canonical revision advances past existing fixed-path revision");
    assert.equal(repaired.payload.data.validationResult, "Pass");
    assert.deepEqual(repaired.payload.data, original.payload.data);
    assert.equal(repaired.status, original.status);
    assert.equal(repaired.relationships.supersedes.includes(legacyArtifactId), false);
    assert.equal(repaired.relationships.supersedes.includes(fixedLegacyArtifactId), false);
    assert.equal(await exists(path.join(root, ...legacyJsonPath.split("/"))), false);
    assert.equal(await exists(path.join(root, ...legacyMarkdownPath.split("/"))), false);
    assert.equal(await exists(path.join(root, ...shortenedJsonPath.split("/"))), false);

    const registry = (await readJson(root, registryJsonPath())).payload.data;
    assert.equal(validateArtifactRegistry(registry).valid, true);
    assert.ok(registry.entries.some((entry) => entry.artifactId === canonicalArtifactId));
    assert.equal(registry.entries.some((entry) => entry.artifactId === legacyArtifactId), false);
    assert.equal(registry.entries.some((entry) => entry.artifactId === fixedLegacyArtifactId), false);
    assert.equal(registry.entries.some((entry) => entry.artifactType === "operator_approval"), false);
    assert.equal(registry.entries.some((entry) => entry.artifactType === "phase_activation"), false);
  }, { registerLegacy: true });
});

test("duplicate cleanup can keep fixed record and delete numbered pair", async () => {
  await withSemanticFixture(async ({ root, project, artifact, fixedArtifact }) => {
    const service = repairService(root, project);
    const candidate = await firstCandidate(service, artifact.artifactId);
    const result = await service.repairOne(
      migrationIntent(candidate, "keep_fixed_record_and_delete_duplicate"),
    );

    assert.deepEqual(result.repairedArtifactIds, [legacyArtifactId, canonicalArtifactId]);
    const repaired = await readJson(root, canonicalJsonPath);
    assert.equal(repaired.artifactId, canonicalArtifactId);
    assert.equal(repaired.revision, 2);
    assert.deepEqual(repaired.payload.data, fixedArtifact.payload.data);
    assert.equal(repaired.status, fixedArtifact.status);
    assert.equal(await exists(path.join(root, ...legacyJsonPath.split("/"))), false);
    assert.equal(await exists(path.join(root, ...legacyMarkdownPath.split("/"))), false);

    const registry = (await readJson(root, registryJsonPath())).payload.data;
    assert.equal(registry.entries.filter((entry) => entry.artifactId === canonicalArtifactId).length, 1);
    assert.equal(registry.entries.some((entry) => entry.artifactId === legacyArtifactId), false);
    assert.equal(registry.entries.some((entry) => entry.artifactId === fixedLegacyArtifactId), false);
  }, { registerLegacy: true });
});

test("canonical fixed survivor is reviewable evidence, not conflicting evidence", async () => {
  await withSemanticFixture(async ({ root, project, artifact, fixedArtifact }) => {
    const canonicalFixed = buildCanonicalArtifact({
      ...fixedArtifact,
      artifactId: canonicalArtifactId,
      phaseId,
      revision: 2,
      relationships: {
        sources: [],
        expectedOutputs: [],
        supersedes: [fixedLegacyArtifactId, "already-reviewed-numbered-sibling"],
        children: [],
      },
    });
    await writeArtifact(root, canonicalFixed);
    await writeRegistry(root, [canonicalFixed]);

    const candidate = await firstCandidate(repairService(root, project), artifact.artifactId);
    assert.equal(candidate.operationLabel, "Duplicate Artifact Cleanup");
    assert.equal(candidate.repairStatus, "review_available");
    assert.equal(candidate.semanticProposal.collision, undefined);
    assert.deepEqual(candidate.semanticProposal.conflictingCandidates, []);
    assert.equal(
      candidate.semanticProposal.duplicateReconciliation.fixedPathRecord.artifactId,
      canonicalArtifactId,
    );
    assert.equal(
      candidate.semanticProposal.duplicateReconciliation.proposedCanonicalRevision,
      3,
    );
  });
});

test("multi-sibling duplicate cleanup proceeds sequentially and deletes only the selected sibling", async () => {
  await withMultiSiblingDuplicateFixture(async ({ root, project, artifactIdFor, jsonPathFor, markdownPathFor }) => {
    let service = repairService(root, project);
    let candidate = await firstCandidate(service, artifactIdFor(2));
    assert.equal(candidate.semanticProposal.collision, undefined);
    assert.deepEqual(candidate.semanticProposal.conflictingCandidates, []);
    assert.equal(candidate.semanticProposal.duplicateReconciliation.proposedCanonicalRevision, 2);
    await service.repairOne(migrationIntent(candidate));
    assert.equal(await exists(path.join(root, ...jsonPathFor(2).split("/"))), false);
    assert.equal(await exists(path.join(root, ...markdownPathFor(2).split("/"))), false);
    assert.equal(await exists(path.join(root, ...jsonPathFor(3).split("/"))), true);
    assert.equal(await exists(path.join(root, ...jsonPathFor(4).split("/"))), true);
    let canonical = await readJson(root, canonicalJsonPath);
    assert.equal(canonical.artifactId, canonicalArtifactId);
    assert.equal(canonical.revision, 2);
    assert.equal(canonical.payload.data.sibling, 2);

    service = repairService(root, project);
    let preview = await service.preview();
    assert.equal(preview.candidates.some((item) => item.artifactId === canonicalArtifactId), false);
    assert.equal(preview.candidates.some((item) => item.artifactId === artifactIdFor(2)), false);
    candidate = await firstCandidate(service, artifactIdFor(3));
    assert.equal(candidate.repairStatus, "review_available");
    assert.equal(candidate.semanticProposal.collision, undefined);
    assert.deepEqual(candidate.semanticProposal.conflictingCandidates, []);
    assert.equal(
      candidate.semanticProposal.duplicateReconciliation.fixedPathRecord.artifactId,
      canonicalArtifactId,
    );
    assert.equal(candidate.semanticProposal.duplicateReconciliation.proposedCanonicalRevision, 3);
    await service.repairOne(migrationIntent(candidate, "keep_fixed_record_and_delete_duplicate"));
    assert.equal(await exists(path.join(root, ...jsonPathFor(3).split("/"))), false);
    assert.equal(await exists(path.join(root, ...jsonPathFor(4).split("/"))), true);
    canonical = await readJson(root, canonicalJsonPath);
    assert.equal(canonical.revision, 3);
    assert.equal(canonical.payload.data.sibling, 2, "keep-fixed disposition preserves current canonical payload");

    service = repairService(root, project);
    preview = await service.preview();
    assert.equal(preview.candidates.some((item) => item.artifactId === artifactIdFor(3)), false);
    candidate = await firstCandidate(service, artifactIdFor(4));
    assert.equal(candidate.semanticProposal.collision, undefined);
    assert.deepEqual(candidate.semanticProposal.conflictingCandidates, []);
    assert.equal(candidate.semanticProposal.duplicateReconciliation.proposedCanonicalRevision, 4);
    await service.repairOne(migrationIntent(candidate));
    assert.equal(await exists(path.join(root, ...jsonPathFor(4).split("/"))), false);
    canonical = await readJson(root, canonicalJsonPath);
    assert.equal(canonical.revision, 4);
    assert.equal(canonical.payload.data.sibling, 4);

    service = repairService(root, project);
    preview = await service.preview();
    assert.equal(preview.candidates.some((item) => item.artifactId === canonicalArtifactId), false);
    assert.equal(preview.candidates.some((item) => item.artifactId === artifactIdFor(2)), false);
    assert.equal(preview.candidates.some((item) => item.artifactId === artifactIdFor(3)), false);
    assert.equal(preview.candidates.some((item) => item.artifactId === artifactIdFor(4)), false);
    const validationFiles = (await listFilesRecursively(root)).filter((file) =>
      file.includes("Validation_Reports/VALIDATION_REPORT_FIX_context_menu_copy_paste_context_menu_copy_paste"),
    );
    assert.deepEqual(validationFiles.sort(), [canonicalJsonPath, canonicalMarkdownPath].sort());
    const registry = (await readJson(root, registryJsonPath())).payload.data;
    assert.equal(registry.entries.filter((entry) => entry.artifactId === canonicalArtifactId).length, 1);
    assert.equal(validateArtifactRegistry(registry).valid, true);
  });
});

test("standalone numbered validation migration is individually actionable when fixed path is empty", async () => {
  await withSemanticFixture(async ({ root, project, artifact }) => {
    await fs.rm(path.join(root, ...canonicalJsonPath.split("/")), { force: true });
    await fs.rm(path.join(root, ...canonicalMarkdownPath.split("/")), { force: true });
    await writeRegistry(root, []);
    const candidate = await firstCandidate(repairService(root, project), artifact.artifactId);
    assert.equal(candidate.operationLabel, "Review semantic repair");
    assert.equal(candidate.repairStatus, "review_available");
    assert.equal(candidate.semanticProposal.duplicateReconciliation, undefined);
    assert.deepEqual(candidate.semanticProposal.allowedNumberedLegacyDispositions, [
      "migrate_to_canonical_fixed_path",
    ]);
    assert.equal(candidate.semanticProposal.collision, undefined);

    const result = await repairService(root, project).repairOne(migrationIntent(candidate));
    assert.deepEqual(result.repairedArtifactIds, [legacyArtifactId, canonicalArtifactId]);
    const repaired = await readJson(root, canonicalJsonPath);
    assert.equal(repaired.artifactId, canonicalArtifactId);
    assert.equal(repaired.revision, 2);
    assert.equal(repaired.createdAt, artifact.createdAt);
    assert.deepEqual(repaired.payload, artifact.payload);
    assert.equal(await exists(path.join(root, ...legacyJsonPath.split("/"))), false);
    assert.equal(await exists(path.join(root, ...legacyMarkdownPath.split("/"))), false);
    assert.equal(await exists(path.join(root, ...shortenedJsonPath.split("/"))), false);
  }, { registerFixed: false });
});

test("main process recomputes proposal and rejects tampered proposed identity", async () => {
  await withSemanticFixture(async ({ root, project, artifact }) => {
    const service = repairService(root, project);
    const candidate = await firstCandidate(service, artifact.artifactId);
    candidate.semanticProposal.proposedArtifactId =
      "champcity-ai/phase-02/operator_validation/VALIDATION_REPORT_FIX_context_menu_copy_paste_context_menu_copy_paste_2";

    await assert.rejects(
      () => service.repairOne(migrationIntent(candidate)),
      /proposal no longer matches/,
    );
    assert.equal(await exists(path.join(root, ...shortenedJsonPath.split("/"))), false);
  });
});

test("numbered disposition cannot bypass Registry conflicts", async () => {
  await withSemanticFixture(async ({ root, project, artifact }) => {
    const service = repairService(root, project);
    const candidate = await firstCandidate(service, artifact.artifactId);
    assert.ok(candidate.semanticProposal.collision);

    await assert.rejects(
      () => service.repairOne(migrationIntent(candidate)),
      /collision|duplicate|conflicting/i,
    );
  }, { registerCollision: true });
});

test("safe inbound sources, expectedOutputs, and parent references migrate atomically", async () => {
  await withSemanticFixture(async ({ root, project, artifact }) => {
    const service = repairService(root, project);
    const candidate = await firstCandidate(service, artifact.artifactId);
    assert.equal(candidate.semanticProposal.inboundReferences.length, 3);
    assert.deepEqual(
      candidate.semanticProposal.inboundReferences.map((reference) => reference.relationshipField).sort(),
      ["parentArtifactId", "relationships.expectedOutputs", "relationships.sources"],
    );

    await service.repairOne(migrationIntent(candidate));
    const source = await readJson(root, "planning/phases/phase-02/Support/source_ref.json");
    const expected = await readJson(root, "planning/phases/phase-02/Support/expected_ref.json");
    const parent = await readJson(root, "planning/phases/phase-02/Support/parent_ref.json");
    assert.equal(source.revision, 2);
    assert.equal(expected.revision, 2);
    assert.equal(parent.revision, 2);
    assert.deepEqual(source.relationships.sources, [canonicalArtifactId]);
    assert.deepEqual(expected.relationships.expectedOutputs, [canonicalArtifactId]);
    assert.equal(parent.parentArtifactId, canonicalArtifactId);

    const registry = (await readJson(root, registryJsonPath())).payload.data;
    for (const entry of registry.entries) {
      assert.equal(entry.relationships.sources.includes(legacyArtifactId), false);
      assert.equal(entry.relationships.expectedOutputs.includes(legacyArtifactId), false);
      assert.notEqual(entry.parentArtifactId, legacyArtifactId);
      assert.equal(entry.relationships.sources.includes(fixedLegacyArtifactId), false);
      assert.equal(entry.relationships.expectedOutputs.includes(fixedLegacyArtifactId), false);
      assert.notEqual(entry.parentArtifactId, fixedLegacyArtifactId);
    }
  }, { inboundReferences: true, registerLegacy: true });
});

test("unsafe inbound reference blocks Apply before mutation", async () => {
  await withSemanticFixture(async ({ root, project, artifact }) => {
    const service = repairService(root, project);
    const candidate = await firstCandidate(service, artifact.artifactId);
    assert.match(candidate.semanticProposal.unresolvedReferenceMigration, /unsafe_ref/);

    await assert.rejects(
      () => service.repairOne(migrationIntent(candidate)),
      /unresolved reference migration|not a canonical synchronized rewrite target/,
    );
    const fixed = await readJson(root, canonicalJsonPath);
    assert.equal(fixed.artifactId, fixedLegacyArtifactId);
  }, { unsafeInboundReference: true, registerLegacy: true });
});

test("semantic migration rolls back canonical target, Registry, and reference artifacts on write failure", async () => {
  await withSemanticFixture(async ({ root, project, artifact }) => {
    const pairService = new ArtifactPairService({
      projectRoot: root,
      clock: () => fixedTime,
      failureInjector: (point) => {
        if (point === "before_registry_update") throw new Error("injected semantic failure");
      },
    });
    const service = new GovernanceRepairService(project, pairService);
    const candidate = await firstCandidate(service, artifact.artifactId);
    await assert.rejects(
      () => service.repairOne(migrationIntent(candidate)),
      /Semantic governance repair failed/,
    );
    const fixed = await readJson(root, canonicalJsonPath);
    assert.equal(fixed.artifactId, fixedLegacyArtifactId);
    const source = await readJson(root, "planning/phases/phase-02/Support/source_ref.json");
    assert.equal(source.revision, 1);
    assert.deepEqual(source.relationships.sources, [legacyArtifactId]);
    const registry = (await readJson(root, registryJsonPath())).payload.data;
    assert.ok(registry.entries.some((entry) => entry.artifactId === legacyArtifactId));
    assert.equal(registry.entries.some((entry) => entry.artifactId === canonicalArtifactId), false);
    assert.equal(await exists(path.join(root, ...legacyJsonPath.split("/"))), true);
  }, { inboundReferences: true, registerLegacy: true });
});

test("duplicate cleanup rolls back when failure occurs before duplicate deletion", async () => {
  await withSemanticFixture(async ({ root, project, artifact }) => {
    const pairService = new ArtifactPairService({
      projectRoot: root,
      clock: () => fixedTime,
      failureInjector: (point) => {
        if (point === "before_duplicate_delete") throw new Error("injected before duplicate delete");
      },
    });
    const service = new GovernanceRepairService(project, pairService);
    const candidate = await firstCandidate(service, artifact.artifactId);
    await assert.rejects(
      () => service.repairOne(migrationIntent(candidate)),
      /Semantic governance repair failed/,
    );
    await assertDuplicateCleanupRollbackState(root);
  }, { registerLegacy: true });
});

test("duplicate cleanup rolls back after one duplicate file deletion", async () => {
  await withSemanticFixture(async ({ root, project, artifact }) => {
    const pairService = new ArtifactPairService({
      projectRoot: root,
      clock: () => fixedTime,
      failureInjector: (point) => {
        if (point === "after_duplicate_json_delete") throw new Error("injected duplicate delete failure");
      },
    });
    const service = new GovernanceRepairService(project, pairService);
    const candidate = await firstCandidate(service, artifact.artifactId);
    await assert.rejects(
      () => service.repairOne(migrationIntent(candidate)),
      /Semantic governance repair failed/,
    );
    await assertDuplicateCleanupRollbackState(root);
  }, { registerLegacy: true });
});

test("duplicate cleanup rolls back when failure occurs before durable finalization", async () => {
  await withSemanticFixture(async ({ root, project, artifact }) => {
    const pairService = new ArtifactPairService({
      projectRoot: root,
      clock: () => fixedTime,
      failureInjector: (point) => {
        if (point === "before_semantic_finalize") throw new Error("injected before finalization");
      },
    });
    const service = new GovernanceRepairService(project, pairService);
    const candidate = await firstCandidate(service, artifact.artifactId);
    await assert.rejects(
      () => service.repairOne(migrationIntent(candidate)),
      /Semantic governance repair failed/,
    );
    await assertDuplicateCleanupRollbackState(root);
  }, { registerLegacy: true });
});

test("duplicate backup cleanup failure after durable success returns a nonfatal warning", async () => {
  await withSemanticFixture(async ({ root, project, artifact }) => {
    const pairService = new ArtifactPairService({
      projectRoot: root,
      clock: () => fixedTime,
      failureInjector: (point) => {
        if (point === "before_duplicate_backup_cleanup") {
          throw new Error("injected backup cleanup failure");
        }
      },
    });
    const service = new GovernanceRepairService(project, pairService);
    const candidate = await firstCandidate(service, artifact.artifactId);
    const result = await pairService.repairSemanticArtifactIdentity({
      currentArtifactId: candidate.artifactId,
      currentJsonPath: candidate.jsonPath,
      currentMarkdownPath: candidate.markdownPath,
      expectedRevision: candidate.revision,
      proposal: candidate.semanticProposal,
      duplicateDisposition: "use_numbered_record_as_next_canonical_revision",
    });

    assert.equal(result.artifact.artifactId, canonicalArtifactId);
    assert.match(result.cleanupWarnings?.join("\n") ?? "", /backup cleanup/);
    const repaired = await readJson(root, canonicalJsonPath);
    assert.equal(repaired.artifactId, canonicalArtifactId);
    assert.equal(repaired.revision, 2);
    assert.equal(await exists(path.join(root, ...legacyJsonPath.split("/"))), false);
    assert.equal(await exists(path.join(root, ...legacyMarkdownPath.split("/"))), false);
    const registry = (await readJson(root, registryJsonPath())).payload.data;
    assert.ok(registry.entries.some((entry) => entry.artifactId === canonicalArtifactId));
    assert.equal(registry.entries.some((entry) => entry.artifactId === legacyArtifactId), false);
    const backupFiles = (await listFilesRecursively(root)).filter((file) =>
      file.includes(".delete-backup"),
    );
    assert.equal(backupFiles.length, 2, "failed best-effort cleanup preserves duplicate backups for inspection");
  }, { registerLegacy: true });
});

test("runtime maintenance action label follows the exact routed repair candidate as queue advances", async () => {
  await withSemanticFixture(async ({ root, artifact, fixedArtifact }) => {
    await makeRuntimeProject(root);
    const noncanonical = buildCanonicalArtifact({
      artifactId: `${projectId}/phase-02/diagnostic_report/NONCANONICAL_LABEL`,
      artifactType: "diagnostic_report",
      revision: 1,
      status: "active",
      projectId,
      phaseId,
      createdAt: fixedTime,
      updatedAt: fixedTime,
      jsonPath: "planning/phases/phase-02/Diagnostics/NONCANONICAL_LABEL.json",
      markdownPath: "planning/phases/phase-02/Diagnostics/NONCANONICAL_LABEL.md",
      relationships: { sources: [], expectedOutputs: [], supersedes: [], children: [] },
      payload: {
        kind: "diagnostic_report",
        title: "Noncanonical Label",
        contentMarkdown: "# Noncanonical Label\n",
        data: {},
      },
    });
    await writeArtifact(root, noncanonical);
    await fs.writeFile(
      path.join(root, ...noncanonical.jsonPath.split("/")),
      JSON.stringify(noncanonical),
      "utf8",
    );
    await writeRegistry(root, [artifact, fixedArtifact, noncanonical]);
    await initializeCanonicalRuntime({
      defaultRepositoryRoot: root,
      workspaceStoragePath: path.join(root, ".runtime", "workspaces.json"),
      allowRepositoryTmpProjects: true,
    });
    try {
      let snapshot = await getCurrentGovernanceMaintenance();
      assert.equal(snapshot.maintenanceActionLabel, "Duplicate Artifact Cleanup");
      assert.equal(snapshot.currentRequiredAction.currentAction.maintenanceActionLabel, "Duplicate Artifact Cleanup");
      const duplicate = snapshot.maintenance.repair.candidates.find(
        (item) => item.semanticProposal?.duplicateReconciliation,
      );
      assert.ok(duplicate);

      const result = await repairGovernanceRecord(migrationIntent(duplicate));
      assert.equal(result.ok, true, result.errorMessages?.join(" "));
      assert.equal(result.currentRequiredAction.currentAction.maintenanceActionLabel, "Canonicalize pair");
      assert.equal(result.currentRequiredAction.currentAction.routedAction.targetArtifactId, noncanonical.artifactId);

      snapshot = await getCurrentGovernanceMaintenance();
      assert.equal(snapshot.maintenanceActionLabel, "Canonicalize pair");
      assert.equal(snapshot.currentRequiredAction.currentAction.maintenanceActionLabel, "Canonicalize pair");
    } finally {
      await shutdownCanonicalRuntime().catch(() => undefined);
    }
  }, { registerLegacy: true });
});

test("runtime repair result propagates nonfatal duplicate backup cleanup warnings", async () => {
  await withSemanticFixture(async ({ root }) => {
    await makeRuntimeProject(root);
    await initializeCanonicalRuntime({
      defaultRepositoryRoot: root,
      workspaceStoragePath: path.join(root, ".runtime", "workspaces.json"),
      allowRepositoryTmpProjects: true,
    });
    try {
      const snapshot = await getCurrentGovernanceMaintenance();
      const duplicate = snapshot.maintenance.repair.candidates.find(
        (item) => item.semanticProposal?.duplicateReconciliation,
      );
      assert.ok(duplicate);
      canonicalWorkflowAuthority.artifactPairs.failureInjector = (point) => {
        if (point === "before_duplicate_backup_cleanup") {
          throw new Error("runtime injected backup cleanup failure");
        }
      };
      const result = await repairGovernanceRecord(migrationIntent(duplicate));
      assert.equal(result.ok, true, result.errorMessages?.join(" "));
      assert.match(result.cleanupWarnings?.join("\n") ?? "", /backup cleanup/);
      assert.equal(result.repairedArtifactIds.includes(canonicalArtifactId), true);
      assert.equal(await exists(path.join(root, ...legacyJsonPath.split("/"))), false);
      assert.equal(await exists(path.join(root, ...legacyMarkdownPath.split("/"))), false);
      const canonical = await readJson(root, canonicalJsonPath);
      assert.equal(canonical.artifactId, canonicalArtifactId);
      const registry = (await readJson(root, registryJsonPath())).payload.data;
      assert.ok(registry.entries.some((entry) => entry.artifactId === canonicalArtifactId));
      assert.equal(registry.entries.some((entry) => entry.artifactId === legacyArtifactId), false);
      const after = await getCurrentGovernanceMaintenance();
      assert.equal(after.maintenance.repair.candidates.length, 0);
      assert.equal(result.currentRequiredAction.currentAction.id, after.currentRequiredAction.currentAction.id);
      assert.equal(result.currentRequiredAction.currentAction.id, "route_review_request_required");
      assert.equal(result.currentRequiredAction.currentAction.maintenanceActionLabel, undefined);
    } finally {
      await shutdownCanonicalRuntime().catch(() => undefined);
    }
  }, { registerLegacy: true });
});

test("completed typed migration removes old pair from queue after restart, not by broad supersedes filtering", async () => {
  await withSemanticFixture(async ({ root, project, artifact }) => {
    let service = repairService(root, project);
    const candidate = await firstCandidate(service, artifact.artifactId);
    await service.repairOne(migrationIntent(candidate));

    service = repairService(root, project);
    const preview = await service.preview();
    assert.equal(preview.candidates.some((item) => item.artifactId === legacyArtifactId), false);
    assert.equal(preview.candidates.some((item) => item.artifactId === canonicalArtifactId), false);
    assert.equal(await exists(path.join(root, ...legacyJsonPath.split("/"))), false);
    const repaired = await readJson(root, canonicalJsonPath);
    assert.equal(repaired.artifactId, canonicalArtifactId);
    assert.equal(repaired.phaseId, phaseId);
  }, { registerLegacy: true });

  await withSemanticFixture(async ({ root, project }) => {
    const unrelated = buildCanonicalArtifact({
      artifactId: "champcity-ai/implementer_report/IMPLEMENTER_REPORT_OLD_2",
      artifactType: "implementer_report",
      revision: 1,
      status: "active",
      projectId,
      createdAt: fixedTime,
      updatedAt: fixedTime,
      jsonPath: "planning/phases/phase-02/Implementer_Reports/IMPLEMENTER_REPORT_OLD_2.json",
      markdownPath: "planning/phases/phase-02/Implementer_Reports/IMPLEMENTER_REPORT_OLD_2.md",
      relationships: { sources: [], expectedOutputs: [], supersedes: [], children: [] },
      payload: {
        kind: "implementer_report",
        title: "Old report",
        contentMarkdown: "# Old report\n",
        data: {},
      },
    });
    const superseding = buildCanonicalArtifact({
      artifactId: "champcity-ai/phase-02/implementer_report/WC99",
      artifactType: "implementer_report",
      revision: 1,
      status: "active",
      projectId,
      phaseId,
      workCardId: "WC99",
      createdAt: fixedTime,
      updatedAt: fixedTime,
      jsonPath: "planning/phases/phase-02/Implementer_Reports/IMPLEMENTER_REPORT_WC99.json",
      markdownPath: "planning/phases/phase-02/Implementer_Reports/IMPLEMENTER_REPORT_WC99.md",
      relationships: { sources: [], expectedOutputs: [], supersedes: [unrelated.artifactId], children: [] },
      payload: {
        kind: "implementer_report",
        title: "Superseding report",
        contentMarkdown: "# Superseding report\n",
        data: {},
      },
    });
    await writeArtifact(root, unrelated);
    await writeArtifact(root, superseding);
    await writeRegistry(root, [superseding]);

    const preview = await repairService(root, project).preview();
    assert.ok(
      preview.candidates.some((item) => item.artifactId === unrelated.artifactId),
      "broad supersedes relationships must not hide unrelated defective artifacts",
    );
  });
});

test("legitimate distinct operator validation ending in _2 is not classified as duplicate cleanup", async () => {
  await withSemanticFixture(async ({ root, project, artifact }) => {
    await fs.rm(path.join(root, ...canonicalJsonPath.split("/")), { force: true });
    await fs.rm(path.join(root, ...canonicalMarkdownPath.split("/")), { force: true });
    await writeRegistry(root, [artifact]);

    const preview = await repairService(root, project).preview();
    const candidate = preview.candidates.find((item) => item.artifactId === legacyArtifactId);
    assert.ok(candidate);
    assert.equal(candidate.semanticProposal?.duplicateReconciliation, undefined);
    assert.notEqual(candidate.operationLabel, "Duplicate Artifact Cleanup");
  }, { registerLegacy: true, registerFixed: false });
});

test("actual Operator Validation save operation reuses fixed path and increments revision", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "champcity-validation-save-"));
  const storagePath = path.join(root, ".runtime", "workspaces.json");
  try {
    await fs.mkdir(path.join(root, "planning"), { recursive: true });
    await fs.writeFile(path.join(root, "package.json"), JSON.stringify({ name: projectId }), "utf8");
    const pairService = new ArtifactPairService({ projectRoot: root, clock: () => fixedTime });
    await pairService.commitArtifact({
      artifactId: `${projectId}/${phaseId}/work_card/${workCardId}`,
      artifactType: "work_card",
      status: "active",
      projectId,
      phaseId,
      workCardId,
      relationships: { sources: [], expectedOutputs: [], supersedes: [], children: [] },
      payload: {
        title: "Context menu copy paste",
        contentMarkdown: "# Context menu copy paste\n\nOperator validation guidance.\n",
        data: {
          workCardId,
          phase: phaseId,
          status: "implementer_report_received",
          riskLevel: "low",
          acceptanceCriteria: ["Context menu copy/paste works."],
          validationPlan: ["Save validation twice."],
        },
      },
      location: {
        directoryPath: `planning/phases/${phaseId}/Work_Cards`,
        fileStem: "FIX_context_menu_copy_paste_context_menu_copy_paste",
      },
      expectedRevision: null,
    });

    await initializeCanonicalRuntime({
      defaultRepositoryRoot: root,
      workspaceStoragePath: storagePath,
      allowRepositoryTmpProjects: true,
    });

    const baseInput = {
      phase: phaseId,
      workCardFileName: "FIX_context_menu_copy_paste_context_menu_copy_paste.json",
      validationResult: "Pass",
      testedItems: "Initial validation.",
      passedItems: "Copy and paste worked.",
      failedItems: "None.",
      evidenceReferences: "Local observation.",
      screenshotOrFileReferences: "None.",
      commandsRun: "Not run.",
      observedErrors: "None.",
      additionalOperatorObservations: "First save.",
      recommendedNextAction: "Proceed.",
    };
    const first = await saveHumanValidationRecord(baseInput);
    assert.equal(first.ok, true, first.errorMessages?.join(" "));
    const firstRecord = await readJson(root, canonicalJsonPath);

    const second = await saveHumanValidationRecord({
      ...baseInput,
      validationResult: "Pass with concerns",
      testedItems: "Second validation with changed details.",
      additionalOperatorObservations: "Edited observations.",
    });
    assert.equal(second.ok, true, second.errorMessages?.join(" "));
    const secondRecord = await readJson(root, canonicalJsonPath);

    assert.equal(firstRecord.artifactId, canonicalArtifactId);
    assert.equal(secondRecord.artifactId, canonicalArtifactId);
    assert.equal(first.validationJsonPath, path.join(root, ...canonicalJsonPath.split("/")));
    assert.equal(second.validationJsonPath, path.join(root, ...canonicalJsonPath.split("/")));
    assert.equal(first.validationMarkdownPath, path.join(root, ...canonicalMarkdownPath.split("/")));
    assert.equal(second.validationMarkdownPath, path.join(root, ...canonicalMarkdownPath.split("/")));
    assert.equal(firstRecord.revision, 1);
    assert.equal(secondRecord.revision, 2);
    assert.equal(secondRecord.payload.data.validationResult, "Pass with concerns");
    const registry = (await readJson(root, registryJsonPath())).payload.data;
    const entry = registry.entries.find((item) => item.artifactId === canonicalArtifactId);
    assert.equal(entry.revision, 2);
    assert.equal(entry.jsonPath, canonicalJsonPath);
    const files = await fs.readdir(path.join(root, "planning", "phases", phaseId, "Validation_Reports"));
    assert.deepEqual(files.sort(), [
      "VALIDATION_REPORT_FIX_context_menu_copy_paste_context_menu_copy_paste.json",
      "VALIDATION_REPORT_FIX_context_menu_copy_paste_context_menu_copy_paste.md",
    ]);
    assert.equal(files.some((file) => /_2\.(?:json|md)$|_3\.(?:json|md)$/.test(file)), false);
  } finally {
    await shutdownCanonicalRuntime().catch(() => undefined);
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("canonical service Operator Validation writer reuses fixed path and increments revision", async () => {
  await withSemanticFixture(async ({ root }) => {
    const service = new ArtifactPairService({ projectRoot: root, clock: () => fixedTime });
    const location = {
      directoryPath: `planning/phases/${phaseId}/Validation_Reports`,
      fileStem: "VALIDATION_REPORT_FIX_context_menu_copy_paste_context_menu_copy_paste",
    };
    const first = await service.commitArtifact({
      artifactId: canonicalArtifactId,
      artifactType: "operator_validation",
      status: "active",
      projectId,
      phaseId,
      workCardId,
      relationships: { sources: [], expectedOutputs: [], supersedes: [], children: [] },
      payload: {
        title: `${workCardId} Validation Report`,
        contentMarkdown: "# Human Operator Validation\n\n## Validation Result\n\nPass\n",
        data: { validationScope: "work_card", validationResult: "Pass", observedErrors: "" },
      },
      location,
      expectedRevision: null,
    });
    const second = await service.commitArtifact({
      artifactId: canonicalArtifactId,
      artifactType: "operator_validation",
      status: "active",
      projectId,
      phaseId,
      workCardId,
      relationships: { sources: [], expectedOutputs: [], supersedes: [], children: [] },
      payload: {
        title: `${workCardId} Validation Report`,
        contentMarkdown: "# Human Operator Validation\n\n## Validation Result\n\nPass\n\n## Additional Operator Observations\n\nEdited details.\n",
        data: { validationScope: "work_card", validationResult: "Pass", observedErrors: "", additionalOperatorObservations: "Edited details." },
      },
      location,
      expectedRevision: 1,
    });

    assert.equal(first.artifact.artifactId, canonicalArtifactId);
    assert.equal(second.artifact.artifactId, canonicalArtifactId);
    assert.equal(second.artifact.revision, 2);
    assert.equal(first.artifact.jsonPath, canonicalJsonPath);
    assert.equal(second.artifact.jsonPath, canonicalJsonPath);
    assert.equal(await exists(path.join(root, ...legacyJsonPath.split("/"))), false);
    const registry = (await readJson(root, registryJsonPath())).payload.data;
    const entry = registry.entries.find((item) => item.artifactId === canonicalArtifactId);
    assert.equal(entry.revision, 2);
    assert.equal(entry.jsonPath, canonicalJsonPath);
  }, { registerFixed: false, skipDefaultArtifacts: true });
});

async function withSemanticFixture(callback, options = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "champcity-semantic-repair-"));
  try {
    const artifact = buildCanonicalArtifact({
      artifactId: legacyArtifactId,
      artifactType: "operator_validation",
      revision: 1,
      status: "active",
      projectId,
      workCardId,
      createdAt: fixedTime,
      updatedAt: fixedTime,
      jsonPath: legacyJsonPath,
      markdownPath: legacyMarkdownPath,
      relationships: { sources: [], expectedOutputs: [], supersedes: [], children: [] },
      payload: {
        kind: "operator_validation",
        title: "VALIDATION REPORT FIX context menu copy paste context menu copy paste 2",
        contentMarkdown: "# Human Operator Validation - FIX_context_menu_copy_paste Context menu copy paste\n\n## Validation Result\n\nPass\n",
        data: { validationScope: "work_card", validationResult: "Pass" },
      },
    });
    await writeValidationTarget(root);

    const fixedArtifact = buildCanonicalArtifact({
      artifactId: fixedLegacyArtifactId,
      artifactType: "operator_validation",
      revision: 1,
      status: "active",
      projectId,
      workCardId,
      createdAt: "2026-07-01T02:25:07.751Z",
      updatedAt: "2026-07-01T02:25:07.751Z",
      jsonPath: canonicalJsonPath,
      markdownPath: canonicalMarkdownPath,
      relationships: { sources: [], expectedOutputs: [], supersedes: [], children: [] },
      payload: {
        kind: "operator_validation",
        title: "VALIDATION REPORT FIX context menu copy paste context menu copy paste",
        contentMarkdown: "# Human Operator Validation - FIX_context_menu_copy_paste Context menu copy paste\n\n## Validation Result\n\nPass\n",
        data: { validationScope: "work_card", validationResult: "Pass", fixedPathFixture: true },
      },
    });
    if (!options.skipDefaultArtifacts) {
      await writeArtifact(root, artifact);
      await writeArtifact(root, fixedArtifact);
    }

    const registryArtifacts = [];
    if (!options.skipDefaultArtifacts && options.registerLegacy) registryArtifacts.push(artifact);
    if (!options.skipDefaultArtifacts && options.registerFixed !== false && !options.registerCollision) registryArtifacts.push(fixedArtifact);
    if (!options.skipDefaultArtifacts && options.registerCollision) {
      const collision = buildCanonicalArtifact({
        ...artifact,
        artifactId: canonicalArtifactId,
        phaseId,
        jsonPath: canonicalJsonPath,
        markdownPath: canonicalMarkdownPath,
      });
      registryArtifacts.push(collision);
    }
    if (!options.skipDefaultArtifacts && options.inboundReferences) {
      registryArtifacts.push(
        await supportArtifact(root, "source_ref", {
          relationships: { sources: [legacyArtifactId], expectedOutputs: [], supersedes: [], children: [] },
        }),
        await supportArtifact(root, "expected_ref", {
          relationships: { sources: [], expectedOutputs: [legacyArtifactId], supersedes: [], children: [] },
        }),
        await supportArtifact(root, "parent_ref", {
          parentArtifactId: legacyArtifactId,
          relationships: { sources: [], expectedOutputs: [], supersedes: [], children: [] },
        }),
      );
    }
    if (!options.skipDefaultArtifacts && options.unsafeInboundReference) {
      const unsafe = await supportArtifact(root, "unsafe_ref", {
        relationships: { sources: [legacyArtifactId], expectedOutputs: [], supersedes: [], children: [] },
      });
      registryArtifacts.push({ artifact: unsafe, synchronized: false });
    }
    if (registryArtifacts.length > 0) await writeRegistry(root, registryArtifacts);

    const project = {
      projectId,
      displayName: "semantic fixture",
      repositoryRoot: root,
      planningRoot: path.join(root, "planning"),
      branchBehavior: { mode: "observe-current" },
      enabled: true,
      createdAt: fixedTime,
      updatedAt: fixedTime,
      lastOpenedAt: null,
      lastScanAt: null,
      lastScanResult: null,
      observerStatus: "stopped",
    };
    await callback({ root, project, artifact, fixedArtifact });
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

async function withMultiSiblingDuplicateFixture(callback) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "champcity-semantic-multi-sibling-"));
  const artifactIdFor = (index) =>
    `champcity-ai/operator_validation/VALIDATION_REPORT_FIX_context_menu_copy_paste_context_menu_copy_paste_${index}`;
  const jsonPathFor = (index) =>
    `planning/phases/${phaseId}/Validation_Reports/VALIDATION_REPORT_FIX_context_menu_copy_paste_context_menu_copy_paste_${index}.json`;
  const markdownPathFor = (index) => jsonPathFor(index).replace(/\.json$/, ".md");
  try {
    await writeValidationTarget(root);
    const fixedArtifact = buildCanonicalArtifact({
      artifactId: fixedLegacyArtifactId,
      artifactType: "operator_validation",
      revision: 1,
      status: "active",
      projectId,
      workCardId,
      createdAt: "2026-07-01T02:25:07.751Z",
      updatedAt: "2026-07-01T02:25:07.751Z",
      jsonPath: canonicalJsonPath,
      markdownPath: canonicalMarkdownPath,
      relationships: { sources: [], expectedOutputs: [], supersedes: [], children: [] },
      payload: {
        kind: "operator_validation",
        title: "VALIDATION REPORT FIX context menu copy paste context menu copy paste",
        contentMarkdown: "# Human Operator Validation - FIX_context_menu_copy_paste Context menu copy paste\n\n## Validation Result\n\nPass\n",
        data: { validationScope: "work_card", validationResult: "Pass", sibling: "fixed" },
      },
    });
    await writeArtifact(root, fixedArtifact);
    const siblings = [];
    for (const index of [2, 3, 4]) {
      const sibling = buildCanonicalArtifact({
        artifactId: artifactIdFor(index),
        artifactType: "operator_validation",
        revision: 1,
        status: "active",
        projectId,
        workCardId,
        createdAt: fixedTime,
        updatedAt: fixedTime,
        jsonPath: jsonPathFor(index),
        markdownPath: markdownPathFor(index),
        relationships: { sources: [], expectedOutputs: [], supersedes: [], children: [] },
        payload: {
          kind: "operator_validation",
          title: `VALIDATION REPORT FIX context menu copy paste context menu copy paste ${index}`,
          contentMarkdown: `# Human Operator Validation - FIX_context_menu_copy_paste Context menu copy paste\n\n## Validation Result\n\nPass ${index}\n`,
          data: { validationScope: "work_card", validationResult: `Pass ${index}`, sibling: index },
        },
      });
      siblings.push(sibling);
      await writeArtifact(root, sibling);
    }
    await writeRegistry(root, [fixedArtifact]);

    const project = {
      projectId,
      displayName: "multi-sibling semantic fixture",
      repositoryRoot: root,
      planningRoot: path.join(root, "planning"),
      branchBehavior: { mode: "observe-current" },
      enabled: true,
      createdAt: fixedTime,
      updatedAt: fixedTime,
      lastOpenedAt: null,
      lastScanAt: null,
      lastScanResult: null,
      observerStatus: "stopped",
    };
    await callback({ root, project, fixedArtifact, siblings, artifactIdFor, jsonPathFor, markdownPathFor });
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

async function withRegisteredSamePathFixture(callback, options = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "champcity-semantic-same-path-"));
  try {
    const artifact = buildCanonicalArtifact({
      artifactId: samePathLegacyArtifactId,
      artifactType: "operator_validation",
      revision: 1,
      status: "active",
      projectId,
      workCardId: samePathWorkCardId,
      createdAt: "2026-07-10T09:30:00.000Z",
      updatedAt: "2026-07-10T09:30:00.000Z",
      jsonPath: samePathJsonPath,
      markdownPath: samePathMarkdownPath,
      relationships: { sources: [], expectedOutputs: [], supersedes: [], children: [] },
      payload: {
        kind: "operator_validation",
        title: "VALIDATION REPORT WC03 REPAIR header layout regression repair header layout regression",
        contentMarkdown:
          "# Human Operator Validation - WC03_REPAIR_header_layout_regression Repair header layout regression\n\n## Validation Result\n\nPass\n\n## Evidence References Or Paths\n\nHeader screenshot and runtime notes.\n",
        data: {
          validationScope: "work_card",
          validationResult: "Pass",
          testedItems: "Header layout regression was retested.",
          status: "validation_passed",
        },
      },
    });
    await writeSamePathValidationTarget(root);
    await writeArtifact(root, artifact);

    const registryArtifacts = [options.staleCurrentRegistry ? buildCanonicalArtifact({ ...artifact, revision: 99 }) : artifact];
    if (options.inboundReferences) {
      registryArtifacts.push(
        await supportArtifact(root, "source_ref", {
          relationships: { sources: [samePathLegacyArtifactId], expectedOutputs: [], supersedes: [], children: [] },
        }),
        await supportArtifact(root, "expected_ref", {
          relationships: { sources: [], expectedOutputs: [samePathLegacyArtifactId], supersedes: [], children: [] },
        }),
        await supportArtifact(root, "parent_ref", {
          parentArtifactId: samePathLegacyArtifactId,
          relationships: { sources: [], expectedOutputs: [], supersedes: [], children: [] },
        }),
      );
    }
    await writeRegistry(root, registryArtifacts);

    const project = {
      projectId,
      displayName: "same-path semantic fixture",
      repositoryRoot: root,
      planningRoot: path.join(root, "planning"),
      branchBehavior: { mode: "observe-current" },
      enabled: true,
      createdAt: fixedTime,
      updatedAt: fixedTime,
      lastOpenedAt: null,
      lastScanAt: null,
      lastScanResult: null,
      observerStatus: "stopped",
    };
    await callback({ root, project, artifact });
  } finally {
    await shutdownCanonicalRuntime().catch(() => undefined);
    await fs.rm(root, { recursive: true, force: true });
  }
}

function repairService(root, project) {
  return new GovernanceRepairService(
    project,
    new ArtifactPairService({ projectRoot: root, clock: () => fixedTime }),
  );
}

async function firstCandidate(service, artifactId) {
  const preview = await service.preview();
  const candidate = preview.candidates.find((item) => item.artifactId === artifactId);
  assert.ok(candidate, `expected candidate ${artifactId}`);
  assert.ok(candidate.semanticProposal, "semantic proposal is required");
  return candidate;
}

function migrationIntent(candidate, duplicateDisposition = "use_numbered_record_as_next_canonical_revision") {
  return {
    artifactId: candidate.artifactId,
    jsonPath: candidate.jsonPath,
    markdownPath: candidate.markdownPath,
    repairKind: candidate.repairKind,
    expectedRevision: candidate.revision,
    numberedLegacyDisposition: "migrate_to_canonical_fixed_path",
    duplicateDisposition,
    semanticProposal: candidate.semanticProposal,
  };
}

async function assertDuplicateCleanupRollbackState(root) {
  const fixed = await readJson(root, canonicalJsonPath);
  assert.equal(fixed.artifactId, fixedLegacyArtifactId);
  assert.equal(await exists(path.join(root, ...legacyJsonPath.split("/"))), true);
  assert.equal(await exists(path.join(root, ...legacyMarkdownPath.split("/"))), true);
  const registry = (await readJson(root, registryJsonPath())).payload.data;
  assert.ok(registry.entries.some((entry) => entry.artifactId === legacyArtifactId));
  assert.equal(registry.entries.some((entry) => entry.artifactId === canonicalArtifactId), false);
}

async function makeRuntimeProject(root) {
  await fs.mkdir(path.join(root, "planning"), { recursive: true });
  await fs.writeFile(path.join(root, "package.json"), JSON.stringify({ name: projectId }), "utf8");
}

async function writeValidationTarget(root) {
  const repoPath =
    "planning/phases/phase-02/Validation_Targets/VALIDATION_TARGET_FIX_context_menu_copy_paste.json";
  const absolute = path.join(root, ...repoPath.split("/"));
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(
    absolute,
    `${JSON.stringify(
      {
        id: workCardId,
        kind: "fix",
        phase: phaseId,
        title: "Context menu copy paste",
        status: "builder_report_received",
        risk: "low",
        sourceJsonFile: "VALIDATION_TARGET_FIX_context_menu_copy_paste.json",
        expectedImplementerReportFile: "BUILDER_REPORT_FIX_context_menu_copy_paste.md",
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

async function writeSamePathValidationTarget(root) {
  const repoPath =
    "planning/phases/phase-02/Validation_Targets/VALIDATION_TARGET_WC03_REPAIR_header_layout_regression.json";
  const absolute = path.join(root, ...repoPath.split("/"));
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(
    absolute,
    `${JSON.stringify(
      {
        id: samePathWorkCardId,
        kind: "repair",
        phase: phaseId,
        title: "Repair header layout regression",
        status: "builder_report_received",
        risk: "medium",
        sourceJsonFile: "VALIDATION_TARGET_WC03_REPAIR_header_layout_regression.json",
        expectedImplementerReportFile: "IMPLEMENTER_REPORT_WC03_REPAIR_header_layout_regression.md",
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

async function supportArtifact(root, stem, overrides = {}) {
  const artifact = buildCanonicalArtifact({
    artifactId: `champcity-ai/phase-02/support/${stem}`,
    artifactType: "support",
    revision: 1,
    status: "active",
    projectId,
    phaseId,
    createdAt: fixedTime,
    updatedAt: fixedTime,
    jsonPath: `planning/phases/phase-02/Support/${stem}.json`,
    markdownPath: `planning/phases/phase-02/Support/${stem}.md`,
    relationships: overrides.relationships ?? { sources: [], expectedOutputs: [], supersedes: [], children: [] },
    ...(overrides.parentArtifactId ? { parentArtifactId: overrides.parentArtifactId } : {}),
    payload: {
      kind: "support",
      title: stem,
      contentMarkdown: `# ${stem}\n`,
      data: {},
    },
  });
  await writeArtifact(root, artifact);
  return artifact;
}

async function writeArtifact(root, artifact) {
  const jsonPath = path.join(root, ...artifact.jsonPath.split("/"));
  const markdownPath = path.join(root, ...artifact.markdownPath.split("/"));
  await fs.mkdir(path.dirname(jsonPath), { recursive: true });
  await fs.mkdir(path.dirname(markdownPath), { recursive: true });
  await fs.writeFile(jsonPath, `${canonicalPrettyStringify(artifact)}\n`, "utf8");
  await fs.writeFile(markdownPath, renderArtifactMarkdown(artifact), "utf8");
}

async function writeRegistry(root, artifactsOrEntries) {
  const entries = artifactsOrEntries.map((item) => {
    if (item.artifact) return buildArtifactRegistryEntry(item.artifact, undefined, item.synchronized);
    return buildArtifactRegistryEntry(item);
  });
  const registry = buildArtifactRegistry({ updatedAt: fixedTime, entries });
  const registryArtifact = buildCanonicalArtifact({
    artifactId: "champcity-ai/system/artifact_registry",
    artifactType: "artifact_registry",
    revision: 1,
    status: "active",
    projectId,
    createdAt: fixedTime,
    updatedAt: fixedTime,
    jsonPath: registryJsonPath(),
    markdownPath: "planning/system/Artifact_Registry/ARTIFACT_REGISTRY.md",
    relationships: { sources: registry.entries.map((entry) => entry.artifactId), expectedOutputs: [], supersedes: [], children: [] },
    payload: {
      kind: "artifact_registry",
      title: "Canonical Artifact Registry",
      contentMarkdown: renderArtifactRegistryContentMarkdown(registry),
      data: registry,
    },
  });
  await writeArtifact(root, registryArtifact);
}

function registryJsonPath() {
  return "planning/system/Artifact_Registry/ARTIFACT_REGISTRY.json";
}

async function readJson(root, repoPath) {
  return JSON.parse(await fs.readFile(path.join(root, ...repoPath.split("/")), "utf8"));
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function listFilesRecursively(root, directory = root) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFilesRecursively(root, absolute));
    } else {
      files.push(path.relative(root, absolute).replace(/\\/g, "/"));
    }
  }
  return files;
}
