import { FigmaDocumentCard } from "./FigmaDocumentCard";
import { FigmaDocumentDispositionPanel } from "./FigmaDocumentDispositionPanel";
import type { useWorkflowIntake } from "./useWorkflowIntake";

type IntakeState = ReturnType<typeof useWorkflowIntake>;
export function WorkflowIntakeReviewCard({state}: {state: IntakeState}) {
  return <FigmaDocumentCard selectedDocument={state.model?.reviewDocument ?? null} documentError={state.error}
    feedback={state.model?.materializationError ?? ""} neutralMessage="Save Intake to generate Markdown for review."
    onCopy={() => { void navigator.clipboard.writeText(state.model?.reviewDocument?.bodyMarkdown ?? ""); }} />;
}
export function WorkflowIntakeDisposition({state}: {state: IntakeState}) {
  const document = state.model?.reviewDocument;
  return document ? <FigmaDocumentDispositionPanel canApply={Boolean(state.status) && !state.dirty && state.loaded}
    currentDocument={document.displayFilename} effectiveDisposition={document.effectiveDisposition} isApplying={state.busy}
    notes={state.notes} onNotesChange={state.setNotes} onStatusChange={state.setStatus} status={state.status}
    onApply={() => void state.review()} workflowStep="Intake review"
    warning={state.dirty ? "Save changes before reviewing the current Intake revision." : undefined} /> : null;
}
