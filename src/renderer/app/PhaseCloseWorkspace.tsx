import {useEffect,useRef,useState,type ReactNode} from "react";
import {PhaseCloseShell} from "./PhaseCloseShell";
import type {CloseAdvanceProjection} from "../../shared/closeAdvanceContracts";
import type {CloseoutReviewProjection} from "../../shared/projectState/closeoutReviewContracts";

/** Phase Close presents reviewed completion; Close/Do Not Close is reviewed at Phase Validation. */
export function PhaseCloseWorkspace(props:{workflowId:string;phaseId:string;navigation?:ReactNode;onValidation:()=>void;onNext:(next:CloseAdvanceProjection["next"])=>void}):JSX.Element {
 const [view,setView]=useState<(CloseAdvanceProjection & {requestPhaseId:string})|null>(null),[review,setReview]=useState<CloseoutReviewProjection|null>(null),[selectedId,setSelectedId]=useState<string|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 const generation=useRef(0);
 async function load(token=generation.current){const next=await window.champcity.getCloseAdvance(props.workflowId,"phase",props.phaseId),candidate=await window.champcity.getCloseoutReview(props.workflowId,"phase",next.entityId);if(token!==generation.current)return;setView({...next,requestPhaseId:props.phaseId});setReview(candidate);setSelectedId(candidate?.cycleId??null);}
 useEffect(()=>{const token=++generation.current;setView(null);setReview(null);setSelectedId(null);setError("");setBusy(false);void load(token).catch(reason=>{if(token===generation.current)setError(String(reason));});return()=>{generation.current++;};},[props.workflowId,props.phaseId]);
 async function refresh(){const token=generation.current;setBusy(true);setError("");try{await load(token);}catch(reason){if(token===generation.current)setError(String(reason));}finally{if(token===generation.current)setBusy(false);}}
 const exact=view?.workflowId===props.workflowId&&view.requestPhaseId===props.phaseId;
 const currentReview=exact&&review?.workflowId===props.workflowId&&review.targetEntityId===view.entityId?review:null;
 const completed=exact&&view.closed&&currentReview?.closed&&currentReview.current&&currentReview.disposition.state==="approved"&&currentReview.closureDecision==="Close";
 const selectedDocument=currentReview&&selectedId===currentReview.cycleId?currentReview.document:null;
 return <PhaseCloseShell navigation={props.navigation} documentStep="phase-close"
  presentation={{currentRequiredWorkflowStep:"Phase Close",currentTarget:"Current phase "+props.phaseId,eligibility:completed?"Phase Close complete":view?.blockers.join("; ")||"Reviewed current Phase Closeout required",requiredAction:completed?"No Phase Validation mutation required":"Return to Phase Validation for Closeout review",expectedOutput:"Phase Close completion presentation for "+props.phaseId,expectedNextState:exact?view.next.label:"Waiting for current SQL evidence",actionContext:"Phase Validation — "+props.phaseId,actionPath:"phase / validation / "+props.phaseId}}
  inputs={{closureDecision:currentReview?.closureDecision??"DoNotClose",rationale:currentReview?.rationale??"",status:selectedDocument?.effectiveDisposition??"Pending"}} onChange={()=>{}} showCreate={false} showReview={false} canCreate={false} canReview={false} onCreateCloseout={()=>{}} onApplyDisposition={()=>{}}
  selectedDocument={selectedDocument} selectedDocumentId={selectedId} onSelectDocument={setSelectedId} workspaceGroups={currentReview?[{group:"Phase Closeout",documents:[currentReview.document]}]:[]} emptyMessage="No documents in this workflow step." feedback="" documentError={error||(currentReview&&!currentReview.current?"Closeout evidence changed. Return to Phase Validation.":"")}
  contextualActions={<><button disabled={busy} onClick={()=>void refresh()} type="button">Refresh</button><button disabled={busy||!exact||view.closed} onClick={props.onValidation} type="button">Return to Phase Validation</button><button disabled={busy||!completed} onClick={()=>{if(completed&&view)props.onNext(view.next);}} type="button">Continue to {exact?view.next.label:"next Phase or Project Validation"}</button></>}/ >;
}
