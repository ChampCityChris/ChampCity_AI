import type { DocumentDispositionStatus } from "./documents/documentDisposition";
import type { PlanExecutionProjection } from "./planExecutionContracts";

export type WorkIssueAction = "open" | "status" | "prepare" | "copy" | "review" | "activate-execution" | "accept-phase";
export interface WorkIssueModel {
  execution?: PlanExecutionProjection;
  intakeId: string;
  issueId: string | null;
  handoffPath: string | null;
  architect: IssueArchitectPlanningProjection | null;
  correctionPlanningReady: boolean;
  rerouteRecommended: boolean;
  reviewEvidenceDigest: string | null;
}
export interface WorkIssueActionInput {
  phaseAcceptance?: { phaseId: string; expectedFingerprint: string; notes: string };
  review?: IssueArchitectReviewInput;
  expectedEvidenceDigest?: string;
  screenshots?: IssueScreenshotEvidenceInput[];
}

export type IssueResolutionStageId =
  | "intake"
  | "architect-planning"
  | "issue-planning"
  | "fix-cards"
  | "issue-validation"
  | "issue-close";

export interface IssueResolutionStageDefinition {
  id: IssueResolutionStageId;
  label: string;
  order: number;
  defaultAvailable: boolean;
}

export const issueResolutionStages: readonly IssueResolutionStageDefinition[] = [
  { id: "intake", label: "Intake", order: 1, defaultAvailable: true },
  { id: "architect-planning", label: "Architect Planning", order: 2, defaultAvailable: true },
  { id: "issue-planning", label: "Issue Planning", order: 3, defaultAvailable: false },
  { id: "fix-cards", label: "Fix Cards", order: 4, defaultAvailable: false },
  { id: "issue-validation", label: "Issue Validation", order: 5, defaultAvailable: false },
  { id: "issue-close", label: "Issue Close", order: 6, defaultAvailable: false },
] as const;

export type IssueFixCardLoopStepId =
  | "fix-card-map"
  | "planning"
  | "implement"
  | "review-validation"
  | "repair"
  | "close-next";

export interface IssueFixCardLoopDefinition {
  id: IssueFixCardLoopStepId;
  label: string;
  order: number;
}

export const issueFixCardLoop: readonly IssueFixCardLoopDefinition[] = [
  { id: "fix-card-map", label: "Fix Card Map", order: 1 },
  { id: "planning", label: "Planning", order: 2 },
  { id: "implement", label: "Implement", order: 3 },
  { id: "review-validation", label: "Review & Validation", order: 4 },
  { id: "repair", label: "Repair", order: 5 },
  { id: "close-next", label: "Close / Next", order: 6 },
] as const;

export type IssueRecordState = "missing" | "read-error" | "readable";

export interface IssueRecordProjection {
  issueId: string;
  numericId: number;
  title: string;
  recordPath: string;
  recordState: IssueRecordState;
  bodyMarkdown?: string;
  readError?: string;
}

export interface IssueInventoryProjection {
  issues: IssueRecordProjection[];
}

export const issueScreenshotEvidenceMimeTypes = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export type IssueScreenshotEvidenceMimeType =
  (typeof issueScreenshotEvidenceMimeTypes)[number];

export const issueScreenshotEvidencePolicy = {
  maxCount: 4,
  maxDecodedBytesPerImage: 5_000_000,
  maxAggregateDecodedBytes: 20_000_000,
  maxWidth: 4096,
  maxHeight: 4096,
  maxPixelsPerImage: 12_000_000,
} as const;

export interface IssueScreenshotEvidenceInput {
  mimeType: IssueScreenshotEvidenceMimeType;
  base64: string;
}

export interface NewIssueInput {
  title: string;
  issue: string;
  currentConsequence: string;
  neededCapability?: string;
  discoveryContext?: string;
  screenshots?: IssueScreenshotEvidenceInput[];
}

export interface CreateIssueResult {
  createdIssueId: string;
  createdRecordPath: string;
  inventory: IssueInventoryProjection;
}

export type IssueArchitectInvestigationReadState = "missing" | "readable" | "read-error";

export const issueArchitectRecommendations = [
  "Proceed in Issue Resolution",
  "Reframe to Development/Feature",
  "Unsupported / No Action",
] as const;

export type IssueArchitectRecommendation = (typeof issueArchitectRecommendations)[number];

export const issueArchitectReviewDispositions = [
  "Approved",
  "RevisionRequested",
  "Rejected",
] as const;

