import { buildWorkCardFileStem } from "./workCardFileNames";
import type { WorkCard } from "./workCardSchema";
import { validateWorkCard } from "./validateWorkCard";

export interface BuilderPromptSupportingArtifact {
  fileName: string;
  content: string;
}

export interface BuilderPromptSupportingArtifacts {
  workCardMarkdown?: BuilderPromptSupportingArtifact;
  architectPrompt?: BuilderPromptSupportingArtifact;
  riskReview?: BuilderPromptSupportingArtifact;
  priorBuilderReport?: BuilderPromptSupportingArtifact;
}

export interface BuilderPromptSupportingArtifactFileNames {
  workCardMarkdown?: string;
  architectPrompt?: string;
  riskReview?: string;
  priorBuilderReport?: string;
}

export interface BuilderPromptRequest {
  phase: string;
  fileName: string;
  supportingArtifactFileNames?: BuilderPromptSupportingArtifactFileNames;
}

export interface BuilderPromptArtifactOption {
  fileName: string;
  label: string;
  isDefaultMatch: boolean;
}

export interface BuilderPromptArtifactOptions {
  workCardMarkdown: BuilderPromptArtifactOption[];
  architectPrompts: BuilderPromptArtifactOption[];
  riskReviews: BuilderPromptArtifactOption[];
  priorBuilderReports: BuilderPromptArtifactOption[];
}

export interface InvalidBuilderPromptArtifactFile {
  folder: string;
  fileName: string;
  errorMessages: string[];
}

export interface BuilderPromptArtifactListResult {
  ok: boolean;
  workCard?: WorkCard;
  options?: BuilderPromptArtifactOptions;
  defaultSelections?: BuilderPromptSupportingArtifactFileNames;
  notes?: string[];
  invalidFiles?: InvalidBuilderPromptArtifactFile[];
  errorMessages?: string[];
}

export interface BuilderPromptPreviewResult {
  ok: boolean;
  prompt?: string;
  workCard?: WorkCard;
  sourceFileName?: string;
  selectedArtifactFileNames?: BuilderPromptSupportingArtifactFileNames;
  hasHighRiskContext?: boolean;
  hasRiskReviewSelected?: boolean;
  errorMessages?: string[];
}

export interface BuilderPromptSaveResult extends BuilderPromptPreviewResult {
  markdownPath?: string;
  savedFileName?: string;
}

export const champCityRepositoryPath =
  "C:\\Users\\chapm\\Projects\\ChampCity_AI";

export const builderPromptHighRiskWarning =
  "This Work Card has high-risk review context. The Implementer must not broaden scope. If implementation requires secrets, authentication changes, destructive Git/GitHub actions, deployment changes, provider integrations, broad refactors, or other high-risk work not explicitly approved in this prompt, stop and report a blocking question.";

export const builderPromptNoRiskReviewWarning =
  "No Risk Review artifact was selected. The Implementer must not infer approval. Keep the work limited to this prompt and report blockers if risk-sensitive work is discovered.";

export const standardBuilderValidationCommands = [
  "npm run typecheck",
  "npm run build",
  "npm test",
  "npm run test:work-cards",
  "git status --short",
] as const;

const supportingArtifactCharacterLimit = 12000;

