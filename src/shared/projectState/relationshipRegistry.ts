import type { EntityId, EntityType, PrincipalRef, ProjectId, ProjectStateEntity, RelationshipId } from "./domainContracts";
import { ProjectStateDomainError } from "./entityTypeRegistry";

export interface ProjectStateRelationship {
  id: RelationshipId;
  projectId: ProjectId;
  fromEntityId: EntityId;
  relationshipType: RelationshipType;
  toEntityId: EntityId;
  createdAt: string;
  createdBy: PrincipalRef;
  endedAt?: string;
}

interface RelationshipDefinition {
  from: readonly EntityType[];
  to: readonly EntityType[];
  immutableProvenance: boolean;
}

const all: readonly EntityType[] = ["Project", "ProjectResource", "WorkIntake", "RouteAssessment", "Workflow", "SourceBaseline", "Phase", "Finding", "RootCause", "BoundedSolution", "Criterion", "WorkItem", "ImplementationRecord", "Validation", "Evidence", "Decision", "RegressionObligation", "SourceBinding", "SourceCheckpoint", "IntegrationRecord"];
const nonProject = all.filter(type => type !== "Project");
const rule = (from: readonly EntityType[], to: readonly EntityType[], immutableProvenance = false): RelationshipDefinition => ({ from, to, immutableProvenance });

/** Direction and endpoint type are explicit; no runtime predicate registration exists. */
export const RELATIONSHIP_REGISTRY = Object.freeze({
  addresses: rule(["BoundedSolution"], ["RootCause", "Finding"]),
  assesses_route: rule(["RouteAssessment"], ["WorkIntake"], true),
  baselines_source: rule(["SourceBaseline"], ["Workflow"], true),
  binds_source: rule(["SourceBinding"], ["Workflow"], true),
  blocks: rule(nonProject, nonProject),
  checkpoints: rule(["SourceCheckpoint"], ["SourceBinding", "WorkIntake", "WorkItem", "ImplementationRecord"], true),
  defines_criterion: rule(["BoundedSolution", "WorkItem", "Phase"], ["Criterion"]),
  depends_on: rule(["WorkItem"], ["WorkItem"]),
  derived_from: rule(nonProject, nonProject, true),
  evaluates: rule(["Validation"], ["Criterion", "WorkItem", "BoundedSolution", "RegressionObligation", "ProjectResource", "IntegrationRecord"], true),
  explains: rule(["RootCause"], ["Finding"], true),
  governs: rule(["Decision"], all, true),
  implements: rule(["WorkItem"], ["BoundedSolution"]),
  implements_work_item: rule(["ImplementationRecord"], ["WorkItem"], true),
  initiates: rule(["WorkIntake"], ["Workflow"], true),
  integrates: rule(["IntegrationRecord"], ["WorkIntake", "SourceBinding", "WorkItem", "ImplementationRecord"], true),
  part_of: rule(["WorkItem", "Phase"], ["WorkItem", "Phase", "Workflow"]),
  proves: rule(["ProjectResource"], ["RegressionObligation"], true),
  relates_to: rule(all, all),
  repairs: rule(["WorkItem"], ["WorkItem"], true),
  routes_to: rule(["Workflow"], ["Workflow"], true),
  supersedes: rule(nonProject, nonProject, true),
  supports: rule(["Evidence"], all, true),
});

