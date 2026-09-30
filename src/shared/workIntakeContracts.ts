import type { WorkIntakeBranchBinding } from "./workIntakeBranchContracts";
import type { SourceRevision } from "./documents/planningDocument";
import type { SourceReadiness } from "./sourceLifecycleContracts";
import type { SourceCheckpoint } from "./sourceLifecycleContracts";

export interface WorkProjectIdentity {
  projectId: string;
  repositoryId: string | null;
  name: string;
}

export interface WorkIntakeSubmission {
  /** Null creates the selected Project's identity; historical Project Intake stays untouched. */
  projectId: string | null;
  projectName: string;
  workRequest: string;
  desiredOutcome: string;
  knownConstraints: string;
  hasExistingSourceOrPlanning: boolean;
  repositoryReviewContext: string;
}

export interface WorkIntakeRecord {
  intakeId: string;
  projectId: string;
  projectName: string;
  workRequest: string;
  desiredOutcome: string;
  knownConstraints: string;
  hasExistingSourceOrPlanning: boolean;
  repositoryReviewContext: string;
  branchBinding: WorkIntakeBranchBinding;
  relativePath: string;
  artifactRevision: number;
  sourceRevisions: SourceRevision[];
}

export interface CapturedWorkIntake {
  intakeId: string;
  projectId: string;
  workRequest: string;
  desiredOutcome: string;
  knownConstraints: string;
  repositoryReviewContext: string;
  source: SourceReadiness;
  sourceCheckpoints?: SourceCheckpoint[];
}

export interface WorkIntakeProjection {
  authority: "structured";
  project: WorkProjectIdentity;
  suggestedProjectName: string;
  blockedReason: string | null;
  capturedIntakes: CapturedWorkIntake[];
  currentCapturedIntake: CapturedWorkIntake | null;
}

export type WorkIntakeSubmissionResult = { ok: true; value: CapturedWorkIntake; receipts: [] };
