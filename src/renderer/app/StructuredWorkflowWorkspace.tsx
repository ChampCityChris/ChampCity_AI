import type {ReactNode} from "react";
import type {WorkflowInstanceSummary} from "../../shared/workflowApplicationContracts";
import {workflowPlanningSurface} from "./workflowPlanningDispatch";
import {WorkflowIntakeWorkspace} from "./WorkflowIntakeWorkspace";
import {WorkflowExecutionWorkspace} from "./WorkflowExecutionWorkspace";
import {ExactWorkflowPlanningWorkspace} from "./ExactWorkflowPlanningWorkspace";
import {WorkflowInstanceWorkspace} from "./WorkflowInstanceWorkspace";
import {OptionalWorkIntakeWorkspace} from "./OptionalWorkIntakeWorkspace";
import {GreenfieldWorkspace} from "./GreenfieldWorkspace";
export function StructuredWorkflowWorkspace({workflow, repositoryIdentity, browserPanel, onReturn, onOpen}: {
  workflow: WorkflowInstanceSummary; repositoryIdentity: string; browserPanel: ReactNode; onReturn: () => void; onOpen: (id: string) => void;
}) {
  if (workflow.lifecycleState !== "active") return <WorkflowInstanceWorkspace workflow={workflow} onReturn={onReturn} />;
  if (workflow.workflowType === "work-intake-routing") return <OptionalWorkIntakeWorkspace workflow={workflow} browserPanel={browserPanel} onReturn={onReturn} onRouted={onOpen} />;
  if (workflow.workflowType === "project-creation") return <GreenfieldWorkspace workflow={workflow} repositoryIdentity={repositoryIdentity} browserPanel={browserPanel} onReturn={onReturn} />;
  switch (workflowPlanningSurface(workflow)) {
    case "intake": return <WorkflowIntakeWorkspace workflow={workflow} onReturn={onReturn} onPrepared={() => onOpen(workflow.workflowId)} />;
    case "execution": return <WorkflowExecutionWorkspace workflow={workflow} onReturn={onReturn} browserPanel={browserPanel} />;
    case "feature": case "issue": case "planning": case "architect": return <ExactWorkflowPlanningWorkspace workflow={workflow} onReturn={onReturn} browserPanel={browserPanel} />;
    default: return <WorkflowInstanceWorkspace workflow={workflow} onReturn={onReturn} />;
  }
}
