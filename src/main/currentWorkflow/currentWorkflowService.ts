import type { DocumentDispositionStatus } from "../../shared/documents/documentDisposition";
import type {
  ClosureDecision,
  CurrentWorkspaceModel,
  ExecutionContextPhaseProjection,
  ExecutionContextProjection,
  ExecutionContextWorkCardProjection,
  PhaseLoopStep,
  RuntimeActionResult,
  WorkCardLoopStep,
  WorkspaceId,
} from "../../shared/workspaceContracts";
import { resolveFirstNonApprovedDocument } from "../documents/firstNonApprovedResolver";
import { listPlanningDocuments } from "../documents/planningDocumentService";
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
import { setImplementerReportDisposition } from "../workCardBuilding/workCardBuildingReviewService";
import {
  createValidationAttempt,
  getWorkCardCloseProjection,
  setValidationRecordDisposition,
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
  return {
    ...model,
    executionContext: buildExecutionContextProjection(workspaceRoot, model),
  };
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
  const report = documents
    .find((document) => document.markdownPath.startsWith(`planning/phases/${phaseId}/Implementer_Reports/IMPLEMENTER_REPORT_${workCardId}`));
  if (report) {
    return null;
  }
  return {
    activeWorkspaceId: "work-card-building-review",
    level: "work-card",
    stage: "building",
    currentPhaseId: phaseId,
    currentWorkCardId: workCardId,
    currentTarget: "Implementer Handoff and Report Review",
    sourceEvidence: [formal.markdownPath],
    requiredAction: "Approved Formal Work Card is available for Implementer handoff and report review.",
    expectedOutput: `Implementer Report Markdown for ${workCardId}.`,
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
      return "Build / Review";
    case "work-card-validation":
      return "Validation";
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
      default:
        throw new Error(`Current workflow step does not authorize a handoff action: ${model.activeWorkspaceId}`);
    }
  })();
  return runtimeResult("currentWorkflow:generateHandoff", "Current handoff action completed.", payload);
}

export function applyCurrentDisposition(
  workspaceRoot: string,
  status: DocumentDispositionStatus,
): RuntimeActionResult {
  const model = getCurrentWorkspaceModel(workspaceRoot);
  const payload = (() => {
    switch (model.activeWorkspaceId) {
      case "architect-interview":
      case "project-planning-review":
      case "project-phase-map":
      case "phase-interview":
      case "phase-planning-bundle":
      case "work-card-planning":
      case "work-card-repair":
        throw new Error("Catalog Architect-output workspaces must use architectOutput:review.");
      case "work-card-building-review":
        return setImplementerReportDisposition(
          workspaceRoot,
          requirePhaseId(model),
          requireWorkCardId(model),
          status,
        );
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
        throw new Error(`Current workflow step does not authorize disposition: ${model.activeWorkspaceId}`);
    }
  })();
  return runtimeResult("currentWorkflow:applyDisposition", `Current disposition applied: ${status}.`, payload);
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
      return "Implementer-authored report review disposition.";
    case "work-card-validation":
      return "Operator validation attempt or validation disposition for the current Work Card.";
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
      return "Approved Implementer Report advances to Work Card validation.";
    case "work-card-validation":
      return "Approved Validation Record advances toward Work Card close.";
    default:
      return "Refresh resolves the next non-approved lifecycle document.";
  }
}
