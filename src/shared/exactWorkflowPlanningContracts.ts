import type { createProjectStateService, WorkflowExecutionPlanView } from "./projectState/projectStateService";
import type { WorkflowType } from "./projectState/workflowTypeRegistry";
import type { WorkResearchOutcome } from "./workPlanningContracts";
export interface ExactWorkflowPlanningModel {
  workflowId: string; workflowType: WorkflowType;
  acceptedPlan: WorkflowExecutionPlanView | null;
  review: Awaited<ReturnType<ReturnType<typeof createProjectStateService>["getPlanReview"]>> | null;
  staleReview?: {cycleId: string; recordVersion: number; reason: string};
  handoff: string | null; researchOutcome: WorkResearchOutcome | null;
}
