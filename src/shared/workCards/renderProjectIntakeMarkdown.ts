import type { ProjectIntake } from "./projectIntake";
import { validateProjectIntake } from "./validateProjectIntake";

export const projectIntakeNextStepText =
  "Use this Project Intake to generate a Project Architect Interview prompt. The Project Intake does not create the Project Profile or Work Cards by itself.";

export const projectIntakeMarkdownHeadings = [
  "## Project Name",
  "## Working Title",
  "## What Are You Trying To Build?",
  "## Who Is This For?",
  "## What Problem Does This Solve?",
  "## What Should The User Be Able To Do?",
  "## Goal For This Project",
  "## Current Stage",
  "## Source Of Truth Location",
  "## Preferred Implementer Tool",
  "## Architect Surface",
  "## Known Constraints",
  "## What This Project Should Not Try To Do Yet",
  "## Security Or Data Concerns",
  "## Examples Or References",
  "## What The Operator Is Unsure About",
  "## Notes For The Architect",
  "## Generated Timestamp",
  "## Next Step",
] as const;

export function renderProjectIntakeMarkdown(
  projectIntake: ProjectIntake,
): string {
  const validation = validateProjectIntake(projectIntake);

  if (!validation.valid) {
    throw new Error(
      `Cannot render invalid Project Intake: ${validation.errors.join("; ")}`,
    );
  }

  const sections = [
    `# Project Intake: ${projectIntake.projectName}`,
    section("Project Name", projectIntake.projectName),
    section("Working Title", projectIntake.workingTitle),
    section("What Are You Trying To Build?", projectIntake.productSummary),
    section("Who Is This For?", projectIntake.targetUsers),
    section("What Problem Does This Solve?", projectIntake.userProblem),
    section(
      "What Should The User Be Able To Do?",
      projectIntake.desiredUserOutcome,
    ),
    section("Goal For This Project", projectIntake.businessOrPersonalGoal),
    section("Current Stage", projectIntake.currentStage),
    section("Source Of Truth Location", projectIntake.sourceOfTruthLocation),
    section(
      "Preferred Implementer Tool",
      projectIntake.preferredImplementerTool,
    ),
    section("Architect Surface", projectIntake.architectSurface),
    section("Known Constraints", projectIntake.knownConstraints),
    section(
      "What This Project Should Not Try To Do Yet",
      projectIntake.nonGoals,
    ),
    section(
      "Security Or Data Concerns",
      projectIntake.securityOrDataConcerns,
    ),
    section("Examples Or References", projectIntake.examplesOrReferences),
    section(
      "What The Operator Is Unsure About",
      projectIntake.operatorUncertainties,
    ),
    section("Notes For The Architect", projectIntake.notesForArchitect),
    section(
      "Generated Timestamp",
      [
        `Project Intake ID: ${projectIntake.projectIntakeId}`,
        `Created: ${projectIntake.createdAt}`,
        `Updated: ${projectIntake.updatedAt}`,
      ].join("\n"),
    ),
    section("Next Step", projectIntakeNextStepText),
  ];

  return `${sections.join("\n\n")}\n`;
}

function section(title: string, body: string): string {
  return `## ${title}\n\n${formatBody(body)}`;
}

function formatBody(value: string): string {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "Not provided.";
}
