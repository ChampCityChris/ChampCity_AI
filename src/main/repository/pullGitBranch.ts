import { AgentHarnessError } from "../core/applicationErrors";
import { runBoundedGit } from "../core/gitExecution";
import { assertValidLocalBranchName, inspectGitBranchState, inspectGitCheckout, assertNoGitOperation, advanceGitBranchRef } from "./gitMutations";
import { inspectGitRemoteRefs } from "./gitRemoteManagement";
import { beginIsolatedOperation, advanceIsolatedOperation } from "./isolatedGitOperations";
import type { ManagedWorkspaceStore } from "./managedWorktrees";

const fail = (message: string) => new AgentHarnessError("GIT_EXECUTION_FAILED", message);
export async function pullGitBranch(root: string, input: {
  branchName: string; remote: string; remoteBranch: string; expectedLocalCommit: string; expectedRemoteCommit?: string; strategy: "ff-only" | "merge" | "rebase";
}, store?: ManagedWorkspaceStore) {
  if (!["ff-only", "merge", "rebase"].includes(input.strategy) || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(input.expectedLocalCommit) ||
    input.expectedRemoteCommit !== undefined && !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(input.expectedRemoteCommit)) throw fail("Pull requires exact commit IDs and a supported strategy.");
  await assertValidLocalBranchName(root, input.branchName);
  await assertValidLocalBranchName(root, input.remoteBranch);
  await assertNoGitOperation(root);
  const target = await inspectGitBranchState(root, input.branchName);
  if (target.selectedBranch?.commit !== input.expectedLocalCommit) throw fail("Local branch changed before synchronization.");
  if (target.currentBranch === input.branchName && !(await inspectGitCheckout(root)).clean) throw fail("Synchronization requires a clean target checkout.");
  const ref = `refs/heads/${input.remoteBranch}`;
  const remote = await inspectGitRemoteRefs(root, { remote: input.remote, refClass: "branches", pattern: ref });
  const advertised = remote.refs.find(entry => entry.ref === ref)?.objectId;
  if (!advertised || remote.refs.length !== 1 || input.expectedRemoteCommit !== undefined && advertised !== input.expectedRemoteCommit) throw fail("Remote branch is missing, ambiguous or changed before synchronization.");
  // Exact refspec avoids unrelated branches, tags, pruning and configured fetch refspecs.
  const trackingRef = `refs/remotes/${input.remote}/${input.remoteBranch}`;
  await runBoundedGit({ cwd: root, args: ["fetch", "--no-tags", "--no-prune", "--", input.remote, `+${ref}:${trackingRef}`] });
  const fetched = (await runBoundedGit({ cwd: root, args: ["rev-parse", "--verify", `${trackingRef}^{commit}`] })).stdout.trim();
  if (fetched !== advertised) throw fail("Remote changed during fetch; local branch was preserved.");
  if ((await inspectGitBranchState(root, input.branchName)).selectedBranch?.commit !== input.expectedLocalCommit) throw fail("Local branch changed during fetch.");
  const ancestor = async (left: string, right: string) => {
    const result = await runBoundedGit({ cwd: root, args: ["merge-base", "--is-ancestor", left, right], rejectNonZero: false });
    if (result.exitCode !== 0 && result.exitCode !== 1) throw fail("Pull ancestry could not be determined.");
    return result.exitCode === 0;
  };
  if (await ancestor(advertised, input.expectedLocalCommit)) return { state: "up-to-date", branchName: input.branchName, commit: input.expectedLocalCommit, remoteCommit: advertised };
  if (await ancestor(input.expectedLocalCommit, advertised)) {
    if (target.currentBranch === input.branchName) {
      if (!(await inspectGitCheckout(root)).clean) throw fail("Target checkout changed during fetch.");
      await runBoundedGit({ cwd: root, args: ["merge", "--ff-only", advertised] });
    } else await advanceGitBranchRef(root, { branchName: input.branchName, sourceRef: advertised, expectedCurrentCommit: input.expectedLocalCommit });
    return { state: "advanced", branchName: input.branchName, previousCommit: input.expectedLocalCommit, commit: advertised, remoteCommit: advertised };
  }
  if (input.strategy === "ff-only") throw fail("Branches diverged; ff-only synchronization preserved the local branch.");
  if (!store) throw fail("Isolated Git recovery is unavailable for this target.");
  const recoveryStore = { ...store, advanceCurrentTarget: true };
  const operation = await beginIsolatedOperation(root, { operation: input.strategy, targetBranch: input.branchName, sourceRef: advertised, expectedTargetCommit: input.expectedLocalCommit }, recoveryStore);
  if (operation.state === "ready" && operation.candidateCommit) {
    return advanceIsolatedOperation(root, { operationId: operation.operationId, expectedTargetCommit: input.expectedLocalCommit, expectedCandidateCommit: operation.candidateCommit }, recoveryStore);
  }
  return { ...operation, continueAction: "continue_isolated_operation", abortAction: "abort_isolated_operation", advanceAction: "advance_isolated_operation" };
}
