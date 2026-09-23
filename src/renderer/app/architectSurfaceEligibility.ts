import type { WorkIntakeNavigationProjection, WorkIntakeStageId } from "../../shared/workIntakeNavigationContracts";
import type { IssueFixCardLoopStepId, IssueResolutionStageId } from "../../shared/issueResolutionContracts";

export function shouldAttachArchitectSurface(input: {
  paneVisible: boolean;
  developmentForeground: boolean;
  developmentBrowserAvailable: boolean;
  workCardRepair: boolean;
  issueForeground: boolean;
  issueStageId: IssueResolutionStageId;
  issueFixCardStepId: IssueFixCardLoopStepId;
  workIntakeForeground: boolean;
  workIntakeStageId: WorkIntakeStageId;
  workIntakeExecutionStepId?: string;
  workIntakeDecompositionActive?: boolean;
  workIntakeNavigation: WorkIntakeNavigationProjection | null;
}): boolean {
  if (!input.paneVisible) return false;
  if (input.developmentForeground && (input.developmentBrowserAvailable || input.workCardRepair)) return true;
  if (input.issueForeground && (input.issueStageId === "architect-planning" || input.issueStageId === "issue-planning" ||
    (input.issueStageId === "fix-cards" && ["planning", "review-validation", "repair"].includes(input.issueFixCardStepId)))) return true;
  if (!input.workIntakeForeground) return false;
  if (input.workIntakeDecompositionActive) return true;
  if (input.workIntakeStageId === "execution" && input.workIntakeNavigation?.stages.some((stage) => stage.stageId === "execution" && stage.available)
    && ["planning", "repair", "review-validation"].includes(input.workIntakeExecutionStepId ?? "")) return true;
  return Boolean(input.workIntakeNavigation?.stages.some((stage) =>
    stage.stageId === input.workIntakeStageId && stage.available && stage.requiresArchitect));
}
