import path from "node:path";
import type { SourceRevision } from "../../shared/documents/planningDocument";

export const architectDraftRootRelativePath = "planning/Architect_Drafts";

const safeSegmentPattern = /^[a-z0-9][a-z0-9-]*$/;

export interface DeterministicArchitectDraftSubmissionIdInput {
  outputKind: string;
  owningWorkspaceId: string;
  sourceHandoff: SourceRevision;
  submissionKey: string;
}

export function buildDeterministicArchitectDraftSubmissionId(
  input: DeterministicArchitectDraftSubmissionIdInput,
): string {
  const parts = [
    "architect-draft",
    safePathSegment(input.owningWorkspaceId, "owning workspace ID"),
    safePathSegment(input.outputKind, "output kind"),
    safePathSegment(input.submissionKey, "submission key"),
    safePathSegment(input.sourceHandoff.path, "source handoff path"),
    `r${input.sourceHandoff.revision}`,
  ];
  return parts.join("-");
}

export function buildArchitectDraftSubmissionDirectory(submissionId: string): string {
  return `${architectDraftRootRelativePath}/${safePathSegment(submissionId, "submission ID")}`;
}

export function buildArchitectDraftSlotPath(
  submissionId: string,
  draftPathComponent: string,
): string {
  const component = safeDraftPathComponent(draftPathComponent);
  return `${buildArchitectDraftSubmissionDirectory(submissionId)}/${component}`;
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
  return normalized;
}

export function assertSafeSubmissionId(submissionId: string): string {
  return safePathSegment(submissionId, "submission ID");
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
