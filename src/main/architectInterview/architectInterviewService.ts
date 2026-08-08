import fs from "node:fs";
import path from "node:path";
import type { DocumentDispositionStatus } from "../../shared/documents/documentDisposition";
import { parseCanonicalMarkdownDocument } from "../../shared/documents/canonicalMarkdown";
import type {
  ArchitectInterviewWorkspaceModel,
  ArchitectInterviewWorkspaceState,
  ArchitectInterviewSelectedDocumentRole,
} from "../../shared/workspaceContracts";
import {
  resolveCanonicalArchitectInterviewContext,
  type CanonicalArtifactIdentity,
} from "./architectInterviewContextResolver";
import {
  writeProjectArchitectInterviewPrompt,
} from "./projectArchitectInterviewPromptWriter";
import { buildArchitectInterviewReviewSourceKey } from "../../shared/architectInterview/architectInterviewRefreshState";
import {
  updateCanonicalMarkdownDisposition,
} from "../documents/canonicalMarkdownDocumentWriter";
import {
  getArchitectInterviewDraftStatus,
  getPreparedArchitectInterviewChatHandoff,
  prepareArchitectInterviewChatHandoff,
  prepareArchitectInterviewDraftSubmission,
} from "./architectInterviewDraftPilot";

export function getArchitectInterviewWorkspaceModel(
  workspaceRoot: string,
): ArchitectInterviewWorkspaceModel {
  const draftStatus = getArchitectInterviewDraftStatus(workspaceRoot);
  const context = resolveCanonicalArchitectInterviewContext(workspaceRoot);
  if (context.status === "prompt-missing-recoverable") {
    return {
      state: "prompt-missing",
      railStatus: "Open",
      handoffState: "handoff-unavailable",
      projectIntakeDocument: context.projectIntake,
      interviewTargets: context.interviewTargets,
      selectedReviewDocumentRole: "project-intake",
      documentReadState: context.projectIntake.documentReadState,
      freshnessState: "fresh",
      canRegeneratePrompt: true,
      canPrepareHandoff: false,
      canCopyHandoff: false,
      canApplyDisposition: false,
      projectIntakeComplete: false,
      requiredAction: "Regenerate Interview Prompt from the Approved Project Intake, then prepare the ChatGPT handoff.",
      reason: context.reason,
      evidencePaths: context.evidencePaths,
      markdownPath: context.projectIntake.markdownPath,
    };
  }
  if (context.status !== "ready") {
    return {
      state: context.status === "conflict" || context.status === "local-error"
        ? "needs-attention"
        : "prerequisites-unavailable",
      railStatus: context.status === "prerequisites-unavailable" ? "Open" : "Needs Attention",
      handoffState: "handoff-unavailable",
      canRegeneratePrompt: false,
      canPrepareHandoff: false,
      canCopyHandoff: false,
      canApplyDisposition: false,
      selectedReviewDocumentRole: "prompt",
      projectIntakeComplete: false,
      requiredAction: context.reason,
      reason: context.reason,
      evidencePaths: context.evidencePaths,
    };
  }

  const interview = context.interview;
  const inspectableInterview = interview ?? context.invalidInterview;
  const writableDraftStatus = draftStatus &&
    draftStatus.submission.state !== "promoted" &&
    draftStatus.submission.state !== "promotion-failed"
      ? draftStatus
      : undefined;
  const canPrepareHandoff = canPrepareHandoffForContext(context);
  const preparedChatHandoff = getPreparedArchitectInterviewChatHandoff(workspaceRoot);
  const finalDraftHandoffInstruction = writableDraftStatus ? writableDraftStatus.preparedInstruction : undefined;
  const invalidInterviewReason = context.invalidInterviewReason;
  const documentReadState = inspectableInterview?.documentReadState ?? "missing";
  const freshnessState = inspectableInterview?.freshnessState ?? context.invalidInterviewFreshnessState ?? "fresh";
  const hasReviewableInterview = Boolean(interview);
  const hasInspectableInterview = Boolean(inspectableInterview);
  const canApplyDisposition = Boolean(
    interview &&
    interview.documentReadState === "readable" &&
    !interview.readError &&
    interview.freshnessState === "fresh",
  );
  const state = invalidInterviewReason || draftStatus?.submission.state === "promotion-failed"
    ? "needs-attention"
    : deriveWorkspaceState(interview);
  const railStatus = deriveRailStatus(state, interview);
  const selectedReviewDocumentRole: ArchitectInterviewSelectedDocumentRole =
    hasReviewableInterview || hasInspectableInterview ? "interview" : "prompt";
  const currentOperatorReviewNotes = interview?.operatorReviewNotes;

  return {
    state,
    railStatus,
    handoffState: canPrepareHandoff || preparedChatHandoff || writableDraftStatus ? "handoff-ready" : "handoff-unavailable",
    handoffInstruction: preparedChatHandoff,
    promptDocument: context.prompt,
    interviewTargets: context.interviewTargets,
    interviewDocument: inspectableInterview,
    selectedReviewDocumentRole,
    interviewDisposition: interview?.disposition,
    documentReadState,
    freshnessState,
    canRegeneratePrompt: false,
    canPrepareHandoff,
    canCopyHandoff: Boolean(preparedChatHandoff),
    canPrepareFinalDraftHandoff: canPrepareHandoff,
    canCopyFinalDraftHandoff: Boolean(finalDraftHandoffInstruction),
    finalDraftHandoffInstruction,
    canApplyDisposition: invalidInterviewReason ? false : canApplyDisposition,
    currentOperatorReviewNotes,
    projectIntakeComplete: railStatus === "Completed",
    draftSubmissionState: draftStatus?.submission.state,
    draftPromotionError: draftStatus?.promotionError,
    requiredAction: draftStatus?.submission.state === "promotion-failed"
      ? `Architect Interview draft promotion failed: ${draftStatus.promotionError ?? "Correct the body and prepare a fresh handoff."}`
      : invalidInterviewReason
      ? "Interview output was saved but cannot be reviewed because its metadata is missing, stale, or ineligible for replacement."
      : requiredActionForState(state, selectedReviewDocumentRole),
    reason: draftStatus?.submission.state === "promotion-failed"
      ? draftStatus.promotionError ?? "Architect Interview draft promotion failed."
      : invalidInterviewReason
      ? `Interview output was saved but cannot be reviewed: ${invalidInterviewReason}`
      : reasonForState(state, interview),
    evidencePaths: context.evidencePaths,
    markdownPath: inspectableInterview?.markdownPath ?? context.interviewTargets.markdownPath,
  };
}