export type IssueArchitectReviewDisposition = (typeof issueArchitectReviewDispositions)[number];

export type IssueArchitectPlanningStatus =
  | "blocked-no-issue"
  | "blocked-unreadable-record"
  | "ready-for-handoff"
  | "handoff-prepared"
  | "draft-ready"
  | "awaiting-operator-review"
  | "revision-requested"
  | "approved-ready-for-issue-planning"
  | "approved-reframe-recommended"
  | "approved-unsupported-no-action"
  | "rejected-needs-attention"
  | "needs-attention";

export type IssuePlanningStatus =
  | "blocked-no-issue"
  | "blocked-unreadable-record"
  | "blocked-architect-planning-not-eligible"
  | "ready-for-handoff"
  | "handoff-prepared"
  | "waiting-for-drafts"
  | "awaiting-operator-review"
  | "revision-requested"
  | "approved-ready-for-fix-cards"
  | "rejected-needs-attention"
  | "needs-attention";

export type IssueFixCardsStatus =
  | "fix-card-map-ready"
  | "blocked-no-issue"
  | "blocked-unreadable-record"
  | "blocked-planning-not-approved"
  | "needs-attention";

export type IssueValidationStatus =
  | "blocked-no-issue"
  | "blocked-unreadable-evidence"
  | "blocked-planning-not-approved"
  | "blocked-fix-cards-incomplete"
  | "eligible"
  | "approved"
  | "revision-requested"
  | "needs-attention";

export type IssueCloseStatus =
  | "blocked-no-issue"
  | "blocked-unreadable-evidence"
  | "blocked-validation-not-approved"
  | "eligible"
  | "closed"
  | "needs-attention";

export type IssueFixCardContractStatus =
  | "blocked-no-issue"
  | "blocked-fix-card-map-unavailable"
  | "candidate-selection-required"
  | "planning-ready"
  | "planning-handoff-prepared"
  | "planning-waiting-for-draft"
  | "planning-draft-ready"
  | "contract-awaiting-review"
  | "contract-revision-requested"
  | "contract-approved-ready-to-implement"
  | "contract-rejected"
  | "implement-report-missing"
  | "implement-report-reserved"
  | "review-validation-ready"
  | "validated-awaiting-close"
  | "repair-required"
  | "repair-planning"
  | "needs-attention";

export type IssueFixCardReportReadiness =
  | "missing"
  | "reserved-skeleton"
  | "ready-for-review"
  | "invalid"
  | "conflict";

export type IssueFixCardAdvisoryRecommendation =
  | "Validate Passed"
  | "Request Repair"
  | "Inconclusive";

export type IssueFixCardCandidateLifecycleState =
  | "eligible"
  | "blocked-by-dependencies"
  | "planning"
  | "planning-handoff"
  | "awaiting-contract-review"
  | "revision-requested"
  | "ready-to-implement"
  | "implementation-evidence-ready"
  | "review-validation"
  | "validated-awaiting-close"
  | "repair-required"
  | "in-repair"
  | "complete"
  | "needs-attention";

export type IssueFixCardCloseRecordOrigin = "fix-card-validation" | "bootstrap-cutover";

export interface IssueFixCardCloseRecordProjection {
  path: string;
  state: IssueArchitectInvestigationReadState;
  origin?: IssueFixCardCloseRecordOrigin;
  currentImplementationId?: string;
  repairId?: string;
  validationRecordPath?: string;
  revision?: number;
  readError?: string;
  reason: string;
}

export interface IssueFixCardCandidateLifecycleProjection {
  state: IssueFixCardCandidateLifecycleState;
  label: string;
  reason: string;
  selectable: boolean;
}

export interface IssueWorkflowStatusProjection {
  issueId: string;
  stageId: "architect-planning" | "issue-planning" | "fix-cards" | "issue-validation" | "issue-close";
  stageLabel: "Architect Planning" | "Issue Planning" | "Fix Cards" | "Issue Validation" | "Issue Close";
  state: IssueArchitectPlanningStatus | IssuePlanningStatus | IssueFixCardsStatus | IssueValidationStatus | IssueCloseStatus;
  stateLabel: string;
  issuePlanningEligible: boolean;
  fixCardsEligible?: boolean;
  reason: string;
}

export interface IssueResolutionStageAvailability {
  stageId: IssueResolutionStageId;
  available: boolean;
  stateLabel: string;
  reason: string;
}

