import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { CapturedWorkIntake, WorkIntakeProjection, WorkIntakeSubmission } from "../../shared/workIntakeContracts";
import type { SourceReadiness } from "../../shared/sourceLifecycleContracts";
import type { ProjectStateRecord } from "../../shared/projectState/domainContracts";
import { createProjectStateService } from "../../shared/projectState/projectStateService";
import { createSQLiteProjectStateStore } from "../projectState/sqliteProjectStateStore";
import { createSourceControlService } from "../sourceControl/sourceControlService";

const principal = { principalId: "local-operator", principalType: "human" as const, role: "Operator" };
const diagnostic = (code: string) => code.replace(/[^A-Z0-9_-]/gi, "_").slice(0, 64) || "SOURCE_PREPARATION_FAILED";

export function isGreenfieldProjectRoot(root: string): boolean {
  const canonical = fs.realpathSync(root);
  if (!fs.statSync(canonical).isDirectory()) return false;
  const entries = fs.readdirSync(canonical);
  return entries.every(entry => {
    if (entry !== ".git" && entry !== ".champcity") return false;
    const target = path.join(canonical, entry);
    return fs.lstatSync(target).isDirectory() && !fs.lstatSync(target).isSymbolicLink() &&
      path.dirname(fs.realpathSync(target)) === canonical;
  });
}

export function getGreenfieldWorkIntakeProjection(root: string): WorkIntakeProjection {
  if (!isGreenfieldProjectRoot(root)) throw Error("Selected repository is not an empty greenfield Project root.");
  return { authority: "structured", project: null, suggestedProjectName: path.basename(fs.realpathSync(root)),
    branches: [], currentBranch: null, suggestedBase: null, intakes: [], currentIntake: null, blockedReason: null,
    capturedIntakes: [], currentCapturedIntake: null };
}

function captured(intake: ProjectStateRecord<"WorkIntake">, repositoryId: string,
  checkpoints: ProjectStateRecord<"SourceCheckpoint">[] = []): CapturedWorkIntake {
  return { intakeId: intake.id, projectId: intake.projectId, workRequest: intake.body.request,
    desiredOutcome: intake.body.desiredOutcome, knownConstraints: intake.body.constraints[0] ?? "",
    repositoryReviewContext: intake.body.evidenceContext[0] ?? "", source: { state: "unprepared", repositoryId, workIntakeId: intake.id },
    sourceCheckpoints: checkpoints.map(item => ({ boundaryId: item.body.boundaryId, kind: item.body.checkpointKind,
      state: item.body.checkpointState,
      ...(item.body.resultingRevisionId ? { revision: { repositoryId,
        revisionId: item.body.resultingRevisionId } } : {}) })) };
}

async function repositoryIdentity(store: ReturnType<typeof createSQLiteProjectStateStore>, projectId: string): Promise<string> {
  const resources = await store.listEntities(projectId, "ProjectResource");
  const resource = resources.find(item => item.entityType === "ProjectResource" && item.body.resourceType === "source-repository");
  if (resource?.entityType === "ProjectResource") return resource.body.logicalName;
  return "selected-repository";
}

export async function getStructuredWorkIntakeProjection(root: string, projectId: string, repositoryRoot: string = root): Promise<WorkIntakeProjection> {
  const store = createSQLiteProjectStateStore(path.join(fs.realpathSync(root), ".champcity", "project-state.sqlite"));
  try {
    const project = await store.getProject(projectId);
    if (!project) throw Error("Selected structured Project is unavailable.");
    const repositoryId = await repositoryIdentity(store, projectId);
    const intakes = (await store.listEntities(projectId, "WorkIntake"))
      .filter((item): item is ProjectStateRecord<"WorkIntake"> => item.entityType === "WorkIntake" && item.lifecycleState === "active")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const checkpoints = (await store.listEntities(projectId, "SourceCheckpoint"))
      .filter((item): item is ProjectStateRecord<"SourceCheckpoint"> => item.entityType === "SourceCheckpoint")
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id));
    const routes = await store.listRelationships(projectId, "routes_to");
    const initiates = await store.listRelationships(projectId, "initiates");
    const workflowByIntake = new Map<string, Set<string>>();
    for (const route of routes.filter(edge => !edge.endedAt)) for (const origin of initiates.filter(edge => edge.toEntityId === route.fromEntityId && !edge.endedAt)) {
      const values = workflowByIntake.get(origin.fromEntityId) ?? new Set<string>(); values.add(route.toEntityId); workflowByIntake.set(origin.fromEntityId, values);
    }
    const workflows = await store.listEntities(projectId, "Workflow");
    const saved = intakes.map(item => {
      const targetIds = workflowByIntake.get(item.id) ?? new Set<string>();
      const lineageIds = new Set(workflows.filter(row => row.entityType === "Workflow" && [...targetIds].some(targetId => workflows.some(target => target.entityType === "Workflow" && target.id === targetId && target.lineageId === row.lineageId))).map(row => row.id));
      return captured(item, repositoryId, checkpoints.filter(checkpoint => lineageIds.has(checkpoint.body.workflowId)));
    });
    const source = createSourceControlService({ repositoryRoot, projectContainerRoot: root, repositoryId });
    const branches = await source.branches();
    const available = branches.ok ? branches.result.branches : [];
    const currentBranch = branches.ok ? branches.result.currentBranch : null;
    const suggestedBase = available.find(item => item.name === "dev") ?? null;
    return { authority: "structured", project: { projectId, repositoryId, name: project.body.name }, suggestedProjectName: project.body.name,
      branches: suggestedBase ? [suggestedBase] : [], currentBranch, suggestedBase, intakes: [], currentIntake: null, blockedReason: null,
      capturedIntakes: saved, currentCapturedIntake: saved[0] ?? null };
  } finally { store.close(); }
}

