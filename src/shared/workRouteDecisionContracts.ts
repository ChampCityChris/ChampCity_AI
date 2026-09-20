import type { SourceRevision } from "./documents/planningDocument";
import type { ArchitectRouteAssessment, OperatorRouteDecision, OperatorRouteSelection, WorkRouteId, WorkRouteRerouteRecommendation, WorkRouteSupersession } from "./workIntakeRoutingContracts";

export interface WorkRouteDecisionInput {
  expectedDecisionRevision: number;
  sourceAssessment: SourceRevision;
  disposition: "accept" | "override" | "request-revision";
  selectedRouteId?: WorkRouteId;
  rationale: string;
}
export interface WorkRouteRerouteInput {
  priorDecisionId: string;
  replacementRouteId: WorkRouteId;
  rationale: string;
  sourceEvidence: SourceRevision[];
}
export interface WorkRouteDecisionEntry {
  decision: OperatorRouteDecision;
  sourceIntake: SourceRevision;
  advice: ArchitectRouteAssessment | WorkRouteRerouteRecommendation;
  recordedAt: string;
}
export interface WorkRouteDecisionModel {
  intakeId: string;
  relativePath: string;
  artifactRevision: number;
  state: "awaiting-assessment" | "awaiting-decision" | "selected" | "revision-requested" | "reroute-required" | "stale";
  selection: OperatorRouteSelection | null;
  history: WorkRouteDecisionEntry[];
  supersessions: WorkRouteSupersession[];
  recommendation: (ArchitectRouteAssessment | WorkRouteRerouteRecommendation) | null;
  sourceAssessment: SourceRevision | null;
  error?: string;
}
