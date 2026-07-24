import type { DocumentDispositionStatus } from "./documentDisposition";
import type { PlanningDocumentSummary } from "./planningDocument";
import {
  classifyLifecycleArtifact,
  isSemanticallyComplete,
  type LifecycleArtifactClassification,
} from "./lifecycleArtifact";
import {
  evaluateFreshnessFromSummaries,
  type FreshnessSourceDiagnostic,
} from "./sourceFreshness";
import { type WorkspaceDocument, assignDocumentsToWorkspaces } from "../workspaces/documentWorkspace";
import { type WorkspaceId, type WorkspaceLabel, workspaceDefinitions } from "../workspaceContracts";
import type { LifecycleLocation } from "../lifecycle/nestedLifecycle";
import { analyzeProjectIntakeCorpus } from "../projectIntake/projectIntakeCorpus";

export interface ResolvedCurrentDocument {
  logicalDocumentId: string;
  owningWorkspaceId: WorkspaceId;
  owningWorkspace: WorkspaceLabel;
  lifecycleLocation: LifecycleLocation;
  participationRole: LifecycleArtifactClassification["participationRole"];
  artifactType: string;
  reason: string;
  evidencePaths: string[];
  freshnessState: "fresh" | "stale";
  staleSources: FreshnessSourceDiagnostic[];
  selectedPhaseId?: string;
  selectedWorkCardId?: string;
  markdownPath?: string;
  jsonPath?: string;
  displayTitle: string;
  effectiveDisposition: DocumentDispositionStatus;
  orderPosition: number;
  totalDocumentCount: number;
}

export type FirstNonApprovedResult =
  | {
      status: "pre-intake";
      activeWorkspaceId: "project-intake-capture";
      message: "Project Intake has not been captured";
      totalDocumentCount: number;
      reason: string;
    }
  | {
      status: "project-intake-conflict";
      activeWorkspaceId: "project-intake-capture";
      message: "Multiple canonical Project Intake documents require resolution";
      totalDocumentCount: number;
      reason: string;
      sourceEvidence: string[];
    }
  | {
      status: "project-intake-incomplete";
      activeWorkspaceId: "project-intake-capture";
      message: "Project Intake artifact generation is incomplete";
      totalDocumentCount: number;
      reason: string;
      sourceEvidence: string[];
      expectedOutput: string;
    }
  | {
      status: "waiting-for-architect-interview";
      activeWorkspaceId: "architect-interview";
      message: "Waiting for Project Architect Interview output";
      totalDocumentCount: number;
      reason: string;
      sourceEvidence: string[];
      promptLogicalDocumentId: string;
      expectedOutputPaths: {
        markdown: string;
        json: string;
      };
    }
  | {
      status: "current";
      document: ResolvedCurrentDocument;
    }
  | {
      status: "all-approved";
      message: "All planning documents approved";
      totalDocumentCount: number;
      reason: string;
    };

const stageOrder = new Map<WorkspaceId, number>(
  workspaceDefinitions.map((definition, index) => [definition.id, index]),
);

export function orderPlanningDocuments(
  documents: PlanningDocumentSummary[],
): WorkspaceDocument[] {
  return assignDocumentsToWorkspaces(documents).sort(comparePlanningDocuments);
}

