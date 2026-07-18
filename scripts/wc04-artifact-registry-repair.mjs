import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);

const {
  buildArtifactRegistry,
  buildArtifactRegistryEntry,
  buildCanonicalArtifact,
  canonicalPrettyStringify,
  canonicalStringify,
  renderArtifactMarkdown,
  renderArtifactRegistryContentMarkdown,
  validateArtifactRegistry,
  verifyArtifactPair,
} = require("../dist/shared/artifacts");
const {
  ARTIFACT_REGISTRY_JSON_PATH,
  ARTIFACT_REGISTRY_MARKDOWN_PATH,
  ArtifactPairService,
} = require("../dist/main/artifacts");

const REGISTRY_TITLE = "Canonical Artifact Registry";
const CANDIDATE_PAIRS = [
  {
    label: "WC04 Work Card",
    expectedArtifactId: "champcity-ai/phase-06/work_card/WC04",
    expectedRevision: 3,
    jsonPath:
      "planning/phases/phase-06/Work_Cards/WC04_artifact_registry_schema_repair_and_recovery_candidate_registration.json",
    markdownPath:
      "planning/phases/phase-06/Work_Cards/WC04_artifact_registry_schema_repair_and_recovery_candidate_registration.md",
  },
  {
    label: "WC04 Operator Approval",
    expectedArtifactId: "champcity-ai/phase-06/operator_approval/WC04",
    expectedRevision: 3,
    jsonPath:
      "planning/phases/phase-06/Operator_Approvals/OPERATOR_APPROVAL_WC04_artifact_registry_schema_repair_and_recovery_candidate_registration.json",
    markdownPath:
      "planning/phases/phase-06/Operator_Approvals/OPERATOR_APPROVAL_WC04_artifact_registry_schema_repair_and_recovery_candidate_registration.md",
  },
  {
    label: "WC04 Architect Review",
    expectedArtifactId: "champcity-ai/phase-06/architect_review/WC04",
    expectedRevision: 1,
    jsonPath:
      "planning/phases/phase-06/Architect_Reviews/ARCHITECT_REVIEW_WC04_artifact_registry_schema_repair_and_recovery_candidate_registration.json",
    markdownPath:
      "planning/phases/phase-06/Architect_Reviews/ARCHITECT_REVIEW_WC04_artifact_registry_schema_repair_and_recovery_candidate_registration.md",
  },
  {
    label: "WC05 Work Card",
    expectedArtifactId: "champcity-ai/phase-06/work_card/WC05",
    expectedRevision: 3,
    jsonPath:
      "planning/phases/phase-06/Work_Cards/WC05_execution_pass_independent_verification_foundation_recovery.json",
    markdownPath:
      "planning/phases/phase-06/Work_Cards/WC05_execution_pass_independent_verification_foundation_recovery.md",
  },
  {
    label: "WC05 Operator Approval",
    expectedArtifactId: "champcity-ai/phase-06/operator_approval/WC05",
    expectedRevision: 3,
    jsonPath:
      "planning/phases/phase-06/Operator_Approvals/OPERATOR_APPROVAL_WC05_execution_pass_independent_verification_foundation_recovery.json",
    markdownPath:
      "planning/phases/phase-06/Operator_Approvals/OPERATOR_APPROVAL_WC05_execution_pass_independent_verification_foundation_recovery.md",
  },
];

const COMPARABLE_ENTRY_FIELDS = [
  "artifactId",
  "artifactType",
  "revision",
  "status",
  "authoritative",
  "synchronized",
  "projectId",
  "phaseId",
  "workCardId",
  "parentArtifactId",
  "markdownPath",
  "jsonPath",
  "payloadHash",
  "relationships",
];

