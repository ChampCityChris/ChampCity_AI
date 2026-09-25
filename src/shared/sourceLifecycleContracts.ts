import type { SourceControlResult } from "./sourceControlContracts";
import type { WorkflowType } from "./projectState/workflowTypeRegistry";

/** Provider-neutral source identities. Provider branch names are diagnostic data. */
export interface SourceRevision {
  repositoryId: string;
  revisionId: string;
}

/** Immutable source state captured when a substantive Workflow is established. */
export interface SourceBaseline {
  workflowId: string;
  repositoryId: string;
  integrationTargetSourceLineId: string;
  baseRevisionId: string;
}

export interface SourceLine {
  repositoryId: string;
  sourceLineId: string;
  headRevisionId: string;
  providerBranchName: string;
}

/** Semantic identity for a provider repository. Filesystem locations belong to checkouts. */
export interface Repository {
  repositoryId: string;
  provider: "git";
}

export type RepositoryCheckoutRole = "main" | "dev" | "workflow";

/** One concrete project-managed working copy of a semantic SourceLine. */
export interface RepositoryCheckout {
  repositoryCheckoutId: string;
  repositoryId: string;
  sourceLineId: string;
  role: RepositoryCheckoutRole;
  projectRelativePath: string;
  workflowId?: string;
}

export interface ManagedProjectSourcePaths {
  repositoryMetadataRelativePath: string;
  mainCheckoutRelativePath: string;
  devCheckoutRelativePath: string;
  workflowCheckoutRootRelativePath: string;
}

export const MANAGED_PROJECT_SOURCE_PATHS: Readonly<ManagedProjectSourcePaths> = Object.freeze({
  repositoryMetadataRelativePath: ".champcity/repository.git",
  mainCheckoutRelativePath: "Main",
  devCheckoutRelativePath: "Dev",
  workflowCheckoutRootRelativePath: ".champcity/checkouts",
});

export interface IntegrationTarget {
  repositoryId: string;
  sourceLineId: string;
  headRevisionId: string;
}

export type SourceRevisionSelector =
  | { kind: "source-line"; sourceLineId: string }
  | { kind: "revision"; revisionId: string };

export interface WorkflowSourceOwner { kind: "workflow"; workflowId: string }

export interface CreateWorkSourceInput {
  baseRevision: SourceRevision;
  owner: WorkflowSourceOwner;
}

export interface WorkSourceBinding {
  owner: WorkflowSourceOwner;
  sourceLine: SourceLine;
  baseRevision: SourceRevision;
  repositoryCheckoutId?: string;
}

export interface ProjectSourceBootstrap {
  repositoryId: string;
  initialRevision: SourceRevision;
  initialCommitDigest: string;
  stableLine: SourceLine;
  integrationTarget: IntegrationTarget;
}

/** Workflow state is persisted independently; this reports only source preparation. */
export type SourceReadiness =
  | { state: "unprepared" | "preparing"; repositoryId: string; workIntakeId: string }
  | { state: "ready"; repositoryId: string; workIntakeId: string; binding: WorkSourceBinding }
  | { state: "blocked"; repositoryId: string; workIntakeId: string; code: string; message: string; inspectionRequired: boolean };

export interface ImplementationCheckpointRequest {
  boundaryId: string;
  workflowId: string;
  targetEntityId: string;
  sourceLineId: string;
  expectedRevisionId: string;
  repositoryCheckoutId: string;
  attributablePaths: string[];
}

export interface DispositionCheckpointRequest {
  boundaryId: string;
  workflowId: string;
  targetEntityId: string;
  sourceLineId: string;
  expectedRevisionId: string;
  repositoryCheckoutId: string;
  dispositionId: string;
  attributablePaths: string[];
}

export type CheckpointState = "not-required" | "pending" | "committed" | "blocked" | "inspection-required";
export interface SourceCheckpoint {
  boundaryId: string;
  state: CheckpointState;
  kind?: "implementation" | "disposition";
  revision?: SourceRevision;
  emptyLifecycleCheckpoint?: boolean;
}

export interface CheckpointResult {
  state: "not-required" | "committed" | "blocked" | "inspection-required";
  checkpointId: string | null;
  revision: SourceRevision | null;
  message: string;
}

export interface IntegrationCandidateRequest {
  workflowId: string;
  repositoryCheckoutId: string;
  incomingRevision: SourceRevision;
  target: IntegrationTarget;
}

export interface SourceGraphOptions { maxRevisions?: number; maxLines?: number; includeCompleted?: boolean }
export interface SourceGraph {
  repositoryId: string;
  /** Opaque graph IDs are deterministic for an unchanged repository/ref identity. */
  integrationTargets: Array<{ id: string; lineId: string; headRevisionId: string }>;
  sourceLines: Array<{ id: string; headRevisionId: string; providerBranchName?: string; role: "main" | "dev" | "work"; workflowIds: string[] }>;
  revisions: Array<{ id: string; parents: string[]; timestamp: string; headOfLineIds: string[]; checkpointKinds: Array<"implementation" | "disposition">; integrationStates: string[] }>;
  workflowBindings: Array<{ workflowId: string; sourceAnchorWorkflowId: string; lineId: string | null; title: string; workflowType: WorkflowType;
    lifecycleState: string; workflowState: string; baseRevisionId: string; currentRevisionId: string | null;
    checkpointKinds: Array<"implementation" | "disposition">; integrationState: string | null }>;
  truncation: { maxRevisions: number; maxLines: number; revisionsTruncated: boolean; linesTruncated: boolean;
    omittedParentLinks: number; workflowBindingsTruncated: boolean };
  providerDiagnostics: { provider: "git"; currentBranch?: string; metadata: "available" | "missing" | "unavailable" };
}

export interface SourceGraphRevisionDetail {
  revisionId: string;
  parents: string[];
  timestamp: string;
  changedFiles: Array<{ path: string; status: string }>;
  totalChangedFiles: number;
  changedFilesTruncated: boolean;
}

/** Operations become available incrementally as their package cards implement them. */
export interface RepositoryLifecycleFoundation {
  bootstrapProjectSource(): Promise<SourceControlResult<ProjectSourceBootstrap>>;
  resolveSourceRevision(selector: SourceRevisionSelector): Promise<SourceControlResult<SourceRevision>>;
  createWorkSource(input: CreateWorkSourceInput): Promise<SourceControlResult<WorkSourceBinding>>;
  getSourceGraph(options?: SourceGraphOptions): Promise<SourceControlResult<SourceGraph>>;
}
