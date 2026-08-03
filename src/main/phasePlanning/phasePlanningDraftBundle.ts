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
import { getPhaseIntakeCompletion } from "../phaseInterview/phaseInterviewService";
import { getPhaseMapProjection, type PhaseMapPhase } from "../phaseMap/phaseMapService";

export const phasePlanningSubmissionContractId = "phase-planning-atomic-bundle-v1";
export const phasePlanningOutputKind = "phase-planning-bundle";
export const phasePlanningOwningWorkspaceId = "phase-planning-bundle";

export const candidateResolutionStatuses = [
  "planned",
  "deferred",
  "superseded",
  "alreadySatisfied",
  "carriedForward",
] as const;

export type CandidateResolutionStatus = (typeof candidateResolutionStatuses)[number];

export interface WorkCardCandidate {
  candidateId: string;
  order: number;
  title: string;
  purpose: string;
  dependsOn: string[];
  resolutionStatus: CandidateResolutionStatus;
  resolutionReason: string;
  evidencePaths: string[];
  carriedForwardToPhaseId?: string;
}

export type PhasePlanningSlotId = "phase-planning" | "work-card-plan";

export interface PhasePlanningArtifactIdentity {
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

export interface PhasePlanningReadyContext {
  selectedPhase: PhaseMapPhase;
  profile: PlanningDocumentSummary;
  roadmap: PlanningDocumentSummary;
  phaseMap: PlanningDocumentSummary;
  phaseInterview: PlanningDocumentSummary;
  handoff?: PlanningDocumentSummary;
  handoffMarkdownPath: string;
  phasePlanningMarkdownPath: string;
  workCardPlanMarkdownPath: string;
  sourceRevisions: SourceRevision[];
  evidencePaths: string[];
  phasePlanning?: PhasePlanningArtifactIdentity;
  invalidPhasePlanning?: PhasePlanningArtifactIdentity;
  invalidPhasePlanningReason?: string;
  workCardPlan?: PhasePlanningArtifactIdentity;
  invalidWorkCardPlan?: PhasePlanningArtifactIdentity;
  invalidWorkCardPlanReason?: string;
}

export interface PhasePlanningUnavailableContext {
  status: "not-ready" | "needs-attention";
  reason: string;
  evidencePaths: string[];
}

export type PhasePlanningDraftContext =
  | ({ status: "ready" } & PhasePlanningReadyContext)
  | PhasePlanningUnavailableContext;

interface PhasePlanningSelection {
  selectedRole: PhasePlanningSlotId;
  phasePlanningMarkdownPath: string;
  workCardPlanMarkdownPath: string;
}

type ActivePhasePlanningSubmission = ActiveArchitectOutputRuntimeSubmission<
  PhasePlanningSlotId,
  PhasePlanningSelection
>;

const requiredPhasePlanningSections = [
  "Phase Objective",
  "Scope",
  "Non-Scope",
  "Inherited Constraints",
  "Architecture and Implementation Direction",
  "Major Deliverables",
  "Dependencies",
  "Risks and Mitigations",
  "Validation Strategy",
  "Acceptance Criteria",
  "Sequencing Direction",
  "Deferred Items",
  "Unresolved Questions",
] as const;

export const phasePlanningArchitectOutputDefinition: ArchitectOutputDefinition<
  PhasePlanningSlotId,
  PhasePlanningSelection,
  PhasePlanningReadyContext
> = {
  outputKind: phasePlanningOutputKind,
  owningWorkspaceId: phasePlanningOwningWorkspaceId,
  bundleMode: "atomic-bundle",
  slots: [
    {
      slotId: "phase-planning",
      displayLabel: "Phase Planning",
      draftPathComponent: "phase-planning.md",
      validateBody(bodyMarkdown) {
        validatePhasePlanningBody(bodyMarkdown);
      },
      buildCanonicalDocument({ workspaceRoot, domainContext: context, bodyMarkdown }) {
        const existing = context.phasePlanning
          ? readExistingCanonical(workspaceRoot, context.phasePlanningMarkdownPath)
          : null;
        const metadata: CanonicalDocumentMetadata = existing
          ? metadataWithSubstantiveRevision(existing.metadata, context.sourceRevisions)
          : freshBundleMetadata(context, "phase-planning", {});
        return { relativePath: context.phasePlanningMarkdownPath, metadata, bodyMarkdown };
      },
    },
    {
      slotId: "work-card-plan",
      displayLabel: "Work Card Plan",
      draftPathComponent: "work-card-plan.md",
      validateBody(bodyMarkdown) {
        candidatesFromWorkCardPlanBody(bodyMarkdown);
      },
      buildCanonicalDocument({ workspaceRoot, domainContext: context, bodyMarkdown }) {
        const candidates = candidatesFromWorkCardPlanBody(bodyMarkdown);
        const existing = context.workCardPlan
          ? readExistingCanonical(workspaceRoot, context.workCardPlanMarkdownPath)
          : null;
        const metadata: CanonicalDocumentMetadata = existing
          ? {
              ...metadataWithSubstantiveRevision(existing.metadata, context.sourceRevisions),
              workflowData: { candidates },
            }
          : freshBundleMetadata(context, "work-card-plan", { candidates });
        return { relativePath: context.workCardPlanMarkdownPath, metadata, bodyMarkdown };
      },
    },
  ],
  buildSubmissionId(context) {
    return buildDeterministicArchitectDraftSubmissionId({
      outputKind: phasePlanningOutputKind,
      owningWorkspaceId: phasePlanningOwningWorkspaceId,
      ...context,
    });
  },
  buildPromotionGroupId(context) {
    return buildDeterministicArchitectDraftSubmissionId({
      outputKind: phasePlanningOutputKind,
      owningWorkspaceId: phasePlanningOwningWorkspaceId,
      ...context,
    });
  },
  resolvePreparation(workspaceRoot) {
    const context = requireReadyContext(workspaceRoot);
    assertCanPromotePhasePlanningBundle(context);
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
      preparedContext as PhasePlanningReadyContext,
    );
  },
  buildPreparedInstruction({ submission, sourceHandoff, domainContext: context }) {
    return buildPhasePlanningPreparedInstruction(context, submission, sourceHandoff);
  },
  buildPostPromotionSelection({ promotedDocuments }) {
    return {
      selectedRole: "phase-planning",
      phasePlanningMarkdownPath: promotedDocuments[0].relativePath,
      workCardPlanMarkdownPath: promotedDocuments[1].relativePath,
    };
  },
};

