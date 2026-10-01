import type { ProjectStateRecord } from "./domainContracts";
import type { ProjectStateRelationship } from "./relationshipRegistry";
import type { ProjectStateOutboxEvent } from "./projectStateStore";
import type { DispositionState } from "./domainContracts";
import type { EffectiveDisposition } from "./projectStateService";

export function workflowIntakeDisposition(intake: ProjectStateRecord<"WorkflowIntake">, records: ProjectStateRecord[],
  relationships: ProjectStateRelationship[], outbox: ProjectStateOutboxEvent[]): EffectiveDisposition {
  return exactVersionReviewDisposition(intake, records, relationships, outbox, "workflow-intake-review", "workflow-intake");
}

export function exactVersionReviewDisposition(target: {id: string; recordVersion: number}, records: ProjectStateRecord[],
  relationships: ProjectStateRelationship[], outbox: ProjectStateOutboxEvent[], decisionType: string, scopePrefix: string): EffectiveDisposition {
  const ids = new Set(relationships.filter(edge => edge.relationshipType === "governs" && edge.toEntityId === target.id && !edge.endedAt).map(edge => edge.fromEntityId));
  const sequence = new Map(outbox.filter(event => event.entityId && event.payload.operation === "create").map(event => [event.entityId!, event.sequence]));
  const now = new Date().toISOString();
  const decisions = records.filter((record): record is ProjectStateRecord<"Decision"> => record.entityType === "Decision")
    .filter(record => ids.has(record.id) && record.lifecycleState === "active" && record.body.decisionType === decisionType &&
      record.body.decisionScope === `${scopePrefix}:${target.id}@${target.recordVersion}` && record.body.decidedBy.principalType === "human" &&
      record.body.decisionRole === "Operator" && ["approved", "revision_requested", "rejected"].includes(record.body.outcome) && record.body.effectiveAt <= now)
    .sort((a, b) => a.body.effectiveAt.localeCompare(b.body.effectiveAt) || (sequence.get(a.id) ?? 0) - (sequence.get(b.id) ?? 0) || a.id.localeCompare(b.id));
  const decision = decisions.at(-1);
  return decision ? {state: decision.body.outcome as DispositionState, decisionId: decision.id, effectiveAt: decision.body.effectiveAt}
    : {state: "none", decisionId: null, effectiveAt: null};
}
