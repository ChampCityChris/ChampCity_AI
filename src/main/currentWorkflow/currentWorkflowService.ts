import type { DocumentDispositionStatus } from "../../shared/documents/documentDisposition";
import type {
  ClosureDecision,
  CloseReturnSelectionProjection,
  CurrentWorkspaceModel,
  ExecutionContextPhaseProjection,
  ExecutionContextProjection,
  ExecutionContextWorkCardProjection,
  PhaseLoopStep,
  RuntimeActionResult,
  WorkCardCloseProjection,
  WorkCardLoopStep,
  WorkspaceId,
} from "../../shared/workspaceContracts";
import { resolveFirstNonApprovedDocument } from "../documents/firstNonApprovedResolver";
import { evaluateDocumentFreshness, listPlanningDocuments } from "../documents/planningDocumentService";
import { setArchitectInterviewDisposition } from "../architectInterview/architectInterviewService";
import {
  generateProjectPlanningHandoff,
  getProjectPlanningCompletion,
  setProjectPlanningBundleDisposition,
} from "../projectPlanning/projectPlanningService";
import {
  generatePhaseMapHandoff,
  getPhaseMapDraftSubmissionStatus,
  getPhaseMapProjection,
  setPhaseMapDisposition,
} from "../phaseMap/phaseMapService";
import {
  generatePhaseInterviewHandoff,
  getPhaseInterviewDraftSubmissionStatus,
  getPhaseIntakeCompletion,
  setPhaseInterviewDisposition,
} from "../phaseInterview/phaseInterviewService";
import {
  generatePhasePlanningHandoff,
  getPhasePlanningDraftSubmissionStatus,
  getPhasePlanningCompletion,
  getPhasePlanningWorkspaceModel,
} from "../phasePlanning/phasePlanningService";
import {
  generateWorkCardIntakeHandoff,
  getWorkCardIntakeProjection,
  selectNextWorkCardCandidate,
} from "../workCardIntake/workCardIntakeService";
import {
  getWorkCardBuildingEligibility,
  setFormalWorkCardDisposition,
} from "../workCardPlanning/workCardPlanningService";
import {
  createImplementerReportForApprovedWorkCard,
  getWorkCardBuildingReviewProjection,
} from "../workCardBuilding/workCardBuildingReviewService";
import {
  applyOperatorValidationDecision,
  buildAdvisoryArchitectReviewPrompt,
  createValidationAttempt,
  getWorkCardCloseProjection,
  setValidationRecordDisposition,
  type OperatorValidationDecisionInput,
} from "../workCardValidation/workCardValidationService";
import {
  createRepairWorkCard,
  resolveExactActiveRepairWorkCardContext,
} from "../workCardRepair/workCardRepairService";
import { getArchitectOutputWorkspaceModel } from "../architectOutputs/architectOutputWorkspaceService";
import {
  createPhaseCloseout,
  getPhaseCloseProjection,
  setPhaseCloseoutDisposition,
} from "../phaseClose/phaseCloseService";
import {
  createProjectCloseout,
  getProjectCloseProjection,
  setProjectCloseoutDisposition,
} from "../projectClose/projectCloseService";

type CurrentWorkspaceCoreModel = Omit<CurrentWorkspaceModel, "executionContext">;

export function getCurrentWorkspaceModel(workspaceRoot: string): CurrentWorkspaceModel {
  const model = resolveCurrentWorkspaceModel(workspaceRoot);
  const workCardBuildingReview = resolveVisibleWorkCardBuildingReviewProjection(workspaceRoot, model);
  return {
    ...model,
    workCardBuildingReview,
    executionContext: buildExecutionContextProjection(workspaceRoot, model),
  };
}

function resolveVisibleWorkCardBuildingReviewProjection(
  workspaceRoot: string,
  model: CurrentWorkspaceCoreModel,
): CurrentWorkspaceModel["workCardBuildingReview"] {
  if (model.currentPhaseId && model.currentWorkCardId && !/-REPAIR\d+$/i.test(model.currentWorkCardId)) {
    try {
      return getWorkCardBuildingReviewProjection(workspaceRoot, model.currentPhaseId, model.currentWorkCardId);
    } catch {
      // Fall through to report-backed lookup for manually reachable review surfaces.
    }
  }
  const report = listPlanningDocuments(workspaceRoot)
    .filter((document) => document.metadata.artifactType === "implementer-report")
    .filter((document) => ["Pending", "RevisionRequested", "Rejected", "Approved"].includes(document.effectiveDisposition))
    .at(-1);
  const phaseId = report?.metadata.phaseId ??
    (typeof report?.metadata.canonical?.identity.phaseId === "string" ? report.metadata.canonical.identity.phaseId : undefined);
  const workCardId = report?.metadata.workCardId ??
    (typeof report?.metadata.canonical?.identity.workCardId === "string" ? report.metadata.canonical.identity.workCardId : undefined);
  if (!phaseId || !workCardId) {
    return undefined;
  }
  try {
    return getWorkCardBuildingReviewProjection(workspaceRoot, phaseId, workCardId);
  } catch {
    return undefined;
  }
}

