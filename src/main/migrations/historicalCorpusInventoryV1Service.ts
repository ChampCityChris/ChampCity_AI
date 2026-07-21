import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { TextDecoder } from "node:util";

import {
  canonicalPrettyStringify,
  canonicalStringify,
  parseArtifactMarkdown,
  validateCanonicalArtifact,
  validateMarkdownEnvelope,
  verifyArtifactPair,
  type ArtifactRegistryEntry,
  type CanonicalArtifact,
  type JsonValue,
} from "../../shared/artifacts";
import {
  compareHistoricalCorpusPaths,
  historicalCorpusInventoryDefectCodes,
  historicalCorpusInventoryDirectoryArtifactTypeMappings,
  historicalCorpusInventoryGeneratedExclusions,
  historicalCorpusInventoryOutputJsonPath,
  historicalCorpusInventoryOutputMarkdownPath,
  historicalCorpusInventorySchemaVersion,
  stableHistoricalCorpusInventoryJson,
  validateHistoricalCorpusInventoryManifestV1,
  type HistoricalCorpusInventoryCanonicalPairVerification,
  type HistoricalCorpusInventoryDefectCode,
  type HistoricalCorpusInventoryDefectOccurrence,
  type HistoricalCorpusInventoryDuplicateGroup,
  type HistoricalCorpusInventoryDuplicateGroupKind,
  type HistoricalCorpusInventoryIdentityEvidence,
  type HistoricalCorpusInventoryInboundReference,
  type HistoricalCorpusInventoryInputFile,
  type HistoricalCorpusInventoryLogicalRecord,
  type HistoricalCorpusInventoryManifestV1,
  type HistoricalCorpusInventoryMigrationScopeClass,
  type HistoricalCorpusInventoryRegistryEvidence,
  type HistoricalCorpusInventorySchemaClass,
  type HistoricalCorpusInventoryUniqueEvidenceLocation,
} from "../../shared/migrations";

export interface HistoricalCorpusInventoryInput {
  repositoryRoot?: string;
}

export interface HistoricalCorpusInventoryWriteResult {
  manifest: HistoricalCorpusInventoryManifestV1;
  jsonPath: string;
  markdownPath: string;
  jsonSha256: string;
  markdownSha256: string;
  changedPaths: string[];
}

export interface HistoricalCorpusInventoryCheckResult {
  ok: boolean;
  manifest: HistoricalCorpusInventoryManifestV1;
  jsonPath: string;
  markdownPath: string;
  expectedJsonSha256: string;
  expectedMarkdownSha256: string;
  actualJsonSha256: string | null;
  actualMarkdownSha256: string | null;
  errorMessages: string[];
}

interface SourceSnapshot {
  files: SnapshotFile[];
  excludedTemporaryPaths: Array<{ path: string; reason: string }>;
  fingerprint: string;
}

interface SnapshotFile {
  repoPath: string;
  absolutePath: string;
  extension: ".json" | ".md" | "unsupported";
  bytes: Buffer;
  text: string | null;
  rawSha256: string;
  normalizedTextSha256: string | null;
  jsonValue: unknown;
  jsonParseStatus: "parsed" | "malformed" | "not_json";
  markdownParseStatus: "parsed" | "malformed" | "not_markdown";
  markdownContent: string | null;
  markdownEnvelope: Record<string, unknown> | null;
  directDefects: HistoricalCorpusInventoryDefectCode[];
}

interface RecordBuild {
  record: HistoricalCorpusInventoryLogicalRecord;
  jsonValue: unknown;
  markdownEnvelope: Record<string, unknown> | null;
  markdownBody: string | null;
  comparableJson: unknown;
  comparableMarkdownBody: string | null;
  structuredPointers: Map<string, { valueHash: string; value: unknown; sourcePath: string }>;
  markdownSections: Map<string, { sectionHash: string; lineRange: [number, number]; sourcePath: string }>;
  rawTexts: Array<{ path: string; text: string }>;
}

