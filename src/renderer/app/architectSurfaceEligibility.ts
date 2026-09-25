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
  workIntakeStageId: "intake" | "routing";
}): boolean {
  if (!input.paneVisible) return false;
  if (input.developmentForeground && (input.developmentBrowserAvailable || input.workCardRepair)) return true;
  if (input.issueForeground && (input.issueStageId === "architect-planning" || input.issueStageId === "issue-planning" ||
    (input.issueStageId === "fix-cards" && ["planning", "review-validation", "repair"].includes(input.issueFixCardStepId)))) return true;
  if (!input.workIntakeForeground) return false;
  return input.workIntakeStageId === "routing";
}
