import {validateGreenfieldPhases} from "../../shared/projectState/greenfieldPhaseMapContracts";
import fs from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";
import {readIntakeAdapterSnapshot} from "../projectState/sqliteProjectStateStore";
import {selectedCurrentProjectId} from "../projectState/currentProjectRegistrationService";
import {readStructuredProjectPlanning} from "../projectPlanning/structuredProjectPlanningReadProjection";
import {exactVersionReviewDisposition} from "../../shared/projectState/workflowIntakeDisposition";
import type {ProjectStateRecord} from "../../shared/projectState/domainContracts";

export function readStructuredPhaseMap(root: string) {
  const canonical = fs.realpathSync(root), projectId = selectedCurrentProjectId(canonical), parent = readStructuredProjectPlanning(root);
  if (!projectId || parent?.disposition.state !== "approved") return null;
  const {records, relationships, outbox, originalMapMembers} = readIntakeAdapterSnapshot(path.join(canonical, ".champcity", "project-state.sqlite"), projectId);
  const cycles = records.filter((record): record is ProjectStateRecord<"PhaseMapReviewCycle"> => record.entityType === "PhaseMapReviewCycle" && record.lifecycleState === "active" && record.body.workflowId === parent.workflowId);
  if (cycles.length !== 1) return null;
  const cycle = cycles[0], disposition = exactVersionReviewDisposition(cycle, records, relationships, outbox, "phase-map-review", "phase-map-review");
  if (cycle.body.layout.sources.some(source => !records.some(record => record.id === source.entityId && record.recordVersion === source.recordVersion && record.lifecycleState === "active"))) return null;
  const owners = relationships.filter(edge => !edge.endedAt && edge.relationshipType === "phase_map_review_for" && edge.fromEntityId === cycle.id);
  if (owners.length !== 1 || owners[0].toEntityId !== parent.workflowId) return null;
  const members = cycle.body.layout.memberIds.map(id => (disposition.state === "approved" ? originalMapMembers : records).find(record => record.id === id));
  if (members.some(member => !member)) return null;
  const current = members.filter(member => !!member);
  if (createHash("sha256").update(JSON.stringify(current.map(member => [member.id, member.recordVersion]).sort((a,b) => String(a[0]).localeCompare(String(b[0]))))).digest("hex") !== cycle.body.semanticDigest) return null;
  const phaseRecords = current.filter((record): record is ProjectStateRecord<"Phase"> => record.entityType === "Phase");
  const phases = phaseRecords.map(record => ({phaseId: record.body.phaseKey!, title: record.body.title, order: record.body.sequence, purpose: record.body.objective, sourceReferences: record.body.sourceReferences ?? [], dependsOn: relationships.filter(edge => !edge.endedAt && edge.relationshipType === "depends_on" && edge.fromEntityId === record.id).map(edge => phaseRecords.find(phase => phase.id === edge.toEntityId)?.body.phaseKey ?? "missing")})).sort((a,b) => a.order-b.order);
  try {validateGreenfieldPhases(phases);} catch {return null;}
  const completedPhaseIds = phaseRecords.filter(record => records.some(live => live.id === record.id && live.entityType === "Phase" && live.body.phaseState === "closed")).map(record => record.body.phaseKey!);
  return {cycle, disposition, phases, completedPhaseIds};
}
