import { assertRoleGate } from "./roleGates";
import {
  WORKFLOW_STATE_SCHEMA_VERSION,
  createEmptyStageStates,
  projectRoutedAction,
  type RoutedActionContract,
  type RoutedActionRoutes,
  type WorkflowActionRecord,
  type WorkflowRole,
  type WorkflowScreenId,
  type WorkflowStage,
  type WorkflowStateIndex,
  type WorkflowTransitionRoute,
} from "./workflowContracts";

export interface WorkflowActionTemplate {
  actionId: string;
  stage: WorkflowStage;
  role: WorkflowRole;
  screenId: WorkflowScreenId;
  expectedOutputArtifactType: string;
  routes: RoutedActionRoutes;
}

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

export const defaultLifecycleActionTemplates: readonly WorkflowActionTemplate[] = [
  action("project_intake_required", "capture", "operator", "project-intake", "project_intake", "project_architect_interview_required"),
  action("project_architect_interview_required", "frame", "architect", "project-architect-interview", "architect_interview", "project_planning_required"),
  action("project_planning_required", "plan", "architect", "project-planning", "project_planning", "repository_reconciliation_required"),
  action("repository_reconciliation_required", "plan", "architect", "repository-reconciliation", "repository_reconciliation", "project_roadmap_required"),
  action("project_roadmap_required", "plan", "architect", "project-roadmap", "roadmap", "operator_project_approval_required"),
  action("operator_project_approval_required", "plan", "operator", "operator-project-approval", "project_approval", "phase_mapping_required", "project_planning_required", "project_planning_required"),
  action("phase_mapping_required", "plan", "architect", "phase-mapping", "phase_map", "phase_intake_required"),
  action("phase_intake_required", "capture", "operator", "phase-intake", "phase_intake", "phase_architect_interview_required"),
  action("phase_architect_interview_required", "frame", "architect", "phase-architect-interview", "architect_interview", "phase_planning_required"),
  action("phase_planning_required", "plan", "architect", "phase-planning", "phase_planning", "work_card_plan_review_required"),
  action("work_card_plan_review_required", "plan", "architect", "work-card-plan-review", "work_card_plan_review", "operator_phase_approval_required"),
  action("operator_phase_approval_required", "plan", "operator", "operator-phase-approval", "phase_approval", "work_card_authoring_required", "phase_planning_required", "phase_planning_required"),
  action("work_card_authoring_required", "plan", "architect", "work-card-authoring", "work_card", "operator_work_card_approval_required"),
  action("operator_work_card_approval_required", "build", "operator", "operator-work-card-approval", "work_card_approval", "implementer_handoff_required", "work_card_authoring_required", "work_card_authoring_required"),
  action("implementer_handoff_required", "build", "architect", "implementer-handoff", "implementer_execution_packet", "implementer_execution_required"),
  action("implementer_execution_required", "build", "implementer", "implementer-execution", "implementer_report", "architect_review_of_implementer_report_required"),
  action("architect_review_of_implementer_report_required", "prove", "architect", "architect-review", "architect_review", "operator_validation_required", "architect_review_of_implementer_report_required", "architect_disposition_required"),
  action("operator_validation_required", "prove", "operator", "operator-validation", "validation_report", "phase_closeout_required", "architect_disposition_required", "architect_disposition_required"),
  action("architect_disposition_required", "prove", "architect", "architect-disposition", "architect_disposition", "phase_closeout_required", "repair_work_card_required", "repair_work_card_required"),
  action("repair_work_card_required", "plan", "architect", "repair-work-card-authoring", "work_card", "operator_work_card_approval_required"),
  action("phase_closeout_required", "prove", "architect", "phase-closeout", "phase_closeout", "operator_closeout_approval_required"),
  action("operator_closeout_approval_required", "prove", "operator", "operator-closeout-approval", "phase_closeout_approval", "roadmap_update_required", "phase_closeout_required", "phase_closeout_required"),
  action("roadmap_update_required", "prove", "application", "roadmap-update", "roadmap", "next_phase_activation_required"),
  action("next_phase_activation_required", "capture", "application", "next-phase-activation", "phase_activation", "workflow_complete"),
  action("route_review_request_required", "prove", "operator", "route-review-request", "route_review_request", null),
  action("workflow_complete", "prove", "application", "workflow-complete", "workflow_completion", null),
] as const;

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

export function createWorkflowStateIndex(input: CreateWorkflowStateInput): WorkflowStateIndex {
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
  const nextActionId = current.routes[command.route];
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
    ? rebindWorkCardLoopAction(state, current, persistedNextAction, command)
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
  const nextContract = nextAction
    ? projectRoutedAction(state.workflowStateArtifactId, nextRevision, nextAction)
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
    blockingConditions: [],
    currentAction: nextContract,
    stageStates,
    actionCatalog: nextActionCatalog,
    openRepairChain: updateRepairChain(state, current, nextAction, command),
    closeout: updateCloseoutState(state, current, command),
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
function rebindWorkCardLoopAction(
  state: WorkflowStateIndex,
  current: RoutedActionContract,
  next: WorkflowActionRecord,
  command: AdvanceWorkflowCommand,
): WorkflowActionRecord {
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
    implementer_handoff_required: "implementer_execution_packet",
    implementer_execution_required: "implementer_report",
    architect_review_of_implementer_report_required: "architect_review",
    operator_validation_required: "validation_report",
    architect_disposition_required: "architect_disposition",
  };
  const artifactType = dynamicOutputTypes[next.actionId];
  if (!artifactType) return copyActionRecord(next);

  return {
    ...next,
    targetArtifactId,
    sourceArtifactIds: uniqueArtifactIds([
      ...(next.actionId === "operator_work_card_approval_required"
        ? [targetArtifactId]
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

function action(
  actionId: string,
  stage: WorkflowStage,
  role: WorkflowRole,
  screenId: WorkflowScreenId,
  expectedOutputArtifactType: string,
  success: string | null,
  failure: string | null = null,
  repair: string | null = null,
): WorkflowActionTemplate {
  return {
    actionId,
    stage,
    role,
    screenId,
    expectedOutputArtifactType,
    routes: { success, failure, repair },
  };
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
    return { ...chain, status: "resolved" };
  }
  return chain;
}

function updateCloseoutState(
  state: WorkflowStateIndex,
  current: RoutedActionContract,
  command: AdvanceWorkflowCommand,
): WorkflowStateIndex["closeout"] {
  if (current.actionId === "phase_closeout_required" && command.route === "success") {
    return {
      status: "pending_approval",
      closeoutArtifactId: command.evidence.artifactId,
      approvalArtifactId: null,
    };
  }
  if (current.actionId === "operator_closeout_approval_required") {
    return command.route === "success"
      ? {
          status: "approved",
          closeoutArtifactId: state.closeout.closeoutArtifactId,
          approvalArtifactId: command.evidence.artifactId,
        }
      : { ...state.closeout, status: "in_progress" };
  }
  if (current.routes.success === "phase_closeout_required" && command.route === "success") {
    return { ...state.closeout, status: "in_progress" };
  }
  return { ...state.closeout };
}

function updateRoadmapState(
  state: WorkflowStateIndex,
  current: RoutedActionContract,
  command: AdvanceWorkflowCommand,
): WorkflowStateIndex["roadmap"] {
  if (
    current.actionId === "operator_closeout_approval_required" &&
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
