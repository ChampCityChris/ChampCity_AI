import fs from "node:fs";
import path from "node:path";
import type {
  ArchitectDraftSubmission,
  ArchitectOutputDefinition,
} from "../../shared/architectOutputs/architectOutputContracts";
import type { CanonicalDocumentMetadata } from "../../shared/documents/canonicalMarkdown";
import {
  metadataWithSubstantiveRevision,
  parseCanonicalMarkdownDocument,
} from "../../shared/documents/canonicalMarkdown";
import type { DocumentDispositionStatus } from "../../shared/documents/documentDisposition";
import type { PlanningDocumentSummary, SourceRevision } from "../../shared/documents/planningDocument";
import {
  getActiveArchitectOutputRuntimeSubmission,
  getArchitectOutputRuntimeStatus,
  prepareArchitectOutputRuntimeSubmission,
  type ActiveArchitectOutputRuntimeSubmission,
} from "../architectOutputs/architectOutputRuntimeService";
import { buildDeterministicArchitectDraftSubmissionId } from "../architectOutputs/architectDraftPaths";
import {
  evaluateDocumentFreshness,
  listPlanningDocuments,
} from "../documents/planningDocumentService";
import { getPhaseMapProjection, type PhaseMapPhase } from "../phaseMap/phaseMapService";
import {
  buildCreateMarkdownArtifactJsonBlock,
  buildMcpWorkspaceBindingPromptBlock,
} from "../integrations/mcpWorkspacePromptContract";
import {
  inheritRepositoryAuthorityFromSourceRevisions,
  mergeRepositoryAuthorityIntoWorkflowData,
} from "../documents/repositoryAuthority";

export const phaseInterviewSubmissionContractId = "phase-interview-single-output-v1";
export const phaseInterviewOutputKind = "phase-interview";
export const phaseInterviewOwningWorkspaceId = "phase-interview";
export const phaseInterviewSlotId = "phase-interview";

export type PhaseInterviewSelectedDocumentRole = "phase-interview";

export interface PhaseInterviewReadyContext {
  selectedPhase: PhaseMapPhase;
  profile: PlanningDocumentSummary;
  roadmap: PlanningDocumentSummary;
  phaseMap: PlanningDocumentSummary;
  dependencyCloseouts: PlanningDocumentSummary[];
  handoff?: PlanningDocumentSummary;
  handoffMarkdownPath: string;
  interviewMarkdownPath: string;
  sourceRevisions: SourceRevision[];
  evidencePaths: string[];
  interview?: PhaseInterviewArtifactIdentity;
  invalidInterview?: PhaseInterviewArtifactIdentity;
  invalidInterviewReason?: string;
}

export interface PhaseInterviewUnavailableContext {
  status: "not-ready" | "needs-attention";
  reason: string;
  evidencePaths: string[];
}

export type PhaseInterviewDraftContext =
  | ({ status: "ready" } & PhaseInterviewReadyContext)
  | PhaseInterviewUnavailableContext;

export interface PhaseInterviewArtifactIdentity {
  logicalDocumentId: string;
  markdownPath: string;
  artifactRevision: number;
  disposition: DocumentDispositionStatus;
  documentReadState: string;
  freshnessState?: "fresh" | "stale";
  participationRole?: string;
  artifactType?: string;
  readError?: string;
  operatorReviewNotes?: string;
}

interface PhaseInterviewSelection {
  selectedRole: PhaseInterviewSelectedDocumentRole;
  markdownPath: string;
}

type ActivePhaseInterviewSubmission = ActiveArchitectOutputRuntimeSubmission<
  typeof phaseInterviewSlotId,
  PhaseInterviewSelection
>;
interface ActivePhaseInterviewChatHandoff {
  workspaceRoot: string;
  sourceHandoff: ArchitectDraftSubmission["sourceHandoff"];
  sourceRevisions: SourceRevision[];
  selectedPhase: {
    phaseId: string;
    title: string;
  };
  preparedInstruction: string;
}

