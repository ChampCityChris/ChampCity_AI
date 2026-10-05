import {WorkflowCandidateBrowserActions} from "./WorkflowCandidateBrowserActions";
import {reloadArchitectBrowserWithRecovery} from "./architectBrowserRecovery";
import {useEffect,useRef,useState,type ReactNode} from "react";
import {WorkCardReviewValidationShell,type WorkCardReviewValidationShellProps} from "./WorkCardReviewValidationShell";
import {useCodexModelSelection} from "./WorkCardImplementWorkspace";
import type {ChampCityApi,CodexTesterExecutionModel} from "../../shared/workspaceContracts";
type Review=Awaited<ReturnType<ChampCityApi["getStructuredWorkItemReview"]>>;
type Planning=Awaited<ReturnType<ChampCityApi["getStructuredWorkItemPlanning"]>>;
type Report=Awaited<ReturnType<ChampCityApi["getImplementationAttempt"]>>;
export interface WorkItemReviewWorkspaceProps {readOnly?:boolean;workflowId:string;workItemId:string;browserPanel?:ReactNode;onClosed:()=>void;onRepair:(repairId:string)=>void;onValidation?:()=>void}

/** Shared application binding for the two distinct aggregate review surfaces. */
export function useWorkItemReviewContext(props:WorkItemReviewWorkspaceProps) {
 const [review,setReview]=useState<Review|null>(null),[planning,setPlanning]=useState<Planning|null>(null),[report,setReport]=useState<Report>(null),[tester,setTester]=useState<CodexTesterExecutionModel|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notes,setNotes]=useState(""),[defect,setDefect]=useState(""),[selected,setSelected]=useState("report"),[feedback,setFeedback]=useState("");
 const generation=useRef(0);
 const exact=review?.workflowId===props.workflowId&&review.workItem.id===props.workItemId&&planning?.workflowType==="project-creation"&&planning.workItem.id===props.workItemId;
 async function load(token=generation.current) {
  const [next,nextPlanning,nextReport]=await Promise.all([window.champcity.getStructuredWorkItemReview(props.workflowId,props.workItemId),window.champcity.getStructuredWorkItemPlanning(props.workflowId,props.workItemId),window.champcity.getImplementationAttempt(props.workflowId,props.workItemId)]);
  const nextTester=next.validation.implementationRecordId?await window.champcity.getWorkflowWorkItemTesterStatus(props.workflowId,props.workItemId,next.validation.implementationRecordId):null;
  if(token!==generation.current)return;
  if(next.workflowId!==props.workflowId||next.workItem.id!==props.workItemId||nextPlanning.workflowId!==props.workflowId||nextPlanning.workItem.id!==props.workItemId||nextPlanning.workflowType!=="project-creation"||nextReport&&(nextReport.attempt.body.workflowId!==props.workflowId||nextReport.attempt.body.workItemId!==props.workItemId)||nextTester&&(nextTester.workflowId!==props.workflowId||nextTester.workItemId!==props.workItemId))throw Error("Exact Greenfield review context changed.");
  setReview(next);setPlanning(nextPlanning);setReport(nextReport);setTester(nextTester);
 }
 useEffect(()=>{const token=++generation.current;setReview(null);setPlanning(null);setReport(null);setTester(null);setNotes("");setDefect("");setSelected("report");setBusy(false);setError("");setFeedback("");void load(token).catch(reason=>{if(token===generation.current)setError(String(reason));});return()=>{generation.current++;};},[props.workflowId,props.workItemId]);
 useEffect(()=>{if(tester?.state!=="running")return;const token=generation.current;const timer=window.setInterval(()=>void load(token).catch(reason=>{if(token===generation.current)setError(String(reason));}),1500);return()=>window.clearInterval(timer);},[tester?.state,props.workflowId,props.workItemId]);
 async function action(work:()=>Promise<unknown>,message="",mutation=false) {if(mutation&&props.readOnly||!exact||busy)return;const token=generation.current;setBusy(true);setError("");try{await work();await load(token);if(token===generation.current)setFeedback(message);}catch(reason){if(token===generation.current)setError(String(reason));}finally{if(token===generation.current)setBusy(false);}}
 const completed=exact&&report?.attempt.body.attemptState==="completed"&&report.attempt.body.implementationRecordId===review.validation.implementationRecordId&&review.workItem.body.workState==="validation_pending";
 const canPass=!props.readOnly&&!!completed&&!busy&&!error&&!!review?.validation.completion.eligible&&!!review.validation.testerResultId;
 const canRepair=!props.readOnly&&!!completed&&!busy&&!error&&!!defect.trim();
 const prepare=()=>!props.readOnly&&action(()=>window.champcity.prepareWorkItemValidationCycle(props.workflowId,props.workItemId),"Current validation attempt prepared.");
 async function decide(outcome:"ValidatePassed"|"RequestRepair") {
  if(outcome==="ValidatePassed"?!canPass:!canRepair)return;
  await action(async()=>{
   const token=generation.current;
   const current=await window.champcity.prepareWorkItemValidationCycle(props.workflowId,props.workItemId);
   if(token!==generation.current||current.workflowId!==props.workflowId||current.workItem.id!==props.workItemId||!current.cycle?.current)throw Error("Exact current cycle required.");
   const decision=await window.champcity.reviewWorkItemValidationCycle(props.workflowId,props.workItemId,{cycleId:current.cycle.cycle.id,expectedRecordVersion:current.cycle.cycle.recordVersion,outcome,operatorNotes:notes,...(outcome==="RequestRepair"?{repairDefectText:defect}: {})});
   if(outcome==="RequestRepair") {const result=await window.champcity.createWorkflowRepair(props.workflowId,props.workItemId,decision.id);if(token===generation.current)props.onRepair(result.repair.id);}
   else if(token===generation.current)props.onClosed();
  },"Exact Operator report review recorded.");
 }
 const document=selected==="formal"?{body:planning?.markdown??"",label:"Approved Work Card",path:`project-state:${props.workItemId}`,status:planning?.review.disposition.state??"Waiting"}:selected==="advisory"?{body:review?.advisoryMarkdown??"",label:"Architect Advisory",path:`project-state:${review?.cycle?.cycle.id??props.workItemId}`,status:review?.cycle?`revision ${review.cycle.cycle.recordVersion} / ${review.cycle.current?"current":"stale"}`:"Not yet submitted"}:selected==="validation"?{body:review?.markdown??"",label:"Work Card Validation Record",path:`project-state:${review?.cycle?.cycle.id??props.workItemId}`,status:review?.cycle?`${review.cycle.disposition.state} / ${review.cycle.current?"current":"stale"}`:"Waiting"}:{body:report?.markdown??"",label:"Implementer Report",path:`project-state:${report?.attempt.id??props.workItemId}`,status:report?.attempt.body.attemptState??"Waiting"};
 const decision:WorkCardReviewValidationShellProps["decision"]={ariaLabel:"Review & Validation documents and decision",decisionAriaLabel:"Operator validation controls",canRequestRepair:canRepair,canValidatePassed:canPass,isApplying:!!props.readOnly||busy||!completed,
  documentChoices:[{id:"formal",label:"Approved Work Card",available:!!planning},{id:"report",label:"Implementer Report",available:!!report},{id:"advisory",label:"Architect Advisory",available:!!review?.advisoryMarkdown},{id:"validation",label:"Validation Record",available:!!review}],selectedDocumentId:selected,onSelectDocument:setSelected,
  selectedDocumentLabel:document.label,selectedDocumentFilename:document.label+".md",selectedDocumentPath:document.path,selectedDocumentStatus:document.status,selectedDocumentBody:document.body,operatorNotes:notes,onOperatorNotesChange:setNotes,repairDefectText:defect,onRepairDefectTextChange:setDefect,
  advisoryField:review?.cycle?.cycle.body.advisorySummary?{label:"Advisory Architect summary",value:`${review.cycle.cycle.body.advisoryRecommendation??"Inconclusive"}: ${review.cycle.cycle.body.advisorySummary} (${review.cycle.current?"current":"stale"})`,readOnly:true}:undefined,onValidatePassed:()=>void decide("ValidatePassed"),onRequestRepair:()=>void decide("RequestRepair"),documentError:error,feedback};
 const documentActions=<div className="validation-action-row"><button type="button" disabled={!document.body} onClick={()=>void navigator.clipboard.writeText(document.body)}>Copy</button><button type="button" disabled={!document.body||busy} onClick={()=>void action(()=>window.champcity.exportMarkdownDocument({suggestedFilename:document.label.replaceAll(" ","_")+".md",markdown:document.body}))}>Export Markdown…</button></div>;
 const proofActions=exact?<WorkItemProofActions workflowId={props.workflowId} workItemId={props.workItemId} review={review} tester={tester} busy={!!props.readOnly||busy} action={(work,message)=>action(work,message,true)} onRepair={props.onRepair}/>:null;
 return {review,planning,report,tester,busy,error,completed,prepare,action,load,decision,documentActions,proofActions,
  shell:{contextKey:`${props.workflowId}:${props.workItemId}`,testerActions:exact?<WorkItemProofActions {...proofActions!.props} mode="tester"/>:null,criteriaActions:exact?<WorkItemProofActions {...proofActions!.props} mode="criteria"/>:null,identity:exact?`${review.workItem.body.candidateKey??review.workItem.id} - ${review.workItem.body.title}`:props.workItemId,contractPath:`project-state:${props.workItemId}`,reportStatus:report?`revision ${report.attempt.recordVersion} | ${report.attempt.body.attemptState}`:"Waiting",reportPath:report?`project-state:${report.attempt.id}`:"Create Implementer Report",decision,documentActions,proofActions} satisfies WorkCardReviewValidationShellProps};
}

