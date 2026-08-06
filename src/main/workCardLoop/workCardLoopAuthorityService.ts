import fs from "node:fs";
import path from "node:path";
import type { PlanningDocumentSummary } from "../../shared/documents/planningDocument";
import { parseCanonicalMarkdownDocument } from "../../shared/documents/canonicalMarkdown";
import {
  type WorkCardMapCandidateProjection,
  type WorkCardMapProjection,
  type WorkCardMapProjectionOptions,
  type WorkspaceId,
} from "../../shared/workspaceContracts";
import {
  evaluateDocumentFreshness,
  listPlanningDocuments,
} from "../documents/planningDocumentService";
import {
  getPhasePlanningCompletion,
  validateCandidates,
  type WorkCardCandidate,
} from "../phasePlanning/phasePlanningService";
import {
  getWorkCardBuildingReviewProjection,
} from "../workCardBuilding/workCardBuildingReviewService";
import { getWorkCardCloseProjection } from "../workCardValidation/workCardValidationService";
import {
  resolveApprovedRepairImplementationContext,
  resolveExactActiveRepairWorkCardContext,
} from "../workCardRepair/workCardRepairService";

export type WorkCardLoopAuthorityStatus =
  | "no-plan"
  | "map-ready"
  | "active"
  | "all-complete"
  | "conflict"
  | "not-applicable";

export type WorkCardLoopAuthorityStep =
  | "Map"
  | "Planning"
  | "Build"
  | "ReviewAndValidation"
  | "Repair"
  | "Close";

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

export interface WorkCardLoopAuthorityProjection {
  status: WorkCardLoopAuthorityStatus;
  phaseId?: string;
  workspaceId: WorkspaceId;
  workCardId?: string;
  candidateId?: string;
  loopStep: WorkCardLoopAuthorityStep;
  sourceEvidence: string[];
  requiredAction: string;
  blocker?: string;
  formalWorkCardPath?: string;
  implementerReportPath?: string;
  repairId?: string;
  parentWorkCardId?: string;
  candidates: WorkCardMapCandidateProjection[];
  sourceWorkCardPlanPath?: string;
  reason: string;
}

interface ActiveWorkCardAuthorityOptions {
  treatClosePendingAsActive?: boolean;
}

interface WorkCardIntakeTargets {
  handoffMarkdownPath: string;
  formalWorkCardMarkdownPath: string;
}

export function resolveWorkCardLoopAuthority(
  workspaceRoot: string,
  phaseId: string | undefined,
  options: WorkCardMapProjectionOptions = {},
): WorkCardLoopAuthorityProjection {
  if (!phaseId) {
    return {
      status: "not-applicable",
      workspaceId: "phase-work-card-selection",
      loopStep: "Map",
      sourceEvidence: [],
      requiredAction: "Work Card loop authority requires a current phase.",
      blocker: "No phase ID was provided.",
      candidates: [],
      reason: "No phase ID was provided.",
    };
  }

  const phasePlanning = getPhasePlanningCompletion(workspaceRoot, phaseId);
  if (!phasePlanning.complete) {
    return {
      status: "no-plan",
      phaseId,
      workspaceId: "phase-planning-bundle",
      loopStep: "Map",
      sourceEvidence: [],
      requiredAction: "Current Approved Phase Planning and Work Card Plan evidence is required before Work Card Map.",
      blocker: "Phase Planning bundle is not complete.",
      candidates: [],
      reason: "Current Approved Phase Planning and Work Card Plan evidence is required before Work Card Map.",
    };
  }

  let candidates: WorkCardCandidate[];
  let workCardPlan: PlanningDocumentSummary;
  try {
    candidates = readCandidates(workspaceRoot, phaseId);
    workCardPlan = requiredApproved(workspaceRoot, `planning/phases/${phaseId}/Work_Card_Plan`, ".md");
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return {
      status: "no-plan",
      phaseId,
      workspaceId: "phase-work-card-selection",
      loopStep: "Map",
      sourceEvidence: [],
      requiredAction: reason,
      blocker: reason,
      candidates: [],
      reason,
    };
  }

  const documents = listPlanningDocuments(workspaceRoot);
  const activeAuthority = resolveActiveWorkCardAuthorityFromDocuments(
    workspaceRoot,
    documents,
    phaseId,
    { treatClosePendingAsActive: !options.closeReturnCompleted },
  );
  const mapCandidates = buildMapCandidates(workspaceRoot, phaseId, candidates, activeAuthority);

  if (activeAuthority.status === "conflict") {
    return {
      status: "conflict",
      phaseId,
      workspaceId: "phase-work-card-selection",
      loopStep: "Map",
      sourceEvidence: activeAuthority.evidencePaths,
      requiredAction: activeAuthority.reason,
      blocker: activeAuthority.reason,
      candidates: mapCandidates,
      sourceWorkCardPlanPath: workCardPlan.markdownPath,
      reason: activeAuthority.reason,
    };
  }

  const repairAuthority = repairLoopAuthority(workspaceRoot, phaseId, documents);
  if (repairAuthority) {
    return {
      ...repairAuthority,
      candidates: mapCandidates,
      sourceWorkCardPlanPath: workCardPlan.markdownPath,
    };
  }

  if (activeAuthority.status === "active") {
    return activeLoopAuthorityForCandidate(
      workspaceRoot,
      documents,
      activeAuthority,
      mapCandidates,
      workCardPlan.markdownPath,
    );
  }

  const allComplete = mapCandidates.length > 0 &&
    mapCandidates.every((candidate) => candidate.status === "Complete");
  if (allComplete) {
    return {
      status: "all-complete",
      phaseId,
      workspaceId: "phase-work-card-selection",
      loopStep: "Map",
      sourceEvidence: [workCardPlan.markdownPath],
      requiredAction: "All planned Work Cards are complete for this phase; continue to Phase Validation.",
      candidates: mapCandidates,
      sourceWorkCardPlanPath: workCardPlan.markdownPath,
      reason: "All planned Work Card candidates are complete for this phase.",
    };
  }

  return {
    status: "map-ready",
    phaseId,
    workspaceId: "phase-work-card-selection",
    loopStep: "Map",
    sourceEvidence: [workCardPlan.markdownPath],
    requiredAction: "Select an Eligible Work Card candidate from the Work Card Map and begin planning.",
    candidates: mapCandidates,
    sourceWorkCardPlanPath: workCardPlan.markdownPath,
    reason: "Work Card candidates are projected from the current Approved Work Card Plan.",
  };
}

