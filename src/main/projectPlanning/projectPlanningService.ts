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
  projectPlanningRequiredProfileSections,
  projectPlanningRequiredRoadmapSections,
} from "./projectPlanningPreflight";

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
): ProjectPlanningWorkspaceModel {
  const context = resolveProjectPlanningContext(workspaceRoot);
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
    };
  }

  const invalidReason = context.invalidHandoffReason ?? context.invalidProfileReason ?? context.invalidRoadmapReason;
  const profile = context.profile ?? context.invalidProfile;
  const roadmap = context.roadmap ?? context.invalidRoadmap;
  const state = invalidReason ? "needs-attention" : deriveWorkspaceState(context);
  const notes = sharedOperatorReviewNotes(profile, roadmap);
  return {
    state,
    railStatus: deriveRailStatus(state),
    requiredAction: requiredActionForState(state),
    reason: invalidReason ?? reasonForState(state),
    evidencePaths: context.evidencePaths,
    handoffState: context.handoff ? "handoff-ready" : "handoff-unavailable",
    handoffMarkdownPath: context.handoffMarkdownPath,
    handoffInstruction: buildProjectPlanningHandoffInstruction(context),
    handoffArtifactRevision: context.handoff?.artifactRevision,
    canPrepareHandoff: state === "ready-for-handoff" && !invalidReason,
    canCopyHandoff: Boolean(context.handoff) && !Boolean(context.invalidHandoffReason),
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
  return {
    ...getProjectPlanningWorkspaceModel(workspaceRoot),
    handoffPreparationMessage: result.alreadyPrepared
      ? "Project Planning handoff is already prepared."
      : "Project Planning handoff prepared.",
  };
}

