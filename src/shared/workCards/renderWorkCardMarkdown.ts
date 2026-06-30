import type { WorkCard } from "./workCardSchema";
import { validateWorkCard } from "./validateWorkCard";

const repositoryPathInstruction =
  "Verify the repository path before editing. Expected repository: `C:\\Users\\chapm\\Projects\\ChampCity_AI`.";

export const workCardMarkdownHeadings = [
  "## Work Card ID",
  "## Phase",
  "## Status",
  "## What Problem Are We Solving?",
  "## What Should This Accomplish?",
  "## What Should the User Be Able To Do?",
  "## What Is Included?",
  "## What Is Not Included?",
  "## Requirements",
  "## How We Know This Is Done",
  "## How This Should Be Validated",
  "## Risk Level",
  "## Risks and Watch Items",
  "## Builder Instructions",
  "## Operator Notes",
  "## Builder Handoff Prompt",
] as const;

export function renderWorkCardMarkdown(workCard: WorkCard): string {
  const validation = validateWorkCard(workCard);

  if (!validation.valid) {
    throw new Error(
      `Cannot render invalid Work Card: ${validation.errors.join("; ")}`,
    );
  }

  const sections = [
    `# Work Card: ${workCard.title}`,
    section(
      "Work Card ID",
      [
        workCard.workCardId,
        "",
        `Created: ${workCard.createdAt}`,
        `Updated: ${workCard.updatedAt}`,
      ].join("\n"),
    ),
    section("Phase", workCard.phase),
    section("Status", workCard.status),
    section("What Problem Are We Solving?", workCard.problem),
    section("What Should This Accomplish?", workCard.goal),
    section("What Should the User Be Able To Do?", workCard.userOutcome),
    section("What Is Included?", formatList(workCard.scope)),
    section("What Is Not Included?", formatList(workCard.outOfScope)),
    section("Requirements", formatList(workCard.requirements)),
    section("How We Know This Is Done", formatList(workCard.acceptanceCriteria)),
    section("How This Should Be Validated", formatList(workCard.validationPlan)),
    section("Risk Level", workCard.riskLevel),
    section("Risks and Watch Items", formatList(workCard.risks)),
    section("Builder Instructions", formatList(workCard.builderInstructions)),
    section("Operator Notes", formatList(workCard.operatorNotes)),
    section("Builder Handoff Prompt", renderBuilderHandoffPrompt(workCard)),
  ];

  return `${sections.join("\n\n")}\n`;
}

export function renderBuilderHandoffPrompt(workCard: WorkCard): string {
  if (usesImplementerTerminology(workCard)) {
    return renderImplementerHandoffPrompt(workCard);
  }

  return [
    "Use this as the starting Builder prompt:",
    "",
    "You are acting as Builder for ChampCity A/I.",
    "",
    "Before editing:",
    `- ${repositoryPathInstruction}`,
    "- Read `AGENTS.md` and relevant planning files.",
    "",
    `Work Card: ${workCard.workCardId} - ${workCard.title}`,
    "",
    `Goal: ${workCard.goal}`,
    "",
    "Scope:",
    formatList(workCard.scope),
    "",
    "Out of scope:",
    formatList(workCard.outOfScope),
    "",
    "Requirements:",
    formatList(workCard.requirements),
    "",
    "Acceptance criteria:",
    formatList(workCard.acceptanceCriteria),
    "",
    "Validation plan:",
    formatList(workCard.validationPlan),
    "",
    "Builder Report:",
    `- Create a Builder Report under \`planning/phases/${workCard.phase}/Builder_Reports/\` and include commands run, validation results, security notes, git actions, and the recommended next Builder task.`,
  ].join("\n");
}

function renderImplementerHandoffPrompt(workCard: WorkCard): string {
  return [
    "Use this as the starting Implementer prompt. The section heading remains a legacy Builder handoff heading for artifact compatibility.",
    "",
    "You are acting as Implementer for ChampCity A/I.",
    "",
    "The Implementer may be Codex, Claude Code, Cursor, or another coding agent. Build only from this structured handoff and preserve the approved scope.",
    "",
    "Before editing:",
    `- ${repositoryPathInstruction}`,
    "- Read `AGENTS.md` and relevant planning files.",
    "",
    `Work Card: ${workCard.workCardId} - ${workCard.title}`,
    "",
    `Goal: ${workCard.goal}`,
    "",
    "Scope:",
    formatList(workCard.scope),
    "",
    "Out of scope:",
    formatList(workCard.outOfScope),
    "",
    "Requirements:",
    formatList(workCard.requirements),
    "",
    "Acceptance criteria:",
    formatList(workCard.acceptanceCriteria),
    "",
    "Validation plan:",
    formatList(workCard.validationPlan),
    "",
    "Implementer Report:",
    `- Create an Implementer Report under the legacy \`planning/phases/${workCard.phase}/Builder_Reports/\` folder and include commands run, validation results, security notes, git actions, and the recommended next Implementer task.`,
  ].join("\n");
}

function usesImplementerTerminology(workCard: WorkCard): boolean {
  return workCard.builderInstructions.some((value) =>
    /\bImplementer\b/.test(value),
  );
}

function section(title: string, body: string): string {
  return `## ${title}\n\n${body}`;
}

function formatList(items: string[]): string {
  if (items.length === 0) {
    return "- None.";
  }

  return items.map((item) => `- ${item}`).join("\n");
}