const activePhaseInterviewChatHandoffByWorkspace = new Map<string, ActivePhaseInterviewChatHandoff>();

const requiredPhaseInterviewSections = [
  "Phase Understanding",
  "Phase Objective",
  "Scope",
  "Non-Scope",
  "Inherited Constraints",
  "Dependencies and Prior-Phase Evidence",
  "Material Decisions",
  "Clarification Required",
  "Material Questions and Answers",
  "Architect Recommendations",
  "Risks and Unknowns",
  "Assumptions",
  "Acceptance Direction",
  "Inputs Required for Phase Planning",
  "Deferred Items",
  "Unresolved Questions",
] as const;

export const phaseInterviewArchitectOutputDefinition: ArchitectOutputDefinition<
  typeof phaseInterviewSlotId,
  PhaseInterviewSelection,
  PhaseInterviewReadyContext
> = {
  outputKind: phaseInterviewOutputKind,
  owningWorkspaceId: phaseInterviewOwningWorkspaceId,
  bundleMode: "single-output",
  slots: [{
    slotId: phaseInterviewSlotId,
    displayLabel: "Phase Interview",
    draftPathComponent: "phase-interview.md",
    validateBody(bodyMarkdown) {
      validatePhaseInterviewBody(bodyMarkdown);
    },
    buildCanonicalDocument({ workspaceRoot, domainContext: context, bodyMarkdown }) {
      const existing = context.interview
        ? readExistingCanonical(workspaceRoot, context.interviewMarkdownPath)
        : null;
      const metadata: CanonicalDocumentMetadata = existing
        ? {
            ...metadataWithSubstantiveRevision(existing.metadata, context.sourceRevisions),
            workflowData: mergeRepositoryAuthorityIntoWorkflowData(
              existing.metadata.workflowData,
              inheritRepositoryAuthorityFromSourceRevisions(workspaceRoot, context.sourceRevisions),
            ),
          }
        : {
            schemaVersion: 1,
            artifactType: phaseInterviewOutputKind,
            artifactRevision: 1,
            participationRole: "gatingReview",
            identity: { phaseId: context.selectedPhase.phaseId },
            sourceRevisions: context.sourceRevisions,
            workflowData: mergeRepositoryAuthorityIntoWorkflowData(
              {},
              inheritRepositoryAuthorityFromSourceRevisions(workspaceRoot, context.sourceRevisions),
            ),
            documentDisposition: { status: "Pending", notes: "", reviewedAt: null },
          };
      return { relativePath: context.interviewMarkdownPath, metadata, bodyMarkdown };
    },
  }],
  buildSubmissionId(context) {
    return buildDeterministicArchitectDraftSubmissionId({
      outputKind: phaseInterviewOutputKind,
      owningWorkspaceId: phaseInterviewOwningWorkspaceId,
      ...context,
    });
  },
  buildPromotionGroupId(context) {
    return buildDeterministicArchitectDraftSubmissionId({
      outputKind: phaseInterviewOutputKind,
      owningWorkspaceId: phaseInterviewOwningWorkspaceId,
      ...context,
    });
  },
  resolvePreparation(workspaceRoot) {
    const context = requireReadyContext(workspaceRoot);
    assertCanPromotePhaseInterview(context);
    return {
      sourceHandoff: {
        path: context.handoff.markdownPath,
        revision: context.handoff.metadata.artifactRevision ?? 1,
      },
      domainContext: context,
    };
  },
  resolvePromotionContext({ workspaceRoot, submission, preparedContext }) {
    return requireCurrentPromotionContext(
      workspaceRoot,
      submission,
      preparedContext as PhaseInterviewReadyContext,
    );
  },
  buildPreparedInstruction({ workspaceRoot, submission, sourceHandoff, domainContext: context }) {
    return buildPhaseInterviewPreparedInstruction(workspaceRoot, context, submission, sourceHandoff);
  },
  buildPostPromotionSelection({ promotedDocuments }) {
    return {
      selectedRole: phaseInterviewSlotId,
      markdownPath: promotedDocuments[0].relativePath,
    };
  },
};

