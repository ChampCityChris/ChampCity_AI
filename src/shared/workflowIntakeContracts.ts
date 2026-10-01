import type { FeatureIntakeInput } from "./featurePlanningContracts";
import type { IssueIntakeInput } from "./issuePlanningContracts";

// Operator intent/context only; Workflow identity remains owned by WORKFLOW_TYPE_REGISTRY.

export interface RefactorMigrationIntakeInput {
  transformationObjective: string;
  scopeIn: string;
  scopeOut: string;
  targetState?: string;
  preservation: string;
  retirement?: string;
  transitionConstraints: string;
  knownEvidence?: string;
}

export interface IntegrationCompositionIntakeInput {
  integrationOutcome: string;
  systemsInScope: string;
  reuseExpectations?: string;
  interfacesAndFlows: string;
  accessConstraints?: string;
  compatibilityLifecycle?: string;
  failureRecovery: string;
  scopeOut: string;
  knownEvidence?: string;
}

export interface InfrastructurePlatformIntakeInput {
  operationalOutcome: string;
  environmentScope: string;
  targetState?: string;
  ownershipAccess?: string;
  rolloutConstraints: string;
  stateRecovery: string;
  networkObservability?: string;
  preservationCompatibility: string;
  scopeOut: string;
  knownEvidence?: string;
}

export interface ResearchPrototypeIntakeInput {
  questionHypothesis: string;
  decisionEnabled: string;
  alternativesUnknowns?: string;
  experimentBoundary: string;
  requiredEvidence: string;
  successFailureCriteria: string;
  timeboxClosure: string;
  outputDisposition?: string;
}

export interface WorkflowIntakeInputMap {
  "feature-capability": FeatureIntakeInput;
  "issue-resolution": IssueIntakeInput;
  "refactor-migration": RefactorMigrationIntakeInput;
  "integration-composition": IntegrationCompositionIntakeInput;
  "infrastructure-platform": InfrastructurePlatformIntakeInput;
  "research-prototype": ResearchPrototypeIntakeInput;
}

export type ExistingProjectIntakeWorkflowType = keyof WorkflowIntakeInputMap;
export type WorkflowIntakeInput<T extends ExistingProjectIntakeWorkflowType> = WorkflowIntakeInputMap[T];

export interface WorkflowIntakeField<T extends ExistingProjectIntakeWorkflowType> {
  readonly key: keyof WorkflowIntakeInputMap[T] & string;
  readonly label: string;
  readonly required: boolean;
  readonly maxLength: 4096;
  readonly maxUtf8Bytes: 4096;
  readonly helpText?: string;
}

export interface WorkflowIntakeDefinition<T extends ExistingProjectIntakeWorkflowType> {
  readonly workflowType: T;
  readonly fields: readonly WorkflowIntakeField<T>[];
}

type WorkflowIntakeDefinitions = {
  readonly [T in ExistingProjectIntakeWorkflowType]: WorkflowIntakeDefinition<T>;
};

