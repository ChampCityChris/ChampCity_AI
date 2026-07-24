import fs from "node:fs";
import path from "node:path";
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
import { writeArtifactTransaction } from "../documents/artifactTransaction";

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
  const projectIntakeMarkdownPath =
    previousIntake?.markdownPath ?? `planning/project/Project_Intake/PROJECT_INTAKE_${projectSlug}.md`;
  const projectIntakeJsonPath =
    previousIntake?.jsonPath ?? `planning/project/Project_Intake/PROJECT_INTAKE_${projectSlug}.json`;
  const previousPrompt = previousIntake
    ? findAssociatedPrompt(documents, projectRoot, previousIntake, projectSlug)
    : undefined;
  const architectPromptMarkdownPath =
    previousPrompt?.markdownPath ?? `planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_${projectSlug}.md`;
  const architectPromptJsonPath =
    previousPrompt?.jsonPath ?? `planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_${projectSlug}.json`;
  const previousPromptTargets =
    previousPrompt?.metadata.architectOutputTargets ??
    readPromptOutputTargets(projectRoot, architectPromptJsonPath);
  const architectInterviewTargetMarkdownPath =
    previousPromptTargets?.markdown ?? `planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_${projectSlug}.md`;
  const architectInterviewTargetJsonPath =
    previousPromptTargets?.json ?? `planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_${projectSlug}.json`;
  const previousPromptRevision = readArtifactRevision(projectRoot, architectPromptJsonPath);
  const revisionResult = previousIntake
    ? savePlanningDocumentRevision(projectRoot, previousIntake.logicalDocumentId)
    : null;
  const artifactRevision = revisionResult?.revisedDocument.metadata.artifactRevision ?? 1;
  const promptRevision = previousPromptRevision + 1;

  const intakeMarkdown = renderProjectIntakeMarkdown(submission, artifactRevision, projectSlug);
  const intakeJson = renderProjectIntakeJson(submission, artifactRevision, projectSlug);
  const promptMarkdown = renderPromptMarkdown(
    submission,
    projectSlug,
    promptRevision,
    projectIntakeMarkdownPath,
    projectIntakeJsonPath,
    artifactRevision,
    architectInterviewTargetMarkdownPath,
    architectInterviewTargetJsonPath,
  );
  const promptJson = renderPromptJson(
    submission,
    projectSlug,
    promptRevision,
    projectIntakeMarkdownPath,
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
  projectSlug: string,
): string {
  return [
    `# Project Intake - ${submission.projectName}`,
    `Artifact.Revision=${artifactRevision}`,
    "participationRole=gatingReview",
    `Project.ArtifactKey=${projectSlug}`,
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
    "Document.Status=Pending",
    "",
  ].join("\n");
}

function renderProjectIntakeJson(
  submission: ProjectIntakeSubmission,
  artifactRevision: number,
  projectSlug: string,
): string {
  return `${JSON.stringify(
    {
      artifactType: "project-intake",
      artifactRevision,
      participationRole: "gatingReview",
      projectArtifactKey: projectSlug,
      projectName: submission.projectName,
      projectPurpose: submission.projectPurpose,
      desiredOutcome: submission.desiredOutcome,
      projectType: submission.projectType,
      projectRepository: "<PROJECT_REPO>",
      hasExistingSourceOrPlanning: submission.hasExistingSourceOrPlanning,
      knownConstraints: submission.knownConstraints?.trim() || "",
      repositoryReviewContext: submission.repositoryReviewContext?.trim() || "",
      documentDisposition: { status: "Pending" },
    },
    null,
    2,
  )}\n`;
}