export function preparePhaseInterviewDraftSubmission(
  workspaceRoot: string,
): ArchitectDraftSubmission<typeof phaseInterviewSlotId, PhaseInterviewSelection> {
  return prepareArchitectOutputRuntimeSubmission(
    workspaceRoot,
    phaseInterviewOutputKind,
    phaseInterviewOwningWorkspaceId,
  );
}

export function preparePhaseInterviewChatHandoff(workspaceRoot: string): string {
  const resolvedWorkspaceRoot = path.resolve(workspaceRoot);
  const context = requireReadyContext(resolvedWorkspaceRoot);
  assertCanPromotePhaseInterview(context);
  const sourceHandoff = {
    path: context.handoff.markdownPath,
    revision: context.handoff.metadata.artifactRevision ?? 1,
  };
  const preparedInstruction = buildPhaseInterviewChatInstruction(
    resolvedWorkspaceRoot,
    context,
    sourceHandoff,
  );
  activePhaseInterviewChatHandoffByWorkspace.set(resolvedWorkspaceRoot, {
    workspaceRoot: resolvedWorkspaceRoot,
    sourceHandoff,
    sourceRevisions: [...context.sourceRevisions],
    selectedPhase: {
      phaseId: context.selectedPhase.phaseId,
      title: context.selectedPhase.title,
    },
    preparedInstruction,
  });
  return preparedInstruction;
}

export function getPreparedPhaseInterviewChatHandoff(workspaceRoot: string): string | undefined {
  const resolvedWorkspaceRoot = path.resolve(workspaceRoot);
  const active = activePhaseInterviewChatHandoffByWorkspace.get(resolvedWorkspaceRoot);
  if (!active) return undefined;
  try {
    const context = requireReadyContext(resolvedWorkspaceRoot);
    assertCanPromotePhaseInterview(context);
    if (
      active.sourceHandoff.path !== context.handoff.markdownPath ||
      active.sourceHandoff.revision !== (context.handoff.metadata.artifactRevision ?? 1) ||
      active.selectedPhase.phaseId !== context.selectedPhase.phaseId ||
      active.selectedPhase.title !== context.selectedPhase.title ||
      JSON.stringify(active.sourceRevisions) !== JSON.stringify(context.sourceRevisions)
    ) {
      activePhaseInterviewChatHandoffByWorkspace.delete(resolvedWorkspaceRoot);
      return undefined;
    }
    return active.preparedInstruction;
  } catch {
    activePhaseInterviewChatHandoffByWorkspace.delete(resolvedWorkspaceRoot);
    return undefined;
  }
}

export function getPhaseInterviewDraftStatus(
  workspaceRoot: string,
): ActivePhaseInterviewSubmission | undefined {
  return getArchitectOutputRuntimeStatus(
    workspaceRoot,
    phaseInterviewOutputKind,
    phaseInterviewOwningWorkspaceId,
  );
}

export function getActivePhaseInterviewDraftSubmission(
  workspaceRoot: string,
): ActivePhaseInterviewSubmission | undefined {
  return getActiveArchitectOutputRuntimeSubmission(workspaceRoot, phaseInterviewOwningWorkspaceId);
}