export function preparePhasePlanningDraftBundleSubmission(
  workspaceRoot: string,
): ArchitectDraftSubmission<PhasePlanningSlotId, PhasePlanningSelection> {
  return prepareArchitectOutputRuntimeSubmission(
    workspaceRoot,
    phasePlanningOutputKind,
    phasePlanningOwningWorkspaceId,
  );
}

export function getPhasePlanningDraftBundleStatus(
  workspaceRoot: string,
): ActivePhasePlanningSubmission | undefined {
  return getArchitectOutputRuntimeStatus(
    workspaceRoot,
    phasePlanningOutputKind,
    phasePlanningOwningWorkspaceId,
  );
}

export function getActivePhasePlanningDraftBundleSubmission(
  workspaceRoot: string,
): ActivePhasePlanningSubmission | undefined {
  return getActiveArchitectOutputRuntimeSubmission(workspaceRoot, phasePlanningOwningWorkspaceId);
}

export function resolvePhasePlanningDraftContext(workspaceRoot: string): PhasePlanningDraftContext {
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

  const intake = getPhaseIntakeCompletion(workspaceRoot, selectedPhase.phaseId);
  if (!intake.complete) {
    return {
      status: "not-ready",
      reason: intake.reason,
      evidencePaths: [`planning/phases/${selectedPhase.phaseId}/Phase_Interview.md`],
    };
  }

  const profile = requiredApprovedDocument(workspaceRoot, "planning/project/PROJECT_PROFILE", ".md");
  const roadmap = requiredApprovedDocument(workspaceRoot, "planning/project/Project_Roadmap/PROJECT_ROADMAP", ".md");
  const phaseMap = requiredApprovedDocument(workspaceRoot, "planning/project/Phase_Map/PHASE_MAP", ".md");
  const phaseInterview = requiredApprovedDocument(workspaceRoot, `planning/phases/${selectedPhase.phaseId}/Phase_Interview`, ".md");
  const baseEvidence = [
    "planning/project/PROJECT_PROFILE.md",
    "planning/project/Project_Roadmap",
    "planning/project/Phase_Map",
    `planning/phases/${selectedPhase.phaseId}/Phase_Interview.md`,
  ];
  if (!profile.ok) return { status: "not-ready", reason: profile.reason, evidencePaths: baseEvidence };
  if (!roadmap.ok) return { status: "not-ready", reason: roadmap.reason, evidencePaths: baseEvidence };
  if (!phaseMap.ok) return { status: "not-ready", reason: phaseMap.reason, evidencePaths: baseEvidence };
  if (!phaseInterview.ok) return { status: "not-ready", reason: phaseInterview.reason, evidencePaths: baseEvidence };

  const profileDocument = profile.document;
  const roadmapDocument = roadmap.document;
  const phaseMapDocument = phaseMap.document;
  const phaseInterviewDocument = phaseInterview.document;

  const handoffMarkdownPath = phasePlanningHandoffPath(selectedPhase.phaseId);
  const phasePlanningMarkdownPath = phasePlanningOutputPath(selectedPhase.phaseId);
  const workCardPlanMarkdownPath = workCardPlanOutputPath(selectedPhase.phaseId);
  const handoff = approvedPhasePlanningHandoff(workspaceRoot, selectedPhase.phaseId);
  const evidencePaths = [
    profileDocument.markdownPath,
    roadmapDocument.markdownPath,
    phaseMapDocument.markdownPath,
    phaseInterviewDocument.markdownPath,
  ];

  if (handoff) {
    const handoffProblem = validateHandoffForContext(
      workspaceRoot,
      handoff,
      selectedPhase.phaseId,
      phasePlanningMarkdownPath,
      workCardPlanMarkdownPath,
    );
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
        { path: profileDocument.markdownPath, revision: profileDocument.metadata.artifactRevision ?? 1 },
        { path: roadmapDocument.markdownPath, revision: roadmapDocument.metadata.artifactRevision ?? 1 },
        { path: phaseMapDocument.markdownPath, revision: phaseMapDocument.metadata.artifactRevision ?? 1 },
        { path: phaseInterviewDocument.markdownPath, revision: phaseInterviewDocument.metadata.artifactRevision ?? 1 },
      ];

  const documents = listPlanningDocuments(workspaceRoot);
  const phasePlanningDocument = documents.find((document) => document.markdownPath === phasePlanningMarkdownPath);
  const workCardPlanDocument = documents.find((document) => document.markdownPath === workCardPlanMarkdownPath);
  const phasePlanningInvalid = phasePlanningDocument
    ? validateExistingBundleMember(workspaceRoot, phasePlanningDocument, "phase-planning", selectedPhase.phaseId, sourceRevisions)
    : undefined;
  const workCardPlanInvalid = workCardPlanDocument
    ? validateExistingBundleMember(workspaceRoot, workCardPlanDocument, "work-card-plan", selectedPhase.phaseId, sourceRevisions)
    : undefined;
  const phasePlanningIdentity = phasePlanningDocument ? identityForDocument(phasePlanningDocument, workspaceRoot) : undefined;
  const workCardPlanIdentity = workCardPlanDocument ? identityForDocument(workCardPlanDocument, workspaceRoot) : undefined;

  return {
    status: "ready",
    selectedPhase,
    profile: profileDocument,
    roadmap: roadmapDocument,
    phaseMap: phaseMapDocument,
    phaseInterview: phaseInterviewDocument,
    handoff,
    handoffMarkdownPath,
    phasePlanningMarkdownPath,
    workCardPlanMarkdownPath,
    sourceRevisions,
    evidencePaths: handoff ? [...evidencePaths, handoff.markdownPath] : evidencePaths,
    phasePlanning: phasePlanningDocument && !phasePlanningInvalid ? phasePlanningIdentity : undefined,
    invalidPhasePlanning: phasePlanningDocument && phasePlanningInvalid ? phasePlanningIdentity : undefined,
    invalidPhasePlanningReason: phasePlanningInvalid,
    workCardPlan: workCardPlanDocument && !workCardPlanInvalid ? workCardPlanIdentity : undefined,
    invalidWorkCardPlan: workCardPlanDocument && workCardPlanInvalid ? workCardPlanIdentity : undefined,
    invalidWorkCardPlanReason: workCardPlanInvalid,
  };
}

