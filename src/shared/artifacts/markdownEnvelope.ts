import {
  assertCanonicalArtifact,
  type ArtifactPayload,
  type ArtifactValidationIssue,
  type CanonicalArtifact,
} from "./artifactEnvelope";
import { canonicalPrettyStringify } from "./canonicalJson";

export const MARKDOWN_ENVELOPE_START = "<!-- champcity-artifact-envelope" as const;
export const MARKDOWN_ENVELOPE_END = "-->" as const;

export interface MarkdownArtifactPayload<TArtifactType extends string = string> {
  kind: TArtifactType;
  title: string;
}

export type MarkdownArtifactEnvelope<
  TPayload extends ArtifactPayload = ArtifactPayload,
> = Omit<CanonicalArtifact<TPayload>, "payload"> & {
  payload: MarkdownArtifactPayload<TPayload["kind"]>;
};

export interface ParsedArtifactMarkdown<
  TPayload extends ArtifactPayload = ArtifactPayload,
> {
  envelope: MarkdownArtifactEnvelope<TPayload>;
  contentMarkdown: string;
}

export interface MarkdownEnvelopeValidationResult<
  TPayload extends ArtifactPayload = ArtifactPayload,
> {
  valid: boolean;
  parsed?: ParsedArtifactMarkdown<TPayload>;
  issues: ArtifactValidationIssue[];
  errors: string[];
}

export function buildMarkdownArtifactEnvelope<
  TPayload extends ArtifactPayload,
>(artifact: CanonicalArtifact<TPayload>): MarkdownArtifactEnvelope<TPayload> {
  assertCanonicalArtifact(artifact);
  return {
    artifactId: artifact.artifactId,
    artifactType: artifact.artifactType,
    schemaVersion: artifact.schemaVersion,
    revision: artifact.revision,
    status: artifact.status,
    projectId: artifact.projectId,
    ...(artifact.phaseId === undefined ? {} : { phaseId: artifact.phaseId }),
    ...(artifact.workCardId === undefined ? {} : { workCardId: artifact.workCardId }),
    ...(artifact.parentArtifactId === undefined
      ? {}
      : { parentArtifactId: artifact.parentArtifactId }),
    createdAt: artifact.createdAt,
    updatedAt: artifact.updatedAt,
    markdownPath: artifact.markdownPath,
    jsonPath: artifact.jsonPath,
    payloadHash: artifact.payloadHash,
    relationships: {
      sources: [...artifact.relationships.sources],
      expectedOutputs: [...artifact.relationships.expectedOutputs],
      supersedes: [...artifact.relationships.supersedes],
      children: [...artifact.relationships.children],
    },
    payload: {
      kind: artifact.payload.kind,
      title: artifact.payload.title,
    },
  };
}

export function renderArtifactMarkdown<TPayload extends ArtifactPayload>(
  artifact: CanonicalArtifact<TPayload>,
): string {
  return `${MARKDOWN_ENVELOPE_START}\n${canonicalPrettyStringify(
    buildMarkdownArtifactEnvelope(artifact),
  )}\n${MARKDOWN_ENVELOPE_END}\n\n${artifact.payload.contentMarkdown}`;
}

/** Parse only the canonical format emitted by the applied WC09 migration. */
export function parseArtifactMarkdown<
  TPayload extends ArtifactPayload = ArtifactPayload,
>(markdown: string): ParsedArtifactMarkdown<TPayload> {
  if (typeof markdown !== "string") throw new TypeError("Artifact Markdown must be a string.");
  const normalized = markdown.replace(/\r\n?/g, "\n");
  const match = normalized.match(
    /^<!-- champcity-artifact-envelope\n([\s\S]*?)\n-->\n\n([\s\S]*)$/,
  );
  if (!match) {
    throw new Error("Artifact Markdown does not use the canonical WC09 envelope format.");
  }

  let envelopeValue: unknown;
  try {
    envelopeValue = JSON.parse(match[1]);
  } catch (error) {
    throw new Error(
      `Artifact Markdown envelope is not valid JSON: ${
        error instanceof Error ? error.message : "unknown parse error"
      }`,
    );
  }
  if (!isPlainObject(envelopeValue)) {
    throw new Error("Artifact Markdown envelope must be a JSON object.");
  }
  if (canonicalPrettyStringify(envelopeValue) !== match[1]) {
    throw new Error("Artifact Markdown envelope JSON is not canonical two-space JSON.");
  }
  assertEnvelopeShape(envelopeValue);
  return {
    envelope: envelopeValue as unknown as MarkdownArtifactEnvelope<TPayload>,
    contentMarkdown: match[2],
  };
}

export function validateMarkdownEnvelope<
  TPayload extends ArtifactPayload = ArtifactPayload,
>(markdown: string): MarkdownEnvelopeValidationResult<TPayload> {
  try {
    return {
      valid: true,
      parsed: parseArtifactMarkdown<TPayload>(markdown),
      issues: [],
      errors: [],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid artifact Markdown.";
    const issue: ArtifactValidationIssue = {
      code: "invalid_markdown_envelope",
      path: "$markdown",
      message,
    };
    return { valid: false, issues: [issue], errors: [`$markdown: ${message}`] };
  }
}

function assertEnvelopeShape(value: Record<string, unknown>): void {
  const allowed = new Set([
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
  const required = [
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
  ];
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      throw new Error(`Artifact Markdown envelope contains unexpected field ${key}.`);
    }
  }
  for (const key of required) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      throw new Error(`Artifact Markdown envelope is missing ${key}.`);
    }
  }
  if (!isPlainObject(value.payload)) {
    throw new Error("Artifact Markdown envelope payload must be an object.");
  }
  if (Object.keys(value.payload).sort().join(",") !== "kind,title") {
    throw new Error("Artifact Markdown envelope payload must contain exactly kind and title.");
  }
  if (value.payload.kind !== value.artifactType) {
    throw new Error("Artifact Markdown payload.kind must match artifactType.");
  }
  if (typeof value.payload.title !== "string" || value.payload.title.trim() === "") {
    throw new Error("Artifact Markdown payload.title must be non-empty.");
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
