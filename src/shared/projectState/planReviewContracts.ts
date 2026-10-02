import type { EntityId } from "./domainContracts";
import type { WorkflowType } from "./workflowTypeRegistry";
import type { WorkflowPlanningGraph } from "./projectStateService";

export const PLAN_BOUNDARY_REASONS = ["independent_acceptance_boundary", "cutover_transition", "rollback_recovery_boundary", "environment_transition", "separately_deliverable_outcome", "material_dependency_gate"] as const;
export interface PlanBoundary { phaseKey: string; reason: typeof PLAN_BOUNDARY_REASONS[number]; rationale: string; evidenceRefs: string[] }
export interface PlanCandidate extends Omit<WorkflowPlanningGraph, "topology"> {
  workflowType: WorkflowType;
  phaseDependencies?: Array<{ phaseKey: string; dependencyKeys: string[] }>;
  boundaries?: PlanBoundary[];
  sources: Array<{ entityId: EntityId; recordVersion: number }>;
}
/** Only identity, membership, and boundary evidence live on the review anchor. Semantic bodies live once in ordinary entities. */
export interface PlanReviewLayout {
  solutionId: EntityId; solutionAddresses: EntityId[]; solutionCriterionIds: EntityId[];
  phases: Array<{ key: string; entityId: EntityId; criterionIds: EntityId[]; dependencyKeys: string[] }>;
  workItems: Array<{ key: string; entityId: EntityId; phaseKey?: string; dependencyKeys: string[]; criterionIds: EntityId[] }>;
  boundaries: PlanBoundary[]; sources: Array<{ entityId: EntityId; recordVersion: number }>;
}

export function resolvePlanTopology(candidate: Omit<PlanCandidate, "workflowType" | "sources">): WorkflowPlanningGraph {
  const fail = (message: string): never => { throw Error(`Plan topology: ${message}`); };
  const key = (value: unknown) => typeof value === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(value);
  if (!Array.isArray(candidate.workItems) || candidate.workItems.length < 1 || candidate.workItems.length > 128) fail("bounded WorkItems required.");
  const works = new Map(candidate.workItems.map(work => [work.key, work]));
  if (works.size !== candidate.workItems.length || candidate.workItems.some(work => !key(work.key) || !Array.isArray(work.dependencyKeys) || work.dependencyKeys.length > 128)) fail("invalid WorkItem keys/dependencies.");
  const acyclic = (nodes: Map<string, string[]>) => {
    const marks = new Map<string, number>();
    const visit = (id: string) => { if (!nodes.has(id)) fail("unknown dependency."); if (marks.get(id) === 1) fail("dependency cycle."); if (marks.get(id) === 2) return; marks.set(id, 1); for (const dependency of nodes.get(id)!) visit(dependency); marks.set(id, 2); };
    for (const id of nodes.keys()) visit(id);
  };
  acyclic(new Map(candidate.workItems.map(work => [work.key, work.dependencyKeys])));
  const phases = candidate.phases ?? [];
  if (!Array.isArray(phases) || phases.length > 32) fail("invalid phase grouping.");
  const graph: WorkflowPlanningGraph = { workflowId: candidate.workflowId, solution: candidate.solution, solutionAddresses: candidate.solutionAddresses,
    solutionCriteria: candidate.solutionCriteria, workItems: candidate.workItems, topology: phases.length ? "phased" : "direct", ...(phases.length ? { phases } : {}) };
  if (!phases.length) {
    if (candidate.workItems.some(work => work.phaseKey !== undefined) || candidate.boundaries?.length || candidate.phaseDependencies?.length) fail("phase semantics require a grouping.");
    return graph;
  }
  if (phases.length < 2) fail("a single Phase must be direct WorkItems.");
  const byPhase = new Map(phases.map(phase => [phase.key, phase]));
  if (byPhase.size !== phases.length || new Set(phases.map(phase => phase.sequence)).size !== phases.length || phases.some(phase => !key(phase.key) || !Number.isSafeInteger(phase.sequence) || phase.sequence < 1 || phase.sequence > 32 || !phase.criteria?.some(item => item.criticality === "required"))) fail("unique ordered Phases with acceptance criteria required.");
  if (candidate.workItems.some(work => !work.phaseKey || !byPhase.has(work.phaseKey)) || phases.some(phase => !candidate.workItems.some(work => work.phaseKey === phase.key))) fail("every WorkItem must be assigned exactly once to nonempty Phases.");
  const dependencies = candidate.phaseDependencies ?? [];
  if (dependencies.length > 32 || new Set(dependencies.map(item => item.phaseKey)).size !== dependencies.length || dependencies.some(item => !byPhase.has(item.phaseKey) || !Array.isArray(item.dependencyKeys) || item.dependencyKeys.length > 32)) fail("invalid Phase dependencies.");
  acyclic(new Map(phases.map(phase => [phase.key, dependencies.find(item => item.phaseKey === phase.key)?.dependencyKeys ?? []])));
  for (const item of dependencies) for (const dependency of item.dependencyKeys) if (byPhase.get(dependency)!.sequence >= byPhase.get(item.phaseKey)!.sequence) fail("Phase dependency contradicts Phase order.");
  for (const work of candidate.workItems) for (const dependency of work.dependencyKeys) if (byPhase.get(works.get(dependency)!.phaseKey!)!.sequence > byPhase.get(work.phaseKey!)!.sequence) fail("WorkItem dependency contradicts Phase order.");
  const boundaries = candidate.boundaries ?? [];
  const ordered = [...phases].sort((a, b) => a.sequence - b.sequence).slice(1);
  if (boundaries.length !== ordered.length || new Set(boundaries.map(boundary => boundary.phaseKey)).size !== boundaries.length || boundaries.some(boundary => !ordered.some(phase => phase.key === boundary.phaseKey) || !PLAN_BOUNDARY_REASONS.includes(boundary.reason) || typeof boundary.rationale !== "string" || !boundary.rationale.trim() || boundary.rationale.length > 4096 || !Array.isArray(boundary.evidenceRefs) || boundary.evidenceRefs.length < 1 || boundary.evidenceRefs.length > 16 || boundary.evidenceRefs.some(ref => typeof ref !== "string" || !ref.trim() || ref.length > 512))) fail("every boundary requires an allowed reason and bounded rationale/evidence.");
  return graph;
}
