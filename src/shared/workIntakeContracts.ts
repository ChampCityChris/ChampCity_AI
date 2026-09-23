import type { WorkIntakeBranchBinding, WorkIntakeBranchResult } from "./workIntakeBranchContracts";
import type { SourceRevision } from "./documents/planningDocument";
import type { SourceReadiness } from "./sourceLifecycleContracts";

export interface WorkProjectIdentity {
  projectId: string;
  repositoryId: string;
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
  baseBranch: string;
  baseCommit: string;
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
}

export interface WorkIntakeProjection {
  authority?: "structured" | "legacy";
  project: WorkProjectIdentity | null;
  suggestedProjectName: string;
  branches: Array<{ name: string; commit: string }>;
  currentBranch: string | null;
  suggestedBase: { name: string; commit: string } | null;
  intakes: WorkIntakeRecord[];
  currentIntake: WorkIntakeRecord | null;
  blockedReason: string | null;
  capturedIntakes?: CapturedWorkIntake[];
  currentCapturedIntake?: CapturedWorkIntake | null;
}

export type WorkIntakeSubmissionResult = WorkIntakeBranchResult<WorkIntakeRecord> |
  { ok: true; value: CapturedWorkIntake; receipts: [] };
