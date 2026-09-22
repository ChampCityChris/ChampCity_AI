import fs from "node:fs";
import { createHash } from "node:crypto";
import type { IntegrationCompletionEvidence } from "../../shared/integrationCompletionContracts";
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
import { readApplicationCheckpointReceipt } from "./applicationCheckpointReceipt";
import type { WorkItemCheckpointEvidence } from "../../shared/workItemCheckpointContracts";
import { resolveRepositoryPath } from "../agentHarness/repository/pathPolicy";
import { workPlanningKernel } from "../workPlanning/workPlanningKernel";
import { workIssueContext } from "../workPlanning/workIssueContext";
import { getIssueCorrectionIntegrationEvidence } from "../issueResolution/issueResolutionService";
import { projectPlanExecution } from "./planExecutor";
import { checkpointResearchCompletion, resolveResearchCompletion } from "./researchCompletionService";

const sha = (text: Buffer) => createHash("sha256").update(text).digest("hex");
const message = (error: unknown) => error instanceof Error && !/(?:[A-Za-z]:[\\/]|\/(?:Users|home|tmp)\/)/.test(error.message)
  ? error.message.slice(0, 1500) : "Current routed integration evidence could not be resolved.";
const sameLogicalCompletion = (left: IntegrationCompletionEvidence, right: IntegrationCompletionEvidence) =>
  left.kind === right.kind && left.routeDecisionId === right.routeDecisionId && left.completionId === right.completionId;
const sameCompletion = (left: IntegrationCompletionEvidence, right: IntegrationCompletionEvidence) =>
  left.kind === right.kind && left.routeDecisionId === right.routeDecisionId && left.completionId === right.completionId && left.revision === right.revision &&
  left.fingerprint === right.fingerprint && left.sourcePath === right.sourcePath;

