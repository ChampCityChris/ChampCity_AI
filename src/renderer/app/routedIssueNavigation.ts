import type { IssueResolutionNavigationProjection } from "../../shared/issueResolutionContracts";

export async function activateRoutedIssueWorkspace(issueId: string, navigation: {
  refreshInventory: (issueId: string) => Promise<void>;
  getNavigation: (issueId: string) => Promise<IssueResolutionNavigationProjection>;
  selectIssue: (issueId: string) => void;
  setNavigation: (projection: IssueResolutionNavigationProjection) => void;
  setArchitectPlanning: () => void;
  showIssueWorkflow: () => void;
}): Promise<void> {
  await navigation.refreshInventory(issueId);
  const projection = await navigation.getNavigation(issueId);
  navigation.selectIssue(issueId);
  navigation.setNavigation(projection);
  navigation.setArchitectPlanning();
  navigation.showIssueWorkflow();
}