export function resolvePhaseInterviewDraftContext(workspaceRoot: string): PhaseInterviewDraftContext {
  let selectedPhase: PhaseMapPhase;
  try {
    const projection = getPhaseMapProjection(workspaceRoot);
    if (projection.state !== "first-incomplete") {
      return {
        status: "not-ready",
        reason: `Resolver-selected phase is unavailable: ${projection.state}.`,
        evidencePaths: ["planning/project/Phase_Map"],
      };
    }
    selectedPhase = projection.phase;
  } catch (error) {
    return {
      status: "not-ready",
      reason: errorMessage(error),
      evidencePaths: ["planning/project/Phase_Map"],
    };
  }

  const baseEvidence = ["planning/project/PROJECT_PROFILE.md", "planning/project/Project_Roadmap", "planning/project/Phase_Map"];
  const profile = requiredApprovedDocument(workspaceRoot, "planning/project/PROJECT_PROFILE", ".md");
  const roadmap = requiredApprovedDocument(workspaceRoot, "planning/project/Project_Roadmap/PROJECT_ROADMAP", ".md");
  const phaseMap = requiredApprovedDocument(workspaceRoot, "planning/project/Phase_Map/PHASE_MAP", ".md");
  if (!profile.ok) {
    return {
      status: "not-ready",
      reason: profile.reason,
      evidencePaths: baseEvidence,
    };
  }
  if (!roadmap.ok) {
    return {
      status: "not-ready",
      reason: roadmap.reason,
      evidencePaths: baseEvidence,
    };
  }
  if (!phaseMap.ok) {
    return {
      status: "not-ready",
      reason: phaseMap.reason,
      evidencePaths: baseEvidence,
    };
  }

  const dependencyCloseouts = priorCloseoutSources(workspaceRoot, selectedPhase);
  const handoffMarkdownPath = phaseInterviewHandoffPath(selectedPhase.phaseId);
  const interviewMarkdownPath = phaseInterviewOutputPath(selectedPhase.phaseId);
  const handoff = approvedPhaseInterviewHandoff(workspaceRoot, selectedPhase.phaseId);
  const evidencePaths = [
    profile.document.markdownPath,
    roadmap.document.markdownPath,
    phaseMap.document.markdownPath,
    ...dependencyCloseouts.map((document) => document.markdownPath),
  ];

  if (handoff) {
    const handoffProblem = validateHandoffForContext(workspaceRoot, handoff, selectedPhase.phaseId, interviewMarkdownPath);
    if (handoffProblem) {
      return {
        status: "needs-attention",
        reason: handoffProblem,
        evidencePaths: [...evidencePaths, handoff.markdownPath],
      };
    }
  }

  const sourceRevisions = handoff
    ? [
        ...(handoff.metadata.sourceRevisions ?? []),
        { path: handoff.markdownPath, revision: handoff.metadata.artifactRevision ?? 1 },
      ]
    : [
        { path: profile.document.markdownPath, revision: profile.document.metadata.artifactRevision ?? 1 },
        { path: roadmap.document.markdownPath, revision: roadmap.document.metadata.artifactRevision ?? 1 },
        { path: phaseMap.document.markdownPath, revision: phaseMap.document.metadata.artifactRevision ?? 1 },
        ...dependencyCloseouts.map((document) => ({
          path: document.markdownPath,
          revision: document.metadata.artifactRevision ?? 1,
        })),
      ];

  const documents = listPlanningDocuments(workspaceRoot);
  const candidate = documents.find((document) => document.markdownPath === interviewMarkdownPath);
  const invalidInterviewReason = candidate
    ? validateExistingPhaseInterview(workspaceRoot, candidate, selectedPhase.phaseId)
    : undefined;
  const identity = candidate ? identityForDocument(candidate, workspaceRoot) : undefined;

  return {
    status: "ready",
    selectedPhase,
    profile: profile.document,
    roadmap: roadmap.document,
    phaseMap: phaseMap.document,
    dependencyCloseouts,
    handoff,
    handoffMarkdownPath,
    interviewMarkdownPath,
    sourceRevisions,
    evidencePaths: handoff ? [...evidencePaths, handoff.markdownPath] : evidencePaths,
    interview: candidate && !invalidInterviewReason ? identity : undefined,
    invalidInterview: candidate && invalidInterviewReason ? identity : undefined,
    invalidInterviewReason,
  };
}

