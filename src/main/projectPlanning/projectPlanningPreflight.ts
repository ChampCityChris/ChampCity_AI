import fs from "node:fs";
import path from "node:path";
import { parseCanonicalMarkdownDocument } from "../../shared/documents/canonicalMarkdown";
import type { PlanningDocumentSummary } from "../../shared/documents/planningDocument";

export type ProjectPlanningReconciliationMode =
  | "greenfield"
  | "reconciliation-required"
  | "needs-attention";

export interface ProjectPlanningPreflightResult {
  reconciliationMode: ProjectPlanningReconciliationMode;
  repositoryReviewRequired: boolean;
  repositoryReviewContext: string;
  legacyPlanningPaths: string[];
  sourceEvidencePaths: string[];
  evidencePaths: string[];
  needsAttentionReason?: string;
}

export interface ProjectPlanningPreflightInput {
  workspaceRoot: string;
  documents: PlanningDocumentSummary[];
  projectSlug: string;
  intake: PlanningDocumentSummary;
  prompt: PlanningDocumentSummary;
  interview: PlanningDocumentSummary;
  handoff?: PlanningDocumentSummary;
  profile?: PlanningDocumentSummary;
  roadmap?: PlanningDocumentSummary;
  profileMarkdownPath: string;
  roadmapMarkdownPath: string;
}

const ignoredDirectoryNames = new Set([
  ".angular",
  ".cache",
  ".codex",
  ".git",
  ".hg",
  ".next",
  ".nuxt",
  ".parcel-cache",
  ".pnpm-store",
  ".pytest_cache",
  ".ruff_cache",
  ".svelte-kit",
  ".svn",
  ".turbo",
  ".vite",
  "__pycache__",
  "artifacts",
  "bin",
  "build",
  "coverage",
  "dist",
  "logs",
  "node_modules",
  "obj",
  "out",
  "release",
  "releases",
  "target",
  "temp",
  "tmp",
  "vendor",
]);

const sourceExtensions = new Set([
  ".c",
  ".cjs",
  ".cpp",
  ".cs",
  ".css",
  ".go",
  ".h",
  ".hpp",
  ".html",
  ".java",
  ".js",
  ".jsx",
  ".kt",
  ".mjs",
  ".php",
  ".ps1",
  ".py",
  ".rb",
  ".rs",
  ".scss",
  ".sh",
  ".sql",
  ".svelte",
  ".swift",
  ".ts",
  ".tsx",
  ".vue",
]);

const sourceFilenames = new Set([
  ".babelrc",
  ".editorconfig",
  ".eslintrc",
  ".prettierrc",
  "cargo.toml",
  "composer.json",
  "deno.json",
  "docker-compose.yml",
  "dockerfile",
  "electron-builder.yml",
  "go.mod",
  "gradle.properties",
  "makefile",
  "package.json",
  "pyproject.toml",
  "requirements.txt",
  "tsconfig.json",
  "vite.config.ts",
]);

const requiredProfileSections = [
  "Current-State Baseline",
  "Existing Implementation",
  "Legacy Planning Reconciliation",
  "Risks and Unknowns",
] as const;

const requiredRoadmapSections = [
  "Baseline Summary",
  "Work-State Classification",
  "MVP Scope",
  "Sequenced Roadmap",
  "Post-MVP Roadmap",
  "Deferred and Conditional Work",
  "Dependencies and Constraints",
] as const;

export function projectPlanningRequiredProfileSections(): string[] {
  return [...requiredProfileSections];
}

export function projectPlanningRequiredRoadmapSections(): string[] {
  return [...requiredRoadmapSections];
}

export function preflightProjectPlanningRepository(
  input: ProjectPlanningPreflightInput,
): ProjectPlanningPreflightResult {
  const currentEvidencePaths = new Set([
    input.intake.markdownPath,
    input.prompt.markdownPath,
    input.interview.markdownPath,
    input.handoff?.markdownPath,
    input.profile?.markdownPath,
    input.roadmap?.markdownPath,
  ].filter((value): value is string => Boolean(value)));

  const sourceEvidencePaths = collectSourceEvidencePaths(input.workspaceRoot);
  const legacyPlanningPaths = collectLegacyPlanningPaths(input.documents, currentEvidencePaths);
  const malformedPlanningPaths = input.documents
    .filter((document) => Boolean(document.readError))
    .map((document) => document.markdownPath);
  const targetCollisions = [
    targetCollision(input.workspaceRoot, input.profileMarkdownPath, "project-profile", input.projectSlug),
    targetCollision(input.workspaceRoot, input.roadmapMarkdownPath, "project-roadmap", input.projectSlug),
  ].filter((value): value is string => Boolean(value));

  const intakeWorkflowData = input.intake.metadata.canonical?.workflowData ?? {};
  const intakeDeclaresExisting = intakeWorkflowData.hasExistingSourceOrPlanning === true;
  const repositoryReviewContext = typeof intakeWorkflowData.repositoryReviewContext === "string"
    ? intakeWorkflowData.repositoryReviewContext
    : "";

  const evidencePaths = uniqueSorted([
    ...sourceEvidencePaths,
    ...legacyPlanningPaths,
    ...malformedPlanningPaths,
    ...targetCollisions,
  ]);

  if (targetCollisions.length > 0) {
    return needsAttention(
      `Exact Project Planning output target collision: ${targetCollisions.join("; ")}.`,
      repositoryReviewContext,
      legacyPlanningPaths,
      sourceEvidencePaths,
      evidencePaths,
    );
  }
  if (malformedPlanningPaths.length > 0) {
    return needsAttention(
      `Malformed canonical planning evidence must be resolved before Project Planning: ${malformedPlanningPaths.join("; ")}.`,
      repositoryReviewContext,
      legacyPlanningPaths,
      sourceEvidencePaths,
      evidencePaths,
    );
  }

  const hasRepositoryEvidence = sourceEvidencePaths.length > 0 || legacyPlanningPaths.length > 0;
  if (!intakeDeclaresExisting && hasRepositoryEvidence) {
    return needsAttention(
      "Project Intake declares a greenfield repository, but bounded repository preflight found substantive source or prior planning evidence.",
      repositoryReviewContext,
      legacyPlanningPaths,
      sourceEvidencePaths,
      evidencePaths,
    );
  }

  const reconciliationMode: ProjectPlanningReconciliationMode =
    intakeDeclaresExisting || hasRepositoryEvidence
      ? "reconciliation-required"
      : "greenfield";

  return {
    reconciliationMode,
    repositoryReviewRequired: reconciliationMode !== "greenfield",
    repositoryReviewContext,
    legacyPlanningPaths,
    sourceEvidencePaths,
    evidencePaths,
  };
}