export function getWorkCardMapProjectionFromAuthority(
  workspaceRoot: string,
  phaseId: string,
  options: WorkCardMapProjectionOptions = {},
): WorkCardMapProjection {
  const authority = resolveWorkCardLoopAuthority(workspaceRoot, phaseId, options);
  if (authority.status === "no-plan" || authority.status === "conflict" || authority.status === "not-applicable") {
    return {
      state: "needs-attention",
      phaseId: authority.phaseId,
      sourceWorkCardPlanPath: authority.sourceWorkCardPlanPath,
      candidates: authority.candidates,
      phaseValidationWorkspaceId: "phase-validation",
      reason: authority.reason,
    };
  }
  return {
    state: authority.status === "all-complete" ? "all-complete" : "ready",
    phaseId,
    sourceWorkCardPlanPath: authority.sourceWorkCardPlanPath ?? `planning/phases/${phaseId}/Work_Card_Plan.md`,
    candidates: authority.candidates,
    phaseValidationWorkspaceId: "phase-validation",
    reason: authority.reason,
  };
}

export function selectNextWorkCardCandidateFromAuthority(
  workspaceRoot: string,
  phaseId: string,
): CandidateSelectionResult {
  const completion = getPhasePlanningCompletion(workspaceRoot, phaseId);
  if (!completion.complete) {
    return {
      state: "invalid-plan",
      phaseId,
      reason: "Candidate selection requires a current Approved Phase Planning bundle.",
      explanations: [],
    };
  }

  let candidates: WorkCardCandidate[];
  try {
    candidates = readCandidates(workspaceRoot, phaseId);
  } catch (error) {
    return {
      state: "invalid-plan",
      phaseId,
      reason: error instanceof Error ? error.message : String(error),
      explanations: [],
    };
  }

  const explanations = candidates
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((candidate) => explainCandidate(workspaceRoot, phaseId, candidate, candidates));
  const selected = explanations.find((entry) => entry.state === "eligible");
  if (selected) {
    return {
      state: "selected",
      phaseId,
      selectedCandidate: candidates.find((candidate) => candidate.candidateId === selected.candidateId)!,
      explanations,
    };
  }
  if (explanations.every((entry) => entry.state === "complete")) {
    return { state: "all-complete", phaseId, reason: "All planned candidates are complete.", explanations };
  }
  if (explanations.some((entry) => entry.state === "dependency-blocked")) {
    return {
      state: "dependency-blocked",
      phaseId,
      reason: "No candidate is eligible because one or more planned candidates are waiting on predecessors.",
      explanations,
    };
  }
  return {
    state: "explicitly-resolved",
    phaseId,
    reason: "All remaining candidates are explicitly resolved without intake.",
    explanations,
  };
}

export function resolveActiveWorkCardAuthorityFromLoop(
  workspaceRoot: string,
  phaseId?: string,
  options: ActiveWorkCardAuthorityOptions = {},
): ActiveWorkCardAuthority {
  const documents = listPlanningDocuments(workspaceRoot);
  return resolveActiveWorkCardAuthorityFromDocuments(workspaceRoot, documents, phaseId, options);
}

