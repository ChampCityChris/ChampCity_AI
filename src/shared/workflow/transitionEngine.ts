import { assertRoleGate } from "./roleGates";
import {
  assertExecutableProcessConformance,
  defaultLifecycleActionTemplates,
  type WorkflowActionTemplate,
} from "./processContract";
import {
  WORKFLOW_STATE_SCHEMA_VERSION,
  closeoutEligibleCandidateResolutionStatuses,
  createEmptyStageStates,
  projectRoutedAction,
  type CandidateResolutionStatus,
  type PhaseExecutionState,
  type RoutedActionContract,
  type RoutedActionRoutes,
  type WorkCardCandidateExecutionState,
  type WorkCardPlanAuthorityStatus,
  type WorkflowActionRecord,
  type WorkflowBlocker,
  type WorkflowRole,
  type WorkflowScreenId,
  type WorkflowStage,
  type WorkflowStateIndex,
  type WorkflowTransitionRoute,
} from "./workflowContracts";

export interface WorkflowActionBinding {
  targetArtifactId: string | null;
  sourceArtifactIds: string[];
  expectedOutputArtifactId: string;
}

export interface ExecutableTransitionRule {
  actionId: string;
  processId: WorkflowActionTemplate["processId"];
  processClassification: WorkflowActionTemplate["processClassification"];
  advancesWorkflowState: boolean;
  stage: WorkflowStage;
  role: WorkflowRole;
  screenId: WorkflowScreenId;
  expectedOutputArtifactType: string;
  routes: RoutedActionRoutes;
}

export interface CreateWorkflowStateInput {
  workflowStateArtifactId?: string;
  projectId: string;
  activePhaseId?: string | null;
  createdAt: string;
  initialActionId: string;
  actions: readonly WorkflowActionRecord[];
  phaseExecution?: PhaseExecutionState;
}

export interface CreatePhaseExecutionStateInput {
  workCardPlanArtifactId: string | null;
  workCardPlanAuthority: WorkCardPlanAuthorityStatus;
  approvedCandidates: readonly WorkCardCandidateExecutionState[];
  activeCandidateId?: string | null;
  activeWorkCardArtifactId?: string | null;
  activeRepairArtifactId?: string | null;
  phaseInterviewRequired?: boolean;
  phaseInterviewArtifactId?: string | null;
}

export interface VerifiedWorkflowTransitionEvidence {
  artifactId: string;
  artifactType: string;
  pairVerified: true;
  registryCommitted: true;
}

export interface AdvanceWorkflowCommand {
  actionId: string;
  stateRevision: number;
  actorRole: WorkflowRole;
  route: WorkflowTransitionRoute;
  evidence: VerifiedWorkflowTransitionEvidence;
  authorization?: {
    decision: "authorized" | "not_authorized";
    artifactId: string;
  };
  candidateDisposition?: {
    candidateId: string;
    status: Extract<
      CandidateResolutionStatus,
      "carried_forward" | "deferred" | "cancelled"
    >;
    rationale: string;
    sourceAuthorityArtifactIds: string[];
  };
  phaseMappingDecision?: {
    phaseInterviewRequired: boolean;
    phaseInterviewArtifactId?: string | null;
  };
  occurredAt: string;
}

export class WorkflowTransitionError extends Error {
  constructor(
    readonly code:
      | "invalid_state"
      | "missing_action"
      | "unsupported_route"
      | "unverified_evidence"
      | "output_identity_mismatch"
      | "authorization_required",
    message: string,
  ) {
    super(message);
    this.name = "WorkflowTransitionError";
  }
}

export const executableTransitionRules: readonly ExecutableTransitionRule[] =
  defaultLifecycleActionTemplates.map((template) => ({
    actionId: template.actionId,
    processId: template.processId,
    processClassification: template.processClassification,
    advancesWorkflowState: template.advancesWorkflowState,
    stage: template.stage,
    role: template.role,
    screenId: template.screenId,
    expectedOutputArtifactType: template.expectedOutputArtifactType,
    routes: { ...template.routes },
  }));

export const executableTransitionRuleByActionId: Readonly<Record<string, ExecutableTransitionRule>> =
  Object.freeze(
    Object.fromEntries(
      executableTransitionRules.map((rule) => [
        rule.actionId,
        Object.freeze({
          ...rule,
          routes: Object.freeze({ ...rule.routes }),
        }),
      ]),
    ),
  ) as Readonly<Record<string, ExecutableTransitionRule>>;

