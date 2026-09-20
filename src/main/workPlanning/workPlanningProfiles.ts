import { isWorkRouteId, workRouteIds } from "../../shared/workIntakeRoutingContracts";
import type { WorkPlanningProfile } from "../../shared/workPlanningContracts";
import { greenfieldProfile } from "./profiles/greenfieldProfile";
import { featureProfile } from "./profiles/featureProfile";
import { refactorMigrationProfile } from "./profiles/refactorMigrationProfile";
import { integrationCompositionProfile } from "./profiles/integrationCompositionProfile";
import { infrastructurePlatformProfile } from "./profiles/infrastructurePlatformProfile";
import { researchPrototypeProfile } from "./profiles/researchPrototypeProfile";
import { issueResolutionProfile } from "./profiles/issueResolutionProfile";

// Common contracts remain separate from the route-specific discovery content.
const minimalProfiles: readonly WorkPlanningProfile[] = workRouteIds.map((routeId) => Object.freeze({
  routeId, requiredEvidence: Object.freeze([]), discoveryQuestions: Object.freeze([]),
  assessmentSections: Object.freeze(["Evidence", "Decisions", "Risks and Unresolved Questions"]),
  planSections: Object.freeze(["Scope", "Preserved Behavior", "Acceptance", "Execution Structure"]),
  topologyCriteria: Object.freeze([
    "Recommend the smallest topology that safely represents the work; route identity does not select topology.",
    "Use direct for ordered/dependency-aware Work Items without Phases; use phased for meaningful Phase boundaries with explicit dependencies.",
    "Do not manufacture Phases or compress independently meaningful work to fit a preferred topology. Operator Plan approval controls topology.",
  ]),
}));

const implementedProfiles: readonly WorkPlanningProfile[] = [greenfieldProfile, featureProfile, refactorMigrationProfile, integrationCompositionProfile, infrastructurePlatformProfile, researchPrototypeProfile, issueResolutionProfile];
export const workPlanningProfiles: readonly WorkPlanningProfile[] = Object.freeze(minimalProfiles.map((base) => {
  const content = implementedProfiles.find((profile) => profile.routeId === base.routeId);
  return content ? Object.freeze({ ...base,
    requiredEvidence: Object.freeze([...content.requiredEvidence]), discoveryQuestions: Object.freeze([...content.discoveryQuestions]),
    assessmentSections: Object.freeze([...base.assessmentSections, ...content.assessmentSections]),
    planSections: Object.freeze([...base.planSections, ...content.planSections]),
    topologyCriteria: Object.freeze([...base.topologyCriteria, ...content.topologyCriteria]),
  }) : base;
}));

export function resolveWorkPlanningProfile(routeId: unknown, profiles: readonly WorkPlanningProfile[] = workPlanningProfiles): WorkPlanningProfile {
  if (!isWorkRouteId(routeId)) throw Error("Unknown Work Route has no planning profile.");
  const matches = profiles.filter((profile) => profile.routeId === routeId);
  if (matches.length !== 1) throw Error("Selected route requires exactly one planning profile.");
  return matches[0];
}
