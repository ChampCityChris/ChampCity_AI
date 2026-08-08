import fs from "node:fs";
import path from "node:path";
import {
  type CanonicalDocumentMetadata,
  metadataWithDisposition,
  parseCanonicalMarkdownDocument,
} from "../../shared/documents/canonicalMarkdown";
import type { DocumentDispositionStatus } from "../../shared/documents/documentDisposition";
import type {
  PhasePlanningDocumentIdentity,
  PhasePlanningWorkspaceModel,
  PhasePlanningWorkspaceState,
} from "../../shared/workspaceContracts";
import {
  evaluateDocumentFreshness,
} from "../documents/planningDocumentService";
import type { RollbackWriteOptions } from "../documents/documentDispositionWriter";
import {
  writeCanonicalMarkdownDocument,
  writeCanonicalMarkdownDocuments,
} from "../documents/canonicalMarkdownDocumentWriter";
import {
  candidateResolutionStatuses,
  canPreparePhasePlanningDraftBundle,
  draftPathForPhasePlanningSlot,
  getActivePhasePlanningDraftBundleSubmission,
  getPhasePlanningDraftBundleStatus,
  phasePlanningRequiredSections,
  phasePlanningSubmissionContractId,
  preparePhasePlanningDraftBundleSubmission,
  resolvePhasePlanningDraftContext,
  validateCandidates,
  type PhasePlanningArtifactIdentity,
  type PhasePlanningReadyContext,
  type WorkCardCandidate,
} from "./phasePlanningDraftBundle";
import {
  buildCreateMarkdownArtifactJsonBlock,
  buildMcpWorkspaceBindingPromptBlock,
} from "../integrations/mcpWorkspacePromptContract";
import {
  inheritRepositoryAuthorityFromSourceRevisions,
  mergeRepositoryAuthorityIntoWorkflowData,
} from "../documents/repositoryAuthority";

export {
  candidateResolutionStatuses,
  candidatesFromWorkCardPlanBody,
  getPhasePlanningDraftBundleStatus as getPhasePlanningDraftSubmissionStatus,
  phasePlanningRequiredSections,
  validateCandidates,
  type CandidateResolutionStatus,
  type WorkCardCandidate,
} from "./phasePlanningDraftBundle";

export interface PhasePlanningHandoffResult {
  phaseId: string;
  handoffMarkdownPath: string;
  phasePlanningMarkdownPath: string;
  workCardPlanMarkdownPath: string;
  alreadyPrepared?: boolean;
}

export interface PhasePlanningCompletion {
  complete: boolean;
  phaseId?: string;
  reason: string;
}

