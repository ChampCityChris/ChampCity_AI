import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { AgentHarnessError } from "../core/errors";
import {
  type ReleaseCommandReceipt,
  type ReleaseCommandRequest,
  type ReleaseCommandRunner,
  runFixedReleaseCommand,
} from "./releaseCommandAdapter";

const PACKAGE_JSON = "package.json";
const VERSION_FILE_CANDIDATES = [PACKAGE_JSON, "package-lock.json", "npm-shrinkwrap.json"];
const UNPACKED_EXECUTABLE_RELATIVE_PATH = "release/win-unpacked/ChampCityAI.exe";
const COMPLETED_VALIDATION_CAPACITY = 4;
const SUPPORTED_ACTIONS = [
  "status",
  "set_version",
  "validate_candidate",
  "build_windows_release",
  "inspect_release_artifact",
  "publish_github_release",
  "verify_github_release",
] as const;
const SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

const VALIDATION_COMMANDS = [
  "npm-ci",
  "npm-run-typecheck",
  "npm-run-build",
  "npm-test",
  "git-diff-check",
  "git-status-short",
] as const satisfies ReadonlyArray<ReleaseCommandRequest["id"]>;

const WINDOWS_BUILD_COMMANDS = [
  "npm-package-win-dir",
  "npm-package-win",
  "npm-validate-package-win",
] as const satisfies ReadonlyArray<ReleaseCommandRequest["id"]>;

export interface ReleaseToolbox {
  status(root: string, gitBacked: boolean): Promise<Record<string, unknown>>;
  setVersion(root: string, version: string): Promise<Record<string, unknown>>;
  validateCandidate(root: string): Promise<Record<string, unknown>>;
  buildWindowsRelease(root: string): Promise<Record<string, unknown>>;
  inspectReleaseArtifact(root: string): Promise<Record<string, unknown>>;
  publishGithubRelease(root: string, gitBacked: boolean, tagName: string): Promise<Record<string, unknown>>;
  verifyGithubRelease(root: string, gitBacked: boolean, tagName: string): Promise<Record<string, unknown>>;
}