export type RelationshipType = keyof typeof RELATIONSHIP_REGISTRY;
export class RelationshipDomainError extends ProjectStateDomainError {
  override readonly code: string = "INVALID_RELATIONSHIP";
  constructor(message: string) { super(message); this.name = "RelationshipDomainError"; }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function fail(message: string): never { throw new RelationshipDomainError(message); }

export function validateRelationship(
  relationship: ProjectStateRelationship,
  lookup: (id: EntityId) => ProjectStateEntity | undefined,
): ProjectStateRelationship {
  if (!relationship || typeof relationship !== "object" || Array.isArray(relationship)) fail("A relationship record is required.");
  const allowed = new Set(["id", "projectId", "fromEntityId", "relationshipType", "toEntityId", "createdAt", "createdBy", "endedAt"]);
  for (const field of Object.keys(relationship)) if (!allowed.has(field)) fail(`Unsupported relationship field: ${field}.`);
  for (const field of ["id", "projectId", "fromEntityId", "toEntityId"] as const) if (!UUID.test(relationship[field])) fail(`Invalid relationship ${field}.`);
  if (relationship.fromEntityId === relationship.toEntityId) fail("A relationship cannot point to itself.");
  if (!Object.hasOwn(RELATIONSHIP_REGISTRY, relationship.relationshipType)) fail("Unregistered relationship predicate.");
  const definition = RELATIONSHIP_REGISTRY[relationship.relationshipType];
  const from = lookup(relationship.fromEntityId);
  const to = lookup(relationship.toEntityId);
  if (!from || !to) fail("Relationship endpoint does not exist.");
  if (from.projectId !== relationship.projectId || to.projectId !== relationship.projectId) fail("Relationship endpoints must belong to one Project.");
  if (!definition.from.includes(from.entityType) || !definition.to.includes(to.entityType)) fail("Relationship direction or endpoint type is invalid.");
  if (relationship.relationshipType === "part_of" && from.entityType === "Phase" && to.entityType !== "Workflow") fail("Phase membership must target a Workflow.");
  if (relationship.relationshipType === "routes_to" && (from.entityType !== "Workflow" || to.entityType !== "Workflow" || from.body.workflowType !== "work-intake-routing" || to.body.workflowType === "work-intake-routing")) fail("routes_to requires a Work Intake routing Workflow source and a non-routing Workflow target.");
  if (relationship.relationshipType === "baselines_source" && (to.entityType !== "Workflow" || to.body.workflowType === "work-intake-routing")) fail("baselines_source requires a substantive Workflow target.");
  if (relationship.relationshipType === "baselines_source" && from.entityType === "SourceBaseline" && from.body.workflowId !== to.id) fail("SourceBaseline body Workflow must match its provenance endpoint.");
  if (relationship.relationshipType === "binds_source") {
    if (to.entityType !== "Workflow" || to.body.workflowType === "work-intake-routing" || from.entityType !== "SourceBinding" || from.body.workflowId !== to.id) fail("binds_source requires a matching substantive Workflow owner.");
    const baseline = lookup(from.body.sourceBaselineId);
    const baselineWorkflow = baseline?.entityType === "SourceBaseline" ? lookup(baseline.body.workflowId) : undefined;
    if (baseline?.entityType !== "SourceBaseline" || baselineWorkflow?.entityType !== "Workflow" || baselineWorkflow.lineageId !== to.lineageId) fail("binds_source requires a SourceBaseline owned by the same Workflow lineage.");
  }
  if (relationship.relationshipType === "derived_from" && from.lineageId === to.lineageId) fail("Derivation must retain a distinct lineage.");
  if (relationship.relationshipType === "supersedes") {
    if (from.entityType !== to.entityType || from.lineageId !== to.lineageId) fail("Supersession requires one entity type and shared lineage.");
    if (from.recordVersion !== 1 || from.lifecycleState !== "active") fail("Supersession successor must be a new active entity.");
    if (to.lifecycleState !== "superseded") fail("Superseded predecessor must be retained in its terminal state.");
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(relationship.createdAt) || !Number.isFinite(Date.parse(relationship.createdAt)) || new Date(relationship.createdAt).toISOString() !== relationship.createdAt) fail("Relationship time must be canonical UTC.");
  if (!relationship.createdBy || typeof relationship.createdBy.principalId !== "string" || !relationship.createdBy.principalId || typeof relationship.createdBy.role !== "string" || !relationship.createdBy.role || !["human", "agent", "system", "tool"].includes(relationship.createdBy.principalType)) fail("Relationship principal is required.");
  if (relationship.endedAt !== undefined) assertRelationshipEnd(relationship, relationship.endedAt);
  return relationship;
}

export function createRelationship(input: Omit<ProjectStateRelationship, "id" | "createdAt">, lookup: (id: EntityId) => ProjectStateEntity | undefined): ProjectStateRelationship {
  return validateRelationship({ ...input, id: globalThis.crypto.randomUUID(), createdAt: new Date().toISOString() }, lookup);
}

export function assertRelationshipEnd(relationship: ProjectStateRelationship, endedAt: string): void {
  const definition = RELATIONSHIP_REGISTRY[relationship.relationshipType];
  if (!definition || definition.immutableProvenance) fail("Immutable provenance relationship cannot be ended.");
  if (relationship.endedAt && relationship.endedAt !== endedAt) fail("Relationship was already ended.");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(endedAt) || !Number.isFinite(Date.parse(endedAt)) || new Date(endedAt).toISOString() !== endedAt || endedAt < relationship.createdAt) fail("Invalid relationship end time.");
}
