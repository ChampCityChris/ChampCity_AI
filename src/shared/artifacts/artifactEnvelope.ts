import {
  canonicalStringify,
  isJsonValue,
  sha256Canonical,
  type JsonValue,
  type Sha256Digest,
} from "./canonicalJson";

export const ARTIFACT_SCHEMA_VERSION = "champcity.artifact.v1" as const;

export const artifactStatuses = [
  "active",
  "pending",
  "blocked",
  "superseded",
  "archived",
  "historical",
] as const;

export type ArtifactStatus = (typeof artifactStatuses)[number];
export type PayloadHash = Sha256Digest;

export interface ArtifactRelationships {
  sources: string[];
  expectedOutputs: string[];
  supersedes: string[];
  children: string[];
}

export interface ArtifactPayload<
  TArtifactType extends string = string,
  TData extends JsonValue = JsonValue,
> {
  kind: TArtifactType;
  title: string;
  contentMarkdown: string;
  data: TData;
}

export interface CanonicalArtifact<
  TPayload extends ArtifactPayload = ArtifactPayload,
> {
  artifactId: string;
  artifactType: TPayload["kind"];
  schemaVersion: typeof ARTIFACT_SCHEMA_VERSION;
  revision: number;
  status: ArtifactStatus;
  projectId: string;
  phaseId?: string;
  workCardId?: string;
  parentArtifactId?: string;
  createdAt: string;
  updatedAt: string;
  markdownPath: string;
  jsonPath: string;
  payloadHash: PayloadHash;
  relationships: ArtifactRelationships;
  payload: TPayload;
}

export type CanonicalArtifactInput<
  TPayload extends ArtifactPayload = ArtifactPayload,
> = Omit<CanonicalArtifact<TPayload>, "schemaVersion" | "payloadHash">;

export interface ArtifactIdentityParts {
  artifactId: string;
  artifactType: string;
  projectId: string;
}

export interface ArtifactValidationIssue {
  code: string;
  path: string;
  message: string;
}

export interface ArtifactValidationResult<
  TArtifact extends CanonicalArtifact = CanonicalArtifact,
> {
  valid: boolean;
  artifact?: TArtifact;
  issues: ArtifactValidationIssue[];
  errors: string[];
}

export interface CanonicalArtifactValidationOptions {
  verifyPayloadHash?: boolean;
}

const topLevelKeys = new Set([
  "artifactId",
  "artifactType",
  "schemaVersion",
  "revision",
  "status",
  "projectId",
  "phaseId",
  "workCardId",
  "parentArtifactId",
  "createdAt",
  "updatedAt",
  "markdownPath",
  "jsonPath",
  "payloadHash",
  "relationships",
  "payload",
]);

const requiredTopLevelKeys = [
  "artifactId",
  "artifactType",
  "schemaVersion",
  "revision",
  "status",
  "projectId",
  "createdAt",
  "updatedAt",
  "markdownPath",
  "jsonPath",
  "payloadHash",
  "relationships",
  "payload",
] as const;

const identifierPattern = /^[A-Za-z0-9][A-Za-z0-9._:/-]*$/;
const artifactTypePattern = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
const payloadHashPattern = /^sha256:[a-f0-9]{64}$/;
const utcTimestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

export function computeArtifactPayloadHash(payload: ArtifactPayload): PayloadHash {
  return sha256Canonical(payload);
}

export function normalizeArtifactContentMarkdown(value: string): string {
  const normalized = value.replace(/\r\n?/g, "\n").trimEnd();
  return normalized ? `${normalized}\n` : "";
}

export function buildCanonicalArtifact<
  TPayload extends ArtifactPayload,
>(input: CanonicalArtifactInput<TPayload>): CanonicalArtifact<TPayload> {
  const payload = {
    ...input.payload,
    contentMarkdown: normalizeArtifactContentMarkdown(
      input.payload.contentMarkdown,
    ),
  } as TPayload;
  const artifact = {
    ...input,
    payload,
    schemaVersion: ARTIFACT_SCHEMA_VERSION,
    payloadHash: computeArtifactPayloadHash(payload),
  } as CanonicalArtifact<TPayload>;

  removeUndefinedOptionalFields(artifact as unknown as Record<string, unknown>);
  assertCanonicalArtifact(artifact);
  return artifact;
}

export function validateCanonicalArtifact<
  TArtifact extends CanonicalArtifact = CanonicalArtifact,
