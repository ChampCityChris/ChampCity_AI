import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import type { EntityId, ProjectId, ProjectStateRecord } from "../../shared/projectState/domainContracts";
import type { IntegrationCandidateRecord } from "../../shared/integrationCandidateContracts";
import type { IntegrationCompletionEvidence } from "../../shared/integrationCompletionContracts";
import type { IntegrationRepairPatch, IntegrationRepairPolicy } from "../../shared/integrationRepairContracts";
import type { WorkflowIntegrationBinding } from "../planExecution/integrationCandidateService";
import { createIntegrationCandidateService } from "../planExecution/integrationCandidateService";
import { createIntegrationPolicyProvider, loadIntegrationPolicyAtCommit } from "../planExecution/integrationPolicyProvider";
import { deriveIntegrationRepairEditablePaths } from "../planExecution/integrationRepairPolicyProvider";
import { createSQLiteProjectStateStore } from "../projectState/sqliteProjectStateStore";
import { selectedCurrentProjectId } from "../projectState/currentProjectRegistrationService";
import { resolveManagedProjectSourceTopology, resolveManagedWorkflowCheckoutPath } from "./projectSourceTopology";
import { createSourceControlService } from "./sourceControlService";
import { integrationCommonDirectory, integrationPaths, readIntegrationCommitFile } from "../repository/integrationGit";
import { integrationSourceBytes, integrationSourceDigest } from "../repository/integrationRepairGit";
import { createProjectStateService } from "../../shared/projectState/projectStateService";

const operator = { principalId: "local-operator", principalType: "human" as const, role: "Operator" };
const integrationApplication = { principalId: "workflow-integration-application", principalType: "system" as const, role: "WorkflowIntegration" };
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
type Binding = ProjectStateRecord<"SourceBinding">;
type Integration = ProjectStateRecord<"IntegrationRecord">;

