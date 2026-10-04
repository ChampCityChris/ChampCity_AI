import {reloadArchitectBrowserWithRecovery} from "./architectBrowserRecovery";
import {useEffect,useRef,useState,type ReactNode} from "react";
import {WorkCardPlanningShell,WorkCardPlanningBrowserActions} from "./WorkCardPlanningShell";
import {FigmaDocumentDispositionPanel} from "./FigmaDocumentDispositionPanel";
import type {ChampCityApi} from "../../shared/workspaceContracts";
import type {PlanningDocumentDetail} from "../../shared/documents/planningDocument";
import type {DocumentDispositionStatus} from "../../shared/documents/documentDisposition";
type Model=Awaited<ReturnType<ChampCityApi["getStructuredWorkItemPlanning"]>>;

export function WorkCardPlanningWorkspace(props:{workflowId:string;workItemId:string;browserPanel:ReactNode;browserVisible?:boolean;onNext:()=>void}):JSX.Element {
 const [model,setModel]=useState<Model|null>(null),[error,setError]=useState(""),[notes,setNotes]=useState(""),[status,setStatus]=useState<DocumentDispositionStatus|"">(""),[busy,setBusy]=useState(false),[feedback,setFeedback]=useState("");
 const generation=useRef(0);
 const exact=model?.workflowId===props.workflowId&&model.workItem.id===props.workItemId&&model.workflowType==="project-creation";
 function accept(next:Model,token:number){if(token!==generation.current)return;setModel(next);if(next.workItem.recordVersion!==model?.workItem.recordVersion||next.workItem.id!==model?.workItem.id)setStatus("");}
 useEffect(()=>{const token=++generation.current;setModel(null);setError("");setNotes("");setStatus("");setBusy(false);setFeedback("");void window.champcity.getStructuredWorkItemPlanning(props.workflowId,props.workItemId).then(next=>accept(next,token)).catch(reason=>{if(token===generation.current)setError(String(reason));});return()=>{generation.current++;};},[props.workflowId,props.workItemId]);
 async function action(work:(token:number)=>Promise<void>){const token=generation.current;setBusy(true);setError("");try{await work(token);}catch(reason){if(token===generation.current)setError(String(reason));}finally{if(token===generation.current)setBusy(false);}}
 const refresh=()=>void action(async token=>accept(await window.champcity.getStructuredWorkItemPlanning(props.workflowId,props.workItemId),token));
 const document:PlanningDocumentDetail|null=exact?{logicalDocumentId:model.workItem.id,markdownPath:`project-state:${model.workItem.id}`,displayFilename:`${model.workItem.body.candidateKey??model.workItem.id}_FORMAL_WORK_CARD.md`,metadata:{artifactType:"generated-formal-work-card",artifactRevision:model.workItem.body.contractRevision??model.workItem.recordVersion},effectiveDisposition:({approved:"Approved",rejected:"Rejected",revision_requested:"RevisionRequested"} as const)[model.review.disposition.state as "approved"]??"Pending",documentReadState:"readable",initializationNeeded:false,bodyMarkdown:model.markdown,preview:model.markdown,previewTruncated:false}:null;
 const hasReview=exact&&!!model.workItem.body.contractRevision&&["planned","ready"].includes(model.workItem.body.workState);
 const canReview=hasReview&&!busy&&!error&&!!status&&(status!=="RevisionRequested"||!!notes.trim());
 return <WorkCardPlanningShell label={`Work Card Planning ${exact?model.workItem.body.candidateKey??model.workItem.id:props.workItemId} Figma document workspace`} browserVisible={props.browserVisible??true}
  document={{selectedDocument:document,documentError:error,feedback,onCopy:()=>void action(async()=>{await navigator.clipboard.writeText(document?.bodyMarkdown??"");}),onExport:request=>void action(async()=>{await window.champcity.exportMarkdownDocument(request);})}}
  reviewControls={<FigmaDocumentDispositionPanel currentDocument={document?.displayFilename} effectiveDisposition={document?.effectiveDisposition} workflowStep="Review & Validation" isApplying={busy||!hasReview} canApply={canReview} notes={notes} onNotesChange={setNotes} status={status} onStatusChange={setStatus}
   onApply={()=>{if(canReview)void action(async token=>{accept(await window.champcity.reviewStructuredWorkItemPlanning(props.workflowId,props.workItemId,{expectedRecordVersion:model!.workItem.recordVersion,outcome:status==="Approved"?"approved":status==="RevisionRequested"?"revision_requested":"rejected",notes}),token);if(token===generation.current){setStatus("");setFeedback("Work Card Planning review recorded.");}});}} />}
  browserCompanion={(props.browserVisible??true)?<div className="figma-browser-column">{props.browserPanel}<WorkCardPlanningBrowserActions canPrepareHandoff={exact&&!busy} canCopyHandoff={exact&&!busy&&!!model.handoff} onPrepareHandoff={refresh} onCopyHandoff={()=>void action(async()=>{if(exact)await navigator.clipboard.writeText(model.handoff);})}
   onRefresh={refresh} onReloadBrowser={()=>void action(async()=>{await reloadArchitectBrowserWithRecovery();})} onRetryBrowser={()=>void action(async()=>{await reloadArchitectBrowserWithRecovery();})} isRevisionRequest={exact&&model.review.disposition.state==="revision_requested"}
   actionMessage={error?{kind:"error",message:error}:feedback?{kind:"success",message:feedback}:null} contextualActions={<button disabled={!exact||busy||model.review.disposition.state!=="approved"} onClick={props.onNext} type="button">Continue to Work Card Implement</button>}/></div>:null}/ >;
}
