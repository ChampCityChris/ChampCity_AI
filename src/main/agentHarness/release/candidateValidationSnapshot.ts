import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { AgentHarnessError } from "../core/errors";
import { resolveWindowsNpmInvocation } from "./releaseCommandAdapter";

const CANDIDATE_TEMP_PREFIX = "champcity-candidate-validation-";
const GIT_TIMEOUT_MS = 2 * 60_000;
const GIT_STDOUT_LIMIT_BYTES = 16 * 1_024 * 1_024;
const GIT_STDERR_LIMIT_BYTES = 64 * 1_024;
const CLEANUP_RETRY_DEADLINE_MS = 45_000;
const CLEANUP_RETRY_DELAY_MS = 250;
const CLEANUP_HELPER_TIMEOUT_MS = 20_000;
const CLEANUP_HELPER_SCRIPT = [
  "const fs=require('node:fs');",
  "const target=process.argv[1];",
  "if(!target){process.exit(2);}",
  "fs.rm(target,{recursive:true,force:true,maxRetries:2,retryDelay:100},",
  "(error)=>{if(error){process.exitCode=1;}});",
].join("");

export interface CandidateValidationSnapshotContext {
  root: string;
  sourceHead: string;
  candidateDigest: string;
  fileCount: number;
  trackedDeletionCount: number;
}

export interface CandidateValidationSnapshotReceipt {
  sourceHead: string;
  candidateDigest: string;
  fileCount: number;
  trackedDeletionCount: number;
  materializationStatus: "succeeded";
  cleanupStatus: "succeeded";
}

export interface CandidateValidationSnapshotResult<T> {
  value: T;
  receipt: CandidateValidationSnapshotReceipt;
}

interface CandidateEntry {
  relativePath: string;
  tracked: boolean;
}

interface CopiedCandidateEntry extends CandidateEntry {
  sha256: string | null;
}

interface MaterializedCandidateSnapshot extends CandidateValidationSnapshotContext {
  temporaryBase: string;
}

export async function withCandidateValidationSnapshot<T>(
  sourceRoot: string,
  action: (snapshot: CandidateValidationSnapshotContext) => Promise<T>,
): Promise<CandidateValidationSnapshotResult<T>> {
  let snapshot: MaterializedCandidateSnapshot | undefined;
  try {
    snapshot = await materializeCandidateSnapshot(sourceRoot);
  } catch (error) {
    if (error instanceof AgentHarnessError) {
      throw error;
    }
    throw snapshotFailure("Candidate validation snapshot materialization failed.", "materialization");
  }

  let actionValue: T | undefined;
  let actionError: unknown;
  try {
    actionValue = await action(snapshot);
  } catch (error) {
    actionError = error;
  }

  try {
    await removeOwnedCandidateSnapshot(snapshot);
  } catch {
    throw new AgentHarnessError(
      "RELEASE_CANDIDATE_CLEANUP_FAILED",
      "Candidate validation snapshot cleanup failed.",
      {
        phase: "cleanup",
        sourceHead: snapshot.sourceHead,
        candidateDigest: snapshot.candidateDigest,
        fileCount: snapshot.fileCount,
        trackedDeletionCount: snapshot.trackedDeletionCount,
        actionFailed: actionError !== undefined,
      },
    );
  }

  if (actionError !== undefined) {
    throw actionError;
  }

  return {
    value: actionValue as T,
    receipt: {
      sourceHead: snapshot.sourceHead,
      candidateDigest: snapshot.candidateDigest,
      fileCount: snapshot.fileCount,
      trackedDeletionCount: snapshot.trackedDeletionCount,
      materializationStatus: "succeeded",
      cleanupStatus: "succeeded",
    },
  };
}

