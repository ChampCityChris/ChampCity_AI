import fs from "node:fs";
import path from "node:path";
import {
  type CanonicalDocumentMetadata,
  metadataWithDisposition,
  parseCanonicalMarkdownDocument,
} from "../../shared/documents/canonicalMarkdown";
import type { DocumentDispositionStatus } from "../../shared/documents/documentDisposition";
import type {
  ProjectPlanningDocumentIdentity,
  ProjectPlanningWorkspaceModel,
  ProjectPlanningWorkspaceState,
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
  resolveProjectPlanningContext,
  type ProjectPlanningArtifactIdentity,
} from "./projectPlanningContext";
import {
  getProjectPlanningDraftBundleStatus,
  prepareProjectPlanningDraftBundleSubmission,
} from "./projectPlanningDraftBundle";
import {
  projectPlanningRequiredProfileSections,
  projectPlanningRequiredRoadmapSections,
} from "./projectPlanningPreflight";
import {
  inheritRepositoryBindingFromSourceRevisions,
  mergeRepositoryBindingIntoWorkflowData,
} from "../documents/repositoryBinding";
import {
  resolvePlanningProjectionContext,
  type PlanningProjectionContext,
} from "../documents/planningProjectionContext";

const projectPlanningSubmissionContractId = "project-planning-output-submission-v2";

export interface ProjectPlanningHandoffResult {
  handoffMarkdownPath: string;
  profileMarkdownPath: string;
  roadmapMarkdownPath: string;
  alreadyPrepared: boolean;
}

export interface ProjectPlanningCompletion {
  complete: boolean;
  reason: string;
}

export function generateProjectPlanningHandoff(workspaceRoot: string): ProjectPlanningHandoffResult {
  const context = requireReadyProjectPlanningContext(workspaceRoot);
  const existing = readExistingCanonical(workspaceRoot, context.handoffMarkdownPath);
  const bodyMarkdown = buildProjectPlanningHandoffBody(context);
  const metadata = projectPlanningHandoffMetadata(
    workspaceRoot,
    context,
    existing ? existing.metadata.artifactRevision + 1 : 1,
  );
  if (existing && handoffMatchesCurrentEvidence(existing, metadata, bodyMarkdown)) {
    return {
      handoffMarkdownPath: context.handoffMarkdownPath,
      profileMarkdownPath: context.profileMarkdownPath,
      roadmapMarkdownPath: context.roadmapMarkdownPath,
      alreadyPrepared: true,
    };
  }

  writeCanonicalMarkdownDocument({
    workspaceRoot,
    relativePath: context.handoffMarkdownPath,
    metadata,
    bodyMarkdown,
  });

  return {
    handoffMarkdownPath: context.handoffMarkdownPath,
    profileMarkdownPath: context.profileMarkdownPath,
    roadmapMarkdownPath: context.roadmapMarkdownPath,
    alreadyPrepared: false,
  };
}

