export const WORKFLOW_CANDIDATE_STAGES = [
  "architect-interview", "project-planning", "phase-map", "phase-interview", "phase-planning", "work-item-planning",
] as const;
export type WorkflowCandidateStage = typeof WORKFLOW_CANDIDATE_STAGES[number];
export const WORKFLOW_CANDIDATE_MAX_BYTES = 200_000;
export interface WorkflowCandidateSubmission {
  workflowId: string;
  stage: WorkflowCandidateStage;
  scopeEntityId?: string;
  candidateJson: string;
}
export interface WorkflowCandidateReceipt {
  workflowId: string; stage: WorkflowCandidateStage; scopeEntityId?: string;
  reviewId: string; recordVersion: number; disposition: string;
}