export function resolveActiveWorkCardPlanningHandoffFromLoop(
  workspaceRoot: string,
  phaseId?: string,
): ActiveWorkCardPlanningHandoff | undefined {
  const authority = resolveActiveWorkCardAuthorityFromLoop(workspaceRoot, phaseId);
  if (authority.status === "conflict") {
    throw new Error(`${authority.reason} Evidence: ${authority.evidencePaths.join("; ")}`);
  }
  if (authority.status === "active") {
    return {
      handoff: authority.handoff,
      phaseId: authority.phaseId,
      workCardId: authority.workCardId,
      formalWorkCardMarkdownPath: authority.formalWorkCardMarkdownPath,
    };
  }
  return undefined;
}

export function workCardIntakeTargets(
  phaseId: string,
  candidate: Pick<WorkCardCandidate, "candidateId" | "title">,
): WorkCardIntakeTargets {
  const slug = slugify(candidate.title);
  return {
    handoffMarkdownPath: `planning/phases/${phaseId}/Architect_Handoffs/WORK_CARD_INTAKE_ARCHITECT_HANDOFF_${candidate.candidateId}.md`,
    formalWorkCardMarkdownPath: `planning/phases/${phaseId}/Work_Cards/${candidate.candidateId}_${slug}.md`,
  };
}

export function readPlannedWorkCardCandidates(workspaceRoot: string, phaseId: string): WorkCardCandidate[] {
  return readCandidates(workspaceRoot, phaseId);
}

function activeLoopAuthorityForCandidate(
  workspaceRoot: string,
  documents: PlanningDocumentSummary[],
  activeAuthority: Extract<ActiveWorkCardAuthority, { status: "active" }>,
  candidates: WorkCardMapCandidateProjection[],
  sourceWorkCardPlanPath: string,
): WorkCardLoopAuthorityProjection {
  const formal = documents.find((document) => document.markdownPath === activeAuthority.formalWorkCardMarkdownPath);
  const baseEvidence = activeAuthority.evidencePaths;
  if (!formal || formal.effectiveDisposition !== "Approved") {
    return {
      status: "active",
      phaseId: activeAuthority.phaseId,
      workspaceId: "work-card-planning",
      workCardId: activeAuthority.workCardId,
      candidateId: activeAuthority.workCardId,
      loopStep: "Planning",
      sourceEvidence: baseEvidence,
      requiredAction: `Prepare or review the Formal Work Card for ${activeAuthority.workCardId}.`,
      formalWorkCardPath: activeAuthority.formalWorkCardMarkdownPath,
      candidates,
      sourceWorkCardPlanPath,
      reason: `${activeAuthority.workCardId} is active and needs a current Approved Formal Work Card.`,
    };
  }

  const projection = getWorkCardBuildingReviewProjection(
    workspaceRoot,
    activeAuthority.phaseId,
    activeAuthority.workCardId,
  );
  if (projection.reportReadiness === "missing") {
    return {
      status: "active",
      phaseId: activeAuthority.phaseId,
      workspaceId: "work-card-building-review",
      workCardId: activeAuthority.workCardId,
      candidateId: activeAuthority.workCardId,
      loopStep: "Build",
      sourceEvidence: [formal.markdownPath, projection.implementerReportPath],
      requiredAction: "Approved Formal Work Card is available; create the application-owned Implementer Report.",
      formalWorkCardPath: formal.markdownPath,
      implementerReportPath: projection.implementerReportPath,
      candidates,
      sourceWorkCardPlanPath,
      reason: `${activeAuthority.workCardId} has an Approved Formal Work Card and needs Build Review.`,
    };
  }

  const report = documents.find((document) => document.markdownPath === projection.implementerReportPath);
  const validation = report
    ? validationRecordForReportRevision(workspaceRoot, documents, activeAuthority.phaseId, activeAuthority.workCardId, report)
    : undefined;
  if (validation?.effectiveDisposition === "RevisionRequested") {
    return {
      status: "active",
      phaseId: activeAuthority.phaseId,
      workspaceId: "work-card-repair",
      workCardId: activeAuthority.workCardId,
      candidateId: activeAuthority.workCardId,
      loopStep: "Repair",
      sourceEvidence: [projection.formalWorkCardPath, projection.implementerReportPath, validation.markdownPath],
      requiredAction: "RevisionRequested Validation Record is available; create or continue the bounded repair Work Card.",
      formalWorkCardPath: projection.formalWorkCardPath,
      implementerReportPath: projection.implementerReportPath,
      parentWorkCardId: activeAuthority.workCardId,
      candidates,
      sourceWorkCardPlanPath,
      reason: `${activeAuthority.workCardId} has RevisionRequested validation evidence and requires repair.`,
    };
  }

  if (validation?.effectiveDisposition === "Approved") {
    const close = getWorkCardCloseProjection(workspaceRoot, activeAuthority.phaseId, activeAuthority.workCardId);
    if (close.returnTarget === "phase-work-card-selection") {
      return {
        status: "active",
        phaseId: activeAuthority.phaseId,
        workspaceId: "work-card-close",
        workCardId: activeAuthority.workCardId,
        candidateId: activeAuthority.workCardId,
        loopStep: "Close",
        sourceEvidence: [projection.implementerReportPath, validation.markdownPath],
        requiredAction: "Approved Validation Record is available; close this Work Card or advance to the next candidate.",
        formalWorkCardPath: projection.formalWorkCardPath,
        implementerReportPath: projection.implementerReportPath,
        candidates,
        sourceWorkCardPlanPath,
        reason: `${activeAuthority.workCardId} has Approved validation evidence and is ready for Close / Next.`,
      };
    }
  }

  if (projection.reportReadiness !== "ready-for-review") {
    return {
      status: "active",
      phaseId: activeAuthority.phaseId,
      workspaceId: "work-card-building-review",
      workCardId: activeAuthority.workCardId,
      candidateId: activeAuthority.workCardId,
      loopStep: "Build",
      sourceEvidence: [projection.formalWorkCardPath, projection.implementerReportPath],
      requiredAction: projection.reportReadiness === "reserved-skeleton"
        ? "Approved Formal Work Card is available; complete the reserved Implementer Report with substantive evidence."
        : projection.reportReadinessReason,
      blocker: projection.reportReadiness === "invalid" || projection.reportReadiness === "conflict"
        ? projection.reportReadinessReason
        : undefined,
      formalWorkCardPath: projection.formalWorkCardPath,
      implementerReportPath: projection.implementerReportPath,
      candidates,
      sourceWorkCardPlanPath,
      reason: projection.reportReadinessReason,
    };
  }

  return {
    status: "active",
    phaseId: activeAuthority.phaseId,
    workspaceId: "work-card-report-review",
    workCardId: activeAuthority.workCardId,
    candidateId: activeAuthority.workCardId,
    loopStep: "ReviewAndValidation",
    sourceEvidence: [projection.formalWorkCardPath, projection.implementerReportPath],
    requiredAction: "Review the current Implementer Report, gather advisory Architect input, and make the Operator validation decision.",
    formalWorkCardPath: projection.formalWorkCardPath,
    implementerReportPath: projection.implementerReportPath,
    candidates,
    sourceWorkCardPlanPath,
    reason: `${activeAuthority.workCardId} has a current Implementer Report awaiting Review & Validation.`,
  };
}

