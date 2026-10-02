import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArchitectWorkspaceShell } from "./ArchitectWorkspaceShell";
import { FigmaDocumentCard } from "./FigmaDocumentCard";
import { validateArchitectCandidateOutput, type ArchitectCandidateOutput, type StructuredArchitectWorkspaceModel } from "../../shared/architectWorkspaceContracts";
import { WorkflowStageRail } from "./WorkflowStageRail";

export function StructuredArchitectWorkspace(props: {workflowId: string | null; browserCompanion: ReactNode; browserVisible: boolean; onRailStatus?: (status: StructuredArchitectWorkspaceModel["railStatus"]) => void;
  stageLabel?: string; onReturn?: () => void; onNext?: () => Promise<void>; supportControls?: ReactNode; refreshToken?: number}): JSX.Element {
  const [model, setModel] = useState<StructuredArchitectWorkspaceModel | null>(null);
  const [output, setOutput] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState("intake");
  const revision = model?.review?.cycleId ? `${model.review.cycleId}@${model.review.recordVersion}` : null;
  const slots = useMemo(() => [
    {slotId: "intake", displayLabel: model?.intakeDocumentLabel ?? (model?.workflowType === "project-creation" ? "Project Intake" : "Intake"), logicalDocumentId: model?.intakeDocument?.logicalDocumentId},
    ...(model?.reviewDocument ? [{slotId: "architect-review", displayLabel: "Architect Review", logicalDocumentId: model.reviewDocument.logicalDocumentId}] : []),
  ], [model]);
  const selectedDocument = selectedSlotId === "architect-review" ? model?.reviewDocument ?? null : model?.intakeDocument ?? null;
  const showingReview = selectedSlotId === "architect-review" && !!revision && !!model?.reviewDocument;
  function accept(next: StructuredArchitectWorkspaceModel, preferReview = false) {
    setModel(next); props.onRailStatus?.(next.railStatus);
    setSelectedSlotId((preferReview || next.reviewDocument) && next.reviewDocument ? "architect-review" : "intake");
  }
  useEffect(() => {
    let active = true;
    setModel(null); setSelectedSlotId("intake"); setError("");
    if (props.workflowId) window.champcity.getStructuredArchitectWorkspace(props.workflowId).then(next => {if (active) accept(next);}).catch(reason => {if (active) setError(String(reason));});
    else setError("Select the exact Workflow to open its Architect stage.");
    return () => {active = false;};
  }, [props.workflowId, props.refreshToken]);
  async function action(work: () => Promise<void>) {setBusy(true); setError(""); setFeedback(""); try {await work();} catch (reason) {setError(reason instanceof Error ? reason.message : String(reason));} finally {setBusy(false);}}
  const browserActions = <section className="figma-browser-actions-panel" aria-label="Browser Actions"><header><span>Browser Actions</span></header><div className="figma-browser-actions-row">
    <button disabled={busy} onClick={() => void action(async () => {await window.champcity.reloadArchitectBrowser();})}>Reload ChatGPT</button>
    <button disabled={busy || !props.workflowId} onClick={() => void action(async () => {accept(await window.champcity.prepareStructuredArchitectWorkspace(props.workflowId!)); setFeedback("Handoff prepared from current SQL Intake.");})}>Prepare / Refresh Handoff</button>
    <button disabled={busy || !model?.handoff} onClick={() => void action(async () => {await navigator.clipboard.writeText(model!.handoff!); setFeedback("Architect handoff copied.");})}>Copy Handoff</button>
  </div></section>;
  return <ArchitectWorkspaceShell label={model?.stageLabel ?? props.stageLabel ?? "Architect Workspace"} browserVisible={props.browserVisible} browserCompanion={props.browserCompanion} browserActions={browserActions}
    navigation={props.onReturn ? <button onClick={props.onReturn}>Back to Workflows</button> : null}
    context={<>{props.onReturn ? <WorkflowStageRail ariaLabel="Architect Workflow pipeline" stages={[
      {id: "intake", label: "Intake", statusLabel: model?.intakeRailStatus ?? "Open", state: "available", isRequired: !model?.ready, enabled: false},
      {id: "assessment", label: model?.stageLabel ?? props.stageLabel ?? "Architect Assessment", statusLabel: model?.railStatus ?? "Not Ready", state: "exact", isRequired: model?.railStatus !== "Completed", enabled: true, onClick: () => {}},
      {id: "planning", label: model?.workflowType === "issue-resolution" ? "Correction Planning" : "Planning", statusLabel: model?.nextStageReady && props.onNext ? "Open" : "Not Ready", state: "available", isRequired: !!model?.nextStageReady && !!props.onNext, enabled: !!model?.nextStageReady && !!props.onNext,
        onClick: props.onNext ? () => void action(props.onNext!) : undefined},
      ...[{id: "topology", label: "Work Item Map"}, {id: "execution", label: "Execution"}, {id: "validation", label: "Validation"}, {id: "close", label: "Close"}].map(stage => ({...stage, statusLabel: "Not Ready", state: "available" as const, isRequired: false, enabled: false})),
    ]} /> : null}</>}
    feedback={<>{error ? <p role="alert">{error}</p> : null}{feedback ? <p role="status">{feedback}</p> : null}{model?.materializationError ? <p role="alert">{model.materializationError}</p> : null}</>}
    reviewContent={<><FigmaDocumentCard selectedDocument={selectedDocument} documentError="" feedback="" slots={slots} selectedSlotId={selectedSlotId} onSelectSlot={slotId => setSelectedSlotId(slotId)} onCopy={() => void action(async () => {await navigator.clipboard.writeText(selectedDocument?.bodyMarkdown ?? selectedDocument?.preview ?? "");})} />
      {showingReview ? <section className="figma-disposition-panel architect-review-disposition" aria-label="Architect Review disposition"><header><span>Architect Review Decision</span></header>
        <label><span>Operator review notes</span><textarea value={notes} onChange={event => setNotes(event.target.value)} maxLength={4096} /></label>
        <div className="figma-disposition-row">{(["approved", "revision_requested", "rejected"] as const).map(outcome => <button className="apply-button" key={outcome} disabled={busy || !revision || outcome === "revision_requested" && !notes.trim()}
          onClick={() => void action(async () => {accept(await window.champcity.reviewStructuredArchitectOutput(props.workflowId!, model!.review!.cycleId, {expectedRecordVersion: model!.review!.recordVersion, outcome, notes})); setFeedback("Operator review recorded.");})}>
          {{approved: "Approve", revision_requested: "Revision Requested", rejected: "Reject"}[outcome]}</button>)}</div></section> : null}
      {!props.onReturn && props.onNext ? <button disabled={busy || !model?.nextStageReady} onClick={() => void action(props.onNext!)}>Continue to Project Planning</button> : null}
      {props.supportControls}
      {model?.supportRecords?.length ? <details><summary>Workflow supporting records</summary><ul>{model.supportRecords.map(record => <li key={record.id}><code>{record.id}</code> · {record.entityType === "Evidence" ? record.body.description : record.entityType === "Finding" ? record.body.title : record.entityType}</li>)}</ul></details> : null}
      <label>Architect structured JSON<textarea aria-label="Architect structured JSON" value={output} onChange={event => setOutput(event.target.value)} maxLength={100000} /></label>
      <button disabled={busy || !model?.ready || !output.trim()} onClick={() => void action(async () => {const parsed: unknown = JSON.parse(output); validateArchitectCandidateOutput(model!.workflowType!, parsed);
        accept(await window.champcity.saveStructuredArchitectOutput(props.workflowId!, {intakeId: model!.intakeId!, intakeVersion: model!.intakeVersion!, expectedCycleVersion: model!.cycleVersion, output: parsed as ArchitectCandidateOutput}), true); setOutput(""); setFeedback("Structured Architect output saved for review.");})}>Save Architect output</button></>}
    />;
}
