import type { PhaseIntake } from "./phaseIntake";
import { validatePhaseIntake } from "./validatePhaseIntake";

export const phaseIntakeNextStepText =
  "Use this Phase Intake to generate a Phase Architect Interview prompt. The Phase Intake does not create Phase Planning Documents or Work Cards by itself.";

export const phaseIntakeMarkdownHeadings = [
  "## Phase",
  "## Project Name",
  "## Source Project Planning Context",
  "## Phase Problem",
  "## Phase Goal",
  "## User Outcome",
  "## Included Scope",
  "## Out Of Scope",
  "## Affected Screens Or Workflows",
  "## Known Constraints",
  "## Known Risks",
  "## Dependencies",
  "## Validation Expectations",
  "## Operator Notes",
  "## Generated Timestamp",
  "## Next Step",
] as const;

export function renderPhaseIntakeMarkdown(phaseIntake: PhaseIntake): string {
  const validation = validatePhaseIntake(phaseIntake);

  if (!validation.valid) {
    throw new Error(
      `Cannot render invalid Phase Intake: ${validation.errors.join("; ")}`,
    );
  }

  const sections = [
    `# Phase Intake: ${phaseIntake.phaseName}`,
    section(
      "Phase",
      [
        `Phase folder: ${phaseIntake.phaseFolder}`,
        `Phase name: ${phaseIntake.phaseName}`,
      ].join("\n"),
    ),
    section("Project Name", phaseIntake.projectName),
    section(
      "Source Project Planning Context",
      [
        `Source context: ${phaseIntake.sourceProjectPlanningDocument}`,
        `Source sidecar JSON: ${phaseIntake.sourceProjectPlanningSidecarJsonFileName ?? "Not selected."}`,
        `Source sidecar Markdown: ${phaseIntake.sourceProjectPlanningSidecarMarkdownFileName ?? "Not found."}`,
      ].join("\n"),
    ),
    section("Phase Problem", phaseIntake.phaseProblem),
    section("Phase Goal", phaseIntake.phaseGoal),
    section("User Outcome", phaseIntake.userOutcome),
    section("Included Scope", phaseIntake.includedScope),
    section("Out Of Scope", phaseIntake.outOfScope),
    section(
      "Affected Screens Or Workflows",
      phaseIntake.affectedScreensOrWorkflows,
    ),
    section("Known Constraints", phaseIntake.knownConstraints),
    section("Known Risks", phaseIntake.knownRisks),
    section("Dependencies", phaseIntake.dependencies),
    section("Validation Expectations", phaseIntake.validationExpectations),
    section("Operator Notes", phaseIntake.operatorNotes),
    section(
      "Generated Timestamp",
      [
        `Phase Intake ID: ${phaseIntake.phaseIntakeId}`,
        `Created: ${phaseIntake.createdAt}`,
        `Updated: ${phaseIntake.updatedAt}`,
      ].join("\n"),
    ),
    section("Next Step", phaseIntakeNextStepText),
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
