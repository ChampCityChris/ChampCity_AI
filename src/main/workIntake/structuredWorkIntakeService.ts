import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { CapturedWorkIntake, WorkIntakeProjection, WorkIntakeSubmission } from "../../shared/workIntakeContracts";
import type { SourceReadiness } from "../../shared/sourceLifecycleContracts";
import type { ProjectStateRecord } from "../../shared/projectState/domainContracts";
import { createProjectStateService } from "../../shared/projectState/projectStateService";
import { readDurableProviderGeneration } from "../migrations/structuredProviderCutover";
import { createSQLiteProjectStateStore } from "../projectState/sqliteProjectStateStore";
import { createSourceControlService } from "../sourceControl/sourceControlService";
import { workIntakeBranchName } from "../sourceControl/workSourceNaming";

const principal = { principalId: "local-operator", principalType: "human" as const, role: "Operator" };
const diagnostic = (code: string) => code.replace(/[^A-Z0-9_-]/gi, "_").slice(0, 64) || "SOURCE_PREPARATION_FAILED";

/** Only the live durable row can opt the selected Project into structured Work Intake. */
export function selectedStructuredProjectId(root: string): string | null {
  const canonical = fs.realpathSync(root);
  const app = path.join(canonical, ".champcity");
  if (!fs.existsSync(app)) return null;
  if (fs.lstatSync(app).isSymbolicLink() || !fs.lstatSync(app).isDirectory() || path.dirname(fs.realpathSync(app)) !== canonical) throw Error("Project State storage is invalid.");
  const file = path.join(app, "project-state.sqlite");
  if (!fs.existsSync(file)) return null;
  if (fs.lstatSync(file).isSymbolicLink() || !fs.lstatSync(file).isFile()) throw Error("Project State store is invalid.");
  const database = new DatabaseSync(file, { readOnly: true });
  try {
    const rows = database.prepare("SELECT project_id FROM project_state_authority WHERE authority = 'structured'").all() as { project_id: string }[];
    if (!rows.length) return null;
    if (rows.length !== 1) throw Error("Selected repository has ambiguous Project State authority.");
    const id = rows[0].project_id;
    if (readDurableProviderGeneration(canonical, id)?.authority !== "structured") throw Error("Structured Project State authority changed.");
    return id;
  } finally { database.close(); }
}

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

function readiness(binding: ProjectStateRecord<"SourceBinding">): SourceReadiness {
  const body = binding.body;
  if (body.preparationState === "ready" && body.baseRevisionId && body.workSourceLineId && body.currentRevisionId) return {
    state: "ready", repositoryId: body.repositoryId, workIntakeId: body.workIntakeId,
    binding: { owner: { kind: "work-intake", workIntakeId: body.workIntakeId },
      baseRevision: { repositoryId: body.repositoryId, revisionId: body.baseRevisionId },
      sourceLine: { repositoryId: body.repositoryId, sourceLineId: body.workSourceLineId,
        providerBranchName: body.workSourceLineId, headRevisionId: body.currentRevisionId } },
  };
  if (body.preparationState === "blocked") return { state: "blocked", repositoryId: body.repositoryId,
    workIntakeId: body.workIntakeId, code: body.failureCode ?? "SOURCE_PREPARATION_FAILED",
    message: `Source preparation is blocked (${body.failureCode ?? "SOURCE_PREPARATION_FAILED"}). The saved Work Intake can be retried.`,
    inspectionRequired: ["INSPECTION_REQUIRED", "BRANCH_COLLISION", "UNKNOWN_SOURCE_OUTCOME"].includes(body.failureCode ?? "") };
  if (body.preparationState === "ready") throw Error("Ready source binding is incomplete.");
  return { state: body.preparationState, repositoryId: body.repositoryId, workIntakeId: body.workIntakeId };
}

