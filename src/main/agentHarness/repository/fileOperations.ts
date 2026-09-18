import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { AgentHarnessError } from "../core/errors";
import { isPathInside, resolveRepositoryPath } from "./pathPolicy";

export const MAX_REPOSITORY_FILE_OPERATION_BYTES = 2_147_483_648;

const TRANSFER_BUFFER_BYTES = 1_048_576;

interface FileIdentity {
  dev: number;
  ino: number;
  birthtimeMs: number;
}

interface SourceEvidence {
  canonicalPath: string;
  relativePath: string;
  identity: FileIdentity;
  bytes: number;
  sha256: string;
}

interface DestinationEvidence {
  canonicalPath: string;
  relativePath: string;
  identity: FileIdentity;
}

export interface RepositoryFileOperationTestHooks {
  afterDestinationParentCreated?: (destinationPath: string) => void | Promise<void>;
  beforeDestinationCreate?: (destinationPath: string) => void | Promise<void>;
  afterCopyTransfer?: (sourcePath: string, destinationPath: string) => void | Promise<void>;
  beforeMoveSourceRemoval?: (sourcePath: string, destinationPath: string) => void | Promise<void>;
  afterMoveSourceRemoval?: (sourcePath: string, destinationPath: string) => void | Promise<void>;
  link?: (sourcePath: string, destinationPath: string) => Promise<void>;
}

export interface RepositoryFileCopyResult {
  sourceRelativePath: string;
  destinationRelativePath: string;
  bytes: number;
  sha256: string;
  sourcePreserved: true;
}

export interface RepositoryFileMoveResult {
  sourceRelativePath: string;
  destinationRelativePath: string;
  bytes: number;
  sha256: string;
  sourceState: "absent";
  destinationState: "present";
}

/**
 * These operations defend the registered workspace boundary against unsafe input,
 * existing path indirection, and ordinary filesystem concurrency. A hostile local
 * process replacing namespace components after a containment check is explicitly
 * outside HOTFIX07; protecting that threat model requires a repository-wide native
 * handle-relative architecture rather than a special case in these two operations.
 */
export async function copyRepositoryFile(
  root: string,
  sourceRelativePath: string,
  destinationRelativePath: string,
  hooks: RepositoryFileOperationTestHooks = {},
): Promise<RepositoryFileCopyResult> {
  let sourceHandle: fs.promises.FileHandle | undefined;
  let destinationHandle: fs.promises.FileHandle | undefined;
  let source: SourceEvidence | undefined;
  let destination: DestinationEvidence | undefined;
  let destinationCreated = false;
  try {
    const opened = await openValidatedSource(root, sourceRelativePath);
    sourceHandle = opened.handle;
    source = opened.evidence;
    destination = await prepareDestination(root, destinationRelativePath, source, hooks);

    destination = await recheckDestination(root, destinationRelativePath, destination, source);
    await assertSourcePathCurrent(root, sourceRelativePath, source);
    await hooks.beforeDestinationCreate?.(destination.canonicalPath);

    try {
      destinationHandle = await fs.promises.open(destination.canonicalPath, "wx+");
      destinationCreated = true;
    } catch (error) {
      if (nodeErrorCode(error) === "EEXIST") {
        throw new AgentHarnessError("FILE_DENIED", "Destination already exists; overwrite is not allowed.", {
          destinationRelativePath: destination.relativePath,
        });
      }
      throw error;
    }
    const createdStats = await destinationHandle.stat();
    if (!createdStats.isFile()) {
      throw new AgentHarnessError("FILE_OPERATION_FAILED", "Copy destination is not a regular file.");
    }
    destination.identity = fileIdentity(createdStats);

    const copiedBytes = await copyFileHandle(sourceHandle, destinationHandle, source.bytes);
    await destinationHandle.sync();
    await hooks.afterCopyTransfer?.(source.canonicalPath, destination.canonicalPath);

    const destinationStats = await destinationHandle.stat();
    const destinationSha256 = await hashFileHandle(destinationHandle, MAX_REPOSITORY_FILE_OPERATION_BYTES);
    const sourceStats = await sourceHandle.stat();
    const sourceSha256 = await hashFileHandle(sourceHandle, MAX_REPOSITORY_FILE_OPERATION_BYTES);
    await assertSourcePathCurrent(root, sourceRelativePath, source);
    await assertOwnedDestinationCurrent(destination);

    if (
      copiedBytes !== source.bytes ||
      destinationStats.size !== source.bytes ||
      destinationSha256 !== source.sha256 ||
      sourceStats.size !== source.bytes ||
      sourceSha256 !== source.sha256
    ) {
      throw new AgentHarnessError("FILE_OPERATION_FAILED", "Copy integrity verification failed.", {
        sourceState: "present-or-changed",
        destinationState: "verification-failed",
      });
    }

    return {
      sourceRelativePath: source.relativePath,
      destinationRelativePath: destination.relativePath,
      bytes: source.bytes,
      sha256: source.sha256,
      sourcePreserved: true,
    };
  } catch (error) {
    await closeQuietly(destinationHandle);
    destinationHandle = undefined;
    if (destinationCreated && destination?.identity) {
      const cleanup = await removeOwnedDestination(destination);
      if (cleanup === "retained") {
        throw new AgentHarnessError(
          "FILE_OPERATION_FAILED",
          "Copy failed and the destination could not be proven safe to remove.",
          { sourceState: "preserved-or-changed", destinationState: "retained" },
        );
      }
    }
    throw boundedFileOperationError(error, "copy");
  } finally {
    await closeQuietly(destinationHandle);
    await closeQuietly(sourceHandle);
  }
}

