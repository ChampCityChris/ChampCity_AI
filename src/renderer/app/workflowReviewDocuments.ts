import type { PlanningDocumentSummary } from "../../shared/documents/planningDocument";
import { classifyLifecycleArtifact } from "../../shared/documents/lifecycleArtifact";
import type { WorkspaceId } from "../../shared/workspaceContracts";

export function isWorkflowReviewDocument(
  document: PlanningDocumentSummary,
  workspaceId?: WorkspaceId,
): boolean {
  if (
    !document.metadata.canonical ||
    document.readError ||
    (document.documentReadState && document.documentReadState !== "readable")
  ) {
    return false;
  }

  const classification = classifyLifecycleArtifact(document);
  const isReviewRole =
    classification.participationRole === "gatingReview" ||
    classification.participationRole === "compoundGatingReview";

  return isReviewRole && (!workspaceId || classification.workspaceId === workspaceId);
}
