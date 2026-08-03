import { ArrowRight, CornerDownRight, CornerUpLeft, RotateCcw, Wrench } from "lucide-react";

import type { ArchitectInterviewRailStatus, ProjectLifecycleRailStatus, WorkspaceId } from "../../shared/workspaceContracts";
import type { ProjectIntakeRailStatus } from "../../shared/projectIntake/projectIntakeCorpus";
import {
  deriveProjectRailPresentation,
  type ProjectRailPresentation,
} from "../../shared/workspaces/projectRailPresentation";

interface NestedWorkflowRailProps {
  activeWorkspaceId: WorkspaceId;
  onWorkspaceChange: (workspaceId: WorkspaceId) => void;
  architectInterviewStatus?: ArchitectInterviewRailStatus;
  projectRailStatuses?: Partial<Record<WorkspaceId, ProjectLifecycleRailStatus>>;
  projectIntakeStatus?: ProjectIntakeRailStatus;
  requiredWorkspaceId?: WorkspaceId | null;
  workspaceCounts?: Partial<Record<WorkspaceId, number>>;
}

type WorkflowTone = "project" | "phase" | "workCard" | "close" | "repair";
type SelectionState = "exact" | "parent" | "available";

interface ProjectRailItem {
  id: string;
  label: string;
  destination: WorkspaceId;
  tone: WorkflowTone;
}

