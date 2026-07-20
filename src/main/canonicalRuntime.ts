import path from "node:path";

import type {
  AddProjectWorkspaceRequest,
  GovernanceApprovalDecisionIntent,
  GovernanceApprovalDecisionResult,
  GovernanceApprovalQueueResult,
  GovernanceMaintenanceSnapshotResult,
  GovernanceRepairOperationResult,
  GovernanceRepairPreviewResult,
  GovernanceRepairIntent,
  GovernanceRepairSpecificationCreateInput,
  GovernanceRepairSpecificationRequestCreateResult,
  GovernanceRepairSpecificationRequestPreview,
  GovernanceRepairSpecificationPreviewInput,
  ProjectWorkspaceListResult,
  ProjectWorkspaceMutationResult,
  RefreshRepositoryStateResult,
} from "../shared/projects";
import type {
  EligibleExecutionRunWorkCardsResult,
  ExecutionRunOperationResult,
  ExecutionRunStartRequest,
} from "../shared/executionRuns";
import {
  CurrentContextPacketCompiler,
} from "./contextPackets/currentContextPacketCompiler";
import {
  ArtifactPairContextPacketWriter,
  ContextPacketService,
} from "./contextPackets/contextPacketService";
import {
  ExecutionRunAuthorityService,
  ExecutionRunPersistenceService,
} from "./executionRuns";
import { ProjectWorkspaceRegistry } from "./projects";
import {
  RepositoryObserver,
  RepositoryRefreshService,
  type RepositoryProjectionSnapshot,
  type RepositoryProjectionListener,
} from "./repository";
import { GovernanceApprovalService, GovernanceRepairService } from "./artifacts";
import { CanonicalWorkflowAuthority } from "./workCards/canonicalWorkflowAuthority";
import { RoutedProcessInvocationService } from "./workflow";

interface ActiveProjectRuntime {
  projectId: string;
  refresh: RepositoryRefreshService;
  observer: RepositoryObserver;
  authority: CanonicalWorkflowAuthority;
  routedInvocation: RoutedProcessInvocationService;
  contextCompiler: CurrentContextPacketCompiler;
  contextService: ContextPacketService;
  executionRuns: ExecutionRunAuthorityService;
}

let workspaces: ProjectWorkspaceRegistry | null = null;
let active: ActiveProjectRuntime | null = null;
const projectionListeners = new Set<RepositoryProjectionListener>();
const projectRootListeners = new Set<
  (projectRoot: string, projectId: string) => void
>();

export const canonicalWorkflowAuthority = forwardingProxy<CanonicalWorkflowAuthority>(
  () => requireActive().authority,
);
export const routedProcessInvocationService = forwardingProxy<RoutedProcessInvocationService>(
  () => requireActive().routedInvocation,
);
export const currentContextPacketCompiler = forwardingProxy<CurrentContextPacketCompiler>(
  () => requireActive().contextCompiler,
);
export const contextPacketService = forwardingProxy<ContextPacketService>(
  () => requireActive().contextService,
);
export const executionRunService = forwardingProxy<ExecutionRunAuthorityService>(
  () => requireActive().executionRuns,
);

export async function initializeCanonicalRuntime(input: {
  defaultRepositoryRoot: string;
  workspaceStoragePath: string;
  allowRepositoryTmpProjects?: boolean;
}): Promise<void> {
  workspaces = new ProjectWorkspaceRegistry({
    storagePath: input.workspaceStoragePath,
    allowRepositoryTmpProjects: input.allowRepositoryTmpProjects,
  });
  const document = await workspaces.initialize(input.defaultRepositoryRoot);
  const selectedProjectId = document.selectedProjectId;
  if (!selectedProjectId) return;
  try {
    await activateProject(selectedProjectId);
  } catch {
    active = null;
  }
}

export async function listProjectWorkspaces(): Promise<ProjectWorkspaceListResult> {
  try {
    const registry = requireWorkspaces();
    const document = await registry.load();
    const projects = await registry.list();
    const selectedProjectId =
      projects.find((project) => project.selected)?.projectId ?? null;
    const selectedMissing =
      document.selectedProjectId !== null && selectedProjectId === null;
    return {
      ok: !selectedMissing,
      selectedProjectId,
      projects,
      ...(selectedMissing
        ? {
            errorMessages: [
              "Active project is not available. Choose the project folder again before refreshing project state.",
            ],
          }
        : {}),
    };
  } catch (error) {
    return { ok: false, selectedProjectId: null, projects: [], errorMessages: [plainError(error)] };
  }
}

