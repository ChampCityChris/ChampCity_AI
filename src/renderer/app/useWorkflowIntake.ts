import { useEffect, useRef, useState } from "react";
import type { WorkflowIntakePayload, WorkflowIntakeProjection } from "../../shared/workflowIntakeContracts";
import type { DocumentDispositionStatus } from "../../shared/documents/documentDisposition";

export function useWorkflowIntake(workflowId: string | undefined) {
  const [model, setModel] = useState<WorkflowIntakeProjection | null>(null);
  const [busy, setBusy] = useState(false), [loaded, setLoaded] = useState(false), [dirty, setDirty] = useState(false);
  const [error, setError] = useState(""), [notes, setNotes] = useState("");
  const [status, setStatus] = useState<DocumentDispositionStatus | "">("");
  const generation = useRef(0);
  useEffect(() => {
    const current = ++generation.current;
    setModel(null); setLoaded(false); setBusy(false); setDirty(false); setError(""); setNotes(""); setStatus("");
    if (!workflowId) { setError("Exact Project Creation Workflow identity is unavailable."); return; }
    void window.champcity.getWorkflowIntake(workflowId).then(next => {
      if (generation.current === current) { setModel(next); setLoaded(true); }
    }).catch(e => { if (generation.current === current) setError(String(e).slice(0, 1000)); });
    return () => { ++generation.current; };
  }, [workflowId]);
  const mutate = async (action: () => Promise<WorkflowIntakeProjection>) => {
    const current = generation.current;
    setBusy(true); setError("");
    try {
      const next = await action();
      if (generation.current === current) { setModel(next); setDirty(false); setStatus(""); setNotes(""); }
    } catch (e) { if (generation.current === current) setError(String(e).slice(0, 1000)); }
    finally { if (generation.current === current) setBusy(false); }
  };
  return { model, busy, loaded, dirty, error, notes, status, setNotes, setStatus, markDirty: () => setDirty(true),
    approved: loaded && !dirty && model?.disposition?.state === "approved",
    save: (payload: WorkflowIntakePayload) => mutate(() => window.champcity.saveWorkflowIntake(workflowId!, payload, model?.recordVersion)),
    review: () => mutate(() => window.champcity.reviewWorkflowIntake(workflowId!, {
      expectedIntakeRecordVersion: model!.recordVersion!, notes,
      outcome: status === "Approved" ? "approved" : status === "RevisionRequested" ? "revision_requested" : "rejected",
    })),
  };
}
