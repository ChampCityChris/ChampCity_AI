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

export function advanceWorkflowState(
  state: WorkflowStateIndex,
  command: AdvanceWorkflowCommand,
): WorkflowStateIndex {
  const current = state.currentAction;
  if (!current) {
    throw new WorkflowTransitionError("invalid_state", "The workflow has no current action.");
  }
  assertRoleGate(state, current, {
    actorRole: command.actorRole,
    actionId: command.actionId,
    stateRevision: command.stateRevision,
    outputArtifactId: command.evidence.artifactId,
    outputArtifactType: command.evidence.artifactType,
  });
  if (!command.evidence.pairVerified || !command.evidence.registryCommitted) {
    throw new WorkflowTransitionError(
      "unverified_evidence",
      "Workflow state can advance only after pair verification and registry commit.",
    );
  }
  if (
    command.evidence.artifactId !== current.expectedOutput.artifactId ||
    command.evidence.artifactType !== current.expectedOutput.artifactType
  ) {
    throw new WorkflowTransitionError(
      "output_identity_mismatch",
      "Transition evidence does not match the routed action's expected output.",
    );
  }
  if (
    current.screenId === "architect-review" &&
    command.route === "success" &&
    (command.authorization?.decision !== "authorized" ||
      command.authorization.artifactId !== command.evidence.artifactId)
  ) {
    throw new WorkflowTransitionError(
      "authorization_required",
      "Architect Review must explicitly authorize Operator Validation before that route can advance.",
    );
  }
  const nextPhaseExecution = advancePhaseExecution(state, current, command);
  const nextActionId = resolveNextActionId(
    current,
    command,
    nextPhaseExecution,
  );
  if (nextActionId === null && current.actionId !== "workflow_complete") {
    throw new WorkflowTransitionError(
      "unsupported_route",
      `Action ${current.actionId} does not define a ${command.route} route.`,
    );
  }
  const persistedNextAction =
    nextActionId === null ? null : state.actionCatalog[nextActionId];
  if (nextActionId !== null && !persistedNextAction) {
    throw new WorkflowTransitionError(
      "missing_action",
      `Routed action ${nextActionId} is not in the persisted action catalog.`,
    );
  }

  const nextAction = persistedNextAction
    ? rebindWorkCardLoopAction(
        state,
        current,
        persistedNextAction,
        command,
        nextPhaseExecution,
      )
    : null;
  const nextActionCatalog = copyActionCatalog(state.actionCatalog);
  if (nextAction) nextActionCatalog[nextAction.actionId] = copyActionRecord(nextAction);

  const nextRevision = state.stateRevision + 1;
  const stageStates = copyStageStates(state.stageStates);
  stageStates[current.stage] = {
    ...stageStates[current.stage],
    progress: "complete",
    completedAt: command.occurredAt,
  };
  if (nextAction) {
    const prior = stageStates[nextAction.stage];
    stageStates[nextAction.stage] = {
      stage: nextAction.stage,
      progress: "active",
      startedAt: prior.startedAt ?? command.occurredAt,
      completedAt: null,
    };
  }
  const nextBlockers = deriveNextActionBlockers(
    nextAction,
    nextPhaseExecution,
  );
  if (nextAction && nextBlockers.length > 0) {
    stageStates[nextAction.stage].progress = "blocked";
  }
  const nextContract = nextAction
    ? projectRoutedAction(
        state.workflowStateArtifactId,
        nextRevision,
        nextAction,
        nextBlockers,
      )
    : null;
  return {
    ...state,
    stateRevision: nextRevision,
    updatedAt: command.occurredAt,
    currentStage: nextAction?.stage ?? state.currentStage,
    currentActionId: nextAction?.actionId ?? null,
    responsibleRole: nextAction?.role ?? null,
    authoritativeTargetArtifactId: nextAction?.targetArtifactId ?? null,
    requiredSourceArtifactIds: nextAction ? [...nextAction.sourceArtifactIds] : [],
    expectedOutput: nextAction ? { ...nextAction.expectedOutput } : null,
    routes: nextAction ? { ...nextAction.routes } : null,
    blockingConditions: nextBlockers.map(copyBlocker),
    currentAction: nextContract,
    stageStates,
    actionCatalog: nextActionCatalog,
    phaseExecution: nextPhaseExecution,
    openRepairChain: updateRepairChain(state, current, nextAction, command),
    closeout: updateCloseoutState(
      state,
      current,
      nextAction,
      nextPhaseExecution,
      command,
    ),
    roadmap: updateRoadmapState(state, current, command),
    nextPhase: updateNextPhaseState(state, current, command),
    transitionHistory: [
      ...state.transitionHistory.map((record) => ({ ...record })),
      {
        fromActionId: current.actionId,
        toActionId: nextAction?.actionId ?? null,
        route: command.route,
        actorRole: command.actorRole,
        evidenceArtifactId: command.evidence.artifactId,
        evidenceArtifactType: command.evidence.artifactType,
        fromStateRevision: state.stateRevision,
        toStateRevision: nextRevision,
        occurredAt: command.occurredAt,
      },
    ],
  };
}