export interface IssueResolutionNavigationProjection {
  issueId: string;
  title: string;
  stages: IssueResolutionStageAvailability[];
  issuePlanningAvailable: boolean;
  fixCardsAvailable: boolean;
  allFixCardsClosed: boolean;
  issueValidationAvailable: boolean;
  issueCloseAvailable: boolean;
  currentStageId: IssueResolutionStageId;
  workflowStatus: IssueWorkflowStatusProjection | null;
  fixCardsWorkflowStatus: IssueWorkflowStatusProjection | null;
}

export interface IssueFixCardStepAvailability {
  stepId: IssueFixCardLoopStepId;
  available: boolean;
  stateLabel: string;
  reason: string;
}

export interface IssueArchitectDraftSubmission {
  submissionId: string;
  temporaryDraftPath: string;
  preparedInstruction: string;
  issueRecordSha256?: string;
}

export interface IssueArchitectPlanningProjection {
  issueId: string;
  title: string;
  issueRecordPath: string;
  issueRecordMarkdown?: string;
  issueRecordState: IssueRecordState;
  issueRecordReadError?: string;
  finalInvestigationPath: string;
  finalInvestigationState: IssueArchitectInvestigationReadState;
  finalInvestigationMarkdown?: string;
  finalInvestigationReadError?: string;
  architectRecommendation?: IssueArchitectRecommendation;
  reviewPath: string;
  reviewState: IssueArchitectInvestigationReadState;
  operatorDisposition?: IssueArchitectReviewDisposition;
  operatorReviewNotes?: string;
  reviewReadError?: string;
  status: IssueArchitectPlanningStatus;
  statusMessage: string;
  workflowStatus: IssueWorkflowStatusProjection;
  issuePlanningEligible: boolean;
  activeSubmission?: IssueArchitectDraftSubmission;
  canPrepareHandoff: boolean;
  canCopyHandoff: boolean;
  canPromoteDraft: boolean;
}

export interface IssuePlanningDraftSubmission {
  submissionId: string;
  issueResolutionPlanDraftPath: string;
  fixCardPlanDraftPath: string;
  preparedInstruction: string;
}

export interface IssueFixCardPlanCandidate {
  fixCardId: string;
  order: number;
  title: string;
  purpose: string;
  dependsOn: string[];
  evidencePaths: string[];
  lifecycle?: IssueFixCardCandidateLifecycleProjection;
}

export interface IssueFixCardDraftSubmission {
  submissionId: string;
  temporaryDraftPath: string;
  preparedInstruction: string;
  metadataSha256?: string;
  bodySha256?: string;
  draftRevision?: number;
  finalFixCardTarget?: string;
  implementerReportTarget?: string;
  documentDisposition?: DocumentDispositionStatus;
}

export type IssueFixCardImplementationKind = "root-fix-card" | "repair";

export type IssueFixCardValidationDecision = "ValidatePassed" | "RequestRepair";

export interface IssueFixCardValidationDecisionInput {
  decision: IssueFixCardValidationDecision;
  operatorNotes: string;
  advisorySummary?: string;
  boundedDefect?: string;
}

export interface IssueFixCardRepairDraftSubmission extends IssueFixCardDraftSubmission {
  repairId: string;
  parentImplementationId: string;
  validationRecordPath: string;
  parentImplementationPath: string;
  finalRepairTarget: string;
  bodyMarkdown: string;
  validationError?: string;
}

