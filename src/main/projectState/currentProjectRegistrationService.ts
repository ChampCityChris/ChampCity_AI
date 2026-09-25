import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { ProjectId, ProjectStateRecord } from "../../shared/projectState/domainContracts";
import { createProjectStateService } from "../../shared/projectState/projectStateService";
import { createSQLiteProjectStateStore } from "./sqliteProjectStateStore";
import { createProjectWorkflowStateFacade } from "./projectWorkflowStateFacade";

const operator = { principalId: "local-operator", principalType: "human" as const, role: "Operator" };

export type CurrentProjectRegistrationMode = "existing" | "greenfield";
export interface CurrentProjectRegistration {
  project: ProjectStateRecord<"Project">;
  projectResource: ProjectStateRecord<"ProjectResource">;
  projectRoot: string;
  mode: CurrentProjectRegistrationMode;
  created: boolean;
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

function persistedProjectIds(databasePath: string): string[] {
  if (!fs.existsSync(databasePath)) return [];
  const database = new DatabaseSync(databasePath, { readOnly: true });
  try {
    const tables = database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='projects'").all();
    if (!tables.length) throw Error("Project State database is not a recognized current store.");
    return (database.prepare("SELECT project_id FROM projects ORDER BY project_id").all() as { project_id: string }[]).map(row => row.project_id);
  } finally { database.close(); }
}

/** Establishes or opens the one current SPS Project for a selected non-Git Project container. */
export async function registerCurrentProject(projectRoot: string, mode: CurrentProjectRegistrationMode,
  options: { projectName?: string } = {}): Promise<CurrentProjectRegistration> {
  if (mode !== "existing" && mode !== "greenfield") throw Error("A current Project registration mode is required.");
  if (options.projectName !== undefined && (!options.projectName.trim() || options.projectName.length > 200))
    throw Error("Project name must contain 1 to 200 characters.");
  const canonicalRoot = fs.realpathSync(projectRoot);
  const { database } = containedProjectState(canonicalRoot);
  const ids = persistedProjectIds(database);
  if (ids.length > 1) throw Error("Selected Project container contains ambiguous Project State records.");
  const store = createSQLiteProjectStateStore(database);
  try {
    const facade = createProjectWorkflowStateFacade(store, operator);
    let created = false;
    let projectId: ProjectId;
    if (ids.length === 1) projectId = ids[0];
    else {
      const name = options.projectName?.trim() || (mode === "greenfield" ? "New Project" : "Existing Project");
      const result = await facade.createProject({ name, purpose: mode === "greenfield" ? "Greenfield Project" : "Registered existing Project",
        repository: { provider: "git", repositoryId: "selected-project-source", locator: "selected-project", } });
      projectId = result.project.id;
      created = true;
    }
    let result = await facade.getProject(projectId);
    let sources = result?.resources.filter(resource => resource.entityType === "ProjectResource" && resource.body.resourceType === "source-repository") ?? [];
    if (!result) throw Error("Selected Project State Project record is unavailable.");
    if (!sources.length) {
      const state = createProjectStateService(store, operator);
      const source = await state.createRecord(projectId, "ProjectResource", { resourceType: "source-repository",
        provider: "git", logicalName: "selected-project-source", locator: "selected-project", role: "project-source" });
      await state.createRelationship(projectId, source.id, "relates_to", projectId);
      result = await facade.getProject(projectId);
      sources = result?.resources.filter(resource => resource.entityType === "ProjectResource" && resource.body.resourceType === "source-repository") ?? [];
    }
    if (!result || sources.length !== 1) throw Error("Selected Project State does not contain exactly one current source ProjectResource.");
    return { project: result.project, projectResource: sources[0] as ProjectStateRecord<"ProjectResource">,
      projectRoot: canonicalRoot, mode, created };
  } finally { store.close(); }
}
