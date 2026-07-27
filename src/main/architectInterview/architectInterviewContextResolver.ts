import type { DocumentDispositionStatus } from "../../shared/documents/documentDisposition";
import type { PlanningDocumentSummary } from "../../shared/documents/planningDocument";
import { analyzeProjectIntakeCorpus } from "../../shared/projectIntake/projectIntakeCorpus";
import {
  evaluateDocumentFreshness,
  listPlanningDocuments,
} from "../documents/planningDocumentService";

export type CanonicalArchitectInterviewContextStatus =
  | "prerequisites-unavailable"
  | "ready"
  | "conflict"
  | "local-error";

export interface CanonicalArtifactIdentity {
  logicalDocumentId: string;
  markdownPath: string;
  artifactRevision: number;
  disposition: DocumentDispositionStatus;
  documentReadState: NonNullable<PlanningDocumentSummary["documentReadState"]>;
  freshnessState?: "fresh" | "stale";
  participationRole?: string;
  artifactType?: string;
  readError?: string;
}

export interface CanonicalArchitectInterviewReadyContext {
  status: "ready";
  projectIntake: CanonicalArtifactIdentity;
  prompt: CanonicalArtifactIdentity & {
    outputTarget: {
      markdownPath: string;
    };
  };
  interviewTargets: {
    markdownPath: string;
  };
  interview?: CanonicalArtifactIdentity & {
    operatorReviewNotes?: string;
  };
  invalidInterview?: CanonicalArtifactIdentity;
  invalidInterviewReason?: string;
  invalidInterviewFreshnessState?: "fresh" | "stale";
  evidencePaths: string[];
}

export type CanonicalArchitectInterviewContext =
  | CanonicalArchitectInterviewReadyContext
  | {
      status: Exclude<CanonicalArchitectInterviewContextStatus, "ready">;
      reason: string;
      evidencePaths: string[];
    };

export function resolveCanonicalArchitectInterviewContext(
  workspaceRoot: string,
): CanonicalArchitectInterviewContext {
  try {
    const documents = listPlanningDocuments(workspaceRoot);
    const intakeCorpus = analyzeProjectIntakeCorpus(documents);
    if (intakeCorpus.state === "open") {
      return unavailable("No active canonical Project Intake Markdown document is available.", []);
    }
    if (intakeCorpus.state === "conflict") {
      return conflict("Multiple active canonical Project Intake Markdown documents are available.", intakeCorpus.evidencePaths);
    }

    const intakeDocument = intakeCorpus.documents[0];
    if (intakeDocument.effectiveDisposition !== "Approved") {
      return unavailable("The active Project Intake must be Approved before Architect Interview handoff.", evidence(intakeDocument));
    }
    if (intakeDocument.readError) {
      return localError("The active Project Intake is not readable as canonical Markdown.", evidence(intakeDocument));
    }
    const intakeIdentity = identityFor(intakeDocument);

    const promptCandidates = documents.filter((document) =>
      isCurrentAssociatedPrompt(document, intakeIdentity),
    );
    if (promptCandidates.length === 0) {
      return unavailable("No Approved associated Project Architect Interview Prompt Markdown document is available.", evidence(intakeDocument));
    }
    if (promptCandidates.length > 1) {
      return conflict(
        "Multiple Approved associated Project Architect Interview Prompt Markdown documents are available.",
        promptCandidates.flatMap(evidence),
      );
    }

    const promptDocument = promptCandidates[0];
    if (promptDocument.readError) {
      return localError("The associated Project Architect Interview Prompt is not readable as canonical Markdown.", evidence(promptDocument));
    }
    const promptIdentity = identityFor(promptDocument);
    const outputMarkdown = promptDocument.metadata.architectOutputTargets?.markdown ??
      defaultInterviewTarget(promptDocument);
    const interviewTargets = {
      markdownPath: outputMarkdown,
    };

    const targetMatches = documents.filter((document) => document.markdownPath === outputMarkdown);
    const interviewValidation = validateInterviewDocument(
      workspaceRoot,
      targetMatches,
      interviewTargets,
      intakeIdentity,
      promptIdentity,
    );

    return {
      status: "ready",
      projectIntake: intakeIdentity,
      prompt: { ...promptIdentity, outputTarget: interviewTargets },
      interviewTargets,
      interview: interviewValidation.identity,
      invalidInterview: interviewValidation.invalidIdentity,
      invalidInterviewReason: interviewValidation.reason,
      invalidInterviewFreshnessState: interviewValidation.freshnessState,
      evidencePaths: [
        ...evidence(intakeDocument),
        ...evidence(promptDocument),
        ...interviewValidation.evidencePaths,
      ],
    };
  } catch (error) {
    return localError(error instanceof Error ? error.message : String(error), []);
  }
}

