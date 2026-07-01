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

  const targetId = record.validationTargetId ?? record.workCardId;
  const targetTitle = record.validationTargetTitle ?? record.workCardTitle;
  const targetKind = record.validationTargetKind ?? "work_card";
  const targetLines = [
    `- Validation Target ID: ${targetId}`,
    `- Validation Target kind: ${targetKind}`,
    `- Validation Target title: ${targetTitle}`,
    `- Phase: ${record.phase}`,
  ];

  if (record.parentWorkCardId) {
    targetLines.push(`- Parent Work Card ID: ${record.parentWorkCardId}`);
  }

  if (record.validationTargetSourceJsonFile) {
    targetLines.push(
      `- Source JSON file: ${record.validationTargetSourceJsonFile}`,
    );
  }

  if (record.validationTargetSourceMarkdownFile) {
    targetLines.push(
      `- Source Markdown file: ${record.validationTargetSourceMarkdownFile}`,
    );
  }

  if (record.validationTargetExpectedImplementerReportFile) {
    targetLines.push(
      `- Expected Implementer Report: ${record.validationTargetExpectedImplementerReportFile}`,
    );
  }

  targetLines.push(
    `- Associated Implementer Report: ${record.builderReportFile ?? "None selected."}`,
  );

  return [
    `# Human Validation Report - ${targetId} ${targetTitle}`,
    "",
    "## Validation Target",
    "",
    ...targetLines,
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
