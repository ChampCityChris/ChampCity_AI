import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type {
  CreateIssueResult,
  IssueArchitectPlanningActionResult,
  IssueArchitectPlanningProjection,
  IssueArchitectPlanningStatus,
  IssueArchitectDraftSubmission,
  IssueArchitectRecommendation,
  IssueArchitectReviewDisposition,
  IssueArchitectReviewInput,
  IssueInventoryProjection,
  IssueRecordProjection,
  NewIssueInput,
} from "../../shared/issueResolutionContracts";
import {
  issueArchitectRecommendations,
  issueArchitectReviewDispositions,
} from "../../shared/issueResolutionContracts";
import {
  buildMcpWorkspaceBindingPromptBlock,
  buildWriteMarkdownArtifactJsonBlock,
  resolveMcpWorkspaceBindingForPrompt,
} from "../integrations/mcpWorkspacePromptContract";

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

interface IssueDirectoryEntry {
  issueId: string;
  numericId: number;
  absolutePath: string;
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

export function discoverIssueInventory(workspaceRoot: string): IssueInventoryProjection {
  const resolvedRoot = path.resolve(workspaceRoot);
  return {
    issues: discoverIssueDirectories(resolvedRoot).map((entry) => readIssueRecord(resolvedRoot, entry)),
  };
}

export function createLightweightIssueRecord(
  workspaceRoot: string,
  input: NewIssueInput,
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
  const nextNumericId = nextIssueNumericId(discoverIssueDirectories(resolvedRoot));
  const createdIssueId = `ISSUE_${String(nextNumericId).padStart(3, "0")}`;
  const issuesRoot = containedPath(resolvedRoot, "issues");
  const issueDirectory = containedPath(resolvedRoot, path.join("issues", createdIssueId));
  const createdRecordPath = normalizeRelativePath(path.join("issues", createdIssueId, "ISSUE_RECORD.md"));
  const recordPath = containedPath(resolvedRoot, createdRecordPath);

  fs.mkdirSync(issuesRoot, { recursive: true });
  fs.mkdirSync(issueDirectory);
  fs.writeFileSync(
    recordPath,
    formatIssueRecord({
      currentConsequence,
      discoveryContext,
      issue,
      issueId: createdIssueId,
      neededCapability,
      title,
    }),
    { encoding: "utf8", flag: "wx" },
  );

  return {
    createdIssueId,
    createdRecordPath,
    inventory: discoverIssueInventory(resolvedRoot),
  };
}

export function getIssueArchitectPlanningProjection(
  workspaceRoot: string,
  issueId: string | null | undefined,
): IssueArchitectPlanningProjection {
  const resolvedRoot = path.resolve(workspaceRoot);
  const issue = resolveIssueRecordProjection(resolvedRoot, issueId);
  if (!issue) {
    return emptyIssueArchitectProjection();
  }

  const finalInvestigationPath = normalizeRelativePath(path.join("issues", issue.issueId, "ARCHITECT_INVESTIGATION.md"));
  const finalRead = readOptionalMarkdownFile(resolvedRoot, finalInvestigationPath, "ARCHITECT_INVESTIGATION.md");
  const reviewPath = normalizeRelativePath(path.join("issues", issue.issueId, "ARCHITECT_REVIEW.md"));
  const reviewRead = readOptionalMarkdownFile(resolvedRoot, reviewPath, "ARCHITECT_REVIEW.md");
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
): IssueArchitectPlanningActionResult {
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

  return {
    ok: true,
    action: "issueArchitect.applyReview",
    message: `Issue Architect review applied: ${disposition}.`,
    projection: getIssueArchitectPlanningProjection(resolvedRoot, issue.issueId),
  };
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

function discoverIssueDirectories(workspaceRoot: string): IssueDirectoryEntry[] {
  const issuesRoot = path.join(workspaceRoot, "issues");
  if (!fs.existsSync(issuesRoot)) {
    return [];
  }
  const issuesRootStats = fs.lstatSync(issuesRoot);
  if (issuesRootStats.isSymbolicLink() || !issuesRootStats.isDirectory()) {
    return [];
  }

  return fs.readdirSync(issuesRoot, { withFileTypes: true })
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
}

function resolveIssueRecordProjection(
  workspaceRoot: string,
  issueId: string | null | undefined,
): IssueRecordProjection | null {
  if (!issueId) {
    return null;
  }
  const entry = discoverIssueDirectories(workspaceRoot).find((candidate) => candidate.issueId === issueId);
  return entry ? readIssueRecord(workspaceRoot, entry) : null;
}

function requireReadableIssue(workspaceRoot: string, issueId: string): IssueRecordProjection {
  const issue = resolveIssueRecordProjection(workspaceRoot, issueId);
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
): MarkdownReadResult {
  const absolutePath = containedPath(workspaceRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return { state: "missing" };
  }
  try {
    const stats = fs.lstatSync(absolutePath);
    if (stats.isSymbolicLink() || !stats.isFile()) {
      throw new Error(`${label} is not a regular file.`);
    }
    return { state: "readable", bodyMarkdown: fs.readFileSync(absolutePath, "utf8") };
  } catch (error) {
    return { state: "read-error", readError: errorMessage(error) };
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
    "Determine whether the Issue should proceed in Issue Resolution, is unsupported/no action, or should be reframed as Feature/Development work. Reframe applies only when the work is primarily new planned product expansion or too broad/multi-phase for the Issue workflow. Unsupported applies when evidence does not support the reported project problem or no correction is warranted. If proceeding, identify root cause rather than restating the symptom, identify the current authority/architecture, state the correction direction without decomposing Fix Cards, protect accepted behavior/authority, identify risks and constraints, and distinguish verified evidence from Issue claims or inference.",
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
): IssueRecordProjection {
  const recordPath = normalizeRelativePath(path.join("issues", entry.issueId, "ISSUE_RECORD.md"));
  const absoluteRecordPath = containedPath(workspaceRoot, recordPath);
  if (!fs.existsSync(absoluteRecordPath)) {
    return {
      issueId: entry.issueId,
      numericId: entry.numericId,
      title: entry.issueId,
      recordPath,
      recordState: "missing",
      readError: "ISSUE_RECORD.md is missing.",
    };
  }

  try {
    const stats = fs.lstatSync(absoluteRecordPath);
    if (stats.isSymbolicLink() || !stats.isFile()) {
      throw new Error("ISSUE_RECORD.md is not a regular file.");
    }
    const bodyMarkdown = fs.readFileSync(absoluteRecordPath, "utf8");
    return {
      issueId: entry.issueId,
      numericId: entry.numericId,
      title: issueTitleFromMarkdown(entry.issueId, bodyMarkdown),
      recordPath,
      recordState: "readable",
      bodyMarkdown,
    };
  } catch (error) {
    return {
      issueId: entry.issueId,
      numericId: entry.numericId,
      title: entry.issueId,
      recordPath,
      recordState: "read-error",
      readError: errorMessage(error),
    };
  }
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
  sections.push("## Status", "Issue recorded. Architect Planning pending.", "");
  return sections.join("\n");
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
