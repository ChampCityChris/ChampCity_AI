/** Persistable repository identity: the filesystem root stays in the main process. */
export interface SourceControlPosition {
  branch: string | null;
  commit: string;
}

export type SourceControlOperation =
  | "status" | "branches" | "history" | "diff" | "changed-files" | "readiness" | "commit-message"
  | "prepare-branch" | "switch-branch" | "stage" | "commit" | "fetch" | "push"
  | "fast-forward" | "delete-branch";

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
