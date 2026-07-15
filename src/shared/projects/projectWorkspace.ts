import type { RoutedActionContract } from "../workflow";

export type ProjectObserverStatus =
  | "stopped"
  | "starting"
  | "watching"
  | "scanning"
  | "blocked"
  | "error";

export type ConfiguredBranchBehavior =
  | { mode: "observe-current" }
  | { mode: "require"; branch: string };

export interface RepositoryScanChangeSummary {
  addedArtifactIds: string[];
  changedArtifactIds: string[];
  removedArtifactIds: string[];
}
export interface RepositoryScanBlocker {
  code:
    | "unsupported_repository"
    | "incomplete_pair"
    | "invalid_pair"
    | "project_mismatch"
    | "duplicate_authority"
    | "relationship_conflict"
    | "branch_mismatch"
    | "scan_failed";
  message: string;
  artifactIds: string[];
  paths: string[];
}

export interface ProjectScanResult {
  scanId: string;
  scannedAt: string;
  branch: string | null;
  graphFingerprint: string;
  artifactCount: number;
  controllingArtifactCount: number;
  historicalArtifactCount: number;
  changes: RepositoryScanChangeSummary;
  blockers: RepositoryScanBlocker[];
  projectionRevision: number;
  currentAction: RoutedActionContract | null;
  noOp: boolean;
}

export interface ConfiguredProject {
  projectId: string;
  displayName: string;
  repositoryRoot: string;
  planningRoot: string;
  branchBehavior: ConfiguredBranchBehavior;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string | null;
  lastScanAt: string | null;
  lastScanResult: ProjectScanResult | null;
  observerStatus: ProjectObserverStatus;
}

export interface ProjectWorkspaceRegistryDocument {
  schemaVersion: "champcity.project-workspaces.v1";
  selectedProjectId: string | null;
  projects: ConfiguredProject[];
}

export interface ProjectWorkspaceSummary {
  projectId: string;
  displayName: string;
  repositoryRoot: string;
  planningRoot: string;
  branchBehavior: ConfiguredBranchBehavior;
  enabled: boolean;
  selected: boolean;
  observerStatus: ProjectObserverStatus;
  lastScanAt: string | null;
  lastScanResult: ProjectScanResult | null;
}

export interface ProjectWorkspaceListResult {
  ok: boolean;
  selectedProjectId: string | null;
  projects: ProjectWorkspaceSummary[];
  errorMessages?: string[];
}

export interface AddProjectWorkspaceRequest {
  repositoryRoot: string;
  displayName?: string;
  projectId?: string;
  planningRoot?: string;
  branchBehavior?: ConfiguredBranchBehavior;
}

export interface ProjectWorkspaceMutationResult extends ProjectWorkspaceListResult {
  project?: ProjectWorkspaceSummary;
}

export interface RefreshRepositoryStateResult {
  ok: boolean;
  selectedProjectId: string | null;
  scanResult?: ProjectScanResult;
  errorMessages?: string[];
}
