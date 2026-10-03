import { ContextLoopBar, StageIcon, type ContextLoopItem, type ContextLoopSelectionState, type ContextLoopStageTone } from "./ContextLoopBar";

type SelectionState = ContextLoopSelectionState;
type StageTone = ContextLoopStageTone;
export interface NestedRailProjectStep {
  id: string; label: string; state: SelectionState;
  presentation: {statusLabel: string; isRequired: boolean};
  onClick: () => void;
}
export interface NestedRailLoop {
  activeDestinationId: string; activeStepId: string;
  context: {id: string; position: string};
  items: readonly ContextLoopItem<string>[];
  onDestinationChange: (destination: string) => void;
}
export interface NestedWorkflowRailShellProps {
  projectSteps: readonly NestedRailProjectStep[];
  phaseLoop?: NestedRailLoop;
  workCardLoop?: NestedRailLoop;
}
/** Presentation recovered from 965536de; authority and navigation belong to the caller. */
export function NestedWorkflowRailShell({projectSteps, phaseLoop, workCardLoop}: NestedWorkflowRailShellProps): JSX.Element {
  return (
    <section aria-label="Workflow navigation" className="workflow-navigation-header">
      <div className="figma-pipeline-nav" aria-label="Project pipeline">
        {projectSteps.map((step, index) => <PipelineStep key={step.id} {...step} index={index} count={projectSteps.length} />)}
      </div>
      {phaseLoop ? <ContextLoopBar {...phaseLoop} ariaLabel="Phase loop" label="Phase Loop" /> : null}
      {workCardLoop ? <ContextLoopBar {...workCardLoop} ariaLabel="Work Card loop" label="Work Card Map" workCard /> : null}
    </section>
  );
}

function PipelineStep({
  index,
  label,
  onClick,
  presentation,
  state,
  count,
}: {
  index: number;
  count: number;
  label: string;
  onClick: () => void;
  presentation: {statusLabel: string; isRequired: boolean};
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
      {index < count - 1 ? (
        <span className={`figma-stage-connector ${connectorComplete ? "completed" : ""}`} aria-hidden="true" />
      ) : null}
    </div>
  );
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
