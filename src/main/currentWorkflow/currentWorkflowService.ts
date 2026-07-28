import type { DocumentDispositionStatus } from "../../shared/documents/documentDisposition";
import type {
  ClosureDecision,
  CurrentWorkspaceModel,
  RuntimeActionResult,
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
  getPhaseMapProjection,
  setPhaseMapDisposition,
} from "../phaseMap/phaseMapService";
import {
  generatePhaseInterviewHandoff,
  getPhaseIntakeCompletion,
  setPhaseInterviewDisposition,
} from "../phaseInterview/phaseInterviewService";
import {
  generatePhasePlanningHandoff,
  getPhasePlanningCompletion,
  setPhasePlanningBundleDisposition,
} from "../phasePlanning/phasePlanningService";
import {
  generateWorkCardIntakeHandoff,
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
import { createRepairWorkCard } from "../workCardRepair/workCardRepairService";
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

export function getCurrentWorkspaceModel(workspaceRoot: string): CurrentWorkspaceModel {
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
    return {
      activeWorkspaceId: current.activeWorkspaceId,
      level: "project",
      stage: "intake",
      currentTarget: "Architect Interview",
      sourceEvidence: current.sourceEvidence,
      requiredAction: current.reason,
      expectedOutput: `Project Architect Interview Markdown: ${current.expectedOutputPaths.markdown}`,
      eligibility: "Architect Interview prompt is ready for Architect-authored output.",
      expectedNextState: "A Pending Project Architect Interview Markdown document becomes the current review document.",
    };
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

function missingProjectPlanningModel(workspaceRoot: string): CurrentWorkspaceModel | null {
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
  return {
    activeWorkspaceId: "project-planning-review",
    level: "project",
    stage: "planning",
    currentTarget: "Project Planning",
    sourceEvidence: [approvedInterview.markdownPath],
    requiredAction: "Approved Architect Interview is available; generate Project Planning handoff and review Project Profile/Roadmap outputs.",
    expectedOutput: "Project Profile Markdown and Project Roadmap Markdown.",
    eligibility: "Project Planning is ready.",
    expectedNextState: "Project Profile and Project Roadmap become current review documents.",
  };
}

function missingPhaseMapModel(workspaceRoot: string): CurrentWorkspaceModel | null {
  const projectPlanning = getProjectPlanningCompletion(workspaceRoot);
  if (!projectPlanning.complete) {
    return null;
  }
  const phaseMap = listPlanningDocuments(workspaceRoot)
    .find((document) => document.markdownPath.startsWith("planning/project/Phase_Map/PHASE_MAP"));
  if (phaseMap) {
    return null;
  }
  const roadmap = listPlanningDocuments(workspaceRoot)
    .find((document) => document.markdownPath.startsWith("planning/project/Project_Roadmap/PROJECT_ROADMAP_"));
  return {
    activeWorkspaceId: "project-phase-map",
    level: "project",
    stage: "building",
    currentTarget: "Phase Map",
    sourceEvidence: [roadmap?.markdownPath].filter((value): value is string => Boolean(value)),
    requiredAction: "Approved Project Profile and Project Roadmap are available; generate Phase Map handoff and save Architect Phase Map output.",
    expectedOutput: "Phase Map Markdown with champcity-phase-map domain block.",
    eligibility: "Phase Map is ready.",
    expectedNextState: "Pending Phase Map becomes the current review document.",
  };
}

function missingPhaseInterviewModel(workspaceRoot: string): CurrentWorkspaceModel | null {
  const projection = getPhaseMapProjection(workspaceRoot);
  if (projection.state !== "first-incomplete") {
    return null;
  }
  const phaseId = projection.phase.phaseId;
  const intake = getPhaseIntakeCompletion(workspaceRoot, phaseId);
  if (intake.complete) {
    return null;
  }
  return {
    activeWorkspaceId: "phase-interview",
    level: "phase",
    stage: "intake",
    currentPhaseId: phaseId,
    currentTarget: "Phase Interview",
    sourceEvidence: ["planning/project/Phase_Map"],
    requiredAction: "Current phase is selected; generate Phase Interview handoff and save Architect Phase Interview output.",
    expectedOutput: `Phase Interview Markdown for ${phaseId}.`,
    eligibility: "Phase Interview is ready.",
    expectedNextState: "Pending Phase Interview becomes the current review document.",
  };
}

function missingPhasePlanningModel(workspaceRoot: string): CurrentWorkspaceModel | null {
  const projection = getPhaseMapProjection(workspaceRoot);
  if (projection.state !== "first-incomplete") {
    return null;
  }
  const phaseId = projection.phase.phaseId;
  const intake = getPhaseIntakeCompletion(workspaceRoot, phaseId);
  if (!intake.complete) {
    return null;
  }
  const phasePlanning = listPlanningDocuments(workspaceRoot)
    .find((document) => document.markdownPath === `planning/phases/${phaseId}/Phase_Planning.md`);
  const workCardPlan = listPlanningDocuments(workspaceRoot)
    .find((document) => document.markdownPath === `planning/phases/${phaseId}/Work_Card_Plan.md`);
  if (phasePlanning && workCardPlan) {
    return null;
  }
  return {
    activeWorkspaceId: "phase-planning-bundle",
    level: "phase",
    stage: "planning",
    currentPhaseId: phaseId,
    currentTarget: "Phase Planning",
    sourceEvidence: [`planning/phases/${phaseId}/Phase_Interview.md`],
    requiredAction: "Approved Phase Interview is available; generate Phase Planning handoff and save Phase Planning plus Work Card Plan outputs.",
    expectedOutput: "Phase Planning Markdown and Work Card Plan Markdown with champcity-work-card-plan domain block.",
    eligibility: "Phase Planning is ready.",
    expectedNextState: "Pending Phase Planning bundle becomes the current review target.",
  };
}

function missingWorkCardIntakeOrFormalModel(workspaceRoot: string): CurrentWorkspaceModel | null {
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
  const candidate = selection.selectedCandidate;
  const handoff = listPlanningDocuments(workspaceRoot)
    .filter((document) => document.metadata.artifactType === "work-card-intake-handoff")
    .filter((document) => document.metadata.phaseId === phaseId || document.metadata.canonical?.identity.phaseId === phaseId)
    .filter((document) => document.metadata.workCardId === candidate.candidateId || document.metadata.canonical?.identity.workCardId === candidate.candidateId)
    .filter((document) => document.effectiveDisposition === "Approved")
    .at(-1);
  if (!handoff) {
    return {
      activeWorkspaceId: "work-card-intake",
      level: "phase",
      stage: "planning",
      currentPhaseId: phaseId,
      currentWorkCardId: candidate.candidateId,
      currentTarget: "Work Card Intake",
      sourceEvidence: [`planning/phases/${phaseId}/Work_Card_Plan.md`],
      requiredAction: "Approved Phase Planning bundle is available; generate Work Card Intake handoff.",
      expectedOutput: `Work Card Intake Architect handoff for ${candidate.candidateId}.`,
      eligibility: selection.explanations.find((entry) => entry.candidateId === candidate.candidateId)?.reason ?? "Candidate is eligible.",
      expectedNextState: "Formal Work Card output can be saved from the approved intake handoff.",
    };
  }
  const target = handoff.metadata.canonical?.workflowData.formalWorkCardTarget;
  const formal = typeof target === "string"
    ? listPlanningDocuments(workspaceRoot).find((document) => document.markdownPath === target)
    : undefined;
  if (formal) {
    return null;
  }
  return {
    activeWorkspaceId: "work-card-planning",
    level: "work-card",
    stage: "planning",
    currentPhaseId: phaseId,
    currentWorkCardId: candidate.candidateId,
    currentTarget: "Formal Work Card",
    sourceEvidence: [handoff.markdownPath],
    requiredAction: "Approved Work Card Intake handoff is available; save Architect Formal Work Card output.",
    expectedOutput: `Formal Work Card Markdown for ${candidate.candidateId}.`,
    eligibility: "Formal Work Card output is ready to import.",
    expectedNextState: "Pending Formal Work Card becomes the current review document.",
  };
}

function missingImplementerReportModel(workspaceRoot: string): CurrentWorkspaceModel | null {
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

function missingRepairWorkCardModel(workspaceRoot: string): CurrentWorkspaceModel | null {
  const handoff = listPlanningDocuments(workspaceRoot)
    .filter((document) => document.metadata.artifactType === "generated-handoff")
    .filter((document) => document.metadata.canonical?.workflowData.handoffKind === "repair")
    .filter((document) => document.effectiveDisposition === "Approved")
    .at(-1);
  const target = handoff?.metadata.canonical?.workflowData.repairWorkCardTarget;
  if (!handoff || typeof target !== "string") {
    return null;
  }
  const repair = listPlanningDocuments(workspaceRoot).find((document) => document.markdownPath === target);
  if (repair) {
    return null;
  }
  const phaseId = typeof handoff.metadata.canonical?.identity.phaseId === "string"
    ? handoff.metadata.canonical.identity.phaseId
    : undefined;
  const repairId = typeof handoff.metadata.canonical?.workflowData.repairId === "string"
    ? handoff.metadata.canonical.workflowData.repairId
    : undefined;
  return {
    activeWorkspaceId: "work-card-repair",
    level: "work-card",
    stage: "repair",
    currentPhaseId: phaseId,
    currentWorkCardId: repairId,
    currentTarget: "Repair Work Card",
    sourceEvidence: [handoff.markdownPath],
    requiredAction: "Approved Repair Architect handoff is available; save Architect Repair Work Card output.",
    expectedOutput: "Repair Work Card Markdown.",
    eligibility: "Repair Work Card output is ready to import.",
    expectedNextState: "Pending Repair Work Card becomes reviewable and remains owned by its parent.",
  };
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
      case "work-card-intake":
        return generateWorkCardIntakeHandoff(workspaceRoot, requirePhaseId(model));
      default:
        throw new Error(`Current workspace does not authorize a handoff action: ${model.activeWorkspaceId}`);
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
        return setArchitectInterviewDisposition(workspaceRoot, status);
      case "project-planning-review":
        return setProjectPlanningBundleDisposition(workspaceRoot, status);
      case "project-phase-map":
        return setPhaseMapDisposition(workspaceRoot, status);
      case "phase-interview":
        return setPhaseInterviewDisposition(workspaceRoot, requirePhaseId(model), status);
      case "phase-planning-bundle":
        return setPhasePlanningBundleDisposition(workspaceRoot, requirePhaseId(model), status);
      case "work-card-planning":
        return setFormalWorkCardDisposition(
          workspaceRoot,
          requirePhaseId(model),
          requireWorkCardId(model),
          status,
        );
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
        throw new Error(`Current workspace does not authorize disposition: ${model.activeWorkspaceId}`);
    }
  })();
  return runtimeResult("currentWorkflow:applyDisposition", `Current disposition applied: ${status}.`, payload);
}

export function createValidationAttemptForCurrentWorkCard(workspaceRoot: string): RuntimeActionResult {
  const model = getCurrentWorkspaceModel(workspaceRoot);
  if (model.activeWorkspaceId !== "work-card-validation") {
    throw new Error("Current workspace must be Work Card Validation to create a validation attempt.");
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
    throw new Error(`Current workspace does not provide phase authority: ${model.activeWorkspaceId}`);
  }
  return model.currentPhaseId;
}

function requireWorkCardId(model: CurrentWorkspaceModel): string {
  if (!model.currentWorkCardId) {
    throw new Error(`Current workspace does not provide Work Card authority: ${model.activeWorkspaceId}`);
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
