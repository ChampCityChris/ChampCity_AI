import fs from "node:fs";
import path from "node:path";
import {
  type CanonicalDocumentMetadata,
  parseCanonicalMarkdownDocument,
} from "../../shared/documents/canonicalMarkdown";
import {
  projectTypeOptions,
  type ProjectIntakeSubmission,
  type ProjectIntakeSubmissionResult,
} from "../../shared/workspaceContracts";
import type { PlanningDocumentSummary } from "../../shared/documents/planningDocument";
import {
  analyzeProjectIntakeCorpus,
  isCanonicalProjectIntakePath,
} from "../../shared/projectIntake/projectIntakeCorpus";
import {
  listPlanningDocuments,
  savePlanningDocumentRevision,
  setDocumentDisposition,
} from "../documents/planningDocumentService";
import { writeCanonicalMarkdownDocument } from "../documents/canonicalMarkdownDocumentWriter";

const requiredPlanningDirectories = [
  "planning",
  "planning/project",
  "planning/project/Project_Intake",
  "planning/project/Project_Architect_Interview_Prompts",
  "planning/project/Project_Architect_Interviews",
] as const;

export function submitProjectIntake(
  submission: ProjectIntakeSubmission,
): ProjectIntakeSubmissionResult {
  return submitProjectIntakeForRepository(submission.projectRepository, submission);
}

export function submitProjectIntakeForRepository(
  projectRepositoryRoot: string,
  submission: ProjectIntakeSubmission,
): ProjectIntakeSubmissionResult {
  const projectRoot = path.resolve(projectRepositoryRoot);
  const repositoryBoundSubmission = {
    ...submission,
    projectRepository: projectRoot,
  };

  validateSubmission(repositoryBoundSubmission);
  assertWritableDirectory(projectRoot);

  return writeProjectIntake(projectRoot, repositoryBoundSubmission);
}

function writeProjectIntake(
  projectRoot: string,
  submission: ProjectIntakeSubmission,
): ProjectIntakeSubmissionResult {
  validateSubmission(submission);

  const documents = listPlanningDocuments(projectRoot);
  const corpus = analyzeProjectIntakeCorpus(documents);
  if (corpus.state === "conflict") {
    throw new Error(
      `Project Intake conflict: multiple canonical Project Intake documents exist: ${corpus.evidencePaths.join("; ")}. Resolve the duplicate Intake family before submitting Project Intake.`,
    );
  }
  initializeMinimalPlanning(projectRoot);

  const previousIntake = corpus.state === "single" ? corpus.documents[0] : undefined;
  const projectSlug = previousIntake
    ? stableProjectArtifactKey(projectRoot, previousIntake)
    : slugify(submission.projectName);
  const previousPrompt = previousIntake
    ? findAssociatedPrompt(documents, projectRoot, previousIntake, projectSlug)
    : undefined;
  const previousArchitectPromptMarkdownPath =
    previousPrompt?.markdownPath ?? `planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_${projectSlug}.md`;
  const previousPromptTargets =
    previousPrompt?.metadata.architectOutputTargets ??
    readPromptOutputTargets(projectRoot, previousArchitectPromptMarkdownPath);
  const architectInterviewTargetMarkdownPath =
    previousPromptTargets?.markdown ?? `planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_${projectSlug}.md`;
  const revisionResult = previousIntake
    ? savePlanningDocumentRevision(projectRoot, previousIntake.logicalDocumentId)
    : null;
  const artifactRevision = revisionResult?.revisedDocument.metadata.artifactRevision ?? 1;
  const intakeContent = intakeSubstantiveContent(submission);
  const projectIntakeMarkdownPath = `planning/project/Project_Intake/PROJECT_INTAKE_${projectSlug}.md`;
  writeCanonicalMarkdownDocument({
    workspaceRoot: projectRoot,
    relativePath: projectIntakeMarkdownPath,
    metadata: {
      schemaVersion: 1,
      artifactType: "project-intake",
      artifactRevision,
      participationRole: "gatingReview",
      identity: { "Project.ArtifactKey": projectSlug },
      sourceRevisions: [],
      workflowData: intakeContent,
      documentDisposition: { status: "Pending", notes: "", reviewedAt: null },
    },
    bodyMarkdown: projectIntakeBody(submission),
  });

  const architectPromptMarkdownPath = `planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_${projectSlug}.md`;
  const promptRevision = previousPrompt?.metadata.artifactRevision ?? 1;
  const promptMetadata: CanonicalDocumentMetadata = {
    schemaVersion: 1,
    artifactType: "project-architect-interview-prompt",
    artifactRevision: promptRevision,
    participationRole: "nonReviewHandoff",
    identity: { projectSlug, "Project.ArtifactKey": projectSlug },
    sourceRevisions: [{ path: projectIntakeMarkdownPath, revision: artifactRevision }],
    workflowData: {
      ...intakeContent,
      projectSlug,
      architectOutputTargets: { markdown: architectInterviewTargetMarkdownPath },
    },
    documentDisposition: { status: "Approved", notes: "", reviewedAt: null },
  };
  writeCanonicalMarkdownDocument({
    workspaceRoot: projectRoot,
    relativePath: architectPromptMarkdownPath,
    metadata: promptMetadata,
    bodyMarkdown: architectPromptBody(submission, projectIntakeMarkdownPath),
  });
  const promptTargets = promptMetadata.workflowData.architectOutputTargets as { markdown?: string } | undefined;
  const resolvedInterviewTargetMarkdownPath = promptTargets?.markdown ?? architectInterviewTargetMarkdownPath;

  const invalidatedPaths = [
    ...(revisionResult?.invalidatedDocuments.map((document) => document.markdownPath) ?? []),
    ...(previousIntake ? invalidateExistingInterview(projectRoot, resolvedInterviewTargetMarkdownPath) : []),
  ];

  return {
    ok: true,
    projectSlug,
    projectRoot,
    projectIntakeMarkdownPath,
    architectPromptMarkdownPath,
    architectInterviewTargetMarkdownPath: resolvedInterviewTargetMarkdownPath,
    artifactRevision,
    promptRevision,
    invalidatedPaths,
  };
}

