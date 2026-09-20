import type { SourceControlReceipt } from "./sourceControlContracts";

export interface WorkIntakeBranchBinding {
  intakeId: string;
  repositoryId: string;
  baseBranch: string;
  baseCommit: string;
  workBranch: string;
  currentHead: string;
  remote?: { name: string; syncState: "not-synced" | "synced"; lastSyncedCommit?: string };
}

export interface EstablishWorkIntakeBranchInput {
  intakeId: string;
  baseBranch: string;
  /** Exact commit observed when selecting the integration baseline. */
  baseCommit: string;
  remote?: string;
}

export type WorkIntakeBranchResult<T> =
  | { ok: true; binding: WorkIntakeBranchBinding; value: T; receipts: SourceControlReceipt[] }
  | {
      ok: false;
      error: { code: string; message: string };
      recovery: "unchanged" | "restored" | "inspection-required";
      binding?: WorkIntakeBranchBinding;
      receipts: SourceControlReceipt[];
    };
