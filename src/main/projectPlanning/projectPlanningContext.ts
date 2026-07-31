import type { DocumentDispositionStatus } from "../../shared/documents/documentDisposition";
import type { PlanningDocumentSummary, SourceRevision } from "../../shared/documents/planningDocument";
import { evaluateFreshnessFromSummaries } from "../../shared/documents/sourceFreshness";
import { analyzeProjectIntakeCorpus } from "../../shared/projectIntake/projectIntakeCorpus";
import { listPlanningDocuments } from "../documents/planningDocumentService";
import {
  preflightProjectPlanningRepository,
  type ProjectPlanningReconciliationMode,
} from "./projectPlanningPreflight";

export interface ProjectPlanningArtifactIdentity {
  logicalDocumentId: string;
  markdownPath: string;
  artifactRevision: number;
  disposition: DocumentDispositionStatus;
  documentReadState: NonNullable<PlanningDocumentSummary["documentReadState"]>;
  freshnessState?: "fresh" | "stale";
  participationRole?: string;
  artifactType?: string;
  readError?: string;
  operatorReviewNotes?: string;
}

export interface ProjectPlanningReadyContext {
  status: "ready";
  projectSlug: string;
  projectIntake: ProjectPlanningArtifactIdentity;
  prompt: ProjectPlanningArtifactIdentity;
  interview: ProjectPlanningArtifactIdentity;
  sourceRevisions: SourceRevision[];
  reconciliationMode: ProjectPlanningReconciliationMode;
  repositoryReviewRequired: boolean;
  repositoryReviewContext: string;
  legacyPlanningPaths: string[];
  sourceEvidencePaths: string[];
  handoffMarkdownPath: string;
  profileMarkdownPath: string;
  roadmapMarkdownPath: string;
  handoff?: ProjectPlanningArtifactIdentity;
  previousHandoff?: ProjectPlanningArtifactIdentity;
  invalidHandoff?: ProjectPlanningArtifactIdentity;
  invalidHandoffReason?: string;
  profile?: ProjectPlanningArtifactIdentity;
  invalidProfile?: ProjectPlanningArtifactIdentity;
  invalidProfileReason?: string;
  roadmap?: ProjectPlanningArtifactIdentity;
  invalidRoadmap?: ProjectPlanningArtifactIdentity;
  invalidRoadmapReason?: string;
  evidencePaths: string[];
}

export type ProjectPlanningContext =
  | ProjectPlanningReadyContext
  | {
      status: "not-ready" | "conflict" | "local-error";
      reason: string;
      evidencePaths: string[];
    };

