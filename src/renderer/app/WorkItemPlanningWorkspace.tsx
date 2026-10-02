import {useEffect, useState, type ReactNode} from "react";
import {PlanReviewShell} from "./PlanReviewShell";

export function WorkItemPlanningWorkspace(props: {workflowId: string; workItemId: string; browserPanel: ReactNode; onChanged: () => Promise<void>; onNext?: () => Promise<void>}) {
  const [model, setModel] = useState<Awaited<ReturnType<typeof window.champcity.getStructuredWorkItemPlanning>> | null>(null), [error, setError] = useState(""), [proposal, setProposal] = useState("");
  const refresh = async () => setModel(await window.champcity.getStructuredWorkItemPlanning(props.workflowId, props.workItemId));
  useEffect(() => {let current = true; setModel(null); setError(""); window.champcity.getStructuredWorkItemPlanning(props.workflowId, props.workItemId).then(next => {if (current) setModel(next);}).catch(reason => {if (current) setError(String(reason));}); return () => {current = false;};}, [props.workflowId, props.workItemId]);
  return <>{error ? <p role="alert">{error}</p> : null}<PlanReviewShell title="Architect WorkItem Planning" workflowId={props.workflowId} browserPanel={props.browserPanel} handoff={model?.handoff} projection={model?.markdown} revision={model?.workItem.body.contractRevision ? model.workItem.recordVersion : undefined} cycleId={model?.workItem.id} disposition={model?.review.disposition.state} onPrepare={refresh}
    onSave={async json => {setModel(await window.champcity.saveStructuredWorkItemPlanning(props.workflowId, props.workItemId, json)); await props.onChanged();}}
    onReview={async input => {setModel(await window.champcity.reviewStructuredWorkItemPlanning(props.workflowId, props.workItemId, input)); await props.onChanged();}} />
    <details><summary>Explicit typed decomposition</summary><label>Architect contract with decomposition proposal<textarea maxLength={200000} value={proposal} onChange={event => setProposal(event.target.value)} /></label><button disabled={!proposal.trim()} onClick={() => void window.champcity.decomposeStructuredWorkItemPlanning(props.workflowId, props.workItemId, proposal).then(props.onChanged).catch(reason => setError(String(reason)))}>Accept typed decomposition</button></details>
    {props.onNext && model?.review.disposition.state === "approved" ? <button onClick={() => void props.onNext!().catch(reason => setError(String(reason)))}>Continue to Work Card Building</button> : null}</>;
}