export function canPreparePhaseInterviewDraft(context: PhaseInterviewReadyContext): boolean {
  if (!context.handoff || context.invalidInterviewReason) return false;
  if (!context.interview) return true;
  return context.interview.disposition === "RevisionRequested";
}

export function validatePhaseInterviewBody(bodyMarkdown: string): void {
  for (const section of requiredPhaseInterviewSections) {
    if (!hasMarkdownHeading(bodyMarkdown, section)) {
      throw new Error(`Phase Interview draft requires ${section}.`);
    }
  }
}

export function phaseInterviewRequiredSections(): readonly string[] {
  return requiredPhaseInterviewSections;
}

export function phaseInterviewHandoffPath(phaseId: string): string {
  return `planning/phases/${phaseId}/Architect_Handoffs/PHASE_INTERVIEW_ARCHITECT_HANDOFF_${phaseId}.md`;
}

export function phaseInterviewOutputPath(phaseId: string): string {
  return `planning/phases/${phaseId}/Phase_Interview.md`;
}

export function draftPathForPhaseInterview(
  submission: ArchitectDraftSubmission<typeof phaseInterviewSlotId>,
): string {
  const slot = submission.expectedDraftSlots.find((candidate) => candidate.slotId === phaseInterviewSlotId);
  if (!slot) {
    throw new Error("Phase Interview draft submission is missing its output slot.");
  }
  return slot.draftRelativePath;
}

function requireReadyContext(workspaceRoot: string): PhaseInterviewReadyContext & { handoff: PlanningDocumentSummary } {
  const context = resolvePhaseInterviewDraftContext(workspaceRoot);
  if (context.status !== "ready") throw new Error(context.reason);
  if (!context.handoff) throw new Error("Current Approved Phase Interview handoff is required.");
  return context as PhaseInterviewReadyContext & { handoff: PlanningDocumentSummary };
}

function requireCurrentPromotionContext(
  workspaceRoot: string,
  submission: ArchitectDraftSubmission,
  original: PhaseInterviewReadyContext,
): PhaseInterviewReadyContext {
  if (!original) throw new Error("Phase Interview draft submission context is unavailable.");
  const current = requireReadyContext(workspaceRoot);
  if (
    current.handoff.markdownPath !== submission.sourceHandoff.path ||
    (current.handoff.metadata.artifactRevision ?? 1) !== submission.sourceHandoff.revision
  ) {
    throw new Error("Phase Interview draft submission no longer matches the current handoff revision.");
  }
  if (
    current.selectedPhase.phaseId !== original.selectedPhase.phaseId ||
    current.interviewMarkdownPath !== original.interviewMarkdownPath ||
    JSON.stringify(current.sourceRevisions) !== JSON.stringify(original.sourceRevisions)
  ) {
    throw new Error("Phase Interview draft submission no longer matches the current phase evidence.");
  }
  assertCanPromotePhaseInterview(current);
  return current;
}

function assertCanPromotePhaseInterview(context: PhaseInterviewReadyContext): void {
  if (context.invalidInterviewReason) {
    throw new Error(context.invalidInterviewReason);
  }
  if (!context.interview) {
    return;
  }
  if (context.interview.disposition !== "RevisionRequested") {
    throw new Error("Phase Interview draft submission can only replace an existing RevisionRequested Phase Interview.");
  }
}

function approvedPhaseInterviewHandoff(
  workspaceRoot: string,
  phaseId: string,
): PlanningDocumentSummary | undefined {
  return listPlanningDocuments(workspaceRoot)
    .filter((document) => document.metadata.artifactType === "generated-handoff")
    .filter((document) => document.metadata.canonical?.workflowData.handoffKind === "phase-interview")
    .filter((document) => document.metadata.canonical?.identity.phaseId === phaseId)
    .filter((document) => document.effectiveDisposition === "Approved")
    .at(-1);
}

