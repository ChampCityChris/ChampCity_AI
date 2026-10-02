import {useEffect, useState, type ReactNode} from "react";
import {PlanReviewShell} from "./PlanReviewShell";
import type {createStructuredProjectPlanningService} from "../../main/projectPlanning/structuredProjectPlanningService";

export function StructuredProjectPlanningWorkspace(props: {workflowId: string | null; browserPanel: ReactNode; onNext: () => void; onRailStatus?: (status: "Open" | "Completed" | "Awaiting Approval" | "Not Ready") => void}): JSX.Element {
  const [model, setModel] = useState<Awaited<ReturnType<ReturnType<typeof createStructuredProjectPlanningService>["get"]>> | null>(null), [error, setError] = useState("");
  function accept(next: NonNullable<typeof model>) {setModel(next); props.onRailStatus?.(next.review?.disposition.state === "approved" ? "Completed" : next.review ? "Awaiting Approval" : "Open");}
  useEffect(() => {let active = true; setModel(null); if (props.workflowId) window.champcity.getStructuredProjectPlanning(props.workflowId).then(next => {if (active) accept(next);}).catch(reason => {if (active) {setError(String(reason)); props.onRailStatus?.("Not Ready");}}); return () => {active = false;};}, [props.workflowId]);
  if (!props.workflowId) return <p role="alert">Select exact Project Creation Workflow.</p>;
  return <>{error ? <p role="alert">{error}</p> : null}<PlanReviewShell title="Project Planning" workflowId={props.workflowId} browserPanel={props.browserPanel} handoff={model?.handoff} projection={model?.review?.markdown} revision={model?.review?.recordVersion} cycleId={model?.review?.cycleId} disposition={model?.review?.disposition.state} staleReason={model?.staleReview?.reason}
    onPrepare={async () => accept(await window.champcity.getStructuredProjectPlanning(props.workflowId!))}
    onSave={async json => accept(await window.champcity.saveStructuredProjectPlanning(props.workflowId!, {...JSON.parse(json), expectedRecordVersion: model?.review?.recordVersion ?? model?.staleReview?.recordVersion}))}
    onReview={async input => accept(await window.champcity.reviewStructuredProjectPlanning(props.workflowId!, model!.review!.cycleId, input))} />
    <button disabled={model?.review?.disposition.state !== "approved"} onClick={props.onNext}>Continue to Phase Map</button></>;
}
