import type { WorkPlanningProfile } from "../../../shared/workPlanningContracts";

export const infrastructurePlatformProfile: WorkPlanningProfile = {
  routeId: "infrastructure-platform",
  requiredEvidence: [
    "Inspect current and target operational topology, deployment/runtime/host/network/packaging constraints, environment ownership, existing preflight evidence, and compatibility contracts before planning the platform change.",
    "Distinguish observed environment capabilities from assumptions and desired target state. Reuse deterministic environment detection and capability evidence instead of inferring installed tools or access.",
    "Establish the requested operational outcome and the exact platform delta. Identify install/provision/update/rollback responsibilities, state at risk, and bounded operational acceptance evidence.",
  ],
  discoveryQuestions: [
    "Map current/target topology and environment ownership across hosts, runtime environments, deployments, packaging, networks, and access boundaries; identify who can authorize and recover each change.",
    "Define install/provision/update/rollback sequencing, prerequisite capability checks, rollout/cutover boundaries, failure containment, and recovery conditions before changing the environment.",
    "Establish networking/access, observability/health, recovery procedures, and operational acceptance: what proves availability and compatibility, what triggers rollback, and who owns restoration.",
    "Preserve existing product behavior and compatibility unless explicitly superseded. Keep product features outside this Plan unless they are demonstrated hard prerequisites for the platform change; identify the minimal prerequisite and exclude later features.",
    "Require explicit success/failure conditions for rollout and recovery, including restoration proof for affected state and retained access to recovery controls.",
    "Planning produces evidence and bounded Work Items; it does not provision systems, change packaging/release configuration, or invoke a private executor. Existing development-environment services retain their responsibility.",
  ],
  assessmentSections: [
    "Operational Outcome and Platform Delta", "Current and Target Operational Topology", "Environment Ownership and Constraints",
    "Install Provision Update and Rollback", "Networking and Access", "Observability Health and Recovery",
    "Compatibility and Preservation", "Operational Acceptance and Recovery Conditions", "Excluded Product Features",
  ],
  planSections: [
    "Operational Topology and Ownership", "Provisioning and Update Sequence", "Rollout and Cutover Boundaries",
    "Network Access and Observability", "Rollback and Recovery Proof", "Operational Acceptance Conditions",
    "Compatibility and Excluded Features",
  ],
  topologyCriteria: [
    "Choose direct topology when ordered Work Items safely express a bounded platform change. Choose phased only for material rollout, cutover, environment, or acceptance boundaries justified by evidence.",
    "Do not confuse operational network/deployment topology with PlanTopology. The route and target environment do not force Phases.",
    "Sequence readiness and recovery proof before dependent rollout; every candidate must serve the operational delta or its minimal hard prerequisite, with explicit preservation and failure conditions.",
  ],
};