export async function inventoryRegistry(projectRoot) {
  const root = path.resolve(projectRoot);
  const { jsonContent, markdownContent, jsonArtifact } = await readRegistryPair(root);
  const pairVerification = verifyArtifactPair({
    jsonArtifact: jsonContent,
    markdown: markdownContent,
    jsonPath: ARTIFACT_REGISTRY_JSON_PATH,
    markdownPath: ARTIFACT_REGISTRY_MARKDOWN_PATH,
  });
  const registryData = jsonArtifact?.payload?.data;
  const registryValidation = validateArtifactRegistry(registryData);
  const entries = Array.isArray(registryData?.entries) ? registryData.entries : [];
  const duplicateArtifacts = duplicates(entries.map((entry) => entry?.artifactId));
  const duplicateJsonPaths = duplicates(entries.map((entry) => entry?.jsonPath));
  const duplicateMarkdownPaths = duplicates(entries.map((entry) => entry?.markdownPath));
  const pairFindings = await inspectRegisteredPairs(root, entries);
  const candidateFindings = await verifyCandidatePairs(root);

  return {
    registryJsonHash: sha256Tagged(jsonContent),
    registryMarkdownHash: sha256Tagged(markdownContent),
    registryArtifactRevision: jsonArtifact?.revision ?? null,
    payloadHash: jsonArtifact?.payloadHash ?? null,
    entryCount: entries.length,
    registryVersion: registryData?.registryVersion,
    hasSynchronizationFailures: Object.prototype.hasOwnProperty.call(
      registryData ?? {},
      "synchronizationFailures",
    ),
    synchronizationFailureCount: Array.isArray(registryData?.synchronizationFailures)
      ? registryData.synchronizationFailures.length
      : null,
    pairVerification: summarizeVerification(pairVerification),
    registryValidation: {
      valid: registryValidation.valid,
      issueCodes: registryValidation.issues.map((issue) => issue.code),
      errors: registryValidation.errors,
    },
    duplicates: {
      artifactIds: duplicateArtifacts,
      jsonPaths: duplicateJsonPaths,
      markdownPaths: duplicateMarkdownPaths,
    },
    registeredPairs: pairFindings,
    candidatePairs: candidateFindings.map(({ artifact, ...finding }) => ({
      ...finding,
      artifactId: artifact?.artifactId ?? null,
      payloadHash: artifact?.payloadHash ?? null,
    })),
    blockers: inventoryBlockers({
      duplicateArtifacts,
      duplicateJsonPaths,
      duplicateMarkdownPaths,
      pairFindings,
      candidateFindings,
    }),
  };
}