export function assertSafeCandidateRelativePath(relativePath: string): void {
  if (
    relativePath.length === 0
    || relativePath.includes("\\")
    || path.posix.isAbsolute(relativePath)
    || path.win32.isAbsolute(relativePath)
  ) {
    throw snapshotFailure("Git returned an unsafe candidate source entry.", "containment");
  }
  const normalized = path.posix.normalize(relativePath);
  const segments = relativePath.split("/");
  if (
    normalized !== relativePath
    || normalized === "."
    || normalized === ".."
    || normalized.startsWith("../")
    || segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")
    || segments.some((segment) => segment.toLowerCase() === ".git")
  ) {
    throw snapshotFailure("Git returned an unsafe candidate source entry.", "containment");
  }
}

async function materializeCandidateSnapshot(sourceRoot: string): Promise<MaterializedCandidateSnapshot> {
  const resolvedRoot = path.resolve(sourceRoot);
  let canonicalRoot: string;
  try {
    canonicalRoot = await fs.promises.realpath(resolvedRoot);
    const rootStats = await fs.promises.lstat(canonicalRoot);
    if (!rootStats.isDirectory() || rootStats.isSymbolicLink()) {
      throw new Error("invalid root");
    }
  } catch {
    throw snapshotFailure("Registered repository root is unavailable for candidate validation.", "source-root");
  }

  const repositoryRootOutput = await runGitCapture(canonicalRoot, ["rev-parse", "--show-toplevel"]);
  const repositoryRoot = path.resolve(repositoryRootOutput.toString("utf8").trim());
  if (!pathsEqual(repositoryRoot, canonicalRoot)) {
    throw snapshotFailure("Candidate validation requires the exact registered repository root.", "source-root");
  }

  const sourceHead = await captureHead(canonicalRoot);
  const initialEntries = await enumerateCandidateEntries(canonicalRoot);
  const temporaryBase = await fs.promises.realpath(os.tmpdir());
  const workspace = await fs.promises.mkdtemp(path.join(temporaryBase, CANDIDATE_TEMP_PREFIX));
  const canonicalWorkspace = await fs.promises.realpath(workspace);
  assertOwnedTemporaryWorkspace(temporaryBase, canonicalWorkspace);

  const copiedEntries: CopiedCandidateEntry[] = [];
  try {
    for (const entry of initialEntries) {
      copiedEntries.push(await copyCandidateEntry(canonicalRoot, canonicalWorkspace, entry));
    }
    await verifyCandidateSource(canonicalRoot, sourceHead, initialEntries, copiedEntries);
    return {
      root: canonicalWorkspace,
      temporaryBase,
      sourceHead,
      candidateDigest: candidateDigest(copiedEntries),
      fileCount: copiedEntries.filter((entry) => entry.sha256 !== null).length,
      trackedDeletionCount: copiedEntries.filter((entry) => entry.sha256 === null).length,
    };
  } catch (error) {
    try {
      await removeOwnedCandidateWorkspace(temporaryBase, canonicalWorkspace);
    } catch {
      throw new AgentHarnessError(
        "RELEASE_CANDIDATE_CLEANUP_FAILED",
        "Candidate validation snapshot cleanup failed after materialization failure.",
        { phase: "cleanup", sourceHead, materializationFailed: true },
      );
    }
    if (error instanceof AgentHarnessError) {
      throw error;
    }
    throw snapshotFailure("Candidate validation snapshot materialization failed.", "materialization", sourceHead);
  }
}

async function enumerateCandidateEntries(root: string): Promise<CandidateEntry[]> {
  const [trackedOutput, untrackedOutput] = await Promise.all([
    runGitCapture(root, ["ls-files", "--cached", "--full-name", "-z"]),
    runGitCapture(root, ["ls-files", "--others", "--exclude-standard", "--full-name", "-z"]),
  ]);
  const entries = [
    ...parseGitPathList(trackedOutput).map((relativePath) => ({ relativePath, tracked: true })),
    ...parseGitPathList(untrackedOutput).map((relativePath) => ({ relativePath, tracked: false })),
  ].sort((left, right) => Buffer.compare(Buffer.from(left.relativePath), Buffer.from(right.relativePath)));
  const seen = new Set<string>();
  for (const entry of entries) {
    assertSafeCandidateRelativePath(entry.relativePath);
    if (seen.has(entry.relativePath)) {
      throw snapshotFailure("Git returned a duplicate candidate source entry.", "enumeration");
    }
    seen.add(entry.relativePath);
  }
  return entries;
}

