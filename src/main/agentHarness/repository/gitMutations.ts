import fs from "node:fs";
import path from "node:path";
import { AgentHarnessError } from "../core/errors";
import { assertSafeRelativePath, resolveRepositoryPath } from "./pathPolicy";
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

/** Ref operations never borrow the selected checkout's index or working files. */
export async function createGitBranchFromRef(root: string, input: { branchName: string; sourceRef: string }) {
  const { branchName } = input;
  await assertRefBranchName(root, branchName);
  const sourceRef = validateRevision(input.sourceRef, "sourceRef");
  const sourceCommit = await resolveCommit(root, sourceRef);
  if (await localBranchExists(root, branchName)) throw gitPrecondition("Branch already exists; it will not be overwritten.");
  await assertDirectBranchRef(root, branchName);
  // An all-zero old value is an atomic create-only assertion (also for SHA-256 repositories).
  await runRefGit(root, ["update-ref", "--no-deref", `refs/heads/${branchName}`, sourceCommit, "0".repeat(sourceCommit.length)]);
  return { branchName, sourceRef, sourceCommit };
}

export async function advanceGitBranchRef(root: string, input: {
  branchName: string; sourceRef: string; expectedCurrentCommit: string;
}) {
  const { branchName } = input;
  await assertExistingDirectBranch(root, branchName);
  const expected = exactRefCommit(input.expectedCurrentCommit);
  const sourceRef = validateRevision(input.sourceRef, "sourceRef");
  const previousCommit = await resolveCommit(root, `refs/heads/${branchName}`);
  if (previousCommit !== expected) throw gitPrecondition("Branch changed before ref advancement.");
  const commit = await resolveCommit(root, sourceRef);
  const ancestry = await runBoundedGit({ cwd: root, args: ["merge-base", "--is-ancestor", previousCommit, commit], rejectNonZero: false });
  if (ancestry.exitCode !== 0) throw gitPrecondition("Branch advancement requires fast-forward ancestry.");
  await assertBranchCheckoutState(root, branchName, false);
  await runRefGit(root, ["update-ref", "--no-deref", `refs/heads/${branchName}`, commit, previousCommit]);
  return { branchName, sourceRef, previousCommit, commit };
}

export async function renameGitBranch(root: string, input: { branchName: string; newBranchName: string }) {
  const { branchName, newBranchName } = input;
  await assertExistingDirectBranch(root, branchName);
  await assertRefBranchName(root, newBranchName);
  if (await localBranchExists(root, newBranchName)) throw gitPrecondition("Rename destination branch already exists.");
  await assertDirectBranchRef(root, newBranchName);
  await assertBranchCheckoutState(root, branchName, true);
  const commit = await resolveCommit(root, `refs/heads/${branchName}`);
  await runRefGit(root, ["branch", "--move", "--", branchName, newBranchName]);
  return { branchName, newBranchName, commit };
}

export async function setGitBranchUpstream(root: string, input: { branchName: string; remote: string; remoteBranch: string }) {
  const { branchName, remoteBranch } = input;
  await assertExistingDirectBranch(root, branchName);
  const remote = await assertConfiguredRemote(root, input.remote);
  await assertValidBranchRefName(root, remoteBranch, "remoteBranch");
  const ref = `refs/remotes/${remote}/${remoteBranch}`;
  if (!await refExists(root, ref)) throw gitPrecondition("Remote-tracking branch is absent; fetch it first.");
  await resolveCommit(root, ref);
  await runRefGit(root, ["branch", `--set-upstream-to=${ref}`, "--", branchName]);
  return { branchName, upstream: `${remote}/${remoteBranch}` };
}

export async function unsetGitBranchUpstream(root: string, input: { branchName: string }) {
  await assertExistingDirectBranch(root, input.branchName);
  await runRefGit(root, ["branch", "--unset-upstream", "--", input.branchName]);
  return { branchName: input.branchName, upstream: null };
}

export async function deleteGitRemoteBranch(root: string, input: {
  remote: string; remoteBranch: string; expectedRemoteCommit: string;
}) {
  const remote = await assertConfiguredRemote(root, input.remote);
  const { remoteBranch } = input;
  await assertValidBranchRefName(root, remoteBranch, "remoteBranch");
  const expected = exactRefCommit(input.expectedRemoteCommit);
  await assertSingleRemoteDestination(root, remote);
  const ref = `refs/heads/${remoteBranch}`;
  if (await inspectRemoteBranchCommit(root, remote, ref) !== expected) {
    throw gitPrecondition("Remote branch is absent or changed before deletion.");
  }
  // The exact lease also protects the interval between ls-remote and receive-pack.
  await runRefGit(root, ["push", "--no-follow-tags", "--no-mirror", `--force-with-lease=${ref}:${expected}`, "--", remote, `:${ref}`]);
  if (await inspectRemoteBranchCommit(root, remote, ref) !== null) {
    throw gitPrecondition("Remote branch deletion was not confirmed absent; inspect before retrying.");
  }
  return { remote, remoteBranch, deletedCommit: expected, remoteState: "absent" as const };
}

