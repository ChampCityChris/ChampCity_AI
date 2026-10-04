import type { ArchitectReviewProjection } from "./projectState/architectReviewContracts";
import type { PlanningDocumentDetail } from "./documents/planningDocument";
import type { WorkflowType } from "./projectState/workflowTypeRegistry";
import type { FeatureAssessmentCandidate, IssueRootCauseCandidateInput } from "./projectState/projectStateService";

export const FEATURE_ARCHITECT_SECTIONS = {
  currentProductBaseline: "Current Product Baseline", requestedCapabilityDelta: "Requested Capability Delta",
  behaviorContractsToPreserve: "Behavior and Contracts to Preserve", affectedArchitectureIntegrationPoints: "Affected Architecture and Integration Points",
  compatibilityRollout: "Compatibility and Rollout", regressionBoundary: "Regression Boundary", excludedFutureWork: "Excluded Future Work",
} as const;
export const ASSESSMENT_SECTIONS = {
  "refactor-migration": {currentStateFindings: "Verified Current State", targetRecommendation: "Target State Recommendation", scopeIn: "Scope In", scopeOut: "Scope Out", preservationObligations: "Preservation Obligations", retirementRecommendations: "Retirement Recommendations", transitionConstraints: "Transition Constraints", migrationSequenceDependencies: "Migration Sequence and Dependencies", compatibilityRollback: "Compatibility and Rollback", risks: "Risks", assumptions: "Assumptions", unresolvedOperatorDecisions: "Unresolved Operator Decisions"},
  "integration-composition": {participatingSystems: "Participating Systems", interfaceDataControlFlow: "Interface, Data and Control Flow", reuseRecommendations: "Reuse Recommendations", integrationSolution: "Integration Boundary and Solution", accessSecurityConstraints: "Access and Security Constraints", compatibilityLifecycle: "Compatibility and Lifecycle", failureRecovery: "Failure and Recovery", dependencies: "Dependencies", risks: "Risks", assumptions: "Assumptions", unresolvedOperatorDecisions: "Unresolved Operator Decisions"},
  "infrastructure-platform": {environmentPlatformFindings: "Current Environment and Platform", targetPlatformRecommendation: "Target Platform Recommendation", ownershipAccess: "Ownership and Access", rolloutCutover: "Rollout and Cutover", stateDataRecovery: "State and Data Recovery", networkObservability: "Network and Observability", preservationCompatibility: "Preservation and Compatibility", dependencies: "Dependencies", risks: "Risks", assumptions: "Assumptions", unresolvedOperatorDecisions: "Unresolved Operator Decisions"},
  "research-prototype": {questionHypothesis: "Question and Hypothesis", alternativesUnknowns: "Alternatives and Unknowns", experimentBoundary: "Experiment Boundary", evidenceRequired: "Evidence Required", recommendedApproach: "Recommended Experiment Approach", successFailureCriteria: "Success and Failure Criteria", timeboxClosure: "Timebox and Closure", outputDispositionRecommendation: "Output Disposition Recommendation", risks: "Risks", assumptions: "Assumptions", unresolvedOperatorDecisions: "Unresolved Operator Decisions"},
} as const;
export type AssessmentWorkflowType = keyof typeof ASSESSMENT_SECTIONS;
export type AssessmentOutput<T extends AssessmentWorkflowType> = {[K in keyof typeof ASSESSMENT_SECTIONS[T]]: string};
export type MigrationAssessmentOutput = AssessmentOutput<"refactor-migration">;
export type IntegrationAssessmentOutput = AssessmentOutput<"integration-composition">;
export type InfrastructureAssessmentOutput = AssessmentOutput<"infrastructure-platform">;
export type ResearchAssessmentOutput = AssessmentOutput<"research-prototype"> & {researchOutcome?: import("./workPlanningContracts").WorkResearchOutcome};
export const ASSESSMENT_DESIGNS = {
  "refactor-migration": {solution: "targetRecommendation", criteria: ["preservationObligations", "compatibilityRollback"], scope: "scopeIn", excluded: "scopeOut", constraints: "transitionConstraints"},
  "integration-composition": {solution: "integrationSolution", criteria: ["compatibilityLifecycle", "failureRecovery"], scope: "integrationSolution", excluded: "unresolvedOperatorDecisions", constraints: "accessSecurityConstraints"},
  "infrastructure-platform": {solution: "targetPlatformRecommendation", criteria: ["stateDataRecovery", "networkObservability", "preservationCompatibility"], scope: "targetPlatformRecommendation", excluded: "unresolvedOperatorDecisions", constraints: "ownershipAccess"},
  "research-prototype": {solution: "recommendedApproach", criteria: ["evidenceRequired", "successFailureCriteria", "timeboxClosure"], scope: "experimentBoundary", excluded: "unresolvedOperatorDecisions", constraints: "timeboxClosure"},
} as const;
export type ArchitectCandidateOutput = GreenfieldArchitectOutput | MigrationAssessmentOutput | IntegrationAssessmentOutput | InfrastructureAssessmentOutput | ResearchAssessmentOutput | FeatureAssessmentCandidate | {rootCauses: IssueRootCauseCandidateInput[]};
export interface ArchitectCandidateSaveInput {intakeId: string; intakeVersion: number; expectedCycleVersion?: number; output: ArchitectCandidateOutput}
const ARCHITECT_LIMITS = {transportBytes: 100_000, textBytes: 4000, featureBytes: 4096, directionBytes: 4096, sectionItems: 32, totalItems: 200, rootCauses: 12, titleBytes: 200, referenceItems: 32, referenceLength: 128} as const;
export function validateArchitectCandidateOutput(type: WorkflowType, output: unknown): void {
  if (type === "project-creation") return validateGreenfieldArchitectOutput(output);
  if (!output || typeof output !== "object" || Array.isArray(output)) throw Error("Typed Architect output is required.");
  if (new TextEncoder().encode(JSON.stringify(output)).length > ARCHITECT_LIMITS.transportBytes) throw Error("Architect transport exceeds 100 KB.");
  if (type === "feature-capability") {
    if (Object.keys(output).sort().join("|") !== Object.keys(FEATURE_ARCHITECT_SECTIONS).sort().join("|") || Object.values(output).some(value => typeof value !== "string" || !value.trim() || new TextEncoder().encode(value).length > ARCHITECT_LIMITS.featureBytes || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))) throw Error("All seven bounded Feature assessment dimensions are required.");
    return;
  }
  if (Object.hasOwn(ASSESSMENT_SECTIONS, type)) {
    const sections = ASSESSMENT_SECTIONS[type as AssessmentWorkflowType];
    const {researchOutcome, ...dimensions} = output as Record<string, unknown>;
    if (researchOutcome !== undefined && type !== "research-prototype") throw Error("Research outcome requires a Research assessment.");
    if (Object.keys(dimensions).sort().join("|") !== Object.keys(sections).sort().join("|") || Object.values(dimensions).some(value => typeof value !== "string" || !value.trim() || new TextEncoder().encode(value).length > ARCHITECT_LIMITS.textBytes || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))) throw Error("Exact bounded workflow-specific assessment dimensions are required.");
    return;
  }
  if (type === "issue-resolution") {
    const roots = (output as {rootCauses?: unknown}).rootCauses;
    if (Object.keys(output).join("|") !== "rootCauses" || !Array.isArray(roots) || !roots.length || roots.length > ARCHITECT_LIMITS.rootCauses) throw Error("RCA requires 1–12 typed RootCause candidates.");
    for (const root of roots) {
      if (!root || typeof root !== "object" || Array.isArray(root) || Object.keys(root).some(key => !["title", "statement", "rationale", "confidence", "findingIds", "evidenceIds"].includes(key)) ||
        ["title", "statement", "rationale"].some(key => typeof root[key] !== "string" || !root[key].trim() || new TextEncoder().encode(root[key]).length > (key === "title" ? ARCHITECT_LIMITS.titleBytes : ARCHITECT_LIMITS.featureBytes) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(root[key])) ||
        root.confidence !== undefined && (typeof root.confidence !== "number" || !Number.isFinite(root.confidence) || root.confidence < 0 || root.confidence > 1) ||
        ["findingIds", "evidenceIds"].some(key => !Array.isArray(root[key]) || root[key].length > ARCHITECT_LIMITS.referenceItems || new Set(root[key]).size !== root[key].length || root[key].some((id: unknown) => typeof id !== "string" || id.length > ARCHITECT_LIMITS.referenceLength))) throw Error("Bounded typed RCA fields and exact references are required.");
    }
    return;
  }
  throw Error("Architect output contract is unavailable for this Workflow type.");
}

