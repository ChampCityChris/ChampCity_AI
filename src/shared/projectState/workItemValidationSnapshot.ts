import type {ProjectStateReadPort} from "./projectStateStore";
import type {ProjectId, EntityId, ProjectStateRecord} from "./domainContracts";
import {closeoutDigest} from "./closeoutReviewSnapshot";

/** Aggregate review binds exact evidence; it never supplies criterion proof. */
export async function workItemValidationSnapshot(reader: ProjectStateReadPort, projectId: ProjectId, workflowId: EntityId, workItemId: EntityId) {
  const all = await reader.listEntities(projectId), edges = (await reader.listRelationships(projectId)).filter(edge => !edge.endedAt);
  const item = all.find(record => record.id === workItemId);
  const phaseIds = edges.filter(edge => edge.relationshipType === "part_of" && edge.fromEntityId === workItemId).map(edge => edge.toEntityId);
  const owned = phaseIds.includes(workflowId) || phaseIds.some(id => edges.some(edge => edge.relationshipType === "part_of" && edge.fromEntityId === id && edge.toEntityId === workflowId));
  if (item?.entityType !== "WorkItem" || !owned || !["validation_pending", "closed"].includes(item.body.workState)) throw Error("Exact Workflow WorkItem required.");
  const attempts = all.filter((record): record is ProjectStateRecord<"ImplementationAttempt"> => record.entityType === "ImplementationAttempt" && record.body.workflowId === workflowId && record.body.workItemId === workItemId && record.body.attemptState !== "abandoned").sort((a,b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  const attempt = attempts.at(-1), result = all.find(record => record.id === attempt?.body.implementationRecordId);
  const implementations = all.filter(record => record.entityType === "ImplementationRecord" && record.body.workItemId === workItemId).sort((a,b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  if (!attempt || attempt.body.attemptState !== "completed" || result?.entityType !== "ImplementationRecord" || result.body.workItemId !== workItemId || implementations.at(-1)?.id !== result.id || !edges.some(edge => edge.relationshipType === "attempt_result" && edge.fromEntityId === result.id && edge.toEntityId === attempt.id)) throw Error("Exact current completed ImplementationAttempt/result required.");
  const ids = new Set([workItemId, attempt.id, result.id]);
  const solutions = edges.filter(edge => edge.relationshipType === "implements" && edge.fromEntityId === workItemId).map(edge => edge.toEntityId);
  solutions.forEach(id => ids.add(id));
  for (const edge of edges) if (edge.relationshipType === "defines_criterion" && ids.has(edge.fromEntityId)) ids.add(edge.toEntityId);
  for (const record of all) {
    if (record.entityType === "TesterResult" && record.body.workflowId === workflowId && record.body.workItemId === workItemId && record.body.implementationRecordId === result.id ||
        record.entityType === "Validation" && ids.has(record.body.targetEntityId) ||
        record.entityType === "SourceBinding" && record.body.workflowId === workflowId ||
        record.entityType === "SourceCheckpoint" && record.body.workflowId === workflowId) ids.add(record.id);
  }
  for (const edge of edges) if (edge.relationshipType === "repairs" && (edge.toEntityId === workItemId || edge.fromEntityId === workItemId)) {ids.add(edge.fromEntityId); ids.add(edge.toEntityId);}
  for (const edge of edges) if (["governs", "supports"].includes(edge.relationshipType) && ids.has(edge.toEntityId)) ids.add(edge.fromEntityId);
  const records = all.filter(record => ids.has(record.id)).sort((a,b) => a.id.localeCompare(b.id));
  const evidence = {records, edges: edges.filter(edge => ids.has(edge.fromEntityId) && ids.has(edge.toEntityId)).sort((a,b) => a.id.localeCompare(b.id))};
  return {attempt, result, records, digest: await closeoutDigest(evidence, "work-item-validation", "")};
}
