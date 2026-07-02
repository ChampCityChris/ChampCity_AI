import type { PhaseIntake } from "./phaseIntake";
import { validatePhaseIntake } from "./validatePhaseIntake";

export const phaseIntakeNextStepText =
  "Use this Phase Intake to generate a Phase Architect Interview prompt. The Phase Intake does not create Phase Planning Documents or Work Cards by itself.";

export const phaseIntakeMarkdownHeadings = [
  "## Phase",
  "## Project Name",
  "## Generation Mode",
  "## Source Project Planning Context",
  "## Source Artifacts Used",
  "## Plain-Language Operator Intent",
  "## Phase Purpose",
  "## Phase Problem",
  "## Phase Goal",
  "## User Outcome",
  "## Architect-Derived Scope",
  "## Included Scope",
  "## Out Of Scope",
  "## Affected Screens Or Workflows",
  "## Known Constraints",
  "## Known Risks",
  "## Dependencies",
  "## Validation Expectations",
  "## Assumptions",
  "## Risks And Drift Warnings",
  "## Acceptance Definition",
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
    section("Generation Mode", formatGenerationMode(phaseIntake)),
    section(
      "Source Project Planning Context",
      [
        `Source context: ${phaseIntake.sourceProjectPlanningDocument}`,
        `Source Project Intake JSON: ${phaseIntake.sourceProjectIntakeJsonFileName ?? "Not selected."}`,
        `Source Project Intake Markdown: ${phaseIntake.sourceProjectIntakeMarkdownFileName ?? "Not found."}`,
        `Source Project Architect Interview Prompt JSON: ${phaseIntake.sourceProjectArchitectInterviewPromptJsonFileName ?? "Not selected."}`,
        `Source Project Architect Interview Prompt Markdown: ${phaseIntake.sourceProjectArchitectInterviewPromptMarkdownFileName ?? "Not found."}`,
        `Source sidecar JSON: ${phaseIntake.sourceProjectPlanningSidecarJsonFileName ?? "Not selected."}`,
        `Source sidecar Markdown: ${phaseIntake.sourceProjectPlanningSidecarMarkdownFileName ?? "Not found."}`,
        `Repository Reconciliation JSON: ${phaseIntake.sourceRepositoryReconciliationJsonFileName ?? "Not selected."}`,
        `Repository Reconciliation Markdown: ${phaseIntake.sourceRepositoryReconciliationMarkdownFileName ?? "Not found."}`,
        `Existing Phase Intake editable source JSON: ${phaseIntake.sourceExistingPhaseIntakeJsonFileName ?? "Not selected."}`,
        `Existing Phase Intake editable source Markdown: ${phaseIntake.sourceExistingPhaseIntakeMarkdownFileName ?? "Not found."}`,
      ].join("\n"),
    ),
    section(
      "Source Artifacts Used",
      formatListOrFallback(
        phaseIntake.sourceArtifactsUsed,
        "Current project planning documents under planning/project/.",
      ),
    ),
    section(
      "Plain-Language Operator Intent",
      [
        `What to work on next: ${phaseIntake.operatorNextWorkIntent ?? "Not provided."}`,
        `Work type: ${phaseIntake.operatorProjectWorkType?.replace(/_/g, " ") ?? "Not provided."}`,
        `Must-keep constraints or concerns: ${phaseIntake.operatorMustKeepConstraints ?? "Not provided."}`,
      ].join("\n"),
    ),
    section("Phase Purpose", phaseIntake.phasePurpose ?? phaseIntake.phaseGoal),
    section("Phase Problem", phaseIntake.phaseProblem),
    section("Phase Goal", phaseIntake.phaseGoal),
    section("User Outcome", phaseIntake.userOutcome),
    section(
      "Architect-Derived Scope",
      phaseIntake.architectDerivedScope ?? phaseIntake.includedScope,
    ),
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
    section(
      "Assumptions",
      formatListOrFallback(phaseIntake.assumptions, "Not provided."),
    ),
    section(
      "Risks And Drift Warnings",
      formatListOrFallback(
        phaseIntake.risksAndDriftWarnings,
        phaseIntake.knownRisks,
      ),
    ),
    section(
      "Acceptance Definition",
      phaseIntake.acceptanceDefinition ?? phaseIntake.userOutcome,
    ),
    section("Operator Notes", phaseIntake.operatorNotes),
    section(
      "Generated Timestamp",
      [
        `Phase Intake ID: ${phaseIntake.phaseIntakeId}`,
        `Created: ${phaseIntake.createdAt}`,
        `Updated: ${phaseIntake.updatedAt}`,
      ].join("\n"),
    ),
    section("Next Step", phaseIntake.recommendedNextStep ?? phaseIntakeNextStepText),
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

function formatGenerationMode(phaseIntake: PhaseIntake): string {
  if (phaseIntake.generationMode === "architect-led") {
    return "Architect-led generated Phase Intake.";
  }

  return "Advanced manual Phase Intake.";
}

function formatListOrFallback(
  items: string[] | undefined,
  fallback: string,
): string {
  const safeItems =
    items?.map((item) => item.trim()).filter((item) => item.length > 0) ?? [];

  if (safeItems.length === 0) {
    return fallback;
  }

  return safeItems.map((item) => `- ${item}`).join("\n");
}
