import { useEffect, useState } from "react";
import type { WorkItemDecompositionModel } from "../../shared/workItemDecompositionContracts";
import type { PlanWorkItemCandidate } from "../../shared/workPlanningContracts";
import { WorkItemDecompositionPreview } from "./workCardPlanPresentation";

export function WorkItemDecompositionPanel({ intakeId, workItems, onAccepted }: { intakeId: string; workItems: PlanWorkItemCandidate[]; onAccepted: () => Promise<void> }) {
  const [selected, setSelected] = useState(workItems[0]?.workItemId ?? "");
  const [model, setModel] = useState<WorkItemDecompositionModel | null>(null);
  const [notes, setNotes] = useState(""); const [error, setError] = useState(""); const [feedback, setFeedback] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => {
    let current = true; setModel(null); setError("");
    if (selected) window.champcity.getWorkItemDecomposition(intakeId, selected).then((next) => { if (current) setModel(next); }).catch((failure: unknown) => { if (current) setError(String(failure)); });
    return () => { current = false; };
  }, [intakeId, selected]);
  async function act(action: "prepare" | "copy" | "refresh" | "accept" | "request-revision") {
    setBusy(true); setError(""); setFeedback("");
    try {
      if (action === "copy") { await window.champcity.copyWorkItemDecomposition(intakeId, selected); setFeedback("Decomposition handoff copied."); return; }
      const next = action === "prepare" ? await window.champcity.prepareWorkItemDecomposition(intakeId, selected)
        : action === "refresh" ? await window.champcity.getWorkItemDecomposition(intakeId, selected)
        : await window.champcity.reviewWorkItemDecomposition(intakeId, selected, { disposition: action, expectedProposalRevision: model!.revision, expectedPlanRevision: model!.planRevision, notes });
      setModel(next);
      if (next.state === "accepted") { setFeedback(`${selected} superseded by decomposition. Resume with ${next.resumeWorkItemId} after its prerequisites.`); await onAccepted(); setSelected(next.resumeWorkItemId!); }
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Decomposition action failed."); }
    finally { setBusy(false); }
  }
  return <details><summary>Decompose a candidate (optional)</summary>
    <label>Work Item<select value={selected} disabled={busy} onChange={(event) => setSelected(event.target.value)}>{workItems.map((item) => <option key={item.workItemId} value={item.workItemId}>{item.workItemId}: {item.title}</option>)}</select></label>
    {error || model?.error ? <p role="alert">{error || model?.error}</p> : null}{feedback ? <p role="status">{feedback}</p> : null}
    <button disabled={busy || !model?.canPrepare} onClick={() => void act("prepare")}>Prepare decomposition handoff</button>
    <button disabled={busy || !model?.preparedInstruction} onClick={() => void act("copy")}>Copy handoff</button>
    <button disabled={busy} onClick={() => void act("refresh")}>Check proposal</button>
    {model ? <WorkItemDecompositionPreview model={model} /> : null}
    <label>Proposal review notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
    <button disabled={busy || model?.state !== "pending"} onClick={() => void act("accept")}>Accept Plan change</button>
    <button disabled={busy || model?.state !== "pending" || !notes.trim()} onClick={() => void act("request-revision")}>Request revised proposal</button>
  </details>;
}
