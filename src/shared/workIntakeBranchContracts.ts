export interface WorkIntakeBranchBinding {
  intakeId: string;
  repositoryId: string;
  baseBranch: string;
  baseCommit: string;
  workBranch: string;
  currentHead: string;
  remote?: { name: string; syncState: "not-synced" | "synced"; lastSyncedCommit?: string };
}