export function WorkCardReviewValidationWorkspace(props:WorkItemReviewWorkspaceProps):JSX.Element {
 const context=useWorkItemReviewContext(props);
 return <WorkCardReviewValidationShell {...context.shell} browserPanel={props.browserPanel?<div className="figma-browser-column">{props.browserPanel}<WorkflowCandidateBrowserActions
  prepareHandoffLabel="Prepare Advisory Handoff" copyHandoffLabel="Copy Advisory Handoff"
  canPrepareHandoff={!props.readOnly&&!!context.completed&&!context.busy} canCopyHandoff={!!context.review?.handoff&&!context.busy}
  onPrepareHandoff={()=>void context.action(()=>window.champcity.prepareWorkItemValidationCycle(props.workflowId,props.workItemId),"Advisory context prepared.",true)}
  onCopyHandoff={()=>void context.action(()=>navigator.clipboard.writeText(context.review?.handoff??""))}
  onRefresh={()=>void context.action(async()=>{},"SQL evidence refreshed.")}
  onReloadBrowser={()=>void context.action(()=>reloadArchitectBrowserWithRecovery())} onRetryBrowser={()=>void context.action(()=>reloadArchitectBrowserWithRecovery())}
  showRetryButton={!!context.error} actionMessage={context.error?{kind:"error",message:context.error}:null}/></div>:null}/>;
}

