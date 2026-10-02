import {useEffect, useState, type ReactNode} from "react";
import {PlanReviewShell} from "./PlanReviewShell";
import type {createStructuredPhaseLoopService} from "../../main/phasePlanning/structuredPhaseLoopService";

export function StructuredPhaseLoopWorkspace(props: {workflowId: string | null; phaseId?: string; stageKind: "interview" | "planning"; browserPanel: ReactNode; onNext: () => Promise<void>}) {
  const [model, setModel] = useState<Awaited<ReturnType<ReturnType<typeof createStructuredPhaseLoopService>["get"]>> | null>(null), [error, setError] = useState("");
  const refresh = async () => {if (props.workflowId && props.phaseId) setModel(await window.champcity.getStructuredPhaseLoop(props.workflowId, props.phaseId, props.stageKind));};
  useEffect(() => {let current = true; setModel(null); setError(""); if (props.workflowId && props.phaseId) window.champcity.getStructuredPhaseLoop(props.workflowId, props.phaseId, props.stageKind).then(model => {if (current) setModel(model);}).catch(reason => {if (current) setError(String(reason));}); return () => {current = false;};}, [props.workflowId, props.phaseId, props.stageKind]);
  if (!props.workflowId || !props.phaseId) return <p role="alert">Select the exact current Greenfield Phase.</p>;
  return <>{error ? <p role="alert">{error}</p> : null}<PlanReviewShell title={props.stageKind === "interview" ? "Phase Interview" : "Phase Planning and Work Card Plan"} workflowId={props.workflowId} browserPanel={props.browserPanel} handoff={model?.handoff} projection={model?.review?.markdown} revision={model?.review?.cycle.recordVersion} cycleId={model?.review?.cycle.id} disposition={model?.review?.disposition.state} staleReason={model?.staleReview?.reason}
    onPrepare={refresh} onSave={async json => {const input = JSON.parse(json); setModel(await window.champcity.saveStructuredPhaseLoop(props.workflowId!, props.phaseId!, props.stageKind, {...input, expectedRecordVersion: model?.review?.cycle.recordVersion ?? model?.staleReview?.recordVersion}));}}
    onReview={async input => setModel(await window.champcity.reviewStructuredPhaseLoop(props.workflowId!, props.phaseId!, props.stageKind, model!.review!.cycle.id, input))} />
    {model?.review?.disposition.state === "approved" ? <button onClick={() => void props.onNext().catch(reason => setError(String(reason)))}>Continue to {props.stageKind === "interview" ? "Phase Planning" : "WorkItem execution"}</button> : null}</>;
}