const decoder = new TextDecoder("utf-8", { fatal: true });
const artifactIdPattern = /\b[a-z0-9][a-z0-9_-]*\/(?:project|phase-\d{2}|system)\/[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*\b/g;
const repositoryPathPattern = /\bplanning\/[A-Za-z0-9_./-]+\.(?:json|md)\b/g;

export async function collectHistoricalCorpusInventoryV1(
  input: HistoricalCorpusInventoryInput = {},
): Promise<HistoricalCorpusInventoryManifestV1> {
  const repositoryRoot = await resolveRepositoryRoot(input.repositoryRoot);
  const snapshot = await collectSourceSnapshot(repositoryRoot);
  return buildManifestFromSnapshot(repositoryRoot, snapshot, snapshot.fingerprint);
}

export function renderHistoricalCorpusInventoryMarkdownV1(
  manifest: HistoricalCorpusInventoryManifestV1,
): string {
  validateHistoricalCorpusInventoryManifestV1(manifest);
  const lines: string[] = [
    "# Historical Corpus Inventory V1",
    "",
    `Schema version: ${manifest.schemaVersion}`,
    `Source fingerprint: ${manifest.sourceFingerprintBefore}`,
    `Source snapshot stable: ${manifest.sourceSnapshotStable ? "yes" : "no"}`,
    "",
    "## Non-Destructive Verification",
    "",
    "- No corpus mutation was performed.",
    "- The Artifact Registry was read as evidence only.",
    "- Generated output paths and the Implementer Report path were excluded from the source fingerprint.",
    "",
    "## Count Summary",
    "",
    `- Total files: ${manifest.counts.totalFiles}`,
    `- Total logical records: ${manifest.counts.totalLogicalRecords}`,
    `- Complete pairs: ${manifest.counts.completePairs}`,
    `- JSON-only records: ${manifest.counts.jsonOnlyRecords}`,
    `- Markdown-only records: ${manifest.counts.markdownOnlyRecords}`,
    `- Malformed JSON files: ${manifest.counts.malformedJsonFiles}`,
    `- Invalid canonical pairs: ${manifest.counts.invalidCanonicalPairs}`,
    `- Inbound references: ${manifest.counts.inboundReferences}`,
    `- Missing-reference defects: ${manifest.counts.missingReferenceDefects}`,
    "",
    renderCountMap("Counts By Phase", manifest.counts.byPhase),
    renderCountMap("Counts By Artifact Type", manifest.counts.byArtifactType),
    renderCountMap("Counts By Schema Class", manifest.counts.bySchemaClass),
    renderCountMap("Counts By Migration Scope", manifest.counts.byMigrationScope),
    renderCountMap("Counts By Defect Code", manifest.counts.byDefectCode),
    renderCountMap("Duplicate Groups By Kind", manifest.counts.duplicateGroupsByKind),
    "## Duplicate Groups",
    "",
  ];

  if (manifest.duplicateGroups.length === 0) {
    lines.push("- None.", "");
  } else {
    for (const group of manifest.duplicateGroups) {
      lines.push(
        `### ${group.duplicateGroupId}`,
        "",
        `- Kind: ${group.kind}`,
        `- Safety: ${group.resolutionSafety}`,
        `- Proposed survivor: ${group.proposedCanonicalSurvivorRecordId ?? "none"}`,
        `- Candidate survivors: ${group.candidateSurvivorRecordIds.join(", ") || "none"}`,
        `- Members: ${group.memberRecordIds.join(", ")}`,
        `- Paths: ${group.memberPaths.join("; ")}`,
        `- Survivor basis: ${group.survivorBasis.join("; ") || "none"}`,
        `- Required reference updates: ${group.requiredReferenceUpdates.join("; ") || "none"}`,
        `- Unresolved reasons: ${group.unresolvedReasons.join("; ") || "none"}`,
        "",
      );
      if (group.uniqueEvidenceLocations.length > 0) {
        lines.push("Unique evidence locations:");
        for (const evidence of group.uniqueEvidenceLocations) {
          lines.push(uniqueEvidenceLine(evidence));
        }
        lines.push("");
      }
    }
  }

  lines.push("## Ambiguous Groups", "");
  for (const id of manifest.ambiguousOperatorReviewGroupIds) {
    const group = manifest.duplicateGroups.find((candidate) => candidate.duplicateGroupId === id);
    lines.push(`- ${id}: ${group?.unresolvedReasons.join("; ") || "operator review required"}`);
  }
  if (manifest.ambiguousOperatorReviewGroupIds.length === 0) lines.push("- None.");

  lines.push("", "## Malformed, Incomplete, And Unresolved Records", "");
  const surfacedDefects = new Set<HistoricalCorpusInventoryDefectCode>([
    "malformed_json",
    "malformed_markdown_envelope",
    "incomplete_pair",
    "identity_conflict",
    "inbound_reference_to_missing_record",
  ]);
  for (const record of manifest.records.filter((item) => item.defectCodes.some((code) => surfacedDefects.has(code)))) {
    lines.push(`- ${record.recordId}: ${record.defectCodes.join(", ")} (${record.sourcePaths.join("; ")})`);
  }
  if (!manifest.records.some((item) => item.defectCodes.some((code) => surfacedDefects.has(code)))) {
    lines.push("- None.");
  }

  lines.push("", "## Unique Evidence Locations", "");
  const uniqueEvidence = manifest.duplicateGroups.flatMap((group) => group.uniqueEvidenceLocations);
  for (const evidence of uniqueEvidence) lines.push(uniqueEvidenceLine(evidence));
  if (uniqueEvidence.length === 0) lines.push("- None.");

  lines.push("", "## Required Inbound Reference Updates", "");
  const requiredUpdates = manifest.duplicateGroups.flatMap((group) => group.requiredReferenceUpdates);
  for (const update of requiredUpdates) lines.push(`- ${update}`);
  if (requiredUpdates.length === 0) lines.push("- None.");

  lines.push("", "## Generated Output Exclusions", "");
  for (const excluded of manifest.excludedGeneratedPaths) lines.push(`- ${excluded}`);
  if (manifest.excludedTemporaryPaths.length > 0) {
    lines.push("", "## Omitted Temporary Paths", "");
    for (const excluded of manifest.excludedTemporaryPaths) {
      lines.push(`- ${excluded.path}: ${excluded.reason}`);
    }
  }

  lines.push("", "## Statement", "", "No source corpus record, Registry file, Operator approval, disposition, or Git state was changed by this inventory.", "");
  return `${lines.join("\n").replace(/\n{3,}/g, "\n\n")}`;
}

export async function writeHistoricalCorpusInventoryOutputsV1(
  input: HistoricalCorpusInventoryInput = {},
): Promise<HistoricalCorpusInventoryWriteResult> {
  const repositoryRoot = await resolveRepositoryRoot(input.repositoryRoot);
  const before = await collectSourceSnapshot(repositoryRoot);
  const manifest = buildManifestFromSnapshot(repositoryRoot, before, before.fingerprint);
  const markdown = renderHistoricalCorpusInventoryMarkdownV1(manifest);
  const json = stableHistoricalCorpusInventoryJson(manifest);
  const second = await collectSourceSnapshot(repositoryRoot);
  if (before.fingerprint !== second.fingerprint) {
    throw new Error("Source corpus changed during manifest generation; outputs were not written.");
  }

  const jsonPath = path.join(repositoryRoot, historicalCorpusInventoryOutputJsonPath);
  const markdownPath = path.join(repositoryRoot, historicalCorpusInventoryOutputMarkdownPath);
  const previousJson = await readOptional(jsonPath);
  const previousMarkdown = await readOptional(markdownPath);
  await atomicWritePair(jsonPath, json, markdownPath, markdown, previousJson, previousMarkdown);
  const after = await collectSourceSnapshot(repositoryRoot);
  if (after.fingerprint !== before.fingerprint) {
    throw new Error("Source corpus changed after manifest output commit.");
  }
  return {
    manifest,
    jsonPath: historicalCorpusInventoryOutputJsonPath,
    markdownPath: historicalCorpusInventoryOutputMarkdownPath,
    jsonSha256: sha256Utf8(json),
    markdownSha256: sha256Utf8(markdown),
    changedPaths: [
      historicalCorpusInventoryOutputJsonPath,
      historicalCorpusInventoryOutputMarkdownPath,
    ],
  };
}

export async function checkHistoricalCorpusInventoryOutputsV1(
  input: HistoricalCorpusInventoryInput = {},
): Promise<HistoricalCorpusInventoryCheckResult> {
  const repositoryRoot = await resolveRepositoryRoot(input.repositoryRoot);
  const manifest = await collectHistoricalCorpusInventoryV1({ repositoryRoot });
  const expectedJson = stableHistoricalCorpusInventoryJson(manifest);
  const expectedMarkdown = renderHistoricalCorpusInventoryMarkdownV1(manifest);
  const jsonPath = path.join(repositoryRoot, historicalCorpusInventoryOutputJsonPath);
  const markdownPath = path.join(repositoryRoot, historicalCorpusInventoryOutputMarkdownPath);
  const actualJson = await readOptional(jsonPath);
  const actualMarkdown = await readOptional(markdownPath);
  const errorMessages: string[] = [];
  if (!actualJson || actualJson.toString("utf8") !== expectedJson) {
    errorMessages.push(`${historicalCorpusInventoryOutputJsonPath} is stale or missing.`);
  }
  if (!actualMarkdown || actualMarkdown.toString("utf8") !== expectedMarkdown) {
    errorMessages.push(`${historicalCorpusInventoryOutputMarkdownPath} is stale or missing.`);
  }
  return {
    ok: errorMessages.length === 0,
    manifest,
    jsonPath: historicalCorpusInventoryOutputJsonPath,
    markdownPath: historicalCorpusInventoryOutputMarkdownPath,
    expectedJsonSha256: sha256Utf8(expectedJson),
    expectedMarkdownSha256: sha256Utf8(expectedMarkdown),
    actualJsonSha256: actualJson ? sha256Buffer(actualJson) : null,
    actualMarkdownSha256: actualMarkdown ? sha256Buffer(actualMarkdown) : null,
    errorMessages,
  };
}

async function resolveRepositoryRoot(inputRoot: string | undefined): Promise<string> {
  const repositoryRoot = path.resolve(inputRoot ?? process.cwd());
  const packageJson = JSON.parse(await readFile(path.join(repositoryRoot, "package.json"), "utf8")) as { name?: string };
  if (packageJson.name !== "champcity-ai") {
    throw new Error("Historical corpus inventory must run from the champcity-ai repository root.");
  }
  const planning = await stat(path.join(repositoryRoot, "planning"));
  if (!planning.isDirectory()) {
    throw new Error("Historical corpus inventory requires a planning/ directory.");
  }
  return repositoryRoot;
}

async function collectSourceSnapshot(repositoryRoot: string): Promise<SourceSnapshot> {
  const planningRoot = path.join(repositoryRoot, "planning");
  const files: SnapshotFile[] = [];
  const excludedTemporaryPaths: Array<{ path: string; reason: string }> = [];
  const visit = async (directory: string): Promise<void> => {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      const absolutePath = path.join(directory, entry.name);
      const repoPath = toRepoPath(repositoryRoot, absolutePath);
      if (historicalCorpusInventoryGeneratedExclusions.includes(repoPath as (typeof historicalCorpusInventoryGeneratedExclusions)[number])) {
        continue;
      }
      if (isTemporaryName(entry.name)) {
        excludedTemporaryPaths.push({ path: repoPath, reason: "temporary-name-rule" });
        continue;
      }
      if (entry.isSymbolicLink()) {
        files.push({
          repoPath,
          absolutePath,
          extension: "unsupported",
          bytes: Buffer.from(""),
          text: null,
          rawSha256: sha256Buffer(Buffer.from("")),
          normalizedTextSha256: null,
          jsonValue: undefined,
          jsonParseStatus: "not_json",
          markdownParseStatus: "not_markdown",
          markdownContent: null,
          markdownEnvelope: null,
          directDefects: ["unsupported_entry"],
        });
        continue;
      }
      if (entry.isDirectory()) {
        await visit(absolutePath);
        continue;
      }
      if (!entry.isFile()) continue;
      const extension = path.extname(entry.name).toLowerCase();
      if (extension !== ".json" && extension !== ".md") continue;
      files.push(await readSnapshotFile(repositoryRoot, absolutePath, extension as ".json" | ".md"));
    }
  };
  await visit(planningRoot);
  files.sort((left, right) => compareHistoricalCorpusPaths(left.repoPath, right.repoPath));
  excludedTemporaryPaths.sort((left, right) => compareHistoricalCorpusPaths(left.path, right.path));
  return {
    files,
    excludedTemporaryPaths,
    fingerprint: sourceFingerprint(files),
  };
}

async function readSnapshotFile(
  repositoryRoot: string,
  absolutePath: string,
  extension: ".json" | ".md",
): Promise<SnapshotFile> {
  const bytes = await readFile(absolutePath);
  let text: string | null = null;
  let normalizedTextSha256: string | null = null;
  try {
    text = decoder.decode(bytes);
    normalizedTextSha256 = sha256Utf8(text.replace(/\r\n?/g, "\n"));
  } catch {
    text = null;
  }
  let jsonValue: unknown;
  let jsonParseStatus: SnapshotFile["jsonParseStatus"] = "not_json";
  const directDefects: HistoricalCorpusInventoryDefectCode[] = [];
  if (extension === ".json") {
    try {
      jsonValue = JSON.parse(text ?? bytes.toString("utf8"));
      jsonParseStatus = "parsed";
    } catch {
      jsonParseStatus = "malformed";
      directDefects.push("malformed_json");
    }
  }
  let markdownParseStatus: SnapshotFile["markdownParseStatus"] = "not_markdown";
  let markdownContent: string | null = null;
  let markdownEnvelope: Record<string, unknown> | null = null;
  if (extension === ".md" && text !== null) {
    const validation = validateMarkdownEnvelope(text);
    if (validation.valid && validation.parsed) {
      markdownParseStatus = "parsed";
      markdownContent = validation.parsed.contentMarkdown;
      markdownEnvelope = validation.parsed.envelope as unknown as Record<string, unknown>;
    } else if (text.includes("champcity-artifact-envelope")) {
      markdownParseStatus = "malformed";
      directDefects.push("malformed_markdown_envelope");
    } else {
      markdownParseStatus = "not_markdown";
    }
  }
  return {
    repoPath: toRepoPath(repositoryRoot, absolutePath),
    absolutePath,
    extension,
    bytes,
    text,
    rawSha256: sha256Buffer(bytes),
    normalizedTextSha256,
    jsonValue,
    jsonParseStatus,
    markdownParseStatus,
    markdownContent,
    markdownEnvelope,
    directDefects,
  };
}

