import { useState, type ReactNode } from "react";
import { Clipboard, FolderOpen, RefreshCw } from "lucide-react";
import type { RoutedWorkflowAction, RoutedWorkflowInput, RoutedWorkflowModel } from "../../shared/routedWorkflowContracts";
import { DocumentChatWorkspaceShell } from "./DocumentChatWorkspaceShell";
import { FigmaMarkdownBody } from "./FigmaDocumentCard";

export function RoutedWorkItemPlanningWorkspace({ model, browserPanel, busy, error, onReloadBrowser, onAction, onDecompose }: {
  model: RoutedWorkflowModel | null;
  browserPanel: ReactNode;
  busy: boolean;
  error: string;
  onReloadBrowser: () => void;
  onAction: (action: RoutedWorkflowAction, input?: RoutedWorkflowInput) => void;
  onDecompose: (workItemId: string) => void;
}): JSX.Element {
  const [notes, setNotes] = useState("");
  const current = model?.current;
  const candidate = model?.execution?.workItems.find((item) => item.candidate.workItemId === current?.workItemId)?.candidate;
  const contract = current?.contract;
  const available = (action: RoutedWorkflowAction) => Boolean(model?.actions.includes(action));
  const review = (disposition: "Approved" | "RevisionRequested" | "Rejected") => {
    if (contract) onAction("review-contract", { disposition, expectedRevision: contract.revision, notes });
  };
  return <DocumentChatWorkspaceShell bodyClassName="work-intake-doc-chat-workspace"
    browserColumnClassName="work-intake-browser-column" className="work-intake-stage-workspace work-routed-planning-workspace"
    documentColumnClassName="work-intake-document-column" eyebrow="Work Intake · Work Item"
    heading="Work Card Planning" summary={candidate ? `${candidate.workItemId}: ${candidate.title}` : "Select the current Work Item from the map."}
    browserPanel={browserPanel}
    browserActions={<section className="figma-browser-actions-panel" aria-label="Work Card Planning browser actions">
      <header><span>Browser Actions</span></header><div className="figma-browser-actions-row">
        <button type="button" className="primary-action" onClick={onReloadBrowser}><RefreshCw aria-hidden="true" size={14} />Reload ChatGPT</button>
        <button type="button" disabled={busy || !available("prepare")} onClick={() => onAction("prepare")}><FolderOpen aria-hidden="true" size={14} />Prepare Handoff</button>
        <button type="button" disabled={busy || !available("copy")} onClick={() => onAction("copy")}><Clipboard aria-hidden="true" size={14} />Copy Handoff</button>
        <button type="button" disabled={busy || !available("check-draft")} onClick={() => onAction("check-draft")}><RefreshCw aria-hidden="true" size={14} />Refresh</button>
      </div>{error ? <p role="alert">{error}</p> : null}{model?.feedback ? <p role="status">{model.feedback}</p> : null}</section>}
    documentColumn={<>
      <article className="figma-document-card" aria-label="Work Item handoff context">
        <header className="figma-document-card-header"><strong>{candidate?.workItemId ?? "Work Item"} · Architect handoff</strong></header>
        <div className="figma-document-card-body">{candidate ? <>
          <p>{candidate.purpose}</p>{candidate.phaseId ? <p>Phase: {candidate.phaseId}</p> : null}
          {candidate.dependsOn.length ? <p>After: {candidate.dependsOn.join(", ")}</p> : null}
          <button type="button" disabled={busy} onClick={() => onDecompose(candidate.workItemId)}>Decompose Work Item</button>
          {current?.contractTargetPath ? <details className="routed-work-item-file-detail">
            <summary>Formal Work Card file location</summary><p>{current.contractTargetPath}</p>
          </details> : null}
        </> : <p>Begin an eligible Work Item from the map.</p>}</div>
      </article>
      <article className="figma-document-card" aria-label="Formal Work Card document">
        <header className="figma-document-card-header"><strong>Formal Work Card</strong></header>
        <div className="figma-document-card-body">{contract ? <FigmaMarkdownBody markdown={contract.body} />
          : <div className="figma-empty-document"><strong>No Formal Work Card yet</strong><span>Prepare the handoff, work with the Architect, then refresh.</span></div>}</div>
        {contract ? <details><summary>Document details</summary><p>{contract.path}, revision {contract.revision}</p></details> : null}
      </article>
      <section className="figma-disposition-panel work-planning-decision" aria-label="Formal Work Card disposition">
        <header><span>Operator review</span></header>
        <p role="status">{contract ? `Revision ${contract.revision} · ${contract.disposition}` : available("copy") ? "Handoff prepared. Copy it to ChatGPT." : "Awaiting the Architect draft."}</p>
        {contract && available("review-contract") ? <><label>Review notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
          <div className="figma-disposition-row">
            <button type="button" className="apply-button" disabled={busy} onClick={() => review("Approved")}>Approve Work Card</button>
            <button type="button" disabled={busy || !notes.trim()} onClick={() => review("RevisionRequested")}>Request Revision</button>
            <button type="button" disabled={busy || !notes.trim()} onClick={() => review("Rejected")}>Reject</button>
          </div></> : null}
      </section>
    </>} />;
}
