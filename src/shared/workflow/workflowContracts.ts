export const WORKFLOW_STATE_SCHEMA_VERSION = "champcity.workflow-state.v1" as const;
export const ROUTED_ACTION_SCHEMA_VERSION = "champcity.routed-action.v1" as const;
export const REFERENCE_NAVIGATION_SCHEMA_VERSION =
  "champcity.reference-navigation.v1" as const;

export const workflowStages = ["capture", "frame", "plan", "build", "prove"] as const;
export type WorkflowStage = (typeof workflowStages)[number];

export const canonicalWorkflowSpine = [
  "project_intake",
  "project_interview",
  "reconciliation_review",
  "project_mapping",
  "operator_project_approval",
  "phase_mapping",
  "operator_phase_approval",
  "work_card_loop",
  "phase_closeout",
  "operator_phase_closeout_approval",
  "roadmap_update",
  "next_phase_activation",
  "repeat_phase_mapping_and_work_card_loop",
] as const;
export type CanonicalWorkflowSpineStep = (typeof canonicalWorkflowSpine)[number];

export const workflowRoles = ["operator", "architect", "implementer", "application"] as const;
export type WorkflowRole = (typeof workflowRoles)[number];

export type WorkflowScreenId =
  | "project-intake"
  | "project-architect-interview"
  | "project-planning"
  | "repository-reconciliation"
  | "project-roadmap"
  | "operator-project-approval"
  | "phase-mapping"
  | "phase-intake"
  | "phase-architect-interview"
  | "phase-planning"
  | "work-card-plan-review"
  | "operator-phase-approval"
  | "work-card-authoring"
  | "operator-work-card-approval"
  | "implementer-handoff"
  | "implementer-execution"
  | "architect-review"
  | "operator-validation"
  | "architect-disposition"
  | "repair-work-card-authoring"
  | "phase-closeout"
  | "operator-closeout-approval"
  | "roadmap-update"
  | "next-phase-activation"
  | "route-review-request"
  | "workflow-complete";

export interface WorkflowArtifactIdentity {
  artifactId: string;
  artifactType: string;
}

export interface RoutedActionRoutes {
  success: string | null;
  failure: string | null;
  repair: string | null;
}

export type WorkflowBlockerCode =
  | "ambiguous_authority"
  | "duplicate_active_authority"
  | "missing_authority"
  | "missing_pair"
  | "pair_mismatch"
  | "payload_hash_mismatch"
  | "role_mismatch"
  | "stale_state_revision"
  | "transition_evidence_missing"
  | "unsupported_transition"
  | "partial_write"
  | "manual_intervention_required"
  | "work_card_plan_missing"
  | "work_card_plan_unsynchronized"
  | "candidate_authority_ambiguous"
  | "candidate_unresolved"
  | "active_repair_unresolved";

export interface WorkflowBlocker {
  code: WorkflowBlockerCode;
  message: string;
  ownerRole: WorkflowRole;
  artifactIds: string[];
  blocking: true;
}

export interface RoutedActionBindingSource {
  kind: "workflow_state_index";
  workflowStateArtifactId: string;
  stateRevision: number;
}

export interface RoutedActionContract {
  schemaVersion: typeof ROUTED_ACTION_SCHEMA_VERSION;
  actionId: string;
  stage: WorkflowStage;
  role: WorkflowRole;
  screenId: WorkflowScreenId;
  targetArtifactId: string | null;
  sourceArtifactIds: string[];
  expectedOutput: WorkflowArtifactIdentity;
  routes: RoutedActionRoutes;
  bindingSource: RoutedActionBindingSource;
  authorityStatus: "ready" | "blocked";
  blockers: WorkflowBlocker[];
  stateRevision: number;
}

export interface WorkflowActionRecord {
  actionId: string;
  stage: WorkflowStage;
  role: WorkflowRole;
  screenId: WorkflowScreenId;
  targetArtifactId: string | null;
  sourceArtifactIds: string[];
  expectedOutput: WorkflowArtifactIdentity;
  routes: RoutedActionRoutes;
}

export type WorkflowStageProgress = "not_started" | "active" | "complete" | "blocked";

export interface WorkflowStageState {
  stage: WorkflowStage;
  progress: WorkflowStageProgress;
  startedAt: string | null;
  completedAt: string | null;
}

export interface OpenRepairChainState {
  status: "none" | "open" | "resolved";
  rootWorkCardArtifactId: string | null;
  activeRepairArtifactIds: string[];
  latestDispositionArtifactId: string | null;
}

export const candidateResolutionStatuses = [
  "unresolved",
  "completed",
  "completed_via_repair",
  "carried_forward",
  "deferred",
  "cancelled",
] as const;
export type CandidateResolutionStatus =
  (typeof candidateResolutionStatuses)[number];

export const closeoutEligibleCandidateResolutionStatuses = [
  "completed",
  "completed_via_repair",
  "carried_forward",
  "deferred",
  "cancelled",
] as const satisfies readonly CandidateResolutionStatus[];

export type WorkCardPlanAuthorityStatus =
  | "authoritative"
  | "missing"
  | "unsynchronized"
  | "ambiguous";

