import {
  artifactStatuses,
  assertCanonicalArtifact,
  type ArtifactRelationships,
  type ArtifactStatus,
  type ArtifactValidationIssue,
  type CanonicalArtifact,
  type PayloadHash,
} from "./artifactEnvelope";

export const ARTIFACT_REGISTRY_VERSION = 1 as const;
export const authorityEligibleArtifactStatuses = [
  "active",
  "pending",
  "blocked",
] as const satisfies readonly ArtifactStatus[];

/** Exact registry entry shape emitted by the applied WC09 migration. */
export interface ArtifactRegistryEntry {
  artifactId: string;
  artifactType: string;
  revision: number;
  status: ArtifactStatus;
  authoritative: boolean;
  synchronized: boolean;
  projectId: string;
  phaseId?: string;
  workCardId?: string;
  parentArtifactId?: string;
  markdownPath: string;
  jsonPath: string;
  payloadHash: PayloadHash;
  relationships: ArtifactRelationships;
}

/** Exact registry payload.data shape emitted by the applied WC09 migration. */
export interface ArtifactRegistry {
  registryVersion: typeof ARTIFACT_REGISTRY_VERSION;
  updatedAt: string;
  entries: ArtifactRegistryEntry[];
}

export type ArtifactRegistryInput = Omit<ArtifactRegistry, "registryVersion">;

/** Runtime audit result; synchronization state is persisted per registry entry. */
export interface ArtifactSynchronizationFailure {
  artifactId: string;
  code: string;
  message: string;
  jsonPath?: string;
  markdownPath?: string;
  detectedAt: string;
}

export interface ArtifactRegistryValidationResult {
  valid: boolean;
  registry?: ArtifactRegistry;
  issues: ArtifactValidationIssue[];
  errors: string[];
}

export interface ArtifactAuthorityQuery {
  artifactId?: string;
  artifactType?: string;
  projectId?: string;
}

export function buildArtifactRegistryEntry(
  artifact: CanonicalArtifact,
  authoritative = isAuthorityEligibleStatus(artifact.status),
  synchronized = true,
): ArtifactRegistryEntry {
  assertCanonicalArtifact(artifact);
  return {
    artifactId: artifact.artifactId,
    artifactType: artifact.artifactType,
    revision: artifact.revision,
    status: artifact.status,
    authoritative,
    synchronized,
    projectId: artifact.projectId,
    ...(artifact.phaseId === undefined ? {} : { phaseId: artifact.phaseId }),
    ...(artifact.workCardId === undefined ? {} : { workCardId: artifact.workCardId }),
    ...(artifact.parentArtifactId === undefined
      ? {}
      : { parentArtifactId: artifact.parentArtifactId }),
    markdownPath: artifact.markdownPath,
    jsonPath: artifact.jsonPath,
    payloadHash: artifact.payloadHash,
    relationships: cloneRelationships(artifact.relationships),
  };
}

export function buildArtifactRegistry(input: ArtifactRegistryInput): ArtifactRegistry {
  const registry: ArtifactRegistry = {
    registryVersion: ARTIFACT_REGISTRY_VERSION,
    updatedAt: input.updatedAt,
    entries: input.entries.map(cloneRegistryEntry),
  };
  assertArtifactRegistry(registry);
  return registry;
}

export function renderArtifactRegistryContentMarkdown(registry: ArtifactRegistry): string {
  assertArtifactRegistry(registry);
  const rows = registry.entries.map(
    (entry) =>
      `| ${entry.artifactId} | ${entry.artifactType} | ${entry.revision} | ${entry.status} | ${entry.authoritative ? "yes" : "no"} | ${entry.synchronized ? "yes" : "no"} |`,
  );
  return [
    "# Canonical Artifact Registry",
    "",
    `Entries: ${registry.entries.length}`,
    "",
    "| Artifact ID | Type | Revision | Status | Authority | Synchronized |",
    "| --- | --- | ---: | --- | --- | --- |",
    ...rows,
    "",
  ].join("\n");
}