function resolveCurrentWorkspaceModel(workspaceRoot: string): CurrentWorkspaceCoreModel {
  const phaseMapArchitectOutput = getArchitectOutputWorkspaceModel(workspaceRoot, "project-phase-map");
  if (phaseMapArchitectOutput.state === "promotion-failed") {
    return currentModelFromArchitectOutput(workspaceRoot, "project-phase-map", {
      level: "project",
      stage: "building",
      currentTarget: "Phase Map",
      expectedOutput: "Phase Map Markdown with champcity-phase-map domain block.",
      expectedNextState: "Correct the draft and explicitly prepare a fresh Phase Map handoff.",
      fallbackEvidence: phaseMapArchitectOutput.evidencePaths,
    });
  }
  const current = resolveFirstNonApprovedDocument(workspaceRoot);
  if (current.status === "pre-intake") {
    return {
      activeWorkspaceId: current.activeWorkspaceId,
      level: "project",
      stage: "intake",
      currentTarget: "Project Intake",
      sourceEvidence: [],
      requiredAction: current.reason,
      expectedOutput: "Approved Project Intake and Approved Architect Interview Prompt Markdown documents.",
      eligibility: "Project Intake can be captured for the active repository.",
      expectedNextState: "Architect Interview prompt becomes available after Project Intake submission.",
    };
  }

  if (current.status === "project-intake-incomplete") {
    return {
      activeWorkspaceId: current.activeWorkspaceId,
      level: "project",
      stage: "intake",
      currentTarget: "Project Intake artifact generation",
      sourceEvidence: current.sourceEvidence,
      requiredAction: current.reason,
      expectedOutput: current.expectedOutput,
      eligibility: "Local Project Intake repair is required before Architect Interview handoff.",
      blocker: "Required generated prompt evidence is missing or incomplete.",
      expectedNextState: "Regenerate Project Intake so the Approved Architect Interview Prompt Markdown exists.",
    };
  }

  if (current.status === "project-intake-conflict") {
    return {
      activeWorkspaceId: current.activeWorkspaceId,
      level: "project",
      stage: "intake",
      currentTarget: "Project Intake conflict",
      sourceEvidence: current.sourceEvidence,
      requiredAction: current.reason,
      expectedOutput: "One canonical Project Intake Markdown document remains in planning/project/Project_Intake/.",
      eligibility: "Resolve multiple canonical Project Intake documents before continuing.",
      blocker: current.sourceEvidence.join("; "),
      expectedNextState: "After the duplicate conflict is resolved, refresh to resume Project Intake review.",
    };
  }

  if (current.status === "waiting-for-architect-interview") {
    return currentModelFromArchitectOutput(workspaceRoot, current.activeWorkspaceId, {
      level: "project",
      stage: "intake",
      currentTarget: "Architect Interview",
      expectedOutput: `Project Architect Interview Markdown: ${current.expectedOutputPaths.markdown}`,
      expectedNextState: "A Pending Project Architect Interview Markdown document becomes the current review document.",
      fallbackEvidence: current.sourceEvidence,
    });
  }

  if (current.status === "all-approved") {
    const missingModel = missingProjectPlanningModel(workspaceRoot) ??
      missingPhaseMapModel(workspaceRoot) ??
      missingPhaseInterviewModel(workspaceRoot) ??
      missingPhasePlanningModel(workspaceRoot) ??
      missingWorkCardIntakeOrFormalModel(workspaceRoot) ??
      missingImplementerReportModel(workspaceRoot) ??
      missingRepairWorkCardModel(workspaceRoot);
    if (missingModel) {
      return missingModel;
    }
    return {
      activeWorkspaceId: "project-close",
      level: "project",
      stage: "close",
      currentTarget: "All planning artifacts",
      sourceEvidence: [],
      requiredAction: "No blocking lifecycle document is pending.",
      expectedOutput: current.message,
      eligibility: "Complete",
      expectedNextState: "Operator may perform closeout review.",
    };
  }

  const document = current.document;
  const activeRepairModel = repairModelForRevisionRequestedEvidence(workspaceRoot, document);
  if (activeRepairModel) {
    return activeRepairModel;
  }
  const nextCandidatePlanningModel = approvedWorkCardIntakeWithoutApprovedFormalModel(workspaceRoot);
  if (nextCandidatePlanningModel) {
    return nextCandidatePlanningModel;
  }
  const validatedReportModel = modelForPendingReportWithValidationDecision(workspaceRoot, document);
  if (validatedReportModel) {
    return validatedReportModel;
  }
  const pendingReportBuildModel = buildModelForPendingImplementerReport(workspaceRoot, document);
  if (pendingReportBuildModel) {
    return pendingReportBuildModel;
  }
  if (isArchitectOutputWorkspace(document.owningWorkspaceId)) {
    return currentModelFromArchitectOutput(workspaceRoot, document.owningWorkspaceId, {
      level: document.lifecycleLocation.level,
      stage: document.lifecycleLocation.stage,
      currentPhaseId: document.selectedPhaseId,
      currentWorkCardId: document.selectedWorkCardId,
      currentTarget: document.displayTitle,
      expectedOutput: expectedOutputForWorkspace(document.owningWorkspaceId),
      expectedNextState: expectedNextStateForWorkspace(document.owningWorkspaceId),
      fallbackEvidence: document.evidencePaths.length > 0
        ? document.evidencePaths
        : [document.markdownPath].filter((value): value is string => Boolean(value)),
    });
  }
  return {
    activeWorkspaceId: document.owningWorkspaceId,
    level: document.lifecycleLocation.level,
    stage: document.lifecycleLocation.stage,
    currentPhaseId: document.selectedPhaseId,
    currentWorkCardId: document.selectedWorkCardId,
    currentTarget: document.displayTitle,
    sourceEvidence: document.evidencePaths.length > 0
      ? document.evidencePaths
      : [document.markdownPath].filter((value): value is string => Boolean(value)),
    requiredAction: document.reason,
    expectedOutput: expectedOutputForWorkspace(document.owningWorkspaceId),
    eligibility: document.freshnessState === "fresh" ? "Current evidence is fresh." : "Current evidence is stale.",
    blocker: document.freshnessState === "stale"
      ? document.staleSources.map((source) => source.path).join("; ")
      : undefined,
    expectedNextState: expectedNextStateForWorkspace(document.owningWorkspaceId),
  };
}

function buildModelForPendingImplementerReport(
  workspaceRoot: string,
  document: {
    artifactType: string;
    markdownPath?: string;
    selectedPhaseId?: string;
    selectedWorkCardId?: string;
    effectiveDisposition: DocumentDispositionStatus;
    freshnessState: "fresh" | "stale";
  },
): CurrentWorkspaceCoreModel | null {
  if (
    document.artifactType !== "implementer-report" ||
    document.effectiveDisposition !== "Pending" ||
    document.freshnessState !== "fresh" ||
    !document.selectedPhaseId ||
    !document.selectedWorkCardId ||
    !document.markdownPath
  ) {
    return null;
  }
  const projection = getWorkCardBuildingReviewProjection(
    workspaceRoot,
    document.selectedPhaseId,
    document.selectedWorkCardId,
  );
  return {
    activeWorkspaceId: "work-card-report-review",
    level: "work-card",
    stage: "building",
    currentPhaseId: document.selectedPhaseId,
    currentWorkCardId: document.selectedWorkCardId,
    currentTarget: "Review & Validation",
    sourceEvidence: [projection.formalWorkCardPath, document.markdownPath],
    requiredAction: "Review the current Implementer Report, gather advisory Architect input, and make the Operator validation decision.",
    expectedOutput: projection.implementerReportPath,
    eligibility: "Current Pending Implementer Report is fresh and ready for Review & Validation.",
    expectedNextState: "Operator decision creates the Validation Record authority.",
  };
}

function modelForPendingReportWithValidationDecision(
  workspaceRoot: string,
  document: {
    artifactType: string;
    markdownPath?: string;
    selectedPhaseId?: string;
    selectedWorkCardId?: string;
    effectiveDisposition: DocumentDispositionStatus;
    freshnessState: "fresh" | "stale";
  },
): CurrentWorkspaceCoreModel | null {
  if (
    document.artifactType !== "implementer-report" ||
    document.effectiveDisposition !== "Pending" ||
    document.freshnessState !== "fresh" ||
    !document.selectedPhaseId ||
    !document.selectedWorkCardId ||
    !document.markdownPath
  ) {
    return null;
  }
  const documents = listPlanningDocuments(workspaceRoot);
  const reportRevision = documents.find((candidate) => candidate.markdownPath === document.markdownPath)
    ?.metadata.artifactRevision ?? 1;
  const validationRecord = documents
    .filter((candidate) => candidate.metadata.artifactType === "validation-record")
    .filter((candidate) => candidate.metadata.phaseId === document.selectedPhaseId || candidate.metadata.canonical?.identity.phaseId === document.selectedPhaseId)
    .filter((candidate) => candidate.metadata.workCardId === document.selectedWorkCardId || candidate.metadata.canonical?.identity.workCardId === document.selectedWorkCardId)
    .filter((candidate) => (candidate.metadata.sourceRevisions ?? []).some((source) =>
      source.path === document.markdownPath && source.revision === reportRevision
    ))
    .filter((candidate) => candidate.documentReadState === "readable" && !candidate.readError)
    .at(-1);
  if (!validationRecord || evaluateDocumentFreshness(workspaceRoot, validationRecord.logicalDocumentId).state !== "fresh") {
    return null;
  }
  if (validationRecord.effectiveDisposition === "Approved") {
    return {
      activeWorkspaceId: "work-card-close",
      level: "work-card",
      stage: "close",
      currentPhaseId: document.selectedPhaseId,
      currentWorkCardId: document.selectedWorkCardId,
      currentTarget: "Close / Next Work Card",
      sourceEvidence: [document.markdownPath, validationRecord.markdownPath],
      requiredAction: "Approved Validation Record is available; close this Work Card or advance to the next candidate.",
      expectedOutput: "Close / Next Work Card decision.",
      eligibility: "Current Approved Validation Record is fresh.",
      expectedNextState: "Work Card can advance to close or next candidate behavior.",
    };
  }
  if (validationRecord.effectiveDisposition === "RevisionRequested") {
    return {
      activeWorkspaceId: "work-card-repair",
      level: "work-card",
      stage: "repair",
      currentPhaseId: document.selectedPhaseId,
      currentWorkCardId: document.selectedWorkCardId,
      currentTarget: "Repair Work Card",
      sourceEvidence: [document.markdownPath, validationRecord.markdownPath],
      requiredAction: "RevisionRequested Validation Record is available; create the bounded repair handoff.",
      expectedOutput: "Repair Work Card Markdown.",
      eligibility: "Current RevisionRequested Validation Record is fresh.",
      expectedNextState: "Repair workspace creates the bounded repair handoff/card from validation evidence.",
    };
  }
  return null;
}

