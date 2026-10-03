import {useEffect,useRef,useState} from "react";
import {WorkCardIntakeShell} from "./WorkCardIntakeShell";
import type {WorkflowExecutionProjection} from "../../shared/workflowApplicationContracts";
import type {WorkCardIntakeProjection} from "../../shared/workspaceContracts";

export function workCardIntakeFromSql(view:WorkflowExecutionProjection,workItemId:string){
 const item=view.items.find(entry=>entry.record.id===workItemId),phase=view.plan.phases.find(entry=>entry.phaseId===item?.phaseId);
 if(!item||!phase)throw Error("Exact Phase Work Card required.");
 const body=item.record.body;
 const canPrepare=["planned","ready"].includes(body.workState)&&item.eligibility.blockers.every(blocker=>blocker==="work-item-contract-review-required")&&!view.activeWorkItemIds.some(id=>id!==workItemId&&view.items.some(entry=>entry.record.id===id&&entry.phaseId===phase.phaseId));
 const projection:WorkCardIntakeProjection={phaseId:phase.record.body.phaseKey??phase.phaseId,sourceWorkCardPlanPath:`project-state:${phase.phaseId}`,selectionReason:canPrepare?"Current SQL dependencies permit Work Card Planning.":item.eligibility.blockers.join("; ")||"Current Work Card is not available for planning preparation.",candidate:{candidateId:body.candidateKey??workItemId,order:body.planningOrder??0,title:body.title,purpose:body.objective,dependsOn:item.dependencyIds.map(id=>view.items.find(entry=>entry.record.id===id)?.record.body.candidateKey??id),resolutionStatus:body.planningResolution??"planned",resolutionReason:body.resolutionReason??"",evidencePaths:body.planningEvidence??[],carriedForwardToPhaseId:body.carriedForwardToPhaseId},handoffMarkdownPath:`project-state:${workItemId}:handoff`,formalWorkCardMarkdownPath:`project-state:${workItemId}`};
 return {projection,phaseTitle:phase.record.body.title,canPrepare};
}
export function WorkCardIntakeWorkspace(props:{workflowId:string;workItemId:string;onPrepared:(handoff:string)=>void}):JSX.Element {
 const [view,setView]=useState<WorkflowExecutionProjection|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false),[feedback,setFeedback]=useState("");const generation=useRef(0);
 useEffect(()=>{const token=++generation.current;setView(null);setError("");setBusy(false);setFeedback("");void window.champcity.getWorkflowExecutionProjection(props.workflowId).then(next=>{if(token===generation.current)setView(next);}).catch(reason=>{if(token===generation.current)setError(String(reason));});return()=>{generation.current++;};},[props.workflowId,props.workItemId]);
 let model:ReturnType<typeof workCardIntakeFromSql>|null=null,projectionError="";
 if(view?.workflowId===props.workflowId)try{model=workCardIntakeFromSql(view,props.workItemId);}catch(reason){projectionError=String(reason);}
 return <WorkCardIntakeShell projection={model?.projection??null} phaseTitle={model?.phaseTitle??"Untitled phase"} canPrepare={!!model?.canPrepare&&!busy} isGenerating={busy} actionError={error||projectionError} actionFeedback={feedback}
  onGenerate={()=>{if(!model?.canPrepare||busy)return;const token=generation.current;setBusy(true);setError("");void window.champcity.getStructuredWorkItemPlanning(props.workflowId,props.workItemId).then(next=>{if(token!==generation.current)return;if(next.workflowId!==props.workflowId||next.workItem.id!==props.workItemId)throw Error("Planning handoff identity changed.");setFeedback("Application-generated Work Card Planning handoff prepared from current SQL context.");props.onPrepared(next.handoff);}).catch(reason=>{if(token===generation.current)setError(String(reason));}).finally(()=>{if(token===generation.current)setBusy(false);});}}/>;
}