function asBinding(record: Awaited<ReturnType<ReturnType<typeof createProjectStateService>["updateSourceBinding"]>>): ProjectStateRecord<"SourceBinding"> {
  if (record.entityType !== "SourceBinding") throw Error("Source preparation returned an unrelated record.");
  return record;
}

function captured(intake: ProjectStateRecord<"WorkIntake">, binding: ProjectStateRecord<"SourceBinding">): CapturedWorkIntake {
  return { intakeId: intake.id, projectId: intake.projectId, workRequest: intake.body.request,
    desiredOutcome: intake.body.desiredOutcome, knownConstraints: intake.body.constraints[0] ?? "",
    repositoryReviewContext: intake.body.evidenceContext[0] ?? "", source: readiness(binding) };
}

async function repositoryIdentity(store: ReturnType<typeof createSQLiteProjectStateStore>, projectId: string): Promise<string> {
  const resources = await store.listEntities(projectId, "ProjectResource");
  const resource = resources.find(item => item.entityType === "ProjectResource" && item.body.resourceType === "source-repository");
  if (resource?.entityType === "ProjectResource") return resource.body.logicalName;
  const bindings = await store.listEntities(projectId, "SourceBinding");
  const binding = bindings.find(item => item.entityType === "SourceBinding");
  return binding?.entityType === "SourceBinding" ? binding.body.repositoryId : "selected-repository";
}

async function bindingFor(store: ReturnType<typeof createSQLiteProjectStateStore>, projectId: string, intakeId: string) {
  const records = await store.listEntities(projectId, "SourceBinding");
  const binding = records.find((item): item is ProjectStateRecord<"SourceBinding"> =>
    item.entityType === "SourceBinding" && item.body.workIntakeId === intakeId && item.lifecycleState === "active");
  if (!binding) throw Error("Saved Work Intake has no source preparation state.");
  return binding;
}

