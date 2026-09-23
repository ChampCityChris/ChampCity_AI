/** Canonical IDs are opaque application-issued UUIDs; display aliases are never keys. */
export type EntityId = string;
export type ProjectId = EntityId;
export type LineageId = EntityId;
export type RelationshipId = EntityId;
export type DecisionId = EntityId;
export type EvidenceId = EntityId;

export type PrincipalType = "human" | "agent" | "system" | "tool";
export interface PrincipalRef { principalId: string; principalType: PrincipalType; role: string }
export interface Provenance { origin: "native" | "legacy-import" | "external"; sourceRef?: string; correlationId?: string }

/** Existence, workflow progress and effective disposition are separate dimensions. */
export type LifecycleState = "active" | "closed" | "archived" | "superseded" | "voided";
export type DispositionState = "none" | "advisory" | "proposed" | "approved" | "revision_requested" | "accepted" | "rejected" | "revoked";
export const PROJECT_STATE_SCHEMA_VERSION = 1 as const;

export interface RecordEnvelope<T extends EntityType = EntityType> {
  id: EntityId;
  projectId: ProjectId;
  entityType: T;
  lineageId: LineageId;
  /** A revision retains id and lineage and advances this application-owned version. */
  recordVersion: number;
  schemaVersion: typeof PROJECT_STATE_SCHEMA_VERSION;
  lifecycleState: LifecycleState;
  /** Derived from effective Decisions; ordinary entity mutation must not set this. */
  dispositionState?: DispositionState;
  createdAt: string;
  createdBy: PrincipalRef;
  updatedAt: string;
  updatedBy: PrincipalRef;
  closedAt?: string;
  supersededAt?: string;
  provenance: Provenance;
}

export interface EntityBodyMap {
  Project: { name: string; description: string };
  ProjectResource: { resourceType: string; provider: string; logicalName: string; locator: string; role: string };
  WorkIntake: { request: string; desiredOutcome: string; constraints: string[]; evidenceContext: string[]; intakeState: string; requestedIntegrationTarget: string };
  RouteAssessment: { workIntakeId: EntityId; recommendation: string; traits: string[]; rationale: string; alternate?: string; evidenceIds: EvidenceId[] };
  Workflow: { workflowType: string; workspace: string; governingEntityId: EntityId; workflowState: string };
  Phase: { title: string; objective: string; phaseState: string; sequence: number };
  Finding: { title: string; statement: string; category: string; impact: string; observedAt: string; findingState: string; confidence?: number };
  RootCause: { title: string; statement: string; rationale: string; confidence?: number; rootCauseState: string };
  BoundedSolution: { title: string; objective: string; scopeIn: string[]; scopeOut: string[]; constraints: string[]; assumptions: string[]; risks: string[]; solutionState: string };
  Criterion: { statement: string; criticality: "required" | "optional" | "informational"; verificationIntent: string; criterionState: string };
  WorkItem: { workItemKind: string; title: string; objective: string; workState: string; startedAt?: string; implementedAt?: string };
  ImplementationRecord: { workItemId: EntityId; summary: string; deviations: string[]; blockers: string[]; residualRisks: string[]; outcome: string; executionRef?: string };
  Validation: { validationType: string; method: string; outcome: "pass" | "fail" | "blocked" | "inconclusive"; performedBy: PrincipalRef; performedAt: string; summary: string };
  Evidence: { evidenceType: string; description: string; capturedAt: string; capturedBy: PrincipalRef; mediaType: string; payloadRef: string; digest: string; size?: number };
  Decision: { decisionType: string; outcome: string; rationale: string; decisionRole: string; decisionScope: string; decidedBy: PrincipalRef; decidedAt: string; effectiveAt: string };
  RegressionObligation: { title: string; statement: string; obligationState: string; testReferenceId?: EntityId; sourceWorkItemId?: EntityId };
  SourceBinding: { workIntakeId: EntityId; repositoryId: string; integrationTargetSourceLineId: string; baseRevisionId?: string; workSourceLineId?: string; currentRevisionId?: string; repositoryCheckoutId?: string; preparationState: "unprepared" | "preparing" | "ready" | "blocked"; failureCode?: string };
  SourceCheckpoint: { boundaryId: string; workIntakeId: EntityId; sourceLineId: string; expectedRevisionId: string; resultingRevisionId?: string; checkpointKind: "implementation" | "disposition"; checkpointState: "not-required" | "pending" | "committed" | "blocked" | "inspection-required" };
  IntegrationRecord: { workIntakeId: EntityId; incomingRevisionId: string; targetSourceLineId: string; targetBeforeRevisionId: string; candidateRevisionId?: string; targetAfterRevisionId?: string; integrationState: string };
}

export type EntityType = keyof EntityBodyMap;
export type ProjectStateRecord<T extends EntityType = EntityType> = RecordEnvelope<T> & { body: EntityBodyMap[T] };
export type ProjectStateEntity = { [T in EntityType]: ProjectStateRecord<T> }[EntityType];

/** Supersession creates a new id with the same lineage; derivation retains separate lineages. */
export interface SupersessionRef { predecessorId: EntityId; successorId: EntityId; lineageId: LineageId }
export interface DerivationRef { sourceId: EntityId; derivedId: EntityId }