function validateHandoffForContext(
  workspaceRoot: string,
  handoff: PlanningDocumentSummary,
  phaseId: string,
  interviewMarkdownPath: string,
): string | undefined {
  if (evaluateDocumentFreshness(workspaceRoot, handoff.logicalDocumentId).state === "stale") {
    return "Current Phase Interview handoff is stale.";
  }
  const workflowData = handoff.metadata.canonical?.workflowData ?? {};
  if (workflowData.contractId !== phaseInterviewSubmissionContractId) {
    return "Phase Interview handoff contract is not current.";
  }
  if (workflowData.outputTarget !== interviewMarkdownPath) {
    return "Phase Interview handoff output target does not match the selected phase.";
  }
  if (handoff.metadata.canonical?.identity.phaseId !== phaseId) {
    return "Phase Interview handoff identity does not match the selected phase.";
  }
  return undefined;
}

function validateExistingPhaseInterview(
  workspaceRoot: string,
  interview: PlanningDocumentSummary,
  phaseId: string,
): string | undefined {
  const canonical = interview.metadata.canonical;
  if (interview.documentReadState !== "readable" || !canonical) {
    return interview.readError ?? "Existing Phase Interview target is not readable canonical Markdown.";
  }
  if (canonical.artifactType !== phaseInterviewOutputKind) {
    return "Existing Phase Interview target has the wrong artifact type.";
  }
  if (canonical.participationRole !== "gatingReview") {
    return "Existing Phase Interview target has the wrong participation role.";
  }
  if (canonical.identity.phaseId !== phaseId) {
    return "Existing Phase Interview target identity does not match the selected phase.";
  }
  const freshness = evaluateDocumentFreshness(workspaceRoot, interview.logicalDocumentId);
  if (freshness.state === "stale") {
    return "Existing Phase Interview target is stale.";
  }
  return undefined;
}

function priorCloseoutSources(workspaceRoot: string, phase: PhaseMapPhase): PlanningDocumentSummary[] {
  const dependencyIds = new Set(phase.dependsOn);
  return listPlanningDocuments(workspaceRoot)
    .filter((document) => document.displayFilename.toLowerCase().includes("phase_closeout"))
    .filter((document) => document.metadata.phaseId && dependencyIds.has(document.metadata.phaseId))
    .filter((document) => document.effectiveDisposition === "Approved")
    .filter((document) => document.documentReadState === "readable");
}

function requiredApprovedDocument(workspaceRoot: string, prefix: string, extension: ".md"):
  | { ok: true; document: PlanningDocumentSummary }
  | { ok: false; reason: string } {
  const document = listPlanningDocuments(workspaceRoot)
    .filter((candidate) => candidate.markdownPath.startsWith(prefix))
    .filter((candidate) => candidate.markdownPath.endsWith(extension))
    .at(-1);
  if (!document) {
    return { ok: false, reason: `Current Approved input is required: ${prefix}` };
  }
  if (document.effectiveDisposition !== "Approved") {
    return { ok: false, reason: `Current Approved input is required: ${prefix}` };
  }
  if (evaluateDocumentFreshness(workspaceRoot, document.logicalDocumentId).state === "stale") {
    return { ok: false, reason: `Current input is stale: ${prefix}` };
  }
  return { ok: true, document };
}

function identityForDocument(
  document: PlanningDocumentSummary,
  workspaceRoot: string,
): PhaseInterviewArtifactIdentity {
  const freshness = document.documentReadState === "readable"
    ? evaluateDocumentFreshness(workspaceRoot, document.logicalDocumentId).state
    : undefined;
  return {
    logicalDocumentId: document.logicalDocumentId,
    markdownPath: document.markdownPath,
    artifactRevision: document.metadata.artifactRevision ?? 1,
    disposition: document.effectiveDisposition,
    documentReadState: document.documentReadState ?? "unknown",
    participationRole: document.metadata.participationRole,
    artifactType: document.metadata.artifactType,
    ...(freshness === "fresh" || freshness === "stale" ? { freshnessState: freshness } : {}),
    ...(document.readError ? { readError: document.readError } : {}),
    ...(document.metadata.canonical?.documentDisposition.notes
      ? { operatorReviewNotes: document.metadata.canonical.documentDisposition.notes }
      : {}),
  };
}

