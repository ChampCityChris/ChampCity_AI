import { useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Circle,
  FileText,
  FolderOpen,
  GitBranch,
  Info,
  RefreshCw,
  RotateCcw,
  Save,
  Wrench,
  Zap,
} from "lucide-react";

import logoImage from "../assets/champcity_ai_ui_branding.png";
import {
  resolveSupportNavigationState,
  type SupportNavigationItem,
} from "../../shared/workCards/supportNavigation";

type WorkflowState =
  | "project-intake"
  | "project-interview"
  | "reconciliation"
  | "project-mapping"
  | "phase-mapping"
  | "work-card-review"
  | "implementer-active"
  | "architect-review"
  | "operator-validation"
  | "repair-subcard"
  | "phase-closeout"
  | "next-phase";

type LoadState = "loading" | "ready" | "error";

interface RailStep {
  index: number;
  label: string;
  states: WorkflowState[];
  group: "project" | "phase" | "loop" | "closeout";
}

interface ManualNavigationItem extends SupportNavigationItem {
  label: string;
  mode: "architect" | "implementer";
}

interface ActiveCardSummary {
  fileName?: string;
  workCardId: string;
  title: string;
  phase: string;
  status: string;
  riskLevel: string;
}

interface WorkflowRouterShellProps {
  appName: string;
  activeScreen: string;
  phase: string;
  phaseOptions: string[];
  activeCard: ActiveCardSummary | null;
  workCards: ChampCitySavedWorkCardSummary[];
  manualNavigationItems: ManualNavigationItem[];
  currentActionResult: ChampCityCurrentRequiredActionResult | null;
  currentActionLoadState: LoadState;
  currentActionError?: string;
  onRefreshCurrentAction: () => void | Promise<void>;
  onManualScreenChange: (screen: string) => void;
  onPhaseChange: (phase: string) => void;
  onCardChange: (fileName: string) => void;
  children: ReactNode;
}

const RAIL_STEPS: RailStep[] = [
  {
    index: 0,
    label: "Intake",
    states: ["project-intake"],
    group: "project",
  },
  {
    index: 1,
    label: "Interview",
    states: ["project-interview"],
    group: "project",
  },
  {
    index: 2,
    label: "Recon",
    states: ["reconciliation"],
    group: "project",
  },
  {
    index: 3,
    label: "Mapping",
    states: ["project-mapping"],
    group: "project",
  },
  {
    index: 4,
    label: "Phase Plan",
    states: ["phase-mapping"],
    group: "phase",
  },
  {
    index: 5,
    label: "Work Card",
    states: ["work-card-review"],
    group: "loop",
  },
  {
    index: 6,
    label: "Implement",
    states: ["implementer-active"],
    group: "loop",
  },
  {
    index: 7,
    label: "Report",
    states: ["architect-review"],
    group: "loop",
  },
  {
    index: 8,
    label: "Validate",
    states: ["operator-validation", "repair-subcard"],
    group: "loop",
  },
  {
    index: 9,
    label: "Closeout",
    states: ["phase-closeout"],
    group: "closeout",
  },
  {
    index: 10,
    label: "Next Phase",
    states: ["next-phase"],
    group: "closeout",
  },
];

const GROUP_LABELS: Record<
  RailStep["group"],
  { label: string; color: string }
> = {
  project: { label: "PROJECT SETUP", color: "text-blue-400/60" },
  phase: { label: "PHASE LOOP", color: "text-violet-400/60" },
  loop: { label: "WORK CARD LOOP", color: "text-primary/60" },
  closeout: { label: "CLOSEOUT", color: "text-emerald-400/60" },
};

const workflowStepToState: Record<string, WorkflowState> = {
  "project intake": "project-intake",
  "project interview": "project-interview",
  "reconciliation review": "reconciliation",
  "project mapping": "project-mapping",
  "operator project approval": "project-mapping",
  "phase mapping": "phase-mapping",
  "operator phase approval": "phase-mapping",
  "phase closeout": "phase-closeout",
  "operator phase closeout approval": "phase-closeout",
  "roadmap update": "next-phase",
  "next phase activation": "next-phase",
  "repeat phase mapping work card loop": "next-phase",
};

const actionIdToState: Record<string, WorkflowState> = {
  project_intake_required: "project-intake",
  project_interview_required: "project-interview",
  reconciliation_review_required: "reconciliation",
  project_mapping_required: "project-mapping",
  operator_project_approval_required: "project-mapping",
  phase_mapping_required: "phase-mapping",
  operator_phase_approval_required: "phase-mapping",
  full_work_card_creation_required: "work-card-review",
  operator_work_card_review_required: "work-card-review",
  implementer_handoff_required: "work-card-review",
  implementer_report_required: "implementer-active",
  architect_review_of_implementer_report_required: "architect-review",
  operator_validation_required: "operator-validation",
  repair_sub_card_creation_required: "repair-subcard",
  repair_implementer_handoff_required: "repair-subcard",
  repair_validation_required: "repair-subcard",
  phase_closeout_required: "phase-closeout",
  operator_phase_closeout_approval_required: "phase-closeout",
  roadmap_update_required: "next-phase",
  next_phase_activation_required: "next-phase",
};

const workflowStateToManualScreen: Record<WorkflowState, string> = {
  "project-intake": "project-intake",
  "project-interview": "project-architect-interview",
  reconciliation: "repository-reconciliation",
  "project-mapping": "project-planning-documents",
  "phase-mapping": "phase-planning-documents",
  "work-card-review": "work-card-plan-review",
  "implementer-active": "builder-report-capture",
  "architect-review": "builder-report-capture",
  "operator-validation": "human-validation",
  "repair-subcard": "architect-prompt-composer",
  "phase-closeout": "phase-closeout",
  "next-phase": "phase-map-builder",
};

const actionIdToManualScreen: Record<string, string> = {
  project_intake_required: "project-intake",
  project_interview_required: "project-architect-interview",
  reconciliation_review_required: "repository-reconciliation",
  project_mapping_required: "project-planning-documents",
  operator_project_approval_required: "project-planning-documents",
  phase_mapping_required: "phase-planning-documents",
  operator_phase_approval_required: "phase-planning-documents",
  full_work_card_creation_required: "new-work-card",
  operator_work_card_review_required: "work-card-plan-review",
  implementer_handoff_required: "builder-prompt-generator",
  implementer_report_required: "builder-report-capture",
  architect_review_of_implementer_report_required: "builder-report-capture",
  operator_validation_required: "human-validation",
  repair_sub_card_creation_required: "architect-prompt-composer",
  repair_implementer_handoff_required: "builder-prompt-generator",
  repair_validation_required: "human-validation",
  phase_closeout_required: "phase-closeout",
  operator_phase_closeout_approval_required: "phase-closeout",
  roadmap_update_required: "project-planning-documents",
  next_phase_activation_required: "phase-map-builder",
};

function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

