import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import type { DirectWorkflowStartRequest, WorkflowInstanceSummary } from "../../shared/workflowApplicationContracts";
import { WORKFLOW_TYPE_REGISTRY, type WorkflowType } from "../../shared/projectState/workflowTypeRegistry";

function completed(workflow: WorkflowInstanceSummary): boolean {
  return workflow.lifecycleState === "closed" || workflow.lifecycleState === "archived" ||
    workflow.lifecycleState === "voided" || workflow.lifecycleState === "superseded" ||
    workflow.workflowState === "closed" || workflow.workflowState === "cancelled";
}

export function WorkflowTypeWorkspace({ workflowType, workflows, loading, error, onOpenWorkflow, onStartWorkflow, onStartWorkIntake, onReturn }: {
  workflowType: WorkflowType;
  workflows: WorkflowInstanceSummary[];
  loading: boolean;
  error: string;
  onOpenWorkflow: (workflowId: string) => void;
  onStartWorkflow: (request: DirectWorkflowStartRequest) => Promise<void>;
  onStartWorkIntake: () => void;
  onReturn: () => void;
}): JSX.Element {
  const definition = WORKFLOW_TYPE_REGISTRY[workflowType];
  const [starting, setStarting] = useState(false);
  const [title, setTitle] = useState("");
  const [startError, setStartError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const boundedTitle = title.trim();
    if (!boundedTitle || boundedTitle.length > 200) {
      setStartError("Enter a title with 1 to 200 characters.");
      return;
    }
    setBusy(true);
    setStartError("");
    try {
      await onStartWorkflow({ workflowType, title: boundedTitle });
      setTitle("");
      setStarting(false);
    } catch (failure) {
      setStartError(failure instanceof Error ? failure.message : "Workflow could not be started.");
    } finally { setBusy(false); }
  }

  return <section className="workflow-type-workspace" aria-labelledby="workspace-heading">
    <header className="workflow-type-workspace-header">
      <div><h1 id="workspace-heading">{definition.label}</h1><p>{definition.purpose}</p></div>
      <button className="workflow-instance-back" type="button" onClick={onReturn}><ArrowLeft size={16} aria-hidden="true" /> Back to Workflows</button>
    </header>
    {definition.directStart ? <button className="workflow-start-action" type="button" onClick={() => { setStartError(""); setStarting(value => !value); }}>Start New</button>
      : workflowType === "work-intake-routing" ? <button className="workflow-start-action" type="button" onClick={onStartWorkIntake}>Start New Work Intake</button> : null}
    {starting ? <form className="workflow-start-form" aria-label={`Start ${definition.label}`} onSubmit={event => void submit(event)}>
      <label>Workflow title<input autoFocus maxLength={200} required value={title} onChange={event => setTitle(event.target.value)} /></label>
      {startError ? <p role="alert">{startError}</p> : null}
      <div className="workflow-start-form-actions">
        <button className="apply-button" type="submit" disabled={busy || !title.trim()}>{busy ? "Starting…" : `Start ${definition.label}`}</button>
        <button type="button" onClick={() => { setStarting(false); setStartError(""); }} disabled={busy}>Cancel</button>
      </div>
    </form> : null}
    {error ? <p role="alert">{error}</p> : null}
    {loading ? <p role="status">Loading Workflows…</p> : null}
    <h2>Current and previous Workflows</h2>
    {workflows.length ? <ul className="workflow-instance-list" aria-label={`${definition.label} instances`}>
      {workflows.map(workflow => {
        const isCompleted = completed(workflow);
        return <li key={workflow.workflowId} className={`workflow-instance-item${isCompleted ? " is-completed" : ""}`}>
          <button type="button" className="workflow-instance-row" aria-label={`Open ${workflow.title} (${workflow.workflowId.slice(0, 8)})`}
            onClick={() => onOpenWorkflow(workflow.workflowId)}>
            <span className="workflow-instance-main"><strong>{workflow.title}</strong><span>{workflow.currentWorkspace.replaceAll("-", " ")}</span></span>
            <span className={`workflow-instance-status${isCompleted ? " is-completed" : ""}`}>{isCompleted ? "Completed" : workflow.workflowState.replaceAll("_", " ")}</span>
            <span className="workflow-instance-open">Open</span>
          </button>
        </li>;
      })}
    </ul> : !loading ? <p className="workflow-type-empty">No {definition.label.toLowerCase()} instances yet.</p> : null}
  </section>;
}