export function generatePhasePlanningHandoff(workspaceRoot: string): PhasePlanningHandoffResult {
  const context = requireReadyPhasePlanningContext(workspaceRoot);
  const metadata = phasePlanningHandoffMetadata(workspaceRoot, context);
  const bodyMarkdown = buildPhasePlanningHandoffBody(context);
  const existing = readExistingCanonical(workspaceRoot, context.handoffMarkdownPath);
  if (existing && handoffMatchesCurrentEvidence(existing, metadata, bodyMarkdown)) {
    preparePhasePlanningDraftBundleSubmission(workspaceRoot);
    return {
      phaseId: context.selectedPhase.phaseId,
      handoffMarkdownPath: context.handoffMarkdownPath,
      phasePlanningMarkdownPath: context.phasePlanningMarkdownPath,
      workCardPlanMarkdownPath: context.workCardPlanMarkdownPath,
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

  preparePhasePlanningDraftBundleSubmission(workspaceRoot);
  return {
    phaseId: context.selectedPhase.phaseId,
    handoffMarkdownPath: context.handoffMarkdownPath,
    phasePlanningMarkdownPath: context.phasePlanningMarkdownPath,
    workCardPlanMarkdownPath: context.workCardPlanMarkdownPath,
    alreadyPrepared: false,
  };
}

export function getPhasePlanningWorkspaceModel(
  workspaceRoot: string,
): PhasePlanningWorkspaceModel {
  const draftStatus = getPhasePlanningDraftBundleStatus(workspaceRoot);
  const context = resolvePhasePlanningDraftContext(workspaceRoot);
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
      canApplyBundleDisposition: false,
      phase: null,
      phasePlanningTarget: "",
      workCardPlanTarget: "",
      selectedPlanningDocumentRole: "phase-planning",
      bundleSynchronizationState: "invalid",
      draftSubmissionState: draftStatus?.submission.state,
      draftPromotionError: draftStatus?.promotionError,
    };
  }

  const phasePlanning = context.phasePlanning ?? context.invalidPhasePlanning;
  const workCardPlan = context.workCardPlan ?? context.invalidWorkCardPlan;
  const invalidReason = context.invalidPhasePlanningReason ?? context.invalidWorkCardPlanReason;
  const writableDraftStatus = draftStatus &&
    draftStatus.submission.state !== "promoted" &&
    draftStatus.submission.state !== "promotion-failed"
      ? draftStatus
      : undefined;
  const canPrepareHandoff = canPreparePhasePlanningDraftBundle(context) || !context.handoff;
  const canCopyHandoff = Boolean(context.handoff) && (
    canPreparePhasePlanningDraftBundle(context) || Boolean(writableDraftStatus)
  );
  const state = draftStatus?.submission.state === "promotion-failed" || invalidReason
    ? "needs-attention"
    : deriveWorkspaceState(context);
  const notes = sharedOperatorReviewNotes(phasePlanning, workCardPlan);

  return {
    state,
    railStatus: deriveRailStatus(state),
    requiredAction: draftStatus?.submission.state === "promotion-failed"
      ? `Phase Planning draft bundle promotion failed: ${draftStatus.promotionError ?? "Correct both drafts and prepare a fresh handoff."}`
      : invalidReason
      ? "Phase Planning outputs were saved but cannot be reviewed because the bundle is malformed, stale, partial, or mismatched."
      : requiredActionForState(state),
    reason: draftStatus?.submission.state === "promotion-failed"
      ? draftStatus.promotionError ?? "Phase Planning draft bundle promotion failed."
      : invalidReason
      ? `Phase Planning bundle cannot be reviewed: ${invalidReason}`
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
    canApplyBundleDisposition: canApplyBundleDisposition(context),
    phase: {
      phaseId: context.selectedPhase.phaseId,
      title: context.selectedPhase.title,
      order: context.selectedPhase.order,
      purpose: context.selectedPhase.purpose,
      dependsOn: [...context.selectedPhase.dependsOn],
      sourceReferences: [...context.selectedPhase.sourceReferences],
    },
    phasePlanningTarget: context.phasePlanningMarkdownPath,
    workCardPlanTarget: context.workCardPlanMarkdownPath,
    phasePlanningDocument: phasePlanning ? identityForContract(phasePlanning) : undefined,
    workCardPlanDocument: workCardPlan ? identityForContract(workCardPlan) : undefined,
    selectedPlanningDocumentRole: "phase-planning",
    bundleSynchronizationState: deriveBundleSynchronizationState(context),
    currentOperatorReviewNotes: notes,
  };
}

export function preparePhasePlanningHandoff(
  workspaceRoot: string,
): PhasePlanningWorkspaceModel {
  const result = generatePhasePlanningHandoff(workspaceRoot);
  return {
    ...getPhasePlanningWorkspaceModel(workspaceRoot),
    handoffPreparationMessage: result.alreadyPrepared
      ? "Phase Planning draft bundle prepared from the current handoff."
      : "Phase Planning handoff and draft bundle prepared.",
  };
}

export function getPhasePlanningHandoffInstruction(workspaceRoot: string): string {
  let model = getPhasePlanningWorkspaceModel(workspaceRoot);
  if (!model.handoffInstruction && (model.canCopyHandoff || model.canPrepareHandoff)) {
    model = preparePhasePlanningHandoff(workspaceRoot);
  }
  if (!model.canCopyHandoff || !model.handoffInstruction) {
    throw new Error(model.reason || "Phase Planning handoff is not ready to copy.");
  }
  return model.handoffInstruction;
}

