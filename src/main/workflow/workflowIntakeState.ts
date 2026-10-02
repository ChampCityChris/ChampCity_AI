import { validateWorkflowIntakePayload } from "../../shared/workflowIntakeContracts";
import type { ProjectStateRecord } from "../../shared/projectState/domainContracts";
import type { ProjectStateStore } from "../../shared/projectState/projectStateStore";
import { createProjectStateService } from "../../shared/projectState/projectStateService";

export const intakeOperator = { principalId: "local-operator", principalType: "human" as const, role: "Operator" };

/** Reads only the exact SQL WorkflowIntake record; historical Markdown and legacy Findings are evidence, never Intake authority. */
export async function currentIntake(store: ProjectStateStore, projectId: string, workflow: ProjectStateRecord<"Workflow">) {
  const edges = (await store.listRelationships(projectId, "intake_for")).filter(edge => !edge.endedAt && edge.toEntityId === workflow.id);
  const records = (await store.listEntities(projectId, "WorkflowIntake")).filter((record): record is ProjectStateRecord<"WorkflowIntake"> =>
    record.entityType === "WorkflowIntake" && record.lifecycleState === "active" && (record.body.workflowId === workflow.id || edges.some(edge => edge.fromEntityId === record.id)));
  if (records.length > 1) throw Error("Structured Intake is ambiguous for this Workflow.");
  const record = records[0];
  if (!record) return null;
  if (record.body.workflowType !== workflow.body.workflowType) throw Error("Structured Intake type does not match its Workflow.");
  validateWorkflowIntakePayload({ workflowType: record.body.workflowType, values: record.body.values });
  await createProjectStateService(store, intakeOperator).getWorkflowIntakeDisposition(projectId, record.id);
  return record;
}