export function createReleaseToolbox(options: {
  commandRunner?: ReleaseCommandRunner;
} = {}): ReleaseToolbox {
  const runCommand = options.commandRunner ?? runFixedReleaseCommand;
  const completedValidations = new Map<string, Record<string, unknown>>();

  return {
    async status(root, gitBacked) {
      const packageVersion = await readPackageVersion(root);
      const validPackageVersion = isValidSemver(packageVersion);
      const installerRelativePath = validPackageVersion ? canonicalInstallerRelativePath(packageVersion) : null;
      const [origin, ghVersion] = await Promise.all([
        gitBacked ? runCommand({ root, id: "git-origin-url" }) : Promise.resolve(null),
        runCommand({ root, id: "gh-version" }),
      ]);
      const githubRepository = origin?.status === "succeeded"
        ? parseGithubRepository(origin.stdout)
        : null;
      const ghInstalled = ghVersion.status === "succeeded";
      const ghAuth = ghInstalled
        ? await runCommand({ root, id: "gh-auth-status" })
        : null;
      const installer = installerRelativePath
        ? await inspectFile(path.join(root, ...installerRelativePath.split("/")), false)
        : { exists: false };
      return {
        packageVersion,
        packageVersionValid: validPackageVersion,
        expectedInstallerPath: installerRelativePath,
        installerExists: installer.exists,
        githubRemote: {
          resolvesToGithub: githubRepository !== null,
          repository: githubRepository,
        },
        githubCli: {
          installed: ghInstalled,
          authenticated: ghAuth?.status === "succeeded",
        },
        latestCandidateValidation: completedValidations.get(releaseRootIdentity(root)) ?? null,
        supportedActions: [...SUPPORTED_ACTIONS],
      };
    },

    async setVersion(root, version) {
      assertValidSemver(version, "version");
      const before = await captureVersionFileState(root);
      const receipt = await runCommand({ root, id: "npm-set-version", version });
      requireSuccessfulCommand(receipt, "npm version failed.");
      const effectiveVersion = await readPackageVersion(root);
      if (effectiveVersion !== version) {
        throw new AgentHarnessError(
          "RELEASE_INVARIANT_FAILED",
          "npm version did not produce the requested package version.",
          { requestedVersion: version, effectiveVersion },
        );
      }
      const after = await captureVersionFileState(root);
      const changedVersionFiles = VERSION_FILE_CANDIDATES.filter((relativePath) => before[relativePath] !== after[relativePath]);
      return {
        requestedVersion: version,
        effectiveVersion,
        changedVersionFiles,
        commandReceipt: receipt,
      };
    },

    async validateCandidate(root) {
      const validationId = `validation_${randomUUID()}`;
      const startedAt = new Date().toISOString();
      const result = await runSequence(root, VALIDATION_COMMANDS, runCommand);
      const completed = {
        validationId,
        startedAt,
        completedAt: new Date().toISOString(),
        passed: result.passed,
        failedCommand: result.failedCommand,
        commandReceipts: result.receipts,
      };
      retainCompletedValidation(completedValidations, root, completed);
      return completed;
    },

    async buildWindowsRelease(root) {
      const packageVersion = await readValidPackageVersion(root);
      const result = await runSequence(root, WINDOWS_BUILD_COMMANDS, runCommand);
      if (!result.passed) {
        return {
          passed: false,
          packageVersion,
          failedCommand: result.failedCommand,
          commandReceipts: result.receipts,
        };
      }
      const unpackedExecutable = await inspectFile(
        path.join(root, ...UNPACKED_EXECUTABLE_RELATIVE_PATH.split("/")),
        false,
      );
      if (!unpackedExecutable.exists) {
        throw new AgentHarnessError(
          "RELEASE_ARTIFACT_MISSING",
          "Canonical unpacked Windows executable is missing after package validation.",
          { relativePath: UNPACKED_EXECUTABLE_RELATIVE_PATH },
        );
      }
      const installer = await inspectCanonicalInstaller(root, packageVersion);
      if (!installer.exists) {
        throw new AgentHarnessError(
          "RELEASE_ARTIFACT_MISSING",
          "Canonical Windows installer is missing after package validation.",
          { relativePath: installer.relativePath },
        );
      }
      return {
        passed: true,
        packageVersion,
        installerPath: installer.relativePath,
        installerSizeBytes: installer.sizeBytes,
        installerSha256: installer.sha256,
        unpackedExecutablePath: UNPACKED_EXECUTABLE_RELATIVE_PATH,
        commandReceipts: result.receipts,
      };
    },

    async inspectReleaseArtifact(root) {
      const packageVersion = await readValidPackageVersion(root);
      const installer = await inspectCanonicalInstaller(root, packageVersion);
      return {
        packageVersion,
        exists: installer.exists,
        relativePath: installer.relativePath,
        ...(installer.exists ? { sizeBytes: installer.sizeBytes, sha256: installer.sha256 } : {}),
      };
    },

    async publishGithubRelease(root, gitBacked, tagName) {
      requireGitBacked(gitBacked);
      const packageVersion = await readValidPackageVersion(root);
      assertExactTag(tagName, packageVersion);
      const repository = await requireGithubRepository(root, runCommand);
      await requireGithubCli(root, runCommand);

      const [headReceipt, localTagReceipt, remoteTagReceipt, statusReceipt] = await Promise.all([
        runCommand({ root, id: "git-head" }),
        runCommand({ root, id: "git-local-tag-target", tagName }),
        runCommand({ root, id: "git-remote-tag-target", tagName }),
        runCommand({ root, id: "git-status-porcelain" }),
      ]);
      requireSuccessfulCommand(headReceipt, "Current Git HEAD could not be resolved.");
      requireSuccessfulCommand(localTagReceipt, "The required local release tag does not exist.");
      requireSuccessfulCommand(remoteTagReceipt, "The release tag could not be verified on origin.");
      requireSuccessfulCommand(statusReceipt, "The release working state could not be inspected.");
      const sourceCommit = normalizedCommit(headReceipt.stdout, "Current Git HEAD is invalid.");
      const localTagTarget = normalizedCommit(localTagReceipt.stdout, "Local release tag target is invalid.");
      if (localTagTarget !== sourceCommit) {
        throw new AgentHarnessError("RELEASE_INVARIANT_FAILED", "The local release tag does not resolve to current HEAD.");
      }
      const remoteTagTarget = parseRemoteTagTarget(remoteTagReceipt.stdout, tagName);
      if (remoteTagTarget !== localTagTarget) {
        throw new AgentHarnessError("RELEASE_INVARIANT_FAILED", "The origin release tag does not match the local tag target.");
      }
      if (statusReceipt.stdout.trim()) {
        throw new AgentHarnessError("RELEASE_INVARIANT_FAILED", "Git working tree and index must be clean for publication.");
      }

      const installer = await inspectCanonicalInstaller(root, packageVersion);
      if (!installer.exists) {
        throw new AgentHarnessError("RELEASE_ARTIFACT_MISSING", "Canonical Windows installer is missing.", {
          relativePath: installer.relativePath,
        });
      }
      const notesRelativePath = canonicalNotesRelativePath(packageVersion);
      const notesPath = path.join(root, ...notesRelativePath.split("/"));
      const notes = await inspectFile(notesPath, false);
      if (!notes.exists) {
        throw new AgentHarnessError("RELEASE_ARTIFACT_MISSING", "Canonical release notes are missing.", {
          relativePath: notesRelativePath,
        });
      }

      const existing = await runCommand({ root, id: "gh-release-view", repository, tagName });
      if (existing.status === "succeeded") {
        throw new AgentHarnessError("RELEASE_ALREADY_EXISTS", "A GitHub Release already exists for this tag.");
      }
      if (!isReleaseNotFound(existing)) {
        throw commandError("GitHub Release existence could not be verified.", existing);
      }

      const title = `ChampCity A/I Desktop ${packageVersion}`;
      const providerReceipt = await runCommand({
        root,
        id: "gh-release-create",
        repository,
        tagName,
        title,
        installerPath: path.join(root, ...installer.relativePath.split("/")),
        installerRelativePath: installer.relativePath,
        notesPath,
        notesRelativePath,
        prerelease: hasPrereleaseComponent(packageVersion),
      });
      requireSuccessfulCommand(providerReceipt, "GitHub Release publication failed.");
      const releaseUrl = extractReleaseUrl(providerReceipt.stdout);
      if (!releaseUrl) {
        throw new AgentHarnessError(
          "RELEASE_PROVIDER_FAILED",
          "GitHub CLI did not return a release URL after publication.",
        );
      }
      return {
        tag: tagName,
        sourceCommit,
        releaseUrl,
        installerFilename: path.posix.basename(installer.relativePath),
        localInstallerSha256: installer.sha256,
        providerReceipt,
      };
    },

    async verifyGithubRelease(root, gitBacked, tagName) {
      requireGitBacked(gitBacked);
      const packageVersion = await readValidPackageVersion(root);
      assertExactTag(tagName, packageVersion);
      const repository = await requireGithubRepository(root, runCommand);
      await requireGithubCli(root, runCommand);
      const installer = await inspectCanonicalInstaller(root, packageVersion);
      if (!installer.exists) {
        throw new AgentHarnessError("RELEASE_ARTIFACT_MISSING", "Canonical local Windows installer is missing.", {
          relativePath: installer.relativePath,
        });
      }
      const assetFilename = path.posix.basename(installer.relativePath);
      const releaseReceipt = await runCommand({ root, id: "gh-release-view", repository, tagName });
      requireSuccessfulCommand(releaseReceipt, "Published GitHub Release could not be inspected.");
      const release = parseReleaseView(releaseReceipt.stdout);
      if (release.tagName !== tagName) {
        throw new AgentHarnessError("RELEASE_VERIFICATION_FAILED", "Published release tag does not match the requested tag.");
      }
      if (!release.assets.includes(assetFilename)) {
        throw new AgentHarnessError("RELEASE_VERIFICATION_FAILED", "Published release is missing the canonical installer asset.", {
          assetFilename,
        });
      }

      const temporaryDirectory = await fs.promises.mkdtemp(path.join(os.tmpdir(), "champcity-release-verify-"));
      try {
        const downloadReceipt = await runCommand({
          root,
          id: "gh-release-download",
          repository,
          tagName,
          assetName: assetFilename,
          temporaryDirectory,
        });
        requireSuccessfulCommand(downloadReceipt, "Published installer download failed.");
        const downloadedPath = path.join(temporaryDirectory, assetFilename);
        const downloaded = await inspectFile(downloadedPath, true);
        if (!downloaded.exists || !downloaded.sha256) {
          throw new AgentHarnessError("RELEASE_VERIFICATION_FAILED", "Downloaded canonical installer asset is missing.");
        }
        const match = downloaded.sha256 === installer.sha256;
        if (!match) {
          throw new AgentHarnessError("RELEASE_VERIFICATION_FAILED", "Published installer SHA-256 does not match the local installer.", {
            tag: tagName,
            assetFilename,
            localHash: installer.sha256,
            downloadedHash: downloaded.sha256,
            match,
          });
        }
        return {
          releaseUrl: release.url,
          tag: tagName,
          assetFilename,
          localHash: installer.sha256,
          downloadedHash: downloaded.sha256,
          match,
          providerReceipts: [releaseReceipt, downloadReceipt],
        };
      } finally {
        await fs.promises.rm(temporaryDirectory, { recursive: true, force: true });
      }
    },
  };
}