export function validateArtifactRegistry(value: unknown): ArtifactRegistryValidationResult {
  const issues: ArtifactValidationIssue[] = [];
  const issue = (code: string, path: string, message: string): void => {
    issues.push({ code, path, message });
  };
  if (!isPlainObject(value)) {
    issue("registry_not_object", "$", "Artifact registry must be a plain object.");
    return result(issues);
  }
  validateExactKeys(
    value,
    new Set(["registryVersion", "updatedAt", "entries"]),
    ["registryVersion", "updatedAt", "entries"],
    "$",
    issue,
  );
  if (value.registryVersion !== ARTIFACT_REGISTRY_VERSION) {
    issue("unsupported_registry_version", "$.registryVersion", "registryVersion must be 1.");
  }
  validateTimestamp(value.updatedAt, "$.updatedAt", issue);
  if (!Array.isArray(value.entries)) {
    issue("invalid_registry_entries", "$.entries", "entries must be an array.");
    return result(issues);
  }
  value.entries.forEach((entry, index) =>
    validateRegistryEntry(entry, index, value.updatedAt, issue),
  );
  validateInvariants(value.entries.filter(isRegistryEntryLike), issue);
  return result(
    issues,
    issues.length === 0 ? (value as unknown as ArtifactRegistry) : undefined,
  );
}

export function assertArtifactRegistry(value: unknown): asserts value is ArtifactRegistry {
  const validation = validateArtifactRegistry(value);
  if (!validation.valid) {
    throw new Error(`Invalid artifact registry: ${validation.errors.join(" ")}`);
  }
}

export function listActiveArtifactAuthorities(
  registry: ArtifactRegistry,
): ArtifactRegistryEntry[] {
  assertArtifactRegistry(registry);
  return registry.entries
    .filter(
      (entry) =>
        entry.authoritative &&
        entry.synchronized &&
        isAuthorityEligibleStatus(entry.status),
    )
    .map(cloneRegistryEntry);
}

export function findArtifactAuthority(
  registry: ArtifactRegistry,
  query: string | ArtifactAuthorityQuery,
): ArtifactRegistryEntry | undefined {
  assertArtifactRegistry(registry);
  const normalized = typeof query === "string" ? { artifactId: query } : query;
  const entry = registry.entries.find(
    (candidate) =>
      candidate.authoritative &&
      candidate.synchronized &&
      isAuthorityEligibleStatus(candidate.status) &&
      (normalized.artifactId === undefined || candidate.artifactId === normalized.artifactId) &&
      (normalized.artifactType === undefined ||
        candidate.artifactType === normalized.artifactType) &&
      (normalized.projectId === undefined || candidate.projectId === normalized.projectId),
  );
  return entry ? cloneRegistryEntry(entry) : undefined;
}

export function getArtifactAuthority(
  registry: ArtifactRegistry,
  query: string | ArtifactAuthorityQuery,
): ArtifactRegistryEntry {
  const entry = findArtifactAuthority(registry, query);
  if (!entry) throw new Error("No synchronized active authority matches the requested identity.");
  return entry;
}

export function isAuthorityEligibleStatus(status: ArtifactStatus): boolean {
  return authorityEligibleArtifactStatuses.includes(
    status as (typeof authorityEligibleArtifactStatuses)[number],
  );
}

