import fs from "node:fs";
import path from "node:path";
import type { CapturedWorkIntake, WorkIntakeProjection, WorkIntakeSubmission } from "../../shared/workIntakeContracts";
import type { SourceReadiness } from "../../shared/sourceLifecycleContracts";
import type { ProjectStateRecord } from "../../shared/projectState/domainContracts";
import { currentProjectRepositoryId } from "../projectState/currentProjectRegistrationService";
import { createProjectStateService } from "../../shared/projectState/projectStateService";
import { createSQLiteProjectStateStore } from "../projectState/sqliteProjectStateStore";

const principal = { principalId: "local-operator", principalType: "human" as const, role: "Operator" };
const diagnostic = (code: string) => code.replace(/[^A-Z0-9_-]/gi, "_").slice(0, 64) || "SOURCE_PREPARATION_FAILED";

function captured(intake: ProjectStateRecord<"WorkIntake">, repositoryId: string | null,
  checkpoints: ProjectStateRecord<"SourceCheckpoint">[] = []): CapturedWorkIntake {
  return { intakeId: intake.id, projectId: intake.projectId, workRequest: intake.body.request,
    desiredOutcome: intake.body.desiredOutcome, knownConstraints: intake.body.constraints[0] ?? "",
    repositoryReviewContext: intake.body.evidenceContext[0] ?? "", source: { state: "not-applicable", workIntakeId: intake.id },
    sourceCheckpoints: repositoryId ? checkpoints.map(item => ({ boundaryId: item.body.boundaryId, kind: item.body.checkpointKind,
      state: item.body.checkpointState,
      ...(item.body.resultingRevisionId ? { revision: { repositoryId,
        revisionId: item.body.resultingRevisionId } } : {}) })) : [] };
}

export async function getStructuredWorkIntakeProjection(root: string, projectId: string): Promise<WorkIntakeProjection> {
  const store = createSQLiteProjectStateStore(path.join(fs.realpathSync(root), ".champcity", "project-state.sqlite"));
  try {
    const project = await store.getProject(projectId);
    if (!project) throw Error("Selected structured Project is unavailable.");
    const repositoryId = await currentProjectRepositoryId(root);
    const intakes = (await store.listEntities(projectId, "WorkIntake"))
      .filter((item): item is ProjectStateRecord<"WorkIntake"> => item.entityType === "WorkIntake" && (item.lifecycleState === "active" || item.lifecycleState === "closed"))
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
    return { authority: "structured", project: { projectId, repositoryId, name: project.body.name }, suggestedProjectName: project.body.name,
      blockedReason: null,
      capturedIntakes: saved, currentCapturedIntake: saved[0] ?? null };
  } finally { store.close(); }
}

async function prepare(root: string, projectId: string, intakeId: string): Promise<CapturedWorkIntake> {
  const store = createSQLiteProjectStateStore(path.join(fs.realpathSync(root), ".champcity", "project-state.sqlite"));
  try {
    const intake = await store.getEntity(projectId, intakeId);
    if (intake?.entityType !== "WorkIntake") throw Error("Saved Work Intake is unavailable.");
    const repositoryId = await currentProjectRepositoryId(root);
    return captured(intake, repositoryId);
  } finally { store.close(); }
}

export async function captureStructuredWorkIntake(root: string, projectId: string, input: WorkIntakeSubmission): Promise<CapturedWorkIntake> {
  const fields = ["projectId", "projectName", "workRequest", "desiredOutcome", "knownConstraints", "hasExistingSourceOrPlanning", "repositoryReviewContext"];
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).some(key => !fields.includes(key)) ||
    input.projectId !== projectId || typeof input.projectName !== "string" || typeof input.workRequest !== "string" ||
    typeof input.desiredOutcome !== "string" || typeof input.knownConstraints !== "string" || typeof input.repositoryReviewContext !== "string" ||
    typeof input.hasExistingSourceOrPlanning !== "boolean" ||
    !input.projectName.trim() || !input.workRequest.trim() || !input.desiredOutcome.trim() ||
    [input.projectName, input.workRequest, input.desiredOutcome, input.knownConstraints, input.repositoryReviewContext]
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


/** Legacy generic-Work-Intake fallback; the WRB01 Project landing path registers SPS before entering Project Intake. */