export async function moveRepositoryFile(
  root: string,
  sourceRelativePath: string,
  destinationRelativePath: string,
  hooks: RepositoryFileOperationTestHooks = {},
): Promise<RepositoryFileMoveResult> {
  let sourceHandle: fs.promises.FileHandle | undefined;
  let source: SourceEvidence | undefined;
  let destination: DestinationEvidence | undefined;
  let destinationCreated = false;
  let sourceRemoved = false;
  const link = hooks.link ?? fs.promises.link;
  try {
    const opened = await openValidatedSource(root, sourceRelativePath);
    sourceHandle = opened.handle;
    source = opened.evidence;
    destination = await prepareDestination(root, destinationRelativePath, source, hooks);

    destination = await recheckDestination(root, destinationRelativePath, destination, source);
    await assertSourcePathCurrent(root, sourceRelativePath, source);
    await hooks.beforeDestinationCreate?.(destination.canonicalPath);

    try {
      await link(source.canonicalPath, destination.canonicalPath);
      destinationCreated = true;
    } catch (error) {
      if (nodeErrorCode(error) === "EEXIST") {
        throw new AgentHarnessError("FILE_DENIED", "Destination already exists; overwrite is not allowed.", {
          destinationRelativePath: destination.relativePath,
        });
      }
      if (nodeErrorCode(error) === "EXDEV") {
        throw new AgentHarnessError(
          "FILE_DENIED",
          "Move requires same-filesystem hard-link semantics; cross-device copy-and-delete is not supported.",
        );
      }
      throw error;
    }

    const destinationStats = await fs.promises.lstat(destination.canonicalPath);
    if (!destinationStats.isFile() || destinationStats.isSymbolicLink()) {
      throw new AgentHarnessError("FILE_OPERATION_FAILED", "Move destination is not a regular file.");
    }
    destination.identity = fileIdentity(destinationStats);
    if (!sameFileIdentity(source.identity, destination.identity)) {
      throw new AgentHarnessError("FILE_OPERATION_FAILED", "Move destination identity verification failed.");
    }

    const destinationEvidence = await readPathIntegrity(destination);
    const sourceStats = await sourceHandle.stat();
    const sourceSha256 = await hashFileHandle(sourceHandle, MAX_REPOSITORY_FILE_OPERATION_BYTES);
    await assertSourcePathCurrent(root, sourceRelativePath, source);
    if (
      destinationEvidence.bytes !== source.bytes ||
      destinationEvidence.sha256 !== source.sha256 ||
      sourceStats.size !== source.bytes ||
      sourceSha256 !== source.sha256
    ) {
      throw new AgentHarnessError("FILE_OPERATION_FAILED", "Move integrity verification failed before source removal.");
    }

    await hooks.beforeMoveSourceRemoval?.(source.canonicalPath, destination.canonicalPath);
    await assertSourcePathCurrent(root, sourceRelativePath, source);
    await assertOwnedDestinationCurrent(destination);
    await fs.promises.unlink(source.canonicalPath);
    sourceRemoved = true;
    await hooks.afterMoveSourceRemoval?.(source.canonicalPath, destination.canonicalPath);

    if (await pathEntryExists(source.canonicalPath)) {
      throw new AgentHarnessError("FILE_OPERATION_FAILED", "Move source path is not absent after removal.");
    }
    await assertOwnedDestinationCurrent(destination);
    const finalDestination = await readPathIntegrity(destination);
    if (finalDestination.bytes !== source.bytes || finalDestination.sha256 !== source.sha256) {
      throw new AgentHarnessError("FILE_OPERATION_FAILED", "Move integrity verification failed after source removal.");
    }

    return {
      sourceRelativePath: source.relativePath,
      destinationRelativePath: destination.relativePath,
      bytes: source.bytes,
      sha256: source.sha256,
      sourceState: "absent",
      destinationState: "present",
    };
  } catch (error) {
    if (destinationCreated && destination?.identity && source) {
      if (sourceRemoved) {
        const recovery = await restoreMovedSource(source, destination);
        throw new AgentHarnessError(
          "FILE_OPERATION_FAILED",
          recovery.restored
            ? "Move failed after source removal; the source was restored and the operation-owned destination was removed."
            : "Move failed after source removal and automatic source restoration was incomplete.",
          {
            sourceState: recovery.sourceState,
            destinationState: recovery.destinationState,
          },
        );
      }
      const cleanup = await removeOwnedDestination(destination);
      if (cleanup === "retained") {
        throw new AgentHarnessError(
          "FILE_OPERATION_FAILED",
          "Move failed before source removal and the destination could not be proven safe to remove.",
          { sourceState: "present-or-changed", destinationState: "retained" },
        );
      }
    }
    throw boundedFileOperationError(error, "move");
  } finally {
    await closeQuietly(sourceHandle);
  }
}

