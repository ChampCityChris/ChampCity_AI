import type { PlanningDocumentSummary } from "../../shared/documents/planningDocument";
import {
  evaluateDocumentFreshness,
  listPlanningDocuments,
} from "../documents/planningDocumentService";
import { writeCanonicalMarkdownDocument } from "../documents/canonicalMarkdownDocumentWriter";
import {
  getPhasePlanningCompletion,
  validateCandidates,
  type WorkCardCandidate,
} from "../phasePlanning/phasePlanningService";
import type {
  WorkCardIntakeProjection,
  BeginWorkCardPlanningOptions,
  WorkCardMapProjectionOptions,
  WorkCardMapProjection,
} from "../../shared/workspaceContracts";
import {
  getWorkCardMapProjectionFromAuthority,
  readPlannedWorkCardCandidates,
  resolveActiveWorkCardAuthorityFromLoop,
  resolveActiveWorkCardPlanningHandoffFromLoop,
  resolveWorkCardLoopAuthority,
  selectNextWorkCardCandidateFromAuthority,
  workCardIntakeTargets as authorityWorkCardIntakeTargets,
} from "../workCardLoop/workCardLoopAuthorityService";
import {
  inheritRepositoryAuthorityFromSourceRevisions,
  mergeRepositoryAuthorityIntoWorkflowData,
} from "../documents/repositoryAuthority";

export type CandidateSelectionState =
  | "eligible"
  | "complete"
  | "dependency-blocked"
  | "deferred"
  | "superseded"
  | "already-satisfied"
  | "carried-forward";

export interface CandidateSelectionExplanation {
  candidateId: string;
  state: CandidateSelectionState;
  reason: string;
  evidencePaths: string[];
}

export type CandidateSelectionResult =
  | {
      state: "selected";
      phaseId: string;
      selectedCandidate: WorkCardCandidate;
      explanations: CandidateSelectionExplanation[];
    }
  | {
      state: "invalid-plan" | "all-complete" | "dependency-blocked" | "explicitly-resolved";
      phaseId?: string;
      reason: string;
      explanations: CandidateSelectionExplanation[];
    };

export interface WorkCardIntakeHandoffResult {
  phaseId: string;
  candidateId: string;
  handoffMarkdownPath: string;
  formalWorkCardMarkdownPath: string;
  reusedExisting: boolean;
}

export interface ActiveWorkCardPlanningHandoff {
  handoff: PlanningDocumentSummary;
  phaseId: string;
  workCardId: string;
  formalWorkCardMarkdownPath: string;
  closePendingEvidencePaths?: string[];
}

export type ActiveWorkCardAuthority =
  | {
      status: "none";
      phaseId?: string;
      reason: string;
      evidencePaths: string[];
    }
  | {
      status: "active";
      phaseId: string;
      workCardId: string;
      handoff: PlanningDocumentSummary;
      formalWorkCardMarkdownPath: string;
      reason: string;
      evidencePaths: string[];
    }
  | {
      status: "conflict";
      phaseId?: string;
      activeWorkCardIds: string[];
      reason: string;
      evidencePaths: string[];
    };

interface ActiveWorkCardAuthorityOptions {
  treatClosePendingAsActive?: boolean;
}

interface WorkCardIntakeContext extends WorkCardIntakeProjection {
  sourcePhasePlanningPath: string;
  sourcePhasePlanningRevision: number;
  sourceWorkCardPlanRevision: number;
}

export function selectNextWorkCardCandidate(
  workspaceRoot: string,
  phaseId: string,
): CandidateSelectionResult {
  return selectNextWorkCardCandidateFromAuthority(workspaceRoot, phaseId);
}

