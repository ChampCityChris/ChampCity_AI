import type { DocumentDispositionStatus } from "../../shared/documents/documentDisposition";
import { evaluateDocumentFreshness, listPlanningDocuments, setDocumentDisposition } from "../documents/planningDocumentService";
import { writeCanonicalMarkdownDocument } from "../documents/canonicalMarkdownDocumentWriter";
import {
  inheritRepositoryAuthorityFromSourceRevisions,
  mergeRepositoryAuthorityIntoWorkflowData,
} from "../documents/repositoryAuthority";

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
      workflowData: mergeRepositoryAuthorityIntoWorkflowData(
        content,
        inheritRepositoryAuthorityFromSourceRevisions(workspaceRoot, sourceRevisions),
      ),
      documentDisposition: { status: "Pending", notes: "", reviewedAt: null },
    },
    bodyMarkdown: `# Phase Closeout\n\nclosureDecision: ${closureDecision}\nrationale: ${rationale}\n`,
  });
  return { markdownPath };
}

export function setPhaseCloseoutDisposition(workspaceRoot: string, phaseId: string, status: DocumentDispositionStatus) {
  const closeout = latestCloseout(workspaceRoot, phaseId);
  if (!closeout) throw new Error("Phase Closeout is required.");
  return setDocumentDisposition(workspaceRoot, closeout.logicalDocumentId, status);
}

export function getPhaseCloseProjection(workspaceRoot: string, phaseId: string) {
  const closeout = latestCloseout(workspaceRoot, phaseId);
  if (!closeout) return { complete: false, workspaceId: "phase-validation", reason: "Phase Closeout is required." };
  const fresh = evaluateDocumentFreshness(workspaceRoot, closeout.logicalDocumentId).state === "fresh";
  const complete = closeout.effectiveDisposition === "Approved" && closeout.metadata.closureDecision === "Close" && fresh;
  return {
    complete,
    workspaceId: complete ? "phase-close" : "phase-validation",
    reason: complete
      ? "Approved Close Phase Closeout completes the phase."
      : "Phase remains in validation until current closeout is Approved with closureDecision=Close.",
  };
}

function latestCloseout(workspaceRoot: string, phaseId: string) {
  return listPlanningDocuments(workspaceRoot)
    .filter((document) => document.markdownPath.startsWith(`planning/phases/${phaseId}/Phase_Closeouts/`))
    .at(-1);
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "closeout";
}
