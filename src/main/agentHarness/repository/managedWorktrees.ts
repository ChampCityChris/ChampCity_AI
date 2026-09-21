import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { AgentHarnessError } from "../core/errors";
import { runBoundedGit } from "./boundedGit";
import { createGitBranchFromRef, inspectGitBranchState, inspectGitHistory, inspectGitChangedFiles } from "./gitMutations";
import type { AgentHarnessWorkspaceContext } from "../workspace/workspaceAccess";

export interface ManagedWorkspaceStore {
  registerManaged(root: string, commonDirectory: string, checkoutName: string): Promise<unknown>;
  unregister(workspaceId: string): unknown;
  resolve(workspaceId: unknown): Promise<AgentHarnessWorkspaceContext>;
}
const fail = (message: string) => new AgentHarnessError("GIT_EXECUTION_FAILED", message);
export async function managedGit(root: string, args: string[]) {
  const result = await runBoundedGit({ cwd: root, args, rejectNonZero: false });
  if (result.exitCode !== 0) throw fail("Managed Git operation failed; inspect checkout state before retrying.");
  return result.stdout;
}
export async function commonGitDirectory(root: string) {
  const raw = (await managedGit(root, ["rev-parse", "--git-common-dir"])).trim();
  return fs.realpathSync(path.resolve(root, raw));
}
export function managedWorkspaceId(commonDirectory: string, checkoutName: string) {
  const key = process.platform === "win32" ? commonDirectory.toLowerCase() : commonDirectory;
  return `mcp_worktree_${createHash("sha256").update(key + "\0" + checkoutName).digest("hex")}`;
}
function safeDirectory(directory: string) {
  try {
    const stat = fs.lstatSync(directory);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw fail("Managed worktree storage must not be redirected.");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}
export function managedCheckoutPath(commonDirectory: string, checkoutName: string) {
  if (!/^[a-z][a-z0-9-]{0,63}$/.test(checkoutName) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/.test(checkoutName)) throw fail("Invalid managed checkout name.");
  const base = path.join(commonDirectory, "champcity-mcp-worktrees");
  const checkout = path.join(base, checkoutName);
  for (const directory of [commonDirectory, base, checkout]) safeDirectory(directory);
  return checkout;
}
async function records(root: string) {
  const raw = await managedGit(root, ["worktree", "list", "--porcelain", "-z"]);
  const result = raw.split("\0\0").filter(Boolean).map((record, index) => {
    const fields = record.split("\0");
    return { primary: index === 0, root: fields.find((field) => field.startsWith("worktree "))?.slice(9) ?? "",
      branchName: fields.find((field) => field.startsWith("branch refs/heads/"))?.slice(18) ?? null,
      headCommit: fields.find((field) => field.startsWith("HEAD "))?.slice(5) ?? null };
  });
  if (result.length > 256 || result.some((entry) => !path.isAbsolute(entry.root))) throw fail("Invalid or excessive worktree inventory.");
  return result;
}
export async function verifyManagedCheckout(root: string, commonDirectory: string, checkoutName: string) {
  const expected = managedCheckoutPath(commonDirectory, checkoutName);
  if (path.resolve(root) !== expected || fs.realpathSync(root) !== expected) throw fail("Managed worktree location changed.");
  const metadata = fs.lstatSync(path.join(root, ".git"));
  if (!metadata.isFile() || metadata.isSymbolicLink()) throw fail("Managed checkout metadata must be an ordinary linked-worktree file.");
  if (await commonGitDirectory(root) !== commonDirectory) throw fail("Managed worktree repository changed.");
  const top = (await managedGit(root, ["rev-parse", "--show-toplevel"])).trim();
  if (fs.realpathSync(top) !== expected) throw fail("Managed checkout identity changed.");
  const record = (await records(root)).find((entry) => path.resolve(entry.root) === expected);
  if (!record || record.primary) throw fail("Managed linked worktree registration is missing.");
  return record;
}
export async function resolveManagedCheckout(root: string, workspaceId: string, store: ManagedWorkspaceStore) {
  const commonDirectory = await commonGitDirectory(root);
  const context = await store.resolve(workspaceId);
  const checkoutName = path.basename(context.root);
  if (workspaceId !== managedWorkspaceId(commonDirectory, checkoutName)) throw fail("Workspace is not managed by this repository.");
  const record = await verifyManagedCheckout(context.root, commonDirectory, checkoutName);
  return { ...record, root: context.root, workspaceId, commonDirectory, checkoutName };
}
export async function inspectManagedWorktree(root: string, workspaceId: string, store: ManagedWorkspaceStore) {
  const state = await resolveManagedCheckout(root, workspaceId, store);
  const clean = !(await managedGit(state.root, ["status", "--porcelain=v1", "-z", "--untracked-files=all"]));
  return { workspaceId, branchName: state.branchName, headCommit: state.headCommit, clean, managed: true };
}
export async function listManagedWorktrees(root: string, store: ManagedWorkspaceStore) {
  const common = await commonGitDirectory(root);
  const inventory = await records(root);
  return Promise.all(inventory.map(async (entry) => {
    let workspaceId: string | null = null;
    const candidateId = managedWorkspaceId(common, path.basename(entry.root));
    try { const managed = await resolveManagedCheckout(root, candidateId, store); if (path.resolve(entry.root) === managed.root) workspaceId = candidateId; } catch { /* Unmanaged or unavailable. */ }
    return { primary: entry.primary, branchName: entry.branchName, headCommit: entry.headCommit, managed: workspaceId !== null, workspaceId };
  }));
}
const locks = new Map<string, Promise<unknown>>();
export async function withManagedRepositoryLock<T>(root: string, operation: () => Promise<T>): Promise<T> {
  const common = await commonGitDirectory(root);
  const previous = locks.get(common) ?? Promise.resolve();
  const next = previous.catch(() => {}).then(operation);
  locks.set(common, next);
  try { return await next; } finally { if (locks.get(common) === next) locks.delete(common); }
}
export async function createManagedWorktree(root: string, input: { checkoutName: string; branchName: string; sourceRef?: string }, store: ManagedWorkspaceStore) {
  return withManagedRepositoryLock(root, async () => {
    const common = await commonGitDirectory(root);
    const checkout = managedCheckoutPath(common, input.checkoutName);
    if (fs.existsSync(checkout)) throw fail("Managed checkout already exists.");
    if (!input.branchName || input.branchName.startsWith("-") || input.branchName.length > 240 || /[\s\0]/.test(input.branchName)) throw fail("Invalid branch name.");
    await managedGit(root, ["check-ref-format", `refs/heads/${input.branchName}`]);
    const state = await inspectGitBranchState(root);
    const branch = state.branches.find((entry) => entry.name === input.branchName);
    if (input.sourceRef !== undefined && branch) throw fail("Target branch already exists.");
    if (input.sourceRef === undefined && !branch) throw fail("Existing branch is required.");
    if ((await records(root)).some((entry) => entry.branchName === input.branchName)) throw fail("Branch is already checked out.");
    const sourceCommit = (await inspectGitHistory(root, { ref: input.sourceRef ?? `refs/heads/${input.branchName}`, maxCount: 1 })).resolvedCommit;
    const workspaceId = managedWorkspaceId(common, input.checkoutName);
    fs.mkdirSync(path.dirname(checkout), { recursive: true });
    let created = false;
    let branchCreated = false;
    try {
      if (input.sourceRef !== undefined) {
        await createGitBranchFromRef(root, { branchName: input.branchName, sourceRef: sourceCommit });
        branchCreated = true;
      }
      await managedGit(root, ["worktree", "add", checkout, input.branchName]);
      created = true;
      const record = await verifyManagedCheckout(checkout, common, input.checkoutName);
      if (record.branchName !== input.branchName || record.headCommit !== sourceCommit) throw fail("Worktree endpoint changed during creation.");
      await store.registerManaged(checkout, common, input.checkoutName);
      return { workspaceId, branchName: input.branchName, sourceCommit, headCommit: record.headCommit };
    } catch (error) {
      if (created) {
        await verifyManagedCheckout(checkout, common, input.checkoutName);
        await managedGit(root, ["worktree", "remove", "--force", checkout]);
      }
      if (branchCreated && !(await records(root)).some((entry) => entry.branchName === input.branchName)) await managedGit(root, ["update-ref", "--no-deref", "-d", `refs/heads/${input.branchName}`, sourceCommit]);
      throw error;
    }
  });
}
export async function removeManagedWorktree(root: string, input: { workspaceId: string; expectedBranch: string }, store: ManagedWorkspaceStore) {
  return withManagedRepositoryLock(root, async () => {
    const state = await resolveManagedCheckout(root, input.workspaceId, store);
    if (path.resolve(root) === state.root || state.branchName !== input.expectedBranch) throw fail("Removal requires another managed checkout at the expected branch.");
    if (!(await inspectManagedWorktree(root, input.workspaceId, store)).clean) throw fail("Dirty managed worktree cannot be removed.");
    // Unregister first so a crash never leaves a registered nonexistent workspace.
    store.unregister(input.workspaceId);
    try { await managedGit(root, ["worktree", "remove", state.root]); }
    catch (error) { await store.registerManaged(state.root, state.commonDirectory, state.checkoutName); throw error; }
    return { workspaceId: input.workspaceId, removed: true, branchName: state.branchName, headCommit: state.headCommit };
  });
}

export async function discardManagedWorktree(root: string, input: { workspaceId: string; expectedBranch: string; confirmDiscard: boolean }, store: ManagedWorkspaceStore) {
  if (input.confirmDiscard !== true) throw fail("Managed worktree discard requires confirmDiscard=true.");
  return withManagedRepositoryLock(root, async () => {
    const state = await resolveManagedCheckout(root, input.workspaceId, store);
    if (path.resolve(root) === state.root || state.branchName !== input.expectedBranch) throw fail("Discard requires another managed checkout at the exact expected branch.");
    const changedFiles = await inspectGitChangedFiles(state.root);
    const ignoredPaths = (await managedGit(state.root, ["ls-files", "--others", "--ignored", "--exclude-standard", "-z"])).split("\0").filter(Boolean);
    if (changedFiles.length > 256 || ignoredPaths.length > 256) throw fail("Discard evidence exceeds the bounded path limit.");
    store.unregister(input.workspaceId);
    try { await managedGit(root, ["worktree", "remove", "--force", state.root]); }
    catch (error) { await store.registerManaged(state.root, state.commonDirectory, state.checkoutName); throw error; }
    return { workspaceId: input.workspaceId, discarded: true, branchName: state.branchName, headCommit: state.headCommit, changedFiles, ignoredPaths };
  });
}
