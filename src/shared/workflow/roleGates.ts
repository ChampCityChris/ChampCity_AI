import type { RoutedActionContract, WorkflowRole, WorkflowStateIndex } from "./workflowContracts";

export type RoleGateDenialCode =
  | "blocked_action"
  | "role_mismatch"
  | "stale_action"
  | "stale_state_revision"
  | "output_identity_mismatch";

export type RoleGateResult =
  | { allowed: true }
  | { allowed: false; code: RoleGateDenialCode; message: string };

export interface RoleGateRequest {
  actorRole: WorkflowRole;
  actionId: string;
  stateRevision: number;
  outputArtifactId?: string;
  outputArtifactType?: string;
}

export class WorkflowRoleGateError extends Error {
  constructor(readonly code: RoleGateDenialCode, message: string) {
    super(message);
    this.name = "WorkflowRoleGateError";
  }
}

export function evaluateRoleGate(
  state: WorkflowStateIndex,
  action: RoutedActionContract,
  request: RoleGateRequest,
): RoleGateResult {
  if (action.authorityStatus !== "ready" || action.blockers.length > 0) {
    return { allowed: false, code: "blocked_action", message: `Action ${action.actionId} is blocked and cannot accept a write.` };
  }
  if (state.currentActionId !== action.actionId || request.actionId !== action.actionId) {
    return { allowed: false, code: "stale_action", message: "The requested action is not the current routed action." };
  }
  if (
    request.stateRevision !== state.stateRevision ||
    request.stateRevision !== action.stateRevision ||
    action.bindingSource.stateRevision !== state.stateRevision
  ) {
    return { allowed: false, code: "stale_state_revision", message: "The routed action was created from a stale workflow-state revision." };
  }
  if (request.actorRole !== action.role) {
    return { allowed: false, code: "role_mismatch", message: `Action ${action.actionId} requires ${action.role}; ${request.actorRole} is not authorized.` };
  }
  if (
    (request.outputArtifactId !== undefined && request.outputArtifactId !== action.expectedOutput.artifactId) ||
    (request.outputArtifactType !== undefined && request.outputArtifactType !== action.expectedOutput.artifactType)
  ) {
    return { allowed: false, code: "output_identity_mismatch", message: "The proposed output does not match the routed action's expected output identity." };
  }
  return { allowed: true };
}

export function assertRoleGate(
  state: WorkflowStateIndex,
  action: RoutedActionContract,
  request: RoleGateRequest,
): void {
  const result = evaluateRoleGate(state, action, request);
  if (!result.allowed) {
    throw new WorkflowRoleGateError(result.code, result.message);
  }
}
