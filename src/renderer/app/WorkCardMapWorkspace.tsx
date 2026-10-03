import {useEffect,useRef,useState} from "react";
import {WorkCardMapShell,type WorkCardMapShellProjection} from "./WorkCardMapShell";
import type {ChampCityApi} from "../../shared/workspaceContracts";
import type {WorkflowExecutionProjection,PhaseValidationProjection} from "../../shared/workflowApplicationContracts";
type Planning=Awaited<ReturnType<ChampCityApi["getStructuredPhaseLoop"]>>;

/** Translate current SQL projections into the recovered map's display vocabulary. */
export function workCardMapFromSql(planning:Planning,execution:WorkflowExecutionProjection,validation:PhaseValidationProjection):WorkCardMapShellProjection {
 if(planning.workflowId!==execution.workflowId||validation.workflowId!==execution.workflowId||validation.phaseId!==planning.phase.id||planning.stageKind!=="planning")throw Error("Exact Phase map identities required.");
 const approved=planning.review?.disposition.state==="approved"&&!planning.staleReview;
 const items=execution.items.filter(item=>item.phaseId===planning.phase.id).sort((a,b)=>(a.record.body.planningOrder??0)-(b.record.body.planningOrder??0)||a.record.id.localeCompare(b.record.id));
 const active=execution.activeWorkItemIds.filter(id=>items.some(item=>item.record.id===id));
 const candidates=items.map(item=>{
  const record=item.record,isActive=active.includes(record.id),closed=record.body.workState==="closed";
  const eligible=approved&&!closed&&item.eligibility.blockers.every(blocker=>blocker==="work-item-contract-review-required")&&(!active.length||isActive);
  const reason=closed?"Work Card is closed in current SQL state.":eligible?isActive?"Continue the active Work Card.":"Current dependencies permit Work Card Planning.":item.eligibility.blockers.join("; ")||"Another Work Card is active or Phase Planning requires review.";
  return {candidateId:record.id,displayId:record.body.candidateKey??record.id,order:record.body.planningOrder??0,title:record.body.title,purpose:record.body.objective,dependsOn:item.dependencyIds.map(id=>execution.items.find(entry=>entry.record.id===id)?.record.body.candidateKey??id),status:closed?"Complete" as const:eligible?"Eligible" as const:"Ineligible" as const,reason,evidencePaths:record.body.planningEvidence??[],handoffMarkdownPath:`project-state:${record.id}:handoff`,formalWorkCardMarkdownPath:`project-state:${record.id}`,isActive,canBegin:eligible,actionLabel:isActive?"Continue Work Card":"Begin Planning",pendingLabel:isActive?"Continuing...":"Beginning...",formalWorkCardDocument:{displayFilename:record.body.candidateKey??record.id,disposition:"Pending" as const,documentReadState:"readable",bodyMarkdown:[`# Work Card: ${record.body.candidateKey??record.id}`,`## ${record.body.title}`,"### Objective",record.body.objective,"### Plan Conditions",reason,"### Execution boundaries",...(record.body.implementationBoundaries??[])].join("\n")}};
 });
 return {state:!approved?"needs-attention":validation.workItemsClosed?"all-complete":"ready",phaseId:planning.phase.body.phaseKey,sourceWorkCardPlanPath:`project-state:${planning.review?.cycle.id??planning.phase.id}`,phaseValidationWorkspaceId:"phase-validation",reason:planning.staleReview?.reason??(!approved?"Approve the current Phase Planning and Work Card Plan.":validation.workItemsClosed?"All planned Work Cards are complete for this phase.":"Work Card candidates are projected from the current Approved Work Card Plan."),candidates};
}
export function WorkCardMapWorkspace(props:{workflowId:string;phaseId:string;onOpenWorkItem:(workItemId:string)=>void;onOpenPhaseValidation:()=>void}):JSX.Element {
 const [projection,setProjection]=useState<(WorkCardMapShellProjection & {requestKey:string})|null>(null),[error,setError]=useState("");const generation=useRef(0);
 useEffect(()=>{const token=++generation.current;setProjection(null);setError("");void (async()=>{
  const planning=await window.champcity.getStructuredPhaseLoop(props.workflowId,props.phaseId,"planning");
  const [execution,validation]=await Promise.all([window.champcity.getWorkflowExecutionProjection(props.workflowId),window.champcity.getWorkflowPhaseValidation(props.workflowId,planning.phase.id)]);
  const next=workCardMapFromSql(planning,execution,validation);if(token===generation.current)setProjection({...next,requestKey:props.workflowId+":"+props.phaseId});
 })().catch(reason=>{if(token===generation.current)setError(String(reason));});return()=>{generation.current++;};},[props.workflowId,props.phaseId]);
 const current=projection?.requestKey===props.workflowId+":"+props.phaseId?projection:null;
 return <WorkCardMapShell key={props.workflowId+props.phaseId} projection={current} phaseLabel={props.phaseId} actionError={error} actionFeedback="" isBeginningPlanning={false}
  onCopy={markdown=>void navigator.clipboard.writeText(markdown).catch(reason=>setError(String(reason)))} onBeginPlanning={id=>{if(current?.candidates.some(item=>item.candidateId===id&&item.canBegin))props.onOpenWorkItem(id);}} onOpenPhaseValidation={()=>{if(current?.state==="all-complete")props.onOpenPhaseValidation();}}/>;
}