export function comparePlanningDocuments(
  left: WorkspaceDocument,
  right: WorkspaceDocument,
): number {
  const leftScope = getPlanningScope(left);
  const rightScope = getPlanningScope(right);

  if (leftScope === "project" || rightScope === "project") {
    return (
      compareNumber(scopeRank(leftScope), scopeRank(rightScope)) ||
      compareNumber(getProjectCategory(left), getProjectCategory(right)) ||
      getNormalizedPath(left).localeCompare(getNormalizedPath(right), "en", { sensitivity: "base" })
    );
  }

  const leftPhaseNumber = getPhaseNumber(left);
  const rightPhaseNumber = getPhaseNumber(right);
  const leftNumbered = leftPhaseNumber < 9999;
  const rightNumbered = rightPhaseNumber < 9999;

  if (!leftNumbered || !rightNumbered) {
    return (
      compareNumber(leftNumbered ? 0 : 1, rightNumbered ? 0 : 1) ||
      getNormalizedPath(left).localeCompare(getNormalizedPath(right), "en", { sensitivity: "base" })
    );
  }

  return (
    compareNumber(leftPhaseNumber, rightPhaseNumber) ||
    compareNumber(getStageRank(left), getStageRank(right)) ||
    compareNumber(getWithinPhaseCategory(left), getWithinPhaseCategory(right)) ||
    compareNumber(getWorkCardNumber(left), getWorkCardNumber(right)) ||
    compareNumber(getRepairNumber(left), getRepairNumber(right)) ||
    compareNumber(getValidationEvidenceCategory(left), getValidationEvidenceCategory(right)) ||
    compareNumber(getArchiveRank(left), getArchiveRank(right)) ||
    getNormalizedPath(left).localeCompare(getNormalizedPath(right), "en", { sensitivity: "base" })
  );
}

export function resolveFirstNonApproved(
  documents: PlanningDocumentSummary[],
): FirstNonApprovedResult {
  const ordered = orderPlanningDocuments(documents);
  const projectIntakeCorpus = analyzeProjectIntakeCorpus(ordered);
  if (projectIntakeCorpus.state === "conflict") {
    return {
      status: "project-intake-conflict",
      activeWorkspaceId: "project-intake-capture",
      message: "Multiple canonical Project Intake documents require resolution",
      totalDocumentCount: ordered.length,
      sourceEvidence: projectIntakeCorpus.evidencePaths,
      reason: `Resolve multiple canonical Project Intake documents before continuing: ${projectIntakeCorpus.evidencePaths.join("; ")}.`,
    };
  }
  if (projectIntakeCorpus.state === "open") {
    return {
      status: "pre-intake",
      activeWorkspaceId: "project-intake-capture",
      message: "Project Intake has not been captured",
      totalDocumentCount: ordered.length,
      reason: "The active repository does not contain canonical Project Intake evidence. Capture Project Intake to begin the lifecycle.",
    };
  }

  const projectIntakeContinuation = resolveProjectIntakeContinuation(ordered);
  if (projectIntakeContinuation) {
    return projectIntakeContinuation;
  }

  const currentIndex = ordered.findIndex((document) =>
    isCurrentLifecycleDocument(document, ordered),
  );

  if (currentIndex === -1) {
    return {
      status: "all-approved",
      message: "All planning documents approved",
      totalDocumentCount: ordered.length,
      reason: "All gating lifecycle documents are Approved or semantically complete; non-review handoffs, context-only records, and historical records do not block progression.",
    };
  }

  const document = ordered[currentIndex];
  const classification = classifyLifecycleArtifact(document);
  return {
    status: "current",
    document: {
      logicalDocumentId: document.logicalDocumentId,
      owningWorkspaceId: classification.workspaceId,
      owningWorkspace: classification.workspaceLabel,
      lifecycleLocation: classification.location,
      participationRole: classification.participationRole,
      artifactType: classification.artifactType,
      reason: currentReason(document, classification, ordered),
      evidencePaths: classification.evidencePaths,
      freshnessState: evaluateFreshnessFromSummaries(document, ordered).state,
      staleSources: evaluateFreshnessFromSummaries(document, ordered).staleSources,
      selectedPhaseId: classification.selectedPhaseId,
      selectedWorkCardId: classification.selectedWorkCardId,
      markdownPath: document.markdownPath,
      jsonPath: document.jsonPath,
      displayTitle: document.displayFilename,
      effectiveDisposition: document.effectiveDisposition,
      orderPosition: currentIndex + 1,
      totalDocumentCount: ordered.length,
    },
  };
}

function resolveProjectIntakeContinuation(
  documents: WorkspaceDocument[],
): Extract<
  FirstNonApprovedResult,
  { status: "project-intake-incomplete" | "waiting-for-architect-interview" }
