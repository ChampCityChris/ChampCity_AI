import path from "node:path";

import type {
  AddProjectWorkspaceRequest,
  ProjectWorkspaceListResult,
  ProjectWorkspaceMutationResult,
  RefreshRepositoryStateResult,
} from "../shared/projects";
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
  type RepositoryProjectionListener,
} from "./repository";
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
}): Promise<void> {
  workspaces = new ProjectWorkspaceRegistry({ storagePath: input.workspaceStoragePath });
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
