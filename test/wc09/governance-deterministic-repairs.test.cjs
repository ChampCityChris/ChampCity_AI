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
} = require("../../dist/shared/artifacts");
const { ArtifactPairService, GovernanceRepairService } = require("../../dist/main/artifacts");

const projectId = "champcity-ai";
const now = "2026-07-20T12:00:00.000Z";

test("explicit superseded-path cleanup deletes only superseded pair and preserves active authority", async () => {
  await withFixture(async ({ root, project }) => {
    const { active, superseded } = await seedSuperseded(root, true);
    const service = repairService(root, project);
    const preview = await service.preview();
    const candidate = preview.candidates.find((item) => item.jsonPath === superseded.jsonPath);
    assert.equal(candidate.operationLabel, "Delete explicit superseded path");
    assert.deepEqual(candidate.deterministicRepairPlan.affectedFiles, [
      superseded.jsonPath,
      superseded.markdownPath,
    ]);

    const registryBefore = await readJson(root, registryJsonPath());
    await service.repairOne(intent(candidate));

    assert.equal(await exists(root, superseded.jsonPath), false);
    assert.equal(await exists(root, superseded.markdownPath), false);
    assert.equal((await readJson(root, active.jsonPath)).payloadHash, active.payloadHash);
    assert.deepEqual((await readJson(root, registryJsonPath())).payload.data, registryBefore.payload.data);
  });
});

test("same-ID superseded pair without explicit superseded-path evidence remains blocked", async () => {
  await withFixture(async ({ root, project }) => {
    const { superseded } = await seedSuperseded(root, false);
    const preview = await repairService(root, project).preview();
    const candidate = preview.candidates.find((item) => item.jsonPath === superseded.jsonPath);
    assert.ok(candidate);
    assert.notEqual(candidate.operationLabel, "Delete explicit superseded path");
    assert.equal(candidate.safelyRepairable, false);
  });
});

test("stale Roadmap and Project State Registry refreshes do not rewrite artifact pairs", async () => {
  await withFixture(async ({ root, project }) => {
    const roadmap = roadmapArtifact();
    const projectState = projectStateArtifact();
    await writeArtifact(root, roadmap);
    await writeArtifact(root, projectState);
    await writeRegistry(root, [
      staleEntryFor(roadmap, { revision: 1, payloadHash: staleHash("roadmap") }),
      staleEntryFor(projectState, { revision: 1, payloadHash: staleHash("state") }),
    ]);
    const roadmapBefore = await fs.readFile(abs(root, roadmap.jsonPath), "utf8");
    const stateBefore = await fs.readFile(abs(root, projectState.jsonPath), "utf8");
    const service = repairService(root, project);
    const preview = await service.preview();
    assert.equal(preview.candidates.filter((item) => item.operationLabel === "Refresh stale Registry entry").length, 2);

    for (const candidate of preview.candidates) await service.repairOne(intent(candidate));

    assert.equal(await fs.readFile(abs(root, roadmap.jsonPath), "utf8"), roadmapBefore);
    assert.equal(await fs.readFile(abs(root, projectState.jsonPath), "utf8"), stateBefore);
    const registry = (await readJson(root, registryJsonPath())).payload.data;
    assert.equal(registry.entries.find((entry) => entry.artifactId === roadmap.artifactId).payloadHash, roadmap.payloadHash);
    assert.equal(registry.entries.find((entry) => entry.artifactId === projectState.artifactId).revision, projectState.revision);
  });
});

test("legacy closeout normalization supports both Phase 01 whole-record choices", async () => {
  await withFixture(async ({ root, project }) => {
    const { fixed, numbered } = await seedCloseoutDuplicate(root);
    const service = repairService(root, project);
    const candidate = (await service.preview()).candidates.find((item) => item.jsonPath === numbered.jsonPath);
    await service.repairOne(intent(candidate, "keep_fixed_record_and_delete_duplicate"));
    const survivor = await readJson(root, fixed.jsonPath);
    assert.equal(survivor.artifactId, "champcity-ai/phase-01/supporting_document/CLOSEOUT_REPORT_phase-01_phase_1_closeout");
    assert.equal(survivor.artifactType, "supporting_document");
    assert.equal(survivor.status, "historical");
    assert.equal(survivor.phaseId, "phase-01");
    assert.equal(survivor.payload.data.selected, "fixed");
    assert.equal(await exists(root, numbered.jsonPath), false);
    assert.equal(survivor.artifactType === "phase_closeout", false);
  });

  await withFixture(async ({ root, project }) => {
    const { fixed, numbered } = await seedCloseoutDuplicate(root);
    const service = repairService(root, project);
    const candidate = (await service.preview()).candidates.find((item) => item.jsonPath === numbered.jsonPath);
    await service.repairOne(intent(candidate, "use_numbered_record_as_next_canonical_revision"));
    const survivor = await readJson(root, fixed.jsonPath);
    assert.equal(survivor.payload.data.selected, "numbered");
    assert.equal(await exists(root, numbered.jsonPath), false);
  });
});

