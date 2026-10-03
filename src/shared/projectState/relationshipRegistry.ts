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

const all: readonly EntityType[] = ["Project", "ProjectResource", "WorkIntake", "RouteAssessment", "WorkflowIntake", "ArchitectReviewCycle", "PhaseMapReviewCycle", "PhaseReviewCycle", "ProjectPlanningReviewCycle", "Workflow", "SourceBaseline", "Phase", "Finding", "RootCause", "BoundedSolution", "Criterion", "WorkItem", "ImplementationAttempt", "ImplementationRecord", "TesterResult", "Validation", "Evidence", "Decision", "RegressionObligation", "SourceBinding", "SourceCheckpoint", "IntegrationRecord"];
const nonProject = [...all, "CloseoutReviewCycle" as const, "PlanReviewCycle" as const, "ResearchOutcome" as const].filter(type => type !== "Project");
const rule = (from: readonly EntityType[], to: readonly EntityType[], immutableProvenance = false): RelationshipDefinition => ({ from, to, immutableProvenance });

/** Direction and endpoint type are explicit; no runtime predicate registration exists. */
export const RELATIONSHIP_REGISTRY = Object.freeze({
  closeout_review_for: rule(["CloseoutReviewCycle"], ["Workflow", "Phase"], true),
  architect_review_for: rule(["ArchitectReviewCycle"], ["Workflow"], true),
  review_member: rule(["Finding", "RootCause", "BoundedSolution", "Criterion", "Evidence", "ResearchOutcome"], ["ArchitectReviewCycle"]),
  addresses: rule(["BoundedSolution"], ["RootCause", "Finding"]),
  assesses_route: rule(["RouteAssessment"], ["WorkIntake"], true),
  assesses_work_item: rule(["TesterResult"], ["WorkItem"], true),
  baselines_source: rule(["SourceBaseline"], ["Workflow"], true),
  binds_source: rule(["SourceBinding"], ["Workflow"], true),
  blocks: rule(nonProject, nonProject),
  checkpoints: rule(["SourceCheckpoint"], ["SourceBinding", "Workflow", "WorkItem", "ImplementationRecord", "TesterResult"], true),
  defines_criterion: rule(["BoundedSolution", "WorkItem", "Phase"], ["Criterion"]),
  decomposed_into: rule(["WorkItem"], ["WorkItem"], true),
  depends_on: rule(["WorkItem", "Phase"], ["WorkItem", "Phase"]),
  derived_from: rule(nonProject, nonProject, true),
  evaluates: rule(["Validation"], ["Criterion", "WorkItem", "BoundedSolution", "RegressionObligation", "ProjectResource", "IntegrationRecord"], true),
  explains: rule(["RootCause"], ["Finding"], true),
  governs: rule(["Decision"], [...all, "CloseoutReviewCycle", "PlanReviewCycle", "ResearchOutcome", "ProjectPlanningReviewCycle"], true),
  phase_review_for: rule(["PhaseReviewCycle"], ["Phase"], true),
  phase_map_review_for: rule(["PhaseMapReviewCycle"], ["Workflow"], true),
  project_planning_review_for: rule(["ProjectPlanningReviewCycle"], ["Workflow"], true),
  plan_review_for: rule(["PlanReviewCycle"], ["Workflow"], true),
  intake_for: rule(["WorkflowIntake"], ["Workflow"], true),
  implements: rule(["WorkItem"], ["BoundedSolution"]),
  implementation_attempt_for: rule(["ImplementationAttempt"], ["WorkItem"], true),
  attempt_result: rule(["ImplementationRecord"], ["ImplementationAttempt"], true),
  implements_work_item: rule(["ImplementationRecord"], ["WorkItem"], true),
  initiates: rule(["WorkIntake"], ["Workflow"], true),
  integrates: rule(["IntegrationRecord"], ["Workflow", "SourceBinding", "WorkItem", "ImplementationRecord"], true),
  part_of: rule(["WorkItem", "Phase"], ["WorkItem", "Phase", "Workflow"]),
  proves: rule(["ProjectResource"], ["RegressionObligation"], true),
  records_attempt: rule(["TesterResult"], ["ImplementationRecord"], true),
  relates_to: rule(all, all),
  repairs: rule(["WorkItem"], ["WorkItem"], true),
  routes_to: rule(["Workflow"], ["Workflow"], true),
  supersedes: rule(nonProject, nonProject, true),
  supports: rule(["Evidence"], all, true),
  workflow_member: rule(["BoundedSolution", "Finding", "RootCause"], ["Workflow"], true),
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
  if (relationship.relationshipType === "depends_on" && from.entityType !== to.entityType) fail("Dependency endpoints must have the same scope type.");
  if (relationship.relationshipType === "closeout_review_for" && (from.entityType !== "CloseoutReviewCycle" || from.body.targetEntityId !== to.id || (from.body.scope === "project" ? to.entityType !== "Workflow" || to.body.workflowType !== "project-creation" || from.body.workflowId !== to.id : to.entityType !== "Phase"))) fail("Closeout review requires its exact typed target.");
  if (relationship.relationshipType === "phase_review_for" && (from.entityType !== "PhaseReviewCycle" || to.entityType !== "Phase" || from.body.phaseId !== to.id)) fail("Phase review requires its exact Phase owner.");
  if (relationship.relationshipType === "phase_map_review_for" && (from.entityType !== "PhaseMapReviewCycle" || to.entityType !== "Workflow" || from.body.workflowId !== to.id || to.body.workflowType !== "project-creation" || from.lifecycleState !== "active" || to.lifecycleState !== "active" || to.body.workflowState !== "active")) fail("Phase Map requires its exact active Project Creation Workflow.");
  if (relationship.relationshipType === "project_planning_review_for" && (from.entityType !== "ProjectPlanningReviewCycle" || to.entityType !== "Workflow" || from.body.workflowId !== to.id || to.body.workflowType !== "project-creation" || from.lifecycleState !== "active" || to.lifecycleState !== "active" || to.body.workflowState !== "active")) fail("Project Planning requires its exact active Project Creation Workflow.");
  if (relationship.relationshipType === "plan_review_for" && (from.entityType !== "PlanReviewCycle" || to.entityType !== "Workflow" || from.body.workflowId !== to.id || from.body.workflowType !== to.body.workflowType || from.lifecycleState !== "active" || to.lifecycleState !== "active" || to.body.workflowState !== "active" || to.body.workflowType === "work-intake-routing")) fail("Plan review requires the exact active substantive Workflow.");
  if (relationship.relationshipType === "architect_review_for" && (from.entityType !== "ArchitectReviewCycle" || to.entityType !== "Workflow" ||
    from.body.workflowId !== to.id || from.body.workflowType !== to.body.workflowType || to.body.workflowType === "work-intake-routing" ||
    from.lifecycleState !== "active" || to.lifecycleState !== "active" || to.body.workflowState !== "active")) fail("Architect review requires the exact active substantive Workflow.");
  if (relationship.relationshipType === "review_member" && (from.lifecycleState !== "active" || to.lifecycleState !== "active")) fail("Architect review members must be active.");
  if (from.entityType === "ResearchOutcome" && relationship.relationshipType === "review_member" && (to.entityType !== "ArchitectReviewCycle" || to.body.workflowType !== "research-prototype" || to.body.workflowId !== from.body.workflowId)) fail("Research outcome requires its exact Research review cycle.");
  if (relationship.relationshipType === "intake_for" && (from.entityType !== "WorkflowIntake" || to.entityType !== "Workflow" ||
    to.lifecycleState !== "active" || to.body.workflowState !== "active" || to.body.workflowType === "work-intake-routing" ||
    from.body.workflowId !== to.id || from.body.workflowType !== to.body.workflowType)) fail("intake_for requires a matching current active Workflow owner.");
  if (relationship.relationshipType === "part_of" && from.entityType === "Phase" && to.entityType !== "Workflow") fail("Phase membership must target a Workflow.");
  if (relationship.relationshipType === "part_of" && to.entityType === "Workflow" && (to.body.workflowType === "work-intake-routing" || (to.body.workflowType === "project-creation" && from.entityType !== "Phase") || to.lifecycleState !== "active" || to.body.workflowState !== "active")) fail("Planning membership requires a current implementation Workflow.");
  if (relationship.relationshipType === "workflow_member" && (to.entityType !== "Workflow" || to.body.workflowType === "work-intake-routing" || to.body.workflowType === "project-creation" || to.lifecycleState !== "active" || to.body.workflowState !== "active")) fail("Planning membership requires a current substantive implementation Workflow.");
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
  if (relationship.relationshipType === "decomposed_into") {
    if (from.entityType !== "WorkItem" || to.entityType !== "WorkItem" || from.lifecycleState !== "voided" || from.body.workState !== "cancelled" ||
      to.lifecycleState !== "active" || from.lineageId === to.lineageId) fail("decomposed_into requires a terminal source and a new-lineage active Work Item replacement.");
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
