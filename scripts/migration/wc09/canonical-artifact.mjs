import { createHash } from "node:crypto";
import path from "node:path";

export const CANONICAL_SCHEMA_VERSION = "champcity.artifact.v1";
export const CANONICAL_STATUSES = new Set([
  "active",
  "pending",
  "blocked",
  "superseded",
  "archived",
  "historical",
]);

export const DEFAULT_MIGRATION_TIMESTAMP = "2026-07-14T00:00:00.000Z";

export function sortKeysDeep(value) {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort((left, right) => left.localeCompare(right))
        .map((key) => [key, sortKeysDeep(value[key])]),
    );
  }

  return value;
}

export function stableStringify(value, space = 2) {
  return JSON.stringify(sortKeysDeep(value), null, space);
}

export function stableJsonFile(value) {
  return `${stableStringify(value)}\n`;
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function sha256Tagged(value) {
  return `sha256:${sha256(value)}`;
}

export function normalizeRepoPath(value) {
  return String(value ?? "")
    .replaceAll("\\", "/")
    .replace(/^\.\//, "")
    .replace(/\/{2,}/g, "/");
}

export function normalizeMarkdown(value) {
  const normalized = String(value ?? "").replace(/\r\n?/g, "\n").trimEnd();
  return normalized ? `${normalized}\n` : "";
}

export function normalizeTimestamp(value, fallback = DEFAULT_MIGRATION_TIMESTAMP) {
  if (typeof value !== "string" || !value.trim()) {
    return fallback;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? fallback : new Date(timestamp).toISOString();
}

export function uniqueSorted(values) {
  return [...new Set((values ?? []).filter(Boolean).map(String))].sort((left, right) =>
    left.localeCompare(right),
  );
}

export function normalizeRelationships(relationships = {}) {
  return {
    children: uniqueSorted(relationships.children),
    expectedOutputs: uniqueSorted(relationships.expectedOutputs),
    sources: uniqueSorted(relationships.sources),
    supersedes: uniqueSorted(relationships.supersedes),
  };
}

export function createCanonicalArtifact(input) {
  const artifactType = String(input.artifactType ?? "").trim();
  if (!artifactType) {
    throw new Error("Canonical artifactType is required.");
  }

  if (input.payload?.kind !== artifactType) {
    throw new Error(
      `Canonical payload.kind must match artifactType (${artifactType}); received ${input.payload?.kind}.`,
    );
  }

  const status = String(input.status ?? "").trim();
  if (!CANONICAL_STATUSES.has(status)) {
    throw new Error(`Unsupported canonical status: ${status || "<empty>"}.`);
  }

  const revision = Number(input.revision);
  if (!Number.isInteger(revision) || revision < 1) {
    throw new Error(`Canonical revision must be a positive integer; received ${input.revision}.`);
  }

  const payload = {
    contentMarkdown: normalizeMarkdown(input.payload.contentMarkdown),
    data: sortKeysDeep(input.payload.data ?? {}),
    kind: artifactType,
    title: String(input.payload.title ?? "").trim() || String(input.artifactId),
  };

  const createdAt = normalizeTimestamp(input.createdAt);
  const proposedUpdatedAt = normalizeTimestamp(input.updatedAt, createdAt);
  const updatedAt =
    Date.parse(proposedUpdatedAt) < Date.parse(createdAt)
      ? createdAt
      : proposedUpdatedAt;
  const artifact = {
    artifactId: String(input.artifactId ?? "").trim(),
    artifactType,
    schemaVersion: CANONICAL_SCHEMA_VERSION,
    revision,
    status,
    projectId: String(input.projectId ?? "champcity-ai").trim(),
    ...(input.phaseId ? { phaseId: String(input.phaseId).trim() } : {}),
    ...(input.workCardId ? { workCardId: String(input.workCardId).trim() } : {}),
    ...(input.parentArtifactId
      ? { parentArtifactId: String(input.parentArtifactId).trim() }
      : {}),
    createdAt,
    updatedAt,
    markdownPath: normalizeRepoPath(input.markdownPath),
    jsonPath: normalizeRepoPath(input.jsonPath),
    payloadHash: sha256Tagged(stableStringify(payload, 0)),
    relationships: normalizeRelationships(input.relationships),
    payload,
  };

  validateCanonicalArtifact(artifact);
  return sortKeysDeep(artifact);
}

export function canonicalEnvelopeProjection(artifact) {
  const { payload, ...envelope } = artifact;
  return sortKeysDeep({
    ...envelope,
    payload: {
      kind: payload.kind,
      title: payload.title,
    },
  });
}

export function renderCanonicalMarkdown(artifact) {
  validateCanonicalArtifact(artifact);
  const envelope = stableStringify(canonicalEnvelopeProjection(artifact));
  return `<!-- champcity-artifact-envelope\n${envelope}\n-->\n\n${artifact.payload.contentMarkdown}`;
}

export function renderCanonicalPair(artifact) {
  return {
    json: stableJsonFile(artifact),
    markdown: renderCanonicalMarkdown(artifact),
  };
}

export function parseCanonicalMarkdown(markdown) {
  const normalized = String(markdown ?? "").replace(/\r\n?/g, "\n");
  const match = normalized.match(
    /^<!-- champcity-artifact-envelope\n([\s\S]*?)\n-->\n\n([\s\S]*)$/,
  );
  if (!match) {
    throw new Error("Markdown does not begin with a champcity-artifact-envelope JSON comment.");
  }

  return {
    envelope: JSON.parse(match[1]),
    contentMarkdown: normalizeMarkdown(match[2]),
  };
}

export function isCanonicalArtifact(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      value.schemaVersion === CANONICAL_SCHEMA_VERSION &&
      typeof value.artifactId === "string" &&
      value.payload &&
      value.payload.kind === value.artifactType,
  );
}

export function validateCanonicalArtifact(artifact) {
  const requiredStrings = [
    "artifactId",
    "artifactType",
    "schemaVersion",
    "status",
    "projectId",
    "createdAt",
    "updatedAt",
    "markdownPath",
    "jsonPath",
    "payloadHash",
  ];

  for (const key of requiredStrings) {
    if (typeof artifact?.[key] !== "string" || !artifact[key]) {
      throw new Error(`Canonical artifact ${artifact?.artifactId ?? "<unknown>"} lacks ${key}.`);
    }
  }

  if (artifact.schemaVersion !== CANONICAL_SCHEMA_VERSION) {
    throw new Error(`Unexpected schemaVersion: ${artifact.schemaVersion}.`);
  }

  if (!CANONICAL_STATUSES.has(artifact.status)) {
    throw new Error(`Unexpected canonical status: ${artifact.status}.`);
  }

  if (!Number.isInteger(artifact.revision) || artifact.revision < 1) {
    throw new Error("Canonical artifact revision must be a positive integer.");
  }

  if (Date.parse(artifact.updatedAt) < Date.parse(artifact.createdAt)) {
    throw new Error(
      `Canonical artifact ${artifact.artifactId} has updatedAt before createdAt.`,
    );
  }

  if (artifact.payload?.kind !== artifact.artifactType) {
    throw new Error("Canonical payload.kind does not match artifactType.");
  }

  const expectedHash = sha256Tagged(stableStringify(sortKeysDeep(artifact.payload), 0));
  if (artifact.payloadHash !== expectedHash) {
    throw new Error(
      `Payload hash mismatch for ${artifact.artifactId}: ${artifact.payloadHash} != ${expectedHash}.`,
    );
  }

  const normalizedMarkdownPath = normalizeRepoPath(artifact.markdownPath);
  const normalizedJsonPath = normalizeRepoPath(artifact.jsonPath);
  if (!normalizedMarkdownPath.endsWith(".md") || !normalizedJsonPath.endsWith(".json")) {
    throw new Error(`Canonical artifact paths must identify .md and .json files: ${artifact.artifactId}.`);
  }

  normalizeRelationships(artifact.relationships);
  return true;
}

export function verifyCanonicalPair({ artifact, markdown, expectedJsonPath, expectedMarkdownPath }) {
  validateCanonicalArtifact(artifact);
  const parsed = parseCanonicalMarkdown(markdown);
  const projection = canonicalEnvelopeProjection(artifact);

  if (stableStringify(parsed.envelope, 0) !== stableStringify(projection, 0)) {
    throw new Error(`Markdown envelope does not match JSON for ${artifact.artifactId}.`);
  }

  if (parsed.contentMarkdown !== artifact.payload.contentMarkdown) {
    throw new Error(`Markdown payload content does not match JSON for ${artifact.artifactId}.`);
  }

  if (
    expectedJsonPath &&
    normalizeRepoPath(expectedJsonPath) !== normalizeRepoPath(artifact.jsonPath)
  ) {
    throw new Error(`JSON path mismatch for ${artifact.artifactId}.`);
  }

  if (
    expectedMarkdownPath &&
    normalizeRepoPath(expectedMarkdownPath) !== normalizeRepoPath(artifact.markdownPath)
  ) {
    throw new Error(`Markdown path mismatch for ${artifact.artifactId}.`);
  }

  return true;
}

export function resolveInsideRoot(root, repoRelativePath) {
  const absoluteRoot = path.resolve(root);
  const absoluteTarget = path.resolve(absoluteRoot, normalizeRepoPath(repoRelativePath));
  const relative = path.relative(absoluteRoot, absoluteTarget);
  if (!relative || (!relative.startsWith("..") && !path.isAbsolute(relative))) {
    return absoluteTarget;
  }
  throw new Error(`Path escapes migration root: ${repoRelativePath}.`);
}