export interface IssueFixCardProjection {
  execution?: PlanExecutionProjection;
  issueId: string;
  title: string;
  selectedCandidate?: IssueFixCardPlanCandidate;
  candidates: IssueFixCardPlanCandidate[];
  currentStep: IssueFixCardLoopStepId;
  status: IssueFixCardContractStatus;
  statusMessage: string;
  stepAvailability: IssueFixCardStepAvailability[];
  currentImplementationId?: string;
  currentImplementationKind?: IssueFixCardImplementationKind;
  currentRepairId?: string;
  parentImplementationId?: string;
  parentImplementationPath?: string;
  finalContractPath?: string;
  controlledDraftPath?: string;
  controlledDraftRevision?: number;
  controlledDraftMetadataSha256?: string;
  controlledDraftBodySha256?: string;
  contractPath?: string;
  contractState: IssueArchitectInvestigationReadState;
  contractMarkdown?: string;
  contractReadError?: string;
  contractRevision?: number;
  contractDisposition?: DocumentDispositionStatus;
  contractReviewNotes?: string;
  implementerReportPath?: string;
  implementerReportState: IssueArchitectInvestigationReadState;
  implementerReportMarkdown?: string;
  implementerReportReadError?: string;
  implementerReportRevision?: number;
  implementerReportDisposition?: DocumentDispositionStatus;
  implementerReportReadiness: IssueFixCardReportReadiness;
  implementerReportReadinessReason: string;
  architectReviewPath?: string;
  architectReviewState: IssueArchitectInvestigationReadState;
  architectReviewMarkdown?: string;
  architectReviewReadError?: string;
  architectReviewRevision?: number;
  architectReviewRecommendation?: IssueFixCardAdvisoryRecommendation;
  validationRecordPath?: string;
  validationRecordState: IssueArchitectInvestigationReadState;
  validationRecordMarkdown?: string;
  validationRecordReadError?: string;
  validationRecordRevision?: number;
  validationRecordDisposition?: DocumentDispositionStatus;
  validationAttemptNumber?: number;
  validationOperatorNotes?: string;
  validationBoundedDefect?: string;
  closeRecord: IssueFixCardCloseRecordProjection;
  nextEligibleCandidate?: IssueFixCardPlanCandidate;
  allFixCardsClosed: boolean;
  activePlanningSubmission?: IssueFixCardDraftSubmission;
  activeRepairSubmission?: IssueFixCardRepairDraftSubmission;
  canSelectCandidate: boolean;
  canPreparePlanningHandoff: boolean;
  canCopyPlanningHandoff: boolean;
  canApplyContractReview: boolean;
  canReserveImplementerReport: boolean;
  canRunImplementer: boolean;
  canCopyAdvisoryPrompt: boolean;
  canApplyValidationDecision: boolean;
  canRequestRepair: boolean;
  canPrepareRepairHandoff: boolean;
  canCopyRepairHandoff: boolean;
  canCloseFixCard: boolean;
}

export interface IssuePlanningProjection {
  issueId: string;
  title: string;
  issueRecordPath: string;
  issueRecordMarkdown?: string;
  issueRecordState: IssueRecordState;
  issueRecordReadError?: string;
  architectInvestigationPath: string;
  architectInvestigationState: IssueArchitectInvestigationReadState;
  architectInvestigationMarkdown?: string;
  architectReviewPath: string;
  architectReviewState: IssueArchitectInvestigationReadState;
  architectReviewMarkdown?: string;
  architectReviewReadError?: string;
  architectReviewDisposition?: IssueArchitectReviewDisposition;
  architectRecommendation?: IssueArchitectRecommendation;
  architectPlanningEligible: boolean;
  issueResolutionPlanPath: string;
  issueResolutionPlanState: IssueArchitectInvestigationReadState;
  issueResolutionPlanMarkdown?: string;
  issueResolutionPlanReadError?: string;
  fixCardPlanPath: string;
  fixCardPlanState: IssueArchitectInvestigationReadState;
  fixCardPlanMarkdown?: string;
  fixCardPlanReadError?: string;
  fixCardCandidates: IssueFixCardPlanCandidate[];
  fixCardPlanValidationFindings: string[];
  reviewPath: string;
  reviewState: IssueArchitectInvestigationReadState;
  reviewMarkdown?: string;
  operatorDisposition?: IssueArchitectReviewDisposition;
  operatorReviewNotes?: string;
  reviewReadError?: string;
  status: IssuePlanningStatus;
  statusMessage: string;
  workflowStatus: IssueWorkflowStatusProjection;
  fixCardsEligible: boolean;
  activeSubmission?: IssuePlanningDraftSubmission;
  canPrepareHandoff: boolean;
  canCopyHandoff: boolean;
  canApplyReview: boolean;
  revisionSource?: "issue-planning-review" | "issue-validation";
  issueValidationRevisionRecordPath?: string;
  issueValidationRevisionRecordMarkdown?: string;
  issueValidationBoundedCorrectiveWork?: string;
}

export type IssueValidationDecision = "ValidateResolved" | "RequestCorrectiveWork";

export interface IssueValidationDecisionInput {
  decision: IssueValidationDecision;
  operatorNotes: string;
  boundedCorrectiveWork?: string;
  expectedEvidenceSha256: string;
}

