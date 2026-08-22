import fs from "node:fs";
import path from "node:path";
import type { DocumentDispositionStatus } from "../../shared/documents/documentDisposition";
import type { CanonicalDocumentMetadata } from "../../shared/documents/canonicalMarkdown";
import { parseCanonicalMarkdownDocument } from "../../shared/documents/canonicalMarkdown";
import type {
  PhaseInterviewWorkspaceModel,
  PhaseInterviewWorkspaceState,
} from "../../shared/workspaceContracts";
import {
  evaluateDocumentFreshness,
  listPlanningDocuments,
} from "../documents/planningDocumentService";
import {
  updateCanonicalMarkdownDisposition,
  writeCanonicalMarkdownDocument,
} from "../documents/canonicalMarkdownDocumentWriter";
import {
  canPreparePhaseInterviewDraft,
  draftPathForPhaseInterview,
  getActivePhaseInterviewDraftSubmission,
  getPreparedPhaseInterviewChatHandoff,
  getPhaseInterviewDraftStatus,
  phaseInterviewHandoffPath,
  phaseInterviewOutputPath,
  phaseInterviewRequiredSections,
  phaseInterviewSubmissionContractId,
  preparePhaseInterviewChatHandoff,
  preparePhaseInterviewDraftSubmission,
  resolvePhaseInterviewDraftContext,
  type PhaseInterviewReadyContext,
} from "./phaseInterviewDraftOutput";
import {
  inheritRepositoryAuthorityFromSourceRevisions,
  mergeRepositoryAuthorityIntoWorkflowData,
} from "../documents/repositoryAuthority";

export interface PhaseInterviewHandoffResult {
  phaseId: string;
  handoffMarkdownPath: string;
  interviewMarkdownPath: string;
  alreadyPrepared?: boolean;
}

export interface PhaseIntakeCompletion {
  complete: boolean;
  phaseId?: string;
  reason: string;
}

export function generatePhaseInterviewHandoff(workspaceRoot: string): PhaseInterviewHandoffResult {
  const context = requireReadyPhaseInterviewContext(workspaceRoot);
  const sourceRevisions = [
    { path: context.profile.markdownPath, revision: context.profile.metadata.artifactRevision ?? 1 },
    { path: context.roadmap.markdownPath, revision: context.roadmap.metadata.artifactRevision ?? 1 },
    { path: context.phaseMap.markdownPath, revision: context.phaseMap.metadata.artifactRevision ?? 1 },
    ...context.dependencyCloseouts.map((document) => ({
      path: document.markdownPath,
      revision: document.metadata.artifactRevision ?? 1,
    })),
  ];
  const metadata = phaseInterviewHandoffMetadata(workspaceRoot, context, sourceRevisions);
  const bodyMarkdown = buildPhaseInterviewHandoffBody(context, sourceRevisions);
  const existing = readExistingCanonical(workspaceRoot, context.handoffMarkdownPath);
  if (existing && handoffMatchesCurrentEvidence(existing, metadata, bodyMarkdown)) {
    return {
      phaseId: context.selectedPhase.phaseId,
      handoffMarkdownPath: context.handoffMarkdownPath,
      interviewMarkdownPath: context.interviewMarkdownPath,
      alreadyPrepared: true,
    };
  }

  writeCanonicalMarkdownDocument({
    workspaceRoot,
    relativePath: context.handoffMarkdownPath,
    metadata: {
      ...metadata,
      artifactRevision: existing ? existing.metadata.artifactRevision + 1 : 1,
    },
    bodyMarkdown,
  });

  return {
    phaseId: context.selectedPhase.phaseId,
    handoffMarkdownPath: context.handoffMarkdownPath,
    interviewMarkdownPath: context.interviewMarkdownPath,
    alreadyPrepared: false,
  };
}