export function assertRepositoryFileOperationSize(size: number): void {
  if (!Number.isSafeInteger(size) || size < 0 || size > MAX_REPOSITORY_FILE_OPERATION_BYTES) {
    throw new AgentHarnessError("FILE_DENIED", "Source file exceeds the fixed 2 GiB operation limit.");
  }
}

async function openValidatedSource(root: string, relativePath: string): Promise<{
  handle: fs.promises.FileHandle;
  evidence: SourceEvidence;
}> {
  const resolved = resolveRepositoryPath(root, relativePath);
  assertNotProtectedGitPath(resolved.relativePath, "source");
  const leafStats = await fs.promises.lstat(resolved.requestedPath);
  if (!leafStats.isFile() || leafStats.isSymbolicLink()) {
    throw new AgentHarnessError("FILE_DENIED", "Source must be a regular non-symlink file.", {
      sourceRelativePath: resolved.relativePath,
    });
  }
  const handle = await fs.promises.open(resolved.resolvedPath, "r");
  try {
    const stats = await handle.stat();
    if (!stats.isFile()) {
      throw new AgentHarnessError("FILE_DENIED", "Source must be a regular file.");
    }
    assertRepositoryFileOperationSize(stats.size);
    const identity = fileIdentity(stats);
    if (!sameFileIdentity(identity, fileIdentity(leafStats))) {
      throw new AgentHarnessError("FILE_DENIED", "Source identity changed during validation.");
    }
    const sha256 = await hashFileHandle(handle, MAX_REPOSITORY_FILE_OPERATION_BYTES);
    const postHashStats = await handle.stat();
    if (postHashStats.size !== stats.size || !sameFileIdentity(identity, fileIdentity(postHashStats))) {
      throw new AgentHarnessError("FILE_DENIED", "Source changed during integrity capture.");
    }
    return {
      handle,
      evidence: {
        canonicalPath: resolved.resolvedPath,
        relativePath: resolved.relativePath,
        identity,
        bytes: stats.size,
        sha256,
      },
    };
  } catch (error) {
    await closeQuietly(handle);
    throw error;
  }
}