export function renderBuilderPrompt(
  workCard: WorkCard,
  supportingArtifacts: BuilderPromptSupportingArtifacts = {},
): string {
  const validation = validateWorkCard(workCard);

  if (!validation.valid) {
    throw new Error(
      `Cannot render Implementer prompt for invalid Work Card: ${validation.errors.join("; ")}`,
    );
  }

  const hasRiskReviewSelected = Boolean(supportingArtifacts.riskReview);
  const hasHighRiskContext =
    workCard.riskLevel === "high" ||
    hasHighRiskReviewContext(supportingArtifacts.riskReview?.content ?? "");
  const reportFileName = buildBuilderReportFileName(workCard);

  return [
    "You are acting as Implementer for ChampCity A/I.",
    "",
    "The Implementer may be Codex, Claude Code, Cursor, or another coding agent. Build only from this structured handoff and preserve the approved scope.",
    "",
    "Repository:",
    champCityRepositoryPath,
    "",
    "## Work Card Identity",
    "",
    `- Work Card ID: ${workCard.workCardId}`,
    `- Title: ${workCard.title}`,
    `- Phase: ${workCard.phase}`,
    `- Current status: ${workCard.status}`,
    `- Current Work Card risk level: ${workCard.riskLevel}`,
    "",
    "## Required Repo Checks Before Editing",
    "",
    `- Confirm current working directory is \`${champCityRepositoryPath}\`.`,
    `- Confirm Git repository root is \`${champCityRepositoryPath}\`.`,
    "- Check current branch and status:",
    "",
    "```bash",
    "git status --short --branch",
    "```",
    "",
    "- Check remotes:",
    "",
    "```bash",
    "git remote -v",
    "```",
    "",
    "- Read `AGENTS.md`.",
    `- Read the selected Work Card JSON artifact from \`planning/phases/${workCard.phase}/Work_Cards/\`.`,
    ...renderSelectedArtifactReadInstructions(supportingArtifacts),
    "",
    "## Goal",
    "",
    workCard.goal,
    "",
    "## Problem / User Outcome",
    "",
    "Problem:",
    workCard.problem,
    "",
    "User outcome:",
    workCard.userOutcome,
    "",
    "## Scope",
    "",
    formatList(workCard.scope),
    "",
    "## Out Of Scope",
    "",
    formatList(workCard.outOfScope),
    "",
    "## Requirements",
    "",
    formatList(workCard.requirements),
    "",
    "## Acceptance Criteria",
    "",
    formatList(workCard.acceptanceCriteria),
    "",
    "## Validation Plan",
    "",
    formatList(workCard.validationPlan),
    "",
    "Always run these validation commands before reporting completion:",
    "",
    "```bash",
    ...standardBuilderValidationCommands,
    "```",
    "",
    "## Risk Review Summary",
    "",
    ...renderRiskReviewSummary(
      supportingArtifacts.riskReview,
      hasHighRiskContext,
    ),
    "",
    "## Supporting Artifact Context",
    "",
    ...renderSupportingArtifactContext(supportingArtifacts),
    "",
    "## Implementer Report Requirement",
    "",
    "Create an Implementer Report for this pass.",
    "",
    `Required report folder: \`planning/phases/${workCard.phase}/Builder_Reports/\``,
    "",
    "Compatibility note: the product-facing role is Implementer, but this MVP still stores reports in the legacy `Builder_Reports` folder and uses `BUILDER_REPORT_*` filenames.",
    "",
    "Required report filename pattern: `BUILDER_REPORT_<work_card_id>_<slug>.md`",
    "",
    `Expected report name: \`${reportFileName}\``,
    "",
    "The Implementer Report must include:",
    "",
    formatList([
      "Repository path inspected.",
      "Git branch and remote status.",
      "Files created.",
      "Files modified.",
      "Files intentionally not created.",
      "Commands run and results.",
      "Validation performed.",
      "Validation skipped and reason.",
      "Manual validation requirement, if any.",
      "Git actions performed, including commit hash and tag if applicable.",
      "Security/secret-safety notes.",
      "Blocking questions, if any.",
      "Recommended next Implementer task.",
    ]),
    "",
    "## Git Instructions",
    "",
    formatList([
      "Stage only files changed or created for the Work Card.",
      "Commit with a Work Card-appropriate commit message.",
      "Do not create a release tag unless explicitly instructed.",
      "Do not push unless explicitly instructed.",
    ]),
    "",
    "## Out-Of-Scope Guard",
    "",
    formatList([
      "Do not call an LLM API unless explicitly in scope.",
      "Do not add provider SDKs unless explicitly in scope.",
      "Do not add database, cloud, auth, deployment, MCP, or connector integrations unless explicitly in scope.",
      "Do not refactor unrelated source files.",
      "Do not broaden scope.",
    ]),
  ].join("\n");
}

export function buildBuilderPromptFileName(workCard: WorkCard): string {
  return `BUILDER_PROMPT_${buildWorkCardFileStem(workCard.workCardId, workCard.title)}.md`;
}

