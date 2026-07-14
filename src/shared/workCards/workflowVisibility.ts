import {
  lockedWorkflowSteps,
  type CurrentRequiredAction,
  type LockedWorkflowStep,
} from "./currentRequiredAction";

export type WorkflowGuideGroupId =
  | "capture"
  | "frame"
  | "plan"
  | "build"
  | "prove";

export type WorkflowGuideStepState =
  | "completed"
  | "current"
  | "upcoming"
  | "blocked"
  | "repair"
  | "unknown";

export interface WorkflowGuideStepDefinition {
  id: string;
  label: LockedWorkflowStep;
  groupId: WorkflowGuideGroupId;
  supportScreenId: string;
}

export interface WorkflowGuideGroup {
  id: WorkflowGuideGroupId;
  label: string;
  description: string;
  steps: readonly WorkflowGuideStepDefinition[];
}

export interface WorkflowGuideStepPosition extends WorkflowGuideStepDefinition {
  index: number;
  state: WorkflowGuideStepState;
}

export interface WorkflowLoopGuide {
  id: "approval-revision" | "work-card" | "phase";
  label: string;
  description: string;
  stages: readonly string[];
  repeatLabel: string;
}

export interface WorkCardLoopStagePosition {
  id: string;
  label: string;
  state: WorkflowGuideStepState;
}

export interface WorkflowVisibilityModel {
  steps: readonly WorkflowGuideStepPosition[];
  positionKnown: boolean;
  activeStepIndex?: number;
  activeStepLabel?: LockedWorkflowStep;
  positionMessage: string;
  workCardLoopStages: readonly WorkCardLoopStagePosition[];
}

type WorkflowVisibilityAction = Pick<
  CurrentRequiredAction,
  "id" | "status" | "warnings" | "workflowStep"
>;

const captureSteps: readonly WorkflowGuideStepDefinition[] = [
  {
    id: "project-intake",
    label: "Project Intake",
    groupId: "capture",
    supportScreenId: "project-intake",
  },
  {
    id: "project-interview",
    label: "Project Interview",
    groupId: "capture",
    supportScreenId: "project-architect-interview",
  },
];

const frameSteps: readonly WorkflowGuideStepDefinition[] = [
  {
    id: "reconciliation-review",
    label: "Reconciliation Review",
    groupId: "frame",
    supportScreenId: "repository-reconciliation",
  },
  {
    id: "project-mapping",
    label: "Project Mapping",
    groupId: "frame",
    supportScreenId: "project-planning-documents",
  },
  {
    id: "operator-project-approval",
    label: "Operator Project Approval",
    groupId: "frame",
    supportScreenId: "project-planning-documents",
  },
];

const planSteps: readonly WorkflowGuideStepDefinition[] = [
  {
    id: "phase-mapping",
    label: "Phase Mapping",
    groupId: "plan",
    supportScreenId: "phase-planning-documents",
  },
  {
    id: "operator-phase-approval",
    label: "Operator Phase Approval",
    groupId: "plan",
    supportScreenId: "phase-planning-documents",
  },
];

const buildSteps: readonly WorkflowGuideStepDefinition[] = [
  {
    id: "work-card-loop",
    label: "Work Card Loop",
    groupId: "build",
    supportScreenId: "work-card-plan-review",
  },
];

const proveSteps: readonly WorkflowGuideStepDefinition[] = [
  {
    id: "phase-closeout",
    label: "Phase Closeout",
    groupId: "prove",
    supportScreenId: "phase-closeout",
  },
  {
    id: "operator-phase-closeout-approval",
    label: "Operator Phase Closeout Approval",
    groupId: "prove",
    supportScreenId: "phase-closeout",
  },
  {
    id: "roadmap-update",
    label: "Roadmap Update",
    groupId: "prove",
    supportScreenId: "project-planning-documents",
  },
  {
    id: "next-phase-activation",
    label: "Next Phase Activation",
    groupId: "prove",
    supportScreenId: "phase-map-builder",
  },
  {
    id: "repeat-phase-mapping-work-card-loop",
    label: "Repeat Phase Mapping / Work Card Loop",
    groupId: "prove",
    supportScreenId: "phase-map-builder",
  },
];

export const workflowGuideGroups: readonly WorkflowGuideGroup[] = [
  {
    id: "capture",
    label: "Capture",
    description: "Capture project intent",
    steps: captureSteps,
  },
  {
    id: "frame",
    label: "Frame",
    description: "Frame and approve the project",
    steps: frameSteps,
  },
  {
    id: "plan",
    label: "Plan",
    description: "Map and approve the phase",
    steps: planSteps,
  },
  {
    id: "build",
    label: "Build",
    description: "Run the Work Card loop",
    steps: buildSteps,
  },
  {
    id: "prove",
    label: "Prove",
    description: "Close, update, and repeat",
    steps: proveSteps,
  },
];