/** Production composition of existing execution, checkpoint and candidate/Repair owners. */
export function createRoutedIntegrationService(root: string, intakeId: string) {
  const intake = readWorkIntake(root, intakeId);
  const repositoryId = intake.branchBinding.repositoryId;
  const source = createSourceControlService({ repositoryRoot: root, repositoryId });

  async function completionState() {
    const assessment = await workPlanningKernel.get(root, intakeId, "assessment");
    if (assessment.researchClosed === true) {
      const resolved = await resolveResearchCompletion(root, intakeId);
      return { kind: "research" as const, branchBinding: resolved.binding, completion: resolved.completion, entries: [] };
    }
    const planning = await workPlanningKernel.get(root, intakeId, "plan");
    if (planning.routeId === "issue-resolution") {
      const plan = planning.artifact;
      if (!plan || plan.stale || plan.disposition !== "Approved" || !plan.identity.planId) throw Error("Current approved correction Plan is required.");
      const issue = workIssueContext(root, intakeId, plan.identity.routeDecisionId);
      if (!issue) throw Error("Current routed Issue identity is required.");
      const state = getIssueCorrectionIntegrationEvidence(root, issue.issueId);
      const projection = projectPlanExecution(state.input);
      const completion: IntegrationCompletionEvidence = { kind: "plan", routeDecisionId: plan.identity.routeDecisionId, completionId: state.input.planId,
        revision: state.input.planRevision, fingerprint: projection.fingerprint, sourcePath: plan.relativePath };
      return { kind: "plan" as const, branchBinding: intake.branchBinding, completion, projection,
        planId: state.input.planId, entries: state.checkpoints.map((entry) => ({ executionWorkCardId: entry.implementationId, workItemId: entry.workItemId, contractPath: entry.contractPath, issueId: issue.issueId })) };
    }
    const state = await loadRoutedDevelopmentExecution(root, intakeId);
    const completion: IntegrationCompletionEvidence = { kind: "plan", routeDecisionId: state.binding.identity.routeDecisionId,
      completionId: state.binding.identity.planId, revision: state.binding.planRevision, fingerprint: state.projection.fingerprint, sourcePath: state.binding.planPath };
    return { kind: "plan" as const, branchBinding: state.binding.branchBinding, completion, projection: state.projection,
      planId: state.binding.identity.planId, entries: state.entries.map((entry) => ({ executionWorkCardId: entry.executionWorkCardId, workItemId: entry.candidate.workItemId,
        contractPath: (entry.repairContext ? entry.repairContext.existing : entry.formal)?.markdownPath, issueId: undefined })) };
  }

  async function load() {
    const state = await completionState();
    return { binding: state.branchBinding, completion: state.completion, intakePath: readWorkIntake(root, intakeId).relativePath };
  }
  const candidate = createIntegrationCandidateService({ repositoryRoot: root, repositoryId, load,
    ...createIntegrationPolicyProvider(root), ...createIntegrationRepairPolicyProvider({ repositoryRoot: root, repositoryId, load }) });

  async function planCheckpoints(state: Extract<Awaited<ReturnType<typeof completionState>>, { kind: "plan" }>) {
    const current = await createWorkIntakeBranchService({ repositoryRoot: root, repositoryId }).verify(state.branchBinding);
    const history = await source.history({ ref: current.currentHead, maxCount: 100 });
    if (!history.ok) throw Error(history.error.message);
    const commits = new Map<string, { commit: string; evidence: WorkItemCheckpointEvidence }>();
    for (const commit of history.result.commits) {
      if (commit.commit === intake.branchBinding.currentHead) break;
      const receipt = await source.readCommitMessage(commit.commit);
      if (!receipt.ok) throw Error(receipt.error.message);
      const parsed = readApplicationCheckpointReceipt(commit.subject, receipt.result);
      const checkpointEvidence = parsed.evidence;
      if (commit.parents.length !== 1 || checkpointEvidence.beforeHead !== commit.parents[0] || checkpointEvidence.intakeId !== intakeId || checkpointEvidence.repositoryId !== repositoryId || checkpointEvidence.workBranch !== current.workBranch) throw Error("Checkpoint belongs to different routed work.");
      if (parsed.kind === "lifecycle") continue;
      const evidence = parsed.evidence;
      if (!commits.has(evidence.implementationId)) commits.set(evidence.implementationId, { commit: commit.commit, evidence });
    }
    return state.entries.map((entry) => {
      const proof = commits.get(entry.executionWorkCardId);
      if (!proof || !entry.contractPath || proof.evidence.workItemId !== entry.workItemId || proof.evidence.contractPath !== entry.contractPath) throw Error(`Work Item ${entry.workItemId} requires its current machine-owned source checkpoint.`);
      const resolved = resolveRepositoryPath(root, entry.contractPath);
      const bytes = fs.readFileSync(resolved.resolvedPath);
      const identity = parseCanonicalMarkdownDocument(bytes.toString("utf8")).metadata.identity;
      const owned = entry.issueId ? identity.issueId === entry.issueId : identity.planId === state.planId && identity.intakeId === intakeId;
      if (resolved.relativePath !== entry.contractPath || sha(bytes) !== proof.evidence.contractSha256 || !owned) throw Error("Checkpoint contract is inconsistent with the current approved Plan.");
      return proof.commit;
    });
  }

  async function researchCheckpoints(state: Extract<Awaited<ReturnType<typeof completionState>>, { kind: "research" }>) {
    const current = await createWorkIntakeBranchService({ repositoryRoot: root, repositoryId }).verify(state.branchBinding);
    const history = await source.history({ ref: current.currentHead, maxCount: 100 });
    if (!history.ok) throw Error(history.error.message);
    for (const commit of history.result.commits) {
      if (commit.commit === intake.branchBinding.currentHead) break;
      const receipt = await source.readCommitMessage(commit.commit);
      if (!receipt.ok) throw Error(receipt.error.message);
      const parsed = readApplicationCheckpointReceipt(commit.subject, receipt.result);
      const evidence = parsed.evidence;
      if (commit.parents.length !== 1 || evidence.beforeHead !== commit.parents[0] || evidence.intakeId !== intakeId || evidence.repositoryId !== repositoryId || evidence.workBranch !== current.workBranch) throw Error("Checkpoint belongs to different routed work.");
      if (parsed.kind !== "lifecycle" || parsed.evidence.boundary.kind !== "research") continue;
      const boundary = parsed.evidence.boundary;
      const file = parsed.evidence.files.find((entry) => entry.path === state.completion.sourcePath);
      if (boundary.routeDecisionId === state.completion.routeDecisionId && boundary.assessmentId === state.completion.completionId &&
        boundary.assessmentRevision === state.completion.revision && file?.sha256 === state.completion.fingerprint) return [commit.commit];
    }
    return [];
  }

  async function query(): Promise<RoutedIntegrationProjection> {
    try {
      const state = await completionState();
      if (state.kind === "plan" && !state.projection.complete) return { status: "not-ready", reasons: ["Complete the current Plan, including Work Item close and declared acceptance criteria."],
        completionKind: "plan", completionFingerprint: state.completion.fingerprint, checkpointCommits: [] };
      const checkpointCommits = state.kind === "plan" ? await planCheckpoints(state) : await researchCheckpoints(state);
      const records = candidate.list(intakeId).filter((entry) => sameLogicalCompletion(entry.completion, state.completion));
      let record = records.at(0);
      if (record?.status === "aborted") {
        const target = await source.integrationTarget({ baseCommit: state.branchBinding.baseCommit, incomingBranch: state.branchBinding.workBranch, targetBranch: state.branchBinding.baseBranch, remote: state.branchBinding.remote?.name });
        if (!target.ok) throw Error(target.error.message);
        if (sameCompletion(record.completion, state.completion) && record.incomingCommit === target.result.incomingCommit && record.targetCommit === target.result.targetCommit && record.localTargetCommit === target.result.localTargetCommit) {
          return { status: "not-ready", reasons: ["This exact integration candidate was aborted. Changed completion evidence or a changed source baseline is required to create another candidate; the retained receipt remains available."],
            completionKind: state.kind, completionFingerprint: state.completion.fingerprint, checkpointCommits, candidate: record };
        }
        record = undefined;
      }
      if (record && !sameCompletion(record.completion, state.completion)) {
        return { status: "not-ready", reasons: ["Retained candidate belongs to changed completion evidence; abort it before constructing a fresh candidate."],
          completionKind: state.kind, completionFingerprint: state.completion.fingerprint, checkpointCommits, candidate: record };
      }
      if (state.kind === "research" && !checkpointCommits.length && !record) return { status: "ready", reasons: ["Accepted Research will be checkpointed before candidate construction."],
        completionKind: "research", completionFingerprint: state.completion.fingerprint, checkpointCommits: [] };
      const status: RoutedIntegrationProjection["status"] = !record || record.status === "validated" ? "ready" : record.status === "integrated" ? "integration-complete" : record.status === "operator-decision" ? "operator-decision-required"
        : ["conflicted", "validation-failed"].includes(record.status) ? "repair-required" : record.status === "failed" ? "failed" : "candidate-validating";
      return { status, reasons: record ? [record.message] : [], completionKind: state.kind, completionFingerprint: state.completion.fingerprint, checkpointCommits, ...(record ? { candidate: record } : {}) };
    } catch (error) { return { status: "not-ready", reasons: [message(error)], checkpointCommits: [] }; }
  }

  async function eligible(request: RoutedIntegrationRequest, requireCandidate: boolean) {
    const projection = await query();
    if (projection.completionFingerprint !== request.expectedFingerprint || ["not-ready", "operator-decision-required", "integration-complete"].includes(projection.status)) throw Error(projection.reasons[0] ?? "Integration requires current completion and checkpoint evidence.");
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
      let current = await eligible(request, Boolean(request.candidateId));
      if (current.completionKind === "research" && !current.candidate && !current.checkpointCommits.length) {
        const checkpointed = await checkpointResearchCompletion(root, intakeId);
        if (!["committed", "not-applicable"].includes(checkpointed.checkpoint.status)) throw Error(checkpointed.checkpoint.message);
        const refreshed = await query();
        if (refreshed.completionKind !== "research" || refreshed.completionFingerprint !== request.expectedFingerprint || !refreshed.checkpointCommits.length) throw Error("Current Research checkpoint evidence changed before candidate construction.");
        current = refreshed;
      }
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