/**
 * Work Card identities become knowable only after the preceding canonical
 * output commits. Rebind the next persisted action from that verified
 * evidence instead of carrying a template/placeholder identity forward.
 */
function advancePhaseExecution(
  state: WorkflowStateIndex,
  current: RoutedActionContract,
  command: AdvanceWorkflowCommand,
): PhaseExecutionState {
  if (command.candidateDisposition) {
    if (current.actionId !== "candidate_disposition_required") {
      throw new WorkflowTransitionError(
        "invalid_state",
        "A governed candidate disposition can be recorded only from the Operator-owned candidate disposition action.",
      );
    }
    if (
      !command.candidateDisposition.rationale.trim() ||
      command.candidateDisposition.sourceAuthorityArtifactIds.length === 0 ||
      command.candidateDisposition.sourceAuthorityArtifactIds.some(
        (artifactId) => !current.sourceArtifactIds.includes(artifactId),
      )
    ) {
      throw new WorkflowTransitionError(
        "unverified_evidence",
        "Candidate disposition requires a rationale and explicit source authority from the routed action.",
      );
    }
    return resolvePhaseCandidate(state.phaseExecution, {
      candidateId: command.candidateDisposition.candidateId,
      resolutionStatus: command.candidateDisposition.status,
      evidenceArtifactId: command.evidence.artifactId,
    });
  }
  if (
    current.actionId === "phase_mapping_required" &&
    command.route === "success"
  ) {
    return createPhaseExecutionState({
      ...copyPhaseExecutionState(state.phaseExecution),
      phaseInterviewRequired:
        command.phaseMappingDecision?.phaseInterviewRequired ?? false,
      phaseInterviewArtifactId:
        command.phaseMappingDecision?.phaseInterviewRequired === true
          ? command.phaseMappingDecision.phaseInterviewArtifactId ?? null
          : null,
    });
  }
  if (
    current.actionId !== "operator_validation_required" ||
    command.route !== "success"
  ) {
    return copyPhaseExecutionState(state.phaseExecution);
  }
  const target = current.targetArtifactId
    ? parseCanonicalArtifactId(current.targetArtifactId)
    : null;
  const workCardId = target?.artifactType === "work_card" ? target.logicalId : null;
  const candidateId = workCardId?.match(/^(WC\d+)/i)?.[1]?.toUpperCase() ?? null;
  if (
    !candidateId ||
    !state.phaseExecution.approvedCandidates.some(
      (candidate) => candidate.candidateId === candidateId,
    )
  ) {
    return copyPhaseExecutionState(state.phaseExecution);
  }
  return resolvePhaseCandidate(state.phaseExecution, {
    candidateId,
    resolutionStatus: /-REPAIR\d+$/i.test(workCardId ?? "")
      ? "completed_via_repair"
      : "completed",
    evidenceArtifactId: command.evidence.artifactId,
  });
}

function resolveNextActionId(
  current: RoutedActionContract,
  command: AdvanceWorkflowCommand,
  phaseExecution: PhaseExecutionState,
): string | null {
  const candidateResolutionCompleted =
    (current.actionId === "operator_validation_required" &&
      command.route === "success") ||
    Boolean(command.candidateDisposition);
  if (!candidateResolutionCompleted) return current.routes[command.route];
  if (phaseExecution.earliestUnresolvedCandidateId) {
    return "work_card_authoring_required";
  }
  return "phase_closeout_required";
}

