/** Persistable repository identity: the filesystem root stays in the main process. */
export interface SourceControlPosition {
  branch: string | null;
  commit: string;
}

export type SourceControlOperation =
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
  | "status" | "branches" | "history" | "diff" | "changed-files" | "readiness" | "commit-message"
  | "prepare-branch" | "switch-branch" | "stage" | "commit" | "fetch" | "push"
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