>(
  value: unknown,
  options: CanonicalArtifactValidationOptions = {},
): ArtifactValidationResult<TArtifact> {
  const issues: ArtifactValidationIssue[] = [];
  const issue = (code: string, path: string, message: string): void => {
    issues.push({ code, path, message });
  };

  if (!isPlainObject(value)) {
    issue("artifact_not_object", "$", "Canonical artifact must be a plain object.");
    return result<TArtifact>(issues);
  }

  validateExactKeys(value, topLevelKeys, requiredTopLevelKeys, "$", issue);
  validateIdentifier(value.artifactId, "$.artifactId", issue);
  validateArtifactType(value.artifactType, "$.artifactType", issue);

  if (value.schemaVersion !== ARTIFACT_SCHEMA_VERSION) {
    issue(
      "unsupported_schema_version",
      "$.schemaVersion",
      `schemaVersion must be ${ARTIFACT_SCHEMA_VERSION}.`,
    );
  }

  if (!Number.isInteger(value.revision) || (value.revision as number) < 1) {
    issue("invalid_revision", "$.revision", "revision must be a positive integer.");
  }

  if (!artifactStatuses.includes(value.status as ArtifactStatus)) {
    issue("invalid_status", "$.status", "status is not a canonical artifact status.");
  }

  validateIdentifier(value.projectId, "$.projectId", issue);
  validateOptionalIdentifier(value.phaseId, "$.phaseId", issue);
  validateOptionalIdentifier(value.workCardId, "$.workCardId", issue);
  validateOptionalIdentifier(value.parentArtifactId, "$.parentArtifactId", issue);

  validateTimestamp(value.createdAt, "$.createdAt", issue);
  validateTimestamp(value.updatedAt, "$.updatedAt", issue);
  if (
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    Date.parse(value.updatedAt) < Date.parse(value.createdAt)
  ) {
    issue("invalid_timestamp_order", "$.updatedAt", "updatedAt cannot precede createdAt.");
  }

  validateRepositoryPath(value.markdownPath, ".md", "$.markdownPath", issue);
  validateRepositoryPath(value.jsonPath, ".json", "$.jsonPath", issue);

  if (typeof value.payloadHash !== "string" || !payloadHashPattern.test(value.payloadHash)) {
    issue(
      "invalid_payload_hash",
      "$.payloadHash",
      "payloadHash must be a lowercase sha256 digest.",
    );
  }

  validateRelationships(value.relationships, value.artifactId, issue);
  validatePayload(value.payload, value.artifactType, issue);

  if (
    options.verifyPayloadHash !== false &&
    isPlainObject(value.payload) &&
    isJsonValue(value.payload) &&
    typeof value.payloadHash === "string" &&
    payloadHashPattern.test(value.payloadHash)
  ) {
    const expectedHash = sha256Canonical(value.payload);
    if (value.payloadHash !== expectedHash) {
      issue(
        "payload_hash_mismatch",
        "$.payloadHash",
        `payloadHash does not match the canonical payload hash ${expectedHash}.`,
      );
    }
  }

  return result<TArtifact>(issues, issues.length === 0 ? (value as TArtifact) : undefined);
}

export function assertCanonicalArtifact<
  TArtifact extends CanonicalArtifact = CanonicalArtifact,
>(value: unknown, options: CanonicalArtifactValidationOptions = {}): asserts value is TArtifact {
  const validation = validateCanonicalArtifact<TArtifact>(value, options);
  if (!validation.valid) {
    throw new Error(`Invalid canonical artifact: ${validation.errors.join(" ")}`);
  }
}

export function getArtifactLogicalIdentity(
  artifact: ArtifactIdentityParts,
): string {
  return canonicalStringify([
    artifact.projectId,
    artifact.artifactType,
    artifact.artifactId,
  ]);
}

export function getArtifactRevisionIdentity(
  artifact: ArtifactIdentityParts & { revision: number },
): string {
  return canonicalStringify([
    artifact.projectId,
    artifact.artifactType,
    artifact.artifactId,
    artifact.revision,
  ]);
}

function validatePayload(
  value: unknown,
  artifactType: unknown,
  issue: (code: string, path: string, message: string) => void,
): void {
  if (!isPlainObject(value)) {
    issue("payload_not_object", "$.payload", "payload must be a plain object.");
    return;
  }

  validateExactKeys(
    value,
    new Set(["kind", "title", "contentMarkdown", "data"]),
    ["kind", "title", "contentMarkdown", "data"],
    "$.payload",
    issue,
  );
  validateArtifactType(value.kind, "$.payload.kind", issue);

  if (value.kind !== artifactType) {
    issue(
      "payload_artifact_type_mismatch",
      "$.payload.kind",
      "payload.kind must match the top-level artifactType.",
    );
  }

  if (typeof value.title !== "string" || value.title.trim().length === 0) {
    issue("invalid_payload_title", "$.payload.title", "payload.title must be non-empty.");
  }

  if (typeof value.contentMarkdown !== "string") {
    issue(
      "invalid_markdown_content",
      "$.payload.contentMarkdown",
      "payload.contentMarkdown must be a string.",
    );
  }

  if (!isJsonValue(value.data)) {
    issue("invalid_payload_data", "$.payload.data", "payload.data must be strict JSON data.");
  }
}

