import fs from "node:fs";
import path from "node:path";
import type { DocumentDispositionStatus } from "../../shared/documents/documentDisposition";
import type { PlanningDocumentSummary, SourceRevision } from "../../shared/documents/planningDocument";
import {
  type CanonicalDocumentMetadata,
  metadataCloseDelimiter,
  metadataOpenDelimiter,
  parseCanonicalMarkdownDocument,
} from "../../shared/documents/canonicalMarkdown";
import {
  evaluateDocumentFreshness,
  listPlanningDocuments,
  savePlanningDocumentRevision,
  setDocumentDispositions,
} from "../documents/planningDocumentService";
import type { RollbackWriteOptions } from "../documents/documentDispositionWriter";
import {
  writeCanonicalMarkdownDocument,
  writeCanonicalMarkdownDocuments,
} from "../documents/canonicalMarkdownDocumentWriter";
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
  phasePlanningMarkdownPath: string;
  workCardPlanMarkdownPath: string;
}

export interface PhasePlanningCompletion {
  complete: boolean;
  phaseId?: string;
  reason: string;
}

export interface PhasePlanningOutputInput {
  phasePlanningMarkdown: string;
  workCardPlanMarkdown: string;
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
  const profile = requiredApproved(workspaceRoot, "planning/project/PROJECT_PROFILE", ".md");
  const roadmap = requiredApproved(workspaceRoot, "planning/project/Project_Roadmap/PROJECT_ROADMAP", ".md");
  const phaseMap = requiredApproved(workspaceRoot, "planning/project/Phase_Map/PHASE_MAP", ".md");
  const phaseInterview = requiredApproved(workspaceRoot, `planning/phases/${selectedPhase.phaseId}/Phase_Interview`, ".md");
  validateCandidates(candidates);
  const handoffMarkdownPath = `planning/phases/${selectedPhase.phaseId}/Architect_Handoffs/PHASE_PLANNING_ARCHITECT_HANDOFF_${selectedPhase.phaseId}.md`;
  const phasePlanningMarkdownPath = `planning/phases/${selectedPhase.phaseId}/Phase_Planning.md`;
  const workCardPlanMarkdownPath = `planning/phases/${selectedPhase.phaseId}/Work_Card_Plan.md`;

  const content = { handoffKind: "phase-planning", phase: selectedPhase, candidates };
  writeCanonicalMarkdownDocument({
    workspaceRoot,
    relativePath: handoffMarkdownPath,
    metadata: {
      schemaVersion: 1,
      artifactType: "generated-handoff",
      artifactRevision: 1,
      participationRole: "nonReviewHandoff",
      identity: { handoffKind: "phase-planning", phaseId: selectedPhase.phaseId },
      sourceRevisions: [
        { path: profile.markdownPath, revision: profile.metadata.artifactRevision ?? 1 },
        { path: roadmap.markdownPath, revision: roadmap.metadata.artifactRevision ?? 1 },
        { path: phaseMap.markdownPath, revision: phaseMap.metadata.artifactRevision ?? 1 },
        { path: phaseInterview.markdownPath, revision: phaseInterview.metadata.artifactRevision ?? 1 },
      ],
      workflowData: {
        ...content,
        phasePlanningTarget: phasePlanningMarkdownPath,
        workCardPlanTarget: workCardPlanMarkdownPath,
      },
      documentDisposition: { status: "Approved", notes: "", reviewedAt: null },
    },
    bodyMarkdown: `# Phase Planning Architect Handoff\n\nPhase Planning Markdown: ${phasePlanningMarkdownPath}\nWork Card Plan Markdown: ${workCardPlanMarkdownPath}\n`,
  });

  return {
    phaseId: selectedPhase.phaseId,
    handoffMarkdownPath,
    phasePlanningMarkdownPath,
    workCardPlanMarkdownPath,
  };
}

