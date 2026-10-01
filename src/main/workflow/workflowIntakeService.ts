import fs from "node:fs";
import path from "node:path";
import { isIntakeWorkflowType, validateWorkflowIntakePayload, WORKFLOW_INTAKE_DEFINITIONS, type WorkflowIntakePayload, type WorkflowIntakeProjection } from "../../shared/workflowIntakeContracts";
import { WORKFLOW_TYPE_REGISTRY } from "../../shared/projectState/workflowTypeRegistry";
import { createProjectStateService } from "../../shared/projectState/projectStateService";
import type { ProjectStateStore } from "../../shared/projectState/projectStateStore";
import type { ProjectStateRecord } from "../../shared/projectState/domainContracts";
import { createSQLiteProjectStateStore } from "../projectState/sqliteProjectStateStore";
import { selectedCurrentProjectId } from "../projectState/currentProjectRegistrationService";
import { createFeaturePlanningService } from "../featurePlanning/featurePlanningService";
import { createIssuePlanningService } from "../issuePlanning/issuePlanningService";

const operator = { principalId: "local-operator", principalType: "human" as const, role: "Operator" };
export function createWorkflowIntakeService(dependencies: { openStore?: (databasePath: string) => ProjectStateStore & { close(): void } } = {}) {
  const openStore = dependencies.openStore ?? createSQLiteProjectStateStore;
  const feature = createFeaturePlanningService({ openStore });
  const issue = createIssuePlanningService({ openStore });
  async function withWorkflow<T>(root: string, id: string, work: (store: ProjectStateStore, projectId: string, workflow: ProjectStateRecord<"Workflow">) => Promise<T>) {
    if (typeof id !== "string" || !id.trim() || id.length > 128) throw Error("Exact Workflow ID is required.");
    const canonical = fs.realpathSync(root), projectId = selectedCurrentProjectId(canonical);
    if (!projectId) throw Error("Selected Project is not registered.");
    const store = openStore(path.join(canonical, ".champcity", "project-state.sqlite"));
    try {
      const workflow = await store.getEntity(projectId, id);
      if (!workflow || workflow.entityType !== "Workflow" || workflow.lifecycleState !== "active" || !isIntakeWorkflowType(workflow.body.workflowType))
        throw Error("Exact active intake Workflow is unavailable.");
      return await work(store, projectId, workflow);
    } finally { store.close(); }
  }
  async function findings(store: ProjectStateStore, projectId: string, id: string) {
    const links = await store.listRelationships(projectId);
    return (await store.listEntities(projectId, "Finding")).filter((record): record is ProjectStateRecord<"Finding"> => record.entityType === "Finding" &&
      links.some(edge => edge.relationshipType === "workflow_member" && edge.fromEntityId === record.id && edge.toEntityId === id && !edge.endedAt));
  }
  async function getWorkflowIntake(root: string, id: string): Promise<WorkflowIntakeProjection> {
    return withWorkflow(root, id, async (store, projectId, workflow) => {
      const workflowType = workflow.body.workflowType;
      if (!isIntakeWorkflowType(workflowType)) throw Error("Unsupported intake Workflow.");
      if (workflowType === "feature-capability") return { workflowType, values: (await feature.get(root, id)).intake };
      if (workflowType === "issue-resolution") return { workflowType, values: (await issue.get(root, id)).intake };
      const records = await findings(store, projectId, id);
      const values: Record<string, string> = {};
      let saved = false;
      for (const field of WORKFLOW_INTAKE_DEFINITIONS[workflowType].fields) {
        const matches = records.filter(record => record.body.category === `workflow-intake:${workflowType}:${field.key}`);
        if (matches.length > 1) throw Error("Ambiguous exact Workflow intake field.");
        if (matches.length) saved = true;
        if (matches[0]?.body.findingState === "current") values[field.key] = matches[0].body.statement;
      }
      return { workflowType, values: saved ? values : null } as WorkflowIntakeProjection;
    });
  }
  async function saveWorkflowIntake(root: string, id: string, payload: WorkflowIntakePayload): Promise<WorkflowIntakeProjection> {
    validateWorkflowIntakePayload(payload);
    await withWorkflow(root, id, async (store, projectId, workflow) => {
      const workflowType = payload.workflowType;
      if (workflow.body.workflowType !== workflowType || workflow.body.currentWorkspace !== WORKFLOW_TYPE_REGISTRY[workflowType].entryWorkspace)
        throw Error("Intake requires the exact Workflow type and entry workspace.");
      if (payload.workflowType === "feature-capability") { await feature.saveIntake(root, id, payload.values); return; }
      if (payload.workflowType === "issue-resolution") { await issue.saveIntake(root, id, payload.values); return; }
      const state = createProjectStateService(store, operator), records = await findings(store, projectId, id);
      const fields = WORKFLOW_INTAKE_DEFINITIONS[workflowType].fields;
      for (const field of fields) {
        if (records.filter(record => record.body.category === `workflow-intake:${workflowType}:${field.key}`).length > 1)
          throw Error("Ambiguous exact Workflow intake field.");
      }
      for (const field of fields) {
        const category = `workflow-intake:${workflowType}:${field.key}`;
        const existing = records.find(record => record.body.category === category);
        const value = (payload.values as unknown as Record<string, string>)[field.key]?.trim() ?? "";
        if (!value && !existing) continue;
        const body = { title: field.label, statement: value || "Optional intake field omitted by Operator.", category,
          impact: `${WORKFLOW_TYPE_REGISTRY[workflowType].label} intake context`, observedAt: new Date().toISOString(), findingState: value ? "current" as const : "omitted" as const };
        if (existing) await state.reviseRecord(projectId, existing.id, body, existing.recordVersion);
        else { const record = await state.createRecord(projectId, "Finding", body); await state.createRelationship(projectId, record.id, "workflow_member", id); }
      }
    });
    return getWorkflowIntake(root, id);
  }
  return { getWorkflowIntake, saveWorkflowIntake };
}