function parseGitPathList(output: Buffer): string[] {
  if (output.length === 0) {
    return [];
  }
  if (output.at(-1) !== 0) {
    throw snapshotFailure("Git candidate enumeration returned an incomplete path list.", "enumeration");
  }
  return splitNullTerminated(output).map((rawPath) => {
    const relativePath = rawPath.toString("utf8");
    if (!Buffer.from(relativePath, "utf8").equals(rawPath)) {
      throw snapshotFailure("Git returned a candidate path with unsupported encoding.", "enumeration");
    }
    return relativePath;
  });
}

function splitNullTerminated(output: Buffer): Buffer[] {
  const entries: Buffer[] = [];
  let start = 0;
  for (let index = 0; index < output.length; index += 1) {
    if (output[index] === 0) {
      entries.push(output.subarray(start, index));
      start = index + 1;
    }
  }
  return entries;
}

async function copyCandidateEntry(
  sourceRoot: string,
  destinationRoot: string,
  entry: CandidateEntry,
): Promise<CopiedCandidateEntry> {
  const sourcePath = containedPath(sourceRoot, entry.relativePath);
  const destinationPath = containedPath(destinationRoot, entry.relativePath);
  try {
    await fs.promises.lstat(sourcePath);
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT" && entry.tracked) {
      return { ...entry, sha256: null };
    }
    throw snapshotFailure("A candidate source entry became unavailable.", "copy");
  }
  await assertSafeSourceParents(sourceRoot, entry.relativePath);

  let contents: Buffer;
  try {
    contents = await readStableRegularFile(sourcePath, sourceRoot);
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT" && entry.tracked) {
      return { ...entry, sha256: null };
    }
    if (error instanceof AgentHarnessError) {
      throw error;
    }
    throw snapshotFailure("A candidate source file could not be read safely.", "copy");
  }

  try {
    await fs.promises.mkdir(path.dirname(destinationPath), { recursive: true });
    await fs.promises.writeFile(destinationPath, contents, { flag: "wx" });
  } catch {
    throw snapshotFailure("A candidate source file could not be materialized.", "copy");
  }
  return { ...entry, sha256: createHash("sha256").update(contents).digest("hex") };
}

async function verifyCandidateSource(
  sourceRoot: string,
  sourceHead: string,
  initialEntries: CandidateEntry[],
  copiedEntries: CopiedCandidateEntry[],
): Promise<void> {
  const finalHead = await captureHead(sourceRoot);
  if (finalHead !== sourceHead) {
    throw snapshotFailure("Git HEAD changed while the candidate snapshot was being materialized.", "source-stability", sourceHead);
  }
  const finalEntries = await enumerateCandidateEntries(sourceRoot);
  if (JSON.stringify(finalEntries) !== JSON.stringify(initialEntries)) {
    throw snapshotFailure("Git-visible candidate entries changed during snapshot materialization.", "source-stability", sourceHead);
  }
  for (const entry of copiedEntries) {
    const sourcePath = containedPath(sourceRoot, entry.relativePath);
    if (entry.sha256 === null) {
      try {
        await fs.promises.lstat(sourcePath);
      } catch (error) {
        if (isNodeError(error) && error.code === "ENOENT") {
          continue;
        }
        throw snapshotFailure("A tracked deletion changed during snapshot materialization.", "source-stability", sourceHead);
      }
      throw snapshotFailure("A tracked deletion changed during snapshot materialization.", "source-stability", sourceHead);
    }
    const contents = await readStableRegularFile(sourcePath, sourceRoot);
    const sourceHash = createHash("sha256").update(contents).digest("hex");
    if (sourceHash !== entry.sha256) {
      throw snapshotFailure("A candidate source file changed during snapshot materialization.", "source-stability", sourceHead);
    }
  }
}

