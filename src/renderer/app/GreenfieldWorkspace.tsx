import {workflowSidebarContextFromSql, type WorkflowSidebarContext} from "./workflowSidebarContext";
import type {WorkflowContextAction} from "./figma/FigmaSidebar";
import {useEffect,useRef,useState,type ReactNode} from "react";
import type {ProjectIntakeSubmission,WorkspaceId,ProjectLifecycleRailStatus} from "../../shared/workspaceContracts";
import type {GreenfieldNavigationProjection,GreenfieldStage} from "../../shared/greenfieldNavigationContracts";
import type {WorkflowInstanceSummary} from "../../shared/workflowApplicationContracts";
import {GreenfieldNestedWorkflowRail} from "./GreenfieldNestedWorkflowRail";
import {composeGreenfieldStage,type GreenfieldShellSelection} from "./GreenfieldStageComposition";
const emptyIntake:ProjectIntakeSubmission={projectName:"",projectPurpose:"",desiredOutcome:"",projectType:"Desktop application",projectRepository:"",hasExistingSourceOrPlanning:false,knownConstraints:"",repositoryReviewContext:""};
const selectionFromSql=(value:GreenfieldNavigationProjection):GreenfieldShellSelection=>({stage:value.currentWorkspace,phaseId:value.currentPhaseId,workItemId:value.currentWorkItemId,repairId:value.currentRepairId});
function isCanonicalSelection(selection:GreenfieldShellSelection,navigation:GreenfieldNavigationProjection):boolean {
 if(selection.stage!==navigation.currentWorkspace)return false;
 const workStage=selection.stage.startsWith("work-card-");
 if((workStage||selection.stage.startsWith("phase-"))&&selection.phaseId!==navigation.currentPhaseId)return false;
 if(workStage&&selection.workItemId!==navigation.currentWorkItemId)return false;
 return selection.stage!=="work-card-repair"||selection.repairId===navigation.currentRepairId;
}
/** Presentation inspection is ephemeral; resume always reads the sole SQL navigation resolver. */
export function GreenfieldWorkspace({workflow,repositoryIdentity,browserPanel,onReturn,onWorkflowContextAction,onWorkflowSidebarContext}:{workflow:WorkflowInstanceSummary;repositoryIdentity:string;browserPanel:ReactNode;onReturn:()=>void;onWorkflowContextAction?:(action:WorkflowContextAction|null)=>void;onWorkflowSidebarContext?:(context:WorkflowSidebarContext|null)=>void}):JSX.Element {
 const [navigation,setNavigation]=useState<GreenfieldNavigationProjection|null>(null),[selection,setSelection]=useState<GreenfieldShellSelection>({stage:"project-intake-capture",phaseId:null,workItemId:null,repairId:null}),[error,setError]=useState(""),[intake,setIntake]=useState({...emptyIntake,projectRepository:repositoryIdentity});
 const generation=useRef(0);
 async function refresh():Promise<GreenfieldNavigationProjection|null>{const token=++generation.current;const current=await window.champcity.getGreenfieldNavigation(workflow.workflowId);if(token!==generation.current)return null;if(current.workflowId!==workflow.workflowId)throw Error("Exact Greenfield Workflow identity changed.");setNavigation(current);setSelection(selectionFromSql(current));setError("");return current;}
 const resume=async()=>{await refresh().catch(reason=>setError(String(reason)));};
 useEffect(()=>{setNavigation(null);setSelection({stage:"project-intake-capture",phaseId:null,workItemId:null,repairId:null});setError("");resume();return()=>{generation.current++;};},[workflow.workflowId]);
 function open(stage:GreenfieldStage,workItemId?:string){
  if(!navigation)return;
  if(stage===navigation.currentWorkspace&&(workItemId===undefined||workItemId===navigation.currentWorkItemId)){
   return resume();
  }
  const workStage=stage.startsWith("work-card-"),phaseStage=stage.startsWith("phase-");
  // Retain inspected Work Card context only for another Work Card surface.
  const requestedWorkItemId=workItemId??(workStage?selection.workItemId:undefined);
  const work=requestedWorkItemId?navigation.workItemStates.find(item=>item.workItemId===requestedWorkItemId):null;
  if(requestedWorkItemId&&!work){setError("Select an exact SQL Work Card from this Workflow.");return;}
  const next:GreenfieldShellSelection={stage,phaseId:workStage||phaseStage?work?.phaseId??selection.phaseId??navigation.currentPhaseId:null,workItemId:workStage?work?.workItemId??null:null,repairId:workStage&&work?.parentWorkItemId?work.workItemId:null};
  setSelection({...next,inspection:isCanonicalSelection(next,navigation)?false:inspection||undefined});setError("");
 }
 async function terminal(stage:"work-card-close"|"phase-close"|"project-close"){const previous=selection,current=await refresh();if(!current)return;const closed=stage==="project-close"?current.closed:stage==="phase-close"?current.phaseStates.some(phase=>phase.phaseId===previous.phaseId&&phase.state==="closed"):current.workItemStates.some(item=>item.workItemId===previous.workItemId&&item.state==="closed");if(!closed)throw Error("Terminal presentation requires exact SQL closed state.");setSelection({...previous,stage});}
 const canonical=navigation&&isCanonicalSelection(selection,navigation);
 const alternate=navigation&&selection.stage==="work-card-validation"&&navigation.currentWorkspace==="work-card-report-review"&&selection.workItemId===navigation.currentWorkItemId;
 const selectedCandidate=navigation&&navigation.currentWorkspace==="phase-work-card-selection"&&selection.phaseId===navigation.currentPhaseId&&["work-card-intake","work-card-planning"].includes(selection.stage)&&navigation.workItemStates.some(item=>item.workItemId===selection.workItemId&&item.planningEligible);
 const inspection=!!navigation&&(!!selection.inspection||!canonical&&!alternate&&!selectedCandidate);
 // Sidebar chrome is ephemeral and is cleared on selection, Workflow change and unmount.
 useEffect(()=>{
  onWorkflowContextAction?.(navigation?.workflowId===workflow.workflowId&&inspection?{workflowId:workflow.workflowId,label:"Resume current stage",onClick:resume}:null);
  return()=>onWorkflowContextAction?.(null);
 },[navigation,selection,onWorkflowContextAction,workflow.workflowId]);
 useEffect(()=>{
  onWorkflowSidebarContext?.(navigation?.workflowId===workflow.workflowId?workflowSidebarContextFromSql(navigation):null);
  return()=>onWorkflowSidebarContext?.(null);
 },[navigation,onWorkflowSidebarContext,workflow.workflowId]);
 const status:Partial<Record<WorkspaceId,ProjectLifecycleRailStatus>>=Object.fromEntries((navigation?.completedWorkspaces??[]).map(stage=>[stage,"Completed"]));
 const context=navigation?{phase:{...navigation.executionContext.phase,phaseId:selection.phaseId??undefined,state:selection.phaseId?"active" as const:"none" as const,title:navigation.phaseStates.find(phase=>phase.phaseId===selection.phaseId)?.title},workCard:{...navigation.executionContext.workCard,workCardId:selection.workItemId??undefined,state:selection.workItemId?"active" as const:"none" as const,title:navigation.workItemStates.find(item=>item.workItemId===selection.workItemId)?.title}}:undefined;
 const lifecycleContext=selection.stage.startsWith("phase-")||selection.stage.startsWith("work-card-");
 const contextWorkItems=navigation?.workItemStates.filter(item=>item.phaseId===selection.phaseId)??[];
 const showPhases=lifecycleContext&&((navigation?.phaseStates.length??0)>1||!selection.phaseId&&(navigation?.phaseStates.length??0)>0);
 const showWorkItems=lifecycleContext&&(contextWorkItems.length>1||!selection.workItemId&&contextWorkItems.length>0);
 const content=composeGreenfieldStage({readOnly:inspection,workflowId:workflow.workflowId,selection,repositoryIdentity,browserPanel,intake,onIntakeChange:setIntake,resume:async()=>{if(!inspection)await resume();},open,terminal:stage=>!inspection&&void terminal(stage).catch(reason=>setError(String(reason))),repair:()=>{if(!inspection)void resume();},onReturn,onRepositoryChange:()=>setError("Use Change Project to select a different repository.")});
 return <section className="greenfield-workspace" aria-label="Greenfield Workflow"><header className="greenfield-workspace-header"><h1 id="workspace-heading">{workflow.title}</h1></header>
 {navigation?<><GreenfieldNestedWorkflowRail activeWorkspaceId={selection.stage} requiredWorkspaceId={navigation.closed?null:navigation.currentWorkspace} executionContext={context} projectRailStatuses={status} projectIntakeStatus={navigation.completedWorkspaces.includes("project-intake-capture")?"Completed":"Open"} onWorkspaceChange={stage=>open(stage as GreenfieldStage)}/>
 {(showPhases||showWorkItems)?<div className="greenfield-inspection-controls">
 {showPhases?<label>Inspect Phase<select aria-label="Inspect Phase" value={selection.phaseId??""} onChange={event=>setSelection({inspection:true,stage:"phase-interview",phaseId:event.target.value,workItemId:null,repairId:null})}>{!selection.phaseId?<option value="" disabled>Select Phase</option>:null}{navigation.phaseStates.map(phase=><option key={phase.phaseId} value={phase.phaseId}>{phase.title} · {phase.state}</option>)}</select></label>:null}
 {showWorkItems?<label>Inspect Work Card<select aria-label="Inspect Work Card" value={selection.workItemId??""} onChange={event=>{const item=contextWorkItems.find(item=>item.workItemId===event.target.value);if(item)setSelection({inspection:true,stage:item.state==="closed"?"work-card-close":item.parentWorkItemId?"work-card-repair":"work-card-planning",phaseId:item.phaseId,workItemId:item.workItemId,repairId:item.parentWorkItemId?item.workItemId:null});}}>{!selection.workItemId?<option value="" disabled>Select Work Card</option>:null}{contextWorkItems.map(item=><option key={item.workItemId} value={item.workItemId}>{item.title} · {item.state}</option>)}</select></label>:null}
 </div>:null}
 <p className="greenfield-navigation-reason" role="status">{inspection?"Read-only workspace inspection. Resume current stage to continue. ":""}{navigation.reason}{navigation.blockers.length?" · "+navigation.blockers.join("; "):""}</p></>:null}
 {error?<p role="alert">{error}</p>:null}
 <div className="greenfield-shell-host" data-inspection={inspection} key={workflow.workflowId+":"+selection.stage+":"+selection.phaseId+":"+selection.workItemId}><div className="greenfield-shell-content">{navigation?content:<p role="status">Loading current SQL stage…</p>}</div></div>
 </section>;
}
