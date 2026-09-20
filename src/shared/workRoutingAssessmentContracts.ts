import type { ArchitectDraftSubmission } from "./architectOutputs/architectOutputContracts";
import type { ArchitectRouteAssessment } from "./workIntakeRoutingContracts";

export interface WorkRoutingAssessmentRecord extends ArchitectRouteAssessment {
  readonly relativePath: string;
  readonly artifactRevision: number;
  readonly evidencePaths: readonly string[];
}

export interface WorkRoutingAssessmentModel {
  intakeId: string;
  state: "not-prepared" | "waiting-for-drafts" | "partial-draft-set" | "ready-for-promotion" | "promotion-failed" | "promoted" | "superseded" | "stale";
  assessment: WorkRoutingAssessmentRecord | null;
  submission?: ArchitectDraftSubmission;
  preparedInstruction?: string;
  error?: string;
}
