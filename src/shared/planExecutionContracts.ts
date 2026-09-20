import type { PlanWorkItemCandidate, PlanTopology, WorkPlanStructure } from "./workPlanningContracts";

export type WorkItemExecutionStage = "ready" | "implement" | "review-validate" | "repair" | "close" | "complete";
export type WorkItemExecutionAction = "implement" | "review" | "validate" | "repair" | "close";
export interface ExecutionCriterionEvidence {
  criterion: string;
  status: "pending" | "passed" | "failed";
  evidencePaths: string[];
}
/** Adapters resolve original/repair review, validation and durable close evidence. */
export interface ExecutionBoundaryEvidence {
  planRevision: number;
  fresh: boolean;
  criteria: ExecutionCriterionEvidence[];
  blockers: string[];
  evidencePaths: string[];
}
export interface WorkItemExecutionEvidence extends ExecutionBoundaryEvidence {
  workItemId: string;
  stage: WorkItemExecutionStage;
}
export interface PhaseExecutionEvidence extends ExecutionBoundaryEvidence { phaseId: string }
/** A current approved Plan and adapter-derived evidence; route is deliberately absent. */
export interface PlanExecutionInput {
  planId: string;
  planRevision: number;
  approved: boolean;
  fresh: boolean;
  structure: WorkPlanStructure;
  blockers: string[];
  workItems: WorkItemExecutionEvidence[];
  phases: PhaseExecutionEvidence[];
  planEvidence?: ExecutionBoundaryEvidence;
}
export interface WorkItemExecutionProjection {
  candidate: PlanWorkItemCandidate;
  stage: WorkItemExecutionStage;
  status: "ready" | "active" | "blocked" | "complete";
  complete: boolean;
  eligible: boolean;
  reasons: string[];
  evidencePaths: string[];
  availableActions: WorkItemExecutionAction[];
}
export interface PhaseExecutionProjection {
  phaseId: string;
  eligible: boolean;
  workItemsComplete: boolean;
  criteriaSatisfied: boolean;
  complete: boolean;
  reasons: string[];
}
export interface PlanExecutionProjection {
  planId: string;
  planRevision: number;
  topology: PlanTopology;
  fingerprint: string;
  status: "ready" | "active" | "blocked" | "awaiting-criteria" | "complete";
  complete: boolean;
  workItemsComplete: boolean;
  phasesComplete: boolean;
  criteriaSatisfied: boolean;
  blockers: string[];
  workItems: WorkItemExecutionProjection[];
  phases: PhaseExecutionProjection[];
  nextWorkItemId?: string;
}
export interface PlanExecutionActionContext {
  input: PlanExecutionInput;
  projection: PlanExecutionProjection;
  workItem: WorkItemExecutionProjection;
}
export interface PlanExecutionHooks {
  load: () => Promise<PlanExecutionInput>;
  actions?: Partial<Record<WorkItemExecutionAction, (context: PlanExecutionActionContext) => Promise<void>>>;
}