export async function applyRegistryMigration(projectRoot, options = {}) {
  const root = path.resolve(projectRoot);
  const timestamp = canonicalTimestamp(options.timestamp ?? new Date().toISOString());
  const before = await inventoryRegistry(root);
  if (before.blockers.length > 0) {
    throw new Error(`Registry migration blockers: ${before.blockers.join("; ")}`);
  }

  const { jsonArtifact, jsonContent, markdownContent } = await readRegistryPair(root);
  const candidateFindings = await verifyCandidatePairs(root);
  const candidateArtifacts = candidateFindings.map((finding) => {
    if (!finding.valid || !finding.artifact) {
      throw new Error(`Candidate pair is not verified: ${finding.label}`);
    }
    return finding.artifact;
  });
  const currentData = jsonArtifact.payload.data;
  const currentEntries = Array.isArray(currentData?.entries) ? currentData.entries : [];
  const preexistingEntriesById = new Map(
    currentEntries.map((entry) => [String(entry.artifactId), deepClone(entry)]),
  );
  const nextEntriesById = new Map(
    currentEntries.map((entry) => [String(entry.artifactId), deepClone(entry)]),
  );
  const registeredCandidates = [];

  for (const artifact of candidateArtifacts) {
    const candidateEntry = buildArtifactRegistryEntry(artifact);
    const existing = nextEntriesById.get(candidateEntry.artifactId);
    if (existing) {
      const mismatches = compareEntryFields(existing, candidateEntry);
      if (mismatches.length > 0) {
        throw new Error(
          `Existing candidate registry entry ${candidateEntry.artifactId} does not match verified pair: ${mismatches.join(", ")}`,
        );
      }
    } else {
      nextEntriesById.set(candidateEntry.artifactId, candidateEntry);
      registeredCandidates.push(candidateEntry.artifactId);
    }
  }

  const sortedEntries = [...nextEntriesById.values()].sort(compareRegistryEntries);
  const registry = buildArtifactRegistry({
    updatedAt: timestamp,
    entries: sortedEntries,
  });
  const contentMarkdown = renderArtifactRegistryContentMarkdown(registry);
  const targetArtifact = buildCanonicalArtifact({
    artifactId: jsonArtifact.artifactId,
    artifactType: jsonArtifact.artifactType,
    revision: jsonArtifact.revision + 1,
    status: jsonArtifact.status,
    projectId: jsonArtifact.projectId,
    createdAt: jsonArtifact.createdAt,
    updatedAt: timestamp,
    markdownPath: ARTIFACT_REGISTRY_MARKDOWN_PATH,
    jsonPath: ARTIFACT_REGISTRY_JSON_PATH,
    relationships: {
      sources: registry.entries.map((entry) => entry.artifactId),
      expectedOutputs: [],
      supersedes: [],
      children: [],
    },
    payload: {
      kind: jsonArtifact.artifactType,
      title: REGISTRY_TITLE,
      contentMarkdown,
      data: registry,
    },
  });
  const jsonOutput = `${canonicalPrettyStringify(targetArtifact)}\n`;
  const markdownOutput = renderArtifactMarkdown(targetArtifact);
  const targetVerification = verifyArtifactPair({
    jsonArtifact: jsonOutput,
    markdown: markdownOutput,
    jsonPath: ARTIFACT_REGISTRY_JSON_PATH,
    markdownPath: ARTIFACT_REGISTRY_MARKDOWN_PATH,
  });
  if (!targetVerification.valid || !targetVerification.synchronized) {
    throw new Error(
      `Migrated registry pair failed verification: ${targetVerification.errors.join(" ")}`,
    );
  }
  const targetRegistryValidation = validateArtifactRegistry(targetArtifact.payload.data);
  if (!targetRegistryValidation.valid) {
    throw new Error(`Migrated registry failed validation: ${targetRegistryValidation.errors.join(" ")}`);
  }

  const noDataChange =
    canonicalStringify(jsonArtifact.payload.data) === canonicalStringify(targetArtifact.payload.data) &&
    jsonArtifact.payload.contentMarkdown === targetArtifact.payload.contentMarkdown &&
    canonicalStringify(jsonArtifact.relationships) === canonicalStringify(targetArtifact.relationships);
  if (noDataChange) {
    return {
      mode: "apply",
      changed: false,
      before,
      after: before,
      registeredCandidates: [],
      preservedFieldComparison: comparePreservedFields(
        preexistingEntriesById,
        targetArtifact.payload.data.entries,
      ),
    };
  }

  if (options.backupDir) {
    await backupRegistryPair(root, path.resolve(root, options.backupDir), jsonContent, markdownContent);
  }
  await writeFile(resolveInsideRoot(root, ARTIFACT_REGISTRY_JSON_PATH), jsonOutput, "utf8");
  await writeFile(resolveInsideRoot(root, ARTIFACT_REGISTRY_MARKDOWN_PATH), markdownOutput, "utf8");
  const after = await inventoryRegistry(root);
  const service = new ArtifactPairService({ projectRoot: root });
  const loadedRegistry = await service.loadRegistry();

  return {
    mode: "apply",
    changed: true,
    timestamp,
    before,
    after,
    registeredCandidates,
    loadRegistrySucceeded: Boolean(loadedRegistry),
    preservedFieldComparison: comparePreservedFields(
      preexistingEntriesById,
      targetArtifact.payload.data.entries,
    ),
  };
}

export async function rollbackRegistryMigration(projectRoot, backupDir) {
  if (!backupDir) throw new Error("Rollback requires --backup-dir.");
  const root = path.resolve(projectRoot);
  const absoluteBackupDir = path.resolve(root, backupDir);
  const backupJson = path.join(absoluteBackupDir, "ARTIFACT_REGISTRY.json");
  const backupMarkdown = path.join(absoluteBackupDir, "ARTIFACT_REGISTRY.md");
  if (!existsSync(backupJson) || !existsSync(backupMarkdown)) {
    throw new Error("Rollback backup pair is missing.");
  }
  await copyFile(backupJson, resolveInsideRoot(root, ARTIFACT_REGISTRY_JSON_PATH));
  await copyFile(backupMarkdown, resolveInsideRoot(root, ARTIFACT_REGISTRY_MARKDOWN_PATH));
  return {
    mode: "rollback",
    restoredJsonHash: sha256Tagged(await readFile(backupJson, "utf8")),
    restoredMarkdownHash: sha256Tagged(await readFile(backupMarkdown, "utf8")),
    after: await inventoryRegistry(root),
  };
}

export async function verifyRegistryRuntime(projectRoot) {
  const root = path.resolve(projectRoot);
  const inventory = await inventoryRegistry(root);
  const service = new ArtifactPairService({ projectRoot: root });
  const registry = await service.loadRegistry();
  return {
    mode: "verify",
    loadRegistrySucceeded: Boolean(registry),
    entryCount: registry?.entries.length ?? null,
    inventory,
  };
}

