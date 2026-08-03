import path from "node:path";
import type { SourceRevision } from "../../shared/documents/planningDocument";

export const architectDraftRootRelativePath = "planning/Architect_Drafts";
export const maxArchitectDraftSubmissionIdLength = 240;
export const maxArchitectDraftRelativePathLength = 320;

const safeSegmentPattern = /^[a-z0-9][a-z0-9-]*$/;
const encodedPathSegmentPattern = /^[a-z2-7]+$/;
const base32Alphabet = "abcdefghijklmnopqrstuvwxyz234567";

export interface DeterministicArchitectDraftSubmissionIdInput {
  outputKind: string;
  owningWorkspaceId: string;
  sourceHandoff: SourceRevision;
  submissionKey: string;
}

export function buildDeterministicArchitectDraftSubmissionId(
  input: DeterministicArchitectDraftSubmissionIdInput,
): string {
  const sourcePath = normalizeRepositoryRelativePath(
    input.sourceHandoff.path,
    "source handoff path",
  );
  const parts = [
    "ad",
    safePathSegment(input.owningWorkspaceId, "owning workspace ID"),
    safePathSegment(input.outputKind, "output kind"),
    safePathSegment(input.submissionKey, "submission key"),
    encodeRepositoryRelativePath(sourcePath),
    `r${safeSourceRevision(input.sourceHandoff.revision)}`,
  ];
  return assertSafeSubmissionId(parts.join("-"));
}

export function buildArchitectDraftSubmissionDirectory(submissionId: string): string {
  return `${architectDraftRootRelativePath}/${safePathSegment(submissionId, "submission ID")}`;
}

export function buildArchitectDraftSlotPath(
  submissionId: string,
  draftPathComponent: string,
): string {
  const component = safeDraftPathComponent(draftPathComponent);
  return assertSupportedDraftRelativePathBound(
    `${buildArchitectDraftSubmissionDirectory(submissionId)}/${component}`,
  );
}

export function isArchitectDraftRelativePath(relativePath: string): boolean {
  const normalized = normalizeRelativePath(relativePath).toLowerCase();
  return (
    normalized === architectDraftRootRelativePath.toLowerCase() ||
    normalized.startsWith(`${architectDraftRootRelativePath.toLowerCase()}/`)
  );
}

export function assertArchitectDraftSlotPath(
  submissionId: string,
  draftRelativePath: string,
): string {
  const normalized = normalizeRelativePath(draftRelativePath);
  if (
    path.isAbsolute(normalized) ||
    normalized.includes("..") ||
    !normalized.endsWith(".md") ||
    !normalized.startsWith(`${buildArchitectDraftSubmissionDirectory(submissionId)}/`)
  ) {
    throw new Error("Architect draft path must be inside the exact central submission draft root.");
  }
  return assertSupportedDraftRelativePathBound(normalized);
}

export function assertSafeSubmissionId(submissionId: string): string {
  if (
    typeof submissionId !== "string" ||
    !safeSegmentPattern.test(submissionId) ||
    submissionId.length > maxArchitectDraftSubmissionIdLength
  ) {
    throw new Error(
      `Architect draft submission ID must be path-safe and ${maxArchitectDraftSubmissionIdLength} characters or fewer.`,
    );
  }
  return submissionId;
}

function safeDraftPathComponent(component: string): string {
  const normalized = normalizeRelativePath(component);
  if (
    path.isAbsolute(normalized) ||
    normalized.includes("..") ||
    normalized.includes("/") ||
    normalized.includes("\\") ||
    path.extname(normalized).toLowerCase() !== ".md"
  ) {
    throw new Error("Architect draft slot requires a safe Markdown filename.");
  }
  const stem = path.basename(normalized, ".md");
  return `${safePathSegment(stem, "draft path component")}.md`;
}

function safePathSegment(value: string, field: string): string {
  const safe = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  if (!safeSegmentPattern.test(safe)) {
    throw new Error(`Architect draft ${field} is not safe for path construction.`);
  }
  return safe;
}

function normalizeRelativePath(relativePath: string): string {
  return relativePath.split(path.sep).join("/");
}

function normalizeRepositoryRelativePath(relativePath: string, field: string): string {
  if (typeof relativePath !== "string" || !relativePath.trim() || relativePath !== relativePath.trim()) {
    throw new Error(`Architect draft ${field} is not a supported repository-relative path.`);
  }
  if (path.win32.isAbsolute(relativePath) || path.posix.isAbsolute(relativePath)) {
    throw new Error(`Architect draft ${field} must be repository-relative.`);
  }
  const normalized = relativePath.replace(/\\/g, "/");
  if (path.posix.isAbsolute(normalized) || /^[A-Za-z]:/.test(normalized)) {
    throw new Error(`Architect draft ${field} must be repository-relative.`);
  }
  if (/[\0-\x1f\x7f]/.test(normalized)) {
    throw new Error(`Architect draft ${field} contains unsupported characters.`);
  }
  const segments = normalized.split("/");
  if (
    segments.length === 0 ||
    segments.some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new Error(`Architect draft ${field} cannot be empty, absolute, or escaping.`);
  }
  return segments.join("/");
}

function encodeRepositoryRelativePath(relativePath: string): string {
  return relativePath
    .split("/")
    .map((segment) => encodePathSegment(segment))
    .join("-");
}

function encodePathSegment(segment: string): string {
  const encoded = encodeBase32(Buffer.from(segment, "utf8"));
  if (!encodedPathSegmentPattern.test(encoded)) {
    throw new Error("Architect draft source handoff path cannot be encoded safely.");
  }
  return encoded;
}

function encodeBase32(bytes: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += base32Alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += base32Alphabet[(value << (5 - bits)) & 31];
  }
  return output;
}

function safeSourceRevision(revision: number): number {
  if (!Number.isSafeInteger(revision) || revision < 1) {
    throw new Error("Architect draft source handoff revision must be a positive safe integer.");
  }
  return revision;
}

function assertSupportedDraftRelativePathBound(relativePath: string): string {
  if (relativePath.length > maxArchitectDraftRelativePathLength) {
    throw new Error(
      `Architect draft relative path must be ${maxArchitectDraftRelativePathLength} characters or fewer.`,
    );
  }
  return relativePath;
}
