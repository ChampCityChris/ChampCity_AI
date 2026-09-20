import type { ArchitectDraftSubmission } from "./architectOutputs/architectOutputContracts";
import type { PlanPhaseCandidate, PlanWorkItemCandidate, WorkPlanStructure } from "./workPlanningContracts";

export interface WorkItemDecompositionProposal {
  kind: "siblings" | "direct-to-phased";
  rationale: string;
  evidence: string[];
  replacements: PlanWorkItemCandidate[];
  phases?: PlanPhaseCandidate[];
  phaseAssignments?: Record<string, string>;
  topologyRationale?: string;
}
export interface WorkItemDecompositionModel {
  kind: "decomposition-proposal";
  intakeId: string;
  workItemId: string;
  relativePath: string;
  revision: number;
  planRevision: number;
  state: "not-proposed" | "pending" | "revision-requested" | "accepted" | "stale";
  proposal: WorkItemDecompositionProposal | null;
  resultingStructure?: WorkPlanStructure;
  resumeWorkItemId?: string;
  notes: string;
  canPrepare: boolean;
  submission?: ArchitectDraftSubmission;
  preparedInstruction?: string;
  error?: string;
}
export interface WorkItemDecompositionReview {
  disposition: "accept" | "request-revision";
  expectedProposalRevision: number;
  expectedPlanRevision: number;
  notes: string;
}
