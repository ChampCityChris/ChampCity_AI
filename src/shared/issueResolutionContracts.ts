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
  | "architect-review"
  | "fix-card-validation"
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
  { id: "architect-review", label: "Architect Review", order: 4 },
  { id: "fix-card-validation", label: "Fix Card Validation", order: 5 },
  { id: "repair", label: "Repair", order: 6 },
  { id: "close-next", label: "Close / Next", order: 7 },
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

export interface NewIssueInput {
  title: string;
  issue: string;
  currentConsequence: string;
  neededCapability?: string;
  discoveryContext?: string;
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

export interface IssueWorkflowStatusProjection {
  issueId: string;
  stageId: "architect-planning";
  stageLabel: "Architect Planning";
  state: IssueArchitectPlanningStatus;
  stateLabel: string;
  issuePlanningEligible: boolean;
  reason: string;
}

export interface IssueArchitectDraftSubmission {
  submissionId: string;
  temporaryDraftPath: string;
  preparedInstruction: string;
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

export interface IssueArchitectReviewInput {
  disposition: IssueArchitectReviewDisposition;
  operatorNotes?: string;
}

export interface IssueArchitectPlanningActionResult {
  ok: boolean;
  action: string;
  message: string;
  projection: IssueArchitectPlanningProjection;
}
