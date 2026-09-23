import { useEffect, useState } from "react";
import type { WorkIssueModel } from "../../shared/issueResolutionContracts";

export function RoutedIssueBridge({ intakeId, onOpenIssue }: { intakeId: string; onOpenIssue: (issueId: string) => Promise<void> }): JSX.Element {
  const [model, setModel] = useState<WorkIssueModel | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let current = true;
    window.champcity.runWorkIssueAction(intakeId, "status")
      .then((next) => { if (current) setModel(next); })
      .catch((failure: unknown) => { if (current) setError(failure instanceof Error ? failure.message : "Routed Issue could not be loaded."); });
    return () => { current = false; };
  }, [intakeId]);

  async function open(): Promise<void> {
    setBusy(true); setError("");
    try {
      const issueId = model?.issueId ?? (await window.champcity.runWorkIssueAction(intakeId, "open")).issueId;
      if (!issueId) throw Error("Issue Resolution did not return an Issue identity.");
      await onOpenIssue(issueId);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Issue Resolution could not be opened."); }
    finally { setBusy(false); }
  }

  return <section className="routed-issue-bridge" aria-labelledby="workspace-heading">
    <header className="issue-resolution-header"><div><span>Work Intake · Issue route</span><h1 id="workspace-heading">Issue Resolution</h1>
      <p>Continue the routed Issue in the existing Architect Planning and Issue Resolution workspaces.</p></div></header>
    {error ? <p role="alert">{error}</p> : null}
    {model ? <><p>{model.issueId ? `Issue ${model.issueId} is linked to this Work Intake.` : "No Issue has been opened for this Work Intake yet."}</p>
      <button type="button" className="primary-action" disabled={busy} onClick={() => void open()}>
        {model.issueId ? "Continue Issue Resolution" : "Open Issue Resolution"}</button></>
      : <p role="status">Loading routed Issue status…</p>}
  </section>;
}
