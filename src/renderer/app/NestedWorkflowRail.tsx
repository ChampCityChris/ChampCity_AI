import { WorkflowStageRail, type WorkflowStage } from "./WorkflowStageRail";
import type {
  ArchitectInterviewRailStatus,
  ExecutionContextProjection,
  ProjectLifecycleRailStatus,
  WorkspaceId,
} from "../../shared/workspaceContracts";
import type { ProjectIntakeRailStatus } from "../../shared/projectIntake/projectIntakeCorpus";
import {
  deriveProjectRailPresentation,
} from "../../shared/workspaces/projectRailPresentation";
import {
  ContextLoopBar,
  type ContextLoopItem,
  type ContextLoopSelectionState,
} from "./ContextLoopBar";

interface NestedWorkflowRailProps {
  activeWorkspaceId: WorkspaceId;
  executionContext?: ExecutionContextProjection;
  onWorkspaceChange: (workspaceId: WorkspaceId) => void;
  architectInterviewStatus?: ArchitectInterviewRailStatus;
  projectRailStatuses?: Partial<Record<WorkspaceId, ProjectLifecycleRailStatus>>;
  projectIntakeStatus?: ProjectIntakeRailStatus;
  requiredWorkspaceId?: WorkspaceId | null;
  workspaceCounts?: Partial<Record<WorkspaceId, number>>;
}

type SelectionState = ContextLoopSelectionState;

interface ProjectRailItem {
  id: string;
  label: string;
  destination: WorkspaceId;
}

type LoopRailItem = ContextLoopItem<WorkspaceId>;

const workCardWorkspaceIds = new Set<WorkspaceId>([
  "work-card-intake",
  "work-card-planning",
  "work-card-building-review",
  "work-card-report-review",
  "work-card-repair",
  "work-card-validation",
  "work-card-close",
]);

const phaseWorkspaceIds = new Set<WorkspaceId>([
  "phase-interview",
  "phase-planning-bundle",
  "phase-work-card-selection",
  "phase-validation",
  "phase-close",
]);

const phaseOrWorkCardWorkspaceIds = new Set<WorkspaceId>([
  ...phaseWorkspaceIds,
  ...workCardWorkspaceIds,
]);

const projectRailItems: readonly ProjectRailItem[] = [
  { id: "project-intake", label: "Project Intake", destination: "project-intake-capture" },
  { id: "architect-interview", label: "Architect Interview", destination: "architect-interview" },
  { id: "project-planning", label: "Project Planning", destination: "project-planning-review" },
  { id: "phase-map", label: "Phase Map", destination: "project-phase-map" },
  { id: "phases", label: "Phases", destination: "phase-interview" },
  { id: "project-validation", label: "Project Validation", destination: "project-validation" },
  { id: "project-close", label: "Project Close", destination: "project-close" },
];

const phaseLoopItems: readonly LoopRailItem[] = [
  {
    id: "phase-intake",
    label: "Phase Intake",
    fullLabel: "Phase Intake",
    destination: "phase-interview",
    stateFor: exactWorkspace("phase-interview"),
  },
  {
    id: "phase-planning",
    label: "Planning",
    fullLabel: "Phase Planning",
    destination: "phase-planning-bundle",
    stateFor: exactWorkspace("phase-planning-bundle"),
  },
  {
    id: "phase-work-cards",
    label: "Work Cards",
    fullLabel: "Work Cards",
    destination: "phase-work-card-selection",
    stateFor: (workspaceId) =>
      workCardWorkspaceIds.has(workspaceId)
        ? "parent"
        : workspaceId === "phase-work-card-selection"
          ? "exact"
          : "available",
  },
  {
    id: "phase-validation",
    label: "Validation",
    fullLabel: "Phase Validation",
    destination: "phase-validation",
    stateFor: exactWorkspace("phase-validation"),
  },
  {
    id: "phase-close",
    label: "Close",
    fullLabel: "Phase Close",
    destination: "phase-close",
    stateFor: exactWorkspace("phase-close"),
  },
  {
    id: "next-phase",
    label: "Next Phase",
    fullLabel: "Next Phase",
    destination: "project-phase-map",
    stateFor: exactWorkspace("project-phase-map"),
  },
];