assertExecutableProcessConformance(
  executableTransitionRules.map((rule) => ({
    actionId: rule.actionId,
    processId: rule.processId,
    processClassification: rule.processClassification,
    advancesWorkflowState: rule.advancesWorkflowState,
    stage: rule.stage,
    role: rule.role,
    screenId: rule.screenId,
    targetArtifactId: null,
    sourceArtifactIds: [],
    expectedOutput: {
      artifactId: `champcity-ai/model/${rule.expectedOutputArtifactType}/${rule.actionId}`,
      artifactType: rule.expectedOutputArtifactType,
    },
    routes: { ...rule.routes },
  })),
);

export function requireExecutableTransitionRule(
  actionId: string,
): ExecutableTransitionRule {
  const rule = executableTransitionRuleByActionId[actionId];
  if (!rule) {
    throw new WorkflowTransitionError(
      "missing_action",
      `Action ${actionId} is not defined by the executable transition model.`,
    );
  }
  return {
    ...rule,
    routes: { ...rule.routes },
  };
}

export function materializeActionCatalog(
  templates: readonly WorkflowActionTemplate[],
  bindings: Readonly<Record<string, WorkflowActionBinding>>,
): WorkflowActionRecord[] {
  return templates.map((template) => {
    const binding = bindings[template.actionId];
    if (!binding) {
      throw new WorkflowTransitionError(
        "missing_action",
        `No artifact identity binding was supplied for ${template.actionId}.`,
      );
    }
    return {
      actionId: template.actionId,
      processId: template.processId,
      processClassification: template.processClassification,
      advancesWorkflowState: template.advancesWorkflowState,
      stage: template.stage,
      role: template.role,
      screenId: template.screenId,
      targetArtifactId: binding.targetArtifactId,
      sourceArtifactIds: [...binding.sourceArtifactIds],
      expectedOutput: {
        artifactId: binding.expectedOutputArtifactId,
        artifactType: template.expectedOutputArtifactType,
      },
      routes: { ...template.routes },
    };
  });
}

export function createPhaseExecutionState(
  input: CreatePhaseExecutionStateInput,
): PhaseExecutionState {
  const approvedCandidates = [...input.approvedCandidates]
    .map(copyCandidate)
    .sort((left, right) => left.order - right.order || left.candidateId.localeCompare(right.candidateId));
  assertCandidateOrdering(approvedCandidates);
  const earliestUnresolvedCandidateId =
    selectEarliestUnresolvedCandidate(approvedCandidates)?.candidateId ?? null;
  const activeCandidateId = input.activeCandidateId ?? earliestUnresolvedCandidateId;
  const closeoutEligibility = evaluatePhaseCloseoutEligibility({
    workCardPlanArtifactId: input.workCardPlanArtifactId,
    workCardPlanAuthority: input.workCardPlanAuthority,
    approvedCandidates,
    activeRepairArtifactId: input.activeRepairArtifactId ?? null,
  });
  return {
    workCardPlanArtifactId: input.workCardPlanArtifactId,
    workCardPlanAuthority: input.workCardPlanAuthority,
    approvedCandidates,
    activeCandidateId,
    activeWorkCardArtifactId: input.activeWorkCardArtifactId ?? null,
    activeRepairArtifactId: input.activeRepairArtifactId ?? null,
    earliestUnresolvedCandidateId,
    closeoutEligibility,
    phaseInterviewRequired: input.phaseInterviewRequired ?? false,
    phaseInterviewArtifactId: input.phaseInterviewArtifactId ?? null,
  };
}

export function createMissingPhaseExecutionState(): PhaseExecutionState {
  return createPhaseExecutionState({
    workCardPlanArtifactId: null,
    workCardPlanAuthority: "missing",
    approvedCandidates: [],
  });
}

export function selectEarliestUnresolvedCandidate(
  candidates: readonly WorkCardCandidateExecutionState[],
): WorkCardCandidateExecutionState | null {
  return (
    [...candidates]
      .sort((left, right) => left.order - right.order || left.candidateId.localeCompare(right.candidateId))
      .find((candidate) => candidate.resolutionStatus === "unresolved") ?? null
  );
}