function validateRelationships(
  value: unknown,
  artifactId: unknown,
  issue: (code: string, path: string, message: string) => void,
): void {
  if (!isPlainObject(value)) {
    issue("relationships_not_object", "$.relationships", "relationships must be a plain object.");
    return;
  }

  const names = ["sources", "expectedOutputs", "supersedes", "children"] as const;
  validateExactKeys(value, new Set(names), names, "$.relationships", issue);

  for (const name of names) {
    const references = value[name];
    if (!Array.isArray(references)) {
      issue("invalid_relationship_list", `$.relationships.${name}`, `${name} must be an array.`);
      continue;
    }

    const seen = new Set<string>();
    references.forEach((reference, index) => {
      validateIdentifier(reference, `$.relationships.${name}[${index}]`, issue);
      if (typeof reference === "string") {
        if (seen.has(reference)) {
          issue(
            "duplicate_relationship",
            `$.relationships.${name}[${index}]`,
            `Duplicate relationship ${reference}.`,
          );
        }
        if (reference === artifactId) {
          issue(
            "self_relationship",
            `$.relationships.${name}[${index}]`,
            "An artifact cannot relate to itself.",
          );
        }
        seen.add(reference);
      }
    });
  }
}

function validateExactKeys(
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  required: readonly string[],
  path: string,
  issue: (code: string, path: string, message: string) => void,
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      issue("unexpected_field", `${path}.${key}`, `${key} is not allowed by the canonical schema.`);
    }
  }

  for (const key of required) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      issue("missing_field", `${path}.${key}`, `${key} is required.`);
    }
  }
}

function validateIdentifier(
  value: unknown,
  path: string,
  issue: (code: string, path: string, message: string) => void,
): void {
  if (
    typeof value !== "string" ||
    value.length > 256 ||
    !identifierPattern.test(value) ||
    value.includes("..")
  ) {
    issue("invalid_identifier", path, "Value must be a canonical artifact identifier.");
  }
}

function validateOptionalIdentifier(
  value: unknown,
  path: string,
  issue: (code: string, path: string, message: string) => void,
): void {
  if (value !== undefined) {
    validateIdentifier(value, path, issue);
  }
}

function validateArtifactType(
  value: unknown,
  path: string,
  issue: (code: string, path: string, message: string) => void,
): void {
  if (typeof value !== "string" || value.length > 128 || !artifactTypePattern.test(value)) {
    issue("invalid_artifact_type", path, "artifactType must be a lowercase canonical type.");
  }
}

function validateTimestamp(
  value: unknown,
  path: string,
  issue: (code: string, path: string, message: string) => void,
): void {
  if (
    typeof value !== "string" ||
    !utcTimestampPattern.test(value) ||
    !Number.isFinite(Date.parse(value))
  ) {
    issue("invalid_timestamp", path, "Timestamp must be a valid UTC ISO-8601 value.");
  }
}

function validateRepositoryPath(
  value: unknown,
  extension: string,
  path: string,
  issue: (code: string, path: string, message: string) => void,
): void {
  if (typeof value !== "string") {
    issue("invalid_repository_path", path, "Artifact path must be repo-relative.");
    return;
  }

  const segments = value.split("/");
  if (
    value.length === 0 ||
    value.startsWith("/") ||
    value.includes("\\") ||
    /^[A-Za-z]:/.test(value) ||
    segments.some((segment) => segment.length === 0 || segment === "." || segment === "..") ||
    !value.endsWith(extension)
  ) {
    issue(
      "invalid_repository_path",
      path,
      `Artifact path must be a normalized repo-relative ${extension} path.`,
    );
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function removeUndefinedOptionalFields(value: Record<string, unknown>): void {
  for (const key of ["phaseId", "workCardId", "parentArtifactId"]) {
    if (value[key] === undefined) {
      delete value[key];
    }
  }
}

function result<TArtifact extends CanonicalArtifact>(
  issues: ArtifactValidationIssue[],
  artifact?: TArtifact,
): ArtifactValidationResult<TArtifact> {
  return {
    valid: issues.length === 0,
    artifact,
    issues,
    errors: issues.map((entry) => `${entry.path}: ${entry.message}`),
  };
}
