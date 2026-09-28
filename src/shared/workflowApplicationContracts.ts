import type { LifecycleState, WorkflowState } from "./projectState/domainContracts";
import type { WorkflowType } from "./projectState/workflowTypeRegistry";
import type { EntityId, ProjectId, ProjectStateRecord } from "./projectState/domainContracts";
import type { WorkflowExecutionPlanView, WorkItemDecompositionInput } from "./projectState/projectStateService";
import type { RepositoryCheckout } from "./sourceLifecycleContracts";

export interface WorkflowInstanceSummary {
  workflowId: string;
  lineageId: string;
  workflowType: WorkflowType;
  title: string;
  workflowState: WorkflowState;
  lifecycleState: LifecycleState;
  currentWorkspace: string;
  createdAt: string;
  updatedAt: string;
  workIntakeId?: string;
  routedSourceWorkflowId?: string;
  routedTargetWorkflowId?: string;
}

export interface WorkflowInventoryGroup {
  workflowType: WorkflowType;
  workflows: WorkflowInstanceSummary[];
}

export interface WorkflowInventory {
  groups: WorkflowInventoryGroup[];
}

export interface DirectWorkflowStartRequest {
  workflowType: WorkflowType;
  title: string;
}

export interface DirectWorkflowStartResult {
  workflow: WorkflowInstanceSummary;
}

/** Exact identity is required for navigation; display fields are never lookup keys. */
export interface WorkflowOpenResult {
  workflow: WorkflowInstanceSummary;
}

export type WorkflowExecutionSourceState = "non-source" | "unprepared" | "ready" | "blocked";
export interface WorkflowExecutionEligibility { workItemId: EntityId; eligible: boolean; blockers: string[] }
export interface WorkflowExecutionItem {
  record: ProjectStateRecord<"WorkItem">;
  phaseId: EntityId | null;
  dependencyIds: EntityId[];
  eligibility: WorkflowExecutionEligibility;
  implementationAttempts: ProjectStateRecord<"ImplementationRecord">[];
  validations: ProjectStateRecord<"Validation">[];
  repairIds: EntityId[];
}
export interface WorkflowExecutionProjection {
  projectId: ProjectId;
  workflowId: EntityId;
  plan: WorkflowExecutionPlanView;
  items: WorkflowExecutionItem[];
  nextEligibleWorkItemIds: EntityId[];
  activeWorkItemIds: EntityId[];
  source: { state: WorkflowExecutionSourceState; baselineId?: EntityId | null; currentRevisionId: string | null; workSourceLineId?: string | null; repositoryCheckoutId?: string | null; failureCode?: string };
  laterStages: { tester: null; validator: null; integration: null };
}
export interface WorkflowExecutionCompletionProjection {
  workflowId: EntityId;
  workflowVersion: number;
  sourceMode: "source-backed" | "source-neutral";
  sourceRevisionId: string | null;
  eligible: boolean;
  blockers: string[];
}

export interface WorkItemValidationProjection {
  workflowId: EntityId;
  workItemId: EntityId;
  workItemVersion: number;
  sourceMode: "source-backed" | "source-neutral";
  sourceRevisionId: string | null;
  implementationRecordId: EntityId | null;
  testerResultId: EntityId | null;
  criteria: Array<{
    ownerId: EntityId;
    criterion: ProjectStateRecord<"Criterion">;
    policy: ProjectStateRecord<"Criterion">["body"]["validationPolicy"];
    outcome: "pass" | "fail" | "blocked" | "inconclusive" | "pending" | "deferred";
    validationIds: EntityId[];
    reason: string | null;
    repairable: boolean;
    humanEvidenceRequired: boolean;
    decisionTargetId: EntityId | null;
    decisionState: string | null;
  }>;
  completion: { eligible: boolean; blockers: string[] };
}
export interface PhaseValidationProjection {
  workflowId: EntityId;
  phaseId: EntityId;
  phaseVersion: number;
  sourceRevisionId: string | null;
  workItemsClosed: boolean;
  criteria: Array<{
    ownerId: EntityId;
    criterion: ProjectStateRecord<"Criterion">;
    policy: ProjectStateRecord<"Criterion">["body"]["validationPolicy"];
    outcome: "pass" | "fail" | "blocked" | "inconclusive" | "pending" | "deferred";
    validationId: EntityId | null;
    decisionTargetId: EntityId | null;
    decisionState: string | null;
    reason: string | null;
  }>;
  completion: { eligible: boolean; blockers: string[] };
}
export type WorkflowWorkItemDecompositionInput = WorkItemDecompositionInput;
export interface WorkflowWorkItemVisualCriterionInput {
  workflowId: EntityId; workItemId: EntityId; criterionId: EntityId; expectedCriterionVersion: number;
  implementationRecordId: EntityId; sourceRevisionId: string | null; summary: string;
}
export interface WorkflowWorkItemCriterionDecisionInput extends Omit<WorkflowWorkItemVisualCriterionInput, "summary"> {
  outcome: "approved" | "rejected"; rationale: string;
}
export interface WorkflowPhaseVisualCriterionInput {
  workflowId: EntityId; phaseId: EntityId; criterionId: EntityId; expectedCriterionVersion: number; expectedPhaseVersion: number;
  sourceRevisionId: string | null; summary: string;
}
export interface WorkflowPhaseCriterionDecisionInput {
  workflowId: EntityId; phaseId: EntityId; criterionId: EntityId; expectedCriterionVersion: number; expectedPhaseVersion: number;
  outcome: "approved" | "rejected"; rationale: string;
}
export interface WorkflowExecutionPreparationResult {
  state: WorkflowExecutionSourceState;
  currentRevisionId: string | null;
  failureCode?: string;
  repositoryCheckoutId?: string;
  sourceBinding?: ProjectStateRecord<"SourceBinding">;
  repositoryCheckout?: RepositoryCheckout;
}

export interface WorkItemExecutionContract {
  contractId: string;
  digest: string;
  projectId: ProjectId;
  workflowId: EntityId;
  workItemId: EntityId;
  workItemVersion: number;
  objective: string;
  solution: ProjectStateRecord<"BoundedSolution">;
  phase: ProjectStateRecord<"Phase"> | null;
  criteria: ProjectStateRecord<"Criterion">[];
  dependencyIds: EntityId[];
  scopeIn: string[];
  scopeOut: string[];
  constraints: string[];
  affectedPaths: string[];
  proofIntent: string[];
  sourceMutation: "required" | "not-required";
  sourceRevisionId: string | null;
}
