export const pendingArchitectDisposition = "Pending Architect review";

export const validationItemResultValues = [
  "Pass",
  "Concern",
  "Fail",
  "Not tested",
  "Not applicable",
] as const;

export const architectReviewDecisionValues = [
  "Ready for Operator validation",
  "Repair required before Operator validation",
  "Blocked / incomplete",
  "Out of scope",
] as const;

export const architectReviewOutputHeadings = [
  "Architect Review Decision",
  "Work Card Compliance",
  "Changed Files Reviewed",
  "Acceptance Criteria Assessment",
  "Validation Claims Assessment",
  "Skipped Checks Assessment",
  "Observation Register Impact",
  "Operator Validation Steps",
  "Required Repair, if any",
] as const;

export function validationFieldSemanticsLines(): string[] {
  return [
    "## Field Semantics",
    "",
    "Validation Result answers: Did the implementation satisfy the Work Card acceptance criteria at a functional level?",
    "",
    "What Failed contains: Acceptance criteria that were not satisfied enough to pass.",
    "",
    "Observed Errors contains: Specific broken behavior or evidence supporting failed or partial items.",
    "",
    "Additional Operator Observations contains: Usability, design, workflow, or future-scope feedback that may or may not block this Work Card.",
    "",
    "Architect Disposition answers: What happens next after Architect review. It is pending until the Architect reviews this report.",
  ];
}

export function validationArchitectReviewInstructionLines(): string[] {
  return [
    "## Architect Review Instructions",
    "",
    "The Architect must analyze this report using this order:",
    "",
    "1. Confirm the validation target.",
    "2. Compare Validation Result, What Failed, Observed Errors, Additional Operator Observations, and all referenced evidence.",
    "3. If legacy Operator Decision exists, treat it as advisory context only, not final routing authority.",
    "4. Review referenced screenshots/files as primary evidence.",
    "5. Classify each issue as:",
    "   - blocking repair item;",
    "   - non-blocking pass-with-observation;",
    "   - carry-forward observation;",
    "   - future-scope/product backlog;",
    "   - no action required.",
    "6. Do not automatically create repair solely because a report contains the word Partial.",
    "7. Do not ignore observations solely because the report result is Pass.",
    "8. Produce a consistent Architect analysis with mergeability, repair decision, observation-register impact, and next action.",
  ];
}

export function architectDispositionLines(
  status: string = pendingArchitectDisposition,
): string[] {
  return [
    "## Architect Disposition",
    "",
    `Status: ${status}`,
    "",
    "Required Architect output:",
    "- Mergeable:",
    "- Repair required:",
    "- Observation Register update required:",
    "- Next action:",
    "- Rationale:",
  ];
}

export function implementerReportArchitectReviewInstructionLines(): string[] {
  return [
    "## Architect Review Instructions",
    "",
    "The Architect must not rely only on this report's claims.",
    "",
    "The Architect must:",
    "1. Confirm branch, repo, and changed files.",
    "2. Read the Work Card.",
    "3. Compare implementation claims against acceptance criteria.",
    "4. Inspect relevant changed source files or fixtures.",
    "5. Determine whether validation evidence is adequate.",
    "6. Identify skipped checks and decide whether each is acceptable.",
    "7. Decide whether the implementation is:",
    "   - ready for Operator validation;",
    "   - repair required before Operator validation;",
    "   - blocked / incomplete;",
    "   - outside scope.",
    "8. If ready for validation, provide manual Operator validation steps.",
    "9. If repair is required, identify exact repair scope.",
    "10. If observations arise, update or recommend updating the Observation Register.",
    "",
    "Required Architect Review output shape:",
    "",
    "```text",
    ...architectReviewOutputTemplateLines(),
    "```",
  ];
}

export function architectReviewOutputTemplateLines(): string[] {
  return [
    "## Architect Review Decision",
    "",
    "Decision:",
    "- Ready for Operator validation",
    "- Repair required before Operator validation",
    "- Blocked / incomplete",
    "- Out of scope",
    "",
    "## Work Card Compliance",
    "",
    "## Changed Files Reviewed",
    "",
    "## Acceptance Criteria Assessment",
    "",
    "## Validation Claims Assessment",
    "",
    "## Skipped Checks Assessment",
    "",
    "## Observation Register Impact",
    "",
    "## Operator Validation Steps",
    "",
    "## Required Repair, if any",
  ];
}
