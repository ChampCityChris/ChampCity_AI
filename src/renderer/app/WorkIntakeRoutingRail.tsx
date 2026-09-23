import { Check, Lock } from "lucide-react";
import { workRouteProfileRegistry } from "../../shared/workIntakeRoutingContracts";
import type { WorkIntakeNavigationProjection, WorkIntakeStageId } from "../../shared/workIntakeNavigationContracts";

export function WorkIntakeRoutingRail({ projection, activeStageId, onStageChange }: {
  projection: WorkIntakeNavigationProjection;
  activeStageId: WorkIntakeStageId;
  onStageChange: (stageId: WorkIntakeStageId) => void;
}): JSX.Element {
  return <section className="workflow-navigation-header work-intake-navigation" aria-label="Work Intake navigation">
    <div className="figma-pipeline-nav" aria-label="Work Intake stages">
      {projection.stages.map((stage, index) => {
        const active = stage.stageId === activeStageId;
        return <div className="figma-pipeline-stage" key={stage.stageId}>
          <button type="button" className={`figma-pipeline-step ${active ? "active in-progress required" : "pending"} ${stage.available ? "" : "unavailable"}`}
            aria-current={active ? "page" : undefined} aria-disabled={!stage.available} disabled={!stage.available}
            title={stage.available ? `Open ${stage.label}` : stage.reason} onClick={() => onStageChange(stage.stageId)}>
            <span aria-hidden="true" className={`figma-stage-icon ${active ? "active in-progress" : "pending"}`}>
              {active ? <Check size={10} strokeWidth={3} /> : <Lock size={9} />}
            </span>
            <span className="figma-stage-copy"><strong>{`${String(index + 1).padStart(2, "0")} ${stage.label}`}</strong>
              <span className={`figma-pipeline-status ${active ? "in-progress" : "pending"}`}>
                {active ? "Current" : stage.available ? "Available" : "Unavailable"}
              </span>
            </span>
          </button>
        </div>;
      })}
    </div>
    {projection.selectedRouteId ? <p className="work-intake-route-context">Selected route: {workRouteProfileRegistry[projection.selectedRouteId].label}</p> : null}
  </section>;
}
