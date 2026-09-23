import type { RoutedWorkflowAction, RoutedWorkflowInput, RoutedWorkflowModel } from "../../shared/routedWorkflowContracts";
import { WorkCardClosePresentation } from "./WorkCardCloseWorkspace";

export function RoutedCloseWorkspace({ model, busy, error, onAction, onReturnMap }: {
  model: RoutedWorkflowModel | null;
  busy: boolean;
  error: string;
  onAction: (action: RoutedWorkflowAction, input?: RoutedWorkflowInput) => void;
  onReturnMap: () => void;
}): JSX.Element {
  const current = model?.current;
  const item = model?.execution?.workItems.find((entry) => entry.candidate.workItemId === current?.workItemId);
  const canClose = Boolean(model?.actions.includes("close"));
  const evidence = [current?.contract && { path: current.contract.path, displayName: "Approved Work Card",
    disposition: current.contract.disposition, readState: "readable" },
  current?.report && { path: current.report.path, displayName: "Implementer Report",
    disposition: current.report.disposition, readState: "readable" }].filter((entry) => Boolean(entry)) as Array<{
      path: string; displayName: string; disposition: string; readState: string }>;
  return <section className="routed-close-workspace" aria-label="Routed Close / Next">
    <WorkCardClosePresentation actionError={error} actionFeedback={model?.feedback ?? ""}
      actionLabel="Close Work Item" actingLabel="Closing Work Item..." ariaLabel="Routed Work Item close"
      canAct={canClose} evidence={evidence} fields={[
        { label: "Work Item", value: current?.workItemId ?? "Waiting" },
        { label: "Phase", value: current?.phaseId ?? "Direct Plan" },
        { label: "Next eligible Work Item", value: model?.execution?.nextWorkItemId ?? "Awaiting acceptance or integration" },
      ]} identityLine={current?.implementationId ?? "Work Item"} isActing={busy}
      nextWorkspace="Work Item Map / next eligible Work Item" onAction={() => onAction("close")}
      projectionAction={canClose ? "Close current Work Item" : "Review current completion evidence"}
      reason={item?.reasons.join(" ") || model?.reasons.join(" ") || "Current close evidence is ready."}
      stateLabel={canClose ? "Ready to close" : "Waiting"} title={item?.candidate.title ?? "Work Item close"} />
    <button type="button" onClick={onReturnMap}>Return to Work Item Map</button>
  </section>;
}
