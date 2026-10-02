import fs from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";
import {readIntakeAdapterSnapshot} from "../projectState/sqliteProjectStateStore";
import {selectedCurrentProjectId} from "../projectState/currentProjectRegistrationService";
import {readStructuredPhaseMap} from "../phaseMap/structuredPhaseMapReadProjection";
import {exactVersionReviewDisposition} from "../../shared/projectState/workflowIntakeDisposition";
import {renderPhaseLoop} from "../../shared/projectState/phaseLoopContracts";
import type {ProjectStateRecord} from "../../shared/projectState/domainContracts";
import type {WorkCardMapProjection, WorkCardIntakeProjection} from "../../shared/workspaceContracts";

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
  if (edges.filter(edge => edge.relationshipType === "phase_review_for" && edge.fromEntityId === cycle.id && edge.toEntityId === phase.id).length !== 1 || cycle.body.layout.sources.some(source => !records.some(record => record.id === source.entityId && record.lifecycleState === "active" && (record.entityType === "Phase" || record.recordVersion === source.recordVersion)))) return null;
  if (cycle.body.layout.memberIds.some(id => !records.some(record => record.id === id && record.lifecycleState === "active"))) return null;
  const members = cycle.body.layout.memberIds.map(id => (disposition.state === "approved" ? originalMapMembers : records).find(record => record.id === id));
  if (members.some(member => !member)) return null;
  const current = members.filter(member => !!member);
  const digest = createHash("sha256").update(JSON.stringify(current.map(member => [member.id, member.recordVersion]).sort((a,b) => String(a[0]).localeCompare(String(b[0]))))).digest("hex");
  if (digest !== cycle.body.semanticDigest) return null;
  const workItems = records.filter((record): record is ProjectStateRecord<"WorkItem"> => record.entityType === "WorkItem" && cycle.body.layout.memberIds.includes(record.id));
  const candidates = workItems.map(record => ({candidateId: record.id, order: record.body.planningOrder!, title: record.body.title, purpose: record.body.objective, dependsOn: edges.filter(edge => edge.relationshipType === "depends_on" && edge.fromEntityId === record.id).map(edge => edge.toEntityId), resolutionStatus: record.body.planningResolution!, resolutionReason: record.body.resolutionReason ?? "", evidencePaths: record.body.planningEvidence ?? [], carriedForwardToPhaseId: record.body.carriedForwardToPhaseId})).sort((a,b) => a.order-b.order);
  return {cycle, phase, disposition, members: current, workItems, candidates, markdown: renderPhaseLoop(cycle, current, edges)};
}

export function structuredWorkCardMap(root: string, phaseKey: string): WorkCardMapProjection {
  const review = readStructuredPhaseLoop(root, phaseKey, "planning");
  if (review?.disposition.state !== "approved") return {state: "needs-attention", phaseId: phaseKey, candidates: [], phaseValidationWorkspaceId: "phase-validation", reason: "Approve the current exact SQL Phase Planning review."};
  const active = review.workItems.filter(work => work.body.planningPreparedAt && !["closed", "cancelled"].includes(work.body.workState));
  const candidates = review.candidates.map(candidate => {
    const work = review.workItems.find(work => work.id === candidate.candidateId)!;
    const complete = work.body.workState === "closed", dependencyReady = candidate.dependsOn.every(id => review.workItems.some(work => work.id === id && work.body.workState === "closed"));
    const eligible = work.body.workState === "ready" && candidate.resolutionStatus === "planned" && dependencyReady && !active.some(work => work.id !== candidate.candidateId);
    return {...candidate, status: complete ? "Complete" as const : eligible ? "Eligible" as const : "Ineligible" as const, isActive: active.length === 1 && active[0].id === work.id, reason: complete ? "Closed by SQL lifecycle." : eligible ? "Accepted SQL WorkItem; dependencies complete." : candidate.resolutionStatus !== "planned" ? `${candidate.resolutionStatus}: ${candidate.resolutionReason}` : "Waiting on SQL dependency or selected WorkItem.", handoffMarkdownPath: `planning/derived/work-items/${work.id}/intake.md`, formalWorkCardMarkdownPath: `planning/work-items/${work.id}/Work_Card.md`};
  });
  return {state: active.length > 1 ? "needs-attention" : candidates.every(candidate => candidate.status === "Complete") ? "all-complete" : "ready", phaseId: review.phase.body.phaseKey ?? review.phase.id, sourceWorkCardPlanPath: `planning/phase-reviews/${review.cycle.id}/Work_Card_Plan.md`, candidates, phaseValidationWorkspaceId: "phase-validation", reason: active.length > 1 ? "Conflicting SQL WorkItem preparations." : "Work Card Map reads accepted SQL WorkItems and live lifecycle state."};
}

export function structuredWorkCardIntake(root: string, phaseKey: string, candidateId?: string): WorkCardIntakeProjection & {handoffInstruction: string; workItemId: string; reviewCycleId: string} {
  const review = readStructuredPhaseLoop(root, phaseKey, "planning"), map = structuredWorkCardMap(root, phaseKey);
  const selection = map.candidates.find(candidate => candidate.candidateId === candidateId) ?? (!candidateId ? map.candidates.find(candidate => candidate.isActive) ?? map.candidates.find(candidate => candidate.status === "Eligible") : undefined);
  if (!review || !selection || selection.status !== "Eligible" || map.state === "needs-attention") throw Error("Exact eligible SQL WorkItem required for derived Intake.");
  const candidate = review.candidates.find(candidate => candidate.candidateId === selection.candidateId)!;
  const handoffInstruction = `# Work Card preparation\n\nExact SQL WorkItem ${selection.candidateId}; Phase ${review.phase.id}; Plan review ${review.cycle.id}@${review.cycle.recordVersion}\n\n${selection.title}\n${selection.purpose}\n\nDependencies: ${candidate.dependsOn.join(", ")}\n\n${review.markdown}\n\nPrepare the existing WorkItem. Do not create another identity or canonical Intake record.`;
  return {phaseId: review.phase.body.phaseKey ?? review.phase.id, candidate, selectionReason: selection.reason, sourceWorkCardPlanPath: map.sourceWorkCardPlanPath!, handoffMarkdownPath: selection.handoffMarkdownPath, formalWorkCardMarkdownPath: selection.formalWorkCardMarkdownPath, workItemId: selection.candidateId, reviewCycleId: review.cycle.id, handoffInstruction};
}