async function assertRefBranchName(root: string, name: string): Promise<void> {
  await assertValidLocalBranchName(root, name);
  if (name === "HEAD" || Buffer.byteLength(name, "utf8") > MAX_REVISION_BYTES) {
    throw new AgentHarnessError("INVALID_INPUT", "A bounded local branch name is required.");
  }
}

async function assertDirectBranchRef(root: string, name: string): Promise<void> {
  const symbolic = await runBoundedGit({ cwd: root, args: ["symbolic-ref", "--quiet", `refs/heads/${name}`], rejectNonZero: false });
  if (symbolic.exitCode !== 1) throw gitPrecondition("Symbolic or ambiguous branch refs are not supported.");
}

async function assertExistingDirectBranch(root: string, name: string): Promise<void> {
  await assertRefBranchName(root, name);
  await assertDirectBranchRef(root, name);
  if (!await localBranchExists(root, name)) throw gitPrecondition("Local branch does not exist.");
}

async function assertBranchCheckoutState(root: string, name: string, allowCurrent: boolean): Promise<void> {
  const output = await runRefGit(root, ["worktree", "list", "--porcelain", "-z"]);
  const matches = output.stdout.split("\0").filter((field) => field === `branch refs/heads/${name}`);
  const permitted = allowCurrent && await currentBranchOrNull(root) === name ? 1 : 0;
  if (matches.length > permitted) throw gitPrecondition("Branch is checked out in a conflicting worktree.");
  const detached = output.stdout.split("\0\0").map((entry) => entry.split("\0")).filter((entry) => entry.includes("detached"));
  if (detached.length > 256) throw gitPrecondition("Worktree ownership exceeds its bound.");
  for (const record of detached) {
    const checkout = record.find((entry) => entry.startsWith("worktree "))?.slice(9);
    if (!checkout) throw gitPrecondition("Detached checkout identity is unavailable.");
    for (const backend of ["rebase-merge", "rebase-apply"]) {
      const marker = path.resolve(checkout, (await runRefGit(checkout, ["rev-parse", "--git-path", backend + "/head-name"])).stdout.trim());
      if (fs.existsSync(marker)) {
        const stat = fs.lstatSync(marker);
        if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 4096) throw gitPrecondition("Rebase branch ownership cannot be verified.");
        if (fs.readFileSync(marker, "utf8").trim() === "refs/heads/" + name) throw gitPrecondition("Branch is owned by an active worktree rebase.");
      }
    }
  }
}

function exactRefCommit(value: string): string {
  if (typeof value !== "string" || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(value)) {
    throw new AgentHarnessError("INVALID_INPUT", "An exact commit object ID is required.");
  }
  return value;
}

async function runRefGit(root: string, args: string[]) {
  const result = await runBoundedGit({ cwd: root, args, rejectNonZero: false });
  if (result.exitCode !== 0) throw gitPrecondition("Bounded Git ref operation failed; inspect repository state before retrying.");
  return result;
}

async function assertSingleRemoteDestination(root: string, remote: string): Promise<void> {
  const fetch = (await runRefGit(root, ["remote", "get-url", "--all", remote])).stdout.trim();
  const push = (await runRefGit(root, ["remote", "get-url", "--push", "--all", remote])).stdout.trim();
  if (!fetch || /[\r\n]/.test(fetch) || fetch !== push) throw gitPrecondition("Operation requires one matching remote fetch and push destination.");
  const mirror = await runBoundedGit({ cwd: root, args: ["config", "--get", "--bool", `remote.${remote}.mirror`], rejectNonZero: false });
  if ((mirror.exitCode !== 0 && mirror.exitCode !== 1) || mirror.stdout.trim() === "true") throw gitPrecondition("Operation requires a non-mirroring remote.");
}

async function inspectRemoteBranchCommit(root: string, remote: string, ref: string): Promise<string | null> {
  const output = await runRefGit(root, ["ls-remote", "--heads", "--", remote, ref]);
  const lines = output.stdout.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return null;
  const fields = lines[0].split("\t");
  if (lines.length !== 1 || fields.length !== 2 || fields[1] !== ref) throw gitPrecondition("Remote branch inspection returned ambiguous metadata.");
  return exactRefCommit(fields[0]);
}

export interface GitDiffInput {
  view?: "unstaged" | "staged" | "between_refs";
  baseRef?: string;
  targetRef?: string;
  paths?: string[];
}

export async function inspectGitDiff(root: string, input: GitDiffInput = {}) {
  const view = input.view ?? "unstaged";
  if (!["unstaged", "staged", "between_refs"].includes(view)) throw new AgentHarnessError("INVALID_INPUT", "Invalid diff view.");
  const paths = input.paths === undefined ? ["."] : containedGitPaths(root, input.paths);
  const args = ["--no-pager", "diff", "--no-ext-diff", "--no-textconv"];
  let baseCommit: string | undefined;
  let targetCommit: string | undefined;
  if (view === "between_refs") {
    baseCommit = await resolveCommit(root, validateRevision(input.baseRef as string, "baseRef"));
    targetCommit = await resolveCommit(root, validateRevision(input.targetRef as string, "targetRef"));
    args.push(baseCommit, targetCommit);
  } else {
    if (input.baseRef !== undefined || input.targetRef !== undefined) throw new AgentHarnessError("INVALID_INPUT", "Refs require the between_refs view.");
    if (view === "staged") args.push("--cached");
  }
  const result = await runRefGit(root, [...args, "--", ...paths]);
  return { gitBacked: true, diff: result.stdout, ...(baseCommit ? { baseCommit, targetCommit } : {}) };
}

