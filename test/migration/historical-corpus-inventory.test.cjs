const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");

const {
  checkHistoricalCorpusInventoryOutputsV1,
  collectHistoricalCorpusInventoryV1,
  renderHistoricalCorpusInventoryMarkdownV1,
  writeHistoricalCorpusInventoryOutputsV1,
} = require("../../dist/main/migrations/index.js");

test("historical corpus inventory analyzes fixtures deterministically without mutating sources", async () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-historical-corpus-"));
  try {
    createFixtureRepository(repo);
    const beforeSourceHashes = sourceHashes(repo);
    const manifest = await collectHistoricalCorpusInventoryV1({ repositoryRoot: repo });
    const markdown = renderHistoricalCorpusInventoryMarkdownV1(manifest);
    const repeated = await collectHistoricalCorpusInventoryV1({ repositoryRoot: repo });
    const repeatedMarkdown = renderHistoricalCorpusInventoryMarkdownV1(repeated);

    assert.deepEqual(repeated, manifest);
    assert.equal(repeatedMarkdown, markdown);
    assert.equal(manifest.sourceFingerprintBefore, manifest.sourceFingerprintAfter);
    assert.equal(manifest.sourceSnapshotStable, true);
    assert.deepEqual(manifest.excludedGeneratedPaths.sort(), [
      "planning/phases/phase-07/Implementer_Reports/IMPLEMENTER_REPORT_WC02_historical_corpus_inventory_and_duplicate_resolution_manifest.md",
      "planning/phases/phase-07/Migration_Manifests/HISTORICAL_CORPUS_INVENTORY_V1.json",
      "planning/phases/phase-07/Migration_Manifests/HISTORICAL_CORPUS_INVENTORY_V1.md",
    ].sort());

    const expectedInputs = fixtureInputPaths();
    assert.deepEqual(manifest.files.map((file) => file.path).sort(), expectedInputs.sort());
    assert.equal(new Set(manifest.files.map((file) => file.path)).size, manifest.files.length);
    for (const file of manifest.files) {
      assert.equal(manifest.files.filter((candidate) => candidate.path === file.path).length, 1);
    }

    const safeJson = recordByPath(manifest, "planning/phases/phase-01/Work_Cards/WC_SAFE.json");
    assert.equal(safeJson.pairStatus, "complete_pair");
    assert.equal(safeJson.schemaClass, "valid_synchronized_canonical_pair");

    const jsonOnly = recordByPath(manifest, "planning/phases/phase-03/Work_Cards/WC_JSON_ONLY.json");
    assert.equal(jsonOnly.pairStatus, "json_only");
    const markdownOnly = recordByPath(manifest, "planning/phases/phase-03/Notes/plain_note.md");
    assert.equal(markdownOnly.pairStatus, "markdown_only");
    const archiveRecord = recordByPath(manifest, "planning/archive/phase-01/Work_Cards/WC_SAFE.json");
    assert.equal(archiveRecord.archiveLocationStatus, "archive");
    assert.equal(archiveRecord.migrationScope, "archive_provenance");
    const malformed = recordByPath(manifest, "planning/phases/phase-03/Work_Cards/BROKEN.json");
    assert.equal(malformed.defectCodes.includes("malformed_json"), true);
    const invalidPair = recordByPath(manifest, "planning/phases/phase-02/Work_Cards/WC_INVALID.json");
    assert.equal(invalidPair.defectCodes.includes("invalid_canonical_pair"), true);
    assert.equal(manifest.records.includes(invalidPair), true);

    const duplicateArtifact = groupByKind(manifest, "duplicate_artifact_id");
    assert.ok(duplicateArtifact.some((group) => group.memberRecordIds.includes(safeJson.recordId) && group.memberRecordIds.includes(archiveRecord.recordId)));
    const exactFileGroup = groupByKind(manifest, "exact_file_content_duplicate").find((group) =>
      group.memberPaths.includes("planning/phases/phase-03/Exact/file-a.md") &&
      group.memberPaths.includes("planning/phases/phase-03/Exact/file-b.md")
    );
    assert.ok(exactFileGroup);
    const safeGroup = groupByKind(manifest, "exact_record_content_duplicate").find((group) =>
      group.memberRecordIds.includes(safeJson.recordId) &&
      group.memberRecordIds.includes(archiveRecord.recordId)
    );
    assert.ok(safeGroup);
    assert.equal(safeGroup.resolutionSafety, "safe_exact_consolidation");
    assert.equal(safeGroup.proposedCanonicalSurvivorRecordId, safeJson.recordId);

    const semanticGroup = groupByKind(manifest, "semantic_duplicate_candidate").find((group) =>
      group.memberPaths.some((sourcePath) => sourcePath.includes("WC_SEMANTIC_A")) &&
      group.memberPaths.some((sourcePath) => sourcePath.includes("WC_SEMANTIC_B"))
    );
    assert.ok(semanticGroup);
    assert.equal(semanticGroup.resolutionSafety, "ambiguous_operator_review");
    assert.equal(semanticGroup.proposedCanonicalSurvivorRecordId, null);
    assert.ok(semanticGroup.uniqueEvidenceLocations.length > 0);

    const structuredReference = manifest.inboundReferences.find((reference) =>
      reference.referenceKind === "structured" &&
      reference.referencedArtifactId === "champcity-ai/phase-01/work_card/WC_SAFE"
    );
    assert.ok(structuredReference);
    const textReference = manifest.inboundReferences.find((reference) =>
      reference.referenceKind === "text" &&
      reference.referencedArtifactId === "champcity-ai/phase-01/work_card/WC_SAFE"
    );
    assert.ok(textReference);
    assert.ok(manifest.defects.some((defect) =>
      defect.code === "inbound_reference_to_missing_record" &&
      defect.message.includes("champcity-ai/phase-99/work_card/MISSING")
    ));

    const disagreement = recordByPath(manifest, "planning/phases/phase-03/Work_Cards/WC_REGISTRY_DISAGREE.json");
    assert.equal(disagreement.registry.exists, true);
    assert.equal(disagreement.registry.agreement, "disagrees");
    assert.equal(disagreement.defectCodes.includes("registry_path_disagreement"), true);

    const conflict = recordByPath(manifest, "planning/phases/phase-04/Work_Cards/WC_CONFLICT.json");
    assert.equal(conflict.defectCodes.includes("identity_conflict"), true);
    assert.ok(conflict.identityEvidence.some((item) => item.value === "phase-04"));
    assert.ok(conflict.identityEvidence.some((item) => item.value === "phase-05"));

    assert.equal(manifest.counts.totalFiles, manifest.files.length);
    assert.equal(manifest.counts.totalLogicalRecords, manifest.records.length);
    assert.equal(manifest.counts.inboundReferences, manifest.inboundReferences.length);
    assert.equal(sumValues(manifest.counts.byExtension), manifest.files.length);
    assert.equal(sumValues(manifest.counts.bySchemaClass), manifest.records.length);
    assert.equal(sumValues(manifest.counts.byMigrationScope), manifest.records.length);
    assert.equal(manifest.records.every((record) => record.migrationScope), true);

    const checkBeforeWrite = await checkHistoricalCorpusInventoryOutputsV1({ repositoryRoot: repo });
    assert.equal(checkBeforeWrite.ok, false);
    assert.deepEqual(sourceHashes(repo), beforeSourceHashes);

    const writeResult = await writeHistoricalCorpusInventoryOutputsV1({ repositoryRoot: repo });
    assert.deepEqual(writeResult.changedPaths.sort(), [
      "planning/phases/phase-07/Migration_Manifests/HISTORICAL_CORPUS_INVENTORY_V1.json",
      "planning/phases/phase-07/Migration_Manifests/HISTORICAL_CORPUS_INVENTORY_V1.md",
    ].sort());
    assert.deepEqual(sourceHashes(repo), beforeSourceHashes);
    assert.equal(fs.existsSync(path.join(repo, writeResult.jsonPath)), true);
    assert.equal(fs.existsSync(path.join(repo, writeResult.markdownPath)), true);

    const checkAfterWrite = await checkHistoricalCorpusInventoryOutputsV1({ repositoryRoot: repo });
    assert.equal(checkAfterWrite.ok, true, checkAfterWrite.errorMessages.join("\n"));
    const outputBeforeStale = fs.readFileSync(path.join(repo, writeResult.jsonPath), "utf8");
    fs.writeFileSync(path.join(repo, writeResult.jsonPath), `${outputBeforeStale}\n`, "utf8");
    const staleCheck = await checkHistoricalCorpusInventoryOutputsV1({ repositoryRoot: repo });
    assert.equal(staleCheck.ok, false);
    assert.match(staleCheck.errorMessages.join("\n"), /stale or missing/);
    assert.deepEqual(sourceHashes(repo), beforeSourceHashes);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
});

