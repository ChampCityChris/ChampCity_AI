import { useState } from "react";
import type { ExecutionCriterionEvidence } from "../../shared/planExecutionContracts";
import type { RoutedAcceptanceProjection } from "../../shared/routedDevelopmentExecutionContracts";
import type { RoutedWorkflowAction, RoutedWorkflowInput, RoutedWorkflowModel } from "../../shared/routedWorkflowContracts";

function boundaryName(boundary: RoutedAcceptanceProjection): string {
  return boundary.boundary.kind === "phase" ? `Phase ${boundary.boundary.phaseId}` : "Plan";
}
function boundaryKey(boundary: RoutedAcceptanceProjection): string {
  return boundary.boundary.kind === "phase" ? `phase:${boundary.boundary.phaseId}` : "plan";
}

export function RoutedAcceptanceWorkspace({ model, busy, error, onAction, onReturnMap, onIntegration }: {
  model: RoutedWorkflowModel | null;
  busy: boolean;
  error: string;
  onAction: (action: RoutedWorkflowAction, input?: RoutedWorkflowInput) => void;
  onReturnMap: () => void;
  onIntegration: () => void;
}): JSX.Element {
  const boundaries = model?.execution?.acceptance ?? [];
  const [selectedKey, setSelectedKey] = useState("");
  const selected = boundaries.find((entry) => boundaryKey(entry) === selectedKey) ?? boundaries.find((entry) => entry.eligible) ?? boundaries[0];
  const [rationale, setRationale] = useState("");
  const [criteria, setCriteria] = useState<ExecutionCriterionEvidence[]>([]);
  const actualCriteria = selected?.acceptanceCriteria.map((criterion) => criteria.find((entry) => entry.criterion === criterion)
    ?? selected.criteria.find((entry) => entry.criterion === criterion) ?? { criterion, status: "pending" as const, evidencePaths: [] }) ?? [];
  const canSave = Boolean(selected?.eligible && model?.actions.includes("save-acceptance") && rationale.trim());
  const canReview = Boolean(selected?.artifactRevision && selected.fresh && model?.actions.includes("review-acceptance"));
  const canIntegrate = Boolean(model?.integration && model.execution?.complete);
  return <section className="routed-acceptance-workspace" aria-label="Routed acceptance">
    <header className="issue-resolution-header"><div><span>Work Intake · Execution boundary</span><h1>Acceptance</h1>
      <p>Review Phase or Plan criteria after the required Work Items close.</p></div></header>
    {error ? <p role="alert">{error}</p> : null}{model?.feedback ? <p role="status">{model.feedback}</p> : null}
    <div className="routed-acceptance-body">
      <nav aria-label="Acceptance boundaries">{boundaries.map((entry) => <button key={boundaryKey(entry)} type="button"
        aria-pressed={entry === selected} onClick={() => { setSelectedKey(boundaryKey(entry)); setCriteria([]); setRationale(""); }}>
        {boundaryName(entry)} · {entry.disposition ?? (entry.eligible ? "Ready" : "Waiting")}</button>)}</nav>
      {selected ? <article className="figma-document-card"><header className="figma-document-card-header"><strong>{boundaryName(selected)} acceptance</strong></header>
        <div className="figma-document-card-body"><p>{selected.eligible ? "Ready for evidence" : "Awaiting required evidence"}</p>
          {selected.reasons.map((reason) => <p role="status" key={reason}>{reason}</p>)}
          {actualCriteria.map((entry, index) => <div className="routed-acceptance-criterion" key={entry.criterion}>
            <strong>{entry.criterion}</strong><label>Status<select disabled={busy || !selected.eligible} value={entry.status}
              onChange={(event) => setCriteria(actualCriteria.map((item, itemIndex) => itemIndex === index
                ? { ...item, status: event.target.value as ExecutionCriterionEvidence["status"] } : item))}>
                <option value="pending">Pending</option><option value="passed">Passed</option><option value="failed">Failed</option>
              </select></label>
            <label>Evidence paths, one repository-relative path per line<textarea disabled={busy || !selected.eligible}
              value={entry.evidencePaths.join("\n")} onChange={(event) => setCriteria(actualCriteria.map((item, itemIndex) => itemIndex === index
                ? { ...item, evidencePaths: event.target.value.split("\n") } : item))} /></label>
          </div>)}
          <label>Acceptance rationale<textarea disabled={busy || !selected.eligible} value={rationale}
            onChange={(event) => setRationale(event.target.value)} /></label>
          <div className="figma-disposition-row">
            <button type="button" disabled={busy || !canSave} onClick={() => onAction("save-acceptance", { acceptance: {
              boundary: selected.boundary, expectedFingerprint: model!.execution!.fingerprint, closureDecision: "Close", rationale,
              criteria: actualCriteria.map((entry) => ({ ...entry, evidencePaths: entry.evidencePaths.map((path) => path.trim()).filter(Boolean) })),
            } })}>Save {boundaryName(selected)} evidence</button>
            {selected.artifactRevision ? <>
              <button type="button" disabled={busy || !canReview} onClick={() => onAction("review-acceptance", { acceptanceReview: {
                boundary: selected.boundary, expectedFingerprint: model!.execution!.fingerprint, expectedRevision: selected.artifactRevision!,
                disposition: "Approved", notes: rationale } })}>Approve {boundaryName(selected)} acceptance</button>
              <button type="button" disabled={busy || !canReview || !rationale.trim()} onClick={() => onAction("review-acceptance", { acceptanceReview: {
                boundary: selected.boundary, expectedFingerprint: model!.execution!.fingerprint, expectedRevision: selected.artifactRevision!,
                disposition: "RevisionRequested", notes: rationale } })}>Request Revision</button>
            </> : null}
          </div><details><summary>Acceptance document details</summary><p>{selected.relativePath}</p><p>Revision {selected.artifactRevision ?? "not recorded"}</p></details>
        </div></article> : <p>No Phase or Plan acceptance is required yet.</p>}
    </div>
    <div className="figma-disposition-row"><button type="button" onClick={onReturnMap}>Return to Work Item Map</button>
      {canIntegrate ? <button type="button" className="primary-action" onClick={onIntegration}>Continue to Integration</button> : null}</div>
  </section>;
}
