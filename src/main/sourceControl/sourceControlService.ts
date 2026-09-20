import fs from "node:fs";
import path from "node:path";
import { AgentHarnessError } from "../agentHarness/core/errors";
import { runBoundedGit, isGitWorkTree } from "../agentHarness/repository/boundedGit";
import {
  commitGitChanges, deleteGitBranch, fastForwardGitBranch, fetchGitRemote,
  inspectGitBranchState, inspectGitHistory, prepareGitBranch, pushGitBranch,
  stageGitChanges, switchGitBranch,
} from "../agentHarness/repository/gitMutations";
import { gitDiff, gitStatus, preCommitSafetyScan } from "../agentHarness/repository/repositoryOperations";
import type {
  SourceControlChangedFile, SourceControlOperation, SourceControlPosition,
  SourceControlReceipt, SourceControlResult,
} from "../../shared/sourceControlContracts";

/** Called by trusted main-process services with a selected repository, without MCP/model mediation. */
export function createSourceControlService(binding: { repositoryId: string; repositoryRoot: string }) {
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
          phase,
          mutationMayHaveOccurred: mutate && phase !== "precondition",
        },
        ...(phase === "receipt" ? { completedResult } : {}),
      };
    }
  }

  async function changedFiles(): Promise<SourceControlChangedFile[]> {
    const output = await runBoundedGit({
      cwd: root, args: ["status", "--porcelain=v1", "-z", "--untracked-files=all"],
    });
    const records = output.stdout.split("\0");
    if (records.pop() !== "") {
      throw new AgentHarnessError("GIT_EXECUTION_FAILED", "Git returned incomplete changed-file evidence.");
    }
    const files: SourceControlChangedFile[] = [];
    for (let index = 0; index < records.length; index += 1) {
      const record = records[index];
      if (record.length < 4 || record[2] !== " ") {
        throw new AgentHarnessError("GIT_EXECUTION_FAILED", "Git returned invalid changed-file evidence.");
      }
      const file: SourceControlChangedFile = {
        path: record.slice(3), indexStatus: record[0], worktreeStatus: record[1],
      };
      if (/[RC]/.test(record.slice(0, 2))) {
        const originalPath = records[++index];
        if (!originalPath) {
          throw new AgentHarnessError("GIT_EXECUTION_FAILED", "Git returned incomplete rename evidence.");
        }
        file.originalPath = originalPath;
      }
      files.push(file);
    }
    return files;
  }

  return {
    status: () => run("status", false, async () => {
      const status = await gitStatus(root, true);
      return { ...status, clean: status.shortStatus.length === 0 };
    }),
    branches: (branchName?: string) => run("branches", false, () => inspectGitBranchState(root, branchName)),
    history: (input: Parameters<typeof inspectGitHistory>[1] = {}) =>
      run("history", false, () => inspectGitHistory(root, input)),
    diff: () => run("diff", false, async () => ({
      unstaged: (await gitDiff(root, true)).diff,
      staged: (await runBoundedGit({
        cwd: root, args: ["--no-pager", "diff", "--cached", "--no-ext-diff", "--no-textconv", "--", "."],
      })).stdout,
    })),
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
    prepareBranch: (branchName: string) => run("prepare-branch", true, () => prepareGitBranch(root, branchName)),
    switchBranch: (branchName: string) => run("switch-branch", true, () => switchGitBranch(root, branchName)),
    stage: (paths: string[]) => run("stage", true, () => stageGitChanges(root, paths)),
    commit: (message: string) => run("commit", true, () => commitGitChanges(root, message)),
    fetch: (remote?: string) => run("fetch", true, () => fetchGitRemote(root, remote)),
    push: (input: Parameters<typeof pushGitBranch>[1] = {}) => run("push", true, () => pushGitBranch(root, input)),
    fastForward: (input: Parameters<typeof fastForwardGitBranch>[1] = {}) =>
      run("fast-forward", true, () => fastForwardGitBranch(root, input)),
    deleteBranch: (branchName: string) => run("delete-branch", true, () => deleteGitBranch(root, branchName)),
  };
}

export type SourceControlService = ReturnType<typeof createSourceControlService>;
