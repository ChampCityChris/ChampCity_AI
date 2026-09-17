import { AgentHarnessError } from "../core/errors";
import { assertSafeRelativePath } from "./pathPolicy";
import { runBoundedGit } from "./boundedGit";

const MAX_COMMIT_MESSAGE_BYTES = 20_000;
const MAX_STAGING_PATHS = 256;
const MAX_STAGING_PATH_BYTES = 4_096;
const MAX_STAGING_PATH_BYTES_TOTAL = 32_768;
const MAX_HISTORY_COUNT = 100;
const MAX_REVISION_BYTES = 1_024;

export async function inspectGitBranchState(root: string, requestedBranch?: string): Promise<{
  currentBranch: string | null;
  head: string;
  branches: Array<{ name: string; commit: string }>;
  selectedBranch: {
    name: string;
    commit: string;
    upstream: string | null;
    ahead: number | null;
    behind: number | null;
  } | null;
  remotes: string[];
}> {
  const current = await currentBranchOrNull(root);
  const branchOutput = (await runBoundedGit({
    cwd: root,
    args: ["for-each-ref", "--format=%(refname:short)%00%(objectname)", "refs/heads"],
  })).stdout;
  const branches = branchOutput
    .split(/\r?\n/)
    .filter(Boolean)
    .map((record) => {
      const [name = "", commit = ""] = record.split("\0");
      return { name, commit };
    });

  let selectedName = current;
  if (requestedBranch !== undefined) {
    await assertValidLocalBranchName(root, requestedBranch);
    if (!await localBranchExists(root, requestedBranch)) {
      throw gitPrecondition(`Local branch not found: ${requestedBranch}.`);
    }
    selectedName = requestedBranch;
  }

  let selectedBranch: {
    name: string;
    commit: string;
    upstream: string | null;
    ahead: number | null;
    behind: number | null;
  } | null = null;
  if (selectedName) {
    const branch = branches.find((entry) => entry.name === selectedName);
    if (!branch) {
      throw gitPrecondition(`Git could not inspect local branch: ${selectedName}.`);
    }
    const upstream = await configuredUpstream(root, selectedName);
    const counts = upstream && await refExists(root, upstream)
      ? await aheadBehindCounts(root, `refs/heads/${selectedName}`, upstream)
      : null;
    selectedBranch = {
      ...branch,
      upstream: upstream ? await shortRefName(root, upstream) : null,
      ahead: counts?.ahead ?? null,
      behind: counts?.behind ?? null,
    };
  }

  return {
    currentBranch: current,
    head: await readHead(root),
    branches,
    selectedBranch,
    remotes: await configuredRemoteNames(root),
  };
}

