import type { HumanValidationRecord } from "./validationRecord";
import { validateHumanValidationRecord } from "./validationRecord";

export const validationRecordNonMutatingNote =
  "This Human Validation record does not modify, approve, close, fail, validate, or repair the Work Card by itself.";

export function renderValidationRecordMarkdown(
  record: HumanValidationRecord,
): string {
  const validation = validateHumanValidationRecord(record);

  if (!validation.valid) {
    throw new Error(
      `Cannot render invalid Human Validation record: ${validation.errors.join("; ")}`,
    );
  }

  return [
    `# Human Validation Report - ${record.workCardId} ${record.workCardTitle}`,
    "",
    "## Work Card",
    "",
    `- Work Card ID: ${record.workCardId}`,
    `- Work Card title: ${record.workCardTitle}`,
    `- Phase: ${record.phase}`,
    `- Associated Builder Report: ${record.builderReportFile ?? "None selected."}`,
    "",
    "## Validation Result",
    "",
    record.validationResult,
    "",
    "## What Was Tested?",
    "",
    formatText(record.testedItems),
    "",
    "## What Passed?",
    "",
    formatText(record.passedItems),
    "",
    "## What Failed?",
    "",
    formatText(record.failedItems),
    "",
    "## Evidence References Or Paths",
    "",
    formatText(record.evidenceReferences),
    "",
    "## Screenshots Or Files Referenced By Path",
    "",
    formatText(record.screenshotOrFileReferences),
    "",
    "## Manual Commands Run",
    "",
    formatText(record.commandsRun),
    "",
    "## Observed Errors",
    "",
    formatText(record.observedErrors),
    "",
    "## Additional Operator Observations",
    "",
    formatText(record.additionalOperatorObservations),
    "",
    "## Operator Decision",
    "",
    record.operatorDecision,
    "",
    "## Recommended Next Action",
    "",
    formatText(record.recommendedNextAction),
    "",
    "## Generated Timestamp",
    "",
    record.createdAt,
    "",
    "## Non-Mutating Note",
    "",
    validationRecordNonMutatingNote,
    "",
  ].join("\n");
}

function formatText(value: string): string {
  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : "None recorded.";
}
