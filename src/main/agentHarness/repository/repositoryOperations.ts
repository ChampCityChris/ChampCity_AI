import { inspectGitDiff, type GitDiffInput } from "./gitMutations";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { AgentHarnessError } from "../core/errors";
import {
  enumerateGitCandidates,
  isGitWorkTree,
  runBoundedGit,
} from "./boundedGit";
import { assertGenericMarkdownMutationAllowed } from "./controlledMarkdownDrafts";
import { assertSafeRelativePath, isPathInside, resolveRepositoryPath, toRepositoryRelativePath } from "./pathPolicy";
import {
  inlineOrInspect,
  inspectTextFile,
  readMarkdownSection,
  readTextChunk,
  readTextLines,
} from "./textProjection";

const SKIPPED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "out",
  "release",
  "coverage",
  ".vite",
  "logs",
  "tmp",
  "temp",
  ".vscode",
  ".idea",
]);
const MAX_LISTED_FILES = 1_000;
const MAX_SEARCH_RESULTS = 200;
const MAX_SEARCH_CANDIDATES = 1_000;
const MAX_SEARCH_CONTENT_BYTES = 134_217_728;
const MAX_SEARCH_DURATION_MS = 15_000;
const MAX_NON_GIT_TRAVERSAL_DURATION_MS = 10_000;
const MAX_NON_GIT_VISITED_ENTRIES = 25_000;
const MAX_SEARCH_FILE_BYTES = 500_000;
const MAX_WRITE_BYTES = 1_000_000;

interface ListRepositoryOptions {
  directory?: string;
  maxFiles?: number;
  gitBacked?: boolean;
  traversalDeadlineMs?: number;
  maxVisitedEntries?: number;
  maxFilesReason?: "file-limit" | "candidate-limit";
}

interface SearchRepositoryOptions {
  directory?: string;
  maxResults?: number;
  gitBacked?: boolean;
  maxCandidateFiles?: number;
  maxContentBytes?: number;
  scanDeadlineMs?: number;
  maxVisitedEntries?: number;
}

export const REPOSITORY_TRUNCATION_REASONS = [
  "file-limit",
  "visit-limit",
  "candidate-limit",
  "deadline",
  "result-limit",
  "content-byte-limit",
  "file-size-limit",
  "output-limit",
] as const;

export type RepositoryTruncationReason = typeof REPOSITORY_TRUNCATION_REASONS[number];

const repositoryTruncationReasonSet: ReadonlySet<string> = new Set(REPOSITORY_TRUNCATION_REASONS);

export function isRepositoryTruncationReason(value: unknown): value is RepositoryTruncationReason {
  return typeof value === "string" && repositoryTruncationReasonSet.has(value);
}

export interface RepositoryListCompletion {
  status: "complete" | "partial";
  reason: RepositoryTruncationReason | null;
  visitedEntries: number;
  candidateFiles: number;
  elapsedMs: number;
}

export interface RepositorySearchCompletion extends RepositoryListCompletion {
  scannedFiles: number;
  contentBytesRead: number;
}

export interface RepositoryListResult {
  root: string;
  directory: string;
  files: string[];
  truncated: boolean;
  completion: RepositoryListCompletion;
}

export interface RepositorySearchResult {
  query: string;
  matches: Array<{ relativePath: string; line: number; preview: string }>;
  truncated: boolean;
  completion: RepositorySearchCompletion;
}

export async function listRepositoryFiles(root: string, options: ListRepositoryOptions = {}): Promise<RepositoryListResult> {
  const startedAt = Date.now();
  const resolved = resolveRepositoryPath(root, options.directory ?? ".");
  const maxFiles = Math.min(Math.max(1, options.maxFiles ?? MAX_LISTED_FILES), MAX_LISTED_FILES);
  const gitBacked = options.gitBacked ?? await isGitBacked(resolved.rootRealPath);
  if (gitBacked) {
    const enumerated = await enumerateGitCandidates({
      root: resolved.rootRealPath,
      pathspec: resolved.relativePath,
      maxCandidates: maxFiles,
    });
    const files: string[] = [];
    let visitedEntries = 0;
    for (const candidate of enumerated.files) {
      visitedEntries += 1;
      const safeCandidate = assertSafeRelativePath(candidate);
      const candidatePath = path.resolve(resolved.rootRealPath, safeCandidate);
      let stats: fs.Stats;
      try {
        stats = await fs.promises.lstat(candidatePath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          continue;
        }
        throw error;
      }
      if (!stats.isFile() || stats.isSymbolicLink()) {
        continue;
      }
      const candidateRealPath = await fs.promises.realpath(candidatePath);
      if (isPathInside(candidateRealPath, resolved.rootRealPath)) {
        files.push(toRepositoryRelativePath(resolved.rootRealPath, candidateRealPath));
      }
    }
    const reason = enumerated.truncationReason === "candidate-limit"
      ? options.maxFilesReason ?? "file-limit"
      : enumerated.truncationReason;
    const completion = listCompletion(reason, visitedEntries, enumerated.files.length, startedAt);
    assertUsefulListOrComplete(files, completion);
    return {
      root: resolved.rootRealPath,
      directory: resolved.relativePath,
      files,
      truncated: completion.status === "partial",
      completion,
    };
  }

  return listNonGitRepositoryFiles(resolved, maxFiles, options, startedAt);
}