function repairModelForRevisionRequestedEvidence(
  workspaceRoot: string,
  document: {
    markdownPath?: string;
    effectiveDisposition: DocumentDispositionStatus;
  },
): CurrentWorkspaceCoreModel | null {
  if (document.effectiveDisposition !== "RevisionRequested" || !document.markdownPath) {
    return null;
  }
  const resolved = resolveExactActiveRepairWorkCardContext(workspaceRoot);
  if (resolved.status === "not-ready") {
    return null;
  }
  const context = resolved.context;
  if (context && context.workflowData.evidencePath !== document.markdownPath && context.targetPath !== document.markdownPath) {
    return null;
  }
  if (!context && !resolved.evidencePaths.includes(document.markdownPath)) {
    return null;
  }
  return currentModelFromArchitectOutput(workspaceRoot, "work-card-repair", {
    level: "work-card",
    stage: "repair",
    currentPhaseId: context?.phaseId,
    currentWorkCardId: context?.repairId,
    currentTarget: "Repair Work Card",
    expectedOutput: "Repair Work Card Markdown.",
    expectedNextState: "Pending Repair Work Card becomes reviewable and remains owned by its parent.",
    fallbackEvidence: resolved.evidencePaths.length > 0 ? resolved.evidencePaths : [document.markdownPath],
  });
}

function missingProjectPlanningModel(workspaceRoot: string): CurrentWorkspaceCoreModel | null {
  const documents = listPlanningDocuments(workspaceRoot);
  const approvedInterview = documents
    .filter((document) => document.metadata.artifactType === "project-architect-interview")
    .filter((document) => document.effectiveDisposition === "Approved")
    .at(-1);
  if (!approvedInterview) {
    return null;
  }
  const profile = documents.find((document) => document.markdownPath === "planning/project/PROJECT_PROFILE.md");
  const roadmap = documents.find((document) => document.markdownPath.startsWith("planning/project/Project_Roadmap/PROJECT_ROADMAP_"));
  if (profile && roadmap) {
    return null;
  }
  return currentModelFromArchitectOutput(workspaceRoot, "project-planning-review", {
    level: "project",
    stage: "planning",
    currentTarget: "Project Planning",
    expectedOutput: "Project Profile Markdown and Project Roadmap Markdown.",
    expectedNextState: "Project Profile and Project Roadmap become current review documents.",
    fallbackEvidence: [approvedInterview.markdownPath],
  });
}

function missingPhaseMapModel(workspaceRoot: string): CurrentWorkspaceCoreModel | null {
  const projectPlanning = getProjectPlanningCompletion(workspaceRoot);
  if (!projectPlanning.complete) {
    return null;
  }
  const architectOutput = getArchitectOutputWorkspaceModel(workspaceRoot, "project-phase-map");
  if (architectOutput.state === "promotion-failed") {
    return currentModelFromArchitectOutput(workspaceRoot, "project-phase-map", {
      level: "project",
      stage: "building",
      currentTarget: "Phase Map",
      expectedOutput: "Phase Map Markdown with champcity-phase-map domain block.",
      expectedNextState: "Correct the draft and explicitly prepare a fresh Phase Map handoff.",
      fallbackEvidence: [],
    });
  }
  const draftStatus = getPhaseMapDraftSubmissionStatus(workspaceRoot);
  const documents = listPlanningDocuments(workspaceRoot);
  const phaseMap = documents
    .find((document) => document.markdownPath.startsWith("planning/project/Phase_Map/PHASE_MAP"));
  if (phaseMap) {
    if (
      draftStatus?.submission.state === "promoted" &&
      phaseMap.effectiveDisposition !== "Approved"
    ) {
      const freshness = phaseMap.documentReadState === "readable"
        ? "Current evidence is fresh."
        : "Current evidence requires attention.";
      return {
        activeWorkspaceId: "project-phase-map",
        level: "project",
        stage: "building",
        currentTarget: phaseMap.displayFilename,
        sourceEvidence: [phaseMap.markdownPath],
        requiredAction: phaseMap.effectiveDisposition === "Pending"
          ? "Review the Pending Phase Map output and apply a disposition."
          : "Resolve the current Phase Map disposition before phase selection.",
        expectedOutput: "Approved Phase Map Markdown with champcity-phase-map domain block.",
        eligibility: freshness,
        draftSubmissionState: draftStatus.submission.state,
        draftPromotionError: draftStatus.promotionError,
        expectedNextState: "Approved Phase Map selects the first incomplete phase.",
      };
    }
    return null;
  }
  const profile = documents
    .find((document) => document.markdownPath === "planning/project/PROJECT_PROFILE.md");
  const roadmap = documents
    .find((document) => document.markdownPath.startsWith("planning/project/Project_Roadmap/PROJECT_ROADMAP_"));
  return currentModelFromArchitectOutput(workspaceRoot, "project-phase-map", {
    level: "project",
    stage: "building",
    currentTarget: "Phase Map",
    expectedOutput: "Phase Map Markdown with champcity-phase-map domain block.",
    expectedNextState: "Pending Phase Map becomes the current review document.",
    fallbackEvidence: [profile?.markdownPath, roadmap?.markdownPath]
      .filter((value): value is string => Boolean(value)),
  });
}