function buildManifestFromSnapshot(
  repositoryRoot: string,
  snapshot: SourceSnapshot,
  sourceFingerprintAfter: string,
): HistoricalCorpusInventoryManifestV1 {
  const registryEntries = readRegistryEntries(snapshot.files);
  const registryByArtifactId = new Map(registryEntries.map((entry) => [entry.artifactId, entry]));
  const grouped = groupByStem(snapshot.files);
  const recordBuilds = grouped.map((group) => buildLogicalRecord(group, registryByArtifactId));
  const knownArtifactIds = new Map<string, string>();
  const knownPaths = new Map<string, string>();
  for (const build of recordBuilds) {
    if (build.record.observedArtifactId) knownArtifactIds.set(build.record.observedArtifactId, build.record.recordId);
    for (const sourcePath of build.record.sourcePaths) knownPaths.set(sourcePath, build.record.recordId);
    if (build.record.declaredJsonPath) knownPaths.set(build.record.declaredJsonPath, build.record.recordId);
    if (build.record.declaredMarkdownPath) knownPaths.set(build.record.declaredMarkdownPath, build.record.recordId);
  }
  const duplicateGroups = buildDuplicateGroups(recordBuilds);
  const duplicateGroupByRecord = new Map<string, string[]>();
  for (const group of duplicateGroups) {
    for (const recordId of group.memberRecordIds) {
      const existing = duplicateGroupByRecord.get(recordId) ?? [];
      existing.push(group.duplicateGroupId);
      duplicateGroupByRecord.set(recordId, existing);
    }
  }
  for (const build of recordBuilds) {
    build.record.duplicateGroupIds = (duplicateGroupByRecord.get(build.record.recordId) ?? []).sort();
  }
  const inboundReferences = buildInboundReferences(recordBuilds, knownArtifactIds, knownPaths, duplicateGroupByRecord);
  const inboundCountByRecord = new Map<string, number>();
  for (const reference of inboundReferences) {
    for (const targetId of [reference.referencedArtifactId, reference.referencedPath]) {
      if (!targetId) continue;
      const recordId = knownArtifactIds.get(targetId) ?? knownPaths.get(targetId);
      if (recordId) inboundCountByRecord.set(recordId, (inboundCountByRecord.get(recordId) ?? 0) + 1);
    }
  }
  for (const build of recordBuilds) {
    build.record.inboundReferenceCount = inboundCountByRecord.get(build.record.recordId) ?? 0;
  }
  for (const group of duplicateGroups) {
    group.inboundReferences = inboundReferences.filter((reference) =>
      group.memberRecordIds.some((recordId) =>
        reference.referencedArtifactId
          ? knownArtifactIds.get(reference.referencedArtifactId) === recordId
          : reference.referencedPath
            ? knownPaths.get(reference.referencedPath) === recordId
            : false,
      ),
    );
    group.requiredReferenceUpdates = group.proposedCanonicalSurvivorRecordId
      ? group.inboundReferences
          .filter((reference) => {
            const targetRecordId = reference.referencedArtifactId
              ? knownArtifactIds.get(reference.referencedArtifactId)
              : reference.referencedPath
                ? knownPaths.get(reference.referencedPath)
                : null;
            return targetRecordId !== group.proposedCanonicalSurvivorRecordId;
          })
          .map((reference) => `${reference.sourcePath} -> ${group.proposedCanonicalSurvivorRecordId}`)
          .sort()
      : [];
  }
  const missingReferenceDefects = inboundReferences
    .filter((reference) => !reference.targetExists && reference.referencedArtifactId)
    .map((reference) => ({
      code: "inbound_reference_to_missing_record" as const,
      recordIds: [reference.sourceRecordId],
      paths: [reference.sourcePath],
      message: `Missing referenced artifact ID ${reference.referencedArtifactId}.`,
    }));
  for (const defect of missingReferenceDefects) {
    const build = recordBuilds.find((candidate) => candidate.record.recordId === defect.recordIds[0]);
    if (build && !build.record.defectCodes.includes(defect.code)) build.record.defectCodes.push(defect.code);
  }
  for (const build of recordBuilds) build.record.defectCodes.sort();
  const records = recordBuilds.map((build) => build.record).sort((left, right) => left.recordId.localeCompare(right.recordId));
  const defects = buildDefects(records, missingReferenceDefects);
  const files = buildFileInventory(snapshot.files, grouped);
  const manifest: HistoricalCorpusInventoryManifestV1 = {
    schemaVersion: historicalCorpusInventorySchemaVersion,
    projectId: "champcity-ai",
    planningRoot: "planning",
    sourceFingerprintBefore: snapshot.fingerprint,
    sourceFingerprintAfter,
    sourceSnapshotStable: true,
    excludedGeneratedPaths: [...historicalCorpusInventoryGeneratedExclusions].sort(compareHistoricalCorpusPaths),
    excludedTemporaryPaths: snapshot.excludedTemporaryPaths,
    files,
    records,
    duplicateGroups: duplicateGroups.sort((left, right) => left.duplicateGroupId.localeCompare(right.duplicateGroupId)),
    inboundReferences: inboundReferences.sort(compareInboundReferences),
    defects,
    counts: emptyCounts(),
    safeExactConsolidationGroupIds: [],
    ambiguousOperatorReviewGroupIds: [],
    unresolvedRecordIds: [],
  };
  manifest.safeExactConsolidationGroupIds = manifest.duplicateGroups
    .filter((group) => group.resolutionSafety === "safe_exact_consolidation")
    .map((group) => group.duplicateGroupId)
    .sort();
  manifest.ambiguousOperatorReviewGroupIds = manifest.duplicateGroups
    .filter((group) => group.resolutionSafety === "ambiguous_operator_review")
    .map((group) => group.duplicateGroupId)
    .sort();
  manifest.unresolvedRecordIds = manifest.records
    .filter((record) => record.defectCodes.includes("identity_conflict") || record.migrationScope === "unsupported_or_unresolved")
    .map((record) => record.recordId)
    .sort();
  manifest.counts = computeCounts(manifest);
  validateHistoricalCorpusInventoryManifestV1(manifest);
  return manifest;
}

function buildFileInventory(
  files: SnapshotFile[],
  groups: SourceFileGroup[],
): HistoricalCorpusInventoryInputFile[] {
  const pairByPath = new Map<string, string | null>();
  const paired = new Set<string>();
  for (const group of groups) {
    if (group.json && group.markdown) {
      pairByPath.set(group.json.repoPath, group.markdown.repoPath);
      pairByPath.set(group.markdown.repoPath, group.json.repoPath);
      paired.add(group.json.repoPath);
      paired.add(group.markdown.repoPath);
    } else {
      for (const file of group.files) pairByPath.set(file.repoPath, null);
    }
  }
  return files.map((file) => ({
    path: file.repoPath,
    extension: file.extension,
    byteLength: file.bytes.byteLength,
    rawSha256: file.rawSha256,
    normalizedTextSha256: file.normalizedTextSha256,
    utf8: file.text !== null,
    jsonParseStatus: file.jsonParseStatus,
    markdownEnvelopeParseStatus: file.markdownParseStatus,
    underArchive: isArchivePath(file.repoPath),
    partOfSameStemPair: paired.has(file.repoPath),
    pairedPath: pairByPath.get(file.repoPath) ?? null,
    defectCodes: [...file.directDefects].sort(),
  })).sort((left, right) => compareHistoricalCorpusPaths(left.path, right.path));
}

interface SourceFileGroup {
  stem: string;
  files: SnapshotFile[];
  json: SnapshotFile | null;
  markdown: SnapshotFile | null;
}

function groupByStem(files: SnapshotFile[]): SourceFileGroup[] {
  const map = new Map<string, SnapshotFile[]>();
  for (const file of files) {
    const stem = file.extension === "unsupported"
      ? file.repoPath
      : file.repoPath.slice(0, -file.extension.length);
    const existing = map.get(stem) ?? [];
    existing.push(file);
    map.set(stem, existing);
  }
  return [...map.entries()]
    .map(([stem, groupFiles]) => ({
      stem,
      files: groupFiles.sort((left, right) => compareHistoricalCorpusPaths(left.repoPath, right.repoPath)),
      json: groupFiles.find((file) => file.extension === ".json") ?? null,
      markdown: groupFiles.find((file) => file.extension === ".md") ?? null,
    }))
    .sort((left, right) => compareHistoricalCorpusPaths(left.stem, right.stem));
}

