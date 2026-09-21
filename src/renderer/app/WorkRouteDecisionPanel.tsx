import { useEffect, useState } from "react";
import { workRouteProfiles, workRouteProfileRegistry, type WorkRouteId } from "../../shared/workIntakeRoutingContracts";
import type { WorkRouteDecisionInput, WorkRouteDecisionModel } from "../../shared/workRouteDecisionContracts";
import { WorkPlanningPanel } from "./WorkPlanningPanel";
import { WorkIssuePanel } from "./WorkIssuePanel";

export function WorkRouteDecisionControls({ model, selected, rationale, busy, onRationaleChange, onSelectedChange, onDecide }: {
  model: WorkRouteDecisionModel;
  selected: WorkRouteId;
  rationale: string;
  busy: boolean;
  onRationaleChange: (value: string) => void;
  onSelectedChange: (value: WorkRouteId) => void;
  onDecide: (disposition: WorkRouteDecisionInput["disposition"]) => void;
}) {
  if (model.state !== "awaiting-decision" && model.state !== "reroute-required") return null;
  const disabled = busy || !rationale.trim() || !model.sourceAssessment;
  return <>
    <label>Decision rationale or revision instructions<textarea value={rationale} onChange={(event) => onRationaleChange(event.target.value)} /></label>
    <button disabled={disabled} onClick={() => onDecide("accept")}>Accept recommendation</button>
    <label>Override with route<select value={selected} onChange={(event) => onSelectedChange(event.target.value as WorkRouteId)}>
      {workRouteProfiles.map((profile) => <option key={profile.routeId} value={profile.routeId}>{profile.label}</option>)}
    </select></label>
    <button disabled={disabled} onClick={() => onDecide("override")}>Select this route</button>
    <button disabled={disabled} onClick={() => onDecide("request-revision")}>Request revised assessment</button>
  </>;
}

export function WorkRouteDecisionPanel({ intakeId, assessmentRevision, onOpenIssue }: { intakeId: string; assessmentRevision: number; onOpenIssue?: (issueId: string) => void }) {
  const [model, setModel] = useState<WorkRouteDecisionModel | null>(null);
  const [selected, setSelected] = useState<WorkRouteId>("greenfield");
  const [rationale, setRationale] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let current = true;
    window.champcity.getWorkRouteDecision(intakeId).then((next) => { if (current) { setModel(next); if (next.selection) setSelected(next.selection.selectedRouteId); } })
      .catch((failure: unknown) => { if (current) setError(String(failure)); });
    return () => { current = false; };
  }, [intakeId, assessmentRevision]);
  async function decide(disposition: WorkRouteDecisionInput["disposition"]) {
    if (!model?.sourceAssessment || model.state !== "awaiting-decision" && model.state !== "reroute-required") return;
    setBusy(true); setError("");
    try {
      setModel(await window.champcity.decideWorkRoute(intakeId, { expectedDecisionRevision: model.artifactRevision,
        sourceAssessment: model.sourceAssessment, disposition, rationale, ...(disposition === "override" ? { selectedRouteId: selected } : {}) }));
      setRationale("");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Route decision failed."); }
    finally { setBusy(false); }
  }
  return <section aria-label="Operator route decision">
    <h3>Your route decision</h3>
    {error || model?.error ? <p role="alert">{error || model?.error}</p> : null}
    <p role="status">{model?.state ?? "Loading route decision…"}</p>
    <p>Selected route: {model?.selection ? workRouteProfileRegistry[model.selection.selectedRouteId].label : "Awaiting your decision"}</p>
    {model?.recommendation?.kind === "architect-reroute-recommendation" ? <p>Reroute recommended: {workRouteProfileRegistry[model.recommendation.replacementRouteId].label}. {model.recommendation.rationale}</p> : null}
    {model ? <WorkRouteDecisionControls model={model} selected={selected} rationale={rationale} busy={busy}
      onRationaleChange={setRationale} onSelectedChange={setSelected} onDecide={(disposition) => void decide(disposition)} /> : null}
    {model?.history.length ? <details><summary>Decision history</summary><ol>{model.history.map((entry) => <li key={entry.decision.decisionId}>{entry.decision.disposition}: {entry.decision.rationale}</li>)}</ol></details> : null}
    {model?.selection?.selectedRouteId === "issue-resolution" && ["selected", "reroute-required", "revision-requested", "stale"].includes(model.state)
      ? <WorkIssuePanel key={model.selection.decisionId} intakeId={intakeId} onOpenIssue={onOpenIssue} onRoutingChanged={async () => { setModel(await window.champcity.getWorkRouteDecision(intakeId)); }} />
      : model?.state === "selected" && model.selection ? <WorkPlanningPanel key={model.selection.decisionId} intakeId={intakeId} /> : null}
  </section>;
}
