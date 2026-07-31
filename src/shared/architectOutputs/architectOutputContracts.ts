import type { CanonicalDocumentMetadata } from "../documents/canonicalMarkdown";
import type { SourceRevision } from "../documents/planningDocument";

export type ArchitectOutputBundleMode = "single-output" | "atomic-bundle";

export type ArchitectDraftSubmissionState =
  | "waiting-for-drafts"
  | "partial-draft-set"
  | "ready-for-promotion"
  | "promotion-failed"
  | "promoted"
  | "superseded";

export interface ArchitectDraftSubmissionContext {
  sourceHandoff: SourceRevision;
  submissionKey: string;
}

export interface ArchitectDraftSlotExpectation<TSlotId extends string = string> {
  slotId: TSlotId;
  displayLabel: string;
  draftRelativePath: string;
}

export interface ArchitectDraftPromotionRecord<TSelection = unknown> {
  finalRelativePaths: string[];
  selection: TSelection;
}

export interface ArchitectDraftSubmission<
  TSlotId extends string = string,
  TSelection = unknown,
> {
  submissionId: string;
  outputKind: string;
  owningWorkspaceId: string;
  sourceHandoff: SourceRevision;
  expectedDraftSlots: readonly ArchitectDraftSlotExpectation<TSlotId>[];
  promotionGroupId: string;
  state: ArchitectDraftSubmissionState;
  promotionRecord?: ArchitectDraftPromotionRecord<TSelection>;
}

export interface ArchitectBodyValidationIssue {
  slotId: string;
  message: string;
}

export interface ArchitectCanonicalDocumentBuildInput<TSlotId extends string = string> {
  submission: ArchitectDraftSubmission<TSlotId>;
  slotId: TSlotId;
  bodyMarkdown: string;
}

export interface ArchitectCanonicalDocumentBuildResult {
  relativePath: string;
  metadata: CanonicalDocumentMetadata;
}

export interface ArchitectOutputSlotDefinition<TSlotId extends string = string> {
  slotId: TSlotId;
  displayLabel: string;
  draftPathComponent: string;
  validateBody: (bodyMarkdown: string) => void;
  buildCanonicalDocument: (
    input: ArchitectCanonicalDocumentBuildInput<TSlotId>,
  ) => ArchitectCanonicalDocumentBuildResult;
}

export interface ArchitectPostPromotionSelectionInput<TSlotId extends string = string> {
  submission: ArchitectDraftSubmission<TSlotId>;
  promotedDocuments: readonly ArchitectCanonicalDocumentBuildResult[];
}

export interface ArchitectOutputDefinition<
  TSlotId extends string = string,
  TSelection = unknown,
> {
  outputKind: string;
  owningWorkspaceId: string;
  bundleMode: ArchitectOutputBundleMode;
  slots: readonly ArchitectOutputSlotDefinition<TSlotId>[];
  buildSubmissionId: (context: ArchitectDraftSubmissionContext) => string;
  buildPromotionGroupId: (context: ArchitectDraftSubmissionContext) => string;
  buildPostPromotionSelection: (
    input: ArchitectPostPromotionSelectionInput<TSlotId>,
  ) => TSelection;
}

export interface ArchitectDraftSlotRead<TSlotId extends string = string> {
  slotId: TSlotId;
  draftRelativePath: string;
  bodyMarkdown: string;
}

export interface ArchitectDraftInspectionResult<TSlotId extends string = string> {
  submission: ArchitectDraftSubmission<TSlotId>;
  state: ArchitectDraftSubmissionState;
  presentSlots: ArchitectDraftSlotRead<TSlotId>[];
  missingSlots: ArchitectDraftSlotExpectation<TSlotId>[];
  readErrors: ArchitectBodyValidationIssue[];
}

export type ArchitectDraftPromotionStatus =
  | "not-ready"
  | "promotion-failed"
  | "promoted"
  | "superseded";

export interface ArchitectDraftPromotionResult<TSelection = unknown> {
  status: ArchitectDraftPromotionStatus;
  submission: ArchitectDraftSubmission<string, TSelection>;
  finalRelativePaths: string[];
  selection?: TSelection;
  alreadyPromoted: boolean;
  error?: string;
}
