import type {EntityId, ProjectId, ProjectStateEntity} from "./domainContracts";
import type {ProjectStateReadPort} from "./projectStateStore";
import type {ProjectStateRelationship} from "./relationshipRegistry";

/** Exact workflow evidence, including membership edges and newly issued proof. */
export async function closeoutEvidence(reader: ProjectStateReadPort, projectId: ProjectId, workflowId: EntityId, excludedCycleId?: EntityId) {
  const all = await reader.listEntities(projectId);
  const edges = (await reader.listRelationships(projectId)).filter(edge => !edge.endedAt);
  const excluded = new Set([excludedCycleId, ...edges.filter(edge => edge.relationshipType === "governs" && edge.toEntityId === excludedCycleId).map(edge => edge.fromEntityId)]);
  const records = all.filter(record => !excluded.has(record.id) && record.entityType !== "Project" && record.entityType !== "WorkIntake" &&
    (record.entityType !== "Workflow" || record.id === workflowId) && (!("workflowId" in record.body) || record.body.workflowId === workflowId));
  const byId = new Map(records.map(record => [record.id, record]));
  const ids = new Set([workflowId, ...records.filter(record => "workflowId" in record.body && record.body.workflowId === workflowId).map(record => record.id)]);
  let prior = -1;
  while (prior !== ids.size) {
    prior = ids.size;
    for (const record of records) if (ids.has(record.id) && "layout" in record.body && "memberIds" in record.body.layout) {
      for (const id of record.body.layout.memberIds) if (byId.has(id)) ids.add(id);
    }
    for (const edge of edges) {
      if (["routes_to", "initiates", "relates_to"].includes(edge.relationshipType) || !byId.has(edge.fromEntityId) || !byId.has(edge.toEntityId)) continue;
      if (ids.has(edge.fromEntityId) || ids.has(edge.toEntityId)) {ids.add(edge.fromEntityId); ids.add(edge.toEntityId);}
    }
  }
  return {records: records.filter(record => ids.has(record.id)).sort((a, b) => a.id.localeCompare(b.id)),
    edges: edges.filter(edge => ids.has(edge.fromEntityId) && ids.has(edge.toEntityId)).sort((a, b) => a.id.localeCompare(b.id))};
}

export async function closeoutDigest(evidence: {records: ProjectStateEntity[]; edges: ProjectStateRelationship[]}, decision: string, rationale: string) {
  const value = JSON.stringify([decision, rationale, evidence.records.map(record => [record.id, record.recordVersion]),
    evidence.edges.map(edge => [edge.id, edge.fromEntityId, edge.relationshipType, edge.toEntityId])]);
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))), byte => byte.toString(16).padStart(2, "0")).join("");
}
