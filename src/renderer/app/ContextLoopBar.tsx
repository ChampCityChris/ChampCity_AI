import { Check } from "lucide-react";

export type ContextLoopSelectionState = "exact" | "parent" | "available";
export type ContextLoopStageTone = "completed" | "in-progress" | "not-ready" | "pending";

export interface ContextLoopItem<TDestination extends string> {
  id: string;
  label: string;
  fullLabel: string;
  destination: TDestination;
  stateFor: (activeDestinationId: TDestination) => ContextLoopSelectionState;
  available?: boolean;
  reason?: string;
  repair?: boolean;
  stateLabel?: string;
}

export function ContextLoopBar<TDestination extends string>({
  activeDestinationId,
  activeStepId,
  ariaLabel,
  context,
  items,
  label,
  onDestinationChange,
  workCard = false,
}: {
  activeDestinationId: TDestination;
  activeStepId: string;
  ariaLabel: string;
  context: { id: string; position: string };
  items: readonly ContextLoopItem<TDestination>[];
  label: string;
  onDestinationChange: (destination: TDestination) => void;
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
          const available = item.available ?? true;
          const state = item.stateFor(activeDestinationId);
          const selected = state === "exact" || state === "parent";
          const tone: ContextLoopStageTone = !available
            ? "not-ready"
            : index < currentIndex
              ? "completed"
              : index === currentIndex
                ? "in-progress"
                : "pending";
          const stateLabel = item.stateLabel ?? (selected ? "Current" : available ? "Available" : "Unavailable");
          const isRepair = item.repair || item.id.toLowerCase().includes("repair");
          return (
            <div className="figma-sub-stage" key={item.id}>
              {index > 0 ? (
                <span className={`figma-sub-connector ${available && index <= currentIndex ? "completed" : ""}`} aria-hidden="true" />
              ) : null}
              <button
                aria-current={selected ? "step" : undefined}
                aria-disabled={!available}
                aria-label={`${item.fullLabel}: ${stateLabel}. ${available ? "Open workflow step." : item.reason ?? "Workflow step is unavailable."}`}
                className={[
                  "figma-sub-pill",
                  selected ? "active" : "",
                  state === "parent" ? "parent" : "",
                  isRepair ? "repair" : "",
                  !available ? "unavailable" : "",
                  tone,
                ].filter(Boolean).join(" ")}
                data-status={tone}
                disabled={!available}
                onClick={() => onDestinationChange(item.destination)}
                title={available ? `Open ${item.fullLabel}` : item.reason ?? `${item.fullLabel} is unavailable`}
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

export function StageIcon({
  active,
  small = false,
  tone,
}: {
  active: boolean;
  small?: boolean;
  tone: ContextLoopStageTone;
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
