import { skipIsolatedOperationStep, beginIsolatedOperation, inspectIsolatedOperation, continueIsolatedOperation, abortIsolatedOperation, advanceIsolatedOperation } from "../agentHarness/repository/isolatedGitOperations";
import { discardManagedWorktree, type ManagedWorkspaceStore } from "../agentHarness/repository/managedWorktrees";
import fs from "node:fs";
import path from "node:path";
import { AgentHarnessError } from "../agentHarness/core/errors";
import { runBoundedGit, isGitWorkTree } from "../agentHarness/repository/boundedGit";
import {
  inspectGitReflog, replaceGitBranchRef, pushGitWithLease, deleteGitUntrackedPaths,
  inspectGitDiff, inspectGitChangedFiles, inspectGitCommit, compareGitRefs, listGitTags, inspectGitRemotes, unstageGitChanges, restoreGitFiles,
  createGitBranchFromRef, advanceGitBranchRef, renameGitBranch, setGitBranchUpstream, unsetGitBranchUpstream, deleteGitRemoteBranch,
  amendGitCommit, revertGitCommit, cherryPickGitCommit,
  commitGitChanges, deleteGitBranch, fastForwardGitBranch, fetchGitRemote,
  inspectGitBranchState, inspectGitHistory, prepareGitBranch, pushGitBranch,
  stageGitChanges, switchGitBranch,
} from "../agentHarness/repository/gitMutations";
import { gitDiff, gitStatus, preCommitSafetyScan } from "../agentHarness/repository/repositoryOperations";
import { abortIntegrationCheckout, advanceIntegrationTarget, createIntegrationCheckout, inspectIntegrationCheckout, inspectIntegrationTarget, mergeIntegrationCheckout } from "../agentHarness/repository/integrationGit";
import { commitIntegrationRepair, integrationRepairDiffs, snapshotIntegrationRepair } from "../agentHarness/repository/integrationRepairGit";
import type {
  SourceControlOperation, SourceControlPosition,
  SourceControlReceipt, SourceControlResult,
} from "../../shared/sourceControlContracts";

