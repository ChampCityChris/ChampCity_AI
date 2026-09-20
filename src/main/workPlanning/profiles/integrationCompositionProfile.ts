import type { WorkPlanningProfile } from "../../../shared/workPlanningContracts";

export const integrationCompositionProfile: WorkPlanningProfile = {
  routeId: "integration-composition",
  requiredEvidence: [
    "Inspect existing components/services, supported contracts, actual capability discovery and characterization results, ownership, authentication/access requirements, and current integration tests before proposing implementation.",
    "Separate verified capabilities from advertised, unavailable, version-dependent, or uncharacterized behavior. Record evidence and unresolved constraints without capturing credentials or secrets.",
    "Require a build-versus-integrate disposition for every material capability: capability, candidate component, verified fit, demonstrated gap, chosen disposition, owner, and validation evidence.",
  ],
  discoveryQuestions: [
    "Establish component ownership and external contracts, authentication/access boundaries, data/control flow, lifecycle/health, failure/retry/recovery behavior, and upgrade/version risk.",
    "Characterize existing components first. Custom code is justified only by demonstrated gaps or required adapters with explicit boundaries, ownership, and proof; unknown behavior requires characterization rather than speculative replacement.",
    "For each material capability decide whether to configure, characterize, integrate, adapt, validate, replace, or reject existing components. Work Items may have any of these outcomes; installation or custom implementation is not assumed.",
    "Document adapter responsibilities and avoid duplicating provider behavior already owned by a component or existing gateway. Explain why rejected/replaced candidates fail the required contract and what evidence supports the alternative.",
    "Resolve compatibility and version constraints, failure containment, observability and health checks, access ownership, and the operational lifecycle before committing to composition boundaries.",
    "Keep the Plan bounded to the requested composition outcome. Do not substitute a Greenfield build-first roadmap or expand provider SDKs, install components, or configure external services during planning.",
  ],
  assessmentSections: [
    "Components and Characterization Evidence", "Capability Build-versus-Integrate Dispositions", "Ownership and External Contracts",
    "Authentication and Access", "Data and Control Flow", "Failure Lifecycle and Health", "Version and Upgrade Risk",
    "Demonstrated Gaps and Adapter Boundaries",
  ],
  planSections: [
    "Capability Dispositions and Evidence", "Composition and Ownership Boundaries", "Access and Data Flow",
    "Characterize-first Sequencing", "Gap-driven Custom Code", "Failure Health and Lifecycle Validation", "Version Compatibility and Upgrade Proof",
  ],
  topologyCriteria: [
    "Use direct topology for bounded composition when dependency-aware Work Items suffice; use phased only for evidenced characterization, contract, integration, or acceptance boundaries.",
    "Sequence characterization before dependent integration/adaptation commitments. Include configure, characterize, integrate, adapt, validate, replace, or reject Work Items as evidence requires, with observable acceptance criteria.",
    "Trace every custom-code candidate to a demonstrated gap or required adapter in the capability disposition; do not manufacture implementation work or Phases from the route label.",
  ],
};
