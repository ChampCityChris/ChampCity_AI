import type { WorkPlanningProfile } from "../../../shared/workPlanningContracts";

/** New-product content only; orchestration and topology validation remain in the shared kernel. */
export const greenfieldProfile: WorkPlanningProfile = {
  routeId: "greenfield",
  requiredEvidence: [
    "Read the Work Intake's new-product outcome, intended users, known constraints, and any approved product brief or architecture already present in the repository.",
    "Inspect relevant source, scaffolding, configuration, platform constraints, and existing planning before describing readiness. Separate verified implementation from intended product behavior and unresolved assumptions.",
    "Trace each intended capability and principal workflow to approved evidence; do not ask the Operator to repeat repository-known facts.",
  ],
  discoveryQuestions: [
    "Establish the new product's purpose, target users, principal workflows, observable user outcomes, and complete intended capability scope, including explicit exclusions and deferred decisions.",
    "Resolve product architecture, component ownership, runtime and deployment model, data/state ownership and lifecycle, and required dependencies or external services.",
    "Resolve non-functional constraints: security/privacy, accessibility, performance, reliability, recovery, operational support, and meaningful acceptance proof.",
    "Derive technical choices from repository evidence and normal Architect judgment. Ask one material Operator-owned question at a time only when evidence leaves it unresolved; ask zero clarification questions when coverage is already resolved.",
    "Treat discovery coverage as obligations, not a fixed questionnaire or expected question count. Confirm the product understanding and material decisions before final synthesis.",
    "Use MVP or POC framing only when approved evidence explicitly establishes that scope. Otherwise plan the intended product; do not silently reduce capability scope to a minimal release or prototype.",
    "Derive delivery sequencing from capability dependencies, architecture, readiness, and acceptance. Include necessary machine and repository readiness work only when evidence requires it; avoid invented foundation work or placeholders.",
  ],
  assessmentSections: [
    "Product Outcome and Users", "Capabilities and Principal Workflows", "Product Architecture and Deployment",
    "Data and State Lifecycle", "Dependencies and External Services", "Non-Functional Constraints", "Scope and Deferred Decisions",
  ],
  planSections: [
    "Product Outcomes and Capability Coverage", "Architecture and Deployment Decisions", "Data and Dependency Delivery",
    "Non-Functional Acceptance", "Readiness and Delivery Sequencing", "Explicit Deferrals",
  ],
  topologyCriteria: [
    "A new product may use a direct Plan when its bounded capability scope can be safely delivered as ordered Work Items without meaningful Phase boundaries.",
    "Recommend phased delivery only when distinct product outcomes, readiness prerequisites, or meaningful acceptance milestones justify Phase boundaries; do not require a fixed engineering/MVP sequence.",
    "Keep all intended capabilities traceable to planned work or an explicit approved deferral. The Operator reviews scope and topology together through the shared Plan review.",
  ],
};
