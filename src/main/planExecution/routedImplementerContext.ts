import { loadRoutedDevelopmentExecution } from "./routedDevelopmentExecutionService";
import { getWorkCardBuildingReviewProjection } from "../workCardBuilding/workCardBuildingReviewService";

/** Application-owned selection; no renderer paths or legacy Phase projection are used. */
export async function resolveRoutedImplementerContext(root: string, intakeId: string, workItemId: string) {
  const state = await loadRoutedDevelopmentExecution(root, intakeId);
  const item = state.projection.workItems.find((entry) => entry.candidate.workItemId === workItemId);
  const entry = state.entries.find((entry) => entry.candidate.workItemId === workItemId);
  if (!entry || !item?.eligible || state.projection.nextWorkItemId !== workItemId || item.complete) throw Error("Routed implementation requires the current eligible Work Item.");
  const projection = getWorkCardBuildingReviewProjection(root, entry.scope, entry.executionWorkCardId);
  return { state, entry, projection };
}