function createFixtureRepository(repo) {
  writeJson(repo, "package.json", { name: "champcity-ai" });
  fs.mkdirSync(path.join(repo, "planning"), { recursive: true });
  const safe = canonicalArtifact({
    artifactId: "champcity-ai/phase-01/work_card/WC_SAFE",
    artifactType: "work_card",
    phaseId: "phase-01",
    workCardId: "WC_SAFE",
    jsonPath: "planning/phases/phase-01/Work_Cards/WC_SAFE.json",
    markdownPath: "planning/phases/phase-01/Work_Cards/WC_SAFE.md",
    data: {
      requiresImplementer: true,
      references: ["champcity-ai/phase-99/work_card/MISSING"],
    },
    contentMarkdown: "# Safe\n\nReferences champcity-ai/phase-01/work_card/WC_SAFE.\n",
  });
  writeCanonicalPair(repo, safe);
  const archiveSafe = {
    ...safe,
    jsonPath: "planning/archive/phase-01/Work_Cards/WC_SAFE.json",
    markdownPath: "planning/archive/phase-01/Work_Cards/WC_SAFE.md",
  };
  writeCanonicalPair(repo, archiveSafe);
  const invalid = canonicalArtifact({
    artifactId: "champcity-ai/phase-02/work_card/WC_INVALID",
    artifactType: "work_card",
    phaseId: "phase-02",
    workCardId: "WC_INVALID",
    jsonPath: "planning/phases/phase-02/Work_Cards/WC_INVALID.json",
    markdownPath: "planning/phases/phase-02/Work_Cards/WC_INVALID.md",
    data: { invalid: true },
    contentMarkdown: "# Invalid\n",
  });
  writeFile(repo, invalid.jsonPath, pretty({ ...invalid, payloadHash: "sha256:bad" }));
  writeFile(repo, invalid.markdownPath, renderMarkdown(invalid).replace("# Invalid", "# Different"));
  writeJson(repo, "planning/phases/phase-03/Work_Cards/WC_JSON_ONLY.json", {
    artifactId: "champcity-ai/phase-03/work_card/WC_JSON_ONLY",
    artifactType: "work_card",
    projectId: "champcity-ai",
    phaseId: "phase-03",
    workCardId: "WC_JSON_ONLY",
    status: "active",
    relationships: { sources: ["champcity-ai/phase-01/work_card/WC_SAFE"] },
  });
  writeFile(repo, "planning/phases/phase-03/Notes/plain_note.md", "# Plain Note\n\nplanning/phases/phase-01/Work_Cards/WC_SAFE.json\n");
  writeFile(repo, "planning/phases/phase-03/Work_Cards/BROKEN.json", "{ not valid json");
  writeFile(repo, "planning/phases/phase-03/Exact/file-a.md", "same bytes\n");
  writeFile(repo, "planning/phases/phase-03/Exact/file-b.md", "same bytes\n");
  writeJson(repo, "planning/phases/phase-03/Work_Cards/WC_SEMANTIC_A.json", {
    artifactId: "champcity-ai/phase-03/work_card/WC_SEMANTIC_A",
    artifactType: "work_card",
    projectId: "champcity-ai",
    phaseId: "phase-03",
    workCardId: "WC_SEMANTIC",
    parentArtifactId: "champcity-ai/phase-03/work_card_plan/Work_Card_Plan",
    status: "active",
    payload: { data: { unique: "A" } },
  });
  writeFile(repo, "planning/phases/phase-03/Work_Cards/WC_SEMANTIC_A.md", "# Semantic\n\nUnique A\n");
  writeJson(repo, "planning/phases/phase-03/Work_Cards/WC_SEMANTIC_B.json", {
    artifactId: "champcity-ai/phase-03/work_card/WC_SEMANTIC_B",
    artifactType: "work_card",
    projectId: "champcity-ai",
    phaseId: "phase-03",
    workCardId: "WC_SEMANTIC",
    parentArtifactId: "champcity-ai/phase-03/work_card_plan/Work_Card_Plan",
    status: "active",
    payload: { data: { unique: "B" } },
  });
  writeFile(repo, "planning/phases/phase-03/Work_Cards/WC_SEMANTIC_B.md", "# Semantic\n\nUnique B\n");
  writeJson(repo, "planning/phases/phase-03/Work_Cards/WC_REGISTRY_DISAGREE.json", {
    artifactId: "champcity-ai/phase-03/work_card/WC_REGISTRY_DISAGREE",
    artifactType: "work_card",
    projectId: "champcity-ai",
    phaseId: "phase-03",
    workCardId: "WC_REGISTRY_DISAGREE",
    status: "active",
    revision: 1,
    payloadHash: "sha256:fixture",
  });
  writeJson(repo, "planning/phases/phase-04/Work_Cards/WC_CONFLICT.json", {
    artifactId: "champcity-ai/phase-04/work_card/WC_CONFLICT",
    artifactType: "work_card",
    projectId: "champcity-ai",
    phaseId: "phase-05",
    workCardId: "WC_CONFLICT",
    status: "active",
  });
  writeJson(repo, "planning/system/Artifact_Registry/ARTIFACT_REGISTRY.json", {
    payload: {
      data: {
        entries: [{
          artifactId: safe.artifactId,
          artifactType: safe.artifactType,
          projectId: safe.projectId,
          phaseId: safe.phaseId,
          workCardId: safe.workCardId,
          revision: safe.revision,
          status: safe.status,
          jsonPath: safe.jsonPath,
          markdownPath: safe.markdownPath,
          payloadHash: safe.payloadHash,
          relationships: safe.relationships,
          authoritative: true,
          synchronized: true,
        }, {
          artifactId: "champcity-ai/phase-03/work_card/WC_REGISTRY_DISAGREE",
          artifactType: "work_card",
          projectId: "champcity-ai",
          phaseId: "phase-03",
          workCardId: "WC_REGISTRY_DISAGREE",
          revision: 9,
          status: "active",
          jsonPath: "planning/phases/phase-03/Work_Cards/OTHER.json",
          markdownPath: "planning/phases/phase-03/Work_Cards/OTHER.md",
          payloadHash: "sha256:different",
          relationships: { sources: [], expectedOutputs: [], supersedes: [], children: [] },
          authoritative: true,
          synchronized: true,
        }],
      },
    },
  });
  writeFile(repo, "planning/phases/phase-07/Migration_Manifests/HISTORICAL_CORPUS_INVENTORY_V1.json", "old");
  writeFile(repo, "planning/phases/phase-07/Migration_Manifests/HISTORICAL_CORPUS_INVENTORY_V1.md", "old");
  writeFile(repo, "planning/phases/phase-07/Implementer_Reports/IMPLEMENTER_REPORT_WC02_historical_corpus_inventory_and_duplicate_resolution_manifest.md", "old");
}

