import type { DocumentDispositionStatus } from "../../shared/documents/documentDisposition";
import {
  evaluateDocumentFreshness,
  listPlanningDocuments,
  setDocumentDisposition,
  type PlanningReadContext,
} from "../documents/planningDocumentService";
import {
  resolvePlanningProjectionContext,
  type PlanningProjectionContext,
} from "../documents/planningProjectionContext";
import { writeCanonicalMarkdownDocument } from "../documents/canonicalMarkdownDocumentWriter";
import {
  inheritRepositoryBindingFromSourceRevisions,
  mergeRepositoryBindingIntoWorkflowData,
} from "../documents/repositoryBinding";

export interface PhaseCloseoutEvidence {
  logicalDocumentId: string;
  markdownPath: string;
  artifactRevision: number;
  effectiveDisposition: DocumentDispositionStatus;
  closureDecision?: string;
  freshnessState: "fresh" | "stale";
}

export interface PhaseCloseProjection {
  phaseId: string;
  complete: boolean;
  workspaceId: "phase-validation" | "phase-close";
  reason: string;
  closeout?: PhaseCloseoutEvidence;
}

export function createPhaseCloseout(workspaceRoot: string, phaseId: string, closureDecision: "Close" | "DoNotClose", rationale: string) {
  const content = { phaseId, closureDecision, rationale, completionSummary: "", limitations: [], unresolvedMatters: [] };
  const number = phaseId.match(/\d+/)?.[0] ?? "00";
  const slug = slugify(closureDecision);
  const markdownPath = `planning/phases/${phaseId}/Phase_Closeouts/PHASE_${number}_CLOSEOUT_${slug}.md`;
  const sourceRevisions = listPlanningDocuments(workspaceRoot)
    .filter((document) => document.markdownPath.includes(`planning/phases/${phaseId}/`))
    .map((document) => ({ path: document.markdownPath, revision: document.metadata.artifactRevision ?? 1 }));
  writeCanonicalMarkdownDocument({
    workspaceRoot,
    relativePath: markdownPath,
    metadata: {
      schemaVersion: 1,
      artifactType: "phase-closeout",
      artifactRevision: 1,
      participationRole: "compoundGatingReview",
      identity: { phaseId, closureDecision },
      sourceRevisions,
      workflowData: mergeRepositoryBindingIntoWorkflowData(
        content,
        inheritRepositoryBindingFromSourceRevisions(workspaceRoot, sourceRevisions),
      ),
      documentDisposition: { status: "Pending", notes: "", reviewedAt: null },
    },
    bodyMarkdown: `# Phase Closeout\n\nclosureDecision: ${closureDecision}\nrationale: ${rationale}\n`,
  });
  return { markdownPath };
}

export function setPhaseCloseoutDisposition(
  workspaceRoot: string,
  phaseId: string,
  status: DocumentDispositionStatus,
  expectedLogicalDocumentId?: string,
) {
  const closeout = latestCloseout(workspaceRoot, phaseId);
  if (!closeout) throw new Error("Phase Closeout is required.");
  if (expectedLogicalDocumentId && closeout.logicalDocumentId !== expectedLogicalDocumentId) {
    throw new Error("Current canonical Phase Closeout changed before disposition; refresh Phase Validation and retry.");
  }
  return setDocumentDisposition(workspaceRoot, closeout.logicalDocumentId, status);
}

export function getPhaseCloseProjection(
  workspaceRoot: string,
  phaseId: string,
  planningContext?: PlanningProjectionContext,
): PhaseCloseProjection {
  const context = resolvePlanningProjectionContext(workspaceRoot, planningContext);
  const closeout = latestCloseout(context, phaseId);
  if (!closeout) {
    return {
      phaseId,
      complete: false,
      workspaceId: "phase-validation",
      reason: "Phase Closeout is required.",
    };
  }
  const freshnessState = evaluateDocumentFreshness(context, closeout.logicalDocumentId).state;
  const complete = isAcceptedCloseout(closeout.effectiveDisposition, closeout.metadata.closureDecision, freshnessState === "fresh");
  return {
    phaseId,
    complete,
    workspaceId: complete ? "phase-close" : "phase-validation",
    reason: complete
      ? "Approved Close Phase Closeout completes the phase."
      : "Phase remains in validation until current closeout is Approved with closureDecision=Close.",
    closeout: {
      logicalDocumentId: closeout.logicalDocumentId,
      markdownPath: closeout.markdownPath,
      artifactRevision: closeout.metadata.artifactRevision ?? 1,
      effectiveDisposition: closeout.effectiveDisposition,
      closureDecision: closeout.metadata.closureDecision,
      freshnessState,
    },
  };
}

function latestCloseout(source: PlanningReadContext, phaseId: string) {
  return listPlanningDocuments(source)
    .filter((document) => document.markdownPath.startsWith(`planning/phases/${phaseId}/Phase_Closeouts/`))
    .at(-1);
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "closeout";
}

/** Shared Phase/Plan close semantics; callers supply current boundary evidence. */
export function isAcceptedCloseout(status: DocumentDispositionStatus, decision: unknown, fresh: boolean): boolean {
  return status === "Approved" && decision === "Close" && fresh;
}