export function resolveProjectPlanningContext(workspaceRoot: string): ProjectPlanningContext {
  try {
    const documents = listPlanningDocuments(workspaceRoot);
    const intakeCorpus = analyzeProjectIntakeCorpus(documents);
    if (intakeCorpus.state === "open") {
      return notReady("Approved current Project Intake is required before Project Planning.", []);
    }
    if (intakeCorpus.state === "conflict") {
      return conflict("Multiple active canonical Project Intake documents are available.", intakeCorpus.evidencePaths);
    }

    const intake = intakeCorpus.documents[0];
    if (intake.effectiveDisposition !== "Approved") {
      return notReady("Project Intake must be Approved before Project Planning.", evidence(intake));
    }
    if (!isReadable(intake)) {
      return localError("Project Intake is not readable as canonical Markdown.", evidence(intake));
    }

    const promptCandidates = activeDocuments(documents).filter((document) =>
      document.metadata.artifactType === "project-architect-interview-prompt" &&
      document.metadata.participationRole === "nonReviewHandoff" &&
      document.effectiveDisposition === "Approved" &&
      hasExactSourceRevision(document, intake),
    );
    if (promptCandidates.length === 0) {
      return notReady("Approved associated Architect Interview Prompt is required before Project Planning.", evidence(intake));
    }
    if (promptCandidates.length > 1) {
      return conflict("Multiple Approved associated Architect Interview Prompts are available.", promptCandidates.flatMap(evidence));
    }

    const prompt = promptCandidates[0];
    if (!isReadable(prompt)) {
      return localError("Associated Architect Interview Prompt is not readable.", evidence(prompt));
    }
    const interviewTarget = prompt.metadata.architectOutputTargets?.markdown ?? defaultInterviewTarget(prompt);
    const interviewCandidates = activeDocuments(documents).filter((document) => document.markdownPath === interviewTarget);
    if (interviewCandidates.length === 0) {
      return notReady("Approved current Architect Interview output is required before Project Planning.", evidence(prompt));
    }
    if (interviewCandidates.length > 1) {
      return conflict("Multiple Architect Interview documents exist at the current target.", interviewCandidates.flatMap(evidence));
    }

    const interview = interviewCandidates[0];
    const invalidInterview = validateApprovedInterview(documents, interview, intake, prompt);
    if (invalidInterview) {
      return localError(invalidInterview, evidence(interview));
    }

    const projectSlug = projectSlugFromIdentity(intake, prompt, interview);
    const handoffMarkdownPath = `planning/project/Project_Planning_Documents/PROJECT_PLANNING_DOCUMENTS_${projectSlug}.md`;
    const defaultProfileMarkdownPath = "planning/project/PROJECT_PROFILE.md";
    const defaultRoadmapMarkdownPath = `planning/project/Project_Roadmap/PROJECT_ROADMAP_${projectSlug}.md`;
    const handoffCandidates = activeDocuments(documents).filter((document) => document.markdownPath === handoffMarkdownPath);
    const handoffValidation = validateHandoff(documents, handoffCandidates, intake, prompt, interview);
    const handoffWorkflow = (
      handoffValidation.handoff ?? handoffValidation.previousHandoff
    )?.metadata.canonical?.workflowData ?? {};
    const profileMarkdownPath = markdownTarget(handoffWorkflow.projectProfileTarget) ?? defaultProfileMarkdownPath;
    const roadmapMarkdownPath = markdownTarget(handoffWorkflow.projectRoadmapTarget) ?? defaultRoadmapMarkdownPath;
    const profileValidation = validateOutput(documents, profileMarkdownPath, "project-profile", [intake, prompt, interview, handoffValidation.handoff].filter(isSummary));
    const roadmapValidation = validateOutput(documents, roadmapMarkdownPath, "project-roadmap", [intake, prompt, interview, handoffValidation.handoff].filter(isSummary));
    const preflight = preflightProjectPlanningRepository({
      workspaceRoot,
      documents,
      projectSlug,
      intake,
      prompt,
      interview,
      handoff: handoffValidation.handoff,
      profile: profileValidation.output,
      roadmap: roadmapValidation.output,
      profileMarkdownPath,
      roadmapMarkdownPath,
    });
    if (preflight.reconciliationMode === "needs-attention") {
      return localError(
        preflight.needsAttentionReason ?? "Project Planning repository preflight requires attention.",
        [
          ...evidence(intake),
          ...evidence(prompt),
          ...evidence(interview),
          ...preflight.evidencePaths,
        ],
      );
    }

    return {
      status: "ready",
      projectSlug,
      projectIntake: identityFor(intake),
      prompt: identityFor(prompt),
      interview: identityFor(interview),
      sourceRevisions: [
        revisionFor(intake),
        revisionFor(prompt),
        revisionFor(interview),
      ],
      reconciliationMode: preflight.reconciliationMode,
      repositoryReviewRequired: preflight.repositoryReviewRequired,
      repositoryReviewContext: preflight.repositoryReviewContext,
      legacyPlanningPaths: preflight.legacyPlanningPaths,
      sourceEvidencePaths: preflight.sourceEvidencePaths,
      handoffMarkdownPath,
      profileMarkdownPath,
      roadmapMarkdownPath,
      handoff: handoffValidation.handoff ? identityFor(handoffValidation.handoff) : undefined,
      previousHandoff: handoffValidation.previousHandoff ? identityFor(handoffValidation.previousHandoff) : undefined,
      invalidHandoff: handoffValidation.invalidHandoff ? identityFor(handoffValidation.invalidHandoff) : undefined,
      invalidHandoffReason: handoffValidation.reason,
      profile: profileValidation.output ? identityFor(profileValidation.output) : undefined,
      invalidProfile: profileValidation.invalidOutput ? identityFor(profileValidation.invalidOutput) : undefined,
      invalidProfileReason: profileValidation.reason,
      roadmap: roadmapValidation.output ? identityFor(roadmapValidation.output) : undefined,
      invalidRoadmap: roadmapValidation.invalidOutput ? identityFor(roadmapValidation.invalidOutput) : undefined,
      invalidRoadmapReason: roadmapValidation.reason,
      evidencePaths: [
        ...evidence(intake),
        ...evidence(prompt),
        ...evidence(interview),
        ...handoffCandidates.flatMap(evidence),
        ...profileValidation.evidencePaths,
        ...roadmapValidation.evidencePaths,
        ...preflight.evidencePaths,
      ],
    };
  } catch (error) {
    return localError(error instanceof Error ? error.message : String(error), []);
  }
}

