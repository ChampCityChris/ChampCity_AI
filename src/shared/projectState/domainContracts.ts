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
export type ValidationPolicyClass = "deterministic" | "semantic_ai" | "visual_human" | "deferred_visual_phase" | "operator_decision";
export type ValidationMode = "deterministic" | "semantic_ai" | "visual_human";
export type WorkflowState = "planned" | "active" | "blocked" | "closed" | "cancelled";
export type PhaseState = WorkflowState;
export type WorkItemKind = "feature" | "fix" | "repair" | "migration" | "maintenance";
export type WorkState = "planned" | "ready" | "in_progress" | "implemented" | "blocked" | "validation_pending" | "closed" | "cancelled";
export type ImplementationOutcome = "implemented" | "partial" | "blocked" | "failed" | "abandoned";
export type WorkIntakeState = "captured" | "assessing" | "routed" | "active" | "closed" | "cancelled";
export type WorkRoute = "greenfield" | "feature-change" | "refactor-migration" | "integration-composition" | "infrastructure-platform" | "research-prototype" | "issue-resolution";
import type { WorkflowType } from "./workflowTypeRegistry";
export type TestLifecycleAssessmentStatus = "PRESERVE" | "REWRITE_CANDIDATE" | "SPLIT_CANDIDATE" | "CONSOLIDATE_CANDIDATE" | "MIGRATE_CANDIDATE" | "RETIRE_CANDIDATE" | "QUARANTINE_CANDIDATE" | "NEEDS_TESTER_REVIEW";
export type TesterRecommendation = "reuse-existing-proof" | "permanent-proof-change-warranted" | "lifecycle-review-candidate" | "no-permanent-test-required" | "production-defect-suspected";
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
  ResearchOutcome: import("../workPlanningContracts").WorkResearchOutcome & {workflowId: EntityId};
  PhaseReviewCycle: {workflowId: EntityId; phaseId: EntityId; stageKind: "interview" | "planning"; semanticDigest: string; layout: {memberIds: EntityId[]; sources: {entityId: EntityId; recordVersion: number}[]}};
  PhaseMapReviewCycle: {workflowId: EntityId; semanticDigest: string; layout: {memberIds: EntityId[]; sources: {entityId: EntityId; recordVersion: number}[]}};
  ProjectPlanningReviewCycle: { workflowId: EntityId; semanticDigest: string; layout: {memberIds: EntityId[]; sources: {entityId: EntityId; recordVersion: number}[]} };
  PlanReviewCycle: { workflowId: EntityId; workflowType: WorkflowType; semanticDigest: string; layout: import("./planReviewContracts").PlanReviewLayout };
  Project: { name: string; description: string };
  ProjectResource: { resourceType: string; provider: string; logicalName: string; locator: string; role: string; sourceRevisionId?: string };
  WorkIntake: { request: string; desiredOutcome: string; constraints: string[]; evidenceContext: string[]; intakeState: WorkIntakeState; requestedIntegrationTarget: string; hasExistingSourceOrPlanning?: boolean };
  RouteAssessment: { workIntakeId: EntityId; recommendation: WorkRoute; traits: string[]; rationale: string; alternate?: WorkRoute; evidenceIds: EvidenceId[] };
  Workflow: { workflowType: WorkflowType; title: string; currentWorkspace: string; workflowState: WorkflowState };
  ArchitectReviewCycle: { workflowId: EntityId; workflowType: WorkflowType; stageKind: ArchitectStageKind; semanticDigest: string };
  WorkflowIntake: { workflowId: EntityId; workflowType: WorkflowType; values: Record<string, string | boolean> };
  SourceBaseline: { workflowId: EntityId; repositoryId: string; integrationTargetSourceLineId: string; baseRevisionId: string };
  Phase: { title: string; objective: string; phaseState: PhaseState; sequence: number; phaseKey?: string; sourceReferences?: string[] };
  Finding: { title: string; statement: string; category: string; impact: string; observedAt: string; findingState: string; confidence?: number };
  RootCause: { title: string; statement: string; rationale: string; confidence?: number; rootCauseState: string };
  BoundedSolution: { title: string; objective: string; scopeIn: string[]; scopeOut: string[]; constraints: string[]; assumptions: string[]; risks: string[]; solutionState: string };
  Criterion: { statement: string; criticality: "required" | "optional" | "informational"; verificationIntent: string; validationPolicy: ValidationPolicyClass; criterionState: string };
  WorkItem: { workItemKind: WorkItemKind; title: string; objective: string; workState: WorkState; implementationBoundaries?: string[]; affectedPaths?: string[]; proofIntent?: string[]; candidateKey?: string; planningOrder?: number; planningResolution?: "planned" | "deferred" | "superseded" | "alreadySatisfied" | "carriedForward"; resolutionReason?: string; planningEvidence?: string[]; carriedForwardToPhaseId?: string; planningPreparedAt?: string; startedAt?: string; implementedAt?: string };
  ImplementationRecord: { workItemId: EntityId; summary: string; deviations: string[]; blockers: string[]; residualRisks: string[]; outcome: ImplementationOutcome; executionRef?: string };
  TesterResult: { workflowId: EntityId; workItemId: EntityId; implementationRecordId: EntityId; sourceMode: "source-backed" | "source-neutral"; implementerRevisionId?: string; recommendation: TesterRecommendation; affectedCapabilityIds: string[]; permanentTestPaths: string[]; determinationEvidence: string[]; unknowns: string[]; rationale: string; checkpointState: "not-required" | "pending" | "committed" | "blocked"; candidateRevisionId?: string; sourceCheckpointId?: EntityId };
  Validation: { validationType: string; method: string; validationMode: ValidationMode; outcome: "pass" | "fail" | "blocked" | "inconclusive"; targetEntityId: EntityId; targetRecordVersion: number; sourceBaselineRef?: string; implementationRecordId?: EntityId; assessmentStatus?: TestLifecycleAssessmentStatus; performedBy: PrincipalRef; performedAt: string; summary: string };
  Evidence: { evidenceType: string; description: string; capturedAt: string; capturedBy: PrincipalRef; mediaType: string; payloadRef: string; digest: string; size?: number; sourceBaselineRef?: string };
  Decision: { decisionType: string; outcome: string; rationale: string; decisionRole: string; decisionScope: string; decidedBy: PrincipalRef; decidedAt: string; effectiveAt: string };
  RegressionObligation: { title: string; statement: string; capabilityId: string; riskCategory: string; obligationState: "active" | "quarantined" | "retired"; sourceWorkItemId?: EntityId };
  SourceBinding: { workflowId: EntityId; sourceBaselineId: EntityId; workSourceLineId?: string; currentRevisionId?: string; repositoryCheckoutId?: string; preparationState: "unprepared" | "preparing" | "ready" | "blocked"; failureCode?: string };
  SourceCheckpoint: { boundaryId: string; workflowId: EntityId; sourceLineId: string; expectedRevisionId: string; resultingRevisionId?: string; receiptDigest?: string; checkpointKind: "implementation" | "disposition" | "tester"; checkpointState: "not-required" | "pending" | "committed" | "blocked" | "inspection-required" };
  IntegrationRecord: { workflowId: EntityId; incomingRevisionId: string; targetSourceLineId: string; targetBeforeRevisionId: string; candidateRevisionId?: string; targetAfterRevisionId?: string; resultRevisionId?: string; integrationState: "prepared" | "validating" | "repairing" | "ready" | "integrated" | "blocked" | "failed"; outcome: "pending" | "integrated" | "blocked" | "failed"; validationIds: EntityId[]; repairWorkItemIds: EntityId[] };
}

export type EntityType = keyof EntityBodyMap;
export type ProjectStateRecord<T extends EntityType = EntityType> = RecordEnvelope<T> & { body: EntityBodyMap[T] };
export type ProjectStateEntity = { [T in EntityType]: ProjectStateRecord<T> }[EntityType];

/** Supersession creates a new id with the same lineage; derivation retains separate lineages. */
export interface SupersessionRef { predecessorId: EntityId; successorId: EntityId; lineageId: LineageId }
export interface DerivationRef { sourceId: EntityId; derivedId: EntityId }

export const ARCHITECT_STAGE_KINDS = ["project-interview", "feature-assessment", "issue-rca", "migration-assessment", "integration-assessment", "infrastructure-assessment", "research-assessment"] as const;
export type ArchitectStageKind = typeof ARCHITECT_STAGE_KINDS[number];
