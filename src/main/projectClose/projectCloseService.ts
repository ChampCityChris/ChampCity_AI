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
import { getPhaseMapProjection } from "../phaseMap/phaseMapService";
import { writeCanonicalMarkdownDocument } from "../documents/canonicalMarkdownDocumentWriter";
import {
  inheritRepositoryBindingFromSourceRevisions,
  mergeRepositoryBindingIntoWorkflowData,
} from "../documents/repositoryBinding";

export function createProjectCloseout(workspaceRoot: string, closureDecision: "Close" | "DoNotClose", rationale: string) {
  assertProjectCloseEligible(workspaceRoot);
  const content = { closureDecision, rationale, phaseCompletionSummary: "", deliveredOutcomes: [], limitations: [], unresolvedWork: [] };
  const documents = listPlanningDocuments(workspaceRoot);
  const slug = projectSlug(documents);
  const markdownPath = `planning/project/Project_Closeouts/PROJECT_CLOSEOUT_${slug}.md`;
  const sourceRevisions = documents
    .filter((document) => !document.markdownPath.includes("/Project_Closeouts/"))
    .map((document) => ({ path: document.markdownPath, revision: document.metadata.artifactRevision ?? 1 }));
  writeCanonicalMarkdownDocument({
    workspaceRoot,
    relativePath: markdownPath,
    metadata: {
      schemaVersion: 1,
      artifactType: "project-closeout",
      artifactRevision: 1,
      participationRole: "compoundGatingReview",
      identity: { closureDecision },
      sourceRevisions,
      workflowData: mergeRepositoryBindingIntoWorkflowData(
        content,
        inheritRepositoryBindingFromSourceRevisions(workspaceRoot, sourceRevisions),
      ),
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

export function getProjectCloseProjection(
  workspaceRoot: string,
  planningContext?: PlanningProjectionContext,
) {
  const context = resolvePlanningProjectionContext(workspaceRoot, planningContext);
  const blockers = projectCloseBlockers(workspaceRoot, context);
  const closeout = latestCloseout(context);
  if (!closeout) return { complete: false, workspaceId: "project-validation", blockers: blockers.length ? blockers : ["Project Closeout is required."] };
  const fresh = evaluateDocumentFreshness(context, closeout.logicalDocumentId).state === "fresh";
  const complete = blockers.length === 0 && fresh && closeout.effectiveDisposition === "Approved" && closeout.metadata.closureDecision === "Close";
  return { complete, workspaceId: complete ? "project-close" : "project-validation", blockers };
}

export function projectCloseBlockers(
  workspaceRoot: string,
  planningContext?: PlanningProjectionContext,
): string[] {
  const context = resolvePlanningProjectionContext(workspaceRoot, planningContext);
  const documents = listPlanningDocuments(context);
  const blockers: string[] = [];
  for (const prefix of ["planning/project/PROJECT_PROFILE", "planning/project/Project_Roadmap/PROJECT_ROADMAP", "planning/project/Phase_Map/PHASE_MAP"]) {
    const doc = documents.find((candidate) => candidate.markdownPath.startsWith(prefix));
    if (!doc || doc.effectiveDisposition !== "Approved") blockers.push(`Missing current Approved ${prefix}.`);
    else if (evaluateDocumentFreshness(context, doc.logicalDocumentId).state === "stale") blockers.push(`Stale ${prefix}.`);
  }
  const phaseMap = getPhaseMapProjection(workspaceRoot, context);
  if (phaseMap.state !== "all-complete") blockers.push(`Phase Map is not all complete: ${phaseMap.state}.`);
  return blockers;
}

function assertProjectCloseEligible(workspaceRoot: string): void {
  const blockers = projectCloseBlockers(workspaceRoot);
  if (blockers.length > 0) throw new Error(blockers.join(" "));
}

function latestCloseout(source: PlanningReadContext) {
  return listPlanningDocuments(source)
    .filter((document) => document.markdownPath.startsWith("planning/project/Project_Closeouts/PROJECT_CLOSEOUT_"))
    .at(-1);
}

function projectSlug(documents: ReturnType<typeof listPlanningDocuments>): string {
  const roadmap = documents.find((document) => document.markdownPath.startsWith("planning/project/Project_Roadmap/PROJECT_ROADMAP_"));
  return roadmap?.displayFilename.replace(/^PROJECT_ROADMAP_/, "") || "project";
}
