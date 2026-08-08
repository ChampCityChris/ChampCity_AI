import {
  type CanonicalDocumentMetadata,
} from "../../shared/documents/canonicalMarkdown";
import { writeCanonicalMarkdownDocument } from "../documents/canonicalMarkdownDocumentWriter";

export interface ProjectArchitectInterviewPromptInput {
  workspaceRoot: string;
  projectName: string;
  projectSlug: string;
  projectIntakeMarkdownPath: string;
  projectIntakeRevision: number;
  projectIntakeWorkflowData: Record<string, unknown>;
  promptRevision?: number;
  architectInterviewTargetMarkdownPath?: string;
}

export interface ProjectArchitectInterviewPromptWrite {
  relativePath: string;
  architectInterviewTargetMarkdownPath: string;
  metadata: CanonicalDocumentMetadata;
  bodyMarkdown: string;
}

export function projectArchitectInterviewPromptPath(projectSlug: string): string {
  return `planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_${projectSlug}.md`;
}

export function projectArchitectInterviewTargetPath(projectSlug: string): string {
  return `planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_${projectSlug}.md`;
}

export function buildProjectArchitectInterviewPrompt(
  input: ProjectArchitectInterviewPromptInput,
): ProjectArchitectInterviewPromptWrite {
  const projectRepository = stringValue(input.projectIntakeWorkflowData.projectRepository);
  const repositoryAuthority = recordValue(input.projectIntakeWorkflowData.repositoryAuthority);
  const repositoryAuthorityProjectRepository = stringValue(repositoryAuthority?.projectRepository);
  if (!projectRepository) {
    throw new Error("Approved Project Intake is missing workflowData.projectRepository.");
  }
  if (!repositoryAuthority || !repositoryAuthorityProjectRepository) {
    throw new Error("Approved Project Intake is missing workflowData.repositoryAuthority.projectRepository.");
  }

  const relativePath = projectArchitectInterviewPromptPath(input.projectSlug);
  const architectInterviewTargetMarkdownPath =
    input.architectInterviewTargetMarkdownPath ?? projectArchitectInterviewTargetPath(input.projectSlug);
  const metadata: CanonicalDocumentMetadata = {
    schemaVersion: 1,
    artifactType: "project-architect-interview-prompt",
    artifactRevision: input.promptRevision ?? 1,
    participationRole: "nonReviewHandoff",
    identity: { projectSlug: input.projectSlug, "Project.ArtifactKey": input.projectSlug },
    sourceRevisions: [
      { path: input.projectIntakeMarkdownPath, revision: input.projectIntakeRevision },
    ],
    workflowData: {
      ...input.projectIntakeWorkflowData,
      projectSlug: input.projectSlug,
      architectOutputTargets: { markdown: architectInterviewTargetMarkdownPath },
    },
    documentDisposition: { status: "Approved", notes: "", reviewedAt: null },
  };

  return {
    relativePath,
    architectInterviewTargetMarkdownPath,
    metadata,
    bodyMarkdown: architectPromptBody(input.projectName, input.projectIntakeMarkdownPath),
  };
}

export function writeProjectArchitectInterviewPrompt(
  input: ProjectArchitectInterviewPromptInput,
): ProjectArchitectInterviewPromptWrite {
  const prompt = buildProjectArchitectInterviewPrompt(input);
  writeCanonicalMarkdownDocument({
    workspaceRoot: input.workspaceRoot,
    relativePath: prompt.relativePath,
    metadata: prompt.metadata,
    bodyMarkdown: prompt.bodyMarkdown,
  });
  return prompt;
}

