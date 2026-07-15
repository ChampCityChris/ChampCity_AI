import { createHash, randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import {
  buildArtifactRegistryEntry,
  canonicalStringify,
  isAuthorityEligibleStatus,
  verifyArtifactPair,
  type ArtifactRegistry,
  type ArtifactRegistryEntry,
  type CanonicalArtifact,
} from "../../shared/artifacts";
import type {
  ConfiguredProject,
  RepositoryScanBlocker,
  RepositoryScanChangeSummary,
} from "../../shared/projects";

export type ArtifactEvidenceClassification = "controlling" | "historical";

export interface VerifiedArtifactNode {
  artifact: CanonicalArtifact;
  jsonPath: string;
  markdownPath: string;
  classification: ArtifactEvidenceClassification;
}

export interface VerifiedArtifactGraphScan {
  scanId: string;
  scannedAt: string;
  projectId: string;
  nodes: VerifiedArtifactNode[];
  blockers: RepositoryScanBlocker[];
  fingerprint: string;
  branch: string | null;
}

export class VerifiedArtifactGraph {
  readonly scanId: string;
  readonly scannedAt: string;
  readonly projectId: string;
  readonly nodes: readonly VerifiedArtifactNode[];
  readonly blockers: readonly RepositoryScanBlocker[];
  readonly fingerprint: string;
  readonly branch: string | null;
  private readonly nodesById: ReadonlyMap<string, readonly VerifiedArtifactNode[]>;

  constructor(scan: VerifiedArtifactGraphScan) {
    this.scanId = scan.scanId;
    this.scannedAt = scan.scannedAt;
    this.projectId = scan.projectId;
    this.nodes = scan.nodes;
    this.blockers = scan.blockers;
    this.fingerprint = scan.fingerprint;
    this.branch = scan.branch;
    const grouped = new Map<string, VerifiedArtifactNode[]>();
    for (const node of scan.nodes) {
      const existing = grouped.get(node.artifact.artifactId) ?? [];
      existing.push(node);
      grouped.set(node.artifact.artifactId, existing);
    }
    this.nodesById = grouped;
  }

  controlling(artifactId: string): VerifiedArtifactNode | null {
    const matches = (this.nodesById.get(artifactId) ?? []).filter(
      (node) => node.classification === "controlling",
    );
    return matches.length === 1 ? matches[0] : null;
  }

  byType(artifactType: string, phaseId?: string): VerifiedArtifactNode[] {
    return this.nodes.filter(
      (node) =>
        node.artifact.artifactType === artifactType &&
        node.classification === "controlling" &&
        (phaseId === undefined || node.artifact.phaseId === phaseId),
    );
  }

  forWorkCard(
    artifactType: string,
    phaseId: string,
    workCardId: string,
  ): VerifiedArtifactNode[] {
    return this.byType(artifactType, phaseId).filter(
      (node) => node.artifact.workCardId === workCardId,
    );
  }

  derivedRegistry(): ArtifactRegistry {
    const duplicateIds = new Set(
      [...this.nodesById.entries()]
        .filter(([, nodes]) => nodes.filter((node) => node.classification === "controlling").length > 1)
        .map(([artifactId]) => artifactId),
    );
    const entries: ArtifactRegistryEntry[] = this.nodes.map((node) => {
      const entry = buildArtifactRegistryEntry(node.artifact);
      return {
        ...entry,
        authoritative:
          node.classification === "controlling" &&
          !duplicateIds.has(node.artifact.artifactId) &&
          isAuthorityEligibleStatus(node.artifact.status),
        synchronized: true,
      };
    });
    return { registryVersion: 1, updatedAt: this.scannedAt, entries };
  }

  evidenceMap(): Map<string, string> {
    return new Map(
      this.nodes.map((node) => [
        node.artifact.artifactId,
        `${node.artifact.revision}|${node.artifact.payloadHash}|${node.classification}|${node.jsonPath}`,
      ]),
    );
  }
}

export async function scanVerifiedArtifactGraph(
  project: ConfiguredProject,
  clock: () => string = () => new Date().toISOString(),
): Promise<VerifiedArtifactGraph> {
  const scannedAt = clock();
  const blockers: RepositoryScanBlocker[] = [];
  const files = await collectPlanningFiles(project.planningRoot);
  const stems = new Map<string, { json?: string; markdown?: string }>();
  for (const absolutePath of files) {
    const extension = path.extname(absolutePath).toLowerCase();
    if (extension !== ".json" && extension !== ".md") continue;
    const stem = absolutePath.slice(0, -extension.length);
    const pair = stems.get(stem) ?? {};
    if (extension === ".json") pair.json = absolutePath;
    else pair.markdown = absolutePath;
    stems.set(stem, pair);
  }

  const verified: Array<{ artifact: CanonicalArtifact; jsonPath: string; markdownPath: string }> = [];
  for (const pair of stems.values()) {
    const jsonContent = pair.json ? await readFile(pair.json, "utf8") : null;
    const markdownContent = pair.markdown ? await readFile(pair.markdown, "utf8") : null;
    const canonicalLike =
      (jsonContent !== null && /"schemaVersion"\s*:\s*"champcity\.artifact\.v1"/.test(jsonContent)) ||
      (markdownContent !== null && markdownContent.includes("champcity-artifact-envelope"));
    if (!canonicalLike) continue;
    const paths = [pair.json, pair.markdown].filter((value): value is string => Boolean(value));
    if (!pair.json || !pair.markdown) {
      blockers.push({
        code: "incomplete_pair",
        message: "A canonical artifact is missing its synchronized Markdown or JSON representation.",
        artifactIds: [],
        paths: paths.map((value) => toRepoPath(project.repositoryRoot, value)),
      });
      continue;
    }
    let jsonArtifact: unknown;
    try {
      jsonArtifact = JSON.parse(jsonContent as string);
    } catch (error) {
      blockers.push({
        code: "invalid_pair",
        message: `Canonical JSON could not be parsed: ${plainError(error)}`,
        artifactIds: [],
        paths: [toRepoPath(project.repositoryRoot, pair.json), toRepoPath(project.repositoryRoot, pair.markdown)],
      });
      continue;
    }
    const jsonPath = toRepoPath(project.repositoryRoot, pair.json);
    const markdownPath = toRepoPath(project.repositoryRoot, pair.markdown);
    const archivedCopy = isHistoricallyLocated(jsonPath);
    const verification = verifyArtifactPair({
      jsonArtifact,
      markdown: markdownContent as string,
      ...(archivedCopy ? {} : { jsonPath, markdownPath }),
    });
    if (!verification.valid || !verification.artifact) {
      blockers.push({
        code: "invalid_pair",
        message: verification.errors.join(" ") || "Canonical pair verification failed.",
        artifactIds: artifactIdOf(jsonArtifact) ? [artifactIdOf(jsonArtifact) as string] : [],
        paths: [jsonPath, markdownPath],
      });
      continue;
    }
    if (verification.artifact.projectId !== project.projectId) {
      blockers.push({
        code: "project_mismatch",
        message: `Artifact ${verification.artifact.artifactId} belongs to ${verification.artifact.projectId}, not configured project ${project.projectId}.`,
        artifactIds: [verification.artifact.artifactId],
        paths: [jsonPath, markdownPath],
      });
      continue;
    }
    verified.push({ artifact: verification.artifact, jsonPath, markdownPath });
  }

  const supersededIds = new Set(
    verified.flatMap((entry) =>
      isHistoricallyLocated(entry.jsonPath) ? [] : entry.artifact.relationships.supersedes,
    ),
  );
  const nodes: VerifiedArtifactNode[] = verified.map((entry) => ({
    ...entry,
    classification:
      isHistoricallyLocated(entry.jsonPath) ||
      ["historical", "archived", "superseded"].includes(entry.artifact.status) ||
      supersededIds.has(entry.artifact.artifactId)
        ? "historical"
        : "controlling",
  }));

  const grouped = new Map<string, VerifiedArtifactNode[]>();
  for (const node of nodes) {
    const matches = grouped.get(node.artifact.artifactId) ?? [];
    matches.push(node);
    grouped.set(node.artifact.artifactId, matches);
  }
  for (const [artifactId, matches] of grouped) {
    const controlling = matches.filter((node) => node.classification === "controlling");
    if (controlling.length > 1) {
      blockers.push({
        code: "duplicate_authority",
        message: `Artifact ${artifactId} has ${controlling.length} controlling canonical pairs.`,
        artifactIds: [artifactId],
        paths: controlling.flatMap((node) => [node.jsonPath, node.markdownPath]),
      });
    }
  }
  for (const node of nodes.filter((candidate) => candidate.classification === "controlling")) {
    for (const relatedId of [
      ...node.artifact.relationships.sources,
      ...node.artifact.relationships.expectedOutputs,
      ...node.artifact.relationships.children,
    ]) {
      const related = grouped.get(relatedId) ?? [];
      if (related.some((candidate) => candidate.artifact.projectId !== project.projectId)) {
        blockers.push({
          code: "relationship_conflict",
          message: `Artifact ${node.artifact.artifactId} relates to an artifact owned by another project.`,
          artifactIds: [node.artifact.artifactId, relatedId],
          paths: [node.jsonPath],
        });
      }
    }
  }

  const branch = await readGitBranch(project.repositoryRoot);
  if (
    project.branchBehavior.mode === "require" &&
    branch !== project.branchBehavior.branch
  ) {
    blockers.push({
      code: "branch_mismatch",
      message: `Configured branch ${project.branchBehavior.branch} is required; repository is on ${branch ?? "an unknown branch"}.`,
      artifactIds: [],
      paths: [],
    });
  }
  const fingerprint = sha256(
    canonicalStringify({
      projectId: project.projectId,
      branch,
      nodes: nodes
        .map((node) => ({
          artifactId: node.artifact.artifactId,
          revision: node.artifact.revision,
          payloadHash: node.artifact.payloadHash,
          status: node.artifact.status,
          jsonPath: node.jsonPath,
          classification: node.classification,
        }))
        .sort((left, right) => left.artifactId.localeCompare(right.artifactId) || left.jsonPath.localeCompare(right.jsonPath)),
      blockers: blockers.map((blocker) => ({
        code: blocker.code,
        artifactIds: [...blocker.artifactIds].sort(),
        paths: [...blocker.paths].sort(),
      })),
    }),
  );
  return new VerifiedArtifactGraph({
    scanId: randomUUID(),
    scannedAt,
    projectId: project.projectId,
    nodes,
    blockers,
    fingerprint,
    branch,
  });
}

export function compareArtifactGraphs(
  previous: VerifiedArtifactGraph | null,
  next: VerifiedArtifactGraph,
): RepositoryScanChangeSummary {
  const before = previous?.evidenceMap() ?? new Map<string, string>();
  const after = next.evidenceMap();
  const addedArtifactIds = [...after.keys()].filter((artifactId) => !before.has(artifactId));
  const removedArtifactIds = [...before.keys()].filter((artifactId) => !after.has(artifactId));
  const changedArtifactIds = [...after.keys()].filter(
    (artifactId) => before.has(artifactId) && before.get(artifactId) !== after.get(artifactId),
  );
  return {
    addedArtifactIds: addedArtifactIds.sort(),
    changedArtifactIds: changedArtifactIds.sort(),
    removedArtifactIds: removedArtifactIds.sort(),
  };
}

async function collectPlanningFiles(root: string): Promise<string[]> {
  const files: string[] = [];
  const visit = async (directory: string): Promise<void> => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (isTemporaryName(entry.name)) continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(absolute);
      else if (entry.isFile()) files.push(absolute);
    }
  };
  await visit(root);
  return files;
}

function isTemporaryName(name: string): boolean {
  return (
    name.startsWith(".") ||
    name.includes(".tmp-") ||
    name.endsWith(".tmp") ||
    name.endsWith(".bak") ||
    name.endsWith("~")
  );
}

function isHistoricallyLocated(repoPath: string): boolean {
  return repoPath.split("/").includes("archive");
}

function toRepoPath(repositoryRoot: string, absolutePath: string): string {
  const relative = path.relative(repositoryRoot, absolutePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Repository scanner attempted to expose a path outside the selected project.");
  }
  return relative.replaceAll("\\", "/");
}

async function readGitBranch(repositoryRoot: string): Promise<string | null> {
  try {
    const head = (await readFile(path.join(repositoryRoot, ".git", "HEAD"), "utf8")).trim();
    return head.startsWith("ref: refs/heads/") ? head.slice("ref: refs/heads/".length) : head.slice(0, 12);
  } catch {
    return null;
  }
}

function artifactIdOf(value: unknown): string | null {
  return typeof value === "object" && value !== null && "artifactId" in value && typeof value.artifactId === "string"
    ? value.artifactId
    : null;
}

function sha256(value: string): string {
  return `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`;
}

function plainError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
