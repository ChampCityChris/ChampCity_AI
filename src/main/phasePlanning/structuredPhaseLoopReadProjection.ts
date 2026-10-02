import fs from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";
import {readIntakeAdapterSnapshot} from "../projectState/sqliteProjectStateStore";
import {selectedCurrentProjectId} from "../projectState/currentProjectRegistrationService";
import {readStructuredPhaseMap} from "../phaseMap/structuredPhaseMapReadProjection";
import {exactVersionReviewDisposition} from "../../shared/projectState/workflowIntakeDisposition";
import {renderPhaseLoop} from "../../shared/projectState/phaseLoopContracts";
import type {ProjectStateRecord} from "../../shared/projectState/domainContracts";

export function readStructuredPhaseLoop(root: string, phaseKey: string, stageKind: "interview" | "planning") {
  const projectId = selectedCurrentProjectId(root), map = readStructuredPhaseMap(root);
  if (!projectId || map?.disposition.state !== "approved") return null;
  const snapshot = readIntakeAdapterSnapshot(path.join(fs.realpathSync(root), ".champcity", "project-state.sqlite"), projectId);
  const {records, relationships, outbox, originalMapMembers} = snapshot;
  const phases = records.filter((record): record is ProjectStateRecord<"Phase"> => record.entityType === "Phase" && (record.id === phaseKey || record.body.phaseKey === phaseKey) && map.cycle.body.layout.memberIds.includes(record.id));
  if (phases.length !== 1) return null;
  const phase = phases[0];
  if (stageKind === "planning" && readStructuredPhaseLoop(root, phaseKey, "interview")?.disposition.state !== "approved") return null;
  const cycles = records.filter((record): record is ProjectStateRecord<"PhaseReviewCycle"> => record.entityType === "PhaseReviewCycle" && record.lifecycleState === "active" && record.body.workflowId === map.cycle.body.workflowId && record.body.phaseId === phase.id && record.body.stageKind === stageKind);
  if (cycles.length !== 1) return null;
  const cycle = cycles[0], edges = relationships.filter(edge => !edge.endedAt), disposition = exactVersionReviewDisposition(cycle, records, relationships, outbox, "phase-loop-review", "phase-loop-review");
  if (edges.filter(edge => edge.relationshipType === "phase_review_for" && edge.fromEntityId === cycle.id && edge.toEntityId === phase.id).length !== 1 || cycle.body.layout.sources.some(source => !records.some(record => record.id === source.entityId && (record.lifecycleState === "active" || record.entityType === "Phase" && record.lifecycleState === "closed") && (record.entityType === "Phase" || record.recordVersion === source.recordVersion)))) return null;
  if (cycle.body.layout.memberIds.some(id => !records.some(record => record.id === id && (record.lifecycleState === "active" || disposition.state === "approved" && record.entityType === "WorkItem" && record.lifecycleState === "closed" || disposition.state === "approved" && record.lifecycleState === "voided" && edges.some(edge => edge.relationshipType === "decomposed_into" && edge.fromEntityId === id || edge.relationshipType === "derived_from" && edge.toEntityId === id))))) return null;
  const members = cycle.body.layout.memberIds.map(id => (disposition.state === "approved" ? originalMapMembers : records).find(record => record.id === id));
  if (members.some(member => !member)) return null;
  const current = members.filter(member => !!member);
  const digest = createHash("sha256").update(JSON.stringify(current.map(member => [member.id, member.recordVersion]).sort((a,b) => String(a[0]).localeCompare(String(b[0]))))).digest("hex");
  if (digest !== cycle.body.semanticDigest) return null;
  const descendantIds = new Set([...cycle.body.layout.memberIds,...records.filter(record=>record.entityType==="WorkItem"&&record.body.candidateKey?.startsWith("phase_repair_")&&edges.some(edge=>edge.relationshipType==="part_of"&&edge.fromEntityId===record.id&&edge.toEntityId===phase.id)).map(record=>record.id)]);
  let changed = true;
  while (changed) {changed = false; for (const edge of edges) {const child = edge.relationshipType === "decomposed_into" && descendantIds.has(edge.fromEntityId) ? edge.toEntityId : edge.relationshipType === "repairs" && descendantIds.has(edge.toEntityId) ? edge.fromEntityId : null; if (child && !descendantIds.has(child)) {descendantIds.add(child); changed = true;}}}
  const workItems = records.filter((record): record is ProjectStateRecord<"WorkItem"> => record.entityType === "WorkItem" && ["active", "closed"].includes(record.lifecycleState) && descendantIds.has(record.id) && edges.some(edge => edge.relationshipType === "part_of" && edge.fromEntityId === record.id && edge.toEntityId === phase.id));
  const candidates = workItems.map(record => ({candidateId: record.id, order: record.body.planningOrder!, title: record.body.title, purpose: record.body.objective, dependsOn: edges.filter(edge => edge.relationshipType === "depends_on" && edge.fromEntityId === record.id).map(edge => edge.toEntityId), resolutionStatus: record.body.planningResolution!, resolutionReason: record.body.resolutionReason ?? "", evidencePaths: record.body.planningEvidence ?? [], carriedForwardToPhaseId: record.body.carriedForwardToPhaseId})).sort((a,b) => a.order-b.order);
  return {cycle, phase, disposition, members: current, workItems, candidates, markdown: renderPhaseLoop(cycle, current, edges)};
}