async function inspectRegisteredPairs(root, entries) {
  const findings = [];
  for (const entry of entries) {
    const artifactId = String(entry?.artifactId ?? "<missing>");
    const jsonPath = entry?.jsonPath;
    const markdownPath = entry?.markdownPath;
    if (typeof jsonPath !== "string" || typeof markdownPath !== "string") {
      findings.push({ artifactId, valid: false, code: "missing_pair_paths" });
      continue;
    }
    const jsonAbsolute = resolveInsideRoot(root, jsonPath);
    const markdownAbsolute = resolveInsideRoot(root, markdownPath);
    if (!existsSync(jsonAbsolute) || !existsSync(markdownAbsolute)) {
      findings.push({ artifactId, valid: false, code: "missing_pair", jsonPath, markdownPath });
      continue;
    }
    const [jsonArtifact, markdown] = await Promise.all([
      readFile(jsonAbsolute, "utf8"),
      readFile(markdownAbsolute, "utf8"),
    ]);
    const verification = verifyArtifactPair({ jsonArtifact, markdown, jsonPath, markdownPath });
    if (!verification.valid || !verification.artifact) {
      findings.push({
        artifactId,
        valid: false,
        code: "unsynchronized_pair",
        jsonPath,
        markdownPath,
        errors: verification.errors,
      });
      continue;
    }
    const mismatches = compareEntryFields(entry, buildArtifactRegistryEntry(verification.artifact));
    findings.push({
      artifactId,
      valid: mismatches.length === 0,
      code: mismatches.length === 0 ? "verified" : "metadata_mismatch",
      jsonPath,
      markdownPath,
      mismatches,
    });
  }
  return findings;
}

async function verifyCandidatePairs(root) {
  const findings = [];
  for (const candidate of CANDIDATE_PAIRS) {
    const jsonAbsolute = resolveInsideRoot(root, candidate.jsonPath);
    const markdownAbsolute = resolveInsideRoot(root, candidate.markdownPath);
    if (!existsSync(jsonAbsolute) || !existsSync(markdownAbsolute)) {
      findings.push({ ...candidate, valid: false, code: "missing_candidate_pair" });
      continue;
    }
    const [jsonArtifact, markdown] = await Promise.all([
      readFile(jsonAbsolute, "utf8"),
      readFile(markdownAbsolute, "utf8"),
    ]);
    const verification = verifyArtifactPair({
      jsonArtifact,
      markdown,
      jsonPath: candidate.jsonPath,
      markdownPath: candidate.markdownPath,
    });
    if (
      verification.artifact &&
      (verification.artifact.artifactId !== candidate.expectedArtifactId ||
        verification.artifact.revision !== candidate.expectedRevision)
    ) {
      findings.push({
        ...candidate,
        valid: false,
        code: "candidate_identity_mismatch",
        errors: [
          `${candidate.label} must be ${candidate.expectedArtifactId} revision ${candidate.expectedRevision}.`,
        ],
        artifact: verification.artifact,
      });
      continue;
    }
    findings.push({
      ...candidate,
      valid: verification.valid && verification.synchronized && Boolean(verification.artifact),
      code: verification.valid && verification.synchronized ? "verified" : "invalid_candidate_pair",
      errors: verification.errors,
      artifact: verification.artifact,
    });
  }
  return findings;
}

function inventoryBlockers({
  duplicateArtifacts,
  duplicateJsonPaths,
  duplicateMarkdownPaths,
  pairFindings,
  candidateFindings,
}) {
  const blockers = [];
  if (duplicateArtifacts.length > 0) blockers.push(`duplicate artifact IDs: ${duplicateArtifacts.join(", ")}`);
  if (duplicateJsonPaths.length > 0) blockers.push(`duplicate JSON paths: ${duplicateJsonPaths.join(", ")}`);
  if (duplicateMarkdownPaths.length > 0) blockers.push(`duplicate Markdown paths: ${duplicateMarkdownPaths.join(", ")}`);
  for (const finding of pairFindings) {
    if (!finding.valid) blockers.push(`${finding.code}: ${finding.artifactId}`);
  }
  for (const finding of candidateFindings) {
    if (!finding.valid) blockers.push(`${finding.code}: ${finding.label}`);
  }
  return blockers;
}

function comparePreservedFields(beforeEntriesById, afterEntries) {
  const changed = [];
  const missing = [];
  for (const [artifactId, before] of beforeEntriesById.entries()) {
    const after = afterEntries.find((entry) => entry.artifactId === artifactId);
    if (!after) {
      missing.push(artifactId);
      continue;
    }
    const mismatches = compareEntryFields(before, after);
    if (mismatches.length > 0) changed.push({ artifactId, mismatches });
  }
  return {
    checked: beforeEntriesById.size,
    missing,
    changed,
    preserved: missing.length === 0 && changed.length === 0,
  };
}