/** Called by trusted main-process services with a selected repository, without MCP/model mediation. */
export function createSourceControlService(binding: { repositoryId: string; repositoryRoot: string; managedWorkspaces?: ManagedWorkspaceStore }) {
  const repositoryId = binding.repositoryId;
  const root = path.resolve(binding.repositoryRoot);

  async function verifyRepository(): Promise<void> {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(repositoryId)) {
      throw new AgentHarnessError("INVALID_INPUT", "A bounded repository identity is required.");
    }
    if (!await isGitWorkTree(root)) {
      throw new AgentHarnessError("GIT_CAPABILITY_UNAVAILABLE", "The selected repository is not Git-backed.");
    }
    const topLevel = (await runBoundedGit({ cwd: root, args: ["rev-parse", "--show-toplevel"] })).stdout.trim();
    const [selected, actual] = await Promise.all([
      fs.promises.realpath(root), fs.promises.realpath(topLevel),
    ]);
    if (selected !== actual) {
      throw new AgentHarnessError("WORKSPACE_ACCESS_DENIED", "Source control requires the exact selected repository root.");
    }
  }

  async function position(): Promise<SourceControlPosition> {
    const state = await inspectGitBranchState(root);
    return { branch: state.currentBranch, commit: state.head };
  }

  async function run<T>(
    operation: SourceControlOperation,
    mutate: boolean,
    execute: () => Promise<T>,
  ): Promise<SourceControlResult<T>> {
    const receipt: SourceControlReceipt = {
      repositoryId, operation, startedAt: new Date().toISOString(), completedAt: "",
      before: null, after: null,
    };
    let phase: "precondition" | "operation" | "receipt" = "precondition";
    let completedResult: T | undefined;
    try {
      await verifyRepository();
      receipt.before = await position();
      phase = "operation";
      completedResult = await execute();
      phase = "receipt";
      receipt.after = await position();
      receipt.completedAt = new Date().toISOString();
      return { ok: true, receipt, result: completedResult };
    } catch (error) {
      receipt.completedAt = new Date().toISOString();
      return {
        ok: false, receipt,
        error: {
          code: error instanceof AgentHarnessError ? error.code : "RUNTIME_ERROR",
          // Raw process diagnostics may contain local paths or remote credentials; omit them.
          message: error instanceof AgentHarnessError
            ? error.message.replaceAll(root, "<PROJECT_REPO>").replace(/[\r\n]+/g, " ").slice(0, 1000)
            : "Source-control operation could not complete.",
          ...(error instanceof AgentHarnessError && typeof error.details?.rolledBack === "boolean" ? {
            recovery: { rolledBack: error.details.rolledBack, residualOperationState: error.details.residualOperationState === true,
              conflictingPaths: Array.isArray(error.details.conflictingPaths) ? error.details.conflictingPaths.filter((value): value is string => typeof value === "string").slice(0, 256) : [] }
          } : {}),
          phase,
          mutationMayHaveOccurred: mutate && phase !== "precondition",
        },
        ...(phase === "receipt" ? { completedResult } : {}),
      };
    }
  }

  const managedStore = () => {
    if (!binding.managedWorkspaces) throw new AgentHarnessError("WORKSPACE_UNAVAILABLE", "Managed workspace registration is unavailable.");
    return binding.managedWorkspaces;
  };
  const changedFiles = () => inspectGitChangedFiles(root);

  return {
    inspectReflog: (input: Parameters<typeof inspectGitReflog>[1] = {}) => run("inspect-reflog", false, () => inspectGitReflog(root, input)),
    replaceBranchRef: (input: Parameters<typeof replaceGitBranchRef>[1]) => run("replace-branch-ref", true, () => replaceGitBranchRef(root, input)),
    pushWithLease: (input: Parameters<typeof pushGitWithLease>[1]) => run("push-with-lease", true, () => pushGitWithLease(root, input)),
    deleteUntrackedPaths: (paths: string[]) => run("delete-untracked-paths", true, () => deleteGitUntrackedPaths(root, paths)),
    discardManagedWorktree: (input: Parameters<typeof discardManagedWorktree>[1]) => run("discard-managed-worktree", true, () => discardManagedWorktree(root, input, managedStore())),
    skipIsolatedOperationStep: (operationId: string) => run("isolated-skip", true, () => skipIsolatedOperationStep(root, operationId, managedStore())),
    beginIsolatedOperation: (input: Parameters<typeof beginIsolatedOperation>[1]) => run("isolated-begin", true, () => beginIsolatedOperation(root, input, managedStore())),
    inspectIsolatedOperation: (operationId: string) => run("isolated-inspect", false, () => inspectIsolatedOperation(root, operationId, managedStore())),
    continueIsolatedOperation: (operationId: string) => run("isolated-continue", true, () => continueIsolatedOperation(root, operationId, managedStore())),
    abortIsolatedOperation: (operationId: string) => run("isolated-abort", true, () => abortIsolatedOperation(root, operationId, managedStore())),
    advanceIsolatedOperation: (input: Parameters<typeof advanceIsolatedOperation>[1]) => run("isolated-advance", true, () => advanceIsolatedOperation(root, input, managedStore())),
    snapshotIntegrationRepair: (candidateId: string, editablePaths: string[]) => run("integration-repair-snapshot", false, () => snapshotIntegrationRepair(root, candidateId, editablePaths)),
    integrationRepairDiffs: (input: Parameters<typeof integrationRepairDiffs>[1]) => run("integration-repair-diffs", false, () => integrationRepairDiffs(root, input)),
    commitIntegrationRepair: (input: Parameters<typeof commitIntegrationRepair>[1]) => run("integration-repair-commit", true, () => commitIntegrationRepair(root, input)),
    integrationTarget: (input: Parameters<typeof inspectIntegrationTarget>[1]) => run("integration-target", false, () => inspectIntegrationTarget(root, input)),
    createIntegration: (input: Parameters<typeof createIntegrationCheckout>[1]) => run("integration-create", true, () => createIntegrationCheckout(root, input)),
    inspectIntegration: (candidateId: string) => run("integration-inspect", false, () => inspectIntegrationCheckout(root, candidateId)),
    mergeIntegration: (input: Parameters<typeof mergeIntegrationCheckout>[1]) => run("integration-merge", true, () => mergeIntegrationCheckout(root, input)),
    advanceIntegration: (input: Parameters<typeof advanceIntegrationTarget>[1]) => run("integration-advance", true, () => advanceIntegrationTarget(root, input)),
    abortIntegration: (candidateId: string) => run("integration-abort", true, () => abortIntegrationCheckout(root, candidateId)),
    readCommitMessage: (commit: string) => run("commit-message", false, async () => {
      if (!/^[a-f0-9]{40,64}$/.test(commit)) throw new AgentHarnessError("INVALID_INPUT", "An exact commit is required.");
      return (await runBoundedGit({ cwd: root, args: ["show", "--no-patch", "--format=%B", commit] })).stdout;
    }),
    status: () => run("status", false, async () => {
      const status = await gitStatus(root, true);
      return { ...status, clean: status.shortStatus.length === 0 };
    }),
    branches: (branchName?: string) => run("branches", false, () => inspectGitBranchState(root, branchName)),
    history: (input: Parameters<typeof inspectGitHistory>[1] = {}) =>
      run("history", false, () => inspectGitHistory(root, input)),
    diff: () => run("diff", false, async () => ({
      unstaged: (await gitDiff(root, true)).diff,
      staged: (await inspectGitDiff(root, { view: "staged" })).diff,
    })),
    inspectDiff: (input: Parameters<typeof inspectGitDiff>[1] = {}) => run("diff", false, () => inspectGitDiff(root, input)),
    inspectCommit: (input: Parameters<typeof inspectGitCommit>[1]) => run("inspect-commit", false, () => inspectGitCommit(root, input)),
    compareRefs: (input: Parameters<typeof compareGitRefs>[1]) => run("compare-refs", false, () => compareGitRefs(root, input)),
    listTags: () => run("list-tags", false, () => listGitTags(root)),
    inspectRemotes: () => run("inspect-remotes", false, () => inspectGitRemotes(root)),
    unstage: (paths: string[]) => run("unstage", true, () => unstageGitChanges(root, paths)),
    restoreFiles: (input: Parameters<typeof restoreGitFiles>[1]) => run("restore-files", true, () => restoreGitFiles(root, input)),
    changedFiles: () => run("changed-files", false, changedFiles),
    readiness: () => run("readiness", false, async () => {
      const status = await gitStatus(root, true);
      return {
        clean: status.shortStatus.length === 0,
        branchState: await inspectGitBranchState(root),
        changedFiles: await changedFiles(),
        ...(await preCommitSafetyScan(root, true)),
      };
    }),
    createBranchFromRef: (input: Parameters<typeof createGitBranchFromRef>[1]) => run("create-branch-from-ref", true, () => createGitBranchFromRef(root, input)),
    advanceBranchRef: (input: Parameters<typeof advanceGitBranchRef>[1]) => run("advance-branch-ref", true, () => advanceGitBranchRef(root, input)),
    renameBranch: (input: Parameters<typeof renameGitBranch>[1]) => run("rename-branch", true, () => renameGitBranch(root, input)),
    setBranchUpstream: (input: Parameters<typeof setGitBranchUpstream>[1]) => run("set-branch-upstream", true, () => setGitBranchUpstream(root, input)),
    unsetBranchUpstream: (input: Parameters<typeof unsetGitBranchUpstream>[1]) => run("unset-branch-upstream", true, () => unsetGitBranchUpstream(root, input)),
    deleteRemoteBranch: (input: Parameters<typeof deleteGitRemoteBranch>[1]) => run("delete-remote-branch", true, () => deleteGitRemoteBranch(root, input)),
    prepareBranch: (branchName: string) => run("prepare-branch", true, () => prepareGitBranch(root, branchName)),
    switchBranch: (branchName: string) => run("switch-branch", true, () => switchGitBranch(root, branchName)),
    stage: (paths: string[]) => run("stage", true, () => stageGitChanges(root, paths)),
    commit: (message: string, expectedHead?: string) => run("commit", true, () => commitGitChanges(root, message, expectedHead)),
    amendCommit: (input: Parameters<typeof amendGitCommit>[1]) => run("amend-commit", true, () => amendGitCommit(root, input)),
    revertCommit: (input: Parameters<typeof revertGitCommit>[1]) => run("revert-commit", true, () => revertGitCommit(root, input)),
    cherryPickCommit: (input: Parameters<typeof cherryPickGitCommit>[1]) => run("cherry-pick-commit", true, () => cherryPickGitCommit(root, input)),
    fetch: (remote?: string) => run("fetch", true, () => fetchGitRemote(root, remote)),
    push: (input: Parameters<typeof pushGitBranch>[1] = {}) => run("push", true, () => pushGitBranch(root, input)),
    fastForward: (input: Parameters<typeof fastForwardGitBranch>[1] = {}) =>
      run("fast-forward", true, () => fastForwardGitBranch(root, input)),
    deleteBranch: (branchName: string) => run("delete-branch", true, () => deleteGitBranch(root, branchName)),
  };
}

export type SourceControlService = ReturnType<typeof createSourceControlService>;
