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
          `- Existing Interview Markdown target for reading only: ${outputMarkdownPath}`,
          "- Read the existing Interview output at that exact target if it is available.",
          "- Preserve and revise the complete existing Interview body.",
          "- Save the corrected complete Interview through the same artifact_toolbox submission action.",
        ]
      : [];

  return [
    "Use ChampCity MCP with repository reference <PROJECT_REPO>.",
    "This handoff is for the embedded Architect chat.",
    "",
    "Read these exact handoff inputs:",
    `- Prompt Markdown: ${promptMarkdownPath}`,
    `- Project Intake Markdown: ${projectIntakeMarkdownPath}`,
    "",
    "Conduct the Project Architect Interview conversationally with the Operator in this chat.",
    "Continue until material scope, constraints, risks, decisions, unresolved questions, and planning direction are resolved.",
    "Chat text is not the durable record.",
    "Do not create placeholder output before the interview is substantively complete.",
    "Do not return a snippet as completion.",
    "Do not require manual Operator handling of completed Interview output.",
    "When the interview or revision is substantively complete, synthesize one complete substantive Project Architect Interview Markdown document.",
    "Resolve the configured workspace ID through diagnostics_toolbox.list_workspaces when it is not already known.",
    "Call artifact_toolbox with this invocation shape:",
    "```json",
    "{",
    '  "action": "submit_handoff_outputs",',
    '  "workspaceId": "<resolved workspace ID>",',
    '  "params": {',
    '    "handoffKind": "architect-interview",',
    '    "outputs": {',
    '      "architectInterviewMarkdown": "<complete substantive Interview Markdown>"',
    "    }",
    "  }",
    "}",
    "```",
    "The handoff kind is a selector, not authority.",
    "The MCP server derives targets, metadata, identity, source revisions, participation role, revision, and Pending disposition from the current Approved handoff.",
    "Do not supply target path, artifact metadata, identity, source revisions, participation role, disposition, metadata delimiters, serialized canonical JSON, retired save actions, a generic Markdown writer, a local import field, or a manual file-copy fallback.",
    "Report completion only after the tool returns saved or already_saved.",
    "After success, respond with a concise saved-and-ready-for-review confirmation.",
    "If the action is unavailable, denied, or fails, provide the exact failure and remain incomplete.",
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

function readExistingCanonical(workspaceRoot: string, relativePath: string) {
  const absolutePath = path.join(workspaceRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return null;
  }
  return parseCanonicalMarkdownDocument(fs.readFileSync(absolutePath, "utf8"));
}
