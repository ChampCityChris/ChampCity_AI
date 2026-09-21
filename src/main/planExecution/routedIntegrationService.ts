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
import { workPlanningKernel } from "../workPlanning/workPlanningKernel";
import { workIssueContext } from "../workPlanning/workIssueContext";
import { getIssueCorrectionIntegrationEvidence } from "../issueResolution/issueResolutionService";
import { projectPlanExecution } from "./planExecutor";

const sha = (text: Buffer) => createHash("sha256").update(text).digest("hex");
const message = (error: unknown) => error instanceof Error && !/(?:[A-Za-z]:[\\/]|\/(?:Users|home|tmp)\/)/.test(error.message)
  ? error.message.slice(0, 1500) : "Current routed integration evidence could not be resolved.";

/** Production composition of existing execution, checkpoint and candidate/Repair owners. */
export function createRoutedIntegrationService(root: string, intakeId: string) {
  const intake = readWorkIntake(root, intakeId);
  const repositoryId = intake.branchBinding.repositoryId;
  const source = createSourceControlService({ repositoryRoot: root, repositoryId });
  async function executionState() {
    const planning = await workPlanningKernel.get(root, intakeId, "plan");
    if (planning.routeId === "issue-resolution") {
      const plan = planning.artifact;
      if (!plan || plan.stale || plan.disposition !== "Approved") throw Error("Current approved correction Plan is required.");
      const issue = workIssueContext(root, intakeId, plan.identity.routeDecisionId);
      if (!issue) throw Error("Current routed Issue identity is required.");
      const state = getIssueCorrectionIntegrationEvidence(root, issue.issueId);
      return { binding: { branchBinding: intake.branchBinding, identity: { planId: state.input.planId }, planRevision: state.input.planRevision, planPath: state.plan!.planPath },
        input: state.input, projection: projectPlanExecution(state.input),
        entries: state.checkpoints.map((entry) => ({ executionWorkCardId: entry.implementationId, workItemId: entry.workItemId, contractPath: entry.contractPath, issueId: issue.issueId })) };
    }
    const state = await loadRoutedDevelopmentExecution(root, intakeId);
    return { binding: state.binding, input: state.input, projection: state.projection,
      entries: state.entries.map((entry) => ({ executionWorkCardId: entry.executionWorkCardId, workItemId: entry.candidate.workItemId,
        contractPath: (entry.repairContext ? entry.repairContext.existing : entry.formal)?.markdownPath, issueId: undefined })) };
  }
  async function load() {
    const state = await executionState();
    return { binding: state.binding.branchBinding, plan: state.input, intakePath: readWorkIntake(root, intakeId).relativePath, planPath: state.binding.planPath };
  }
  const candidate = createIntegrationCandidateService({ repositoryRoot: root, repositoryId, load,
    ...createIntegrationPolicyProvider(root), ...createIntegrationRepairPolicyProvider({ repositoryRoot: root, repositoryId, load }) });

  async function checkpoints(state: Awaited<ReturnType<typeof executionState>>) {
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
      if (!proof || !entry.contractPath || proof.evidence.workItemId !== entry.workItemId || proof.evidence.contractPath !== entry.contractPath) throw Error(`Work Item ${entry.workItemId} requires its current machine-owned source checkpoint.`);
      const resolved = resolveRepositoryPath(root, entry.contractPath);
      const bytes = fs.readFileSync(resolved.resolvedPath);
      const identity = parseCanonicalMarkdownDocument(bytes.toString("utf8")).metadata.identity;
      const owned = entry.issueId ? identity.issueId === entry.issueId : identity.planId === state.binding.identity.planId && identity.intakeId === intakeId;
      if (resolved.relativePath !== entry.contractPath || sha(bytes) !== proof.evidence.contractSha256 || !owned) throw Error("Checkpoint contract is inconsistent with the current approved Plan.");
      return proof.commit;
    });
  }
  async function query(): Promise<RoutedIntegrationProjection> {
    try {
      const state = await executionState();
      if (!state.projection.complete) return { status: "not-ready", reasons: ["Complete the current Plan, including Work Item close and declared acceptance criteria."], planFingerprint: state.projection.fingerprint, checkpointCommits: [] };
      const checkpointCommits = await checkpoints(state);
      const records = candidate.list(intakeId).filter((entry) => entry.planId === state.binding.identity.planId);
      let record = records.at(0);
      if (record?.status === "aborted") {
        const target = await source.integrationTarget({ baseCommit: state.binding.branchBinding.baseCommit, incomingBranch: state.binding.branchBinding.workBranch, targetBranch: state.binding.branchBinding.baseBranch, remote: state.binding.branchBinding.remote?.name });
        if (!target.ok) throw Error(target.error.message);
        if (record.planFingerprint === state.projection.fingerprint && record.incomingCommit === target.result.incomingCommit && record.targetCommit === target.result.targetCommit && record.localTargetCommit === target.result.localTargetCommit) return { status: "not-ready", reasons: ["This exact integration candidate was aborted. A changed Plan or source baseline is required to create another candidate; the retained receipt remains available."], planFingerprint: state.projection.fingerprint, checkpointCommits, candidate: record };
        record = undefined;
      }
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
    readRepair(candidateId: string, repairId: string) {
      if (!candidate.list(intakeId).some((record) => record.candidateId === candidateId && record.activeRepairId === repairId)) throw Error("The current Intake Integration Repair is required.");
      return candidate.readRepair(candidateId, repairId);
    },
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
