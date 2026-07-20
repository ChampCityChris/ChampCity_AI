import type { CurrentStepRouteContext } from "./currentStepContextInspector";
import type {
  CanonicalRoutedScreenViewModel,
  RoutedActionContract,
} from "../workflow";
import type { RoutedArchitectReviewBinding } from "./architectReviewRecord";

export const lockedWorkflowSteps = [
  "Project Intake",
  "Project Interview",
  "Reconciliation Review",
  "Project Mapping",
  "Operator Project Approval",
  "Phase Mapping",
  "Operator Phase Approval",
  "Work Card Loop",
  "Phase Closeout",
  "Operator Phase Closeout Approval",
  "Roadmap Update",
  "Next Phase Activation",
  "Repeat Phase Mapping / Work Card Loop",
] as const;

export type LockedWorkflowStep = (typeof lockedWorkflowSteps)[number];
export type CurrentRequiredActionRole = "operator" | "architect" | "implementer" | "app_system";
export type CurrentRequiredActionStatus =
  | "available"
  | "blocked"
  | "needs_review"
  | "needs_approval"
  | "needs_validation"
  | "needs_repair"
  | "complete";
export type CurrentRequiredActionWarningSeverity = "info" | "warning" | "blocking";

export interface CurrentActionArtifactReference {
  path: string;
  role: string;
  status?: string;
  exists?: boolean;
}
export interface CurrentActionMissingArtifact {
  path: string;
  reason: string;
}

export interface CurrentActionExpectedOutput {
  path?: string;
  artifactType: string;
  description: string;
}

export type CurrentActionEvidenceClassificationKind =
  | "accepted_controlling"
  | "present_pending_disposition"
  | "missing_required"
  | "stale_historical_superseded"
  | "duplicate_ambiguous";

export interface CurrentActionEvidenceClassification {
  id: string;
  label: string;
  summary: string;
  classification: CurrentActionEvidenceClassificationKind;
  sourceArtifacts?: CurrentActionArtifactReference[];
}

export interface CurrentActionManualFallback {
  available: boolean;
  instructions: string;
  artifactPath?: string;
}

export interface CurrentRequiredActionWarning {
  code: string;
  message: string;
  severity: CurrentRequiredActionWarningSeverity;
  sourceArtifactPath?: string;
}

export interface CurrentRequiredAction {
  id: string;
  workflowStep: LockedWorkflowStep | string;
  title: string;
  summary: string;
  maintenanceActionLabel?: string;
  responsibleRole: CurrentRequiredActionRole;
  phaseId?: string;
  phaseTitle?: string;
  workCardId?: string;
  workCardTitle?: string;
  status: CurrentRequiredActionStatus;
  reason: string;
  sourceArtifacts: CurrentActionArtifactReference[];
  missingArtifacts: CurrentActionMissingArtifact[];
  expectedOutput?: CurrentActionExpectedOutput;
  successRoute?: string;
  failureRoute?: string;
  repairRoute?: string;
  manualFallback?: CurrentActionManualFallback;
  evidenceClassifications?: CurrentActionEvidenceClassification[];
  warnings: CurrentRequiredActionWarning[];
  routedAction?: RoutedActionContract;
}

/** Legacy-shaped context input retained only for the read-only evidence explainer. */
export interface CurrentActionProjectState {
  projectName?: string;
  projectIntake?: CurrentActionArtifactReference;
  projectInterview?: CurrentActionArtifactReference;
  reconciliationReview?: CurrentActionArtifactReference;
  projectRoadmap?: CurrentActionArtifactReference;
  phaseMap?: CurrentActionArtifactReference;
  operatorProjectApproval?: CurrentActionArtifactReference;
  projectApprovalSatisfiedByPhaseActivation?: boolean;
  roadmapCurrentExecutableWorkCardId?: string;
  isComplete?: boolean;
  blockedReason?: string;
}

export interface CurrentActionWorkCardCandidate {
  workCardId: string;
  title: string;
  order: number;
  status?: string;
  sourceArtifact?: CurrentActionArtifactReference;
}

export interface CurrentActionValidationState {
  result?: string;
  decision?: string;
  architectDispositionPending?: boolean;
  architectDispositionMissing?: boolean;
  legacyOperatorDecision?: string;
  repairRequired?: boolean;
  routeBlocked?: boolean;
  authority?: "single" | "duplicate_ambiguous";
  duplicateCount?: number;
  conflictingResults?: string[];
  sourceArtifacts: CurrentActionArtifactReference[];
}

export interface CurrentActionArchitectReviewState {
  status?: string;
  sourceArtifact: CurrentActionArtifactReference;
}

export interface CurrentActionRepairState {
  repairId?: string;
  title?: string;
  status?: string;
  repairPrompt?: CurrentActionArtifactReference;
  repairWorkCard?: CurrentActionArtifactReference;
  implementerReport?: CurrentActionArtifactReference;
  architectReview?: CurrentActionArchitectReviewState;
  validation?: CurrentActionValidationState;
  triggerArtifacts?: CurrentActionArtifactReference[];
  supersedesRepairIds?: string[];
  routeEvidenceArtifacts?: CurrentActionArtifactReference[];
  evidenceClassifications?: CurrentActionEvidenceClassification[];
  authorityAmbiguous?: boolean;
  authorityAmbiguityReason?: string;
}

export interface CurrentActionWorkCardState {
  workCardId: string;
  title: string;
  phaseId: string;
  status?: string;
  sourceJsonFile?: string;
  sourceMarkdownFile?: string;
  sourceArtifacts: CurrentActionArtifactReference[];
  implementerReport?: CurrentActionArtifactReference;
  architectReview?: CurrentActionArchitectReviewState;
  validation?: CurrentActionValidationState;
  repair?: CurrentActionRepairState;
}

export interface CurrentActionPhaseCloseoutState {
  sourceArtifact?: CurrentActionArtifactReference;
  decision?: string;
  nextPhaseActivationDecision?: string;
  operatorApproved?: boolean;
}

export interface CurrentActionPhaseState {
  phaseId: string;
  phaseTitle: string;
  status?: string;
  sourceArtifacts: CurrentActionArtifactReference[];
  operatorPhaseApproval?: CurrentActionArtifactReference;
  workCardCandidates: CurrentActionWorkCardCandidate[];
  workCards: CurrentActionWorkCardState[];
  closeout?: CurrentActionPhaseCloseoutState;
  roadmapUpdatedAfterCloseout?: boolean;
  nextPhaseActivated?: boolean;
}

export interface CurrentRequiredActionState {
  project: CurrentActionProjectState;
  activePhase?: CurrentActionPhaseState;
  warnings?: CurrentRequiredActionWarning[];
}

export interface CurrentRequiredActionResult {
  ok: boolean;
  currentAction?: CurrentRequiredAction;
  routedScreen?: CanonicalRoutedScreenViewModel;
  routedArchitectReviewBinding?: RoutedArchitectReviewBinding;
  routeContext?: CurrentStepRouteContext;
  workflowSteps: readonly LockedWorkflowStep[];
  errorMessages?: string[];
}