export async function inspectGitHistory(root: string, input: {
  ref?: string;
  maxCount?: number;
  ancestor?: string;
  descendant?: string;
} = {}): Promise<{
  ref: string;
  resolvedCommit: string;
  commits: Array<{
    commit: string;
    parents: string[];
    authoredAt: string;
    subject: string;
    refs: string[];
  }>;
  ancestry: {
    ancestor: string;
    ancestorCommit: string;
    descendant: string;
    descendantCommit: string;
    isAncestor: boolean;
  } | null;
}> {
  const ref = validateRevision(input.ref ?? "HEAD", "ref");
  const maxCount = validateHistoryCount(input.maxCount);
  if ((input.ancestor === undefined) !== (input.descendant === undefined)) {
    throw new AgentHarnessError("INVALID_INPUT", "ancestor and descendant must be supplied together.");
  }
  const resolvedCommit = await resolveCommit(root, ref);
  const output = (await runBoundedGit({
    cwd: root,
    args: [
      "--no-pager",
      "log",
      `--max-count=${maxCount}`,
      "-z",
      "--pretty=format:%H%x00%P%x00%aI%x00%s%x00%D",
      "--end-of-options",
      resolvedCommit,
    ],
  })).stdout;
  const fields = output.split("\0");
  if (fields.at(-1) === "") {
    fields.pop();
  }
  const commits: Array<{
    commit: string;
    parents: string[];
    authoredAt: string;
    subject: string;
    refs: string[];
  }> = [];
  for (let index = 0; index + 4 < fields.length; index += 5) {
    commits.push({
      commit: fields[index] ?? "",
      parents: (fields[index + 1] ?? "").split(" ").filter(Boolean),
      authoredAt: fields[index + 2] ?? "",
      subject: fields[index + 3] ?? "",
      refs: (fields[index + 4] ?? "").split(", ").filter(Boolean),
    });
  }

  let ancestry: {
    ancestor: string;
    ancestorCommit: string;
    descendant: string;
    descendantCommit: string;
    isAncestor: boolean;
  } | null = null;
  if (input.ancestor !== undefined && input.descendant !== undefined) {
    const ancestor = validateRevision(input.ancestor, "ancestor");
    const descendant = validateRevision(input.descendant, "descendant");
    const ancestorCommit = await resolveCommit(root, ancestor);
    const descendantCommit = await resolveCommit(root, descendant);
    const result = await runBoundedGit({
      cwd: root,
      args: ["merge-base", "--is-ancestor", ancestorCommit, descendantCommit],
      rejectNonZero: false,
    });
    if (result.exitCode !== 0 && result.exitCode !== 1) {
      throw gitPrecondition("Git could not determine the requested ancestry relationship.");
    }
    ancestry = { ancestor, ancestorCommit, descendant, descendantCommit, isAncestor: result.exitCode === 0 };
  }

  return { ref, resolvedCommit, commits, ancestry };
}

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

export async function switchGitBranch(root: string, branchName: string): Promise<{
  branchName: string;
  head: string;
}> {
  await assertValidLocalBranchName(root, branchName);
  await currentBranch(root);
  await assertCleanRepository(root);
  if (!await localBranchExists(root, branchName)) {
    throw gitPrecondition(`Local branch not found: ${branchName}.`);
  }
  await runBoundedGit({ cwd: root, args: ["switch", branchName] });
  return { branchName, head: await readHead(root) };
}

export async function fetchGitRemote(root: string, remoteName = "origin"): Promise<{
  remote: string;
  remoteTrackingRefs: Array<{ name: string; commit: string }>;
}> {
  const remote = await assertConfiguredRemote(root, remoteName);
  await runBoundedGit({ cwd: root, args: ["fetch", "--no-prune", "--", remote] });
  const output = (await runBoundedGit({
    cwd: root,
    args: ["for-each-ref", "--format=%(refname:short)%00%(objectname)", `refs/remotes/${remote}`],
  })).stdout;
  const remoteTrackingRefs = output
    .split(/\r?\n/)
    .filter(Boolean)
    .map((record) => {
      const [name = "", commit = ""] = record.split("\0");
      return { name, commit };
    });
  return { remote, remoteTrackingRefs };
}