/** Deeply frozen ordered questions, independent of renderer and persistence adapters. */
export const WORKFLOW_INTAKE_DEFINITIONS = Object.freeze({
  "feature-capability": Object.freeze({
    workflowType: "feature-capability",
    fields: Object.freeze([
      Object.freeze({key: "requestedCapability", label: "Requested capability and outcome", required: true, maxLength: 4096, maxUtf8Bytes: 4096}),
      Object.freeze({key: "baseline", label: "Relevant current behavior or baseline", required: true, maxLength: 4096, maxUtf8Bytes: 4096}),
      Object.freeze({key: "scopeIn", label: "Scope in", required: true, maxLength: 4096, maxUtf8Bytes: 4096}),
      Object.freeze({key: "scopeOut", label: "Scope out", required: true, maxLength: 4096, maxUtf8Bytes: 4096}),
      Object.freeze({key: "constraints", label: "Constraints", required: true, maxLength: 4096, maxUtf8Bytes: 4096}),
      Object.freeze({key: "preservation", label: "Behavior and contracts to preserve", required: true, maxLength: 4096, maxUtf8Bytes: 4096}),
      Object.freeze({key: "affectedSurfaces", label: "Affected surfaces and architecture", required: true, maxLength: 4096, maxUtf8Bytes: 4096}),
      Object.freeze({key: "evidence", label: "Known evidence and regression boundary", required: true, maxLength: 4096, maxUtf8Bytes: 4096}),
      Object.freeze({key: "compatibilityRollout", label: "Compatibility and rollout concerns", required: true, maxLength: 4096, maxUtf8Bytes: 4096}),
    ]),
  }),
  "issue-resolution": Object.freeze({
    workflowType: "issue-resolution",
    fields: Object.freeze([
      Object.freeze({key: "title", label: "Issue title", required: true, maxLength: 4096, maxUtf8Bytes: 4096}),
      Object.freeze({key: "observed", label: "Observed behavior or failure", required: true, maxLength: 4096, maxUtf8Bytes: 4096}),
      Object.freeze({key: "expected", label: "Expected behavior", required: true, maxLength: 4096, maxUtf8Bytes: 4096}),
      Object.freeze({key: "reproduction", label: "Reproduction steps", required: true, maxLength: 4096, maxUtf8Bytes: 4096}),
      Object.freeze({key: "environment", label: "Environment and context", required: true, maxLength: 4096, maxUtf8Bytes: 4096}),
      Object.freeze({key: "impact", label: "Known impact", required: true, maxLength: 4096, maxUtf8Bytes: 4096}),
      Object.freeze({key: "constraints", label: "Constraints", required: true, maxLength: 4096, maxUtf8Bytes: 4096}),
    ]),
  }),
  "refactor-migration": Object.freeze({
    workflowType: "refactor-migration",
    fields: Object.freeze([
      Object.freeze({key: "transformationObjective", label: "Transformation objective and desired end state", required: true, maxLength: 4096, maxUtf8Bytes: 4096, helpText: "What should be materially different when this refactor or migration is complete?"}),
      Object.freeze({key: "scopeIn", label: "Scope in", required: true, maxLength: 4096, maxUtf8Bytes: 4096, helpText: "Which systems, components, runtime boundaries, behaviors, or responsibilities are intended to change?"}),
      Object.freeze({key: "scopeOut", label: "Scope out", required: true, maxLength: 4096, maxUtf8Bytes: 4096, helpText: "Which related changes must remain outside this migration?"}),
      Object.freeze({key: "targetState", label: "Known target architecture or target-state constraints", required: false, maxLength: 4096, maxUtf8Bytes: 4096, helpText: "Record already-adopted destination decisions or constraints. Leave blank when the Architect is expected to derive/recommend the target."}),
      Object.freeze({key: "preservation", label: "Behavior, contracts, data, and capabilities to preserve", required: true, maxLength: 4096, maxUtf8Bytes: 4096, helpText: "What must continue to work through and after the transition unless explicitly superseded?"}),
      Object.freeze({key: "retirement", label: "Explicit retirement or supersession expectations", required: false, maxLength: 4096, maxUtf8Bytes: 4096, helpText: "What legacy architecture, runtime, compatibility path, or component is expected to disappear?"}),
      Object.freeze({key: "transitionConstraints", label: "Transition, cutover, rollback, and coexistence constraints", required: true, maxLength: 4096, maxUtf8Bytes: 4096, helpText: "Capture downtime, dual-running, migration-window, recovery, deployment, sequencing, or rollback requirements known to the Operator."}),
      Object.freeze({key: "knownEvidence", label: "Known evidence, risks, or prior decisions", required: false, maxLength: 4096, maxUtf8Bytes: 4096, helpText: "Point the Architect toward material decisions, documents, prior attempts, known risks, or evidence that should shape repository review."}),
    ]),
  }),
  "integration-composition": Object.freeze({
    workflowType: "integration-composition",
    fields: Object.freeze([
      Object.freeze({key: "integrationOutcome", label: "Integration outcome", required: true, maxLength: 4096, maxUtf8Bytes: 4096, helpText: "What coordinated capability or user/Operator outcome should the combined systems provide?"}),
      Object.freeze({key: "systemsInScope", label: "Systems, services, tools, or components in scope", required: true, maxLength: 4096, maxUtf8Bytes: 4096, helpText: "Identify the material participants the Operator expects this work to connect or compose."}),
      Object.freeze({key: "reuseExpectations", label: "Existing capabilities or components to prefer/reuse", required: false, maxLength: 4096, maxUtf8Bytes: 4096, helpText: "Identify known components, gateways, services, or provider capabilities that should be characterized before custom replacement."}),
      Object.freeze({key: "interfacesAndFlows", label: "Required interfaces, data flows, and control flows", required: true, maxLength: 4096, maxUtf8Bytes: 4096, helpText: "Describe the externally meaningful exchanges or interactions that must work."}),
      Object.freeze({key: "accessConstraints", label: "Authentication, authorization, and access constraints", required: false, maxLength: 4096, maxUtf8Bytes: 4096, helpText: "Describe ownership/access requirements only; never capture credentials, tokens, passwords, or secrets."}),
      Object.freeze({key: "compatibilityLifecycle", label: "Compatibility, version, upgrade, and lifecycle constraints", required: false, maxLength: 4096, maxUtf8Bytes: 4096, helpText: "Capture known compatibility/support/version requirements or lifecycle expectations."}),
      Object.freeze({key: "failureRecovery", label: "Failure, retry, health, and recovery expectations", required: true, maxLength: 4096, maxUtf8Bytes: 4096, helpText: "What failure behavior, containment, health evidence, or recovery outcome matters?"}),
      Object.freeze({key: "scopeOut", label: "Scope out and custom-code boundaries", required: true, maxLength: 4096, maxUtf8Bytes: 4096, helpText: "Identify related integrations/features that are not authorized and any known limits on custom implementation."}),
      Object.freeze({key: "knownEvidence", label: "Known characterization evidence or gaps", required: false, maxLength: 4096, maxUtf8Bytes: 4096, helpText: "Record known test evidence, capability gaps, prior characterization, or unresolved external constraints."}),
    ]),
  }),
  "infrastructure-platform": Object.freeze({
    workflowType: "infrastructure-platform",
    fields: Object.freeze([
      Object.freeze({key: "operationalOutcome", label: "Operational outcome", required: true, maxLength: 4096, maxUtf8Bytes: 4096, helpText: "What environment/platform/deployment capability should exist when this work is complete?"}),
      Object.freeze({key: "environmentScope", label: "Environment and topology in scope", required: true, maxLength: 4096, maxUtf8Bytes: 4096, helpText: "Identify the hosts, runtimes, deployments, packaging, networks, or operational surfaces intended to change."}),
      Object.freeze({key: "targetState", label: "Known target platform or operational state", required: false, maxLength: 4096, maxUtf8Bytes: 4096, helpText: "Record already-decided target topology/platform constraints; leave blank if the Architect should recommend them."}),
      Object.freeze({key: "ownershipAccess", label: "Ownership and access boundaries", required: false, maxLength: 4096, maxUtf8Bytes: 4096, helpText: "Capture who operates, authorizes, restores, or depends on the affected environment and any material access constraints."}),
      Object.freeze({key: "rolloutConstraints", label: "Provisioning, rollout, cutover, and downtime constraints", required: true, maxLength: 4096, maxUtf8Bytes: 4096, helpText: "Capture sequencing, maintenance-window, deployment, update, or availability requirements."}),
      Object.freeze({key: "stateRecovery", label: "State protection, backup, rollback, and recovery requirements", required: true, maxLength: 4096, maxUtf8Bytes: 4096, helpText: "Identify state at risk and required restoration/recovery outcomes."}),
      Object.freeze({key: "networkObservability", label: "Networking, health, and observability requirements", required: false, maxLength: 4096, maxUtf8Bytes: 4096, helpText: "Capture material connectivity, monitoring, health, or operational visibility expectations."}),
      Object.freeze({key: "preservationCompatibility", label: "Compatibility and behavior to preserve", required: true, maxLength: 4096, maxUtf8Bytes: 4096, helpText: "Identify product/operational behavior and compatibility that must remain intact."}),
      Object.freeze({key: "scopeOut", label: "Scope out", required: true, maxLength: 4096, maxUtf8Bytes: 4096, helpText: "Identify product features or unrelated platform improvements not authorized by this intake."}),
      Object.freeze({key: "knownEvidence", label: "Known environment evidence or constraints", required: false, maxLength: 4096, maxUtf8Bytes: 4096, helpText: "Record known capability/preflight evidence, operational limitations, or prior decisions useful to Architect review."}),
    ]),
  }),
  "research-prototype": Object.freeze({
    workflowType: "research-prototype",
    fields: Object.freeze([
      Object.freeze({key: "questionHypothesis", label: "Question or hypothesis", required: true, maxLength: 4096, maxUtf8Bytes: 4096, helpText: "What bounded question, uncertainty, or feasibility claim should this work answer?"}),
      Object.freeze({key: "decisionEnabled", label: "Decision this research should enable", required: true, maxLength: 4096, maxUtf8Bytes: 4096, helpText: "What Operator/product/architecture decision should become possible from the evidence?"}),
      Object.freeze({key: "alternativesUnknowns", label: "Alternatives and important unknowns", required: false, maxLength: 4096, maxUtf8Bytes: 4096, helpText: "Identify material alternatives or uncertainties already known."}),
      Object.freeze({key: "experimentBoundary", label: "Experiment or prototype boundary", required: true, maxLength: 4096, maxUtf8Bytes: 4096, helpText: "What may be explored or prototyped, and what must remain outside the investigation?"}),
      Object.freeze({key: "requiredEvidence", label: "Evidence required", required: true, maxLength: 4096, maxUtf8Bytes: 4096, helpText: "What observations, measurements, demonstrations, comparisons, or findings would be useful to the decision?"}),
      Object.freeze({key: "successFailureCriteria", label: "Success, failure, and inconclusive criteria", required: true, maxLength: 4096, maxUtf8Bytes: 4096, helpText: "Define how the investigation should distinguish useful success, failure, or insufficient evidence."}),
      Object.freeze({key: "timeboxClosure", label: "Timebox, expiration, or closure condition", required: true, maxLength: 4096, maxUtf8Bytes: 4096, helpText: "When should the research stop even if the result is negative or inconclusive?"}),
      Object.freeze({key: "outputDisposition", label: "Prototype/output disposition constraints", required: false, maxLength: 4096, maxUtf8Bytes: 4096, helpText: "State whether output is expected to be disposable, potentially reusable only after later approval, or presently undecided."}),
    ]),
  }),
} satisfies WorkflowIntakeDefinitions);


