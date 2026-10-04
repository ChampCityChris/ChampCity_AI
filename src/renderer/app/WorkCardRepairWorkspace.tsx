import {reloadArchitectBrowserWithRecovery} from "./architectBrowserRecovery";
import {useEffect,useRef,useState,type ReactNode} from "react";
import {WorkCardRepairShell} from "./WorkCardRepairShell";
import {FigmaDocumentDispositionPanel} from "./FigmaDocumentDispositionPanel";
import type {StructuredRepairWorkspace} from "../../shared/structuredRepairWorkspaceContracts";
import type {PlanningDocumentDetail} from "../../shared/documents/planningDocument";
import type {DocumentDispositionStatus} from "../../shared/documents/documentDisposition";

export function WorkCardRepairWorkspace(props:{workflowId:string;repairId:string;browserPanel:ReactNode;browserVisible?:boolean;onImplement:()=>void|Promise<void>;onReview:()=>void;onParent:(id:string)=>void}):JSX.Element {
 const [model,setModel]=useState<StructuredRepairWorkspace|null>(null),[selected,setSelected]=useState("failure"),[busy,setBusy]=useState(false),[error,setError]=useState(""),[feedback,setFeedback]=useState(""),[notes,setNotes]=useState(""),[status,setStatus]=useState<DocumentDispositionStatus|"">(""),[parentReport,setParentReport]=useState("");
 const generation=useRef(0);
 const exact=model?.workflowId===props.workflowId&&model.repair.id===props.repairId;
 async function load(token=generation.current) {const next=await window.champcity.getStructuredRepairWorkspace(props.workflowId,props.repairId);if(token!==generation.current)return;if(next.workflowId!==props.workflowId||next.repair.id!==props.repairId)throw Error("Exact Repair identity changed.");const report=await window.champcity.getImplementationAttempt(props.workflowId,next.parent.id);if(token!==generation.current)return;setParentReport(report?.markdown??"No completed parent Implementer Report.");setModel(next);setStatus("");}
 useEffect(()=>{const token=++generation.current;setModel(null);setParentReport("");setSelected("failure");setBusy(false);setError("");setFeedback("");setNotes("");setStatus("");void load(token).catch(reason=>{if(token===generation.current)setError(String(reason));});return()=>{generation.current++;};},[props.workflowId,props.repairId]);
 useEffect(()=>{if(exact&&model.repair.body.contractRevision&&model.planning.review.disposition.state!=="approved")setSelected("repair");},[model?.repair.id,model?.repair.body.contractRevision,model?.planning.review.disposition.state]);
 const actionInFlight=useRef(false);
 async function action(work:(token:number)=>Promise<unknown>,message="") {if(!exact||actionInFlight.current)return;actionInFlight.current=true;const token=generation.current;setBusy(true);setError("");try{await work(token);if(token!==generation.current)return;await load(token);if(token===generation.current)setFeedback(message);}catch(reason){if(token===generation.current)setError(String(reason));}finally{actionInFlight.current=false;if(token===generation.current)setBusy(false);}}
 const docs:PlanningDocumentDetail[]=exact?[
  sqlDocument("failure",model.failure.id,"Validation Record",["# Exact Failure Evidence",JSON.stringify(model.failure,null,2),model.parentCycle?JSON.stringify(model.parentCycle,null,2):""].join("\n\n"),"Approved"),
  sqlDocument("parent",model.parent.id,"Formal Work Card",["# Parent Work Card",JSON.stringify(model.parent,null,2)].join("\n\n"),"Approved"),
  sqlDocument("parent-report",model.parent.id,"Parent Implementer Report",parentReport,"Approved"),
  sqlDocument("context",model.repair.id,"Repair Context",model.markdown,"Pending"),
  sqlDocument("repair",model.repair.id,"Repair Work Card",model.planning.markdown,({approved:"Approved",revision_requested:"RevisionRequested",rejected:"Rejected"} as const)[model.planning.review.disposition.state as "approved"]??"Pending"),
  sqlDocument("report",model.repair.id,"Implementer / Tester Evidence",model.review.markdown,"Pending")]:[];
 const document=docs.find(doc=>doc.logicalDocumentId===selected)??docs[0]??null;
 const candidate=exact&&!!model.repair.body.contractRevision&&["planned","ready"].includes(model.repair.body.workState);
 const canReview=!!candidate&&!busy&&!error&&!!status&&(status!=="RevisionRequested"||!!notes.trim());
 const approved=exact&&model.planning.review.disposition.state==="approved";
 const stateLabel=exact?model.repair.body.workState==="closed"?"Closed":candidate?"Repair Card Reviewable":approved?"Prompt Ready":"Evidence Ready":"Needs Attention";
 return <WorkCardRepairShell actionError={error} actionFeedback={feedback} architectAriaLabel="Repair Work Card Architect" architectHeading="Repair Work Card Architect" architectStateLabel={stateLabel}
  architectStatusText="Review exact failure provenance and submit the Repair WorkItem planning candidate through workflow_toolbox." browserPanel={props.browserPanel} copyEnabled={!!exact&&!busy&&!!model.handoff} documentFeedback=""
  documentSlots={docs.map(doc=>({slotId:doc.logicalDocumentId,displayLabel:doc.displayFilename.replace(/\.md$/,""),targetPath:doc.markdownPath,logicalDocumentId:doc.logicalDocumentId,documentReadState:"readable"}))} isArchitectPaneVisible={props.browserVisible??true} isPreparing={busy}
  onCopyDocument={()=>void navigator.clipboard.writeText(document?.bodyMarkdown??"")} onExportDocument={request=>void action(()=>window.champcity.exportMarkdownDocument(request))}
  onCopyHandoff={()=>{if(exact)void navigator.clipboard.writeText(model.handoff);}} onPrepareHandoff={()=>void action(async()=>{},"Exact Repair Work Card prompt prepared.")} onRefresh={()=>void action(async()=>{},"SQL Repair context refreshed.")} onReloadBrowser={()=>void action(()=>reloadArchitectBrowserWithRecovery())} onSelectDocument={setSelected}
  prepareButtonLabel="Prepare Repair Work Card Prompt" prepareEnabled={!!exact&&!busy&&model.repair.lifecycleState==="active"}
  repairReviewPanel={<FigmaDocumentDispositionPanel currentDocument={document?.displayFilename} workflowStep="Repair Work Card Planning" effectiveDisposition={document?.effectiveDisposition} canApply={canReview} isApplying={busy||!candidate} notes={notes} onNotesChange={setNotes} status={status} onStatusChange={setStatus}
    onApply={()=>{if(canReview&&exact)void action(async token=>{await window.champcity.reviewStructuredWorkItemPlanning(props.workflowId,props.repairId,{expectedRecordVersion:model.repair.recordVersion,outcome:status==="Approved"?"approved":status==="RevisionRequested"?"revision_requested":"rejected",notes});if(token===generation.current&&status==="Approved")await props.onImplement();},"Exact Repair planning review recorded.");}}/>}
  selectedDocument={document} selectedSlotId={selected} showRepairReviewPanel={selected==="repair"&&!!candidate}
  statusDefectText={exact?model.parentCycle?.body.repairDefectText??model.parent.body.objective:undefined} statusIdentity={exact?`${model.repair.id} repairs ${model.parent.id}`:props.repairId} statusLabel={stateLabel}
  statusReason={exact?`Failure ${model.failure.entityType} ${model.failure.id}; ${model.sourceMode}. Current SQL Repair completion resumes parent at ready; fresh parent Implementer/Tester evidence is required.`:"Exact Repair context loading."} statusTarget={exact?`project-state:${model.repair.id}`:undefined} workspaceAriaLabel="Work Card Repair workspace"
  navigation={<div className="work-card-repair-action-row"><button type="button" disabled={!approved||busy||!model||model.repair.body.workState!=="in_progress"} onClick={props.onImplement}>Resume Repair Implement</button><button type="button" disabled={!exact||busy||model.repair.body.workState!=="validation_pending"} onClick={props.onReview}>Continue to Repair Review & Validation</button><button type="button" disabled={!exact||busy} onClick={()=>{if(exact)props.onParent(model.parent.id);}}>Return to Parent Work Card</button></div>}/>;
}
function sqlDocument(slot:string,id:string,label:string,markdown:string,disposition:DocumentDispositionStatus):PlanningDocumentDetail {
 return {logicalDocumentId:slot,markdownPath:`project-state:${id}`,displayFilename:label+".md",metadata:{artifactType:"generated-repair-context"},effectiveDisposition:disposition,documentReadState:"readable",initializationNeeded:false,bodyMarkdown:markdown,preview:markdown,previewTruncated:false};
}