test("Phase 02 legacy closeout becomes historical phase-scoped supporting document authority", async () => {
  await withFixture(async ({ root, project }) => {
    const closeout = closeoutArtifact("phase-02", "phase_2_closeout", "");
    await writeArtifact(root, closeout);
    await writeRegistry(root, [closeout]);
    const service = repairService(root, project);
    const candidate = (await service.preview()).candidates.find((item) => item.artifactId === closeout.artifactId);
    assert.equal(candidate.operationLabel, "Normalize legacy closeout record");
    await service.repairOne(intent(candidate));
    const survivor = await readJson(root, closeout.jsonPath);
    assert.equal(survivor.artifactId, "champcity-ai/phase-02/supporting_document/CLOSEOUT_REPORT_phase-02_phase_2_closeout");
    assert.equal(survivor.artifactType, "supporting_document");
    assert.equal(survivor.status, "historical");
    assert.equal(survivor.phaseId, "phase-02");
    assert.equal(survivor.artifactType === "phase_closeout", false);
  });
});

test("deterministic repair preview is non-mutating and drains the fixture queue", async () => {
  await withFixture(async ({ root, project }) => {
    const { superseded } = await seedSuperseded(root, true);
    const roadmap = roadmapArtifact();
    await writeArtifact(root, roadmap);
    await writeRegistry(root, [
      (await readJson(root, registryJsonPath())).payload.data.entries[0],
      staleEntryFor(roadmap, { revision: 1, payloadHash: staleHash("old") }),
    ]);
    const service = repairService(root, project);
    const before = await fs.readFile(abs(root, superseded.jsonPath), "utf8");
    const preview = await service.preview();
    assert.ok(preview.candidates.length >= 2);
    assert.equal(await fs.readFile(abs(root, superseded.jsonPath), "utf8"), before);
    for (const candidate of preview.candidates) await service.repairOne(intent(candidate));
    assert.equal((await service.preview()).candidates.length, 0);
  });
});