async function prepareDestination(
  root: string,
  relativePath: string,
  source: SourceEvidence,
  hooks: RepositoryFileOperationTestHooks,
): Promise<DestinationEvidence> {
  const initial = resolveRepositoryPath(root, relativePath, { allowMissingLeaf: true });
  assertNotProtectedGitPath(initial.relativePath, "destination");
  await assertDestinationMissingAndDistinct(initial.requestedPath, initial.resolvedPath, initial.relativePath, source);

  await fs.promises.mkdir(path.dirname(initial.resolvedPath), { recursive: true });
  await hooks.afterDestinationParentCreated?.(initial.resolvedPath);

  const rechecked = resolveRepositoryPath(root, relativePath, { allowMissingLeaf: true });
  assertNotProtectedGitPath(rechecked.relativePath, "destination");
  if (pathKey(rechecked.resolvedPath) !== pathKey(initial.resolvedPath)) {
    throw new AgentHarnessError("PATH_DENIED", "Destination path identity changed during parent creation.");
  }
  const parentRealPath = await fs.promises.realpath(path.dirname(rechecked.resolvedPath));
  if (!isPathInside(parentRealPath, rechecked.rootRealPath)) {
    throw new AgentHarnessError("PATH_DENIED", "Destination parent escapes the registered workspace.");
  }
  await assertDestinationMissingAndDistinct(
    rechecked.requestedPath,
    rechecked.resolvedPath,
    rechecked.relativePath,
    source,
  );
  return {
    canonicalPath: rechecked.resolvedPath,
    relativePath: rechecked.relativePath,
    identity: { dev: -1, ino: -1, birthtimeMs: -1 },
  };
}

async function recheckDestination(
  root: string,
  relativePath: string,
  expected: DestinationEvidence,
  source: SourceEvidence,
): Promise<DestinationEvidence> {
  const resolved = resolveRepositoryPath(root, relativePath, { allowMissingLeaf: true });
  assertNotProtectedGitPath(resolved.relativePath, "destination");
  if (pathKey(resolved.resolvedPath) !== pathKey(expected.canonicalPath)) {
    throw new AgentHarnessError("PATH_DENIED", "Destination path identity changed before mutation.");
  }
  const parentRealPath = await fs.promises.realpath(path.dirname(resolved.resolvedPath));
  if (!isPathInside(parentRealPath, resolved.rootRealPath)) {
    throw new AgentHarnessError("PATH_DENIED", "Destination parent escapes the registered workspace.");
  }
  await assertDestinationMissingAndDistinct(resolved.requestedPath, resolved.resolvedPath, resolved.relativePath, source);
  return { ...expected, canonicalPath: resolved.resolvedPath, relativePath: resolved.relativePath };
}

async function assertDestinationMissingAndDistinct(
  requestedPath: string,
  canonicalPath: string,
  relativePath: string,
  source: SourceEvidence,
): Promise<void> {
  if (pathKey(canonicalPath) === pathKey(source.canonicalPath)) {
    throw new AgentHarnessError("FILE_DENIED", "Source and destination must identify distinct files.");
  }
  const requestedStats = await lstatIfPresent(requestedPath);
  const canonicalStats = pathKey(requestedPath) === pathKey(canonicalPath)
    ? requestedStats
    : await lstatIfPresent(canonicalPath);
  for (const stats of [requestedStats, canonicalStats]) {
    if (!stats) {
      continue;
    }
    if (sameFileIdentity(source.identity, fileIdentity(stats))) {
      throw new AgentHarnessError("FILE_DENIED", "Source and destination must identify distinct files.");
    }
    throw new AgentHarnessError("FILE_DENIED", "Destination already exists; overwrite is not allowed.", {
      destinationRelativePath: relativePath,
    });
  }
}

