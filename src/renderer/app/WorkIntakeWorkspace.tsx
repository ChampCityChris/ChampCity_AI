import { useState } from "react";
import type { WorkIntakeProjection, WorkIntakeRecord, WorkIntakeSubmission } from "../../shared/workIntakeContracts";
import { WorkRoutingAssessmentPanel } from "./WorkRoutingAssessmentPanel";

export function WorkIntakeWorkspace({ projection, onReturn, onRefresh, onOpenIssue }: {
  projection: WorkIntakeProjection;
  onReturn: () => void;
  onRefresh: () => Promise<void>;
  onOpenIssue: (issueId: string) => void;
}) {
  const [value, setValue] = useState<WorkIntakeSubmission>(() => {
    const base = projection.suggestedBase;
    return {
      projectId: projection.project?.projectId ?? null, projectName: projection.suggestedProjectName,
      workRequest: "", desiredOutcome: "", knownConstraints: "", hasExistingSourceOrPlanning: !!projection.project,
      repositoryReviewContext: "", baseBranch: base?.name ?? "", baseCommit: base?.commit ?? "",
    };
  });
  const [saved, setSaved] = useState<WorkIntakeRecord | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const update = <K extends keyof WorkIntakeSubmission>(key: K, next: WorkIntakeSubmission[K]) => setValue((current) => ({ ...current, [key]: next }));
  async function submit() {
    setBusy(true);
    setError("");
    try {
      const result = await window.champcity.submitWorkIntake(value);
      if (!result.ok) {
        setError(`${result.error.message}${result.recovery === "inspection-required" ? " Inspect the retained work branch before retrying." : ""}`);
        return;
      }
      setSaved(result.value);
      await onRefresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Work Intake could not be saved.");
    } finally { setBusy(false); }
  }
  return <section className="figma-intake-workspace work-intake-workspace" aria-label="Work Intake">
    <div className="work-intake-content">
    <header className="work-intake-header">
      <div><h1 id="workspace-heading">Work Intake</h1>
        <p>Describe the work and the outcome you need. Saving creates a dedicated work branch.</p></div>
      <button className="icon-button" type="button" onClick={onReturn} disabled={busy}>Back to workflows</button>
    </header>
    {saved ? <section className="intake-confirmation" role="status" aria-label="Work Intake submission confirmation">
      <h2>Work Intake saved</h2>
      <p>{saved.workRequest}</p>
      <p>Work branch: {saved.branchBinding.workBranch}</p>
      <p>Base branch: {saved.branchBinding.baseBranch}</p>
    </section> : <form className="intake-form" aria-busy={busy} onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      <label>Project name<input value={value.projectName} readOnly={!!projection.project} required onChange={(event) => update("projectName", event.target.value)} /></label>
      <label>Integrate into branch<select value={value.baseBranch} required onChange={(event) => {
        const base = projection.branches.find(({ name }) => name === event.target.value);
        if (base) setValue((current) => ({ ...current, baseBranch: base.name, baseCommit: base.commit }));
      }}>
        {projection.branches.map(({ name }) => <option key={name} value={name}>{name}</option>)}
      </select></label>
      <p className="figma-intake-full">The selected branch is the starting point and integration target. ChampCity creates the work branch automatically.</p>
      <label className="figma-intake-full">Work request, problem, or change<textarea value={value.workRequest} required onChange={(event) => update("workRequest", event.target.value)} /></label>
      <label className="figma-intake-full">Desired outcome<textarea value={value.desiredOutcome} required onChange={(event) => update("desiredOutcome", event.target.value)} /></label>
      <label className="figma-intake-full">Non-negotiable constraints<textarea value={value.knownConstraints} onChange={(event) => update("knownConstraints", event.target.value)} /></label>
      <label className="checkbox-row figma-intake-full"><input type="checkbox" checked={value.hasExistingSourceOrPlanning} onChange={(event) => update("hasExistingSourceOrPlanning", event.target.checked)} /><span>Existing source, planning, or architecture is relevant</span></label>
      <label className="figma-intake-full">Evidence or repository review context (optional)<textarea value={value.repositoryReviewContext} onChange={(event) => update("repositoryReviewContext", event.target.value)} /></label>
      <div className="figma-intake-full work-intake-actions">
        {projection.blockedReason ? <p role="status">{projection.blockedReason}</p> : null}
        {error ? <p role="alert">{error}</p> : null}
        <button className="apply-button" type="submit" disabled={busy || !!projection.blockedReason}>{busy ? "Saving…" : "Save Work Intake"}</button>
      </div>
    </form>}
    {saved && error ? <p role="alert">{error}</p> : null}
    {!saved && projection.currentIntake ? <p>Current Work Intake: {projection.currentIntake.workRequest}</p> : null}
    {saved || projection.currentIntake ? <WorkRoutingAssessmentPanel key={(saved ?? projection.currentIntake)!.intakeId} intakeId={(saved ?? projection.currentIntake)!.intakeId} onOpenIssue={onOpenIssue} /> : null}
    </div>
  </section>;
}
