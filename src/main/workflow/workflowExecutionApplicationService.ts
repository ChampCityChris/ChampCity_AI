import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import type { EntityId, ProjectId, ProjectStateRecord } from "../../shared/projectState/domainContracts";
import { createProjectStateService, type WorkflowExecutionPlanView } from "../../shared/projectState/projectStateService";
import type { ProjectStateStore } from "../../shared/projectState/projectStateStore";
import type { PhaseValidationProjection, WorkItemExecutionContract, WorkItemValidationProjection, WorkflowExecutionCompletionProjection, WorkflowExecutionPreparationResult, WorkflowExecutionProjection, WorkflowWorkItemDecompositionInput } from "../../shared/workflowApplicationContracts";
import { createSQLiteProjectStateStore } from "../projectState/sqliteProjectStateStore";
import { selectedCurrentProjectId } from "../projectState/currentProjectRegistrationService";
import type { CodexModelSelection } from "../../shared/codexRuntimeContracts";
import { resolveManagedWorkflowCheckoutPath } from "../sourceControl/projectSourceTopology";
import { reviewWorkItemCriterion } from "./semanticWorkItemValidator";
import { loadCodexAppServerAdapter, type CodexAppServerAdapter } from "../workCardBuilding/codexAppServerTransport";
import { runBoundedGit } from "../agentHarness/repository/boundedGit";
import { runDeterministicWorkItemProfile } from "./deterministicWorkItemValidator";