export function setPhasePlanningBundleDisposition(
  workspaceRoot: string,
  phaseId: string,
  status: DocumentDispositionStatus,
  options: RollbackWriteOptions & { operatorReviewNotes?: string } = {},
): void {
  const notes = (options.operatorReviewNotes ?? "").trim();
  if (status === "RevisionRequested" && !notes) {
    throw new Error("RevisionRequested requires Operator revision instructions.");
  }
  const context = requireReadyPhasePlanningContext(workspaceRoot);
  if (context.selectedPhase.phaseId !== phaseId) {
    throw new Error("Phase Planning review phase does not match current selected phase.");
  }
  if (!canApplyBundleDisposition(context) || !context.phasePlanning || !context.workCardPlan) {
    throw new Error(context.invalidPhasePlanningReason ?? context.invalidWorkCardPlanReason ?? "Phase Planning and Work Card Plan must be synchronized and reviewable before disposition.");
  }
  const reviewedAt = new Date().toISOString();
  const phasePlanningExisting = readExistingCanonical(workspaceRoot, context.phasePlanning.markdownPath);
  const workCardPlanExisting = readExistingCanonical(workspaceRoot, context.workCardPlan.markdownPath);
  if (!phasePlanningExisting || !workCardPlanExisting) {
    throw new Error("Phase Planning bundle documents are not readable.");
  }
  writeCanonicalMarkdownDocuments([
    {
      workspaceRoot,
      relativePath: context.phasePlanning.markdownPath,
      metadata: metadataWithDisposition(phasePlanningExisting.metadata, status, notes, reviewedAt),
      bodyMarkdown: phasePlanningExisting.bodyMarkdown,
    },
    {
      workspaceRoot,
      relativePath: context.workCardPlan.markdownPath,
      metadata: metadataWithDisposition(workCardPlanExisting.metadata, status, notes, reviewedAt),
      bodyMarkdown: workCardPlanExisting.bodyMarkdown,
    },
  ]);
}

export function reviewPhasePlanningBundle(
  workspaceRoot: string,
  status: DocumentDispositionStatus,
  operatorReviewNotes = "",
): PhasePlanningWorkspaceModel {
  const context = requireReadyPhasePlanningContext(workspaceRoot);
  setPhasePlanningBundleDisposition(workspaceRoot, context.selectedPhase.phaseId, status, { operatorReviewNotes });
  return getPhasePlanningWorkspaceModel(workspaceRoot);
}

export function getPhasePlanningCompletion(
  workspaceRoot: string,
  phaseId?: string,
): PhasePlanningCompletion {
  const context = resolvePhasePlanningDraftContext(workspaceRoot);
  const selectedPhaseId = phaseId ?? (context.status === "ready" ? context.selectedPhase.phaseId : undefined);
  if (context.status !== "ready" || !selectedPhaseId || selectedPhaseId !== context.selectedPhase.phaseId) {
    return {
      complete: false,
      phaseId: selectedPhaseId,
      reason: context.status === "ready" ? "Phase Planning selected phase is unavailable." : context.reason,
    };
  }
  if (!context.phasePlanning || !context.workCardPlan) {
    return { complete: false, phaseId: selectedPhaseId, reason: "Phase Planning and Work Card Plan are both required." };
  }
  const phasePlanningFreshness = evaluateDocumentFreshness(workspaceRoot, context.phasePlanning.logicalDocumentId);
  const workCardPlanFreshness = evaluateDocumentFreshness(workspaceRoot, context.workCardPlan.logicalDocumentId);
  const complete =
    context.phasePlanning.disposition === "Approved" &&
    context.workCardPlan.disposition === "Approved" &&
    context.phasePlanning.documentReadState === "readable" &&
    context.workCardPlan.documentReadState === "readable" &&
    phasePlanningFreshness.state === "fresh" &&
    workCardPlanFreshness.state === "fresh" &&
    deriveBundleSynchronizationState(context) === "synchronized" &&
    readCandidatesFromCanonical(workspaceRoot, context.workCardPlan.markdownPath).ok;

  return {
    complete,
    phaseId: selectedPhaseId,
    reason: complete
      ? "Phase Planning is complete because both bundle documents are readable, fresh, valid, and Approved."
      : "Phase Planning remains incomplete until both bundle documents are readable, fresh, valid, and Approved.",
  };
}

