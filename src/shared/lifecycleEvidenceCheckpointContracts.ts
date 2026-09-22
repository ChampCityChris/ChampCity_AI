import type { SourceControlReceipt } from "./sourceControlContracts";

export type LifecycleEvidenceBoundary =
  | { kind: "work-item"; routeDecisionId: string; planId: string; planRevision: number; workItemId: string; implementationId: string; phaseId?: string }
  | { kind: "phase"; routeDecisionId: string; planId: string; planRevision: number; phaseId: string }
  | { kind: "plan"; routeDecisionId: string; planId: string; planRevision: number }
  | { kind: "research"; routeDecisionId: string; assessmentId: string; assessmentRevision: number };

export interface LifecycleEvidenceCheckpointArtifact {
  path: string;
  sha256: string;
  artifactType: string;
  artifactRevision: number;
}

export interface LifecycleEvidenceCheckpointEvidence {
  intakeId: string;
  repositoryId: string;
  workBranch: string;
  beforeHead: string;
  boundary: LifecycleEvidenceBoundary;
  files: LifecycleEvidenceCheckpointArtifact[];
}

export interface LifecycleEvidenceCheckpointResult {
  status: "committed" | "blocked" | "failed" | "not-applicable";
  message: string;
  checkpointId?: string;
  commit?: string;
  remote: "not-requested" | "synced" | "failed";
  receipts: SourceControlReceipt[];
}