export function generateWorkCardIntakeHandoff(
  workspaceRoot: string,
  phaseId: string,
  candidateId?: string,
  options: WorkCardMapProjectionOptions = {},
): WorkCardIntakeHandoffResult {
  const context = resolveWorkCardIntakeContext(workspaceRoot, phaseId, candidateId, options);
  const candidate = context.candidate;
  const existing = currentApprovedHandoffForCandidate(
    workspaceRoot,
    phaseId,
    candidate.candidateId,
    context.handoffMarkdownPath,
    context.formalWorkCardMarkdownPath,
  );
  if (existing) {
    return {
      phaseId,
      candidateId: candidate.candidateId,
      handoffMarkdownPath: context.handoffMarkdownPath,
      formalWorkCardMarkdownPath: context.formalWorkCardMarkdownPath,
      reusedExisting: true,
    };
  }

  const content = { candidate: { ...candidate, phaseId } };
  const sourceRevisions = [
    { path: context.sourcePhasePlanningPath, revision: context.sourcePhasePlanningRevision },
    { path: context.sourceWorkCardPlanPath, revision: context.sourceWorkCardPlanRevision },
  ];
  writeCanonicalMarkdownDocument({
    workspaceRoot,
    relativePath: context.handoffMarkdownPath,
    metadata: {
      schemaVersion: 1,
      artifactType: "work-card-intake-handoff",
      artifactRevision: 1,
      participationRole: "nonReviewHandoff",
      identity: { phaseId, workCardId: candidate.candidateId },
      sourceRevisions,
      workflowData: mergeRepositoryAuthorityIntoWorkflowData(
        {
          ...content,
          formalWorkCardTarget: context.formalWorkCardMarkdownPath,
        },
        inheritRepositoryAuthorityFromSourceRevisions(workspaceRoot, sourceRevisions),
      ),
      documentDisposition: { status: "Approved", notes: "", reviewedAt: null },
    },
    bodyMarkdown: `# Work Card Intake Architect Handoff - ${candidate.candidateId}\n\nFormal Work Card Markdown: ${context.formalWorkCardMarkdownPath}\n`,
  });

  return {
    phaseId,
    candidateId: candidate.candidateId,
    handoffMarkdownPath: context.handoffMarkdownPath,
    formalWorkCardMarkdownPath: context.formalWorkCardMarkdownPath,
    reusedExisting: false,
  };
}

export function getWorkCardIntakeProjection(
  workspaceRoot: string,
  phaseId: string,
  candidateId?: string,
): WorkCardIntakeProjection {
  const context = resolveWorkCardIntakeContext(workspaceRoot, phaseId, candidateId);
  return {
    phaseId: context.phaseId,
    sourceWorkCardPlanPath: context.sourceWorkCardPlanPath,
    selectionReason: context.selectionReason,
    candidate: context.candidate,
    handoffMarkdownPath: context.handoffMarkdownPath,
    formalWorkCardMarkdownPath: context.formalWorkCardMarkdownPath,
  };
}

export function getWorkCardMapProjection(
  workspaceRoot: string,
  phaseId: string,
  options: WorkCardMapProjectionOptions = {},
): WorkCardMapProjection {
  return getWorkCardMapProjectionFromAuthority(workspaceRoot, phaseId, options);
}

export function beginWorkCardPlanningForCandidate(
  workspaceRoot: string,
  phaseId: string,
  candidateId: string,
  options: BeginWorkCardPlanningOptions = {},
): WorkCardIntakeHandoffResult {
  const activeAuthority = resolveActiveWorkCardAuthority(workspaceRoot, phaseId, {
    treatClosePendingAsActive: !options.closeReturnCompleted,
  });
  if (activeAuthority.status === "conflict") {
    throw new Error(`${activeAuthority.reason} Evidence: ${activeAuthority.evidencePaths.join("; ")}`);
  }
  if (activeAuthority.status === "active") {
    if (activeAuthority.workCardId !== candidateId) {
      throw new Error(
        `Cannot begin ${candidateId} because ${activeAuthority.workCardId} is the active Work Card. Evidence: ${activeAuthority.evidencePaths.join("; ")}`,
      );
    }
    return {
      phaseId: activeAuthority.phaseId,
      candidateId: activeAuthority.workCardId,
      handoffMarkdownPath: activeAuthority.handoff.markdownPath,
      formalWorkCardMarkdownPath: activeAuthority.formalWorkCardMarkdownPath,
      reusedExisting: true,
    };
  }
  const projection = getWorkCardMapProjection(workspaceRoot, phaseId, {
    closeReturnCompleted: options.closeReturnCompleted,
  });
  if (projection.state === "needs-attention") {
    throw new Error(projection.reason);
  }
  const candidate = projection.candidates.find((entry) => entry.candidateId === candidateId);
  if (!candidate) {
    throw new Error(`Requested Work Card candidate does not exist in the current Work Card Plan: ${candidateId}`);
  }
  if (candidate.status !== "Eligible") {
    throw new Error(`Begin Planning requires an Eligible Work Card candidate: ${candidateId}`);
  }
  return generateWorkCardIntakeHandoff(workspaceRoot, phaseId, candidateId, options);
}