export type WorkflowIntakePayload = {
  [T in ExistingProjectIntakeWorkflowType]: { workflowType: T; values: WorkflowIntakeInputMap[T] }
}[ExistingProjectIntakeWorkflowType];
export type WorkflowIntakeProjection = {
  [T in ExistingProjectIntakeWorkflowType]: { workflowType: T; values: WorkflowIntakeInputMap[T] | null }
}[ExistingProjectIntakeWorkflowType];

export function isIntakeWorkflowType(value: unknown): value is ExistingProjectIntakeWorkflowType {
  return typeof value === "string" && Object.hasOwn(WORKFLOW_INTAKE_DEFINITIONS, value);
}

/** Validate the same bounded contract at IPC and persistence boundaries. */
export function validateWorkflowIntakePayload(value: unknown): asserts value is WorkflowIntakePayload {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype)
    throw Error("Bounded Workflow intake payload is required.");
  const payload = value as Record<string, unknown>;
  if (Object.keys(payload).sort().join("|") !== "values|workflowType" || !isIntakeWorkflowType(payload.workflowType) ||
      !payload.values || typeof payload.values !== "object" || Array.isArray(payload.values) || Object.getPrototypeOf(payload.values) !== Object.prototype)
    throw Error("Workflow intake type and bounded values are required.");
  const values = payload.values as Record<string, unknown>;
  const fields = WORKFLOW_INTAKE_DEFINITIONS[payload.workflowType].fields;
  if (Object.keys(values).some(key => !fields.some(field => field.key === key))) throw Error("Unknown Workflow intake field.");
  for (const field of fields) {
    const text = values[field.key];
    if (text === undefined && !field.required) continue;
    if (typeof text !== "string" || (field.required && !text.trim()) || text.length > field.maxLength ||
        new TextEncoder().encode(text).length > field.maxUtf8Bytes)
      throw Error(`${field.label} must respect required content and the 4,096 character / UTF-8 byte limits.`);
  }
}