function hasMarkdownHeading(bodyMarkdown: string, heading: string): boolean {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^#{1,6}\\s+${escaped}\\s*$`, "im").test(bodyMarkdown.replace(/\r\n?/g, "\n"));
}

function readExistingCanonical(workspaceRoot: string, relativePath: string) {
  const absolutePath = path.join(workspaceRoot, relativePath);
  return fs.existsSync(absolutePath)
    ? parseCanonicalMarkdownDocument(fs.readFileSync(absolutePath, "utf8"))
    : null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function buildPhaseInterviewPreparedInstruction(
  workspaceRoot: string,
  context: PhaseInterviewReadyContext,
  submission: ArchitectDraftSubmission<typeof phaseInterviewSlotId>,
  sourceHandoff: ArchitectDraftSubmission["sourceHandoff"],
): string {
  const draftPath = draftPathForPhaseInterview(submission);
  const revisionNotes = context.interview?.disposition === "RevisionRequested"
    ? context.interview.operatorReviewNotes
    : undefined;
  const promptWorkflowData = context.handoff?.metadata?.canonical?.workflowData ?? {};
  return [
    ...buildMcpWorkspaceBindingPromptBlock(workspaceRoot, promptWorkflowData, {
      includeDiagnosticsToolboxHint: false,
    }),
    "",
    "This is the Finalize Phase Interview Draft handoff. Use it only after the Operator has confirmed or corrected the Phase Interview completion summary.",
    "",
    "Read these exact current inputs:",
    `- Approved Phase Interview handoff: ${sourceHandoff.path} revision ${sourceHandoff.revision}`,
    `- Approved Project Profile: ${context.profile.markdownPath}`,
    `- Approved Project Roadmap: ${context.roadmap.markdownPath}`,
    `- Approved Phase Map: ${context.phaseMap.markdownPath}`,
    `- Selected phase entry: ${context.selectedPhase.phaseId} / ${context.selectedPhase.title}`,
    ...(context.dependencyCloseouts.length > 0
      ? context.dependencyCloseouts.map((document) => `- Approved dependency closeout: ${document.markdownPath}`)
      : ["- Approved dependency closeouts: none"]),
    "",
    "Write only the complete body-only Phase Interview Markdown that reflects the confirmed phase-understanding summary.",
    "Record whether Operator clarification was required.",
    "If clarification questions were asked, preserve the material questions and answers.",
    "Do not pre-author Work Cards and do not replace Phase Planning.",
    "",
    "Produce one complete Phase Interview Markdown body for this exact final target:",
    `- Phase Interview target: ${context.interviewMarkdownPath}`,
    `- Temporary draft Markdown: ${draftPath}`,
    `- Temporary body-only draft path: ${draftPath}`,
    "The workflow remains incomplete until this temporary draft is created and ChampCity A/I promotes it.",
    "",
    "The Phase Interview Markdown body must contain these exact headings:",
    "# Phase Interview",
    ...phaseInterviewRequiredSections().map((heading) => `## ${heading}`),
    "",
    "Current source revisions:",
    ...context.sourceRevisions.map((source) => `- path: ${source.path} revision: ${source.revision}`),
    "",
    "When the complete Phase Interview body is ready, call artifact_toolbox.create_markdown_artifact with this invocation shape:",
    "```json",
    ...buildCreateMarkdownArtifactJsonBlock(
      workspaceRoot,
      draftPath,
      "<complete body-only Phase Interview Markdown>",
      promptWorkflowData,
    ),
    "```",
    "Do not supply canonical metadata, metadata delimiters, final canonical output paths, source revisions, route selectors, fallback fields, hidden authorization values, or any other authority fields as params.",
    "After the draft is created, respond with a concise draft-created confirmation.",
    "Read and address current Operator revision notes when the existing Phase Interview is RevisionRequested.",
    ...(revisionNotes ? ["", "Current Operator revision instructions:", revisionNotes] : []),
  ].join("\n");
}

function buildPhaseInterviewChatInstruction(
  workspaceRoot: string,
  context: PhaseInterviewReadyContext & { handoff: PlanningDocumentSummary },
  sourceHandoff: ArchitectDraftSubmission["sourceHandoff"],
): string {
  const revisionNotes = context.interview?.disposition === "RevisionRequested"
    ? context.interview.operatorReviewNotes
    : undefined;
  const promptWorkflowData = context.handoff?.metadata?.canonical?.workflowData ?? {};
  return [
    ...buildMcpWorkspaceBindingPromptBlock(workspaceRoot, promptWorkflowData, {
      includeDiagnosticsToolboxHint: false,
    }),
    "",
    "This handoff starts or continues the Phase Interview. It is not a draft write-back handoff.",
    "",
    "Read these exact current inputs:",
    `- Approved Phase Interview handoff: ${sourceHandoff.path} revision ${sourceHandoff.revision}`,
    `- Approved Project Profile: ${context.profile.markdownPath}`,
    `- Approved Project Roadmap: ${context.roadmap.markdownPath}`,
    `- Approved Phase Map: ${context.phaseMap.markdownPath}`,
    `- Selected phase entry: ${context.selectedPhase.phaseId} / ${context.selectedPhase.title}`,
    ...(context.dependencyCloseouts.length > 0
      ? context.dependencyCloseouts.map((document) => `- Approved dependency closeout: ${document.markdownPath}`)
      : ["- Approved dependency closeouts: none"]),
    "",
    "Conduct the Phase Interview conversationally with the Operator.",
    "Use approved evidence before asking questions and do not ask for information already resolved by project evidence.",
    "Ask one primary question at a time in plain language.",
    "Distinguish Operator-owned decisions from Architect-owned technical decisions.",
    "Make Architect-owned technical recommendations instead of transferring design work to the Operator.",
    "When a material choice exists, provide your recommended answer first.",
    "The Operator may answer `use your recommendation` or `unsure`; treat either as permission to proceed with the best evidence-grounded recommendation.",
    "Do not use a target question count, minimum question count, or fixed interview length.",
    "Ask only material Operator-owned questions that remain unresolved after evidence review and normal Architect judgment.",
    "If approved evidence resolves the phase context, ask zero clarification questions and proceed directly to the confirmation summary.",
    "Resolve phase scope, non-scope, inherited constraints, dependencies, unknowns, risks, assumptions, acceptance direction, and planning inputs.",
    "Do not pre-author Work Cards and do not replace Phase Planning.",
    "",
    "When the interview or revision direction is substantively complete, present a concise phase-understanding summary.",
    "Ask the Operator to confirm or correct that summary.",
    "Stop and wait for Operator confirmation before finalization, draft creation, or write-back.",
    "Do not create, save, or request any Markdown artifact during this handoff.",
    "",
    "The eventual Phase Interview Markdown body must contain these exact headings:",
    "# Phase Interview",
    ...phaseInterviewRequiredSections().map((heading) => `## ${heading}`),
    "",
    "The durable Phase Interview must record whether clarification was required.",
    "When clarification questions were asked, preserve the material questions and answers.",
    "Read and address current Operator revision notes when the existing Phase Interview is RevisionRequested.",
    ...(revisionNotes ? ["", "Current Operator revision instructions:", revisionNotes] : []),
  ].join("\n");
}
