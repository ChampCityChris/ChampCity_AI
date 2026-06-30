import {
  validateProjectArchitectInterviewPrompt,
  type ProjectArchitectInterviewPrompt,
} from "./projectArchitectInterviewPrompt";

export const projectArchitectInterviewPromptNextStepText =
  "Copy this prompt into the Architect surface. After the Architect interview is complete, use the completed interview output to generate Project Planning Documents. This prompt does not create the Project Profile, Project Roadmap, Phase Plan, or Work Cards by itself.";

export const projectArchitectInterviewPromptMarkdownHeadings = [
  "## Source Project Intake",
  "## Prompt Purpose",
  "## Architect Surface",
  "## Operator Instruction",
  "## Generated Prompt",
  "## Generated Timestamp",
  "## Next Step",
] as const;

export function renderProjectArchitectInterviewPromptMarkdown(
  promptRecord: ProjectArchitectInterviewPrompt,
): string {
  const validation = validateProjectArchitectInterviewPrompt(promptRecord);

  if (!validation.valid) {
    throw new Error(
      `Cannot render invalid Project Architect Interview Prompt: ${validation.errors.join("; ")}`,
    );
  }

  const sections = [
    `# Project Architect Interview Prompt: ${promptRecord.projectName}`,
    section(
      "Source Project Intake",
      [
        `Project Intake ID: ${promptRecord.projectIntakeId}`,
        `Project Name: ${promptRecord.projectName}`,
        `Source JSON: ${promptRecord.sourceProjectIntakeJsonFileName}`,
        `Source Markdown: ${promptRecord.sourceProjectIntakeMarkdownFileName ?? "Not found."}`,
      ].join("\n"),
    ),
    section("Prompt Purpose", promptRecord.promptPurpose),
    section("Architect Surface", promptRecord.architectSurface),
    section("Operator Instruction", promptRecord.operatorInstruction),
    section("Generated Prompt", promptRecord.promptText),
    section(
      "Generated Timestamp",
      [
        `Prompt ID: ${promptRecord.promptId}`,
        `Created: ${promptRecord.createdAt}`,
        `Updated: ${promptRecord.updatedAt}`,
      ].join("\n"),
    ),
    section("Next Step", projectArchitectInterviewPromptNextStepText),
  ];

  return `${sections.join("\n\n")}\n`;
}

function section(title: string, body: string): string {
  return `## ${title}\n\n${body}`;
}