function projectIntakeBody(submission: ProjectIntakeSubmission): string {
  return [
    `# Project Intake: ${submission.projectName}`,
    "",
    `Project Purpose: ${submission.projectPurpose}`,
    `Desired Outcome: ${submission.desiredOutcome}`,
    `Project Type: ${submission.projectType}`,
    `Existing Source Or Planning: ${submission.hasExistingSourceOrPlanning ? "Yes" : "No"}`,
    `Known Constraints: ${submission.knownConstraints ?? ""}`,
    `Repository Review Context: ${submission.repositoryReviewContext ?? ""}`,
  ].join("\n");
}

function architectPromptBody(
  submission: ProjectIntakeSubmission,
  intakeMarkdownPath: string,
): string {
  return [
    `# Project Architect Interview Prompt: ${submission.projectName}`,
    "",
    "Read these application-owned inputs:",
    `- Project Intake Markdown: ${intakeMarkdownPath}`,
    "",
    "Conduct the Project Architect Interview conversationally with the Operator.",
    "Continue until material scope, constraints, risks, decisions, unresolved questions, and planning direction are resolved.",
    "When the interview is substantively complete, synthesize one complete substantive Project Architect Interview Markdown document, not a snippet.",
    "Resolve the configured workspace ID through diagnostics_toolbox.list_workspaces when it is not already known.",
    "Save the complete Interview through ChampCity MCP by calling artifact_toolbox with this invocation shape:",
    "```json",
    "{",
    '  "action": "submit_handoff_outputs",',
    '  "workspaceId": "<resolved workspace ID>",',
    '  "params": {',
    '    "handoffKind": "architect-interview",',
    '    "outputs": {',
    '      "architectInterviewMarkdown": "<complete substantive Interview Markdown>"',
    "    }",
    "  }",
    "}",
    "```",
    "The handoff kind is a selector, not authority.",
    "The MCP server derives targets, metadata, identity, source revisions, participation role, revision, and Pending disposition from the current Approved handoff.",
    "Do not use retired save actions, a generic Markdown writer, local import fields, manual file copy, target paths, or caller-supplied metadata.",
    "Report completion only after the tool returns saved or already_saved.",
    "If the action is unavailable, denied, or fails, report the exact tool failure and remain incomplete.",
  ].join("\n");
}

function intakeSubstantiveContent(submission: ProjectIntakeSubmission): Record<string, unknown> {
  return {
    projectName: submission.projectName,
    projectPurpose: submission.projectPurpose,
    desiredOutcome: submission.desiredOutcome,
    projectType: submission.projectType,
    hasExistingSourceOrPlanning: submission.hasExistingSourceOrPlanning,
    knownConstraints: submission.knownConstraints ?? "",
    repositoryReviewContext: submission.repositoryReviewContext ?? "",
  };
}

function validateSubmission(submission: ProjectIntakeSubmission): void {
  const required = [
    submission.projectName,
    submission.projectPurpose,
    submission.desiredOutcome,
    submission.projectRepository,
  ];
  if (required.some((value) => value.trim().length === 0)) {
    throw new Error("Project Intake requires all fixed required fields.");
  }
  if (!projectTypeOptions.includes(submission.projectType)) {
    throw new Error("Project Type is not one of the approved values.");
  }
}