/** Shared porcelain parser previously owned only by SourceControlService. */
export async function inspectGitChangedFiles(root: string): Promise<import("../../../shared/sourceControlContracts").SourceControlChangedFile[]> {
  const output = await runRefGit(root, ["status", "--porcelain=v1", "-z", "--untracked-files=all"]);
  const records = output.stdout.split("\0");
  if (records.pop() !== "") throw gitPrecondition("Git returned incomplete changed-file evidence.");
  const files: import("../../../shared/sourceControlContracts").SourceControlChangedFile[] = [];
  for (let index = 0; index < records.length; index++) {
    const record = records[index];
    if (record.length < 4 || record[2] !== " ") throw gitPrecondition("Git returned invalid changed-file evidence.");
    const file: import("../../../shared/sourceControlContracts").SourceControlChangedFile = {
      path: record.slice(3), indexStatus: record[0], worktreeStatus: record[1],
    };
    if (/[RC]/.test(record.slice(0, 2))) {
      const originalPath = records[++index];
      if (!originalPath) throw gitPrecondition("Git returned incomplete rename evidence.");
      file.originalPath = originalPath;
    }
    files.push(file);
  }
  return files;
}

export async function inspectGitCommit(root: string, input: { ref: string; includePatch?: boolean }) {
  const commit = await resolveCommit(root, validateRevision(input.ref, "ref"));
  const metadata = await runRefGit(root, ["show", "--no-patch", "--format=format:%H%x00%P%x00%aI%x00%B", commit]);
  const [object, parentsText, authoredAt, ...message] = metadata.stdout.split("\0");
  if (object !== commit || !authoredAt) throw gitPrecondition("Invalid commit metadata.");
  const parents = parentsText.split(" ").filter(Boolean);
  // A merge commit is inspected against its first parent; all parents remain explicit metadata.
  const range = parents.length ? [parents[0], commit] : [commit];
  const changed = await runRefGit(root, ["diff-tree", "--root", "--no-commit-id", "--no-ext-diff", "--no-textconv", "--name-status", "-r", "-z", "-M", ...range, "--"]);
  const fields = changed.stdout.split("\0").filter(Boolean);
  const changedFiles: Array<{ path: string; status: string; originalPath?: string }> = [];
  for (let i = 0; i < fields.length;) {
    const status = fields[i++];
    const first = fields[i++];
    const renamed = /^[RC]\d+$/.test(status);
    const filename = renamed ? fields[i++] : first;
    if (!first || !filename || !/^[ACDMRTUXB][0-9]*$/.test(status)) throw gitPrecondition("Invalid commit path evidence.");
    changedFiles.push({ path: filename, status, ...(renamed ? { originalPath: first } : {}) });
  }
  const patch = input.includePatch ? (await runRefGit(root, ["diff-tree", "--root", "--no-commit-id", "--no-ext-diff", "--no-textconv", "-p", "-r", ...range, "--"])).stdout : undefined;
  return { commit, parents, authoredAt, message: safeGitMetadata(root, message.join("\0")), changedFiles,
    ...(patch === undefined ? {} : { patch: safeGitMetadata(root, patch) }) };
}

export async function compareGitRefs(root: string, input: { leftRef: string; rightRef: string }) {
  const leftCommit = await resolveCommit(root, validateRevision(input.leftRef, "leftRef"));
  const rightCommit = await resolveCommit(root, validateRevision(input.rightRef, "rightRef"));
  const { ahead, behind } = await aheadBehindCounts(root, leftCommit, rightCommit);
  const bases = await runBoundedGit({ cwd: root, args: ["merge-base", "--all", leftCommit, rightCommit], rejectNonZero: false });
  if (bases.exitCode !== 0 && bases.exitCode !== 1) throw gitPrecondition("Git could not inspect merge bases.");
  const mergeBases = bases.stdout.trim().split(/\s+/).filter(Boolean).map(exactRefCommit);
  if (mergeBases.length > 100) throw gitPrecondition("Merge-base inventory exceeds its bound.");
  return { leftCommit, rightCommit, ahead, behind, mergeBases, leftIsAncestorOfRight: ahead === 0, rightIsAncestorOfLeft: behind === 0 };
}

export async function listGitTags(root: string) {
  const output = await runRefGit(root, ["for-each-ref", "--format=%(refname:strip=2)%00%(objecttype)%00%(objectname)%00%(*objecttype)%00%(*objectname)", "refs/tags"]);
  const refs = output.stdout.split(/\r?\n/).filter(Boolean);
  if (refs.length > 1000) throw gitPrecondition("Tag inventory exceeds its bound.");
  const tags = [];
  const deadline = Date.now() + 15_000;
  for (const row of refs) {
    const [tagName, kind, object, peeledKind, peeledObject] = row.split("\0");
    if (Date.now() > deadline) throw gitPrecondition("Tag inventory exceeded its deadline.");
    const targetCommit = kind === "commit" ? object : peeledKind === "commit" ? peeledObject : await resolveCommit(root, `refs/tags/${tagName}`);
    tags.push({ tagName, tagType: kind === "tag" ? "annotated" as const : "lightweight" as const, targetCommit });
  }
  return { tags };
}

