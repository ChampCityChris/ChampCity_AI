import {
  validatePhaseArchitectInterviewPrompt,
  type PhaseArchitectInterviewPrompt,
} from "./phaseArchitectInterviewPrompt";

export const phaseArchitectInterviewPromptNextStepText =
  "Copy this prompt into the Architect surface. Use the returned questions and recommended defaults to complete the phase interview. Phase Planning Documents and Work Cards are generated later by a dedicated workflow.";

export const phaseArchitectInterviewPromptMarkdownHeadings = [
  "## Source Phase Intake",
  "## Source Project Planning Context",
  "## Prompt Purpose",
  "## Architect Surface",
  "## Operator Instruction",
  "## Generated Prompt",
  "## Generated Timestamp",
  "## Next Step",
] as const;

export function renderPhaseArchitectInterviewPromptMarkdown(
  promptRecord: PhaseArchitectInterviewPrompt,
): string {
  const validation = validatePhaseArchitectInterviewPrompt(promptRecord);

  if (!validation.valid) {
    throw new Error(
      `Cannot render invalid Phase Architect Interview Prompt: ${validation.errors.join("; ")}`,
    );
  }

  const sections = [
    `# Phase Architect Interview Prompt: ${promptRecord.phaseName}`,
    section(
      "Source Phase Intake",
      [
        `Phase Intake ID: ${promptRecord.phaseIntakeId}`,
        `Project Name: ${promptRecord.projectName}`,
        `Phase Folder: ${promptRecord.phaseFolder}`,
        `Phase Name: ${promptRecord.phaseName}`,
        `Source JSON: ${promptRecord.sourcePhaseIntakeJsonFileName}`,
        `Source Markdown: ${promptRecord.sourcePhaseIntakeMarkdownFileName ?? "Not found."}`,
      ].join("\n"),
    ),
    section(
      "Source Project Planning Context",
      [
        `Source context: ${promptRecord.sourceProjectPlanningDocument}`,
        `Source sidecar JSON: ${promptRecord.sourceProjectPlanningSidecarJsonFileName ?? "Not selected."}`,
        `Source sidecar Markdown: ${promptRecord.sourceProjectPlanningSidecarMarkdownFileName ?? "Not found."}`,
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
    section("Next Step", phaseArchitectInterviewPromptNextStepText),
  ];

  return `${sections.join("\n\n")}\n`;
}

function section(title: string, body: string): string {
  return `## ${title}\n\n${body}`;
}
