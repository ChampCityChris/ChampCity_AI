const assert = require("node:assert/strict");
const { mkdtemp, mkdir, readFile, rm, unlink, writeFile } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const test = require("node:test");

const {
  buildArtifactRegistryEntry,
  buildCanonicalArtifact,
  canonicalPrettyStringify,
  renderArtifactMarkdown,
  validateArtifactRegistry,
} = require("../../dist/shared/artifacts");
const {
  ARTIFACT_REGISTRY_JSON_PATH,
  ARTIFACT_REGISTRY_MARKDOWN_PATH,
  ArtifactPairService,
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
    assert.equal(applied.after.entryCount, 5);
    assert.equal(applied.after.registryValidation.valid, true);
    assert.equal(applied.after.registryVersion, 1);
    assert.equal(applied.after.hasSynchronizationFailures, false);
    assert.equal(applied.loadRegistrySucceeded, true);
    assert.deepEqual(applied.registeredCandidates.sort(), [
      "champcity-ai/phase-06/operator_approval/WC04",
      "champcity-ai/phase-06/operator_approval/WC05",
      "champcity-ai/phase-06/work_card/WC04",
      "champcity-ai/phase-06/work_card/WC05",
    ]);
    assert.equal(applied.preservedFieldComparison.preserved, true);

    const service = new ArtifactPairService({ projectRoot: root });
    const registry = await service.loadRegistry();
    assert.equal(validateArtifactRegistry(registry).valid, true);
    assert.equal(registry.entries.length, 5);

    const second = await repair.applyRegistryMigration(root, {
      timestamp: TIMESTAMP,
      backupDir: BACKUP_DIR,
    });
    assert.equal(second.changed, false);
    assert.equal(second.after.entryCount, 5);
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