export function evaluatePhaseCloseoutEligibility(input: {
  workCardPlanArtifactId: string | null;
  workCardPlanAuthority: WorkCardPlanAuthorityStatus;
  approvedCandidates: readonly WorkCardCandidateExecutionState[];
  activeRepairArtifactId: string | null;
}): PhaseExecutionState["closeoutEligibility"] {
  const blockers: WorkflowBlocker[] = [];
  if (input.workCardPlanAuthority === "missing" || !input.workCardPlanArtifactId) {
    blockers.push(blocker(
      "work_card_plan_missing",
      "Phase Closeout requires an authoritative approved Work Card Plan.",
      "architect",
      input.workCardPlanArtifactId ? [input.workCardPlanArtifactId] : [],
    ));
  } else if (input.workCardPlanAuthority === "unsynchronized") {
    blockers.push(blocker(
      "work_card_plan_unsynchronized",
      "The approved Work Card Plan pair must be synchronized before Phase Closeout.",
      "application",
      [input.workCardPlanArtifactId],
    ));
  } else if (input.workCardPlanAuthority === "ambiguous") {
    blockers.push(blocker(
      "candidate_authority_ambiguous",
      "Work Card candidate authority is ambiguous and must be reconciled before Phase Closeout.",
      "architect",
      [input.workCardPlanArtifactId],
    ));
  }
  if (input.approvedCandidates.length === 0) {
    blockers.push(blocker(
      "candidate_authority_ambiguous",
      "The approved Work Card Plan does not contain an ordered candidate authority.",
      "architect",
      input.workCardPlanArtifactId ? [input.workCardPlanArtifactId] : [],
    ));
  }
  for (const candidate of input.approvedCandidates) {
    if (
      !closeoutEligibleCandidateResolutionStatuses.includes(
        candidate.resolutionStatus as (typeof closeoutEligibleCandidateResolutionStatuses)[number],
      )
    ) {
      blockers.push(blocker(
        "candidate_unresolved",
        `Work Card candidate ${candidate.candidateId} is unresolved; record explicit resolution evidence before Phase Closeout.`,
        "architect",
        candidate.fullWorkCardArtifactId ? [candidate.fullWorkCardArtifactId] : [],
      ));
    }
  }
  if (input.activeRepairArtifactId) {
    blockers.push(blocker(
      "active_repair_unresolved",
      "The active repair obligation must be resolved before Phase Closeout.",
      "implementer",
      [input.activeRepairArtifactId],
    ));
  }
  return { eligible: blockers.length === 0, blockers };
}

export function resolvePhaseCandidate(
  phaseExecution: PhaseExecutionState,
  input: {
    candidateId: string;
    resolutionStatus: Exclude<CandidateResolutionStatus, "unresolved">;
    evidenceArtifactId: string;
  },
): PhaseExecutionState {
  if (!input.evidenceArtifactId.trim()) {
    throw new WorkflowTransitionError(
      "unverified_evidence",
      "Candidate resolution requires an explicit evidence artifact identity.",
    );
  }
  const candidates = phaseExecution.approvedCandidates.map((candidate) =>
    candidate.candidateId === input.candidateId
      ? {
          ...copyCandidate(candidate),
          fullWorkCardStatus: "resolved" as const,
          resolutionStatus: input.resolutionStatus,
          resolutionEvidenceArtifactIds: uniqueArtifactIds([
            ...candidate.resolutionEvidenceArtifactIds,
            input.evidenceArtifactId,
          ]),
        }
      : copyCandidate(candidate),
  );
  if (!candidates.some((candidate) => candidate.candidateId === input.candidateId)) {
    throw new WorkflowTransitionError(
      "invalid_state",
      `Candidate ${input.candidateId} is not in the approved Work Card Plan.`,
    );
  }
  const earliest = selectEarliestUnresolvedCandidate(candidates);
  const activeCandidate = earliest ?? null;
  return createPhaseExecutionState({
    workCardPlanArtifactId: phaseExecution.workCardPlanArtifactId,
    workCardPlanAuthority: phaseExecution.workCardPlanAuthority,
    approvedCandidates: candidates,
    activeCandidateId: activeCandidate?.candidateId ?? null,
    activeWorkCardArtifactId: activeCandidate?.fullWorkCardArtifactId ?? null,
    activeRepairArtifactId:
      phaseExecution.activeCandidateId === input.candidateId
        ? null
        : phaseExecution.activeRepairArtifactId,
  });
}