export async function getStructuredWorkIntakeProjection(root: string, projectId: string): Promise<WorkIntakeProjection> {
  const store = createSQLiteProjectStateStore(path.join(fs.realpathSync(root), ".champcity", "project-state.sqlite"));
  try {
    const project = await store.getProject(projectId);
    if (!project) throw Error("Selected structured Project is unavailable.");
    const repositoryId = await repositoryIdentity(store, projectId);
    const intakes = (await store.listEntities(projectId, "WorkIntake"))
      .filter((item): item is ProjectStateRecord<"WorkIntake"> => item.entityType === "WorkIntake" && item.lifecycleState === "active")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const saved = await Promise.all(intakes.map(async item => captured(item, await bindingFor(store, projectId, item.id))));
    const source = createSourceControlService({ repositoryRoot: root, repositoryId });
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
    const state = createProjectStateService(store, principal);
    const intake = await state.getRecord(projectId, intakeId);
    if (intake?.entityType !== "WorkIntake") throw Error("Saved Work Intake is unavailable.");
    let binding = await bindingFor(store, projectId, intakeId);
    if (binding.body.preparationState === "ready") return captured(intake, binding);
    const priorBase = binding.body.baseRevisionId;
    if (binding.body.preparationState === "preparing") binding = asBinding(await state.updateSourceBinding(projectId, binding.id,
      { preparationState: "blocked", failureCode: "PREPARATION_INTERRUPTED" }, binding.recordVersion));
    binding = asBinding(await state.updateSourceBinding(projectId, binding.id,
      { preparationState: "preparing", failureCode: undefined }, binding.recordVersion));
    const source = createSourceControlService({ repositoryRoot: root, repositoryId: binding.body.repositoryId });
    const resources = await store.listEntities(projectId, "ProjectResource");
    const greenfield = resources.some(item => item.entityType === "ProjectResource" &&
      item.body.resourceType === "source-repository" && item.body.locator === "greenfield-selected-repository");
    if (greenfield) {
      const bootstrap = await source.bootstrapProjectSource();
      if (!bootstrap.ok) {
        binding = asBinding(await state.updateSourceBinding(projectId, binding.id,
          { preparationState: "blocked", failureCode: diagnostic(bootstrap.error.code) }, binding.recordVersion));
        return captured(intake, binding);
      }
      const evidence = (await store.listEntities(projectId, "Evidence"))
        .find(item => item.entityType === "Evidence" && item.body.evidenceType === "source-bootstrap");
      const payload = JSON.stringify({ topology: bootstrap.result, receipt: bootstrap.receipt });
      if (!evidence) await state.recordEvidence(projectId, projectId, { evidenceType: "source-bootstrap",
        description: payload, mediaType: "application/vnd.champcity.source-bootstrap+json",
        payloadRef: `git:commit/${bootstrap.result.initialRevision.revisionId}`, digest: bootstrap.result.initialCommitDigest });
    }
    const resolved = await source.resolveSourceRevision({ kind: "source-line", sourceLineId: binding.body.integrationTargetSourceLineId });
    let failure = !resolved.ok ? resolved.error.code : "";
    let inspectionRequired = false;
    let base = resolved.ok ? resolved.result : null;
    let line: string | null = null;
    if (base) {
      if (priorBase && priorBase !== base.revisionId) { failure = "STALE_SOURCE"; base = null; }
    }
    if (base) {
      binding = asBinding(await state.updateSourceBinding(projectId, binding.id, { baseRevisionId: base.revisionId }, binding.recordVersion));
      const branchName = workIntakeBranchName(intakeId);
      const existing = await source.branches();
      if (!existing.ok) failure = existing.error.code;
      else if (existing.result.branches.some(branch => branch.name === branchName)) {
        failure = "BRANCH_COLLISION"; inspectionRequired = true;
      } else {
        const stillCurrent = await source.resolveSourceRevision({ kind: "source-line", sourceLineId: binding.body.integrationTargetSourceLineId });
        if (!stillCurrent.ok || stillCurrent.result.revisionId !== base.revisionId) failure = "STALE_SOURCE";
        else {
        const created = await source.createWorkSource({ owner: { kind: "work-intake", workIntakeId: intakeId }, baseRevision: base });
        if (created.ok) line = created.result.sourceLine.sourceLineId;
        else { failure = created.error.code; inspectionRequired = created.error.mutationMayHaveOccurred; }
        }
      }
    }
    binding = line && base ? asBinding(await state.updateSourceBinding(projectId, binding.id,
      { preparationState: "ready", baseRevisionId: base.revisionId, workSourceLineId: line,
        currentRevisionId: base.revisionId, failureCode: undefined }, binding.recordVersion))
      : asBinding(await state.updateSourceBinding(projectId, binding.id,
        { preparationState: "blocked", failureCode: inspectionRequired && failure !== "BRANCH_COLLISION" ? "UNKNOWN_SOURCE_OUTCOME" : diagnostic(failure) }, binding.recordVersion));
    return captured(intake, binding);
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
    const repositoryId = await repositoryIdentity(store, projectId);
    const target = "dev";
    const created = await state.createWorkIntake(projectId, { request: input.workRequest.trim(), desiredOutcome: input.desiredOutcome.trim(),
      constraints: input.knownConstraints.trim() ? [input.knownConstraints.trim()] : [],
      evidenceContext: input.repositoryReviewContext.trim() ? [input.repositoryReviewContext.trim()] : [],
      requestedIntegrationTarget: target, hasExistingSourceOrPlanning: input.hasExistingSourceOrPlanning });
    intakeId = created.intake.id;
    await state.createSourceBinding(projectId, intakeId, { repositoryId, integrationTargetSourceLineId: target });
  } finally { store.close(); }
  return prepare(root, projectId, intakeId);
}

export async function retryStructuredWorkIntakeSource(root: string, projectId: string, intakeId: string): Promise<CapturedWorkIntake> {
  return prepare(root, projectId, intakeId);
}

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
