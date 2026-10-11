import {useEffect,useRef,useState} from "react";
import {WorkCardImplementShell,type WorkCardImplementContext} from "./WorkCardImplementShell";
import {selectionBlocker,type CodexManagedRuntimeStatus,type CodexModelSelection} from "../../shared/codexRuntimeContracts";
import type {ChampCityApi,CodexImplementerExecutionModel} from "../../shared/workspaceContracts";
type Planning=Awaited<ReturnType<ChampCityApi["getStructuredWorkItemPlanning"]>>;
type Report=Awaited<ReturnType<ChampCityApi["getImplementationAttempt"]>>;
export function WorkCardImplementWorkspace(props:{readOnly?:boolean;workflowId:string;workItemId:string;onNext:()=>void|Promise<void>;onRefreshNavigation?:()=>Promise<void>}):JSX.Element {
 const [planning,setPlanning]=useState<Planning|null>(null),[report,setReport]=useState<Report>(null),[execution,setExecution]=useState<CodexImplementerExecutionModel|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const generation=useRef(0);
 const actionInFlight=useRef(false);
 const selection=useCodexModelSelection(!!props.readOnly||busy||execution?.state==="running");
 const [parentWorkItemId,setParentWorkItemId]=useState<string|undefined>(undefined);
 const [navigation,setNavigation]=useState<Awaited<ReturnType<ChampCityApi["getGreenfieldNavigation"]>>|null>(null),[latestResult,setLatestResult]=useState<import("../../shared/projectState/domainContracts").ProjectStateRecord<"ImplementationRecord">|null>(null),[feedback,setFeedback]=useState(""),[revisionReason,setRevisionReason]=useState("");
 const [preExecutionStartFailed,setPreExecutionStartFailed]=useState(false);
 const exact=planning?.workflowId===props.workflowId&&planning.workItem.id===props.workItemId&&planning.workflowType==="project-creation";
 async function refresh(token=generation.current,preserveExecution=false){
  const [nextReport,nextExecution,nextProjection,nextNavigation]=await Promise.all([window.champcity.getImplementationAttempt(props.workflowId,props.workItemId),window.champcity.getWorkflowWorkItemCodexExecutionStatus(props.workflowId,props.workItemId),window.champcity.getWorkflowExecutionProjection(props.workflowId),window.champcity.getGreenfieldNavigation(props.workflowId)]);
  if(token!==generation.current)return;
  // Both status and eligibility verify reservations through the existing SQL transaction guard.
  // Sequence those reads so separate connections do not contend for the same writer lock.
  const nextPlanning=await window.champcity.getStructuredWorkItemPlanning(props.workflowId,props.workItemId);
  if(token!==generation.current)return;
  if(nextPlanning.workflowId!==props.workflowId||nextPlanning.workItem.id!==props.workItemId||nextPlanning.workflowType!=="project-creation"||nextReport&&(nextReport.attempt.body.workflowId!==props.workflowId||nextReport.attempt.body.workItemId!==props.workItemId))throw Error("Exact Greenfield Implement context changed.");
  if(nextProjection.plan.workflow.id!==props.workflowId||nextNavigation.workflowId!==props.workflowId)throw Error("Exact Workflow lineage changed.");
  const result=nextProjection.items.find(item=>item.record.id===props.workItemId)?.implementationAttempts.at(-1)??null;
  if(result&&(result.body.workItemId!==props.workItemId))throw Error("Exact implementation result changed.");
  setNavigation(nextNavigation);setLatestResult(result);
  setParentWorkItemId(nextProjection.plan.repairIds.find(edge=>edge.from===props.workItemId)?.to);
  setPlanning(nextPlanning);setReport(nextReport);if(!preserveExecution)setExecution(nextExecution);setError("");setPreExecutionStartFailed(false);
 }
 useEffect(()=>{const token=++generation.current;setPlanning(null);setReport(null);setExecution(null);setNavigation(null);setLatestResult(null);setFeedback("");setRevisionReason("");setParentWorkItemId(undefined);setBusy(false);actionInFlight.current=false;setError("");void refresh(token).catch(reason=>{if(token===generation.current)setError(String(reason));});return()=>{generation.current++;};},[props.workflowId,props.workItemId]);
 useEffect(()=>{if(execution?.state!=="running")return;const token=generation.current;const timer=window.setInterval(()=>void refresh(token).catch(reason=>{if(token===generation.current)setError(String(reason));}),1500);return()=>window.clearInterval(timer);},[execution?.state,props.workflowId,props.workItemId]);
 async function action(work:()=>Promise<unknown>,mutation=true){if(mutation&&props.readOnly||!exact||busy||actionInFlight.current)return;const token=generation.current;actionInFlight.current=true;setBusy(true);setError("");setFeedback("");try{await work();await refresh(token);}catch(reason){if(token===generation.current)setError(String(reason));}finally{if(token===generation.current){actionInFlight.current=false;setBusy(false);}}}
 async function start(selection:CodexModelSelection){
  if(props.readOnly||!exact||busy||actionInFlight.current)return;
  const token=generation.current;actionInFlight.current=true;setBusy(true);setError("");setFeedback("");
  try{
   const result=await window.champcity.startWorkflowWorkItemCodexExecution(props.workflowId,props.workItemId,selection);
   if(token!==generation.current)return;
   setExecution(result);
   if(result.state!=="ready"&&result.state!=="running"){
    // A returned failure can leave a durable reservation, or an already begun attempt.
    // Reconcile SQL in the existing sequential order while retaining the Start diagnostic.
    try{await refresh(token,true);}
    catch(refreshReason){if(token===generation.current){setPreExecutionStartFailed(false);setError(`Start result refresh failed: ${String(refreshReason).slice(0,1024)}`);}}
   }
  }catch(reason){try{await refresh(token);if(token===generation.current){setPreExecutionStartFailed(true);setError(String(reason));}}catch(refreshReason){if(token===generation.current){setPreExecutionStartFailed(false);setError(`Start failed: ${String(reason)}; refresh failed: ${String(refreshReason)}`);}}}
  finally{if(token===generation.current){actionInFlight.current=false;setBusy(false);}}
 }
 const currentReport=report?.attempt.body.workflowId===props.workflowId&&report.attempt.body.workItemId===props.workItemId?report:null;
 const resultMatches=!!latestResult&&latestResult.id===currentReport?.attempt.body.implementationRecordId&&latestResult.body.executionRef===currentReport.attempt.id;
 const exactNavigation=navigation?.workflowId===props.workflowId&&navigation.currentWorkItemId===props.workItemId;
 const semanticBlocked=resultMatches&&latestResult.body.outcome==="blocked"&&planning?.workItem.body.workState==="blocked";
 const unsuccessful=resultMatches&&currentReport?.attempt.body.attemptState==="completed"&&(semanticBlocked||["partial","failed","abandoned"].includes(latestResult.body.outcome)&&planning?.workItem.body.workState==="ready");
 const prepared=currentReport?.attempt.body.attemptState==="prepared"&&currentReport.attempt.body.workItemVersion===planning?.workItem.recordVersion&&!currentReport.attempt.body.implementationRecordId&&(!latestResult||latestResult.body.executionRef!==currentReport.attempt.id&&["partial","failed","abandoned"].includes(latestResult.body.outcome))&&["planned","ready"].includes(planning?.workItem.body.workState??"")&&planning?.review.disposition.state==="approved";
 const checkpointFulfilled=execution?.checkpoint?.status==="committed"||execution?.checkpoint?.status==="not-required"&&planning?.workItem.body.affectedPaths?.length===0;
 const canContinue=!props.readOnly&&!!exact&&!busy&&!error&&execution?.state!=="running"&&exactNavigation&&navigation.currentWorkspace==="work-card-report-review"&&resultMatches&&currentReport?.attempt.body.attemptState==="completed"&&latestResult.body.outcome==="implemented"&&planning?.workItem.body.workState==="validation_pending"&&checkpointFulfilled;
 const canRevise=!props.readOnly&&!!exact&&!busy&&(!error||preExecutionStartFailed&&prepared)&&execution?.state!=="running"&&exactNavigation&&navigation.currentWorkspace==="work-card-building-review"&&(unsuccessful||prepared)&&planning?.revisionEligibility?.eligible===true;
 async function explicitRefresh(){const token=generation.current;if(busy||actionInFlight.current)return;actionInFlight.current=true;setBusy(true);setFeedback("");try{await refresh(token);if(token!==generation.current)return;if(!props.readOnly)await props.onRefreshNavigation?.();if(token===generation.current)setFeedback("SQL Implement context and current navigation refreshed.");}catch(reason){if(token===generation.current)setError(`Refresh failed: ${String(reason)}`);}finally{if(token===generation.current){actionInFlight.current=false;setBusy(false);}}}
 async function requestRevision(){
  if(!canRevise||!revisionReason.trim()||!planning)return;
  const token=generation.current;
  await action(async()=>{
   await window.champcity.reviewStructuredWorkItemPlanning(props.workflowId,props.workItemId,{expectedRecordVersion:planning.workItem.recordVersion,outcome:"revision_requested",notes:revisionReason.trim()});
   if(token!==generation.current)return;
   await refresh(token);
   if(token===generation.current)await props.onNext();
  });
 }
 const context:WorkCardImplementContext|null=exact?{workCardId:planning.workItem.body.candidateKey??planning.workItem.id,workCardTitle:planning.workItem.body.title,implementationContractLabel:planning.workItem.body.workItemKind==="repair"||planning.workItem.body.workItemKind==="fix"?"Approved Repair Work Card Contract":"Approved Work Card Contract",implementationContractType:planning.workItem.body.workItemKind==="repair"||planning.workItem.body.workItemKind==="fix"?"repair-work-card":"formal-work-card",formalWorkCardPath:`project-state:${planning.workItem.id}`,formalWorkCardRevision:planning.workItem.body.contractRevision??planning.workItem.recordVersion,parentWorkCardId:parentWorkItemId,implementerReportPath:currentReport?`project-state:${currentReport.attempt.id}`:"Prepared when Implement starts",report:currentReport?{disposition:currentReport.attempt.body.attemptState==="prepared"?"Pending":currentReport.attempt.body.attemptState,artifactRevision:currentReport.attempt.recordVersion}:null,reportMissing:!currentReport||currentReport.attempt.body.attemptState==="completed"&&["planned","ready"].includes(planning.workItem.body.workState),reportReadiness:currentReport?.attempt.body.attemptState??"missing",reportReadinessReason:execution?.failureReason??"Exact SQL execution/report reservation.",canExecute:!props.readOnly&&!error&&!semanticBlocked&&planning.review.disposition.state==="approved"&&!!execution?.canRunAgain&&execution.state!=="running"&&execution.state!=="unavailable"}:null;
 return <WorkCardImplementShell context={context} modelSelection={selection} codexExecution={execution} isCodexActionRunning={!!props.readOnly||busy} documentError={error} feedback={feedback}
  onRunCodex={value=>{if(context?.canExecute&&selection.canRun)void start(value);}}
  onCancelCodex={()=>void action(()=>window.champcity.cancelCodexImplementerExecution({workflowId:props.workflowId,workItemId:props.workItemId}))} onResolveEnvironment={()=>void explicitRefresh()}
  onRespondToCodexApproval={(requestId,decision)=>void action(()=>window.champcity.respondToCodexApproval({workflowId:props.workflowId,workItemId:props.workItemId,requestId,decision}))}
  onRespondToCodexUserInput={(requestId,answers)=>void action(()=>window.champcity.respondToCodexUserInput({workflowId:props.workflowId,workItemId:props.workItemId,requestId,answers}))}
  onRespondToCodexMcpElicitation={(requestId,kind,content)=>void action(()=>window.champcity.respondToCodexMcpElicitation({workflowId:props.workflowId,workItemId:props.workItemId,requestId,action:kind,content}))}
  navigation={<><div className="codex-execution-actions work-card-implement-navigation"><button className="apply-button codex-command secondary" type="button" disabled={busy} onClick={()=>void explicitRefresh()}>Refresh</button><button className="apply-button codex-command" type="button" disabled={!canContinue} onClick={()=>{if(canContinue)void action(()=>Promise.resolve(props.onNext()),false);}}>Continue to Review & Validation</button></div>
   {unsuccessful?<p role="status">The latest Implement result is {latestResult.body.outcome}. Review &amp; Validation and Tester are not yet eligible. Complete the approved contract or request a governed Work Card revision.{planning?.revisionEligibility?.reason?` ${planning.revisionEligibility.reason}`:""}</p>:null}
   {prepared?<p role="status">The implementation reservation is prepared and has not started. Review &amp; Validation and Tester are not yet eligible.{planning?.revisionEligibility?.reason?` ${planning.revisionEligibility.reason}`:" Request a governed Work Card revision if the approved contract needs correction."}</p>:null}
   {canRevise?<div><label>Revision Requested reason<textarea aria-label="Revision Requested reason" maxLength={4096} value={revisionReason} onChange={event=>setRevisionReason(event.target.value)}/></label><button type="button" disabled={!revisionReason.trim()} onClick={()=>void requestRevision()}>Request Work Card Revision</button></div>:null}</>}/ >;
}

