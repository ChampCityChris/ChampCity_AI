import { AgentHarnessError } from "../core/errors";
import { assertSafeRelativePath } from "./pathPolicy";
import { runBoundedGit } from "./boundedGit";

const MAX_COMMIT_MESSAGE_BYTES = 20_000;
const MAX_STAGING_PATHS = 256;
const MAX_STAGING_PATH_BYTES = 4_096;
const MAX_STAGING_PATH_BYTES_TOTAL = 32_768;

export async function prepareGitBranch(root: string, branchName: string): Promise<{
  branchName: string;
  head: string;
}> {
  await assertValidLocalBranchName(root, branchName);
  await assertCleanRepository(root);
  if (await localBranchExists(root, branchName)) {
    throw gitPrecondition("Branch already exists; prepare_branch never reuses or overwrites a branch.");
  }
  await runBoundedGit({ cwd: root, args: ["switch", "--no-track", "--create", branchName] });
  return { branchName, head: await readHead(root) };
}

export async function stageGitChanges(root: string, paths: string[]): Promise<{
  stagedPaths: string[];
}> {
  const stagedPaths = normalizePathspecs(paths);
  await runBoundedGit({ cwd: root, args: ["add", "--all", "--", ...stagedPaths] });
  return { stagedPaths };
}

export async function commitGitChanges(root: string, message: string): Promise<{
  commit: string;
  message: string;
}> {
  const commitMessage = validateCommitMessage(message);
  const staged = await runBoundedGit({
    cwd: root,
    args: ["diff", "--cached", "--quiet", "--"],
    rejectNonZero: false,
  });
  if (staged.exitCode === 0) {
    throw gitPrecondition("commit requires an existing staged diff.");
  }
  if (staged.exitCode !== 1) {
    throw gitPrecondition("Git could not verify the staged diff.");
  }
  await runBoundedGit({ cwd: root, args: ["commit", "--message", commitMessage] });
  return { commit: await readHead(root), message: commitMessage };
}

export async function pushGitBranch(root: string, input: {
  remote?: string;
  branch?: string;
} = {}): Promise<{
  remote: string;
  branch: string;
  commit: string;
}> {
  const remote = validateRemoteName(input.remote ?? "origin");
  const configuredRemotes = (await runBoundedGit({ cwd: root, args: ["remote"] })).stdout
    .split(/\r?\n/)
    .filter(Boolean);
  if (!configuredRemotes.includes(remote)) {
    throw gitPrecondition(`Configured Git remote not found: ${remote}.`);
  }
  const branch = input.branch ?? await currentBranch(root);
  await assertValidLocalBranchName(root, branch);
  if (!await localBranchExists(root, branch)) {
    throw gitPrecondition(`Local branch not found: ${branch}.`);
  }
  const commit = (await runBoundedGit({ cwd: root, args: ["rev-parse", `refs/heads/${branch}`] })).stdout.trim();
  const ref = `refs/heads/${branch}`;
  await runBoundedGit({ cwd: root, args: ["push", "--", remote, `${ref}:${ref}`] });
  return { remote, branch, commit };
}

export async function integrateGitBranchToDev(root: string): Promise<{
  sourceBranch: string;
  targetBranch: "dev";
  commit: string;
}> {
  await assertCleanRepository(root);
  const sourceBranch = await currentBranch(root);
  if (sourceBranch === "dev") {
    throw gitPrecondition("integrate_to_dev requires the current source branch to differ from dev.");
  }
  await assertValidLocalBranchName(root, sourceBranch);
  if (!await localBranchExists(root, sourceBranch) || !await localBranchExists(root, "dev")) {
    throw gitPrecondition("integrate_to_dev requires both the current source branch and local dev.");
  }
  const sourceCommit = (await runBoundedGit({
    cwd: root,
    args: ["rev-parse", `refs/heads/${sourceBranch}`],
  })).stdout.trim();
  const canFastForward = await runBoundedGit({
    cwd: root,
    args: ["merge-base", "--is-ancestor", "refs/heads/dev", sourceCommit],
    rejectNonZero: false,
  });
  if (canFastForward.exitCode !== 0) {
    throw gitPrecondition("Local dev cannot be fast-forwarded to the current source branch.");
  }
  await runBoundedGit({ cwd: root, args: ["switch", "dev"] });
  await runBoundedGit({ cwd: root, args: ["merge", "--ff-only", sourceCommit] });
  return { sourceBranch, targetBranch: "dev", commit: sourceCommit };
}