export const workflowGuideSteps: readonly WorkflowGuideStepDefinition[] =
  workflowGuideGroups.flatMap((group) => group.steps);

export const workflowLoopGuides: readonly WorkflowLoopGuide[] = [
  {
    id: "approval-revision",
    label: "Approval / revision loop",
    description:
      "Project, phase, and closeout approvals can return work for revision before the same approval gate is tried again.",
    stages: ["Approval gate", "Revision", "Approval again"],
    repeatLabel: "Return to the same gate",
  },
  {
    id: "work-card",
    label: "Work Card loop",
    description:
      "Each Work Card moves through implementation, review, and Operator validation; failed validation enters repair and validation again.",
    stages: [
      "Work Card",
      "Implementer",
      "Architect Review",
      "Operator Validation",
      "Repair if needed",
      "Validation again",
      "Next Work Card",
    ],
    repeatLabel: "Repeat per card",
  },
  {
    id: "phase",
    label: "Phase loop",
    description:
      "A phase runs its Work Cards, closes, updates the roadmap, activates the next phase, and returns to phase mapping.",
    stages: [
      "Phase Mapping",
      "Work Card Loop",
      "Phase Closeout",
      "Roadmap Update",
      "Next Phase",
      "Repeat",
    ],
    repeatLabel: "Return to Phase Mapping",
  },
];

const actionIdToWorkflowStep: Readonly<Record<string, LockedWorkflowStep>> = {
  project_intake_required: "Project Intake",
  project_interview_required: "Project Interview",
  reconciliation_review_required: "Reconciliation Review",
  project_mapping_required: "Project Mapping",
  operator_project_approval_required: "Operator Project Approval",
  phase_mapping_required: "Phase Mapping",
  operator_phase_approval_required: "Operator Phase Approval",
  full_work_card_creation_required: "Work Card Loop",
  operator_work_card_review_required: "Work Card Loop",
  implementer_handoff_required: "Work Card Loop",
  implementer_report_required: "Work Card Loop",
  architect_review_of_implementer_report_required: "Work Card Loop",
  architect_review_of_validation_report_required: "Work Card Loop",
  operator_validation_required: "Work Card Loop",
  repair_sub_card_creation_required: "Work Card Loop",
  repair_implementer_handoff_required: "Work Card Loop",
  repair_validation_required: "Work Card Loop",
  phase_closeout_required: "Phase Closeout",
  operator_phase_closeout_approval_required: "Operator Phase Closeout Approval",
  roadmap_update_required: "Roadmap Update",
  next_phase_activation_required: "Next Phase Activation",
  project_complete: "Repeat Phase Mapping / Work Card Loop",
};

const workCardLoopStageDefinitions = [
  { id: "work-card", label: "Work Card" },
  { id: "implementer", label: "Implementer" },
  { id: "architect-review", label: "Architect Review" },
  { id: "operator-validation", label: "Operator Validation" },
  { id: "repair", label: "Repair if needed" },
  { id: "validation-again", label: "Validation again" },
] as const;

const actionIdToWorkCardLoopStage: Readonly<Record<string, string>> = {
  full_work_card_creation_required: "work-card",
  operator_work_card_review_required: "work-card",
  implementer_handoff_required: "work-card",
  implementer_report_required: "implementer",
  architect_review_of_implementer_report_required: "architect-review",
  architect_review_of_validation_report_required: "architect-review",
  operator_validation_required: "operator-validation",
  repair_sub_card_creation_required: "repair",
  repair_implementer_handoff_required: "repair",
  repair_validation_required: "validation-again",
};

