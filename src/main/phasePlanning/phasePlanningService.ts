import fs from "node:fs";
import path from "node:path";
import type { DocumentDispositionStatus } from "../../shared/documents/documentDisposition";
import type { PlanningDocumentSummary, SourceRevision } from "../../shared/documents/planningDocument";
import {
  evaluateDocumentFreshness,
  listPlanningDocuments,
  savePlanningDocumentRevision,
  setDocumentDispositions,
} from "../documents/planningDocumentService";
import type { RollbackWriteOptions } from "../documents/documentDispositionWriter";
import { writeArtifactTransaction } from "../documents/artifactTransaction";
import { getPhaseIntakeCompletion } from "../phaseInterview/phaseInterviewService";
import { getPhaseMapProjection, type PhaseMapPhase } from "../phaseMap/phaseMapService";

export const candidateResolutionStatuses = [
  "planned",
  "deferred",
  "superseded",
  "alreadySatisfied",
  "carriedForward",
] as const;

export type CandidateResolutionStatus = (typeof candidateResolutionStatuses)[number];

export interface WorkCardCandidate {
  candidateId: string;
  order: number;
  title: string;
  purpose: string;
  dependsOn: string[];
  resolutionStatus: CandidateResolutionStatus;
  resolutionReason: string;
  evidencePaths: string[];
  carriedForwardToPhaseId?: string;
}

export interface PhasePlanningHandoffResult {
  phaseId: string;
  handoffMarkdownPath: string;
  handoffJsonPath: string;
  phasePlanningMarkdownPath: string;
  phasePlanningJsonPath: string;
  workCardPlanMarkdownPath: string;
  workCardPlanJsonPath: string;
}

export interface PhasePlanningCompletion {
  complete: boolean;
  phaseId?: string;
  reason: string;
}

export function generatePhasePlanningHandoff(
  workspaceRoot: string,
  candidates: WorkCardCandidate[] = [defaultCandidate()],
): PhasePlanningHandoffResult {
  const selectedPhase = selectedPhaseFromProjection(workspaceRoot);
  const intake = getPhaseIntakeCompletion(workspaceRoot, selectedPhase.phaseId);
  if (!intake.complete) {
    throw new Error(`Current Approved Phase Interview is required: ${selectedPhase.phaseId}`);
  }
  const profile = requiredApproved(workspaceRoot, "planning/project/PROJECT_PROFILE", ".json");
  const roadmap = requiredApproved(workspaceRoot, "planning/project/Project_Roadmap/PROJECT_ROADMAP", ".json");
  const phaseMap = requiredApproved(workspaceRoot, "planning/project/Phase_Map/PHASE_MAP", ".json");
  const phaseInterview = requiredApproved(workspaceRoot, `planning/phases/${selectedPhase.phaseId}/Phase_Interview`, ".json");
  const sourceRevisions = [
    { path: profile.jsonPath!, revision: profile.metadata.artifactRevision ?? 1 },
    { path: roadmap.jsonPath!, revision: roadmap.metadata.artifactRevision ?? 1 },
    { path: phaseMap.jsonPath!, revision: phaseMap.metadata.artifactRevision ?? 1 },
    { path: phaseInterview.jsonPath!, revision: phaseInterview.metadata.artifactRevision ?? 1 },
  ];
  validateCandidates(candidates);
  const handoffMarkdownPath = `planning/phases/${selectedPhase.phaseId}/Architect_Handoffs/PHASE_PLANNING_ARCHITECT_HANDOFF_${selectedPhase.phaseId}.md`;
  const handoffJsonPath = `planning/phases/${selectedPhase.phaseId}/Architect_Handoffs/PHASE_PLANNING_ARCHITECT_HANDOFF_${selectedPhase.phaseId}.json`;
  const phasePlanningMarkdownPath = `planning/phases/${selectedPhase.phaseId}/Phase_Planning.md`;
  const phasePlanningJsonPath = `planning/phases/${selectedPhase.phaseId}/Phase_Planning.json`;
  const workCardPlanMarkdownPath = `planning/phases/${selectedPhase.phaseId}/Work_Card_Plan.md`;
  const workCardPlanJsonPath = `planning/phases/${selectedPhase.phaseId}/Work_Card_Plan.json`;

  writeFiles(workspaceRoot, [
    [
      handoffMarkdownPath,
      renderHandoffMarkdown(
        selectedPhase,
        sourceRevisions,
        phasePlanningMarkdownPath,
        phasePlanningJsonPath,
        workCardPlanMarkdownPath,
        workCardPlanJsonPath,
      ),
    ],
    [
      handoffJsonPath,
      json({
        artifactType: "phase-planning-architect-handoff",
        artifactRevision: 1,
        participationRole: "nonReviewHandoff",
        phaseId: selectedPhase.phaseId,
        selectedPhase,
        sourceRevisions,
        outputTargets: {
          phasePlanning: { markdown: phasePlanningMarkdownPath, json: phasePlanningJsonPath },
          workCardPlan: { markdown: workCardPlanMarkdownPath, json: workCardPlanJsonPath },
        },
        documentDisposition: { status: "Approved" },
      }),
    ],
  ]);

  return {
    phaseId: selectedPhase.phaseId,
    handoffMarkdownPath,
    handoffJsonPath,
    phasePlanningMarkdownPath,
    phasePlanningJsonPath,
    workCardPlanMarkdownPath,
    workCardPlanJsonPath,
  };
}