function missingPhaseInterviewModel(workspaceRoot: string): CurrentWorkspaceCoreModel | null {
  const projection = getPhaseMapProjection(workspaceRoot);
  if (projection.state !== "first-incomplete") {
    return null;
  }
  const phaseId = projection.phase.phaseId;
  const draftStatus = getPhaseInterviewDraftSubmissionStatus(workspaceRoot);
  const intake = getPhaseIntakeCompletion(workspaceRoot, phaseId);
  if (intake.complete) {
    return null;
  }
  const documents = listPlanningDocuments(workspaceRoot);
  const phaseInterview = documents
    .find((document) => document.markdownPath === `planning/phases/${phaseId}/Phase_Interview.md`);
  if (
    phaseInterview &&
    draftStatus?.submission.state === "promoted" &&
    phaseInterview.effectiveDisposition !== "Approved"
  ) {
    return {
      activeWorkspaceId: "phase-interview",
      level: "phase",
      stage: "intake",
      currentPhaseId: phaseId,
      currentTarget: phaseInterview.displayFilename,
      sourceEvidence: [phaseInterview.markdownPath],
      requiredAction: phaseInterview.effectiveDisposition === "Pending"
        ? "Review the Pending Phase Interview output and apply a disposition."
        : "Resolve the current Phase Interview disposition before Phase Planning.",
      expectedOutput: `Approved Phase Interview Markdown for ${phaseId}.`,
      eligibility: phaseInterview.documentReadState === "readable"
        ? "Current evidence is fresh."
        : "Current evidence requires attention.",
      draftSubmissionState: draftStatus.submission.state,
      draftPromotionError: draftStatus.promotionError,
      expectedNextState: "Approved Phase Interview makes Phase Planning ready.",
    };
  }
  return currentModelFromArchitectOutput(workspaceRoot, "phase-interview", {
    level: "phase",
    stage: "intake",
    currentPhaseId: phaseId,
    currentTarget: "Phase Interview",
    expectedOutput: `Phase Interview Markdown for ${phaseId}.`,
    expectedNextState: "Pending Phase Interview becomes the current review document.",
    fallbackEvidence: ["planning/project/Phase_Map"],
  });
}

function missingPhasePlanningModel(workspaceRoot: string): CurrentWorkspaceCoreModel | null {
  const projection = getPhaseMapProjection(workspaceRoot);
  if (projection.state !== "first-incomplete") {
    return null;
  }
  const phaseId = projection.phase.phaseId;
  const phasePlanningWorkspace = getPhasePlanningWorkspaceModel(workspaceRoot);
  const draftStatus = getPhasePlanningDraftSubmissionStatus(workspaceRoot);
  const intake = getPhaseIntakeCompletion(workspaceRoot, phaseId);
  if (!intake.complete) {
    return null;
  }
  const documents = listPlanningDocuments(workspaceRoot);
  const phasePlanning = documents
    .find((document) => document.markdownPath === `planning/phases/${phaseId}/Phase_Planning.md`);
  const workCardPlan = documents
    .find((document) => document.markdownPath === `planning/phases/${phaseId}/Work_Card_Plan.md`);
  if (
    phasePlanning &&
    workCardPlan &&
    draftStatus?.submission.state === "promoted" &&
    (phasePlanning.effectiveDisposition !== "Approved" || workCardPlan.effectiveDisposition !== "Approved")
  ) {
    return {
      activeWorkspaceId: "phase-planning-bundle",
      level: "phase",
      stage: "planning",
      currentPhaseId: phaseId,
      currentTarget: "Phase Planning Bundle",
      sourceEvidence: [phasePlanning.markdownPath, workCardPlan.markdownPath],
      requiredAction: phasePlanning.effectiveDisposition === "Pending" && workCardPlan.effectiveDisposition === "Pending"
        ? "Review both current Phase Planning outputs and apply one shared bundle disposition."
        : "Resolve the current Phase Planning bundle disposition before Work Card Intake.",
      expectedOutput: "Approved Phase Planning and Work Card Plan bundle.",
      eligibility: phasePlanningWorkspace.reason,
      draftSubmissionState: draftStatus.submission.state,
      draftPromotionError: draftStatus.promotionError,
      expectedNextState: "Approved Phase Planning bundle makes Work Card Intake ready.",
    };
  }
  if (phasePlanning && workCardPlan) {
    return null;
  }
  return currentModelFromArchitectOutput(workspaceRoot, "phase-planning-bundle", {
    level: "phase",
    stage: "planning",
    currentPhaseId: phaseId,
    currentTarget: "Phase Planning",
    expectedOutput: "Phase Planning Markdown and Work Card Plan Markdown with champcity-work-card-plan domain block.",
    expectedNextState: "Pending Phase Planning bundle becomes the current review target.",
    fallbackEvidence: [`planning/phases/${phaseId}/Phase_Interview.md`],
  });
}

function missingWorkCardIntakeOrFormalModel(workspaceRoot: string): CurrentWorkspaceCoreModel | null {
  const projection = getPhaseMapProjection(workspaceRoot);
  if (projection.state !== "first-incomplete") {
    return null;
  }
  const phaseId = projection.phase.phaseId;
  const phasePlanning = getPhasePlanningCompletion(workspaceRoot, phaseId);
  if (!phasePlanning.complete) {
    return null;
  }
  const selection = selectNextWorkCardCandidate(workspaceRoot, phaseId);
  if (selection.state !== "selected") {
    return null;
  }
  const intakeProjection = getWorkCardIntakeProjection(workspaceRoot, phaseId);
  const candidate = intakeProjection.candidate;
  const handoff = listPlanningDocuments(workspaceRoot)
    .filter((document) => document.metadata.artifactType === "work-card-intake-handoff")
    .filter((document) => document.metadata.phaseId === phaseId || document.metadata.canonical?.identity.phaseId === phaseId)
    .filter((document) => document.metadata.workCardId === candidate.candidateId || document.metadata.canonical?.identity.workCardId === candidate.candidateId)
    .filter((document) => document.effectiveDisposition === "Approved")
    .at(-1);
  if (!handoff) {
    return {
      activeWorkspaceId: "work-card-planning",
      level: "work-card",
      stage: "planning",
      currentPhaseId: phaseId,
      currentWorkCardId: candidate.candidateId,
      currentTarget: "Work Card Planning",
      workCardIntake: intakeProjection,
      sourceEvidence: [intakeProjection.sourceWorkCardPlanPath],
      requiredAction: "Approved Phase Planning bundle is available; prepare Work Card Planning.",
      expectedOutput: `Approved Work Card Planning intake handoff for ${candidate.candidateId}.`,
      eligibility: intakeProjection.selectionReason,
      expectedNextState: "Formal Work Card Architect-output preparation becomes available in Planning.",
    };
  }
  const target = handoff.metadata.canonical?.workflowData.formalWorkCardTarget;
  const formal = typeof target === "string"
    ? listPlanningDocuments(workspaceRoot).find((document) => document.markdownPath === target)
    : undefined;
  if (formal) {
    return null;
  }
  return currentModelFromArchitectOutput(workspaceRoot, "work-card-planning", {
    level: "work-card",
    stage: "planning",
    currentPhaseId: phaseId,
    currentWorkCardId: candidate.candidateId,
    currentTarget: "Formal Work Card",
    expectedOutput: `Formal Work Card Markdown for ${candidate.candidateId}.`,
    expectedNextState: "Pending Formal Work Card becomes the current review document.",
    fallbackEvidence: [handoff.markdownPath],
  });
}