> | null {
  const intake = documents.find((document) => {
    const classification = classifyLifecycleArtifact(document);
    return (
      classification.artifactType === "project-intake" &&
      classification.participationRole !== "historical" &&
      document.effectiveDisposition === "Approved"
    );
  });
  if (!intake) {
    return null;
  }

  const prompt = documents.find((document) => {
    const classification = classifyLifecycleArtifact(document);
    return (
      classification.artifactType === "generated-handoff" &&
      classification.workspaceId === "architect-interview" &&
      classification.participationRole === "nonReviewHandoff" &&
      getNormalizedPath(document).toLowerCase().includes(
        "planning/project/project_architect_interview_prompts/",
      )
    );
  });
  const intakeEvidence = [intake.markdownPath, intake.jsonPath].filter(
    (value): value is string => Boolean(value),
  );

  if (
    !prompt ||
    prompt.pairStatus !== "paired" ||
    prompt.synchronizationState !== "synchronized" ||
    prompt.effectiveDisposition !== "Approved" ||
    !prompt.metadata.architectOutputTargets
  ) {
    return {
      status: "project-intake-incomplete",
      activeWorkspaceId: "project-intake-capture",
      message: "Project Intake artifact generation is incomplete",
      totalDocumentCount: documents.length,
      sourceEvidence: intakeEvidence,
      expectedOutput: "Approved Project Architect Interview Prompt Markdown/JSON pair with exact Architect Interview output targets.",
      reason: "Approved Project Intake exists, but the required Approved Project Architect Interview Prompt pair or its output-target contract is missing.",
    };
  }

  const targets = prompt.metadata.architectOutputTargets;
  const interview = documents.find((document) =>
    document.markdownPath === targets.markdown || document.jsonPath === targets.json,
  );
  if (interview) {
    return null;
  }

  return {
    status: "waiting-for-architect-interview",
    activeWorkspaceId: "architect-interview",
    message: "Waiting for Project Architect Interview output",
    totalDocumentCount: documents.length,
    promptLogicalDocumentId: prompt.logicalDocumentId,
    sourceEvidence: [
      ...intakeEvidence,
      ...[prompt.markdownPath, prompt.jsonPath].filter((value): value is string => Boolean(value)),
    ],
    expectedOutputPaths: targets,
    reason: "Approved Project Intake and Approved Project Architect Interview Prompt exist; waiting for the Architect-authored Project Architect Interview pair at the canonical targets.",
  };
}

function isCurrentLifecycleDocument(
  document: PlanningDocumentSummary,
  documents: PlanningDocumentSummary[],
): boolean {
  const classification = classifyLifecycleArtifact(document);
  if (
    classification.participationRole === "nonReviewHandoff" ||
    classification.participationRole === "contextOnly" ||
    classification.participationRole === "historical"
  ) {
    return false;
  }

  if (evaluateFreshnessFromSummaries(document, documents).state === "stale") {
    return true;
  }

  return !isSemanticallyComplete(document);
}

function currentReason(
  document: PlanningDocumentSummary,
  classification: LifecycleArtifactClassification,
  documents: PlanningDocumentSummary[],
): string {
  const location = `${classification.location.level} / ${classification.location.stage}`;
  const freshness = evaluateFreshnessFromSummaries(document, documents);
  if (freshness.state === "stale") {
    const stale = freshness.staleSources
      .map((source) =>
        source.state === "missing"
          ? `${source.path} missing; expected revision ${source.expectedRevision}`
          : `${source.path} expected revision ${source.expectedRevision}, current revision ${source.currentRevision ?? "missing"}`,
      )
      .join("; ");
    return `${classification.workspaceLabel} is current at ${location} because ${classification.artifactType} evidence is stale: ${stale}.`;
  }

  if (document.readError) {
    return `${classification.workspaceLabel} is current at ${location} because ${classification.artifactType} evidence could not be read: ${document.readError}`;
  }

  if (
    classification.artifactType.endsWith("closeout") &&
    document.effectiveDisposition === "Approved"
  ) {
    return `${classification.workspaceLabel} is current at ${location} because the closeout is Approved with closureDecision=${document.metadata.closureDecision ?? "missing"}, so Close is not complete.`;
  }

  return `${classification.workspaceLabel} is current at ${location} because ${classification.artifactType} evidence is ${document.effectiveDisposition}, not semantically complete.`;
}

