import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { AgentHarnessError } from "../core/errors";
import { isPathInside, resolveRepositoryPath, toRepositoryRelativePath } from "./pathPolicy";
import {
  inlineOrInspect,
  inspectTextFile,
  readMarkdownSection,
  readTextChunk,
  readTextLines,
} from "./textProjection";

const SKIPPED_DIRECTORIES = new Set([".git", "node_modules", "dist", ".vite"]);
const MAX_LISTED_FILES = 1_000;
const MAX_SEARCH_RESULTS = 200;
const MAX_WRITE_BYTES = 1_000_000;

export function listRepositoryFiles(root: string, options: { directory?: string; maxFiles?: number } = {}): {
  root: string;
  directory: string;
  files: string[];
  truncated: boolean;
} {
  const resolved = resolveRepositoryPath(root, options.directory ?? ".");
  const start = resolved.resolvedPath;
  const maxFiles = Math.min(Math.max(1, options.maxFiles ?? MAX_LISTED_FILES), MAX_LISTED_FILES);
  const files: string[] = [];
  function visit(current: string): void {
    if (files.length >= maxFiles) {
      return;
    }
    const stats = fs.lstatSync(current);
    if (stats.isSymbolicLink()) {
      return;
    }
    if (stats.isDirectory()) {
      const directoryRealPath = fs.realpathSync.native(current);
      if (!isPathInside(directoryRealPath, resolved.rootRealPath)) {
        return;
      }
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        if (SKIPPED_DIRECTORIES.has(entry.name)) {
          continue;
        }
        visit(path.join(current, entry.name));
        if (files.length >= maxFiles) {
          return;
        }
      }
      return;
    }
    if (stats.isFile()) {
      const fileRealPath = fs.realpathSync.native(current);
      if (isPathInside(fileRealPath, resolved.rootRealPath)) {
        files.push(toRepositoryRelativePath(resolved.rootRealPath, fileRealPath));
      }
    }
  }
  visit(start);
  return {
    root: resolved.rootRealPath,
    directory: resolved.relativePath,
    files,
    truncated: files.length >= maxFiles,
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

export function searchRepositoryFiles(root: string, query: string, options: { directory?: string; maxResults?: number } = {}): {
  query: string;
  matches: Array<{ relativePath: string; line: number; preview: string }>;
  truncated: boolean;
} {
  if (!query.trim()) {
    throw new AgentHarnessError("INVALID_INPUT", "query is required.");
  }
  const files = listRepositoryFiles(root, { directory: options.directory }).files;
  const maxResults = Math.min(Math.max(1, options.maxResults ?? MAX_SEARCH_RESULTS), MAX_SEARCH_RESULTS);
  const matches: Array<{ relativePath: string; line: number; preview: string }> = [];
  const needle = query.toLowerCase();
  for (const relativePath of files) {
    if (matches.length >= maxResults) {
      break;
    }
    const resolved = resolveRepositoryPath(root, relativePath);
    const buffer = fs.readFileSync(resolved.resolvedPath);
    if (buffer.includes(0) || buffer.length > 500_000) {
      continue;
    }
    const lines = buffer.toString("utf8").split(/\r\n|\n|\r/);
    for (let index = 0; index < lines.length; index += 1) {
      if (lines[index].toLowerCase().includes(needle)) {
        matches.push({ relativePath, line: index + 1, preview: lines[index].slice(0, 500) });
        if (matches.length >= maxResults) {
          break;
        }
      }
    }
  }
  return { query, matches, truncated: matches.length >= maxResults };
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

export function gitStatus(root: string): { gitBacked: boolean; shortStatus: string } {
  if (!isGitBacked(root)) {
    return { gitBacked: false, shortStatus: "" };
  }
  return {
    gitBacked: true,
    shortStatus: execFileSync("git", ["status", "--short"], { cwd: root, encoding: "utf8" }),
  };
}

export function gitDiff(root: string): { gitBacked: boolean; diff: string } {
  if (!isGitBacked(root)) {
    return { gitBacked: false, diff: "" };
  }
  return {
    gitBacked: true,
    diff: execFileSync("git", ["diff", "--", "."], { cwd: root, encoding: "utf8", maxBuffer: 500_000 }),
  };
}

export function isGitBacked(root: string): boolean {
  try {
    execFileSync("git", ["rev-parse", "--is-inside-work-tree"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return true;
  } catch {
    return false;
  }
}

export function preCommitSafetyScan(root: string): { findings: string[] } {
  const files = listRepositoryFiles(root).files;
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
