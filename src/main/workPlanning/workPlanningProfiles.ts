import { isWorkRouteId, workRouteIds } from "../../shared/workIntakeRoutingContracts";
import type { WorkPlanningProfile } from "../../shared/workPlanningContracts";

// Minimal contracts only. Bespoke profile content is supplied by its owning bundle card.
export const workPlanningProfiles: readonly WorkPlanningProfile[] = Object.freeze(workRouteIds.map((routeId) => Object.freeze({
  routeId, requiredEvidence: Object.freeze([]), discoveryQuestions: Object.freeze([]),
  assessmentSections: Object.freeze(["Evidence", "Decisions", "Risks and Unresolved Questions"]),
  planSections: Object.freeze(["Scope", "Preserved Behavior", "Acceptance", "Execution Structure"]),
  topologyCriteria: Object.freeze([
    "Recommend the smallest topology that safely represents the work; route identity does not select topology.",
    "Use direct for ordered/dependency-aware Work Items without Phases; use phased for meaningful Phase boundaries with explicit dependencies.",
    "Do not manufacture Phases or compress independently meaningful work to fit a preferred topology. Operator Plan approval controls topology.",
  ]),
})));

export function resolveWorkPlanningProfile(routeId: unknown, profiles: readonly WorkPlanningProfile[] = workPlanningProfiles): WorkPlanningProfile {
  if (!isWorkRouteId(routeId)) throw Error("Unknown Work Route has no planning profile.");
  const matches = profiles.filter((profile) => profile.routeId === routeId);
  if (matches.length !== 1) throw Error("Selected route requires exactly one planning profile.");
  return matches[0];
}