function normalizeKey(value: string | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeWorkflowStep(value: string | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function stateToRailIndex(state: WorkflowState): number {
  return RAIL_STEPS.find((step) => step.states.includes(state))?.index ?? 0;
}

function getWorkflowStateForAction(
  action: ChampCityCurrentRequiredAction | undefined,
): WorkflowState {
  const actionId = normalizeKey(action?.id);

  if (actionId && actionIdToState[actionId]) {
    return actionIdToState[actionId];
  }

  const workflowStep = normalizeWorkflowStep(action?.workflowStep);

  if (workflowStep && workflowStepToState[workflowStep]) {
    return workflowStepToState[workflowStep];
  }

  if (action?.responsibleRole === "implementer") {
    return "implementer-active";
  }

  if (action?.responsibleRole === "operator") {
    return "operator-validation";
  }

  return "work-card-review";
}

function getManualScreenForWorkflowState(state: WorkflowState): string {
  return workflowStateToManualScreen[state];
}

export function getManualScreenForCurrentAction(
  action: ChampCityCurrentRequiredAction | undefined,
): string {
  const actionId = normalizeKey(action?.id);

  if (actionId && actionIdToManualScreen[actionId]) {
    return actionIdToManualScreen[actionId];
  }

  return getManualScreenForWorkflowState(getWorkflowStateForAction(action));
}

export function WorkflowRouterShell({
  appName,
  activeScreen,
  phase,
  phaseOptions,
  activeCard,
  workCards,
  manualNavigationItems,
  currentActionResult,
  currentActionLoadState,
  currentActionError,
  onRefreshCurrentAction,
  onManualScreenChange,
  onPhaseChange,
  onCardChange,
  children,
}: WorkflowRouterShellProps) {
  const [activityOpen, setActivityOpen] = useState(false);
  const action = currentActionResult?.currentAction;
  const workflowState = getWorkflowStateForAction(action);
  const suggestedManualScreen = getManualScreenForCurrentAction(action);
  const supportNavigation = resolveSupportNavigationState(
    manualNavigationItems,
    suggestedManualScreen,
    activeScreen,
  );
  const activeManualItem = supportNavigation.activeScreen;
  const suggestedManualItem = supportNavigation.routedScreen;
  const routedActionAvailable = Boolean(
    action && currentActionLoadState === "ready",
  );
  const unresolvedRouteMessage =
    routedActionAvailable && !supportNavigation.routedScreenResolved
    ? `ChampCity A/I tried to open the routed screen "${suggestedManualScreen}", but that screen is not available in this build. The current action has not changed. Use Supporting tools to open an available reference or recovery screen.`
    : undefined;

  function openSuggestedFallback() {
    if (suggestedManualItem) {
      onManualScreenChange(suggestedManualItem.id);
    }
  }

  function openSupportingScreen(screen: string) {
    if (manualNavigationItems.some((item) => item.id === screen)) {
      onManualScreenChange(screen);
    }
  }

  return (
    <div
      className="flex h-screen flex-col overflow-hidden bg-background text-foreground"
      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
    >
      <TopStatusStrip
        appName={appName}
        action={action}
        currentActionLoadState={currentActionLoadState}
        workflowState={workflowState}
      />
      <SupportingToolsBar
        activeScreen={activeScreen}
        activeManualItem={activeManualItem}
        routedManualItem={suggestedManualItem}
        routedActionAvailable={routedActionAvailable}
        isViewingSupportingScreen={
          routedActionAvailable
            ? supportNavigation.isViewingSupportingScreen
            : Boolean(activeManualItem)
        }
        phase={phase}
        phaseOptions={phaseOptions}
        activeCard={activeCard}
        workCards={workCards}
        manualNavigationItems={manualNavigationItems}
        onManualScreenChange={openSupportingScreen}
        onPhaseChange={onPhaseChange}
        onCardChange={onCardChange}
      />
      <ProcessRail
        workflowState={workflowState}
        onStep={(state) =>
          openSupportingScreen(getManualScreenForWorkflowState(state))
        }
      />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <CurrentRequiredActionPanel
          action={action}
          loadState={currentActionLoadState}
          error={currentActionError}
          onRefreshCurrentAction={onRefreshCurrentAction}
          onOpenRoutedScreen={
            routedActionAvailable && supportNavigation.routedScreenResolved
              ? openSuggestedFallback
              : undefined
          }
          routedScreenLabel={suggestedManualItem?.label ?? suggestedManualScreen}
          unresolvedRouteMessage={unresolvedRouteMessage}
        />
        <ArtifactWorkspace
          action={action}
          activeManualItem={activeManualItem}
          routedScreenId={suggestedManualScreen}
          isViewingRoutedScreen={
            routedActionAvailable && supportNavigation.isViewingRoutedScreen
          }
          isViewingSupportingScreen={
            routedActionAvailable &&
            supportNavigation.isViewingSupportingScreen
          }
          loadState={currentActionLoadState}
          onReturnToCurrentAction={
            routedActionAvailable && supportNavigation.routedScreenResolved
              ? openSuggestedFallback
              : undefined
          }
        >
          {children}
        </ArtifactWorkspace>
      </div>
      <ActivityLog
        action={action}
        result={currentActionResult}
        open={activityOpen}
        onToggle={() => setActivityOpen((value) => !value)}
      />
    </div>
  );
}

function TopStatusStrip({
  appName,
  action,
  currentActionLoadState,
  workflowState,
}: {
  appName: string;
  action: ChampCityCurrentRequiredAction | undefined;
  currentActionLoadState: LoadState;
  workflowState: WorkflowState;
}) {
  const statusStyle =
    currentActionLoadState === "error"
      ? "text-red-400"
      : currentActionLoadState === "loading"
        ? "text-amber-400"
        : "text-emerald-400";
  const statusLabel =
    currentActionLoadState === "error"
      ? "IPC error"
      : currentActionLoadState === "loading"
        ? "Loading"
        : "IPC ready";

  return (
    <div className="flex h-10 shrink-0 items-center gap-0 overflow-hidden border-b border-border bg-card/80 px-4 text-xs">
      <img
        src={logoImage}
        alt={appName}
        className="mr-3 h-6 w-auto shrink-0 object-contain"
      />
      <div className="mx-2 h-4 w-px shrink-0 bg-border" />
      <span className="shrink-0 font-semibold text-foreground">{appName}</span>
      <span className="ml-1 shrink-0 text-muted-foreground/50">
        Workflow Router
      </span>
      <div className="mx-3 h-4 w-px shrink-0 bg-border" />
      <FolderOpen
        size={11}
        className="mr-1.5 shrink-0 text-muted-foreground/60"
      />
      <span className="max-w-[180px] truncate font-mono text-muted-foreground/80">
        &lt;PROJECT_REPO&gt;
      </span>
      <GitBranch
        size={11}
        className="mx-2 shrink-0 text-muted-foreground/60"
      />
      <span className="shrink-0 font-mono text-muted-foreground/80">
        feature/wc03
      </span>
      <div className="mx-3 h-4 w-px shrink-0 bg-border" />
      <Zap size={11} className={cn(statusStyle, "mr-1 shrink-0")} />
      <span className={cn(statusStyle, "shrink-0 font-medium")}>
        {statusLabel}
      </span>
      <div className="mx-3 h-4 w-px shrink-0 bg-border" />
      <Badge className="shrink-0 border-primary/20 bg-primary/10 text-primary">
        {action?.phaseId ?? "phase"}
      </Badge>
      {action?.workCardId ? (
        <Badge className="ml-2 shrink-0 border-amber-400/20 bg-amber-400/10 text-amber-400">
          {action.workCardId}
        </Badge>
      ) : null}
      <div className="mx-3 h-4 w-px shrink-0 bg-border" />
      <span className="truncate text-muted-foreground/70">
        {action?.title ?? stateLabel(workflowState)}
      </span>
      <div className="flex-1" />
      <span className="shrink-0 text-[11px] font-medium text-emerald-400">
        Saved
      </span>
    </div>
  );
}

function SupportingToolsBar({
  activeScreen,
  activeManualItem,
  routedManualItem,
  routedActionAvailable,
  isViewingSupportingScreen,
  phase,
  phaseOptions,
  activeCard,
  workCards,
  manualNavigationItems,
  onManualScreenChange,
  onPhaseChange,
  onCardChange,
}: {
  activeScreen: string;
  activeManualItem: ManualNavigationItem | undefined;
  routedManualItem: ManualNavigationItem | undefined;
  routedActionAvailable: boolean;
  isViewingSupportingScreen: boolean;
  phase: string;
  phaseOptions: string[];
  activeCard: ActiveCardSummary | null;
  workCards: ChampCitySavedWorkCardSummary[];
  manualNavigationItems: ManualNavigationItem[];
  onManualScreenChange: (screen: string) => void;
  onPhaseChange: (phase: string) => void;
  onCardChange: (fileName: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const architectItems = manualNavigationItems.filter(
    (item) => item.mode === "architect",
  );
  const implementerItems = manualNavigationItems.filter(
    (item) => item.mode === "implementer",
  );

  return (
    <div className="flex h-8 shrink-0 items-center border-b border-border bg-card/30">
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          title="Browse screens beyond the route-specific action button"
          className="flex h-8 items-center gap-1.5 border-r border-border px-3 text-[11px] text-muted-foreground/70 transition-colors hover:bg-white/[0.04] hover:text-foreground"
        >
          <Wrench size={11} />
          Supporting tools
          <ChevronDown size={10} />
        </button>
        {open ? (
          <div className="absolute left-0 top-full z-50 mt-1 grid min-w-[480px] grid-cols-2 gap-1.5 rounded-lg border border-border bg-card p-1.5 shadow-xl">
            <p className="break-anywhere col-span-2 px-2 pb-1 text-[10px] leading-relaxed text-muted-foreground/60">
              Reference and recovery tools. Opening one changes only the
              workspace view; it does not complete or advance the current
              action.
            </p>
            <ManualNavGroup
              title="Architect support"
              items={architectItems}
              activeScreen={activeScreen}
              onSelect={(screen) => {
                onManualScreenChange(screen);
                setOpen(false);
              }}
            />
            <ManualNavGroup
              title="Implementer support"
              items={implementerItems}
              activeScreen={activeScreen}
              onSelect={(screen) => {
                onManualScreenChange(screen);
                setOpen(false);
              }}
            />
          </div>
        ) : null}
      </div>
      <span
        className={cn(
          "min-w-0 truncate px-3 text-[10px]",
          isViewingSupportingScreen
            ? "text-amber-300/80"
            : "text-primary/70",
        )}
      >
        {!routedActionAvailable
          ? `Supporting workspace: ${activeManualItem?.screenTitle ?? activeScreen}`
          : isViewingSupportingScreen
          ? `Viewing supporting screen: ${activeManualItem?.screenTitle ?? activeScreen}`
          : `Routed workspace: ${routedManualItem?.screenTitle ?? activeManualItem?.screenTitle ?? activeScreen}`}
      </span>
      <div className="flex-1" />
      <label className="flex h-8 items-center gap-1.5 border-l border-border px-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground/40">
        Reference phase
        <select
          value={phase}
          onChange={(event) => onPhaseChange(event.target.value)}
          className="h-6 max-w-[140px] rounded border border-border bg-[#0e1218] px-2 text-[11px] normal-case tracking-normal text-foreground [color-scheme:dark] focus:border-primary/40 focus:outline-none"
        >
          {phaseOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <label className="flex h-8 items-center gap-1.5 border-l border-border px-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground/40">
        Reference card
        <select
          value={activeCard?.fileName ?? ""}
          onChange={(event) => onCardChange(event.target.value)}
          disabled={workCards.length === 0}
          className="h-6 max-w-[220px] rounded border border-border bg-[#0e1218] px-2 text-[11px] normal-case tracking-normal text-foreground [color-scheme:dark] focus:border-primary/40 focus:outline-none disabled:opacity-50"
        >
          <option value="">No manual selection</option>
          {workCards.map((workCard) => (
            <option key={workCard.fileName} value={workCard.fileName}>
              {workCard.workCardId} - {workCard.title}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function ManualNavGroup({
  title,
  items,
  activeScreen,
  onSelect,
}: {
  title: string;
  items: ManualNavigationItem[];
  activeScreen: string;
  onSelect: (screen: string) => void;
}) {
  return (
    <div>
      <div className="px-2 pb-1 text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground/35">
        {title}
      </div>
      <div className="flex flex-col gap-0.5">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={cn(
              "flex w-full items-start gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors",
              item.id === activeScreen
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground/80 hover:bg-white/[0.05] hover:text-foreground",
            )}
          >
            <Circle
              size={7}
              className={cn(
                "mt-1 shrink-0",
                item.id === activeScreen
                  ? "fill-primary text-primary"
                  : "text-muted-foreground/30",
              )}
            />
            <span className="min-w-0">
              <span className="block truncate">{item.label}</span>
              <span className="block truncate text-[10px] text-muted-foreground/45">
                {item.shortDesc}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ProcessRail({
  workflowState,
  onStep,
}: {
  workflowState: WorkflowState;
  onStep: (state: WorkflowState) => void;
}) {
  const activeIndex = stateToRailIndex(workflowState);
  const groups = RAIL_STEPS.reduce<Array<{ key: RailStep["group"]; steps: RailStep[] }>>(
    (result, step) => {
      const current = result[result.length - 1];

      if (!current || current.key !== step.group) {
        result.push({ key: step.group, steps: [step] });
      } else {
        current.steps.push(step);
      }

      return result;
    },
    [],
  );

  return (
    <div className="shrink-0 border-b border-border bg-card/50 px-4 py-0">
      <div className="flex h-5 items-end">
        {groups.map((group, groupIndex) => {
          const groupLabel = GROUP_LABELS[group.key];
          const stepWidth = 72;
          const connectorWidth = 20;
          const width =
            group.steps.length * stepWidth +
            (group.steps.length - 1) * connectorWidth;
          const isLast = groupIndex === groups.length - 1;

          return (
            <div
              key={group.key}
              className="flex shrink-0 items-end"
              style={{
                width: isLast ? undefined : width + connectorWidth,
              }}
            >
              <span
                className={cn(
                  "pb-1 text-[8px] font-bold uppercase leading-none tracking-[0.16em]",
                  groupLabel.color,
                )}
                style={{
                  width: isLast ? undefined : width,
                  textAlign: "center",
                }}
              >
                {groupLabel.label}
              </span>
              {!isLast ? <div className="flex-1" /> : null}
            </div>
          );
        })}
      </div>
      <div className="flex items-center pb-2.5">
        {RAIL_STEPS.map((step, index) => {
          const isActive = step.index === activeIndex;
          const isDone = step.index < activeIndex;
          const isRepairActive =
            workflowState === "repair-subcard" && step.index === 8;
          const isLast = index === RAIL_STEPS.length - 1;

          return (
            <div key={step.index} className="flex shrink-0 items-center">
              <button
                type="button"
                onClick={() => onStep(step.states[0])}
                title={`Open the ${step.label} screen without changing the current action.`}
                className="group flex w-[72px] flex-col items-center gap-1 transition-all"
              >
                <div
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all",
                    isActive &&
                      !isRepairActive &&
                      "border-primary bg-primary/20 shadow-[0_0_0_3px_rgba(0,204,230,0.15)]",
                    isRepairActive &&
                      "border-red-400 bg-red-400/20 shadow-[0_0_0_3px_rgba(239,68,68,0.15)]",
                    isDone && "border-emerald-400/60 bg-emerald-400/15",
                    !isActive &&
                      !isDone &&
                      "border-border bg-white/[0.02] group-hover:border-muted-foreground/40",
                  )}
                >
                  {isDone ? (
                    <Check size={11} className="text-emerald-400" />
                  ) : isActive ? (
                    <Circle
                      size={8}
                      className={cn(
                        isRepairActive
                          ? "fill-red-400 text-red-400"
                          : "fill-primary text-primary",
                      )}
                    />
                  ) : (
                    <Circle size={6} className="text-muted-foreground/25" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-center text-[10px] font-medium leading-tight",
                    isActive && !isRepairActive && "text-primary",
                    isRepairActive && "text-red-400",
                    isDone && "text-muted-foreground/60",
                    !isActive &&
                      !isDone &&
                      "text-muted-foreground/40 group-hover:text-muted-foreground/70",
                  )}
                >
                  {isRepairActive ? "Repair" : step.label}
                </span>
              </button>
              {!isLast ? (
                <div
                  className={cn(
                    "h-px w-5 shrink-0",
                    step.index < activeIndex
                      ? "bg-emerald-400/30"
                      : "bg-white/[0.08]",
                  )}
                />
              ) : null}
            </div>
          );
        })}
        <div className="ml-4 flex items-center gap-4 text-[9px] text-muted-foreground/35">
          <span className="flex items-center gap-1 text-primary/55">
            <Info size={9} />
            Route position · step clicks open support only
          </span>
          <span className="flex items-center gap-1">
            <RotateCcw size={9} className="text-primary/35" />
            WC loop repeats per card
          </span>
          <span className="flex items-center gap-1">
            <RotateCcw size={9} className="text-violet-400/35" />
            Phase loop repeats per phase
          </span>
          {workflowState === "repair-subcard" ? (
            <span className="flex items-center gap-1 text-red-400/60">
              <Wrench size={9} />
              Repair loop active
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CurrentRequiredActionPanel({
  action,
  loadState,
  error,
  onRefreshCurrentAction,
  onOpenRoutedScreen,
  routedScreenLabel,
  unresolvedRouteMessage,
}: {
  action: ChampCityCurrentRequiredAction | undefined;
  loadState: LoadState;
  error?: string;
  onRefreshCurrentAction: () => void | Promise<void>;
  onOpenRoutedScreen?: () => void;
  routedScreenLabel: string;
  unresolvedRouteMessage?: string;
}) {
  const actorColors: Record<string, string> = {
    operator: "text-primary",
    architect: "text-violet-400",
    implementer: "text-amber-400",
    app_system: "text-emerald-400",
  };
  const role = action?.responsibleRole ?? "app_system";
  const expectedOutput = action?.expectedOutput;
  const warnings = action?.warnings ?? [];
  const urgent =
    action?.status === "blocked" ||
    action?.status === "needs_repair" ||
    action?.warnings.some((warning) => warning.severity === "blocking");

  if (loadState === "loading") {
    return (
      <CurrentActionStatePanel
        title="Loading current action"
        description="Reading the durable WC02 current-action model. Manual navigation remains available while the route is loading."
        tone="info"
        onRefreshCurrentAction={onRefreshCurrentAction}
      />
    );
  }

  if (loadState === "error") {
    return (
      <CurrentActionStatePanel
        title="Current action unavailable"
        description={error ?? "Current-action state could not be loaded."}
        tone="error"
        onRefreshCurrentAction={onRefreshCurrentAction}
        onOpenFallback={onOpenRoutedScreen}
      />
    );
  }

  if (!action) {
    return (
      <CurrentActionStatePanel
        title="No current action returned"
        description="The durable model loaded successfully but did not provide a current action. Refresh the route or open a supporting screen."
        tone="warning"
        onRefreshCurrentAction={onRefreshCurrentAction}
        onOpenFallback={onOpenRoutedScreen}
      />
    );
  }

  const complete = action.status === "complete";

  return (
    <div className="flex w-[400px] shrink-0 flex-col gap-0 overflow-y-auto border-r border-border bg-card/35">
      <div
        className={cn(
          "border-b border-border px-5 pb-4 pt-5",
          urgent && "border-l-2 border-l-red-400",
          complete && "border-l-2 border-l-emerald-400",
        )}
      >
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-primary/80">
            {complete ? "Workflow state" : "Next required action"}
          </span>
          <StatusBadge status={action.status} />
        </div>
        <h2 className="text-lg font-semibold leading-tight text-foreground">
          {action.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground/85">
          {action.summary}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <ActionMetadata
            label="Responsible role"
            value={roleLabel(role)}
            valueClassName={actorColors[role] ?? "text-muted-foreground"}
          />
          <ActionMetadata label="Workflow step" value={action.workflowStep} />
          <ActionMetadata
            label="Phase"
            value={
              action.phaseId
                ? `${action.phaseId}${action.phaseTitle ? ` - ${action.phaseTitle}` : ""}`
                : "Not provided"
            }
          />
          <ActionMetadata
            label="Work Card"
            value={
              action.workCardId
                ? `${action.workCardId}${action.workCardTitle ? ` - ${action.workCardTitle}` : ""}`
                : "Not provided"
            }
          />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-5 px-5 py-4">
        <InfoBlock
          label="Why this is next"
          body={action.reason}
        />

        <ExpectedOutputCard expectedOutput={expectedOutput} />

        <EvidenceList artifacts={action.sourceArtifacts} />

        <MissingEvidenceList missing={action.missingArtifacts} />

        <RouteOutcomes action={action} />

        <WarningGroups warnings={warnings} />

        <div>
          <PanelLabel>Routed screen</PanelLabel>
          <div className="rounded-md border border-border bg-white/[0.025] p-3">
            <div className="mb-1 text-xs font-semibold text-foreground/80">
              {`Screen for this action: ${routedScreenLabel}`}
            </div>
            <p className="break-anywhere text-xs leading-relaxed text-muted-foreground/70">
              {action.manualFallback?.instructions ??
                "No route-specific support instructions were provided. Existing screens remain available to help with the task, but the current-action route remains the workflow authority."}
            </p>
            {action.manualFallback?.artifactPath ? (
              <div className="mt-2 break-all font-mono text-[10px] leading-relaxed text-primary/70">
                {action.manualFallback.artifactPath}
              </div>
            ) : null}
          </div>
        </div>

        {unresolvedRouteMessage ? (
          <Notice type="warning">{unresolvedRouteMessage}</Notice>
        ) : null}
      </div>
      <div className="flex flex-col gap-2 border-t border-border px-5 pb-5 pt-4">
        {onOpenRoutedScreen ? (
          <button
            type="button"
            onClick={onOpenRoutedScreen}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition-colors",
              urgent
                ? "border border-red-500/30 bg-red-500/15 text-red-300 hover:bg-red-500/25"
                : "bg-primary text-primary-foreground hover:bg-primary/85",
            )}
          >
            {complete
              ? `Open routed screen: ${routedScreenLabel}`
              : `Continue current action: ${routedScreenLabel}`}
            <ArrowRight size={12} />
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            void onRefreshCurrentAction();
          }}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground/80 transition-colors hover:bg-white/[0.04] hover:text-foreground"
        >
          <RefreshCw size={12} />
          Refresh current action
        </button>
      </div>
    </div>
  );
}

function CurrentActionStatePanel({
  title,
  description,
  tone,
  onRefreshCurrentAction,
  onOpenFallback,
}: {
  title: string;
  description: string;
  tone: "info" | "warning" | "error";
  onRefreshCurrentAction: () => void | Promise<void>;
  onOpenFallback?: () => void;
}) {
  return (
    <div className="flex w-[400px] shrink-0 flex-col border-r border-border bg-card/35 p-5">
      <div className="mb-3 text-[9px] font-bold uppercase tracking-[0.16em] text-primary/80">
        Primary guided action
      </div>
      <h2 className="mb-4 text-lg font-semibold text-foreground">{title}</h2>
      <Notice type={tone}>{description}</Notice>
      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => {
            void onRefreshCurrentAction();
          }}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/85"
        >
          <RefreshCw size={12} />
          Refresh current action
        </button>
        {onOpenFallback ? (
          <button
            type="button"
            onClick={onOpenFallback}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground/80 transition-colors hover:bg-white/[0.04] hover:text-foreground"
          >
            Open supporting screens
            <ArrowRight size={12} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ActionMetadata({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0 rounded-md border border-border bg-white/[0.025] px-2.5 py-2">
      <div className="mb-1 text-[9px] uppercase tracking-[0.12em] text-muted-foreground/45">
        {label}
      </div>
      <div
        className={cn(
          "break-words text-[11px] font-medium leading-snug text-foreground/75",
          valueClassName,
        )}
      >
        {value}
      </div>
    </div>
  );
}

function ExpectedOutputCard({
  expectedOutput,
}: {
  expectedOutput: ChampCityCurrentRequiredAction["expectedOutput"];
}) {
  return (
    <div>
      <PanelLabel>Expected output</PanelLabel>
      <div className="rounded-md border border-primary/20 bg-primary/[0.04] p-3">
        {expectedOutput ? (
          <>
            <div className="text-xs font-semibold text-primary/85">
              {expectedOutput.artifactType}
            </div>
            {expectedOutput.path ? (
              <div className="mt-1.5 break-all font-mono text-[10px] leading-relaxed text-foreground/70">
                {expectedOutput.path}
              </div>
            ) : null}
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground/75">
              {expectedOutput.description}
            </p>
          </>
        ) : (
          <p className="text-xs text-muted-foreground/65">
            No expected output was provided by the current-action model.
          </p>
        )}
      </div>
    </div>
  );
}

function EvidenceList({
  artifacts,
}: {
  artifacts: ChampCityCurrentRequiredAction["sourceArtifacts"];
}) {
  const visible = artifacts.slice(0, 4);
  const overflow = artifacts.slice(4);

  return (
    <div>
      <PanelLabel>Source evidence ({artifacts.length})</PanelLabel>
      <div className="flex flex-col gap-1.5">
        {visible.map((artifact) => (
          <ArtifactLine
            key={`${artifact.path}|${artifact.role}`}
            artifact={artifact}
          />
        ))}
        {overflow.length > 0 ? (
          <details className="rounded-md border border-border bg-white/[0.02] px-2.5 py-2">
            <summary className="cursor-pointer text-[11px] text-primary/75">
              Show {overflow.length} more source artifact
              {overflow.length === 1 ? "" : "s"}
            </summary>
            <div className="mt-2 flex flex-col gap-1.5">
              {overflow.map((artifact) => (
                <ArtifactLine
                  key={`${artifact.path}|${artifact.role}`}
                  artifact={artifact}
                />
              ))}
            </div>
          </details>
        ) : null}
        {artifacts.length === 0 ? (
          <p className="text-xs text-muted-foreground/60">
            No source artifacts reported for this route.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function MissingEvidenceList({
  missing,
}: {
  missing: ChampCityCurrentRequiredAction["missingArtifacts"];
}) {
  const visible = missing.slice(0, 4);
  const overflow = missing.slice(4);

  return (
    <div>
      <PanelLabel>Missing evidence ({missing.length})</PanelLabel>
      <div className="flex flex-col gap-2">
        {visible.map((artifact) => (
          <MissingEvidenceLine
            key={`${artifact.path}|${artifact.reason}`}
            artifact={artifact}
          />
        ))}
        {overflow.length > 0 ? (
          <details className="rounded-md border border-amber-400/20 bg-amber-400/[0.03] px-2.5 py-2">
            <summary className="cursor-pointer text-[11px] text-amber-300/80">
              Show {overflow.length} more missing artifact
              {overflow.length === 1 ? "" : "s"}
            </summary>
            <div className="mt-2 flex flex-col gap-2">
              {overflow.map((artifact) => (
                <MissingEvidenceLine
                  key={`${artifact.path}|${artifact.reason}`}
                  artifact={artifact}
                />
              ))}
            </div>
          </details>
        ) : null}
        {missing.length === 0 ? (
          <p className="text-xs text-muted-foreground/60">
            No missing artifacts reported.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function MissingEvidenceLine({
  artifact,
}: {
  artifact: ChampCityCurrentRequiredAction["missingArtifacts"][number];
}) {
  return (
    <div className="rounded-md border border-amber-400/20 bg-amber-400/[0.04] p-2.5">
      <div className="break-all font-mono text-[10px] leading-relaxed text-amber-300/85">
        {artifact.path}
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground/70">
        {artifact.reason}
      </p>
    </div>
  );
}

function RouteOutcomes({
  action,
}: {
  action: ChampCityCurrentRequiredAction;
}) {
  const routes = [
    action.successRoute
      ? { label: "After success", value: action.successRoute, tone: "success" as const }
      : null,
    action.failureRoute
      ? { label: "After failure / revision", value: action.failureRoute, tone: "warning" as const }
      : null,
    action.repairRoute
      ? { label: "Repair route", value: action.repairRoute, tone: "warning" as const }
      : null,
  ].filter((route): route is NonNullable<typeof route> => route !== null);

  if (routes.length === 0) {
    return null;
  }

  return (
    <div>
      <PanelLabel>Route outcomes</PanelLabel>
      <div className="flex flex-col gap-3">
        {routes.map((route) => (
          <InfoBlock
            key={route.label}
            label={route.label}
            body={route.value}
            tone={route.tone}
          />
        ))}
      </div>
    </div>
  );
}

function WarningGroups({
  warnings,
}: {
  warnings: ChampCityCurrentRequiredActionWarning[];
}) {
  const severityOrder = ["blocking", "warning", "info"] as const;

  return (
    <div>
      <PanelLabel>Warnings and notices ({warnings.length})</PanelLabel>
      {warnings.length === 0 ? (
        <Notice type="success">No warnings reported for this route.</Notice>
      ) : (
        <div className="flex flex-col gap-3">
          {severityOrder.map((severity) => {
            const entries = warnings.filter(
              (warning) => warning.severity === severity,
            );

            return entries.length > 0 ? (
              <WarningSeverityGroup
                key={severity}
                severity={severity}
                warnings={entries}
              />
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}

function WarningSeverityGroup({
  severity,
  warnings,
}: {
  severity: ChampCityCurrentRequiredActionWarning["severity"];
  warnings: ChampCityCurrentRequiredActionWarning[];
}) {
  const styles = {
    blocking: {
      label: "Blocking",
      border: "border-red-400/30",
      background: "bg-red-400/[0.07]",
      text: "text-red-200/90",
      icon: <AlertTriangle size={12} />,
    },
    warning: {
      label: "Warning",
      border: "border-amber-400/25",
      background: "bg-amber-400/[0.05]",
      text: "text-amber-200/90",
      icon: <AlertTriangle size={12} />,
    },
    info: {
      label: "Information",
      border: "border-blue-400/20",
      background: "bg-blue-400/[0.04]",
      text: "text-blue-200/85",
      icon: <Info size={12} />,
    },
  }[severity];

  return (
    <div className={cn("rounded-md border p-2.5", styles.border, styles.background)}>
      <div className={cn("mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em]", styles.text)}>
        {styles.icon}
        {styles.label} ({warnings.length})
      </div>
      <div className="flex flex-col gap-2">
        {warnings.map((warning) => (
          <div
            key={`${warning.code}|${warning.sourceArtifactPath ?? warning.message}`}
            className="min-w-0"
          >
            <p
              className={cn(
                "break-anywhere text-[11px] leading-relaxed",
                styles.text,
              )}
            >
              {plainLanguageWarning(warning)}
            </p>
            <details className="mt-1 text-[9px] leading-relaxed text-muted-foreground/55">
              <summary className="break-anywhere cursor-pointer">
                Technical details: {warning.code}
              </summary>
              <p className="break-anywhere mt-1">{warning.message}</p>
              {warning.sourceArtifactPath ? (
                <div className="break-anywhere mt-1 font-mono">
                  {warning.sourceArtifactPath}
                </div>
              ) : null}
            </details>
          </div>
        ))}
      </div>
    </div>
  );
}

function ArtifactWorkspace({
  action,
  activeManualItem,
  routedScreenId,
  isViewingRoutedScreen,
  isViewingSupportingScreen,
  loadState,
  onReturnToCurrentAction,
  children,
}: {
  action: ChampCityCurrentRequiredAction | undefined;
  activeManualItem: ManualNavigationItem | undefined;
  routedScreenId: string;
  isViewingRoutedScreen: boolean;
  isViewingSupportingScreen: boolean;
  loadState: LoadState;
  onReturnToCurrentAction?: () => void;
  children: ReactNode;
}) {
  const artifactTitle =
    activeManualItem?.screenTitle ??
    "Supporting workspace";

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      {loadState !== "ready" || !action ? (
        <div className="shrink-0 border-b border-border bg-card/30 px-5 py-2.5">
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/55">
            Supporting workspace available
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground/70">
            {loadState === "loading"
              ? "The current action is still loading. You may use this screen for reference while the route is resolved."
              : "The current action is unavailable. Supporting tools remain available for reference or recovery and do not advance workflow state."}
          </p>
        </div>
      ) : isViewingSupportingScreen ? (
        <div className="flex shrink-0 items-center gap-4 border-b border-amber-400/20 bg-amber-400/[0.06] px-5 py-3">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-300/80">
              Viewing supporting screen
            </div>
            <div className="mt-1 text-sm font-semibold text-foreground">
              {activeManualItem?.screenTitle ?? "Supporting tool"}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground/75">
              This screen is for reference or recovery. Current action remains:
              {` ${action?.title ?? "unavailable"}`}. Opening it changes only
              this workspace view; durable workflow state is unchanged.
            </p>
          </div>
          {onReturnToCurrentAction ? (
            <button
              type="button"
              onClick={onReturnToCurrentAction}
              className="flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/85"
            >
              Return to current action
              <ArrowRight size={12} />
            </button>
          ) : null}
        </div>
      ) : isViewingRoutedScreen ? (
        <div className="shrink-0 border-b border-primary/15 bg-primary/[0.035] px-5 py-2 text-[11px] text-primary/75">
          Routed current-action screen · {action?.title ?? "Current action"}
        </div>
      ) : (
        <div className="shrink-0 border-b border-amber-400/20 bg-amber-400/[0.06] px-5 py-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-300/80">
            Routed screen unavailable
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground/75">
            ChampCity A/I tried to open "{routedScreenId}", but no matching
            screen is available. The current action remains
            {` ${action?.title ?? "unchanged"}`}. Supporting tools are still
            available for reference or recovery.
          </p>
        </div>
      )}
      <div className="flex shrink-0 items-center gap-3 border-b border-border bg-card/20 px-5 py-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <FileText
            size={13}
            className="shrink-0 text-muted-foreground/50"
          />
          <span className="truncate font-mono text-xs text-foreground/70">
            {artifactTitle}
          </span>
          {isViewingRoutedScreen && action?.expectedOutput?.path ? (
            <span className="truncate text-[10px] text-muted-foreground/45">
              Expected output: {action.expectedOutput.path}
            </span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <WriteBadge state={loadState} />
          {action?.status ? <StatusBadge status={action.status} /> : null}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden bg-background/75">
        {children}
      </div>
    </div>
  );
}

function ContextInspector({
  action,
  result,
  activeManualItem,
}: {
  action: ChampCityCurrentRequiredAction | undefined;
  result: ChampCityCurrentRequiredActionResult | null;
  activeManualItem: ManualNavigationItem | undefined;
}) {
  const warnings = action?.warnings ?? [];
  const errorMessages = result?.errorMessages ?? [];

  return (
    <div className="flex w-64 shrink-0 flex-col overflow-y-auto border-l border-border bg-card/20">
      <div className="border-b border-border px-4 pb-2 pt-3">
        <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/40">
          Route &amp; evidence context
        </div>
        <p className="break-anywhere mt-1 text-[10px] leading-relaxed text-muted-foreground/55">
          Reference details for the current route and selected supporting
          workspace.
        </p>
      </div>
      <div className="flex flex-1 flex-col gap-4 px-4 py-3">
        <InspectorSection
          title="Workspace"
          items={[
            ["Supporting screen", activeManualItem?.label ?? "None selected"],
            ["Screen purpose", activeManualItem?.shortDesc ?? "No supporting screen selected"],
          ]}
        />
        <InspectorSection
          title="Route metadata"
          items={[
            ["Phase", action?.phaseId ?? "None reported"],
            ["Work Card", action?.workCardId ?? "None reported"],
            ["Status", action?.status ?? "Unknown"],
            ["Evidence files", String(action?.sourceArtifacts.length ?? 0)],
            ["Missing inputs", String(action?.missingArtifacts.length ?? 0)],
            ["Notices", String(warnings.length + errorMessages.length)],
          ]}
        />
        <InspectorArtifactSection
          title="Evidence index"
          artifacts={action?.sourceArtifacts ?? []}
        />
        <InspectorMissingSection
          title="Missing inputs"
          missing={action?.missingArtifacts ?? []}
        />
        <InspectorWarningSection
          title="Notice index"
          warnings={warnings}
          errors={errorMessages}
        />
      </div>
    </div>
  );
}

function ActivityLog({
  action,
  result,
  open,
  onToggle,
}: {
  action: ChampCityCurrentRequiredAction | undefined;
  result: ChampCityCurrentRequiredActionResult | null;
  open: boolean;
  onToggle: () => void;
}) {
  const events = useMemo(() => {
    const items: Array<{
      id: string;
      type: "write" | "approval" | "validation" | "warning";
      msg: string;
      time: string;
    }> = [];

    if (action) {
      items.push({
        id: "action",
        type: "approval",
        msg: action.title,
        time: "Now",
      });
    }

    if (action?.expectedOutput) {
      items.push({
        id: "output",
        type: "write",
        msg:
          action.expectedOutput.path ??
          `${action.expectedOutput.artifactType} expected`,
        time: "Next",
      });
    }

    for (const warning of action?.warnings.slice(0, 3) ?? []) {
      items.push({
        id: `${warning.code}|${warning.sourceArtifactPath ?? warning.message}`,
        type: "warning",
        msg: warning.message,
        time: warning.severity,
      });
    }

    for (const error of result?.errorMessages?.slice(0, 2) ?? []) {
      items.push({
        id: `error|${error}`,
        type: "warning",
        msg: error,
        time: "Error",
      });
    }

    return items.length > 0
      ? items
      : [
          {
            id: "loading",
            type: "validation" as const,
            msg: "Current-action route pending",
            time: "Now",
          },
        ];
  }, [action, result]);

  const typeStyles: Record<string, string> = {
    write: "text-blue-400",
    approval: "text-primary",
    validation: "text-emerald-400",
    warning: "text-amber-400",
  };
  const typeIcons: Record<string, ReactNode> = {
    write: <Save size={10} />,
    approval: <Check size={10} />,
    validation: <CheckCircle size={10} />,
    warning: <AlertTriangle size={10} />,
  };

  return (
    <div
      className={cn(
        "shrink-0 border-t border-border bg-card/40 transition-all",
        open ? "h-24" : "h-8",
      )}
    >
      <div className="flex h-8 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <Activity size={11} className="text-muted-foreground/50" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/50">
            Evidence Activity
          </span>
          <span className="text-[10px] text-muted-foreground/35">
            {events.length} route events
          </span>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="text-muted-foreground/40 transition-colors hover:text-muted-foreground/80"
        >
          {open ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
        </button>
      </div>
      {open ? (
        <div className="flex h-[calc(96px-32px)] items-center gap-0 overflow-x-auto px-4 py-2">
          {events.map((event, index) => (
            <div key={event.id} className="flex shrink-0 items-center">
              <div className="flex min-w-[200px] max-w-[280px] flex-col gap-0.5 rounded-md border border-border bg-white/[0.02] px-3 py-2">
                <div
                  className={cn(
                    "flex items-center gap-1 text-[10px] font-medium",
                    typeStyles[event.type],
                  )}
                >
                  {typeIcons[event.type]}
                  {event.time}
                </div>
                <div className="truncate text-[11px] leading-snug text-foreground/60">
                  {event.msg}
                </div>
              </div>
              {index < events.length - 1 ? (
                <ChevronRight
                  size={10}
                  className="mx-1 shrink-0 text-muted-foreground/20"
                />
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Badge({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium",
        className,
      )}
    >
      {children}
    </span>
  );
}

function WriteBadge({ state }: { state: LoadState }) {
  const styles: Record<LoadState, string> = {
    loading: "border-amber-400/20 bg-amber-400/8 text-amber-400",
    ready: "border-emerald-400/20 bg-emerald-400/8 text-emerald-400",
    error: "border-red-400/20 bg-red-400/8 text-red-400",
  };
  const labels: Record<LoadState, string> = {
    loading: "Loading",
    ready: "Live data",
    error: "Load error",
  };

  return <Badge className={styles[state]}>{labels[state]}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const normalized = normalizeKey(status);
  const isUrgent =
    normalized.includes("blocked") ||
    normalized.includes("repair") ||
    normalized.includes("error");
  const isReview =
    normalized.includes("review") ||
    normalized.includes("approval") ||
    normalized.includes("validation");

  return (
    <Badge
      className={
        isUrgent
          ? "border-red-400/20 bg-red-400/8 text-red-400"
          : isReview
            ? "border-amber-400/20 bg-amber-400/8 text-amber-400"
            : "border-primary/20 bg-primary/8 text-primary"
      }
    >
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

function PanelLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/40">
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/35">
      {children}
    </div>
  );
}

function InfoBlock({
  label,
  body,
  tone,
}: {
  label: string;
  body: string;
  tone?: "success" | "warning";
}) {
  return (
    <div>
      <PanelLabel>{label}</PanelLabel>
      <p
        className={cn(
          "break-anywhere min-w-0 text-xs leading-relaxed",
          tone === "success" && "text-emerald-400/70",
          tone === "warning" && "text-amber-400/70",
          !tone && "text-muted-foreground/80",
        )}
      >
        {body}
      </p>
    </div>
  );
}

function Notice({
  type,
  children,
}: {
  type: "warning" | "error" | "info" | "success";
  children: ReactNode;
}) {
  const styles: Record<typeof type, string> = {
    warning: "border-amber-400/20 bg-amber-400/8 text-amber-200/85",
    error: "border-red-400/20 bg-red-400/8 text-red-200/85",
    info: "border-primary/20 bg-primary/8 text-primary/85",
    success: "border-emerald-400/20 bg-emerald-400/8 text-emerald-200/85",
  };
  const icons: Record<typeof type, ReactNode> = {
    warning: <AlertTriangle size={12} />,
    error: <AlertTriangle size={12} />,
    info: <Info size={12} />,
    success: <CheckCircle size={12} />,
  };

  return (
    <div
      className={cn(
        "flex min-w-0 gap-2 rounded-md border px-3 py-2 text-xs leading-relaxed",
        styles[type],
      )}
    >
      <span className="mt-0.5 shrink-0">{icons[type]}</span>
      <span className="break-anywhere min-w-0">{children}</span>
    </div>
  );
}

function ArtifactLine({
  artifact,
}: {
  artifact: ChampCityCurrentRequiredAction["sourceArtifacts"][number];
}) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-foreground/60">
      <FileText size={10} className="shrink-0 text-muted-foreground/40" />
      <span className="min-w-[64px] shrink-0 text-muted-foreground/45">
        {artifact.role}
      </span>
      <span className="break-anywhere min-w-0 font-mono">{artifact.path}</span>
    </div>
  );
}

function InspectorSection({
  title,
  items,
}: {
  title: string;
  items: Array<[string, string]>;
}) {
  return (
    <div>
      <SectionLabel>{title}</SectionLabel>
      <div className="flex flex-col gap-1.5">
        {items.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-0.5">
            <span className="text-[10px] leading-none text-muted-foreground/45">
              {label}
            </span>
            <span className="break-anywhere text-[11px] leading-snug text-foreground/65">
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InspectorArtifactSection({
  title,
  artifacts,
}: {
  title: string;
  artifacts: ChampCityCurrentRequiredAction["sourceArtifacts"];
}) {
  return (
    <div>
      <SectionLabel>{title}</SectionLabel>
      <div className="flex flex-col gap-2">
        {artifacts.slice(0, 6).map((artifact) => (
          <div
            key={`${artifact.path}|${artifact.role}`}
            className="rounded-md border border-border bg-white/[0.025] p-2"
          >
            <div className="mb-1 text-[10px] text-muted-foreground/45">
              {artifact.role}
            </div>
            <div className="break-all font-mono text-[10px] leading-relaxed text-foreground/65">
              {artifact.path}
            </div>
          </div>
        ))}
        {artifacts.length === 0 ? (
          <p className="text-[11px] text-muted-foreground/55">
            No evidence artifacts reported.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function InspectorMissingSection({
  title,
  missing,
}: {
  title: string;
  missing: ChampCityCurrentRequiredAction["missingArtifacts"];
}) {
  return (
    <div>
      <SectionLabel>{title}</SectionLabel>
      <div className="flex flex-col gap-2">
        {missing.slice(0, 4).map((artifact) => (
          <div
            key={artifact.path}
            className="rounded-md border border-amber-400/15 bg-amber-400/[0.04] p-2"
          >
            <div className="break-all font-mono text-[10px] leading-relaxed text-amber-300/80">
              {artifact.path}
            </div>
            <div className="break-anywhere mt-1 text-[11px] leading-relaxed text-muted-foreground/65">
              {artifact.reason}
            </div>
          </div>
        ))}
        {missing.length === 0 ? (
          <p className="text-[11px] text-muted-foreground/55">
            No missing artifacts reported.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function InspectorWarningSection({
  title,
  warnings,
  errors,
}: {
  title: string;
  warnings: ChampCityCurrentRequiredActionWarning[];
  errors: string[];
}) {
  const entries = [
    ...warnings.map((warning) => ({
      key: `${warning.code}|${warning.sourceArtifactPath ?? warning.message}`,
      label: warning.code,
      message: plainLanguageWarning(warning),
      tone:
        warning.severity === "blocking"
          ? "text-red-300/85"
          : "text-amber-300/85",
    })),
    ...errors.map((message) => ({
      key: `error|${message}`,
      label: "error",
      message,
      tone: "text-red-300/85",
    })),
  ];

  return (
    <div>
      <SectionLabel>{title}</SectionLabel>
      <div className="flex flex-col gap-2">
        {entries.slice(0, 5).map((entry) => (
          <div
            key={entry.key}
            className="rounded-md border border-amber-400/15 bg-amber-400/[0.04] p-2"
          >
            <div className="mb-1 text-[10px] uppercase tracking-[0.1em] text-muted-foreground/45">
              {entry.label}
            </div>
            <p
              className={cn(
                "break-anywhere text-[11px] leading-relaxed",
                entry.tone,
              )}
            >
              {entry.message}
            </p>
          </div>
        ))}
        {entries.length === 0 ? (
          <p className="text-[11px] text-muted-foreground/55">
            No warnings reported.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function plainLanguageWarning(
  warning: ChampCityCurrentRequiredActionWarning,
): string {
  if (warning.code === "stale_current_executable_work_card") {
    return "The roadmap's current Work Card label is behind the newer planning evidence. The app is following the newer Work Card records.";
  }

  if (warning.code === "superseded_phase_artifact") {
    return "An older planning file is available for reference only. It does not control the current workflow.";
  }

  if (warning.code === "missing_stale_validation_target") {
    return "An older validation report points to a file that is no longer present. This is historical context and does not block the current action.";
  }

  if (warning.code.endsWith("_read_warning")) {
    return "The app could not read one supporting file, so some route context may be incomplete. The technical details identify the file.";
  }

  if (warning.code.endsWith("_json_invalid")) {
    return "A supporting planning file is not valid JSON, so some route context may be missing. The technical details identify the file.";
  }

  return warning.message;
}

function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    operator: "Operator action",
    architect: "Architect action",
    implementer: "Implementer action",
    app_system: "App action",
  };

  return labels[role] ?? "Workflow action";
}

function stateLabel(state: WorkflowState): string {
  const labels: Record<WorkflowState, string> = {
    "project-intake": "Project Intake",
    "project-interview": "Project Interview",
    reconciliation: "Reconciliation Review",
    "project-mapping": "Project Mapping",
    "phase-mapping": "Phase Mapping",
    "work-card-review": "Work Card Review",
    "implementer-active": "Implementer Active",
    "architect-review": "Architect Report Review",
    "operator-validation": "Operator Validation",
    "repair-subcard": "Repair Sub-Card",
    "phase-closeout": "Phase Closeout",
    "next-phase": "Next Phase Activation",
  };

  return labels[state];
}
