import type {
  CurrentActionArtifactReference,
  CurrentRequiredAction,
} from "./currentRequiredAction";

export type ArtifactReviewGroupId =
  | "work_card"
  | "implementer_report"
  | "architect_review"
  | "validation_report"
  | "repair"
  | "source_evidence"
  | "other_support";

export interface ArtifactReviewEntry {
  key: string;
  path: string;
  displayName: string;
  role: string;
  groupId: ArtifactReviewGroupId;
  format: string;
  status?: string;
  exists: boolean;
  previewable: boolean;
}

export interface ArtifactReviewGroup {
  id: ArtifactReviewGroupId;
  label: string;
  description: string;
  artifacts: ArtifactReviewEntry[];
}

export interface ArtifactReviewMissingEntry {
  key: string;
  path: string;
  displayName: string;
  role: string;
  reason: string;
}

export interface ArtifactReviewExpectedOutput {
  path?: string;
  displayName: string;
  artifactType: string;
  description: string;
  exists: boolean;
  previewable: boolean;
  stateLabel: string;
}

export interface ArtifactReviewWorkspaceModel {
  phaseLabel: string;
  workflowStep: string;
  workCardLabel: string;
  sourceGroups: ArtifactReviewGroup[];
  missingArtifacts: ArtifactReviewMissingEntry[];
  expectedOutput?: ArtifactReviewExpectedOutput;
  hasContext: boolean;
}

export interface PlanningArtifactPreviewRequest {
  path: string;
}

export interface PlanningArtifactPreviewResult {
  ok: boolean;
  path?: string;
  displayName?: string;
  content?: string;
  truncated?: boolean;
  errorMessages?: string[];
}

const groupDefinitions: Array<
  Pick<ArtifactReviewGroup, "id" | "label" | "description">
> = [
  {
    id: "work_card",
    label: "Work Card",
    description: "Authoritative scope and acceptance evidence.",
  },
  {
    id: "implementer_report",
    label: "Implementer Report",
    description: "Implementation summary, checks, and residual risks.",
  },
  {
    id: "architect_review",
    label: "Architect Review",
    description: "Architecture review decision and validation guidance.",
  },
  {
    id: "validation_report",
    label: "Validation Report",
    description: "Operator validation outcome and decision record.",
  },
  {
    id: "repair",
    label: "Repair",
    description: "Repair Work Cards, prompts, and implementation reports.",
  },
  {
    id: "source_evidence",
    label: "Source Evidence",
    description: "Screenshots and other files referenced by workflow records.",
  },
  {
    id: "other_support",
    label: "Other Support",
    description: "Phase, project, roadmap, and supporting planning context.",
  },
];

const knownPrefixes = [
  "BUILDER_REPORT_",
  "IMPLEMENTER_REPORT_",
  "ARCHITECT_REVIEW_",
  "VALIDATION_REPORT_",
  "REPAIR_PROMPT_",
  "ARCHITECT_PROMPT_",
  "BUILDER_PROMPT_",
  "IMPLEMENTER_PROMPT_",
];

export function buildArtifactReviewWorkspace(
  action: CurrentRequiredAction,
): ArtifactReviewWorkspaceModel {
  const sourceEntries = action.sourceArtifacts.map(toReviewEntry);
  const sourceGroups = groupDefinitions
    .map((definition) => ({
      ...definition,
      artifacts: sourceEntries.filter(
        (artifact) => artifact.groupId === definition.id,
      ),
    }))
    .filter((group) => group.artifacts.length > 0);
  const missingArtifacts = action.missingArtifacts.map((artifact) => ({
    key: `${artifact.path}|${artifact.reason}`,
    path: artifact.path,
    displayName: getArtifactDisplayName(artifact.path),
    role: inferArtifactRole(artifact.path),
    reason: artifact.reason,
  }));
  const expectedOutput = action.expectedOutput
    ? buildExpectedOutput(action, sourceEntries)
    : undefined;

  return {
    phaseLabel: action.phaseId
      ? `${action.phaseId}${action.phaseTitle ? ` - ${action.phaseTitle}` : ""}`
      : "No phase reported",
    workflowStep: action.workflowStep,
    workCardLabel: action.workCardId
      ? `${action.workCardId}${action.workCardTitle ? ` - ${action.workCardTitle}` : ""}`
      : "No Work Card reported",
    sourceGroups,
    missingArtifacts,
    expectedOutput,
    hasContext:
      sourceEntries.length > 0 ||
      missingArtifacts.length > 0 ||
      Boolean(expectedOutput),
  };
}

export function getArtifactDisplayName(
  artifactPath: string | undefined,
  fallback = "Planning artifact",
): string {
  const fileName = getFileName(artifactPath);

  if (!fileName) {
    return fallback;
  }

  const extensionIndex = fileName.lastIndexOf(".");
  let stem = extensionIndex > 0 ? fileName.slice(0, extensionIndex) : fileName;

  for (const prefix of knownPrefixes) {
    if (stem.toUpperCase().startsWith(prefix)) {
      stem = stem.slice(prefix.length);
      break;
    }
  }

  const cleaned = stem
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return fallback;
  }

  const match = /^(WC\d+(?:\s+REPAIR\d+)?)(?:\s+(.*))?$/i.exec(cleaned);

  if (match) {
    const identifier = match[1].toUpperCase().replace(/\s+/g, "-");
    const title = match[2]?.trim();

    return title ? `${identifier} - ${titleCaseWords(title)}` : identifier;
  }

  return titleCaseWords(cleaned);
}

