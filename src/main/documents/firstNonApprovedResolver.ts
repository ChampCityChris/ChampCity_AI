import { selectedCurrentProjectId } from "../projectState/currentProjectRegistrationService";
import { readProjectCreationIntakeProjection } from "../workflow/workflowIntakeReadProjection";
import { readApprovedGreenfieldArchitectProjection } from "../architectOutputs/structuredArchitectReadProjection";
import type { FirstNonApprovedResult } from "../../shared/documents/documentOrder";
import { resolveFirstNonApproved } from "../../shared/documents/documentOrder";
import { listPlanningDocumentsFromSnapshot } from "./planningDocumentService";
import {
  acquirePlanningRepositorySnapshot,
  type PlanningRepositorySnapshot,
} from "./planningRepositorySnapshot";
import type { PlanningProjectionContext } from "./planningProjectionContext";

export function resolveFirstNonApprovedDocument(
  source: string | PlanningProjectionContext,
): FirstNonApprovedResult {
  return typeof source === "string"
    ? resolveFirstNonApprovedDocumentFromSnapshot(acquirePlanningRepositorySnapshot(source))
    : resolveFirstNonApprovedDocumentFromContext(source);
}

export function resolveFirstNonApprovedDocumentFromSnapshot(
  snapshot: PlanningRepositorySnapshot,
): FirstNonApprovedResult {
  const structured = readProjectCreationIntakeProjection(snapshot.workspaceRoot);
  const documents = listPlanningDocumentsFromSnapshot(snapshot);
  if (selectedCurrentProjectId(snapshot.workspaceRoot) && !structured) return {status: "pre-intake", activeWorkspaceId: "project-intake-capture", message: "Project Intake has not been captured", totalDocumentCount: documents.length, reason: "Create or recover the exact SQL Project Creation Intake before Architect work."};
  if (structured?.reviewDocument?.effectiveDisposition === "Approved") {
    const architect = readApprovedGreenfieldArchitectProjection(snapshot.workspaceRoot);
    if (!architect) return {status: "waiting-for-architect-interview", activeWorkspaceId: "architect-interview", message: "Waiting for Project Architect Interview output", totalDocumentCount: documents.length,
      reason: "Approved SQL Intake requires a fresh structured Architect review cycle.", sourceEvidence: [structured.reviewDocument.markdownPath], promptLogicalDocumentId: structured.intakeId!, expectedOutputPaths: {markdown: "planning/architect-reviews/"}};
    // The SQL cycle already establishes Interview eligibility; historical prompt/interview files cannot gate it.
    return resolveFirstNonApproved(documents.filter(document => !["project-intake", "project-architect-interview", "project-architect-interview-prompt", "project-profile", "project-roadmap", "phase-map", "phase-interview", "phase-planning", "work-card-plan", "work-card-intake-handoff", "formal-work-card", "implementer-report", "validation-record", "repair-work-card", "repair-architect-handoff", "work-card-close-return-record", "phase-closeout", "project-closeout", "plan-closeout"].includes(document.metadata.artifactType ?? "")), undefined, true);
  }
  return resolveFirstNonApproved(documents, structured ? structured.reviewDocument ?? null : undefined);
}

export function resolveFirstNonApprovedDocumentFromContext(
  context: import("./planningProjectionContext").PlanningProjectionContext,
): FirstNonApprovedResult {
  return resolveFirstNonApprovedDocumentFromSnapshot(context.snapshot);
}