function validateRegistryEntry(
  value: unknown,
  index: number,
  registryUpdatedAt: unknown,
  issue: (code: string, path: string, message: string) => void,
): void {
  const entryPath = `$.entries[${index}]`;
  if (!isPlainObject(value)) {
    issue("registry_entry_not_object", entryPath, "Registry entry must be an object.");
    return;
  }
  const allowed = new Set([
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
  ]);
  const required = [
    "artifactId",
    "artifactType",
    "revision",
    "status",
    "authoritative",
    "synchronized",
    "projectId",
    "markdownPath",
    "jsonPath",
    "payloadHash",
    "relationships",
  ];
  validateExactKeys(value, allowed, required, entryPath, issue);
  if (typeof value.authoritative !== "boolean") {
    issue("invalid_authority_flag", `${entryPath}.authoritative`, "authoritative must be boolean.");
  }
  if (typeof value.synchronized !== "boolean") {
    issue("invalid_sync_flag", `${entryPath}.synchronized`, "synchronized must be boolean.");
  }
  try {
    const shape: Record<string, unknown> = {
      artifactId: value.artifactId,
      artifactType: value.artifactType,
      schemaVersion: "champcity.artifact.v1",
      revision: value.revision,
      status: value.status,
      projectId: value.projectId,
      createdAt: registryUpdatedAt,
      updatedAt: registryUpdatedAt,
      markdownPath: value.markdownPath,
      jsonPath: value.jsonPath,
      payloadHash: value.payloadHash,
      relationships: value.relationships,
      payload: {
        kind: value.artifactType,
        title: "Registry descriptor",
        contentMarkdown: "",
        data: null,
      },
    };
    for (const key of ["phaseId", "workCardId", "parentArtifactId"] as const) {
      if (typeof value[key] === "string") shape[key] = value[key];
    }
    assertCanonicalArtifact(shape, { verifyPayloadHash: false });
  } catch (error) {
    issue(
      "invalid_registry_entry",
      entryPath,
      error instanceof Error ? error.message : "Registry metadata is invalid.",
    );
  }
  if (
    artifactStatuses.includes(value.status as ArtifactStatus) &&
    typeof value.authoritative === "boolean"
  ) {
    const eligible = isAuthorityEligibleStatus(value.status as ArtifactStatus);
    if (value.authoritative !== eligible) {
      issue(
        "authority_status_mismatch",
        `${entryPath}.authoritative`,
        "Authority flag must match the canonical status class.",
      );
    }
  }
}

function validateInvariants(
  entries: ArtifactRegistryEntry[],
  issue: (code: string, path: string, message: string) => void,
): void {
  const ids = new Map<string, number>();
  const jsonPaths = new Map<string, number>();
  const markdownPaths = new Map<string, number>();
  entries.forEach((entry, index) => {
    reportDuplicate(ids, entry.artifactId, index, "duplicate_artifact_id", issue);
    reportDuplicate(jsonPaths, entry.jsonPath, index, "duplicate_json_path", issue);
    reportDuplicate(markdownPaths, entry.markdownPath, index, "duplicate_markdown_path", issue);
  });
}

function reportDuplicate(
  seen: Map<string, number>,
  value: string,
  index: number,
  code: string,
  issue: (code: string, path: string, message: string) => void,
): void {
  const prior = seen.get(value);
  if (prior === undefined) seen.set(value, index);
  else issue(code, `$.entries[${index}]`, `Value duplicates registry entry ${prior}.`);
}

function validateExactKeys(
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  required: readonly string[],
  path: string,
  issue: (code: string, path: string, message: string) => void,
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) issue("unexpected_field", `${path}.${key}`, `${key} is not allowed.`);
  }
  for (const key of required) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      issue("missing_field", `${path}.${key}`, `${key} is required.`);
    }
  }
}

function validateTimestamp(
  value: unknown,
  path: string,
  issue: (code: string, path: string, message: string) => void,
): void {
  if (typeof value !== "string" || !value.endsWith("Z") || !Number.isFinite(Date.parse(value))) {
    issue("invalid_timestamp", path, "Timestamp must be valid UTC ISO-8601.");
  }
}

function isRegistryEntryLike(value: unknown): value is ArtifactRegistryEntry {
  return (
    isPlainObject(value) &&
    typeof value.artifactId === "string" &&
    typeof value.artifactType === "string" &&
    typeof value.revision === "number" &&
    typeof value.status === "string" &&
    typeof value.authoritative === "boolean" &&
    typeof value.synchronized === "boolean" &&
    typeof value.jsonPath === "string" &&
    typeof value.markdownPath === "string"
  );
}

function cloneRegistryEntry(entry: ArtifactRegistryEntry): ArtifactRegistryEntry {
  return { ...entry, relationships: cloneRelationships(entry.relationships) };
}

function cloneRelationships(value: ArtifactRelationships): ArtifactRelationships {
  return {
    sources: [...value.sources],
    expectedOutputs: [...value.expectedOutputs],
    supersedes: [...value.supersedes],
    children: [...value.children],
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function result(
  issues: ArtifactValidationIssue[],
  registry?: ArtifactRegistry,
): ArtifactRegistryValidationResult {
  return {
    valid: issues.length === 0,
    registry,
    issues,
    errors: issues.map((entry) => `${entry.path}: ${entry.message}`),
  };
}