export async function inspectGitRemotes(root: string) {
  const remotes = await configuredRemoteNames(root);
  const tracking = (await runRefGit(root, ["for-each-ref", "--format=%(refname)%00%(objectname)", "refs/remotes"])).stdout;
  const mappings = (await runRefGit(root, ["for-each-ref", "--format=%(refname:strip=2)%00%(upstream)", "refs/heads"])).stdout;
  return { remotes,
    remoteTrackingRefs: tracking.split(/\r?\n/).filter(Boolean).map(line => { const [ref, commit] = line.split("\0"); return { ref, commit }; }),
    upstreams: mappings.split(/\r?\n/).filter(Boolean).map(line => { const [branchName, upstream] = line.split("\0"); return { branchName, upstream: upstream || null }; }),
  };
}

export async function unstageGitChanges(root: string, paths: string[]) {
  const unstagedPaths = containedGitPaths(root, paths);
  const head = await runBoundedGit({ cwd: root, args: ["rev-parse", "--verify", "--quiet", "HEAD"], rejectNonZero: false });
  if (head.exitCode === 0) {
    await runRefGit(root, ["restore", "--staged", `--source=${exactRefCommit(head.stdout.trim())}`, "--", ...unstagedPaths]);
  } else if (head.exitCode === 1) {
    await runRefGit(root, ["rm", "--cached", "--force", "--ignore-unmatch", "-r", "--", ...unstagedPaths]);
  } else throw gitPrecondition("Git could not inspect HEAD before unstaging.");
  return { unstagedPaths };
}

export async function restoreGitFiles(root: string, input: { paths: string[]; sourceRef?: string }) {
  const restoredPaths = containedGitPaths(root, input.paths);
  const sourceCommit = await resolveCommit(root, validateRevision(input.sourceRef ?? "HEAD", "sourceRef"));
  for (const selected of restoredPaths) {
    if (selected === "." || /[*?\[\]{}]/.test(selected) || selected.split("/").some(p => p === ".git" || p === ".")) {
      throw new AgentHarnessError("PATH_DENIED", "Restore requires explicit tracked file paths.");
    }
    let current = root;
    for (const segment of selected.split("/")) {
      current = path.join(current, segment);
      let stat: fs.Stats | null = null;
      try { stat = fs.lstatSync(current); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw gitPrecondition("Restore path could not be inspected."); }
      if (stat?.isSymbolicLink()) throw new AgentHarnessError("PATH_DENIED", "Restore cannot traverse symlinks.");
    }
    if (fs.existsSync(current) && !fs.lstatSync(current).isFile()) throw new AgentHarnessError("PATH_DENIED", "Restore requires regular tracked files.");
    const index = (await runRefGit(root, ["--literal-pathspecs", "ls-files", "--stage", "-z", "--", selected])).stdout.split("\0").filter(Boolean);
    if (index.length !== 1 || !/^100(?:644|755) [a-f0-9]+ 0\t/.test(index[0]) || index[0].slice(index[0].indexOf("\t") + 1) !== selected) {
      throw gitPrecondition("Every restore path must be an ordinary tracked, unconflicted file.");
    }
    const source = (await runRefGit(root, ["--literal-pathspecs", "ls-tree", "-z", sourceCommit, "--", selected])).stdout;
    if (source && !/^100(?:644|755) blob [a-f0-9]+\t/.test(source)) throw gitPrecondition("Restore source must contain ordinary files or a tracked deletion.");
  }
  await runRefGit(root, ["--literal-pathspecs", "restore", "--worktree", `--source=${sourceCommit}`, "--", ...restoredPaths]);
  return { restoredPaths, sourceCommit };
}

function containedGitPaths(root: string, paths: string[]): string[] {
  const normalized = normalizePathspecs(paths);
  for (const filename of normalized) resolveRepositoryPath(root, filename, { allowMissingLeaf: true });
  return normalized;
}

function safeGitMetadata(root: string, value: string): string {
  return value.replaceAll(root, "<PROJECT_REPO>")
    .replace(/(https?:\/\/)[^\s/@]+:[^\s/@]+@/gi, "$1[redacted]@")
    .replace(/\b[A-Z]:[\\/][^\s"<>]+|\/(?:Users|home|tmp)\/[^\s"<>]+/gi, "<LOCAL_PATH>");
}

