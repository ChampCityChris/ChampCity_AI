import {
  assertRoleGate,
  createReferenceNavigationState,
  type ReferenceNavigationState,
  type RoleGateRequest,
  type RoutedActionContract,
  type WorkflowStateIndex,
} from "../../shared/workflow";

export interface WorkflowAuthoritySnapshot {
  state: WorkflowStateIndex;
  routedAction: RoutedActionContract | null;
}

export interface WorkflowAuthorityProvider {
  getAuthoritySnapshot(): Promise<WorkflowAuthoritySnapshot>;
}

export class RoutedActionService {
  constructor(private readonly authorityProvider: WorkflowAuthorityProvider) {}

  async getAuthoritySnapshot(): Promise<WorkflowAuthoritySnapshot> {
    return this.authorityProvider.getAuthoritySnapshot();
  }

  /** Reloads authority at the process boundary before authorizing a preview/save. */
  async authorizeCurrentAction(request: RoleGateRequest): Promise<RoutedActionContract> {
    const snapshot = await this.getAuthoritySnapshot();
    if (!snapshot.routedAction) throw new Error("The workflow has no routed action.");
    assertRoleGate(snapshot.state, snapshot.routedAction, request);
    return snapshot.routedAction;
  }
}

/**
 * Reference state is intentionally updated through a separate function and
 * cannot carry action, target, source, output, route, or revision authority.
 */
export function updateReferenceNavigation(
  previous: ReferenceNavigationState | null,
  input: {
    selectedArtifactIds?: readonly string[];
    previewArtifactId?: string | null;
    updatedAt: string;
  },
): ReferenceNavigationState {
  return createReferenceNavigationState(
    input.updatedAt,
    input.selectedArtifactIds ?? previous?.selectedArtifactIds ?? [],
    input.previewArtifactId === undefined
      ? previous?.previewArtifactId ?? null
      : input.previewArtifactId,
  );
}
