import type {
  ChampCityApi,
  CloseReturnSelectionProjection,
  CurrentWorkspaceModel,
  ProjectPlanningWorkspaceModel,
  RuntimeActionResult,
  WorkCardMapCandidateProjection,
} from "../../shared/workspaceContracts";
import type { FirstNonApprovedResult } from "../../shared/documents/documentOrder";
import type { PlanningDocumentSummary } from "../../shared/documents/planningDocument";

type RendererRefreshApi = Pick<
  ChampCityApi,
  | "getCloseReturnSelectionProjection"
  | "generateCloseReturnNextIntakeHandoff"
  | "getWorkCardMapProjection"
  | "listDocuments"
  | "getProjectPlanningWorkspaceModel"
  | "getCurrentWorkspaceModel"
  | "resolveCurrentDocument"
>;

export interface RendererRepositoryRefresh {
  documents: PlanningDocumentSummary[];
  projectPlanningModel: ProjectPlanningWorkspaceModel;
  currentModel: CurrentWorkspaceModel;
  resolverResult: FirstNonApprovedResult;
}

export interface CloseReturnMapTransition extends RendererRepositoryRefresh {
  closeReturnResult: RuntimeActionResult;
  projection: CloseReturnSelectionProjection;
  mapResult: RuntimeActionResult;
}

export type CloseReturnCandidateTransition =
  | ({
      state: "established";
      actionResult: RuntimeActionResult;
    } & RendererRepositoryRefresh)
  | {
      state: "rejected";
      error: unknown;
      mapRefreshError: unknown | null;
      mapResult: RuntimeActionResult | null;
    };

export async function executeCloseReturnToMap(
  api: RendererRefreshApi,
  onConsumed?: (
    projection: CloseReturnSelectionProjection,
    result: RuntimeActionResult,
  ) => void,
): Promise<CloseReturnMapTransition> {
  const closeReturnResult = await api.getCloseReturnSelectionProjection();
  const projection = closeReturnSelectionProjectionFromResult(closeReturnResult);
  if (!projection) {
    throw new Error("Close / Next returned a malformed canonical selection projection.");
  }

  onConsumed?.(projection, closeReturnResult);
  const refresh = await refreshRendererRepositoryBinding(api);
  const mapResult = await api.getWorkCardMapProjection(projection.phaseId);

  return {
    closeReturnResult,
    projection,
    mapResult,
    ...refresh,
  };
}

export async function executeCloseReturnCandidateIntake(
  api: RendererRefreshApi,
  phaseId: string,
  candidateId: string,
): Promise<CloseReturnCandidateTransition> {
  let actionResult: RuntimeActionResult;
  try {
    actionResult = await api.generateCloseReturnNextIntakeHandoff(candidateId);
  } catch (error) {
    try {
      return {
        state: "rejected",
        error,
        mapRefreshError: null,
        mapResult: await api.getWorkCardMapProjection(phaseId),
      };
    } catch (mapRefreshError) {
      return {
        state: "rejected",
        error,
        mapRefreshError,
        mapResult: null,
      };
    }
  }

  return {
    state: "established",
    actionResult,
    ...await refreshRendererRepositoryBinding(api),
  };
}

export async function refreshRendererRepositoryBinding(
  api: RendererRefreshApi,
): Promise<RendererRepositoryRefresh> {
  const documents = await api.listDocuments();
  const projectPlanningModel = await api.getProjectPlanningWorkspaceModel();
  const currentModel = await api.getCurrentWorkspaceModel();
  const resolverResult = await api.resolveCurrentDocument();
  return { documents, projectPlanningModel, currentModel, resolverResult };
}

export function closeReturnSelectionProjectionFromResult(
  result: RuntimeActionResult | null,
): CloseReturnSelectionProjection | null {
  if (
    !result ||
    result.ok !== true ||
    result.action !== "currentWorkflow:getCloseReturnSelectionProjection" ||
    !isRecord(result.payload)
  ) {
    return null;
  }

  const payload = result.payload;
  if (
    !isCloseReturnCommonProjection(payload) ||
    !Array.isArray(payload.explanations) ||
    !payload.explanations.every(isSelectionExplanation)
  ) {
    return null;
  }

  if (
    payload.state === "selection-required" &&
    typeof payload.sourceWorkCardPlanPath === "string" &&
    Array.isArray(payload.eligibleCandidates) &&
    payload.eligibleCandidates.every(isWorkCardMapCandidate)
  ) {
    return payload as unknown as CloseReturnSelectionProjection;
  }

  if (
    payload.state === "all-complete" &&
    payload.continuationTarget === "phase-validation" &&
    typeof payload.reason === "string"
  ) {
    return payload as unknown as CloseReturnSelectionProjection;
  }

  if (
    payload.state === "needs-attention" &&
    isBlockerState(payload.blockerState) &&
    typeof payload.reason === "string"
  ) {
    return payload as unknown as CloseReturnSelectionProjection;
  }

  return null;
}

function isCloseReturnCommonProjection(value: Record<string, unknown>): boolean {
  return (
    typeof value.phaseId === "string" &&
    typeof value.closedWorkCardId === "string" &&
    typeof value.closeReturnRecordPath === "string" &&
    Number.isInteger(value.closeReturnRecordRevision) &&
    Number(value.closeReturnRecordRevision) > 0 &&
    typeof value.closeReturnRecordReused === "boolean" &&
    isCloseProjection(value.close) &&
    Array.isArray(value.candidates) &&
    value.candidates.every(isWorkCardMapCandidate)
  );
}

function isCloseProjection(value: unknown): boolean {
  return isRecord(value) &&
    value.closed === true &&
    value.returnTarget === "phase-work-card-selection" &&
    typeof value.reason === "string";
}

function isSelectionExplanation(value: unknown): boolean {
  return isRecord(value) &&
    typeof value.candidateId === "string" &&
    isExplanationState(value.state) &&
    typeof value.reason === "string" &&
    Array.isArray(value.evidencePaths) &&
    value.evidencePaths.every((path) => typeof path === "string");
}

function isWorkCardMapCandidate(value: unknown): value is WorkCardMapCandidateProjection {
  return isRecord(value) &&
    typeof value.candidateId === "string" &&
    typeof value.order === "number" &&
    typeof value.title === "string" &&
    typeof value.purpose === "string" &&
    Array.isArray(value.dependsOn) &&
    value.dependsOn.every((candidateId) => typeof candidateId === "string") &&
    (value.status === undefined || ["Complete", "Eligible", "Ineligible"].includes(String(value.status))) &&
    typeof value.reason === "string" &&
    Array.isArray(value.evidencePaths) &&
    value.evidencePaths.every((path) => typeof path === "string") &&
    typeof value.handoffMarkdownPath === "string" &&
    typeof value.formalWorkCardMarkdownPath === "string" &&
    (value.isActive === undefined || typeof value.isActive === "boolean");
}

function isExplanationState(value: unknown): boolean {
  return [
    "eligible",
    "complete",
    "dependency-blocked",
    "deferred",
    "superseded",
    "already-satisfied",
    "carried-forward",
  ].includes(String(value));
}

function isBlockerState(value: unknown): boolean {
  return [
    "invalid-plan",
    "dependency-blocked",
    "explicitly-resolved",
    "workflow-state-conflict",
  ].includes(String(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
