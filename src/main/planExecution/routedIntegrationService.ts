import fs from "node:fs";
import { createHash } from "node:crypto";
import type { IntegrationRepairPatch } from "../../shared/integrationRepairContracts";
import type { RoutedIntegrationProjection, RoutedIntegrationRequest } from "../../shared/routedIntegrationContracts";
import { parseCanonicalMarkdownDocument } from "../../shared/documents/canonicalMarkdown";
import { createSourceControlService } from "../sourceControl/sourceControlService";
import { readWorkIntake } from "../workIntake/workIntakeService";
import { createWorkIntakeBranchService } from "../workIntake/workIntakeBranchService";
import { loadRoutedDevelopmentExecution } from "./routedDevelopmentExecutionService";
import { createIntegrationCandidateService } from "./integrationCandidateService";
import { createIntegrationPolicyProvider } from "./integrationPolicyProvider";
import { createIntegrationRepairPolicyProvider } from "./integrationRepairPolicyProvider";
import { readCheckpointReceipt } from "./workItemCheckpointReceipt";
import { resolveRepositoryPath } from "../agentHarness/repository/pathPolicy";

const sha = (text: Buffer) => createHash("sha256").update(text).digest("hex");
const message = (error: unknown) => error instanceof Error && !/(?:[A-Za-z]:[\\/]|\/(?:Users|home|tmp)\/)/.test(error.message)
  ? error.message.slice(0, 1500) : "Current routed integration evidence could not be resolved.";

