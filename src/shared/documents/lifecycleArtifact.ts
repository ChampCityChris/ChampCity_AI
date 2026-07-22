import type { LifecycleLocation } from "../lifecycle/nestedLifecycle";
import type { WorkspaceId, WorkspaceLabel } from "../workspaceContracts";
import {
  resolverWorkspaceDefinitions,
  type WorkspaceDefinition,
} from "../workspaceContracts";
import { getWorkspaceById } from "../workspaces/workspaceRegistry";
import type { PlanningDocumentSummary } from "./planningDocument";

export type ParticipationRole =
  | "gatingReview"
  | "compoundGatingReview"
  | "nonReviewHandoff"
  | "contextOnly"
  | "historical";

export interface LifecycleArtifactClassification {
  artifactType: string;
  participationRole: ParticipationRole;
  workspaceId: WorkspaceId;
  workspaceLabel: WorkspaceLabel;
  location: LifecycleLocation;
  selectedPhaseId?: string;
  selectedWorkCardId?: string;
  evidencePaths: string[];
}

export function classifyLifecycleArtifact(
  document: PlanningDocumentSummary,
): LifecycleArtifactClassification {
  const evidencePaths = [document.markdownPath, document.jsonPath].filter(
    (value): value is string => Boolean(value),
  );
  const normalized = [document.markdownPath, document.jsonPath, document.displayFilename]
    .filter(Boolean)
    .join("/")
    .toLowerCase();
  const metadataRole = toParticipationRole(document.metadata.participationRole);
  const selectedPhaseId = document.metadata.phaseId ?? derivePhaseId(normalized);
  const selectedWorkCardId = document.metadata.workCardId ?? deriveWorkCardId(normalized);

  if (normalized.includes("planning/archive/")) {
    return classification("historical-artifact", metadataRole ?? "historical", "project-planning-review", evidencePaths, selectedPhaseId, selectedWorkCardId);
  }

  if (isContextOnly(normalized)) {
    return classification("context-document", metadataRole ?? "contextOnly", "project-planning-review", evidencePaths, selectedPhaseId, selectedWorkCardId);
  }

  if (isGeneratedHandoff(normalized)) {
    return classification("generated-handoff", "nonReviewHandoff", handoffWorkspace(normalized), evidencePaths, selectedPhaseId, selectedWorkCardId);
  }

  if (isProjectIntake(normalized)) {
    return classification("project-intake", metadataRole ?? "gatingReview", "project-intake-capture", evidencePaths, selectedPhaseId, selectedWorkCardId);
  }

  if (normalized.includes("project_architect_interview")) {
    return classification("project-architect-interview", metadataRole ?? "gatingReview", "architect-interview", evidencePaths, selectedPhaseId, selectedWorkCardId);
  }

  if (normalized.includes("project_profile") || normalized.includes("project_roadmap")) {
    return classification("project-planning-bundle-member", metadataRole ?? "compoundGatingReview", "project-planning-review", evidencePaths, selectedPhaseId, selectedWorkCardId);
  }

  if (normalized.includes("phase_map")) {
    return classification("phase-map", metadataRole ?? "gatingReview", "project-phase-map", evidencePaths, selectedPhaseId, selectedWorkCardId);
  }

  if (normalized.includes("project_closeout")) {
    return classification("project-closeout", metadataRole ?? "compoundGatingReview", closeoutWorkspace(document, "project-validation", "project-close"), evidencePaths, selectedPhaseId, selectedWorkCardId);
  }

  if (normalized.includes("phase_closeout")) {
    return classification("phase-closeout", metadataRole ?? "compoundGatingReview", closeoutWorkspace(document, "phase-validation", "phase-close"), evidencePaths, selectedPhaseId, selectedWorkCardId);
  }

  if (normalized.includes("phase_interview")) {
    return classification("phase-interview", metadataRole ?? "gatingReview", "phase-interview", evidencePaths, selectedPhaseId, selectedWorkCardId);
  }

  if (normalized.includes("phase_planning") || normalized.includes("work_card_plan")) {
    return classification("phase-planning-bundle-member", metadataRole ?? "compoundGatingReview", "phase-planning-bundle", evidencePaths, selectedPhaseId, selectedWorkCardId);
  }

  if (normalized.includes("/implementer_reports/")) {
    return classification("implementer-report", metadataRole ?? "gatingReview", "work-card-building-review", evidencePaths, selectedPhaseId, selectedWorkCardId);
  }

  if (normalized.includes("/validation_reports/") || normalized.includes("operator_validation")) {
    return classification("validation-record", metadataRole ?? "gatingReview", "work-card-validation", evidencePaths, selectedPhaseId, selectedWorkCardId);
  }

  if (normalized.includes("/work_cards/") || /^wc\d+/i.test(document.displayFilename)) {
    return classification(
      normalized.includes("repair") ? "repair-work-card" : "formal-work-card",
      metadataRole ?? "gatingReview",
      normalized.includes("repair") ? "work-card-repair" : "work-card-planning",
      evidencePaths,
      selectedPhaseId,
      selectedWorkCardId,
    );
  }

  return classification("planning-document", metadataRole ?? "gatingReview", "project-planning-review", evidencePaths, selectedPhaseId, selectedWorkCardId);
}