function repairLoopAuthority(
  workspaceRoot: string,
  phaseId: string,
  documents: PlanningDocumentSummary[],
): Omit<WorkCardLoopAuthorityProjection, "candidates" | "sourceWorkCardPlanPath"> | null {
  const resolved = resolveExactActiveRepairWorkCardContext(workspaceRoot);
  if (resolved.status === "not-ready") {
    const approved = resolveApprovedRepairImplementationContext(workspaceRoot);
    if (approved.status === "not-ready") {
      return null;
    }
    if (approved.status === "needs-attention") {
      return {
        status: "conflict",
        phaseId,
        workspaceId: "work-card-repair",
        loopStep: "Repair",
        sourceEvidence: approved.evidencePaths,
        requiredAction: approved.reason,
        blocker: approved.reason,
        reason: approved.reason,
      };
    }
    const context = approved.context;
    if (!context || context.phaseId !== phaseId) {
      return null;
    }
    return approvedRepairImplementationAuthority(workspaceRoot, phaseId, context, approved.evidencePaths);
  }
  if (resolved.status === "needs-attention") {
    return {
      status: "conflict",
      phaseId,
      workspaceId: "work-card-repair",
      loopStep: "Repair",
      sourceEvidence: resolved.evidencePaths,
      requiredAction: resolved.reason,
      blocker: resolved.reason,
      reason: resolved.reason,
    };
  }
  const context = resolved.context;
  if (!context) {
    return null;
  }
  if (context.phaseId !== phaseId) {
    return null;
  }
  const repair = documents.find((document) => document.markdownPath === context.targetPath);
  if (repair?.effectiveDisposition === "Approved") {
    return approvedRepairImplementationAuthority(workspaceRoot, phaseId, context, resolved.evidencePaths);
  }
  return {
    status: "active",
    phaseId,
    workspaceId: "work-card-repair",
    workCardId: context.parentWorkCardId,
    candidateId: context.parentWorkCardId,
    repairId: context.repairId,
    parentWorkCardId: context.parentWorkCardId,
    loopStep: "Repair",
    sourceEvidence: resolved.evidencePaths.length > 0
      ? resolved.evidencePaths
      : [context.handoff.markdownPath, context.targetPath],
    requiredAction: "Prepare or review the active Repair Work Card for the current Work Card.",
    formalWorkCardPath: context.targetPath,
    reason: `${context.repairId} is the active repair for ${context.parentWorkCardId}.`,
  };
}

