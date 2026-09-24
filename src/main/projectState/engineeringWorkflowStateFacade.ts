import type { EntityBodyMap, EntityId, PrincipalRef, ProjectId, TestLifecycleAssessmentStatus } from "../../shared/projectState/domainContracts";
import { createProjectStateService, type DecisionInput } from "../../shared/projectState/projectStateService";
import type { ProjectStateStore } from "../../shared/projectState/projectStateStore";

type WorkInput = Pick<EntityBodyMap["WorkItem"], "title" | "objective" | "workItemKind">;
type CriterionInput = Omit<EntityBodyMap["Criterion"], "criterionState">;
type ImplementationInput = Omit<EntityBodyMap["ImplementationRecord"], "workItemId">;
type ValidationInput = Parameters<ReturnType<typeof createProjectStateService>["recordValidation"]>[2];

/** Structured semantic adapter for active engineering workflows; V1 IPC keeps its legacy façade until cutover. */
export function createEngineeringWorkflowStateFacade(store: ProjectStateStore, principal: PrincipalRef) {
  const state = createProjectStateService(store, principal);
  return {
    async startDevelopment(projectId: ProjectId, governingEntityId: EntityId) {
      void governingEntityId;
      return state.createWorkflow(projectId, { workflowType: "feature-capability", title: "Feature / Capability", currentWorkspace: "development" });
    },
    async addPhase(projectId: ProjectId, workflowId: EntityId, input: Pick<EntityBodyMap["Phase"], "title" | "objective" | "sequence">) {
      const workflow = await state.getRecord(projectId, workflowId);
      if (workflow?.entityType !== "Workflow" || workflow.lifecycleState !== "active") throw Error("Active Workflow is required for a Phase.");
      const phase = await state.createRecord(projectId, "Phase", { ...input, phaseState: "planned" });
      await state.createRelationship(projectId, phase.id, "part_of", workflowId);
      return phase;
    },
    async addWorkItem(projectId: ProjectId, input: WorkInput, parentId?: EntityId) {
      const parent = parentId ? await state.getRecord(projectId, parentId) : null;
      if (parentId && (!parent || !["Workflow", "Phase", "WorkItem"].includes(parent.entityType) || parent.lifecycleState !== "active")) {
        throw Error("Active Workflow, Phase, or Work Item parent is required.");
      }
      const item = await state.createRecord(projectId, "WorkItem", { ...input, workState: "planned" });
      if (parentId) await state.createRelationship(projectId, item.id, "part_of", parentId);
      return item;
    },
    async decomposeWorkItem(projectId: ProjectId, parentId: EntityId, children: WorkInput[]) {
      if (children.length === 0 || children.length > 50) throw Error("Work Item decomposition requires one to fifty children.");
      const parent = await state.getRecord(projectId, parentId);
      if (parent?.entityType !== "WorkItem" || parent.lifecycleState !== "active") throw Error("Active parent Work Item is required.");
      const result = [];
      for (const child of children) {
        const item = await state.createRecord(projectId, "WorkItem", { ...child, workState: "planned" });
        await state.createRelationship(projectId, item.id, "part_of", parentId);
        result.push(item);
      }
      return result;
    },
    async addRepair(projectId: ProjectId, targetId: EntityId, input: Omit<WorkInput, "workItemKind"> & { kind: "fix" | "repair" }) {
      const target = await state.getRecord(projectId, targetId);
      if (target?.entityType !== "WorkItem") throw Error("Repair target must be a Work Item.");
      const repair = await state.createRecord(projectId, "WorkItem", { title: input.title, objective: input.objective,
        workItemKind: input.kind, workState: "planned" });
      await state.createRelationship(projectId, repair.id, "repairs", targetId);
      return repair;
    },
    async defineCriterion(projectId: ProjectId, targetId: EntityId, input: CriterionInput) {
      const target = await state.getRecord(projectId, targetId);
      if (!target || !["WorkItem", "Phase", "BoundedSolution"].includes(target.entityType)) throw Error("Criterion owner is unavailable.");
      const criterion = await state.createRecord(projectId, "Criterion", { ...input, criterionState: "active" });
      await state.createRelationship(projectId, targetId, "defines_criterion", criterion.id);
      return criterion;
    },
    async recordImplementation(projectId: ProjectId, workItemId: EntityId, input: ImplementationInput) {
      return state.recordImplementation(projectId, workItemId, input);
    },
    async recordValidation(projectId: ProjectId, targetId: EntityId, input: ValidationInput) {
      return state.recordValidation(projectId, targetId, input);
    },
    async recordReviewDecision(projectId: ProjectId, targetId: EntityId, input: DecisionInput) {
      return state.recordDecision(projectId, targetId, input);
    },
    async workItemStatus(projectId: ProjectId, workItemId: EntityId, sourceBaselineRef?: string) {
      return { record: await state.getRecord(projectId, workItemId), attempts: await state.getImplementationAttempts(projectId, workItemId),
        eligibility: await state.getWorkItemCompletionEligibility(projectId, workItemId, sourceBaselineRef),
        projection: await state.renderView(projectId, { projectionType: "work-item", sourceEntityId: workItemId }) };
    },
    async completeWorkItem(projectId: ProjectId, workItemId: EntityId, expectedRevision: number, sourceBaselineRef?: string) {
      return state.completeWorkItem(projectId, workItemId, expectedRevision, sourceBaselineRef);
    },
    async phaseStatus(projectId: ProjectId, phaseId: EntityId, sourceBaselineRef?: string) {
      return { record: await state.getRecord(projectId, phaseId), eligibility: await state.getPhaseCompletionEligibility(projectId, phaseId, sourceBaselineRef),
        plan: await state.getExecutionPlan(projectId) };
    },
    async completePhase(projectId: ProjectId, phaseId: EntityId, expectedRevision: number, sourceBaselineRef?: string) {
      return state.completePhase(projectId, phaseId, expectedRevision, sourceBaselineRef);
    },
    async recordIssueAnalysis(projectId: ProjectId, input: {
      finding: Pick<EntityBodyMap["Finding"], "title" | "statement" | "category" | "impact">;
      rootCause: Pick<EntityBodyMap["RootCause"], "title" | "statement" | "rationale">;
      solution: EntityBodyMap["BoundedSolution"];
    }) {
      const finding = await state.createRecord(projectId, "Finding", { ...input.finding, observedAt: new Date().toISOString(), findingState: "open" });
      const rootCause = await state.createRecord(projectId, "RootCause", { ...input.rootCause, rootCauseState: "active" });
      await state.createRelationship(projectId, rootCause.id, "explains", finding.id);
      const solution = await state.createRecord(projectId, "BoundedSolution", input.solution);
      await state.createRelationship(projectId, solution.id, "addresses", rootCause.id);
      return { finding, rootCause, solution };
    },
    async addIssueFix(projectId: ProjectId, solutionId: EntityId, input: Omit<WorkInput, "workItemKind">, repairTargetId?: EntityId) {
      const solution = await state.getRecord(projectId, solutionId);
      if (solution?.entityType !== "BoundedSolution") throw Error("Issue Fix requires a Bounded Solution.");
      const target = repairTargetId ? await state.getRecord(projectId, repairTargetId) : null;
      if (repairTargetId && target?.entityType !== "WorkItem") throw Error("Issue Fix repair target must be a Work Item.");
      const fix = await state.createRecord(projectId, "WorkItem", { ...input, workItemKind: "fix", workState: "planned" });
      await state.createRelationship(projectId, fix.id, "implements", solutionId);
      if (repairTargetId) await state.createRelationship(projectId, fix.id, "repairs", repairTargetId);
      return fix;
    },
    async issueStatus(projectId: ProjectId, findingId: EntityId) {
      return { finding: await state.getRecord(projectId, findingId), related: await state.queryRecords(projectId, { relatedTo: findingId, limit: 100 }),
        current: await state.getCurrentProjectStateView(projectId, { limitPerSection: 100 }) };
    },
    async createRegressionObligation(projectId: ProjectId, input: Omit<EntityBodyMap["RegressionObligation"], "obligationState">) {
      return state.createRegressionObligation(projectId, input);
    },
    async assessRegressionObligation(projectId: ProjectId, obligationId: EntityId, input: { status: TestLifecycleAssessmentStatus; summary: string; method: string }) {
      return state.recordTestLifecycleAssessment(projectId, obligationId, input);
    },
    async recordRegressionProof(projectId: ProjectId, workItemId: EntityId,
      input: Parameters<ReturnType<typeof createProjectStateService>["recordImplementationProof"]>[2]) {
      return state.recordImplementationProof(projectId, workItemId, input);
    },
    async regressionStatus(projectId: ProjectId, obligationId: EntityId) { return state.getRegressionObligationView(projectId, obligationId); },
    async getCurrent(projectId: ProjectId) { return state.getCurrentProjectStateView(projectId, { limitPerSection: 100 }); },
  };
}