export function buildBuilderReportFileName(workCard: WorkCard): string {
  return `BUILDER_REPORT_${buildWorkCardFileStem(workCard.workCardId, workCard.title)}.md`;
}

export function hasHighRiskReviewContext(content: string): boolean {
  return (
    /assessed risk level:\s*high/i.test(content) ||
    /\bhigh-risk\b/i.test(content) ||
    /\bhigh risk\b/i.test(content) ||
    /appears high risk/i.test(content)
  );
}

function renderSelectedArtifactReadInstructions(
  supportingArtifacts: BuilderPromptSupportingArtifacts,
): string[] {
  const selected = selectedArtifactLabels(supportingArtifacts);

  if (selected.length === 0) {
    return ["- No supporting artifacts were selected."];
  }

  return [
    "- Read the selected supporting artifacts included in this prompt:",
    ...selected.map((artifact) => `  - ${artifact}`),
  ];
}

function renderRiskReviewSummary(
  riskReview: BuilderPromptSupportingArtifact | undefined,
  hasHighRiskContext: boolean,
): string[] {
  if (!riskReview) {
    return [builderPromptNoRiskReviewWarning];
  }

  const lines = [
    `Risk Review artifact selected: \`${riskReview.fileName}\`. Risk context is included below. The Implementer must not broaden scope.`,
  ];

  if (hasHighRiskContext) {
    lines.push("", builderPromptHighRiskWarning);
  }

  return lines;
}

function renderSupportingArtifactContext(
  supportingArtifacts: BuilderPromptSupportingArtifacts,
): string[] {
  const sections = [
    renderArtifactSection(
      "Selected Work Card Markdown Context",
      supportingArtifacts.workCardMarkdown,
    ),
    renderArtifactSection(
      "Selected Architect Prompt Context",
      supportingArtifacts.architectPrompt,
    ),
    renderArtifactSection(
      "Selected Risk Review Context",
      supportingArtifacts.riskReview,
    ),
    renderArtifactSection(
      "Selected Prior Implementer Report Context",
      supportingArtifacts.priorBuilderReport,
    ),
  ].filter((section) => section.length > 0);

  if (sections.length === 0) {
    return ["No supporting artifact context was selected."];
  }

  return sections.flatMap((section, index) =>
    index === 0 ? section : ["", ...section],
  );
}

function renderArtifactSection(
  heading: string,
  artifact: BuilderPromptSupportingArtifact | undefined,
): string[] {
  if (!artifact) {
    return [];
  }

  return [
    `### ${heading}`,
    "",
    `Source artifact: \`${artifact.fileName}\``,
    "",
    "```text",
    boundArtifactText(artifact.content).replace(/```/g, "~~~"),
    "```",
  ];
}

function selectedArtifactLabels(
  supportingArtifacts: BuilderPromptSupportingArtifacts,
): string[] {
  const labels: string[] = [];

  if (supportingArtifacts.workCardMarkdown) {
    labels.push(
      `Work Card Markdown: \`${supportingArtifacts.workCardMarkdown.fileName}\``,
    );
  }

  if (supportingArtifacts.architectPrompt) {
    labels.push(
      `Architect Prompt: \`${supportingArtifacts.architectPrompt.fileName}\``,
    );
  }

  if (supportingArtifacts.riskReview) {
    labels.push(`Risk Review: \`${supportingArtifacts.riskReview.fileName}\``);
  }

  if (supportingArtifacts.priorBuilderReport) {
    labels.push(
      `Prior Implementer Report: \`${supportingArtifacts.priorBuilderReport.fileName}\``,
    );
  }

  return labels;
}

function boundArtifactText(content: string): string {
  const normalized = content.trimEnd();

  if (normalized.length <= supportingArtifactCharacterLimit) {
    return normalized;
  }

  return `${normalized.slice(0, supportingArtifactCharacterLimit)}\n\n[Artifact context truncated after ${supportingArtifactCharacterLimit} characters.]`;
}

function formatList(items: string[]): string {
  if (items.length === 0) {
    return "- None.";
  }

  return items.map((item) => `- ${item}`).join("\n");
}
