import type { LifecycleState, WorkflowState } from "./projectState/domainContracts";
import type { WorkflowType } from "./projectState/workflowTypeRegistry";
import type { EntityId, ProjectId, ProjectStateRecord } from "./projectState/domainContracts";
import type { WorkflowExecutionPlanView } from "./projectState/projectStateService";

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
  source: { state: WorkflowExecutionSourceState; currentRevisionId: string | null; failureCode?: string };
  laterStages: { tester: null; validator: null; integration: null };
}
export interface WorkflowExecutionPreparationResult {
  state: WorkflowExecutionSourceState;
  currentRevisionId: string | null;
  failureCode?: string;
  repositoryCheckoutId?: string;
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