export function getPhaseInterviewWorkspaceModel(
  workspaceRoot: string,
): PhaseInterviewWorkspaceModel {
  const draftStatus = getPhaseInterviewDraftStatus(workspaceRoot);
  const context = resolvePhaseInterviewDraftContext(workspaceRoot);
  if (context.status !== "ready") {
    return {
      state: context.status === "not-ready" ? "not-ready" : "needs-attention",
      railStatus: context.status === "not-ready" ? "Not Ready" : "Needs Attention",
      requiredAction: context.reason,
      reason: context.reason,
      evidencePaths: context.evidencePaths,
      handoffState: "handoff-unavailable",
      canPrepareHandoff: false,
      canCopyHandoff: false,
      canApplyDisposition: false,
      phaseInterviewTarget: "",
      selectedReviewDocumentRole: "phase-interview",
      draftSubmissionState: draftStatus?.submission.state,
      draftPromotionError: draftStatus?.promotionError,
    };
  }

  const inspectableInterview = context.interview ?? context.invalidInterview;
  const writableDraftStatus = draftStatus &&
    draftStatus.submission.state !== "promoted" &&
    draftStatus.submission.state !== "promotion-failed"
      ? draftStatus
      : undefined;
  const invalidReason = context.invalidInterviewReason;
  const canPrepareHandoff = canPreparePhaseInterviewDraft(context) || !context.handoff;
  const preparedChatHandoff = getPreparedPhaseInterviewChatHandoff(workspaceRoot);
  const finalDraftHandoffInstruction = writableDraftStatus ? writableDraftStatus.preparedInstruction : undefined;
  const canCopyHandoff = Boolean(preparedChatHandoff);
  const canPrepareFinalDraftHandoff = canPreparePhaseInterviewDraft(context);
  const state = draftStatus?.submission.state === "promotion-failed" || invalidReason
    ? "needs-attention"
    : deriveWorkspaceState(context);
  const currentOperatorReviewNotes = context.interview?.operatorReviewNotes;

  return {
    state,
    railStatus: deriveRailStatus(state),
    requiredAction: draftStatus?.submission.state === "promotion-failed"
      ? `Phase Interview draft promotion failed: ${draftStatus.promotionError ?? "Correct the draft and prepare a fresh handoff."}`
      : invalidReason
      ? "Phase Interview output was saved but cannot be reviewed because its metadata is missing, stale, or ineligible for replacement."
      : requiredActionForState(state),
    reason: draftStatus?.submission.state === "promotion-failed"
      ? draftStatus.promotionError ?? "Phase Interview draft promotion failed."
      : invalidReason
      ? `Phase Interview output was saved but cannot be reviewed: ${invalidReason}`
      : reasonForState(state),
    evidencePaths: context.evidencePaths,
    handoffState: canCopyHandoff || canPrepareHandoff || Boolean(finalDraftHandoffInstruction) ? "handoff-ready" : "handoff-unavailable",
    handoffMarkdownPath: context.handoffMarkdownPath,
    handoffInstruction: preparedChatHandoff,
    handoffArtifactRevision: context.handoff?.metadata.artifactRevision,
    handoffPreparationMessage: undefined,
    draftSubmissionState: draftStatus?.submission.state,
    draftPromotionError: draftStatus?.promotionError,
    canPrepareHandoff,
    canCopyHandoff,
    canPrepareFinalDraftHandoff,
    canCopyFinalDraftHandoff: Boolean(finalDraftHandoffInstruction),
    finalDraftHandoffInstruction,
    canApplyDisposition: Boolean(
      context.interview &&
      context.interview.documentReadState === "readable" &&
      context.interview.freshnessState === "fresh" &&
      !invalidReason,
    ),
    phase: {
      phaseId: context.selectedPhase.phaseId,
      title: context.selectedPhase.title,
      order: context.selectedPhase.order,
      purpose: context.selectedPhase.purpose,
      dependsOn: [...context.selectedPhase.dependsOn],
      sourceReferences: [...context.selectedPhase.sourceReferences],
      dependencyCloseoutPaths: context.dependencyCloseouts.map((document) => document.markdownPath),
    },
    phaseInterviewTarget: context.interviewMarkdownPath,
    interviewDocument: inspectableInterview,
    selectedReviewDocumentRole: "phase-interview",
    currentOperatorReviewNotes,
  };
}