export async function inspectGitReflog(root: string, input: { ref?: string; maxCount?: number } = {}) {
  const ref = validateRevision(input.ref ?? "HEAD", "ref");
  if (/[~^:@{}\s]/.test(ref)) throw gitPrecondition("Reflog inspection requires HEAD or one named ref.");
  await resolveCommit(root, ref);
  const maxCount = validateHistoryCount(input.maxCount);
  const output = (await runRefGit(root, ["reflog", "show", `--max-count=${maxCount + 1}`, "--date=iso-strict", "--format=%H%x00%gD%x00%gs", ref, "--"])).stdout;
  const rows = output.split(/\r?\n/).filter(Boolean).map((line) => line.split("\0"));
  return { ref, entries: rows.slice(0, maxCount).map(([commit, datedSelector, message], index) => ({
    newCommit: exactRefCommit(commit), oldCommit: rows[index + 1] ? exactRefCommit(rows[index + 1][0]) : null,
    index, selector: safeGitMetadata(root, `${ref}@{${index}}`), timestamp: /@\{([^}]+)\}$/.exec(datedSelector)?.[1] ?? null,
    message: safeGitMetadata(root, message ?? "").replace(/\b(?:https?|ssh):\/\/\S+/gi, "<REMOTE>").replace(/\b(?:gh[pousr]_[A-Za-z0-9_]+|sk-[A-Za-z0-9_-]{16,})\b/g, "[redacted]").replace(/\b(token|password|secret|api[_-]?key)=\S+/gi, "$1=[redacted]").replace(/(?:^|\s)\/[^\s]+/g, " <LOCAL_PATH>").slice(0, 1000),
  })) };
}

export async function replaceGitBranchRef(root: string, input: { branchName: string; expectedCurrentCommit: string; sourceRef: string }) {
  await assertExistingDirectBranch(root, input.branchName);
  const previousCommit = exactRefCommit(input.expectedCurrentCommit);
  if (await resolveCommit(root, `refs/heads/${input.branchName}`) !== previousCommit) throw gitPrecondition("Branch changed before ref replacement.");
  const commit = await resolveCommit(root, validateRevision(input.sourceRef, "sourceRef"));
  const forward = await runBoundedGit({ cwd: root, args: ["merge-base", "--is-ancestor", previousCommit, commit], rejectNonZero: false });
  const backward = await runBoundedGit({ cwd: root, args: ["merge-base", "--is-ancestor", commit, previousCommit], rejectNonZero: false });
  if (![0, 1].includes(forward.exitCode ?? -1) || ![0, 1].includes(backward.exitCode ?? -1)) throw gitPrecondition("Cannot determine ref replacement ancestry.");
  await assertBranchCheckoutState(root, input.branchName, false);
  await runRefGit(root, ["update-ref", "--no-deref", "--create-reflog", "-m", "ChampCity explicit branch replacement", `refs/heads/${input.branchName}`, commit, previousCommit]);
  return { branchName: input.branchName, previousCommit, commit, movement: forward.exitCode === 0 ? "fast-forward" as const : backward.exitCode === 0 ? "rewind" as const : "divergent" as const };
}

export async function pushGitWithLease(root: string, input: { remote: string; localBranch: string; remoteBranch: string; expectedLocalCommit: string; expectedRemoteCommit: string; setUpstream?: boolean }) {
  const remote = await assertConfiguredRemote(root, input.remote);
  await assertExistingDirectBranch(root, input.localBranch);
  await assertValidBranchRefName(root, input.remoteBranch, "remoteBranch");
  const commit = exactRefCommit(input.expectedLocalCommit);
  const previousRemoteCommit = exactRefCommit(input.expectedRemoteCommit);
  if (input.setUpstream !== undefined && typeof input.setUpstream !== "boolean") throw gitPrecondition("setUpstream must be boolean.");
  await assertSingleRemoteDestination(root, remote);
  const ref = `refs/heads/${input.remoteBranch}`;
  if (await inspectRemoteBranchCommit(root, remote, ref) !== previousRemoteCommit) throw gitPrecondition("Remote branch changed before lease push.");
  if (await resolveCommit(root, `refs/heads/${input.localBranch}`) !== commit) throw gitPrecondition("Local branch changed before lease push.");
  await runRefGit(root, ["push", "--no-follow-tags", "--no-mirror", `--force-with-lease=${ref}:${previousRemoteCommit}`, "--", remote, `${commit}:${ref}`]);
  const remoteCommit = await inspectRemoteBranchCommit(root, remote, ref);
  if (remoteCommit !== commit) throw gitPrecondition("Push finished but remote endpoint verification failed; inspect before retrying.");
  if (input.setUpstream) await setGitBranchUpstream(root, { branchName: input.localBranch, remote, remoteBranch: input.remoteBranch });
  return { remote, localBranch: input.localBranch, remoteBranch: input.remoteBranch, previousRemoteCommit, remoteCommit, commit, ...(input.setUpstream ? { upstream: `${remote}/${input.remoteBranch}` } : {}) };
}