function buildLogicalRecord(
  group: SourceFileGroup,
  registryByArtifactId: Map<string, ArtifactRegistryEntry>,
): RecordBuild {
  const sourcePaths = group.files.map((file) => file.repoPath).sort(compareHistoricalCorpusPaths);
  const recordId = `record_${hashCanonical(sourcePaths).slice("sha256:".length)}`;
  const defects = new Set<HistoricalCorpusInventoryDefectCode>();
  for (const file of group.files) for (const defect of file.directDefects) defects.add(defect);
  if (!group.json || !group.markdown) defects.add("incomplete_pair");
  const identityEvidence = buildIdentityEvidence(group, defects);
  const observed = resolveObservedIdentity(identityEvidence, defects);
  const pairVerification = verifyPair(group, defects);
  const schemaClass = classifySchema(group, pairVerification);
  if (schemaClass === "invalid_canonical_pair") defects.add("invalid_canonical_pair");
  const jsonValidation = group.json?.jsonParseStatus === "parsed"
    ? validateCanonicalArtifact(group.json.jsonValue)
    : null;
  if (jsonValidation && !jsonValidation.valid && isCanonicalLikeJson(group.json?.jsonValue)) {
    defects.add("invalid_canonical_artifact");
    for (const issue of jsonValidation.issues) {
      if (issue.code === "payload_hash_mismatch") defects.add("payload_hash_mismatch");
      if (issue.code === "invalid_revision") defects.add("revision_invalid");
      if (issue.code === "invalid_status") defects.add("status_unrecognized");
    }
  }
  const markdownBody = group.markdown?.markdownContent ?? group.markdown?.text ?? null;
  const canonicalJson = jsonValidation?.artifact ?? null;
  const declaredJsonPath = stringValue(canonicalJson?.jsonPath) ??
    stringValue(group.markdown?.markdownEnvelope?.jsonPath) ??
    null;
  const declaredMarkdownPath = stringValue(canonicalJson?.markdownPath) ??
    stringValue(group.markdown?.markdownEnvelope?.markdownPath) ??
    null;
  if (declaredJsonPath && group.json && declaredJsonPath !== group.json.repoPath) defects.add("declared_path_mismatch");
  if (declaredMarkdownPath && group.markdown && declaredMarkdownPath !== group.markdown.repoPath) defects.add("declared_path_mismatch");
  const registry = registryEvidence(observed.artifactId, group, registryByArtifactId, defects);
  const relationships = relationshipValue(canonicalJson?.relationships) ??
    relationshipValue((group.json?.jsonValue as { relationships?: unknown } | undefined)?.relationships) ??
    relationshipValue((recordAt(group.json?.jsonValue, ["payload", "data"]) as { relationships?: unknown } | undefined)?.relationships);
  if (relationships === null && hasRelationshipsCandidate(group.json?.jsonValue)) defects.add("relationship_shape_invalid");
  const archiveLocationStatus = sourcePaths.every(isArchivePath)
    ? "archive"
    : sourcePaths.some(isArchivePath)
      ? "mixed"
      : "non_archive";
  const migrationScope = classifyMigrationScope(sourcePaths, observed, defects);
  const comparableJson = comparableJsonFor(group.json?.jsonValue, group.markdown?.markdownEnvelope ?? null);
  const comparableMarkdownBody = markdownBody ? normalizeText(markdownBody) : null;
  const rawTexts = group.files.flatMap((file) => file.text ? [{ path: file.repoPath, text: file.text }] : []);
  const record: HistoricalCorpusInventoryLogicalRecord = {
    recordId,
    sourcePaths,
    pairStatus: group.json && group.markdown ? "complete_pair" : group.json ? "json_only" : group.markdown ? "markdown_only" : "unsupported_entry",
    schemaClass,
    rawFileHashes: Object.fromEntries(group.files.map((file) => [file.repoPath, file.rawSha256])),
    normalizedContentHashes: Object.fromEntries(group.files.map((file) => [file.repoPath, file.normalizedTextSha256])),
    canonicalPairVerification: pairVerification,
    observedArtifactId: observed.artifactId,
    observedArtifactType: observed.artifactType,
    observedProjectId: observed.projectId,
    observedPhaseId: observed.phaseId,
    observedWorkCardId: observed.workCardId,
    observedRevision: observed.revision,
    observedStatus: observed.status,
    observedParentArtifactId: observed.parentArtifactId,
    observedRelationships: relationships,
    declaredJsonPath,
    declaredMarkdownPath,
    registry,
    archiveLocationStatus,
    identityEvidence: identityEvidence.sort(compareIdentityEvidence),
    identityConfidence: defects.has("identity_conflict")
      ? "conflict"
      : observed.artifactId || observed.artifactType || observed.projectId
        ? identityEvidence.some((item) => item.confidence === "authority") ? "high" : "candidate"
        : "unknown",
    metadataConflicts: metadataConflicts(identityEvidence),
    defectCodes: [...defects].sort(),
    migrationScope,
    inboundReferenceCount: 0,
    duplicateGroupIds: [],
    uniqueEvidenceLocations: [],
    provenanceLocations: sourcePaths,
    semanticKey: semanticKeyFor(observed, defects),
  };
  return {
    record,
    jsonValue: group.json?.jsonValue,
    markdownEnvelope: group.markdown?.markdownEnvelope ?? null,
    markdownBody,
    comparableJson,
    comparableMarkdownBody,
    structuredPointers: collectStructuredPointers(comparableJson, group.json?.repoPath ?? group.markdown?.repoPath ?? sourcePaths[0]),
    markdownSections: collectMarkdownSections(comparableMarkdownBody, group.markdown?.repoPath ?? group.json?.repoPath ?? sourcePaths[0]),
    rawTexts,
  };
}

function buildIdentityEvidence(
  group: SourceFileGroup,
  defects: Set<HistoricalCorpusInventoryDefectCode>,
): HistoricalCorpusInventoryIdentityEvidence[] {
  const evidence: HistoricalCorpusInventoryIdentityEvidence[] = [];
  const addStructured = (
    source: Record<string, unknown> | null,
    sourceKind: HistoricalCorpusInventoryIdentityEvidence["sourceKind"],
    sourcePath: string,
    confidence: HistoricalCorpusInventoryIdentityEvidence["confidence"],
    prefix = "$",
  ): void => {
    if (!source) return;
    const fields: Array<[HistoricalCorpusInventoryIdentityEvidence["field"], string, string]> = [
      ["artifactId", "artifactId", `${prefix}.artifactId`],
      ["artifactType", "artifactType", `${prefix}.artifactType`],
      ["projectId", "projectId", `${prefix}.projectId`],
      ["phaseId", "phaseId", `${prefix}.phaseId`],
      ["workCardId", "workCardId", `${prefix}.workCardId`],
      ["revision", "revision", `${prefix}.revision`],
      ["status", "status", `${prefix}.status`],
      ["parentArtifactId", "parentArtifactId", `${prefix}.parentArtifactId`],
    ];
    for (const [field, key, pointer] of fields) {
      const value = source[key];
      if (typeof value === "string" && value.trim()) {
        evidence.push({ field, value: value.trim(), sourceKind, sourcePath, jsonPointer: pointer, confidence });
      } else if (field === "revision" && Number.isInteger(value)) {
        evidence.push({ field, value: String(value), sourceKind, sourcePath, jsonPointer: pointer, confidence });
      }
    }
  };
  const pair = group.json && group.markdown
    ? verifyArtifactPair({ jsonArtifact: group.json.jsonValue, markdown: group.markdown.text ?? "", jsonPath: group.json.repoPath, markdownPath: group.markdown.repoPath })
    : null;
  if (pair?.valid && pair.artifact) {
    addStructured(pair.artifact as unknown as Record<string, unknown>, "canonical_pair", group.json?.repoPath ?? group.markdown?.repoPath ?? group.stem, "authority");
  }
  const jsonValidation = group.json?.jsonParseStatus === "parsed"
    ? validateCanonicalArtifact(group.json.jsonValue, { verifyPayloadHash: false })
    : null;
  if (jsonValidation?.artifact) {
    addStructured(jsonValidation.artifact as unknown as Record<string, unknown>, "canonical_json", group.json?.repoPath ?? group.stem, "structured");
  }
  if (group.markdown?.markdownEnvelope) {
    addStructured(group.markdown.markdownEnvelope, "markdown_envelope", group.markdown.repoPath, "structured");
  }
  if (group.json?.jsonParseStatus === "parsed" && isRecord(group.json.jsonValue)) {
    addStructured(group.json.jsonValue, "legacy_json", group.json.repoPath, "structured");
    const payloadData = recordAt(group.json.jsonValue, ["payload", "data"]);
    if (isRecord(payloadData)) addStructured(payloadData, "legacy_json", group.json.repoPath, "structured", "$.payload.data");
  }
  for (const sourcePath of group.files.map((file) => file.repoPath)) {
    const phase = sourcePath.match(/(?:^|\/)phases\/(phase-\d{2})(?:\/|$)/)?.[1];
    if (phase) evidence.push({ field: "phaseId", value: phase, sourceKind: "path_candidate", sourcePath, jsonPointer: null, confidence: "candidate" });
    const type = artifactTypeFromPath(sourcePath);
    if (type) evidence.push({ field: "artifactType", value: type, sourceKind: "path_candidate", sourcePath, jsonPointer: null, confidence: "candidate" });
    const workCard = path.basename(sourcePath).match(/\b(WC\d{2}(?:[-_][A-Za-z0-9]+)*)\b/)?.[1];
    if (workCard) evidence.push({ field: "workCardId", value: workCard, sourceKind: "filename_candidate", sourcePath, jsonPointer: null, confidence: "candidate" });
  }
  for (const field of ["revision", "status"] as const) {
    for (const item of evidence.filter((candidate) => candidate.field === field)) {
      if (field === "revision" && !/^[1-9]\d*$/.test(item.value)) defects.add("revision_invalid");
      if (field === "status" && !["active", "pending", "blocked", "superseded", "archived", "historical"].includes(item.value)) {
        defects.add("status_unrecognized");
      }
    }
  }
  return evidence;
}

