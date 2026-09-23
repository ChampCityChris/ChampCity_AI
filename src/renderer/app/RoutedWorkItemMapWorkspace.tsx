import type { RoutedWorkflowModel } from "../../shared/routedWorkflowContracts";
import type { WorkPlanningModel, PlanWorkItemCandidate } from "../../shared/workPlanningContracts";

export function RoutedWorkItemMapWorkspace({ model, plan, selectedWorkItemId, busy, error, onSelect, onActivate, onBegin, onContinue, onDecompose }: {
  model: RoutedWorkflowModel | null;
  plan: WorkPlanningModel | null;
  selectedWorkItemId: string | null;
  busy: boolean;
  error: string;
  onSelect: (workItemId: string) => void;
  onActivate: () => void;
  onBegin: (workItemId: string) => void;
  onContinue: () => void;
  onDecompose: (workItemId: string) => void;
}): JSX.Element {
  const planned = plan?.artifact?.structure?.workItems ?? [];
  const evidence = model?.execution?.workItems ?? [];
  const items: Array<{ candidate: PlanWorkItemCandidate; status: string; eligible: boolean; reasons: string[]; active: boolean }> =
    evidence.length ? evidence.map((item) => ({ candidate: item.candidate, status: item.stage, eligible: item.eligible,
      reasons: item.reasons, active: item.candidate.workItemId === model?.execution?.nextWorkItemId }))
      : planned.map((candidate) => ({ candidate, status: "Awaiting Plan activation", eligible: false, reasons: [], active: false }));
  const selected = items.find((item) => item.candidate.workItemId === selectedWorkItemId) ?? items.find((item) => item.active) ?? items[0];
  const canActivate = Boolean(model?.actions.includes("activate"));
  const canBegin = Boolean(model?.actions.includes("begin") && selected?.candidate.workItemId === model?.current?.workItemId);
  const canContinue = Boolean(selected?.active && model?.current && !canBegin);
  return <section className="routed-work-item-map" aria-labelledby="workspace-heading">
    <header className="issue-resolution-header"><div><span>Work Intake · Execution</span><h1 id="workspace-heading">Work Item Map</h1>
      <p>Choose an eligible Work Item and continue its current task.</p></div>
      {canActivate ? <button type="button" className="primary-action" disabled={busy} onClick={onActivate}>Begin approved Plan</button>
        : canBegin ? <button type="button" className="primary-action" disabled={busy} onClick={() => onBegin(selected!.candidate.workItemId)}>Begin Work Item</button>
          : canContinue ? <button type="button" className="primary-action" disabled={busy} onClick={onContinue}>Continue Work Item</button> : null}</header>
    {error ? <p role="alert">{error}</p> : null}
    {model?.feedback ? <p role="status">{model.feedback}</p> : null}
    {model?.reasons.map((reason) => <p role="status" key={reason}>{reason}</p>)}
    <div className="routed-work-item-map-body">
      <ol aria-label="Planned Work Items" className="figma-work-card-map-list">
        {items.map((item, index) => <li key={item.candidate.workItemId}><button type="button"
          className={item === selected ? "figma-work-card-map-list-item selected" : "figma-work-card-map-list-item"}
          aria-pressed={item === selected} onClick={() => onSelect(item.candidate.workItemId)}>
          <span className="figma-work-card-map-index">{String(index + 1).padStart(2, "0")}</span>
          <span className="figma-work-card-map-copy"><span>{item.candidate.workItemId}{item.active ? " · Active" : ""}</span>
            <strong>{item.candidate.title}</strong></span><span>{item.status}</span>
        </button></li>)}
      </ol>
      <article className="figma-document-card" aria-label="Selected Work Item">
        {selected ? <><header className="figma-document-card-header"><strong>{selected.candidate.workItemId}: {selected.candidate.title}</strong></header>
          <div className="figma-document-card-body"><p>{selected.candidate.purpose}</p>
            <p>Eligibility: {selected.eligible ? "Ready" : selected.active ? "Current task needs attention" : "Waiting"}</p>
            {selected.candidate.phaseId ? <p>Phase: {selected.candidate.phaseId}</p> : null}
            {selected.candidate.dependsOn.length ? <p>After: {selected.candidate.dependsOn.join(", ")}</p> : null}
            {selected.reasons.map((reason) => <p role="status" key={reason}>{reason}</p>)}
            <button type="button" disabled={busy || !plan?.artifact || plan.artifact.stale || plan.artifact.disposition !== "Approved"}
              onClick={() => onDecompose(selected.candidate.workItemId)}>Decompose Work Item</button>
          </div></> : <p>No Work Items are available from the approved Plan.</p>}
      </article>
    </div>
  </section>;
}