export function getArtifactFormat(artifactPath: string): string {
  const fileName = getFileName(artifactPath);
  const extension = /\.([A-Za-z0-9]+)$/.exec(fileName)?.[1]?.toUpperCase();

  return extension ?? "FILE";
}

export function isPlanningMarkdownPreviewable(artifactPath: string): boolean {
  const normalized = normalizeRepoPath(artifactPath);

  if (!normalized.startsWith("planning/") || !normalized.endsWith(".md")) {
    return false;
  }

  const segments = normalized.split("/");

  return (
    segments.length > 2 &&
    segments.every(
      (segment) => segment.length > 0 && segment !== "." && segment !== "..",
    )
  );
}

export function inferArtifactGroup(
  artifact: Pick<CurrentActionArtifactReference, "path" | "role">,
): ArtifactReviewGroupId {
  const role = artifact.role.toLowerCase();
  const artifactPath = normalizeRepoPath(artifact.path).toLowerCase();

  if (role.includes("repair")) {
    return "repair";
  }

  if (role.includes("work card") || artifactPath.includes("/work_cards/")) {
    return "work_card";
  }

  if (
    role.includes("implementer report") ||
    role.includes("builder report") ||
    artifactPath.includes("/builder_reports/")
  ) {
    return "implementer_report";
  }

  if (role.includes("architect review") || artifactPath.includes("/architect_reviews/")) {
    return "architect_review";
  }

  if (role.includes("validation report") || artifactPath.includes("/validation_reports/")) {
    return "validation_report";
  }

  if (
    role.includes("evidence") ||
    artifactPath.includes("/validation_evidence/") ||
    /\.(png|jpe?g|webp|gif|txt)$/i.test(artifactPath)
  ) {
    return "source_evidence";
  }

  return "other_support";
}

function toReviewEntry(
  artifact: CurrentActionArtifactReference,
): ArtifactReviewEntry {
  return {
    key: `${artifact.path}|${artifact.role}`,
    path: artifact.path,
    displayName: getArtifactDisplayName(artifact.path, artifact.role),
    role: artifact.role,
    groupId: inferArtifactGroup(artifact),
    format: getArtifactFormat(artifact.path),
    status: artifact.status,
    exists: artifact.exists !== false,
    previewable:
      artifact.exists !== false && isPlanningMarkdownPreviewable(artifact.path),
  };
}

function buildExpectedOutput(
  action: CurrentRequiredAction,
  sourceEntries: ArtifactReviewEntry[],
): ArtifactReviewExpectedOutput {
  const expectedOutput = action.expectedOutput!;
  const normalizedExpectedPath = normalizeRepoPath(expectedOutput.path ?? "");
  const existing = sourceEntries.find(
    (artifact) => normalizeRepoPath(artifact.path) === normalizedExpectedPath,
  );
  const exists = Boolean(existing?.exists);

  return {
    path: expectedOutput.path,
    displayName: getArtifactDisplayName(
      expectedOutput.path,
      expectedOutput.artifactType,
    ),
    artifactType: expectedOutput.artifactType,
    description: expectedOutput.description,
    exists,
    previewable: Boolean(existing?.previewable),
    stateLabel: exists ? "Existing record - update or replace expected" : "Expected next - not created yet",
  };
}

function inferArtifactRole(artifactPath: string): string {
  const normalized = normalizeRepoPath(artifactPath).toLowerCase();

  if (normalized.includes("/builder_reports/")) {
    return normalized.includes("repair") ? "Repair Implementer Report" : "Implementer Report";
  }

  if (normalized.includes("/architect_reviews/")) {
    return "Architect Review";
  }

  if (normalized.includes("/validation_reports/")) {
    return normalized.includes("repair") ? "Repair Validation Report" : "Validation Report";
  }

  if (normalized.includes("/work_cards/")) {
    return normalized.includes("repair") ? "Repair Work Card" : "Work Card";
  }

  if (normalized.includes("/validation_evidence/")) {
    return "Source Evidence";
  }

  return "Missing planning artifact";
}

function getFileName(artifactPath: string | undefined): string {
  const normalized = normalizeRepoPath(artifactPath ?? "");

  return normalized.split("/").filter(Boolean).at(-1) ?? "";
}

function normalizeRepoPath(value: string): string {
  return value.trim().replace(/\\/g, "/").replace(/^\.\//, "");
}

function titleCaseWords(value: string): string {
  return value
    .split(" ")
    .map((word) =>
      /^[a-z]/.test(word) ? `${word[0].toUpperCase()}${word.slice(1)}` : word,
    )
    .join(" ");
}