function requireReadyPhasePlanningContext(workspaceRoot: string): PhasePlanningReadyContext {
  const context = resolvePhasePlanningDraftContext(workspaceRoot);
  if (context.status !== "ready") {
    throw new Error(context.reason);
  }
  return context;
}

function phasePlanningHandoffMetadata(workspaceRoot: string, context: PhasePlanningReadyContext): CanonicalDocumentMetadata {
  const sourceRevisions = [
    { path: context.profile.markdownPath, revision: context.profile.metadata.artifactRevision ?? 1 },
    { path: context.roadmap.markdownPath, revision: context.roadmap.metadata.artifactRevision ?? 1 },
    { path: context.phaseMap.markdownPath, revision: context.phaseMap.metadata.artifactRevision ?? 1 },
    { path: context.phaseInterview.markdownPath, revision: context.phaseInterview.metadata.artifactRevision ?? 1 },
  ];
  return {
    schemaVersion: 1,
    artifactType: "generated-handoff",
    artifactRevision: 1,
    participationRole: "nonReviewHandoff",
    identity: {
      handoffKind: "phase-planning",
      phaseId: context.selectedPhase.phaseId,
    },
    sourceRevisions,
    workflowData: mergeRepositoryAuthorityIntoWorkflowData(
      {
        handoffKind: "phase-planning",
        contractId: phasePlanningSubmissionContractId,
        phase: context.selectedPhase,
        phasePlanningTarget: context.phasePlanningMarkdownPath,
        workCardPlanTarget: context.workCardPlanMarkdownPath,
        requiredPhasePlanningSections: phasePlanningRequiredSections(),
        candidateFields: [
          "candidateId",
          "order",
          "title",
          "purpose",
          "dependsOn",
          "resolutionStatus",
          "resolutionReason",
          "evidencePaths",
          "carriedForwardToPhaseId",
        ],
        allowedResolutionStatuses: candidateResolutionStatuses,
      },
      inheritRepositoryAuthorityFromSourceRevisions(workspaceRoot, sourceRevisions),
    ),
    documentDisposition: { status: "Approved", notes: "", reviewedAt: null },
  };
}

function buildPhasePlanningHandoffBody(context: PhasePlanningReadyContext): string {
  const upstreamSourceRevisions = [
    { path: context.profile.markdownPath, revision: context.profile.metadata.artifactRevision ?? 1 },
    { path: context.roadmap.markdownPath, revision: context.roadmap.metadata.artifactRevision ?? 1 },
    { path: context.phaseMap.markdownPath, revision: context.phaseMap.metadata.artifactRevision ?? 1 },
    { path: context.phaseInterview.markdownPath, revision: context.phaseInterview.metadata.artifactRevision ?? 1 },
  ];
  return [
    "# Phase Planning Architect Handoff",
    "",
    `Contract ID: ${phasePlanningSubmissionContractId}`,
    `Selected Phase ID: ${context.selectedPhase.phaseId}`,
    `Selected Phase Title: ${context.selectedPhase.title}`,
    `Selected Phase Order: ${context.selectedPhase.order}`,
    `Selected Phase Purpose: ${context.selectedPhase.purpose}`,
    `Phase Planning Markdown: ${context.phasePlanningMarkdownPath}`,
    `Work Card Plan Markdown: ${context.workCardPlanMarkdownPath}`,
    "",
    "Selected phase dependencies:",
    ...(context.selectedPhase.dependsOn.length > 0 ? context.selectedPhase.dependsOn.map((dependency) => `- ${dependency}`) : ["- none"]),
    "",
    "Selected phase source references:",
    ...(context.selectedPhase.sourceReferences.length > 0 ? context.selectedPhase.sourceReferences.map((reference) => `- ${reference}`) : ["- none"]),
    "",
    "Current source revisions:",
    ...upstreamSourceRevisions.map((source) => `- path: ${source.path} revision: ${source.revision}`),
    "",
    "Candidate schema fields:",
    "- candidateId",
    "- order",
    "- title",
    "- purpose",
    "- dependsOn",
    "- resolutionStatus",
    "- resolutionReason",
    "- evidencePaths",
    "- carriedForwardToPhaseId only when required",
    "",
    `Allowed resolution statuses: ${candidateResolutionStatuses.join(", ")}`,
    "Do not persist completion state.",
    "Before the Work Card Plan exists, the application provides schema and validation rules only. It does not authorize any substantive candidate ID, title, purpose, dependency, or status.",
    "Use bracketed placeholder text only in examples, such as <candidate-id> and <candidate-title>.",
    "",
    "Browser chat is not durable authority. The Architect must create two temporary body-only Markdown drafts through the generic artifact toolbox Markdown writer.",
  ].join("\n");
}

