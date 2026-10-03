import {useEffect,useState,type ReactNode} from "react";
import {ProjectPhaseMapShell,ProjectPhaseMapBrowserActions} from "./ProjectPhaseMapShell";
import type {createStructuredPhaseMapService} from "../../main/phaseMap/structuredPhaseMapService";
import type {PlanningDocumentDetail} from "../../shared/documents/planningDocument";
import type {DocumentDispositionStatus} from "../../shared/documents/documentDisposition";
type PhaseMapModel=Awaited<ReturnType<ReturnType<typeof createStructuredPhaseMapService>["get"]>>;
export function StructuredPhaseMapWorkspace(props:{workflowId:string|null;browserPanel:ReactNode;browserVisible?:boolean;onNext:()=>Promise<void>}):JSX.Element {
  const [model,setModel]=useState<PhaseMapModel|null>(null),[error,setError]=useState("");
  const [notes,setNotes]=useState(""),[status,setStatus]=useState<DocumentDispositionStatus|"">(""),[busy,setBusy]=useState(false),[feedback,setFeedback]=useState(""),[currentPhaseId,setCurrentPhaseId]=useState<string|null>(null);
  async function load(){if(!props.workflowId)throw Error("Select exact Greenfield Workflow.");const next=await window.champcity.getStructuredPhaseMap(props.workflowId);const navigation=await window.champcity.getGreenfieldNavigation(props.workflowId);return {next,phaseId:navigation.currentPhaseId};}
  function accept(next:PhaseMapModel,phaseId:string|null){setModel(next);setCurrentPhaseId(phaseId);}
  useEffect(()=>{let active=true;setModel(null);setError("");setStatus("");if(props.workflowId)load().then(({next,phaseId})=>{if(active)accept(next,phaseId);}).catch(reason=>{if(active)setError(String(reason));});else setError("Select exact Greenfield Workflow.");return()=>{active=false;};},[props.workflowId]);
  async function action(work:()=>Promise<void>){setBusy(true);setError("");setFeedback("");try{await work();}catch(reason){setError(String(reason));}finally{setBusy(false);}}
  const refresh=()=>void action(async()=>{const {next,phaseId}=await load();accept(next,phaseId);});
  const review=model?.review;
  const document:PlanningDocumentDetail|null=review?{logicalDocumentId:review.cycle.id,markdownPath:`project-state:${review.cycle.id}`,displayFilename:"PHASE_MAP.md",metadata:{artifactType:"generated-phase-map",artifactRevision:review.cycle.recordVersion,participationRole:"gatingReview"},effectiveDisposition:({approved:"Approved",revision_requested:"RevisionRequested",rejected:"Rejected"} as const)[review.disposition.state as "approved"]??"Pending",initializationNeeded:false,documentReadState:"readable",bodyMarkdown:review.markdown,preview:review.markdown,previewTruncated:false}:null;
  const currentPhaseKey=review?.livePhases.find(phase=>phase.id===currentPhaseId)?.body.phaseKey??null;
  const workCardCounts=Object.fromEntries((model?.plan?.phases??[]).map(phase=>[phase.record.body.phaseKey??phase.phaseId,phase.workItemIds.length]));
  return <ProjectPhaseMapShell browserVisible={props.browserVisible??true} cards={{currentPhaseId:currentPhaseKey,documentError:error,feedback,selectedDocument:document,projection:review?{state:"readable",phases:review.phases}:null,workCardCounts,onCopy:()=>void action(async()=>{await navigator.clipboard.writeText(document?.bodyMarkdown??"");})}}
    review={review?{currentDocument:document?.displayFilename,effectiveDisposition:document?.effectiveDisposition,workflowStep:"Review & Validation",canApply:!busy&&!error&&!!status,isApplying:busy||!!error,notes,onNotesChange:setNotes,status,onStatusChange:setStatus,
      onApply:()=>void action(async()=>{if(!props.workflowId)throw Error("Exact Workflow required.");setModel(await window.champcity.reviewStructuredPhaseMap(props.workflowId,review.cycle.id,{expectedRecordVersion:review.cycle.recordVersion,outcome:status==="Approved"?"approved":status==="RevisionRequested"?"revision_requested":"rejected",notes}));setStatus("");setFeedback("Operator review recorded.");})}:null}
    browserCompanion={<div className="figma-browser-column">{props.browserPanel}<ProjectPhaseMapBrowserActions canPrepareHandoff={!busy&&!!model} canCopyHandoff={!busy&&!!model?.handoff} isRevisionRequest={review?.disposition.state==="revision_requested"} onPrepareHandoff={refresh} onCopyHandoff={()=>void action(async()=>{await navigator.clipboard.writeText(model!.handoff);})} onRefresh={refresh} onReloadBrowser={()=>void action(async()=>{await window.champcity.reloadArchitectBrowser();})} onRetryBrowser={()=>void action(async()=>{await window.champcity.reloadArchitectBrowser();})} actionMessage={error?{kind:"error",message:error}:feedback?{kind:"success",message:feedback}:null}
      contextualActions={<button disabled={busy||review?.disposition.state!=="approved"} onClick={()=>void action(props.onNext)}>Continue to next Phase</button>} /></div>} />;
}