function approvedWorkCardIntakeWithoutApprovedFormalModel(workspaceRoot: string): CurrentWorkspaceCoreModel | null {
  const projection = getPhaseMapProjection(workspaceRoot);
  if (projection.state !== "first-incomplete") {
    return null;
  }
  const phaseId = projection.phase.phaseId;
  const phasePlanning = getPhasePlanningCompletion(workspaceRoot, phaseId);
  if (!phasePlanning.complete) {
    return null;
  }
  const selection = selectNextWorkCardCandidate(workspaceRoot, phaseId);
  if (selection.state !== "selected") {
    return null;
  }
  const candidateId = selection.selectedCandidate.candidateId;
  const documents = listPlanningDocuments(workspaceRoot);
  const handoff = documents
    .filter((document) => document.metadata.artifactType === "work-card-intake-handoff")
    .filter((document) => document.metadata.phaseId === phaseId || document.metadata.canonical?.identity.phaseId === phaseId)
    .filter((document) => document.metadata.workCardId === candidateId || document.metadata.canonical?.identity.workCardId === candidateId)
    .filter((document) => document.effectiveDisposition === "Approved")
    .at(-1);
  if (!handoff) {
    return null;
  }
  const target = handoff.metadata.canonical?.workflowData.formalWorkCardTarget;
  const formal = typeof target === "string"
    ? documents.find((document) => document.markdownPath === target)
    : undefined;
  if (formal?.effectiveDisposition === "Approved") {
    return null;
  }
  const model = currentModelFromArchitectOutput(workspaceRoot, "work-card-planning", {
    level: "work-card",
    stage: "planning",
    currentPhaseId: phaseId,
    currentWorkCardId: candidateId,
    currentTarget: "Formal Work Card",
    expectedOutput: `Formal Work Card Markdown for ${candidateId}.`,
    expectedNextState: "Pending Formal Work Card becomes the current review document.",
    fallbackEvidence: [handoff.markdownPath],
  });
  return {
    ...model,
    sourceEvidence: [handoff.markdownPath, ...model.sourceEvidence.filter((path) => path !== handoff.markdownPath)],
  };
}

function missingImplementerReportModel(workspaceRoot: string): CurrentWorkspaceCoreModel | null {
  const documents = listPlanningDocuments(workspaceRoot);
  const formal = documents
    .filter((document) => document.metadata.artifactType === "formal-work-card")
    .filter((document) => document.effectiveDisposition === "Approved")
    .at(-1);
  const phaseId = formal?.metadata.phaseId ?? (typeof formal?.metadata.canonical?.identity.phaseId === "string" ? formal.metadata.canonical.identity.phaseId : undefined);
  const workCardId = formal?.metadata.workCardId ?? (typeof formal?.metadata.canonical?.identity.workCardId === "string" ? formal.metadata.canonical.identity.workCardId : undefined);
  if (!formal || !phaseId || !workCardId) {
    return null;
  }
  const eligibility = getWorkCardBuildingEligibility(workspaceRoot, phaseId, workCardId);
  if (!eligibility.eligible) {
    return null;
  }
  const projection = getWorkCardBuildingReviewProjection(workspaceRoot, phaseId, workCardId);
  if (!projection.reportMissing) {
    return null;
  }
  return {
    activeWorkspaceId: "work-card-building-review",
    level: "work-card",
    stage: "building",
    currentPhaseId: phaseId,
    currentWorkCardId: workCardId,
    currentTarget: "Implementer Build",
    sourceEvidence: [formal.markdownPath, projection.implementerReportPath],
    requiredAction: "Approved Formal Work Card is available; create the application-owned Implementer Report.",
    expectedOutput: projection.implementerReportPath,
    eligibility: eligibility.reason,
    expectedNextState: "Pending Implementer Report becomes the current review document.",
  };
}

function missingRepairWorkCardModel(workspaceRoot: string): CurrentWorkspaceCoreModel | null {
  const resolved = resolveExactActiveRepairWorkCardContext(workspaceRoot);
  if (resolved.status === "not-ready") {
    return null;
  }
  const context = resolved.context;
  const repair = context
    ? listPlanningDocuments(workspaceRoot).find((document) => document.markdownPath === context.targetPath)
    : undefined;
  if (repair) {
    return null;
  }
  return currentModelFromArchitectOutput(workspaceRoot, "work-card-repair", {
    level: "work-card",
    stage: "repair",
    currentPhaseId: context?.phaseId,
    currentWorkCardId: context?.repairId,
    currentTarget: "Repair Work Card",
    expectedOutput: "Repair Work Card Markdown.",
    expectedNextState: "Pending Repair Work Card becomes reviewable and remains owned by its parent.",
    fallbackEvidence: resolved.evidencePaths,
  });
}

function currentModelFromArchitectOutput(
  workspaceRoot: string,
  workspaceId: WorkspaceId,
  fallback: {
    level: string;
    stage: string;
    currentPhaseId?: string;
    currentWorkCardId?: string;
    currentTarget: string;
    expectedOutput: string;
    expectedNextState: string;
    fallbackEvidence: string[];
  },
): CurrentWorkspaceCoreModel {
  const model = getArchitectOutputWorkspaceModel(workspaceRoot, workspaceId);
  const evidencePaths = model.evidencePaths.filter((path) => path.trim().length > 0);
  return {
    activeWorkspaceId: workspaceId,
    level: fallback.level,
    stage: fallback.stage,
    architectOutputState: model.state,
    railStatus: model.railStatus,
    canPrepareHandoff: model.canPrepareHandoff,
    currentPhaseId: fallback.currentPhaseId,
    currentWorkCardId: fallback.currentWorkCardId,
    currentTarget: model.documentSlots.some((slot) => slot.logicalDocumentId)
      ? model.documentSlots.map((slot) => slot.displayLabel).join(" + ")
      : fallback.currentTarget,
    sourceEvidence: evidencePaths.length > 0 ? evidencePaths : fallback.fallbackEvidence,
    requiredAction: model.requiredAction,
    expectedOutput: fallback.expectedOutput,
    eligibility: model.railStatus,
    blocker: model.state === "needs-attention" || model.state === "promotion-failed"
      ? model.reason
      : undefined,
    draftSubmissionState: model.submission?.state,
    draftPromotionError: model.promotionError,
    expectedNextState: fallback.expectedNextState,
  };
}

function isArchitectOutputWorkspace(workspaceId: WorkspaceId): boolean {
  return [
    "architect-interview",
    "project-planning-review",
    "project-phase-map",
    "phase-interview",
    "phase-planning-bundle",
    "work-card-planning",
    "work-card-repair",
  ].includes(workspaceId);
}

function buildExecutionContextProjection(
  workspaceRoot: string,
  model: CurrentWorkspaceCoreModel,
): ExecutionContextProjection {
  const phase = buildPhaseExecutionContext(workspaceRoot, model);
  return {
    phase,
    workCard: buildWorkCardExecutionContext(workspaceRoot, model, phase),
  };
}

function buildPhaseExecutionContext(
  workspaceRoot: string,
  model: CurrentWorkspaceCoreModel,
): ExecutionContextPhaseProjection {
  const loopStep = phaseLoopStepForWorkspace(model.activeWorkspaceId);
  const projection = getPhaseMapProjection(workspaceRoot);
  if (projection.state !== "first-incomplete") {
    return {
      state: "none",
      dependsOn: [],
      projectStep: model.currentTarget,
      reason: phaseEmptyReason(projection.state, model),
    };
  }

  const phases = phaseMapPhasesFromCanonicalMetadata(workspaceRoot);
  const phase = phases.find((candidate) => candidate.phaseId === projection.phase.phaseId) ??
    projection.phase;
  return {
    state: "active",
    phaseId: phase.phaseId,
    title: phase.title,
    order: phase.order,
    totalPhaseCount: phases.length || undefined,
    purpose: phase.purpose,
    dependsOn: phase.dependsOn,
    loopStep: loopStep ?? "Phase Intake",
    reason: "Current phase is the first incomplete Approved Phase Map entry.",
  };
}