export function canPreparePhasePlanningDraftBundle(context: PhasePlanningReadyContext): boolean {
  if (!context.handoff || context.invalidPhasePlanningReason || context.invalidWorkCardPlanReason) return false;
  if (!context.phasePlanning && !context.workCardPlan) return true;
  if (!context.phasePlanning || !context.workCardPlan) return false;
  return (
    context.phasePlanning.disposition === "RevisionRequested" &&
    context.workCardPlan.disposition === "RevisionRequested" &&
    context.phasePlanning.operatorReviewNotes === context.workCardPlan.operatorReviewNotes
  );
}

export function validateCandidates(value: unknown): WorkCardCandidate[] {
  if (!Array.isArray(value)) {
    throw new Error("Work Card Plan candidates must be an array.");
  }
  const ids = new Set<string>();
  return value.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error("Each Work Card candidate must be an object.");
    }
    if (Object.prototype.hasOwnProperty.call(entry, "completed")) {
      throw new Error("Work Card candidate completion must be derived, not persisted.");
    }
    const candidate = entry as Record<string, unknown>;
    if (
      typeof candidate.candidateId !== "string" ||
      typeof candidate.order !== "number" ||
      !Number.isInteger(candidate.order) ||
      typeof candidate.title !== "string" ||
      typeof candidate.purpose !== "string" ||
      !Array.isArray(candidate.dependsOn) ||
      !candidate.dependsOn.every((item) => typeof item === "string") ||
      typeof candidate.resolutionStatus !== "string" ||
      !candidateResolutionStatuses.includes(candidate.resolutionStatus as CandidateResolutionStatus) ||
      typeof candidate.resolutionReason !== "string" ||
      !Array.isArray(candidate.evidencePaths) ||
      !candidate.evidencePaths.every((item) => typeof item === "string")
    ) {
      throw new Error("Work Card candidates must use the canonical candidate fields.");
    }
    if (ids.has(candidate.candidateId)) {
      throw new Error("Work Card candidate IDs must be unique within a phase.");
    }
    ids.add(candidate.candidateId);
    assertResolutionEvidence(candidate as unknown as WorkCardCandidate);
    return {
      candidateId: candidate.candidateId,
      order: candidate.order,
      title: candidate.title,
      purpose: candidate.purpose,
      dependsOn: candidate.dependsOn,
      resolutionStatus: candidate.resolutionStatus as CandidateResolutionStatus,
      resolutionReason: candidate.resolutionReason,
      evidencePaths: candidate.evidencePaths,
      carriedForwardToPhaseId: typeof candidate.carriedForwardToPhaseId === "string"
        ? candidate.carriedForwardToPhaseId
        : undefined,
    };
  });
}