export async function deleteGitUntrackedPaths(root: string, paths: string[]) {
  const selected = containedGitPaths(root, paths);
  const deny = () => new AgentHarnessError("PATH_DENIED", "Untracked deletion requires exact ordinary untracked, nonignored paths without repository metadata or symlinks.");
  for (const entry of selected) {
    if (entry === "." || /[*?\[\]{}\r\n]/.test(entry) || entry.split("/").some((part) => part === "." || /^\.git(?:$|ignore$|attributes$|modules$)/i.test(part))) throw deny();
    if (selected.some((other) => other !== entry && entry.startsWith(other + "/"))) throw deny();
    let current = root;
    for (const part of entry.split("/")) {
      if (!fs.readdirSync(current).includes(part)) throw deny();
      current = path.join(current, part);
      if (fs.lstatSync(current).isSymbolicLink()) throw deny();
    }
  }
  const tracked = await runRefGit(root, ["--literal-pathspecs", "ls-files", "--cached", "-z", "--", ...selected]);
  if (tracked.stdout) throw deny();
  const head = await runBoundedGit({ cwd: root, args: ["rev-parse", "--verify", "HEAD"], rejectNonZero: false });
  if (head.exitCode === 0 && (await runRefGit(root, ["--literal-pathspecs", "ls-tree", "-r", "--name-only", "-z", exactRefCommit(head.stdout.trim()), "--", ...selected])).stdout) throw deny();
  const ignored = await runBoundedGit({ cwd: root, args: ["check-ignore", "--no-index", "--", ...selected], rejectNonZero: false });
  if (ignored.exitCode !== 1 || (await runRefGit(root, ["--literal-pathspecs", "ls-files", "--others", "--ignored", "--exclude-standard", "-z", "--", ...selected])).stdout) throw deny();
  const entries: Array<{ relativePath: string; stat: fs.Stats }> = [];
  const deadline = Date.now() + 15_000;
  const visit = (relativePath: string, depth: number) => {
    if (depth > 64 || entries.length >= 4096 || Date.now() > deadline || relativePath.length > 4096 || relativePath.split("/").some((part) => /^\.git(?:$|ignore$|attributes$|modules$)/i.test(part))) throw deny();
    const resolved = resolveRepositoryPath(root, relativePath);
    const stat = fs.lstatSync(resolved.requestedPath);
    if (stat.isSymbolicLink() || (!stat.isFile() && !stat.isDirectory())) throw deny();
    entries.push({ relativePath, stat });
    if (stat.isDirectory()) for (const child of fs.readdirSync(resolved.requestedPath)) visit(`${relativePath}/${child}`, depth + 1);
  };
  for (const entry of selected) visit(entry, 0);
  // Check ignored empty directories too; ls-files only reports file entries.
  const directories = entries.filter((entry) => entry.stat.isDirectory()).map((entry) => entry.relativePath);
  for (let index = 0; index < directories.length; index += 32) {
    if (Date.now() > deadline) throw deny();
    const ignoredDirectory = await runBoundedGit({ cwd: root, args: ["check-ignore", "--no-index", "--", ...directories.slice(index, index + 32)], rejectNonZero: false });
    if (ignoredDirectory.exitCode !== 1) throw deny();
  }
  // All selections have passed before the first deletion; never use recursive removal.
  for (const entry of entries) {
    const resolved = resolveRepositoryPath(root, entry.relativePath);
    if (resolved.requestedPath !== resolved.resolvedPath) throw deny();
    const current = fs.lstatSync(resolved.requestedPath);
    if (current.isSymbolicLink() || current.dev !== entry.stat.dev || current.ino !== entry.stat.ino || current.mtimeMs !== entry.stat.mtimeMs || current.size !== entry.stat.size) throw deny();
  }
  for (const entry of [...entries].reverse()) {
    const resolved = resolveRepositoryPath(root, entry.relativePath);
    if (resolved.requestedPath !== resolved.resolvedPath) throw deny();
    if (fs.lstatSync(resolved.requestedPath).isSymbolicLink()) throw deny();
    if (entry.stat.isDirectory()) fs.rmdirSync(resolved.requestedPath); else fs.unlinkSync(resolved.requestedPath);
  }
  return { deletedPaths: selected, deletedFiles: entries.filter((entry) => entry.stat.isFile()).map((entry) => entry.relativePath) };
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

export async function deleteGitTag(root: string, input: {
  tagName: string;
  remote?: string;
}): Promise<{
  remote: string;
  tagName: string;
  deletedCommit: string | null;
  localDeleted: boolean;
  remoteDeleted: boolean;
  localState: "absent";
  remoteState: "absent";
}> {
  await assertCleanRepository(root);
  const tagName = await validateTagName(root, input.tagName);
  const remote = await assertConfiguredRemote(root, input.remote ?? "origin");
  const ref = `refs/tags/${tagName}`;
  const local = await tagExists(root, tagName) ? await verifyGitTag(root, tagName) : null;

  // Inspection must corroborate the same single destination used by push.
  const fetchUrl = (await runBoundedGit({ cwd: root, args: ["remote", "get-url", "--all", remote] })).stdout.trim();
  const pushUrl = (await runBoundedGit({ cwd: root, args: ["remote", "get-url", "--push", "--all", remote] })).stdout.trim();
  if (!fetchUrl || /[\r\n]/.test(fetchUrl) || fetchUrl !== pushUrl) {
    throw gitPrecondition("Tag deletion requires one matching remote fetch and push destination.");
  }
  const mirror = await runBoundedGit({
    cwd: root, args: ["config", "--get", "--bool", `remote.${remote}.mirror`], rejectNonZero: false,
  });
  if ((mirror.exitCode !== 0 && mirror.exitCode !== 1) || mirror.stdout.trim() === "true") {
    throw gitPrecondition("Tag deletion requires a non-mirroring remote.");
  }
  const remoteTarget = await inspectRemoteTagTarget(root, remote, ref);
  if (remoteTarget && !local) {
    throw gitPrecondition("Remote tag deletion requires a corroborating local tag.");
  }
  if (remoteTarget && remoteTarget !== local?.targetCommit) {
    throw gitPrecondition("Local and remote tag targets do not match.");
  }
  if (remoteTarget) {
    await runBoundedGit({ cwd: root, args: ["push", "--no-follow-tags", "--delete", "--", remote, ref] });
    if (await inspectRemoteTagTarget(root, remote, ref)) {
      throw gitPrecondition("Remote tag deletion was not confirmed absent; the local tag was preserved.");
    }
  }
  if (local) {
    // Compare-and-delete preserves a local tag changed since the inspection.
    await runBoundedGit({ cwd: root, args: ["update-ref", "--no-deref", "-d", ref, local.object] });
    if (await tagExists(root, tagName)) {
      throw gitPrecondition("Local tag deletion was not confirmed absent.");
    }
  }
  return {
    remote, tagName, deletedCommit: local?.targetCommit ?? null,
    localDeleted: local !== null, remoteDeleted: remoteTarget !== null,
    localState: "absent", remoteState: "absent",
  };
}

async function inspectRemoteTagTarget(root: string, remote: string, ref: string): Promise<string | null> {
  const result = await runBoundedGit({ cwd: root, args: ["ls-remote", "--tags", "--", remote, ref, `${ref}^{}`] });
  const targets = new Map<string, string>();
  for (const line of result.stdout.split(/\r?\n/).filter(Boolean)) {
    const match = /^([0-9a-f]{40,64})\t(.+)$/i.exec(line);
    if (!match || (match[2] !== ref && match[2] !== `${ref}^{}`) || targets.has(match[2])) {
      throw gitPrecondition("Remote tag inspection returned ambiguous metadata.");
    }
    targets.set(match[2], match[1].toLowerCase());
  }
  if (targets.size && !targets.has(ref)) {
    throw gitPrecondition("Remote tag inspection is missing the direct tag ref.");
  }
  return targets.get(`${ref}^{}`) ?? targets.get(ref) ?? null;
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

export async function assertExpectedGitHead(root: string, expectedHead: string): Promise<string> {
  if (!/^[a-f0-9]{40,64}$/.test(expectedHead) || await readHead(root) !== expectedHead) throw gitPrecondition("HEAD does not match the required exact commit.");
  return expectedHead;
}

export async function inspectGitOperationState(root: string): Promise<string[]> {
  const directory = path.resolve(root, (await runRefGit(root, ["rev-parse", "--git-dir"])).stdout.trim());
  return ["MERGE_HEAD", "CHERRY_PICK_HEAD", "REVERT_HEAD", "sequencer", "rebase-merge", "rebase-apply"].filter((name) => fs.existsSync(path.join(directory, name)));
}

export async function assertNoGitOperation(root: string): Promise<void> {
  if ((await inspectGitOperationState(root)).length) throw gitPrecondition("Finish or abort the existing Git operation first.");
}

export async function gitConflictPaths(root: string): Promise<{ conflictingPaths: string[]; truncated: boolean }> {
  const paths = (await runRefGit(root, ["diff", "--name-only", "--diff-filter=U", "-z"])).stdout.split("\0").filter(Boolean);
  return { conflictingPaths: paths.slice(0, 256).map((entry) => entry.slice(0, 4096)), truncated: paths.length > 256 || paths.some((entry) => entry.length > 4096) };
}

/** Shared bounded checkout evidence for application and MCP integration candidates. */
export async function inspectGitCheckout(root: string) {
  const conflicts = await gitConflictPaths(root);
  if (conflicts.truncated || conflicts.conflictingPaths.some((entry) => /[\r\n]/.test(entry))) throw gitPrecondition("Conflict evidence exceeds the bounded path limit.");
  const status = await runRefGit(root, ["status", "--porcelain=v1", "-z", "--untracked-files=all"]);
  return { commit: await readHead(root), conflictingPaths: conflicts.conflictingPaths, clean: status.stdout.length === 0 };
}

export async function resolveGitTransformCommit(root: string, input: { commit: string; mainline?: number }) {
  const revision = validateRevision(input.commit, "commit");
  if (/\.\.|[\s:^]/.test(revision)) throw gitPrecondition("Select one commit or ref, without ranges or revision-list expressions.");
  const commit = await resolveCommit(root, revision);
  const parents = (await runRefGit(root, ["show", "--no-patch", "--format=%P", commit])).stdout.trim().split(/\s+/).filter(Boolean);
  if (parents.length > 1) {
    if (!Number.isSafeInteger(input.mainline) || input.mainline! < 1 || input.mainline! > parents.length) throw gitPrecondition("Merge commits require an explicit valid mainline parent.");
  } else if (input.mainline !== undefined) throw gitPrecondition("Mainline is only valid for a merge commit.");
  return { commit, mainline: input.mainline };
}

export async function amendGitCommit(root: string, input: { expectedHead: string; message?: string }) {
  await currentBranch(root);
  await assertNoGitOperation(root);
  const previousCommit = await assertExpectedGitHead(root, input.expectedHead);
  const message = input.message === undefined ? undefined : validateCommitMessage(input.message);
  const priorMessage = (await runRefGit(root, ["show", "--no-patch", "--format=%B", previousCommit])).stdout;
  const priorTree = (await runRefGit(root, ["rev-parse", `${previousCommit}^{tree}`])).stdout.trim();
  const tree = (await runRefGit(root, ["write-tree"])).stdout.trim();
  if (tree === priorTree && (message === undefined || message.trim() === priorMessage.trim())) throw gitPrecondition("Amend requires a changed message or staged tree.");
  await assertExpectedGitHead(root, previousCommit);
  await runRefGit(root, ["commit", "--amend", "--no-gpg-sign", ...(message === undefined ? ["--no-edit"] : ["--message", message])]);
  return { previousCommit, commit: await readHead(root) };
}

export async function transformGitCommit(root: string, operation: "revert" | "cherry-pick", input: { commit: string; expectedHead: string; mainline?: number }) {
  await currentBranch(root);
  await assertNoGitOperation(root);
  await assertCleanRepository(root);
  const source = await resolveGitTransformCommit(root, input);
  const previousCommit = await assertExpectedGitHead(root, input.expectedHead);
  try {
    await runRefGit(root, ["-c", "rerere.enabled=false", operation, "--no-edit", "--no-gpg-sign", ...(source.mainline === undefined ? [] : ["--mainline", String(source.mainline)]), source.commit]);
    const commit = await readHead(root);
    if (commit === previousCommit || (await inspectGitOperationState(root)).length) throw gitPrecondition("Commit transform did not finish with one new commit.");
    return { sourceCommit: source.commit, previousCommit, commit };
  } catch {
    let evidence: { conflictingPaths: string[]; truncated: boolean } = { conflictingPaths: [], truncated: true };
    try { evidence = await gitConflictPaths(root); } catch { /* Always attempt rollback even when evidence exceeds output bounds. */ }
    let rolledBack = false;
    try {
      if ((await inspectGitOperationState(root)).length) await runRefGit(root, [operation, "--abort"]);
      await assertExpectedGitHead(root, previousCommit);
      await assertCleanRepository(root);
      await assertNoGitOperation(root);
      rolledBack = true;
    } catch { /* Explicit residual-state receipt below. */ }
    throw new AgentHarnessError("GIT_EXECUTION_FAILED", rolledBack ? "Commit transform failed and was rolled back to the original clean HEAD." : "Commit transform failed; rollback could not be verified. Residual operation state may remain.", { ...evidence, previousCommit, rolledBack, residualOperationState: !rolledBack });
  }
}

export const revertGitCommit = (root: string, input: Parameters<typeof transformGitCommit>[2]) => transformGitCommit(root, "revert", input);
export const cherryPickGitCommit = (root: string, input: Parameters<typeof transformGitCommit>[2]) => transformGitCommit(root, "cherry-pick", input);

export async function commitGitChanges(root: string, message: string, expectedHead?: string): Promise<{
  commit: string;
  message: string;
}> {
  const commitMessage = validateCommitMessage(message);
  if (expectedHead !== undefined) await assertExpectedGitHead(root, expectedHead);
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
  if (expectedHead !== undefined) await assertExpectedGitHead(root, expectedHead);
  await runBoundedGit({ cwd: root, args: ["commit", "--message", commitMessage] });
  return { commit: await readHead(root), message: commitMessage };
}

export async function pushGitBranch(root: string, input: {
  remote?: string;
  branch?: string;
  expectedCommit?: string;
  remoteBranch?: string;
  setUpstream?: boolean;
} = {}): Promise<{
  remote: string;
  branch: string;
  commit: string;
  remoteBranch?: string;
  upstream?: string;
}> {
  const remote = await assertConfiguredRemote(root, input.remote ?? "origin");
  const branch = input.branch ?? await currentBranch(root);
  await assertValidLocalBranchName(root, branch);
  if (!await localBranchExists(root, branch)) {
    throw gitPrecondition(`Local branch not found: ${branch}.`);
  }
  const commit = await resolveCommit(root, `refs/heads/${branch}`);
  if (input.expectedCommit !== undefined && (!/^[a-f0-9]{40,64}$/.test(input.expectedCommit) || commit !== input.expectedCommit)) {
    throw gitPrecondition("Branch changed before exact-commit synchronization.");
  }
  const remoteBranch = input.remoteBranch ?? branch;
  await assertValidBranchRefName(root, remoteBranch, "remoteBranch");
  if (input.setUpstream !== undefined && typeof input.setUpstream !== "boolean") {
    throw new AgentHarnessError("INVALID_INPUT", "setUpstream must be a boolean.");
  }
  // Ordinary pushes retain support for configured push destinations distinct from fetch.
  if (input.setUpstream) await assertSingleRemoteDestination(root, remote);
  await runRefGit(root, ["push", "--no-follow-tags", "--no-mirror", "--", remote, `${commit}:refs/heads/${remoteBranch}`]);
  if (input.setUpstream) {
    await setGitBranchUpstream(root, { branchName: branch, remote, remoteBranch });
  }
  return { remote, branch, commit,
    ...(input.remoteBranch !== undefined ? { remoteBranch } : {}),
    ...(input.setUpstream ? { upstream: `${remote}/${remoteBranch}` } : {}),
  };
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
