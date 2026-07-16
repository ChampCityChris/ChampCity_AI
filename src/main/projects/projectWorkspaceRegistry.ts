import { access, mkdir, readFile, realpath, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  AddProjectWorkspaceRequest,
  ConfiguredProject,
  ProjectObserverStatus,
  ProjectScanResult,
  ProjectWorkspaceRegistryDocument,
  ProjectWorkspaceSummary,
} from "../../shared/projects";

const WORKSPACE_SCHEMA_VERSION = "champcity.project-workspaces.v1" as const;

export interface ProjectWorkspaceRegistryOptions {
  storagePath: string;
  clock?: () => string;
}
export class ProjectWorkspaceRegistry {
  private readonly storagePath: string;
  private readonly clock: () => string;
  private writeTail: Promise<void> = Promise.resolve();

  constructor(options: ProjectWorkspaceRegistryOptions) {
    if (!path.isAbsolute(options.storagePath)) {
      throw new TypeError("Project workspace storage path must be absolute.");
    }
    this.storagePath = path.resolve(options.storagePath);
    this.clock = options.clock ?? (() => new Date().toISOString());
  }

  async initialize(defaultRepositoryRoot?: string): Promise<ProjectWorkspaceRegistryDocument> {
    const current = await this.load();
    if (current.projects.length > 0 || !defaultRepositoryRoot) return current;
    const added = await this.addProject({ repositoryRoot: defaultRepositoryRoot });
    await this.selectProject(added.projectId);
    return this.load();
  }

  async load(): Promise<ProjectWorkspaceRegistryDocument> {
    try {
      const parsed = JSON.parse(await readFile(this.storagePath, "utf8"));
      return assertRegistryDocument(parsed);
    } catch (error) {
      if (isMissing(error)) return emptyDocument();
      throw error;
    }
  }

  async list(): Promise<ProjectWorkspaceSummary[]> {
    const document = await this.load();
    const summaries: ProjectWorkspaceSummary[] = [];
    for (const project of document.projects) {
      if (!project.enabled) continue;
      if (!(await isConfiguredProjectReachable(project))) continue;
      summaries.push(toSummary(project, document.selectedProjectId));
    }
    return summaries;
  }

  async getSelected(): Promise<ConfiguredProject | null> {
    const document = await this.load();
    const project = document.projects.find(
      (candidate) => candidate.projectId === document.selectedProjectId && candidate.enabled,
    );
    return project && (await isConfiguredProjectReachable(project))
      ? cloneProject(project)
      : null;
  }

  async getProject(projectId: string): Promise<ConfiguredProject | null> {
    const document = await this.load();
    const project = document.projects.find(
      (candidate) => candidate.projectId === projectId && candidate.enabled,
    );
    return project && (await isConfiguredProjectReachable(project))
      ? cloneProject(project)
      : null;
  }

  async addProject(request: AddProjectWorkspaceRequest): Promise<ConfiguredProject> {
    const validated = await validateProjectRepository(request);
    return this.mutate((document) => {
      const duplicateRoot = document.projects.find(
        (candidate) => pathKey(candidate.repositoryRoot) === pathKey(validated.repositoryRoot),
      );
      if (duplicateRoot) {
        throw new Error(`Project folder is already registered as ${duplicateRoot.displayName}.`);
      }
      if (document.projects.some((candidate) => candidate.projectId === validated.projectId)) {
        throw new Error(`Configured project ID ${validated.projectId} already belongs to another repository.`);
      }
      const now = this.clock();
      const project: ConfiguredProject = {
        ...validated,
        branchBehavior: request.branchBehavior ?? { mode: "observe-current" },
        enabled: true,
        createdAt: now,
        updatedAt: now,
        lastOpenedAt: null,
        lastScanAt: null,
        lastScanResult: null,
        observerStatus: "stopped",
      };
      document.projects.push(project);
      if (!document.selectedProjectId) document.selectedProjectId = project.projectId;
      return cloneProject(project);
    });
  }

  async selectProject(projectId: string): Promise<ConfiguredProject> {
    return this.mutate(async (document) => {
      const project = document.projects.find(
        (candidate) => candidate.projectId === projectId && candidate.enabled,
      );
      if (!project) throw new Error(`Configured project ${projectId} is unavailable.`);
      await assertConfiguredProjectReachable(project);
      const now = this.clock();
      document.selectedProjectId = projectId;
      project.lastOpenedAt = now;
      project.updatedAt = now;
      return cloneProject(project);
    });
  }

