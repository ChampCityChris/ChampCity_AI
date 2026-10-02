import type {EntityId} from "./projectState/domainContracts";
import type {WorkspaceId} from "./workspaceContracts";

/** Renderer navigation facts derived only from the exact SQL Project Creation Workflow. */
export interface GreenfieldNavigationProjection {
  workflowId: EntityId;
  currentWorkspace: WorkspaceId;
  currentPhaseId: EntityId | null;
  currentWorkItemId: EntityId | null;
  nextEligibleWorkspace: WorkspaceId | null;
  closed: boolean;
  reason: string | null;
}