function approvedRepairImplementationAuthority(
  workspaceRoot: string,
  phaseId: string,
  context: {
    phaseId: string;
    repairId: string;
    parentWorkCardId: string;
    targetPath: string;
  },
  evidencePaths: string[],
): Omit<WorkCardLoopAuthorityProjection, "candidates" | "sourceWorkCardPlanPath"> {
  const projection = getWorkCardBuildingReviewProjection(workspaceRoot, phaseId, context.repairId);
  const sourceEvidence = [context.targetPath, projection.implementerReportPath, ...evidencePaths]
    .filter((value, index, values) => values.indexOf(value) === index);
  if (projection.reportReadiness === "ready-for-review") {
    return {
      status: "active",
      phaseId,
      workspaceId: "work-card-report-review",
      workCardId: context.repairId,
      candidateId: context.parentWorkCardId,
      repairId: context.repairId,
      parentWorkCardId: context.parentWorkCardId,
      loopStep: "ReviewAndValidation",
      sourceEvidence,
      requiredAction: "Review the current repair Implementer Report, gather advisory Architect input, and make the Operator validation decision.",
      formalWorkCardPath: context.targetPath,
      implementerReportPath: projection.implementerReportPath,
      reason: `${context.repairId} has a current repair Implementer Report awaiting Review & Validation.`,
    };
  }
  return {
    status: "active",
    phaseId,
    workspaceId: "work-card-building-review",
    workCardId: context.repairId,
    candidateId: context.parentWorkCardId,
    repairId: context.repairId,
    parentWorkCardId: context.parentWorkCardId,
    loopStep: "Build",
    sourceEvidence,
    requiredAction: repairImplementationRequiredAction(projection.reportReadiness, projection.reportReadinessReason),
    blocker: projection.reportReadiness === "invalid" || projection.reportReadiness === "conflict"
      ? projection.reportReadinessReason
      : undefined,
    formalWorkCardPath: context.targetPath,
    implementerReportPath: projection.implementerReportPath,
    reason: `${context.repairId} is approved and ready for repair implementation.`,
  };
}

function repairImplementationRequiredAction(
  reportReadiness: "missing" | "reserved-skeleton" | "ready-for-review" | "invalid" | "conflict",
  reportReadinessReason: string,
): string {
  switch (reportReadiness) {
    case "missing":
      return "Approved Repair Work Card is available; create the application-owned repair Implementer Report.";
    case "reserved-skeleton":
      return "Approved Repair Work Card is available; complete the reserved repair Implementer Report with substantive evidence.";
    default:
      return reportReadinessReason;
  }
}

function buildMapCandidates(
  workspaceRoot: string,
  phaseId: string,
  candidates: WorkCardCandidate[],
  activeAuthority: ActiveWorkCardAuthority,
): WorkCardMapCandidateProjection[] {
  return candidates
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((candidate): WorkCardMapCandidateProjection => {
      const explained = explainCandidate(workspaceRoot, phaseId, candidate, candidates);
      const targets = workCardIntakeTargets(phaseId, candidate);
      const isActive = activeAuthority.status === "active" && activeAuthority.workCardId === candidate.candidateId;
      return {
        candidateId: candidate.candidateId,
        order: candidate.order,
        title: candidate.title,
        purpose: candidate.purpose,
        dependsOn: candidate.dependsOn,
        status: mapStatus(explained, activeAuthority, candidate.candidateId),
        reason: mapReason(explained, activeAuthority, candidate.candidateId),
        evidencePaths: candidateMapEvidencePaths(explained, activeAuthority, candidate.candidateId),
        handoffMarkdownPath: targets.handoffMarkdownPath,
        formalWorkCardMarkdownPath: targets.formalWorkCardMarkdownPath,
        isActive,
        formalWorkCardDocument: formalWorkCardDocumentForTarget(workspaceRoot, targets.formalWorkCardMarkdownPath),
      };
    });
}

