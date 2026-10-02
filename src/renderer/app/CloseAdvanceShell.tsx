import type {ReactNode} from "react";
import type {CloseAdvanceProjection} from "../../shared/closeAdvanceContracts";
/** SQL identities and typed callbacks only; closeout files do not participate. */
export function CloseAdvanceShell(props:{projection:CloseAdvanceProjection|null;rationale:string;onRationale:(value:string)=>void;onClose:()=>void;onKeepOpen:()=>void;onNext:()=>void;children?:ReactNode}){
 const view=props.projection;if(!view)return <p role="status">Loading SQL close eligibility...</p>;
 return <section aria-label="Close and advance"><h2>{view.label} close / advance</h2><p><code>{view.entityId}</code> | revision {view.expectedVersion} | {view.sourceMode}</p><p>{view.closed?"Closed by SQL lifecycle":view.eligible?"Current proof permits closure":"Closure is blocked"}</p><ul>{view.blockers.map(blocker=><li key={blocker}>{blocker}</li>)}</ul>{props.children}
 {!view.closed&&<><label>Disposition rationale<textarea value={props.rationale} maxLength={4000} onChange={event=>props.onRationale(event.target.value)}/></label><button disabled={!view.eligible||!props.rationale.trim()} onClick={props.onClose}>{view.sourceMode==="source-backed"&&view.scope==="workflow"?"Advance to integration":"Close "+view.label}</button><button disabled={!props.rationale.trim()} onClick={props.onKeepOpen}>Keep open</button></>}
 <p>Next: {view.next.label} - <code>{view.next.entityId??view.next.workspaceId}</code></p><button disabled={!view.closed&&!view.advanceReady} onClick={props.onNext}>Continue to {view.next.label}</button></section>;
}
