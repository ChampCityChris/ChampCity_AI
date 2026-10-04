import {reloadArchitectBrowserWithRecovery} from "./architectBrowserRecovery";
import {useEffect,useRef,useState,type ReactNode} from "react";
import {PhaseInterviewShell,PhaseInterviewBrowserActions} from "./PhaseInterviewShell";
import {FigmaDocumentDispositionPanel} from "./FigmaDocumentDispositionPanel";
import type {ChampCityApi} from "../../shared/workspaceContracts";
import type {PlanningDocumentDetail} from "../../shared/documents/planningDocument";
import type {DocumentDispositionStatus} from "../../shared/documents/documentDisposition";
type Model=Awaited<ReturnType<ChampCityApi["getStructuredPhaseLoop"]>>;

/** Exact Phase adapter. Model output enters through the typed workflow_toolbox ingress. */
export function PhaseInterviewWorkspace(props:{workflowId:string;phaseId:string;browserPanel:ReactNode;browserVisible?:boolean;onNext:()=>void}):JSX.Element {
 const [model,setModel]=useState<Model|null>(null),[error,setError]=useState("");
 const [notes,setNotes]=useState(""),[status,setStatus]=useState<DocumentDispositionStatus|"">(""),[busy,setBusy]=useState(false),[feedback,setFeedback]=useState("");
 const generation=useRef(0);
 const exact=model?.workflowId===props.workflowId&&(model.phase.id===props.phaseId||model.phase.body.phaseKey===props.phaseId)&&model.stageKind==="interview";
 const review=exact?model.review:null;
 function accept(next:Model,token:number){if(token!==generation.current)return;setModel(next);if(next.review?.cycle.recordVersion!==review?.cycle.recordVersion||next.review?.cycle.id!==review?.cycle.id)setStatus("");}
 useEffect(()=>{const token=++generation.current;setModel(null);setError("");setNotes("");setStatus("");setBusy(false);setFeedback("");
  void window.champcity.getStructuredPhaseLoop(props.workflowId,props.phaseId,"interview").then(next=>accept(next,token)).catch(reason=>{if(token===generation.current)setError(String(reason));});return()=>{generation.current++;};},[props.workflowId,props.phaseId]);
 async function action(work:(token:number)=>Promise<void>){const token=generation.current;setBusy(true);setError("");try{await work(token);}catch(reason){if(token===generation.current)setError(String(reason));}finally{if(token===generation.current)setBusy(false);}}
 const refresh=()=>void action(async token=>{accept(await window.champcity.getStructuredPhaseLoop(props.workflowId,props.phaseId,"interview"),token);});
 const document:PlanningDocumentDetail|null=review?{logicalDocumentId:review.cycle.id,markdownPath:`project-state:${review.cycle.id}`,displayFilename:`PHASE_INTERVIEW_${model!.phase.body.phaseKey}.md`,metadata:{artifactType:"generated-phase-interview",artifactRevision:review.cycle.recordVersion},effectiveDisposition:({approved:"Approved",rejected:"Rejected",revision_requested:"RevisionRequested"} as const)[review.disposition.state as "approved"]??"Pending",documentReadState:"readable",initializationNeeded:false,bodyMarkdown:review.markdown,preview:review.markdown,previewTruncated:false}:null;
 const canReview=!!review&&!model?.staleReview&&!busy&&!!status&&(status!=="RevisionRequested"||!!notes.trim());
 return <PhaseInterviewShell label={`Phase Interview ${exact?model.phase.body.phaseKey:props.phaseId} Figma document workspace`} browserVisible={props.browserVisible??true}
  document={{selectedDocument:document,documentError:error||model?.staleReview?.reason||"",feedback,onCopy:()=>void action(async()=>{await navigator.clipboard.writeText(document?.bodyMarkdown??"");}),onExport:request=>void action(async()=>{await window.champcity.exportMarkdownDocument(request);})}}
  reviewControls={<FigmaDocumentDispositionPanel currentDocument={document?.displayFilename} effectiveDisposition={document?.effectiveDisposition} workflowStep="Review & Validation" isApplying={busy||!review} canApply={canReview} notes={notes} onNotesChange={setNotes} status={status} onStatusChange={setStatus}
   onApply={()=>{if(canReview&&review)void action(async token=>{accept(await window.champcity.reviewStructuredPhaseLoop(props.workflowId,model!.phase.id,"interview",review.cycle.id,{expectedRecordVersion:review.cycle.recordVersion,outcome:status==="Approved"?"approved":status==="RevisionRequested"?"revision_requested":"rejected",notes}),token);if(token===generation.current){setStatus("");setFeedback("Phase Interview review recorded.");}});}} />}
  browserCompanion={(props.browserVisible??true)?<div className="figma-browser-column">{props.browserPanel}<PhaseInterviewBrowserActions prepareHandoffLabel="Prepare Phase Interview Handoff" copyHandoffLabel="Copy Phase Interview Handoff"
   canPrepareHandoff={exact&&!busy} canCopyHandoff={exact&&!busy&&!!model.handoff} onPrepareHandoff={refresh} onCopyHandoff={()=>void action(async()=>{if(exact)await navigator.clipboard.writeText(model.handoff);})}
   onRefresh={refresh} onReloadBrowser={()=>void action(async()=>{await reloadArchitectBrowserWithRecovery();})} onRetryBrowser={()=>void action(async()=>{await reloadArchitectBrowserWithRecovery();})} isRevisionRequest={review?.disposition.state==="revision_requested"}
   actionMessage={error?{kind:"error",message:error}:feedback?{kind:"success",message:feedback}:null} contextualActions={<button disabled={busy||review?.disposition.state!=="approved"} onClick={props.onNext} type="button">Continue to Phase Planning</button>}/></div>:null}/ >;
}