export async function fastForwardGitBranch(root: string, input: {
  branch?: string;
  remote?: string;
  remoteBranch?: string;
} = {}): Promise<{
  branch: string;
  upstream: string;
  previousCommit: string;
  commit: string;
  ahead: number;
  behind: number;
}> {
  const originalBranch = await currentBranch(root);
  await assertCleanRepository(root);
  const branch = input.branch ?? originalBranch;
  await assertValidLocalBranchName(root, branch);
  if (!await localBranchExists(root, branch)) {
    throw gitPrecondition(`Local branch not found: ${branch}.`);
  }
  if ((input.remote === undefined) !== (input.remoteBranch === undefined)) {
    throw new AgentHarnessError("INVALID_INPUT", "remote and remoteBranch must be supplied together.");
  }

  let upstream: string;
  if (input.remote !== undefined && input.remoteBranch !== undefined) {
    const remote = await assertConfiguredRemote(root, input.remote);
    await assertValidBranchRefName(root, input.remoteBranch, "remoteBranch");
    upstream = `refs/remotes/${remote}/${input.remoteBranch}`;
    if (!await refExists(root, upstream)) {
      throw gitPrecondition(`Remote-tracking branch not found: ${remote}/${input.remoteBranch}. Fetch it first.`);
    }
  } else {
    const configured = await configuredUpstream(root, branch);
    if (!configured) {
      throw gitPrecondition(`Local branch has no configured upstream: ${branch}.`);
    }
    upstream = configured;
  }

  const previousCommit = await resolveCommit(root, `refs/heads/${branch}`);
  const upstreamCommit = await resolveCommit(root, upstream);
  const counts = await aheadBehindCounts(root, previousCommit, upstreamCommit);
  if (counts.ahead > 0 && counts.behind > 0) {
    throw new AgentHarnessError("GIT_EXECUTION_FAILED", "Fast-forward update rejected because the local branch and upstream have diverged.", {
      branch,
      upstream: await shortRefName(root, upstream),
      ahead: counts.ahead,
      behind: counts.behind,
    });
  }
  if (branch !== originalBranch) {
    await runBoundedGit({ cwd: root, args: ["switch", branch] });
  }
  await runBoundedGit({ cwd: root, args: ["merge", "--ff-only", upstreamCommit] });
  return {
    branch,
    upstream: await shortRefName(root, upstream),
    previousCommit,
    commit: await readHead(root),
    ahead: counts.ahead,
    behind: counts.behind,
  };
}

export async function mergeGitBranch(root: string, input: {
  sourceBranch: string;
  targetBranch?: string;
  mode?: string;
}): Promise<{
  sourceBranch: string;
  targetBranch: string;
  mode: "ff-only" | "merge";
  previousCommit: string;
  commit: string;
}> {
  const originalBranch = await currentBranch(root);
  await assertCleanRepository(root);
  await assertValidLocalBranchName(root, input.sourceBranch);
  const targetBranch = input.targetBranch ?? originalBranch;
  await assertValidLocalBranchName(root, targetBranch);
  const mode = validateMergeMode(input.mode);
  if (input.sourceBranch === targetBranch) {
    throw gitPrecondition("merge_branch requires distinct source and target branches.");
  }
  for (const branch of [input.sourceBranch, targetBranch]) {
    if (!await localBranchExists(root, branch)) {
      throw gitPrecondition(`Local branch not found: ${branch}.`);
    }
  }

  const sourceCommit = await resolveCommit(root, `refs/heads/${input.sourceBranch}`);
  if (targetBranch !== originalBranch) {
    await runBoundedGit({ cwd: root, args: ["switch", targetBranch] });
  }
  const previousCommit = await readHead(root);
  const result = await runBoundedGit({
    cwd: root,
    args: mode === "ff-only"
      ? ["merge", "--ff-only", sourceCommit]
      : ["merge", "--no-edit", "--no-stat", "--no-gpg-sign", sourceCommit],
    rejectNonZero: false,
  });
  if (result.exitCode !== 0) {
    const conflictingPaths = await readUnmergedPaths(root);
    const mergeInProgress = await hasMergeInProgress(root);
    let mergeAborted = false;
    if (mergeInProgress) {
      const abort = await runBoundedGit({ cwd: root, args: ["merge", "--abort"], rejectNonZero: false });
      mergeAborted = abort.exitCode === 0;
    }
    throw new AgentHarnessError(
      "GIT_EXECUTION_FAILED",
      conflictingPaths.length > 0
        ? "Git merge reported conflicts; the merge was not resolved automatically."
        : "Git could not complete the requested bounded merge.",
      {
        sourceBranch: input.sourceBranch,
        targetBranch,
        mode,
        conflictingPaths,
        mergeAborted,
        mergeInProgress: mergeInProgress && !mergeAborted,
        exitCode: result.exitCode,
        diagnostic: boundedDiagnostic(`${result.stderr} ${result.stdout}`),
      },
    );
  }
  return {
    sourceBranch: input.sourceBranch,
    targetBranch,
    mode,
    previousCommit,
    commit: await readHead(root),
  };
}