function buildWorkCardExecutionContext(
  workspaceRoot: string,
  model: CurrentWorkspaceCoreModel,
  phase: ExecutionContextPhaseProjection,
): ExecutionContextWorkCardProjection {
  const phaseLoopStep = phase.loopStep ?? phaseLoopStepForWorkspace(model.activeWorkspaceId);
  const workCardLoopStep = workCardLoopStepForWorkspace(model.activeWorkspaceId);
  if (!model.currentPhaseId || !model.currentWorkCardId || !workCardLoopStep) {
    return {
      state: "none",
      loopStep: undefined,
      dispositionOrState: phaseLoopStep ?? model.currentTarget,
      reason: phaseLoopStep
        ? `No active Work Card; current phase-loop step is ${phaseLoopStep}.`
        : "No active Work Card.",
    };
  }

  const repairId = isRepairWorkspace(model.activeWorkspaceId, model.currentWorkCardId)
    ? model.currentWorkCardId
    : undefined;
  const parentWorkCardId = repairId
    ? findRepairParentWorkCardId(workspaceRoot, model.currentPhaseId, repairId) ??
      repairId.replace(/-REPAIR\d+$/i, "")
    : undefined;
  const workCardId = parentWorkCardId ?? model.currentWorkCardId;
  const title = findWorkCardTitle(workspaceRoot, model.currentPhaseId, workCardId) ??
    model.currentTarget;

  return {
    state: "active",
    workCardId,
    title,
    loopStep: workCardLoopStep,
    dispositionOrState: workCardDispositionOrState(
      workspaceRoot,
      model,
      workCardId,
      repairId,
    ),
    repairId,
    parentWorkCardId,
    reason: repairId
      ? "Repair context preserves the parent Work Card authority."
      : "Current Work Card comes from the current workflow model and canonical Work Card evidence.",
  };
}

function phaseEmptyReason(
  projectionState: ReturnType<typeof getPhaseMapProjection>["state"],
  model: CurrentWorkspaceCoreModel,
): string {
  if (projectionState === "missing" || projectionState === "not-approved") {
    return `No active phase; current project-level step is ${model.currentTarget}.`;
  }
  if (projectionState === "all-complete") {
    return "No active phase; all Approved Phase Map phases are complete.";
  }
  return "No active phase; Phase Map evidence requires attention.";
}

function phaseLoopStepForWorkspace(workspaceId: WorkspaceId): PhaseLoopStep | undefined {
  switch (workspaceId) {
    case "phase-interview":
      return "Phase Intake";
    case "phase-planning-bundle":
      return "Phase Planning";
    case "phase-work-card-selection":
    case "work-card-intake":
    case "work-card-planning":
    case "work-card-building-review":
    case "work-card-report-review":
    case "work-card-repair":
    case "work-card-validation":
    case "work-card-close":
      return "Work Cards";
    case "phase-validation":
      return "Phase Validation";
    case "phase-close":
      return "Phase Close";
    default:
      return undefined;
  }
}

function workCardLoopStepForWorkspace(workspaceId: WorkspaceId): WorkCardLoopStep | undefined {
  switch (workspaceId) {
    case "work-card-intake":
    case "work-card-planning":
      return "Planning";
    case "work-card-building-review":
      return "Build";
    case "work-card-report-review":
      return "Review & Validation";
    case "work-card-validation":
      return "Review & Validation";
    case "work-card-close":
      return "Close";
    case "work-card-repair":
      return "Repair";
    default:
      return undefined;
  }
}

function phaseMapPhasesFromCanonicalMetadata(workspaceRoot: string) {
  const phaseMap = listPlanningDocuments(workspaceRoot)
    .filter((document) => document.markdownPath.startsWith("planning/project/Phase_Map/PHASE_MAP"))
    .filter((document) => document.effectiveDisposition === "Approved")
    .at(-1);
  const phases = phaseMap?.metadata.canonical?.workflowData.phases;
  if (!Array.isArray(phases)) {
    return [];
  }
  return phases
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return null;
      }
      const phase = entry as Record<string, unknown>;
      if (
        typeof phase.phaseId !== "string" ||
        typeof phase.title !== "string" ||
        typeof phase.order !== "number" ||
        typeof phase.purpose !== "string" ||
        !Array.isArray(phase.dependsOn) ||
        !phase.dependsOn.every((item) => typeof item === "string")
      ) {
        return null;
      }
      return {
        phaseId: phase.phaseId,
        title: phase.title,
        order: phase.order,
        purpose: phase.purpose,
        dependsOn: phase.dependsOn,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .sort((left, right) => left.order - right.order);
}

function findWorkCardTitle(
  workspaceRoot: string,
  phaseId: string,
  workCardId: string,
): string | undefined {
  const documents = listPlanningDocuments(workspaceRoot);
  const formal = documents
    .filter((document) => document.metadata.phaseId === phaseId)
    .filter((document) => document.metadata.workCardId === workCardId)
    .filter((document) => document.metadata.artifactType === "formal-work-card")
    .at(-1);
  const formalCandidate = formal?.metadata.canonical?.workflowData.candidate;
  const formalTitle = titleFromCandidate(formalCandidate);
  if (formalTitle) {
    return formalTitle;
  }

  const workCardPlan = documents
    .filter((document) => document.metadata.phaseId === phaseId)
    .filter((document) => document.metadata.artifactType === "work-card-plan")
    .at(-1);
  const candidates = workCardPlan?.metadata.canonical?.workflowData.candidates;
  if (Array.isArray(candidates)) {
    const candidate = candidates.find((entry) =>
      entry &&
      typeof entry === "object" &&
      !Array.isArray(entry) &&
      (entry as Record<string, unknown>).candidateId === workCardId
    );
    return titleFromCandidate(candidate);
  }
  return formal?.displayFilename;
}

function titleFromCandidate(value: unknown): string | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const title = (value as Record<string, unknown>).title;
  return typeof title === "string" && title.trim() ? title : undefined;
}

function findRepairParentWorkCardId(
  workspaceRoot: string,
  phaseId: string,
  repairId: string,
): string | undefined {
  const documents = listPlanningDocuments(workspaceRoot);
  const repair = documents
    .filter((document) => document.metadata.phaseId === phaseId)
    .filter((document) => document.metadata.workCardId === repairId)
    .filter((document) => document.metadata.artifactType === "repair-work-card")
    .at(-1);
  const repairParent = repair?.metadata.canonical?.workflowData.parentWorkCardId ??
    repair?.metadata.canonical?.workflowData.originalParentWorkCardId ??
    repair?.metadata.canonical?.identity.parentWorkCardId;
  if (typeof repairParent === "string" && repairParent.trim()) {
    return repairParent;
  }

  const handoff = documents
    .filter((document) => document.metadata.phaseId === phaseId)
    .filter((document) => document.metadata.canonical?.workflowData.handoffKind === "repair")
    .filter((document) => document.metadata.canonical?.workflowData.repairId === repairId)
    .at(-1);
  const handoffParent = handoff?.metadata.canonical?.workflowData.originalParentWorkCardId;
  return typeof handoffParent === "string" && handoffParent.trim()
    ? handoffParent
    : undefined;
}

function workCardDispositionOrState(
  workspaceRoot: string,
  model: CurrentWorkspaceCoreModel,
  workCardId: string,
  repairId: string | undefined,
): string {
  const selectedId = repairId ?? workCardId;
  const document = listPlanningDocuments(workspaceRoot)
    .filter((candidate) => candidate.metadata.phaseId === model.currentPhaseId)
    .filter((candidate) => candidate.metadata.workCardId === selectedId)
    .filter((candidate) => dispositionDocumentMatchesWorkspace(candidate.metadata.artifactType, model.activeWorkspaceId))
    .at(-1);
  if (document) {
    return document.effectiveDisposition;
  }
  return model.eligibility;
}

