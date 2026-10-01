import { useEffect, useState, type ReactNode } from "react";
import { ArchitectWorkspaceShell } from "./ArchitectWorkspaceShell";
import { FigmaDocumentCard } from "./FigmaDocumentCard";
import { validateGreenfieldArchitectOutput, type StructuredArchitectWorkspaceModel } from "../../shared/architectWorkspaceContracts";

export function StructuredGreenfieldArchitectWorkspace(props: {workflowId: string | null; browserCompanion: ReactNode; browserVisible: boolean; onRailStatus: (status: StructuredArchitectWorkspaceModel["railStatus"]) => void}): JSX.Element {
  const [model, setModel] = useState<StructuredArchitectWorkspaceModel | null>(null);
  const [output, setOutput] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [viewed, setViewed] = useState<string | null>(null);
  const revision = model?.review ? `${model.review.cycleId}@${model.review.recordVersion}` : null;
  function accept(next: StructuredArchitectWorkspaceModel) { setModel(next); props.onRailStatus(next.railStatus); }
  useEffect(() => {
    let active = true;
    setModel(null); setViewed(null); setError("");
    if (props.workflowId) window.champcity.getStructuredArchitectWorkspace(props.workflowId).then(next => {if (active) accept(next);}).catch(reason => {if (active) setError(String(reason));});
    else setError("Select the exact Project Creation Workflow to open Architect Interview.");
    return () => {active = false;};
  }, [props.workflowId]);
  async function action(work: () => Promise<void>) {setBusy(true); setError(""); setFeedback(""); try {await work();} catch (reason) {setError(reason instanceof Error ? reason.message : String(reason));} finally {setBusy(false);}}
  return <ArchitectWorkspaceShell label="Greenfield Architect Interview" browserVisible={props.browserVisible} browserCompanion={props.browserCompanion}
    heading={<h2>Architect Interview</h2>}
    context={<p>{model?.reason ?? "Prepare the handoff from approved Intake, then submit the Architect’s structured output for review."}</p>}
    feedback={<>{error ? <p role="alert">{error}</p> : null}{feedback ? <p role="status">{feedback}</p> : null}{model?.materializationError ? <p role="alert">{model.materializationError}</p> : null}</>}
    headerActions={<div><button disabled={busy || !props.workflowId} onClick={() => void action(async () => {accept(await window.champcity.prepareStructuredArchitectWorkspace(props.workflowId!)); setFeedback("Handoff prepared from current SQL Intake.");})}>Prepare / Refresh</button>
      <button disabled={!model?.handoff} onClick={() => void action(async () => {await navigator.clipboard.writeText(model!.handoff!); setFeedback("Architect handoff copied.");})}>Copy handoff</button></div>}
    reviewContent={<><FigmaDocumentCard selectedDocument={model?.reviewDocument ?? null} documentError="" feedback="" onCopy={() => void action(async () => {await navigator.clipboard.writeText(model?.reviewDocument?.bodyMarkdown ?? "");})} />
      {revision ? <button onClick={() => setViewed(revision)}>I have reviewed this revision</button> : null}
      <label>Architect structured JSON<textarea aria-label="Architect structured JSON" value={output} onChange={event => setOutput(event.target.value)} maxLength={100000} /></label>
      <button disabled={busy || !model?.ready || !output.trim()} onClick={() => void action(async () => {const parsed: unknown = JSON.parse(output); validateGreenfieldArchitectOutput(parsed);
        accept(await window.champcity.saveStructuredArchitectOutput(props.workflowId!, {intakeId: model!.intakeId!, intakeVersion: model!.intakeVersion!, expectedCycleVersion: model!.cycleVersion, output: parsed})); setViewed(null); setOutput(""); setFeedback("Structured Architect output saved for review.");})}>Save Architect output</button></>}
    reviewControls={<div><label>Operator review notes<textarea value={notes} onChange={event => setNotes(event.target.value)} maxLength={4096} /></label>
      {(["approved", "revision_requested", "rejected"] as const).map(outcome => <button key={outcome} disabled={busy || !revision || viewed !== revision || outcome === "revision_requested" && !notes.trim()}
        onClick={() => void action(async () => {accept(await window.champcity.reviewStructuredArchitectOutput(props.workflowId!, model!.review!.cycleId, {expectedRecordVersion: model!.review!.recordVersion, outcome, notes})); setFeedback("Operator review recorded.");})}>
        {{approved: "Approve", revision_requested: "Revision Requested", rejected: "Reject"}[outcome]}</button>)}</div>} />;
}
