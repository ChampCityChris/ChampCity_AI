import {EXACT_EXECUTION_WORKFLOW_TYPES} from "../../shared/projectState/workflowTypeRegistry";
import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import type { EntityId, ProjectId, ProjectStateRecord } from "../../shared/projectState/domainContracts";
import { createProjectStateService, type WorkflowExecutionPlanView } from "../../shared/projectState/projectStateService";
import type { ProjectStateStore } from "../../shared/projectState/projectStateStore";
import type { PhaseValidationProjection, WorkItemExecutionContract, WorkItemValidationProjection, WorkflowCheckpointRecoveryProjection, WorkflowExecutionCompletionProjection, WorkflowExecutionPreparationResult, WorkflowExecutionProjection, WorkflowWorkItemDecompositionInput } from "../../shared/workflowApplicationContracts";
import { createSQLiteProjectStateStore } from "../projectState/sqliteProjectStateStore";
import { selectedCurrentProjectId } from "../projectState/currentProjectRegistrationService";
import type { CodexModelSelection } from "../../shared/codexRuntimeContracts";
import { resolveManagedWorkflowCheckoutPath } from "../sourceControl/projectSourceTopology";
import { reviewWorkItemCriterion } from "./semanticWorkItemValidator";
import { loadCodexAppServerAdapter, type CodexAppServerAdapter } from "../workCardBuilding/codexAppServerTransport";
import { runBoundedGit } from "../core/gitExecution";
import { reconcileWorkflowSource } from "../sourceControl/workflowSourceReconciliation";
import { acquireWorkflowExecutionLease, workflowExecutionLeaseKey } from "../workCardBuilding/workflowExecutionLease";
import { runDeterministicWorkItemProfile } from "./deterministicWorkItemValidator";
import { checkpointStructuredTesterResult, inspectLegacyImplementationCheckpoint, retryStructuredImplementationCheckpoint } from "../sourceControl/structuredWorkflowCheckpointService";

const operator = { principalId: "local-operator", principalType: "human" as const, role: "Operator" };
const workflowApplication = { principalId: "workflow-execution-application", principalType: "system" as const, role: "System" };
const workflowCompletionApplication = { principalId: "workflow-execution-completion", principalType: "system" as const, role: "WorkflowExecution" };
type WorkflowRecord = ProjectStateRecord<"Workflow">;
const implementationWorkflowTypes: ReadonlySet<string> = new Set([...EXACT_EXECUTION_WORKFLOW_TYPES, "project-creation"]);

function isCurrentWorkflow(record: WorkflowRecord): boolean {
  return record.lifecycleState === "active" && record.body.workflowState !== "closed" && record.body.workflowState !== "cancelled";
}

