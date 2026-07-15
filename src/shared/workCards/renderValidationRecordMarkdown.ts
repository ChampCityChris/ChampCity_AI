import type { HumanValidationRecord } from "./validationRecord";
import { validateHumanValidationRecord } from "./validationRecord";
import {
  architectDispositionLines,
  validationArchitectReviewInstructionLines,
  validationFieldSemanticsLines,
  validationItemResultValues,
} from "./reportReviewProtocol";

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
    `- Associated Implementer Report: ${record.implementerReportFile ?? "None selected."}`,
  );

  const legacyOperatorDecisionLines = record.operatorDecision
    ? [
        "## Legacy Operator Decision (Deprecated / Advisory)",
        "",
        record.operatorDecision,
        "",
        "This legacy field is advisory context only. It is not final routing authority and must not be the sole trigger for repair, merge, or deferral.",
        "",
      ]
    : [];

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
    "## Acceptance-Criteria Item Result Guidance",
    "",
    `Use item-level results where feasible: ${validationItemResultValues.join(
      ", ",
    )}. A Concern is non-blocking unless the evidence shows an acceptance criterion was not satisfied enough to pass.`,
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
    "## Operator Suggested Follow-up (Advisory)",
    "",
    formatText(record.recommendedNextAction),
    "",
    ...legacyOperatorDecisionLines,
    ...validationFieldSemanticsLines(),
    "",
    ...validationArchitectReviewInstructionLines(),
    "",
    ...architectDispositionLines(record.architectDisposition),
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