function dispositionDocumentMatchesWorkspace(
  artifactType: string | undefined,
  workspaceId: WorkspaceId,
): boolean {
  switch (workspaceId) {
    case "work-card-planning":
      return artifactType === "formal-work-card";
    case "work-card-building-review":
      return false;
    case "work-card-report-review":
      return artifactType === "implementer-report";
    case "work-card-validation":
    case "work-card-close":
      return artifactType === "validation-record";
    case "work-card-repair":
      return artifactType === "repair-work-card" || artifactType === "generated-handoff";
    default:
      return false;
  }
}

function isRepairWorkspace(workspaceId: WorkspaceId, workCardId: string): boolean {
  return workspaceId === "work-card-repair" || /-REPAIR\d+$/i.test(workCardId);
}

export function generateCurrentHandoff(workspaceRoot: string): RuntimeActionResult {
  const model = getCurrentWorkspaceModel(workspaceRoot);
  const payload = (() => {
    switch (model.activeWorkspaceId) {
      case "project-planning-review":
        return generateProjectPlanningHandoff(workspaceRoot);
      case "project-phase-map":
        return generatePhaseMapHandoff(workspaceRoot);
      case "phase-interview":
        return generatePhaseInterviewHandoff(workspaceRoot);
      case "phase-planning-bundle":
        return generatePhasePlanningHandoff(workspaceRoot);
      case "phase-work-card-selection":
        return selectNextWorkCardCandidate(workspaceRoot, requirePhaseId(model));
      case "work-card-planning":
        if (model.workCardIntake) {
          return generateWorkCardIntakeHandoff(workspaceRoot, requirePhaseId(model));
        }
        throw new Error(`Current workflow step does not authorize a handoff action: ${model.activeWorkspaceId}`);
      case "work-card-intake":
        return generateWorkCardIntakeHandoff(workspaceRoot, requirePhaseId(model));
      case "work-card-building-review":
        return createImplementerReportForApprovedWorkCard(
          workspaceRoot,
          requirePhaseId(model),
          requireWorkCardId(model),
        );
      default:
        throw new Error(`Current workflow step does not authorize a handoff action: ${model.activeWorkspaceId}`);
    }
  })();
  return runtimeResult("currentWorkflow:generateHandoff", "Current handoff action completed.", payload);
}

export function getCloseReturnSelectionProjection(workspaceRoot: string): RuntimeActionResult {
  const context = resolveCloseReturnSelectionContext(workspaceRoot);
  const selection = selectNextWorkCardCandidate(workspaceRoot, context.phaseId);
  const payload: CloseReturnSelectionProjection = selection.state === "selected"
    ? {
        state: "selected",
        phaseId: context.phaseId,
        closedWorkCardId: context.workCardId,
        close: context.close,
        selectionReason:
          selection.explanations.find((entry) => entry.candidateId === selection.selectedCandidate.candidateId)?.reason ??
          "Candidate is eligible.",
        workCardIntake: getWorkCardIntakeProjection(workspaceRoot, context.phaseId),
        explanations: selection.explanations,
      }
    : {
        state: selection.state,
        phaseId: selection.phaseId,
        closedWorkCardId: context.workCardId,
        close: context.close,
        reason: selection.reason,
        explanations: selection.explanations,
      };
  return runtimeResult(
    "currentWorkflow:getCloseReturnSelectionProjection",
    "Close-return Work Card selection loaded.",
    payload,
  );
}

export function generateCloseReturnNextIntakeHandoff(workspaceRoot: string): RuntimeActionResult {
  const context = resolveCloseReturnSelectionContext(workspaceRoot);
  const selection = selectNextWorkCardCandidate(workspaceRoot, context.phaseId);
  if (selection.state !== "selected") {
    throw new Error(`No eligible Work Card candidate is available after close return: ${selection.state}`);
  }
  const payload = generateWorkCardIntakeHandoff(workspaceRoot, context.phaseId);
  return runtimeResult(
    "currentWorkflow:generateCloseReturnNextIntakeHandoff",
    "Close-return Work Card Intake handoff created.",
    payload,
  );
}

export function applyCurrentDisposition(
  workspaceRoot: string,
  status: DocumentDispositionStatus,
  operatorReviewNotes = "",
  targetWorkspaceId?: WorkspaceId,
): RuntimeActionResult {
  const model = getCurrentWorkspaceModel(workspaceRoot);
  const dispositionWorkspaceId = targetWorkspaceId ?? model.activeWorkspaceId;
  const payload = (() => {
    switch (dispositionWorkspaceId) {
      case "architect-interview":
      case "project-planning-review":
      case "project-phase-map":
      case "phase-interview":
      case "phase-planning-bundle":
      case "work-card-planning":
      case "work-card-repair":
        throw new Error("Catalog Architect-output workspaces must use architectOutput:review.");
      case "work-card-building-review":
        throw new Error("Implementer Build does not authorize report disposition. Open Review & Validation.");
      case "work-card-report-review":
        throw new Error("Review & Validation does not authorize Implementer Report disposition. Use the Operator validation decision controls.");
      case "work-card-validation":
        return setValidationRecordDisposition(
          workspaceRoot,
          requirePhaseId(model),
          requireWorkCardId(model),
          status,
        );
      case "phase-validation":
      case "phase-close":
        return setPhaseCloseoutDisposition(workspaceRoot, requirePhaseId(model), status);
      case "project-validation":
      case "project-close":
        return setProjectCloseoutDisposition(workspaceRoot, status);
      default:
        throw new Error(`Current workflow step does not authorize disposition: ${dispositionWorkspaceId}`);
    }
  })();
  return runtimeResult("currentWorkflow:applyDisposition", `Current disposition applied: ${status}.`, payload);
}

export function resolveCurrentAdvisoryReviewPrompt(workspaceRoot: string): {
  instruction: string;
  result: RuntimeActionResult;
} {
  const model = getCurrentWorkspaceModel(workspaceRoot);
  if (model.activeWorkspaceId !== "work-card-report-review") {
    throw new Error("Current workflow step must be Review & Validation to copy an advisory Architect prompt.");
  }
  const payload = buildAdvisoryArchitectReviewPrompt(
    workspaceRoot,
    requirePhaseId(model),
    requireWorkCardId(model),
  );
  return {
    instruction: payload.instruction,
    result: runtimeResult(
      "currentWorkflow:copyAdvisoryReviewPrompt",
      "Advisory Architect review prompt copied.",
      {
        formalWorkCardPath: payload.formalWorkCardPath,
        formalWorkCardRevision: payload.formalWorkCardRevision,
        formalWorkCardSha256: payload.formalWorkCardSha256,
        implementerReportPath: payload.implementerReportPath,
        implementerReportRevision: payload.implementerReportRevision,
        implementerReportSha256: payload.implementerReportSha256,
      },
    ),
  };
}

export function applyOperatorValidationDecisionForCurrentWorkCard(
  workspaceRoot: string,
  input: OperatorValidationDecisionInput,
): RuntimeActionResult {
  const model = getCurrentWorkspaceModel(workspaceRoot);
  if (model.activeWorkspaceId !== "work-card-report-review") {
    throw new Error("Current workflow step must be Review & Validation to apply an Operator validation decision.");
  }
  const payload = applyOperatorValidationDecision(
    workspaceRoot,
    requirePhaseId(model),
    requireWorkCardId(model),
    input,
  );
  return runtimeResult(
    "currentWorkflow:applyOperatorValidationDecision",
    input.decision === "ValidatePassed"
      ? "Operator validation recorded as passed."
      : "Operator repair request recorded.",
    payload,
  );
}

