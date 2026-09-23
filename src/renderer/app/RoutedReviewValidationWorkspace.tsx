import { useState, type ReactNode } from "react";
import type { RoutedWorkflowAction, RoutedWorkflowInput, RoutedWorkflowModel } from "../../shared/routedWorkflowContracts";
import { OperatorValidationPresentation } from "./OperatorValidationPresentation";

export function RoutedReviewValidationWorkspace({ model, browserPanel, busy, error, onAction, onReloadBrowser }: {
  model: RoutedWorkflowModel | null;
  browserPanel: ReactNode;
  busy: boolean;
  error: string;
  onAction: (action: RoutedWorkflowAction, input?: RoutedWorkflowInput) => void;
  onReloadBrowser: () => void;
}): JSX.Element {
  const [selected, setSelected] = useState<"contract" | "report">("report");
  const [notes, setNotes] = useState("");
  const [defect, setDefect] = useState("");
  const [advisory, setAdvisory] = useState("");
  const current = model?.current;
  const contract = current?.contract;
  const report = current?.report;
  const document = selected === "contract" ? contract : report;
  const available = (action: RoutedWorkflowAction) => Boolean(model?.actions.includes(action));
  return <section className="routed-review-workspace" aria-label="Routed Review & Validation">
    <header className="issue-resolution-header"><div><span>Work Intake · Current Work Item</span>
      <h1>Review & Validation</h1><p>{current?.implementationId ?? "Work Item"} · Architect review is advisory; the Operator records the decision.</p></div></header>
    <div className="routed-review-layout">
      <div><section className="work-card-report-evidence-strip" aria-label="Review evidence">
        <div><span>Approved Work Card</span><strong>{contract?.path ?? "Waiting"}</strong><small>Revision {contract?.revision ?? "waiting"}</small></div>
        <div><span>Implementer Report</span><strong>{report?.path ?? current?.reportTargetPath ?? "Waiting"}</strong>
          <small>Revision {report?.revision ?? "waiting"} · {report?.disposition ?? "Waiting"}</small></div>
      </section>
        <OperatorValidationPresentation ariaLabel="Routed review documents" decisionAriaLabel="Routed Operator validation controls"
          documentChoices={[{ id: "contract", label: current?.repairId ? "Approved Repair Work Card" : "Approved Work Card", available: Boolean(contract) },
            { id: "report", label: "Implementer Report", available: Boolean(report) }]}
          selectedDocumentId={selected} selectedDocumentLabel={selected === "contract" ? "Approved Work Card" : "Implementer Report"}
          selectedDocumentFilename={document?.path.split("/").at(-1) ?? "Waiting for document"}
          selectedDocumentPath={document?.path ?? "Repository-relative path"}
          selectedDocumentStatus={document ? `${document.disposition} · revision ${document.revision}` : "Waiting"}
          selectedDocumentBody={document?.body ?? ""} documentError={error} feedback={model?.feedback}
          advisoryField={{ label: "Advisory Architect summary (optional)", value: advisory, onChange: setAdvisory }}
          operatorNotes={notes} onOperatorNotesChange={setNotes} repairDefectText={defect} onRepairDefectTextChange={setDefect}
          isApplying={busy} canValidatePassed={available("validate") && report?.disposition === "Approved" && !busy}
          canRequestRepair={available("validate") && report?.disposition === "Approved" && Boolean(defect.trim()) && !busy}
          onSelectDocument={(id) => setSelected(id as "contract" | "report")}
          onValidatePassed={() => onAction("validate", { validation: "ValidatePassed", notes })}
          onRequestRepair={() => onAction("validate", { validation: "RequestRepair", notes, repairDefectText: defect })} />
        {available("review-report") && report ? <section className="figma-disposition-panel" aria-label="Implementer Report disposition">
          <header><span>Report review</span></header><p>Review the current report before Operator validation.</p>
          <div className="figma-disposition-row">
            <button type="button" disabled={busy} onClick={() => onAction("review-report", { disposition: "Approved", expectedRevision: report.revision, notes })}>Approve report</button>
            <button type="button" disabled={busy || !notes.trim()} onClick={() => onAction("review-report", { disposition: "RevisionRequested", expectedRevision: report.revision, notes })}>Request report revision</button>
          </div></section> : null}
      </div>
      <aside className="routed-review-architect" aria-label="Advisory Architect">
        <h2>Advisory Architect review</h2><p>Use this handoff for advice on the report and validation evidence.</p>
        <button type="button" disabled={busy || !available("advisory-review")} onClick={() => onAction("advisory-review")}>Copy advisory review handoff</button>
        <button type="button" onClick={onReloadBrowser}>Reload ChatGPT</button>{browserPanel}
      </aside>
    </div>
  </section>;
}
