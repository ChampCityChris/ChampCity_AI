import { Check, Lock } from "lucide-react";

import {
  issueResolutionStages,
  type IssueRecordProjection,
  type IssueResolutionStageId,
} from "../../shared/issueResolutionContracts";

export function IssueResolutionRail({
  activeStageId,
  currentIssue,
  onStageChange,
}: {
  activeStageId: IssueResolutionStageId;
  currentIssue: IssueRecordProjection | null;
  onStageChange: (stageId: IssueResolutionStageId) => void;
}): JSX.Element {
  return (
    <section aria-label="Issue Resolution navigation" className="workflow-navigation-header issue-resolution-navigation">
      <div className="figma-pipeline-nav" aria-label="Issue Resolution parent rail">
        {issueResolutionStages.map((stage) => {
          const isActive = stage.id === activeStageId;
          const isAvailable = stage.id === "intake" ||
            (stage.id === "architect-planning" && currentIssue?.recordState === "readable");
          return (
            <div className="figma-pipeline-stage" key={stage.id}>
              <button
                aria-current={isActive ? "page" : undefined}
                aria-disabled={!isAvailable}
                className={[
                  "figma-pipeline-step",
                  isActive ? "active in-progress required" : "pending",
                  !isAvailable ? "unavailable" : "",
                ].filter(Boolean).join(" ")}
                disabled={!isAvailable}
                onClick={() => onStageChange(stage.id)}
                title={isAvailable ? `Open ${stage.label}` : `${stage.label} is not available yet`}
                type="button"
              >
                <span
                  aria-hidden="true"
                  className={[
                    "figma-stage-icon",
                    isActive ? "active in-progress" : "pending",
                  ].filter(Boolean).join(" ")}
                >
                  {isActive ? <Check size={10} strokeWidth={3} /> : <Lock size={9} />}
                </span>
                <span className="figma-stage-copy">
                  <strong>{`${String(stage.order).padStart(2, "0")} ${stage.label}`}</strong>
                  <span className={`figma-pipeline-status ${isActive ? "in-progress" : "pending"}`}>
                    {isActive ? "Current" : isAvailable ? "Available" : "Unavailable"}
                  </span>
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
