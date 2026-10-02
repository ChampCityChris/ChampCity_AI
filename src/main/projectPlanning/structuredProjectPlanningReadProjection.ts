import fs from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";
import {readIntakeAdapterSnapshot} from "../projectState/sqliteProjectStateStore";
import {selectedCurrentProjectId} from "../projectState/currentProjectRegistrationService";
import {readApprovedGreenfieldArchitectProjection} from "../architectOutputs/structuredArchitectReadProjection";
import {exactVersionReviewDisposition} from "../../shared/projectState/workflowIntakeDisposition";
import {renderProjectPlanningReview} from "../../shared/projectState/projectPlanningReviewContracts";
import type {ProjectStateRecord} from "../../shared/projectState/domainContracts";

/** Synchronous legacy consumers read SQL; files never determine review state. */
export function readStructuredProjectPlanning(root: string) {
  const canonical = fs.realpathSync(root), projectId = selectedCurrentProjectId(canonical);
  if (!projectId || !readApprovedGreenfieldArchitectProjection(root)) return null;
  const {records, relationships, outbox} = readIntakeAdapterSnapshot(path.join(canonical, ".champcity", "project-state.sqlite"), projectId);
  const workflows = records.filter((item): item is ProjectStateRecord<"Workflow"> => item.entityType === "Workflow" && item.lifecycleState === "active" && item.body.workflowType === "project-creation" && item.body.workflowState === "active");
  if (workflows.length !== 1) return null;
  const cycles = records.filter((item): item is ProjectStateRecord<"ProjectPlanningReviewCycle"> => item.entityType === "ProjectPlanningReviewCycle" && item.lifecycleState === "active" && item.body.workflowId === workflows[0].id);
  if (cycles.length !== 1) return null;
  const cycle = cycles[0], owners = relationships.filter(edge => !edge.endedAt && edge.relationshipType === "project_planning_review_for" && edge.fromEntityId === cycle.id);
  if (owners.length !== 1 || owners[0].toEntityId !== workflows[0].id || cycle.body.layout.sources.some(source => !records.some(record => record.id === source.entityId && record.recordVersion === source.recordVersion && record.lifecycleState === "active"))) return null;
  const members = cycle.body.layout.memberIds.map(id => records.find(record => record.id === id));
  if (members.some(member => !member || member.lifecycleState !== "active")) return null;
  const current = members.filter(member => !!member);
  const digest = createHash("sha256").update(JSON.stringify(current.map(member => [member.id, member.recordVersion]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))))).digest("hex");
  if (digest !== cycle.body.semanticDigest) return null;
  return renderProjectPlanningReview(cycle, current, exactVersionReviewDisposition(cycle, records, relationships, outbox, "project-planning-review", "project-planning-review"));
}
