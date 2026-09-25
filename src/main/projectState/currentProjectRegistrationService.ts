import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { ProjectId, ProjectStateRecord } from "../../shared/projectState/domainContracts";
import { createProjectStateService } from "../../shared/projectState/projectStateService";
import { createSQLiteProjectStateStore } from "./sqliteProjectStateStore";
import { createProjectWorkflowStateFacade } from "./projectWorkflowStateFacade";

const operator = { principalId: "local-operator", principalType: "human" as const, role: "Operator" };
export const CURRENT_PROJECT_REPOSITORY_ID = "selected-project-source";
export const CURRENT_PROJECT_REGISTRATION_RESOURCE = Object.freeze({
  resourceType: "current-project-registration", provider: "champcity", logicalName: "current-project",
  locator: "selected-project", role: "current-project",
} as const);

export type CurrentProjectRegistrationMode = "existing" | "greenfield";
export interface CurrentProjectRegistration {
  project: ProjectStateRecord<"Project">;
  projectResource: ProjectStateRecord<"ProjectResource">;
  repositoryResource: ProjectStateRecord<"ProjectResource"> | null;
  projectRoot: string;
  mode: CurrentProjectRegistrationMode;
  created: boolean;
}

function isCurrentProjectRegistration(body: unknown): boolean {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  const candidate = body as Record<string, unknown>;
  const canonical = CURRENT_PROJECT_REGISTRATION_RESOURCE as Readonly<Record<string, string>>;
  return Object.keys(canonical).every(key => candidate[key] === canonical[key]) &&
    Object.keys(candidate).length === Object.keys(CURRENT_PROJECT_REGISTRATION_RESOURCE).length;
}

/** Resolves the single active Current Project only through its dedicated registration resource. */
export function selectedCurrentProjectId(projectRoot: string): string | null {
  const canonical = fs.realpathSync(projectRoot);
  const directory = path.join(canonical, ".champcity");
  if (!fs.existsSync(directory)) return null;
  const stat = fs.lstatSync(directory);
  if (stat.isSymbolicLink() || !stat.isDirectory() || path.dirname(fs.realpathSync(directory)) !== canonical)
    throw Error("Project State storage is invalid.");
  const databasePath = path.join(directory, "project-state.sqlite");
  if (!fs.existsSync(databasePath)) return null;
  if (fs.lstatSync(databasePath).isSymbolicLink() || !fs.lstatSync(databasePath).isFile()) throw Error("Project State store is invalid.");
  const database = new DatabaseSync(databasePath, { readOnly: true });
  try {
    const tables = database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='projects'").all();
    if (!tables.length) throw Error("Selected Project State store is not current.");
    const rows = database.prepare(`SELECT e.project_id, v.body_json FROM state_entities e
      JOIN state_entity_versions v ON v.project_id=e.project_id AND v.entity_id=e.entity_id AND v.record_version=e.current_record_version
      JOIN projects p ON p.project_id=e.project_id
      WHERE e.entity_type='ProjectResource' AND e.lifecycle_state='active' AND p.lifecycle_state='active'`).all() as { project_id: string; body_json: string }[];
    const registrations = rows.filter(row => { try { return isCurrentProjectRegistration(JSON.parse(row.body_json)); } catch { return false; } });
    if (registrations.length > 1) throw Error("Selected Project State contains ambiguous Project identities.");
    return registrations[0]?.project_id ?? null;
  } finally { database.close(); }
}

function containedProjectState(root: string): { directory: string; database: string } {
  const canonical = fs.realpathSync(root);
  if (!fs.statSync(canonical).isDirectory()) throw Error("Selected Project container must be a directory.");
  const directory = path.join(canonical, ".champcity");
  if (fs.existsSync(directory)) {
    const stat = fs.lstatSync(directory);
    if (stat.isSymbolicLink() || !stat.isDirectory() || path.dirname(fs.realpathSync(directory)) !== canonical)
      throw Error("Project State storage is invalid.");
  } else fs.mkdirSync(directory);
  const database = path.join(directory, "project-state.sqlite");
  if (fs.existsSync(database) && (fs.lstatSync(database).isSymbolicLink() || !fs.lstatSync(database).isFile()))
    throw Error("Project State store is invalid.");
  return { directory, database };
}

