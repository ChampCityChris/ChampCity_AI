import type { WorkIntakeBranchBinding, WorkIntakeBranchResult } from "./workIntakeBranchContracts";
import type { SourceRevision } from "./documents/planningDocument";

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

export interface WorkIntakeProjection {
  project: WorkProjectIdentity | null;
  suggestedProjectName: string;
  branches: Array<{ name: string; commit: string }>;
  currentBranch: string | null;
  suggestedBase: { name: string; commit: string } | null;
  intakes: WorkIntakeRecord[];
  currentIntake: WorkIntakeRecord | null;
  blockedReason: string | null;
}

export type WorkIntakeSubmissionResult = WorkIntakeBranchResult<WorkIntakeRecord>;