interface ProjectRailGroup {
  id: string;
  label: string;
  start: number;
  span: number;
  tone: WorkflowTone;
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

const projectRailGroups: readonly ProjectRailGroup[] = [
  { id: "project-intake", label: "PROJECT INTAKE", start: 1, span: 2, tone: "project" },
  { id: "project-planning", label: "PROJECT PLANNING", start: 3, span: 2, tone: "project" },
  { id: "phases", label: "PHASES", start: 5, span: 1, tone: "phase" },
  { id: "project-close", label: "PROJECT CLOSE", start: 6, span: 2, tone: "close" },
];

const projectRailItems: readonly ProjectRailItem[] = [
  {
    id: "project-intake",
    label: "Project Intake",
    destination: "project-intake-capture",
    tone: "project",
  },
  {
    id: "architect-interview",
    label: "Architect Interview",
    destination: "architect-interview",
    tone: "project",
  },
  {
    id: "project-planning",
    label: "Project Planning",
    destination: "project-planning-review",
    tone: "project",
  },
  {
    id: "phase-map",
    label: "Phase Map",
    destination: "project-phase-map",
    tone: "project",
  },
  {
    id: "phases",
    label: "Phases",
    destination: "phase-interview",
    tone: "phase",
  },
  {
    id: "project-validation",
    label: "Project Validation",
    destination: "project-validation",
    tone: "close",
  },
  {
    id: "project-close",
    label: "Project Close",
    destination: "project-close",
    tone: "close",
  },
];

const workCardLoopItems: readonly LoopRailItem[] = [
  {
    id: "work-card-planning",
    label: "Planning",
    fullLabel: "Work Card Planning",
    destination: "work-card-planning",
    stateFor: exactWorkspace("work-card-planning"),
  },
  {
    id: "work-card-building-review",
    label: "Build / Review",
    fullLabel: "Build / Report Review",
    destination: "work-card-building-review",
    stateFor: exactWorkspace("work-card-building-review"),
  },
  {
    id: "work-card-validation",
    label: "Validation",
    fullLabel: "Work Card Validation",
    destination: "work-card-validation",
    stateFor: exactWorkspace("work-card-validation"),
  },
  {
    id: "work-card-close",
    label: "Close",
    fullLabel: "Work Card Close",
    destination: "work-card-close",
    stateFor: exactWorkspace("work-card-close"),
  },
  {
    id: "next-card",
    label: "Next Card",
    fullLabel: "Next Work Card",
    destination: "phase-work-card-selection",
    stateFor: exactWorkspace("phase-work-card-selection"),
  },
];

const repairLoopItem: LoopRailItem = {
  id: "work-card-repair",
  label: "Repair",
  fullLabel: "Repair when needed",
  destination: "work-card-repair",
  stateFor: exactWorkspace("work-card-repair"),
};

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

export function NestedWorkflowRail({
  activeWorkspaceId,
  architectInterviewStatus = "Open",
  onWorkspaceChange,
  projectRailStatuses = {},
  projectIntakeStatus = "Open",
  requiredWorkspaceId = null,
}: NestedWorkflowRailProps): JSX.Element {
  return (
    <section
      aria-label="Workflow navigation"
      className="workflow-navigation-header border-b border-slate-700/80 bg-[#111821] text-slate-100 shadow-[0_8px_18px_rgba(2,6,23,0.22)]"
    >
      <div className="px-4 pb-1.5 pt-2">
        <div className="grid grid-cols-7 gap-1.5">
          {projectRailGroups.map((group) => (
            <div
              className={[
                "flex h-4 items-center justify-center rounded border px-1 text-center text-[9px] font-semibold uppercase leading-none tracking-[0.14em]",
                groupHeaderClass(group.tone),
              ].join(" ")}
              key={group.id}
              style={{ gridColumn: `${group.start} / span ${group.span}` }}
            >
              {group.label}
            </div>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1.5">
          {projectRailItems.map((item, index) => {
            const state = getProjectRailItemState(item, activeWorkspaceId);
            const presentation = deriveProjectRailPresentation({
              activeWorkspaceId,
              descendantWorkspaceIds:
                item.id === "phases" ? [...phaseOrWorkCardWorkspaceIds] : [],
              destinationWorkspaceId: item.destination,
              requiredWorkspaceId,
              statusLabel: projectRailStatuses[item.destination] ??
                (item.id === "project-intake" ? projectIntakeStatus : undefined),
              architectInterviewStatus: item.id === "architect-interview" ? architectInterviewStatus : undefined,
            });
            return (
              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-1" key={item.id}>
                <WorkflowStepButton
                  index={index}
                  label={item.label}
                  onClick={() => onWorkspaceChange(item.destination)}
                  presentation={presentation}
                  state={state}
                  tone={item.tone}
                />
                {index < projectRailItems.length - 1 ? (
                  <WorkflowGuideConnector state={state} />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-2.5 border-t border-slate-700/70 px-4 py-2">
        <WorkflowLoopRail
          activeWorkspaceId={activeWorkspaceId}
          items={workCardLoopItems}
          onWorkspaceChange={onWorkspaceChange}
          repairItem={repairLoopItem}
          title="Work Card Loop"
          tone="workCard"
        />
        <WorkflowLoopRail
          activeWorkspaceId={activeWorkspaceId}
          items={phaseLoopItems}
          onWorkspaceChange={onWorkspaceChange}
          title="Phase Loop"
          tone="phase"
        />
      </div>
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

function WorkflowStepButton({
  index,
  label,
  onClick,
  presentation,
  state,
  tone,
}: {
  index: number;
  label: string;
  onClick: () => void;
  presentation: ProjectRailPresentation;
  state: SelectionState;
  tone: WorkflowTone;
}): JSX.Element {
  const stateLabel = presentation.statusLabel;

  return (
    <button
      aria-current={state === "exact" ? "page" : undefined}
      aria-label={`${String(index + 1).padStart(2, "0")} ${label}: ${stateLabel}.${presentation.isRequired ? " Current required step." : ""} Open workflow step.`}
      className={[
        "group flex h-[62px] min-w-0 flex-col rounded-md border px-2 py-1.5 text-left transition-colors",
        stepStateClass(tone, state),
        presentation.isRequired ? requiredStepClass() : "",
      ].join(" ")}
      onClick={onClick}
      title={`Open ${label}`}
      type="button"
    >
      <span className="flex w-full items-center gap-1 text-[9px] font-bold uppercase leading-none tracking-[0.08em]">
        <span className={state === "available" ? "opacity-55" : "opacity-85"}>
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="ml-auto">{stateLabel}</span>
      </span>
      <span className="mt-1 text-[12px] font-bold leading-[1.1] text-current">{label}</span>
    </button>
  );
}

function requiredStepClass(): string {
  return "ring-2 ring-inset ring-[#8ab4a7]/90";
}

function WorkflowLoopRail({
  activeWorkspaceId,
  items,
  onWorkspaceChange,
  repairItem,
  title,
  tone,
}: {
  activeWorkspaceId: WorkspaceId;
  items: readonly LoopRailItem[];
  onWorkspaceChange: (workspaceId: WorkspaceId) => void;
  repairItem?: LoopRailItem;
  title: string;
  tone: WorkflowTone;
}): JSX.Element {
  return (
    <div className={["h-[64px] min-w-0 rounded-md border px-2.5 py-1.5", loopCardClass(tone)].join(" ")}>
      <div className="flex h-full min-w-0 items-start gap-2">
        <div className="flex w-[82px] shrink-0 items-center gap-1 pt-2">
          <RotateCcw aria-hidden="true" className="shrink-0" size={10} />
          <span className="text-[10px] font-bold leading-[1.05] text-slate-200">{title}</span>
        </div>
        <div className="relative min-w-0 flex-1">
          <div
            className="grid gap-1"
            style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
          >
            {items.map((item, index) => {
              const state = item.stateFor(activeWorkspaceId);
              return (
                <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-0.5" key={item.id}>
                  <LoopItemButton
                    fullLabel={item.fullLabel}
                    label={item.label}
                    onClick={() => onWorkspaceChange(item.destination)}
                    state={state}
                    tone={tone}
                  />
                  {index < items.length - 1 ? (
                    <ArrowRight
                      aria-hidden="true"
                      className={state === "exact" ? "shrink-0 text-cyan-300/80" : state === "parent" ? "shrink-0 text-violet-300/70" : "shrink-0 text-slate-500"}
                      size={10}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
          {repairItem ? (
            <div className="absolute left-[50%] top-[38px] flex w-[96px] -translate-x-1/2 items-center justify-center gap-0.5">
              <CornerDownRight aria-hidden="true" className="shrink-0 text-amber-300/75" size={9} />
              <LoopItemButton
                fullLabel={repairItem.fullLabel}
                icon={<Wrench aria-hidden="true" size={8} />}
                label={repairItem.label}
                onClick={() => onWorkspaceChange(repairItem.destination)}
                isBranch
                state={repairItem.stateFor(activeWorkspaceId)}
                tone="repair"
              />
              <CornerUpLeft aria-label="Returns to Validation" className="shrink-0 text-amber-300/75" size={9} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function LoopItemButton({
  fullLabel,
  icon,
  isBranch = false,
  label,
  onClick,
  state,
  tone,
}: {
  fullLabel: string;
  icon?: JSX.Element;
  isBranch?: boolean;
  label: string;
  onClick: () => void;
  state: SelectionState;
  tone: WorkflowTone;
}): JSX.Element {
  return (
    <button
      aria-current={state === "exact" ? "page" : undefined}
      aria-label={`${fullLabel}: ${state}. Open workflow step.`}
      className={[
        isBranch
          ? "flex h-[18px] min-w-0 items-center justify-center gap-1 rounded border px-1.5 text-center text-[8px] font-bold leading-none transition-colors"
          : "flex h-[32px] min-w-0 items-center justify-center gap-1 rounded-md border px-1.5 text-center text-[9px] font-bold leading-none transition-colors",
        loopStateClass(tone, state),
      ].join(" ")}
      onClick={onClick}
      title={`Open ${fullLabel}`}
      type="button"
    >
      {icon}
      <span className="min-w-0 truncate whitespace-nowrap">{label}</span>
    </button>
  );
}

function WorkflowGuideConnector({ state }: { state: SelectionState }): JSX.Element {
  return (
    <div className="flex w-3 shrink-0 items-center justify-center" aria-hidden="true">
      <ArrowRight
        className={state === "exact" ? "text-cyan-300/85" : state === "parent" ? "text-violet-300/70" : "text-slate-500"}
        size={12}
      />
    </div>
  );
}

function groupHeaderClass(tone: WorkflowTone): string {
  return {
    project: "border-blue-400/25 bg-blue-400/10 text-blue-200/90",
    phase: "border-violet-400/25 bg-violet-400/10 text-violet-200/90",
    workCard: "border-cyan-400/25 bg-cyan-400/10 text-cyan-200/90",
    close: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200/90",
    repair: "border-amber-400/25 bg-amber-400/10 text-amber-200/90",
  }[tone];
}

function stepStateClass(tone: WorkflowTone, state: SelectionState): string {
  if (state === "exact") {
    return {
      project: "border-cyan-300/90 bg-cyan-400/15 text-cyan-50 shadow-[inset_0_0_0_1px_rgba(103,232,249,0.18),0_0_18px_rgba(34,211,238,0.14)] hover:bg-cyan-400/20",
      phase: "border-cyan-300/90 bg-cyan-400/15 text-cyan-50 shadow-[inset_0_0_0_1px_rgba(103,232,249,0.18),0_0_18px_rgba(34,211,238,0.14)] hover:bg-cyan-400/20",
      workCard: "border-cyan-300/90 bg-cyan-400/15 text-cyan-50 shadow-[inset_0_0_0_1px_rgba(103,232,249,0.18),0_0_18px_rgba(34,211,238,0.14)] hover:bg-cyan-400/20",
      close: "border-cyan-300/90 bg-cyan-400/15 text-cyan-50 shadow-[inset_0_0_0_1px_rgba(103,232,249,0.18),0_0_18px_rgba(34,211,238,0.14)] hover:bg-cyan-400/20",
      repair: "border-cyan-300/90 bg-cyan-400/15 text-cyan-50 shadow-[inset_0_0_0_1px_rgba(103,232,249,0.18),0_0_18px_rgba(34,211,238,0.14)] hover:bg-cyan-400/20",
    }[tone];
  }

  if (state === "parent") {
    return {
      project: "border-violet-300/65 bg-violet-400/10 text-violet-100 shadow-none hover:bg-violet-400/14",
      phase: "border-violet-300/65 bg-violet-400/10 text-violet-100 shadow-none hover:bg-violet-400/14",
      workCard: "border-violet-300/65 bg-violet-400/10 text-violet-100 shadow-none hover:bg-violet-400/14",
      close: "border-violet-300/65 bg-violet-400/10 text-violet-100 shadow-none hover:bg-violet-400/14",
      repair: "border-violet-300/65 bg-violet-400/10 text-violet-100 shadow-none hover:bg-violet-400/14",
    }[tone];
  }

  return {
    project: "border-slate-600/90 bg-slate-900/60 text-slate-300 hover:border-blue-300/55 hover:bg-slate-800/80 hover:text-slate-50",
    phase: "border-slate-600/90 bg-slate-900/60 text-slate-300 hover:border-violet-300/55 hover:bg-slate-800/80 hover:text-slate-50",
    workCard: "border-slate-600/90 bg-slate-900/60 text-slate-300 hover:border-cyan-300/55 hover:bg-slate-800/80 hover:text-slate-50",
    close: "border-slate-600/90 bg-slate-900/60 text-slate-300 hover:border-emerald-300/55 hover:bg-slate-800/80 hover:text-slate-50",
    repair: "border-slate-600/90 bg-slate-900/60 text-slate-300 hover:border-amber-300/55 hover:bg-slate-800/80 hover:text-slate-50",
  }[tone];
}

function loopCardClass(tone: WorkflowTone): string {
  return {
    project: "border-blue-400/20 bg-slate-950/35 text-blue-100",
    phase: "border-violet-400/20 bg-slate-950/35 text-violet-100",
    workCard: "border-cyan-400/20 bg-slate-950/35 text-cyan-100",
    close: "border-emerald-400/20 bg-slate-950/35 text-emerald-100",
    repair: "border-amber-400/20 bg-slate-950/35 text-amber-100",
  }[tone];
}

function loopStateClass(tone: WorkflowTone, state: SelectionState): string {
  if (state === "exact") {
    return {
      project: "border-cyan-300/90 bg-cyan-400/18 text-cyan-50 shadow-[0_0_0_1px_rgba(103,232,249,0.16)] hover:bg-cyan-400/24",
      phase: "border-cyan-300/90 bg-cyan-400/18 text-cyan-50 shadow-[0_0_0_1px_rgba(103,232,249,0.16)] hover:bg-cyan-400/24",
      workCard: "border-cyan-300/90 bg-cyan-400/18 text-cyan-50 shadow-[0_0_0_1px_rgba(103,232,249,0.16)] hover:bg-cyan-400/24",
      close: "border-cyan-300/90 bg-cyan-400/18 text-cyan-50 shadow-[0_0_0_1px_rgba(103,232,249,0.16)] hover:bg-cyan-400/24",
      repair: "border-amber-300/95 bg-amber-400/20 text-amber-50 shadow-[0_0_0_1px_rgba(251,191,36,0.18),0_0_12px_rgba(245,158,11,0.14)] hover:bg-amber-400/26",
    }[tone];
  }

  if (state === "parent") {
    return {
      project: "border-violet-300/60 bg-violet-400/10 text-violet-100 hover:bg-violet-400/14",
      phase: "border-violet-300/60 bg-violet-400/10 text-violet-100 hover:bg-violet-400/14",
      workCard: "border-violet-300/60 bg-violet-400/10 text-violet-100 hover:bg-violet-400/14",
      close: "border-violet-300/60 bg-violet-400/10 text-violet-100 hover:bg-violet-400/14",
      repair: "border-violet-300/60 bg-violet-400/10 text-violet-100 hover:bg-violet-400/14",
    }[tone];
  }

  return {
    project: "border-slate-600/75 bg-slate-900/65 text-slate-300 hover:border-blue-300/50 hover:bg-slate-800/85 hover:text-slate-50",
    phase: "border-slate-600/75 bg-slate-900/65 text-slate-300 hover:border-violet-300/50 hover:bg-slate-800/85 hover:text-slate-50",
    workCard: "border-slate-600/75 bg-slate-900/65 text-slate-300 hover:border-cyan-300/50 hover:bg-slate-800/85 hover:text-slate-50",
    close: "border-slate-600/75 bg-slate-900/65 text-slate-300 hover:border-emerald-300/50 hover:bg-slate-800/85 hover:text-slate-50",
    repair: "border-amber-400/45 bg-slate-900/65 text-amber-200 hover:border-amber-300/70 hover:bg-amber-400/10 hover:text-amber-50",
  }[tone];
}
