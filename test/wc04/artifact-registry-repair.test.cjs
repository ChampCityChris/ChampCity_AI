const assert = require("node:assert/strict");
const { mkdtemp, mkdir, readFile, rm, unlink, writeFile } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const test = require("node:test");

const {
  buildArtifactRegistryEntry,
  buildMarkdownArtifactEnvelope,
  buildCanonicalArtifact,
  canonicalStringify,
  canonicalPrettyStringify,
  renderArtifactMarkdown,
  validateArtifactRegistry,
} = require("../../dist/shared/artifacts");
const {
  ARTIFACT_REGISTRY_JSON_PATH,
  ARTIFACT_REGISTRY_MARKDOWN_PATH,
  ArtifactPairService,
  GovernanceRepairService,
} = require("../../dist/main/artifacts");

const TIMESTAMP = "2026-07-18T19:20:00.000Z";
const BACKUP_DIR = ".wc04-test-backup";

async function loadRepairModule() {
  return import(pathToFileURL(path.resolve("scripts/wc04-artifact-registry-repair.mjs")).href);
}

async function withTemporaryRoot(run) {
  const root = await mkdtemp(path.join(os.tmpdir(), "champcity-wc04-registry-"));
  try {
    return await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function writeArtifactPair(root, artifact) {
  const jsonPath = path.join(root, ...artifact.jsonPath.split("/"));
  const markdownPath = path.join(root, ...artifact.markdownPath.split("/"));
  await mkdir(path.dirname(jsonPath), { recursive: true });
  await mkdir(path.dirname(markdownPath), { recursive: true });
  await writeFile(jsonPath, `${canonicalPrettyStringify(artifact)}\n`, "utf8");
  await writeFile(markdownPath, renderArtifactMarkdown(artifact), "utf8");
}

function artifact(overrides = {}) {
  return buildCanonicalArtifact({
    artifactId: "champcity-ai/phase-06/work_card/SEED",
    artifactType: "work_card",
    revision: 1,
    status: "active",
    projectId: "champcity-ai",
    phaseId: "phase-06",
    workCardId: "SEED",
    createdAt: "2026-07-18T18:00:00.000Z",
    updatedAt: "2026-07-18T18:00:00.000Z",
    markdownPath: "planning/phases/phase-06/Work_Cards/SEED.md",
    jsonPath: "planning/phases/phase-06/Work_Cards/SEED.json",
    relationships: {
      sources: [],
      expectedOutputs: [],
      supersedes: [],
      children: [],
    },
    payload: {
      kind: "work_card",
      title: "Seed",
      contentMarkdown: "# Seed\n",
      data: { workCardId: "SEED" },
    },
    ...overrides,
  });
}

function registryArtifact(entries, overrides = {}) {
  const legacyData = {
    registryVersion: "phase-04-fix01-artifact-hash-synchronization",
    updatedAt: "2026-07-18T18:00:00.000Z",
    entries,
    synchronizationFailures: [],
  };
  return buildCanonicalArtifact({
    artifactId: "champcity-ai/system/artifact_registry",
    artifactType: "artifact_registry",
    revision: 1,
    status: "active",
    projectId: "champcity-ai",
    createdAt: "2026-07-18T18:00:00.000Z",
    updatedAt: "2026-07-18T18:00:00.000Z",
    markdownPath: ARTIFACT_REGISTRY_MARKDOWN_PATH,
    jsonPath: ARTIFACT_REGISTRY_JSON_PATH,
    relationships: {
      sources: [...new Set(entries.map((entry) => entry.artifactId))],
      expectedOutputs: [],
      supersedes: [],
      children: [],
    },
    payload: {
      kind: "artifact_registry",
      title: "Canonical Artifact Registry",
      contentMarkdown: "# Canonical Artifact Registry\n\nEntries: 1\n",
      data: legacyData,
    },
    ...overrides,
  });
}

async function seedLegacyRepository(root, options = {}) {
  const seed = artifact();
  await writeArtifactPair(root, seed);
  const seedEntry = buildArtifactRegistryEntry(seed);
  const entries = options.duplicateEntry ? [seedEntry, { ...seedEntry }] : [seedEntry];
  await writeArtifactPair(root, registryArtifact(entries));
  await writeCandidatePairs(root, options);
  if (options.missingSeedMarkdown) {
    await unlink(path.join(root, ...seed.markdownPath.split("/")));
  }
}

async function writeCandidatePairs(root, options = {}) {
  const candidates = [
    {
      artifactId: "champcity-ai/phase-06/work_card/WC04",
      artifactType: "work_card",
      revision: options.badCandidateRevision ? 2 : 3,
      pathStem:
        "planning/phases/phase-06/Work_Cards/WC04_artifact_registry_schema_repair_and_recovery_candidate_registration",
      parentArtifactId: "champcity-ai/phase-06/work_card_plan/Work_Card_Plan",
      title: "Work Card: Phase 06 WC04",
    },
    {
      artifactId: "champcity-ai/phase-06/operator_approval/WC04",
      artifactType: "operator_approval",
      revision: 3,
      pathStem:
        "planning/phases/phase-06/Operator_Approvals/OPERATOR_APPROVAL_WC04_artifact_registry_schema_repair_and_recovery_candidate_registration",
      parentArtifactId: "champcity-ai/phase-06/work_card/WC04",
      title: "Operator Approval - Phase 06 WC04",
    },
    {
      artifactId: "champcity-ai/phase-06/architect_review/WC04",
      artifactType: "architect_review",
      revision: 1,
      pathStem:
        "planning/phases/phase-06/Architect_Reviews/ARCHITECT_REVIEW_WC04_artifact_registry_schema_repair_and_recovery_candidate_registration",
      parentArtifactId: "champcity-ai/phase-06/implementer_report/WC04",
      title: "Architect Review - Phase 06 WC04",
    },
    {
      artifactId: "champcity-ai/phase-06/work_card/WC05",
      artifactType: "work_card",
      revision: 3,
      pathStem:
        "planning/phases/phase-06/Work_Cards/WC05_execution_pass_independent_verification_foundation_recovery",
      parentArtifactId: "champcity-ai/phase-06/work_card_plan/Work_Card_Plan",
      title: "Work Card: Phase 06 WC05",
    },
    {
      artifactId: "champcity-ai/phase-06/operator_approval/WC05",
      artifactType: "operator_approval",
      revision: 3,
      pathStem:
        "planning/phases/phase-06/Operator_Approvals/OPERATOR_APPROVAL_WC05_execution_pass_independent_verification_foundation_recovery",
      parentArtifactId: "champcity-ai/phase-06/work_card/WC05",
      title: "Operator Approval - Phase 06 WC05",
    },
  ];
  for (const candidate of candidates) {
    await writeArtifactPair(
      root,
      artifact({
        artifactId: candidate.artifactId,
        artifactType: candidate.artifactType,
        revision: candidate.revision,
        workCardId: candidate.artifactId.endsWith("/WC05") ? "WC05" : "WC04",
        parentArtifactId: candidate.parentArtifactId,
        markdownPath: `${candidate.pathStem}.md`,
        jsonPath: `${candidate.pathStem}.json`,
        payload: {
          kind: candidate.artifactType,
          title: candidate.title,
          contentMarkdown: `# ${candidate.title}\n`,
          data: { workCardId: candidate.artifactId.endsWith("/WC05") ? "WC05" : "WC04" },
        },
      }),
    );
  }
}

test("WC04 registry migration converts legacy registry data, registers verified candidates, and is idempotent", async () => {
  const repair = await loadRepairModule();
  await withTemporaryRoot(async (root) => {
    await seedLegacyRepository(root);

    const before = await repair.inventoryRegistry(root);
    assert.equal(before.entryCount, 1);
    assert.equal(before.registryValidation.valid, false);
    assert.equal(before.registryValidation.issueCodes.includes("unsupported_registry_version"), true);
    assert.equal(before.registryValidation.issueCodes.includes("unexpected_field"), true);
    assert.equal(before.hasSynchronizationFailures, true);

    const applied = await repair.applyRegistryMigration(root, {
      timestamp: TIMESTAMP,
      backupDir: BACKUP_DIR,
    });
    assert.equal(applied.changed, true);
    assert.equal(applied.before.entryCount, 1);
    assert.equal(applied.after.entryCount, 6);
    assert.equal(applied.after.registryValidation.valid, true);
    assert.equal(applied.after.registryVersion, 1);
    assert.equal(applied.after.hasSynchronizationFailures, false);
    assert.equal(applied.loadRegistrySucceeded, true);
    assert.deepEqual(applied.registeredCandidates.sort(), [
      "champcity-ai/phase-06/architect_review/WC04",
      "champcity-ai/phase-06/operator_approval/WC04",
      "champcity-ai/phase-06/operator_approval/WC05",
      "champcity-ai/phase-06/work_card/WC04",
      "champcity-ai/phase-06/work_card/WC05",
    ]);
    assert.equal(applied.preservedFieldComparison.preserved, true);

    const service = new ArtifactPairService({ projectRoot: root });
    const registry = await service.loadRegistry();
    assert.equal(validateArtifactRegistry(registry).valid, true);
    assert.equal(registry.entries.length, 6);

    const second = await repair.applyRegistryMigration(root, {
      timestamp: TIMESTAMP,
      backupDir: BACKUP_DIR,
    });
    assert.equal(second.changed, false);
    assert.equal(second.after.entryCount, 6);
  });
});

test("WC04 rollback restores the exact prior registry pair", async () => {
  const repair = await loadRepairModule();
  await withTemporaryRoot(async (root) => {
    await seedLegacyRepository(root);
    const before = await repair.inventoryRegistry(root);
    await repair.applyRegistryMigration(root, { timestamp: TIMESTAMP, backupDir: BACKUP_DIR });

    const rolledBack = await repair.rollbackRegistryMigration(root, BACKUP_DIR);
    assert.equal(rolledBack.after.registryJsonHash, before.registryJsonHash);
    assert.equal(rolledBack.after.registryMarkdownHash, before.registryMarkdownHash);
    assert.equal(rolledBack.after.registryValidation.valid, false);

    const reapplied = await repair.applyRegistryMigration(root, {
      timestamp: TIMESTAMP,
      backupDir: BACKUP_DIR,
    });
    assert.equal(reapplied.after.registryValidation.valid, true);
  });
});

test("WC04 migration blocks duplicate, missing, and unverified registry references deterministically", async () => {
  const repair = await loadRepairModule();
  await withTemporaryRoot(async (root) => {
    await seedLegacyRepository(root, { duplicateEntry: true });
    const inventory = await repair.inventoryRegistry(root);
    assert.match(inventory.blockers.join("\n"), /duplicate artifact IDs/);
    await assert.rejects(
      repair.applyRegistryMigration(root, { timestamp: TIMESTAMP, backupDir: BACKUP_DIR }),
      /duplicate artifact IDs/,
    );
  });

  await withTemporaryRoot(async (root) => {
    await seedLegacyRepository(root, { missingSeedMarkdown: true });
    const inventory = await repair.inventoryRegistry(root);
    assert.match(inventory.blockers.join("\n"), /missing_pair|unsynchronized_pair/);
    await assert.rejects(
      repair.applyRegistryMigration(root, { timestamp: TIMESTAMP, backupDir: BACKUP_DIR }),
      /missing_pair|unsynchronized_pair/,
    );
  });

  await withTemporaryRoot(async (root) => {
    await seedLegacyRepository(root, { badCandidateRevision: true });
    const inventory = await repair.inventoryRegistry(root);
    assert.match(inventory.blockers.join("\n"), /candidate_identity_mismatch/);
    await assert.rejects(
      repair.applyRegistryMigration(root, { timestamp: TIMESTAMP, backupDir: BACKUP_DIR }),
      /candidate_identity_mismatch/,
    );
  });
});

test("WC04 repair does not add a runtime compatibility reader", async () => {
  const runtimeFiles = [
    "src/main/artifacts/artifactPairService.ts",
    "src/shared/artifacts/artifactRegistry.ts",
  ];
  for (const file of runtimeFiles) {
    const content = await readFile(path.resolve(file), "utf8");
    assert.equal(/registryVersion\s*===\s*["']/.test(content), false);
    assert.equal(/phase-04-fix01-artifact-hash-synchronization/.test(content), false);
  }
});

test("governance repair canonicalizes a noncanonical envelope, registers it, and is idempotent", async () => {
  await withTemporaryRoot(async (root) => {
    const service = new ArtifactPairService({
      projectRoot: root,
      clock: () => TIMESTAMP,
    });
    await service.commitArtifact({
      artifactId: "champcity-ai/phase-07/work_card/SEED",
      artifactType: "work_card",
      status: "active",
      projectId: "champcity-ai",
      phaseId: "phase-07",
      workCardId: "SEED",
      relationships: {},
      payload: {
        title: "Seed",
        contentMarkdown: "# Seed\n",
        data: { workCardId: "SEED" },
      },
      location: {
        directoryPath: "planning/phases/phase-07/Work_Cards",
        fileStem: "SEED",
      },
      expectedRevision: null,
    });
    const activation = artifact({
      artifactId: "champcity-ai/phase-07/phase_activation/Phase_Activation",
      artifactType: "phase_activation",
      revision: 1,
      phaseId: "phase-07",
      workCardId: undefined,
      markdownPath: "planning/phases/phase-07/Phase_Activation.md",
      jsonPath: "planning/phases/phase-07/Phase_Activation.json",
      payload: {
        kind: "phase_activation",
        title: "Phase 07 Activation",
        contentMarkdown: "# Phase 07 Activation\n",
        data: { phaseId: "phase-07", status: "active" },
      },
    });
    const jsonPath = path.join(root, ...activation.jsonPath.split("/"));
    const markdownPath = path.join(root, ...activation.markdownPath.split("/"));
    await mkdir(path.dirname(jsonPath), { recursive: true });
    await writeFile(jsonPath, `${canonicalPrettyStringify(activation)}\n`, "utf8");
    await writeFile(
      markdownPath,
      `<!-- champcity-artifact-envelope\n${canonicalStringify(buildMarkdownArtifactEnvelope(activation))}\n-->\n\n${activation.payload.contentMarkdown}`,
      "utf8",
    );

    const repair = new GovernanceRepairService(testProject(root), service);
    const preview = await repair.preview();
    assert.equal(preview.repairableCount, 1);
    assert.equal(preview.payloadContentSummary, "Payload content unchanged.");
    assert.equal(preview.candidates[0].repairKind, "canonical_serialization_repair");
    assert.equal(preview.candidates[0].payloadContentWouldChange, false);

    const applied = await repair.repairAll();
    assert.deepEqual(applied.repairedArtifactIds, [activation.artifactId]);
    const reread = await service.readArtifactByPaths(activation.jsonPath, activation.markdownPath);
    assert.equal(reread.artifact.artifactId, activation.artifactId);
    assert.equal(reread.markdownContent, renderArtifactMarkdown(activation));
    const registry = await service.loadRegistry();
    assert.equal(registry.entries.some((entry) => entry.artifactId === activation.artifactId), true);

    const second = await repair.repairAll();
    assert.deepEqual(second.repairedArtifactIds, []);
    assert.equal(second.preview.candidates.length, 0);
  });
});

test("governance repair registers a canonical pair missing from the registry", async () => {
  await withTemporaryRoot(async (root) => {
    const service = new ArtifactPairService({
      projectRoot: root,
      clock: () => TIMESTAMP,
    });
    await service.commitArtifact({
      artifactId: "champcity-ai/phase-07/work_card/SEED",
      artifactType: "work_card",
      status: "active",
      projectId: "champcity-ai",
      phaseId: "phase-07",
      workCardId: "SEED",
      relationships: {},
      payload: {
        title: "Seed",
        contentMarkdown: "# Seed\n",
        data: { workCardId: "SEED" },
      },
      location: {
        directoryPath: "planning/phases/phase-07/Work_Cards",
        fileStem: "SEED",
      },
      expectedRevision: null,
    });
    await service.commitArtifact({
      artifactId: "champcity-ai/phase-07/phase_activation/phase-07",
      artifactType: "phase_activation",
      status: "active",
      projectId: "champcity-ai",
      phaseId: "phase-07",
      relationships: {},
      payload: {
        title: "Phase 07 Activation",
        contentMarkdown: "# Phase 07 Activation\n",
        data: { phaseId: "phase-07", phaseSequence: 7 },
      },
      location: {
        directoryPath: "planning/phases/phase-07",
        fileStem: "Phase_Activation",
      },
      expectedRevision: null,
    });
    const plan = artifact({
      artifactId: "champcity-ai/phase-07/work_card_plan/Work_Card_Plan",
      artifactType: "work_card_plan",
      revision: 1,
      phaseId: "phase-07",
      workCardId: undefined,
      markdownPath: "planning/phases/phase-07/Work_Card_Plan.md",
      jsonPath: "planning/phases/phase-07/Work_Card_Plan.json",
      payload: {
        kind: "work_card_plan",
        title: "Phase 07 Work Card Plan",
        contentMarkdown: "# Phase 07 Work Card Plan\n",
        data: { phaseId: "phase-07", status: "approved" },
      },
    });
    await writeArtifactPair(root, plan);

    const repair = new GovernanceRepairService(testProject(root), service);
    const preview = await repair.preview();
    assert.equal(preview.repairableCount, 1);
    assert.equal(preview.candidates[0].repairKind, "missing_registry_registration");

    const applied = await repair.repairAll();
    assert.deepEqual(applied.repairedArtifactIds, [plan.artifactId]);
    const registry = await service.loadRegistry();
    assert.equal(registry.entries.some((entry) => entry.artifactId === plan.artifactId), true);
  });
});

test("governance repair surfaces missing registrations from historical phases", async () => {
  await withTemporaryRoot(async (root) => {
    const service = new ArtifactPairService({
      projectRoot: root,
      clock: () => TIMESTAMP,
    });
    await service.commitArtifact({
      artifactId: "champcity-ai/phase-07/work_card/SEED",
      artifactType: "work_card",
      status: "active",
      projectId: "champcity-ai",
      phaseId: "phase-07",
      workCardId: "SEED",
      relationships: {},
      payload: {
        title: "Seed",
        contentMarkdown: "# Seed\n",
        data: { workCardId: "SEED" },
      },
      location: {
        directoryPath: "planning/phases/phase-07/Work_Cards",
        fileStem: "SEED",
      },
      expectedRevision: null,
    });
    const historical = artifact({
      artifactId: "champcity-ai/phase-01/work_card/WC01",
      artifactType: "work_card",
      revision: 1,
      status: "historical",
      phaseId: "phase-01",
      workCardId: "WC01",
      markdownPath: "planning/phases/phase-01/Work_Cards/WC01_historical.md",
      jsonPath: "planning/phases/phase-01/Work_Cards/WC01_historical.json",
      payload: {
        kind: "work_card",
        title: "Historical WC01",
        contentMarkdown: "# Historical WC01\n",
        data: { workCardId: "WC01" },
      },
    });
    await writeArtifactPair(root, historical);

    const repair = new GovernanceRepairService(testProject(root), service);
    const preview = await repair.preview();
    const candidate = preview.candidates.find(
      (item) => item.artifactId === historical.artifactId,
    );
    assert.equal(candidate.registryStatus, "missing_registration");
    assert.equal(candidate.repairKind, "missing_registry_registration");
    assert.equal(candidate.safelyRepairable, true);
  });
});

test("governance repair keeps scanner independent from active-phase resolution and shares repair rules", async () => {
  const repairService = await readFile(
    path.resolve("src/main/artifacts/governanceRepairService.ts"),
    "utf8",
  );
  const artifactPairService = await readFile(
    path.resolve("src/main/artifacts/artifactPairService.ts"),
    "utf8",
  );
  const repairAnalysis = await readFile(
    path.resolve("src/main/artifacts/governanceRepairAnalysis.ts"),
    "utf8",
  );
  assert.equal(repairService.includes("deriveActivePhaseId"), false);
  assert.equal(repairService.includes("repairableMissingRegistrationScope"), false);
  assert.equal(repairService.includes("activePhase"), false);
  assert.equal(artifactPairService.includes("analyzeGovernancePairRepair"), true);
  assert.equal(artifactPairService.includes("repairEnvelopeMatchesArtifact"), false);
  assert.equal(repairAnalysis.includes("repairEnvelopeMatchesArtifact"), false);
});

test("governance repair applies multiple records atomically through one registry revision", async () => {
  await withTemporaryRoot(async (root) => {
    const initialService = new ArtifactPairService({
      projectRoot: root,
      clock: () => TIMESTAMP,
    });
    await initialService.commitArtifact({
      artifactId: "champcity-ai/phase-07/work_card/SEED",
      artifactType: "work_card",
      status: "active",
      projectId: "champcity-ai",
      phaseId: "phase-07",
      workCardId: "SEED",
      relationships: {},
      payload: {
        title: "Seed",
        contentMarkdown: "# Seed\n",
        data: { workCardId: "SEED" },
      },
      location: {
        directoryPath: "planning/phases/phase-07/Work_Cards",
        fileStem: "SEED",
      },
      expectedRevision: null,
    });
    const first = artifact({
      artifactId: "champcity-ai/phase-07/phase_activation/Phase_Activation",
      artifactType: "phase_activation",
      revision: 1,
      phaseId: "phase-07",
      workCardId: undefined,
      markdownPath: "planning/phases/phase-07/Phase_Activation.md",
      jsonPath: "planning/phases/phase-07/Phase_Activation.json",
      payload: {
        kind: "phase_activation",
        title: "Phase 07 Activation",
        contentMarkdown: "# Phase 07 Activation\n",
        data: { phaseId: "phase-07" },
      },
    });
    const second = artifact({
      artifactId: "champcity-ai/phase-07/work_card_plan/Work_Card_Plan",
      artifactType: "work_card_plan",
      revision: 1,
      phaseId: "phase-07",
      workCardId: undefined,
      markdownPath: "planning/phases/phase-07/Work_Card_Plan.md",
      jsonPath: "planning/phases/phase-07/Work_Card_Plan.json",
      payload: {
        kind: "work_card_plan",
        title: "Phase 07 Work Card Plan",
        contentMarkdown: "# Phase 07 Work Card Plan\n",
        data: { phaseId: "phase-07" },
      },
    });
    await writeMalformedMarkdownPair(root, first);
    await writeMalformedMarkdownPair(root, second);
    const firstMarkdownPath = path.join(root, ...first.markdownPath.split("/"));
    const secondMarkdownPath = path.join(root, ...second.markdownPath.split("/"));
    const firstBefore = await readFile(firstMarkdownPath, "utf8");
    const secondBefore = await readFile(secondMarkdownPath, "utf8");
    const registryBefore = await initialService.loadRegistry();

    const failingService = new ArtifactPairService({
      projectRoot: root,
      clock: () => TIMESTAMP,
      failureInjector: (point, context) => {
        if (point === "after_registry_update" && context.operation === "registry") {
          throw new Error("Injected registry failure.");
        }
      },
    });
    await assert.rejects(
      new GovernanceRepairService(testProject(root), failingService).repairAll(),
      /Injected registry failure/,
    );
    assert.equal(await readFile(firstMarkdownPath, "utf8"), firstBefore);
    assert.equal(await readFile(secondMarkdownPath, "utf8"), secondBefore);
    assert.deepEqual(await initialService.loadRegistry(), registryBefore);

    const repair = new GovernanceRepairService(testProject(root), initialService);
    const applied = await repair.repairAll();
    assert.deepEqual(applied.repairedArtifactIds.sort(), [
      first.artifactId,
      second.artifactId,
    ]);
    assert.equal(typeof applied.registryRevision, "number");
    const registry = await initialService.loadRegistry();
    assert.equal(registry.entries.some((entry) => entry.artifactId === first.artifactId), true);
    assert.equal(registry.entries.some((entry) => entry.artifactId === second.artifactId), true);
    assert.equal(await readFile(firstMarkdownPath, "utf8"), renderArtifactMarkdown(first));
    assert.equal(await readFile(secondMarkdownPath, "utf8"), renderArtifactMarkdown(second));
  });
});

test("governance repair blocks semantic markdown-body mismatches", async () => {
  await withTemporaryRoot(async (root) => {
    const service = new ArtifactPairService({
      projectRoot: root,
      clock: () => TIMESTAMP,
    });
    await service.commitArtifact({
      artifactId: "champcity-ai/phase-07/work_card/SEED",
      artifactType: "work_card",
      status: "active",
      projectId: "champcity-ai",
      phaseId: "phase-07",
      workCardId: "SEED",
      relationships: {},
      payload: {
        title: "Seed",
        contentMarkdown: "# Seed\n",
        data: { workCardId: "SEED" },
      },
      location: {
        directoryPath: "planning/phases/phase-07/Work_Cards",
        fileStem: "SEED",
      },
      expectedRevision: null,
    });
    await service.commitArtifact({
      artifactId: "champcity-ai/phase-07/phase_activation/phase-07",
      artifactType: "phase_activation",
      status: "active",
      projectId: "champcity-ai",
      phaseId: "phase-07",
      relationships: {},
      payload: {
        title: "Phase 07 Activation",
        contentMarkdown: "# Phase 07 Activation\n",
        data: { phaseId: "phase-07", phaseSequence: 7 },
      },
      location: {
        directoryPath: "planning/phases/phase-07",
        fileStem: "Phase_Activation",
      },
      expectedRevision: null,
    });
    const plan = artifact({
      artifactId: "champcity-ai/phase-07/work_card_plan/Work_Card_Plan",
      artifactType: "work_card_plan",
      revision: 1,
      phaseId: "phase-07",
      workCardId: undefined,
      markdownPath: "planning/phases/phase-07/Work_Card_Plan.md",
      jsonPath: "planning/phases/phase-07/Work_Card_Plan.json",
      payload: {
        kind: "work_card_plan",
        title: "Phase 07 Work Card Plan",
        contentMarkdown: "# Phase 07 Work Card Plan\n",
        data: { phaseId: "phase-07", status: "approved" },
      },
    });
    await writeArtifactPair(root, plan);
    await writeFile(
      path.join(root, ...plan.markdownPath.split("/")),
      renderArtifactMarkdown(plan).replace("# Phase 07 Work Card Plan", "# Different body"),
      "utf8",
    );

    const repair = new GovernanceRepairService(testProject(root), service);
    const preview = await repair.preview();
    assert.equal(preview.candidates.length, 1);
    assert.equal(preview.candidates[0].safelyRepairable, false);
    assert.equal(preview.candidates[0].payloadContentWouldChange, true);
    const applied = await repair.repairAll();
    assert.deepEqual(applied.repairedArtifactIds, []);
    assert.equal(applied.preview.candidates[0].safelyRepairable, false);
  });
});

async function writeMalformedMarkdownPair(root, target) {
  const jsonPath = path.join(root, ...target.jsonPath.split("/"));
  const markdownPath = path.join(root, ...target.markdownPath.split("/"));
  await mkdir(path.dirname(jsonPath), { recursive: true });
  await writeFile(jsonPath, `${canonicalPrettyStringify(target)}\n`, "utf8");
  await writeFile(
    markdownPath,
    `<!-- champcity-artifact-envelope\n${canonicalStringify(buildMarkdownArtifactEnvelope(target))}\n-->\n\n${target.payload.contentMarkdown}`,
    "utf8",
  );
}

function testProject(root) {
  return {
    projectId: "champcity-ai",
    displayName: "ChampCity A/I",
    repositoryRoot: root,
    planningRoot: path.join(root, "planning"),
    branchBehavior: { mode: "observe-current" },
    enabled: true,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    lastOpenedAt: TIMESTAMP,
    lastScanAt: null,
    lastScanResult: null,
    observerStatus: "stopped",
  };
}
