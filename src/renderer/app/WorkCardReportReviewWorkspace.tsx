import { CheckCircle2, Wrench } from "lucide-react";
import type {
  CurrentWorkspaceModel,
} from "../../shared/workspaceContracts";
import type {
  PlanningDocumentDetail,
  PlanningDocumentSummary,
} from "../../shared/documents/planningDocument";

export type OperatorValidationDecision = "ValidatePassed" | "RequestRepair";

export function WorkCardReportReviewWorkspace({
  advisorySummary,
  documentError,
  documents,
  feedback,
  isApplying,
  model,
  onAdvisorySummaryChange,
  onOperatorNotesChange,
  onRepairDefectTextChange,
  onSelectDocument,
  onValidationDecision,
  operatorNotes,
  repairDefectText,
  selectedDocument,
  selectedDocumentId,
}: {
  advisorySummary: string;
  documentError: string;
  documents: PlanningDocumentSummary[];
  feedback: string;
  isApplying: boolean;
  model: CurrentWorkspaceModel | null;
  onAdvisorySummaryChange: (value: string) => void;
  onOperatorNotesChange: (value: string) => void;
  onRepairDefectTextChange: (value: string) => void;
  onSelectDocument: (logicalDocumentId: string) => void;
  onValidationDecision: (decision: OperatorValidationDecision) => void;
  operatorNotes: string;
  repairDefectText: string;
  selectedDocument: PlanningDocumentDetail | null;
  selectedDocumentId: string | null;
}): JSX.Element {
  const projection = model?.workCardBuildingReview;
  const formalDocument = projection
    ? documents.find((document) => document.markdownPath === projection.formalWorkCardPath)
    : undefined;
  const reportDocument = projection?.report
    ? documents.find((document) => document.logicalDocumentId === projection.report?.logicalDocumentId)
    : undefined;
  const selectedRole = selectedDocumentId && reportDocument?.logicalDocumentId === selectedDocumentId
    ? "report"
    : selectedDocumentId && formalDocument?.logicalDocumentId === selectedDocumentId
    ? "formal"
    : null;
  const reportIsCurrent =
    Boolean(projection?.report) &&
    projection?.reportReadiness === "ready-for-review" &&
    projection?.reportDocumentReadState === "readable" &&
    projection.reportFreshnessState === "fresh" &&
    !projection.reportReadError;
  const selectedDocumentLabel =
    selectedRole === "formal" ? "Approved Work Card" :
    selectedRole === "report" ? "Implementer Report" :
    "Review document";
  const selectedDocumentStatus = selectedDocument?.readError
    ? "Local Error"
    : selectedDocument
    ? [
        selectedRole === "report" ? projection?.reportFreshnessState : "selected",
        selectedRole === "report" ? projection?.reportDocumentReadState : selectedDocument.documentReadState,
      ].filter(Boolean).join(" / ")
    : "Waiting";
  const missingDocumentMessage = !projection
    ? "Review & Validation context is not available for the current workflow step."
    : !formalDocument?.logicalDocumentId
    ? "Approved Work Card Markdown is missing or unreadable."
    : !reportDocument?.logicalDocumentId
    ? "Implementer Report Markdown is missing or unreadable."
    : selectedDocument?.readError
    ? selectedDocument.readError
    : "";
  const canValidatePassed = reportIsCurrent && !isApplying;
  const canRequestRepair = reportIsCurrent && !isApplying && Boolean(repairDefectText.trim());

  return (
    <section className="work-card-report-review-workspace" aria-label="Review & Validation">
      <section className="work-card-report-evidence-strip" aria-label="Review and validation evidence">
        <div>
          <span>Work Card</span>
          <strong>
            {projection?.workCardId ?? model?.currentWorkCardId ?? "Work Card"} - {projection?.workCardTitle ?? model?.currentTarget ?? "Review & Validation"}
          </strong>
          <small>{projection?.formalWorkCardPath ?? "Resolve current Approved Formal Work Card."}</small>
        </div>
        <div>
          <span>Report</span>
          <strong>
            {projection?.implementerReportPath?.split("/").at(-1) ?? "Resolve report target."} | revision {projection?.report?.artifactRevision ?? "waiting"} | {projection?.report?.disposition ?? "Waiting"} | {[projection?.reportFreshnessState, projection?.reportDocumentReadState].filter(Boolean).join("/") || "waiting"}
          </strong>
          <small>{projection?.implementerReportPath ?? "Report path unavailable."}</small>
        </div>
        <div>
          <span>Authority</span>
          <strong>Architect review advisory; Operator decision creates validation authority.</strong>
        </div>
        {feedback ? <div className="document-feedback" role="status">{feedback}</div> : null}
        {documentError || missingDocumentMessage ? (
          <div className="document-error" role="status">
            {documentError || missingDocumentMessage}
          </div>
        ) : null}
      </section>

      <section className="work-card-report-document-pane" aria-label="Review & Validation documents and decision">
        <div className="architect-document-selector" role="tablist" aria-label="Review and validation documents">
          <button
            aria-selected={selectedRole === "formal"}
            className={selectedRole === "formal" ? "document-choice selected" : "document-choice"}
            disabled={!formalDocument?.logicalDocumentId}
            onClick={() => formalDocument?.logicalDocumentId && onSelectDocument(formalDocument.logicalDocumentId)}
            type="button"
          >
            <span>Approved Work Card</span>
          </button>
          <button
            aria-selected={selectedRole === "report"}
            className={selectedRole === "report" ? "document-choice selected" : "document-choice"}
            disabled={!reportDocument?.logicalDocumentId}
            onClick={() => reportDocument?.logicalDocumentId && onSelectDocument(reportDocument.logicalDocumentId)}
            type="button"
          >
            <span>Implementer Report</span>
          </button>
        </div>

        <article className="document-preview">
          <header className="preview-header">
            <div>
              <span>{selectedDocumentLabel}</span>
              <h2>{selectedDocument?.displayFilename ?? selectedDocumentLabel}</h2>
              <p>{selectedDocument?.markdownPath ?? projection?.implementerReportPath ?? "Repository-relative path"}</p>
            </div>
            <div className="document-read-status">
              <span>Read / Freshness</span>
              <strong>{selectedDocumentStatus}</strong>
            </div>
          </header>
          <pre className="preview-body">
            {selectedDocument?.bodyMarkdown ?? selectedDocument?.preview ?? ""}
          </pre>
        </article>

        <section className="architect-review-panel" aria-label="Operator validation controls">
          <label>
            <span>Operator validation notes</span>
            <textarea
              disabled={isApplying}
              onChange={(event) => onOperatorNotesChange(event.target.value)}
              value={operatorNotes}
            />
          </label>
          <label>
            <span>Advisory summary / pasted recommendation (optional)</span>
            <textarea
              disabled={isApplying}
              onChange={(event) => onAdvisorySummaryChange(event.target.value)}
              value={advisorySummary}
            />
          </label>
          <label>
            <span>Repair defect text</span>
            <textarea
              disabled={isApplying}
              onChange={(event) => onRepairDefectTextChange(event.target.value)}
              value={repairDefectText}
            />
          </label>
          <div className="validation-action-row">
            <button
              className="apply-button"
              disabled={!canValidatePassed}
              onClick={() => onValidationDecision("ValidatePassed")}
              type="button"
            >
              <CheckCircle2 aria-hidden="true" size={18} />
              Validate Passed
            </button>
            <button
              className="apply-button secondary"
              disabled={!canRequestRepair}
              onClick={() => onValidationDecision("RequestRepair")}
              type="button"
            >
              <Wrench aria-hidden="true" size={18} />
              Request Repair
            </button>
          </div>
        </section>
      </section>
    </section>
  );
}
