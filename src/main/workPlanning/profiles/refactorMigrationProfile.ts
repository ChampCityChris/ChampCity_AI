import type { WorkPlanningProfile } from "../../../shared/workPlanningContracts";

export const refactorMigrationProfile: WorkPlanningProfile = {
  routeId: "refactor-migration",
  requiredEvidence: [
    "Inspect current architecture and exact source baseline, governing target architecture, relevant tests/contracts, state and deployment boundaries, and the approved Work Intake before asking unresolved questions.",
    "Distinguish verified current behavior, adopted target decisions, historical evidence, and assumptions. Preserve approved architecture unless an explicit Operator decision supersedes it.",
    "Map the transformation delta: preserved behavior, explicitly replaced/superseded behavior, new behavior required by the transition, and ownership boundaries that move.",
  ],
  discoveryQuestions: [
    "Establish current architecture, target architecture, and the explicit architectural delta. Determine which services, process/runtime boundaries, repositories, data/state owners, and deployment responsibilities change.",
    "Identify migration seams and real consuming vertical slices that prove the target through actual behavior, including data/state/code transition and temporary compatibility obligations.",
    "Define rollback/recovery, cutover criteria, retirement conditions, and the proof needed before removing old paths or compatibility layers. Give temporary mechanisms an owner and explicit removal condition.",
    "Plan only the transformation delta. Known later governance refactors and feature improvements remain separate Work Intakes unless they are evidenced hard prerequisites; state the minimal prerequisite and exclude the rest.",
    "Prefer sequencing that reduces dual-architecture duration and proves a real transition slice early. Do not build every hypothetical portability abstraction before exercising a real consumer.",
    "Preserve baseline behavior unless explicitly superseded; separate preservation proof from proof of the changed architecture. Stop for material conflicts with adopted target architecture or accepted product scope.",
    "Do not substitute a generic Greenfield or MVP roadmap for transformation planning. A narrow stack cutover does not authorize unrelated new capabilities or the entire known future roadmap.",
  ],
  assessmentSections: [
    "Current Architecture and Baseline", "Target Architecture", "Architectural Delta and Behavior Classification", "Ownership Movement",
    "Migration Seams and Transition Slices", "Temporary Compatibility", "Data State and Code Transition",
    "Rollback and Recovery", "Cutover Criteria", "Retirement Conditions", "Separate Future Intakes",
  ],
  planSections: [
    "Current and Target Architecture", "Transformation Delta and Preservation", "Ownership and Migration Seams",
    "Transition Slice Sequencing", "Compatibility and State Transition", "Rollback and Recovery Plan",
    "Cutover Proof", "Retirement Plan", "Excluded Governance and Feature Work",
  ],
  topologyCriteria: [
    "A small bounded refactor or stack cutover may use a direct Plan. Use phased topology only for genuine dependency, transition, acceptance, or cutover boundaries supported by evidence.",
    "Sequence meaningful transformation slices and retirement obligations, not a generic product-feature rollout. Limit overlap between old and new architecture while retaining a recoverable transition.",
    "Every Work Item or Phase must deliver part of the explicit transformation delta or its minimal hard prerequisite, with preservation/cutover/retirement proof traceable to the Plan.",
  ],
};