async function prepare(root: string, projectId: string, intakeId: string): Promise<CapturedWorkIntake> {
  const store = createSQLiteProjectStateStore(path.join(fs.realpathSync(root), ".champcity", "project-state.sqlite"));
  try {
    const intake = await store.getEntity(projectId, intakeId);
    if (intake?.entityType !== "WorkIntake") throw Error("Saved Work Intake is unavailable.");
    const repositoryId = await repositoryIdentity(store, projectId);
    return captured(intake, repositoryId);
  } finally { store.close(); }
}

export async function captureStructuredWorkIntake(root: string, projectId: string, input: WorkIntakeSubmission): Promise<CapturedWorkIntake> {
  const fields = ["projectId", "projectName", "workRequest", "desiredOutcome", "knownConstraints", "hasExistingSourceOrPlanning", "repositoryReviewContext", "baseBranch", "baseCommit"];
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).some(key => !fields.includes(key)) ||
    input.projectId !== projectId || typeof input.projectName !== "string" || typeof input.workRequest !== "string" ||
    typeof input.desiredOutcome !== "string" || typeof input.knownConstraints !== "string" || typeof input.repositoryReviewContext !== "string" ||
    typeof input.hasExistingSourceOrPlanning !== "boolean" || typeof input.baseBranch !== "string" || typeof input.baseCommit !== "string" ||
    !input.projectName.trim() || !input.workRequest.trim() || !input.desiredOutcome.trim() ||
    [input.projectName, input.workRequest, input.desiredOutcome, input.knownConstraints, input.repositoryReviewContext, input.baseBranch, input.baseCommit]
      .some(value => value.length > 20_000 || value.includes("\0"))) throw Error("Work Intake form is invalid.");
  const store = createSQLiteProjectStateStore(path.join(fs.realpathSync(root), ".champcity", "project-state.sqlite"));
  let intakeId: string;
  try {
    const project = await store.getProject(projectId);
    if (!project || project.body.name !== input.projectName) throw Error("Selected Project changed; refresh Work Intake.");
    const state = createProjectStateService(store, principal);
    const created = await state.createWorkIntake(projectId, { request: input.workRequest.trim(), desiredOutcome: input.desiredOutcome.trim(),
      constraints: input.knownConstraints.trim() ? [input.knownConstraints.trim()] : [],
      evidenceContext: input.repositoryReviewContext.trim() ? [input.repositoryReviewContext.trim()] : [],
      requestedIntegrationTarget: "dev", hasExistingSourceOrPlanning: input.hasExistingSourceOrPlanning });
    intakeId = created.intake.id;
  } finally { store.close(); }
  return prepare(root, projectId, intakeId);
}

export async function retryStructuredWorkIntakeSource(root: string, projectId: string, intakeId: string): Promise<CapturedWorkIntake> {
  return prepare(root, projectId, intakeId);
}

/** Legacy generic-Work-Intake fallback; the WRB01 Project landing path registers SPS before entering Project Intake. */
export async function captureGreenfieldWorkIntake(root: string, input: WorkIntakeSubmission): Promise<CapturedWorkIntake> {
  if (!isGreenfieldProjectRoot(root) || input.projectId !== null || typeof input.projectName !== "string" ||
    !input.projectName.trim() || input.projectName.length > 20_000) throw Error("Greenfield Work Intake requires a new selected Project.");
  const canonical = fs.realpathSync(root);
  const app = path.join(canonical, ".champcity");
  if (!fs.existsSync(app)) fs.mkdirSync(app);
  const file = path.join(app, "project-state.sqlite");
  const store = createSQLiteProjectStateStore(file);
  let projectId: string;
  try {
    const state = createProjectStateService(store, principal);
    const database = new DatabaseSync(file, { readOnly: true });
    let rows: { project_id: string }[];
    try { rows = database.prepare("SELECT project_id FROM projects").all() as { project_id: string }[]; }
    finally { database.close(); }
    if (rows.length > 1) throw Error("Greenfield Project State has ambiguous identity.");
    if (rows.length) {
      projectId = rows[0].project_id;
      const project = await store.getProject(projectId);
      if (!project || project.body.name !== input.projectName.trim()) throw Error("Greenfield Project identity changed; inspect before retrying.");
    } else {
      const project = await state.createRecord(null, "Project", { name: input.projectName.trim(), description: "New ChampCity Project" });
      projectId = project.id;
    }
    const resources = await store.listEntities(projectId, "ProjectResource");
    if (!resources.some(item => item.entityType === "ProjectResource" && item.body.locator === "greenfield-selected-repository")) {
      await state.createRecord(projectId, "ProjectResource", { resourceType: "source-repository", provider: "git",
        logicalName: `repository-${randomUUID()}`, locator: "greenfield-selected-repository", role: "project-source" });
    }
    if (!await store.getProviderGeneration(projectId)) await store.transaction(projectId, unit =>
      unit.advanceProviderGeneration({ projectId, generation: 1, authority: "structured", updatedAt: new Date().toISOString() }, null));
    else if ((await store.getProviderGeneration(projectId))?.authority !== "structured") throw Error("Greenfield Project authority is incompatible.");
  } finally { store.close(); }
  return captureStructuredWorkIntake(root, projectId, { ...input, projectId });
}
