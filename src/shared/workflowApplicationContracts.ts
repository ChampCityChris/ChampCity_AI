import type { LifecycleState, WorkflowState } from "./projectState/domainContracts";
import type { WorkflowType } from "./projectState/workflowTypeRegistry";

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