const operator = { principalId: "local-operator", principalType: "human" as const, role: "Operator" };
const workflowApplication = { principalId: "workflow-execution-application", principalType: "system" as const, role: "System" };
const workflowCompletionApplication = { principalId: "workflow-execution-completion", principalType: "system" as const, role: "WorkflowExecution" };
type WorkflowRecord = ProjectStateRecord<"Workflow">;
const implementationWorkflowTypes = new Set(["feature-capability", "issue-resolution"]);

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
      throw Error("Execution requires a current Feature or Issue Workflow in this Project.");
    const lineage = (await store.listEntities(projectId, "Workflow"))
      .filter((record): record is WorkflowRecord => record.entityType === "Workflow" && record.lineageId === workflow.lineageId);
    const current = lineage.filter(isCurrentWorkflow);
    if (current.length !== 1 || current[0].id !== workflowId) throw Error("Execution Workflow ID is not the unique current Workflow in its lineage.");
    return createProjectStateService(store, operator).getWorkflowExecutionPlan(projectId, workflowId);
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
      if (plan.solutions.length !== 1 || plan.decisions.length !== 1) blockers.push("accepted-plan-missing-or-ambiguous");
      if (view.source.state !== "non-source" && view.source.state !== "ready") blockers.push("source-not-ready");
      const state = createProjectStateService(store, operator);
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
      const phaseAndSolutionOwners = new Set<EntityId>(plan.solutions.map(solution => solution.id));
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
      const plan = await exactPlan(store, projectId, workflowId);
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
      if (implementation?.body.outcome === "implemented" && (!tester || tester.body.checkpointState === "pending" || tester.body.checkpointState === "blocked"))
        throw Error("Exact current TesterResult is missing or its checkpoint is unresolved.");
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

  async function acceptWorkItemExecutionPlan(projectRoot: string, input: import("../../shared/workflowApplicationContracts").WorkItemExecutionPlanInput) {
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
      const workflow = await exactPlan(store, projectId, input.workflowId);
      if (!implementationWorkflowTypes.has(workflow.workflow.body.workflowType)) throw Error("Execution planning requires the exact current Feature/Issue Workflow.");
      const projection = await project(store, projectId, workflow);
      const item = projection.items.find(candidate => candidate.record.id === input.workItemId);
      if (!item || !["planned", "ready"].includes(item.record.body.workState) || item.record.recordVersion !== input.expectedVersion) throw Error("Execution planning requires the exact current planned/ready WorkItem.");
      if (item.repairIds.some(id => projection.items.some(candidate => candidate.record.id === id && !["closed", "cancelled"].includes(candidate.record.body.workState)))) throw Error("Execution planning is blocked while an active Repair owns the next correction.");
      if (item.implementationAttempts.length) {
        const latest = item.implementationAttempts.at(-1)!;
        const scopeFailure = latest.body.outcome === "failed" && latest.body.blockers.some(value => /outside the accepted Architect path scope|exact checkout restored/i.test(value));
        if (!(item.record.body.workState === "ready" && latest.body.outcome !== "implemented" && (scopeFailure || ["partial", "failed", "abandoned"].includes(latest.body.outcome))))
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
      if (projection.source.state !== "non-source" && !affectedPaths.length) throw Error("Source-backed execution plans require at least one accepted repository path.");
      const criterionIds = workflow.criteria.filter(candidate => candidate.ownerId === item.record.id || candidate.ownerId === workflow.solutions[0]?.id).map(candidate => candidate.record.id);
      const validations = (await store.listEntities(projectId, "Validation")).filter((record): record is ProjectStateRecord<"Validation"> => record.entityType === "Validation" && (record.body.targetEntityId === item.record.id || criterionIds.includes(record.body.targetEntityId)));
      const testers = (await store.listEntities(projectId, "TesterResult")).filter(record => record.entityType === "TesterResult" && record.body.workflowId === input.workflowId && record.body.workItemId === input.workItemId);
      const attemptRefs = new Set(item.implementationAttempts.map(record => record.body.executionRef).filter((value): value is string => Boolean(value)));
      const checkpoints = (await store.listEntities(projectId, "SourceCheckpoint")).filter((record): record is ProjectStateRecord<"SourceCheckpoint"> => record.entityType === "SourceCheckpoint" && record.body.workflowId === input.workflowId && attemptRefs.has(record.body.boundaryId));
      if ((!item.implementationAttempts.length && validations.length) || (!item.implementationAttempts.length && testers.length) || checkpoints.some(record => record.body.checkpointState !== "not-required")) throw Error("Execution plan cannot change after implementation evidence or source checkpoints exist.");
      if (projection.source.state === "non-source" && affectedPaths.length) throw Error("Source-neutral execution plans must have an empty affected-path scope.");
      const state = createProjectStateService(store, operator);
      return state.reviseRecord(projectId, item.record.id, { implementationBoundaries, affectedPaths, proofIntent }, input.expectedVersion);
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
      const plan = await exactPlan(store, projectId, input.workflowId);
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
      const plan = await exactPlan(store, projectId, input.workflowId), view = await project(store, projectId, plan);
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
        (phase.workItemIds.includes(entry.ownerId) || phaseIndex === plan.phases.length - 1 && plan.solutions.some(solution => solution.id === entry.ownerId)));
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
        (phase.workItemIds.includes(entry.ownerId) || phaseIndex === plan.phases.length - 1 && plan.solutions.some(solution => solution.id === entry.ownerId)));
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
      const plan = await exactPlan(store, projectId, workflowId);
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
      const plan = await exactPlan(store, projectId, workflowId);
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
    try {
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
      const failureCode = (error as Error & { materializationCode?: string }).materializationCode ?? "REPOSITORY_CHECKOUT_MATERIALIZATION_FAILED";
      return { state: "blocked", currentRevisionId: null, failureCode };
    }
  }

  async function buildWorkItemExecutionContract(projectRoot: string, workflowId: EntityId, workItemId: EntityId, input: {
    sourceMutation: "required" | "not-required"; affectedPaths: string[]; proofIntent: string[];
  }, allowValidationPending: boolean): Promise<WorkItemExecutionContract> {
    if (!input || !["required", "not-required"].includes(input.sourceMutation) || !Array.isArray(input.affectedPaths) || !Array.isArray(input.proofIntent))
      throw Error("A bounded Work Item execution contract is required.");
    for (const value of [...input.affectedPaths, ...input.proofIntent]) if (typeof value !== "string" || !value.trim() || value.length > 512) throw Error("Execution contract details must be bounded text.");
    return withCurrentProject(projectRoot, async (store, projectId) => {
      const plan = await exactPlan(store, projectId, workflowId);
      const projection = await project(store, projectId, plan);
      if (input.sourceMutation === "required" && projection.source.state === "non-source") throw Error("SOURCE_CAPABILITY_UNAVAILABLE");
      if (input.sourceMutation === "required" && projection.source.state !== "ready") throw Error("Source-backed execution requires a prepared exact Workflow checkout.");
      const item = projection.items.find(candidate => candidate.record.id === workItemId);
      if (!item) throw Error("Exact Work Item is not part of the selected Workflow plan.");
      const allowedStates = allowValidationPending ? ["validation_pending"] : ["planned", "ready"];
      if (!item.eligibility.eligible || !allowedStates.includes(item.record.body.workState)) throw Error("Work Item is not eligible for this execution contract.");
      if (allowValidationPending) {
        const attempts = await createProjectStateService(store, operator).getImplementationAttempts(projectId, workItemId);
        if (attempts.at(-1)?.body.outcome !== "implemented") throw Error("Tester contract requires the latest successful implementation attempt.");
      }
      if (plan.solutions.length !== 1) throw Error("Accepted BoundedSolution is missing or ambiguous.");
      const phase = item.phaseId ? plan.phases.find(candidate => candidate.phaseId === item.phaseId)?.record ?? null : null;
      if (!item.record.body.implementationBoundaries?.length || !item.record.body.proofIntent?.length || !item.record.body.affectedPaths) throw Error("Architect execution planning is required before Implementer execution.");
      if (projection.source.state === "non-source" && item.record.body.affectedPaths.length) throw Error("Source-neutral execution plan contains repository paths.");
      const criteria = plan.criteria.filter(candidate => candidate.ownerId === workItemId || candidate.ownerId === plan.solutions[0]?.id).map(candidate => candidate.record).sort((a, b) => a.id.localeCompare(b.id));
      const solution = plan.solutions[0];
      const body = {
        projectId, workflowId, workItemId, workItemVersion: item.record.recordVersion, objective: item.record.body.objective,
        solution, phase, criteria, dependencyIds: item.dependencyIds, scopeIn: [...solution.body.scopeIn], scopeOut: [...solution.body.scopeOut],
        constraints: [...solution.body.constraints], implementationBoundaries: [...item.record.body.implementationBoundaries], affectedPaths: [...item.record.body.affectedPaths].sort(), proofIntent: [...item.record.body.proofIntent],
        sourceMutation: input.sourceMutation, sourceRevisionId: projection.source.currentRevisionId,
      };
      const serialized = JSON.stringify(body);
      const digest = createHash("sha256").update(serialized).digest("hex");
      return { contractId: `work-item-contract:${digest}`, digest, ...body };
    });
  }

  async function createWorkItemExecutionContract(projectRoot: string, workflowId: EntityId, workItemId: EntityId, input: {
    sourceMutation: "required" | "not-required"; affectedPaths: string[]; proofIntent: string[];
  }): Promise<WorkItemExecutionContract> {
    return buildWorkItemExecutionContract(projectRoot, workflowId, workItemId, input, false);
  }

  async function createTesterWorkItemExecutionContract(projectRoot: string, workflowId: EntityId, workItemId: EntityId, input: {
    sourceMutation: "required" | "not-required"; affectedPaths: string[]; proofIntent: string[];
  }): Promise<WorkItemExecutionContract> {
    return buildWorkItemExecutionContract(projectRoot, workflowId, workItemId, input, true);
  }

  async function createSourceNeutralWorkItemExecutionContract(projectRoot: string, workflowId: EntityId, workItemId: EntityId, input: {
    affectedPaths: string[]; proofIntent: string[];
  }, allowValidationPending = false): Promise<WorkItemExecutionContract> {
    return withCurrentProject(projectRoot, async (store, projectId) => {
      const plan = await exactPlan(store, projectId, workflowId);
      const projection = await project(store, projectId, plan);
      if (projection.source.state !== "non-source") throw Error("Exact Codex WorkItem mode requires a source-neutral Workflow.");
      if (!Array.isArray(input?.affectedPaths) || !Array.isArray(input?.proofIntent)) throw Error("A bounded source-neutral execution contract is required.");
      for (const value of [...input.affectedPaths, ...input.proofIntent]) if (typeof value !== "string" || !value.trim() || value.length > 512) throw Error("Execution contract details must be bounded text.");
      const item = projection.items.find(candidate => candidate.record.id === workItemId);
      if (!item) throw Error("Exact Work Item is not part of the selected Workflow plan.");
      if ((!allowValidationPending && (!item.eligibility.eligible || !["planned", "ready"].includes(item.record.body.workState))) ||
        (allowValidationPending && item.record.body.workState !== "validation_pending")) throw Error("Work Item is not eligible for this source-neutral execution contract.");
      if (allowValidationPending) {
        const attempts = await createProjectStateService(store, operator).getImplementationAttempts(projectId, workItemId);
        if (attempts.at(-1)?.body.outcome !== "implemented") throw Error("Tester contract requires the latest successful implementation attempt.");
      }
      if (plan.solutions.length !== 1) throw Error("Accepted BoundedSolution is missing or ambiguous.");
      const phase = item.phaseId ? plan.phases.find(candidate => candidate.phaseId === item.phaseId)?.record ?? null : null;
      if (!item.record.body.implementationBoundaries?.length || !item.record.body.proofIntent?.length || !item.record.body.affectedPaths) throw Error("Architect execution planning is required before Implementer execution.");
      if (item.record.body.affectedPaths.length) throw Error("Source-neutral execution plan contains repository paths.");
      const criteria = plan.criteria.filter(candidate => candidate.ownerId === workItemId || candidate.ownerId === plan.solutions[0]?.id).map(candidate => candidate.record).sort((a, b) => a.id.localeCompare(b.id));
      const solution = plan.solutions[0];
      const body = { projectId, workflowId, workItemId, workItemVersion: item.record.recordVersion, objective: item.record.body.objective,
        solution, phase, criteria, dependencyIds: item.dependencyIds, scopeIn: [...solution.body.scopeIn], scopeOut: [...solution.body.scopeOut],
        constraints: [...solution.body.constraints], implementationBoundaries: [...item.record.body.implementationBoundaries], affectedPaths: [], proofIntent: [...item.record.body.proofIntent],
        sourceMutation: "not-required" as const, sourceRevisionId: null };
      const digest = createHash("sha256").update(JSON.stringify(body)).digest("hex");
      return { contractId: `work-item-contract:${digest}`, digest, ...body };
    });
  }

  async function beginWorkItemAttempt(projectRoot: string, workflowId: EntityId, workItemId: EntityId, expectedVersion: number, executionRef: string) {
    return withCurrentProject(projectRoot, (store, projectId) => createProjectStateService(store,
      { principalId: `codex-implementer:${executionRef}`, principalType: "agent", role: "Implementer" })
      .beginWorkItemAttempt(projectId, workflowId, workItemId, expectedVersion, executionRef));
  }

  async function finishWorkItemAttempt(projectRoot: string, workflowId: EntityId, workItemId: EntityId, executionRef: string,
    result: { summary: string; deviations: string[]; blockers: string[]; residualRisks: string[]; outcome: "implemented" | "partial" | "blocked" | "failed" | "abandoned" }) {
    return withCurrentProject(projectRoot, (store, projectId) => createProjectStateService(store,
      { principalId: `codex-implementer:${executionRef}`, principalType: "agent", role: "Implementer" })
      .finishWorkItemAttempt(projectId, workflowId, workItemId, executionRef, result));
  }

  return { getExecutionProjection, getWorkflowExecutionCompletionProjection, completeWorkflowExecution, getWorkItemValidationProjection, decomposeWorkflowWorkItem, acceptWorkItemExecutionPlan,
    recordWorkItemVisualCriterion, recordWorkItemCriterionDecision, getPhaseValidationProjection, recordPhaseVisualCriterion,
    recordPhaseCriterionDecision, validateDeterministicPhaseCriterion, validateSemanticPhaseCriterion,
    completeWorkItem, completePhase, createWorkflowRepair, createPhaseRepair, validateSemanticWorkItemCriterion, validateDeterministicWorkItemCriterion, prepareExecution, createWorkItemExecutionContract, createTesterWorkItemExecutionContract,
    createSourceNeutralWorkItemExecutionContract, beginWorkItemAttempt, finishWorkItemAttempt };
}