async function assertCleanRepository(root: string): Promise<void> {
  const status = await runBoundedGit({
    cwd: root,
    args: ["status", "--porcelain=v1", "--untracked-files=all"],
  });
  if (status.stdout.length > 0) {
    throw gitPrecondition("Git mutation requires a clean working tree and index.");
  }
}

async function assertValidLocalBranchName(root: string, branchName: string): Promise<void> {
  if (
    typeof branchName !== "string" ||
    !branchName ||
    branchName !== branchName.trim() ||
    branchName.startsWith("-") ||
    branchName.includes("\0")
  ) {
    throw new AgentHarnessError("INVALID_INPUT", "branchName must be a valid local Git branch name.");
  }
  const result = await runBoundedGit({
    cwd: root,
    args: ["check-ref-format", `refs/heads/${branchName}`],
    rejectNonZero: false,
  });
  if (result.exitCode !== 0) {
    throw new AgentHarnessError("INVALID_INPUT", "branchName must be a valid local Git branch name.");
  }
}

async function localBranchExists(root: string, branchName: string): Promise<boolean> {
  const result = await runBoundedGit({
    cwd: root,
    args: ["show-ref", "--verify", "--quiet", `refs/heads/${branchName}`],
    rejectNonZero: false,
  });
  if (result.exitCode !== 0 && result.exitCode !== 1) {
    throw gitPrecondition("Git could not verify the local branch inventory.");
  }
  return result.exitCode === 0;
}

async function currentBranch(root: string): Promise<string> {
  const branch = (await runBoundedGit({
    cwd: root,
    args: ["symbolic-ref", "--quiet", "--short", "HEAD"],
  })).stdout.trim();
  if (!branch) {
    throw gitPrecondition("Git mutation requires a checked-out local branch.");
  }
  return branch;
}

async function readHead(root: string): Promise<string> {
  return (await runBoundedGit({ cwd: root, args: ["rev-parse", "HEAD"] })).stdout.trim();
}

function normalizePathspecs(paths: string[]): string[] {
  if (!Array.isArray(paths) || paths.length === 0 || paths.length > MAX_STAGING_PATHS) {
    throw new AgentHarnessError(
      "INVALID_INPUT",
      `paths must contain between 1 and ${MAX_STAGING_PATHS} repository-relative pathspecs.`,
    );
  }
  const normalized = paths.map((value) => {
    if (
      typeof value !== "string" ||
      !value ||
      value !== value.trim() ||
      Buffer.byteLength(value, "utf8") > MAX_STAGING_PATH_BYTES
    ) {
      throw new AgentHarnessError("INVALID_INPUT", "Each staging path must be a repository-relative pathspec.");
    }
    return assertSafeRelativePath(value).split("\\").join("/");
  });
  if (new Set(normalized).size !== normalized.length) {
    throw new AgentHarnessError("INVALID_INPUT", "Staging paths must not contain duplicates.");
  }
  if (normalized.reduce((total, value) => total + Buffer.byteLength(value, "utf8"), 0) > MAX_STAGING_PATH_BYTES_TOTAL) {
    throw new AgentHarnessError("INVALID_INPUT", "Combined staging paths exceed the bounded input limit.");
  }
  return normalized;
}

function validateCommitMessage(message: string): string {
  if (
    typeof message !== "string" ||
    !message.trim() ||
    message.includes("\0") ||
    Buffer.byteLength(message, "utf8") > MAX_COMMIT_MESSAGE_BYTES
  ) {
    throw new AgentHarnessError("INVALID_INPUT", "message must be a non-empty bounded commit message.");
  }
  return message;
}

function validateRemoteName(remote: string): string {
  if (
    typeof remote !== "string" ||
    !remote ||
    remote !== remote.trim() ||
    remote.startsWith("-") ||
    /[\0\r\n]/.test(remote)
  ) {
    throw new AgentHarnessError("INVALID_INPUT", "remote must name one configured Git remote.");
  }
  return remote;
}

function gitPrecondition(message: string): AgentHarnessError {
  return new AgentHarnessError("GIT_EXECUTION_FAILED", message);
}
