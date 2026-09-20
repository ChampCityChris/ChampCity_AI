export interface LegacyPhaseArtifactScope {
  kind: "legacy-phase";
  phaseId: string;
}
interface RoutedPlanArtifactScope {
  intakeId: string;
  routeDecisionId: string;
  planId: string;
}
export type WorkItemArtifactScopeReference = LegacyPhaseArtifactScope |
  (RoutedPlanArtifactScope & { kind: "routed-direct-plan"; phaseId?: never }) |
  (RoutedPlanArtifactScope & { kind: "routed-phase"; phaseId: string });

/** Legacy projections keep their Phase field; direct routed projections cannot invent one. */
export type WorkItemArtifactScopeProjection<T extends WorkItemArtifactScopeReference = WorkItemArtifactScopeReference> =
  T extends LegacyPhaseArtifactScope ? { phaseId: string; artifactScope?: T } :
  T extends { kind: "routed-phase" } ? { phaseId: string; artifactScope: T } :
  { phaseId?: never; artifactScope: T };