function isCurrentAssociatedPrompt(
  document: PlanningDocumentSummary,
  intake: CanonicalArtifactIdentity,
): boolean {
  if (document.metadata.artifactType !== "project-architect-interview-prompt") return false;
  if (document.metadata.participationRole !== "nonReviewHandoff") return false;
  if (document.effectiveDisposition !== "Approved") return false;
  return (document.metadata.sourceRevisions ?? []).some(
    (source) => source.path === intake.markdownPath && source.revision === intake.artifactRevision,
  );
}

function validateInterviewDocument(
  workspaceRoot: string,
  targetMatches: PlanningDocumentSummary[],
  targets: { markdownPath: string },
  intake: CanonicalArtifactIdentity,
  prompt: CanonicalArtifactIdentity,
): {
  identity?: CanonicalArtifactIdentity & { operatorReviewNotes?: string };
  invalidIdentity?: CanonicalArtifactIdentity;
  freshnessState?: "fresh" | "stale";
  reason?: string;
  evidencePaths: string[];
} {
  if (targetMatches.length === 0) {
    return { evidencePaths: [] };
  }
  const evidencePaths = targetMatches.flatMap(evidence);
  if (targetMatches.length > 1) {
    return {
      invalidIdentity: identityFor(targetMatches[0]),
      reason: "Architect Interview output resolves to duplicate active Markdown documents.",
      evidencePaths,
    };
  }
  const document = targetMatches[0];
  const invalidIdentity = identityFor(document);
  if (document.markdownPath !== targets.markdownPath) {
    return { invalidIdentity, reason: "Architect Interview output must use the exact application-owned Markdown target.", evidencePaths };
  }
  if (document.metadata.artifactType !== "project-architect-interview") {
    return { invalidIdentity, reason: "Architect Interview output must use artifactType=project-architect-interview.", evidencePaths };
  }
  if (document.metadata.participationRole !== "gatingReview") {
    return { invalidIdentity, reason: "Architect Interview output must use participationRole=gatingReview.", evidencePaths };
  }
  if (document.readError) {
    return { invalidIdentity, reason: document.readError, evidencePaths };
  }
  if (!hasExactSourceRevision(document, intake.markdownPath, intake.artifactRevision)) {
    return {
      invalidIdentity,
      reason: "Architect Interview output must reference the current Project Intake Markdown source revision.",
      freshnessState: hasSourcePath(document, intake.markdownPath) ? "stale" : undefined,
      evidencePaths,
    };
  }
  if (!hasExactSourceRevision(document, prompt.markdownPath, prompt.artifactRevision)) {
    return {
      invalidIdentity,
      reason: "Architect Interview output must reference the current Architect Interview Prompt Markdown source revision.",
      freshnessState: hasSourcePath(document, prompt.markdownPath) ? "stale" : undefined,
      evidencePaths,
    };
  }
  const freshness = evaluateDocumentFreshness(workspaceRoot, document.logicalDocumentId);
  if (freshness.state !== "fresh") {
    return {
      invalidIdentity,
      reason: `Architect Interview output is stale: ${freshness.staleSources.map((source) => source.path).join("; ")}.`,
      freshnessState: "stale",
      evidencePaths,
    };
  }
  return {
    identity: {
      ...invalidIdentity,
      freshnessState: "fresh",
      operatorReviewNotes: document.metadata.canonical?.documentDisposition.notes ?? "",
    },
    evidencePaths,
  };
}

function identityFor(document: PlanningDocumentSummary): CanonicalArtifactIdentity {
  return {
    logicalDocumentId: document.logicalDocumentId,
    markdownPath: document.markdownPath,
    artifactRevision: document.metadata.artifactRevision ?? 0,
    disposition: document.effectiveDisposition,
    documentReadState: document.documentReadState ?? "readable",
    participationRole: document.metadata.participationRole,
    artifactType: document.metadata.artifactType,
    readError: document.readError,
  };
}

function defaultInterviewTarget(promptDocument: PlanningDocumentSummary): string {
  const slug = promptDocument.markdownPath.match(/PROJECT_ARCHITECT_INTERVIEW_PROMPT_(.+)\.md$/)?.[1] ?? "project";
  return `planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_${slug}.md`;
}

function evidence(document: PlanningDocumentSummary): string[] {
  return [document.markdownPath];
}

function hasExactSourceRevision(
  document: PlanningDocumentSummary,
  sourcePath: string,
  revision: number,
): boolean {
  return (document.metadata.sourceRevisions ?? []).some(
    (source) => source.path === sourcePath && source.revision === revision,
  );
}

function hasSourcePath(document: PlanningDocumentSummary, sourcePath: string): boolean {
  return (document.metadata.sourceRevisions ?? []).some((source) => source.path === sourcePath);
}

function unavailable(reason: string, evidencePaths: string[]): CanonicalArchitectInterviewContext {
  return { status: "prerequisites-unavailable", reason, evidencePaths };
}

function conflict(reason: string, evidencePaths: string[]): CanonicalArchitectInterviewContext {
  return { status: "conflict", reason, evidencePaths };
}

function localError(reason: string, evidencePaths: string[]): CanonicalArchitectInterviewContext {
  return { status: "local-error", reason, evidencePaths };
}