export function getProjectPlanningWorkspaceModel(
  workspaceRoot: string,
  planningContext?: PlanningProjectionContext,
): ProjectPlanningWorkspaceModel {
  const draftStatus = getProjectPlanningDraftBundleStatus(workspaceRoot);
  const contextSnapshot = resolvePlanningProjectionContext(workspaceRoot, planningContext);
  const context = resolveProjectPlanningContext(workspaceRoot, contextSnapshot);
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
      selectedPlanningDocumentRole: "profile",
      bundleSynchronizationState: "invalid",
      draftSubmissionState: draftStatus?.submission.state,
      draftPromotionError: draftStatus?.promotionError,
    };
  }

  const invalidReason = context.invalidHandoffReason ?? context.invalidProfileReason ?? context.invalidRoadmapReason;
  const profile = context.profile ?? context.invalidProfile;
  const roadmap = context.roadmap ?? context.invalidRoadmap;
  const writableDraftStatus = draftStatus &&
    draftStatus.submission.state !== "promoted" &&
    draftStatus.submission.state !== "promotion-failed"
      ? draftStatus
      : undefined;
  const canPrepareDraft = canPrepareDraftBundleForContext(context);
  const canPrepareHandoff = canPrepareHandoffForContext(context);
  const state = draftStatus?.submission.state === "promotion-failed" || invalidReason
    ? "needs-attention"
    : deriveWorkspaceState(context);
  const hasCurrentPreparedSubmission = Boolean(writableDraftStatus);
  const canCopyHandoff = Boolean(context.handoff) && (
    hasCurrentPreparedSubmission ||
    (!context.profile && !context.roadmap && canPrepareDraft)
  );
  const notes = sharedOperatorReviewNotes(profile, roadmap);
  return {
    state,
    railStatus: deriveRailStatus(state),
    requiredAction: draftStatus?.submission.state === "promotion-failed"
      ? `Project Planning draft bundle promotion failed: ${draftStatus.promotionError ?? "Correct both drafts and prepare a fresh handoff."}`
      : requiredActionForState(state, hasCurrentPreparedSubmission),
    reason: draftStatus?.submission.state === "promotion-failed"
      ? draftStatus.promotionError ?? "Project Planning draft bundle promotion failed."
      : invalidReason ?? reasonForState(state),
    evidencePaths: context.evidencePaths,
    handoffState: context.handoff && (canPrepareDraft || writableDraftStatus)
      ? "handoff-ready"
      : "handoff-unavailable",
    handoffMarkdownPath: context.handoffMarkdownPath,
    handoffInstruction: writableDraftStatus ? writableDraftStatus.preparedInstruction : undefined,
    handoffArtifactRevision: context.handoff?.artifactRevision,
    draftSubmissionState: draftStatus?.submission.state,
    draftPromotionError: draftStatus?.promotionError,
    canPrepareHandoff,
    canCopyHandoff,
    canApplyBundleDisposition: canApplyBundleDisposition(context),
    reconciliationMode: context.reconciliationMode,
    repositoryReviewRequired: context.repositoryReviewRequired,
    repositoryReviewContext: context.repositoryReviewContext,
    legacyPlanningPaths: context.legacyPlanningPaths,
    sourceEvidencePaths: context.sourceEvidencePaths,
    projectProfileTarget: context.profileMarkdownPath,
    projectRoadmapTarget: context.roadmapMarkdownPath,
    profileDocument: profile ? identityForContract(profile) : undefined,
    roadmapDocument: roadmap ? identityForContract(roadmap) : undefined,
    selectedPlanningDocumentRole: "profile",
    bundleSynchronizationState: deriveBundleSynchronizationState(context),
    currentOperatorReviewNotes: notes,
  };
}

export function prepareProjectPlanningHandoff(
  workspaceRoot: string,
): ProjectPlanningWorkspaceModel {
  const result = generateProjectPlanningHandoff(workspaceRoot);
  prepareProjectPlanningDraftBundleSubmission(workspaceRoot);
  const model = getProjectPlanningWorkspaceModel(workspaceRoot);
  return {
    ...model,
    handoffPreparationMessage: model.state === "revision-requested" && model.canCopyHandoff
      ? "Revision Request Ready."
      : result.alreadyPrepared
      ? "Project Planning draft bundle prepared from the current handoff."
      : "Project Planning handoff and draft bundle prepared.",
  };
}

export function getProjectPlanningHandoffInstruction(workspaceRoot: string): string {
  let model = getProjectPlanningWorkspaceModel(workspaceRoot);
  if (!model.handoffInstruction && model.canCopyHandoff) {
    model = prepareProjectPlanningHandoff(workspaceRoot);
  }
  if (!model.canCopyHandoff || !model.handoffInstruction) {
    throw new Error(model.reason || "Project Planning handoff is not ready to copy.");
  }
  return model.handoffInstruction;
}

export function setProjectPlanningBundleDisposition(
  workspaceRoot: string,
  status: DocumentDispositionStatus,
  options: RollbackWriteOptions & { operatorReviewNotes?: string } = {},
): void {
  const notes = (options.operatorReviewNotes ?? "").trim();
  if (status === "RevisionRequested" && !notes) {
    throw new Error("RevisionRequested requires Operator revision instructions.");
  }
  const context = requireReadyProjectPlanningContext(workspaceRoot);
  if (!canApplyBundleDisposition(context) || !context.profile || !context.roadmap) {
    throw new Error(context.invalidProfileReason ?? context.invalidRoadmapReason ?? "Project Profile and Project Roadmap must be synchronized and reviewable before disposition.");
  }
  const reviewedAt = new Date().toISOString();
  const profileExisting = readExistingCanonical(workspaceRoot, context.profile.markdownPath);
  const roadmapExisting = readExistingCanonical(workspaceRoot, context.roadmap.markdownPath);
  if (!profileExisting || !roadmapExisting) {
    throw new Error("Project Planning bundle documents are not readable.");
  }
  writeCanonicalMarkdownDocuments([
    {
      workspaceRoot,
      relativePath: context.profile.markdownPath,
      metadata: metadataWithDisposition(profileExisting.metadata, status, notes, reviewedAt),
      bodyMarkdown: profileExisting.bodyMarkdown,
    },
    {
      workspaceRoot,
      relativePath: context.roadmap.markdownPath,
      metadata: metadataWithDisposition(roadmapExisting.metadata, status, notes, reviewedAt),
      bodyMarkdown: roadmapExisting.bodyMarkdown,
    },
  ]);
}