function resolveActiveWorkCardAuthorityFromDocuments(
  workspaceRoot: string,
  documents: PlanningDocumentSummary[],
  phaseId?: string,
  options: ActiveWorkCardAuthorityOptions = {},
): ActiveWorkCardAuthority {
  const treatClosePendingAsActive = options.treatClosePendingAsActive !== false;
  const handoffs = documents
    .filter((document) => document.metadata.artifactType === "work-card-intake-handoff")
    .filter((document) => document.effectiveDisposition === "Approved")
    .filter((document) => {
      if (!phaseId) return true;
      return document.metadata.phaseId === phaseId ||
        document.metadata.canonical?.identity.phaseId === phaseId;
    })
    .filter((document) => evaluateDocumentFreshness(workspaceRoot, document.logicalDocumentId).state === "fresh")
    .map((handoff) => activePlanningHandoffFromDocument(handoff))
    .filter((handoff): handoff is ActiveWorkCardPlanningHandoff => Boolean(handoff))
    .filter((handoff) => plannedCandidateExists(workspaceRoot, handoff.phaseId, handoff.workCardId))
    .filter((handoff) => {
      const completionEvidence = candidateCompletionEvidence(workspaceRoot, handoff.phaseId, handoff.workCardId);
      if (completionEvidence.length === 0) {
        return true;
      }
      const closePendingEvidencePaths = closePendingActiveEvidence(
        workspaceRoot,
        documents,
        handoff.phaseId,
        handoff.workCardId,
      );
      if (treatClosePendingAsActive && closePendingEvidencePaths.length > 0) {
        handoff.closePendingEvidencePaths = closePendingEvidencePaths;
        return true;
      }
      return false;
    });

  const byWorkCard = new Map<string, ActiveWorkCardPlanningHandoff[]>();
  for (const handoff of handoffs) {
    const key = `${handoff.phaseId}:${handoff.workCardId}`;
    byWorkCard.set(key, [...(byWorkCard.get(key) ?? []), handoff]);
  }
  let activeCandidates = [...byWorkCard.values()].map((entries) => entries.at(-1)!);
  const incompleteActiveCandidates = activeCandidates
    .filter((entry) => !(entry.closePendingEvidencePaths?.length));
  if (incompleteActiveCandidates.length > 0) {
    activeCandidates = incompleteActiveCandidates;
  }
  if (activeCandidates.length > 1) {
    const ids = activeCandidates.map((entry) => entry.workCardId);
    return {
      status: "conflict",
      phaseId,
      activeWorkCardIds: ids,
      reason: `Multiple active incomplete Work Cards exist in this phase: ${ids.join(", ")}.`,
      evidencePaths: activeCandidates.flatMap(activeAuthorityEvidencePaths),
    };
  }
  const active = activeCandidates[0];
  if (!active) {
    return {
      status: "none",
      phaseId,
      reason: "No active incomplete Work Card exists for this phase.",
      evidencePaths: [],
    };
  }
  return {
    status: "active",
    phaseId: active.phaseId,
    workCardId: active.workCardId,
    handoff: active.handoff,
    formalWorkCardMarkdownPath: active.formalWorkCardMarkdownPath,
    reason: `${active.workCardId} is the active Work Card for this phase.`,
    evidencePaths: activeAuthorityEvidencePaths(active),
  };
}

function activePlanningHandoffFromDocument(
  handoff: PlanningDocumentSummary,
): ActiveWorkCardPlanningHandoff | undefined {
  const phaseId = handoff.metadata.phaseId ??
    (typeof handoff.metadata.canonical?.identity.phaseId === "string"
      ? handoff.metadata.canonical.identity.phaseId
      : undefined);
  const workCardId = handoff.metadata.workCardId ??
    (typeof handoff.metadata.canonical?.identity.workCardId === "string"
      ? handoff.metadata.canonical.identity.workCardId
      : undefined);
  const formalWorkCardMarkdownPath = stringValue(handoff.metadata.canonical?.workflowData.formalWorkCardTarget);
  if (!phaseId || !workCardId || !formalWorkCardMarkdownPath) {
    return undefined;
  }
  return {
    handoff,
    phaseId,
    workCardId,
    formalWorkCardMarkdownPath,
  };
}

function explainCandidate(
  workspaceRoot: string,
  phaseId: string,
  candidate: WorkCardCandidate,
  candidates: WorkCardCandidate[],
): CandidateSelectionExplanation {
  if (candidate.resolutionStatus === "deferred") {
    return explanation(candidate, "deferred", `Candidate is deferred: ${candidate.resolutionReason}`);
  }
  if (candidate.resolutionStatus === "superseded") {
    return explanation(candidate, "superseded", `Candidate is superseded: ${candidate.resolutionReason}`);
  }
  if (candidate.resolutionStatus === "alreadySatisfied") {
    return explanation(candidate, "already-satisfied", `Candidate is already satisfied: ${candidate.resolutionReason}`);
  }
  if (candidate.resolutionStatus === "carriedForward") {
    return explanation(candidate, "carried-forward", `Candidate is carried forward: ${candidate.resolutionReason}`);
  }
  const completionEvidence = candidateCompletionEvidence(workspaceRoot, phaseId, candidate.candidateId);
  if (completionEvidence.length > 0) {
    return explanation(candidate, "complete", "Candidate is complete because current Approved validation evidence exists.", completionEvidence);
  }
  const blocked = candidate.dependsOn.filter((dependencyId) =>
    !dependencySatisfied(workspaceRoot, phaseId, dependencyId, candidates),
  );
  if (blocked.length > 0) {
    return explanation(candidate, "dependency-blocked", `Candidate is blocked by incomplete predecessors: ${blocked.join(", ")}.`);
  }
  return explanation(candidate, "eligible", "Candidate is planned, incomplete, and all predecessors permit continuation.");
}