export function createWorkflowStateIndex(input: CreateWorkflowStateInput): WorkflowStateIndex {
  assertExecutableProcessConformance(input.actions);
  const actionCatalog = Object.fromEntries(
    input.actions.map((item) => [item.actionId, copyActionRecord(item)]),
  );
  if (Object.keys(actionCatalog).length !== input.actions.length) {
    throw new WorkflowTransitionError("invalid_state", "Workflow action IDs must be unique.");
  }
  const initialAction = actionCatalog[input.initialActionId];
  if (!initialAction) {
    throw new WorkflowTransitionError(
      "missing_action",
      `Initial action ${input.initialActionId} is not in the workflow catalog.`,
    );
  }
  const workflowStateArtifactId =
    input.workflowStateArtifactId ?? "champcity-ai/system/workflow_state";
  const stageStates = createEmptyStageStates();
  stageStates[initialAction.stage] = {
    stage: initialAction.stage,
    progress: "active",
    startedAt: input.createdAt,
    completedAt: null,
  };
  const currentAction = projectRoutedAction(workflowStateArtifactId, 1, initialAction);
  const phaseExecution = input.phaseExecution
    ? copyPhaseExecutionState(input.phaseExecution)
    : createMissingPhaseExecutionState();
  return {
    schemaVersion: WORKFLOW_STATE_SCHEMA_VERSION,
    workflowStateArtifactId,
    projectId: input.projectId,
    stateRevision: 1,
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
    currentStage: initialAction.stage,
    activePhaseId: input.activePhaseId ?? null,
    currentActionId: initialAction.actionId,
    responsibleRole: initialAction.role,
    authoritativeTargetArtifactId: initialAction.targetArtifactId,
    requiredSourceArtifactIds: [...initialAction.sourceArtifactIds],
    expectedOutput: { ...initialAction.expectedOutput },
    routes: { ...initialAction.routes },
    blockingConditions: [],
    currentAction,
    stageStates,
    actionCatalog,
    phaseExecution,
    openRepairChain: {
      status: "none",
      rootWorkCardArtifactId: null,
      activeRepairArtifactIds: [],
      latestDispositionArtifactId: null,
    },
    closeout: { status: "not_started", closeoutArtifactId: null, approvalArtifactId: null },
    roadmap: { status: "not_started", roadmapArtifactId: null },
    nextPhase: { status: "not_ready", phaseId: null, activationArtifactId: null },
    transitionHistory: [],
  };
}

export function withWorkflowBlockers(
  state: WorkflowStateIndex,
  blockers: WorkflowStateIndex["blockingConditions"],
  updatedAt: string,
): WorkflowStateIndex {
  const copied = blockers.map((item) => ({ ...item, artifactIds: [...item.artifactIds] }));
  const record = state.currentActionId
    ? state.actionCatalog[state.currentActionId]
    : undefined;
  const currentAction = record
    ? projectRoutedAction(state.workflowStateArtifactId, state.stateRevision, record, copied)
    : null;
  const stageStates = copyStageStates(state.stageStates);
  if (record && copied.length > 0) stageStates[record.stage].progress = "blocked";
  return {
    ...state,
    updatedAt,
    blockingConditions: copied,
    currentAction,
    stageStates,
  };
}

function blocker(
  code: WorkflowBlocker["code"],
  message: string,
  ownerRole: WorkflowRole,
  artifactIds: readonly string[],
): WorkflowBlocker {
  return {
    code,
    message,
    ownerRole,
    artifactIds: uniqueArtifactIds(artifactIds),
    blocking: true,
  };
}

function uniqueArtifactIds(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
}

function copyBlocker(item: WorkflowBlocker): WorkflowBlocker {
  return { ...item, artifactIds: [...item.artifactIds] };
}

function copyCandidate(
  candidate: WorkCardCandidateExecutionState,
): WorkCardCandidateExecutionState {
  return {
    ...candidate,
    resolutionEvidenceArtifactIds: [
      ...candidate.resolutionEvidenceArtifactIds,
    ],
  };
}

function copyPhaseExecutionState(
  phaseExecution: PhaseExecutionState,
): PhaseExecutionState {
  return {
    ...phaseExecution,
    approvedCandidates: phaseExecution.approvedCandidates.map(copyCandidate),
    closeoutEligibility: {
      eligible: phaseExecution.closeoutEligibility.eligible,
      blockers: phaseExecution.closeoutEligibility.blockers.map(copyBlocker),
    },
    phaseInterviewRequired: phaseExecution.phaseInterviewRequired,
    phaseInterviewArtifactId: phaseExecution.phaseInterviewArtifactId,
  };
}

function assertCandidateOrdering(
  candidates: readonly WorkCardCandidateExecutionState[],
): void {
  const ids = new Set<string>();
  const orders = new Set<number>();
  for (const candidate of candidates) {
    if (!candidate.candidateId.trim() || !Number.isInteger(candidate.order) || candidate.order < 1) {
      throw new WorkflowTransitionError(
        "invalid_state",
        "Each approved Work Card candidate requires a non-empty ID and positive integer order.",
      );
    }
    if (ids.has(candidate.candidateId) || orders.has(candidate.order)) {
      throw new WorkflowTransitionError(
        "invalid_state",
        "Approved Work Card candidate IDs and order values must be unique.",
      );
    }
    ids.add(candidate.candidateId);
    orders.add(candidate.order);
  }
}

