import { useEffect, useState, type ReactNode } from "react";
import { Clipboard, FileText, FolderOpen, RefreshCw } from "lucide-react";
import type { WorkItemDecompositionModel } from "../../shared/workItemDecompositionContracts";
import type { WorkPlanningModel } from "../../shared/workPlanningContracts";
import { DocumentChatWorkspaceShell } from "./DocumentChatWorkspaceShell";
import { FigmaMarkdownBody } from "./FigmaDocumentCard";
import { WorkItemDecompositionPreview } from "./workCardPlanPresentation";

export type DecompositionReturnTarget = "plan" | "work-item-map";

export function WorkItemDecompositionWorkspace({ intakeId, workItemId, returnTarget, browserPanel, onReloadBrowser, onReturn }: {
  intakeId: string;
  workItemId: string;
  returnTarget: DecompositionReturnTarget;
  browserPanel: ReactNode;
  onReloadBrowser: () => void;
  onReturn: (target: DecompositionReturnTarget, resumeWorkItemId?: string) => Promise<void>;
}): JSX.Element {
  const [model, setModel] = useState<WorkItemDecompositionModel | null>(null);
  const [plan, setPlan] = useState<WorkPlanningModel | null>(null);
  const [document, setDocument] = useState<"proposal" | "plan">("proposal");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  useEffect(() => {
    let current = true;
    Promise.all([window.champcity.getWorkItemDecomposition(intakeId, workItemId), window.champcity.getWorkPlanning(intakeId, "plan")])
      .then(([next, approvedPlan]) => { if (current) { setModel(next); setPlan(approvedPlan); } })
      .catch((failure: unknown) => { if (current) setError(failure instanceof Error ? failure.message : "Decomposition could not be loaded."); });
    return () => { current = false; };
  }, [intakeId, workItemId]);

  async function run(action: "prepare" | "copy" | "refresh" | "accept" | "request-revision"): Promise<void> {
    setBusy(true); setError(""); setFeedback("");
    try {
      if (action === "copy") {
        await window.champcity.copyWorkItemDecomposition(intakeId, workItemId);
        setFeedback("Decomposition handoff copied.");
        return;
      }
      if (action === "prepare") {
        setModel(await window.champcity.prepareWorkItemDecomposition(intakeId, workItemId));
        setFeedback("Architect handoff prepared. Copy it when ready.");
        return;
      }
      if (action === "refresh") {
        const [next, approvedPlan] = await Promise.all([
          window.champcity.getWorkItemDecomposition(intakeId, workItemId), window.champcity.getWorkPlanning(intakeId, "plan")]);
        setModel(next); setPlan(approvedPlan);
        setFeedback("Current proposal and Plan refreshed.");
        return;
      }
      if (!model || model.state !== "pending") throw Error("Refresh the current proposal before reviewing.");
      const next = await window.champcity.reviewWorkItemDecomposition(intakeId, workItemId, {
        disposition: action, expectedProposalRevision: model.revision, expectedPlanRevision: model.planRevision, notes,
      });
      setModel(next);
      if (action === "accept" && next.state === "accepted" && next.resumeWorkItemId) {
        setPlan(await window.champcity.getWorkPlanning(intakeId, "plan"));
        await onReturn("work-item-map", next.resumeWorkItemId);
      } else if (action === "request-revision") {
        setFeedback("Revision requested. The proposal remains here for a revised Architect handoff.");
      }
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Decomposition action failed."); }
    finally { setBusy(false); }
  }

  return <DocumentChatWorkspaceShell
    bodyClassName="work-intake-doc-chat-workspace" browserColumnClassName="work-intake-browser-column"
    className="work-intake-stage-workspace work-decomposition-workspace" documentColumnClassName="work-intake-document-column"
    eyebrow="Work Intake · Planning correction" heading={`Decompose ${workItemId}`}
    summary="Review an Architect proposal to change the approved Plan for this Work Item."
    headerAction={<button type="button" onClick={() => void onReturn(returnTarget)}>Return to {returnTarget === "plan" ? "Plan" : "Work Item Map"}</button>}
    browserPanel={browserPanel}
    browserActions={<section className="figma-browser-actions-panel" aria-label="Decomposition browser actions">
      <header><span>Browser Actions</span></header>
      <div className="figma-browser-actions-row">
        <button type="button" className="primary-action" onClick={onReloadBrowser}><RefreshCw aria-hidden="true" size={14} />Reload ChatGPT</button>
        <button type="button" disabled={busy || !model?.canPrepare} onClick={() => void run("prepare")}><FolderOpen aria-hidden="true" size={14} />Prepare Handoff</button>
        <button type="button" disabled={busy || !model?.preparedInstruction} onClick={() => void run("copy")}><Clipboard aria-hidden="true" size={14} />Copy Handoff</button>
        <button type="button" disabled={busy} onClick={() => void run("refresh")}><RefreshCw aria-hidden="true" size={14} />Refresh</button>
      </div>
      {error || model?.error ? <p role="alert">{error || model?.error}</p> : null}
      {feedback ? <p role="status">{feedback}</p> : null}
    </section>}
    documentColumn={<>
      <article className="figma-document-card" aria-label="Decomposition documents">
        <div className="figma-document-tabs" role="tablist" aria-label="Decomposition documents">
          <button type="button" aria-selected={document === "proposal"} className={document === "proposal" ? "active" : ""}
            onClick={() => setDocument("proposal")}>Decomposition Proposal</button>
          <button type="button" aria-selected={document === "plan"} className={document === "plan" ? "active" : ""}
            onClick={() => setDocument("plan")}>Approved Plan</button>
        </div>
        <header className="figma-document-card-header"><div className="figma-document-title-row"><FileText aria-hidden="true" size={14} />
          <strong>{document === "proposal" ? "Decomposition Proposal" : "Approved Plan"}</strong></div></header>
        <div className="figma-document-card-body">
          {document === "proposal" ? model?.proposal ? <WorkItemDecompositionPreview model={model} />
            : <div className="figma-empty-document"><strong>No proposal yet</strong><span>Prepare a handoff, then refresh to review the Architect proposal.</span></div>
            : plan?.artifact ? <FigmaMarkdownBody markdown={plan.artifact.bodyMarkdown.replace(/```champcity-work-plan\r?\n[\s\S]*?\r?\n```/g, "").trim()} />
              : <p>Loading approved Plan…</p>}
        </div>
        {model?.proposal && document === "proposal" ? <details><summary>Proposal document details</summary><p>{model.relativePath}, revision {model.revision}</p></details> : null}
      </article>
      <section className="figma-disposition-panel work-decomposition-decision" aria-label="Decomposition disposition">
        <header><span>Operator review</span></header>
        <p role="status">{model?.state === "revision-requested" ? "Revision requested. Prepare a revised handoff here."
          : model?.state === "pending" ? "Proposal ready for review."
            : model?.state === "stale" ? "The Plan changed. Refresh before acting."
              : model?.state === "accepted" ? "Plan change accepted." : "Awaiting a decomposition proposal."}</p>
        {model?.state === "pending" ? <>
          <label>Review notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
          <div className="figma-disposition-row">
            <button type="button" className="apply-button" disabled={busy} onClick={() => void run("accept")}>Accept Plan Change</button>
            <button type="button" disabled={busy || !notes.trim()} onClick={() => void run("request-revision")}>Request Revised Proposal</button>
          </div>
        </> : null}
      </section>
    </>}
  />;
}