function retainCompletedValidation(
  completedValidations: Map<string, Record<string, unknown>>,
  root: string,
  result: Record<string, unknown>,
): void {
  const rootIdentity = releaseRootIdentity(root);
  completedValidations.delete(rootIdentity);
  completedValidations.set(rootIdentity, result);
  while (completedValidations.size > COMPLETED_VALIDATION_CAPACITY) {
    const oldestRoot = completedValidations.keys().next().value as string | undefined;
    if (!oldestRoot) {
      break;
    }
    completedValidations.delete(oldestRoot);
  }
}

function releaseRootIdentity(root: string): string {
  const resolved = path.resolve(root);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

export function isValidSemver(value: string): boolean {
  return typeof value === "string" && value.length <= 256 && SEMVER_PATTERN.test(value);
}

function assertValidSemver(value: string, name: string): void {
  if (!isValidSemver(value)) {
    throw new AgentHarnessError("INVALID_INPUT", `${name} must be a valid SemVer value without leading-zero numeric components.`);
  }
}

function assertExactTag(tagName: string, packageVersion: string): void {
  if (tagName !== `v${packageVersion}`) {
    throw new AgentHarnessError("INVALID_INPUT", "tagName must exactly equal v<packageVersion>.");
  }
}

async function readPackageVersion(root: string): Promise<string> {
  let source: string;
  try {
    source = await fs.promises.readFile(path.join(root, PACKAGE_JSON), "utf8");
  } catch {
    throw new AgentHarnessError("RELEASE_INVARIANT_FAILED", "package.json could not be read from the registered repository.");
  }
  try {
    const parsed = JSON.parse(source) as { version?: unknown };
    if (typeof parsed.version !== "string") {
      throw new Error("missing version");
    }
    return parsed.version;
  } catch {
    throw new AgentHarnessError("RELEASE_INVARIANT_FAILED", "package.json does not contain a readable version string.");
  }
}

async function readValidPackageVersion(root: string): Promise<string> {
  const version = await readPackageVersion(root);
  if (!isValidSemver(version)) {
    throw new AgentHarnessError("RELEASE_INVARIANT_FAILED", "Current package version is not valid SemVer.");
  }
  return version;
}

function canonicalInstallerRelativePath(version: string): string {
  return `release/ChampCityAI-Setup-${version}.exe`;
}

function canonicalNotesRelativePath(version: string): string {
  return `docs/release/RELEASE_NOTES_${version}.md`;
}

function hasPrereleaseComponent(version: string): boolean {
  return version.split("+", 1)[0].includes("-");
}

async function inspectCanonicalInstaller(root: string, version: string): Promise<{
  exists: boolean;
  relativePath: string;
  sizeBytes?: number;
  sha256?: string;
}> {
  const relativePath = canonicalInstallerRelativePath(version);
  const inspected = await inspectFile(path.join(root, ...relativePath.split("/")), true);
  return { relativePath, ...inspected };
}

async function inspectFile(target: string, includeHash: boolean): Promise<{
  exists: boolean;
  sizeBytes?: number;
  sha256?: string;
}> {
  let stats: fs.Stats;
  try {
    stats = await fs.promises.lstat(target);
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return { exists: false };
    }
    throw new AgentHarnessError("RELEASE_ARTIFACT_INVALID", "Canonical release artifact could not be inspected.");
  }
  if (!stats.isFile() || stats.isSymbolicLink()) {
    throw new AgentHarnessError("RELEASE_ARTIFACT_INVALID", "Canonical release artifact must be a regular non-symlink file.");
  }
  return {
    exists: true,
    sizeBytes: stats.size,
    ...(includeHash ? { sha256: await hashFile(target) } : {}),
  };
}