function resolveObservedIdentity(
  evidence: HistoricalCorpusInventoryIdentityEvidence[],
  defects: Set<HistoricalCorpusInventoryDefectCode>,
): {
  artifactId: string | null;
  artifactType: string | null;
  projectId: string | null;
  phaseId: string | null;
  workCardId: string | null;
  revision: number | null;
  status: string | null;
  parentArtifactId: string | null;
} {
  const select = (field: HistoricalCorpusInventoryIdentityEvidence["field"]): string | null => {
    const values = new Set(evidence.filter((item) => item.field === field).map((item) => item.value));
    if (values.size > 1) {
      defects.add("identity_conflict");
      if (field === "projectId") defects.add("project_mismatch");
      if (field === "phaseId") defects.add("phase_mismatch");
      if (field === "workCardId") defects.add("work_card_mismatch");
      if (field === "artifactType") defects.add("artifact_type_mismatch");
      return null;
    }
    return [...values][0] ?? null;
  };
  const revision = select("revision");
  return {
    artifactId: select("artifactId"),
    artifactType: select("artifactType"),
    projectId: select("projectId"),
    phaseId: select("phaseId"),
    workCardId: select("workCardId"),
    revision: revision && /^[1-9]\d*$/.test(revision) ? Number(revision) : null,
    status: select("status"),
    parentArtifactId: select("parentArtifactId"),
  };
}

function verifyPair(
  group: SourceFileGroup,
  defects: Set<HistoricalCorpusInventoryDefectCode>,
): HistoricalCorpusInventoryCanonicalPairVerification {
  if (!group.json || !group.markdown) {
    return { checked: false, valid: false, synchronized: false, errors: [] };
  }
  const result = verifyArtifactPair({
    jsonArtifact: group.json.jsonValue,
    markdown: group.markdown.text ?? "",
    jsonPath: group.json.repoPath,
    markdownPath: group.markdown.repoPath,
  });
  for (const issue of result.issues) {
    if (issue.code === "payload_hash_mismatch") defects.add("payload_hash_mismatch");
    if (issue.code === "markdown_content_mismatch") defects.add("markdown_body_mismatch");
    if (issue.code === "json_path_mismatch" || issue.code === "markdown_path_mismatch") defects.add("declared_path_mismatch");
  }
  return {
    checked: true,
    valid: result.valid,
    synchronized: result.synchronized,
    errors: result.errors,
  };
}

function classifySchema(
  group: SourceFileGroup,
  pairVerification: HistoricalCorpusInventoryCanonicalPairVerification,
): HistoricalCorpusInventorySchemaClass {
  if (group.files.some((file) => file.repoPath.includes("/system/"))) return "system_index_record";
  if (group.files.some((file) => file.repoPath.includes("/phase-07/"))) return "generated_bootstrap_control_record";
  if (group.json?.jsonParseStatus === "malformed") return "malformed_json";
  if (group.markdown?.markdownParseStatus === "malformed") return "malformed_markdown_envelope";
  const jsonCanonical = group.json?.jsonParseStatus === "parsed" && isCanonicalLikeJson(group.json.jsonValue);
  const markdownCanonical = group.markdown?.markdownParseStatus === "parsed";
  if (group.json && group.markdown && jsonCanonical && markdownCanonical) {
    return pairVerification.valid ? "valid_synchronized_canonical_pair" : "invalid_canonical_pair";
  }
  if (jsonCanonical && !group.markdown) return "incomplete_canonical_pair";
  if (markdownCanonical && !group.json) return "canonical_markdown_envelope_with_absent_or_invalid_json";
  if (jsonCanonical) return "valid_canonical_json_with_noncanonical_or_absent_markdown";
  if (markdownCanonical) return "canonical_markdown_envelope_with_absent_or_invalid_json";
  if (group.json && group.markdown && group.json.jsonParseStatus === "parsed") return "parseable_legacy_json_markdown_pair";
  if (group.json && group.json.jsonParseStatus === "parsed") return "parseable_legacy_json_only";
  if (group.markdown) return "plain_markdown_only";
  return "mixed_canonical_legacy_pair";
}

function registryEvidence(
  artifactId: string | null,
  group: SourceFileGroup,
  registryByArtifactId: Map<string, ArtifactRegistryEntry>,
  defects: Set<HistoricalCorpusInventoryDefectCode>,
): HistoricalCorpusInventoryRegistryEvidence {
  if (!artifactId) {
    return { exists: false, agreement: "not_resolvable", entry: null, disagreements: [] };
  }
  const entry = registryByArtifactId.get(artifactId);
  if (!entry) {
    defects.add("registry_missing_entry");
    return { exists: false, agreement: "missing", entry: null, disagreements: ["registry_missing_entry"] };
  }
  const disagreements: HistoricalCorpusInventoryDefectCode[] = [];
  const json = group.json;
  const markdown = group.markdown;
  const artifact = json?.jsonParseStatus === "parsed" && isRecord(json.jsonValue) ? json.jsonValue : null;
  if (json && entry.jsonPath !== json.repoPath) disagreements.push("registry_path_disagreement");
  if (markdown && entry.markdownPath !== markdown.repoPath) disagreements.push("registry_path_disagreement");
  if (json && entry.payloadHash !== stringValue(artifact?.payloadHash)) disagreements.push("registry_hash_disagreement");
  const revision = numberValue(artifact?.revision);
  if (revision !== null && entry.revision !== revision) disagreements.push("registry_stale_entry");
  const status = stringValue(artifact?.status);
  if (status && entry.status !== status) disagreements.push("registry_stale_entry");
  for (const disagreement of disagreements) defects.add(disagreement);
  return {
    exists: true,
    agreement: disagreements.length > 0 ? "disagrees" : "agrees",
    entry: {
      revision: entry.revision,
      payloadHash: entry.payloadHash,
      status: entry.status,
      jsonPath: entry.jsonPath,
      markdownPath: entry.markdownPath,
    },
    disagreements: [...new Set(disagreements)].sort(),
  };
}

function readRegistryEntries(files: SnapshotFile[]): ArtifactRegistryEntry[] {
  const registryFile = files.find((file) => file.repoPath === "planning/system/Artifact_Registry/ARTIFACT_REGISTRY.json");
  if (!registryFile || !isRecord(registryFile.jsonValue)) return [];
  const entries = recordAt(registryFile.jsonValue, ["payload", "data", "entries"]);
  return Array.isArray(entries) ? entries.filter(isRegistryEntry) : [];
}

