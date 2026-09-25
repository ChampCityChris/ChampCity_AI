import { useState } from "react";
import { GitBranch } from "lucide-react";
import type { DirectWorkflowStartRequest, WorkflowInstanceSummary, WorkflowInventory } from "../../shared/workflowApplicationContracts";
import { WORKFLOW_TYPE_REGISTRY, type WorkflowType } from "../../shared/projectState/workflowTypeRegistry";
import type { WorkspaceSelection } from "../../shared/workspaceContracts";

const directTypes = Object.values(WORKFLOW_TYPE_REGISTRY)
  .filter(definition => definition.directStart)
  .sort((left, right) => left.hubOrder - right.hubOrder);
const workIntakeType = WORKFLOW_TYPE_REGISTRY["work-intake-routing"];
const projectCreationType = WORKFLOW_TYPE_REGISTRY["project-creation"];

function completed(workflow: WorkflowInstanceSummary): boolean {
  return workflow.lifecycleState === "closed" || workflow.lifecycleState === "archived" ||
    workflow.lifecycleState === "voided" || workflow.lifecycleState === "superseded" ||
    workflow.workflowState === "closed" || workflow.workflowState === "cancelled";
}

function TypeGroup({
  workflowType,
  workflows,
  selectedWorkflowId,
  onOpenWorkflow,
  onStartWorkflow,
  onStartWorkIntake,
}: {
  workflowType: WorkflowType;
  workflows: WorkflowInstanceSummary[];
  selectedWorkflowId: string | null;
  onOpenWorkflow: (workflowId: string) => void;
  onStartWorkflow: (request: DirectWorkflowStartRequest) => Promise<void>;
  onStartWorkIntake: () => void;
}) {
  const definition = WORKFLOW_TYPE_REGISTRY[workflowType];
  const [starting, setStarting] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const boundedTitle = title.trim();
    if (!boundedTitle || boundedTitle.length > 200) {
      setError("Enter a title with 1 to 200 characters.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onStartWorkflow({ workflowType, title: boundedTitle });
      setTitle("");
      setStarting(false);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Workflow could not be started.");
    } finally { setBusy(false); }
  }

  return <section className="workflow-type-group" aria-labelledby={`workflow-group-${workflowType}`}>
    <header className="workflow-type-header">
      <div>
        <h2 id={`workflow-group-${workflowType}`}>{definition.label}</h2>
        <span>{workflows.length} {workflows.length === 1 ? "instance" : "instances"}</span>
      </div>
      {definition.directStart ? <button className="workflow-start-action" type="button" onClick={() => { setError(""); setStarting(value => !value); }}>
        + {definition.startLabel}
      </button> : workflowType === "work-intake-routing" ? <button className="workflow-start-action" type="button" onClick={onStartWorkIntake}>
        + Help Me Route New Work
      </button> : null}
    </header>
    {starting ? <form className="workflow-start-form" aria-label={`Start ${definition.label}`} onSubmit={event => void submit(event)}>
      <label>Workflow title<input autoFocus maxLength={200} required value={title} onChange={event => setTitle(event.target.value)} /></label>
      {error ? <p role="alert">{error}</p> : null}
      <div className="workflow-start-form-actions">
        <button className="apply-button" type="submit" disabled={busy || !title.trim()}>{busy ? "Starting…" : `Start ${definition.label}`}</button>
        <button type="button" onClick={() => { setStarting(false); setError(""); }} disabled={busy}>Cancel</button>
      </div>
    </form> : null}
    {workflows.length ? <ul className="workflow-instance-list" aria-label={`${definition.label} instances`}>
      {workflows.map(workflow => {
        const isCompleted = completed(workflow);
        const workspaceLabel = workflow.currentWorkspace.replaceAll("-", " ");
        return <li key={workflow.workflowId} className={`workflow-instance-item${isCompleted ? " is-completed" : ""}`}>
          <button type="button" className={`workflow-instance-row${selectedWorkflowId === workflow.workflowId ? " is-selected" : ""}`}
            aria-label={`Open ${workflow.title} (${workflow.workflowId.slice(0, 8)})`}
            onClick={() => onOpenWorkflow(workflow.workflowId)}>
            <span className="workflow-instance-main"><strong>{workflow.title}</strong><span>{workspaceLabel}</span></span>
            <span className={`workflow-instance-status${isCompleted ? " is-completed" : ""}`}>{isCompleted ? "Completed" : workflow.workflowState.replaceAll("_", " ")}</span>
            <span className="workflow-instance-open">Open</span>
          </button>
        </li>;
      })}
    </ul> : <p className="workflow-type-empty">No {definition.label.toLowerCase()} instances yet.</p>}
  </section>;
}