/** Current Project integration owned only by the exact substantive Workflow identity. */
export function createWorkflowIntegrationService(projectRoot: string, workflowId: EntityId) {
  const root = fs.realpathSync(projectRoot);
  const projectId = selectedCurrentProjectId(root) as ProjectId | null;
  if (!projectId) throw Error("Selected Current Project registration is unavailable.");
  const currentProjectId: ProjectId = projectId;
  const projectStatePath = path.join(root, ".champcity", "project-state.sqlite");
  const devRoot = resolveManagedProjectSourceTopology(root).devCheckoutRoot;
  const open = () => createSQLiteProjectStateStore(projectStatePath);

  async function snapshot() {
    const store = open();
    try {
      const state = createProjectStateService(store, operator);
      const workflow = await store.getEntity(currentProjectId, workflowId);
      if (workflow?.entityType !== "Workflow" || workflow.body.workflowType === "work-intake-routing" || workflow.lifecycleState !== "active" || workflow.body.currentWorkspace !== "integration-ready") throw Error("Exact Workflow is not execution-complete and integration-ready.");
      const lineage = (await store.listEntities(currentProjectId, "Workflow")).filter((record): record is ProjectStateRecord<"Workflow"> => record.entityType === "Workflow" && record.lineageId === workflow.lineageId);
      const current = lineage.filter(record => record.lifecycleState === "active" && !["closed", "cancelled"].includes(record.body.workflowState));
      if (current.length !== 1 || current[0].id !== workflowId) throw Error("Exact Workflow is not the unique current lineage identity.");
      const bindings = (await store.listEntities(currentProjectId, "SourceBinding")).filter((record): record is Binding => record.entityType === "SourceBinding" && record.lifecycleState === "active" && lineage.some(owner => owner.id === record.body.workflowId));
      if (bindings.length !== 1) throw Error("Exact Workflow lineage has no unique current SourceBinding.");
      const binding = bindings[0];
      const baseline = await store.getEntity(currentProjectId, binding.body.sourceBaselineId);
      if (baseline?.entityType !== "SourceBaseline" || baseline.body.workflowId !== binding.body.workflowId || !lineage.some(owner => owner.id === baseline.body.workflowId) ||
        baseline.body.integrationTargetSourceLineId !== "dev" || binding.body.preparationState !== "ready" || !binding.body.currentRevisionId || !binding.body.workSourceLineId || !binding.body.repositoryCheckoutId)
        throw Error("Exact Workflow source binding or Dev baseline is unavailable.");
      const checkpoints = (await store.listEntities(currentProjectId, "SourceCheckpoint"))
        .filter((record): record is ProjectStateRecord<"SourceCheckpoint"> => record.entityType === "SourceCheckpoint" && lineage.some(owner => owner.id === record.body.workflowId));
      if (checkpoints.some(record => record.body.checkpointState !== "committed")) throw Error("Workflow source checkpoint chain has unresolved entries.");
      const byExpected = new Map<string, string>();
      for (const checkpoint of checkpoints) {
        if (!checkpoint.body.resultingRevisionId || byExpected.has(checkpoint.body.expectedRevisionId)) throw Error("Workflow source checkpoint chain is ambiguous.");
        byExpected.set(checkpoint.body.expectedRevisionId, checkpoint.body.resultingRevisionId);
      }
      let chainedRevision = baseline.body.baseRevisionId;
      for (let index = 0; index < checkpoints.length; index++) {
        const next = byExpected.get(chainedRevision);
        if (!next || next === chainedRevision) throw Error("Workflow source checkpoint chain has a gap.");
        chainedRevision = next;
      }
      if (chainedRevision !== binding.body.currentRevisionId) throw Error("Workflow SourceBinding does not match its exact checkpoint chain.");
      const completion = await state.getWorkflowExecutionPlan(currentProjectId, workflowId);
      if (completion.solutions.length !== 1 || completion.decisions.length !== 1) throw Error("Exact Workflow has no unique accepted canonical plan.");
      const workItems = [...completion.directWorkItems, ...Object.values(completion.workItemsByPhase).flat()];
      for (const item of workItems) {
        if (item.body.workState !== "closed") throw Error("Exact Workflow execution is incomplete.");
        const eligibility = await state.getWorkItemCompletionEligibility(currentProjectId, item.id, binding.body.currentRevisionId);
        if (!eligibility.eligible) throw Error("Exact Workflow WorkItem completion evidence is stale or blocked.");
      }
      if (completion.phases.some(phase => phase.record.body.phaseState !== "closed")) throw Error("Exact Workflow has an incomplete Phase.");
      const requiredNonWorkCriteria = completion.criteria.filter(entry => entry.ownerId !== workflowId &&
        (completion.phases.some(phase => phase.phaseId === entry.ownerId) || completion.solutions.some(solution => solution.id === entry.ownerId)) &&
        entry.record.lifecycleState === "active" && entry.record.body.criticality === "required");
      for (const criterion of requiredNonWorkCriteria) {
        if (criterion.record.body.validationPolicy === "deferred_visual_phase") continue;
        if (criterion.record.body.validationPolicy === "operator_decision") {
          const disposition = await state.getEffectiveDisposition(currentProjectId, criterion.ownerId);
          if (!["approved", "accepted"].includes(disposition.state)) throw Error("Exact Workflow Phase or solution requires an Operator Decision.");
        } else if (!(await state.getCriterionValidationStatus(currentProjectId, criterion.record.id, binding.body.currentRevisionId)).satisfied)
          throw Error("Exact Workflow Phase or solution Criterion is not satisfied.");
      }
      const criteriaEvidence = await Promise.all(completion.criteria.map(async entry => {
        const proof = entry.record.body.validationPolicy === "operator_decision" ? null :
          await state.getCriterionValidationStatus(currentProjectId, entry.record.id, binding.body.currentRevisionId);
        const disposition = entry.record.body.validationPolicy === "operator_decision" ? await state.getEffectiveDisposition(currentProjectId, entry.ownerId) : null;
        return [entry.ownerId, entry.record.id, entry.record.recordVersion, entry.record.body.validationPolicy, proof?.validationId ?? null, proof?.satisfied ?? null, disposition?.state ?? null];
      }));
      const workItemIds = new Set(workItems.map(record => record.id));
      const testerEvidence = (await store.listEntities(currentProjectId, "TesterResult"))
        .filter((record): record is ProjectStateRecord<"TesterResult"> => record.entityType === "TesterResult" && record.body.workflowId === workflowId && workItemIds.has(record.body.workItemId))
        .map(record => [record.id, record.recordVersion, record.body.workItemId, record.body.implementationRecordId, record.body.checkpointState, record.body.candidateRevisionId ?? null]).sort();
      const implementations = (await store.listEntities(currentProjectId, "ImplementationRecord"))
        .filter((record): record is ProjectStateRecord<"ImplementationRecord"> => record.entityType === "ImplementationRecord" && workItemIds.has(record.body.workItemId))
        .map(record => [record.id, record.recordVersion, record.body.workItemId, record.body.outcome]).sort();
      const summary = JSON.stringify({ workflowId, workflowVersion: workflow.recordVersion, workspace: workflow.body.currentWorkspace,
        baselineId: baseline.id, repositoryId: baseline.body.repositoryId, baseRevisionId: baseline.body.baseRevisionId,
        currentRevisionId: binding.body.currentRevisionId, sourceLineId: binding.body.workSourceLineId,
        checkpoints: checkpoints.map(record => [record.id, record.recordVersion, record.body.expectedRevisionId, record.body.resultingRevisionId, record.body.checkpointState]).sort(),
        criteriaEvidence: criteriaEvidence.sort(), testerEvidence, implementations,
        planId: completion.solutions[0]?.id ?? null, decisionIds: completion.decisions.map(record => record.id).sort(),
        workItems: [...completion.directWorkItems, ...Object.values(completion.workItemsByPhase).flat()].map(record => [record.id, record.recordVersion, record.body.workState]).sort(),
        phases: completion.phases.map(phase => [phase.phaseId, phase.record.recordVersion, phase.record.body.phaseState]).sort() });
      const sourceBinding: WorkflowIntegrationBinding = { workflowId, repositoryId: baseline.body.repositoryId, baseBranch: "dev",
        baseCommit: baseline.body.baseRevisionId, workBranch: binding.body.workSourceLineId, currentHead: binding.body.currentRevisionId };
      return { workflow, binding, baseline, sourceBinding, completion: { kind: "workflow", workflowId, completionId: workflowId,
        revision: workflow.recordVersion, fingerprint: hash(summary) } satisfies IntegrationCompletionEvidence, summary };
    } finally { store.close(); }
  }

  async function verifyWorkflowBinding(expected: WorkflowIntegrationBinding) {
    const current = await snapshot();
    if (JSON.stringify(current.sourceBinding) !== JSON.stringify(expected)) throw Error("Exact Workflow SourceBinding changed before integration.");
    const sourceCheckout = resolveManagedWorkflowCheckoutPath(root, workflowId).checkoutRoot;
    const source = createSourceControlService({ repositoryRoot: sourceCheckout, repositoryId: expected.repositoryId });
    const branches = await source.branches(expected.workBranch);
    const status = await source.status();
    if (!branches.ok || branches.result.currentBranch !== expected.workBranch || branches.result.selectedBranch?.commit !== expected.currentHead || !status.ok || !status.result.clean)
      throw Error("Exact incoming Workflow checkout differs from its saved source revision.");
    const devCommon = await integrationCommonDirectory(devRoot);
    const incomingCommon = await integrationCommonDirectory(sourceCheckout);
    if (devCommon !== incomingCommon) throw Error("Managed Workflow and Dev checkouts do not share the exact Project-managed Git common repository.");
    return expected;
  }

  async function repairPolicy(record: IntegrationCandidateRecord): Promise<IntegrationRepairPolicy> {
    const policy = await loadIntegrationPolicyAtCommit(devRoot, record.targetCommit);
    if (!policy.policy.repair) throw Error("Target-owned policy has no bounded Integration Repair scope.");
    const source = createSourceControlService({ repositoryRoot: devRoot, repositoryId: record.repositoryId });
    const changed = await source.integrationRepairChangedPaths({ candidateId: record.candidateId, mergeBase: record.mergeBase, incomingCommit: record.incomingCommit });
    const inspected = await source.inspectIntegration(record.candidateId);
    if (!changed.ok || !inspected.ok) throw Error("Integration Repair candidate evidence is unavailable.");
    const sources = policy.policy.repair.sources;
    return { sources, editablePaths: deriveIntegrationRepairEditablePaths(policy.policy.repair, sources, record.conflictingPaths, inspected.result.conflictingPaths, changed.result), policySha256: policy.sha256 };
  }

  async function repairContext(record: IntegrationCandidateRecord, policy: IntegrationRepairPolicy) {
    const current = await snapshot();
    if (current.completion.fingerprint !== record.completion.fingerprint) throw Error("Exact Workflow completion changed during Integration Repair.");
    const sourceDigests: Record<string, string> = { [`semantic/workflow/${workflowId}`]: current.completion.fingerprint };
    const sections = [`### Exact Workflow completion evidence\n\n${current.summary}`];
    for (const source of policy.sources) {
      const bytes = integrationSourceBytes(devRoot, source.path);
      if (bytes === null) throw Error("Target-governing Integration Repair source is unavailable.");
      sourceDigests[source.path] = integrationSourceDigest(bytes);
      sections.push(`### ${source.role}: ${source.path}\n\n${bytes}`);
    }
    return { sourceDigests, context: sections.join("\n\n") };
  }

  let engine: ReturnType<typeof createIntegrationCandidateService> | null = null;
  async function candidate() {
    if (!engine) {
      const current = await snapshot();
      engine = createIntegrationCandidateService({ repositoryRoot: devRoot, repositoryId: current.sourceBinding.repositoryId,
        load: async () => { const latest = await snapshot(); return { binding: latest.sourceBinding, completion: latest.completion }; },
        verifyWorkflowBinding, requiredTargetBranch: "dev", ...createIntegrationPolicyProvider(devRoot), repairPolicy, repairContext });
    }
    return engine;
  }

  async function sync(record: IntegrationCandidateRecord) {
    const store = open();
    try {
      const state = createProjectStateService(store, integrationApplication);
      const current = await snapshot();
      if (record.workflowId !== workflowId || record.incomingCommit !== current.sourceBinding.currentHead) throw Error("Integration candidate no longer belongs to the exact current Workflow source.");
      const existing = (await store.listEntities(currentProjectId, "IntegrationRecord")).filter((item): item is Integration => item.entityType === "IntegrationRecord" && item.body.workflowId === workflowId && item.body.incomingRevisionId === record.incomingCommit && item.body.targetBeforeRevisionId === record.localTargetCommit);
      if (existing.length > 1) throw Error("Exact Workflow IntegrationRecord is ambiguous.");
      let saved = existing[0] ?? await state.createIntegrationRecord(currentProjectId, current.binding.id, workflowId,
        { targetBeforeRevisionId: record.localTargetCommit, ...(record.candidateCommit ? { candidateRevisionId: record.candidateCommit } : {}) }) as Integration;
      if (saved.body.integrationState === "integrated") return saved;
      if (saved.body.integrationState === "prepared") saved = await state.advanceIntegrationRecord(currentProjectId, saved.id, { integrationState: "validating", ...(record.candidateCommit ? { candidateRevisionId: record.candidateCommit } : {}) }, saved.recordVersion) as Integration;
      const proofIds: string[] = [];
      const persistedValidationIds = new Set(saved.body.validationIds);
      for (const proof of record.validation) {
        const outcome = proof.exitCode === 0 ? "pass" : proof.exitCode === null ? "blocked" : "fail";
        const matching = (await store.listEntities(currentProjectId, "Validation")).find(validation => validation.entityType === "Validation" &&
          persistedValidationIds.has(validation.id) && validation.body.targetEntityId === saved.id && validation.body.validationType === "integration" &&
          validation.body.method === proof.checkId && validation.body.outcome === outcome && validation.body.summary === proof.summary &&
          validation.body.sourceBaselineRef === record.candidateCommit);
        if (matching) { proofIds.push(matching.id); continue; }
        const validation = await state.recordValidation(currentProjectId, saved.id, { validationType: "integration", method: proof.checkId,
          outcome, summary: proof.summary, ...(record.candidateCommit ? { sourceBaselineRef: record.candidateCommit } : {}) });
        proofIds.push(validation.id); persistedValidationIds.add(validation.id);
      }
      const validationIds = [...new Set([...saved.body.validationIds, ...proofIds])];
      if (validationIds.length !== saved.body.validationIds.length) saved = await state.advanceIntegrationRecord(currentProjectId, saved.id, { validationIds }, saved.recordVersion) as Integration;
      const desired = record.status === "integrated" ? "integrated" : record.status === "validated" ? "ready" : ["conflicted", "validation-failed"].includes(record.status) ? "repairing" : "blocked";
      if (desired === "integrated" && saved.body.integrationState !== "ready") saved = await state.advanceIntegrationRecord(currentProjectId, saved.id, { integrationState: "ready" }, saved.recordVersion) as Integration;
      if (desired !== saved.body.integrationState) saved = await state.advanceIntegrationRecord(currentProjectId, saved.id,
        { integrationState: desired, outcome: desired === "integrated" ? "integrated" : desired === "blocked" ? "blocked" : "pending",
          ...(record.candidateCommit ? { candidateRevisionId: record.candidateCommit } : {}),
          ...(desired === "integrated" && record.targetAfterRevisionId ? { targetAfterRevisionId: record.targetAfterRevisionId, resultRevisionId: record.targetAfterRevisionId } : {}) }, saved.recordVersion) as Integration;
      if (desired === "integrated" && record.targetAfterRevisionId) {
        const workflow = await store.getEntity(currentProjectId, workflowId);
        if (workflow?.entityType !== "Workflow") throw Error("Exact Workflow disappeared after integration.");
        await createProjectStateService(store, integrationApplication).closeIntegratedWorkflow(currentProjectId, workflowId, saved.id, workflow.recordVersion, record.targetAfterRevisionId);
      }
      return saved;
    } finally { store.close(); }
  }

  async function runIntegration() {
    const service = await candidate();
    let record = service.list(workflowId).find(item => !["aborted", "integrated"].includes(item.status)) ?? service.list(workflowId).find(item => item.status === "integrated");
    if (!record) record = await service.create();
    await sync(record);
    if (record.status === "validated") record = await service.advance(record.candidateId);
    return { candidate: record, integration: await sync(record) };
  }
  return { query: async () => { const current = await snapshot(); const service = await candidate(); return { completion: current.completion, candidates: service.list(workflowId) }; }, integrate: runIntegration,
    prepareRepair: async (candidateId: string) => (await candidate()).prepareRepair(candidateId),
    requestOperatorDecision: async (candidateId: string, repairId: string, rationale: string) => (await candidate()).requestOperatorDecision(candidateId, repairId, rationale),
    applyRepair: async (candidateId: string, repairId: string, patches: IntegrationRepairPatch[]) => (await candidate()).applyRepairPatch(candidateId, repairId, patches),
    completeRepair: async (candidateId: string, repairId: string) => { const service = await candidate(); const result = await service.completeRepair(candidateId, repairId);
      let record = result.candidate; await sync(record); if (record.status === "validated") record = await service.advance(candidateId);
      return { ...result, candidate: record, integration: await sync(record) }; },
    retryValidation: async (candidateId: string) => { const service = await candidate(); let record = await service.retryValidation(candidateId); await sync(record);
      if (record.status === "validated") record = await service.advance(candidateId); return { candidate: record, integration: await sync(record) }; },
    abort: async (candidateId: string) => { const record = await (await candidate()).abort(candidateId); await sync(record); return record; } };
}