/** Production composition of existing execution, checkpoint and candidate/Repair owners. */
export function createRoutedIntegrationService(root: string, intakeId: string) {
  const intake = readWorkIntake(root, intakeId);
  const repositoryId = intake.branchBinding.repositoryId;
  const source = createSourceControlService({ repositoryRoot: root, repositoryId });
  async function load() {
    const state = await loadRoutedDevelopmentExecution(root, intakeId);
    return { binding: state.binding.branchBinding, plan: state.input, intakePath: readWorkIntake(root, intakeId).relativePath, planPath: state.binding.planPath };
  }
  const candidate = createIntegrationCandidateService({ repositoryRoot: root, repositoryId, load,
    ...createIntegrationPolicyProvider(root), ...createIntegrationRepairPolicyProvider({ repositoryRoot: root, repositoryId, load }) });

  async function checkpoints(state: Awaited<ReturnType<typeof loadRoutedDevelopmentExecution>>) {
    const current = await createWorkIntakeBranchService({ repositoryRoot: root, repositoryId }).verify(state.binding.branchBinding);
    const history = await source.history({ ref: current.currentHead, maxCount: 100 });
    if (!history.ok) throw Error(history.error.message);
    const commits = new Map<string, { commit: string; evidence: ReturnType<typeof readCheckpointReceipt> }>();
    for (const commit of history.result.commits) {
      if (commit.commit === intake.branchBinding.currentHead) break;
      const id = /: source checkpoint ([a-f0-9]{64})$/.exec(commit.subject)?.[1];
      if (!id) throw Error("Routed source history contains an unverified checkpoint.");
      const receipt = await source.readCommitMessage(commit.commit);
      if (!receipt.ok) throw Error(receipt.error.message);
      const evidence = readCheckpointReceipt(receipt.result, id);
      if (evidence.intakeId !== intakeId || evidence.repositoryId !== repositoryId || evidence.workBranch !== current.workBranch) throw Error("Checkpoint belongs to different routed work.");
      if (!commits.has(evidence.implementationId)) commits.set(evidence.implementationId, { commit: commit.commit, evidence });
    }
    return state.entries.map((entry) => {
      const proof = commits.get(entry.executionWorkCardId);
      const contract = entry.repairContext?.existing ?? entry.formal;
      if (!proof || !contract || proof.evidence.workItemId !== entry.candidate.workItemId || proof.evidence.contractPath !== contract.markdownPath) throw Error(`Work Item ${entry.candidate.workItemId} requires its current machine-owned source checkpoint.`);
      const resolved = resolveRepositoryPath(root, contract.markdownPath);
      const bytes = fs.readFileSync(resolved.resolvedPath);
      const identity = parseCanonicalMarkdownDocument(bytes.toString("utf8")).metadata.identity;
      if (resolved.relativePath !== contract.markdownPath || sha(bytes) !== proof.evidence.contractSha256 || identity.planId !== state.binding.identity.planId || identity.intakeId !== intakeId) throw Error("Checkpoint contract is inconsistent with the current approved Plan.");
      return proof.commit;
    });
  }
  async function query(): Promise<RoutedIntegrationProjection> {
    try {
      const state = await loadRoutedDevelopmentExecution(root, intakeId);
      if (!state.projection.complete) return { status: "not-ready", reasons: ["Complete the current Plan, including Work Item close and declared acceptance criteria."], planFingerprint: state.projection.fingerprint, checkpointCommits: [] };
      const checkpointCommits = await checkpoints(state);
      const records = candidate.list(intakeId).filter((entry) => entry.planId === state.binding.identity.planId && entry.status !== "aborted");
      const record = records[0];
      if (record && (record.planRevision !== state.binding.planRevision || record.planFingerprint !== state.projection.fingerprint)) return { status: "not-ready", reasons: ["Retained candidate belongs to changed Plan evidence; abort it before constructing a fresh candidate."], planFingerprint: state.projection.fingerprint, checkpointCommits, candidate: record };
      const status: RoutedIntegrationProjection["status"] = !record || record.status === "validated" ? "ready" : record.status === "integrated" ? "integration-complete" : record.status === "operator-decision" ? "operator-decision-required"
        : ["conflicted", "validation-failed"].includes(record.status) ? "repair-required" : record.status === "failed" ? "failed" : "candidate-validating";
      return { status, reasons: record ? [record.message] : [], planFingerprint: state.projection.fingerprint, checkpointCommits, ...(record ? { candidate: record } : {}) };
    } catch (error) { return { status: "not-ready", reasons: [message(error)], checkpointCommits: [] }; }
  }
  async function eligible(request: RoutedIntegrationRequest, requireCandidate: boolean) {
    const projection = await query();
    if (projection.planFingerprint !== request.expectedFingerprint || ["not-ready", "operator-decision-required", "integration-complete"].includes(projection.status)) throw Error(projection.reasons[0] ?? "Integration requires current complete Plan and checkpoint evidence.");
    if (requireCandidate && (!request.candidateId || projection.candidate?.candidateId !== request.candidateId)) throw Error("The exact current integration candidate is required.");
    return projection;
  }
  return {
    query,
    async integrate(request: RoutedIntegrationRequest) {
      const current = await eligible(request, Boolean(request.candidateId));
      const record = current.candidate ?? await candidate.create();
      if (record.status === "validated") await candidate.advance(record.candidateId);
      return query();
    },
    async prepareRepair(request: RoutedIntegrationRequest) { await eligible(request, true); return candidate.prepareRepair(request.candidateId!); },
    async applyRepair(request: RoutedIntegrationRequest & { repairId: string; patches: IntegrationRepairPatch[] }) { await eligible(request, true); return candidate.applyRepairPatch(request.candidateId!, request.repairId, request.patches); },
    async completeRepair(request: RoutedIntegrationRequest & { repairId: string }) {
      await eligible(request, true);
      const result = await candidate.completeRepair(request.candidateId!, request.repairId);
      if (result.candidate.status === "validated") await candidate.advance(request.candidateId!);
      return query();
    },
    async requestOperatorDecision(request: RoutedIntegrationRequest & { repairId: string; reason: string }) { await eligible(request, true); await candidate.requestOperatorDecision(request.candidateId!, request.repairId, request.reason); return query(); },
    async retryValidation(request: RoutedIntegrationRequest) { await eligible(request, true); const record = await candidate.retryValidation(request.candidateId!); if (record.status === "validated") await candidate.advance(record.candidateId); return query(); },
    async abort(request: RoutedIntegrationRequest) {
      if (!request.candidateId || !candidate.list(intakeId).some((entry) => entry.candidateId === request.candidateId)) throw Error("The exact Intake candidate is required for abort.");
      await candidate.abort(request.candidateId); return query();
    },
  };
}
