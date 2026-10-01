import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { readIntakeAdapterSnapshot } from "../projectState/sqliteProjectStateStore";
import { selectedCurrentProjectId } from "../projectState/currentProjectRegistrationService";
import { exactVersionReviewDisposition, workflowIntakeDisposition } from "../../shared/projectState/workflowIntakeDisposition";
import { renderArchitectReviewProjection } from "../../shared/projectState/architectReviewContracts";
import { architectReviewDocument } from "./architectReviewProjectionWriter";
import type { ProjectStateRecord } from "../../shared/projectState/domainContracts";

/** SQL-only bridge for synchronous legacy Planning. No generated/historical file is read. */
export function readApprovedGreenfieldArchitectProjection(root: string) {
  const canonical = fs.realpathSync(root), projectId = selectedCurrentProjectId(canonical);
  if (!projectId) return null;
  const {records, relationships, outbox} = readIntakeAdapterSnapshot(path.join(canonical, ".champcity", "project-state.sqlite"), projectId);
  const workflows = records.filter((record): record is ProjectStateRecord<"Workflow"> => record.entityType === "Workflow" && record.lifecycleState === "active" && record.body.workflowType === "project-creation" && record.body.workflowState === "active");
  if (workflows.length !== 1) return null;
  const workflow = workflows[0];
  const cycles = records.filter((record): record is ProjectStateRecord<"ArchitectReviewCycle"> => record.entityType === "ArchitectReviewCycle" && record.lifecycleState === "active" && record.body.workflowId === workflow.id && record.body.stageKind === "project-interview");
  if (cycles.length !== 1) return null;
  const cycle = cycles[0], owners = relationships.filter(edge => !edge.endedAt && edge.relationshipType === "architect_review_for" && edge.fromEntityId === cycle.id);
  if (owners.length !== 1 || owners[0].toEntityId !== workflow.id) return null;
  const ids = relationships.filter(edge => !edge.endedAt && edge.relationshipType === "review_member" && edge.toEntityId === cycle.id).map(edge => edge.fromEntityId);
  const members = ids.map(id => records.find(record => record.id === id));
  if (!members.length || members.some(member => !member || member.lifecycleState !== "active")) return null;
  const currentMembers = members.filter(member => !!member);
  const digest = createHash("sha256").update(JSON.stringify(currentMembers.map(member => [member.id, member.recordVersion]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))))).digest("hex");
  if (digest !== cycle.body.semanticDigest) return null;
  const intakes = records.filter((record): record is ProjectStateRecord<"WorkflowIntake"> => record.entityType === "WorkflowIntake" && record.lifecycleState === "active" && record.body.workflowId === workflow.id);
  if (intakes.length !== 1 || workflowIntakeDisposition(intakes[0], records, relationships, outbox).state !== "approved") return null;
  const sources = currentMembers.filter(member => member.entityType === "Evidence" && member.body.evidenceType === "architect-intake-source");
  if (sources.length !== 1 || sources[0].entityType !== "Evidence" || sources[0].body.payloadRef !== `project-state:${intakes[0].id}@${intakes[0].recordVersion}`) return null;
  const disposition = exactVersionReviewDisposition(cycle, records, relationships, outbox, "architect-review", "architect-review");
  if (disposition.state !== "approved") return null;
  return architectReviewDocument(renderArchitectReviewProjection(cycle, currentMembers, disposition));
}
