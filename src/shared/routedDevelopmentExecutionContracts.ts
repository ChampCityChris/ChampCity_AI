import type { WorkIntakeBranchBinding } from "./workIntakeBranchContracts";
import type { WorkPlanningIdentity, WorkPlanStructure } from "./workPlanningContracts";
import type { ExecutionCriterionEvidence, PlanExecutionProjection } from "./planExecutionContracts";
import type { DocumentDispositionStatus } from "./documents/documentDisposition";

/** V1 persistence binding, not another execution engine or product entity. */
export interface RoutedDevelopmentExecutionBinding {
  identity: WorkPlanningIdentity & { planId: string };
  relativePath: string;
  artifactRevision: number;
  planPath: string;
  planRevision: number;
  planDigest: string;
  branchBinding: WorkIntakeBranchBinding;
  structure: WorkPlanStructure;
  planBody: string;
}

export type RoutedAcceptanceBoundary = { kind: "plan" } | { kind: "phase"; phaseId: string };
export interface RoutedAcceptanceRequest {
  boundary: RoutedAcceptanceBoundary;
  expectedFingerprint: string;
}
export interface RoutedAcceptanceInput extends RoutedAcceptanceRequest {
  closureDecision: "Close" | "DoNotClose";
  rationale: string;
  criteria: ExecutionCriterionEvidence[];
}
export interface RoutedAcceptanceProjection {
  boundary: RoutedAcceptanceBoundary;
  relativePath: string;
  acceptanceCriteria: string[];
  eligible: boolean;
  fresh: boolean;
  reasons: string[];
  artifactRevision?: number;
  disposition?: DocumentDispositionStatus;
  criteria: ExecutionCriterionEvidence[];
}
export interface RoutedDevelopmentExecutionProjection extends PlanExecutionProjection {
  acceptance: RoutedAcceptanceProjection[];
}
