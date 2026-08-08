import type { DocumentDispositionStatus } from "../../shared/documents/documentDisposition";
import type { PlanningDocumentSummary } from "../../shared/documents/planningDocument";
import {
  analyzeProjectIntakeCorpus,
  isCanonicalProjectIntakePath,
} from "../../shared/projectIntake/projectIntakeCorpus";
import {
  evaluateDocumentFreshness,
  listPlanningDocuments,
} from "../documents/planningDocumentService";
import {
  projectArchitectInterviewPromptPath,
  projectArchitectInterviewTargetPath,
} from "./projectArchitectInterviewPromptWriter";

export type CanonicalArchitectInterviewContextStatus =
  | "prerequisites-unavailable"
  | "prompt-missing-recoverable"
  | "ready"
  | "conflict"
  | "local-error";

export interface CanonicalArtifactIdentity {
  logicalDocumentId: string;
  markdownPath: string;
  artifactRevision: number;
  disposition: DocumentDispositionStatus;
  canonicalIdentity: Record<string, unknown>;
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
  expectedProjectIdentity: Record<string, unknown>;
  evidencePaths: string[];
}

export type CanonicalArchitectInterviewContext =
  | CanonicalArchitectInterviewReadyContext
  | {
      status: "prompt-missing-recoverable";
      reason: string;
      projectIntake: CanonicalArtifactIdentity;
      projectSlug: string;
      promptTargetPath: string;
      interviewTargets: {
        markdownPath: string;
      };
      evidencePaths: string[];
    }
  | {
      status: Exclude<CanonicalArchitectInterviewContextStatus, "ready" | "prompt-missing-recoverable">;
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
    const projectSlug = projectSlugForIntake(intakeDocument);
    const deterministicPromptPath = projectArchitectInterviewPromptPath(projectSlug);
    const deterministicInterviewTargetPath = projectArchitectInterviewTargetPath(projectSlug);

    const promptCandidates = documents.filter((document) =>
      isCurrentAssociatedPrompt(document, intakeIdentity),
    );
    if (promptCandidates.length === 0) {
      const targetDocument = documents.find((document) => document.markdownPath === deterministicPromptPath);
      if (targetDocument) {
        return conflict(
          "Project Architect Interview Prompt target exists but is not the current Approved associated prompt. Resolve the conflicting prompt file before regenerating.",
          [...evidence(intakeDocument), ...evidence(targetDocument)],
        );
      }
      return {
        status: "prompt-missing-recoverable",
        reason: "Project Architect Interview Prompt Markdown is missing and can be regenerated from the Approved Project Intake.",
        projectIntake: intakeIdentity,
        projectSlug,
        promptTargetPath: deterministicPromptPath,
        interviewTargets: { markdownPath: deterministicInterviewTargetPath },
        evidencePaths: evidence(intakeDocument),
      };
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
    const expectedIdentity = expectedProjectIdentity(intakeIdentity, promptIdentity);

    const targetMatches = documents.filter((document) => document.markdownPath === outputMarkdown);
    const identityMatches = documents.filter((document) =>
      document.metadata.artifactType === "project-architect-interview" &&
      sameIdentity(document.metadata.canonical?.identity ?? {}, expectedIdentity)
    );
    if (identityMatches.length > 1) {
      return conflict(
        "Multiple active Project Architect Interview Markdown documents share the current canonical identity.",
        [
          ...evidence(intakeDocument),
          ...evidence(promptDocument),
          ...identityMatches.flatMap(evidence),
        ],
      );
    }
    const interviewValidation = validateInterviewDocument(
      workspaceRoot,
      targetMatches,
      identityMatches,
      interviewTargets,
      intakeIdentity,
      promptIdentity,
      expectedIdentity,
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
      expectedProjectIdentity: expectedIdentity,
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
  identityMatches: PlanningDocumentSummary[],
  targets: { markdownPath: string },
  intake: CanonicalArtifactIdentity,
  prompt: CanonicalArtifactIdentity,
  expectedIdentity: Record<string, unknown>,
): {
  identity?: CanonicalArtifactIdentity & { operatorReviewNotes?: string };
  invalidIdentity?: CanonicalArtifactIdentity;
  freshnessState?: "fresh" | "stale";
  reason?: string;
  evidencePaths: string[];
} {
  if (identityMatches.length > 1) {
    return {
      invalidIdentity: identityFor(identityMatches[0]),
      reason: "Architect Interview output resolves to duplicate active Markdown documents with the current canonical identity.",
      evidencePaths: identityMatches.flatMap(evidence),
    };
  }

  if (identityMatches.length === 0 && targetMatches.length === 0) {
    return { evidencePaths: [] };
  }

  const candidates = uniqueDocuments([...identityMatches, ...targetMatches]);
  const evidencePaths = candidates.flatMap(evidence);
  if (candidates.length > 1 && identityMatches.length > 0) {
    return {
      invalidIdentity: identityFor(candidates[0]),
      reason: "Architect Interview output resolves to multiple active Markdown documents for the current canonical identity or target.",
      evidencePaths,
    };
  }
  const document = identityMatches[0] ?? targetMatches[0];
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
  if (!sameIdentity(document.metadata.canonical?.identity ?? {}, expectedIdentity)) {
    return { invalidIdentity, reason: "Architect Interview output identity does not match the current Project Intake and Prompt evidence.", evidencePaths };
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

function uniqueDocuments(documents: PlanningDocumentSummary[]): PlanningDocumentSummary[] {
  const seen = new Set<string>();
  return documents.filter((document) => {
    if (seen.has(document.markdownPath)) return false;
    seen.add(document.markdownPath);
    return true;
  });
}

function identityFor(document: PlanningDocumentSummary): CanonicalArtifactIdentity {
  return {
    logicalDocumentId: document.logicalDocumentId,
    markdownPath: document.markdownPath,
    artifactRevision: document.metadata.artifactRevision ?? 0,
    disposition: document.effectiveDisposition,
    canonicalIdentity: document.metadata.canonical?.identity ?? {},
    documentReadState: document.documentReadState ?? "readable",
    participationRole: document.metadata.participationRole,
    artifactType: document.metadata.artifactType,
    readError: document.readError,
  };
}

function expectedProjectIdentity(
  intake: CanonicalArtifactIdentity,
  prompt: CanonicalArtifactIdentity,
): Record<string, unknown> {
  const artifactKey = intake.canonicalIdentity["Project.ArtifactKey"] ?? prompt.canonicalIdentity["Project.ArtifactKey"];
  const projectSlug = prompt.canonicalIdentity.projectSlug ?? intake.canonicalIdentity.projectSlug ?? artifactKey;
  if (typeof projectSlug !== "string" || !projectSlug.trim()) {
    throw new Error("Current Project Intake and Prompt evidence does not provide projectSlug.");
  }
  const identity: Record<string, unknown> = { projectSlug: projectSlug.trim() };
  if (typeof artifactKey === "string" && artifactKey.trim()) {
    identity["Project.ArtifactKey"] = artifactKey.trim();
  }
  return identity;
}

function sameIdentity(left: Record<string, unknown>, right: Record<string, unknown>): boolean {
  return JSON.stringify(sortRecord(left)) === JSON.stringify(sortRecord(right));
}

function sortRecord(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)));
}

function defaultInterviewTarget(promptDocument: PlanningDocumentSummary): string {
  const slug = promptDocument.markdownPath.match(/PROJECT_ARCHITECT_INTERVIEW_PROMPT_(.+)\.md$/)?.[1] ?? "project";
  return `planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_${slug}.md`;
}

function projectSlugForIntake(document: PlanningDocumentSummary): string {
  const identity = document.metadata.canonical?.identity ?? {};
  const workflowData = document.metadata.canonical?.workflowData ?? {};
  const fromIdentity = stringValue(identity["Project.ArtifactKey"]) ?? stringValue(identity.projectSlug);
  if (fromIdentity) {
    return fromIdentity;
  }
  const fromWorkflow = stringValue(workflowData.projectSlug);
  if (fromWorkflow) {
    return fromWorkflow;
  }
  if (isCanonicalProjectIntakePath(document.markdownPath)) {
    const filename = document.markdownPath.split("/").at(-1) ?? "";
    const slug = filename.replace(/\.md$/i, "").replace(/^PROJECT_INTAKE_?/i, "").trim();
    if (slug) {
      return slug;
    }
  }
  throw new Error("Current Project Intake evidence does not provide projectSlug.");
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
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
