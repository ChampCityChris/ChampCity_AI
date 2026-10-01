import type { StructuredArchitectWorkspaceModel } from "./architectWorkspaceContracts";
export function architectReviewRevisionKey(model: StructuredArchitectWorkspaceModel | null): string | null {
  return model?.ready && model.review ? `${model.workflowId}:${model.review.cycleId}@${model.review.recordVersion}` : null;
}
export function canReviewArchitectRevision(model: StructuredArchitectWorkspaceModel | null, viewedRevision: string | null): boolean {
  const revision = architectReviewRevisionKey(model);
  return !!revision && revision === viewedRevision;
}
