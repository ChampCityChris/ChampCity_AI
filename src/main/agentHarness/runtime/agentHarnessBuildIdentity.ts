import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

interface RuntimeBuildFile {
  absolutePath: string;
  deploymentRelativePath: string;
  content: Buffer;
}

const relativeRequirePattern = /\brequire\(\s*["'](\.{1,2}\/[^"']+)["']\s*\)/g;

/**
 * Identifies the JavaScript runtime build a detached host actually loaded. A host
 * retains the value captured at startup while a newly-built desktop computes
 * the digest from the current dist tree, making an in-place build mismatch
 * visible without exposing paths or source content.
 */
export function computeAgentHarnessRuntimeBuildIdentity(compiledMainRoot: string): string {
  const files = collectRuntimeBuildFiles(compiledMainRoot);
  const hash = createHash("sha256");
  hash.update("champcity-agent-harness-runtime-v2\0");
  hash.update(`files:${files.length}\0`);
  for (const file of files) {
    hash.update(file.deploymentRelativePath);
    hash.update("\0");
    hash.update(String(file.content.byteLength));
    hash.update("\0");
    hash.update(file.content);
    hash.update("\0");
  }
  return `sha256:${hash.digest("hex")}`;
}

function collectRuntimeBuildFiles(compiledMainRoot: string): RuntimeBuildFile[] {
  const deploymentRoot = path.resolve(compiledMainRoot, "..");
  const agentHarnessRoot = path.resolve(compiledMainRoot, "agentHarness");
  assertContained(deploymentRoot, agentHarnessRoot, "Agent Harness runtime build root is invalid.");

  const pending = enumerateJavaScriptFiles(agentHarnessRoot, deploymentRoot);
  if (pending.length === 0) {
    throw identityFailure("Agent Harness runtime build is unavailable.");
  }

  const captured = new Map<string, RuntimeBuildFile>();
  while (pending.length > 0) {
    const absolutePath = pending.pop();
    if (!absolutePath) {
      continue;
    }
    const deploymentRelativePath = stableRelativePath(deploymentRoot, absolutePath);
    if (captured.has(deploymentRelativePath)) {
      continue;
    }

    const content = readRuntimeModule(absolutePath, deploymentRelativePath);
    captured.set(deploymentRelativePath, { absolutePath, deploymentRelativePath, content });
    for (const dependency of findRelativeRuntimeDependencies(content.toString("utf8"))) {
      const resolvedDependency = resolveRuntimeDependency(absolutePath, dependency, deploymentRoot);
      if (!captured.has(stableRelativePath(deploymentRoot, resolvedDependency))) {
        pending.push(resolvedDependency);
      }
    }
  }

  return [...captured.values()].sort((left, right) =>
    left.deploymentRelativePath.localeCompare(right.deploymentRelativePath, "en"));
}

function enumerateJavaScriptFiles(directory: string, deploymentRoot: string): string[] {
  const pendingDirectories = [directory];
  const files: string[] = [];
  while (pendingDirectories.length > 0) {
    const current = pendingDirectories.pop();
    if (!current) {
      continue;
    }
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      throw identityFailure("Agent Harness runtime build cannot be enumerated.");
    }
    for (const entry of entries) {
      const target = path.resolve(current, entry.name);
      assertContained(deploymentRoot, target, "Runtime build enumeration escaped the deployment boundary.");
      if (entry.isSymbolicLink()) {
        throw identityFailure(`Runtime build contains an unsupported symbolic link: ${stableRelativePath(deploymentRoot, target)}.`);
      }
      if (entry.isDirectory()) {
        pendingDirectories.push(target);
      } else if (entry.isFile() && entry.name.endsWith(".js")) {
        files.push(target);
      }
    }
  }
  return files;
}

function findRelativeRuntimeDependencies(source: string): string[] {
  const dependencies = new Set<string>();
  relativeRequirePattern.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = relativeRequirePattern.exec(source)) !== null) {
    if (match[1]) {
      dependencies.add(match[1]);
    }
  }
  return [...dependencies];
}

function resolveRuntimeDependency(sourcePath: string, specifier: string, deploymentRoot: string): string {
  const unresolved = path.resolve(path.dirname(sourcePath), specifier);
  assertContained(deploymentRoot, unresolved, "Runtime build dependency escaped the deployment boundary.");
  const candidates = path.extname(unresolved)
    ? [unresolved]
    : [`${unresolved}.js`, path.join(unresolved, "index.js")];
  for (const candidate of candidates) {
    assertContained(deploymentRoot, candidate, "Runtime build dependency escaped the deployment boundary.");
    try {
      const stat = fs.lstatSync(candidate);
      if (stat.isSymbolicLink()) {
        throw identityFailure(`Runtime build dependency is an unsupported symbolic link: ${stableRelativePath(deploymentRoot, candidate)}.`);
      }
      if (stat.isFile() && candidate.endsWith(".js")) {
        return candidate;
      }
    } catch (error) {
      if (!isMissingPathError(error)) {
        throw error;
      }
    }
  }
  throw identityFailure(`Runtime build dependency is unavailable: ${specifier}.`);
}

function readRuntimeModule(absolutePath: string, deploymentRelativePath: string): Buffer {
  try {
    const stat = fs.lstatSync(absolutePath);
    if (!stat.isFile() || stat.isSymbolicLink()) {
      throw identityFailure(`Runtime build module is not a regular file: ${deploymentRelativePath}.`);
    }
    return fs.readFileSync(absolutePath);
  } catch (error) {
    if (error instanceof AgentHarnessBuildIdentityError) {
      throw error;
    }
    throw identityFailure(`Runtime build module cannot be read: ${deploymentRelativePath}.`);
  }
}

function stableRelativePath(deploymentRoot: string, target: string): string {
  assertContained(deploymentRoot, target, "Runtime build path escaped the deployment boundary.");
  return path.relative(deploymentRoot, target).split(path.sep).join("/");
}

function assertContained(deploymentRoot: string, target: string, message: string): void {
  const relative = path.relative(deploymentRoot, target);
  if (relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))) {
    return;
  }
  throw identityFailure(message);
}

class AgentHarnessBuildIdentityError extends Error {
  readonly code = "AGENT_HARNESS_BUILD_IDENTITY_FAILED";

  constructor(message: string) {
    super(message);
    this.name = "AgentHarnessBuildIdentityError";
  }
}

function identityFailure(message: string): AgentHarnessBuildIdentityError {
  return new AgentHarnessBuildIdentityError(message);
}

function isMissingPathError(error: unknown): boolean {
  return error !== null && typeof error === "object" && "code" in error && error.code === "ENOENT";
}
