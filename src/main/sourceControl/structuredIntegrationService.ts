import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import type { ProjectStateRecord } from "../../shared/projectState/domainContracts";
import { createProjectStateService } from "../../shared/projectState/projectStateService";
import type { IntegrationCandidateRecord } from "../../shared/integrationCandidateContracts";
import type { IntegrationCompletionEvidence } from "../../shared/integrationCompletionContracts";
import type { IntegrationRepairPatch, IntegrationRepairPolicy } from "../../shared/integrationRepairContracts";
import type { WorkIntakeBranchBinding } from "../../shared/workIntakeBranchContracts";
import { integrationSourceBytes, integrationSourceDigest } from "../agentHarness/repository/integrationRepairGit";
import { integrationPaths, readIntegrationCommitFile } from "../agentHarness/repository/integrationGit";
import { createSQLiteProjectStateStore } from "../projectState/sqliteProjectStateStore";
import { createIntegrationCandidateService, type IntegrationCandidateHooks } from "../planExecution/integrationCandidateService";
import { createIntegrationPolicyProvider, loadIntegrationPolicy, loadIntegrationPolicyAtCommit } from "../planExecution/integrationPolicyProvider";
import { deriveIntegrationRepairEditablePaths } from "../planExecution/integrationRepairPolicyProvider";
import { createSourceControlService } from "./sourceControlService";
import { selectedStructuredProjectId } from "../workIntake/structuredWorkIntakeService";
import { resolveManagedProjectSourceTopology, resolveManagedWorkflowCheckoutPath } from "./projectSourceTopology";

const principal = { principalId: "local-operator", principalType: "human" as const, role: "Operator" };
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
type Store = ReturnType<typeof createSQLiteProjectStateStore>;
type Integration = ProjectStateRecord<"IntegrationRecord">;
type Binding = ProjectStateRecord<"SourceBinding">;

