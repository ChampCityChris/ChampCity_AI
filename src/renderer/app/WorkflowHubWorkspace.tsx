import { ArrowRight, Code2 } from "lucide-react";

import {
  workflowDefinitions,
  type WorkflowDefinition,
  type WorkflowId,
} from "../../shared/workflowHubContracts";
import type { WorkspaceSelection } from "../../shared/workspaceContracts";

const iconByKey = {
  code: Code2,
} satisfies Record<WorkflowDefinition["iconKey"], typeof Code2>;

export function WorkflowHubWorkspace({
  isEnteringDevelopment,
  onOpenWorkflow,
  projectName,
  workspace,
}: {
  isEnteringDevelopment?: boolean;
  onOpenWorkflow: (workflowId: WorkflowId) => void;
  projectName: string;
  workspace: WorkspaceSelection;
}): JSX.Element {
  if (!workspace.ok) {
    return (
      <section className="workflow-hub-empty" aria-labelledby="workspace-heading">
        <div>
          <p>Project</p>
          <h1 id="workspace-heading">Select a project</h1>
          <span>Select a project before choosing a workflow.</span>
        </div>
      </section>
    );
  }

  return (
    <section className="workflow-hub-workspace" aria-labelledby="workspace-heading">
      <header className="workflow-hub-header">
        <h1 id="workspace-heading">Workflows</h1>
        <p>{`Choose how you want to work with ${projectName}.`}</p>
      </header>
      <div className="workflow-card-grid" aria-label="Available workflows">
        {workflowDefinitions
          .slice()
          .sort((left, right) => left.order - right.order)
          .map((definition) => (
            <WorkflowCard
              definition={definition}
              disabled={isEnteringDevelopment && definition.workflowId === "development"}
              key={definition.workflowId}
              onOpenWorkflow={onOpenWorkflow}
            />
          ))}
      </div>
    </section>
  );
}

function WorkflowCard({
  definition,
  disabled,
  onOpenWorkflow,
}: {
  definition: WorkflowDefinition;
  disabled?: boolean;
  onOpenWorkflow: (workflowId: WorkflowId) => void;
}): JSX.Element {
  const Icon = iconByKey[definition.iconKey];
  return (
    <button
      className="workflow-card"
      disabled={disabled}
      onClick={() => onOpenWorkflow(definition.workflowId)}
      type="button"
    >
      <span className="workflow-card-icon" aria-hidden="true">
        <Icon size={42} strokeWidth={1.7} />
      </span>
      <span className="workflow-card-title">{definition.label}</span>
      <span className="workflow-card-description">{definition.description}</span>
      <span className="workflow-card-tags" aria-label={`${definition.label} workflow capabilities`}>
        {definition.tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </span>
      <span className="workflow-card-action">
        {disabled ? "Opening Development..." : definition.entryLabel}
        <ArrowRight aria-hidden="true" size={18} />
      </span>
    </button>
  );
}
