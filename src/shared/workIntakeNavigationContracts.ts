import type { WorkRouteId } from "./workIntakeRoutingContracts";
import type { WorkItemExecutionStage } from "./planExecutionContracts";

export type WorkIntakeStageId = "intake" | "routing" | "assessment" | "plan" | "execution" | "integration";

export interface WorkIntakeStageAvailability {
  stageId: WorkIntakeStageId;
  label: string;
  available: boolean;
  reason: string;
  requiresArchitect: boolean;
}

/** Read-only navigation derived from current workflow owners; never persisted. */
export interface WorkIntakeNavigationProjection {
  intakeId: string | null;
  requiredStageId: WorkIntakeStageId;
  stages: WorkIntakeStageAvailability[];
  selectedRouteId: WorkRouteId | null;
  execution: {
    status: "ready" | "active" | "blocked" | "awaiting-criteria" | "complete";
    nextWorkItemId: string | null;
    currentStep: WorkItemExecutionStage | null;
  } | null;
  issueAssessmentExternallyOwned: boolean;
}
