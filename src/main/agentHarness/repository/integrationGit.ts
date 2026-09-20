import fs from "node:fs";
import path from "node:path";
import { AgentHarnessError } from "../core/errors";
import { runBoundedGit } from "./boundedGit";
import { inspectGitBranchState, inspectGitHistory } from "./gitMutations";

const fail = (message: string) => new AgentHarnessError("GIT_EXECUTION_FAILED", message);
const exact = (commit: string) => { if (!/^[a-f0-9]{40,64}$/.test(commit)) throw fail("Integration requires an exact commit."); return commit; };
export function integrationPaths(root: string, candidateId: string) {
  if (!/^[a-f0-9]{64}$/.test(candidateId)) throw fail("Invalid integration candidate identity.");
  // Keep every temporary write inside the selected repository. Linked checkouts must select their owning primary repository for integration.
  const gitDirectory = path.join(root, ".git");
  if (!fs.lstatSync(gitDirectory).isDirectory() || fs.lstatSync(gitDirectory).isSymbolicLink()) throw fail("Integration requires the primary repository checkout.");
  const base = path.join(gitDirectory, "champcity-integration", candidateId);
  for (const entry of [path.dirname(base), base, path.join(base, "checkout")]) {
    if (fs.existsSync(entry) && fs.lstatSync(entry).isSymbolicLink()) throw fail("Integration storage must not be redirected.");
  }
  return { base, checkout: path.join(base, "checkout"), record: path.join(base, "CANDIDATE.md"), branch: `champcity-integration/${candidateId}` };
}
async function commitAt(root: string, ref: string) {
  return (await inspectGitHistory(root, { ref, maxCount: 1 })).resolvedCommit;
}
async function ancestor(root: string, before: string, after: string) {
  return (await inspectGitHistory(root, { ancestor: exact(before), descendant: exact(after), maxCount: 1 })).ancestry!.isAncestor;
}
export async function inspectIntegrationTarget(root: string, input: { baseCommit: string; incomingBranch: string; targetBranch: string; remote?: string }) {
  const incoming = await inspectGitBranchState(root, input.incomingBranch);
  const target = await inspectGitBranchState(root, input.targetBranch);
  if (input.incomingBranch === input.targetBranch || !incoming.selectedBranch || !target.selectedBranch) throw fail("Integration requires distinct existing incoming and target branches.");
  const localTargetCommit = target.selectedBranch.commit;
  let targetCommit = localTargetCommit;
  if (input.remote) {
    if (!incoming.remotes.includes(input.remote) || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(input.remote)) throw fail("Integration requires one configured remote.");
    const fetched = await commitAt(root, `refs/remotes/${input.remote}/${input.targetBranch}`);
    if (await ancestor(root, localTargetCommit, fetched)) targetCommit = fetched;
    else if (!await ancestor(root, fetched, localTargetCommit)) throw fail("Local and remote target diverged; reconcile target policy before integration.");
  }
  const incomingCommit = incoming.selectedBranch.commit;
  if (!await ancestor(root, input.baseCommit, incomingCommit) || !await ancestor(root, input.baseCommit, targetCommit)) throw fail("Integration refs no longer descend from the Intake base.");
  const bases = (await runBoundedGit({ cwd: root, args: ["merge-base", "--all", incomingCommit, targetCommit] })).stdout.trim().split(/\s+/);
  if (bases.length !== 1) throw fail("Integration requires one unambiguous merge base.");
  return { incomingCommit, localTargetCommit, targetCommit, mergeBase: exact(bases[0]) };
}
export async function registeredIntegrationCheckout(root: string, candidateId: string) {
  const paths = integrationPaths(root, candidateId);
  const listing = (await runBoundedGit({ cwd: root, args: ["worktree", "list", "--porcelain", "-z"] })).stdout;
  const records = listing.split("\0\0").map((entry) => entry.split("\0"));
  const owned = records.find((entry) => entry.includes(`branch refs/heads/${paths.branch}`));
  if (!owned || !owned.some((entry) => entry.startsWith("worktree ") && path.resolve(entry.slice(9)) === path.resolve(paths.checkout))) throw fail("Integration checkout ownership could not be verified.");
  const actual = (await runBoundedGit({ cwd: paths.checkout, args: ["rev-parse", "--show-toplevel"] })).stdout.trim();
  if (fs.realpathSync(actual) !== fs.realpathSync(paths.checkout)) throw fail("Integration checkout identity changed.");
  const common = (await runBoundedGit({ cwd: paths.checkout, args: ["rev-parse", "--git-common-dir"] })).stdout.trim();
  if (fs.realpathSync(path.resolve(paths.checkout, common)) !== fs.realpathSync(path.join(root, ".git"))) throw fail("Integration checkout no longer belongs to the selected repository.");
  return paths;
}
export async function createIntegrationCheckout(root: string, input: { candidateId: string; targetCommit: string }) {
  const paths = integrationPaths(root, input.candidateId);
  exact(input.targetCommit);
  if (fs.existsSync(paths.checkout)) throw fail("Integration checkout already exists; resume or abort its recorded candidate.");
  fs.mkdirSync(paths.base, { recursive: true });
  await runBoundedGit({ cwd: root, args: ["worktree", "add", "-b", paths.branch, paths.checkout, input.targetCommit] });
  await registeredIntegrationCheckout(root, input.candidateId);
  return { branch: paths.branch, commit: input.targetCommit };
}
export async function inspectIntegrationCheckout(root: string, candidateId: string) {
  const paths = await registeredIntegrationCheckout(root, candidateId);
  const commit = await commitAt(paths.checkout, "HEAD");
  const conflictingPaths = (await runBoundedGit({ cwd: paths.checkout, args: ["diff", "--name-only", "--diff-filter=U", "-z"] })).stdout.split("\0").filter(Boolean);
  if (conflictingPaths.length > 256 || conflictingPaths.some((entry) => /[\r\n]/.test(entry) || entry.length > 4096)) throw fail("Conflict evidence exceeds the bounded path limit.");
  const status = (await runBoundedGit({ cwd: paths.checkout, args: ["status", "--porcelain=v1", "-z", "--untracked-files=all"] })).stdout;
  return { commit, conflictingPaths, clean: status.length === 0 };
}
export async function mergeIntegrationCheckout(root: string, input: { candidateId: string; incomingCommit: string; targetCommit: string }) {
  const paths = await registeredIntegrationCheckout(root, input.candidateId);
  const before = await inspectIntegrationCheckout(root, input.candidateId);
  if (!before.clean || before.commit !== exact(input.targetCommit)) throw fail("Candidate must be clean at its exact target before merge.");
  const merged = await runBoundedGit({ cwd: paths.checkout, args: ["-c", "rerere.enabled=false", "merge", "--no-edit", "--no-stat", "--no-gpg-sign", exact(input.incomingCommit)], rejectNonZero: false });
  const state = await inspectIntegrationCheckout(root, input.candidateId);
  if (merged.exitCode !== 0 && !state.conflictingPaths.length) throw fail("Mechanical integration failed without resolvable conflict evidence; candidate retained.");
  return state;
}
export async function advanceIntegrationTarget(root: string, input: { candidateId: string; candidateCommit: string; targetBranch: string; localTargetCommit: string; incomingBranch: string; incomingCommit: string }) {
  const candidate = await inspectIntegrationCheckout(root, input.candidateId);
  if (!candidate.clean || candidate.commit !== exact(input.candidateCommit)) throw fail("Validated candidate source changed before integration.");
  const target = await inspectGitBranchState(root, input.targetBranch);
  const incoming = await inspectGitBranchState(root, input.incomingBranch);
  if (target.selectedBranch?.commit !== exact(input.localTargetCommit) || incoming.selectedBranch?.commit !== exact(input.incomingCommit)) throw fail("Integration refs changed; construct a fresh candidate.");
  const worktrees = (await runBoundedGit({ cwd: root, args: ["worktree", "list", "--porcelain", "-z"] })).stdout.split("\0");
  if (worktrees.includes(`branch refs/heads/${input.targetBranch}`)) throw fail("Target is checked out in another context; release that checkout before advancing it.");
  if (!await ancestor(root, input.localTargetCommit, input.candidateCommit) || !await ancestor(root, input.incomingCommit, input.candidateCommit)) throw fail("Candidate does not preserve both accepted histories.");
  await runBoundedGit({ cwd: root, args: ["update-ref", "--no-deref", `refs/heads/${input.targetBranch}`, input.candidateCommit, input.localTargetCommit] });
  return { commit: await commitAt(root, `refs/heads/${input.targetBranch}`) };
}
export async function abortIntegrationCheckout(root: string, candidateId: string) {
  const paths = integrationPaths(root, candidateId);
  if (fs.existsSync(paths.checkout)) {
    await registeredIntegrationCheckout(root, candidateId);
    // Explicit abort discards only this machine-owned temporary checkout, including unresolved merge state.
    await runBoundedGit({ cwd: root, args: ["worktree", "remove", "--force", paths.checkout] });
  }
  const state = await inspectGitBranchState(root);
  const branch = state.branches.find((entry) => entry.name === paths.branch);
  if (branch) {
    const worktrees = (await runBoundedGit({ cwd: root, args: ["worktree", "list", "--porcelain", "-z"] })).stdout.split("\0");
    if (worktrees.includes(`branch refs/heads/${paths.branch}`)) throw fail("Candidate branch is still checked out; cleanup stopped.");
    await runBoundedGit({ cwd: root, args: ["update-ref", "--no-deref", "-d", `refs/heads/${paths.branch}`, branch.commit] });
  }
  return { cleaned: true };
}
