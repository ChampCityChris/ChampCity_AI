import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Circle,
  Eye,
  FileText,
  FolderOpen,
  GitBranch,
  Info,
  RefreshCw,
  RotateCcw,
  Save,
  Wrench,
  X,
  Zap,
} from "lucide-react";

import logoImage from "../assets/champcity_ai_ui_branding.png";
import {
  resolveSupportNavigationState,
  type SupportNavigationItem,
} from "../../shared/workCards/supportNavigation";
import { getCurrentActionSurfaceRoute } from "../../shared/workCards/currentActionRouteTable";
import {
  resolveWorkflowVisibility,
  workflowGuideGroups,
  workflowLoopGuides,
  type WorkflowGuideStepPosition,
  type WorkflowGuideStepState,
} from "../../shared/workCards/workflowVisibility";
import {
  buildArtifactReviewWorkspace,
  getArtifactDisplayName,
  shouldShowCurrentActionArtifactWorkspace,
} from "../../shared/workCards/artifactReviewWorkspace";
import {
  buildCurrentStepContextInspector,
  shouldShowCurrentStepContextInspector,
  type CurrentStepContextInspectorModel,
  type CurrentStepEvidenceHealthItem,
} from "../../shared/workCards/currentStepContextInspector";

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
  projectWorkspaceBar?: ReactNode;
  children: ReactNode;
}

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
  project_architect_interview_required: "project-interview",
  project_planning_required: "project-mapping",
  repository_reconciliation_required: "reconciliation",
  project_roadmap_required: "project-mapping",
  project_interview_required: "project-interview",
  reconciliation_review_required: "reconciliation",
  project_mapping_required: "project-mapping",
  operator_project_approval_required: "project-mapping",
  phase_mapping_required: "phase-mapping",
  phase_intake_required: "phase-mapping",
  phase_architect_interview_required: "phase-mapping",
  phase_planning_required: "phase-mapping",
  work_card_plan_review_required: "work-card-review",
  operator_phase_approval_required: "phase-mapping",
  full_work_card_creation_required: "work-card-review",
  work_card_authoring_required: "work-card-review",
  operator_work_card_approval_required: "work-card-review",
  operator_work_card_review_required: "work-card-review",
  implementer_handoff_required: "work-card-review",
  implementer_report_required: "implementer-active",
  implementer_execution_required: "implementer-active",
  architect_review_of_implementer_report_required: "architect-review",
  architect_review_of_validation_report_required: "architect-review",
  operator_validation_required: "operator-validation",
  repair_sub_card_creation_required: "repair-subcard",
  architect_disposition_required: "architect-review",
  repair_work_card_required: "repair-subcard",
  repair_implementer_handoff_required: "repair-subcard",
  repair_validation_required: "repair-subcard",
  phase_closeout_required: "phase-closeout",
  operator_phase_closeout_approval_required: "phase-closeout",
  operator_closeout_approval_required: "phase-closeout",
  roadmap_update_required: "next-phase",
  next_phase_activation_required: "next-phase",
  repeat_phase_mapping_and_work_card_loop_required: "next-phase",
  candidate_disposition_required: "work-card-review",
};

const workflowStateToManualScreen: Record<WorkflowState, string> = {
  "project-intake": "project-intake",
  "project-interview": "project-architect-interview",
  reconciliation: "repository-reconciliation",
  "project-mapping": "project-roadmap",
  "phase-mapping": "phase-planning-documents",
  "work-card-review": "work-card-plan-review",
  "implementer-active": "implementer-report-capture",
  "architect-review": "architect-review",
  "operator-validation": "human-validation",
  "repair-subcard": "architect-prompt-composer",
  "phase-closeout": "phase-closeout",
  "next-phase": "phase-map",
};