export function prepareArchitectInterviewHandoff(workspaceRoot: string): ArchitectInterviewWorkspaceModel {
  prepareArchitectInterviewChatHandoff(workspaceRoot);
  return getArchitectInterviewWorkspaceModel(workspaceRoot);
}

export function prepareArchitectInterviewFinalDraftHandoff(workspaceRoot: string): ArchitectInterviewWorkspaceModel {
  prepareArchitectInterviewDraftSubmission(workspaceRoot);
  return getArchitectInterviewWorkspaceModel(workspaceRoot);
}

export function getPreparedArchitectInterviewHandoffInstruction(workspaceRoot: string): string {
  const instruction = getPreparedArchitectInterviewChatHandoff(workspaceRoot);
  if (!instruction) {
    throw new Error("Prepare ChatGPT Handoff must be completed before Copy ChatGPT Handoff.");
  }
  return instruction;
}

export function getPreparedArchitectInterviewFinalDraftInstruction(workspaceRoot: string): string {
  const model = getArchitectInterviewWorkspaceModel(workspaceRoot);
  if (!model.canCopyFinalDraftHandoff || !model.finalDraftHandoffInstruction) {
    throw new Error("Prepare Final Draft Handoff must be completed before Copy Final Draft Handoff.");
  }
  return model.finalDraftHandoffInstruction;
}

export function regenerateArchitectInterviewPrompt(workspaceRoot: string): ArchitectInterviewWorkspaceModel {
  const context = resolveCanonicalArchitectInterviewContext(workspaceRoot);
  if (context.status === "ready") {
    return getArchitectInterviewWorkspaceModel(workspaceRoot);
  }
  if (context.status !== "prompt-missing-recoverable") {
    throw new Error(context.reason);
  }

  const workspace = path.resolve(workspaceRoot);
  const targetPath = path.join(workspace, context.promptTargetPath);
  if (fs.existsSync(targetPath)) {
    throw new Error("Project Architect Interview Prompt target already exists and was not recognized as the current Approved prompt. Resolve the conflict before regenerating.");
  }

  const intake = parseCanonicalMarkdownDocument(
    fs.readFileSync(path.join(workspace, context.projectIntake.markdownPath), "utf8"),
  );
  const projectName = stringValue(intake.metadata.workflowData.projectName);
  if (!projectName) {
    throw new Error("Approved Project Intake is missing workflowData.projectName.");
  }

  writeProjectArchitectInterviewPrompt({
    workspaceRoot: workspace,
    projectName,
    projectSlug: context.projectSlug,
    projectIntakeMarkdownPath: context.projectIntake.markdownPath,
    projectIntakeRevision: context.projectIntake.artifactRevision,
    projectIntakeWorkflowData: intake.metadata.workflowData,
    architectInterviewTargetMarkdownPath: context.interviewTargets.markdownPath,
  });

  return getArchitectInterviewWorkspaceModel(workspace);
}

