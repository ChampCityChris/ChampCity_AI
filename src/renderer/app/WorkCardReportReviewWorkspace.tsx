import type {
  CurrentWorkspaceModel,
} from "../../shared/workspaceContracts";
import type {
  PlanningDocumentDetail,
  PlanningDocumentSummary,
} from "../../shared/documents/planningDocument";
import { OperatorValidationPresentation } from "./OperatorValidationPresentation";

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
          <span>Decision ownership</span>
          <strong>Architect review advisory; Operator decision creates validation basis.</strong>
        </div>
      </section>

      <OperatorValidationPresentation
        advisoryField={{
          label: "Advisory summary / pasted recommendation (optional)",
          value: advisorySummary,
          onChange: onAdvisorySummaryChange,
        }}
        ariaLabel="Review & Validation documents and decision"
        canRequestRepair={canRequestRepair}
        canValidatePassed={canValidatePassed}
        decisionAriaLabel="Operator validation controls"
        documentChoices={[
          { id: formalDocument?.logicalDocumentId ?? "approved-work-card", label: "Approved Work Card", available: Boolean(formalDocument?.logicalDocumentId) },
          { id: reportDocument?.logicalDocumentId ?? "implementer-report", label: "Implementer Report", available: Boolean(reportDocument?.logicalDocumentId) },
        ]}
        documentError={documentError || missingDocumentMessage}
        feedback={feedback}
        isApplying={isApplying}
        onOperatorNotesChange={onOperatorNotesChange}
        onRepairDefectTextChange={onRepairDefectTextChange}
        onRequestRepair={() => onValidationDecision("RequestRepair")}
        onSelectDocument={onSelectDocument}
        onValidatePassed={() => onValidationDecision("ValidatePassed")}
        operatorNotes={operatorNotes}
        repairDefectText={repairDefectText}
        selectedDocumentBody={selectedDocument?.bodyMarkdown ?? selectedDocument?.preview ?? ""}
        selectedDocumentFilename={selectedDocument?.displayFilename ?? selectedDocumentLabel}
        selectedDocumentId={selectedDocumentId ?? ""}
        selectedDocumentLabel={selectedDocumentLabel}
        selectedDocumentPath={selectedDocument?.markdownPath ?? projection?.implementerReportPath ?? "Repository-relative path"}
        selectedDocumentStatus={selectedDocumentStatus}
      />
    </section>
  );
}