async function assertSourcePathCurrent(root: string, relativePath: string, source: SourceEvidence): Promise<void> {
  const resolved = resolveRepositoryPath(root, relativePath);
  assertNotProtectedGitPath(resolved.relativePath, "source");
  if (pathKey(resolved.resolvedPath) !== pathKey(source.canonicalPath)) {
    throw new AgentHarnessError("FILE_DENIED", "Source path identity changed during the operation.");
  }
  const stats = await fs.promises.lstat(resolved.requestedPath);
  if (!stats.isFile() || stats.isSymbolicLink() || !sameFileIdentity(source.identity, fileIdentity(stats))) {
    throw new AgentHarnessError("FILE_DENIED", "Source path identity changed during the operation.");
  }
}

async function assertOwnedDestinationCurrent(destination: DestinationEvidence): Promise<void> {
  const stats = await fs.promises.lstat(destination.canonicalPath);
  if (!stats.isFile() || stats.isSymbolicLink() || !sameFileIdentity(destination.identity, fileIdentity(stats))) {
    throw new AgentHarnessError("FILE_OPERATION_FAILED", "Destination identity changed during the operation.");
  }
}

async function readPathIntegrity(destination: DestinationEvidence): Promise<{ bytes: number; sha256: string }> {
  await assertOwnedDestinationCurrent(destination);
  const handle = await fs.promises.open(destination.canonicalPath, "r");
  try {
    const stats = await handle.stat();
    if (!sameFileIdentity(destination.identity, fileIdentity(stats))) {
      throw new AgentHarnessError("FILE_OPERATION_FAILED", "Destination identity changed during verification.");
    }
    return {
      bytes: stats.size,
      sha256: await hashFileHandle(handle, MAX_REPOSITORY_FILE_OPERATION_BYTES),
    };
  } finally {
    await closeQuietly(handle);
  }
}

async function hashFileHandle(handle: fs.promises.FileHandle, maximumBytes: number): Promise<string> {
  const hash = createHash("sha256");
  const buffer = Buffer.allocUnsafe(TRANSFER_BUFFER_BYTES);
  let position = 0;
  while (true) {
    const allowed = Math.min(buffer.length, maximumBytes - position + 1);
    if (allowed <= 0) {
      throw new AgentHarnessError("FILE_DENIED", "Source file exceeds the fixed 2 GiB operation limit.");
    }
    const { bytesRead } = await handle.read(buffer, 0, allowed, position);
    if (bytesRead === 0) {
      break;
    }
    position += bytesRead;
    if (position > maximumBytes) {
      throw new AgentHarnessError("FILE_DENIED", "Source file exceeds the fixed 2 GiB operation limit.");
    }
    hash.update(buffer.subarray(0, bytesRead));
  }
  return hash.digest("hex");
}

async function copyFileHandle(
  source: fs.promises.FileHandle,
  destination: fs.promises.FileHandle,
  expectedBytes: number,
): Promise<number> {
  const buffer = Buffer.allocUnsafe(TRANSFER_BUFFER_BYTES);
  let position = 0;
  while (position < expectedBytes) {
    const requested = Math.min(buffer.length, expectedBytes - position);
    const { bytesRead } = await source.read(buffer, 0, requested, position);
    if (bytesRead === 0) {
      break;
    }
    let written = 0;
    while (written < bytesRead) {
      const result = await destination.write(buffer, written, bytesRead - written, position + written);
      if (result.bytesWritten === 0) {
        throw new AgentHarnessError("FILE_OPERATION_FAILED", "Copy made no forward progress.");
      }
      written += result.bytesWritten;
    }
    position += bytesRead;
  }
  const growthProbe = Buffer.allocUnsafe(1);
  const { bytesRead: extraBytes } = await source.read(growthProbe, 0, 1, expectedBytes);
  if (extraBytes > 0) {
    throw new AgentHarnessError("FILE_OPERATION_FAILED", "Source changed during copy.");
  }
  return position;
}