function needsAttention(
  reason: string,
  repositoryReviewContext: string,
  legacyPlanningPaths: string[],
  sourceEvidencePaths: string[],
  evidencePaths: string[],
): ProjectPlanningPreflightResult {
  return {
    reconciliationMode: "needs-attention",
    repositoryReviewRequired: true,
    repositoryReviewContext,
    legacyPlanningPaths,
    sourceEvidencePaths,
    evidencePaths,
    needsAttentionReason: reason,
  };
}

function collectSourceEvidencePaths(workspaceRoot: string): string[] {
  const root = path.resolve(workspaceRoot);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) return [];
  const evidence: string[] = [];

  function visit(directory: string): void {
    for (const child of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, child.name);
      const relativePath = normalizeRelativePath(path.relative(root, absolutePath));
      if (child.isDirectory()) {
        if (!shouldIgnoreDirectory(child.name) && relativePath !== "planning") {
          visit(absolutePath);
        }
        continue;
      }
      if (!child.isFile()) continue;
      if (isSubstantiveSourceOrConfig(child.name)) {
        evidence.push(relativePath);
      }
    }
  }

  visit(root);
  return uniqueSorted(evidence);
}

function collectLegacyPlanningPaths(
  documents: PlanningDocumentSummary[],
  currentEvidencePaths: Set<string>,
): string[] {
  return uniqueSorted(documents
    .filter((document) => !currentEvidencePaths.has(document.markdownPath))
    .filter((document) =>
      document.readError ||
      document.metadata.artifactType === "legacy-unmanaged" ||
      document.metadata.participationRole === "historical" ||
      isPriorPlanningArtifact(document),
    )
    .map((document) => document.markdownPath));
}

function isPriorPlanningArtifact(document: PlanningDocumentSummary): boolean {
  const artifactType = document.metadata.artifactType;
  if (!artifactType || artifactType === "legacy-unmanaged") return true;
  return ![
    "project-intake",
    "project-architect-interview-prompt",
    "project-architect-interview",
    "generated-handoff",
    "project-profile",
    "project-roadmap",
  ].includes(artifactType);
}

function targetCollision(
  workspaceRoot: string,
  relativePath: string,
  artifactType: "project-profile" | "project-roadmap",
  projectSlug: string,
): string | null {
  const absolutePath = path.join(workspaceRoot, relativePath);
  if (!fs.existsSync(absolutePath)) return null;
  const content = fs.readFileSync(absolutePath, "utf8");
  if (!content.startsWith("<!-- CHAMPCITY-METADATA")) return relativePath;
  try {
    const parsed = parseCanonicalMarkdownDocument(content);
    const identitySlug = parsed.metadata.identity.projectSlug ?? parsed.metadata.identity["Project.ArtifactKey"];
    if (
      parsed.metadata.artifactType !== artifactType ||
      parsed.metadata.participationRole !== "compoundGatingReview" ||
      identitySlug !== projectSlug
    ) {
      return relativePath;
    }
  } catch {
    return relativePath;
  }
  return null;
}

function shouldIgnoreDirectory(name: string): boolean {
  return ignoredDirectoryNames.has(name.toLowerCase());
}

function isSubstantiveSourceOrConfig(filename: string): boolean {
  const lower = filename.toLowerCase();
  return sourceExtensions.has(path.extname(lower)) || sourceFilenames.has(lower);
}

function normalizeRelativePath(relativePath: string): string {
  return relativePath.split(path.sep).join("/");
}

function uniqueSorted(paths: string[]): string[] {
  return [...new Set(paths)].sort((left, right) => left.localeCompare(right, "en", { sensitivity: "base" }));
}
