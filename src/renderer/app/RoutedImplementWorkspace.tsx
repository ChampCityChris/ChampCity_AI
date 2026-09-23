import type { RoutedWorkflowAction, RoutedWorkflowInput, RoutedWorkflowModel } from "../../shared/routedWorkflowContracts";
import { CodexExecutionActions, CodexExecutionConsole, DevelopmentEnvironmentStatus } from "./WorkCardBuildingReviewWorkspace";

export function RoutedImplementWorkspace({ model, busy, error, onAction }: {
  model: RoutedWorkflowModel | null;
  busy: boolean;
  error: string;
  onAction: (action: RoutedWorkflowAction, input?: RoutedWorkflowInput) => void;
}): JSX.Element {
  const current = model?.current;
  const candidate = model?.execution?.workItems.find((item) => item.candidate.workItemId === current?.workItemId)?.candidate;
  const contract = current?.contract;
  const contextSummary = contract && current?.reportTargetPath ? {
    contractLabel: current.implementationId === current.workItemId ? "Approved Formal Work Card" : "Approved Repair Work Card",
    contractPath: contract.path, contractRevision: contract.revision,
    reportPath: current.reportTargetPath, reportRevision: current.report?.revision ?? "Pending",
  } : undefined;
  return <section className="work-card-building-workspace routed-implement-workspace" aria-labelledby="workspace-heading">
    <section className="work-card-building-context" aria-label="Routed Implement context and controls">
      <header><div><span>Work Intake · Current Work Item</span><h1 id="workspace-heading">Implement {current?.implementationId ?? "Work Item"}</h1></div>
        <strong>{candidate?.title ?? "Select the current Work Item"}</strong></header>
      <dl><div><dt>Approved Work Card</dt><dd>{contract?.path ?? "Awaiting approved Work Card"}</dd></div>
        <div><dt>Revision</dt><dd>{contract?.revision ?? "Pending"}</dd></div>
        <div><dt>Implementer Report target</dt><dd>{current?.reportTargetPath ?? "Resolve current report target"}</dd></div></dl>
      <DevelopmentEnvironmentStatus execution={model?.implementer ?? null} />
      <CodexExecutionActions execution={model?.implementer ?? null} isActionRunning={busy}
        canRunOverride={Boolean(model?.actions.includes("implement"))}
        onRun={(selection) => onAction("implement", { selection })}
        onCancel={() => onAction("cancel")}
        onResolveEnvironment={model?.actions.includes("resolve-environment") ? () => onAction("resolve-environment") : undefined} />
      {error ? <p role="alert">{error}</p> : null}{model?.feedback ? <p role="status">{model.feedback}</p> : null}
    </section>
    <CodexExecutionConsole contextSummary={contextSummary} execution={model?.implementer ?? null} isActionRunning={busy}
      onRespondToCodexApproval={(requestId, decision) => onAction("respond-approval", { approval: { requestId, decision } })}
      onRespondToCodexUserInput={(requestId, answers) => onAction("respond-input", { userInput: { requestId, answers } })}
      onRespondToCodexMcpElicitation={(requestId, action, content) => onAction("respond-elicitation", { elicitation: { requestId, action, content } })} />
  </section>;
}