async function readStableRegularFile(target: string, sourceRoot: string): Promise<Buffer> {
  const canonicalTarget = await fs.promises.realpath(target);
  if (!pathsEqual(canonicalTarget, target) || !isContained(sourceRoot, canonicalTarget)) {
    throw snapshotFailure("Candidate source entries must be regular contained files.", "containment");
  }
  const handle = await fs.promises.open(target, "r");
  try {
    const before = await handle.stat();
    if (!before.isFile()) {
      throw snapshotFailure("Candidate source entries must be regular contained files.", "containment");
    }
    const contents = await handle.readFile();
    const after = await handle.stat();
    if (
      before.size !== after.size
      || before.mtimeMs !== after.mtimeMs
      || before.ctimeMs !== after.ctimeMs
    ) {
      throw snapshotFailure("A candidate source file changed while it was being read.", "source-stability");
    }
    return contents;
  } finally {
    await handle.close();
  }
}

async function assertSafeSourceParents(root: string, relativePath: string): Promise<void> {
  const segments = relativePath.split("/");
  let current = root;
  for (const segment of segments.slice(0, -1)) {
    current = path.join(current, segment);
    let stats: fs.Stats;
    try {
      stats = await fs.promises.lstat(current);
    } catch {
      throw snapshotFailure("Candidate source parent directories are unavailable.", "containment");
    }
    if (!stats.isDirectory() || stats.isSymbolicLink()) {
      throw snapshotFailure("Candidate source parent directories must remain contained.", "containment");
    }
  }
}

async function captureHead(root: string): Promise<string> {
  const sourceHead = (await runGitCapture(root, ["rev-parse", "HEAD"])).toString("utf8").trim().toLowerCase();
  if (!/^[0-9a-f]{40,64}$/.test(sourceHead)) {
    throw snapshotFailure("Current Git HEAD could not be captured for candidate validation.", "source-identity");
  }
  return sourceHead;
}

function candidateDigest(entries: CopiedCandidateEntry[]): string {
  const digest = createHash("sha256");
  for (const entry of entries) {
    digest.update(entry.tracked ? "tracked\0" : "untracked\0");
    digest.update(entry.relativePath);
    digest.update("\0");
    digest.update(entry.sha256 ?? "deleted");
    digest.update("\0");
  }
  return digest.digest("hex");
}

function containedPath(root: string, relativePath: string): string {
  assertSafeCandidateRelativePath(relativePath);
  const target = path.resolve(root, ...relativePath.split("/"));
  if (!isContained(root, target)) {
    throw snapshotFailure("Git returned an out-of-root candidate source entry.", "containment");
  }
  return target;
}

function isContained(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative.length > 0 && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function pathsEqual(left: string, right: string): boolean {
  const normalizedLeft = path.normalize(left);
  const normalizedRight = path.normalize(right);
  return process.platform === "win32"
    ? normalizedLeft.toLowerCase() === normalizedRight.toLowerCase()
    : normalizedLeft === normalizedRight;
}

async function removeOwnedCandidateSnapshot(snapshot: MaterializedCandidateSnapshot): Promise<void> {
  await removeOwnedCandidateWorkspace(snapshot.temporaryBase, snapshot.root);
}

async function removeOwnedCandidateWorkspace(temporaryBase: string, workspace: string): Promise<void> {
  assertOwnedTemporaryWorkspace(temporaryBase, workspace);
  try {
    const stats = await fs.promises.lstat(workspace);
    if (stats.isSymbolicLink()) {
      await fs.promises.unlink(workspace);
      return;
    }
    if (!stats.isDirectory()) {
      throw new Error("invalid temporary workspace");
    }
    await removeDirectoryWithBoundedRetries(workspace);
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return;
    }
    throw error;
  }
}