export async function createGitTag(root: string, input: {
  tagName: string;
  tagType: string;
  target?: string;
  message?: string;
}): Promise<{
  tagName: string;
  tagType: "annotated" | "lightweight";
  targetCommit: string;
}> {
  const tagName = await validateTagName(root, input.tagName);
  const tagType = validateTagType(input.tagType);
  if (await tagExists(root, tagName)) {
    throw gitPrecondition(`Tag already exists and will not be moved or overwritten: ${tagName}.`);
  }
  const target = validateRevision(input.target ?? "HEAD", "target");
  const targetCommit = await resolveCommit(root, target);
  if (tagType === "annotated") {
    const message = validateTagMessage(input.message);
    await runBoundedGit({
      cwd: root,
      args: ["tag", "--annotate", "--no-sign", "--message", message, "--", tagName, targetCommit],
    });
  } else {
    if (input.message !== undefined) {
      throw new AgentHarnessError("INVALID_INPUT", "message is only valid for an annotated tag.");
    }
    await runBoundedGit({ cwd: root, args: ["tag", "--", tagName, targetCommit] });
  }
  return { tagName, tagType, targetCommit };
}

export async function verifyGitTag(root: string, tagNameInput: string): Promise<{
  tagName: string;
  tagType: "annotated" | "lightweight";
  object: string;
  targetCommit: string;
}> {
  const tagName = await validateTagName(root, tagNameInput);
  if (!await tagExists(root, tagName)) {
    throw gitPrecondition(`Tag not found: ${tagName}.`);
  }
  const ref = `refs/tags/${tagName}`;
  const object = (await runBoundedGit({ cwd: root, args: ["rev-parse", "--verify", ref] })).stdout.trim();
  const objectType = (await runBoundedGit({ cwd: root, args: ["cat-file", "-t", object] })).stdout.trim();
  return {
    tagName,
    tagType: objectType === "tag" ? "annotated" : "lightweight",
    object,
    targetCommit: await resolveCommit(root, ref),
  };
}

export async function pushGitTag(root: string, input: {
  tagName: string;
  remote?: string;
}): Promise<{
  remote: string;
  tagName: string;
  targetCommit: string;
}> {
  const remote = await assertConfiguredRemote(root, input.remote ?? "origin");
  const verified = await verifyGitTag(root, input.tagName);
  const ref = `refs/tags/${verified.tagName}`;
  await runBoundedGit({ cwd: root, args: ["push", "--", remote, `${ref}:${ref}`] });
  return { remote, tagName: verified.tagName, targetCommit: verified.targetCommit };
}

export async function deleteGitBranch(root: string, branchName: string): Promise<{
  branchName: string;
  deletedCommit: string;
  currentBranch: string;
}> {
  await assertValidLocalBranchName(root, branchName);
  const current = await currentBranch(root);
  if (branchName === current) {
    throw gitPrecondition("delete_branch never deletes the currently checked-out branch.");
  }
  if (!await localBranchExists(root, branchName)) {
    throw gitPrecondition(`Local branch not found: ${branchName}.`);
  }
  const deletedCommit = await resolveCommit(root, `refs/heads/${branchName}`);
  await runBoundedGit({ cwd: root, args: ["branch", "--delete", "--", branchName] });
  return { branchName, deletedCommit, currentBranch: current };
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
  const remote = await assertConfiguredRemote(root, input.remote ?? "origin");
  const branch = input.branch ?? await currentBranch(root);
  await assertValidLocalBranchName(root, branch);
  if (!await localBranchExists(root, branch)) {
    throw gitPrecondition(`Local branch not found: ${branch}.`);
  }
  const commit = await resolveCommit(root, `refs/heads/${branch}`);
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
  const sourceCommit = await resolveCommit(root, `refs/heads/${sourceBranch}`);
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
  await assertValidBranchRefName(root, branchName, "branchName");
}

