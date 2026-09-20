import fs from "node:fs";
import { workItemIntakeTargets, type WorkItemArtifactScope } from "./workItemArtifactScope";
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
  readPlanningDocumentFromContext,
} from "../documents/planningDocumentService";
import {
  resolvePlanningProjectionContext,
  type PlanningProjectionContext,
} from "../documents/planningProjectionContext";
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
  resolveTerminalApprovedRepairImplementationContext,
} from "../workCardRepair/workCardRepairService";
import {
  resolveEffectiveWorkCardCompletion,
  type EffectiveWorkCardCompletion,
} from "./effectiveWorkCardCompletion";
import { resolveWorkCardCloseReturnConsumption } from "./workCardCloseReturnLifecycle";
import { developmentLifecycleStage, projectDevelopmentWorkItems } from "../planExecution/developmentExecutionAdapter";
import type { PlanExecutionProjection } from "../../shared/planExecutionContracts";

export type WorkCardLoopStateStatus =
  | "no-plan"
  | "map-ready"
  | "active"
  | "all-complete"
  | "conflict"
  | "not-applicable";

export type WorkCardLoopStateStep =
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

export type ActiveWorkCardState =
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

export type LatestCompletedWorkCardCloseState =
  | {
      status: "none";
      phaseId: string;
      reason: string;
      evidencePaths: string[];
    }
  | {
      status: "conflict";
      phaseId: string;
      reason: string;
      evidencePaths: string[];
    }
  | {
      status: "ready";
      phaseId: string;
      parentWorkCardId: string;
      handoff: ActiveWorkCardPlanningHandoff;
      completion: EffectiveWorkCardCompletion & { validationRecord: PlanningDocumentSummary };
      consumed: boolean;
      closeReturnRecordPath: string;
      reason: string;
      evidencePaths: string[];
    };