async function withFixture(run) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "champcity-governance-deterministic-"));
  try {
    await run({
      root,
      project: {
        projectId,
        displayName: "deterministic repair fixture",
        repositoryRoot: root,
        planningRoot: path.join(root, "planning"),
        branchBehavior: { mode: "observe-current" },
        enabled: true,
        createdAt: now,
        updatedAt: now,
        lastOpenedAt: null,
        lastScanAt: null,
        lastScanResult: null,
        observerStatus: "stopped",
      },
    });
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

async function seedSuperseded(root, explicit) {
  const active = reviewArtifact({
    revision: 2,
    status: "active",
    stem: "ARCHITECT_REVIEW_WC02_architect_bridge_current_action_surface_audit_and_embedded_chatgpt_browser",
    data: { status: "active" },
  });
  const superseded = reviewArtifact({
    revision: 1,
    status: "superseded",
    stem: "ARCHITECT_REVIEW_WC02_architect_bridge_current_action_surface_audit",
    data: explicit
      ? { status: "superseded_path", activeJsonPath: active.jsonPath, activeMarkdownPath: active.markdownPath }
      : { status: "superseded_path" },
  });
  await writeArtifact(root, active);
  await writeArtifact(root, superseded);
  await writeRegistry(root, [active]);
  return { active, superseded };
}

async function seedCloseoutDuplicate(root) {
  const fixed = closeoutArtifact("phase-01", "phase_1_closeout", "", { selected: "fixed" });
  const numbered = closeoutArtifact("phase-01", "phase_1_closeout", "_4", { selected: "numbered" });
  await writeArtifact(root, fixed);
  await writeArtifact(root, numbered);
  await writeRegistry(root, [fixed, numbered]);
  return { fixed, numbered };
}

function reviewArtifact({ revision, status, stem, data }) {
  return buildCanonicalArtifact({
    artifactId: "champcity-ai/phase-04/architect_review/WC02",
    artifactType: "architect_review",
    revision,
    status,
    projectId,
    phaseId: "phase-04",
    workCardId: "WC02",
    createdAt: now,
    updatedAt: now,
    jsonPath: `planning/phases/phase-04/Architect_Reviews/${stem}.json`,
    markdownPath: `planning/phases/phase-04/Architect_Reviews/${stem}.md`,
    relationships: { sources: [], expectedOutputs: [], supersedes: [], children: [] },
    payload: { kind: "architect_review", title: "WC02 review", contentMarkdown: "# WC02 review\n", data },
  });
}

function roadmapArtifact() {
  return buildCanonicalArtifact({
    artifactId: "champcity-ai/project/project_roadmap/PROJECT_ROADMAP_champcity_a_i",
    artifactType: "project_roadmap",
    revision: 3,
    status: "active",
    projectId,
    createdAt: now,
    updatedAt: now,
    jsonPath: "planning/project/PROJECT_ROADMAP_champcity_a_i.json",
    markdownPath: "planning/project/PROJECT_ROADMAP_champcity_a_i.md",
    relationships: { sources: [], expectedOutputs: [], supersedes: [], children: [] },
    payload: { kind: "project_roadmap", title: "Roadmap", contentMarkdown: "# Roadmap\n", data: {} },
  });
}

function projectStateArtifact() {
  return buildCanonicalArtifact({
    artifactId: "champcity-ai/project/supporting_document/PROJECT_STATE",
    artifactType: "supporting_document",
    revision: 4,
    status: "active",
    projectId,
    createdAt: now,
    updatedAt: now,
    jsonPath: "planning/project/PROJECT_STATE.json",
    markdownPath: "planning/project/PROJECT_STATE.md",
    relationships: { sources: [], expectedOutputs: [], supersedes: [], children: [] },
    payload: { kind: "supporting_document", title: "Project State", contentMarkdown: "# Project State\n", data: {} },
  });
}

function closeoutArtifact(phaseId, suffix, numberSuffix, data = {}) {
  const stem = `CLOSEOUT_REPORT_${phaseId}_${suffix}${numberSuffix}`;
  return buildCanonicalArtifact({
    artifactId: `champcity-ai/supporting_document/${stem}`,
    artifactType: "supporting_document",
    revision: 1,
    status: "active",
    projectId,
    createdAt: now,
    updatedAt: now,
    jsonPath: `planning/phases/${phaseId}/Closeout_Reports/${stem}.json`,
    markdownPath: `planning/phases/${phaseId}/Closeout_Reports/${stem}.md`,
    relationships: { sources: [], expectedOutputs: [], supersedes: [], children: [] },
    payload: { kind: "supporting_document", title: stem, contentMarkdown: `# ${stem}\n`, data },
  });
}

function staleEntryFor(artifact, overrides) {
  return { ...buildArtifactRegistryEntry(artifact), ...overrides };
}

function staleHash(seed) {
  return `sha256:${Buffer.from(seed).toString("hex").padEnd(64, "0").slice(0, 64)}`;
}

function repairService(root, project) {
  return new GovernanceRepairService(project, new ArtifactPairService({ projectRoot: root, clock: () => now }));
}

function intent(candidate, duplicateDisposition) {
  assert.ok(candidate, "expected repair candidate");
  return {
    artifactId: candidate.artifactId,
    jsonPath: candidate.jsonPath,
    markdownPath: candidate.markdownPath,
    repairKind: candidate.repairKind,
    expectedRevision: candidate.revision,
    ...(duplicateDisposition ? { duplicateDisposition } : {}),
  };
}

async function writeArtifact(root, artifact) {
  await fs.mkdir(path.dirname(abs(root, artifact.jsonPath)), { recursive: true });
  await fs.writeFile(abs(root, artifact.jsonPath), `${canonicalPrettyStringify(artifact)}\n`, "utf8");
  await fs.writeFile(abs(root, artifact.markdownPath), renderArtifactMarkdown(artifact), "utf8");
}

async function writeRegistry(root, artifactsOrEntries) {
  const entries = artifactsOrEntries.map((item) =>
    item.payloadHash && item.jsonPath && item.markdownPath && !item.payload
      ? item
      : buildArtifactRegistryEntry(item),
  );
  const registry = buildArtifactRegistry({ updatedAt: now, entries });
  const artifact = buildCanonicalArtifact({
    artifactId: "champcity-ai/system/artifact_registry",
    artifactType: "artifact_registry",
    revision: 1,
    status: "active",
    projectId,
    createdAt: now,
    updatedAt: now,
    jsonPath: registryJsonPath(),
    markdownPath: "planning/system/Artifact_Registry/ARTIFACT_REGISTRY.md",
    relationships: { sources: registry.entries.map((entry) => entry.artifactId), expectedOutputs: [], supersedes: [], children: [] },
    payload: { kind: "artifact_registry", title: "Canonical Artifact Registry", contentMarkdown: renderArtifactRegistryContentMarkdown(registry), data: registry },
  });
  await writeArtifact(root, artifact);
}

function registryJsonPath() {
  return "planning/system/Artifact_Registry/ARTIFACT_REGISTRY.json";
}

async function readJson(root, repoPath) {
  return JSON.parse(await fs.readFile(abs(root, repoPath), "utf8"));
}

async function exists(root, repoPath) {
  try {
    await fs.access(abs(root, repoPath));
    return true;
  } catch {
    return false;
  }
}

function abs(root, repoPath) {
  return path.join(root, ...repoPath.split("/"));
}