export async function addProjectWorkspace(
  request: AddProjectWorkspaceRequest,
): Promise<ProjectWorkspaceMutationResult> {
  try {
    const registry = requireWorkspaces();
    const project = await registry.addProject(request);
    await activateProject(project.projectId);
    const listed = await listProjectWorkspaces();
    return {
      ...listed,
      project: listed.projects.find((candidate) => candidate.projectId === project.projectId),
    };
  } catch (error) {
    const listed = await listProjectWorkspaces();
    return { ...listed, ok: false, errorMessages: [plainError(error)] };
  }
}

export async function selectProjectWorkspace(
  projectId: string,
): Promise<ProjectWorkspaceMutationResult> {
  try {
    await requireWorkspaces().selectProject(projectId);
    await activateProject(projectId);
    const listed = await listProjectWorkspaces();
    return {
      ...listed,
      project: listed.projects.find((candidate) => candidate.projectId === projectId),
    };
  } catch (error) {
    const listed = await listProjectWorkspaces();
    return { ...listed, ok: false, errorMessages: [plainError(error)] };
  }
}

export async function refreshSelectedRepository(): Promise<RefreshRepositoryStateResult> {
  try {
    await ensureActiveSelectedProject();
    return requireActive().refresh.manualRefreshResult();
  } catch (error) {
    return {
      ok: false,
      selectedProjectId: null,
      errorMessages: [plainError(error)],
    };
  }
}

export async function refreshSelectedRepositoryOnFocus(): Promise<void> {
  try {
    await ensureActiveSelectedProject();
    await requireActive().refresh.refresh("application-focus");
  } catch {
    // Focus refresh is opportunistic; explicit refresh/list IPC exposes recovery state.
  }
}

export async function previewGovernanceRepair(): Promise<GovernanceRepairPreviewResult> {
  try {
    await ensureActiveSelectedProject();
    const current = requireActive();
    const snapshot = await current.refresh.getProjectionSnapshot();
    const repair = new GovernanceRepairService(snapshot.project, current.authority.artifactPairs);
    const preview = await repair.preview();
    return { ...preview, currentAction: snapshot.projection.state.currentAction };
  } catch (error) {
    return {
      ok: false,
      blockedMessage: "Governance records require canonical repair.",
      candidates: [],
      repairableCount: 0,
      payloadContentSummary:
        "Payload impact could not be determined because governance analysis failed.",
      errorMessages: [plainError(error)],
    };
  }
}

export async function previewGovernanceRepairSpecificationRequest(
  input: GovernanceRepairSpecificationPreviewInput,
): Promise<GovernanceRepairSpecificationRequestPreview> {
  try {
    await ensureActiveSelectedProject();
    const current = requireActive();
    const snapshot = await current.refresh.getProjectionSnapshot();
    const repair = new GovernanceRepairService(snapshot.project, current.authority.artifactPairs);
    return repair.previewSpecificationRequest(input, {
      projectionRevision: snapshot.scanResult.projectionRevision,
      maintenancePhaseId: snapshot.projection.domain.lifecycleActivePhaseId,
      currentAction: snapshot.projection.state.currentAction,
      registryRevision: registryRevisionFromSnapshot(snapshot),
    });
  } catch (error) {
    return {
      ok: false,
      wouldMutate: false,
      errorMessages: [plainError(error)],
    };
  }
}