export function candidatesFromWorkCardPlanBody(markdownBody: string): WorkCardCandidate[] {
  if (!hasExactHeading(markdownBody, 1, "Work Card Plan")) {
    throw new Error("Work Card Plan draft requires # Work Card Plan.");
  }
  const normalized = markdownBody.replace(/\r\n?/g, "\n");
  const matches = [...normalized.matchAll(/^```champcity-work-card-plan[ \t]*\n([\s\S]*?)\n```[ \t]*$/gm)];
  if (matches.length !== 1) {
    throw new Error("Work Card Plan output requires exactly one champcity-work-card-plan fenced block.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(matches[0][1]);
  } catch (error) {
    throw new Error(`Work Card Plan domain block must contain JSON: ${errorMessage(error)}`);
  }
  return validateCandidates(parsed);
}

export function phasePlanningRequiredSections(): readonly string[] {
  return requiredPhasePlanningSections;
}

export function validatePhasePlanningBody(bodyMarkdown: string): void {
  if (!hasExactHeading(bodyMarkdown, 1, "Phase Planning")) {
    throw new Error("Phase Planning draft requires # Phase Planning.");
  }
  for (const section of requiredPhasePlanningSections) {
    if (!hasExactHeading(bodyMarkdown, 2, section)) {
      throw new Error(`Phase Planning draft requires ## ${section}.`);
    }
  }
}

export function phasePlanningHandoffPath(phaseId: string): string {
  return `planning/phases/${phaseId}/Architect_Handoffs/PHASE_PLANNING_ARCHITECT_HANDOFF_${phaseId}.md`;
}

export function phasePlanningOutputPath(phaseId: string): string {
  return `planning/phases/${phaseId}/Phase_Planning.md`;
}

export function workCardPlanOutputPath(phaseId: string): string {
  return `planning/phases/${phaseId}/Work_Card_Plan.md`;
}

export function draftPathForPhasePlanningSlot(
  submission: ArchitectDraftSubmission<PhasePlanningSlotId>,
  slotId: PhasePlanningSlotId,
): string {
  const slot = submission.expectedDraftSlots.find((candidate) => candidate.slotId === slotId);
  if (!slot) {
    throw new Error("Phase Planning draft submission is missing an expected slot.");
  }
  return slot.draftRelativePath;
}

function requireReadyContext(workspaceRoot: string): PhasePlanningReadyContext & { handoff: PlanningDocumentSummary } {
  const context = resolvePhasePlanningDraftContext(workspaceRoot);
  if (context.status !== "ready") throw new Error(context.reason);
  if (!context.handoff) throw new Error("Current Approved Phase Planning handoff is required.");
  return context as PhasePlanningReadyContext & { handoff: PlanningDocumentSummary };
}

function requireCurrentPromotionContext(
  workspaceRoot: string,
  submission: ArchitectDraftSubmission,
  original: PhasePlanningReadyContext,
): PhasePlanningReadyContext {
  if (!original) throw new Error("Phase Planning draft submission context is unavailable.");
  const current = requireReadyContext(workspaceRoot);
  if (
    current.handoff.markdownPath !== submission.sourceHandoff.path ||
    (current.handoff.metadata.artifactRevision ?? 1) !== submission.sourceHandoff.revision
  ) {
    throw new Error("Phase Planning draft submission no longer matches the current handoff revision.");
  }
  if (
    current.selectedPhase.phaseId !== original.selectedPhase.phaseId ||
    current.phasePlanningMarkdownPath !== original.phasePlanningMarkdownPath ||
    current.workCardPlanMarkdownPath !== original.workCardPlanMarkdownPath ||
    JSON.stringify(current.sourceRevisions) !== JSON.stringify(original.sourceRevisions)
  ) {
    throw new Error("Phase Planning draft submission no longer matches the current phase planning evidence.");
  }
  assertCanPromotePhasePlanningBundle(current);
  return current;
}

function assertCanPromotePhasePlanningBundle(context: PhasePlanningReadyContext): void {
  if (context.invalidPhasePlanningReason || context.invalidWorkCardPlanReason) {
    throw new Error(context.invalidPhasePlanningReason ?? context.invalidWorkCardPlanReason);
  }
  if (!context.phasePlanning && !context.workCardPlan) return;
  if (!context.phasePlanning || !context.workCardPlan) {
    throw new Error("Phase Planning draft bundle cannot replace a partial existing output set.");
  }
  if (
    context.phasePlanning.disposition !== "RevisionRequested" ||
    context.workCardPlan.disposition !== "RevisionRequested"
  ) {
    throw new Error("Phase Planning draft bundle can only replace an existing synchronized RevisionRequested bundle.");
  }
  if (context.phasePlanning.operatorReviewNotes !== context.workCardPlan.operatorReviewNotes) {
    throw new Error("Phase Planning draft bundle cannot replace outputs with mixed review notes.");
  }
}

function freshBundleMetadata(
  context: PhasePlanningReadyContext,
  artifactType: "phase-planning" | "work-card-plan",
  workflowData: Record<string, unknown>,
): CanonicalDocumentMetadata {
  return {
    schemaVersion: 1,
    artifactType,
    artifactRevision: 1,
    participationRole: "compoundGatingReview",
    identity: { phaseId: context.selectedPhase.phaseId },
    sourceRevisions: context.sourceRevisions,
    workflowData,
    documentDisposition: { status: "Pending", notes: "", reviewedAt: null },
  };
}

function approvedPhasePlanningHandoff(
  workspaceRoot: string,
  phaseId: string,
): PlanningDocumentSummary | undefined {
  return listPlanningDocuments(workspaceRoot)
    .filter((document) => document.metadata.artifactType === "generated-handoff")
    .filter((document) => document.metadata.canonical?.workflowData.handoffKind === "phase-planning")
    .filter((document) => document.metadata.canonical?.identity.phaseId === phaseId)
    .filter((document) => document.effectiveDisposition === "Approved")
    .at(-1);
}

function validateHandoffForContext(
  workspaceRoot: string,
  handoff: PlanningDocumentSummary,
  phaseId: string,
  phasePlanningMarkdownPath: string,
  workCardPlanMarkdownPath: string,
): string | undefined {
  if (evaluateDocumentFreshness(workspaceRoot, handoff.logicalDocumentId).state === "stale") {
    return "Current Phase Planning handoff is stale.";
  }
  const workflowData = handoff.metadata.canonical?.workflowData ?? {};
  if (workflowData.contractId !== phasePlanningSubmissionContractId) {
    return "Phase Planning handoff contract is not current.";
  }
  if (workflowData.phasePlanningTarget !== phasePlanningMarkdownPath) {
    return "Phase Planning handoff target does not match the selected phase.";
  }
  if (workflowData.workCardPlanTarget !== workCardPlanMarkdownPath) {
    return "Work Card Plan handoff target does not match the selected phase.";
  }
  if (handoff.metadata.canonical?.identity.phaseId !== phaseId) {
    return "Phase Planning handoff identity does not match the selected phase.";
  }
  return undefined;
}

function validateExistingBundleMember(
  workspaceRoot: string,
  document: PlanningDocumentSummary,
  artifactType: "phase-planning" | "work-card-plan",
  phaseId: string,
  sourceRevisions: SourceRevision[],
): string | undefined {
  const canonical = document.metadata.canonical;
  if (document.documentReadState !== "readable" || !canonical) {
    return document.readError ?? "Existing Phase Planning bundle target is not readable canonical Markdown.";
  }
  if (canonical.artifactType !== artifactType) {
    return `${document.markdownPath} has the wrong artifact type.`;
  }
  if (canonical.participationRole !== "compoundGatingReview") {
    return `${document.markdownPath} must use participationRole=compoundGatingReview.`;
  }
  if (canonical.identity.phaseId !== phaseId) {
    return `${document.markdownPath} identity does not match the selected phase.`;
  }
  for (const source of sourceRevisions) {
    if (!canonical.sourceRevisions.some((entry) => entry.path === source.path && entry.revision === source.revision)) {
      return `${document.markdownPath} does not reference current source revision: ${source.path}.`;
    }
  }
  const freshness = evaluateDocumentFreshness(workspaceRoot, document.logicalDocumentId);
  if (freshness.state === "stale") {
    return `${document.markdownPath} is stale.`;
  }
  if (artifactType === "work-card-plan") {
    try {
      validateCandidates(canonical.workflowData.candidates);
    } catch (error) {
      return `Work Card Plan canonical candidates are malformed: ${errorMessage(error)}`;
    }
  }
  return undefined;
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
): PhasePlanningArtifactIdentity {
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
    operatorReviewNotes: document.metadata.canonical?.documentDisposition.notes ?? "",
  };
}

