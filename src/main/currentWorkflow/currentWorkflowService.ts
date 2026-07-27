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
  setProjectPlanningBundleDisposition,
} from "../projectPlanning/projectPlanningService";
import {
  generatePhaseMapHandoff,
  getPhaseMapProjection,
  setPhaseMapDisposition,
} from "../phaseMap/phaseMapService";
import {
  generatePhaseInterviewHandoff,
  setPhaseInterviewDisposition,
} from "../phaseInterview/phaseInterviewService";
import {
  generatePhasePlanningHandoff,
  setPhasePlanningBundleDisposition,
} from "../phasePlanning/phasePlanningService";
import {
  generateWorkCardIntakeHandoff,
  selectNextWorkCardCandidate,
} from "../workCardIntake/workCardIntakeService";
import { setFormalWorkCardDisposition } from "../workCardPlanning/workCardPlanningService";
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
    const projectPlanning = missingProjectPlanningModel(workspaceRoot);
    if (projectPlanning) {
      return projectPlanning;
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
      const phaseId = path.match(/planning\/phases\/(phase-\d+)\//i)?.[1];
      const workCardId =
        path.match(/IMPLEMENTER_REPORT_([A-Z0-9-]+)/i)?.[1] ??
        path.match(/VALIDATION_RECORD_([A-Z0-9-]+)_ATTEMPT/i)?.[1];
      const origin: "preValidationReportReview" | "postValidationRecord" =
        path.toLowerCase().includes("/implementer_reports/")
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