/** Returns the active optional Git Repository identity attached to this Current Project. */
export async function currentProjectRepositoryId(projectRoot: string): Promise<string | null> {
  const projectId = selectedCurrentProjectId(projectRoot);
  if (!projectId) return null;
  const { database } = containedProjectState(projectRoot);
  const store = createSQLiteProjectStateStore(database);
  try {
    const project = await createProjectWorkflowStateFacade(store, operator).getProject(projectId);
    if (!project) throw Error("Selected Current Project is unavailable.");
    const sources = project.resources.filter(resource => resource.entityType === "ProjectResource" &&
      resource.lifecycleState === "active" && resource.body.resourceType === "source-repository");
    if (sources.length > 1) throw Error("Current Project has ambiguous source Repository identities.");
    const source = sources[0];
    if (!source) return null;
    if (source.entityType !== "ProjectResource" || source.body.provider !== "git" || source.body.locator !== "managed-repository" ||
      source.body.role !== "project-source") throw Error("Current Project source Repository registration is invalid.");
    return source.body.logicalName;
  } finally { store.close(); }
}

/** Establishes or opens the Current Project independently from its optional Git Repository. */
export async function registerCurrentProject(projectRoot: string, mode: CurrentProjectRegistrationMode,
  options: { projectName?: string; sourceRepositoryId?: string } = {}): Promise<CurrentProjectRegistration> {
  if (mode !== "existing" && mode !== "greenfield") throw Error("A current Project registration mode is required.");
  if (options.projectName !== undefined && (!options.projectName.trim() || options.projectName.length > 200))
    throw Error("Project name must contain 1 to 200 characters.");
  if (options.sourceRepositoryId !== undefined && !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(options.sourceRepositoryId))
    throw Error("Source Repository identity is invalid.");
  const canonicalRoot = fs.realpathSync(projectRoot);
  const { database } = containedProjectState(canonicalRoot);
  const currentId = selectedCurrentProjectId(canonicalRoot);
  const store = createSQLiteProjectStateStore(database);
  try {
    const facade = createProjectWorkflowStateFacade(store, operator);
    let created = false;
    let projectId: ProjectId;
    if (currentId) projectId = currentId;
    else {
      const name = options.projectName?.trim() || (mode === "greenfield" ? "New Project" : "Existing Project");
      const result = await facade.createProject({ name, purpose: mode === "greenfield" ? "Greenfield Project" : "Registered existing Project" });
      projectId = result.project.id;
      await createProjectStateService(store, operator).createRecord(projectId, "ProjectResource", CURRENT_PROJECT_REGISTRATION_RESOURCE);
      created = true;
    }
    const state = createProjectStateService(store, operator);
    const getResources = async () => (await facade.getProject(projectId))?.resources ?? [];
    let resources = await getResources();
    const registrationMarkers = resources.filter(resource => resource.entityType === "ProjectResource" &&
      resource.lifecycleState === "active" && isCurrentProjectRegistration(resource.body));
    if (registrationMarkers.length !== 1) throw Error("Current Project registration marker is missing or ambiguous.");
    let sources = resources.filter(resource => resource.entityType === "ProjectResource" &&
      resource.lifecycleState === "active" && resource.body.resourceType === "source-repository");
    if (sources.length > 1) throw Error("Current Project has ambiguous source Repository identities.");
    if (sources.length === 1) {
      const source = sources[0];
      if (source.entityType !== "ProjectResource" || source.body.provider !== "git" || source.body.locator !== "managed-repository" ||
        source.body.role !== "project-source" || (options.sourceRepositoryId !== undefined && source.body.logicalName !== options.sourceRepositoryId))
        throw Error("Existing source Repository registration is incompatible with the Current Project contract.");
    } else if (options.sourceRepositoryId) {
      const repository = await state.createRecord(projectId, "ProjectResource", { resourceType: "source-repository", provider: "git",
        logicalName: options.sourceRepositoryId, locator: "managed-repository", role: "project-source" });
      await state.createRelationship(projectId, repository.id, "relates_to", projectId);
      resources = await getResources();
      sources = resources.filter(resource => resource.entityType === "ProjectResource" && resource.lifecycleState === "active" && resource.body.resourceType === "source-repository");
    }
    const result = await facade.getProject(projectId);
    const marker = registrationMarkers[0];
    if (!result || marker.entityType !== "ProjectResource" || sources.length > 1)
      throw Error("Current Project registration could not be verified.");
    return { project: result.project, projectResource: marker, repositoryResource: (sources[0] as ProjectStateRecord<"ProjectResource"> | undefined) ?? null,
      projectRoot: canonicalRoot, mode, created };
  } finally { store.close(); }
}