function buildPhasePlanningHandoffInstruction(
  workspaceRoot: string,
  context: PhasePlanningReadyContext,
  submission: ReturnType<typeof preparePhasePlanningDraftBundleSubmission>,
): string {
  const revisionNotes = sharedOperatorReviewNotes(context.phasePlanning, context.workCardPlan);
  const includeRevisionNotes = (context.phasePlanning?.disposition === "RevisionRequested" || context.workCardPlan?.disposition === "RevisionRequested") && revisionNotes;
  const phasePlanningDraftPath = draftPathForPhasePlanningSlot(submission, "phase-planning");
  const workCardPlanDraftPath = draftPathForPhasePlanningSlot(submission, "work-card-plan");
  const promptWorkflowData = context.handoff?.metadata?.canonical?.workflowData ??
    mergeRepositoryAuthorityIntoWorkflowData(
      {},
      inheritRepositoryAuthorityFromSourceRevisions(workspaceRoot, context.sourceRevisions),
    );
  return [
    ...buildMcpWorkspaceBindingPromptBlock(workspaceRoot, promptWorkflowData),
    "This handoff is for the embedded Phase Planning Architect chat.",
    "",
    "Read these exact current inputs:",
    `- Approved Project Profile: ${context.profile.markdownPath}`,
    `- Approved Project Roadmap: ${context.roadmap.markdownPath}`,
    `- Approved Phase Map: ${context.phaseMap.markdownPath}`,
    `- Selected Phase Map entry: ${context.selectedPhase.phaseId} / ${context.selectedPhase.title}`,
    `- Approved current Phase Interview: ${context.phaseInterview.markdownPath}`,
    `- Approved current Phase Planning handoff: ${context.handoff?.markdownPath ?? context.handoffMarkdownPath}`,
    "",
    "Use the Approved Phase Planning handoff as authority for phase identity, exact final targets, source revisions, required headings, candidate fields, allowed resolution statuses, and validation rules.",
    "",
    "Produce both complete Markdown document bodies for these exact repository-relative final targets:",
    `- Phase Planning target: ${context.phasePlanningMarkdownPath}`,
    `- Work Card Plan target: ${context.workCardPlanMarkdownPath}`,
    "",
    "Both outputs belong to one atomic Phase Planning draft bundle.",
    "MCP creates only these temporary body-only drafts:",
    `- Temporary Phase Planning draft path: ${phasePlanningDraftPath}`,
    `- Temporary Work Card Plan draft path: ${workCardPlanDraftPath}`,
    "ChampCity A/I owns final targets, canonical metadata, validation, revisions, atomic promotion, cleanup, and review state.",
    "The workflow remains incomplete until both temporary drafts are created and ChampCity A/I promotes the bundle.",
    "",
    "The Phase Planning Markdown body must contain these exact headings:",
    "# Phase Planning",
    ...phasePlanningRequiredSections().map((heading) => `## ${heading}`),
    "",
    "The Work Card Plan Markdown body must contain exactly one fenced JSON block marked champcity-work-card-plan, and the parsed JSON root must be an array.",
    "Each array entry must use only the current WorkCardCandidate contract fields:",
    "- candidateId",
    "- order",
    "- title",
    "- purpose",
    "- dependsOn",
    "- resolutionStatus",
    "- resolutionReason",
    "- evidencePaths",
    "- carriedForwardToPhaseId only when required",
    "",
    `Allowed resolution statuses: ${candidateResolutionStatuses.join(", ")}`,
    "Do not persist completion state. Do not introduce a wrapper object, second schema, or alternate candidate representation.",
    "Do not invent a default candidate merely because the list is empty; author candidates only from project and phase evidence.",
    "",
    "Current source revisions:",
    ...context.sourceRevisions.map((source) => `- path: ${source.path} revision: ${source.revision}`),
    "",
    "When the complete Phase Planning body is ready, call artifact_toolbox.create_markdown_artifact with this invocation shape:",
    "```json",
    ...buildCreateMarkdownArtifactJsonBlock(
      workspaceRoot,
      phasePlanningDraftPath,
      "<complete body-only Phase Planning Markdown>",
      promptWorkflowData,
    ),
    "```",
    "",
    "When the complete Work Card Plan body is ready, call artifact_toolbox.create_markdown_artifact with this invocation shape:",
    "```json",
    ...buildCreateMarkdownArtifactJsonBlock(
      workspaceRoot,
      workCardPlanDraftPath,
      "<complete body-only Work Card Plan Markdown>",
      promptWorkflowData,
    ),
    "```",
    "Do not supply caller metadata, canonical metadata, metadata delimiters, final canonical output paths, source revisions, route selectors, domain save actions, manual imports, file-copy fallbacks, or any other authority fields as params.",
    "After both drafts are created, respond with a concise draft-created confirmation.",
    "If the action is unavailable, denied, or fails, report the exact tool failure and remain incomplete.",
    ...(includeRevisionNotes ? ["", "Current Operator revision instructions:", revisionNotes] : []),
  ].join("\n");
}