export interface IssueValidationSourceEvidence {
  label: string;
  path: string;
  revision: number;
  sha256: string;
  state: IssueArchitectInvestigationReadState;
  bodyMarkdown?: string;
  readError?: string;
}

export interface IssueValidationCompletedFixCardSummary {
  fixCardId: string;
  order: number;
  title: string;
  closeRecordPath: string;
  closeRecordOrigin: IssueFixCardCloseRecordOrigin;
  closeRecordRevision: number;
  currentImplementationId: string;
  repairId?: string;
  reason: string;
}

export interface IssueValidationProjection {
  issueId: string;
  title: string;
  status: IssueValidationStatus;
  statusMessage: string;
  eligible: boolean;
  sourceEvidence: IssueValidationSourceEvidence[];
  completedFixCards: IssueValidationCompletedFixCardSummary[];
  evidenceSha256?: string;
  planningDisposition?: IssueArchitectReviewDisposition;
  currentRecordPath?: string;
  currentRecordState: IssueArchitectInvestigationReadState;
  currentRecordMarkdown?: string;
  currentRecordReadError?: string;
  currentRecordRevision?: number;
  currentDisposition?: DocumentDispositionStatus;
  currentDecision?: IssueValidationDecision;
  currentAttemptNumber?: number;
  operatorNotes?: string;
  boundedCorrectiveWork?: string;
  nextAttemptNumber: number;
  canValidateResolved: boolean;
  canRequestCorrectiveWork: boolean;
  workflowStatus: IssueWorkflowStatusProjection;
}

export interface IssueCloseValidationBasis {
  recordPath: string;
  recordRevision: number;
  recordMarkdown: string;
  recordSha256: string;
  attemptNumber: number;
  disposition: "Approved";
  decision: "ValidateResolved";
  operatorNotes?: string;
  aggregateEvidenceSha256: string;
}

export interface IssueCloseRecordProjection {
  path: string;
  state: IssueArchitectInvestigationReadState;
  revision?: number;
  bodyMarkdown?: string;
  validationBasisSha256?: string;
  readError?: string;
}

export interface IssueCloseProjection {
  issueId: string;
  title: string;
  status: IssueCloseStatus;
  statusMessage: string;
  eligible: boolean;
  issueRecordPath: string;
  issueRecordState: IssueRecordState;
  issueRecordMarkdown?: string;
  issueRecordReadError?: string;
  sourceEvidence: IssueValidationSourceEvidence[];
  completedFixCards: IssueValidationCompletedFixCardSummary[];
  validationBasis?: IssueCloseValidationBasis;
  validationBasisSha256?: string;
  closeRecord: IssueCloseRecordProjection;
  canCloseIssue: boolean;
  workflowStatus: IssueWorkflowStatusProjection;
}

export interface IssueCloseActionInput {
  expectedValidationBasisSha256: string;
}

export interface IssueArchitectReviewInput {
  disposition: IssueArchitectReviewDisposition;
  operatorNotes?: string;
  expectedReviewedBodySha256?: string;
}

export interface IssueArchitectPlanningActionResult {
  ok: boolean;
  action: string;
  message: string;
  projection: IssueArchitectPlanningProjection;
}

export interface IssuePostMutationProjection {
  navigation: IssueResolutionNavigationProjection;
  planning?: IssuePlanningProjection;
  validation?: IssueValidationProjection;
  close?: IssueCloseProjection;
}

export interface IssueArchitectPlanningMutationResult extends IssueArchitectPlanningActionResult {
  postMutation: IssuePostMutationProjection;
}

export interface IssuePlanningActionResult {
  ok: boolean;
  action: string;
  message: string;
  projection: IssuePlanningProjection;
}

export interface IssuePlanningMutationResult extends IssuePlanningActionResult {
  postMutation: IssuePostMutationProjection;
}

export interface IssueFixCardActionResult {
  ok: boolean;
  action: string;
  message: string;
  projection: IssueFixCardProjection;
}

export interface IssueFixCardMutationResult extends IssueFixCardActionResult {
  postMutation: IssuePostMutationProjection;
}

export interface IssueValidationActionResult {
  ok: boolean;
  action: string;
  message: string;
  projection: IssueValidationProjection;
}

export interface IssueValidationMutationResult extends IssueValidationActionResult {
  postMutation: IssuePostMutationProjection;
}

export interface IssueCloseActionResult {
  ok: boolean;
  action: "issueClose.closeIssue";
  message: string;
  projection: IssueCloseProjection;
}