const workCardLoopItems: readonly LoopRailItem[] = [
  {
    id: "work-card-loop",
    label: "Work Card Map",
    fullLabel: "Work Card Map",
    destination: "phase-work-card-selection",
    stateFor: (workspaceId) =>
      workspaceId === "phase-work-card-selection"
        ? "exact"
        : "available",
  },
  {
    id: "work-card-planning",
    label: "Planning",
    fullLabel: "Work Card Planning",
    destination: "work-card-planning",
    stateFor: exactWorkspace("work-card-planning"),
  },
  {
    id: "work-card-building-review",
    label: "Implement",
    fullLabel: "Implement",
    destination: "work-card-building-review",
    stateFor: exactWorkspace("work-card-building-review"),
  },
  {
    id: "work-card-report-review",
    label: "Review & Validation",
    fullLabel: "Review & Validation",
    destination: "work-card-report-review",
    stateFor: (workspaceId) =>
      workspaceId === "work-card-report-review" || workspaceId === "work-card-validation"
        ? "exact"
        : "available",
  },
  {
    id: "work-card-repair",
    label: "Repair",
    fullLabel: "Repair when needed",
    destination: "work-card-repair",
    stateFor: exactWorkspace("work-card-repair"),
  },
  {
    id: "work-card-close",
    label: "Close / Next",
    fullLabel: "Close / Next Work Card",
    destination: "work-card-close",
    stateFor: exactWorkspace("work-card-close"),
  },
];

const phaseStepIdsByLoopStep = {
  "Phase Intake": "phase-intake",
  "Phase Planning": "phase-planning",
  "Work Cards": "phase-work-cards",
  "Phase Validation": "phase-validation",
  "Phase Close": "phase-close",
} as const;

const workCardStepIdsByLoopStep = {
  "Work Card Intake": "work-card-loop",
  Planning: "work-card-planning",
  Implement: "work-card-building-review",
  "Review & Validation": "work-card-report-review",
  Repair: "work-card-repair",
  Close: "work-card-close",
} as const;

export function NestedWorkflowRail({
  activeWorkspaceId,
  architectInterviewStatus = "Open",
  executionContext,
  onWorkspaceChange,
  projectRailStatuses = {},
  projectIntakeStatus = "Open",
  requiredWorkspaceId = null,
}: NestedWorkflowRailProps): JSX.Element {
  const showPhaseLoop = phaseOrWorkCardWorkspaceIds.has(activeWorkspaceId);
  const showWorkCardLoop =
    activeWorkspaceId === "phase-work-card-selection" || workCardWorkspaceIds.has(activeWorkspaceId);
  const requiredLoopWorkspaceId =
    requiredWorkspaceId && phaseOrWorkCardWorkspaceIds.has(requiredWorkspaceId)
      ? requiredWorkspaceId
      : activeWorkspaceId;
  const activePhaseStepId = currentPhaseStepId(executionContext, requiredLoopWorkspaceId);
  const activeWorkCardStepId = currentWorkCardStepId(executionContext, requiredLoopWorkspaceId);

  const stages: WorkflowStage[] = projectRailItems.map((item) => {
    const state = getProjectRailItemState(item, activeWorkspaceId);
    const presentation = deriveProjectRailPresentation({
      activeWorkspaceId,
      architectInterviewStatus:
        item.id === "architect-interview" ? architectInterviewStatus : undefined,
      descendantWorkspaceIds:
        item.id === "phases" ? [...phaseOrWorkCardWorkspaceIds] : [],
      destinationWorkspaceId: item.destination,
      requiredWorkspaceId,
      statusLabel: projectRailStatusForItem({
        activeWorkspaceId,
        executionContext,
        item,
        projectIntakeStatus,
        projectRailStatuses,
        requiredWorkspaceId,
      }),
    });

    return { id: item.id, label: item.label, state, ...presentation,
      onClick: () => onWorkspaceChange(item.destination) };
  });

  return (
    <WorkflowStageRail stages={stages} ariaLabel="Project pipeline">
      {showPhaseLoop ? (
        <ContextLoopBar
          activeDestinationId={activeWorkspaceId}
          activeStepId={activePhaseStepId}
          ariaLabel="Phase loop"
          context={phaseContext(executionContext)}
          items={phaseLoopItems}
          label="Phase Loop"
          onDestinationChange={onWorkspaceChange}
        />
      ) : null}

      {showWorkCardLoop ? (
        <ContextLoopBar
          activeDestinationId={activeWorkspaceId}
          activeStepId={activeWorkCardStepId}
          ariaLabel="Work Card loop"
          context={workCardContext(executionContext)}
          items={workCardLoopItems}
          label="Work Card Map"
          onDestinationChange={onWorkspaceChange}
          workCard
        />
      ) : null}
    </WorkflowStageRail>
  );
}