export function setPhasePlanningBundleDisposition(
  workspaceRoot: string,
  phaseId: string,
  status: DocumentDispositionStatus,
  options: RollbackWriteOptions = {},
): void {
  const phasePlanning = requiredAny(workspaceRoot, `planning/phases/${phaseId}/Phase_Planning`, ".json");
  const workCardPlan = requiredAny(workspaceRoot, `planning/phases/${phaseId}/Work_Card_Plan`, ".json");
  setDocumentDispositions(
    workspaceRoot,
    [phasePlanning.logicalDocumentId, workCardPlan.logicalDocumentId],
    status,
    options,
  );
}

export function getPhasePlanningCompletion(
  workspaceRoot: string,
  phaseId?: string,
): PhasePlanningCompletion {
  const selectedPhaseId = phaseId ?? selectedPhaseFromProjection(workspaceRoot).phaseId;
  const phasePlanning = findByPrefix(workspaceRoot, `planning/phases/${selectedPhaseId}/Phase_Planning`, ".json");
  const workCardPlan = findByPrefix(workspaceRoot, `planning/phases/${selectedPhaseId}/Work_Card_Plan`, ".json");
  if (!phasePlanning || !workCardPlan) {
    return { complete: false, phaseId: selectedPhaseId, reason: "Phase Planning and Work Card Plan are both required." };
  }
  const phasePlanningFreshness = evaluateDocumentFreshness(workspaceRoot, phasePlanning.logicalDocumentId);
  const workCardPlanFreshness = evaluateDocumentFreshness(workspaceRoot, workCardPlan.logicalDocumentId);
  const complete =
    phasePlanning.effectiveDisposition === "Approved" &&
    workCardPlan.effectiveDisposition === "Approved" &&
    phasePlanning.synchronizationState === "synchronized" &&
    workCardPlan.synchronizationState === "synchronized" &&
    phasePlanningFreshness.state === "fresh" &&
    workCardPlanFreshness.state === "fresh" &&
    readCandidates(workspaceRoot, workCardPlan).ok;

  return {
    complete,
    phaseId: selectedPhaseId,
    reason: complete
      ? "Phase Planning is complete because both bundle documents are synchronized, fresh, valid, and Approved."
      : "Phase Planning remains incomplete until both bundle documents are synchronized, fresh, valid, and Approved.",
  };
}

export function reviseWorkCardPlanCandidates(
  workspaceRoot: string,
  phaseId: string,
  candidates: WorkCardCandidate[],
): void {
  const normalizedCandidates = validateCandidates(candidates);
  const phasePlanning = requiredAny(workspaceRoot, `planning/phases/${phaseId}/Phase_Planning`, ".json");
  const workCardPlan = requiredAny(workspaceRoot, `planning/phases/${phaseId}/Work_Card_Plan`, ".json");
  savePlanningDocumentRevision(workspaceRoot, workCardPlan.logicalDocumentId);
  const revised = requiredAny(workspaceRoot, `planning/phases/${phaseId}/Work_Card_Plan`, ".json");
  rewriteWorkCardPlanCandidates(workspaceRoot, revised, normalizedCandidates);
  setPhasePlanningBundleDisposition(workspaceRoot, phaseId, "Pending");
  const updatedPhasePlanning = requiredAny(workspaceRoot, `planning/phases/${phaseId}/Phase_Planning`, ".json");
  if (updatedPhasePlanning.effectiveDisposition !== "Pending" || revised.logicalDocumentId !== workCardPlan.logicalDocumentId || phasePlanning.logicalDocumentId.length === 0) {
    throw new Error("Phase Planning bundle revision could not be confirmed.");
  }
}