export async function createGovernanceRepairSpecificationRequest(
  input: GovernanceRepairSpecificationCreateInput,
): Promise<GovernanceRepairSpecificationRequestCreateResult> {
  try {
    await ensureActiveSelectedProject();
    const current = requireActive();
    const snapshot = await current.refresh.getProjectionSnapshot();
    const repair = new GovernanceRepairService(snapshot.project, current.authority.artifactPairs);
    const result = await repair.createSpecificationRequest(input, {
      projectionRevision: snapshot.scanResult.projectionRevision,
      maintenancePhaseId: snapshot.projection.domain.lifecycleActivePhaseId,
      currentAction: snapshot.projection.state.currentAction,
      registryRevision: registryRevisionFromSnapshot(snapshot),
    });
    if (!result.ok) return result;
    const refreshed = await current.refresh.refreshAfterMutation("governance-repair-specification-request");
    const currentRequiredAction = await projectCurrentRequiredActionFromProjectionSnapshot(
      current,
      refreshed,
    );
    const maintenanceActionLabel = selectedMaintenanceActionLabel(refreshed);
    if (currentRequiredAction?.currentAction && maintenanceActionLabel) {
      currentRequiredAction.currentAction.maintenanceActionLabel = maintenanceActionLabel;
    }
    return {
      ...result,
      currentAction: refreshed.projection.state.currentAction,
      maintenanceActionLabel,
      currentRequiredAction,
      maintenance: refreshed.maintenance,
      scanResult: refreshed.scanResult,
      projectionRevision: refreshed.scanResult.projectionRevision,
    };
  } catch (error) {
    return {
      ok: false,
      created: false,
      idempotent: false,
      updated: false,
      wouldMutate: false,
      errorMessages: [plainError(error)],
    };
  }
}

export async function getCurrentGovernanceMaintenance(): Promise<GovernanceMaintenanceSnapshotResult> {
  try {
    await ensureActiveSelectedProject();
    const current = requireActive();
    const snapshot = await current.refresh.getProjectionSnapshot();
    return governanceMaintenanceSnapshotResult(current, snapshot);
  } catch (error) {
    return {
      ok: false,
      selectedProjectId: null,
      currentAction: null,
      maintenance: emptyGovernanceMaintenanceSummary(),
      errorMessages: [plainError(error)],
    };
  }
}

export async function repairGovernanceRecord(
  intent: GovernanceRepairIntent,
): Promise<GovernanceRepairOperationResult> {
  try {
    await ensureActiveSelectedProject();
    const current = requireActive();
    const snapshot = await current.refresh.getProjectionSnapshot();
    const repair = new GovernanceRepairService(snapshot.project, current.authority.artifactPairs);
    const result = await repair.repairOne(intent);
    if (result.repairedArtifactIds.length === 0) {
      throw new Error("Governance repair did not return a repaired artifact ID.");
    }
    const refreshed = await current.refresh.refreshAfterMutation("governance-repair");
    const currentRequiredAction = await projectCurrentRequiredActionFromProjectionSnapshot(
      current,
      refreshed,
    );
    const maintenanceActionLabel = selectedMaintenanceActionLabel(refreshed);
    if (currentRequiredAction?.currentAction && maintenanceActionLabel) {
      currentRequiredAction.currentAction.maintenanceActionLabel = maintenanceActionLabel;
    }
    return {
      ...refreshed.maintenance.repair,
      repairedArtifactIds: result.repairedArtifactIds,
      currentAction: refreshed.projection.state.currentAction,
      maintenanceActionLabel,
      currentRequiredAction,
      maintenance: refreshed.maintenance,
      scanResult: refreshed.scanResult,
      projectionRevision: refreshed.scanResult.projectionRevision,
      ...(result.registryRevision === undefined ? {} : { registryRevision: result.registryRevision }),
      ...(result.cleanupWarnings?.length ? { cleanupWarnings: result.cleanupWarnings } : {}),
    };
  } catch (error) {
    const snapshot = await getCurrentGovernanceMaintenance();
    return {
      ...snapshot.maintenance.repair,
      ok: false,
      repairedArtifactIds: [],
      currentAction: snapshot.currentAction,
      maintenanceActionLabel: snapshot.maintenanceActionLabel,
      currentRequiredAction: snapshot.currentRequiredAction,
      maintenance: snapshot.maintenance,
      scanResult: snapshot.scanResult,
      projectionRevision: snapshot.projectionRevision,
      errorMessages: [...(snapshot.errorMessages ?? []), plainError(error)],
    };
  }
}

export async function listGovernanceApprovalQueue(): Promise<GovernanceApprovalQueueResult> {
  try {
    await ensureActiveSelectedProject();
    const current = requireActive();
    const snapshot = await current.refresh.getProjectionSnapshot();
    const approval = new GovernanceApprovalService(
      snapshot.project,
      current.authority.artifactPairs,
    );
    return approval.listQueue();
  } catch (error) {
    return { ok: false, items: [], errorMessages: [plainError(error)] };
  }
}

