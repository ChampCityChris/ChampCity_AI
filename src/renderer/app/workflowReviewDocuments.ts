import type { PlanningDocumentSummary } from "../../shared/documents/planningDocument";

export function isWorkflowReviewDocument(document: PlanningDocumentSummary): boolean {
  return (
    Boolean(document.metadata.canonical) &&
    !document.readError &&
    (!document.documentReadState || document.documentReadState === "readable") &&
    document.metadata.participationRole !== "nonReviewHandoff"
  );
}