function buildDuplicateGroups(recordBuilds: RecordBuild[]): HistoricalCorpusInventoryDuplicateGroup[] {
  const groups: HistoricalCorpusInventoryDuplicateGroup[] = [];
  const addGroup = (
    kind: HistoricalCorpusInventoryDuplicateGroupKind,
    members: RecordBuild[],
    semanticKey: string | null = null,
  ): void => {
    const uniqueMembers = uniqueBy(members, (item) => item.record.recordId)
      .sort((left, right) => left.record.recordId.localeCompare(right.record.recordId));
    if (uniqueMembers.length < 2) return;
    const memberRecordIds = uniqueMembers.map((item) => item.record.recordId);
    const memberPaths = uniqueMembers.flatMap((item) => item.record.sourcePaths).sort(compareHistoricalCorpusPaths);
    const duplicateGroupId = `group_${hashCanonical({ kind, semanticKey, memberRecordIds }).slice("sha256:".length)}`;
    const uniqueEvidenceLocations = kind === "semantic_duplicate_candidate"
      ? uniqueEvidenceFor(uniqueMembers)
      : [];
    const candidateSurvivorRecordIds = orderedSurvivorCandidates(uniqueMembers);
    const exactAndSafe = kind === "exact_record_content_duplicate" &&
      uniqueEvidenceLocations.length === 0 &&
      uniqueMembers.every((item) => item.record.metadataConflicts.length === 0);
    const resolutionSafety = exactAndSafe
      ? "safe_exact_consolidation"
      : kind === "exact_file_content_duplicate"
        ? "not_a_merge_candidate"
        : "ambiguous_operator_review";
    const proposedCanonicalSurvivorRecordId = resolutionSafety === "safe_exact_consolidation"
      ? candidateSurvivorRecordIds[0] ?? null
      : null;
    const unresolvedReasons = resolutionSafety === "ambiguous_operator_review"
      ? [
          "Duplicate group contains unique evidence or unresolved metadata conflicts.",
          "WC02 may not choose a survivor for ambiguous groups.",
        ]
      : [];
    for (const item of uniqueMembers) {
      if (!item.record.defectCodes.includes(kindToDefect(kind))) item.record.defectCodes.push(kindToDefect(kind));
      item.record.uniqueEvidenceLocations.push(...uniqueEvidenceLocations.filter((evidence) => evidence.sourceRecordId === item.record.recordId));
    }
    groups.push({
      duplicateGroupId,
      kind,
      semanticKey,
      memberRecordIds,
      memberPaths,
      resolutionSafety,
      proposedCanonicalSurvivorRecordId,
      candidateSurvivorRecordIds,
      survivorBasis: survivorBasis(uniqueMembers),
      uniqueEvidenceLocations,
      inboundReferences: [],
      requiredReferenceUpdates: [],
      unresolvedReasons,
    });
  };

  groupRecordBuilds(recordBuilds, (item) => item.record.observedArtifactId)
    .forEach((members) => addGroup("duplicate_artifact_id", members));
  groupRecordBuilds(recordBuilds, (item) => item.record.declaredJsonPath ? `json:${item.record.declaredJsonPath}` : null)
    .forEach((members) => addGroup("duplicate_declared_path", members));
  groupRecordBuilds(recordBuilds, (item) => item.record.declaredMarkdownPath ? `md:${item.record.declaredMarkdownPath}` : null)
    .forEach((members) => addGroup("duplicate_declared_path", members));
  const fileHashMap = new Map<string, RecordBuild[]>();
  for (const build of recordBuilds) {
    for (const [sourcePath, hash] of Object.entries(build.record.rawFileHashes)) {
      const extension = path.extname(sourcePath);
      if (!hash) continue;
      const key = `${extension}:${hash}`;
      const existing = fileHashMap.get(key) ?? [];
      existing.push(build);
      fileHashMap.set(key, existing);
    }
  }
  [...fileHashMap.values()].forEach((members) => addGroup("exact_file_content_duplicate", members));
  const exactGroupsByKey = groupRecordBuilds(recordBuilds, (item) =>
    hashCanonical({
      json: item.comparableJson,
      markdown: item.comparableMarkdownBody,
    }),
  );
  exactGroupsByKey.forEach((members) => addGroup("exact_record_content_duplicate", members));
  const exactDuplicateMemberSets = new Set(
    exactGroupsByKey
      .map((members) => members.map((item) => item.record.recordId).sort().join("|")),
  );
  groupRecordBuilds(recordBuilds, (item) => item.record.semanticKey)
    .forEach((members) => {
      const memberSet = members.map((item) => item.record.recordId).sort().join("|");
      if (!exactDuplicateMemberSets.has(memberSet)) {
        addGroup("semantic_duplicate_candidate", members, members[0]?.record.semanticKey ?? null);
      }
    });
  return uniqueBy(groups, (group) => group.duplicateGroupId);
}

function buildInboundReferences(
  recordBuilds: RecordBuild[],
  knownArtifactIds: Map<string, string>,
  knownPaths: Map<string, string>,
  duplicateGroupByRecord: Map<string, string[]>,
): HistoricalCorpusInventoryInboundReference[] {
  const references: HistoricalCorpusInventoryInboundReference[] = [];
  const push = (reference: HistoricalCorpusInventoryInboundReference): void => {
    references.push(reference);
  };
  for (const build of recordBuilds) {
    const inspectValue = (value: unknown, pointer: string, sourcePath: string): void => {
      if (typeof value === "string") {
        for (const artifactId of extractArtifactIds(value)) {
          const targetRecord = knownArtifactIds.get(artifactId) ?? null;
          push({
            sourceRecordId: build.record.recordId,
            sourcePath,
            referencedArtifactId: artifactId,
            referencedPath: null,
            referenceKind: "structured",
            jsonPointer: pointer,
            lineNumber: null,
            targetExists: targetRecord !== null,
            duplicateGroupId: firstDuplicateGroup(targetRecord, duplicateGroupByRecord),
          });
        }
        for (const repoPath of extractRepositoryPaths(value)) {
          const targetRecord = knownPaths.get(repoPath) ?? null;
          push({
            sourceRecordId: build.record.recordId,
            sourcePath,
            referencedArtifactId: null,
            referencedPath: repoPath,
            referenceKind: "structured",
            jsonPointer: pointer,
            lineNumber: null,
            targetExists: targetRecord !== null,
            duplicateGroupId: firstDuplicateGroup(targetRecord, duplicateGroupByRecord),
          });
        }
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => inspectValue(item, `${pointer}/${index}`, sourcePath));
      } else if (isRecord(value)) {
        for (const key of Object.keys(value).sort()) {
          inspectValue(value[key], `${pointer}/${escapeJsonPointer(key)}`, sourcePath);
        }
      }
    };
    if (build.jsonValue !== undefined) inspectValue(build.jsonValue, "", build.record.sourcePaths[0] ?? "");
    if (build.markdownEnvelope) inspectValue(build.markdownEnvelope, "", build.record.sourcePaths.find((item) => item.endsWith(".md")) ?? build.record.sourcePaths[0] ?? "");
    for (const raw of build.rawTexts) {
      const lines = raw.text.replace(/\r\n?/g, "\n").split("\n");
      lines.forEach((line, index) => {
        for (const artifactId of extractArtifactIds(line)) {
          const targetRecord = knownArtifactIds.get(artifactId) ?? null;
          push({
            sourceRecordId: build.record.recordId,
            sourcePath: raw.path,
            referencedArtifactId: artifactId,
            referencedPath: null,
            referenceKind: "text",
            jsonPointer: null,
            lineNumber: index + 1,
            targetExists: targetRecord !== null,
            duplicateGroupId: firstDuplicateGroup(targetRecord, duplicateGroupByRecord),
          });
        }
        for (const repoPath of extractRepositoryPaths(line)) {
          const targetRecord = knownPaths.get(repoPath) ?? null;
          push({
            sourceRecordId: build.record.recordId,
            sourcePath: raw.path,
            referencedArtifactId: null,
            referencedPath: repoPath,
            referenceKind: "text",
            jsonPointer: null,
            lineNumber: index + 1,
            targetExists: targetRecord !== null,
            duplicateGroupId: firstDuplicateGroup(targetRecord, duplicateGroupByRecord),
          });
        }
      });
    }
  }
  return uniqueBy(references, (reference) => canonicalStringify(reference));
}

function buildDefects(
  records: HistoricalCorpusInventoryLogicalRecord[],
  additional: HistoricalCorpusInventoryDefectOccurrence[],
): HistoricalCorpusInventoryDefectOccurrence[] {
  const defects: HistoricalCorpusInventoryDefectOccurrence[] = [];
  for (const record of records) {
    for (const code of record.defectCodes) {
      defects.push({
        code,
        recordIds: [record.recordId],
        paths: record.sourcePaths,
        message: `${code} affects ${record.recordId}.`,
      });
    }
  }
  defects.push(...additional);
  return uniqueBy(defects, (defect) => canonicalStringify(defect))
    .sort((left, right) => left.code.localeCompare(right.code) || left.recordIds.join("|").localeCompare(right.recordIds.join("|")));
}