function deriveWorkspaceState(context: PhasePlanningReadyContext): PhasePlanningWorkspaceState {
  if (!context.handoff) return "ready-for-handoff";
  if (!context.phasePlanning && !context.workCardPlan) return "waiting-for-output";
  if (!context.phasePlanning || !context.workCardPlan) return "partial-output";
  if (deriveBundleSynchronizationState(context) !== "synchronized") return "needs-attention";
  if (context.phasePlanning.disposition === "Approved" && context.workCardPlan.disposition === "Approved") return "completed";
  if (context.phasePlanning.disposition === "RevisionRequested" || context.workCardPlan.disposition === "RevisionRequested") return "revision-requested";
  if (context.phasePlanning.disposition === "Rejected" || context.workCardPlan.disposition === "Rejected") return "rejected";
  return "ready-for-review";
}

function deriveRailStatus(state: PhasePlanningWorkspaceState): PhasePlanningWorkspaceModel["railStatus"] {
  if (state === "not-ready") return "Not Ready";
  if (state === "ready-for-handoff") return "Ready";
  if (state === "waiting-for-output") return "Waiting for Output";
  if (state === "completed") return "Completed";
  if (state === "needs-attention") return "Needs Attention";
  return "Awaiting Approval";
}

function requiredActionForState(state: PhasePlanningWorkspaceState): string {
  switch (state) {
    case "ready-for-handoff":
      return "Prepare Phase Planning handoff, copy the MCP instruction, and send it manually in embedded ChatGPT.";
    case "waiting-for-output":
      return "Paste and send the copied Phase Planning instruction in embedded ChatGPT, then wait for both MCP-written drafts.";
    case "partial-output":
      return "Wait for both exact Phase Planning and Work Card Plan outputs before review.";
    case "ready-for-review":
      return "Review both current outputs, then apply one shared bundle disposition.";
    case "revision-requested":
      return "Copy the revised Phase Planning instruction with revision notes and send it in embedded ChatGPT.";
    case "rejected":
      return "Resolve the rejected Phase Planning bundle before continuing.";
    case "completed":
      return "Phase Planning is complete; Work Card Intake is ready.";
    default:
      return "Resolve Phase Planning evidence before reviewing.";
  }
}

