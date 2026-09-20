import type { WorkPlanningProfile } from "../../../shared/workPlanningContracts";

export const issueResolutionProfile: WorkPlanningProfile = {
  routeId: "issue-resolution",
  requiredEvidence: ["Use the current approved Issue Architect investigation and original Work Intake, reported evidence/screenshots, reproduction, expected versus actual behavior, root cause, current architecture/lifecycle, preservation rules, and bounded correction direction."],
  discoveryQuestions: [
    "Plan the correction from approved RCA evidence. Keep investigation and semantic judgment in the existing Issue Architect workflow; do not substitute a generic product assessment.",
    "Identify regression protection, correction boundaries, and dependencies. Complexity or multiple correction milestones alone is not a reason to reroute away from Issue Resolution.",
    "If the evidence proves a different primary objective, return a general advisory reroute recommendation. The Operator controls the replacement route; retain the original Intake, branch, and investigation evidence.",
  ],
  assessmentSections: [],
  planSections: ["Approved RCA and Reproduction Evidence", "Root Cause and Correction Boundary", "Preservation and Regression Protection", "Correction Sequencing and Acceptance"],
  topologyCriteria: [
    "A simple bounded correction may use direct Work Items. Use phased correction when root-cause remediation requires genuine dependent milestones, lifecycle/cutover boundaries, or separate acceptance groups.",
    "Do not force a complex Issue into one Fix Card or manufacture Phases for a simple Issue. Both topologies use the shared execution lifecycle after planning.",
  ],
};
