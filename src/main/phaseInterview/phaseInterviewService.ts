import fs from "node:fs";
import path from "node:path";
import type { DocumentDispositionStatus } from "../../shared/documents/documentDisposition";
import type { PlanningDocumentSummary, SourceRevision } from "../../shared/documents/planningDocument";
import { isSemanticallyComplete } from "../../shared/documents/lifecycleArtifact";
import {
  evaluateDocumentFreshness,
  listPlanningDocuments,
  setDocumentDisposition,
} from "../documents/planningDocumentService";
import { getPhaseMapProjection, type PhaseMapPhase } from "../phaseMap/phaseMapService";

export interface PhaseInterviewHandoffResult {
  phaseId: string;
  handoffMarkdownPath: string;
  handoffJsonPath: string;
  interviewMarkdownPath: string;
  interviewJsonPath: string;
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
  const profile = requiredApproved(workspaceRoot, "planning/project/PROJECT_PROFILE", ".json");
  const roadmap = requiredApproved(workspaceRoot, "planning/project/Project_Roadmap/PROJECT_ROADMAP", ".json");
  const phaseMap = requiredApproved(workspaceRoot, "planning/project/Phase_Map/PHASE_MAP", ".json");
  const priorCloseouts = priorCloseoutSources(workspaceRoot, selectedPhase);
  const sourceRevisions = [
    { path: profile.jsonPath!, revision: profile.metadata.artifactRevision ?? 1 },
    { path: roadmap.jsonPath!, revision: roadmap.metadata.artifactRevision ?? 1 },
    { path: phaseMap.jsonPath!, revision: phaseMap.metadata.artifactRevision ?? 1 },
    ...priorCloseouts.map((document) => ({
      path: document.jsonPath!,
      revision: document.metadata.artifactRevision ?? 1,
    })),
  ];
  const handoffMarkdownPath = `planning/phases/${selectedPhase.phaseId}/Architect_Handoffs/PHASE_INTERVIEW_ARCHITECT_HANDOFF_${selectedPhase.phaseId}.md`;
  const handoffJsonPath = `planning/phases/${selectedPhase.phaseId}/Architect_Handoffs/PHASE_INTERVIEW_ARCHITECT_HANDOFF_${selectedPhase.phaseId}.json`;
  const interviewMarkdownPath = `planning/phases/${selectedPhase.phaseId}/Phase_Interview.md`;
  const interviewJsonPath = `planning/phases/${selectedPhase.phaseId}/Phase_Interview.json`;
  const draft = interviewDraft(selectedPhase, sourceRevisions, priorCloseouts, options);

  writeFiles(workspaceRoot, [
    [
      handoffMarkdownPath,
      renderHandoffMarkdown(selectedPhase, sourceRevisions, interviewMarkdownPath, interviewJsonPath),
    ],
    [
      handoffJsonPath,
      json({
        artifactType: "phase-interview-architect-handoff",
        artifactRevision: 1,
        participationRole: "nonReviewHandoff",
        phaseId: selectedPhase.phaseId,
        selectedPhase,
        sourceRevisions,
        outputTargets: {
          phaseInterview: { markdown: interviewMarkdownPath, json: interviewJsonPath },
        },
        documentDisposition: { status: "Approved" },
      }),
    ],
    [interviewMarkdownPath, renderInterviewMarkdown(draft)],
    [interviewJsonPath, json(draft)],
  ]);

  return {
    phaseId: selectedPhase.phaseId,
    handoffMarkdownPath,
    handoffJsonPath,
    interviewMarkdownPath,
    interviewJsonPath,
  };
}

export function setPhaseInterviewDisposition(
  workspaceRoot: string,
  phaseId: string,
  status: DocumentDispositionStatus,
): void {
  const interview = requiredAny(workspaceRoot, `planning/phases/${phaseId}/Phase_Interview`, ".json");
  setDocumentDisposition(workspaceRoot, interview.logicalDocumentId, status);
}

export function getPhaseIntakeCompletion(
  workspaceRoot: string,
  phaseId?: string,
): PhaseIntakeCompletion {
  const selectedPhaseId = phaseId ?? selectedPhaseFromProjection(workspaceRoot).phaseId;
  const interview = findByPrefix(workspaceRoot, `planning/phases/${selectedPhaseId}/Phase_Interview`, ".json");
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
    interview.synchronizationState === "synchronized" &&
    freshness.state === "fresh";

  return {
    complete,
    phaseId: selectedPhaseId,
    reason: complete
      ? "Phase Intake is complete because the current Phase Interview is synchronized, fresh, and Approved."
      : "Phase Intake remains incomplete until the current Phase Interview is synchronized, fresh, and Approved.",
  };
}

function selectedPhaseFromProjection(workspaceRoot: string): PhaseMapPhase {
  const projection = getPhaseMapProjection(workspaceRoot);
  if (projection.state !== "first-incomplete") {
    throw new Error(`Resolver-selected phase is unavailable: ${projection.state}`);
  }
  return projection.phase;
}