export function resolveActiveWorkCardAuthority(
  workspaceRoot: string,
  phaseId?: string,
  options: ActiveWorkCardAuthorityOptions = {},
): ActiveWorkCardAuthority {
  return resolveActiveWorkCardAuthorityFromLoop(workspaceRoot, phaseId, options);
}

export function resolveActiveWorkCardPlanningHandoff(
  workspaceRoot: string,
  phaseId?: string,
): ActiveWorkCardPlanningHandoff | undefined {
  return resolveActiveWorkCardPlanningHandoffFromLoop(workspaceRoot, phaseId);
}

function resolveWorkCardIntakeContext(
  workspaceRoot: string,
  phaseId: string,
  candidateId?: string,
  options: WorkCardMapProjectionOptions = {},
): WorkCardIntakeContext {
  if (candidateId) {
    return resolveRequestedWorkCardIntakeContext(workspaceRoot, phaseId, candidateId, options);
  }

  const selection = selectNextWorkCardCandidate(workspaceRoot, phaseId);
  if (selection.state !== "selected") {
    throw new Error(`No eligible Work Card candidate is available: ${selection.state}`);
  }
  const candidate = selection.selectedCandidate;
  const selectionReason =
    selection.explanations.find((entry) => entry.candidateId === candidate.candidateId)?.reason ??
    "Candidate is eligible.";
  return buildWorkCardIntakeContext(workspaceRoot, phaseId, candidate, selectionReason);
}

function resolveRequestedWorkCardIntakeContext(
  workspaceRoot: string,
  phaseId: string,
  candidateId: string,
  options: WorkCardMapProjectionOptions,
): WorkCardIntakeContext {
  const authority = resolveWorkCardLoopAuthority(workspaceRoot, phaseId, options);
  const candidateProjection = authority.candidates.find((candidate) => candidate.candidateId === candidateId);
  if (!candidateProjection) {
    throw new Error(`Requested Work Card candidate does not exist in the current Work Card Plan: ${candidateId}`);
  }
  if (authority.status === "conflict") {
    throw new Error(`${authority.reason} Evidence: ${authority.sourceEvidence.join("; ")}`);
  }
  if (authority.status === "no-plan" || authority.status === "not-applicable") {
    throw new Error(authority.reason);
  }
  if (authority.status === "all-complete") {
    throw new Error(`Begin Planning requires an Eligible Work Card candidate: ${candidateId}. ${authority.reason}`);
  }
  if (authority.status === "active") {
    if (authority.workCardId !== candidateId || !candidateProjection.isActive) {
      throw new Error(
        `Cannot begin ${candidateId} because ${authority.workCardId ?? "another Work Card"} is the active Work Card. Evidence: ${authority.sourceEvidence.join("; ")}`,
      );
    }
    return buildWorkCardIntakeContext(
      workspaceRoot,
      phaseId,
      requirePlannedCandidate(workspaceRoot, phaseId, candidateId),
      candidateProjection.reason || authority.reason,
    );
  }
  if (candidateProjection.status !== "Eligible") {
    throw new Error(`Begin Planning requires an Eligible Work Card candidate: ${candidateId}. ${candidateProjection.reason}`);
  }
  return buildWorkCardIntakeContext(
    workspaceRoot,
    phaseId,
    requirePlannedCandidate(workspaceRoot, phaseId, candidateId),
    candidateProjection.reason,
  );
}