function assertResolutionEvidence(candidate: WorkCardCandidate): void {
  if (candidate.resolutionStatus === "planned") return;
  if (!candidate.resolutionReason.trim()) {
    throw new Error("Non-planned candidates require a resolution reason.");
  }
  if (candidate.evidencePaths.length === 0) {
    throw new Error("Non-planned candidates require evidence paths.");
  }
  if (candidate.resolutionStatus === "carriedForward" && !candidate.carriedForwardToPhaseId) {
    throw new Error("Carried-forward candidates require a target phase ID.");
  }
}

function hasExactHeading(bodyMarkdown: string, depth: 1 | 2, heading: string): boolean {
  const prefix = "#".repeat(depth);
  return bodyMarkdown
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .some((line) => line.trim() === `${prefix} ${heading}`);
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

function buildPhasePlanningPreparedInstruction(
  context: PhasePlanningReadyContext,
  submission: ArchitectDraftSubmission<PhasePlanningSlotId>,
  sourceHandoff: ArchitectDraftSubmission["sourceHandoff"],
): string {
  const revisionNotes = sharedOperatorReviewNotes(context.phasePlanning, context.workCardPlan);
  const includeRevisionNotes =
    (context.phasePlanning?.disposition === "RevisionRequested" ||
      context.workCardPlan?.disposition === "RevisionRequested") &&
    revisionNotes;
  const phasePlanningDraftPath = draftPathForPhasePlanningSlot(submission, "phase-planning");
  const workCardPlanDraftPath = draftPathForPhasePlanningSlot(submission, "work-card-plan");
  return [
    "Use ChampCity MCP with repository reference <PROJECT_REPO>.",
    "Resolve the configured workspace ID through diagnostics_toolbox.list_workspaces when it is not already known.",
    "",
    "Read these exact current inputs:",
    `- Approved Phase Planning handoff: ${sourceHandoff.path} revision ${sourceHandoff.revision}`,
    `- Approved Project Profile: ${context.profile.markdownPath}`,
    `- Approved Project Roadmap: ${context.roadmap.markdownPath}`,
    `- Approved Phase Map: ${context.phaseMap.markdownPath}`,
    `- Selected Phase Map entry: ${context.selectedPhase.phaseId} / ${context.selectedPhase.title}`,
    `- Approved Phase Interview: ${context.phaseInterview.markdownPath}`,
    "",
    "Produce both complete Markdown document bodies for these exact final targets:",
    `- Phase Planning target: ${context.phasePlanningMarkdownPath}`,
    `- Work Card Plan target: ${context.workCardPlanMarkdownPath}`,
    "",
    "Both outputs belong to one atomic Phase Planning draft bundle.",
    "MCP creates only these temporary body-only drafts:",
    `- Temporary Phase Planning draft path: ${phasePlanningDraftPath}`,
    `- Temporary Work Card Plan draft path: ${workCardPlanDraftPath}`,
    "",
    "The Phase Planning Markdown body must contain these exact headings:",
    "# Phase Planning",
    ...phasePlanningRequiredSections().map((heading) => `## ${heading}`),
    "",
    "The Work Card Plan Markdown body must contain this exact title:",
    "# Work Card Plan",
    "",
    "Require exactly one champcity-work-card-plan fenced JSON array.",
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
    `Allowed resolution statuses: ${candidateResolutionStatuses.join(", ")}`,
    "Do not persist completion state. Do not introduce a wrapper object, second schema, or alternate candidate representation.",
    "",
    "Current source revisions:",
    ...context.sourceRevisions.map((source) => `- path: ${source.path} revision: ${source.revision}`),
    "",
    "When the complete Phase Planning body is ready, call artifact_toolbox.create_markdown_artifact with this invocation shape:",
    "```json",
    "{",
    '  "action": "create_markdown_artifact",',
    '  "workspaceId": "<resolved workspace ID>",',
    '  "params": {',
    `    "relativePath": "${phasePlanningDraftPath}",`,
    '    "content": "<complete body-only Phase Planning Markdown>",',
    '    "overwrite": false',
    "  }",
    "}",
    "```",
    "",
    "When the complete Work Card Plan body is ready, call artifact_toolbox.create_markdown_artifact with this invocation shape:",
    "```json",
    "{",
    '  "action": "create_markdown_artifact",',
    '  "workspaceId": "<resolved workspace ID>",',
    '  "params": {',
    `    "relativePath": "${workCardPlanDraftPath}",`,
    '    "content": "<complete body-only Work Card Plan Markdown>",',
    '    "overwrite": false',
    "  }",
    "}",
    "```",
    "Do not supply caller metadata, canonical metadata, metadata delimiters, final canonical output paths, source revisions, route selectors, domain save actions, manual imports, file-copy fallbacks, or any other authority fields as params.",
    "After both drafts are created, respond with a concise draft-created confirmation.",
    ...(includeRevisionNotes ? ["", "Current Operator revision instructions:", revisionNotes] : []),
  ].join("\n");
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