export async function decideGovernanceApproval(
  intent: GovernanceApprovalDecisionIntent,
): Promise<GovernanceApprovalDecisionResult> {
  try {
    await ensureActiveSelectedProject();
    const current = requireActive();
    const snapshot = await current.refresh.getProjectionSnapshot();
    const approval = new GovernanceApprovalService(
      snapshot.project,
      current.authority.artifactPairs,
    );
    const result = await approval.decide(intent);
    if (!result.ok) return result;
    const refreshed = await current.refresh.refreshAfterMutation("stage-owned-approval-decision");
    const currentRequiredAction = await projectCurrentRequiredActionFromProjectionSnapshot(
      current,
      refreshed,
    );
    return {
      ...result,
      selectedProjectId: refreshed.project.projectId,
      currentAction: refreshed.projection.state.currentAction,
      currentRequiredAction,
      maintenance: refreshed.maintenance,
      scanResult: refreshed.scanResult,
      projectionRevision: refreshed.scanResult.projectionRevision,
    };
  } catch (error) {
    return {
      ok: false,
      selectedProjectId: null,
      currentAction: null,
      maintenance: emptyGovernanceMaintenanceSummary(),
      errorMessages: [plainError(error)],
    };
  }
}

async function governanceMaintenanceSnapshotResult(
  current: ActiveProjectRuntime,
  snapshot: RepositoryProjectionSnapshot,
): Promise<GovernanceMaintenanceSnapshotResult> {
  const currentRequiredAction = await projectCurrentRequiredActionFromProjectionSnapshot(
    current,
    snapshot,
  );
  const maintenanceActionLabel = selectedMaintenanceActionLabel(snapshot);
  if (currentRequiredAction?.currentAction && maintenanceActionLabel) {
    currentRequiredAction.currentAction.maintenanceActionLabel = maintenanceActionLabel;
  }
  return {
    ok: true,
    selectedProjectId: snapshot.project.projectId,
    currentAction: snapshot.projection.state.currentAction,
    ...(maintenanceActionLabel ? { maintenanceActionLabel } : {}),
    currentRequiredAction,
    maintenance: snapshot.maintenance,
    scanResult: snapshot.scanResult,
    projectionRevision: snapshot.scanResult.projectionRevision,
  };
}

async function projectCurrentRequiredActionFromProjectionSnapshot(
  current: ActiveProjectRuntime,
  snapshot: RepositoryProjectionSnapshot,
): Promise<GovernanceMaintenanceSnapshotResult["currentRequiredAction"]> {
  return current.authority.projectCurrentRequiredActionFromSnapshot({
    state: snapshot.projection.state,
    routedAction: snapshot.projection.state.currentAction,
    registry: snapshot.registry,
    nodes: snapshot.graph.nodes,
  });
}

function selectedMaintenanceActionLabel(
  snapshot: RepositoryProjectionSnapshot,
): string | undefined {
  const action = snapshot.projection.state.currentAction;
  if (!action) return undefined;
  if (action.actionId === "operator_governance_approval_required") {
    return "Governance Approval";
  }
  if (action.actionId === "governance_repair_specification_required") {
    return "Architect repair specification";
  }
  if (action.actionId !== "governance_integrity_repair_required") {
    return undefined;
  }
  const targetArtifactId = action.targetArtifactId;
  const candidate = snapshot.maintenance.repair.candidates.find(
    (item) => item.artifactId === targetArtifactId,
  );
  if (!candidate) return "Repair specification required";
  if (candidate.repairKind === "canonical_serialization_repair") {
    return "Canonicalize pair";
  }
  if (candidate.repairKind === "missing_registry_registration") {
    return "Register canonical pair";
  }
  if (candidate.semanticProposal?.duplicateReconciliation) {
    return "Duplicate Artifact Cleanup";
  }
  if (candidate.repairKind === "semantic_identity_repair") {
    return "Review semantic repair";
  }
  return "Repair specification required";
}

function registryRevisionFromSnapshot(snapshot: RepositoryProjectionSnapshot): number {
  const registryId = `${snapshot.project.projectId}/system/artifact_registry`;
  return snapshot.graph.controlling(registryId)?.artifact.revision ?? 0;
}

