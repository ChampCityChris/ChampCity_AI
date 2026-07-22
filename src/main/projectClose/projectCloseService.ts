import fs from "node:fs";
import path from "node:path";
import type { DocumentDispositionStatus } from "../../shared/documents/documentDisposition";
import { evaluateDocumentFreshness, listPlanningDocuments, setDocumentDisposition } from "../documents/planningDocumentService";
import { getPhaseMapProjection } from "../phaseMap/phaseMapService";
import { writeArtifactTransaction } from "../documents/artifactTransaction";

export function createProjectCloseout(workspaceRoot: string, closureDecision: "Close" | "DoNotClose", rationale: string) {
  assertProjectCloseEligible(workspaceRoot);
  const sourceRevisions = listPlanningDocuments(workspaceRoot)
    .filter((document) => document.jsonPath)
    .filter((document) => !document.jsonPath!.includes("/Project_Closeouts/"))
    .map((document) => ({ path: document.jsonPath!, revision: document.metadata.artifactRevision ?? 1 }));
  const slug = projectSlug(workspaceRoot);
  const markdownPath = `planning/project/Project_Closeouts/PROJECT_CLOSEOUT_${slug}.md`;
  const jsonPath = `planning/project/Project_Closeouts/PROJECT_CLOSEOUT_${slug}.json`;
  const artifact = { artifactType: "project-closeout", artifactRevision: 1, participationRole: "compoundGatingReview", closureDecision, rationale, phaseCompletionSummary: "", deliveredOutcomes: [], limitations: [], unresolvedWork: [], sourceRevisions, documentDisposition: { status: "Pending" } };
  writeFiles(workspaceRoot, [[markdownPath, renderCloseout(artifact)], [jsonPath, json(artifact)]]);
  return { markdownPath, jsonPath };
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
    const doc = documents.find((candidate) => (candidate.jsonPath ?? "").startsWith(prefix));
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
    .filter((document) => (document.jsonPath ?? "").startsWith("planning/project/Project_Closeouts/PROJECT_CLOSEOUT_"))
    .at(-1);
}

function projectSlug(workspaceRoot: string): string {
  const intake = listPlanningDocuments(workspaceRoot).find((document) => document.displayFilename.startsWith("PROJECT_INTAKE_"));
  return intake?.displayFilename.replace(/^PROJECT_INTAKE_/, "") || "project";
}

function renderCloseout(artifact: any): string {
  return ["# Project Closeout", "Artifact.Revision=1", "participationRole=compoundGatingReview", `closureDecision=${artifact.closureDecision}`, "", "## Source Revisions", ...artifact.sourceRevisions.map((source: { path: string; revision: number }) => `- path: ${source.path} revision: ${source.revision}`), "", "## Document Disposition", "", "Document.Status=Pending", ""].join("\n");
}

function writeFiles(workspaceRoot: string, entries: Array<[string, string]>): void {
  writeArtifactTransaction(
    workspaceRoot,
    entries.map(([relativePath, content]) => ({ relativePath, content })),
  );
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