export function savePhasePlanningOutputs(
  workspaceRoot: string,
  input: PhasePlanningOutputInput,
): {
  phaseId: string;
  phasePlanningMarkdownPath: string;
  workCardPlanMarkdownPath: string;
} {
  const phasePlanningMarkdown = substantiveMarkdown(input.phasePlanningMarkdown, "Phase Planning");
  const workCardPlanMarkdown = substantiveMarkdown(input.workCardPlanMarkdown, "Work Card Plan");
  const candidates = candidatesFromDomainBlock(workCardPlanMarkdown);
  const handoff = requiredApprovedHandoff(workspaceRoot);
  const workflowData = handoff.metadata.canonical?.workflowData ?? {};
  const phase = workflowData.phase;
  const phaseId = phase && typeof phase === "object" && typeof (phase as { phaseId?: unknown }).phaseId === "string"
    ? (phase as { phaseId: string }).phaseId
    : typeof handoff.metadata.canonical?.identity.phaseId === "string"
      ? handoff.metadata.canonical.identity.phaseId
      : "";
  if (!phaseId) {
    throw new Error("Phase Planning handoff does not provide phaseId.");
  }
  const phasePlanningMarkdownPath = requiredMarkdownTarget(workflowData.phasePlanningTarget, "phasePlanningTarget");
  const workCardPlanMarkdownPath = requiredMarkdownTarget(workflowData.workCardPlanTarget, "workCardPlanTarget");
  const sourceRevisions = sourceRevisionsFromHandoff(handoff);

  writeCanonicalMarkdownDocuments([
    {
      workspaceRoot,
      relativePath: phasePlanningMarkdownPath,
      metadata: outputMetadata({
        workspaceRoot,
        relativePath: phasePlanningMarkdownPath,
        artifactType: "phase-planning",
        phaseId,
        sourceRevisions,
        workflowData: {},
      }),
      bodyMarkdown: phasePlanningMarkdown,
    },
    {
      workspaceRoot,
      relativePath: workCardPlanMarkdownPath,
      metadata: outputMetadata({
        workspaceRoot,
        relativePath: workCardPlanMarkdownPath,
        artifactType: "work-card-plan",
        phaseId,
        sourceRevisions,
        workflowData: { candidates },
      }),
      bodyMarkdown: workCardPlanMarkdown,
    },
  ]);

  return { phaseId, phasePlanningMarkdownPath, workCardPlanMarkdownPath };
}

export function setPhasePlanningBundleDisposition(
  workspaceRoot: string,
  phaseId: string,
  status: DocumentDispositionStatus,
  options: RollbackWriteOptions = {},
): void {
  const phasePlanning = requiredAny(workspaceRoot, `planning/phases/${phaseId}/Phase_Planning`, ".md");
  const workCardPlan = requiredAny(workspaceRoot, `planning/phases/${phaseId}/Work_Card_Plan`, ".md");
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
  const phasePlanning = findByPrefix(workspaceRoot, `planning/phases/${selectedPhaseId}/Phase_Planning`, ".md");
  const workCardPlan = findByPrefix(workspaceRoot, `planning/phases/${selectedPhaseId}/Work_Card_Plan`, ".md");
  if (!phasePlanning || !workCardPlan) {
    return { complete: false, phaseId: selectedPhaseId, reason: "Phase Planning and Work Card Plan are both required." };
  }
  const phasePlanningFreshness = evaluateDocumentFreshness(workspaceRoot, phasePlanning.logicalDocumentId);
  const workCardPlanFreshness = evaluateDocumentFreshness(workspaceRoot, workCardPlan.logicalDocumentId);
  const complete =
    phasePlanning.effectiveDisposition === "Approved" &&
    workCardPlan.effectiveDisposition === "Approved" &&
    phasePlanning.documentReadState === "readable" &&
    workCardPlan.documentReadState === "readable" &&
    phasePlanningFreshness.state === "fresh" &&
    workCardPlanFreshness.state === "fresh" &&
    readCandidates(workspaceRoot, workCardPlan).ok;

  return {
    complete,
    phaseId: selectedPhaseId,
    reason: complete
      ? "Phase Planning is complete because both bundle documents are readable, fresh, valid, and Approved."
      : "Phase Planning remains incomplete until both bundle documents are readable, fresh, valid, and Approved.",
  };
}

