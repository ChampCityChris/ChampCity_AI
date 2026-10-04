import {useEffect,useRef,useState,type ReactNode} from "react";
import {ProjectCloseShell,type ProjectCloseShellProps} from "./ProjectCloseShell";
import type {CloseAdvanceProjection} from "../../shared/closeAdvanceContracts";
import type {CloseoutReviewProjection} from "../../shared/projectState/closeoutReviewContracts";

/** Greenfield adapter; Create proposes a candidate, disposition alone authorizes Close. */
export function ProjectCloseWorkspace(props:{readOnly?:boolean;workflowId:string;navigation?:ReactNode;onNext:()=>void}):JSX.Element {
 const [view,setView]=useState<CloseAdvanceProjection|null>(null),[review,setReview]=useState<CloseoutReviewProjection|null>(null);
 const [inputs,setInputs]=useState<ProjectCloseShellProps["inputs"]>({closureDecision:"Close",rationale:"",status:"Approved"});
 const [selectedId,setSelectedId]=useState<string|null>(null),[error,setError]=useState(""),[feedback,setFeedback]=useState(""),[busy,setBusy]=useState(false);
 const generation=useRef(0);
 async function load(token=generation.current){
  const next=await window.champcity.getCloseAdvance(props.workflowId,"workflow",props.workflowId);
  const candidate=await window.champcity.getCloseoutReview(props.workflowId,"project",props.workflowId);
  if(token!==generation.current)return;
  setView(next);setReview(candidate);setSelectedId(candidate?.cycleId??null);
 }
 useEffect(()=>{const token=++generation.current;setView(null);setReview(null);setSelectedId(null);setInputs({closureDecision:"Close",rationale:"",status:"Approved"});setError("");setFeedback("");setBusy(false);
  void load(token).catch(reason=>{if(token===generation.current)setError(String(reason));});return()=>{generation.current++;};},[props.workflowId]);
 async function run(action:()=>Promise<unknown>,message:string){const token=generation.current;setBusy(true);setError("");setFeedback("");try{await action();await load(token);if(token===generation.current)setFeedback(message);}catch(reason){if(token===generation.current)setError(String(reason));}finally{if(token===generation.current)setBusy(false);}}
 const exact=view?.workflowId===props.workflowId;
 const selectedDocument=review?.workflowId===props.workflowId&&selectedId===review.cycleId?review.document:null;
 const mutate=(work:()=>Promise<unknown>,message:string)=>{if(!props.readOnly)void run(work,message);};
 const canCreate=!props.readOnly&&exact&&!!view?.eligible&&!busy&&!!inputs.rationale.trim();
 const canReview=!props.readOnly&&exact&&!!review?.current&&!review.closed&&!busy&&inputs.status!=="Pending"&&(inputs.status!=="RevisionRequested"||!!inputs.rationale.trim());
 return <ProjectCloseShell navigation={props.navigation} inputs={inputs} onChange={setInputs} documentStep="project-close"
  presentation={{currentRequiredWorkflowStep:"Project Close",currentTarget:"Project "+props.workflowId,eligibility:view?.closed?"Project Creation closed":view?.eligible?"Current Project evidence permits a Closeout candidate":view?.blockers.join("; ")||"Loading current SQL evidence",requiredAction:view?.closed?"Return to Workflows":review?.current?"Review the current Project Closeout":"Resolve required Project evidence and create the current Closeout",expectedOutput:"Reviewed Project Closeout",expectedNextState:"Return to Workflows after reviewed Close",actionContext:"Current Project Closeout",actionPath:"project / close / "+props.workflowId}}
  canCreate={canCreate} canReview={canReview} selectedDocument={selectedDocument} selectedDocumentId={selectedId} onSelectDocument={setSelectedId}
  workspaceGroups={review?[{group:"Project Closeout",documents:[review.document]}]:[]} emptyMessage="No documents in this workflow step." feedback={feedback} documentError={error||review&&!review.current?error||"Closeout evidence changed. Create a revised candidate before review.":""}
  onCreateCloseout={()=>{if(canCreate&&view)mutate(()=>window.champcity.saveCloseoutCandidate({workflowId:props.workflowId,targetEntityId:props.workflowId,scope:"project",expectedTargetVersion:view.expectedVersion,...(review?{expectedRecordVersion:review.recordVersion}:{}),closureDecision:inputs.closureDecision,rationale:inputs.rationale}),"Project Closeout candidate created for review.");}}
  onApplyDisposition={()=>{if(canReview&&review)mutate(()=>window.champcity.recordCloseoutReview(props.workflowId,review.cycleId,{expectedRecordVersion:review.recordVersion,outcome:inputs.status==="Approved"?"approved":inputs.status==="RevisionRequested"?"revision_requested":"rejected",notes:inputs.rationale}),"Project Closeout disposition recorded.");}}
  evidenceActions={view?.criteria.map(criterion=><div key={criterion.id}><p>{criterion.statement} — {criterion.satisfied?"Satisfied":"Required"}</p>{!criterion.satisfied&&["operator_decision","visual_human","deferred_visual_phase"].includes(criterion.policy)?<button disabled={props.readOnly||busy||!exact||!inputs.rationale.trim()} onClick={()=>mutate(()=>window.champcity.recordProjectCriterion({workflowId:props.workflowId,criterionId:criterion.id,expectedCriterionVersion:criterion.recordVersion,expectedWorkflowVersion:view.expectedVersion,outcome:criterion.policy==="operator_decision"?"approved":"pass",rationale:inputs.rationale}),"Project Criterion evidence recorded.")} type="button">Record explicit {criterion.policy==="operator_decision"?"Operator approval":"visual pass"}</button>:null}</div>)}
  contextualActions={<div><button disabled={busy} onClick={()=>void run(async()=>{},"Current SQL evidence refreshed.")} type="button">Refresh</button>
   {selectedDocument?<button disabled={busy} onClick={()=>void run(()=>window.champcity.exportMarkdownDocument({suggestedFilename:selectedDocument.displayFilename,markdown:selectedDocument.bodyMarkdown}),"Markdown export completed.")} type="button">Export Markdown…</button>:null}
   {view?.sourceMode==="source-backed"&&view.blockers.includes("project-integration-required-before-closeout")?<button disabled={props.readOnly||busy||!exact||view.blockers.some(blocker=>blocker!=="project-integration-required-before-closeout")} onClick={()=>mutate(async()=>{if(!view.advanceReady)await window.champcity.completeWorkflowExecution(props.workflowId,view.expectedVersion);const result=await window.champcity.integrateWorkflow(props.workflowId);if(result.candidate.status!=="integrated")throw Error("Exact integration requires attention before Project Closeout.");},"Source integration complete. Review Project Closeout next.")} type="button">Complete source integration</button>:null}
   <button disabled={props.readOnly||!exact||!view?.closed||busy} onClick={props.onNext} type="button">Return to Workflows</button></div>}
 />;
}
