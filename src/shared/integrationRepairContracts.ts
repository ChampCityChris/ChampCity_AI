import type { IntegrationValidationEvidence } from "./integrationCandidateContracts";

export interface IntegrationRepairPolicy {
  sources: Array<{ role: "intake" | "plan" | "architecture" | "contract"; path: string }>;
  editablePaths: string[];
  policySha256?: string;
}
export interface IntegrationRepairSnapshot {
  head: string;
  mergeHead: string | null;
  indexDigest: string;
  changed: Record<string, string>;
  editable: Record<string, string>;
  unmerged: string[];
}
export interface IntegrationRepairAttempt {
  repairId: string;
  candidateId: string;
  attempt: number;
  status: "prepared" | "validation-failed" | "validated" | "operator-decision" | "failed";
  snapshot: IntegrationRepairSnapshot;
  sourceDigests: Record<string, string>;
  policy: IntegrationRepairPolicy;
  commit?: string;
  validation: IntegrationValidationEvidence[];
  message: string;
  prompt: string;
}
export interface IntegrationRepairPatch {
  path: string;
  beforeSha256: string;
  /** null explicitly deletes the bounded source file. */
  content: string | null;
}