/** Structured Work Intake completion uses the same application-owned candidate engine as routed Markdown work. */
export function createStructuredIntegrationService(root: string, projectId: string, intakeId: string,
  overrides: Pick<IntegrationCandidateHooks, "checks" | "repairPolicy" | "repairContext"> = {}) {
  const selected = fs.realpathSync(root);
  const devRoot = resolveManagedProjectSourceTopology(selected).devCheckoutRoot;
  if (selectedStructuredProjectId(selected) !== projectId) throw Error("Selected structured Project authority is unavailable.");
  const file = path.join(selected, ".champcity", "project-state.sqlite");
  const open = () => createSQLiteProjectStateStore(file);
  async function bindingForTargetWorkflow(store: ReturnType<typeof createSQLiteProjectStateStore>, targetWorkflowId: string) {
    const target = await store.getEntity(projectId, targetWorkflowId);
    if (target?.entityType !== "Workflow") throw Error("Work Intake target Workflow is unavailable.");
    const lineageIds = new Set((await store.listEntities(projectId, "Workflow"))
      .filter(row => row.entityType === "Workflow" && row.lineageId === target.lineageId).map(row => row.id));
    const bindings = (await store.listEntities(projectId, "SourceBinding"))
      .filter((row): row is Binding => row.entityType === "SourceBinding" && lineageIds.has(row.body.workflowId) && row.lifecycleState === "active");
    if (bindings.length !== 1) throw Error("Work Intake has no unique SourceBinding.");
    const binding = bindings[0];
    const baseline = await store.getEntity(projectId, binding.body.sourceBaselineId);
    const owner = await store.getEntity(projectId, binding.body.workflowId);
    const baselineOwner = baseline?.entityType === "SourceBaseline" ? await store.getEntity(projectId, baseline.body.workflowId) : null;
    if (baseline?.entityType !== "SourceBaseline" || owner?.entityType !== "Workflow" || baselineOwner?.entityType !== "Workflow" || owner.lineageId !== baselineOwner.lineageId)
      throw Error("SourceBinding baseline and Workflow lineage mismatch.");
    return binding;
  }
  async function completion(): Promise<{ binding: WorkIntakeBranchBinding; completion: IntegrationCompletionEvidence; summary: string }> {
    const store = open();
    try {
      const state = createProjectStateService(store, principal);
      const intake = await store.getEntity(projectId, intakeId);
      if (intake?.entityType !== "WorkIntake" || intake.body.intakeState !== "closed" || intake.body.requestedIntegrationTarget !== "dev")
        throw Error("Structured integration requires a completed Work Intake targeting dev.");
      const intakeSummary = await state.getWorkIntakeSummary(projectId, intakeId);
      if (!intakeSummary.targetWorkflowId) throw Error("Completed Work Intake has no target Workflow.");
      const selectedBinding = await bindingForTargetWorkflow(store, intakeSummary.targetWorkflowId);
      const source = selectedBinding.body;
      const baseline = await store.getEntity(projectId, source.sourceBaselineId);
      const bindingWorkflow = await store.getEntity(projectId, source.workflowId);
      const baselineWorkflow = baseline?.entityType === "SourceBaseline" ? await store.getEntity(projectId, baseline.body.workflowId) : null;
      if (baseline?.entityType !== "SourceBaseline" || bindingWorkflow?.entityType !== "Workflow" || baselineWorkflow?.entityType !== "Workflow" || baselineWorkflow.lineageId !== bindingWorkflow.lineageId) throw Error("SourceBinding baseline and Workflow lineage mismatch.");
      if (source.preparationState !== "ready" || !baseline.body.baseRevisionId || !source.workSourceLineId || !source.currentRevisionId || baseline.body.integrationTargetSourceLineId !== "dev")
        throw Error("Completed Work Intake has no ready exact source revision.");
      if (!source.repositoryCheckoutId || source.preparationState !== "ready" || !source.currentRevisionId || !source.workSourceLineId) throw Error("Completed Workflow has no ready RepositoryCheckout.");
      const workflowIds = new Set((await store.listEntities(projectId, "Workflow"))
        .filter(row => row.entityType === "Workflow" && row.lineageId === bindingWorkflow.lineageId).map(row => row.id));
      const checkpoints = (await store.listEntities(projectId, "SourceCheckpoint"))
        .filter((row): row is ProjectStateRecord<"SourceCheckpoint"> => row.entityType === "SourceCheckpoint" && workflowIds.has(row.body.workflowId));
      if (checkpoints.some(row => row.body.checkpointState !== "committed")) throw Error("Completed Work Intake has unresolved source checkpoints.");
      const byPrior = new Map<string, string>();
      for (const checkpoint of checkpoints) {
        const prior = checkpoint.body.expectedRevisionId;
        const resulting = checkpoint.body.resultingRevisionId;
        if (!resulting || byPrior.has(prior)) throw Error("Completed Work Intake source checkpoint chain is ambiguous.");
        byPrior.set(prior, resulting);
      }
      let chained = baseline.body.baseRevisionId;
      for (let index = 0; index < checkpoints.length; index++) {
        const next = byPrior.get(chained);
        if (!next || next === chained) throw Error("Completed Work Intake source checkpoint chain has a gap.");
        chained = next;
      }
      if (chained !== source.currentRevisionId) throw Error("Completed Work Intake source revision lacks a saved checkpoint chain.");
      const current = await state.getWorkIntakeSummary(projectId, intakeId);
      if (!current.currentRoute) throw Error("Completed Work Intake has no current Operator route.");
      const binding: WorkIntakeBranchBinding = { intakeId, repositoryId: baseline.body.repositoryId,
        baseBranch: "dev", baseCommit: baseline.body.baseRevisionId, workBranch: source.workSourceLineId, currentHead: source.currentRevisionId };
      const summary = JSON.stringify({ intakeId, request: current.request, desiredOutcome: current.desiredOutcome,
        constraints: current.constraints, route: current.currentRoute.route, decisionId: current.currentRoute.decisionId,
        sourceRevisionId: source.currentRevisionId, checkpointIds: checkpoints.map(row => row.id).sort() });
      return { binding, completion: { kind: "plan", routeDecisionId: current.currentRoute.decisionId,
        completionId: intakeId, revision: intake.recordVersion, fingerprint: digest(summary),
        sourcePath: `semantic/work-intake/${intakeId}` }, summary };
    } finally { store.close(); }
  }
  let repositoryId: string;
  async function verifyBinding(binding: WorkIntakeBranchBinding) {
    const loaded = await completion();
    if (JSON.stringify(loaded.binding) !== JSON.stringify(binding)) throw Error("Structured SourceBinding changed before integration.");
    const store = open();
    let sourceRoot: string;
    try {
      const intakeSummary = await createProjectStateService(store, principal).getWorkIntakeSummary(projectId, intakeId);
      if (!intakeSummary.targetWorkflowId) throw Error("Integration Work Intake has no target Workflow.");
      const owner = await store.getEntity(projectId, intakeSummary.targetWorkflowId);
      const sourceBinding = await bindingForTargetWorkflow(store, intakeSummary.targetWorkflowId);
      const baseline = await store.getEntity(projectId, sourceBinding.body.sourceBaselineId);
      if (owner?.entityType !== "Workflow" || baseline?.entityType !== "SourceBaseline" || sourceBinding.body.repositoryCheckoutId !== `workflow-${baseline.body.workflowId}`) throw Error("Workflow RepositoryCheckout identity is invalid.");
      sourceRoot = resolveManagedWorkflowCheckoutPath(selected, baseline.body.workflowId).checkoutRoot;
    } finally { store.close(); }
    const source = createSourceControlService({ repositoryRoot: sourceRoot, repositoryId: binding.repositoryId });
    const branches = await source.branches(binding.workBranch);
    const sourceStatus = await source.status();
    if (!branches.ok || branches.result.currentBranch !== binding.workBranch || branches.result.selectedBranch?.commit !== binding.currentHead ||
      !sourceStatus.ok || !sourceStatus.result.clean)
      throw Error("Completed Work Intake source line differs from its saved exact revision.");
    return binding;
  }
  async function repairPolicy(record: IntegrationCandidateRecord): Promise<IntegrationRepairPolicy> {
    const loaded = await completion();
    if (JSON.stringify(loaded.completion) !== JSON.stringify(record.completion) || loaded.binding.currentHead !== record.incomingCommit)
      throw Error("Structured Integration Repair completion changed.");
    const snapshot = await loadIntegrationPolicyAtCommit(devRoot, record.targetCommit);
    const scope = snapshot.policy.repair;
    if (!scope) throw Error("Integration Repair requires target-owned bounded repair policy.");
    if (loadIntegrationPolicy(integrationPaths(devRoot, record.candidateId).checkout).textSha256 !== snapshot.textSha256)
      throw Error("Integration Repair policy changed.");
    const source = createSourceControlService({ repositoryRoot: devRoot, repositoryId: record.repositoryId });
    const changed = await source.integrationRepairChangedPaths({ candidateId: record.candidateId, mergeBase: record.mergeBase, incomingCommit: record.incomingCommit });
    const inspected = await source.inspectIntegration(record.candidateId);
    if (!changed.ok || !inspected.ok) throw Error("Integration Repair candidate evidence is unavailable.");
    const sources = scope.sources;
    const editablePaths = deriveIntegrationRepairEditablePaths(scope, sources, record.conflictingPaths, inspected.result.conflictingPaths, changed.result);
    for (const entry of sources) {
      const local = integrationSourceBytes(devRoot, entry.path);
      const candidate = integrationSourceBytes(integrationPaths(devRoot, record.candidateId).checkout, entry.path);
      const target = await readIntegrationCommitFile(devRoot, record.targetCommit, entry.path, 250_000);
      if (local === null || candidate === null || local.replaceAll("\r\n", "\n") !== target.toString("utf8").replaceAll("\r\n", "\n") ||
        candidate.replaceAll("\r\n", "\n") !== local.replaceAll("\r\n", "\n")) throw Error("Integration Repair governing source changed.");
    }
    return { sources, editablePaths, policySha256: snapshot.sha256 };
  }
  async function repairContext(record: IntegrationCandidateRecord, policy: IntegrationRepairPolicy) {
    const loaded = await completion();
    if (JSON.stringify(loaded.completion) !== JSON.stringify(record.completion)) throw Error("Structured Work Intake intent changed.");
    const sourceDigests: Record<string, string> = { [`semantic/work-intake/${intakeId}`]: digest(loaded.summary) };
    const context = [`### Work Intake semantic completion\n\n${loaded.summary}`];
    for (const source of policy.sources) {
      const bytes = integrationSourceBytes(devRoot, source.path);
      if (bytes === null) throw Error("Integration Repair governing source is missing.");
      sourceDigests[source.path] = integrationSourceDigest(bytes);
      context.push(`### ${source.role}: ${source.path}\n\n${bytes}`);
    }
    return { sourceDigests, context: context.join("\n\n") };
  }
  let engine: ReturnType<typeof createIntegrationCandidateService> | null = null;
  async function candidate() {
    if (!engine) {
      repositoryId = (await completion()).binding.repositoryId;
      engine = createIntegrationCandidateService({ repositoryRoot: devRoot, repositoryId,
        load: async () => { const current = await completion(); return { binding: current.binding, completion: current.completion }; },
        verifyBinding, requiredTargetBranch: "dev",
        ...(overrides.checks ? { checks: overrides.checks } : createIntegrationPolicyProvider(devRoot)),
        repairPolicy: overrides.repairPolicy ?? repairPolicy, repairContext: overrides.repairContext ?? repairContext });
    }
    return engine;
  }
  async function sync(record: IntegrationCandidateRecord): Promise<Integration> {
    const store = open();
    try {
      const state = createProjectStateService(store, principal);
      const summary = await state.getWorkIntakeSummary(projectId, intakeId);
      if (!summary.targetWorkflowId) throw Error("Integration Work Intake has no target Workflow.");
      const binding = await bindingForTargetWorkflow(store, summary.targetWorkflowId);
      if (binding.body.currentRevisionId !== record.incomingCommit) throw Error("Integration SourceBinding changed.");
      const workflow = await store.getEntity(projectId, summary.targetWorkflowId);
      if (workflow?.entityType !== "Workflow") throw Error("Integration target Workflow is unavailable.");
      const lineageIds = new Set((await store.listEntities(projectId, "Workflow")).filter(row => row.entityType === "Workflow" && row.lineageId === workflow.lineageId).map(row => row.id));
      const existing = (await store.listEntities(projectId, "IntegrationRecord"))
        .filter((row): row is Integration => row.entityType === "IntegrationRecord" && lineageIds.has(row.body.workflowId) &&
          row.body.incomingRevisionId === record.incomingCommit && row.body.targetBeforeRevisionId === record.targetCommit);
      if (existing.length > 1) throw Error("Structured integration evidence is ambiguous.");
      let saved = existing[0] ?? await state.createIntegrationRecord(projectId, binding.id, summary.targetWorkflowId,
        { targetBeforeRevisionId: record.targetCommit, ...(record.candidateCommit ? { candidateRevisionId: record.candidateCommit } : {}) }) as Integration;
      if (saved.body.integrationState === "integrated") {
        if (saved.body.resultRevisionId !== record.targetAfterRevisionId) throw Error("Integrated target result conflicts with saved evidence.");
        return saved;
      }
      if (saved.body.integrationState === "prepared") saved = await state.advanceIntegrationRecord(projectId, saved.id,
        { integrationState: "validating", ...(record.candidateCommit ? { candidateRevisionId: record.candidateCommit } : {}) }, saved.recordVersion) as Integration;
      const priorProofs = await Promise.all(saved.body.validationIds.map(id => store.getEntity(projectId, id)));
      const currentProofs = record.validation.every(proof => priorProofs.some(row => row?.entityType === "Validation" &&
        row.body.method === proof.checkId && row.body.outcome === (proof.exitCode === 0 ? "pass" : "fail") &&
        row.body.sourceBaselineRef === record.candidateCommit));
      if (record.validation.length && !currentProofs) {
        const ids: string[] = [];
        for (const proof of record.validation) {
          const validation = await state.recordValidation(projectId, saved.id, { validationType: "integration",
            method: proof.checkId, outcome: proof.exitCode === 0 ? "pass" : "fail", summary: proof.summary,
            ...(record.candidateCommit ? { sourceBaselineRef: record.candidateCommit } : {}) });
          ids.push(validation.id);
        }
        saved = await state.advanceIntegrationRecord(projectId, saved.id, { validationIds: [...saved.body.validationIds, ...ids] }, saved.recordVersion) as Integration;
      }
      const desired = record.status === "integrated" ? "integrated" : record.status === "validated" ? "ready" :
        ["conflicted", "validation-failed"].includes(record.status) ? "repairing" : "blocked";
      if (saved.body.integrationState === "blocked" && ["ready", "repairing"].includes(desired)) saved = await state.advanceIntegrationRecord(projectId, saved.id,
        { integrationState: "validating" }, saved.recordVersion) as Integration;
      if (desired === "integrated" && saved.body.integrationState !== "ready") saved = await state.advanceIntegrationRecord(projectId, saved.id,
        { integrationState: "ready", ...(record.candidateCommit ? { candidateRevisionId: record.candidateCommit } : {}) }, saved.recordVersion) as Integration;
      if (saved.body.integrationState !== desired) saved = await state.advanceIntegrationRecord(projectId, saved.id,
        { integrationState: desired, outcome: desired === "integrated" ? "integrated" : desired === "blocked" ? "blocked" : "pending",
          ...(record.candidateCommit ? { candidateRevisionId: record.candidateCommit } : {}),
          ...(desired === "integrated" && record.targetAfterRevisionId ? { targetAfterRevisionId: record.targetAfterRevisionId, resultRevisionId: record.targetAfterRevisionId } : {}) },
        saved.recordVersion) as Integration;
      return saved;
    } finally { store.close(); }
  }
  return {
    async query() { const current = await completion(); const service = await candidate();
      const records = service.list(intakeId).filter(row => JSON.stringify(row.completion) === JSON.stringify(current.completion));
      const store = open();
      try { const state = createProjectStateService(store, principal);
        const summary = await state.getWorkIntakeSummary(projectId, intakeId);
        const workflow = summary.targetWorkflowId ? await store.getEntity(projectId, summary.targetWorkflowId) : null;
        if (workflow?.entityType !== "Workflow") throw Error("Integration target Workflow is unavailable.");
        const lineageIds = new Set((await store.listEntities(projectId, "Workflow")).filter(row => row.entityType === "Workflow" && row.lineageId === workflow.lineageId).map(row => row.id));
        const integrations = (await store.listEntities(projectId, "IntegrationRecord"))
        .filter((row): row is Integration => row.entityType === "IntegrationRecord" && lineageIds.has(row.body.workflowId));
        return { completion: current.completion, candidates: records, integrations }; }
      finally { store.close(); } },
    async integrate() { const service = await candidate(); const current = await completion();
      const records = service.list(intakeId).filter(row => JSON.stringify(row.completion) === JSON.stringify(current.completion));
      let record = records.find(row => !["aborted", "integrated"].includes(row.status)) ?? records.find(row => row.status === "integrated");
      if (!record) record = await service.create();
      await sync(record);
      if (record.status === "validated") record = await service.advance(record.candidateId);
      return { candidate: record, integration: await sync(record) }; },
    async prepareRepair(candidateId: string) { return (await candidate()).prepareRepair(candidateId); },
    async applyRepair(candidateId: string, repairId: string, patches: IntegrationRepairPatch[]) { return (await candidate()).applyRepairPatch(candidateId, repairId, patches); },
    async completeRepair(candidateId: string, repairId: string) { const service = await candidate(); const repaired = await service.completeRepair(candidateId, repairId);
      let record = repaired.candidate; await sync(record); if (record.status === "validated") record = await service.advance(candidateId);
      return { candidate: record, integration: await sync(record), attempt: repaired.attempt }; },
    async retryValidation(candidateId: string) { const service = await candidate(); let record = await service.retryValidation(candidateId);
      await sync(record); if (record.status === "validated") record = await service.advance(candidateId);
      return { candidate: record, integration: await sync(record) }; },
    async abort(candidateId: string) { const record = await (await candidate()).abort(candidateId); return { candidate: record, integration: await sync(record) }; },
  };
}