function projectRailStatusForItem({
  activeWorkspaceId,
  executionContext,
  item,
  projectIntakeStatus,
  projectRailStatuses,
  requiredWorkspaceId,
}: {
  activeWorkspaceId: WorkspaceId;
  executionContext: ExecutionContextProjection | undefined;
  item: ProjectRailItem;
  projectIntakeStatus: ProjectIntakeRailStatus;
  projectRailStatuses: Partial<Record<WorkspaceId, ProjectLifecycleRailStatus>>;
  requiredWorkspaceId: WorkspaceId | null;
}): ProjectLifecycleRailStatus | ProjectIntakeRailStatus | ArchitectInterviewRailStatus | undefined {
  const status =
    projectRailStatuses[item.destination] ??
    (item.id === "project-intake" ? projectIntakeStatus : undefined);
  if (
    item.id === "phases" &&
    shouldShowPhasesInProgress({
      activeWorkspaceId,
      executionContext,
      requiredWorkspaceId,
      status,
    })
  ) {
    return "In Progress";
  }
  return status;
}

function shouldShowPhasesInProgress({
  activeWorkspaceId,
  executionContext,
  requiredWorkspaceId,
  status,
}: {
  activeWorkspaceId: WorkspaceId;
  executionContext: ExecutionContextProjection | undefined;
  requiredWorkspaceId: WorkspaceId | null;
  status: ProjectLifecycleRailStatus | ProjectIntakeRailStatus | ArchitectInterviewRailStatus | undefined;
}): boolean {
  if (status === "Needs Attention" || status === "Not Ready") {
    return false;
  }
  return (
    executionContext?.phase.state === "active" ||
    phaseOrWorkCardWorkspaceIds.has(activeWorkspaceId) ||
    Boolean(requiredWorkspaceId && phaseOrWorkCardWorkspaceIds.has(requiredWorkspaceId))
  );
}

function exactWorkspace(workspaceId: WorkspaceId): (activeWorkspaceId: WorkspaceId) => SelectionState {
  return (activeWorkspaceId) => activeWorkspaceId === workspaceId ? "exact" : "available";
}

function getProjectRailItemState(
  item: ProjectRailItem,
  activeWorkspaceId: WorkspaceId,
): SelectionState {
  if (item.id === "phases") {
    return phaseOrWorkCardWorkspaceIds.has(activeWorkspaceId) ? "parent" : "available";
  }
  return item.destination === activeWorkspaceId ? "exact" : "available";
}

function currentPhaseStepId(
  executionContext: ExecutionContextProjection | undefined,
  activeWorkspaceId: WorkspaceId,
): string {
  const loopStep = executionContext?.phase.state === "active"
    ? executionContext.phase.loopStep
    : undefined;
  if (loopStep) {
    return phaseStepIdsByLoopStep[loopStep];
  }
  return phaseLoopItems.find((item) => item.stateFor(activeWorkspaceId) !== "available")?.id ?? "phase-intake";
}

function currentWorkCardStepId(
  executionContext: ExecutionContextProjection | undefined,
  activeWorkspaceId: WorkspaceId,
): string {
  const loopStep = executionContext?.workCard.state === "active"
    ? executionContext.workCard.loopStep
    : undefined;
  if (loopStep) {
    return workCardStepIdsByLoopStep[loopStep];
  }
  return workCardLoopItems.find((item) => item.stateFor(activeWorkspaceId) === "exact")?.id ?? "work-card-loop";
}

function phaseContext(executionContext: ExecutionContextProjection | undefined): {
  id: string;
  position: string;
} {
  const phase = executionContext?.phase;
  if (phase?.state !== "active") {
    return { id: "No active phase", position: "Repository derived" };
  }
  return {
    id: phase.phaseId ?? "Current phase",
    position: `Phase ${phase.order ?? "?"} of ${phase.totalPhaseCount ?? "?"}`,
  };
}

function workCardContext(executionContext: ExecutionContextProjection | undefined): {
  id: string;
  position: string;
} {
  const workCard = executionContext?.workCard;
  if (workCard?.state !== "active") {
    return { id: "No active Work Card", position: "Repository derived" };
  }
  return {
    id: workCard.workCardId ?? "Current Work Card",
    position: `${workCard.loopStep ?? "Current step"} in phase`,
  };
}