function architectPromptBody(
  projectName: string,
  intakeMarkdownPath: string,
): string {
  return [
    `# Project Architect Interview Prompt: ${projectName}`,
    "",
    "Read these application-owned inputs:",
    `- Project Intake Markdown: ${intakeMarkdownPath}`,
    "",
    "Conduct the Project Architect Interview conversationally with the Operator.",
    "",
    "## Interview Method",
    "",
    "Use plain language suitable for an Operator who may not be technically experienced.",
    "",
    "Ask one primary question at a time. Do not present long questionnaires or large batches of unrelated questions.",
    "",
    "Use the Project Intake and available evidence before asking the Operator for information. Do not ask questions whose answers can be derived from the supplied documents, repository evidence, or normal architectural judgment.",
    "",
    "Distinguish between:",
    "",
    "- Operator-owned decisions about purpose, users, priorities, constraints, acceptable risk, cost, timing, and desired behavior;",
    "- Architect-owned technical decisions about implementation structure, internal design, libraries, patterns, and engineering approach;",
    "- mixed decisions where technical tradeoffs materially affect product behavior, cost, risk, or scope.",
    "",
    "For Architect-owned decisions, make a recommendation rather than transferring the design problem to the Operator.",
    "",
    "When a question involves a meaningful choice:",
    "",
    "1. ask the question in plain language;",
    "2. explain briefly why it matters;",
    "3. provide the recommended answer and rationale;",
    "4. provide no more than two meaningful alternatives when alternatives are necessary;",
    "5. allow the Operator to answer “use your recommendation” or “unsure.”",
    "",
    "Avoid jargon. When a technical term is necessary, explain it briefly.",
    "",
    "Do not repeatedly request confirmation for low-risk implementation details that the Architect can decide responsibly.",
    "",
    "## Interview Length and Pace",
    "",
    "Aim to complete the interview in approximately 8–12 substantive questions.",
    "",
    "This is a soft operating range, not a hard stop.",
    "",
    "After approximately five substantive questions, summarize:",
    "",
    "- decisions made;",
    "- assumptions recorded;",
    "- unresolved material issues;",
    "- remaining interview areas.",
    "",
    "At approximately ten substantive questions, continue only when unresolved matters could materially affect scope, architecture, risk, dependencies, acceptance, cost, or delivery.",
    "",
    "Do not compress multiple major decisions into one overwhelming question merely to stay within the suggested range.",
    "",
    "## Required Coverage",
    "",
    "Continue until the following are materially resolved:",
    "",
    "- project purpose and desired outcome;",
    "- intended users and primary workflows;",
    "- scope and explicit non-scope;",
    "- success and acceptance criteria;",
    "- operational and technical constraints;",
    "- existing systems, data, and integrations;",
    "- security, privacy, compliance, and reliability requirements where applicable;",
    "- major architectural direction;",
    "- material risks and dependencies;",
    "- assumptions;",
    "- deferred decisions;",
    "- unresolved questions requiring later confirmation;",
    "- planning direction for the next project-planning stage.",
    "",
    "Do not ask the Operator to choose implementation technologies or internal architecture unless the choice creates a material product, cost, risk, or operational tradeoff. In those cases, provide a recommendation first.",
    "",
    "## Completion Confirmation",
    "",
    "Before creating the final Interview document, present a concise confirmation summary containing:",
    "",
    "- project understanding;",
    "- key decisions;",
    "- Architect recommendations accepted;",
    "- assumptions;",
    "- deferred items;",
    "- unresolved issues.",
    "",
    "Ask the Operator to confirm the summary or identify corrections.",
    "",
    "Do not create placeholder output before the interview is substantively complete.",
    "",
    "## Final Output",
    "",
    "When the interview is complete and confirmed, synthesize one complete substantive Project Architect Interview Markdown document body, not a snippet.",
    "",
    "The final document should include:",
    "",
    "1. Project Understanding",
    "2. Users and Primary Workflows",
    "3. Scope",
    "4. Non-Scope",
    "5. Constraints",
    "6. Key Decisions",
    "7. Architect Recommendations",
    "8. Data and Integration Requirements",
    "9. Security, Compliance, and Operational Considerations",
    "10. Risks and Dependencies",
    "11. Assumptions",
    "12. Deferred Decisions",
    "13. Unresolved Questions",
    "14. Acceptance Direction",
    "15. Project Planning Direction",
    "",
    "Open ChampCity A/I Architect Interview and copy its fresh handoff before writing the body.",
    "",
    "That handoff provides the exact temporary draft path and the required `artifact_toolbox.create_markdown_artifact` invocation.",
    "",
    "Do not write canonical metadata or a final Interview path. ChampCity A/I promotes the temporary draft into the Pending canonical Interview.",
  ].join("\n");
}

function recordValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}
