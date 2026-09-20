import { useState } from "react";
import type { WorkIntakeProjection, WorkIntakeRecord, WorkIntakeSubmission } from "../../shared/workIntakeContracts";

export function WorkIntakeWorkspace({ projection, onReturn, onRefresh }: {
  projection: WorkIntakeProjection;
  onReturn: () => void;
  onRefresh: () => Promise<void>;
}) {
  const [value, setValue] = useState<WorkIntakeSubmission>(() => {
    const base = projection.branches.find(({ name }) => name === projection.currentBranch) ?? projection.branches[0];
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
  return <section className="intake-form" aria-label="Work Intake">
    <h1 id="workspace-heading">Work Intake</h1>
    <p>Describe one body of work for this Project. Its dedicated branch will be established before the intake is saved.</p>
    <button type="button" onClick={onReturn} disabled={busy}>Back to workflows</button>
    {error ? <p role="alert">{error}</p> : null}
    {saved ? <section role="status" aria-label="Work Intake submission confirmation">
      <h2>Work Intake saved</h2>
      <p>{saved.workRequest}</p>
      <p>Work branch: {saved.branchBinding.workBranch}</p>
      <p>Base branch: {saved.branchBinding.baseBranch}</p>
      <p>Routing assessment is the next step.</p>
    </section> : <form onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      {projection.blockedReason ? <p role="status">{projection.blockedReason}</p> : null}
      <label>Project name<input value={value.projectName} readOnly={!!projection.project} required onChange={(event) => update("projectName", event.target.value)} /></label>
      <label>Work request, problem, or change<textarea value={value.workRequest} required onChange={(event) => update("workRequest", event.target.value)} /></label>
      <label>Desired outcome<textarea value={value.desiredOutcome} required onChange={(event) => update("desiredOutcome", event.target.value)} /></label>
      <label>Non-negotiable constraints<textarea value={value.knownConstraints} onChange={(event) => update("knownConstraints", event.target.value)} /></label>
      <label><input type="checkbox" checked={value.hasExistingSourceOrPlanning} onChange={(event) => update("hasExistingSourceOrPlanning", event.target.checked)} />Existing source, planning, or architecture is relevant</label>
      <label>Evidence or repository review context (optional)<textarea value={value.repositoryReviewContext} onChange={(event) => update("repositoryReviewContext", event.target.value)} /></label>
      <label>Integrate into branch<select value={value.baseBranch} required onChange={(event) => {
        const base = projection.branches.find(({ name }) => name === event.target.value);
        if (base) setValue((current) => ({ ...current, baseBranch: base.name, baseCommit: base.commit }));
      }}>
        {projection.branches.map(({ name }) => <option key={name} value={name}>{name}</option>)}
      </select></label>
      <button type="submit" disabled={busy || !!projection.blockedReason}>{busy ? "Saving…" : "Save Work Intake"}</button>
    </form>}
    {!saved && projection.currentIntake ? <p>Current Work Intake: {projection.currentIntake.workRequest}</p> : null}
  </section>;
}
