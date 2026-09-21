import type { SourceControlReceipt } from "./sourceControlContracts";

export interface IntegrationProfileTelemetry {
  buildDurationMs: number;
  selectedLanes: string[];
  selectedCapabilities: string[];
  concurrency: number;
  resourcePoolCount: number;
  perLane: Array<{ lane: string; fileCount: number; fileDurationMs: number }>;
  counts: { tests: number; pass: number; fail: number; skipped: number; cancelled: number; unavailableFiles: number; blockedFiles: number; unknownCountFiles: number };
  slowestFiles: Array<{ testPath: string; durationMs: number; status: string }>;
  budget: { targetMs: number | null; reviewThresholdMs: number | null; status: "not-budgeted" | "within-target" | "target-missed" | "review-required" };
}

export interface IntegrationValidationEvidence {
  checkId: string;
  exitCode: number | null;
  summary: string;
  profileEvidence?: { profileId: string; authoritySha256: string; targetCommit: string; incomingCommit: string; candidateCommit: string; runId: string; status: "passed" | "failed" | "incomplete"; selectedTests: string[]; excludedLanes: string[]; durationMs: number; telemetry?: IntegrationProfileTelemetry };
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
  /** SHA-256 of the exact immutable target-policy bytes used by production validation; absent for direct application hooks. */
  validationPolicySha256?: string;
  remoteSync: "not-requested" | "synced" | "failed";
  message: string;
  receipts: SourceControlReceipt[];
}