export function reviewArchitectInterview(
  workspaceRoot: string,
  status: DocumentDispositionStatus,
  operatorReviewNotes = "",
  expectedSourceKey?: string,
): ArchitectInterviewWorkspaceModel {
  const trimmedNotes = operatorReviewNotes.trim();
  if (status === "RevisionRequested" && !trimmedNotes) {
    throw new Error("RevisionRequested requires Operator revision instructions.");
  }

  const context = resolveCanonicalArchitectInterviewContext(workspaceRoot);
  if (context.status !== "ready") {
    throw new Error(context.reason);
  }
  if (!context.interview) {
    throw new Error("Architect Interview output is not available for review.");
  }
  const currentModel = getArchitectInterviewWorkspaceModel(workspaceRoot);
  const currentSourceKey = buildArchitectInterviewReviewSourceKey(workspaceRoot, currentModel);
  if (expectedSourceKey && expectedSourceKey !== currentSourceKey) {
    throw new Error("Repository evidence changed before Architect Interview review was applied. Refresh before applying review.");
  }
  if (
    context.interview.documentReadState !== "readable" ||
    context.interview.readError ||
    context.interview.freshnessState !== "fresh"
  ) {
    throw new Error("Only a readable, fresh Architect Interview Markdown document can be reviewed.");
  }

  const markdownPath = context.interview.markdownPath;
  const reviewedAt = new Date().toISOString();

  updateCanonicalMarkdownDisposition({
    workspaceRoot,
    relativePath: markdownPath,
    status,
    notes: trimmedNotes,
    reviewedAt,
  });

  return getArchitectInterviewWorkspaceModel(workspaceRoot);
}

export function setArchitectInterviewDisposition(
  workspaceRoot: string,
  status: DocumentDispositionStatus,
  operatorReviewNotes = "",
): ArchitectInterviewWorkspaceModel {
  return reviewArchitectInterview(workspaceRoot, status, operatorReviewNotes);
}

function deriveWorkspaceState(
  interview: (CanonicalArtifactIdentity & { freshnessState?: "fresh" | "stale" }) | undefined,
): ArchitectInterviewWorkspaceState {
  if (!interview) {
    return "waiting-for-output";
  }
  if (interview.readError || interview.documentReadState !== "readable" || interview.freshnessState === "stale") {
    return "needs-attention";
  }
  if (interview.disposition === "Approved") {
    return "completed";
  }
  if (interview.disposition === "RevisionRequested") {
    return "revision-requested";
  }
  if (interview.disposition === "Rejected") {
    return "rejected";
  }
  return "ready-for-review";
}

function deriveRailStatus(
  state: ArchitectInterviewWorkspaceState,
  interview: CanonicalArtifactIdentity | undefined,
): ArchitectInterviewWorkspaceModel["railStatus"] {
  if (state === "waiting-for-output" || state === "ready-for-handoff") {
    return "Waiting for Output";
  }
  if (state === "completed" && interview?.disposition === "Approved") {
    return "Completed";
  }
  if (state === "ready-for-review" || state === "revision-requested" || state === "rejected") {
    return "Awaiting Approval";
  }
  if (state === "prerequisites-unavailable") {
    return "Open";
  }
  return "Needs Attention";
}

function requiredActionForState(
  state: ArchitectInterviewWorkspaceState,
  selectedRole: ArchitectInterviewSelectedDocumentRole,
): string {
  if (state === "waiting-for-output") {
    return "Send the Architect handoff in the embedded chat and wait for the MCP saved confirmation.";
  }
  if (state === "ready-for-review") {
    return "Review the Architect Interview output and apply an Operator disposition.";
  }
  if (state === "revision-requested") {
    return "Send the revised handoff so the Architect can address the Operator revision notes and save through MCP.";
  }
  if (state === "completed") {
    return "Architect Interview is Approved; Project Intake can advance toward Project Planning.";
  }
  if (selectedRole === "prompt") {
    return "Prompt is an Approved handoff input and is not a review target.";
  }
  return "Resolve local Architect Interview evidence before reviewing.";
}

function reasonForState(
  state: ArchitectInterviewWorkspaceState,
  interview: CanonicalArtifactIdentity | undefined,
): string {
  if (state === "waiting-for-output") {
    return "Waiting for Architect-authored Interview output at the exact prompt targets.";
  }
  if (state === "needs-attention") {
    return interview?.readError ?? "Architect Interview output is stale, mismatched, unreadable, or otherwise not reviewable.";
  }
  return "Repository evidence controls Architect Interview status.";
}

function canPrepareHandoffForContext(
  context: Extract<ReturnType<typeof resolveCanonicalArchitectInterviewContext>, { status: "ready" }>,
): boolean {
  if (context.invalidInterview || context.invalidInterviewReason) return false;
  if (!context.interview) return true;
  return context.interview.disposition === "RevisionRequested";
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