function dependencySatisfied(
  workspaceRoot: string,
  phaseId: string,
  dependencyId: string,
  candidates: WorkCardCandidate[],
): boolean {
  const dependency = candidates.find((candidate) => candidate.candidateId === dependencyId);
  if (!dependency) {
    return false;
  }
  if (dependency.resolutionStatus !== "planned") {
    return true;
  }
  return candidateCompletionEvidence(workspaceRoot, phaseId, dependencyId).length > 0;
}

function candidateCompletionEvidence(
  workspaceRoot: string,
  phaseId: string,
  candidateId: string,
): string[] {
  return listPlanningDocuments(workspaceRoot)
    .filter((document) => document.effectiveDisposition === "Approved")
    .filter((document) => document.metadata.phaseId === phaseId)
    .filter((document) => document.metadata.candidateId === candidateId || document.metadata.workCardId === candidateId)
    .filter((document) => {
      const value = [document.markdownPath, document.displayFilename]
        .filter(Boolean)
        .join("/")
        .toLowerCase();
      return value.includes("validation") || value.includes("operator_validation");
    })
    .map((document) => document.markdownPath);
}

function closePendingActiveEvidence(
  workspaceRoot: string,
  documents: PlanningDocumentSummary[],
  phaseId: string,
  candidateId: string,
): string[] {
  const report = documents
    .filter((document) => document.metadata.artifactType === "implementer-report")
    .filter((document) => document.effectiveDisposition === "Pending")
    .filter((document) => document.metadata.phaseId === phaseId || document.metadata.canonical?.identity.phaseId === phaseId)
    .filter((document) => document.metadata.workCardId === candidateId || document.metadata.canonical?.identity.workCardId === candidateId)
    .filter((document) => document.documentReadState === "readable" && !document.readError)
    .filter((document) => evaluateDocumentFreshness(workspaceRoot, document.logicalDocumentId).state === "fresh")
    .at(-1);
  if (!report) {
    return [];
  }
  const validation = validationRecordForReportRevision(workspaceRoot, documents, phaseId, candidateId, report);
  return validation?.effectiveDisposition === "Approved" &&
    evaluateDocumentFreshness(workspaceRoot, validation.logicalDocumentId).state === "fresh"
    ? [report.markdownPath, validation.markdownPath]
    : [];
}

function validationRecordForReportRevision(
  workspaceRoot: string,
  documents: PlanningDocumentSummary[],
  phaseId: string,
  workCardId: string,
  report: PlanningDocumentSummary,
): PlanningDocumentSummary | undefined {
  const reportRevision = report.metadata.artifactRevision ?? 1;
  return documents
    .filter((document) => document.metadata.artifactType === "validation-record")
    .filter((document) => document.metadata.phaseId === phaseId || document.metadata.canonical?.identity.phaseId === phaseId)
    .filter((document) => document.metadata.workCardId === workCardId || document.metadata.canonical?.identity.workCardId === workCardId)
    .filter((document) => document.documentReadState === "readable" && !document.readError)
    .filter((document) => (document.metadata.sourceRevisions ?? []).some((source) =>
      source.path === report.markdownPath && source.revision === reportRevision
    ))
    .filter((document) => evaluateDocumentFreshness(workspaceRoot, document.logicalDocumentId).state === "fresh")
    .at(-1);
}

function explanation(
  candidate: WorkCardCandidate,
  state: CandidateSelectionState,
  reason: string,
  extraEvidencePaths: string[] = [],
): CandidateSelectionExplanation {
  return {
    candidateId: candidate.candidateId,
    state,
    reason,
    evidencePaths: [...candidate.evidencePaths, ...extraEvidencePaths],
  };
}

function mapStatus(
  explained: CandidateSelectionExplanation,
  activeAuthority: ActiveWorkCardAuthority,
  candidateId: string,
): WorkCardMapCandidateProjection["status"] {
  if (activeAuthority.status === "active" && activeAuthority.workCardId === candidateId) {
    return "Eligible";
  }
  if (explained.state === "complete") {
    return "Complete";
  }
  if (activeAuthority.status === "active") {
    return activeAuthority.workCardId === candidateId ? "Eligible" : "Ineligible";
  }
  if (activeAuthority.status === "conflict") {
    return "Ineligible";
  }
  return explained.state === "eligible" ? "Eligible" : "Ineligible";
}