function hashFile(target: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = fs.createReadStream(target);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.once("error", () => reject(new AgentHarnessError(
      "RELEASE_ARTIFACT_INVALID",
      "Canonical release artifact could not be hashed.",
    )));
    stream.once("end", () => resolve(hash.digest("hex")));
  });
}

async function captureVersionFileState(root: string): Promise<Record<string, string | null>> {
  const entries = await Promise.all(VERSION_FILE_CANDIDATES.map(async (relativePath) => {
    const target = path.join(root, relativePath);
    try {
      const contents = await fs.promises.readFile(target);
      return [relativePath, createHash("sha256").update(contents).digest("hex")] as const;
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") {
        return [relativePath, null] as const;
      }
      throw new AgentHarnessError("RELEASE_INVARIANT_FAILED", "Release version files could not be inspected.");
    }
  }));
  return Object.fromEntries(entries);
}

async function runSequence(
  root: string,
  ids: ReadonlyArray<ReleaseCommandRequest["id"]>,
  runCommand: ReleaseCommandRunner,
): Promise<{ passed: boolean; failedCommand: string | null; receipts: ReleaseCommandReceipt[] }> {
  const receipts: ReleaseCommandReceipt[] = [];
  for (const id of ids) {
    const receipt = await runCommand({ root, id } as ReleaseCommandRequest);
    receipts.push(receipt);
    if (receipt.status !== "succeeded") {
      return { passed: false, failedCommand: id, receipts };
    }
  }
  return { passed: true, failedCommand: null, receipts };
}

