import type {
  ConfiguredProject,
  ProjectScanResult,
  RefreshRepositoryStateResult,
} from "../../shared/projects";
import type { ArtifactRegistry } from "../../shared/artifacts";
import type { WorkflowStateIndex } from "../../shared/workflow";
import type { ProjectWorkspaceRegistry } from "../projects";
import {
  RelationshipDrivenWorkflowResolver,
  type RelationshipWorkflowProjection,
} from "../workflow/relationshipDrivenWorkflowResolver";
import {
  compareArtifactGraphs,
  scanVerifiedArtifactGraph,
  type VerifiedArtifactGraph,
} from "./verifiedArtifactGraph";

export interface RepositoryProjectionSnapshot {
  project: ConfiguredProject;
  graph: VerifiedArtifactGraph;
  projection: RelationshipWorkflowProjection;
  registry: ArtifactRegistry;
  scanResult: ProjectScanResult;
}
export type RepositoryProjectionListener = (
  snapshot: RepositoryProjectionSnapshot,
) => void | Promise<void>;

export class RepositoryRefreshService {
  private graph: VerifiedArtifactGraph | null = null;
  private snapshot: RepositoryProjectionSnapshot | null = null;
  private projectionRevision = 0;
  private refreshTail: Promise<RepositoryProjectionSnapshot> | null = null;
  private readonly listeners = new Set<RepositoryProjectionListener>();
  private project: ConfiguredProject;
  private readonly projectId: string;

  constructor(
    project: ConfiguredProject,
    private readonly workspaces: ProjectWorkspaceRegistry,
    private readonly resolver = new RelationshipDrivenWorkflowResolver(),
    private readonly clock: () => string = () => new Date().toISOString(),
  ) {
    this.project = structuredClone(project);
    this.projectId = project.projectId;
  }

  subscribe(listener: RepositoryProjectionListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async refresh(reason: string = "manual"): Promise<RepositoryProjectionSnapshot> {
    if (this.refreshTail) return this.refreshTail;
    this.refreshTail = this.performRefresh(reason);
    try {
      return await this.refreshTail;
    } finally {
      this.refreshTail = null;
    }
  }

  async getAuthoritySnapshot(): Promise<{ state: WorkflowStateIndex; routedAction: WorkflowStateIndex["currentAction"] }> {
    const snapshot = this.snapshot ?? (await this.refresh("authority-read"));
    return {
      state: snapshot.projection.state,
      routedAction: snapshot.projection.state.currentAction,
    };
  }

  async getProjectionSnapshot(): Promise<RepositoryProjectionSnapshot> {
    return this.snapshot ?? this.refresh("snapshot-read");
  }

  async manualRefreshResult(): Promise<RefreshRepositoryStateResult> {
    try {
      const snapshot = await this.refresh("manual");
      return {
        ok: snapshot.scanResult.blockers.length === 0,
        selectedProjectId: snapshot.project.projectId,
        scanResult: snapshot.scanResult,
        ...(snapshot.scanResult.blockers.length > 0
          ? { errorMessages: snapshot.scanResult.blockers.map((blocker) => blocker.message) }
          : {}),
      };
    } catch (error) {
      return {
        ok: false,
        selectedProjectId: this.projectId,
        errorMessages: [plainError(error)],
      };
    }
  }

  private async performRefresh(reason: string): Promise<RepositoryProjectionSnapshot> {
    const project = await this.resolveProjectForRefresh();
    await this.workspaces.updateObserverStatus(project.projectId, "scanning");
    try {
      const nextGraph = await scanVerifiedArtifactGraph(project, this.clock);
      const noOp = this.graph?.fingerprint === nextGraph.fingerprint;
      if (!noOp) this.projectionRevision += 1;
      if (this.projectionRevision === 0) this.projectionRevision = 1;
      const projection = this.resolver.resolve(
        project,
        nextGraph,
        this.projectionRevision,
      );
      const changes = compareArtifactGraphs(this.graph, nextGraph);
      const scanResult: ProjectScanResult = {
        scanId: nextGraph.scanId,
        scannedAt: nextGraph.scannedAt,
        branch: nextGraph.branch,
        graphFingerprint: nextGraph.fingerprint,
        artifactCount: nextGraph.nodes.length,
        controllingArtifactCount: nextGraph.nodes.filter(
          (node) => node.classification === "controlling",
        ).length,
        historicalArtifactCount: nextGraph.nodes.filter(
          (node) => node.classification === "historical",
        ).length,
        changes,
        blockers: [...nextGraph.blockers],
        projectionRevision: this.projectionRevision,
        currentAction: projection.state.currentAction,
        noOp,
      };
      const snapshot: RepositoryProjectionSnapshot = {
        project: structuredClone(project),
        graph: nextGraph,
        projection,
        registry: nextGraph.derivedRegistry(),
        scanResult,
      };
      this.project = structuredClone(project);
      this.graph = nextGraph;
      this.snapshot = snapshot;
      await this.workspaces.updateScanResult(project.projectId, scanResult);
      for (const listener of this.listeners) await listener(snapshot);
      return snapshot;
    } catch (error) {
      await this.workspaces.updateObserverStatus(project.projectId, "error");
      throw error;
    }
  }

  private async resolveProjectForRefresh(): Promise<ConfiguredProject> {
    const project = await this.workspaces.getProject(this.projectId);
    if (!project) {
      throw new Error(
        `Configured project ${this.projectId} is not available. Select an enabled project workspace before refreshing repository state.`,
      );
    }
    return project;
  }
}
function plainError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
