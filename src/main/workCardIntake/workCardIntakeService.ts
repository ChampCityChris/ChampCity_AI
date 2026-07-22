import fs from "node:fs";
import path from "node:path";
import type { PlanningDocumentSummary, SourceRevision } from "../../shared/documents/planningDocument";
import {
  evaluateDocumentFreshness,
  listPlanningDocuments,
} from "../documents/planningDocumentService";
import { writeArtifactTransaction } from "../documents/artifactTransaction";
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
  handoffJsonPath: string;
  formalWorkCardMarkdownPath: string;
  formalWorkCardJsonPath: string;
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
  const phasePlanning = requiredApproved(workspaceRoot, `planning/phases/${phaseId}/Phase_Planning`, ".json");
  const workCardPlan = requiredApproved(workspaceRoot, `planning/phases/${phaseId}/Work_Card_Plan`, ".json");
  const sourceRevisions = [
    { path: phasePlanning.jsonPath!, revision: phasePlanning.metadata.artifactRevision ?? 1 },
    { path: workCardPlan.jsonPath!, revision: workCardPlan.metadata.artifactRevision ?? 1 },
  ];
  const slug = slugify(candidate.title);
  const handoffMarkdownPath = `planning/phases/${phaseId}/Architect_Handoffs/WORK_CARD_INTAKE_ARCHITECT_HANDOFF_${candidate.candidateId}.md`;
  const handoffJsonPath = `planning/phases/${phaseId}/Architect_Handoffs/WORK_CARD_INTAKE_ARCHITECT_HANDOFF_${candidate.candidateId}.json`;
  const formalWorkCardMarkdownPath = `planning/phases/${phaseId}/Work_Cards/${candidate.candidateId}_${slug}.md`;
  const formalWorkCardJsonPath = `planning/phases/${phaseId}/Work_Cards/${candidate.candidateId}_${slug}.json`;

  writeFiles(workspaceRoot, [
    [
      handoffMarkdownPath,
      renderHandoffMarkdown(candidate, phaseId, sourceRevisions, formalWorkCardMarkdownPath, formalWorkCardJsonPath),
    ],
    [
      handoffJsonPath,
      json({
        artifactType: "work-card-intake-handoff",
        artifactRevision: 1,
        participationRole: "nonReviewHandoff",
        phaseId,
        workCardId: candidate.candidateId,
        candidate,
        sourceRevisions,
        outputTargets: {
          formalWorkCard: {
            markdown: formalWorkCardMarkdownPath,
            json: formalWorkCardJsonPath,
          },
        },
        instructions: "Create one Formal Work Card for Operator review. Do not create implementation code or Implementer handoff.",
        documentDisposition: { status: "Approved" },
      }),
    ],
  ]);

  return {
    phaseId,
    candidateId: candidate.candidateId,
    handoffMarkdownPath,
    handoffJsonPath,
    formalWorkCardMarkdownPath,
    formalWorkCardJsonPath,
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
      const value = [document.markdownPath, document.jsonPath, document.displayFilename]
        .filter(Boolean)
        .join("/")
        .toLowerCase();
      return value.includes("validation") || value.includes("operator_validation");
    })
    .flatMap((document) => [document.markdownPath, document.jsonPath].filter((value): value is string => Boolean(value)));
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
  const workCardPlan = requiredApproved(workspaceRoot, `planning/phases/${phaseId}/Work_Card_Plan`, ".json");
  const parsed = JSON.parse(fs.readFileSync(path.join(workspaceRoot, workCardPlan.jsonPath!), "utf8"));
  return validateCandidates(parsed.candidates);
}

function requiredApproved(workspaceRoot: string, prefix: string, extension: ".json"): PlanningDocumentSummary {
  const document = listPlanningDocuments(workspaceRoot)
    .filter((candidate) => (candidate.jsonPath ?? candidate.markdownPath ?? "").startsWith(prefix))
    .filter((candidate) => (candidate.jsonPath ?? candidate.markdownPath ?? "").endsWith(extension))
    .at(-1);
  if (!document || document.effectiveDisposition !== "Approved") {
    throw new Error(`Current Approved input is required: ${prefix}`);
  }
  if (evaluateDocumentFreshness(workspaceRoot, document.logicalDocumentId).state === "stale") {
    throw new Error(`Current input is stale: ${prefix}`);
  }
  if (!document.jsonPath) {
    throw new Error(`JSON input is required: ${prefix}`);
  }
  return document;
}

function renderHandoffMarkdown(
  candidate: WorkCardCandidate,
  phaseId: string,
  sourceRevisions: SourceRevision[],
  formalWorkCardMarkdownPath: string,
  formalWorkCardJsonPath: string,
): string {
  return [
    `# Work Card Intake Architect Handoff - ${candidate.candidateId}`,
    "Artifact.Revision=1",
    "participationRole=nonReviewHandoff",
    `phaseId=${phaseId}`,
    `workCardId=${candidate.candidateId}`,
    "",
    "## Source Revisions",
    ...sourceRevisions.map((source) => `- path: ${source.path} revision: ${source.revision}`),
    "",
    "## Candidate",
    `candidateId: ${candidate.candidateId}`,
    `title: ${candidate.title}`,
    `purpose: ${candidate.purpose}`,
    "",
    "## Output Targets",
    formalWorkCardMarkdownPath,
    formalWorkCardJsonPath,
    "",
    "## Document Disposition",
    "",
    "Document.Status=Approved",
    "",
  ].join("\n");
}

function writeFiles(workspaceRoot: string, entries: Array<[relativePath: string, content: string]>): void {
  writeArtifactTransaction(
    workspaceRoot,
    entries.map(([relativePath, content]) => ({ relativePath, content })),
  );
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "work_card";
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
