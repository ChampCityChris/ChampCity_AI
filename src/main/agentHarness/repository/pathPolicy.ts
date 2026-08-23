import fs from "node:fs";
import path from "node:path";
import { AgentHarnessError } from "../core/errors";

function normalizeForComparison(value: string): string {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

export function isPathInside(childPath: string, parentPath: string): boolean {
  const child = normalizeForComparison(childPath);
  const parent = normalizeForComparison(parentPath);
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export function assertSafeRelativePath(relativePath: string): string {
  if (relativePath.includes("\0")) {
    throw new AgentHarnessError("PATH_DENIED", "Path contains a null byte.");
  }
  const normalizedInput = relativePath.trim() === "" ? "." : relativePath.trim();
  if (
    path.isAbsolute(normalizedInput) ||
    normalizedInput.startsWith("\\\\") ||
    normalizedInput.startsWith("//") ||
    /^[a-zA-Z]:/.test(normalizedInput) ||
    normalizedInput.includes(":")
  ) {
    throw new AgentHarnessError("PATH_DENIED", "Expected a repository-relative path.");
  }
  const segments = normalizedInput.split(/[\\/]+/).filter(Boolean);
  if (segments.some((segment) => segment === "..")) {
    throw new AgentHarnessError("PATH_DENIED", "Path traversal is not allowed.");
  }
  return segments.join(path.sep) || ".";
}

export function resolveRepositoryPath(root: string, relativePath: string, options: { allowMissingLeaf?: boolean } = {}): {
  rootRealPath: string;
  requestedPath: string;
  resolvedPath: string;
  relativePath: string;
} {
  const rootRealPath = fs.realpathSync.native(path.resolve(root));
  const safeRelativePath = assertSafeRelativePath(relativePath);
  const requestedPath = path.resolve(rootRealPath, safeRelativePath);
  let existing = requestedPath;
  while (!fs.existsSync(existing)) {
    if (!options.allowMissingLeaf && existing === requestedPath) {
      throw new AgentHarnessError("FILE_DENIED", "Requested path does not exist.", { relativePath });
    }
    const parent = path.dirname(existing);
    if (parent === existing) {
      throw new AgentHarnessError("PATH_DENIED", "Could not resolve an existing parent.");
    }
    existing = parent;
  }
  const existingRealPath = fs.realpathSync.native(existing);
  const missingTail = path.relative(existing, requestedPath);
  const resolvedPath = missingTail ? path.resolve(existingRealPath, missingTail) : existingRealPath;
  if (!isPathInside(resolvedPath, rootRealPath)) {
    throw new AgentHarnessError("PATH_DENIED", "Resolved path escapes the selected repository root.", {
      relativePath,
    });
  }
  return {
    rootRealPath,
    requestedPath,
    resolvedPath,
    relativePath: path.relative(rootRealPath, resolvedPath).split(path.sep).join("/") || ".",
  };
}

export function toRepositoryRelativePath(root: string, absolutePath: string): string {
  const relative = path.relative(path.resolve(root), absolutePath);
  return relative === "" ? "." : relative.split(path.sep).join("/");
}
