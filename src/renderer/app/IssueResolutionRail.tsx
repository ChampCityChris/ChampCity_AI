import { Check, Lock } from "lucide-react";

import {
  issueResolutionStages,
  issueFixCardLoop,
  type IssueFixCardLoopStepId,
  type IssueFixCardProjection,
  type IssueResolutionNavigationProjection,
  type IssueRecordProjection,
  type IssueResolutionStageId,
} from "../../shared/issueResolutionContracts";
import { ContextLoopBar, type ContextLoopItem } from "./ContextLoopBar";

export function IssueResolutionRail({
  activeStageId,
  currentIssue,
  activeFixCardStepId = "fix-card-map",
  fixCardProjection,
  fixCardsAvailable,
  issuePlanningAvailable,
  navigationProjection,
  onFixCardStepChange,
  onStageChange,
}: {
  activeStageId: IssueResolutionStageId;
  activeFixCardStepId?: IssueFixCardLoopStepId;
  currentIssue: IssueRecordProjection | null;
  fixCardProjection?: IssueFixCardProjection | null;
  fixCardsAvailable?: boolean;
  issuePlanningAvailable?: boolean;
  navigationProjection?: IssueResolutionNavigationProjection | null;
  onFixCardStepChange?: (stepId: IssueFixCardLoopStepId) => void;
  onStageChange: (stageId: IssueResolutionStageId) => void;
}): JSX.Element {
  const showFixCardLoop = activeStageId === "fix-cards";
  return (
    <section aria-label="Issue Resolution navigation" className="workflow-navigation-header issue-resolution-navigation">
      <div className="figma-pipeline-nav" aria-label="Issue Resolution parent rail">
        {issueResolutionStages.map((stage) => {
          const isActive = stage.id === activeStageId;
          const navigationAvailability = navigationProjection?.stages.find((candidate) => candidate.stageId === stage.id);
          const isAvailable = navigationAvailability?.available ?? (stage.id === "intake" ||
            (stage.id === "architect-planning" && currentIssue?.recordState === "readable") ||
            (stage.id === "issue-planning" && currentIssue?.recordState === "readable" && Boolean(issuePlanningAvailable)) ||
            (stage.id === "fix-cards" && currentIssue?.recordState === "readable" && Boolean(fixCardsAvailable)));
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
                title={isAvailable ? `Open ${stage.label}` : navigationAvailability?.reason ?? `${stage.label} is not available yet`}
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

      {showFixCardLoop ? (
        <ContextLoopBar
          activeDestinationId={activeFixCardStepId}
          activeStepId={activeFixCardStepId}
          ariaLabel="Issue Fix Card loop"
          context={issueFixCardLoopContext(currentIssue, fixCardProjection)}
          items={issueFixCardLoopItems(fixCardProjection)}
          label="Fix Card Loop"
          onDestinationChange={(stepId) => onFixCardStepChange?.(stepId)}
          workCard
        />
      ) : null}
    </section>
  );
}

function issueFixCardLoopItems(
  projection?: IssueFixCardProjection | null,
): readonly ContextLoopItem<IssueFixCardLoopStepId>[] {
  return issueFixCardLoop.map((step) => {
    const availability = projection?.stepAvailability.find((entry) => entry.stepId === step.id);
    const available = availability?.available ?? step.id === "fix-card-map";
    return {
      id: step.id,
      label: step.label,
      fullLabel: step.label,
      destination: step.id,
      available,
      reason: availability?.reason,
      repair: step.id === "repair",
      stateFor: (activeStepId) => activeStepId === step.id ? "exact" : "available",
      stateLabel: availability?.stateLabel ?? (available ? "Available" : "Unavailable"),
    };
  });
}

function issueFixCardLoopContext(
  currentIssue: IssueRecordProjection | null,
  projection?: IssueFixCardProjection | null,
): { id: string; position: string } {
  if (projection?.selectedCandidate) {
    return {
      id: projection.selectedCandidate.fixCardId,
      position: projection.selectedCandidate.title,
    };
  }
  if (currentIssue) {
    return {
      id: "No Fix Card selected",
      position: `${currentIssue.issueId}: ${currentIssue.title}`,
    };
  }
  return {
    id: "No Issue selected",
    position: "Issue-owned Fix Card loop",
  };
}
