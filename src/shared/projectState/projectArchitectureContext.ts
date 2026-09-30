import type { ProjectStateEntity, ProjectStateRecord, ProjectId } from "./domainContracts";
import type { ProjectStateRelationship } from "./relationshipRegistry";

export type ProjectArchitectureContextRecord = ProjectStateRecord<"Decision"> | ProjectStateRecord<"BoundedSolution">;

/** Select only accepted semantics explicitly governed at Project or ProjectResource scope. */
export function selectProjectArchitectureContext(
  projectId: ProjectId,
  entities: readonly ProjectStateEntity[],
  relationships: readonly ProjectStateRelationship[],
): ProjectArchitectureContextRecord[] {
  const records = new Map(entities.map(record => [record.id, record]));
  const active = relationships.filter(edge => !edge.endedAt);
  const workflowOwnedIds = new Set(active.filter(edge => edge.relationshipType === "workflow_member").map(edge => edge.fromEntityId));
  const governed = new Map<string, string[]>();
  for (const edge of active) {
    if (edge.relationshipType !== "governs") continue;
    const targets = governed.get(edge.fromEntityId) ?? [];
    targets.push(edge.toEntityId);
    governed.set(edge.fromEntityId, targets);
  }
  const selected: ProjectArchitectureContextRecord[] = [];
  const acceptedDecisionIds = new Set<string>();
  for (const record of entities) {
    if (record.entityType !== "Decision" || record.lifecycleState !== "active" || !["accepted", "approved"].includes(record.body.outcome)) continue;
    const targetIds = governed.get(record.id) ?? [];
    const targets = targetIds.map(id => records.get(id));
    if (!targets.some(target => target?.entityType === "Project" && target.id === projectId || target?.entityType === "ProjectResource" && target.lifecycleState === "active")) continue;
    if (targets.some(target => !target || (target.entityType !== "Project" && target.entityType !== "ProjectResource" && target.entityType !== "BoundedSolution"))) continue;
    selected.push(record);
    acceptedDecisionIds.add(record.id);
  }
  for (const record of entities) {
    if (record.entityType !== "BoundedSolution" || record.lifecycleState !== "active" || workflowOwnedIds.has(record.id)) continue;
    if (active.some(edge => edge.relationshipType === "workflow_member" && edge.fromEntityId === record.id)) continue;
    if ([...acceptedDecisionIds].some(decisionId => (governed.get(decisionId) ?? []).includes(record.id))) selected.push(record);
  }
  return selected.sort((a, b) => a.entityType.localeCompare(b.entityType) || a.id.localeCompare(b.id));
}
