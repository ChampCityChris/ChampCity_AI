import type { DocumentDispositionStatus } from "../../shared/documents/documentDisposition";

const dispositionOptions: Array<{ label: string; status: DocumentDispositionStatus }> = [
  { label: "Approve", status: "Approved" },
  { label: "Request Revision", status: "RevisionRequested" },
  { label: "Reject", status: "Rejected" },
];

export function FigmaDocumentDispositionPanel({
  canApply,
  currentDocument,
  effectiveDisposition = "Pending",
  isApplying,
  notes,
  onApply,
  onNotesChange,
  onStatusChange,
  status,
  warning,
  workflowStep,
}: {
  canApply: boolean;
  currentDocument?: string;
  effectiveDisposition?: DocumentDispositionStatus;
  isApplying: boolean;
  notes: string;
  onApply: () => void;
  onNotesChange: (notes: string) => void;
  onStatusChange: (status: DocumentDispositionStatus | "") => void;
  status: DocumentDispositionStatus | "";
  warning?: string;
  workflowStep: string;
}): JSX.Element {
  return (
    <section className="figma-disposition-panel" aria-label="Document disposition">
      <header>
        <span>Document Disposition</span>
      </header>
      <div className="figma-disposition-row">
        <label>
          <span>Disposition</span>
          <select
            disabled={isApplying}
            onChange={(event) => onStatusChange(event.target.value as DocumentDispositionStatus | "")}
            value={status}
          >
            <option value="">Select disposition</option>
            {dispositionOptions.map((option) => (
              <option key={option.status} value={option.status}>{option.label}</option>
            ))}
          </select>
        </label>
        <button className="apply-button" disabled={isApplying || !canApply} onClick={onApply} type="button">
          Apply Review
        </button>
        <label className="figma-review-notes">
          <span>Review Notes</span>
          <input
            disabled={isApplying}
            onChange={(event) => onNotesChange(event.target.value)}
            placeholder="Add notes..."
            value={notes}
          />
        </label>
      </div>
      <dl>
        <div>
          <dt>Current Document</dt>
          <dd>{currentDocument ?? "Waiting"}</dd>
        </div>
        <div>
          <dt>Effective Disposition</dt>
          <dd>{effectiveDisposition}</dd>
        </div>
        <div>
          <dt>Workflow Step</dt>
          <dd>{workflowStep}</dd>
        </div>
      </dl>
      {warning ? <div className="document-feedback" role="status">{warning}</div> : null}
    </section>
  );
}
