import { GitBranch } from "lucide-react";
import type { WorkflowInventory } from "../../shared/workflowApplicationContracts";
import { WORKFLOW_TYPE_REGISTRY, type WorkflowType } from "../../shared/projectState/workflowTypeRegistry";
import type { WorkspaceSelection } from "../../shared/workspaceContracts";

const hubTypes = Object.values(WORKFLOW_TYPE_REGISTRY).sort((left, right) => left.hubOrder - right.hubOrder);

export function WorkflowHubWorkspace({
  onSelectType,
  onOpenGreenfield,
  onOpenSourceControl,
  projectName,
  sourceControlAvailable,
  inventory,
  loading,
  error,
  workspace,
}: {
  onSelectType: (workflowType: WorkflowType) => void;
  onOpenGreenfield: (workflowId: string) => void;
  onOpenSourceControl: () => void;
  projectName: string;
  sourceControlAvailable: boolean;
  inventory: WorkflowInventory | null;
  loading: boolean;
  error: string;
  workspace: WorkspaceSelection;
}): JSX.Element {
  if (!workspace.ok) {
    return <section className="workflow-hub-empty" aria-labelledby="workspace-heading">
      <div><p>Project</p><h1 id="workspace-heading">Select a project</h1><span>Select a project to start work.</span></div>
    </section>;
  }

  const greenfield = inventory?.groups.find(group => group.workflowType === "project-creation")?.workflows[0];
  const inventoryReady = inventory !== null;
  return <section className="workflow-hub-workspace" aria-labelledby="workspace-heading">
    <header className="workflow-hub-header">
      <div><h1 id="workspace-heading">Workflows</h1>
        <p>{sourceControlAvailable ? `Independent work on ${projectName}. Source Control shows shared repository state.` : `Independent work on ${projectName}.`}</p></div>
      {sourceControlAvailable ? <button className="workflow-source-control-action" type="button" onClick={onOpenSourceControl}>
        <GitBranch size={17} aria-hidden="true" /> Source Control
      </button> : null}
    </header>
    {error ? <p className="workflow-hub-error" role="alert">{error}</p> : null}
    {loading && !inventoryReady ? <p role="status">Loading Workflows…</p> : null}
    <div className="workflow-launcher-grid" aria-label="Workflow types">
      {hubTypes.map(definition => {
        const isGreenfield = definition.workflowType === "project-creation";
        const disabled = isGreenfield && (!inventoryReady || !greenfield);
        const status = isGreenfield
          ? !inventoryReady ? "Checking project history…" : greenfield
            ? greenfield.lifecycleState === "closed" || greenfield.lifecycleState === "archived" || greenfield.workflowState === "closed" ? "Completed" : "In progress"
            : "Not applicable to this existing or migrated project"
          : "Available";
        return <section key={definition.workflowType} className={`workflow-launcher-card${disabled ? " is-disabled" : ""}`} aria-labelledby={`workflow-card-${definition.workflowType}`}>
          <h2 id={`workflow-card-${definition.workflowType}`}>{definition.label}</h2>
          <p>{definition.purpose}</p>
          <span className="workflow-launcher-status">{status}</span>
          {disabled ? <span className="workflow-launcher-disabled-action">Unavailable</span> : <button type="button" onClick={() => isGreenfield
            ? onOpenGreenfield(greenfield!.workflowId)
            : onSelectType(definition.workflowType)}>
            {isGreenfield ? "View Greenfield Project" : `Open ${definition.label}`}
          </button>}
        </section>;
      })}
    </div>
  </section>;
}