const actionIdToManualScreen: Record<string, string> = {
  project_intake_required: "project-intake",
  project_architect_interview_required: "project-architect-interview",
  project_planning_required: "project-planning-documents",
  repository_reconciliation_required: "repository-reconciliation",
  project_roadmap_required: "project-roadmap",
  project_interview_required: "project-architect-interview",
  reconciliation_review_required: "repository-reconciliation",
  project_mapping_required: "project-roadmap",
  operator_project_approval_required: "project-planning-documents",
  phase_mapping_required: "phase-map",
  phase_intake_required: "phase-intake",
  phase_architect_interview_required: "phase-architect-interview",
  phase_planning_required: "phase-planning-documents",
  work_card_plan_review_required: "work-card-plan-review",
  operator_phase_approval_required: "phase-planning-documents",
  full_work_card_creation_required: "new-work-card",
  work_card_authoring_required: "new-work-card",
  operator_work_card_approval_required: "work-card-plan-review",
  operator_work_card_review_required: "work-card-plan-review",
  implementer_handoff_required: "implementer-execution-packet",
  implementer_report_required: "implementer-report-capture",
  implementer_execution_required: "implementer-report-capture",
  architect_review_of_implementer_report_required: "architect-review",
  architect_review_of_validation_report_required: "human-validation",
  operator_validation_required: "human-validation",
  repair_sub_card_creation_required: "architect-prompt-composer",
  architect_disposition_required: "architect-bridge",
  repair_work_card_required: "new-work-card",
  repair_implementer_handoff_required: "implementer-execution-packet",
  repair_validation_required: "human-validation",
  phase_closeout_required: "phase-closeout",
  operator_phase_closeout_approval_required: "phase-closeout",
  operator_closeout_approval_required: "phase-closeout",
  roadmap_update_required: "project-planning-documents",
  next_phase_activation_required: "phase-map",
  repeat_phase_mapping_and_work_card_loop_required: "phase-map",
  candidate_disposition_required: "candidate-disposition",
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
  const route = getCurrentActionSurfaceRoute(actionId);

  if (route) {
    return route.manualScreenId;
  }

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
  projectWorkspaceBar,
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
      {projectWorkspaceBar}
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
        action={action}
        loadState={currentActionLoadState}
        onStep={openSupportingScreen}
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
          routeContext={currentActionResult?.routeContext}
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
          onOpenSupportScreen={openSupportingScreen}
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
  action,
  loadState,
  onStep,
}: {
  action: ChampCityCurrentRequiredAction | undefined;
  loadState: LoadState;
  onStep: (screen: string) => void;
}) {
  const guide = resolveWorkflowVisibility(
    loadState === "ready" ? action : undefined,
  );
  const approvalLoop = workflowLoopGuides.find(
    (loop) => loop.id === "approval-revision",
  );
  const workCardLoop = workflowLoopGuides.find(
    (loop) => loop.id === "work-card",
  );
  const phaseLoop = workflowLoopGuides.find((loop) => loop.id === "phase");
  const routedScreenId = loadState === "ready" && action
    ? getManualScreenForCurrentAction(action)
    : undefined;
  const positionMessage =
    loadState === "loading"
      ? "Loading the durable current action. Step history is not inferred while the route is loading."
      : loadState === "error"
        ? "The durable current action is unavailable. Step history is not inferred; supporting references remain non-mutating."
        : guide.positionMessage;

  return (
    <section
      aria-labelledby="workflow-guide-title"
      className="shrink-0 border-b border-border bg-card/55"
    >
      <div className="flex items-center gap-3 border-b border-border/70 px-4 py-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2
              id="workflow-guide-title"
              className="text-xs font-semibold text-foreground"
            >
              Locked workflow · left to right
            </h2>
            <Badge className="border-primary/25 bg-primary/10 text-[9px] uppercase tracking-[0.12em] text-primary">
              Current action is the authority
            </Badge>
          </div>
          <p className="mt-0.5 truncate text-[10px] text-muted-foreground/65">
            {positionMessage}
          </p>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2 text-[9px] text-muted-foreground/70">
          {(
            [
              "completed",
              "current",
              "upcoming",
              "blocked",
              "repair",
              "unknown",
            ] as const
          ).map((state) => (
            <span key={state} className="flex items-center gap-1">
              <span
                className={cn(
                  "h-2 w-2 rounded-full border",
                  workflowStateDotClass(state),
                )}
              />
              {workflowStateLabel(state)}
            </span>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto px-4 pb-2 pt-2">
        <div className="flex min-w-[1748px] items-end">
          {workflowGuideGroups.map((group, groupIndex) => {
            const groupSteps = guide.steps.filter(
              (step) => step.groupId === group.id,
            );
            const isLastGroup = groupIndex === workflowGuideGroups.length - 1;

            return (
              <div key={group.id} className="flex shrink-0 items-end">
                <div>
                  <div
                    className={cn(
                      "mb-1 flex h-5 min-w-0 items-center justify-center gap-1.5 rounded border px-2 text-[9px] font-semibold uppercase tracking-[0.14em]",
                      workflowGroupClass(group.id),
                    )}
                  >
                    <span>{group.label}</span>
                    <span className="truncate normal-case tracking-normal opacity-55">
                      · {group.description}
                    </span>
                  </div>
                  <div className="flex items-stretch">
                    {groupSteps.map((step, stepIndex) => (
                      <div key={step.id} className="flex items-center">
                        <WorkflowGuideStepButton
                          step={step}
                          isRoutedScreen={step.supportScreenId === routedScreenId}
                          onStep={onStep}
                        />
                        {stepIndex < groupSteps.length - 1 ? (
                          <WorkflowGuideConnector state={step.state} />
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
                {!isLastGroup ? (
                  <WorkflowGuideConnector
                    state={groupSteps[groupSteps.length - 1]?.state ?? "unknown"}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
        <div className="mt-1 flex min-w-[1748px] items-center gap-1.5 text-[9px] text-primary/65">
          <Info size={10} className="shrink-0" />
          Step clicks are view-only. They open a reference screen or the
          already-routed primary screen; they never save, complete, approve,
          validate, repair, or advance durable workflow state.
        </div>
      </div>
      <div className="overflow-x-auto border-t border-border/70 px-4 py-2">
        <div className="grid min-w-[1500px] grid-cols-[0.8fr_1.7fr_1.1fr] gap-2">
          {approvalLoop ? <WorkflowLoopCard loop={approvalLoop} /> : null}
          {workCardLoop ? (
            <WorkCardLoopCard
              label={workCardLoop.label}
              description={workCardLoop.description}
              repeatLabel={workCardLoop.repeatLabel}
              stages={guide.workCardLoopStages}
            />
          ) : null}
          {phaseLoop ? <WorkflowLoopCard loop={phaseLoop} /> : null}
        </div>
      </div>
    </section>
  );
}

function WorkflowGuideStepButton({
  step,
  isRoutedScreen,
  onStep,
}: {
  step: WorkflowGuideStepPosition;
  isRoutedScreen: boolean;
  onStep: (screen: string) => void;
}) {
  const isActive = ["current", "blocked", "repair"].includes(step.state);
  const stateLabel = workflowStateLabel(step.state);

  return (
    <button
      type="button"
      aria-current={isActive ? "step" : undefined}
      aria-label={`${step.label}: ${stateLabel}. ${
        isRoutedScreen
          ? "Open the routed current-action screen"
          : "Open a supporting reference screen"
      } without changing durable workflow state.`}
      onClick={() => onStep(step.supportScreenId)}
      title={
        isRoutedScreen
          ? `Open the routed ${step.label} screen. The current action will not change.`
          : `Open ${step.label} as support/reference only. The current action will not change.`
      }
      className={cn(
        "group flex h-[72px] w-[116px] shrink-0 flex-col rounded-md border px-2 py-1.5 text-left transition-colors",
        workflowStepClass(step.state),
      )}
    >
      <span className="flex w-full items-center gap-1 text-[8px] font-semibold uppercase tracking-[0.1em]">
        <span className="opacity-55">
          {String(step.index + 1).padStart(2, "0")}
        </span>
        <span className="ml-auto flex items-center gap-1">
          {workflowStateIcon(step.state)}
          {stateLabel}
        </span>
      </span>
      <span className="mt-1 line-clamp-3 text-[10px] font-semibold leading-[1.15]">
        {step.label}
      </span>
      <span className="mt-auto text-[8px] text-current opacity-45 group-hover:opacity-75">
        {isRoutedScreen ? "Open routed action" : "Open reference only"}
      </span>
    </button>
  );
}

function WorkflowGuideConnector({ state }: { state: WorkflowGuideStepState }) {
  return (
    <div className="flex w-5 shrink-0 items-center justify-center">
      <ArrowRight
        size={12}
        className={cn(
          state === "completed" ? "text-emerald-400/55" : "text-white/15",
          state === "current" && "text-primary/55",
          state === "blocked" && "text-red-400/55",
          state === "repair" && "text-amber-400/55",
        )}
      />
    </div>
  );
}

function WorkflowLoopCard({
  loop,
}: {
  loop: (typeof workflowLoopGuides)[number];
}) {
  return (
    <div className="rounded-md border border-border bg-black/10 px-2.5 py-2">
      <div className="flex items-center gap-1.5">
        <RotateCcw size={11} className="shrink-0 text-violet-400/70" />
        <span className="text-[10px] font-semibold text-foreground">
          {loop.label}
        </span>
        <span className="ml-auto text-[8px] text-violet-300/60">
          {loop.repeatLabel}
        </span>
      </div>
      <p className="mt-1 truncate text-[8px] text-muted-foreground/55">
        {loop.description}
      </p>
      <div className="mt-1.5 flex items-center gap-1 overflow-hidden">
        {loop.stages.map((stage, index) => (
          <div key={stage} className="flex min-w-0 items-center gap-1">
            <span className="truncate rounded border border-violet-400/15 bg-violet-400/[0.06] px-1.5 py-1 text-[8px] text-violet-200/70">
              {stage}
            </span>
            {index < loop.stages.length - 1 ? (
              <ArrowRight size={8} className="shrink-0 text-violet-400/30" />
            ) : (
              <RotateCcw size={8} className="shrink-0 text-violet-400/45" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkCardLoopCard({
  label,
  description,
  repeatLabel,
  stages,
}: {
  label: string;
  description: string;
  repeatLabel: string;
  stages: ReadonlyArray<{
    id: string;
    label: string;
    state: WorkflowGuideStepState;
  }>;
}) {
  return (
    <div className="rounded-md border border-primary/20 bg-primary/[0.035] px-2.5 py-2">
      <div className="flex items-center gap-1.5">
        <RotateCcw size={11} className="shrink-0 text-primary/75" />
        <span className="text-[10px] font-semibold text-foreground">{label}</span>
        <span className="ml-auto text-[8px] text-primary/60">{repeatLabel}</span>
      </div>
      <p className="mt-1 truncate text-[8px] text-muted-foreground/55">
        {description}
      </p>
      <div className="mt-1.5 flex items-center gap-1 overflow-hidden">
        {stages.map((stage, index) => (
          <div key={stage.id} className="flex min-w-0 items-center gap-1">
            <span
              className={cn(
                "truncate rounded border px-1.5 py-1 text-[8px]",
                workflowLoopStageClass(stage.state),
              )}
            >
              {stage.label}
            </span>
            {index < stages.length - 1 ? (
              <ArrowRight size={8} className="shrink-0 text-primary/25" />
            ) : (
              <RotateCcw size={8} className="shrink-0 text-primary/45" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function workflowStateLabel(state: WorkflowGuideStepState): string {
  return {
    completed: "Completed",
    current: "Current",
    upcoming: "Upcoming",
    blocked: "Blocked",
    repair: "Repair",
    unknown: "Not confirmed",
  }[state];
}

function workflowStateIcon(state: WorkflowGuideStepState) {
  if (state === "completed") {
    return <Check size={8} />;
  }

  if (state === "blocked") {
    return <AlertTriangle size={8} />;
  }

  if (state === "repair") {
    return <Wrench size={8} />;
  }

  if (state === "unknown") {
    return <Info size={8} />;
  }

  return (
    <Circle
      size={7}
      className={state === "current" ? "fill-current" : ""}
    />
  );
}

function workflowStateDotClass(state: WorkflowGuideStepState): string {
  return {
    completed: "border-emerald-400/70 bg-emerald-400/35",
    current: "border-primary bg-primary/45",
    upcoming: "border-white/20 bg-white/[0.04]",
    blocked: "border-red-400 bg-red-400/40",
    repair: "border-amber-400 bg-amber-400/40",
    unknown: "border-slate-400/35 bg-slate-400/10",
  }[state];
}

function workflowStepClass(state: WorkflowGuideStepState): string {
  return {
    completed:
      "border-emerald-400/30 bg-emerald-400/[0.07] text-emerald-200/75 hover:border-emerald-400/50",
    current:
      "border-primary bg-primary/[0.13] text-primary shadow-[0_0_0_2px_rgba(0,204,230,0.16),0_0_18px_rgba(0,204,230,0.08)] hover:bg-primary/[0.17]",
    upcoming:
      "border-border bg-white/[0.015] text-muted-foreground/55 hover:border-muted-foreground/40 hover:text-muted-foreground/80",
    blocked:
      "border-red-400/75 bg-red-400/[0.13] text-red-300 shadow-[0_0_0_2px_rgba(248,113,113,0.12)] hover:bg-red-400/[0.17]",
    repair:
      "border-amber-400/75 bg-amber-400/[0.13] text-amber-300 shadow-[0_0_0_2px_rgba(251,191,36,0.12)] hover:bg-amber-400/[0.17]",
    unknown:
      "border-dashed border-slate-500/35 bg-slate-400/[0.025] text-slate-400/55 hover:border-slate-400/50",
  }[state];
}

function workflowLoopStageClass(state: WorkflowGuideStepState): string {
  return {
    completed:
      "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-300/75",
    current: "border-primary/60 bg-primary/[0.15] font-semibold text-primary",
    upcoming: "border-border bg-white/[0.02] text-muted-foreground/50",
    blocked: "border-red-400/60 bg-red-400/[0.12] font-semibold text-red-300",
    repair:
      "border-amber-400/60 bg-amber-400/[0.12] font-semibold text-amber-300",
    unknown: "border-dashed border-slate-500/30 text-slate-400/45",
  }[state];
}

function workflowGroupClass(groupId: string): string {
  return (
    {
      capture: "border-blue-400/15 bg-blue-400/[0.05] text-blue-300/70",
      frame: "border-indigo-400/15 bg-indigo-400/[0.05] text-indigo-300/70",
      plan: "border-violet-400/15 bg-violet-400/[0.05] text-violet-300/70",
      build: "border-primary/20 bg-primary/[0.06] text-primary/75",
      prove:
        "border-emerald-400/15 bg-emerald-400/[0.05] text-emerald-300/70",
    }[groupId] ?? "border-border bg-white/[0.02] text-muted-foreground"
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
    <div className="flex w-[340px] shrink-0 flex-col gap-0 overflow-y-auto border-r border-border bg-card/35">
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
      <div className="flex flex-1 flex-col gap-4 px-5 py-4">
        <InfoBlock
          label="Why this is next"
          body={action.reason}
        />

        <div>
          <PanelLabel>Expected output</PanelLabel>
          <div className="rounded-md border border-primary/20 bg-primary/[0.04] px-3 py-2.5">
            <div className="text-xs font-semibold text-primary/85">
              {expectedOutput
                ? getArtifactDisplayName(
                    expectedOutput.path,
                    expectedOutput.artifactType,
                  )
                : "No expected output reported"}
            </div>
            {expectedOutput ? (
              <div className="mt-1 text-[10px] uppercase tracking-[0.1em] text-muted-foreground/55">
                {expectedOutput.artifactType}
              </div>
            ) : null}
          </div>
        </div>

        <div>
          <PanelLabel>Artifact summary</PanelLabel>
          <div className="grid grid-cols-3 gap-2" aria-label="Current action artifact counts">
            <ActionCount label="Source" value={action.sourceArtifacts.length} />
            <ActionCount label="Missing" value={action.missingArtifacts.length} tone="warning" />
            <ActionCount label="Notices" value={warnings.length} tone={urgent ? "warning" : "neutral"} />
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground/55">
            Review artifact details in the center workspace.
          </p>
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
    <div className="flex w-[340px] shrink-0 flex-col border-r border-border bg-card/35 p-5">
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

function ActionCount({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "warning";
}) {
  return (
    <div
      className={cn(
        "rounded-md border px-2 py-2 text-center",
        tone === "warning" && value > 0
          ? "border-amber-400/20 bg-amber-400/[0.04]"
          : "border-border bg-white/[0.025]",
      )}
    >
      <div
        className={cn(
          "text-sm font-semibold",
          tone === "warning" && value > 0
            ? "text-amber-300/80"
            : "text-foreground/75",
        )}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[8px] uppercase tracking-[0.1em] text-muted-foreground/45">
        {label}
      </div>
    </div>
  );
}

function ArtifactWorkspace({
  action,
  routeContext,
  activeManualItem,
  routedScreenId,
  isViewingRoutedScreen,
  isViewingSupportingScreen,
  loadState,
  onReturnToCurrentAction,
  onOpenSupportScreen,
  children,
}: {
  action: ChampCityCurrentRequiredAction | undefined;
  routeContext: ChampCityCurrentRequiredActionResult["routeContext"];
  activeManualItem: ManualNavigationItem | undefined;
  routedScreenId: string;
  isViewingRoutedScreen: boolean;
  isViewingSupportingScreen: boolean;
  loadState: LoadState;
  onReturnToCurrentAction?: () => void;
  onOpenSupportScreen: (screen: string) => void;
  children: ReactNode;
}) {
  const workspaceTitle = activeManualItem?.screenTitle ?? "Supporting workspace";
  const reviewModel = useMemo(
    () => (action ? buildArtifactReviewWorkspace(action) : undefined),
    [action],
  );
  const contextModel = useMemo(
    () =>
      action
        ? buildCurrentStepContextInspector(action, routeContext, {
            currentActionIpcState:
              loadState === "ready"
                ? "available"
                : loadState === "loading"
                  ? "loading"
                  : "unavailable",
            planningArtifactPreviewState:
              typeof window.champCity.previewPlanningArtifact === "function"
                ? "available"
                : "unavailable",
          })
        : undefined,
    [action, loadState, routeContext],
  );
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<
    "artifacts" | "action" | "context"
  >("action");
  const [previewTarget, setPreviewTarget] = useState<{
    path: string;
    displayName: string;
  } | null>(null);
  const [previewResult, setPreviewResult] =
    useState<ChampCityPlanningArtifactPreviewResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    setActiveWorkspaceTab("action");
    setPreviewTarget(null);
    setPreviewResult(null);
    setPreviewLoading(false);
  }, [action?.id, action?.phaseId, action?.workCardId]);

  const showArtifactWorkspace = Boolean(
    reviewModel &&
      shouldShowCurrentActionArtifactWorkspace({
        hasContext: reviewModel.hasContext,
        isViewingRoutedScreen,
        isViewingSupportingScreen,
      }),
  );
  const showContextInspector = Boolean(
    contextModel &&
      shouldShowCurrentStepContextInspector({
        hasAction: Boolean(action),
        isViewingRoutedScreen,
        isViewingSupportingScreen,
      }),
  );
  const showCurrentActionTabs = showArtifactWorkspace || showContextInspector;
  const sourceCount =
    reviewModel?.sourceGroups.reduce(
      (total, group) => total + group.artifacts.length,
      0,
    ) ?? 0;

  async function previewArtifact(path: string, displayName: string) {
    setPreviewTarget({ path, displayName });
    setPreviewResult(null);
    setPreviewLoading(true);

    try {
      const result = await window.champCity.previewPlanningArtifact({ path });

      setPreviewResult(result);
    } catch {
      setPreviewResult({
        ok: false,
        errorMessages: ["The constrained planning preview did not respond."],
      });
    } finally {
      setPreviewLoading(false);
    }
  }

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
            {workspaceTitle}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <WriteBadge state={loadState} />
          {action?.status ? <StatusBadge status={action.status} /> : null}
        </div>
      </div>

      {showCurrentActionTabs ? (
        <div
          className="flex shrink-0 items-center gap-2 border-b border-border bg-card/25 px-5 py-2"
          role="tablist"
          aria-label="Current action workspace"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeWorkspaceTab === "action"}
            onClick={() => setActiveWorkspaceTab("action")}
            className={workspaceTabClass(activeWorkspaceTab === "action")}
          >
            <CheckSquare size={12} />
            Complete current action
          </button>
          {showArtifactWorkspace && reviewModel ? (
            <button
              type="button"
              role="tab"
              aria-selected={activeWorkspaceTab === "artifacts"}
              onClick={() => setActiveWorkspaceTab("artifacts")}
              className={workspaceTabClass(activeWorkspaceTab === "artifacts")}
            >
              <FolderOpen size={12} />
              Artifacts
              <span className="text-[9px] opacity-65">
                {sourceCount + reviewModel.missingArtifacts.length + (reviewModel.expectedOutput ? 1 : 0)}
              </span>
            </button>
          ) : null}
          {showContextInspector ? (
            <button
              type="button"
              role="tab"
              aria-selected={activeWorkspaceTab === "context"}
              onClick={() => setActiveWorkspaceTab("context")}
              className={workspaceTabClass(activeWorkspaceTab === "context")}
            >
              <Eye size={12} />
              Why this step?
            </button>
          ) : null}
          <span className="ml-auto hidden text-[10px] text-muted-foreground/50 lg:block">
            Complete the action, review its artifacts, or inspect the route context.
          </span>
        </div>
      ) : null}

      {showArtifactWorkspace && reviewModel ? (
        <div
          className={cn(
            "min-h-0 flex-1",
            activeWorkspaceTab !== "artifacts" && "hidden",
          )}
          role="tabpanel"
          aria-label="Artifacts"
        >
          <CurrentActionArtifactReview
            model={reviewModel}
            previewTarget={previewTarget}
            previewResult={previewResult}
            previewLoading={previewLoading}
            onPreview={(path, displayName) => {
              void previewArtifact(path, displayName);
            }}
            onOpenSupportScreen={onOpenSupportScreen}
            onClosePreview={() => {
              setPreviewTarget(null);
              setPreviewResult(null);
            }}
          />
        </div>
      ) : null}

      {showContextInspector && contextModel ? (
        <div
          className={cn(
            "min-h-0 flex-1",
            activeWorkspaceTab !== "context" && "hidden",
          )}
          role="tabpanel"
          aria-label="Why this step? Route context"
        >
          <div className="h-full overflow-y-auto">
            <CurrentStepContextInspector model={contextModel} />
            <CurrentContextPacketControls />
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          "min-h-0 flex-1 overflow-hidden bg-background/75",
          ((showArtifactWorkspace && activeWorkspaceTab === "artifacts") ||
            (showContextInspector && activeWorkspaceTab === "context")) &&
            "hidden",
        )}
        role={showCurrentActionTabs ? "tabpanel" : undefined}
        aria-label={showCurrentActionTabs ? "Complete current action" : undefined}
      >
        {children}
      </div>
    </div>
  );
}

function CurrentContextPacketControls() {
  const [packetKind, setPacketKind] = useState<"architect" | "implementer">(
    "architect",
  );
  const [scenario, setScenario] = useState<
    "work_card_creation" | "implementer_report_review" | "validation_disposition_and_repair" | "phase_closeout"
  >("implementer_report_review");
  const [budgetTokens, setBudgetTokens] = useState(12_000);
  const [result, setResult] =
    useState<ChampCityCurrentContextPacketPreviewResult | null>(null);
  const [operatorAcknowledged, setOperatorAcknowledged] = useState(false);
  const [status, setStatus] = useState(
    "Generate a bounded packet from canonical workflow authority.",
  );
  const [busy, setBusy] = useState(false);

  async function generatePacket() {
    setBusy(true);
    setOperatorAcknowledged(false);
    const next = await window.champCity.previewCurrentContextPacket({
      packetKind,
      architectScenario: scenario,
      budgetTokens,
    });
    setBusy(false);
    setResult(next);
    setStatus(
      next.ok
        ? next.packet?.manifest.overBudget
          ? "Packet exceeds its budget. Operator acknowledgment is required before copy or export."
          : "Packet is within budget and ready for manual copy/paste."
        : next.errorMessages?.join(" ") ?? "Packet generation failed.",
    );
  }

  async function copyPacket() {
    const packet = result?.packet;
    if (!packet) return;
    if (packet.manifest.overBudget && !operatorAcknowledged) {
      setStatus("Explicit Operator acknowledgment is required before over-budget copy.");
      return;
    }
    await navigator.clipboard.writeText(packet.markdown);
    setStatus("Packet copied for manual paste. Its included/excluded manifest remains visible below.");
  }

  async function exportPacket() {
    if (!packet) return;
    setBusy(true);
    const exported = await window.champCity.exportCurrentContextPacket({
      packetKind,
      architectScenario: scenario,
      budgetTokens,
      operatorAcknowledgedOverBudget: operatorAcknowledged,
    });
    setBusy(false);
    setStatus(
      exported.ok
        ? `Packet and adjacent manifest saved as synchronized pairs: ${exported.packetMarkdownPath} · ${exported.manifestMarkdownPath}`
        : exported.errorMessages?.join(" ") ?? "Packet export failed.",
    );
  }

  const packet = result?.packet;
  return (
    <section className="mx-5 mb-5 rounded-lg border border-border bg-card/35 p-4">
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/70">
        Context packet and token budget
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground/75">
        Bounded manual copy/paste packets use the current routed target. Resolved and unrelated history is excluded by default.
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <label className="grid gap-1 text-[11px] text-muted-foreground">
          Packet role
          <select
            className="rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
            value={packetKind}
            onChange={(event) => {
              const next = event.target.value as "architect" | "implementer";
              setPacketKind(next);
              setBudgetTokens(next === "architect" ? 12_000 : 16_000);
            }}
          >
            <option value="architect">Architect</option>
            <option value="implementer">Implementer</option>
          </select>
        </label>
        <label className="grid gap-1 text-[11px] text-muted-foreground">
          Architect scenario
          <select
            className="rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground disabled:opacity-50"
            value={scenario}
            disabled={packetKind !== "architect"}
            onChange={(event) => setScenario(event.target.value as typeof scenario)}
          >
            <option value="work_card_creation">Work Card creation</option>
            <option value="implementer_report_review">Implementer Report review</option>
            <option value="validation_disposition_and_repair">Validation disposition / repair</option>
            <option value="phase_closeout">Phase closeout</option>
          </select>
        </label>
        <label className="grid gap-1 text-[11px] text-muted-foreground">
          Token budget
          <input
            className="rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
            type="number"
            min={1}
            value={budgetTokens}
            onChange={(event) =>
              setBudgetTokens(Math.max(1, Number(event.target.value) || 1))
            }
          />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="rounded-md bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground disabled:opacity-50"
          disabled={busy}
          onClick={() => void generatePacket()}
        >
          {busy ? "Compiling…" : "Generate packet"}
        </button>
        <button
          type="button"
          className="rounded-md border border-border px-3 py-1.5 text-[11px] font-semibold text-foreground disabled:opacity-50"
          disabled={
            !packet ||
            (packet.manifest.overBudget && !operatorAcknowledged)
          }
          onClick={() => void copyPacket()}
        >
          Copy packet
        </button>
        <button
          type="button"
          className="rounded-md border border-border px-3 py-1.5 text-[11px] font-semibold text-foreground disabled:opacity-50"
          disabled={
            busy ||
            !packet ||
            (packet.manifest.overBudget && !operatorAcknowledged)
          }
          onClick={() => void exportPacket()}
        >
          Export packet + manifest
        </button>
        <span className="text-[11px] text-muted-foreground/75">{status}</span>
      </div>
      {packet ? (
        <div className="mt-3 grid gap-3">
          <div className="rounded-md border border-border bg-background/60 p-3 text-[11px] text-muted-foreground">
            <div>
              Estimated tokens: <strong className="text-foreground">{packet.manifest.estimatedTokens}</strong>
              {" · "}Budget: <strong className="text-foreground">{packet.manifest.budgetTokens}</strong>
              {" · "}Included: {packet.manifest.included.length}
              {" · "}Excluded: {packet.manifest.excluded.length}
            </div>
            <div className="mt-1">
              Largest contributors: {packet.manifest.largestContributors.map((item) => `${item.title} (${item.estimatedTokens})`).join(", ") || "none"}
            </div>
          </div>
          {packet.manifest.overBudget ? (
            <label className="flex items-start gap-2 rounded-md border border-amber-400/30 bg-amber-400/[0.06] p-3 text-[11px] text-amber-100/80">
              <input
                type="checkbox"
                checked={operatorAcknowledged}
                onChange={(event) => setOperatorAcknowledged(event.target.checked)}
              />
              I acknowledge this packet exceeds the configured budget and authorize manual copy/export.
            </label>
          ) : null}
          <details className="rounded-md border border-border bg-background/45 p-3">
            <summary className="cursor-pointer text-[11px] font-semibold text-foreground">
              Preview packet and context manifest
            </summary>
            <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap text-[10px] leading-relaxed text-muted-foreground">
              {packet.markdown}
            </pre>
          </details>
        </div>
      ) : null}
    </section>
  );
}

function workspaceTabClass(active: boolean): string {
  return cn(
    "flex items-center gap-2 rounded-md border px-3 py-1.5 text-[11px] font-semibold transition-colors",
    active
      ? "border-primary/35 bg-primary/12 text-primary"
      : "border-border bg-background/30 text-muted-foreground/70 hover:bg-white/[0.04] hover:text-foreground",
  );
}

function CurrentActionArtifactReview({
  model,
  previewTarget,
  previewResult,
  previewLoading,
  onPreview,
  onOpenSupportScreen,
  onClosePreview,
}: {
  model: ChampCityArtifactReviewWorkspaceModel;
  previewTarget: { path: string; displayName: string } | null;
  previewResult: ChampCityPlanningArtifactPreviewResult | null;
  previewLoading: boolean;
  onPreview: (path: string, displayName: string) => void;
  onOpenSupportScreen: (screen: string) => void;
  onClosePreview: () => void;
}) {
  const sourceCount = model.sourceGroups.reduce(
    (total, group) => total + group.artifacts.length,
    0,
  );

  return (
    <section
      className="flex h-full min-h-0 flex-col bg-card/15"
      aria-label="Current action artifact workspace"
    >
      <header className="flex shrink-0 items-center gap-3 border-b border-border px-5 py-3">
        <FolderOpen size={15} className="shrink-0 text-primary/75" />
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary/75">
            Artifact review
          </div>
          <div className="mt-0.5 truncate text-xs text-foreground/70">
            {model.workCardLabel} - {model.workflowStep}
          </div>
        </div>
        <div className="hidden shrink-0 items-center gap-2 text-[10px] text-muted-foreground/55 xl:flex">
          <span>{sourceCount} source</span>
          <span>-</span>
          <span>{model.missingArtifacts.length} missing</span>
          <span>-</span>
          <span>{model.expectedOutput ? "1 expected output" : "No expected output"}</span>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <aside
          className="w-[38%] min-w-[320px] max-w-[440px] overflow-y-auto border-r border-border bg-background/25 px-4 py-4"
          aria-label="Current action artifact list"
        >
          <div className="mb-4">
            <div className="text-[9px] font-bold uppercase tracking-[0.13em] text-muted-foreground/50">
              One artifact list
            </div>
            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground/60">
              Every item states whether it can be previewed, opened as support, or is unavailable.
            </p>
          </div>

          {model.expectedOutput ? (
            <ArtifactExpectedOutputGroup
              output={model.expectedOutput}
              selectedPath={previewTarget?.path}
              onPreview={onPreview}
              onOpenSupportScreen={onOpenSupportScreen}
            />
          ) : null}

          {model.sourceGroups.map((group) => (
            <ArtifactRoleGroup
              key={group.id}
              group={group}
              selectedPath={previewTarget?.path}
              onPreview={onPreview}
              onOpenSupportScreen={onOpenSupportScreen}
            />
          ))}

          <ArtifactMissingGroup artifacts={model.missingArtifacts} />
        </aside>
        <ArtifactPreviewPane
          target={previewTarget}
          result={previewResult}
          loading={previewLoading}
          onClose={onClosePreview}
        />
      </div>
    </section>
  );
}

function ArtifactExpectedOutputGroup({
  output,
  selectedPath,
  onPreview,
  onOpenSupportScreen,
}: {
  output: ChampCityArtifactReviewExpectedOutput;
  selectedPath?: string;
  onPreview: (path: string, displayName: string) => void;
  onOpenSupportScreen: (screen: string) => void;
}) {
  return (
    <div className="mb-4">
      <ArtifactGroupHeading
        label="Expected Output"
        count={1}
        tone="expected"
      />
      <ArtifactRowShell
        selected={Boolean(output.path && selectedPath === output.path)}
        tone="expected"
        icon={<Save size={12} />}
        displayName={output.displayName}
        metadata={`${output.artifactType} - ${output.stateLabel}`}
        description={output.description}
        path={output.path}
        interactionState={output.interactionState}
        supportScreenId={output.supportScreenId}
        onPreview={onPreview}
        onOpenSupportScreen={onOpenSupportScreen}
      />
    </div>
  );
}

function ArtifactRoleGroup({
  group,
  selectedPath,
  onPreview,
  onOpenSupportScreen,
}: {
  group: ChampCityArtifactReviewGroup;
  selectedPath?: string;
  onPreview: (path: string, displayName: string) => void;
  onOpenSupportScreen: (screen: string) => void;
}) {
  return (
    <div className="mb-4">
      <ArtifactGroupHeading label={group.label} count={group.artifacts.length} />
      <div className="flex flex-col gap-2">
        {group.artifacts.map((artifact) => (
          <ArtifactReviewRow
            key={artifact.key}
            artifact={artifact}
            selected={selectedPath === artifact.path}
            onPreview={onPreview}
            onOpenSupportScreen={onOpenSupportScreen}
          />
        ))}
      </div>
    </div>
  );
}

function ArtifactReviewRow({
  artifact,
  selected,
  onPreview,
  onOpenSupportScreen,
}: {
  artifact: ChampCityArtifactReviewEntry;
  selected: boolean;
  onPreview: (path: string, displayName: string) => void;
  onOpenSupportScreen: (screen: string) => void;
}) {
  return (
    <ArtifactRowShell
      selected={selected}
      icon={<FileText size={12} />}
      displayName={artifact.displayName}
      metadata={[artifact.role, artifact.format, artifact.status]
        .filter(Boolean)
        .join(" - ")}
      path={artifact.path}
      interactionState={artifact.interactionState}
      supportScreenId={artifact.supportScreenId}
      onPreview={onPreview}
      onOpenSupportScreen={onOpenSupportScreen}
    />
  );
}

function ArtifactMissingGroup({
  artifacts,
}: {
  artifacts: ChampCityArtifactReviewMissingEntry[];
}) {
  return (
    artifacts.length > 0 ? (
      <div className="mb-4">
        <ArtifactGroupHeading
          label="Missing Evidence"
          count={artifacts.length}
          tone="missing"
        />
        <div className="flex flex-col gap-2">
          {artifacts.map((artifact) => (
            <ArtifactRowShell
              key={artifact.key}
              selected={false}
              tone="missing"
              icon={<AlertTriangle size={12} />}
              displayName={artifact.displayName}
              metadata={artifact.role}
              description={artifact.reason}
              path={artifact.path}
              interactionState="missing"
            />
          ))}
        </div>
      </div>
    ) : null
  );
}

function ArtifactGroupHeading({
  label,
  count,
  tone = "source",
}: {
  label: string;
  count: number;
  tone?: "source" | "expected" | "missing";
}) {
  return (
    <div
      className={cn(
        "mb-2 flex items-center justify-between border-b pb-1.5 text-[10px] font-bold uppercase tracking-[0.12em]",
        tone === "expected"
          ? "border-primary/20 text-primary/80"
          : tone === "missing"
            ? "border-amber-400/20 text-amber-300/80"
            : "border-border text-foreground/60",
      )}
    >
      <span>{label}</span>
      <span className="text-[9px] opacity-55">{count}</span>
    </div>
  );
}

function ArtifactRowShell({
  selected,
  tone = "source",
  icon,
  displayName,
  metadata,
  description,
  path,
  interactionState,
  supportScreenId,
  onPreview,
  onOpenSupportScreen,
}: {
  selected: boolean;
  tone?: "source" | "expected" | "missing";
  icon: ReactNode;
  displayName: string;
  metadata: string;
  description?: string;
  path?: string;
  interactionState:
    | "preview"
    | "open_support_screen"
    | "not_previewable"
    | "missing";
  supportScreenId?: string;
  onPreview?: (path: string, displayName: string) => void;
  onOpenSupportScreen?: (screen: string) => void;
}) {
  return (
    <div
      className={cn(
        "rounded-md border px-3 py-2.5",
        selected
          ? "border-primary/45 bg-primary/[0.09]"
          : tone === "expected"
            ? "border-primary/25 bg-primary/[0.045]"
            : tone === "missing"
              ? "border-amber-400/20 bg-amber-400/[0.035]"
              : "border-border bg-background/35",
      )}
    >
      <div className="flex items-start gap-2">
        <span
          className={cn(
            "mt-0.5 shrink-0",
            tone === "expected"
              ? "text-primary/75"
              : tone === "missing"
                ? "text-amber-300/70"
                : "text-muted-foreground/45",
          )}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="break-words text-[11px] font-semibold leading-snug text-foreground/80">
            {displayName}
          </div>
          <div className="mt-1 text-[9px] leading-relaxed text-muted-foreground/55">
            {metadata}
          </div>
          {description ? (
            <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground/65">
              {description}
            </p>
          ) : null}
        </div>
        <ArtifactInteractionControl
          state={interactionState}
          path={path}
          displayName={displayName}
          supportScreenId={supportScreenId}
          onPreview={onPreview}
          onOpenSupportScreen={onOpenSupportScreen}
        />
      </div>
      {path ? (
        <details className="mt-1.5 pl-5 text-[9px] text-muted-foreground/45">
          <summary className="cursor-pointer">Path details</summary>
          <div className="break-anywhere mt-1 font-mono leading-relaxed">
            {path}
          </div>
        </details>
      ) : null}
    </div>
  );
}

function ArtifactInteractionControl({
  state,
  path,
  displayName,
  supportScreenId,
  onPreview,
  onOpenSupportScreen,
}: {
  state:
    | "preview"
    | "open_support_screen"
    | "not_previewable"
    | "missing";
  path?: string;
  displayName: string;
  supportScreenId?: string;
  onPreview?: (path: string, displayName: string) => void;
  onOpenSupportScreen?: (screen: string) => void;
}) {
  if (state === "preview" && path && onPreview) {
    return (
      <button
        type="button"
        onClick={() => onPreview(path, displayName)}
        className="flex shrink-0 items-center gap-1 rounded border border-primary/25 bg-primary/[0.07] px-2 py-1 text-[9px] font-semibold text-primary transition-colors hover:bg-primary/15"
      >
        <Eye size={10} />
        Preview
      </button>
    );
  }

  if (
    state === "open_support_screen" &&
    supportScreenId &&
    onOpenSupportScreen
  ) {
    return (
      <button
        type="button"
        onClick={() => onOpenSupportScreen(supportScreenId)}
        className="flex shrink-0 items-center gap-1 rounded border border-violet-400/25 bg-violet-400/[0.06] px-2 py-1 text-[9px] font-semibold text-violet-300/85 transition-colors hover:bg-violet-400/12"
      >
        Open support screen
        <ArrowRight size={9} />
      </button>
    );
  }

  return (
    <span
      className={cn(
        "shrink-0 rounded border px-2 py-1 text-[9px] font-semibold",
        state === "missing"
          ? "border-amber-400/25 bg-amber-400/[0.06] text-amber-300/80"
          : "border-border bg-white/[0.02] text-muted-foreground/55",
      )}
    >
      {state === "missing" ? "Missing" : "Not previewable"}
    </span>
  );
}

function ArtifactPreviewPane({
  target,
  result,
  loading,
  onClose,
}: {
  target: { path: string; displayName: string } | null;
  result: ChampCityPlanningArtifactPreviewResult | null;
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <aside className="flex min-w-0 flex-1 flex-col bg-background/45" aria-label="Artifact preview">
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3">
        <Eye size={12} className="text-primary/70" />
        <div className="min-w-0 flex-1">
          <div className="text-[9px] font-bold uppercase tracking-[0.13em] text-muted-foreground/50">
            Read-only Markdown preview
          </div>
          <div className="mt-0.5 truncate text-[11px] font-medium text-foreground/70">
            {target?.displayName ?? "Select an available Markdown artifact"}
          </div>
        </div>
        {target ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground/45 transition-colors hover:bg-white/[0.05] hover:text-foreground/75"
            aria-label="Close artifact preview"
          >
            <X size={13} />
          </button>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {!target ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <FileText size={28} className="text-muted-foreground/20" />
            <div className="mt-3 text-sm font-semibold text-foreground/70">
              No artifact selected
            </div>
            <p className="mt-2 max-w-lg text-xs leading-relaxed text-muted-foreground/55">
              Preview a Work Card, Implementer Report, Architect Review, Validation Report, or other available planning Markdown file without leaving the current workflow context.
            </p>
          </div>
        ) : loading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground/65">
            <RefreshCw size={12} className="animate-spin" />
            Loading constrained planning preview...
          </div>
        ) : result?.ok && result.content !== undefined ? (
          <>
            <div className="mb-3 rounded-md border border-emerald-400/15 bg-emerald-400/[0.04] px-3 py-2 text-[10px] leading-relaxed text-emerald-200/70">
              Read only. Previewing this artifact does not save, approve, validate, repair, or advance workflow state.
            </div>
            <pre className="mx-auto max-w-5xl break-words whitespace-pre-wrap font-sans text-[13px] leading-6 text-foreground/78">
              {result.content}
            </pre>
            {result.truncated ? (
              <Notice type="info">Preview truncated for display safety.</Notice>
            ) : null}
            <details className="mt-3 text-[9px] text-muted-foreground/45">
              <summary className="cursor-pointer">Path details</summary>
              <div className="break-anywhere mt-1 font-mono leading-relaxed">
                {result.path ?? target.path}
              </div>
            </details>
          </>
        ) : (
          <Notice type="error">
            Preview failed. {result?.errorMessages?.join(" ") ??
              "The artifact could not be loaded."}
          </Notice>
        )}
      </div>
    </aside>
  );
}

function CurrentStepContextInspector({
  model,
}: {
  model: CurrentStepContextInspectorModel;
}) {
  const [operatorConcern, setOperatorConcern] = useState("");
  const [operatorExpectedRoute, setOperatorExpectedRoute] = useState("");
  const [routeReviewSaving, setRouteReviewSaving] = useState(false);
  const [routeReviewResult, setRouteReviewResult] =
    useState<ChampCityRouteReviewRequestSaveResult | null>(null);
  const warningGroups = (
    ["blocking", "warning", "info"] as const
  ).map((severity) => ({
    severity,
    items: model.evidenceHealth.filter(
      (warning) => warning.severity === severity,
    ),
  }));

  const saveRouteReview = async () => {
    if (!operatorConcern.trim() || !model.route.phaseId) {
      return;
    }

    setRouteReviewSaving(true);
    setRouteReviewResult(null);

    try {
      const result = await window.champCity.saveRouteReviewRequest({
        phase: model.route.phaseId,
        currentActionId: model.route.actionId,
        currentActionTitle: model.route.title,
        currentActionReason: model.route.reason,
        workCardId: model.route.workCardId,
        workCardTitle: model.route.workCardTitle,
        expectedOutput: model.route.expectedOutput,
        operatorConcern: operatorConcern.trim(),
        operatorExpectedRoute: operatorExpectedRoute.trim() || undefined,
        evidenceSnapshot: {
          acceptedOrControlling: model.explanation.acceptedEvidence,
          presentPendingDisposition: model.explanation.pendingEvidence,
          missingRequired: model.explanation.missingEvidence,
          nonControlling: model.explanation.nonControllingEvidence,
          ambiguityWarnings: model.explanation.ambiguityWarnings,
        },
      });
      setRouteReviewResult(result);
    } catch (error) {
      setRouteReviewResult({
        ok: false,
        errorMessages: [
          error instanceof Error
            ? error.message
            : "The Route Review Request could not be saved.",
        ],
      });
    } finally {
      setRouteReviewSaving(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-background/75">
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6 px-5 py-5">
        <header className="flex flex-wrap items-start gap-3 border-b border-border pb-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
            <Eye size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-foreground">
                Why this step?
              </h2>
              <Badge className="border-emerald-400/20 bg-emerald-400/8 text-emerald-300">
                Read-only
              </Badge>
            </div>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground/70">
              A plain-language explanation of why ChampCity A/I stopped here,
              what must happen next, and which durable evidence would change
              the route.
            </p>
          </div>
          <div className="rounded-md border border-border bg-card/35 px-3 py-2 text-[10px] leading-relaxed text-muted-foreground/60">
            {model.artifactGuidance}
          </div>
        </header>

        <section
          aria-labelledby="why-current-action-title"
          className="rounded-xl border border-primary/25 bg-primary/[0.055] p-4"
        >
          <ContextSectionHeading
            id="why-current-action-title"
            title="Why this is the current action"
            description={model.route.title}
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <PlainLanguageList
              title="Accepted or controlling evidence"
              items={model.explanation.acceptedEvidence}
              tone="accepted"
            />
            <PlainLanguageList
              title="Present, pending Architect disposition"
              items={model.explanation.pendingEvidence}
              tone="pending"
            />
            <PlainLanguageList
              title="Missing and required next"
              items={model.explanation.missingEvidence}
              tone="missing"
            />
            <PlainLanguageList
              title="Stale, historical, superseded, or non-controlling"
              items={model.explanation.nonControllingEvidence}
              tone="historical"
            />
            {model.explanation.ambiguityWarnings.length > 0 ? (
              <div className="lg:col-span-2">
                <PlainLanguageList
                  title="Duplicate or ambiguous evidence"
                  items={model.explanation.ambiguityWarnings}
                  tone="ambiguity"
                />
              </div>
            ) : null}
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div className="rounded-lg border border-border/80 bg-background/35 px-4 py-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary/75">
                Why this comes before later work
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-foreground/80">
                {model.explanation.priorityReason}
              </p>
            </div>
            <div className="rounded-lg border border-border/80 bg-background/35 px-4 py-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary/75">
                Why the app has not advanced
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-foreground/80">
                {model.explanation.advancementBlock}
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="what-happens-next-title">
          <ContextSectionHeading
            id="what-happens-next-title"
            title="What happens next"
            description="The owner, required action, durable output, and following step."
          />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <ContextMetadataCard
              label="Who is responsible"
              value={model.nextAction.responsibleParty}
            />
            <ContextMetadataCard
              label="What they must do"
              value={model.nextAction.requiredAction}
            />
            <ContextMetadataCard
              label="Durable output expected"
              value={model.nextAction.expectedOutput}
            />
            <ContextMetadataCard
              label="After that output exists"
              value={model.nextAction.afterCompletion}
            />
          </div>
        </section>

        <section aria-labelledby="route-change-title">
          <ContextSectionHeading
            id="route-change-title"
            title="What would change this route"
            description="Only durable evidence or disposition can move the workflow."
          />
          <div className="grid gap-3 lg:grid-cols-2">
            {model.routeChangeConditions.map((condition, index) => (
              <div
                key={condition.id}
                className="flex gap-3 rounded-lg border border-border bg-card/25 px-4 py-3"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-primary/8 text-[10px] font-bold text-primary">
                  {index + 1}
                </div>
                <p className="text-sm leading-relaxed text-foreground/75">
                  {condition.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <details className="group rounded-xl border border-amber-400/25 bg-amber-400/[0.045]">
          <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
            <AlertTriangle size={16} className="shrink-0 text-amber-300" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-amber-200">
                This route looks wrong
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground/70">
                Record a durable concern for Architect review. Opening or saving
                this request does not change the route.
              </p>
            </div>
            <ChevronDown
              size={14}
              className="shrink-0 text-amber-300 transition-transform group-open:rotate-180"
            />
          </summary>
          <div className="border-t border-amber-400/15 px-4 py-4">
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-lg border border-border bg-background/30 px-4 py-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-300/80">
                  Currently selected route
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-foreground/75">
                  {model.correctionGuidance.currentRoute}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background/30 px-4 py-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-300/80">
                  Expected controlling evidence
                </div>
                <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-4 marker:text-amber-300/45">
                  {model.correctionGuidance.expectedControllingEvidence.map(
                    (record) => (
                      <li
                        key={record}
                        className="text-xs leading-relaxed text-foreground/70"
                      >
                        {record}
                      </li>
                    ),
                  )}
                </ul>
              </div>
            </div>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <PlainLanguageList
                title="Pending or missing evidence"
                items={model.correctionGuidance.pendingOrMissingEvidence}
                tone="pending"
              />
              <PlainLanguageList
                title="Ambiguity warnings"
                items={model.correctionGuidance.ambiguityWarnings}
                tone="ambiguity"
              />
            </div>
            <div className="mt-3 rounded-lg border border-border bg-background/30 px-4 py-4">
              <div className="text-sm font-semibold text-foreground/85">
                Request route review
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground/70">
                {model.correctionGuidance.durableAction}
              </p>
              <label className="mt-4 block text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65">
                Why does this route look wrong?{" "}
                <span className="text-red-300">Required</span>
                <textarea
                  value={operatorConcern}
                  onChange={(event) => {
                    setOperatorConcern(event.target.value);
                    setRouteReviewResult(null);
                  }}
                  maxLength={4000}
                  rows={4}
                  className="mt-1.5 w-full resize-y rounded-md border border-border bg-background/65 px-3 py-2 text-sm font-normal normal-case tracking-normal text-foreground outline-none transition-colors focus:border-amber-300/55"
                  placeholder="Describe the conflicting route or evidence without changing any workflow record."
                />
              </label>
              <label className="mt-3 block text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65">
                Expected route or evidence{" "}
                <span className="font-normal normal-case tracking-normal text-muted-foreground/45">
                  Optional
                </span>
                <textarea
                  value={operatorExpectedRoute}
                  onChange={(event) => {
                    setOperatorExpectedRoute(event.target.value);
                    setRouteReviewResult(null);
                  }}
                  maxLength={2000}
                  rows={3}
                  className="mt-1.5 w-full resize-y rounded-md border border-border bg-background/65 px-3 py-2 text-sm font-normal normal-case tracking-normal text-foreground outline-none transition-colors focus:border-amber-300/55"
                  placeholder="Name the route, disposition, or durable artifact you expect the Architect to evaluate."
                />
              </label>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void saveRouteReview()}
                  disabled={
                    routeReviewSaving ||
                    !operatorConcern.trim() ||
                    !model.route.phaseId
                  }
                  className="inline-flex items-center gap-2 rounded-md border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs font-semibold text-amber-200 transition-colors hover:bg-amber-300/15 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {routeReviewSaving ? (
                    <RefreshCw size={13} className="animate-spin" />
                  ) : (
                    <Save size={13} />
                  )}
                  {routeReviewSaving
                    ? "Saving request..."
                    : "Save Route Review Request"}
                </button>
                {!model.route.phaseId ? (
                  <span className="text-xs text-red-300/75">
                    The evaluator did not provide a phase, so the constrained
                    request path is unavailable.
                  </span>
                ) : null}
              </div>
              {routeReviewResult?.ok ? (
                <div className="mt-3 rounded-md border border-emerald-400/20 bg-emerald-400/[0.05] px-3 py-2 text-xs leading-relaxed text-emerald-200/80">
                  Saved for pending Architect review at{" "}
                  {routeReviewResult.savedMarkdownPath}. The selected route is
                  unchanged; this request does not approve evidence or advance
                  work.
                </div>
              ) : routeReviewResult ? (
                <div className="mt-3 rounded-md border border-red-400/20 bg-red-400/[0.05] px-3 py-2 text-xs leading-relaxed text-red-200/80">
                  {routeReviewResult.errorMessages?.join(" ") ??
                    "The Route Review Request could not be saved."}
                </div>
              ) : null}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-amber-200/65">
              {model.correctionGuidance.governanceSummary}
            </p>
          </div>
        </details>

        <details className="group rounded-xl border border-border bg-card/15">
          <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
            <Eye size={15} className="shrink-0 text-muted-foreground/65" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-foreground/75">
                Detailed route diagnostics
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground/55">
                Technical route identity, state categories, record paths,
                warnings, and capability status.
              </p>
            </div>
            <ChevronDown
              size={14}
              className="shrink-0 text-muted-foreground/60 transition-transform group-open:rotate-180"
            />
          </summary>
          <div className="flex flex-col gap-6 border-t border-border px-4 py-5">
            <section aria-labelledby="route-selection-title">
              <ContextSectionHeading
                id="route-selection-title"
                title="Route identity"
                description="Evaluator metadata and outcome fields."
              />
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <ContextMetadataCard
                  label="Current action"
                  value={model.route.title}
                />
                <ContextMetadataCard
                  label="Responsible role"
                  value={roleLabel(model.route.responsibleRole)}
                />
                <ContextMetadataCard
                  label="Workflow step"
                  value={model.route.workflowStep}
                />
                <ContextMetadataCard
                  label="Status"
                  value={formatContextValue(model.route.status)}
                />
                <ContextMetadataCard
                  label="Phase"
                  value={model.route.phaseLabel}
                />
                <ContextMetadataCard
                  label="Work Card"
                  value={model.route.workCardLabel}
                />
              </div>
              <div className="mt-3 rounded-lg border border-border bg-background/25 px-4 py-3">
                <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground/55">
                  Evaluator reason
                </div>
                <p className="mt-1 text-sm leading-relaxed text-foreground/75">
                  {model.route.reason}
                </p>
                <details className="mt-2 text-[10px] text-muted-foreground/50">
                  <summary className="cursor-pointer select-none">
                    Technical route ID
                  </summary>
                  <div className="break-anywhere mt-1 font-mono leading-relaxed">
                    {model.route.actionId}
                  </div>
                </details>
              </div>
              {model.route.outcomes.length > 0 ? (
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  {model.route.outcomes.map((outcome) => (
                    <div
                      key={outcome.id}
                      className="rounded-md border border-border bg-card/25 px-3 py-2.5"
                    >
                      <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/45">
                        {outcome.label}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-foreground/70">
                        {outcome.description}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>

            <section aria-labelledby="durable-state-title">
              <ContextSectionHeading
                id="durable-state-title"
                title="Durable state categories"
                description="Summaries only. Use Artifacts for document browsing and preview."
              />
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {model.stateCategories.map((state) => (
                  <div
                    key={state.id}
                    className="flex min-h-[132px] flex-col rounded-lg border border-border bg-card/25 px-3.5 py-3"
                  >
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/50">
                          {state.label}
                        </div>
                        <div className="mt-1 break-words text-sm font-semibold text-foreground/85">
                          {formatContextValue(state.status)}
                        </div>
                      </div>
                      <Badge className={contextAuthorityClass(state.authority)}>
                        {contextAuthorityLabel(state.authority)}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground/70">
                      {state.summary}
                    </p>
                    <div className="mt-auto pt-2 text-[10px] text-muted-foreground/45">
                      {state.evidenceCount} supporting record
                      {state.evidenceCount === 1 ? "" : "s"} reported
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section aria-labelledby="missing-records-title">
              <ContextSectionHeading
                id="missing-records-title"
                title={`Missing records (${model.missingRecords.length})`}
                description="The reason is primary; the expected path stays collapsed."
              />
              {model.missingRecords.length === 0 ? (
                <Notice type="success">
                  No missing records were reported for the current route.
                </Notice>
              ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                  {model.missingRecords.map((record) => (
                    <div
                      key={record.key}
                      className={cn(
                        "rounded-lg border px-3.5 py-3",
                        record.impact === "blocking"
                          ? "border-red-400/20 bg-red-400/[0.05]"
                          : record.impact === "expected_next"
                            ? "border-primary/20 bg-primary/[0.04]"
                            : "border-amber-400/20 bg-amber-400/[0.04]",
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-foreground/85">
                            {record.displayName}
                          </div>
                          <div className="mt-0.5 text-[10px] uppercase tracking-[0.1em] text-muted-foreground/50">
                            {record.recordType}
                          </div>
                        </div>
                        <Badge
                          className={
                            record.impact === "blocking"
                              ? "border-red-400/20 bg-red-400/8 text-red-300"
                              : record.impact === "expected_next"
                                ? "border-primary/20 bg-primary/8 text-primary"
                                : "border-amber-400/20 bg-amber-400/8 text-amber-300"
                          }
                        >
                          {record.impactLabel}
                        </Badge>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground/75">
                        {record.reason}
                      </p>
                      <details className="mt-2 text-[10px] text-muted-foreground/50">
                        <summary className="cursor-pointer select-none">
                          Expected path
                        </summary>
                        <div className="break-anywhere mt-1 font-mono leading-relaxed">
                          {record.path}
                        </div>
                      </details>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section aria-labelledby="evidence-health-title">
              <ContextSectionHeading
                id="evidence-health-title"
                title={`Warnings and evidence health (${model.evidenceHealth.length})`}
                description="Historical evidence is never labeled as controlling authority."
              />
              {model.evidenceHealth.length === 0 ? (
                <Notice type="success">
                  No stale, superseded, malformed, unreadable, or other warning
                  evidence was reported.
                </Notice>
              ) : (
                <div className="flex flex-col gap-3">
                  {warningGroups.map((group) =>
                    group.items.length > 0 ? (
                      <ContextEvidenceHealthGroup
                        key={group.severity}
                        severity={group.severity}
                        items={group.items}
                      />
                    ) : null,
                  )}
                </div>
              )}
            </section>

            <section aria-labelledby="capability-state-title">
              <ContextSectionHeading
                id="capability-state-title"
                title="Available app capability context"
                description="Only state exposed to this renderer is reported; unavailable data is not guessed."
              />
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {model.capabilities.map((capability) => (
                  <div
                    key={capability.id}
                    className="rounded-lg border border-border bg-card/25 px-3.5 py-3"
                  >
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1 text-xs font-semibold text-foreground/80">
                        {capability.label}
                      </div>
                      <Badge className={capabilityStateClass(capability.state)}>
                        {capability.statusLabel}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground/70">
                      {capability.summary}
                    </p>
                    {capability.technicalDetail ? (
                      <details className="mt-2 text-[10px] text-muted-foreground/50">
                        <summary className="cursor-pointer select-none">
                          Technical detail
                        </summary>
                        <div className="break-anywhere mt-1 font-mono leading-relaxed">
                          {capability.technicalDetail}
                        </div>
                      </details>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </details>
      </div>
    </div>
  );
}

function PlainLanguageList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "accepted" | "pending" | "missing" | "historical" | "ambiguity";
}) {
  const toneClasses = {
    accepted: {
      container: "border-emerald-400/20 bg-emerald-400/[0.04]",
      title: "text-emerald-300/80",
    },
    pending: {
      container: "border-amber-400/20 bg-amber-400/[0.04]",
      title: "text-amber-300/80",
    },
    missing: {
      container: "border-red-400/20 bg-red-400/[0.04]",
      title: "text-red-300/80",
    },
    historical: {
      container: "border-border bg-card/20",
      title: "text-muted-foreground/65",
    },
    ambiguity: {
      container: "border-orange-400/25 bg-orange-400/[0.05]",
      title: "text-orange-300/85",
    },
  }[tone];

  return (
    <div
      className={cn("rounded-lg border px-4 py-3", toneClasses.container)}
    >
      <div
        className={cn(
          "text-[10px] font-bold uppercase tracking-[0.12em]",
          toneClasses.title,
        )}
      >
        {title}
      </div>
      <ul className="mt-2 flex list-disc flex-col gap-2 pl-4 marker:text-muted-foreground/45">
        {items.length > 0 ? (
          items.map((item) => (
            <li key={item} className="text-xs leading-relaxed text-foreground/75">
              {item}
            </li>
          ))
        ) : (
          <li className="text-xs leading-relaxed text-muted-foreground/60">
            No evidence was reported in this classification.
          </li>
        )}
      </ul>
    </div>
  );
}

function ContextSectionHeading({
  id,
  title,
  description,
}: {
  id: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-end gap-x-3 gap-y-1">
      <h3 id={id} className="text-xs font-bold uppercase tracking-[0.13em] text-foreground/75">
        {title}
      </h3>
      <p className="text-[10px] leading-relaxed text-muted-foreground/50">
        {description}
      </p>
    </div>
  );
}

function ContextMetadataCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border bg-card/25 px-3 py-2.5">
      <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/45">
        {label}
      </div>
      <div
        className="break-words mt-1 text-xs leading-relaxed text-foreground/75"
      >
        {value}
      </div>
    </div>
  );
}

function ContextEvidenceHealthGroup({
  severity,
  items,
}: {
  severity: "blocking" | "warning" | "info";
  items: CurrentStepEvidenceHealthItem[];
}) {
  const styles = {
    blocking: {
      label: "Blocking",
      border: "border-red-400/20",
      background: "bg-red-400/[0.045]",
      text: "text-red-300",
    },
    warning: {
      label: "Warnings",
      border: "border-amber-400/20",
      background: "bg-amber-400/[0.04]",
      text: "text-amber-300",
    },
    info: {
      label: "Informational / historical",
      border: "border-blue-400/20",
      background: "bg-blue-400/[0.035]",
      text: "text-blue-300",
    },
  }[severity];

  return (
    <div>
      <div className={cn("mb-2 text-[10px] font-bold uppercase tracking-[0.12em]", styles.text)}>
        {styles.label} ({items.length})
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.key}
            className={cn(
              "rounded-lg border px-3.5 py-3",
              styles.border,
              styles.background,
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              <div className={cn("text-xs font-semibold", styles.text)}>
                {item.label}
              </div>
              <Badge
                className={
                  item.authority === "historical"
                    ? "border-slate-400/20 bg-slate-400/8 text-slate-300"
                    : item.authority === "blocking"
                      ? "border-red-400/20 bg-red-400/8 text-red-300"
                      : "border-border bg-card/40 text-muted-foreground"
                }
              >
                {item.authority === "historical"
                  ? "Not controlling"
                  : item.authority === "blocking"
                    ? "Controls block"
                    : "Supporting"}
              </Badge>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground/75">
              {item.summary}
            </p>
            <details className="mt-2 text-[10px] text-muted-foreground/50">
              <summary className="cursor-pointer select-none">
                Technical details
              </summary>
              <div className="mt-1 flex flex-col gap-1 rounded border border-border/70 bg-black/10 p-2 font-mono leading-relaxed">
                <div>Code: {item.technicalCode}</div>
                <div className="break-anywhere">{item.technicalMessage}</div>
                {item.sourceArtifactPath ? (
                  <div className="break-anywhere">{item.sourceArtifactPath}</div>
                ) : null}
              </div>
            </details>
          </div>
        ))}
      </div>
    </div>
  );
}

function contextAuthorityLabel(
  authority: CurrentStepContextInspectorModel["stateCategories"][number]["authority"],
): string {
  return {
    controlling: "Controls route",
    supporting: "Supporting",
    historical: "Historical",
    not_reported: "Not reported",
  }[authority];
}

function contextAuthorityClass(
  authority: CurrentStepContextInspectorModel["stateCategories"][number]["authority"],
): string {
  return {
    controlling: "border-primary/20 bg-primary/8 text-primary",
    supporting: "border-blue-400/20 bg-blue-400/8 text-blue-300",
    historical: "border-slate-400/20 bg-slate-400/8 text-slate-300",
    not_reported: "border-border bg-card/40 text-muted-foreground/60",
  }[authority];
}

function capabilityStateClass(
  state: CurrentStepContextInspectorModel["capabilities"][number]["state"],
): string {
  return {
    available: "border-emerald-400/20 bg-emerald-400/8 text-emerald-300",
    loading: "border-amber-400/20 bg-amber-400/8 text-amber-300",
    degraded: "border-amber-400/20 bg-amber-400/8 text-amber-300",
    unavailable: "border-red-400/20 bg-red-400/8 text-red-300",
    not_reported: "border-border bg-card/40 text-muted-foreground/60",
  }[state];
}

function formatContextValue(value: string): string {
  return value.replace(/_/g, " ");
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
