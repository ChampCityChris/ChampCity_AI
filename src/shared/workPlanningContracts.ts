import type { ArchitectDraftSubmission } from "./architectOutputs/architectOutputContracts";
import type { DocumentDispositionStatus } from "./documents/documentDisposition";
import type { SourceRevision } from "./documents/planningDocument";
import type { WorkRouteId } from "./workIntakeRoutingContracts";

export type PlanTopology = "direct" | "phased";
export type WorkPlanningStage = "assessment" | "plan";
export interface WorkResearchOutcome {
  outcome: "no-implementation-plan-required" | "research-plan-required";
  prototypeDisposition: "disposable" | "candidate-for-later-work";
  productionFollowUp: "none" | "new-work-intake-required";
  evidence: string[];
  decisionEnabled: string;
  successFailureResult: string;
  closureCondition: string;
}
export interface WorkPlanningIdentity {
  intakeId: string;
  projectId: string;
  routeDecisionId: string;
  routeId: WorkRouteId;
  assessmentId?: string;
  planId?: string;
}
export interface PlanWorkItemCandidate {
  workItemId: string;
  title: string;
  purpose: string;
  dependsOn: string[];
  acceptanceCriteria: string[];
  phaseId?: string;
}
export interface PlanPhaseCandidate {
  phaseId: string;
  title: string;
  purpose: string;
  dependsOn: string[];
  acceptanceCriteria: string[];
}
export type WorkPlanStructure = {
  topologyRationale: string;
  acceptanceCriteria: string[];
  workItems: PlanWorkItemCandidate[];
} & ({ topology: "direct"; phases?: never } | { topology: "phased"; phases: PlanPhaseCandidate[] });

/** Profile content supplies discovery; the common kernel owns all workflow mechanics. */
export interface WorkPlanningProfile {
  routeId: WorkRouteId;
  requiredEvidence: readonly string[];
  discoveryQuestions: readonly string[];
  assessmentSections: readonly string[];
  planSections: readonly string[];
  topologyCriteria: readonly string[];
}
export interface WorkPlanningArtifact {
  identity: WorkPlanningIdentity;
  relativePath: string;
  artifactRevision: number;
  sourceRevisions: SourceRevision[];
  disposition: DocumentDispositionStatus;
  reviewNotes: string;
  stale: boolean;
  bodyMarkdown: string;
  structure?: WorkPlanStructure;
  researchOutcome?: WorkResearchOutcome;
}
export interface WorkPlanningModel {
  intakeId: string;
  routeId: WorkRouteId;
  stage: WorkPlanningStage;
  artifact: WorkPlanningArtifact | null;
  submission?: ArchitectDraftSubmission;
  preparedInstruction?: string;
  canPrepare: boolean;
  researchClosed?: boolean;
  error?: string;
}
export interface WorkPlanningReviewInput {
  expectedRevision: number;
  disposition: "Approved" | "RevisionRequested" | "Rejected";
  notes: string;
}