function rebindWorkCardLoopAction(
  state: WorkflowStateIndex,
  current: RoutedActionContract,
  next: WorkflowActionRecord,
  command: AdvanceWorkflowCommand,
  phaseExecution: PhaseExecutionState,
): WorkflowActionRecord {
  if (next.actionId === "operator_phase_approval_required") {
    const withoutPhaseInterview = next.sourceArtifactIds.filter(
      (artifactId) => !isPhaseInterviewArtifactId(artifactId),
    );
    return {
      ...copyActionRecord(next),
      sourceArtifactIds:
        phaseExecution.phaseInterviewRequired &&
        phaseExecution.phaseInterviewArtifactId
          ? uniqueArtifactIds([
              ...withoutPhaseInterview,
              phaseExecution.phaseInterviewArtifactId,
            ])
          : withoutPhaseInterview,
    };
  }
  if (next.actionId === "work_card_authoring_required") {
    const candidate = selectEarliestUnresolvedCandidate(
      phaseExecution.approvedCandidates,
    );
    if (candidate && state.activePhaseId) {
      return {
        ...next,
        targetArtifactId: phaseExecution.workCardPlanArtifactId,
        sourceArtifactIds: uniqueArtifactIds([
          ...(phaseExecution.workCardPlanArtifactId
            ? [phaseExecution.workCardPlanArtifactId]
            : []),
          ...next.sourceArtifactIds.filter((artifactId) =>
            artifactId.includes("/approval/"),
          ),
        ]),
        expectedOutput: {
          artifactId: `champcity-ai/${state.activePhaseId}/work_card/${candidate.candidateId}`,
          artifactType: "work_card",
        },
        routes: { ...next.routes },
      };
    }
  }
  const output = command.evidence.artifactId;
  const evidenceParts = parseCanonicalArtifactId(output);
  const currentTargetParts = current.targetArtifactId
    ? parseCanonicalArtifactId(current.targetArtifactId)
    : null;
  const workCardId =
    evidenceParts?.artifactType === "work_card"
      ? evidenceParts.logicalId
      : currentTargetParts?.artifactType === "work_card"
        ? currentTargetParts.logicalId
        : null;
  const phaseId =
    evidenceParts?.scope.startsWith("phase-") === true
      ? evidenceParts.scope
      : currentTargetParts?.scope.startsWith("phase-") === true
        ? currentTargetParts.scope
        : state.activePhaseId;

  if (!workCardId || !phaseId) return copyActionRecord(next);

  const targetArtifactId =
    evidenceParts?.artifactType === "work_card"
      ? output
      : current.targetArtifactId;
  if (!targetArtifactId) return copyActionRecord(next);

  const dynamicOutputTypes: Readonly<Record<string, string>> = {
    operator_work_card_approval_required: "work_card_approval",
    implementer_execution_required: "implementer_report",
    architect_review_of_implementer_report_required: "architect_review",
    operator_validation_required: "validation_report",
    architect_disposition_required: "candidate_disposition",
    candidate_disposition_required: "candidate_disposition",
  };
  const artifactType = dynamicOutputTypes[next.actionId];
  if (!artifactType) return copyActionRecord(next);

  return {
    ...next,
    targetArtifactId,
    sourceArtifactIds: uniqueArtifactIds([
      ...(next.actionId === "operator_work_card_approval_required"
        ? [targetArtifactId]
        : next.actionId === "implementer_execution_required" ||
            next.actionId === "candidate_disposition_required"
          ? [targetArtifactId, output]
          : [output]),
    ]),
    expectedOutput: {
      artifactId: `champcity-ai/${phaseId}/${artifactType}/${workCardId}`,
      artifactType,
    },
    routes: { ...next.routes },
  };
}

function parseCanonicalArtifactId(
  artifactId: string,
): { scope: string; artifactType: string; logicalId: string } | null {
  const parts = artifactId.split("/");
  if (parts.length < 4 || parts[0] !== "champcity-ai") return null;
  const logicalId = parts.slice(3).join("/");
  if (!parts[1] || !parts[2] || !logicalId) return null;
  return { scope: parts[1], artifactType: parts[2], logicalId };
}

function uniqueArtifactIds(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
}

function isPhaseInterviewArtifactId(artifactId: string): boolean {
  return (
    artifactId.includes("/phase_interview/") ||
    /\/architect_interview\/Phase_Interview(?:\/|$)/i.test(artifactId)
  );
}

function deriveNextActionBlockers(
  nextAction: WorkflowActionRecord | null,
  phaseExecution: PhaseExecutionState,
): WorkflowBlocker[] {
  if (nextAction?.actionId === "phase_closeout_required") {
    return phaseExecution.closeoutEligibility.blockers.map(copyBlocker);
  }
  if (
    nextAction?.actionId === "operator_phase_approval_required" &&
    phaseExecution.phaseInterviewRequired &&
    !phaseExecution.phaseInterviewArtifactId
  ) {
    return [
      blocker(
        "missing_authority",
        "Phase Mapping explicitly requires a Phase Interview, but no canonical Phase Interview authority was supplied.",
        "architect",
        [],
      ),
    ];
  }
  return [];
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
