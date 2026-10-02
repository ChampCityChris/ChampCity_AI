import type {EntityId} from "./projectState/domainContracts";
export type GreenfieldStage = "project-intake-capture" | "architect-interview" | "project-planning-review" | "project-phase-map" | "phase-interview" | "phase-planning-bundle" | "workflow-execution" | "workflow-hub";

/** Renderer navigation facts derived only from the exact SQL Project Creation Workflow. */
export interface GreenfieldNavigationProjection {
  workflowId: EntityId;
  currentWorkspace: GreenfieldStage;
  currentPhaseId: EntityId | null;
  currentWorkItemId: EntityId | null;
  nextEligibleWorkspace: GreenfieldStage | null;
  closed: boolean;
  reason: string | null;
}
