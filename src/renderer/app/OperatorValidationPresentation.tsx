import { CheckCircle2, Wrench } from "lucide-react";

export interface OperatorValidationDocumentChoice {
  id: string;
  label: string;
  available: boolean;
}

export function OperatorValidationPresentation({
  advisoryField,
  ariaLabel,
  canRequestRepair,
  canValidatePassed,
  decisionAriaLabel,
  documentChoices,
  documentError,
  feedback,
  isApplying,
  onOperatorNotesChange,
  onRepairDefectTextChange,
  onRequestRepair,
  onSelectDocument,
  onValidatePassed,
  operatorNotes,
  operatorNotesLabel = "Operator validation notes",
  outcomeMessage,
  repairDefectLabel = "Repair defect text",
  repairDefectText,
  requestRepairLabel = "Request Repair",
  selectedDocumentBody,
  selectedDocumentFilename,
  selectedDocumentId,
  selectedDocumentLabel,
  selectedDocumentPath,
  selectedDocumentStatus,
  validatePassedLabel = "Validate Passed",
}: {
  advisoryField?: {
    label: string;
    value: string;
    onChange: (value: string) => void;
  };
  ariaLabel: string;
  canRequestRepair: boolean;
  canValidatePassed: boolean;
  decisionAriaLabel: string;
  documentChoices: OperatorValidationDocumentChoice[];
  documentError?: string;
  feedback?: string;
  isApplying: boolean;
  onOperatorNotesChange: (value: string) => void;
  onRepairDefectTextChange: (value: string) => void;
  onRequestRepair: () => void;
  onSelectDocument: (id: string) => void;
  onValidatePassed: () => void;
  operatorNotes: string;
  operatorNotesLabel?: string;
  outcomeMessage?: string;
  repairDefectLabel?: string;
  repairDefectText: string;
  requestRepairLabel?: string;
  selectedDocumentBody: string;
  selectedDocumentFilename: string;
  selectedDocumentId: string;
  selectedDocumentLabel: string;
  selectedDocumentPath: string;
  selectedDocumentStatus: string;
  validatePassedLabel?: string;
}): JSX.Element {
  return (
    <section className="work-card-report-document-pane" aria-label={ariaLabel}>
      <div className="architect-document-selector" role="tablist" aria-label={ariaLabel}>
        {documentChoices.map((document) => (
          <button
            aria-selected={selectedDocumentId === document.id}
            className={selectedDocumentId === document.id ? "document-choice selected" : "document-choice"}
            disabled={!document.available}
            key={document.id}
            onClick={() => onSelectDocument(document.id)}
            type="button"
          >
            <span>{document.label}</span>
          </button>
        ))}
      </div>

      <article className="document-preview">
        <header className="preview-header">
          <div>
            <span>{selectedDocumentLabel}</span>
            <h2>{selectedDocumentFilename}</h2>
            <p>{selectedDocumentPath}</p>
          </div>
          <div className="document-read-status">
            <span>Read / Freshness</span>
            <strong>{selectedDocumentStatus}</strong>
          </div>
        </header>
        <pre className="preview-body">{selectedDocumentBody}</pre>
      </article>

      <section className="architect-review-panel" aria-label={decisionAriaLabel}>
        <label>
          <span>{operatorNotesLabel}</span>
          <textarea
            disabled={isApplying}
            onChange={(event) => onOperatorNotesChange(event.target.value)}
            value={operatorNotes}
          />
        </label>
        {advisoryField ? (
          <label>
            <span>{advisoryField.label}</span>
            <textarea
              disabled={isApplying}
              onChange={(event) => advisoryField.onChange(event.target.value)}
              value={advisoryField.value}
            />
          </label>
        ) : null}
        <label>
          <span>{repairDefectLabel}</span>
          <textarea
            disabled={isApplying}
            onChange={(event) => onRepairDefectTextChange(event.target.value)}
            value={repairDefectText}
          />
        </label>
        <div className="validation-action-row">
          <button className="apply-button" disabled={!canValidatePassed} onClick={onValidatePassed} type="button">
            <CheckCircle2 aria-hidden="true" size={18} />
            {validatePassedLabel}
          </button>
          <button className="apply-button secondary" disabled={!canRequestRepair} onClick={onRequestRepair} type="button">
            <Wrench aria-hidden="true" size={18} />
            {requestRepairLabel}
          </button>
        </div>
        {documentError ? <div className="document-error" role="status">{documentError}</div> : null}
        {feedback ? <div className="document-feedback" role="status">{feedback}</div> : null}
        {outcomeMessage ? <div className="document-feedback" role="status">{outcomeMessage}</div> : null}
      </section>
    </section>
  );
}