export function reviewProjectPlanningBundle(
  workspaceRoot: string,
  status: DocumentDispositionStatus,
  operatorReviewNotes = "",
): ProjectPlanningWorkspaceModel {
  setProjectPlanningBundleDisposition(workspaceRoot, status, { operatorReviewNotes });
  return getProjectPlanningWorkspaceModel(workspaceRoot);
}

export function getProjectPlanningCompletion(
  workspaceRoot: string,
  planningContext?: PlanningProjectionContext,
): ProjectPlanningCompletion {
  const contextSnapshot = resolvePlanningProjectionContext(workspaceRoot, planningContext);
  const context = resolveProjectPlanningContext(workspaceRoot, contextSnapshot);
  if (context.status !== "ready" || !context.profile || !context.roadmap) {
    return { complete: false, reason: "Project Profile and Project Roadmap are both required." };
  }
  const profileFreshness = evaluateDocumentFreshness(contextSnapshot, context.profile.logicalDocumentId);
  const roadmapFreshness = evaluateDocumentFreshness(contextSnapshot, context.roadmap.logicalDocumentId);
  const complete =
    context.profile.disposition === "Approved" &&
    context.roadmap.disposition === "Approved" &&
    context.profile.documentReadState === "readable" &&
    context.roadmap.documentReadState === "readable" &&
    profileFreshness.state === "fresh" &&
    roadmapFreshness.state === "fresh" &&
    deriveBundleSynchronizationState(context) === "synchronized";

  return {
    complete,
    reason: complete
      ? "Project Planning is complete because Project Profile and Project Roadmap are readable, fresh, and Approved."
      : "Project Planning remains incomplete until both Project Profile and Project Roadmap are readable, fresh, and Approved.",
  };
}

function requireReadyProjectPlanningContext(workspaceRoot: string) {
  const context = resolveProjectPlanningContext(workspaceRoot);
  if (context.status !== "ready") {
    throw new Error(context.reason);
  }
  return context;
}

function deriveWorkspaceState(context: ReturnType<typeof requireReadyProjectPlanningContext>): ProjectPlanningWorkspaceState {
  if (!context.handoff) return "ready-for-handoff";
  if (!context.profile && !context.roadmap) return "waiting-for-output";
  if (!context.profile || !context.roadmap) return "partial-output";
  if (deriveBundleSynchronizationState(context) !== "synchronized") return "needs-attention";
  if (context.profile.disposition === "Approved" && context.roadmap.disposition === "Approved") return "completed";
  if (context.profile.disposition === "RevisionRequested" || context.roadmap.disposition === "RevisionRequested") return "revision-requested";
  if (context.profile.disposition === "Rejected" || context.roadmap.disposition === "Rejected") return "rejected";
  return "ready-for-review";
}

function projectPlanningHandoffMetadata(
  workspaceRoot: string,
  context: ReturnType<typeof requireReadyProjectPlanningContext>,
  artifactRevision: number,
): CanonicalDocumentMetadata {
  return {
    schemaVersion: 1,
    artifactType: "generated-handoff",
    artifactRevision,
    participationRole: "nonReviewHandoff",
    identity: { handoffKind: "project-planning" },
    sourceRevisions: context.sourceRevisions,
    workflowData: mergeRepositoryBindingIntoWorkflowData(
      {
        handoffKind: "project-planning",
        contractId: projectPlanningSubmissionContractId,
        projectProfileTarget: context.profileMarkdownPath,
        projectRoadmapTarget: context.roadmapMarkdownPath,
        reconciliationMode: context.reconciliationMode,
        repositoryReviewRequired: context.repositoryReviewRequired,
        repositoryReviewContext: context.repositoryReviewContext,
        legacyPlanningPaths: context.legacyPlanningPaths,
        sourceEvidencePaths: context.sourceEvidencePaths,
        requiredProfileSections: projectPlanningRequiredProfileSections(),
        requiredRoadmapSections: projectPlanningRequiredRoadmapSections(),
      },
      inheritRepositoryBindingFromSourceRevisions(workspaceRoot, context.sourceRevisions),
    ),
    documentDisposition: { status: "Approved", notes: "", reviewedAt: null },
  };
}

