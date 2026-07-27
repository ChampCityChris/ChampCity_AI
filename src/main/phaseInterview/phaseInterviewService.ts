import type { DocumentDispositionStatus } from "../../shared/documents/documentDisposition";
import type { PlanningDocumentSummary } from "../../shared/documents/planningDocument";
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