export const GREENFIELD_ARCHITECT_SECTIONS = {
  projectUnderstanding: "Project Understanding", usersAndPrimaryWorkflows: "Users and Primary Workflows",
  scope: "Scope", nonScope: "Non-Scope", constraints: "Constraints", keyDecisions: "Key Decisions",
  architectRecommendations: "Architect Recommendations", dataAndIntegrationRequirements: "Data and Integration Requirements",
  securityComplianceOperational: "Security, Compliance, and Operational Considerations", risksAndDependencies: "Risks and Dependencies",
  assumptions: "Assumptions", deferredDecisions: "Deferred Decisions", unresolvedQuestions: "Unresolved Questions",
  acceptanceDirection: "Acceptance Direction", projectPlanningDirection: "Project Planning Direction",
} as const;
export type GreenfieldArchitectOutput = { [K in keyof typeof GREENFIELD_ARCHITECT_SECTIONS]: string[] };
export function validateGreenfieldArchitectOutput(value: unknown): asserts value is GreenfieldArchitectOutput {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
    Object.keys(value).sort().join("|") !== Object.keys(GREENFIELD_ARCHITECT_SECTIONS).sort().join("|")) throw Error("Exact fifteen-section Architect output is required.");
  let size = 0;
  let count = 0;
  for (const entries of Object.values(value)) {
    if (!Array.isArray(entries) || !entries.length || entries.length > ARCHITECT_LIMITS.sectionItems || entries.some(entry => typeof entry !== "string" || !entry.trim() || new TextEncoder().encode(entry).length > ARCHITECT_LIMITS.textBytes || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(entry)))
      throw Error("Each Architect section requires 1–32 bounded text items.");
    size += new TextEncoder().encode(JSON.stringify(entries)).length;
    count += entries.length;
  }
  if (size > ARCHITECT_LIMITS.transportBytes || count > ARCHITECT_LIMITS.totalItems) throw Error("Architect output exceeds the bounded transport limit.");
  if (new TextEncoder().encode((value as GreenfieldArchitectOutput).projectPlanningDirection.join("\n")).length > ARCHITECT_LIMITS.directionBytes) throw Error("Project Planning direction must fit the bounded solution objective.");
}
/** Semantic guidance is independent of transport validation and its bounds. */
export function architectCandidateHandoffContract(type: WorkflowType): string[] {
  const recommendationRule = "Proposed Architect decisions and recommendations are never Operator Decisions. The approved Intake is governing scope. Do not infer additional implementation requirements solely from classification or metadata. If supplied context is materially ambiguous or conflicting, preserve the ambiguity as an unresolved Operator question rather than inventing work or selecting a route.";
  if (type === "project-creation") return [
    "Capture exactly the fifteen required semantic sections; each field is a collection of substantive text items or explicitly unresolved questions:",
    ...Object.entries(GREENFIELD_ARCHITECT_SECTIONS).map(([field, section]) => `${section}: ${field}`),
    recommendationRule,
    "Project Planning Direction must cover the full adopted Project scope, governing architecture, product capabilities, dependencies and acceptance obligations. Identify unresolved Operator decisions explicitly.",
  ];
  if (type === "issue-resolution") return [
    "Capture rootCauses as a collection of typed RootCause candidates. Each candidate requires title, statement, rationale, findingIds and evidenceIds; optional confidence expresses certainty between 0 and 1.",
    "findingIds and evidenceIds are collections of unique supplied IDs. Each candidate must cite at least one valid supplied Finding or Evidence. Use exact IDs supplied in the handoff SQL context for this Issue Workflow; Evidence may support the SQL Intake directly without a Finding.",
    recommendationRule,
  ];
  const sections = type === "feature-capability" ? FEATURE_ARCHITECT_SECTIONS : Object.hasOwn(ASSESSMENT_SECTIONS, type) ? ASSESSMENT_SECTIONS[type as AssessmentWorkflowType] : undefined;
  if (!sections) throw Error("Architect output contract is unavailable for this Workflow type.");
  return [
    "Capture all required assessment dimensions; each field is one nonempty scalar string, not an array:",
    ...Object.entries(sections).map(([field, section]) => `${section}: ${field}`),
    recommendationRule,
    ...(type === "research-prototype" ? ["Also supply researchOutcome with outcome (no-implementation-plan-required | research-plan-required), prototypeDisposition (disposable | candidate-for-later-work), productionFollowUp (none | new-work-intake-required), evidence (a collection of substantive text), decisionEnabled, successFailureResult and closureCondition. Candidate-for-later-work requires new-work-intake-required. This outcome is reviewed within the same exact Architect cycle; prose recommendations cannot authorize closure."] : []),
  ];
}
export interface StructuredArchitectWorkspaceModel {
  workflowId: string;
  workflowType: WorkflowType;
  title: string;
  stageLabel: string;
  stageKind: import("./projectState/domainContracts").ArchitectStageKind;
  nextStageReady: boolean;
  supportRecords?: import("./projectState/domainContracts").ProjectStateEntity[];
  browserCompanionEligible: boolean;
  intakeRailStatus: "Open" | "Awaiting Approval" | "Completed";
  ready: boolean;
  reason?: string;
  intakeId?: string;
  intakeVersion?: number;
  intakeDocument?: PlanningDocumentDetail;
  intakeDocumentLabel?: string;
  cycleVersion?: number;
  handoff?: string;
  review?: ArchitectReviewProjection;
  reviewDocument?: PlanningDocumentDetail;
  materializationError?: string;
  railStatus: "Not Ready" | "Open" | "Awaiting Approval" | "Completed";
}
