import fs from "node:fs";
import path from "node:path";
import {
  projectTypeOptions,
  type ProjectIntakeSubmission,
  type ProjectIntakeSubmissionResult,
} from "../../shared/workspaceContracts";
import {
  listPlanningDocuments,
  savePlanningDocumentRevision,
  setDocumentDisposition,
} from "../documents/planningDocumentService";
import { writeArtifactTransaction } from "../documents/artifactTransaction";

const requiredPlanningDirectories = [
  "planning",
  "planning/project",
  "planning/project/Project_Intake",
  "planning/project/Project_Architect_Interview_Prompts",
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
  initializeMinimalPlanning(projectRoot);

  return writeProjectIntake(projectRoot, repositoryBoundSubmission);
}

function writeProjectIntake(
  projectRoot: string,
  submission: ProjectIntakeSubmission,
): ProjectIntakeSubmissionResult {
  validateSubmission(submission);

  const projectSlug = slugify(submission.projectName);
  const projectIntakeMarkdownPath = `planning/project/Project_Intake/PROJECT_INTAKE_${projectSlug}.md`;
  const projectIntakeJsonPath = `planning/project/Project_Intake/PROJECT_INTAKE_${projectSlug}.json`;
  const architectPromptMarkdownPath = `planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_${projectSlug}.md`;
  const architectPromptJsonPath = `planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_${projectSlug}.json`;
  const architectInterviewTargetMarkdownPath = `planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_${projectSlug}.md`;
  const architectInterviewTargetJsonPath = `planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_${projectSlug}.json`;
  const previousIntake = findByPath(projectRoot, projectIntakeJsonPath);
  const previousPromptRevision = readArtifactRevision(projectRoot, architectPromptJsonPath);
  const revisionResult = previousIntake
    ? savePlanningDocumentRevision(projectRoot, previousIntake.logicalDocumentId)
    : null;
  const artifactRevision = revisionResult?.revisedDocument.metadata.artifactRevision ?? 1;
  const promptRevision = previousPromptRevision + 1;

  const intakeMarkdown = renderProjectIntakeMarkdown(submission, artifactRevision);
  const intakeJson = renderProjectIntakeJson(submission, artifactRevision);
  const promptMarkdown = renderPromptMarkdown(
    submission,
    projectSlug,
    promptRevision,
    projectIntakeJsonPath,
    artifactRevision,
    architectInterviewTargetMarkdownPath,
    architectInterviewTargetJsonPath,
  );
  const promptJson = renderPromptJson(
    submission,
    projectSlug,
    promptRevision,
    projectIntakeJsonPath,
    artifactRevision,
    architectInterviewTargetMarkdownPath,
    architectInterviewTargetJsonPath,
  );

  writeNewOrReplaceFiles(
    projectRoot,
    [
      [projectIntakeMarkdownPath, intakeMarkdown],
      [projectIntakeJsonPath, intakeJson],
      [architectPromptMarkdownPath, promptMarkdown],
      [architectPromptJsonPath, promptJson],
    ],
  );

  const invalidatedPaths = [
    ...(revisionResult?.invalidatedDocuments.flatMap((document) =>
      [document.markdownPath, document.jsonPath].filter((value): value is string => Boolean(value)),
    ) ?? []),
    ...(previousIntake ? invalidateExistingInterview(projectRoot, architectInterviewTargetJsonPath) : []),
  ];

  return {
    ok: true,
    projectSlug,
    projectRoot,
    projectIntakeMarkdownPath,
    projectIntakeJsonPath,
    architectPromptMarkdownPath,
    architectPromptJsonPath,
    architectInterviewTargetMarkdownPath,
    architectInterviewTargetJsonPath,
    artifactRevision,
    promptRevision,
    invalidatedPaths,
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

function renderProjectIntakeMarkdown(
  submission: ProjectIntakeSubmission,
  artifactRevision: number,
): string {
  return [
    `# Project Intake - ${submission.projectName}`,
    `Artifact.Revision=${artifactRevision}`,
    "participationRole=gatingReview",
    "",
    "## Captured Answers",
    `Project Name: ${submission.projectName}`,
    `Project Purpose: ${submission.projectPurpose}`,
    `Desired Outcome: ${submission.desiredOutcome}`,
    `Project Type: ${submission.projectType}`,
    "Project Repository: <PROJECT_REPO>",
    `Existing source code or project-planning documents: ${submission.hasExistingSourceOrPlanning ? "Yes" : "No"}`,
    `Known Constraints or Non-Negotiables: ${submission.knownConstraints?.trim() || "None provided"}`,
    submission.hasExistingSourceOrPlanning
      ? `Repository Review Context: ${submission.repositoryReviewContext?.trim()}`
      : "Repository Review Context: Not applicable",
    "",
    "## Document Disposition",
    "",
    "Document.Status=Approved",
    "",
  ].join("\n");
}

function renderProjectIntakeJson(
  submission: ProjectIntakeSubmission,
  artifactRevision: number,
): string {
  return `${JSON.stringify(
    {
      artifactType: "project-intake",
      artifactRevision,
      participationRole: "gatingReview",
      projectName: submission.projectName,
      projectPurpose: submission.projectPurpose,
      desiredOutcome: submission.desiredOutcome,
      projectType: submission.projectType,
      projectRepository: "<PROJECT_REPO>",
      hasExistingSourceOrPlanning: submission.hasExistingSourceOrPlanning,
      knownConstraints: submission.knownConstraints?.trim() || "",
      repositoryReviewContext: submission.repositoryReviewContext?.trim() || "",
      documentDisposition: { status: "Approved" },
    },
    null,
    2,
  )}\n`;
}

function renderPromptMarkdown(
  submission: ProjectIntakeSubmission,
  projectSlug: string,
  artifactRevision: number,
  sourcePath: string,
  sourceRevision: number,
  targetMarkdownPath: string,
  targetJsonPath: string,
): string {
  return [
    `# Project Architect Interview Prompt - ${submission.projectName}`,
    `Artifact.Revision=${artifactRevision}`,
    "participationRole=nonReviewHandoff",
    "",
    "## Source Revisions",
    `- path: ${sourcePath} revision: ${sourceRevision}`,
    "",
    "## Architect Output Target",
    targetMarkdownPath,
    targetJsonPath,
    "",
    "## Instructions",
    `Conduct the Project Architect Interview for ${submission.projectName}.`,
    "Use the approved Project Intake answers as source context.",
    submission.hasExistingSourceOrPlanning
      ? "Inspect the selected repository through ChampCity MCP before finalizing the interview document. Distinguish verified repository facts from Operator statements and recommendations. Cite repository-relative paths where practical and ensure later planning begins from verified current state."
      : "Treat this as a greenfield project unless repository evidence shows otherwise.",
    `Expected project slug: ${projectSlug}`,
    "",
    "## Document Disposition",
    "",
    "Document.Status=Approved",
    "",
  ].join("\n");
}

function renderPromptJson(
  submission: ProjectIntakeSubmission,
  projectSlug: string,
  artifactRevision: number,
  sourcePath: string,
  sourceRevision: number,
  targetMarkdownPath: string,
  targetJsonPath: string,
): string {
  return `${JSON.stringify(
    {
      artifactType: "project-architect-interview-prompt",
      artifactRevision,
      participationRole: "nonReviewHandoff",
      projectSlug,
      sourceRevisions: [{ path: sourcePath, revision: sourceRevision }],
      architectOutputTargets: {
        markdown: targetMarkdownPath,
        json: targetJsonPath,
      },
      requiresRepositoryReview: submission.hasExistingSourceOrPlanning,
      promptInstructions: submission.hasExistingSourceOrPlanning
        ? "Inspect the selected repository through ChampCity MCP, distinguish verified facts from Operator statements and recommendations, cite repository-relative paths where practical, and ensure later planning begins from verified current state."
        : "Conduct a greenfield Project Architect Interview from the approved Project Intake.",
      documentDisposition: { status: "Approved" },
    },
    null,
    2,
  )}\n`;
}

function writeNewOrReplaceFiles(
  projectRoot: string,
  entries: Array<[relativePath: string, content: string]>,
): void {
  writeArtifactTransaction(
    projectRoot,
    entries.map(([relativePath, content]) => ({ relativePath, content })),
  );
}

function invalidateExistingInterview(projectRoot: string, targetJsonPath: string): string[] {
  const existing = findByPath(projectRoot, targetJsonPath);
  if (!existing || existing.effectiveDisposition !== "Approved") {
    return [];
  }

  setDocumentDisposition(projectRoot, existing.logicalDocumentId, "Pending");
  return [targetJsonPath];
}

function findByPath(projectRoot: string, relativePath: string) {
  return listPlanningDocuments(projectRoot).find(
    (document) => document.markdownPath === relativePath || document.jsonPath === relativePath,
  );
}

function readArtifactRevision(projectRoot: string, relativePath: string): number {
  const absolutePath = path.join(projectRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return 0;
  }
  const parsed = JSON.parse(fs.readFileSync(absolutePath, "utf8")) as {
    artifactRevision?: unknown;
  };
  return typeof parsed.artifactRevision === "number" ? parsed.artifactRevision : 0;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "project";
}

function isInside(root: string, target: string): boolean {
  const relativePath = path.relative(root, target);
  return (
    relativePath.length === 0 ||
    (!relativePath.startsWith("..") && !path.isAbsolute(relativePath))
  );
}
