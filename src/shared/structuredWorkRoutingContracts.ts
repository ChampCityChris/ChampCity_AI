import type { ExistingProjectWorkRoute } from "./projectState/workflowTypeRegistry";
import type { ArchitectDraftSubmission } from "./architectOutputs/architectOutputContracts";

export interface StructuredWorkRoutingAssessment {
  assessmentId: string;
  recommendation: ExistingProjectWorkRoute;
  traits: string[];
  rationale: string;
  alternate?: ExistingProjectWorkRoute;
  evidenceNotes: string;
  sourceRecordVersion: number;
  stale: boolean;
}

export interface StructuredWorkRoutingModel {
  projectId: string;
  intakeId: string;
  routingWorkflowId: string;
  request: string;
  desiredOutcome: string;
  constraints: string[];
  evidenceContext: string[];
  intakeRecordVersion: number;
  intakeState: string;
  workflowState: string;
  assessment: StructuredWorkRoutingAssessment | null;
  reviewState: "none" | "revision-requested" | "decided";
  revisionInstructions?: string;
  preparedSubmission?: ArchitectDraftSubmission<"routing-assessment">;
  preparedInstruction?: string;
  selectedRoute: ExistingProjectWorkRoute | null;
  targetWorkflowId: string | null;
  closed: boolean;
  error?: string;
}

export interface StructuredWorkRoutingDecisionInput {
  assessmentId: string;
  disposition: "accept" | "override" | "request-revision";
  route?: ExistingProjectWorkRoute;
  rationale: string;
}
