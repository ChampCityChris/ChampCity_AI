import {
  documentDispositionStatuses,
  type DocumentDispositionStatus,
} from "./documentDisposition";
import type { ParticipationRole } from "./lifecycleArtifact";
import type { SourceRevision } from "./planningDocument";

export const metadataOpenDelimiter = "<!-- CHAMPCITY-METADATA";
export const metadataCloseDelimiter = "CHAMPCITY-METADATA -->";

const participationRoles = [
  "gatingReview",
  "compoundGatingReview",
  "nonReviewHandoff",
  "contextOnly",
  "historical",
] as const satisfies ParticipationRole[];

export interface CanonicalDocumentMetadata {
  schemaVersion: 1;
  artifactType: string;
  artifactRevision: number;
  participationRole: ParticipationRole;
  identity: Record<string, unknown>;
  sourceRevisions: SourceRevision[];
  workflowData: Record<string, unknown>;
  documentDisposition: {
    status: DocumentDispositionStatus;
    notes: string;
    reviewedAt: string | null;
  };
}

export interface ParsedCanonicalMarkdownDocument {
  metadata: CanonicalDocumentMetadata;
  bodyMarkdown: string;
}

export function parseCanonicalMarkdownDocument(
  content: string,
): ParsedCanonicalMarkdownDocument {
  const withoutBom = content.startsWith("\uFEFF") ? content.slice(1) : content;
  if (!withoutBom.startsWith(metadataOpenDelimiter)) {
    throw new Error("Canonical document must begin with CHAMPCITY metadata.");
  }

  const closeIndex = withoutBom.indexOf(metadataCloseDelimiter);
  if (closeIndex < 0) {
    throw new Error("Canonical document metadata block is missing its closing delimiter.");
  }
  if (withoutBom.indexOf(metadataOpenDelimiter, metadataOpenDelimiter.length) >= 0) {
    throw new Error("Canonical document contains a duplicate metadata block.");
  }
  if (withoutBom.indexOf(metadataCloseDelimiter, closeIndex + metadataCloseDelimiter.length) >= 0) {
    throw new Error("Canonical document contains more than one metadata closing delimiter.");
  }

  const afterClose = closeIndex + metadataCloseDelimiter.length;
  const metadataText = withoutBom
    .slice(metadataOpenDelimiter.length, closeIndex)
    .trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(metadataText);
  } catch (error) {
    throw new Error(
      `Canonical document metadata is malformed JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  const metadata = validateCanonicalMetadata(parsed);
  const bodyMarkdown = withoutBom.slice(afterClose).replace(/^(?:\r?\n){1,2}/, "");
  return { metadata, bodyMarkdown };
}

export function serializeCanonicalMarkdownDocument(
  metadata: CanonicalDocumentMetadata,
  bodyMarkdown: string,
): string {
  const normalized = validateCanonicalMetadata(metadata);
  const body = normalizeBody(bodyMarkdown);
  return [
    metadataOpenDelimiter,
    JSON.stringify(normalized, null, 2),
    metadataCloseDelimiter,
    "",
    body,
  ].join("\n");
}

export function validateCanonicalMetadata(
  input: unknown,
): CanonicalDocumentMetadata {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Canonical metadata must be an object.");
  }

  const value = input as Record<string, unknown>;
  if (value.schemaVersion !== 1) {
    throw new Error("Canonical metadata schemaVersion must be 1.");
  }
  const artifactType = requiredString(value.artifactType, "artifactType");
  const artifactRevision = requiredPositiveInteger(value.artifactRevision, "artifactRevision");
  const participationRole = requiredParticipationRole(value.participationRole);
  const identity = requiredRecord(value.identity, "identity");
  const sourceRevisions = sourceRevisionArray(value.sourceRevisions);
  const workflowData = requiredRecord(value.workflowData, "workflowData");
  const documentDisposition = dispositionValue(value.documentDisposition);

  return {
    schemaVersion: 1,
    artifactType,
    artifactRevision,
    participationRole,
    identity,
    sourceRevisions,
    workflowData,
    documentDisposition,
  };
}

export function metadataWithDisposition(
  metadata: CanonicalDocumentMetadata,
  status: DocumentDispositionStatus,
  notes = "",
  reviewedAt: string | null = null,
): CanonicalDocumentMetadata {
  return validateCanonicalMetadata({
    ...metadata,
    documentDisposition: { status, notes, reviewedAt },
  });
}

export function metadataWithSubstantiveRevision(
  metadata: CanonicalDocumentMetadata,
  sourceRevisions: CanonicalDocumentMetadata["sourceRevisions"] = metadata.sourceRevisions,
): CanonicalDocumentMetadata {
  return validateCanonicalMetadata({
    ...metadata,
    artifactRevision: metadata.artifactRevision + 1,
    sourceRevisions,
    documentDisposition: { status: "Pending", notes: "", reviewedAt: null },
  });
}

function normalizeBody(bodyMarkdown: string): string {
  return `${bodyMarkdown.replace(/\r\n?/g, "\n").replace(/\n*$/, "")}\n`;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Canonical metadata requires ${field}.`);
  }
  return value;
}

function requiredPositiveInteger(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new Error(`Canonical metadata requires positive integer ${field}.`);
  }
  return value;
}

function requiredRecord(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Canonical metadata requires object ${field}.`);
  }
  return value as Record<string, unknown>;
}

function requiredParticipationRole(value: unknown): ParticipationRole {
  if (participationRoles.includes(value as ParticipationRole)) {
    return value as ParticipationRole;
  }
  throw new Error("Canonical metadata participationRole is not supported.");
}

function sourceRevisionArray(value: unknown): CanonicalDocumentMetadata["sourceRevisions"] {
  if (!Array.isArray(value)) {
    throw new Error("Canonical metadata sourceRevisions must be an array.");
  }
  return value.map((entry) => {
    const record = requiredRecord(entry, "sourceRevisions entry");
    return {
      path: requiredString(record.path, "sourceRevisions.path"),
      revision: requiredPositiveInteger(record.revision, "sourceRevisions.revision"),
    };
  });
}

function dispositionValue(value: unknown): CanonicalDocumentMetadata["documentDisposition"] {
  const record = requiredRecord(value, "documentDisposition");
  const status = record.status;
  if (!documentDispositionStatuses.includes(status as DocumentDispositionStatus)) {
    throw new Error("Canonical metadata documentDisposition.status is not supported.");
  }
  const notes = typeof record.notes === "string" ? record.notes : "";
  const reviewedAt = record.reviewedAt === null || typeof record.reviewedAt === "string"
    ? record.reviewedAt
    : null;
  return { status: status as DocumentDispositionStatus, notes, reviewedAt };
}
