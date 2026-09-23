import { useState, type ReactNode } from "react";
import type { PlanningDocumentDetail } from "../../shared/documents/planningDocument";
import type { RoutedWorkflowAction, RoutedWorkflowInput, RoutedWorkflowModel, RoutedWorkflowDocument } from "../../shared/routedWorkflowContracts";
import type { ArchitectOutputDocumentSlotModel } from "../../shared/workspaceContracts";
import { WorkCardRepairPresentation } from "./WorkCardRepairWorkspace";

function detail(document: RoutedWorkflowDocument | undefined, id: string): PlanningDocumentDetail | null {
  return document ? { logicalDocumentId: id, markdownPath: document.path, displayFilename: document.path.split("/").at(-1) ?? id,
    metadata: { artifactRevision: document.revision }, effectiveDisposition: document.disposition,
    documentReadState: "readable", initializationNeeded: false, bodyMarkdown: document.body,
    preview: document.body, previewTruncated: false } : null;
}

export function RoutedRepairWorkspace({ model, browserPanel, busy, error, onAction, onReloadBrowser }: {
  model: RoutedWorkflowModel | null;
  browserPanel: ReactNode;
  busy: boolean;
  error: string;
  onAction: (action: RoutedWorkflowAction, input?: RoutedWorkflowInput) => void;
  onReloadBrowser: () => void;
}): JSX.Element {
  const [selected, setSelected] = useState("repair-card");
  const [notes, setNotes] = useState("");
  const current = model?.current;
  const contract = current?.repairId ? current.contract : undefined;
  const report = current?.report;
  const available = (action: RoutedWorkflowAction) => Boolean(model?.actions.includes(action));
  const slots: ArchitectOutputDocumentSlotModel[] = [
    { slotId: "repair-card", displayLabel: "Repair Work Card", targetPath: current?.contractTargetPath ?? "Pending repair target",
      artifactRevision: contract?.revision, disposition: contract?.disposition, documentReadState: contract ? "readable" : "missing" },
    { slotId: "report", displayLabel: "Governing Implementer Report", targetPath: report?.path ?? current?.reportTargetPath ?? "Pending report",
      artifactRevision: report?.revision, disposition: report?.disposition, documentReadState: report ? "readable" : "missing" },
  ];
  const selectedDocument = selected === "repair-card" ? detail(contract, "repair-card") : detail(report, "report");
  const reviewPanel = contract && available("review-contract") ? <section className="figma-disposition-panel" aria-label="Repair Work Card disposition">
    <header><span>Repair Work Card review</span></header>
    <label>Review notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
    <div className="figma-disposition-row">
      <button type="button" disabled={busy} onClick={() => onAction("review-contract", { disposition: "Approved", expectedRevision: contract.revision, notes })}>Approve Repair Work Card</button>
      <button type="button" disabled={busy || !notes.trim()} onClick={() => onAction("review-contract", { disposition: "RevisionRequested", expectedRevision: contract.revision, notes })}>Request Revision</button>
      <button type="button" disabled={busy || !notes.trim()} onClick={() => onAction("review-contract", { disposition: "Rejected", expectedRevision: contract.revision, notes })}>Reject</button>
    </div></section> : null;
  return <section className="routed-repair-workspace" aria-label="Routed Repair">
    <header className="issue-resolution-header"><div><span>Work Intake · Current Work Item</span><h1>Repair</h1>
      <p>{current?.repairId ?? current?.workItemId ?? "Work Item"} · Use the governing validation and report evidence.</p></div></header>
    {available("create-repair") ? <section className="figma-document-card" aria-label="Begin routed Repair">
      <div className="figma-document-card-body"><p>{model?.reasons.join(" ") || "The current validation requires a bounded Repair Work Card."}</p>
        <label>Repair defect<textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
        <button type="button" disabled={busy || !notes.trim()} onClick={() => onAction("create-repair", { notes })}>Begin bounded Repair</button>
      </div></section> : null}
    <WorkCardRepairPresentation actionError={error} actionFeedback={model?.feedback ?? ""}
      architectAriaLabel="Repair Architect browser" architectHeading="Repair Architect" architectStateLabel={available("copy") ? "Handoff ready to copy" : "Prepare the Repair handoff"}
      architectStatusText="Prepare the current Repair Work Card handoff, copy it to ChatGPT, and refresh after the Architect writes a draft."
      browserPanel={browserPanel} copyEnabled={available("copy") && !busy} documentFeedback="" documentSlots={slots}
      isArchitectPaneVisible isPreparing={busy} onCopyDocument={() => { if (selectedDocument) void navigator.clipboard.writeText(selectedDocument.bodyMarkdown); }}
      onCopyHandoff={() => onAction("copy")} onPrepareHandoff={() => onAction("prepare")}
      onRefresh={() => onAction("check-draft")} onReloadBrowser={onReloadBrowser} onSelectDocument={setSelected}
      prepareButtonLabel="Prepare Handoff" prepareEnabled={available("prepare") && !busy}
      repairReviewPanel={reviewPanel} selectedDocument={selectedDocument} selectedSlotId={selected}
      showRepairReviewPanel={Boolean(reviewPanel)} statusIdentity={current?.repairId ?? current?.implementationId ?? "Repair"}
      statusLabel="Routed Work Item Repair" statusReason={model?.reasons.join(" ") ?? ""}
      statusTarget={current?.contractTargetPath} workspaceAriaLabel="Routed Repair Work Card and Architect" />
  </section>;
}
