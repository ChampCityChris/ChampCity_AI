import fs from "node:fs";
import path from "node:path";
import type { DocumentDispositionStatus } from "../../shared/documents/documentDisposition";
import type {
  ArchitectInterviewWorkspaceModel,
  ArchitectInterviewWorkspaceState,
  ArchitectInterviewSelectedDocumentRole,
} from "../../shared/workspaceContracts";
import {
  resolveCanonicalArchitectInterviewContext,
  type CanonicalArtifactIdentity,
} from "./architectInterviewContextResolver";
import { buildArchitectInterviewReviewSourceKey } from "../../shared/architectInterview/architectInterviewRefreshState";
import {
  updateCanonicalMarkdownDisposition,
  writeCanonicalMarkdownDocument,
} from "../documents/canonicalMarkdownDocumentWriter";
import {
  type CanonicalDocumentMetadata,
  metadataOpenDelimiter,
  metadataCloseDelimiter,
  parseCanonicalMarkdownDocument,
} from "../../shared/documents/canonicalMarkdown";

export function getArchitectInterviewWorkspaceModel(
  workspaceRoot: string,
): ArchitectInterviewWorkspaceModel {
  const context = resolveCanonicalArchitectInterviewContext(workspaceRoot);
  if (context.status !== "ready") {
    return {
      state: context.status === "conflict" || context.status === "local-error"
        ? "needs-attention"
        : "prerequisites-unavailable",
      railStatus: context.status === "prerequisites-unavailable" ? "Open" : "Needs Attention",
      handoffState: "handoff-unavailable",
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
  const state = invalidInterviewReason ? "needs-attention" : deriveWorkspaceState(interview);
  const railStatus = deriveRailStatus(state, interview);
  const selectedReviewDocumentRole: ArchitectInterviewSelectedDocumentRole =
    hasReviewableInterview || hasInspectableInterview ? "interview" : "prompt";
  const currentOperatorReviewNotes = interview?.operatorReviewNotes;

  return {
    state,
    railStatus,
    handoffState: "handoff-ready",
    handoffInstruction: buildArchitectHandoffInstruction({
      promptMarkdownPath: context.prompt.markdownPath,
      promptJsonRevision: context.prompt.artifactRevision,
      projectIntakeMarkdownPath: context.projectIntake.markdownPath,
      projectIntakeJsonRevision: context.projectIntake.artifactRevision,
      outputMarkdownPath: context.interviewTargets.markdownPath,
      currentOperatorReviewNotes,
      currentInterviewDisposition: interview?.disposition,
      invalidInterviewReason,
      hasInvalidInterview: Boolean(context.invalidInterview),
    }),
    promptDocument: context.prompt,
    interviewTargets: context.interviewTargets,
    interviewDocument: inspectableInterview,
    selectedReviewDocumentRole,
    interviewDisposition: interview?.disposition,
    documentReadState,
    freshnessState,
    canCopyHandoff: true,
    canApplyDisposition: invalidInterviewReason ? false : canApplyDisposition,
    currentOperatorReviewNotes,
    projectIntakeComplete: railStatus === "Completed",
    requiredAction: invalidInterviewReason
      ? "Interview output was saved but cannot be reviewed because its metadata is missing or stale. Copy the correction handoff and resend it in the embedded Architect chat."
      : requiredActionForState(state, selectedReviewDocumentRole),
    reason: invalidInterviewReason
      ? `Interview output was saved but cannot be reviewed: ${invalidInterviewReason}`
      : reasonForState(state, interview),
    evidencePaths: context.evidencePaths,
    markdownPath: inspectableInterview?.markdownPath ?? context.interviewTargets.markdownPath,
    preview: readPreviewIfAvailable(workspaceRoot, inspectableInterview),
  };
}

export function saveCurrentArchitectInterviewOutput(
  workspaceRoot: string,
  markdownBody: string,
): ArchitectInterviewWorkspaceModel {
  const body = markdownBody.trim();
  if (!body) {
    throw new Error("Architect Interview output requires substantive Markdown.");
  }
  if (body.includes(metadataOpenDelimiter) || body.includes(metadataCloseDelimiter)) {
    throw new Error("Architect Interview output must not contain application metadata delimiters.");
  }

  const context = resolveCanonicalArchitectInterviewContext(workspaceRoot);
  if (context.status !== "ready") {
    throw new Error(context.reason);
  }

  const target = context.interviewTargets.markdownPath;
  const sourceRevisions = [
    { path: context.projectIntake.markdownPath, revision: context.projectIntake.artifactRevision },
    { path: context.prompt.markdownPath, revision: context.prompt.artifactRevision },
  ];

  const existing = readExistingCanonical(workspaceRoot, target);
  const metadata: CanonicalDocumentMetadata = {
    schemaVersion: 1,
    artifactType: "project-architect-interview",
    artifactRevision: existing ? existing.metadata.artifactRevision + 1 : 1,
    participationRole: "gatingReview",
    identity: context.expectedProjectIdentity,
    sourceRevisions,
    workflowData: {},
    documentDisposition: {
      status: "Pending",
      notes: "",
      reviewedAt: null,
    },
  };
  writeCanonicalMarkdownDocument({
    workspaceRoot,
    relativePath: target,
    metadata,
    bodyMarkdown: body,
  });

  return getArchitectInterviewWorkspaceModel(workspaceRoot);
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
    return "Copy the Architect handoff, paste it into the embedded Architect chat, and wait for the repository Markdown output.";
  }
  if (state === "ready-for-review") {
    return "Review the Architect Interview output and apply an Operator disposition.";
  }
  if (state === "revision-requested") {
    return "Copy the revised handoff so the Architect can address the Operator revision notes.";
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

function buildArchitectHandoffInstruction({
  currentInterviewDisposition,
  currentOperatorReviewNotes,
  outputMarkdownPath,
  projectIntakeJsonRevision,
  projectIntakeMarkdownPath,
  promptJsonRevision,
  promptMarkdownPath,
  invalidInterviewReason,
  hasInvalidInterview,
}: {
  promptMarkdownPath: string;
  promptJsonRevision: number;
  projectIntakeMarkdownPath: string;
  projectIntakeJsonRevision: number;
  outputMarkdownPath: string;
  currentInterviewDisposition?: DocumentDispositionStatus;
  currentOperatorReviewNotes?: string;
  invalidInterviewReason?: string;
  hasInvalidInterview?: boolean;
}): string {
  const revisionInstruction =
    currentInterviewDisposition === "RevisionRequested" && currentOperatorReviewNotes
      ? [
          "",
          "Current Operator revision notes to address:",
          currentOperatorReviewNotes,
        ]
      : [];
  const sourceRevisionMarkdownLines = [
    `- path: ${projectIntakeMarkdownPath} revision: ${projectIntakeJsonRevision}`,
    `- path: ${promptMarkdownPath} revision: ${promptJsonRevision}`,
  ];
  const correctionInstruction =
    hasInvalidInterview && invalidInterviewReason
      ? [
          "",
          "Correction mode:",
          `- Current validation failure: ${invalidInterviewReason}`,
          `- Existing Interview Markdown target: ${outputMarkdownPath}`,
          "- Read the existing Interview output at that exact target.",
          "- Preserve its substantive interview content.",
          "- Return corrected substantive Markdown through the Architect Output import surface.",
        ]
      : [];

  return [
    "Use ChampCity MCP with repository reference <PROJECT_REPO>.",
    "The Operator will manually paste and send this instruction in the embedded Architect chat.",
    "",
    "Read these exact handoff inputs:",
    `- Prompt Markdown: ${promptMarkdownPath}`,
    `- Project Intake Markdown: ${projectIntakeMarkdownPath}`,
    "",
    "Conduct the Project Architect Interview conversationally with the Operator in this chat.",
    "Chat text is not the durable record.",
    "Do not create placeholder output before the interview is substantively complete.",
    "When the interview or revision is substantively complete, return substantive Markdown only.",
    "Do not return target paths, artifact metadata, source revisions, role, disposition, metadata delimiters, or serialized canonical JSON as authority.",
    `The Operator will paste your substantive Markdown into the visible Architect Output import surface for ${outputMarkdownPath}.`,
    "Display-only application-owned final disposition: Document.Status=Pending.",
    "",
    "Display-only current source revisions:",
    ...sourceRevisionMarkdownLines,
    "The application owns source revision fields; field name revision, not artifactRevision.",
    "",
    "Read and address current Operator revision notes when the existing Interview is RevisionRequested.",
    ...revisionInstruction,
    ...correctionInstruction,
  ].join("\n");
}

function readPreviewIfAvailable(
  workspaceRoot: string,
  identity: CanonicalArtifactIdentity | undefined,
): string | undefined {
  if (!identity?.markdownPath) {
    return undefined;
  }
  try {
    return fs.readFileSync(path.join(workspaceRoot, identity.markdownPath), "utf8").slice(0, 12000);
  } catch {
    return undefined;
  }
}

function readExistingCanonical(workspaceRoot: string, relativePath: string) {
  const absolutePath = path.join(workspaceRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return null;
  }
  return parseCanonicalMarkdownDocument(fs.readFileSync(absolutePath, "utf8"));
}