export function WorkflowHubWorkspace({
  onOpenWorkflow,
  onStartWorkflow,
  onStartWorkIntake,
  onOpenSourceControl,
  projectName,
  sourceControlAvailable,
  inventory,
  selectedWorkflowId,
  loading,
  error,
  workspace,
}: {
  onOpenWorkflow: (workflowId: string) => void;
  onStartWorkflow: (request: DirectWorkflowStartRequest) => Promise<void>;
  onStartWorkIntake: () => void;
  onOpenSourceControl: () => void;
  projectName: string;
  sourceControlAvailable: boolean;
  inventory: WorkflowInventory | null;
  selectedWorkflowId: string | null;
  loading: boolean;
  error: string;
  workspace: WorkspaceSelection;
}): JSX.Element {
  if (!workspace.ok) {
    return <section className="workflow-hub-empty" aria-labelledby="workspace-heading">
      <div><p>Project</p><h1 id="workspace-heading">Select a project</h1><span>Select a project to start work.</span></div>
    </section>;
  }

  const groups = new Map((inventory?.groups ?? []).map(group => [group.workflowType, group.workflows]));
  const projectCreationInstances = groups.get("project-creation") ?? [];
  return <section className="workflow-hub-workspace" aria-labelledby="workspace-heading">
    <header className="workflow-hub-header">
      <div><h1 id="workspace-heading">Workflows</h1>
        <p>{sourceControlAvailable ? `Independent work on ${projectName}. Source Control shows shared repository state.` : `Independent work on ${projectName}.`}</p></div>
      {sourceControlAvailable ? <button className="workflow-source-control-action" type="button" onClick={onOpenSourceControl}>
        <GitBranch size={17} aria-hidden="true" /> Source Control
      </button> : null}
    </header>
    {error ? <p className="workflow-hub-error" role="alert">{error}</p> : null}
    {loading && !inventory ? <p role="status">Loading Workflows…</p> : <div className="workflow-inventory" aria-label="Workflow instances">
      {directTypes.map(definition => <TypeGroup key={definition.workflowType} workflowType={definition.workflowType}
        workflows={groups.get(definition.workflowType) ?? []} selectedWorkflowId={selectedWorkflowId}
        onOpenWorkflow={onOpenWorkflow} onStartWorkflow={onStartWorkflow} onStartWorkIntake={onStartWorkIntake} />)}
      <TypeGroup workflowType={workIntakeType.workflowType} workflows={groups.get(workIntakeType.workflowType) ?? []}
        selectedWorkflowId={selectedWorkflowId} onOpenWorkflow={onOpenWorkflow}
        onStartWorkflow={onStartWorkflow} onStartWorkIntake={onStartWorkIntake} />
      {projectCreationInstances.length ? <section className="workflow-type-group workflow-project-creation-group" aria-labelledby="workflow-group-project-creation">
        <header className="workflow-type-header"><div><h2 id="workflow-group-project-creation">{projectCreationType.label}</h2>
          <span>{projectCreationInstances.length} {projectCreationInstances.length === 1 ? "instance" : "instances"}</span></div></header>
        <ul className="workflow-instance-list" aria-label="Project Creation instances">
          {projectCreationInstances.map(workflow => <li key={workflow.workflowId} className={`workflow-instance-item${completed(workflow) ? " is-completed" : ""}`}>
            <button type="button" className="workflow-instance-row" aria-label={`Open ${workflow.title} (${workflow.workflowId.slice(0, 8)})`}
              onClick={() => onOpenWorkflow(workflow.workflowId)}>
              <span className="workflow-instance-main"><strong>{workflow.title}</strong><span>{workflow.currentWorkspace.replaceAll("-", " ")}</span></span>
              <span className="workflow-instance-status">{completed(workflow) ? "Completed" : workflow.workflowState.replaceAll("_", " ")}</span>
              <span className="workflow-instance-open">Open</span>
            </button>
          </li>)}
        </ul>
      </section> : null}
    </div>}
  </section>;
}
