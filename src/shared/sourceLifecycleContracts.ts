import type { SourceControlResult } from "./sourceControlContracts";

/** Provider-neutral source identities. Provider branch names are diagnostic data. */
export interface SourceRevision {
  repositoryId: string;
  revisionId: string;
}

export interface SourceLine {
  repositoryId: string;
  sourceLineId: string;
  headRevisionId: string;
  providerBranchName: string;
}

export interface IntegrationTarget {
  repositoryId: string;
  sourceLineId: string;
  headRevisionId: string;
}

export type SourceRevisionSelector =
  | { kind: "source-line"; sourceLineId: string }
  | { kind: "revision"; revisionId: string };

export interface WorkSourceOwner { kind: "work-intake"; workIntakeId: string }

export interface CreateWorkSourceInput {
  baseRevision: SourceRevision;
  owner: WorkSourceOwner;
}

export interface WorkSourceBinding {
  owner: WorkSourceOwner;
  sourceLine: SourceLine;
  baseRevision: SourceRevision;
  repositoryCheckoutId?: string;
}

/** Workflow state is persisted independently; this reports only source preparation. */
export type SourceReadiness =
  | { state: "unprepared" | "preparing"; repositoryId: string; workIntakeId: string }
  | { state: "ready"; repositoryId: string; workIntakeId: string; binding: WorkSourceBinding }
  | { state: "blocked"; repositoryId: string; workIntakeId: string; code: string; message: string; inspectionRequired: boolean };

export interface ImplementationCheckpointRequest {
  boundaryId: string;
  workIntakeId: string;
  sourceLineId: string;
  expectedRevisionId: string;
  repositoryCheckoutId?: string;
  attributablePaths: string[];
}

export interface DispositionCheckpointRequest {
  boundaryId: string;
  workIntakeId: string;
  sourceLineId: string;
  expectedRevisionId: string;
  repositoryCheckoutId?: string;
  dispositionId: string;
  attributablePaths: string[];
}

export type CheckpointState = "not-required" | "pending" | "committed" | "blocked" | "inspection-required";
export interface SourceCheckpoint {
  boundaryId: string;
  state: CheckpointState;
  revision?: SourceRevision;
  emptyLifecycleCheckpoint?: boolean;
}

export interface IntegrationCandidateRequest {
  workIntakeId: string;
  incomingRevision: SourceRevision;
  target: IntegrationTarget;
}

export interface SourceGraphOptions { maxRevisions?: number; includeCompleted?: boolean }
export interface SourceGraph {
  repositoryId: string;
  integrationTargets: IntegrationTarget[];
  sourceLines: SourceLine[];
  revisions: Array<{ revisionId: string; parents: string[]; sourceLineIds: string[]; timestamp: string }>;
  workBindings: Array<{ workIntakeId: string; sourceLineId: string; title: string; route: string; lifecycleState: string; integrationState: string }>;
}

/** Operations become available incrementally as their package cards implement them. */
export interface RepositoryLifecycleFoundation {
  resolveSourceRevision(selector: SourceRevisionSelector): Promise<SourceControlResult<SourceRevision>>;
  createWorkSource(input: CreateWorkSourceInput): Promise<SourceControlResult<WorkSourceBinding>>;
}