function fixtureInputPaths() {
  return [
    "planning/archive/phase-01/Work_Cards/WC_SAFE.json",
    "planning/archive/phase-01/Work_Cards/WC_SAFE.md",
    "planning/phases/phase-01/Work_Cards/WC_SAFE.json",
    "planning/phases/phase-01/Work_Cards/WC_SAFE.md",
    "planning/phases/phase-02/Work_Cards/WC_INVALID.json",
    "planning/phases/phase-02/Work_Cards/WC_INVALID.md",
    "planning/phases/phase-03/Exact/file-a.md",
    "planning/phases/phase-03/Exact/file-b.md",
    "planning/phases/phase-03/Notes/plain_note.md",
    "planning/phases/phase-03/Work_Cards/BROKEN.json",
    "planning/phases/phase-03/Work_Cards/WC_JSON_ONLY.json",
    "planning/phases/phase-03/Work_Cards/WC_REGISTRY_DISAGREE.json",
    "planning/phases/phase-03/Work_Cards/WC_SEMANTIC_A.json",
    "planning/phases/phase-03/Work_Cards/WC_SEMANTIC_A.md",
    "planning/phases/phase-03/Work_Cards/WC_SEMANTIC_B.json",
    "planning/phases/phase-03/Work_Cards/WC_SEMANTIC_B.md",
    "planning/phases/phase-04/Work_Cards/WC_CONFLICT.json",
    "planning/system/Artifact_Registry/ARTIFACT_REGISTRY.json",
  ];
}