async function assertValidBranchRefName(root: string, branchName: string, label: string): Promise<void> {
  if (
    typeof branchName !== "string" ||
    !branchName ||
    branchName !== branchName.trim() ||
    branchName.startsWith("-") ||
    branchName.includes("\0")
  ) {
    throw new AgentHarnessError("INVALID_INPUT", `${label} must be a valid Git branch name.`);
  }
  const result = await runBoundedGit({
    cwd: root,
    args: ["check-ref-format", `refs/heads/${branchName}`],
    rejectNonZero: false,
  });
  if (result.exitCode !== 0) {
    throw new AgentHarnessError("INVALID_INPUT", `${label} must be a valid Git branch name.`);
  }
}

async function validateTagName(root: string, tagName: string): Promise<string> {
  if (
    typeof tagName !== "string" ||
    !tagName ||
    tagName !== tagName.trim() ||
    tagName.startsWith("-") ||
    tagName.includes("\0")
  ) {
    throw new AgentHarnessError("INVALID_INPUT", "tagName must be a valid Git tag name.");
  }
  const result = await runBoundedGit({
    cwd: root,
    args: ["check-ref-format", `refs/tags/${tagName}`],
    rejectNonZero: false,
  });
  if (result.exitCode !== 0) {
    throw new AgentHarnessError("INVALID_INPUT", "tagName must be a valid Git tag name.");
  }
  return tagName;
}

async function localBranchExists(root: string, branchName: string): Promise<boolean> {
  return refExists(root, `refs/heads/${branchName}`);
}

async function tagExists(root: string, tagName: string): Promise<boolean> {
  return refExists(root, `refs/tags/${tagName}`);
}

async function refExists(root: string, ref: string): Promise<boolean> {
  const result = await runBoundedGit({
    cwd: root,
    args: ["show-ref", "--verify", "--quiet", ref],
    rejectNonZero: false,
  });
  if (result.exitCode !== 0 && result.exitCode !== 1) {
    throw gitPrecondition(`Git could not verify ref: ${ref}.`);
  }
  return result.exitCode === 0;
}

async function hasMergeInProgress(root: string): Promise<boolean> {
  const result = await runBoundedGit({
    cwd: root,
    args: ["rev-parse", "--verify", "--quiet", "MERGE_HEAD"],
    rejectNonZero: false,
  });
  if (result.exitCode !== 0 && result.exitCode !== 1) {
    throw gitPrecondition("Git could not inspect merge state after a failed merge.");
  }
  return result.exitCode === 0;
}

async function currentBranchOrNull(root: string): Promise<string | null> {
  const result = await runBoundedGit({
    cwd: root,
    args: ["symbolic-ref", "--quiet", "--short", "HEAD"],
    rejectNonZero: false,
  });
  if (result.exitCode === 1) {
    return null;
  }
  if (result.exitCode !== 0) {
    throw gitPrecondition("Git could not determine the current branch.");
  }
  return result.stdout.trim() || null;
}

async function currentBranch(root: string): Promise<string> {
  const branch = await currentBranchOrNull(root);
  if (!branch) {
    throw gitPrecondition("Git mutation requires a checked-out local branch.");
  }
  return branch;
}

async function readHead(root: string): Promise<string> {
  return resolveCommit(root, "HEAD");
}

async function resolveCommit(root: string, revision: string): Promise<string> {
  const result = await runBoundedGit({
    cwd: root,
    args: ["rev-parse", "--verify", "--end-of-options", `${revision}^{commit}`],
    rejectNonZero: false,
  });
  const commit = result.stdout.trim();
  if (result.exitCode !== 0 || !/^[0-9a-f]{40,64}$/i.test(commit)) {
    throw gitPrecondition(`Git commit or ref could not be resolved: ${revision}.`);
  }
  return commit;
}

