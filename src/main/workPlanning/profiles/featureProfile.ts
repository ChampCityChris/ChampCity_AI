import type { WorkPlanningProfile } from "../../../shared/workPlanningContracts";

export const featureProfile: WorkPlanningProfile = {
  routeId: "feature-change",
  requiredEvidence: [
    "Inspect the existing Project's current product behavior, source, tests, accepted architecture, relevant state/contracts, and the Work Intake's requested capability change.",
    "Identify the exact current baseline and requested capability delta before discovery; derive known facts from repository evidence rather than recreating Project Intake or asking the Operator to repeat them.",
    "Inspect affected services, state, UI, contracts, and integration points plus their existing compatibility and regression evidence.",
  ],
  discoveryQuestions: [
    "Define the requested user/product capability delta, its observable acceptance outcomes, and the exact boundary of the feature against the current baseline.",
    "Identify behavior and contracts that must remain unchanged outside the feature boundary. Explicit supersession requires an Operator decision and a stated replacement; otherwise preserve existing behavior.",
    "Resolve affected services/state/UI/contracts and integration points, including data/control flows, compatibility, rollout, recovery, and adoption constraints.",
    "Define a bounded regression boundary protecting accepted behavior while proving the new capability through a real consuming workflow.",
    "Keep unrelated known future improvements and roadmap goals out of this Intake unless they are demonstrated hard dependencies of the feature. Name the dependency, evidence, and minimal prerequisite; otherwise record it as outside scope.",
    "Plan only the requested capability delta and its necessary prerequisites. Do not regenerate the whole product roadmap, treat the feature as a new Project, or require unrelated product discovery.",
  ],
  assessmentSections: [
    "Current Product Baseline", "Requested Capability Delta", "Behavior and Contracts to Preserve",
    "Affected Architecture and Integration Points", "Compatibility and Rollout", "Regression Boundary", "Excluded Future Work",
  ],
  planSections: [
    "Baseline and Capability Delta", "Preservation and Regression Proof", "Affected Services State UI and Contracts",
    "Rollout and Compatibility", "Hard Dependencies and Excluded Work", "Feature Candidate Traceability",
  ],
  topologyCriteria: [
    "Use a direct Plan for a bounded feature with ordered Work Items and no meaningful Phase boundary. Do not force Phases because the route is Feature.",
    "Use a phased Plan only when actual dependency structure, rollout milestones, or separable acceptance boundaries require it.",
    "Every Work Item and Phase candidate must trace to the feature delta or an evidenced hard dependency. Candidates must not absorb unrelated future roadmap goals.",
  ],
};