function canonicalArtifact(input) {
  const payload = {
    kind: input.artifactType,
    title: input.workCardId,
    contentMarkdown: input.contentMarkdown,
    data: input.data,
  };
  return {
    artifactId: input.artifactId,
    artifactType: input.artifactType,
    schemaVersion: "champcity.artifact.v1",
    revision: 1,
    status: "active",
    projectId: "champcity-ai",
    phaseId: input.phaseId,
    workCardId: input.workCardId,
    createdAt: "2026-07-20T00:00:00.000Z",
    updatedAt: "2026-07-20T00:00:00.000Z",
    markdownPath: input.markdownPath,
    jsonPath: input.jsonPath,
    payloadHash: sha256Canonical(payload),
    relationships: { sources: [], expectedOutputs: [], supersedes: [], children: [] },
    payload,
  };
}

function writeCanonicalPair(repo, artifact) {
  writeFile(repo, artifact.jsonPath, pretty(artifact));
  writeFile(repo, artifact.markdownPath, renderMarkdown(artifact));
}

function renderMarkdown(artifact) {
  const envelope = {
    artifactId: artifact.artifactId,
    artifactType: artifact.artifactType,
    schemaVersion: artifact.schemaVersion,
    revision: artifact.revision,
    status: artifact.status,
    projectId: artifact.projectId,
    phaseId: artifact.phaseId,
    workCardId: artifact.workCardId,
    createdAt: artifact.createdAt,
    updatedAt: artifact.updatedAt,
    markdownPath: artifact.markdownPath,
    jsonPath: artifact.jsonPath,
    payloadHash: artifact.payloadHash,
    relationships: artifact.relationships,
    payload: {
      kind: artifact.payload.kind,
      title: artifact.payload.title,
    },
  };
  return `<!-- champcity-artifact-envelope\n${pretty(envelope).trimEnd()}\n-->\n\n${artifact.payload.contentMarkdown}`;
}

function writeJson(repo, relativePath, value) {
  writeFile(repo, relativePath, pretty(value));
}

function writeFile(repo, relativePath, content) {
  const target = path.join(repo, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
}

function recordByPath(manifest, sourcePath) {
  const record = manifest.records.find((candidate) => candidate.sourcePaths.includes(sourcePath));
  assert.ok(record, sourcePath);
  return record;
}

function groupByKind(manifest, kind) {
  return manifest.duplicateGroups.filter((group) => group.kind === kind);
}

function sourceHashes(repo) {
  return Object.fromEntries(fixtureInputPaths().map((sourcePath) => [
    sourcePath,
    sha256(fs.readFileSync(path.join(repo, sourcePath))),
  ]));
}

function sumValues(value) {
  return Object.values(value).reduce((sum, count) => sum + count, 0);
}

function pretty(value) {
  return `${JSON.stringify(JSON.parse(canonicalStringify(value)), null, 2)}\n`;
}

function sha256Canonical(value) {
  return `sha256:${sha256(Buffer.from(canonicalStringify(value), "utf8"))}`;
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function canonicalStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalStringify(value[key])}`).join(",")}}`;
}