export function createValidationAttemptForCurrentWorkCard(workspaceRoot: string): RuntimeActionResult {
  const model = getCurrentWorkspaceModel(workspaceRoot);
  if (model.activeWorkspaceId !== "work-card-validation") {
    throw new Error("Current workflow step must be Work Card Validation to create a validation attempt.");
  }
  const payload = createValidationAttempt(workspaceRoot, requirePhaseId(model), requireWorkCardId(model));
  return runtimeResult("currentWorkflow:createValidationAttempt", "Validation attempt created for the current Work Card.", payload);
}

export function createRepairForCurrentFailure(
  workspaceRoot: string,
  defect: string,
): RuntimeActionResult {
  const trimmedDefect = defect.trim();
  if (!trimmedDefect) {
    throw new Error("Repair defect is required.");
  }
  const evidence = latestRevisionRequestedEvidence(workspaceRoot);
  const payload = createRepairWorkCard(
    workspaceRoot,
    evidence.phaseId,
    evidence.workCardId,
    evidence.path,
    evidence.origin,
    trimmedDefect,
  );
  return runtimeResult("currentWorkflow:createRepair", "Repair handoff created from current RevisionRequested evidence.", payload);
}

export function createPhaseCloseoutForCurrentPhase(
  workspaceRoot: string,
  closureDecision: ClosureDecision,
  rationale: string,
): RuntimeActionResult {
  const model = getCurrentWorkspaceModel(workspaceRoot);
  const phaseId = requirePhaseId(model);
  const payload = createPhaseCloseout(workspaceRoot, phaseId, closureDecision, rationale);
  return runtimeResult("currentWorkflow:createPhaseCloseout", "Phase closeout created for the current phase.", payload);
}

export function createProjectCloseoutForCurrentProject(
  workspaceRoot: string,
  closureDecision: ClosureDecision,
  rationale: string,
): RuntimeActionResult {
  const payload = createProjectCloseout(workspaceRoot, closureDecision, rationale);
  return runtimeResult("currentWorkflow:createProjectCloseout", "Project closeout created.", payload);
}

export function getCurrentCloseProjection(workspaceRoot: string): RuntimeActionResult {
  const model = getCurrentWorkspaceModel(workspaceRoot);
  if (model.activeWorkspaceId === "work-card-close") {
    return runtimeResult(
      "currentWorkflow:getWorkCardCloseProjection",
      "Work Card close projection loaded.",
      getWorkCardCloseProjection(workspaceRoot, requirePhaseId(model), requireWorkCardId(model)),
    );
  }
  if (model.activeWorkspaceId === "phase-close") {
    return runtimeResult(
      "currentWorkflow:getPhaseCloseProjection",
      "Phase close projection loaded.",
      getPhaseCloseProjection(workspaceRoot, requirePhaseId(model)),
    );
  }
  return runtimeResult(
    "currentWorkflow:getProjectCloseProjection",
    "Project close projection loaded.",
    getProjectCloseProjection(workspaceRoot),
  );
}

function resolveCloseReturnSelectionContext(workspaceRoot: string): {
  phaseId: string;
  workCardId: string;
  close: WorkCardCloseProjection;
} {
  const model = getCurrentWorkspaceModel(workspaceRoot);
  if (model.activeWorkspaceId !== "work-card-close") {
    throw new Error(`Close-return selection requires current Work Card Close authority; current workspace is ${model.activeWorkspaceId}.`);
  }
  const phaseId = requirePhaseId(model);
  const workCardId = requireWorkCardId(model);
  const close = getWorkCardCloseProjection(workspaceRoot, phaseId, workCardId);
  if (!close.closed || close.returnTarget !== "phase-work-card-selection") {
    throw new Error(close.reason);
  }
  return { phaseId, workCardId, close };
}

function runtimeResult(action: string, message: string, payload?: unknown): RuntimeActionResult {
  return { ok: true, action, message, payload };
}

function requirePhaseId(model: CurrentWorkspaceModel): string {
  if (!model.currentPhaseId) {
    throw new Error(`Current workflow step does not provide phase authority: ${model.activeWorkspaceId}`);
  }
  return model.currentPhaseId;
}

function requireWorkCardId(model: CurrentWorkspaceModel): string {
  if (!model.currentWorkCardId) {
    throw new Error(`Current workflow step does not provide Work Card authority: ${model.activeWorkspaceId}`);
  }
  return model.currentWorkCardId;
}

function latestRevisionRequestedEvidence(workspaceRoot: string): {
  phaseId: string;
  workCardId: string;
  path: string;
  origin: "preValidationReportReview" | "postValidationRecord";
} {
  const candidates = listPlanningDocuments(workspaceRoot)
    .filter((document) => document.effectiveDisposition === "RevisionRequested")
    .map((document) => {
      const path = document.markdownPath;
      const normalizedPath = path.replace(/\\/g, "/");
      const phaseId = normalizedPath.match(/planning\/phases\/(phase-\d+)\//i)?.[1];
      const workCardId =
        normalizedPath.match(/IMPLEMENTER_REPORT_([A-Z0-9-]+)/i)?.[1] ??
        normalizedPath.match(/VALIDATION_RECORD_([A-Z0-9-]+)_ATTEMPT/i)?.[1];
      const origin: "preValidationReportReview" | "postValidationRecord" =
        normalizedPath.toLowerCase().includes("/implementer_reports/")
          ? "preValidationReportReview"
          : "postValidationRecord";
      return phaseId && workCardId && path
        ? { phaseId, workCardId, path, origin }
        : null;
    })
    .filter((value): value is NonNullable<typeof value> => Boolean(value));

  const candidate = candidates.at(-1);
  if (!candidate) {
    throw new Error("Current RevisionRequested report or validation record evidence is required.");
  }
  return candidate;
}

function expectedOutputForWorkspace(workspaceId: WorkspaceId): string {
  switch (workspaceId) {
    case "project-planning-review":
    case "project-phase-map":
    case "phase-interview":
    case "phase-planning-bundle":
    case "work-card-intake":
      return "Approved handoff only; Architect supplies the substantive pending output through the connected review path.";
    case "work-card-planning":
      return "Formal Work Card disposition for the current selected Work Card.";
    case "work-card-building-review":
      return "Codex Implementer execution against the current Approved Work Card and Pending Implementer Report.";
    case "work-card-report-review":
      return "Advisory Architect review and Operator validation decision for the current Implementer Report.";
    case "work-card-validation":
      return "Legacy Validation Record review evidence for the current Work Card.";
    case "work-card-repair":
      return "Repair handoff derived from current RevisionRequested evidence.";
    default:
      return "Disposition or closeout action for the current lifecycle document.";
  }
}

function expectedNextStateForWorkspace(workspaceId: WorkspaceId): string {
  switch (workspaceId) {
    case "work-card-planning":
      return "Approved Work Card advances to Implementer building review.";
    case "work-card-building-review":
      return "Pending Implementer Report advances to Review & Validation.";
    case "work-card-report-review":
      return "Approved Validation Record advances to close/next; RevisionRequested Validation Record enables Repair.";
    case "work-card-validation":
      return "Approved Validation Record advances toward Work Card close.";
    default:
      return "Refresh resolves the next non-approved lifecycle document.";
  }
}