function getProjectCategory(document: WorkspaceDocument): number {
  if (getPlanningScope(document) !== "project") {
    return 0;
  }

  const value = getSearchValue(document);
  if (isProjectIntakeArtifact(value)) {
    return 1;
  }
  if (value.includes("project_architect")) {
    return 2;
  }
  if (value.includes("project_planning")) {
    return 3;
  }
  if (value.includes("project_roadmap")) {
    return 4;
  }
  if (value.includes("phase_map")) {
    return 5;
  }
  return 6;
}

function getPhaseNumber(document: WorkspaceDocument): number {
  const match = getNormalizedPath(document).match(/phase-(\d+)/i);
  return match ? Number(match[1]) : 9999;
}

function getPlanningScope(document: WorkspaceDocument): "project" | "phase" {
  const value = getSearchValue(document);
  if (value.includes("planning/phases/") || value.includes("planning/archive/phases/")) {
    return "phase";
  }
  return "project";
}

function scopeRank(scope: "project" | "phase"): number {
  return scope === "project" ? 0 : 1;
}

function getStageRank(document: WorkspaceDocument): number {
  if (document.workspaceId === "project-planning-review") {
    return 99;
  }
  return stageOrder.get(document.workspaceId) ?? 99;
}

function getArchiveRank(document: WorkspaceDocument): number {
  return getNormalizedPath(document).includes("/archive/") ||
    getNormalizedPath(document).includes("planning/archive/")
    ? 1
    : 0;
}

function getWithinPhaseCategory(document: WorkspaceDocument): number {
  const value = getSearchValue(document);

  if (document.workspaceId === "phase-planning-bundle") {
    if (value.includes("phase_planning")) {
      return 1;
    }
    if (value.includes("work_card_plan")) {
      return 2;
    }
    return 3;
  }
  if (document.workspaceId === "work-card-planning") {
    return 4;
  }
  if (document.workspaceId === "work-card-validation") {
    return 5;
  }
  if (document.workspaceId === "phase-validation" || document.workspaceId === "phase-close") {
    return 6;
  }
  return 0;
}

function getWorkCardNumber(document: WorkspaceDocument): number {
  const match = getFilename(document).match(/^WC(\d+)/i);
  return match ? Number(match[1]) : 9999;
}

function getRepairNumber(document: WorkspaceDocument): number {
  const filename = getFilename(document);
  if (!/^WC\d+/i.test(filename)) {
    return 9999;
  }

  const match = filename.match(/REPAIR(\d+)/i);
  return match ? Number(match[1]) : 0;
}

function getValidationEvidenceCategory(document: WorkspaceDocument): number {
  const value = getSearchValue(document);
  if (value.includes("implementer_report")) {
    return 1;
  }
  if (value.includes("architect_review")) {
    return 2;
  }
  if (value.includes("validation_report") || value.includes("operator_validation")) {
    return 3;
  }
  if (value.includes("candidate_disposition")) {
    return 4;
  }
  return 5;
}

function getSearchValue(document: WorkspaceDocument): string {
  return getNormalizedPath(document).toLowerCase();
}

function isProjectIntakeArtifact(value: string): boolean {
  return (
    value.includes("planning/project/project_intake/") ||
    value.includes("planning/project/project-intake/")
  );
}

function getNormalizedPath(document: WorkspaceDocument): string {
  return document.markdownPath ?? document.jsonPath ?? document.displayFilename;
}

function getFilename(document: WorkspaceDocument): string {
  const normalizedPath = getNormalizedPath(document);
  return normalizedPath.slice(normalizedPath.lastIndexOf("/") + 1);
}

function compareNumber(left: number, right: number): number {
  return left === right ? 0 : left < right ? -1 : 1;
}