function assertWritableDirectory(projectRoot: string): void {
  const stats = fs.statSync(projectRoot);
  if (!stats.isDirectory()) {
    throw new Error("Project repository selection must be a directory.");
  }
  fs.accessSync(projectRoot, fs.constants.R_OK | fs.constants.W_OK);
}

function initializeMinimalPlanning(projectRoot: string): void {
  for (const relativePath of requiredPlanningDirectories) {
    fs.mkdirSync(path.join(projectRoot, relativePath), { recursive: true });
  }
}

function invalidateExistingInterview(projectRoot: string, targetMarkdownPath: string): string[] {
  const existing = findByPath(projectRoot, targetMarkdownPath);
  if (!existing || existing.effectiveDisposition !== "Approved") {
    return [];
  }

  setDocumentDisposition(projectRoot, existing.logicalDocumentId, "Pending");
  return [targetMarkdownPath];
}

function findByPath(projectRoot: string, relativePath: string) {
  return listPlanningDocuments(projectRoot).find(
    (document) => document.markdownPath === relativePath,
  );
}

function findAssociatedPrompt(
  documents: PlanningDocumentSummary[],
  projectRoot: string,
  intake: PlanningDocumentSummary,
  projectSlug: string,
): PlanningDocumentSummary | undefined {
  const intakePaths = new Set([intake.markdownPath]);
  const promptCandidates = documents.filter(isArchitectPrompt);
  return promptCandidates.find((document) =>
    (document.metadata.sourceRevisions ?? []).some((source) => intakePaths.has(source.path)),
  ) ?? promptCandidates.find((document) =>
    promptJsonReferencesIntake(projectRoot, document.markdownPath, intakePaths),
  ) ?? promptCandidates.find((document) =>
    document.markdownPath === `planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_${projectSlug}.md`,
  );
}

function isArchitectPrompt(document: PlanningDocumentSummary): boolean {
  return document.markdownPath.replace(/\\/g, "/").toLowerCase()
    .startsWith("planning/project/project_architect_interview_prompts/");
}

function stableProjectArtifactKey(
  projectRoot: string,
  intake: PlanningDocumentSummary,
): string {
  const fromMarkdown = readProjectArtifactKey(projectRoot, intake.markdownPath);
  if (fromMarkdown) {
    return fromMarkdown;
  }

  const pathKey = keyFromProjectIntakePath(intake.markdownPath);
  return pathKey || slugify(intake.displayFilename.replace(/^PROJECT_INTAKE_?/i, ""));
}

function keyFromProjectIntakePath(relativePath: string | undefined): string | undefined {
  if (!isCanonicalProjectIntakePath(relativePath)) {
    return undefined;
  }
  const filename = path.basename(relativePath ?? "", path.extname(relativePath ?? ""));
  return filename.replace(/^PROJECT_INTAKE_?/i, "").trim() || undefined;
}

function readProjectArtifactKey(
  projectRoot: string,
  relativePath: string | undefined,
): string | undefined {
  if (!relativePath) {
    return undefined;
  }
  const parsed = readJsonIfPresent(projectRoot, relativePath);
  const key = parsed?.projectArtifactKey ?? parsed?.projectSlug;
  return typeof key === "string" && key.trim() ? key.trim() : undefined;
}

function readPromptOutputTargets(
  projectRoot: string,
  relativePath: string | undefined,
): { markdown: string } | undefined {
  if (!relativePath) {
    return undefined;
  }
  const targets = readJsonIfPresent(projectRoot, relativePath)?.architectOutputTargets;
  if (!targets || typeof targets !== "object") {
    return undefined;
  }
  const markdown = (targets as { markdown?: unknown }).markdown;
  return typeof markdown === "string"
    ? { markdown }
    : undefined;
}

function promptJsonReferencesIntake(
  projectRoot: string,
  relativePath: string | undefined,
  intakePaths: Set<string>,
): boolean {
  if (!relativePath) {
    return false;
  }
  const parsed = readJsonIfPresent(projectRoot, relativePath);
  if (!parsed) {
    return false;
  }
  const canonical = parsed.canonicalProjectIntake;
  if (!canonical || typeof canonical !== "object") {
    return false;
  }

  const markdown = (canonical as { markdown?: unknown }).markdown;
  const json = (canonical as { json?: unknown }).json;
  return (typeof markdown === "string" && intakePaths.has(markdown)) ||
    (typeof json === "string" && intakePaths.has(json));
}

function readJsonIfPresent(
  projectRoot: string,
  relativePath: string,
): Record<string, unknown> | undefined {
  const absolutePath = path.join(projectRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return undefined;
  }
  try {
    if (relativePath.endsWith(".md")) {
      return parseCanonicalMarkdownDocument(fs.readFileSync(absolutePath, "utf8")).metadata.workflowData;
    }
    return JSON.parse(fs.readFileSync(absolutePath, "utf8")) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "project";
}