function computeCounts(manifest: HistoricalCorpusInventoryManifestV1): HistoricalCorpusInventoryManifestV1["counts"] {
  const counts = emptyCounts();
  counts.totalFiles = manifest.files.length;
  counts.totalLogicalRecords = manifest.records.length;
  counts.completePairs = manifest.records.filter((record) => record.pairStatus === "complete_pair").length;
  counts.jsonOnlyRecords = manifest.records.filter((record) => record.pairStatus === "json_only").length;
  counts.markdownOnlyRecords = manifest.records.filter((record) => record.pairStatus === "markdown_only").length;
  counts.malformedJsonFiles = manifest.files.filter((file) => file.jsonParseStatus === "malformed").length;
  counts.invalidCanonicalPairs = manifest.records.filter((record) => record.schemaClass === "invalid_canonical_pair").length;
  counts.byExtension = countBy(manifest.files, (file) => file.extension);
  counts.byArtifactType = countBy(manifest.records, (record) => record.observedArtifactType ?? "null");
  counts.byPhase = countBy(manifest.records, (record) => record.observedPhaseId ?? "project-or-none");
  counts.byStatus = countBy(manifest.records, (record) => record.observedStatus ?? "null");
  counts.bySchemaClass = countBy(manifest.records, (record) => record.schemaClass);
  counts.byMigrationScope = countBy(manifest.records, (record) => record.migrationScope);
  counts.byDefectCode = countBy(manifest.defects, (defect) => defect.code);
  for (const code of historicalCorpusInventoryDefectCodes) counts.byDefectCode[code] = counts.byDefectCode[code] ?? 0;
  counts.duplicateGroupsByKind = countBy(manifest.duplicateGroups, (group) => group.kind);
  counts.safeExactGroups = manifest.safeExactConsolidationGroupIds.length;
  counts.ambiguousGroups = manifest.ambiguousOperatorReviewGroupIds.length;
  counts.recordsWithUniqueEvidence = manifest.records.filter((record) => record.uniqueEvidenceLocations.length > 0).length;
  counts.inboundReferences = manifest.inboundReferences.length;
  counts.missingReferenceDefects = manifest.defects.filter((defect) => defect.code === "inbound_reference_to_missing_record").length;
  return counts;
}

function emptyCounts(): HistoricalCorpusInventoryManifestV1["counts"] {
  return {
    totalFiles: 0,
    totalLogicalRecords: 0,
    completePairs: 0,
    jsonOnlyRecords: 0,
    markdownOnlyRecords: 0,
    malformedJsonFiles: 0,
    invalidCanonicalPairs: 0,
    byExtension: {},
    byArtifactType: {},
    byPhase: {},
    byStatus: {},
    bySchemaClass: {},
    byMigrationScope: {},
    byDefectCode: {},
    duplicateGroupsByKind: {},
    safeExactGroups: 0,
    ambiguousGroups: 0,
    recordsWithUniqueEvidence: 0,
    inboundReferences: 0,
    missingReferenceDefects: 0,
  };
}

function classifyMigrationScope(
  sourcePaths: string[],
  observed: { phaseId: string | null },
  defects: Set<HistoricalCorpusInventoryDefectCode>,
): HistoricalCorpusInventoryMigrationScopeClass {
  if (sourcePaths.some((sourcePath) => sourcePath.startsWith("planning/archive/"))) return "archive_provenance";
  if (sourcePaths.some((sourcePath) => sourcePath.startsWith("planning/system/"))) return "system_index_or_diagnostic";
  if (observed.phaseId === "phase-07" || sourcePaths.some((sourcePath) => sourcePath.includes("/phase-07/"))) return "current_phase_control";
  if (defects.has("malformed_json") || defects.has("identity_conflict") || defects.has("unsupported_entry")) return "unsupported_or_unresolved";
  return "historical_migration_candidate";
}

function semanticKeyFor(
  observed: {
    projectId: string | null;
    phaseId: string | null;
    artifactType: string | null;
    workCardId: string | null;
    parentArtifactId: string | null;
  },
  defects: Set<HistoricalCorpusInventoryDefectCode>,
): string | null {
  if (defects.has("identity_conflict") || !observed.projectId || !observed.artifactType) return null;
  return [
    observed.projectId,
    observed.phaseId ?? "project",
    observed.artifactType,
    observed.workCardId ?? "none",
    observed.parentArtifactId ?? "none",
  ].join("|");
}

function comparableJsonFor(jsonValue: unknown, markdownEnvelope: Record<string, unknown> | null): unknown {
  const value = jsonValue === undefined ? markdownEnvelope : jsonValue;
  return stripLocationFields(value);
}

function stripLocationFields(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripLocationFields);
  if (!isRecord(value)) return value as JsonValue;
  const omitted = new Set(["jsonPath", "markdownPath", "payloadHash"]);
  return Object.fromEntries(
    Object.keys(value)
      .filter((key) => !omitted.has(key))
      .sort()
      .map((key) => [key, stripLocationFields(value[key])]),
  );
}

function collectStructuredPointers(
  value: unknown,
  sourcePath: string,
): Map<string, { valueHash: string; value: unknown; sourcePath: string }> {
  const result = new Map<string, { valueHash: string; value: unknown; sourcePath: string }>();
  const visit = (node: unknown, pointer: string): void => {
    if (Array.isArray(node)) {
      node.forEach((item, index) => visit(item, `${pointer}/${index}`));
      return;
    }
    if (isRecord(node)) {
      for (const key of Object.keys(node).sort()) visit(node[key], `${pointer}/${escapeJsonPointer(key)}`);
      return;
    }
    result.set(pointer || "/", { valueHash: hashCanonical(node), value: node, sourcePath });
  };
  visit(value, "");
  return result;
}

function collectMarkdownSections(
  markdown: string | null,
  sourcePath: string,
): Map<string, { sectionHash: string; lineRange: [number, number]; sourcePath: string }> {
  const result = new Map<string, { sectionHash: string; lineRange: [number, number]; sourcePath: string }>();
  if (!markdown) return result;
  const lines = normalizeText(markdown).split("\n");
  let heading = "(root)";
  let start = 1;
  let buffer: string[] = [];
  const flush = (end: number): void => {
    const content = buffer.join("\n").trim();
    result.set(heading, {
      sectionHash: sha256Utf8(content),
      lineRange: [start, Math.max(start, end)],
      sourcePath,
    });
  };
  lines.forEach((line, index) => {
    const match = line.match(/^(#{1,6})\s+(.*)$/);
    if (match) {
      flush(index);
      heading = `${match[1].length}:${match[2].trim()}`;
      start = index + 1;
      buffer = [line];
    } else {
      buffer.push(line);
    }
  });
  flush(lines.length);
  return result;
}

function uniqueEvidenceFor(members: RecordBuild[]): HistoricalCorpusInventoryUniqueEvidenceLocation[] {
  const evidence: HistoricalCorpusInventoryUniqueEvidenceLocation[] = [];
  const allPointers = new Set(members.flatMap((member) => [...member.structuredPointers.keys()]));
  for (const pointer of [...allPointers].sort()) {
    const hashes = new Map<string, RecordBuild[]>();
    for (const member of members) {
      const item = member.structuredPointers.get(pointer);
      if (!item) continue;
      const existing = hashes.get(item.valueHash) ?? [];
      existing.push(member);
      hashes.set(item.valueHash, existing);
    }
    if (hashes.size > 1 || [...hashes.values()].some((items) => items.length !== members.length)) {
      for (const [valueHash, owners] of hashes) {
        if (owners.length === members.length) continue;
        for (const owner of owners) {
          const item = owner.structuredPointers.get(pointer);
          if (!item) continue;
          evidence.push({
            sourceRecordId: owner.record.recordId,
            sourcePath: item.sourcePath,
            kind: "structured",
            jsonPointer: pointer,
            headingPath: null,
            lineRange: null,
            valueHash,
            preview: scalarPreview(item.value),
          });
        }
      }
    }
  }
  const allSections = new Set(members.flatMap((member) => [...member.markdownSections.keys()]));
  for (const section of [...allSections].sort()) {
    const hashes = new Map<string, RecordBuild[]>();
    for (const member of members) {
      const item = member.markdownSections.get(section);
      if (!item) continue;
      const existing = hashes.get(item.sectionHash) ?? [];
      existing.push(member);
      hashes.set(item.sectionHash, existing);
    }
    if (hashes.size > 1 || [...hashes.values()].some((items) => items.length !== members.length)) {
      for (const [valueHash, owners] of hashes) {
        if (owners.length === members.length) continue;
        for (const owner of owners) {
          const item = owner.markdownSections.get(section);
          if (!item) continue;
          evidence.push({
            sourceRecordId: owner.record.recordId,
            sourcePath: item.sourcePath,
            kind: "markdown",
            jsonPointer: null,
            headingPath: section,
            lineRange: item.lineRange,
            valueHash,
            preview: null,
          });
        }
      }
    }
  }
  return uniqueBy(evidence, (item) => canonicalStringify(item)).sort((left, right) =>
    left.sourceRecordId.localeCompare(right.sourceRecordId) ||
    left.sourcePath.localeCompare(right.sourcePath) ||
    (left.jsonPointer ?? left.headingPath ?? "").localeCompare(right.jsonPointer ?? right.headingPath ?? ""),
  );
}

function orderedSurvivorCandidates(members: RecordBuild[]): string[] {
  return [...members]
    .sort((left, right) =>
      survivorScore(right) - survivorScore(left) ||
      firstPath(left).localeCompare(firstPath(right)) ||
      left.record.recordId.localeCompare(right.record.recordId),
    )
    .map((item) => item.record.recordId);
}

function survivorScore(member: RecordBuild): number {
  return (
    (member.record.schemaClass === "valid_synchronized_canonical_pair" ? 100 : 0) +
    (member.record.archiveLocationStatus === "non_archive" ? 10 : 0) +
    (member.record.registry.agreement === "agrees" ? 1 : 0)
  );
}

function survivorBasis(members: RecordBuild[]): string[] {
  const selected = orderedSurvivorCandidates(members)[0];
  if (!selected) return [];
  const member = members.find((candidate) => candidate.record.recordId === selected);
  return [
    "valid synchronized canonical pair before incomplete or legacy record",
    "non-archive path before archive path",
    "Registry-agreeing path before unregistered or disagreeing path",
    `deterministic selected candidate: ${member?.record.recordId ?? selected}`,
  ];
}

function firstPath(member: RecordBuild): string {
  return member.record.declaredJsonPath ?? member.record.sourcePaths.find((item) => item.endsWith(".json")) ?? member.record.sourcePaths[0] ?? "";
}

function kindToDefect(kind: HistoricalCorpusInventoryDuplicateGroupKind): HistoricalCorpusInventoryDefectCode {
  if (kind === "duplicate_declared_path") return "duplicate_declared_json_path";
  return kind;
}

function metadataConflicts(evidence: HistoricalCorpusInventoryIdentityEvidence[]): string[] {
  const conflicts: string[] = [];
  for (const field of ["artifactId", "artifactType", "projectId", "phaseId", "workCardId", "revision", "status", "parentArtifactId"] as const) {
    const values = [...new Set(evidence.filter((item) => item.field === field).map((item) => item.value))].sort();
    if (values.length > 1) conflicts.push(`${field}: ${values.join(" | ")}`);
  }
  return conflicts;
}

function relationshipValue(value: unknown): Record<string, string[]> | null {
  if (!isRecord(value)) return null;
  const keys = ["sources", "expectedOutputs", "supersedes", "children"];
  if (!keys.every((key) => Array.isArray(value[key]) && (value[key] as unknown[]).every((item) => typeof item === "string"))) {
    return null;
  }
  return Object.fromEntries(keys.map((key) => [key, [...(value[key] as string[])].sort()]));
}

function hasRelationshipsCandidate(value: unknown): boolean {
  if (isRecord(value) && Object.prototype.hasOwnProperty.call(value, "relationships")) return true;
  const payloadData = recordAt(value, ["payload", "data"]);
  return isRecord(payloadData) && Object.prototype.hasOwnProperty.call(payloadData, "relationships");
}

function artifactTypeFromPath(repoPath: string): string | null {
  const segments = repoPath.split("/");
  for (const [directory, artifactType] of historicalCorpusInventoryDirectoryArtifactTypeMappings) {
    if (segments.includes(directory)) return artifactType;
  }
  return null;
}

function compareIdentityEvidence(
  left: HistoricalCorpusInventoryIdentityEvidence,
  right: HistoricalCorpusInventoryIdentityEvidence,
): number {
  return left.field.localeCompare(right.field) ||
    left.value.localeCompare(right.value) ||
    left.sourceKind.localeCompare(right.sourceKind) ||
    left.sourcePath.localeCompare(right.sourcePath);
}

function compareInboundReferences(
  left: HistoricalCorpusInventoryInboundReference,
  right: HistoricalCorpusInventoryInboundReference,
): number {
  return left.sourceRecordId.localeCompare(right.sourceRecordId) ||
    left.sourcePath.localeCompare(right.sourcePath) ||
    (left.lineNumber ?? 0) - (right.lineNumber ?? 0) ||
    (left.jsonPointer ?? "").localeCompare(right.jsonPointer ?? "") ||
    (left.referencedArtifactId ?? left.referencedPath ?? "").localeCompare(right.referencedArtifactId ?? right.referencedPath ?? "");
}

function groupRecordBuilds(
  records: RecordBuild[],
  keyFor: (record: RecordBuild) => string | null,
): RecordBuild[][] {
  const groups = new Map<string, RecordBuild[]>();
  for (const record of records) {
    const key = keyFor(record);
    if (!key) continue;
    const existing = groups.get(key) ?? [];
    existing.push(record);
    groups.set(key, existing);
  }
  return [...groups.values()].filter((group) => group.length > 1);
}

function countBy<T>(values: readonly T[], keyFor: (value: T) => string): Record<string, number> {
  const result: Record<string, number> = {};
  for (const value of values) {
    const key = keyFor(value);
    result[key] = (result[key] ?? 0) + 1;
  }
  return sortRecord(result) as Record<string, number>;
}

function sortRecord(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, value[key]]));
}