function validateApprovedInterview(
  documents: PlanningDocumentSummary[],
  interview: PlanningDocumentSummary,
  intake: PlanningDocumentSummary,
  prompt: PlanningDocumentSummary,
): string | null {
  if (interview.metadata.artifactType !== "project-architect-interview") return "Current Architect Interview has the wrong artifact type.";
  if (interview.metadata.participationRole !== "gatingReview") return "Current Architect Interview has the wrong participation role.";
  if (interview.effectiveDisposition !== "Approved") return "Current Architect Interview must be Approved.";
  if (!isReadable(interview)) return interview.readError ?? "Current Architect Interview is not readable.";
  if (!hasExactSourceRevision(interview, intake)) return "Current Architect Interview does not reference the current Project Intake revision.";
  if (!hasExactSourceRevision(interview, prompt)) return "Current Architect Interview does not reference the current Prompt revision.";
  if (evaluateFreshnessFromSummaries(interview, documents).state !== "fresh") return "Current Architect Interview is stale.";
  return null;
}

function validateHandoff(
  documents: PlanningDocumentSummary[],
  candidates: PlanningDocumentSummary[],
  intake: PlanningDocumentSummary,
  prompt: PlanningDocumentSummary,
  interview: PlanningDocumentSummary,
): {
  handoff?: PlanningDocumentSummary;
  previousHandoff?: PlanningDocumentSummary;
  invalidHandoff?: PlanningDocumentSummary;
  reason?: string;
} {
  if (candidates.length === 0) return {};
  if (candidates.length > 1) return { invalidHandoff: candidates[0], reason: "Multiple Project Planning handoffs exist at the exact target." };
  const handoff = candidates[0];
  if (handoff.metadata.artifactType !== "generated-handoff") return { invalidHandoff: handoff, reason: "Project Planning handoff has the wrong artifact type." };
  if (handoff.metadata.participationRole !== "nonReviewHandoff") return { invalidHandoff: handoff, reason: "Project Planning handoff must be a non-review handoff." };
  if (handoff.metadata.canonical?.workflowData.handoffKind !== "project-planning") return { invalidHandoff: handoff, reason: "Project Planning handoff kind is missing or invalid." };
  if (handoff.effectiveDisposition !== "Approved") return { invalidHandoff: handoff, reason: "Project Planning handoff must be Approved after generation." };
  if (!isReadable(handoff)) return { invalidHandoff: handoff, reason: handoff.readError ?? "Project Planning handoff is not readable." };
  for (const source of [intake, prompt, interview]) {
    if (!hasExactSourceRevision(handoff, source)) return { previousHandoff: handoff };
  }
  if (evaluateFreshnessFromSummaries(handoff, documents).state !== "fresh") return { previousHandoff: handoff };
  return { handoff };
}