export function preparePhaseInterviewHandoff(
  workspaceRoot: string,
): PhaseInterviewWorkspaceModel {
  const result = generatePhaseInterviewHandoff(workspaceRoot);
  preparePhaseInterviewChatHandoff(workspaceRoot);
  return {
    ...getPhaseInterviewWorkspaceModel(workspaceRoot),
    handoffPreparationMessage: result.alreadyPrepared
      ? "Phase Interview chat handoff prepared from the current evidence."
      : "Phase Interview handoff and chat instruction prepared.",
  };
}

export function getPhaseInterviewHandoffInstruction(workspaceRoot: string): string {
  const instruction = getPreparedPhaseInterviewChatHandoff(workspaceRoot);
  if (!instruction) {
    throw new Error("Prepare Phase Interview Handoff must be completed before Copy Phase Interview Handoff.");
  }
  return instruction;
}

export function preparePhaseInterviewFinalDraftHandoff(
  workspaceRoot: string,
): PhaseInterviewWorkspaceModel {
  preparePhaseInterviewDraftSubmission(workspaceRoot);
  return getPhaseInterviewWorkspaceModel(workspaceRoot);
}

export function getPreparedPhaseInterviewFinalDraftInstruction(workspaceRoot: string): string {
  const model = getPhaseInterviewWorkspaceModel(workspaceRoot);
  if (!model.canCopyFinalDraftHandoff || !model.finalDraftHandoffInstruction) {
    throw new Error("Prepare Phase Interview Final Draft Handoff must be completed before Copy Phase Interview Final Draft Handoff.");
  }
  return model.finalDraftHandoffInstruction;
}

export function reviewPhaseInterview(
  workspaceRoot: string,
  status: DocumentDispositionStatus,
  operatorReviewNotes = "",
): PhaseInterviewWorkspaceModel {
  const trimmedNotes = operatorReviewNotes.trim();
  if (status === "RevisionRequested" && !trimmedNotes) {
    throw new Error("RevisionRequested requires Operator revision instructions.");
  }
  const context = requireReadyPhaseInterviewContext(workspaceRoot);
  if (!context.interview) {
    throw new Error("Phase Interview output is not available for review.");
  }
  if (
    context.interview.documentReadState !== "readable" ||
    context.interview.readError ||
    context.interview.freshnessState !== "fresh"
  ) {
    throw new Error("Only a readable, fresh Phase Interview Markdown document can be reviewed.");
  }
  updateCanonicalMarkdownDisposition({
    workspaceRoot,
    relativePath: context.interview.markdownPath,
    status,
    notes: trimmedNotes,
    reviewedAt: new Date().toISOString(),
  });
  return getPhaseInterviewWorkspaceModel(workspaceRoot);
}

export function setPhaseInterviewDisposition(
  workspaceRoot: string,
  phaseId: string,
  status: DocumentDispositionStatus,
): void {
  const expectedPath = phaseInterviewOutputPath(phaseId);
  const interview = listPlanningDocuments(workspaceRoot)
    .find((document) => document.markdownPath === expectedPath);
  if (!interview) {
    throw new Error(`Phase Interview document is missing: ${expectedPath}`);
  }
  updateCanonicalMarkdownDisposition({
    workspaceRoot,
    relativePath: interview.markdownPath,
    status,
    reviewedAt: new Date().toISOString(),
  });
}