async function restoreMovedSource(
  source: SourceEvidence,
  destination: DestinationEvidence,
): Promise<{ restored: boolean; sourceState: string; destinationState: string }> {
  try {
    if (await pathEntryExists(source.canonicalPath)) {
      return { restored: false, sourceState: "occupied", destinationState: "present-or-unknown" };
    }
    await assertOwnedDestinationCurrent(destination);
    await fs.promises.link(destination.canonicalPath, source.canonicalPath);
    const restoredStats = await fs.promises.lstat(source.canonicalPath);
    if (!restoredStats.isFile() || !sameFileIdentity(destination.identity, fileIdentity(restoredStats))) {
      return { restored: false, sourceState: "unknown", destinationState: "present-or-unknown" };
    }
    const cleanup = await removeOwnedDestination(destination);
    return cleanup === "removed" || cleanup === "absent"
      ? { restored: true, sourceState: "present", destinationState: "absent" }
      : { restored: false, sourceState: "present", destinationState: "retained" };
  } catch {
    return {
      restored: false,
      sourceState: await pathEntryExists(source.canonicalPath) ? "present-or-unknown" : "absent",
      destinationState: await pathEntryExists(destination.canonicalPath) ? "present-or-unknown" : "absent",
    };
  }
}

async function removeOwnedDestination(destination: DestinationEvidence): Promise<"removed" | "absent" | "retained"> {
  try {
    const stats = await lstatIfPresent(destination.canonicalPath);
    if (!stats) {
      return "absent";
    }
    if (!stats.isFile() || stats.isSymbolicLink() || !sameFileIdentity(destination.identity, fileIdentity(stats))) {
      return "retained";
    }
    await fs.promises.unlink(destination.canonicalPath);
    return "removed";
  } catch {
    return "retained";
  }
}

async function lstatIfPresent(targetPath: string): Promise<fs.Stats | undefined> {
  try {
    return await fs.promises.lstat(targetPath);
  } catch (error) {
    if (nodeErrorCode(error) === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

async function pathEntryExists(targetPath: string): Promise<boolean> {
  return Boolean(await lstatIfPresent(targetPath));
}

function assertNotProtectedGitPath(relativePath: string, role: "source" | "destination"): void {
  const firstSegment = relativePath.split("/")[0]?.toLowerCase();
  if (firstSegment === ".git") {
    throw new AgentHarnessError("PATH_DENIED", `Repository ${role} cannot access protected .git metadata.`, {
      [`${role}RelativePath`]: relativePath,
    });
  }
}

function fileIdentity(stats: fs.Stats): FileIdentity {
  return { dev: stats.dev, ino: stats.ino, birthtimeMs: stats.birthtimeMs };
}

function sameFileIdentity(left: FileIdentity, right: FileIdentity): boolean {
  if (left.dev !== right.dev || left.ino !== right.ino) {
    return false;
  }
  return left.ino !== 0 || left.birthtimeMs === right.birthtimeMs;
}

function pathKey(value: string): string {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function nodeErrorCode(error: unknown): string | undefined {
  return error && typeof error === "object" && "code" in error
    ? String((error as NodeJS.ErrnoException).code)
    : undefined;
}

function boundedFileOperationError(error: unknown, operation: "copy" | "move"): AgentHarnessError {
  if (error instanceof AgentHarnessError) {
    return error;
  }
  const code = nodeErrorCode(error);
  if (code === "ENOENT") {
    return new AgentHarnessError("FILE_DENIED", `Repository file ${operation} requires an existing source and parent state.`);
  }
  if (code === "EEXIST") {
    return new AgentHarnessError("FILE_DENIED", "Destination already exists; overwrite is not allowed.");
  }
  if (code === "EXDEV") {
    return new AgentHarnessError(
      "FILE_DENIED",
      "Move requires same-filesystem hard-link semantics; cross-device copy-and-delete is not supported.",
    );
  }
  if (["EACCES", "EPERM", "EBUSY", "ENOTDIR", "EISDIR"].includes(code ?? "")) {
    return new AgentHarnessError("FILE_DENIED", `Repository file ${operation} was denied by the bounded filesystem state.`);
  }
  return new AgentHarnessError("FILE_OPERATION_FAILED", `Repository file ${operation} failed without changing its public bounds.`);
}

async function closeQuietly(handle: fs.promises.FileHandle | undefined): Promise<void> {
  if (!handle) {
    return;
  }
  try {
    await handle.close();
  } catch {
    // The operation result or bounded cleanup state is more useful than a duplicate close error.
  }
}
