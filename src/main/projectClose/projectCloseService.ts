import type { DocumentDispositionStatus } from "../../shared/documents/documentDisposition";
import { evaluateDocumentFreshness, listPlanningDocuments, setDocumentDisposition } from "../documents/planningDocumentService";
import { getPhaseMapProjection } from "../phaseMap/phaseMapService";
import { writeCanonicalMarkdownDocument } from "../documents/canonicalMarkdownDocumentWriter";

export function createProjectCloseout(workspaceRoot: string, closureDecision: "Close" | "DoNotClose", rationale: string) {
  assertProjectCloseEligible(workspaceRoot);
  const content = { closureDecision, rationale, phaseCompletionSummary: "", deliveredOutcomes: [], limitations: [], unresolvedWork: [] };
  const documents = listPlanningDocuments(workspaceRoot);
  const slug = projectSlug(documents);
  const markdownPath = `planning/project/Project_Closeouts/PROJECT_CLOSEOUT_${slug}.md`;
  writeCanonicalMarkdownDocument({
    workspaceRoot,
    relativePath: markdownPath,
    metadata: {
      schemaVersion: 1,
      artifactType: "project-closeout",
      artifactRevision: 1,
      participationRole: "compoundGatingReview",
      identity: { closureDecision },
      sourceRevisions: documents
        .filter((document) => !document.markdownPath.includes("/Project_Closeouts/"))
        .map((document) => ({ path: document.markdownPath, revision: document.metadata.artifactRevision ?? 1 })),
      workflowData: content,
      documentDisposition: { status: "Pending", notes: "", reviewedAt: null },
    },
    bodyMarkdown: `# Project Closeout\n\nclosureDecision: ${closureDecision}\nrationale: ${rationale}\n`,
  });
  return { markdownPath };
}

export function setProjectCloseoutDisposition(workspaceRoot: string, status: DocumentDispositionStatus) {
  const closeout = latestCloseout(workspaceRoot);
  if (!closeout) throw new Error("Project Closeout is required.");
  return setDocumentDisposition(workspaceRoot, closeout.logicalDocumentId, status);
}

export function getProjectCloseProjection(workspaceRoot: string) {
  const blockers = projectCloseBlockers(workspaceRoot);
  const closeout = latestCloseout(workspaceRoot);
  if (!closeout) return { complete: false, workspaceId: "project-validation", blockers: blockers.length ? blockers : ["Project Closeout is required."] };
  const fresh = evaluateDocumentFreshness(workspaceRoot, closeout.logicalDocumentId).state === "fresh";
  const complete = blockers.length === 0 && fresh && closeout.effectiveDisposition === "Approved" && closeout.metadata.closureDecision === "Close";
  return { complete, workspaceId: complete ? "project-close" : "project-validation", blockers };
}

export function projectCloseBlockers(workspaceRoot: string): string[] {
  const documents = listPlanningDocuments(workspaceRoot);
  const blockers: string[] = [];
  for (const prefix of ["planning/project/PROJECT_PROFILE", "planning/project/Project_Roadmap/PROJECT_ROADMAP", "planning/project/Phase_Map/PHASE_MAP"]) {
    const doc = documents.find((candidate) => candidate.markdownPath.startsWith(prefix));
    if (!doc || doc.effectiveDisposition !== "Approved") blockers.push(`Missing current Approved ${prefix}.`);
    else if (evaluateDocumentFreshness(workspaceRoot, doc.logicalDocumentId).state === "stale") blockers.push(`Stale ${prefix}.`);
  }
  const phaseMap = getPhaseMapProjection(workspaceRoot);
  if (phaseMap.state !== "all-complete") blockers.push(`Phase Map is not all complete: ${phaseMap.state}.`);
  return blockers;
}

function assertProjectCloseEligible(workspaceRoot: string): void {
  const blockers = projectCloseBlockers(workspaceRoot);
  if (blockers.length > 0) throw new Error(blockers.join(" "));
}

function latestCloseout(workspaceRoot: string) {
  return listPlanningDocuments(workspaceRoot)
    .filter((document) => document.markdownPath.startsWith("planning/project/Project_Closeouts/PROJECT_CLOSEOUT_"))
    .at(-1);
}

function projectSlug(documents: ReturnType<typeof listPlanningDocuments>): string {
  const roadmap = documents.find((document) => document.markdownPath.startsWith("planning/project/Project_Roadmap/PROJECT_ROADMAP_"));
  return roadmap?.displayFilename.replace(/^PROJECT_ROADMAP_/, "") || "project";
}