/** Shared exact-Workflow post-plan execution projection and lazy source preparation boundary. */
export function createWorkflowExecutionApplicationService(dependencies: {
  openStore?: (databasePath: string) => ProjectStateStore & { close(): void };
  selectedProjectId?: typeof selectedCurrentProjectId;
  materializeWorkflowSource?: (projectRoot: string, projectId: ProjectId, workflowId: EntityId) => Promise<{
    binding: ProjectStateRecord<"SourceBinding">; checkout: import("../../shared/sourceLifecycleContracts").RepositoryCheckout;
  }>;
  createValidatorAdapter?: () => Promise<CodexAppServerAdapter>;
} = {}) {
  const openStore = dependencies.openStore ?? createSQLiteProjectStateStore;
  const getSelectedProjectId = dependencies.selectedProjectId ?? selectedCurrentProjectId;
  const createValidatorAdapter = dependencies.createValidatorAdapter ?? loadCodexAppServerAdapter;

  async function withCurrentProject<T>(projectRoot: string, action: (store: ProjectStateStore, projectId: ProjectId) => Promise<T>): Promise<T> {
    if (typeof projectRoot !== "string" || !projectRoot.trim()) throw Error("Current Project root is required.");
    const canonicalRoot = fs.realpathSync(projectRoot);
    const projectId = getSelectedProjectId(canonicalRoot);
    if (!projectId) throw Error("Selected Project is not a registered Current Project.");
    const store = openStore(path.join(canonicalRoot, ".champcity", "project-state.sqlite"));
    try {
      const project = await store.getProject(projectId);
      if (!project || project.id !== projectId || project.lifecycleState !== "active") throw Error("Selected Current Project State is unavailable.");
      return await action(store, projectId);
    } finally { store.close(); }
  }

  async function exactPlan(store: ProjectStateStore, projectId: ProjectId, workflowId: EntityId): Promise<WorkflowExecutionPlanView> {
    const workflow = await store.getEntity(projectId, workflowId);
    if (workflow?.entityType !== "Workflow" || workflow.projectId !== projectId || !isCurrentWorkflow(workflow) || !implementationWorkflowTypes.has(workflow.body.workflowType))
      throw Error("Execution requires a current supported implementation Workflow in this Project.");
    const lineage = (await store.listEntities(projectId, "Workflow"))
      .filter((record): record is WorkflowRecord => record.entityType === "Workflow" && record.lineageId === workflow.lineageId);
    const current = lineage.filter(isCurrentWorkflow);
    if (current.length !== 1 || current[0].id !== workflowId) throw Error("Execution Workflow ID is not the unique current Workflow in its lineage.");
    const fullPlan = await createProjectStateService(store, operator).getWorkflowExecutionPlan(projectId, workflowId);
    // Architect solutions are review context, not accepted execution directions.
    // Preserve Greenfield's Phase-owned directions; existing-project execution uses
    // only solutions governed by the exact planning-acceptance Decisions.
    const acceptedIds = new Set((await store.listRelationships(projectId, "governs"))
      .filter(edge => !edge.endedAt && fullPlan.decisions.some(decision => decision.id === edge.fromEntityId))
      .map(edge => edge.toEntityId));
    const plan = workflow.body.workflowType === "project-creation" ? fullPlan : {
      ...fullPlan,
      solutions: fullPlan.solutions.filter(solution => acceptedIds.has(solution.id)),
      criteria: fullPlan.criteria.filter(entry => !fullPlan.solutions.some(solution => solution.id === entry.ownerId) || acceptedIds.has(entry.ownerId)),
    };
    if (workflow.body.workflowType === "research-prototype" && (plan.solutions.length !== 1 || ![...plan.directWorkItems, ...Object.values(plan.workItemsByPhase).flat()].length)) throw Error("Research requires an accepted implementation Plan before execution; no-Plan outcomes cannot enter execution.");
    return plan;
  }

  async function workItemPlan(store: ProjectStateStore, projectId: ProjectId, plan: WorkflowExecutionPlanView, workItemId: EntityId) {
    if (plan.workflow.body.workflowType !== "project-creation") return plan;
    const ids = new Set((await store.listRelationships(projectId, "implements")).filter(edge => !edge.endedAt && edge.fromEntityId === workItemId).map(edge => edge.toEntityId));
    const solutions = plan.solutions.filter(solution => ids.has(solution.id));
    if (solutions.length !== 1) throw Error("Greenfield WorkItem requires its one exact accepted Phase direction.");
    return {...plan, solutions, criteria: plan.criteria.filter(entry => !plan.solutions.some(solution => solution.id === entry.ownerId) || ids.has(entry.ownerId))};
  }

  async function currentPhaseTesterIds(store: ProjectStateStore, projectId: ProjectId, plan: WorkflowExecutionPlanView, workItemIds: EntityId[], sourceRevisionId: string | null) {
    const state = createProjectStateService(store, operator), results: EntityId[] = [];
    const revisionChain = sourceRevisionId === null ? null : await state.getWorkflowSourceRevisionChain(projectId, plan.workflow.id);
    if (sourceRevisionId !== null && revisionChain?.at(-1) !== sourceRevisionId) throw Error("Current Workflow source revision is not the terminal checkpoint-chain revision.");
    for (const workItemId of workItemIds) {
      const implementation = (await state.getImplementationAttempts(projectId, workItemId)).at(-1);
      if (!implementation || implementation.body.outcome !== "implemented") continue;
      const testers = (await store.listEntities(projectId, "TesterResult")).filter((record): record is ProjectStateRecord<"TesterResult"> => record.entityType === "TesterResult" &&
        record.body.workflowId === plan.workflow.id && record.body.workItemId === workItemId && record.body.implementationRecordId === implementation.id && ["not-required", "committed"].includes(record.body.checkpointState));
      if (testers.length !== 1) continue;
      const tester = testers[0];
      if (sourceRevisionId === null) {
        if (tester.body.sourceMode === "source-neutral" && !tester.body.candidateRevisionId) results.push(tester.id);
        continue;
      }
      if (tester.body.sourceMode !== "source-backed" || !tester.body.candidateRevisionId || !revisionChain?.includes(tester.body.candidateRevisionId)) continue;
      const checkpoints = await store.listEntities(projectId, "SourceCheckpoint");
      const checkpointEdges = await store.listRelationships(projectId, "checkpoints");
      if (tester.body.checkpointState === "committed") {
        const checkpoint = tester.body.sourceCheckpointId ? checkpoints.find(record => record.entityType === "SourceCheckpoint" && record.id === tester.body.sourceCheckpointId) : null;
        if (checkpoint?.entityType === "SourceCheckpoint" && checkpoint.body.workflowId === plan.workflow.id && checkpoint.body.resultingRevisionId === tester.body.candidateRevisionId && checkpointEdges.some(edge => edge.fromEntityId === checkpoint.id && edge.toEntityId === tester.id && !edge.endedAt)) results.push(tester.id);
      } else if (tester.body.checkpointState === "not-required" && tester.body.candidateRevisionId === tester.body.implementerRevisionId && checkpoints.some(record => record.entityType === "SourceCheckpoint" && record.body.workflowId === plan.workflow.id && record.body.checkpointKind === "implementation" && record.body.resultingRevisionId === tester.body.candidateRevisionId && checkpointEdges.some(edge => edge.fromEntityId === record.id && edge.toEntityId === implementation.id && !edge.endedAt))) results.push(tester.id);
    }
    return results;
  }

  async function currentPhaseSemanticMembers(store: ProjectStateStore, projectId: ProjectId, plan: WorkflowExecutionPlanView,
    workItemIds: EntityId[], sourceRevisionId: string | null) {
    const testerIds = await currentPhaseTesterIds(store, projectId, plan, workItemIds, sourceRevisionId);
    if (testerIds.length !== workItemIds.length) throw Error("Phase validation requires current completed Tester evidence for every member WorkItem.");
    const members = [...plan.directWorkItems, ...Object.values(plan.workItemsByPhase).flat()];
    const validations = await store.listEntities(projectId, "Validation");
    const evaluates = await store.listRelationships(projectId, "evaluates");
    const projected = [];
    for (const testerId of testerIds) {
      const tester = await store.getEntity(projectId, testerId);
      const workItem = tester?.entityType === "TesterResult" ? members.find(item => item.id === tester.body.workItemId) : null;
      if (tester?.entityType !== "TesterResult" || !workItem) throw Error("Phase member evidence no longer matches the exact Workflow.");
      const implementation = await store.getEntity(projectId, tester.body.implementationRecordId);
      if (implementation?.entityType !== "ImplementationRecord") throw Error("Phase member implementation is unavailable.");
      const criterionOutcomes: string[] = [];
        const criterionIds = plan.criteria.filter(entry => entry.ownerId === workItem.id || plan.solutions.some(solution => solution.id === entry.ownerId)).map(entry => entry.record.id);
        for (const criterionId of criterionIds) {
          const criterion = await store.getEntity(projectId, criterionId);
          if (criterion?.entityType !== "Criterion") continue;
          const criterionOwner = plan.criteria.find(entry => entry.record.id === criterionId)?.ownerId;
          const criterionSourceRevision = plan.solutions.some(solution => solution.id === criterionOwner) ? sourceRevisionId : tester.body.candidateRevisionId ?? sourceRevisionId;
          const results = validations.filter((record): record is ProjectStateRecord<"Validation"> => record.entityType === "Validation" && record.body.targetEntityId === criterionId && record.body.targetRecordVersion === criterion.recordVersion &&
          record.body.implementationRecordId === implementation.id && (criterionSourceRevision === null ? record.body.sourceBaselineRef === undefined : record.body.sourceBaselineRef === criterionSourceRevision) &&
          evaluates.some(edge => edge.fromEntityId === record.id && edge.toEntityId === criterionId && !edge.endedAt));
        const latest = results.sort((a,b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)).at(-1);
        if (latest) criterionOutcomes.push(`${criterion.body.statement}: ${latest.body.outcome}`);
      }
      projected.push({ workItem, implementation: implementation as ProjectStateRecord<"ImplementationRecord">, testerResult: tester as ProjectStateRecord<"TesterResult">, criterionOutcomes });
    }
    return projected;
  }

  async function getExecutionProjection(projectRoot: string, workflowId: EntityId): Promise<WorkflowExecutionProjection> {
    if (typeof workflowId !== "string" || !workflowId.trim() || workflowId.length > 128) throw Error("Exact Workflow ID is required.");
    return withCurrentProject(projectRoot, async (store, projectId) => {
      const plan = await exactPlan(store, projectId, workflowId);
      return project(store, projectId, plan);
    });
  }

  async function getWorkflowExecutionCompletionProjection(projectRoot: string, workflowId: EntityId): Promise<WorkflowExecutionCompletionProjection> {
    if (typeof workflowId !== "string" || !workflowId.trim() || workflowId.length > 128) throw Error("Exact Workflow ID is required.");
    return withCurrentProject(projectRoot, async (store, projectId) => {
      const plan = await exactPlan(store, projectId, workflowId);
      const view = await project(store, projectId, plan);
      const blockers: string[] = [];
      if (plan.workflow.body.workflowType !== "project-creation" && (plan.solutions.length !== 1 || plan.decisions.length !== 1)) blockers.push("accepted-plan-missing-or-ambiguous");
      if (view.source.state !== "non-source" && view.source.state !== "ready") blockers.push("source-not-ready");
      const state = createProjectStateService(store, operator);
      if (plan.workflow.body.workflowType === "project-creation") blockers.push(...(await state.getProjectCompletionEligibility(projectId, workflowId, view.source.currentRevisionId ?? undefined)).blockers);
      for (const item of view.items) {
        if (item.record.body.workState !== "closed") blockers.push(`work-item-open:${item.record.id}`);
        else {
          const currentTester = await currentPhaseTesterIds(store, projectId, plan, [item.record.id], view.source.currentRevisionId);
          if (currentTester.length !== 1) blockers.push(`work-item:${item.record.id}:closed-evidence-not-on-workflow-lineage`);
          for (const dependencyId of item.dependencyIds) {
            const dependency = view.items.find(candidate => candidate.record.id === dependencyId);
            if (!dependency || dependency.record.body.workState !== "closed") blockers.push(`work-item:${item.record.id}:dependency:${dependencyId}`);
          }
          for (const repairId of item.repairIds) {
            const repair = view.items.find(candidate => candidate.record.id === repairId);
            if (!repair || repair.record.body.workState !== "closed") blockers.push(`work-item:${item.record.id}:repair-open:${repairId}`);
          }
        }
      }
      for (const phase of plan.phases) if (phase.record.body.phaseState !== "closed") blockers.push(`phase-open:${phase.phaseId}`);
      const repairIds = new Set(plan.repairIds.map(edge => edge.from));
      for (const repairId of repairIds) {
        const repair = await store.getEntity(projectId, repairId);
        if (repair?.entityType !== "WorkItem" || repair.body.workState !== "closed") blockers.push(`repair-open:${repairId}`);
      }
      const currentWorkflowIds = new Set([workflowId]);
      const blockerEdges = (await store.listRelationships(projectId, "blocks")).filter(edge => !edge.endedAt && currentWorkflowIds.has(edge.toEntityId));
      for (const edge of blockerEdges) {
        const source = await store.getEntity(projectId, edge.fromEntityId);
        if (source?.lifecycleState === "active") blockers.push(`blocking-record:${source.id}`);
      }
      const phaseAndSolutionOwners = new Set<EntityId>(plan.workflow.body.workflowType === "project-creation" ? [] : plan.solutions.map(solution => solution.id));
      for (const criterion of plan.criteria.filter(entry => phaseAndSolutionOwners.has(entry.ownerId) && entry.record.lifecycleState === "active" && entry.record.body.criticality === "required")) {
        if (criterion.record.body.validationPolicy === "deferred_visual_phase") continue;
        if (criterion.record.body.validationPolicy === "operator_decision") {
          const ownerPhase = plan.phases.find(phase => phase.phaseId === criterion.ownerId);
          const workItems = ownerPhase ? ownerPhase.workItemIds : [...plan.directWorkItems, ...Object.values(plan.workItemsByPhase).flat()].map(item => item.id);
          const evidenceIds = await currentPhaseTesterIds(store, projectId, plan, workItems, view.source.currentRevisionId);
          const disposition = await state.getCriterionOperatorDecisionStatus(projectId, criterion.record.id, evidenceIds);
          if (!disposition.current || !["approved", "accepted"].includes(disposition.state)) blockers.push(`criterion-decision:${criterion.record.id}`);
        } else {
          const proof = await state.getCriterionValidationStatus(projectId, criterion.record.id, view.source.currentRevisionId ?? undefined);
          if (!proof.satisfied) blockers.push(`criterion:${criterion.record.id}`);
        }
      }
      if (view.source.state !== "non-source") {
        try {
          const revisionChain = await state.getWorkflowSourceRevisionChain(projectId, workflowId);
          if (!revisionChain || revisionChain.at(-1) !== view.source.currentRevisionId) blockers.push("source-checkpoint-chain-stale");
        } catch { blockers.push("source-checkpoint-chain-unresolved"); }
      }
      const integrations = (await store.listEntities(projectId, "IntegrationRecord"))
        .filter((record): record is ProjectStateRecord<"IntegrationRecord"> => record.entityType === "IntegrationRecord" && record.body.workflowId === workflowId);
      if (view.source.state === "non-source" && integrations.length) blockers.push("source-neutral-has-integration-record");
      if (view.source.state !== "non-source" && integrations.some(record => !["failed", "blocked"].includes(record.body.integrationState))) blockers.push("integration-already-started");
      const unique = [...new Set(blockers)].sort();
      return { workflowId, workflowVersion: plan.workflow.recordVersion, sourceMode: view.source.state === "non-source" ? "source-neutral" : "source-backed",
        sourceRevisionId: view.source.currentRevisionId, eligible: unique.length === 0, blockers: unique };
    });
  }

  async function completeWorkflowExecution(projectRoot: string, workflowId: EntityId, expectedVersion: number) {
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) throw Error("Current Workflow version is required.");
    const eligibility = await getWorkflowExecutionCompletionProjection(projectRoot, workflowId);
    if (!eligibility.eligible || eligibility.workflowVersion !== expectedVersion) throw Error(`Workflow execution is not eligible: ${eligibility.blockers.join(", ") || "stale-version"}.`);
    return withCurrentProject(projectRoot, async (store, projectId) => createProjectStateService(store, workflowCompletionApplication)
      .completeWorkflowExecution(projectId, workflowId, expectedVersion, eligibility.sourceMode, eligibility.sourceRevisionId));
  }

  async function getWorkItemValidationProjection(projectRoot: string, workflowId: EntityId, workItemId: EntityId): Promise<WorkItemValidationProjection> {
    if (typeof workflowId !== "string" || !workflowId.trim() || workflowId.length > 128 ||
      typeof workItemId !== "string" || !workItemId.trim() || workItemId.length > 128) throw Error("Exact Workflow and WorkItem IDs are required.");
    return withCurrentProject(projectRoot, async (store, projectId) => {
      const plan = await workItemPlan(store, projectId, await exactPlan(store, projectId, workflowId), workItemId);
      const workflow = plan.workflow;
      const projection = await project(store, projectId, plan);
      const item = projection.items.find(candidate => candidate.record.id === workItemId);
      if (!item) throw Error("Exact WorkItem is not part of the selected current Workflow.");
      const state = createProjectStateService(store, operator);
      const attempts = await state.getImplementationAttempts(projectId, workItemId);
      const implementation = attempts.at(-1) ?? null;
      const testerResults = (await store.listEntities(projectId, "TesterResult"))
        .filter((record): record is ProjectStateRecord<"TesterResult"> => record.entityType === "TesterResult" &&
          record.body.workflowId === workflowId && record.body.workItemId === workItemId &&
          record.body.implementationRecordId === implementation?.id)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
      if (testerResults.length > 1) throw Error("Current implementation has duplicate TesterResults.");
      const tester = testerResults[0] ?? null;
      // Missing Tester evidence remains a completion blocker while the exact Tester can start.
      if (tester && tester.body.sourceMode !== (projection.source.state === "non-source" ? "source-neutral" : "source-backed"))
        throw Error("TesterResult source mode does not match the exact Workflow.");
      const criterionViews = [];
      const acceptedSolutionIds = new Set(plan.solutions.map(solution => solution.id));
      for (const { ownerId, record: criterion } of plan.criteria.filter(candidate => candidate.ownerId === workItemId || acceptedSolutionIds.has(candidate.ownerId))) {
        const related = await store.listRelationships(projectId, "evaluates");
        const validations = (await store.listEntities(projectId, "Validation"))
          .filter((record): record is ProjectStateRecord<"Validation"> => record.entityType === "Validation" &&
            related.some(edge => edge.fromEntityId === record.id && edge.toEntityId === criterion.id && !edge.endedAt) &&
            record.body.targetRecordVersion === criterion.recordVersion && record.body.implementationRecordId === implementation?.id &&
            (projection.source.state === "non-source" ? record.body.sourceBaselineRef === undefined : record.body.sourceBaselineRef === projection.source.currentRevisionId))
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
        const policy = criterion.body.validationPolicy;
        const latest = validations.at(-1);
        const decisionTargetId = policy === "operator_decision" ? criterion.id : null;
        const decisionEvidenceIds = policy !== "operator_decision" || !tester ? [] : plan.solutions.some(solution => solution.id === ownerId)
          ? await currentPhaseTesterIds(store, projectId, plan, [...plan.directWorkItems, ...Object.values(plan.workItemsByPhase).flat()].map(member => member.id), projection.source.currentRevisionId)
          : [tester.id];
        const decision = policy === "operator_decision" && decisionEvidenceIds.includes(tester?.id ?? "")
          ? await state.getCriterionOperatorDecisionStatus(projectId, criterion.id, decisionEvidenceIds) : null;
        const outcome = decisionTargetId
          ? decision?.current && ["approved", "accepted"].includes(decision.state) ? "pass" as const : decision?.current && decision.state === "rejected" ? "fail" as const : "pending" as const
          : latest?.body.outcome ?? (policy === "deferred_visual_phase" ? "deferred" as const : "pending" as const);
        criterionViews.push({ ownerId, criterion, policy, outcome, validationIds: validations.map(record => record.id),
          reason: policy === "visual_human" && !latest ? "Human visual evidence is required." : policy === "operator_decision" && outcome === "pending" ? "An explicit Operator Decision is required." :
            policy === "deferred_visual_phase" && !latest ? "Validation is deferred to the Phase boundary." : latest || policy === "operator_decision" && outcome === "pass" ? null : "Current exact validation evidence is missing.",
          repairable: outcome === "fail" && criterion.body.criticality === "required",
          humanEvidenceRequired: policy === "visual_human" || policy === "operator_decision", decisionTargetId, decisionState: decision?.state ?? "none",
          decisionId: decision?.current ? decision.decisionId : null });
      }
      const completion = await state.getWorkItemCompletionEligibility(projectId, workItemId, projection.source.currentRevisionId ?? undefined);
      if (projection.source.state !== "non-source" && projection.source.state !== "ready") completion.blockers.push("source-not-ready");
      if (projection.source.state !== "non-source" && (!tester || tester.body.sourceMode !== "source-backed" || !tester.body.candidateRevisionId || tester.body.candidateRevisionId !== projection.source.currentRevisionId))
        completion.blockers.push("tester-candidate-not-current");
      completion.blockers = [...new Set(completion.blockers)].sort();
      completion.eligible = completion.blockers.length === 0;
      return { workflowId, workItemId, workItemVersion: item.record.recordVersion,
        sourceMode: projection.source.state === "non-source" ? "source-neutral" : "source-backed",
        sourceRevisionId: projection.source.currentRevisionId, implementationRecordId: implementation?.id ?? null,
        testerResultId: tester?.id ?? null, criteria: criterionViews, completion: { eligible: completion.eligible, blockers: completion.blockers } };
    });
  }

  async function getCheckpointRecoveryProjection(projectRoot: string, workflowId: EntityId, workItemId: EntityId): Promise<WorkflowCheckpointRecoveryProjection> {
    return withCurrentProject(projectRoot, async (store, projectId) => {
      const plan = await exactPlan(store, projectId, workflowId);
      const item = [...plan.directWorkItems, ...Object.values(plan.workItemsByPhase).flat()].find(candidate => candidate.id === workItemId);
      if (!item) throw Error("Exact WorkItem is not part of the selected current Workflow.");
      const sourceMode = (await store.listRelationships(projectId, "baselines_source")).some(edge => edge.toEntityId === workflowId && !edge.endedAt) ? "source-backed" : "source-neutral";
      const implementations = await createProjectStateService(store, operator).getImplementationAttempts(projectId, workItemId);
      const implementation = implementations.at(-1) ?? null;
      const checkpointEdges = (await store.listRelationships(projectId, "checkpoints")).filter(edge => !edge.endedAt);
      const checkpoints = await store.listEntities(projectId, "SourceCheckpoint");
      const implementationCheckpointEdge = implementation && checkpointEdges.find(edge => edge.toEntityId === implementation.id);
      const implementationCheckpoint = implementationCheckpointEdge ? checkpoints.find(record => record.entityType === "SourceCheckpoint" && record.id === implementationCheckpointEdge.fromEntityId) : null;
      const testerResults = (await store.listEntities(projectId, "TesterResult")).filter((record): record is ProjectStateRecord<"TesterResult"> => record.entityType === "TesterResult" &&
        record.body.workflowId === workflowId && record.body.workItemId === workItemId && record.body.implementationRecordId === implementation?.id);
      if (testerResults.length > 1) throw Error("Current implementation has duplicate TesterResults.");
      const tester = testerResults[0] ?? null;
      const testerCheckpoint = tester?.body.sourceCheckpointId ? checkpoints.find(record => record.entityType === "SourceCheckpoint" && record.id === tester.body.sourceCheckpointId) : null;
      let packetValid = false;
      let inspectionReason: string | null = null;
      if (sourceMode === "source-backed" && implementation?.body.executionRef && item.body.workState === "validation_pending") {
        try {
          const packetPath = path.join(fs.realpathSync(projectRoot), ".champcity", "runtime", "work-item-attempts", `${implementation.body.executionRef}.json`);
          const packet = JSON.parse(fs.readFileSync(packetPath, "utf8")) as Record<string, unknown>;
          const attempt = packet.sourceCheckpointAttempt as Record<string, unknown> | undefined;
          packetValid = packet.workflowId === workflowId && packet.workItemId === workItemId && packet.projectId === projectId && packet.executionRef === implementation.body.executionRef &&
            Array.isArray(attempt?.attributablePaths) && attempt.attributablePaths.length > 0;
        } catch { packetValid = false; }
        if (!packetValid && (implementationCheckpoint?.entityType !== "SourceCheckpoint" || implementationCheckpoint.body.checkpointState !== "committed")) {
          try { await inspectLegacyImplementationCheckpoint(projectRoot, projectId, workflowId, workItemId, implementation.id); packetValid = true; }
          catch (error) { inspectionReason = error instanceof Error ? error.message : String(error); }
        }
      }
      const source = (await project(store, projectId, plan)).source;
      // The approved path list grants permission. Only exact execution evidence can
      // prove that no mutation occurred (including historical R13/R03 packets).
      let noMutationObserved = false;
      if (sourceMode === "source-backed" && implementation?.body.outcome === "implemented" && !implementationCheckpoint && implementation.body.executionRef) {
        try {
          const evidence = await getDurableImplementationEvidence(projectRoot, workflowId, workItemId, implementation.body.executionRef);
          const packetPath = path.join(fs.realpathSync(projectRoot), ".champcity", "runtime", "work-item-attempts", `${evidence.attempt.id}.json`);
          const stat = fs.lstatSync(packetPath);
          if (!stat.isFile() || stat.isSymbolicLink() || fs.realpathSync(packetPath) !== packetPath || stat.size > 48 * 1024)
            throw Error("Unchanged-source attempt packet is unavailable, redirected or oversized.");
          const packet = JSON.parse(fs.readFileSync(packetPath, "utf8"));
          const delta = packet.sourceCheckpointAttempt;
          noMutationObserved = !checkpoints.some(record => record.entityType === "SourceCheckpoint" && record.body.workflowId === workflowId && record.body.boundaryId === evidence.attempt.id) &&
            evidence.result.id === implementation.id && packet.schemaVersion === 1 && packet.projectId === projectId && packet.workflowId === workflowId &&
            typeof packet.contractDigest === "string" && /^[a-f0-9]{64}$/i.test(packet.contractDigest) &&
            packet.workItemId === workItemId && packet.executionRef === evidence.attempt.id &&
            ["summary", "deviations", "blockers", "residualRisks", "outcome"].every(key => JSON.stringify(packet.result?.[key]) === JSON.stringify((implementation.body as unknown as Record<string, unknown>)[key])) &&
            (!delta || Array.isArray(delta.attributablePaths) && delta.attributablePaths.length === 0 && !delta.attributionFailure &&
              delta.expectedRevisionId === evidence.attempt.body.sourceRevisionId && delta.repositoryCheckoutId === source.repositoryCheckoutId &&
              delta.sourceLineId === source.workSourceLineId &&
              (!evidence.historicalBinding?.body.repositoryCheckoutId || delta.repositoryCheckoutId === evidence.historicalBinding.body.repositoryCheckoutId) &&
              (!evidence.historicalBinding?.body.workSourceLineId || delta.sourceLineId === evidence.historicalBinding.body.workSourceLineId));
        } catch { noMutationObserved = false; }
      }
      const noMutationRevision = tester?.body.sourceMode === "source-backed" && tester.body.checkpointState === "committed" &&
        testerCheckpoint?.entityType === "SourceCheckpoint" && testerCheckpoint.body.checkpointState === "committed" && testerCheckpoint.body.checkpointKind === "tester" &&
        testerCheckpoint.body.workflowId === workflowId && testerCheckpoint.body.expectedRevisionId === tester.body.implementerRevisionId &&
        testerCheckpoint.body.resultingRevisionId === source.currentRevisionId && tester.body.candidateRevisionId === source.currentRevisionId
        ? tester.body.implementerRevisionId : source.currentRevisionId;
      let noMutationCurrent = sourceMode === "source-backed" && noMutationObserved && implementation?.body.outcome === "implemented" &&
        source.state === "ready" && Boolean(source.currentRevisionId) && await createProjectStateService(store, operator)
          .isSourceBackedNoMutationImplementation(projectId, workflowId, workItemId, implementation.id, noMutationRevision!);
      if (noMutationCurrent) {
        try {
          const managed = resolveManagedWorkflowCheckoutPath(fs.realpathSync(projectRoot), workflowId).checkoutRoot;
          const checkout = fs.realpathSync(managed);
          if (checkout !== managed || fs.lstatSync(managed).isSymbolicLink()) throw Error("Unchanged-source checkout is redirected.");
          const [head, top, branch, dirty, common, devCommon] = await Promise.all([
            runBoundedGit({ cwd: checkout, args: ["rev-parse", "HEAD"] }), runBoundedGit({ cwd: checkout, args: ["rev-parse", "--show-toplevel"] }),
            runBoundedGit({ cwd: checkout, args: ["branch", "--show-current"] }), runBoundedGit({ cwd: checkout, args: ["status", "--porcelain", "--untracked-files=all"] }),
            runBoundedGit({ cwd: checkout, args: ["rev-parse", "--git-common-dir"] }), runBoundedGit({ cwd: path.join(projectRoot, "Dev"), args: ["rev-parse", "--git-common-dir"] }),
          ]);
          noMutationCurrent = head.stdout.trim() === source.currentRevisionId && fs.realpathSync(top.stdout.trim()) === checkout &&
            branch.stdout.trim() === source.workSourceLineId && !dirty.stdout &&
            fs.realpathSync(path.resolve(checkout, common.stdout.trim())) === fs.realpathSync(path.resolve(projectRoot, "Dev", devCommon.stdout.trim()));
        } catch { noMutationCurrent = false; }
      }
      const implState = sourceMode === "source-neutral" ? "not-applicable" : implementationCheckpoint?.entityType === "SourceCheckpoint" ? implementationCheckpoint.body.checkpointState : implementation?.body.outcome === "implemented" ? noMutationCurrent ? "not-required" : packetValid ? "pending" : "inspection-required" : "not-required";
      const testerState = sourceMode === "source-neutral" ? "not-applicable" : tester?.body.checkpointState ?? "not-required";
      const implRetryable = sourceMode === "source-backed" && !noMutationCurrent && packetValid && item.body.workState === "validation_pending" && implState !== "committed";
      const testerRetryable = sourceMode === "source-backed" && Boolean(tester && tester.body.checkpointState === "pending" && tester.body.permanentTestPaths.length && item.body.workState === "validation_pending");
      return { workflowId, workItemId, sourceMode,
        implementation: { implementationRecordId: implementation?.id ?? null, checkpointId: implementationCheckpoint?.id ?? null, state: implState, retryable: implRetryable,
          reason: implRetryable ? null : implState === "not-applicable" || implState === "not-required" ? null : implState === "committed" ? "Implementation checkpoint is committed." : inspectionReason ?? "Exact durable implementation attribution is missing or no longer retryable." },
        tester: { implementationRecordId: implementation?.id ?? null, testerResultId: tester?.id ?? null, checkpointId: testerCheckpoint?.id ?? null, state: testerState, retryable: testerRetryable,
          reason: testerRetryable ? null : testerState === "not-applicable" ? null : testerState === "committed" || testerState === "not-required" ? null : "Exact pending TesterResult checkpoint is not safely retryable." } };
    });
  }

  async function retryImplementationCheckpoint(projectRoot: string, workflowId: EntityId, workItemId: EntityId, implementationRecordId: EntityId) {
    const projection = await getCheckpointRecoveryProjection(projectRoot, workflowId, workItemId);
    if (!projection.implementation.retryable || projection.implementation.implementationRecordId !== implementationRecordId) throw Error("Exact implementation checkpoint is not safely retryable.");
    return withCurrentProject(projectRoot, (_store, projectId) => retryStructuredImplementationCheckpoint(projectRoot, projectId, workflowId, workItemId, implementationRecordId));
  }

  async function retryTesterCheckpoint(projectRoot: string, workflowId: EntityId, workItemId: EntityId, implementationRecordId: EntityId, testerResultId: EntityId) {
    const projection = await getCheckpointRecoveryProjection(projectRoot, workflowId, workItemId);
    if (!projection.tester.retryable || projection.tester.implementationRecordId !== implementationRecordId || projection.tester.testerResultId !== testerResultId) throw Error("Exact Tester checkpoint is not safely retryable.");
    return withCurrentProject(projectRoot, (_store, projectId) => checkpointStructuredTesterResult(projectRoot, projectId, testerResultId));
  }

  async function decomposeWorkflowWorkItem(projectRoot: string, input: WorkflowWorkItemDecompositionInput) {
    if (!input || typeof input !== "object" || typeof input.workflowId !== "string" || !input.workflowId.trim() ||
      typeof input.workItemId !== "string" || !input.workItemId.trim() || !Number.isSafeInteger(input.expectedWorkItemVersion))
      throw Error("Exact Workflow, WorkItem, and expected WorkItem version are required for decomposition.");
    return withCurrentProject(projectRoot, async (store, projectId) => {
      const plan = await exactPlan(store, projectId, input.workflowId);
      const current = [...plan.directWorkItems, ...Object.values(plan.workItemsByPhase).flat()].find(item => item.id === input.workItemId);
      if (!current || !["planned", "ready"].includes(current.body.workState) || current.recordVersion !== input.expectedWorkItemVersion)
        throw Error("Decomposition requires the exact current planned/ready WorkItem version.");
      const state = createProjectStateService(store, workflowApplication);
      const result = await state.decomposeWorkItem(projectId, input);
      const nextPlan = await state.getWorkflowExecutionPlan(projectId, input.workflowId);
      return { result, projection: await project(store, projectId, nextPlan) };
    });
  }

  // One guard for candidate saves and the unsuccessful-Implement revision disposition.
  async function executionPlanningContext(store: ProjectStateStore, projectId: ProjectId, projectRoot: string,
    input: {workflowId: string; workItemId: string; expectedVersion: number}) {
      const workflow = await exactPlan(store, projectId, input.workflowId);
      if (!implementationWorkflowTypes.has(workflow.workflow.body.workflowType)) throw Error("Execution planning requires the exact current supported Workflow.");
      const projection = await project(store, projectId, workflow);
      const item = projection.items.find(candidate => candidate.record.id === input.workItemId);
      if (!item || !["planned", "ready", "blocked"].includes(item.record.body.workState) || item.record.recordVersion !== input.expectedVersion) throw Error("Execution planning requires the exact current planned/ready or semantic blocked WorkItem; identity or revision is stale.");
      if (item.repairIds.some(id => projection.items.some(candidate => candidate.record.id === id && !["closed", "cancelled"].includes(candidate.record.body.workState)))) throw Error("Execution planning is blocked while an active Repair owns the next correction.");
      if (item.record.body.workState === "blocked") {
        const state = createProjectStateService(store, operator);
        const attempt = await state.getImplementationAttempt(projectId, input.workflowId, input.workItemId);
        if (!attempt || attempt.lifecycleState !== "active" || attempt.body.attemptState !== "completed")
          throw Error("Blocked planning revision requires an exact completed semantic blocked attempt with no competing reservation.");
        const evidence = await getDurableImplementationEvidence(projectRoot, input.workflowId, input.workItemId, attempt.id);
        if (evidence.result.body.outcome !== "blocked" || evidence.historicalWorkItem.body.contractRevision !== item.record.body.contractRevision ||
          item.record.lifecycleState !== "active" || item.eligibility.blockers.some(reason => reason !== "blocking-decision"))
          throw Error("Blocked planning revision requires exact current contract provenance without dependency, Phase, terminal or blocking evidence.");
        const review = await state.getWorkItemPlanningReview(projectId, input.workItemId);
        if (!["approved", "revision_requested"].includes(review.disposition.state))
          throw Error("Blocked planning revision requires approved planning or its explicit revision disposition.");
        const reserved = await Promise.all(attempt.body.layout.sources.map(source => store.getEntityVersion(projectId, source.entityId, source.recordVersion)));
        if (!reserved.some(record => record?.entityType === "Decision" && record.body.decisionType === "work-item-planning-review" && record.body.outcome === "approved" &&
          record.body.decidedBy.principalType === "human" && record.body.decisionRole === "Operator" && record.body.decisionScope === `work-item-planning-review:${input.workItemId}@${item.record.body.contractRevision}`))
          throw Error("Blocked planning revision requires approved contract evidence reserved before implementation.");
        const edges = (await store.listRelationships(projectId)).filter(edge => !edge.endedAt);
        if ((await store.listEntities(projectId, "Decision")).some(record => record.entityType === "Decision" && record.lifecycleState === "active" &&
          edges.some(edge => edge.relationshipType === "governs" && edge.fromEntityId === record.id &&
            ([attempt.id, evidence.result.id].includes(edge.toEntityId) || edge.toEntityId === input.workItemId && record.body.decisionType !== "work-item-planning-review" && ["proposed", "revision_requested", "rejected", "revoked"].includes(record.body.outcome)))))
          throw Error("Blocked planning revision has an unrelated downstream disposition.");
        if (attempt.body.sourceMode === "source-backed") {
          const source = projection.source;
          const bindings = (await store.listEntities(projectId, "SourceBinding")).filter(record => record.entityType === "SourceBinding" && record.lifecycleState === "active" && record.body.workflowId === input.workflowId);
          if (source.state !== "ready" || !source.repositoryCheckoutId || !source.workSourceLineId || source.currentRevisionId !== attempt.body.sourceRevisionId ||
            bindings.length !== 1 || evidence.historicalBinding?.id !== bindings[0].id)
            throw Error("Blocked source-backed attempt must retain its exact ready source binding and unchanged revision.");
          const checkout = resolveManagedWorkflowCheckoutPath(fs.realpathSync(projectRoot), input.workflowId).checkoutRoot;
          const lease = acquireWorkflowExecutionLease(workflowExecutionLeaseKey("source-backed", checkout), `planning-revision:${attempt.id}`);
          if (!lease) throw Error("Blocked planning revision is blocked by a conflicting execution lease.");
          try {
            const changes = await reconcileWorkflowSource(fs.realpathSync(projectRoot), input.workflowId, {
              repositoryCheckoutId: source.repositoryCheckoutId, sourceLineId: source.workSourceLineId, expectedRevisionId: attempt.body.sourceRevisionId!,
            });
            const status = (await runBoundedGit({cwd: checkout, args: ["status", "--porcelain", "--untracked-files=all"]})).stdout;
            if (changes.length || status) throw Error("Blocked source-backed checkout is not restored clean at the unchanged SourceBinding revision.");
          } finally {lease.release();}
        } else {
          if (projection.source.state !== "non-source") throw Error("Blocked source-neutral attempt has changed source identity.");
          const lease = acquireWorkflowExecutionLease(workflowExecutionLeaseKey("source-neutral", path.join(fs.realpathSync(projectRoot), ".champcity", "runtime", "work-item-workers", attempt.id)), `planning-revision:${attempt.id}`);
          if (!lease) throw Error("Blocked planning revision is blocked by a conflicting execution lease.");
          lease.release();
        }
      }
      if (item.implementationAttempts.length) {
        const latest = item.implementationAttempts.at(-1)!;
        if (item.implementationAttempts.some(record => record.body.outcome === "implemented")) throw Error("Execution plan cannot change after a successful implementation attempt.");
        const scopeFailure = latest.body.outcome === "failed" && latest.body.blockers.some(value => /outside the accepted Architect path scope|exact checkout restored/i.test(value));
        if (!(item.record.body.workState === "ready" && latest.body.outcome !== "implemented" && (scopeFailure || ["partial", "failed", "abandoned"].includes(latest.body.outcome)) ||
          item.record.body.workState === "blocked" && latest.body.outcome === "blocked"))
          throw Error("Execution plan cannot change after a successful or unresolved implementation attempt.");
        const attemptRefs = new Set(item.implementationAttempts.map(record => record.body.executionRef).filter((value): value is string => Boolean(value)));
        const attemptTester = (await store.listEntities(projectId, "TesterResult")).some(record => record.entityType === "TesterResult" && record.body.workflowId === input.workflowId && record.body.workItemId === item.record.id && item.implementationAttempts.some(attempt => attempt.id === record.body.implementationRecordId));
        const attemptValidation = (await store.listEntities(projectId, "Validation")).some(record => record.entityType === "Validation" && (record.body.implementationRecordId && item.implementationAttempts.some(attempt => attempt.id === record.body.implementationRecordId)));
        const attemptCheckpoint = (await store.listEntities(projectId, "SourceCheckpoint")).some(record => record.entityType === "SourceCheckpoint" && record.body.workflowId === input.workflowId && attemptRefs.has(record.body.boundaryId) && record.body.checkpointState !== "not-required");
        if (attemptTester || attemptValidation || attemptCheckpoint) throw Error("Execution plan cannot change while Tester, Validation, or a source checkpoint belongs to a failed attempt.");
        if (projection.source.state !== "non-source") {
          if (projection.source.state !== "ready" || !projection.source.currentRevisionId || !projection.source.workSourceLineId) throw Error("Failed source-backed attempt must retain its exact ready source binding before replanning.");
          const checkoutRoot = fs.realpathSync(resolveManagedWorkflowCheckoutPath(fs.realpathSync(projectRoot), input.workflowId).checkoutRoot);
          const head = (await runBoundedGit({ cwd: checkoutRoot, args: ["rev-parse", "HEAD"] })).stdout.trim();
          const status = (await runBoundedGit({ cwd: checkoutRoot, args: ["status", "--porcelain", "--untracked-files=all"] })).stdout;
          if (head !== projection.source.currentRevisionId || status) throw Error("Source-backed checkout is not restored clean at the unchanged SourceBinding revision.");
        }
      }
      const criterionIds = workflow.criteria.filter(candidate => candidate.ownerId === item.record.id || candidate.ownerId === workflow.solutions[0]?.id).map(candidate => candidate.record.id);
      const validations = (await store.listEntities(projectId, "Validation")).filter((record): record is ProjectStateRecord<"Validation"> => record.entityType === "Validation" && (record.body.targetEntityId === item.record.id || criterionIds.includes(record.body.targetEntityId)));
      const testers = (await store.listEntities(projectId, "TesterResult")).filter(record => record.entityType === "TesterResult" && record.body.workflowId === input.workflowId && record.body.workItemId === input.workItemId);
      const attemptRefs = new Set(item.implementationAttempts.map(record => record.body.executionRef).filter((value): value is string => Boolean(value)));
      const checkpoints = (await store.listEntities(projectId, "SourceCheckpoint")).filter((record): record is ProjectStateRecord<"SourceCheckpoint"> => record.entityType === "SourceCheckpoint" && record.body.workflowId === input.workflowId && attemptRefs.has(record.body.boundaryId));
      if (validations.length || testers.length || checkpoints.some(record => record.body.checkpointState !== "not-required")) throw Error("Execution plan cannot change after implementation evidence or source checkpoints exist.");
      const pending = await createProjectStateService(store, operator).getImplementationAttempt(projectId, input.workflowId, input.workItemId);
      if (pending?.body.attemptState === "running") throw Error("Execution planning cannot change during a live implementation attempt.");
      return {workflow, projection, item};
  }

  async function assertWorkItemPlanningRevisionEligible(projectRoot: string, workflowId: string, workItemId: string, expectedVersion: number) {
    return withCurrentProject(projectRoot, async (store, projectId) => {
      const {item, projection} = await executionPlanningContext(store, projectId, projectRoot, {workflowId, workItemId, expectedVersion});
      const state = createProjectStateService(store, operator);
      const attempt = await state.getImplementationAttempt(projectId, workflowId, workItemId);
      if (attempt?.body.attemptState === "prepared") {
        if (item.record.lifecycleState !== "active" || attempt.lifecycleState !== "active" || attempt.body.workItemVersion !== expectedVersion ||
          attempt.body.workflowId !== workflowId || attempt.body.workItemId !== workItemId || attempt.body.implementationRecordId)
          throw Error("Planning revision requires an exact current prepared reservation with no execution start or implementation result.");
        // Validate the durable reservation without preparing source or creating another attempt.
        const current = await state.assertImplementationAttemptCurrent(projectId, attempt.id);
        // WorkItem startedAt and older results describe history, not this prepared retry.
        // Any result claiming this reservation is incompatible even if its result link is absent.
        if (current.body.implementationRecordId || (await store.listEntities(projectId, "ImplementationRecord")).some(record =>
          record.entityType === "ImplementationRecord" && record.body.executionRef === current.id))
          throw Error("Prepared planning revision is blocked by an associated implementation result.");
        for (const result of item.implementationAttempts) {
          const previous = result.body.executionRef ? await store.getEntity(projectId, result.body.executionRef) : null;
          if (previous?.entityType !== "ImplementationAttempt" || previous.body.attemptState !== "completed" ||
            previous.body.workflowId !== workflowId || previous.body.workItemId !== workItemId || previous.body.implementationRecordId !== result.id)
            throw Error("Prepared planning revision requires completed unsuccessful history with exact attempt provenance.");
        }
        if ((await state.getWorkItemPlanningReview(projectId, workItemId)).disposition.state !== "approved")
          throw Error("Prepared planning revision requires approved current WorkItem planning.");
        const checkpoints = (await store.listEntities(projectId, "SourceCheckpoint")).filter(record => record.entityType === "SourceCheckpoint" && record.body.workflowId === workflowId && record.body.boundaryId === attempt.id);
        if (checkpoints.length) throw Error("Prepared planning revision is blocked by an associated source checkpoint.");
        const executionRoot = attempt.body.sourceMode === "source-backed"
          ? resolveManagedWorkflowCheckoutPath(fs.realpathSync(projectRoot), workflowId).checkoutRoot
          : path.join(fs.realpathSync(projectRoot), ".champcity", "runtime", "work-item-workers", attempt.id);
        const lease = acquireWorkflowExecutionLease(workflowExecutionLeaseKey(attempt.body.sourceMode, executionRoot), `planning-revision:${attempt.id}`);
        if (!lease) throw Error("Prepared planning revision is blocked by a conflicting execution lease.");
        try {
          if (attempt.body.sourceMode === "source-backed") {
            const source = projection.source;
            if (source.state === "ready" && source.repositoryCheckoutId && source.workSourceLineId && source.currentRevisionId && source.currentRevisionId === attempt.body.sourceRevisionId) {
              const changes = await reconcileWorkflowSource(fs.realpathSync(projectRoot), workflowId, {
                repositoryCheckoutId: source.repositoryCheckoutId, sourceLineId: source.workSourceLineId, expectedRevisionId: source.currentRevisionId,
              });
              if (changes.length) throw Error("Prepared source-backed checkout is not restored clean at the unchanged SourceBinding revision.");
            } else if (source.state !== "unprepared" || fs.existsSync(resolveManagedWorkflowCheckoutPath(fs.realpathSync(projectRoot), workflowId).checkoutRoot)) {
              throw Error("Prepared source-backed reservation requires unchanged source identity; existing checkout is unverified or source preparation is blocked.");
            }
          }
          return;
        } finally { lease.release(); }
      }
      const blocked = item.record.body.workState === "blocked" && item.implementationAttempts.at(-1)?.body.outcome === "blocked";
      if ((!blocked && item.record.body.workState !== "ready") || attempt?.body.attemptState !== "completed" ||
        item.implementationAttempts.at(-1)?.id !== attempt.body.implementationRecordId ||
        !["partial", "failed", "abandoned", ...(blocked ? ["blocked"] : [])].includes(item.implementationAttempts.at(-1)?.body.outcome ?? ""))
        throw Error("Planning revision requires the exact completed unsuccessful ready WorkItem.");
      if (blocked && (await state.getWorkItemPlanningReview(projectId, workItemId)).disposition.state !== "approved")
        throw Error("Blocked planning revision requires approved current WorkItem planning.");
    });
  }

  async function acceptWorkItemExecutionPlan(projectRoot: string, input: import("../../shared/workflowApplicationContracts").WorkItemExecutionPlanInput, approve = true, criteria?: import("../../shared/projectState/workItemPlanningContracts").WorkItemPlanningContract["criteria"]) {
    const plan = input?.plan;
    if (!input || !Number.isSafeInteger(input.expectedVersion) || !plan || !Array.isArray(plan.implementationBoundaries) || !Array.isArray(plan.affectedPaths) || !Array.isArray(plan.proofIntent)) throw Error("A bounded exact WorkItem execution plan is required.");
    const boundedList = (values: string[], min: number, max: number, label: string) => {
      if (values.length < min || values.length > max || values.some(value => typeof value !== "string" || !value.trim() || value.length > 512)) throw Error(`${label} must contain ${min}..${max} bounded text entries.`);
      return values.map(value => value.trim());
    };
    const implementationBoundaries = boundedList(plan.implementationBoundaries, 1, 32, "Implementation boundaries");
    const proofIntent = boundedList(plan.proofIntent, 1, 32, "Proof intent");
    const affectedPaths = boundedList(plan.affectedPaths, 0, 128, "Affected paths");
    for (const value of affectedPaths) {
      if (value.startsWith("/") || /^[A-Za-z]:/.test(value) || value.includes("\\") || value.split("/").some(part => !part || part === "." || part === "..") ||
        /(^|\/)(\.git|\.champcity|\.codex|node_modules|dist|build|out|coverage|\.env[^/]*|secrets?|credentials?)(\/|$)/i.test(value) || /(^|\/)(id_rsa|[^/]+\.(pem|key|p12|pfx)|[^/]*token[^/]*|[^/]*secret[^/]*)(\/|$)/i.test(value))
        throw Error("Affected paths must be normalized, repository-relative source paths without runtime, Git, dependency, output, or secret paths.");
    }
    if (new Set(affectedPaths).size !== affectedPaths.length) throw Error("Affected paths must be unique.");
    return withCurrentProject(projectRoot, async (store, projectId) => {
      const {workflow, projection, item} = await executionPlanningContext(store, projectId, projectRoot, input);
      if (projection.source.state === "non-source" && affectedPaths.length) throw Error("Source-neutral execution plans must have an empty affected-path scope.");
      const state = createProjectStateService(store, operator);
      const workItem = await state.saveWorkItemPlanningContract(projectId, {workflowId: input.workflowId, workItemId: item.record.id, expectedVersion: input.expectedVersion, implementationBoundaries, affectedPaths, proofIntent, ...(criteria !== undefined ? {criteria} : {})});
      if (approve) await state.recordWorkItemPlanningReview(projectId, input.workflowId, workItem.id, {expectedRecordVersion: workItem.recordVersion, outcome: "approved", notes: "Accept exact Architect execution contract."});
      return workItem;
    });
  }

  async function recordWorkItemVisualCriterion(projectRoot: string, input: {
    workflowId: EntityId; workItemId: EntityId; criterionId: EntityId; expectedCriterionVersion: number;
    outcome: "pass" | "fail" | "inconclusive"; summary: string;
  }) {
    if (!input || !Number.isSafeInteger(input.expectedCriterionVersion) || input.expectedCriterionVersion < 1 ||
      !["pass", "fail", "inconclusive"].includes(input.outcome) || typeof input.summary !== "string" || !input.summary.trim() || input.summary.length > 4000)
      throw Error("Exact current Criterion evidence and bounded visual summary are required.");
    return withCurrentProject(projectRoot, async (store, projectId) => {
      const plan = await workItemPlan(store, projectId, await exactPlan(store, projectId, input.workflowId), input.workItemId);
      const view = await project(store, projectId, plan);
      const item = view.items.find(entry => entry.record.id === input.workItemId);
      const criterion = plan.criteria.find(entry => entry.record.id === input.criterionId &&
        (entry.ownerId === input.workItemId || plan.solutions.some(solution => solution.id === entry.ownerId)));
      if (!item || !criterion || criterion.record.body.validationPolicy !== "visual_human" || criterion.record.lifecycleState !== "active" ||
        criterion.record.body.criticality !== "required" || criterion.record.recordVersion !== input.expectedCriterionVersion)
        throw Error("Visual evidence requires the exact active required visual Criterion owned by this WorkItem or its accepted solution.");
      const state = createProjectStateService(store, operator);
      const attempts = await state.getImplementationAttempts(projectId, input.workItemId);
      const implementation = attempts.at(-1);
      if (!implementation || implementation.body.outcome !== "implemented" ||
        !["validation_pending", "closed"].includes(item.record.body.workState)) throw Error("Visual evidence must bind the exact latest successful WorkItem implementation.");
      const testers = (await store.listEntities(projectId, "TesterResult")).filter((record): record is ProjectStateRecord<"TesterResult"> => record.entityType === "TesterResult" &&
        record.body.workflowId === input.workflowId && record.body.workItemId === input.workItemId && record.body.implementationRecordId === implementation.id);
      if (testers.length !== 1 || !["not-required", "committed"].includes(testers[0].body.checkpointState) ||
        testers[0].body.sourceMode !== (view.source.state === "non-source" ? "source-neutral" : "source-backed") ||
        view.source.state !== "non-source" && testers[0].body.candidateRevisionId !== view.source.currentRevisionId)
        throw Error("Visual evidence requires the current successful TesterResult and candidate.");
      const validation = await state.recordValidation(projectId, input.criterionId, { validationType: "work-item-criterion", method: "Operator visual review",
        validationMode: "visual_human", outcome: input.outcome, summary: input.summary.trim(), targetRecordVersion: criterion.record.recordVersion,
        implementationRecordId: implementation.id, ...(view.source.currentRevisionId ? { sourceBaselineRef: view.source.currentRevisionId } : {}) });
      return { validation, projection: await getWorkItemValidationProjection(projectRoot, input.workflowId, input.workItemId) };
    });
  }

  async function recordWorkItemCriterionDecision(projectRoot: string, input: {
    workflowId: EntityId; workItemId: EntityId; criterionId: EntityId; expectedCriterionVersion: number;
    outcome: "approved" | "rejected"; rationale: string;
  }) {
    if (!input || !Number.isSafeInteger(input.expectedCriterionVersion) || input.expectedCriterionVersion < 1 ||
      !["approved", "rejected"].includes(input.outcome) || typeof input.rationale !== "string" || !input.rationale.trim() || input.rationale.length > 2000)
      throw Error("Exact Operator Criterion Decision and bounded rationale are required.");
    return withCurrentProject(projectRoot, async (store, projectId) => {
      const plan = await workItemPlan(store, projectId, await exactPlan(store, projectId, input.workflowId), input.workItemId), view = await project(store, projectId, plan);
      const item = view.items.find(entry => entry.record.id === input.workItemId);
      const criterion = plan.criteria.find(entry => entry.record.id === input.criterionId &&
        (entry.ownerId === input.workItemId || plan.solutions.some(solution => solution.id === entry.ownerId)));
      if (!item || !criterion || criterion.record.body.validationPolicy !== "operator_decision" || criterion.record.body.criticality !== "required" ||
        criterion.record.lifecycleState !== "active" || criterion.record.recordVersion !== input.expectedCriterionVersion)
        throw Error("Operator Decision requires the exact active required operator_decision Criterion.");
      const attempts = await createProjectStateService(store, operator).getImplementationAttempts(projectId, input.workItemId);
      const implementation = attempts.at(-1);
      if (!implementation || implementation.body.outcome !== "implemented") throw Error("Operator Decision requires the current successful implementation.");
      const testers = (await store.listEntities(projectId, "TesterResult")).filter((record): record is ProjectStateRecord<"TesterResult"> => record.entityType === "TesterResult" && record.body.workflowId === input.workflowId &&
        record.body.workItemId === input.workItemId && record.body.implementationRecordId === implementation.id);
      if (testers.length !== 1 || !["not-required", "committed"].includes(testers[0].body.checkpointState) ||
        view.source.state !== "non-source" && testers[0].body.candidateRevisionId !== view.source.currentRevisionId)
        throw Error("Operator Decision requires the current completed TesterResult.");
      const decision = await createProjectStateService(store, operator).recordCriterionOperatorDecision(projectId, input.criterionId, {
        expectedCriterionVersion: input.expectedCriterionVersion, outcome: input.outcome, rationale: input.rationale.trim() }, { workflowId: input.workflowId, workItemId: input.workItemId });
      return { decision: decision.decision, projection: await getWorkItemValidationProjection(projectRoot, input.workflowId, input.workItemId) };
    });
  }

  async function getPhaseValidationProjection(projectRoot: string, workflowId: EntityId, phaseId: EntityId): Promise<PhaseValidationProjection> {
    return withCurrentProject(projectRoot, async (store, projectId) => {
      const plan = await exactPlan(store, projectId, workflowId);
      const phaseIndex = plan.phases.findIndex(phase => phase.phaseId === phaseId);
      if (phaseIndex < 0) throw Error("Exact Phase is not part of the selected Workflow.");
      const phase = plan.phases[phaseIndex];
      const view = await project(store, projectId, plan);
      const deferred = plan.criteria.filter(entry => entry.record.lifecycleState === "active" && entry.record.body.validationPolicy === "deferred_visual_phase" &&
        (phase.workItemIds.includes(entry.ownerId) || phaseIndex === plan.phases.length - 1 && plan.workflow.body.workflowType !== "project-creation" && plan.solutions.some(solution => solution.id === entry.ownerId)));
      const criteria = plan.criteria.filter(entry => entry.ownerId === phaseId).concat(deferred)
        .filter((entry, index, all) => all.findIndex(candidate => candidate.record.id === entry.record.id) === index);
      const state = createProjectStateService(store, operator);
      const projected = [];
      for (const entry of criteria) {
        if (entry.record.body.validationPolicy === "operator_decision") {
          const evidenceIds = await currentPhaseTesterIds(store, projectId, plan, phase.workItemIds, view.source.currentRevisionId);
          const disposition = await state.getCriterionOperatorDecisionStatus(projectId, entry.record.id, evidenceIds);
          const satisfied = disposition.current && ["approved", "accepted"].includes(disposition.state);
          projected.push({ ownerId: entry.ownerId, criterion: entry.record, policy: entry.record.body.validationPolicy,
            outcome: satisfied ? "pass" as const : disposition.current && disposition.state === "rejected" ? "fail" as const : "pending" as const,
            validationId: null, decisionTargetId: entry.record.id, decisionState: disposition.state, decisionId: disposition.decisionId,
            reason: satisfied ? null : "An explicit Operator Decision is required." });
        } else {
          const proof = await state.getCriterionValidationStatus(projectId, entry.record.id, view.source.currentRevisionId ?? undefined);
          const validationRecord = proof.validationId ? await store.getEntity(projectId, proof.validationId) : null;
          const unavailable = validationRecord?.entityType === "Validation" && validationRecord.body.outcome === "blocked";
          projected.push({ ownerId: entry.ownerId, criterion: entry.record, policy: entry.record.body.validationPolicy,
            outcome: unavailable ? "blocked" as const : proof.validationId ? proof.satisfied ? "pass" as const : validationRecord?.entityType === "Validation" && validationRecord.body.outcome === "inconclusive" ? "inconclusive" as const : "fail" as const : entry.record.body.validationPolicy === "deferred_visual_phase" ? "deferred" as const : "pending" as const,
            validationId: proof.validationId, decisionTargetId: null, decisionState: null, decisionId: null,
            reason: proof.satisfied ? null : unavailable ? validationRecord.body.summary : entry.record.body.validationPolicy === "deferred_visual_phase" ? "Deferred visual proof is required at this Phase boundary." : "Current Phase Criterion evidence is required." });
        }
      }
      const completion = await state.getPhaseCompletionEligibility(projectId, phaseId, view.source.currentRevisionId ?? undefined);
      return { workflowId, phaseId, phaseVersion: phase.record.recordVersion, sourceRevisionId: view.source.currentRevisionId,
        workItemsClosed: phase.workItemIds.every(id => view.items.find(item => item.record.id === id)?.record.body.workState === "closed"),
        criteria: projected, completion: { eligible: completion.eligible, blockers: completion.blockers } };
    });
  }

  async function recordPhaseVisualCriterion(projectRoot: string, input: {
    workflowId: EntityId; phaseId: EntityId; criterionId: EntityId; expectedCriterionVersion: number; expectedPhaseVersion: number;
    outcome: "pass" | "fail" | "inconclusive"; summary: string;
  }) {
    if (!input || !Number.isSafeInteger(input.expectedCriterionVersion) || !Number.isSafeInteger(input.expectedPhaseVersion) ||
      !["pass", "fail", "inconclusive"].includes(input.outcome) || typeof input.summary !== "string" || !input.summary.trim() || input.summary.length > 4000) throw Error("Exact Phase visual evidence and bounded summary are required.");
    return withCurrentProject(projectRoot, async (store, projectId) => {
      const plan = await exactPlan(store, projectId, input.workflowId), phaseIndex = plan.phases.findIndex(entry => entry.phaseId === input.phaseId);
      if (phaseIndex < 0) throw Error("Exact Phase is not part of the current Workflow.");
      const phase = plan.phases[phaseIndex], view = await project(store, projectId, plan);
      if (phase.record.recordVersion !== input.expectedPhaseVersion || !phase.workItemIds.every(id => view.items.find(item => item.record.id === id)?.record.body.workState === "closed"))
        throw Error("Phase visual evidence requires the current Phase after all member WorkItems close.");
      const deferred = plan.criteria.some(entry => entry.record.id === input.criterionId && entry.record.body.validationPolicy === "deferred_visual_phase" &&
        (phase.workItemIds.includes(entry.ownerId) || phaseIndex === plan.phases.length - 1 && plan.workflow.body.workflowType !== "project-creation" && plan.solutions.some(solution => solution.id === entry.ownerId)));
      const criterion = plan.criteria.find(entry => entry.record.id === input.criterionId && (entry.ownerId === input.phaseId || deferred));
      if (!criterion || criterion.record.recordVersion !== input.expectedCriterionVersion || criterion.record.lifecycleState !== "active" ||
        criterion.record.body.criticality !== "required" || !["visual_human", "deferred_visual_phase"].includes(criterion.record.body.validationPolicy))
        throw Error("Phase visual evidence requires an exact active required visual or deferred-visual Criterion.");
      const validation = await createProjectStateService(store, operator).recordValidation(projectId, input.criterionId, {
        validationType: "phase-criterion", method: criterion.record.body.validationPolicy === "deferred_visual_phase" ? "Operator deferred Phase visual review" : "Operator Phase visual review",
        validationMode: "visual_human", outcome: input.outcome, summary: input.summary.trim(), targetRecordVersion: criterion.record.recordVersion,
        ...(view.source.currentRevisionId ? { sourceBaselineRef: view.source.currentRevisionId } : {}) });
      const testerIds = await currentPhaseTesterIds(store, projectId, plan, phase.workItemIds, view.source.currentRevisionId);
      await createProjectStateService(store, operator).linkPhaseValidationEvidence(projectId, validation.id, input.workflowId, input.phaseId, testerIds, view.source.currentRevisionId ?? undefined);
      return { validation, projection: await getPhaseValidationProjection(projectRoot, input.workflowId, input.phaseId) };
    });
  }

  async function recordPhaseCriterionDecision(projectRoot: string, input: {
    workflowId: EntityId; phaseId: EntityId; criterionId: EntityId; expectedCriterionVersion: number; expectedPhaseVersion: number;
    outcome: "approved" | "rejected"; rationale: string;
  }) {
    if (!input || !Number.isSafeInteger(input.expectedCriterionVersion) || !Number.isSafeInteger(input.expectedPhaseVersion) ||
      !["approved", "rejected"].includes(input.outcome) || typeof input.rationale !== "string" || !input.rationale.trim() || input.rationale.length > 2000)
      throw Error("Exact Phase Operator Decision and bounded rationale are required.");
    return withCurrentProject(projectRoot, async (store, projectId) => {
      const plan = await exactPlan(store, projectId, input.workflowId), phase = plan.phases.find(entry => entry.phaseId === input.phaseId);
      const criterion = plan.criteria.find(entry => entry.ownerId === input.phaseId && entry.record.id === input.criterionId);
      const execution = await project(store, projectId, plan);
      if (!phase || phase.record.recordVersion !== input.expectedPhaseVersion || !criterion || criterion.record.recordVersion !== input.expectedCriterionVersion ||
        criterion.record.lifecycleState !== "active" || criterion.record.body.criticality !== "required" || criterion.record.body.validationPolicy !== "operator_decision")
        throw Error("Phase Decision requires the exact active required operator_decision Criterion and Phase version.");
      if (!phase.workItemIds.every(id => execution.items.find(item => item.record.id === id)?.record.body.workState === "closed"))
        throw Error("All exact Phase WorkItems must be closed before recording a Phase Decision.");
      const decision = await createProjectStateService(store, operator).recordCriterionOperatorDecision(projectId, input.criterionId, {
        expectedCriterionVersion: input.expectedCriterionVersion, outcome: input.outcome, rationale: input.rationale.trim() }, { workflowId: input.workflowId, phaseId: input.phaseId });
      return { decision: decision.decision, projection: await getPhaseValidationProjection(projectRoot, input.workflowId, input.phaseId) };
    });
  }

  async function validateDeterministicPhaseCriterion(projectRoot: string, workflowId: EntityId, phaseId: EntityId, criterionId: EntityId) {
    return withCurrentProject(projectRoot, async (store, projectId) => {
      const plan = await exactPlan(store, projectId, workflowId), phase = plan.phases.find(entry => entry.phaseId === phaseId);
      const criterion = plan.criteria.find(entry => entry.ownerId === phaseId && entry.record.id === criterionId);
      const view = await project(store, projectId, plan);
      if (!phase || !criterion || criterion.record.lifecycleState !== "active" || criterion.record.body.criticality !== "required" || criterion.record.body.validationPolicy !== "deterministic")
        throw Error("Deterministic Phase Validator requires an exact active required deterministic Criterion.");
      if (!phase.workItemIds.every(id => view.items.find(item => item.record.id === id)?.record.body.workState === "closed")) throw Error("All exact Phase WorkItems must be closed before Phase validation.");
      let outcome: "pass" | "fail" | "blocked" = "pass", summary: string;
      if (view.source.state === "non-source") {
        outcome = "blocked";
        summary = "No application-owned source-neutral deterministic Phase proof provider is registered for this Criterion.";
      } else {
        if (view.source.state !== "ready" || !view.source.currentRevisionId) throw Error("Deterministic Phase validation requires the prepared exact Workflow source.");
        const checkout = fs.realpathSync(resolveManagedWorkflowCheckoutPath(fs.realpathSync(projectRoot), workflowId).checkoutRoot);
        const [head, status] = await Promise.all([runBoundedGit({ cwd: checkout, args: ["rev-parse", "HEAD"] }), runBoundedGit({ cwd: checkout, args: ["status", "--porcelain=v1", "--untracked-files=all"] })]);
        if (head.stdout.trim() !== view.source.currentRevisionId || status.stdout.trim()) throw Error("Deterministic Phase candidate changed or is dirty.");
        const baseline = (await store.listEntities(projectId, "SourceBaseline")).find((record): record is ProjectStateRecord<"SourceBaseline"> => record.entityType === "SourceBaseline" && record.body.workflowId === workflowId);
        if (!baseline || !baseline.body.baseRevisionId) throw Error("Exact Workflow source baseline is unavailable.");
        const changedPaths = (await runBoundedGit({ cwd: checkout, args: ["diff", "--name-only", "--no-renames", `${baseline.body.baseRevisionId}..${view.source.currentRevisionId}`] })).stdout.split(/\r?\n/).filter(Boolean).sort();
        const testerResults = (await store.listEntities(projectId, "TesterResult")).filter((record): record is ProjectStateRecord<"TesterResult"> => record.entityType === "TesterResult" && phase.workItemIds.includes(record.body.workItemId));
        const capabilities = [...new Set(testerResults.flatMap(record => record.body.affectedCapabilityIds))].sort();
        const receipt = await runDeterministicWorkItemProfile(checkout, changedPaths, capabilities);
        outcome = receipt.status === "passed" ? "pass" : receipt.status === "failed" ? "fail" : "blocked";
        summary = `ValidationCatalog Phase profile: ${receipt.summary}`;
      }
      const validation = await createProjectStateService(store, { principalId: `validator-phase-catalog-${randomUUID()}`, principalType: "system", role: "Validator" })
        .recordValidation(projectId, criterionId, { validationType: "phase-criterion", method: "ValidationCatalog phase profile", validationMode: "deterministic",
          outcome, summary, targetRecordVersion: criterion.record.recordVersion, ...(view.source.currentRevisionId ? { sourceBaselineRef: view.source.currentRevisionId } : {}) });
      const testerIds = await currentPhaseTesterIds(store, projectId, plan, phase.workItemIds, view.source.currentRevisionId);
      await createProjectStateService(store, { principalId: `validator-phase-provenance-${randomUUID()}`, principalType: "system", role: "Validator" })
        .linkPhaseValidationEvidence(projectId, validation.id, workflowId, phaseId, testerIds, view.source.currentRevisionId ?? undefined);
      return { validation, projection: await getPhaseValidationProjection(projectRoot, workflowId, phaseId) };
    });
  }

  async function validateSemanticPhaseCriterion(projectRoot: string, workflowId: EntityId, phaseId: EntityId, criterionId: EntityId, selection: CodexModelSelection) {
    if (!selection?.model?.trim() || !selection?.reasoningEffort?.trim()) throw Error("Bounded semantic Validator model selection is required.");
    return withCurrentProject(projectRoot, async (store, projectId) => {
      const plan = await exactPlan(store, projectId, workflowId), phase = plan.phases.find(entry => entry.phaseId === phaseId);
      const criterion = plan.criteria.find(entry => entry.ownerId === phaseId && entry.record.id === criterionId), view = await project(store, projectId, plan);
      if (!phase || !criterion || criterion.record.lifecycleState !== "active" || criterion.record.body.criticality !== "required" || criterion.record.body.validationPolicy !== "semantic_ai")
        throw Error("Semantic Phase Validator requires the exact active required semantic Criterion.");
      if (!phase.workItemIds.every(id => view.items.find(item => item.record.id === id)?.record.body.workState === "closed")) throw Error("All exact Phase WorkItems must be closed before semantic Phase validation.");
      const phaseMembers = await currentPhaseSemanticMembers(store, projectId, plan, phase.workItemIds, view.source.currentRevisionId);
      let workingDirectory: string;
      if (view.source.state === "non-source") {
        const root = fs.realpathSync(projectRoot), readonly = path.join(root, ".champcity", "runtime", "validator-readonly");
        fs.mkdirSync(readonly, { recursive: true }); workingDirectory = fs.realpathSync(readonly);
        if (!workingDirectory.startsWith(`${path.join(root, ".champcity")}${path.sep}`)) throw Error("Semantic Validator workspace escaped Project storage.");
      } else {
        if (view.source.state !== "ready" || !view.source.currentRevisionId) throw Error("Semantic Phase validation requires the current source candidate.");
        workingDirectory = fs.realpathSync(resolveManagedWorkflowCheckoutPath(fs.realpathSync(projectRoot), workflowId).checkoutRoot);
      }
      const result = await reviewWorkItemCriterion({ workingDirectory, workflowId, workItemId: phaseId, workItemTitle: `Phase: ${phase.record.body.title}`,
        criterion: criterion.record, phaseObjective: phase.record.body.objective, phaseMembers,
        deterministicEvidence: phaseMembers.flatMap(member => member.criterionOutcomes),
        sourceMode: view.source.state === "non-source" ? "source-neutral" : "source-backed", sourceRevisionId: view.source.currentRevisionId }, selection, createValidatorAdapter);
      if (phaseMembers.some(member => result.principalId === member.implementation.createdBy.principalId || result.principalId === member.testerResult.createdBy.principalId))
        throw Error("Phase Validator principal must be independent from every current member Implementer and Tester.");
      const validation = await createProjectStateService(store, { principalId: result.principalId, principalType: "agent", role: "Validator" }).recordValidation(projectId, criterionId, {
        validationType: "phase-criterion", method: "independent semantic Phase review", validationMode: "semantic_ai", outcome: result.outcome,
        summary: result.summary, targetRecordVersion: criterion.record.recordVersion,
        ...(view.source.currentRevisionId ? { sourceBaselineRef: view.source.currentRevisionId } : {}) });
      await createProjectStateService(store, { principalId: result.principalId, principalType: "agent", role: "Validator" }).linkPhaseValidationEvidence(projectId, validation.id, workflowId, phaseId,
        phaseMembers.map(member => member.testerResult.id), view.source.currentRevisionId ?? undefined);
      return { validation, projection: await getPhaseValidationProjection(projectRoot, workflowId, phaseId) };
    });
  }

  async function completeWorkItem(projectRoot: string, workflowId: EntityId, workItemId: EntityId, expectedVersion: number) {
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) throw Error("Current WorkItem version is required.");
    return withCurrentProject(projectRoot, async (store, projectId) => {
      const plan = await exactPlan(store, projectId, workflowId);
      if (![...plan.directWorkItems, ...Object.values(plan.workItemsByPhase).flat()].some(record => record.id === workItemId))
        throw Error("Exact WorkItem is not part of the selected current Workflow.");
      const projection = await project(store, projectId, plan);
      if (projection.source.state !== "non-source" && projection.source.state !== "ready") throw Error("Source-backed completion requires the current prepared Workflow source.");
      return createProjectStateService(store, workflowApplication).completeWorkItem(projectId, workItemId, expectedVersion, projection.source.currentRevisionId ?? undefined);
    });
  }

  async function completePhase(projectRoot: string, workflowId: EntityId, phaseId: EntityId, expectedVersion: number) {
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) throw Error("Current Phase version is required.");
    return withCurrentProject(projectRoot, async (store, projectId) => {
      const plan = await exactPlan(store, projectId, workflowId);
      if (!plan.phases.some(phase => phase.phaseId === phaseId)) throw Error("Exact Phase is not part of the selected current Workflow.");
      const projection = await project(store, projectId, plan);
      if (projection.source.state !== "non-source" && projection.source.state !== "ready") throw Error("Source-backed Phase completion requires the current prepared Workflow source.");
      return createProjectStateService(store, workflowApplication).completePhase(projectId, phaseId, expectedVersion, projection.source.currentRevisionId ?? undefined);
    });
  }

  async function createWorkflowRepair(projectRoot: string, workflowId: EntityId, workItemId: EntityId, failureEvidenceId: EntityId) {
    for (const value of [workflowId, workItemId, failureEvidenceId]) if (typeof value !== "string" || !value.trim() || value.length > 128) throw Error("Exact Workflow, WorkItem, and failure evidence IDs are required.");
    return withCurrentProject(projectRoot, async (store, projectId) => {
      const plan = await exactPlan(store, projectId, workflowId);
      if (![...plan.directWorkItems, ...Object.values(plan.workItemsByPhase).flat()].some(record => record.id === workItemId))
        throw Error("Repair parent is not part of the selected current Workflow.");
      // Recover only a same-Workflow active Repair with exact Criterion failure provenance.
      const members=[...plan.directWorkItems,...Object.values(plan.workItemsByPhase).flat()],edges=(await store.listRelationships(projectId)).filter(edge=>!edge.endedAt);
      const failure=await store.getEntity(projectId,failureEvidenceId);
      const supported=failure?.entityType === "Validation" && failure.body.outcome === "fail" || failure?.entityType === "TesterResult" && failure.body.recommendation === "production-defect-suspected" || failure?.entityType === "Decision" && (failure.body.decisionType === "criterion-operator-decision" && failure.body.outcome === "rejected" || failure.body.decisionType === "work-item-validation-review" && failure.body.outcome === "revision_requested");
      if(supported) for(const edge of edges.filter(edge=>edge.relationshipType==="repairs"&&edge.toEntityId===workItemId)) {
        const repair=members.find(item=>item.id===edge.fromEntityId&&item.lifecycleState==="active"&&!["closed","cancelled"].includes(item.body.workState));if(!repair)continue;
        const criterionIds=edges.filter(candidate=>candidate.relationshipType==="defines_criterion"&&candidate.fromEntityId===repair.id).map(candidate=>candidate.toEntityId);
        const provenance=edges.filter(candidate=>candidate.relationshipType==="derived_from"&&criterionIds.includes(candidate.fromEntityId)&&candidate.toEntityId===failureEvidenceId);
        if(provenance.length===1) {const criterion=await store.getEntity(projectId,provenance[0].fromEntityId);if(criterion?.entityType==="Criterion")return {repair,criterion,failureIdentity:repair.body.objective.match(/\[([^\]]+)\]$/)?.[1]??failureEvidenceId};}
      }
      return createProjectStateService(store, workflowApplication).createWorkflowRepair(projectId, { workflowId, workItemId, failureEvidenceId });
    });
  }

  async function createPhaseRepair(projectRoot: string, workflowId: EntityId, phaseId: EntityId, failureEvidenceId: EntityId) {
    for (const value of [workflowId, phaseId, failureEvidenceId]) if (typeof value !== "string" || !value.trim() || value.length > 128) throw Error("Exact Workflow, Phase, and failure evidence IDs are required.");
    return withCurrentProject(projectRoot, async (store, projectId) => {
      const plan = await exactPlan(store, projectId, workflowId);
      if (!plan.phases.some(phase => phase.phaseId === phaseId)) throw Error("Phase Repair target is outside the selected current Workflow.");
      return createProjectStateService(store, workflowApplication).createPhaseRepair(projectId, { workflowId, phaseId, failureEvidenceId });
    });
  }

  async function validateSemanticWorkItemCriterion(projectRoot: string, workflowId: EntityId, workItemId: EntityId,
    criterionId: EntityId, selection: CodexModelSelection) {
    if (!selection || typeof selection.model !== "string" || !selection.model.trim() || selection.model.length > 128 ||
      typeof selection.reasoningEffort !== "string" || !selection.reasoningEffort.trim() || selection.reasoningEffort.length > 64)
      throw Error("Bounded Validator model selection is required.");
    return withCurrentProject(projectRoot, async (store, projectId) => {
      const plan = await workItemPlan(store, projectId, await exactPlan(store, projectId, workflowId), workItemId);
      const projection = await project(store, projectId, plan);
      const item = projection.items.find(candidate => candidate.record.id === workItemId);
      if (!item || item.record.body.workState !== "validation_pending") throw Error("Validator requires the exact active validation-pending WorkItem.");
      const state = createProjectStateService(store, operator);
      const attempts = await state.getImplementationAttempts(projectId, workItemId);
      const implementation = attempts.at(-1);
      if (!implementation || implementation.body.outcome !== "implemented" || implementation.body.blockers.length)
        throw Error("Validator requires the latest successful ImplementationRecord.");
      const testerResults = (await store.listEntities(projectId, "TesterResult"))
        .filter((record): record is ProjectStateRecord<"TesterResult"> => record.entityType === "TesterResult" && record.body.workflowId === workflowId &&
          record.body.workItemId === workItemId && record.body.implementationRecordId === implementation.id);
      if (testerResults.length !== 1 || !["not-required", "committed"].includes(testerResults[0].body.checkpointState))
        throw Error("Validator requires the one exact completed TesterResult for the latest implementation.");
      const tester = testerResults[0];
      if (tester.body.recommendation === "production-defect-suspected") {
        const repair = await createProjectStateService(store, workflowApplication).createWorkflowRepair(projectId, { workflowId, workItemId, failureEvidenceId: tester.id });
        return { validation: null, repair, sourceMode: tester.body.sourceMode };
      }
      const acceptedSolutionIds = new Set(plan.solutions.map(solution => solution.id));
      const criterionEntry = plan.criteria.find(candidate => (candidate.ownerId === workItemId || acceptedSolutionIds.has(candidate.ownerId)) &&
        candidate.record.id === criterionId);
      if (!criterionEntry || criterionEntry.record.body.validationPolicy !== "semantic_ai" || criterionEntry.record.lifecycleState !== "active" || criterionEntry.record.body.criticality !== "required")
        throw Error("Semantic Validator requires an active required semantic_ai Criterion governed by this WorkItem or its accepted solution.");
      const sourceBacked = projection.source.state !== "non-source";
      let workingDirectory: string;
      if (sourceBacked) {
        if (projection.source.state !== "ready" || !projection.source.currentRevisionId || tester.body.sourceMode !== "source-backed" ||
          tester.body.candidateRevisionId !== projection.source.currentRevisionId) throw Error("Semantic Validator requires the exact post-Tester source candidate.");
        workingDirectory = fs.realpathSync(resolveManagedWorkflowCheckoutPath(fs.realpathSync(projectRoot), workflowId).checkoutRoot);
      } else {
        if (tester.body.sourceMode !== "source-neutral" || tester.body.candidateRevisionId ||
          (await store.listEntities(projectId, "SourceBinding")).some(record => record.entityType === "SourceBinding" && record.lifecycleState === "active" && record.body.workflowId === workflowId))
          throw Error("Source-neutral Validator cannot use fabricated repository identity.");
        const projectRootCanonical = fs.realpathSync(projectRoot);
        const runtimeRoot = path.join(projectRootCanonical, ".champcity", "runtime");
        fs.mkdirSync(path.join(runtimeRoot, "validator-readonly"), { recursive: true });
        workingDirectory = fs.realpathSync(path.join(runtimeRoot, "validator-readonly"));
        if (!workingDirectory.startsWith(`${path.join(projectRootCanonical, ".champcity")}${path.sep}`)) throw Error("Validator workspace escaped application-owned Project storage.");
      }
      const criterionEdges = (await store.listRelationships(projectId, "evaluates"))
        .filter(edge => edge.toEntityId === criterionId && !edge.endedAt);
      const deterministicEvidence = (await store.listEntities(projectId, "Validation"))
        .filter((record): record is ProjectStateRecord<"Validation"> => record.entityType === "Validation" &&
          criterionEdges.some(edge => edge.fromEntityId === record.id) && record.body.validationMode === "deterministic" &&
          record.body.targetRecordVersion === criterionEntry.record.recordVersion && record.body.implementationRecordId === implementation.id &&
          (sourceBacked ? record.body.sourceBaselineRef === projection.source.currentRevisionId : record.body.sourceBaselineRef === undefined))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
        .slice(-12).map(record => JSON.stringify({ validationId: record.id, outcome: record.body.outcome, method: record.body.method, summary: record.body.summary }).slice(0, 1400));
      const result = await reviewWorkItemCriterion({ workingDirectory, workflowId, workItemId, workItemTitle: item.record.body.title,
        criterion: criterionEntry.record, implementation, testerResult: tester, sourceMode: sourceBacked ? "source-backed" : "source-neutral",
        sourceRevisionId: sourceBacked ? projection.source.currentRevisionId : null, deterministicEvidence }, selection, createValidatorAdapter);
      if (result.principalId === implementation.createdBy.principalId || result.principalId === tester.createdBy.principalId)
        throw Error("Validator principal must be distinct from Implementer and Tester principals.");
      const validator = createProjectStateService(store, { principalId: result.principalId, principalType: "agent", role: "Validator" });
      const validation = await validator.recordValidation(projectId, criterionId, { validationType: "work-item-criterion", method: "independent-semantic-review",
        validationMode: "semantic_ai", outcome: result.outcome, summary: result.summary, targetRecordVersion: criterionEntry.record.recordVersion,
        implementationRecordId: implementation.id,
        ...(sourceBacked ? { sourceBaselineRef: projection.source.currentRevisionId! } : {}) });
      const repair = result.outcome === "fail" ? await createProjectStateService(store, workflowApplication).createWorkflowRepair(projectId,
        { workflowId, workItemId, failureEvidenceId: validation.id }) : null;
      return { validation, repair, sourceMode: sourceBacked ? "source-backed" as const : "source-neutral" as const };
    });
  }

  async function validateDeterministicWorkItemCriterion(projectRoot: string, workflowId: EntityId, workItemId: EntityId, criterionId: EntityId) {
    return withCurrentProject(projectRoot, async (store, projectId) => {
      const plan = await workItemPlan(store, projectId, await exactPlan(store, projectId, workflowId), workItemId);
      const projection = await project(store, projectId, plan);
      const item = projection.items.find(candidate => candidate.record.id === workItemId);
      if (!item || item.record.body.workState !== "validation_pending") throw Error("Deterministic Validator requires the exact active validation-pending WorkItem.");
      const state = createProjectStateService(store, operator);
      const implementation = (await state.getImplementationAttempts(projectId, workItemId)).at(-1);
      if (!implementation || implementation.body.outcome !== "implemented" || implementation.body.blockers.length) throw Error("Deterministic Validator requires the latest successful implementation.");
      const testerResults = (await store.listEntities(projectId, "TesterResult"))
        .filter((record): record is ProjectStateRecord<"TesterResult"> => record.entityType === "TesterResult" && record.body.workflowId === workflowId &&
          record.body.workItemId === workItemId && record.body.implementationRecordId === implementation.id);
      if (testerResults.length !== 1 || !["not-required", "committed"].includes(testerResults[0].body.checkpointState)) throw Error("Deterministic Validator requires one current completed TesterResult.");
      const tester = testerResults[0];
      if (tester.body.recommendation === "production-defect-suspected") {
        const repair = await createProjectStateService(store, workflowApplication).createWorkflowRepair(projectId, { workflowId, workItemId, failureEvidenceId: tester.id });
        return { validation: null, repair, reason: "Tester reported a production defect.", sourceMode: tester.body.sourceMode };
      }
      const solutionIds = new Set(plan.solutions.map(solution => solution.id));
      const criterionEntry = plan.criteria.find(candidate => (candidate.ownerId === workItemId || solutionIds.has(candidate.ownerId)) && candidate.record.id === criterionId);
      if (!criterionEntry || criterionEntry.record.lifecycleState !== "active" || criterionEntry.record.body.criticality !== "required" ||
        !["deterministic", "deferred_visual_phase"].includes(criterionEntry.record.body.validationPolicy))
        throw Error("Deterministic Validator requires an active required deterministic Criterion governed by this WorkItem or its accepted solution.");
      if (criterionEntry.record.body.validationPolicy === "deferred_visual_phase") return { validation: null, repair: null,
        reason: "Deferred visual Criterion remains pending for its Phase boundary.", sourceMode: tester.body.sourceMode };
      if (projection.source.state === "non-source") return { validation: null, repair: null,
        reason: "No source-neutral deterministic ValidationCatalog proof is available; no repository identity was created.", sourceMode: "source-neutral" as const };
      if (projection.source.state !== "ready" || !projection.source.currentRevisionId || tester.body.sourceMode !== "source-backed" || tester.body.candidateRevisionId !== projection.source.currentRevisionId)
        throw Error("Deterministic Validator requires the exact post-Tester source candidate.");
      const checkoutRoot = fs.realpathSync(resolveManagedWorkflowCheckoutPath(fs.realpathSync(projectRoot), workflowId).checkoutRoot);
      const targetRevision = await runBoundedGit({ cwd: checkoutRoot, args: ["rev-parse", "HEAD"] });
      const status = await runBoundedGit({ cwd: checkoutRoot, args: ["status", "--porcelain=v1", "--untracked-files=all"] });
      if (targetRevision.stdout.trim() !== projection.source.currentRevisionId || status.stdout.trim()) throw Error("Deterministic Validator candidate changed or is dirty.");
      const baseline = (await store.listEntities(projectId, "SourceBaseline"))
        .filter((record): record is ProjectStateRecord<"SourceBaseline"> => record.entityType === "SourceBaseline" && record.body.workflowId === workflowId);
      if (baseline.length !== 1) throw Error("Exact Workflow SourceBaseline is missing or ambiguous.");
      const diff = await runBoundedGit({ cwd: checkoutRoot, args: ["diff", "--name-only", "--no-renames", `${baseline[0].body.baseRevisionId}..${projection.source.currentRevisionId}`] });
      const changedPaths = diff.stdout.split(/\r?\n/).filter(Boolean).sort();
      const receipt = await runDeterministicWorkItemProfile(checkoutRoot, changedPaths, tester.body.affectedCapabilityIds);
      const validator = createProjectStateService(store, { principalId: `validator-catalog-${randomUUID()}`, principalType: "system", role: "Validator" });
      const validation = await validator.recordValidation(projectId, criterionId, { validationType: "work-item-criterion", method: "ValidationCatalog work-item profile",
        validationMode: "deterministic", outcome: receipt.status === "passed" ? "pass" : receipt.status === "failed" ? "fail" : "blocked",
        summary: receipt.summary, targetRecordVersion: criterionEntry.record.recordVersion, sourceBaselineRef: projection.source.currentRevisionId,
        implementationRecordId: implementation.id });
      const repair = receipt.status === "failed" ? await createProjectStateService(store, workflowApplication).createWorkflowRepair(projectId, { workflowId, workItemId, failureEvidenceId: validation.id }) : null;
      return { validation, repair, reason: receipt.status === "incomplete" ? "ValidationCatalog profile was incomplete; this is not a pass." : null,
        sourceMode: "source-backed" as const };
    });
  }

  async function project(store: ProjectStateStore, projectId: ProjectId, plan: WorkflowExecutionPlanView): Promise<WorkflowExecutionProjection> {
    const edges = (await store.listRelationships(projectId)).filter(edge => !edge.endedAt);
    const workflow = plan.workflow;
    const lineageIds = new Set((await store.listEntities(projectId, "Workflow"))
      .filter((record): record is WorkflowRecord => record.entityType === "Workflow" && record.lineageId === workflow.lineageId).map(record => record.id));
    const baselines = (await store.listEntities(projectId, "SourceBaseline"))
      .filter((record): record is ProjectStateRecord<"SourceBaseline"> => record.entityType === "SourceBaseline" && lineageIds.has(record.body.workflowId));
    const bindings = (await store.listEntities(projectId, "SourceBinding"))
      .filter((record): record is ProjectStateRecord<"SourceBinding"> => record.entityType === "SourceBinding" && record.lifecycleState === "active" && lineageIds.has(record.body.workflowId));
    if (baselines.length > 1 || bindings.length > 1 || bindings.length === 1 && (baselines.length !== 1 || bindings[0].body.sourceBaselineId !== baselines[0].id))
      throw Error("Workflow source state is ambiguous or inconsistent.");
    const binding = bindings[0];
    const source: WorkflowExecutionProjection["source"] = baselines.length === 0
      ? { state: "non-source", currentRevisionId: null }
      : binding?.body.preparationState === "ready"
        ? { state: "ready", baselineId: baselines[0].id, currentRevisionId: binding.body.currentRevisionId ?? null,
          workSourceLineId: binding.body.workSourceLineId ?? null, repositoryCheckoutId: binding.body.repositoryCheckoutId ?? null }
        : binding?.body.preparationState === "blocked"
          ? { state: "blocked", baselineId: baselines[0].id, currentRevisionId: null, failureCode: binding.body.failureCode }
          : { state: "unprepared", baselineId: baselines[0].id, currentRevisionId: null,
            workSourceLineId: binding?.body.workSourceLineId ?? null, repositoryCheckoutId: binding?.body.repositoryCheckoutId ?? null };
    const itemRecords = [...plan.directWorkItems, ...Object.values(plan.workItemsByPhase).flat()]
      .filter((record, index, all) => all.findIndex(candidate => candidate.id === record.id) === index)
      .sort((a, b) => a.id.localeCompare(b.id));
    const itemIds = new Set(itemRecords.map(record => record.id));
    const phaseByItem = new Map<EntityId, EntityId>();
    for (const phase of plan.phases) for (const itemId of phase.workItemIds) phaseByItem.set(itemId, phase.phaseId);
    const dependencies = new Map<EntityId, EntityId[]>();
    for (const edge of edges.filter(edge => edge.relationshipType === "depends_on" && (itemIds.has(edge.fromEntityId) || itemIds.has(edge.toEntityId)))) {
      if (!itemIds.has(edge.fromEntityId) || !itemIds.has(edge.toEntityId)) throw Error("Invalid cross-Workflow dependency in Project State.");
      dependencies.set(edge.fromEntityId, [...(dependencies.get(edge.fromEntityId) ?? []), edge.toEntityId]);
    }
    const itemList: WorkflowExecutionProjection["items"] = [];
    const state = createProjectStateService(store, operator);
    for (const record of itemRecords) {
      const blockers = new Set<string>();
      if (["superseded", "voided", "archived"].includes(record.lifecycleState) || ["closed", "cancelled"].includes(record.body.workState)) blockers.add("terminal");
      const dependencyIds = (dependencies.get(record.id) ?? []).sort();
      for (const dependencyId of dependencyIds) {
        const dependency = itemRecords.find(candidate => candidate.id === dependencyId);
        if (!dependency || dependency.body.workState !== "closed") blockers.add(`dependency:${dependencyId}`);
      }
      const phaseId = phaseByItem.get(record.id) ?? null;
      if (phaseId) {
        const owner = plan.phases.find(phase => phase.phaseId === phaseId);
        if (!owner || ["closed", "cancelled", "blocked"].includes(owner.record.body.phaseState)) blockers.add(`phase:${phaseId}`);
        else for (const prior of plan.phases.filter(phase => phase.sequence < owner.sequence)) {
          if (prior.record.body.phaseState !== "closed" || prior.workItemIds.some(id => itemRecords.find(item => item.id === id)?.body.workState !== "closed")) blockers.add(`prior-phase:${prior.phaseId}`);
        }
      }
      const disposition = await state.getEffectiveDisposition(projectId, record.id);
      if (["proposed", "revision_requested", "rejected", "revoked"].includes(disposition.state)) blockers.add("blocking-decision");
      if (["planned", "ready"].includes(record.body.workState)) {
        const contractReview = await state.getWorkItemPlanningReview(projectId, record.id);
        if (contractReview.required && contractReview.disposition.state !== "approved") blockers.add("work-item-contract-review-required");
      }
      for (const edge of edges.filter(edge => edge.relationshipType === "blocks" && edge.toEntityId === record.id)) {
        const blocker = await store.getEntity(projectId, edge.fromEntityId);
        if (blocker?.lifecycleState === "active") blockers.add(`blocking-record:${blocker.id}`);
      }
      const relatedRepairIds = plan.repairIds.filter(edge => edge.to === record.id).map(edge => edge.from).sort();
      const implementationAttempts = await state.getImplementationAttempts(projectId, record.id);
      const criterionIds = new Set(plan.criteria.filter(item => item.ownerId === record.id).map(item => item.record.id));
      const validationIds = new Set(edges.filter(edge => edge.relationshipType === "evaluates" &&
        (edge.toEntityId === record.id || criterionIds.has(edge.toEntityId))).map(edge => edge.fromEntityId));
      const validations = (await store.listEntities(projectId, "Validation"))
        .filter((candidate): candidate is ProjectStateRecord<"Validation"> => candidate.entityType === "Validation" && validationIds.has(candidate.id))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
      itemList.push({ record, phaseId, dependencyIds, eligibility: { workItemId: record.id, eligible: blockers.size === 0, blockers: [...blockers].sort() },
        implementationAttempts, validations, repairIds: relatedRepairIds });
    }
    const readyIds = itemList.filter(item => item.eligibility.eligible && ["planned", "ready"].includes(item.record.body.workState))
      .map(item => item.record.id).sort();
    const activeIds = itemList.filter(item => item.record.body.workState === "in_progress" || item.record.body.workState === "validation_pending")
      .map(item => item.record.id).sort();
    return { projectId, workflowId: workflow.id, plan, items: itemList, nextEligibleWorkItemIds: readyIds, activeWorkItemIds: activeIds,
      source, laterStages: { tester: null, validator: null, integration: null } };
  }

  async function prepareExecution(projectRoot: string, workflowId: EntityId, request: { sourceMutating: boolean }): Promise<WorkflowExecutionPreparationResult> {
    if (!request || typeof request !== "object" || Object.keys(request).length !== 1 || typeof request.sourceMutating !== "boolean")
      throw Error("A bounded execution preparation request is required.");
    const view = await getExecutionProjection(projectRoot, workflowId);
    if (view.source.state === "non-source") return request.sourceMutating
      ? { state: "blocked", currentRevisionId: null, failureCode: "SOURCE_CAPABILITY_UNAVAILABLE" }
      : { state: "non-source", currentRevisionId: null };
    if (!request.sourceMutating) return { state: view.source.state, currentRevisionId: view.source.currentRevisionId, ...(view.source.failureCode ? { failureCode: view.source.failureCode } : {}) };
    if (!dependencies.materializeWorkflowSource) return { state: "blocked", currentRevisionId: null, failureCode: "SOURCE_CHECKOUT_PREPARATION_UNAVAILABLE" };
    let recovering = true;
    try {
      // Recovery belongs to Start preparation, never to generic materialization or a status read.
      const anchor = await withCurrentProject(projectRoot, async (store, projectId) => {
        const baseline = view.source.baselineId ? await store.getEntity(projectId, view.source.baselineId) : null;
        if (baseline?.entityType !== "SourceBaseline") throw Error("Inspection required: immutable source anchor is missing.");
        return baseline.body.workflowId;
      });
      const checkout = resolveManagedWorkflowCheckoutPath(fs.realpathSync(projectRoot), anchor).checkoutRoot;
      const dirty = fs.existsSync(checkout) && Boolean((await runBoundedGit({ cwd: checkout, args: ["status", "--porcelain", "--untracked-files=all"] })).stdout);
      const blockedRecovery = view.source.state === "blocked" && view.source.failureCode === "REPOSITORY_CHECKOUT_MATERIALIZATION_FAILED";
      if (dirty || blockedRecovery) {
        const head = (await runBoundedGit({ cwd: checkout, args: ["rev-parse", "HEAD"] })).stdout.trim();
        const candidates = await withCurrentProject(projectRoot, async (store, projectId) => {
          const edges = (await store.listRelationships(projectId, "checkpoints")).filter(edge => !edge.endedAt);
          const committed = (await store.listEntities(projectId, "SourceCheckpoint")).filter(record => record.entityType === "SourceCheckpoint" && record.body.checkpointState === "committed");
          const state = createProjectStateService(store, operator);
          const gaps = [];
          for (const item of view.items) {
            const implementation = (await state.getImplementationAttempts(projectId, item.record.id)).at(-1);
            const linked = committed.filter(record => edges.some(edge => edge.toEntityId === implementation?.id && edge.fromEntityId === record.id));
            if (implementation?.body.outcome === "implemented" && item.record.body.affectedPaths?.length &&
              (!linked.length || blockedRecovery && linked.some(record => record.entityType === "SourceCheckpoint" && record.body.resultingRevisionId === head)))
              gaps.push({ workItemId: item.record.id, implementationRecordId: implementation.id });
          }
          return gaps;
        });
        if (candidates.length !== 1) throw Error("Inspection required: Workflow source has no unique recoverable implementation owner.");
        const recovered = await retryStructuredImplementationCheckpoint(projectRoot, view.projectId, workflowId, candidates[0].workItemId, candidates[0].implementationRecordId);
        if (recovered.checkpoint.state !== "committed") throw Error(`Inspection required: ${recovered.checkpoint.message}`);
      }
      recovering = false;
      const result = await dependencies.materializeWorkflowSource(fs.realpathSync(projectRoot), view.projectId, workflowId);
      const refreshed = await getExecutionProjection(projectRoot, workflowId);
      if (refreshed.source.state !== "ready" || result.binding.projectId !== view.projectId || result.binding.entityType !== "SourceBinding" ||
        result.binding.lifecycleState !== "active" || result.binding.body.workflowId !== workflowId ||
        result.binding.body.preparationState !== "ready" || result.binding.body.currentRevisionId !== refreshed.source.currentRevisionId ||
        result.binding.body.repositoryCheckoutId !== result.checkout.repositoryCheckoutId || result.checkout.workflowId !== workflowId || result.checkout.role !== "workflow")
        return { state: "blocked", currentRevisionId: null, failureCode: "SOURCE_MATERIALIZATION_IDENTITY_MISMATCH" };
      return { state: "ready", currentRevisionId: refreshed.source.currentRevisionId, repositoryCheckoutId: result.binding.body.repositoryCheckoutId,
        sourceBinding: result.binding, repositoryCheckout: result.checkout };
    } catch (error) {
      const failureCode = recovering ? `Inspection required: ${error instanceof Error ? error.message.replace(/^Inspection required: /i, "").slice(0, 512) : "source checkpoint recovery failed."}` :
        (error as Error & { materializationCode?: string }).materializationCode ?? (error instanceof Error && /inspection required/i.test(error.message) ? error.message.slice(0, 512) : "REPOSITORY_CHECKOUT_MATERIALIZATION_FAILED");
      return { state: "blocked", currentRevisionId: null, failureCode };
    }
  }

  async function buildWorkItemExecutionContract(projectRoot: string, workflowId: EntityId, workItemId: EntityId, input: {
    sourceMutation: "allowed" | "forbidden"; affectedPaths: string[]; proofIntent: string[];
  }, allowValidationPending: boolean): Promise<WorkItemExecutionContract> {
    if (!input || !["allowed", "forbidden"].includes(input.sourceMutation) || !Array.isArray(input.affectedPaths) || !Array.isArray(input.proofIntent))
      throw Error("A bounded Work Item execution contract is required.");
    for (const value of [...input.affectedPaths, ...input.proofIntent]) if (typeof value !== "string" || !value.trim() || value.length > 512) throw Error("Execution contract details must be bounded text.");
    return withCurrentProject(projectRoot, async (store, projectId) => {
      const plan = await workItemPlan(store, projectId, await exactPlan(store, projectId, workflowId), workItemId);
      const projection = await project(store, projectId, plan);
      if (input.sourceMutation === "allowed" && projection.source.state === "non-source") throw Error("SOURCE_CAPABILITY_UNAVAILABLE");
      if (projection.source.state !== "non-source" && projection.source.state !== "ready") throw Error("Source-backed execution requires a prepared exact Workflow checkout.");
      const item = projection.items.find(candidate => candidate.record.id === workItemId);
      if (!item) throw Error("Exact Work Item is not part of the selected Workflow plan.");
      const allowedStates = allowValidationPending ? ["validation_pending"] : ["planned", "ready", "blocked"];
      if (!allowValidationPending && item.record.body.workState === "blocked") await assertWorkItemRetryEligible(projectRoot, workflowId, workItemId);
      if (!item.eligibility.eligible || !allowedStates.includes(item.record.body.workState)) throw Error("Work Item is not eligible for this execution contract.");
      if (allowValidationPending) {
        const attempts = await createProjectStateService(store, operator).getImplementationAttempts(projectId, workItemId);
        if (attempts.at(-1)?.body.outcome !== "implemented") throw Error("Tester contract requires the latest successful implementation attempt.");
      }
      const solutionIds = (await store.listRelationships(projectId, "implements")).filter(edge => !edge.endedAt && edge.fromEntityId === workItemId).map(edge => edge.toEntityId);
      const solutions = plan.solutions.filter(solution => solutionIds.includes(solution.id));
      if (solutions.length !== 1) throw Error("Exact WorkItem BoundedSolution is missing or ambiguous.");
      const phase = item.phaseId ? plan.phases.find(candidate => candidate.phaseId === item.phaseId)?.record ?? null : null;
      if (!item.record.body.implementationBoundaries?.length || !item.record.body.proofIntent?.length || !item.record.body.affectedPaths) throw Error("Architect execution planning is required before Implementer execution.");
      if (projection.source.state === "non-source" && item.record.body.affectedPaths.length) throw Error("Source-neutral execution plan contains repository paths.");
      const criteria = plan.criteria.filter(candidate => candidate.ownerId === workItemId || candidate.ownerId === solutions[0]?.id).map(candidate => candidate.record).sort((a, b) => a.id.localeCompare(b.id));
      const solution = solutions[0];
      const body = {
        projectId, workflowId, workItemId, workItemVersion: item.record.recordVersion, objective: item.record.body.objective,
        solution, phase, criteria, dependencyIds: item.dependencyIds, scopeIn: [...solution.body.scopeIn], scopeOut: [...solution.body.scopeOut],
        constraints: [...solution.body.constraints], implementationBoundaries: [...item.record.body.implementationBoundaries], affectedPaths: [...item.record.body.affectedPaths].sort(), proofIntent: [...item.record.body.proofIntent],
        sourceMutation: item.record.body.affectedPaths.length > 0 ? "allowed" as const : "forbidden" as const, sourceRevisionId: projection.source.currentRevisionId,
      };
      const serialized = JSON.stringify(body);
      const digest = createHash("sha256").update(serialized).digest("hex");
      return { contractId: `work-item-contract:${digest}`, digest, ...body };
    });
  }

  async function createWorkItemExecutionContract(projectRoot: string, workflowId: EntityId, workItemId: EntityId, input: {
    sourceMutation: "allowed" | "forbidden"; affectedPaths: string[]; proofIntent: string[];
  }): Promise<WorkItemExecutionContract> {
    return buildWorkItemExecutionContract(projectRoot, workflowId, workItemId, input, false);
  }

  async function createTesterWorkItemExecutionContract(projectRoot: string, workflowId: EntityId, workItemId: EntityId, input: {
    sourceMutation: "allowed" | "forbidden"; affectedPaths: string[]; proofIntent: string[];
  }): Promise<WorkItemExecutionContract> {
    return buildWorkItemExecutionContract(projectRoot, workflowId, workItemId, input, true);
  }

  async function createSourceNeutralWorkItemExecutionContract(projectRoot: string, workflowId: EntityId, workItemId: EntityId, input: {
    affectedPaths: string[]; proofIntent: string[];
  }, allowValidationPending = false): Promise<WorkItemExecutionContract> {
    return withCurrentProject(projectRoot, async (store, projectId) => {
      const plan = await workItemPlan(store, projectId, await exactPlan(store, projectId, workflowId), workItemId);
      const projection = await project(store, projectId, plan);
      if (projection.source.state !== "non-source") throw Error("Exact Codex WorkItem mode requires a source-neutral Workflow.");
      if (!Array.isArray(input?.affectedPaths) || !Array.isArray(input?.proofIntent)) throw Error("A bounded source-neutral execution contract is required.");
      for (const value of [...input.affectedPaths, ...input.proofIntent]) if (typeof value !== "string" || !value.trim() || value.length > 512) throw Error("Execution contract details must be bounded text.");
      const item = projection.items.find(candidate => candidate.record.id === workItemId);
      if (!item) throw Error("Exact Work Item is not part of the selected Workflow plan.");
      if (!allowValidationPending && item.record.body.workState === "blocked") await assertWorkItemRetryEligible(projectRoot, workflowId, workItemId);
      if ((!allowValidationPending && (!item.eligibility.eligible || !["planned", "ready", "blocked"].includes(item.record.body.workState))) ||
        (allowValidationPending && item.record.body.workState !== "validation_pending")) throw Error("Work Item is not eligible for this source-neutral execution contract.");
      if (allowValidationPending) {
        const attempts = await createProjectStateService(store, operator).getImplementationAttempts(projectId, workItemId);
        if (attempts.at(-1)?.body.outcome !== "implemented") throw Error("Tester contract requires the latest successful implementation attempt.");
      }
      const solutionIds = (await store.listRelationships(projectId, "implements")).filter(edge => !edge.endedAt && edge.fromEntityId === workItemId).map(edge => edge.toEntityId);
      const solutions = plan.solutions.filter(solution => solutionIds.includes(solution.id));
      if (solutions.length !== 1) throw Error("Exact WorkItem BoundedSolution is missing or ambiguous.");
      const phase = item.phaseId ? plan.phases.find(candidate => candidate.phaseId === item.phaseId)?.record ?? null : null;
      if (!item.record.body.implementationBoundaries?.length || !item.record.body.proofIntent?.length || !item.record.body.affectedPaths) throw Error("Architect execution planning is required before Implementer execution.");
      if (item.record.body.affectedPaths.length) throw Error("Source-neutral execution plan contains repository paths.");
      const criteria = plan.criteria.filter(candidate => candidate.ownerId === workItemId || candidate.ownerId === solutions[0]?.id).map(candidate => candidate.record).sort((a, b) => a.id.localeCompare(b.id));
      const solution = solutions[0];
      const body = { projectId, workflowId, workItemId, workItemVersion: item.record.recordVersion, objective: item.record.body.objective,
        solution, phase, criteria, dependencyIds: item.dependencyIds, scopeIn: [...solution.body.scopeIn], scopeOut: [...solution.body.scopeOut],
        constraints: [...solution.body.constraints], implementationBoundaries: [...item.record.body.implementationBoundaries], affectedPaths: [], proofIntent: [...item.record.body.proofIntent],
        sourceMutation: "forbidden" as const, sourceRevisionId: null };
      const digest = createHash("sha256").update(JSON.stringify(body)).digest("hex");
      return { contractId: `work-item-contract:${digest}`, digest, ...body };
    });
  }

  async function prepareImplementationAttempt(projectRoot: string, workflowId: EntityId, workItemId: EntityId) {
    const view = await getExecutionProjection(projectRoot, workflowId);
    const item = view.items.find(candidate => candidate.record.id === workItemId);
    if (item?.record.body.workState === "blocked") await assertWorkItemRetryEligible(projectRoot, workflowId, workItemId);
    return withCurrentProject(projectRoot, (store, projectId) => createProjectStateService(store, operator).prepareImplementationAttempt(projectId, workflowId, workItemId, undefined, item?.record.recordVersion));
  }

  // Read-only readiness; Start alone creates the next reservation and begins execution.
  async function assertWorkItemRetryEligible(projectRoot: string, workflowId: EntityId, workItemId: EntityId) {
    return withCurrentProject(projectRoot, async (store, projectId) => {
      const state = createProjectStateService(store, operator);
      const item = await store.getEntity(projectId, workItemId);
      if (item?.entityType !== "WorkItem") throw Error("Exact blocked WorkItem is unavailable.");
      await state.assertBlockedImplementationRetry(projectId, workflowId, workItemId, item.recordVersion);
      const attempt = await state.getImplementationAttempt(projectId, workflowId, workItemId);
      if (!attempt) throw Error("Exact retry attempt evidence is missing.");
      if (attempt.body.attemptState === "completed") await getDurableImplementationEvidence(projectRoot, workflowId, workItemId, attempt.id);
      const view = await getExecutionProjection(projectRoot, workflowId);
      if (attempt.body.sourceMode === "source-backed") {
        const source = view.source;
        if (source.state !== "ready" || !source.repositoryCheckoutId || !source.workSourceLineId || source.currentRevisionId !== attempt.body.sourceRevisionId)
          throw Error("Blocked retry requires the unchanged ready source binding.");
        const checkout = resolveManagedWorkflowCheckoutPath(fs.realpathSync(projectRoot), workflowId).checkoutRoot;
        const lease = acquireWorkflowExecutionLease(workflowExecutionLeaseKey("source-backed", checkout), `retry-inspection:${attempt.id}`);
        if (!lease) throw Error("Blocked retry has a competing execution lease.");
        try {
          const paths = await reconcileWorkflowSource(fs.realpathSync(projectRoot), workflowId, {
            repositoryCheckoutId: source.repositoryCheckoutId, sourceLineId: source.workSourceLineId, expectedRevisionId: attempt.body.sourceRevisionId!,
          });
          if (paths.length || (await runBoundedGit({cwd: checkout, args: ["status", "--porcelain", "--untracked-files=all"]})).stdout)
            throw Error("Blocked retry requires the exact clean checkout with no remaining source delta.");
        } finally { lease.release(); }
      } else if (view.source.state !== "non-source") throw Error("Blocked retry source identity changed.");
      return item.recordVersion;
    });
  }
  async function getWorkflowSourceInspection(projectRoot: string, workflowId: EntityId) {
    return withCurrentProject(projectRoot, async (store, projectId) => {
      const plan = await exactPlan(store, projectId, workflowId);
      const { source } = await project(store, projectId, plan);
      const baseline = source.baselineId ? await store.getEntity(projectId, source.baselineId) : null;
      if (source.state !== "non-source" && baseline?.entityType !== "SourceBaseline") throw Error("Exact Workflow source anchor is missing.");
      return { source, checkoutWorkflowId: baseline?.entityType === "SourceBaseline" ? baseline.body.workflowId : null };
    });
  }

  async function getImplementationAttempt(projectRoot: string, workflowId: EntityId, workItemId: EntityId) {
    return withCurrentProject(projectRoot, async (store, projectId) => {
      const state = createProjectStateService(store, operator);
      const plan = await state.getWorkflowExecutionPlan(projectId, workflowId);
      if (![...plan.directWorkItems, ...Object.values(plan.workItemsByPhase).flat()].some(item => item.id === workItemId)) throw Error("Exact owned WorkItem required.");
      const attempt = await state.getImplementationAttempt(projectId, workflowId, workItemId);
      return attempt ? state.getImplementationAttemptReport(projectId, attempt.id) : null;
    });
  }

  /** Read the immutable result and reserved SQL context; never reserve, prepare, or repair source. */
  async function getDurableImplementationEvidence(projectRoot: string, workflowId: EntityId, workItemId: EntityId, attemptId: EntityId) {
    return withCurrentProject(projectRoot, async (store, projectId) => {
      const state = createProjectStateService(store, operator);
      const plan = await state.getWorkflowExecutionPlan(projectId, workflowId);
      if (![...plan.directWorkItems, ...Object.values(plan.workItemsByPhase).flat()].some(item => item.id === workItemId))
        throw Error("Durable attempt WorkItem is not owned by the exact Workflow.");
      const attempt = await state.getImplementationAttempt(projectId, workflowId, workItemId);
      if (!attempt || attempt.id !== attemptId || attempt.projectId !== projectId || attempt.body.workflowId !== workflowId || attempt.body.workItemId !== workItemId ||
        attempt.body.attemptState !== "completed" || !attempt.body.implementationRecordId)
        throw Error("Exact completed ImplementationAttempt is unavailable.");
      const results = (await store.listEntities(projectId, "ImplementationRecord")).filter((record): record is ProjectStateRecord<"ImplementationRecord"> =>
        record.entityType === "ImplementationRecord" && record.body.executionRef === attempt.id);
      if (results.length !== 1 || results[0].projectId !== projectId || results[0].id !== attempt.body.implementationRecordId || results[0].body.workItemId !== workItemId ||
        (await state.getImplementationAttempts(projectId, workItemId)).at(-1)?.id !== results[0].id)
        throw Error("Durable attempt result linkage is stale or ambiguous.");
      const result = results[0];
      const edges = (await store.listRelationships(projectId)).filter(edge => !edge.endedAt);
      for (const [type, from, to] of [["implementation_attempt_for", attempt.id, workItemId], ["attempt_result", result.id, attempt.id], ["implements_work_item", result.id, workItemId]]) {
        const links = edges.filter(edge => edge.relationshipType === type && edge.fromEntityId === from);
        if (links.length !== 1 || links[0].toEntityId !== to) throw Error("Durable attempt ownership linkage is inconsistent.");
      }
      const sources = await Promise.all(attempt.body.layout.sources.map(async source => {
        const record = await store.getEntityVersion(projectId, source.entityId, source.recordVersion);
        if (!record || record.id !== source.entityId || record.recordVersion !== source.recordVersion || record.projectId !== projectId)
          throw Error("Reserved historical attempt context is missing or changed identity.");
        return record;
      }));
      if (new Set(sources.map(record => record.id)).size !== sources.length ||
        JSON.stringify(sources.map(record => record.id)) !== JSON.stringify(attempt.body.layout.memberIds))
        throw Error("Reserved historical attempt layout is ambiguous.");
      const workItems = sources.filter((record): record is ProjectStateRecord<"WorkItem"> => record.entityType === "WorkItem" && record.id === workItemId);
      const historicalWorkItem = workItems[0];
      const workflow = sources.find(record => record.entityType === "Workflow" && record.id === workflowId);
      if (workItems.length !== 1 || historicalWorkItem.recordVersion !== attempt.body.workItemVersion || !workflow ||
        !historicalWorkItem.body.implementationBoundaries?.length || !historicalWorkItem.body.proofIntent?.length || !Array.isArray(historicalWorkItem.body.affectedPaths))
        throw Error("Reserved historical WorkItem contract is unavailable or changed identity.");
      const baselines = sources.filter((record): record is ProjectStateRecord<"SourceBaseline"> => record.entityType === "SourceBaseline");
      const bindings = sources.filter((record): record is ProjectStateRecord<"SourceBinding"> => record.entityType === "SourceBinding");
      if (baselines.length > 1 || bindings.length > 1 || (attempt.body.sourceMode === "source-backed") !== (baselines.length === 1) ||
        baselines.some(record => record.body.workflowId !== workflowId) || bindings.some(record => record.body.workflowId !== workflowId || record.body.sourceBaselineId !== baselines[0]?.id))
        throw Error("Reserved historical source identity is inconsistent.");
      if ((bindings[0]?.body.currentRevisionId ?? baselines[0]?.body.baseRevisionId) !== attempt.body.sourceRevisionId)
        throw Error("Reserved historical source revision is inconsistent.");
      const digest = createHash("sha256").update(JSON.stringify([sources.filter(record => record.entityType !== "SourceBinding").map(record => [record.id, record.recordVersion]),
        [baselines[0]?.id ?? null, bindings[0]?.id ?? null, attempt.body.sourceRevisionId ?? null]])).digest("hex");
      if (digest !== attempt.body.contractDigest || attempt.body.contractId !== `work-item-reservation:${digest}`)
        throw Error("Reserved historical contract digest does not match SQL context.");
      const checkpointLinks = edges.filter(edge => edge.relationshipType === "checkpoints" && edge.toEntityId === result.id);
      if (checkpointLinks.length > 1) throw Error("Durable implementation checkpoint is ambiguous.");
      const checkpointRecord = checkpointLinks.length ? await store.getEntity(projectId, checkpointLinks[0].fromEntityId) : null;
      if (checkpointRecord && (checkpointRecord.entityType !== "SourceCheckpoint" || checkpointRecord.body.workflowId !== workflowId ||
        checkpointRecord.body.boundaryId !== attempt.id || checkpointRecord.body.checkpointKind !== "implementation" ||
        checkpointRecord.body.expectedRevisionId !== attempt.body.sourceRevisionId)) throw Error("Durable implementation checkpoint identity mismatch.");
      if (checkpointLinks.length && !checkpointRecord) throw Error("Durable implementation checkpoint is missing.");
      const checkpoint = checkpointRecord?.entityType === "SourceCheckpoint" ? checkpointRecord : null;
      const testerResults = (await store.listEntities(projectId, "TesterResult")).filter((record): record is ProjectStateRecord<"TesterResult"> =>
        record.entityType === "TesterResult" && record.body.implementationRecordId === result.id);
      if (testerResults.length > 1) throw Error("Durable implementation Tester evidence is ambiguous.");
      const tester = testerResults[0];
      let testerCandidateRevisionId: string | null = null;
      let testerCheckpoint: ProjectStateRecord<"SourceCheckpoint"> | null = null;
      if (tester?.body.checkpointState === "committed") {
        const candidateCheckpoint = tester.body.sourceCheckpointId ? await store.getEntity(projectId, tester.body.sourceCheckpointId) : null;
        if (tester.body.workflowId !== workflowId || tester.body.workItemId !== workItemId || tester.body.sourceMode !== attempt.body.sourceMode ||
          candidateCheckpoint?.entityType !== "SourceCheckpoint" || candidateCheckpoint.body.workflowId !== workflowId || candidateCheckpoint.body.checkpointKind !== "tester" ||
          candidateCheckpoint.body.boundaryId !== `tester-result:${tester.id}` || candidateCheckpoint.body.checkpointState !== "committed" ||
          candidateCheckpoint.body.expectedRevisionId !== tester.body.implementerRevisionId ||
          tester.body.implementerRevisionId !== (checkpoint?.body.resultingRevisionId ?? attempt.body.sourceRevisionId) ||
          candidateCheckpoint.body.resultingRevisionId !== tester.body.candidateRevisionId ||
          !edges.some(edge => edge.relationshipType === "checkpoints" && edge.fromEntityId === candidateCheckpoint.id && edge.toEntityId === tester.id))
          throw Error("Durable Tester candidate checkpoint identity mismatch.");
        testerCheckpoint = candidateCheckpoint;
        testerCandidateRevisionId = tester.body.candidateRevisionId ?? null;
      }
      return { attempt, result, historicalWorkItem, historicalBinding: bindings[0] ?? null, historicalBaseline: baselines[0] ?? null, checkpoint,
        testerCandidateRevisionId, testerCheckpoint, phaseId: sources.find(record => record.entityType === "Phase")?.id ?? null };
    });
  }

  async function assertImplementationAttemptCurrent(projectRoot: string, attemptId: EntityId) {
    return withCurrentProject(projectRoot, (store, projectId) => createProjectStateService(store, operator).assertImplementationAttemptCurrent(projectId, attemptId));
  }
  async function beginWorkItemAttempt(projectRoot: string, workflowId: EntityId, workItemId: EntityId, expectedVersion: number, executionRef: string) {
    // Older direct Run callers may omit preparation; the durable identity still owns execution.
    const report = await getImplementationAttempt(projectRoot, workflowId, workItemId);
    const attempt = report?.attempt.body.attemptState === "prepared" ? report.attempt : await prepareImplementationAttempt(projectRoot, workflowId, workItemId);
    if (executionRef && /^[0-9a-f-]{36}$/i.test(executionRef) && executionRef !== attempt.id) throw Error("Prepared attempt identity mismatch.");
    return withCurrentProject(projectRoot, (store, projectId) => createProjectStateService(store,
      { principalId: `codex-implementer:${attempt.id}`, principalType: "agent", role: "Implementer" })
      .beginWorkItemAttempt(projectId, workflowId, workItemId, expectedVersion, attempt.id));
  }

  async function finishWorkItemAttempt(projectRoot: string, workflowId: EntityId, workItemId: EntityId, executionRef: string,
    result: { summary: string; deviations: string[]; blockers: string[]; residualRisks: string[]; outcome: "implemented" | "partial" | "blocked" | "failed" | "abandoned" }) {
    return withCurrentProject(projectRoot, (store, projectId) => createProjectStateService(store,
      { principalId: `codex-implementer:${executionRef}`, principalType: "agent", role: "Implementer" })
      .finishWorkItemAttempt(projectId, workflowId, workItemId, executionRef, result));
  }

  return { getExecutionProjection, getWorkflowExecutionCompletionProjection, completeWorkflowExecution, getWorkItemValidationProjection, getCheckpointRecoveryProjection,
    retryImplementationCheckpoint, retryTesterCheckpoint, decomposeWorkflowWorkItem, acceptWorkItemExecutionPlan, assertWorkItemPlanningRevisionEligible,
    recordWorkItemVisualCriterion, recordWorkItemCriterionDecision, getPhaseValidationProjection, recordPhaseVisualCriterion,
    recordPhaseCriterionDecision, validateDeterministicPhaseCriterion, validateSemanticPhaseCriterion,
    completeWorkItem, completePhase, createWorkflowRepair, createPhaseRepair, validateSemanticWorkItemCriterion, validateDeterministicWorkItemCriterion, prepareExecution, createWorkItemExecutionContract, createTesterWorkItemExecutionContract,
    prepareImplementationAttempt, assertWorkItemRetryEligible, getImplementationAttempt, getWorkflowSourceInspection, getDurableImplementationEvidence, assertImplementationAttemptCurrent, createSourceNeutralWorkItemExecutionContract, beginWorkItemAttempt, finishWorkItemAttempt };
}
