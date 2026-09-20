import type { SourceControlReceipt } from "./sourceControlContracts";

export interface WorkItemCheckpointResult {
  status: "committed" | "blocked" | "failed" | "not-applicable";
  message: string;
  checkpointId?: string;
  receiptPath?: string;
  commit?: string;
  remote: "not-requested" | "synced" | "failed";
  receipts: SourceControlReceipt[];
}
export interface WorkItemCheckpointEvidence {
  intakeId: string; repositoryId: string; workBranch: string; beforeHead: string;
  workItemId: string; implementationId: string; contractPath: string; contractSha256: string;
  reportPath: string; reportSha256: string;
  files: Array<{ path: string; sha256: string }>;
}
