import fs from "node:fs";
import path from "node:path";
import {
  type CanonicalDocumentMetadata,
  metadataCloseDelimiter,
  metadataOpenDelimiter,
  parseCanonicalMarkdownDocument,
} from "../../shared/documents/canonicalMarkdown";
import type { DocumentDispositionStatus } from "../../shared/documents/documentDisposition";
import type { PlanningDocumentSummary, SourceRevision } from "../../shared/documents/planningDocument";
import { isSemanticallyComplete } from "../../shared/documents/lifecycleArtifact";
import {
  evaluateDocumentFreshness,
  listPlanningDocuments,
  setDocumentDisposition,
} from "../documents/planningDocumentService";
import { writeCanonicalMarkdownDocument } from "../documents/canonicalMarkdownDocumentWriter";
import { getPhaseMapProjection, type PhaseMapPhase } from "../phaseMap/phaseMapService";

export interface PhaseInterviewHandoffResult {
  phaseId: string;
  handoffMarkdownPath: string;
  interviewMarkdownPath: string;
}

export interface PhaseInterviewDraftOptions {
  clarificationRequired?: boolean;
  questionsAndAnswers?: Array<{ question: string; answer: string }>;
  acceptedAssumptions?: string[];
  constraintsRisksDependenciesOutcome?: string;
}

export interface PhaseIntakeCompletion {
  complete: boolean;
  phaseId?: string;
  reason: string;
}

export function generatePhaseInterviewHandoff(
  workspaceRoot: string,
  options: PhaseInterviewDraftOptions = {},
): PhaseInterviewHandoffResult {
  const selectedPhase = selectedPhaseFromProjection(workspaceRoot);
  const profile = requiredApproved(workspaceRoot, "planning/project/PROJECT_PROFILE", ".md");
  const roadmap = requiredApproved(workspaceRoot, "planning/project/Project_Roadmap/PROJECT_ROADMAP", ".md");
  const phaseMap = requiredApproved(workspaceRoot, "planning/project/Phase_Map/PHASE_MAP", ".md");
  const priorCloseouts = priorCloseoutSources(workspaceRoot, selectedPhase);
  const handoffMarkdownPath = `planning/phases/${selectedPhase.phaseId}/Architect_Handoffs/PHASE_INTERVIEW_ARCHITECT_HANDOFF_${selectedPhase.phaseId}.md`;
  const interviewMarkdownPath = `planning/phases/${selectedPhase.phaseId}/Phase_Interview.md`;
  writeCanonicalMarkdownDocument({
    workspaceRoot,
    relativePath: handoffMarkdownPath,
    metadata: {
      schemaVersion: 1,
      artifactType: "generated-handoff",
      artifactRevision: 1,
      participationRole: "nonReviewHandoff",
      identity: { handoffKind: "phase-interview", phaseId: selectedPhase.phaseId },
      sourceRevisions: [
        { path: profile.markdownPath, revision: profile.metadata.artifactRevision ?? 1 },
        { path: roadmap.markdownPath, revision: roadmap.metadata.artifactRevision ?? 1 },
        { path: phaseMap.markdownPath, revision: phaseMap.metadata.artifactRevision ?? 1 },
        ...priorCloseouts.map((document) => ({ path: document.markdownPath, revision: document.metadata.artifactRevision ?? 1 })),
      ],
      workflowData: {
        handoffKind: "phase-interview",
        phase: selectedPhase,
        outputTarget: interviewMarkdownPath,
      },
      documentDisposition: { status: "Approved", notes: "", reviewedAt: null },
    },
    bodyMarkdown: `# Phase Interview Handoff\n\nOutput Markdown: ${interviewMarkdownPath}\n`,
  });

  return {
    phaseId: selectedPhase.phaseId,
    handoffMarkdownPath,
    interviewMarkdownPath,
  };
}

export function setPhaseInterviewDisposition(
  workspaceRoot: string,
  phaseId: string,
  status: DocumentDispositionStatus,
): void {
  const interview = requiredAny(workspaceRoot, `planning/phases/${phaseId}/Phase_Interview`, ".md");
  setDocumentDisposition(workspaceRoot, interview.logicalDocumentId, status);
}

export function savePhaseInterviewOutput(
  workspaceRoot: string,
  markdownBody: string,
): {
  phaseId: string;
  phaseInterviewMarkdownPath: string;
} {
  const bodyMarkdown = substantiveMarkdown(markdownBody, "Phase Interview");
  const handoff = requiredApprovedHandoff(workspaceRoot);
  const workflowData = handoff.metadata.canonical?.workflowData ?? {};
  const phase = workflowData.phase;
  const phaseId = phase && typeof phase === "object" && typeof (phase as { phaseId?: unknown }).phaseId === "string"
    ? (phase as { phaseId: string }).phaseId
    : typeof handoff.metadata.canonical?.identity.phaseId === "string"
      ? handoff.metadata.canonical.identity.phaseId
      : "";
  if (!phaseId) {
    throw new Error("Phase Interview handoff does not provide phaseId.");
  }
  const phaseInterviewMarkdownPath = requiredMarkdownTarget(workflowData.outputTarget, "outputTarget");
  const sourceRevisions = sourceRevisionsFromHandoff(handoff);

  writeCanonicalMarkdownDocument({
    workspaceRoot,
    relativePath: phaseInterviewMarkdownPath,
    metadata: outputMetadata({
      workspaceRoot,
      relativePath: phaseInterviewMarkdownPath,
      phaseId,
      sourceRevisions,
    }),
    bodyMarkdown,
  });

  return { phaseId, phaseInterviewMarkdownPath };
}

