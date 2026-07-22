import fs from "node:fs";
import path from "node:path";
import type { DocumentDispositionStatus } from "../../shared/documents/documentDisposition";
import { evaluateDocumentFreshness, listPlanningDocuments, setDocumentDisposition } from "../documents/planningDocumentService";

export function createPhaseCloseout(workspaceRoot: string, phaseId: string, closureDecision: "Close" | "DoNotClose", rationale: string) {
  const sourceRevisions = listPlanningDocuments(workspaceRoot)
    .filter((document) => (document.markdownPath ?? document.jsonPath ?? "").includes(`planning/phases/${phaseId}/`))
    .filter((document) => document.jsonPath)
    .map((document) => ({ path: document.jsonPath!, revision: document.metadata.artifactRevision ?? 1 }));
  const number = phaseId.match(/\d+/)?.[0] ?? "00";
  const slug = closureDecision.toLowerCase();
  const markdownPath = `planning/phases/${phaseId}/Phase_Closeouts/PHASE_${number}_CLOSEOUT_${slug}.md`;
  const jsonPath = `planning/phases/${phaseId}/Phase_Closeouts/PHASE_${number}_CLOSEOUT_${slug}.json`;
  const artifact = { artifactType: "phase-closeout", artifactRevision: 1, participationRole: "compoundGatingReview", phaseId, closureDecision, rationale, completionSummary: "", limitations: [], unresolvedMatters: [], sourceRevisions, documentDisposition: { status: "Pending" } };
  writeFiles(workspaceRoot, [[markdownPath, renderCloseout(artifact)], [jsonPath, json(artifact)]]);
  return { markdownPath, jsonPath };
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
    .filter((document) => (document.jsonPath ?? "").startsWith(`planning/phases/${phaseId}/Phase_Closeouts/`))
    .at(-1);
}

function renderCloseout(artifact: any): string {
  return [`# Phase Closeout`, "Artifact.Revision=1", "participationRole=compoundGatingReview", `phaseId=${artifact.phaseId}`, `closureDecision=${artifact.closureDecision}`, "", "## Source Revisions", ...artifact.sourceRevisions.map((source: { path: string; revision: number }) => `- path: ${source.path} revision: ${source.revision}`), "", "## Document Disposition", "", "Document.Status=Pending", ""].join("\n");
}

function writeFiles(workspaceRoot: string, entries: Array<[string, string]>): void {
  for (const [relativePath, content] of entries) {
    const absolutePath = path.join(workspaceRoot, relativePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, content, "utf8");
  }
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
