import {
  champCityRepositoryPath,
  standardImplementerValidationCommands,
} from "./renderImplementerExecutionPacket";
import type { HumanValidationRecord } from "./validationRecord";
import { buildWorkCardFileStem } from "./workCardFileNames";
import { implementerReportArchitectReviewInstructionLines } from "./reportReviewProtocol";

export interface RepairPromptRenderOptions {
  validationRecordFileName?: string;
}

export const repairPromptScopeGuard =
  "Repair only the exact scope classified by the Architect from the Operator validation evidence. Do not broaden implementation.";

export function renderRepairPrompt(
  record: HumanValidationRecord,
  options: RepairPromptRenderOptions = {},
): string {
  const repairReportFileName = buildRepairImplementerReportFileName(record);

  return [
    "You are acting as Implementer for ChampCity A/I.",
    "",
    "The Implementer may be Codex, Claude Code, Cursor, or another coding agent. Repair only from the validation evidence below.",
    "",
    "Repository:",
    champCityRepositoryPath,
    "",
    "## Repair Task Identity",
    "",
    `- Repair task: REPAIR_${record.workCardId}_${slugForIdentity(record.workCardTitle)}`,
    `- Selected Work Card ID: ${record.workCardId}`,
    `- Selected Work Card title: ${record.workCardTitle}`,
    `- Phase: ${record.phase}`,
    `- Associated Implementer Report: ${record.implementerReportFile ?? "None selected."}`,
    `- Validation record: ${options.validationRecordFileName ?? "Use the saved validation record created with this prompt."}`,
    "",
    "## Validation Evidence And Architect Disposition",
    "",
    `- Validation result: ${record.validationResult}`,
    `- Architect disposition: ${record.architectDisposition}`,
    ...(record.operatorDecision
      ? [
          `- Legacy Operator Decision (advisory only): ${record.operatorDecision}`,
          "- Legacy Operator Decision is context only and is not repair, merge, or deferral authority.",
        ]
      : []),
    "",
    "## What Passed",
    "",
    formatText(record.passedItems),
    "",
    "## What Failed",
    "",
    formatText(record.failedItems),
    "",
    "## Observed Errors",
    "",
    formatText(record.observedErrors),
    "",
    "## Evidence References",
    "",
    formatText(record.evidenceReferences),
    "",
    "## Additional Operator Observations",
    "",
    formatText(record.additionalOperatorObservations),
    "",
    "## Repair Objective",
    "",
    formatText(
      record.recommendedNextAction ||
        "Repair the validated failure and preserve all behavior that already passed manual validation.",
    ),
    "",
    "## Scope",
    "",
    `- ${repairPromptScopeGuard}`,
    "- Preserve passing behavior called out by the Operator.",
    "- Keep changes limited to the validated repair path.",
    "",
    "## Out Of Scope",
    "",
    formatList([
      "Do not broaden implementation.",
      "Do not start the next Work Card.",
      "Do not rewrite unrelated code.",
      "Do not update Work Card status.",
      "Do not add provider SDKs, database, cloud, auth, deployment, MCP, or connector integrations unless explicitly part of the repair.",
    ]),
    "",
    "## Required Repo Checks",
    "",
    formatList([
      `Confirm current working directory is \`${champCityRepositoryPath}\`.`,
      `Confirm Git repository root is \`${champCityRepositoryPath}\`.`,
      "Run `git status --short --branch`.",
      "Run `git remote -v`.",
      "Read `AGENTS.md`.",
      `Read the selected Work Card from \`planning/phases/${record.phase}/Work_Cards/\`.`,
      record.implementerReportFile
        ? `Read the associated Implementer Report \`${record.implementerReportFile}\`.`
        : "No Implementer Report was selected; note that the evidence chain is incomplete.",
      options.validationRecordFileName
        ? `Read the validation record \`${options.validationRecordFileName}\`.`
        : "Read the saved validation record for this repair.",
    ]),
    "",
    "## Validation Commands",
    "",
    "```bash",
    ...standardImplementerValidationCommands,
    "```",
    "",
    "## Implementer Report Requirement",
    "",
    `Create a repair Implementer Report under \`planning/phases/${record.phase}/Implementer_Reports/\`.`,
    "",
    "Canonical storage: repair Implementer Reports use the `Implementer_Reports` folder and `IMPLEMENTER_REPORT_REPAIR_*` filename pattern.",
    "",
    "Filename pattern: `IMPLEMENTER_REPORT_REPAIR_<work_card_id>_<slug>.md`",
    "",
    `Expected report name: \`${repairReportFileName}\``,
    "",
    "Copy the following durable section into the repair Implementer Report so its review protocol travels with the implementation evidence:",
    "",
    ...implementerReportArchitectReviewInstructionLines(),
    "",
    "## Git Instructions",
    "",
    formatList([
      "Stage only repair-related files.",
      "Commit with a repair-specific message.",
      "Do not create a release tag.",
      "Do not push unless explicitly instructed.",
    ]),
  ].join("\n");
}

export function buildRepairPromptFileName(
  record: Pick<HumanValidationRecord, "workCardId" | "workCardTitle">,
): string {
  return validateRepairPromptFileName(
    `REPAIR_PROMPT_${buildWorkCardFileStem(
      record.workCardId,
      record.workCardTitle,
    )}.md`,
  );
}

export function buildRepairImplementerReportFileName(
  record: Pick<HumanValidationRecord, "workCardId" | "workCardTitle">,
): string {
  return `IMPLEMENTER_REPORT_REPAIR_${buildWorkCardFileStem(
    record.workCardId,
    record.workCardTitle,
  )}.md`;
}

export function validateRepairPromptFileName(fileName: string): string {
  const value = fileName.trim();

  if (value.length === 0) {
    throw new Error("Repair Prompt filename must not be blank.");
  }

  if (/[\\/]/.test(value) || value.includes("..")) {
    throw new Error("Repair Prompt filename must not include folders.");
  }

  if (!value.endsWith(".md")) {
    throw new Error("Repair Prompt filename must use the .md extension.");
  }

  if (!/^REPAIR_PROMPT_[A-Za-z0-9][A-Za-z0-9_-]*\.md$/.test(value)) {
    throw new Error(
      "Repair Prompt filename must use only letters, numbers, hyphens, underscores, and the .md extension.",
    );
  }

  return value;
}

function slugForIdentity(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function formatText(value: string): string {
  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : "None recorded.";
}

function formatList(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}