export function validateCandidates(value: unknown): WorkCardCandidate[] {
  if (!Array.isArray(value)) {
    throw new Error("Work Card Plan candidates must be an array.");
  }
  const ids = new Set<string>();
  return value.map((entry) => {
    if (!entry || typeof entry !== "object") {
      throw new Error("Each Work Card candidate must be an object.");
    }
    if (Object.prototype.hasOwnProperty.call(entry, "completed")) {
      throw new Error("Work Card candidate completion must be derived, not persisted.");
    }
    const candidate = entry as Record<string, unknown>;
    if (
      typeof candidate.candidateId !== "string" ||
      typeof candidate.order !== "number" ||
      !Number.isInteger(candidate.order) ||
      typeof candidate.title !== "string" ||
      typeof candidate.purpose !== "string" ||
      !Array.isArray(candidate.dependsOn) ||
      !candidate.dependsOn.every((item) => typeof item === "string") ||
      typeof candidate.resolutionStatus !== "string" ||
      !candidateResolutionStatuses.includes(candidate.resolutionStatus as CandidateResolutionStatus) ||
      typeof candidate.resolutionReason !== "string" ||
      !Array.isArray(candidate.evidencePaths) ||
      !candidate.evidencePaths.every((item) => typeof item === "string")
    ) {
      throw new Error("Work Card candidates must use the canonical candidate fields.");
    }
    if (ids.has(candidate.candidateId)) {
      throw new Error("Work Card candidate IDs must be unique within a phase.");
    }
    ids.add(candidate.candidateId);
    assertResolutionEvidence(candidate as unknown as WorkCardCandidate);
    return {
      candidateId: candidate.candidateId,
      order: candidate.order,
      title: candidate.title,
      purpose: candidate.purpose,
      dependsOn: candidate.dependsOn,
      resolutionStatus: candidate.resolutionStatus as CandidateResolutionStatus,
      resolutionReason: candidate.resolutionReason,
      evidencePaths: candidate.evidencePaths,
      carriedForwardToPhaseId: typeof candidate.carriedForwardToPhaseId === "string"
        ? candidate.carriedForwardToPhaseId
        : undefined,
    };
  });
}

function assertResolutionEvidence(candidate: WorkCardCandidate): void {
  if (candidate.resolutionStatus === "planned") {
    return;
  }
  if (!candidate.resolutionReason.trim()) {
    throw new Error("Non-planned candidates require a resolution reason.");
  }
  if (candidate.evidencePaths.length === 0) {
    throw new Error("Non-planned candidates require evidence paths.");
  }
  if (candidate.resolutionStatus === "carriedForward" && !candidate.carriedForwardToPhaseId) {
    throw new Error("Carried-forward candidates require a target phase ID.");
  }
}

function readCandidates(workspaceRoot: string, workCardPlan: PlanningDocumentSummary): { ok: boolean; candidates: WorkCardCandidate[] } {
  try {
    if (!workCardPlan.jsonPath) {
      return { ok: false, candidates: [] };
    }
    const parsed = JSON.parse(fs.readFileSync(path.join(workspaceRoot, workCardPlan.jsonPath), "utf8"));
    return { ok: true, candidates: validateCandidates(parsed.candidates) };
  } catch {
    return { ok: false, candidates: [] };
  }
}

function selectedPhaseFromProjection(workspaceRoot: string): PhaseMapPhase {
  const projection = getPhaseMapProjection(workspaceRoot);
  if (projection.state !== "first-incomplete") {
    throw new Error(`Resolver-selected phase is unavailable: ${projection.state}`);
  }
  return projection.phase;
}