export interface WorkCardLoopStateProjection {
  execution?: PlanExecutionProjection;
  status: WorkCardLoopStateStatus;
  phaseId?: string;
  workspaceId: WorkspaceId;
  workCardId?: string;
  candidateId?: string;
  loopStep: WorkCardLoopStateStep;
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

interface WorkCardIntakeTargets {
  handoffMarkdownPath: string;
  formalWorkCardMarkdownPath: string;
}

export function resolveWorkCardLoopState(
  workspaceRoot: string,
  phaseId: string | undefined,
  _options: WorkCardMapProjectionOptions = {},
  planningContext?: PlanningProjectionContext,
): WorkCardLoopStateProjection {
  if (!phaseId) {
    return {
      status: "not-applicable",
      workspaceId: "phase-work-card-selection",
      loopStep: "Map",
      sourceEvidence: [],
      requiredAction: "Work Card loop state requires a current phase.",
      blocker: "No phase ID was provided.",
      candidates: [],
      reason: "No phase ID was provided.",
    };
  }

  planningContext = resolvePlanningProjectionContext(workspaceRoot, planningContext);

  const phasePlanning = getPhasePlanningCompletion(workspaceRoot, phaseId, planningContext);
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
    candidates = readCandidates(workspaceRoot, phaseId, planningContext);
    workCardPlan = requiredApproved(workspaceRoot, `planning/phases/${phaseId}/Work_Card_Plan`, ".md", planningContext);
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

  const documents = listPlanningDocuments(planningContext ?? workspaceRoot);
  const activeState = resolveActiveWorkCardStateFromDocuments(
    workspaceRoot,
    documents,
    phaseId,
    planningContext,
  );
  const execution = projectDevelopmentWorkItems(workspaceRoot, phaseId, candidates, planningContext, activeState);
  const mapCandidates = buildMapCandidates(workspaceRoot, phaseId, candidates, activeState, planningContext, execution);

  if (activeState.status === "conflict") {
    return {
      status: "conflict",
      phaseId,
      workspaceId: "phase-work-card-selection",
      loopStep: "Map",
      sourceEvidence: activeState.evidencePaths,
      requiredAction: activeState.reason,
      blocker: activeState.reason,
      candidates: mapCandidates,
      sourceWorkCardPlanPath: workCardPlan.markdownPath,
      reason: activeState.reason,
    };
  }

  const latestCompleted = activeState.status === "none"
    ? resolveLatestCompletedWorkCardCloseStateFromHandoffs(
        workspaceRoot,
        phaseId,
        collectActivePlanningHandoffs(workspaceRoot, documents, phaseId, planningContext),
        planningContext,
      )
    : undefined;
  const repairState = latestCompleted?.status === "ready" && latestCompleted.consumed
    ? null
    : repairLoopState(
        workspaceRoot,
        phaseId,
        documents,
        activeState.status === "active" ? activeState.workCardId : undefined,
        planningContext,
      );
  if (repairState) {
    return {
      ...repairState,
      execution,
      candidates: mapCandidates,
      sourceWorkCardPlanPath: workCardPlan.markdownPath,
    };
  }

  if (activeState.status === "active") {
    return { ...activeLoopStateForCandidate(
      workspaceRoot,
      documents,
      activeState,
      mapCandidates,
      workCardPlan.markdownPath,
      planningContext,
    ), execution };
  }

  const allComplete = execution?.workItemsComplete && mapCandidates.length > 0 &&
    mapCandidates.every((candidate) => candidate.status === "Complete");
  if (allComplete) {
    return {
      status: "all-complete",
      execution,
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
    execution,
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

export function getWorkCardMapProjectionFromState(
  workspaceRoot: string,
  phaseId: string,
  options: WorkCardMapProjectionOptions = {},
  planningContext?: PlanningProjectionContext,
): WorkCardMapProjection {
  const loopState = resolveWorkCardLoopState(workspaceRoot, phaseId, options, planningContext);
  if (loopState.status === "no-plan" || loopState.status === "conflict" || loopState.status === "not-applicable") {
    return {
      state: "needs-attention",
      phaseId: loopState.phaseId,
      sourceWorkCardPlanPath: loopState.sourceWorkCardPlanPath,
      candidates: loopState.candidates,
      phaseValidationWorkspaceId: "phase-validation",
      reason: loopState.reason,
    };
  }
  return {
    state: loopState.status === "all-complete" ? "all-complete" : "ready",
    phaseId,
    sourceWorkCardPlanPath: loopState.sourceWorkCardPlanPath ?? `planning/phases/${phaseId}/Work_Card_Plan.md`,
    candidates: loopState.candidates,
    phaseValidationWorkspaceId: "phase-validation",
    reason: loopState.reason,
  };
}

export function selectNextWorkCardCandidateFromState(
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

  const execution = projectDevelopmentWorkItems(workspaceRoot, phaseId, candidates, undefined, resolveActiveWorkCardStateFromLoop(workspaceRoot, phaseId));
  const explanations = candidates
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((candidate) => explainCandidate(candidate, execution));
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

export function resolveActiveWorkCardStateFromLoop(
  workspaceRoot: string,
  phaseId?: string,
  planningContext?: PlanningProjectionContext,
): ActiveWorkCardState {
  planningContext = resolvePlanningProjectionContext(workspaceRoot, planningContext);
  const documents = listPlanningDocuments(planningContext ?? workspaceRoot);
  return resolveActiveWorkCardStateFromDocuments(workspaceRoot, documents, phaseId, planningContext);
}

export function resolveActiveWorkCardPlanningHandoffFromLoop(
  workspaceRoot: string,
  phaseId?: string,
  planningContext?: PlanningProjectionContext,
): ActiveWorkCardPlanningHandoff | undefined {
  const loopState = resolveActiveWorkCardStateFromLoop(workspaceRoot, phaseId, planningContext);
  if (loopState.status === "conflict") {
    throw new Error(`${loopState.reason} Evidence: ${loopState.evidencePaths.join("; ")}`);
  }
  if (loopState.status === "active") {
    return {
      handoff: loopState.handoff,
      phaseId: loopState.phaseId,
      workCardId: loopState.workCardId,
      formalWorkCardMarkdownPath: loopState.formalWorkCardMarkdownPath,
    };
  }
  return undefined;
}

export function workCardIntakeTargets(
  scope: WorkItemArtifactScope,
  candidate: Pick<WorkCardCandidate, "candidateId" | "title">,
): WorkCardIntakeTargets {
  return workItemIntakeTargets(scope, candidate);
}

export function readPlannedWorkCardCandidates(workspaceRoot: string, phaseId: string): WorkCardCandidate[] {
  return readCandidates(workspaceRoot, phaseId);
}

function activeLoopStateForCandidate(
  workspaceRoot: string,
  documents: PlanningDocumentSummary[],
  activeState: Extract<ActiveWorkCardState, { status: "active" }>,
  candidates: WorkCardMapCandidateProjection[],
  sourceWorkCardPlanPath: string,
  planningContext?: PlanningProjectionContext,
): WorkCardLoopStateProjection {
  const formal = documents.find((document) => document.markdownPath === activeState.formalWorkCardMarkdownPath);
  const baseEvidence = activeState.evidencePaths;
  if (!formal || formal.effectiveDisposition !== "Approved") {
    return {
      status: "active",
      phaseId: activeState.phaseId,
      workspaceId: "work-card-planning",
      workCardId: activeState.workCardId,
      candidateId: activeState.workCardId,
      loopStep: "Planning",
      sourceEvidence: baseEvidence,
      requiredAction: `Prepare or review the Formal Work Card for ${activeState.workCardId}.`,
      formalWorkCardPath: activeState.formalWorkCardMarkdownPath,
      candidates,
      sourceWorkCardPlanPath,
      reason: `${activeState.workCardId} is active and needs a current Approved Formal Work Card.`,
    };
  }

  const projection = getWorkCardBuildingReviewProjection(
    workspaceRoot,
    activeState.phaseId,
    activeState.workCardId,
    planningContext,
  );
  if (projection.reportReadiness === "missing") {
    return {
      status: "active",
      phaseId: activeState.phaseId,
      workspaceId: "work-card-building-review",
      workCardId: activeState.workCardId,
      candidateId: activeState.workCardId,
      loopStep: "Build",
      sourceEvidence: [formal.markdownPath, projection.implementerReportPath],
      requiredAction: "Approved Formal Work Card is available; create the application-owned Implementer Report.",
      formalWorkCardPath: formal.markdownPath,
      implementerReportPath: projection.implementerReportPath,
      candidates,
      sourceWorkCardPlanPath,
      reason: `${activeState.workCardId} has an Approved Formal Work Card and needs Build Review.`,
    };
  }

  const completion = resolveEffectiveWorkCardCompletion(
    workspaceRoot,
    activeState.phaseId,
    activeState.workCardId,
    planningContext,
  );
  const stage = developmentLifecycleStage({ formalApproved: true, reportReady: projection.reportReadiness === "ready-for-review", validation: completion.state });
  if (stage === "repair") {
    return {
      status: "active",
      phaseId: activeState.phaseId,
      workspaceId: "work-card-repair",
      workCardId: activeState.workCardId,
      candidateId: activeState.workCardId,
      repairId: completion.repairId,
      loopStep: "Repair",
      sourceEvidence: completion.sourceEvidence,
      requiredAction: "RevisionRequested Validation Record is available; create or continue the bounded repair Work Card.",
      formalWorkCardPath: completion.formalWorkCard?.markdownPath ?? projection.formalWorkCardPath,
      implementerReportPath: completion.implementerReport?.markdownPath ?? projection.implementerReportPath,
      parentWorkCardId: activeState.workCardId,
      candidates,
      sourceWorkCardPlanPath,
      reason: `${activeState.workCardId} has RevisionRequested validation evidence and requires repair.`,
    };
  }

  if (stage === "close") {
    const close = getWorkCardCloseProjection(workspaceRoot, activeState.phaseId, activeState.workCardId, planningContext);
    if (close.returnTarget === "phase-work-card-selection") {
      return {
        status: "active",
        phaseId: activeState.phaseId,
        workspaceId: "work-card-close",
        workCardId: activeState.workCardId,
        candidateId: activeState.workCardId,
        repairId: completion.repairId,
        parentWorkCardId: completion.repairId ? activeState.workCardId : undefined,
        loopStep: "Close",
        sourceEvidence: completion.sourceEvidence,
        requiredAction: "Approved Validation Record is available; close this Work Card or advance to the next candidate.",
        formalWorkCardPath: completion.formalWorkCard?.markdownPath ?? projection.formalWorkCardPath,
        implementerReportPath: completion.implementerReport?.markdownPath ?? projection.implementerReportPath,
        candidates,
        sourceWorkCardPlanPath,
        reason: `${activeState.workCardId} has Approved validation evidence and is ready for Close / Next.`,
      };
    }
  }

  if (projection.reportReadiness !== "ready-for-review") {
    return {
      status: "active",
      phaseId: activeState.phaseId,
      workspaceId: "work-card-building-review",
      workCardId: activeState.workCardId,
      candidateId: activeState.workCardId,
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
    phaseId: activeState.phaseId,
    workspaceId: "work-card-report-review",
    workCardId: activeState.workCardId,
    candidateId: activeState.workCardId,
    loopStep: "ReviewAndValidation",
    sourceEvidence: [projection.formalWorkCardPath, projection.implementerReportPath],
    requiredAction: "Review the current Implementer Report, gather advisory Architect input, and make the Operator validation decision.",
    formalWorkCardPath: projection.formalWorkCardPath,
    implementerReportPath: projection.implementerReportPath,
    candidates,
    sourceWorkCardPlanPath,
    reason: `${activeState.workCardId} has a current Implementer Report awaiting Review & Validation.`,
  };
}

function repairLoopState(
  workspaceRoot: string,
  phaseId: string,
  documents: PlanningDocumentSummary[],
  activeParentWorkCardId?: string,
  planningContext?: PlanningProjectionContext,
): Omit<WorkCardLoopStateProjection, "candidates" | "sourceWorkCardPlanPath"> | null {
  if (activeParentWorkCardId) {
    const terminal = resolveTerminalApprovedRepairImplementationContext(
      workspaceRoot,
      phaseId,
      activeParentWorkCardId,
      planningContext,
    );
    if (terminal.status === "needs-attention") {
      return {
        status: "conflict",
        phaseId,
        workspaceId: "work-card-repair",
        loopStep: "Repair",
        sourceEvidence: terminal.evidencePaths,
        requiredAction: terminal.reason,
        blocker: terminal.reason,
        reason: terminal.reason,
      };
    }
    if (terminal.status === "ready") {
      return approvedRepairImplementationState(
        workspaceRoot,
        phaseId,
        terminal.context,
        terminal.evidencePaths,
        planningContext,
      );
    }
  }
  const resolved = resolveExactActiveRepairWorkCardContext(workspaceRoot, planningContext);
  if (resolved.status === "not-ready") {
    const approved = resolveApprovedRepairImplementationContext(workspaceRoot, planningContext);
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
    if (activeParentWorkCardId && context.parentWorkCardId !== activeParentWorkCardId) {
      return null;
    }
    return approvedRepairImplementationState(
      workspaceRoot,
      phaseId,
      context,
      approved.evidencePaths,
      planningContext,
    );
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
  if (activeParentWorkCardId && context.parentWorkCardId !== activeParentWorkCardId) {
    return null;
  }
  const repair = documents.find((document) => document.markdownPath === context.targetPath);
  if (repair?.effectiveDisposition === "Approved") {
    return approvedRepairImplementationState(
      workspaceRoot,
      phaseId,
      context,
      resolved.evidencePaths,
      planningContext,
    );
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

function approvedRepairImplementationState(
  workspaceRoot: string,
  phaseId: string,
  context: {
    phaseId: string;
    repairId: string;
    parentWorkCardId: string;
    targetPath: string;
  },
  evidencePaths: string[],
  planningContext?: PlanningProjectionContext,
): Omit<WorkCardLoopStateProjection, "candidates" | "sourceWorkCardPlanPath"> | null {
  const completion = resolveEffectiveWorkCardCompletion(workspaceRoot, phaseId, context.parentWorkCardId, planningContext);
  const repairContext = completion.executionKind === "repair" && completion.repairId && completion.formalWorkCard
    ? {
        ...context,
        repairId: completion.repairId,
        targetPath: completion.formalWorkCard.markdownPath,
      }
    : context;
  const projection = getWorkCardBuildingReviewProjection(workspaceRoot, phaseId, repairContext.repairId, planningContext);
  const sourceEvidence = [
    repairContext.targetPath,
    projection.implementerReportPath,
    ...(completion.executionKind === "repair" ? completion.sourceEvidence : evidencePaths),
  ]
    .filter((value, index, values) => values.indexOf(value) === index);
  if (projection.reportReadiness === "ready-for-review") {
    if (completion.repairId === repairContext.repairId && completion.state === "revision-requested") {
      return {
        status: "active",
        phaseId,
        workspaceId: "work-card-repair",
        workCardId: repairContext.parentWorkCardId,
        candidateId: repairContext.parentWorkCardId,
        repairId: repairContext.repairId,
        parentWorkCardId: repairContext.parentWorkCardId,
        loopStep: "Repair",
        sourceEvidence: completion.sourceEvidence,
        requiredAction: "RevisionRequested Repair Validation Record is available; create or continue the next bounded repair Work Card.",
        formalWorkCardPath: repairContext.targetPath,
        implementerReportPath: projection.implementerReportPath,
        reason: `${repairContext.repairId} has RevisionRequested validation evidence and ${repairContext.parentWorkCardId} remains incomplete.`,
      };
    }
    if (completion.repairId === repairContext.repairId && completion.state === "approved") {
      if (resolveWorkCardCloseReturnConsumption(workspaceRoot, completion, planningContext).consumed) {
        return null;
      }
      return {
        status: "active",
        phaseId,
        workspaceId: "work-card-close",
        workCardId: repairContext.parentWorkCardId,
        candidateId: repairContext.parentWorkCardId,
        repairId: repairContext.repairId,
        parentWorkCardId: repairContext.parentWorkCardId,
        loopStep: "Close",
        sourceEvidence: completion.sourceEvidence,
        requiredAction: "Approved Repair Validation Record is available; close the original parent Work Card or advance to the next candidate.",
        formalWorkCardPath: repairContext.targetPath,
        implementerReportPath: projection.implementerReportPath,
        reason: `${repairContext.repairId} provides effective completion evidence for ${repairContext.parentWorkCardId}.`,
      };
    }
    return {
      status: "active",
      phaseId,
      workspaceId: "work-card-report-review",
      workCardId: repairContext.repairId,
      candidateId: repairContext.parentWorkCardId,
      repairId: repairContext.repairId,
      parentWorkCardId: repairContext.parentWorkCardId,
      loopStep: "ReviewAndValidation",
      sourceEvidence,
      requiredAction: "Review the current repair Implementer Report, gather advisory Architect input, and make the Operator validation decision.",
      formalWorkCardPath: repairContext.targetPath,
      implementerReportPath: projection.implementerReportPath,
      reason: `${repairContext.repairId} has a current repair Implementer Report awaiting Review & Validation.`,
    };
  }
  return {
    status: "active",
    phaseId,
    workspaceId: "work-card-building-review",
    workCardId: repairContext.repairId,
    candidateId: repairContext.parentWorkCardId,
    repairId: repairContext.repairId,
    parentWorkCardId: repairContext.parentWorkCardId,
    loopStep: "Build",
    sourceEvidence,
    requiredAction: repairImplementationRequiredAction(projection.reportReadiness, projection.reportReadinessReason),
    blocker: projection.reportReadiness === "invalid" || projection.reportReadiness === "conflict"
      ? projection.reportReadinessReason
      : undefined,
    formalWorkCardPath: repairContext.targetPath,
    implementerReportPath: projection.implementerReportPath,
    reason: `${repairContext.repairId} is approved and ready for repair implementation.`,
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
  activeState: ActiveWorkCardState,
  planningContext?: PlanningProjectionContext,
  execution?: PlanExecutionProjection,
): WorkCardMapCandidateProjection[] {
  return candidates
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((candidate): WorkCardMapCandidateProjection => {
      const explained = explainCandidate(candidate, execution);
      const targets = workCardIntakeTargets(phaseId, candidate);
      const isActive = activeState.status === "active" && activeState.workCardId === candidate.candidateId;
      return {
        candidateId: candidate.candidateId,
        order: candidate.order,
        title: candidate.title,
        purpose: candidate.purpose,
        dependsOn: candidate.dependsOn,
        status: mapStatus(explained, activeState, candidate.candidateId),
        reason: mapReason(explained, activeState, candidate.candidateId),
        evidencePaths: candidateMapEvidencePaths(explained, activeState, candidate.candidateId),
        handoffMarkdownPath: targets.handoffMarkdownPath,
        formalWorkCardMarkdownPath: targets.formalWorkCardMarkdownPath,
        isActive,
        formalWorkCardDocument: formalWorkCardDocumentForTarget(workspaceRoot, targets.formalWorkCardMarkdownPath, planningContext),
      };
    });
}

function resolveActiveWorkCardStateFromDocuments(
  workspaceRoot: string,
  documents: PlanningDocumentSummary[],
  phaseId?: string,
  planningContext?: PlanningProjectionContext,
): ActiveWorkCardState {
  const handoffs = collectActivePlanningHandoffs(workspaceRoot, documents, phaseId, planningContext);
  const incompleteActiveCandidates = handoffs.filter((handoff) =>
    !resolveEffectiveWorkCardCompletion(workspaceRoot, handoff.phaseId, handoff.workCardId, planningContext).complete
  );
  if (incompleteActiveCandidates.length > 1) {
    const ids = incompleteActiveCandidates.map((entry) => entry.workCardId);
    return {
      status: "conflict",
      phaseId,
      activeWorkCardIds: ids,
      reason: `Multiple active incomplete Work Cards exist in this phase: ${ids.join(", ")}.`,
      evidencePaths: incompleteActiveCandidates.flatMap(activeStateEvidencePaths),
    };
  }
  const incomplete = incompleteActiveCandidates[0];
  if (incomplete) {
    return activeWorkCardState(incomplete);
  }
  if (!phaseId) {
    return {
      status: "none",
      phaseId,
      reason: "No active incomplete Work Card exists for this phase.",
      evidencePaths: [],
    };
  }

  const latestCompleted = resolveLatestCompletedWorkCardCloseStateFromHandoffs(
    workspaceRoot,
    phaseId,
    handoffs,
    planningContext,
  );
  if (latestCompleted.status === "conflict") {
    return {
      status: "conflict",
      phaseId,
      activeWorkCardIds: [],
      reason: latestCompleted.reason,
      evidencePaths: latestCompleted.evidencePaths,
    };
  }
  if (latestCompleted.status === "ready" && !latestCompleted.consumed) {
    latestCompleted.handoff.closePendingEvidencePaths = latestCompleted.completion.sourceEvidence;
    return activeWorkCardState(latestCompleted.handoff);
  }
  return {
    status: "none",
    phaseId,
    reason: latestCompleted.reason,
    evidencePaths: latestCompleted.evidencePaths,
  };
}

export function resolveLatestCompletedWorkCardCloseState(
  workspaceRoot: string,
  phaseId: string,
): LatestCompletedWorkCardCloseState {
  const documents = listPlanningDocuments(workspaceRoot);
  return resolveLatestCompletedWorkCardCloseStateFromHandoffs(
    workspaceRoot,
    phaseId,
    collectActivePlanningHandoffs(workspaceRoot, documents, phaseId),
  );
}

function collectActivePlanningHandoffs(
  workspaceRoot: string,
  documents: PlanningDocumentSummary[],
  phaseId?: string,
  planningContext?: PlanningProjectionContext,
): ActiveWorkCardPlanningHandoff[] {
  const handoffs = documents
    .filter((document) => document.metadata.artifactType === "work-card-intake-handoff")
    .filter((document) => document.effectiveDisposition === "Approved")
    .filter((document) => {
      if (!phaseId) return true;
      return document.metadata.phaseId === phaseId ||
        document.metadata.canonical?.identity.phaseId === phaseId;
    })
    .filter((document) => evaluateDocumentFreshness(planningContext ?? workspaceRoot, document.logicalDocumentId).state === "fresh")
    .map((handoff) => activePlanningHandoffFromDocument(handoff))
    .filter((handoff): handoff is ActiveWorkCardPlanningHandoff => Boolean(handoff))
    .filter((handoff) => plannedCandidateExists(workspaceRoot, handoff.phaseId, handoff.workCardId, planningContext));

  const byWorkCard = new Map<string, ActiveWorkCardPlanningHandoff[]>();
  for (const handoff of handoffs) {
    const key = `${handoff.phaseId}:${handoff.workCardId}`;
    byWorkCard.set(key, [...(byWorkCard.get(key) ?? []), handoff]);
  }
  return [...byWorkCard.values()].map((entries) => entries.at(-1)!);
}

function resolveLatestCompletedWorkCardCloseStateFromHandoffs(
  workspaceRoot: string,
  phaseId: string,
  handoffs: ActiveWorkCardPlanningHandoff[],
  planningContext?: PlanningProjectionContext,
): LatestCompletedWorkCardCloseState {
  const completed = handoffs
    .map((handoff) => ({
      handoff,
      completion: resolveEffectiveWorkCardCompletion(
        workspaceRoot,
        handoff.phaseId,
        handoff.workCardId,
        planningContext,
      ),
    }))
    .filter((entry): entry is {
      handoff: ActiveWorkCardPlanningHandoff;
      completion: EffectiveWorkCardCompletion & { validationRecord: PlanningDocumentSummary };
    } => entry.completion.complete && Boolean(entry.completion.validationRecord));
  if (completed.length === 0) {
    return {
      status: "none",
      phaseId,
      reason: "No effectively completed Work Card intake handoff exists for this phase.",
      evidencePaths: [],
    };
  }

  let latest = completed[0];
  if (completed.length > 1) {
    const ordered = completed.map((entry) => ({
      ...entry,
      reviewedAt: entry.completion.validationRecord.metadata.canonical?.documentDisposition.reviewedAt,
    }));
    const invalid = ordered.filter((entry) =>
      !entry.reviewedAt || Number.isNaN(Date.parse(entry.reviewedAt))
    );
    if (invalid.length > 0) {
      return {
        status: "conflict",
        phaseId,
        reason: "A unique latest completed Work Card cannot be established because multiple final Validation Records do not all provide valid reviewedAt timestamps.",
        evidencePaths: completed.flatMap((entry) => entry.completion.sourceEvidence),
      };
    }
    const latestTime = Math.max(...ordered.map((entry) => Date.parse(entry.reviewedAt!)));
    const latestEntries = ordered.filter((entry) => Date.parse(entry.reviewedAt!) === latestTime);
    if (latestEntries.length !== 1) {
      return {
        status: "conflict",
        phaseId,
        reason: "A unique latest completed Work Card cannot be established because final Validation Record reviewedAt ordering evidence is tied.",
        evidencePaths: latestEntries.flatMap((entry) => entry.completion.sourceEvidence),
      };
    }
    latest = latestEntries[0];
  }

  const consumption = resolveWorkCardCloseReturnConsumption(workspaceRoot, latest.completion, planningContext);
  const evidencePaths = [
    ...activeStateEvidencePaths(latest.handoff),
    ...latest.completion.sourceEvidence,
    ...(consumption.record ? [consumption.record.markdownPath] : []),
  ].filter((value, index, values) => values.indexOf(value) === index);
  return {
    status: "ready",
    phaseId,
    parentWorkCardId: latest.completion.parentWorkCardId,
    handoff: latest.handoff,
    completion: latest.completion,
    consumed: consumption.consumed,
    closeReturnRecordPath: consumption.recordPath,
    reason: consumption.consumed
      ? `${latest.completion.parentWorkCardId} is the latest exact-current completion and its Close / Next transition is consumed.`
      : `${latest.completion.parentWorkCardId} is the unique latest exact-current completion and remains current for Close / Next.`,
    evidencePaths,
  };
}

function activeWorkCardState(
  active: ActiveWorkCardPlanningHandoff,
): Extract<ActiveWorkCardState, { status: "active" }> {
  return {
    status: "active",
    phaseId: active.phaseId,
    workCardId: active.workCardId,
    handoff: active.handoff,
    formalWorkCardMarkdownPath: active.formalWorkCardMarkdownPath,
    reason: `${active.workCardId} is the active Work Card for this phase.`,
    evidencePaths: activeStateEvidencePaths(active),
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
  candidate: WorkCardCandidate,
  execution: PlanExecutionProjection | undefined,
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
  const item = execution?.workItems.find((entry) => entry.candidate.workItemId === candidate.candidateId);
  if (item?.complete) {
    return explanation(candidate, "complete", "Candidate has current effective Approved validation and no pending active close boundary.", item.evidencePaths);
  }
  if (!item?.eligible) {
    return explanation(candidate, "dependency-blocked", `Candidate is blocked: ${item?.reasons.join(" ") || "Current execution evidence is unavailable."}`, item?.evidencePaths);
  }
  return explanation(candidate, "eligible", "Candidate is planned, incomplete, and all predecessors permit continuation.");
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
  activeState: ActiveWorkCardState,
  candidateId: string,
): WorkCardMapCandidateProjection["status"] {
  if (activeState.status === "active" && activeState.workCardId === candidateId) {
    return "Eligible";
  }
  if (explained.state === "complete") {
    return "Complete";
  }
  if (activeState.status === "active") {
    return activeState.workCardId === candidateId ? "Eligible" : "Ineligible";
  }
  if (activeState.status === "conflict") {
    return "Ineligible";
  }
  return explained.state === "eligible" ? "Eligible" : "Ineligible";
}

function mapReason(
  explained: CandidateSelectionExplanation,
  activeState: ActiveWorkCardState,
  candidateId: string,
): string {
  if (activeState.status === "active" && activeState.workCardId === candidateId) {
    return `Continue ${candidateId}; it is the active Work Card for this phase.`;
  }
  if (explained.state === "complete" || explained.state === "eligible") {
    if (activeState.status === "active" && activeState.workCardId !== candidateId && explained.state !== "complete") {
      return `Cannot begin planning while ${activeState.workCardId} is the active Work Card.`;
    }
    if (activeState.status === "conflict" && explained.state !== "complete") {
      return activeState.reason;
    }
    return explained.reason;
  }
  if (activeState.status === "active" && activeState.workCardId !== candidateId) {
    return `Cannot begin planning while ${activeState.workCardId} is the active Work Card.`;
  }
  if (activeState.status === "conflict") {
    return activeState.reason;
  }
  return explained.reason;
}

function candidateMapEvidencePaths(
  explained: CandidateSelectionExplanation,
  activeState: ActiveWorkCardState,
  candidateId: string,
): string[] {
  if (activeState.status === "active" && activeState.workCardId === candidateId) {
    return [...explained.evidencePaths, ...activeState.evidencePaths]
      .filter((value, index, values) => values.indexOf(value) === index);
  }
  if (
    (activeState.status === "active" && activeState.workCardId !== candidateId && explained.state !== "complete") ||
    (activeState.status === "conflict" && explained.state !== "complete")
  ) {
    return [...explained.evidencePaths, ...activeState.evidencePaths];
  }
  return explained.evidencePaths;
}

function activeStateEvidencePaths(handoff: ActiveWorkCardPlanningHandoff): string[] {
  const paths = [
    handoff.handoff.markdownPath,
    handoff.formalWorkCardMarkdownPath,
    ...(handoff.closePendingEvidencePaths ?? []),
  ];
  return paths.filter((value, index, values) => values.indexOf(value) === index);
}

function plannedCandidateExists(
  workspaceRoot: string,
  phaseId: string,
  workCardId: string,
  planningContext?: PlanningProjectionContext,
): boolean {
  try {
    return readCandidates(workspaceRoot, phaseId, planningContext)
      .some((candidate) => candidate.candidateId === workCardId);
  } catch {
    return false;
  }
}

function formalWorkCardDocumentForTarget(
  workspaceRoot: string,
  formalWorkCardMarkdownPath: string,
  planningContext?: PlanningProjectionContext,
): WorkCardMapCandidateProjection["formalWorkCardDocument"] {
  const document = listPlanningDocuments(planningContext ?? workspaceRoot)
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
    const parsed = planningContext
      ? { bodyMarkdown: readPlanningDocumentFromContext(planningContext, document.logicalDocumentId).bodyMarkdown }
      : parseCanonicalMarkdownDocument(fs.readFileSync(path.join(workspaceRoot, document.markdownPath), "utf8"));
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

function readCandidates(workspaceRoot: string, phaseId: string, planningContext?: PlanningProjectionContext): WorkCardCandidate[] {
  const workCardPlan = requiredApproved(workspaceRoot, `planning/phases/${phaseId}/Work_Card_Plan`, ".md", planningContext);
  const workflowData = planningContext
    ? workCardPlan.metadata.canonical?.workflowData ?? {}
    : readWorkflowData(workspaceRoot, workCardPlan.markdownPath);
  return validateCandidates(workflowData.candidates);
}

function requiredApproved(workspaceRoot: string, prefix: string, extension: ".md", planningContext?: PlanningProjectionContext): PlanningDocumentSummary {
  const document = listPlanningDocuments(planningContext ?? workspaceRoot)
    .filter((candidate) => candidate.markdownPath.startsWith(prefix))
    .filter((candidate) => candidate.markdownPath.endsWith(extension))
    .at(-1);
  if (!document || document.effectiveDisposition !== "Approved") {
    throw new Error(`Current Approved input is required: ${prefix}`);
  }
  if (evaluateDocumentFreshness(planningContext ?? workspaceRoot, document.logicalDocumentId).state === "stale") {
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

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}
