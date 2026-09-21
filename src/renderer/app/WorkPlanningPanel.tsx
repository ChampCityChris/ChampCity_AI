import { useEffect, useState } from "react";
import type { WorkPlanningModel, WorkPlanningReviewInput, WorkPlanningStage } from "../../shared/workPlanningContracts";
import { WorkItemDecompositionPanel } from "./WorkItemDecompositionPanel";
import { RoutedExecutionPanel } from "./RoutedExecutionPanel";

export function WorkPlanningPanel({ intakeId, planOnly = false }: { intakeId: string; planOnly?: boolean }) {
  const [stage, setStage] = useState<WorkPlanningStage>(planOnly ? "plan" : "assessment");
  const [model, setModel] = useState<WorkPlanningModel | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    let current = true; setModel(null); setError(""); setCopied(false);
    window.champcity.getWorkPlanning(intakeId, stage).then((next) => { if (current) setModel(next); })
      .catch((failure: unknown) => { if (current) setError(String(failure)); });
    return () => { current = false; };
  }, [intakeId, stage]);
  async function act(action: "prepare" | "copy" | "refresh" | WorkPlanningReviewInput["disposition"]) {
    setBusy(true); setError(""); setCopied(false);
    try {
      if (action === "copy") { await window.champcity.copyWorkPlanning(intakeId, stage); setCopied(true); return; }
      const next = action === "prepare" ? await window.champcity.prepareWorkPlanning(intakeId, stage)
        : action === "refresh" ? await window.champcity.getWorkPlanning(intakeId, stage)
        : await window.champcity.reviewWorkPlanning(intakeId, stage, { expectedRevision: model!.artifact!.artifactRevision, disposition: action, notes });
      setModel(next);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Planning action failed."); }
    finally { setBusy(false); }
  }
  const reviewable = !!model?.artifact && !model.artifact.stale && !busy;
  return <section aria-label="Route planning">
    <h3>Route planning</h3>
    <label>Planning stage<select disabled={busy || planOnly} value={stage} onChange={(event) => setStage(event.target.value as WorkPlanningStage)}>
      <option value="assessment">Architect assessment</option><option value="plan" disabled={model?.researchClosed}>Work Plan</option>
    </select></label>
    {error || model?.error ? <p role="alert">{error || model?.error}</p> : null}
    {copied ? <p role="status">Planning handoff copied.</p> : null}
    <button disabled={busy || !model?.canPrepare} onClick={() => void act("prepare")}>Prepare handoff</button>
    <button disabled={busy || !model?.preparedInstruction} onClick={() => void act("copy")}>Copy handoff</button>
    <button disabled={busy} onClick={() => void act("refresh")}>Check submitted draft</button>
    {model?.artifact ? <>
      <p>Revision {model.artifact.artifactRevision}: {model.artifact.stale ? "Stale" : model.artifact.disposition}</p>
      {model.artifact.researchOutcome ? <div>
        <p>{model.researchClosed ? "Research closed — no implementation Plan required." : model.artifact.disposition === "Approved" && !model.artifact.stale ? "Research outcome approved — bounded research planning may continue." : "Research outcome awaiting current Operator approval."}</p>
        <p>Prototype output: {model.artifact.researchOutcome.prototypeDisposition === "disposable" ? "Disposable" : "Candidate for later work"}.</p>
        <p>{model.artifact.researchOutcome.productionFollowUp === "new-work-intake-required" ? "Production follow-up requires a new Work Intake and approved planning." : "No production follow-up proposed."}</p>
      </div> : null}
      {model.artifact.structure ? <p>Proposed topology: {model.artifact.structure.topology}. {model.artifact.structure.topologyRationale}</p> : null}
      <pre style={{ whiteSpace: "pre-wrap" }}>{model.artifact.bodyMarkdown}</pre>
      <label>Review notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
      <button disabled={!reviewable} onClick={() => void act("Approved")}>Approve {stage === "plan" ? "Plan and topology" : model?.artifact?.researchOutcome ? "research outcome" : "assessment"}</button>
      <button disabled={!reviewable || !notes.trim()} onClick={() => void act("RevisionRequested")}>Request revision</button>
      <button disabled={!reviewable || !notes.trim()} onClick={() => void act("Rejected")}>Reject</button>
      {stage === "plan" && model.artifact.structure && !model.artifact.stale && model.artifact.disposition === "Approved" ? <WorkItemDecompositionPanel intakeId={intakeId} workItems={model.artifact.structure.workItems} onAccepted={async () => { setModel(await window.champcity.getWorkPlanning(intakeId, "plan")); }} /> : null}
      {stage === "plan" && model.routeId !== "issue-resolution" && model.artifact.structure && !model.artifact.stale && model.artifact.disposition === "Approved" ? <RoutedExecutionPanel key={model.artifact.identity.planId} intakeId={intakeId} /> : null}
    </> : null}
  </section>;
}
