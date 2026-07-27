import fs from "node:fs";
import path from "node:path";
import type { PlanningDocumentSummary } from "../../shared/documents/planningDocument";
import { parseCanonicalMarkdownDocument } from "../../shared/documents/canonicalMarkdown";
import {
  evaluateDocumentFreshness,
  listPlanningDocuments,
} from "../documents/planningDocumentService";
import { writeCanonicalMarkdownDocument } from "../documents/canonicalMarkdownDocumentWriter";
import {
  getPhasePlanningCompletion,
  validateCandidates,
  type WorkCardCandidate,
} from "../phasePlanning/phasePlanningService";

export type CandidateSelectionState =
  | "eligible"
  | "complete"
  | "dependency-blocked"
  | "deferred"
  | "superseded"
  | "already-satisfied"
  | "carried-forward";

export interface CandidateSelectionExplanation {
  candidateId: string;
  state: CandidateSelectionState;
  reason: string;
  evidencePaths: string[];
}

export type CandidateSelectionResult =
  | {
      state: "selected";
      phaseId: string;
      selectedCandidate: WorkCardCandidate;
      explanations: CandidateSelectionExplanation[];
    }
  | {
      state: "invalid-plan" | "all-complete" | "dependency-blocked" | "explicitly-resolved";
      phaseId?: string;
      reason: string;
      explanations: CandidateSelectionExplanation[];
    };

export interface WorkCardIntakeHandoffResult {
  phaseId: string;
  candidateId: string;
  handoffMarkdownPath: string;
  formalWorkCardMarkdownPath: string;
}

export function selectNextWorkCardCandidate(
  workspaceRoot: string,
  phaseId: string,
): CandidateSelectionResult {
  const completion = getPhasePlanningCompletion(workspaceRoot, phaseId);
  if (!completion.complete) {
    return {
      state: "invalid-plan",
      phaseId,
      reason: "Candidate selection requires a current Approved Phase Planning bundle.",
      explanations: [],
    };
  }

  let candidates: WorkCardCandidate[];
  try {
    candidates = readCandidates(workspaceRoot, phaseId);
  } catch (error) {
    return {
      state: "invalid-plan",
      phaseId,
      reason: error instanceof Error ? error.message : String(error),
      explanations: [],
    };
  }

  const explanations = candidates
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((candidate) => explainCandidate(workspaceRoot, phaseId, candidate, candidates));
  const selected = explanations.find((entry) => entry.state === "eligible");

  if (selected) {
    return {
      state: "selected",
      phaseId,
      selectedCandidate: candidates.find((candidate) => candidate.candidateId === selected.candidateId)!,
      explanations,
    };
  }

  if (explanations.every((entry) => entry.state === "complete")) {
    return { state: "all-complete", phaseId, reason: "All planned candidates are complete.", explanations };
  }
  if (explanations.some((entry) => entry.state === "dependency-blocked")) {
    return {
      state: "dependency-blocked",
      phaseId,
      reason: "No candidate is eligible because one or more planned candidates are waiting on predecessors.",
      explanations,
    };
  }
  return {
    state: "explicitly-resolved",
    phaseId,
    reason: "All remaining candidates are explicitly resolved without intake.",
    explanations,
  };
}

export function generateWorkCardIntakeHandoff(
  workspaceRoot: string,
  phaseId: string,
): WorkCardIntakeHandoffResult {
  const selection = selectNextWorkCardCandidate(workspaceRoot, phaseId);
  if (selection.state !== "selected") {
    throw new Error(`No eligible Work Card candidate is available: ${selection.state}`);
  }
  const candidate = selection.selectedCandidate;
  const phasePlanning = requiredApproved(workspaceRoot, `planning/phases/${phaseId}/Phase_Planning`, ".md");
  const workCardPlan = requiredApproved(workspaceRoot, `planning/phases/${phaseId}/Work_Card_Plan`, ".md");
  const slug = slugify(candidate.title);
  const handoffMarkdownPath = `planning/phases/${phaseId}/Architect_Handoffs/WORK_CARD_INTAKE_ARCHITECT_HANDOFF_${candidate.candidateId}.md`;
  const formalWorkCardMarkdownPath = `planning/phases/${phaseId}/Work_Cards/${candidate.candidateId}_${slug}.md`;

  const content = { candidate: { ...candidate, phaseId } };
  writeCanonicalMarkdownDocument({
    workspaceRoot,
    relativePath: handoffMarkdownPath,
    metadata: {
      schemaVersion: 1,
      artifactType: "work-card-intake-handoff",
      artifactRevision: 1,
      participationRole: "nonReviewHandoff",
      identity: { phaseId, workCardId: candidate.candidateId },
      sourceRevisions: [
        { path: phasePlanning.markdownPath, revision: phasePlanning.metadata.artifactRevision ?? 1 },
        { path: workCardPlan.markdownPath, revision: workCardPlan.metadata.artifactRevision ?? 1 },
      ],
      workflowData: {
        ...content,
        formalWorkCardTarget: formalWorkCardMarkdownPath,
      },
      documentDisposition: { status: "Approved", notes: "", reviewedAt: null },
    },
    bodyMarkdown: `# Work Card Intake Architect Handoff - ${candidate.candidateId}\n\nFormal Work Card Markdown: ${formalWorkCardMarkdownPath}\n`,
  });

  return {
    phaseId,
    candidateId: candidate.candidateId,
    handoffMarkdownPath,
    formalWorkCardMarkdownPath,
  };
}