async function configuredRemoteNames(root: string): Promise<string[]> {
  return (await runBoundedGit({ cwd: root, args: ["remote"] })).stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .sort();
}

async function assertConfiguredRemote(root: string, remoteName: string): Promise<string> {
  const remote = validateRemoteName(remoteName);
  if (!(await configuredRemoteNames(root)).includes(remote)) {
    throw gitPrecondition(`Configured Git remote not found: ${remote}.`);
  }
  return remote;
}

async function configuredUpstream(root: string, branchName: string): Promise<string | null> {
  const output = (await runBoundedGit({
    cwd: root,
    args: ["for-each-ref", "--format=%(upstream)", `refs/heads/${branchName}`],
  })).stdout.trim();
  return output || null;
}

async function shortRefName(root: string, ref: string): Promise<string> {
  const result = await runBoundedGit({
    cwd: root,
    args: ["rev-parse", "--abbrev-ref", "--symbolic-full-name", ref],
    rejectNonZero: false,
  });
  return result.exitCode === 0 && result.stdout.trim() ? result.stdout.trim() : ref;
}

async function aheadBehindCounts(root: string, localRef: string, upstreamRef: string): Promise<{
  ahead: number;
  behind: number;
}> {
  const output = (await runBoundedGit({
    cwd: root,
    args: ["rev-list", "--left-right", "--count", `${localRef}...${upstreamRef}`],
  })).stdout.trim();
  const [aheadText, behindText] = output.split(/\s+/);
  const ahead = Number(aheadText);
  const behind = Number(behindText);
  if (!Number.isSafeInteger(ahead) || !Number.isSafeInteger(behind)) {
    throw gitPrecondition("Git returned invalid ahead/behind counts.");
  }
  return { ahead, behind };
}

async function readUnmergedPaths(root: string): Promise<string[]> {
  const output = (await runBoundedGit({
    cwd: root,
    args: ["diff", "--name-only", "--diff-filter=U", "-z"],
  })).stdout;
  return output.split("\0").filter(Boolean).slice(0, MAX_STAGING_PATHS);
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

function validateTagMessage(message: string | undefined): string {
  if (message === undefined) {
    throw new AgentHarnessError("INVALID_INPUT", "message is required for an annotated tag.");
  }
  return validateCommitMessage(message);
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

function validateRevision(revision: string, label: string): string {
  if (
    typeof revision !== "string" ||
    !revision ||
    revision !== revision.trim() ||
    revision.startsWith("-") ||
    /[\0\r\n]/.test(revision) ||
    Buffer.byteLength(revision, "utf8") > MAX_REVISION_BYTES
  ) {
    throw new AgentHarnessError("INVALID_INPUT", `${label} must be a bounded Git commit or ref.`);
  }
  return revision;
}

function validateHistoryCount(value: number | undefined): number {
  if (value === undefined) {
    return 20;
  }
  if (!Number.isSafeInteger(value) || value < 1 || value > MAX_HISTORY_COUNT) {
    throw new AgentHarnessError("INVALID_INPUT", `maxCount must be an integer from 1 through ${MAX_HISTORY_COUNT}.`);
  }
  return value;
}

function validateMergeMode(value: string | undefined): "ff-only" | "merge" {
  const mode = value ?? "merge";
  if (mode !== "ff-only" && mode !== "merge") {
    throw new AgentHarnessError("INVALID_INPUT", "mode must be either ff-only or merge.");
  }
  return mode;
}

function validateTagType(value: string): "annotated" | "lightweight" {
  if (value !== "annotated" && value !== "lightweight") {
    throw new AgentHarnessError("INVALID_INPUT", "tagType must be either annotated or lightweight.");
  }
  return value;
}

function boundedDiagnostic(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim().slice(0, 1_000);
}

function gitPrecondition(message: string): AgentHarnessError {
  return new AgentHarnessError("GIT_EXECUTION_FAILED", message);
}