export function getProjectPlanningHandoffInstruction(workspaceRoot: string): string {
  const model = getProjectPlanningWorkspaceModel(workspaceRoot);
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

export function getProjectPlanningCompletion(workspaceRoot: string): ProjectPlanningCompletion {
  const context = resolveProjectPlanningContext(workspaceRoot);
  if (context.status !== "ready" || !context.profile || !context.roadmap) {
    return { complete: false, reason: "Project Profile and Project Roadmap are both required." };
  }
  const profileFreshness = evaluateDocumentFreshness(workspaceRoot, context.profile.logicalDocumentId);
  const roadmapFreshness = evaluateDocumentFreshness(workspaceRoot, context.roadmap.logicalDocumentId);
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
    workflowData: {
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
    "Required Project Roadmap sections:",
    ...projectPlanningRequiredRoadmapSections().map((heading) => `- ${heading}`),
    "",
    "Browser chat is not durable authority. The Architect must call artifact_toolbox.submit_handoff_outputs.",
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

function requiredActionForState(state: ProjectPlanningWorkspaceState): string {
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
      return "Copy the Project Planning instruction with revision notes and send it in embedded ChatGPT.";
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

function buildProjectPlanningHandoffInstruction(context: ReturnType<typeof requireReadyProjectPlanningContext>): string {
  const revisionNotes = sharedOperatorReviewNotes(context.profile, context.roadmap);
  const includeRevisionNotes = (context.profile?.disposition === "RevisionRequested" || context.roadmap?.disposition === "RevisionRequested") && revisionNotes;
  return [
    "Use ChampCity MCP with repository reference <PROJECT_REPO>.",
    "This handoff is for the embedded Project Planning Architect chat.",
    "Resolve the configured workspace ID through diagnostics_toolbox.list_workspaces when it is not already known.",
    "",
    "Read these exact current inputs:",
    `- Project Intake Markdown: ${context.projectIntake.markdownPath}`,
    `- Architect Interview Prompt Markdown: ${context.prompt.markdownPath}`,
    `- Approved Architect Interview Markdown: ${context.interview.markdownPath}`,
    `- Approved Project Planning handoff Markdown: ${context.handoffMarkdownPath}`,
    "",
    "The Approved Project Planning handoff is the authority for this contract:",
    `- contractId: ${projectPlanningSubmissionContractId}`,
    `- reconciliationMode: ${context.reconciliationMode}`,
    `- repositoryReviewRequired: ${context.repositoryReviewRequired ? "true" : "false"}`,
    `- repositoryReviewContext: ${context.repositoryReviewContext}`,
    `- legacyPlanningPaths: ${JSON.stringify(context.legacyPlanningPaths)}`,
    `- sourceEvidencePaths: ${JSON.stringify(context.sourceEvidencePaths)}`,
    "",
    "Inspect required repository evidence through ChampCity MCP before drafting outputs.",
    "Distinguish verified implementation from declared intent.",
    "Reconcile materially relevant legacy planning as evidence, not authority.",
    "",
    "Produce both complete Markdown document bodies for these exact repository-relative targets:",
    `- Project Profile target: ${context.profileMarkdownPath}`,
    `- Project Roadmap target: ${context.roadmapMarkdownPath}`,
    "",
    "The Project Profile Markdown body must contain these exact headings:",
    "# Project Profile",
    ...projectPlanningRequiredProfileSections().map((heading) => `## ${heading}`),
    "",
    "For an existing repository, the Project Profile must cover verified purpose and actual implementation state; technologies, major components, and entry points; implemented, incomplete, defective, or abandoned capabilities; existing planning evidence; adopted, superseded, contradicted, or unresolved prior decisions; risks, ambiguity, and known limitations; and repository-relative evidence references where practical.",
    "For a greenfield repository, the Project Profile must explicitly state that no prior implementation baseline exists.",
    "",
    "The Project Roadmap Markdown body must contain these exact headings:",
    "# Project Roadmap",
    ...projectPlanningRequiredRoadmapSections().map((heading) => `## ${heading}`),
    "",
    "The Roadmap must begin from the Profile baseline and distinguish, as applicable: Already implemented, Partially implemented, Planned but not implemented, Superseded, Deferred, and New work.",
    "The Roadmap must cover the complete currently intended development lifecycle, not only the MVP boundary.",
    "MVP phases must remain clearly identified.",
    "Post-MVP phases or roadmap stages must be separately sequenced at the level supported by current evidence.",
    "Every known major workstream from the approved Interview/Profile must be sequenced, explicitly deferred, superseded, or declared conditional.",
    "Unknown future work must not be fabricated.",
    "The Roadmap remains a project-level development roadmap, not a single-release checklist.",
    "",
    "Current source revisions:",
    ...context.sourceRevisions.map((source) => `- path: ${source.path} revision: ${source.revision}`),
    ...(context.handoff ? [`- path: ${context.handoff.markdownPath} revision: ${context.handoff.artifactRevision}`] : []),
    "",
    "When both complete bodies are ready, call ChampCity MCP with this invocation shape:",
    "```json",
    "{",
    '  "action": "submit_handoff_outputs",',
    '  "workspaceId": "<resolved workspace ID>",',
    '  "params": {',
    '    "handoffKind": "project-planning",',
    '    "outputs": {',
    '      "projectProfileMarkdown": "<complete Project Profile Markdown body>",',
    '      "projectRoadmapMarkdown": "<complete Project Roadmap Markdown body>"',
    "    }",
    "  }",
    "}",
    "```",
    "The handoff kind is a selector, not authority.",
    "The MCP server derives targets, metadata, identity, source revisions, participation roles, revisions, and Pending disposition from the current Approved handoff.",
    "Do not pass targets, metadata, identity, source revisions, reconciliation fields, or other authority fields as params.",
    "Do not write placeholders. Do not use retired save actions, a generic Markdown writer, a manual document-body import fallback, a local import field, or a manual file-copy fallback.",
    "Remain incomplete until artifact_toolbox.submit_handoff_outputs returns saved or already_saved.",
    "If the action is unavailable, denied, or fails, report the exact tool failure and remain incomplete.",
    ...(includeRevisionNotes ? ["", "Current Operator revision instructions:", revisionNotes] : []),
  ].join("\n");
}

function readExistingCanonical(workspaceRoot: string, relativePath: string) {
  const absolutePath = path.join(workspaceRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return null;
  }
  return parseCanonicalMarkdownDocument(fs.readFileSync(absolutePath, "utf8"));
}