function requiredApproved(workspaceRoot: string, prefix: string, extension: ".json") {
  const document = requiredAny(workspaceRoot, prefix, extension);
  if (document.effectiveDisposition !== "Approved") {
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

function requiredAny(workspaceRoot: string, prefix: string, extension: ".json") {
  const document = findByPrefix(workspaceRoot, prefix, extension);
  if (!document) {
    throw new Error(`Phase Planning document is missing: ${prefix}`);
  }
  return document;
}

function findByPrefix(workspaceRoot: string, prefix: string, extension: ".json") {
  return listPlanningDocuments(workspaceRoot)
    .filter((document) => (document.jsonPath ?? document.markdownPath ?? "").startsWith(prefix))
    .filter((document) => (document.jsonPath ?? document.markdownPath ?? "").endsWith(extension))
    .at(-1);
}

function rewriteWorkCardPlanCandidates(
  workspaceRoot: string,
  workCardPlan: PlanningDocumentSummary,
  candidates: WorkCardCandidate[],
): void {
  if (!workCardPlan.jsonPath || !workCardPlan.markdownPath) {
    throw new Error("Work Card Plan pair is required.");
  }
  const jsonPath = path.join(workspaceRoot, workCardPlan.jsonPath);
  const markdownPath = path.join(workspaceRoot, workCardPlan.markdownPath);
  const parsed = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  parsed.candidates = candidates;
  parsed.documentDisposition = { status: "Pending" };
  fs.writeFileSync(jsonPath, json(parsed), "utf8");
  fs.writeFileSync(
    markdownPath,
    renderWorkCardPlanMarkdown(parsed.selectedPhase, parsed.sourceRevisions ?? [], candidates, parsed.artifactRevision ?? 1),
    "utf8",
  );
}

function renderHandoffMarkdown(
  phase: PhaseMapPhase,
  sourceRevisions: SourceRevision[],
  phasePlanningMarkdownPath: string,
  phasePlanningJsonPath: string,
  workCardPlanMarkdownPath: string,
  workCardPlanJsonPath: string,
): string {
  return [
    `# Phase Planning Architect Handoff - ${phase.phaseId}`,
    "Artifact.Revision=1",
    "participationRole=nonReviewHandoff",
    `phaseId=${phase.phaseId}`,
    "",
    "## Source Revisions",
    ...sourceRevisions.map((source) => `- path: ${source.path} revision: ${source.revision}`),
    "",
    "## Output Targets",
    phasePlanningMarkdownPath,
    phasePlanningJsonPath,
    workCardPlanMarkdownPath,
    workCardPlanJsonPath,
    "",
    "## Document Disposition",
    "",
    "Document.Status=Approved",
    "",
  ].join("\n");
}

function renderPhasePlanningMarkdown(
  phase: PhaseMapPhase,
  sourceRevisions: SourceRevision[],
  candidates: WorkCardCandidate[],
): string {
  return [
    "# Phase Planning",
    "Artifact.Revision=1",
    "participationRole=compoundGatingReview",
    `phaseId=${phase.phaseId}`,
    "",
    "## Source Revisions",
    ...sourceRevisions.map((source) => `- path: ${source.path} revision: ${source.revision}`),
    "",
    "## Candidate IDs",
    ...candidates.map((candidate) => `- ${candidate.candidateId}`),
    "",
    "## Document Disposition",
    "",
    "Document.Status=Pending",
    "",
  ].join("\n");
}

function renderWorkCardPlanMarkdown(
  phase: PhaseMapPhase,
  sourceRevisions: SourceRevision[],
  candidates: WorkCardCandidate[],
  artifactRevision = 1,
): string {
  return [
    "# Work Card Plan",
    `Artifact.Revision=${artifactRevision}`,
    "participationRole=compoundGatingReview",
    `phaseId=${phase.phaseId}`,
    "",
    "## Source Revisions",
    ...sourceRevisions.map((source) => `- path: ${source.path} revision: ${source.revision}`),
    "",
    "## Candidates",
    ...candidates.map((candidate) =>
      [
        `- candidateId: ${candidate.candidateId}`,
        `  order: ${candidate.order}`,
        `  title: ${candidate.title}`,
        `  purpose: ${candidate.purpose}`,
        `  dependsOn: ${candidate.dependsOn.join(", ")}`,
        `  resolutionStatus: ${candidate.resolutionStatus}`,
        `  resolutionReason: ${candidate.resolutionReason}`,
        `  evidencePaths: ${candidate.evidencePaths.join(", ")}`,
      ].join("\n"),
    ),
    "",
    "## Document Disposition",
    "",
    "Document.Status=Pending",
    "",
  ].join("\n");
}

function defaultCandidate(): WorkCardCandidate {
  return {
    candidateId: "WC01",
    order: 1,
    title: "Initial Work Card",
    purpose: "Implement the first mapped unit of work.",
    dependsOn: [],
    resolutionStatus: "planned",
    resolutionReason: "",
    evidencePaths: [],
  };
}

function writeFiles(workspaceRoot: string, entries: Array<[relativePath: string, content: string]>): void {
  writeArtifactTransaction(
    workspaceRoot,
    entries.map(([relativePath, content]) => ({ relativePath, content })),
  );
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