function interviewDraft(
  phase: PhaseMapPhase,
  sourceRevisions: SourceRevision[],
  priorCloseouts: PlanningDocumentSummary[],
  options: PhaseInterviewDraftOptions,
) {
  const clarificationRequired = options.clarificationRequired ?? false;
  return {
    artifactType: "phase-interview",
    artifactRevision: 1,
    participationRole: "gatingReview",
    phaseId: phase.phaseId,
    selectedPhase: phase,
    sourceRevisions,
    reviewedSources: sourceRevisions.map((source) => source.path),
    predecessorContext: priorCloseouts.map((document) => ({
      phaseId: document.metadata.phaseId,
      path: document.jsonPath ?? document.markdownPath,
    })),
    clarificationRequired,
    questionsAndAnswers: clarificationRequired ? options.questionsAndAnswers ?? [] : [],
    acceptedAssumptions: options.acceptedAssumptions ?? (
      clarificationRequired
        ? []
        : ["Required context was reviewed; no additional clarification was needed."]
    ),
    constraintsRisksDependenciesOutcome:
      options.constraintsRisksDependenciesOutcome ??
      `${phase.title}: ${phase.purpose}`,
    evidencePaths: [
      ...sourceRevisions.map((source) => source.path),
      ...phase.sourceReferences,
    ],
    documentDisposition: { status: "Pending" as const },
  };
}

function priorCloseoutSources(workspaceRoot: string, phase: PhaseMapPhase): PlanningDocumentSummary[] {
  const documents = listPlanningDocuments(workspaceRoot);
  const dependencyIds = new Set(phase.dependsOn);
  return documents
    .filter((document) => document.displayFilename.toLowerCase().includes("phase_closeout"))
    .filter((document) => document.jsonPath)
    .filter((document) => document.metadata.phaseId && dependencyIds.has(document.metadata.phaseId))
    .filter(isSemanticallyComplete);
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
    throw new Error(`Phase Interview document is missing: ${prefix}`);
  }
  return document;
}

function findByPrefix(workspaceRoot: string, prefix: string, extension: ".json") {
  return listPlanningDocuments(workspaceRoot)
    .filter((document) => (document.jsonPath ?? document.markdownPath ?? "").startsWith(prefix))
    .filter((document) => (document.jsonPath ?? document.markdownPath ?? "").endsWith(extension))
    .at(-1);
}

function renderHandoffMarkdown(
  phase: PhaseMapPhase,
  sourceRevisions: SourceRevision[],
  interviewMarkdownPath: string,
  interviewJsonPath: string,
): string {
  return [
    `# Phase Interview Architect Handoff - ${phase.phaseId}`,
    "Artifact.Revision=1",
    "participationRole=nonReviewHandoff",
    `phaseId=${phase.phaseId}`,
    "",
    "## Source Revisions",
    ...sourceRevisions.map((source) => `- path: ${source.path} revision: ${source.revision}`),
    "",
    "## Output Targets",
    interviewMarkdownPath,
    interviewJsonPath,
    "",
    "## Document Disposition",
    "",
    "Document.Status=Approved",
    "",
  ].join("\n");
}

function renderInterviewMarkdown(draft: ReturnType<typeof interviewDraft>): string {
  return [
    "# Phase Interview",
    `Artifact.Revision=${draft.artifactRevision}`,
    `participationRole=${draft.participationRole}`,
    `phaseId=${draft.phaseId}`,
    "",
    "## Source Revisions",
    ...draft.sourceRevisions.map((source) => `- path: ${source.path} revision: ${source.revision}`),
    "",
    "## Interview",
    `Clarification.Required=${draft.clarificationRequired ? "Yes" : "No"}`,
    ...draft.questionsAndAnswers.map((entry) => `- Q: ${entry.question}\n  A: ${entry.answer}`),
    ...draft.acceptedAssumptions.map((entry) => `- Assumption: ${entry}`),
    "",
    "## Context",
    draft.constraintsRisksDependenciesOutcome,
    "",
    "## Document Disposition",
    "",
    "Document.Status=Pending",
    "",
  ].join("\n");
}

function writeFiles(workspaceRoot: string, entries: Array<[relativePath: string, content: string]>): void {
  const originals = new Map<string, Buffer | null>();
  try {
    for (const [relativePath] of entries) {
      const absolutePath = path.join(workspaceRoot, relativePath);
      originals.set(absolutePath, fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath) : null);
    }
    for (const [relativePath, content] of entries) {
      const absolutePath = path.join(workspaceRoot, relativePath);
      fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
      fs.writeFileSync(absolutePath, content, "utf8");
    }
  } catch (error) {
    for (const [absolutePath, content] of originals) {
      if (content === null) {
        if (fs.existsSync(absolutePath)) fs.unlinkSync(absolutePath);
      } else {
        fs.writeFileSync(absolutePath, content);
      }
    }
    throw error;
  }
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
