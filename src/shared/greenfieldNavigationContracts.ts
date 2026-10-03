import type {ExecutionContextProjection} from "./workspaceContracts";
import type {EntityId} from "./projectState/domainContracts";
export type GreenfieldStage = "project-intake-capture" | "architect-interview" | "project-planning-review" | "project-phase-map" | "phase-interview" | "phase-planning-bundle" | "phase-work-card-selection" | "work-card-intake" | "work-card-planning" | "work-card-building-review" | "work-card-report-review" | "work-card-validation" | "work-card-repair" | "work-card-close" | "phase-validation" | "phase-close" | "project-validation" | "project-close" | "workflow-hub";

/** Renderer navigation facts derived only from the exact SQL Project Creation Workflow. */
export interface GreenfieldNavigationProjection {
  workflowId: EntityId;
  currentWorkspace: GreenfieldStage;
  currentPhaseId: EntityId | null;
  currentWorkItemId: EntityId | null;
  nextEligibleWorkspace: GreenfieldStage | null;
  closed: boolean;
  reason: string | null;
  currentRepairId:EntityId|null;
  parentWorkItemId:EntityId|null;
  blockers:string[];
  completedWorkspaces:GreenfieldStage[];
  executionContext:ExecutionContextProjection;
  phaseStates:Array<{phaseId:EntityId;title:string;state:string}>;
  workItemStates:Array<{workItemId:EntityId;phaseId:EntityId|null;title:string;state:string;planningEligible:boolean;parentWorkItemId:EntityId|null}>;
}