function buildProjectPlanningHandoffBody(context: ReturnType<typeof requireReadyProjectPlanningContext>): string {
  return [
    "# Project Planning Handoff",
    "",
    `Contract ID: ${projectPlanningSubmissionContractId}`,
    `Reconciliation Mode: ${context.reconciliationMode}`,
    `Repository Review Required: ${context.repositoryReviewRequired ? "true" : "false"}`,
    `Repository Review Context: ${context.repositoryReviewContext}`,
    "",
    "Repository evidence and architecture-preservation rules:",
    "- When repository review context is present, use it to identify and inspect materially relevant evidence before drafting.",
    "- Distinguish verified current implementation, established planning or architecture intent, historical or legacy evidence, and unresolved assumptions.",
    "- Governing, approved, adopted, canonical, or otherwise Operator-established architecture constrains the Project Profile and Project Roadmap unless the Operator explicitly revises it.",
    "- Do not invent a second architecture or reinterpret established architecture into incompatible subsystem ownership merely to fill the planning template.",
    "",
    `Project Intake Markdown: ${context.projectIntake.markdownPath}`,
    `Architect Interview Prompt Markdown: ${context.prompt.markdownPath}`,
    `Approved Architect Interview Markdown: ${context.interview.markdownPath}`,
    `Project Profile Markdown: ${context.profileMarkdownPath}`,
    `Project Roadmap Markdown: ${context.roadmapMarkdownPath}`,
    "",
    "Current source revisions:",
    ...context.sourceRevisions.map((source) => `- ${source.path} revision ${source.revision}`),
    "",
    "Legacy planning evidence paths:",
    ...(context.legacyPlanningPaths.length > 0 ? context.legacyPlanningPaths.map((path) => `- ${path}`) : ["- none"]),
    "",
    "Source evidence paths:",
    ...(context.sourceEvidencePaths.length > 0 ? context.sourceEvidencePaths.map((path) => `- ${path}`) : ["- none"]),
    "",
    "Required Project Profile sections:",
    ...projectPlanningRequiredProfileSections().map((heading) => `- ${heading}`),
    "",
    "Ground-zero baseline rule:",
    "- Project ground zero is the selected project repository plus the local development machine.",
    "- Do not assume greenfield means the development machine is ready.",
    "- In Current-State Baseline, Existing Implementation, and Risks and Unknowns, distinguish verified installed, verified missing, and unverified development capabilities; repository-native dependency or bootstrap mechanisms; project-local agent, build, and validation instructions; and any required capability explicitly externally managed.",
    "- A missing required local development capability is project work by default unless approved evidence establishes external ownership.",
    "",
    "Required Project Roadmap sections:",
    ...projectPlanningRequiredRoadmapSections().map((heading) => `- ${heading}`),
    "",
    "Roadmap sequencing rule:",
    "- Prioritize the shortest dependency-complete path to the next coherent usable or productive milestone.",
    "- Organize phases around independently meaningful outcomes rather than architectural components merely because those components exist.",
    "- Place enabling, tooling, and foundation work at or immediately before its first consuming outcome when it can remain one coherent bounded phase.",
    "- Avoid standalone horizontal foundation phases without an independent outcome; create one only when the prerequisite is independently substantial, serves multiple later outcomes, or cannot remain bounded inside the first consuming outcome.",
    "- Avoid speculative prework not required by the current milestone, preserve semantically required architecture dependency or extraction order, and use Phase Planning or Work Card dependencies for fine-grained sequencing.",
    "- Missing development capabilities required by planned implementation must be sequenced as project work before dependent work.",
    "- Engineering or foundation stages must establish both machine readiness and repository readiness when applicable.",
    "- Required capabilities must derive from approved architecture and intended implementation work; do not invent tools merely to fill a foundation.",
    "",
    "Browser chat is not a durable record. The Architect must create both temporary body-only Markdown drafts through the generic artifact toolbox Markdown writer.",
    "",
  ].join("\n");
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

function deriveRailStatus(state: ProjectPlanningWorkspaceState): ProjectPlanningWorkspaceModel["railStatus"] {
  if (state === "not-ready") return "Not Ready";
  if (state === "ready-for-handoff") return "Ready";
  if (state === "waiting-for-output") return "Waiting for Output";
  if (state === "completed") return "Completed";
  if (state === "needs-attention") return "Needs Attention";
  return "Awaiting Approval";
}

function requiredActionForState(
  state: ProjectPlanningWorkspaceState,
  hasCurrentPreparedSubmission: boolean,
): string {
  switch (state) {
    case "ready-for-handoff":
      return "Prepare Project Planning handoff, copy the MCP instruction, and send it manually in embedded ChatGPT.";
    case "waiting-for-output":
      return "Paste and send the copied Project Planning instruction in embedded ChatGPT, then wait for MCP-written outputs.";
    case "partial-output":
      return "Wait for both exact Project Profile and Project Roadmap outputs before review.";
    case "ready-for-review":
      return "Review both current outputs, then apply one shared bundle disposition.";
    case "revision-requested":
      return hasCurrentPreparedSubmission
        ? "Revision Request Ready. Copy Handoff and send it manually in embedded ChatGPT."
        : "Prepare Revision Request to create a fresh handoff with the current Operator instructions.";
    case "rejected":
      return "Resolve the rejected Project Planning bundle before continuing.";
    case "completed":
      return "Project Planning is complete; Phase Map is ready.";
    default:
      return "Resolve Project Planning evidence before continuing.";
  }
}

function reasonForState(state: ProjectPlanningWorkspaceState): string {
  if (state === "ready-for-handoff") return "Approved Project Intake, Prompt, and Architect Interview are available.";
  if (state === "waiting-for-output") return "Current Approved handoff exists; exact Project Profile and Roadmap outputs are not present.";
  if (state === "partial-output") return "One Project Planning output is missing.";
  if (state === "completed") return "Both Project Planning outputs are current, synchronized, readable, and Approved.";
  return "Repository evidence controls Project Planning state.";
}

function canApplyBundleDisposition(context: ReturnType<typeof requireReadyProjectPlanningContext>): boolean {
  return Boolean(context.profile && context.roadmap && deriveBundleSynchronizationState(context) === "synchronized");
}

function canPrepareDraftBundleForContext(context: ReturnType<typeof requireReadyProjectPlanningContext>): boolean {
  if (context.invalidHandoffReason || context.invalidProfileReason || context.invalidRoadmapReason) return false;
  if (!context.handoff) return false;
  if (!context.profile && !context.roadmap) return true;
  if (!context.profile || !context.roadmap) return false;
  return (
    deriveBundleSynchronizationState(context) === "synchronized" &&
    context.profile.disposition === "RevisionRequested" &&
    context.roadmap.disposition === "RevisionRequested"
  );
}

function canPrepareHandoffForContext(context: ReturnType<typeof requireReadyProjectPlanningContext>): boolean {
  if (context.invalidHandoffReason || context.invalidProfileReason || context.invalidRoadmapReason) return false;
  if (!context.profile && !context.roadmap) return true;
  if (!context.handoff) return false;
  if (!context.profile || !context.roadmap) return false;
  return (
    deriveBundleSynchronizationState(context) === "synchronized" &&
    context.profile.disposition === "RevisionRequested" &&
    context.roadmap.disposition === "RevisionRequested"
  );
}

function deriveBundleSynchronizationState(context: ReturnType<typeof requireReadyProjectPlanningContext>): ProjectPlanningWorkspaceModel["bundleSynchronizationState"] {
  if (context.invalidProfileReason || context.invalidRoadmapReason || context.invalidHandoffReason) return "invalid";
  if (!context.profile && !context.roadmap) return "missing";
  if (!context.profile || !context.roadmap) return "partial";
  if (context.profile.disposition !== context.roadmap.disposition) return "mixed-disposition";
  return "synchronized";
}

function sharedOperatorReviewNotes(
  profile: ProjectPlanningArtifactIdentity | undefined,
  roadmap: ProjectPlanningArtifactIdentity | undefined,
): string | undefined {
  if (!profile || !roadmap) return profile?.operatorReviewNotes ?? roadmap?.operatorReviewNotes;
  return profile.operatorReviewNotes === roadmap.operatorReviewNotes
    ? profile.operatorReviewNotes
    : "Mixed review notes require attention.";
}

function identityForContract(identity: ProjectPlanningArtifactIdentity): ProjectPlanningDocumentIdentity {
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

function readExistingCanonical(workspaceRoot: string, relativePath: string) {
  const absolutePath = path.join(workspaceRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return null;
  }
  return parseCanonicalMarkdownDocument(fs.readFileSync(absolutePath, "utf8"));
}
