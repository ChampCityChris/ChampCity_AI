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
  getPhaseInterviewDraftStatus,
  phaseInterviewHandoffPath,
  phaseInterviewOutputPath,
  phaseInterviewRequiredSections,
  phaseInterviewSubmissionContractId,
  preparePhaseInterviewDraftSubmission,
  resolvePhaseInterviewDraftContext,
  type PhaseInterviewReadyContext,
} from "./phaseInterviewDraftOutput";

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
  const metadata = phaseInterviewHandoffMetadata(context, sourceRevisions);
  const bodyMarkdown = buildPhaseInterviewHandoffBody(context, sourceRevisions);
  const existing = readExistingCanonical(workspaceRoot, context.handoffMarkdownPath);
  if (existing && handoffMatchesCurrentEvidence(existing, metadata, bodyMarkdown)) {
    preparePhaseInterviewDraftSubmission(workspaceRoot);
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

  preparePhaseInterviewDraftSubmission(workspaceRoot);
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
  const canCopyHandoff = Boolean(context.handoff) && (
    canPreparePhaseInterviewDraft(context) || Boolean(writableDraftStatus)
  );
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
    handoffState: canCopyHandoff || canPrepareHandoff ? "handoff-ready" : "handoff-unavailable",
    handoffMarkdownPath: context.handoffMarkdownPath,
    handoffInstruction: writableDraftStatus ? writableDraftStatus.preparedInstruction : undefined,
    handoffArtifactRevision: context.handoff?.metadata.artifactRevision,
    handoffPreparationMessage: undefined,
    draftSubmissionState: draftStatus?.submission.state,
    draftPromotionError: draftStatus?.promotionError,
    canPrepareHandoff,
    canCopyHandoff,
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
  return {
    ...getPhaseInterviewWorkspaceModel(workspaceRoot),
    handoffPreparationMessage: result.alreadyPrepared
      ? "Phase Interview draft prepared from the current handoff."
      : "Phase Interview handoff and draft prepared.",
  };
}

export function getPhaseInterviewHandoffInstruction(workspaceRoot: string): string {
  let model = getPhaseInterviewWorkspaceModel(workspaceRoot);
  if (!model.handoffInstruction && (model.canCopyHandoff || model.canPrepareHandoff)) {
    model = preparePhaseInterviewHandoff(workspaceRoot);
  }
  if (!model.canCopyHandoff || !model.handoffInstruction) {
    throw new Error(model.reason || "Phase Interview handoff is not ready to copy.");
  }
  return model.handoffInstruction;
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
    workflowData: {
      handoffKind: "phase-interview",
      contractId: phaseInterviewSubmissionContractId,
      phase: context.selectedPhase,
      outputTarget: context.interviewMarkdownPath,
      requiredSections: [...phaseInterviewRequiredSections()],
    },
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
    "Browser chat is not durable authority. The Architect must create one temporary body-only Markdown draft through the generic artifact toolbox Markdown writer.",
  ].join("\n");
}

function buildPhaseInterviewHandoffInstruction(
  context: PhaseInterviewReadyContext,
  draftMarkdownPath: string,
): string {
  const revisionNotes = context.interview?.disposition === "RevisionRequested"
    ? context.interview.operatorReviewNotes
    : undefined;
  return [
    "Use ChampCity MCP with repository reference <PROJECT_REPO>.",
    "This handoff is for the embedded Phase Interview Architect chat.",
    "Resolve the configured workspace ID through diagnostics_toolbox.list_workspaces when it is not already known.",
    "",
    "Read these exact current inputs:",
    `- Approved Project Profile: ${context.profile.markdownPath}`,
    `- Approved Project Roadmap: ${context.roadmap.markdownPath}`,
    `- Approved Phase Map: ${context.phaseMap.markdownPath}`,
    `- Selected phase entry: ${context.selectedPhase.phaseId} / ${context.selectedPhase.title}`,
    `- Current Phase Interview handoff: ${context.handoff?.markdownPath ?? context.handoffMarkdownPath}`,
    ...(context.dependencyCloseouts.length > 0
      ? context.dependencyCloseouts.map((document) => `- Approved dependency closeout: ${document.markdownPath}`)
      : ["- Approved dependency closeouts: none"]),
    "",
    "Do not ask for information already resolved by project evidence.",
    "Ask one primary question at a time in plain language.",
    "Make Architect-owned technical recommendations rather than transferring design work to the Operator.",
    "When a material choice exists, provide your recommended answer first.",
    "The Operator may answer `use your recommendation` or `unsure`; treat either as permission to proceed with the best evidence-grounded recommendation.",
    "Aim for approximately 5-10 substantive questions as a soft range.",
    "Before final output, summarize decisions and remaining issues.",
    "Confirm the final phase understanding before creating the document unless the Operator directs immediate completion.",
    "The Phase Interview resolves phase scope, non-scope, inherited constraints, dependencies, unknowns, risks, assumptions, acceptance direction, and planning inputs.",
    "Do not pre-author Work Cards and do not replace Phase Planning.",
    "",
    "The final Phase Interview Markdown body must contain these exact section headings:",
    ...phaseInterviewRequiredSections().map((heading) => `- ${heading}`),
    "",
    "MCP creates only this temporary body-only draft:",
    `- Temporary Phase Interview draft path: ${draftMarkdownPath}`,
    `- Final canonical target owned by ChampCity A/I: ${context.interviewMarkdownPath}`,
    "ChampCity A/I owns final canonical metadata, validation, revision, promotion, cleanup, and review state.",
    "The workflow remains incomplete until the temporary draft is created and ChampCity A/I promotes it.",
    "",
    "When the complete body is ready, call artifact_toolbox.create_markdown_artifact with this invocation shape:",
    "```json",
    "{",
    '  "action": "create_markdown_artifact",',
    '  "workspaceId": "<resolved workspace ID>",',
    '  "params": {',
    '    "relativePath": "' + draftMarkdownPath + '",',
    '    "content": "<complete body-only Phase Interview Markdown>",',
    '    "overwrite": false',
    "  }",
    "}",
    "```",
    "Do not supply canonical metadata, metadata delimiters, final canonical output paths, source revisions, route selectors, fallback fields, hidden authorization values, or any other authority fields as params.",
    "Do not call retired Phase Interview save actions, direct final-body writes, domain-specific write routes, old-action aliases, dual-write routes, manual imports, local import fields, or manual file-copy fallbacks.",
    "After the draft is created, respond with a concise draft-created confirmation.",
    "If the action is unavailable, denied, or fails, report the exact tool failure and remain incomplete.",
    "",
    "Current source revisions:",
    ...context.sourceRevisions.map((source) => `- path: ${source.path} revision: ${source.revision}`),
    ...(revisionNotes ? ["", "Current Operator revision instructions:", revisionNotes] : []),
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
      return "Paste and send the copied Phase Interview instruction in embedded ChatGPT, then wait for the MCP-written output.";
    case "ready-for-review":
      return "Review the Pending Phase Interview output and apply a disposition.";
    case "revision-requested":
      return "Copy the revised Phase Interview instruction and send it in embedded ChatGPT.";
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
