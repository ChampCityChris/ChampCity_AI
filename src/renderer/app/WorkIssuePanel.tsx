import { useEffect, useState } from "react";
import type { IssueArchitectReviewDisposition, WorkIssueAction, WorkIssueModel } from "../../shared/issueResolutionContracts";
import { WorkPlanningPanel } from "./WorkPlanningPanel";

export function WorkIssuePanel({ intakeId, onRoutingChanged }: { intakeId: string; onRoutingChanged: () => Promise<void> }) {
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
  async function act(action: WorkIssueAction, disposition?: IssueArchitectReviewDisposition) {
    setBusy(true); setError(""); setCopied(false);
    try {
      const next = await window.champcity.runWorkIssueAction(intakeId, action, disposition ? { review: { disposition, operatorNotes: notes }, expectedEvidenceDigest: model?.reviewEvidenceDigest ?? undefined } : undefined);
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
    </>}
  </section>;
}