function mapReason(
  explained: CandidateSelectionExplanation,
  activeAuthority: ActiveWorkCardAuthority,
  candidateId: string,
): string {
  if (activeAuthority.status === "active" && activeAuthority.workCardId === candidateId) {
    return `Continue ${candidateId}; it is the active Work Card for this phase.`;
  }
  if (explained.state === "complete" || explained.state === "eligible") {
    if (activeAuthority.status === "active" && activeAuthority.workCardId !== candidateId && explained.state !== "complete") {
      return `Cannot begin planning while ${activeAuthority.workCardId} is the active Work Card.`;
    }
    if (activeAuthority.status === "conflict" && explained.state !== "complete") {
      return activeAuthority.reason;
    }
    return explained.reason;
  }
  if (activeAuthority.status === "active" && activeAuthority.workCardId !== candidateId) {
    return `Cannot begin planning while ${activeAuthority.workCardId} is the active Work Card.`;
  }
  if (activeAuthority.status === "conflict") {
    return activeAuthority.reason;
  }
  return explained.reason;
}

function candidateMapEvidencePaths(
  explained: CandidateSelectionExplanation,
  activeAuthority: ActiveWorkCardAuthority,
  candidateId: string,
): string[] {
  if (activeAuthority.status === "active" && activeAuthority.workCardId === candidateId) {
    return [...explained.evidencePaths, ...activeAuthority.evidencePaths]
      .filter((value, index, values) => values.indexOf(value) === index);
  }
  if (
    (activeAuthority.status === "active" && activeAuthority.workCardId !== candidateId && explained.state !== "complete") ||
    (activeAuthority.status === "conflict" && explained.state !== "complete")
  ) {
    return [...explained.evidencePaths, ...activeAuthority.evidencePaths];
  }
  return explained.evidencePaths;
}

function activeAuthorityEvidencePaths(handoff: ActiveWorkCardPlanningHandoff): string[] {
  const paths = [
    handoff.handoff.markdownPath,
    handoff.formalWorkCardMarkdownPath,
    ...(handoff.closePendingEvidencePaths ?? []),
  ];
  return paths.filter((value, index, values) => values.indexOf(value) === index);
}

function plannedCandidateExists(workspaceRoot: string, phaseId: string, workCardId: string): boolean {
  try {
    return readCandidates(workspaceRoot, phaseId)
      .some((candidate) => candidate.candidateId === workCardId);
  } catch {
    return false;
  }
}

function formalWorkCardDocumentForTarget(
  workspaceRoot: string,
  formalWorkCardMarkdownPath: string,
): WorkCardMapCandidateProjection["formalWorkCardDocument"] {
  const document = listPlanningDocuments(workspaceRoot)
    .find((candidate) => candidate.markdownPath === formalWorkCardMarkdownPath);
  if (!document) {
    return undefined;
  }
  if (document.documentReadState !== "readable" || document.readError) {
    const result: NonNullable<WorkCardMapCandidateProjection["formalWorkCardDocument"]> = {
      displayFilename: document.displayFilename ?? path.basename(formalWorkCardMarkdownPath, ".md"),
      disposition: document.effectiveDisposition,
      documentReadState: document.documentReadState ?? "read-error",
    };
    if (document.readError) {
      result.readError = document.readError;
    }
    return result;
  }
  try {
    const parsed = parseCanonicalMarkdownDocument(
      fs.readFileSync(path.join(workspaceRoot, document.markdownPath), "utf8"),
    );
    return {
      displayFilename: document.displayFilename ?? path.basename(formalWorkCardMarkdownPath, ".md"),
      disposition: document.effectiveDisposition,
      documentReadState: document.documentReadState ?? "readable",
      bodyMarkdown: parsed.bodyMarkdown,
    };
  } catch (error) {
    return {
      displayFilename: document.displayFilename ?? path.basename(formalWorkCardMarkdownPath, ".md"),
      disposition: document.effectiveDisposition,
      documentReadState: "read-error",
      readError: error instanceof Error ? error.message : String(error),
    };
  }
}

function readCandidates(workspaceRoot: string, phaseId: string): WorkCardCandidate[] {
  const workCardPlan = requiredApproved(workspaceRoot, `planning/phases/${phaseId}/Work_Card_Plan`, ".md");
  const parsed = readWorkflowData(workspaceRoot, workCardPlan.markdownPath);
  return validateCandidates(parsed.candidates);
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

function readWorkflowData(workspaceRoot: string, relativePath: string): Record<string, unknown> {
  const parsed = parseCanonicalMarkdownDocument(fs.readFileSync(path.join(workspaceRoot, relativePath), "utf8"));
  return parsed.metadata.workflowData;
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "work_card";
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}