function sourceFingerprint(files: SnapshotFile[]): string {
  return hashCanonical(files.map((file) => ({ path: file.repoPath, rawSha256: file.rawSha256 })));
}

async function atomicWritePair(
  jsonPath: string,
  json: string,
  markdownPath: string,
  markdown: string,
  previousJson: Buffer | null,
  previousMarkdown: Buffer | null,
): Promise<void> {
  await writeAtomic(jsonPath, json);
  try {
    await writeAtomic(markdownPath, markdown);
  } catch (error) {
    if (previousJson) await writeFile(jsonPath, previousJson);
    else await rm(jsonPath, { force: true });
    if (previousMarkdown) await writeFile(markdownPath, previousMarkdown);
    throw error;
  }
}

async function writeAtomic(targetPath: string, content: string): Promise<void> {
  await mkdir(path.dirname(targetPath), { recursive: true });
  const temporaryPath = `${targetPath}.tmp-${process.pid}`;
  await writeFile(temporaryPath, content, "utf8");
  await rename(temporaryPath, targetPath);
}

async function readOptional(targetPath: string): Promise<Buffer | null> {
  try {
    return await readFile(targetPath);
  } catch {
    return null;
  }
}

function renderCountMap(title: string, counts: Record<string, number>): string {
  const lines = [`## ${title}`, ""];
  const entries = Object.entries(counts).sort(([left], [right]) => left.localeCompare(right));
  if (entries.length === 0) lines.push("- None.");
  else for (const [key, count] of entries) lines.push(`- ${key}: ${count}`);
  lines.push("");
  return lines.join("\n");
}

function uniqueEvidenceLine(evidence: HistoricalCorpusInventoryUniqueEvidenceLocation): string {
  const locator = evidence.kind === "structured"
    ? evidence.jsonPointer ?? "/"
    : `${evidence.headingPath ?? "(root)"} lines ${evidence.lineRange?.join("-") ?? "unknown"}`;
  return `- ${evidence.sourceRecordId} ${evidence.sourcePath} ${locator} ${evidence.valueHash}${evidence.preview ? ` preview=${evidence.preview}` : ""}`;
}

function extractArtifactIds(text: string): string[] {
  return [...text.matchAll(artifactIdPattern)].map((match) => match[0]).sort();
}

function extractRepositoryPaths(text: string): string[] {
  return [...text.matchAll(repositoryPathPattern)].map((match) => match[0]).sort();
}

function firstDuplicateGroup(recordId: string | null, duplicateGroupByRecord: Map<string, string[]>): string | null {
  return recordId ? (duplicateGroupByRecord.get(recordId) ?? [])[0] ?? null : null;
}

function uniqueBy<T>(values: readonly T[], keyFor: (value: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const value of values) {
    const key = keyFor(value);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

function isRegistryEntry(value: unknown): value is ArtifactRegistryEntry {
  return isRecord(value) &&
    typeof value.artifactId === "string" &&
    typeof value.artifactType === "string" &&
    typeof value.projectId === "string" &&
    typeof value.jsonPath === "string" &&
    typeof value.markdownPath === "string" &&
    typeof value.payloadHash === "string" &&
    Number.isInteger(value.revision) &&
    typeof value.status === "string";
}

function isCanonicalLikeJson(value: unknown): boolean {
  return isRecord(value) && value.schemaVersion === "champcity.artifact.v1";
}

function recordAt(value: unknown, pathSegments: string[]): unknown {
  let current = value;
  for (const segment of pathSegments) {
    if (!isRecord(current)) return undefined;
    current = current[segment];
  }
  return current;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(value: unknown): number | null {
  return Number.isInteger(value) ? value as number : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeText(value: string): string {
  return value.replace(/\r\n?/g, "\n").trimEnd();
}

function scalarPreview(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean" && value !== null) return null;
  const preview = String(value);
  return preview.length > 120 ? `${preview.slice(0, 117)}...` : preview;
}

function escapeJsonPointer(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

function isArchivePath(repoPath: string): boolean {
  return repoPath.startsWith("planning/archive/") || repoPath.includes("/archive/");
}

function isTemporaryName(name: string): boolean {
  return name.startsWith(".") || name.includes(".tmp-") || name.endsWith(".tmp") || name.endsWith(".bak") || name.endsWith("~");
}

function toRepoPath(repositoryRoot: string, absolutePath: string): string {
  const relative = path.relative(repositoryRoot, absolutePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Historical corpus inventory attempted to expose a path outside the repository.");
  }
  return relative.replaceAll("\\", "/");
}

function hashCanonical(value: unknown): string {
  return sha256Utf8(canonicalStringify(value));
}

function sha256Utf8(value: string): string {
  return `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`;
}

function sha256Buffer(value: Buffer): string {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}
