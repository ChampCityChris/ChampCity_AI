import type { RoutedIssueLineage } from "../../shared/routedIssueLineageContracts";

export function RoutedIssueReturnNav({ lineage, rerouteRecommended, error, onReturnToRouting }: {
  lineage: RoutedIssueLineage;
  rerouteRecommended: boolean;
  error: string;
  onReturnToRouting: (lineage: RoutedIssueLineage) => void;
}): JSX.Element {
  return <nav className="routed-issue-return" aria-label="Routed Issue return">
    <span>Routed from Work Intake</span>
    {rerouteRecommended ? <button type="button" onClick={() => onReturnToRouting(lineage)}>Return to Work Intake Routing</button> : null}
    {error ? <p role="alert">{error}</p> : null}
  </nav>;
}
