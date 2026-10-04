import {reloadArchitectBrowserWithRecovery} from "./architectBrowserRecovery";
import {useEffect, useState, type ReactNode} from "react";
import {ProjectPlanningReviewShell, ProjectPlanningBrowserActions} from "./ProjectPlanningReviewShell";
import type {createStructuredProjectPlanningService} from "../../main/projectPlanning/structuredProjectPlanningService";
import type {PlanningDocumentDetail} from "../../shared/documents/planningDocument";
import type {DocumentDispositionStatus} from "../../shared/documents/documentDisposition";
type PlanningModel = Awaited<ReturnType<ReturnType<typeof createStructuredProjectPlanningService>["get"]>>;

export function StructuredProjectPlanningWorkspace(props: {workflowId: string | null; browserPanel: ReactNode; onNext: () => void; browserVisible?: boolean; onRailStatus?: (status: "Open" | "Completed" | "Awaiting Approval" | "Not Ready") => void}): JSX.Element {
  const [model,setModel]=useState<PlanningModel|null>(null),[error,setError]=useState("");
  const [notes,setNotes]=useState(""),[status,setStatus]=useState<DocumentDispositionStatus|"">(""),[busy,setBusy]=useState(false),[feedback,setFeedback]=useState("");
  const [selectedSlotId,setSelectedSlotId]=useState("profile"),[viewed,setViewed]=useState<string[]>([]);
  const revision=model?.review ? `${model.review.cycleId}@${model.review.recordVersion}` : "";
  function accept(next: PlanningModel) {
    setModel(next);props.onRailStatus?.(next.review?.disposition.state==="approved"?"Completed":next.review?"Awaiting Approval":"Open");
    const nextRevision=next.review ? `${next.review.cycleId}@${next.review.recordVersion}` : "";
    if(nextRevision!==revision){setSelectedSlotId("profile");setViewed(nextRevision?[`${nextRevision}:profile`]:[]);setStatus("");}
  }
  useEffect(()=>{let active=true;setModel(null);setError("");setViewed([]);setSelectedSlotId("profile");
    if(props.workflowId)window.champcity.getStructuredProjectPlanning(props.workflowId).then(next=>{if(active)accept(next);}).catch(reason=>{if(active){setError(String(reason));props.onRailStatus?.("Not Ready");}});
    else setError("Select exact Project Creation Workflow.");return()=>{active=false;};},[props.workflowId]);
  async function action(work:()=>Promise<void>){setBusy(true);setError("");setFeedback("");try{await work();}catch(reason){setError(String(reason));}finally{setBusy(false);}}
  const refresh=()=>void action(async()=>{if(!props.workflowId)throw Error("Exact Workflow required.");accept(await window.champcity.getStructuredProjectPlanning(props.workflowId));});
  const review=model?.review;
  const documents:PlanningDocumentDetail[]=review ? [
    ["profile","PROJECT_PROFILE.md",review.profileMarkdown],["roadmap","PROJECT_ROADMAP.md",review.roadmapMarkdown],
  ].map(([slot,filename,body])=>({logicalDocumentId:`${review.cycleId}:${slot}`,markdownPath:`project-state:${review.cycleId}:${slot}`,displayFilename:filename,metadata:{artifactType:`generated-project-${slot}`,artifactRevision:review.recordVersion,participationRole:"gatingReview"},effectiveDisposition:({approved:"Approved",revision_requested:"RevisionRequested",rejected:"Rejected"} as const)[review.disposition.state as "approved"]??"Pending",initializationNeeded:false,documentReadState:"readable",bodyMarkdown:body,preview:body,previewTruncated:false})) : [];
  const selectedDocument=documents[selectedSlotId==="roadmap"?1:0]??null;
  const allViewed=!!revision&&["profile","roadmap"].every(slot=>viewed.includes(`${revision}:${slot}`));
  const canReview=!!review&&!model?.staleReview&&!error;
  const blocker=error||model?.staleReview?.reason;
  return <ProjectPlanningReviewShell label="Project Planning Review Figma document workspace" browserVisible={props.browserVisible??true}
    blocker={blocker?{reason:blocker,requiredAction:"Prepare the handoff from current approved Architect evidence, submit a fresh candidate, then Refresh.",evidencePaths:model?.sources.map(source=>`project-state:${source.entityId}@${source.recordVersion}`)??[]}:null}
    document={{selectedDocument,documentError:"",feedback,slots:[{slotId:"profile",displayLabel:"Project Profile",logicalDocumentId:documents[0]?.logicalDocumentId},{slotId:"roadmap",displayLabel:"Project Roadmap",logicalDocumentId:documents[1]?.logicalDocumentId}],selectedSlotId,onSelectSlot:slot=>{setSelectedSlotId(slot);if(revision)setViewed(current=>current.includes(`${revision}:${slot}`)?current:[...current,`${revision}:${slot}`]);},onCopy:()=>void action(async()=>{await navigator.clipboard.writeText(selectedDocument?.bodyMarkdown??"");})}}
    review={{currentDocument:selectedDocument?.displayFilename,effectiveDisposition:selectedDocument?.effectiveDisposition,workflowStep:"Review & Validation",isApplying:busy||!canReview,canApply:!busy&&canReview&&!!status&&(status!=="Approved"||allViewed),notes,onNotesChange:setNotes,status,onStatusChange:setStatus,warning:!allViewed&&canReview?"Open every current output revision before approval.":undefined,
      onApply:()=>void action(async()=>{if(!review||!props.workflowId)throw Error("Exact current review required.");accept(await window.champcity.reviewStructuredProjectPlanning(props.workflowId,review.cycleId,{expectedRecordVersion:review.recordVersion,outcome:status==="Approved"?"approved":status==="RevisionRequested"?"revision_requested":"rejected",notes}));setStatus("");setFeedback("Operator review recorded.");})}}
    browserCompanion={<div className="figma-browser-column">{props.browserPanel}<ProjectPlanningBrowserActions canPrepareHandoff={!busy&&!!model} canCopyHandoff={!busy&&!!model?.handoff} isRevisionRequest={review?.disposition.state==="revision_requested"}
      onPrepareHandoff={refresh} onCopyHandoff={()=>void action(async()=>{await navigator.clipboard.writeText(model!.handoff);})} onRefresh={refresh} onReloadBrowser={()=>void action(async()=>{await reloadArchitectBrowserWithRecovery();})} onRetryBrowser={()=>void action(async()=>{await reloadArchitectBrowserWithRecovery();})}
      actionMessage={error?{kind:"error",message:error}:feedback?{kind:"success",message:feedback}:null}
      contextualActions={<button disabled={busy||review?.disposition.state!=="approved"} onClick={props.onNext}>Continue to Phase Map</button>} /></div>} />;
}