function compareEntryFields(left, right) {
  return COMPARABLE_ENTRY_FIELDS.filter(
    (field) => comparableJson(left?.[field]) !== comparableJson(right?.[field]),
  );
}

function compareRegistryEntries(left, right) {
  return left.artifactId < right.artifactId
    ? -1
    : left.artifactId > right.artifactId
      ? 1
      : left.revision - right.revision;
}

function summarizeVerification(verification) {
  return {
    valid: verification.valid,
    synchronized: verification.synchronized,
    errors: verification.errors,
  };
}

function duplicates(values) {
  const seen = new Set();
  const repeated = new Set();
  for (const value of values) {
    if (typeof value !== "string") continue;
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return [...repeated].sort();
}

async function readRegistryPair(root) {
  const [jsonContent, markdownContent] = await Promise.all([
    readFile(resolveInsideRoot(root, ARTIFACT_REGISTRY_JSON_PATH), "utf8"),
    readFile(resolveInsideRoot(root, ARTIFACT_REGISTRY_MARKDOWN_PATH), "utf8"),
  ]);
  return { jsonContent, markdownContent, jsonArtifact: JSON.parse(jsonContent) };
}

async function backupRegistryPair(root, backupDir, jsonContent, markdownContent) {
  if (!isInsideRoot(root, backupDir)) {
    throw new Error("Backup directory must stay inside the repository root.");
  }
  await mkdir(backupDir, { recursive: true });
  await writeFile(path.join(backupDir, "ARTIFACT_REGISTRY.json"), jsonContent, "utf8");
  await writeFile(path.join(backupDir, "ARTIFACT_REGISTRY.md"), markdownContent, "utf8");
}

function resolveInsideRoot(root, repoPath) {
  const normalized = String(repoPath).replaceAll("\\", "/");
  if (
    normalized.length === 0 ||
    normalized.startsWith("/") ||
    /^[A-Za-z]:/.test(normalized) ||
    normalized.split("/").some((part) => !part || part === "." || part === "..")
  ) {
    throw new Error(`Path is not repository-relative: ${repoPath}`);
  }
  const absolutePath = path.resolve(root, ...normalized.split("/"));
  if (!isInsideRoot(root, absolutePath)) {
    throw new Error(`Path escapes repository root: ${repoPath}`);
  }
  return absolutePath;
}

function isInsideRoot(root, absolutePath) {
  const relative = path.relative(path.resolve(root), path.resolve(absolutePath));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function sha256Tagged(value) {
  return `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`;
}

function canonicalTimestamp(value) {
  const timestamp = new Date(value);
  if (!Number.isFinite(timestamp.valueOf())) throw new TypeError("Timestamp is invalid.");
  return timestamp.toISOString();
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function comparableJson(value) {
  return value === undefined ? "__champcity_undefined__" : canonicalStringify(value);
}

function parseArguments(argv) {
  const options = {
    mode: "inventory",
    projectRoot: process.cwd(),
    timestamp: undefined,
    backupDir: undefined,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--mode") options.mode = argv[++index];
    else if (arg.startsWith("--mode=")) options.mode = arg.slice("--mode=".length);
    else if (arg === "--project-root") options.projectRoot = argv[++index];
    else if (arg.startsWith("--project-root=")) {
      options.projectRoot = arg.slice("--project-root=".length);
    } else if (arg === "--timestamp") options.timestamp = argv[++index];
    else if (arg.startsWith("--timestamp=")) options.timestamp = arg.slice("--timestamp=".length);
    else if (arg === "--backup-dir") options.backupDir = argv[++index];
    else if (arg.startsWith("--backup-dir=")) options.backupDir = arg.slice("--backup-dir=".length);
    else throw new Error(`Unsupported argument: ${arg}`);
  }
  if (!["inventory", "apply", "rollback", "verify"].includes(options.mode)) {
    throw new Error("--mode must be inventory, apply, rollback, or verify.");
  }
  return options;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const root = path.resolve(options.projectRoot);
  let result;
  if (options.mode === "inventory") result = await inventoryRegistry(root);
  else if (options.mode === "apply") result = await applyRegistryMigration(root, options);
  else if (options.mode === "rollback") {
    result = await rollbackRegistryMigration(root, options.backupDir);
  } else result = await verifyRegistryRuntime(root);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}
