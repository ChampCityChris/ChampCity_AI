import {reloadArchitectBrowserWithRecovery} from "./architectBrowserRecovery";
import {useEffect,useRef,useState,type ReactNode} from "react";
import {PhasePlanningShell,PhasePlanningBrowserActions} from "./PhasePlanningShell";
import {FigmaDocumentDispositionPanel} from "./FigmaDocumentDispositionPanel";
import type {ChampCityApi} from "../../shared/workspaceContracts";
import type {PlanningDocumentDetail} from "../../shared/documents/planningDocument";
import type {DocumentDispositionStatus} from "../../shared/documents/documentDisposition";
type Model=Awaited<ReturnType<ChampCityApi["getStructuredPhaseLoop"]>>;

/** Exact Phase adapter. Model output enters through the typed workflow_toolbox ingress. */
export function PhasePlanningWorkspace(props:{readOnly?:boolean;workflowId:string;phaseId:string;browserPanel:ReactNode;browserVisible?:boolean;onNext:()=>void|Promise<void>}):JSX.Element {
 const [model,setModel]=useState<Model|null>(null),[error,setError]=useState("");
 const [notes,setNotes]=useState(""),[status,setStatus]=useState<DocumentDispositionStatus|"">(""),[busy,setBusy]=useState(false),[feedback,setFeedback]=useState(""),[selectedSlot,setSelectedSlot]=useState("planning"),[viewed,setViewed]=useState<string[]>([]);
 const generation=useRef(0);
 const exact=model?.workflowId===props.workflowId&&(model.phase.id===props.phaseId||model.phase.body.phaseKey===props.phaseId)&&model.stageKind==="planning";
 const review=exact?model.review:null;
 function accept(next:Model,token:number){if(token!==generation.current)return;setModel(next);if(next.review?.cycle.recordVersion!==review?.cycle.recordVersion||next.review?.cycle.id!==review?.cycle.id){setStatus("");setSelectedSlot("planning");setViewed(next.review?[`${next.review.cycle.id}@${next.review.cycle.recordVersion}:planning`]:[]);}}
 useEffect(()=>{const token=++generation.current;setModel(null);setError("");setNotes("");setStatus("");setBusy(false);setFeedback("");setSelectedSlot("planning");setViewed([]);
  void window.champcity.getStructuredPhaseLoop(props.workflowId,props.phaseId,"planning").then(next=>accept(next,token)).catch(reason=>{if(token===generation.current)setError(String(reason));});return()=>{generation.current++;};},[props.workflowId,props.phaseId]);
 const actionInFlight=useRef(false);
 async function action(work:(token:number)=>Promise<void>){if(actionInFlight.current)return;actionInFlight.current=true;const token=generation.current;setBusy(true);setError("");try{await work(token);}catch(reason){if(token===generation.current)setError(String(reason));}finally{actionInFlight.current=false;if(token===generation.current)setBusy(false);}}
 const refresh=()=>void action(async token=>{accept(await window.champcity.getStructuredPhaseLoop(props.workflowId,props.phaseId,"planning"),token);});
 const revision=review?review.cycle.id+"@"+review.cycle.recordVersion:"";
 // Split only the service-generated readability projection; no save, identity or readiness uses Markdown.
 const divider="\n\n# Work Card Plan\n\n",split=review?.markdown.indexOf(divider)??-1;
 const documents:PlanningDocumentDetail[]=review?[["planning","PHASE_PLANNING",split<0?review.markdown:review.markdown.slice(0,split)],["cards","WORK_CARD_PLAN",split<0?review.markdown:review.markdown.slice(split+2)]].map(([slot,name,body])=>({logicalDocumentId:review.cycle.id+":"+slot,markdownPath:"project-state:"+review.cycle.id+":"+slot,displayFilename:name+"_"+model!.phase.body.phaseKey+".md",metadata:{artifactType:"generated-phase-output",artifactRevision:review.cycle.recordVersion},effectiveDisposition:({approved:"Approved",rejected:"Rejected",revision_requested:"RevisionRequested"} as const)[review.disposition.state as "approved"]??"Pending",documentReadState:"readable",initializationNeeded:false,bodyMarkdown:body,preview:body,previewTruncated:false})):[];
 const document=documents[selectedSlot==="cards"?1:0]??null;
 const allViewed=!!revision&&["planning","cards"].every(slot=>viewed.includes(revision+":"+slot));
 const canReview=!props.readOnly&&!!review&&!model?.staleReview&&!busy&&!!status&&(status!=="RevisionRequested"||!!notes.trim())&&(status!=="Approved"||allViewed);
 return <PhasePlanningShell label={`Phase Planning ${exact?model.phase.body.phaseKey:props.phaseId} Figma document workspace`} browserVisible={props.browserVisible??true}
  document={{selectedDocument:document,selectedSlotId:selectedSlot,slots:[{slotId:"planning",displayLabel:"Phase Planning",logicalDocumentId:documents[0]?.logicalDocumentId},{slotId:"cards",displayLabel:"Work Card Plan",logicalDocumentId:documents[1]?.logicalDocumentId}],onSelectSlot:slot=>{setSelectedSlot(slot);if(revision)setViewed(current=>current.includes(revision+":"+slot)?current:[...current,revision+":"+slot]);},documentError:error||model?.staleReview?.reason||"",feedback,onCopy:()=>void action(async()=>{await navigator.clipboard.writeText(document?.bodyMarkdown??"");}),onExport:request=>void action(async()=>{await window.champcity.exportMarkdownDocument(request);})}}
  reviewControls={<FigmaDocumentDispositionPanel currentDocument={document?.displayFilename} effectiveDisposition={document?.effectiveDisposition} workflowStep="Review & Validation" isApplying={!!props.readOnly||busy||!review} canApply={!props.readOnly && canReview} warning={review&&!allViewed?"Open every current output revision before approval.":undefined} notes={notes} onNotesChange={setNotes} status={status} onStatusChange={setStatus}
   onApply={()=>{if(canReview&&review)void action(async token=>{accept(await window.champcity.reviewStructuredPhaseLoop(props.workflowId,model!.phase.id,"planning",review.cycle.id,{expectedRecordVersion:review.cycle.recordVersion,outcome:status==="Approved"?"approved":status==="RevisionRequested"?"revision_requested":"rejected",notes}),token);if(token===generation.current){setStatus("");setFeedback("Phase Planning review recorded.");if(status==="Approved")await props.onNext();}});}} />}
  browserCompanion={(props.browserVisible??true)?<div className="figma-browser-column">{props.browserPanel}<PhasePlanningBrowserActions prepareHandoffLabel="Prepare Handoff" copyHandoffLabel="Copy Handoff"
   canPrepareHandoff={!props.readOnly && exact&&!busy} canCopyHandoff={exact&&!busy&&!!model.handoff} onPrepareHandoff={()=>{if(!props.readOnly)refresh();}} onCopyHandoff={()=>void action(async()=>{if(exact)await navigator.clipboard.writeText(model.handoff);})}
   onRefresh={refresh} onReloadBrowser={()=>void action(async()=>{await reloadArchitectBrowserWithRecovery();})} onRetryBrowser={()=>void action(async()=>{await reloadArchitectBrowserWithRecovery();})} isRevisionRequest={review?.disposition.state==="revision_requested"}
   actionMessage={error?{kind:"error",message:error}:feedback?{kind:"success",message:feedback}:null}/></div>:null}/ >;
}
