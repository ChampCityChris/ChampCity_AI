import fs from "node:fs";
import path from "node:path";
import { isIntakeWorkflowType, validateWorkflowIntakePayload, type WorkflowIntakePayload, type WorkflowIntakeProjection } from "../../shared/workflowIntakeContracts";
import { WORKFLOW_TYPE_REGISTRY } from "../../shared/projectState/workflowTypeRegistry";
import { createProjectStateService, type WorkflowIntakeDecisionInput } from "../../shared/projectState/projectStateService";
import type { ProjectStateStore } from "../../shared/projectState/projectStateStore";
import type { ProjectStateRecord } from "../../shared/projectState/domainContracts";
import { createSQLiteProjectStateStore } from "../projectState/sqliteProjectStateStore";
import { selectedCurrentProjectId } from "../projectState/currentProjectRegistrationService";
import { currentIntake, ensureIntake, previewIntakeMigration, intakeOperator } from "./workflowIntakeMigration";
import type { ProjectIntakeSubmission } from "../../shared/workspaceContracts";

export function createWorkflowIntakeService(dependencies: { openStore?: (databasePath: string) => ProjectStateStore & { close(): void } } = {}) {
  const openStore = dependencies.openStore ?? createSQLiteProjectStateStore;
  async function withWorkflow<T>(root: string, id: string, work: (store: ProjectStateStore, projectId: string, workflow: ProjectStateRecord<"Workflow">) => Promise<T>) {
    if (typeof id !== "string" || !id.trim() || id.length > 128) throw Error("Exact Workflow ID is required.");
    const canonical = fs.realpathSync(root), projectId = selectedCurrentProjectId(canonical);
    if (!projectId) throw Error("Selected Project is not registered.");
    const store = openStore(path.join(canonical, ".champcity", "project-state.sqlite"));
    try {
      const workflow = await store.getEntity(projectId, id);
      if (!workflow || workflow.entityType !== "Workflow" || workflow.lifecycleState !== "active" || workflow.body.workflowState !== "active" || !isIntakeWorkflowType(workflow.body.workflowType)) throw Error("Exact active intake Workflow is unavailable.");
      return await work(store, projectId, workflow);
    } finally { store.close(); }
  }
  async function projection(store: ProjectStateStore, projectId: string, workflow: ProjectStateRecord<"Workflow">, record: ProjectStateRecord<"WorkflowIntake"> | null): Promise<WorkflowIntakeProjection> {
    return {workflowType: workflow.body.workflowType, values: record?.body.values ?? null, ...(record ? {intakeId: record.id, recordVersion: record.recordVersion, updatedAt: record.updatedAt, disposition: await createProjectStateService(store, intakeOperator).getWorkflowIntakeDisposition(projectId, record.id)} : {})} as WorkflowIntakeProjection;
  }
  const getWorkflowIntake = (root: string, id: string) => withWorkflow(root, id, async (store, projectId, workflow) => projection(store, projectId, workflow, await currentIntake(store, projectId, workflow)));
  const ensureWorkflowIntake = (root: string, id: string) => withWorkflow(root, id, async (store, projectId, workflow) => projection(store, projectId, workflow, await ensureIntake(root, store, projectId, workflow)));
  const previewWorkflowIntakeMigration = (root: string, id: string) => withWorkflow(root, id, (store, projectId, workflow) => previewIntakeMigration(root, store, projectId, workflow));
  async function saveWorkflowIntake(root: string, id: string, payload: WorkflowIntakePayload, expectedIntakeRecordVersion?: number) {
    validateWorkflowIntakePayload(payload);
    return withWorkflow(root, id, async (store, projectId, workflow) => {
      if (workflow.body.workflowType !== payload.workflowType || workflow.body.currentWorkspace !== WORKFLOW_TYPE_REGISTRY[payload.workflowType].entryWorkspace) throw Error("Intake requires the exact Workflow type and entry workspace.");
      const current = await ensureIntake(root, store, projectId, workflow);
      const record = await createProjectStateService(store, intakeOperator).saveWorkflowIntake(projectId, {workflowId: id, workflowType: payload.workflowType, values: Object.fromEntries(Object.entries(payload.values).filter(([, value]) => typeof value !== "string" || value.trim()).map(([key, value]) => [key, typeof value === "string" ? value.trim() : value])), expectedIntakeRecordVersion: expectedIntakeRecordVersion ?? current?.recordVersion});
      return projection(store, projectId, workflow, record);
    });
  }
  async function reviewWorkflowIntake(root: string, id: string, input: WorkflowIntakeDecisionInput) {
    return withWorkflow(root, id, async (store, projectId, workflow) => {
      const record = await ensureIntake(root, store, projectId, workflow); if (!record) throw Error("Save Intake before review.");
      await createProjectStateService(store, intakeOperator).recordWorkflowIntakeDecision(projectId, record.id, input);
      return projection(store, projectId, workflow, record);
    });
  }
  async function saveProjectCreationIntake(root: string, id: string, submission: ProjectIntakeSubmission, expectedIntakeRecordVersion?: number) {
    const canonical = fs.realpathSync(root); fs.accessSync(canonical, fs.constants.R_OK | fs.constants.W_OK);
    return saveWorkflowIntake(canonical, id, {workflowType: "project-creation", values: {...submission, projectRepository: canonical}}, expectedIntakeRecordVersion);
  }
  return {getWorkflowIntake, saveWorkflowIntake, ensureWorkflowIntake, previewWorkflowIntakeMigration, applyWorkflowIntakeMigration: ensureWorkflowIntake, reviewWorkflowIntake, saveProjectCreationIntake};
}