function copyActionRecord(item: WorkflowActionRecord): WorkflowActionRecord {
  return {
    ...item,
    sourceArtifactIds: [...item.sourceArtifactIds],
    expectedOutput: { ...item.expectedOutput },
    routes: { ...item.routes },
  };
}

function copyActionCatalog(
  catalog: Record<string, WorkflowActionRecord>,
): Record<string, WorkflowActionRecord> {
  return Object.fromEntries(
    Object.entries(catalog).map(([id, item]) => [id, copyActionRecord(item)]),
  );
}

function copyStageStates(
  states: WorkflowStateIndex["stageStates"],
): WorkflowStateIndex["stageStates"] {
  return Object.fromEntries(
    Object.entries(states).map(([stage, value]) => [stage, { ...value }]),
  ) as WorkflowStateIndex["stageStates"];
}

function updateRepairChain(
  state: WorkflowStateIndex,
  current: RoutedActionContract,
  nextAction: WorkflowActionRecord | null,
  command: AdvanceWorkflowCommand,
): WorkflowStateIndex["openRepairChain"] {
  const chain = {
    ...state.openRepairChain,
    activeRepairArtifactIds: [...state.openRepairChain.activeRepairArtifactIds],
  };
  if (command.route === "repair" || nextAction?.actionId === "repair_work_card_required") {
    return {
      status: "open",
      rootWorkCardArtifactId: chain.rootWorkCardArtifactId ?? current.targetArtifactId,
      activeRepairArtifactIds: chain.activeRepairArtifactIds,
      latestDispositionArtifactId:
        current.actionId === "architect_disposition_required"
          ? command.evidence.artifactId
          : chain.latestDispositionArtifactId,
    };
  }
  if (current.actionId === "repair_work_card_required") {
    return {
      status: "open",
      rootWorkCardArtifactId: chain.rootWorkCardArtifactId,
      activeRepairArtifactIds: Array.from(
        new Set([...chain.activeRepairArtifactIds, command.evidence.artifactId]),
      ),
      latestDispositionArtifactId: chain.latestDispositionArtifactId,
    };
  }
  if (
    chain.status === "open" &&
    current.actionId === "operator_validation_required" &&
    command.route === "success"
  ) {
    return { ...chain, status: "resolved", activeRepairArtifactIds: [] };
  }
  return chain;
}

function updateCloseoutState(
  state: WorkflowStateIndex,
  current: RoutedActionContract,
  nextAction: WorkflowActionRecord | null,
  phaseExecution: PhaseExecutionState,
  command: AdvanceWorkflowCommand,
): WorkflowStateIndex["closeout"] {
  if (current.actionId === "phase_closeout_required" && command.route === "success") {
    return {
      status: "pending_approval",
      closeoutArtifactId: command.evidence.artifactId,
      approvalArtifactId: null,
    };
  }
  if (current.actionId === "operator_phase_closeout_approval_required") {
    return command.route === "success"
      ? {
          status: "approved",
          closeoutArtifactId: state.closeout.closeoutArtifactId,
          approvalArtifactId: command.evidence.artifactId,
        }
      : { ...state.closeout, status: "in_progress" };
  }
  if (nextAction?.actionId === "phase_closeout_required") {
    return {
      ...state.closeout,
      status: phaseExecution.closeoutEligibility.eligible
        ? "in_progress"
        : "blocked",
    };
  }
  return { ...state.closeout };
}

function updateRoadmapState(
  state: WorkflowStateIndex,
  current: RoutedActionContract,
  command: AdvanceWorkflowCommand,
): WorkflowStateIndex["roadmap"] {
  if (
    current.actionId === "operator_phase_closeout_approval_required" &&
    command.route === "success"
  ) {
    return { status: "pending_update", roadmapArtifactId: state.roadmap.roadmapArtifactId };
  }
  if (current.actionId === "roadmap_update_required" && command.route === "success") {
    return { status: "updated", roadmapArtifactId: command.evidence.artifactId };
  }
  return { ...state.roadmap };
}

function updateNextPhaseState(
  state: WorkflowStateIndex,
  current: RoutedActionContract,
  command: AdvanceWorkflowCommand,
): WorkflowStateIndex["nextPhase"] {
  if (current.actionId === "roadmap_update_required" && command.route === "success") {
    return { ...state.nextPhase, status: "ready" };
  }
  if (current.actionId === "next_phase_activation_required" && command.route === "success") {
    return {
      ...state.nextPhase,
      status: "activated",
      activationArtifactId: command.evidence.artifactId,
    };
  }
  if (current.actionId === "workflow_complete" && command.route === "success") {
    return { ...state.nextPhase, status: "project_complete" };
  }
  return { ...state.nextPhase };
}