export function getPhaseIntakeCompletion(
  workspaceRoot: string,
  phaseId?: string,
): PhaseIntakeCompletion {
  const selectedPhaseId = phaseId ?? selectedPhaseFromProjection(workspaceRoot).phaseId;
  const interview = findByPrefix(workspaceRoot, `planning/phases/${selectedPhaseId}/Phase_Interview`, ".md");
  if (!interview) {
    return {
      complete: false,
      phaseId: selectedPhaseId,
      reason: "Phase Interview is required for Phase Intake completion.",
    };
  }
  const freshness = evaluateDocumentFreshness(workspaceRoot, interview.logicalDocumentId);
  const complete =
    interview.effectiveDisposition === "Approved" &&
    interview.documentReadState === "readable" &&
    freshness.state === "fresh";

  return {
    complete,
    phaseId: selectedPhaseId,
    reason: complete
      ? "Phase Intake is complete because the current Phase Interview is readable, fresh, and Approved."
      : "Phase Intake remains incomplete until the current Phase Interview is readable, fresh, and Approved.",
  };
}

function selectedPhaseFromProjection(workspaceRoot: string): PhaseMapPhase {
  const projection = getPhaseMapProjection(workspaceRoot);
  if (projection.state !== "first-incomplete") {
    throw new Error(`Resolver-selected phase is unavailable: ${projection.state}`);
  }
  return projection.phase;
}

function priorCloseoutSources(workspaceRoot: string, phase: PhaseMapPhase): PlanningDocumentSummary[] {
  const documents = listPlanningDocuments(workspaceRoot);
  const dependencyIds = new Set(phase.dependsOn);
  return documents
    .filter((document) => document.displayFilename.toLowerCase().includes("phase_closeout"))
    .filter((document) => document.metadata.phaseId && dependencyIds.has(document.metadata.phaseId))
    .filter(isSemanticallyComplete);
}

function requiredApprovedHandoff(workspaceRoot: string): PlanningDocumentSummary {
  const handoff = listPlanningDocuments(workspaceRoot)
    .filter((document) => document.metadata.artifactType === "generated-handoff")
    .filter((document) => document.metadata.canonical?.workflowData.handoffKind === "phase-interview")
    .filter((document) => document.effectiveDisposition === "Approved")
    .at(-1);
  if (!handoff) {
    throw new Error("Current Approved Phase Interview handoff is required.");
  }
  if (evaluateDocumentFreshness(workspaceRoot, handoff.logicalDocumentId).state === "stale") {
    throw new Error("Current Phase Interview handoff is stale.");
  }
  return handoff;
}

function outputMetadata(input: {
  workspaceRoot: string;
  relativePath: string;
  phaseId: string;
  sourceRevisions: SourceRevision[];
}): CanonicalDocumentMetadata {
  const existing = readExistingCanonical(input.workspaceRoot, input.relativePath);
  return {
    schemaVersion: 1,
    artifactType: "phase-interview",
    artifactRevision: existing ? existing.metadata.artifactRevision + 1 : 1,
    participationRole: "gatingReview",
    identity: { phaseId: input.phaseId },
    sourceRevisions: input.sourceRevisions,
    workflowData: {},
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
    throw new Error(`Phase Interview handoff is missing ${field}.`);
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

function requiredApproved(workspaceRoot: string, prefix: string, extension: ".md") {
  const document = requiredAny(workspaceRoot, prefix, extension);
  if (document.effectiveDisposition !== "Approved") {
    throw new Error(`Current Approved input is required: ${prefix}`);
  }
  if (evaluateDocumentFreshness(workspaceRoot, document.logicalDocumentId).state === "stale") {
    throw new Error(`Current input is stale: ${prefix}`);
  }
  return document;
}

function requiredAny(workspaceRoot: string, prefix: string, extension: ".md") {
  const document = findByPrefix(workspaceRoot, prefix, extension);
  if (!document) {
    throw new Error(`Phase Interview document is missing: ${prefix}`);
  }
  return document;
}

function findByPrefix(workspaceRoot: string, prefix: string, extension: ".md") {
  return listPlanningDocuments(workspaceRoot)
    .filter((document) => document.markdownPath.startsWith(prefix))
    .filter((document) => document.markdownPath.endsWith(extension))
    .at(-1);
}
