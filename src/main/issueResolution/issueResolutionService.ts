import fs from "node:fs";
import path from "node:path";
import { readRoutedIssueExecutionPlan } from "../planExecution/issueExecutionPlan";
import { acceptIssueExecutionPhase, issuePhaseAcceptancePath, projectIssueExecution } from "../planExecution/issueExecutionAdapter";
import crypto from "node:crypto";
import type {
  CreateIssueResult,
  IssueCloseActionInput,
  IssueCloseActionResult,
  IssueCloseProjection,
  IssueCloseRecordProjection,
  IssueCloseStatus,
  IssueCloseValidationBasis,
  IssueFixCardActionResult,
  IssueFixCardMutationResult,
  IssueFixCardAdvisoryRecommendation,
  IssueFixCardContractStatus,
  IssueFixCardCandidateLifecycleProjection,
  IssueFixCardCloseRecordOrigin,
  IssueFixCardCloseRecordProjection,
  IssueFixCardDraftSubmission,
  IssueFixCardLoopStepId,
  IssueFixCardProjection,
  IssueArchitectPlanningActionResult,
  IssueArchitectPlanningMutationResult,
  IssueArchitectPlanningProjection,
  IssueArchitectPlanningStatus,
  IssueArchitectDraftSubmission,
  IssueArchitectRecommendation,
  IssueArchitectReviewDisposition,
  IssueArchitectReviewInput,
  IssueFixCardPlanCandidate,
  IssueFixCardRepairDraftSubmission,
  IssueFixCardReportReadiness,
  IssueFixCardValidationDecisionInput,
  IssueInventoryProjection,
  IssuePlanningActionResult,
  IssuePlanningMutationResult,
  IssuePlanningDraftSubmission,
  IssuePlanningProjection,
  IssuePlanningStatus,
  IssueValidationActionResult,
  IssueValidationMutationResult,
  IssueValidationCompletedFixCardSummary,
  IssueValidationDecision,
  IssueValidationDecisionInput,
  IssueValidationProjection,
  IssueValidationSourceEvidence,
  IssueValidationStatus,
  IssueResolutionNavigationProjection,
  IssuePostMutationProjection,
  IssueWorkflowStatusProjection,
  IssueRecordProjection,
  NewIssueInput,
} from "../../shared/issueResolutionContracts";
import {
  issueArchitectRecommendations,
  issueArchitectReviewDispositions,
  issueFixCardLoop,
  issueScreenshotEvidenceMimeTypes,
  issueScreenshotEvidencePolicy,
} from "../../shared/issueResolutionContracts";
import type { CanonicalDocumentMetadata } from "../../shared/documents/canonicalMarkdown";
import type { DocumentDispositionStatus } from "../../shared/documents/documentDisposition";
import {
  metadataWithDisposition,
  metadataWithSubstantiveRevision,
  parseCanonicalMarkdownDocument,
} from "../../shared/documents/canonicalMarkdown";
import {
  writeCanonicalMarkdownDocument,
  writeCanonicalMarkdownDocumentOnce,
  writeCanonicalMarkdownDocuments,
} from "../documents/canonicalMarkdownDocumentWriter";
import {
  buildMcpWorkspaceBindingPromptBlock,
  buildReplaceMarkdownBodyJsonBlock,
  buildWriteMarkdownArtifactJsonBlock,
  resolveMcpWorkspaceBindingForPrompt,
} from "../integrations/mcpWorkspacePromptContract";
import { inspectControlledMarkdownDraft } from "../agentHarness/repository/controlledMarkdownDrafts";
import { buildOperatorValidationAdvisoryPrompt } from "../workCardValidation/workCardValidationService";
import {
  assertSupportedImageBounds,
  inspectSupportedImageBytes,
  SupportedImageValidationError,
} from "../supportedImageValidation";
import { buildImplementationValidationScopeGuidance } from "../validation/implementationValidationScopeGuidance";

const issueDirectoryPattern = /^ISSUE_(\d+)$/;
const requiredArchitectSections = [
  "Purpose",
  "Issue Assessment",
  "Repository Evidence Inspected",
  "Confirmed Current Architecture",
  "Root Cause",
  "Required Architecture",
  "Preservation Rules",
  "Risks and Constraints",
  "Architect Recommendation",
  "Architect Conclusion",
] as const;

const activeArchitectSubmissions = new Map<string, IssueArchitectDraftSubmission>();
const architectAutoPromotionFailures = new Map<string, IssueArchitectDraftFailure>();
const architectHistoryDirectoryName = "Architect_History";
const activePlanningSubmissions = new Map<string, IssuePlanningDraftSubmission>();
const planningAutoPromotionFailures = new Map<string, IssuePlanningDraftFailure>();
const planningHistoryDirectoryName = "Issue_Planning_History";
// Current V1 records written before WC06 may contain these exact field names or
// section headings. Reads normalize them here; all writers below use canonical names.
const legacyIssueCloseDigestField = "authoritySha256";
const legacyFixCardCompletionBasisField = "completionAuthority";
const legacyCompletedFixCardCloseRecordsHeading = "Completed Fix Card Close Authority";
const legacyExactClosureSourceEvidenceHeading = "Exact Closure Source Authority";
const activeFixCardSelections = new Map<string, string>();
const activeFixCardPlanningSubmissions = new Map<string, IssueFixCardDraftSubmission>();
const fixCardPlanningDraftFailures = new Map<string, IssueFixCardDraftFailure & { draftRevision: number }>();
const activeIssueRepairSubmissions = new Map<string, IssueFixCardRepairDraftSubmission>();
const issueRepairAutoPromotionFailures = new Map<string, IssueFixCardDraftFailure>();
const requiredIssueResolutionPlanSections = [
  "Accepted Correction Objective",
  "Bounded Scope",
  "Non-Scope",
  "Architecture Direction",
  "Preservation Requirements",
  "Dependencies and Sequencing",
  "Risks",
  "Validation Strategy",
  "Completion Criteria",
] as const;
const requiredFixCardPlanSections = [
  "Planning Basis",
  "Fix Card Decomposition",
  "Fix Card Map",
] as const;
const requiredFixCardContractSections = [
  "Verified Repository Evidence",
  "Objective",
  "Runtime Sequence",
  "Required Changes",
  "Preserved Behavior",
  "In-Scope Surface",
  "Risks and Constraints",
  "Acceptance Criteria",
  "Negative Constraints",
  "Implementer Report Requirements",
  "Manual Validation",
] as const;
const requiredIssueRepairContractSections = [
  "Confirmed Defect",
  "Source Evidence",
  "Objective",
  "Runtime Sequence",
  "Required Changes",
  "Preserved Behavior",
  "In-Scope Surface",
  "Acceptance Criteria",
  "Negative Constraints",
  "Return Target",
  "Implementer Report Requirements",
  "Manual Validation",
] as const;

interface IssueDirectoryEntry {
  issueId: string;
  numericId: number;
  absolutePath: string;
}

interface IssueProjectionReadContext {
  readonly workspaceRoot: string;
  readonly purpose: "read" | "post-mutation";
  issueDirectories?: readonly IssueDirectoryEntry[];
  readonly issueRecords: Map<string, IssueRecordProjection | null>;
  readonly markdownReads: Map<string, MarkdownReadResult>;
}

interface IssueProjectionReadTestHooks {
  onContextCreated?: (workspaceRoot: string, purpose: IssueProjectionReadContext["purpose"]) => void;
  onDirectoryDiscovery?: (workspaceRoot: string) => void;
  onMarkdownRead?: (relativePath: string, purpose?: IssueProjectionReadContext["purpose"]) => void;
  onMarkdownReadComplete?: (
    relativePath: string,
    bodyMarkdown: string,
    purpose?: IssueProjectionReadContext["purpose"],
  ) => void;
}

let issueProjectionReadTestHooks: IssueProjectionReadTestHooks = {};

export function __setIssueProjectionReadTestHooks(hooks: IssueProjectionReadTestHooks = {}): void {
  issueProjectionReadTestHooks = hooks;
}

function createIssueProjectionReadContext(
  workspaceRoot: string,
  purpose: IssueProjectionReadContext["purpose"] = "read",
): IssueProjectionReadContext {
  const context = {
    workspaceRoot: path.resolve(workspaceRoot),
    purpose,
    issueRecords: new Map(),
    markdownReads: new Map(),
  };
  issueProjectionReadTestHooks.onContextCreated?.(context.workspaceRoot, context.purpose);
  return context;
}

function issueReadContext(
  workspaceRoot: string,
  supplied?: IssueProjectionReadContext,
): IssueProjectionReadContext {
  const resolvedRoot = path.resolve(workspaceRoot);
  if (supplied && pathKey(supplied.workspaceRoot) !== pathKey(resolvedRoot)) {
    throw new Error("Issue projection read context belongs to a different workspace root.");
  }
  return supplied ?? createIssueProjectionReadContext(resolvedRoot);
}

function buildIssuePostMutationProjection(
  workspaceRoot: string,
  issueId: string,
  readContext: IssueProjectionReadContext,
  options: {
    includePlanning?: boolean;
    includeValidation?: boolean;
    includeClose?: boolean;
    includeDestinationProjection?: boolean;
  } = {},
): IssuePostMutationProjection {
  const navigation = getIssueResolutionNavigationProjection(workspaceRoot, issueId, readContext);
  const includePlanning = options.includePlanning ||
    (options.includeDestinationProjection && navigation.currentStageId === "issue-planning");
  const includeValidation = options.includeValidation ||
    (options.includeDestinationProjection && navigation.currentStageId === "issue-validation");
  const includeClose = options.includeClose ||
    (options.includeDestinationProjection && navigation.currentStageId === "issue-close");
  return {
    navigation,
    ...(includePlanning ? { planning: getIssuePlanningProjection(workspaceRoot, issueId, readContext) } : {}),
    ...(includeValidation ? { validation: getIssueValidationProjection(workspaceRoot, issueId, readContext) } : {}),
    ...(includeClose ? { close: getIssueCloseProjection(workspaceRoot, issueId, readContext) } : {}),
  };
}

function pathKey(value: string): string {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

interface ValidatedIssueScreenshot {
  buffer: Buffer;
  extension: "png" | "jpg" | "webp";
}

interface CreatedFilesystemArtifact {
  absolutePath: string;
  device: number;
  inode: number;
  kind: "directory" | "file";
}

interface MarkdownReadResult {
  state: "missing" | "readable" | "read-error";
  bodyMarkdown?: string;
  readError?: string;
}

interface IssueArchitectReviewRecord {
  issueId: string;
  investigationPath: string;
  architectRecommendation: IssueArchitectRecommendation;
  disposition: IssueArchitectReviewDisposition;
  operatorNotes: string;
}

interface IssueArchitectDraftFailure {
  submissionId: string;
  temporaryDraftPath: string;
  message: string;
}

interface IssuePlanningReviewRecord {
  issueId: string;
  issueResolutionPlanPath: string;
  fixCardPlanPath: string;
  disposition: IssueArchitectReviewDisposition;
  operatorNotes: string;
}

interface IssuePlanningDraftFailure {
  submissionId: string;
  issueResolutionPlanDraftPath: string;
  fixCardPlanDraftPath: string;
  message: string;
}

interface IssueFixCardDraftFailure {
  submissionId: string;
  temporaryDraftPath: string;
  message: string;
}

interface IssueFixCardValidationEvidence {
  contract: ReturnType<typeof readCanonicalIssueDocument>;
  report: ReturnType<typeof readCanonicalIssueDocument>;
  sourceRevisions: CanonicalDocumentMetadata["sourceRevisions"];
}

interface IssueFixCardAdvisoryContext extends MarkdownReadResult {
  path: string;
  metadata?: CanonicalDocumentMetadata;
}

interface IssueValidationReadResult extends MarkdownReadResult {
  path?: string;
  metadata?: CanonicalDocumentMetadata;
  attemptNumber?: number;
  operatorNotes?: string;
  boundedDefect?: string;
}

interface AggregateIssueValidationEvidence {
  sourceEvidence: IssueValidationSourceEvidence[];
  sourceRevisions: CanonicalDocumentMetadata["sourceRevisions"];
  sourceFingerprints: Array<{ path: string; sha256: string }>;
  completedFixCards: IssueValidationCompletedFixCardSummary[];
}

interface AggregateIssueValidationReadResult extends MarkdownReadResult {
  path?: string;
  metadata?: CanonicalDocumentMetadata;
  attemptNumber?: number;
  decision?: IssueValidationDecision;
  operatorNotes?: string;
  boundedCorrectiveWork?: string;
}

interface AggregateIssueValidationScan {
  current?: AggregateIssueValidationReadResult & { path: string; metadata: CanonicalDocumentMetadata };
  latest?: AggregateIssueValidationReadResult;
  nextAttemptNumber: number;
  errors: string[];
}

interface CurrentAggregateIssueValidationRecord {
  evidence: AggregateIssueValidationEvidence;
  recordPath: string;
  recordRevision: number;
  recordMarkdown: string;
  recordSha256: string;
  attemptNumber: number;
  disposition: DocumentDispositionStatus;
  decision: IssueValidationDecision;
  operatorNotes?: string;
  boundedCorrectiveWork?: string;
  aggregateEvidenceSha256: string;
}

interface IssueCloseEvidence {
  sourceEvidence: IssueValidationSourceEvidence[];
  sourceRevisions: CanonicalDocumentMetadata["sourceRevisions"];
  sourceFingerprints: Array<{ path: string; sha256: string }>;
  completedFixCards: IssueValidationCompletedFixCardSummary[];
  validationBasis: IssueCloseValidationBasis;
  validationBasisSha256: string;
}

interface IssueCloseReadResult extends MarkdownReadResult {
  path: string;
  metadata?: CanonicalDocumentMetadata;
  validationBasisSha256?: string;
}

interface IssueFixCardCloseReadResult extends IssueFixCardCloseRecordProjection {
  metadata?: CanonicalDocumentMetadata;
  bodyMarkdown?: string;
  valid: boolean;
}

interface IssueFixCardContext {
  workspaceRoot: string;
  readContext?: IssueProjectionReadContext;
  issue: IssueRecordProjection;
  planning: IssuePlanningProjection;
  candidate: IssueFixCardPlanCandidate;
  implementationId: string;
  implementationKind: "root-fix-card" | "repair";
  repairId?: string;
  parentImplementationId?: string;
  parentImplementationPath?: string;
  validationEvidencePath?: string;
  boundedDefect?: string;
  contractPath: string;
  implementerReportPath: string;
  architectReviewPath: string;
}

export interface IssueFixCardCodexExecutionContext {
  ownerKind: "issue";
  issueId: string;
  fixCardId: string;
  currentImplementationId: string;
  repairId?: string;
  workCardTitle: string;
  projectRoot: string;
  formalWorkCardPath: string;
  formalWorkCardRevision: number;
  formalWorkCardSha256: string;
  implementationContractType: "fix-card" | "repair-work-card";
  implementationContractLabel: "Approved Fix Card Contract" | "Approved Repair Contract";
  implementerReportPath: string;
  implementerReportRevision: number;
  implementerReportSha256: string;
}

export function discoverIssueInventory(workspaceRoot: string): IssueInventoryProjection {
  const resolvedRoot = path.resolve(workspaceRoot);
  const readContext = createIssueProjectionReadContext(resolvedRoot);
  return {
    issues: discoverIssueDirectories(resolvedRoot, readContext)
      .map((entry) => readIssueRecord(resolvedRoot, entry, readContext)),
  };
}

export function createLightweightIssueRecord(
  workspaceRoot: string,
  input: NewIssueInput,
  afterCreate?: (created: { createdIssueId: string; createdRecordPath: string }) => void,
): CreateIssueResult {
  const resolvedRoot = path.resolve(workspaceRoot);
  const title = requiredInput(input.title, "Title is required.");
  const issue = requiredInput(input.issue, "Issue is required.");
  const currentConsequence = requiredInput(
    input.currentConsequence,
    "Current Consequence is required.",
  );
  const neededCapability = optionalInput(input.neededCapability);
  const discoveryContext = optionalInput(input.discoveryContext);
  const screenshots = validateIssueScreenshots(input.screenshots);
  const nextNumericId = nextIssueNumericId(discoverIssueDirectories(resolvedRoot));
  const createdIssueId = `ISSUE_${String(nextNumericId).padStart(3, "0")}`;
  const issuesRoot = containedPath(resolvedRoot, "issues");
  const issueDirectory = containedPath(resolvedRoot, path.join("issues", createdIssueId));
  const createdRecordPath = normalizeRelativePath(path.join("issues", createdIssueId, "ISSUE_RECORD.md"));
  const recordPath = containedPath(resolvedRoot, createdRecordPath);
  const evidenceDirectory = containedPath(resolvedRoot, path.join("issues", createdIssueId, "evidence"));
  const evidencePaths = screenshots.map((screenshot, index) => normalizeRelativePath(path.join(
    "issues",
    createdIssueId,
    "evidence",
    `screenshot-${String(index + 1).padStart(3, "0")}.${screenshot.extension}`,
  )));
  const createdDirectories: CreatedFilesystemArtifact[] = [];
  const createdFiles: CreatedFilesystemArtifact[] = [];

  ensureIssueRootDirectory(issuesRoot, createdDirectories);
  try {
    createTrackedDirectory(issueDirectory, createdDirectories);
    if (screenshots.length > 0) {
      createTrackedDirectory(evidenceDirectory, createdDirectories);
      screenshots.forEach((screenshot, index) => {
        writeTrackedNewFile(
          containedPath(resolvedRoot, evidencePaths[index]),
          screenshot.buffer,
          createdFiles,
        );
      });
    }
    writeTrackedNewFile(
      recordPath,
      formatIssueRecord({
        currentConsequence,
        discoveryContext,
        issue,
        issueId: createdIssueId,
        neededCapability,
        screenshotEvidencePaths: evidencePaths,
        title,
      }),
      createdFiles,
    );

    const inventory = discoverIssueInventory(resolvedRoot);
    afterCreate?.({ createdIssueId, createdRecordPath });
    return {
      createdIssueId,
      createdRecordPath,
      inventory,
    };
  } catch (error) {
    const cleanupFailures = cleanupCreatedIssueArtifacts(
      createdFiles,
      createdDirectories,
      recordPath,
    );
    if (cleanupFailures.length > 0) {
      throw new Error(
        `${errorMessage(error)} Safe Issue creation cleanup was incomplete: ${cleanupFailures.join("; ")}`,
        { cause: error },
      );
    }
    throw error;
  }
}

export function getIssueArchitectPlanningProjection(
  workspaceRoot: string,
  issueId: string | null | undefined,
  suppliedReadContext?: IssueProjectionReadContext,
): IssueArchitectPlanningProjection {
  const resolvedRoot = path.resolve(workspaceRoot);
  const readContext = issueReadContext(resolvedRoot, suppliedReadContext);
  const issue = resolveIssueRecordProjection(resolvedRoot, issueId, readContext);
  if (!issue) {
    return emptyIssueArchitectProjection();
  }

  const finalInvestigationPath = normalizeRelativePath(path.join("issues", issue.issueId, "ARCHITECT_INVESTIGATION.md"));
  const finalRead = readOptionalMarkdownFile(resolvedRoot, finalInvestigationPath, "ARCHITECT_INVESTIGATION.md", readContext);
  const reviewPath = normalizeRelativePath(path.join("issues", issue.issueId, "ARCHITECT_REVIEW.md"));
  const reviewRead = readOptionalMarkdownFile(resolvedRoot, reviewPath, "ARCHITECT_REVIEW.md", readContext);
  const architectRecommendation = finalRead.bodyMarkdown
    ? parseArchitectRecommendation(finalRead.bodyMarkdown)
    : undefined;
  const review = reviewRead.bodyMarkdown
    ? parseIssueArchitectReview(reviewRead.bodyMarkdown)
    : undefined;
  const key = submissionKey(resolvedRoot, issue.issueId);
  const activeSubmission = activeArchitectSubmissions.get(key);
  const priorAutoPromotionFailure = architectAutoPromotionFailures.get(key);
  const draftExists = activeSubmission
    ? safeFileExists(resolvedRoot, activeSubmission.temporaryDraftPath)
    : false;

  if (issue.recordState !== "readable") {
    return buildIssueArchitectProjection({
      activeSubmission,
      canCopyHandoff: false,
      canPrepareHandoff: false,
      canPromoteDraft: false,
      finalInvestigationPath,
      finalRead,
      issue,
      reviewPath,
      reviewRead,
      status: "blocked-unreadable-record",
      statusMessage: issue.readError ?? "Architect Planning requires a readable ISSUE_RECORD.md.",
    });
  }

  if (activeSubmission && draftExists && shouldAutoPromoteIssueArchitectDraft(finalRead, review)) {
    architectAutoPromotionFailures.delete(key);
    try {
      return promoteIssueArchitectPlanningDraft(resolvedRoot, issue.issueId).projection;
    } catch (error) {
      const message = errorMessage(error);
      architectAutoPromotionFailures.set(key, {
        message,
        submissionId: activeSubmission.submissionId,
        temporaryDraftPath: activeSubmission.temporaryDraftPath,
      });
      return buildIssueArchitectProjection({
        architectRecommendation,
        canCopyHandoff: false,
        canPrepareHandoff: true,
        canPromoteDraft: false,
        finalInvestigationPath,
        finalRead,
        issue,
        review,
        reviewPath,
        reviewRead,
        status: "needs-attention",
        statusMessage: message,
      });
    }
  }

  if (finalRead.state === "read-error") {
    return buildIssueArchitectProjection({
      activeSubmission,
      canCopyHandoff: Boolean(activeSubmission),
      canPrepareHandoff: false,
      canPromoteDraft: false,
      finalInvestigationPath,
      finalRead,
      issue,
      reviewPath,
      reviewRead,
      status: "needs-attention",
      statusMessage: finalRead.readError ?? "ARCHITECT_INVESTIGATION.md could not be read.",
    });
  }

  if (finalRead.state === "readable") {
    if (!architectRecommendation) {
      return buildIssueArchitectProjection({
        activeSubmission,
        architectRecommendation,
        canCopyHandoff: false,
        canPrepareHandoff: false,
        canPromoteDraft: false,
        finalInvestigationPath,
        finalRead,
        issue,
        review,
        reviewPath,
        reviewRead,
        status: "needs-attention",
        statusMessage: "ARCHITECT_INVESTIGATION.md is missing one exact allowed Architect Recommendation.",
      });
    }

    if (reviewRead.state === "read-error") {
      return buildIssueArchitectProjection({
        activeSubmission,
        architectRecommendation,
        canCopyHandoff: Boolean(activeSubmission),
        canPrepareHandoff: false,
        canPromoteDraft: false,
        finalInvestigationPath,
        finalRead,
        issue,
        review,
        reviewPath,
        reviewRead,
        status: "needs-attention",
        statusMessage: reviewRead.readError ?? "ARCHITECT_REVIEW.md could not be read.",
      });
    }

    if (reviewRead.state === "readable" && !review) {
      return buildIssueArchitectProjection({
        activeSubmission,
        architectRecommendation,
        canCopyHandoff: false,
        canPrepareHandoff: false,
        canPromoteDraft: false,
        finalInvestigationPath,
        finalRead,
        issue,
        reviewPath,
        reviewRead,
        status: "needs-attention",
        statusMessage: "ARCHITECT_REVIEW.md is not a valid Issue Architect review record.",
      });
    }

    if (!review) {
      return buildIssueArchitectProjection({
        activeSubmission,
        architectRecommendation,
        canCopyHandoff: false,
        canPrepareHandoff: false,
        canPromoteDraft: false,
        finalInvestigationPath,
        finalRead,
        issue,
        reviewPath,
        reviewRead,
        status: "awaiting-operator-review",
        statusMessage: "Architect Investigation is ready for Operator review.",
      });
    }

    if (review.issueId !== issue.issueId || review.investigationPath !== finalInvestigationPath) {
      return buildIssueArchitectProjection({
        activeSubmission,
        architectRecommendation,
        canCopyHandoff: false,
        canPrepareHandoff: false,
        canPromoteDraft: false,
        finalInvestigationPath,
        finalRead,
        issue,
        review,
        reviewPath,
        reviewRead,
        status: "needs-attention",
        statusMessage: "ARCHITECT_REVIEW.md does not match the current Issue investigation.",
      });
    }

    if (review.architectRecommendation !== architectRecommendation) {
      return buildIssueArchitectProjection({
        activeSubmission,
        architectRecommendation,
        canCopyHandoff: false,
        canPrepareHandoff: false,
        canPromoteDraft: false,
        finalInvestigationPath,
        finalRead,
        issue,
        review,
        reviewPath,
        reviewRead,
        status: "needs-attention",
        statusMessage: "ARCHITECT_REVIEW.md recommendation does not match the current investigation.",
      });
    }

    if (review.disposition === "RevisionRequested") {
      if (priorAutoPromotionFailure) {
        return buildIssueArchitectProjection({
          architectRecommendation,
          canCopyHandoff: false,
          canPrepareHandoff: true,
          canPromoteDraft: false,
          finalInvestigationPath,
          finalRead,
          issue,
          review,
          reviewPath,
          reviewRead,
          status: "needs-attention",
          statusMessage: priorAutoPromotionFailure.message,
        });
      }
      return buildIssueArchitectProjection({
        activeSubmission,
        architectRecommendation,
        canCopyHandoff: Boolean(activeSubmission),
        canPrepareHandoff: true,
        canPromoteDraft: false,
        finalInvestigationPath,
        finalRead,
        issue,
        review,
        reviewPath,
        reviewRead,
        status: activeSubmission ? "handoff-prepared" : "revision-requested",
        statusMessage: activeSubmission
          ? "Revision handoff prepared. Copy it and send it in embedded ChatGPT."
          : "Operator requested revision. Prepare a revision-aware Architect handoff.",
      });
    }

    if (review.disposition === "Rejected") {
      return buildIssueArchitectProjection({
        architectRecommendation,
        canCopyHandoff: false,
        canPrepareHandoff: false,
        canPromoteDraft: false,
        finalInvestigationPath,
        finalRead,
        issue,
        review,
        reviewPath,
        reviewRead,
        status: "rejected-needs-attention",
        statusMessage: "Operator rejected the Architect Investigation.",
      });
    }

    return buildIssueArchitectProjection({
      architectRecommendation,
      canCopyHandoff: false,
      canPrepareHandoff: false,
      canPromoteDraft: false,
      finalInvestigationPath,
      finalRead,
      issue,
      review,
      reviewPath,
      reviewRead,
      status: approvedStatusForRecommendation(architectRecommendation),
      statusMessage: approvedMessageForRecommendation(architectRecommendation),
    });
  }

  if (priorAutoPromotionFailure) {
    return buildIssueArchitectProjection({
      canCopyHandoff: false,
      canPrepareHandoff: true,
      canPromoteDraft: false,
      finalInvestigationPath,
      finalRead,
      issue,
      reviewPath,
      reviewRead,
      status: "needs-attention",
      statusMessage: priorAutoPromotionFailure.message,
    });
  }

  return buildIssueArchitectProjection({
    activeSubmission,
    canCopyHandoff: Boolean(activeSubmission),
    canPrepareHandoff: true,
    canPromoteDraft: false,
    finalInvestigationPath,
    finalRead,
    issue,
    reviewPath,
    reviewRead,
    status: activeSubmission ? "handoff-prepared" : "ready-for-handoff",
    statusMessage: activeSubmission
      ? "Architect handoff prepared. Copy it and send it in embedded ChatGPT."
      : "Prepare an Issue-specific Architect handoff for Browser GPT.",
  });
}

function shouldAutoPromoteIssueArchitectDraft(
  finalRead: MarkdownReadResult,
  review: IssueArchitectReviewRecord | undefined,
): boolean {
  return finalRead.state === "missing" || (
    finalRead.state === "readable" &&
    review?.disposition === "RevisionRequested"
  );
}

function buildIssueArchitectProjection(input: {
  activeSubmission?: IssueArchitectDraftSubmission;
  architectRecommendation?: IssueArchitectRecommendation;
  canCopyHandoff: boolean;
  canPrepareHandoff: boolean;
  canPromoteDraft: boolean;
  finalInvestigationPath: string;
  finalRead: MarkdownReadResult;
  issue: IssueRecordProjection;
  review?: IssueArchitectReviewRecord;
  reviewPath: string;
  reviewRead: MarkdownReadResult;
  status: IssueArchitectPlanningStatus;
  statusMessage: string;
}): IssueArchitectPlanningProjection {
  const issuePlanningEligible =
    input.finalRead.state === "readable" &&
    input.review?.disposition === "Approved" &&
    input.architectRecommendation === "Proceed in Issue Resolution";
  const issue = input.issue;

  return {
    issueId: issue.issueId,
    title: issue.title,
    issueRecordPath: issue.recordPath,
    issueRecordMarkdown: issue.bodyMarkdown,
    issueRecordState: issue.recordState,
    issueRecordReadError: issue.readError,
    finalInvestigationPath: input.finalInvestigationPath,
    finalInvestigationState: input.finalRead.state,
    finalInvestigationMarkdown: input.finalRead.bodyMarkdown,
    finalInvestigationReadError: input.finalRead.readError,
    architectRecommendation: input.architectRecommendation,
    reviewPath: input.reviewPath,
    reviewState: input.reviewRead.state,
    operatorDisposition: input.review?.disposition,
    operatorReviewNotes: input.review?.operatorNotes,
    reviewReadError: input.reviewRead.readError,
    status: input.status,
    statusMessage: input.statusMessage,
    workflowStatus: {
      issueId: issue.issueId,
      stageId: "architect-planning",
      stageLabel: "Architect Planning",
      state: input.status,
      stateLabel: stateLabelForIssueArchitectStatus(input.status),
      issuePlanningEligible,
      reason: input.statusMessage,
    },
    issuePlanningEligible,
    activeSubmission: input.activeSubmission,
    canPrepareHandoff: input.canPrepareHandoff,
    canCopyHandoff: input.canCopyHandoff,
    canPromoteDraft: input.canPromoteDraft,
  };
}

function approvedStatusForRecommendation(
  recommendation: IssueArchitectRecommendation,
): IssueArchitectPlanningStatus {
  if (recommendation === "Proceed in Issue Resolution") return "approved-ready-for-issue-planning";
  if (recommendation === "Reframe to Development/Feature") return "approved-reframe-recommended";
  return "approved-unsupported-no-action";
}

function approvedMessageForRecommendation(recommendation: IssueArchitectRecommendation): string {
  if (recommendation === "Proceed in Issue Resolution") {
    return "Operator approved proceeding in Issue Resolution; Issue Planning is eligible.";
  }
  if (recommendation === "Reframe to Development/Feature") {
    return "Operator approved the Architect recommendation to reframe outside Issue Resolution.";
  }
  return "Operator approved the Architect recommendation for unsupported or no-action disposition.";
}

function stateLabelForIssueArchitectStatus(status: IssueArchitectPlanningStatus): string {
  switch (status) {
    case "blocked-no-issue":
      return "No Issue Selected";
    case "blocked-unreadable-record":
      return "Issue Record Unreadable";
    case "ready-for-handoff":
      return "Ready for Architect Handoff";
    case "handoff-prepared":
      return "Handoff Prepared";
    case "draft-ready":
      return "Draft Ready / Promotion Available";
    case "awaiting-operator-review":
      return "Awaiting Operator Review";
    case "revision-requested":
      return "Revision Requested";
    case "approved-ready-for-issue-planning":
      return "Approved - Ready for Issue Planning";
    case "approved-reframe-recommended":
      return "Approved - Reframe Recommended";
    case "approved-unsupported-no-action":
      return "Approved - Unsupported / No Action";
    case "rejected-needs-attention":
      return "Rejected / Needs Attention";
    case "needs-attention":
      return "Needs Attention";
  }
}

function safeFileExists(workspaceRoot: string, relativePath: string): boolean {
  try {
    const absolutePath = containedPath(workspaceRoot, relativePath);
    return fs.existsSync(absolutePath) && fs.lstatSync(absolutePath).isFile();
  } catch {
    return false;
  }
}

export function prepareIssueArchitectPlanningHandoff(
  workspaceRoot: string,
  issueId: string,
): IssueArchitectPlanningActionResult {
  const resolvedRoot = path.resolve(workspaceRoot);
  const issue = requireReadableIssue(resolvedRoot, issueId);
  const finalInvestigationPath = normalizeRelativePath(path.join("issues", issue.issueId, "ARCHITECT_INVESTIGATION.md"));
  const reviewPath = normalizeRelativePath(path.join("issues", issue.issueId, "ARCHITECT_REVIEW.md"));
  const finalRead = readOptionalMarkdownFile(resolvedRoot, finalInvestigationPath, "ARCHITECT_INVESTIGATION.md");
  const reviewRead = readOptionalMarkdownFile(resolvedRoot, reviewPath, "ARCHITECT_REVIEW.md");
  const review = reviewRead.bodyMarkdown ? parseIssueArchitectReview(reviewRead.bodyMarkdown) : undefined;
  const revisionContext =
    finalRead.state === "readable" && review?.disposition === "RevisionRequested"
      ? {
          currentInvestigationMarkdown: finalRead.bodyMarkdown ?? "",
          operatorNotes: review.operatorNotes,
          reviewPath,
        }
      : undefined;
  if (finalRead.state === "readable" && !revisionContext) {
    throw new Error("ARCHITECT_INVESTIGATION.md already exists and requires Operator disposition before a new handoff.");
  }
  if (review?.disposition === "RevisionRequested" && !review.operatorNotes.trim()) {
    throw new Error("RevisionRequested review requires Operator notes before preparing a revised handoff.");
  }
  const submissionId = crypto.randomUUID();
  const temporaryDraftPath = normalizeRelativePath(path.join(
    "issues",
    "Architect_Drafts",
    submissionId,
    "architect-investigation.md",
  ));
  const preparedInstruction = buildIssueArchitectHandoffInstruction(
    resolvedRoot,
    issue,
    finalInvestigationPath,
    temporaryDraftPath,
    revisionContext,
  );
  activeArchitectSubmissions.set(submissionKey(resolvedRoot, issue.issueId), {
    submissionId,
    temporaryDraftPath,
    preparedInstruction,
    issueRecordSha256: sha256ForMarkdown(issue.bodyMarkdown ?? ""),
  });
  architectAutoPromotionFailures.delete(submissionKey(resolvedRoot, issue.issueId));

  return {
    ok: true,
    action: "issueArchitect.prepareHandoff",
    message: "Issue Architect handoff prepared.",
    projection: getIssueArchitectPlanningProjection(resolvedRoot, issue.issueId),
  };
}

export function resolveIssueArchitectPlanningCopyHandoff(
  workspaceRoot: string,
  issueId: string,
): { instruction: string; result: IssueArchitectPlanningActionResult } {
  const resolvedRoot = path.resolve(workspaceRoot);
  const issue = requireReadableIssue(resolvedRoot, issueId);
  const activeSubmission = activeArchitectSubmissions.get(submissionKey(resolvedRoot, issue.issueId));
  if (!activeSubmission) {
    throw new Error("Prepare an Issue Architect handoff before copying.");
  }
  if (activeSubmission.issueRecordSha256 && activeSubmission.issueRecordSha256 !== sha256ForMarkdown(issue.bodyMarkdown ?? "")) throw Error("Issue evidence changed; prepare a fresh RCA handoff.");
  return {
    instruction: activeSubmission.preparedInstruction,
    result: {
      ok: true,
      action: "issueArchitect.copyHandoff",
      message: "Issue Architect handoff copied.",
      projection: getIssueArchitectPlanningProjection(resolvedRoot, issue.issueId),
    },
  };
}

export function promoteIssueArchitectPlanningDraft(
  workspaceRoot: string,
  issueId: string,
): IssueArchitectPlanningActionResult {
  const resolvedRoot = path.resolve(workspaceRoot);
  const issue = requireReadableIssue(resolvedRoot, issueId);
  const key = submissionKey(resolvedRoot, issue.issueId);
  const activeSubmission = activeArchitectSubmissions.get(key);
  if (!activeSubmission) {
    throw new Error("Prepare a fresh Issue Architect handoff before promoting a draft.");
  }
  if (activeSubmission.issueRecordSha256 && activeSubmission.issueRecordSha256 !== sha256ForMarkdown(issue.bodyMarkdown ?? "")) {
    activeArchitectSubmissions.delete(key);
    throw Error("Issue evidence changed; prepare a fresh RCA handoff.");
  }

  const finalInvestigationPath = normalizeRelativePath(path.join("issues", issue.issueId, "ARCHITECT_INVESTIGATION.md"));
  const reviewPath = normalizeRelativePath(path.join("issues", issue.issueId, "ARCHITECT_REVIEW.md"));
  const finalPath = containedPath(resolvedRoot, finalInvestigationPath);
  const reviewRead = readOptionalMarkdownFile(resolvedRoot, reviewPath, "ARCHITECT_REVIEW.md");
  const review = reviewRead.bodyMarkdown ? parseIssueArchitectReview(reviewRead.bodyMarkdown) : undefined;
  const isRevisionReplacement = fs.existsSync(finalPath) && review?.disposition === "RevisionRequested";
  if (fs.existsSync(finalPath) && !isRevisionReplacement) {
    activeArchitectSubmissions.delete(key);
    throw new Error("ARCHITECT_INVESTIGATION.md already exists and requires Operator disposition before replacement.");
  }

  const draftPath = containedPath(resolvedRoot, activeSubmission.temporaryDraftPath);
  if (!fs.existsSync(draftPath)) {
    throw new Error(`Expected temporary draft was not found at ${activeSubmission.temporaryDraftPath}.`);
  }
  const draftStats = fs.lstatSync(draftPath);
  if (draftStats.isSymbolicLink() || !draftStats.isFile()) {
    activeArchitectSubmissions.delete(key);
    throw new Error("Expected temporary draft is not a regular file.");
  }
  const bodyMarkdown = fs.readFileSync(draftPath, "utf8");
  const validationFindings = validateArchitectInvestigationDraft(issue.issueId, bodyMarkdown);
  if (validationFindings.length > 0) {
    activeArchitectSubmissions.delete(key);
    throw new Error(`Architect draft validation failed: ${validationFindings.join("; ")}`);
  }

  if (isRevisionReplacement) {
    replaceRevisionRequestedInvestigation(resolvedRoot, issue.issueId, activeSubmission, finalInvestigationPath, reviewPath);
  } else {
    fs.linkSync(draftPath, finalPath);
  }
  cleanupArchitectSubmissionDraft(resolvedRoot, activeSubmission.temporaryDraftPath);
  activeArchitectSubmissions.delete(key);

  return {
    ok: true,
    action: "issueArchitect.promoteDraft",
    message: "Architect Investigation promoted from the validated temporary draft.",
    projection: getIssueArchitectPlanningProjection(resolvedRoot, issue.issueId),
  };
}

export function applyIssueArchitectReview(
  workspaceRoot: string,
  issueId: string,
  input: IssueArchitectReviewInput,
): IssueArchitectPlanningMutationResult {
  const resolvedRoot = path.resolve(workspaceRoot);
  const issue = requireReadableIssue(resolvedRoot, issueId);
  const disposition = requireIssueArchitectReviewDisposition(input.disposition);
  const operatorNotes = optionalInput(input.operatorNotes) ?? "";
  if (disposition === "RevisionRequested" && !operatorNotes) {
    throw new Error("RevisionRequested requires Operator notes.");
  }

  const finalInvestigationPath = normalizeRelativePath(path.join("issues", issue.issueId, "ARCHITECT_INVESTIGATION.md"));
  const finalRead = readOptionalMarkdownFile(resolvedRoot, finalInvestigationPath, "ARCHITECT_INVESTIGATION.md");
  if (finalRead.state !== "readable") {
    throw new Error(finalRead.readError ?? "A readable ARCHITECT_INVESTIGATION.md is required before review.");
  }
  const architectRecommendation = parseArchitectRecommendation(finalRead.bodyMarkdown ?? "");
  if (!architectRecommendation) {
    throw new Error("ARCHITECT_INVESTIGATION.md must contain one exact allowed Architect Recommendation before review.");
  }

  const reviewPath = normalizeRelativePath(path.join("issues", issue.issueId, "ARCHITECT_REVIEW.md"));
  fs.writeFileSync(
    containedPath(resolvedRoot, reviewPath),
    formatIssueArchitectReview({
      architectRecommendation,
      disposition,
      investigationPath: finalInvestigationPath,
      issueId: issue.issueId,
      operatorNotes,
    }),
    "utf8",
  );

  const postMutationContext = createIssueProjectionReadContext(resolvedRoot, "post-mutation");
  return {
    ok: true,
    action: "issueArchitect.applyReview",
    message: `Issue Architect review applied: ${disposition}.`,
    projection: getIssueArchitectPlanningProjection(resolvedRoot, issue.issueId, postMutationContext),
    postMutation: buildIssuePostMutationProjection(resolvedRoot, issue.issueId, postMutationContext),
  };
}

export function getIssuePlanningProjection(
  workspaceRoot: string,
  issueId: string | null | undefined,
  suppliedReadContext?: IssueProjectionReadContext,
): IssuePlanningProjection {
  const resolvedRoot = path.resolve(workspaceRoot);
  const readContext = issueReadContext(resolvedRoot, suppliedReadContext);
  const issue = resolveIssueRecordProjection(resolvedRoot, issueId, readContext);
  if (!issue) {
    return emptyIssuePlanningProjection();
  }

  const paths = issuePlanningPaths(issue.issueId);
  const architectInvestigationRead = readOptionalMarkdownFile(
    resolvedRoot,
    paths.architectInvestigationPath,
    "ARCHITECT_INVESTIGATION.md",
    readContext,
  );
  const architectReviewRead = readOptionalMarkdownFile(
    resolvedRoot,
    paths.architectReviewPath,
    "ARCHITECT_REVIEW.md",
    readContext,
  );
  const architectRecommendation = architectInvestigationRead.bodyMarkdown
    ? parseArchitectRecommendation(architectInvestigationRead.bodyMarkdown)
    : undefined;
  const architectReview = architectReviewRead.bodyMarkdown
    ? parseIssueArchitectReview(architectReviewRead.bodyMarkdown)
    : undefined;
  const architectPlanningEligible = isIssuePlanningEligible(
    issue.issueId,
    paths.architectInvestigationPath,
    architectInvestigationRead,
    architectRecommendation,
    architectReview,
  );
  const routedPlan = readRoutedIssueExecutionPlan(resolvedRoot, issue.issueId);
  if (routedPlan) {
    const eligible = architectPlanningEligible && issue.recordState === "readable";
    const status = eligible ? "approved-ready-for-fix-cards" : "blocked-architect-planning-not-eligible";
    const reason = eligible ? "Approved correction Plan is ready for generic direct/phased execution." : "Current Approved Issue RCA is required.";
    return { ...emptyIssuePlanningProjection(), issueId: issue.issueId, title: issue.title,
      issueRecordPath: issue.recordPath, issueRecordState: issue.recordState, issueRecordMarkdown: issue.bodyMarkdown,
      architectInvestigationPath: paths.architectInvestigationPath, architectInvestigationState: architectInvestigationRead.state, architectInvestigationMarkdown: architectInvestigationRead.bodyMarkdown,
      architectReviewPath: paths.architectReviewPath, architectReviewState: architectReviewRead.state, architectReviewMarkdown: architectReviewRead.bodyMarkdown,
      architectRecommendation, architectPlanningEligible, architectReviewDisposition: architectReview?.disposition,
      issueResolutionPlanPath: routedPlan.planPath, issueResolutionPlanState: "readable", issueResolutionPlanMarkdown: routedPlan.planBody,
      fixCardPlanPath: routedPlan.relativePath, fixCardPlanState: "readable", fixCardPlanMarkdown: routedPlan.bindingBody, fixCardCandidates: routedPlan.candidates,
      reviewPath: routedPlan.planPath, reviewState: "readable", reviewMarkdown: routedPlan.planBody, operatorDisposition: "Approved", status, statusMessage: reason, fixCardsEligible: eligible,
      workflowStatus: { issueId: issue.issueId, stageId: "issue-planning", stageLabel: "Issue Planning", state: status, stateLabel: eligible ? "Approved" : "Blocked", issuePlanningEligible: architectPlanningEligible, fixCardsEligible: eligible, reason },
    };
  }
  const issueResolutionPlanRead = readOptionalMarkdownFile(
    resolvedRoot,
    paths.issueResolutionPlanPath,
    "ISSUE_RESOLUTION_PLAN.md",
    readContext,
  );
  const fixCardPlanRead = readOptionalMarkdownFile(
    resolvedRoot,
    paths.fixCardPlanPath,
    "FIX_CARD_PLAN.md",
    readContext,
  );
  const reviewRead = readOptionalMarkdownFile(
    resolvedRoot,
    paths.planningReviewPath,
    "ISSUE_PLANNING_REVIEW.md",
    readContext,
  );
  const review = reviewRead.bodyMarkdown
    ? parseIssuePlanningReview(reviewRead.bodyMarkdown)
    : undefined;
  const key = submissionKey(resolvedRoot, issue.issueId);
  const activeSubmission = activePlanningSubmissions.get(key);
  const priorFailure = planningAutoPromotionFailures.get(key);
  const draftState = activeSubmission
    ? {
        hasIssueResolutionPlanDraft: safeFileExists(resolvedRoot, activeSubmission.issueResolutionPlanDraftPath),
        hasFixCardPlanDraft: safeFileExists(resolvedRoot, activeSubmission.fixCardPlanDraftPath),
      }
    : { hasIssueResolutionPlanDraft: false, hasFixCardPlanDraft: false };

  if (issue.recordState !== "readable") {
    return buildIssuePlanningProjection({
      activeSubmission,
      architectInvestigationRead,
      architectPlanningEligible: false,
      architectRecommendation,
      architectReview,
      architectReviewRead,
      canApplyReview: false,
      canCopyHandoff: false,
      canPrepareHandoff: false,
      fixCardPlanRead,
      issue,
      issueResolutionPlanRead,
      paths,
      review,
      reviewRead,
      status: "blocked-unreadable-record",
      statusMessage: issue.readError ?? "Issue Planning requires a readable ISSUE_RECORD.md.",
    });
  }

  if (!architectPlanningEligible) {
    return buildIssuePlanningProjection({
      activeSubmission,
      architectInvestigationRead,
      architectPlanningEligible,
      architectRecommendation,
      architectReview,
      architectReviewRead,
      canApplyReview: false,
      canCopyHandoff: false,
      canPrepareHandoff: false,
      fixCardPlanRead,
      issue,
      issueResolutionPlanRead,
      paths,
      review,
      reviewRead,
      status: "blocked-architect-planning-not-eligible",
      statusMessage: "Issue Planning requires Approved Architect Planning with recommendation Proceed in Issue Resolution.",
    });
  }

  const hasBothFinals = issueResolutionPlanRead.state === "readable" && fixCardPlanRead.state === "readable";
  const currentPlanFindings = hasBothFinals
    ? validateIssueResolutionPlan(issue.issueId, issueResolutionPlanRead.bodyMarkdown ?? "")
    : [];
  const currentFixCardPlanValidation = hasBothFinals
    ? parseAndValidateFixCardPlan(issue.issueId, fixCardPlanRead.bodyMarkdown ?? "")
    : { candidates: [], findings: [] };
  const requiresBootstrapAdoption = hasBothFinals &&
    reviewRead.state === "missing" &&
    (currentPlanFindings.length > 0 || currentFixCardPlanValidation.findings.length > 0) &&
    !planningBundleLooksGoverned(issue.issueId, issueResolutionPlanRead.bodyMarkdown ?? "", fixCardPlanRead.bodyMarkdown ?? "");
  const aggregateRevisionPlanning = hasBothFinals &&
    currentPlanFindings.length === 0 &&
    currentFixCardPlanValidation.findings.length === 0 &&
    review?.disposition === "Approved" &&
    review.issueId === issue.issueId &&
    review.issueResolutionPlanPath === paths.issueResolutionPlanPath &&
    review.fixCardPlanPath === paths.fixCardPlanPath
    ? buildIssuePlanningProjection({
        architectInvestigationRead,
        architectPlanningEligible,
        architectRecommendation,
        architectReview,
        architectReviewRead,
        canApplyReview: false,
        canCopyHandoff: false,
        canPrepareHandoff: false,
        fixCardPlanRead,
        fixCardPlanValidation: currentFixCardPlanValidation,
        issue,
        issueResolutionPlanRead,
        paths,
        review,
        reviewRead,
        status: "approved-ready-for-fix-cards",
        statusMessage: "Operator approved Issue Planning; Fix Cards stage and Fix Card Map are eligible.",
      })
    : undefined;
  const canReplaceForRevision = hasBothFinals && (
    review?.disposition === "RevisionRequested" ||
    Boolean(aggregateRevisionPlanning && currentIssueValidationRevisionSource(resolvedRoot, issue, aggregateRevisionPlanning, readContext))
  );
  if (
    activeSubmission &&
    draftState.hasIssueResolutionPlanDraft &&
    draftState.hasFixCardPlanDraft &&
    (bothPlanningFinalsMissing(issueResolutionPlanRead, fixCardPlanRead) || canReplaceForRevision || requiresBootstrapAdoption)
  ) {
    planningAutoPromotionFailures.delete(key);
    try {
      return promoteIssuePlanningDraftBundle(resolvedRoot, issue.issueId).projection;
    } catch (error) {
      const message = errorMessage(error);
      planningAutoPromotionFailures.set(key, {
        fixCardPlanDraftPath: activeSubmission.fixCardPlanDraftPath,
        issueResolutionPlanDraftPath: activeSubmission.issueResolutionPlanDraftPath,
        message,
        submissionId: activeSubmission.submissionId,
      });
      return buildIssuePlanningProjection({
        architectInvestigationRead,
        architectPlanningEligible,
        architectRecommendation,
        architectReview,
        architectReviewRead,
        canApplyReview: false,
        canCopyHandoff: false,
        canPrepareHandoff: true,
        fixCardPlanRead,
        issue,
        issueResolutionPlanRead,
        paths,
        review,
        reviewRead,
        status: "needs-attention",
        statusMessage: message,
      });
    }
  }

  if (priorFailure) {
    return buildIssuePlanningProjection({
      architectInvestigationRead,
      architectPlanningEligible,
      architectRecommendation,
      architectReview,
      architectReviewRead,
      canApplyReview: false,
      canCopyHandoff: false,
      canPrepareHandoff: true,
      fixCardPlanRead,
      issue,
      issueResolutionPlanRead,
      paths,
      review,
      reviewRead,
      status: "needs-attention",
      statusMessage: priorFailure.message,
    });
  }

  if (activeSubmission) {
    const waitingMessage = draftState.hasIssueResolutionPlanDraft || draftState.hasFixCardPlanDraft
      ? "Waiting for both expected temporary planning drafts before validation and promotion."
      : "Issue Planning handoff prepared. Copy it and send it in embedded ChatGPT.";
    return withIssueValidationRevisionSource(resolvedRoot, buildIssuePlanningProjection({
      activeSubmission,
      architectInvestigationRead,
      architectPlanningEligible,
      architectRecommendation,
      architectReview,
      architectReviewRead,
      canApplyReview: false,
      canCopyHandoff: true,
      canPrepareHandoff: true,
      fixCardPlanRead,
      issue,
      issueResolutionPlanRead,
      paths,
      review,
      reviewRead,
      status: draftState.hasIssueResolutionPlanDraft || draftState.hasFixCardPlanDraft
        ? "waiting-for-drafts"
        : "handoff-prepared",
      statusMessage: waitingMessage,
    }), readContext);
  }

  if (issueResolutionPlanRead.state === "read-error" || fixCardPlanRead.state === "read-error" || reviewRead.state === "read-error") {
    return buildIssuePlanningProjection({
      architectInvestigationRead,
      architectPlanningEligible,
      architectRecommendation,
      architectReview,
      architectReviewRead,
      canApplyReview: false,
      canCopyHandoff: false,
      canPrepareHandoff: false,
      fixCardPlanRead,
      issue,
      issueResolutionPlanRead,
      paths,
      review,
      reviewRead,
      status: "needs-attention",
      statusMessage: issueResolutionPlanRead.readError ?? fixCardPlanRead.readError ?? reviewRead.readError ?? "Issue Planning artifact could not be read.",
    });
  }

  if (issueResolutionPlanRead.state === "missing" && fixCardPlanRead.state === "missing") {
    return buildIssuePlanningProjection({
      architectInvestigationRead,
      architectPlanningEligible,
      architectRecommendation,
      architectReview,
      architectReviewRead,
      canApplyReview: false,
      canCopyHandoff: false,
      canPrepareHandoff: true,
      fixCardPlanRead,
      issue,
      issueResolutionPlanRead,
      paths,
      review,
      reviewRead,
      status: "ready-for-handoff",
      statusMessage: "Prepare an Issue Planning handoff for exactly two temporary planning drafts.",
    });
  }

  if (!hasBothFinals) {
    return buildIssuePlanningProjection({
      architectInvestigationRead,
      architectPlanningEligible,
      architectRecommendation,
      architectReview,
      architectReviewRead,
      canApplyReview: false,
      canCopyHandoff: false,
      canPrepareHandoff: false,
      fixCardPlanRead,
      issue,
      issueResolutionPlanRead,
      paths,
      review,
      reviewRead,
      status: "needs-attention",
      statusMessage: "Issue Planning bundle is partial; both ISSUE_RESOLUTION_PLAN.md and FIX_CARD_PLAN.md must exist together.",
    });
  }

  if (requiresBootstrapAdoption) {
    return buildIssuePlanningProjection({
      architectInvestigationRead,
      architectPlanningEligible,
      architectRecommendation,
      architectReview,
      architectReviewRead,
      canApplyReview: false,
      canCopyHandoff: false,
      canPrepareHandoff: true,
      fixCardPlanRead,
      issue,
      issueResolutionPlanRead,
      paths,
      review,
      reviewRead,
      status: "needs-attention",
      statusMessage: "Bootstrap planning requires FC04 adoption before the generated planning bundle can be reviewed.",
    });
  }

  if (currentPlanFindings.length > 0 || currentFixCardPlanValidation.findings.length > 0) {
    return buildIssuePlanningProjection({
      architectInvestigationRead,
      architectPlanningEligible,
      architectRecommendation,
      architectReview,
      architectReviewRead,
      canApplyReview: false,
      canCopyHandoff: false,
      canPrepareHandoff: false,
      fixCardPlanRead,
      issue,
      issueResolutionPlanRead,
      paths,
      review,
      reviewRead,
      status: "needs-attention",
      statusMessage: `Issue Planning bundle validation failed: ${[...currentPlanFindings, ...currentFixCardPlanValidation.findings].join("; ")}`,
    });
  }

  if (reviewRead.state === "readable" && !review) {
    return buildIssuePlanningProjection({
      architectInvestigationRead,
      architectPlanningEligible,
      architectRecommendation,
      architectReview,
      architectReviewRead,
      canApplyReview: false,
      canCopyHandoff: false,
      canPrepareHandoff: false,
      fixCardPlanRead,
      issue,
      issueResolutionPlanRead,
      paths,
      review,
      reviewRead,
      status: "needs-attention",
      statusMessage: "ISSUE_PLANNING_REVIEW.md is not a valid Issue Planning review record.",
    });
  }

  if (!review) {
    return buildIssuePlanningProjection({
      architectInvestigationRead,
      architectPlanningEligible,
      architectRecommendation,
      architectReview,
      architectReviewRead,
      canApplyReview: true,
      canCopyHandoff: false,
      canPrepareHandoff: false,
      fixCardPlanRead,
      fixCardPlanValidation: currentFixCardPlanValidation,
      issue,
      issueResolutionPlanRead,
      paths,
      review,
      reviewRead,
      status: "awaiting-operator-review",
      statusMessage: "Issue Planning bundle is ready for Operator review.",
    });
  }

  if (
    review.issueId !== issue.issueId ||
    review.issueResolutionPlanPath !== paths.issueResolutionPlanPath ||
    review.fixCardPlanPath !== paths.fixCardPlanPath
  ) {
    return buildIssuePlanningProjection({
      architectInvestigationRead,
      architectPlanningEligible,
      architectRecommendation,
      architectReview,
      architectReviewRead,
      canApplyReview: false,
      canCopyHandoff: false,
      canPrepareHandoff: false,
      fixCardPlanRead,
      issue,
      issueResolutionPlanRead,
      paths,
      review,
      reviewRead,
      status: "needs-attention",
      statusMessage: "ISSUE_PLANNING_REVIEW.md does not match the current Issue Planning bundle.",
    });
  }

  if (review.disposition === "RevisionRequested") {
    return buildIssuePlanningProjection({
      architectInvestigationRead,
      architectPlanningEligible,
      architectRecommendation,
      architectReview,
      architectReviewRead,
      canApplyReview: false,
      canCopyHandoff: false,
      canPrepareHandoff: true,
      fixCardPlanRead,
      fixCardPlanValidation: currentFixCardPlanValidation,
      issue,
      issueResolutionPlanRead,
      paths,
      review,
      reviewRead,
      status: "revision-requested",
      statusMessage: "Operator requested Issue Planning revision. Prepare a revision-aware handoff.",
    });
  }

  if (review.disposition === "Rejected") {
    return buildIssuePlanningProjection({
      architectInvestigationRead,
      architectPlanningEligible,
      architectRecommendation,
      architectReview,
      architectReviewRead,
      canApplyReview: false,
      canCopyHandoff: false,
      canPrepareHandoff: false,
      fixCardPlanRead,
      fixCardPlanValidation: currentFixCardPlanValidation,
      issue,
      issueResolutionPlanRead,
      paths,
      review,
      reviewRead,
      status: "rejected-needs-attention",
      statusMessage: "Operator rejected the Issue Planning bundle.",
    });
  }

  return withIssueValidationRevisionSource(resolvedRoot, buildIssuePlanningProjection({
    architectInvestigationRead,
    architectPlanningEligible,
    architectRecommendation,
    architectReview,
    architectReviewRead,
    canApplyReview: false,
    canCopyHandoff: false,
    canPrepareHandoff: false,
    fixCardPlanRead,
    fixCardPlanValidation: currentFixCardPlanValidation,
    issue,
    issueResolutionPlanRead,
    paths,
    review,
    reviewRead,
    status: "approved-ready-for-fix-cards",
    statusMessage: "Operator approved Issue Planning; Fix Cards stage and Fix Card Map are eligible.",
  }), readContext);
}

export function getIssueResolutionNavigationProjection(
  workspaceRoot: string,
  issueId: string | null | undefined,
  suppliedReadContext?: IssueProjectionReadContext,
): IssueResolutionNavigationProjection {
  const resolvedRoot = path.resolve(workspaceRoot);
  const readContext = issueReadContext(resolvedRoot, suppliedReadContext);
  const issue = resolveIssueRecordProjection(resolvedRoot, issueId, readContext);
  if (!issue) {
    return emptyIssueResolutionNavigationProjection();
  }

  const paths = issuePlanningPaths(issue.issueId);
  const architectInvestigationRead = readOptionalMarkdownFile(
    resolvedRoot,
    paths.architectInvestigationPath,
    "ARCHITECT_INVESTIGATION.md",
    readContext,
  );
  const architectReviewRead = readOptionalMarkdownFile(
    resolvedRoot,
    paths.architectReviewPath,
    "ARCHITECT_REVIEW.md",
    readContext,
  );
  const architectRecommendation = architectInvestigationRead.bodyMarkdown
    ? parseArchitectRecommendation(architectInvestigationRead.bodyMarkdown)
    : undefined;
  const architectReview = architectReviewRead.bodyMarkdown
    ? parseIssueArchitectReview(architectReviewRead.bodyMarkdown)
    : undefined;
  const issuePlanningAvailable = issue.recordState === "readable" && isIssuePlanningEligible(
    issue.issueId,
    paths.architectInvestigationPath,
    architectInvestigationRead,
    architectRecommendation,
    architectReview,
  );
  const planningProjection = issuePlanningAvailable
    ? getIssuePlanningProjectionWithoutAutoPromotion(resolvedRoot, issue.issueId, readContext)
    : null;
  const fixCardsAvailable = Boolean(planningProjection?.fixCardsEligible);
  const issueValidation = getIssueValidationProjection(resolvedRoot, issue.issueId, readContext);
  const allFixCardsClosed = planningProjection !== null &&
    planningProjection.fixCardCandidates.length > 0 &&
    issueValidation.completedFixCards.length === planningProjection.fixCardCandidates.length;
  const issueValidationAvailable = ["eligible", "approved", "revision-requested", "needs-attention"]
    .includes(issueValidation.status);
  const issueClose = getIssueCloseProjection(resolvedRoot, issue.issueId, readContext);
  const issueCloseAvailable = ["eligible", "closed", "needs-attention"].includes(issueClose.status);
  const fixCardsWorkflowStatus = fixCardsAvailable
    ? buildFixCardsWorkflowStatus(
        issue.issueId,
        "fix-card-map-ready",
        "Fix Card Map Ready",
        "Current approved Issue Planning evidence exposes the Fix Card Map.",
        issuePlanningAvailable,
      )
    : buildFixCardsWorkflowStatus(
        issue.issueId,
        issue.recordState === "readable" ? "blocked-planning-not-approved" : "blocked-unreadable-record",
        issue.recordState === "readable" ? "Fix Card Map Unavailable" : "Issue Record Unreadable",
        planningProjection?.statusMessage ?? "Fix Cards requires Approved Issue Planning with a validated Fix Card Map.",
        issuePlanningAvailable,
      );
  const workflowStatus = issueCloseAvailable
    ? issueClose.workflowStatus
    : issueValidationAvailable
    ? issueValidation.workflowStatus
    : (fixCardsAvailable ? fixCardsWorkflowStatus : null) ??
      planningProjection?.workflowStatus ??
      (issuePlanningAvailable
        ? buildIssuePlanningAvailabilityWorkflowStatus(issue.issueId)
        : null);

  return {
    issueId: issue.issueId,
    title: issue.title,
    stages: [
      {
        available: true,
        reason: "Issue Intake is always available for the selected project.",
        stageId: "intake",
        stateLabel: "Available",
      },
      {
        available: issue.recordState === "readable",
        reason: issue.recordState === "readable"
          ? "ISSUE_RECORD.md is readable."
          : issue.readError ?? "A readable ISSUE_RECORD.md is required.",
        stageId: "architect-planning",
        stateLabel: issue.recordState === "readable" ? "Available" : "Unavailable",
      },
      {
        available: issuePlanningAvailable,
        reason: issuePlanningAvailable
          ? "Approved Architect Planning with recommendation Proceed in Issue Resolution is current."
          : "Issue Planning requires Approved Architect Planning with recommendation Proceed in Issue Resolution.",
        stageId: "issue-planning",
        stateLabel: issuePlanningAvailable ? "Available" : "Unavailable",
      },
      {
        available: fixCardsAvailable,
        reason: fixCardsAvailable
          ? "Approved Issue Planning exposes a validated Fix Card Map."
          : planningProjection?.statusMessage ?? "Fix Cards requires Approved Issue Planning with a validated Fix Card Map.",
        stageId: "fix-cards",
        stateLabel: fixCardsAvailable ? "Fix Card Map Ready" : "Unavailable",
      },
      {
        available: issueValidationAvailable,
        reason: issueValidation.statusMessage,
        stageId: "issue-validation",
        stateLabel: issueValidation.workflowStatus.stateLabel,
      },
      {
        available: issueCloseAvailable,
        reason: issueClose.statusMessage,
        stageId: "issue-close",
        stateLabel: issueClose.workflowStatus.stateLabel,
      },
    ],
    issuePlanningAvailable,
    fixCardsAvailable,
    allFixCardsClosed,
    issueValidationAvailable,
    issueCloseAvailable,
    currentStageId: issueCloseAvailable
      ? "issue-close"
      : issueValidation.status === "revision-requested"
      ? "issue-planning"
      : issueValidationAvailable
      ? "issue-validation"
      : fixCardsAvailable
      ? "fix-cards"
      : issuePlanningAvailable
      ? "issue-planning"
      : issue.recordState === "readable"
      ? "architect-planning"
      : "intake",
    workflowStatus,
    fixCardsWorkflowStatus,
  };
}

export function getIssueValidationProjection(
  workspaceRoot: string,
  issueId: string | null | undefined,
  suppliedReadContext?: IssueProjectionReadContext,
): IssueValidationProjection {
  const resolvedRoot = path.resolve(workspaceRoot);
  const readContext = issueReadContext(resolvedRoot, suppliedReadContext);
  const issue = resolveIssueRecordProjection(resolvedRoot, issueId, readContext);
  if (!issue) {
    return emptyIssueValidationProjection();
  }
  const planning = getIssuePlanningProjectionWithoutAutoPromotion(resolvedRoot, issue.issueId, readContext);
  let evidence: AggregateIssueValidationEvidence | undefined;
  let evidenceError = "";
  try {
    evidence = requireAggregateIssueValidationEvidence(resolvedRoot, issue, planning, readContext);
  } catch (error) {
    evidenceError = errorMessage(error);
  }
  const scan = scanAggregateIssueValidationRecords(resolvedRoot, issue.issueId, evidence, readContext);
  const current = scan.current;
  const currentValidationRecord = evidence
    ? resolveCurrentAggregateIssueValidationRecord(resolvedRoot, evidence, scan)
    : undefined;
  const latest = current ?? scan.latest;
  let status: IssueValidationStatus;
  let statusMessage: string;
  if (scan.errors.length > 0) {
    status = "needs-attention";
    statusMessage = `Issue Validation records need attention: ${scan.errors.join("; ")}`;
  } else if (currentValidationRecord?.disposition === "Approved") {
    status = "approved";
    statusMessage = "The exact current aggregate evidence has an Approved Issue Validation result. FC08 does not close the Issue.";
  } else if (currentValidationRecord?.disposition === "RevisionRequested") {
    status = "revision-requested";
    statusMessage = "Aggregate Issue Validation requested bounded corrective work. Issue Planning revision is the current forward workspace.";
  } else if (evidence) {
    status = "eligible";
    statusMessage = scan.latest
      ? "Every current Fix Card is closed. The prior Issue Validation attempt is historical because its exact source evidence is stale; a new aggregate attempt is available."
      : "Every current Fix Card Plan candidate has valid close record. Aggregate Issue Validation is eligible.";
  } else if (issue.recordState !== "readable") {
    status = "blocked-unreadable-evidence";
    statusMessage = (issue.readError ?? evidenceError) || "Issue Validation requires a readable Issue Record.";
  } else if (!planning.architectPlanningEligible || planning.operatorDisposition !== "Approved") {
    status = "blocked-planning-not-approved";
    statusMessage = evidenceError || "Issue Validation requires current Approved Architect Planning and Issue Planning.";
  } else if (
    planning.fixCardCandidates.length > 0 &&
    planning.fixCardCandidates.some((candidate) => !readIssueFixCardCloseRecord(resolvedRoot, issue, candidate, readContext).valid)
  ) {
    status = "blocked-fix-cards-incomplete";
    statusMessage = evidenceError || "Issue Validation requires valid close record for every current Fix Card Plan candidate.";
  } else {
    status = "blocked-unreadable-evidence";
    statusMessage = evidenceError || "Required aggregate Issue Validation evidence is unreadable or stale.";
  }
  const eligible = status === "eligible";
  const staleRecordMessage = !current && scan.latest
    ? "The latest Issue Validation record does not match the exact current aggregate source revisions and SHA-256 fingerprints. It remains historical evidence only."
    : undefined;
  const currentRecordReadError = scan.errors.length > 0
    ? scan.errors.join("; ")
    : staleRecordMessage;
  return {
    issueId: issue.issueId,
    title: issue.title,
    status,
    statusMessage,
    eligible,
    sourceEvidence: evidence?.sourceEvidence ?? [],
    completedFixCards: evidence?.completedFixCards ?? completedFixCardSummaries(resolvedRoot, issue, planning.fixCardCandidates),
    evidenceSha256: evidence ? aggregateIssueValidationEvidenceSha256(evidence) : undefined,
    planningDisposition: planning.operatorDisposition,
    currentRecordPath: latest?.path,
    currentRecordState: current ? "readable" : latest ? "read-error" : "missing",
    currentRecordMarkdown: latest?.bodyMarkdown,
    currentRecordReadError,
    currentRecordRevision: latest?.metadata?.artifactRevision,
    currentDisposition: current?.metadata.documentDisposition.status,
    currentDecision: current?.decision,
    currentAttemptNumber: current?.attemptNumber,
    operatorNotes: current?.operatorNotes,
    boundedCorrectiveWork: current?.boundedCorrectiveWork,
    nextAttemptNumber: scan.nextAttemptNumber,
    canValidateResolved: eligible,
    canRequestCorrectiveWork: eligible,
    workflowStatus: {
      issueId: issue.issueId,
      stageId: "issue-validation",
      stageLabel: "Issue Validation",
      state: status,
      stateLabel: stateLabelForIssueValidationStatus(status),
      issuePlanningEligible: planning.architectPlanningEligible,
      fixCardsEligible: planning.fixCardsEligible,
      reason: statusMessage,
    },
  };
}

export function applyIssueValidationDecision(
  workspaceRoot: string,
  issueId: string,
  input: IssueValidationDecisionInput,
): IssueValidationMutationResult {
  const resolvedRoot = path.resolve(workspaceRoot);
  const issue = requireReadableIssue(resolvedRoot, issueId);
  const planning = getIssuePlanningProjectionWithoutAutoPromotion(resolvedRoot, issue.issueId);
  const evidence = requireAggregateIssueValidationEvidence(resolvedRoot, issue, planning);
  if (input.expectedEvidenceSha256 !== aggregateIssueValidationEvidenceSha256(evidence)) {
    throw new Error("Aggregate Issue Validation evidence changed after the workspace was loaded. Refresh and review the exact current evidence before deciding.");
  }
  const scan = scanAggregateIssueValidationRecords(resolvedRoot, issue.issueId, evidence);
  if (scan.errors.length > 0) {
    throw new Error(`Issue Validation records need attention before another decision: ${scan.errors.join("; ")}`);
  }
  if (scan.current) {
    throw new Error(`A finalized Issue Validation decision already exists for this exact aggregate evidence set: ${scan.current.path}`);
  }
  const decision = input.decision;
  if (decision !== "ValidateResolved" && decision !== "RequestCorrectiveWork") {
    throw new Error("Unsupported aggregate Issue Validation decision.");
  }
  const operatorNotes = input.operatorNotes.trim();
  const boundedCorrectiveWork = input.boundedCorrectiveWork?.trim() ?? "";
  if (decision === "RequestCorrectiveWork" && !isSubstantiveBoundedCorrectiveWork(boundedCorrectiveWork)) {
    throw new Error("A substantive bounded unresolved outcome and corrective-work statement is required; general dissatisfaction is not sufficient.");
  }
  const attemptNumber = scan.nextAttemptNumber;
  const validationRecordPath = issueValidationRecordPath(issue.issueId, attemptNumber);
  if (safeFileExists(resolvedRoot, validationRecordPath)) {
    throw new Error("The next Issue Validation attempt path already exists and will not be overwritten.");
  }
  const disposition = decision === "ValidateResolved" ? "Approved" : "RevisionRequested";
  writeCanonicalMarkdownDocument({
    workspaceRoot: resolvedRoot,
    relativePath: validationRecordPath,
    metadata: aggregateIssueValidationMetadata(
      issue,
      evidence,
      attemptNumber,
      decision,
      disposition,
      operatorNotes,
      boundedCorrectiveWork,
    ),
    bodyMarkdown: aggregateIssueValidationBody(
      issue,
      evidence,
      attemptNumber,
      decision,
      operatorNotes,
      boundedCorrectiveWork,
    ),
  });
  const postMutationContext = createIssueProjectionReadContext(resolvedRoot, "post-mutation");
  return {
    ok: true,
    action: "issueValidation.applyDecision",
    message: decision === "ValidateResolved"
      ? "Issue Validation recorded as Approved for the exact aggregate evidence. Issue Close remains a separate later stage."
      : "Issue Validation recorded as RevisionRequested. The existing Issue Planning revision path is now current.",
    projection: getIssueValidationProjection(resolvedRoot, issue.issueId, postMutationContext),
    postMutation: buildIssuePostMutationProjection(
      resolvedRoot,
      issue.issueId,
      postMutationContext,
      { includeDestinationProjection: true },
    ),
  };
}

export function getIssueCloseProjection(
  workspaceRoot: string,
  issueId: string | null | undefined,
  suppliedReadContext?: IssueProjectionReadContext,
): IssueCloseProjection {
  const resolvedRoot = path.resolve(workspaceRoot);
  const readContext = issueReadContext(resolvedRoot, suppliedReadContext);
  const issue = resolveIssueRecordProjection(resolvedRoot, issueId, readContext);
  if (!issue) {
    return emptyIssueCloseProjection();
  }

  const validation = getIssueValidationProjection(resolvedRoot, issue.issueId, readContext);
  const closeRead = readIssueCloseRecord(resolvedRoot, issue.issueId, readContext);
  let evidence: IssueCloseEvidence | undefined;
  let evidenceError = "";
  try {
    evidence = requireIssueCloseEvidence(resolvedRoot, issue, readContext);
  } catch (error) {
    evidenceError = errorMessage(error);
  }

  let status: IssueCloseStatus;
  let statusMessage: string;
  let closeRecordState = closeRead.state;
  let closeRecordReadError = closeRead.readError;
  if (closeRead.state !== "missing") {
    if (closeRead.state !== "readable" || !closeRead.metadata) {
      status = "needs-attention";
      statusMessage = `Issue Close record needs attention: ${closeRead.readError ?? "The canonical Issue close record is unreadable."}`;
    } else if (!evidence) {
      status = "needs-attention";
      closeRecordState = "read-error";
      closeRecordReadError = `The existing Issue close record cannot be validated against exact current Approved aggregate Issue Validation basis. ${evidenceError}`.trim();
      statusMessage = `Issue Close record needs attention: ${closeRecordReadError}`;
    } else {
      try {
        validateIssueCloseRecord(issue, closeRead.path, closeRead.metadata, closeRead.bodyMarkdown ?? "", evidence);
        status = "closed";
        statusMessage = "The canonical current Issue close record is valid. Issue Close is the terminal stage.";
      } catch (error) {
        status = "needs-attention";
        closeRecordState = "read-error";
        closeRecordReadError = `${closeRead.path}: ${errorMessage(error)}`;
        statusMessage = `Issue Close record needs attention: ${closeRecordReadError}`;
      }
    }
  } else if (evidence) {
    status = "eligible";
    statusMessage = "Exact current Approved aggregate Issue Validation basis is ready for one final Issue-level close action.";
  } else if (issue.recordState !== "readable") {
    status = "blocked-unreadable-evidence";
    statusMessage = issue.readError ?? (evidenceError || "Issue Close requires a readable Issue Record and current closure evidence.");
  } else if (validation.status === "blocked-unreadable-evidence" || validation.status === "needs-attention") {
    status = "blocked-unreadable-evidence";
    statusMessage = evidenceError || validation.statusMessage;
  } else {
    status = "blocked-validation-not-approved";
    statusMessage = evidenceError || "Issue Close requires exact current Approved aggregate Issue Validation with decision ValidateResolved.";
  }

  const eligible = status === "eligible";
  const closeRecord: IssueCloseRecordProjection = {
    path: closeRead.path,
    state: closeRecordState,
    revision: closeRead.metadata?.artifactRevision,
    bodyMarkdown: closeRead.bodyMarkdown,
    validationBasisSha256: closeRead.validationBasisSha256,
    readError: closeRecordReadError,
  };
  return {
    issueId: issue.issueId,
    title: issue.title,
    status,
    statusMessage,
    eligible,
    issueRecordPath: issue.recordPath,
    issueRecordState: issue.recordState,
    issueRecordMarkdown: issue.bodyMarkdown,
    issueRecordReadError: issue.readError,
    sourceEvidence: evidence?.sourceEvidence ?? validation.sourceEvidence,
    completedFixCards: evidence?.completedFixCards ?? validation.completedFixCards,
    validationBasis: evidence?.validationBasis,
    validationBasisSha256: evidence?.validationBasisSha256,
    closeRecord,
    canCloseIssue: eligible && Boolean(evidence?.validationBasisSha256),
    workflowStatus: {
      issueId: issue.issueId,
      stageId: "issue-close",
      stageLabel: "Issue Close",
      state: status,
      stateLabel: stateLabelForIssueCloseStatus(status),
      issuePlanningEligible: validation.workflowStatus.issuePlanningEligible,
      fixCardsEligible: validation.workflowStatus.fixCardsEligible,
      reason: statusMessage,
    },
  };
}

export function closeIssue(
  workspaceRoot: string,
  issueId: string,
  input: IssueCloseActionInput,
): IssueCloseActionResult {
  const resolvedRoot = path.resolve(workspaceRoot);
  const issue = requireReadableIssue(resolvedRoot, issueId);
  const evidence = requireIssueCloseEvidence(resolvedRoot, issue);
  if (input.expectedValidationBasisSha256 !== evidence.validationBasisSha256) {
    throw new Error("Issue Close record changed after the workspace was loaded. Refresh and review the exact current closure evidence before closing.");
  }
  const existing = readIssueCloseRecord(resolvedRoot, issue.issueId);
  if (existing.state !== "missing") {
    throw new Error(existing.state === "readable"
      ? `Issue close record already exists and will not be overwritten: ${existing.path}`
      : `Issue close record needs attention and will not be replaced: ${existing.readError ?? existing.path}`);
  }
  writeCanonicalMarkdownDocumentOnce({
    workspaceRoot: resolvedRoot,
    relativePath: existing.path,
    metadata: issueCloseMetadata(issue, evidence),
    bodyMarkdown: issueCloseBody(issue, evidence),
  });
  const projection = getIssueCloseProjection(resolvedRoot, issue.issueId);
  if (projection.status !== "closed") {
    throw new Error(projection.closeRecord.readError ?? "The written Issue close record did not reconstruct as terminal state.");
  }
  return {
    ok: true,
    action: "issueClose.closeIssue",
    message: "Issue closed from exact current repository binding. Return to the Workflow Hub; Development remains resolver-owned and unchanged.",
    projection,
  };
}

export function prepareIssuePlanningHandoff(
  workspaceRoot: string,
  issueId: string,
): IssuePlanningActionResult {
  const resolvedRoot = path.resolve(workspaceRoot);
  const projection = getIssuePlanningProjection(resolvedRoot, issueId);
  if (!projection.architectPlanningEligible) {
    throw new Error("Issue Planning requires Approved Architect Planning with recommendation Proceed in Issue Resolution.");
  }
  if (!projection.canPrepareHandoff) {
    throw new Error("Issue Planning handoff is not available in the current state.");
  }
  if (projection.operatorDisposition === "RevisionRequested" && !projection.operatorReviewNotes?.trim()) {
    throw new Error("RevisionRequested review requires Operator notes before preparing a revised handoff.");
  }
  if (projection.revisionSource === "issue-validation" && !projection.issueValidationBoundedCorrectiveWork?.trim()) {
    throw new Error("RevisionRequested Issue Validation requires a bounded corrective-work statement before preparing a revised handoff.");
  }
  const submissionId = crypto.randomUUID();
  const issueResolutionPlanDraftPath = normalizeRelativePath(path.join(
    "issues",
    "Architect_Drafts",
    submissionId,
    "issue-resolution-plan.md",
  ));
  const fixCardPlanDraftPath = normalizeRelativePath(path.join(
    "issues",
    "Architect_Drafts",
    submissionId,
    "fix-card-plan.md",
  ));
  const preparedInstruction = buildIssuePlanningHandoffInstruction(
    resolvedRoot,
    projection,
    issueResolutionPlanDraftPath,
    fixCardPlanDraftPath,
  );
  const key = submissionKey(resolvedRoot, issueId);
  activePlanningSubmissions.set(key, {
    fixCardPlanDraftPath,
    issueResolutionPlanDraftPath,
    preparedInstruction,
    submissionId,
  });
  planningAutoPromotionFailures.delete(key);

  return {
    ok: true,
    action: "issuePlanning.prepareHandoff",
    message: "Issue Planning handoff prepared.",
    projection: getIssuePlanningProjection(resolvedRoot, issueId),
  };
}

export function resolveIssuePlanningCopyHandoff(
  workspaceRoot: string,
  issueId: string,
): { instruction: string; result: IssuePlanningActionResult } {
  const resolvedRoot = path.resolve(workspaceRoot);
  const issue = requireReadableIssue(resolvedRoot, issueId);
  const activeSubmission = activePlanningSubmissions.get(submissionKey(resolvedRoot, issue.issueId));
  if (!activeSubmission) {
    throw new Error("Prepare an Issue Planning handoff before copying.");
  }
  return {
    instruction: activeSubmission.preparedInstruction,
    result: {
      ok: true,
      action: "issuePlanning.copyHandoff",
      message: "Issue Planning handoff copied.",
      projection: getIssuePlanningProjection(resolvedRoot, issue.issueId),
    },
  };
}

export function promoteIssuePlanningDraftBundle(
  workspaceRoot: string,
  issueId: string,
): IssuePlanningActionResult {
  const resolvedRoot = path.resolve(workspaceRoot);
  const issue = requireReadableIssue(resolvedRoot, issueId);
  const key = submissionKey(resolvedRoot, issue.issueId);
  const activeSubmission = activePlanningSubmissions.get(key);
  if (!activeSubmission) {
    throw new Error("Prepare a fresh Issue Planning handoff before promoting drafts.");
  }
  const currentProjection = getIssuePlanningProjectionWithoutAutoPromotion(resolvedRoot, issue.issueId);
  if (!currentProjection.architectPlanningEligible) {
    activePlanningSubmissions.delete(key);
    throw new Error("Issue Planning requires eligible Architect Planning before promotion.");
  }

  const paths = issuePlanningPaths(issue.issueId);
  const issueResolutionPlanFinalPath = containedPath(resolvedRoot, paths.issueResolutionPlanPath);
  const fixCardPlanFinalPath = containedPath(resolvedRoot, paths.fixCardPlanPath);
  const issueResolutionPlanDraftPath = containedPath(resolvedRoot, activeSubmission.issueResolutionPlanDraftPath);
  const fixCardPlanDraftPath = containedPath(resolvedRoot, activeSubmission.fixCardPlanDraftPath);
  for (const [label, draftPath] of [
    ["Issue Resolution Plan draft", issueResolutionPlanDraftPath],
    ["Fix Card Plan draft", fixCardPlanDraftPath],
  ] as const) {
    if (!fs.existsSync(draftPath)) {
      throw new Error(`${label} was not found for the active submission.`);
    }
    const stats = fs.lstatSync(draftPath);
    if (stats.isSymbolicLink() || !stats.isFile()) {
      activePlanningSubmissions.delete(key);
      throw new Error(`${label} is not a regular file.`);
    }
  }

  const issueResolutionPlanMarkdown = fs.readFileSync(issueResolutionPlanDraftPath, "utf8");
  const fixCardPlanMarkdown = fs.readFileSync(fixCardPlanDraftPath, "utf8");
  const planFindings = validateIssueResolutionPlan(issue.issueId, issueResolutionPlanMarkdown);
  const fixCardValidation = parseAndValidateFixCardPlan(issue.issueId, fixCardPlanMarkdown);
  if (planFindings.length > 0 || fixCardValidation.findings.length > 0) {
    activePlanningSubmissions.delete(key);
    throw new Error(`Issue Planning draft validation failed: ${[...planFindings, ...fixCardValidation.findings].join("; ")}`);
  }

  const review = currentProjection.operatorDisposition
    ? {
        disposition: currentProjection.operatorDisposition,
        operatorNotes: currentProjection.operatorReviewNotes ?? "",
      }
    : null;
  const isPlanningReviewRevisionReplacement =
    fs.existsSync(issueResolutionPlanFinalPath) &&
    fs.existsSync(fixCardPlanFinalPath) &&
    review?.disposition === "RevisionRequested";
  const isIssueValidationRevisionReplacement =
    fs.existsSync(issueResolutionPlanFinalPath) &&
    fs.existsSync(fixCardPlanFinalPath) &&
    currentProjection.revisionSource === "issue-validation";
  const isRevisionReplacement = isPlanningReviewRevisionReplacement || isIssueValidationRevisionReplacement;
  const isBootstrapAdoptionReplacement =
    fs.existsSync(issueResolutionPlanFinalPath) &&
    fs.existsSync(fixCardPlanFinalPath) &&
    isBootstrapPlanningAdoptionProjection(currentProjection);

  if (
    (fs.existsSync(issueResolutionPlanFinalPath) || fs.existsSync(fixCardPlanFinalPath)) &&
    !isRevisionReplacement &&
    !isBootstrapAdoptionReplacement
  ) {
    activePlanningSubmissions.delete(key);
    throw new Error("Current Issue Planning bundle already exists and requires Operator disposition before replacement.");
  }

  if (isIssueValidationRevisionReplacement) {
    assertCorrectivePlanningRevisionPreservesClosedCandidates(
      resolvedRoot,
      issue,
      currentProjection,
      fixCardValidation.candidates,
    );
  }

  const cleanupWarnings: string[] = [];
  if (isRevisionReplacement || isBootstrapAdoptionReplacement) {
    cleanupWarnings.push(...replaceCurrentPlanningBundle(
      resolvedRoot,
      issue.issueId,
      activeSubmission,
      paths,
      { preserveReview: isRevisionReplacement },
    ));
  } else {
    linkInitialPlanningBundle(issueResolutionPlanDraftPath, fixCardPlanDraftPath, issueResolutionPlanFinalPath, fixCardPlanFinalPath);
  }
  cleanupPlanningSubmissionDrafts(resolvedRoot, activeSubmission);
  activePlanningSubmissions.delete(key);
  planningAutoPromotionFailures.delete(key);

  return {
    ok: true,
    action: "issuePlanning.promoteDraftBundle",
    message: cleanupWarnings.length
      ? `Issue Planning bundle promoted from the two validated temporary drafts. Cleanup warning: ${cleanupWarnings.join("; ")}`
      : "Issue Planning bundle promoted from the two validated temporary drafts.",
    projection: getIssuePlanningProjection(resolvedRoot, issue.issueId),
  };
}

export function applyIssuePlanningReview(
  workspaceRoot: string,
  issueId: string,
  input: IssueArchitectReviewInput,
): IssuePlanningMutationResult {
  const resolvedRoot = path.resolve(workspaceRoot);
  const projection = getIssuePlanningProjection(resolvedRoot, issueId);
  const disposition = requireIssueArchitectReviewDisposition(input.disposition);
  const operatorNotes = optionalInput(input.operatorNotes) ?? "";
  if (disposition === "RevisionRequested" && !operatorNotes) {
    throw new Error("RevisionRequested requires Operator notes.");
  }
  if (!projection.canApplyReview && projection.status !== "awaiting-operator-review") {
    throw new Error("A validated Issue Planning bundle is required before review.");
  }

  fs.writeFileSync(
    containedPath(resolvedRoot, projection.reviewPath),
    formatIssuePlanningReview({
      disposition,
      fixCardPlanPath: projection.fixCardPlanPath,
      issueId: projection.issueId,
      issueResolutionPlanPath: projection.issueResolutionPlanPath,
      operatorNotes,
    }),
    "utf8",
  );

  const postMutationContext = createIssueProjectionReadContext(resolvedRoot, "post-mutation");
  return {
    ok: true,
    action: "issuePlanning.applyReview",
    message: `Issue Planning review applied: ${disposition}.`,
    projection: getIssuePlanningProjection(resolvedRoot, issueId, postMutationContext),
    postMutation: buildIssuePostMutationProjection(resolvedRoot, issueId, postMutationContext),
  };
}

export function getIssueFixCardProjection(
  workspaceRoot: string,
  issueId: string | null | undefined,
  currentStep: IssueFixCardLoopStepId = "fix-card-map",
  suppliedReadContext?: IssueProjectionReadContext,
): IssueFixCardProjection {
  const resolvedRoot = path.resolve(workspaceRoot);
  const readContext = issueReadContext(resolvedRoot, suppliedReadContext);
  const normalizedStep = normalizeIssueFixCardLoopStepId(currentStep);
  const issue = resolveIssueRecordProjection(resolvedRoot, issueId, readContext);
  if (!issue) {
    return emptyIssueFixCardProjection(normalizedStep);
  }
  const planning = getIssuePlanningProjectionWithoutAutoPromotion(resolvedRoot, issue.issueId, readContext);
  const selectionKey = submissionKey(resolvedRoot, issue.issueId);
  const selectedFixCardId = activeFixCardSelections.get(selectionKey);
  let selectedCandidate = selectedFixCardId
    ? planning.fixCardCandidates.find((candidate) => candidate.fixCardId === selectedFixCardId)
    : undefined;
  if (selectedFixCardId && !selectedCandidate) {
    activeFixCardSelections.delete(selectionKey);
  }
  if (!planning.fixCardsEligible) {
    return buildIssueFixCardProjection({
      currentStep: normalizedStep,
      issue,
      planning,
      workspaceRoot: resolvedRoot,
      readContext,
      status: "blocked-fix-card-map-unavailable",
      statusMessage: planning.statusMessage,
    });
  }
  if (!selectedCandidate) {
    selectedCandidate = recoverIssueFixCardCandidateFromControlledDraft(resolvedRoot, issue, planning);
    if (selectedCandidate) {
      activeFixCardSelections.set(selectionKey, selectedCandidate.fixCardId);
    }
  }
  if (!selectedCandidate) {
    return buildIssueFixCardProjection({
      currentStep: normalizedStep,
      issue,
      planning,
      workspaceRoot: resolvedRoot,
      readContext,
      status: "candidate-selection-required",
      statusMessage: "Select one current validated Fix Card Map candidate before planning a Fix Card contract.",
    });
  }

  const selectedLifecycle = deriveIssueFixCardCandidateLifecycle(
    resolvedRoot,
    issue,
    planning,
    selectedCandidate,
    readContext,
  );
  if (selectedLifecycle.state === "complete" || selectedLifecycle.state === "blocked-by-dependencies") {
    activeFixCardSelections.delete(selectionKey);
    return buildIssueFixCardProjection({
      currentStep: "fix-card-map",
      issue,
      planning,
      workspaceRoot: resolvedRoot,
      readContext,
      status: "candidate-selection-required",
      statusMessage: selectedLifecycle.reason,
    });
  }

  const rootContext = issueFixCardContextForRoot(resolvedRoot, issue, planning, selectedCandidate, readContext);
  const context = resolveCurrentIssueFixCardContext(resolvedRoot, rootContext, readContext);
  if (maybeAutoPromoteIssueRepairDraft(resolvedRoot, context)) {
    return getIssueFixCardProjection(resolvedRoot, issue.issueId, normalizedStep);
  }
  return buildIssueFixCardProjection({
    context,
    currentStep: normalizedStep,
    issue,
    planning,
    workspaceRoot: resolvedRoot,
    readContext,
  });
}

export function selectIssueFixCardCandidate(
  workspaceRoot: string,
  issueId: string,
  fixCardId: string,
  _currentStep: IssueFixCardLoopStepId = "fix-card-map",
): IssueFixCardActionResult {
  const resolvedRoot = path.resolve(workspaceRoot);
  const issue = requireReadableIssue(resolvedRoot, issueId);
  const planning = getIssuePlanningProjectionWithoutAutoPromotion(resolvedRoot, issue.issueId);
  if (!planning.fixCardsEligible) {
    throw new Error("A current approved Fix Card Map is required before selecting a Fix Card candidate.");
  }
  const candidate = planning.fixCardCandidates.find((entry) => entry.fixCardId === fixCardId);
  if (!candidate) {
    throw new Error("Selected Fix Card candidate is not present in the current validated Fix Card Map.");
  }
  const lifecycle = deriveIssueFixCardCandidateLifecycle(resolvedRoot, issue, planning, candidate);
  if (!lifecycle.selectable) {
    throw new Error(lifecycle.reason);
  }
  activeFixCardSelections.set(submissionKey(resolvedRoot, issue.issueId), candidate.fixCardId);
  return {
    ok: true,
    action: "issueFixCard.selectCandidate",
    message: `Selected current Fix Card candidate: ${candidate.fixCardId}.`,
    projection: getIssueFixCardProjection(resolvedRoot, issue.issueId, "fix-card-map"),
  };
}

export function prepareIssueFixCardPlanningHandoff(
  workspaceRoot: string,
  issueId: string,
  currentStep: IssueFixCardLoopStepId = "planning",
): IssueFixCardActionResult {
  const resolvedRoot = path.resolve(workspaceRoot);
  const context = requireSelectedIssueFixCardContext(resolvedRoot, issueId, false);
  const projection = getIssueFixCardProjection(resolvedRoot, issueId, currentStep);
  if (!projection.canPreparePlanningHandoff) {
    throw new Error("Fix Card Planning handoff is not available in the current state.");
  }
  if (projection.contractDisposition === "RevisionRequested" && !projection.contractReviewNotes?.trim()) {
    throw new Error("RevisionRequested Fix Card review requires Operator notes before preparing a revised handoff.");
  }
  const submissionId = crypto.randomUUID();
  const temporaryDraftPath = normalizeRelativePath(path.join(
    "issues",
    "Architect_Drafts",
    submissionId,
    "fix-card-contract.md",
  ));
  const priorFailure = fixCardPlanningDraftFailures.get(
    fixCardSubmissionKey(resolvedRoot, issueId, context.candidate.fixCardId),
  );
  const draftRevision = Math.max(projection.controlledDraftRevision ?? 0, priorFailure?.draftRevision ?? 0) + 1;
  const sourceRevisions = issueFixCardPlanningSourceRevisions(context);
  const sourceFingerprints = issueFixCardPlanningSourceFingerprints(context);
  writeCanonicalMarkdownDocument({
    workspaceRoot: resolvedRoot,
    relativePath: temporaryDraftPath,
    metadata: issueFixCardDraftMetadata(context, {
      draftRevision,
      priorDraftPath: projection.controlledDraftPath,
      priorDraftRevision: projection.controlledDraftRevision,
      revisionNotes: projection.contractDisposition === "RevisionRequested"
        ? projection.contractReviewNotes
        : undefined,
      sourceRevisions,
      sourceFingerprints,
      submissionId,
      temporaryDraftPath,
    }),
    bodyMarkdown: projection.contractDisposition === "RevisionRequested"
      ? projection.contractMarkdown ?? ""
      : "",
  });
  const inspected = inspectControlledMarkdownDraft(resolvedRoot, temporaryDraftPath);
  const submission: IssueFixCardDraftSubmission = {
    bodySha256: inspected.bodySha256,
    documentDisposition: "Pending",
    draftRevision,
    finalFixCardTarget: context.contractPath,
    implementerReportTarget: context.implementerReportPath,
    metadataSha256: inspected.metadataSha256,
    preparedInstruction: "",
    submissionId,
    temporaryDraftPath,
  };
  const preparedInstruction = buildIssueFixCardPlanningHandoffInstruction(
    resolvedRoot,
    context,
    submission,
  );
  activeFixCardPlanningSubmissions.set(
    fixCardSubmissionKey(resolvedRoot, issueId, context.candidate.fixCardId),
    { ...submission, preparedInstruction },
  );
  return {
    ok: true,
    action: "issueFixCard.preparePlanningHandoff",
    message: "Application-controlled Fix Card draft created and handoff prepared.",
    projection: getIssueFixCardProjection(resolvedRoot, issueId, currentStep),
  };
}

export function resolveIssueFixCardPlanningCopyHandoff(
  workspaceRoot: string,
  issueId: string,
  currentStep: IssueFixCardLoopStepId = "planning",
): { instruction: string; result: IssueFixCardActionResult } {
  const resolvedRoot = path.resolve(workspaceRoot);
  const context = requireSelectedIssueFixCardContext(resolvedRoot, issueId, false);
  const activeSubmission = resolveCurrentFixCardPlanningSubmission(resolvedRoot, context);
  if (!activeSubmission) {
    throw new Error("Prepare a Fix Card Planning handoff before copying.");
  }
  if (activeSubmission.documentDisposition !== "Pending") {
    throw new Error("Prepare the next controlled Fix Card draft revision before copying a handoff.");
  }
  return {
    instruction: activeSubmission.preparedInstruction,
    result: {
      ok: true,
      action: "issueFixCard.copyPlanningHandoff",
      message: "Fix Card Planning handoff copied.",
      projection: getIssueFixCardProjection(resolvedRoot, issueId, currentStep),
    },
  };
}

export function applyIssueFixCardContractReview(
  workspaceRoot: string,
  issueId: string,
  input: IssueArchitectReviewInput,
  currentStep: IssueFixCardLoopStepId = "planning",
): IssueFixCardMutationResult {
  const resolvedRoot = path.resolve(workspaceRoot);
  const context = requireSelectedIssueFixCardContext(resolvedRoot, issueId);
  if (context.implementationKind === "root-fix-card") {
    return applyControlledIssueFixCardDraftReview(resolvedRoot, context, input, currentStep);
  }
  const current = readCanonicalIssueDocument(resolvedRoot, context.contractPath);
  if (current.state !== "readable") {
    throw new Error(current.readError ?? "Fix Card contract is not readable for Operator review.");
  }
  const expectedArtifactType = context.implementationKind === "repair" ? "repair-work-card" : "fix-card";
  if (!current.metadata || current.metadata.artifactType !== expectedArtifactType || !metadataMatchesIssueImplementation(current.metadata, context)) {
    throw new Error("Current Issue implementation contract artifact type or identity is invalid.");
  }
  const disposition = requireIssueArchitectReviewDisposition(input.disposition);
  const operatorNotes = optionalInput(input.operatorNotes) ?? "";
  if (disposition === "RevisionRequested" && !operatorNotes) {
    throw new Error("RevisionRequested requires Operator notes.");
  }
  const reviewedAt = new Date().toISOString();
  const reviewedMetadata = metadataWithDisposition(current.metadata, disposition, operatorNotes, reviewedAt);
  if (disposition === "Approved") {
    const existingReport = readCanonicalIssueDocument(resolvedRoot, context.implementerReportPath);
    const documents = [{
      workspaceRoot: resolvedRoot,
      relativePath: context.contractPath,
      metadata: reviewedMetadata,
      bodyMarkdown: current.bodyMarkdown ?? "",
    }];
    if (existingReport.state === "readable") {
      assertIssueFixCardReportMatches(resolvedRoot, context, reviewedMetadata.artifactRevision, existingReport.metadata);
    } else if (existingReport.state === "read-error") {
      throw new Error(existingReport.readError ?? "Existing Issue-owned Implementer Report is unreadable.");
    } else {
      documents.push({
        workspaceRoot: resolvedRoot,
        relativePath: context.implementerReportPath,
        metadata: issueFixCardImplementerReportMetadata(context, reviewedMetadata.artifactRevision),
        bodyMarkdown: issueFixCardImplementerReportBody(context, reviewedMetadata.artifactRevision),
      });
    }
    writeCanonicalMarkdownDocuments(documents);
  } else {
    writeCanonicalMarkdownDocument({
      workspaceRoot: resolvedRoot,
      relativePath: context.contractPath,
      metadata: reviewedMetadata,
      bodyMarkdown: current.bodyMarkdown ?? "",
    });
  }
  const postMutationContext = createIssueProjectionReadContext(resolvedRoot, "post-mutation");
  return {
    ok: true,
    action: "issueFixCard.applyContractReview",
    message: `Fix Card contract review applied: ${disposition}.`,
    projection: getIssueFixCardProjection(resolvedRoot, issueId, currentStep, postMutationContext),
    postMutation: buildIssuePostMutationProjection(resolvedRoot, issueId, postMutationContext),
  };
}

function applyControlledIssueFixCardDraftReview(
  workspaceRoot: string,
  context: IssueFixCardContext,
  input: IssueArchitectReviewInput,
  currentStep: IssueFixCardLoopStepId,
): IssueFixCardMutationResult {
  const submission = resolveCurrentFixCardPlanningSubmission(workspaceRoot, context);
  if (!submission) {
    throw new Error("An application-controlled Fix Card draft is required for Operator review.");
  }
  const inspected = inspectControlledMarkdownDraft(workspaceRoot, submission.temporaryDraftPath);
  assertFixCardDraftMatchesContext(inspected.metadata, context, submission.temporaryDraftPath);
  if (inspected.metadata.documentDisposition.status !== "Pending") {
    throw new Error("Only the current Pending controlled Fix Card draft can receive an Operator disposition.");
  }
  if (!inspected.bodyMarkdown.trim()) {
    throw new Error("The controlled Fix Card draft body is empty and is not ready for Operator review.");
  }
  const expectedReviewedBodySha256 = optionalInput(input.expectedReviewedBodySha256);
  if (!expectedReviewedBodySha256 || expectedReviewedBodySha256 !== inspected.bodySha256) {
    throw new Error("STALE_SOURCE: The controlled Fix Card draft body changed after the Operator review surface was rendered. Refresh and review the current body before applying a disposition.");
  }

  const disposition = requireIssueArchitectReviewDisposition(input.disposition);
  const operatorNotes = optionalInput(input.operatorNotes) ?? "";
  if (disposition === "RevisionRequested" && !operatorNotes) {
    throw new Error("RevisionRequested requires Operator notes.");
  }
  const reviewedAt = new Date().toISOString();
  const key = fixCardSubmissionKey(workspaceRoot, context.issue.issueId, context.candidate.fixCardId);

  if (disposition === "Approved") {
    const existingContract = readCanonicalIssueDocument(workspaceRoot, context.contractPath);
    if (existingContract.state === "read-error") {
      throw new Error(existingContract.readError ?? "Existing final Fix Card target is unreadable.");
    }
    if (
      existingContract.state === "readable" &&
      existingContract.metadata?.documentDisposition.status !== "RevisionRequested"
    ) {
      throw new Error("Final Fix Card target already exists and is not revision-replaceable.");
    }
    const pendingFinalMetadata = existingContract.state === "readable" && existingContract.metadata
      ? metadataWithSubstantiveRevision(existingContract.metadata, inspected.metadata.sourceRevisions)
      : fixCardContractMetadata(context, inspected.metadata.sourceRevisions);
    const approvedMetadata = metadataWithDisposition(
      pendingFinalMetadata,
      "Approved",
      operatorNotes,
      reviewedAt,
    );
    const existingReport = readCanonicalIssueDocument(workspaceRoot, context.implementerReportPath);
    const documents = [{
      workspaceRoot,
      relativePath: context.contractPath,
      metadata: approvedMetadata,
      bodyMarkdown: inspected.bodyMarkdown,
    }];
    if (existingReport.state === "readable") {
      assertIssueFixCardReportMatches(workspaceRoot, context, approvedMetadata.artifactRevision, existingReport.metadata);
    } else if (existingReport.state === "read-error") {
      throw new Error(existingReport.readError ?? "Existing Issue-owned Implementer Report is unreadable.");
    } else {
      documents.push({
        workspaceRoot,
        relativePath: context.implementerReportPath,
        metadata: issueFixCardImplementerReportMetadata(context, approvedMetadata.artifactRevision),
        bodyMarkdown: issueFixCardImplementerReportBody(context, approvedMetadata.artifactRevision),
      });
    }
    assertReviewedControlledDraftStillCurrent(workspaceRoot, context, submission.temporaryDraftPath, inspected.fileSha256, expectedReviewedBodySha256);
    writeCanonicalMarkdownDocuments(documents);
    cleanupSingleSubmissionDraft(workspaceRoot, submission.temporaryDraftPath);
    activeFixCardPlanningSubmissions.delete(key);
  } else {
    assertReviewedControlledDraftStillCurrent(workspaceRoot, context, submission.temporaryDraftPath, inspected.fileSha256, expectedReviewedBodySha256);
    writeCanonicalMarkdownDocument({
      workspaceRoot,
      relativePath: submission.temporaryDraftPath,
      metadata: metadataWithDisposition(inspected.metadata, disposition, operatorNotes, reviewedAt),
      bodyMarkdown: inspected.bodyMarkdown,
    });
    activeFixCardPlanningSubmissions.delete(key);
    resolveCurrentFixCardPlanningSubmission(workspaceRoot, context);
  }

  const postMutationContext = createIssueProjectionReadContext(workspaceRoot, "post-mutation");
  return {
    ok: true,
    action: "issueFixCard.applyContractReview",
    message: disposition === "Approved"
      ? "Operator approval finalized the canonical Fix Card and atomically reserved its Implementer Report."
      : `Controlled Fix Card draft review applied: ${disposition}.`,
    projection: getIssueFixCardProjection(
      workspaceRoot,
      context.issue.issueId,
      currentStep,
      postMutationContext,
    ),
    postMutation: buildIssuePostMutationProjection(
      workspaceRoot,
      context.issue.issueId,
      postMutationContext,
    ),
  };
}

function assertReviewedControlledDraftStillCurrent(
  workspaceRoot: string,
  context: IssueFixCardContext,
  relativePath: string,
  expectedFileSha256: string,
  expectedBodySha256: string,
): void {
  const current = inspectControlledMarkdownDraft(workspaceRoot, relativePath);
  assertFixCardDraftMatchesContext(current.metadata, context, relativePath);
  if (current.fileSha256 !== expectedFileSha256 || current.bodySha256 !== expectedBodySha256) {
    throw new Error("STALE_SOURCE: The controlled Fix Card draft changed while the Operator disposition was being applied. No disposition was written.");
  }
}

export function reserveIssueFixCardImplementerReport(
  workspaceRoot: string,
  issueId: string,
  currentStep: IssueFixCardLoopStepId = "implement",
): IssueFixCardActionResult {
  const resolvedRoot = path.resolve(workspaceRoot);
  const context = requireSelectedIssueFixCardContext(resolvedRoot, issueId);
  const contract = requireApprovedIssueFixCardContract(resolvedRoot, context);
  const existingReport = readCanonicalIssueDocument(resolvedRoot, context.implementerReportPath);
  if (existingReport.state === "readable") {
    assertIssueFixCardReportMatches(resolvedRoot, context, contract.metadata.artifactRevision, existingReport.metadata);
    return {
      ok: true,
      action: "issueFixCard.recoverImplementerReportSetup",
      message: "Issue-owned Implementer Report setup is already complete.",
      projection: getIssueFixCardProjection(resolvedRoot, issueId, currentStep),
    };
  }
  if (existingReport.state === "read-error") {
    throw new Error(existingReport.readError ?? "Existing Issue-owned Implementer Report is unreadable.");
  }
  writeCanonicalMarkdownDocument({
    workspaceRoot: resolvedRoot,
    relativePath: context.implementerReportPath,
    metadata: issueFixCardImplementerReportMetadata(context, contract.metadata.artifactRevision),
    bodyMarkdown: issueFixCardImplementerReportBody(context, contract.metadata.artifactRevision),
  });
  return {
    ok: true,
    action: "issueFixCard.recoverImplementerReportSetup",
    message: "Issue-owned Implementer Report setup recovered at the exact expected target.",
    projection: getIssueFixCardProjection(resolvedRoot, issueId, currentStep),
  };
}

export function resolveIssueFixCardCodexExecutionContext(
  workspaceRoot: string,
  issueId: string,
  fixCardId: string,
  currentImplementationId?: string,
): IssueFixCardCodexExecutionContext {
  const resolvedRoot = path.resolve(workspaceRoot);
  activeFixCardSelections.set(submissionKey(resolvedRoot, issueId), fixCardId);
  const context = requireSelectedIssueFixCardContext(resolvedRoot, issueId);
  if (currentImplementationId && context.implementationId !== currentImplementationId) {
    throw new Error("Issue Codex execution context changed; refresh the current Fix Card implementation before running.");
  }
  const contract = requireApprovedIssueFixCardContract(resolvedRoot, context);
  const report = readCanonicalIssueDocument(resolvedRoot, context.implementerReportPath);
  if (report.state !== "readable") {
    throw new Error(report.readError ?? "Existing Pending Issue-owned Implementer Report is required before Codex execution.");
  }
  assertIssueFixCardReportMatches(resolvedRoot, context, contract.metadata.artifactRevision, report.metadata);
  if (!report.metadata || report.metadata.documentDisposition.status !== "Pending") {
    throw new Error("Existing Issue-owned Implementer Report must be Pending before Codex execution.");
  }
  const readiness = classifyIssueFixCardReportReadiness(resolvedRoot, context, contract.metadata.artifactRevision);
  if (readiness.readiness === "invalid" || readiness.readiness === "conflict") {
    throw new Error(readiness.reason);
  }
  return {
    ownerKind: "issue",
    issueId,
    fixCardId,
    currentImplementationId: context.implementationId,
    repairId: context.repairId,
    workCardTitle: context.candidate.title,
    projectRoot: resolvedRoot,
    formalWorkCardPath: context.contractPath,
    formalWorkCardRevision: contract.metadata.artifactRevision,
    formalWorkCardSha256: sha256ForRelativePath(resolvedRoot, context.contractPath),
    implementationContractType: context.implementationKind === "repair" ? "repair-work-card" : "fix-card",
    implementationContractLabel: context.implementationKind === "repair" ? "Approved Repair Contract" : "Approved Fix Card Contract",
    implementerReportPath: context.implementerReportPath,
    implementerReportRevision: report.metadata.artifactRevision,
    implementerReportSha256: sha256ForRelativePath(resolvedRoot, context.implementerReportPath),
  };
}

export function issueFixCardReportReadinessBlocker(
  workspaceRoot: string,
  issueId: string,
  fixCardId: string,
  expectedCurrentImplementationId?: string,
): string | null {
  const resolvedRoot = path.resolve(workspaceRoot);
  activeFixCardSelections.set(submissionKey(resolvedRoot, issueId), fixCardId);
  const context = requireSelectedIssueFixCardContext(resolvedRoot, issueId);
  if (expectedCurrentImplementationId && context.implementationId !== expectedCurrentImplementationId) {
    return "Issue Codex execution context changed; refresh the current Fix Card implementation before reviewing the completed run.";
  }
  const contract = requireApprovedIssueFixCardContract(resolvedRoot, context);
  const readiness = classifyIssueFixCardReportReadiness(resolvedRoot, context, contract.metadata.artifactRevision);
  return readiness.readiness === "ready-for-review" ? null : readiness.reason;
}

export function resolveIssueFixCardAdvisoryReviewPrompt(
  workspaceRoot: string,
  issueId: string,
  currentStep: IssueFixCardLoopStepId = "review-validation",
): { instruction: string; result: IssueFixCardActionResult } {
  const resolvedRoot = path.resolve(workspaceRoot);
  const context = requireSelectedIssueFixCardContext(resolvedRoot, issueId);
  const evidence = requireCurrentIssueFixCardValidationEvidence(resolvedRoot, context);
  const contractMetadata = evidence.contract.metadata!;
  const reportMetadata = evidence.report.metadata!;
  const contractLabel = context.implementationKind === "repair"
    ? "Approved Repair Contract"
    : "Approved Fix Card Contract";
  const subjectLabel = context.implementationKind === "repair" ? "Issue Repair" : "Issue Fix Card";
  const instruction = buildOperatorValidationAdvisoryPrompt(resolvedRoot, {
    subjectId: context.implementationId,
    subjectLabel,
    contractSourceLabel: contractLabel,
    contractDocumentLabel: contractLabel,
    contractPath: context.contractPath,
    contractRevision: contractMetadata.artifactRevision,
    contractSha256: sha256ForRelativePath(resolvedRoot, context.contractPath),
    implementerReportPath: context.implementerReportPath,
    implementerReportRevision: reportMetadata.artifactRevision,
    implementerReportSha256: sha256ForRelativePath(resolvedRoot, context.implementerReportPath),
    identityLines: [
      `- Issue ID: ${context.issue.issueId}`,
      `- Root Fix Card ID: ${context.candidate.fixCardId}`,
      `- Current implementation ID: ${context.implementationId}`,
      `- Implementation kind: ${context.implementationKind}`,
    ],
    changedFiles: reportMetadata.workflowData.filesChanged,
  });
  return {
    instruction,
    result: {
      ok: true,
      action: "issueFixCard.copyAdvisoryReviewPrompt",
      message: "Fix Card Review & Validation advisory prompt copied.",
      projection: getIssueFixCardProjection(resolvedRoot, issueId, currentStep),
    },
  };
}

export function applyIssueFixCardValidationDecision(
  workspaceRoot: string,
  issueId: string,
  input: IssueFixCardValidationDecisionInput,
  currentStep: IssueFixCardLoopStepId = "review-validation",
): IssueFixCardMutationResult {
  const resolvedRoot = path.resolve(workspaceRoot);
  const context = requireSelectedIssueFixCardContext(resolvedRoot, issueId);
  const evidence = requireCurrentIssueFixCardValidationEvidence(resolvedRoot, context);
  const decision = input.decision;
  if (decision !== "ValidatePassed" && decision !== "RequestRepair") {
    throw new Error("Unsupported Issue Fix Card validation decision.");
  }
  const operatorNotes = input.operatorNotes.trim();
  const advisorySummary = input.advisorySummary?.trim() ?? "";
  const boundedDefect = input.boundedDefect?.trim() ?? "";
  if (decision === "RequestRepair" && !boundedDefect) {
    throw new Error("Bounded defect text is required to request Issue Repair.");
  }
  const existing = findIssueValidationForEvidence(resolvedRoot, context, evidence.sourceRevisions);
  if (existing.state === "readable") {
    throw new Error(`A finalized validation decision already exists for this exact evidence revision set: ${existing.path}`);
  }
  if (existing.state === "read-error") {
    throw new Error(existing.readError ?? "Existing exact-evidence validation record is unreadable.");
  }
  const attemptNumber = nextIssueValidationAttemptNumber(resolvedRoot, context);
  const validationRecordPath = normalizeRelativePath(path.join(
    "issues",
    context.issue.issueId,
    "Validation_Records",
    `VALIDATION_RECORD_${context.candidate.fixCardId}_ATTEMPT${String(attemptNumber).padStart(2, "0")}.md`,
  ));
  const status = decision === "ValidatePassed" ? "Approved" : "RevisionRequested";
  writeCanonicalMarkdownDocument({
    workspaceRoot: resolvedRoot,
    relativePath: validationRecordPath,
    metadata: issueFixCardValidationMetadata(context, evidence.sourceRevisions, attemptNumber, status, operatorNotes, advisorySummary, boundedDefect),
    bodyMarkdown: issueFixCardValidationBody(context, attemptNumber, status, operatorNotes, advisorySummary, boundedDefect),
  });
  const postMutationContext = createIssueProjectionReadContext(resolvedRoot, "post-mutation");
  return {
    ok: true,
    action: "issueFixCard.applyValidationDecision",
    message: status === "Approved"
      ? "Fix Card validation recorded as passed; Close / Next is now available."
      : "Fix Card validation recorded as RevisionRequested; bounded Issue Repair is now available.",
    projection: getIssueFixCardProjection(resolvedRoot, issueId, currentStep, postMutationContext),
    postMutation: buildIssuePostMutationProjection(resolvedRoot, issueId, postMutationContext),
  };
}

export function closeIssueFixCard(
  workspaceRoot: string,
  issueId: string,
  currentStep: IssueFixCardLoopStepId = "close-next",
): IssueFixCardMutationResult {
  const resolvedRoot = path.resolve(workspaceRoot);
  const context = requireSelectedIssueFixCardContext(resolvedRoot, issueId);
  const validation = requireCurrentApprovedIssueValidation(resolvedRoot, context);
  const closeRecordPath = issueFixCardCloseRecordPath(context.issue.issueId, context.candidate.fixCardId);
  const existing = readIssueFixCardCloseRecord(resolvedRoot, context.issue, context.candidate);
  if (existing.state !== "missing") {
    if (
      existing.valid &&
      existing.origin === "fix-card-validation" &&
      existing.currentImplementationId === context.implementationId &&
      existing.repairId === context.repairId &&
      existing.validationRecordPath === validation.path &&
      existing.metadata?.sourceRevisions.length === 1 &&
      existing.metadata.sourceRevisions[0]?.path === validation.path &&
      existing.metadata.sourceRevisions[0]?.revision === validation.metadata.artifactRevision
    ) {
      const postMutationContext = createIssueProjectionReadContext(resolvedRoot, "post-mutation");
      const projection = getIssueFixCardProjection(resolvedRoot, issueId, "fix-card-map", postMutationContext);
      return {
        ok: true,
        action: "issueFixCard.close",
        message: `${context.candidate.fixCardId} was already closed from the exact current Approved validation record.`,
        projection,
        postMutation: buildIssuePostMutationProjection(
          resolvedRoot,
          issueId,
          postMutationContext,
          { includePlanning: true, includeValidation: projection.allFixCardsClosed },
        ),
      };
    }
    throw new Error(existing.readError ?? "A conflicting Fix Card close record already exists and will not be overwritten.");
  }

  const metadata: CanonicalDocumentMetadata = {
    schemaVersion: 1,
    artifactType: "fix-card-close-record",
    artifactRevision: 1,
    participationRole: "gatingReview",
    identity: {
      issueId: context.issue.issueId,
      fixCardId: context.candidate.fixCardId,
      candidateId: context.candidate.fixCardId,
      currentImplementationId: context.implementationId,
      ...(context.repairId ? { repairId: context.repairId } : {}),
    },
    sourceRevisions: [{ path: validation.path, revision: validation.metadata.artifactRevision }],
    workflowData: {
      ownerKind: "issue",
      issueId: context.issue.issueId,
      rootFixCardId: context.candidate.fixCardId,
      currentImplementationId: context.implementationId,
      ...(context.repairId ? { repairId: context.repairId } : {}),
      origin: "fix-card-validation",
      validationRecordPath: validation.path,
      returnTarget: "fix-card-map",
    },
    documentDisposition: {
      status: "Approved",
      notes: "Closed by the Operator from the exact current Approved Fix Card Validation Record.",
      reviewedAt: new Date().toISOString(),
    },
  };
  writeCanonicalMarkdownDocument({
    workspaceRoot: resolvedRoot,
    relativePath: closeRecordPath,
    metadata,
    bodyMarkdown: issueFixCardCloseRecordBody({
      issueId: context.issue.issueId,
      fixCardId: context.candidate.fixCardId,
      currentImplementationId: context.implementationId,
      repairId: context.repairId,
      origin: "fix-card-validation",
      validationRecordPath: validation.path,
    }),
  });
  activeFixCardSelections.delete(submissionKey(resolvedRoot, context.issue.issueId));
  const postMutationContext = createIssueProjectionReadContext(resolvedRoot, "post-mutation");
  const projection = getIssueFixCardProjection(resolvedRoot, issueId, "fix-card-map", postMutationContext);
  const next = projection.nextEligibleCandidate;
  return {
    ok: true,
    action: "issueFixCard.close",
    message: projection.allFixCardsClosed
      ? `${context.candidate.fixCardId} closed. All planned Fix Cards are closed; Issue Validation is eligible.`
      : `${context.candidate.fixCardId} closed. Returned to the Fix Card Map${next ? `; ${next.fixCardId} is Eligible.` : "."}`,
    projection,
    postMutation: buildIssuePostMutationProjection(
      resolvedRoot,
      issueId,
      postMutationContext,
      { includePlanning: true, includeValidation: projection.allFixCardsClosed },
    ),
  };
}

export function prepareIssueFixCardRepairHandoff(
  workspaceRoot: string,
  issueId: string,
  currentStep: IssueFixCardLoopStepId = "repair",
): IssueFixCardActionResult {
  const resolvedRoot = path.resolve(workspaceRoot);
  const context = requireSelectedIssueFixCardContext(resolvedRoot, issueId);
  const validation = requireIssueRepairHandoffValidation(resolvedRoot, context);
  const key = issueImplementationSubmissionKey(resolvedRoot, issueId, context.implementationId);
  if (resolveCurrentIssueRepairSubmission(resolvedRoot, context)) {
    throw new Error("A Repair handoff is already active for the current failed implementation.");
  }
  if (issueRepairAutoPromotionFailures.has(key)) {
    throw new Error(issueRepairAutoPromotionFailures.get(key)!.message);
  }
  const revisesCurrentRepair = context.implementationKind === "repair" &&
    readCanonicalIssueDocument(resolvedRoot, context.contractPath).metadata?.documentDisposition.status === "RevisionRequested";
  const repairId = revisesCurrentRepair ? context.implementationId : nextIssueRepairId(resolvedRoot, context);
  const submissionId = crypto.randomUUID();
  const temporaryDraftPath = normalizeRelativePath(path.join("issues", "Architect_Drafts", submissionId, "repair-contract.md"));
  const submission: IssueFixCardRepairDraftSubmission = {
    parentImplementationId: revisesCurrentRepair
      ? context.parentImplementationId ?? context.implementationId
      : context.implementationId,
    preparedInstruction: "",
    repairId,
    submissionId,
    temporaryDraftPath,
    validationRecordPath: validation.path,
    parentImplementationPath: revisesCurrentRepair ? context.parentImplementationPath! : context.contractPath,
    finalRepairTarget: revisesCurrentRepair ? context.contractPath : normalizeRelativePath(path.join(
      "issues", issueId, "Repairs", `${repairId}_${slugForText(validation.boundedDefect, "repair")}.md`,
    )),
    implementerReportTarget: revisesCurrentRepair ? context.implementerReportPath : normalizeRelativePath(path.join(
      "issues", issueId, "Implementer_Reports", `IMPLEMENTER_REPORT_${repairId}_${slugForText(validation.boundedDefect, "repair")}.md`,
    )),
    draftRevision: nextIssueRepairDraftRevision(resolvedRoot, repairId),
    bodyMarkdown: "",
  };
  writeCanonicalMarkdownDocument({
    workspaceRoot: resolvedRoot,
    relativePath: temporaryDraftPath,
    metadata: issueRepairDraftMetadata(resolvedRoot, context, submission, validation),
    bodyMarkdown: "",
  });
  const inspection = inspectControlledMarkdownDraft(resolvedRoot, temporaryDraftPath);
  submission.metadataSha256 = inspection.metadataSha256;
  submission.bodySha256 = inspection.bodySha256;
  submission.documentDisposition = "Pending";
  submission.preparedInstruction = buildIssueRepairHandoffInstruction(resolvedRoot, context, validation, submission);
  activeIssueRepairSubmissions.set(key, submission);
  issueRepairAutoPromotionFailures.delete(key);
  return {
    ok: true,
    action: "issueFixCard.prepareRepairHandoff",
    message: revisesCurrentRepair
      ? `Issue Repair revision handoff prepared for ${repairId}.`
      : `Issue Repair handoff prepared for ${repairId}.`,
    projection: getIssueFixCardProjection(resolvedRoot, issueId, currentStep),
  };
}

export function resolveIssueFixCardRepairCopyHandoff(
  workspaceRoot: string,
  issueId: string,
  currentStep: IssueFixCardLoopStepId = "repair",
): { instruction: string; result: IssueFixCardActionResult } {
  const resolvedRoot = path.resolve(workspaceRoot);
  const context = requireSelectedIssueFixCardContext(resolvedRoot, issueId);
  const submission = resolveCurrentIssueRepairSubmission(resolvedRoot, context);
  if (!submission) {
    throw new Error("Prepare an Issue Repair handoff before copying.");
  }
  return {
    instruction: submission.preparedInstruction,
    result: {
      ok: true,
      action: "issueFixCard.copyRepairHandoff",
      message: "Issue Repair handoff copied.",
      projection: getIssueFixCardProjection(resolvedRoot, issueId, currentStep),
    },
  };
}

export function promoteIssueFixCardRepairDraft(
  workspaceRoot: string,
  issueId: string,
  currentStep: IssueFixCardLoopStepId = "repair",
): IssueFixCardActionResult {
  const resolvedRoot = path.resolve(workspaceRoot);
  const context = requireSelectedIssueFixCardContext(resolvedRoot, issueId);
  const key = issueImplementationSubmissionKey(resolvedRoot, issueId, context.implementationId);
  const submission = resolveCurrentIssueRepairSubmission(resolvedRoot, context);
  if (!submission) {
    throw new Error("Prepare a fresh Issue Repair handoff before promoting the draft.");
  }
  const revisesCurrentRepair = context.implementationKind === "repair" && submission.repairId === context.implementationId;
  const validation = requireIssueRepairHandoffValidation(resolvedRoot, context);
  const expectedParentImplementationId = revisesCurrentRepair
    ? context.parentImplementationId
    : context.implementationId;
  if (
    validation.path !== submission.validationRecordPath ||
    !expectedParentImplementationId ||
    submission.parentImplementationId !== expectedParentImplementationId
  ) {
    activeIssueRepairSubmissions.delete(key);
    throw new Error("Issue Repair draft basis is stale or mismatched to the current failed implementation.");
  }
  const draftPath = containedPath(resolvedRoot, submission.temporaryDraftPath);
  if (!fs.existsSync(draftPath)) {
    throw new Error("Issue Repair contract draft was not found for the active submission.");
  }
  const stats = fs.lstatSync(draftPath);
  if (stats.isSymbolicLink() || !stats.isFile()) {
    activeIssueRepairSubmissions.delete(key);
    throw new Error("Issue Repair contract draft is not a regular file.");
  }
  const bodyMarkdown = inspectControlledMarkdownDraft(resolvedRoot, submission.temporaryDraftPath).bodyMarkdown;
  const findings = validateIssueRepairContractDraft(context, submission, validation, bodyMarkdown);
  if (findings.length > 0) {
    throw new Error(`Issue Repair contract draft validation failed: ${findings.join("; ")}`);
  }
  const boundedDefect = validation.boundedDefect;
  const slug = slugForText(boundedDefect, "repair");
  const repairPath = revisesCurrentRepair
    ? context.contractPath
    : normalizeRelativePath(path.join("issues", issueId, "Repairs", `${submission.repairId}_${slug}.md`));
  const reportPath = revisesCurrentRepair
    ? context.implementerReportPath
    : normalizeRelativePath(path.join("issues", issueId, "Implementer_Reports", `IMPLEMENTER_REPORT_${submission.repairId}_${slug}.md`));
  const existingRepair = readCanonicalIssueDocument(resolvedRoot, repairPath);
  if (!revisesCurrentRepair && existingRepair.state === "readable") {
    activeIssueRepairSubmissions.delete(key);
    throw new Error("Collision-safe Issue Repair target already exists.");
  }
  if (revisesCurrentRepair && (
    existingRepair.state !== "readable" ||
    !existingRepair.metadata ||
    existingRepair.metadata.documentDisposition.status !== "RevisionRequested"
  )) {
    activeIssueRepairSubmissions.delete(key);
    throw new Error("Current Issue Repair must be RevisionRequested before its contract can be replaced.");
  }
  writeCanonicalMarkdownDocument({
    workspaceRoot: resolvedRoot,
    relativePath: repairPath,
    metadata: revisesCurrentRepair
      ? metadataWithSubstantiveRevision(existingRepair.metadata!, existingRepair.metadata!.sourceRevisions)
      : issueRepairContractMetadata(context, submission, validation, reportPath),
    bodyMarkdown,
  });
  cleanupSingleSubmissionDraft(resolvedRoot, submission.temporaryDraftPath);
  activeIssueRepairSubmissions.delete(key);
  issueRepairAutoPromotionFailures.delete(key);
  return {
    ok: true,
    action: "issueFixCard.promoteRepairDraft",
    message: revisesCurrentRepair
      ? `Issue Repair ${submission.repairId} revision promoted for Operator review.`
      : `Issue Repair ${submission.repairId} promoted for Operator review.`,
    projection: getIssueFixCardProjection(resolvedRoot, issueId, currentStep),
  };
}

function requireCurrentIssueFixCardValidationEvidence(
  workspaceRoot: string,
  context: IssueFixCardContext,
): IssueFixCardValidationEvidence {
  const contract = readCanonicalIssueDocument(workspaceRoot, context.contractPath, context.readContext);
  const report = readCanonicalIssueDocument(workspaceRoot, context.implementerReportPath, context.readContext);
  const approvedContract = requireApprovedIssueFixCardContract(workspaceRoot, context);
  if (contract.state !== "readable" || !contract.metadata) {
    throw new Error(contract.readError ?? "The exact current implementation contract must be readable before Fix Card Validation.");
  }
  if (report.state !== "readable" || !report.metadata) {
    throw new Error(report.readError ?? "The exact current Implementer Report is required before Fix Card Validation.");
  }
  const readiness = classifyIssueFixCardReportReadiness(workspaceRoot, context, approvedContract.metadata.artifactRevision);
  if (readiness.readiness !== "ready-for-review") {
    throw new Error(readiness.reason);
  }
  const sourceRevisions = [
    { path: context.contractPath, revision: approvedContract.metadata.artifactRevision },
    { path: context.implementerReportPath, revision: report.metadata.artifactRevision },
  ];
  return {
    contract,
    report,
    sourceRevisions,
  };
}

function currentIssueFixCardValidationEvidence(
  workspaceRoot: string,
  context: IssueFixCardContext,
): IssueFixCardValidationEvidence | undefined {
  try {
    return requireCurrentIssueFixCardValidationEvidence(workspaceRoot, context);
  } catch {
    return undefined;
  }
}

function findIssueValidationForEvidence(
  workspaceRoot: string,
  context: IssueFixCardContext,
  sourceRevisions: CanonicalDocumentMetadata["sourceRevisions"],
): IssueValidationReadResult {
  const directory = containedPath(workspaceRoot, path.join("issues", context.issue.issueId, "Validation_Records"));
  if (!fs.existsSync(directory)) {
    return { state: "missing" };
  }
  const matches: IssueValidationReadResult[] = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".md")) {
      continue;
    }
    const relativePath = normalizeRelativePath(path.join("issues", context.issue.issueId, "Validation_Records", entry.name));
    const document = readCanonicalIssueDocument(workspaceRoot, relativePath, context.readContext);
    if (document.state !== "readable" || !document.metadata) {
      continue;
    }
    const metadata = document.metadata;
    if (
      metadata.artifactType === "validation-record" &&
      metadata.identity.issueId === context.issue.issueId &&
      metadata.identity.fixCardId === context.candidate.fixCardId &&
      metadata.identity.currentImplementationId === context.implementationId &&
      sourceRevisionsEqual(metadata.sourceRevisions, sourceRevisions)
    ) {
      matches.push({
        state: "readable",
        path: relativePath,
        bodyMarkdown: document.bodyMarkdown,
        metadata,
        attemptNumber: numberMetadataValue(metadata.identity.attemptNumber),
        operatorNotes: stringMetadataValue(metadata.workflowData.operatorNotes),
        boundedDefect: stringMetadataValue(metadata.workflowData.boundedDefect),
      });
    }
  }
  if (matches.length > 1) {
    return { state: "read-error", readError: "Multiple validation records claim the same exact current evidence revision set." };
  }
  return matches[0] ?? { state: "missing" };
}

function currentIssueValidationRecord(
  workspaceRoot: string,
  context: IssueFixCardContext,
): IssueValidationReadResult {
  const evidence = currentIssueFixCardValidationEvidence(workspaceRoot, context);
  return evidence ? findIssueValidationForEvidence(workspaceRoot, context, evidence.sourceRevisions) : { state: "missing" };
}

function requireCurrentApprovedIssueValidation(
  workspaceRoot: string,
  context: IssueFixCardContext,
): IssueValidationReadResult & { path: string; metadata: CanonicalDocumentMetadata } {
  const evidence = requireCurrentIssueFixCardValidationEvidence(workspaceRoot, context);
  const record = findIssueValidationForEvidence(workspaceRoot, context, evidence.sourceRevisions);
  const metadata = record.metadata;
  if (record.state !== "readable" || !record.path || !metadata) {
    throw new Error(record.readError ?? "The exact current Approved Fix Card Validation Record is required before Close / Next.");
  }
  if (
    metadata.artifactType !== "validation-record" ||
    metadata.participationRole !== "gatingReview" ||
    metadata.documentDisposition.status !== "Approved" ||
    metadata.identity.issueId !== context.issue.issueId ||
    metadata.identity.fixCardId !== context.candidate.fixCardId ||
    metadata.identity.currentImplementationId !== context.implementationId ||
    stringMetadataValue(metadata.identity.repairId) !== context.repairId ||
    Boolean(metadata.identity.phaseId) ||
    Boolean(metadata.identity.workCardId) ||
    Boolean(metadata.identity.parentWorkCardId) ||
    !sourceRevisionsEqual(metadata.sourceRevisions, evidence.sourceRevisions)
  ) {
    throw new Error("Close / Next requires the exact current Approved validation record and identity-matching contract/report/review revisions.");
  }
  return { ...record, path: record.path, metadata };
}

function issueFixCardCloseRecordPath(issueId: string, fixCardId: string): string {
  return normalizeRelativePath(path.join(
    "issues",
    issueId,
    "Close_Records",
    `FIX_CARD_CLOSE_RECORD_${fixCardId}.md`,
  ));
}

function readIssueFixCardCloseRecord(
  workspaceRoot: string,
  issue: IssueRecordProjection,
  candidate: IssueFixCardPlanCandidate,
  readContext?: IssueProjectionReadContext,
): IssueFixCardCloseReadResult {
  const closePath = issueFixCardCloseRecordPath(issue.issueId, candidate.fixCardId);
  const document = readCanonicalIssueDocument(workspaceRoot, closePath, readContext);
  if (document.state === "missing") {
    return {
      path: closePath,
      state: "missing",
      valid: false,
      reason: "No Fix Card close record exists.",
    };
  }
  if (document.state !== "readable" || !document.metadata) {
    return {
      path: closePath,
      state: "read-error",
      valid: false,
      readError: document.readError ?? "Fix Card close record is unreadable.",
      reason: document.readError ?? "Fix Card close record is unreadable.",
    };
  }
  const metadata = document.metadata;
  const origin = stringMetadataValue(metadata.workflowData.origin) as IssueFixCardCloseRecordOrigin | undefined;
  const currentImplementationId = stringMetadataValue(metadata.identity.currentImplementationId);
  const repairId = stringMetadataValue(metadata.identity.repairId);
  const validationRecordPath = stringMetadataValue(metadata.workflowData.validationRecordPath);
  const commonValid = metadata.artifactType === "fix-card-close-record" &&
    metadata.participationRole === "gatingReview" &&
    metadata.documentDisposition.status === "Approved" &&
    metadata.identity.issueId === issue.issueId &&
    metadata.identity.fixCardId === candidate.fixCardId &&
    metadata.identity.candidateId === candidate.fixCardId &&
    currentImplementationId !== undefined &&
    metadata.workflowData.ownerKind === "issue" &&
    metadata.workflowData.issueId === issue.issueId &&
    metadata.workflowData.rootFixCardId === candidate.fixCardId &&
    metadata.workflowData.currentImplementationId === currentImplementationId &&
    stringMetadataValue(metadata.workflowData.repairId) === repairId &&
    metadata.workflowData.returnTarget === "fix-card-map" &&
    !metadata.identity.phaseId &&
    !metadata.identity.workCardId &&
    !metadata.identity.parentWorkCardId;
  let valid = commonValid;
  let reason = "Fix Card close record metadata or Issue identity is invalid.";
  if (valid && origin === "bootstrap-cutover") {
    valid = metadata.sourceRevisions.length === 0 &&
      !validationRecordPath &&
      fixCardCompletionBasis(metadata.workflowData) === "operator-bootstrap-cutover" &&
      /bootstrap cutover/i.test(document.bodyMarkdown ?? "") &&
      /not reconstruct/i.test(document.bodyMarkdown ?? "");
    reason = valid
      ? "Approved Operator bootstrap-cutover close record is current."
      : "Bootstrap close record must be explicit, source-free, and must not claim reconstructed historical validation.";
  } else if (valid && origin === "fix-card-validation") {
    const source = metadata.sourceRevisions[0];
    const validation = validationRecordPath
      ? readCanonicalIssueDocument(workspaceRoot, validationRecordPath, readContext)
      : { state: "missing" as const };
    const validationMetadata = validation.metadata;
    valid = Boolean(
      validationRecordPath &&
      metadata.sourceRevisions.length === 1 &&
      source?.path === validationRecordPath &&
      validation.state === "readable" &&
      validationMetadata &&
      source?.revision === validationMetadata.artifactRevision &&
      validationMetadata.artifactType === "validation-record" &&
      validationMetadata.participationRole === "gatingReview" &&
      validationMetadata.documentDisposition.status === "Approved" &&
      validationMetadata.identity.issueId === issue.issueId &&
      validationMetadata.identity.fixCardId === candidate.fixCardId &&
      validationMetadata.identity.currentImplementationId === currentImplementationId &&
      stringMetadataValue(validationMetadata.identity.repairId) === repairId &&
      !validationMetadata.identity.phaseId &&
      !validationMetadata.identity.workCardId &&
      !validationMetadata.identity.parentWorkCardId
    );
    reason = valid
      ? "Canonical close record is bound to the exact Approved Fix Card Validation Record revision."
      : "Fix Card close record is stale, malformed, or bound to the wrong validation revision.";
  } else {
    valid = false;
    reason = "Fix Card close record origin must be fix-card-validation or bootstrap-cutover.";
  }
  return {
    path: closePath,
    state: valid ? "readable" : "read-error",
    valid,
    metadata,
    bodyMarkdown: document.bodyMarkdown,
    origin,
    currentImplementationId,
    repairId,
    validationRecordPath,
    revision: metadata.artifactRevision,
    readError: valid ? undefined : reason,
    reason,
  };
}

function issueFixCardCloseRecordBody(input: {
  issueId: string;
  fixCardId: string;
  currentImplementationId: string;
  repairId?: string;
  origin: IssueFixCardCloseRecordOrigin;
  validationRecordPath?: string;
}): string {
  return [
    `# ${input.fixCardId} - Fix Card Close Record`,
    "",
    "## Issue",
    input.issueId,
    "",
    "## Root Fix Card",
    input.fixCardId,
    "",
    "## Current Implementation",
    input.currentImplementationId,
    ...(input.repairId ? ["", "## Repair", input.repairId] : []),
    "",
    "## Close Origin",
    input.origin,
    "",
    "## Validation Record",
    input.validationRecordPath ?? "None. Operator bootstrap cutover completion does not reconstruct historical validation genealogy.",
    "",
    "## Return Target",
    "fix-card-map",
    "",
  ].join("\n");
}

function requireCurrentRevisionRequestedIssueValidation(
  workspaceRoot: string,
  context: IssueFixCardContext,
): IssueValidationReadResult & { path: string; metadata: CanonicalDocumentMetadata; boundedDefect: string } {
  const record = currentIssueValidationRecord(workspaceRoot, context);
  if (record.state !== "readable" || !record.path || !record.metadata) {
    throw new Error(record.readError ?? "A current readable RevisionRequested validation record is required before Issue Repair.");
  }
  if (record.metadata.documentDisposition.status !== "RevisionRequested") {
    throw new Error("Issue Repair requires a current validation record with the Operator's RevisionRequested disposition.");
  }
  const boundedDefect = record.boundedDefect?.trim() ?? "";
  if (!boundedDefect) {
    throw new Error("The current RevisionRequested validation record is missing its bounded defect basis.");
  }
  return { ...record, path: record.path, metadata: record.metadata, boundedDefect };
}

function requireIssueRepairHandoffValidation(
  workspaceRoot: string,
  context: IssueFixCardContext,
): IssueValidationReadResult & { path: string; metadata: CanonicalDocumentMetadata; boundedDefect: string } {
  if (context.implementationKind !== "repair") {
    return requireCurrentRevisionRequestedIssueValidation(workspaceRoot, context);
  }
  const contract = readCanonicalIssueDocument(workspaceRoot, context.contractPath);
  if (contract.metadata?.documentDisposition.status !== "RevisionRequested") {
    return requireCurrentRevisionRequestedIssueValidation(workspaceRoot, context);
  }
  if (!context.validationEvidencePath || !context.parentImplementationId) {
    throw new Error("Current Issue Repair revision is missing its original validation or immediate-parent basis.");
  }
  const validation = readCanonicalIssueDocument(workspaceRoot, context.validationEvidencePath);
  const metadata = validation.metadata;
  const boundedDefect = stringMetadataValue(metadata?.workflowData.boundedDefect)?.trim() ?? "";
  const expectedParentRepairId = context.parentImplementationId === context.candidate.fixCardId
    ? undefined
    : context.parentImplementationId;
  if (
    validation.state !== "readable" ||
    !metadata ||
    metadata.artifactType !== "validation-record" ||
    metadata.participationRole !== "gatingReview" ||
    metadata.documentDisposition.status !== "RevisionRequested" ||
    metadata.identity.issueId !== context.issue.issueId ||
    metadata.identity.fixCardId !== context.candidate.fixCardId ||
    metadata.identity.currentImplementationId !== context.parentImplementationId ||
    stringMetadataValue(metadata.identity.repairId) !== expectedParentRepairId ||
    Boolean(metadata.identity.phaseId) ||
    Boolean(metadata.identity.workCardId) ||
    Boolean(metadata.identity.parentWorkCardId) ||
    !boundedDefect ||
    boundedDefect !== context.boundedDefect ||
    !sourceRevisionsEqual(contract.metadata.sourceRevisions, [{
      path: context.validationEvidencePath,
      revision: metadata.artifactRevision,
    }])
  ) {
    throw new Error("Current Issue Repair revision is not bound to its exact original RevisionRequested validation basis.");
  }
  return {
    state: "readable",
    path: context.validationEvidencePath,
    bodyMarkdown: validation.bodyMarkdown,
    metadata,
    attemptNumber: numberMetadataValue(metadata.identity.attemptNumber),
    operatorNotes: stringMetadataValue(metadata.workflowData.operatorNotes),
    boundedDefect,
  };
}

function nextIssueValidationAttemptNumber(workspaceRoot: string, context: IssueFixCardContext): number {
  const directory = containedPath(workspaceRoot, path.join("issues", context.issue.issueId, "Validation_Records"));
  if (!fs.existsSync(directory)) {
    return 1;
  }
  return fs.readdirSync(directory)
    .map((name) => Number(name.match(new RegExp(`^VALIDATION_RECORD_${escapeRegex(context.candidate.fixCardId)}_ATTEMPT(\\d+)`, "i"))?.[1] ?? 0))
    .reduce((highest, value) => Math.max(highest, value), 0) + 1;
}

function issueFixCardValidationMetadata(
  context: IssueFixCardContext,
  sourceRevisions: CanonicalDocumentMetadata["sourceRevisions"],
  attemptNumber: number,
  status: "Approved" | "RevisionRequested",
  operatorNotes: string,
  advisorySummary: string,
  boundedDefect: string,
): CanonicalDocumentMetadata {
  return {
    schemaVersion: 1,
    artifactType: "validation-record",
    artifactRevision: 1,
    participationRole: "gatingReview",
    identity: {
      issueId: context.issue.issueId,
      fixCardId: context.candidate.fixCardId,
      candidateId: context.candidate.fixCardId,
      currentImplementationId: context.implementationId,
      ...(context.repairId ? { repairId: context.repairId } : {}),
      attemptNumber,
    },
    sourceRevisions,
    workflowData: {
      ownerKind: "issue",
      issueId: context.issue.issueId,
      rootFixCardId: context.candidate.fixCardId,
      currentImplementationId: context.implementationId,
      implementationKind: context.implementationKind,
      ...(context.repairId ? { repairId: context.repairId } : {}),
      decision: status === "Approved" ? "ValidatePassed" : "RequestRepair",
      operatorNotes,
      advisorySummary,
      boundedDefect,
      contractPath: context.contractPath,
      implementerReportPath: context.implementerReportPath,
      operatorDecisionCreatesValidationRecord: true,
      architectReviewRole: "advisory-only",
    },
    documentDisposition: {
      status,
      notes: status === "RevisionRequested" ? boundedDefect : operatorNotes || "Operator validated passed.",
      reviewedAt: new Date().toISOString(),
    },
  };
}

function issueFixCardValidationBody(
  context: IssueFixCardContext,
  attemptNumber: number,
  status: "Approved" | "RevisionRequested",
  operatorNotes: string,
  advisorySummary: string,
  boundedDefect: string,
): string {
  return [
    `# Fix Card Validation - ${context.implementationId} Attempt ${attemptNumber}`,
    "",
    `Status: ${status}`,
    "",
    "Architect Review is advisory. This Operator decision creates the individual Fix Card validation basis.",
    "",
    "## Exact Evidence",
    `- Current implementation contract: ${context.contractPath}`,
    `- Implementer Report: ${context.implementerReportPath}`,
    "",
    "## Operator Notes",
    operatorNotes || "No Operator notes provided.",
    "",
    "## Advisory Summary",
    advisorySummary || "No advisory summary provided.",
    "",
    "## Bounded Defect",
    boundedDefect || "Not applicable.",
    "",
  ].join("\n");
}

// Canonical repository envelopes carry lifecycle state; the process map is only a reconstructed cache.
function controlledIssueRepairDrafts(workspaceRoot: string): ReturnType<typeof inspectControlledMarkdownDraft>[] {
  const directory = containedPath(workspaceRoot, "issues/Architect_Drafts");
  if (!fs.existsSync(directory) || !fs.lstatSync(directory).isDirectory()) return [];
  const drafts: ReturnType<typeof inspectControlledMarkdownDraft>[] = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
    const relativePath = normalizeRelativePath(path.join("issues", "Architect_Drafts", entry.name, "repair-contract.md"));
    try {
      const draft = inspectControlledMarkdownDraft(workspaceRoot, relativePath);
      if (draft.metadata.artifactType === "repair-work-card-draft" && draft.metadata.identity.submissionId === entry.name) {
        drafts.push(draft);
      }
    } catch {
      // Body-only orphan evidence and malformed envelopes cannot establish lifecycle state.
    }
  }
  return drafts;
}

function nextIssueRepairDraftRevision(workspaceRoot: string, repairId: string): number {
  return controlledIssueRepairDrafts(workspaceRoot)
    .filter((draft) => draft.metadata.identity.repairId === repairId)
    .reduce((highest, draft) => Math.max(highest, Number(draft.metadata.workflowData.draftRevision)), 0) + 1;
}

function issueRepairDraftMetadata(
  workspaceRoot: string,
  context: IssueFixCardContext,
  submission: IssueFixCardRepairDraftSubmission,
  validation: ReturnType<typeof requireIssueRepairHandoffValidation>,
): CanonicalDocumentMetadata {
  return {
    schemaVersion: 1,
    artifactType: "repair-work-card-draft",
    artifactRevision: submission.draftRevision!,
    participationRole: "gatingReview",
    identity: {
      issueId: context.issue.issueId,
      fixCardId: context.candidate.fixCardId,
      candidateId: context.candidate.fixCardId,
      repairId: submission.repairId,
      submissionId: submission.submissionId,
      parentImplementationId: submission.parentImplementationId,
      currentImplementationId: context.implementationId,
    },
    sourceRevisions: [{ path: validation.path, revision: validation.metadata.artifactRevision }],
    workflowData: {
      ownerKind: "issue",
      rootFixCardId: context.candidate.fixCardId,
      parentImplementationPath: submission.parentImplementationPath,
      validationRecordPath: validation.path,
      validationRecordRevision: validation.metadata.artifactRevision,
      boundedDefect: validation.boundedDefect,
      validationSourceSha256: sha256ForMarkdown(fs.readFileSync(containedPath(workspaceRoot, validation.path), "utf8")),
      implementationSourceSha256: sha256ForMarkdown(fs.readFileSync(containedPath(workspaceRoot, context.contractPath), "utf8")),
      draftRevision: submission.draftRevision,
      draftPath: submission.temporaryDraftPath,
      finalRepairTarget: submission.finalRepairTarget,
      implementerReportTarget: submission.implementerReportTarget,
      returnTarget: "review-validation",
    },
    documentDisposition: { status: "Pending", notes: "", reviewedAt: null },
  };
}

function resolveCurrentIssueRepairSubmission(
  workspaceRoot: string,
  context: IssueFixCardContext,
): IssueFixCardRepairDraftSubmission | undefined {
  const key = issueImplementationSubmissionKey(workspaceRoot, context.issue.issueId, context.implementationId);
  activeIssueRepairSubmissions.delete(key);
  issueRepairAutoPromotionFailures.delete(key);
  let validation: ReturnType<typeof requireIssueRepairHandoffValidation>;
  try {
    validation = requireIssueRepairHandoffValidation(workspaceRoot, context);
  } catch {
    return undefined;
  }
  const revisesCurrentRepair = context.implementationKind === "repair" &&
    readCanonicalIssueDocument(workspaceRoot, context.contractPath).metadata?.documentDisposition.status === "RevisionRequested";
  const candidates: IssueFixCardRepairDraftSubmission[] = [];
  for (const inspection of controlledIssueRepairDrafts(workspaceRoot)) {
    const metadata = inspection.metadata;
    const repairId = stringMetadataValue(metadata.identity.repairId)!;
    if (revisesCurrentRepair ? repairId !== context.implementationId :
      !new RegExp(`^${escapeRegex(context.candidate.fixCardId)}-REPAIR\\d+$`).test(repairId)) continue;
    const slug = slugForText(validation.boundedDefect, "repair");
    const submission: IssueFixCardRepairDraftSubmission = {
      repairId,
      submissionId: String(metadata.identity.submissionId),
      parentImplementationId: revisesCurrentRepair ? context.parentImplementationId! : context.implementationId,
      parentImplementationPath: revisesCurrentRepair ? context.parentImplementationPath! : context.contractPath,
      validationRecordPath: validation.path,
      temporaryDraftPath: inspection.relativePath,
      finalRepairTarget: revisesCurrentRepair ? context.contractPath : normalizeRelativePath(path.join(
        "issues", context.issue.issueId, "Repairs", `${repairId}_${slug}.md`,
      )),
      implementerReportTarget: revisesCurrentRepair ? context.implementerReportPath : normalizeRelativePath(path.join(
        "issues", context.issue.issueId, "Implementer_Reports", `IMPLEMENTER_REPORT_${repairId}_${slug}.md`,
      )),
      draftRevision: Number(metadata.workflowData.draftRevision),
      metadataSha256: inspection.metadataSha256,
      bodySha256: inspection.bodySha256,
      bodyMarkdown: inspection.bodyMarkdown,
      documentDisposition: "Pending",
      preparedInstruction: "",
    };
    const expected = issueRepairDraftMetadata(workspaceRoot, context, submission, validation);
    if (metadata.artifactRevision !== expected.artifactRevision || metadata.participationRole !== expected.participationRole ||
        !sourceRevisionsEqual(metadata.sourceRevisions, expected.sourceRevisions) ||
        ["identity", "workflowData", "documentDisposition"].some((field) => {
          const actual = metadata[field as "identity"];
          const wanted = expected[field as "identity"];
          return Object.keys(actual).length !== Object.keys(wanted).length ||
            Object.keys(wanted).some((name) => actual[name] !== wanted[name]);
        })) continue;
    if (!revisesCurrentRepair && safeFileExists(workspaceRoot, submission.finalRepairTarget)) continue;
    const findings = submission.bodyMarkdown.trim()
      ? validateIssueRepairContractDraft(context, submission, validation, submission.bodyMarkdown) : [];
    submission.validationError = findings.length
      ? `Issue Repair contract draft validation failed: ${findings.join("; ")}` : undefined;
    submission.preparedInstruction = buildIssueRepairHandoffInstruction(workspaceRoot, context, validation, submission);
    candidates.push(submission);
  }
  candidates.sort((left, right) => right.draftRevision! - left.draftRevision!);
  const current = candidates[0];
  if (!current) return undefined;
  if (candidates.some((candidate) => candidate.repairId !== current.repairId) ||
      candidates[1]?.draftRevision === current.draftRevision) {
    issueRepairAutoPromotionFailures.set(key, {
      message: "Multiple controlled Repair drafts claim the same current revision; application state is ambiguous.",
      submissionId: current.submissionId,
      temporaryDraftPath: current.temporaryDraftPath,
    });
    return undefined;
  }
  if (current.validationError) issueRepairAutoPromotionFailures.set(key, {
    message: current.validationError,
    submissionId: current.submissionId,
    temporaryDraftPath: current.temporaryDraftPath,
  });
  activeIssueRepairSubmissions.set(key, current);
  return current;
}

function nextIssueRepairId(workspaceRoot: string, context: IssueFixCardContext): string {
  const prefix = `${context.candidate.fixCardId}-REPAIR`;
  const active = controlledIssueRepairDrafts(workspaceRoot)
    .filter((draft) => draft.metadata.identity.issueId === context.issue.issueId)
    .map((draft) => String(draft.metadata.identity.repairId));
  const occupied = issueRepairIdsFromRepositoryEvidence(workspaceRoot, context.issue.issueId, prefix);
  const highest = [...occupied, ...active]
    .map((repairId) => Number(repairId.match(new RegExp(`^${escapeRegex(prefix)}(\\d+)$`, "i"))?.[1] ?? 0))
    .reduce((value, candidate) => Math.max(value, candidate), 0);
  return `${prefix}${String(highest + 1).padStart(2, "0")}`;
}

function issueRepairIdsFromRepositoryEvidence(
  workspaceRoot: string,
  issueId: string,
  repairPrefix: string,
): Set<string> {
  const issueRoot = containedPath(workspaceRoot, path.join("issues", issueId));
  const repairIdPattern = `${escapeRegex(repairPrefix)}(\\d+)`;
  const filenamePatterns = new Map<string, RegExp>([
    ["Repairs", new RegExp(`^(${repairIdPattern})(?:_[^/]+)?\\.md$`, "i")],
    ["Implementer_Reports", new RegExp(`^IMPLEMENTER_REPORT_(${repairIdPattern})(?:_[^/]+)?\\.md$`, "i")],
    ["Architect_Reviews", new RegExp(`^ARCHITECT_REVIEW_(${repairIdPattern})(?:_[^/]+)?\\.md$`, "i")],
    ["Validation_Records", new RegExp(`^VALIDATION_RECORD_(${repairIdPattern})_ATTEMPT\\d+(?:_[^/]+)?\\.md$`, "i")],
  ]);
  const occupied = new Set<string>();
  for (const [directoryName, pattern] of filenamePatterns) {
    const directory = path.join(issueRoot, directoryName);
    if (!fs.existsSync(directory)) continue;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      const repairId = entry.name.match(pattern)?.[1];
      if (repairId) occupied.add(repairId.toUpperCase());
    }
  }

  // External recovery artifacts reserve identities but never become lineage source.
  if (fs.existsSync(issueRoot)) {
    const externalPatterns = [
      new RegExp(`^IMPLEMENTER_REPAIR_CARD_(${repairIdPattern})\\.md$`, "i"),
      new RegExp(`^IMPLEMENTER_REPORT_(${repairIdPattern})(?:_[^/]+)?\\.md$`, "i"),
    ];
    for (const entry of fs.readdirSync(issueRoot, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      const repairId = externalPatterns
        .map((pattern) => entry.name.match(pattern)?.[1])
        .find(Boolean);
      if (repairId) occupied.add(repairId.toUpperCase());
    }
  }
  return occupied;
}

function slugForText(value: string, fallback: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 72) || fallback;
}

function issueRepairContractMetadata(
  context: IssueFixCardContext,
  submission: IssueFixCardRepairDraftSubmission,
  validation: IssueValidationReadResult & { path: string; metadata: CanonicalDocumentMetadata; boundedDefect: string },
  implementerReportPath: string,
): CanonicalDocumentMetadata {
  return {
    schemaVersion: 1,
    artifactType: "repair-work-card",
    artifactRevision: 1,
    participationRole: "gatingReview",
    identity: {
      issueId: context.issue.issueId,
      fixCardId: context.candidate.fixCardId,
      candidateId: context.candidate.fixCardId,
      currentImplementationId: submission.repairId,
      repairId: submission.repairId,
      parentImplementationId: context.implementationId,
    },
    sourceRevisions: [{ path: validation.path, revision: validation.metadata.artifactRevision }],
    workflowData: {
      ownerKind: "issue",
      issueId: context.issue.issueId,
      rootFixCardId: context.candidate.fixCardId,
      repairId: submission.repairId,
      currentImplementationId: submission.repairId,
      parentImplementationId: context.implementationId,
      parentImplementationPath: context.contractPath,
      validationRecordPath: validation.path,
      boundedDefect: validation.boundedDefect,
      returnTarget: "review-validation",
      implementerReportTarget: implementerReportPath,
    },
    documentDisposition: { status: "Pending", notes: "", reviewedAt: null },
  };
}

function validateIssueRepairContractDraft(
  context: IssueFixCardContext,
  submission: IssueFixCardRepairDraftSubmission,
  validation: { boundedDefect: string; path: string },
  bodyMarkdown: string,
): string[] {
  const findings: string[] = [];
  if (bodyMarkdown.trim().length < 700) {
    findings.push("Issue Repair contract is not substantive Markdown");
  }
  if (/<!--|^---\s*$/m.test(bodyMarkdown)) {
    findings.push("Issue Repair contract contains application metadata delimiters");
  }
  if (!bodyMarkdown.includes(validation.boundedDefect)) {
    findings.push("Issue Repair contract must preserve the exact Operator-bounded defect text");
  }
  for (const section of requiredIssueRepairContractSections) {
    const sectionBody = extractMarkdownSection(bodyMarkdown, section);
    if (sectionBody === null) {
      findings.push(`Issue Repair contract missing required section: ${section}`);
    } else if (isEmptyPlaceholderSection(sectionBody)) {
      findings.push(`Issue Repair contract section is empty or placeholder: ${section}`);
    }
  }
  return findings;
}

function buildIssueRepairHandoffInstruction(
  workspaceRoot: string,
  context: IssueFixCardContext,
  validation: IssueValidationReadResult & { path: string; metadata: CanonicalDocumentMetadata; boundedDefect: string },
  submission: IssueFixCardRepairDraftSubmission,
): string {
  const binding = resolveMcpWorkspaceBindingForPrompt(workspaceRoot);
  const revisesCurrentRepair = context.implementationKind === "repair" && submission.repairId === context.implementationId;
  const currentContract = revisesCurrentRepair
    ? readCanonicalIssueDocument(workspaceRoot, context.contractPath)
    : undefined;
  const revisionLines = revisesCurrentRepair
    ? [
        "",
        "Revision context:",
        "- Revise this same Repair identity; do not allocate or propose another Repair.",
        `- Current Repair contract path: ${context.contractPath}`,
        `- Exact Operator revision notes: ${currentContract?.metadata?.documentDisposition.notes ?? ""}`,
        "",
        "Current Repair contract to revise:",
        "",
        "```markdown",
        currentContract?.bodyMarkdown ?? "",
        "```",
      ]
    : [];
  return [
    "# Issue Repair Contract Handoff",
    "",
    ...buildMcpWorkspaceBindingPromptBlock(workspaceRoot),
    "",
    "Draft one causally subordinate Issue Repair contract. The current RevisionRequested Operator validation is the sole Repair basis.",
    `- Issue ID: ${context.issue.issueId}`,
    `- Root Fix Card ID: ${context.candidate.fixCardId}`,
    `- Repair ID: ${submission.repairId}`,
    `- Immediate parent implementation ID: ${submission.parentImplementationId}`,
    `- Immediate parent implementation path: ${submission.parentImplementationPath}`,
    `- Validation basis path: ${validation.path}`,
    `- Bounded defect (preserve exactly): ${validation.boundedDefect}`,
    `- Return target: review-validation`,
    `- Controlled Repair draft path: ${submission.temporaryDraftPath}`,
    "",
    "The Repair must remain narrower than the failed implementation contract, preserve already-passed behavior, and route unrelated observations to separate Issues.",
    "Do not invent Development phase, Work Card, or planning-path parentage.",
    "Include the exact Repair ID, immediate parent implementation ID, bounded defect text, and return target in the body.",
    ...revisionLines,
    "",
    "Required body-only Markdown sections:",
    ...requiredIssueRepairContractSections.map((section) => `- ## ${section}`),
    "",
    "Write only the Markdown body of the existing application-controlled Repair draft. Use this exact artifact_toolbox.replace_markdown_body invocation shape:",
    "",
    "```json",
    ...buildReplaceMarkdownBodyJsonBlock(workspaceRoot, {
      relativePath: submission.temporaryDraftPath,
      submissionId: submission.submissionId,
      expectedMetadataSha256: submission.metadataSha256!,
      expectedBodySha256: submission.bodySha256!,
      bodyPlaceholder: "<complete Issue Repair contract body-only Markdown>",
    }),
    "```",
    "",
    "Application metadata is immutable. Do not use whole-file writes or patches. Copy a refreshed handoff for current concurrency tokens after any body change. ChampCity validates and promotes the final Issue-owned Repair contract.",
    `Bound workspaceId reminder: ${binding.workspaceId}`,
  ].join("\n");
}

function sourceRevisionsEqual(
  actual: CanonicalDocumentMetadata["sourceRevisions"],
  expected: CanonicalDocumentMetadata["sourceRevisions"],
): boolean {
  return actual.length === expected.length && actual.every((source, index) =>
    source.path === expected[index].path && source.revision === expected[index].revision
  );
}

function issueValidationRecordPath(issueId: string, attemptNumber: number): string {
  return normalizeRelativePath(path.join(
    "issues",
    issueId,
    "Validation_Records",
    `ISSUE_VALIDATION_RECORD_${issueId}_ATTEMPT${String(attemptNumber).padStart(2, "0")}.md`,
  ));
}

function issueCloseRecordPath(issueId: string): string {
  return normalizeRelativePath(path.join(
    "issues",
    issueId,
    "Close_Records",
    `ISSUE_CLOSE_RECORD_${issueId}.md`,
  ));
}

function readIssueCloseRecord(
  workspaceRoot: string,
  issueId: string,
  readContext?: IssueProjectionReadContext,
): IssueCloseReadResult {
  const closePath = issueCloseRecordPath(issueId);
  const document = readCanonicalIssueDocument(workspaceRoot, closePath, readContext);
  return {
    ...document,
    path: closePath,
    validationBasisSha256: document.metadata
      ? issueCloseValidationBasisSha256(document.metadata.workflowData)
      : undefined,
  };
}

function requireIssueCloseEvidence(
  workspaceRoot: string,
  issue: IssueRecordProjection,
  readContext?: IssueProjectionReadContext,
): IssueCloseEvidence {
  const planning = getIssuePlanningProjectionWithoutAutoPromotion(workspaceRoot, issue.issueId, readContext);
  const aggregateEvidence = requireAggregateIssueValidationEvidence(workspaceRoot, issue, planning, readContext);
  const validationScan = scanAggregateIssueValidationRecords(workspaceRoot, issue.issueId, aggregateEvidence, readContext);
  if (validationScan.errors.length > 0) {
    throw new Error(`Issue Validation records need attention: ${validationScan.errors.join("; ")}`);
  }
  const currentValidationRecord = resolveCurrentAggregateIssueValidationRecord(
    workspaceRoot,
    aggregateEvidence,
    validationScan,
  );
  if (
    !currentValidationRecord ||
    currentValidationRecord.disposition !== "Approved" ||
    currentValidationRecord.decision !== "ValidateResolved"
  ) {
    throw new Error("Issue Close requires exact current Approved aggregate Issue Validation with decision ValidateResolved.");
  }
  if (
    issue.recordState !== "readable" ||
    !issue.bodyMarkdown ||
    currentValidationRecord.evidence.sourceEvidence.length === 0 ||
    currentValidationRecord.evidence.sourceEvidence.some((source) => source.state !== "readable" || !source.bodyMarkdown) ||
    currentValidationRecord.evidence.completedFixCards.length === 0
  ) {
    throw new Error("Issue Close requires every displayed Issue, planning, completed Fix Card, and validation basis source to remain readable and current.");
  }

  const sourceEvidence: IssueValidationSourceEvidence[] = [
    ...currentValidationRecord.evidence.sourceEvidence,
    {
      label: "Approved Aggregate Issue Validation",
      path: currentValidationRecord.recordPath,
      revision: currentValidationRecord.recordRevision,
      sha256: currentValidationRecord.recordSha256,
      state: "readable",
      bodyMarkdown: currentValidationRecord.recordMarkdown,
    },
  ];
  const sourceRevisions = sourceEvidence.map(({ path: sourcePath, revision }) => ({
    path: sourcePath,
    revision,
  }));
  const sourceFingerprints = sourceEvidence.map(({ path: sourcePath, sha256 }) => ({
    path: sourcePath,
    sha256,
  }));
  const validationBasis: IssueCloseValidationBasis = {
    recordPath: currentValidationRecord.recordPath,
    recordRevision: currentValidationRecord.recordRevision,
    recordMarkdown: currentValidationRecord.recordMarkdown,
    recordSha256: currentValidationRecord.recordSha256,
    attemptNumber: currentValidationRecord.attemptNumber,
    disposition: "Approved",
    decision: "ValidateResolved",
    operatorNotes: currentValidationRecord.operatorNotes,
    aggregateEvidenceSha256: currentValidationRecord.aggregateEvidenceSha256,
  };
  const validationBasisSha256 = crypto.createHash("sha256").update(JSON.stringify({
    issueId: issue.issueId,
    sourceRevisions,
    sourceFingerprints,
    validationAttemptNumber: validationBasis.attemptNumber,
    validationDecision: validationBasis.decision,
  })).digest("hex");
  return {
    sourceEvidence,
    sourceRevisions,
    sourceFingerprints,
    completedFixCards: currentValidationRecord.evidence.completedFixCards,
    validationBasis,
    validationBasisSha256,
  };
}

function issueCloseMetadata(
  issue: IssueRecordProjection,
  evidence: IssueCloseEvidence,
): CanonicalDocumentMetadata {
  return {
    schemaVersion: 1,
    artifactType: "issue-close-record",
    artifactRevision: 1,
    participationRole: "gatingReview",
    identity: {
      issueId: issue.issueId,
    },
    sourceRevisions: evidence.sourceRevisions,
    workflowData: {
      ownerKind: "issue",
      issueId: issue.issueId,
      stageId: "issue-close",
      closureState: "Closed",
      validationBasisSha256: evidence.validationBasisSha256,
      sourceFingerprints: evidence.sourceFingerprints,
      validationRecordPath: evidence.validationBasis.recordPath,
      validationAttemptNumber: evidence.validationBasis.attemptNumber,
      validationDecision: evidence.validationBasis.decision,
      completedFixCards: evidence.completedFixCards,
      returnTarget: "workflow-hub",
    },
    documentDisposition: {
      status: "Approved",
      notes: "Operator closed the Issue from exact current Approved aggregate Issue Validation basis.",
      reviewedAt: new Date().toISOString(),
    },
  };
}

function issueCloseBody(
  issue: IssueRecordProjection,
  evidence: IssueCloseEvidence,
): string {
  const originalProblem = extractMarkdownSection(issue.bodyMarkdown ?? "", "Issue") ?? issue.bodyMarkdown ?? "Unavailable";
  const validation = evidence.validationBasis;
  return [
    `# ${issue.issueId} - Issue Close Record`,
    "",
    "## Issue Identity and Title",
    `${issue.issueId}: ${issue.title}`,
    "",
    "## Original Issue Problem",
    originalProblem,
    "",
    "## Completed Fix Card Summary",
    ...evidence.completedFixCards.flatMap((entry) => [
      `- ${entry.fixCardId} | order ${entry.order} | ${entry.title}`,
      `  - Close record: ${entry.closeRecordPath}`,
      `  - Origin: ${entry.closeRecordOrigin}`,
      `  - Current implementation evidence: ${entry.currentImplementationId}${entry.repairId ? ` (${entry.repairId})` : ""}`,
    ]),
    "",
    "## Approved Aggregate Issue Validation",
    `- Result: ${validation.decision}`,
    `- Disposition: ${validation.disposition}`,
    `- Attempt: ${validation.attemptNumber}`,
    `- Record: ${validation.recordPath}`,
    `- Operator notes: ${validation.operatorNotes ?? "No additional Operator notes."}`,
    "",
    "## Exact Closure Source Evidence",
    ...evidence.sourceRevisions.map((source, index) =>
      `- ${source.path} @ revision ${source.revision} | sha256 ${evidence.sourceFingerprints[index]?.sha256}`
    ),
    "",
    "## Closure Result",
    "Closed",
    "",
    "## Lifecycle Boundary",
    "This is the final Issue-level close record only. It does not close, advance, reset, reinterpret, snapshot, restore, or otherwise alter Development Phase or Work Card state. Return to the Workflow Hub; any later Development entry must use the existing repository resolver.",
    "",
  ].join("\n");
}

function validateIssueCloseRecord(
  issue: IssueRecordProjection,
  relativePath: string,
  metadata: CanonicalDocumentMetadata,
  bodyMarkdown: string,
  evidence: IssueCloseEvidence,
): void {
  const identityKeys = Object.keys(metadata.identity);
  const forbiddenWorkflowKeys = [
    "phaseId",
    "workCardId",
    "parentWorkCardId",
    "fixCardId",
    "rootFixCardId",
    "repairId",
    "parentImplementationId",
  ];
  if (
    relativePath !== issueCloseRecordPath(issue.issueId) ||
    metadata.artifactType !== "issue-close-record" ||
    metadata.artifactRevision !== 1 ||
    metadata.participationRole !== "gatingReview" ||
    identityKeys.length !== 1 ||
    identityKeys[0] !== "issueId" ||
    metadata.identity.issueId !== issue.issueId ||
    metadata.workflowData.ownerKind !== "issue" ||
    metadata.workflowData.issueId !== issue.issueId ||
    metadata.workflowData.stageId !== "issue-close" ||
    metadata.workflowData.closureState !== "Closed" ||
    metadata.workflowData.returnTarget !== "workflow-hub" ||
    forbiddenWorkflowKeys.some((key) => metadata.workflowData[key] !== undefined)
  ) {
    throw new Error("Issue close metadata identity, owner, stage, terminal state, or hierarchy boundary is invalid.");
  }
  if (
    metadata.documentDisposition.status !== "Approved" ||
    !metadata.documentDisposition.reviewedAt ||
    metadata.workflowData.validationRecordPath !== evidence.validationBasis.recordPath ||
    metadata.workflowData.validationAttemptNumber !== evidence.validationBasis.attemptNumber ||
    metadata.workflowData.validationDecision !== "ValidateResolved" ||
    issueCloseValidationBasisSha256(metadata.workflowData) !== evidence.validationBasisSha256
  ) {
    throw new Error("Issue close disposition or Approved aggregate validation binding is invalid.");
  }
  if (!sourceRevisionsEqual(metadata.sourceRevisions, evidence.sourceRevisions)) {
    throw new Error("Issue close source revisions are stale or conflicting.");
  }
  const fingerprints = aggregateIssueValidationSourceFingerprints(metadata.workflowData.sourceFingerprints);
  if (!sourceFingerprintsEqual(fingerprints, evidence.sourceFingerprints)) {
    throw new Error("Issue close source fingerprints are stale or conflicting.");
  }
  if (JSON.stringify(metadata.workflowData.completedFixCards) !== JSON.stringify(evidence.completedFixCards)) {
    throw new Error("Issue close completed Fix Card evidence is incomplete or conflicting.");
  }
  for (const requiredSection of [
    "Issue Identity and Title",
    "Original Issue Problem",
    "Completed Fix Card Summary",
    "Approved Aggregate Issue Validation",
    "Closure Result",
    "Lifecycle Boundary",
  ]) {
    if (!extractMarkdownSection(bodyMarkdown, requiredSection)) {
      throw new Error(`Issue close body is missing required section: ${requiredSection}.`);
    }
  }
  if (!extractCanonicalOrLegacySection(
    bodyMarkdown,
    "Exact Closure Source Evidence",
    legacyExactClosureSourceEvidenceHeading,
  )) {
    throw new Error("Issue close body is missing required section: Exact Closure Source Evidence.");
  }
}

function requireAggregateIssueValidationEvidence(
  workspaceRoot: string,
  issue: IssueRecordProjection,
  planning: IssuePlanningProjection,
  readContext?: IssueProjectionReadContext,
): AggregateIssueValidationEvidence {
  if (issue.recordState !== "readable" || !issue.bodyMarkdown) {
    throw new Error(issue.readError ?? "Aggregate Issue Validation requires a readable ISSUE_RECORD.md.");
  }
  if (!planning.architectPlanningEligible) {
    throw new Error("Aggregate Issue Validation requires current Approved Architect Planning.");
  }
  if (planning.operatorDisposition !== "Approved") {
    throw new Error("Aggregate Issue Validation requires the current Issue Planning bundle to retain its Approved review record.");
  }
  if (
    planning.issueResolutionPlanState !== "readable" ||
    planning.fixCardPlanState !== "readable" ||
    planning.reviewState !== "readable" ||
    planning.architectInvestigationState !== "readable" ||
    planning.architectReviewState !== "readable"
  ) {
    throw new Error("Aggregate Issue Validation requires every governing Issue, Architect, and Issue Planning source to be readable.");
  }
  if (planning.fixCardPlanValidationFindings.length > 0 || planning.fixCardCandidates.length === 0) {
    throw new Error("Aggregate Issue Validation requires a valid current Fix Card Plan with at least one candidate.");
  }
  const completedFixCards = completedFixCardSummaries(workspaceRoot, issue, planning.fixCardCandidates, readContext);
  if (completedFixCards.length !== planning.fixCardCandidates.length) {
    const completeIds = new Set(completedFixCards.map((entry) => entry.fixCardId));
    const incomplete = planning.fixCardCandidates
      .filter((candidate) => !completeIds.has(candidate.fixCardId))
      .map((candidate) => candidate.fixCardId);
    throw new Error(`Issue Validation requires valid close record for every current Fix Card Plan candidate. Incomplete or invalid: ${incomplete.join(", ")}.`);
  }
  const routedPlan = readRoutedIssueExecutionPlan(workspaceRoot, issue.issueId);
  const execution = routedPlan ? deriveIssueCorrectionExecution(workspaceRoot, issue, planning, readContext).execution : undefined;
  if (execution && !execution.phasesComplete) throw Error("Aggregate Issue Validation requires current acceptance of every correction Phase.");
  const baseSources = [
    { label: "Original Issue", path: issue.recordPath },
    { label: "Accepted Architect Investigation", path: planning.architectInvestigationPath },
    { label: "Accepted Architect Review", path: planning.architectReviewPath },
    { label: "Current Issue Resolution Plan", path: planning.issueResolutionPlanPath },
    { label: "Current Fix Card Plan", path: planning.fixCardPlanPath },
    { label: "Current Approved Issue Planning Review", path: planning.reviewPath },
    ...(routedPlan?.structure.topology === "phased" ? routedPlan.structure.phases.map((phase) => ({ label: `Accepted correction Phase ${phase.phaseId}`, path: issuePhaseAcceptancePath(issue.issueId, phase.phaseId) })) : []),
  ].filter((source, index, sources) => sources.findIndex((entry) => entry.path === source.path) === index);
  const sourceEvidence: IssueValidationSourceEvidence[] = baseSources.map((source) => {
    const read = readOptionalMarkdownFile(workspaceRoot, source.path, source.label, readContext);
    if (read.state !== "readable") {
      throw new Error(read.readError ?? `${source.label} is not readable.`);
    }
    return {
      ...source,
      revision: currentArtifactRevisionFromMarkdown(read.bodyMarkdown ?? ""),
      sha256: sha256ForMarkdown(read.bodyMarkdown ?? ""),
      state: "readable" as const,
      bodyMarkdown: read.bodyMarkdown,
    };
  });
  for (const summary of completedFixCards) {
    const read = readOptionalMarkdownFile(workspaceRoot, summary.closeRecordPath, `${summary.fixCardId} close record`, readContext);
    if (read.state !== "readable") {
      throw new Error(read.readError ?? `${summary.fixCardId} close record is unreadable.`);
    }
    sourceEvidence.push({
      label: `${summary.fixCardId} Close Record`,
      path: summary.closeRecordPath,
      revision: summary.closeRecordRevision,
      sha256: sha256ForMarkdown(read.bodyMarkdown ?? ""),
      state: "readable",
      bodyMarkdown: read.bodyMarkdown,
    });
  }
  return {
    sourceEvidence,
    sourceRevisions: sourceEvidence.map(({ path: sourcePath, revision }) => ({ path: sourcePath, revision })),
    sourceFingerprints: sourceEvidence.map(({ path: sourcePath, sha256 }) => ({ path: sourcePath, sha256 })),
    completedFixCards,
  };
}

function completedFixCardSummaries(
  workspaceRoot: string,
  issue: IssueRecordProjection,
  candidates: IssueFixCardPlanCandidate[],
  readContext?: IssueProjectionReadContext,
): IssueValidationCompletedFixCardSummary[] {
  const summaries: IssueValidationCompletedFixCardSummary[] = [];
  for (const candidate of [...candidates].sort((left, right) => left.order - right.order)) {
    const close = readIssueFixCardCloseRecord(workspaceRoot, issue, candidate, readContext);
    if (!close.valid || !close.origin || !close.currentImplementationId || !close.revision) {
      continue;
    }
    summaries.push({
      fixCardId: candidate.fixCardId,
      order: candidate.order,
      title: candidate.title,
      closeRecordPath: close.path,
      closeRecordOrigin: close.origin,
      closeRecordRevision: close.revision,
      currentImplementationId: close.currentImplementationId,
      repairId: close.repairId,
      reason: close.reason,
    });
  }
  return summaries;
}

function aggregateIssueValidationMetadata(
  issue: IssueRecordProjection,
  evidence: AggregateIssueValidationEvidence,
  attemptNumber: number,
  decision: IssueValidationDecision,
  disposition: "Approved" | "RevisionRequested",
  operatorNotes: string,
  boundedCorrectiveWork: string,
): CanonicalDocumentMetadata {
  return {
    schemaVersion: 1,
    artifactType: "issue-validation-record",
    artifactRevision: 1,
    participationRole: "gatingReview",
    identity: {
      issueId: issue.issueId,
      validationAttemptNumber: attemptNumber,
    },
    sourceRevisions: evidence.sourceRevisions,
    workflowData: {
      ownerKind: "issue",
      issueId: issue.issueId,
      stageId: "issue-validation",
      decision,
      returnTarget: decision === "ValidateResolved" ? "issue-validation" : "issue-planning",
      operatorNotes,
      ...(boundedCorrectiveWork ? { boundedCorrectiveWork } : {}),
      sourceFingerprints: evidence.sourceFingerprints,
      completedFixCards: evidence.completedFixCards,
    },
    documentDisposition: {
      status: disposition,
      notes: decision === "ValidateResolved"
        ? "Operator validated the original Issue as resolved by the exact aggregate evidence set."
        : "Operator requested bounded corrective Issue Planning work from the exact aggregate evidence set.",
      reviewedAt: new Date().toISOString(),
    },
  };
}

function aggregateIssueValidationEvidenceSha256(evidence: AggregateIssueValidationEvidence): string {
  return crypto.createHash("sha256").update(JSON.stringify({
    sourceRevisions: evidence.sourceRevisions,
    sourceFingerprints: evidence.sourceFingerprints,
  })).digest("hex");
}

function aggregateIssueValidationBody(
  issue: IssueRecordProjection,
  evidence: AggregateIssueValidationEvidence,
  attemptNumber: number,
  decision: IssueValidationDecision,
  operatorNotes: string,
  boundedCorrectiveWork: string,
): string {
  const originalProblem = extractMarkdownSection(issue.bodyMarkdown ?? "", "Issue") ?? issue.bodyMarkdown ?? "Unavailable";
  return [
    `# ${issue.issueId} - Issue Validation Record - Attempt ${String(attemptNumber).padStart(2, "0")}`,
    "",
    "## Issue Identity and Title",
    `${issue.issueId}: ${issue.title}`,
    "",
    "## Original Problem Being Validated",
    originalProblem,
    "",
    "## Aggregate Result",
    decision,
    "",
    "## Operator Notes",
    operatorNotes || "No additional Operator notes.",
    ...(decision === "RequestCorrectiveWork"
      ? ["", "## Bounded Corrective Work", boundedCorrectiveWork]
      : []),
    "",
    "## Completed Fix Card Close Records",
    ...evidence.completedFixCards.flatMap((entry) => [
      `- ${entry.fixCardId} | order ${entry.order} | ${entry.title}`,
      `  - Close record: ${entry.closeRecordPath}`,
      `  - Origin: ${entry.closeRecordOrigin}`,
      `  - Current implementation: ${entry.currentImplementationId}${entry.repairId ? ` (${entry.repairId})` : ""}`,
    ]),
    "",
    "## Exact Aggregate Source Revisions",
    ...evidence.sourceRevisions.map((source) => `- ${source.path} @ revision ${source.revision}`),
    "",
    "## Lifecycle Boundary",
    decision === "ValidateResolved"
      ? "Issue Validation is complete for this exact evidence. Issue Close remains a separate later action and was not executed."
      : "Return to Issue Planning for additive bounded corrective Fix Cards. This result does not create Repair parentage or reopen closed Fix Cards.",
    "",
  ].join("\n");
}

function scanAggregateIssueValidationRecords(
  workspaceRoot: string,
  issueId: string,
  evidence?: AggregateIssueValidationEvidence,
  readContext?: IssueProjectionReadContext,
): AggregateIssueValidationScan {
  const directory = containedPath(workspaceRoot, path.join("issues", issueId, "Validation_Records"));
  if (!fs.existsSync(directory)) {
    return { nextAttemptNumber: 1, errors: [] };
  }
  const filenamePattern = /^ISSUE_VALIDATION_RECORD_(ISSUE_\d+)_ATTEMPT(\d+)\.md$/;
  const records: Array<AggregateIssueValidationReadResult & { sortAttempt: number }> = [];
  const errors: string[] = [];
  const seenAttempts = new Set<number>();
  let highestAttempt = 0;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.startsWith("ISSUE_VALIDATION_RECORD_")) {
      continue;
    }
    const match = filenamePattern.exec(entry.name);
    const relativePath = normalizeRelativePath(path.join("issues", issueId, "Validation_Records", entry.name));
    if (!match || match[1] !== issueId) {
      errors.push(`${relativePath} has a malformed or wrong-Issue aggregate validation filename.`);
      records.push({ state: "read-error", path: relativePath, readError: errors.at(-1), sortAttempt: 0 });
      continue;
    }
    const attemptNumber = Number(match[2]);
    highestAttempt = Math.max(highestAttempt, attemptNumber);
    if (!Number.isInteger(attemptNumber) || attemptNumber < 1) {
      errors.push(`${relativePath} has an invalid aggregate validation attempt number.`);
      records.push({ state: "read-error", path: relativePath, readError: errors.at(-1), sortAttempt: attemptNumber });
      continue;
    }
    if (seenAttempts.has(attemptNumber)) {
      errors.push(`Multiple Issue Validation records claim attempt ${attemptNumber}.`);
    }
    seenAttempts.add(attemptNumber);
    const document = readCanonicalIssueDocument(workspaceRoot, relativePath, readContext);
    if (document.state !== "readable" || !document.metadata) {
      const message = document.readError ?? `${relativePath} is not readable canonical Markdown.`;
      errors.push(message);
      records.push({ state: "read-error", path: relativePath, readError: message, attemptNumber, sortAttempt: attemptNumber });
      continue;
    }
    try {
      const parsed = validateAggregateIssueValidationRecord(
        issueId,
        attemptNumber,
        relativePath,
        document.metadata,
        document.bodyMarkdown ?? "",
      );
      records.push({
        state: "readable",
        path: relativePath,
        bodyMarkdown: document.bodyMarkdown,
        metadata: document.metadata,
        attemptNumber,
        decision: parsed.decision,
        operatorNotes: parsed.operatorNotes,
        boundedCorrectiveWork: parsed.boundedCorrectiveWork,
        sortAttempt: attemptNumber,
      });
    } catch (error) {
      const message = `${relativePath}: ${errorMessage(error)}`;
      errors.push(message);
      records.push({
        state: "read-error",
        path: relativePath,
        bodyMarkdown: document.bodyMarkdown,
        metadata: document.metadata,
        attemptNumber,
        readError: message,
        sortAttempt: attemptNumber,
      });
    }
  }
  records.sort((left, right) => right.sortAttempt - left.sortAttempt || String(right.path).localeCompare(String(left.path)));
  const readable = records.filter((record): record is AggregateIssueValidationReadResult & {
    path: string;
    metadata: CanonicalDocumentMetadata;
    sortAttempt: number;
  } => record.state === "readable" && Boolean(record.path && record.metadata));
  const currentMatches = evidence
    ? readable.filter((record) =>
        sourceRevisionsEqual(record.metadata.sourceRevisions, evidence.sourceRevisions) &&
        sourceFingerprintsEqual(
          aggregateIssueValidationSourceFingerprints(record.metadata.workflowData.sourceFingerprints),
          evidence.sourceFingerprints,
        )
      )
    : [];
  if (currentMatches.length > 1) {
    errors.push("Multiple Issue Validation records claim the same exact current aggregate evidence set.");
  }
  return {
    current: currentMatches.length === 1 ? currentMatches[0] : undefined,
    latest: records[0],
    nextAttemptNumber: highestAttempt + 1,
    errors,
  };
}

function resolveCurrentAggregateIssueValidationRecord(
  workspaceRoot: string,
  evidence: AggregateIssueValidationEvidence,
  scan: AggregateIssueValidationScan,
): CurrentAggregateIssueValidationRecord | undefined {
  if (scan.errors.length > 0 || !scan.current) {
    return undefined;
  }
  const record = scan.current;
  if (
    record.state !== "readable" ||
    !record.path ||
    !record.metadata ||
    !record.bodyMarkdown ||
    !record.attemptNumber ||
    !record.decision
  ) {
    return undefined;
  }
  return {
    evidence,
    recordPath: record.path,
    recordRevision: record.metadata.artifactRevision,
    recordMarkdown: record.bodyMarkdown,
    recordSha256: sha256ForRelativePath(workspaceRoot, record.path),
    attemptNumber: record.attemptNumber,
    disposition: record.metadata.documentDisposition.status,
    decision: record.decision,
    operatorNotes: record.operatorNotes || undefined,
    boundedCorrectiveWork: record.boundedCorrectiveWork,
    aggregateEvidenceSha256: aggregateIssueValidationEvidenceSha256(evidence),
  };
}

function validateAggregateIssueValidationRecord(
  issueId: string,
  attemptNumber: number,
  relativePath: string,
  metadata: CanonicalDocumentMetadata,
  bodyMarkdown: string,
): { decision: IssueValidationDecision; operatorNotes: string; boundedCorrectiveWork?: string } {
  const decision = stringMetadataValue(metadata.workflowData.decision) as IssueValidationDecision | undefined;
  const returnTarget = stringMetadataValue(metadata.workflowData.returnTarget);
  const validationAttemptNumber = numberMetadataValue(metadata.identity.validationAttemptNumber);
  if (
    metadata.artifactType !== "issue-validation-record" ||
    metadata.participationRole !== "gatingReview" ||
    metadata.identity.issueId !== issueId ||
    validationAttemptNumber !== attemptNumber ||
    metadata.workflowData.ownerKind !== "issue" ||
    metadata.workflowData.issueId !== issueId ||
    metadata.workflowData.stageId !== "issue-validation" ||
    Boolean(metadata.identity.fixCardId) ||
    Boolean(metadata.identity.repairId) ||
    Boolean(metadata.identity.phaseId) ||
    Boolean(metadata.identity.workCardId) ||
    Boolean(metadata.identity.parentWorkCardId)
  ) {
    throw new Error("Issue Validation metadata identity, owner, stage, or attempt does not match its canonical path.");
  }
  if (decision !== "ValidateResolved" && decision !== "RequestCorrectiveWork") {
    throw new Error("Issue Validation decision is invalid.");
  }
  const expectedDisposition = decision === "ValidateResolved" ? "Approved" : "RevisionRequested";
  const expectedReturnTarget = decision === "ValidateResolved" ? "issue-validation" : "issue-planning";
  if (
    metadata.documentDisposition.status !== expectedDisposition ||
    returnTarget !== expectedReturnTarget ||
    !metadata.documentDisposition.reviewedAt
  ) {
    throw new Error("Issue Validation disposition or return target conflicts with its decision.");
  }
  const paths = issuePlanningPaths(issueId);
  const requiredPrefix = [
    normalizeRelativePath(path.join("issues", issueId, "ISSUE_RECORD.md")),
    paths.architectInvestigationPath,
    paths.architectReviewPath,
    paths.issueResolutionPlanPath,
    paths.fixCardPlanPath,
    paths.planningReviewPath,
  ];
  const routedPlanPath = metadata.sourceRevisions[3]?.path ?? "";
  if (/^planning\/work-intake\/planning\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\/PLAN\.md$/.test(routedPlanPath)) {
    requiredPrefix.splice(3, 3, routedPlanPath, `issues/${issueId}/EXECUTION_PLAN.md`);
    for (const source of metadata.sourceRevisions.slice(5)) {
      if (!new RegExp(`^issues/${escapeRegex(issueId)}/Phase_Acceptance/[A-Za-z0-9][A-Za-z0-9_-]{0,79}\\.md$`).test(source.path)) break;
      requiredPrefix.push(source.path);
    }
  }
  if (
    metadata.sourceRevisions.length <= requiredPrefix.length ||
    requiredPrefix.some((sourcePath, index) => metadata.sourceRevisions[index]?.path !== sourcePath)
  ) {
    throw new Error("Issue Validation source revisions are incomplete or not in canonical aggregate order.");
  }
  const closePaths = metadata.sourceRevisions.slice(requiredPrefix.length).map((source) => source.path);
  if (
    new Set(metadata.sourceRevisions.map((source) => source.path)).size !== metadata.sourceRevisions.length ||
    closePaths.some((sourcePath) => !new RegExp(`^issues/${escapeRegex(issueId)}/Close_Records/FIX_CARD_CLOSE_RECORD_${escapeRegex(issueId)}-FC\\d+\\.md$`).test(sourcePath))
  ) {
    throw new Error("Issue Validation close-record sources are duplicated or malformed.");
  }
  const fingerprints = aggregateIssueValidationSourceFingerprints(metadata.workflowData.sourceFingerprints);
  if (
    fingerprints.length !== metadata.sourceRevisions.length ||
    fingerprints.some((entry, index) => entry.path !== metadata.sourceRevisions[index]?.path)
  ) {
    throw new Error("Issue Validation source fingerprints do not match its exact source revisions.");
  }
  if (!Array.isArray(metadata.workflowData.completedFixCards) || metadata.workflowData.completedFixCards.length !== closePaths.length) {
    throw new Error("Issue Validation completed Fix Card summary is incomplete.");
  }
  const boundedCorrectiveWork = stringMetadataValue(metadata.workflowData.boundedCorrectiveWork);
  if (decision === "RequestCorrectiveWork" && !isSubstantiveBoundedCorrectiveWork(boundedCorrectiveWork ?? "")) {
    throw new Error("RevisionRequested Issue Validation is missing substantive bounded corrective work.");
  }
  if (
    !extractMarkdownSection(bodyMarkdown, "Original Problem Being Validated") ||
    !extractMarkdownSection(bodyMarkdown, "Aggregate Result") ||
    !extractCanonicalOrLegacySection(
      bodyMarkdown,
      "Completed Fix Card Close Records",
      legacyCompletedFixCardCloseRecordsHeading,
    )
  ) {
    throw new Error("Issue Validation body is missing required aggregate evidence sections.");
  }
  return {
    decision,
    operatorNotes: stringMetadataValue(metadata.workflowData.operatorNotes) ?? "",
    boundedCorrectiveWork,
  };
}

function aggregateIssueValidationSourceFingerprints(value: unknown): Array<{ path: string; sha256: string }> {
  if (!Array.isArray(value)) {
    throw new Error("Issue Validation source fingerprints are missing.");
  }
  return value.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error("Issue Validation source fingerprint entry is invalid.");
    }
    const record = entry as Record<string, unknown>;
    const sourcePath = stringMetadataValue(record.path);
    const sha256 = stringMetadataValue(record.sha256);
    if (!sourcePath || !sha256 || !/^[a-f0-9]{64}$/.test(sha256)) {
      throw new Error("Issue Validation source fingerprint entry is invalid.");
    }
    return { path: sourcePath, sha256 };
  });
}

function isSubstantiveBoundedCorrectiveWork(value: string): boolean {
  return value.trim().length >= 30 && value.trim().split(/\s+/).length >= 5;
}

function sourceFingerprintsEqual(
  actual: Array<{ path: string; sha256: string }>,
  expected: Array<{ path: string; sha256: string }>,
): boolean {
  return actual.length === expected.length && actual.every((entry, index) =>
    entry.path === expected[index]?.path && entry.sha256 === expected[index]?.sha256
  );
}

function currentIssueValidationRevisionSource(
  workspaceRoot: string,
  issue: IssueRecordProjection,
  planning: IssuePlanningProjection,
  readContext?: IssueProjectionReadContext,
): (AggregateIssueValidationReadResult & { path: string; metadata: CanonicalDocumentMetadata }) | undefined {
  try {
    const evidence = requireAggregateIssueValidationEvidence(workspaceRoot, issue, planning, readContext);
    const scan = scanAggregateIssueValidationRecords(workspaceRoot, issue.issueId, evidence, readContext);
    return scan.errors.length === 0 &&
      scan.current?.decision === "RequestCorrectiveWork" &&
      scan.current.metadata.documentDisposition.status === "RevisionRequested"
      ? scan.current
      : undefined;
  } catch {
    return undefined;
  }
}

function withIssueValidationRevisionSource(
  workspaceRoot: string,
  projection: IssuePlanningProjection,
  readContext?: IssueProjectionReadContext,
): IssuePlanningProjection {
  const issue = resolveIssueRecordProjection(workspaceRoot, projection.issueId, readContext);
  if (!issue || projection.operatorDisposition !== "Approved") {
    return projection;
  }
  const record = currentIssueValidationRevisionSource(workspaceRoot, issue, projection, readContext);
  if (!record) {
    return projection;
  }
  const hasActiveHandoff = Boolean(projection.activeSubmission) && (
    projection.status === "handoff-prepared" || projection.status === "waiting-for-drafts"
  );
  const status: IssuePlanningStatus = hasActiveHandoff ? projection.status : "revision-requested";
  const statusMessage = hasActiveHandoff
    ? projection.statusMessage
    : "The Operator's RevisionRequested disposition in aggregate Issue Validation makes additive corrective Issue Planning eligible. Preserve closed candidates and add bounded corrective Fix Cards.";
  return {
    ...projection,
    status,
    statusMessage,
    fixCardsEligible: false,
    canPrepareHandoff: hasActiveHandoff ? projection.canPrepareHandoff : true,
    canCopyHandoff: hasActiveHandoff ? projection.canCopyHandoff : false,
    canApplyReview: false,
    revisionSource: "issue-validation",
    issueValidationRevisionRecordPath: record.path,
    issueValidationRevisionRecordMarkdown: record.bodyMarkdown,
    issueValidationBoundedCorrectiveWork: record.boundedCorrectiveWork,
    workflowStatus: {
      ...projection.workflowStatus,
      state: status,
      stateLabel: stateLabelForIssuePlanningStatus(status),
      reason: statusMessage,
      fixCardsEligible: false,
    },
  };
}

function assertCorrectivePlanningRevisionPreservesClosedCandidates(
  workspaceRoot: string,
  issue: IssueRecordProjection,
  currentProjection: IssuePlanningProjection,
  nextCandidates: IssueFixCardPlanCandidate[],
): void {
  requireAggregateIssueValidationEvidence(workspaceRoot, issue, currentProjection);
  const currentCandidates = currentProjection.fixCardCandidates;
  if (nextCandidates.length <= currentCandidates.length) {
    throw new Error("Corrective Issue Planning must preserve every closed candidate and add at least one new bounded Fix Card candidate.");
  }
  for (let index = 0; index < currentCandidates.length; index += 1) {
    const current = currentCandidates[index];
    const next = nextCandidates[index];
    const currentIdentity = {
      fixCardId: current.fixCardId,
      order: current.order,
      title: current.title,
      purpose: current.purpose,
      dependsOn: current.dependsOn,
      evidencePaths: current.evidencePaths,
    };
    const nextIdentity = next && {
      fixCardId: next.fixCardId,
      order: next.order,
      title: next.title,
      purpose: next.purpose,
      dependsOn: next.dependsOn,
      evidencePaths: next.evidencePaths,
    };
    if (JSON.stringify(currentIdentity) !== JSON.stringify(nextIdentity)) {
      throw new Error(`Corrective Issue Planning cannot remove, renumber, retitle, repurpose, or rewrite dependency/evidence meaning for closed candidate ${current.fixCardId}.`);
    }
  }
}

function stateLabelForIssueValidationStatus(status: IssueValidationStatus): string {
  switch (status) {
    case "blocked-no-issue":
      return "No Issue Selected";
    case "blocked-unreadable-evidence":
      return "Evidence Unreadable";
    case "blocked-planning-not-approved":
      return "Planning Not Approved";
    case "blocked-fix-cards-incomplete":
      return "Fix Cards Incomplete";
    case "eligible":
      return "Eligible";
    case "approved":
      return "Approved";
    case "revision-requested":
      return "Revision Requested";
    case "needs-attention":
      return "Needs Attention";
  }
}

function stateLabelForIssueCloseStatus(status: IssueCloseStatus): string {
  switch (status) {
    case "blocked-no-issue":
      return "No Issue Selected";
    case "blocked-unreadable-evidence":
      return "Evidence Unreadable";
    case "blocked-validation-not-approved":
      return "Validation Not Approved";
    case "eligible":
      return "Ready to Close";
    case "closed":
      return "Closed";
    case "needs-attention":
      return "Needs Attention";
  }
}

function emptyIssueValidationProjection(): IssueValidationProjection {
  const status: IssueValidationStatus = "blocked-no-issue";
  const statusMessage = "Select a readable Issue before opening aggregate Issue Validation.";
  return {
    issueId: "",
    title: "No issue selected",
    status,
    statusMessage,
    eligible: false,
    sourceEvidence: [],
    completedFixCards: [],
    currentRecordState: "missing",
    nextAttemptNumber: 1,
    canValidateResolved: false,
    canRequestCorrectiveWork: false,
    workflowStatus: {
      issueId: "",
      stageId: "issue-validation",
      stageLabel: "Issue Validation",
      state: status,
      stateLabel: stateLabelForIssueValidationStatus(status),
      issuePlanningEligible: false,
      fixCardsEligible: false,
      reason: statusMessage,
    },
  };
}

function emptyIssueCloseProjection(): IssueCloseProjection {
  const status: IssueCloseStatus = "blocked-no-issue";
  const statusMessage = "Select an Issue with exact current Approved aggregate Issue Validation before opening Issue Close.";
  return {
    issueId: "",
    title: "No issue selected",
    status,
    statusMessage,
    eligible: false,
    issueRecordPath: "issues/ISSUE_NNN/ISSUE_RECORD.md",
    issueRecordState: "missing",
    sourceEvidence: [],
    completedFixCards: [],
    closeRecord: {
      path: "issues/ISSUE_NNN/Close_Records/ISSUE_CLOSE_RECORD_ISSUE_NNN.md",
      state: "missing",
    },
    canCloseIssue: false,
    workflowStatus: {
      issueId: "",
      stageId: "issue-close",
      stageLabel: "Issue Close",
      state: status,
      stateLabel: stateLabelForIssueCloseStatus(status),
      issuePlanningEligible: false,
      fixCardsEligible: false,
      reason: statusMessage,
    },
  };
}

function numberMetadataValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : undefined;
}

function buildIssueFixCardProjection(input: {
  context?: IssueFixCardContext;
  currentStep: IssueFixCardLoopStepId;
  issue: IssueRecordProjection;
  planning: IssuePlanningProjection;
  status?: IssueFixCardContractStatus;
  statusMessage?: string;
  workspaceRoot: string;
  readContext?: IssueProjectionReadContext;
}): IssueFixCardProjection {
  const context = input.context;
  const { candidates, execution } = deriveIssueCorrectionExecution(input.workspaceRoot, input.issue, input.planning, input.readContext);
  const candidate = context
    ? candidates.find((entry) => entry.fixCardId === context.candidate.fixCardId) ?? context.candidate
    : undefined;
  const allFixCardsClosed = candidates.length > 0 && candidates.every((entry) => entry.lifecycle?.state === "complete");
  const nextEligibleCandidate = candidates.find((entry) => entry.lifecycle?.state === "eligible");
  if (!context) {
    const status = input.status ?? "candidate-selection-required";
    const statusMessage = input.statusMessage ?? "Select a current Fix Card candidate.";
    const currentStep = "fix-card-map";
    return {
      execution,
      issueId: input.issue.issueId,
      title: input.issue.title,
      candidates,
      currentStep,
      status,
      statusMessage,
      stepAvailability: issueFixCardStepAvailability({
        currentStep,
        mapAvailable: input.planning.fixCardsEligible,
        planningAvailable: false,
        implementAvailable: false,
        reviewValidationAvailable: false,
        repairAvailable: false,
        closeAvailable: false,
        reason: statusMessage,
      }),
      contractState: "missing",
      implementerReportState: "missing",
      implementerReportReadiness: "missing",
      implementerReportReadinessReason: "No Fix Card candidate selected.",
      architectReviewState: "missing",
      validationRecordState: "missing",
      closeRecord: {
        path: candidate
          ? issueFixCardCloseRecordPath(input.issue.issueId, candidate.fixCardId)
          : normalizeRelativePath(path.join("issues", input.issue.issueId, "Close_Records", "FIX_CARD_CLOSE_RECORD_<FIX_CARD_ID>.md")),
        state: "missing",
        reason: "Select an in-progress Fix Card to inspect close evidence.",
      },
      nextEligibleCandidate,
      allFixCardsClosed,
      canSelectCandidate: input.planning.fixCardsEligible,
      canPreparePlanningHandoff: false,
      canCopyPlanningHandoff: false,
      canApplyContractReview: false,
      canReserveImplementerReport: false,
      canRunImplementer: false,
      canCopyAdvisoryPrompt: false,
      canApplyValidationDecision: false,
      canRequestRepair: false,
      canPrepareRepairHandoff: false,
      canCopyRepairHandoff: false,
      canCloseFixCard: false,
    };
  }

  const selectedCandidate = candidates.find((entry) => entry.fixCardId === context.candidate.fixCardId) ?? context.candidate;
  return { ...buildIssueFixCardProjectionFromContext(input.currentStep, {
    ...context,
    candidate: selectedCandidate,
  }, candidates), execution };
}

function buildIssueFixCardProjectionFromContext(
  _requestedStep: IssueFixCardLoopStepId,
  context: IssueFixCardContext,
  candidates: IssueFixCardPlanCandidate[],
): IssueFixCardProjection {
  const workspaceRoot = contextWorkspaceRoot(context);
  const implementationKey = issueImplementationSubmissionKey(workspaceRoot, context.issue.issueId, context.implementationId);
  const planningSubmission = context.implementationKind === "root-fix-card"
    ? resolveCurrentFixCardPlanningSubmission(workspaceRoot, context)
    : undefined;
  const planningFailure = fixCardPlanningDraftFailures.get(
    fixCardSubmissionKey(workspaceRoot, context.issue.issueId, context.candidate.fixCardId),
  );
  const repairSubmission = resolveCurrentIssueRepairSubmission(workspaceRoot, context);
  const repairFailure = issueRepairAutoPromotionFailures.get(implementationKey);
  const finalContract = readCanonicalIssueDocument(workspaceRoot, context.contractPath, context.readContext);
  const controlledDraft = planningSubmission
    ? readCanonicalIssueDocument(workspaceRoot, planningSubmission.temporaryDraftPath, context.readContext)
    : undefined;
  const contract = controlledDraft ?? finalContract;
  const report = readCanonicalIssueDocument(workspaceRoot, context.implementerReportPath, context.readContext);
  const advisoryContext = resolveOptionalIssueFixCardAdvisoryContext(workspaceRoot, context);
  const contractMetadata = contract.state === "readable" ? contract.metadata : undefined;
  const finalContractMetadata = finalContract.state === "readable" ? finalContract.metadata : undefined;
  const reportMetadata = report.state === "readable" ? report.metadata : undefined;
  const reviewMetadata = advisoryContext.state === "readable" ? advisoryContext.metadata : undefined;
  const contractDisposition = contractMetadata
    ? contractMetadata.documentDisposition.status as DocumentDispositionStatus
    : undefined;
  const expectedContractType = planningSubmission
    ? "fix-card-draft"
    : context.implementationKind === "repair" ? "repair-work-card" : "fix-card";
  const contractBindingValid = Boolean(
    contractMetadata &&
    contractMetadata.artifactType === expectedContractType &&
    contractMetadata.participationRole === "gatingReview" &&
    contractMetadata.identity.issueId === context.issue.issueId &&
    contractMetadata.identity.fixCardId === context.candidate.fixCardId &&
    metadataMatchesIssueImplementation(contractMetadata, context) &&
    !contractMetadata.identity.phaseId &&
    !contractMetadata.identity.workCardId &&
    !contractMetadata.identity.parentWorkCardId
  );
  const finalContractBindingValid = Boolean(
    finalContractMetadata &&
    finalContractMetadata.artifactType === (context.implementationKind === "repair" ? "repair-work-card" : "fix-card") &&
    finalContractMetadata.participationRole === "gatingReview" &&
    finalContractMetadata.identity.issueId === context.issue.issueId &&
    finalContractMetadata.identity.fixCardId === context.candidate.fixCardId &&
    metadataMatchesIssueImplementation(finalContractMetadata, context) &&
    !finalContractMetadata.identity.phaseId &&
    !finalContractMetadata.identity.workCardId &&
    !finalContractMetadata.identity.parentWorkCardId
  );
  const reportReadiness = finalContractBindingValid && finalContractMetadata
    ? classifyIssueFixCardReportReadiness(workspaceRoot, context, finalContractMetadata.artifactRevision)
    : { readiness: "missing" as IssueFixCardReportReadiness, reason: "Approved Fix Card contract is required before the report target is resolved." };
  const reviewRecommendation = advisoryContext.state === "readable"
    ? parseIssueFixCardAdvisoryRecommendation(advisoryContext.bodyMarkdown)
    : undefined;
  const validationEvidence = currentIssueFixCardValidationEvidence(workspaceRoot, context);
  const reviewValidationCurrent = Boolean(validationEvidence);
  const validation = validationEvidence
    ? findIssueValidationForEvidence(workspaceRoot, context, validationEvidence.sourceRevisions)
    : { state: "missing" as const };
  const validationDisposition = validation.metadata?.documentDisposition.status;
  const closeRecord = readIssueFixCardCloseRecord(workspaceRoot, context.issue, context.candidate, context.readContext);

  let status: IssueFixCardContractStatus = "planning-ready";
  let statusMessage = "Prepare a Fix Card Planning handoff for the selected current candidate.";
  if (planningFailure) {
    status = "needs-attention";
    statusMessage = planningFailure.message;
  } else if (planningSubmission) {
    if (contract.state === "read-error") {
      status = "needs-attention";
      statusMessage = contract.readError ?? "Current controlled Fix Card draft is unreadable.";
    } else if (contractDisposition === "RevisionRequested") {
      status = "contract-revision-requested";
      statusMessage = "Operator requested a revision. Prepare Handoff will create the next controlled draft revision.";
    } else if (contractDisposition === "Rejected") {
      status = "contract-rejected";
      statusMessage = "Operator rejected the controlled Fix Card draft.";
    } else if (contract.state === "readable" && contract.bodyMarkdown?.trim()) {
      status = "planning-draft-ready";
      statusMessage = "Controlled Fix Card draft body is present and ready for Operator review.";
    } else {
      status = "planning-handoff-prepared";
      statusMessage = "Controlled Fix Card draft created. Copy the handoff and send it in embedded ChatGPT.";
    }
  } else if (contract.state === "read-error") {
    status = "needs-attention";
    statusMessage = contract.readError ?? "Fix Card contract is unreadable.";
  } else if (contract.state === "readable" && !contractBindingValid) {
    status = "needs-attention";
    statusMessage = "Fix Card contract metadata or identity is invalid for the current Issue implementation.";
  } else if (contract.state === "readable" && contractDisposition === "RevisionRequested") {
    status = "contract-revision-requested";
    statusMessage = "Operator requested Fix Card contract revision. Prepare a revision-aware handoff.";
  } else if (contract.state === "readable" && contractDisposition === "Rejected") {
    status = "contract-rejected";
    statusMessage = "Operator rejected the Fix Card contract.";
  } else if (contract.state === "readable" && contractDisposition !== "Approved") {
    status = "contract-awaiting-review";
    statusMessage = "Fix Card contract is ready for Operator review.";
  } else if (contract.state === "readable" && contractDisposition === "Approved") {
    if (reportReadiness.readiness === "missing") {
      status = "implement-report-missing";
      statusMessage = reportReadiness.reason;
    } else if (reportReadiness.readiness === "reserved-skeleton") {
      status = "implement-report-reserved";
      statusMessage = reportReadiness.reason;
    } else if (reportReadiness.readiness !== "ready-for-review") {
      status = "needs-attention";
      statusMessage = reportReadiness.reason;
    } else if (validation.state === "read-error") {
      status = "needs-attention";
      statusMessage = validation.readError ?? "Current validation record is unreadable.";
    } else if (validationDisposition === "Approved") {
      status = "validated-awaiting-close";
      statusMessage = closeRecord.state === "read-error"
        ? closeRecord.reason
        : "Current implementation is validated. Close / Next can create durable root Fix Card close record.";
    } else if (validationDisposition === "RevisionRequested") {
      if (repairFailure) {
        status = "needs-attention";
        statusMessage = repairFailure.message;
      } else if (repairSubmission) {
        status = "repair-planning";
        statusMessage = safeFileExists(workspaceRoot, repairSubmission.temporaryDraftPath)
          ? "Temporary Issue Repair draft detected; ChampCity will validate and promote it."
          : `Repair handoff prepared for ${repairSubmission.repairId}.`;
      } else {
        status = "repair-required";
        statusMessage = "Operator requested a bounded Repair for the exact current implementation evidence.";
      }
    } else if (reviewValidationCurrent) {
      status = "review-validation-ready";
      statusMessage = "Exact current contract and review-ready Implementer Report are ready for combined Review & Validation.";
    } else {
      status = "needs-attention";
      statusMessage = "Exact current contract and review-ready Implementer Report are required for Review & Validation.";
    }
  }

  const finalContractDisposition = finalContractMetadata?.documentDisposition.status;
  const implementAvailable = finalContractDisposition === "Approved";
  const reviewValidationAvailable = reviewValidationCurrent;
  const repairAvailable = context.implementationKind === "repair" || validationDisposition === "RevisionRequested";
  const resolvedCurrentStep = resolveIssueFixCardLifecycleStep({
    contractDisposition: planningSubmission ? contractDisposition : finalContractDisposition,
    contractBindingValid: planningSubmission ? contractBindingValid : finalContractBindingValid,
    contractState: planningSubmission ? contract.state : finalContract.state,
    implementationKind: context.implementationKind,
    planningFailure: Boolean(planningFailure),
    planningSubmission: Boolean(planningSubmission),
    repairFailure: Boolean(repairFailure),
    repairSubmission: Boolean(repairSubmission),
    reportReadiness: reportReadiness.readiness,
    reviewValidationCurrent,
    validationDisposition,
    validationState: validation.state,
    closeRecordValid: closeRecord.valid,
  });
  return {
    issueId: context.issue.issueId,
    title: context.issue.title,
    selectedCandidate: context.candidate,
    candidates,
    currentStep: resolvedCurrentStep,
    status,
    statusMessage,
    stepAvailability: issueFixCardStepAvailability({
      currentStep: resolvedCurrentStep,
      mapAvailable: context.planning.fixCardsEligible,
      planningAvailable: true,
      implementAvailable,
      reviewValidationAvailable,
      repairAvailable,
      closeAvailable: validationDisposition === "Approved" && !closeRecord.valid,
      reason: statusMessage,
    }),
    currentImplementationId: context.implementationId,
    currentImplementationKind: context.implementationKind,
    currentRepairId: context.repairId,
    parentImplementationId: context.parentImplementationId,
    parentImplementationPath: context.parentImplementationPath,
    finalContractPath: context.contractPath,
    controlledDraftPath: planningSubmission?.temporaryDraftPath,
    controlledDraftRevision: planningSubmission?.draftRevision,
    controlledDraftMetadataSha256: planningSubmission?.metadataSha256,
    controlledDraftBodySha256: planningSubmission?.bodySha256,
    contractPath: planningSubmission?.temporaryDraftPath ?? context.contractPath,
    contractState: contract.state,
    contractMarkdown: contract.bodyMarkdown,
    contractReadError: contract.readError,
    contractRevision: contractMetadata?.artifactRevision,
    contractDisposition,
    contractReviewNotes: contractMetadata?.documentDisposition.notes,
    implementerReportPath: context.implementerReportPath,
    implementerReportState: report.state,
    implementerReportMarkdown: report.bodyMarkdown,
    implementerReportReadError: report.readError,
    implementerReportRevision: reportMetadata?.artifactRevision,
    implementerReportDisposition: reportMetadata?.documentDisposition.status,
    implementerReportReadiness: reportReadiness.readiness,
    implementerReportReadinessReason: reportReadiness.reason,
    architectReviewPath: advisoryContext.path,
    architectReviewState: advisoryContext.state,
    architectReviewMarkdown: advisoryContext.bodyMarkdown,
    architectReviewReadError: advisoryContext.readError,
    architectReviewRevision: reviewMetadata?.artifactRevision,
    architectReviewRecommendation: reviewRecommendation,
    validationRecordPath: validation.path,
    validationRecordState: validation.state,
    validationRecordMarkdown: validation.bodyMarkdown,
    validationRecordReadError: validation.readError,
    validationRecordRevision: validation.metadata?.artifactRevision,
    validationRecordDisposition: validationDisposition,
    validationAttemptNumber: validation.attemptNumber,
    validationOperatorNotes: validation.operatorNotes,
    validationBoundedDefect: validation.boundedDefect,
    closeRecord: {
      path: closeRecord.path,
      state: closeRecord.state,
      origin: closeRecord.origin,
      currentImplementationId: closeRecord.currentImplementationId,
      repairId: closeRecord.repairId,
      validationRecordPath: closeRecord.validationRecordPath,
      revision: closeRecord.revision,
      readError: closeRecord.readError,
      reason: closeRecord.reason,
    },
    nextEligibleCandidate: nextIssueFixCardCandidateAfterClose(workspaceRoot, context.issue, candidates, context.candidate.fixCardId),
    allFixCardsClosed: false,
    activePlanningSubmission: planningSubmission,
    activeRepairSubmission: repairSubmission,
    canSelectCandidate: context.planning.fixCardsEligible,
    canPreparePlanningHandoff: context.implementationKind === "root-fix-card" && (
      planningSubmission
        ? contractDisposition === "RevisionRequested"
        : finalContract.state === "missing" || finalContractDisposition === "RevisionRequested"
    ),
    canCopyPlanningHandoff: context.implementationKind === "root-fix-card" &&
      Boolean(planningSubmission) && contractDisposition === "Pending",
    canApplyContractReview: context.implementationKind === "root-fix-card"
      ? Boolean(planningSubmission) && contract.state === "readable" && contractDisposition === "Pending" && Boolean(contract.bodyMarkdown?.trim())
      : !repairSubmission && contractBindingValid && contract.state === "readable" && contractDisposition === "Pending",
    canReserveImplementerReport: finalContractDisposition === "Approved" && reportReadiness.readiness === "missing",
    canRunImplementer: finalContractDisposition === "Approved" &&
      report.state === "readable" &&
      reportMetadata?.documentDisposition.status === "Pending" &&
      reportReadiness.readiness !== "invalid" &&
      reportReadiness.readiness !== "conflict",
    canCopyAdvisoryPrompt: reviewValidationCurrent,
    canApplyValidationDecision: reviewValidationCurrent && validation.state === "missing",
    canRequestRepair: validationDisposition === "RevisionRequested",
    canPrepareRepairHandoff: (
      validationDisposition === "RevisionRequested" ||
      (context.implementationKind === "repair" && contractDisposition === "RevisionRequested")
    ) && !repairSubmission && !repairFailure,
    canCopyRepairHandoff: Boolean(repairSubmission),
    canCloseFixCard: validationDisposition === "Approved" && closeRecord.state === "missing",
  };
}

function resolveIssueFixCardLifecycleStep(
  evidence: {
    contractDisposition?: DocumentDispositionStatus;
    contractBindingValid: boolean;
    contractState: MarkdownReadResult["state"];
    implementationKind: IssueFixCardContext["implementationKind"];
    planningFailure: boolean;
    planningSubmission: boolean;
    repairFailure: boolean;
    repairSubmission: boolean;
    reportReadiness: IssueFixCardReportReadiness;
    reviewValidationCurrent: boolean;
    validationDisposition?: string;
    validationState: MarkdownReadResult["state"];
    closeRecordValid: boolean;
  },
): IssueFixCardLoopStepId {
  const contractStep: IssueFixCardLoopStepId = evidence.implementationKind === "repair" ? "repair" : "planning";
  if (evidence.planningFailure || evidence.planningSubmission) {
    return contractStep;
  }
  if (!evidence.contractBindingValid || evidence.contractState !== "readable" || evidence.contractDisposition !== "Approved") {
    return contractStep;
  }
  if (evidence.reportReadiness !== "ready-for-review") {
    return "implement";
  }
  if (evidence.validationDisposition === "RevisionRequested" || evidence.repairFailure || evidence.repairSubmission) {
    return "repair";
  }
  if (evidence.validationDisposition === "Approved" && !evidence.closeRecordValid) {
    return "close-next";
  }
  if (evidence.reviewValidationCurrent || evidence.validationState === "read-error" || evidence.validationDisposition === "Approved") {
    return "review-validation";
  }
  return "review-validation";
}

function contextWorkspaceRoot(context: IssueFixCardContext): string {
  return context.workspaceRoot;
}

function requireSelectedIssueFixCardContext(
  workspaceRoot: string,
  issueId: string,
  resolveCurrent = true,
): IssueFixCardContext {
  const issue = requireReadableIssue(workspaceRoot, issueId);
  const planning = getIssuePlanningProjectionWithoutAutoPromotion(workspaceRoot, issue.issueId);
  if (!planning.fixCardsEligible) {
    throw new Error("A current approved Fix Card Map is required.");
  }
  const selectionKey = submissionKey(workspaceRoot, issue.issueId);
  const selectedFixCardId = activeFixCardSelections.get(selectionKey);
  let candidate = selectedFixCardId
    ? planning.fixCardCandidates.find((entry) => entry.fixCardId === selectedFixCardId)
    : undefined;
  if (!candidate) {
    candidate = recoverIssueFixCardCandidateFromControlledDraft(workspaceRoot, issue, planning);
    if (candidate) {
      activeFixCardSelections.set(selectionKey, candidate.fixCardId);
    }
  }
  if (!candidate) {
    throw new Error("Select one current Fix Card candidate before using this action.");
  }
  const lifecycleState = deriveIssueFixCardCandidateLifecycle(workspaceRoot, issue, planning, candidate);
  if (lifecycleState.state === "blocked-by-dependencies") throw Error(lifecycleState.reason);
  const rootContext = issueFixCardContextForRoot(workspaceRoot, issue, planning, candidate);
  return resolveCurrent ? resolveCurrentIssueFixCardContext(workspaceRoot, rootContext) : rootContext;
}

function recoverIssueFixCardCandidateFromControlledDraft(
  workspaceRoot: string,
  issue: IssueRecordProjection,
  planning: IssuePlanningProjection,
): IssueFixCardPlanCandidate | undefined {
  const candidates = planning.fixCardCandidates.filter((candidate) => {
    const rootContext = issueFixCardContextForRoot(workspaceRoot, issue, planning, candidate);
    const submission = resolveCurrentFixCardPlanningSubmission(workspaceRoot, rootContext);
    const context = resolveCurrentIssueFixCardContext(workspaceRoot, rootContext);
    const repairSubmission = resolveCurrentIssueRepairSubmission(workspaceRoot, context);
    if (repairSubmission || issueRepairAutoPromotionFailures.has(
      issueImplementationSubmissionKey(workspaceRoot, issue.issueId, context.implementationId),
    )) return true;
    return Boolean(submission) || fixCardPlanningDraftFailures.has(
      fixCardSubmissionKey(workspaceRoot, issue.issueId, candidate.fixCardId),
    );
  });
  return candidates.length === 1 ? candidates[0] : undefined;
}

function issueFixCardContextForRoot(
  workspaceRoot: string,
  issue: IssueRecordProjection,
  planning: IssuePlanningProjection,
  candidate: IssueFixCardPlanCandidate,
  readContext?: IssueProjectionReadContext,
): IssueFixCardContext {
  const paths = issueFixCardPathsForCandidate(issue.issueId, candidate);
  return {
    workspaceRoot,
    readContext,
    issue,
    planning,
    candidate,
    implementationId: candidate.fixCardId,
    implementationKind: "root-fix-card",
    contractPath: paths.contractPath,
    implementerReportPath: paths.implementerReportPath,
    architectReviewPath: paths.architectReviewPath,
  };
}

function resolveCurrentIssueFixCardContext(
  workspaceRoot: string,
  rootContext: IssueFixCardContext,
  readContext?: IssueProjectionReadContext,
): IssueFixCardContext {
  const repairsDirectory = containedPath(workspaceRoot, path.join("issues", rootContext.issue.issueId, "Repairs"));
  if (!fs.existsSync(repairsDirectory)) {
    return rootContext;
  }
  const repairs = fs.readdirSync(repairsDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"))
    .map((entry) => normalizeRelativePath(path.join("issues", rootContext.issue.issueId, "Repairs", entry.name)))
    .map((relativePath) => ({ relativePath, document: readCanonicalIssueDocument(workspaceRoot, relativePath, readContext ?? rootContext.readContext) }))
    .filter((entry) => entry.document.state === "readable" && entry.document.metadata?.artifactType === "repair-work-card")
    .filter((entry) =>
      entry.document.metadata?.identity.issueId === rootContext.issue.issueId &&
      entry.document.metadata.identity.fixCardId === rootContext.candidate.fixCardId
    )
    .map((entry) => {
      const metadata = entry.document.metadata!;
      const repairId = stringMetadataValue(metadata.identity.repairId);
      const currentImplementationId = stringMetadataValue(metadata.identity.currentImplementationId);
      const parentImplementationId = stringMetadataValue(metadata.identity.parentImplementationId);
      const rootFixCardId = stringMetadataValue(metadata.identity.fixCardId);
      const issueId = stringMetadataValue(metadata.identity.issueId);
      const validationEvidencePath = stringMetadataValue(metadata.workflowData.validationRecordPath);
      const implementerReportPath = stringMetadataValue(metadata.workflowData.implementerReportTarget);
      const architectReviewPath = stringMetadataValue(metadata.workflowData.architectReviewTarget) ?? normalizeRelativePath(path.join(
        "issues",
        rootContext.issue.issueId,
        "Architect_Reviews",
        `ARCHITECT_REVIEW_${repairId ?? "UNKNOWN_REPAIR"}.md`,
      ));
      if (
        !repairId || currentImplementationId !== repairId || !parentImplementationId ||
        !validationEvidencePath || !implementerReportPath ||
        issueId !== rootContext.issue.issueId || rootFixCardId !== rootContext.candidate.fixCardId ||
        stringMetadataValue(metadata.workflowData.ownerKind) !== "issue" ||
        stringMetadataValue(metadata.workflowData.issueId) !== rootContext.issue.issueId ||
        stringMetadataValue(metadata.workflowData.rootFixCardId) !== rootContext.candidate.fixCardId ||
        stringMetadataValue(metadata.workflowData.repairId) !== repairId ||
        stringMetadataValue(metadata.workflowData.currentImplementationId) !== repairId ||
        stringMetadataValue(metadata.workflowData.parentImplementationId) !== parentImplementationId ||
        metadata.identity.phaseId || metadata.identity.workCardId || metadata.identity.parentWorkCardId
      ) {
        throw new Error(`Issue Repair metadata is incomplete or carries invalid Development parentage: ${entry.relativePath}`);
      }
      return {
        architectReviewPath,
        boundedDefect: stringMetadataValue(metadata.workflowData.boundedDefect),
        contractPath: entry.relativePath,
        implementerReportPath,
        parentImplementationId,
        parentImplementationPath: stringMetadataValue(metadata.workflowData.parentImplementationPath),
        repairId,
        sourceRevisions: metadata.sourceRevisions,
        validationEvidencePath,
      };
    });

  let current = rootContext;
  const visited = new Set<string>([rootContext.implementationId]);
  while (true) {
    const children = repairs.filter((repair) => repair.parentImplementationId === current.implementationId);
    if (children.length === 0) {
      return current;
    }
    if (children.length > 1) {
      throw new Error(`Conflicting Issue Repairs share immediate parent ${current.implementationId}.`);
    }
    const child = children[0];
    if (visited.has(child.repairId)) {
      throw new Error("Issue Repair lineage contains a cycle.");
    }
    const validation = readCanonicalIssueDocument(workspaceRoot, child.validationEvidencePath, readContext ?? rootContext.readContext);
    const validationBoundedDefect = stringMetadataValue(validation.metadata?.workflowData.boundedDefect);
    const expectedParentRepairId = current.repairId;
    if (
      validation.state !== "readable" ||
      validation.metadata?.artifactType !== "validation-record" ||
      validation.metadata.participationRole !== "gatingReview" ||
      validation.metadata.documentDisposition.status !== "RevisionRequested" ||
      validation.metadata.identity.issueId !== rootContext.issue.issueId ||
      validation.metadata.identity.fixCardId !== rootContext.candidate.fixCardId ||
      validation.metadata.identity.currentImplementationId !== current.implementationId ||
      stringMetadataValue(validation.metadata.identity.repairId) !== expectedParentRepairId ||
      validation.metadata.identity.phaseId ||
      validation.metadata.identity.workCardId ||
      validation.metadata.identity.parentWorkCardId ||
      !validationBoundedDefect ||
      child.boundedDefect !== validationBoundedDefect ||
      child.parentImplementationPath !== current.contractPath ||
      !sourceRevisionsEqual(child.sourceRevisions, [
        { path: child.validationEvidencePath, revision: validation.metadata.artifactRevision },
      ])
    ) {
      throw new Error(`Issue Repair ${child.repairId} is not bound to its exact parent RevisionRequested validation record.`);
    }
    visited.add(child.repairId);
    current = {
      ...rootContext,
      architectReviewPath: child.architectReviewPath,
      boundedDefect: child.boundedDefect,
      contractPath: child.contractPath,
      implementationId: child.repairId,
      implementationKind: "repair",
      implementerReportPath: child.implementerReportPath,
      parentImplementationId: child.parentImplementationId,
      parentImplementationPath: current.contractPath,
      repairId: child.repairId,
      validationEvidencePath: child.validationEvidencePath,
    };
  }
}

function stringMetadataValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function issueCloseValidationBasisSha256(workflowData: Record<string, unknown>): string | undefined {
  return stringMetadataValue(workflowData.validationBasisSha256) ??
    stringMetadataValue(workflowData[legacyIssueCloseDigestField]);
}

function fixCardCompletionBasis(workflowData: Record<string, unknown>): string | undefined {
  return stringMetadataValue(workflowData.completionBasis) ??
    stringMetadataValue(workflowData[legacyFixCardCompletionBasisField]);
}

function extractCanonicalOrLegacySection(
  bodyMarkdown: string,
  canonicalHeading: string,
  legacyHeading: string,
): string | undefined {
  return extractMarkdownSection(bodyMarkdown, canonicalHeading) ??
    extractMarkdownSection(bodyMarkdown, legacyHeading) ??
    undefined;
}

function issueFixCardPathsForCandidate(
  issueId: string,
  candidate: IssueFixCardPlanCandidate,
): Pick<IssueFixCardContext, "contractPath" | "implementerReportPath" | "architectReviewPath"> {
  const slug = slugForFixCardCandidate(candidate);
  return {
    contractPath: normalizeRelativePath(path.join("issues", issueId, "Fix_Cards", `${candidate.fixCardId}_${slug}.md`)),
    implementerReportPath: normalizeRelativePath(path.join("issues", issueId, "Implementer_Reports", `IMPLEMENTER_REPORT_${candidate.fixCardId}_${slug}.md`)),
    architectReviewPath: normalizeRelativePath(path.join("issues", issueId, "Architect_Reviews", `ARCHITECT_REVIEW_${candidate.fixCardId}.md`)),
  };
}

export function getIssueCorrectionExecution(workspaceRoot: string, issueId: string) {
  const issue = requireReadableIssue(workspaceRoot, issueId);
  const planning = getIssuePlanningProjectionWithoutAutoPromotion(workspaceRoot, issueId);
  if (!planning.fixCardsEligible) throw Error("Current Approved correction planning and RCA are required.");
  const state = deriveIssueCorrectionExecution(workspaceRoot, issue, planning);
  if (!state.execution?.workItemsComplete || !state.execution.phasesComplete) return state.execution;
  const validation = getIssueValidationProjection(workspaceRoot, issueId);
  return validation.status === "approved" && validation.currentDecision === "ValidateResolved" && validation.currentRecordPath
    ? projectIssueExecution(workspaceRoot, issueId, state.candidates, validation.currentRecordPath)!.projection : state.execution;
}
export function approveIssueCorrectionPhase(workspaceRoot: string, issueId: string, input: { phaseId: string; expectedFingerprint: string; notes: string }) {
  const issue = requireReadableIssue(workspaceRoot, issueId);
  const planning = getIssuePlanningProjectionWithoutAutoPromotion(workspaceRoot, issueId);
  if (!planning.fixCardsEligible) throw Error("Current Approved correction planning and RCA are required.");
  // Facts are supplied by the same close/Repair readers used by all Fix Card actions.
  const closeRecords = new Map(planning.fixCardCandidates.map((candidate) => [candidate.fixCardId, readIssueFixCardCloseRecord(workspaceRoot, issue, candidate)]));
  const candidates = planning.fixCardCandidates.map((candidate) => ({ ...candidate, lifecycle: deriveIssueFixCardCandidateLifecycleWithState(workspaceRoot, issue, planning, candidate, closeRecords) }));
  acceptIssueExecutionPhase(workspaceRoot, issueId, candidates, input);
  return getIssueCorrectionExecution(workspaceRoot, issueId);
}

/** Integration consumes the same current close/Repair and aggregate validation owners. */
export function getIssueCorrectionIntegrationEvidence(workspaceRoot: string, issueId: string) {
  const issue = requireReadableIssue(workspaceRoot, issueId);
  const planning = getIssuePlanningProjectionWithoutAutoPromotion(workspaceRoot, issueId);
  if (!planning.fixCardsEligible) throw Error("Current Approved correction planning and RCA are required.");
  const state = deriveIssueCorrectionExecution(workspaceRoot, issue, planning);
  const validation = state.execution?.workItemsComplete && state.execution.phasesComplete ? getIssueValidationProjection(workspaceRoot, issueId) : undefined;
  const acceptedPath = validation?.status === "approved" && validation.currentDecision === "ValidateResolved" ? validation.currentRecordPath : undefined;
  const execution = projectIssueExecution(workspaceRoot, issueId, state.candidates, acceptedPath ?? undefined);
  if (!execution?.plan) throw Error("Current routed Issue Plan is required for integration.");
  const checkpoints = execution.projection.complete ? state.candidates.map((candidate) => {
    const context = resolveCurrentIssueFixCardContext(workspaceRoot, issueFixCardContextForRoot(workspaceRoot, issue, planning, candidate));
    return { workItemId: candidate.fixCardId, implementationId: context.implementationId, contractPath: context.contractPath };
  }) : [];
  return { ...execution, checkpoints };
}

function deriveIssueFixCardCandidateLifecycles(
  workspaceRoot: string, issue: IssueRecordProjection, planning: IssuePlanningProjection, readContext?: IssueProjectionReadContext,
): IssueFixCardPlanCandidate[] {
  return deriveIssueCorrectionExecution(workspaceRoot, issue, planning, readContext).candidates;
}

function deriveIssueCorrectionExecution(
  workspaceRoot: string,
  issue: IssueRecordProjection,
  planning: IssuePlanningProjection,
  readContext?: IssueProjectionReadContext,
) {
  const closeRecords = new Map(planning.fixCardCandidates.map((candidate) => [
    candidate.fixCardId,
    readIssueFixCardCloseRecord(workspaceRoot, issue, candidate, readContext),
  ]));
  const facts = planning.fixCardCandidates.map((candidate) => ({
    ...candidate,
    lifecycle: deriveIssueFixCardCandidateLifecycleWithState(
      workspaceRoot,
      issue,
      planning,
      candidate,
      closeRecords,
      readContext,
    ),
  }));
  const execution = projectIssueExecution(workspaceRoot, issue.issueId, facts);
  const candidates = facts.map((candidate) => {
    const projected = execution?.projection.workItems.find((item) => execution.mapping[item.candidate.workItemId] === candidate.fixCardId);
    return projected && !projected.complete && !projected.eligible && candidate.lifecycle.state !== "needs-attention"
      ? { ...candidate, lifecycle: lifecycle("blocked-by-dependencies", "Blocked by Dependencies", projected.reasons.join(" "), false) }
      : candidate;
  });
  return { candidates, execution: execution?.projection };
}

function deriveIssueFixCardCandidateLifecycle(
  workspaceRoot: string,
  issue: IssueRecordProjection,
  planning: IssuePlanningProjection,
  candidate: IssueFixCardPlanCandidate,
  readContext?: IssueProjectionReadContext,
): IssueFixCardCandidateLifecycleProjection {
  return deriveIssueFixCardCandidateLifecycles(workspaceRoot, issue, planning, readContext).find((entry) => entry.fixCardId === candidate.fixCardId)!.lifecycle!;
}

function deriveIssueFixCardCandidateLifecycleWithState(
  workspaceRoot: string,
  issue: IssueRecordProjection,
  planning: IssuePlanningProjection,
  candidate: IssueFixCardPlanCandidate,
  closeRecords: Map<string, IssueFixCardCloseReadResult>,
  readContext?: IssueProjectionReadContext,
): IssueFixCardCandidateLifecycleProjection {
  const closeRecord = closeRecords.get(candidate.fixCardId) ?? readIssueFixCardCloseRecord(workspaceRoot, issue, candidate, readContext);
  if (closeRecord.valid) {
    return lifecycle("complete", "Complete", closeRecord.reason, false);
  }
  const rootContext = issueFixCardContextForRoot(workspaceRoot, issue, planning, candidate, readContext);
  const context = resolveCurrentIssueFixCardContext(workspaceRoot, rootContext, readContext);
  const key = issueImplementationSubmissionKey(workspaceRoot, issue.issueId, context.implementationId);
  const planningSubmission = context.implementationKind === "root-fix-card"
    ? resolveCurrentFixCardPlanningSubmission(workspaceRoot, context)
    : undefined;
  const repairSubmission = resolveCurrentIssueRepairSubmission(workspaceRoot, context);
  const contract = readCanonicalIssueDocument(workspaceRoot, context.contractPath, readContext);
  const report = readCanonicalIssueDocument(workspaceRoot, context.implementerReportPath, readContext);

  if (context.implementationKind === "repair" && contract.state === "readable") {
    if (contract.metadata?.documentDisposition.status === "Rejected") {
      return lifecycle("needs-attention", "Rejected / Needs Attention", `Operator rejected Repair ${context.implementationId}.`, false);
    }
    if (contract.metadata?.documentDisposition.status !== "Approved") {
      const reason = contract.metadata?.documentDisposition.status === "RevisionRequested"
        ? `Operator requested a contract revision for Repair ${context.implementationId}.`
        : `Current implementation is ${context.implementationId}; its Repair contract is in Operator review.`;
      return lifecycle("in-repair", "In Repair", reason, true);
    }
  }

  if (planningSubmission) {
    const controlledDraft = readCanonicalIssueDocument(workspaceRoot, planningSubmission.temporaryDraftPath, readContext);
    if (controlledDraft.state !== "readable" || !controlledDraft.metadata) {
      return lifecycle(
        "needs-attention",
        "Rejected / Needs Attention",
        controlledDraft.readError ?? "Current controlled Fix Card draft is unreadable.",
        true,
      );
    }
    const draftDisposition = controlledDraft.metadata.documentDisposition.status;
    if (draftDisposition === "Rejected") {
      return lifecycle("needs-attention", "Rejected / Needs Attention", "Operator rejected the current controlled Fix Card draft.", false);
    }
    if (draftDisposition === "RevisionRequested") {
      return lifecycle("revision-requested", "Revision Requested", "Operator requested the next controlled Fix Card draft revision.", true);
    }
    return controlledDraft.bodyMarkdown?.trim()
      ? lifecycle("awaiting-contract-review", "Awaiting Contract Review", "Controlled Fix Card draft body is ready for Operator review.", true)
      : lifecycle("planning-handoff", "Planning Handoff", "Application-created controlled draft is ready for Browser GPT body editing.", true);
  }

  if (contract.state === "missing") {
    return lifecycle("eligible", "Eligible", "No current Fix Card contract exists; generic execution determines eligibility.", true);
  }
  if (contract.state !== "readable" || !contract.metadata) {
    return lifecycle(
      "needs-attention",
      "Rejected / Needs Attention",
      contract.readError ?? "Fix Card contract is unreadable. Canonical CHAMPCITY metadata is required.",
      false,
    );
  }
  const expectedContractType = context.implementationKind === "repair" ? "repair-work-card" : "fix-card";
  if (
    contract.metadata.artifactType !== expectedContractType ||
    contract.metadata.identity.issueId !== issue.issueId ||
    contract.metadata.identity.fixCardId !== candidate.fixCardId
  ) {
    return lifecycle("needs-attention", "Rejected / Needs Attention", "Current contract metadata does not match this Issue/Fix Card.", false);
  }

  const disposition = contract.metadata.documentDisposition.status;
  if (disposition === "RevisionRequested") {
    return lifecycle("revision-requested", "Revision Requested", "Operator requested a revision to the current Fix Card contract.", true);
  }
  if (disposition === "Rejected") {
    return lifecycle("needs-attention", "Rejected / Needs Attention", "Operator rejected the current Fix Card contract.", false);
  }
  if (disposition !== "Approved") {
    return lifecycle("awaiting-contract-review", "Awaiting Contract Review", "Current Fix Card contract is ready for Operator review.", true);
  }

  const reportReadiness = classifyIssueFixCardReportReadiness(workspaceRoot, context, contract.metadata.artifactRevision);
  if (reportReadiness.readiness === "missing") {
    return lifecycle("needs-attention", "Rejected / Needs Attention", reportReadiness.reason, true);
  }
  if (reportReadiness.readiness === "reserved-skeleton") {
    if (context.implementationKind === "repair") {
      return lifecycle("in-repair", "In Repair", `Approved Repair ${context.implementationId} is ready for shared Implementer execution.`, true);
    }
    return lifecycle("ready-to-implement", "Ready to Implement", "Approved contract has the matching reserved Issue-owned Implementer Report setup.", true);
  }
  if (reportReadiness.readiness !== "ready-for-review") {
    return lifecycle("needs-attention", "Rejected / Needs Attention", reportReadiness.reason, false);
  }
  const validationEvidence = currentIssueFixCardValidationEvidence(workspaceRoot, context);
  const validation = validationEvidence
    ? findIssueValidationForEvidence(workspaceRoot, context, validationEvidence.sourceRevisions)
    : { state: "missing" as const };
  if (validation.metadata?.documentDisposition.status === "Approved") {
    return lifecycle(
      "validated-awaiting-close",
      "Validated / Awaiting Close",
      "Current implementation passed individual Fix Card Validation and is ready for explicit Close / Next.",
      true,
    );
  }
  if (validation.metadata?.documentDisposition.status === "RevisionRequested") {
    return lifecycle(
      repairSubmission ? "in-repair" : "repair-required",
      repairSubmission ? "In Repair" : "Repair Required",
      repairSubmission
        ? `Bounded Repair ${repairSubmission.repairId} is being drafted from the current Operator validation record.`
        : "The Operator's current RevisionRequested disposition makes a bounded causally subordinate Repair eligible.",
      true,
    );
  }
  if (validationEvidence) {
    return lifecycle(
      "review-validation",
      "Review & Validation",
      context.implementationKind === "repair"
        ? `Current Repair ${context.implementationId} has exact contract/report evidence ready for combined Review & Validation.`
        : "Current implementation contract and Implementer Report are ready for combined Review & Validation.",
      true,
    );
  }
  if (report.state === "read-error") {
    return lifecycle("needs-attention", "Rejected / Needs Attention", report.readError ?? "Implementer Report is unreadable.", false);
  }
  if (context.implementationKind === "repair") {
    return lifecycle(
      "in-repair",
      "In Repair",
      `Repair ${context.implementationId} is progressing through shared implementation and implementation-specific advisory review.`,
      true,
    );
  }
  return lifecycle("implementation-evidence-ready", "Implementation Evidence Ready", reportReadiness.reason, true);
}

function lifecycle(
  state: IssueFixCardCandidateLifecycleProjection["state"],
  label: string,
  reason: string,
  selectable: boolean,
): IssueFixCardCandidateLifecycleProjection {
  return { state, label, reason, selectable };
}

function nextIssueFixCardCandidateAfterClose(
  workspaceRoot: string,
  issue: IssueRecordProjection,
  candidates: IssueFixCardPlanCandidate[],
  closingFixCardId: string,
): IssueFixCardPlanCandidate | undefined {
  const projected = projectIssueExecution(workspaceRoot, issue.issueId, candidates.map((candidate) => candidate.fixCardId === closingFixCardId
    ? { ...candidate, lifecycle: lifecycle("complete", "Complete", "Preview after explicit close", false) } : candidate));
  return candidates.find((candidate) => candidate.fixCardId === projected?.mapping[projected.projection.nextWorkItemId ?? ""]);
}

function resolveCurrentFixCardPlanningSubmission(
  workspaceRoot: string,
  context: IssueFixCardContext,
): IssueFixCardDraftSubmission | undefined {
  if (context.implementationKind !== "root-fix-card") {
    return undefined;
  }
  const key = fixCardSubmissionKey(workspaceRoot, context.issue.issueId, context.candidate.fixCardId);
  const finalContract = readCanonicalIssueDocument(workspaceRoot, context.contractPath);
  if (finalContract.metadata?.documentDisposition.status === "Approved") {
    activeFixCardPlanningSubmissions.delete(key);
    fixCardPlanningDraftFailures.delete(key);
    return undefined;
  }

  const draftsRoot = containedPath(workspaceRoot, path.join("issues", "Architect_Drafts"));
  if (!fs.existsSync(draftsRoot) || !fs.lstatSync(draftsRoot).isDirectory()) {
    activeFixCardPlanningSubmissions.delete(key);
    fixCardPlanningDraftFailures.delete(key);
    return undefined;
  }
  const candidates: Array<{
    createdAt: string;
    revision: number;
    inspection: ReturnType<typeof inspectControlledMarkdownDraft>;
    failure?: string;
  }> = [];
  for (const entry of fs.readdirSync(draftsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.isSymbolicLink()) {
      continue;
    }
    const relativePath = normalizeRelativePath(path.join("issues", "Architect_Drafts", entry.name, "fix-card-contract.md"));
    if (!safeFileExists(workspaceRoot, relativePath)) {
      continue;
    }
    try {
      const inspection = inspectControlledMarkdownDraft(workspaceRoot, relativePath);
      assertFixCardDraftIdentityMatchesContext(inspection.metadata, context, relativePath);
      let failure: string | undefined;
      try {
        assertFixCardDraftSourceFingerprintsCurrent(inspection.metadata, context);
      } catch (error) {
        failure = error instanceof Error ? error.message : String(error);
      }
      candidates.push({
        createdAt: stringMetadataValue(inspection.metadata.workflowData.createdAt) ?? "",
        revision: numberMetadataValue(inspection.metadata.workflowData.draftRevision) ?? 0,
        inspection,
        failure,
      });
    } catch {
      // Unrelated, malformed, or stale drafts cannot claim the selected Fix Card identity.
    }
  }
  candidates.sort((left, right) => right.revision - left.revision || right.createdAt.localeCompare(left.createdAt));
  const current = candidates[0];
  if (!current) {
    activeFixCardPlanningSubmissions.delete(key);
    fixCardPlanningDraftFailures.delete(key);
    return undefined;
  }
  if (current.failure) {
    activeFixCardPlanningSubmissions.delete(key);
    fixCardPlanningDraftFailures.set(key, {
      submissionId: stringMetadataValue(current.inspection.metadata.identity.submissionId) ?? "",
      temporaryDraftPath: current.inspection.relativePath,
      draftRevision: current.revision,
      message: `Controlled Fix Card draft is stale against its governing Issue planning sources: ${current.failure}`,
    });
    return undefined;
  }
  const submission = issueFixCardDraftSubmissionFromInspection(workspaceRoot, context, current.inspection);
  fixCardPlanningDraftFailures.delete(key);
  activeFixCardPlanningSubmissions.set(key, submission);
  return submission;
}

function issueFixCardDraftSubmissionFromInspection(
  workspaceRoot: string,
  context: IssueFixCardContext,
  inspection: ReturnType<typeof inspectControlledMarkdownDraft>,
): IssueFixCardDraftSubmission {
  const disposition = inspection.metadata.documentDisposition.status;
  const submission: IssueFixCardDraftSubmission = {
    bodySha256: inspection.bodySha256,
    documentDisposition: disposition,
    draftRevision: numberMetadataValue(inspection.metadata.workflowData.draftRevision),
    finalFixCardTarget: stringMetadataValue(inspection.metadata.workflowData.finalFixCardTarget),
    implementerReportTarget: stringMetadataValue(inspection.metadata.workflowData.implementerReportTarget),
    metadataSha256: inspection.metadataSha256,
    preparedInstruction: "",
    submissionId: stringMetadataValue(inspection.metadata.identity.submissionId) ?? "",
    temporaryDraftPath: inspection.relativePath,
  };
  return {
    ...submission,
    preparedInstruction: buildIssueFixCardPlanningHandoffInstruction(workspaceRoot, context, submission),
  };
}

function assertFixCardDraftMatchesContext(
  metadata: CanonicalDocumentMetadata,
  context: IssueFixCardContext,
  relativePath: string,
): void {
  assertFixCardDraftIdentityMatchesContext(metadata, context, relativePath);
  assertFixCardDraftSourceFingerprintsCurrent(metadata, context);
}

function assertFixCardDraftIdentityMatchesContext(
  metadata: CanonicalDocumentMetadata,
  context: IssueFixCardContext,
  relativePath: string,
): void {
  const expectedSources = issueFixCardPlanningSourceRevisions(context);
  if (
    metadata.artifactType !== "fix-card-draft" ||
    metadata.participationRole !== "gatingReview" ||
    metadata.identity.issueId !== context.issue.issueId ||
    metadata.identity.fixCardId !== context.candidate.fixCardId ||
    metadata.identity.candidateId !== context.candidate.fixCardId ||
    metadata.identity.currentImplementationId !== context.candidate.fixCardId ||
    metadata.workflowData.ownerKind !== "issue" ||
    metadata.workflowData.draftPath !== relativePath ||
    metadata.workflowData.finalFixCardTarget !== context.contractPath ||
    metadata.workflowData.implementerReportTarget !== context.implementerReportPath ||
    metadata.workflowData.returnTarget !== "planning" ||
    !sourceRevisionsEqual(metadata.sourceRevisions, expectedSources) ||
    Boolean(metadata.identity.phaseId) ||
    Boolean(metadata.identity.workCardId) ||
    Boolean(metadata.identity.parentWorkCardId)
  ) {
    throw new Error("Controlled Fix Card draft metadata does not match the selected Issue/Fix Card context.");
  }
  if (!stringMetadataValue(metadata.identity.submissionId)) {
    throw new Error("Controlled Fix Card draft is missing its application-owned submission identity.");
  }
}

function assertFixCardDraftSourceFingerprintsCurrent(
  metadata: CanonicalDocumentMetadata,
  context: IssueFixCardContext,
): void {
  const stored = issuePlanningSourceFingerprintArray(metadata.workflowData.sourceFingerprints);
  const current = issueFixCardPlanningSourceFingerprints(context);
  if (
    stored.length !== current.length ||
    stored.some((entry, index) => entry.path !== current[index]?.path || entry.sha256 !== current[index]?.sha256)
  ) {
    throw new Error("governing Issue Resolution Plan or Fix Card Plan content changed after this draft was prepared");
  }
}

function issueFixCardPlanningSourceRevisions(
  context: IssueFixCardContext,
): CanonicalDocumentMetadata["sourceRevisions"] {
  return [
    { path: context.planning.issueResolutionPlanPath, revision: currentArtifactRevision(context.workspaceRoot, context.planning.issueResolutionPlanPath) },
    { path: context.planning.fixCardPlanPath, revision: currentArtifactRevision(context.workspaceRoot, context.planning.fixCardPlanPath) },
  ];
}

function issueFixCardPlanningSourceFingerprints(
  context: IssueFixCardContext,
): Array<{ path: string; sha256: string }> {
  return [context.planning.issueResolutionPlanPath, context.planning.fixCardPlanPath].map((relativePath) => {
    const content = fs.readFileSync(containedPath(context.workspaceRoot, relativePath));
    return {
      path: relativePath,
      sha256: crypto.createHash("sha256").update(content).digest("hex"),
    };
  });
}

function issuePlanningSourceFingerprintArray(value: unknown): Array<{ path: string; sha256: string }> {
  if (!Array.isArray(value)) {
    throw new Error("controlled draft source fingerprints are missing");
  }
  return value.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error("controlled draft source fingerprint entry is invalid");
    }
    const record = entry as Record<string, unknown>;
    const fingerprintPath = stringMetadataValue(record.path);
    const sha256 = stringMetadataValue(record.sha256);
    if (!fingerprintPath || !sha256 || !/^[a-f0-9]{64}$/.test(sha256)) {
      throw new Error("controlled draft source fingerprint entry is invalid");
    }
    return { path: fingerprintPath, sha256 };
  });
}

function currentArtifactRevision(workspaceRoot: string, relativePath: string): number {
  try {
    const content = fs.readFileSync(containedPath(workspaceRoot, relativePath), "utf8");
    return parseCanonicalMarkdownDocument(content).metadata.artifactRevision;
  } catch {
    return 1;
  }
}

function currentArtifactRevisionFromMarkdown(content: string): number {
  try {
    return parseCanonicalMarkdownDocument(content).metadata.artifactRevision;
  } catch {
    return 1;
  }
}

function sha256ForMarkdown(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function fixCardSubmissionKey(workspaceRoot: string, issueId: string, fixCardId: string): string {
  return `${submissionKey(workspaceRoot, issueId)}::${fixCardId}`;
}

function issueImplementationSubmissionKey(workspaceRoot: string, issueId: string, implementationId: string): string {
  return `${submissionKey(workspaceRoot, issueId)}::implementation::${implementationId}`;
}

function slugForFixCardCandidate(candidate: IssueFixCardPlanCandidate): string {
  const slug = candidate.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 72);
  return slug || "fix_card";
}

function maybeAutoPromoteIssueRepairDraft(
  workspaceRoot: string,
  context: IssueFixCardContext,
): boolean {
  const key = issueImplementationSubmissionKey(workspaceRoot, context.issue.issueId, context.implementationId);
  const submission = resolveCurrentIssueRepairSubmission(workspaceRoot, context);
  if (!submission || !submission.bodyMarkdown.trim()) {
    return false;
  }
  try {
    promoteIssueFixCardRepairDraft(workspaceRoot, context.issue.issueId, "repair");
    return true;
  } catch (error) {
    issueRepairAutoPromotionFailures.set(key, {
      message: errorMessage(error),
      submissionId: submission.submissionId,
      temporaryDraftPath: submission.temporaryDraftPath,
    });
    return false;
  }
}

function issueFixCardStepAvailability(input: {
  currentStep: IssueFixCardLoopStepId;
  mapAvailable: boolean;
  planningAvailable: boolean;
  implementAvailable: boolean;
  reviewValidationAvailable: boolean;
  repairAvailable: boolean;
  closeAvailable: boolean;
  reason: string;
}) {
  return issueFixCardLoop.map((step) => {
    let available = false;
    let reason = "Reserved for a later Fix Card.";
    if (step.id === "fix-card-map") {
      available = input.mapAvailable;
      reason = input.mapAvailable ? "Current approved Fix Card Map is available." : input.reason;
    } else if (step.id === "planning") {
      available = input.planningAvailable;
      reason = input.planningAvailable ? "A current Fix Card candidate is selected." : "Select a current Fix Card candidate first.";
    } else if (step.id === "implement") {
      available = input.implementAvailable;
      reason = input.implementAvailable ? "Current Fix Card contract is Approved." : "Approve the Fix Card contract before Implement.";
    } else if (step.id === "review-validation") {
      available = input.reviewValidationAvailable;
      reason = input.reviewValidationAvailable
        ? "Exact current contract and review-ready Implementer Report are available for combined Review & Validation."
        : "Current identity-matching contract and review-ready Implementer Report are required.";
    } else if (step.id === "repair") {
      available = input.repairAvailable;
      reason = input.repairAvailable
        ? "A current Issue Repair branch exists or is eligible from the Operator's RevisionRequested validation disposition."
        : "Operator RevisionRequested validation is required before Repair.";
    } else if (step.id === "close-next") {
      available = input.closeAvailable;
      reason = input.closeAvailable
        ? "The exact current individual Validation Record is Approved and no close record exists."
        : "Exact current Approved validation with no existing close record is required.";
    }
    return {
      available,
      reason,
      stateLabel: step.id === input.currentStep ? "Current" : available ? "Available" : "Unavailable",
      stepId: step.id,
    };
  });
}

function emptyIssueFixCardProjection(_currentStep: IssueFixCardLoopStepId): IssueFixCardProjection {
  const currentStep = "fix-card-map";
  return {
    issueId: "",
    title: "No issue selected",
    candidates: [],
    currentStep,
    status: "blocked-no-issue",
    statusMessage: "Select an Issue with approved Issue Planning before opening Fix Cards.",
    stepAvailability: issueFixCardStepAvailability({
      currentStep,
      mapAvailable: false,
      planningAvailable: false,
      implementAvailable: false,
      reviewValidationAvailable: false,
      repairAvailable: false,
      closeAvailable: false,
      reason: "No issue selected.",
    }),
    contractState: "missing",
    implementerReportState: "missing",
    implementerReportReadiness: "missing",
    implementerReportReadinessReason: "No issue selected.",
    architectReviewState: "missing",
    validationRecordState: "missing",
    closeRecord: {
      path: "issues/ISSUE_NNN/Close_Records/FIX_CARD_CLOSE_RECORD_<FIX_CARD_ID>.md",
      state: "missing",
      reason: "No issue selected.",
    },
    allFixCardsClosed: false,
    canSelectCandidate: false,
    canPreparePlanningHandoff: false,
    canCopyPlanningHandoff: false,
    canApplyContractReview: false,
    canReserveImplementerReport: false,
    canRunImplementer: false,
    canCopyAdvisoryPrompt: false,
    canApplyValidationDecision: false,
    canRequestRepair: false,
    canPrepareRepairHandoff: false,
    canCopyRepairHandoff: false,
    canCloseFixCard: false,
  };
}

function normalizeIssueFixCardLoopStepId(value: unknown): IssueFixCardLoopStepId {
  if (value === "architect-review" || value === "fix-card-validation") {
    return "review-validation";
  }
  return issueFixCardLoop.some((step) => step.id === value)
    ? value as IssueFixCardLoopStepId
    : "fix-card-map";
}

function readCanonicalIssueDocument(
  workspaceRoot: string,
  relativePath: string,
  readContext?: IssueProjectionReadContext,
): MarkdownReadResult & {
  metadata?: CanonicalDocumentMetadata;
  bodyMarkdown?: string;
} {
  const read = readOptionalMarkdownFile(workspaceRoot, relativePath, path.posix.basename(relativePath), readContext);
  if (read.state !== "readable") {
    return read;
  }
  try {
    const parsed = parseCanonicalMarkdownDocument(read.bodyMarkdown ?? "");
    return {
      state: "readable",
      bodyMarkdown: parsed.bodyMarkdown,
      metadata: parsed.metadata,
    };
  } catch (error) {
    return { state: "read-error", readError: errorMessage(error) };
  }
}

function resolveOptionalIssueFixCardAdvisoryContext(
  workspaceRoot: string,
  context: IssueFixCardContext,
): IssueFixCardAdvisoryContext {
  const canonical = readCanonicalIssueDocument(workspaceRoot, context.architectReviewPath, context.readContext);
  if (canonical.state !== "missing") {
    return { path: context.architectReviewPath, ...canonical };
  }

  const draftsRoot = containedPath(workspaceRoot, path.join("issues", "Architect_Drafts"));
  if (!fs.existsSync(draftsRoot)) {
    return { path: context.architectReviewPath, state: "missing" };
  }
  const matches: Array<{ bodyMarkdown: string; modifiedAt: number; path: string }> = [];
  try {
    for (const directory of fs.readdirSync(draftsRoot, { withFileTypes: true })) {
      if (!directory.isDirectory()) continue;
      const relativePath = normalizeRelativePath(path.join(
        "issues",
        "Architect_Drafts",
        directory.name,
        "fix-card-advisory-review.md",
      ));
      const absolutePath = containedPath(workspaceRoot, relativePath);
      if (!fs.existsSync(absolutePath)) continue;
      const stats = fs.lstatSync(absolutePath);
      if (!stats.isFile() || stats.isSymbolicLink()) continue;
      const bodyMarkdown = fs.readFileSync(absolutePath, "utf8");
      if (!bodyMarkdown.includes(context.contractPath) || !bodyMarkdown.includes(context.implementerReportPath)) {
        continue;
      }
      matches.push({ bodyMarkdown, modifiedAt: stats.mtimeMs, path: relativePath });
    }
  } catch (error) {
    return {
      path: context.architectReviewPath,
      state: "read-error",
      readError: `Optional advisory context could not be inspected: ${errorMessage(error)}`,
    };
  }
  const latest = matches.sort((left, right) => right.modifiedAt - left.modifiedAt)[0];
  return latest
    ? { path: latest.path, state: "readable", bodyMarkdown: latest.bodyMarkdown }
    : { path: context.architectReviewPath, state: "missing" };
}

function requireApprovedIssueFixCardContract(workspaceRoot: string, context: IssueFixCardContext) {
  const contract = readCanonicalIssueDocument(workspaceRoot, context.contractPath, context.readContext);
  if (contract.state !== "readable" || !contract.metadata) {
    throw new Error(contract.readError ?? "Approved Fix Card contract is required.");
  }
  if (
    contract.metadata.artifactType !== (context.implementationKind === "repair" ? "repair-work-card" : "fix-card") ||
    contract.metadata.participationRole !== "gatingReview" ||
    contract.metadata.identity.issueId !== context.issue.issueId ||
    contract.metadata.identity.fixCardId !== context.candidate.fixCardId ||
    Boolean(contract.metadata.identity.phaseId) ||
    Boolean(contract.metadata.identity.workCardId) ||
    Boolean(contract.metadata.identity.parentWorkCardId) ||
    !metadataMatchesIssueImplementation(contract.metadata, context)
  ) {
    throw new Error("Fix Card contract identity does not match the selected Issue/Fix Card.");
  }
  if (contract.metadata.documentDisposition.status !== "Approved") {
    throw new Error("Fix Card contract must be Approved before this action.");
  }
  return { metadata: contract.metadata, bodyMarkdown: contract.bodyMarkdown ?? "" };
}

function assertIssueFixCardReportMatches(
  workspaceRoot: string,
  context: IssueFixCardContext,
  contractRevision: number,
  metadata: CanonicalDocumentMetadata | undefined,
): void {
  if (!metadata) {
    throw new Error("Issue-owned Implementer Report is not canonical.");
  }
  if (
    metadata.artifactType !== "implementer-report" ||
    metadata.participationRole !== "gatingReview" ||
    metadata.identity.issueId !== context.issue.issueId ||
    metadata.identity.fixCardId !== context.candidate.fixCardId ||
    !metadataMatchesIssueImplementation(metadata, context) ||
    metadata.identity.phaseId ||
    metadata.identity.workCardId ||
    metadata.identity.parentWorkCardId
  ) {
    throw new Error("Issue-owned Implementer Report identity conflicts with the approved Fix Card.");
  }
  const expectedSource = [{ path: context.contractPath, revision: contractRevision }];
  if (JSON.stringify(metadata.sourceRevisions ?? []) !== JSON.stringify(expectedSource)) {
    throw new Error("Issue-owned Implementer Report source revision does not match the approved Fix Card.");
  }
  const absolutePath = containedPath(workspaceRoot, context.implementerReportPath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error("Issue-owned Implementer Report target disappeared during verification.");
  }
}

function metadataMatchesIssueImplementation(
  metadata: CanonicalDocumentMetadata,
  context: IssueFixCardContext,
): boolean {
  const currentImplementationId = stringMetadataValue(metadata.identity.currentImplementationId);
  const repairId = stringMetadataValue(metadata.identity.repairId);
  if (context.repairId) {
    return currentImplementationId === context.implementationId && repairId === context.repairId;
  }
  return !repairId && (!currentImplementationId || currentImplementationId === context.candidate.fixCardId);
}

function classifyIssueFixCardReportReadiness(
  workspaceRoot: string,
  context: IssueFixCardContext,
  contractRevision: number,
): { readiness: IssueFixCardReportReadiness; reason: string } {
  const report = readCanonicalIssueDocument(workspaceRoot, context.implementerReportPath, context.readContext);
  if (report.state === "missing") {
    return {
      readiness: "missing",
      reason: `Issue-owned Implementer Report is missing at the expected target: ${context.implementerReportPath}`,
    };
  }
  if (report.state !== "readable" || !report.metadata) {
    return {
      readiness: "invalid",
      reason: report.readError ?? "Issue-owned Implementer Report is not readable.",
    };
  }
  try {
    assertIssueFixCardReportMatches(workspaceRoot, context, contractRevision, report.metadata);
  } catch (error) {
    return { readiness: "invalid", reason: errorMessage(error) };
  }
  if (!["Pending", "Approved"].includes(report.metadata.documentDisposition.status)) {
    return {
      readiness: "invalid",
      reason: "Issue-owned Implementer Report disposition is not reviewable.",
    };
  }
  if (isReservedIssueFixCardReport(report.metadata, report.bodyMarkdown ?? "")) {
    return {
      readiness: "reserved-skeleton",
      reason: "Issue-owned Implementer Report is reserved but does not yet contain substantive Implementer evidence.",
    };
  }
  return {
    readiness: "ready-for-review",
    reason: "Issue-owned Implementer Report is current, identity-matching, source-matching, and contains substantive Implementer evidence.",
  };
}

function isReservedIssueFixCardReport(metadata: CanonicalDocumentMetadata, bodyMarkdown: string): boolean {
  const workflowData = metadata.workflowData;
  const metadataSkeleton =
    workflowData.repositoryVerification === "Pending Implementer verification." &&
    Array.isArray(workflowData.filesChanged) &&
    workflowData.filesChanged.length === 0 &&
    !String(workflowData.implementationSummary ?? "").trim();
  const bodySkeleton = bodyMarkdown.includes("Status: Pending Implementer completion.");
  return metadataSkeleton || bodySkeleton || !hasSubstantiveIssueFixCardReportBody(bodyMarkdown);
}

function hasSubstantiveIssueFixCardReportBody(bodyMarkdown: string): boolean {
  return bodyMarkdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("#"))
    .filter((line) => !line.startsWith("Approved Fix Card Contract:"))
    .filter((line) => !line.startsWith("Report target:"))
    .some((line) => line !== "Status: Pending Implementer completion.");
}

function issueFixCardDraftMetadata(
  context: IssueFixCardContext,
  input: {
    submissionId: string;
    temporaryDraftPath: string;
    draftRevision: number;
    sourceRevisions: CanonicalDocumentMetadata["sourceRevisions"];
    sourceFingerprints: Array<{ path: string; sha256: string }>;
    priorDraftPath?: string;
    priorDraftRevision?: number;
    revisionNotes?: string;
  },
): CanonicalDocumentMetadata {
  return {
    schemaVersion: 1,
    artifactType: "fix-card-draft",
    artifactRevision: 1,
    participationRole: "gatingReview",
    identity: {
      issueId: context.issue.issueId,
      fixCardId: context.candidate.fixCardId,
      candidateId: context.candidate.fixCardId,
      submissionId: input.submissionId,
      currentImplementationId: context.candidate.fixCardId,
    },
    sourceRevisions: input.sourceRevisions,
    workflowData: {
      ownerKind: "issue",
      issueId: context.issue.issueId,
      fixCardId: context.candidate.fixCardId,
      draftPath: input.temporaryDraftPath,
      finalFixCardTarget: context.contractPath,
      implementerReportTarget: context.implementerReportPath,
      draftRevision: input.draftRevision,
      returnTarget: "planning",
      candidate: context.candidate,
      issueResolutionPlanPath: context.planning.issueResolutionPlanPath,
      fixCardPlanPath: context.planning.fixCardPlanPath,
      createdAt: new Date().toISOString(),
      sourceFingerprints: input.sourceFingerprints,
      ...(input.priorDraftPath ? { priorDraftPath: input.priorDraftPath } : {}),
      ...(input.priorDraftRevision ? { priorDraftRevision: input.priorDraftRevision } : {}),
      ...(input.revisionNotes ? { operatorRevisionNotes: input.revisionNotes } : {}),
    },
    documentDisposition: { status: "Pending", notes: "", reviewedAt: null },
  };
}

function fixCardContractMetadata(
  context: IssueFixCardContext,
  sourceRevisions: CanonicalDocumentMetadata["sourceRevisions"],
): CanonicalDocumentMetadata {
  return {
    schemaVersion: 1,
    artifactType: "fix-card",
    artifactRevision: 1,
    participationRole: "gatingReview",
    identity: {
      issueId: context.issue.issueId,
      fixCardId: context.candidate.fixCardId,
      candidateId: context.candidate.fixCardId,
      currentImplementationId: context.implementationId,
    },
    sourceRevisions,
    workflowData: {
      ownerKind: "issue",
      issueId: context.issue.issueId,
      fixCardId: context.candidate.fixCardId,
      candidate: context.candidate,
      issueResolutionPlanPath: context.planning.issueResolutionPlanPath,
      fixCardPlanPath: context.planning.fixCardPlanPath,
      implementerReportTarget: context.implementerReportPath,
    },
    documentDisposition: { status: "Pending", notes: "", reviewedAt: null },
  };
}

function issueFixCardImplementerReportMetadata(
  context: IssueFixCardContext,
  contractRevision: number,
): CanonicalDocumentMetadata {
  return {
    schemaVersion: 1,
    artifactType: "implementer-report",
    artifactRevision: 1,
    participationRole: "gatingReview",
    identity: {
      issueId: context.issue.issueId,
      fixCardId: context.candidate.fixCardId,
      candidateId: context.candidate.fixCardId,
      currentImplementationId: context.implementationId,
      ...(context.repairId ? { repairId: context.repairId } : {}),
    },
    sourceRevisions: [{ path: context.contractPath, revision: contractRevision }],
    workflowData: {
      ownerKind: "issue",
      issueId: context.issue.issueId,
      fixCardId: context.candidate.fixCardId,
      currentImplementationId: context.implementationId,
      implementationKind: context.implementationKind,
      ...(context.repairId ? { repairId: context.repairId } : {}),
      repositoryVerification: "Pending Implementer verification.",
      filesChanged: [],
      implementationSummary: "",
      validationResults: [],
      acceptanceEvidence: [],
      deviations: [],
      blockers: [],
      remainingOperatorValidation: [],
    },
    documentDisposition: { status: "Pending", notes: "", reviewedAt: null },
  };
}

function issueFixCardImplementerReportBody(context: IssueFixCardContext, contractRevision: number): string {
  return [
    `# Implementer Report - ${context.implementationId}`,
    "",
    `${context.implementationKind === "repair" ? "Approved Repair Contract" : "Approved Fix Card Contract"}: ${context.contractPath} revision ${contractRevision}`,
    `Report target: ${context.implementerReportPath}`,
    "",
    "Status: Pending Implementer completion.",
    "",
    "## Repository Verification",
    "## Implementation Summary",
    "## Files Created",
    "## Files Modified",
    "## Acceptance Criteria Evidence",
    "## Commands and Results",
    "## Validation Performed",
    "## Validation Skipped",
    "## Operator Validation Remaining",
    "## Scope Expansion and Deviations",
    "## Residual Risks and Blockers",
    "## Git Actions",
    "",
  ].join("\n");
}

function parseIssueFixCardAdvisoryRecommendation(
  bodyMarkdown: string | undefined,
): IssueFixCardAdvisoryRecommendation | undefined {
  if (!bodyMarkdown) {
    return undefined;
  }
  const section = extractMarkdownSection(bodyMarkdown, "Advisory Recommendation") ??
    extractMarkdownSection(bodyMarkdown, "Suggested Operator Decision");
  const trimmed = section?.trim();
  if (trimmed === "Validate Passed" || trimmed === "Request Repair" || trimmed === "Inconclusive") {
    return trimmed;
  }
  return undefined;
}

function buildIssueFixCardPlanningHandoffInstruction(
  workspaceRoot: string,
  context: IssueFixCardContext,
  submission: IssueFixCardDraftSubmission,
): string {
  const binding = resolveMcpWorkspaceBindingForPrompt(workspaceRoot);
  const draft = readCanonicalIssueDocument(workspaceRoot, submission.temporaryDraftPath);
  const revisionNotes = stringMetadataValue(draft.metadata?.workflowData.operatorRevisionNotes);
  const revisionLines = (submission.draftRevision ?? 1) > 1
    ? [
        "",
        "Revision context:",
        `- This is application-controlled draft revision ${submission.draftRevision}.`,
        "- Preserve the current draft body where it remains correct and address these exact Operator notes:",
        "",
        "```text",
        revisionNotes ?? "",
        "```",
      ]
    : [];
  return [
    "# Fix Card Planning Handoff",
    "",
    ...buildMcpWorkspaceBindingPromptBlock(workspaceRoot),
    "",
    "Selected Issue/Fix Card context:",
    `- Issue ID: ${context.issue.issueId}`,
    `- Issue title: ${context.issue.title}`,
    `- Fix Card ID: ${context.candidate.fixCardId}`,
    `- Fix Card title: ${context.candidate.title}`,
    `- Candidate purpose: ${context.candidate.purpose}`,
    `- Issue Resolution Plan path: ${context.planning.issueResolutionPlanPath}`,
    `- Fix Card Plan path: ${context.planning.fixCardPlanPath}`,
    `- Final Fix Card contract path: ${context.contractPath}`,
    `- Implementer Report target: ${context.implementerReportPath}`,
    `- Controlled Fix Card draft path: ${submission.temporaryDraftPath}`,
    `- Controlled draft submission ID: ${submission.submissionId}`,
    `- Controlled draft revision: ${submission.draftRevision ?? 1}`,
    "",
    "Write only the Markdown body of the existing application-controlled Fix Card draft. ChampCity owns the metadata envelope, identity, paths, source revisions, draft revision, and disposition. Do not generate, rewrite, merge, or infer metadata.",
    "After the body-only write succeeds, the same controlled draft is immediately ready for Operator review. Do not create or promote the final Fix Card; Operator approval directs ChampCity to finalize it.",
    ...revisionLines,
    "",
    ...buildImplementationValidationScopeGuidance("fix-card"),
    "Required body-only Markdown sections:",
    ...requiredFixCardContractSections.map((section) => `- ## ${section}`),
    "",
    "The contract should implement only the selected candidate purpose within the governing Issue Resolution Plan and Fix Card Plan boundaries and use Issue/Fix Card terminology.",
    "Do not reserve capabilities merely because another numbered Fix Card owns them; follow the selected candidate purpose literally. Do not implement Close / Next beyond the selected candidate boundary.",
    "",
    "Use this exact artifact_toolbox.replace_markdown_body invocation shape:",
    "",
    "```json",
    ...buildReplaceMarkdownBodyJsonBlock(workspaceRoot, {
      relativePath: submission.temporaryDraftPath,
      submissionId: submission.submissionId,
      expectedMetadataSha256: submission.metadataSha256 ?? "<missing controlled metadata hash>",
      expectedBodySha256: submission.bodySha256 ?? "<missing controlled body hash>",
      bodyPlaceholder: "<complete Fix Card contract body-only Markdown>",
    }),
    "```",
    "",
    `Bound workspaceId reminder: ${binding.workspaceId}`,
  ].join("\n");
}

function cleanupSingleSubmissionDraft(workspaceRoot: string, temporaryDraftPath: string): void {
  const draftPath = containedPath(workspaceRoot, temporaryDraftPath);
  try {
    fs.unlinkSync(draftPath);
    const submissionDirectory = path.dirname(draftPath);
    const draftsRoot = containedPath(workspaceRoot, path.join("issues", "Architect_Drafts"));
    if (isInside(draftsRoot, submissionDirectory)) {
      fs.rmdirSync(submissionDirectory);
    }
  } catch {
    // Cleanup is best-effort after successful promotion.
  }
}

function getIssuePlanningProjectionWithoutAutoPromotion(
  workspaceRoot: string,
  issueId: string,
  readContext?: IssueProjectionReadContext,
): IssuePlanningProjection {
  const key = submissionKey(workspaceRoot, issueId);
  const submission = activePlanningSubmissions.get(key);
  activePlanningSubmissions.delete(key);
  try {
    return getIssuePlanningProjection(workspaceRoot, issueId, readContext);
  } finally {
    if (submission) {
      activePlanningSubmissions.set(key, submission);
    }
  }
}

function issuePlanningPaths(issueId: string): {
  architectInvestigationPath: string;
  architectReviewPath: string;
  issueResolutionPlanPath: string;
  fixCardPlanPath: string;
  planningReviewPath: string;
} {
  return {
    architectInvestigationPath: normalizeRelativePath(path.join("issues", issueId, "ARCHITECT_INVESTIGATION.md")),
    architectReviewPath: normalizeRelativePath(path.join("issues", issueId, "ARCHITECT_REVIEW.md")),
    issueResolutionPlanPath: normalizeRelativePath(path.join("issues", issueId, "ISSUE_RESOLUTION_PLAN.md")),
    fixCardPlanPath: normalizeRelativePath(path.join("issues", issueId, "FIX_CARD_PLAN.md")),
    planningReviewPath: normalizeRelativePath(path.join("issues", issueId, "ISSUE_PLANNING_REVIEW.md")),
  };
}

function isIssuePlanningEligible(
  issueId: string,
  architectInvestigationPath: string,
  investigationRead: MarkdownReadResult,
  recommendation: IssueArchitectRecommendation | undefined,
  review: IssueArchitectReviewRecord | undefined,
): boolean {
  return investigationRead.state === "readable" &&
    recommendation === "Proceed in Issue Resolution" &&
    review?.issueId === issueId &&
    review.investigationPath === architectInvestigationPath &&
    review.architectRecommendation === recommendation &&
    review.disposition === "Approved";
}

function buildIssuePlanningProjection(input: {
  activeSubmission?: IssuePlanningDraftSubmission;
  architectInvestigationRead: MarkdownReadResult;
  architectPlanningEligible: boolean;
  architectRecommendation?: IssueArchitectRecommendation;
  architectReview?: IssueArchitectReviewRecord;
  architectReviewRead: MarkdownReadResult;
  canApplyReview: boolean;
  canCopyHandoff: boolean;
  canPrepareHandoff: boolean;
  fixCardPlanRead: MarkdownReadResult;
  fixCardPlanValidation?: { candidates: IssueFixCardPlanCandidate[]; findings: string[] };
  issue: IssueRecordProjection;
  issueResolutionPlanRead: MarkdownReadResult;
  paths: ReturnType<typeof issuePlanningPaths>;
  review?: IssuePlanningReviewRecord;
  reviewRead: MarkdownReadResult;
  status: IssuePlanningStatus;
  statusMessage: string;
}): IssuePlanningProjection {
  const fixCardPlanValidation = input.fixCardPlanValidation ??
    (input.fixCardPlanRead.bodyMarkdown
      ? parseAndValidateFixCardPlan(input.issue.issueId, input.fixCardPlanRead.bodyMarkdown)
      : { candidates: [], findings: [] });
  const fixCardsEligible =
    input.status === "approved-ready-for-fix-cards" &&
    input.review?.disposition === "Approved" &&
    fixCardPlanValidation.findings.length === 0 &&
    fixCardPlanValidation.candidates.length > 0;
  return {
    issueId: input.issue.issueId,
    title: input.issue.title,
    issueRecordPath: input.issue.recordPath,
    issueRecordMarkdown: input.issue.bodyMarkdown,
    issueRecordState: input.issue.recordState,
    issueRecordReadError: input.issue.readError,
    architectInvestigationPath: input.paths.architectInvestigationPath,
    architectInvestigationState: input.architectInvestigationRead.state,
    architectInvestigationMarkdown: input.architectInvestigationRead.bodyMarkdown,
    architectReviewPath: input.paths.architectReviewPath,
    architectReviewState: input.architectReviewRead.state,
    architectReviewMarkdown: input.architectReviewRead.bodyMarkdown,
    architectReviewReadError: input.architectReviewRead.readError,
    architectReviewDisposition: input.architectReview?.disposition,
    architectRecommendation: input.architectRecommendation,
    architectPlanningEligible: input.architectPlanningEligible,
    issueResolutionPlanPath: input.paths.issueResolutionPlanPath,
    issueResolutionPlanState: input.issueResolutionPlanRead.state,
    issueResolutionPlanMarkdown: input.issueResolutionPlanRead.bodyMarkdown,
    issueResolutionPlanReadError: input.issueResolutionPlanRead.readError,
    fixCardPlanPath: input.paths.fixCardPlanPath,
    fixCardPlanState: input.fixCardPlanRead.state,
    fixCardPlanMarkdown: input.fixCardPlanRead.bodyMarkdown,
    fixCardPlanReadError: input.fixCardPlanRead.readError,
    fixCardCandidates: fixCardPlanValidation.candidates,
    fixCardPlanValidationFindings: fixCardPlanValidation.findings,
    reviewPath: input.paths.planningReviewPath,
    reviewState: input.reviewRead.state,
    reviewMarkdown: input.reviewRead.bodyMarkdown,
    operatorDisposition: input.review?.disposition,
    operatorReviewNotes: input.review?.operatorNotes,
    reviewReadError: input.reviewRead.readError,
    status: input.status,
    statusMessage: input.statusMessage,
    workflowStatus: {
      fixCardsEligible,
      issueId: input.issue.issueId,
      issuePlanningEligible: input.architectPlanningEligible,
      reason: input.statusMessage,
      stageId: "issue-planning",
      stageLabel: "Issue Planning",
      state: input.status,
      stateLabel: stateLabelForIssuePlanningStatus(input.status),
    },
    fixCardsEligible,
    activeSubmission: input.activeSubmission,
    canPrepareHandoff: input.canPrepareHandoff,
    canCopyHandoff: input.canCopyHandoff,
    canApplyReview: input.canApplyReview,
    revisionSource: input.status === "revision-requested" && input.review?.disposition === "RevisionRequested"
      ? "issue-planning-review"
      : undefined,
  };
}

function emptyIssuePlanningProjection(): IssuePlanningProjection {
  const status: IssuePlanningStatus = "blocked-no-issue";
  return {
    issueId: "",
    title: "No issue selected",
    issueRecordPath: "issues/ISSUE_NNN/ISSUE_RECORD.md",
    issueRecordState: "missing",
    issueRecordReadError: "No issue selected.",
    architectInvestigationPath: "issues/ISSUE_NNN/ARCHITECT_INVESTIGATION.md",
    architectInvestigationState: "missing",
    architectReviewPath: "issues/ISSUE_NNN/ARCHITECT_REVIEW.md",
    architectReviewState: "missing",
    architectPlanningEligible: false,
    issueResolutionPlanPath: "issues/ISSUE_NNN/ISSUE_RESOLUTION_PLAN.md",
    issueResolutionPlanState: "missing",
    fixCardPlanPath: "issues/ISSUE_NNN/FIX_CARD_PLAN.md",
    fixCardPlanState: "missing",
    fixCardCandidates: [],
    fixCardPlanValidationFindings: [],
    reviewPath: "issues/ISSUE_NNN/ISSUE_PLANNING_REVIEW.md",
    reviewState: "missing",
    status,
    statusMessage: "Select an eligible Issue before opening Issue Planning.",
    workflowStatus: {
      fixCardsEligible: false,
      issueId: "",
      issuePlanningEligible: false,
      reason: "Select an eligible Issue before opening Issue Planning.",
      stageId: "issue-planning",
      stageLabel: "Issue Planning",
      state: status,
      stateLabel: stateLabelForIssuePlanningStatus(status),
    },
    fixCardsEligible: false,
    canPrepareHandoff: false,
    canCopyHandoff: false,
    canApplyReview: false,
  };
}

function emptyIssueResolutionNavigationProjection(): IssueResolutionNavigationProjection {
  return {
    issueId: "",
    title: "No issue selected",
    stages: [
      {
        available: true,
        reason: "Issue Intake is always available for the selected project.",
        stageId: "intake",
        stateLabel: "Available",
      },
      {
        available: false,
        reason: "Select a readable Issue before opening Architect Planning.",
        stageId: "architect-planning",
        stateLabel: "Unavailable",
      },
      {
        available: false,
        reason: "Issue Planning requires Approved Architect Planning with recommendation Proceed in Issue Resolution.",
        stageId: "issue-planning",
        stateLabel: "Unavailable",
      },
      {
        available: false,
        reason: "Fix Cards requires Approved Issue Planning with a validated Fix Card Map.",
        stageId: "fix-cards",
        stateLabel: "Unavailable",
      },
      {
        available: false,
        reason: "Issue Validation requires complete current Fix Card close record.",
        stageId: "issue-validation",
        stateLabel: "Unavailable",
      },
      {
        available: false,
        reason: "Issue Close requires exact current Approved aggregate Issue Validation.",
        stageId: "issue-close",
        stateLabel: "Unavailable",
      },
    ],
    issuePlanningAvailable: false,
    fixCardsAvailable: false,
    allFixCardsClosed: false,
    issueValidationAvailable: false,
    issueCloseAvailable: false,
    currentStageId: "intake",
    workflowStatus: null,
    fixCardsWorkflowStatus: null,
  };
}

function buildIssuePlanningAvailabilityWorkflowStatus(issueId: string): IssueWorkflowStatusProjection {
  return {
    fixCardsEligible: false,
    issueId,
    issuePlanningEligible: true,
    reason: "Approved Architect Planning makes Issue Planning available.",
    stageId: "issue-planning",
    stageLabel: "Issue Planning",
    state: "ready-for-handoff",
    stateLabel: "Ready for Planning Handoff",
  };
}

function buildFixCardsWorkflowStatus(
  issueId: string,
  state: "fix-card-map-ready" | "blocked-unreadable-record" | "blocked-planning-not-approved" | "needs-attention",
  stateLabel: string,
  reason: string,
  issuePlanningEligible = true,
): IssueWorkflowStatusProjection {
  return {
    fixCardsEligible: state === "fix-card-map-ready",
    issueId,
    issuePlanningEligible,
    reason,
    stageId: "fix-cards",
    stageLabel: "Fix Cards",
    state,
    stateLabel,
  };
}

function stateLabelForIssuePlanningStatus(status: IssuePlanningStatus): string {
  switch (status) {
    case "blocked-no-issue":
      return "No Issue Selected";
    case "blocked-unreadable-record":
      return "Issue Record Unreadable";
    case "blocked-architect-planning-not-eligible":
      return "Architect Planning Not Eligible";
    case "ready-for-handoff":
      return "Ready for Planning Handoff";
    case "handoff-prepared":
      return "Handoff Prepared";
    case "waiting-for-drafts":
      return "Waiting for Drafts";
    case "awaiting-operator-review":
      return "Awaiting Operator Review";
    case "revision-requested":
      return "Revision Requested";
    case "approved-ready-for-fix-cards":
      return "Approved - Ready for Fix Cards";
    case "rejected-needs-attention":
      return "Rejected / Needs Attention";
    case "needs-attention":
      return "Needs Attention";
  }
}

function bothPlanningFinalsMissing(
  issueResolutionPlanRead: MarkdownReadResult,
  fixCardPlanRead: MarkdownReadResult,
): boolean {
  return issueResolutionPlanRead.state === "missing" && fixCardPlanRead.state === "missing";
}

function planningBundleLooksGoverned(
  issueId: string,
  issueResolutionPlanMarkdown: string,
  fixCardPlanMarkdown: string,
): boolean {
  const expectedIssueResolutionPlanH1 = `# ${issueId} \u2014 Issue Resolution Plan`;
  const expectedFixCardPlanH1 = `# ${issueId} \u2014 Fix Card Plan`;
  const issuePlanFirstHeading = firstMarkdownH1(issueResolutionPlanMarkdown);
  const fixCardPlanFirstHeading = firstMarkdownH1(fixCardPlanMarkdown);
  const generatedIssuePlanSectionCount = requiredIssueResolutionPlanSections
    .filter((section) => extractMarkdownSection(issueResolutionPlanMarkdown, section) !== null)
    .length;
  const generatedFixCardPlanSectionCount = requiredFixCardPlanSections
    .filter((section) => extractMarkdownSection(fixCardPlanMarkdown, section) !== null)
    .length;

  return /```champcity-fix-card-plan\s*\r?\n/.test(fixCardPlanMarkdown) ||
    (issuePlanFirstHeading === expectedIssueResolutionPlanH1 && generatedIssuePlanSectionCount >= 3) ||
    (fixCardPlanFirstHeading === expectedFixCardPlanH1 && generatedFixCardPlanSectionCount >= 2);
}

function buildIssuePlanningHandoffInstruction(
  workspaceRoot: string,
  projection: IssuePlanningProjection,
  issueResolutionPlanDraftPath: string,
  fixCardPlanDraftPath: string,
): string {
  const binding = resolveMcpWorkspaceBindingForPrompt(workspaceRoot);
  const bootstrapAdoptionLines = isBootstrapPlanningAdoptionProjection(projection)
    ? [
        "",
        "Bootstrap adoption context:",
        "- Existing planning files are preserved pre-FC04/manual planning evidence, not an approved generated FC04 planning bundle.",
        `- Prior Issue Resolution Plan context path: ${projection.issueResolutionPlanPath}`,
        `- Prior Fix Card Plan context path: ${projection.fixCardPlanPath}`,
        "- Preserve useful bounded planning and decomposition decisions when they remain consistent with the accepted Issue Record, Architect Investigation, and Architect Review.",
        "- Browser GPT must still write exactly two fresh FC04-format temporary drafts. Do not directly edit, overwrite, rename, migrate, or delete the prior planning files.",
        "",
        "Prior Issue Resolution Plan context:",
        "",
        "```markdown",
        projection.issueResolutionPlanMarkdown ?? "",
        "```",
        "",
        "Prior Fix Card Plan context:",
        "",
        "```markdown",
        projection.fixCardPlanMarkdown ?? "",
        "```",
      ]
    : [];
  const planningReviewRevisionLines = projection.operatorDisposition === "RevisionRequested"
    ? [
        "",
        "Revision context:",
        `- Current review path: ${projection.reviewPath}`,
        "- The Operator disposition is RevisionRequested.",
        "- Preserve the prior planning bundle and review. Browser GPT must write only fresh temporary drafts.",
        "- Address these exact Operator notes:",
        "",
        "```text",
        projection.operatorReviewNotes ?? "",
        "```",
        "",
        "Current Issue Resolution Plan to revise:",
        "",
        "```markdown",
        projection.issueResolutionPlanMarkdown ?? "",
        "```",
        "",
        "Current Fix Card Plan to revise:",
        "",
        "```markdown",
        projection.fixCardPlanMarkdown ?? "",
        "```",
      ]
    : [];
  const issueValidationRevisionLines = projection.revisionSource === "issue-validation"
    ? [
        "",
        "Aggregate Issue Validation corrective-revision basis:",
        `- Governing Issue Validation Record: ${projection.issueValidationRevisionRecordPath ?? "Unavailable"}`,
        "- The Operator requested further bounded corrective work after reviewing the combined correction.",
        "- Remain strictly within the accepted Issue scope and do not create any Development parent identity.",
        "- Preserve every previously closed Fix Card candidate exactly: ID, order, title, purpose, dependencies, and evidence paths.",
        "- Add at least one new uniquely identified bounded corrective Fix Card candidate after the preserved closed set.",
        "- Do not remove, renumber, retitle, repurpose, or rewrite dependency meaning for a previously closed candidate.",
        "- The existing Approved ISSUE_PLANNING_REVIEW.md remains a truthful historical execution record and must not be edited in place.",
        "- Exact bounded unresolved outcome / corrective-work requirement:",
        "",
        "```text",
        projection.issueValidationBoundedCorrectiveWork ?? "",
        "```",
        "",
        "Current RevisionRequested Issue Validation Record:",
        "",
        "```markdown",
        projection.issueValidationRevisionRecordMarkdown ?? "",
        "```",
        "",
        "Previously closed candidate identities that must remain exact:",
        "",
        "```json",
        JSON.stringify(projection.fixCardCandidates.map(({ lifecycle: _lifecycle, ...candidate }) => candidate), null, 2),
        "```",
        "",
        "Current Issue Resolution Plan to revise:",
        "",
        "```markdown",
        projection.issueResolutionPlanMarkdown ?? "",
        "```",
        "",
        "Current Fix Card Plan to revise:",
        "",
        "```markdown",
        projection.fixCardPlanMarkdown ?? "",
        "```",
      ]
    : [];
  const revisionLines = projection.revisionSource === "issue-validation"
    ? issueValidationRevisionLines
    : planningReviewRevisionLines;
  const lines = [
    "# Issue Planning Handoff",
    "",
    ...buildMcpWorkspaceBindingPromptBlock(workspaceRoot),
    "",
    "Selected Issue context:",
    `- Issue ID: ${projection.issueId}`,
    `- Issue title: ${projection.title}`,
    `- Issue Record path: ${projection.issueRecordPath}`,
    `- Accepted Architect Investigation path: ${projection.architectInvestigationPath}`,
    `- Architect Review path: ${projection.architectReviewPath}`,
    `- Architect Review disposition: ${projection.architectReviewDisposition ?? "Unavailable"}`,
    `- Architect Recommendation: ${projection.architectRecommendation ?? "Unavailable"}`,
    `- Final Issue Resolution Plan path: ${projection.issueResolutionPlanPath}`,
    `- Final Fix Card Plan path: ${projection.fixCardPlanPath}`,
    `- Temporary Issue Resolution Plan draft path: ${issueResolutionPlanDraftPath}`,
    `- Temporary Fix Card Plan draft path: ${fixCardPlanDraftPath}`,
    "",
    "You are the Issue Planning Architect for this selected project. Translate the accepted correction architecture into one coherent bounded implementation plan. Do not reinvestigate the Issue from scratch and do not silently overturn the accepted Architect recommendation.",
    "",
    "Read the Issue Record, the accepted Architect Investigation, and ARCHITECT_REVIEW.md through the bound ChampCity MCP workspace. If repository evidence discovered during planning materially contradicts the accepted investigation, or the correction cannot reasonably remain bounded without becoming phase-like or multi-phase product development, stop and surface that as a material Operator decision rather than manufacturing an oversized Fix Card Plan.",
    "",
    "Otherwise proceed without another question gate. Do not create Issue phases, Development Phase parentage, Work Card execution contracts, Fix Card execution loops, validation records, lifecycle result fields, JSON sidecars, review artifacts, or final planning files.",
    ...bootstrapAdoptionLines,
    ...revisionLines,
    "",
    "Write exactly two body-only Markdown drafts using artifact_toolbox.write_markdown_artifact with overwrite false. Write only the temporary paths below. ChampCity will validate both drafts and atomically promote both final planning files.",
    "",
    "Issue Resolution Plan requirements:",
    "",
    "```markdown",
    `# ${projection.issueId} \u2014 Issue Resolution Plan`,
    "",
    "## Accepted Correction Objective",
    "## Bounded Scope",
    "## Non-Scope",
    "## Architecture Direction",
    "## Preservation Requirements",
    "## Dependencies and Sequencing",
    "## Risks",
    "## Validation Strategy",
    "## Completion Criteria",
    "```",
    "",
    "Fix Card Plan requirements:",
    "",
    "```markdown",
    `# ${projection.issueId} \u2014 Fix Card Plan`,
    "",
    "## Planning Basis",
    "## Fix Card Decomposition",
    "## Fix Card Map",
    "```champcity-fix-card-plan",
    "[",
    "  {",
    `    \"fixCardId\": \"${projection.issueId}-FC01\",`,
    "    \"order\": 1,",
    "    \"title\": \"...\",",
    "    \"purpose\": \"...\",",
    "    \"dependsOn\": [],",
    "    \"evidencePaths\": [\"issues/.../ARCHITECT_INVESTIGATION.md\"]",
    "  }",
    "]",
    "```",
    "```",
    "",
    "The Fix Card Plan must contain exactly one champcity-fix-card-plan fenced block. Candidate IDs must belong to the selected Issue and be sequential FC01, FC02, and so on. Dependencies must reference only same-plan candidates and contain no cycles. Evidence paths must be repository-relative strings. Do not persist completed, validation disposition, repair state, or other lifecycle result fields.",
    "",
    "Use this exact artifact_toolbox.write_markdown_artifact invocation for the Issue Resolution Plan draft:",
    "",
    "```json",
    ...buildWriteMarkdownArtifactJsonBlock(
      workspaceRoot,
      issueResolutionPlanDraftPath,
      "<complete Issue Resolution Plan body-only Markdown>",
    ),
    "```",
    "",
    "Use this exact artifact_toolbox.write_markdown_artifact invocation for the Fix Card Plan draft:",
    "",
    "```json",
    ...buildWriteMarkdownArtifactJsonBlock(
      workspaceRoot,
      fixCardPlanDraftPath,
      "<complete Fix Card Plan body-only Markdown>",
    ),
    "```",
    "",
    `Bound workspaceId reminder: ${binding.workspaceId}`,
  ];
  return lines.join("\n");
}

function isBootstrapPlanningAdoptionProjection(projection: IssuePlanningProjection): boolean {
  return projection.status === "needs-attention" &&
    projection.canPrepareHandoff &&
    projection.reviewState === "missing" &&
    projection.issueResolutionPlanState === "readable" &&
    projection.fixCardPlanState === "readable" &&
    projection.statusMessage.startsWith("Bootstrap planning requires FC04 adoption");
}

function validateIssueResolutionPlan(issueId: string, bodyMarkdown: string): string[] {
  const findings: string[] = [];
  const trimmed = bodyMarkdown.trim();
  if (trimmed.length < 500) {
    findings.push("Issue Resolution Plan is not substantive Markdown");
  }
  const expectedH1 = `# ${issueId} \u2014 Issue Resolution Plan`;
  const firstHeading = trimmed.split(/\r?\n/).find((line) => line.trim().startsWith("# "));
  if (firstHeading?.trim() !== expectedH1) {
    findings.push(`Issue Resolution Plan H1 must be exactly "${expectedH1}"`);
  }
  if (/<!--|^---\s*$/m.test(bodyMarkdown)) {
    findings.push("Issue Resolution Plan contains application metadata delimiters");
  }
  if (/^##\s+Issue Phase\b/im.test(bodyMarkdown) || /\bIssue Phase\s+\d+/i.test(bodyMarkdown)) {
    findings.push("Issue Resolution Plan must not create an Issue Phase hierarchy");
  }
  for (const section of requiredIssueResolutionPlanSections) {
    const sectionBody = extractMarkdownSection(bodyMarkdown, section);
    if (sectionBody === null) {
      findings.push(`Issue Resolution Plan missing required section: ${section}`);
    } else if (isEmptyPlaceholderSection(sectionBody)) {
      findings.push(`Issue Resolution Plan section is empty or placeholder: ${section}`);
    }
  }
  return findings;
}

function parseAndValidateFixCardPlan(
  issueId: string,
  bodyMarkdown: string,
): { candidates: IssueFixCardPlanCandidate[]; findings: string[] } {
  const findings: string[] = [];
  const trimmed = bodyMarkdown.trim();
  if (trimmed.length < 500) {
    findings.push("Fix Card Plan is not substantive Markdown");
  }
  const expectedH1 = `# ${issueId} \u2014 Fix Card Plan`;
  const firstHeading = trimmed.split(/\r?\n/).find((line) => line.trim().startsWith("# "));
  if (firstHeading?.trim() !== expectedH1) {
    findings.push(`Fix Card Plan H1 must be exactly "${expectedH1}"`);
  }
  if (/<!--|^---\s*$/m.test(bodyMarkdown)) {
    findings.push("Fix Card Plan contains application metadata delimiters");
  }
  const blocks = [...bodyMarkdown.matchAll(/```champcity-fix-card-plan\s*\r?\n([\s\S]*?)\r?\n```/g)];
  if (blocks.length !== 1) {
    findings.push("Fix Card Plan must contain exactly one champcity-fix-card-plan fenced block");
    return { candidates: [], findings };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(blocks[0][1]);
  } catch (error) {
    findings.push(`Fix Card Plan domain block is not valid JSON: ${errorMessage(error)}`);
    return { candidates: [], findings };
  }
  if (!Array.isArray(parsed)) {
    findings.push("Fix Card Plan domain block must be a JSON array");
    return { candidates: [], findings };
  }

  const candidates: IssueFixCardPlanCandidate[] = [];
  const seenIds = new Set<string>();
  const seenOrders = new Set<number>();
  const expectedIds = parsed.map((_, index) => `${issueId}-FC${String(index + 1).padStart(2, "0")}`);
  parsed.forEach((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      findings.push(`candidate ${index + 1} must be an object`);
      return;
    }
    const record = item as Record<string, unknown>;
    for (const forbidden of ["completed", "validationDisposition", "repairState", "lifecycleState", "status"]) {
      if (Object.prototype.hasOwnProperty.call(record, forbidden)) {
        findings.push(`candidate ${index + 1} must not persist lifecycle result field: ${forbidden}`);
      }
    }
    const fixCardId = typeof record.fixCardId === "string" ? record.fixCardId.trim() : "";
    const order = typeof record.order === "number" && Number.isInteger(record.order) ? record.order : NaN;
    const title = typeof record.title === "string" ? record.title.trim() : "";
    const purpose = typeof record.purpose === "string" ? record.purpose.trim() : "";
    const dependsOn = Array.isArray(record.dependsOn) && record.dependsOn.every((value) => typeof value === "string")
      ? record.dependsOn.map((value) => value.trim()).filter(Boolean)
      : null;
    const evidencePaths = Array.isArray(record.evidencePaths) && record.evidencePaths.every((value) => typeof value === "string")
      ? record.evidencePaths.map((value) => value.trim()).filter(Boolean)
      : null;

    if (fixCardId !== expectedIds[index]) {
      findings.push(`candidate ${index + 1} ID must be ${expectedIds[index]}`);
    }
    if (seenIds.has(fixCardId)) {
      findings.push(`duplicate Fix Card ID: ${fixCardId}`);
    }
    seenIds.add(fixCardId);
    if (order !== index + 1) {
      findings.push(`candidate ${fixCardId || index + 1} order must be ${index + 1}`);
    }
    if (seenOrders.has(order)) {
      findings.push(`duplicate Fix Card order: ${order}`);
    }
    seenOrders.add(order);
    if (title.length < 8) {
      findings.push(`candidate ${fixCardId || index + 1} title is not substantive`);
    }
    if (purpose.length < 20) {
      findings.push(`candidate ${fixCardId || index + 1} purpose is not substantive`);
    }
    if (!dependsOn) {
      findings.push(`candidate ${fixCardId || index + 1} dependsOn must be an array of strings`);
    }
    if (!evidencePaths || evidencePaths.length === 0) {
      findings.push(`candidate ${fixCardId || index + 1} evidencePaths must contain repository-relative strings`);
    } else if (evidencePaths.some((value) => path.isAbsolute(value) || value.includes("\\") || value.startsWith("../"))) {
      findings.push(`candidate ${fixCardId || index + 1} evidencePaths must be repository-relative slash paths`);
    }
    candidates.push({
      dependsOn: dependsOn ?? [],
      evidencePaths: evidencePaths ?? [],
      fixCardId,
      order: Number.isFinite(order) ? order : index + 1,
      purpose,
      title,
    });
  });

  if (candidates.length === 0) {
    findings.push("Fix Card Plan must contain at least one candidate");
  }
  for (const candidate of candidates) {
    for (const dependency of candidate.dependsOn) {
      if (!seenIds.has(dependency)) {
        findings.push(`${candidate.fixCardId} dependsOn unknown candidate ${dependency}`);
      }
    }
  }
  findings.push(...detectFixCardDependencyCycles(candidates));
  return { candidates: findings.length > 0 ? [] : candidates, findings };
}

function detectFixCardDependencyCycles(candidates: IssueFixCardPlanCandidate[]): string[] {
  const findings: string[] = [];
  const byId = new Map(candidates.map((candidate) => [candidate.fixCardId, candidate]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (candidateId: string, trail: string[]): void => {
    if (visiting.has(candidateId)) {
      findings.push(`Fix Card dependency cycle detected: ${[...trail, candidateId].join(" -> ")}`);
      return;
    }
    if (visited.has(candidateId)) {
      return;
    }
    visiting.add(candidateId);
    const candidate = byId.get(candidateId);
    for (const dependency of candidate?.dependsOn ?? []) {
      if (byId.has(dependency)) {
        visit(dependency, [...trail, candidateId]);
      }
    }
    visiting.delete(candidateId);
    visited.add(candidateId);
  };
  for (const candidate of candidates) {
    visit(candidate.fixCardId, []);
  }
  return findings;
}

function linkInitialPlanningBundle(
  issueResolutionPlanDraftPath: string,
  fixCardPlanDraftPath: string,
  issueResolutionPlanFinalPath: string,
  fixCardPlanFinalPath: string,
): void {
  let linkedIssueResolutionPlan = false;
  try {
    fs.linkSync(issueResolutionPlanDraftPath, issueResolutionPlanFinalPath);
    linkedIssueResolutionPlan = true;
    fs.linkSync(fixCardPlanDraftPath, fixCardPlanFinalPath);
  } catch (error) {
    if (linkedIssueResolutionPlan && fs.existsSync(issueResolutionPlanFinalPath)) {
      fs.unlinkSync(issueResolutionPlanFinalPath);
    }
    throw error;
  }
}

function replaceCurrentPlanningBundle(
  workspaceRoot: string,
  issueId: string,
  activeSubmission: IssuePlanningDraftSubmission,
  paths: ReturnType<typeof issuePlanningPaths>,
  options: { preserveReview: boolean },
): string[] {
  const issueResolutionPlanDraftPath = containedPath(workspaceRoot, activeSubmission.issueResolutionPlanDraftPath);
  const fixCardPlanDraftPath = containedPath(workspaceRoot, activeSubmission.fixCardPlanDraftPath);
  const issueResolutionPlanFinalPath = containedPath(workspaceRoot, paths.issueResolutionPlanPath);
  const fixCardPlanFinalPath = containedPath(workspaceRoot, paths.fixCardPlanPath);
  const reviewPath = containedPath(workspaceRoot, paths.planningReviewPath);
  if (options.preserveReview && !fs.existsSync(reviewPath)) {
    throw new Error("Revision replacement requires the current ISSUE_PLANNING_REVIEW.md.");
  }
  const history = reservePlanningHistoryPaths(workspaceRoot, issueId);
  fs.copyFileSync(issueResolutionPlanFinalPath, history.issueResolutionPlanPath, fs.constants.COPYFILE_EXCL);
  fs.copyFileSync(fixCardPlanFinalPath, history.fixCardPlanPath, fs.constants.COPYFILE_EXCL);
  if (options.preserveReview) {
    fs.copyFileSync(reviewPath, history.reviewPath, fs.constants.COPYFILE_EXCL);
  }

  const nextIssueResolutionPlanPath = containedPath(
    workspaceRoot,
    normalizeRelativePath(path.join("issues", issueId, `.ISSUE_RESOLUTION_PLAN.${activeSubmission.submissionId}.next.md`)),
  );
  const nextFixCardPlanPath = containedPath(
    workspaceRoot,
    normalizeRelativePath(path.join("issues", issueId, `.FIX_CARD_PLAN.${activeSubmission.submissionId}.next.md`)),
  );
  const backupIssueResolutionPlanPath = containedPath(
    workspaceRoot,
    normalizeRelativePath(path.join("issues", issueId, `.ISSUE_RESOLUTION_PLAN.${activeSubmission.submissionId}.previous.md`)),
  );
  const backupFixCardPlanPath = containedPath(
    workspaceRoot,
    normalizeRelativePath(path.join("issues", issueId, `.FIX_CARD_PLAN.${activeSubmission.submissionId}.previous.md`)),
  );
  const backupReviewPath = containedPath(
    workspaceRoot,
    normalizeRelativePath(path.join("issues", issueId, `.ISSUE_PLANNING_REVIEW.${activeSubmission.submissionId}.previous.md`)),
  );
  fs.copyFileSync(issueResolutionPlanDraftPath, nextIssueResolutionPlanPath, fs.constants.COPYFILE_EXCL);
  fs.copyFileSync(fixCardPlanDraftPath, nextFixCardPlanPath, fs.constants.COPYFILE_EXCL);

  let movedIssueResolutionPlan = false;
  let movedFixCardPlan = false;
  let movedReview = false;
  let promotedIssueResolutionPlan = false;
  let promotedFixCardPlan = false;
  try {
    fs.renameSync(issueResolutionPlanFinalPath, backupIssueResolutionPlanPath);
    movedIssueResolutionPlan = true;
    fs.renameSync(fixCardPlanFinalPath, backupFixCardPlanPath);
    movedFixCardPlan = true;
    if (options.preserveReview) {
      fs.renameSync(reviewPath, backupReviewPath);
      movedReview = true;
    }
    fs.renameSync(nextIssueResolutionPlanPath, issueResolutionPlanFinalPath);
    promotedIssueResolutionPlan = true;
    fs.renameSync(nextFixCardPlanPath, fixCardPlanFinalPath);
    promotedFixCardPlan = true;
  } catch (error) {
    if (promotedIssueResolutionPlan && fs.existsSync(issueResolutionPlanFinalPath)) {
      try {
        fs.unlinkSync(issueResolutionPlanFinalPath);
      } catch {
        // Best-effort rollback continues below.
      }
    }
    if (promotedFixCardPlan && fs.existsSync(fixCardPlanFinalPath)) {
      try {
        fs.unlinkSync(fixCardPlanFinalPath);
      } catch {
        // Best-effort rollback continues below.
      }
    }
    if (movedIssueResolutionPlan && fs.existsSync(backupIssueResolutionPlanPath) && !fs.existsSync(issueResolutionPlanFinalPath)) {
      fs.renameSync(backupIssueResolutionPlanPath, issueResolutionPlanFinalPath);
    }
    if (movedFixCardPlan && fs.existsSync(backupFixCardPlanPath) && !fs.existsSync(fixCardPlanFinalPath)) {
      fs.renameSync(backupFixCardPlanPath, fixCardPlanFinalPath);
    }
    if (movedReview && fs.existsSync(backupReviewPath) && !fs.existsSync(reviewPath)) {
      fs.renameSync(backupReviewPath, reviewPath);
    }
    for (const leftover of [nextIssueResolutionPlanPath, nextFixCardPlanPath]) {
      if (fs.existsSync(leftover)) {
        try {
          fs.unlinkSync(leftover);
        } catch {
          // Preserve original error.
        }
      }
    }
    throw error;
  }

  const cleanupWarnings: string[] = [];
  for (const cleanupPath of [
    backupIssueResolutionPlanPath,
    backupFixCardPlanPath,
    options.preserveReview ? backupReviewPath : undefined,
  ]) {
    if (!cleanupPath || !fs.existsSync(cleanupPath)) {
      continue;
    }
    try {
      fs.unlinkSync(cleanupPath);
    } catch (error) {
      cleanupWarnings.push(errorMessage(error));
    }
  }
  return cleanupWarnings;
}

function reservePlanningHistoryPaths(
  workspaceRoot: string,
  issueId: string,
): {
  issueResolutionPlanPath: string;
  fixCardPlanPath: string;
  reviewPath: string;
} {
  const historyRoot = containedPath(workspaceRoot, path.join("issues", issueId, planningHistoryDirectoryName));
  fs.mkdirSync(historyRoot, { recursive: true });
  for (let revision = 1; revision < 1000; revision += 1) {
    const revisionDirectory = path.join(historyRoot, `revision-${String(revision).padStart(3, "0")}`);
    if (fs.existsSync(revisionDirectory)) {
      continue;
    }
    fs.mkdirSync(revisionDirectory);
    return {
      fixCardPlanPath: path.join(revisionDirectory, "FIX_CARD_PLAN.md"),
      issueResolutionPlanPath: path.join(revisionDirectory, "ISSUE_RESOLUTION_PLAN.md"),
      reviewPath: path.join(revisionDirectory, "ISSUE_PLANNING_REVIEW.md"),
    };
  }
  throw new Error("No available Issue Planning history revision slot.");
}

function cleanupPlanningSubmissionDrafts(
  workspaceRoot: string,
  activeSubmission: IssuePlanningDraftSubmission,
): void {
  for (const temporaryDraftPath of [
    activeSubmission.issueResolutionPlanDraftPath,
    activeSubmission.fixCardPlanDraftPath,
  ]) {
    try {
      fs.unlinkSync(containedPath(workspaceRoot, temporaryDraftPath));
    } catch {
      // Cleanup is best-effort after successful promotion.
    }
  }
  try {
    const submissionDirectory = path.dirname(containedPath(workspaceRoot, activeSubmission.issueResolutionPlanDraftPath));
    const draftsRoot = containedPath(workspaceRoot, path.join("issues", "Architect_Drafts"));
    if (isInside(draftsRoot, submissionDirectory)) {
      fs.rmdirSync(submissionDirectory);
    }
  } catch {
    // Cleanup is best-effort after successful promotion.
  }
}

function formatIssuePlanningReview(record: IssuePlanningReviewRecord): string {
  return [
    `# ${record.issueId} - Issue Planning Review`,
    "",
    "## Issue ID",
    record.issueId,
    "",
    "## Issue Resolution Plan Path",
    record.issueResolutionPlanPath,
    "",
    "## Fix Card Plan Path",
    record.fixCardPlanPath,
    "",
    "## Operator Disposition",
    record.disposition,
    "",
    "## Operator Notes",
    record.operatorNotes,
    "",
  ].join("\n");
}

function parseIssuePlanningReview(bodyMarkdown: string): IssuePlanningReviewRecord | undefined {
  const issueId = extractMarkdownSection(bodyMarkdown, "Issue ID")?.trim();
  const issueResolutionPlanPath = extractMarkdownSection(bodyMarkdown, "Issue Resolution Plan Path")?.trim();
  const fixCardPlanPath = extractMarkdownSection(bodyMarkdown, "Fix Card Plan Path")?.trim();
  const disposition = parseAllowedIssueArchitectReviewDisposition(
    extractMarkdownSection(bodyMarkdown, "Operator Disposition")?.trim(),
  );
  if (!issueId || !issueResolutionPlanPath || !fixCardPlanPath || !disposition) {
    return undefined;
  }
  return {
    disposition,
    fixCardPlanPath,
    issueId,
    issueResolutionPlanPath,
    operatorNotes: extractMarkdownSection(bodyMarkdown, "Operator Notes")?.trim() ?? "",
  };
}

function firstMarkdownH1(bodyMarkdown: string): string | undefined {
  return bodyMarkdown.trim().split(/\r?\n/).find((line) => line.trim().startsWith("# "))?.trim();
}

function replaceRevisionRequestedInvestigation(
  workspaceRoot: string,
  issueId: string,
  activeSubmission: IssueArchitectDraftSubmission,
  finalInvestigationPath: string,
  reviewPath: string,
): void {
  const draftPath = containedPath(workspaceRoot, activeSubmission.temporaryDraftPath);
  const finalPath = containedPath(workspaceRoot, finalInvestigationPath);
  const currentReviewPath = containedPath(workspaceRoot, reviewPath);
  if (!fs.existsSync(currentReviewPath)) {
    throw new Error("Revision replacement requires the current ARCHITECT_REVIEW.md.");
  }

  const history = reserveArchitectHistoryPaths(workspaceRoot, issueId);
  fs.copyFileSync(finalPath, history.investigationPath, fs.constants.COPYFILE_EXCL);
  fs.copyFileSync(currentReviewPath, history.reviewPath, fs.constants.COPYFILE_EXCL);

  const nextPath = containedPath(
    workspaceRoot,
    normalizeRelativePath(path.join("issues", issueId, `.ARCHITECT_INVESTIGATION.${activeSubmission.submissionId}.next.md`)),
  );
  const backupPath = containedPath(
    workspaceRoot,
    normalizeRelativePath(path.join("issues", issueId, `.ARCHITECT_INVESTIGATION.${activeSubmission.submissionId}.previous.md`)),
  );
  fs.copyFileSync(draftPath, nextPath, fs.constants.COPYFILE_EXCL);

  let finalMovedToBackup = false;
  let nextMovedToFinal = false;
  try {
    fs.renameSync(finalPath, backupPath);
    finalMovedToBackup = true;
    fs.renameSync(nextPath, finalPath);
    nextMovedToFinal = true;
    fs.unlinkSync(currentReviewPath);
    fs.unlinkSync(backupPath);
  } catch (error) {
    if (nextMovedToFinal && finalMovedToBackup && !fs.existsSync(backupPath)) {
      throw error;
    }
    if (nextMovedToFinal) {
      try {
        fs.unlinkSync(finalPath);
      } catch {
        // Best-effort rollback continues below.
      }
    }
    if (finalMovedToBackup && fs.existsSync(backupPath) && !fs.existsSync(finalPath)) {
      fs.renameSync(backupPath, finalPath);
    }
    if (fs.existsSync(nextPath)) {
      try {
        fs.unlinkSync(nextPath);
      } catch {
        // Preserve the original error.
      }
    }
    throw error;
  }
}

function reserveArchitectHistoryPaths(
  workspaceRoot: string,
  issueId: string,
): {
  investigationPath: string;
  reviewPath: string;
} {
  const historyRoot = containedPath(workspaceRoot, path.join("issues", issueId, architectHistoryDirectoryName));
  fs.mkdirSync(historyRoot, { recursive: true });
  for (let revision = 1; revision < 1000; revision += 1) {
    const revisionDirectory = path.join(historyRoot, `revision-${String(revision).padStart(3, "0")}`);
    if (fs.existsSync(revisionDirectory)) {
      continue;
    }
    fs.mkdirSync(revisionDirectory);
    return {
      investigationPath: path.join(revisionDirectory, "ARCHITECT_INVESTIGATION.md"),
      reviewPath: path.join(revisionDirectory, "ARCHITECT_REVIEW.md"),
    };
  }
  throw new Error("No available Architect history revision slot.");
}

function formatIssueArchitectReview(record: IssueArchitectReviewRecord): string {
  return [
    `# ${record.issueId} - Architect Review`,
    "",
    "## Issue ID",
    record.issueId,
    "",
    "## Investigation Path",
    record.investigationPath,
    "",
    "## Architect Recommendation",
    record.architectRecommendation,
    "",
    "## Operator Disposition",
    record.disposition,
    "",
    "## Operator Notes",
    record.operatorNotes,
    "",
  ].join("\n");
}

function parseIssueArchitectReview(bodyMarkdown: string): IssueArchitectReviewRecord | undefined {
  const issueId = extractMarkdownSection(bodyMarkdown, "Issue ID")?.trim();
  const investigationPath = extractMarkdownSection(bodyMarkdown, "Investigation Path")?.trim();
  const architectRecommendation = parseAllowedArchitectRecommendation(
    extractMarkdownSection(bodyMarkdown, "Architect Recommendation")?.trim(),
  );
  const disposition = parseAllowedIssueArchitectReviewDisposition(
    extractMarkdownSection(bodyMarkdown, "Operator Disposition")?.trim(),
  );
  if (!issueId || !investigationPath || !architectRecommendation || !disposition) {
    return undefined;
  }
  return {
    issueId,
    investigationPath,
    architectRecommendation,
    disposition,
    operatorNotes: extractMarkdownSection(bodyMarkdown, "Operator Notes")?.trim() ?? "",
  };
}

function parseArchitectRecommendation(bodyMarkdown: string): IssueArchitectRecommendation | undefined {
  const headings = [...bodyMarkdown.matchAll(/^##\s+Architect Recommendation\s*$/gm)];
  if (headings.length !== 1) {
    return undefined;
  }
  return parseAllowedArchitectRecommendation(
    extractMarkdownSection(bodyMarkdown, "Architect Recommendation")?.trim(),
  );
}

function parseAllowedArchitectRecommendation(value: string | undefined): IssueArchitectRecommendation | undefined {
  return issueArchitectRecommendations.includes(value as IssueArchitectRecommendation)
    ? value as IssueArchitectRecommendation
    : undefined;
}

function requireIssueArchitectReviewDisposition(
  value: IssueArchitectReviewDisposition,
): IssueArchitectReviewDisposition {
  const disposition = parseAllowedIssueArchitectReviewDisposition(value);
  if (!disposition) {
    throw new Error("Unsupported Issue Architect review disposition.");
  }
  return disposition;
}

function parseAllowedIssueArchitectReviewDisposition(
  value: string | undefined,
): IssueArchitectReviewDisposition | undefined {
  return issueArchitectReviewDispositions.includes(value as IssueArchitectReviewDisposition)
    ? value as IssueArchitectReviewDisposition
    : undefined;
}

function discoverIssueDirectories(
  workspaceRoot: string,
  readContext?: IssueProjectionReadContext,
): IssueDirectoryEntry[] {
  const context = readContext ? issueReadContext(workspaceRoot, readContext) : undefined;
  if (context?.issueDirectories) {
    return [...context.issueDirectories];
  }
  issueProjectionReadTestHooks.onDirectoryDiscovery?.(path.resolve(workspaceRoot));
  const issuesRoot = path.join(workspaceRoot, "issues");
  if (!fs.existsSync(issuesRoot)) {
    if (context) context.issueDirectories = Object.freeze([]);
    return [];
  }
  const issuesRootStats = fs.lstatSync(issuesRoot);
  if (issuesRootStats.isSymbolicLink() || !issuesRootStats.isDirectory()) {
    if (context) context.issueDirectories = Object.freeze([]);
    return [];
  }

  const entries = fs.readdirSync(issuesRoot, { withFileTypes: true })
    .flatMap((entry) => {
      const match = issueDirectoryPattern.exec(entry.name);
      if (!match) {
        return [];
      }
      const absolutePath = path.join(issuesRoot, entry.name);
      const stats = fs.lstatSync(absolutePath);
      if (stats.isSymbolicLink() || !stats.isDirectory()) {
        return [];
      }
      return [{
        issueId: entry.name,
        numericId: Number.parseInt(match[1], 10),
        absolutePath,
      }];
    })
    .sort((left, right) => left.numericId - right.numericId);
  if (context) {
    context.issueDirectories = Object.freeze(entries.map((entry) => Object.freeze({ ...entry })));
  }
  return entries;
}

function resolveIssueRecordProjection(
  workspaceRoot: string,
  issueId: string | null | undefined,
  readContext?: IssueProjectionReadContext,
): IssueRecordProjection | null {
  if (!issueId) {
    return null;
  }
  const context = readContext ? issueReadContext(workspaceRoot, readContext) : undefined;
  if (context?.issueRecords.has(issueId)) {
    return context.issueRecords.get(issueId) ?? null;
  }
  const entry = discoverIssueDirectories(workspaceRoot, context).find((candidate) => candidate.issueId === issueId);
  const result = entry ? readIssueRecord(workspaceRoot, entry, context) : null;
  context?.issueRecords.set(issueId, result ? Object.freeze({ ...result }) : null);
  return result;
}

function requireReadableIssue(
  workspaceRoot: string,
  issueId: string,
  readContext?: IssueProjectionReadContext,
): IssueRecordProjection {
  const issue = resolveIssueRecordProjection(workspaceRoot, issueId, readContext);
  if (!issue) {
    throw new Error("Selected Issue was not found.");
  }
  if (issue.recordState !== "readable") {
    throw new Error(issue.readError ?? "Architect Planning requires a readable ISSUE_RECORD.md.");
  }
  return issue;
}

function emptyIssueArchitectProjection(): IssueArchitectPlanningProjection {
  const status: IssueArchitectPlanningStatus = "blocked-no-issue";
  return {
    issueId: "",
    title: "No issue selected",
    issueRecordPath: "issues/ISSUE_NNN/ISSUE_RECORD.md",
    issueRecordState: "missing",
    issueRecordReadError: "No issue selected.",
    finalInvestigationPath: "issues/ISSUE_NNN/ARCHITECT_INVESTIGATION.md",
    finalInvestigationState: "missing",
    reviewPath: "issues/ISSUE_NNN/ARCHITECT_REVIEW.md",
    reviewState: "missing",
    status,
    statusMessage: "Select a readable Issue before opening Architect Planning.",
    workflowStatus: {
      issueId: "",
      stageId: "architect-planning",
      stageLabel: "Architect Planning",
      state: status,
      stateLabel: stateLabelForIssueArchitectStatus(status),
      issuePlanningEligible: false,
      reason: "Select a readable Issue before opening Architect Planning.",
    },
    issuePlanningEligible: false,
    canPrepareHandoff: false,
    canCopyHandoff: false,
    canPromoteDraft: false,
  };
}

function readOptionalMarkdownFile(
  workspaceRoot: string,
  relativePath: string,
  label: string,
  readContext?: IssueProjectionReadContext,
): MarkdownReadResult {
  const context = readContext ? issueReadContext(workspaceRoot, readContext) : undefined;
  const normalizedPath = normalizeRelativePath(relativePath);
  const cached = context?.markdownReads.get(normalizedPath);
  if (cached) {
    return cached;
  }
  const absolutePath = containedPath(workspaceRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    const missing = Object.freeze({ state: "missing" as const });
    context?.markdownReads.set(normalizedPath, missing);
    return missing;
  }
  try {
    const stats = fs.lstatSync(absolutePath);
    if (stats.isSymbolicLink() || !stats.isFile()) {
      throw new Error(`${label} is not a regular file.`);
    }
    issueProjectionReadTestHooks.onMarkdownRead?.(normalizedPath, context?.purpose);
    const bodyMarkdown = fs.readFileSync(absolutePath, "utf8");
    issueProjectionReadTestHooks.onMarkdownReadComplete?.(normalizedPath, bodyMarkdown, context?.purpose);
    const readable = Object.freeze({ state: "readable" as const, bodyMarkdown });
    context?.markdownReads.set(normalizedPath, readable);
    return readable;
  } catch (error) {
    const failed = Object.freeze({ state: "read-error" as const, readError: errorMessage(error) });
    context?.markdownReads.set(normalizedPath, failed);
    return failed;
  }
}

function buildIssueArchitectHandoffInstruction(
  workspaceRoot: string,
  issue: IssueRecordProjection,
  finalInvestigationPath: string,
  temporaryDraftPath: string,
  revisionContext?: {
    currentInvestigationMarkdown: string;
    operatorNotes: string;
    reviewPath: string;
  },
): string {
  const binding = resolveMcpWorkspaceBindingForPrompt(workspaceRoot);
  const revisionLines = revisionContext
    ? [
        "",
        "Revision context:",
        `- Current review path: ${revisionContext.reviewPath}`,
        "- The Operator disposition is RevisionRequested.",
        "- Preserve the prior investigation and review. Browser GPT must write only a fresh temporary draft.",
        "- Address these exact Operator notes:",
        "",
        "```text",
        revisionContext.operatorNotes,
        "```",
        "",
        "Current investigation to revise:",
        "",
        "```markdown",
        revisionContext.currentInvestigationMarkdown,
        "```",
      ]
    : [];
  const lines = [
    "# Issue Architect Planning Handoff",
    "",
    ...buildMcpWorkspaceBindingPromptBlock(workspaceRoot),
    "",
    "Issue context:",
    `- Issue ID: ${issue.issueId}`,
    `- Issue title: ${issue.title}`,
    `- Issue Record source path: ${issue.recordPath}`,
    `- Final investigation path: ${finalInvestigationPath}`,
    `- Temporary draft path: ${temporaryDraftPath}`,
    "",
    "You are the Issue Architect for this selected project. Read the exact Issue Record through the bound ChampCity MCP workspace, then inspect the complete relevant production, runtime, and test evidence through that same workspace.",
    "",
    "Issue Resolution is broader than software-defect repair. Proceed in Issue Resolution covers supported bounded corrections including code defects, UX/design deficiencies, configuration/environment problems, documentation problems, and missing bounded capabilities. Absence of a pre-existing defective code path is not by itself a reason to reframe.",
    "",
    "Determine whether the Issue should proceed in Issue Resolution, is unsupported/no action, or warrants an advisory reroute because its primary objective is planned product expansion. Complexity or multiple correction milestones alone is not a reason to reframe: approved RCA may lead to direct or phased correction planning. Unsupported applies when evidence does not support the reported project problem or no correction is warranted. If proceeding, identify root cause rather than restating the symptom, identify the current architecture and lifecycle state, state the bounded correction direction without decomposing Fix Cards, protect accepted behavior and Operator decisions, identify risks and constraints, and distinguish verified evidence from Issue claims or inference. For routed Work Intakes, Reframe to Development/Feature maps to a general feature-change reroute recommendation; only the Operator may select or override the replacement route.",
    ...revisionLines,
    "",
    "Ask only one genuinely material Operator question at a time when a real Operator-owned choice remains. Repository evidence and ordinary Architect judgment do not require extra approval questions. Once material choices are resolved, create the body-only Markdown draft.",
    "",
    "Required body-only Markdown structure:",
    "",
    "```markdown",
    `# ${issue.issueId} \u2014 Architect Investigation`,
    "",
    "## Purpose",
    "## Issue Assessment",
    "## Repository Evidence Inspected",
    "## Confirmed Current Architecture",
    "## Root Cause",
    "## Required Architecture",
    "## Preservation Rules",
    "## Risks and Constraints",
    "## Architect Recommendation",
    "<exactly one of: Proceed in Issue Resolution | Reframe to Development/Feature | Unsupported / No Action>",
    "## Architect Conclusion",
    "```",
    "",
    "The Architect Recommendation section must contain exactly one allowed value and no other text: Proceed in Issue Resolution, Reframe to Development/Feature, or Unsupported / No Action. Keep Architect Conclusion for explanatory prose.",
    "",
    "Do not include canonical metadata, application metadata comments, Development Phase/Work Card parentage, Operator disposition, review records, JSON sidecars, or placeholder text.",
    "",
    "Write only the temporary draft. Do not write, overwrite, edit, or create the final investigation path directly. ChampCity will validate and promote the exact temporary draft.",
    "",
    "Use this exact artifact_toolbox.write_markdown_artifact invocation shape with the bound workspaceId, the temporary path, the complete body-only Markdown, and overwrite false:",
    "",
    "```json",
    ...buildWriteMarkdownArtifactJsonBlock(
      workspaceRoot,
      temporaryDraftPath,
      "<complete body-only Markdown>",
    ),
    "```",
    "",
    `Bound workspaceId reminder: ${binding.workspaceId}`,
  ];
  return lines.join("\n");
}

function validateArchitectInvestigationDraft(issueId: string, bodyMarkdown: string): string[] {
  const findings: string[] = [];
  const trimmed = bodyMarkdown.trim();
  if (trimmed.length < 300) {
    findings.push("draft is not substantive Markdown");
  }
  const expectedH1 = `# ${issueId} \u2014 Architect Investigation`;
  const firstHeading = trimmed.split(/\r?\n/).find((line) => line.trim().startsWith("# "));
  if (firstHeading?.trim() !== expectedH1) {
    findings.push(`H1 must be exactly "${expectedH1}"`);
  }
  if (/<!--|^---\s*$/m.test(bodyMarkdown)) {
    findings.push("draft contains application metadata delimiters");
  }
  if (!parseArchitectRecommendation(bodyMarkdown)) {
    findings.push("draft must contain exactly one Architect Recommendation section with one allowed value");
  }

  for (const section of requiredArchitectSections) {
    const sectionBody = extractMarkdownSection(bodyMarkdown, section);
    if (sectionBody === null) {
      findings.push(`missing required section: ${section}`);
      continue;
    }
    if (isEmptyPlaceholderSection(sectionBody)) {
      findings.push(`section is empty or placeholder: ${section}`);
    }
  }
  return findings;
}

function extractMarkdownSection(bodyMarkdown: string, section: string): string | null {
  const pattern = new RegExp(`^##\\s+${escapeRegex(section)}\\s*$`, "m");
  const match = pattern.exec(bodyMarkdown);
  if (!match || match.index === undefined) {
    return null;
  }
  const sectionStart = match.index + match[0].length;
  const nextHeading = /^##\s+/m.exec(bodyMarkdown.slice(sectionStart));
  const sectionEnd = nextHeading ? sectionStart + nextHeading.index : bodyMarkdown.length;
  return bodyMarkdown.slice(sectionStart, sectionEnd).trim();
}

function isEmptyPlaceholderSection(sectionBody: string): boolean {
  const compact = sectionBody.trim();
  if (!compact) {
    return true;
  }
  return /^(?:tbd|todo|n\/a|none|placeholder|fill in|to be determined|\[.*\]|<.*>)\.?$/i.test(compact);
}

function cleanupArchitectSubmissionDraft(workspaceRoot: string, temporaryDraftPath: string): void {
  const draftPath = containedPath(workspaceRoot, temporaryDraftPath);
  try {
    fs.unlinkSync(draftPath);
    const submissionDirectory = path.dirname(draftPath);
    const draftsRoot = containedPath(workspaceRoot, path.join("issues", "Architect_Drafts"));
    if (isInside(draftsRoot, submissionDirectory)) {
      fs.rmdirSync(submissionDirectory);
    }
  } catch {
    // Cleanup is best-effort after a successful overwrite-disabled promotion.
  }
}

function submissionKey(workspaceRoot: string, issueId: string): string {
  return `${path.resolve(workspaceRoot)}::${issueId}`;
}

function readIssueRecord(
  workspaceRoot: string,
  entry: IssueDirectoryEntry,
  readContext?: IssueProjectionReadContext,
): IssueRecordProjection {
  const recordPath = normalizeRelativePath(path.join("issues", entry.issueId, "ISSUE_RECORD.md"));
  const read = readOptionalMarkdownFile(workspaceRoot, recordPath, "ISSUE_RECORD.md", readContext);
  if (read.state === "missing") {
    return {
      issueId: entry.issueId,
      numericId: entry.numericId,
      title: entry.issueId,
      recordPath,
      recordState: "missing",
      readError: "ISSUE_RECORD.md is missing.",
    };
  }

  if (read.state === "readable") {
    const bodyMarkdown = read.bodyMarkdown ?? "";
    return {
      issueId: entry.issueId,
      numericId: entry.numericId,
      title: issueTitleFromMarkdown(entry.issueId, bodyMarkdown),
      recordPath,
      recordState: "readable",
      bodyMarkdown,
    };
  }
  return {
    issueId: entry.issueId,
    numericId: entry.numericId,
    title: entry.issueId,
    recordPath,
    recordState: "read-error",
    readError: read.readError,
  };
}

function issueTitleFromMarkdown(issueId: string, bodyMarkdown: string): string {
  const h1 = bodyMarkdown.split(/\r?\n/).find((line) => line.trim().startsWith("# "));
  const heading = h1?.replace(/^#\s+/, "").trim();
  if (!heading) {
    return issueId;
  }
  const prefix = new RegExp(`^${escapeRegex(issueId)}\\s+(?:-|\\u2013|\\u2014)\\s+`);
  return heading.replace(prefix, "").trim() || issueId;
}

function formatIssueRecord(input: {
  currentConsequence: string;
  discoveryContext?: string;
  issue: string;
  issueId: string;
  neededCapability?: string;
  screenshotEvidencePaths?: string[];
  title: string;
}): string {
  const sections = [
    `# ${input.issueId} \u2014 ${input.title}`,
    "",
    "## Issue",
    input.issue,
    "",
    "## Current Consequence",
    input.currentConsequence,
    "",
  ];
  if (input.neededCapability) {
    sections.push("## Needed Capability", input.neededCapability, "");
  }
  if (input.discoveryContext) {
    sections.push("## Discovery Context", input.discoveryContext, "");
  }
  if (input.screenshotEvidencePaths && input.screenshotEvidencePaths.length > 0) {
    sections.push(
      "## Screenshot Evidence",
      ...input.screenshotEvidencePaths.map((evidencePath) => `- ${evidencePath}`),
      "",
    );
  }
  sections.push("## Status", "Issue recorded. Architect Planning pending.", "");
  return sections.join("\n");
}

function validateIssueScreenshots(input: unknown): ValidatedIssueScreenshot[] {
  if (input === undefined) {
    return [];
  }
  if (!Array.isArray(input)) {
    throw new Error("Screenshot evidence must be an array when provided.");
  }
  if (input.length > issueScreenshotEvidencePolicy.maxCount) {
    throw new Error(
      `Screenshot evidence supports at most ${issueScreenshotEvidencePolicy.maxCount} images.`,
    );
  }

  let aggregateDecodedBytes = 0;
  return Array.from(input, (candidate, index) => {
    const label = `Screenshot ${index + 1}`;
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      throw new Error(`${label} must contain only mimeType and base64 fields.`);
    }
    const values = candidate as Record<string, unknown>;
    const unsupportedFields = Object.keys(values).filter(
      (key) => key !== "mimeType" && key !== "base64",
    );
    if (unsupportedFields.length > 0) {
      throw new Error(
        `${label} cannot provide filenames, filesystem paths, destinations, or other fields.`,
      );
    }
    const mimeType = values.mimeType;
    const base64 = values.base64;
    if (
      typeof mimeType !== "string" ||
      !issueScreenshotEvidenceMimeTypes.includes(
        mimeType as (typeof issueScreenshotEvidenceMimeTypes)[number],
      )
    ) {
      throw new Error(`${label} MIME type must be image/png, image/jpeg, or image/webp.`);
    }
    const maxEncodedLength = Math.ceil(
      issueScreenshotEvidencePolicy.maxDecodedBytesPerImage / 3,
    ) * 4;
    if (typeof base64 !== "string") {
      throw new Error(`${label} must contain a non-empty, syntactically valid base64 payload.`);
    }
    if (base64.length > maxEncodedLength) {
      throw new Error(
        `${label} exceeds the ${issueScreenshotEvidencePolicy.maxDecodedBytesPerImage.toLocaleString("en-US")} decoded-byte limit.`,
      );
    }
    if (!isCanonicalBase64(base64)) {
      throw new Error(`${label} must contain a non-empty, syntactically valid base64 payload.`);
    }

    const buffer = Buffer.from(base64, "base64");
    let detected: ReturnType<typeof inspectSupportedImageBytes>;
    try {
      detected = inspectSupportedImageBytes(
        buffer,
        issueScreenshotEvidencePolicy.maxDecodedBytesPerImage,
      );
    } catch (error) {
      if (
        error instanceof SupportedImageValidationError &&
        error.failure === "empty-or-oversized"
      ) {
        throw new Error(
          `${label} exceeds the ${issueScreenshotEvidencePolicy.maxDecodedBytesPerImage.toLocaleString("en-US")} decoded-byte limit or is empty.`,
        );
      }
      throw new Error(`${label} bytes are not a supported PNG, JPEG, or WEBP image.`);
    }
    if (mimeType !== detected.mimeType) {
      throw new Error(`${label} MIME type does not match the detected image bytes.`);
    }
    try {
      assertSupportedImageBounds(detected, issueScreenshotEvidencePolicy);
    } catch {
      throw new Error(
        `${label} dimensions exceed ${issueScreenshotEvidencePolicy.maxWidth} px wide, ${issueScreenshotEvidencePolicy.maxHeight} px high, or ${issueScreenshotEvidencePolicy.maxPixelsPerImage.toLocaleString("en-US")} pixels.`,
      );
    }

    aggregateDecodedBytes += buffer.length;
    if (aggregateDecodedBytes > issueScreenshotEvidencePolicy.maxAggregateDecodedBytes) {
      throw new Error(
        `Screenshot evidence exceeds the ${issueScreenshotEvidencePolicy.maxAggregateDecodedBytes.toLocaleString("en-US")} aggregate decoded-byte limit.`,
      );
    }
    return { buffer, extension: detected.extension };
  });
}

function isCanonicalBase64(value: string): boolean {
  if (value.length === 0 || value.length % 4 !== 0) {
    return false;
  }
  const paddingLength = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
  const payloadLength = value.length - paddingLength;
  for (let index = 0; index < payloadLength; index += 1) {
    const code = value.charCodeAt(index);
    const isBase64Character =
      (code >= 0x41 && code <= 0x5a) ||
      (code >= 0x61 && code <= 0x7a) ||
      (code >= 0x30 && code <= 0x39) ||
      code === 0x2b ||
      code === 0x2f;
    if (!isBase64Character) {
      return false;
    }
  }
  for (let index = payloadLength; index < value.length; index += 1) {
    if (value.charCodeAt(index) !== 0x3d) {
      return false;
    }
  }
  return paddingLength === 0 || payloadLength % 4 === 2 || payloadLength % 4 === 3;
}

function ensureIssueRootDirectory(
  issuesRoot: string,
  createdDirectories: CreatedFilesystemArtifact[],
): void {
  if (!fs.existsSync(issuesRoot)) {
    try {
      createTrackedDirectory(issuesRoot, createdDirectories);
      return;
    } catch (error) {
      if (!isFilesystemErrorCode(error, "EEXIST")) {
        throw error;
      }
    }
  }
  assertNonSymlinkDirectory(issuesRoot, "Issue root");
}

function createTrackedDirectory(
  absolutePath: string,
  createdDirectories: CreatedFilesystemArtifact[],
): void {
  fs.mkdirSync(absolutePath);
  const stats = fs.lstatSync(absolutePath);
  if (stats.isSymbolicLink() || !stats.isDirectory()) {
    throw new Error("Created Issue path is not a regular directory.");
  }
  createdDirectories.push(filesystemArtifactIdentity(absolutePath, "directory", stats));
}

function writeTrackedNewFile(
  absolutePath: string,
  data: Buffer | string,
  createdFiles: CreatedFilesystemArtifact[],
): void {
  const fileDescriptor = fs.openSync(absolutePath, "wx");
  try {
    const stats = fs.fstatSync(fileDescriptor);
    createdFiles.push(filesystemArtifactIdentity(absolutePath, "file", stats));
    fs.writeFileSync(fileDescriptor, data, typeof data === "string" ? "utf8" : undefined);
  } finally {
    fs.closeSync(fileDescriptor);
  }
}

function cleanupCreatedIssueArtifacts(
  createdFiles: CreatedFilesystemArtifact[],
  createdDirectories: CreatedFilesystemArtifact[],
  recordPath: string,
): string[] {
  const failures: string[] = [];
  const createdRecord = createdFiles.find((artifact) => artifact.absolutePath === recordPath);
  const preserveEvidenceForSurvivingRecord = fs.existsSync(recordPath) && (
    !createdRecord || !matchesCreatedFilesystemArtifact(createdRecord)
  );
  for (let index = createdFiles.length - 1; index >= 0; index -= 1) {
    const artifact = createdFiles[index];
    if (artifact.absolutePath !== recordPath && preserveEvidenceForSurvivingRecord) {
      continue;
    }
    if (!matchesCreatedFilesystemArtifact(artifact)) {
      continue;
    }
    try {
      fs.unlinkSync(artifact.absolutePath);
    } catch (error) {
      failures.push(`${path.basename(artifact.absolutePath)}: ${errorMessage(error)}`);
      if (path.basename(artifact.absolutePath) === "ISSUE_RECORD.md") {
        return failures;
      }
    }
  }
  for (let index = createdDirectories.length - 1; index >= 0; index -= 1) {
    const artifact = createdDirectories[index];
    if (!matchesCreatedFilesystemArtifact(artifact)) {
      continue;
    }
    try {
      fs.rmdirSync(artifact.absolutePath);
    } catch (error) {
      if (!isFilesystemErrorCode(error, "ENOTEMPTY") && !isFilesystemErrorCode(error, "EEXIST")) {
        failures.push(`${path.basename(artifact.absolutePath)}: ${errorMessage(error)}`);
      }
    }
  }
  return failures;
}

function matchesCreatedFilesystemArtifact(artifact: CreatedFilesystemArtifact): boolean {
  try {
    const stats = fs.lstatSync(artifact.absolutePath);
    if (stats.isSymbolicLink()) {
      return false;
    }
    if (artifact.kind === "file" ? !stats.isFile() : !stats.isDirectory()) {
      return false;
    }
    return stats.dev === artifact.device && stats.ino === artifact.inode;
  } catch {
    return false;
  }
}

function filesystemArtifactIdentity(
  absolutePath: string,
  kind: CreatedFilesystemArtifact["kind"],
  stats: fs.Stats,
): CreatedFilesystemArtifact {
  return {
    absolutePath,
    device: stats.dev,
    inode: stats.ino,
    kind,
  };
}

function assertNonSymlinkDirectory(absolutePath: string, label: string): void {
  const stats = fs.lstatSync(absolutePath);
  if (stats.isSymbolicLink() || !stats.isDirectory()) {
    throw new Error(`${label} must be a regular directory inside the selected workspace.`);
  }
}

function isFilesystemErrorCode(error: unknown, code: string): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === code);
}

function nextIssueNumericId(entries: IssueDirectoryEntry[]): number {
  return entries.reduce((highest, entry) => Math.max(highest, entry.numericId), 0) + 1;
}

function containedPath(workspaceRoot: string, relativePath: string): string {
  const target = path.resolve(workspaceRoot, relativePath);
  if (!isInside(workspaceRoot, target)) {
    throw new Error("Issue path escapes selected workspace.");
  }
  return target;
}

function isInside(root: string, target: string): boolean {
  const relativePath = path.relative(root, target);
  return relativePath.length === 0 || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
}

function normalizeRelativePath(relativePath: string): string {
  return relativePath.split(path.sep).join("/");
}

function sha256ForRelativePath(workspaceRoot: string, relativePath: string): string {
  const normalized = normalizeRelativePath(relativePath);
  if (!normalized.trim() || path.isAbsolute(normalized) || normalized.includes("..") || normalized.includes("\\")) {
    throw new Error("SHA-256 source must be a repository-relative path.");
  }
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(path.join(path.resolve(workspaceRoot), normalized)))
    .digest("hex");
}

function requiredInput(value: string | undefined, message: string): string {
  const normalized = optionalInput(value);
  if (!normalized) {
    throw new Error(message);
  }
  return normalized;
}

function optionalInput(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