export function isSemanticallyComplete(document: PlanningDocumentSummary): boolean {
  const classification = classifyLifecycleArtifact(document);
  if (!classification.artifactType.endsWith("closeout")) {
    return document.effectiveDisposition === "Approved";
  }

  return (
    document.effectiveDisposition === "Approved" &&
    normalizeDecision(document.metadata.closureDecision) === "close"
  );
}

function classification(
  artifactType: string,
  participationRole: ParticipationRole,
  workspaceId: WorkspaceId,
  evidencePaths: string[],
  selectedPhaseId?: string,
  selectedWorkCardId?: string,
): LifecycleArtifactClassification {
  const workspace = workspaceDefinition(workspaceId);
  return {
    artifactType,
    participationRole,
    workspaceId: workspace.id,
    workspaceLabel: workspace.label,
    location: workspace.location,
    selectedPhaseId,
    selectedWorkCardId,
    evidencePaths,
  };
}

function workspaceDefinition(workspaceId: WorkspaceId): WorkspaceDefinition {
  const definition = getWorkspaceById(resolverWorkspaceDefinitions, workspaceId);
  if (!definition) {
    throw new Error(`Resolver workspace is not implemented: ${workspaceId}`);
  }
  return definition;
}

function closeoutWorkspace(
  document: PlanningDocumentSummary,
  validationWorkspaceId: WorkspaceId,
  closeWorkspaceId: WorkspaceId,
): WorkspaceId {
  return normalizeDecision(document.metadata.closureDecision) === "close"
    ? closeWorkspaceId
    : validationWorkspaceId;
}

function handoffWorkspace(value: string): WorkspaceId {
  if (value.includes("project_architect_interview")) return "architect-interview";
  if (value.includes("project_planning") || value.includes("project_planning_documents")) return "project-planning-review";
  if (value.includes("phase_map")) return "project-phase-map";
  if (value.includes("phase_interview")) return "phase-interview";
  if (value.includes("phase_planning")) return "phase-planning-bundle";
  if (value.includes("work_card_intake")) return "work-card-intake";
  if (value.includes("repair_architect")) return "work-card-repair";
  return "architect-interview";
}

function isGeneratedHandoff(value: string): boolean {
  return (
    value.includes("/architect_handoffs/") ||
    value.includes("/project_architect_interview_prompts/") ||
    value.includes("project_planning_documents")
  );
}

function isContextOnly(value: string): boolean {
  return (
    value.includes("/design_documents/") ||
    value.includes("/architect_reviews/") ||
    value.includes("/implementation_notes/")
  );
}

function isProjectIntake(value: string): boolean {
  return (
    value.includes("planning/project/project_intake/") ||
    value.includes("planning/project/project-intake/")
  );
}

function derivePhaseId(value: string): string | undefined {
  return value.match(/phase-(\d+)/i)?.[0];
}

function deriveWorkCardId(value: string): string | undefined {
  return value.match(/\bwc\d+[a-z]?(?:-repair\d+)?/i)?.[0]?.toUpperCase();
}

function toParticipationRole(value: string | undefined): ParticipationRole | undefined {
  if (
    value === "gatingReview" ||
    value === "compoundGatingReview" ||
    value === "nonReviewHandoff" ||
    value === "contextOnly" ||
    value === "historical"
  ) {
    return value;
  }
  return undefined;
}

function normalizeDecision(value: string | undefined): string | undefined {
  return value?.trim().replace(/\s+/g, "").toLowerCase();
}
