import type {
  PhaseValidationActionProjection,
  RuntimeActionResult,
} from "../../shared/workspaceContracts";
import { isDocumentDispositionStatus } from "../../shared/documents/documentDisposition";

export interface PhaseValidationPresentation {
  actionContext: string;
  actionPath: string;
  currentRequiredWorkflowStep: string;
  currentTarget: string;
  eligibility: string;
  requiredAction: string;
  expectedOutput: string;
  expectedNextState: string;
  canCreateCloseout: boolean;
  dispositionTarget: "phase-validation" | null;
}

export function phaseValidationActionForWorkspace(
  workspaceId: string,
  phaseAction: PhaseValidationActionProjection | null,
): PhaseValidationActionProjection | null {
  if (!phaseAction) {
    return null;
  }
  if (workspaceId === "phase-validation") {
    return phaseAction.workspaceId === "phase-validation" &&
      (phaseAction.requiredAction === "create-closeout" ||
        phaseAction.requiredAction === "dispose-closeout")
      ? phaseAction
      : null;
  }
  if (workspaceId === "phase-close") {
    return phaseAction.workspaceId === "phase-close" &&
      phaseAction.requiredAction === "phase-close-complete"
      ? phaseAction
      : null;
  }
  return null;
}

export function requirePhaseValidationActionProjection(
  value: unknown,
): PhaseValidationActionProjection {
  if (!isRecord(value)) {
    throw new Error("Phase Validation returned a malformed repository action projection.");
  }
  const requiredAction = value.requiredAction;
  const workspaceId = value.workspaceId;
  const closeout = value.closeout;
  const actionAndWorkspaceAgree =
    ((requiredAction === "create-closeout" || requiredAction === "dispose-closeout") &&
      workspaceId === "phase-validation") ||
    (requiredAction === "phase-close-complete" && workspaceId === "phase-close");
  const closeoutShapeValid = closeout === undefined || (
    isRecord(closeout) &&
    typeof closeout.logicalDocumentId === "string" &&
    typeof closeout.markdownPath === "string" &&
    typeof closeout.artifactRevision === "number" &&
    isDocumentDispositionStatus(closeout.effectiveDisposition) &&
    (closeout.closureDecision === undefined || typeof closeout.closureDecision === "string") &&
    (closeout.freshnessState === "fresh" || closeout.freshnessState === "stale")
  );
  const closeoutPresenceValid = requiredAction === "create-closeout"
    ? closeout === undefined
    : closeoutShapeValid && closeout !== undefined;
  if (
    value.eligible !== true ||
    typeof value.phaseId !== "string" ||
    !actionAndWorkspaceAgree ||
    !Array.isArray(value.sourceEvidence) ||
    !value.sourceEvidence.every((entry) => typeof entry === "string") ||
    typeof value.reason !== "string" ||
    !closeoutPresenceValid
  ) {
    throw new Error("Phase Validation returned a malformed repository action projection.");
  }
  return value as unknown as PhaseValidationActionProjection;
}

export function phaseValidationActionFromMutationResult(
  result: RuntimeActionResult,
): PhaseValidationActionProjection {
  if (!isRecord(result.payload)) {
    throw new Error("Phase Validation mutation did not return refreshed repository action evidence.");
  }
  try {
    return requirePhaseValidationActionProjection(result.payload.phaseAction);
  } catch {
    throw new Error("Phase Validation mutation did not return refreshed repository action evidence.");
  }
}

export async function loadPhaseValidationEntry(
  readProjection: () => Promise<PhaseValidationActionProjection>,
): Promise<PhaseValidationActionProjection> {
  return requirePhaseValidationActionProjection(await readProjection());
}

export async function executePhaseValidationMutation<RepositoryEvidence>(
  mutation: () => Promise<RuntimeActionResult>,
  refreshRepositoryEvidence: () => Promise<RepositoryEvidence>,
): Promise<{
  result: RuntimeActionResult;
  phaseAction: PhaseValidationActionProjection;
  repositoryEvidence: RepositoryEvidence;
}> {
  const result = await mutation();
  const phaseAction = phaseValidationActionFromMutationResult(result);
  const repositoryEvidence = await refreshRepositoryEvidence();
  return { result, phaseAction, repositoryEvidence };
}

export function phaseValidationPresentation(
  phaseAction: PhaseValidationActionProjection,
): PhaseValidationPresentation {
  const common = {
    actionContext: `Phase Validation — ${phaseAction.phaseId}`,
    actionPath: `phase / validation / ${phaseAction.phaseId}`,
    currentRequiredWorkflowStep: phaseAction.workspaceId === "phase-close"
      ? "Phase Close"
      : "Phase Validation",
    currentTarget: `Current phase ${phaseAction.phaseId}`,
    eligibility: phaseAction.reason,
  };
  switch (phaseAction.requiredAction) {
    case "create-closeout":
      return {
        ...common,
        requiredAction: "Create the current Phase Closeout",
        expectedOutput: `One canonical Pending Phase Closeout for ${phaseAction.phaseId}.`,
        expectedNextState: "Phase Validation remains active with closeout disposition required.",
        canCreateCloseout: true,
        dispositionTarget: null,
      };
    case "dispose-closeout":
      return {
        ...common,
        requiredAction: "Apply disposition to the current Phase Closeout",
        expectedOutput: `A disposition update to ${phaseAction.closeout?.markdownPath ?? "the current canonical Phase Closeout"}.`,
        expectedNextState: "Repository refresh remains in Phase Validation unless Phase Close is complete.",
        canCreateCloseout: false,
        dispositionTarget: "phase-validation",
      };
    case "phase-close-complete":
      return {
        ...common,
        requiredAction: "No Phase Validation mutation required",
        expectedOutput: `Phase Close completion presentation for ${phaseAction.phaseId}.`,
        expectedNextState: "Phase Close is the current completion boundary.",
        canCreateCloseout: false,
        dispositionTarget: null,
      };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
