/** Persistable repository identity: the filesystem root stays in the main process. */
export interface SourceControlPosition {
  branch: string | null;
  commit: string;
}

export type SourceControlOperation =
  | "resolve-source-revision" | "create-work-source" | "bootstrap-project-source"
  | "source-graph"
  | "source-graph-revision-detail"
  | "inspect-reflog" | "replace-branch-ref" | "push-with-lease" | "delete-untracked-paths" | "discard-managed-worktree" | "isolated-skip"
  | "isolated-begin" | "isolated-inspect" | "isolated-continue" | "isolated-abort" | "isolated-advance"
  | "amend-commit" | "revert-commit" | "cherry-pick-commit"
  | "inspect-commit" | "compare-refs" | "list-tags" | "inspect-remotes" | "unstage" | "restore-files"
  | "create-branch-from-ref"
  | "advance-branch-ref"
  | "rename-branch"
  | "set-branch-upstream"
  | "unset-branch-upstream"
  | "delete-remote-branch"
  | "status" | "branches" | "history" | "history-with-messages" | "diff" | "changed-files" | "inspect-path-at-head" | "readiness" | "commit-message"
  | "prepare-branch" | "switch-branch" | "stage" | "commit" | "checkpoint-commit" | "fetch" | "push"
  | "fast-forward" | "delete-branch" | "integration-target" | "integration-create"
  | "integration-inspect" | "integration-merge" | "integration-advance" | "integration-abort"
  | "integration-repair-snapshot" | "integration-repair-diffs" | "integration-repair-commit";

export interface SourceControlReceipt {
  repositoryId: string;
  operation: SourceControlOperation;
  startedAt: string;
  completedAt: string;
  before: SourceControlPosition | null;
  after: SourceControlPosition | null;
}

export type SourceControlResult<T> =
  | { ok: true; receipt: SourceControlReceipt; result: T }
  | {
      ok: false;
      receipt: SourceControlReceipt;
      error: {
        code: string;
        message: string;
        phase: "precondition" | "operation" | "receipt";
        /** Failure does not imply rollback; inspect before retrying a mutation. */
        mutationMayHaveOccurred: boolean;
        recovery?: { rolledBack: boolean; residualOperationState: boolean; conflictingPaths: string[] };
      };
      /** Present when the operation succeeded but subsequent receipt inspection failed. */
      completedResult?: T;
    };

export interface SourceControlChangedFile {
  path: string;
  originalPath?: string;
  indexStatus: string;
  worktreeStatus: string;
}

export type ExistingProjectGitAdoptionState =
  | "source-neutral"
  | "managed-ready"
  | "conventional-auto"
  | "migration-consent-required"
  | "resumable-partial"
  | "manual-intervention-required";

export type ExistingProjectActiveBranchAction =
  | "none"
  | "already-contained"
  | "fast-forward-dev"
  | "merge-into-dev"
  | "manual";

/** Renderer-safe inspection result. Paths and working-file names remain main-process-only. */
export interface ExistingProjectGitAdoptionPlan {
  planId: string;
  state: ExistingProjectGitAdoptionState;
  repositoryId: string | null;
  currentBranch: string | null;
  currentRevision: string | null;
  mainRevision: string | null;
  devRevision: string | null;
  baselineSourceRef: string | null;
  mainAction: "none" | "create-from-source";
  devAction: "none" | "create-from-main" | "fast-forward" | "merge";
  activeBranchAction: ExistingProjectActiveBranchAction;
  workingState: {
    stagedCount: number;
    unstagedCount: number;
    untrackedCount: number;
    ignoredCount: number;
    captureSnapshotRequired: boolean;
  };
  topology: {
    conventionalGit: boolean;
    managedMetadata: boolean;
    mainCheckout: boolean;
    devCheckout: boolean;
    recoveryStaging: boolean;
  };
  preservedRefCount: number;
  preservedRemoteCount: number;
  requiresConsent: boolean;
  warnings: string[];
  manualReason: string | null;
}

export type ExistingProjectGitAdoptionJournalStage =
  | "planned"
  | "metadata-created"
  | "refs-normalized"
  | "snapshot-created"
  | "checkouts-created"
  | "source-moved"
  | "root-metadata-staged"
  | "verified"
  | "completed"
  | "rolled-back";

export interface ExistingProjectGitAdoptionJournal {
  schemaVersion: 1;
  migrationId: string;
  repositoryId: string;
  planId: string;
  stage: ExistingProjectGitAdoptionJournalStage;
  originalCurrentBranch: string | null;
  originalCurrentRevision: string | null;
  originalRefsDigest: string;
  originalRemotesDigest: string;
  workingStateDigest: string;
  mainRevision: string | null;
  devRevision: string | null;
  baselineSourceRef: string | null;
  activeBranchAction: ExistingProjectActiveBranchAction;
  captureSnapshotRequired: boolean;
  resources: string[];
  failureReason: string | null;
  finalRefsDigest: string | null;
  finalRemotesDigest: string | null;
  completedAt: string | null;
}