export function getPhaseIntakeCompletion(
  workspaceRoot: string,
  phaseId?: string,
): PhaseIntakeCompletion {
  const context = resolvePhaseInterviewDraftContext(workspaceRoot);
  const selectedPhaseId = phaseId ?? (context.status === "ready" ? context.selectedPhase.phaseId : undefined);
  if (!selectedPhaseId) {
    return {
      complete: false,
      reason: context.status === "ready" ? "Phase Interview selected phase is unavailable." : context.reason,
    };
  }
  const interview = listPlanningDocuments(workspaceRoot)
    .find((document) => document.markdownPath === phaseInterviewOutputPath(selectedPhaseId));
  if (!interview) {
    return {
      complete: false,
      phaseId: selectedPhaseId,
      reason: "Phase Interview is required for Phase Intake completion.",
    };
  }
  const freshness = evaluateDocumentFreshness(workspaceRoot, interview.logicalDocumentId);
  const complete =
    interview.effectiveDisposition === "Approved" &&
    interview.documentReadState === "readable" &&
    freshness.state === "fresh";

  return {
    complete,
    phaseId: selectedPhaseId,
    reason: complete
      ? "Phase Intake is complete because the current Phase Interview is readable, fresh, and Approved."
      : "Phase Intake remains incomplete until the current Phase Interview is readable, fresh, and Approved.",
  };
}

function requireReadyPhaseInterviewContext(workspaceRoot: string): PhaseInterviewReadyContext {
  const context = resolvePhaseInterviewDraftContext(workspaceRoot);
  if (context.status !== "ready") {
    throw new Error(context.reason);
  }
  return context;
}

function phaseInterviewHandoffMetadata(
  workspaceRoot: string,
  context: PhaseInterviewReadyContext,
  sourceRevisions: PhaseInterviewReadyContext["sourceRevisions"],
): CanonicalDocumentMetadata {
  return {
    schemaVersion: 1,
    artifactType: "generated-handoff",
    artifactRevision: 1,
    participationRole: "nonReviewHandoff",
    identity: {
      handoffKind: "phase-interview",
      phaseId: context.selectedPhase.phaseId,
    },
    sourceRevisions,
    workflowData: mergeRepositoryAuthorityIntoWorkflowData(
      {
        handoffKind: "phase-interview",
        contractId: phaseInterviewSubmissionContractId,
        phase: context.selectedPhase,
        outputTarget: context.interviewMarkdownPath,
        requiredSections: [...phaseInterviewRequiredSections()],
      },
      inheritRepositoryAuthorityFromSourceRevisions(workspaceRoot, sourceRevisions),
    ),
    documentDisposition: { status: "Approved", notes: "", reviewedAt: null },
  };
}

function buildPhaseInterviewHandoffBody(
  context: PhaseInterviewReadyContext,
  sourceRevisions: PhaseInterviewReadyContext["sourceRevisions"],
): string {
  return [
    "# Phase Interview Handoff",
    "",
    `Contract ID: ${phaseInterviewSubmissionContractId}`,
    `Selected Phase ID: ${context.selectedPhase.phaseId}`,
    `Selected Phase Title: ${context.selectedPhase.title}`,
    `Selected Phase Order: ${context.selectedPhase.order}`,
    `Selected Phase Purpose: ${context.selectedPhase.purpose}`,
    `Phase Interview Markdown: ${context.interviewMarkdownPath}`,
    "",
    "Selected phase dependencies:",
    ...(context.selectedPhase.dependsOn.length > 0 ? context.selectedPhase.dependsOn.map((dependency) => `- ${dependency}`) : ["- none"]),
    "",
    "Selected phase source references:",
    ...(context.selectedPhase.sourceReferences.length > 0 ? context.selectedPhase.sourceReferences.map((reference) => `- ${reference}`) : ["- none"]),
    "",
    "Dependency closeout evidence:",
    ...(context.dependencyCloseouts.length > 0 ? context.dependencyCloseouts.map((document) => `- ${document.markdownPath}`) : ["- none"]),
    "",
    "Current source revisions:",
    ...sourceRevisions.map((source) => `- path: ${source.path} revision: ${source.revision}`),
    "",
    "Browser chat is not durable authority. This handoff supports conversation only; ChampCity A/I provides a separate Final Draft action after Operator confirmation.",
  ].join("\n");
}