  async updateObserverStatus(
    projectId: string,
    observerStatus: ProjectObserverStatus,
  ): Promise<void> {
    await this.mutate((document) => {
      const project = requireProject(document, projectId);
      project.observerStatus = observerStatus;
      project.updatedAt = this.clock();
    });
  }

  async updateScanResult(projectId: string, result: ProjectScanResult): Promise<void> {
    await this.mutate((document) => {
      const project = requireProject(document, projectId);
      project.lastScanAt = result.scannedAt;
      project.lastScanResult = structuredClone(result);
      project.observerStatus = result.blockers.length > 0 ? "blocked" : "watching";
      project.updatedAt = this.clock();
    });
  }

  private async mutate<T>(
    operation: (document: ProjectWorkspaceRegistryDocument) => T | Promise<T>,
  ): Promise<T> {
    let release!: () => void;
    const predecessor = this.writeTail;
    this.writeTail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await predecessor;
    try {
      const document = await this.load();
      const result = await operation(document);
      await persistDocument(this.storagePath, document);
      return result;
    } finally {
      release();
    }
  }
}
async function validateProjectRepository(
  request: AddProjectWorkspaceRequest,
): Promise<Pick<ConfiguredProject, "projectId" | "displayName" | "repositoryRoot" | "planningRoot">> {
  if (!request.repositoryRoot.trim()) throw new Error("Choose a project folder before adding it.");
  const repositoryRoot = await realpath(path.resolve(request.repositoryRoot)).catch(() => {
    throw new Error("Project folder was not found. Choose the project folder again.");
  });
  if (!(await stat(repositoryRoot)).isDirectory()) {
    throw new Error("Project folder must be a directory.");
  }
  await access(path.join(repositoryRoot, "package.json")).catch(() => {
    throw new Error("Project folder is not a supported ChampCity workspace: package.json was not found.");
  });
  const planningRootCandidate = path.resolve(
    repositoryRoot,
    request.planningRoot?.trim() || "planning",
  );
  const relativePlanning = path.relative(repositoryRoot, planningRootCandidate);
  if (relativePlanning.startsWith("..") || path.isAbsolute(relativePlanning)) {
    throw new Error("Planning root must remain inside the configured repository.");
  }
  const planningRoot = await realpath(planningRootCandidate).catch(() => {
    throw new Error("Project folder is not a supported ChampCity workspace: planning folder was not found.");
  });
  if (!(await stat(planningRoot)).isDirectory()) {
    throw new Error("Project planning folder must be a directory.");
  }
  const metadata = await readProjectMetadata(repositoryRoot, planningRoot);
  const projectId = normalizeId(request.projectId || metadata.projectId || path.basename(repositoryRoot));
  const displayName = (request.displayName || metadata.displayName || projectId).trim();
  if (!displayName) throw new Error("Configured project display name is required.");
  return { projectId, displayName, repositoryRoot, planningRoot };
}

async function assertConfiguredProjectReachable(project: ConfiguredProject): Promise<void> {
  try {
    const repositoryRoot = await realpath(project.repositoryRoot);
    const planningRoot = await realpath(project.planningRoot);
    if (!(await stat(repositoryRoot)).isDirectory()) {
      throw new Error("Project folder is not a directory.");
    }
    if (!(await stat(planningRoot)).isDirectory()) {
      throw new Error("Planning folder is not a directory.");
    }
    await access(path.join(repositoryRoot, "package.json"));
  } catch (error) {
    throw new Error(
      `Project ${project.displayName} is not available. Choose the project folder again. ${plainError(error)}`,
    );
  }
}

async function isConfiguredProjectReachable(project: ConfiguredProject): Promise<boolean> {
  try {
    await assertConfiguredProjectReachable(project);
    return true;
  } catch {
    return false;
  }
}

