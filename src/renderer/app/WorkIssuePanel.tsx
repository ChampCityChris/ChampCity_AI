import { useEffect, useState } from "react";
import type { IssueArchitectReviewDisposition, WorkIssueAction, WorkIssueModel } from "../../shared/issueResolutionContracts";
import { WorkPlanningPanel } from "./WorkPlanningPanel";
import { RoutedExecutionPanel } from "./RoutedExecutionPanel";

export function WorkIssuePanel({ intakeId, onRoutingChanged, onOpenIssue }: { intakeId: string; onRoutingChanged: () => Promise<void>; onOpenIssue?: (issueId: string) => void }) {
  const [model, setModel] = useState<WorkIssueModel | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    let current = true;
    window.champcity.runWorkIssueAction(intakeId, "status").then(async (next) => { if (current) { setModel(next); if (next.rerouteRecommended) await onRoutingChanged(); } }).catch((failure: unknown) => { if (current) setError(String(failure)); });
    return () => { current = false; };
  }, [intakeId]);
  async function act(action: WorkIssueAction, disposition?: IssueArchitectReviewDisposition, phaseId?: string) {
    setBusy(true); setError(""); setCopied(false);
    try {
      const next = await window.champcity.runWorkIssueAction(intakeId, action, phaseId ? { phaseAcceptance: { phaseId, expectedFingerprint: model?.execution?.fingerprint ?? "", notes } } : disposition ? { review: { disposition, operatorNotes: notes }, expectedEvidenceDigest: model?.reviewEvidenceDigest ?? undefined } : undefined);
      setModel(next); setCopied(action === "copy");
      if (next.rerouteRecommended) await onRoutingChanged();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Issue action failed."); }
    finally { setBusy(false); }
  }
  return <section aria-label="Routed Issue investigation">
    <h3>Issue investigation and root cause</h3>
    {error ? <p role="alert">{error}</p> : null}
    {!model?.issueId ? <button disabled={busy || !model} onClick={() => void act("open")}>Open Issue from this Work Intake</button> : <>
      <p>{model.issueId} — {model.architect?.statusMessage}</p>
      <button disabled={busy || !model.architect?.canPrepareHandoff} onClick={() => void act("prepare")}>Prepare RCA handoff</button>
      <button disabled={busy || !model.architect?.canCopyHandoff} onClick={() => void act("copy")}>Copy RCA handoff</button>
      <button disabled={busy} onClick={() => void act("status")}>Check investigation</button>
      {copied ? <p role="status">RCA handoff copied.</p> : null}
      <details><summary>Original Issue evidence</summary><pre style={{ whiteSpace: "pre-wrap" }}>{model.architect?.issueRecordMarkdown}</pre></details>
      {model.architect?.finalInvestigationMarkdown ? <>
        <pre style={{ whiteSpace: "pre-wrap" }}>{model.architect.finalInvestigationMarkdown}</pre>
        <label>RCA review notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
        <button disabled={busy} onClick={() => void act("review", "Approved")}>Approve RCA</button>
        <button disabled={busy || !notes.trim()} onClick={() => void act("review", "RevisionRequested")}>Request RCA revision</button>
        <button disabled={busy} onClick={() => void act("review", "Rejected")}>Reject RCA</button>
      </> : null}
      {model.rerouteRecommended ? <p>RCA recommends another route. Review the general route decision above.</p> : null}
      {model.correctionPlanningReady ? <WorkPlanningPanel intakeId={intakeId} planOnly /> : null}
      {model.correctionPlanningReady && !model.execution ? <button disabled={busy} onClick={() => void act("activate-execution")}>Begin approved correction Plan</button> : null}
      {model.execution ? <section aria-label="Correction execution">
        <h3>Correction execution — {model.execution.topology}</h3>
        <p>Continue Fix Card implementation, review, Repair, and close in the Issue workspace for {model.issueId}.</p>
        {onOpenIssue && model.issueId ? <button disabled={busy} onClick={() => onOpenIssue(model.issueId!)}>Continue this Issue</button> : null}
        <button disabled={busy} onClick={() => void act("status")}>Refresh correction evidence</button>
        {model.execution.workItems.map((item) => <p key={item.candidate.workItemId}>{item.candidate.title}: {item.stage} — {item.reasons.join(" ")}</p>)}
        {model.execution.phases.length ? <label>Phase acceptance evidence<textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></label> : null}
        {model.execution.phases.map((phase) => <div key={phase.phaseId}>
          <p>{phase.phaseId}: {phase.complete ? "Accepted" : phase.reasons.join(" ") || "Awaiting correction close and Phase acceptance"}</p>
          <ul>{phase.acceptanceCriteria.map((criterion) => <li key={criterion}>{criterion}</li>)}</ul>
          <button disabled={busy || !notes.trim() || phase.reasons.some((reason) => reason !== "Phase evidence is stale.") || !phase.workItemsComplete || phase.complete} onClick={() => void act("accept-phase", undefined, phase.phaseId)}>Accept {phase.phaseId} criteria</button>
        </div>)}
        <RoutedExecutionPanel intakeId={intakeId} />
      </section> : null}
    </>}
  </section>;
}