function reasonForState(state: PhasePlanningWorkspaceState): string {
  if (state === "ready-for-handoff") return "Approved Phase Interview and selected phase evidence are available.";
  if (state === "waiting-for-output") return "Current Approved handoff exists; exact Phase Planning and Work Card Plan outputs are not present.";
  if (state === "partial-output") return "One Phase Planning bundle output is missing.";
  if (state === "completed") return "Both Phase Planning bundle outputs are current, synchronized, readable, valid, and Approved.";
  return "Repository evidence controls Phase Planning status.";
}

function canApplyBundleDisposition(context: PhasePlanningReadyContext): boolean {
  return Boolean(context.phasePlanning && context.workCardPlan && deriveBundleSynchronizationState(context) === "synchronized");
}

function deriveBundleSynchronizationState(context: PhasePlanningReadyContext): PhasePlanningWorkspaceModel["bundleSynchronizationState"] {
  if (context.invalidPhasePlanningReason || context.invalidWorkCardPlanReason) return "invalid";
  if (!context.phasePlanning && !context.workCardPlan) return "missing";
  if (!context.phasePlanning || !context.workCardPlan) return "partial";
  if (context.phasePlanning.disposition !== context.workCardPlan.disposition) return "mixed-disposition";
  if (context.phasePlanning.operatorReviewNotes !== context.workCardPlan.operatorReviewNotes) return "mixed-notes";
  return "synchronized";
}

function sharedOperatorReviewNotes(
  phasePlanning: PhasePlanningArtifactIdentity | undefined,
  workCardPlan: PhasePlanningArtifactIdentity | undefined,
): string | undefined {
  if (!phasePlanning || !workCardPlan) return phasePlanning?.operatorReviewNotes ?? workCardPlan?.operatorReviewNotes;
  return phasePlanning.operatorReviewNotes === workCardPlan.operatorReviewNotes
    ? phasePlanning.operatorReviewNotes
    : "Mixed review notes require attention.";
}

function identityForContract(identity: PhasePlanningArtifactIdentity): PhasePlanningDocumentIdentity {
  return {
    logicalDocumentId: identity.logicalDocumentId,
    markdownPath: identity.markdownPath,
    artifactRevision: identity.artifactRevision,
    disposition: identity.disposition,
    documentReadState: identity.documentReadState,
    freshnessState: identity.freshnessState,
    participationRole: identity.participationRole,
    artifactType: identity.artifactType,
    readError: identity.readError,
    operatorReviewNotes: identity.operatorReviewNotes,
  };
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
    existing.bodyMarkdown === normalizeBody(expectedBodyMarkdown)
  );
}

function normalizeBody(bodyMarkdown: string): string {
  return `${bodyMarkdown.replace(/\r\n?/g, "\n").replace(/\n*$/, "")}\n`;
}

function readCandidatesFromCanonical(
  workspaceRoot: string,
  relativePath: string,
): { ok: boolean; candidates: WorkCardCandidate[] } {
  try {
    const parsed = parseCanonicalMarkdownDocument(fs.readFileSync(path.join(workspaceRoot, relativePath), "utf8"));
    return { ok: true, candidates: validateCandidates(parsed.metadata.workflowData.candidates) };
  } catch {
    return { ok: false, candidates: [] };
  }
}

function readExistingCanonical(workspaceRoot: string, relativePath: string) {
  const absolutePath = path.join(workspaceRoot, relativePath);
  return fs.existsSync(absolutePath)
    ? parseCanonicalMarkdownDocument(fs.readFileSync(absolutePath, "utf8"))
    : null;
}

export function getPhasePlanningActiveDraftPaths(workspaceRoot: string): string[] {
  const active = getActivePhasePlanningDraftBundleSubmission(workspaceRoot);
  return active
    ? [
        draftPathForPhasePlanningSlot(active.submission, "phase-planning"),
        draftPathForPhasePlanningSlot(active.submission, "work-card-plan"),
      ]
    : [];
}