async function readProjectMetadata(
  repositoryRoot: string,
  planningRoot: string,
): Promise<{ projectId?: string; displayName?: string }> {
  const profilePath = path.join(planningRoot, "project", "PROJECT_PROFILE.json");
  try {
    const profile = JSON.parse(await readFile(profilePath, "utf8"));
    return {
      projectId: typeof profile.projectId === "string" ? profile.projectId : undefined,
      displayName:
        typeof profile.payload?.title === "string"
          ? profile.payload.title.replace(/^Project Profile:\s*/i, "").trim()
          : undefined,
    };
  } catch (error) {
    if (!isMissing(error)) throw new Error(`Project profile is invalid: ${plainError(error)}`);
    const packageJson = JSON.parse(await readFile(path.join(repositoryRoot, "package.json"), "utf8"));
    return {
      projectId: typeof packageJson.name === "string" ? packageJson.name : undefined,
      displayName: typeof packageJson.productName === "string" ? packageJson.productName : undefined,
    };
  }
}

async function persistDocument(
  storagePath: string,
  document: ProjectWorkspaceRegistryDocument,
): Promise<void> {
  assertRegistryDocument(document);
  await mkdir(path.dirname(storagePath), { recursive: true });
  const temporaryPath = `${storagePath}.tmp-${process.pid}`;
  await writeFile(temporaryPath, `${JSON.stringify(document, null, 2)}\n`, "utf8");
  await rename(temporaryPath, storagePath);
}

function assertRegistryDocument(value: unknown): ProjectWorkspaceRegistryDocument {
  if (!isRecord(value) || value.schemaVersion !== WORKSPACE_SCHEMA_VERSION) {
    throw new Error("Project workspace registry has an unsupported schema.");
  }
  if (value.selectedProjectId !== null && typeof value.selectedProjectId !== "string") {
    throw new Error("Project workspace selection is invalid.");
  }
  if (!Array.isArray(value.projects)) throw new Error("Configured projects must be an array.");
  const projects = value.projects.map(assertConfiguredProject);
  const ids = new Set(projects.map((project) => project.projectId));
  if (ids.size !== projects.length) throw new Error("Configured project IDs must be unique.");
  if (value.selectedProjectId && !ids.has(value.selectedProjectId)) {
    throw new Error("Selected project is not configured.");
  }
  return {
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    selectedProjectId: value.selectedProjectId,
    projects,
  };
}

function assertConfiguredProject(value: unknown): ConfiguredProject {
  if (!isRecord(value)) throw new Error("Configured project is invalid.");
  for (const key of ["projectId", "displayName", "repositoryRoot", "planningRoot", "createdAt", "updatedAt"] as const) {
    if (typeof value[key] !== "string" || !value[key].trim()) {
      throw new Error(`Configured project ${key} is invalid.`);
    }
  }
  if (!path.isAbsolute(value.repositoryRoot as string) || !path.isAbsolute(value.planningRoot as string)) {
    throw new Error("Configured project roots must be absolute local paths.");
  }
  return structuredClone(value) as unknown as ConfiguredProject;
}

function requireProject(
  document: ProjectWorkspaceRegistryDocument,
  projectId: string,
): ConfiguredProject {
  const project = document.projects.find((candidate) => candidate.projectId === projectId);
  if (!project) throw new Error(`Configured project ${projectId} was not found.`);
  return project;
}

function toSummary(project: ConfiguredProject, selectedProjectId: string | null): ProjectWorkspaceSummary {
  return {
    projectId: project.projectId,
    displayName: project.displayName,
    repositoryRoot: project.repositoryRoot,
    planningRoot: project.planningRoot,
    branchBehavior: structuredClone(project.branchBehavior),
    enabled: project.enabled,
    selected: project.projectId === selectedProjectId,
    observerStatus: project.observerStatus,
    lastScanAt: project.lastScanAt,
    lastScanResult: project.lastScanResult ? structuredClone(project.lastScanResult) : null,
  };
}

function cloneProject(project: ConfiguredProject): ConfiguredProject {
  return structuredClone(project);
}

function emptyDocument(): ProjectWorkspaceRegistryDocument {
  return { schemaVersion: WORKSPACE_SCHEMA_VERSION, selectedProjectId: null, projects: [] };
}

function normalizeId(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!normalized) throw new Error("Configured project ID is invalid.");
  return normalized;
}

function pathKey(value: string): string {
  return process.platform === "win32" ? path.resolve(value).toLowerCase() : path.resolve(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMissing(error: unknown): boolean {
  return isRecord(error) && error.code === "ENOENT";
}

function plainError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
