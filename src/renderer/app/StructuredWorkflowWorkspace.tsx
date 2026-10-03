import type {ReactNode} from "react";
import type {WorkflowInstanceSummary} from "../../shared/workflowApplicationContracts";
import {workflowPlanningSurface} from "./workflowPlanningDispatch";
import {WorkflowIntakeWorkspace} from "./WorkflowIntakeWorkspace";
import {WorkflowExecutionWorkspace} from "./WorkflowExecutionWorkspace";
import {ExactWorkflowPlanningWorkspace} from "./ExactWorkflowPlanningWorkspace";
import {WorkflowInstanceWorkspace} from "./WorkflowInstanceWorkspace";
import {OptionalWorkIntakeWorkspace} from "./OptionalWorkIntakeWorkspace";
import {GreenfieldWorkspace} from "./GreenfieldWorkspace";
export function StructuredWorkflowWorkspace({workflow, repositoryIdentity, browserPanel, onReturn, onOpen, onProgressed}: {
  workflow: WorkflowInstanceSummary; repositoryIdentity: string; browserPanel: ReactNode; onReturn: () => void; onOpen: (id: string) => void; onProgressed: (id: string) => Promise<void>;
}) {
  if (workflow.lifecycleState !== "active") return <WorkflowInstanceWorkspace workflow={workflow} onReturn={onReturn} />;
  if (workflow.workflowType === "work-intake-routing") return <OptionalWorkIntakeWorkspace workflow={workflow} browserPanel={browserPanel} onReturn={onReturn} onRouted={onOpen} />;
  if (workflow.workflowType === "project-creation") return <GreenfieldWorkspace workflow={workflow} repositoryIdentity={repositoryIdentity} browserPanel={browserPanel} onReturn={onReturn} />;
  const reloadCurrentWorkflow = async () => { await onProgressed(workflow.workflowId); };
  switch (workflowPlanningSurface(workflow)) {
    case "intake": return <WorkflowIntakeWorkspace workflow={workflow} onReturn={onReturn} onPrepared={reloadCurrentWorkflow} />;
    case "execution": return <WorkflowExecutionWorkspace workflow={workflow} onReturn={onReturn} browserPanel={browserPanel} onProgressed={reloadCurrentWorkflow} />;
    case "feature": case "issue": case "planning": case "architect": return <ExactWorkflowPlanningWorkspace key={workflow.currentWorkspace} workflow={workflow} onReturn={onReturn} browserPanel={browserPanel} onProgressed={reloadCurrentWorkflow} />;
    default: return <WorkflowInstanceWorkspace workflow={workflow} onReturn={onReturn} />;
  }
}