function validateOutput(
  documents: PlanningDocumentSummary[],
  targetPath: string,
  artifactType: "project-profile" | "project-roadmap",
  sources: PlanningDocumentSummary[],
): {
  output?: PlanningDocumentSummary;
  invalidOutput?: PlanningDocumentSummary;
  reason?: string;
  evidencePaths: string[];
} {
  const candidates = activeDocuments(documents).filter((document) => document.markdownPath === targetPath);
  if (candidates.length === 0) return { evidencePaths: [] };
  if (candidates.length > 1) {
    return { invalidOutput: candidates[0], reason: `Multiple ${artifactType} documents exist at the exact target.`, evidencePaths: candidates.flatMap(evidence) };
  }
  const output = candidates[0];
  const evidencePaths = evidence(output);
  if (output.metadata.artifactType !== artifactType) return { invalidOutput: output, reason: `${targetPath} has the wrong artifact type.`, evidencePaths };
  if (output.metadata.participationRole !== "compoundGatingReview") return { invalidOutput: output, reason: `${targetPath} must use participationRole=compoundGatingReview.`, evidencePaths };
  if (!isReadable(output)) return { invalidOutput: output, reason: output.readError ?? `${targetPath} is not readable.`, evidencePaths };
  const outputProjectSlug = output.metadata.canonical?.identity.projectSlug ?? output.metadata.canonical?.identity["Project.ArtifactKey"];
  const expectedProjectSlug = sources
    .map((source) => source.metadata.canonical?.identity.projectSlug ?? source.metadata.canonical?.identity["Project.ArtifactKey"])
    .find((value): value is string => typeof value === "string" && value.trim().length > 0);
  if (typeof expectedProjectSlug === "string" && outputProjectSlug !== expectedProjectSlug) {
    return { invalidOutput: output, reason: `${targetPath} has identity-conflicting content.`, evidencePaths };
  }
  for (const source of sources) {
    if (!hasExactSourceRevision(output, source)) {
      return { invalidOutput: output, reason: `${targetPath} does not reference current source revision: ${source.markdownPath}.`, evidencePaths };
    }
  }
  if (evaluateFreshnessFromSummaries(output, documents).state !== "fresh") {
    return { invalidOutput: output, reason: `${targetPath} is stale.`, evidencePaths };
  }
  return { output, evidencePaths };
}

function identityFor(document: PlanningDocumentSummary): ProjectPlanningArtifactIdentity {
  return {
    logicalDocumentId: document.logicalDocumentId,
    markdownPath: document.markdownPath,
    artifactRevision: document.metadata.artifactRevision ?? 0,
    disposition: document.effectiveDisposition,
    documentReadState: document.documentReadState ?? "readable",
    freshnessState: document.readError ? undefined : "fresh",
    participationRole: document.metadata.participationRole,
    artifactType: document.metadata.artifactType,
    readError: document.readError,
    operatorReviewNotes: document.metadata.canonical?.documentDisposition.notes ?? "",
  };
}

function projectSlugFromIdentity(...documents: PlanningDocumentSummary[]): string {
  for (const document of documents) {
    const identity = document.metadata.canonical?.identity ?? {};
    const value = identity.projectSlug ?? identity["Project.ArtifactKey"];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return documents[0]?.displayFilename.replace(/^PROJECT_INTAKE_/, "") || "project";
}

function activeDocuments(documents: PlanningDocumentSummary[]): PlanningDocumentSummary[] {
  return documents.filter((document) =>
    document.metadata.participationRole !== "historical" &&
    !document.markdownPath.replace(/\\/g, "/").toLowerCase().startsWith("planning/archive/"),
  );
}

function isReadable(document: PlanningDocumentSummary): boolean {
  return document.documentReadState === "readable" && !document.readError && Boolean(document.metadata.canonical);
}

function hasExactSourceRevision(document: PlanningDocumentSummary, source: PlanningDocumentSummary): boolean {
  return (document.metadata.sourceRevisions ?? []).some(
    (entry) => entry.path === source.markdownPath && entry.revision === (source.metadata.artifactRevision ?? 1),
  );
}

function revisionFor(document: PlanningDocumentSummary): SourceRevision {
  return { path: document.markdownPath, revision: document.metadata.artifactRevision ?? 1 };
}

function markdownTarget(value: unknown): string | undefined {
  return typeof value === "string" && value.endsWith(".md") && !value.includes("..") ? value : undefined;
}

function defaultInterviewTarget(prompt: PlanningDocumentSummary): string {
  const slug = prompt.markdownPath.match(/PROJECT_ARCHITECT_INTERVIEW_PROMPT_(.+)\.md$/)?.[1] ?? "project";
  return `planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_${slug}.md`;
}

function isSummary(value: PlanningDocumentSummary | undefined): value is PlanningDocumentSummary {
  return Boolean(value);
}

function evidence(document: PlanningDocumentSummary): string[] {
  return [document.markdownPath];
}

function notReady(reason: string, evidencePaths: string[]): ProjectPlanningContext {
  return { status: "not-ready", reason, evidencePaths };
}

function conflict(reason: string, evidencePaths: string[]): ProjectPlanningContext {
  return { status: "conflict", reason, evidencePaths };
}

function localError(reason: string, evidencePaths: string[]): ProjectPlanningContext {
  return { status: "local-error", reason, evidencePaths };
}
