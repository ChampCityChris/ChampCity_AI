import type { SourceControlReceipt } from "./sourceControlContracts";

export interface IntegrationValidationEvidence {
  checkId: string;
  exitCode: number | null;
  summary: string;
}
export interface IntegrationCandidateRecord {
  candidateId: string;
  repositoryId: string;
  intakeId: string;
  planId: string;
  planRevision: number;
  planFingerprint: string;
  baseCommit: string;
  incomingBranch: string;
  incomingCommit: string;
  targetBranch: string;
  localTargetCommit: string;
  targetCommit: string;
  mergeBase: string;
  candidateBranch: string;
  candidateCommit?: string;
  remote?: string;
  status: "constructing" | "conflicted" | "validation-failed" | "validated" | "integrated" | "failed" | "aborted" | "operator-decision";
  repairAttemptCount?: number;
  activeRepairId?: string;
  conflictingPaths: string[];
  validation: IntegrationValidationEvidence[];
  requiredChecks: string[];
  remoteSync: "not-requested" | "synced" | "failed";
  message: string;
  receipts: SourceControlReceipt[];
}