export type FullWorkCardStatus =
  | "missing"
  | "available"
  | "active"
  | "resolved";

export interface WorkCardCandidateExecutionState {
  candidateId: string;
  order: number;
  title: string;
  fullWorkCardArtifactId: string | null;
  fullWorkCardStatus: FullWorkCardStatus;
  resolutionStatus: CandidateResolutionStatus;
  resolutionEvidenceArtifactIds: string[];
}

export interface PhaseCloseoutEligibility {
  eligible: boolean;
  blockers: WorkflowBlocker[];
}

export interface PhaseExecutionState {
  workCardPlanArtifactId: string | null;
  workCardPlanAuthority: WorkCardPlanAuthorityStatus;
  approvedCandidates: WorkCardCandidateExecutionState[];
  activeCandidateId: string | null;
  activeWorkCardArtifactId: string | null;
  activeRepairArtifactId: string | null;
  earliestUnresolvedCandidateId: string | null;
  closeoutEligibility: PhaseCloseoutEligibility;
}

export interface CloseoutWorkflowState {
  status: "not_started" | "in_progress" | "pending_approval" | "approved" | "blocked";
  closeoutArtifactId: string | null;
  approvalArtifactId: string | null;
}

export interface RoadmapWorkflowState {
  status: "not_started" | "pending_update" | "updated" | "blocked";
  roadmapArtifactId: string | null;
}

export interface NextPhaseWorkflowState {
  status: "not_ready" | "ready" | "activated" | "blocked" | "project_complete";
  phaseId: string | null;
  activationArtifactId: string | null;
}

export type WorkflowTransitionRoute = "success" | "failure" | "repair";

export interface WorkflowTransitionRecord {
  fromActionId: string;
  toActionId: string | null;
  route: WorkflowTransitionRoute;
  actorRole: WorkflowRole;
  evidenceArtifactId: string;
  evidenceArtifactType: string;
  fromStateRevision: number;
  toStateRevision: number;
  occurredAt: string;
}

export interface WorkflowStateIndex {
  schemaVersion: typeof WORKFLOW_STATE_SCHEMA_VERSION;
  workflowStateArtifactId: string;
  projectId: string;
  stateRevision: number;
  createdAt: string;
  updatedAt: string;
  currentStage: WorkflowStage;
  activePhaseId: string | null;
  currentActionId: string | null;
  responsibleRole: WorkflowRole | null;
  authoritativeTargetArtifactId: string | null;
  requiredSourceArtifactIds: string[];
  expectedOutput: WorkflowArtifactIdentity | null;
  routes: RoutedActionRoutes | null;
  blockingConditions: WorkflowBlocker[];
  currentAction: RoutedActionContract | null;
  stageStates: Record<WorkflowStage, WorkflowStageState>;
  actionCatalog: Record<string, WorkflowActionRecord>;
  phaseExecution: PhaseExecutionState;
  openRepairChain: OpenRepairChainState;
  closeout: CloseoutWorkflowState;
  roadmap: RoadmapWorkflowState;
  nextPhase: NextPhaseWorkflowState;
  transitionHistory: WorkflowTransitionRecord[];
}

export interface ReferenceNavigationState {
  schemaVersion: typeof REFERENCE_NAVIGATION_SCHEMA_VERSION;
  selectedArtifactIds: string[];
  previewArtifactId: string | null;
  updatedAt: string;
}

export function createEmptyStageStates(): Record<WorkflowStage, WorkflowStageState> {
  return Object.fromEntries(
    workflowStages.map((stage) => [
      stage,
      { stage, progress: "not_started", startedAt: null, completedAt: null },
    ]),
  ) as Record<WorkflowStage, WorkflowStageState>;
}

export function projectRoutedAction(
  workflowStateArtifactId: string,
  stateRevision: number,
  record: WorkflowActionRecord,
  blockers: readonly WorkflowBlocker[] = [],
): RoutedActionContract {
  const copiedBlockers = blockers.map((blocker) => ({
    ...blocker,
    artifactIds: [...blocker.artifactIds],
  }));
  return {
    schemaVersion: ROUTED_ACTION_SCHEMA_VERSION,
    actionId: record.actionId,
    stage: record.stage,
    role: record.role,
    screenId: record.screenId,
    targetArtifactId: record.targetArtifactId,
    sourceArtifactIds: [...record.sourceArtifactIds],
    expectedOutput: { ...record.expectedOutput },
    routes: { ...record.routes },
    bindingSource: {
      kind: "workflow_state_index",
      workflowStateArtifactId,
      stateRevision,
    },
    authorityStatus: copiedBlockers.length === 0 ? "ready" : "blocked",
    blockers: copiedBlockers,
    stateRevision,
  };
}

export function createReferenceNavigationState(
  updatedAt: string,
  selectedArtifactIds: readonly string[] = [],
  previewArtifactId: string | null = null,
): ReferenceNavigationState {
  return {
    schemaVersion: REFERENCE_NAVIGATION_SCHEMA_VERSION,
    selectedArtifactIds: [...selectedArtifactIds],
    previewArtifactId,
    updatedAt,
  };
}
