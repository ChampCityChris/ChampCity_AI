import { Check } from "lucide-react";

import type {
  ArchitectInterviewRailStatus,
  ExecutionContextProjection,
  ProjectLifecycleRailStatus,
  WorkspaceId,
} from "../../shared/workspaceContracts";
import type { ProjectIntakeRailStatus } from "../../shared/projectIntake/projectIntakeCorpus";
import {
  deriveProjectRailPresentation,
  type ProjectRailPresentation,
} from "../../shared/workspaces/projectRailPresentation";

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

type SelectionState = "exact" | "parent" | "available";
type StageTone = "completed" | "in-progress" | "not-ready" | "pending";

interface ProjectRailItem {
  id: string;
  label: string;
  destination: WorkspaceId;
}

interface LoopRailItem {
  id: string;
  label: string;
  fullLabel: string;
  destination: WorkspaceId;
  stateFor: (workspaceId: WorkspaceId) => SelectionState;
}

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
    label: "Work Card Loop",
    fullLabel: "Work Card Loop",
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
    label: "Build",
    fullLabel: "Implementer Build",
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
  Build: "work-card-building-review",
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
  const authorityWorkspaceId =
    requiredWorkspaceId && phaseOrWorkCardWorkspaceIds.has(requiredWorkspaceId)
      ? requiredWorkspaceId
      : activeWorkspaceId;
  const activePhaseStepId = currentPhaseStepId(executionContext, authorityWorkspaceId);
  const activeWorkCardStepId = currentWorkCardStepId(executionContext, authorityWorkspaceId);

  return (
    <section aria-label="Workflow navigation" className="workflow-navigation-header">
      <div className="figma-pipeline-nav" aria-label="Project pipeline">
        {projectRailItems.map((item, index) => {
          const state = getProjectRailItemState(item, activeWorkspaceId);
          const presentation = deriveProjectRailPresentation({
            activeWorkspaceId,
            architectInterviewStatus:
              item.id === "architect-interview" ? architectInterviewStatus : undefined,
            descendantWorkspaceIds:
              item.id === "phases" ? [...phaseOrWorkCardWorkspaceIds] : [],
            destinationWorkspaceId: item.destination,
            requiredWorkspaceId,
            statusLabel:
              projectRailStatuses[item.destination] ??
              (item.id === "project-intake" ? projectIntakeStatus : undefined),
          });

          return (
            <PipelineStep
              index={index}
              key={item.id}
              label={item.label}
              onClick={() => onWorkspaceChange(item.destination)}
              presentation={presentation}
              state={state}
            />
          );
        })}
      </div>

      {showPhaseLoop ? (
        <ContextLoopBar
          activeWorkspaceId={authorityWorkspaceId}
          activeStepId={activePhaseStepId}
          ariaLabel="Phase loop"
          context={phaseContext(executionContext)}
          items={phaseLoopItems}
          label="Phase Loop"
          onWorkspaceChange={onWorkspaceChange}
        />
      ) : null}

      {showWorkCardLoop ? (
        <ContextLoopBar
          activeWorkspaceId={authorityWorkspaceId}
          activeStepId={activeWorkCardStepId}
          ariaLabel="Work Card loop"
          context={workCardContext(executionContext)}
          items={workCardLoopItems}
          label="Work Card Loop"
          onWorkspaceChange={onWorkspaceChange}
          workCard
        />
      ) : null}
    </section>
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

function PipelineStep({
  index,
  label,
  onClick,
  presentation,
  state,
}: {
  index: number;
  label: string;
  onClick: () => void;
  presentation: ProjectRailPresentation;
  state: SelectionState;
}): JSX.Element {
  const tone = pipelineStatusTone(presentation.statusLabel, presentation.isRequired);
  const selected = state === "exact" || state === "parent";
  const connectorComplete = tone === "completed";
  return (
    <div className="figma-pipeline-stage">
      {index > 0 ? (
        <span className={`figma-stage-connector ${connectorComplete ? "completed" : ""}`} aria-hidden="true" />
      ) : null}
      <button
        aria-current={state === "exact" ? "page" : undefined}
        aria-label={`${String(index + 1).padStart(2, "0")} ${label}: ${presentation.statusLabel}.${presentation.isRequired ? " Current required step." : ""} Open workflow step.`}
        className={[
          "figma-pipeline-step",
          selected ? "active" : "",
          state === "parent" ? "parent" : "",
          presentation.isRequired ? "required" : "",
          tone,
        ].filter(Boolean).join(" ")}
        data-status={tone}
        onClick={onClick}
        type="button"
      >
        <StageIcon active={selected} tone={tone} />
        <span className="figma-stage-copy">
          <strong>{label}</strong>
          <span className={`figma-pipeline-status ${tone}`}>{presentation.statusLabel}</span>
        </span>
      </button>
      {index < projectRailItems.length - 1 ? (
        <span className={`figma-stage-connector ${connectorComplete ? "completed" : ""}`} aria-hidden="true" />
      ) : null}
    </div>
  );
}

function ContextLoopBar({
  activeWorkspaceId,
  activeStepId,
  ariaLabel,
  context,
  items,
  label,
  onWorkspaceChange,
  workCard = false,
}: {
  activeWorkspaceId: WorkspaceId;
  activeStepId: string;
  ariaLabel: string;
  context: { id: string; position: string };
  items: readonly LoopRailItem[];
  label: string;
  onWorkspaceChange: (workspaceId: WorkspaceId) => void;
  workCard?: boolean;
}): JSX.Element {
  const currentIndex = Math.max(0, items.findIndex((item) => item.id === activeStepId));
  return (
    <div
      aria-label={ariaLabel}
      className={`figma-context-loop-bar ${workCard ? "figma-work-card-loop-bar" : "figma-phase-loop-bar"}`}
    >
      <div className="figma-loop-context">
        <span>{label}</span>
        <strong>{context.id}</strong>
        <small>{context.position}</small>
      </div>
      <div className="figma-context-loop-items">
        {items.map((item, index) => {
          const state = item.stateFor(activeWorkspaceId);
          const selected = state === "exact" || state === "parent";
          const tone: StageTone = index < currentIndex
            ? "completed"
            : index === currentIndex
              ? "in-progress"
              : "pending";
          const isRepair = item.id === "work-card-repair";
          return (
            <div className="figma-sub-stage" key={item.id}>
              {index > 0 ? (
                <span className={`figma-sub-connector ${index <= currentIndex ? "completed" : ""}`} aria-hidden="true" />
              ) : null}
              <button
                aria-current={selected ? "step" : undefined}
                aria-label={`${item.fullLabel}: ${tone}. Open workflow step.`}
                className={[
                  "figma-sub-pill",
                  selected ? "active" : "",
                  state === "parent" ? "parent" : "",
                  isRepair ? "repair" : "",
                  tone,
                ].filter(Boolean).join(" ")}
                data-status={tone}
                onClick={() => onWorkspaceChange(item.destination)}
                title={`Open ${item.fullLabel}`}
                type="button"
              >
                <StageIcon active={selected} small tone={tone} />
                <span>{item.label}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StageIcon({
  active,
  small = false,
  tone,
}: {
  active: boolean;
  small?: boolean;
  tone: StageTone;
}): JSX.Element {
  return (
    <span
      aria-hidden="true"
      className={[
        "figma-stage-icon",
        small ? "small" : "",
        active ? "active" : "",
        tone,
      ].filter(Boolean).join(" ")}
    >
      {tone === "completed" ? <Check size={small ? 8 : 10} strokeWidth={3} /> : null}
      {tone === "in-progress" ? <i /> : null}
      {tone === "not-ready" ? <b>!</b> : null}
      {tone === "pending" ? <i /> : null}
    </span>
  );
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

function pipelineStatusTone(statusLabel: string, isRequired: boolean): StageTone {
  const normalized = statusLabel.toLowerCase();
  if (normalized.includes("complete") || normalized.includes("approved")) {
    return "completed";
  }
  if (normalized.includes("attention") || normalized.includes("not ready") || normalized.includes("error")) {
    return "not-ready";
  }
  if (
    isRequired ||
    normalized.includes("progress") ||
    normalized.includes("waiting") ||
    normalized.includes("awaiting") ||
    normalized.includes("ready")
  ) {
    return "in-progress";
  }
  return "pending";
}