async function requireGithubRepository(root: string, runCommand: ReleaseCommandRunner): Promise<string> {
  const receipt = await runCommand({ root, id: "git-origin-url" });
  requireSuccessfulCommand(receipt, "Git origin could not be inspected.");
  const repository = parseGithubRepository(receipt.stdout);
  if (!repository) {
    throw new AgentHarnessError("RELEASE_PREREQUISITE_UNAVAILABLE", "Git origin must resolve to a GitHub repository.");
  }
  return repository;
}

async function requireGithubCli(root: string, runCommand: ReleaseCommandRunner): Promise<void> {
  const version = await runCommand({ root, id: "gh-version" });
  if (version.status !== "succeeded") {
    throw new AgentHarnessError("RELEASE_PREREQUISITE_UNAVAILABLE", "GitHub CLI is not installed or runnable.");
  }
  const auth = await runCommand({ root, id: "gh-auth-status" });
  if (auth.status !== "succeeded") {
    throw new AgentHarnessError("RELEASE_PREREQUISITE_UNAVAILABLE", "GitHub CLI is not authenticated for github.com.");
  }
}

function parseGithubRepository(remote: string): string | null {
  const value = remote.trim();
  let owner = "";
  let repository = "";
  try {
    if (/^https?:\/\//i.test(value) || /^ssh:\/\//i.test(value)) {
      const url = new URL(value);
      if (url.hostname.toLowerCase() !== "github.com") {
        return null;
      }
      const parts = url.pathname.replace(/^\/+|\/+$/g, "").split("/");
      if (parts.length !== 2) {
        return null;
      }
      [owner, repository] = parts;
    } else {
      const match = /^(?:[^@\s]+@)?github\.com:([^/\s]+)\/([^\s]+)$/.exec(value);
      if (!match) {
        return null;
      }
      [, owner, repository] = match;
    }
  } catch {
    return null;
  }
  repository = repository.replace(/\.git$/i, "");
  if (!/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repository)) {
    return null;
  }
  return `${owner}/${repository}`;
}

