import {useEffect,useRef,useState} from "react";
import {WorkCardImplementShell,type WorkCardImplementContext} from "./WorkCardImplementShell";
import {selectionBlocker,type CodexManagedRuntimeStatus,type CodexModelSelection} from "../../shared/codexRuntimeContracts";
import type {ChampCityApi,CodexImplementerExecutionModel} from "../../shared/workspaceContracts";
type Planning=Awaited<ReturnType<ChampCityApi["getStructuredWorkItemPlanning"]>>;
type Report=Awaited<ReturnType<ChampCityApi["getImplementationAttempt"]>>;
export function WorkCardImplementWorkspace(props:{readOnly?:boolean;workflowId:string;workItemId:string;onNext:()=>void}):JSX.Element {
 const [planning,setPlanning]=useState<Planning|null>(null),[report,setReport]=useState<Report>(null),[execution,setExecution]=useState<CodexImplementerExecutionModel|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const generation=useRef(0);
 const actionInFlight=useRef(false);
 const selection=useCodexModelSelection(!!props.readOnly||busy||execution?.state==="running");
 const [parentWorkItemId,setParentWorkItemId]=useState<string|undefined>(undefined);
 const exact=planning?.workflowId===props.workflowId&&planning.workItem.id===props.workItemId&&planning.workflowType==="project-creation";
 async function refresh(token=generation.current){
  const [nextPlanning,nextReport,nextExecution,nextProjection]=await Promise.all([window.champcity.getStructuredWorkItemPlanning(props.workflowId,props.workItemId),window.champcity.getImplementationAttempt(props.workflowId,props.workItemId),window.champcity.getWorkflowWorkItemCodexExecutionStatus(props.workflowId,props.workItemId),window.champcity.getWorkflowExecutionProjection(props.workflowId)]);
  if(token!==generation.current)return;
  if(nextPlanning.workflowId!==props.workflowId||nextPlanning.workItem.id!==props.workItemId||nextPlanning.workflowType!=="project-creation"||nextReport&&(nextReport.attempt.body.workflowId!==props.workflowId||nextReport.attempt.body.workItemId!==props.workItemId))throw Error("Exact Greenfield Implement context changed.");
  if(nextProjection.plan.workflow.id!==props.workflowId)throw Error("Exact Workflow lineage changed.");
  setParentWorkItemId(nextProjection.plan.repairIds.find(edge=>edge.from===props.workItemId)?.to);
  setPlanning(nextPlanning);setReport(nextReport);setExecution(nextExecution);setError("");
 }
 useEffect(()=>{const token=++generation.current;setPlanning(null);setReport(null);setExecution(null);setParentWorkItemId(undefined);setBusy(false);actionInFlight.current=false;setError("");void refresh(token).catch(reason=>{if(token===generation.current)setError(String(reason));});return()=>{generation.current++;};},[props.workflowId,props.workItemId]);
 useEffect(()=>{if(execution?.state!=="running")return;const token=generation.current;const timer=window.setInterval(()=>void refresh(token).catch(reason=>{if(token===generation.current)setError(String(reason));}),1500);return()=>window.clearInterval(timer);},[execution?.state,props.workflowId,props.workItemId]);
 async function action(work:()=>Promise<unknown>,mutation=true){if(mutation&&props.readOnly||!exact||busy||actionInFlight.current)return;const token=generation.current;actionInFlight.current=true;setBusy(true);setError("");try{await work();await refresh(token);}catch(reason){if(token===generation.current)setError(String(reason));}finally{if(token===generation.current){actionInFlight.current=false;setBusy(false);}}}
 const currentReport=report?.attempt.body.workflowId===props.workflowId&&report.attempt.body.workItemId===props.workItemId?report:null;
 const context:WorkCardImplementContext|null=exact?{workCardId:planning.workItem.body.candidateKey??planning.workItem.id,workCardTitle:planning.workItem.body.title,implementationContractLabel:planning.workItem.body.workItemKind==="repair"||planning.workItem.body.workItemKind==="fix"?"Approved Repair Work Card Contract":"Approved Work Card Contract",implementationContractType:planning.workItem.body.workItemKind==="repair"||planning.workItem.body.workItemKind==="fix"?"repair-work-card":"formal-work-card",formalWorkCardPath:`project-state:${planning.workItem.id}`,formalWorkCardRevision:planning.workItem.body.contractRevision??planning.workItem.recordVersion,parentWorkCardId:parentWorkItemId,implementerReportPath:currentReport?`project-state:${currentReport.attempt.id}`:"Prepared when Implement starts",report:currentReport?{disposition:currentReport.attempt.body.attemptState==="prepared"?"Pending":currentReport.attempt.body.attemptState,artifactRevision:currentReport.attempt.recordVersion}:null,reportMissing:!currentReport||currentReport.attempt.body.attemptState==="completed"&&["planned","ready"].includes(planning.workItem.body.workState),reportReadiness:currentReport?.attempt.body.attemptState??"missing",reportReadinessReason:execution?.failureReason??"Exact SQL execution/report reservation.",canExecute:!props.readOnly&&!error&&planning.review.disposition.state==="approved"&&!!execution?.canRunAgain&&execution.state!=="running"&&execution.state!=="unavailable"}:null;
 return <WorkCardImplementShell context={context} modelSelection={selection} codexExecution={execution} isCodexActionRunning={!!props.readOnly||busy} documentError={error} feedback=""
  onRunCodex={value=>{if(context?.canExecute&&selection.canRun)void action(()=>window.champcity.startWorkflowWorkItemCodexExecution(props.workflowId,props.workItemId,value));}}
  onCancelCodex={()=>void action(()=>window.champcity.cancelCodexImplementerExecution({workflowId:props.workflowId,workItemId:props.workItemId}))} onResolveEnvironment={()=>void refresh()}
  onRespondToCodexApproval={(requestId,decision)=>void action(()=>window.champcity.respondToCodexApproval({workflowId:props.workflowId,workItemId:props.workItemId,requestId,decision}))}
  onRespondToCodexUserInput={(requestId,answers)=>void action(()=>window.champcity.respondToCodexUserInput({workflowId:props.workflowId,workItemId:props.workItemId,requestId,answers}))}
  onRespondToCodexMcpElicitation={(requestId,kind,content)=>void action(()=>window.champcity.respondToCodexMcpElicitation({workflowId:props.workflowId,workItemId:props.workItemId,requestId,action:kind,content}))}
  navigation={<div className="codex-execution-actions work-card-implement-navigation"><button className="apply-button codex-command secondary" type="button" onClick={()=>void refresh()}>Refresh</button><button className="apply-button codex-command" type="button" disabled={props.readOnly||!exact||busy||!!error||currentReport?.attempt.body.attemptState!=="completed"} onClick={props.onNext}>Continue to Review & Validation</button></div>}/ >;
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