function requirePlannedCandidate(
  workspaceRoot: string,
  phaseId: string,
  candidateId: string,
): WorkCardCandidate {
  const candidate = readCandidates(workspaceRoot, phaseId)
    .find((entry) => entry.candidateId === candidateId);
  if (!candidate) {
    throw new Error(`Requested Work Card candidate does not exist in the current Work Card Plan: ${candidateId}`);
  }
  return candidate;
}

function buildWorkCardIntakeContext(
  workspaceRoot: string,
  phaseId: string,
  candidate: WorkCardCandidate,
  selectionReason: string,
): WorkCardIntakeContext {
  const phasePlanning = requiredApproved(workspaceRoot, `planning/phases/${phaseId}/Phase_Planning`, ".md");
  const workCardPlan = requiredApproved(workspaceRoot, `planning/phases/${phaseId}/Work_Card_Plan`, ".md");
  const targets = workCardIntakeTargets(phaseId, candidate);
  return {
    phaseId,
    sourcePhasePlanningPath: phasePlanning.markdownPath,
    sourcePhasePlanningRevision: phasePlanning.metadata.artifactRevision ?? 1,
    sourceWorkCardPlanPath: workCardPlan.markdownPath,
    sourceWorkCardPlanRevision: workCardPlan.metadata.artifactRevision ?? 1,
    selectionReason,
    candidate: {
      candidateId: candidate.candidateId,
      order: candidate.order,
      title: candidate.title,
      purpose: candidate.purpose,
      dependsOn: candidate.dependsOn,
      resolutionStatus: candidate.resolutionStatus,
      resolutionReason: candidate.resolutionReason,
      evidencePaths: candidate.evidencePaths,
      carriedForwardToPhaseId: candidate.carriedForwardToPhaseId,
    },
    handoffMarkdownPath: targets.handoffMarkdownPath,
    formalWorkCardMarkdownPath: targets.formalWorkCardMarkdownPath,
  };
}

function workCardIntakeTargets(
  phaseId: string,
  candidate: Pick<WorkCardCandidate, "candidateId" | "title">,
): Pick<WorkCardIntakeProjection, "handoffMarkdownPath" | "formalWorkCardMarkdownPath"> {
  return authorityWorkCardIntakeTargets(phaseId, candidate);
}

function currentApprovedHandoffForCandidate(
  workspaceRoot: string,
  phaseId: string,
  candidateId: string,
  handoffMarkdownPath: string,
  formalWorkCardMarkdownPath: string,
): PlanningDocumentSummary | undefined {
  return listPlanningDocuments(workspaceRoot)
    .filter((document) => document.markdownPath === handoffMarkdownPath)
    .filter((document) => document.metadata.artifactType === "work-card-intake-handoff")
    .filter((document) => document.effectiveDisposition === "Approved")
    .filter((document) => document.metadata.phaseId === phaseId || document.metadata.canonical?.identity.phaseId === phaseId)
    .filter((document) => document.metadata.workCardId === candidateId || document.metadata.canonical?.identity.workCardId === candidateId)
    .filter((document) => document.metadata.canonical?.workflowData.formalWorkCardTarget === formalWorkCardMarkdownPath)
    .find((document) => evaluateDocumentFreshness(workspaceRoot, document.logicalDocumentId).state === "fresh");
}

function readCandidates(workspaceRoot: string, phaseId: string): WorkCardCandidate[] {
  return readPlannedWorkCardCandidates(workspaceRoot, phaseId);
}

function requiredApproved(workspaceRoot: string, prefix: string, extension: ".md"): PlanningDocumentSummary {
  const document = listPlanningDocuments(workspaceRoot)
    .filter((candidate) => candidate.markdownPath.startsWith(prefix))
    .filter((candidate) => candidate.markdownPath.endsWith(extension))
    .at(-1);
  if (!document || document.effectiveDisposition !== "Approved") {
    throw new Error(`Current Approved input is required: ${prefix}`);
  }
  if (evaluateDocumentFreshness(workspaceRoot, document.logicalDocumentId).state === "stale") {
    throw new Error(`Current input is stale: ${prefix}`);
  }
  if (!document.markdownPath) {
    throw new Error(`Canonical Markdown input is required: ${prefix}`);
  }
  return document;
}