function renderPromptMarkdown(
  submission: ProjectIntakeSubmission,
  projectSlug: string,
  artifactRevision: number,
  projectIntakeMarkdownPath: string,
  projectIntakeJsonPath: string,
  sourceRevision: number,
  targetMarkdownPath: string,
  targetJsonPath: string,
): string {
  const constraints = trimmedOrFallback(submission.knownConstraints, "None provided");
  const repositoryContext = submission.hasExistingSourceOrPlanning
    ? trimmedOrFallback(submission.repositoryReviewContext, "None provided")
    : "Not applicable";
  const repositoryMode = submission.hasExistingSourceOrPlanning
    ? [
        "This is an existing-source or existing-planning project.",
        "Before finalizing the interview document, inspect the selected repository through ChampCity MCP.",
        "Distinguish verified repository facts from Operator statements, assumptions, and Architect recommendations.",
        "Cite repository-relative paths where practical.",
        "Identify current implemented behavior, existing planning, known failures, abandoned attempts, protected areas, and material technical debt when relevant.",
        "Use the verified current state as the baseline for the later Project Profile and Project Roadmap.",
      ]
    : [
        "Treat this as a greenfield project unless repository evidence establishes otherwise.",
        "Do not invent existing implementation or planning facts.",
      ];

  return [
    `# Project Architect Interview Prompt - ${submission.projectName}`,
    `Artifact.Revision=${artifactRevision}`,
    "participationRole=nonReviewHandoff",
    "",
    "## Project Intake Context",
    `Project Name: ${submission.projectName}`,
    `Project Purpose: ${submission.projectPurpose}`,
    `Desired Outcome: ${submission.desiredOutcome}`,
    `Project Type: ${submission.projectType}`,
    "Project Repository: <PROJECT_REPO>",
    `Existing source code or project-planning documents: ${submission.hasExistingSourceOrPlanning ? "Yes" : "No"}`,
    `Known Constraints or Non-Negotiables: ${constraints}`,
    `Optional Repository Review Context: ${repositoryContext}`,
    `Expected project slug: ${projectSlug}`,
    "",
    "## Source Revisions",
    `- path: ${projectIntakeJsonPath} revision: ${sourceRevision}`,
    `Canonical Project Intake Markdown: ${projectIntakeMarkdownPath}`,
    `Canonical Project Intake JSON: ${projectIntakeJsonPath}`,
    `Generated Prompt Revision: ${artifactRevision}`,
    "",
    "## Required Architect Output Targets",
    `Markdown: ${targetMarkdownPath}`,
    `JSON: ${targetJsonPath}`,
    "",
    "## Architect Role and Objective",
    "Act as the project Architect for the selected project.",
    "Use the Approved Project Intake as starting context; do not repeat questions already answered unless clarification is needed.",
    "Conduct a conversational, adaptive interview focused on unresolved planning information.",
    "Identify material ambiguity, conflicting requirements, assumptions, dependencies, and risks.",
    "Ask follow-up questions until the project is sufficiently understood to support the later Project Profile and Project Roadmap.",
    "Summarize your understanding and resolve consequential misunderstandings with the Operator before finalizing the durable interview document.",
    "Write the exact synchronized Markdown and JSON siblings through ChampCity MCP.",
    "Conversation text is not the durable record. Completion requires the substantive synchronized Markdown/JSON pair in the repository.",
    "",
    "## Interview Method",
    "Do not use a rigid interrogation of irrelevant questions.",
    "Cover the relevant subjects below, consolidate overlapping subjects when helpful, and explicitly record when a subject is not applicable.",
    "Preserve a clear distinction among Operator statements, verified repository facts, assumptions, risks, and Architect recommendations.",
    "",
    "## Repository Review Behavior",
    ...repositoryMode,
    "The optional repository-review context is only a starting hint and must not substitute for repository inspection when existing source or planning is present.",
    "",
    "## Required Interview Coverage",
    "1. intended users, Operator, stakeholders, and affected parties;",
    "2. the problem being solved and the desired measurable or observable outcome;",
    "3. primary user workflows and functional capabilities;",
    "4. boundaries, explicit non-goals, and deferred capabilities;",
    "5. existing project state when applicable;",
    "6. platform, deployment, technology, environment, and compatibility constraints;",
    "7. data inputs, outputs, ownership, retention, and migration considerations;",
    "8. integrations, external systems, services, files, devices, or repositories;",
    "9. security, privacy, compliance, accessibility, safety, and operational requirements when applicable;",
    "10. user-experience expectations and important interaction patterns;",
    "11. reliability, performance, supportability, maintainability, and observability expectations when applicable;",
    "12. delivery priorities, dependencies, sequencing constraints, and known deadlines;",
    "13. acceptance, validation, and evidence expectations;",
    "14. risks, unknowns, assumptions, and decisions that later planning must address.",
    "",
    "## Required Markdown Output Structure",
    "```text",
    `# Project Architect Interview - ${submission.projectName}`,
    "Artifact.Revision=<n>",
    "participationRole=gatingReview",
    "",
    "## Source Revisions",
    "## Project Understanding",
    "## Intended Users and Stakeholders",
    "## Goals and Success Criteria",
    "## Functional Scope and Primary Workflows",
    "## Boundaries, Non-Goals, and Deferred Scope",
    "## Verified Existing State                 [when applicable]",
    "## Technical and Operational Constraints",
    "## Data and Integration Considerations",
    "## Security, Privacy, Compliance, and Accessibility",
    "## User-Experience Expectations",
    "## Delivery Priorities and Dependencies",
    "## Risks, Unknowns, Assumptions, and Decisions",
    "## Validation and Acceptance Expectations",
    "## Planning Implications",
    "## Remaining Open Questions                [only when material questions remain]",
    "## Document Disposition",
    "",
    "Document.Status=Pending",
    "```",
    "",
    "Sections may be marked not applicable when justified. Add narrowly relevant sections only when they improve the durable planning record.",
    "",
    "## Required JSON Output Contract",
    "Create a synchronized JSON sibling containing the same substantive information as structured fields:",
    "- artifactType: project-architect-interview",
    "- artifact revision",
    "- participationRole: gatingReview",
    "- source revisions for the Project Intake and this prompt",
    "- project identity",
    "- structured interview findings corresponding to the Markdown sections",
    "- unresolved questions, or an empty array",
    "- documentDisposition.status: Pending",
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
  projectIntakeMarkdownPath: string,
  projectIntakeJsonPath: string,
  sourceRevision: number,
  targetMarkdownPath: string,
  targetJsonPath: string,
): string {
  const coverageSubjects = [
    "intended users, Operator, stakeholders, and affected parties",
    "problem being solved and desired measurable or observable outcome",
    "primary user workflows and functional capabilities",
    "boundaries, explicit non-goals, and deferred capabilities",
    "existing project state when applicable",
    "platform, deployment, technology, environment, and compatibility constraints",
    "data inputs, outputs, ownership, retention, and migration considerations",
    "integrations, external systems, services, files, devices, or repositories",
    "security, privacy, compliance, accessibility, safety, and operational requirements when applicable",
    "user-experience expectations and important interaction patterns",
    "reliability, performance, supportability, maintainability, and observability expectations when applicable",
    "delivery priorities, dependencies, sequencing constraints, and known deadlines",
    "acceptance, validation, and evidence expectations",
    "risks, unknowns, assumptions, and decisions that later planning must address",
  ];

  return `${JSON.stringify(
    {
      artifactType: "project-architect-interview-prompt",
      artifactRevision,
      participationRole: "nonReviewHandoff",
      projectSlug,
      projectArtifactKey: projectSlug,
      projectIdentity: {
        projectName: submission.projectName,
        projectPurpose: submission.projectPurpose,
        desiredOutcome: submission.desiredOutcome,
        projectType: submission.projectType,
        projectRepository: "<PROJECT_REPO>",
      },
      intakeContext: {
        hasExistingSourceOrPlanning: submission.hasExistingSourceOrPlanning,
        knownConstraints: submission.knownConstraints?.trim() || "",
        repositoryReviewContext: submission.repositoryReviewContext?.trim() || "",
      },
      sourceRevisions: [{ path: projectIntakeJsonPath, revision: sourceRevision }],
      canonicalProjectIntake: {
        markdown: projectIntakeMarkdownPath,
        json: projectIntakeJsonPath,
        revision: sourceRevision,
      },
      architectOutputTargets: {
        markdown: targetMarkdownPath,
        json: targetJsonPath,
      },
      generatedPromptRevision: artifactRevision,
      requiresRepositoryReview: submission.hasExistingSourceOrPlanning,
      architectRoleAndObjective: [
        "Act as the project Architect for the selected project.",
        "Use the approved Project Intake as starting context rather than repeating questions already answered.",
        "Conduct a conversational, adaptive interview focused on unresolved planning information.",
        "Identify material ambiguity, conflicting requirements, assumptions, dependencies, and risks.",
        "Ask follow-up questions until the project is sufficiently understood to support the later Project Profile and Project Roadmap.",
        "Summarize understanding and resolve consequential misunderstandings with the Operator before finalizing the durable interview document.",
        "Write the exact synchronized Markdown and JSON siblings through ChampCity MCP.",
      ],
      interviewMethod: {
        adaptive: true,
        durableRecordRequired: true,
        conversationTextIsNotDurableRecord: true,
        coverageSubjects,
      },
      repositoryReviewBehavior: submission.hasExistingSourceOrPlanning
        ? {
            mode: "existing-repository",
            requirements: [
              "Inspect the selected repository through ChampCity MCP before finalizing.",
              "Distinguish verified repository facts from Operator statements, assumptions, and Architect recommendations.",
              "Cite repository-relative paths where practical.",
              "Identify current implemented behavior, existing planning, known failures, abandoned attempts, protected areas, and material technical debt when relevant.",
              "Use verified current state as the baseline for later Project Profile and Project Roadmap work.",
            ],
            optionalRepositoryReviewContextMayBeBlank: true,
          }
        : {
            mode: "greenfield",
            requirements: [
              "Treat this as a greenfield project unless repository evidence establishes otherwise.",
            ],
          },
      requiredOutputContract: {
        markdown: {
          targetPath: targetMarkdownPath,
          requiredDisposition: "Pending",
          requiredParticipationRole: "gatingReview",
          requiredSections: [
            "Source Revisions",
            "Project Understanding",
            "Intended Users and Stakeholders",
            "Goals and Success Criteria",
            "Functional Scope and Primary Workflows",
            "Boundaries, Non-Goals, and Deferred Scope",
            "Verified Existing State when applicable",
            "Technical and Operational Constraints",
            "Data and Integration Considerations",
            "Security, Privacy, Compliance, and Accessibility",
            "User-Experience Expectations",
            "Delivery Priorities and Dependencies",
            "Risks, Unknowns, Assumptions, and Decisions",
            "Validation and Acceptance Expectations",
            "Planning Implications",
            "Remaining Open Questions only when material questions remain",
            "Document Disposition",
          ],
        },
        json: {
          targetPath: targetJsonPath,
          artifactType: "project-architect-interview",
          participationRole: "gatingReview",
          requiredDocumentDispositionStatus: "Pending",
          requiresSourceRevisions: true,
          requiresProjectIdentity: true,
          requiresStructuredFindings: true,
          unresolvedQuestionsMayBeEmpty: true,
        },
      },
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

function trimmedOrFallback(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
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

function findAssociatedPrompt(
  documents: PlanningDocumentSummary[],
  projectRoot: string,
  intake: PlanningDocumentSummary,
  projectSlug: string,
): PlanningDocumentSummary | undefined {
  const intakePaths = new Set(
    [intake.markdownPath, intake.jsonPath].filter((value): value is string => Boolean(value)),
  );
  const promptCandidates = documents.filter(isArchitectPrompt);
  return promptCandidates.find((document) =>
    (document.metadata.sourceRevisions ?? []).some((source) => intakePaths.has(source.path)),
  ) ?? promptCandidates.find((document) =>
    promptJsonReferencesIntake(projectRoot, document.jsonPath, intakePaths),
  ) ?? promptCandidates.find((document) =>
    document.markdownPath === `planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_${projectSlug}.md` ||
    document.jsonPath === `planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_${projectSlug}.json`,
  );
}

function isArchitectPrompt(document: PlanningDocumentSummary): boolean {
  return [document.markdownPath, document.jsonPath]
    .filter((value): value is string => Boolean(value))
    .some((relativePath) =>
      relativePath.replace(/\\/g, "/").toLowerCase()
        .startsWith("planning/project/project_architect_interview_prompts/"),
    );
}

function stableProjectArtifactKey(
  projectRoot: string,
  intake: PlanningDocumentSummary,
): string {
  const fromJson = readProjectArtifactKey(projectRoot, intake.jsonPath);
  if (fromJson) {
    return fromJson;
  }

  const pathKey = keyFromProjectIntakePath(intake.jsonPath ?? intake.markdownPath);
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
): { markdown: string; json: string } | undefined {
  if (!relativePath) {
    return undefined;
  }
  const targets = readJsonIfPresent(projectRoot, relativePath)?.architectOutputTargets;
  if (!targets || typeof targets !== "object") {
    return undefined;
  }
  const markdown = (targets as { markdown?: unknown }).markdown;
  const json = (targets as { json?: unknown }).json;
  return typeof markdown === "string" && typeof json === "string"
    ? { markdown, json }
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
    return JSON.parse(fs.readFileSync(absolutePath, "utf8")) as Record<string, unknown>;
  } catch {
    return undefined;
  }
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
