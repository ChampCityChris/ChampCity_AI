import { createHash } from "node:crypto";
import fs from "node:fs";
import { readCheckpointReceipt } from "../planExecution/workItemCheckpointReceipt";
import { AgentHarnessError } from "../agentHarness/core/errors";
import { createSourceControlService } from "../sourceControl/sourceControlService";
import type { SourceControlReceipt, SourceControlResult } from "../../shared/sourceControlContracts";
import type {
  EstablishWorkIntakeBranchInput, WorkIntakeBranchBinding, WorkIntakeBranchResult,
} from "../../shared/workIntakeBranchContracts";

const activeRepositories = new Set<string>();

export function workIntakeBranchName(intakeId: string): string {
  if (typeof intakeId !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(intakeId)) {
    throw new AgentHarnessError("INVALID_INPUT", "Work Intake identity must be a bounded identifier.");
  }
  const slug = intakeId.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 48).replace(/-+$/, "");
  const digest = createHash("sha256").update(intakeId).digest("hex").slice(0, 24);
  return `work-intake/${slug}-${digest}`;
}

/** Main-process orchestration: persistence is invoked only after exact branch verification. */
export function createWorkIntakeBranchService(repository: { repositoryId: string; repositoryRoot: string }) {
  const sourceControl = createSourceControlService(repository);

  function unwrap<T>(result: SourceControlResult<T>, receipts: SourceControlReceipt[]): T {
    receipts.push(result.receipt);
    if (!result.ok) throw new AgentHarnessError("GIT_EXECUTION_FAILED", result.error.message);
    return result.result;
  }

  async function verify(binding: WorkIntakeBranchBinding): Promise<WorkIntakeBranchBinding> {
    if (binding.repositoryId !== repository.repositoryId || binding.workBranch !== workIntakeBranchName(binding.intakeId)) {
      throw new AgentHarnessError("WORKSPACE_ACCESS_DENIED", "Work Intake repository or branch binding does not match.");
    }
    if (!/^[a-f0-9]{40,64}$/.test(binding.baseCommit) || !/^[a-f0-9]{40,64}$/.test(binding.currentHead)) {
      throw new AgentHarnessError("INVALID_INPUT", "Work Intake binding requires exact commit identities.");
    }
    const state = unwrap(await sourceControl.branches(), []);
    if (state.currentBranch !== binding.workBranch) {
      throw new AgentHarnessError("STALE_SOURCE", "Work Intake branch or recorded head is not the current checkout.");
    }
    if (state.head !== binding.currentHead) {
      // Only the application's exact single-parent checkpoint chain may advance the bound source head.
      const lineage = unwrap(await sourceControl.history({ ref: state.head, maxCount: 100 }), []);
      let current = state.head;
      for (const commit of lineage.commits) {
        if (current === binding.currentHead) break;
        const checkpointId = /: source checkpoint ([a-f0-9]{64})$/.exec(commit.subject)?.[1];
        if (commit.commit !== current || commit.parents.length !== 1 || !checkpointId) throw new AgentHarnessError("STALE_SOURCE", "Work Intake checkout differs from its recorded head and advanced outside its recorded checkpoint chain.");
        const evidence = readCheckpointReceipt(unwrap(await sourceControl.readCommitMessage(commit.commit), []), checkpointId);
        if (commit.subject !== `${evidence.workItemId}: source checkpoint ${checkpointId}` || evidence.intakeId !== binding.intakeId || evidence.repositoryId !== binding.repositoryId || evidence.workBranch !== binding.workBranch || evidence.beforeHead !== commit.parents[0]) throw new AgentHarnessError("STALE_SOURCE", "Checkpoint does not match the Work Intake branch lineage.");
        current = commit.parents[0];
      }
      if (current !== binding.currentHead) throw new AgentHarnessError("STALE_SOURCE", "Work Intake checkpoint lineage is incomplete or exceeds its bound.");
    }
    const history = unwrap(await sourceControl.history({
      ancestor: binding.baseCommit, descendant: state.head, maxCount: 1,
    }), []);
    if (!history.ancestry?.isAncestor) {
      throw new AgentHarnessError("STALE_SOURCE", "Work Intake head does not descend from its recorded base.");
    }
    return { ...binding, currentHead: state.head };
  }

  async function establish<T>(
    input: EstablishWorkIntakeBranchInput,
    persist: (binding: WorkIntakeBranchBinding) => T | Promise<T>,
  ): Promise<WorkIntakeBranchResult<T>> {
    const receipts: SourceControlReceipt[] = [];
    let lockKey: string | undefined;
    let original: { branch: string; commit: string } | undefined;
    let binding: WorkIntakeBranchBinding | undefined;
    let created = false;
    let transitionAttempted = false;
    try {
      const workBranch = workIntakeBranchName(input.intakeId);
      if (!/^[a-f0-9]{40,64}$/.test(input.baseCommit)) {
        throw new AgentHarnessError("INVALID_INPUT", "An exact selected base commit is required.");
      }
      const canonicalRoot = await fs.promises.realpath(repository.repositoryRoot);
      const key = process.platform === "win32" ? canonicalRoot.toLowerCase() : canonicalRoot;
      if (activeRepositories.has(key)) {
        throw new AgentHarnessError("WORKSPACE_ACCESS_DENIED", "Another Work Intake is establishing a branch in this checkout.");
      }
      activeRepositories.add(key);
      lockKey = key;
      const status = unwrap(await sourceControl.status(), receipts);
      if (!status.clean) throw new AgentHarnessError("GIT_EXECUTION_FAILED", "Start Work requires a clean working tree and index.");
      const state = unwrap(await sourceControl.branches(input.baseBranch), receipts);
      if (!state.currentBranch || !state.selectedBranch || state.selectedBranch.commit !== input.baseCommit) {
        throw new AgentHarnessError("STALE_SOURCE", "The selected base branch/commit is unavailable or has changed.");
      }
      if (state.branches.some(({ name }) => name === workBranch)) {
        throw new AgentHarnessError("GIT_EXECUTION_FAILED", "The Work Intake branch already exists; it will not be reused or overwritten.");
      }
      if (input.remote !== undefined && !state.remotes.includes(input.remote)) {
        throw new AgentHarnessError("INVALID_INPUT", "Work Intake remote must name a configured remote.");
      }
      original = { branch: state.currentBranch, commit: state.head };
      binding = {
        intakeId: input.intakeId, repositoryId: repository.repositoryId,
        baseBranch: input.baseBranch, baseCommit: input.baseCommit,
        workBranch, currentHead: input.baseCommit,
        ...(input.remote === undefined ? {} : { remote: { name: input.remote, syncState: "not-synced" as const } }),
      };
      transitionAttempted = true;
      if (state.currentBranch !== input.baseBranch) unwrap(await sourceControl.switchBranch(input.baseBranch), receipts);
      const base = unwrap(await sourceControl.branches(), receipts);
      if (base.currentBranch !== input.baseBranch || base.head !== input.baseCommit) {
        throw new AgentHarnessError("STALE_SOURCE", "The selected base changed before Work Intake branch creation.");
      }
      const prepared = await sourceControl.prepareBranch(workBranch);
      created = prepared.ok || prepared.completedResult !== undefined;
      unwrap(prepared, receipts);
      await verify(binding);
      const value = await persist(structuredClone(binding));
      await verify(binding);
      return { ok: true, binding, value, receipts };
    } catch (error) {
      let recovery: "unchanged" | "restored" | "inspection-required" = transitionAttempted ? "inspection-required" : "unchanged";
      // Restore only clean, unchanged source. Never discard partial persistence or user edits.
      if (transitionAttempted && original && binding) {
        try {
          const status = unwrap(await sourceControl.status(), receipts);
          const state = unwrap(await sourceControl.branches(), receipts);
          const prior = state.branches.find(({ name }) => name === original!.branch);
          if (status.clean && prior?.commit === original.commit && state.head === binding.baseCommit &&
            (state.currentBranch === binding.workBranch || state.currentBranch === binding.baseBranch)) {
            if (state.currentBranch !== original.branch) unwrap(await sourceControl.switchBranch(original.branch), receipts);
            if (created) unwrap(await sourceControl.deleteBranch(binding.workBranch), receipts);
            recovery = "restored";
          }
        } catch {
          // Preserve the exact branch/source evidence for explicit recovery.
        }
      }
      return {
        ok: false,
        error: {
          code: error instanceof AgentHarnessError ? error.code : "WORK_INTAKE_PERSISTENCE_FAILED",
          message: error instanceof AgentHarnessError ? error.message : "Initial Work Intake persistence failed; inspect the retained branch state.",
        },
        recovery, ...(binding ? { binding } : {}), receipts,
      };
    } finally {
      if (lockKey) activeRepositories.delete(lockKey);
    }
  }

  return { establish, verify };
}