async function listNonGitRepositoryFiles(
  resolved: ReturnType<typeof resolveRepositoryPath>,
  maxFiles: number,
  options: ListRepositoryOptions,
  startedAt: number,
): Promise<RepositoryListResult> {
  const traversalDeadlineMs = Math.min(
    Math.max(1, options.traversalDeadlineMs ?? MAX_NON_GIT_TRAVERSAL_DURATION_MS),
    MAX_NON_GIT_TRAVERSAL_DURATION_MS,
  );
  const maxVisitedEntries = Math.min(
    Math.max(1, options.maxVisitedEntries ?? MAX_NON_GIT_VISITED_ENTRIES),
    MAX_NON_GIT_VISITED_ENTRIES,
  );
  const deadline = Date.now() + traversalDeadlineMs;
  const files: string[] = [];
  const directories = [resolved.resolvedPath];
  let directoryIndex = 0;
  let visitedEntries = 0;
  let candidateFiles = 0;
  let reason: RepositoryTruncationReason | null = null;

  const reachedBound = (): RepositoryTruncationReason | null => {
    if (Date.now() >= deadline) {
      return "deadline";
    }
    if (visitedEntries >= maxVisitedEntries) {
      return "visit-limit";
    }
    if (files.length >= maxFiles) {
      return options.maxFilesReason ?? "file-limit";
    }
    return null;
  };

  while (directoryIndex < directories.length && reason === null) {
    const current = directories[directoryIndex];
    directoryIndex += 1;
    reason = reachedBound();
    if (reason) {
      break;
    }
    const directoryRealPath = await fs.promises.realpath(current);
    if (!isPathInside(directoryRealPath, resolved.rootRealPath)) {
      continue;
    }
    const entries = await fs.promises.readdir(current, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    const fileEntries = entries.filter((entry) => !entry.isDirectory());
    const directoryEntries = entries.filter((entry) => entry.isDirectory() && !SKIPPED_DIRECTORIES.has(entry.name));

    for (const entry of fileEntries) {
      reason = reachedBound();
      if (reason) {
        break;
      }
      visitedEntries += 1;
      const candidatePath = path.join(current, entry.name);
      let stats: fs.Stats;
      try {
        stats = await fs.promises.lstat(candidatePath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          continue;
        }
        throw error;
      }
      if (!stats.isFile() || stats.isSymbolicLink()) {
        continue;
      }
      candidateFiles += 1;
      const fileRealPath = await fs.promises.realpath(candidatePath);
      if (isPathInside(fileRealPath, resolved.rootRealPath)) {
        files.push(toRepositoryRelativePath(resolved.rootRealPath, fileRealPath));
      }
    }
    if (reason) {
      break;
    }

    for (const entry of directoryEntries) {
      reason = reachedBound();
      if (reason) {
        break;
      }
      visitedEntries += 1;
      const candidatePath = path.join(current, entry.name);
      let stats: fs.Stats;
      try {
        stats = await fs.promises.lstat(candidatePath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          continue;
        }
        throw error;
      }
      if (!stats.isDirectory() || stats.isSymbolicLink()) {
        continue;
      }
      const childRealPath = await fs.promises.realpath(candidatePath);
      if (isPathInside(childRealPath, resolved.rootRealPath)) {
        directories.push(candidatePath);
      }
    }
  }

  const completion = listCompletion(reason, visitedEntries, candidateFiles, startedAt);
  assertUsefulListOrComplete(files, completion);
  return {
    root: resolved.rootRealPath,
    directory: resolved.relativePath,
    files,
    truncated: completion.status === "partial",
    completion,
  };
}

export function readRepositoryFile(root: string, workspaceId: string, relativePath: string): unknown {
  return inlineOrInspect({ root, workspaceId, relativePath });
}

export function inspectRepositoryTextFile(root: string, workspaceId: string, relativePath: string): unknown {
  return inspectTextFile({ root, workspaceId, relativePath });
}

export function readRepositoryTextChunk(root: string, workspaceId: string, params: Record<string, unknown>): unknown {
  return readTextChunk({
    root,
    workspaceId,
    relativePath: stringParam(params.relativePath),
    cursor: stringParam(params.cursor),
    maximumBytes: numberParam(params.maximumBytes),
    maximumLines: numberParam(params.maximumLines),
    expectedSourceSha256: stringParam(params.expectedSourceSha256),
  });
}

export function readRepositoryTextLines(root: string, workspaceId: string, params: Record<string, unknown>): unknown {
  return readTextLines({
    root,
    workspaceId,
    relativePath: requiredString(params.relativePath, "relativePath"),
    startLine: requiredNumber(params.startLine, "startLine"),
    maximumLines: requiredNumber(params.maximumLines, "maximumLines"),
    maximumBytes: numberParam(params.maximumBytes),
  });
}

export function readRepositoryMarkdownSection(root: string, workspaceId: string, params: Record<string, unknown>): unknown {
  return readMarkdownSection({
    root,
    workspaceId,
    relativePath: requiredString(params.relativePath, "relativePath"),
    sectionId: requiredString(params.sectionId, "sectionId"),
    maximumBytes: numberParam(params.maximumBytes),
    maximumLines: numberParam(params.maximumLines),
  });
}

export async function searchRepositoryFiles(root: string, query: string, options: SearchRepositoryOptions = {}): Promise<RepositorySearchResult> {
  if (!query.trim()) {
    throw new AgentHarnessError("INVALID_INPUT", "query is required.");
  }
  const startedAt = Date.now();
  const scanDeadlineMs = Math.min(
    Math.max(1, options.scanDeadlineMs ?? MAX_SEARCH_DURATION_MS),
    MAX_SEARCH_DURATION_MS,
  );
  const maxCandidateFiles = Math.min(
    Math.max(1, options.maxCandidateFiles ?? MAX_SEARCH_CANDIDATES),
    MAX_SEARCH_CANDIDATES,
  );
  const maxContentBytes = Math.min(
    Math.max(1, options.maxContentBytes ?? MAX_SEARCH_CONTENT_BYTES),
    MAX_SEARCH_CONTENT_BYTES,
  );
  let listed: RepositoryListResult;
  try {
    listed = await listRepositoryFiles(root, {
      directory: options.directory,
      maxFiles: maxCandidateFiles,
      gitBacked: options.gitBacked,
      traversalDeadlineMs: Math.min(scanDeadlineMs, MAX_NON_GIT_TRAVERSAL_DURATION_MS),
      maxVisitedEntries: options.maxVisitedEntries,
      maxFilesReason: "candidate-limit",
    });
  } catch (error) {
    if (error instanceof AgentHarnessError && error.code === "REPOSITORY_TRAVERSAL_INCOMPLETE") {
      throw new AgentHarnessError(error.code, "Repository search could not establish a complete result within its bounds.", {
        ...error.details,
        operation: "search",
      });
    }
    throw error;
  }
  const files = listed.files;
  const maxResults = Math.min(Math.max(1, options.maxResults ?? MAX_SEARCH_RESULTS), MAX_SEARCH_RESULTS);
  const matches: Array<{ relativePath: string; line: number; preview: string }> = [];
  const needle = query.toLowerCase();
  let contentBytesRead = 0;
  let scannedFiles = 0;
  let reason = listed.completion.reason;
  for (const relativePath of files) {
    if (Date.now() - startedAt >= scanDeadlineMs) {
      reason = "deadline";
      break;
    }
    if (matches.length >= maxResults) {
      reason = "result-limit";
      break;
    }
    const resolved = resolveRepositoryPath(root, relativePath);
    const stats = await fs.promises.stat(resolved.resolvedPath);
    if (!stats.isFile()) {
      continue;
    }
    if (stats.size > MAX_SEARCH_FILE_BYTES) {
      reason ??= "file-size-limit";
      continue;
    }
    if (contentBytesRead + stats.size > maxContentBytes) {
      reason = "content-byte-limit";
      break;
    }
    const buffer = await fs.promises.readFile(resolved.resolvedPath);
    contentBytesRead += buffer.length;
    scannedFiles += 1;
    if (buffer.includes(0)) {
      continue;
    }
    const lines = buffer.toString("utf8").split(/\r\n|\n|\r/);
    for (let index = 0; index < lines.length; index += 1) {
      if (lines[index].toLowerCase().includes(needle)) {
        matches.push({ relativePath, line: index + 1, preview: lines[index].slice(0, 500) });
        if (matches.length >= maxResults) {
          reason = "result-limit";
          break;
        }
      }
    }
  }
  const completion: RepositorySearchCompletion = {
    status: reason === null ? "complete" : "partial",
    reason,
    visitedEntries: listed.completion.visitedEntries,
    candidateFiles: listed.completion.candidateFiles,
    scannedFiles,
    contentBytesRead,
    elapsedMs: elapsedSince(startedAt),
  };
  if (matches.length === 0 && completion.status === "partial") {
    throwRepositoryIncomplete("search", completion, 0);
  }
  return { query, matches, truncated: completion.status === "partial", completion };
}

function listCompletion(
  reason: RepositoryTruncationReason | null,
  visitedEntries: number,
  candidateFiles: number,
  startedAt: number,
): RepositoryListCompletion {
  return {
    status: reason === null ? "complete" : "partial",
    reason,
    visitedEntries,
    candidateFiles,
    elapsedMs: elapsedSince(startedAt),
  };
}

function assertUsefulListOrComplete(files: string[], completion: RepositoryListCompletion): void {
  if (files.length === 0 && completion.status === "partial") {
    throwRepositoryIncomplete("list", completion, 0);
  }
}

function throwRepositoryIncomplete(
  operation: "list" | "search",
  completion: RepositoryListCompletion | RepositorySearchCompletion,
  usefulResultCount: number,
): never {
  throw new AgentHarnessError(
    "REPOSITORY_TRAVERSAL_INCOMPLETE",
    `Repository ${operation} could not establish a complete result within its bounds.`,
    {
      operation,
      usefulResultCount,
      completion: { ...completion, status: "incomplete" },
    },
  );
}

function elapsedSince(startedAt: number): number {
  return Math.max(0, Date.now() - startedAt);
}

export function writeTextArtifact(root: string, relativePath: string, content: string, options: {
  overwrite?: boolean;
  expectedExtension?: ".md" | ".json";
} = {}): { relativePath: string; sha256: string; bytes: number } {
  if (Buffer.byteLength(content, "utf8") > MAX_WRITE_BYTES) {
    throw new AgentHarnessError("FILE_DENIED", "Artifact content exceeds the write limit.");
  }
  if (options.expectedExtension && path.extname(relativePath).toLowerCase() !== options.expectedExtension) {
    throw new AgentHarnessError("INVALID_INPUT", `Artifact path must end in ${options.expectedExtension}.`);
  }
  if (options.expectedExtension === ".json") {
    JSON.parse(content);
  }
  const resolved = resolveRepositoryPath(root, relativePath, { allowMissingLeaf: true });
  if (options.expectedExtension === ".md" && fs.existsSync(resolved.resolvedPath)) {
    assertGenericMarkdownMutationAllowed(root, resolved.relativePath);
  }
  if (fs.existsSync(resolved.resolvedPath) && !options.overwrite) {
    throw new AgentHarnessError("FILE_DENIED", "Artifact already exists and overwrite was not requested.", {
      relativePath: resolved.relativePath,
    });
  }
  fs.mkdirSync(path.dirname(resolved.resolvedPath), { recursive: true });
  const tempPath = `${resolved.resolvedPath}.champcity-tmp-${process.pid}`;
  fs.writeFileSync(tempPath, content, "utf8");
  fs.renameSync(tempPath, resolved.resolvedPath);
  return {
    relativePath: resolved.relativePath,
    sha256: createHash("sha256").update(content, "utf8").digest("hex"),
    bytes: Buffer.byteLength(content, "utf8"),
  };
}

export async function gitStatus(root: string, knownGitBacked?: boolean): Promise<{ gitBacked: boolean; shortStatus: string }> {
  if (!(knownGitBacked ?? await isGitBacked(root))) {
    return { gitBacked: false, shortStatus: "" };
  }
  const result = await runBoundedGit({
    cwd: root,
    args: ["--no-pager", "status", "--short", "--untracked-files=all", "--", "."],
  });
  return {
    gitBacked: true,
    shortStatus: result.stdout,
  };
}

export async function gitDiff(root: string, knownGitBacked?: boolean, input: GitDiffInput = {}) {
  if (!(knownGitBacked ?? await isGitBacked(root))) return { gitBacked: false, diff: "" };
  return inspectGitDiff(root, input);
}

export function isGitBacked(root: string): Promise<boolean> {
  return isGitWorkTree(root);
}

export async function preCommitSafetyScan(root: string, knownGitBacked?: boolean): Promise<{ findings: string[] }> {
  const files = (await listRepositoryFiles(root, { gitBacked: knownGitBacked })).files;
  const findings: string[] = [];
  for (const relativePath of files) {
    if (/\.env(?:\.|$)|token|secret|credential/i.test(relativePath)) {
      findings.push(`Sensitive-looking path: ${relativePath}`);
    }
    if (/\.(zip|7z|rar|png|jpg|jpeg|gif|mp4|mov)$/i.test(relativePath)) {
      findings.push(`Large/binary artifact should be reviewed before staging: ${relativePath}`);
    }
  }
  return { findings };
}

function stringParam(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function numberParam(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function requiredString(value: unknown, name: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new AgentHarnessError("INVALID_INPUT", `${name} is required.`);
  }
  return value;
}

function requiredNumber(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new AgentHarnessError("INVALID_INPUT", `${name} is required.`);
  }
  return value;
}
