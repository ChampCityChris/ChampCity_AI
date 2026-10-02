import {useEffect,useState} from "react";
import type {ReactNode} from "react";
import type {WorkflowInstanceSummary} from "../../shared/workflowApplicationContracts";
import {WorkflowExecutionWorkspace} from "./WorkflowExecutionWorkspace";
/** Greenfield binds its existing SQL Workflow/WorkItem to the shared execution and review adapter. */
export function GreenfieldExecutionWorkspace(props:{workflowId:string;workItemId?:string;browserPanel:ReactNode;onReturn:()=>void}) {
  const [workflow,setWorkflow]=useState<WorkflowInstanceSummary|null>(null),[error,setError]=useState("");
  useEffect(()=>{let active=true;setWorkflow(null);setError("");void window.champcity.getWorkflow(props.workflowId).then(result=>{if(result.workflow.workflowId!==props.workflowId||result.workflow.workflowType!=="project-creation")throw Error("Exact Greenfield Workflow required.");if(active)setWorkflow(result.workflow);}).catch(reason=>{if(active)setError(String(reason));});return()=>{active=false;};},[props.workflowId]);
  return workflow ? <WorkflowExecutionWorkspace key={workflow.workflowId} workflow={workflow} initialWorkItemId={props.workItemId} onReturn={props.onReturn} browserPanel={props.browserPanel} /> : <p role={error?"alert":"status"}>{error||"Loading exact Greenfield SQL execution…"}</p>;
}
