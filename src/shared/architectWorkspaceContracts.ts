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
export type ResearchAssessmentOutput = AssessmentOutput<"research-prototype">;
export const ASSESSMENT_DESIGNS = {
  "refactor-migration": {solution: "targetRecommendation", criteria: ["preservationObligations", "compatibilityRollback"], scope: "scopeIn", excluded: "scopeOut", constraints: "transitionConstraints"},
  "integration-composition": {solution: "integrationSolution", criteria: ["compatibilityLifecycle", "failureRecovery"], scope: "integrationSolution", excluded: "unresolvedOperatorDecisions", constraints: "accessSecurityConstraints"},
  "infrastructure-platform": {solution: "targetPlatformRecommendation", criteria: ["stateDataRecovery", "networkObservability", "preservationCompatibility"], scope: "targetPlatformRecommendation", excluded: "unresolvedOperatorDecisions", constraints: "ownershipAccess"},
  "research-prototype": {solution: "recommendedApproach", criteria: ["evidenceRequired", "successFailureCriteria", "timeboxClosure"], scope: "experimentBoundary", excluded: "unresolvedOperatorDecisions", constraints: "timeboxClosure"},
} as const;
export type ArchitectCandidateOutput = GreenfieldArchitectOutput | MigrationAssessmentOutput | IntegrationAssessmentOutput | InfrastructureAssessmentOutput | ResearchAssessmentOutput | FeatureAssessmentCandidate | {rootCauses: IssueRootCauseCandidateInput[]};
export interface ArchitectCandidateSaveInput {intakeId: string; intakeVersion: number; expectedCycleVersion?: number; output: ArchitectCandidateOutput}
export function validateArchitectCandidateOutput(type: WorkflowType, output: unknown): void {
  if (type === "project-creation") return validateGreenfieldArchitectOutput(output);
  if (!output || typeof output !== "object" || Array.isArray(output)) throw Error("Typed Architect output is required.");
  if (type === "feature-capability") {
    if (Object.keys(output).sort().join("|") !== Object.keys(FEATURE_ARCHITECT_SECTIONS).sort().join("|") || Object.values(output).some(value => typeof value !== "string" || !value.trim() || new TextEncoder().encode(value).length > 4096 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))) throw Error("All seven bounded Feature assessment dimensions are required.");
    return;
  }
  if (Object.hasOwn(ASSESSMENT_SECTIONS, type)) {
    const sections = ASSESSMENT_SECTIONS[type as AssessmentWorkflowType];
    if (Object.keys(output).sort().join("|") !== Object.keys(sections).sort().join("|") || Object.values(output).some(value => typeof value !== "string" || !value.trim() || new TextEncoder().encode(value).length > 4000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))) throw Error("Exact bounded workflow-specific assessment dimensions are required.");
    return;
  }
  if (type === "issue-resolution") {
    const roots = (output as {rootCauses?: unknown}).rootCauses;
    if (Object.keys(output).join("|") !== "rootCauses" || !Array.isArray(roots) || !roots.length || roots.length > 12) throw Error("RCA requires 1–12 typed RootCause candidates.");
    for (const root of roots) {
      if (!root || typeof root !== "object" || Array.isArray(root) || Object.keys(root).some(key => !["title", "statement", "rationale", "confidence", "findingIds", "evidenceIds"].includes(key)) ||
        ["title", "statement", "rationale"].some(key => typeof root[key] !== "string" || !root[key].trim() || new TextEncoder().encode(root[key]).length > (key === "title" ? 200 : 4096)) ||
        root.confidence !== undefined && (typeof root.confidence !== "number" || !Number.isFinite(root.confidence) || root.confidence < 0 || root.confidence > 1) ||
        ["findingIds", "evidenceIds"].some(key => !Array.isArray(root[key]) || root[key].length > 32 || new Set(root[key]).size !== root[key].length || root[key].some((id: unknown) => typeof id !== "string" || id.length > 128))) throw Error("Bounded typed RCA fields and exact references are required.");
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
    if (!Array.isArray(entries) || !entries.length || entries.length > 32 || entries.some(entry => typeof entry !== "string" || !entry.trim() || new TextEncoder().encode(entry).length > 4000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(entry)))
      throw Error("Each Architect section requires 1–32 bounded text items.");
    size += new TextEncoder().encode(JSON.stringify(entries)).length;
    count += entries.length;
  }
  if (size > 100_000 || count > 200) throw Error("Architect output exceeds the bounded transport limit.");
  if (new TextEncoder().encode((value as GreenfieldArchitectOutput).projectPlanningDirection.join("\n")).length > 4096) throw Error("Project Planning direction must fit the bounded solution objective.");
}
export interface StructuredArchitectWorkspaceModel {
  workflowId: string;
  workflowType?: WorkflowType;
  title?: string;
  stageLabel?: string;
  stageKind?: import("./projectState/domainContracts").ArchitectStageKind;
  nextStageReady?: boolean;
  supportRecords?: import("./projectState/domainContracts").ProjectStateEntity[];
  ready: boolean;
  reason?: string;
  intakeId?: string;
  intakeVersion?: number;
  cycleVersion?: number;
  handoff?: string;
  review?: ArchitectReviewProjection;
  reviewDocument?: PlanningDocumentDetail;
  materializationError?: string;
  railStatus: "Not Ready" | "Open" | "Awaiting Approval" | "Completed";
}
