import {useEffect, useState, type ReactNode} from "react";
import {PlanReviewShell} from "./PlanReviewShell";
import {WorkflowPlanningMap} from "./WorkflowPlanningMap";
import type {createStructuredPhaseMapService} from "../../main/phaseMap/structuredPhaseMapService";

export function StructuredPhaseMapWorkspace(props: {workflowId: string | null; browserPanel: ReactNode; onNext: () => Promise<void>}): JSX.Element {
  const [model, setModel] = useState<Awaited<ReturnType<ReturnType<typeof createStructuredPhaseMapService>["get"]>> | null>(null), [error, setError] = useState("");
  useEffect(() => {let active = true; if (props.workflowId) window.champcity.getStructuredPhaseMap(props.workflowId).then(next => {if (active) setModel(next);}).catch(reason => {if (active) setError(String(reason));}); return () => {active = false;};}, [props.workflowId]);
  if (!props.workflowId) return <p role="alert">Select exact Greenfield Workflow.</p>;
  return <>{error ? <p role="alert">{error}</p> : null}{model?.plan ? <><WorkflowPlanningMap plan={model.plan} accepted /><button onClick={() => void props.onNext().catch(reason => setError(String(reason)))}>Continue to next Phase</button></> : <PlanReviewShell title="Project Phase Map" workflowId={props.workflowId} browserPanel={props.browserPanel} handoff={model?.handoff} projection={model?.review?.markdown} revision={model?.review?.cycle.recordVersion} cycleId={model?.review?.cycle.id} disposition={model?.review?.disposition.state}
    onPrepare={async () => setModel(await window.champcity.getStructuredPhaseMap(props.workflowId!))}
    onSave={async json => setModel(await window.champcity.saveStructuredPhaseMap(props.workflowId!, {...JSON.parse(json), expectedRecordVersion: model?.review?.cycle.recordVersion}))}
    onReview={async input => setModel(await window.champcity.reviewStructuredPhaseMap(props.workflowId!, model!.review!.cycle.id, input))} />}</>;
}
