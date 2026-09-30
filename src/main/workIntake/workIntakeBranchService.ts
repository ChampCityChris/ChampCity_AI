import { readApplicationCheckpointReceipt } from "../planExecution/applicationCheckpointReceipt";
import { AgentHarnessError } from "../core/applicationErrors";
import { createSourceControlService } from "../sourceControl/sourceControlService";
import { workIntakeBranchName } from "../sourceControl/workSourceNaming";
import type { SourceControlResult } from "../../shared/sourceControlContracts";
import type { WorkIntakeBranchBinding } from "../../shared/workIntakeBranchContracts";

export { workIntakeBranchName } from "../sourceControl/workSourceNaming";

/** Verifies a retained legacy execution source; Current Project Work Intake cannot create or own branches. */
export function createWorkIntakeBranchService(repository: { repositoryId: string; repositoryRoot: string }) {
  const sourceControl = createSourceControlService(repository);

  function unwrap<T>(result: SourceControlResult<T>): T {
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
    const state = unwrap(await sourceControl.branches());
    const workLine = state.branches.find(branch => branch.name === binding.workBranch);
    if (!workLine) throw new AgentHarnessError("STALE_SOURCE", "Work Intake source line is unavailable.");
    if (workLine.commit !== binding.currentHead) {
      const lineage = unwrap(await sourceControl.historyWithMessages({ ref: workLine.commit, maxCount: 100 }));
      let current = workLine.commit;
      for (const commit of lineage.commits) {
        if (current === binding.currentHead) break;
        if (commit.commit !== current || commit.parents.length !== 1) throw new AgentHarnessError("STALE_SOURCE", "Work Intake checkout differs from its recorded head and advanced outside its recorded checkpoint chain.");
        let evidence;
        try { evidence = readApplicationCheckpointReceipt(commit.subject, commit.message).evidence; }
        catch { throw new AgentHarnessError("STALE_SOURCE", "Work Intake checkout differs from its recorded head and advanced outside its recorded checkpoint chain."); }
        if (evidence.intakeId !== binding.intakeId || evidence.repositoryId !== binding.repositoryId || evidence.workBranch !== binding.workBranch || evidence.beforeHead !== commit.parents[0]) throw new AgentHarnessError("STALE_SOURCE", "Checkpoint does not match the Work Intake branch lineage.");
        current = commit.parents[0];
      }
      if (current !== binding.currentHead) throw new AgentHarnessError("STALE_SOURCE", "Work Intake checkpoint lineage is incomplete or exceeds its bound.");
    }
    const history = unwrap(await sourceControl.history({ ancestor: binding.baseCommit, descendant: workLine.commit, maxCount: 1 }));
    if (!history.ancestry?.isAncestor) throw new AgentHarnessError("STALE_SOURCE", "Work Intake head does not descend from its recorded base.");
    return { ...binding, currentHead: workLine.commit };
  }

  return { verify };
}