export function useCodexModelSelection(disabled: boolean) {
  const [runtime, setRuntime] = useState<CodexManagedRuntimeStatus | null>(null);
  const [draft, setDraft] = useState<CodexModelSelection | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    const refresh = () => {
      void window.champcity.getCodexManagedRuntimeStatus().then((status) => { if (alive) setRuntime(status); })
        .catch(() => { if (alive) setError("Could not read Codex runtime status."); });
    };
    refresh();
    const timer = window.setInterval(refresh, 1500);
    return () => { alive = false; window.clearInterval(timer); };
  }, []);
  const selection = draft ?? runtime?.selection ?? null;
  const locked = disabled || saving || Boolean(runtime?.busy) || !runtime || ["initializing", "checking", "unavailable"].includes(runtime.updateState);
  const blocker = selectionBlocker(runtime?.catalog ?? [], selection) ?? (draft ? null : runtime?.selectionBlocker);
  async function save(value: CodexModelSelection) {
    setDraft(value);
    setSaving(true);
    setError("");
    try { setRuntime(await window.champcity.setCodexModelSelection(value)); setDraft(null); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save Codex selection."); }
    finally { setSaving(false); }
  }
  const model = runtime?.catalog.find((entry) => entry.model === selection?.model);
  const controls = <div className="codex-model-selection" aria-label="Codex model selection">
    <label>Model <select aria-label="Model" disabled={locked || !runtime?.catalog.length} value={selection?.model ?? ""}
      onChange={(event) => { setDraft({ model: event.target.value, reasoningEffort: "" }); setError(""); }}>
      <option value="">Choose model</option>
      {selection?.model && !model ? <option value={selection.model}>{selection.model} (unavailable)</option> : null}
      {runtime?.catalog.map((entry) => <option key={entry.id} value={entry.model}>{entry.displayName}</option>)}
    </select></label>
    <label>Reasoning <select aria-label="Reasoning" disabled={locked || !model} value={selection?.reasoningEffort ?? ""}
      onChange={(event) => {
        if (!selection) return;
        const next = { model: selection.model, reasoningEffort: event.target.value };
        if (next.reasoningEffort) void save(next);
        else setDraft(next);
      }}>
      <option value="">Choose reasoning</option>
      {model?.supportedReasoningEfforts.map((effort) => <option key={effort} value={effort}>{effort.charAt(0).toUpperCase() + effort.slice(1)}</option>)}
    </select></label>
    <small>Codex {runtime?.version ?? "version pending"} · {runtime?.updateState ?? "initializing"} · {runtime?.message ?? "Checking runtime…"}</small>
    {error || blocker ? <p role="status">{error || blocker}</p> : null}
  </div>;
  return { controls, selection, canRun: Boolean(runtime && selection && !blocker && !locked && !draft && !error) };
}
