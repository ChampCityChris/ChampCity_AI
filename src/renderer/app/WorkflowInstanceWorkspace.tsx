import { ArrowLeft } from "lucide-react";
import type { WorkflowInstanceSummary } from "../../shared/workflowApplicationContracts";
import { WORKFLOW_TYPE_REGISTRY } from "../../shared/projectState/workflowTypeRegistry";

function stateLabel(workflow: WorkflowInstanceSummary): string {
  if (workflow.lifecycleState === "closed" || workflow.lifecycleState === "archived" || workflow.lifecycleState === "voided" ||
    workflow.workflowState === "closed" || workflow.workflowState === "cancelled") return "Completed";
  return workflow.workflowState.replaceAll("_", " ");
}

export function WorkflowInstanceWorkspace({ workflow, onReturn }: {
  workflow: WorkflowInstanceSummary;
  onReturn: () => void;
}): JSX.Element {
  const definition = WORKFLOW_TYPE_REGISTRY[workflow.workflowType];
  return <section className="workflow-instance-workspace" aria-labelledby="workspace-heading">
    <header className="workflow-instance-shell-header">
      <div><p>{definition.label}</p><h1 id="workspace-heading">{workflow.title}</h1></div>
      <button type="button" className="workflow-instance-back" onClick={onReturn}><ArrowLeft size={16} aria-hidden="true" /> Back to Workflows</button>
    </header>
    <dl className="workflow-instance-details">
      <div><dt>Workflow type</dt><dd>{definition.label}</dd></div>
      <div><dt>State</dt><dd>{stateLabel(workflow)}</dd></div>
      <div><dt>Current workspace</dt><dd>{workflow.currentWorkspace.replaceAll("-", " ")}</dd></div>
      <div><dt>Instance</dt><dd>{workflow.workflowId}</dd></div>
      <div><dt>Origin</dt><dd>{workflow.routedSourceWorkflowId ? `Routed from Work Intake (${workflow.workIntakeId ?? "saved intake"})` : "Started directly"}</dd></div>
    </dl>
    <p className="workflow-instance-shell-note">{workflow.workflowType === "work-intake-routing" && stateLabel(workflow) === "Completed" ? "This Work Intake routing Workflow is complete. Its summary remains available for review." : "This Workflow is ready for its workflow-specific intake and planning workspace."}</p>
  </section>;
}