function emptyGovernanceMaintenanceSummary(): GovernanceMaintenanceSnapshotResult["maintenance"] {
  return {
    repair: {
      ok: false,
      blockedMessage: "Governance records require canonical repair.",
      candidates: [],
      repairableCount: 0,
      payloadContentSummary: "Payload impact could not be determined because governance analysis failed.",
    },
    approval: {
      ok: false,
      items: [],
    },
  };
}

export async function listEligibleExecutionRunWorkCards(): Promise<EligibleExecutionRunWorkCardsResult> {
  try {
    await ensureActiveSelectedProject();
    return requireActive().executionRuns.listEligibleWorkCards();
  } catch (error) {
    return { ok: false, workCards: [], errorMessages: [plainError(error)] };
  }
}

export async function startExecutionRunFromWorkCard(
  request: ExecutionRunStartRequest,
): Promise<ExecutionRunOperationResult> {
  try {
    await ensureActiveSelectedProject();
    return requireActive().executionRuns.startFromWorkCardAuthority(request);
  } catch (error) {
    return { ok: false, errorMessages: [plainError(error)] };
  }
}

export function subscribeToRepositoryProjection(
  listener: RepositoryProjectionListener,
): () => void {
  projectionListeners.add(listener);
  return () => projectionListeners.delete(listener);
}

export function subscribeToActiveProjectRoot(
  listener: (projectRoot: string, projectId: string) => void,
): () => void {
  projectRootListeners.add(listener);
  return () => projectRootListeners.delete(listener);
}

export async function shutdownCanonicalRuntime(): Promise<void> {
  if (active) await active.observer.stop();
  active = null;
}

async function activateProject(projectId: string): Promise<void> {
  const registry = requireWorkspaces();
  const project = await registry.selectProject(projectId);
  if (active) await active.observer.stop();
  const refresh = new RepositoryRefreshService(project, registry);
  const authority = new CanonicalWorkflowAuthority(project.repositoryRoot, {
    authorityProvider: refresh,
    registryProvider: async () => (await refresh.getProjectionSnapshot()).registry,
    refreshAfterWrite: async (reason) =>
      (await refresh.refresh(reason)).projection.state,
  });
  const routedInvocation = new RoutedProcessInvocationService(
    authority.routedActions,
    authority.artifactPairs,
    {
      registryProvider: async () => (await refresh.getProjectionSnapshot()).registry,
      refreshAfterWrite: async (reason) =>
        (await refresh.refresh(reason)).projection.state,
    },
  );
  const contextCompiler = new CurrentContextPacketCompiler(authority);
  const contextService = new ContextPacketService(
    project.repositoryRoot,
    new ArtifactPairContextPacketWriter(authority.artifactPairs),
    project.projectId,
  );
  const executionPersistence = new ExecutionRunPersistenceService(
    authority.artifactPairs,
    project.projectId,
  );
  const executionRuns = new ExecutionRunAuthorityService(
    executionPersistence,
    project.projectId,
  );
  const observer = new RepositoryObserver(project, registry, refresh);
  for (const listener of projectionListeners) refresh.subscribe(listener);
  for (const listener of projectRootListeners) {
    listener(project.repositoryRoot, project.projectId);
  }
  active = {
    projectId: project.projectId,
    refresh,
    observer,
    authority,
    routedInvocation,
    contextCompiler,
    contextService,
    executionRuns,
  };
  await refresh.refresh("project-switch");
  await observer.start();
}

async function ensureActiveSelectedProject(): Promise<void> {
  const selected = await requireWorkspaces().getSelected();
  if (!selected) {
    throw new Error(
      "Active project is not available. Choose the project folder again before refreshing project state.",
    );
  }
  if (active?.projectId !== selected.projectId) {
    await activateProject(selected.projectId);
  }
}

function requireWorkspaces(): ProjectWorkspaceRegistry {
  if (!workspaces) throw new Error("Project workspace registry is not initialized.");
  return workspaces;
}

function requireActive(): ActiveProjectRuntime {
  if (!active) throw new Error("Selected project runtime is not initialized.");
  return active;
}

function forwardingProxy<T extends object>(resolve: () => T): T {
  return new Proxy({} as T, {
    get(_target, property) {
      const value = Reflect.get(resolve(), property);
      return typeof value === "function" ? value.bind(resolve()) : value;
    },
    set(_target, property, value) {
      return Reflect.set(resolve(), property, value);
    },
  });
}

function plainError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
