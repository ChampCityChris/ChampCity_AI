import fs from "node:fs";
import path from "node:path";
import type { ProjectStateRecord } from "../../shared/projectState/domainContracts";
import type { WorkflowIntakeProjection } from "../../shared/workflowIntakeContracts";
import type { ProjectIntakeSubmission } from "../../shared/workspaceContracts";
import { workflowIntakeDisposition } from "../../shared/projectState/workflowIntakeDisposition";
import { readIntakeAdapterSnapshot } from "../projectState/sqliteProjectStateStore";
import { selectedCurrentProjectId } from "../projectState/currentProjectRegistrationService";
import { intakeReviewDocument } from "./workflowIntakeProjectionWriter";

/** Keeps synchronous Architect workspace projection code SQL-backed without reading generated files. */
export function readProjectCreationIntakeProjection(root: string): WorkflowIntakeProjection | null {
  const canonical = fs.realpathSync(root), projectId = selectedCurrentProjectId(canonical);
  if (!projectId) return null;
  const {records, relationships, outbox, originalIntakes} = readIntakeAdapterSnapshot(path.join(canonical, ".champcity", "project-state.sqlite"), projectId);
  const workflows = records.filter((record): record is ProjectStateRecord<"Workflow"> => record.entityType === "Workflow" && record.body.workflowType === "project-creation" && record.lifecycleState === "active" && record.body.workflowState === "active");
  if (!workflows.length) return null;
  if (workflows.length !== 1) throw Error("Exact active Project Creation Workflow is unavailable or ambiguous.");
  const workflow = workflows[0];
  const intakes = records.filter((record): record is ProjectStateRecord<"WorkflowIntake"> => record.entityType === "WorkflowIntake" && record.lifecycleState === "active" && record.body.workflowId === workflow.id && record.body.workflowType === "project-creation");
  if (!intakes.length) return {workflowType: "project-creation", values: null};
  if (intakes.length !== 1) throw Error("Project Creation Intake is ambiguous.");
  const record = intakes[0], ownership = relationships.filter(edge => edge.relationshipType === "intake_for" && edge.fromEntityId === record.id && !edge.endedAt);
  if (ownership.length !== 1 || ownership[0].toEntityId !== workflow.id) throw Error("Project Creation Intake ownership is inconsistent.");
  const disposition = workflowIntakeDisposition(record, records, relationships, outbox);
  return {workflowType: "project-creation", values: record.body.values as unknown as ProjectIntakeSubmission, intakeId: record.id,
    recordVersion: record.recordVersion, updatedAt: record.updatedAt, disposition, reviewDocument: intakeReviewDocument(workflow, record, disposition, originalIntakes.find(original => original.id === record.id) ?? record)};
}
