import {useEffect,useRef,useState} from "react";
import {WorkCardCloseShell} from "./WorkCardCloseShell";
import type {ChampCityApi} from "../../shared/workspaceContracts";
type Review=Awaited<ReturnType<ChampCityApi["getStructuredWorkItemReview"]>>;
/** Terminal SQL evidence only. Closure already belongs to aggregate validation. */
export function WorkCardCloseWorkspace(props:{readOnly?:boolean;workflowId:string;phaseId:string;workItemId:string;onReturn:()=>void}):JSX.Element {
 const [review,setReview]=useState<Review|null>(null),[error,setError]=useState(""),[report,setReport]=useState("");const generation=useRef(0);
 useEffect(()=>{const token=++generation.current;setReview(null);setError("");setReport("");void Promise.all([window.champcity.getStructuredWorkItemReview(props.workflowId,props.workItemId),window.champcity.getImplementationAttempt(props.workflowId,props.workItemId)]).then(([next,attempt])=>{if(token!==generation.current)return;if(next.workflowId!==props.workflowId||next.workItem.id!==props.workItemId||next.workItem.body.workState!=="closed")throw Error("Work Card Close requires the exact SQL closed WorkItem.");setReview(next);setReport(attempt?.markdown??"");}).catch(reason=>{if(token===generation.current)setError(String(reason));});return()=>{generation.current++;};},[props.workflowId,props.phaseId,props.workItemId]);
 const closed=review?.workflowId===props.workflowId&&review.workItem.id===props.workItemId&&review.workItem.body.workState==="closed";
 if(!closed)return <p role="status">{error||"Loading exact SQL closed Work Card…"}</p>;
 const records=[...(review.cycle?[review.cycle.cycle]:[]),...review.implementations,...review.testers];
 return <WorkCardCloseShell actionError={error} actionFeedback="" actionLabel="Return to Phase Building / Next Work Card" actingLabel="Returning..." ariaLabel="Work Card Close workspace" canAct={!props.readOnly&&!!closed&&!error} evidence={records.map(record=>({path:`project-state:${record.id}`,displayName:record.entityType,disposition:record.lifecycleState,readState:"readable"}))}
 fields={[{label:"Phase ID",value:props.phaseId},{label:"Work Card ID",value:props.workItemId},{label:"Return Target",value:"phase-work-card-selection"},{label:"Repair Lineage",value:review.repairs.map(edge=>`${edge.repairId} repairs ${edge.parentId}`).join("; ")||"No Repair"}]}
 identityLine={`${props.phaseId} / ${props.workItemId}`} isActing={false} nextWorkspace="Work Card Map" onAction={()=>{if(!props.readOnly)props.onReturn();}} projectionAction="SQL WorkItem closed" reason="Exact SQL WorkItem is closed. Return navigation does not create another Decision." stateLabel="Closed" title={`${review.workItem.body.candidateKey??props.workItemId} - ${review.workItem.body.title}`} evidenceDetail={<details><summary>Final Validation / Implementer / Tester / Repair Context</summary><pre>{report+"\n\n"+review.markdown}</pre></details>}/>;
}