export function resolveWorkflowVisibility(
  currentAction: WorkflowVisibilityAction | undefined,
): WorkflowVisibilityModel {
  if (!currentAction) {
    return unknownVisibility(
      "Workflow position is not available yet. The current-action router must load before prior and next steps can be confirmed.",
    );
  }

  const actionId = normalizeActionId(currentAction.id);
  const matchedStep = resolveLockedWorkflowStep(currentAction, actionId);

  if (!matchedStep) {
    return unknownVisibility(
      `The current action does not match a locked workflow step. Follow the current-action panel while the workflow position is confirmed.`,
    );
  }

  const activeStepIndex = workflowGuideSteps.findIndex(
    (step) => step.label === matchedStep,
  );

  if (activeStepIndex < 0) {
    return unknownVisibility(
      `The locked step "${matchedStep}" is not available in the visible guide. Follow the current-action panel while the guide is reconciled.`,
    );
  }

  if (actionId === "blocked") {
    return {
      steps: workflowGuideSteps.map((step, index) => ({
        ...step,
        index,
        state: index === activeStepIndex ? "blocked" : "unknown",
      })),
      positionKnown: false,
      activeStepIndex,
      activeStepLabel: matchedStep,
      positionMessage:
        "The durable router reports a workflow block but cannot safely confirm prior or upcoming step status. Follow the blocking guidance in the current-action panel.",
      workCardLoopStages: unknownWorkCardLoopStages(),
    };
  }

  const isComplete = currentAction.status === "complete";
  const activeState = getActiveState(currentAction, actionId);
  const steps = workflowGuideSteps.map((step, index) => ({
    ...step,
    index,
    state: resolveStepState(index, activeStepIndex, activeState, isComplete),
  }));

  return {
    steps,
    positionKnown: true,
    activeStepIndex: isComplete ? undefined : activeStepIndex,
    activeStepLabel: isComplete ? undefined : matchedStep,
    positionMessage: isComplete
      ? `Durable evidence marks ${matchedStep} complete. The guide shows confirmed progress through that point.`
      : activeState === "repair"
        ? `${matchedStep} is in a repair path. The routed current action remains authoritative for the repair and validation-again step.`
        : activeState === "blocked"
          ? `${matchedStep} is blocked by durable missing-evidence or blocking-warning state. Resolve the current-action panel guidance before continuing.`
          : `${matchedStep} is the current locked workflow step. Earlier steps are satisfied and later steps remain upcoming.`,
    workCardLoopStages: resolveWorkCardLoopStages(
      currentAction,
      actionId,
      activeStepIndex,
      activeState,
      isComplete,
    ),
  };
}

function resolveLockedWorkflowStep(
  currentAction: WorkflowVisibilityAction,
  actionId: string,
): LockedWorkflowStep | undefined {
  if (actionIdToWorkflowStep[actionId]) {
    return actionIdToWorkflowStep[actionId];
  }

  const normalizedWorkflowStep = normalizeWorkflowStep(currentAction.workflowStep);

  return lockedWorkflowSteps.find(
    (step) => normalizeWorkflowStep(step) === normalizedWorkflowStep,
  );
}

function getActiveState(
  currentAction: WorkflowVisibilityAction,
  actionId: string,
): WorkflowGuideStepState {
  if (
    currentAction.status === "needs_repair" ||
    actionId.startsWith("repair_")
  ) {
    return "repair";
  }

  if (
    currentAction.status === "blocked" ||
    currentAction.warnings.some((warning) => warning.severity === "blocking")
  ) {
    return "blocked";
  }

  return "current";
}

function resolveStepState(
  index: number,
  activeStepIndex: number,
  activeState: WorkflowGuideStepState,
  isComplete: boolean,
): WorkflowGuideStepState {
  if (index < activeStepIndex || (isComplete && index === activeStepIndex)) {
    return "completed";
  }

  if (index === activeStepIndex) {
    return activeState;
  }

  return "upcoming";
}

function resolveWorkCardLoopStages(
  currentAction: WorkflowVisibilityAction,
  actionId: string,
  activeStepIndex: number,
  activeState: WorkflowGuideStepState,
  isComplete: boolean,
): readonly WorkCardLoopStagePosition[] {
  const workCardStepIndex = workflowGuideSteps.findIndex(
    (step) => step.label === "Work Card Loop",
  );

  if (activeStepIndex < workCardStepIndex) {
    return workCardLoopStageDefinitions.map((stage) => ({
      ...stage,
      state: "upcoming",
    }));
  }

  if (activeStepIndex > workCardStepIndex || isComplete) {
    return workCardLoopStageDefinitions.map((stage) => ({
      ...stage,
      state: "completed",
    }));
  }

  const activeStageId = actionIdToWorkCardLoopStage[actionId];
  const activeStageIndex = workCardLoopStageDefinitions.findIndex(
    (stage) => stage.id === activeStageId,
  );

  if (activeStageIndex < 0) {
    return unknownWorkCardLoopStages();
  }

  return workCardLoopStageDefinitions.map((stage, index) => ({
    ...stage,
    state:
      index < activeStageIndex
        ? "completed"
        : index === activeStageIndex
          ? activeState
          : "upcoming",
  }));
}

function unknownVisibility(positionMessage: string): WorkflowVisibilityModel {
  return {
    steps: workflowGuideSteps.map((step, index) => ({
      ...step,
      index,
      state: "unknown",
    })),
    positionKnown: false,
    positionMessage,
    workCardLoopStages: unknownWorkCardLoopStages(),
  };
}

function unknownWorkCardLoopStages(): readonly WorkCardLoopStagePosition[] {
  return workCardLoopStageDefinitions.map((stage) => ({
    ...stage,
    state: "unknown",
  }));
}

function normalizeActionId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeWorkflowStep(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