async function removeDirectoryWithBoundedRetries(workspace: string): Promise<void> {
  if (process.platform !== "win32") {
    await fs.promises.rm(workspace, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    return;
  }
  const deadline = Date.now() + CLEANUP_RETRY_DEADLINE_MS;
  do {
    if (await runWindowsCleanupHelper(workspace)) {
      return;
    }
    if (Date.now() >= deadline) {
      break;
    }
    await delay(CLEANUP_RETRY_DELAY_MS);
  } while (Date.now() < deadline);
  throw new Error("bounded cleanup helper failed");
}

function runWindowsCleanupHelper(workspace: string): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    let child;
    let timeout: NodeJS.Timeout | undefined;
    const finish = (succeeded: boolean): void => {
      if (settled) {
        return;
      }
      settled = true;
      if (timeout) {
        clearTimeout(timeout);
      }
      resolve(succeeded);
    };
    try {
      const nodeExecutable = resolveWindowsNpmInvocation().executable;
      child = spawn(nodeExecutable, ["-e", CLEANUP_HELPER_SCRIPT, workspace], {
        cwd: os.tmpdir(),
        shell: false,
        windowsHide: true,
        stdio: "ignore",
        env: { ...process.env },
      });
    } catch {
      finish(false);
      return;
    }
    child.once("error", () => finish(false));
    child.once("close", (exitCode) => finish(exitCode === 0));
    timeout = setTimeout(() => {
      child.kill();
      finish(false);
    }, CLEANUP_HELPER_TIMEOUT_MS);
    timeout.unref();
  });
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function assertOwnedTemporaryWorkspace(temporaryBase: string, workspace: string): void {
  if (
    !pathsEqual(path.dirname(workspace), temporaryBase)
    || !path.basename(workspace).startsWith(CANDIDATE_TEMP_PREFIX)
  ) {
    throw snapshotFailure("Candidate validation temporary workspace ownership could not be proven.", "cleanup-containment");
  }
}

function runGitCapture(root: string, args: string[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let stdout = Buffer.alloc(0);
    let stderr = Buffer.alloc(0);
    let settled = false;
    let timedOut = false;
    let timeout: NodeJS.Timeout;
    const child = spawn("git", args, {
      cwd: root,
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    });
    const finish = (error?: AgentHarnessError): void => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      if (error) {
        reject(error);
      } else {
        resolve(stdout);
      }
    };
    child.stdout.on("data", (chunk: Buffer) => {
      stdout = Buffer.concat([stdout, chunk]);
      if (stdout.length > GIT_STDOUT_LIMIT_BYTES) {
        child.kill();
        finish(snapshotFailure("Git candidate enumeration exceeded its bounded output limit.", "git-enumeration"));
      }
    });
    child.stderr.on("data", (chunk: Buffer) => {
      if (stderr.length < GIT_STDERR_LIMIT_BYTES) {
        stderr = Buffer.concat([stderr, chunk]).subarray(0, GIT_STDERR_LIMIT_BYTES);
      }
    });
    child.once("error", () => finish(snapshotFailure("Git could not inspect the candidate source.", "git-execution")));
    child.once("close", (exitCode) => {
      if (timedOut) {
        finish(snapshotFailure("Git candidate inspection timed out.", "git-timeout"));
      } else if (exitCode !== 0) {
        finish(snapshotFailure("Git could not inspect the candidate source.", "git-execution"));
      } else {
        finish();
      }
    });
    timeout = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, GIT_TIMEOUT_MS);
    timeout.unref();
  });
}

function snapshotFailure(message: string, phase: string, sourceHead?: string): AgentHarnessError {
  return new AgentHarnessError(
    "RELEASE_CANDIDATE_SNAPSHOT_FAILED",
    message,
    { phase, ...(sourceHead ? { sourceHead } : {}) },
  );
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