function explainCandidate(
  workspaceRoot: string,
  phaseId: string,
  candidate: WorkCardCandidate,
  candidates: WorkCardCandidate[],
): CandidateSelectionExplanation {
  if (candidate.resolutionStatus === "deferred") {
    return explanation(candidate, "deferred", `Candidate is deferred: ${candidate.resolutionReason}`);
  }
  if (candidate.resolutionStatus === "superseded") {
    return explanation(candidate, "superseded", `Candidate is superseded: ${candidate.resolutionReason}`);
  }
  if (candidate.resolutionStatus === "alreadySatisfied") {
    return explanation(candidate, "already-satisfied", `Candidate is already satisfied: ${candidate.resolutionReason}`);
  }
  if (candidate.resolutionStatus === "carriedForward") {
    return explanation(candidate, "carried-forward", `Candidate is carried forward: ${candidate.resolutionReason}`);
  }
  const completionEvidence = candidateCompletionEvidence(workspaceRoot, phaseId, candidate.candidateId);
  if (completionEvidence.length > 0) {
    return explanation(candidate, "complete", "Candidate is complete because current Approved validation evidence exists.", completionEvidence);
  }
  const blocked = candidate.dependsOn.filter((dependencyId) =>
    !dependencySatisfied(workspaceRoot, phaseId, dependencyId, candidates),
  );
  if (blocked.length > 0) {
    return explanation(candidate, "dependency-blocked", `Candidate is blocked by incomplete predecessors: ${blocked.join(", ")}.`);
  }
  return explanation(candidate, "eligible", "Candidate is planned, incomplete, and all predecessors permit continuation.");
}

function dependencySatisfied(
  workspaceRoot: string,
  phaseId: string,
  dependencyId: string,
  candidates: WorkCardCandidate[],
): boolean {
  const dependency = candidates.find((candidate) => candidate.candidateId === dependencyId);
  if (!dependency) {
    return false;
  }
  if (dependency.resolutionStatus !== "planned") {
    return true;
  }
  return candidateCompletionEvidence(workspaceRoot, phaseId, dependencyId).length > 0;
}

function candidateCompletionEvidence(
  workspaceRoot: string,
  phaseId: string,
  candidateId: string,
): string[] {
  return listPlanningDocuments(workspaceRoot)
    .filter((document) => document.effectiveDisposition === "Approved")
    .filter((document) => document.metadata.phaseId === phaseId)
    .filter((document) => document.metadata.candidateId === candidateId || document.metadata.workCardId === candidateId)
    .filter((document) => {
      const value = [document.markdownPath, document.displayFilename]
        .filter(Boolean)
        .join("/")
        .toLowerCase();
      return value.includes("validation") || value.includes("operator_validation");
    })
    .map((document) => document.markdownPath);
}

function explanation(
  candidate: WorkCardCandidate,
  state: CandidateSelectionState,
  reason: string,
  extraEvidencePaths: string[] = [],
): CandidateSelectionExplanation {
  return {
    candidateId: candidate.candidateId,
    state,
    reason,
    evidencePaths: [...candidate.evidencePaths, ...extraEvidencePaths],
  };
}

function readCandidates(workspaceRoot: string, phaseId: string): WorkCardCandidate[] {
  const workCardPlan = requiredApproved(workspaceRoot, `planning/phases/${phaseId}/Work_Card_Plan`, ".md");
  const parsed = readWorkflowData(workspaceRoot, workCardPlan.markdownPath);
  return validateCandidates(parsed.candidates);
}

function requiredApproved(workspaceRoot: string, prefix: string, extension: ".md"): PlanningDocumentSummary {
  const document = listPlanningDocuments(workspaceRoot)
    .filter((candidate) => candidate.markdownPath.startsWith(prefix))
    .filter((candidate) => candidate.markdownPath.endsWith(extension))
    .at(-1);
  if (!document || document.effectiveDisposition !== "Approved") {
    throw new Error(`Current Approved input is required: ${prefix}`);
  }
  if (evaluateDocumentFreshness(workspaceRoot, document.logicalDocumentId).state === "stale") {
    throw new Error(`Current input is stale: ${prefix}`);
  }
  if (!document.markdownPath) {
    throw new Error(`Canonical Markdown input is required: ${prefix}`);
  }
  return document;
}

function readWorkflowData(workspaceRoot: string, relativePath: string): Record<string, unknown> {
  const parsed = parseCanonicalMarkdownDocument(fs.readFileSync(path.join(workspaceRoot, relativePath), "utf8"));
  return parsed.metadata.workflowData;
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "work_card";
}
