import { ArrowRight, Code2, GitBranch } from "lucide-react";
import type { WorkspaceSelection } from "../../shared/workspaceContracts";

export function WorkflowHubWorkspace({
  onStartWork,
  onOpenSourceControl,
  projectName,
  sourceControlAvailable,
  workspace,
}: {
  onStartWork: () => void;
  onOpenSourceControl: () => void;
  projectName: string;
  sourceControlAvailable: boolean;
  workspace: WorkspaceSelection;
}): JSX.Element {
  if (!workspace.ok) {
    return (
      <section className="workflow-hub-empty" aria-labelledby="workspace-heading">
        <div>
          <p>Project</p>
          <h1 id="workspace-heading">Select a project</h1>
          <span>Select a project to start work.</span>
        </div>
      </section>
    );
  }

  return (
    <section className="workflow-hub-workspace" aria-labelledby="workspace-heading">
      <header className="workflow-hub-header">
        <h1 id="workspace-heading">Workflows</h1>
        <p>{sourceControlAvailable ? `Start new work on ${projectName} or inspect its Source Control.` : `Start new work on ${projectName}.`}</p>
      </header>
      <div className="workflow-card-grid" aria-label="Start work">
        <button className="workflow-card" type="button" onClick={onStartWork}>
          <span className="workflow-card-icon" aria-hidden="true"><Code2 size={42} strokeWidth={1.7} /></span>
          <span className="workflow-card-title">Start Work</span>
          <span className="workflow-card-description">Describe the change or problem. Review the recommended route, approve its Plan, and carry the work through implementation and integration.</span>
          <span className="workflow-card-action">Open Work Intake <ArrowRight aria-hidden="true" size={18} /></span>
        </button>
        {sourceControlAvailable ? <button className="workflow-card" type="button" onClick={onOpenSourceControl}>
          <span className="workflow-card-icon" aria-hidden="true"><GitBranch size={42} strokeWidth={1.7} /></span>
          <span className="workflow-card-title">Source Control</span>
          <span className="workflow-card-description">See how Work Intake lines, hotfixes, and integration targets relate to the repository history.</span>
          <span className="workflow-card-action">View source graph <ArrowRight aria-hidden="true" size={18} /></span>
        </button> : null}
      </div>
    </section>
  );
}