function parseRemoteTagTarget(output: string, tagName: string): string {
  const targets = new Map<string, string>();
  for (const line of output.split(/\r?\n/)) {
    const match = /^([0-9a-fA-F]{40,64})\s+(.+)$/.exec(line.trim());
    if (match) {
      targets.set(match[2], match[1].toLowerCase());
    }
  }
  const peeled = targets.get(`refs/tags/${tagName}^{}`);
  const direct = targets.get(`refs/tags/${tagName}`);
  const target = peeled ?? direct;
  if (!target) {
    throw new AgentHarnessError("RELEASE_INVARIANT_FAILED", "The release tag is missing from origin.");
  }
  return target;
}

function normalizedCommit(value: string, message: string): string {
  const commit = value.trim().toLowerCase();
  if (!/^[0-9a-f]{40,64}$/.test(commit)) {
    throw new AgentHarnessError("RELEASE_INVARIANT_FAILED", message);
  }
  return commit;
}

function isReleaseNotFound(receipt: ReleaseCommandReceipt): boolean {
  return receipt.status === "nonzero" && /(?:release not found|no release found|not a valid release)/i.test(receipt.stderr);
}

function parseReleaseView(output: string): { url: string; tagName: string; assets: string[] } {
  try {
    const parsed = JSON.parse(output) as {
      url?: unknown;
      tagName?: unknown;
      assets?: Array<{ name?: unknown }>;
    };
    if (
      typeof parsed.url !== "string" ||
      !/^https:\/\/github\.com\//i.test(parsed.url) ||
      typeof parsed.tagName !== "string" ||
      !Array.isArray(parsed.assets)
    ) {
      throw new Error("invalid release metadata");
    }
    return {
      url: parsed.url,
      tagName: parsed.tagName,
      assets: parsed.assets.flatMap((asset) => typeof asset.name === "string" ? [asset.name] : []),
    };
  } catch {
    throw new AgentHarnessError("RELEASE_PROVIDER_FAILED", "GitHub CLI returned invalid release metadata.");
  }
}

function extractReleaseUrl(output: string): string | null {
  const candidate = output.split(/\r?\n/).map((line) => line.trim()).find((line) => /^https:\/\/github\.com\//i.test(line));
  return candidate ?? null;
}

function requireSuccessfulCommand(receipt: ReleaseCommandReceipt, message: string): void {
  if (receipt.status !== "succeeded") {
    throw commandError(message, receipt);
  }
}

function commandError(message: string, receipt: ReleaseCommandReceipt): AgentHarnessError {
  const code = receipt.status === "timeout"
    ? "RELEASE_TIMEOUT"
    : receipt.status === "spawn-error"
      ? "RELEASE_PREREQUISITE_UNAVAILABLE"
      : "RELEASE_COMMAND_FAILED";
  return new AgentHarnessError(code, message, {
    commandId: receipt.commandId,
    status: receipt.status,
    exitCode: receipt.exitCode,
    stdoutTruncated: receipt.stdoutTruncated,
    stderrTruncated: receipt.stderrTruncated,
    diagnostic: receipt.stderr.trim().slice(-1_000),
  });
}

function requireGitBacked(gitBacked: boolean): void {
  if (!gitBacked) {
    throw new AgentHarnessError("GIT_CAPABILITY_UNAVAILABLE", "The registered project is not Git-backed.");
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