export function WorkItemProofActions(props:{mode?:"tester"|"criteria";workflowId:string;workItemId:string;review:Review;tester:CodexTesterExecutionModel|null;busy:boolean;action:(work:()=>Promise<unknown>,message?:string)=>Promise<void>;onRepair:(id:string)=>void}):JSX.Element {
 const selection=useCodexModelSelection(props.busy||props.tester?.state==="running"),[summary,setSummary]=useState(""),[outcome,setOutcome]=useState<"pass"|"fail"|"inconclusive">("pass"),[decision,setDecision]=useState<"approved"|"rejected">("approved"),[answers,setAnswers]=useState<Record<string,string>>({});
 const validation=props.review.validation,implementationId=validation.implementationRecordId;
 const act=(work:()=>Promise<unknown>)=>void props.action(work);
 return <section className="work-card-review-proof" aria-label="Tester and Criterion proof">{props.mode!=="criteria"?<><h3>Tester evidence</h3><p>{props.tester?.state??"Waiting"} · {validation.testerResultId??"Current independent Tester required"}</p>
  {selection.controls}<button type="button" disabled={!implementationId||!selection.canRun||props.busy||props.tester?.state==="running"} onClick={()=>selection.selection&&implementationId&&act(()=>window.champcity.startWorkflowWorkItemTester(props.workflowId,props.workItemId,implementationId,{...selection.selection!}))}>Run Tester</button>
  <button type="button" disabled={!implementationId||props.tester?.state!=="running"||props.busy} onClick={()=>implementationId&&act(()=>window.champcity.cancelWorkflowWorkItemTester(props.workflowId,props.workItemId,implementationId))}>Cancel Tester</button>
  {props.tester?.pendingApproval&&implementationId?<div><p>{props.tester.pendingApproval.impactSummary}</p>{(["approve","deny"] as const).map(value=><button key={value} disabled={props.busy} onClick={()=>act(()=>window.champcity.respondToWorkflowWorkItemTesterApproval(props.workflowId,props.workItemId,implementationId,props.tester!.pendingApproval!.requestId,value))}>{value}</button>)}</div>:null}
  {props.tester?.pendingUserInput&&implementationId?<div>{props.tester.pendingUserInput.questions.map(question=><label key={question.id}>{question.question}<input value={answers[question.id]??""} onChange={event=>setAnswers({...answers,[question.id]:event.target.value})}/></label>)}<button disabled={props.busy} onClick={()=>act(()=>window.champcity.respondToWorkflowWorkItemTesterInput(props.workflowId,props.workItemId,implementationId,props.tester!.pendingUserInput!.requestId,Object.fromEntries(Object.entries(answers).map(([id,value])=>[id,[value]]))))}>Submit Tester input</button></div>:null}
  {props.tester?.failureReason?<p role="status">{props.tester.failureReason}</p>:null}<pre>{props.tester?.eventTail.slice(-30).join("\n")}</pre>
  {props.review.testers.map(record=><p key={record.id}>{record.body.recommendation}: {record.body.rationale} - {record.body.determinationEvidence?.join("; ")}{record.body.recommendation==="production-defect-suspected"&&record.id===validation.testerResultId?<button disabled={props.busy} onClick={()=>act(async()=>{const result=await window.champcity.createWorkflowRepair(props.workflowId,props.workItemId,record.id);props.onRepair(result.repair.id);})}>Create Repair</button>:null}</p>)}
  </>:null}{props.mode!=="tester"?<><h3>Criterion proof</h3>
  {props.mode==="criteria"?selection.controls:null}<p>{validation.completion.eligible?"Completion eligible":validation.completion.blockers.join("; ")}</p>
  <label>Evidence summary / Operator rationale<textarea value={summary} maxLength={4096} onChange={event=>setSummary(event.target.value)}/></label><label>Visual outcome<select value={outcome} onChange={event=>setOutcome(event.target.value as typeof outcome)}><option value="pass">Pass</option><option value="fail">Fail</option><option value="inconclusive">Inconclusive</option></select></label><label>Criterion decision<select value={decision} onChange={event=>setDecision(event.target.value as typeof decision)}><option value="approved">Approve</option><option value="rejected">Reject</option></select></label>
  <ul>{validation.criteria.map(entry=><li key={entry.criterion.id}>{entry.criterion.body.statement} — {entry.policy} · {entry.outcome}{entry.reason?` · ${entry.reason}`:""}
   {entry.policy==="deterministic"?<button disabled={props.busy||!validation.testerResultId} onClick={()=>act(()=>window.champcity.validateDeterministicWorkflowCriterion(props.workflowId,props.workItemId,entry.criterion.id))}>Run deterministic Validator</button>:null}
   {entry.policy==="semantic_ai"?<button disabled={props.busy||!validation.testerResultId||!selection.canRun} onClick={()=>selection.selection&&act(()=>window.champcity.validateSemanticWorkflowCriterion(props.workflowId,props.workItemId,entry.criterion.id,selection.selection!))}>Run semantic Validator</button>:null}
   {entry.policy==="visual_human"?<button disabled={props.busy||!validation.testerResultId||!summary.trim()} onClick={()=>act(()=>window.champcity.recordWorkflowWorkItemVisualCriterion({workflowId:props.workflowId,workItemId:props.workItemId,criterionId:entry.criterion.id,expectedCriterionVersion:entry.criterion.recordVersion,outcome,summary}))}>Record Operator visual Validation</button>:null}
   {entry.policy==="operator_decision"?<button disabled={props.busy||!validation.testerResultId||!summary.trim()} onClick={()=>act(()=>window.champcity.recordWorkflowWorkItemCriterionDecision({workflowId:props.workflowId,workItemId:props.workItemId,criterionId:entry.criterion.id,expectedCriterionVersion:entry.criterion.recordVersion,outcome:decision,rationale:summary}))}>Record Operator Decision</button>:null}
   {entry.policy==="deferred_visual_phase"?<span>Human visual evidence at Phase close</span>:null}
   {entry.repairable&&entry.outcome==="fail"&&(entry.decisionId||entry.validationIds.length)?<button disabled={props.busy} onClick={()=>act(async()=>{const result=await window.champcity.createWorkflowRepair(props.workflowId,props.workItemId,(entry.decisionId??entry.validationIds.at(-1))!);props.onRepair(result.repair.id);})}>Create Repair</button>:null}
  </li>)}</ul>
 </>:null}</section>;
}