export function reviseWorkCardPlanCandidates(
  workspaceRoot: string,
  phaseId: string,
  candidates: WorkCardCandidate[],
): void {
  const normalizedCandidates = validateCandidates(candidates);
  const phasePlanning = requiredAny(workspaceRoot, `planning/phases/${phaseId}/Phase_Planning`, ".md");
  const workCardPlan = requiredAny(workspaceRoot, `planning/phases/${phaseId}/Work_Card_Plan`, ".md");
  savePlanningDocumentRevision(workspaceRoot, workCardPlan.logicalDocumentId);
  const revised = requiredAny(workspaceRoot, `planning/phases/${phaseId}/Work_Card_Plan`, ".md");
  rewriteWorkCardPlanCandidates(workspaceRoot, revised, normalizedCandidates);
  setPhasePlanningBundleDisposition(workspaceRoot, phaseId, "Pending");
  const updatedPhasePlanning = requiredAny(workspaceRoot, `planning/phases/${phaseId}/Phase_Planning`, ".md");
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

function requiredApprovedHandoff(workspaceRoot: string): PlanningDocumentSummary {
  const handoff = listPlanningDocuments(workspaceRoot)
    .filter((document) => document.metadata.artifactType === "generated-handoff")
    .filter((document) => document.metadata.canonical?.workflowData.handoffKind === "phase-planning")
    .filter((document) => document.effectiveDisposition === "Approved")
    .at(-1);
  if (!handoff) {
    throw new Error("Current Approved Phase Planning handoff is required.");
  }
  if (evaluateDocumentFreshness(workspaceRoot, handoff.logicalDocumentId).state === "stale") {
    throw new Error("Current Phase Planning handoff is stale.");
  }
  return handoff;
}

function candidatesFromDomainBlock(markdownBody: string): WorkCardCandidate[] {
  const matches = [...markdownBody.matchAll(/```champcity-work-card-plan\s*\r?\n([\s\S]*?)\r?\n```/g)];
  if (matches.length !== 1) {
    throw new Error("Work Card Plan output requires exactly one champcity-work-card-plan fenced block.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(matches[0][1]);
  } catch (error) {
    throw new Error(`Work Card Plan domain block must contain JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  return validateCandidates(parsed);
}

function outputMetadata(input: {
  workspaceRoot: string;
  relativePath: string;
  artifactType: "phase-planning" | "work-card-plan";
  phaseId: string;
  sourceRevisions: SourceRevision[];
  workflowData: Record<string, unknown>;
}): CanonicalDocumentMetadata {
  const existing = readExistingCanonical(input.workspaceRoot, input.relativePath);
  return {
    schemaVersion: 1,
    artifactType: input.artifactType,
    artifactRevision: existing ? existing.metadata.artifactRevision + 1 : 1,
    participationRole: "compoundGatingReview",
    identity: { phaseId: input.phaseId },
    sourceRevisions: input.sourceRevisions,
    workflowData: input.workflowData,
    documentDisposition: { status: "Pending", notes: "", reviewedAt: null },
  };
}

function readExistingCanonical(workspaceRoot: string, relativePath: string) {
  const absolutePath = path.join(workspaceRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return null;
  }
  return parseCanonicalMarkdownDocument(fs.readFileSync(absolutePath, "utf8"));
}

function sourceRevisionsFromHandoff(handoff: PlanningDocumentSummary): SourceRevision[] {
  return [
    ...(handoff.metadata.sourceRevisions ?? []),
    { path: handoff.markdownPath, revision: handoff.metadata.artifactRevision ?? 1 },
  ];
}

function requiredMarkdownTarget(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim() || path.isAbsolute(value) || value.includes("..") || !value.endsWith(".md")) {
    throw new Error(`Phase Planning handoff is missing ${field}.`);
  }
  return value;
}

function substantiveMarkdown(value: string, label: string): string {
  const body = value.trim();
  if (!body) {
    throw new Error(`${label} output requires substantive Markdown.`);
  }
  if (body.includes(metadataOpenDelimiter) || body.includes(metadataCloseDelimiter)) {
    throw new Error(`${label} output must not contain application metadata delimiters.`);
  }
  return body;
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
    if (!workCardPlan.markdownPath) {
      return { ok: false, candidates: [] };
    }
    const parsed = readWorkflowData(workspaceRoot, workCardPlan.markdownPath);
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

function requiredApproved(workspaceRoot: string, prefix: string, extension: ".md") {
  const document = requiredAny(workspaceRoot, prefix, extension);
  if (document.effectiveDisposition !== "Approved") {
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

function requiredAny(workspaceRoot: string, prefix: string, extension: ".md") {
  const document = findByPrefix(workspaceRoot, prefix, extension);
  if (!document) {
    throw new Error(`Phase Planning document is missing: ${prefix}`);
  }
  return document;
}

function findByPrefix(workspaceRoot: string, prefix: string, extension: ".md") {
  return listPlanningDocuments(workspaceRoot)
    .filter((document) => document.markdownPath.startsWith(prefix))
    .filter((document) => document.markdownPath.endsWith(extension))
    .at(-1);
}

function rewriteWorkCardPlanCandidates(
  workspaceRoot: string,
  workCardPlan: PlanningDocumentSummary,
  candidates: WorkCardCandidate[],
): void {
  if (!workCardPlan.markdownPath) {
    throw new Error("Work Card Plan Markdown is required.");
  }
  const content = {
    candidates,
  };
  writeCanonicalMarkdownDocument({
    workspaceRoot,
    relativePath: workCardPlan.markdownPath,
    metadata: {
      schemaVersion: 1,
      artifactType: "work-card-plan",
      artifactRevision: workCardPlan.metadata.artifactRevision ?? 1,
      participationRole: "compoundGatingReview",
      identity: {
        phaseId: workCardPlan.metadata.phaseId ?? "",
      },
      sourceRevisions: workCardPlan.metadata.sourceRevisions ?? [],
      workflowData: content,
      documentDisposition: { status: "Pending", notes: "", reviewedAt: null },
    },
    bodyMarkdown: `# Work Card Plan\n\n## Candidates\n${candidates.map((candidate) => `- ${candidate.candidateId}: ${candidate.title}`).join("\n")}\n`,
  });
}

function readWorkflowData(workspaceRoot: string, relativePath: string): Record<string, unknown> {
  const parsed = parseCanonicalMarkdownDocument(fs.readFileSync(path.join(workspaceRoot, relativePath), "utf8"));
  return parsed.metadata.workflowData;
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
