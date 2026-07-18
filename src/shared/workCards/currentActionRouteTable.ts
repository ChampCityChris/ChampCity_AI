import {
  getWorkflowActionCatalogEntry,
  workflowActionCatalog,
  type WorkflowRole,
  type WorkflowScreenId,
} from "../workflow";

export interface CurrentActionSurfaceRoute {
  actionId: string;
  responsibleRole: WorkflowRole;
  uiSurface: WorkflowScreenId;
  manualScreenId: string;
  authorizedOperations: readonly string[];
  targetArtifact: string;
  sourceArtifactBundle: string;
  expectedOutputArtifactType: string;
}

export const currentActionSurfaceRoutes: readonly CurrentActionSurfaceRoute[] =
  workflowActionCatalog.map((entry) => ({
    actionId: entry.actionId,
    responsibleRole: entry.role,
    uiSurface: entry.screenId,
    manualScreenId: entry.manualScreenId,
    authorizedOperations: entry.authorizedOperations,
    targetArtifact: entry.targetRule.replaceAll("_", " "),
    sourceArtifactBundle: entry.requiredSourceRule.replaceAll("_", " "),
    expectedOutputArtifactType: entry.expectedOutputArtifactType,
  }));

export const currentActionSurfaceRouteById: Readonly<Record<string, CurrentActionSurfaceRoute>> =
  Object.freeze(
    Object.fromEntries(currentActionSurfaceRoutes.map((entry) => [entry.actionId, entry])),
  );

export function getCurrentActionSurfaceRoute(
  actionId: string | undefined,
): CurrentActionSurfaceRoute | undefined {
  const entry = getWorkflowActionCatalogEntry(actionId);
  return entry ? currentActionSurfaceRouteById[entry.actionId] : undefined;
}