function deriveWorkspaceState(context: PhaseInterviewReadyContext): PhaseInterviewWorkspaceState {
  if (!context.handoff) return "ready-for-handoff";
  if (!context.interview) return "waiting-for-output";
  if (context.interview.documentReadState !== "readable" || context.interview.readError || context.interview.freshnessState === "stale") {
    return "needs-attention";
  }
  if (context.interview.disposition === "Approved") return "completed";
  if (context.interview.disposition === "RevisionRequested") return "revision-requested";
  if (context.interview.disposition === "Rejected") return "rejected";
  return "ready-for-review";
}

function deriveRailStatus(state: PhaseInterviewWorkspaceState): PhaseInterviewWorkspaceModel["railStatus"] {
  if (state === "not-ready") return "Not Ready";
  if (state === "ready-for-handoff") return "Ready";
  if (state === "waiting-for-output") return "Waiting for Output";
  if (state === "completed") return "Completed";
  if (state === "needs-attention") return "Needs Attention";
  return "Awaiting Approval";
}

function requiredActionForState(state: PhaseInterviewWorkspaceState): string {
  switch (state) {
    case "ready-for-handoff":
      return "Prepare Phase Interview handoff, copy the MCP instruction, and send it manually in embedded ChatGPT.";
    case "waiting-for-output":
      return "Send the copied Phase Interview conversational handoff in embedded ChatGPT, complete the interview or zero-question confirmation path, confirm or correct the phase-understanding summary, then use the Final Draft handoff action.";
    case "ready-for-review":
      return "Review the Pending Phase Interview output and apply a disposition.";
    case "revision-requested":
      return "Send the revised Phase Interview conversational handoff in embedded ChatGPT, resolve the revision direction, confirm or correct the phase-understanding summary, then prepare and copy the Final Draft handoff to write the revised Phase Interview.";
    case "rejected":
      return "Resolve the rejected Phase Interview before continuing.";
    case "completed":
      return "Phase Interview is Approved; Phase Planning is ready.";
    default:
      return "Resolve Phase Interview evidence before reviewing.";
  }
}

function reasonForState(state: PhaseInterviewWorkspaceState): string {
  if (state === "ready-for-handoff") return "Approved Profile, Roadmap, Phase Map, and selected phase evidence are available.";
  if (state === "waiting-for-output") return "Current Approved handoff exists; exact Phase Interview output is not present.";
  if (state === "completed") return "Phase Interview is current, readable, fresh, and Approved.";
  return "Repository evidence controls Phase Interview status.";
}

function handoffMatchesCurrentEvidence(
  existing: NonNullable<ReturnType<typeof readExistingCanonical>>,
  expectedMetadata: CanonicalDocumentMetadata,
  expectedBodyMarkdown: string,
): boolean {
  const metadataWithoutRevision = (metadata: CanonicalDocumentMetadata) => ({
    schemaVersion: metadata.schemaVersion,
    artifactType: metadata.artifactType,
    participationRole: metadata.participationRole,
    identity: metadata.identity,
    sourceRevisions: metadata.sourceRevisions,
    workflowData: metadata.workflowData,
    documentDisposition: metadata.documentDisposition,
  });
  return (
    JSON.stringify(metadataWithoutRevision(existing.metadata)) ===
      JSON.stringify(metadataWithoutRevision(expectedMetadata)) &&
    existing.bodyMarkdown === expectedBodyMarkdown
  );
}

function readExistingCanonical(workspaceRoot: string, relativePath: string) {
  const absolutePath = path.join(workspaceRoot, relativePath);
  return fs.existsSync(absolutePath)
    ? parseCanonicalMarkdownDocument(fs.readFileSync(absolutePath, "utf8"))
    : null;
}

export function getPhaseInterviewDraftSubmissionStatus(workspaceRoot: string) {
  return getPhaseInterviewDraftStatus(workspaceRoot);
}

export function getPhaseInterviewActiveDraftPath(workspaceRoot: string): string | undefined {
  const active = getActivePhaseInterviewDraftSubmission(workspaceRoot);
  return active ? draftPathForPhaseInterview(active.submission) : undefined;
}
