import type { ReactNode } from "react";
import { StageIcon, type ContextLoopSelectionState, type ContextLoopStageTone } from "./ContextLoopBar";

export interface WorkflowStage {
  id: string;
  label: string;
  statusLabel: string;
  state: ContextLoopSelectionState;
  isRequired: boolean;
  enabled?: boolean;
  onClick?: () => void;
}

type SelectionState = ContextLoopSelectionState;
type StageTone = ContextLoopStageTone;

export function WorkflowStageRail({ stages, ariaLabel, children }: {
  stages: readonly WorkflowStage[];
  ariaLabel: string;
  children?: ReactNode;
}): JSX.Element {
  return (
    <section aria-label="Workflow navigation" className="workflow-navigation-header">
      <div className="figma-pipeline-nav" aria-label={ariaLabel}>
        {stages.map((stage, index) => <PipelineStep key={stage.id} {...stage} index={index} count={stages.length} />)}
      </div>
      {children}
    </section>
  );
}

function PipelineStep({
  index,
  label,
  onClick,
  statusLabel,
  isRequired,
  enabled,
  count,
  state,
}: {
  index: number;
  label: string;
  onClick?: () => void;
  statusLabel: string;
  isRequired: boolean;
  enabled?: boolean;
  count: number;
  state: SelectionState;
}): JSX.Element {
  const tone = pipelineStatusTone(statusLabel, isRequired);
  const selected = state === "exact" || state === "parent";
  const connectorComplete = tone === "completed";
  return (
    <div className="figma-pipeline-stage">
      {index > 0 ? (
        <span className={`figma-stage-connector ${connectorComplete ? "completed" : ""}`} aria-hidden="true" />
      ) : null}
      <button
        aria-current={state === "exact" ? "page" : undefined}
        aria-label={`${String(index + 1).padStart(2, "0")} ${label}: ${statusLabel}.${isRequired ? " Current required step." : ""} ${selected ? "Inspected stage. " : ""}${enabled === false || !onClick ? "Workflow step unavailable." : "Inspect workflow step."}`}
        className={[
          "figma-pipeline-step",
          selected ? "active" : "",
          state === "parent" ? "parent" : "",
          isRequired ? "required" : "",
          tone,
        ].filter(Boolean).join(" ")}
        data-status={tone}
        disabled={enabled === false || !onClick}
        onClick={enabled === false ? undefined : onClick}
        type="button"
      >
        <StageIcon active={selected} tone={tone} />
        <span className="figma-stage-copy">
          <strong>{label}</strong>
          <span className={`figma-pipeline-status ${tone}`}>{statusLabel}</span>
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
