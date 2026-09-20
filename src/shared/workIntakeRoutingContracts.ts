import type { SourceRevision } from "./documents/planningDocument";

/** Planning routes are independent of WorkflowId, Workspace identity, and Plan topology. */
export const workRouteIds = Object.freeze([
  "greenfield",
  "feature-change",
  "refactor-migration",
  "integration-composition",
  "infrastructure-platform",
  "research-prototype",
  "issue-resolution",
] as const);

export type WorkRouteId = (typeof workRouteIds)[number];

export const workRouteTraitIds = Object.freeze([
  "existing-source",
  "existing-approved-architecture",
  "ui-affecting",
  "data-state-migration",
  "security-sensitive",
  "external-service-dependency",
  "multi-repository",
  "deployment-affecting",
  "compatibility-required",
  "experimental",
] as const);

export type WorkRouteTrait = (typeof workRouteTraitIds)[number];

export interface WorkRouteProfileDefinition {
  readonly routeId: WorkRouteId;
  readonly label: string;
  readonly description: string;
  readonly order: number;
  readonly assessmentKind: "planned-work" | "root-cause-analysis";
}

/** Metadata only: profiles do not select topology or own an implementation engine. */
export const workRouteProfileRegistry: Readonly<Record<WorkRouteId, WorkRouteProfileDefinition>> = Object.freeze({
  greenfield: Object.freeze({
    routeId: "greenfield",
    label: "Greenfield / New Product",
    description: "Create a new product without an existing product baseline owning the requested behavior.",
    order: 10,
    assessmentKind: "planned-work",
  }),
  "feature-change": Object.freeze({
    routeId: "feature-change",
    label: "Feature / Capability Change",
    description: "Add or materially change a bounded capability in an existing product.",
    order: 20,
    assessmentKind: "planned-work",
  }),
  "refactor-migration": Object.freeze({
    routeId: "refactor-migration",
    label: "Refactor / Migration / Platform Transition",
    description: "Transform existing architecture while preserving or explicitly superseding selected behavior.",
    order: 30,
    assessmentKind: "planned-work",
  }),
  "integration-composition": Object.freeze({
    routeId: "integration-composition",
    label: "Integration / Composition",
    description: "Compose external components, services, packages, platforms, or third-party systems.",
    order: 40,
    assessmentKind: "planned-work",
  }),
  "infrastructure-platform": Object.freeze({
    routeId: "infrastructure-platform",
    label: "Infrastructure / Platform Change",
    description: "Change deployment, environments, packaging, networking, or operational platform mechanics.",
    order: 50,
    assessmentKind: "planned-work",
  }),
  "research-prototype": Object.freeze({
    routeId: "research-prototype",
    label: "Research / Prototype",
    description: "Resolve a bounded question or prove feasibility before a product commitment.",
    order: 60,
    assessmentKind: "planned-work",
  }),
  "issue-resolution": Object.freeze({
    routeId: "issue-resolution",
    label: "Issue Resolution",
    description: "Investigate an observed defect, failure, regression, or incorrect behavior before correction.",
    order: 70,
    assessmentKind: "root-cause-analysis",
  }),
});

export const workRouteProfiles: readonly WorkRouteProfileDefinition[] = Object.freeze(
  workRouteIds.map((routeId) => workRouteProfileRegistry[routeId]),
);

export function isWorkRouteId(value: unknown): value is WorkRouteId {
  return typeof value === "string" && workRouteIds.some((routeId) => routeId === value);
}

/** Unknown values have no profile; this lookup never infers a route or supplies a fallback. */
export function getWorkRouteProfile(value: unknown): WorkRouteProfileDefinition | undefined {
  return isWorkRouteId(value) ? workRouteProfileRegistry[value] : undefined;
}

export interface WorkRouteEvidence {
  readonly intakeId: string;
  readonly sourceIntake: SourceRevision;
  readonly sourceEvidence: readonly SourceRevision[];
}

/** Advisory evidence cannot represent an activated route. */
export interface ArchitectRouteAssessment extends WorkRouteEvidence {
  readonly kind: "architect-route-assessment";
  readonly assessmentId: string;
  readonly recommendedRouteId: WorkRouteId;
  readonly traits: readonly WorkRouteTrait[];
  readonly rationale: string;
  readonly alternate?: {
    readonly routeId: WorkRouteId;
    readonly rationale: string;
  };
}

interface OperatorRouteDecisionBase {
  readonly kind: "operator-route-decision";
  readonly decisionId: string;
  readonly intakeId: string;
  readonly assessmentId: string;
  readonly sourceAssessment: SourceRevision;
  readonly rationale: string;
}

/** A revision request has no selected route. Selection always belongs to the Operator. */
export type OperatorRouteDecision = OperatorRouteDecisionBase & (
  | {
      readonly disposition: "accept" | "override";
      readonly selectedRouteId: WorkRouteId;
      readonly traits: readonly WorkRouteTrait[];
    }
  | {
      readonly disposition: "request-revision";
      readonly selectedRouteId?: never;
      readonly traits?: never;
    }
);

export type OperatorRouteSelection = Extract<OperatorRouteDecision, { selectedRouteId: WorkRouteId }>;

/** A reroute recommendation retains the Intake and current selection until an Operator decision. */
export interface WorkRouteRerouteRecommendation extends WorkRouteEvidence {
  readonly kind: "architect-reroute-recommendation";
  readonly recommendationId: string;
  readonly priorDecisionId: string;
  readonly priorRouteId: WorkRouteId;
  readonly replacementRouteId: WorkRouteId;
  readonly rationale: string;
}

/** Records what became stale after an approved reroute; the Intake itself is never superseded. */
export interface WorkRouteSupersession {
  readonly intakeId: string;
  readonly priorDecisionId: string;
  readonly replacementDecisionId: string;
  readonly priorRouteId: WorkRouteId;
  readonly replacementRouteId: WorkRouteId;
  readonly supersededArtifacts: readonly SourceRevision[];
}

export type WorkRouteState =
  | { readonly state: "awaiting-assessment"; readonly intakeId: string }
  | { readonly state: "awaiting-decision"; readonly assessment: ArchitectRouteAssessment }
  | {
      readonly state: "revision-requested";
      readonly decision: Extract<OperatorRouteDecision, { disposition: "request-revision" }>;
    }
  | { readonly state: "selected"; readonly selection: OperatorRouteSelection }
  | {
      readonly state: "reroute-recommended";
      readonly selection: OperatorRouteSelection;
      readonly recommendation: WorkRouteRerouteRecommendation;
    };
